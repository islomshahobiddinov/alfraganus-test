<script setup>
import { formatTime } from "../utils/quiz";

defineProps({
  subjects: { type: Array, required: true },
  defaultTimeSeconds: { type: Number, required: true },
});

const emit = defineEmits(["select"]);
</script>

<template>
  <section class="card">
    <h2>Fan tanlang</h2>

    <div v-if="subjects.length === 0" class="empty-message">
      <p>Sizning guruingizga hozircha testlar tayinlanmagan.</p>
    </div>

    <div v-else class="grid">
      <button
        v-for="s in subjects"
        :key="s.id"
        type="button"
        class="subject"
        @click="emit('select', s.id)"
      >
        <div class="subject__name">{{ s.name }}</div>
        <div class="subject__meta">
          {{ s.questions?.length ?? 0 }} ta savol ·
          {{ formatTime(s.timeSeconds ?? defaultTimeSeconds) }}
        </div>
      </button>
    </div>
  </section>
</template>
