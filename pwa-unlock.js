// pwa-unlock.js
// Tento skript odemyká webová API, která vyžadují interakci uživatele (např. na iOS).
// Spouští se jednou při prvním kliknutí nebo dotyku na stránce.
(() => {
    let unlocked = false; // Zůstává privátní
    // Používáme `const` pro AudioContext, protože ho vytvoříme jen jednou.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContextInstance;

    /**
     * Odemkne Web Audio API.
     * Vytvoří AudioContext a přehraje tichý zvuk, aby ho aktivoval.
     */
    function unlockAudio() { // Zůstává privátní
        if (!AudioContext || audioContextInstance) return;

        try {
            audioContextInstance = new AudioContext();

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
        } catch (e) {
            console.error("Web Audio API není podporováno nebo selhalo.", e);
        }
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

    /** Vyžádá oprávnění pro Geolocation API. */
    function requestGeolocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                () => console.log("Oprávnění pro polohu uděleno."),
                () => console.log("Oprávnění pro polohu zamítnuto.")
            );
        }
    }

    /** Spustí všechny odemykací funkce najednou. */
    function unlockAll() {
        // Tuto kontrolu je bezpečnější mít hned na začátku.
        if (unlocked) return;
        unlocked = true;

        unlockAudio();
        unlockVibration();
        requestGeolocation();

        console.log("PWA funkce odblokovány!");
    }

    // Přidáme listenery na první interakci uživatele s volbou `{ once: true }`
    document.addEventListener('click', unlockAll, { once: true });
    document.addEventListener('touchstart', unlockAll, { once: true });
})();
