// geiger.js
import { setStatus } from './console.js';
import { saveJSON, loadJSON } from './storage.js';

// --- Konfigurace ---
// Souřadnice epicentra radiace (např. fiktivní bod v Praze)
const EPICENTER = {
  latitude: 49.2972842,
  longitude: 16.542838
};

// Zóny radiace: poloměr v metrech a interval pípání v milisekundách
// Logika je nyní obrácená: čím dál od epicentra, tím vyšší radiace.
const ZONES = [
  { minDistance: 1000, interval: 300, level: "Extrémní" }, // > 1000m od epicentra
  { minDistance: 300, interval: 800, level: "Vysoká" },   // > 300m
  { minDistance: 100, interval: 2000, level: "Zvýšená" }, // > 100m (bezpečná zóna je 0-100m)
].sort((a, b) => b.minDistance - a.minDistance); // Seřadíme od největší vzdálenosti

// --- Audio ---
let audioContext;
let tickBuffer;
let tickTimer = null;
let watchId = null; // ID pro sledování pozice, abychom ho mohli vypnout

const EXPOSURE_KEY = 'metro_exposure_times';
let exposureTimes = { "Extrémní": 0, "Vysoká": 0, "Zvýšená": 0 };
let lastUpdateTime = null;
let currentZoneLevel = null;

const geigerIndicator = document.getElementById('geiger-indicator');

// Načtení zvuku pípnutí
async function setupAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    "Extrémní": (exposureTimes["Extrémní"] / 1000).toFixed(1),
    "Vysoká": (exposureTimes["Vysoká"] / 1000).toFixed(1),
    "Zvýšená": (exposureTimes["Zvýšená"] / 1000).toFixed(1),
  });
}

function updateTicking(distance) {
  clearInterval(tickTimer);
  tickTimer = null;

  // Reset stylu indikátoru
  if (geigerIndicator) {
    geigerIndicator.style.animationDuration = '';
    geigerIndicator.classList.remove('active');
  }

  // Najde první zónu, jejíž minimální vzdálenost je menší než aktuální vzdálenost hráče
  const currentZone = ZONES.find(zone => distance > zone.minDistance);

  if (currentZone) {
    updateExposure(currentZone.level);
    setStatus(`Radiace: ${currentZone.level}`);
    tickTimer = setInterval(playTick, currentZone.interval);
    if (geigerIndicator) {
      geigerIndicator.style.animationDuration = `${currentZone.interval * 2}ms`;
      geigerIndicator.classList.add('active');
    }
  } else {
    updateExposure(null); // Uživatel není v žádné zóně
    setStatus('Radiace: V normě');
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
  exposureTimes = loadJSON(EXPOSURE_KEY, { "Extrémní": 0, "Vysoká": 0, "Zvýšená": 0 });
  await setupAudio();
}
/**
 * Spustí sledování polohy a pípání Geigerova počítače.
 */
export function startGeiger() {
  if (watchId) return; // Již běží
  setStatus('Vyhledávám GPS signál...');
  lastUpdateTime = Date.now();

  // Aktivace audia při první interakci
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }

  if (geigerIndicator) geigerIndicator.classList.add('active');

  watchId = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
    enableHighAccuracy: true, // Zpřesní polohu
    maximumAge: 10000,        // Jak stará může být pozice z cache
    timeout: 5000             // Časový limit pro získání pozice
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
  if (geigerIndicator) geigerIndicator.classList.remove('active');
  setStatus('Geigerův počítač vypnut.');
}

/**
 * Vrací objekt s celkovou dobou expozice v jednotlivých zónách (v milisekundách).
 */
export const getExposureTimes = () => loadJSON(EXPOSURE_KEY, exposureTimes);