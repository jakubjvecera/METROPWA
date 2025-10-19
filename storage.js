// storage.js
export function loadJSON(key, def = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : def;
  } catch {
    return def;
  }
}

export function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
