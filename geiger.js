// geiger.js
import { setStatus } from './console.js';
import { isToolActive } from './tools.js';
import { saveJSON, loadJSON } from './storage.js';

// --- Konfigurace ---
// Souřadnice epicentra radiace (např. fiktivní bod v Praze)
const EPICENTER = {
  latitude: 49.2246994,
  longitude: 15.6595850
};

// Zóny radiace: poloměr v metrech a interval pípání v milisekundách
// Logika je nyní obrácená: čím dál od epicentra, tím vyšší radiace.
const ZONES = [
  { minDistance: 350, interval: 800, level: "Vysoká", radiation: () => 10 + Math.random() * 5 },    // > 300m
  { minDistance: 100, interval: 2000, level: "Zvýšená", radiation: () => 1 + Math.random() * 2 },   // > 100m
].sort((a, b) => b.minDistance - a.minDistance); // Seřadíme od největší vzdálenosti

// --- Audio ---
let audioContext;
let tickBuffer;
let tickTimer = null;
let watchId = null; // ID pro sledování pozice, abychom ho mohli vypnout

const EXPOSURE_KEY = 'metro_exposure_times';
let exposureTimes = { "Vysoká": 0, "Zvýšená": 0 };
let lastUpdateTime = null;
let currentZoneLevel = null;
let isGeigerUiActive = false; // Nová proměnná pro sledování stavu UI
let activeZoneLevel = null; // Sleduje, pro jakou zónu je aktivní pípání

let geigerLogList = null; // Inicializujeme jako null
let geigerLog = []; // Log může zůstat jako prázdné pole
// const geigerIndicator = document.getElementById('geiger-indicator');
const appElement = document.getElementById('app');
const geigerValueElement = document.getElementById('geiger-value');
const geigerBlinkIndicator = document.querySelector('.geiger-blink-indicator');

// Načtení zvuku pípnutí
async function setupAudio() {
  try {
    audioContext = window.getAudioContext();
    if (!audioContext) {
      throw new Error("AudioContext se nepodařilo inicializovat.");
    }
    // Cesta k souboru se zvukem - musíš si nějaký přidat do projektu
    const response = await fetch('./assets/geiger-tick.wav');
    const arrayBuffer = await response.arrayBuffer();
    tickBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Chyba při inicializaci Web Audio API:', error);
    setStatus('Chyba: Zvuk Geigeru nelze přehrát.');
  }
}

