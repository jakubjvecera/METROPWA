// history.js
import { loadJSON, saveJSON } from './storage.js';

const HISTORY_KEY = 'metro_codes_history_v1';
const USED_CODES_KEY = 'metro_used_codes_v1';

export function loadHistory() {
  return loadJSON(HISTORY_KEY, []);
}

export function saveHistory(arr) {
  saveJSON(HISTORY_KEY, arr);
}

export function loadUsedCodes() {
  return loadJSON(USED_CODES_KEY, []);
}

export function saveUsedCodes(arr) {
  saveJSON(USED_CODES_KEY, arr);
}

export function resetHistory() {
  saveHistory([]);
  saveUsedCodes([]);
}
