// codes.js
import { loadUsedCodes, saveUsedCodes, loadHistory, saveHistory } from './history.js';
import { addBattery, addFilter, addWater } from './resources.js';
import { setStatus, renderHistory, updateResourcesPanel } from './console.js';

let codesDB = {};

export async function loadCodesDB() {
  try {
    const resp = await fetch('codes-db.json', {cache:"reload"});
    if(!resp.ok) throw new Error();
    codesDB = await resp.json();
    setStatus('Databáze kódů načtena.');
  } catch(e){
    setStatus('Chyba při načítání databáze.');
  }
}

export function isValidCode(code) {
  return !!codesDB[code];
}

export function processCode(code) {
  const usedCodes = loadUsedCodes();
  const value = codesDB[code];
  const firstLetter = code.charAt(0);
  const secondLetter = code.charAt(1);

  if(firstLetter === 'U' && usedCodes.includes(code)){
    setStatus('Tento kód již byl použit.');
    return false;
  }

  switch(secondLetter){
    case 'B':
      addBattery(value);
      setStatus(`Přidány baterie: ${value}`);
      break;
    case 'F':
      addFilter(value);
      setStatus(`Přidány filtry: ${value}`);
      break;
    case 'W':
      addWater(value);
      setStatus(`Přidána voda: ${value}`);
      break;
    default:
      setStatus('Neznámý typ kódu.');
      return false;
  }

  // Přidat k historii
  let history = loadHistory();
  history.push({code, t: Date.now()});
  saveHistory(history);

  // Označit kód jako použitý, pokud začíná U
  if(firstLetter === 'U'){
    usedCodes.push(code);
    saveUsedCodes(usedCodes);
  }

  updateResourcesPanel();
  renderHistory();

  return true;
}
