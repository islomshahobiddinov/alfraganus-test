<script setup>
import { computed, ref, watch } from "vue";
import { formatTime, shuffle } from "../utils/quiz";

const props = defineProps({
  subject: { type: Object, required: true },
  testQuestions: { type: Array, required: true },
  currentIdx: { type: Number, required: true },
  currentQuestion: { type: Object, default: null },
  answers: { type: Object, required: true },
  answeredCount: { type: Number, required: true },
  remainingSeconds: { type: Number, required: true },
  testTimeSeconds: { type: Number, required: true },
});

const emit = defineEmits(["pickAnswer", "prev", "next", "submit", "jump"]);

// Shuffled options and mapping for current question
const shuffledOptions = ref([]);
const indexMapping = ref([]); // Maps shuffled index to original index

// Shuffle options when question changes
watch(
  () => props.currentQuestion,
  (question) => {
    if (question && question.options) {
      const originalIndices = question.options.map((_, i) => i);
      const shuffledIndices = shuffle([...originalIndices]);

      shuffledOptions.value = shuffledIndices.map((i) => question.options[i]);
      indexMapping.value = shuffledIndices;
    }
  },
  { immediate: true },
);

// Get the original index from shuffled index
function getOriginalIndex(shuffledIndex) {
  return indexMapping.value[shuffledIndex] ?? shuffledIndex;
}

function hasAnswer(questionId) {
  return Object.prototype.hasOwnProperty.call(props.answers, questionId);
}

// Check if an option is picked (using original index)
function isPicked(shuffledIndex) {
  if (!props.currentQuestion) return false;
  const originalIndex = getOriginalIndex(shuffledIndex);
  return props.answers[props.currentQuestion.id] === originalIndex;
}

const isAnswered = computed(() => {
  if (!props.currentQuestion) return false;
  return hasAnswer(props.currentQuestion.id);
});

const isCurrentCorrect = computed(() => {
  if (!props.currentQuestion) return false;
  if (!isAnswered.value) return false;
  return (
    props.answers[props.currentQuestion.id] ===
    props.currentQuestion.correctIndex
  );
});

function isCorrectOption(shuffledIndex) {
  if (!props.currentQuestion) return false;
  const originalIndex = getOriginalIndex(shuffledIndex);
  return originalIndex === props.currentQuestion.correctIndex;
}

function isWrongPicked(shuffledIndex) {
  if (!props.currentQuestion) return false;
  if (!isAnswered.value) return false;
  const originalIndex = getOriginalIndex(shuffledIndex);
  const picked = props.answers[props.currentQuestion.id];
  return (
    originalIndex === picked && picked !== props.currentQuestion.correctIndex
  );
}

function pagerBtnClass(q, idx) {
  const answered = hasAnswer(q.id);
  const isCorrect = answered && props.answers[q.id] === q.correctIndex;
  return {
    "pager__btn--current": idx === props.currentIdx,
    "pager__btn--correct": isCorrect,
    "pager__btn--wrong": answered && !isCorrect,
    "pager__btn--todo": !answered,
  };
}
</script>

<template>
  <section class="card">
    <div class="row row--between row--wrap">
      <div>
        <h2>{{ subject.name }}</h2>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat__label">Qolgan vaqt</div>
          <div class="stat__value" :class="{ danger: remainingSeconds <= 15 }">
            {{ formatTime(remainingSeconds) }}
          </div>
        </div>
        <div class="stat">
          <div class="stat__label">Jarayon</div>
          <div class="stat__value">
            {{ currentIdx + 1 }}/{{ testQuestions.length }} · javob berildi:
            {{ answeredCount }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentQuestion" class="question">
      <div class="question__title">
        <span class="question__text"
          >{{ currentIdx + 1 }}) {{ currentQuestion.prompt }}</span
        >
        <!-- <span v-if="isAnswered" class="pill" :class="isCurrentCorrect ? 'pill--ok' : 'pill--bad'">
          {{ isCurrentCorrect ? "To‘g‘ri" : "Noto‘g‘ri" }}
        </span> -->
      </div>

      <div class="options">
        <button
          v-for="(opt, i) in shuffledOptions"
          :key="i"
          type="button"
          class="choice"
          :class="{
            'choice--picked': !isAnswered && isPicked(i),
            'choice--correct': isAnswered && isCorrectOption(i),
            'choice--wrong': isAnswered && isWrongPicked(i),
          }"
          :disabled="isAnswered"
          @click="emit('pickAnswer', getOriginalIndex(i))"
        >
          <span class="choice__badge">{{ String.fromCharCode(65 + i) }}</span>
          <span class="choice__text">{{ opt }}</span>
          <span
            v-if="isPicked(i) || (isAnswered && isCorrectOption(i))"
            class="tag-group"
          >
            <!-- <span v-if="isPicked(i)" class="tag">Siz tanladingiz</span>
            <span v-if="isAnswered && isCorrectOption(i)" class="tag tag--ok"
              >To‘g‘ri</span
            > -->
          </span>
        </button>
      </div>

      <div class="row row--between row--wrap mt">
        <div class="row">
          <button
            type="button"
            class="btn btn--ghost"
            :disabled="currentIdx === 0"
            @click="emit('prev')"
          >
            Oldingi
          </button>
          <button
            type="button"
            class="btn btn--ghost"
            :disabled="currentIdx === testQuestions.length - 1"
            @click="emit('next')"
          >
            Keyingi
          </button>
        </div>
        <div class="row">
          <button type="button" class="btn btn--danger" @click="emit('submit')">
            Yakunlash va natijani ko‘rish
          </button>
        </div>
      </div>

      <nav class="pager" aria-label="Savollar bo‘yicha sahifalash">
        <button
          v-for="(q, idx) in testQuestions"
          :key="q.id"
          type="button"
          class="pager__btn"
          :class="pagerBtnClass(q, idx)"
          :aria-current="idx === currentIdx ? 'page' : undefined"
          @click="emit('jump', idx)"
        >
          {{ idx + 1 }}
        </button>
      </nav>
    </div>
  </section>
</template>
