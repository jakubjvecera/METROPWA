import { saveJSON as save, loadJSON as load } from '../../storage.js';
import { setStatus, updateResourcesPanel } from '../../console.js';
import { addFilter } from '../../resources.js';
import { deactivateToolEffect } from '../../tools.js';

let timer = null;
let timeLeft = 120; // Filtry vydrží déle
const LS_KEY = 'gasmaskTimeLeft';
const filterReplaceBtn = document.getElementById('filter-replace');
const gasMaskOverlay = document.getElementById('gas-mask-overlay');

export function showFilterReplaceButton() {
  if (filterReplaceBtn) filterReplaceBtn.style.display = 'block';
}
export function hideFilterReplaceButton() {
  if (filterReplaceBtn) filterReplaceBtn.style.display = 'none';
}

export function activate() {
  timeLeft = load(LS_KEY, 120);
  if (timeLeft <= 0) {
    deactivateToolEffect('gas-mask');
    return;
  }
  save(LS_KEY, timeLeft);

  if (gasMaskOverlay) gasMaskOverlay.classList.add('active');

  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    save(LS_KEY, timeLeft);
    if (timeLeft <= 0) {
      deactivateToolEffect('gas-mask');
    }
  }, 1000);
}

export function deactivate() {
  clearInterval(timer);
  timer = null;
  if (gasMaskOverlay) gasMaskOverlay.classList.remove('active');
  save(LS_KEY, timeLeft);

  if (timeLeft <= 0) {
    showFilterReplaceButton();
  }
}

export function filterReplace() {
  const filterSpan = document.getElementById('res-f');
  let count = parseInt(filterSpan.textContent, 10);
  if (count > 0) {
    addFilter(-1);
    updateResourcesPanel();
    hideFilterReplaceButton();
    timeLeft = load(LS_KEY, 0) + 120; // Přidá 2 minuty
    save(LS_KEY, timeLeft);
    setStatus('Filtr vyměněn. Můžeš opět volně dýchat.');
  } else {
    setStatus('Nemáš žádné filtry!');
  }
}