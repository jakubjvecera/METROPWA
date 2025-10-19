import { loadCodesDB, isValidCode, processCode } from './codes.js';
import { renderHistory, setStatus, updateResourcesPanel } from './console.js';
import { loadResources, resetResources, addBattery } from './resources.js';
import { resetHistory } from './history.js';
import { initTools } from './tools.js';
import { initGeiger } from './geiger.js';
import { loadRadioDB, isRadioCode, processRadioCode } from './src/mechanics/radio.js';

const form = document.getElementById('code-form');
const input = document.getElementById('code-input');

// Kódy
form.addEventListener('submit', e => {
  e.preventDefault();
  const code = input.value.trim().toUpperCase();

  if (!code) {
    setStatus('Zadej kód!');
    return;
  }

  if (code === 'AZ4658') {
    // Reset všeho v localStorage včetně svítilny
    localStorage.clear();
    resetResources();
    resetHistory();
    renderHistory();
    updateResourcesPanel();
 
    setStatus('Lokální paměť byla vymazána.');
    input.value = '';
    return;
  }

  if (isRadioCode(code)) {
    if (processRadioCode(code)) {
      input.value = '';
    }
    return;
  }

  if (!isValidCode(code)) {
    setStatus('Neplatný kód.');
    input.value = '';
    return;
  }

  if (processCode(code)) {
    input.value = '';
  } else {
    input.value = '';
  }
  input.focus();
});

(async () => {
  await loadCodesDB();
  loadResources();
  await loadRadioDB();
  renderHistory();
  updateResourcesPanel();
  initTools();
  initGeiger(); // Pouze inicializuje audio pro Geiger, nespouští ho
  input.focus();
})();
