import { saveJSON, loadJSON } from '../../storage.js';
import { setStatus } from '../../console.js';

const USED_RADIO_CODES_KEY = 'metro_used_radio_codes';
const RADIO_MESSAGES_KEY = 'metro_radio_messages';
let radioMessages = [];
let radioMessagesHistory = [];
let audioPlayer = null;

/**
 * Načte databázi rádiových zpráv ze souboru JSON.
 */
export async function loadRadioDB() {
  try {
    const response = await fetch('./radio-messages.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    radioMessages = await response.json();
    console.log('Databáze rádiových zpráv načtena.');
    radioMessagesHistory = loadJSON(RADIO_MESSAGES_KEY, []);
  } catch (error) {
    console.error('Chyba při načítání radio-messages.json:', error);
    setStatus('Chyba: Nelze načíst data pro vysílačku.');
  }
}

/**
 * Zkontroluje, zda kód je platný rádiový kód (začíná na "CO").
 * @param {string} code
 * @returns {boolean}
 */
export function isRadioCode(code) {
  return code.startsWith('CO');
}

/**
 * Zpracuje zadaný rádiový kód.
 * @param {string} code
 * @returns {boolean} Vrací true, pokud byl kód úspěšně zpracován.
 */
export function processRadioCode(code) {
  const messageData = radioMessages.find(msg => msg.code === code);
  if (!messageData) {
    setStatus('Neznámý rádiový kód.');
    return false;
  }

  // const usedCodes = loadJSON(USED_RADIO_CODES_KEY, []);
  // if (usedCodes.includes(code)) {
  //   setStatus('Tento signál již byl zachycen.');
  //   return false;
  // }

  setStatus(`Signál ${code} zachycen. Čekám na zprávu...`);

  setTimeout(() => {
    deliverMessage(messageData);
  }, messageData.delay);

  // usedCodes.push(code);
  // saveJSON(USED_RADIO_CODES_KEY, usedCodes);

  return true;
}

/**
 * Doručí zprávu (přehraje zvuk nebo zobrazí text).
 * @param {object} messageData
 */
function deliverMessage(messageData) {
  let messageContent;

  // Zpracování textové části
  if (messageData.text) {
    messageContent = messageData.text;
    setStatus('Nová zpráva ve vysílačce!');
  }

  // Zpracování zvukové části
  if (messageData.audio) {
    // Pokud není žádný text, zobrazíme zástupný text
    if (!messageContent) {
      messageContent = `Příchozí zvukový přenos...`;
    }
    // Zastavíme jakýkoli aktuálně přehrávaný zvuk
    if (audioPlayer) {
      audioPlayer.pause();
    }
    audioPlayer = new Audio(messageData.audio);
    audioPlayer.play().catch(e => console.error("Chyba při přehrávání zvuku:", e));
  }

  const newEntry = {
    title: messageData.title,
    content: messageContent,
    t: Date.now(),
    audio: messageData.audio // Uložíme i cestu ke zvuku
  };
  radioMessagesHistory.push(newEntry);
  saveJSON(RADIO_MESSAGES_KEY, radioMessagesHistory);
  renderRadioMessages();
}

/**
 * Vykreslí zprávy do okna vysílačky.
 */
export function renderRadioMessages() {
  const listEl = document.getElementById('radio-messages-list');
  if (!listEl) return;

  listEl.innerHTML = '';
  radioMessagesHistory.slice().reverse().forEach(msg => {
    const li = document.createElement('li');
    li.style.cssText = 'padding: 5px 0; border-bottom: 1px solid rgba(0, 255, 102, 0.1); display: flex; flex-direction: column;';

    const time = new Date(msg.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const header = document.createElement('div');
    header.innerHTML = `<strong>${time} - ${msg.title}:</strong>`;

    // Pokud má zpráva zvuk, uděláme hlavičku klikatelnou
    if (msg.audio) {
      header.style.cursor = 'pointer';
      header.innerHTML = `<strong style="text-decoration: underline;">${time} - ${msg.title}:</strong>`;

      header.addEventListener('click', () => {
        if (audioPlayer) {
          audioPlayer.pause(); // Zastavíme předchozí přehrávání
        }
        audioPlayer = new Audio(msg.audio);
        audioPlayer.play().catch(e => console.error("Chyba při přehrávání zvuku:", e));
      });
    }

    const content = document.createElement('div');
    content.innerHTML = msg.content;

    li.appendChild(header);
    li.appendChild(content);
    listEl.appendChild(li);
  });
}