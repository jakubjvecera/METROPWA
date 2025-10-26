// geiger.js
import { setStatus } from './console.js';
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
  if (lastUpdateTime && currentZoneLevel) {
    const timeSpent = now - lastUpdateTime; // v milisekundách
    exposureTimes[currentZoneLevel] = (exposureTimes[currentZoneLevel] || 0) + timeSpent;
  }
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
  clearInterval(tickTimer);
  tickTimer = null;

  // Reset stylu indikátoru
  // if (geigerIndicator) {
  //   geigerIndicator.style.animationDuration = '';
  //   geigerIndicator.classList.remove('active');
  // }

  // Najde první zónu, jejíž minimální vzdálenost je menší než aktuální vzdálenost hráče
  const currentZone = ZONES.find(zone => distance > zone.minDistance);

  if (currentZone) {
    updateExposure(currentZone.level);
    setStatus(`Radiace: ${currentZone.level} | Vzdálenost: ${distance.toFixed(0)} m`);
    tickTimer = setInterval(() => handleTick(currentZone), currentZone.interval);
    handleTick(currentZone); // První pípnutí a záznam ihned
    // if (geigerIndicator) {
    //   geigerIndicator.style.animationDuration = `${currentZone.interval * 2}ms`;
    //   geigerIndicator.classList.add('active');
    // }
  } else {
    updateExposure(null); // Uživatel není v žádné zóně
    setStatus(`Radiace: V normě | Vzdálenost: ${distance.toFixed(0)} m`);
    if (geigerValueElement) {
      geigerValueElement.textContent = '0.00';
    }
    renderGeigerLog(); // Vykreslí prázdný log nebo poslední záznamy
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
}
/**
 * Spustí sledování polohy a pípání Geigerova počítače.
 */
export function startGeiger() {
  if (watchId) return; // Již běží
  setStatus('Vyhledávám GPS signál...');
  lastUpdateTime = Date.now();

  // Při každém zapnutí se pokusíme "probudit" audio kontext.
  // To řeší problém, kdy prohlížeč (hlavně na mobilech) audio po nečinnosti uspí.
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    playTick(); // Přehráním tichého (nebo prvního) pípnutí se kontext spolehlivě aktivuje.
  }

  // if (geigerIndicator) geigerIndicator.classList.add('active');

  if (appElement) {
    appElement.classList.add('geiger-active');
  }

  watchId = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
    enableHighAccuracy: true, // Zpřesní polohu
    maximumAge: 20000,        // Povolíme o něco starší pozici z cache (20s)
    timeout: 15000            // Prodloužíme časový limit pro získání pozice na 15s
  });
}

/**
 * Zastaví sledování polohy a pípání Geigerova počítače.
 */
export function stopGeiger() {
  if (!watchId) return; // Již je vypnutý

  // Započítat poslední časový úsek před vypnutím
  updateExposure(null);
  lastUpdateTime = null;

  navigator.geolocation.clearWatch(watchId);
  watchId = null;
  clearInterval(tickTimer);
  tickTimer = null;
  // if (geigerIndicator) geigerIndicator.classList.remove('active');
  setStatus('Geigerův počítač vypnut.');

  if (appElement) {
    appElement.classList.remove('geiger-active');
  }
  geigerLog = []; // Vyčistíme log při vypnutí
}

/**
 * Vrací objekt s celkovou dobou expozice v jednotlivých zónách (v milisekundách).
 */
export const getExposureTimes = () => loadJSON(EXPOSURE_KEY, exposureTimes);