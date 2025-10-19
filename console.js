// console.js
import { loadHistory, saveHistory } from './history.js';
import { getResources } from './resources.js';

const hist = document.getElementById('history');
const statusMsg = document.getElementById('status-msg');
const resB = document.getElementById('res-b');
const resF = document.getElementById('res-f');
const resW = document.getElementById('res-w');

export function renderHistory() {
  const list = loadHistory();
  hist.innerHTML = '';
  if(list.length === 0){
    const li = document.createElement('li');
    li.textContent = '(Žádné kódy)';
    li.style.color = '#9a9a9a';
    hist.appendChild(li);
    return;
  }
  list.slice().reverse().forEach(item=>{
    // Zpětná kompatibilita: pokud je to starý záznam kódu
    if (item.code) {
      const li = document.createElement('li');
      const time = new Date(item.t).toLocaleTimeString();
      li.textContent = `${item.code} — ${time}`;
      hist.appendChild(li);
    }
    // Nový formát pro zprávy (např. z vysílačky)
    else if (item.title && item.content) {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.title}</strong>: ${item.content}`;
      hist.appendChild(li);
    }
  });
}

export function addHistoryEntry(title, content) {
  const history = loadHistory();
  history.push({ title, content, t: Date.now() });
  saveHistory(history);
  renderHistory(); // Okamžitě překreslí historii s novou zprávou
}

export function setStatus(text) {
  statusMsg.textContent = text;
}

export function updateResourcesPanel() {
  const { batteryCount, filterCount, waterCount } = getResources();
  resB.textContent = batteryCount;
  resF.textContent = filterCount;
  resW.textContent = waterCount;
}
