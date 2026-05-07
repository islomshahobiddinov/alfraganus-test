<script setup>
import { computed, onMounted, ref } from "vue";

const props = defineProps({
  testQuestions: { type: Array, required: true },
  answers: { type: Object, required: true },
  score: { type: Number, required: true },
});

const emit = defineEmits(["retry", "newRandom", "backToGeneral"]);

const resultSectionRef = ref(null);

const percentage = computed(() => {
  return Math.round((props.score / Math.max(1, props.testQuestions.length)) * 100);
});

const scoreClass = computed(() => {
  return percentage.value < 60 ? "score--low" : "score--high";
});

onMounted(() => {
  // Focus on the result section when it's displayed
  if (resultSectionRef.value) {
    resultSectionRef.value.focus();
    resultSectionRef.value.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
</script>

<template>
  <section ref="resultSectionRef" class="card" tabindex="-1">
    <div class="row row--between row--wrap">
      <div>
        <h2>Natija</h2>
        <div class="score-display">
          <p class="muted">
            Ball: <strong>{{ score }}/{{ testQuestions.length }}</strong>
          </p>
          <p class="score-percentage" :class="scoreClass">
            {{ percentage }}%
          </p>
        </div>
      </div>
      <div class="row">
        <button type="button" class="btn" @click="emit('retry')">
          Qayta ishlash
        </button>
        <button type="button" class="btn" @click="emit('newRandom')">
          Yangi tasodifiy test
        </button>
        <button type="button" class="btn btn--ghost" @click="emit('backToGeneral')">
          Umumiy savollarga qaytish
        </button>
      </div>
    </div>

    <div class="qaList">
      <article v-for="(q, idx) in testQuestions" :key="q.id" class="qa">
        <div class="qa__q">
          <span class="qa__n">{{ idx + 1 }}.</span>
          <span>{{ q.prompt }}</span>
        </div>
        <ul class="qa__opts">
          <li
            v-for="(opt, i) in q.options"
            :key="i"
            class="opt"
            :class="{
              'opt--correct': i === q.correctIndex,
              'opt--wrong': answers[q.id] === i && answers[q.id] !== q.correctIndex,
              'opt--picked': answers[q.id] === i,
            }"
          >
            <span class="opt__badge">{{ String.fromCharCode(65 + i) }}</span>
            <span>{{ opt }}</span>
            <span
              v-if="answers[q.id] === i || i === q.correctIndex"
              class="tag-group"
            >
              <span v-if="answers[q.id] === i" class="tag">Siz tanladingiz</span>
              <span v-if="i === q.correctIndex" class="tag tag--ok">To‘g‘ri</span>
            </span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
