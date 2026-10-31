/* ============================================================================
   VICE CITY 26 — MULTI-LAYER SAMPLE-BASED VEHICLE & WORLD WEBAUDIO ENGINE
   Real Multi-Layer Engine Banks (V8, Supercar, Sedan, Compact, Superbike,
   Harley Chopper, Heavy Diesel Truck, Panzer Tank) + 5-Speed Gearbox Shifts,
   Turbo BOV, Exhaust Backfires, Real Horns, Sirens, Skids, Doors & Crashes
   ============================================================================ */

const VEHICLE_AUDIO_MANIFEST = {
    // 5-Layer OGG Engine Banks (Idle / Low / Mid / High / Limiter)
    v8_idle: "assets/sfx/vehicles/v8_idle.ogg",
    v8_low: "assets/sfx/vehicles/v8_low.ogg",
    v8_mid: "assets/sfx/vehicles/v8_mid.ogg",
    v8_high: "assets/sfx/vehicles/v8_high.ogg",
    v8_limiter: "assets/sfx/vehicles/v8_limiter.ogg",

    super_idle: "assets/sfx/vehicles/super_idle.ogg",
    super_low: "assets/sfx/vehicles/super_low.ogg",
    super_mid: "assets/sfx/vehicles/super_mid.ogg",
    super_high: "assets/sfx/vehicles/super_high.ogg",
    super_limiter: "assets/sfx/vehicles/super_limiter.ogg",

    sedan_idle: "assets/sfx/vehicles/sedan_idle.ogg",
    sedan_low: "assets/sfx/vehicles/sedan_low.ogg",
    sedan_mid: "assets/sfx/vehicles/sedan_mid.ogg",
    sedan_high: "assets/sfx/vehicles/sedan_high.ogg",
    sedan_limiter: "assets/sfx/vehicles/sedan_limiter.ogg",

    compact_idle: "assets/sfx/vehicles/compact_idle.ogg",
    compact_low: "assets/sfx/vehicles/compact_low.ogg",
    compact_mid: "assets/sfx/vehicles/compact_mid.ogg",
    compact_high: "assets/sfx/vehicles/compact_high.ogg",

    moto_idle: "assets/sfx/vehicles/moto_idle.ogg",
    moto_low: "assets/sfx/vehicles/moto_low.ogg",
    moto_mid: "assets/sfx/vehicles/moto_mid.ogg",
    moto_high: "assets/sfx/vehicles/moto_high.ogg",
    moto_limiter: "assets/sfx/vehicles/moto_limiter.ogg",

    // Chopper, Heavy Diesel Truck & Tank Loops
    harley_idle: "assets/sfx/vehicles/harley_idle.wav",
    harley_rev: "assets/sfx/vehicles/harley_rev.wav",
    harley_start: "assets/sfx/vehicles/harley_start.wav",

    truck_idle: "assets/sfx/vehicles/truck_idle.wav",
    truck_rev: "assets/sfx/vehicles/truck_rev.wav",
    truck_start: "assets/sfx/vehicles/truck_start.wav",

    tank_idle: "assets/sfx/vehicles/tank_idle.wav",
    tank_rev: "assets/sfx/vehicles/tank_rev.wav",
    tank_start: "assets/sfx/vehicles/tank_start.wav",
    tank_tracks: "assets/sfx/vehicles/tank_tracks.wav",

    // Starters & Doors
    start_v8: "assets/sfx/vehicles/start_v8.wav",
    start_super: "assets/sfx/vehicles/start_super.wav",
    start_sedan: "assets/sfx/vehicles/start_sedan.wav",
    car_door: "assets/sfx/vehicles/car_door.wav",
    truck_door: "assets/sfx/vehicles/truck_door.wav",

    // Transmission, Turbo & Exhaust Backfires
    gear_shift_up: "assets/sfx/vehicles/gear_shift_up.wav",
    gear_shift_down: "assets/sfx/vehicles/gear_shift_down.wav",
    turbo_bov: "assets/sfx/vehicles/turbo_bov.wav",
    turbo_whistle: "assets/sfx/vehicles/turbo_whistle.wav",
    supercharger_whine: "assets/sfx/vehicles/supercharger_whine.wav",
    backfire_1: "assets/sfx/vehicles/backfire_1.wav",
    backfire_2: "assets/sfx/vehicles/backfire_2.wav",
    backfire_3: "assets/sfx/vehicles/backfire_3.wav",

    // Tires, Air Brakes & Reverse Warning
    tire_skid_loop: "assets/sfx/vehicles/tire_skid_loop.wav",
    tire_squeal: "assets/sfx/vehicles/tire_squeal.wav",
    air_brake: "assets/sfx/vehicles/air_brake.wav",
    reverse_beep: "assets/sfx/vehicles/reverse_beep.wav",

    // Horns
    horn_car: "assets/sfx/vehicles/horn_car.wav",
    horn_sport: "assets/sfx/vehicles/horn_sport.wav",
    horn_truck: "assets/sfx/vehicles/horn_truck.wav",
    horn_airhorn: "assets/sfx/vehicles/horn_airhorn.wav",
    horn_dixie: "assets/sfx/vehicles/horn_dixie.wav",

    // Emergency Sirens
    siren_police: "assets/sfx/vehicles/siren_police.wav",
    siren_medic: "assets/sfx/vehicles/siren_medic.wav",
    siren_firetruck: "assets/sfx/vehicles/siren_firetruck.wav",

    // Crash Impacts
    crash_heavy: "assets/sfx/vehicles/crash_heavy.wav",
    crash_metal: "assets/sfx/vehicles/crash_metal.wav",

    // Weapons (Modern High-Definition + Authentic GTA Layers)
    shot_pistol_1: "assets/sfx/world/shot_pistol_1.ogg",
    shot_pistol_2: "assets/sfx/world/shot_pistol_2.wav",
    gta_shot_pistol: "assets/sfx/world/gta_shot_pistol.wav",
    pistol_reload: "assets/sfx/world/pistol_reload.ogg",

    shot_uzi_1: "assets/sfx/world/shot_uzi_1.ogg",
    shot_uzi_2: "assets/sfx/world/shot_uzi_2.ogg",
    shot_uzi_3: "assets/sfx/world/shot_uzi_3.ogg",
    gta_shot_uzi: "assets/sfx/world/gta_shot_uzi.wav",
    heavy_mg_shot: "assets/sfx/world/heavy_mg_shot.wav",

    shot_shotgun_1: "assets/sfx/world/shot_shotgun_1.ogg",
    shot_shotgun_2: "assets/sfx/world/shot_shotgun_2.wav",
    shotgun_reload: "assets/sfx/world/shotgun_reload.ogg",

    gta_shot_rocket: "assets/sfx/world/gta_shot_rocket.wav",
    cannon_blast: "assets/sfx/world/cannon_blast.wav",

    gta_shot_flamethrower: "assets/sfx/world/gta_shot_flamethrower.wav",
    flame_burst: "assets/sfx/world/flame_burst.ogg",

    electro_zap: "assets/sfx/world/electro_zap.ogg",
    gta_scream_electro: "assets/sfx/world/gta_scream_electro.wav",

    melee_swing: "assets/sfx/world/melee_swing.ogg",
    gta_punch: "assets/sfx/world/gta_punch.wav",
    melee_hit_1: "assets/sfx/world/melee_hit_1.ogg",
    melee_hit_2: "assets/sfx/world/melee_hit_2.ogg",

    // Explosions, Bullet Ricochets & Shell Casings
    explosion_modern: "assets/sfx/world/explosion_modern.ogg",
    gta_explosion: "assets/sfx/world/gta_explosion.wav",
    gta_huge_explosion: "assets/sfx/world/gta_huge_explosion.wav",
    ricochet_1: "assets/sfx/world/ricochet_1.ogg",
    ricochet_2: "assets/sfx/world/ricochet_2.ogg",
    ricochet_3: "assets/sfx/world/ricochet_3.ogg",
    gta_ricochet: "assets/sfx/world/gta_ricochet.wav",
    casing_bounce_1: "assets/sfx/world/casing_bounce_1.ogg",
    casing_bounce_2: "assets/sfx/world/casing_bounce_2.ogg",

    // Pedestrian Screams, Pain & Roadkill Splat
    gta_scream_scared_1: "assets/sfx/world/gta_scream_scared_1.wav",
    gta_scream_scared_2: "assets/sfx/world/gta_scream_scared_2.wav",
    gta_scream_scared_3: "assets/sfx/world/gta_scream_scared_3.wav",
    gta_scream_die_1: "assets/sfx/world/gta_scream_die_1.wav",
    gta_scream_die_2: "assets/sfx/world/gta_scream_die_2.wav",
    gta_scream_die_3: "assets/sfx/world/gta_scream_die_3.wav",
    pain_1: "assets/sfx/world/pain_1.ogg",
    pain_2: "assets/sfx/world/pain_2.ogg",
    pain_3: "assets/sfx/world/pain_3.ogg",
    die_1: "assets/sfx/world/die_1.ogg",
    die_2: "assets/sfx/world/die_2.ogg",
    gta_squashed: "assets/sfx/world/gta_squashed.wav",
    splat: "assets/sfx/world/splat.wav",

    // Footsteps & Water Splash
    gta_step_1: "assets/sfx/world/gta_step_1.wav",
    gta_step_2: "assets/sfx/world/gta_step_2.wav",
    step_soft: "assets/sfx/world/step_soft.ogg",
    step_grass: "assets/sfx/world/step_grass.ogg",
    gta_water_splash: "assets/sfx/world/gta_water_splash.wav",
    water_splash_1: "assets/sfx/world/water_splash_1.ogg",
    water_splash_2: "assets/sfx/world/water_splash_2.ogg",

    // World Objects, Pickups, Doors, Payphone, Pager & Comedy
    gta_car_door_open: "assets/sfx/world/gta_car_door_open.wav",
    gta_car_door_close: "assets/sfx/world/gta_car_door_close.wav",
    gta_carjack: "assets/sfx/world/gta_carjack.wav",
    gta_pickup: "assets/sfx/world/gta_pickup.wav",
    pickup_weapon: "assets/sfx/world/pickup_weapon.ogg",
    pickup_armor: "assets/sfx/world/pickup_armor.ogg",
    pickup_health: "assets/sfx/world/pickup_health.ogg",
    gta_crate_break: "assets/sfx/world/gta_crate_break.wav",
    gta_phone_ring: "assets/sfx/world/gta_phone_ring.wav",
    gta_pager: "assets/sfx/world/gta_pager.wav",
    ankle_alarm: "assets/sfx/world/ankle_alarm.ogg",
    gta_burp: "assets/sfx/world/gta_burp.wav",
    gta_fart: "assets/sfx/world/gta_fart.wav",

    // Authentic GTA Vocal Announcer Clips
    gta_vocal_grand_theft_auto: "assets/sfx/world/gta_vocal_grand_theft_auto.wav",
    gta_vocal_mission_complete: "assets/sfx/world/gta_vocal_mission_complete.wav",
    gta_vocal_mission_failed: "assets/sfx/world/gta_vocal_mission_failed.wav",
    gta_vocal_kill_frenzy: "assets/sfx/world/gta_vocal_kill_frenzy.wav",
    gta_vocal_excellent: "assets/sfx/world/gta_vocal_excellent.wav",
    gta_vocal_player_dies: "assets/sfx/world/gta_vocal_player_dies.wav",

    // Nature Ambience
    bird_call: "assets/sfx/world/bird_call.ogg",
    night_crickets: "assets/sfx/world/night_crickets.ogg"
};

