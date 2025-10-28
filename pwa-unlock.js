// pwa-unlock.js
// Tento skript odemyká webová API, která vyžadují interakci uživatele (např. na iOS).
// Spouští se jednou při prvním kliknutí nebo dotyku na stránce.

let unlocked = false;
// Používáme `const` pro AudioContext, protože ho vytvoříme jen jednou.
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContextInstance;

/**
 * Odemkne Web Audio API.
 * Vytvoří AudioContext a přehraje tichý zvuk, aby ho aktivoval.
 */
function unlockAudio() {
    if (!AudioContext || !audioContextInstance) {
        // Vytvoříme instanci, pouze pokud neexistuje
        try {
            audioContextInstance = new AudioContext();
        } catch (e) {
            console.error("Web Audio API není podporováno nebo selhalo.", e);
            return;
        }
    }

    // Pokud je kontext ve stavu 'suspended', pokusíme se ho obnovit.
    if (audioContextInstance.state === 'suspended') {
        audioContextInstance.resume();
    }

    // Tichý buffer k odblokování iOS audio
    const buffer = audioContextInstance.createBuffer(1, 1, 22050);
    const source = audioContextInstance.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextInstance.destination);
    source.start(0);
}

/**
 * Globální funkce pro získání instance AudioContext.
 * Pokud instance neexistuje, vytvoří se.
 * @returns {AudioContext|null}
 */
window.getAudioContext = () => {
    // Pokud instance neexistuje, vytvoříme ji.
    if (!audioContextInstance && AudioContext) {
        audioContextInstance = new AudioContext();
    }
    return audioContextInstance; // Vrátíme existující nebo nově vytvořenou instanci.
};

/** Odemkne Vibration API. */
function unlockVibration() {
    if (navigator.vibrate) {
        navigator.vibrate(1); // Krátká vibrace pro odblokování API
    }
}

/** Spustí všechny odemykací funkce najednou. */
export function unlockPwaFeatures() {
    unlockAudio();
    if (unlocked) return; // Zbytek (vibrace, geolokace) jen poprvé
    unlocked = true;

    unlockVibration();
    console.log("PWA funkce odblokovány!");
}

// Přidáme listenery na první interakci uživatele s volbou `{ once: true }`
document.addEventListener('click', unlockPwaFeatures, { once: true });
document.addEventListener('touchstart', unlockPwaFeatures, { once: true });
