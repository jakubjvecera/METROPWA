import { activate as flashlightOn, deactivate as flashlightOff, showBatteryReplaceButton, hideBatteryReplaceButton, batteryReplace} from './src/mechanics/flashlight.js';
import { activate as gasmaskOn, deactivate as gasmaskOff, showFilterReplaceButton, hideFilterReplaceButton, filterReplace } from './src/mechanics/gasmask.js';
import { loadJSON as load } from './storage.js';
import { startGeiger, stopGeiger } from './geiger.js';
import { renderRadioMessages } from './src/mechanics/radio.js';


const tools = [
  { id: 'gas-mask', label: '😷', title: 'Plynová maska' },
  { id: 'geiger', label: '☢️', title: 'Geiger' },
  { id: 'radio', label: '📻', title: 'Vysílačka' },
];

let activeTools = [];
const filterReplaceBtn = document.getElementById('filter-replace');
const batteryReplaceBtn = document.getElementById('battery-replace');
const appElement = document.getElementById('app');

/**
 * Zjistí, zda je nástroj s daným ID aktivní.
 * @param {string} toolId - ID nástroje ('gas-mask', 'radio', atd.)
 * @returns {boolean}
 */
export const isToolActive = (toolId) => activeTools.includes(toolId);

function toggleTool(toolId, btn) {
  // Zabrání současné aktivaci nástrojů, které mají vlastní overlay
  const overlayTools = ['radio', 'geiger'];
  if (overlayTools.includes(toolId) && activeTools.some(t => overlayTools.includes(t) && t !== toolId)) {
    return;
  }

  const isActive = activeTools.includes(toolId);

  if (isActive) {
    // Deaktivace
    activeTools = activeTools.filter(id => id !== toolId);
    btn.classList.remove('active');
    deactivateToolEffect(toolId);
  } else {
    // Aktivace
    activeTools.push(toolId);
    btn.classList.add('active');
    activateToolEffect(toolId, btn);
  }
}

function activateToolEffect(toolId, btn) {
  switch (toolId) {
    case 'flashlight':
      let timeLeft = load("flashlightTimeLeft", 40); 
      if(timeLeft>0){
        flashlightOn();
      }
      else{
      btn.classList.remove('active');
      showBatteryReplaceButton();
      }
      break;
    case 'radio':
      document.getElementById('radio-overlay').classList.add('active');
      renderRadioMessages();
      break;
    case 'gas-mask':
      let filterTimeLeft = load("gasmaskTimeLeft", 120);
      if (filterTimeLeft > 0) {
        gasmaskOn();
      } else {
        btn.classList.remove('active');
        activeTools = activeTools.filter(id => id !== 'gas-mask');
        showFilterReplaceButton();
      }
      break;
    case 'geiger':
      startGeiger();
      document.getElementById('geiger-overlay').classList.add('active');
      break;
  }
}

export function deactivateToolEffect(toolId) {
  switch (toolId) {
    case 'flashlight': 
      flashlightOff();
      // Přidáno: Najdi tlačítko a odznač ho
      const flashlightBtn = document.getElementById('tool-flashlight');
      if (flashlightBtn) flashlightBtn.classList.remove('active');
      activeTools = activeTools.filter(id => id !== 'flashlight');
      break;
    case 'radio':
      document.getElementById('radio-overlay').classList.remove('active');
      break;
    case 'gas-mask':
      gasmaskOff();
      const gasmaskBtn = document.getElementById('tool-gas-mask');
      if (gasmaskBtn) gasmaskBtn.classList.remove('active');
      activeTools = activeTools.filter(id => id !== 'gas-mask');
      break;
    case 'geiger':
      stopGeiger(); // Toto je klíčová oprava: zastaví logiku Geigeru
      document.getElementById('geiger-overlay').classList.remove('active');
      break;
  }
}

export function initTools() {
  const container = document.getElementById('tools-container');
  if (!container) return;




  tools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = 'tool-button';
    btn.id = `tool-${tool.id}`;
    btn.textContent = tool.label;
    btn.title = tool.title;
    btn.addEventListener('click', () => toggleTool(tool.id, btn));
    container.appendChild(btn);
  });
 //specialitky
    batteryReplaceBtn.addEventListener('click', () => {
      batteryReplace();
    });
    filterReplaceBtn.addEventListener('click', () => {
      filterReplace();
    });


    const radioCloseBtn = document.getElementById('radio-close-btn');
    const radioToolBtn = document.getElementById('tool-radio');
    if (radioCloseBtn && radioToolBtn) {
      radioCloseBtn.addEventListener('click', () => {
        toggleTool('radio', radioToolBtn);
      });
    }

    const geigerCloseBtn = document.getElementById('geiger-close-btn');
    const geigerToolBtn = document.getElementById('tool-geiger');
    if (geigerCloseBtn && geigerToolBtn) {
      geigerCloseBtn.addEventListener('click', () => {
        toggleTool('geiger', geigerToolBtn);
      });
    }
}
