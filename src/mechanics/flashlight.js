import { saveJSON as save, loadJSON as load } from '../../storage.js';
import {setStatus, updateResourcesPanel } from '../../console.js';
import {addBattery} from '../../resources.js';
import {deactivateToolEffect} from '../../tools.js';

let timer = null;
let timeLeft = 40;
const LS_KEY = 'flashlightTimeLeft';
const batteryReplaceBtn = document.getElementById('battery-replace');

export function showBatteryReplaceButton() {
  if (batteryReplaceBtn) batteryReplaceBtn.style.display = 'block';
}
export function hideBatteryReplaceButton() {
  if (batteryReplaceBtn) batteryReplaceBtn.style.display = 'none';
}

// Upravená aktivace: pokud není explicitně požadován nový čas, použije čas z úložiště
export function activate(defaultDuration = 40, forceNewTime = false) {
  if (forceNewTime) {
    timeLeft = defaultDuration;
  } else {
    timeLeft = load(LS_KEY, defaultDuration);
    if (timeLeft <= 0) {
      deactivateToolEffect('flashlight');
    }
  }
  save(LS_KEY, timeLeft);
 if (timeLeft <= 10) {
      document.getElementById('flashlight-overlay').classList.add('active', 'dim');
    }else{
      document.getElementById('flashlight-overlay').classList.add('active');
      }
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    save(LS_KEY, timeLeft);
    if (timeLeft <= 10) {
      document.getElementById('flashlight-overlay').classList.add('dim');
    }
    if (timeLeft <= 0) {
      deactivateToolEffect('flashlight');
    }
  }, 1000);
}

export function deactivate() {
  clearInterval(timer);
  timer = null;
  document.getElementById('flashlight-overlay').classList.remove('active');
  document.getElementById('flashlight-overlay').classList.remove('dim');
  save(LS_KEY, timeLeft);
  // Pokud je čas na nule, zobrazíme tlačítko pro výměnu baterie
  if (timeLeft <= 0) {
       showBatteryReplaceButton();
  }
}

export function getTimeLeft() {
  return load(LS_KEY, 40);
}
export function addTime(timeToAdd) {
  let current = load(LS_KEY, 0);
  timeLeft = Math.max(0, current) + timeToAdd; // Zajistíme, aby se nepřičítalo k záporné hodnotě
  save(LS_KEY, timeLeft);
}

export function batteryReplace(){
  const batterySpan = document.getElementById('res-b');
      let count = parseInt(batterySpan.textContent, 10);
      if (count > 0) {
        addBattery(-1);
        updateResourcesPanel();
        hideBatteryReplaceButton();
        addTime(20);
       setStatus('Baterie vyměněna. Svítilna opět funguje.');
        }
        else{
          setStatus('Nemáš žádné baterie!');
        }        
      }