export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function load(key, defaultValue) {
  const val = localStorage.getItem(key);
  if (val === null) return defaultValue;
  try {
    return JSON.parse(val);
  } catch {
    return defaultValue;
  }
}
