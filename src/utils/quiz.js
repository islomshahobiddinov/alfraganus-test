export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function buildTestQuestions(allQuestions, count) {
  const picked = shuffle(allQuestions).slice(0, count);
  return picked.map((q) => {
    const correctText = q.options[q.correctIndex];
    const newOptions = shuffle(q.options);
    const newCorrectIndex = newOptions.findIndex((t) => t === correctText);
    return {
      id: q.id,
      prompt: q.prompt,
      options: newOptions,
      correctIndex: newCorrectIndex,
    };
  });
}
