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
        this.ytRadioPlaying = true;
        this.stepIdx = 0;
        this.nextNoteTime = 0;

        // Continuous oscillators & ambient environmental buses
        this.engineOsc = null;
        this.engineGain = null;
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenPhase = 0;

        // Spatial AI Traffic Pass-By Engine (with Doppler shift!)
        this.trafficOsc = null;
        this.trafficFilter = null;
        this.trafficGain = null;

        // Ocean Surf & City Ambience continuous filtered noise
        this.oceanFilter = null;
        this.oceanGain = null;
        this.cityHumOsc = null;
        this.cityHumGain = null;
        this.ambientTimer = 0;
        this.seagullCooldown = 6.0;
        this.cricketCooldown = 2.5;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.initialized = true;

            // Master SFX Boost Gain Node + Limiter Compressor (boosts all game sound effects ~4.5x cleanly!)
            this.sfxCompressor = this.ctx.createDynamicsCompressor();
            this.sfxCompressor.threshold.value = -8;
            this.sfxCompressor.knee.value = 10;
            this.sfxCompressor.ratio.value = 4;
            this.sfxCompressor.attack.value = 0.003;
            this.sfxCompressor.release.value = 0.15;
            this.sfxCompressor.connect(this.ctx.destination);

            this.sfxMasterGain = this.ctx.createGain();
            this.sfxMasterGain.gain.value = 4.5;
            this.sfxMasterGain.connect(this.sfxCompressor);

            // 1. Player Engine continuous hum
            this.engineOsc = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.engineOsc.type = "sawtooth";
            this.engineOsc.frequency.value = 48;
            this.engineGain.gain.value = 0.0;
            this.engineOsc.connect(this.engineGain);
            this.engineGain.connect(this.sfxMasterGain);
            this.engineOsc.start();

            // 2. Police Siren continuous oscillator
            this.sirenOsc = this.ctx.createOscillator();
            this.sirenGain = this.ctx.createGain();
            this.sirenOsc.type = "triangle";
            this.sirenOsc.frequency.value = 650;
            this.sirenGain.gain.value = 0.0;
            this.sirenOsc.connect(this.sirenGain);
            this.sirenGain.connect(this.sfxMasterGain);
            this.sirenOsc.start();

            // 3. Spatial AI Traffic Pass-By Engine Oscillator (filtered sawtooth with Doppler shift!)
            this.trafficOsc = this.ctx.createOscillator();
            this.trafficFilter = this.ctx.createBiquadFilter();
            this.trafficGain = this.ctx.createGain();
            this.trafficOsc.type = "sawtooth";
            this.trafficOsc.frequency.value = 58;
            this.trafficFilter.type = "lowpass";
            this.trafficFilter.frequency.value = 240;
            this.trafficGain.gain.value = 0.0;
            this.trafficOsc.connect(this.trafficFilter);
            this.trafficFilter.connect(this.trafficGain);
            this.trafficGain.connect(this.sfxMasterGain);
            this.trafficOsc.start();

            // 4. Looping Ocean Waves / Beach Surf Noise Buffer (3-second seamless pink/brown noise loop)
            const loopLen = Math.floor(this.ctx.sampleRate * 3.0);
            const loopBuf = this.ctx.createBuffer(1, loopLen, this.ctx.sampleRate);
            const ch = loopBuf.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < loopLen; i++) {
                const white = Math.random() * 2 - 1;
                lastOut = (lastOut + 0.04 * white) / 1.04;
                ch[i] = lastOut * 2.8;
            }
            const oceanSrc = this.ctx.createBufferSource();
            oceanSrc.buffer = loopBuf;
            oceanSrc.loop = true;
            this.oceanFilter = this.ctx.createBiquadFilter();
            this.oceanFilter.type = "bandpass";
            this.oceanFilter.frequency.value = 340;
            this.oceanFilter.Q.value = 0.7;
            this.oceanGain = this.ctx.createGain();
            this.oceanGain.gain.value = 0.0;
            oceanSrc.connect(this.oceanFilter);
            this.oceanFilter.connect(this.oceanGain);
            this.oceanGain.connect(this.sfxMasterGain);
            oceanSrc.start();

            // 5. Subtle Urban Street Ambience Hum
            this.cityHumOsc = this.ctx.createOscillator();
            this.cityHumGain = this.ctx.createGain();
            this.cityHumOsc.type = "triangle";
            this.cityHumOsc.frequency.value = 62;
            this.cityHumGain.gain.value = 0.0;
            this.cityHumOsc.connect(this.cityHumGain);
            this.cityHumGain.connect(this.sfxMasterGain);
            this.cityHumOsc.start();

            this.nextNoteTime = this.ctx.currentTime + 0.05;
        } catch (e) {
            console.warn("WebAudio init blocked or unavailable:", e);
        }
    }

    sfxOut() {
        return this.sfxMasterGain || (this.ctx ? this.ctx.destination : null);
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
            this.engineGain.gain.setTargetAtTime(0.075 + speedRatio * 0.065, now, 0.08);
        } else {
            this.engineGain.gain.setTargetAtTime(0.0, now, 0.08);
        }

        // 2. Update Police Siren Sound
        if (state.wantedLevel > 0 && state.nearestCopDist < 900) {
            this.sirenPhase += dt * 4.5;
            const prox = Math.max(0, 1 - state.nearestCopDist / 900);
            const wail = 620 + Math.sin(this.sirenPhase) * 240;
            this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
            this.sirenGain.gain.setTargetAtTime(prox * 0.095, now, 0.05);
        } else {
            this.sirenGain.gain.setTargetAtTime(0.0, now, 0.08);
        }

        // 3. Spatial AI Traffic Pass-By Engine (with Doppler shift & motorcycle vs V8 timbre!)
        if (this.trafficOsc && this.trafficGain) {
            const tDist = state.nearestTrafficDist !== undefined ? state.nearestTrafficDist : 9999;
            const tSpd = Math.abs(state.nearestTrafficSpeed || 0);
            if (tDist < 540 && tSpd > 8) {
                const prox = Math.pow(Math.max(0, 1 - tDist / 540), 1.45);
                const doppler = Math.max(0.78, Math.min(1.26, state.trafficDoppler || 1.0));
                const baseF = state.trafficIsMoto ? 92 : 48;
                const rpmF = (baseF + Math.min(1.0, tSpd / 320) * (state.trafficIsMoto ? 135 : 68)) * doppler;
                this.trafficOsc.frequency.setTargetAtTime(rpmF, now, 0.05);
                this.trafficFilter.frequency.setTargetAtTime(state.trafficIsMoto ? 480 : 260, now, 0.06);
                const volScale = this.inVehicle ? 0.028 : 0.052;
                this.trafficGain.gain.setTargetAtTime(prox * volScale, now, 0.06);
            } else {
                this.trafficGain.gain.setTargetAtTime(0.0, now, 0.10);
            }
        }

        // 4. Environmental Ambience: Ocean Waves Surf, Urban Hum, Daytime Seagulls & Night Crickets!
        this.ambientTimer += dt;
        const waterProx = Math.max(0, Math.min(1, state.waterProximity || 0));
        if (this.oceanGain && this.oceanFilter) {
            // Rolling 5.5-second Atlantic wave crest & wash cycle
            const waveLfo = 0.55 + 0.45 * Math.sin(this.ambientTimer * 1.14);
            const surfVol = waterProx * (this.inVehicle ? 0.022 : 0.046) * waveLfo;
            this.oceanFilter.frequency.setTargetAtTime(220 + waveLfo * 340, now, 0.12);
            this.oceanGain.gain.setTargetAtTime(surfVol, now, 0.15);
        }
        if (this.cityHumGain) {
            const urbanVol = (!this.inVehicle && waterProx < 0.7) ? 0.0075 : 0.0028;
            this.cityHumGain.gain.setTargetAtTime(urbanVol, now, 0.20);
        }

        // Occasional Vice Beach Seagulls (day/sunset near water) & Nighttime Tropical Crickets
        const nf = state.nightFactor || 0;
        if (!this.inVehicle && waterProx > 0.35 && nf < 0.55) {
            this.seagullCooldown -= dt;
            if (this.seagullCooldown <= 0) {
                this.seagullCooldown = 7.5 + Math.random() * 9.0;
                this.playSeagullCall(waterProx);
            }
        }
        if (!this.inVehicle && nf > 0.48) {
            this.cricketCooldown -= dt;
            if (this.cricketCooldown <= 0) {
                this.cricketCooldown = 2.4 + Math.random() * 3.8;
                this.playCricketChirp(nf);
            }
        }

        // 5. Sequencer for In-Car Radio Station (disabled when YouTube Radio Deck is playing!)
        const st = this.stations[this.currentStationIdx];
        if (!this.ytRadioPlaying && this.inVehicle && st && st.bassNotes.length > 0) {
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
        g.connect(this.sfxOut());
        osc.start(now);
        osc.stop(now + duration);
    }

    playShot(weaponType = "PISTOL") {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        if (weaponType === "FIST") {
            // Bare-handed melee punch air swing ("whoosh") — never a gunshot!
            this.playBandNoise(0.065, 420, 1.4, 0.032);
            this.playBeep(115, 0.045, "sine", 0.028);
            return;
        }
        if (weaponType === "FLAMETHROWER") {
            this.playNoise(0.11, 600, 0.045);
            return;
        }
        if (weaponType === "ELECTRO") {
            // GTA 2 ElectroGun: high-voltage crackle + buzzing zap
            this.playBandNoise(0.09, 3200, 2.2, 0.05);
            this.playBeep(1180, 0.07, "sawtooth", 0.035);
            this.playBeep(90, 0.09, "square", 0.03);
            return;
        }
        if (weaponType === "ROCKET") {
            this.playNoise(0.28, 350, 0.11);
            this.playBeep(140, 0.25, "sawtooth", 0.09);
            return;
        }

        const dur = weaponType === "SHOTGUN" ? 0.16 : (weaponType === "UZI" ? 0.055 : 0.085);
        const startFreq = weaponType === "SHOTGUN" ? 180 : 320;
        this.playNoise(dur, 1200, 0.09);

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + dur);
        g.gain.setValueAtTime(0.095, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(g);
        g.connect(this.sfxOut());
        osc.start(now);
        osc.stop(now + dur);
    }

    playPunchHit() {
        if (!this.initialized || this.muted || !this.ctx) return;
        // Meaty bare-knuckle punch impact thud (low body thump + mid slap)
        this.playBandNoise(0.075, 680, 1.6, 0.075);
        this.playBeep(92, 0.07, "triangle", 0.085);
    }

    playExplosion() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.playNoise(0.55, 280, 0.19);

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.55);
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(g);
        g.connect(this.sfxOut());
        osc.start(now);
        osc.stop(now + 0.56);
    }

    playTireScreech() {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playNoise(0.07, 1900, 0.032);
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
        this.playBeep(392.0, 0.22, "sawtooth", 0.085);
        this.playBeep(493.88, 0.22, "sawtooth", 0.075);
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
        g.gain.setValueAtTime(0.13, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.29);
        osc.connect(g);
        g.connect(this.sfxOut());
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

    // --- GTA 1 / GTA 2 SfxDefs.h Footsteps, Car Doors, Crashes, Ricochets & Ambient Calls ---
    playFootstep(surface = "PAVEMENT", isLeft = false) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const pitchJit = (isLeft ? 0.94 : 1.06) * (0.96 + Math.random() * 0.08);

        if (surface === "WATER") {
            this.playWaterSplash(0.75);
            return;
        }
        if (surface === "SAND") {
            // Soft granular Vice Beach sand crunch
            this.playBandNoise(0.068, 1650 * pitchJit, 1.4, 0.038);
            this.playBeep(95 * pitchJit, 0.035, "sine", 0.026);
            return;
        }
        if (surface === "GRASS") {
            // Soft park turf brush step
            this.playBandNoise(0.058, 1100 * pitchJit, 1.2, 0.032);
            this.playBeep(105 * pitchJit, 0.032, "triangle", 0.024);
            return;
        }
        // Default PAVEMENT / ROAD sneaker heel-sole tap (SfxLevel_FootStep1 / SfxLevel_FootStep2)
        this.playBandNoise(0.042, 1450 * pitchJit, 2.2, 0.036);
        this.playBeep(132 * pitchJit, 0.035, "triangle", 0.038);
    }

    playWaterSplash(scale = 1.0) {
        if (!this.initialized || this.muted || !this.ctx) return;
        this.playBandNoise(0.15, 780, 0.9, 0.068 * scale);
        this.playBeep(210, 0.075, "sine", 0.038 * scale);
    }

    playCarEnter(isMotorcycle = false) {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (!isMotorcycle) {
            // SfxLevel_CarDoorOpen (metallic latch click) + SfxLevel_CarDoorClose (heavy door thud)
            this.playBeep(680, 0.025, "square", 0.048);
            this.playBandNoise(0.045, 950, 1.8, 0.058);
            setTimeout(() => {
                this.playBeep(88, 0.09, "triangle", 0.105);
                this.playNoise(0.065, 420, 0.082);
            }, 140);
        }
        // SfxLevel_CarEngineStart (ignition starter crank + rev)
        setTimeout(() => {
            if (!this.ctx || this.muted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = "sawtooth";
            const f0 = isMotorcycle ? 82 : 52;
            const fPeak = isMotorcycle ? 195 : 118;
            osc.frequency.setValueAtTime(f0, now);
            osc.frequency.linearRampToValueAtTime(fPeak, now + 0.14);
            osc.frequency.exponentialRampToValueAtTime(f0 * 1.15, now + 0.28);
            g.gain.setValueAtTime(0.092, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
            osc.connect(g);
            g.connect(this.sfxOut());
            osc.start(now);
            osc.stop(now + 0.31);
        }, isMotorcycle ? 40 : 230);
    }

    playCarExit(isMotorcycle = false) {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (isMotorcycle) {
            this.playBeep(140, 0.045, "triangle", 0.045);
            return;
        }
        // SfxLevel_CarDoorOpen + SfxLevel_CarDoorClose
        this.playBeep(590, 0.022, "square", 0.042);
        setTimeout(() => {
            this.playBeep(82, 0.085, "triangle", 0.096);
            this.playNoise(0.06, 380, 0.072);
        }, 110);
    }

    playCarCrash(intensity = 1.0) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastCrashTime && now - this._lastCrashTime < 0.16) return;
        this._lastCrashTime = now;
        const k = Math.max(0.35, Math.min(1.5, intensity));
        // SfxLevel_CarCrash1..4: heavy sheet-metal crunch + glass/panel rattle
        this.playNoise(0.18 * k, 720, 0.12 * k);
        this.playBeep(95 + Math.random() * 35, 0.12, "sawtooth", 0.105 * k);
    }

    playRicochet() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastRicoTime && now - this._lastRicoTime < 0.09) return;
        this._lastRicoTime = now;
        // SfxLevel_BulletRicochet: metallic high-pitched "zing!"
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        const startF = 1850 + Math.random() * 650;
        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.075);
        g.gain.setValueAtTime(0.055, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(g);
        g.connect(this.sfxOut());
        osc.start(now);
        osc.stop(now + 0.085);
    }

    playPedScream() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastScreamTime && now - this._lastScreamTime < 0.75) return;
        this._lastScreamTime = now;
        // SfxLevel_ScaredScream1..3: retro pitched vocal shriek
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sawtooth";
        const base = 620 + Math.random() * 240;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.linearRampToValueAtTime(base * 1.28, now + 0.09);
        osc.frequency.exponentialRampToValueAtTime(base * 0.72, now + 0.26);
        g.gain.setValueAtTime(0.056, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.27);
        osc.connect(g);
        g.connect(this.sfxOut());
        osc.start(now);
        osc.stop(now + 0.28);
    }

    playSeagullCall(prox = 0.7) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sine";
        const f = 1480 + Math.random() * 260;
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 1.18, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(f * 0.68, now + 0.34);
        g.gain.setValueAtTime(0.028 * prox, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.35);
        osc.connect(g);
        g.connect(this.sfxOut());
        osc.start(now);
        osc.stop(now + 0.36);
    }

    playCricketChirp(nf = 0.8) {
        if (!this.initialized || this.muted || !this.ctx) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playBeep(4150 + (i % 2) * 180, 0.022, "sine", 0.015 * nf);
            }, i * 38);
        }
    }

    playBandNoise(duration = 0.06, centerFreq = 1200, q = 1.5, vol = 0.03) {
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
        filter.type = "bandpass";
        filter.frequency.value = centerFreq;
        filter.Q.value = q;
        const g = this.ctx.createGain();
        const now = this.ctx.currentTime;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.0008, now + duration);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.sfxOut());
        noise.start(now);
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
        g.connect(this.sfxOut());
        noise.start(now);
    }
}

window.RetroAudioEngine = RetroAudioEngine;