function playTick() {
  if (!tickBuffer || !audioContext) return;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const source = audioContext.createBufferSource();
  source.buffer = tickBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

function renderGeigerLog() {
  if (!geigerLogList) return;
  geigerLogList.innerHTML = '';
  geigerLog.slice().reverse().forEach(entry => {
    const li = document.createElement('li');
    const time = new Date(entry.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    li.innerHTML = `[${time}] Úroveň radiace: <strong>${entry.value.toFixed(2)} µSv/h</strong> (${entry.level})`;
    geigerLogList.appendChild(li);
  });
}

function addGeigerLogEntry(value, level) {
  geigerLog.unshift({ value, level, t: Date.now() });
  if (geigerLog.length > 50) geigerLog.pop(); // Udržujeme max 50 záznamů
}

function updateExposure(newZoneLevel) {
  const now = Date.now();

  // Pokud máme předchozí časový záznam a byli jsme v nějaké zóně (currentZoneLevel není null),
  // vypočítáme čas strávený v této zóně.
  if (lastUpdateTime && currentZoneLevel) { // Pokud jsme byli v zóně
    // A POKUD NENÍ AKTIVNÍ PLYNOVÁ MASKA...
    if (!isToolActive('gas-mask')) {
      const timeSpent = now - lastUpdateTime; // v milisekundách
      exposureTimes[currentZoneLevel] = (exposureTimes[currentZoneLevel] || 0) + timeSpent;
    }
  }

  // Aktualizujeme stav pro další měření.
  lastUpdateTime = now;
  currentZoneLevel = newZoneLevel;
  saveJSON(EXPOSURE_KEY, exposureTimes);
  // Pro ladění - vypisuje celkovou dobu expozice v sekundách
  console.log('Expozice (s):', {
    "Vysoká": (exposureTimes["Vysoká"] / 1000).toFixed(1),
    "Zvýšená": (exposureTimes["Zvýšená"] / 1000).toFixed(1),
  });
}

function handleTick(zone) {
  playTick();
  const radiationValue = zone.radiation();
  addGeigerLogEntry(radiationValue, zone.level);

  if (geigerValueElement) {
    geigerValueElement.textContent = radiationValue.toFixed(2);
  }
  if (geigerBlinkIndicator) {
    geigerBlinkIndicator.style.transition = 'none';
    geigerBlinkIndicator.style.opacity = '1';
    setTimeout(() => {
      geigerBlinkIndicator.style.transition = 'opacity 0.5s ease';
      geigerBlinkIndicator.style.opacity = '0';
    }, 50);
  }
  renderGeigerLog();
}


function updateTicking(distance) {
  // Najde první zónu, jejíž minimální vzdálenost je menší než aktuální vzdálenost hráče
  const currentZone = ZONES.find(zone => distance > zone.minDistance);

  // Výpočet expozice běží vždy na pozadí
  updateExposure(currentZone ? currentZone.level : null);

  const newZoneLevel = currentZone ? currentZone.level : null;

  // UI a zvuky se aktualizují, pouze pokud je Geigerův počítač aktivní
  if (!isGeigerUiActive) return;

  // Pokud se zóna nezměnila, nic dalšího neděláme, aby se nepřerušovalo pípání.
  if (newZoneLevel === activeZoneLevel) return;

  // Zóna se změnila, takže resetujeme starý časovač.
  activeZoneLevel = newZoneLevel;
  clearInterval(tickTimer);
  tickTimer = null;

  if (activeZoneLevel) {
    setStatus(`Radiace: ${activeZoneLevel} | Vzdálenost: ${distance.toFixed(0)} m`);
    tickTimer = setInterval(() => handleTick(currentZone), currentZone.interval); // Použijeme `currentZone` z vnějšího scopu
    handleTick(currentZone); // První pípnutí a záznam ihned
  } else {
    setStatus(`Radiace: V normě | Vzdálenost: ${distance.toFixed(0)} m`);
    if (geigerValueElement) {
      geigerValueElement.textContent = '0.00';
    }
  }
}

// --- Geografická logika ---

/**
 * Vypočítá vzdálenost mezi dvěma GPS souřadnicemi pomocí Haversinova vzorce.
 * @returns {number} Vzdálenost v metrech.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Poloměr Země v metrech
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function onPositionUpdate(position) {
  const { latitude, longitude, accuracy } = position.coords;
  const distance = getDistance(latitude, longitude, EPICENTER.latitude, EPICENTER.longitude);
  console.log(`Vzdálenost: ${distance.toFixed(1)} m | Přesnost GPS: ±${accuracy.toFixed(1)} m`);
  updateTicking(distance);
}

function onPositionError(error) {
  console.error(`Chyba GPS: ${error.message}`);
  setStatus(`Chyba GPS: ${error.message}`);
}

/**
 * Inicializuje audio pro Geigerův počítač. Volá se při startu aplikace.
 */
export async function initGeiger() {
  if (!('geolocation' in navigator)) {
    setStatus('Chyba: Geolokace není podporována.');
    return;
  }

  geigerLogList = document.getElementById('geiger-log-list'); // Získáme prvek až zde
  exposureTimes = loadJSON(EXPOSURE_KEY, { "Vysoká": 0, "Zvýšená": 0 });
  await setupAudio();

  // Spustíme sledování polohy hned při inicializaci
  lastUpdateTime = Date.now();
  watchId = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
    enableHighAccuracy: true,
    maximumAge: 20000,
    timeout: 15000
  });
}
/**
 * Spustí sledování polohy a pípání Geigerova počítače.
 */
export function startGeiger() {
  if (isGeigerUiActive) return; // UI již běží
  isGeigerUiActive = true;
  setStatus('Vyhledávám GPS signál...');

  // Při každém zapnutí se pokusíme "probudit" audio kontext.
  // To řeší problém, kdy prohlížeč (hlavně na mobilech) audio po nečinnosti uspí.
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    playTick(); // Přehráním tichého (nebo prvního) pípnutí se kontext spolehlivě aktivuje.
  }

  if (appElement) {
    appElement.classList.add('geiger-active');
  }
}

/**
 * Zastaví sledování polohy a pípání Geigerova počítače.
 */
export function stopGeiger() {
  if (!isGeigerUiActive) return; // UI již je vypnuté
  isGeigerUiActive = false;

  clearInterval(tickTimer);
  tickTimer = null;
  setStatus('Geigerův počítač vypnut.');
  activeZoneLevel = null; // Resetujeme i aktivní zónu pro pípání

  if (appElement) {
    appElement.classList.remove('geiger-active');
  }
  geigerLog = []; // Vyčistíme log při vypnutí
}

/**
 * Resetuje zaznamenané časy expozice na nulu.
 */
export function resetExposure() {
  exposureTimes = { "Vysoká": 0, "Zvýšená": 0 };
  saveJSON(EXPOSURE_KEY, exposureTimes);
  setStatus('Radiační expozice vynulována.');
}

/**
 * Vrací objekt s celkovou dobou expozice v jednotlivých zónách (v milisekundách).
 */
export const getExposureTimes = () => loadJSON(EXPOSURE_KEY, exposureTimes);