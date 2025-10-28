import { loadCodesDB, isValidCode, processCode } from './codes.js';
import { renderHistory, setStatus, updateResourcesPanel } from './console.js';
import { saveJSON } from './storage.js';
import { loadResources, resetResources, addBattery } from './resources.js';
import { resetHistory } from './history.js';
import { initTools, isToolActive, activateRadioPermanently } from './tools.js';
import { initGeiger, resetExposure, getExposureTimes } from './geiger.js';
import { loadRadioDB, isRadioCode, processRadioCode, addRadioSystemMessage } from './src/mechanics/radio.js';
import { unlockPwaFeatures } from './pwa-unlock.js';

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

  /*// Kód pro reset radiace
  if (code === 'DECON') {
    resetExposure();
    input.value = '';
    return;
  }*/

  // Kód pro získání speciálního obleku
 /* if (code === 'OB1234') {
    saveJSON('metro_suit_status', { active: true });
    setStatus('Získán speciální protiradiační oblek.');
    input.value = '';
    return;
  }

  // Kód pro výpis času expozice
  if (code === 'AZ0000') {
    const exposure = getExposureTimes();
    const highTime = (exposure['Vysoká'] / 1000).toFixed(0);
    const mediumTime = (exposure['Zvýšená'] / 1000).toFixed(0);
    setStatus(`Expozice: Vysoká: ${highTime}s, Zvýšená: ${mediumTime}s`);
    input.value = '';
    return;
  }
*/
  if (isRadioCode(code)) {
    if (processRadioCode(code)) {
      unlockPwaFeatures(); // Znovu aktivujeme audio kontext
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

// Naslouchání zpráv od Service Workeru
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    // Zkontrolujeme, zda zpráva má správný typ
    if (event.data && event.data.type === 'CACHE_COMPLETE') {
      addRadioSystemMessage('Systém', 'test');
    }
  });
}

(async () => {
  await loadCodesDB();
  loadResources();
  await loadRadioDB();
  renderHistory();
  updateResourcesPanel();
  initTools();
  activateRadioPermanently();
//  initGeiger(); // Pouze inicializuje audio pro Geiger, nespouští ho
  input.focus();
})();
