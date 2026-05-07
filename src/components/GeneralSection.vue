<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  subject: { type: Object, required: true },
  questions: { type: Array, required: true },
  testCount: { type: Number, required: true },
});

const emit = defineEmits(["startTest"]);

const search = ref("");
const submittedQuery = ref("");

const filteredQuestions = computed(() => {
  const query = submittedQuery.value.trim().toLowerCase();
  if (!query) return props.questions;

  return props.questions.filter((q) => q.prompt?.toLowerCase().includes(query));
});

function submitSearch() {
  submittedQuery.value = search.value;
}

function clearSearch() {
  search.value = "";
  submittedQuery.value = "";
}
</script>

<template>
  <section class="card">
    <div class="row row--between row--wrap">
      <div>
        <h2>{{ subject.name }}</h2>
        <p class="muted">
          <strong>Umumiy savollar</strong>: barcha savollar va javoblar
          ko‘rsatiladi, to‘g‘ri javob ajratib ko‘rsatiladi.
        </p>
      </div>
      <div class="row">
        <button type="button" class="btn" @click="emit('startTest')">
          Testni boshlash ({{ Math.min(testCount, questions.length) }})
        </button>
      </div>
    </div>

    <form class="search-form" @submit.prevent="submitSearch">
      <input
        v-model="search"
        type="search"
        class="input search-form__input"
        placeholder="Savol matni bo‘yicha qidiring..."
      />
      <button type="submit" class="btn btn--ghost">Qidirish</button>
      <button
        v-if="search || submittedQuery"
        type="button"
        class="btn btn--ghost"
        @click="clearSearch"
      >
        Tozalash
      </button>
    </form>

    <p v-if="submittedQuery" class="search-form__hint muted">
      "{{ submittedQuery }}" bo‘yicha {{ filteredQuestions.length }} ta savol topildi.
    </p>

    <div class="qaList">
      <article v-for="(q, idx) in filteredQuestions" :key="q.id" class="qa">
        <div class="qa__q">
          <span class="qa__n">{{ idx + 1 }}.</span>
          <span>{{ q.prompt }}</span>
        </div>
        <ul class="qa__opts">
          <li
            v-for="(opt, i) in q.options"
            :key="i"
            class="opt"
            :class="{ 'opt--correct': i === q.correctIndex }"
          >
            <span class="opt__badge">{{ String.fromCharCode(65 + i) }}</span>
            <span>{{ opt }}</span>
          </li>
        </ul>
      </article>
    </div>

    <p v-if="!filteredQuestions.length" class="empty-message">
      Bu so‘z bo‘yicha savol topilmadi.
    </p>
  </section>
</template>

