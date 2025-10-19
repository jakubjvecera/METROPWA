import { activate as flashlightOn, deactivate as flashlightOff, showBatteryReplaceButton, hideBatteryReplaceButton, batteryReplace} from './src/mechanics/flashlight.js';
import { loadJSON as load } from './storage.js';
import { startGeiger, stopGeiger } from './geiger.js';
import { renderRadioMessages } from './src/mechanics/radio.js';


const tools = [
  { id: 'radio', label: '📻', title: 'Vysílačka' },
  { id: 'flashlight', label: '🔦', title: 'Svítilna' },
  { id: 'gas-mask', label: '😷', title: 'Plynová maska' },
  { id: 'geiger', label: '☢️', title: 'Geiger' },
];

let activeTools = [];
const batteryReplaceBtn = document.getElementById('battery-replace');

function toggleTool(toolId, btn) {
  // Zabrání současné aktivaci vysílačky a svítilny
  if ((toolId === 'radio' && activeTools.includes('flashlight')) ||
      (toolId === 'flashlight' && activeTools.includes('radio'))) {
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
      console.log('Maska aktivována');
      break;
    case 'geiger':
      startGeiger();
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
      console.log('Maska deaktivována');
      break;
    case 'geiger':
      stopGeiger();
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

    const radioCloseBtn = document.getElementById('radio-close-btn');
    const radioToolBtn = document.getElementById('tool-radio');
    if (radioCloseBtn && radioToolBtn) {
      radioCloseBtn.addEventListener('click', () => {
        toggleTool('radio', radioToolBtn);
      });
    }
}