const ENGINE_BANK_SPECS = {
    SUPER: [
        { key: "super_idle", center: 0.0, width: 0.34, baseRate: 0.96, rateSpan: 0.24, gain: 0.14 },
        { key: "super_low", center: 0.30, width: 0.38, baseRate: 0.84, rateSpan: 0.44, gain: 0.16 },
        { key: "super_mid", center: 0.64, width: 0.38, baseRate: 0.82, rateSpan: 0.48, gain: 0.17 },
        { key: "super_high", center: 0.96, width: 0.38, baseRate: 0.80, rateSpan: 0.50, gain: 0.19 }
    ],
    V8: [
        { key: "v8_idle", center: 0.0, width: 0.35, baseRate: 0.95, rateSpan: 0.22, gain: 0.16 },
        { key: "v8_low", center: 0.30, width: 0.38, baseRate: 0.84, rateSpan: 0.42, gain: 0.18 },
        { key: "v8_mid", center: 0.64, width: 0.38, baseRate: 0.82, rateSpan: 0.44, gain: 0.18 },
        { key: "v8_high", center: 0.96, width: 0.38, baseRate: 0.80, rateSpan: 0.46, gain: 0.20 }
    ],
    SEDAN: [
        { key: "sedan_idle", center: 0.0, width: 0.36, baseRate: 0.96, rateSpan: 0.22, gain: 0.15 },
        { key: "sedan_low", center: 0.32, width: 0.38, baseRate: 0.84, rateSpan: 0.40, gain: 0.17 },
        { key: "sedan_mid", center: 0.65, width: 0.38, baseRate: 0.82, rateSpan: 0.42, gain: 0.17 },
        { key: "sedan_high", center: 0.96, width: 0.38, baseRate: 0.80, rateSpan: 0.42, gain: 0.185 }
    ],
    COMPACT: [
        { key: "compact_idle", center: 0.0, width: 0.36, baseRate: 0.96, rateSpan: 0.24, gain: 0.15 },
        { key: "compact_low", center: 0.32, width: 0.38, baseRate: 0.84, rateSpan: 0.42, gain: 0.17 },
        { key: "compact_mid", center: 0.65, width: 0.38, baseRate: 0.82, rateSpan: 0.44, gain: 0.17 },
        { key: "compact_high", center: 0.96, width: 0.38, baseRate: 0.80, rateSpan: 0.46, gain: 0.185 }
    ],
    MOTO: [
        { key: "moto_idle", center: 0.0, width: 0.34, baseRate: 0.96, rateSpan: 0.26, gain: 0.14 },
        { key: "moto_low", center: 0.30, width: 0.38, baseRate: 0.84, rateSpan: 0.46, gain: 0.16 },
        { key: "moto_mid", center: 0.64, width: 0.38, baseRate: 0.82, rateSpan: 0.48, gain: 0.17 },
        { key: "moto_high", center: 0.96, width: 0.38, baseRate: 0.80, rateSpan: 0.52, gain: 0.19 }
    ],
    HARLEY: [
        { key: "harley_idle", center: 0.0, width: 0.52, baseRate: 0.94, rateSpan: 0.30, gain: 0.18 },
        { key: "harley_rev", center: 0.72, width: 0.70, baseRate: 0.78, rateSpan: 0.52, gain: 0.20 }
    ],
    TRUCK: [
        { key: "truck_idle", center: 0.0, width: 0.52, baseRate: 0.94, rateSpan: 0.26, gain: 0.17 },
        { key: "truck_rev", center: 0.72, width: 0.70, baseRate: 0.78, rateSpan: 0.46, gain: 0.19 }
    ],
    TANK: [
        { key: "tank_idle", center: 0.0, width: 0.50, baseRate: 0.92, rateSpan: 0.24, gain: 0.18 },
        { key: "tank_rev", center: 0.68, width: 0.68, baseRate: 0.78, rateSpan: 0.44, gain: 0.20 },
        { key: "tank_tracks", center: 0.56, width: 0.75, baseRate: 0.75, rateSpan: 0.55, gain: 0.16 }
    ]
};

class RetroAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;

        // Radio Station Metadata (YouTube Soundtrack Only)
        this.stations = [
            { name: "FLASH FM LEONIDA 97.1", genre: "Vice Outrun Synthwave", bpm: 124 },
            { name: "CALIENTE 98.3 MIAMI", genre: "Leonida Latin Electro-Bass", bpm: 118 },
            { name: "OCEAN DRIVE BOOGIE 101.9", genre: "Sunset Coast Italo-Disco", bpm: 120 },
            { name: "GELLHORN GARAGE 104.5", genre: "90s GTA 1 Big Beat & Synth-Rock", bpm: 132 }
        ];

        this.currentStationIdx = 0;
        this.inVehicle = false;
        this.ytRadioPlaying = true;
        this.musicEnabled = false;
        this.musicVolume = 0;
        this._unlockedBuffer = false;

        // Preloaded Raw ArrayBuffers & Decoded WebAudio Buffers
        this._rawArrayBuffers = {};
        this.buffers = {};
        this._decodingKeys = new Set();

        // Multi-Layer Player Vehicle Engine State
        this._activeEngineClass = null;
        this._engineLayers = [];
        this.engineMasterFilter = null;
        this.engineMasterGain = null;
        this._currentGear = 1;
        this._smoothedRpm = 0.0;
        this._shiftDipTimer = 0.0;
        this._shiftCooldown = 0.0;
        this._bovCooldown = 0.0;
        this._airBrakeCooldown = 0.0;
        this._reverseBeepTimer = 0.0;
        this._prevThrottle = 0;
        this._prevAbsSpeed = 0;

        // Looping Tire Skid Node (active while drifting)
        this._skidLoopNode = null;
        this._skidLoopGain = null;

        // Looping Emergency Siren Node (Police / Ambulance / Fire Truck)
        this._activeSirenKey = null;
        this._sirenNode = null;
        this.sirenGain = null;
        this.sirenPhase = 0;

        // Spatial AI Traffic Pass-By Sample Loop (with Doppler shift!)
        this._trafficCarNode = null;
        this._trafficMotoNode = null;
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

        // Start fetching all vehicle audio files in the background right away
        this._preloadRawAudioFiles();
    }

    _preloadRawAudioFiles() {
        if (typeof window === "undefined" || typeof fetch !== "function") return;
        for (const [key, url] of Object.entries(VEHICLE_AUDIO_MANIFEST)) {
            fetch(`${url}?v=99_8`)
                .then((res) => (res.ok ? res.arrayBuffer() : null))
                .then((buf) => {
                    if (!buf) return;
                    this._rawArrayBuffers[key] = buf;
                    if (this.ctx) {
                        this._decodeKey(key);
                    }
                })
                .catch(() => {});
        }
    }

    _decodeKey(key) {
        if (!this.ctx || this.buffers[key] || this._decodingKeys.has(key)) return;
        const raw = this._rawArrayBuffers[key];
        if (!raw) return;
        this._decodingKeys.add(key);
        const copy = raw.slice(0);
        this.ctx.decodeAudioData(
            copy,
            (audioBuf) => {
                this.buffers[key] = audioBuf;
                this._decodingKeys.delete(key);
                // If traffic loop buffers just finished decoding, wire them up
                if ((key === "sedan_low" || key === "moto_low") && this.initialized) {
                    this._ensureTrafficSampleLoops();
                }
            },
            () => {
                this._decodingKeys.delete(key);
            }
        );
    }

    _decodeAllAvailable() {
        if (!this.ctx) return;
        for (const key of Object.keys(this._rawArrayBuffers)) {
            this._decodeKey(key);
        }
    }

    getVehicleAudioClass(specKey) {
        switch (specKey) {
            case "BANSHEE_GT":
            case "PENETRATOR_GT":
            case "PORKA_TURBO":
            case "STINGER_CABRIO":
            case "TURISMO_CABRIO":
            case "VICE_CHEETAH":
            case "SILVER_ROADSTER":
            case "COSSIE_RS":
                return "SUPER";

            case "CHALLENGER_RT":
            case "MINT_STALLION":
            case "TULIP_MUSCLE":
            case "MONSTER_BUGGY":
            case "GATOR_4X4":
            case "VCPD_CRUISER":
                return "V8";

            case "SUPERBIKE":
                return "MOTO";

            case "HARLEY_BIKE":
                return "HARLEY";

            case "PANZER_TANK":
                return "TANK";

            case "BOXVILLE_VAN":
            case "CITY_BUS":
            case "TOUR_COACH":
            case "FLATBED_TRUCK":
            case "TANKER_RIG":
            case "SWAT_ENFORCER":
            case "BRINKS_TRUCK":
            case "FIRE_TRUCK":
            case "MEDIC_AMBULANCE":
                return "TRUCK";

            case "BEETLE_BUG":
            case "MICRO_KART":
            case "PICKUP_TRUCK":
            case "CAMPER_PICKUP":
            case "HOTDOG_VAN":
                return "COMPACT";

            default:
                return "SEDAN";
        }
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.initialized = true;

            // Master SFX Boost Gain Node + Limiter Compressor
            this.sfxCompressor = this.ctx.createDynamicsCompressor();
            this.sfxCompressor.threshold.value = -8;
            this.sfxCompressor.knee.value = 10;
            this.sfxCompressor.ratio.value = 4;
            this.sfxCompressor.attack.value = 0.003;
            this.sfxCompressor.release.value = 0.15;
            this.sfxCompressor.connect(this.ctx.destination);

            this.sfxMasterGain = this.ctx.createGain();
            this.sfxMasterGain.gain.value = 4.2;
            this.sfxMasterGain.connect(this.sfxCompressor);

            this.musicMasterGain = this.ctx.createGain();
            this.musicMasterGain.gain.value = 1.45;
            this.musicMasterGain.connect(this.sfxCompressor);

            // Decode any preloaded vehicle audio buffers immediately
            this._decodeAllAvailable();

            // Auto-recover AudioContext if mobile OS interrupts or suspends it
            this.ctx.onstatechange = () => {
                if (this.ctx && this.ctx.state !== "running" && !document.hidden && !this.muted) {
                    this.ctx.resume().catch(() => {});
                }
            };
            const onVisOrFocus = () => {
                if (!document.hidden && this.ctx && this.ctx.state !== "running" && !this.muted) {
                    this.ctx.resume().catch(() => {});
                }
            };
            document.addEventListener("visibilitychange", onVisOrFocus);
            window.addEventListener("pageshow", onVisOrFocus);
            window.addEventListener("focus", onVisOrFocus);

            // 1. Player Multi-Layer Vehicle Engine Master Bus (Dynamic Lowpass + Master Gain)
            this.engineMasterFilter = this.ctx.createBiquadFilter();
            this.engineMasterFilter.type = "lowpass";
            this.engineMasterFilter.frequency.value = 3400;
            this.engineMasterFilter.Q.value = 0.7;

            this.engineMasterGain = this.ctx.createGain();
            this.engineMasterGain.gain.value = 0.0;
            this.engineMasterFilter.connect(this.engineMasterGain);
            this.engineMasterGain.connect(this.sfxMasterGain);

            // 2. Emergency Siren Master Gain
            this.sirenGain = this.ctx.createGain();
            this.sirenGain.gain.value = 0.0;
            this.sirenGain.connect(this.sfxMasterGain);

            // 3. Spatial AI Traffic Pass-By Bus
            this.trafficFilter = this.ctx.createBiquadFilter();
            this.trafficFilter.type = "lowpass";
            this.trafficFilter.frequency.value = 950;
            this.trafficGain = this.ctx.createGain();
            this.trafficGain.gain.value = 0.0;
            this.trafficFilter.connect(this.trafficGain);
            this.trafficGain.connect(this.sfxMasterGain);
            this._ensureTrafficSampleLoops();

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
        } catch (e) {
            console.warn("WebAudio init blocked or unavailable:", e);
        }
    }

    sfxOut() {
        return this.sfxMasterGain || (this.ctx ? this.ctx.destination : null);
    }

    musicOut() {
        return this.musicMasterGain || (this.ctx ? this.ctx.destination : null);
    }

    resume() {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        this._decodeAllAvailable();
        if (this.ctx.state !== "running") {
            this.ctx.resume().catch(() => {});
        }
        // Mandatory iOS Safari WebKit hardware unlock
        if (!this._unlockedBuffer) {
            try {
                const buf = this.ctx.createBuffer(1, 1, 22050);
                const src = this.ctx.createBufferSource();
                src.buffer = buf;
                src.connect(this.ctx.destination);
                src.start(0);
                if (this.ctx.state === "running") {
                    this._unlockedBuffer = true;
                }
            } catch (_e) {}
        }
    }

    playSample(key, vol = 0.12, rate = 1.0, maxDuration = 0) {
        if (!this.initialized || this.muted || !this.ctx) return false;
        const buf = this.buffers[key];
        if (!buf) {
            this._decodeKey(key);
            return false;
        }
        try {
            const now = this.ctx.currentTime;
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.setValueAtTime(Math.max(0.35, Math.min(2.4, rate)), now);
            const g = this.ctx.createGain();
            const scaledVol = vol * 0.85;
            g.gain.setValueAtTime(scaledVol, now);
            if (maxDuration > 0 && maxDuration < buf.duration / rate) {
                g.gain.setValueAtTime(scaledVol, now + Math.max(0.02, maxDuration - 0.04));
                g.gain.exponentialRampToValueAtTime(0.001, now + maxDuration);
            }
            src.connect(g);
            g.connect(this.sfxOut());
            src.start(now);
            if (maxDuration > 0) {
                src.stop(now + maxDuration + 0.01);
            }
            return true;
        } catch (_e) {
            return false;
        }
    }

    _stopEngineLayers() {
        for (const layer of this._engineLayers) {
            try {
                layer.src.stop();
                layer.src.disconnect();
                layer.gainNode.disconnect();
            } catch (_e) {}
        }
        this._engineLayers = [];
        this._activeEngineClass = null;
    }

    _ensureEngineLayers(vehClass) {
        if (!this.ctx || !this.engineMasterFilter) return false;
        const specs = ENGINE_BANK_SPECS[vehClass] || ENGINE_BANK_SPECS.SEDAN;
        // Check if all required buffers for this class are decoded
        for (const s of specs) {
            if (!this.buffers[s.key]) {
                this._decodeKey(s.key);
                return false;
            }
        }
        if (this._activeEngineClass === vehClass && this._engineLayers.length === specs.length) {
            return true;
        }
        this._stopEngineLayers();
        const now = this.ctx.currentTime;
        for (const s of specs) {
            const src = this.ctx.createBufferSource();
            src.buffer = this.buffers[s.key];
            src.loop = true;
            src.playbackRate.setValueAtTime(s.baseRate, now);
            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(0.0, now);
            src.connect(gainNode);
            gainNode.connect(this.engineMasterFilter);
            src.start(now);
            this._engineLayers.push({
                spec: s,
                src,
                gainNode
            });
        }
        this._activeEngineClass = vehClass;
        return true;
    }

    _ensureTrafficSampleLoops() {
        if (!this.ctx || !this.trafficFilter) return;
        const now = this.ctx.currentTime;
        if (!this._trafficCarNode && this.buffers.sedan_low) {
            try {
                const src = this.ctx.createBufferSource();
                src.buffer = this.buffers.sedan_low;
                src.loop = true;
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(1.0, now);
                src.connect(g);
                g.connect(this.trafficFilter);
                src.start(now);
                this._trafficCarNode = { src, gain: g };
            } catch (_e) {}
        }
        if (!this._trafficMotoNode && this.buffers.moto_low) {
            try {
                const src = this.ctx.createBufferSource();
                src.buffer = this.buffers.moto_low;
                src.loop = true;
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0, now);
                src.connect(g);
                g.connect(this.trafficFilter);
                src.start(now);
                this._trafficMotoNode = { src, gain: g };
            } catch (_e) {}
        }
    }

    _ensureSirenLoop(sirenKey) {
        if (!this.ctx || !this.sirenGain) return false;
        if (!this.buffers[sirenKey]) {
            this._decodeKey(sirenKey);
            return false;
        }
        if (this._activeSirenKey === sirenKey && this._sirenNode) {
            return true;
        }
        if (this._sirenNode) {
            try {
                this._sirenNode.stop();
                this._sirenNode.disconnect();
            } catch (_e) {}
            this._sirenNode = null;
        }
        try {
            const src = this.ctx.createBufferSource();
            src.buffer = this.buffers[sirenKey];
            src.loop = true;
            src.connect(this.sirenGain);
            src.start(this.ctx.currentTime);
            this._sirenNode = src;
            this._activeSirenKey = sirenKey;
            return true;
        } catch (_e) {
            return false;
        }
    }

    _updateSkidLoop(now, isDrifting, speedRatio) {
        if (!this.ctx) return;
        if (isDrifting && this.inVehicle && speedRatio > 0.18) {
            if (!this._skidLoopNode && this.buffers.tire_skid_loop) {
                try {
                    const src = this.ctx.createBufferSource();
                    src.buffer = this.buffers.tire_skid_loop;
                    src.loop = true;
                    const g = this.ctx.createGain();
                    g.gain.setValueAtTime(0.01, now);
                    src.connect(g);
                    g.connect(this.sfxOut());
                    src.start(now);
                    this._skidLoopNode = src;
                    this._skidLoopGain = g;
                } catch (_e) {}
            }
            if (this._skidLoopNode && this._skidLoopGain) {
                const targetGain = Math.min(0.075, 0.030 + speedRatio * 0.045);
                this._skidLoopGain.gain.setTargetAtTime(targetGain, now, 0.04);
                this._skidLoopNode.playbackRate.setTargetAtTime(0.92 + speedRatio * 0.22, now, 0.05);
            }
        } else if (this._skidLoopGain) {
            this._skidLoopGain.gain.setTargetAtTime(0.0, now, 0.06);
        }
    }

    _tickMusicScheduler() {
        // Synthesized WebAudio music disabled: game uses the YouTube soundtrack only
    }

    cycleStation() {
        this.currentStationIdx = (this.currentStationIdx + 1) % this.stations.length;
        this.playBeep(880, 0.06, "square", 0.08);
        return this.stations[this.currentStationIdx];
    }

    getCurrentStation() {
        return this.stations[this.currentStationIdx];
    }

    getStation() {
        return this.stations[this.currentStationIdx];
    }

    update(dt, state) {
        if (!this.initialized || this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        this.inVehicle = Boolean(state.inVehicle);
        if (this._shiftCooldown > 0) this._shiftCooldown = Math.max(0, this._shiftCooldown - dt);
        if (this._shiftDipTimer > 0) this._shiftDipTimer = Math.max(0, this._shiftDipTimer - dt);
        if (this._bovCooldown > 0) this._bovCooldown = Math.max(0, this._bovCooldown - dt);
        if (this._airBrakeCooldown > 0) this._airBrakeCooldown = Math.max(0, this._airBrakeCooldown - dt);

        // 1. Multi-Layer Sampled Vehicle Engine + 5-Speed Automatic Gearbox + Turbo BOV & Backfires
        if (this.inVehicle && state.vehicleSpeed !== undefined) {
            const specKey = state.vehicleSpecKey || "REGAL_SEDAN";
            const vehClass = this.getVehicleAudioClass(specKey);
            const rawSpeed = state.vehicleSpeed || 0;
            const absSpeed = Math.abs(rawSpeed);
            const maxSpd = Math.max(220, state.vehicleMaxSpeed || 410);
            const speedNorm = Math.min(1.0, absSpeed / maxSpd);
            const throttle = state.vehicleThrottle !== undefined ? state.vehicleThrottle : (absSpeed > this._prevAbsSpeed + 0.5 ? 1 : 0);

            // 5-Speed Automatic Transmission Gear Selection with Hysteresis
            let targetGear = 1;
            if (speedNorm > 0.78) targetGear = 5;
            else if (speedNorm > 0.56) targetGear = 4;
            else if (speedNorm > 0.36) targetGear = 3;
            else if (speedNorm > 0.17) targetGear = 2;

            if (targetGear !== this._currentGear && this._shiftCooldown <= 0 && vehClass !== "TANK") {
                const isUpshift = targetGear > this._currentGear;
                this._currentGear = targetGear;
                this._shiftCooldown = 0.32;
                if (isUpshift && absSpeed > 55) {
                    this._shiftDipTimer = 0.13;
                    this.playSample("gear_shift_up", 0.085, 0.96 + Math.random() * 0.08);
                    if (vehClass === "SUPER" && absSpeed > 135 && this._bovCooldown <= 0) {
                        this._bovCooldown = 0.55;
                        this.playSample("turbo_bov", 0.095, 0.95 + Math.random() * 0.12);
                    }
                    if ((vehClass === "SUPER" || vehClass === "V8" || vehClass === "MOTO") && absSpeed > 170 && Math.random() < 0.6) {
                        const bfIdx = 1 + Math.floor(Math.random() * 3);
                        this.playSample(`backfire_${bfIdx}`, 0.095, 0.92 + Math.random() * 0.16);
                    }
                } else if (!isUpshift && absSpeed > 65) {
                    this.playSample("gear_shift_down", 0.07, 0.96 + Math.random() * 0.08);
                }
            }

            // Throttle lift-off at high RPM -> Turbo Blow-Off Valve or Exhaust Crackle/Backfire!
            if (this._prevThrottle > 0.5 && throttle <= 0 && this._smoothedRpm > 0.68 && absSpeed > 140 && this._bovCooldown <= 0) {
                this._bovCooldown = 0.75;
                if (vehClass === "SUPER") {
                    this.playSample("turbo_bov", 0.09, 0.94 + Math.random() * 0.12);
                } else if (vehClass === "V8" || vehClass === "MOTO" || vehClass === "HARLEY") {
                    const bfIdx = 1 + Math.floor(Math.random() * 3);
                    this.playSample(`backfire_${bfIdx}`, 0.085, 0.90 + Math.random() * 0.18);
                }
            }

            // Heavy Truck / Bus Air Brake Hiss when braking hard to a stop & Reverse Warning Beep
            if (vehClass === "TRUCK") {
                if (this._prevAbsSpeed > 65 && absSpeed < 18 && this._airBrakeCooldown <= 0) {
                    this._airBrakeCooldown = 2.4;
                    this.playSample("air_brake", 0.095, 0.96 + Math.random() * 0.08);
                }
                if (rawSpeed < -14) {
                    this._reverseBeepTimer -= dt;
                    if (this._reverseBeepTimer <= 0) {
                        this._reverseBeepTimer = 0.92;
                        this.playSample("reverse_beep", 0.068, 1.0, 0.38);
                    }
                } else {
                    this._reverseBeepTimer = 0.1;
                }
            }

            // Compute within-gear RPM + overall engine load [0.0 .. 1.0]
            const gearBounds = [0.0, 0.20, 0.39, 0.59, 0.79, 1.04];
            const gLow = gearBounds[this._currentGear - 1] || 0;
            const gHigh = gearBounds[this._currentGear] || 1;
            const inGearNorm = Math.max(0, Math.min(1, (speedNorm - gLow) / Math.max(0.12, gHigh - gLow)));
            const throttleBoost = throttle > 0 ? 0.12 : (throttle < 0 ? -0.04 : -0.02);
            const targetRpm = Math.max(0.0, Math.min(1.0, speedNorm * 0.62 + inGearNorm * 0.34 + throttleBoost));
            this._smoothedRpm += (targetRpm - this._smoothedRpm) * Math.min(1.0, dt * 9.5);

            const shiftDip = this._shiftDipTimer > 0 ? 0.48 : 1.0;
            const loadFilterHz = 1650 + this._smoothedRpm * 2800 + (throttle > 0 ? 750 : 0);
            if (this.engineMasterFilter && this.engineMasterGain) {
                this.engineMasterFilter.frequency.setTargetAtTime(loadFilterHz, now, 0.05);
                this.engineMasterGain.gain.setTargetAtTime((0.40 + this._smoothedRpm * 0.18) * shiftDip, now, 0.05);
            }

            if (this._ensureEngineLayers(vehClass)) {
                const rpm = this._smoothedRpm;
                for (const layer of this._engineLayers) {
                    const s = layer.spec;
                    let w = 0;
                    if (s.key === "tank_tracks") {
                        w = Math.min(1.0, absSpeed / 95);
                    } else {
                        const dist = Math.abs(rpm - s.center);
                        w = Math.max(0, 1.0 - dist / s.width);
                        // Smooth cosine bell curve so adjacent RPM layers crossfade seamlessly
                        w = Math.sin(w * Math.PI * 0.5);
                    }
                    const layerGain = w * s.gain;
                    const rate = s.baseRate + rpm * s.rateSpan * (this._shiftDipTimer > 0 ? 0.90 : 1.0);
                    layer.gainNode.gain.setTargetAtTime(layerGain, now, 0.045);
                    layer.src.playbackRate.setTargetAtTime(Math.max(0.55, Math.min(1.65, rate)), now, 0.045);
                }
            }

            this._updateSkidLoop(now, Boolean(state.vehicleDrifting), speedNorm);
            this._prevThrottle = throttle;
            this._prevAbsSpeed = absSpeed;
        } else {
            if (this.engineMasterGain) {
                this.engineMasterGain.gain.setTargetAtTime(0.0, now, 0.08);
            }
            this._updateSkidLoop(now, false, 0);
            this._currentGear = 1;
            this._smoothedRpm = 0;
            this._prevThrottle = 0;
            this._prevAbsSpeed = 0;
        }

        // 2. Real Emergency Sirens (Police Cruiser / Ambulance / Fire Truck)
        const sirenDist = state.nearestSirenDist !== undefined ? state.nearestSirenDist : (state.wantedLevel > 0 ? state.nearestCopDist : 9999);
        const playerSiren = Boolean(this.inVehicle && state.playerSirenActive);
        if (playerSiren || (sirenDist !== undefined && sirenDist < 950)) {
            const sirenType = state.nearestSirenType || "POLICE";
            const sirenKey = sirenType === "MEDIC"
                ? "siren_medic"
                : (sirenType === "FIRE" ? "siren_firetruck" : "siren_police");
            const prox = playerSiren ? 0.95 : Math.max(0, 1 - sirenDist / 950);
            if (this._ensureSirenLoop(sirenKey) && this._sirenNode) {
                this.sirenGain.gain.setTargetAtTime(prox * 0.115, now, 0.06);
                const doppler = playerSiren ? 1.0 : Math.max(0.88, Math.min(1.14, state.trafficDoppler || 1.0));
                this._sirenNode.playbackRate.setTargetAtTime(doppler, now, 0.06);
            }
        } else if (this.sirenGain) {
            this.sirenGain.gain.setTargetAtTime(0.0, now, 0.08);
        }

        // 3. Spatial AI Traffic Pass-By Sample Loop (with Doppler shift & motorcycle vs car engine!)
        if (this.trafficGain && this.trafficFilter) {
            this._ensureTrafficSampleLoops();
            const tDist = state.nearestTrafficDist !== undefined ? state.nearestTrafficDist : 9999;
            const tSpd = Math.abs(state.nearestTrafficSpeed || 0);
            if (tDist < 540 && tSpd > 8) {
                const prox = Math.pow(Math.max(0, 1 - tDist / 540), 1.45);
                const doppler = Math.max(0.78, Math.min(1.26, state.trafficDoppler || 1.0));
                const spdNorm = Math.min(1.0, tSpd / 320);
                const rate = (0.82 + spdNorm * 0.42) * doppler;
                if (this._trafficCarNode) {
                    this._trafficCarNode.gain.gain.setTargetAtTime(state.trafficIsMoto ? 0.0 : 1.0, now, 0.05);
                    this._trafficCarNode.src.playbackRate.setTargetAtTime(rate, now, 0.05);
                }
                if (this._trafficMotoNode) {
                    this._trafficMotoNode.gain.gain.setTargetAtTime(state.trafficIsMoto ? 1.0 : 0.0, now, 0.05);
                    this._trafficMotoNode.src.playbackRate.setTargetAtTime(rate, now, 0.05);
                }
                this.trafficFilter.frequency.setTargetAtTime(state.trafficIsMoto ? 1800 : 1150, now, 0.06);
                const volScale = this.inVehicle ? 0.022 : 0.044;
                this.trafficGain.gain.setTargetAtTime(prox * volScale, now, 0.06);
            } else {
                this.trafficGain.gain.setTargetAtTime(0.0, now, 0.10);
            }
        }

        // 4. Environmental Ambience: Ocean Waves Surf, Urban Hum, Daytime Seagulls & Night Crickets
        this.ambientTimer += dt;
        const waterProx = Math.max(0, Math.min(1, state.waterProximity || 0));
        if (this.oceanGain && this.oceanFilter) {
            const waveLfo = 0.55 + 0.45 * Math.sin(this.ambientTimer * 1.14);
            const surfVol = waterProx * (this.inVehicle ? 0.022 : 0.046) * waveLfo;
            this.oceanFilter.frequency.setTargetAtTime(220 + waveLfo * 340, now, 0.12);
            this.oceanGain.gain.setTargetAtTime(surfVol, now, 0.15);
        }
        if (this.cityHumGain) {
            const urbanVol = (!this.inVehicle && waterProx < 0.7) ? 0.0075 : 0.0028;
            this.cityHumGain.gain.setTargetAtTime(urbanVol, now, 0.20);
        }

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

        // Per-weapon anti-stacking rate limiter so simultaneous AI cop/gang shots don't spike volume
        const now = this.ctx.currentTime;
        if (!this._lastShotByType) this._lastShotByType = {};
        const minGap = (weaponType === "UZI" || weaponType === "FLAMETHROWER" || weaponType === "ELECTRO") ? 0.042 : 0.055;
        if (this._lastShotByType[weaponType] && now - this._lastShotByType[weaponType] < minGap) {
            return;
        }
        this._lastShotByType[weaponType] = now;

        if (weaponType === "FIST") {
            if (!this.playSample("melee_swing", 0.095, 0.92 + Math.random() * 0.18, 0.28)) {
                this.playBandNoise(0.065, 420, 1.4, 0.025);
                this.playBeep(115, 0.045, "sine", 0.022);
            }
            return;
        }
        if (weaponType === "FLAMETHROWER") {
            const ok = this.playSample("gta_shot_flamethrower", 0.078, 0.92 + Math.random() * 0.16, 0.28);
            this.playSample("flame_burst", 0.052, 0.94 + Math.random() * 0.16, 0.22);
            if (!ok) {
                this.playNoise(0.11, 600, 0.032);
            }
            return;
        }
        if (weaponType === "ELECTRO") {
            const ok = this.playSample("electro_zap", 0.078, 1.15 + Math.random() * 0.25, 0.22);
            this.playSample("gta_ricochet", 0.038, 1.32 + Math.random() * 0.18, 0.16);
            if (!ok) {
                this.playBandNoise(0.09, 3200, 2.2, 0.035);
                this.playBeep(1180, 0.07, "sawtooth", 0.025);
            }
            return;
        }
        if (weaponType === "ROCKET") {
            const ok = this.playSample("gta_shot_rocket", 0.105, 0.94 + Math.random() * 0.08, 0.78);
            this.playSample("cannon_blast", 0.068, 0.88 + Math.random() * 0.08, 0.48);
            if (!ok) {
                this.playNoise(0.28, 350, 0.065);
                this.playBeep(140, 0.25, "sawtooth", 0.055);
            }
            return;
        }
        if (weaponType === "SHOTGUN") {
            const ok = this.playSample("shot_shotgun_1", 0.098, 0.94 + Math.random() * 0.08, 0.65);
            this.playSample("shot_shotgun_2", 0.048, 0.96 + Math.random() * 0.06, 0.58);
            setTimeout(() => {
                if (this.ctx && !this.muted) {
                    this.playSample("shotgun_reload", 0.045, 1.06 + Math.random() * 0.06, 0.38);
                }
            }, 175);
            if (!ok) {
                this.playNoise(0.16, 1200, 0.055);
            }
            return;
        }
        if (weaponType === "UZI") {
            this._uziCycle = ((this._uziCycle || 0) + 1) % 3;
            const uziKey = this._uziCycle === 0 ? "shot_uzi_1" : (this._uziCycle === 1 ? "shot_uzi_2" : "shot_uzi_3");
            const ok = this.playSample(uziKey, 0.076, 0.95 + Math.random() * 0.12, 0.26);
            this.playSample("gta_shot_uzi", 0.032, 0.98 + Math.random() * 0.08, 0.24);
            if (Math.random() < 0.45) {
                setTimeout(() => {
                    if (this.ctx && !this.muted) {
                        this.playSample(Math.random() < 0.5 ? "casing_bounce_1" : "casing_bounce_2", 0.018, 1.15 + Math.random() * 0.20, 0.18);
                    }
                }, 85);
            }
            if (!ok) {
                this.playNoise(0.055, 1200, 0.045);
            }
            return;
        }

        // Default: PISTOL (9mm Semi-Auto)
        const primaryKey = Math.random() < 0.72 ? "shot_pistol_1" : "shot_pistol_2";
        const ok = this.playSample(primaryKey, 0.088, 0.96 + Math.random() * 0.08, 0.44);
        this.playSample("gta_shot_pistol", 0.036, 0.98 + Math.random() * 0.06, 0.40);
        setTimeout(() => {
            if (this.ctx && !this.muted) {
                this.playSample(Math.random() < 0.5 ? "casing_bounce_1" : "casing_bounce_2", 0.020, 1.10 + Math.random() * 0.20, 0.20);
            }
        }, 105);
        if (!ok) {
            this.playNoise(0.085, 1200, 0.05);
        }
    }

    playPunchHit() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const hitKey = Math.random() < 0.5 ? "melee_hit_1" : "melee_hit_2";
        const ok = this.playSample("gta_punch", 0.088, 0.94 + Math.random() * 0.12, 0.26);
        this.playSample(hitKey, 0.068, 0.95 + Math.random() * 0.10, 0.28);
        if (!ok) {
            this.playBandNoise(0.075, 680, 1.6, 0.055);
            this.playBeep(92, 0.07, "triangle", 0.065);
        }
    }

    playExplosion() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const ok = this.playSample("explosion_modern", 0.110, 0.90 + Math.random() * 0.14, 1.35);
        this.playSample("gta_explosion", 0.075, 0.94 + Math.random() * 0.10, 1.45);
        this.playSample("gta_huge_explosion", 0.052, 0.96 + Math.random() * 0.08, 1.85);
        this.playSample("crash_heavy", 0.055, 0.78, 0.85);
        if (!ok) {
            this.playNoise(0.55, 280, 0.12);
        }
    }

    playTireScreech() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastScreechTime && now - this._lastScreechTime < 0.28) return;
        this._lastScreechTime = now;
        if (!this.playSample("tire_squeal", 0.105, 0.92 + Math.random() * 0.18, 0.42)) {
            this.playNoise(0.07, 1900, 0.032);
        }
    }

    playCashSound() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const ok = this.playSample("gta_pickup", 0.12, 1.0 + Math.random() * 0.05, 0.85);
        this.playSample("pickup_weapon", 0.068, 1.08 + Math.random() * 0.08, 0.35);
        if (!ok) {
            this.playBeep(987.77, 0.06, "square", 0.06);
            setTimeout(() => this.playBeep(1318.51, 0.12, "square", 0.06), 60);
        }
    }

    playPayphoneRing() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastPhoneRingTime && now - this._lastPhoneRingTime < 0.75) return;
        this._lastPhoneRingTime = now;
        if (!this.playSample("gta_phone_ring", 0.095, 1.0, 0.80)) {
            this.playBeep(1100, 0.05, "square", 0.035);
            setTimeout(() => this.playBeep(1380, 0.05, "square", 0.035), 55);
        }
    }

    playAnkleMonitorAlert() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const ok = this.playSample("gta_pager", 0.11, 1.04, 0.55);
        this.playSample("ankle_alarm", 0.072, 1.12, 0.35);
        if (!ok) {
            this.playBeep(1560, 0.07, "sawtooth", 0.055);
            setTimeout(() => this.playBeep(1560, 0.07, "sawtooth", 0.055), 110);
        }
    }

    playHorn(isEmergency = false, specKey = null) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastHornTime && now - this._lastHornTime < 0.18) return;
        this._lastHornTime = now;

        if (isEmergency) {
            if (!this.playSample("horn_airhorn", 0.11, 1.08, 0.45)) {
                this.playBeep(680, 0.18, "sawtooth", 0.085);
            }
            return;
        }

        const vehClass = this.getVehicleAudioClass(specKey);
        let hornKey = "horn_car";
        let rate = 0.97 + Math.random() * 0.06;
        let maxDur = 0.55;

        if (specKey === "MONSTER_BUGGY" || specKey === "GATOR_4X4" || specKey === "HOTDOG_VAN") {
            hornKey = "horn_dixie";
            maxDur = 1.35;
        } else if (vehClass === "TRUCK" || vehClass === "TANK") {
            hornKey = (specKey === "TANKER_RIG" || specKey === "FLATBED_TRUCK" || specKey === "PANZER_TANK")
                ? "horn_airhorn"
                : "horn_truck";
            maxDur = 0.70;
        } else if (vehClass === "SUPER" || vehClass === "MOTO") {
            hornKey = "horn_sport";
            maxDur = 0.48;
        } else if (vehClass === "V8") {
            hornKey = "horn_car";
            rate = 0.88;
            maxDur = 0.58;
        }

        if (!this.playSample(hornKey, 0.115, rate, maxDur)) {
            this.playBeep(392.0, 0.22, "sawtooth", 0.085);
            this.playBeep(493.88, 0.22, "sawtooth", 0.075);
        }
    }

    playBurpOrFart(isFart = undefined) {
        const useFart = isFart !== undefined ? Boolean(isFart) : (Math.random() < 0.5);
        if (!this.initialized || this.muted || !this.ctx) return useFart ? "FART" : "BURP";
        const key = useFart ? "gta_fart" : "gta_burp";
        if (!this.playSample(key, 0.155, 0.92 + Math.random() * 0.16, 0.45)) {
            this.playBeep(useFart ? 85 : 105, 0.22, "sawtooth", 0.10);
        }
        return useFart ? "FART" : "BURP";
    }

    playFanfare(kind = "MISSION") {
        if (!this.initialized || this.muted || !this.ctx) return;
        let vocalKey = "gta_vocal_mission_complete";
        if (kind === "FRENZY") {
            vocalKey = "gta_vocal_kill_frenzy";
        } else if (kind === "GOURANGA") {
            vocalKey = "gta_vocal_excellent";
        } else if (kind === "WASTED") {
            vocalKey = "gta_vocal_player_dies";
        } else if (kind === "BUSTED" || kind === "FAILED") {
            vocalKey = "gta_vocal_mission_failed";
        } else if (kind === "GTA") {
            vocalKey = "gta_vocal_grand_theft_auto";
        }
        const ok = this.playSample(vocalKey, 0.155, 1.0, 2.8);
        if (kind === "MISSION" || kind === "GOURANGA" || kind === "FRENZY") {
            this.playSample("gta_pickup", 0.085, 1.0, 1.2);
        }
        if (!ok) {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((n, idx) => {
                setTimeout(() => this.playBeep(n, 0.14, "square", 0.08), idx * 80);
            });
        }
    }

    playCrateSmash() {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (!this.playSample("gta_crate_break", 0.135, 0.94 + Math.random() * 0.12, 0.75)) {
            this.playNoise(0.16, 850, 0.11);
            this.playBeep(160, 0.1, "triangle", 0.07);
        }
    }

    playFootstep(surface = "PAVEMENT", isLeft = false) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const pitchJit = (isLeft ? 0.95 : 1.05) * (0.96 + Math.random() * 0.08);

        if (surface === "WATER") {
            this.playWaterSplash(0.68);
            return;
        }
        if (surface === "SAND") {
            if (!this.playSample("step_soft", 0.076, 0.88 * pitchJit, 0.16)) {
                this.playBandNoise(0.068, 1650 * pitchJit, 1.4, 0.038);
            }
            return;
        }
        if (surface === "GRASS") {
            if (!this.playSample("step_grass", 0.076, 0.95 * pitchJit, 0.16)) {
                this.playBandNoise(0.058, 1100 * pitchJit, 1.2, 0.032);
            }
            return;
        }
        const stepKey = isLeft ? "gta_step_1" : "gta_step_2";
        if (!this.playSample(stepKey, 0.068, pitchJit, 0.14)) {
            this.playBandNoise(0.042, 1450 * pitchJit, 2.2, 0.036);
        }
    }

    playWaterSplash(scale = 1.0) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const splashKey = Math.random() < 0.5 ? "water_splash_1" : "water_splash_2";
        const ok = this.playSample(splashKey, 0.095 * scale, 0.92 + Math.random() * 0.16, 0.65);
        this.playSample("gta_water_splash", 0.062 * scale, 0.96 + Math.random() * 0.08, 0.65);
        if (!ok) {
            this.playBandNoise(0.15, 780, 0.9, 0.068 * scale);
        }
    }

    playCarEnter(isMotorcycle = false, specKey = null) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const vehClass = this.getVehicleAudioClass(specKey);

        if (!isMotorcycle) {
            const doorKey = (vehClass === "TRUCK" || vehClass === "TANK") ? "truck_door" : "gta_car_door_open";
            this.playSample(doorKey, 0.115, 0.96 + Math.random() * 0.08, 0.55);
            setTimeout(() => {
                if (this.ctx && !this.muted) {
                    this.playSample("gta_car_door_close", 0.11, 0.96 + Math.random() * 0.08, 0.35);
                }
            }, 135);
        }

        // Play class-authentic ignition starter crank & initial engine roar!
        setTimeout(() => {
            if (!this.ctx || this.muted) return;
            let startKey = "start_sedan";
            let startRate = 1.0;
            let maxDur = 1.15;
            if (vehClass === "SUPER") {
                startKey = "start_super";
            } else if (vehClass === "V8") {
                startKey = "start_v8";
            } else if (vehClass === "HARLEY") {
                startKey = "harley_start";
                maxDur = 1.35;
            } else if (vehClass === "MOTO") {
                startKey = "start_super";
                startRate = 1.22;
                maxDur = 0.95;
            } else if (vehClass === "TRUCK") {
                startKey = "truck_start";
                maxDur = 1.35;
            } else if (vehClass === "TANK") {
                startKey = "tank_start";
                maxDur = 1.45;
            }
            this.playSample(startKey, 0.125, startRate, maxDur);
        }, isMotorcycle ? 35 : 190);
    }

    playCarExit(isMotorcycle = false, specKey = null) {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (isMotorcycle) {
            this.playSample("step_soft", 0.075, 0.95, 0.18);
            return;
        }
        const vehClass = this.getVehicleAudioClass(specKey);
        const doorKey = (vehClass === "TRUCK" || vehClass === "TANK") ? "truck_door" : "gta_car_door_close";
        if (!this.playSample(doorKey, 0.11, 0.94 + Math.random() * 0.08, 0.50)) {
            this.playSample("car_door", 0.105, 0.95, 0.55);
        }
        if (vehClass === "TRUCK") {
            this.playSample("air_brake", 0.075, 1.0, 0.65);
        }
    }

    playCarCrash(intensity = 1.0) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastCrashTime && now - this._lastCrashTime < 0.16) return;
        this._lastCrashTime = now;
        const k = Math.max(0.35, Math.min(1.5, intensity));

        const primaryKey = k > 0.85 ? "crash_heavy" : "crash_metal";
        const rate = 0.88 + Math.random() * 0.22;
        if (this.playSample(primaryKey, Math.min(0.165, 0.105 * k), rate, 0.95)) {
            if (k > 1.05) {
                this.playSample("crash_metal", 0.072 * k, 1.05 + Math.random() * 0.15, 0.70);
            }
        } else {
            this.playNoise(0.18 * k, 720, 0.12 * k);
            this.playBeep(95 + Math.random() * 35, 0.12, "sawtooth", 0.105 * k);
        }
    }

    playRicochet() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastRicoTime && now - this._lastRicoTime < 0.07) return;
        this._lastRicoTime = now;
        const keys = ["ricochet_1", "ricochet_2", "ricochet_3", "gta_ricochet"];
        const rKey = keys[Math.floor(Math.random() * keys.length)];
        if (!this.playSample(rKey, 0.068, 0.92 + Math.random() * 0.18, 0.32)) {
            this.playBeep(1950, 0.06, "triangle", 0.032);
        }
    }

    playPedScream() {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (this._lastScreamTime && now - this._lastScreamTime < 0.65) return;
        this._lastScreamTime = now;
        const screamKeys = [
            "gta_scream_scared_1",
            "gta_scream_scared_2",
            "gta_scream_scared_3",
            "pain_1",
            "pain_2",
            "pain_3"
        ];
        const sKey = screamKeys[Math.floor(Math.random() * screamKeys.length)];
        if (!this.playSample(sKey, 0.115, 0.94 + Math.random() * 0.14, 0.85)) {
            this.playBeep(680, 0.18, "sawtooth", 0.05);
        }
    }

    playPedDeath(deathKind = null, isRoadkill = false) {
        if (!this.initialized || this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (isRoadkill) {
            this.playSample("gta_squashed", 0.125, 0.94 + Math.random() * 0.12, 0.35);
            this.playSample("splat", 0.085, 0.95 + Math.random() * 0.10, 0.35);
        }
        if (this._lastDeathScreamTime && now - this._lastDeathScreamTime < 0.38) return;
        this._lastDeathScreamTime = now;
        if (deathKind === "ELECTRO") {
            this.playSample("gta_scream_electro", 0.125, 0.96 + Math.random() * 0.08, 0.70);
            return;
        }
        if (deathKind === "BURNT") {
            this.playSample("gta_scream_die_1", 0.12, 0.95 + Math.random() * 0.10, 0.95);
            return;
        }
        const dieKeys = ["gta_scream_die_1", "gta_scream_die_2", "gta_scream_die_3", "die_1", "die_2"];
        const dKey = dieKeys[Math.floor(Math.random() * dieKeys.length)];
        this.playSample(dKey, 0.115, 0.94 + Math.random() * 0.12, 1.15);
    }

    playSeagullCall(prox = 0.7) {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (!this.playSample("bird_call", 0.072 * prox, 0.92 + Math.random() * 0.16, 0.85)) {
            this.playBeep(1520, 0.22, "sine", 0.024 * prox);
        }
    }

    playCricketChirp(nf = 0.8) {
        if (!this.initialized || this.muted || !this.ctx) return;
        if (!this.playSample("night_crickets", 0.058 * nf, 0.96 + Math.random() * 0.08, 0.95)) {
            this.playBeep(4150, 0.022, "sine", 0.015 * nf);
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
