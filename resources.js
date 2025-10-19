// resources.js
import { loadJSON, saveJSON } from './storage.js';

const STORAGE_KEY = 'metro_resources_v1';

let batteryCount = 0;
let filterCount = 0;
let waterCount = 0;

export function loadResources() {
  const r = loadJSON(STORAGE_KEY, { b: 0, f: 0, w: 0 });
  batteryCount = r.b;
  filterCount = r.f;
  waterCount = r.w;
}

export function saveResources() {
  saveJSON(STORAGE_KEY, { b: batteryCount, f: filterCount, w: waterCount });
}

export function addBattery(amount) {
  batteryCount += amount;
  saveResources();
}

export function addFilter(amount) {
  filterCount += amount;
  saveResources();
}

export function addWater(amount) {
  waterCount += amount;
  saveResources();
}

export function getResources() {
  return { batteryCount, filterCount, waterCount };
}

export function resetResources() {
  batteryCount = 0;
  filterCount = 0;
  waterCount = 0;
  saveResources();
}
