<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import config from "./data/config.json";
import { loadSubjects } from "./data/subjects";
import { buildTestQuestions } from "./utils/quiz";
import { encryptData, decryptData } from "./utils/encryption";

import Login from "./components/Login.vue";
import SubjectPicker from "./components/SubjectPicker.vue";
import GeneralSection from "./components/GeneralSection.vue";
import TestSection from "./components/TestSection.vue";
import ResultSection from "./components/ResultSection.vue";

// Import stylesheets
import "./styles/layout.css";
import "./styles/common.css";
import "./styles/components.css";

// Authentication
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const SESSION_KEY = "test_session";

const isAuthenticated = ref(false);
const currentGroup = ref(null);
let sessionCheckInterval = null;

async function checkSession() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  if (!sessionData) {
    isAuthenticated.value = false;
    currentGroup.value = null;
    return false;
  }

  try {
    let sessionObj;

    // Try to decrypt first (new encrypted format)
    try {
      sessionObj = await decryptData(sessionData);
    } catch (decryptError) {
      // If decryption fails, try parsing as JSON (old unencrypted format)
      try {
        sessionObj = JSON.parse(sessionData);
        // If old format works, encrypt it for future use
        if (sessionObj.loginTime && sessionObj.group) {
          const encryptedData = await encryptData(sessionObj);
          localStorage.setItem(SESSION_KEY, encryptedData);
        }
      } catch (parseError) {
        // Both decryption and parsing failed
        throw new Error("Invalid session data");
      }
    }

    const { loginTime, group } = sessionObj;
    const now = Date.now();
    const elapsed = now - loginTime;

    if (elapsed >= SESSION_DURATION) {
      // Session expired
      localStorage.removeItem(SESSION_KEY);
      isAuthenticated.value = false;
      currentGroup.value = null;
      return false;
    }

    isAuthenticated.value = true;
    currentGroup.value = group;
    return true;
  } catch (e) {
    // If all attempts fail, clear the session
    localStorage.removeItem(SESSION_KEY);
    isAuthenticated.value = false;
    currentGroup.value = null;
    return false;
  }
}

async function handleLogin(group) {
  const loginTime = Date.now();
  try {
    // Encrypt the group data before storing
    const encryptedData = await encryptData({ loginTime, group });
    localStorage.setItem(SESSION_KEY, encryptedData);
    isAuthenticated.value = true;
    currentGroup.value = group;

    // Start checking session validity every minute
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
    }
    sessionCheckInterval = setInterval(async () => {
      if (!(await checkSession())) {
        clearInterval(sessionCheckInterval);
      }
    }, 60000); // Check every minute
  } catch (error) {
    console.error("Failed to encrypt and store session data:", error);
    // Fallback: still allow login but without encryption (for backward compatibility)
    localStorage.setItem(SESSION_KEY, JSON.stringify({ loginTime, group }));
    isAuthenticated.value = true;
    currentGroup.value = group;
  }
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  isAuthenticated.value = false;
  currentGroup.value = null;
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  // Reset app state
  stage.value = "pick";
  selectedSubjectId.value = "";
  resetTestState();
}

const stage = ref("pick"); // pick | general | test | result
const subjects = ref([]);
const selectedSubjectId = ref("");

// Filter subjects based on current group's assigned subjects
const availableSubjects = computed(() => {
  if (!currentGroup.value || !currentGroup.value.assignedSubjects) {
    return [];
  }
  const assignedIds = currentGroup.value.assignedSubjects;
  return subjects.value.filter((s) => assignedIds.includes(s.id));
});

const selectedSubject = computed(
  () =>
    availableSubjects.value.find((s) => s.id === selectedSubjectId.value) ??
    null,
);
const generalQuestions = computed(() => selectedSubject.value?.questions ?? []);

const testQuestionCount = computed(() => config.testQuestionCount ?? 20);
const defaultTimeSeconds = computed(() => config.defaultTimeSeconds ?? 600);
const testTimeSeconds = computed(
  () => selectedSubject.value?.timeSeconds ?? defaultTimeSeconds.value,
);

// Test state
const testQuestions = ref([]);
const currentIdx = ref(0);
const answers = ref({});
const remainingSeconds = ref(0);
let timerId = null;

const currentQuestion = computed(
  () => testQuestions.value[currentIdx.value] ?? null,
);
const answeredCount = computed(() => Object.keys(answers.value).length);
const score = computed(() => {
  let s = 0;
  for (const q of testQuestions.value) {
    const picked = answers.value[q.id];
    if (picked === q.correctIndex) s++;
  }
  return s;
});

async function init() {
  subjects.value = await loadSubjects();
}

