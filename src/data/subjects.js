// Auto-load all subject JSON files from src/data/subjects/*.json
// Vite will bundle these at build time.

export async function loadSubjects() {
  const modules = import.meta.glob("./subjects/*.json");
  const loaded = await Promise.all(
    Object.values(modules).map((loader) => loader())
  );
  // Each module is { default: <json> }
  return loaded
    .map((m) => m.default)
    .filter(Boolean)
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}


