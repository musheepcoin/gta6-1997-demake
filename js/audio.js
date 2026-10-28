/* ============================================================================
   GRAND THEFT AUTO: LEONIDA '97 — PROCEDURAL WEBAUDIO ENGINE
   1997 Synth Radio Stations + Dynamic Engine RPM + Sirens + SFX
   ============================================================================ */

class RetroAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;

        // Radio stations
        this.stations = [
            {
                name: "FLASH FM LEONIDA 97.1",
                genre: "Vice Synthwave",
                bpm: 122,
                bassNotes: [110, 110, 146.83, 146.83, 130.81, 130.81, 98, 110],
                leadNotes: [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 523.25],
                wave: "sawtooth"
            },
            {
                name: "CALIENTE 98.3 MIAMI",
                genre: "Leonida Latin Bass",
                bpm: 112,
                bassNotes: [82.41, 0, 82.41, 98.0, 110.0, 0, 98.0, 82.41],
                leadNotes: [329.63, 392.0, 440.0, 392.0, 493.88, 440.0, 392.0, 329.63],
                wave: "square"
            },
            {
                name: "GELLHORN GARAGE 104.5",
                genre: "Dirty Industrial Rock",
                bpm: 136,
                bassNotes: [73.42, 73.42, 87.31, 73.42, 65.41, 65.41, 82.41, 73.42],
                leadNotes: [293.66, 0, 349.23, 293.66, 261.63, 0, 329.63, 293.66],
                wave: "sawtooth"
            },
            {
                name: "GRASSRIVERS BAYOU FM",
                genre: "Dark Swamp Synth",
                bpm: 94,
                bassNotes: [65.41, 65.41, 77.78, 77.78, 58.27, 58.27, 65.41, 49.0],
                leadNotes: [261.63, 311.13, 392.0, 311.13, 233.08, 293.66, 261.63, 196.0],
                wave: "triangle"
            },
            {
                name: "RADIO OFF (STREET AUDIO)",
                genre: "Off",
                bpm: 100,
                bassNotes: [],
                leadNotes: [],
                wave: "sine"
            }
        ];

        this.currentStationIdx = 0;
        this.inVehicle = false;
        this.stepIdx = 0;
        this.nextNoteTime = 0;

        // Continuous oscillators
        this.engineOsc = null;
        this.engineGain = null;
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenPhase = 0;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.initialized = true;

            // Engine continuous hum
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = "sawtooth";
            this.engineOsc.frequency.value = 48;
            this.engineGain.gain.value = 0.0;
            this.engineOsc.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();

            // Police Siren continuous oscillator
            this.sirenOsc = this.ctx.createOscillator();
            this.sirenGain = this.ctx.createGain();
            this.sirenOsc.type = "triangle";
            this.sirenOsc.frequency.value = 650;
            this.sirenGain.gain.value = 0.0;
            this.sirenOsc.connect(this.sirenGain);
            this.sirenGain.connect(this.ctx.destination);
            this.sirenOsc.start();

            this.nextNoteTime = this.ctx.currentTime + 0.05;
        } catch (e) {
            console.warn("WebAudio init blocked or unavailable:", e);
        }
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    cycleStation() {
        this.currentStationIdx = (this.currentStationIdx + 1) % this.stations.length;
        this.playBeep(880, 0.06, "square", 0.08);
        return this.stations[this.currentStationIdx];
    }

    getCurrentStation() {
        return this.stations[this.currentStationIdx];
    }

    update(dt, state) {
        if (!this.initialized || this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.inVehicle = Boolean(state.inVehicle);

        // 1. Update Vehicle Engine Sound
        if (this.inVehicle && state.vehicleSpeed !== undefined) {
            const speedRatio = Math.min(1, Math.abs(state.vehicleSpeed) / 420);
            // Simulate 4-speed gearbox RPM sawtooth
            const gearMod = (speedRatio * 3.2) % 1.0;
            const targetFreq = 44 + speedRatio * 95 + gearMod * 38;
            this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
            this.engineGain.gain.setTargetAtTime(0.035 + speedRatio * 0.03, now, 0.08);
        } else {
            this.engineGain.gain.setTargetAtTime(0.0, now, 0.08);
        }

        // 2. Update Police Siren Sound
        if (state.wantedLevel > 0 && state.nearestCopDist < 900) {
            this.sirenPhase += dt * 4.5;
            const prox = Math.max(0, 1 - state.nearestCopDist / 900);
            const wail = 620 + Math.sin(this.sirenPhase) * 240;
            this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
            this.sirenGain.gain.setTargetAtTime(prox * 0.045, now, 0.05);
        } else {
            this.sirenGain.gain.setTargetAtTime(0.0, now, 0.08);
        }

        // 3. Sequencer for In-Car Radio Station
        const st = this.stations[this.currentStationIdx];
        if (this.inVehicle && st && st.bassNotes.length > 0) {
            const stepDur = (60 / st.bpm) / 2; // eighth notes
            if (now >= this.nextNoteTime) {
                this.playRadioStep(st, this.stepIdx, stepDur);
                this.stepIdx = (this.stepIdx + 1) % st.bassNotes.length;
                this.nextNoteTime = now + stepDur;
            }
        } else {
            this.nextNoteTime = now + 0.1;
        }
    }

    playRadioStep(st, idx, dur) {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;

        // Bass note
        const bFreq = st.bassNotes[idx];
        if (bFreq > 0) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(bFreq, now);
            g.gain.setValueAtTime(0.032, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.85);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + dur * 0.9);
        }

        // Lead synth note
        const lFreq = st.leadNotes[idx];
        if (lFreq > 0 && idx % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = st.wave;
            osc.frequency.setValueAtTime(lFreq, now);
            g.gain.setValueAtTime(0.02, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.4);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + dur * 1.5);
        }
    }

    playBeep(freq = 520, duration = 0.08, type = "square", vol = 0.06) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playShot(weaponType = "PISTOL") {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        if (weaponType === "FLAMETHROWER") {
            this.playNoise(0.11, 600, 0.035);
            return;
        }
        if (weaponType === "ROCKET") {
            this.playNoise(0.28, 350, 0.09);
            this.playBeep(140, 0.25, "sawtooth", 0.08);
            return;
        }

        const dur = weaponType === "SHOTGUN" ? 0.16 : (weaponType === "UZI" ? 0.055 : 0.085);
        const startFreq = weaponType === "SHOTGUN" ? 180 : 320;
        this.playNoise(dur, 1200, 0.075);

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + dur);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + dur);
    }

    playExplosion() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.playNoise(0.55, 280, 0.16);

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.55);
        g.gain.setValueAtTime(0.18, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.56);
    }

    playTireScreech() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playNoise(0.07, 1900, 0.022);
    }

    playCashSound() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playBeep(987.77, 0.06, "square", 0.06);
        setTimeout(() => this.playBeep(1318.51, 0.12, "square", 0.06), 60);
    }

    playPayphoneRing() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playBeep(1100, 0.05, "square", 0.035);
        setTimeout(() => this.playBeep(1380, 0.05, "square", 0.035), 55);
    }

    playAnkleMonitorAlert() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playBeep(1560, 0.07, "sawtooth", 0.055);
        setTimeout(() => this.playBeep(1560, 0.07, "sawtooth", 0.055), 110);
    }

    playHorn() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playBeep(392.0, 0.22, "sawtooth", 0.075);
        this.playBeep(493.88, 0.22, "sawtooth", 0.065);
    }

    playBurpOrFart(isFart = false) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sawtooth";
        if (isFart) {
            osc.frequency.setValueAtTime(115, now);
            osc.frequency.linearRampToValueAtTime(58, now + 0.28);
        } else {
            osc.frequency.setValueAtTime(92, now);
            osc.frequency.linearRampToValueAtTime(135, now + 0.12);
            osc.frequency.linearRampToValueAtTime(70, now + 0.26);
        }
        g.gain.setValueAtTime(0.11, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.29);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playFanfare() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((n, idx) => {
            setTimeout(() => this.playBeep(n, 0.14, "square", 0.08), idx * 80);
        });
    }

    playCrateSmash() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playNoise(0.16, 850, 0.11);
        this.playBeep(160, 0.1, "triangle", 0.07);
    }

    playNoise(duration = 0.1, filterFreq = 1000, vol = 0.06) {
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = filterFreq;

        const g = this.ctx.createGain();
        const now = this.ctx.currentTime;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(g);
        g.connect(this.ctx.destination);
        noise.start(now);
    }
}

window.RetroAudioEngine = RetroAudioEngine;