function resetTestState() {
  testQuestions.value = [];
  clearTestProgress();
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function clearTestProgress() {
  currentIdx.value = 0;
  answers.value = {};
  remainingSeconds.value = 0;
  stopTimer();
}

function selectSubject(id) {
  selectedSubjectId.value = id;
}

function changeSubject() {
  stage.value = "pick";
  selectedSubjectId.value = "";
  resetTestState();
}

function goGeneral() {
  resetTestState();
  stage.value = "general";
}

function startTest() {
  resetTestState();

  const qs = generalQuestions.value;
  const count = Math.min(testQuestionCount.value, qs.length);
  testQuestions.value = buildTestQuestions(qs, count);
  currentIdx.value = 0;
  remainingSeconds.value = testTimeSeconds.value;
  stage.value = "test";

  timerId = setInterval(() => {
    remainingSeconds.value -= 1;
    if (remainingSeconds.value <= 0) submitTest();
  }, 1000);
}

function pickAnswer(optionIdx) {
  const q = currentQuestion.value;
  if (!q) return;
  if (Object.prototype.hasOwnProperty.call(answers.value, q.id)) return;
  answers.value = { ...answers.value, [q.id]: optionIdx };
}

function jumpToQuestion(idx) {
  const max = testQuestions.value.length - 1;
  if (max < 0) return;
  currentIdx.value = Math.min(Math.max(0, idx), max);
}

function nextQuestion() {
  currentIdx.value = Math.min(
    currentIdx.value + 1,
    testQuestions.value.length - 1,
  );
}

function prevQuestion() {
  currentIdx.value = Math.max(currentIdx.value - 1, 0);
}

function submitTest() {
  stopTimer();
  remainingSeconds.value = 0;
  stage.value = "result";
}

function retry() {
  if (!testQuestions.value.length) {
    startTest();
    return;
  }

  clearTestProgress();
  remainingSeconds.value = testTimeSeconds.value;
  stage.value = "test";

  timerId = setInterval(() => {
    remainingSeconds.value -= 1;
    if (remainingSeconds.value <= 0) submitTest();
  }, 1000);
}

watch(selectedSubjectId, () => {
  stage.value = selectedSubjectId.value ? "general" : "pick";
  resetTestState();
});

onMounted(async () => {
  if (await checkSession()) {
    init();
    // Start checking session validity every minute
    sessionCheckInterval = setInterval(async () => {
      if (!(await checkSession())) {
        clearInterval(sessionCheckInterval);
      }
    }, 60000); // Check every minute
  }
});

watch(isAuthenticated, (authenticated) => {
  if (authenticated && subjects.value.length === 0) {
    init();
    // Start checking session validity every minute
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
    }
    sessionCheckInterval = setInterval(async () => {
      if (!(await checkSession())) {
        clearInterval(sessionCheckInterval);
      }
    }, 60000);
  }
});

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId);
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
});
</script>

<template>
  <div v-if="!isAuthenticated" class="page">
    <Login @login="handleLogin" />
  </div>

  <div v-else class="page">
    <header class="topbar">
      <div class="brand">
        <div class="brand__title">Test tizimi</div>
        <div v-if="currentGroup" class="brand__subtitle">
          {{ currentGroup.name }}
        </div>
      </div>
      <div class="topbar__actions">
        <button type="button" class="btn btn--ghost" @click="changeSubject">
          Fan almashtirish
        </button>
        <button type="button" class="btn btn--ghost" @click="handleLogout">
          Chiqish
        </button>
      </div>
    </header>

    <main class="container">
      <SubjectPicker
        v-if="stage === 'pick'"
        :subjects="availableSubjects"
        :defaultTimeSeconds="defaultTimeSeconds"
        @select="selectSubject"
      />

      <GeneralSection
        v-else-if="stage === 'general' && selectedSubject"
        :subject="selectedSubject"
        :questions="generalQuestions"
        :testCount="testQuestionCount"
        @startTest="startTest"
      />

      <TestSection
        v-else-if="stage === 'test' && selectedSubject"
        :subject="selectedSubject"
        :testQuestions="testQuestions"
        :currentIdx="currentIdx"
        :currentQuestion="currentQuestion"
        :answers="answers"
        :answeredCount="answeredCount"
        :remainingSeconds="remainingSeconds"
        :testTimeSeconds="testTimeSeconds"
        @pickAnswer="pickAnswer"
        @prev="prevQuestion"
        @next="nextQuestion"
        @jump="jumpToQuestion"
        @submit="submitTest"
      />

      <ResultSection
        v-else-if="stage === 'result'"
        :testQuestions="testQuestions"
        :answers="answers"
        :score="score"
        @retry="retry"
        @newRandom="startTest"
        @backToGeneral="goGeneral"
      />
    </main>
  </div>
</template>
