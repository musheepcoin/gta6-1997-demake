// Slides a car back along its (axis-aligned) heading until neither its centre nor its nose is on a zebra crosswalk / stop-line tile
// or inside the junction box, so no vehicle ever waits ON a pedestrian crossing under the signal heads.
function nudgeVehicleOffCrosswalk(map, v) {
    if (!map || !map.stopLineMask || !map.getBlockInfo || !v) return;
    const hdx = Math.round(Math.cos(v.angle || 0)), hdy = Math.round(Math.sin(v.angle || 0));
    if (hdx * hdy !== 0 || (hdx === 0 && hdy === 0)) return;
    for (let back = 0; back < 3; back++) {
        const ct = Math.floor(v.x / TILE_SIZE), cr = Math.floor(v.y / TILE_SIZE);
        const nt = Math.floor((v.x + hdx * 30) / TILE_SIZE), nr = Math.floor((v.y + hdy * 30) / TILE_SIZE);
        const onCross = map.stopLineMask[cr * MAP_COLS + ct] === 1 || map.stopLineMask[nr * MAP_COLS + nt] === 1 ||
            map.getBlockInfo(ct, cr, 1).lid === 25 || map.getBlockInfo(nt, nr, 1).lid === 25;
        if (!onCross) return;
        const bt = Math.floor((v.x - hdx * TILE_SIZE) / TILE_SIZE), br = Math.floor((v.y - hdy * TILE_SIZE) / TILE_SIZE);
        if (map.surfaceGround[br * MAP_COLS + bt] !== GROUND_TYPE.ROAD) return;
        v.x -= hdx * TILE_SIZE;
        v.y -= hdy * TILE_SIZE;
    }
}

/* ============================================================================

   GRAND THEFT AUTO: LEONIDA '97 — CORE GAME ENGINE & LOOP

   Supports ZQSD / WASD / Arrow Keys + Mouse Aim + Full GTA 1 Gameplay Loop

   ============================================================================ */



class LeonidaGame {

    constructor() {

        this.canvas = document.getElementById("game-canvas");

        this.radarCanvas = document.getElementById("radar-canvas");



        this.audio = new RetroAudioEngine();

        this.map = new LeonidaMap();
        this.map.game = this;
        if (typeof window !== "undefined") {
            window.game = this;
        }

        this.renderer = new RetroRenderer(this.canvas, this.radarCanvas, this.map);

        this.missions = new MissionManager(this);

        this.trafficManager = new TrafficManager(this);

        this.creationEngine = typeof ViceCreationEngine !== "undefined" ? new ViceCreationEngine(this) : null;

        this.net = null;



        // Input state (Supports both AZERTY ZQSD, QWERTY WASD, and Arrow Keys)

        this.input = {

            up: false,

            down: false,

            left: false,

            right: false,

            handbrake: false,

            shoot: false,

            sprint: false,

            mouseX: window.innerWidth * 0.5,

            mouseY: window.innerHeight * 0.5

        };



        // Player: LUCIA CAMINOS (Starts on Ocean Drive in front of Hotel Dixon, facing Lummus Park, Vice Beach & the Atlantic Pier!)

        this.player = {

            x: mx256(213.5) * TILE_SIZE,

            y: my256(146.0) * TILE_SIZE,

            z: 2.0,

            angle: 0,

            hp: 100,

            maxHp: 100,

            armor: 50,

            maxArmor: 100,

            inVehicle: null,

            seatIndex: 0,

            weapon: "PISTOL",

            // Everybody starts the same way: fists + a pistol with only a few bullets (the rest is bought in shops)

            weaponsOwned: ["FIST", "PISTOL"],

            ammo: {

                FIST: Infinity,

                PISTOL: 30,

                UZI: 0,

                SHOTGUN: 0,

                FLAMETHROWER: 0,

                ROCKET: 0,

                ELECTRO: 0

            },

            shootCooldown: 0,

            muzzleTimer: 0,

            weaponDrawnTimer: 0,

            walkPhase: 0,

            isMoving: false,

            tankControls: false,

            jumpTimer: 0,

            jumpZOffset: 0,

            enteringVehicle: null,

            mouseShoot: false,

            bandana: false,

            ankleScrambled: false,

            dead: false,

            charId: "LUCIA",

            pedType: "lucia"

        };



        // Partner AI disabled (solo & real multiplayer only)

        this.jason = null;



        // Classic 1997 GTA 1 Score, Multiplier, Lives & Get Out of Jail Free Cards

        this.START_CASH = 500; // everybody starts with this, and dying puts you back to exactly this amount

        this.cash = this.START_CASH;

        this.targetScore = 1000000;

        this.chapterCleared = false;

        this.multiplier = 1;

        this.lives = 3;

        this.jailFreeCards = 1;

        this.wantedLevel = 0;

        this.wantedDecayTimer = 0;

        this.copSpawnTimer = 0;

        this.roadblockCooldown = 0;

        this.trafficLightTimer = 0;

        this.trafficSpawnTimer = 0;

        this.currentDistrict = "";

        this.districtPopupTimer = 0;



        // Live 24-Hour Smartphone Clock & Dynamic Day/Night Cycle:

        // 1 in-game minute = 1 real second -> 1 full 24-hour cycle (1440 min) = 24 real minutes!

        // Starts at 17:50 (Iconic GTA VI Golden-Hour Lavender-Gold Sunset on Ocean Drive; [N] cycles Day/Golden/Dusk/Night!)

        this.worldMinutes = 17 * 60 + 50;
        this._lastServerWorldMinutes = 17 * 60 + 50;
        this.localTimeOffsetMins = 0;
        this._needsGoldenHourInit = true;

        this.timeScale = 1.0;

        this.lastSmsTimeStr = "17:50";

        this._lastAnnouncedPhase = "GOLDEN";



        // Active Kill Frenzy, GOURANGA Monk Chain & Enterable Venue Interior state

        this.killFrenzy = null;

        this.monkChain = [];

        this.monksKilled = 0;

        this.monkRespawnTimer = 0;

        this.activeInterior = null;

        this.interiorCooldown = 0;

        this.fadeAlpha = 0;

        this.interiorX = 380;

        this.interiorY = 440;

        this.interiorAngle = -Math.PI * 0.5;

        this.interiorJasonX = 420;

        this.interiorJasonY = 448;

        this.interiorJasonAngle = -Math.PI * 0.5;



        // World collections

        this.vehicles = [];
        this._cmpLoadedApplied = false;

        this.peds = [];

        this.projectiles = [];

        this.particles = [];

        this.floatingTexts = [];

        this.skidmarks = [];
        this.graffitiTags = this.loadGraffitiTags();
        this.tagSprayTimer = 0;
        this.tagCooldown = 0;
        this.tagSprayTarget = null;

        this.craters = [];

        // ====================================================================
        // ARCADE 2026 RETENTION LOOPS (Adrenaline Combo, Getaway Pot, Flash Drop & Bounties)
        // ====================================================================
        this.comboChain = 0;
        this.comboMult = 1;
        this.comboTimer = 0;
        this.comboMaxTimer = 6.0;
        this.comboPot = 0;
        this._driftComboAccum = 0;
        this.wantedGetawayPot = 0;
        this.wantedPeakLevel = 0;
        this.activeFlashEvent = null;
        this.flashEventCooldown = 35.0;
        this.activeServerBounty = null;
        this.bountyCooldown = 55.0;



        // Start directly in the live GTA 1 street scene once the 3D map is compiled!

        this.started = true;

        this.worldReady = false;

        this._pendingStartGame = false;

        this._hasEnteredModal = false;

        this._resetLoopClock = false;

        this.respawnTimer = 0;



        this.director = typeof ViceWorldDirector !== "undefined" ? new ViceWorldDirector(this) : null;

        this.initWorldEntities();

        this.net = typeof ViceNetworkManager !== "undefined" ? new ViceNetworkManager(this) : null;

        this.bindEvents();

        this.syncDayNightCycle();

        this.renderPortraits();

        this.updateHud();

    }



    getClockString(showColon = true) {

        const total = ((Math.floor(this.worldMinutes || 0) % 1440) + 1440) % 1440;

        const hh = Math.floor(total / 60);

        const mm = total % 60;

        const sep = showColon ? ":" : " ";

        return `${String(hh).padStart(2, "0")}${sep}${String(mm).padStart(2, "0")}`;

    }



    getArcadeClockRate(hourInput) {
        const hour = (typeof hourInput === "number")
            ? (((hourInput % 24) + 24) % 24)
            : ((((this.worldMinutes % 1440) + 1440) % 1440) / 60.0);
        // Asymmetric Arcade Day/Night Curve (~14 min full 24h cycle: ~76% bright day/golden/sunset, ~24% crisp neon night):
        // - 07:45..16:00 Sunny Day (495m): 1.50 min/s (~5m30s real time)
        // - 16:00..20:15 Afternoon Golden Hour & Pink-Gold Sunset (255m): 1.15 min/s (~3m40s real time)
        // - 20:15..05:15 Neon Night (540m): 2.70 min/s (~3m20s real time)
        // - 05:15..07:45 Atlantic Dawn (150m): 1.65 min/s (~1m30s real time)
        if (hour >= 20.25 || hour < 5.25) return 2.70;
        if (hour >= 16.0 && hour < 20.25) return 1.15;
        if (hour >= 5.25 && hour < 7.75) return 1.65;
        return 1.50;
    }

    getTimePhaseInfo() {

        const mins = ((this.worldMinutes % 1440) + 1440) % 1440;

        const hour = mins / 60.0;

        const smooth = (t) => {

            const c = Math.max(0, Math.min(1, t));

            return c * c * (3 - 2 * c);

        };



        // Night darkness factor (0.0 = full daylight, 1.0 = deep midnight)

        let nightFactor = 0.0;

        if (hour >= 20.5 || hour < 5.25) {

            nightFactor = 1.0;

        } else if (hour >= 17.75 && hour < 20.5) {

            nightFactor = smooth((hour - 17.75) / 2.75);

        } else if (hour >= 5.25 && hour < 7.5) {

            nightFactor = 1.0 - smooth((hour - 5.25) / 2.25);

        }



        // Warm Vice City Golden Afternoon (16:00..17:45) -> Pink-Gold Sunset (17:45..20:15, peak 18:45) & Sunrise (05:15..07:45, peak 06:30) factor

        let sunsetFactor = 0.0;

        if (hour >= 16.0 && hour < 17.25) {

            sunsetFactor = smooth((hour - 16.0) / 1.25) * 0.45;

        } else if (hour >= 17.25 && hour <= 20.25) {

            const d = Math.abs(hour - 18.75) / 1.5;

            sunsetFactor = Math.max(0, 1.0 - d * d);

        } else if (hour >= 5.25 && hour <= 7.75) {

            const d = Math.abs(hour - 6.5) / 1.25;

            sunsetFactor = Math.max(0, 1.0 - d * d) * 0.85;

        }



        let phase = "DAY";

        let icon = "☀️";

        let dockLabel = "☀️ DAY [N]";

        if (hour >= 5.25 && hour < 7.5) {

            phase = "DAWN";

            icon = "🌅";

            dockLabel = "🌅 DAWN [N]";

        } else if (hour >= 7.5 && hour < 16.0) {

            phase = "DAY";

            icon = "☀️";

            dockLabel = "☀️ DAY [N]";

        } else if (hour >= 16.0 && hour < 18.0) {

            phase = "GOLDEN";

            icon = "🌤️";

            dockLabel = "🌤️ PM [N]";

        } else if (hour >= 18.0 && hour < 20.25) {

            phase = "DUSK";

            icon = "🌇";

            dockLabel = "🌇 DUSK [N]";

        } else {

            phase = "NIGHT";

            icon = "🌙";

            dockLabel = "🌙 NIGHT [N]";

        }



        // Progressive Nocturnal Window Lighting Factor (0.0 by day -> rises through dusk/evening -> peaks at 0.92 in deep night 22:30..02:00 -> tapers toward dawn)
        let windowLitFactor = 0.0;
        if (hour >= 22.5 || hour < 2.0) {
            windowLitFactor = 0.92;
        } else if (hour >= 17.5 && hour < 19.5) {
            windowLitFactor = smooth((hour - 17.5) / 2.0) * 0.34;
        } else if (hour >= 19.5 && hour < 22.5) {
            windowLitFactor = 0.34 + smooth((hour - 19.5) / 3.0) * 0.58;
        } else if (hour >= 2.0 && hour < 5.25) {
            windowLitFactor = 0.92 - smooth((hour - 2.0) / 3.25) * 0.50;
        } else if (hour >= 5.25 && hour < 7.15) {
            windowLitFactor = 0.42 * (1.0 - smooth((hour - 5.25) / 1.9));
        }
        return { hour, nightFactor, sunsetFactor, windowLitFactor, phase, icon, dockLabel };

    }



    syncDayNightCycle() {

        if (!this.renderer) return;

        const info = this.getTimePhaseInfo();

        this.renderer.nightFactor = info.nightFactor;

        this.renderer.sunsetFactor = info.sunsetFactor;
        this.renderer.windowLitFactor = info.windowLitFactor;

        this.renderer.nightMode = info.nightFactor >= 0.25;

    }



    toggleRollerSkates() {
        if (!this.player || this.player.dead) return;
        if (this.player.inVehicle) {
            this.addFloatingText(this.player.x, this.player.y - 28, "🛼 EXIT CAR TO SKATE [8]", "#38bdf8");
            return;
        }
        this.player.rollerSkates = !this.player.rollerSkates;
        const on = Boolean(this.player.rollerSkates);
        this.addFloatingText(
            this.player.x,
            this.player.y - 28,
            on ? "🛼 NEON ROLLER-SKATES: ON!" : "👟 ON-FOOT STRIDE",
            on ? "#ff2a85" : "#e2e8f0"
        );
        if (this.audio && typeof this.audio.playBeep === "function") {
            this.audio.playBeep(on ? 784 : 523, 0.06, "triangle", 0.06);
        }
    }

    triggerPlayerGrooveEmote() {
        if (!this.player || this.player.dead || this.player.inVehicle) return;
        const emotes = [
            { label: "💃 MIAMI BOUNCE GROOVE!", color: "#ff2a85" },
            { label: "📸 OCEAN DRIVE SELFIE!", color: "#38bdf8" },
            { label: "🎧 ONLY RAW VIBE!", color: "#fbbf24" },
            { label: "🛼 SOUTH BEACH 360 SPIN!", color: "#2dd4bf" }
        ];
        const nextIdx = ((this.player.emoteStyle === undefined ? -1 : this.player.emoteStyle) + 1) % emotes.length;
        this.player.emoteStyle = nextIdx;
        this.player.emoteTimer = 4.4;
        const spec = emotes[nextIdx];
        this.addFloatingText(this.player.x, this.player.y - 30, spec.label, spec.color);
        if (this.audio && typeof this.audio.playBeep === "function") {
            this.audio.playBeep(660 + nextIdx * 80, 0.06, "sine", 0.05);
        }
    }

    advanceTimeOfDayPhase() {

        const hour = (((this.worldMinutes % 1440) + 1440) % 1440) / 60.0;

        let nextMins = 12 * 60 + 30;

        let banner = "☀️ LEONIDA DAYLIGHT";

        let color = "#fde047";



        if (hour >= 7.5 && hour < 16.0) {

            nextMins = 16 * 60 + 45; // 16:45 Golden Afternoon

            banner = "🌤️ GOLDEN AFTERNOON";

            color = "#fbbf24";

        } else if (hour >= 16.0 && hour < 18.0) {

            nextMins = 18 * 60 + 45; // 18:45 Vice City Sunset

            banner = "🌇 VICE CITY SUNSET";

            color = "#fb7185";

        } else if (hour >= 18.0 && hour < 20.25) {

            nextMins = 22 * 60 + 30; // 22:30 Neon Night

            banner = "🌙 NEON NIGHT MODE";

            color = "#ff2a85";

        } else {

            // From Night or Dawn (hour >= 20.25 || hour < 7.5), jump straight back to bright 12:30 Sunny Daylight!
            nextMins = 12 * 60 + 30;

            banner = "☀️ LEONIDA DAYLIGHT";

            color = "#fde047";

        }



        this.worldMinutes = nextMins;
        const baseSrvMins = (typeof this._lastServerWorldMinutes === "number") ? this._lastServerWorldMinutes : nextMins;
        this.localTimeOffsetMins = ((nextMins - baseSrvMins) % 1440 + 1440) % 1440;

        this.syncDayNightCycle();

        this._lastAnnouncedPhase = this.getTimePhaseInfo().phase;

        const timeMsg = `${banner} (${this.getClockString(true)})`;
        this.addFloatingText(

            this.player.x,

            this.player.y - 30,

            timeMsg,

            color

        );
        if (this.activeInterior) {
            if (!this.interiorPopups) this.interiorPopups = [];
            this.interiorPopups.push({
                x: this.interiorX || 410,
                y: (this.interiorY || 280) - 18,
                text: timeMsg,
                color,
                life: 1.4
            });
        }

    }



    getNSTrafficLightState() {
        // Real-World 3M Opticom Emergency Signal Preemption & SCATS Adaptive Demand Override:
        if (this.signalPreemptionAxis === "NS" && (this.signalPreemptionTimer || 0) > 0) return "GREEN";
        if (this.signalPreemptionAxis === "EW" && (this.signalPreemptionTimer || 0) > 0) return "RED";
        const ph = ((this.trafficLightTimer || 0) % 12.0 + 12.0) % 12.0;
        if (ph < 4.6) return "GREEN";
        if (ph < 6.0) return "AMBER"; // GREEN -> AMBER (Orange) -> RED
        if (ph < 10.6) return "RED";
        return "AMBER";               // RED -> AMBER (Orange) -> GREEN
    }

    getEWTrafficLightState() {
        // Real-World 3M Opticom Emergency Signal Preemption & SCATS Adaptive Demand Override:
        if (this.signalPreemptionAxis === "EW" && (this.signalPreemptionTimer || 0) > 0) return "GREEN";
        if (this.signalPreemptionAxis === "NS" && (this.signalPreemptionTimer || 0) > 0) return "RED";
        const ph = ((this.trafficLightTimer || 0) % 12.0 + 12.0) % 12.0;
        if (ph < 4.6) return "RED";
        if (ph < 6.0) return "AMBER"; // RED -> AMBER (Orange) -> GREEN
        if (ph < 10.6) return "GREEN";
        return "AMBER";               // GREEN -> AMBER (Orange) -> RED
    }

    isNSGreen() {
        return this.getNSTrafficLightState() === "GREEN";
    }

    isEWGreen() {
        return this.getEWTrafficLightState() === "GREEN";
    }



    initWorldEntities() {

        // Vehicles across the 12 Bespoke Regions of the GTA 6 (State of Leonida & Vice City) 256x256x6 Map!

        // Ocean Drive 4-lane boulevard is x = 214.5, 215.5 (SB) & 216.5, 217.5 (NB)

        const parked = [

            // --- A. Ocean Drive & Collins Ave: Keep sidewalks & boardwalks 100% clear of parked vehicles; all exotics, muscle cars & bikes cruise in live road traffic! ---

            { spec: "STINGER_CABRIO", c: 217.5, r: 136.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "TURISMO_CABRIO", c: 214.5, r: 138.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "TULIP_MUSCLE", c: 216.5, r: 143.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", isScurveHero: true },

            { spec: "SUPERBIKE", c: 216.5, r: 141.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "HARLEY_BIKE", c: 215.5, r: 148.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "BANSHEE_GT", c: 217.5, r: 158.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "CHALLENGER_RT", c: 206.5, r: 143.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "PORKA_TURBO", c: 207.5, r: 150.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            // Active moving traffic on Ocean Drive & Collins Ave (never parked stationary in the road!)

            { spec: "SUPERBIKE", c: 216.5, r: 148.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "HARLEY_BIKE", c: 214.5, r: 142.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "STINGER_CABRIO", c: 217.5, r: 152.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "BANSHEE_GT", c: 216.5, r: 145.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "VICE_CAB", c: 215.5, r: 144.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "CHALLENGER_RT", c: 216.5, r: 155.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "MINT_STALLION", c: 214.5, r: 154.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "CITY_BUS", c: 204.5, r: 147.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },



            // --- B. S-Curving Vice Beach Sand & South Wooden Pier (off-road on beach sand & water) ---

            { spec: "MONSTER_BUGGY", c: 468.5, r: 280.5, raw512: true, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },

            { spec: "GATOR_4X4", c: 468.5, r: 300.0, raw512: true, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },

            { spec: "AIRBOAT", c: 250.5, r: 154.0, a: 0, z: 2.0, missionTag: "LANDMARK" },



            // --- C. Española Way & Club Nine1Nine (moving traffic on streets) ---

            { spec: "TURISMO_CABRIO", c: 208.5, r: 106.5, a: 0, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "STRETCH_LIMO", c: 214.5, r: 47.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "PENETRATOR_GT", c: 214.5, r: 50.0, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },



            // --- D. SERA Space Center Restricted Federal Launch Complex 39A (Cape Canaveral compound c=458..480, r=22..44) ---

            { spec: "PANZER_TANK", c: 468.5, r: 27.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "VCPD_CRUISER", c: 461.2, r: 31.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "BOXVILLE_VAN", c: 461.2, r: 38.8, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },



            // --- E. Star Island Mansions & Port of Vice City Cruise Terminal ---

            { spec: "STINGER_CABRIO", c: 172.5, r: 104.5, a: 0, z: 2.0, missionTag: "LANDMARK" },

            { spec: "PENETRATOR_GT", c: 343.5, r: 169.5, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "AIRBOAT", c: 185.5, r: 160.0, a: 0, z: 2.0, missionTag: "LANDMARK" },



            // --- F. Vice City Mambas Open-Air Stadium, Downtown & Golf Club ---

            { spec: "SUPERBIKE", c: 141.5, r: 116.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "MICRO_KART", c: 145.5, r: 53.5, a: 0, z: 2.0, missionTag: "LANDMARK" },



            // --- G. Wynwood, Lake Leonida Gator Island & Mount Kalaga ---

            { spec: "HARLEY_BIKE", c: 116.5, r: 82.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "AIRBOAT", c: 101.5, r: 102.5, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "CAMPER_PICKUP", c: 73.5, r: 76.0, a: 0, z: 2.0, missionTag: "LANDMARK" },

            { spec: "MONSTER_BUGGY", c: 84.5, r: 22.5, a: 0, z: 2.0, missionTag: "LANDMARK" },



            // --- H. Leonida State Penitentiary Yard & Port Gellhorn International Super-Speedway Oval ---

            { spec: "VCPD_CRUISER", c: 59.5, r: 74.5, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "CHALLENGER_RT", c: 84.5, r: 173.2, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "FJORD_FASTBACK", c: 55.2, r: 176.2, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "BANSHEE_GT", c: 58.8, r: 176.2, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "FIRE_TRUCK", c: 63.2, r: 176.2, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },



            // --- I. VCIA International Airport Tarmac & Grassrivers Thrillbilly Mud Park / Keys ---

            { spec: "SUPERBIKE", c: 124.5, r: 301.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "PICKUP_TRUCK", c: 76.5, r: 453.5, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "AIRBOAT", c: 86.0, r: 402.0, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "STINGER_CABRIO", c: 231.0, r: 480.5, a: -Math.PI, z: 2.0, driver: "AI_TRAFFIC", raw512: true },



            // --- J. Extra 512x512 Mega-Map Vehicles across Expanded Vice City & Leonida ---

            { spec: "BANSHEE_GT", c: 446.5, r: 215.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "TURISMO_CABRIO", c: 445.5, r: 280.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "STINGER_CABRIO", c: 395.5, r: 297.5, a: 0, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "CHALLENGER_RT", c: 285.5, r: 215.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "AIRBOAT", c: 120.0, r: 184.0, a: 0.4, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "AIRBOAT", c: 145.0, r: 412.0, a: 0.0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "GATOR_4X4", c: 468.5, r: 219.0, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "MONSTER_BUGGY", c: 468.5, r: 274.0, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            // --- M. Ocean Drive & Collins Ave E-Scooters & BMX Cruisers (100% cruising in road traffic — zero parked on sidewalks or boardwalks!) ---
            { id: "micromob_0", spec: "E_SCOOTER", c: 214.5, r: 145.8, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_1", spec: "BMX_BIKE", c: 215.5, r: 151.8, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_2", spec: "E_SCOOTER", c: 217.5, r: 143.2, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_3", spec: "BMX_BIKE", c: 216.5, r: 152.4, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_4", spec: "E_SCOOTER", c: 215.5, r: 138.0, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_5", spec: "BMX_BIKE", c: 216.5, r: 158.0, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_6", spec: "E_SCOOTER", c: 207.5, r: 146.0, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_7", spec: "E_SCOOTER", c: 217.5, r: 146.8, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_8", spec: "BMX_BIKE", c: 217.5, r: 150.2, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_9", spec: "E_SCOOTER", c: 214.5, r: 149.2, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { id: "micromob_10", spec: "BMX_BIKE", c: 214.5, r: 135.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            // --- N. Drivable water craft moored at the harbors, beaches & piers (z = 2.0 on water surface!) ---
            { id: "boat_speed_0", spec: "SPEEDBOAT", c: 325.0, r: 312.0, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_1", spec: "SPEEDBOAT", c: 105.5, r: 100.2, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_2", spec: "SPEEDBOAT", c: 375.5, r: 121.2, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_3", spec: "SPEEDBOAT", c: 379.5, r: 220.0, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_4", spec: "SPEEDBOAT", c: 425.5, r: 426.0, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_5", spec: "SPEEDBOAT", c: 329.0, r: 496.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_6", spec: "SPEEDBOAT", c: 496.5, r: 224.0, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_7", spec: "SPEEDBOAT", c: 481.2, r: 300.0, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_8", spec: "SPEEDBOAT", c: 339.5, r: 220.0, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_9", spec: "SPEEDBOAT", c: 231.5, r: 478.0, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_0", spec: "JETSKI", c: 327.5, r: 314.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_1", spec: "JETSKI", c: 378.5, r: 121.5, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_2", spec: "JETSKI", c: 382.0, r: 222.5, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_3", spec: "JETSKI", c: 427.5, r: 428.5, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_4", spec: "JETSKI", c: 497.5, r: 228.0, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_5", spec: "JETSKI", c: 497.5, r: 296.0, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_6", spec: "JETSKI", c: 392.0, r: 192.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true }

        ];



        parked.forEach((p, idx) => {

            let vx = (p.raw512 ? p.c : mx256(p.c)) * TILE_SIZE;

            let vy = (p.raw512 ? p.r : my256(p.r)) * TILE_SIZE;

            // No spawned car (parked or moving AI traffic) may sit ON a zebra crosswalk / stop-line tile or inside the junction box:
            // slide it back (up to 3 tiles) along its heading so it waits BEFORE the pedestrian crossing.
            if (this.map && this.map.stopLineMask && this.map.getBlockInfo && !p.wrecked) {
                const hdx = Math.round(Math.cos(p.a || 0)), hdy = Math.round(Math.sin(p.a || 0));
                if (hdx * hdy === 0 && (hdx !== 0 || hdy !== 0)) {
                    for (let back = 0; back < 3; back++) {
                        const ct = Math.floor(vx / TILE_SIZE), cr = Math.floor(vy / TILE_SIZE);
                        const nt = Math.floor((vx + hdx * 30) / TILE_SIZE), nr = Math.floor((vy + hdy * 30) / TILE_SIZE);
                        const onCross = this.map.stopLineMask[cr * MAP_COLS + ct] === 1 || this.map.stopLineMask[nr * MAP_COLS + nt] === 1 ||
                            this.map.getBlockInfo(ct, cr, 1).lid === 25 || this.map.getBlockInfo(nt, nr, 1).lid === 25;
                        if (!onCross) break;
                        const bt = Math.floor((vx - hdx * TILE_SIZE) / TILE_SIZE), br = Math.floor((vy - hdy * TILE_SIZE) / TILE_SIZE);
                        if (this.map.surfaceGround[br * MAP_COLS + bt] !== GROUND_TYPE.ROAD) break;
                        vx -= hdx * TILE_SIZE;
                        vy -= hdy * TILE_SIZE;
                    }
                }
            }

            // Ensure parked scooters/bikes/cars never spawn overlapping an already-placed vehicle (and never shift a driverless parked car onto an active road!)
            for (let shiftTry = 0; shiftTry < 8; shiftTry++) {
                const overlap = this.vehicles.some((other) => Math.hypot(other.x - vx, other.y - vy) < 68);
                if (!overlap) break;
                const candY = vy + (p.driver ? 56 : -56);
                if (!p.driver && this.map && this.map.getGroundTypeAt && this.map.getGroundTypeAt(vx, candY) === GROUND_TYPE.ROAD) {
                    break;
                }
                vy = candY;
            }

            const v = new Vehicle(p.id || `parked_${idx}`, p.spec, vx, vy, p.a);

            v.z = p.z || 2.0;

            if (p.driver) {

                v.driver = p.driver;

            } else {

                v.isStaticParked = true;

            }

            if (p.missionTag) {

                v.missionTag = p.missionTag;

            }

            if (p.wrecked) {

                v.destroyed = true;

                v.hp = 0;

            }

            if (p.isScurveHero) this.scurveHeroCar = v;

            this.vehicles.push(v);

        });



        // Pedestrians walking on Ocean Drive, Lummus Park, Golden-Sand Vice Beach, Ocean Pier & Grassrivers!

        const starterPeds = [

            // Ocean Drive West Sidewalk (x = 213.5) & East Lummus Park Promenade (x = 218.5..220.5) — NEVER on road lanes x = 214..217!

            { c: 213.5, r: 138.4, a: Math.PI * 0.5, type: "civ1" },

            { c: 213.5, r: 141.2, a: -Math.PI * 0.5, type: "civ3" },

            { c: 213.5, r: 144.2, a: Math.PI * 0.5, type: "civ2" },

            { c: 213.5, r: 147.8, a: Math.PI * 0.5, type: "civ0" },

            { c: 213.5, r: 151.8, a: -Math.PI * 0.5, type: "civ0" },

            { c: 213.5, r: 155.2, a: -Math.PI * 0.5, type: "gang" },

            { c: 213.5, r: 158.6, a: Math.PI * 0.5, type: "civ2" },

            { c: 218.5, r: 140.5, a: Math.PI * 0.5, type: "vc_tommy" },

            { c: 221.5, r: 144.8, a: -Math.PI * 0.5, type: "bikini_pink" },

            { c: 218.5, r: 148.6, a: Math.PI * 0.5, type: "vc_crockett" },

            { c: 221.5, r: 152.4, a: -Math.PI * 0.5, type: "vc_hawaiian_red" },

            { c: 218.5, r: 156.8, a: Math.PI * 0.5, type: "vc_jogger" },

            { c: 221.5, r: 142.5, a: Math.PI * 0.5, type: "g2_civ_aqua" },

            { c: 218.5, r: 145.5, a: Math.PI * 0.5, type: "bikini_cyan" },

            { c: 221.5, r: 150.2, a: -Math.PI * 0.5, type: "vc_tourist" },

            { c: 218.5, r: 154.5, a: -Math.PI * 0.5, type: "g2_civ_pink" },

            { c: 221.5, r: 158.2, a: Math.PI * 0.5, type: "vc_tubbs" },

            // Lummus Park Ocean Drive East Promenade Rollerbladers & Kids (c = 448.5 raw512, gliding along the Ocean Drive promenade!)
            { c: 448.5, r: 222.0, raw512: true, a: Math.PI * 0.5,  type: "vc_jogger",     isRollerblader: true },
            { c: 448.5, r: 225.2, raw512: true, a: Math.PI * 0.5,  type: "kid_skater",    isRollerblader: true, isChild: true },
            { c: 448.5, r: 228.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_cyan",   isRollerblader: true },
            { c: 448.5, r: 231.5, raw512: true, a: -Math.PI * 0.5, type: "kid_girl_pink", isChild: true },
            { c: 448.5, r: 234.0, raw512: true, a: Math.PI * 0.5,  type: "g2_civ_pink",   isRollerblader: true },
            { c: 448.5, r: 237.2, raw512: true, a: Math.PI * 0.5,  type: "kid_boy_cap",   isChild: true },
            { c: 448.5, r: 240.5, raw512: true, a: -Math.PI * 0.5, type: "vc_tourist",    isRollerblader: true },
            { c: 448.5, r: 243.5, raw512: true, a: -Math.PI * 0.5, type: "kid_beach",     isChild: true },
            { c: 448.5, r: 246.0, raw512: true, a: Math.PI * 0.5,  type: "bikini_pink",   isRollerblader: true },
            { c: 448.5, r: 252.5, raw512: true, a: -Math.PI * 0.5, type: "g2_civ_aqua",   isRollerblader: true },

            // Ocean Drive & Lummus Park Kids / Teenagers with families
            { c: 213.5, r: 146.2, a: Math.PI * 0.5,  type: "kid_boy_cap",   isChild: true },
            { c: 213.5, r: 150.1, a: -Math.PI * 0.5, type: "kid_girl_pink", isChild: true },
            { c: 218.5, r: 147.2, a: Math.PI * 0.5,  type: "kid_skater",    isRollerblader: true, isChild: true },
            { c: 221.5, r: 151.0, a: -Math.PI * 0.5, type: "kid_beach",     isChild: true },
            { c: 222.8, r: 145.8, a: Math.PI * 0.5,  type: "kid_beach",     isChild: true, missionTag: "BEACH" },
            { c: 223.8, r: 150.8, a: -Math.PI * 0.5, type: "kid_girl_pink", isChild: true, missionTag: "BEACH" },



            // Collins Ave Sidewalks (x = 203.5 West sidewalk & x = 208.5 East sidewalk — NEVER on road lanes x = 204..207!)

            { c: 203.5, r: 143.5, a: Math.PI * 0.5, type: "civ1" },

            { c: 203.5, r: 149.5, a: -Math.PI * 0.5, type: "civ0" },

            { c: 203.5, r: 145.5, a: Math.PI * 0.5, type: "civ2" },

            { c: 208.5, r: 152.5, a: -Math.PI * 0.5, type: "civ3" },

            { c: 208.5, r: 138.5, a: 0, type: "civ1" },

            { c: 211.5, r: 153.5, a: Math.PI, type: "gang" },



            // Golden-Sand Vice Beach Bikini Women, Baywatch Lifeguards & Surfers (x = 221.5..240.5, y = 138..162)

            { c: 221.8, r: 141.5, a: Math.PI * 0.5,  type: "bikini_pink",   missionTag: "BEACH" },

            { c: 222.5, r: 144.8, a: -Math.PI * 0.5, type: "bikini_cyan",   missionTag: "BEACH" },

            { c: 221.8, r: 147.2, a: Math.PI * 0.5,  type: "bikini_yellow", missionTag: "BEACH" },

            { c: 223.2, r: 149.5, a: -Math.PI * 0.5, type: "bikini_red",    missionTag: "BEACH" },

            { c: 222.2, r: 152.0, a: Math.PI * 0.5,  type: "bikini_white",  missionTag: "BEACH" },

            { c: 225.2, r: 143.5, a: -Math.PI * 0.5, type: "bikini_pink",   missionTag: "BEACH" },

            { c: 226.4, r: 146.8, a: Math.PI * 0.5,  type: "surfer_guy",    missionTag: "BEACH" },

            { c: 225.8, r: 149.8, a: -Math.PI * 0.5, type: "bikini_cyan",   missionTag: "BEACH" },

            { c: 226.8, r: 153.2, a: Math.PI * 0.5,  type: "bikini_yellow", missionTag: "BEACH" },

            { c: 225.5, r: 156.5, a: -Math.PI * 0.5, type: "bikini_red",    missionTag: "BEACH" },

            { c: 228.5, r: 145.5, a: Math.PI * 0.5,  type: "bikini_white",  missionTag: "BEACH" },

            { c: 229.5, r: 150.5, a: -Math.PI * 0.5, type: "bikini_pink",   missionTag: "BEACH" },

            { c: 468.8, r: 284.8, a: Math.PI * 0.5,  type: "bikini_cyan",   missionTag: "BEACH", raw512: true },

            { c: 470.5, r: 288.2, a: -Math.PI * 0.5, type: "bikini_yellow", missionTag: "BEACH", raw512: true },

            { c: 472.2, r: 286.0, a: Math.PI * 0.5,  type: "bikini_red",    missionTag: "BEACH", raw512: true },

            { c: 473.5, r: 289.5, a: -Math.PI * 0.5, type: "bikini_pink",   missionTag: "BEACH", raw512: true },

            { c: 238.5, r: 152.2, a: Math.PI * 0.5,  type: "surfer_guy",    missionTag: "BEACH" },

            { c: 239.8, r: 155.5, a: -Math.PI * 0.5, type: "bikini_white",  missionTag: "BEACH" },

            { c: 238.5, r: 154.0, a: 0,              type: "bikini_pink",   missionTag: "BEACH" },

            { c: 243.5, r: 154.0, a: Math.PI,        type: "bikini_cyan",   missionTag: "BEACH" },



            // North Vice Beach & Biscayne Bay / Star Island Bikini Beachgoers

            { c: 465.5, r: 85.5,  a: Math.PI * 0.5,  type: "bikini_pink",   missionTag: "BEACH", raw512: true },

            { c: 225.5, r: 49.5,  a: -Math.PI * 0.5, type: "bikini_cyan",   missionTag: "BEACH" },

            { c: 348.5, r: 168.5, a: Math.PI * 0.5,  type: "bikini_yellow", missionTag: "BEACH", raw512: true },

            { c: 348.5, r: 179.5, a: -Math.PI * 0.5, type: "bikini_pink",   missionTag: "BEACH", raw512: true },

            { c: 353.5, r: 168.5, a: Math.PI * 0.5,  type: "bikini_white",  missionTag: "BEACH", raw512: true },

            // Open Vice Beach Golden-Sand Strollers East of the Coastal Dunes (raw512 c = 468.5..475.5, r = 214..320)
            { c: 468.5, r: 216.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_pink",      missionTag: "BEACH" },
            { c: 472.5, r: 224.5, raw512: true, a: -Math.PI * 0.5, type: "surfer_guy",       missionTag: "BEACH" },
            { c: 469.5, r: 233.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_cyan",      missionTag: "BEACH" },
            { c: 474.5, r: 242.5, raw512: true, a: -Math.PI * 0.5, type: "beach_guy_red",    missionTag: "BEACH" },
            { c: 468.5, r: 252.5, raw512: true, a: Math.PI * 0.5,  type: "vc_bodybuilder",   missionTag: "BEACH" },
            { c: 473.5, r: 262.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_red",       missionTag: "BEACH" },
            { c: 470.5, r: 274.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_white",     missionTag: "BEACH" },
            { c: 474.5, r: 294.5, raw512: true, a: -Math.PI * 0.5, type: "beach_guy_yellow", missionTag: "BEACH" },
            { c: 469.5, r: 306.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_pink",      missionTag: "BEACH" },
            { c: 472.5, r: 318.5, raw512: true, a: -Math.PI * 0.5, type: "beach_guy_lime",   missionTag: "BEACH" },

            // Extra Ocean Drive Sidewalk Crowd (c = 443.5 West Art Deco Hotel Sidewalk & c = 448.5 East Lummus Park Sidewalk)
            { c: 443.5, r: 218.5, raw512: true, a: Math.PI * 0.5,  type: "beach_guy_red" },
            { c: 443.5, r: 221.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_pink" },
            { c: 443.5, r: 224.5, raw512: true, a: Math.PI * 0.5,  type: "surfer_guy" },
            { c: 443.5, r: 227.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_white" },
            { c: 443.5, r: 230.5, raw512: true, a: Math.PI * 0.5,  type: "beach_guy_yellow" },
            { c: 443.5, r: 233.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_cyan" },
            { c: 443.5, r: 236.5, raw512: true, a: Math.PI * 0.5,  type: "beach_guy_lime" },
            { c: 443.5, r: 239.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_red" },
            { c: 443.5, r: 242.5, raw512: true, a: Math.PI * 0.5,  type: "vc_bodybuilder" },
            { c: 443.5, r: 245.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_yellow" },
            { c: 448.5, r: 220.5, raw512: true, a: Math.PI * 0.5,  type: "vc_jogger" },
            { c: 448.5, r: 223.5, raw512: true, a: -Math.PI * 0.5, type: "surfer_guy" },
            { c: 448.5, r: 226.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_red" },
            { c: 448.5, r: 229.5, raw512: true, a: -Math.PI * 0.5, type: "beach_guy_red" },
            { c: 448.5, r: 232.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_white" },
            { c: 448.5, r: 235.5, raw512: true, a: -Math.PI * 0.5, type: "vc_bodybuilder" },
            { c: 448.5, r: 238.5, raw512: true, a: Math.PI * 0.5,  type: "bikini_pink" },
            { c: 448.5, r: 241.5, raw512: true, a: -Math.PI * 0.5, type: "beach_guy_yellow" },

            // Grassrivers Everglades Alligators near Thrillbilly Mud Park & Swamp Islands

            { c: 46.0, r: 222.0, a: 0.4, type: "civ0", kind: "GATOR", missionTag: "BEACH" },

            { c: 74.0, r: 224.0, a: -0.8, type: "civ0", kind: "GATOR", missionTag: "BEACH" }

        ];

        starterPeds.forEach((sp, idx) => {
            const isJoggerInit = Boolean(sp.isJogger || sp.type === "vc_jogger");
            const isSkateInit = Boolean(sp.isSkateboarder || (!isJoggerInit && !sp.isRollerblader && sp.type === "beach_guy_yellow" && (idx % 3) === 0));
            const initWalkSpd = sp.dead
                ? 0
                : (sp.isRollerblader ? (45 + (idx % 5)) : (isSkateInit ? (42 + (idx % 5)) : (isJoggerInit ? (39 + (idx % 5)) : (sp.isChild ? (21 + (idx % 3)) : (22 + (idx % 5))))));

            const pedObj = new Pedestrian({

                id: `ped_init_${idx}`,

                x: (sp.raw512 ? sp.c : mx256(sp.c)) * TILE_SIZE,

                y: (sp.raw512 ? sp.r : my256(sp.r)) * TILE_SIZE,

                z: 2.0,

                angle: sp.a,

                speed: initWalkSpd,

                kind: sp.kind || "CIVILIAN",

                g24Type: sp.type,

                missionTag: sp.missionTag || null,

                shirtColor: "#06b6d4",

                hp: sp.dead ? 0 : 35,

                dead: Boolean(sp.dead),

                revived: Boolean(sp.revived),

                panicTimer: 0,

                turnSeed: idx + 1,

                targetBx: null,

                targetBy: null

            });
            pedObj.baseWalkSpeed = initWalkSpd || 24;
            if (sp.isRollerblader) pedObj.isRollerblader = true;
            if (isSkateInit) pedObj.isSkateboarder = true;
            if (isJoggerInit) {
                pedObj.isJogger = true;
                pedObj.carryProp = sp.carryProp || "JOGGER_GEAR";
            } else if (sp.carryProp) {
                pedObj.carryProp = sp.carryProp;
            } else if (sp.type === "surfer_guy" && (idx % 2) === 0) {
                pedObj.carryProp = "SURFBOARD";
            } else if (sp.type === "beach_guy_red" && (idx % 3) === 0) {
                pedObj.carryProp = "BOOMBOX";
            }
            if (sp.hasDog) {
                pedObj.hasDog = true;
                pedObj.dogBreed = sp.dogBreed || "GOLDEN";
            }
            if (sp.isChild || (sp.type && sp.type.startsWith("kid_"))) pedObj.isChild = true;
            this.peds.push(pedObj);

        });



        // Spawn the Iconic GTA 1 "GOURANGA!" Chain of 7 Saffron-Robed Monks marching in single file along Lummus Park / Ocean Drive!

        this.spawnMonkChain();

        // If the 512x512 CMP map is already loaded (e.g., on restartGame), immediately seed curbside sidewalk parked vehicles!
        if (this.map && this.map.cmpLoaded) {
            this.seedCityCurbsideParkedVehicles();
        }

    }



    // Water-only craft (jet-skis, speedboats) must float at z = 2.0 on the water surface and moor near shorelines/piers
    // so the player can easily board them from the beach or dock.
    snapWaterCraftToWater() {
        if (!this.map || typeof this.map.isWaterAtPixel !== "function" || !Array.isArray(this.vehicles)) return;
        const isOpenWater = (x, y) => {
            for (const [ox, oy] of [[0, 0], [16, 0], [-16, 0], [0, 14], [0, -14]]) {
                if (!this.map.isWaterAtPixel(x + ox, y + oy)) return false;
            }
            return true;
        };
        const isNearDryShore = (x, y) => {
            for (let r = 24; r <= 72; r += 16) {
                for (let k = 0; k < 12; k++) {
                    const ang = (k / 12) * Math.PI * 2;
                    if (!this.map.isWaterAtPixel(x + Math.cos(ang) * r, y + Math.sin(ang) * r)) return true;
                }
            }
            return false;
        };
        for (const v of this.vehicles) {
            if (v.waterOnly || v.specKey === "AIRBOAT" || v.amphibious) {
                v.z = Math.max(2.0, v.z || 2.0);
            }
            if (!v.waterOnly || v.driver || v.destroyed) continue;
            if (isOpenWater(v.x, v.y) && isNearDryShore(v.x, v.y)) continue;
            let found = null;
            let fallbackWater = isOpenWater(v.x, v.y) ? { x: v.x, y: v.y } : null;
            for (let rad = 12; rad <= TILE_SIZE * 28 && !found; rad += 12) {
                for (let k = 0; k < 20; k++) {
                    const ang = (k / 20) * Math.PI * 2;
                    const tx = v.x + Math.cos(ang) * rad;
                    const ty = v.y + Math.sin(ang) * rad;
                    if (isOpenWater(tx, ty) && !this.vehicles.some((o) => o !== v && Math.hypot(o.x - tx, o.y - ty) < 40)) {
                        if (!fallbackWater) fallbackWater = { x: tx, y: ty };
                        if (isNearDryShore(tx, ty)) {
                            found = { x: tx, y: ty };
                            break;
                        }
                    }
                }
            }
            const targetSpot = found || fallbackWater;
            if (targetSpot) {
                v.x = targetSpot.x;
                v.y = targetSpot.y;
                v.z = 2.0;
                v.vx = 0;
                v.vy = 0;
                v.speed = 0;
            }
        }
    }

    onCmpLoaded(meta) {
        if (this._cmpLoadedApplied) return;
        this._cmpLoadedApplied = true;

        this.snapWaterCraftToWater();

        // 1. Spawn authentic startup_cars from the binary map on single-direction straight lanes!

        if (meta && Array.isArray(meta.startup_cars)) {

            const specPool = [

                "HARLEY_BIKE",

                "SUPERBIKE",

                "E_SCOOTER",

                "BMX_BIKE",

                "VICE_CAB",

                "BANSHEE_GT",

                "PENETRATOR_GT",

                "PORKA_TURBO",

                "COSSIE_RS",

                "STINGER_CABRIO",

                "TURISMO_CABRIO",

                "MINT_STALLION",

                "SILVER_ROADSTER",

                "VICE_CHEETAH",

                "TULIP_MUSCLE",

                "CHALLENGER_RT",

                "FJORD_FASTBACK",

                "REGAL_SEDAN",

                "BEETLE_BUG",

                "MUNDANO_WAGON",

                "LELAND_SEDAN",

                "MICRO_KART",

                "MONSTER_BUGGY",

                "GATOR_4X4",

                "PICKUP_TRUCK",

                "CAMPER_PICKUP",

                "BOXVILLE_VAN",

                "HOTDOG_VAN",

                "STRETCH_LIMO",

                "CITY_BUS",

                "TOUR_COACH",

                "FLATBED_TRUCK",

                "TANKER_RIG"

            ];

            const count = Math.min(72, meta.startup_cars.length);

            for (let i = 0; i < count; i++) {

                const sc = meta.startup_cars[i];

                const bx = Math.floor(sc.x);

                const by = Math.floor(sc.y);

                if (bx < 2 || bx >= 510 || by < 2 || by >= 510) continue;

                if (this.map.surfaceGround && this.map.surfaceGround[by * 512 + bx] !== GROUND_TYPE.ROAD) continue;

                if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;

                const lidZ1 = this.map.getBlockInfo ? this.map.getBlockInfo(bx, by, 1).lid : 0;

                if (lidZ1 === 25) continue;

                const vx = (bx + 0.5) * TILE_SIZE;

                const vy = (by + 0.5) * TILE_SIZE;

                let tooClose = false;

                for (const other of this.vehicles) {

                    if (Math.hypot(other.x - vx, other.y - vy) < 120) {

                        tooClose = true;

                        break;

                    }

                }

                if (tooClose) continue;

                const vz = this.map.getHeightAtPixel(vx, vy, 4.0);

                const spec = specPool[i % specPool.length];

                const rawAng = sc.ang !== undefined ? sc.ang : (((sc.rot || 0) / 1024.0) * Math.PI * 2);

                const alignedAng = this.map.getAlignedRoadAngle(bx, by, rawAng, vz);

                const v = new Vehicle(`cmp_car_${i}`, spec, vx, vy, alignedAng);

                v.z = vz;

                v.driver = (spec === "MEDIC_AMBULANCE" || spec === "FIRE_TRUCK") ? "AI_EMERGENCY" : "AI_TRAFFIC";

                this.vehicles.push(v);

            }

        }



        // 1B. Spawn real interactive 1:1 scale drivable luxury vehicles in 3D estate driveways (WorldObjectEngine)

        if (this.map && this.map.objectEngine) {

            this.map.objectEngine.spawnPrefabVehicles(this);

        }

        this.snapWaterCraftToWater();



        // 2. Refresh exact 3D elevation z & reset AI lane state once binary map is loaded

        this.player.z = this.map.getHeightAtPixel(this.player.x, this.player.y, 4.0);

        if (this.jason) {

            this.jason.z = this.map.getHeightAtPixel(this.jason.x, this.jason.y, 4.0);

        }

        const czList = (this.map && this.map.objectEngine && Array.isArray(this.map.objectEngine.clearZones))
            ? this.map.objectEngine.clearZones
            : [];
        const beachStructs = [
            ...(this.map && Array.isArray(this.map.beachProps) ? this.map.beachProps : []),
            ...(this.map && Array.isArray(this.map.tikiBars) ? this.map.tikiBars : []),
            ...(this.map && Array.isArray(this.map.muscleBeachGyms) ? this.map.muscleBeachGyms : []),
            ...(this.map && Array.isArray(this.map.beachVolleyballCourts) ? this.map.beachVolleyballCourts : []),
            ...(this.map && Array.isArray(this.map.beachParties) ? this.map.beachParties : [])
        ];
        const hitsClearZone = (px, py) =>
            czList.some(cz => Math.abs(cz.x - px) < 96 && Math.abs(cz.y - py) < 96 && Math.hypot(cz.x - px, cz.y - py) < Math.max(54, cz.r || 54)) ||
            beachStructs.some(bs => Math.abs(bs.x - px) < 80 && Math.abs(bs.y - py) < 80 && Math.hypot(bs.x - px, bs.y - py) < 76);

        for (const v of this.vehicles) {
            const isWaterVeh = Boolean(
                v.waterOnly ||
                v.specKey === "AIRBOAT" ||
                (v.amphibious && this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(v.x, v.y))
            );
            v.z = isWaterVeh
                ? Math.max(2.0, this.map.getHeightAtPixel(v.x, v.y, 4.0, false))
                : this.map.getHeightAtPixel(v.x, v.y, 4.0);

            let bx = Math.floor(v.x / TILE_SIZE);

            let by = Math.floor(v.y / TILE_SIZE);

            const nav = this.map.getNavigationBlock(bx, by, v.z);

            if (v.driver === "AI_TRAFFIC" || v.driver === "AI_EMERGENCY") {

                if ((nav && nav.groundType !== GROUND_TYPE.ROAD) || (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by))) {

                    for (let r = 1; r <= 6; r++) {

                        let foundRoad = false;

                        for (let dy = -r; dy <= r && !foundRoad; dy++) {

                            for (let dx = -r; dx <= r && !foundRoad; dx++) {

                                if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx + dx, by + dy)) continue;

                                const nb = this.map.getNavigationBlock(bx + dx, by + dy, v.z);

                                if (nb && nb.groundType === GROUND_TYPE.ROAD) {

                                    bx += dx;

                                    by += dy;

                                    foundRoad = true;

                                }

                            }

                        }

                        if (foundRoad) break;

                    }

                }

                v.x = (bx + 0.5) * TILE_SIZE;

                v.y = (by + 0.5) * TILE_SIZE;

                v.angle = this.map.getAlignedRoadAngle(bx, by, v.angle, v.z);

                nudgeVehicleOffCrosswalk(this.map, v);

                // Ensure no two AI_TRAFFIC vehicles snap onto the exact same road tile at startup
                for (let shiftTry = 0; shiftTry < 8; shiftTry++) {
                    const hitOther = this.vehicles.some((other) => other !== v && Math.hypot(other.x - v.x, other.y - v.y) < ((v.w || 62) + (other.w || 62)) * 0.52 + 24);
                    if (!hitOther) break;
                    const fwdX = Math.cos(v.angle);
                    const fwdY = Math.sin(v.angle);
                    const candX = v.x + fwdX * TILE_SIZE;
                    const candY = v.y + fwdY * TILE_SIZE;
                    const cbx = Math.floor(candX / TILE_SIZE);
                    const cby = Math.floor(candY / TILE_SIZE);
                    const nb = this.map.getNavigationBlock(cbx, cby, v.z);
                    if (nb && nb.groundType === GROUND_TYPE.ROAD) {
                        v.x = (cbx + 0.5) * TILE_SIZE;
                        v.y = (cby + 0.5) * TILE_SIZE;
                    } else {
                        v.y += (shiftTry % 2 === 0 ? 1 : -1) * TILE_SIZE;
                    }
                }

                v.steerAngleRad = 0;

                v.angularVelocity = 0;

                v.aiBlockX = -1;

                v.aiBlockY = -1;

                v.aiChosenDir = null;

                v.aiTurnedInIntersection = false;

            } else if (!v.driver) {

                if (nav && nav.groundType === GROUND_TYPE.ROAD && !v.isCurbParked && !v.isStaticParked) {
                    // Never snap a road vehicle onto a pedestrian sidewalk: convert it to live moving traffic!
                    v.driver = "AI_TRAFFIC";
                    v.isStaticParked = false;
                    v.x = (bx + 0.5) * TILE_SIZE;
                    v.y = (by + 0.5) * TILE_SIZE;
                    v.angle = this.map.getAlignedRoadAngle(bx, by, v.angle, v.z);
                } else if (v.missionTag !== "LANDMARK" && !v.isCurbParked && hitsClearZone(v.x, v.y)) {

                    // Never leave a driverless parked car underneath a 3D billboard/landmark or overlapping another parked vehicle!

                    for (let r = 1; r <= 4; r++) {

                        let foundCurb = false;

                        for (let dy = -r; dy <= r && !foundCurb; dy++) {

                            for (let dx = -r; dx <= r && !foundCurb; dx++) {

                                const cbx = bx + dx;
                                const cby = by + dy;
                                // Never shift parked cars onto narrow Ocean Drive sidewalks or Lummus Park / Coastal Dune belts
                                if (cbx === 443 || (cbx >= 448 && cbx <= 464) || (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(cbx, cby))) continue;

                                const nb = this.map.getNavigationBlock(cbx, cby, v.z);

                                if (nb && (nb.groundType === GROUND_TYPE.PAWEMENT || nb.groundType === GROUND_TYPE.FIELD)) {

                                    const candX = (cbx + 0.5) * TILE_SIZE;

                                    const candY = (cby + 0.5) * TILE_SIZE;

                                    if (typeof this.map.isInsideLivingEventZone === "function" && this.map.isInsideLivingEventZone(candX, candY, 24)) {

                                        continue;

                                    }

                                    if (hitsClearZone(candX, candY)) {

                                        continue;

                                    }

                                    const hitsOtherVeh = this.vehicles.some(other => other !== v && Math.hypot(other.x - candX, other.y - candY) < 56);
                                    if (hitsOtherVeh) continue;

                                    v.x = candX;

                                    v.y = candY;

                                    foundCurb = true;

                                }

                            }

                        }

                        if (foundCurb) break;

                    }

                }

            }

        }

        for (const ped of this.peds) {

            ped.z = this.map.getHeightAtPixel(ped.x, ped.y, 4.0);

            if (ped.kind === "CIVILIAN") {

                const bx = Math.floor(ped.x / TILE_SIZE);

                const by = Math.floor(ped.y / TILE_SIZE);

                const nav = this.map.getNavigationBlock(bx, by, ped.z);

                if (nav && nav.groundType !== GROUND_TYPE.PAWEMENT && nav.groundType !== GROUND_TYPE.FIELD) {

                    for (let r = 1; r <= 4; r++) {

                        let snapped = false;

                        for (let dy = -r; dy <= r && !snapped; dy++) {

                            for (let dx = -r; dx <= r && !snapped; dx++) {

                                const nb = this.map.getNavigationBlock(bx + dx, by + dy, ped.z);

                                if (nb && (nb.groundType === GROUND_TYPE.PAWEMENT || nb.groundType === GROUND_TYPE.FIELD)) {

                                    ped.x = (bx + dx + 0.5) * TILE_SIZE;

                                    ped.y = (by + dy + 0.5) * TILE_SIZE;

                                    snapped = true;

                                }

                            }

                        }

                        if (snapped) break;

                    }

                }

            }

            ped.targetBx = null;

            ped.targetBy = null;

        }

        this.populateNearbySidewalks(this.player.x, this.player.y, 96, 14);

        this.seedPenitentiaryInmatesAndGuards();

        this.seedCityCurbsideParkedVehicles();

        this.currentDistrict = this.map.getDistrictName(this.player.x, this.player.y);

        if (!this._hasEnteredModal) {
            this.districtPopupTimer = 0;
        }

        this.worldReady = true;
        this._resetLoopClock = true;
        if (
            this.creationEngine &&
            typeof this.creationEngine.loadFromLocalStorage === "function" &&
            !this.creationEngine._serverCreationSynced &&
            !Array.isArray(this.creationEngine._pendingAuthoritativeOps)
        ) {
            this.creationEngine.loadFromLocalStorage();
        }
        if (this.net && typeof this.net.onWorldReady === "function") {
            this.net.onWorldReady();
        }

        if (this._pendingStartGame) {
            this._pendingStartGame = false;
            setTimeout(() => {
                this._resetLoopClock = true;
                this.startGame();
            }, 32);
        }

    }



    seedCityCurbsideParkedVehicles() {
        if (!this.map || !this.map.cmpLoaded || !Array.isArray(this.map.curbParkingBays)) return;
        // Remove any previously seeded curb-parked vehicles before re-seeding
        if (Array.isArray(this.vehicles)) {
            this.vehicles = this.vehicles.filter(v => !v.isCurbParked);
        } else {
            this.vehicles = [];
        this._cmpLoadedApplied = false;
        }

        const bays = this.map.curbParkingBays;
        for (let i = 0; i < bays.length; i++) {
            const bay = bays[i];
            if (!bay || !bay.specKey || bay.emptyStall) continue;
            // Ensure no overlap with player or existing vehicles (hero cars, estate cars, traffic)
            if (this.player && Math.hypot(this.player.x - bay.x, this.player.y - bay.y) < 42) continue;
            let occupied = false;
            for (let j = 0; j < this.vehicles.length; j++) {
                const other = this.vehicles[j];
                const minDist = (other.driver === "AI_TRAFFIC" || other.driver === "AI_EMERGENCY") ? 36 : 52;
                if (Math.hypot(other.x - bay.x, other.y - bay.y) < minDist) {
                    occupied = true;
                    break;
                }
            }
            if (occupied) continue;

            const v = new Vehicle(`curb_park_${i}`, bay.specKey, bay.x, bay.y, bay.angle);
            v.z = bay.z || 2.0;
            v.driver = null;
            v.isStaticParked = true;
            v.isCurbParked = true;
            v.curbBayIndex = i;
            if (typeof bay.remapIdx === "number") v.remapIdx = bay.remapIdx;
            if (bay.heroVariant) v.heroVariant = bay.heroVariant;
            v.speed = 0;
            v.vx = 0;
            v.vy = 0;
            this.vehicles.push(v);
        }
    }



    seedPenitentiaryInmatesAndGuards() {

        if (!this.map || !this.map.cmpLoaded) return;

        // Pre-seed interactive Orange-Jumpsuit Prison Inmates & Correctional Officers across all courtyards of Leonida State Penitentiary (c=57..67, r=78..144)

        const inmateSpots = [
            [58.5, 78.5], [64.5, 78.5], [58.5, 81.5], [65.5, 81.5], [58.5, 85.5], [65.5, 85.5],
            [58.5, 89.5], [65.5, 89.5], [58.5, 92.5], [65.5, 92.5],
            [58.5, 97.5], [60.5, 97.5], [61.5, 98.5], [63.5, 97.5], [65.5, 97.5], [59.5, 101.5], [63.5, 101.5],
            [58.5, 106.5], [65.5, 106.5], [59.5, 110.5], [62.5, 111.5], [65.5, 110.5],
            [58.5, 114.5], [64.5, 114.5], [60.5, 120.5], [63.5, 120.5], [60.5, 126.5], [63.5, 126.5],
            [59.5, 136.5], [61.5, 141.5], [63.5, 141.5]
        ];

        for (let i = 0; i < inmateSpots.length; i++) {

            const [bx, by] = inmateSpots[i];

            const px = bx * TILE_SIZE;

            const py = by * TILE_SIZE;

            const pz = this.map.getHeightAtPixel(px, py, 4.0);

            this.peds.push(new Pedestrian({
                id: `pris_inmate_${i}`,

                x: px,

                y: py,

                z: pz,

                angle: (i % 4) * Math.PI * 0.5,

                speed: 32 + (i % 5) * 2,

                kind: "CIVILIAN",

                g24Type: "g2_prisoner",

                g2Remapped: true,

                missionTag: "PRISONER",

                shirtColor: "#ff6608",

                hp: 45,

                dead: false,

                panicTimer: 0,

                turnSeed: i + 101

            }));

        }

        const guardSpots = [
            [60.5, 77.6], [63.2, 77.6], [61.5, 84.5], [66.5, 96.5],
            [60.6, 104.2], [63.4, 104.2], [66.5, 112.5], [58.5, 123.5], [65.5, 139.5]
        ];

        for (let g = 0; g < guardSpots.length; g++) {

            const [bx, by] = guardSpots[g];

            const px = bx * TILE_SIZE;

            const py = by * TILE_SIZE;

            const pz = this.map.getHeightAtPixel(px, py, 4.0);

            this.peds.push(new Pedestrian({
                id: `pris_guard_${g}`,

                x: px,

                y: py,

                z: pz,

                angle: (g % 2 === 0) ? Math.PI * 0.5 : -Math.PI * 0.5,

                speed: 30,

                kind: "COP",

                g24Type: (g % 2 === 0) ? "g2_swat" : "police",

                missionTag: "PRISON_GUARD",

                copWeapon: (g % 2 === 0) ? "SHOTGUN" : "PISTOL",

                shirtColor: "#1e3a8a",

                hp: 115,

                dead: false,

                panicTimer: 0,

                turnSeed: g + 201

            }));

        }

        // Seed real interactive VCIA Airport & SERA Spaceport Checkpoint Officers
        if (this.map.airportCompound && Array.isArray(this.map.airportCompound.patrolGuards)) {
            for (let i = 0; i < this.map.airportCompound.patrolGuards.length; i++) {
                const pg = this.map.airportCompound.patrolGuards[i];
                const pz = this.map.getHeightAtPixel(pg.x, pg.y, 4.0);
                this.peds.push(new Pedestrian({
                    id: `vcia_guard_${i}`,
                    x: pg.x,
                    y: pg.y,
                    z: pz,
                    angle: (i % 2 === 0) ? Math.PI * 0.5 : 0,
                    speed: 28,
                    kind: "COP",
                    g24Type: (i % 2 === 0) ? "police" : "g2_swat",
                    missionTag: "AIRPORT_GUARD",
                    copWeapon: "PISTOL",
                    shirtColor: "#1e3a8a",
                    hp: 105,
                    dead: false,
                    panicTimer: 0,
                    turnSeed: i + 301
                }));
            }
        }
        if (this.map.seraCompound && Array.isArray(this.map.seraCompound.patrolGuards)) {
            for (let i = 0; i < this.map.seraCompound.patrolGuards.length; i++) {
                const pg = this.map.seraCompound.patrolGuards[i];
                const pz = this.map.getHeightAtPixel(pg.x, pg.y, 4.0);
                this.peds.push(new Pedestrian({
                    id: `sera_guard_${i}`,
                    x: pg.x,
                    y: pg.y,
                    z: pz,
                    angle: (i % 2 === 0) ? Math.PI * 0.5 : 0,
                    speed: 28,
                    kind: "COP",
                    g24Type: (i % 2 === 0) ? "g2_swat" : "police",
                    missionTag: "SERA_GUARD",
                    copWeapon: "UZI",
                    shirtColor: "#1e3a8a",
                    hp: 120,
                    dead: false,
                    panicTimer: 0,
                    turnSeed: i + 401
                }));
            }
        }

        // Seed real stealable Outlaw Biker Rally Choppers (HARLEY_BIKE)
        if (this.map.industrialAndParkDetails && Array.isArray(this.map.industrialAndParkDetails.bikerRallies) && typeof Vehicle === "function") {
            const rallies = this.map.industrialAndParkDetails.bikerRallies;
            for (let ri = 0; ri < rallies.length; ri++) {
                const br = rallies[ri];
                const bz = br.z || 2.0;
                for (let bi = 0; bi < br.count; bi++) {
                    const bx = br.x + (bi - (br.count - 1) * 0.5) * 20;
                    const by = br.y;
                    const vid = `parked_rally_${ri}_${bi}`;
                    if (!this.vehicles.some((v) => v.id === vid)) {
                        const bike = new Vehicle(vid, "HARLEY_BIKE", bx, by, 0.65);
                        bike.z = bz;
                        bike.driver = null;
                        bike.isStaticParked = true;
                        bike.speed = 0;
                        this.vehicles.push(bike);
                    }
                }
            }
        }

    }



    populateNearbySidewalks(centerX, centerY, targetCount = 72, radiusBlocks = 14) {

        if (!this.map || !this.map.cmpLoaded) return;

        targetCount = Math.min(targetCount, 88);

        const cBx = Math.floor(centerX / TILE_SIZE);

        const cBy = Math.floor(centerY / TILE_SIZE);

        const minX = Math.max(2, cBx - radiusBlocks);

        const maxX = Math.min(MAP_COLS - 3, cBx + radiusBlocks);

        const minY = Math.max(2, cBy - radiusBlocks);

        const maxY = Math.min(MAP_ROWS - 3, cBy + radiusBlocks);



        const candidates = [];

        for (let by = minY; by <= maxY; by++) {

            for (let bx = minX; bx <= maxX; bx++) {

                if (Math.abs(bx - cBx) <= 1 && Math.abs(by - cBy) <= 1) continue;

                // Exclude VCIA Airport tarmac, Port Gellhorn Super-Speedway, SERA Space Center, Stadium pitch, Prison perimeter strips, and Port of Vice City industrial zone
                if (bx >= 64 && bx <= 165 && by >= 299 && by <= 368) continue;

                if (bx >= 26 && bx <= 87 && by >= 149 && by <= 200) continue;

                if (bx >= 458 && bx <= 481 && by >= 21 && by <= 45) continue;

                if (bx >= 179 && bx <= 197 && by >= 164 && by <= 180) continue;

                if (bx >= 56 && bx <= 68 && by >= 76 && by <= 146 && (bx === 56 || bx === 68 || by === 76 || by === 146)) continue;

                if (bx >= 328 && bx <= 363 && by >= 298 && by <= 338) continue;

                const nav = this.map.getNavigationBlock(bx, by, 2.0);
                if (!nav) continue;
                const col = this.map.getColumn ? this.map.getColumn(bx, by) : null;
                if (col && col.length > 1) continue;
                const lid = this.map.getBlockInfo ? (this.map.getBlockInfo(bx, by, 1)?.lid || 0) : 0;
                if (lid === 69) continue; // tree planter
                if (bx >= 449 && bx <= 464 && lid === 10) continue; // Lummus Park & Coastal Dune palm grass belts

                const inPrisonYard = (bx >= 57 && bx <= 67 && by >= 77 && by <= 145);
                const isSand = !!(this.map.coastalSandMask && this.map.coastalSandMask[by * MAP_COLS + bx] === 1 && nav.groundType === GROUND_TYPE.FIELD);

                if (nav.groundType === GROUND_TYPE.PAWEMENT || isSand || (inPrisonYard && nav.groundType === GROUND_TYPE.FIELD)) {

                    candidates.push({ bx, by, isSand, inPrisonYard });

                }

            }

        }

        if (this.trafficManager && typeof this.trafficManager.ensureVicePortWorkCrews === "function") {
            this.trafficManager.ensureVicePortWorkCrews(centerX, centerY);
        }

        if (candidates.length === 0) return;

        // Scale maximum pedestrian count to available sidewalk tiles so narrow corridors never get overcrowded
        const cappedTarget = Math.min(targetCount, Math.max(18, Math.floor(candidates.length * 0.65)));

        let existing = 0;

        for (const ped of this.peds) {

            if (!ped.dead && Math.abs(ped.x - centerX) <= radiusBlocks * TILE_SIZE && Math.abs(ped.y - centerY) <= radiusBlocks * TILE_SIZE) {

                existing++;

            }

        }

        if (existing >= cappedTarget) return;



        const civTypes = ["civ0", "civ1", "civ2", "civ3", "gang"];

        const dirs = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];

        const needed = cappedTarget - existing;

        let spawned = 0;



        for (let i = 0; i < needed * 6 && spawned < needed; i++) {

            const pick = candidates[Math.floor(Math.random() * candidates.length)];

            const px = (pick.bx + 0.25 + Math.random() * 0.5) * TILE_SIZE;

            const py = (pick.by + 0.25 + Math.random() * 0.5) * TILE_SIZE;

            let tooClose = false;

            for (const other of this.peds) {

                if (!other.dead && Math.hypot(other.x - px, other.y - py) < 32) {

                    tooClose = true;

                    break;

                }

            }

            if (tooClose) continue;

            const pz = this.map.getHeightAtPixel(px, py, 4.0);
            if (typeof this.map.resolveCircleBuildingCollision === "function" && this.map.resolveCircleBuildingCollision(px, py, 10, pz).hit) continue;
            if (typeof this.resolveCircleVehicleCollision === "function" && this.resolveCircleVehicleCollision(px, py, 11, pz).hit) continue;
            if (typeof this.map.isInsideLivingEventZone === "function" && this.map.isInsideLivingEventZone(px, py, 14)) continue;
            if (this.map.objectEngine && Array.isArray(this.map.objectEngine.clearZones) && this.map.objectEngine.clearZones.some((cz) => Math.hypot(cz.x - px, cz.y - py) < Math.min(72, cz.r || 60))) continue;

            const rawAngle = dirs[Math.floor(Math.random() * dirs.length)];
            const pedStep = this.map.chooseNextSidewalkBlock ? this.map.chooseNextSidewalkBlock(pick.bx, pick.by, rawAngle, pz, Math.random(), false) : null;
            const pedAngle = pedStep ? pedStep.angle : rawAngle;

            if (this.trafficManager && typeof this.trafficManager.spawnFormationAt === "function") {
                const added = this.trafficManager.spawnFormationAt(
                    pick.bx,
                    pick.by,
                    px,
                    py,
                    pz,
                    pedAngle,
                    pedStep,
                    pick.isSand,
                    pick.inPrisonYard,
                    this.peds.length + i + 1
                );
                spawned += Math.max(1, added);
            } else {
                const isPrisonGuard = pick.inPrisonYard && (i % 5 === 0);
                const pedProps = pick.inPrisonYard
                    ? (isPrisonGuard
                        ? { kind: "COP", g24Type: "police", missionTag: "PRISON_GUARD", copWeapon: "SHOTGUN", shirtColor: "#1e3a8a", hp: 115 }
                        : { kind: "CIVILIAN", g24Type: "g2_prisoner", g2Remapped: true, missionTag: "PRISONER", shirtColor: "#ff6608", hp: 45 })
                    : {
                        kind: "CIVILIAN",
                        g24Type: civTypes[(this.peds.length + i) % civTypes.length],
                        shirtColor: "#06b6d4",
                        hp: 35
                    };
                const baseSpeed = pedProps.isRollerblader ? (54 + Math.random() * 10) : (pedProps.isChild ? (30 + Math.random() * 7) : (35 + Math.random() * 9));
                const newPed = new Pedestrian({
                    x: px,
                    y: py,
                    z: pz,
                    angle: pedAngle,
                    speed: baseSpeed,
                    ...pedProps,
                    dead: false,
                    panicTimer: 0,
                    targetBx: pedStep ? pedStep.bx : null,
                    targetBy: pedStep ? pedStep.by : null,
                    turnSeed: this.peds.length + i + 1
                });
                if (pedProps.isRollerblader) newPed.isRollerblader = true;
                if (pedProps.isChild) newPed.isChild = true;
                this.peds.push(newPed);
                spawned++;
            }

        }

    }



    cheatCreateCars() {

        const specs = [

            "SUPERBIKE",

            "HARLEY_BIKE",

            "PENETRATOR_GT",

            "PORKA_TURBO",

            "STINGER_CABRIO",

            "STRETCH_LIMO",

            "MONSTER_BUGGY",

            "CHALLENGER_RT"

        ];

        const baseBx = Math.floor(this.player.x / TILE_SIZE);

        const baseBy = Math.floor(this.player.y / TILE_SIZE);



        let spawned = 0;

        for (let r = -4; r <= 4 && spawned < 5; r++) {

            for (let c = -4; c <= 4 && spawned < 5; c++) {

                const bx = baseBx + c;

                const by = baseBy + r;

                if (Math.abs(c) <= 1 && Math.abs(r) <= 1) continue;

                const gt = this.map.getGroundTypeAtBlock(bx, by, 1);

                if (gt === 1 || gt === 2) {

                    const vx = (bx + 0.5) * TILE_SIZE;

                    const vy = (by + 0.5) * TILE_SIZE;

                    const vz = this.map.getHeightAtPixel(vx, vy, 4.0);

                    const spec = specs[(this.vehicles.length + spawned) % specs.length];

                    const ang = this.map.getAlignedRoadAngle(bx, by, Math.PI * 0.5, vz);

                    const v = new Vehicle(`cheat_car_${Date.now()}_${spawned}`, spec, vx, vy, ang);

                    v.z = vz;

                    if (gt === 1) {

                        v.driver = "AI_TRAFFIC";

                    }

                    this.vehicles.push(v);

                    spawned++;

                }

            }

        }

        this.audio.playCashSound();

        this.addFloatingText(this.player.x, this.player.y - 24, `CREATED ${spawned} BIKES & CARS!`, "#39ff14");

    }



    cheatCreatePeds() {

        const civTypes = ["gang", "civ0", "civ1", "civ2", "civ3", "monk"];

        for (let i = 0; i < 8; i++) {

            const ang = (i / 8) * Math.PI * 2;

            const dist = 55 + (i % 3) * 28;

            const px = this.player.x + Math.cos(ang) * dist;

            const py = this.player.y + Math.sin(ang) * dist;

            const safe = this.map.resolveCircleBuildingCollision(px, py, 10, this.player.z || 2.0);

            const t = civTypes[i % civTypes.length];

            this.peds.push(new Pedestrian({

                x: safe.x,

                y: safe.y,

                z: this.map.getHeightAtPixel(safe.x, safe.y, 4.0),

                angle: Math.random() * Math.PI * 2,

                speed: 38,

                kind: t === "monk" ? "MONK" : "CIVILIAN",

                g24Type: t,

                shirtColor: "#06b6d4",

                hp: 35,

                dead: false,

                panicTimer: 0

            }));

        }

        this.audio.playBeep(660, 0.06, "square", 0.06);

        this.addFloatingText(this.player.x, this.player.y - 24, "CREATED 8 PEDS!", "#00f0ff");

    }



    teleportToLandmark(landmarkId, enterNearbyCar = false) {

        if (!Array.isArray(this.map.landmarks)) return;

        const lm = this.map.landmarks.find((l) => l.id === landmarkId);

        if (!lm) return;

        this.teleportToBlock(lm.bx, lm.by, enterNearbyCar);

    }



    teleportToBlock(blockX, blockY, enterScurveCar = false) {

        if (this.activeInterior) {

            this.activeInterior = null;
            this.interiorTracers = [];
            this.interiorPopups = [];

        }

        if (this.fullMapOpen) {

            this.toggleFullMap(false);

        }

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }



        let tx = blockX * TILE_SIZE;

        let ty = blockY * TILE_SIZE;

        let tz = this.map.getHeightAtPixel(tx, ty, 4.0);

        if (!enterScurveCar && this.map) {
            const isBadSpot = (wx, wy, wz) => {
                const bx = Math.floor(wx / TILE_SIZE);
                const by = Math.floor(wy / TILE_SIZE);
                if (bx < 2 || bx >= MAP_COLS - 2 || by < 2 || by >= MAP_ROWS - 2) return true;
                if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(wx, wy)) return true;
                if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) return true;
                if (typeof this.map.getGroundTypeAt === "function") {
                    const gt = this.map.getGroundTypeAt(wx, wy);
                    if (gt === GROUND_TYPE.WATER || gt === GROUND_TYPE.BUILDING) return true;
                }
                if (typeof this.map.resolveCircleBuildingCollision === "function") {
                    if (this.map.resolveCircleBuildingCollision(wx, wy, 10, wz, false).hit) return true;
                }
                return false;
            };
            if (isBadSpot(tx, ty, tz)) {
                const baseBx = Math.round(blockX);
                const baseBy = Math.round(blockY);
                let snapped = false;
                for (let r = 1; r <= 28 && !snapped; r++) {
                    for (let dy = -r; dy <= r && !snapped; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                            const cbx = baseBx + dx;
                            const cby = baseBy + dy;
                            const cx = (cbx + 0.5) * TILE_SIZE;
                            const cy = (cby + 0.5) * TILE_SIZE;
                            const cz = this.map.getHeightAtPixel(cx, cy, 4.0);
                            if (!isBadSpot(cx, cy, cz)) {
                                tx = cx;
                                ty = cy;
                                tz = cz;
                                snapped = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (typeof this.map.resolveCircleBuildingCollision === "function") {
                const safePos = this.map.resolveCircleBuildingCollision(tx, ty, 12, tz, false);
                tx = safePos.x;
                ty = safePos.y;
                tz = this.map.getHeightAtPixel(tx, ty, 4.0);
            }
        }



        if (this.player.inVehicle) {

            const prevVeh = this.player.inVehicle;
            const prevSeat = this.player.seatIndex || 0;

            if (prevSeat === 0) {

                prevVeh.driver = null;

                prevVeh.vx = 0;

                prevVeh.vy = 0;

                prevVeh.speed = 0;

                prevVeh.drifting = false;

                prevVeh.sirenActive = false;
                prevVeh._worldModified = true;
                prevVeh.isStaticParked = false;
                if (this.net && typeof this.net.broadcastWorldEvent === "function" && prevVeh.id) {
                    const flags =
                        (prevVeh.destroyed ? 1 : 0) |
                        (prevVeh.frontDented ? 4 : 0) |
                        (prevVeh.rearDented ? 8 : 0) |
                        (prevVeh.heavyDented ? 16 : 0) |
                        (prevVeh.fireExtinguished ? 128 : 0);
                    this.net.broadcastWorldEvent({
                        kind: "VEH_EXIT",
                        vehId: prevVeh.id,
                        seat: 0,
                        specKey: prevVeh.specKey || "MINT_STALLION",
                        x: Math.round(prevVeh.x),
                        y: Math.round(prevVeh.y),
                        z: Math.round((prevVeh.z || 2.0) * 100) / 100,
                        a: Math.round((prevVeh.angle || 0) * 1000) / 1000,
                        hp: Math.round(prevVeh.hp || 100),
                        flags,
                        remapIdx: prevVeh.remapIdx || 0
                    });
                }

            }

            prevVeh.hasJason = false;

            this.player.inVehicle = null;

            this.player.seatIndex = 0;

        }

        if (this.jason) {

            this.jason.inVehicle = null;

        }



        this.player.x = tx;

        this.player.y = ty;

        this.player.z = tz;

        this.player.vx = 0;

        this.player.vy = 0;
        this.player._velX = 0;
        this.player._velY = 0;
        this.player._turnBank = 0;
        this.player._enteringTimer = 0;
        this.player.isSwimming = false;
        this.player.isWading = false;

        this.player.isMoving = false;

        this.player.enteringVehicle = null;



        if (this.jason) {

            let jx = tx + 24;
            let jy = ty + 20;
            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const jCol = this.map.resolveCircleBuildingCollision(jx, jy, 10, tz, false);
                jx = jCol.x;
                jy = jCol.y;
            }
            this.jason.x = jx;

            this.jason.y = jy;

            this.jason.z = tz;

        }



        if (enterScurveCar) {

            let bestCar = null;

            let bestDist = 200;

            for (const v of this.vehicles) {

                if (v.destroyed) continue;

                const d = Math.hypot(v.x - tx, v.y - ty);

                if (d < bestDist) {

                    bestDist = d;

                    bestCar = v;

                }

            }

            if (bestCar) {

                bestCar.driver = "PLAYER";

                bestCar.hasJason = Boolean(this.jason && this.jason.recruited);

                this.player.inVehicle = bestCar;

                this.player.x = bestCar.x;

                this.player.y = bestCar.y;

                this.player.z = bestCar.z || 2.0;

                if (this.jason && this.jason.recruited) {

                    this.jason.inVehicle = bestCar;

                }

            }

        }



        this.populateNearbySidewalks(this.player.x, this.player.y, 96, 14);

        this.currentDistrict = this.map.getDistrictName(this.player.x, this.player.y);

        this.districtPopupTimer = 0;

        this.renderer.camX = this.player.x;

        this.renderer.camY = this.player.y;

        this.renderer.camZBlocks = this.player.z;

        if (this.net && typeof this.net.broadcastStateNow === "function") {
            this.net.broadcastStateNow();
        }

        this.updateHud();

    }



    getMonkTrackPosition(s) {

        // Walk strictly along Lummus Park Ocean Drive Promenade (448.5) & Winding Sand Trail (454.5) via walkovers (276.5 & 318.5):
        const xA = 448.5 * TILE_SIZE;

        const xB = 454.5 * TILE_SIZE;

        const yTop = 276.5 * TILE_SIZE;

        const yBottom = 318.5 * TILE_SIZE;

        const segTop = xB - xA;

        const segRight = yBottom - yTop;

        const segBottom = segTop;

        const segLeft = segRight;

        const P = segTop + segRight + segBottom + segLeft;



        let dist = ((s % P) + P) % P;



        // Segment 1: Top (A -> B, East)

        if (dist < segTop) {

            return {

                x: xA + dist,

                y: yTop,

                angle: 0

            };

        }

        dist -= segTop;

        // Segment 2: Right (B -> C, South)

        if (dist < segRight) {

            return {

                x: xB,

                y: yTop + dist,

                angle: Math.PI * 0.5

            };

        }

        dist -= segRight;

        // Segment 3: Bottom (C -> D, West)

        if (dist < segBottom) {

            return {

                x: xB - dist,

                y: yBottom,

                angle: Math.PI

            };

        }

        dist -= segBottom;

        // Segment 4: Left (D -> A, North)

        return {

            x: xA,

            y: yBottom - dist,

            angle: -Math.PI * 0.5

        };

    }



    spawnMonkChain() {

        // Remove any old dead monk entries

        this.peds = this.peds.filter((p) => p.kind !== "MONK");

        this.monkChain = [];

        this.monksKilled = 0;

        this.monkLeadS = (this.monkLeadS !== undefined ? this.monkLeadS : 160);



        // 7 Saffron-Robed Hare Krishna Monks marching in single file along a closed promenade circuit!

        for (let i = 0; i < 7; i++) {

            const trackPos = this.getMonkTrackPosition(this.monkLeadS - i * 22);

            const monk = new Pedestrian({

                id: `monk_${i}`,

                x: trackPos.x,

                y: trackPos.y,

                z: 2.0,

                angle: trackPos.angle,

                speed: 38,

                kind: "MONK",

                g24Type: "monk",

                monkIndex: i,

                shirtColor: "#ff7b00",

                hp: 25,

                dead: false,

                panicTimer: 0

            });

            this.monkChain.push(monk);

            this.peds.push(monk);

        }

    }



    clearHeldInputs() {
        if (!this.input) return;
        this.input.up = false;
        this.input.down = false;
        this.input.left = false;
        this.input.right = false;
        this.input.handbrake = false;
        this.input.shoot = false;
        this.input.sprint = false;
        if (this.player) {
            this.player.mouseShoot = false;
        }
    }

    bindEvents() {
        window.addEventListener("blur", () => {
            this.clearHeldInputs();
        });
        window.addEventListener("focusin", (e) => {
            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
                this.clearHeldInputs();
            }
        });

        window.addEventListener("keydown", (e) => {

            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
                this.clearHeldInputs();

                if (e.code === "Escape") {

                    e.target.blur();

                } else if (

                    e.code === "Enter" &&

                    (e.target.id === "start-nickname-input" || e.target.id === "start-room-input")

                ) {

                    e.preventDefault();

                    e.target.blur();

                    this.startGame();

                }

                return;

            }

            const code = e.code;

            const key = e.key.toLowerCase();



            // Start / Character Selection modal shortcut
            const startModal = document.getElementById("start-modal");
            const startModalOpen = startModal && !startModal.classList.contains("hidden");
            if (!this.started || startModalOpen) {
                this.clearHeldInputs();
                if (code === "Enter" || code === "Space") {
                    e.preventDefault();
                    this.startGame();
                } else if (code === "Escape" && this.started && startModal) {
                    startModal.classList.add("hidden");
                }
                // Block gameplay movement/weapon/vehicle keys while the character selection modal is open
                return;
            }

            if (this.fullMapOpen) {
                this.clearHeldInputs();
                if ((code === "KeyM" || code === "Escape") && !e.repeat) {
                    e.preventDefault();
                    this.toggleFullMap(false);
                }
                return;
            }



            if (code === "KeyW" || code === "KeyZ" || code === "ArrowUp") this.input.up = true;

            if (code === "KeyS" || code === "ArrowDown") this.input.down = true;

            if (code === "KeyA" || code === "KeyQ" || code === "ArrowLeft") this.input.left = true;

            if (code === "KeyD" || code === "ArrowRight") this.input.right = true;

            if (this.creationEngine && this.creationEngine.handleKeyDown(e)) {
                return;
            }

            if (code === "Space") {

                this.input.handbrake = true;

                // Authentic 1997 GTA 1 On-Foot Jump (leap over oncoming cars & low obstacles!)

                if (!this.player.inVehicle && !this.player.dead && (this.player.jumpTimer || 0) <= 0) {

                    this.player.jumpTimer = 0.52;

                    this.audio.playBeep(440, 0.06, "sine", 0.05);

                }

                e.preventDefault();

            }

            if (code === "ShiftLeft" || code === "ShiftRight") this.input.sprint = true;

            if (code === "KeyJ" || code === "ControlLeft" || code === "ControlRight") {

                this.input.shoot = true;

                this.player.mouseShoot = false;

            }



            // Enter / Exit / Carjack Vehicle or Confirm Station Purchase (F or Enter or E — single press only, never auto-repeat!)

            if (!e.repeat && (code === "KeyF" || code === "Enter" || code === "KeyE")) {

                this.toggleVehicleEntry();

            }



            // Classic 1997 GTA 1 Horn / Siren (in car) OR Burp & Fart (on foot!) [G or V]

            if (code === "KeyG" || code === "KeyV") {

                this.triggerHornOrBurp();

            }



            // Classic 1997 GTA 1 Car Bomb Arm / Rig [K]

            if (code === "KeyK") {

                this.armOrRigCarBomb();

            }

            // Graffiti tagging with a spray can [P]
            if (code === "KeyP" && !e.repeat) {

                this.startGraffitiTag();

            }



            // Cycle Radio Station / Skip YouTube Radio Track (R)

            if (code === "KeyR") {

                this.skipYouTubeRadioTrack();

            }



            // Cycle Weapon (Tab or X)

            if (code === "Tab" || key === "x") {

                e.preventDefault();

                this.cycleWeapon(1);

            }



            // Number keys 1..7 for direct weapon selection (7 = GTA 2 ElectroGun)

            if (key >= "1" && key <= "7") {

                const idx = parseInt(key, 10) - 1;

                if (this.player.weaponsOwned[idx]) {

                    this.player.weapon = this.player.weaponsOwned[idx];

                    this.player.weaponDrawnTimer = 0;

                    const wSpec = WEAPON_SPECS[this.player.weapon] || { name: this.player.weapon };
                    const wLabel = this.player.weapon === "FIST" ? "👊 FIST" : `🔫 ${wSpec.name}`;
                    this.addFloatingText(this.player.x, this.player.y - 26, wLabel, "#ffd13b");
                    if (this.activeInterior) {
                        if (!this.interiorPopups) this.interiorPopups = [];
                        this.interiorPopups.push({ x: this.interiorX, y: this.interiorY - 12, text: wLabel, color: "#ffd13b", life: 0.95 });
                    }
                    this.audio.playBeep(660, 0.04, "square", 0.05);
                    this.updateHud();

                }

            }

            // [8] Toggle South Beach Neon Inline Roller-Skates Mode on Foot!
            if (key === "8" && !e.repeat) {
                this.toggleRollerSkates();
            }

            // [9] Trigger Physical Street Groove / Selfie / Dance Emote!
            if (key === "9" && !e.repeat) {
                this.triggerPlayerGrooveEmote();
            }



            // Advance Time-of-Day Phase (Day -> Sunset -> Night -> Sunrise) (N)

            if (code === "KeyN") {

                this.advanceTimeOfDayPhase();

            }



            // Toggle Vice City GPS Tour Drawer (C)

            if (code === "KeyC") {

                this.renderer.showCheatsWindow = true;

                this.renderer.cheatsCollapsed = !this.renderer.cheatsCollapsed;

            }



            // Toggle Lucia's Iconic Red Heist Bandana Mask / Vehicle Trunk / Exotic GPS Jammer (B)

            if (code === "KeyB") {

                this.toggleBandana();

            }

            // GTA 6 Unified Focus Mode / Eagle-Eye Tactical Burst [L or CapsLock]
            if ((code === "KeyL" || code === "CapsLock") && !e.repeat) {
                e.preventDefault();
                this.triggerFocusMode();
            }

            // Toggle ViceWorldDirector Internal Engine Live Telemetry Overlay [F9]
            if (code === "F9" && !e.repeat && this.director && typeof this.director.toggleTelemetryOverlay === "function") {
                e.preventDefault();
                const isOpen = this.director.toggleTelemetryOverlay();
                this.addFloatingText(this.player.x, this.player.y - 32, isOpen ? "🧠 ENGINE TELEMETRY: ON [F9]" : "🧠 ENGINE TELEMETRY: OFF", "#00f0ff");
            }



            // Toggle Dossier Modal (H)

            if (code === "KeyH") {

                const modal = document.getElementById("start-modal");

                if (modal) {

                    const willShow = modal.classList.contains("hidden");
                    if (willShow) this.clearHeldInputs();

                    modal.classList.toggle("hidden");

                    if (willShow && typeof this.renderAllTimeHighScoresUI === "function") {

                        this.renderAllTimeHighScoresUI();

                    }

                }

            }



            // Toggle Full Square GTA 1 (.CMP) City Map Modal (M)

            if (code === "KeyM") {

                this.toggleFullMap();

            }



            // Online Multiplayer Action: Teleport to Remote Player or Active Flash District Hotspot [O]
            if (code === "KeyO" && !e.repeat) {
                if (e.shiftKey && typeof this.teleportToFlashDistrict === "function") {
                    this.teleportToFlashDistrict();
                } else if (this.net) {
                    this.net.triggerOnlineAction();
                }
            }

            // 2.5D Overhead Arcade Social Emote Bubble + Physical Street Groove Emote [U]
            if (code === "KeyU" && !e.repeat) {
                this.triggerPlayerGrooveEmote();
                if (this.net && typeof this.net.triggerSocialEmote === "function") {
                    this.net.triggerSocialEmote();
                }
            }

            // Toggle Syndicate Crew (🦩 FLAMINGO CARTEL vs ⚡ CYAN SYNDICATE) [I]
            if (code === "KeyI" && !e.repeat) {
                if (this.net && typeof this.net.toggleSyndicate === "function") {
                    this.net.toggleSyndicate();
                }
            }

            // Car Meet Street Respect Commendation [Y] (or Social Emote if no car nearby)
            if (code === "KeyY" && !e.repeat) {
                if (!this.commendNearestVehicle(115) && this.net && typeof this.net.triggerSocialEmote === "function") {
                    this.net.triggerSocialEmote();
                }
            }

            // Open Online Multiplayer Live Chat Input [T]
            if (code === "KeyT") {
                if (this.net && typeof this.net.focusChatInput === "function") {
                    e.preventDefault();
                    this.clearHeldInputs();
                    this.net.focusChatInput();
                    return;
                }
            }



            if (code === "Escape") {

                if (this.activeInterior) {

                    this.exitInterior();

                } else if (this.fullMapOpen) {

                    this.toggleFullMap(false);

                } else if (this.started) {
                    const modal = document.getElementById("start-modal");
                    if (modal && !modal.classList.contains("hidden")) {
                        modal.classList.add("hidden");
                    }
                }

            }

        });



        window.addEventListener("keyup", (e) => {

            const code = e.code;

            if (code === "KeyW" || code === "KeyZ" || code === "ArrowUp") this.input.up = false;

            if (code === "KeyS" || code === "ArrowDown") this.input.down = false;

            if (code === "KeyA" || code === "KeyQ" || code === "ArrowLeft") this.input.left = false;

            if (code === "KeyD" || code === "ArrowRight") this.input.right = false;

            if (code === "Space") this.input.handbrake = false;

            if (code === "ShiftLeft" || code === "ShiftRight") this.input.sprint = false;

            if (code === "KeyJ" || code === "ControlLeft" || code === "ControlRight") this.input.shoot = false;

        });



        this.canvas.addEventListener("mousemove", (e) => {

            if (document.body && document.body.classList.contains("touch-enabled")) return;

            this.input.mouseX = e.clientX;

            this.input.mouseY = e.clientY;

        });



        this.canvas.addEventListener("mousedown", (e) => {

            if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
                document.activeElement.blur();
            }

            if (document.body && document.body.classList.contains("touch-enabled")) return;

            if (this.creationEngine && this.creationEngine.studioActive && this.creationEngine.handleMouseDown(e.clientX, e.clientY, e.button)) {
                e.preventDefault();
                return;
            }

            if (e.button === 0) {

                this.audio.resume();

                if (this.renderer && this.renderer.handleCheatsClick(e.clientX, e.clientY, this)) {

                    return;

                }

                this.input.shoot = true;

                this.player.mouseShoot = true;

            }

        });



        this.canvas.addEventListener("contextmenu", (e) => {
            if (this.creationEngine && this.creationEngine.studioActive) {
                e.preventDefault();
            }
        });

        window.addEventListener("mouseup", (e) => {

            if (document.body && document.body.classList.contains("touch-enabled")) return;

            if (e.button === 0) {

                this.input.shoot = false;

                this.player.mouseShoot = false;

            }

        });



        window.addEventListener("wheel", (e) => {
            if (!this.started || this.fullMapOpen) return;
            const startModal = document.getElementById("start-modal");
            if (startModal && !startModal.classList.contains("hidden")) return;
            if (e.target && typeof e.target.closest === "function" && e.target.closest("#mp-chat-widget, #start-modal, #fullmap-modal")) {
                return;
            }

            // FollowCameraController.cpp: Mouse wheel adjusts 3D camera height above target

            if (this.renderer) {

                const step = e.deltaY > 0 ? 0.5 : -0.5;

                this.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, this.renderer.zoomOffsetBlocks + step));

            }

        }, { passive: true });



        // Mobile & Tablet Touch Interaction on Canvas (Smartphone UI / HUD Buttons + Two-Finger Pinch Zoom)

        let pinchStartDist = 0;

        let pinchStartZoom = 0;

        this.canvas.addEventListener("touchstart", (e) => {

            if (document.body) document.body.classList.add("touch-enabled");

            this.audio.resume();

            if (e.touches.length === 2 && this.renderer) {

                const dx = e.touches[0].clientX - e.touches[1].clientX;

                const dy = e.touches[0].clientY - e.touches[1].clientY;

                pinchStartDist = Math.hypot(dx, dy);

                pinchStartZoom = this.renderer.zoomOffsetBlocks || 0;

                e.preventDefault();

                return;

            }

            if (e.changedTouches.length > 0) {

                const t = e.changedTouches[0];

                if (this.renderer && this.renderer.handleCheatsClick(t.clientX, t.clientY, this)) {

                    e.preventDefault();

                }

            }

        }, { passive: false });



        this.canvas.addEventListener("touchmove", (e) => {

            if (e.touches.length === 2 && pinchStartDist > 10 && this.renderer) {

                const dx = e.touches[0].clientX - e.touches[1].clientX;

                const dy = e.touches[0].clientY - e.touches[1].clientY;

                const dist = Math.hypot(dx, dy);

                const delta = (pinchStartDist - dist) * 0.025;

                this.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, pinchStartZoom + delta));

                e.preventDefault();

            }

        }, { passive: false });



        this.canvas.addEventListener("touchend", () => {

            pinchStartDist = 0;

        });



        const startBtn = document.getElementById("btn-start-game");

        if (startBtn) {

            startBtn.addEventListener("click", () => this.startGame());

        }



        this.initCharacterSelectModal();



        const charBadge = document.querySelector(".char-badge");

        if (charBadge) {

            charBadge.addEventListener("click", () => this.toggleBandana());

        }



        // Full Square GTA 1 Map UI bindings

        const radarBox = document.getElementById("radar-box");

        if (radarBox) {

            radarBox.addEventListener("click", () => this.toggleFullMap());

        }



        const closeMapBtn = document.getElementById("btn-close-fullmap");

        if (closeMapBtn) {

            closeMapBtn.addEventListener("click", () => this.toggleFullMap(false));

        }



        const fullMapCanvas = document.getElementById("fullmap-canvas");

        if (fullMapCanvas) {

            const handleFullMapPick = (clientX, clientY) => {

                const rect = fullMapCanvas.getBoundingClientRect();

                const u = (clientX - rect.left) / Math.max(1, rect.width);

                const v = (clientY - rect.top) / Math.max(1, rect.height);

                const col = u * this.map.cols;

                const row = v * this.map.rows;

                this.teleportToTile(col, row);

                this.toggleFullMap(false);

            };

            fullMapCanvas.addEventListener("click", (e) => handleFullMapPick(e.clientX, e.clientY));

            fullMapCanvas.addEventListener("touchstart", (e) => {

                if (e.changedTouches.length > 0) {

                    e.preventDefault();

                    handleFullMapPick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

                }

            }, { passive: false });

        }



        document.querySelectorAll(".jump-btn").forEach((btn) => {

            btn.addEventListener("click", () => {

                const col = parseFloat(btn.getAttribute("data-col"));

                const row = parseFloat(btn.getAttribute("data-row"));

                if (!Number.isNaN(col) && !Number.isNaN(row)) {

                    this.teleportToTile(col, row);

                    this.toggleFullMap(false);

                }

            });

        });



        this.initMobileTouchControls();

        this.initYouTubeRadio();

    }



    initMobileTouchControls() {

        const joyZone = document.getElementById("touch-joystick-zone");

        const joyRing = document.getElementById("touch-joy-ring");

        const joyKnob = document.getElementById("touch-joy-knob");

        if (!joyZone || !joyRing || !joyKnob) return;



        let activeJoyTouchId = null;

        const maxRadius = 38;



        const updateJoystick = (clientX, clientY) => {

            const rect = joyRing.getBoundingClientRect();

            const cx = rect.left + rect.width * 0.5;

            const cy = rect.top + rect.height * 0.5;

            const dx = clientX - cx;

            const dy = clientY - cy;

            const dist = Math.hypot(dx, dy);

            const clamped = Math.min(maxRadius, dist);

            const angle = Math.atan2(dy, dx);

            const kx = dist > 0.5 ? Math.cos(angle) * clamped : 0;

            const ky = dist > 0.5 ? Math.sin(angle) * clamped : 0;

            joyKnob.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`;



            const normX = kx / maxRadius;

            const normY = ky / maxRadius;

            const mag = Math.min(1.0, dist / maxRadius);



            this.input.joyActive = mag > 0.12;

            this.input.joyX = normX;

            this.input.joyY = normY;

            this.input.joyMag = mag;

            this.input.joyWasUsed = true;

            if (mag > 0.10) {

                this.input.joyAngle = angle;

                if (this.player && !this.player.inVehicle) {

                    this.player.angle = angle;

                }

            }



            if (this.player && this.player.inVehicle) {

                // Direct 360° pedestrian-like vehicle control is handled directly in Vehicle.update via joyX/joyY

                this.input.up = false;

                this.input.down = false;

                this.input.left = false;

                this.input.right = false;

            } else {

                this.input.left = normX < -0.25;

                this.input.right = normX > 0.25;

                this.input.up = normY < -0.25;

                this.input.down = normY > 0.25;

                this.input.sprint = mag > 0.70;

            }

        };



        const resetJoystick = () => {

            activeJoyTouchId = null;

            joyRing.classList.remove("active");

            joyKnob.style.transform = "translate(0px, 0px)";

            this.input.joyActive = false;

            this.input.joyX = 0;

            this.input.joyY = 0;

            this.input.joyMag = 0;

            this.input.left = false;

            this.input.right = false;

            this.input.up = false;

            this.input.down = false;

            this.input.sprint = false;

        };



        joyZone.addEventListener("touchstart", (e) => {

            e.preventDefault();

            this.audio.resume();

            if (activeJoyTouchId === null && e.changedTouches.length > 0) {

                const t = e.changedTouches[0];

                activeJoyTouchId = t.identifier;

                joyRing.classList.add("active");

                updateJoystick(t.clientX, t.clientY);

            }

        }, { passive: false });



        joyZone.addEventListener("touchmove", (e) => {

            e.preventDefault();

            for (let i = 0; i < e.changedTouches.length; i++) {

                const t = e.changedTouches[i];

                if (t.identifier === activeJoyTouchId) {

                    updateJoystick(t.clientX, t.clientY);

                    break;

                }

            }

        }, { passive: false });



        const onJoyEnd = (e) => {

            for (let i = 0; i < e.changedTouches.length; i++) {

                if (e.changedTouches[i].identifier === activeJoyTouchId) {

                    resetJoystick();

                    break;

                }

            }

        };

        joyZone.addEventListener("touchend", onJoyEnd, { passive: false });

        joyZone.addEventListener("touchcancel", onJoyEnd, { passive: false });



        // Helper for continuous hold buttons (Gas, Brake, Shoot, Jump/Handbrake)

        const bindHoldBtn = (id, onDown, onUp) => {

            const el = document.getElementById(id);

            if (!el) return;

            const start = (e) => {

                e.preventDefault();

                this.audio.resume();

                el.classList.add("pressed");

                onDown();

            };

            const end = (e) => {

                e.preventDefault();

                el.classList.remove("pressed");

                onUp();

            };

            el.addEventListener("touchstart", start, { passive: false });

            el.addEventListener("touchend", end, { passive: false });

            el.addEventListener("touchcancel", end, { passive: false });

            el.addEventListener("mousedown", start);

            el.addEventListener("mouseup", end);

            el.addEventListener("mouseleave", end);

        };



        bindHoldBtn(

            "tbtn-shoot",

            () => {

                this.input.shoot = true;

                if (this.player) this.player.mouseShoot = false;

            },

            () => {

                this.input.shoot = false;

            }

        );



        bindHoldBtn(

            "tbtn-jump",

            () => {

                this.input.handbrake = true;

                if (this.player && !this.player.inVehicle && !this.player.dead && (this.player.jumpTimer || 0) <= 0) {

                    this.player.jumpTimer = 0.52;

                    this.audio.playBeep(440, 0.06, "sine", 0.05);

                }

            },

            () => {

                this.input.handbrake = false;

            }

        );



        // Helper for single-tap action buttons (Steal/Exit Car, Weapon, Horn, Full Map, Smartphone)

        const bindTapBtn = (id, fn) => {

            const el = document.getElementById(id);

            if (!el) return;

            let touched = false;

            el.addEventListener("touchstart", (e) => {

                e.preventDefault();

                touched = true;

                this.audio.resume();

                el.classList.add("pressed");

                fn();

                setTimeout(() => el.classList.remove("pressed"), 140);

            }, { passive: false });

            el.addEventListener("click", (e) => {

                if (touched) {

                    touched = false;

                    return;

                }

                e.preventDefault();

                this.audio.resume();

                fn();

            });

        };



        bindTapBtn("tbtn-car", () => this.toggleVehicleEntry());

        bindTapBtn("tbtn-weapon", () => this.cycleWeapon(1));

        bindTapBtn("tbtn-skates", () => this.toggleRollerSkates());
        bindTapBtn("tbtn-horn", () => this.triggerHornOrBurp());

        bindTapBtn("tbtn-map", () => this.toggleFullMap());

        bindTapBtn("tbtn-phone", () => {

            if (this.renderer) {

                this.renderer.showCheatsWindow = !this.renderer.showCheatsWindow;

            }

        });

    }



    initYouTubeRadio() {

        this.ytSeekOffset = 0;
        this.ytRadioFallbackIds = [
            "Nl7r0rL38nU", // EVERY GTA 6 SONG — The ULTIMATE Radio Soundtrack (Primary)
            "0l8BuoAJ3qw", // Fallback if accessed via raw IP 127.0.0.1
            "AHiRDCD1hPc",
            "GK0Le-u0Uho",
            "crbk0SQAHg0",
            "zeKyGp2CJ2A",
            "TE8tvtpXvsQ"
        ];
        this.ytCurrentVideoId = "Nl7r0rL38nU";
        this._ytErrorFailoverIdx = 0;

        // Enable YouTube Radio Soundtrack by default on both desktop and mobile!
        // Pre-booting the hidden iframe while the Start / Character Select modal is open ensures YT.Player is ready
        // before the user taps [ ENTER VICE CITY 26 — PLAY NOW ], unlocking mobile audio inside the touch gesture!
        this.ytMusicEnabled = true;

        this.ytVolume = 28;

        this.ytPlayerState = -1;

        this.ytActuallyPlaying = false;

        this._ytBuffering = false;

        this._ytGestureUnlocked = false;

        this._lastYtKickMs = 0;

        this._lastYtTime = -1;

        this._lastYtProgressMs = 0;



        const toggleBtn = document.getElementById("yt-btn-toggle");

        const skipBtn = document.getElementById("yt-btn-skip");

        const volSlider = document.getElementById("yt-vol-slider");

        const iframe = document.getElementById("yt-player-iframe");

        const led = document.getElementById("yt-radio-led");

        const eq = document.getElementById("yt-eq");

        if (!this.ytMusicEnabled) {
            if (toggleBtn) {
                toggleBtn.textContent = "🔇 MUSIC: OFF";
                toggleBtn.classList.remove("yt-btn-active");
                toggleBtn.classList.add("yt-btn-muted");
            }
            if (led) led.classList.add("paused");
            if (eq) eq.classList.add("paused");
        }

        const subscribeYtEvents = () => {

            if (!iframe || !iframe.contentWindow || !iframe.getAttribute("src")) return;

            try {

                iframe.contentWindow.postMessage(

                    JSON.stringify({ event: "listening", id: 1, channel: "widget" }),

                    "*"

                );

                iframe.contentWindow.postMessage(

                    JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id: 1, channel: "widget" }),

                    "*"

                );

                iframe.contentWindow.postMessage(

                    JSON.stringify({ event: "command", func: "addEventListener", args: ["onError"], id: 1, channel: "widget" }),

                    "*"

                );

            } catch (_e) {}

        };



        const handleYtStateChange = (st) => {

            if (typeof st !== "number") return;

            this.ytPlayerState = st;

            if (st === 1) {

                this.ytActuallyPlaying = true;

                this._ytBuffering = false;

                this._ytStallChecks = 0;

                this._lastYtProgressMs = performance.now();

                if (this._ytGestureUnlocked && this.ytMusicEnabled && !this._ytUnmutedAfterPlay) {
                    this._ytUnmutedAfterPlay = true;
                    const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);
                    this.sendYouTubeCommand("unMute", []);
                    this.sendYouTubeCommand("setVolume", [vol]);
                }

            } else if (st === 3) {

                // Buffering: do NOT interrupt or re-kick while stream is buffering on mobile

                this._ytBuffering = true;

                this._lastYtProgressMs = performance.now();

            } else if (st === 0) {

                // Ended: loop immediately

                this.ytActuallyPlaying = false;

                this._ytBuffering = false;

                if (this.ytMusicEnabled) {

                    this.sendYouTubeCommand("seekTo", [0, true]);

                    this.sendYouTubeCommand("playVideo", []);

                }

            } else if (st === 2 || st === 5 || st === -1) {

                this.ytActuallyPlaying = false;

                this._ytBuffering = false;

                if (st === 2 && this.ytMusicEnabled && !document.hidden) {

                    const nowMs = performance.now();

                    if (nowMs - (this._lastYtKickMs || 0) > 900) {

                        this._lastYtKickMs = nowMs;

                        this.sendYouTubeCommand("playVideo", []);

                    }

                }

            }

        };



        const handleYtError = (_errCode) => {
            this.ytActuallyPlaying = false;
            this._ytBuffering = false;
            this._ytUnmutedAfterPlay = false;
            if (!Array.isArray(this.ytRadioFallbackIds) || this.ytRadioFallbackIds.length === 0) return;
            this._ytErrorFailoverIdx = ((this._ytErrorFailoverIdx || 0) + 1) % this.ytRadioFallbackIds.length;
            const nextVid = this.ytRadioFallbackIds[this._ytErrorFailoverIdx];
            if (!nextVid || nextVid === this.ytCurrentVideoId) return;
            this.ytCurrentVideoId = nextVid;
            if (this.ytMusicEnabled) {
                this.sendYouTubeCommand("loadVideoById", [nextVid, this.ytSeekOffset || 0]);
                this.sendYouTubeCommand("playVideo", []);
                if (this._ytGestureUnlocked) {
                    const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);
                    this.sendYouTubeCommand("unMute", []);
                    this.sendYouTubeCommand("setVolume", [vol]);
                }
            }
        };

        this._ensureYtIframeBooted = () => {
            if (!iframe) return;
            if (!iframe.getAttribute("src") && iframe.dataset && iframe.dataset.src) {
                let bootUrl = iframe.dataset.src;
                if (!this._ytGestureUnlocked && !bootUrl.includes("mute=")) {
                    bootUrl += "&mute=1";
                }
                if (typeof window !== "undefined" && window.location && /^https?:$/i.test(window.location.protocol) && !bootUrl.includes("origin=")) {
                    bootUrl += `&origin=${encodeURIComponent(window.location.origin)}`;
                }
                iframe.setAttribute("src", bootUrl);
            }
            if (typeof window !== "undefined" && !window._vc26YtApiLoaded) {
                window._vc26YtApiLoaded = true;
                const prevReady = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    if (typeof prevReady === "function") {
                        try { prevReady(); } catch (_e) {}
                    }
                    try {
                        if (window.YT && window.YT.Player) {
                            this.ytPlayerInstance = new window.YT.Player("yt-player-iframe", {
                                events: {
                                    onReady: () => {
                                        subscribeYtEvents();
                                        if (this.ytMusicEnabled) {
                                            const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);
                                            if (this._ytGestureUnlocked) {
                                                this.sendYouTubeCommand("unMute", []);
                                                this.sendYouTubeCommand("setVolume", [vol]);
                                            }
                                            if (!this.ytActuallyPlaying && !this._ytBuffering) {
                                                this.sendYouTubeCommand("playVideo", []);
                                            }
                                        }
                                    },
                                    onStateChange: (ev) => {
                                        if (ev && typeof ev.data === "number") {
                                            handleYtStateChange(ev.data);
                                        }
                                    },
                                    onError: (ev) => {
                                        handleYtError(ev ? ev.data : 150);
                                    }
                                }
                            });
                        }
                    } catch (_e) {}
                };
                try {
                    const tag = document.createElement("script");
                    tag.src = "https://www.youtube.com/iframe_api";
                    tag.async = true;
                    document.head.appendChild(tag);
                } catch (_e) {}
            }
        };

        const tryAutoStart = (fromUserGesture = false) => {

            if (!this.ytMusicEnabled) return;

            if (this._ensureYtIframeBooted) this._ensureYtIframeBooted();

            subscribeYtEvents();

            const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

            if (fromUserGesture) {

                this._ytGestureUnlocked = true;

                this.sendYouTubeCommand("unMute", []);

                this.sendYouTubeCommand("setVolume", [vol]);

                this.sendYouTubeCommand("playVideo", []);

                if (this.ytActuallyPlaying) {
                    this._ytUnmutedAfterPlay = true;
                }

            } else if (!this.ytActuallyPlaying && !this._ytBuffering) {

                // Outside a user gesture, only send playVideo (never unMute, which mobile WebKit blocks/pauses)

                this.sendYouTubeCommand("playVideo", []);

            }

        };



        // Boot YouTube IFrame API immediately on desktop; defer on mobile until user explicitly toggles Music ON
        if (this.ytMusicEnabled) {
            this._ensureYtIframeBooted();
        }



        // Listen for YouTube iframe playerState & auto-resume if paused while Music is ON

        window.addEventListener("message", (ev) => {

            if (!ev || typeof ev.data !== "string") return;

            try {

                const msg = JSON.parse(ev.data);

                if (!msg) return;

                if (msg.event === "onReady") {

                    subscribeYtEvents();

                } else if (msg.event === "onError") {

                    handleYtError(msg.info);

                    return;

                }

                const info = msg.info && typeof msg.info === "object" ? msg.info : null;

                const st = (info && typeof info.playerState === "number")

                    ? info.playerState

                    : (msg.event === "onStateChange" && typeof msg.info === "number" ? msg.info : null);



                if (info && typeof info.currentTime === "number") {

                    if (info.currentTime !== this._lastYtTime) {

                        this._lastYtTime = info.currentTime;

                        this._lastYtProgressMs = performance.now();

                        this.ytActuallyPlaying = true;

                        this._ytBuffering = false;

                    }

                }



                if (typeof st === "number") {

                    handleYtStateChange(st);

                }

            } catch (_e) {}

        });



        if (iframe) {

            iframe.addEventListener("load", () => {

                setTimeout(() => subscribeYtEvents(), 200);

                setTimeout(() => tryAutoStart(false), 600);

            });

        }



        // Start/resume YouTube audio on W3C user-activation gestures (touchend / pointerup / click / keydown).
        // IMPORTANT: On iOS Safari & Mobile Chrome, pointerdown/touchstart do NOT grant cross-origin iframe media activation —
        // only touchend/pointerup/click do! So pointerdown/touchstart only pre-warm WebAudio/iframe without consuming _lastYtKickMs!
        const prewarmAudio = () => {
            if (this.audio) this.audio.resume();
            if (this.ytMusicEnabled && this._ensureYtIframeBooted) {
                this._ensureYtIframeBooted();
            }
        };

        const unlockGesture = () => {

            if (this.audio) this.audio.resume();

            if (!this.ytMusicEnabled) return;

            const nowMs = performance.now();

            // Clear stale pre-gesture buffering state if it stalled waiting for user interaction
            if (this._ytBuffering && !this.ytActuallyPlaying && (nowMs - (this._lastYtProgressMs || 0) > 2500)) {
                this._ytBuffering = false;
            }

            if (!this._ytGestureUnlocked || (!this.ytActuallyPlaying && !this._ytBuffering)) {

                if (nowMs - (this._lastYtKickMs || 0) > 450) {

                    this._lastYtKickMs = nowMs;

                    tryAutoStart(true);

                }

            }

        };

        window.addEventListener("pointerdown", prewarmAudio, { capture: true, passive: true });

        window.addEventListener("touchstart", prewarmAudio, { capture: true, passive: true });

        window.addEventListener("pointerup", unlockGesture, { capture: true, passive: true });

        window.addEventListener("touchend", unlockGesture, { capture: true, passive: true });

        window.addEventListener("click", unlockGesture, { capture: true, passive: true });

        window.addEventListener("keydown", unlockGesture, { capture: true, passive: true });



        // Auto-resume when returning to tab or unlocking mobile screen

        const onVisOrFocus = () => {

            if (!document.hidden && this.ytMusicEnabled) {

                if (this.audio) this.audio.resume();

                subscribeYtEvents();

                if (!this.ytActuallyPlaying && !this._ytBuffering) {

                    this.sendYouTubeCommand("playVideo", []);

                }

            }

        };

        document.addEventListener("visibilitychange", onVisOrFocus);

        window.addEventListener("pageshow", onVisOrFocus);

        window.addEventListener("focus", onVisOrFocus);



        // Periodic watchdog: gently resume ONLY if paused/stopped (never interrupt active playback or buffering!)

        setInterval(() => {

            if (this.ytMusicEnabled && !document.hidden) {

                if (this.audio && this.audio.ctx && this.audio.ctx.state !== "running") {

                    this.audio.resume();

                }

                if (this._ytBuffering && !this.ytActuallyPlaying && (performance.now() - (this._lastYtProgressMs || 0) > 4000)) {
                    this._ytBuffering = false;
                }

                if (!this.ytActuallyPlaying && !this._ytBuffering) {

                    this._ytStallChecks = (this._ytStallChecks || 0) + 1;
                    if (this.started && this._ytStallChecks >= 2) {
                        this._ytStallChecks = 0;
                        handleYtError("stall");
                    } else {
                        tryAutoStart(Boolean(this._ytGestureUnlocked));
                    }

                }

            }

        }, 3500);



        if (toggleBtn) {

            toggleBtn.addEventListener("click", () => {

                this.setYouTubeMusicEnabled(!this.ytMusicEnabled);

            });

        }



        if (skipBtn) {

            skipBtn.addEventListener("click", () => {

                this.skipYouTubeRadioTrack();

            });

        }



        if (volSlider) {

            volSlider.addEventListener("input", () => {

                const vol = parseInt(volSlider.value, 10) || 0;

                this.ytVolume = vol;

                this.sendYouTubeCommand("setVolume", [vol]);

            });

        }

    }



    setYouTubeMusicEnabled(enabled) {

        this.ytMusicEnabled = Boolean(enabled);

        const toggleBtn = document.getElementById("yt-btn-toggle");

        const led = document.getElementById("yt-radio-led");

        const eq = document.getElementById("yt-eq");

        const volSlider = document.getElementById("yt-vol-slider");



        if (this.ytMusicEnabled) {

            this._ytGestureUnlocked = true;

            if (this._ensureYtIframeBooted) this._ensureYtIframeBooted();

            const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

            this.sendYouTubeCommand("unMute", []);

            this.sendYouTubeCommand("setVolume", [vol]);

            this.sendYouTubeCommand("playVideo", []);

            setTimeout(() => {
                if (this.ytMusicEnabled && !this.ytActuallyPlaying) {
                    this.sendYouTubeCommand("unMute", []);
                    this.sendYouTubeCommand("setVolume", [vol]);
                    this.sendYouTubeCommand("playVideo", []);
                }
            }, 320);

            if (toggleBtn) {

                toggleBtn.textContent = "🔊 MUSIC: ON";

                toggleBtn.classList.add("yt-btn-active");

                toggleBtn.classList.remove("yt-btn-muted");

            }

            if (led) led.classList.remove("paused");

            if (eq) eq.classList.remove("paused");

        } else {

            this.ytActuallyPlaying = false;

            this._ytBuffering = false;

            this.ytPlayerState = 2;

            this.sendYouTubeCommand("pauseVideo", []);

            if (toggleBtn) {

                toggleBtn.textContent = "🔇 MUSIC: OFF";

                toggleBtn.classList.remove("yt-btn-active");

                toggleBtn.classList.add("yt-btn-muted");

            }

            if (led) led.classList.add("paused");

            if (eq) eq.classList.add("paused");

        }

    }



    sendYouTubeCommand(func, args = []) {

        if (this.ytPlayerInstance && typeof this.ytPlayerInstance[func] === "function") {

            try {

                this.ytPlayerInstance[func](...args);

                return;

            } catch (_e) {}

        }

        const iframe = document.getElementById("yt-player-iframe");

        if (!iframe || !iframe.contentWindow) return;

        try {

            iframe.contentWindow.postMessage(

                JSON.stringify({ event: "command", func, args, id: 1, channel: "widget" }),

                "*"

            );

        } catch (err) {

            // Ignore cross-origin frame readiness race

        }

    }



    skipYouTubeRadioTrack() {

        this.ytSeekOffset = ((this.ytSeekOffset || 0) + 180) % 1080;

        if (!this.ytMusicEnabled) {

            this.setYouTubeMusicEnabled(true);

        }

        const st = (this.audio && typeof this.audio.cycleStation === "function")
            ? this.audio.cycleStation()
            : null;
        const titleEl = document.getElementById("yt-radio-title");
        if (titleEl && st && st.name) {
            titleEl.textContent = `📻 ${st.name}`;
        }

        if (st && st.videoId && st.videoId !== this.ytCurrentVideoId) {
            this.ytCurrentVideoId = st.videoId;
            this.sendYouTubeCommand("loadVideoById", [st.videoId, this.ytSeekOffset]);
        } else {
            this.sendYouTubeCommand("seekTo", [this.ytSeekOffset, true]);
        }

        this.sendYouTubeCommand("playVideo", []);
        if (st && st.name && this.player && !this.player.dead) {
            this.addFloatingText(this.player.x, this.player.y - 28, `📻 ${st.name}`, "#00f0ff");
        }
        this.updateHud();

    }



    adjustYouTubeVolume(delta = 15) {

        const volSlider = document.getElementById("yt-vol-slider");

        const curVol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

        const nextVol = Math.max(0, Math.min(100, curVol + delta));

        this.ytVolume = nextVol;

        if (volSlider) volSlider.value = String(nextVol);

        if (nextVol > 0 && !this.ytMusicEnabled) {

            this.setYouTubeMusicEnabled(true);

        }

        this.sendYouTubeCommand("setVolume", [nextVol]);

    }



    toggleFullMap(forceState = null) {

        this.fullMapOpen = forceState !== null ? Boolean(forceState) : !this.fullMapOpen;
        if (this.fullMapOpen) {
            this.clearHeldInputs();
        }

        const modal = document.getElementById("fullmap-modal");

        if (modal) {

            modal.classList.toggle("hidden", !this.fullMapOpen);

        }

        if (this.fullMapOpen && this.renderer) {

            this.renderer.renderFullMap(this);

        }

    }



    teleportToTile(col, row) {

        this.teleportToBlock(col, row, false);

    }



    tryInteractVehicleTrunk() {
        if (this.director && typeof this.director.interactWithNearestVehicleTrunk === "function") {
            return this.director.interactWithNearestVehicleTrunk();
        }
        return { ok: false };
    }

    triggerFocusMode() {
        if (this.director && typeof this.director.activateFocusMode === "function") {
            return this.director.activateFocusMode();
        }
        return { ok: false };
    }

    tryIntimidateStreetPed(maxDist = 110) {
        if (this.director && typeof this.director.tryIntimidateStreetPed === "function") {
            return this.director.tryIntimidateStreetPed(maxDist);
        }
        return { ok: false };
    }

    toggleBandana(forceState = null) {
        if (
            forceState === null &&
            this.player &&
            this.player.inVehicle &&
            (this.player.inVehicle.gpsTrackerTimer || 0) > 0 &&
            this.director &&
            typeof this.director.tryJamVehicleGpsTracker === "function"
        ) {
            this.director.tryJamVehicleGpsTracker(this.player.inVehicle);
            return;
        }
        if (forceState === null && this.director && typeof this.director.findNearestTrunkVehicle === "function") {
            const trunkVeh = this.director.findNearestTrunkVehicle(58);
            if (trunkVeh) {
                this.player.bandana = !this.player.bandana;
                this.director.interactWithNearestVehicleTrunk();
                this.renderPortraits();
                return;
            }
        }

        this.player.bandana = forceState !== null ? Boolean(forceState) : !this.player.bandana;

        this.audio.playBeep(this.player.bandana ? 520 : 420, 0.06, "triangle", 0.06);

        this.addFloatingText(

            this.player.x,

            this.player.y - 30,

            this.player.bandana ? "🧣 HEIST BANDANA ON" : "🧣 BANDANA OFF",

            "#ff2a85"

        );

        this.renderPortraits();

    }



    initCharacterSelectModal() {

        const nickInput = document.getElementById("start-nickname-input");

        const randBtn = document.getElementById("btn-random-nickname");

        const cards = document.querySelectorAll(".char-select-card");

        const serverBtns = document.querySelectorAll(".server-slot-btn");



        if (nickInput && this.net) {

            nickInput.value = this.net.playerName || "LUCIA #97";

        }



        // Bind the 3 Official Server Slot Buttons (VICE26 / MIAMI86 / KEYS305)

        const currentRoom = (this.net && typeof this.net.normalizeRoomCode === "function")
            ? this.net.normalizeRoomCode(this.net.roomCode || "VICE26")
            : ((this.net && this.net.roomCode) || "VICE26");

        serverBtns.forEach((btn) => {
            const btnRoom = (this.net && typeof this.net.normalizeRoomCode === "function")
                ? this.net.normalizeRoomCode(btn.getAttribute("data-room") || "VICE26")
                : (btn.getAttribute("data-room") || "VICE26");

            if (btnRoom === currentRoom) {

                serverBtns.forEach((b) => b.classList.remove("active-server"));

                btn.classList.add("active-server");

            }

            btn.addEventListener("click", () => {

                serverBtns.forEach((b) => b.classList.remove("active-server"));

                btn.classList.add("active-server");

                const targetRoom = btn.getAttribute("data-room") || "VICE26";

                if (this.audio) {

                    this.audio.playBeep(740, 0.05, "sine", 0.05);

                }

                if (this.net && typeof this.net.switchServer === "function") {

                    this.net.switchServer(targetRoom);

                }

            });

        });

        if (this.net && typeof this.net.updateServerListUI === "function") {

            this.net.updateServerListUI();

        }



        // Restore previously saved character if any

        const savedChar = (this.net && this.net.safeGetStorage("vc97_mp_char")) || "LUCIA";

        cards.forEach((card) => {

            if (card.getAttribute("data-char-id") === savedChar) {

                cards.forEach((c) => c.classList.remove("active-mug"));

                card.classList.add("active-mug");

            }

            card.addEventListener("click", () => {

                cards.forEach((c) => c.classList.remove("active-mug"));

                card.classList.add("active-mug");

                const cId = card.getAttribute("data-char-id") || "LUCIA";

                if (this.audio) {

                    this.audio.playBeep(680, 0.05, "square", 0.05);

                }

                // Update auto-generated nickname prefix if user hasn't typed a custom one yet

                if (nickInput) {

                    const cur = nickInput.value.trim();

                    if (!cur || /^(LUCIA|JASON|TOMMY|TREVOR|CJ|NIKO|CLAUDE|BIGSMOKE|CROCKETT|VALERIA|DETECTIVE|GOURANGA)\s*#?\d*$/i.test(cur)) {

                        const num = Math.floor(100 + Math.random() * 900);

                        nickInput.value = `${cId} #${num}`;

                    }

                }

            });

        });



        if (randBtn && nickInput) {

            const presets = [

                "TREVOR_TP", "CJ_GROVE", "NIKO_LC", "TOMMY_86",

                "LUCIA_26", "JASON_305", "CLAUDE_III", "BIG_SMOKE",

                "CROCKETT_84", "OCEAN_KING"

            ];

            randBtn.addEventListener("click", () => {

                const pick = presets[Math.floor(Math.random() * presets.length)];

                const num = Math.floor(10 + Math.random() * 89);

                nickInput.value = `${pick}_${num}`.slice(0, 18);

                if (this.audio) this.audio.playBeep(760, 0.04, "triangle", 0.05);

            });

        }



        this.initAllTimeHighScores();

        this.renderAllTimeHighScoresUI();

    }



    initAllTimeHighScores() {

        const defaultScores = [

            { name: "TOMMY_86", charId: "TOMMY", score: 50000, color: "#38bdf8", econVer: 2 },

            { name: "CROCKETT", charId: "CROCKETT", score: 35000, color: "#fde047", econVer: 2 },

            { name: "TREVOR_TP", charId: "TREVOR", score: 20000, color: "#f97316", econVer: 2 },

            { name: "CJ_GROVE", charId: "CJ", score: 12500, color: "#22c55e", econVer: 2 },

            { name: "JASON_305", charId: "JASON", score: 7500, color: "#00f0ff", econVer: 2 }

        ];

        this.allTimeScores = defaultScores.slice();

        try {

            const raw = window.localStorage ? window.localStorage.getItem("vc26_alltime_scores_v3") : null;

            if (raw) {

                const parsed = JSON.parse(raw);

                if (Array.isArray(parsed) && parsed.length > 0) {

                    this.mergeAllTimeScores(parsed, false, 2);

                }

            }

        } catch (_e) {}

    }



    saveAllTimeScores() {

        try {

            if (window.localStorage && Array.isArray(this.allTimeScores)) {

                window.localStorage.setItem("vc26_alltime_scores_v3", JSON.stringify(this.allTimeScores.slice(0, 10)));

            }

        } catch (_e) {}

    }



    getAllTimeHighScores() {

        if (!Array.isArray(this.allTimeScores)) {

            this.initAllTimeHighScores();

        }

        return this.allTimeScores.slice(0, 5);

    }



    recordHighScore(name, charId, score, color = "#ff2a85", broadcast = true) {

        const numScore = Math.floor(Number(score) || 0);

        if (numScore <= 0) return false;

        const cleanName = String(name || "PLAYER").trim().slice(0, 18).toUpperCase();

        if (!cleanName) return false;



        if (!Array.isArray(this.allTimeScores)) {

            this.initAllTimeHighScores();

        }



        let updated = false;

        const existing = this.allTimeScores.find((e) => String(e.name).toUpperCase() === cleanName);

        if (existing) {

            if (numScore > existing.score) {

                existing.score = numScore;
                existing.econVer = 2;

                if (charId) existing.charId = charId;

                if (color) existing.color = color;

                updated = true;

            }

        } else {

            const minTop5 = this.allTimeScores.length < 5 ? 0 : (this.allTimeScores[4] ? this.allTimeScores[4].score : 0);

            if (numScore > minTop5 || this.allTimeScores.length < 10) {

                this.allTimeScores.push({

                    name: cleanName,

                    charId: charId || "LUCIA",

                    score: numScore,

                    color: color || "#ff2a85",
                    econVer: 2

                });

                updated = true;

            }

        }



        if (updated) {

            this.allTimeScores.sort((a, b) => (b.score || 0) - (a.score || 0));

            if (this.allTimeScores.length > 10) {

                this.allTimeScores.length = 10;

            }

            this.saveAllTimeScores();

            this.renderAllTimeHighScoresUI();

            if (broadcast && this.net && typeof this.net.broadcastHighScore === "function") {

                this.net.broadcastHighScore(cleanName, charId || "LUCIA", numScore, color || "#ff2a85");

            }

        }

        return updated;

    }



    mergeAllTimeScores(entries, render = true, defaultEconVer = 1) {

        if (!Array.isArray(entries)) return;

        if (!Array.isArray(this.allTimeScores)) {

            this.allTimeScores = [];

        }

        for (const item of entries) {

            if (!item || !item.name) continue;

            const sc = Math.floor(Number(item.score) || 0);

            if (sc <= 0) continue;
            const entryEconVer = Number(item.econVer) || defaultEconVer;
            // Filter out legacy pre-v2 millionaire entries from un-migrated server state
            if (entryEconVer < 2 && sc > 50000) continue;

            const cleanName = String(item.name).trim().slice(0, 18).toUpperCase();

            const existing = this.allTimeScores.find((e) => String(e.name).toUpperCase() === cleanName);

            if (existing) {

                if (sc > existing.score) {

                    existing.score = sc;
                    existing.econVer = 2;

                    if (item.charId) existing.charId = item.charId;

                    if (item.color) existing.color = item.color;

                }

            } else {

                this.allTimeScores.push({

                    name: cleanName,

                    charId: item.charId || "LUCIA",

                    score: sc,

                    color: item.color || "#00f0ff",
                    econVer: 2

                });

            }

        }

        this.allTimeScores.sort((a, b) => (b.score || 0) - (a.score || 0));

        if (this.allTimeScores.length > 10) {

            this.allTimeScores.length = 10;

        }

        this.saveAllTimeScores();

        if (render) {

            this.renderAllTimeHighScoresUI();

        }

    }



    renderAllTimeHighScoresUI() {

        const listEl = document.getElementById("alltime-scores-list");

        if (!listEl) return;

        const top5 = this.getAllTimeHighScores();

        const myName = String((this.net && this.net.playerName) || (this.player && this.player.nickname) || "").trim().toUpperCase();

        const medals = ["🥇 #1", "🥈 #2", "🥉 #3", "#4", "#5"];



        listEl.innerHTML = "";

        top5.forEach((entry, idx) => {

            const card = document.createElement("div");

            const isSelf = myName && String(entry.name).toUpperCase() === myName;

            card.className = `alltime-score-card rank-${idx + 1}${isSelf ? " is-self" : ""}`;



            const topRow = document.createElement("div");

            topRow.className = "at-row-top";



            const rankSpan = document.createElement("span");

            rankSpan.className = "at-rank";

            rankSpan.textContent = medals[idx] || `#${idx + 1}`;



            const nameSpan = document.createElement("span");

            nameSpan.className = "at-name";

            if (entry.color) nameSpan.style.color = entry.color;

            nameSpan.textContent = entry.name;



            topRow.appendChild(rankSpan);

            topRow.appendChild(nameSpan);



            const scoreSpan = document.createElement("div");

            scoreSpan.className = "at-score";

            scoreSpan.textContent = `$${Number(entry.score || 0).toLocaleString()}`;



            card.appendChild(topRow);

            card.appendChild(scoreSpan);

            listEl.appendChild(card);

        });

    }



    resolveSpeakerPortraitInfo(speakerRaw = "JASON") {
        const up = String(speakerRaw || "JASON").toUpperCase();
        if (
            up.includes("VICE NET") ||
            up.includes("FLASH FM") ||
            up.includes("BREAKING NEWS") ||
            up.includes("VICE CITY ONLINE") ||
            up.includes("SERVER BOUNTY") ||
            up.includes("TURF WAR") ||
            up.includes("BOMB SHOP") ||
            up.includes("PAY 'N' SPRAY")
        ) {
            return { charId: "VICENET", label: "VICENET 5G", isSystem: true };
        }
        if (up.includes("DRE") || up.includes("PRIEST") || up.includes("ONLY RAW")) {
            return { charId: "DREQUAN", label: "DRE'QUAN", isSystem: false };
        }
        if (up.includes("DIMEZ") || up.includes("ROXY") || up.includes("BAE")) {
            return { charId: "REALDIMEZ", label: "REAL DIMEZ", isSystem: false };
        }
        if (up.includes("RAUL") || up.includes("BAUTISTA") || up.includes("FIXER") || up.includes("CAL HAMPTON") || up.includes("JACK")) {
            return { charId: "RAUL", label: "RAUL", isSystem: false };
        }
        if (up.includes("CALISTA") || up.includes("ATOLL")) {
            return { charId: "CALISTA", label: "CALISTA", isSystem: false };
        }
        if (up.includes("BOOBIE") || up.includes("TOUSSAINT")) {
            return { charId: "BOOBIE", label: "BOOBIE IKE", isSystem: false };
        }
        if (up.includes("TOMMY") || up.includes("VERCETTI") || up.includes("DIAZ") || up.includes("SONNY")) {
            return { charId: "TOMMY", label: "TOMMY", isSystem: false };
        }
        if (up.includes("MITCH") || up.includes("TREVOR") || up.includes("BROTHERHOOD")) {
            return { charId: "TREVOR", label: "TREVOR", isSystem: false };
        }
        if (up.includes("CROCKETT") || up.includes("VCPD") || up.includes("SERA") || up.includes("VCIA") || up.includes("CORRECTIONS") || up.includes("PENITENTIARY") || up.includes("CORTEZ") || up.includes("SWAT")) {
            return { charId: "CROCKETT", label: "VCPD", isSystem: false };
        }
        if (up.includes("LUCIA")) {
            return { charId: "LUCIA", label: "LUCIA", isSystem: false };
        }
        return { charId: "JASON", label: "JASON", isSystem: false };
    }

    renderPortraits(pagerSpeaker = "JASON") {

        if (!this.renderer || !this.renderer.drawCharacterPortrait) return;

        const alert = this.wantedLevel > 0 && !this.player.ankleScrambled;

        const activeChar = (this.player && this.player.charId) || "LUCIA";

        this.renderer.drawCharacterPortrait(

            document.getElementById("lucia-hud-portrait"),

            activeChar,

            { bandana: this.player.bandana, alert }

        );

        document.querySelectorAll(".char-select-canvas").forEach((canvasEl) => {

            const cId = canvasEl.getAttribute("data-char") || "LUCIA";

            this.renderer.drawCharacterPortrait(canvasEl, cId, { bandana: false, alert: false });

        });

        const spInfo = this.resolveSpeakerPortraitInfo(pagerSpeaker);

        this.renderer.drawCharacterPortrait(

            document.getElementById("pager-portrait"),

            spInfo.charId,

            { bandana: this.player.bandana && spInfo.charId === "LUCIA", alert }

        );

    }



    startGame() {
        this.started = true;
        this._hasEnteredModal = true;
        this._resetLoopClock = true;
        this._pendingStartGame = !this.worldReady;

        // Immediately hide #start-modal so the player is NEVER stuck on the modal screen
        const modal = document.getElementById("start-modal");
        if (modal) modal.classList.add("hidden");

        try {
            if (this.audio && typeof this.audio.resume === "function") {
                this.audio.resume();
            }
            if (this.ytMusicEnabled && typeof this.setYouTubeMusicEnabled === "function") {
                this.setYouTubeMusicEnabled(true);
            }
        } catch (e) {
            console.warn("audio.resume warning:", e);
        }

        if (this.input) {
            this.input.up = false;
            this.input.down = false;
            this.input.left = false;
            this.input.right = false;
            this.input.handbrake = false;
            this.input.shoot = false;
            this.input.sprint = false;
        }

        // Read chosen Nickname, Server Slot & Character from the Selection Modal
        const nickInput = document.getElementById("start-nickname-input");
        const activeSrvBtn = document.querySelector(".server-slot-btn.active-server");
        const activeCard = document.querySelector(".char-select-card.active-mug");

        const chosenCharId = activeCard ? (activeCard.getAttribute("data-char-id") || "LUCIA") : (this.player.charId || "LUCIA");
        const chosenPedType = activeCard ? (activeCard.getAttribute("data-ped-type") || "lucia") : (this.player.pedType || "lucia");
        const chosenColor = activeCard ? (activeCard.getAttribute("data-color") || "#ff2a85") : "#ff2a85";
        const chosenNick = (nickInput && nickInput.value.trim()) ? nickInput.value.trim().toUpperCase() : `${chosenCharId} #97`;
        const chosenRoom = activeSrvBtn ? (activeSrvBtn.getAttribute("data-room") || "VICE26") : "VICE26";

        this.player.charId = chosenCharId;
        this.player.pedType = chosenPedType;
        this.player.nickname = chosenNick;
        this.player.weapon = "PISTOL"; // Everyone starts with the exact same loadout & stats

        if (this.jason) {
            this.jason.pedType = chosenCharId === "JASON" ? "lucia" : "jason";
        }

        try {
            if (this.net && typeof this.net.setIdentity === "function") {
                this.net.setIdentity(chosenNick, chosenCharId, chosenPedType, chosenColor, chosenRoom);
            }
            this.recordHighScore(chosenNick, chosenCharId, this.cash, chosenColor, true);
            this.renderAllTimeHighScoresUI();
            this.renderPortraits();
            this.updateHud();
        } catch (e) {
            console.warn("startGame UI init warning:", e);
        }

        try {
            if (this.ytMusicEnabled) {
                const volSlider = document.getElementById("yt-vol-slider");
                const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);
                this.sendYouTubeCommand("unMute", []);
                this.sendYouTubeCommand("setVolume", [vol]);
                this.sendYouTubeCommand("playVideo", []);
                setTimeout(() => this.sendYouTubeCommand("setVolume", [vol]), 400);
            }
        } catch (e) {
            console.warn("startGame YouTube warning:", e);
        }

        const displayRoom = chosenRoom === "VICE97" ? "VICE26" : chosenRoom;
        this.addFloatingText(this.player.x, this.player.y - 32, `🎭 ${chosenNick} (${chosenCharId}) READY!`, chosenColor);
        this.sendPager(
            "VICE CITY ONLINE",
            `Welcome to Vice City 26, ${chosenNick}! Playing as ${chosenCharId} in room [${displayRoom}].`,
            true
        );
        this.showDistrictBanner(`SOUTH BEACH — ${chosenNick}`);
    }



    cycleWeapon(dir = 1) {

        const list = this.player.weaponsOwned;

        const idx = list.indexOf(this.player.weapon);

        const nextIdx = (idx + dir + list.length) % list.length;

        this.player.weapon = list[nextIdx];

        this.player.weaponDrawnTimer = 0;

        const wSpec = WEAPON_SPECS[this.player.weapon] || { name: this.player.weapon };
        const wLabel = this.player.weapon === "FIST" ? "👊 FIST" : `🔫 ${wSpec.name}`;
        this.addFloatingText(this.player.x, this.player.y - 26, wLabel, "#ffd13b");
        if (this.activeInterior) {
            if (!this.interiorPopups) this.interiorPopups = [];
            this.interiorPopups.push({ x: this.interiorX, y: this.interiorY - 12, text: wLabel, color: "#ffd13b", life: 0.95 });
        }
        this.audio.playBeep(620, 0.04, "square", 0.04);
        this.updateHud();

    }



    getDoorThresholdPos(intr) {

        if (!intr) return { x: 0, y: 0, fnv: [0, 1] };

        const fnv = ({ S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] })[intr.facing] || [0, 1];

        if (!intr.facing || intr.isEstatePortico) {

            return { x: intr.doorX, y: intr.doorY, fnv };

        }

        const tcx = Math.floor(intr.doorX / TILE_SIZE) * TILE_SIZE + TILE_SIZE * 0.5;

        const tcy = Math.floor(intr.doorY / TILE_SIZE) * TILE_SIZE + TILE_SIZE * 0.5;

        // Building wall is at tcx - fnv * 32; glowing sidewalk welcome mat is centered at tcx - fnv * 18.
        return {

            x: tcx - fnv[0] * 18,

            y: tcy - fnv[1] * 18,

            fnv

        };

    }



    isTouchingInteriorDoor(intr, px = this.player.x, py = this.player.y) {

        if (!intr) return false;

        const { x, y, fnv } = this.getDoorThresholdPos(intr);

        if (!intr.facing || intr.isEstatePortico) {

            return Math.hypot(px - x, py - y) <= 18;

        }

        const normalDist = Math.abs((px - x) * fnv[0] + (py - y) * fnv[1]);

        const lateralDist = Math.abs((px - x) * fnv[1] - (py - y) * fnv[0]);

        return normalDist <= 13.0 && lateralDist <= 20.0;

    }



    enterInterior(interiorOrId) {

        if (!Array.isArray(this.map.interiors)) return false;

        const intr = typeof interiorOrId === "string"

            ? this.map.interiors.find((it) => it.id === interiorOrId)

            : interiorOrId;

        if (!intr) return false;



        const p = this.player;

        if (p.inVehicle) {

            const v = p.inVehicle;
            const prevSeat = p.seatIndex || 0;

            if (prevSeat === 0) {
                v.driver = null;
                v.vx = 0;
                v.vy = 0;
                v.speed = 0;
                v.drifting = false;
                v.sirenActive = false;
                v._worldModified = true;
                v.isStaticParked = false;
                if (this.net && typeof this.net.broadcastWorldEvent === "function" && v.id) {
                    const flags =
                        (v.destroyed ? 1 : 0) |
                        (v.frontDented ? 4 : 0) |
                        (v.rearDented ? 8 : 0) |
                        (v.heavyDented ? 16 : 0) |
                        (v.fireExtinguished ? 128 : 0);
                    this.net.broadcastWorldEvent({
                        kind: "VEH_EXIT",
                        vehId: v.id,
                        specKey: v.specKey || "MINT_STALLION",
                        seat: 0,
                        x: Math.round(v.x),
                        y: Math.round(v.y),
                        z: Math.round((v.z || 2.0) * 100) / 100,
                        a: Math.round((v.angle || 0) * 1000) / 1000,
                        hp: Math.round(v.hp || 100),
                        flags,
                        remapIdx: v.remapIdx || 0
                    });
                }
            }

            v.hasJason = false;

            p.inVehicle = null;
            p.seatIndex = 0;

            if (this.jason) this.jason.inVehicle = null;

        }

        p.vx = 0;
        p.vy = 0;
        p._velX = 0;
        p._velY = 0;
        p._turnBank = 0;
        p.enteringVehicle = null;
        p._enteringTimer = 0;
        p.emoteTimer = 0;
        p.isMoving = false;

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }



        // Remember exterior coordinates right outside this venue's door on the sidewalk
        const { x: dtx, y: dty, fnv: dn } = this.getDoorThresholdPos(intr);
        const doorBaseZ = p.z || 2.0;
        p.x = dtx + dn[0] * 20;
        p.y = dty + dn[1] * 20;
        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            const resolvedP = this.map.resolveCircleBuildingCollision(p.x, p.y, p.radius || 8, doorBaseZ, false);
            p.x = resolvedP.x;
            p.y = resolvedP.y;
        }
        p.z = this.map.getHeightAtPixel(p.x, p.y, 4.0);
        if (this.jason) {
            this.jason.x = p.x - dn[1] * 24;
            this.jason.y = p.y + dn[0] * 24;
            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const resolvedJ = this.map.resolveCircleBuildingCollision(this.jason.x, this.jason.y, this.jason.radius || 8, p.z || 2.0, false);
                this.jason.x = resolvedJ.x;
                this.jason.y = resolvedJ.y;
            }
            this.jason.z = p.z;
        }



        if (window.ShopInteriors && typeof window.ShopInteriors.orientInterior === "function") {
            window.ShopInteriors.orientInterior(intr);
        }
        const pose = (window.ShopInteriors && typeof window.ShopInteriors.getEntrancePose === "function")
            ? window.ShopInteriors.getEntrancePose(intr)
            : { spawnX: intr.w * 0.5, spawnY: intr.h - 120, spawnAngle: -Math.PI * 0.5, partnerX: intr.w * 0.5 + 38, partnerY: intr.h - 112, partnerAngle: -Math.PI * 0.5 };
        this.activeInterior = intr;
        this.interiorTracers = [];
        this.interiorPopups = [];
        this.interiorCooldown = 0.85;
        this.interiorX = pose.spawnX;
        this.interiorY = pose.spawnY;
        this.interiorAngle = pose.spawnAngle;
        this.interiorJasonX = pose.partnerX;
        this.interiorJasonY = pose.partnerY;
        this.interiorJasonAngle = pose.partnerAngle;
        if (this.player) {
            this.player.weaponDrawnTimer = 0;
            this.player.muzzleTimer = 0;
            this.player.punchTimer = 0;
            this.player.isMoving = false;
        }
        this.input.shoot = false;
        if (this.audio && typeof this.audio.resetLoops === "function") {
            this.audio.resetLoops();
        }



        if (!this.vaultLockouts) this.vaultLockouts = {};
        const nowMs = Date.now();
        if (Array.isArray(intr.stations)) {
            for (const st of intr.stations) {
                const vKey = `${intr.id}_${st.id || st.label || "st"}`;
                const lockUntil = Math.max(st.cooldownUntilMs || 0, this.vaultLockouts[vKey] || 0);
                st.cooldown = lockUntil > nowMs ? (lockUntil - nowMs) * 0.001 : 0;
            }
        }



        this.fadeAlpha = 1.0;



        this.showBigBanner(intr.name, intr.subtitle, intr.accent || "#00f0ff", 2.6);

        this.updateHud();

        return true;

    }



    exitInterior() {

        if (!this.activeInterior) return;

        const intr = this.activeInterior;

        this.activeInterior = null;
        this.interiorTracers = [];
        this.interiorPopups = [];

        this.doorRearmBlock = intr;

        this.interiorCooldown = 0.6;

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }

        const { x: dtx, y: dty, fnv: dnx } = this.getDoorThresholdPos(intr);
        const exitBaseZ = this.player.z || 2.0;
        this.player.x = dtx + dnx[0] * 20;
        this.player.y = dty + dnx[1] * 20;
        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            const resolvedP = this.map.resolveCircleBuildingCollision(this.player.x, this.player.y, this.player.radius || 8, exitBaseZ, false);
            this.player.x = resolvedP.x;
            this.player.y = resolvedP.y;
        }
        this.player.z = this.map.getHeightAtPixel(this.player.x, this.player.y, 4.0);
        this.player.angle = Math.atan2(dnx[1], dnx[0]);
        this.player.vx = 0;
        this.player.vy = 0;
        this.player._velX = 0;
        this.player._velY = 0;
        this.player._turnBank = 0;
        this.player.enteringVehicle = null;
        this.player._enteringTimer = 0;
        this.player.isMoving = false;
        if (this.jason) {
            this.jason.x = this.player.x - dnx[1] * 24;
            this.jason.y = this.player.y + dnx[0] * 24;
            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const resolvedJ = this.map.resolveCircleBuildingCollision(this.jason.x, this.jason.y, this.jason.radius || 8, this.player.z || 2.0, false);
                this.jason.x = resolvedJ.x;
                this.jason.y = resolvedJ.y;
            }
            this.jason.z = this.player.z;
            this.jason.angle = this.player.angle;
        }

        this.renderer.camX = this.player.x;

        this.renderer.camY = this.player.y;

        this.renderer.camZBlocks = this.player.z;

        this.fadeAlpha = 1.0;

        const cleanVenueName = String(intr.name || intr.id || "VENUE").replace(/^[^\w(]+\s*/, "").trim();
        this.addFloatingText(this.player.x, this.player.y - 24, `🚪 EXITED ${cleanVenueName}`, "#38bdf8");

        this.updateHud();

    }



    /**

     * Shop stations (restaurants, hotels, gun shops, bars, stores...): priced pads that apply a

     * data-driven `effect` { hp, armor, weapon, ammo, speed, clearWanted, setMinutes, bandanaToggle, heist, wanted }.

     */

    purchaseInteriorStation(st) {

        const p = this.player;

        const fx = st.effect || {};

        const price = st.price || 0;



        if (price > 0 && this.cash < price) {

            st.cooldown = 1.2;

            this.audio.playBeep(180, 0.16, "sawtooth", 0.06);

            this.addFloatingText(p.x, p.y - 24, `NOT ENOUGH CASH ($${price.toLocaleString("en-US")})`, "#ef4444");

            return;

        }

        if (fx.bribe && this.wantedLevel <= 0) {

            st.cooldown = 1.2;

            this.addFloatingText(p.x, p.y - 24, "NO HEAT TO BRIBE AWAY", "#94a3b8");

            return;

        }

        if (fx.hp && !fx.heist && p.hp >= p.maxHp && !fx.armor && !fx.weapon && !fx.speed && !fx.clearWanted && !fx.bandanaToggle) {

            st.cooldown = 1.2;

            this.addFloatingText(p.x, p.y - 24, "ALREADY AT FULL HEALTH", "#94a3b8");

            return;

        }



        st.cooldown = st.cooldownSec || 5.0;

        if (price > 0) {

            this.cash -= price;

            this.addFloatingText(p.x, p.y - 22, `-$${price.toLocaleString("en-US")}`, "#f87171");

        }

        if (fx.hp) p.hp = Math.min(p.maxHp, p.hp + fx.hp);

        if (fx.armor) p.armor = Math.min(100, (p.armor || 0) + fx.armor);

        if (fx.weapon) {

            if (!p.weaponsOwned.includes(fx.weapon)) p.weaponsOwned.push(fx.weapon);

            p.ammo[fx.weapon] = Math.min(999, (p.ammo[fx.weapon] || 0) + (fx.ammo || 30));

            p.weapon = fx.weapon;

        }

        if (fx.speed) p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, fx.speed);

        if (fx.bandanaToggle) {

            p.bandana = !p.bandana;

            if (typeof this.renderPortraits === "function") this.renderPortraits();

        }

        if (fx.clearWanted) this.setWantedLevel(0);

        if (fx.bribe) this.setWantedLevel(Math.max(0, this.wantedLevel - fx.bribe));

        if (fx.extraLife) this.lives = Math.min(9, (this.lives || 3) + fx.extraLife);

        if (fx.jailCards) this.jailFreeCards = Math.min(9, (this.jailFreeCards || 0) + fx.jailCards);

        if (fx.multiplier) {
            if (typeof this.addMultiplier === "function") {
                this.addMultiplier(fx.multiplier);
            } else {
                this.multiplier = Math.min(5, (this.multiplier || 1) + fx.multiplier);
            }
        }

        if (typeof fx.setMinutes === "number") {

            this.worldMinutes = fx.setMinutes;

            this.syncDayNightCycle();

        }

        if (Array.isArray(fx.heist)) {

            const loot = Math.min(400, fx.heist[0] + Math.floor(Math.random() * (fx.heist[1] - fx.heist[0] + 1)));

            this.addCash(loot, "HOLD-UP!", true);
            if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(180);

            this.setWantedLevel(Math.max(this.wantedLevel, fx.wanted || 3));

            this.audio.playShot("PISTOL");
            this.recordStationCooldown(this.activeInterior, st, Math.max(90.0, st.cooldownSec || 90.0), true);
            if (this.activeInterior && Array.isArray(this.activeInterior.npcs)) {
                for (const npc of this.activeInterior.npcs) {
                    npc._robbedTimer = 14.0;
                }
            }

        } else {

            this.audio.playCashSound();
            const isMajorReward = Boolean(fx.multiplier || fx.extraLife || fx.jailCards);
            const cdSec = isMajorReward ? Math.max(120.0, st.cooldownSec || 120.0) : (st.cooldownSec || 5.0);
            this.recordStationCooldown(this.activeInterior, st, cdSec, isMajorReward);

        }

        this.showBigBanner(st.label.split(" — ")[0], fx.desc || "PURCHASED", st.color || "#39ff14", 1.8);

        this.updateHud();
        if (this.net && typeof this.net.broadcastStateNow === "function") {
            this.net.broadcastStateNow();
        }

    }

    recordStationCooldown(intr, st, cooldownSec, syncToServer = false) {
        if (!st) return;
        const sec = Math.max(1, Number(cooldownSec) || 5);
        st.cooldown = sec;
        const untilMs = Date.now() + sec * 1000;
        st.cooldownUntilMs = untilMs;
        if (!this.vaultLockouts) this.vaultLockouts = {};
        const intrId = (intr && intr.id) ? intr.id : (this.activeInterior ? this.activeInterior.id : "INTR");
        const vKey = `${intrId}_${st.id || st.label || "st"}`;
        this.vaultLockouts[vKey] = untilMs;
        if (syncToServer && this.net && typeof this.net.broadcastWorldEvent === "function") {
            this.net.broadcastWorldEvent({
                kind: "VAULT_ROBBED",
                vaultKey: vKey,
                cooldownSec: Math.round(sec)
            });
        }
    }

    applyNetworkVaultCooldown(vaultKey, remSec) {
        if (!vaultKey || !(remSec > 0)) return;
        if (!this.vaultLockouts) this.vaultLockouts = {};
        const untilMs = Date.now() + remSec * 1000;
        this.vaultLockouts[vaultKey] = untilMs;
        if (this.activeInterior && Array.isArray(this.activeInterior.stations)) {
            for (const st of this.activeInterior.stations) {
                const k = `${this.activeInterior.id}_${st.id || st.label || "st"}`;
                if (k === vaultKey) {
                    st.cooldownUntilMs = untilMs;
                    st.cooldown = remSec;
                }
            }
        }
    }



    triggerInteriorStation(st) {

        if (!st || (st.cooldown || 0) > 0) return;

        if (st.effect) {

            this.purchaseInteriorStation(st);

            return;

        }

        const p = this.player;

        const grantWep = (wKey, ammoAmt) => {

            if (!p.weaponsOwned.includes(wKey)) p.weaponsOwned.push(wKey);

            p.ammo[wKey] = Math.min(999, (p.ammo[wKey] || 0) + ammoAmt);

            p.weapon = wKey;

        };

        // Handle interactive Shop Stations (st.action & st.cost / st.reward)
        if (st.action) {
            const cost = Math.max(0, Number(st.cost) || 0);
            if (st.action === "BUY_SNACK" && p.hp >= p.maxHp) {
                st.cooldown = 1.2;
                this.addFloatingText(p.x, p.y - 24, "ALREADY AT FULL HEALTH", "#94a3b8");
                return;
            }
            if ((st.action === "BUY_MEAL" || st.action === "BUY_ENERGY") && p.hp >= p.maxHp && (p.speedBoostTimer || 0) >= 8.0) {
                st.cooldown = 1.2;
                this.addFloatingText(p.x, p.y - 24, "ALREADY FULL & ENERGIZED", "#94a3b8");
                return;
            }
            if (st.action === "BUY_ARMOR" && (p.armor || 0) >= 100) {
                st.cooldown = 1.2;
                this.addFloatingText(p.x, p.y - 24, "ALREADY AT FULL ARMOR", "#94a3b8");
                return;
            }
            if (cost > 0 && this.cash < cost) {
                if (this.audio && this.audio.playTone) this.audio.playTone(150, 0.16, "sawtooth", 0.25);
                this.showBigBanner("INSUFFICIENT CASH", `NEED $${cost.toLocaleString()} FOR ${st.label.split(" (")[0]}`, "#ef4444", 1.8);
                return;
            }
            if (cost > 0) {
                this.cash -= cost;
            }
            st.cooldown = st.action === "ROB_REGISTER" ? 120.0 : (st.action === "QUICK_FIT" ? 60.0 : 2.5);
            let bannerTitle = st.label.split(" (")[0];
            let bannerSub = st.sub || "PURCHASED!";
            let bannerCol = st.color || "#39ff14";

            switch (st.action) {
                case "BUY_PISTOL":
                    grantWep("PISTOL", 40);
                    if (this.audio && this.audio.playPickup) this.audio.playPickup();
                    bannerSub = "EQUIPPED 9MM PISTOL (+40 ROUNDS)";
                    break;
                case "BUY_UZI":
                    grantWep("UZI", 80);
                    if (this.audio && this.audio.playPickup) this.audio.playPickup();
                    bannerSub = "EQUIPPED MICRO-UZI (+80 ROUNDS)";
                    break;
                case "BUY_SHOTGUN":
                    grantWep("SHOTGUN", 25);
                    if (this.audio && this.audio.playPickup) this.audio.playPickup();
                    bannerSub = "EQUIPPED PUMP SHOTGUN (+25 SHELLS)";
                    break;
                case "BUY_ROCKET":
                    grantWep("ROCKET", 8);
                    if (this.audio && this.audio.playPickup) this.audio.playPickup();
                    bannerSub = "EQUIPPED HEAVY ROCKET LAUNCHER (+8 ROCKETS)";
                    break;
                case "BUY_ARMOR":
                    p.armor = 100;
                    if (this.audio && this.audio.playPickup) this.audio.playPickup();
                    bannerSub = "+100% KEVLAR TACTICAL BODY ARMOR!";
                    break;
                case "BUY_SNACK": {
                    const healAmt = Math.max(10, Number(st.healHp) || Math.round(p.maxHp * 0.35));
                    p.hp = Math.min(p.maxHp, p.hp + healAmt);
                    bannerSub = `+${healAmt} HP RESTORED!`;
                    break;
                }
                case "BUY_MEAL":
                    p.hp = p.maxHp;
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 16.0);
                    bannerSub = "+100% FULL HEALTH + 16S SPRINT BOOST!";
                    break;
                case "BUY_DRINK":
                    p.hp = p.maxHp;
                    p.armor = Math.min(100, (p.armor || 0) + 50);
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 14.0);
                    bannerSub = "100% HEALTH RESTORED + +50 ARMOR!";
                    break;
                case "BUY_ENERGY":
                    p.hp = p.maxHp;
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 20.0);
                    bannerSub = "100% FULL HEALTH & 20S ADRENALINE SPEED BOOST!";
                    break;
                case "BUY_COCKTAIL":
                    p.hp = p.maxHp;
                    p.armor = Math.min(100, (p.armor || 0) + 25);
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 18.0);
                    bannerSub = "100% HP + 25 ARMOR + TROPICAL RUSH!";
                    break;
                case "RENT_SUITE":
                    p.hp = p.maxHp;
                    p.armor = 100;
                    this.setWantedLevel(Math.max(0, (this.wantedLevel || 0) - 2));
                    bannerSub = "100% HP & ARMOR + 2★ WANTED CLEARED!";
                    break;
                case "CHANGE_OUTFIT":
                    p.hp = p.maxHp;
                    p.bandana = !p.bandana;
                    this.setWantedLevel(0);
                    this.renderPortraits();
                    bannerSub = "NEW DISGUISE! ALL WANTED STARS CLEARED!";
                    break;
                case "BUY_OUTFIT_1":
                    p.hp = p.maxHp;
                    p.bandana = !p.bandana;
                    this.setWantedLevel(Math.max(0, (this.wantedLevel || 0) - 2));
                    this.renderPortraits();
                    bannerSub = "FRESH VICE THREADS! 2★ WANTED CLEARED!";
                    break;
                case "QUICK_FIT":
                    this.recordStationCooldown(this.activeInterior, st, 60.0, false);
                    p.bandana = !p.bandana;
                    this.setWantedLevel(Math.max(0, (this.wantedLevel || 0) - 1));
                    this.renderPortraits();
                    bannerSub = "QUICK FITTING CABIN CHANGE! -1★ WANTED!";
                    break;
                case "BUY_OUTFIT_2":
                    p.hp = p.maxHp;
                    p.armor = Math.min(100, (p.armor || 0) + 50);
                    p.bandana = !p.bandana;
                    this.setWantedLevel(0);
                    this.renderPortraits();
                    bannerSub = "PASTEL LINEN SUIT! +50 ARMOR & 0 WANTED!";
                    break;
                case "BUY_OUTFIT_VIP":
                    this.recordStationCooldown(this.activeInterior, st, 120.0, true);
                    p.hp = p.maxHp;
                    p.armor = 100;
                    p.bandana = !p.bandana;
                    if (typeof this.addMultiplier === "function") {
                        this.addMultiplier(1);
                    } else {
                        this.multiplier = Math.min(5, (this.multiplier || 1) + 1);
                    }
                    this.setWantedLevel(0);
                    this.renderPortraits();
                    bannerSub = "VIP COUTURE! +100 ARMOR, +1 MULTIPLIER & 0 WANTED!";
                    break;
                case "HOTEL_PERK": {
                    const stash = Math.min(250, Number(st.reward) || 250);
                    this.recordStationCooldown(this.activeInterior, st, 120.0, true);
                    p.hp = p.maxHp;
                    p.armor = Math.min(100, (p.armor || 0) + 50);
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 20.0);
                    this.addCash(stash, "🛎️ VIP GUEST STASH!", true);
                    if (this.map && this.map.objectEngine && typeof this.map.objectEngine.onInteriorVaultCracked === "function") {
                        this.map.objectEngine.onInteriorVaultCracked(this, this.activeInterior);
                    }
                    bannerSub = `COLLECTED +$${stash.toLocaleString()} VIP STASH + 100% HP & +50 ARMOR!`;
                    break;
                }
                case "PLAY_LOTTO": {
                    this.recordStationCooldown(this.activeInterior, st, 10.0, false);
                    const roll = Math.random();
                    if (roll < 0.12) {
                        this.addCash(400, "🎰 FLORIDA LOTTO JACKPOT!", true);
                        bannerTitle = "🎰 LOTTO JACKPOT WINNER!";
                        bannerSub = "SCRATCHED 3 GOLDEN FLAMINGOS: WON +$400!";
                        bannerCol = "#fde047";
                    } else if (roll < 0.42) {
                        this.addCash(100, "🎟️ LOTTO PRIZE WINNER!", true);
                        bannerTitle = "🎟️ SCRATCH-OFF WINNER!";
                        bannerSub = "MATCHED 2 PALM TREES: WON +$100!";
                        bannerCol = "#39ff14";
                    } else {
                        bannerTitle = "🎟️ NO MATCH THIS TIME";
                        bannerSub = "TRY AGAIN! JACKPOT UP TO $400!";
                        bannerCol = "#94a3b8";
                    }
                    break;
                }
                case "PLAY_POOL": {
                    this.recordStationCooldown(this.activeInterior, st, 18.0, false);
                    const poolRoll = Math.random();
                    if (poolRoll < 0.20) {
                        this.addCash(350, "🎱 8-BALL TABLE RUN HUSTLE!", true);
                        bannerTitle = "🎱 CLEAN TABLE RUN!";
                        bannerSub = "RAN THE RACK ON THE SHARK: WON +$350!";
                        bannerCol = "#fde047";
                    } else if (poolRoll < 0.60) {
                        this.addCash(150, "🎱 8-BALL BANK SHOT HUSTLE!", true);
                        bannerTitle = "🎱 SANK THE 8-BALL!";
                        bannerSub = "CORNER POCKET BANK SHOT: HUSTLED +$150!";
                        bannerCol = "#39ff14";
                    } else {
                        bannerTitle = "🎱 SCRATCH ON THE 8-BALL!";
                        bannerSub = "TOUGH BREAK! RACK 'EM UP AGAIN ($100)";
                        bannerCol = "#fb923c";
                    }
                    break;
                }
                case "ROB_REGISTER": {
                    this.recordStationCooldown(this.activeInterior, st, 120.0, true);
                    const take = Math.min(350, Number(st.reward) || 300);
                    this.addCash(take, "💵 ARMED REGISTER HOLD-UP!", true);
                    if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(160);
                    this.setWantedLevel(Math.max(this.wantedLevel + 1, 2));
                    if (this.missions && typeof this.missions.onInteriorRobbery === "function") {
                        this.missions.onInteriorRobbery();
                    }
                    if (this.map && this.map.objectEngine && typeof this.map.objectEngine.onInteriorVaultCracked === "function") {
                        this.map.objectEngine.onInteriorVaultCracked(this, this.activeInterior);
                    }
                    if (this.audio && this.audio.playSirenBlip) this.audio.playSirenBlip();
                    bannerTitle = "🚨 ARMED HOLD-UP COMPLETE!";
                    bannerSub = `STOLE +$${take.toLocaleString()} CASH! VCPD DISPATCHED (+2★)!`;
                    bannerCol = "#ef4444";
                    if (this.activeInterior && Array.isArray(this.activeInterior.npcs)) {
                        for (const npc of this.activeInterior.npcs) {
                            npc._robbedTimer = 14.0;
                        }
                    }
                    break;
                }
                default:
                    p.hp = p.maxHp;
                    this.recordStationCooldown(this.activeInterior, st, st.cooldown || 6.0, false);
                    break;
            }

            if ((st.cooldownUntilMs || 0) <= Date.now()) {
                this.recordStationCooldown(this.activeInterior, st, st.cooldown || 6.0, false);
            }
            if (this.audio && this.audio.playCashSound) this.audio.playCashSound();
            this.showBigBanner(bannerTitle, bannerSub, bannerCol, 2.2);
            this.updateHud();
            if (this.net && typeof this.net.broadcastStateNow === "function") {
                this.net.broadcastStateNow();
            }
            return;
        }

        let rwdCooldown = 60.0;
        let syncVault = false;

        switch (st.rewardType) {

            case "ARSENAL":

                p.hp = p.maxHp;

                p.armor = 100;

                grantWep("SHOTGUN", 35);

                grantWep("UZI", 120);

                rwdCooldown = 60.0;

                break;

            case "HEAVY_WEAPONS":

                p.hp = p.maxHp;

                p.armor = 100;

                grantWep("SHOTGUN", 40);

                grantWep("UZI", 140);

                grantWep("FLAMETHROWER", 80);

                grantWep("ROCKET", 8);

                rwdCooldown = 90.0;
                syncVault = true;

                break;

            case "WARDROBE":

                p.hp = p.maxHp;

                p.armor = Math.max(p.armor || 0, 100);

                p.bandana = !p.bandana;

                this.setWantedLevel(0);

                this.renderPortraits();

                rwdCooldown = 90.0;
                syncVault = true;

                break;

            case "LOUNGE":

                p.hp = p.maxHp;

                p.speedBoostTimer = 18.0;

                rwdCooldown = 60.0;

                break;

            case "MULTIPLIER_CASH":

                p.hp = p.maxHp;

                this.addMultiplier(1);

                rwdCooldown = 120.0;
                syncVault = true;

                break;

            case "HEIST_SAFE":

                p.hp = p.maxHp;

                grantWep("SHOTGUN", 24);

                grantWep("UZI", 90);

                this.addCash(600, "VAULT CRACKED!", true);
                if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(240);
                this.setWantedLevel(Math.max(this.wantedLevel + 1, 3));

                rwdCooldown = 150.0;
                syncVault = true;
                if (this.activeInterior && Array.isArray(this.activeInterior.npcs)) {
                    for (const npc of this.activeInterior.npcs) {
                        npc._robbedTimer = 14.0;
                    }
                }

                if (this.missions && typeof this.missions.onInteriorRobbery === "function") {
                    this.missions.onInteriorRobbery();
                }

                if (this.map && this.map.objectEngine && typeof this.map.objectEngine.onInteriorVaultCracked === "function") {

                    this.map.objectEngine.onInteriorVaultCracked(this, this.activeInterior);

                }

                break;

            case "EXTRA_LIFE":

                p.hp = p.maxHp;

                this.lives = Math.min(9, (this.lives || 3) + 1);

                rwdCooldown = 180.0;
                syncVault = true;

                break;

            case "JAIL_CARDS":

                p.hp = p.maxHp;

                this.jailFreeCards = Math.min(9, (this.jailFreeCards || 0) + 1);

                this.setWantedLevel(0);

                rwdCooldown = 150.0;
                syncVault = true;

                break;

            case "ROCKET_LAUNCH":

                p.hp = p.maxHp;

                this.addMultiplier(1);

                grantWep("ROCKET", 10);

                this.addCash(1000, "🚀 CAPE LEONIDA ROCKET LAUNCHED!", true);
                this.setWantedLevel(Math.max(this.wantedLevel, 4));

                rwdCooldown = 180.0;
                syncVault = true;

                break;

            default:

                p.hp = p.maxHp;

                this.addCash(150, st.label, true);

                rwdCooldown = 60.0;

                break;

        }

        this.recordStationCooldown(this.activeInterior, st, rwdCooldown, syncVault);

        this.audio.playCashSound();

        this.showBigBanner(st.label, st.sub, st.color || "#39ff14", 2.2);

        this.updateHud();
        if (this.net && typeof this.net.broadcastStateNow === "function") {
            this.net.broadcastStateNow();
        }

    }



    toggleVehicleEntry() {

        const p = this.player;

        if (p.dead) return;



        // If inside a building interior, [E] / [F] / [Enter] confirms the station the player is standing on or exits at the door mat!

        if (this.activeInterior) {

            const intr = this.activeInterior;

            if (Array.isArray(intr.stations)) {

                let bestSt = null;

                let bestDist = 88;

                for (const st of intr.stations) {

                    const d = Math.hypot(this.interiorX - st.x, this.interiorY - st.y);

                    if (d < bestDist && (st.cooldown || 0) <= 0) {

                        bestDist = d;

                        bestSt = st;

                    }

                }

                if (bestSt) {

                    this.triggerInteriorStation(bestSt);

                    return;

                }

            }

            const pose = (window.ShopInteriors && typeof window.ShopInteriors.getEntrancePose === "function")
                ? window.ShopInteriors.getEntrancePose(intr)
                : null;
            if (pose ? pose.isNearExit(this.interiorX, this.interiorY) : (this.interiorY >= intr.h - 44 && Math.abs(this.interiorX - intr.w * 0.5) < 56)) {
                this.exitInterior();
            }

            return;

        }

        // If inside a vehicle on a Bomb Shop pad, [E] confirms buying/rigging the Car Bomb instead of exiting!

        if (p.inVehicle && (p.seatIndex || 0) === 0 && Array.isArray(this.map.bombShops)) {

            const v = p.inVehicle;

            if (!v.destroyed && !v.waterOnly && v.specKey !== "BMX_BIKE" && v.specKey !== "E_SCOOTER" && v.specKey !== "FAGGIO_SCOOTER" && Math.abs((v.z || 2.0) - 2.0) <= 0.65) {
                for (const bs of this.map.bombShops) {

                    if (!v.hasBomb && (bs.cooldown || 0) <= 0 && v.x > bs.x && v.x < bs.x + bs.w && v.y > bs.y && v.y < bs.y + bs.h) {

                        const cost = bs.cost || 1000;

                        if (this.cash < cost) {

                            this.audio.playBeep(180, 0.16, "sawtooth", 0.06);

                            this.addFloatingText(v.x, v.y - 24, `NOT ENOUGH CASH ($${cost.toLocaleString("en-US")})`, "#ef4444");

                            return;

                        }

                        bs.cooldown = 5.0;

                        this.cash -= cost;

                        v.hasBomb = true;

                        this.audio.playCashSound();

                        this.showBigBanner(

                            "CAR BOMB RIGGED!",

                            "PRESS [K] ANYTIME TO ARM THE 5-SECOND DETONATOR, THEN [F] TO BAIL OUT!",

                            "#ff9900",

                            2.6

                        );

                        this.updateHud();

                        return;

                    }

                }
            }

        }



        // If on foot directly at a building entrance door, [E] / [F] / [Enter] enters the interior first!

        if (!p.inVehicle && Array.isArray(this.map.interiors)) {

            for (const intr of this.map.interiors) {

                const thresh = this.getDoorThresholdPos(intr);

                if (this.isTouchingInteriorDoor(intr, p.x, p.y) || Math.hypot(p.x - thresh.x, p.y - thresh.y) <= 36) {

                    this.enterInterior(intr);

                    return;

                }

            }

        }



        // If on foot near a 3D Villa Heist Keypad, 3D Cartel Vault, Pier Getaway Speedboat, or Interactive World Prop!

        if (!p.inVehicle && this.map && this.map.objectEngine && typeof this.map.objectEngine.tryTriggerHeistAction === "function") {

            if (this.map.objectEngine.tryTriggerHeistAction(this)) return;

        }

        // Sit down or stand up from a 3D Park Bench or Sidewalk Bistro Chair ([F] / [E] / [Enter])
        if (!p.inVehicle && p.isSitting) {
            const prop = p.sittingProp;
            const seat = p.sittingSeat || 0;
            p.isSitting = false;
            p.sittingProp = null;
            p._velX = 0;
            p._velY = 0;
            if (prop && prop.kind === "PROMENADE_BENCH") {
                const bAng = prop.angle !== undefined ? prop.angle : 0;
                const ca = Math.cos(bAng), sa = Math.sin(bAng);
                const lat = seat === 0 ? -10.6 : 10.6;
                p.x = prop.x + ca * 18.5 - sa * lat;
                p.y = prop.y + sa * 18.5 + ca * lat;
            } else if (prop) {
                p.x = prop.x + 20.0;
                p.y = prop.y + (seat === 0 ? -16.5 : 16.5);
            } else {
                p.x += Math.cos(p.angle) * 16;
                p.y += Math.sin(p.angle) * 16;
            }
            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const col = this.map.resolveCircleBuildingCollision(p.x, p.y, 10, p.z || 2.0, false);
                p.x = col.x;
                p.y = col.y;
            }
            return;
        }
        if (!p.inVehicle && !p.isSitting && this.map) {
            let nearVeh = false;
            for (const v of this.vehicles) {
                if (!v.destroyed && Math.hypot(v.x - p.x, v.y - p.y) < 36) { nearVeh = true; break; }
            }
            if (!nearVeh) {
                let bestProp = null, bestDist = 38, bestSeat = 0, bestX = p.x, bestY = p.y, bestAng = p.angle;
                if (Array.isArray(this.map.streetEvents)) {
                    for (let i = 0; i < this.map.streetEvents.length; i++) {
                        const ev = this.map.streetEvents[i];
                        if (ev.kind === "PROMENADE_BENCH") {
                            const d = Math.hypot(ev.x - p.x, ev.y - p.y);
                            if (d < bestDist) {
                                const bAng = ev.angle !== undefined ? ev.angle : 0;
                                const ca = Math.cos(bAng), sa = Math.sin(bAng);
                                const s0x = ev.x + ca * 1.4 - sa * (-10.6), s0y = ev.y + sa * 1.4 + ca * (-10.6);
                                const s1x = ev.x + ca * 1.4 - sa * 10.6, s1y = ev.y + sa * 1.4 + ca * 10.6;
                                const d0 = Math.hypot(s0x - p.x, s0y - p.y), d1 = Math.hypot(s1x - p.x, s1y - p.y);
                                bestDist = d; bestProp = ev;
                                if (d0 <= d1) { bestSeat = 0; bestX = s0x; bestY = s0y; }
                                else { bestSeat = 1; bestX = s1x; bestY = s1y; }
                                bestAng = bAng;
                            }
                        } else if (ev.kind === "OCEAN_DRIVE_CROWD") {
                            const d = Math.hypot(ev.x - p.x, ev.y - p.y);
                            if (d < bestDist) {
                                const s0y = ev.y - 18.0, s1y = ev.y + 18.0;
                                const d0 = Math.hypot(ev.x - p.x, s0y - p.y), d1 = Math.hypot(ev.x - p.x, s1y - p.y);
                                bestDist = d; bestProp = ev; bestX = ev.x;
                                if (d0 <= d1) { bestSeat = 0; bestY = s0y; bestAng = Math.PI * 0.5; }
                                else { bestSeat = 1; bestY = s1y; bestAng = -Math.PI * 0.5; }
                            }
                        }
                    }
                }
                if (Array.isArray(this.map.viceStreetDetails)) {
                    for (let i = 0; i < this.map.viceStreetDetails.length; i++) {
                        const vd = this.map.viceStreetDetails[i];
                        if (vd.kind !== "CAFE_TABLE") continue;
                        const d = Math.hypot(vd.x - p.x, vd.y - p.y);
                        if (d < bestDist) {
                            const s0y = vd.y - 18.0, s1y = vd.y + 18.0;
                            const d0 = Math.hypot(vd.x - p.x, s0y - p.y), d1 = Math.hypot(vd.x - p.x, s1y - p.y);
                            bestDist = d; bestProp = vd; bestX = vd.x;
                            if (d0 <= d1) { bestSeat = 0; bestY = s0y; bestAng = Math.PI * 0.5; }
                            else { bestSeat = 1; bestY = s1y; bestAng = -Math.PI * 0.5; }
                        }
                    }
                }
                if (bestProp) {
                    p.isSitting = true;
                    p.sittingProp = bestProp;
                    p.sittingSeat = bestSeat;
                    p.x = bestX;
                    p.y = bestY;
                    p.angle = bestAng;
                    p.vx = 0;
                    p.vy = 0;
                    this.floatingTexts.push({
                        text: bestProp.kind === "PROMENADE_BENCH" ? "🪑 SITTING ON BENCH — [F] OR MOVE TO STAND" : "☕ SITTING AT CAFE — [F] OR MOVE TO STAND",
                        x: p.x, y: p.y - 20, color: "#38bdf8", life: 2.2
                    });
                    return;
                }
            }
        }



        // Exit current vehicle (with classic GTA 1 open door animation & exit_car ped frames 16..23!)

        if (p.inVehicle) {

            const v = p.inVehicle;

            const mySeat = p.seatIndex || 0;

            const sideSign = (mySeat % 2 === 1) ? 1 : -1;

            const exitDist = Math.max(26, ((v.h || 24) * 0.44) + 12);

            let exitX = v.x + sideSign * Math.sin(v.angle) * exitDist;

            let exitY = v.y - sideSign * Math.cos(v.angle) * exitDist;

            let resolvedExit = this.map.resolveCircleBuildingCollision(exitX, exitY, 10, p.z || 2.0, false);

            const vehBlocked = this.resolveCircleVehicleCollision(resolvedExit.x, resolvedExit.y, 8.5, p.z || 2.0, v).hit;

            if (resolvedExit.hit || vehBlocked) {

                const altX = v.x - sideSign * Math.sin(v.angle) * exitDist;

                const altY = v.y + sideSign * Math.cos(v.angle) * exitDist;

                const altResolved = this.map.resolveCircleBuildingCollision(altX, altY, 10, p.z || 2.0, false);

                if (!altResolved.hit && !this.resolveCircleVehicleCollision(altResolved.x, altResolved.y, 8.5, p.z || 2.0, v).hit) {

                    resolvedExit = altResolved;

                }

            }

            exitX = resolvedExit.x;

            exitY = resolvedExit.y;

            if (this.map.getGroundTypeAt(exitX, exitY) === GROUND_TYPE.WATER) {

                // If moored right beside a dock, beach, or pier (<= 104px), step onto dry land; otherwise dive into the water and swim!
                let foundDry = null;
                const maxSearchR = (v.waterOnly || v.specKey === "AIRBOAT" || v.amphibious) ? 104 : 78;

                for (let r = 24; r <= maxSearchR && !foundDry; r += 12) {

                    for (let a = 0; a < 24; a++) {

                        const ang = (a / 24) * Math.PI * 2;

                        const tx = v.x + Math.cos(ang) * r;

                        const ty = v.y + Math.sin(ang) * r;

                        if (this.map.getGroundTypeAt(tx, ty) !== GROUND_TYPE.WATER &&

                            this.map.getGroundTypeAt(tx, ty) !== GROUND_TYPE.BUILDING &&
                            (!this.map.resolveCircleBuildingCollision || !this.map.resolveCircleBuildingCollision(tx, ty, 8, p.z || 2.0).hit)) {

                            foundDry = { x: tx, y: ty };

                            break;

                        }

                    }

                }

                if (foundDry) {

                    exitX = foundDry.x;

                    exitY = foundDry.y;

                } else {

                    const sideAng = v.angle + (mySeat % 2 === 1 ? Math.PI * 0.5 : -Math.PI * 0.5);

                    exitX = v.x + Math.cos(sideAng) * 28;

                    exitY = v.y + Math.sin(sideAng) * 28;

                    p.isSwimming = true;

                    if (this.audio && typeof this.audio.playWaterSplash === "function") {

                        this.audio.playWaterSplash(0.90);

                    }

                }

            }

            if (mySeat === 0) {

                v.driver = null;

            }

            v.hasJason = false;

            v.doorOpenTimer = 0.48;

            p.inVehicle = null;

            p.seatIndex = 0;

            p.enteringVehicle = null;
            p._enteringTimer = 0;
            p.vx = 0;
            p.vy = 0;
            p._velX = 0;
            p._velY = 0;
            p._turnBank = 0;

            p.exitAnimTimer = 0.36;

            p.fromBike = Boolean(v.isMotorcycle);

            p.x = exitX;

            p.y = exitY;

            p.angle = v.angle + (mySeat % 2 === 1 ? -Math.PI * 0.5 : Math.PI * 0.5);

            v._worldModified = true;
            v.isStaticParked = false;
            v.lastPlayerDriven = true;

            if (this.net) {

                if (typeof this.net.broadcastWorldEvent === "function") {

                    const vFlags =
                        (v.destroyed ? 1 : 0) |
                        (v.sirenActive ? 2 : 0) |
                        (v.frontDented ? 4 : 0) |
                        (v.rearDented ? 8 : 0) |
                        (v.heavyDented ? 16 : 0) |
                        (v.fireExtinguished ? 128 : 0);

                    this.net.broadcastWorldEvent({

                        kind: "VEH_EXIT",

                        vehId: v.id,

                        specKey: v.specKey || "MINT_STALLION",

                        seat: mySeat,

                        x: Math.round(v.x),

                        y: Math.round(v.y),

                        z: Math.round((v.z || 2.0) * 100) / 100,

                        a: Math.round((v.angle || 0) * 1000) / 1000,

                        hp: Math.round(v.hp || 100),

                        flags: vFlags,

                        remapIdx: v.remapIdx || 0

                    });

                }

                if (typeof this.net.broadcastStateNow === "function") {

                    this.net.broadcastStateNow();

                }

            }

            this.audio.playCarExit(Boolean(v.isMotorcycle), v.specKey);

            this.updateHud();

            return;

        }



        // Snappy Vehicle Entry + .G24 Door Swing: enter immediately if within 68px (or up to 195px for moored boats/jet-skis/airboats),
        // or run quickly to the nearest door if up to 125px away!
        let closest = null;

        let bestDist = 195;

        for (const v of this.vehicles) {

            if (v.destroyed) continue;

            const isWaterCraft = Boolean(v.waterOnly || v.specKey === "AIRBOAT" || v.amphibious);

            const maxReach = isWaterCraft ? 195 : 125;

            const d = Math.hypot(v.x - p.x, v.y - p.y);

            if (d < maxReach && d < bestDist) {

                bestDist = d;

                closest = v;

            }

        }

        // Also allow boarding any nearby animated Jet-Ski, Everglades Airboat, or Port Speedboat/Yacht within 195px!
        if (!closest && this.map && typeof Vehicle === "function") {
            const tNow = (this.renderer && typeof this.renderer.time === "number") ? this.renderer.time : (performance.now() * 0.001);
            if (Array.isArray(this.map.jetSkiers)) {
                for (let ji = 0; ji < this.map.jetSkiers.length; ji++) {
                    const js = this.map.jetSkiers[ji];
                    if (js._boardedVehicle && !js._boardedVehicle.destroyed) continue;
                    const t = tNow * (js.speed || 1.35) + (js.seed || 0);
                    const jx = js._liveX !== undefined ? js._liveX : (js.x + Math.cos(t) * js.rx);
                    const jy = js._liveY !== undefined ? js._liveY : (js.y + Math.sin(t) * js.ry);
                    const jAng = js._liveAng !== undefined ? js._liveAng : Math.atan2(Math.cos(t) * js.ry, -Math.sin(t) * js.rx);
                    const d = Math.hypot(jx - p.x, jy - p.y);
                    if (d < bestDist) {
                        const boat = new Vehicle(`jetski_live_${ji}_${Date.now()}`, "JETSKI", jx, jy, jAng);
                        boat.z = 2.0;
                        this.vehicles.push(boat);
                        js._boardedVehicle = boat;
                        bestDist = d;
                        closest = boat;
                    }
                }
            }
            if (Array.isArray(this.map.evergladesAirboats)) {
                for (let ai = 0; ai < this.map.evergladesAirboats.length; ai++) {
                    const ab = this.map.evergladesAirboats[ai];
                    if (ab._boardedVehicle && !ab._boardedVehicle.destroyed) continue;
                    const t = tNow * (ab.speed || 0.7) + (ab.seed || 0);
                    const ax = ab._liveX !== undefined ? ab._liveX : (ab.x + Math.cos(t) * ab.rx);
                    const ay = ab._liveY !== undefined ? ab._liveY : (ab.y + Math.sin(t * 2.0) * (ab.ry * 0.55));
                    const aAng = ab._liveAng !== undefined ? ab._liveAng : Math.atan2(Math.cos(t * 2.0) * (ab.ry * 1.1), -Math.sin(t) * ab.rx);
                    const d = Math.hypot(ax - p.x, ay - p.y);
                    if (d < bestDist) {
                        const boat = new Vehicle(`airboat_live_${ai}_${Date.now()}`, "AIRBOAT", ax, ay, aAng);
                        boat.z = 2.0;
                        this.vehicles.push(boat);
                        ab._boardedVehicle = boat;
                        bestDist = d;
                        closest = boat;
                    }
                }
            }
            if (Array.isArray(this.map.portTerminals)) {
                for (let pi = 0; pi < this.map.portTerminals.length; pi++) {
                    const pt = this.map.portTerminals[pi];
                    if (pt.kind !== "SPEEDBOAT" && pt.kind !== "YACHT") continue;
                    if (pt._boardedVehicle && !pt._boardedVehicle.destroyed) continue;
                    const d = Math.hypot(pt.x - p.x, pt.y - p.y);
                    if (d < bestDist) {
                        const boat = new Vehicle(`port_boat_${pi}_${Date.now()}`, "SPEEDBOAT", pt.x, pt.y, pt.ang || 0);
                        boat.z = 2.0;
                        this.vehicles.push(boat);
                        pt._boardedVehicle = boat;
                        bestDist = d;
                        closest = boat;
                    }
                }
            }
        }



        if (closest) {

            const isWaterCraft = Boolean(closest.waterOnly || closest.specKey === "AIRBOAT" || closest.amphibious);

            if (bestDist < 68 || isWaterCraft) {

                this.completeVehicleEntry(closest);

            } else {

                p.enteringVehicle = closest;
                p._enteringTimer = 0;

            }

        }

    }



    completeVehicleEntry(closest) {

        const p = this.player;

        if (!closest || closest.destroyed) {

            p.enteringVehicle = null;
            p._enteringTimer = 0;

            return;

        }

        p.enteringVehicle = null;
        p._enteringTimer = 0;
        p.vx = 0;
        p.vy = 0;
        p._velX = 0;
        p._velY = 0;
        p._turnBank = 0;
        p.emoteTimer = 0;
        p.isSitting = false;
        p.sittingProp = null;
        p.isSwimming = false;
        p.isWading = false;



        const maxSeats = closest.maxSeats || 4;

        const freeSeat = typeof closest.findFirstFreeSeat === "function"

            ? closest.findFirstFreeSeat(this)

            : 0;



        if (freeSeat === -1) {

            this.audio.playBeep(220, 0.12, "sawtooth", 0.08);

            this.addFloatingText(closest.x, closest.y - 28, `🚫 VEHICLE FULL (${maxSeats}/${maxSeats} SEATS)!`, "#ff1e38");

            return;

        }



        const wasOccupied =

            freeSeat === 0 && (

                closest.driver === "AI_TRAFFIC" ||

                closest.driver === "AI_COP" ||

                closest.driver === "AI_EMERGENCY" ||

                closest.driver === "AI_TOW" ||

                closest.driver === "AI_CRIMINAL"

            );



        if (closest.towedByTruck) {

            if (closest.towedByTruck.towingVehicle === closest) {

                closest.towedByTruck.towingVehicle = null;

            }

            closest.towedByTruck = null;

        }



        if (wasOccupied) {

            const ejectedPed = this.ejectVehicleDriver(closest, "CARJACK");

            if (closest.isPolice) {

                this.setWantedLevel(Math.max(this.wantedLevel, 1), { x: closest.x, y: closest.y }, true, closest);

            } else {

                this.reportCrimeAt(closest.x, closest.y, Math.max(this.wantedLevel, 1), false, {
                    veh: closest,
                    ejectedVictim: ejectedPed
                });

            }

        }



        if (closest.waterOnly || closest.specKey === "AIRBOAT" || closest.amphibious) {
            closest.z = Math.max(2.0, closest.z || 2.0);
        }

        if (freeSeat === 0) {

            closest.driver = "PLAYER";

            closest.towTarget = null;

            closest.towHookTimer = 0;

        }

        closest.doorOpenTimer = 0.48;

        p.enterAnimTimer = 0.36;

        p.inVehicle = closest;

        p.seatIndex = freeSeat;

        const seatPos = typeof closest.getSeatWorldPos === "function"

            ? closest.getSeatWorldPos(freeSeat)

            : { x: closest.x, y: closest.y };

        p.x = seatPos.x;

        p.y = seatPos.y;

        p.z = closest.z !== undefined ? closest.z : (p.z || 2.0);



        closest._worldModified = true;
        closest.isStaticParked = false;
        closest.lastPlayerDriven = true;
        if (freeSeat === 0 && this.director && typeof this.director.onPlayerEnteredVehicle === "function") {
            this.director.onPlayerEnteredVehicle(closest, Boolean(wasOccupied));
        }
        if (wasOccupied || closest.isEstateCar || closest.isPolice) {
            if (typeof this.recordFactionGrudge === "function") {
                this.recordFactionGrudge("STEAL_CAR", closest.name || "vehicle", Boolean(closest.isPolice));
            }
        }

        if (this.net) {

            if (typeof this.net.broadcastWorldEvent === "function") {

                this.net.broadcastWorldEvent({

                    kind: "VEH_ENTER",

                    vehId: closest.id,

                    specKey: closest.specKey || "MINT_STALLION",

                    seat: freeSeat,

                    carjack: Boolean(wasOccupied),

                    x: Math.round(closest.x),

                    y: Math.round(closest.y),

                    z: Math.round((closest.z || 2.0) * 100) / 100,

                    a: Math.round((closest.angle || 0) * 1000) / 1000

                });

            }

            if (typeof this.net.broadcastStateNow === "function") {

                this.net.broadcastStateNow();

            }

        }



        this.audio.playCarEnter(Boolean(closest.isMotorcycle), closest.specKey);



        const occCount = typeof closest.getOccupiedSeats === "function"

            ? closest.getOccupiedSeats(this).length

            : 1;

        const seatBadge = `${occCount}/${maxSeats} SEATS`;



        // Trigger authentic GTA 1 top-center Blue/Gold Car Name Banner with Seat Role

        if (this.renderer) {

            const roleSuffix = freeSeat === 0

                ? `[DRIVER • ${seatBadge}]`

                : (closest.hasTurret && freeSeat === 1 ? `[GUNNER • ${seatBadge}]` : `[PASSENGER #${freeSeat} • ${seatBadge}]`);

            this.renderer.vehicleBannerName = `${closest.name} ${roleSuffix}`;

            this.renderer.vehicleBannerTimer = 3.0;

        }



        // Entering the hidden PANZER TANK triggers a classic GTA 1 Tank Kill Frenzy!

        if (closest.specKey === "PANZER_TANK" && !closest._tankFrenzyTriggered && freeSeat === 0) {

            closest._tankFrenzyTriggered = true;

            this.startKillFrenzy({

                title: "PANZER TANK RAMPAGE!",

                weapon: "ROCKET",

                targetKills: 8,

                duration: 40,

                reward: 50000

            });

        } else if (freeSeat > 0) {

            const roleMsg = (closest.hasTurret && freeSeat === 1)

                ? `🎯 TANK GUNNER (${seatBadge}) — 360° CANNON!`

                : `🔫 PASSENGER #${freeSeat} (${seatBadge}) — 360° DRIVE-BY!`;

            this.addFloatingText(closest.x, closest.y - 28, roleMsg, "#39ff14");

        } else {

            const st = this.audio.getCurrentStation();

            this.addFloatingText(closest.x, closest.y - 26, `${closest.name} (${seatBadge})`, "#ffd13b");

            this.addFloatingText(closest.x, closest.y - 44, `📻 ${st.name}`, "#00f0ff");

        }

        this.updateHud();

    }



    ejectVehicleDriver(vehicle, reason = "CARJACK") {

        if (!vehicle) return;

        vehicle.driver = null;

        vehicle.doorOpenTimer = 0.48;



        const doorPos = typeof vehicle.getDoorPosition === "function"

            ? vehicle.getDoorPosition(0)

            : { x: vehicle.x - Math.sin(vehicle.angle) * 26, y: vehicle.y + Math.cos(vehicle.angle) * 26 };

        const doorX = doorPos.x;

        const doorY = doorPos.y;

        const vz = vehicle.z !== undefined ? vehicle.z : 2.0;



        if (reason === "CRIMINAL_DEPLOY") {
            if (vehicle.criminalDeployDone) return;
            vehicle.criminalDeployDone = true;
            vehicle.criminalBailedOut = true;
            vehicle.wasCriminalCar = true;

            // Cap active ambient CRIMINAL peds so shootouts never flood the street
            let activeCrimCount = 0;
            for (let i = 0; i < this.peds.length; i++) {
                if (!this.peds[i].dead && this.peds[i].kind === "CRIMINAL") activeCrimCount++;
            }
            if (activeCrimCount >= 6) return;

            const gangPool = ["vc_haitian", "vc_cuban", "g2_zaibatsu", "g2_russian", "g2_mugger"];
            const gType1 = gangPool[Math.floor(Math.random() * gangPool.length)];
            const gType2 = gangPool[Math.floor(Math.random() * gangPool.length)];
            this.peds.push(new Pedestrian({
                x: doorX,
                y: doorY,
                z: vz,
                angle: vehicle.angle + Math.PI,
                speed: 98,
                kind: "CRIMINAL",
                g24Type: gType1,
                g2Remapped: true,
                shirtColor: "#ef4444",
                hp: 125,
                maxHp: 125,
                copWeapon: "UZI",
                shootCooldown: 1.6,
                noBoardTimer: 10.0,
                dead: false,
                panicTimer: 0,
                exitAnimTimer: 0.32
            }));
            const doorX2 = vehicle.x + Math.sin(vehicle.angle) * 28;
            const doorY2 = vehicle.y - Math.cos(vehicle.angle) * 28;
            this.peds.push(new Pedestrian({
                x: doorX2,
                y: doorY2,
                z: vz,
                angle: vehicle.angle + Math.PI,
                speed: 96,
                kind: "CRIMINAL",
                g24Type: gType2,
                g2Remapped: true,
                shirtColor: "#f97316",
                hp: 115,
                maxHp: 115,
                copWeapon: Math.random() < 0.45 ? "SHOTGUN" : "PISTOL",
                shootCooldown: 1.9,
                noBoardTimer: 10.0,
                dead: false,
                panicTimer: 0,
                exitAnimTimer: 0.32
            }));
            this.addFloatingText(doorX, doorY - 22, "🔫 GANGSTERS BAILED OUT — SHOOTOUT!", "#f97316");
            return;
        }



        if (reason === "COP_DEPLOY" || vehicle.isPolice) {

            vehicle.sirenActive = false;

            const isSwat = vehicle.specKey === "SWAT_ENFORCER";

            const copHp = isSwat ? 145 : 105;

            const copWep = isSwat ? "SHOTGUN" : (this.wantedLevel >= 3 ? "UZI" : "PISTOL");

            const isCarjacked = reason === "CARJACK";

            const deployTarget = this.getNearestWantedTarget(doorX, doorY) || this.player;

            // Pick the curb door facing the target (e.g. eastern sidewalk of Ocean Drive toward Vice Beach) and ensure it is clear of buildings
            const rightX = -Math.sin(vehicle.angle || 0);
            const rightY = Math.cos(vehicle.angle || 0);
            const fwdX = Math.cos(vehicle.angle || 0);
            const fwdY = Math.sin(vehicle.angle || 0);
            const toTargX = deployTarget ? (deployTarget.x - vehicle.x) : rightX;
            const toTargY = deployTarget ? (deployTarget.y - vehicle.y) : rightY;
            const sideSign = (toTargX * rightX + toTargY * rightY) >= 0 ? 1 : -1;
            let deployX1 = isCarjacked ? doorX : (vehicle.x + rightX * sideSign * 24 + fwdX * 8);
            let deployY1 = isCarjacked ? doorY : (vehicle.y + rightY * sideSign * 24 + fwdY * 8);
            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const c1 = this.map.resolveCircleBuildingCollision(deployX1, deployY1, 10, vz);
                if (c1.hit) {
                    deployX1 = c1.x;
                    deployY1 = c1.y;
                }
            }

            this.peds.push(new Pedestrian({

                x: deployX1,

                y: deployY1,

                z: vz,

                angle: Math.atan2(deployTarget.y - deployY1, deployTarget.x - deployX1),

                speed: isSwat ? 104 : 98,

                kind: "COP",

                g24Type: isSwat ? "g2_swat" : "police",

                isSwat,

                shirtColor: isSwat ? "#1e293b" : "#1e3a8a",

                hp: copHp,

                maxHp: copHp,

                copWeapon: copWep,

                homeCruiser: reason === "COP_DEPLOY" ? vehicle : null,

                carjackedCop: isCarjacked,

                stunnedTimer: isCarjacked ? 1.15 : 0,

                bustedGraceTimer: isCarjacked ? 2.2 : 0,

                shootCooldown: isCarjacked ? 1.30 : 0.25,

                dead: false,

                panicTimer: 0,

                exitAnimTimer: 0.32

            }));

            if (isCarjacked) {

                this.addFloatingText(deployX1, deployY1 - 22, "🚓 VCPD OFFICER YANKED OUT! STEP ON IT!", "#38bdf8");

            }

            // Deploy the 2nd patrol partner from the rear/passenger door when a VCPD Cruiser or SWAT unit parks to intervene!
            if (reason === "COP_DEPLOY") {

                let deployX2 = vehicle.x + rightX * sideSign * 24 - fwdX * 12;
                let deployY2 = vehicle.y + rightY * sideSign * 24 - fwdY * 12;
                if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                    const c2 = this.map.resolveCircleBuildingCollision(deployX2, deployY2, 10, vz);
                    if (c2.hit) {
                        deployX2 = c2.x;
                        deployY2 = c2.y;
                    }
                }

                this.peds.push(new Pedestrian({

                    x: deployX2,

                    y: deployY2,

                    z: vz,

                    angle: Math.atan2(deployTarget.y - deployY2, deployTarget.x - deployX2),

                    speed: isSwat ? 104 : 98,

                    kind: "COP",

                    g24Type: isSwat ? "g2_swat" : "police",

                    isSwat,

                    shirtColor: isSwat ? "#1e293b" : "#1e3a8a",

                    hp: copHp,

                    maxHp: copHp,

                    copWeapon: isSwat ? "UZI" : (this.wantedLevel >= 3 ? "UZI" : "PISTOL"),

                    homeCruiser: vehicle,

                    dead: false,

                    panicTimer: 0,

                    exitAnimTimer: 0.32

                }));

                this.addFloatingText(deployX1, deployY1 - 22, isSwat ? "🚓 SWAT SQUAD DEPLOYED!" : "🚓 VCPD UNIT DEPLOYED!", "#38bdf8");

            }

            return;

        }



        if (reason === "BAIL_FIRE") {

            const fleeAngle = Math.atan2(doorY - vehicle.y, doorX - vehicle.x) + (Math.random() - 0.5) * 0.45;

            this.peds.push(new Pedestrian({

                x: doorX,

                y: doorY,

                z: vz,

                angle: fleeAngle,

                speed: 95,

                kind: "CIVILIAN",

                g24Type: "civ2",

                shirtColor: "#f97316",

                hp: 40,

                dead: false,

                panicTimer: 8.5,

                threatX: vehicle.x,

                threatY: vehicle.y,

                exitAnimTimer: 0.32,

                turnSeed: Math.floor(Math.random() * 16) + 1

            }));

            this.addFloatingText(doorX, doorY - 22, "🔥 DRIVER BAILED OUT!", "#fb923c");

            return;

        }



        if (reason === "ROAD_RAGE") {

            this.peds.push(new Pedestrian({

                x: doorX,

                y: doorY,

                z: vz,

                angle: Math.atan2(this.player.y - doorY, this.player.x - doorX),

                speed: 92,

                kind: "HOSTILE",

                g24Type: "gang",

                shirtColor: "#ef4444",

                hp: 45,

                dead: false,

                panicTimer: 0,

                exitAnimTimer: 0.32

            }));

            this.addFloatingText(doorX, doorY - 22, "🤬 ROAD RAGE!", "#ef4444");

            return;

        }



        // CARJACK: Civilian or Emergency driver is yanked out onto the asphalt (plays GTA 1 fall/stunned frames 38..41, then flees or fights back if aggressive!)

        const fleeAngle = Math.atan2(doorY - this.player.y, doorX - this.player.x);

        const isFiremanDriver = vehicle.specKey === "FIRE_TRUCK";

        const isMedicDriver = vehicle.specKey === "MEDIC_AMBULANCE";

        const fightsBack = Boolean(!isFiremanDriver && !isMedicDriver && vehicle.aiAggressive && Math.random() < 0.45);

        const driverSpriteType = isFiremanDriver
            ? "g2_fireman"
            : (isMedicDriver ? "g2_medic" : (fightsBack ? "gang" : "civ1"));

        const ejectedDriver = new Pedestrian({

            x: doorX,

            y: doorY,

            z: vz,

            angle: fleeAngle,

            baseWalkSpeed: 24,

            speed: fightsBack ? 86 : 24,

            kind: fightsBack ? "HOSTILE" : "CIVILIAN",

            g24Type: driverSpriteType,

            g2Remapped: isFiremanDriver || isMedicDriver,

            shirtColor: isFiremanDriver ? "#eab308" : (isMedicDriver ? "#38bdf8" : "#f43f5e"),

            hp: isFiremanDriver ? 75 : 45,

            dead: false,

            stunnedTimer: 0.85,

            panicTimer: fightsBack ? 0 : 6.5,

            turnSeed: Math.floor(Math.random() * 16) + 1

        });
        this.peds.push(ejectedDriver);

        if (isFiremanDriver) {
            this.addFloatingText(doorX, doorY - 22, "🚒 VCFD FIREFIGHTER YANKED OUT!", "#f97316");
        } else if (isMedicDriver) {
            this.addFloatingText(doorX, doorY - 22, "🚑 PARAMEDIC YANKED OUT!", "#38bdf8");
        }
        return ejectedDriver;

    }

    // Called when a city bus / tour coach has pulled over at the curb: nearby calm pedestrians on the sidewalk side
    // walk to the front door and board (up to 4), so the stop lasts long enough for the farthest one to arrive.
    boardBusPassengers(bus) {
        if (!bus || bus.destroyed || !Array.isArray(this.peds)) return 0;
        const cosA = Math.cos(bus.angle || 0), sinA = Math.sin(bus.angle || 0);
        const rx = -sinA, ry = cosA;
        const halfLen = (bus.w || 88) * 0.5;
        // Front door on the right-hand (sidewalk) side
        const doorX = bus.x + cosA * halfLen * 0.42 + rx * ((bus.h || 30) * 0.5 + 6);
        const doorY = bus.y + sinA * halfLen * 0.42 + ry * ((bus.h || 30) * 0.5 + 6);
        const cand = [];
        for (const ped of this.peds) {
            if (!ped || ped.dead || ped.kind !== "CIVILIAN" || ped._boardingBus || ped._boardingVeh || ped._hailingTaxi) continue;
            if ((ped.panicTimer || 0) > 0 || (ped.burnTimer || 0) > 0 || ped.missionTag || ped.isLivingProp || ped.isChild) continue;
            if (ped.isCrossingRoad || ped.waitingAtCrosswalk || ped.formationLeader) continue;
            const dx = ped.x - doorX, dy = ped.y - doorY;
            const d = Math.hypot(dx, dy);
            if (d > 230 || d < 4) continue;
            // Must be on the sidewalk side of the bus (right-hand), not across the road
            const side = (ped.x - bus.x) * rx + (ped.y - bus.y) * ry;
            if (side < 10) continue;
            const nav = this.map.getNavigationBlock ? this.map.getNavigationBlock(Math.floor(ped.x / TILE_SIZE), Math.floor(ped.y / TILE_SIZE), ped.z || 2.0) : null;
            if (!nav || (nav.groundType !== GROUND_TYPE.PAWEMENT && nav.groundType !== GROUND_TYPE.FIELD)) continue;
            cand.push({ ped, d });
        }
        cand.sort((a, b) => a.d - b.d);
        let boarders = 0, maxArrive = 0;
        for (let i = 0; i < cand.length && boarders < 4; i++) {
            if (Math.random() > 0.8) continue;
            const { ped, d } = cand[i];
            ped._boardingBus = bus;
            ped._busDoorX = doorX;
            ped._busDoorY = doorY;
            ped._busBoardTimer = 12.0;
            ped.waitingAtCrosswalk = false;
            ped.hangoutTimer = 0;
            ped.socialTimer = 0;
            ped.targetBx = null;
            ped.targetBy = null;
            const spd = (ped.baseWalkSpeed || 24) * 1.35;
            maxArrive = Math.max(maxArrive, d / spd);
            boarders++;
        }
        if (boarders > 0) {
            // Keep the doors open long enough for the farthest passenger to arrive
            bus.aiPassengerStopTimer = Math.max(bus.aiPassengerStopTimer || 0, Math.min(12.5, maxArrive + 1.6));
            bus.doorOpenSide = 1;
            bus.doorOpenTimer = 0.5;
        }
        return boarders;
    }

    spawnAlightingPassenger(vehicle) {
        if (!vehicle || vehicle.destroyed || !Array.isArray(this.peds) || this.peds.length >= 135) return;
        const vz = vehicle.z !== undefined ? vehicle.z : 2.0;
        const cosA = Math.cos(vehicle.angle || 0);
        const sinA = Math.sin(vehicle.angle || 0);
        // Right-hand passenger door (sidewalk side)
        const rx = -sinA;
        const ry = cosA;
        const testX = vehicle.x + rx * 28;
        const testY = vehicle.y + ry * 28;
        const sbx = Math.floor(testX / TILE_SIZE);
        const sby = Math.floor(testY / TILE_SIZE);
        const sNav = this.map && this.map.getNavigationBlock ? this.map.getNavigationBlock(sbx, sby, vz) : null;
        if (!sNav || (sNav.groundType !== GROUND_TYPE.PAWEMENT && sNav.groundType !== GROUND_TYPE.FIELD)) return;
        const spawnX = (sbx + 0.5) * TILE_SIZE;
        const spawnY = (sby + 0.5) * TILE_SIZE;
        if (this.map.resolveCircleBuildingCollision && this.map.resolveCircleBuildingCollision(spawnX, spawnY, 10, vz).hit) return;

        vehicle.doorOpenSide = 1;
        vehicle.doorOpenTimer = 0.48;
        const civTypes = ["civ1", "civ2", "civ3", "civ4"];
        const shirtPalette = ["#38bdf8", "#f472b6", "#34d399", "#fbbf24", "#a78bfa", "#f87171"];
        const walkSpd = 23 + Math.random() * 4;
        this.peds.push(new Pedestrian({
            x: spawnX,
            y: spawnY,
            z: vz,
            angle: Math.atan2(ry, rx),
            baseWalkSpeed: walkSpd,
            speed: walkSpd,
            kind: "CIVILIAN",
            g24Type: civTypes[Math.floor(Math.random() * civTypes.length)],
            shirtColor: shirtPalette[Math.floor(Math.random() * shirtPalette.length)],
            hp: 40,
            dead: false,
            exitAnimTimer: 0.28,
            targetBx: sbx,
            targetBy: sby,
            turnSeed: Math.floor(Math.random() * 16) + 1
        }));
    }



    deployParamedicFromAmbulance(ambulance, targetCorpse) {

        if (!ambulance || ambulance.deployedMedic) return;

        ambulance.doorOpenTimer = 0.48;

        // Pick the side door facing the casualty so the paramedic steps out toward the sidewalk/beach!

        const toCasX = targetCorpse ? (targetCorpse.x - ambulance.x) : 0;

        const toCasY = targetCorpse ? (targetCorpse.y - ambulance.y) : 0;

        const rightX = -Math.sin(ambulance.angle);

        const rightY = Math.cos(ambulance.angle);

        const sideSign = (toCasX * rightX + toCasY * rightY) >= 0 ? 1 : -1;

        let doorX = ambulance.x + rightX * sideSign * 24;

        let doorY = ambulance.y + rightY * sideSign * 24;

        const vz = ambulance.z !== undefined ? ambulance.z : 2.0;

        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            const blocked = this.map.resolveCircleBuildingCollision(doorX, doorY, 10, vz).hit ||
                (this.map.isWaterAtPixel && this.map.isWaterAtPixel(doorX, doorY));
            if (blocked) {
                const altX = ambulance.x - rightX * sideSign * 24;
                const altY = ambulance.y - rightY * sideSign * 24;
                if (!this.map.resolveCircleBuildingCollision(altX, altY, 10, vz).hit && !(this.map.isWaterAtPixel && this.map.isWaterAtPixel(altX, altY))) {
                    doorX = altX;
                    doorY = altY;
                } else {
                    const c = this.map.resolveCircleBuildingCollision(doorX, doorY, 10, vz);
                    doorX = c.x;
                    doorY = c.y;
                }
            }
        }



        const medic = new Pedestrian({

            id: `medic_ped_${Date.now()}`,

            x: doorX,

            y: doorY,

            z: vz,

            angle: targetCorpse ? Math.atan2(targetCorpse.y - doorY, targetCorpse.x - doorX) : ambulance.angle,

            speed: 96,

            kind: "MEDIC",

            g24Type: "g2_medic",

            g2Remapped: true,

            shirtColor: "#38bdf8",

            hp: 55,

            dead: false,

            panicTimer: 0,

            exitAnimTimer: 0.30

        });

        medic.homeAmbulance = ambulance;

        medic.medicOutTimer = 0;

        medic.medicStuckTimer = 0;

        medic.healTimer = 0;

        medic.lastBestDist = 9999;

        ambulance.deployedMedic = medic;

        this.peds.push(medic);

        this.addFloatingText(doorX, doorY - 22, "🚑 PARAMEDIC ON FOOT!", "#38bdf8");

    }



    deployFirefighterFromTruck(fireTruck, targetCar) {

        if (!fireTruck || fireTruck.deployedFireman) return;

        fireTruck.doorOpenTimer = 0.48;

        const toFireX = targetCar ? (targetCar.x - fireTruck.x) : 0;

        const toFireY = targetCar ? (targetCar.y - fireTruck.y) : 0;

        const rightX = -Math.sin(fireTruck.angle);

        const rightY = Math.cos(fireTruck.angle);

        const sideSign = (toFireX * rightX + toFireY * rightY) >= 0 ? 1 : -1;

        let doorX = fireTruck.x + rightX * sideSign * 26;

        let doorY = fireTruck.y + rightY * sideSign * 26;

        const vz = fireTruck.z !== undefined ? fireTruck.z : 2.0;

        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            if (this.map.resolveCircleBuildingCollision(doorX, doorY, 10, vz).hit) {
                const altX = fireTruck.x - rightX * sideSign * 26;
                const altY = fireTruck.y - rightY * sideSign * 26;
                if (!this.map.resolveCircleBuildingCollision(altX, altY, 10, vz).hit) {
                    doorX = altX;
                    doorY = altY;
                } else {
                    const c = this.map.resolveCircleBuildingCollision(doorX, doorY, 10, vz);
                    doorX = c.x;
                    doorY = c.y;
                }
            }
        }



        const fireman = new Pedestrian({

            id: `fireman_ped_${Date.now()}`,

            x: doorX,

            y: doorY,

            z: vz,

            angle: targetCar ? Math.atan2(targetCar.y - doorY, targetCar.x - doorX) : fireTruck.angle,

            speed: 98,

            kind: "FIREMAN",

            g24Type: "g2_fireman",

            g2Remapped: true,

            shirtColor: "#eab308",

            hp: 85,

            maxHp: 85,

            dead: false,

            panicTimer: 0,

            exitAnimTimer: 0.30

        });

        fireman.homeFireTruck = fireTruck;

        fireman.firemanOutTimer = 0;

        fireman.firemanStuckTimer = 0;

        fireman.sprayingHose = false;

        fireman.lastBestDist = 9999;

        fireTruck.deployedFireman = fireman;

        this.peds.push(fireman);

        this.addFloatingText(doorX, doorY - 22, "🚒 VCFD FIREFIGHTER ON FOOT!", "#f97316");

    }



    steerPedWithObstacleFeelers(ped, targetX, targetY, ignoreVeh = null) {

        const directAngle = Math.atan2(targetY - ped.y, targetX - ped.x);
        const isActiveResponder = (ped.kind === "COP" || ped.kind === "MEDIC" || ped.kind === "FIREMAN" || ped.kind === "CRIMINAL");

        // Off-screen calm civilians (>840px from player) already have unobstructed tile targets from chooseNextSidewalkBlock;
        // active responders (COP, MEDIC, FIREMAN) ALWAYS run 26-ray obstacle feelers even at 1500px across Lummus Park / Vice Beach!
        if (!isActiveResponder && this.player && (Math.abs(ped.x - this.player.x) > 840 || Math.abs(ped.y - this.player.y) > 640)) {
            return directAngle;
        }

        // Reuse cached clear steering on alternate frames for distant/unobstructed pedestrians to save CPU raycasts
        if (ped._lastFeelerClear && ped._cachedSteerAngle !== undefined) {
            ped._feelerTick = ((ped._feelerTick || 0) + 1) & 1;
            const isFarFromPlayer = this.player && (Math.abs(ped.x - this.player.x) > 420 || Math.abs(ped.y - this.player.y) > 320);
            if (ped._feelerTick === 1 || (isFarFromPlayer && ((ped._feelerFarTick = ((ped._feelerFarTick || 0) + 1) & 3) !== 0))) {
                const diffDirect = Math.abs(Math.atan2(Math.sin(directAngle - ped._cachedDirectAngle), Math.cos(directAngle - ped._cachedDirectAngle)));
                if (diffDirect < 0.18) {
                    return directAngle;
                }
            }
        }

        const offsets = [0, 0.30, -0.30, 0.62, -0.62, 0.98, -0.98, 1.38, -1.38, 1.85, -1.85, 2.35, -2.35];

        const pz = ped.z !== undefined ? ped.z : 2.0;

        const curHeading = typeof ped.angle === "number" ? ped.angle : directAngle;

        let bestAngle = directAngle;

        let bestScore = -9999;

        let zeroOffsetClear = false;



        for (let oi = 0; oi < offsets.length; oi++) {
            const off = offsets[oi];
            // Branch-and-bound early exit: since offsets are ordered by increasing |off| and all obstacle terms are <= 0,
            // no subsequent offset can ever exceed -|off| * 1.35!
            if (-Math.abs(off) * 1.35 <= bestScore) {
                break;
            }

            const cand = directAngle + off;

            const cCos = Math.cos(cand);

            const cSin = Math.sin(cand);

            const turnFromCur = Math.abs(Math.atan2(Math.sin(cand - curHeading), Math.cos(cand - curHeading)));

            // Hysteresis term (-turnFromCur * 0.45) keeps the pedestrian committed to one side of an obstacle without fluttering
            const baseScore = -Math.abs(off) * 1.35 - turnFromCur * 0.45;
            if (baseScore <= bestScore) {
                continue;
            }
            let score = baseScore;

            const p1x = ped.x + cCos * 16;

            const p1y = ped.y + cSin * 16;

            const p2x = ped.x + cCos * 34;

            const p2y = ped.y + cSin * 34;

            if (this.map.isWaterAtPixel && (this.map.isWaterAtPixel(p1x, p1y) || this.map.isWaterAtPixel(p2x, p2y))) {

                score -= 90;
                if (score <= bestScore) continue;

            }

            if (this.map.resolveCircleBuildingCollision(p1x, p1y, 9, pz).hit) {

                score -= 75;

            } else if (this.map.resolveCircleBuildingCollision(p2x, p2y, 9, pz).hit) {

                score -= 36;

            }
            if (score <= bestScore) continue;

            if (ped.kind !== "FIREMAN" && ped.kind !== "MEDIC") {
                if (this.resolveCircleVehicleCollision(p1x, p1y, 9, pz, ignoreVeh).hit) {

                    score -= 68;

                } else if (this.resolveCircleVehicleCollision(p2x, p2y, 9, pz, ignoreVeh).hit) {

                    score -= 32;

                }
                if (score <= bestScore) continue;
            }

            if (ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0) {

                if (typeof this.map.isInsideLivingEventZone === "function" && this.map.isInsideLivingEventZone(p1x, p1y, 6)) {

                    score -= 40;

                }

                if (typeof this.map.isInsideCurbParkingBay === "function" && this.map.isInsideCurbParkingBay(p1x, p1y, 3)) {

                    score -= 34;

                }

                if (this.map.getNavigationBlock) {

                    const fbx = Math.floor(p1x / TILE_SIZE);

                    const fby = Math.floor(p1y / TILE_SIZE);

                    const fNav = this.map.getNavigationBlock(fbx, fby, pz);

                    if (fNav && fNav.groundType === GROUND_TYPE.ROAD && !ped.isCrossingRoad) {

                        score -= 55;

                    }

                    const flid = this.map.getBlockInfo ? (this.map.getBlockInfo(fbx, fby, 1)?.lid || 0) : 0;

                    if (fbx >= 449 && fbx <= 464 && fby >= 42 && fby <= 362 && flid === 10) {

                        score -= 42;

                    }

                }

            }

            if (score > bestScore) {

                bestScore = score;

                bestAngle = cand;

            }

            // Early exit: if straight ahead (off === 0) hit zero obstacles and requires minimal turning,
            // no deflected feeler (|off| >= 0.30, max possible score <= -0.405) can mathematically beat it!
            if (off === 0 && score === baseScore) {
                zeroOffsetClear = true;
                if (turnFromCur < 0.85) {
                    break;
                }
            }

        }

        ped._lastFeelerClear = zeroOffsetClear && bestAngle === directAngle;
        ped._cachedSteerAngle = bestAngle;
        ped._cachedDirectAngle = directAngle;

        return bestAngle;

    }



    // GTA San Andreas-style graffiti tagging [P]: spray a persistent tag on the wall in front of you
    loadGraffitiTags() {
        try {
            const raw = window.localStorage ? window.localStorage.getItem("vc26_graffiti_tags_v1") : null;
            const arr = raw ? JSON.parse(raw) : [];
            if (Array.isArray(arr)) {
                return arr.filter((t) => t && typeof t.x === "number" && typeof t.y === "number").slice(-120);
            }
        } catch (err) { /* ignore */ }
        return [];
    }

    saveGraffitiTags() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem("vc26_graffiti_tags_v1", JSON.stringify(this.graffitiTags.slice(-120)));
            }
        } catch (err) { /* ignore */ }
    }

    applyNetworkGraffitiTag(tag, save = true) {
        if (!tag || typeof tag.x !== "number" || typeof tag.y !== "number") return false;
        if (!Array.isArray(this.graffitiTags)) this.graffitiTags = [];
        for (const t of this.graffitiTags) {
            if (t && Math.hypot(t.x - tag.x, t.y - tag.y) < 18) {
                return false;
            }
        }
        this.graffitiTags.push(Object.assign({}, tag));
        if (this.graffitiTags.length > 120) this.graffitiTags.shift();
        if (save) this.saveGraffitiTags();
        return true;
    }

    startGraffitiTag() {
        const p = this.player;
        if (!p || p.dead || !this.started) return;
        if (p.inVehicle) {
            this.addFloatingText(p.x, p.y - 26, "🎨 GET OUT OF THE CAR TO TAG!", "#ff2a85");
            return;
        }
        if ((this.tagSprayTimer || 0) > 0 || (this.tagCooldown || 0) > 0) return;

        // Look for a building wall within ~34px, preferring the direction Lucia is facing
        const pz = p.z || 2.0;
        let best = null;
        let bestScore = -999;
        for (let k = 0; k < 16; k++) {
            const ang = (k / 16) * Math.PI * 2;
            const cx = Math.cos(ang), cy = Math.sin(ang);
            let hitDist = -1;
            for (let s = 8; s <= 36; s += 4) {
                if (this.map.resolveCircleBuildingCollision(p.x + cx * s, p.y + cy * s, 6, pz).hit) {
                    hitDist = s;
                    break;
                }
            }
            if (hitDist < 0) continue;
            const facing = Math.cos(this.normalizeAngleSafe(ang - (p.angle || 0)));
            const score = facing * 10 - hitDist * 0.12;
            if (score > bestScore) {
                bestScore = score;
                best = { ang, hitDist };
            }
        }
        if (!best) {
            this.addFloatingText(p.x, p.y - 26, "🎨 FIND A WALL TO TAG!", "#ffd13b");
            return;
        }

        const wx = p.x + Math.cos(best.ang) * (best.hitDist - 5);
        const wy = p.y + Math.sin(best.ang) * (best.hitDist - 5);
        for (const t of this.graffitiTags) {
            if (Math.hypot(t.x - wx, t.y - wy) < 20) {
                this.addFloatingText(p.x, p.y - 26, "🎨 ALREADY TAGGED!", "#94a3b8");
                return;
            }
        }

        const palette = [
            ["#111111", 0.03, 0.03, 0.04]
        ];
        const col = palette[Math.floor(Math.random() * palette.length)];
        p.angle = best.ang;
        this.tagSprayTarget = {
            x: wx,
            y: wy,
            z: this.map.getHeightAtPixel(wx, wy, pz),
            angle: best.ang + Math.PI * 0.5,
            style: Math.floor(Math.random() * 7),
            hex: col[0],
            r: col[1],
            g: col[2],
            b: col[3],
            seed: Math.floor(Math.random() * 1000)
        };
        this.tagSprayTimer = 1.25;
        this.tagSprayStartX = p.x;
        this.tagSprayStartY = p.y;
        if (this.audio && typeof this.audio.playBeep === "function") {
            this.audio.playBeep(1500, 0.05, "sawtooth", 0.04);
        }
    }

    updateGraffitiTagging(dt) {
        const p = this.player;
        if ((this.tagCooldown || 0) > 0) this.tagCooldown = Math.max(0, this.tagCooldown - dt);
        if (!(this.tagSprayTimer > 0)) return;
        const moved = Math.hypot(p.x - this.tagSprayStartX, p.y - this.tagSprayStartY) > 6;
        if (p.dead || p.inVehicle || moved || (p.jumpTimer || 0) > 0) {
            this.tagSprayTimer = 0;
            this.tagSprayTarget = null;
            if (!p.dead) this.addFloatingText(p.x, p.y - 26, "🎨 TAG INTERRUPTED!", "#ef4444");
            return;
        }
        const tg = this.tagSprayTarget;
        this.tagSprayTimer -= dt;
        // Aerosol mist spraying toward the wall
        const ang = Math.atan2(tg.y - p.y, tg.x - p.x);
        for (let i = 0; i < 2; i++) {
            const spread = (Math.random() - 0.5) * 0.5;
            this.particles.push({
                x: p.x + Math.cos(ang) * 8,
                y: p.y + Math.sin(ang) * 8,
                vx: Math.cos(ang + spread) * (70 + Math.random() * 50),
                vy: Math.sin(ang + spread) * (70 + Math.random() * 50),
                size: 2.2 + Math.random() * 2.0,
                kind: "SPRAY",
                color: tg.hex,
                life: 0.28,
                maxLife: 0.28
            });
        }
        if (this.tagSprayTimer <= 0) {
            this.tagSprayTimer = 0;
            this.tagCooldown = 1.2;
            tg.t = Date.now();
            tg.author = (this.net && this.net.playerName) || "LUCIA";
            this.graffitiTags.push(tg);
            if (this.graffitiTags.length > 120) this.graffitiTags.shift();
            this.saveGraffitiTags();
            if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                this.net.broadcastWorldEvent({
                    kind: "GRAFFITI_TAG",
                    tag: tg
                });
            }
            this.tagSprayTarget = null;
            this.addFloatingText(p.x, p.y - 26, `🎨 TAG #${this.graffitiTags.length} SPRAYED!`, "#39ff14");
            // Cops that see vandalism with line-of-sight and forward vision cone get angry
            const copWitness = this.hasCopWitnessNear(p.x, p.y, 280);
            if (copWitness && Math.random() < 0.7) {
                this.setWantedLevel(Math.max(this.wantedLevel, 1), { x: p.x, y: p.y }, true);
                this.addFloatingText(p.x, p.y - 44, "🚓 VANDALISM SPOTTED!", "#38bdf8");
            }
        }
    }

    normalizeAngleSafe(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    // Classic 1997 GTA 1 Horn / Siren (in vehicle) OR Famous Burp & Fart (on foot!) [G or V]

    triggerHornOrBurp() {

        const p = this.player;

        if (p.dead) return;



        if (p.inVehicle) {

            const v = p.inVehicle;

            if (v.isEmergency) {

                v.sirenActive = !v.sirenActive;

                this.audio.playHorn(true, v.specKey);

                const sTxt = v.sirenActive ? "🚨 SIREN ON!" : "🚨 SIREN OFF";

                this.addFloatingText(v.x, v.y - 28, sTxt, "#38bdf8");

                if (this.net) this.net.broadcastHorn(v.x, v.y, true, sTxt, "#38bdf8");

            } else {

                this.audio.playHorn(false, v.specKey);

                this.addFloatingText(v.x, v.y - 28, "📯 HONK! HONK!", "#ffd13b");

                if (this.net) this.net.broadcastHorn(v.x, v.y, false, "📯 HONK! HONK!", "#ffd13b");

            }

            // Make nearby pedestrians panic and clear the road away from the honking vehicle
            for (const ped of this.peds) {
                if (!ped.dead && ped.kind === "CIVILIAN" && Math.hypot(ped.x - v.x, ped.y - v.y) < 150) {
                    ped.panicTimer = 3.5;
                    ped.threatX = v.x;
                    ped.threatY = v.y;
                    ped.isCrossingRoad = false;
                    ped.angle = Math.atan2(ped.y - v.y, ped.x - v.x);
                    ped.targetBx = null;
                    ped.targetBy = null;
                }
            }

            // Make AI traffic cars directly ahead react to the player's horn (change lanes / pull over or honk back!)
            if (Array.isArray(this.vehicles)) {
                const vCos = Math.cos(v.angle || 0);
                const vSin = Math.sin(v.angle || 0);
                for (const ov of this.vehicles) {
                    if (!ov || ov === v || ov.destroyed || ov.driver !== "AI_TRAFFIC") continue;
                    const dx = ov.x - v.x;
                    const dy = ov.y - v.y;
                    const fwd = dx * vCos + dy * vSin;
                    const lat = Math.abs(-dx * vSin + dy * vCos);
                    if (fwd > 12 && fwd < 165 && lat < 38 && Math.cos((ov.angle || 0) - (v.angle || 0)) > 0.45) {
                        if (ov.aiAggressive) {
                            if (this.audio && typeof this.audio.playHorn === "function") {
                                this.audio.playHorn(false, ov.specKey);
                            }
                            ov.aiCruiseFactor = Math.min(0.80, (ov.aiCruiseFactor || 0.52) + 0.10);
                        } else {
                            const obx = Math.floor(ov.x / TILE_SIZE);
                            const oby = Math.floor(ov.y / TILE_SIZE);
                            ov.aiLaneChangeCooldown = 0;
                            if (typeof ov.tryAdjacentLaneChange === "function" && !ov.tryAdjacentLaneChange(obx, oby, ov.z || 2.0, this.map, this)) {
                                ov.aiPullOverOffset = 20;
                                ov.aiPullOverTimer = 2.2;
                            }
                        }
                    }
                }
            }

        } else {

            // GTA 6 Street Hold-Up Intimidation when armed with a firearm on foot [G / V]
            if (p.weapon && p.weapon !== "FIST" && this.director && typeof this.director.tryIntimidateStreetPed === "function") {
                const holdup = this.director.tryIntimidateStreetPed(115);
                if (holdup && holdup.ok) {
                    if (this.audio && typeof this.audio.playBeep === "function") {
                        this.audio.playBeep(480, 0.08, "sawtooth", 0.08);
                    }
                    return;
                }
            }

            // Iconic 1997 DMA Design GTA 1 on-foot Burp / Fart!

            const kind = this.audio.playBurpOrFart();

            this.addFloatingText(

                p.x,

                p.y - 26,

                kind === "BURP" ? "💨 *BUUURP!*" : "💨 *PFFFRT!*",

                "#a3e635"

            );

            this.spawnParticle(p.x - Math.cos(p.angle) * 8, p.y - Math.sin(p.angle) * 8, "WHITE_SMOKE");

        }

    }



    // Classic 1997 GTA 1 Car Bomb Arm / Field Rig [K]

    armOrRigCarBomb() {

        const p = this.player;

        if (p.dead || !p.inVehicle) {

            this.addFloatingText(p.x, p.y - 26, "💣 GET IN A CAR TO RIG/ARM BOMB [K]", "#ff2a85");

            return;

        }

        if ((p.seatIndex || 0) !== 0) {

            this.addFloatingText(p.x, p.y - 26, "💣 ONLY THE DRIVER CAN ARM CAR BOMB [K]", "#ff2a85");

            return;

        }

        const v = p.inVehicle;

        if (v.bombArmed) {

            this.addFloatingText(v.x, v.y - 28, "💣 BOMB ALREADY TICKING! BAIL OUT [F]!", "#ff1e38");

            return;

        }

        if (!v.hasBomb) {

            // Field-rig or Bomb Shop rig ($1,000 if available)

            if (this.cash >= 1000) {

                this.cash -= 1000;

            }

            v.hasBomb = true;

        }

        v.bombArmed = true;

        v.bombTimer = 5.0;

        v.bombTickSecond = 5;

        this.audio.playBeep(880, 0.12, "square", 0.1);

        this.addFloatingText(v.x, v.y - 32, "💣 5s CAR BOMB ARMED! PRESS [F] TO BAIL OUT!", "#ff1e38");

        this.sendPager(

            "BOMB SHOP",

            "5-SECOND DETONATOR ARMED! Press [F] or [Enter] right now to jump out before this ride blows sky-high!",

            true

        );

        this.updateHud();

    }



    startKillFrenzy(kf) {

        const p = this.player;

        const wep = kf.weapon || "ROCKET";

        if (wep && !p.weaponsOwned.includes(wep)) {

            p.weaponsOwned.push(wep);

        }

        if (wep) {

            p.weapon = wep;

            p.ammo[wep] = Math.max(p.ammo[wep] || 0, wep === "ROCKET" ? 12 : 120);

        }

        const cleanReward = Math.min(2500, kf.reward || 1500);
        this.killFrenzy = {

            title: kf.title || "KILL FRENZY!",

            weapon: wep,

            kills: 0,

            targetKills: kf.targetKills || 6,

            timer: kf.duration || kf.timeLimit || 35,

            reward: cleanReward

        };

        this.audio.playFanfare("FRENZY");

        this.showBigBanner(

            "KILL FRENZY!",

            `${this.killFrenzy.title} — SCORE ${this.killFrenzy.targetKills} KILLS IN ${this.killFrenzy.timer}s FOR +$${this.killFrenzy.reward.toLocaleString()} & +1 MULTIPLIER!`,

            "#ff1e38",

            3.0

        );

        this.updateHud();

    }



    recordFrenzyKill() {

        if (!this.killFrenzy) return;

        this.killFrenzy.kills++;

        if (this.killFrenzy.kills >= this.killFrenzy.targetKills) {

            const reward = Math.min(2500, this.killFrenzy.reward || 1500);

            this.killFrenzy = null;

            this.addMultiplier(1);
            if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(220);

            this.audio.playFanfare("GOURANGA");

            this.addCash(reward, "FRENZY PASSED!", true);

            this.showBigBanner(

                "FRENZY PASSED!",

                `KILL FRENZY COMPLETED! +$${reward.toLocaleString()} & MULTIPLIER x${this.multiplier}!`,

                "#39ff14",

                3.2

            );

            this.updateHud();

        } else {

            this.addFloatingText(

                this.player.x,

                this.player.y - 38,

                `💀 FRENZY: ${this.killFrenzy.kills}/${this.killFrenzy.targetKills}`,

                "#ff1e38"

            );

            this.updateHud();

        }

    }



    smashCrate(cr) {

        if (cr.smashed) return;

        cr.smashed = true;

        cr.respawnTimer = 35;

        this.audio.playCrateSmash();



        // Spawn wooden splinter particles

        for (let i = 0; i < 14; i++) {

            const ang = Math.random() * Math.PI * 2;

            const spd = 40 + Math.random() * 110;

            this.particles.push({

                x: cr.x,

                y: cr.y,

                vx: Math.cos(ang) * spd,

                vy: Math.sin(ang) * spd,

                size: 4 + Math.random() * 4,

                color: i % 2 === 0 ? "#d97706" : "#fde68a",

                life: 0.45,

                maxLife: 0.45

            });

        }



        // Award / spawn the crate's classic GTA 1 power-up immediately!

        this.applyPickupEffect({

            x: cr.x,

            y: cr.y,

            type: cr.dropType || "MULTIPLIER",

            subtype: cr.dropSubtype || "ROCKET",

            ammo: cr.dropAmmo || 10,

            label: cr.dropLabel || "CRATE BONUS"

        });

    }



    applyPickupEffect(pk) {

        const p = this.player;

        this.audio.playCashSound();

        if (pk.type === "WEAPON") {

            const sub = pk.subtype || "PISTOL";

            if (!p.weaponsOwned.includes(sub)) {

                p.weaponsOwned.push(sub);

            }

            p.weapon = sub;

            p.ammo[sub] = Math.min(999, (p.ammo[sub] || 0) + (pk.ammo || 45));

            this.addFloatingText(pk.x, pk.y - 16, `🔫 ${pk.label || sub}`, "#ffd13b");

        } else if (pk.type === "HEALTH") {

            p.hp = Math.min(p.maxHp, p.hp + 50);

            this.addFloatingText(pk.x, pk.y - 16, "❤️ HEALTH +50", "#39ff14");

        } else if (pk.type === "ARMOR") {

            p.armor = p.maxArmor;

            this.addFloatingText(pk.x, pk.y - 16, "🛡️ KEVLAR ARMOR FULL", "#00f0ff");

        } else if (pk.type === "BRIBE") {

            this.setWantedLevel(this.wantedLevel - 2);

            this.addFloatingText(pk.x, pk.y - 16, "⭐ POLICE BRIBE (-2★)", "#00f0ff");

        } else if (pk.type === "JAIL_FREE") {

            this.jailFreeCards = Math.min(9, (this.jailFreeCards || 0) + 1);

            this.addFloatingText(pk.x, pk.y - 16, "🃏 GET OUT OF JAIL FREE CARD!", "#ffd13b");

        } else if (pk.type === "MULTIPLIER") {

            this.addMultiplier(1);

            this.addFloatingText(pk.x, pk.y - 16, `✨ MULTIPLIER x${this.multiplier}!`, "#39ff14");

        } else if (pk.type === "EXTRA_LIFE") {

            this.lives = Math.min(9, (this.lives || 3) + 1);

            this.addFloatingText(pk.x, pk.y - 16, `❤️ EXTRA LIFE! (LIVES: ${this.lives})`, "#ff2a85");

        } else if (pk.type === "CASH") {

            this.addCash(Math.min(500, pk.amount || 250), pk.label, true);

        }

        this.updateHud();

    }



    recruitJason() {

        this.jason = null;

    }



    canCopIdentifyPlayer(copX, copY, copAngle = null, maxRange = 460) {
        if (this.director && typeof this.director.canCopIdentifyPlayer === "function") {
            return this.director.canCopIdentifyPlayer(copX, copY, copAngle, maxRange);
        }
        const p = this.player;
        if (!p || p.dead || this.activeInterior || (this.wantedLevel || 0) <= 0) return false;
        const pEnt = p.inVehicle || p;
        const pZ = (pEnt.z !== undefined ? pEnt.z : p.z) || 2.0;
        const playerOnOpenBeach = Boolean(
            (pEnt.x >= 447.2 * TILE_SIZE && pEnt.y >= 44 * TILE_SIZE && pEnt.y <= 368 * TILE_SIZE) ||
            (this.map && this.map.getTileAtPixel && typeof TILE !== "undefined" && this.map.getTileAtPixel(pEnt.x, pEnt.y) === TILE.SAND)
        );
        const copNearBeachfront = copX >= 443.0 * TILE_SIZE || (this.map && this.map.getTileAtPixel && typeof TILE !== "undefined" && this.map.getTileAtPixel(copX, copY) === TILE.SAND);
        const effectiveMaxRange = (playerOnOpenBeach && copNearBeachfront) ? Math.max(maxRange, 2450) : maxRange;
        const dx = pEnt.x - copX;
        const dy = pEnt.y - copY;
        if (Math.abs(dx) >= effectiveMaxRange || Math.abs(dy) >= effectiveMaxRange) return false;
        const d = Math.hypot(dx, dy);
        if (d >= effectiveMaxRange) return false;

        // 1. Physical line-of-sight check against solid 3D buildings (always trace beyond 42px!)
        if (d >= 42 && this.map && typeof this.map.traceSegment2D === "function") {
            if (this.map.traceSegment2D(copX, copY, pEnt.x, pEnt.y, pZ).hit) return false;
        }

        // 2. Forward vision cone check (unless very close < 105px or player is actively firing a gun!)
        const activelyFiring = (p.muzzleTimer || 0) > 0;
        if (typeof copAngle === "number" && d >= 105 && !activelyFiring) {
            const cosFwd = (dx * Math.cos(copAngle) + dy * Math.sin(copAngle)) / Math.max(1, d);
            const minCos = (playerOnOpenBeach && copNearBeachfront) ? -0.65 : -0.20;
            if (cosFwd < minCos) return false;
        }

        // 3. Suspect identification check:
        // If a police officer has already visually identified the player during this wanted pursuit, they recognize the suspect on sight
        // unless the player switched into an unspotted civilian vehicle while unseen and is driving calmly > 175px away!
        const inUnspottedCivCar = Boolean(
            p.inVehicle &&
            !p.inVehicle.isPolice &&
            p.inVehicle !== this.wantedSpottedVehicle &&
            Math.abs(p.inVehicle.speed || 0) < 155 &&
            !activelyFiring &&
            (p.playerCombatTimer || 0) <= 0
        );
        if (this.isPoliceSpotted || this.hasBeenDirectlySpottedByCop) {
            if (inUnspottedCivCar && d > 175) return false;
            return true;
        }

        // Otherwise (911 witness call only — police are responding to the reported crime scene and have never laid eyes on the perpetrator yet!):
        const scene = this.lastKnownWantedPos;
        const distToScene = scene ? Math.hypot(pEnt.x - scene.x, pEnt.y - scene.y) : 0;
        const playerOnBeachSand = Boolean(
            pEnt.x >= 451.0 * TILE_SIZE ||
            (this.map && this.map.getTileAtPixel && typeof TILE !== "undefined" && this.map.getTileAtPixel(pEnt.x, pEnt.y) === TILE.SAND)
        );
        const sceneNearBeach = Boolean(scene && (scene.x >= 441.5 * TILE_SIZE || (this.map && this.map.getTileAtPixel && typeof TILE !== "undefined" && this.map.getTileAtPixel(scene.x, scene.y) === TILE.SAND)));
        const atCrimeScene = distToScene < ((playerOnBeachSand && sceneNearBeach && !inUnspottedCivCar) ? 1850 : 240);
        const openlyArmedOnFoot = !p.inVehicle && Boolean(p.weapon && p.weapon !== "FIST");
        const inRecentCombat = activelyFiring || (p.playerCombatTimer || 0) > 0 || (p.weaponDrawnTimer || 0) > 0;
        const inReportedOrPoliceCar = Boolean(p.inVehicle && (p.inVehicle === this.wantedSpottedVehicle || p.inVehicle.isPolice));
        const recklessSpeedingNearCop = Boolean(p.inVehicle && Math.abs(p.inVehicle.speed || 0) >= 160 && d < 240);
        const pointBlank = d < 78;

        return (
            atCrimeScene ||
            openlyArmedOnFoot ||
            inRecentCombat ||
            inReportedOrPoliceCar ||
            recklessSpeedingNearCop ||
            pointBlank
        );
    }

    getNearestWantedTarget(fromX, fromY, fromAngle = null) {

        const candidates = [];

        const p = this.player;

        const effectiveGlobalWanted = this.wantedLevel || 0;



        if (this.wantedLevel > 0 && p && !p.dead) {

            const v = p.inVehicle;
            const realX = v ? v.x : p.x;
            const realY = v ? v.y : p.y;
            const realZ = (v ? v.z : p.z) || 2.0;
            const hasDirectSight = this.canCopIdentifyPlayer(fromX, fromY, fromAngle, 480);

            // Real-Life APB Search Logic:
            // Cops only know the player's live position if this unit has direct sight OR another police unit currently has visual contact (isPoliceSpotted).
            // Otherwise, all units converge on and search the Last Known Position / Crime Scene (lastKnownWantedPos)!
            const useLastKnown = !hasDirectSight && !this.isPoliceSpotted && Boolean(this.lastKnownWantedPos);
            let targX = useLastKnown ? this.lastKnownWantedPos.x : realX;
            let targY = useLastKnown ? this.lastKnownWantedPos.y : realY;

            if (useLastKnown) {
                const dToLastKnown = Math.hypot(targX - fromX, targY - fromY);
                if (dToLastKnown < 240) {
                    // If the crime scene is along Ocean Drive / Lummus Park and the suspect fled east onto the open beach sand,
                    // sweep eastward into Lummus Park / Vice Beach so responding units naturally inspect the beachfront!
                    const onSandNow = realX >= 451.0 * TILE_SIZE || (this.map && this.map.getTileAtPixel && typeof TILE !== "undefined" && this.map.getTileAtPixel(realX, realY) === TILE.SAND);
                    const playerFledToBeach = onSandNow && targX >= 441.5 * TILE_SIZE && Math.hypot(realX - targX, realY - targY) < 2200;
                    if (playerFledToBeach) {
                        targX = Math.min(realX, Math.max(targX + 260, 452.0 * TILE_SIZE));
                        targY = targY + Math.max(-220, Math.min(220, realY - targY));
                    } else {
                        const searchPhase = (performance.now() * 0.00085) + ((Math.round(fromX + fromY) % 13) * 0.48);
                        targX += Math.cos(searchPhase) * 135;
                        targY += Math.sin(searchPhase) * 135;
                    }
                }
            }

            candidates.push({

                x: targX,

                y: targY,

                z: realZ,

                angle: (v ? v.angle : p.angle) || 0,

                vx: useLastKnown ? 0 : (v ? (v.vx || 0) : 0),

                vy: useLastKnown ? 0 : (v ? (v.vy || 0) : 0),

                speed: useLastKnown ? 0 : (v ? (v.speed || 0) : 0),

                inVehicle: useLastKnown ? false : Boolean(v),

                isRemote: false,

                isCriminalNPC: false,

                isSearchPoint: useLastKnown,

                wantedLevel: this.wantedLevel

            });

        }



        // Ambient Crime Targets (AI_CRIMINAL getaway vehicles & CRIMINAL bandits on foot within 950px)
        const crimVehs = this._criminalVehicles || this.vehicles;
        if (Array.isArray(crimVehs)) {
            for (let vi = 0; vi < crimVehs.length; vi++) {
                const v = crimVehs[vi];
                if (!v || v.destroyed || v.driver !== "AI_CRIMINAL") continue;
                if (Math.abs(v.x - fromX) > 950 || Math.abs(v.y - fromY) > 950) continue;
                if (Math.hypot(v.x - fromX, v.y - fromY) > 950) continue;
                candidates.push({
                    x: v.x,
                    y: v.y,
                    z: v.z || 2.0,
                    angle: v.angle || 0,
                    vx: v.vx || 0,
                    vy: v.vy || 0,
                    speed: v.speed || Math.hypot(v.vx || 0, v.vy || 0),
                    inVehicle: true,
                    isRemote: false,
                    isCriminalNPC: true,
                    vehRef: v,
                    wantedLevel: 2
                });
            }
        }
        const crimPeds = this._criminalPeds || this.peds;
        if (Array.isArray(crimPeds)) {
            for (let pi = 0; pi < crimPeds.length; pi++) {
                const ped = crimPeds[pi];
                if (!ped || ped.dead || ped.kind !== "CRIMINAL") continue;
                if (Math.abs(ped.x - fromX) > 950 || Math.abs(ped.y - fromY) > 950) continue;
                if (Math.hypot(ped.x - fromX, ped.y - fromY) > 950) continue;
                candidates.push({
                    x: ped.x,
                    y: ped.y,
                    z: ped.z || 2.0,
                    angle: ped.angle || 0,
                    vx: Math.cos(ped.angle || 0) * (ped.speed || 0),
                    vy: Math.sin(ped.angle || 0) * (ped.speed || 0),
                    speed: ped.speed || 0,
                    inVehicle: false,
                    isRemote: false,
                    isCriminalNPC: true,
                    pedRef: ped,
                    wantedLevel: 2
                });
            }
        }



        if (candidates.length === 0) return null;

        let best = candidates[0];

        const scoreCandidate = (c) => {
            const rawDist = Math.hypot(c.x - fromX, c.y - fromY);
            // Prioritize wanted human players over ambient NPC criminals when a player is wanted nearby
            if (c.isCriminalNPC && effectiveGlobalWanted > 0) {
                return rawDist + 320;
            }
            return rawDist;
        };

        let bestScore = scoreCandidate(best);

        for (let i = 1; i < candidates.length; i++) {

            const c = candidates[i];

            const sc = scoreCandidate(c);

            if (sc < bestScore) {

                bestScore = sc;

                best = c;

            }

        }

        return best;

    }



    clearAllPlayerPursuit(despawnNearPoint = false) {
        this.wantedLevel = 0;
        this.wantedDecayTimer = 0;
        this.copSpawnTimer = 0;
        this.crimeHeat = 0;
        this.policeHeli = null;

        // Disown any in-flight player projectiles so delayed hits after WASTED/BUSTED never trigger new wanted stars
        if (Array.isArray(this.projectiles)) {
            for (const pr of this.projectiles) {
                if (pr.fromPlayer) pr.fromPlayer = false;
            }
        }

        // Clear player hit attribution on vehicles (prevents delayed car explosions from adding wanted stars after death/arrest)
        // and calm down pursuing AI_COP cruisers
        let removedAnyVeh = false;
        if (Array.isArray(this.vehicles)) {
            for (let i = this.vehicles.length - 1; i >= 0; i--) {
                const v = this.vehicles[i];
                v.lastHitByPlayer = false;
                v.damagedByPlayer = false;
                if (v.isPolice) {
                    v.sirenActive = false;
                }
                if (v.driver === "AI_COP") {
                    v.sirenActive = false;
                    if (despawnNearPoint && this.player && Math.hypot(v.x - this.player.x, v.y - this.player.y) < 380) {
                        if (v._worldModified && this.net && typeof this.net.broadcastVehicleRemoved === "function" && v.id) {
                            this.net.broadcastVehicleRemoved(v.id);
                        }
                        this.vehicles.splice(i, 1);
                        removedAnyVeh = true;
                    } else {
                        v.driver = "AI_TRAFFIC";
                    }
                }
            }
        }
        if (removedAnyVeh && typeof this.rebuildVehicleSpatialGrid === "function") {
            this.rebuildVehicleSpatialGrid();
        }

        // Reset all NPC aggro / pursuit / 911 witness flags toward the player
        this.pending911Report = null;
        this.wantedSpottedVehicle = null;
        this.crimeSceneLockTimer = 0;
        this.crimeSceneSearchedTimer = 0;
        if (Array.isArray(this.peds)) {
            for (let i = this.peds.length - 1; i >= 0; i--) {
                const ped = this.peds[i];
                if (ped.dead) continue;
                ped.carjackedCop = false;
                ped.attackedByPlayer = false;
                ped.provokedByPlayer = false;
                ped.inCombat = false;
                ped.calling911Timer = 0;
                ped.calling911Stars = 0;
                ped.calling911Pos = null;
                ped._boardingVeh = null;
                if (ped.kind === "HOSTILE") {
                    ped.kind = "CIVILIAN";
                    ped.panicTimer = 0;
                } else if (ped.kind === "COP") {
                    ped.bustedGraceTimer = 5.0;
                    if (despawnNearPoint && this.player && Math.hypot(ped.x - this.player.x, ped.y - this.player.y) < 380) {
                        this.peds.splice(i, 1);
                    }
                } else if (ped.kind === "CRIMINAL" && despawnNearPoint && this.player && Math.hypot(ped.x - this.player.x, ped.y - this.player.y) < 380) {
                    this.peds.splice(i, 1);
                }
            }
        }
    }

    hasCopWitnessNear(x, y, maxDist = 460) {
        if (this.director && typeof this.director.hasCopWitnessNear === "function") {
            return this.director.hasCopWitnessNear(x, y, maxDist);
        }
        if (this.activeInterior) return false;
        const pz = (this.player && (this.player.inVehicle ? this.player.inVehicle.z : this.player.z)) || 2.0;
        const pedCap = Math.min(400, maxDist);
        const isLoudShot = Boolean(this.player && (this.player.muzzleTimer || 0) > 0);
        if (Array.isArray(this.peds)) {
            for (const ped of this.peds) {
                if (!ped.dead && ped.kind === "COP") {
                    const dx = x - ped.x;
                    const dy = y - ped.y;
                    if (Math.abs(dx) >= pedCap || Math.abs(dy) >= pedCap) continue;
                    const d = Math.hypot(dx, dy);
                    if (d < pedCap) {
                        const blocked = d >= 42 && this.map && this.map.traceSegment2D && this.map.traceSegment2D(ped.x, ped.y, x, y, pz).hit;
                        if (blocked) continue;
                        if (d >= 110 && !isLoudShot && typeof ped.angle === "number") {
                            const cosFwd = (dx * Math.cos(ped.angle) + dy * Math.sin(ped.angle)) / Math.max(1, d);
                            if (cosFwd < -0.25) continue;
                        }
                        return true;
                    }
                }
            }
        }
        if (Array.isArray(this.vehicles)) {
            for (const v of this.vehicles) {
                if (!v.destroyed && v.isPolice && (v.driver === "AI_COP" || v.driver === "AI_TRAFFIC")) {
                    const dx = x - v.x;
                    const dy = y - v.y;
                    if (Math.abs(dx) >= maxDist || Math.abs(dy) >= maxDist) continue;
                    const d = Math.hypot(dx, dy);
                    if (d < maxDist) {
                        const blocked = d >= 42 && this.map && this.map.traceSegment2D && this.map.traceSegment2D(v.x, v.y, x, y, pz).hit;
                        if (blocked) continue;
                        if (d >= 125 && !isLoudShot && typeof v.angle === "number") {
                            const cosFwd = (dx * Math.cos(v.angle) + dy * Math.sin(v.angle)) / Math.max(1, d);
                            if (cosFwd < -0.25) continue;
                        }
                        return true;
                    }
                }
            }
        }
        if (this.policeHeli && !this.policeHeli.departing && Math.hypot(this.policeHeli.x - x, this.policeHeli.y - y) < 360) {
            return true;
        }
        return false;
    }

    reportCrimeAt(x, y, targetStars, isExplosion = false, crimeOpts = null) {
        if (this.director && typeof this.director.reportCrime === "function") {
            return this.director.reportCrime(x, y, targetStars, isExplosion, crimeOpts);
        }
        if (!this.player || this.player.dead || (this.player.respawnGraceUntil || 0) > performance.now()) return false;
        const clampedStars = Math.max(1, Math.min(6, Math.floor(targetStars || 1)));
        const involvedVeh = (crimeOpts && crimeOpts.veh !== undefined) ? crimeOpts.veh : (this.player.inVehicle || null);
        const isGunfire = Boolean(
            isExplosion ||
            (crimeOpts && crimeOpts.isGunfire) ||
            (this.player.muzzleTimer || 0) > 0 ||
            (!this.player.inVehicle && this.player.weapon && this.player.weapon !== "FIST" && (this.player.weaponDrawnTimer || 0) > 0)
        );

        // Case 1: Direct Police Sight (or player is already actively spotted by VCPD) -> Radio alert!
        if ((this.wantedLevel > 0 && this.isPoliceSpotted) || this.hasCopWitnessNear(x, y, isExplosion ? 520 : 330)) {
            this.setWantedLevel(Math.max(this.wantedLevel || 0, clampedStars), { x, y }, true, involvedVeh);
            return true;
        }

        // Case 2: Civilian Witness 911 Call -> Find nearest living civilian witness within sight (or gunshot/explosion hearing) who dials 911!
        const maxWitnessDist = isExplosion ? 560 : (isGunfire ? 335 : 285);
        let bestWitness = null;
        let bestDist = maxWitnessDist;
        const pz = (this.player.inVehicle ? this.player.inVehicle.z : this.player.z) || 2.0;

        if (Array.isArray(this.peds)) {
            for (const ped of this.peds) {
                if (
                    ped.dead ||
                    ped.kind !== "CIVILIAN" ||
                    (ped.stunnedTimer || 0) > 0 ||
                    (ped.burnTimer || 0) > 0 ||
                    (ped.electroTimer || 0) > 0 ||
                    (ped.drownTimer || 0) > 0
                ) {
                    continue;
                }
                const d = Math.hypot(ped.x - x, ped.y - y);
                if (d < bestDist && d > 12) {
                    const blockedByBuilding = d >= 36 && this.map && this.map.traceSegment2D && this.map.traceSegment2D(ped.x, ped.y, x, y, pz).hit;
                    const hasVisualSight = !blockedByBuilding;
                    const hasAcousticHearing = (isExplosion && d < 420) || (isGunfire && d < 175);
                    if (hasVisualSight || hasAcousticHearing) {
                        bestDist = d;
                        bestWitness = ped;
                    }
                }
            }
        }

        if (bestWitness) {
            const callDuration = isExplosion ? 5.0 : 7.5;
            bestWitness.calling911Timer = bestWitness.calling911Timer > 0
                ? Math.min(bestWitness.calling911Timer, callDuration)
                : callDuration;
            bestWitness.calling911Stars = Math.max(bestWitness.calling911Stars || 0, clampedStars);
            bestWitness.calling911Pos = { x, y };
            bestWitness.calling911Veh = involvedVeh;
            bestWitness.panicTimer = Math.max(bestWitness.panicTimer || 0, callDuration + 2.5);
            bestWitness.threatX = x;
            bestWitness.threatY = y;
            const nowMs = performance.now();
            if (nowMs - (this._last911FloatAt || 0) > 1800) {
                this._last911FloatAt = nowMs;
                this.addFloatingText(bestWitness.x, bestWitness.y - 24, "📞 WITNESS CALLING 911!", "#facc15");
            }
            return true;
        }

        // Case 3: Massive Explosion Acoustic 911 Report (neighbors/residents hear the blast wave even if street peds were wiped out)
        if (isExplosion) {
            this.pending911Report = {
                timer: this.pending911Report ? Math.min(this.pending911Report.timer, 2.4) : 2.8,
                stars: Math.max(this.pending911Report ? this.pending911Report.stars : 0, clampedStars),
                pos: { x, y },
                veh: involvedVeh
            };
            return true;
        }

        // Unwitnessed crime in an isolated spot -> 0★, no 911 call!
        return false;
    }

    setWantedLevel(level, crimePos = null, directlySpotted = null, reportedVeh = undefined) {

        const clamped = Math.max(0, Math.min(6, Math.floor(level)));

        // Never allow wanted stars to increase while the player is dead/busted or during respawn grace
        if (clamped > 0 && this.player && (this.player.dead || (this.player.respawnGraceUntil || 0) > performance.now())) {
            return;
        }

        const prevWanted = this.wantedLevel || 0;
        const ent = this.player ? (this.player.inVehicle || this.player) : { x: 0, y: 0 };
        const reportedX = (crimePos && Number.isFinite(crimePos.x)) ? crimePos.x : ent.x;
        const reportedY = (crimePos && Number.isFinite(crimePos.y)) ? crimePos.y : ent.y;
        const isDirect = directlySpotted !== null
            ? Boolean(directlySpotted)
            : Boolean(this.isPoliceSpotted || this.hasCopWitnessNear(reportedX, reportedY));

        if (prevWanted === 0 && clamped > 0) {

            // Measured Dispatch Timing: give the player generous breathing room (~14.5s..17.5s) before the first precinct unit is dispatched!
            this.copSpawnTimer = isDirect ? 3.0 : 0.0;
            this.wantedPeakLevel = clamped;
            this.hasBeenDirectlySpottedByCop = isDirect;
            this._crimeSceneAnnounced = false;

        } else if (clamped > prevWanted) {

            this.wantedPeakLevel = Math.max(this.wantedPeakLevel || 1, clamped);
            if (isDirect) this.hasBeenDirectlySpottedByCop = true;

        } else if (clamped === 0) {

            if (prevWanted > 0 && this.player && !this.player.dead) {
                this.addFloatingText(this.player.x, this.player.y - 32, "🕵️ VCPD EVADED — WANTED CLEARED!", "#39ff14");
            }
            this.crimeHeat = 0;
            this.wantedGetawayPot = 0;
            this.wantedPeakLevel = 0;
            this.isPoliceSpotted = false;
            this.hasBeenDirectlySpottedByCop = false;
            this._crimeSceneAnnounced = false;
            this.lastKnownWantedPos = null;
            this.wantedSpottedVehicle = null;
            this.crimeSceneLockTimer = 0;
            this.crimeSceneSearchedTimer = 0;

            this.clearAllPlayerPursuit(false);

        } else if (clamped < prevWanted && this.player && !this.player.dead) {
            this.addFloatingText(this.player.x, this.player.y - 30, `🕵️ EVADED -1★! (${clamped}★ LEFT)`, "#38bdf8");
            if (this.audio && typeof this.audio.playBeep === "function") {
                this.audio.playBeep(660, 0.08, "sine", 0.08);
            }
        }

        if (clamped >= prevWanted && clamped > 0 && this.player) {
            this.lastKnownWantedPos = { x: reportedX, y: reportedY };
            this.crimeSceneLockTimer = Math.max(this.crimeSceneLockTimer || 0, 34.0);
            this.crimeSceneSearchedTimer = 0;

            if (isDirect) {
                this.isPoliceSpotted = true;
                this.hasBeenDirectlySpottedByCop = true;
                this.wantedSpottedVehicle = this.player.inVehicle || null;
            } else if (reportedVeh !== undefined) {
                this.wantedSpottedVehicle = reportedVeh;
            }
            if (clamped > prevWanted && !this.player.ankleScrambled) {
                this.audio.playAnkleMonitorAlert();
            }
        }

        this.wantedLevel = clamped;

        this.wantedDecayTimer = 0;

        this.updateHud();

    }

    get score() {
        return this.cash;
    }

    set score(val) {
        this.cash = Math.max(0, Number(val) || 0);
    }

    addScore(_amount, _label = "") {
        // Street prop smashes (bushes, cones, benches, streetlights) do not grant free cash
    }

    addCash(amount, label = "", skipCombo = false) {
        const amt = Number(amount) || 0;
        if (amt <= 0) return;
        const turfBonusMult = (!skipCombo && this.isCurrentDistrictControlledByMe()) ? 1.10 : 1.0;
        const hotspotMult = (!skipCombo && typeof this.isInsideActiveFlashDistrict === "function" && this.isInsideActiveFlashDistrict()) ? 1.50 : 1.0;
        const coopMult = (!skipCombo && this.net && typeof this.net.hasSyndicateCoopPartnerNear === "function" && this.net.hasSyndicateCoopPartnerNear()) ? 1.50 : 1.0;
        const total = Math.floor(amt * Math.max(1, this.multiplier || 1) * turfBonusMult * hotspotMult * coopMult);
        this.cash += total;
        if (!skipCombo) {
            this.addTurfInfluence(Math.min(total, 1500));
        }
        if (this.player) {
            const turfTag = turfBonusMult > 1.0 ? " 👑+10%" : "";
            const hotTag = hotspotMult > 1.0 ? " 🔥HOT" : "";
            const coopTag = coopMult > 1.0 ? " 🤝CO-OP" : "";
            if (label) {
                this.addFloatingText(this.player.x, this.player.y - 22, `${label} +$${total.toLocaleString()}${turfTag}${hotTag}${coopTag}`, "#39ff14");
            } else {
                this.addFloatingText(this.player.x, this.player.y - 22, `+$${total.toLocaleString()}${turfTag}${hotTag}${coopTag}`, "#39ff14");
            }
        }
        this._checkScoreMilestonesAndSave();
        this.updateHud();
    }

    _checkScoreMilestonesAndSave() {
        const pName = (this.net && this.net.playerName) || (this.player && this.player.nickname) || "LUCIA";
        const pColor = (this.net && this.net.playerColor) || "#ff2a85";
        this.recordHighScore(pName, (this.player && this.player.charId) || "LUCIA", this.cash, pColor, true);

        if (!this.chapterCleared && this.cash >= this.targetScore) {
            this.chapterCleared = true;
            this.audio.playFanfare("GOURANGA");
            this.showBigBanner(
                "CHAPTER TARGET REACHED!",
                "$1,000,000 SCORE GOAL CLEARED — LEONIDA STATE KINGPIN STATUS UNLOCKED!",
                "#ffd13b",
                4.2
            );
        }
    }

    triggerArcadeCombo(baseAmount, label = "", _color = "#39ff14", _addTimerSec = 2.5, _showFloat = true) {
        this.addCash(baseAmount, label);
        return Math.floor((Number(baseAmount) || 0) * Math.max(1, this.multiplier || 1));
    }

    getMaxComboDuration() {
        return 6.0;
    }

    /* ========================================================================
       03 — MULTIPLAYER "KING OF THE DISTRICT" LIVE TURF WAR SYSTEM
       ======================================================================== */
    ensureTurfZones() {
        if (this.turfZones) return this.turfZones;
        this.myTurfScores = {};
        this.turfZones = {
            OCEAN_DRIVE: {
                key: "OCEAN_DRIVE",
                shortLabel: "OCEAN DRIVE",
                x: mx256(213.5) * TILE_SIZE,
                y: my256(146.0) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#ff2a85",
                leaderScore: 0
            },
            NORTH_BEACH: {
                key: "NORTH_BEACH",
                shortLabel: "NORTH BEACH",
                x: mx256(213.5) * TILE_SIZE,
                y: my256(48.0) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#22d3ee",
                leaderScore: 0
            },
            STAR_ISLAND: {
                key: "STAR_ISLAND",
                shortLabel: "STAR ISLAND",
                x: mx256(173.0) * TILE_SIZE,
                y: my256(106.5) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#c084fc",
                leaderScore: 0
            },
            DOWNTOWN: {
                key: "DOWNTOWN",
                shortLabel: "DOWNTOWN VC",
                x: mx256(141.5) * TILE_SIZE,
                y: my256(116.5) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#818cf8",
                leaderScore: 0
            },
            WYNWOOD_HAITI: {
                key: "WYNWOOD_HAITI",
                shortLabel: "WYNWOOD / HAITI",
                x: mx256(115.5) * TILE_SIZE,
                y: my256(82.5) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#e879f9",
                leaderScore: 0
            },
            VICE_PORT: {
                key: "VICE_PORT",
                shortLabel: "VICE PORT",
                x: mx256(171.5) * TILE_SIZE,
                y: my256(164.5) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#38bdf8",
                leaderScore: 0
            },
            PORT_GELLHORN: {
                key: "PORT_GELLHORN",
                shortLabel: "PORT GELLHORN",
                x: 84.5 * TILE_SIZE,
                y: 174.5 * TILE_SIZE,
                leaderName: null,
                leaderColor: "#fb923c",
                leaderScore: 0
            },
            VCIA_KEYS: {
                key: "VCIA_KEYS",
                shortLabel: "VCIA & KEYS",
                x: mx256(66.5) * TILE_SIZE,
                y: my256(152.0) * TILE_SIZE,
                leaderName: null,
                leaderColor: "#39ff14",
                leaderScore: 0
            }
        };
        try {
            const raw = window.localStorage ? window.localStorage.getItem("vc26_turf_standings_v2") : null;
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    for (const [tk, tv] of Object.entries(parsed)) {
                        if (this.turfZones[tk] && tv && tv.leaderName && Number(tv.leaderScore) > 0) {
                            this.turfZones[tk].leaderName = tv.leaderName;
                            this.turfZones[tk].leaderColor = tv.leaderColor || this.turfZones[tk].leaderColor;
                            this.turfZones[tk].leaderScore = Number(tv.leaderScore) || 0;
                        }
                    }
                }
            }
        } catch (_e) {}
        return this.turfZones;
    }

    saveTurfStandings() {
        try {
            if (!window.localStorage || !this.turfZones) return;
            const out = {};
            for (const [tk, z] of Object.entries(this.turfZones)) {
                if (z && z.leaderName && z.leaderScore > 0) {
                    out[tk] = {
                        leaderName: z.leaderName,
                        leaderColor: z.leaderColor,
                        leaderScore: z.leaderScore
                    };
                }
            }
            window.localStorage.setItem("vc26_turf_standings_v2", JSON.stringify(out));
        } catch (_e) {}
    }

    getTurfKeyForDistrict(distStr = this.currentDistrict) {
        const d = String(distStr || "OCEAN DRIVE").toUpperCase();
        if (d.includes("STAR") || d.includes("VENETIAN")) return "STAR_ISLAND";
        if (d.includes("NORTH") || d.includes("NINE1NINE") || d.includes("SERA") || d.includes("SHORES")) return "NORTH_BEACH";
        if (d.includes("WYNWOOD") || d.includes("HAITI") || d.includes("JACK") || d.includes("LAKE")) return "WYNWOOD_HAITI";
        if (d.includes("DOWNTOWN") || d.includes("STADIUM") || d.includes("BAYFRONT")) return "DOWNTOWN";
        if (d.includes("VICE PORT") || d.includes("CRUISE")) return "VICE_PORT";
        if (d.includes("GELLHORN") || d.includes("SPEEDWAY") || d.includes("PENITENTIARY")) return "PORT_GELLHORN";
        if (d.includes("VCIA") || d.includes("AIRPORT") || d.includes("KEYS") || d.includes("GRASSRIVERS") || d.includes("MUD")) return "VCIA_KEYS";
        return "OCEAN_DRIVE";
    }

    getCurrentDistrictTurf() {
        const zones = this.ensureTurfZones();
        return zones[this.getTurfKeyForDistrict(this.currentDistrict)] || zones.OCEAN_DRIVE;
    }

    isCurrentDistrictControlledByMe() {
        const z = this.getCurrentDistrictTurf();
        const myName = String((this.net && this.net.playerName) || (this.player && this.player.nickname) || "LUCIA").toUpperCase();
        return Boolean(z && z.leaderName && String(z.leaderName).toUpperCase() === myName);
    }

    getMyTurfControlledCount() {
        const zones = this.ensureTurfZones();
        const myName = String((this.net && this.net.playerName) || (this.player && this.player.nickname) || "LUCIA").toUpperCase();
        let count = 0;
        for (const z of Object.values(zones)) {
            if (z.leaderName && String(z.leaderName).toUpperCase() === myName) count++;
        }
        return count;
    }

    getFlashDistrictCatalog() {
        return [
            { index: 0, key: "OCEAN_DRIVE", label: "OCEAN DRIVE NEON STRIP", x: Math.round(445.5 * TILE_SIZE), y: Math.round(279.0 * TILE_SIZE), color: "#ff2a85" },
            { index: 1, key: "STAR_ISLAND", label: "STAR ISLAND PALAZZO", x: Math.round(348.5 * TILE_SIZE), y: Math.round(173.5 * TILE_SIZE), color: "#c084fc" },
            { index: 2, key: "DOWNTOWN", label: "DOWNTOWN & LITTLE CUBA", x: Math.round(288.5 * TILE_SIZE), y: Math.round(202.5 * TILE_SIZE), color: "#38bdf8" },
            { index: 3, key: "WYNWOOD_HAITI", label: "WYNWOOD & MAMBAS STADIUM", x: Math.round(215.5 * TILE_SIZE), y: Math.round(148.5 * TILE_SIZE), color: "#39ff14" }
        ];
    }

    ensureActiveFlashDistrict() {
        if (!this.activeFlashDistrict) {
            const d = this.getFlashDistrictCatalog()[0];
            this.activeFlashDistrict = {
                index: d.index,
                key: d.key,
                label: d.label,
                x: d.x,
                y: d.y,
                color: d.color,
                timer: 180.0,
                maxTimer: 180.0,
                flamingoScore: 0,
                cyanScore: 0
            };
        }
        return this.activeFlashDistrict;
    }

    isInsideActiveFlashDistrict(wx, wy) {
        const fd = this.ensureActiveFlashDistrict();
        if (!fd || !this.player) return false;
        const pObj = this.player.inVehicle || this.player;
        const px = typeof wx === "number" ? wx : pObj.x;
        const py = typeof wy === "number" ? wy : pObj.y;
        if (Math.hypot(px - fd.x, py - fd.y) <= 1650) return true;
        return this.getTurfKeyForDistrict(this.currentDistrict) === fd.key;
    }

    teleportToFlashDistrict() {
        const fd = this.ensureActiveFlashDistrict();
        if (!fd || !this.player) return false;
        if (this.activeInterior) {
            this.activeInterior = null;
            this.interiorTracers = [];
            this.interiorPopups = [];
        }
        if (this.player.inVehicle && (this.player.seatIndex || 0) !== 0) {
            this.player.inVehicle = null;
            this.player.seatIndex = 0;
        }
        const targetObj = this.player.inVehicle || this.player;
        if (this.player.inVehicle) {
            this.player.inVehicle._worldModified = true;
            this.player.inVehicle.isStaticParked = false;
        }
        let fx = fd.x;
        let fy = fd.y;
        const fz = this.map && typeof this.map.getHeightAtPixel === "function" ? this.map.getHeightAtPixel(fx, fy, 2.0) : 2.0;
        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            const col = this.map.resolveCircleBuildingCollision(fx, fy, this.player.inVehicle ? 16 : 11, fz, false);
            fx = col.x;
            fy = col.y;
        }
        targetObj.x = fx;
        targetObj.y = fy;
        targetObj.z = fz;
        targetObj.vx = 0;
        targetObj.vy = 0;
        this.player._velX = 0;
        this.player._velY = 0;
        if (targetObj.speed !== undefined) targetObj.speed = 0;
        this.cameraX = targetObj.x;
        this.cameraY = targetObj.y;
        if (this.renderer) {
            this.renderer.camX = targetObj.x;
            this.renderer.camY = targetObj.y;
        }
        if (typeof this.rebuildVehicleSpatialGrid === "function") {
            this.rebuildVehicleSpatialGrid();
        }
        if (this.net && typeof this.net.broadcastStateNow === "function") {
            this.net.broadcastStateNow();
        }
        this.showBigBanner(
            `🔥 HOTSPOT: ${fd.label}!`,
            "2X TURF INFLUENCE • +50% HOTSPOT CASH • SYNDICATE CREW WAR ACTIVE!",
            fd.color || "#ff2a85",
            2.8
        );
        return true;
    }

    commendNearestVehicle(maxRadius = 115) {
        if (!this.player || !Array.isArray(this.vehicles)) return null;
        const pObj = this.player.inVehicle || this.player;
        let bestVeh = null;
        let bestDist = maxRadius;
        for (const v of this.vehicles) {
            if (!v || v.destroyed || v === this.player.inVehicle) continue;
            const d = Math.hypot(v.x - pObj.x, v.y - pObj.y);
            if (d < bestDist) {
                bestDist = d;
                bestVeh = v;
            }
        }
        if (!bestVeh) return null;
        bestVeh.respectCount = (bestVeh.respectCount || 0) + 1;
        bestVeh._worldModified = true;
        if (this.net && this.net.carRespectMap) {
            this.net.carRespectMap[bestVeh.id] = bestVeh.respectCount;
        }
        const myName = (this.net && this.net.playerName) || this.player.nickname || "LUCIA";
        this.addCash(100, `⭐ SALUTED ${bestVeh.name} (⭐${bestVeh.respectCount})!`, true);
        if (this.audio && typeof this.audio.playBeep === "function") {
            this.audio.playBeep(880, 0.055, "triangle", 0.05);
        }
        if (this.net && typeof this.net.broadcastWorldEvent === "function") {
            this.net.broadcastWorldEvent({
                kind: "CAR_RESPECT",
                vehId: bestVeh.id,
                vehName: bestVeh.name,
                ownerName: bestVeh.ownerName || null,
                voterName: myName,
                count: bestVeh.respectCount,
                bonus: 250
            });
        }
        return bestVeh;
    }

    addTurfInfluence(points) {
        const rawPts = Math.floor(Number(points) || 0);
        if (rawPts <= 0 || !this.player || this.player.dead) return;
        const inHotspot = this.isInsideActiveFlashDistrict();
        const pts = inHotspot ? rawPts * 2 : rawPts;
        const zones = this.ensureTurfZones();
        const tKey = this.getTurfKeyForDistrict(this.currentDistrict);
        const zone = zones[tKey];
        if (!zone) return;

        if (inHotspot) {
            const fd = this.ensureActiveFlashDistrict();
            const syn = (this.net && this.net.syndicate) || "FLAMINGO";
            if (syn === "CYAN") fd.cyanScore = (fd.cyanScore || 0) + pts;
            else fd.flamingoScore = (fd.flamingoScore || 0) + pts;
            if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                this.net.broadcastWorldEvent({
                    kind: "SYNDICATE_SCORE",
                    syndicate: syn,
                    points: pts,
                    districtKey: fd.key
                });
            }
        }

        const myName = String((this.net && this.net.playerName) || (this.player && this.player.nickname) || "LUCIA").toUpperCase();
        const myColor = (this.net && this.net.playerColor) || "#ff2a85";
        this.myTurfScores[tKey] = (this.myTurfScores[tKey] || 0) + pts;
        const myScore = this.myTurfScores[tKey];

        const isAlreadyMe = zone.leaderName && String(zone.leaderName).toUpperCase() === myName;
        const threshold = isAlreadyMe
            ? (zone.leaderScore + 300)
            : Math.max(600, (zone.leaderScore || 0) + 300);

        if (myScore >= threshold) {
            const prevLeader = zone.leaderName;
            zone.leaderName = myName;
            zone.leaderColor = myColor;
            zone.leaderScore = myScore;
            this.saveTurfStandings();

            if (!isAlreadyMe) {
                if (this.audio && typeof this.audio.playFanfare === "function") {
                    this.audio.playFanfare("MISSION");
                }
                this.showBigBanner(
                    `👑 TURF KINGPIN: ${zone.shortLabel}!`,
                    prevLeader
                        ? `DETHRONED ${prevLeader} — YOU NOW RULE ${zone.shortLabel} (+10% TURF CASH & FACTION TRUCE)!`
                        : `YOU CLAIMED ${zone.shortLabel} (+10% TURF CASH & LOCAL FACTION TRUCE)!`,
                    myColor,
                    3.2
                );
                this.sendPager(
                    "👑 VICE NET TURF WAR",
                    `You now control ${zone.shortLabel} ($${myScore.toLocaleString()} Influence)! You earn +10% bonus cash in this district and local syndicates won't send hit squads after you!`,
                    false
                );
            }
            if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                this.net.broadcastWorldEvent({
                    kind: "TURF_TAKEOVER",
                    turfKey: tKey,
                    shortLabel: zone.shortLabel,
                    leaderName: myName,
                    leaderColor: myColor,
                    leaderScore: myScore,
                    wasTakeover: !isAlreadyMe
                });
            }
        }
    }

    /* ========================================================================
       02 — 2.5D FACTION NEMESIS MEMORY & LIVE RADIO / VICENET 5G COMMENTARY
       ======================================================================== */
    recordFactionGrudge(actionType, detailName = "ride", isPoliceTarget = false, forceFactionKey = null) {
        if (!this.player || this.player.dead) return;
        const now = performance.now();
        if (!this.factionGrudges) {
            this.factionGrudges = { STAR: 0, HAITI: 0, BEACH: 0, BIKER: 0, VCPD: 0 };
            this._lastNemesisMs = 0;
            this._lastRadioFlashMs = 0;
        }
        const dist = String(this.currentDistrict || "VICE CITY").toUpperCase();
        // If the player is the reigning Turf Kingpin of this district, local non-police gangs respect their turf (unless directly challenged via @boss chat)!
        if (!forceFactionKey && !isPoliceTarget && typeof this.isCurrentDistrictControlledByMe === "function" && this.isCurrentDistrictControlledByMe()) {
            return;
        }
        let fKey = forceFactionKey || "BEACH";
        if (!forceFactionKey) {
            if (isPoliceTarget) fKey = "VCPD";
            else if (dist.includes("STAR") || dist.includes("VENETIAN")) fKey = "STAR";
            else if (dist.includes("HAITI") || dist.includes("WYNWOOD") || dist.includes("LAKE")) fKey = "HAITI";
            else if (dist.includes("DOWNTOWN") || dist.includes("PORT") || dist.includes("AIRPORT") || dist.includes("GELLHORN")) fKey = "BIKER";
        }

        this.factionGrudges[fKey] = (this.factionGrudges[fKey] || 0) + (forceFactionKey ? 3 : 1);

        // Live Flash FM Radio Commentary on multi-wreck or police takedowns (every 45s max)
        if (!forceFactionKey && this.factionGrudges[fKey] === 2 && now - (this._lastRadioFlashMs || 0) > 45000) {
            this._lastRadioFlashMs = now;
            const pName = (this.net && this.net.playerName) || this.player.nickname || "LUCIA";
            this.sendPager(
                "🎙️ FLASH FM // BREAKING NEWS",
                `LIVE TRAFFIC REPORT: Eyewitnesses in ${dist} report ${pName} tearing up the avenue after ${actionType === "STEAL_CAR" ? `boosting a ${detailName}` : `wrecking a ${detailName}`}! Stay clear!`,
                false
            );
        }

        // Trigger Faction Boss Nemesis Vendetta Hit Squad at grudge >= 3 (80s cooldown, or 15s when directly challenged via @boss)
        const cooldownMs = forceFactionKey ? 15000 : 80000;
        if (this.factionGrudges[fKey] >= 3 && now - (this._lastNemesisMs || 0) > cooldownMs) {
            this.factionGrudges[fKey] = 0;
            this._lastNemesisMs = now;
            const pName = (this.net && this.net.playerName) || this.player.nickname || "LUCIA";
            const factionSpecs = {
                STAR: {
                    boss: "DON DIAZ (STAR CARTEL)",
                    car: "VICE_CHEETAH",
                    ped: "g2_zaibatsu",
                    wep: "UZI",
                    dm: `You think you can ${actionType === "STEAL_CAR" ? `boost my ${detailName}` : `wreck rides`} in ${dist} and walk away, ${pName}? My Star Island hitmen are on your tail!`
                },
                HAITI: {
                    boss: "TOUSSAINT (ZOE POUND)",
                    car: "TULIP_MUSCLE",
                    ped: "vc_haitian",
                    wep: "UZI",
                    dm: `Big mistake messing with ${detailName} in ${dist}, ${pName}! My Little Haiti crew just locked onto your GPS!`
                },
                BIKER: {
                    boss: "BIG MITCH (BROTHERHOOD)",
                    car: "CHALLENGER_RT",
                    ped: "g2_russian",
                    wep: "SHOTGUN",
                    dm: `Nobody touches our ${detailName} in ${dist}, ${pName}! My enforcers are coming to collect in blood!`
                },
                BEACH: {
                    boss: "SONNY (OCEAN SYNDICATE)",
                    car: "BANSHEE_GT",
                    ped: "vc_cuban",
                    wep: "UZI",
                    dm: `Word travels fast on Ocean Drive, ${pName}. You touched our ${detailName} in ${dist} — now survive my hit squad!`
                },
                VCPD: {
                    boss: "CAPT. CORTEZ (VCPD SWAT)",
                    car: "SWAT_ENFORCER",
                    ped: "g2_swat",
                    wep: "SHOTGUN",
                    dm: `All tactical units: ${pName} just hit a ${detailName} in ${dist}. Deploy the SWAT Hit Unit — shoot on sight!`
                }
            };
            const fSpec = factionSpecs[fKey] || factionSpecs.BEACH;
            this.sendPager(`📱 ${fSpec.boss}`, fSpec.dm, true);
            this.addFloatingText(this.player.x, this.player.y - 32, `💀 ${fSpec.boss} VENDETTA!`, "#ef4444");

            if (this.missions && typeof this.missions.findNearbyRoadSpot === "function") {
                const spot = this.missions.findNearbyRoadSpot(760, 1080);
                const hitCar = new Vehicle(`nemesis_${Date.now()}`, fSpec.car, spot.x, spot.y, spot.angle);
                hitCar.z = spot.z;
                hitCar.driver = "AI_CRIMINAL";
                hitCar.wasCriminalCar = true;
                hitCar.isNemesisCar = true;
                hitCar.nemesisBoss = fSpec.boss;
                this.vehicles.push(hitCar);
                if (typeof this.rebuildVehicleSpatialGrid === "function") {
                    this.rebuildVehicleSpatialGrid();
                }

                for (let i = 0; i < 2; i++) {
                    let hx = spot.x + (i === 0 ? -18 : 18);
                    let hy = spot.y + 14;
                    if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                        const hCol = this.map.resolveCircleBuildingCollision(hx, hy, 9, spot.z || 2.0, false);
                        hx = hCol.x;
                        hy = hCol.y;
                    }
                    if (this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(hx, hy)) {
                        hx = spot.x;
                        hy = spot.y;
                    }
                    const hitman = new Pedestrian({
                        id: `nemesis_ped_${Date.now()}_${i}`,
                        x: hx,
                        y: hy,
                        z: spot.z,
                        kind: "CRIMINAL",
                        g24Type: fSpec.ped,
                        g2Remapped: true,
                        copWeapon: fSpec.wep,
                        hp: 125,
                        maxHp: 125,
                        speed: 92
                    });
                    hitman.attackedByPlayer = true;
                    this.peds.push(hitman);
                }
            }
        }
    }

    addMultiplier(n = 1) {
        this.multiplier = Math.min(5, Math.max(1, (this.multiplier || 1) + n));
        this.updateHud();
    }

    get wantedSystem() {
        const self = this;
        return {
            get level() {
                return self.wantedLevel || 0;
            },
            set level(val) {
                self.setWantedLevel(val);
            },
            addChaos(amt) {
                const addStars = amt >= 200 ? 2 : 1;
                self.setWantedLevel(Math.min(6, (self.wantedLevel || 0) + addStars));
            },
            clearWanted() {
                self.setWantedLevel(0);
            }
        };
    }

    isPointInAnyPlayerCameraView(wx, wy, marginPx = 180) {
        const p = this.player;
        if (p && Math.hypot(wx - p.x, wy - p.y) < 880) return true;
        if (this.renderer && !this.activeInterior) {
            const camX = this.renderer.camX !== undefined ? this.renderer.camX : (p ? p.x : 0);
            const camY = this.renderer.camY !== undefined ? this.renderer.camY : (p ? p.y : 0);
            if (Math.hypot(wx - camX, wy - camY) < 920) return true;
            if (typeof this.renderer.worldToScreen === "function" && this.renderer.canvas) {
                const sp = this.renderer.worldToScreen(wx, wy, p ? (p.z || 2.0) : 2.0);
                const W = this.renderer.canvas.width || 1280;
                const H = this.renderer.canvas.height || 720;
                if (sp && sp.x >= -marginPx && sp.x <= W + marginPx && sp.y >= -marginPx && sp.y <= H + marginPx) {
                    return true;
                }
            }
        }
        if ((!this.net || !this.net.wsConnected) && this.trafficManager && typeof this.trafficManager.getAllHumanPlayerViewports === "function") {
            const bx = Math.floor(wx / TILE_SIZE);
            const by = Math.floor(wy / TILE_SIZE);
            const vps = this.trafficManager.getAllHumanPlayerViewports();
            for (let i = 0; i < vps.length; i++) {
                const vp = vps[i];
                if (Math.hypot(wx - vp.x, wy - vp.y) < 880) return true;
                if (vp.area && bx >= vp.area.minX - 4 && bx <= vp.area.maxX + 4 && by >= vp.area.minY - 4 && by <= vp.area.maxY + 4) {
                    return true;
                }
            }
        }
        return false;
    }

    getDistanceToNearestHumanPlayer(wx, wy) {
        let best = this.player && !this.player.dead ? Math.hypot(wx - this.player.x, wy - this.player.y) : 99999;
        if (this.net && !this.net.wsConnected && typeof this.net.getHumanRemotePlayers === "function") {
            const humans = this.net.getHumanRemotePlayers();
            for (let i = 0; i < humans.length; i++) {
                const rp = humans[i];
                if (!rp || rp.dead) continue;
                const d = Math.hypot(wx - rp.x, wy - rp.y);
                if (d < best) best = d;
            }
        }
        return best;
    }

    getEmergencyStations(serviceType) {
        if (this.director && typeof this.director.getEmergencyStations === "function") {
            return this.director.getEmergencyStations(serviceType);
        }
        const list = [];
        if (this.map && Array.isArray(this.map.emergencyStations)) {
            for (const st of this.map.emergencyStations) {
                if (st && st.type === serviceType) list.push(st);
            }
        }
        return list;
    }

    getNearestEmergencyStation(serviceType, wx, wy) {
        if (this.director && typeof this.director.getNearestEmergencyStation === "function") {
            return this.director.getNearestEmergencyStation(serviceType, wx, wy);
        }
        const stations = this.getEmergencyStations(serviceType);
        let best = null;
        let bestDist = Infinity;
        for (const st of stations) {
            const d = Math.hypot(st.x - wx, st.y - wy);
            if (d < bestDist) {
                bestDist = d;
                best = st;
            }
        }
        return best;
    }

    findStationDispatchSpawn(serviceType, targetX, targetY, targetZ = 2.0) {
        if (this.director && typeof this.director.findStationDispatchSpawn === "function") {
            return this.director.findStationDispatchSpawn(serviceType, targetX, targetY, targetZ);
        }
        if (!this.map || typeof this.map.getNavigationBlock !== "function") return null;
        const stations = this.getEmergencyStations(serviceType).slice();
        stations.sort((a, b) => Math.hypot(a.x - targetX, a.y - targetY) - Math.hypot(b.x - targetX, b.y - targetY));

        // 1. Try spawning directly at the road exit of the nearest Central Municipal HQ (1150..2400px),
        //    or along the road corridor coming from that HQ at realistic travel distance (1350..1750px)!
        const targetOnEastBeach = targetX >= 447.2 * TILE_SIZE && targetY >= 44 * TILE_SIZE && targetY <= 368 * TILE_SIZE;
        const roadTargetX = targetOnEastBeach ? ((targetY < 75 * TILE_SIZE ? 456.5 : 445.0) * TILE_SIZE) : targetX;
        for (let pass = 0; pass < 2; pass++) {
            const strictLaneAlign = (pass === 0);
            for (let si = 0; si < stations.length; si++) {
                const st = stations[si];
                const distStToTarget = Math.hypot(st.x - roadTargetX, st.y - targetY);
                const useStationGate = distStToTarget >= 1150 && distStToTarget <= 2400 && !this.isPointInAnyPlayerCameraView(st.x, st.y, 220);
                const dirFromTargetToSt = Math.atan2(st.y - targetY, st.x - roadTargetX);
                const corridorDist = Math.max(1350, Math.min(distStToTarget, 1750));
                const anchorX = useStationGate ? st.x : (roadTargetX + Math.cos(dirFromTargetToSt) * corridorDist);
                const anchorY = useStationGate ? st.y : (targetY + Math.sin(dirFromTargetToSt) * corridorDist);
                const baseBx = Math.floor(anchorX / TILE_SIZE);
                const baseBy = Math.floor(anchorY / TILE_SIZE);

                for (let r = 0; r <= 36; r++) {
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                            const bx = baseBx + dx;
                            const by = baseBy + dy;
                            if (bx < 2 || bx >= MAP_COLS - 2 || by < 2 || by >= MAP_ROWS - 2) continue;
                            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;
                            const navBlk = this.map.getNavigationBlock(bx, by, targetZ);
                            if (!navBlk || navBlk.groundType !== GROUND_TYPE.ROAD || navBlk.isRailway) continue;
                            if (strictLaneAlign) {
                                const lidZ1 = this.map.getBlockInfo ? this.map.getBlockInfo(bx, by, 1).lid : 0;
                                const bits = (navBlk.up ? 1 : 0) + (navBlk.down ? 1 : 0) + (navBlk.left ? 1 : 0) + (navBlk.right ? 1 : 0);
                                if (bits !== 1 || lidZ1 === 25) continue;
                            }
                            const sx = (bx + 0.5) * TILE_SIZE;
                            const sy = (by + 0.5) * TILE_SIZE;
                            if (Math.hypot(sx - targetX, sy - targetY) < 1180) continue;
                            if (this.isPointInAnyPlayerCameraView(sx, sy, 220)) continue;
                            const alignTargetX = (targetOnEastBeach && bx >= 443) ? roadTargetX : targetX;
                            const toTargetAng = Math.atan2(targetY - sy, alignTargetX - sx);
                            const roadAng = typeof this.map.getAlignedRoadAngle === "function"
                                ? this.map.getAlignedRoadAngle(bx, by, toTargetAng, targetZ)
                                : toTargetAng;
                            // Ensure the chosen road lane actually travels TOWARD the incident (never on the opposite one-way lane heading 180° away!)
                            if (strictLaneAlign && Math.cos(roadAng - toTargetAng) < 0.12) continue;
                            const occupied = this.vehicles.some((ov) => ov && Math.hypot(ov.x - sx, ov.y - sy) < 76);
                            if (occupied) continue;
                            const sz = this.map.getHeightAtPixel(sx, sy, 4.0);
                            return { x: sx, y: sy, z: sz, angle: roadAng, station: st, usedStationGate: useStationGate };
                        }
                    }
                }
            }
        }
        return null;
    }

    hasLineOfSight(x1, y1, x2, y2, z = 2.0) {
        if (!this.map || typeof this.map.traceSegment2D !== "function") return true;
        return !this.map.traceSegment2D(x1, y1, x2, y2, z).hit;
    }



    addFloatingText(x, y, text, color = "#39ff14") {
        let fy = y;
        for (let i = this.floatingTexts.length - 1; i >= Math.max(0, this.floatingTexts.length - 8); i--) {
            const ft = this.floatingTexts[i];
            if (ft && ft.life > 0.95 && Math.abs(ft.x - x) < 28 && Math.abs(ft.y - fy) < 16) {
                if (ft.text === text) return;
                fy -= 16;
            }
        }
        this.floatingTexts.push({ x, y: fy, text, color, life: 1.35 });
        if (this.floatingTexts.length > 48) {
            this.floatingTexts.splice(0, this.floatingTexts.length - 48);
        }
    }



    addSkidmark(x, y, opts = {}) {

        const maxLife = typeof opts.maxLife === "number" ? opts.maxLife : 8.5;

        this.skidmarks.push({

            x,

            y,

            z: typeof opts.z === "number" ? opts.z : 2.0,

            angle: typeof opts.angle === "number" ? opts.angle : 0,

            w: typeof opts.w === "number" ? opts.w : 5.5,

            h: typeof opts.h === "number" ? opts.h : 2.8,

            r: typeof opts.r === "number" ? opts.r : 0.08,

            g: typeof opts.g === "number" ? opts.g : 0.08,

            b: typeof opts.b === "number" ? opts.b : 0.10,

            alpha: typeof opts.alpha === "number" ? opts.alpha : 0.46,

            life: typeof opts.life === "number" ? opts.life : maxLife,

            maxLife,

            surface: opts.surface || "ROAD",

            variant: opts.variant || 0

        });

        if (this.skidmarks.length > 2800) {

            this.skidmarks.splice(0, 350);

        }

    }

    emitPedFootprints(ent, dt = 0.016) {
        if (!ent || ent.dead || ent.isSwimming || (ent.jumpTimer || 0) > 0 || !this.map) return;
        if ((ent._bloodyShoesTimer || 0) > 0) {
            ent._bloodyShoesTimer = Math.max(0, ent._bloodyShoesTimer - dt);
        }
        // Check if stepping through a fresh corpse blood puddle (authentic GTA 1 & GTA 2 bloody footprints!)
        if (Array.isArray(this.peds) && (ent === this.player || (this.player && Math.abs(ent.x - this.player.x) < 420 && Math.abs(ent.y - this.player.y) < 320))) {
            for (let i = 0; i < this.peds.length; i++) {
                const cp = this.peds[i];
                if (cp && cp.dead && (cp.deadTimer || 0) < 35 && Math.abs(cp.x - ent.x) < 15 && Math.abs(cp.y - ent.y) < 15) {
                    ent._bloodyShoesTimer = 3.6;
                    break;
                }
            }
        }
        const moved = ent._lastFootX === undefined ? 999 : Math.hypot(ent.x - ent._lastFootX, ent.y - ent._lastFootY);
        if (moved < 10.5) return;
        ent._lastFootX = ent.x;
        ent._lastFootY = ent.y;

        const hasBlood = (ent._bloodyShoesTimer || 0) > 0;
        const onSand = typeof TILE !== "undefined" && this.map.getTileAtPixel && this.map.getTileAtPixel(ent.x, ent.y) === TILE.SAND;
        if (!hasBlood && !onSand) return;

        ent._footSide = ((ent._footSide || 1) * -1);
        const ang = ent.angle || 0;
        const lat = 2.6 * ent._footSide;
        const fx = ent.x - Math.sin(ang) * lat;
        const fy = ent.y + Math.cos(ang) * lat;
        const fz = ent.z !== undefined ? ent.z : 2.0;

        if (hasBlood) {
            this.addSkidmark(fx, fy, {
                z: fz,
                angle: ang,
                w: 3.4,
                h: 2.0,
                r: 0.58,
                g: 0.04,
                b: 0.07,
                alpha: Math.min(0.68, 0.24 + (ent._bloodyShoesTimer / 3.6) * 0.44),
                life: 10.0,
                maxLife: 10.0,
                surface: "BLOOD_FOOT"
            });
        } else if (onSand) {
            this.addSkidmark(fx, fy, {
                z: fz,
                angle: ang,
                w: 3.2,
                h: 1.9,
                r: 0.75,
                g: 0.68,
                b: 0.55,
                alpha: 0.36,
                life: 11.0,
                maxLife: 11.0,
                surface: "SAND_FOOT"
            });
        }
    }



    emitPressurizedWaterJet(nozX, nozY, aimAngle, targetDist, isDeckGun = false, targetEntity = null, opts = null) {
        if (!Array.isArray(this.particles)) return;
        if (this.particles.length >= 630) {
            this.particles.splice(0, this.particles.length - 560);
        }
        // Real-world calibrated VCFD nozzle ranges at Vice City 26 scale (~12 px = 1 meter, 1 car ≈ 56 px = 4.6 m):
        // - Rooftop Deck-Gun Monitor (1000 GPM): up to 375 px (~31 m ≈ 6.2 car lengths, spans a full 4-lane boulevard + sidewalks!)
        // - Handheld 1.75" Attack Hose (150 GPM): up to 190 px (~16 m ≈ 3.1 car lengths)
        const maxNozzleReach = isDeckGun ? 375 : 190;
        const desiredReach = Math.max(24, Math.min(maxNozzleReach, targetDist || maxNozzleReach));
        const carrierVx = (opts && typeof opts.carrierVx === "number") ? opts.carrierVx : 0;
        const carrierVy = (opts && typeof opts.carrierVy === "number") ? opts.carrierVy : 0;
        const sourceVeh = (opts && opts.sourceVeh) ? opts.sourceVeh : null;
        const fromPlayer = Boolean(opts && opts.fromPlayer);
        const refZ = (opts && typeof opts.sourceZ === "number")
            ? opts.sourceZ
            : ((sourceVeh && typeof sourceVeh.z === "number") ? sourceVeh.z : 2.0);
        const nozFloorZ = (this.map && typeof this.map.getHeightAtPixel === "function")
            ? this.map.getHeightAtPixel(nozX, nozY, refZ)
            : refZ;
        const startZ = nozFloorZ + (isDeckGun ? 0.165 : 0.075);

        // 3D Parabolic Ballistics + Aerodynamic Drag (`dragK`):
        // With horizontal drag dv/dt = -dragK * v, distance x(t) = (v0 / dragK) * (1 - exp(-dragK * t)).
        // Solving for flight time `tFlight` to reach `desiredReach`, and vertical launch `vz0` under gravity `WATER_GRAV = 1.05`!
        const baseSpeed = isDeckGun ? 510 : 395;
        const dragK = isDeckGun ? 0.82 : 1.02;
        const WATER_GRAV = 1.05;
        const slugCount = 3;

        for (let k = 0; k < slugCount; k++) {
            const spread = (Math.random() - 0.5) * (isDeckGun ? 0.052 : 0.046);
            const sAng = aimAngle + spread;
            const spd = baseSpeed * (0.96 + Math.random() * 0.08);
            const jitterReach = Math.min(maxNozzleReach + 8, desiredReach + (Math.random() - 0.5) * 12);
            const maxHorizAsymptote = spd / dragK;
            const ratio = Math.min(0.86, jitterReach / maxHorizAsymptote);
            const flightDur = Math.max(0.09, Math.min(1.05, -Math.log(1.0 - ratio) / dragK));
            // Target landing height (~0.04 blocks above ground, or slightly higher when aimed onto a vehicle hull)
            const targetLandZ = nozFloorZ + (targetEntity ? 0.06 : 0.02);
            const vz0 = ((targetLandZ - startZ) + 0.5 * WATER_GRAV * flightDur * flightDur) / flightDur;
            const leadTime = (k / slugCount) * 0.036;
            const vx0 = Math.cos(sAng) * spd + carrierVx;
            const vy0 = Math.sin(sAng) * spd + carrierVy;

            this.particles.push({
                x: nozX + vx0 * leadTime,
                y: nozY + vy0 * leadTime,
                z: startZ + vz0 * leadTime - 0.5 * WATER_GRAV * leadTime * leadTime,
                vx: vx0 * (1.0 - dragK * leadTime),
                vy: vy0 * (1.0 - dragK * leadTime),
                vz: vz0 - WATER_GRAV * leadTime,
                grav: WATER_GRAV,
                dragK,
                traveled: spd * leadTime,
                maxReach: maxNozzleReach,
                ang: sAng,
                seed: Math.random() * 12.0,
                isDeckGun,
                isPrimarySlug: k === 0,
                spawnSplash: k === 0,
                sourceVeh,
                fromPlayer,
                kind: "WATER_JET",
                color: "#e0f2fe",
                life: Math.max(0.04, flightDur - leadTime),
                maxLife: flightDur
            });
        }

        // Occasional fine lateral air-shear spray droplet tearing off the main stream
        if (Math.random() < 0.45 && this.particles.length < 635) {
            const mAng = aimAngle + (Math.random() - 0.5) * 0.22;
            const mSpd = (isDeckGun ? 240 : 185) * (0.75 + Math.random() * 0.45);
            this.particles.push({
                x: nozX + Math.cos(aimAngle) * 18,
                y: nozY + Math.sin(aimAngle) * 18,
                vx: Math.cos(mAng) * mSpd + carrierVx,
                vy: Math.sin(mAng) * mSpd + carrierVy,
                rot: mAng,
                size: 2.2 + Math.random() * 1.4,
                foam: true,
                kind: "WATER_DROP",
                color: "#e0f2fe",
                life: 0.24,
                maxLife: 0.24
            });
        }

        // Pressurized water-rush & nozzle hiss audio when spraying near the player
        if (this.audio && this.player && Math.hypot(nozX - this.player.x, nozY - this.player.y) < 560) {
            const nowMs = performance.now();
            if (nowMs - (this._lastWaterJetSfxAt || 0) > 85) {
                this._lastWaterJetSfxAt = nowMs;
                const d = Math.hypot(nozX - this.player.x, nozY - this.player.y);
                const prox = Math.max(0.15, 1 - d / 560);
                this.audio.playBandNoise(0.095, isDeckGun ? 1180 : 1480, 0.90, 0.015 * prox);
            }
        }
    }

    triggerWaterImpactAt(pt, hitNormalX = 0, hitNormalY = 0, hitHotSurface = false) {
        const hitX = pt.x;
        const hitY = pt.y;
        const floorZ = (this.map && typeof this.map.getHeightAtPixel === "function")
            ? this.map.getHeightAtPixel(hitX, hitY, 2.0)
            : 2.0;
        const isDeck = Boolean(pt.isDeckGun);

        // 1. Convert arriving water slug in-place into an organic foaming mist burst (GPU Shader Mode C, modeType = 1)
        pt.kind = "WATER_SPLASH";
        pt.vx = hitNormalX * 8;
        pt.vy = hitNormalY * 8;
        pt.vz = 0;
        pt.z = Math.max(floorZ + 0.04, Math.min(floorZ + 0.20, pt.z || (floorZ + 0.05)));
        pt.baseScale = isDeck ? 0.94 : 0.74;
        pt.rot = Math.random() * 6.283;
        pt.life = 0.36;
        pt.maxLife = 0.36;

        // 2. Spawn rebounding fine water droplets (biased along surface reflection if hitting a wall/vehicle!)
        if (this.particles.length < 632) {
            const hasNormal = (hitNormalX !== 0 || hitNormalY !== 0);
            const baseReflAng = hasNormal ? Math.atan2(hitNormalY, hitNormalX) : Math.random() * 6.283;
            for (let di = 0; di < 2; di++) {
                const dAng = hasNormal
                    ? (baseReflAng + (Math.random() - 0.5) * 1.65)
                    : (Math.random() * 6.283);
                const dSpd = (isDeck ? 58 : 42) + Math.random() * 58;
                this.particles.push({
                    x: hitX,
                    y: hitY,
                    vx: Math.cos(dAng) * dSpd,
                    vy: Math.sin(dAng) * dSpd,
                    rot: dAng,
                    size: 2.4 + Math.random() * 1.4,
                    foam: true,
                    kind: "WATER_DROP",
                    color: "#e0f2fe",
                    life: 0.24,
                    maxLife: 0.24
                });
            }
        }

        // 3. Extinguish any live ground FIRE particles within 24px and convert hot impacts into rising white STEAM!
        let dousedFlameParticle = false;
        for (let fi = 0; fi < this.particles.length; fi++) {
            const fp = this.particles[fi];
            if (fp && fp.kind === "FIRE" && Math.abs(fp.x - hitX) < 24 && Math.abs(fp.y - hitY) < 24) {
                fp.kind = "SMOKE";
                fp.color = "#e2e8f0";
                fp.vx = (Math.random() - 0.5) * 20;
                fp.vy = (Math.random() - 0.5) * 20 - 12;
                fp.life = Math.max(fp.life, 0.55);
                fp.maxLife = 0.65;
                dousedFlameParticle = true;
            }
        }
        if ((hitHotSurface || dousedFlameParticle) && Math.random() < 0.72) {
            this.spawnParticle(hitX + (Math.random() - 0.5) * 16, hitY + (Math.random() - 0.5) * 16, "WHITE_SMOKE");
        }

        // 4. Deposit realistic dark-wet specular runoff puddles on asphalt / sidewalks (GPU Shader Mode D)
        const pTick = this._waterPuddleTick || 0;
        this._waterPuddleTick = (pTick + 1) % 3;
        if (pTick === 0 && (!this.map || !this.map.isWaterAtPixel || !this.map.isWaterAtPixel(hitX, hitY))) {
            const pW = (isDeck ? 18.0 : 14.0) + Math.random() * 7.5;
            this.addSkidmark(hitX + (Math.random() - 0.5) * 6, hitY + (Math.random() - 0.5) * 6, {
                z: floorZ,
                angle: Math.random() * 6.283,
                w: pW,
                h: pW * (0.78 + Math.random() * 0.28),
                r: 0.05,
                g: 0.08,
                b: 0.12,
                alpha: 0.42,
                life: 8.5,
                maxLife: 8.5,
                surface: "WATER_PUDDLE"
            });
        }
    }

    spawnParticle(x, y, kind = "SPARK") {
        if (this.particles.length > 650) {
            this.particles.splice(0, this.particles.length - 600);
        }

        if (kind === "FIRE") {

            this.particles.push({

                x, y,

                vx: (Math.random() - 0.5) * 45,

                vy: (Math.random() - 0.5) * 45 - 15,

                size: 5 + Math.random() * 5,

                kind: "FIRE",

                color: Math.random() < 0.5 ? "#f97316" : "#facc15",

                life: 0.45,

                maxLife: 0.45

            });

        } else if (kind === "BLACK_SMOKE" || kind === "WHITE_SMOKE") {

            this.particles.push({

                x, y,

                vx: (Math.random() - 0.5) * 25,

                vy: (Math.random() - 0.5) * 25,

                size: 6 + Math.random() * 6,

                kind: "SMOKE",

                color: kind === "BLACK_SMOKE" ? "#1f2937" : "#9ca3af",

                life: 0.65,

                maxLife: 0.65

            });

        } else {

            this.particles.push({

                x, y,

                vx: (Math.random() - 0.5) * 140,

                vy: (Math.random() - 0.5) * 140,

                size: 3,

                kind: "SPARK",

                color: "#fde047",

                life: 0.25,

                maxLife: 0.25

            });

        }

    }



    explodeAt(x, y, radius = 115, damage = 180, byPlayer = false, fromNetwork = false) {

        if (!this.activeInterior) {
            const expDist = this.player ? Math.hypot(x - this.player.x, y - this.player.y) : 0;
            if (expDist < 900) {
                const expVolScale = Math.max(0.22, 1.0 - (expDist / 900) * 0.78);
                this.audio.playExplosion(expVolScale);
            }
        }

        if (byPlayer && !fromNetwork && this.net) {

            this.net.broadcastExplosion(x, y, radius, damage);

        }



        for (let i = 0; i < 18; i++) {

            const ang = Math.random() * Math.PI * 2;

            const spd = (i < 6) ? (10 + Math.random() * 45) : (40 + Math.random() * 165);

            this.particles.push({

                x: x + (Math.random() - 0.5) * 14,

                y: y + (Math.random() - 0.5) * 14,

                vx: Math.cos(ang) * spd,

                vy: Math.sin(ang) * spd,

                size: 8,

                kind: i < 10 ? "EXPLOSION" : (i < 15 ? "SMOKE" : "SPARK"),

                color: "#f97316",

                life: 0.48 + Math.random() * 0.32,

                maxLife: 0.8

            });

        }



        if (this.particles.length > 650) {
            this.particles.splice(0, this.particles.length - 650);
        }

        // Damage nearby vehicles, trigger GTA 1 traffic panic & 1997 GTA 1 delayed chain explosions!

        for (const v of this.vehicles) {

            if (v.destroyed) continue;

            const d = Math.hypot(v.x - x, v.y - y);

            if (d < radius) {

                // Blast wave shoves nearby vehicles & wrecks outward and sets them spinning (the tank barely moves)
                if (!v.towedByTruck && !v.crushesCars && v.driver !== "REMOTE") {
                    const bAng = d > 2 ? Math.atan2(v.y - y, v.x - x) : Math.random() * Math.PI * 2;
                    const heavy = (v.w || 48) >= 75 ? 0.45 : 1.0;
                    const kick = d < 4 ? 75 * heavy : (60 + 230 * (1 - d / radius)) * heavy;
                    v.vx = (v.vx || 0) + Math.cos(bAng) * kick;
                    v.vy = (v.vy || 0) + Math.sin(bAng) * kick;
                    v.angularVelocity = (v.angularVelocity || 0) + (Math.random() - 0.5) * 6.0 * (1 - d / radius) * heavy;
                }

                // Heavy armored Panzer Tank shrugs off blast waves from the cars it crushes
                const dmg = damage * (1 - d / radius) * (v.crushesCars ? 0.1 : 1);

                if (byPlayer) v.damagedByPlayer = true;

                if (typeof v.receiveImpactDamage === "function") {

                    v.receiveImpactDamage(dmg, x, y);

                } else {

                    v.hp -= dmg;

                }

                if (v.hp <= 0 && !v.destroyed && (v.chainExplodeTimer || 0) <= 0) {
                    if (v.specKey === "BMX_BIKE") {
                        this.explodeVehicle(v, byPlayer);
                    } else {
                        v.hp = 1;

                        v.chainExplodeTimer = 0.28 + Math.random() * 0.18;
                    }
                }

            }

            if (d < Math.max(380, radius * 3.2) && typeof v.triggerPanic === "function") {

                v.triggerPanic(9.5, x, y);
                // Real-life blast shock: civilian drivers right next to a rocket/car explosion slam the brakes and bail out on foot in terror!
                if (
                    d >= radius &&
                    d < radius + 65 &&
                    v.driver === "AI_TRAFFIC" &&
                    !v.isHeavyVehicle &&
                    Math.random() < 0.45 &&
                    this.peds.length < 130
                ) {
                    v.vx = 0;
                    v.vy = 0;
                    v.speed = 0;
                    v.aiTurnSignal = 2;
                    this.ejectVehicleDriver(v, "BAIL_FIRE");
                }

            }

        }



        // Damage nearby peds & trigger pedestrian panic + GTA 2 Explosive Gibs Arc (gibs.cpp FUN_0048C9C0 / FUN_0048C270)!
        const maxPedPanicR = Math.max(460, radius * 3.8);

        for (const ped of this.peds) {

            if (ped.dead) continue;
            if (Math.abs(ped.x - x) >= maxPedPanicR || Math.abs(ped.y - y) >= maxPedPanicR) continue;

            const d = Math.hypot(ped.x - x, ped.y - y);

            if (d < radius) {

                const baseAng = Math.atan2(ped.y - y, ped.x - x);

                for (let gi = 0; gi < 6; gi++) {

                    const gAng = baseAng + (gi - 2.5) * 0.42 + (Math.random() - 0.5) * 0.25;

                    const gSpd = 68 + Math.random() * 88;

                    const flightDur = 0.42 + Math.random() * 0.24;

                    this.particles.push({

                        x: ped.x,

                        y: ped.y,

                        vx: Math.cos(gAng) * gSpd,

                        vy: Math.sin(gAng) * gSpd,

                        size: 5,

                        kind: "GIB_ARC",

                        color: "#b91c1c",

                        peakZ: 0.34 + Math.random() * 0.28,

                        rot: Math.random() * 6.28,

                        life: flightDur,

                        maxLife: flightDur,

                        isRestingGib: false

                    });

                }

                this.killPed(ped, byPlayer, fromNetwork);

            } else if (d < maxPedPanicR) {

                ped.panicTimer = 8.5;
                ped.threatX = x;
                ped.threatY = y;
                ped.isCrossingRoad = false;
                ped.waitingAtCrosswalk = false;
                ped.hangoutTimer = 0;
                ped.angle = Math.atan2(ped.y - y, ped.x - x);
                ped.targetBx = null;
                ped.targetBy = null;

            }

        }



        // Smash nearby crates

        if (this.map.crates) {

            for (const cr of this.map.crates) {

                if (!cr.smashed && Math.abs(cr.x - x) < radius && Math.abs(cr.y - y) < radius && Math.hypot(cr.x - x, cr.y - y) < radius) {

                    this.smashCrate(cr);

                }

            }

        }

        // Wipe out open-air living events / street animations within blast radius

        this.checkAndWipeoutLivingEvents(x, y, radius, byPlayer, false);

        if (byPlayer && this.player && !this.player.dead && (this.player.respawnGraceUntil || 0) <= performance.now()) {
            this.crimeHeat = (this.crimeHeat || 0) + 1;
            const ch = this.crimeHeat;
            const expWanted = ch >= 21 ? 6 : (ch >= 15 ? 5 : (ch >= 10 ? 4 : (ch >= 6 ? 3 : (ch >= 3 ? 2 : 1))));
            this.reportCrimeAt(x, y, Math.max(this.wantedLevel || 0, expWanted), true);
        }



        // Damage player if on foot nearby

        const dp = Math.hypot(this.player.x - x, this.player.y - y);

        if (dp < radius) {

            // The tank's armored hull shields its crew from the blast of cars it crushes
            const tankShield = (this.player.inVehicle && this.player.inVehicle.crushesCars) ? 0.06 : 1;

            this.damagePlayer(damage * 0.45 * (1 - dp / radius) * tankShield);

        }

    }



    explodeVehicle(v, byPlayer = false, fromNetwork = false) {

        if (v.destroyed) return;

        v.destroyed = true;

        v.burnTimer = 0;

        v.chainExplodeTimer = 0;

        v.bombArmed = false;

        v.sirenActive = false;

        v.drifting = false;

        v.speed = 0;

        v.vx = 0;

        v.vy = 0;

        if (this.player.inVehicle !== v) {

            v.driver = null;

        }

        const isBicycle = (v.specKey === "BMX_BIKE");
        const isScooter = (v.specKey === "E_SCOOTER");

        v._worldModified = true;
        v.isStaticParked = false;

        if (!fromNetwork && this.net && typeof this.net.broadcastWorldEvent === "function") {

            this.net.broadcastWorldEvent({

                kind: "VEH_EXPLODE",

                vehId: v.id,

                specKey: v.specKey || "MINT_STALLION",

                x: Math.round(v.x),

                y: Math.round(v.y),

                z: Math.round((v.z || 2.0) * 100) / 100,

                a: Math.round((v.angle || 0) * 1000) / 1000,

                remapIdx: v.remapIdx || 0

            });

        }



        const playerResponsible = Boolean(byPlayer || v.damagedByPlayer || this.player.inVehicle === v);



        if (this.player.inVehicle === v) {

            this.player.inVehicle = null;

            this.player.seatIndex = 0;

            const ejDist = (isBicycle || isScooter) ? 18 : 32;
            let ejX = v.x - Math.sin(v.angle || 0) * ejDist;
            let ejY = v.y + Math.cos(v.angle || 0) * ejDist;
            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const ejCol = this.map.resolveCircleBuildingCollision(ejX, ejY, 10, this.player.z || 2.0, false);
                ejX = ejCol.x;
                ejY = ejCol.y;
            }
            this.player.x = ejX;
            this.player.y = ejY;

            if (isBicycle || isScooter) {
                this.player.slideCarTimer = 0.42;
                if (this.player.hp > 1) {
                    this.damagePlayer(Math.min(this.player.hp - 1, 8));
                }
            } else {
                this.damagePlayer(45);
            }

        }

        if (this.jason && this.jason.inVehicle === v) {

            this.jason.inVehicle = null;

        }

        if (isBicycle || isScooter) {
            // A bicycle or e-scooter crumples / short-circuits without a lethal fireball or car sheet-metal smash!
            if (this.audio && typeof this.audio.playCarCrash === "function") {
                this.audio.playCarCrash(0.55, v.specKey);
            }
            for (let i = 0; i < 10; i++) {
                this.spawnParticle(
                    v.x + (Math.random() - 0.5) * 16,
                    v.y + (Math.random() - 0.5) * 16,
                    i % 2 === 0 ? "SPARK" : "WHITE_SMOKE"
                );
            }
            for (const ped of this.peds) {
                if (!ped.dead && Math.hypot(ped.x - v.x, ped.y - v.y) < 38) {
                    ped.stunnedTimer = Math.max(ped.stunnedTimer || 0, 1.45);
                    ped.panicTimer = 4.5;
                }
            }
            return;
        }

        if (typeof v.emitExplosionBlowoutParts === "function") {
            v.emitExplosionBlowoutParts(this);
        }

        this.explodeAt(v.x, v.y, 130, 200, playerResponsible, fromNetwork);

        if (playerResponsible) {
            const isCriminalCar = (v.driver === "AI_CRIMINAL" || v.wasCriminalCar);
            if (v.isNemesisCar) {
                this.addCash(1000, `💀 ${v.nemesisBoss || "NEMESIS"} HIT SQUAD WIPED OUT!`);
                if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(300);
                this.showBigBanner("💀 VENDETTA SURVIVED!", `WIPED OUT ${v.nemesisBoss || "FACTION"} HIT SQUAD (+$1,000)!`, "#39ff14", 2.8);
            } else if (isCriminalCar) {
                this.addCash(200, `⚖️ VIGILANTE TAKEDOWN! (${v.name})`);
                if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(150);
            } else {
                if (v.isPolice && typeof this.addTurfInfluence === "function") {
                    this.addTurfInfluence(120);
                }
                if (typeof this.recordFactionGrudge === "function") {
                    this.recordFactionGrudge("DESTROY_CAR", v.name || "vehicle", Boolean(v.isPolice));
                }
            }

            this.recordFrenzyKill();

            const isPlayerInGraceOrDead = Boolean(this.player && (this.player.dead || (this.player.respawnGraceUntil || 0) > performance.now()));
            if (!isCriminalCar && !isPlayerInGraceOrDead) {

                if (v.isPolice) {

                    this.crimeHeat = (this.crimeHeat || 0) + 3;

                    this.setWantedLevel(Math.max(2, this.wantedLevel + 1), { x: v.x, y: v.y }, true);

                } else {

                    this.crimeHeat = (this.crimeHeat || 0) + 2;

                    const targetWanted = Math.min(6, Math.max(this.wantedLevel, 1 + Math.floor(this.crimeHeat / 4)));

                    this.reportCrimeAt(v.x, v.y, targetWanted, true);

                }

            }

        }

    }



    killPed(ped, byPlayer = true, fromNetwork = false) {

        if (ped.dead) return;

        const wasCalling911 = (ped.calling911Timer || 0) > 0;
        if (wasCalling911 && this.director && typeof this.director.abortWitness911Call === "function") {
            this.director.abortWitness911Call(ped, Boolean(byPlayer));
        } else {
            ped.calling911Timer = 0;
            ped.calling911Stars = 0;
            ped.calling911Pos = null;
            if (wasCalling911 && byPlayer && this.player && !this.player.dead) {
                this.addFloatingText(ped.x, ped.y - 24, "🔇 911 WITNESS SILENCED!", "#38bdf8");
            }
        }

        ped.dead = true;

        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            const c = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 12, ped.z || 2.0);
            ped.x = c.x;
            ped.y = c.y;
        }

        ped.burnTimer = 0;

        ped.electroTimer = 0;

        ped.drownTimer = 0;

        if (!fromNetwork && this.net && typeof this.net.broadcastWorldEvent === "function") {
            ped._corpsePersisted = true;
            this.net.broadcastWorldEvent({
                kind: "PED_KILL",
                pedId: ped.id,
                x: Math.round(ped.x),
                y: Math.round(ped.y),
                z: Math.round((ped.z || 2.0) * 100) / 100,
                a: Math.round((ped.angle || 0) * 100) / 100,
                g24Type: ped.g24Type || "civ0",
                pedKind: ped.kind || "CIVILIAN",
                deathKind: ped.deathKind || null
            });
            this.net.broadcastWorldEvent({
                kind: "PROP_SMASH",
                pType: `CORPSE:${ped.g24Type || "civ0"}:${ped.kind || "CIVILIAN"}`,
                x: Math.round(ped.x),
                y: Math.round(ped.y),
                a: Math.round((ped.angle || 0) * 100) / 100
            });
        }

        const noBlood = ped.deathKind === "DROWNED" || ped.deathKind === "ELECTRO" || ped.deathKind === "BURNT";

        for (let i = 0; i < (noBlood ? 0 : 8); i++) {

            this.particles.push({

                x: ped.x,

                y: ped.y,

                vx: (Math.random() - 0.5) * 90,

                vy: (Math.random() - 0.5) * 90,

                size: 4,

                color: "#dc2626",

                life: 0.45,

                maxLife: 0.45

            });

        }



        // Play authentic GTA death scream / roadkill splat if within hearing distance

        if (this.audio && typeof this.audio.playPedDeath === "function" && this.player && Math.hypot(ped.x - this.player.x, ped.y - this.player.y) < 520) {

            this.audio.playPedDeath(ped.deathKind || null, Boolean(byPlayer && this.player.inVehicle && !ped.deathKind));

        }



        // If an AI traffic or AI police car ran over this pedestrian, or the player is dead/respawning, do NOT blame or reward the player!

        if (!byPlayer || (this.player && (this.player.dead || (this.player.respawnGraceUntil || 0) > performance.now()))) return;



        this.recordFrenzyKill();

        if (ped.kind !== "CRIMINAL") {

            this.wantedDecayTimer = 0;

        }



        if (ped.kind === "COP") {

            this.crimeHeat = (this.crimeHeat || 0) + 3;
            this.setWantedLevel(Math.max(2, this.wantedLevel + 1), { x: ped.x, y: ped.y }, true);

        } else if (ped.kind !== "GATOR" && ped.kind !== "CRIMINAL") {

            const nextHeat = (this.crimeHeat || 0) + 1;
            const targetWanted = nextHeat >= 21 ? 6 : (nextHeat >= 15 ? 5 : (nextHeat >= 10 ? 4 : (nextHeat >= 6 ? 3 : (nextHeat >= 3 ? 2 : 1))));
            const wasReported = this.reportCrimeAt(ped.x, ped.y, Math.max(this.wantedLevel || 0, targetWanted), false);
            if (wasReported) {
                this.crimeHeat = nextHeat;
            }

        }



        // Check Iconic 1997 GTA 1 "GOURANGA!" 7-Monk Chain Bonus!

        if (ped.kind === "MONK") {

            this.monksKilled++;

            this.addCash(25, `MONK DOWN (${this.monksKilled}/7)`, true);

            if (this.monksKilled >= 7) {

                this.monkRespawnTimer = 120;

                this.addMultiplier(1);

                this.audio.playFanfare("GOURANGA");

                this.addCash(1000, "GOURANGA!", true);

                this.showBigBanner(

                    "GOURANGA!",

                    "ALL 7 SAFFRON MONKS WIPED OUT! +$1,000 BONUS & MULTIPLIER +1!",

                    "#ff9900",

                    3.4

                );

            }

            return;

        }



        // Only armed targets (Cops, Criminals, Gators) grant a combat bounty; killing innocent unarmed civilians grants $0
        const reward = ped.kind === "COP" ? 100 : (ped.kind === "GATOR" ? 100 : (ped.kind === "CRIMINAL" ? 75 : 0));
        const label = ped.kind === "COP" ? "COP DOWN!" : (ped.kind === "GATOR" ? "GATOR BAG!" : (ped.kind === "CRIMINAL" ? "⚖️ VIGILANTE BONUS!" : ""));
        if (reward > 0) {
            this.addCash(reward, label);
        }
        if (this.director) {
            if (ped.kind === "GATOR" && typeof this.director.onGatorWrangled === "function") {
                this.director.onGatorWrangled(ped);
            } else if ((ped.kind === "COP" || ped.kind === "CRIMINAL") && typeof this.director.addFocusCharge === "function") {
                this.director.addFocusCharge(18);
            }
        }

        this.lastKillTime = performance.now() * 0.001;

    }



    damagePlayer(amount) {

        const p = this.player;

        if (!this.started || p.dead || this.activeInterior) return;
        if (p.respawnGraceUntil && performance.now() < p.respawnGraceUntil) return;

        let rem = amount;

        if (p.armor > 0) {

            const absorbed = Math.min(p.armor, rem * 0.65);

            p.armor -= absorbed;

            rem -= absorbed;

        }

        p.hp -= rem;

        if (p.hp <= 0) {

            p.hp = 0;

            const isSeaDeath = Boolean(p.isSwimming && (p.deepSeaDanger || 0) >= 1);

            this.triggerWastedOrBusted(
                "WASTED!",
                isSeaDeath
                    ? "SHARK ATTACK & RIPTIDE IN DEEP OCEAN — RESCUED BY VICE BEACH COAST GUARD"
                    : "LUCIA FLATLINED — TRANSFERRED TO LEONIDA GENERAL HOSPITAL",
                "#ff1e38",
                "HOSPITAL"
            );

        }

        this.updateHud();

    }



    triggerWastedOrBusted(title, subtitle, color, targetType) {

        const p = this.player;

        if (!p || p.dead) return;

        p._copArrestTimer = 0;
        p._copDoorPullTimer = 0;
        p._batonSlowTimer = 0;
        p.dead = true;
        p.deathType = targetType;
        p.respawnGraceUntil = performance.now() + 4500;

        if (this.activeInterior) {
            this.activeInterior = null;
            this.interiorTracers = [];
            this.interiorPopups = [];
        }
        if (p.isSitting) {
            p.isSitting = false;
            p.sittingProp = null;
        }
        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
            const c = this.map.resolveCircleBuildingCollision(p.x, p.y, 12, p.z || 2.0);
            p.x = c.x;
            p.y = c.y;
        }
        if (targetType !== "POLICE") {
            for (let i = 0; i < 10; i++) {
                this.particles.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 95,
                    vy: (Math.random() - 0.5) * 95,
                    size: 4.2,
                    color: "#dc2626",
                    life: 0.50,
                    maxLife: 0.50
                });
            }
        }

        if (p.inVehicle) {

            const prevVeh = p.inVehicle;

            if ((p.seatIndex || 0) === 0) {

                prevVeh.driver = null;

                prevVeh.vx = 0;

                prevVeh.vy = 0;

                prevVeh.speed = 0;

                prevVeh.drifting = false;

                prevVeh.sirenActive = false;
                prevVeh._worldModified = true;
                prevVeh.isStaticParked = false;
                if (this.net && typeof this.net.broadcastWorldEvent === "function" && prevVeh.id) {
                    const flags =
                        (prevVeh.destroyed ? 1 : 0) |
                        (prevVeh.frontDented ? 4 : 0) |
                        (prevVeh.rearDented ? 8 : 0) |
                        (prevVeh.heavyDented ? 16 : 0) |
                        (prevVeh.fireExtinguished ? 128 : 0);
                    this.net.broadcastWorldEvent({
                        kind: "VEH_EXIT",
                        vehId: prevVeh.id,
                        seat: 0,
                        specKey: prevVeh.specKey || "MINT_STALLION",
                        x: Math.round(prevVeh.x),
                        y: Math.round(prevVeh.y),
                        z: Math.round((prevVeh.z || 2.0) * 100) / 100,
                        a: Math.round((prevVeh.angle || 0) * 1000) / 1000,
                        hp: Math.round(prevVeh.hp || 100),
                        flags,
                        remapIdx: prevVeh.remapIdx || 0
                    });
                }

            }

            p.inVehicle = null;

            p.seatIndex = 0;

        }

        p.vx = 0;
        p.vy = 0;
        p._velX = 0;
        p._velY = 0;
        p._turnBank = 0;
        p.enteringVehicle = null;
        p._enteringTimer = 0;
        p.emoteTimer = 0;
        p.slideCarTimer = 0;
        p.jumpTimer = 0;
        p.isMoving = false;

        if (this.jason) this.jason.inVehicle = null;

        this.killFrenzy = null;
        if (this.missions && this.missions.activeMission && typeof this.missions.failMission === "function") {
            this.missions.failMission(targetType === "POLICE" ? "BUSTED BY VCPD!" : "WASTED!", true);
        }

        this.setWantedLevel(0);

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }

        if (this.audio && typeof this.audio.playFanfare === "function") {

            this.audio.playFanfare(targetType === "POLICE" ? "BUSTED" : "WASTED");

        }



        // Dying (or being arrested without a get-out-of-jail card) costs ALL your money: back to the starting sum
        this.wantedGetawayPot = 0;
        this.wantedPeakLevel = 0;
        this.comboTimer = 0;
        this.comboChain = 0;
        this.comboMult = 1;
        this.comboPot = 0;

        const loseAllCash = () => {

            const lost = Math.max(0, this.cash - this.START_CASH);

            this.cash = this.START_CASH;

            if (lost > 0) {

                this.addFloatingText(p.x, p.y - 30, `-$${lost.toLocaleString("en-US")} LOST`, "#ef4444");

            }
            if (this.net && typeof this.net.broadcastStateNow === "function") {
                this.net.broadcastStateNow();
            }

            return lost;

        };



        if (targetType === "POLICE") {

            // Classic 1997 GTA 1 "GET OUT OF JAIL FREE" Card check!

            if (this.jailFreeCards > 0) {

                this.jailFreeCards -= 1;

                this.showBigBanner(

                    "BUSTED! (JAIL FREE CARD)",

                    "🃏 GET OUT OF JAIL FREE CARD USED — MULTIPLIER & WEAPONS PRESERVED!",

                    "#39ff14",

                    3.2

                );

            } else {

                this.multiplier = Math.max(1, Math.floor(this.multiplier * 0.5));

                p.weapon = "PISTOL";

                loseAllCash();

                this.showBigBanner(

                    title,

                    `${subtitle} — ALL CASH CONFISCATED (BACK TO $${this.START_CASH}), MULTIPLIER x${this.multiplier}`,

                    color,

                    3.0

                );

            }

        } else {

            // WASTED: lose 1 life & halve multiplier

            if (this.lastAttackerId && this.net) {

                this.net.broadcastKilledBy(this.lastAttackerId, this.lastAttackerName);

                this.lastAttackerId = null;

            }

            this.lives = Math.max(0, this.lives - 1);

            this.multiplier = Math.max(1, Math.floor(this.multiplier * 0.5));

            loseAllCash();

            if (this.lives === 0) {

                this.lives = 3;

                this.showBigBanner("WASTED! (LIVES RESET)", `${subtitle} — ALL CASH LOST (BACK TO $${this.START_CASH}), LIVES RESTORED TO 3`, color, 3.2);

            } else {

                this.showBigBanner(title, `${subtitle} — ALL CASH LOST (BACK TO $${this.START_CASH}), LIVES LEFT: ${this.lives}`, color, 3.0);

            }

        }



        this.updateHud();



        setTimeout(() => {

            p.dead = false;
            p.deathType = null;
            p.respawnGraceUntil = performance.now() + 3500;

            p.hp = 100;

            p.armor = 50;

            if (p.ammo) {

                p.ammo.PISTOL = Math.max(p.ammo.PISTOL || 0, 30);

            }

            if (targetType === "POLICE") {

                // VCPD South Beach Precinct (Collins Ave)

                p.x = mx256(203.0) * TILE_SIZE;

                p.y = my256(146.0) * TILE_SIZE;

            } else {

                // Ocean Drive / Hotel Dixon Medical Suite

                p.x = mx256(213.5) * TILE_SIZE;

                p.y = my256(146.0) * TILE_SIZE;

            }

            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                const safeSpawn = this.map.resolveCircleBuildingCollision(p.x, p.y, 12, 2.0, false);
                p.x = safeSpawn.x;
                p.y = safeSpawn.y;
            }

            p.z = this.map.getHeightAtPixel(p.x, p.y, 4.0);

            p.vx = 0;
            p.vy = 0;
            p._velX = 0;
            p._velY = 0;
            p._turnBank = 0;
            p.enteringVehicle = null;
            p._enteringTimer = 0;
            p.emoteTimer = 0;
            p.slideCarTimer = 0;
            p.jumpTimer = 0;
            p.isMoving = false;

            p.isSwimming = false;

            p.isWading = false;

            p.swimStamina = 100;

            p.deepSeaDanger = 0;

            p.waterOffshoreDist = 0;

            p.respawnGraceUntil = performance.now() + 2000;

            this.clearAllPlayerPursuit(true);

            this.setWantedLevel(0);

            if (this.audio && typeof this.audio.resetLoops === "function") {

                this.audio.resetLoops();

            }

            if (this.jason) {

                this.jason.x = p.x;

                this.jason.y = p.y - 48;

                this.jason.z = p.z;

            }

            this.updateHud();
            if (this.net && typeof this.net.broadcastStateNow === "function") {
                this.net.broadcastStateNow();
            }

        }, 2800);

    }



    fireWeapon(shooterX, shooterY, angle, weaponKey, isPlayer = true, fromJason = false, npcFaction = null, audioWeaponOverride = null) {

        const spec = WEAPON_SPECS[weaponKey] || WEAPON_SPECS.PISTOL;

        if (isPlayer) {
            this.audio.playShot(audioWeaponOverride || weaponKey, 1.0);
        } else if (!this.activeInterior) {
            const shotDist = this.player ? Math.hypot(shooterX - this.player.x, shooterY - this.player.y) : 0;
            if (shotDist < 580) {
                const shotVolScale = Math.max(0.24, 1.0 - (shotDist / 580) * 0.72);
                this.audio.playShot(audioWeaponOverride || weaponKey, shotVolScale);
            }
        }



        // Authentic 1997 GTA 1 FIST Melee Punch & Knockdown (weapons.json: base_hit_range 0.2 blocks)

        if (spec.isMelee) {

            if (isPlayer) {

                this.player.punchTimer = 0.34;

                this.player.muzzleTimer = 0;

                this.player.weaponDrawnTimer = 0;

            }

            const hitX = shooterX + Math.cos(angle) * 16;

            const hitY = shooterY + Math.sin(angle) * 16;

            let hitAnyone = false;



            for (const ped of this.peds) {

                if (ped.dead) continue;

                if (Math.hypot(ped.x - hitX, ped.y - hitY) < 25) {

                    hitAnyone = true;

                    ped.hp -= spec.damage;

                    ped.x += Math.cos(angle) * 10;

                    ped.y += Math.sin(angle) * 10;

                    ped.stunnedTimer = (ped.kind === "COP" || ped.isVillaGuard) ? 0.22 : 1.25;
                    if (ped.isVillaGuard) ped.isAlertedGuard = true;

                    ped.panicTimer = (ped.kind === "COP" || ped.isVillaGuard) ? 0 : 4.5;

                    if ((ped.calling911Timer || 0) > 0) {
                        ped.calling911Timer = 0;
                        ped.calling911Stars = 0;
                        ped.calling911Pos = null;
                        this.addFloatingText(ped.x, ped.y - 32, "🔇 911 WITNESS SILENCED!", "#38bdf8");
                    }

                    if (ped.kind === "COP") {

                        this.setWantedLevel(Math.max(this.wantedLevel, 1), { x: ped.x, y: ped.y }, true);

                    }

                    this.spawnParticle(ped.x, ped.y, "BLOOD");

                    if (ped.hp <= 0) {

                        this.killPed(ped);

                    } else if (ped.kind !== "COP") {

                        this.addFloatingText(ped.x, ped.y - 20, "👊 KNOCKDOWN!", "#fde047");

                    }

                    break;

                }

            }



            // Also allow bare-handed punches to hit nearby wooden crates, parasols, and sunbathers!

            if (this.map && Array.isArray(this.map.crates)) {

                for (const cr of this.map.crates) {

                    if (!cr.smashed && Math.hypot(cr.x - hitX, cr.y - hitY) < 26) {

                        hitAnyone = true;

                        this.smashCrate(cr);

                        break;

                    }

                }

            }

            if (this.checkAndWipeoutLivingEvents(hitX, hitY, 22, true, false, true)) {

                hitAnyone = true;

            }



            if (hitAnyone && this.audio && typeof this.audio.playPunchHit === "function") {

                this.audio.playPunchHit();

            }

            return;

        }



        // Gunfire triggers GTA 1 panic in nearby AI traffic drivers, pedestrians & open-air living events!
        if (isPlayer || npcFaction === "CRIMINAL" || npcFaction === "COP") {
            this.checkAndWipeoutLivingEvents(shooterX, shooterY, 85, Boolean(isPlayer), false, false, false, true);
        }

        for (const v of this.vehicles) {

            if (!v.destroyed && v.driver === "AI_TRAFFIC" && Math.abs(v.x - shooterX) < 350 && Math.abs(v.y - shooterY) < 350 && Math.hypot(v.x - shooterX, v.y - shooterY) < 350) {

                if (typeof v.triggerPanic === "function") v.triggerPanic(7.5, shooterX, shooterY);

            }

        }

        for (const ped of this.peds) {

            if (!ped.dead && ped.kind === "CIVILIAN" && Math.abs(ped.x - shooterX) < 360 && Math.abs(ped.y - shooterY) < 360 && Math.hypot(ped.x - shooterX, ped.y - shooterY) < 360) {

                if (ped.isVillaGuard) {
                    if (isPlayer) {
                        ped.isAlertedGuard = true;
                        ped.panicTimer = 0;
                        ped.angle = Math.atan2(shooterY - ped.y, shooterX - ped.x);
                    }
                } else {
                    ped.panicTimer = 5.5;
                    ped.threatX = shooterX;
                    ped.threatY = shooterY;
                    ped.isCrossingRoad = false;
                    ped.angle = Math.atan2(ped.y - shooterY, ped.x - shooterX);
                    ped.targetBx = null;
                    ped.targetBy = null;
                }

            }

        }



        const count = spec.pellets || 1;
        const isTankCannon = (audioWeaponOverride === "TANK_CANNON");
        const muzzleDist = isTankCannon ? 34 : 16;
        const shooterZ = (isPlayer && this.player) ? (this.player.z || 2.0) : 2.0;

        if (isPlayer && this.renderer && (isTankCannon || spec.isRocket || weaponKey === "SHOTGUN")) {
            const kick = isTankCannon ? 5.5 : (spec.isRocket ? 4.2 : 2.2);
            this.renderer.camX -= Math.cos(angle) * kick;
            this.renderer.camY -= Math.sin(angle) * kick;
        }

        if (isTankCannon) {
            const muzX = shooterX + Math.cos(angle) * muzzleDist;
            const muzY = shooterY + Math.sin(angle) * muzzleDist;
            this.spawnParticle(muzX, muzY, "FIRE");
            this.spawnParticle(muzX, muzY, "SMOKE");
            this.spawnParticle(muzX, muzY, "SPARK");
        }

        const spawnedPellets = [];
        const focusActive = Boolean(isPlayer && !fromJason && this.director && (this.director.focusActiveTimer || 0) > 0);
        const effSpread = focusActive ? (spec.spread || 0) * 0.15 : (spec.spread || 0);
        const effSpeed = focusActive ? (spec.speed || 600) * 1.28 : (spec.speed || 600);
        const effDamage = focusActive ? Math.round((spec.damage || 25) * 1.35) : (spec.damage || 25);

        for (let i = 0; i < count; i++) {

            const a = angle + (Math.random() - 0.5) * effSpread;

            const proj = {

                x: shooterX + Math.cos(a) * muzzleDist,

                y: shooterY + Math.sin(a) * muzzleDist,

                z: shooterZ,

                vx: Math.cos(a) * effSpeed,

                vy: Math.sin(a) * effSpeed,

                angle: a,

                damage: effDamage,

                rangeLeft: spec.range,

                maxRange: spec.range,

                isFlame: Boolean(spec.isFlame),

                isRocket: Boolean(spec.isRocket),

                isTankShell: isTankCannon,

                isElectro: Boolean(spec.isElectro),

                fromPlayer: isPlayer,

                fromJason: Boolean(fromJason),

                npcFaction: npcFaction || null,

                r: isTankCannon ? 6 : (spec.isFlame ? 9 : 4)

            };

            this.projectiles.push(proj);

            spawnedPellets.push(proj);

        }

        if (this.projectiles.length > 180) {
            this.projectiles.splice(0, this.projectiles.length - 180);
        }

        if (isPlayer && !fromJason && this.net) {

            this.net.broadcastShoot(weaponKey, spawnedPellets);

        }

    }



    /* ========================================================================

       AUTHENTIC 1997 GTA 1 TRAFFIC & PEDESTRIAN MANAGER (TrafficManager.cpp)

       Delegates off-screen ring generation and culling of AI cars and pedestrians

       to TrafficManager::UpdateTraffic(dt).

       ======================================================================== */

    updateTrafficSpawner(dt) {

        if (this.trafficManager) {

            this.trafficManager.updateTraffic(dt);

        }

    }



    updatePedestrianSpawner(_dt) {

        // Handled by TrafficManager::UpdateTraffic(dt) (generateTrafficPeds + removeOffscreenPeds)

    }



    updateAmbientCrimeEvents(dt) {

        const p = this.player;

        if (!p || p.dead || this.activeInterior) return;

        if ((this.wantedLevel || 0) >= 2) return;

        if (this.missions && this.missions.activeMission) return;



        if (this.ambientCrimeQuietTimer === undefined) {

            // Randomized initial grace window (45..110s) so nothing ever triggers at a predictable startup second

            this.ambientCrimeQuietTimer = 45.0 + Math.random() * 65.0;

            this.ambientCrimeRollTimer = 6.0;

        }

        if (this.ambientCrimeQuietTimer > 0) {

            this.ambientCrimeQuietTimer -= dt;

            return;

        }



        // Evaluate a low-probability stochastic roll (4.5% chance) only once every 6 seconds

        // -> Truly un-timed Poisson process (~1 event every 2.5 to 4.5 minutes on average, never clockwork)

        this.ambientCrimeRollTimer = (this.ambientCrimeRollTimer || 6.0) - dt;

        if (this.ambientCrimeRollTimer > 0) return;

        this.ambientCrimeRollTimer = 5.5 + Math.random() * 2.5;

        if (Math.random() >= 0.045) return;



        // Check if an ambient crime event is already unfolding anywhere near the player

        let activeNearby = 0;
        const crimVehs = this._criminalVehicles || this.vehicles;
        for (let vi = 0; vi < crimVehs.length; vi++) {
            const v = crimVehs[vi];
            if (v && !v.destroyed && v.driver === "AI_CRIMINAL" && Math.hypot(v.x - p.x, v.y - p.y) < 1500) {
                activeNearby++;
            }
        }
        const crimPeds = this._criminalPeds || this.peds;
        for (let pi = 0; pi < crimPeds.length; pi++) {
            const ped = crimPeds[pi];
            if (ped && !ped.dead && ped.kind === "CRIMINAL" && Math.hypot(ped.x - p.x, ped.y - p.y) < 1500) {
                activeNearby++;
            }
        }

        if (activeNearby > 0) {

            this.ambientCrimeQuietTimer = 35.0 + Math.random() * 30.0;

            return;

        }



        // Pick a road block well OUTSIDE every human player's screen (never pops in view), biased ahead of the player's heading
        const baseHeading = p.inVehicle ? p.inVehicle.angle : p.angle;

        const pz = p.z || 2.0;

        let viewports = null;
        try {
            viewports = (this.trafficManager && typeof this.trafficManager.getAllHumanPlayerViewports === "function")
                ? this.trafficManager.getAllHumanPlayerViewports()
                : null;
        } catch (err) { viewports = null; }
        const isVisibleToAnyPlayer = (wx, wy) => {
            if (!viewports) return false;
            const bx = Math.floor(wx / TILE_SIZE);
            const by = Math.floor(wy / TILE_SIZE);
            return viewports.some((vp) => vp.area &&
                bx >= vp.area.minX - 4 && bx <= vp.area.maxX + 4 &&
                by >= vp.area.minY - 4 && by <= vp.area.maxY + 4);
        };

        let chosenPos = null;

        for (let attempt = 0; attempt < 40; attempt++) {

            const angOffset = attempt < 24 ? (Math.random() - 0.5) * 1.9 : (Math.random() - 0.5) * Math.PI * 2;

            const ang = baseHeading + angOffset;

            const dist = 940 + Math.random() * 340;

            const tx = Math.floor((p.x + Math.cos(ang) * dist) / TILE_SIZE);

            const ty = Math.floor((p.y + Math.sin(ang) * dist) / TILE_SIZE);

            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(tx, ty)) continue;

            const navBlk = typeof this.map.getNavigationBlock === "function"

                ? this.map.getNavigationBlock(tx, ty, pz)

                : null;

            if (!navBlk || navBlk.groundType !== GROUND_TYPE.ROAD || navBlk.isRailway) continue;

            const wx = (tx + 0.5) * TILE_SIZE;

            const wy = (ty + 0.5) * TILE_SIZE;

            if (Math.hypot(wx - p.x, wy - p.y) < 880) continue;

            if (isVisibleToAnyPlayer(wx, wy) || this.isPointInAnyPlayerCameraView(wx, wy, 220)) continue;

            const bCol = this.map.resolveCircleBuildingCollision(wx, wy, 24, pz);

            if (bCol && bCol.hit) continue;

            const roadEast = this.map.getGroundTypeAt(wx + TILE_SIZE, wy) === GROUND_TYPE.ROAD || this.map.getGroundTypeAt(wx - TILE_SIZE, wy) === GROUND_TYPE.ROAD;

            const roadSouth = this.map.getGroundTypeAt(wx, wy + TILE_SIZE) === GROUND_TYPE.ROAD || this.map.getGroundTypeAt(wx, wy - TILE_SIZE) === GROUND_TYPE.ROAD;

            let roadAng = 0;

            if (roadEast && !roadSouth) roadAng = Math.random() < 0.5 ? 0 : Math.PI;

            else if (roadSouth && !roadEast) roadAng = Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5;

            else roadAng = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5][Math.floor(Math.random() * 4)];

            if (typeof this.map.getAlignedRoadAngle === "function") {

                roadAng = this.map.getAlignedRoadAngle(tx, ty, roadAng, pz);

            }

            chosenPos = { x: wx, y: wy, z: this.map.getHeightAtPixel(wx, wy, pz), roadAng };

            break;

        }



        if (!chosenPos) {

            return;

        }



        // Minimum quiet refractory period after an event before stochastic rolls even resume (110..210s)

        this.ambientCrimeQuietTimer = 110.0 + Math.random() * 100.0;

        const { x, y, z, roadAng } = chosenPos;

        const fwdX = Math.cos(roadAng);

        const fwdY = Math.sin(roadAng);

        const sideX = -fwdY;

        const sideY = fwdX;



        const getawayPool = ["VICE_CHEETAH", "BANSHEE_GT", "CHALLENGER_RT", "TULIP_MUSCLE", "PENETRATOR_GT"];

        const getawayKey = getawayPool[Math.floor(Math.random() * getawayPool.length)];

        const gangTypes = ["vc_haitian", "vc_cuban", "g2_zaibatsu", "g2_russian", "g2_mugger"];

        const nowId = Date.now();

        const roll = Math.random();



        if (roll < 0.42) {

            // 1. HIGH_SPEED_CHASE: Getaway sports car fleeing at high speed with 1-2 VCPD / SWAT units in hot pursuit!

            const crimCar = new Vehicle(`amb_crim_${nowId}`, getawayKey, x + fwdX * 26, y + fwdY * 26, roadAng);

            crimCar.z = z;

            crimCar.driver = "AI_CRIMINAL";

            crimCar.wasCriminalCar = true;

            crimCar.speed = 195;

            crimCar.vx = fwdX * 195;

            crimCar.vy = fwdY * 195;

            this.vehicles.push(crimCar);



            const copCount = Math.random() < 0.45 ? 2 : 1;

            for (let i = 0; i < copCount; i++) {

                const backDist = 130 + i * 70;

                const latOff = (i === 0 ? 1 : -1) * 10;

                const copSpec = (i === 1 && (this.wantedLevel || 0) >= 4 && Math.random() < 0.22) ? "SWAT_ENFORCER" : "VCPD_CRUISER";

                const copCar = new Vehicle(

                    `amb_cop_${nowId}_${i}`,

                    copSpec,

                    x - fwdX * backDist + sideX * latOff,

                    y - fwdY * backDist + sideY * latOff,

                    roadAng

                );

                copCar.z = z;

                copCar.driver = "AI_COP";

                copCar.sirenActive = true;

                copCar.speed = 190;

                copCar.vx = fwdX * 190;

                copCar.vy = fwdY * 190;

                this.vehicles.push(copCar);

            }

            this.addFloatingText(x, y - 28, "🚨 10-80 VCPD PURSUIT IN PROGRESS!", "#f97316");

        } else if (roll < 0.78) {

            // 2. GANG_HEIST_SHOOTOUT: Armed heist crew exchanging heavy gunfire with VCPD & SWAT officers in the street!

            const crimCar = new Vehicle(`amb_heist_${nowId}`, getawayKey, x + fwdX * 20 + sideX * 12, y + fwdY * 20 + sideY * 12, roadAng + 0.25);

            crimCar.z = z;

            crimCar.driver = null;

            crimCar.wasCriminalCar = true;

            crimCar.doorOpenTimer = 0.65;

            this.vehicles.push(crimCar);



            const banditCount = 2 + Math.floor(Math.random() * 2);

            for (let i = 0; i < banditCount; i++) {

                const bx = x + fwdX * (12 + i * 16) + sideX * ((i % 2 === 0 ? 1 : -1) * 20);

                const by = y + fwdY * (12 + i * 16) + sideY * ((i % 2 === 0 ? 1 : -1) * 20);

                const gType = gangTypes[(i + Math.floor(Math.random() * gangTypes.length)) % gangTypes.length];

                this.peds.push(new Pedestrian({

                    id: `amb_bandit_${nowId}_${i}`,

                    x: bx,

                    y: by,

                    z,

                    kind: "CRIMINAL",

                    g24Type: gType,

                    g2Remapped: true,

                    shirtColor: "#ef4444",

                    hp: 135,

                    maxHp: 135,

                    copWeapon: i === 0 ? "SHOTGUN" : "UZI",

                    shootCooldown: 3.5 + i * 0.8 + Math.random() * 1.5,

                    angle: roadAng + Math.PI,

                    speed: 96,

                    dead: false,

                    panicTimer: 0

                }));

            }



            const copSpec = ((this.wantedLevel || 0) >= 4 && Math.random() < 0.22) ? "SWAT_ENFORCER" : "VCPD_CRUISER";

            const copCar = new Vehicle(`amb_heist_copcar_${nowId}`, copSpec, x - fwdX * 190 - sideX * 10, y - fwdY * 190 - sideY * 10, roadAng - 0.22);

            copCar.z = z;

            copCar.driver = null;

            copCar.sirenActive = false;

            copCar.doorOpenTimer = 0.65;

            this.vehicles.push(copCar);



            const isSwat = copSpec === "SWAT_ENFORCER";

            for (let i = 0; i < 2; i++) {

                const cx = x - fwdX * (160 + i * 18) + sideX * ((i === 0 ? -1 : 1) * 22);

                const cy = y - fwdY * (160 + i * 18) + sideY * ((i === 0 ? -1 : 1) * 22);

                this.peds.push(new Pedestrian({

                    id: `amb_heist_cop_${nowId}_${i}`,

                    x: cx,

                    y: cy,

                    z,

                    kind: "COP",

                    g24Type: isSwat ? "g2_swat" : "police",

                    isSwat,

                    shirtColor: isSwat ? "#1e293b" : "#1e3a8a",

                    hp: isSwat ? 140 : 105,

                    maxHp: isSwat ? 140 : 105,

                    copWeapon: isSwat ? "SHOTGUN" : (i === 0 ? "UZI" : "PISTOL"),

                    shootCooldown: 3.0 + i * 0.8 + Math.random() * 1.5,

                    angle: roadAng,

                    speed: 98,

                    dead: false,

                    panicTimer: 0

                }));

            }

            this.addFloatingText(x, y - 28, "🚨 10-71 GANG ROBBERY & VCPD SHOOTOUT!", "#f97316");

        } else {

            // 3. STREET_CARJACK_INTERVENTION: Bandits carjacking a sports car while VCPD intervenes!

            const jackedCar = new Vehicle(`amb_jack_${nowId}`, getawayKey, x, y, roadAng);

            jackedCar.z = z;

            jackedCar.driver = "AI_CRIMINAL";

            jackedCar.wasCriminalCar = true;

            jackedCar.doorOpenTimer = 0.55;

            jackedCar.speed = 95;

            jackedCar.vx = fwdX * 95;

            jackedCar.vy = fwdY * 95;

            this.vehicles.push(jackedCar);



            // Ejected civilian owner fleeing in panic

            const victim = new Pedestrian({

                id: `amb_victim_${nowId}`,

                x: x + sideX * 24,

                y: y + sideY * 24,

                z,

                kind: "CIVILIAN",

                g24Type: "civ0",

                shirtColor: "#38bdf8",

                hp: 40,

                maxHp: 40,

                speed: 88,

                angle: roadAng + Math.PI * 0.5,

                dead: false,

                panicTimer: 7.0

            });

            this.peds.push(victim);



            // Accomplice bandit providing cover fire on foot

            const gType = gangTypes[Math.floor(Math.random() * gangTypes.length)];

            this.peds.push(new Pedestrian({

                id: `amb_jack_bandit_${nowId}`,

                x: x - fwdX * 16 - sideX * 18,

                y: y - fwdY * 16 - sideY * 18,

                z,

                kind: "CRIMINAL",

                g24Type: gType,

                g2Remapped: true,

                shirtColor: "#ef4444",

                hp: 125,

                maxHp: 125,

                copWeapon: "UZI",

                shootCooldown: 3.5 + Math.random() * 1.5,

                angle: roadAng + Math.PI,

                speed: 96,

                dead: false,

                panicTimer: 0

            }));



            // Responding VCPD cruiser + officer

            const copCar = new Vehicle(`amb_jack_copcar_${nowId}`, "VCPD_CRUISER", x - fwdX * 72, y - fwdY * 72, roadAng);

            copCar.z = z;

            copCar.driver = "AI_COP";

            copCar.sirenActive = true;

            copCar.speed = 155;

            copCar.vx = fwdX * 155;

            copCar.vy = fwdY * 155;

            this.vehicles.push(copCar);



            this.peds.push(new Pedestrian({

                id: `amb_jack_cop_${nowId}`,

                x: x - fwdX * 50 + sideX * 22,

                y: y - fwdY * 50 + sideY * 22,

                z,

                kind: "COP",

                g24Type: "police",

                shirtColor: "#1e3a8a",

                hp: 105,

                maxHp: 105,

                copWeapon: "PISTOL",

                angle: roadAng,

                speed: 98,

                dead: false,

                panicTimer: 0

            }));

            this.addFloatingText(x, y - 28, "🚨 10-31 ARMED CARJACKING — VCPD INTERVENING!", "#f97316");

        }



        // Nearby civilians panic when a shootout or pursuit erupts

        for (const ped of this.peds) {

            if (!ped.dead && ped.kind === "CIVILIAN" && Math.hypot(ped.x - x, ped.y - y) < 280) {

                ped.panicTimer = 6.0;

            }

        }

    }



    rebuildVehicleSpatialGrid() {
        const n = this.vehicles ? this.vehicles.length : 0;
        if (!this._vehGridHead) {
            this._vehGridHead = new Int16Array(16384);
        }
        if (!this._vehGridNext || this._vehGridNext.length < Math.max(1024, n + 64)) {
            this._vehGridNext = new Int16Array(Math.max(1024, n + 256));
        }
        const head = this._vehGridHead;
        const next = this._vehGridNext;
        head.fill(-1);
        this._gridEpoch = ((this._gridEpoch || 0) + 1) | 0;
        const epoch = this._gridEpoch;
        for (let i = 0; i < n; i++) {
            const v = this.vehicles[i];
            if (!v) continue;
            v._gridEpoch = epoch;
            const cx = Math.max(0, Math.min(127, v.x >> 8));
            const cy = Math.max(0, Math.min(127, v.y >> 8));
            const cell = (cy << 7) | cx;
            next[i] = head[cell];
            head[cell] = i;
        }
        this._vehGridCols = 128;
        this._vehGridRows = 128;
        this._vehGridCount = n;
        this._vehGridLastVeh = n > 0 ? this.vehicles[n - 1] : null;
    }

    rebuildPedSpatialGrid() {
        const n = this.peds ? this.peds.length : 0;
        if (!this._pedGridHead) {
            this._pedGridHead = new Int16Array(16384);
        }
        if (!this._pedGridNext || this._pedGridNext.length < Math.max(1024, n + 64)) {
            this._pedGridNext = new Int16Array(Math.max(1024, n + 256));
        }
        const head = this._pedGridHead;
        const next = this._pedGridNext;
        head.fill(-1);
        const criminalPeds = this._criminalPeds || (this._criminalPeds = []);
        const copPeds = this._copPeds || (this._copPeds = []);
        criminalPeds.length = 0;
        copPeds.length = 0;
        const epoch = this._gridEpoch || 1;
        for (let i = 0; i < n; i++) {
            const ped = this.peds[i];
            if (!ped) continue;
            ped._gridEpoch = epoch;
            const cx = Math.max(0, Math.min(127, ped.x >> 8));
            const cy = Math.max(0, Math.min(127, ped.y >> 8));
            const cell = (cy << 7) | cx;
            next[i] = head[cell];
            head[cell] = i;
            if (!ped.dead) {
                if (ped.kind === "CRIMINAL") criminalPeds.push(ped);
                else if (ped.kind === "COP") copPeds.push(ped);
            }
        }
        this._pedGridCount = n;
    }

    ensureVehicleSpatialGrid() {
        const n = this.vehicles ? this.vehicles.length : 0;
        const lastV = n > 0 ? this.vehicles[n - 1] : null;
        if (!this._vehGridHead || this._vehGridCount !== n || this._vehGridLastVeh !== lastV) {
            this.rebuildVehicleSpatialGrid();
        }
    }

    resolveCircleVehicleCollision(x, y, radius = 8.5, z = 2.0, ignoreVeh = null) {
        let hit = false;
        let curX = x;
        let curY = y;
        const rSq = radius * radius;
        const cache = this._stoppedVehCache;
        const sHead = this._stoppedVehGridHead;
        const sNext = this._stoppedVehGridNext;
        if (cache && sHead && sNext) {
            const cx0 = Math.max(0, (curX - 56) >> 8);
            const cx1 = Math.min(127, (curX + 56) >> 8);
            const cy0 = Math.max(0, (curY - 56) >> 8);
            const cy1 = Math.min(127, (curY + 56) >> 8);
            for (let cy = cy0; cy <= cy1; cy++) {
                const rowOff = cy << 7;
                for (let cx = cx0; cx <= cx1; cx++) {
                    for (let idx = sHead[rowOff | cx]; idx !== -1; idx = sNext[idx]) {
                        const vc = cache[idx];
                        if (vc.v === ignoreVeh) continue;
                        const dx = curX - vc.x;
                        if (dx > 54 || dx < -54) continue;
                        const dy = curY - vc.y;
                        if (dy > 54 || dy < -54) continue;
                        if (vc.z !== undefined && z !== undefined && Math.abs(vc.z - z) > 0.24) continue;

                        const cosA = vc.cosA;
                        const sinA = vc.sinA;
                        const localX = dx * cosA + dy * sinA;
                        const localY = -dx * sinA + dy * cosA;
                        const halfL = vc.halfL;
                        const halfW = vc.halfW;

                        const clampedX = Math.max(-halfL, Math.min(halfL, localX));
                        const clampedY = Math.max(-halfW, Math.min(halfW, localY));
                        const ox = localX - clampedX;
                        const oy = localY - clampedY;
                        const distSq = ox * ox + oy * oy;

                        if (distSq < rSq) {
                            hit = true;
                            let newLocalX = localX;
                            let newLocalY = localY;
                            if (distSq > 0.0001) {
                                const dist = Math.sqrt(distSq);
                                newLocalX = clampedX + (ox / dist) * radius;
                                newLocalY = clampedY + (oy / dist) * radius;
                            } else {
                                const penL = halfL - Math.abs(localX);
                                const penW = halfW - Math.abs(localY);
                                if (penW <= penL) {
                                    newLocalY = (localY >= 0 ? 1 : -1) * (halfW + radius);
                                } else {
                                    newLocalX = (localX >= 0 ? 1 : -1) * (halfL + radius);
                                }
                            }
                            curX = vc.x + newLocalX * cosA - newLocalY * sinA;
                            curY = vc.y + newLocalX * sinA + newLocalY * cosA;
                        }
                    }
                }
            }
            return { hit, x: curX, y: curY };
        }

        for (let i = 0; i < this.vehicles.length; i++) {
            const v = this.vehicles[i];
            if (!v || v === ignoreVeh) continue;
            if (v.z !== undefined && z !== undefined && Math.abs(v.z - z) > 0.24) continue;
            const dx = curX - v.x;
            const dy = curY - v.y;
            if (Math.abs(dx) > 54 || Math.abs(dy) > 54) continue;

            // Only solid-block against stationary / slow / parked / wrecked vehicles
            // (fast-moving vehicles are handled by the run-over / knockback logic)
            const vSpd = Math.hypot(v.vx || 0, v.vy || 0);
            if (!v.destroyed && v.driver !== null && vSpd > 58) continue;

            const cosA = Math.cos(v.angle);
            const sinA = Math.sin(v.angle);
            const localX = dx * cosA + dy * sinA;
            const localY = -dx * sinA + dy * cosA;

            const halfL = (v.w || 46) * 0.44;
            const halfW = (v.h || 22) * 0.42;

            const clampedX = Math.max(-halfL, Math.min(halfL, localX));
            const clampedY = Math.max(-halfW, Math.min(halfW, localY));
            const ox = localX - clampedX;
            const oy = localY - clampedY;
            const distSq = ox * ox + oy * oy;

            if (distSq < rSq) {
                hit = true;
                let newLocalX = localX;
                let newLocalY = localY;
                if (distSq > 0.0001) {
                    const dist = Math.sqrt(distSq);
                    newLocalX = clampedX + (ox / dist) * radius;
                    newLocalY = clampedY + (oy / dist) * radius;
                } else {
                    // Center is inside the OBB: push out along the nearest face
                    const penL = halfL - Math.abs(localX);
                    const penW = halfW - Math.abs(localY);
                    if (penW <= penL) {
                        newLocalY = (localY >= 0 ? 1 : -1) * (halfW + radius);
                    } else {
                        newLocalX = (localX >= 0 ? 1 : -1) * (halfL + radius);
                    }
                }
                curX = v.x + newLocalX * cosA - newLocalY * sinA;
                curY = v.y + newLocalX * sinA + newLocalY * cosA;
            }
        }
        return { hit, x: curX, y: curY };
    }

    updateRoadClearanceAndTowing(dt) {

        const p = this.player;

        if (!p) return;

        // Throttle the full-city towing scan to 2 Hz (every 0.5s) instead of scanning 636 vehicles every frame
        this._towScanAccum = (this._towScanAccum || 0) + dt;
        if (this._towScanAccum < 0.5) return;
        const scanDt = this._towScanAccum;
        this._towScanAccum = 0;

        // Scan for a wrecked or abandoned vehicle blocking a road near the player (75px < dist < 760px)

        let targetBlockedCar = null;

        let bestDist = 760;

        let activeTowTrucks = 0;

        let farTowTruck = null;



        for (const v of this.vehicles) {

            if (!v.destroyed && v.driver === "AI_TOW") {

                activeTowTrucks++;

                if (!v.towingVehicle && Math.hypot(v.x - p.x, v.y - p.y) > 980) {

                    farTowTruck = v;

                }

            }

        }



        for (const v of this.vehicles) {

            if (v === p.inVehicle || v.towedByTruck || v.isStaticParked || v.isEstateCar || v.missionTag) continue;

            // Coherent Physical VCPD Cruiser & Crime-Scene Getaway Car Recovery (Zero ghost-car self-driving!):
            // If an intact police cruiser or bandit car is left driverless on the street after a chase,
            // a free officer on scene or a relief officer spawned strictly off-screen physically walks/jogs down the sidewalk
            // all the way to the car door (`bestCarDist < boardDist`), opens the door, climbs in, and drives it back on patrol!
            const reliefThreshold = (this.wantedLevel || 0) > 0 ? 14.0 : 10.0;
            if ((v.isPolice || v.wasCriminalCar) && !v.destroyed && v.driver === null && (v.abandonedTimer || 0) > reliefThreshold) {
                let assignedCop = null;
                for (let pi = 0; pi < this.peds.length; pi++) {
                    const pd = this.peds[pi];
                    if (!pd || pd.dead || pd.kind !== "COP") continue;
                    if (pd._boardingVeh === v || (pd.isReliefDriver && pd.homeCruiser === v)) {
                        assignedCop = pd;
                        break;
                    }
                    if (!pd.inCombat && !pd._boardingVeh && Math.hypot(pd.x - v.x, pd.y - v.y) < 520) {
                        pd._boardingVeh = v;
                        pd.homeCruiser = v;
                        assignedCop = pd;
                        break;
                    }
                }
                const nowReliefMs = performance.now();
                if (!assignedCop && this.peds.length < 165 && (nowReliefMs - (v._reliefCopSpawnedAt || 0)) > 25000) {
                    v._reliefCopSpawnedAt = nowReliefMs;
                    const cz = v.z || 2.0;
                    const camX = (this.renderer && this.renderer.camX !== undefined) ? this.renderer.camX : p.x;
                    const camY = (this.renderer && this.renderer.camY !== undefined) ? this.renderer.camY : p.y;
                    const halfW = ((this.renderer && this.renderer.canvas && this.renderer.canvas.width) ? this.renderer.canvas.width : 1280) * 0.5 + 36;
                    const halfH = ((this.renderer && this.renderer.canvas && this.renderer.canvas.height) ? this.renderer.canvas.height : 720) * 0.5 + 36;
                    for (let ca = 0; ca < 16; ca++) {
                        // Prefer North/South street directions first (angles 90°, 270°, etc.) so relief officers walk in from just beyond the top/bottom of the screen (~410..560px)
                        const ang = ((ca * 4 + Math.floor(ca / 4)) % 16) * (Math.PI * 2 / 16);
                        const sDist = 410 + (ca % 3) * 55;
                        const sx = v.x + Math.cos(ang) * sDist;
                        const sy = v.y + Math.sin(ang) * sDist;
                        // Strictly outside the player's actual camera screen rectangle
                        let onScreenNow = Math.abs(sx - camX) < halfW * 0.78 && Math.abs(sy - camY) < halfH * 0.78;
                        if (this.renderer && typeof this.renderer.worldToScreen === "function" && this.renderer.canvas) {
                            const sp = this.renderer.worldToScreen(sx, sy, cz);
                            const W = this.renderer.canvas.width || 1280;
                            const H = this.renderer.canvas.height || 720;
                            if (sp && typeof sp.x === "number" && typeof sp.y === "number" && (sp.x !== 0 || sp.y !== 0)) {
                                onScreenNow = (sp.x >= -32 && sp.x <= W + 32 && sp.y >= -32 && sp.y <= H + 32);
                            }
                        }
                        if (onScreenNow) continue;
                        const sbx = Math.floor(sx / TILE_SIZE);
                        const sby = Math.floor(sy / TILE_SIZE);
                        const nav = this.map.getNavigationBlock ? this.map.getNavigationBlock(sbx, sby, cz) : null;
                        if (
                            nav &&
                            (nav.groundType === GROUND_TYPE.PAWEMENT || nav.groundType === GROUND_TYPE.ROAD) &&
                            (!this.map.isWaterAtPixel || !this.map.isWaterAtPixel(sx, sy)) &&
                            (!this.map.resolveCircleBuildingCollision || !this.map.resolveCircleBuildingCollision(sx, sy, 10, cz).hit)
                        ) {
                            const reliefCop = new Pedestrian({
                                id: `rcop_${Date.now()}_${ca}`,
                                x: sx,
                                y: sy,
                                z: cz,
                                angle: Math.atan2(v.y - sy, v.x - sx),
                                kind: "COP",
                                g24Type: "police",
                                copWeapon: "PISTOL",
                                hp: 105,
                                speed: 92
                            });
                            reliefCop.isReliefDriver = true;
                            reliefCop._boardingVeh = v;
                            reliefCop.homeCruiser = v;
                            this.peds.push(reliefCop);
                            break;
                        }
                    }
                }
            }

            const towWreckDelay = Math.max(12.0, Math.min(45.0, this.wreckTowDelay || 45.0));
            const isCooledForTow = Boolean(v.fireExtinguished || v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER");
            const isWreck = v.destroyed && isCooledForTow && (v.abandonedTimer || 0) > towWreckDelay;

            const isAbandoned = !v.destroyed &&
                v.driver === null &&
                (v.burnTimer || 0) <= 0 &&
                (v.hp || 100) > 50 &&
                (v.abandonedTimer || 0) > (v.lastPlayerDriven ? 38.0 : (v.isPolice ? 42.0 : 18.0));

            if (!isWreck && !isAbandoned) continue;

            if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(v.x, v.y)) continue;

            const dPlayer = this.getDistanceToNearestHumanPlayer(v.x, v.y);

            if ((!isWreck && dPlayer < 42) || dPlayer >= bestDist) continue;



            const bx = Math.floor(v.x / TILE_SIZE);

            const by = Math.floor(v.y / TILE_SIZE);

            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;

            let nearRoad = false;

            if (typeof this.map.getNavigationBlock === "function") {

                for (let dy = -1; dy <= 1 && !nearRoad; dy++) {

                    for (let dx = -1; dx <= 1; dx++) {

                        const nb = this.map.getNavigationBlock(bx + dx, by + dy, v.z || 2.0);

                        if (nb && nb.groundType === GROUND_TYPE.ROAD) {

                            nearRoad = true;

                            break;

                        }

                    }

                }

            }

            if (!nearRoad) continue;



            // Coordinated Tow Dispatch: do not assign a second Tow Truck to a vehicle already targeted or being hooked at the same spot
            const alreadyTargeted = this.vehicles.some(
                (tv) => !tv.destroyed && tv.driver === "AI_TOW" && (
                    tv.towTarget === v ||
                    tv.towingVehicle === v ||
                    Math.hypot(tv.x - v.x, tv.y - v.y) < 380
                )
            );
            if (alreadyTargeted) continue;

            bestDist = dPlayer;
            targetBlockedCar = v;
        }

        if (!targetBlockedCar) {
            this.towDispatchTimer = 0;
            return;
        }

        this.towDispatchTimer = (this.towDispatchTimer || 0) + scanDt;
        if (this.towDispatchTimer < 6.0) return;
        this.towDispatchTimer = 3.0; // retry ~3s later if no road spawn block found

        // Persistent World Priority #1: If an idle Tow Truck is already patrolling in the district (< 1850px), assign it via radio without teleporting!
        let idlePatrolTow = null;
        let bestPatrolDist = 1850;
        for (const tv of this.vehicles) {
            if (!tv.destroyed && tv.driver === "AI_TOW" && !tv.towingVehicle && !tv.towTarget) {
                const d = Math.hypot(tv.x - targetBlockedCar.x, tv.y - targetBlockedCar.y);
                if (d < bestPatrolDist) {
                    bestPatrolDist = d;
                    idlePatrolTow = tv;
                }
            }
        }
        if (idlePatrolTow) {
            idlePatrolTow.towTarget = targetBlockedCar;
            idlePatrolTow.sirenActive = true;
            idlePatrolTow.approachBestDist = undefined;
            idlePatrolTow.approachNoProgress = 0;
            this.towDispatchTimer = 0;
            return;
        }

        // Persistent World Priority #2: Depart from the Central Municipal Impound Yard (up to 3 Tow Trucks in the fleet!)
        if (activeTowTrucks < 3) {
            const pz = targetBlockedCar.z || 2.0;
            const spawnInfo = this.findStationDispatchSpawn("TOW", targetBlockedCar.x, targetBlockedCar.y, pz);
            if (spawnInfo) {
                const towTruck = new Vehicle(`tow_${Date.now()}`, "TOW_TRUCK", spawnInfo.x, spawnInfo.y, spawnInfo.angle);
                towTruck.z = spawnInfo.z;
                towTruck.driver = "AI_TOW";
                towTruck.isEmergency = true;
                towTruck.isPersistentFleet = true;
                towTruck.homeStation = spawnInfo.station;
                towTruck.impoundDepot = spawnInfo.station;
                towTruck.sirenActive = true;
                towTruck.towTarget = targetBlockedCar;
                towTruck.speed = 68;
                towTruck.vx = Math.cos(spawnInfo.angle) * 68;
                towTruck.vy = Math.sin(spawnInfo.angle) * 68;
                this.vehicles.push(towTruck);
                this.towDispatchTimer = 0;
            }
        }
    }



    updateInterior(dt) {

        const intr = this.activeInterior;

        if (!intr) return;

        const p = this.player;



        if (this.interiorCooldown > 0) {

            this.interiorCooldown = Math.max(0, this.interiorCooldown - dt);

        }



        // Update station cooldowns

        if (Array.isArray(intr.stations)) {
            const nowMs = Date.now();
            for (const st of intr.stations) {
                if ((st.cooldownUntilMs || 0) > nowMs) {
                    st.cooldown = (st.cooldownUntilMs - nowMs) * 0.001;
                } else if ((st.cooldown || 0) > 0) {
                    st.cooldown = Math.max(0, st.cooldown - dt);
                }
            }

        }



        // Move Lucia inside the room

        const speedBoost = (p.speedBoostTimer || 0) > 0 ? 1.28 : 1.0;

        const walkSpeed = (this.input.sprint ? 215 : 155) * speedBoost;

        if (this.input.joyActive && (Math.abs(this.input.joyX) > 0.1 || Math.abs(this.input.joyY) > 0.1)) {

            this.interiorAngle = Math.atan2(this.input.joyY, this.input.joyX);

            const mag = Math.min(1.0, this.input.joyMag || 1.0);

            this.interiorX += Math.cos(this.interiorAngle) * walkSpeed * mag * dt;

            this.interiorY += Math.sin(this.interiorAngle) * walkSpeed * mag * dt;

            p.isMoving = true;

            p.walkPhase += dt * (this.input.sprint ? 1.55 : 1.0);

        } else if (p.tankControls) {

            const turnRate = 4.35;

            if (this.input.left) this.interiorAngle -= turnRate * dt;

            if (this.input.right) this.interiorAngle += turnRate * dt;

            let moveDir = 0;

            if (this.input.up) moveDir += 1.0;

            if (this.input.down) moveDir -= 0.65;

            if (moveDir !== 0) {

                this.interiorX += Math.cos(this.interiorAngle) * walkSpeed * moveDir * dt;

                this.interiorY += Math.sin(this.interiorAngle) * walkSpeed * moveDir * dt;

                p.isMoving = true;

                p.walkPhase += dt * (this.input.sprint ? 1.55 : 1.0);

            } else {

                p.isMoving = false;

            }

        } else {

            let mx = 0, my = 0;

            if (this.input.up) my -= 1;

            if (this.input.down) my += 1;

            if (this.input.left) mx -= 1;

            if (this.input.right) mx += 1;

            if (mx !== 0 || my !== 0) {

                const len = Math.hypot(mx, my);

                this.interiorX += (mx / len) * walkSpeed * dt;

                this.interiorY += (my / len) * walkSpeed * dt;

                this.interiorAngle = Math.atan2(my, mx);

                p.isMoving = true;

                p.walkPhase += dt * (this.input.sprint ? 1.55 : 1.0);

            } else {

                p.isMoving = false;

            }

        }



        // Clamp Lucia inside the 2.5D perimeter interior walls

        const poseBounds = (window.ShopInteriors && typeof window.ShopInteriors.getEntrancePose === "function")
                ? window.ShopInteriors.getEntrancePose(intr)
                : { minX: 34, maxX: intr.w - 34, minY: 72, maxY: intr.h - 24 };
            this.interiorX = Math.max(poseBounds.minX, Math.min(poseBounds.maxX, this.interiorX));
            this.interiorY = Math.max(poseBounds.minY, Math.min(poseBounds.maxY, this.interiorY));



        // Resolve physical circle-vs-AABB collisions against partition walls, counters & furniture

        if (window.ShopInteriors && typeof window.ShopInteriors.getObstacles === "function") {

            const obs = window.ShopInteriors.getObstacles(intr);

            const pRad = 14;

            for (let pass = 0; pass < 2; pass++) {

                for (let i = 0; i < obs.length; i++) {

                    const b = obs[i];

                    const cx = Math.max(b.x, Math.min(b.x + b.w, this.interiorX));

                    const cy = Math.max(b.y, Math.min(b.y + b.h, this.interiorY));

                    const dx = this.interiorX - cx;

                    const dy = this.interiorY - cy;

                    const d2 = dx * dx + dy * dy;

                    if (d2 < pRad * pRad) {

                        if (d2 > 0.0001) {

                            const d = Math.sqrt(d2);

                            this.interiorX += (dx / d) * (pRad - d);

                            this.interiorY += (dy / d) * (pRad - d);

                        } else {

                            // Inside box center fallback: push out along nearest edge

                            const dL = Math.abs(this.interiorX - b.x);

                            const dR = Math.abs(b.x + b.w - this.interiorX);

                            const dT = Math.abs(this.interiorY - b.y);

                            const dB = Math.abs(b.y + b.h - this.interiorY);

                            const m = Math.min(dL, dR, dT, dB);

                            if (m === dL) this.interiorX = b.x - pRad;

                            else if (m === dR) this.interiorX = b.x + b.w + pRad;

                            else if (m === dT) this.interiorY = b.y - pRad;

                            else this.interiorY = b.y + b.h + pRad;

                        }

                    }

                }

            }

            this.interiorX = Math.max(poseBounds.minX, Math.min(poseBounds.maxX, this.interiorX));

            this.interiorY = Math.max(poseBounds.minY, Math.min(poseBounds.maxY, this.interiorY));
            const pFacing = (intr && intr.facing) || "S";
            const pMidY = Math.round(40 + ((intr.h || 560) - 40) * 0.5);
            if (pFacing === "N" && Math.abs(this.interiorX - (intr.w || 820) * 0.5) >= 68) {
                this.interiorY = Math.max(72, this.interiorY);
            } else if (pFacing === "E" && Math.abs(this.interiorY - pMidY) >= 62) {
                this.interiorX = Math.min((intr.w || 820) - 34, this.interiorX);
            } else if (pFacing === "W" && Math.abs(this.interiorY - pMidY) >= 62) {
                this.interiorX = Math.max(34, this.interiorX);
            } else if (pFacing === "S" && Math.abs(this.interiorX - (intr.w || 820) * 0.5) >= 68) {
                this.interiorY = Math.min((intr.h || 560) - 30, this.interiorY);
            }

        }

        // Decay indoor bullet tracers & floating target popups
        if (Array.isArray(this.interiorTracers)) {
            for (let i = this.interiorTracers.length - 1; i >= 0; i--) {
                this.interiorTracers[i].life -= dt;
                if (this.interiorTracers[i].life <= 0) this.interiorTracers.splice(i, 1);
            }
        }
        if (Array.isArray(this.interiorPopups)) {
            for (let i = this.interiorPopups.length - 1; i >= 0; i--) {
                this.interiorPopups[i].y -= 24 * dt;
                this.interiorPopups[i].life -= dt;
                if (this.interiorPopups[i].life <= 0) this.interiorPopups.splice(i, 1);
            }
        }
        if (Array.isArray(intr.npcs)) {
            for (const npc of intr.npcs) {
                if ((npc._robbedTimer || 0) > 0) npc._robbedTimer = Math.max(0, npc._robbedTimer - dt);
            }
        }
        if (Array.isArray(intr._targetHitTimers)) {
            for (let i = 0; i < intr._targetHitTimers.length; i++) {
                if ((intr._targetHitTimers[i] || 0) > 0) intr._targetHitTimers[i] = Math.max(0, intr._targetHitTimers[i] - dt);
            }
        }

        // Live 360-degree Mouse Aiming inside Interiors when mouseShoot is enabled!
        if (p.mouseShoot && this.input.shoot && this.renderer && typeof this.renderer.worldToScreen === "function") {
            const pScr = this.renderer.worldToScreen(this.interiorX, this.interiorY, 2.05);
            const mdx = (this.input.mouseX || 0) - pScr.x;
            const mdy = (this.input.mouseY || 0) - pScr.y;
            if (mdx * mdx + mdy * mdy > 16) {
                this.interiorAngle = Math.atan2(mdy, mdx);
            }
        }

        // Live Indoor Weapon Firing & Ammu-Nation 4-Lane Firing Range Target Practice!
        p.fireTimer = Math.max(0, (p.fireTimer || 0) - dt);
        p.weaponDrawnTimer = Math.max(0, (p.weaponDrawnTimer || 0) - dt);
        p.muzzleTimer = Math.max(0, (p.muzzleTimer || 0) - dt);
        p.punchTimer = Math.max(0, (p.punchTimer || 0) - dt);
        if (this.input.shoot && p.fireTimer <= 0) {
            const wKey = p.weapon || "FIST";
            const wDef = (typeof WEAPON_SPECS !== "undefined" && (WEAPON_SPECS[wKey] || WEAPON_SPECS.FIST)) || { fireRate: 0.25 };
            if (wKey !== "FIST" && (p.ammo[wKey] || 0) <= 0) {
                p.weapon = "FIST";
                this.updateHud();
            } else {
                p.fireTimer = wDef.fireRate || 0.22;
                if (wKey === "FIST") {
                    p.punchTimer = 0.34;
                } else {
                    p.weaponDrawnTimer = 0.65;
                    p.muzzleTimer = 0.09;
                    if (intr.theme !== "SHOP_GUN_SHOP" && Array.isArray(intr.npcs)) {
                        for (const npc of intr.npcs) {
                            npc._robbedTimer = Math.max(npc._robbedTimer || 0, 10.0);
                        }
                    }
                }
                if (wKey !== "FIST" && !this.infiniteAmmo) {
                    p.ammo[wKey] = Math.max(0, (p.ammo[wKey] || 0) - 1);
                    this.updateHud();
                }
                const ang = this.interiorAngle !== undefined ? this.interiorAngle : (p.angle || -Math.PI * 0.5);
                const maxRange = wKey === "FIST" ? 42 : 460;
                const obs = (window.ShopInteriors && typeof window.ShopInteriors.getObstacles === "function")
                    ? window.ShopInteriors.getObstacles(intr)
                    : [];
                let hitX = this.interiorX + Math.cos(ang) * maxRange;
                let hitY = this.interiorY + Math.sin(ang) * maxRange;
                const steps = Math.ceil(maxRange / 6);
                for (let s = 3; s <= steps; s++) {
                    const sx = this.interiorX + Math.cos(ang) * (s * 6);
                    const sy = this.interiorY + Math.sin(ang) * (s * 6);
                    if (sx <= 18 || sx >= intr.w - 18 || sy <= 56 || sy >= intr.h - 18) {
                        hitX = sx;
                        hitY = sy;
                        break;
                    }
                    let blocked = false;
                    for (let k = 0; k < obs.length; k++) {
                        const b = obs[k];
                        if (b.isWall && sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
                            blocked = true;
                            break;
                        }
                    }
                    if (blocked) {
                        hitX = sx;
                        hitY = sy;
                        break;
                    }
                }

                if (wKey !== "FIST") {
                    if (!this.interiorTracers) this.interiorTracers = [];
                    this.interiorTracers.push({
                        x1: this.interiorX + Math.cos(ang) * 14,
                        y1: this.interiorY + Math.sin(ang) * 14,
                        x2: hitX,
                        y2: hitY,
                        color: wDef.color || "#fde047",
                        life: 0.11
                    });
                    if (this.audio && this.audio.playShot) this.audio.playShot(wKey);
                } else if (this.audio && this.audio.playPunch) {
                    this.audio.playPunch();
                }

                // Check Ammu-Nation 4-Lane Downrange Bullseye Targets!
                let hitRangeTarget = false;
                let firedIntoSafeRange = false;
                if (intr.theme === "SHOP_GUN_SHOP" && wKey !== "FIST" && window.ShopInteriors && typeof window.ShopInteriors.transformPoint === "function") {
                    const tNow = (this.renderer && typeof this.renderer.time === "number") ? this.renderer.time : performance.now() * 0.001;
                    if (typeof window.ShopInteriors.transformRect === "function") {
                        const rZone = window.ShopInteriors.transformRect(532, 56, (intr.w || 820) - 550, 260, intr);
                        if (hitX >= rZone.x - 12 && hitX <= rZone.x + rZone.w + 12 && hitY >= rZone.y - 12 && hitY <= rZone.y + rZone.h + 12) {
                            firedIntoSafeRange = true;
                        }
                    }
                    for (let lane = 0; lane < 4; lane++) {
                        const lx = 550 + lane * 58;
                        const targY = Math.round(86 + Math.sin(tNow * 2.0 + lane * 1.4) * 3);
                        const tp = window.ShopInteriors.transformPoint(lx + 27, targY + 2, 0, intr);
                        // Distance from ray segment to target center
                        const rdx = hitX - this.interiorX;
                        const rdy = hitY - this.interiorY;
                        const rLen2 = rdx * rdx + rdy * rdy;
                        const u = rLen2 > 1 ? Math.max(0, Math.min(1, ((tp.x - this.interiorX) * rdx + (tp.y - this.interiorY) * rdy) / rLen2)) : 0;
                        const cx = this.interiorX + u * rdx;
                        const cy = this.interiorY + u * rdy;
                        const dist = Math.hypot(tp.x - cx, tp.y - cy);
                        if (dist <= 24) {
                            hitRangeTarget = true;
                            firedIntoSafeRange = true;
                            if (!intr._targetHitTimers) intr._targetHitTimers = [0, 0, 0, 0];
                            intr._targetHitTimers[lane] = 0.30;
                            const isBullseye = dist <= 10;
                            const nowMsR = Date.now();
                            let bonusTxt = "";
                            if (isBullseye && (nowMsR - (intr._lastBullseyeCashMs || 0) >= 3500)) {
                                intr._lastBullseyeCashMs = nowMsR;
                                this.addCash(25, "🎯 BULLSEYE MARKSMAN!", true);
                                bonusTxt = " +$25";
                            }
                            if (!this.interiorPopups) this.interiorPopups = [];
                            this.interiorPopups.push({
                                x: tp.x,
                                y: tp.y,
                                text: isBullseye ? `🎯 BULLSEYE!${bonusTxt}` : "🎯 TARGET HIT!",
                                color: isBullseye ? "#fde047" : "#39ff14",
                                life: 1.15
                            });
                            this.updateHud();
                            break;
                        }
                    }
                }

                // If firing inside a shop outside the range (or hitting near an NPC), trigger panic / hold-up!
                if (!hitRangeTarget && !firedIntoSafeRange && wKey !== "FIST" && Array.isArray(intr.npcs)) {
                    for (const npc of intr.npcs) {
                        npc._robbedTimer = Math.max(npc._robbedTimer || 0, 8.0);
                    }
                }
            }
        }



        // The companion stays outside while the player is in a venue
        if (this.jason) this.jason.isMoving = false;



        // Keep audio loops silenced and footsteps active while walking inside an interior!

        if (this.audio) {

            if (p.isMoving) {

                this._footstepTimer = (this._footstepTimer || 0) - dt;

                const stepInterval = this.input.sprint ? 0.25 : 0.34;

                if (this._footstepTimer <= 0) {

                    this._footstepTimer = stepInterval;

                    this._footLeft = !this._footLeft;

                    this.audio.playFootstep("PAVEMENT", this._footLeft);

                }

            } else {

                this._footstepTimer = 0.06;

            }

            if (typeof this.audio.update === "function") {

                this.audio.update(dt, {

                    inVehicle: false,

                    vehicleSpeed: 0,

                    vehicleDrifting: false,

                    playerSirenActive: false,

                    wantedLevel: 0,

                    nearestCopDist: 9999,

                    nearestSirenDist: 9999,

                    nearestTrafficDist: 9999,

                    nearestTrafficSpeed: 0,

                    waterProximity: 0,

                    nightFactor: 0

                });

            }

        }



        // Stations inside venues NEVER auto-buy/auto-trigger on walk-over — player must press [E] while on the zone!

        // Step directly onto the bottom EXIT DOOR mat (near center bottom) to return to the street!

        const poseExit = (window.ShopInteriors && typeof window.ShopInteriors.getEntrancePose === "function")
            ? window.ShopInteriors.getEntrancePose(intr)
            : null;
        if (this.interiorCooldown <= 0 &&
            (poseExit ? poseExit.isAtExit(this.interiorX, this.interiorY) : (this.interiorY >= intr.h - 38 && Math.abs(this.interiorX - intr.w * 0.5) < 52))) {
            this.exitInterior();
        }

    }



    update(dt) {

        // Wait until the binary 3D map (cmpLoaded) and WebGL renderer (gta1Ready) are ready
        // so AI traffic and pedestrians never simulate on uninitialized PAWEMENT tiles during startup!
        if (!this.map || !this.map.cmpLoaded || !this.renderer || !this.renderer.gta1Ready) {
            if (this.net && typeof this.net.update === "function") {
                this.net.update(dt);
            }
            return;
        }



        // Advance Live 24-Hour Smartphone Clock & Asymmetric Arcade Day / Afternoon / Sunset / Night / Dawn Cycle (~14 min real-time 24h cycle)
        const prevHr = (((this.worldMinutes % 1440) + 1440) % 1440) / 60.0;
        const clockRate = (typeof this.getArcadeClockRate === "function") ? this.getArcadeClockRate(prevHr) : 1.50;
        this.worldMinutes = (this.worldMinutes + dt * clockRate * (this.timeScale || 1.0)) % 1440;

        this.syncDayNightCycle();



        if (this.interiorCooldown > 0) {

            this.interiorCooldown = Math.max(0, this.interiorCooldown - dt);

        }

        if (this.fadeAlpha > 0) {

            this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 3.2);

        }

        if ((this.player.speedBoostTimer || 0) > 0) {

            this.player.speedBoostTimer = Math.max(0, this.player.speedBoostTimer - dt);

        }



        if (this.creationEngine) {
            this.creationEngine.update(dt);
        }

        // If Lucia is currently inside a Venue Interior, update the interior room while keeping the full exterior persistent world ticking at 60 FPS!
        if (this.activeInterior) {
            this.updateInterior(dt);
        }

        // Spawn / respawn / teleport (big jump in one frame): never auto-enter a door we land next to
        if (!this.activeInterior && Array.isArray(this.map.interiors)) {

            const pp = this.player;

            if (this._doorChkX === undefined || Math.hypot(pp.x - this._doorChkX, pp.y - this._doorChkY) > 120) {

                this.doorRearmBlock = null;

                for (const intr of this.map.interiors) {

                    if (this.isTouchingInteriorDoor(intr, pp.x, pp.y)) {

                        this.doorRearmBlock = intr;

                        break;

                    }

                }

            }

            this._doorChkX = pp.x;

            this._doorChkY = pp.y;

        }



        const p = this.player;

        this.trafficLightTimer = ((this.trafficLightTimer || 0) + dt) % 24.0;

        this.updateTrafficSpawner(dt);



        // 0. Active Kill Frenzy Timer Update

        if (this.killFrenzy) {

            this.killFrenzy.timer -= dt;

            if (this.killFrenzy.timer <= 0) {

                this.killFrenzy = null;

                this.showBigBanner("FRENZY FAILED!", "TIME EXPIRED — FIND ANOTHER SKULL TOKEN TO RETRY!", "#f97316", 2.4);

                this.updateHud();

            }

        }



        // Respawn GOURANGA Monk Chain after wipeout

        if (this.monkRespawnTimer > 0) {

            this.monkRespawnTimer -= dt;

            if (this.monkRespawnTimer <= 0) {

                this.spawnMonkChain();

            }

        }



        // 1. Player On-Foot or In-Vehicle Update

        if (this.started && !p.dead && !this.activeInterior) {

            if (p.muzzleTimer > 0) p.muzzleTimer -= dt;

            if (p.weaponDrawnTimer > 0) p.weaponDrawnTimer = Math.max(0, p.weaponDrawnTimer - dt);

            if (p.enterAnimTimer > 0) p.enterAnimTimer = Math.max(0, p.enterAnimTimer - dt);

            if (p.exitAnimTimer > 0) p.exitAnimTimer = Math.max(0, p.exitAnimTimer - dt);

            if (p.punchTimer > 0) p.punchTimer = Math.max(0, p.punchTimer - dt);

            if (p.slideCarTimer > 0) p.slideCarTimer = Math.max(0, p.slideCarTimer - dt);



            if (p.jumpTimer > 0) {

                p.jumpTimer = Math.max(0, p.jumpTimer - dt);

                p.jumpZOffset = Math.sin((1.0 - p.jumpTimer / 0.52) * Math.PI) * 0.38;



                // Authentic 1997 GTA 1 StateSlideOnCar (frames 91..96):

                // Jumping onto a vehicle hood/roof slides the player across the car!

                if (!p.inVehicle) {

                    for (const v of this.vehicles) {

                        if (v.destroyed) continue;

                        if (Math.hypot(v.x - p.x, v.y - p.y) < 28) {

                            if ((p.slideCarTimer || 0) <= 0) {

                                p.slideCarTimer = 0.42;

                                this.addFloatingText(p.x, p.y - 24, "🚗 HOOD SLIDE!", "#38bdf8");

                            }

                            p.x += Math.cos(p.angle) * 95 * dt;

                            p.y += Math.sin(p.angle) * 95 * dt;

                            break;

                        }

                    }

                }

            } else if ((p.slideCarTimer || 0) > 0) {

                p.jumpZOffset = 0.24;

            } else {

                p.jumpZOffset = 0;

            }



            // Aim toward mouse cursor only when actively firing with desktop mouse; otherwise aim straight along stick / player angle!

            const pScreen = this.renderer.worldToScreen(p.x, p.y, p.z || 2.0);

            const mouseAimAngle = Math.atan2(this.input.mouseY - pScreen.y, this.input.mouseX - pScreen.x);

            const useMouseAim = Boolean(p.mouseShoot && !this.input.joyActive && !this.input.joyWasUsed);



            if (p.inVehicle) {

                const v = p.inVehicle;

                p.enteringVehicle = null;

                const occList = typeof v.getOccupiedSeats === "function" ? v.getOccupiedSeats(this) : [];



                // Auto-promote Passenger to Driver (seat 0) if the previous driver exited or disconnected!

                if ((p.seatIndex || 0) > 0 && !occList.some((o) => !o.isLocal && o.seat === 0)) {

                    p.seatIndex = 0;

                    v.driver = "PLAYER";

                    this.addFloatingText(v.x, v.y - 28, "🚗 PROMOTED TO DRIVER SEAT!", "#ffd13b");

                    if (this.net && typeof this.net.broadcastStateNow === "function") {

                        this.net.broadcastStateNow();

                    }

                }



                const mySeat = p.seatIndex || 0;

                const seatPos = typeof v.getSeatWorldPos === "function"

                    ? v.getSeatWorldPos(mySeat)

                    : { x: v.x, y: v.y };

                p.x = seatPos.x;

                p.y = seatPos.y;

                if (v.waterOnly || v.specKey === "AIRBOAT") {
                    v.z = Math.max(2.0, v.z || 2.0);
                }
                p.z = v.z !== undefined ? v.z : this.map.getHeightAtPixel(v.x, v.y, p.z || 2.0);

                p.angle = v.angle;

                p.isMoving = false;



                // Tank Co-Op Turret Logic: Seat 1 (Gunner) controls turret if occupied; otherwise Seat 0 (Driver) controls it!

                const hasRemoteGunner = occList.some((o) => !o.isLocal && o.seat === 1);

                if (v.hasTurret && (mySeat === 1 || (mySeat === 0 && !hasRemoteGunner))) {
                    const prevTurretAng = typeof v.turretAngle === "number" ? v.turretAngle : v.angle;
                    const nextTurretAng = (this.input.joyActive && typeof this.input.joyAngle === "number")
                        ? this.input.joyAngle
                        : (useMouseAim ? mouseAimAngle : v.angle);
                    let tDiff = nextTurretAng - prevTurretAng;
                    while (tDiff > Math.PI) tDiff -= Math.PI * 2;
                    while (tDiff < -Math.PI) tDiff += Math.PI * 2;
                    const instSpin = Math.abs(tDiff) / Math.max(0.008, dt);
                    v.turretSpinSpeed = (v.turretSpinSpeed || 0) * 0.65 + Math.min(4.0, instSpin) * 0.35;
                    v.turretAngle = nextTurretAng;
                } else if (v.hasTurret) {
                    v.turretSpinSpeed = (v.turretSpinSpeed || 0) * 0.7;
                }



                // Vehicle-Specific Multi-Player Crew Perks:

                // 1) MEDIC_AMBULANCE: regenerates +6 HP/s for every player seated inside

                if (v.specKey === "MEDIC_AMBULANCE" && p.hp < 100) {

                    p.hp = Math.min(100, p.hp + 6 * dt);

                }

                // 2) SWAT_ENFORCER / BRINKS_TRUCK: regenerates +5 ARMOR/s for every player seated inside

                if ((v.specKey === "SWAT_ENFORCER" || v.specKey === "BRINKS_TRUCK") && p.armor < 100) {

                    p.armor = Math.min(100, p.armor + 5 * dt);

                }

                // 3) TAXI / VIP LIMO / BUS Chauffeur Bonus when driving online passengers at speed

                const remotePassengerCount = occList.filter((o) => !o.isLocal && o.seat > 0).length;

                if (

                    mySeat === 0 &&

                    remotePassengerCount > 0 &&

                    Math.hypot(v.vx, v.vy) > 65 &&

                    (v.specKey === "VICE_CAB" || v.specKey === "STRETCH_LIMO" || v.specKey === "CITY_BUS" || v.specKey === "TOUR_COACH")

                ) {

                    v._chauffeurTimer = (v._chauffeurTimer || 0) + dt;

                    if (v._chauffeurTimer >= 2.5) {

                        v._chauffeurTimer = 0;

                        const fare = (v.specKey === "STRETCH_LIMO" ? 150 : 75) * remotePassengerCount;

                        this.addCash(fare, `🚕 CHAUFFEUR FARE (+$${fare})`);

                    }

                }



                // A. Unique 3D Stunt Jump Ramps! Launching bikes & cars high into 3D air with Cinematic Camera Pullback!

                if (mySeat === 0 && this.renderer && v.appliedStuntZoom) {

                    this.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, (this.renderer.zoomOffsetBlocks || 0) - v.appliedStuntZoom));

                    v.appliedStuntZoom = 0;

                }

                if ((v._stuntLandingGrace || 0) > 0) {
                    v._stuntLandingGrace = Math.max(0, v._stuntLandingGrace - dt);
                }

                if ((v.stuntAirTimer || 0) > 0) {

                    v.stuntAirTimer = Math.max(0, v.stuntAirTimer - dt);

                    const prog = 1.0 - v.stuntAirTimer / (v.stuntMaxTime || 1.15);

                    v.stuntZOffset = Math.sin(prog * Math.PI) * 1.45;

                    if (mySeat === 0 && this.renderer) {

                        v.appliedStuntZoom = v.stuntZOffset * 1.15;

                        this.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, (this.renderer.zoomOffsetBlocks || 0) + v.appliedStuntZoom));

                    }

                    if (v.stuntAirTimer <= 0) {

                        v.stuntZOffset = 0;
                        v._stuntLandingGrace = 0.70;

                        if (mySeat === 0) {
                            const stuntReward = Math.min(500, Math.round(200 + (v.stuntMaxTime || 1.0) * 180));

                            this.audio.playCashSound();

                            this.addCash(stuntReward, "🔥 STUNT JUMP!");

                            this.showBigBanner("UNIQUE STUNT BONUS!", `${v.lastRampName || "BIG AIR"} — +$${stuntReward}!`, "#fde047", 2.0);

                        }

                    }

                } else if (mySeat === 0 && Array.isArray(this.map.stuntRamps)) {

                    const vSpd = Math.hypot(v.vx, v.vy);

                    if (vSpd > 95) {

                        for (const ramp of this.map.stuntRamps) {

                            if (Math.hypot(v.x - ramp.x, v.y - ramp.y) < 48) {
                                const align = (v.vx * Math.cos(ramp.angle || 0) + v.vy * Math.sin(ramp.angle || 0)) / Math.max(1, vSpd);
                                if (align < 0.30) continue;

                                v.stuntMaxTime = Math.min(1.50, Math.max(0.95, vSpd / 260));

                                v.stuntAirTimer = v.stuntMaxTime;

                                v.lastRampName = ramp.name;

                                v.vx *= 1.24;

                                v.vy *= 1.24;

                                this.audio.playBeep(520, 0.12, "sawtooth", 0.08);

                                this.addFloatingText(v.x, v.y - 28, `🚀 ${ramp.name}!`, "#fde047");

                                break;

                            }

                        }

                    }

                }



                // B. Motorcycle Wheelie Bonus OR Marine Hydro-Boost Roostertail & Wave Crest Jump ([SPACE] at speed!)

                if ((v._waveJumpCd || 0) > 0) v._waveJumpCd = Math.max(0, v._waveJumpCd - dt);

                const isWaterCraft = Boolean(v.waterOnly || v.specKey === "AIRBOAT");

                if (mySeat === 0 && isWaterCraft && this.input.handbrake && Math.hypot(v.vx, v.vy) > 85 && this.map.isWaterAtPixel(v.x, v.y)) {

                    v.wheelieTimer = (v.wheelieTimer || 0) + dt;

                    v.roostertailActive = true;

                    const curBoatSpd = Math.hypot(v.vx, v.vy);
                    if (curBoatSpd < (v.maxSpeed || 245) * 1.12) {
                        v.vx += Math.cos(v.angle) * 45 * dt;
                        v.vy += Math.sin(v.angle) * 45 * dt;
                    }

                    if (Math.hypot(v.vx, v.vy) > 195 && (v.stuntAirTimer || 0) <= 0 && (v._waveJumpCd || 0) <= 0 && v.wheelieTimer > 0.65) {

                        v._waveJumpCd = 4.2;

                        v.stuntMaxTime = 0.88;

                        v.stuntAirTimer = 0.88;

                        v.lastRampName = "VICE BAY WAVE CREST JUMP";

                        this.audio.playWaterSplash(0.95);

                        this.addFloatingText(v.x, v.y - 26, "🌊 WAVE CREST JUMP!", "#38bdf8");

                    }

                    if (v.wheelieTimer >= 1.35) {

                        v.wheelieTimer = 0;

                    }

                } else if (mySeat === 0 && v.isMotorcycle && this.input.handbrake && Math.hypot(v.vx, v.vy) > 130) {

                    v.roostertailActive = false;

                    v.wheelieTimer = (v.wheelieTimer || 0) + dt;

                    v.vx += Math.cos(v.angle) * 120 * dt;

                    v.vy += Math.sin(v.angle) * 120 * dt;

                    if (v.wheelieTimer >= 1.2) {

                        v.wheelieTimer = 0;

                    }

                } else if (mySeat === 0) {

                    v.roostertailActive = false;

                    v.wheelieTimer = 0;

                }

                p.isSwimming = false;
                p.isWading = false;
                p.deepSeaDanger = 0;
                p.waterOffshoreDist = 0;
                p.swimStamina = Math.min(100, (p.swimStamina !== undefined ? p.swimStamina : 100) + dt * 32.0);

            } else {

                const boostMult = (p.speedBoostTimer || 0) > 0 ? 1.28 : 1.0;

                const preWaterInfo = (this.map && typeof this.map.getWaterOffshoreInfo === "function")
                    ? this.map.getWaterOffshoreInfo(p.x, p.y, Boolean(p.isSwimming))
                    : { inWater: Boolean(this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(p.x, p.y)), distBlocks: 1.0, shoreDirX: -1, shoreDirY: 0 };

                const isSwimmingPre = Boolean(preWaterInfo.inWater && preWaterInfo.distBlocks >= 0.36 && (p.jumpTimer || 0) <= 0.08);
                const tileIdxFoot = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(p.y / TILE_SIZE))) * MAP_COLS + Math.max(0, Math.min(MAP_COLS - 1, Math.floor(p.x / TILE_SIZE)));
                const onSoftSand = Boolean(this.map && this.map.coastalSandMask && this.map.coastalSandMask[tileIdxFoot]);
                const isSkatingNow = Boolean(p.rollerSkates && !isSwimmingPre && !preWaterInfo.inWater && !onSoftSand);
                p._isSkatingActive = isSkatingNow;
                if ((p.emoteTimer || 0) > 0) {
                    p.emoteTimer = Math.max(0, p.emoteTimer - dt);
                    if (this.input.shoot || this.input.sprint || isSwimmingPre) p.emoteTimer = 0;
                }
                p.swimPhase = (p.swimPhase || 0) + dt * (this.input.sprint ? 5.8 : 4.0) * (p.isMoving ? 1.0 : 0.45);
                const swimStrokeSurge = isSwimmingPre ? (0.92 + 0.16 * Math.sin(p.swimPhase)) : 1.0;
                const exhaustedMult = (isSwimmingPre && p.swimStamina !== undefined && p.swimStamina <= 5) ? 0.68 : 1.0;
                if ((p._batonSlowTimer || 0) > 0) {
                    p._batonSlowTimer = Math.max(0, p._batonSlowTimer - dt);
                }
                if ((p._copArrestEngageFrame || 0) > 0) {
                    p._copArrestEngageFrame = Math.max(0, p._copArrestEngageFrame - dt);
                } else if ((p._copArrestTimer || 0) > 0) {
                    p._copArrestTimer = Math.max(0, p._copArrestTimer - dt * 1.35);
                }
                const batonStaggerMult = (p._batonSlowTimer || 0) > 0 ? 0.68 : 1.0;
                const baseFootSpd = isSkatingNow
                    ? (this.input.sprint ? 250 : 188)
                    : (this.input.sprint ? 198 : 142);
                const walkSpeed = isSwimmingPre
                    ? ((this.input.sprint ? 128 : 92) * boostMult * swimStrokeSurge * exhaustedMult)
                    : (baseFootSpd * boostMult * batonStaggerMult * (preWaterInfo.inWater ? 0.82 : 1.0));

                const manualInput = this.input.up || this.input.down || this.input.left || this.input.right;

                if (p.isSitting) {
                    p.hp = Math.min(p.maxHp || 100, (p.hp || 100) + dt * 2.5);
                    const joyMoved = this.input.joyActive && (Math.abs(this.input.joyX) > 0.15 || Math.abs(this.input.joyY) > 0.15);
                    if (manualInput || joyMoved || (p.jumpTimer || 0) > 0 || this.input.shoot) {
                        const prop = p.sittingProp;
                        const seat = p.sittingSeat || 0;
                        p.isSitting = false;
                        p.sittingProp = null;
                        p._velX = 0;
                        p._velY = 0;
                        if (prop && prop.kind === "PROMENADE_BENCH") {
                            const bAng = prop.angle !== undefined ? prop.angle : 0;
                            const ca = Math.cos(bAng), sa = Math.sin(bAng);
                            const lat = seat === 0 ? -10.6 : 10.6;
                            p.x = prop.x + ca * 18.5 - sa * lat;
                            p.y = prop.y + sa * 18.5 + ca * lat;
                        } else if (prop) {
                            p.x = prop.x + 20.0;
                            p.y = prop.y + (seat === 0 ? -16.5 : 16.5);
                        } else {
                            p.x += Math.cos(p.angle) * 16;
                            p.y += Math.sin(p.angle) * 16;
                        }
                        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                            const col = this.map.resolveCircleBuildingCollision(p.x, p.y, 10, p.z || 2.0, false);
                            p.x = col.x;
                            p.y = col.y;
                        }
                    }
                }

                if (manualInput) {

                    p.enteringVehicle = null;
                    p._enteringTimer = 0;

                }



                // StateEnteringCar (PedestrianStates.cpp): physically run to the vehicle's door!

                if (p.enteringVehicle && !p.enteringVehicle.destroyed) {

                    const ev = p.enteringVehicle;
                    p._enteringTimer = (p._enteringTimer || 0) + dt;

                    const targetSeat = typeof ev.findFirstFreeSeat === "function" ? Math.max(0, ev.findFirstFreeSeat(this)) : 0;

                    const sideSign = (targetSeat % 2 === 1) ? 1 : -1;

                    const doorX = ev.x + sideSign * Math.sin(ev.angle) * 20;

                    const doorY = ev.y - sideSign * Math.cos(ev.angle) * 20;

                    const distDoor = Math.hypot(doorX - p.x, doorY - p.y);

                    const distCarCenter = Math.hypot(ev.x - p.x, ev.y - p.y);

                    if (distDoor < 26 || distCarCenter < 38) {

                        this.completeVehicleEntry(ev);

                    } else if (distDoor > 180 || p._enteringTimer > 4.2) {

                        p.enteringVehicle = null;
                        p._enteringTimer = 0;

                    } else {

                        p.angle = typeof this.steerPedWithObstacleFeelers === "function"
                            ? this.steerPedWithObstacleFeelers(p, doorX, doorY, ev)
                            : Math.atan2(doorY - p.y, doorX - p.x);

                        p.x += Math.cos(p.angle) * 185 * dt;

                        p.y += Math.sin(p.angle) * 185 * dt;

                        p.isMoving = true;

                        p.walkPhase += dt * 1.45;

                    }

                } else if (this.input.joyActive && (Math.abs(this.input.joyX) > 0.1 || Math.abs(this.input.joyY) > 0.1)) {

                    // Mobile 360° Virtual Analog Stick On-Foot Movement with smooth turn & velocity blend
                    const targetAng = Math.atan2(this.input.joyY, this.input.joyX);
                    let da = targetAng - (p.angle || 0);
                    while (da > Math.PI) da -= Math.PI * 2;
                    while (da < -Math.PI) da += Math.PI * 2;
                    const turnStep = Math.min(1.0, dt * (isSkatingNow ? 11.5 : 16.5));
                    p.angle = (p.angle || 0) + da * turnStep;
                    p._turnBank = (p._turnBank || 0) * 0.82 + Math.max(-0.22, Math.min(0.22, da * 0.28)) * 0.18;

                    const mag = Math.min(1.0, this.input.joyMag || 1.0);
                    const spd = p.jumpTimer > 0 ? Math.max(walkSpeed, 175) : walkSpeed * mag;
                    const tx = Math.cos(targetAng) * spd;
                    const ty = Math.sin(targetAng) * spd;
                    const acc = Math.min(1.0, dt * (isSkatingNow ? 10.5 : 19.0));
                    p._velX = (p._velX || 0) + (tx - (p._velX || 0)) * acc;
                    p._velY = (p._velY || 0) + (ty - (p._velY || 0)) * acc;

                    p.x += p._velX * dt;
                    p.y += p._velY * dt;
                    p.isMoving = true;
                    p.walkPhase += dt * (this.input.sprint ? 1.58 : (isSkatingNow ? 1.28 : 1.06));

                } else if (p.tankControls) {

                    // Authentic 1997 GTA 1 Rotational On-Foot Controls
                    const turnRate = 4.35;
                    let turnDir = 0;
                    if (this.input.left) { p.angle -= turnRate * dt; turnDir -= 1; }
                    if (this.input.right) { p.angle += turnRate * dt; turnDir += 1; }
                    p._turnBank = (p._turnBank || 0) * 0.82 + (turnDir * 0.14) * 0.18;

                    let moveDir = 0;
                    if (this.input.up) moveDir += 1.0;
                    if (this.input.down) moveDir -= 0.6;

                    if (moveDir !== 0 || p.jumpTimer > 0) {
                        const spd = p.jumpTimer > 0 ? Math.max(walkSpeed, 175) * (moveDir !== 0 ? Math.sign(moveDir) : 1) : walkSpeed * moveDir;
                        const tx = Math.cos(p.angle) * spd;
                        const ty = Math.sin(p.angle) * spd;
                        const acc = Math.min(1.0, dt * (isSkatingNow ? 10.5 : 19.0));
                        p._velX = (p._velX || 0) + (tx - (p._velX || 0)) * acc;
                        p._velY = (p._velY || 0) + (ty - (p._velY || 0)) * acc;
                        p.x += p._velX * dt;
                        p.y += p._velY * dt;
                        p.isMoving = true;
                        p.walkPhase += dt * (this.input.sprint ? 1.58 : (isSkatingNow ? 1.28 : 1.06));
                    } else {
                        const dec = Math.min(1.0, dt * (isSkatingNow ? 7.5 : 18.0));
                        p._velX = (p._velX || 0) * (1.0 - dec);
                        p._velY = (p._velY || 0) * (1.0 - dec);
                        if (Math.hypot(p._velX, p._velY) > 6.0) {
                            p.x += p._velX * dt;
                            p.y += p._velY * dt;
                            p.isMoving = isSkatingNow;
                        } else {
                            p._velX = 0;
                            p._velY = 0;
                            p.isMoving = false;
                        }
                    }

                    if (this.input.shoot && useMouseAim) {
                        p.angle = mouseAimAngle;
                    }

                } else {

                    // Modern Cardinal 8-Way WASD Controls with fluid angular turn & momentum glide
                    let mx = 0;
                    let my = 0;
                    if (this.input.up) my -= 1;
                    if (this.input.down) my += 1;
                    if (this.input.left) mx -= 1;
                    if (this.input.right) mx += 1;

                    if (mx !== 0 || my !== 0) {
                        const len = Math.hypot(mx, my);
                        const targetAng = Math.atan2(my, mx);
                        let da = targetAng - (p.angle || 0);
                        while (da > Math.PI) da -= Math.PI * 2;
                        while (da < -Math.PI) da += Math.PI * 2;
                        const turnStep = Math.min(1.0, dt * (isSkatingNow ? 11.5 : 16.5));
                        p.angle = (p.angle || 0) + da * turnStep;
                        p._turnBank = (p._turnBank || 0) * 0.82 + Math.max(-0.22, Math.min(0.22, da * 0.28)) * 0.18;

                        const tx = (mx / len) * walkSpeed;
                        const ty = (my / len) * walkSpeed;
                        const acc = Math.min(1.0, dt * (isSkatingNow ? 10.5 : 19.0));
                        p._velX = (p._velX || 0) + (tx - (p._velX || 0)) * acc;
                        p._velY = (p._velY || 0) + (ty - (p._velY || 0)) * acc;

                        p.x += p._velX * dt;
                        p.y += p._velY * dt;
                        p.isMoving = true;
                        p.walkPhase += dt * (this.input.sprint ? 1.58 : (isSkatingNow ? 1.28 : 1.06));
                    } else {
                        p._turnBank = (p._turnBank || 0) * 0.82;
                        const dec = Math.min(1.0, dt * (isSkatingNow ? 7.5 : 18.0));
                        p._velX = (p._velX || 0) * (1.0 - dec);
                        p._velY = (p._velY || 0) * (1.0 - dec);
                        if (Math.hypot(p._velX, p._velY) > 6.0) {
                            p.x += p._velX * dt;
                            p.y += p._velY * dt;
                            p.isMoving = isSkatingNow;
                            if (isSkatingNow) p.walkPhase += dt * 0.72;
                        } else {
                            p._velX = 0;
                            p._velY = 0;
                            p.isMoving = false;
                        }
                    }

                    if (this.input.shoot && useMouseAim) {
                        p.angle = mouseAimAngle;
                    }

                }



                const isUnderBridgeSwimmer = Boolean(p.isSwimming || preWaterInfo.underBridge);
                const canSwimIntoWater = (p.z || 2.0) <= 2.38 || (p.jumpTimer || 0) > 0 || Boolean(preWaterInfo.inWater);

                if (!p.isSitting) {
                    const col = this.map.resolveCircleBuildingCollision(p.x, p.y, 11, p.z || 2.0, canSwimIntoWater, isUnderBridgeSwimmer);
                    p.x = col.x;
                    p.y = col.y;
                }



                if (this.map.resolveCircleFloraCollision) {

                    const fcol = this.map.resolveCircleFloraCollision(p.x, p.y, 11);

                    p.x = fcol.x;

                    p.y = fcol.y;

                }

                if ((p.jumpTimer || 0) <= 0 && (p.slideCarTimer || 0) <= 0 && (p.exitAnimTimer || 0) <= 0) {

                    const vcol = this.resolveCircleVehicleCollision(p.x, p.y, 8.5, p.z || 2.0, p.enteringVehicle);

                    p.x = vcol.x;

                    p.y = vcol.y;

                }

                const postWater = (this.map && typeof this.map.getWaterOffshoreInfo === "function")
                    ? this.map.getWaterOffshoreInfo(p.x, p.y, isUnderBridgeSwimmer)
                    : { inWater: Boolean(this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(p.x, p.y)), distBlocks: 1.0, shoreDirX: -1, shoreDirY: 0 };

                p.z = postWater.inWater
                    ? Math.max(2.0, this.map.getHeightAtPixel(p.x, p.y, p.z || 2.0, false))
                    : this.map.getHeightAtPixel(p.x, p.y, p.z || 2.0);
                if (p.isMoving && !postWater.inWater) {
                    this.emitPedFootprints(p, dt);
                }

                // --- SWIMMING & DEEP OCEAN ("HAUTE MER") RIPTIDE / SHARK DANGER SYSTEM ---
                const wasSwimming = Boolean(p.isSwimming);
                const nowSwimming = Boolean(postWater.inWater && postWater.distBlocks >= 0.36 && (p.jumpTimer || 0) <= 0.08);
                p.isWading = Boolean(postWater.inWater && !nowSwimming);
                p.isSwimming = nowSwimming;
                p.inPool = Boolean(postWater.isPool);
                p.waterOffshoreDist = postWater.inWater ? postWater.distBlocks : 0;
                p.shoreDirX = postWater.shoreDirX || -1;
                p.shoreDirY = postWater.shoreDirY || 0;
                if (p.swimStamina === undefined) p.swimStamina = 100;

                if (nowSwimming && !wasSwimming) {
                    if (this.audio && typeof this.audio.playWaterSplash === "function") {
                        this.audio.playWaterSplash(0.85);
                    }
                    p._swimSplashCd = 0.38;
                } else if (nowSwimming && p.isMoving) {
                    p._swimSplashCd = (p._swimSplashCd || 0) - dt;
                    if (p._swimSplashCd <= 0) {
                        p._swimSplashCd = this.input.sprint ? 0.36 : 0.52;
                        if (this.audio && typeof this.audio.playWaterSplash === "function") {
                            this.audio.playWaterSplash(0.38);
                        }
                    }
                }

                // Check if an intact boat/jetski/airboat is right beside the swimmer (acts as a floating safety refuge within 88px)
                let nearBoatRefuge = false;
                if (nowSwimming && Array.isArray(this.vehicles)) {
                    for (let vi = 0; vi < this.vehicles.length; vi++) {
                        const bv = this.vehicles[vi];
                        if (!bv || bv.destroyed) continue;
                        if (bv.waterOnly || bv.specKey === "AIRBOAT" || bv.amphibious) {
                            if (Math.hypot(bv.x - p.x, bv.y - p.y) <= 88) {
                                nearBoatRefuge = true;
                                break;
                            }
                        }
                    }
                }

                if (!postWater.inWater) {
                    p.deepSeaDanger = 0;
                    p.swimStamina = Math.min(100, p.swimStamina + dt * 30.0);
                } else if (postWater.distBlocks <= 11.5 || nearBoatRefuge) {
                    // Safe coastal / pier / lagoon / canal swimming zone (up to 11.5 blocks / ~740px from any shore or pier!)
                    p.deepSeaDanger = 0;
                    if (nowSwimming && this.input.sprint && p.isMoving) {
                        p.swimStamina = Math.max(25, p.swimStamina - dt * 3.0);
                    } else {
                        p.swimStamina = Math.min(100, p.swimStamina + dt * 18.0);
                    }
                } else {
                    // True Deep Ocean / Haute Mer (> 11.5 blocks from nearest beach, pier, or island!)
                    const moveCosToShore = p.isMoving
                        ? (Math.cos(p.angle) * p.shoreDirX + Math.sin(p.angle) * p.shoreDirY)
                        : 0;
                    const swimmingToShore = moveCosToShore > 0.32;
                    const overDepth = Math.max(0, postWater.distBlocks - 11.5);

                    // Offshore riptide current pulls gently out to sea if not actively swimming back toward shore
                    if (!swimmingToShore) {
                        const riptidePull = Math.min(18.0, 6.0 + overDepth * 2.0);
                        p.x -= p.shoreDirX * riptidePull * dt;
                        p.y -= p.shoreDirY * riptidePull * dt;
                    }

                    const drainRate = (swimmingToShore ? 4.5 : 10.5) + overDepth * 2.5 + (this.input.sprint ? 3.5 : 0);
                    p.swimStamina = Math.max(0, p.swimStamina - drainRate * dt);

                    if (postWater.distBlocks > 16.5 || p.swimStamina <= 0) {
                        // Critical High-Seas Danger (> 16.5 blocks / > 1050px offshore or exhausted): Shark Attack!
                        p.deepSeaDanger = 2;
                        p._seaWarnCd = (p._seaWarnCd || 0) - dt;
                        if (p._seaWarnCd <= 0) {
                            p._seaWarnCd = 3.2;
                            if (typeof this.showCenterBanner === "function") {
                                this.showCenterBanner("🦈 HIGH SEAS DANGER — SHARK ATTACK IN DEEP OCEAN! SWIM BACK TO SHORE!", 2.6);
                            }
                        }
                        this.damagePlayer((12.0 + Math.min(16.0, overDepth * 2.2)) * dt);
                        p._sharkBiteCd = (p._sharkBiteCd || 0) - dt;
                        if (p._sharkBiteCd <= 0) {
                            p._sharkBiteCd = 2.4;
                            p.sharkLungeTimer = 0.55;
                            if (this.audio && typeof this.audio.playWaterSplash === "function") {
                                this.audio.playWaterSplash(1.0);
                            }
                            this.addFloatingText(p.x, p.y - 24, "🦈 SHARK BITE!", "#ff1e38");
                            this.damagePlayer(18);
                        }
                    } else {
                        // Offshore Warning Zone (11.5 .. 16.5 blocks from shore): Shark circling & riptide draining stamina
                        p.deepSeaDanger = 1;
                        p._seaWarnCd = (p._seaWarnCd || 0) - dt;
                        if (p._seaWarnCd <= 0) {
                            p._seaWarnCd = 3.6;
                            if (typeof this.showCenterBanner === "function") {
                                this.showCenterBanner("⚠️ DEEP OCEAN WARNING — STRONG RIPTIDE & SHARK WATERS! DO NOT SWIM TOO FAR!", 2.6);
                            }
                        }
                    }
                }
                if ((p.sharkLungeTimer || 0) > 0) {
                    p.sharkLungeTimer = Math.max(0, p.sharkLungeTimer - dt);
                }



                // Direct physical contact entry: walk right up to touch the building door / threshold step!

                if (Array.isArray(this.map.interiors)) {

                    if (this.doorRearmBlock) {

                        if (!this.isTouchingInteriorDoor(this.doorRearmBlock, p.x, p.y)) {

                            this.doorRearmBlock = null;

                        }

                    } else if (this.interiorCooldown <= 0) {

                        for (const intr of this.map.interiors) {

                            if (this.isTouchingInteriorDoor(intr, p.x, p.y)) {

                                this.enterInterior(intr);

                                return;

                            }

                        }

                    }

                }

            }



            // On-Foot, Driver & Multi-Player Passenger 360° Drive-By / Tank Co-Op Turret Shooting:

            const shotAngle = (this.input.joyActive && typeof this.input.joyAngle === "number")

                ? this.input.joyAngle

                : (useMouseAim ? mouseAimAngle : p.angle);

            p.shootCooldown -= dt;

            if ((p.playerCombatTimer || 0) > 0) {

                p.playerCombatTimer = Math.max(0, p.playerCombatTimer - dt);

            }

            if (this.input.shoot && p.shootCooldown <= 0 && !p.isSwimming) {

                const v = p.inVehicle;

                const mySeat = p.seatIndex || 0;

                if (v && v.specKey === "FIRE_TRUCK" && mySeat === 0) {
                    // Rooftop High-Pressure Deck-Gun Water Monitor (~375px = 31m reach, hydraulic slew inertia & velocity inheritance!)
                    p.shootCooldown = 0.040;
                    const prevCannonAng = typeof v._cannonAngle === "number" ? v._cannonAngle : (v.angle || 0);
                    const angErr = Math.atan2(Math.sin(shotAngle - prevCannonAng), Math.cos(shotAngle - prevCannonAng));
                    const maxSlewStep = 6.4 * 0.040;
                    const cannonAng = prevCannonAng + Math.max(-maxSlewStep, Math.min(maxSlewStep, angErr));
                    v._cannonAngle = cannonAng;
                    v._sprayingCannonTimer = 0.16;
                    const vCos = Math.cos(v.angle || 0), vSin = Math.sin(v.angle || 0);
                    const nozX = v.x + vCos * 22.0 + Math.cos(cannonAng) * 12.0;
                    const nozY = v.y + vSin * 22.0 + Math.sin(cannonAng) * 12.0;

                    // Determine desired elevation/range: full 375px open reach, or depress nozzle onto the closest vehicle/burning-ped target in the stream cone
                    let aimReachPx = 375;
                    let hitVehTarget = null;
                    for (const ov of this.vehicles) {
                        if (!ov || ov === v) continue;
                        const dx = ov.x - nozX;
                        const dy = ov.y - nozY;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 385) continue;
                        const aDiff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - cannonAng), Math.cos(Math.atan2(dy, dx) - cannonAng)));
                        if (aDiff <= 0.24 && dist < aimReachPx) {
                            aimReachPx = Math.max(28, dist - 8);
                            hitVehTarget = ov;
                        }
                    }
                    for (const pd of this.peds) {
                        if (!pd || pd.dead) continue;
                        const dx = pd.x - nozX;
                        const dy = pd.y - nozY;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 375) continue;
                        const aDiff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - cannonAng), Math.cos(Math.atan2(dy, dx) - cannonAng)));
                        if (aDiff <= 0.22 && dist < aimReachPx) {
                            aimReachPx = Math.max(24, dist);
                        }
                    }
                    this.emitPressurizedWaterJet(nozX, nozY, cannonAng, aimReachPx, true, hitVehTarget, {
                        carrierVx: (v.vx || 0) * 0.45,
                        carrierVy: (v.vy || 0) * 0.45,
                        sourceVeh: v,
                        fromPlayer: true
                    });
                } else {

                const occList = (v && typeof v.getOccupiedSeats === "function") ? v.getOccupiedSeats(this) : [];

                const hasRemoteGunner = occList.some((o) => !o.isLocal && o.seat === 1);

                const controlsTankTurret = Boolean(v && v.hasTurret && (mySeat === 1 || (mySeat === 0 && !hasRemoteGunner)));

                let activeWep = p.weapon;

                if (controlsTankTurret) {

                    activeWep = "ROCKET";

                } else if (v) {

                    if (mySeat > 0 && p.weapon !== "FIST" && (p.ammo[p.weapon] || 0) > 0) {

                        // Passengers in Seat >= 1 can fire ANY equipped ranged weapon in 360°!

                        activeWep = p.weapon;

                    } else {

                        activeWep = (p.ammo.UZI > 0) ? "UZI" : "PISTOL";

                    }

                }

                const spec = WEAPON_SPECS[activeWep] || WEAPON_SPECS.PISTOL;

                const hasFrenzyUnlimited = this.killFrenzy && this.killFrenzy.weapon === activeWep;



                if (controlsTankTurret || hasFrenzyUnlimited || p.ammo[activeWep] > 0) {

                    if (!controlsTankTurret && !hasFrenzyUnlimited && p.ammo[activeWep] !== Infinity) {

                        p.ammo[activeWep]--;

                    }

                    p.shootCooldown = controlsTankTurret ? 0.85 : spec.fireRate;

                    if (!spec.isMelee) {

                        p.muzzleTimer = 0.08;

                        p.weaponDrawnTimer = 0.45;

                        p.playerCombatTimer = 3.5;

                    } else {

                        p.muzzleTimer = 0;

                        p.weaponDrawnTimer = 0;

                    }

                    const fireAng = controlsTankTurret ? (typeof v.turretAngle === "number" ? v.turretAngle : shotAngle) : shotAngle;
                    if (controlsTankTurret && v) {
                        v.turretRecoil = 1.0;
                    }

                    this.fireWeapon(p.x, p.y, fireAng, activeWep, true, false, null, controlsTankTurret ? "TANK_CANNON" : null);

                    this.updateHud();

                } else if (!p.inVehicle) {

                    p.weapon = "FIST";

                    this.updateHud();

                }

                }

            }

        }



        // 2. Partner AI removed (solo & multiplayer only)

        if (!this.activeInterior) {
            this.updateGraffitiTagging(dt);
        }



        // 3. Update All Vehicles & Collisions

        if ((p.hitByCarCooldown || 0) > 0) {

            p.hitByCarCooldown = Math.max(0, p.hitByCarCooldown - dt);

        }

        // Pre-filter active priority siren vehicles, hazard/speeding vehicles, and available taxis once per frame
        // AND build the 128x128 (256px cell) vehicle & pedestrian spatial grids so AI radar & collisions never scan 580+ distant entities!
        this.rebuildVehicleSpatialGrid();
        if (!this._pedGridHead || this._pedGridLastLen !== this.peds.length) {
            this.rebuildPedSpatialGrid();
        this._pedGridLastLen = this.peds.length;
        }
        const hazardVehicles = this._hazardVehicles || (this._hazardVehicles = []);
        const prioritySirenVehicles = this._prioritySirenVehicles || (this._prioritySirenVehicles = []);
        const activeTaxis = this._activeTaxis || (this._activeTaxis = []);
        const movingOrCrosswalkVehicles = this._movingOrCrosswalkVehicles || (this._movingOrCrosswalkVehicles = []);
        const armoredCashTrucks = this._armoredCashTrucks || (this._armoredCashTrucks = []);
        const criminalVehicles = this._criminalVehicles || (this._criminalVehicles = []);
        const copVehicles = this._copVehicles || (this._copVehicles = []);
        const activeSimVehicles = this._activeSimVehicles || (this._activeSimVehicles = []);
        hazardVehicles.length = 0;
        prioritySirenVehicles.length = 0;
        activeTaxis.length = 0;
        movingOrCrosswalkVehicles.length = 0;
        armoredCashTrucks.length = 0;
        criminalVehicles.length = 0;
        copVehicles.length = 0;
        activeSimVehicles.length = 0;
        for (let vi = 0; vi < this.vehicles.length; vi++) {
            const sv = this.vehicles[vi];
            if (!sv) continue;
            if (sv.isArmoredCashTruck) {
                armoredCashTrucks.push(sv);
            }
            if (!sv.destroyed && sv.driver === "AI_CRIMINAL") {
                criminalVehicles.push(sv);
            }
            if (!sv.destroyed && sv.isPolice && sv.driver === "AI_COP") {
                copVehicles.push(sv);
            }
            const svSpd = Math.abs(sv.speed || 0);
            const isBurningHazard = Boolean(
                (sv.burnTimer || 0) > 0 ||
                (!sv.destroyed && typeof sv.hp === "number" && sv.hp <= 42 && sv.specKey !== "BMX_BIKE" && sv.specKey !== "E_SCOOTER")
            );
            if (isBurningHazard || (!sv.destroyed && (svSpd >= 58 || (sv.sirenActive && svSpd >= 24)))) {
                hazardVehicles.push(sv);
            }
            if (!sv.destroyed && (sv.sirenActive || (sv.driver === "AI_TOW" && (sv.towTarget || sv.towingVehicle)))) {
                prioritySirenVehicles.push(sv);
            }
            if (!sv.destroyed && sv.specKey === "VICE_CAB" && sv.driver === "AI_TRAFFIC") {
                activeTaxis.push(sv);
            }
            if (!sv.destroyed && (svSpd > 14 || sv.sirenActive)) {
                movingOrCrosswalkVehicles.push(sv);
            }
            // Fast-sleep completely stationary intact unoccupied parked vehicles so we don't call Vehicle.update() on 480+ parked cars!
            if (
                !sv.driver &&
                !sv.destroyed &&
                !sv.towedByTruck &&
                !sv.bombArmed &&
                !(sv.chainExplodeTimer > 0) &&
                !(sv.burnTimer > 0) &&
                sv.hp > 30 &&
                !(sv.doorOpenTimer > 0) &&
                !(sv.crashCooldown > 0) &&
                !(sv.stuntAirTimer > 0) &&
                svSpd < 0.05 &&
                Math.abs(sv.vx || 0) < 0.05 &&
                Math.abs(sv.vy || 0) < 0.05 &&
                Math.abs(sv.angularVelocity || 0) < 0.01
            ) {
                if (!sv.isStaticParked && !sv.isCurbParked && !sv.isEstateCar) {
                    sv.abandonedTimer = (sv.abandonedTimer || 0) + dt;
                }
                sv._activePairIdx = -1;
                continue;
            }
            // Fast-skip distant Dedicated Server autonomous vehicles (> 1450px off-screen); their positions are updated in O(1) by server_sim!
            if (
                sv._serverDriven &&
                !sv._worldModified &&
                sv.driver !== "PLAYER" &&
                (Math.abs(sv.x - p.x) > 1450 || Math.abs(sv.y - p.y) > 1450)
            ) {
                sv._activePairIdx = -1;
                continue;
            }
            activeSimVehicles.push(sv);
        }

        this._vehTickFrame = ((this._vehTickFrame || 0) + 1) & 3;
        for (let vi = 0; vi < activeSimVehicles.length; vi++) {
            const v = activeSimVehicles[vi];
            if (!v) continue;

            // Performance Optimization:
            // Distant calm AI_TRAFFIC vehicles (> 1350px off-screen in other districts) step at 15 Hz (every 4th frame with dt * 4)
            // while all nearby vehicles (<= 1350px) and all PLAYER / REMOTE / AI_COP / AI_EMERGENCY / AI_TOW / AI_CRIMINAL units run at full 60 FPS!
            const isNearPlayer = Math.abs(v.x - p.x) <= 1350 && Math.abs(v.y - p.y) <= 1350;
            const isFarCalmTraffic = !isNearPlayer && v.driver === "AI_TRAFFIC" && !v.sirenActive && !(v.burnTimer > 0) && !(v.aiPanicTimer > 0);
            if (isFarCalmTraffic && ((vi + this._vehTickFrame) & 3) !== 0) {
                continue;
            }
            const vehDt = isFarCalmTraffic ? Math.min(0.12, dt * 4) : dt;

            v.update(vehDt, this.input, this.map, this);

            if (!v.driver && Math.abs(v.speed || 0) < 0.1 && Math.abs(v.vx || 0) < 0.1 && Math.abs(v.vy || 0) < 0.1) {
                continue;
            }



            // Check player vehicle (or fleeing bandit car) hitting pedestrians:
            // AI traffic, Police cruisers, Ambulances, Fire Engines, and Tow Trucks NEVER run over or kill pedestrians/responders!
            // Instead, nearby AI vehicles gently push pedestrians aside onto the sidewalk so AI cars never create corpse pileups!

            const vSpeed = Math.hypot(v.vx, v.vy);

            const isNonLethalWheeler = (v.specKey === "E_SCOOTER" || v.specKey === "BMX_BIKE");

            const isLethalDriver = !v.destroyed && (v.driver === "PLAYER" || v.driver === "AI_CRIMINAL");

            const pHead = this._pedGridHead;
            const pNext = this._pedGridNext;
            if (!v.destroyed && v.driver && vSpeed > 14 && Math.abs(v.x - p.x) < 680 && Math.abs(v.y - p.y) < 520 && pHead && pNext) {
                const vCos = Math.cos(v.angle || 0);
                const vSin = Math.sin(v.angle || 0);
                const rCos = -vSin;
                const rSin = vCos;
                const cx0 = Math.max(0, (v.x - 76) >> 8);
                const cx1 = Math.min(127, (v.x + 76) >> 8);
                const cy0 = Math.max(0, (v.y - 76) >> 8);
                const cy1 = Math.min(127, (v.y + 76) >> 8);
                for (let cy = cy0; cy <= cy1; cy++) {
                    const rowOff = cy << 7;
                    for (let cx = cx0; cx <= cx1; cx++) {
                        for (let pi = pHead[rowOff | cx]; pi !== -1; pi = pNext[pi]) {
                            const ped = this.peds[pi];
                            if (!ped || ped.dead) continue;
                            const pdx = ped.x - v.x;
                            if (pdx >= 76 || pdx <= -76) continue;
                            const pdy = ped.y - v.y;
                            if (pdy >= 76 || pdy <= -76) continue;
                            if (v.z !== undefined && ped.z !== undefined && Math.abs(v.z - ped.z) > 0.24) continue;
                            const dSq = pdx * pdx + pdy * pdy;
                            if (!isLethalDriver && dSq < 576) {
                                const sideSign = (pdx * rCos + pdy * rSin) >= 0 ? 1 : -1;
                                let nx = ped.x + rCos * sideSign * 14;
                                let ny = ped.y + rSin * sideSign * 14;
                                if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                                    const kc = this.map.resolveCircleBuildingCollision(nx, ny, 8, ped.z || 2.0, false);
                                    nx = kc.x;
                                    ny = kc.y;
                                }
                                if (!this.map || !this.map.isWaterAtPixel || !this.map.isWaterAtPixel(nx, ny)) {
                                    ped.x = nx;
                                    ped.y = ny;
                                }
                            } else if (vSpeed > 85 && ped.kind === "CIVILIAN" && (ped.dodgeTimer || 0) <= 0 && dSq > 625 && dSq < 5400) {
                                const fwd = pdx * vCos + pdy * vSin;
                                const lat = pdx * rCos + pdy * rSin;
                                if (fwd > 22 && fwd < 72 && Math.abs(lat) < 22) {
                                    const sideSign = lat >= 0 ? 1 : -1;
                                    ped.dodgeTimer = 0.55;
                                    ped.panicTimer = Math.max(ped.panicTimer || 0, 2.5);
                                    ped.isCrossingRoad = false;
                                    ped.angle = Math.atan2(rSin * sideSign, rCos * sideSign);
                                    let nx = ped.x + rCos * sideSign * 9;
                                    let ny = ped.y + rSin * sideSign * 9;
                                    if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                                        const kc = this.map.resolveCircleBuildingCollision(nx, ny, 8, ped.z || 2.0, false);
                                        nx = kc.x;
                                        ny = kc.y;
                                    }
                                    if (!this.map || !this.map.isWaterAtPixel || !this.map.isWaterAtPixel(nx, ny)) {
                                        ped.x = nx;
                                        ped.y = ny;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (isLethalDriver && vSpeed > 28 && pHead && pNext) {
                const cx0 = Math.max(0, (v.x - 28) >> 8);
                const cx1 = Math.min(127, (v.x + 28) >> 8);
                const cy0 = Math.max(0, (v.y - 28) >> 8);
                const cy1 = Math.min(127, (v.y + 28) >> 8);
                for (let cy = cy0; cy <= cy1; cy++) {
                    const rowOff = cy << 7;
                    for (let cx = cx0; cx <= cx1; cx++) {
                        for (let pi = pHead[rowOff | cx]; pi !== -1; pi = pNext[pi]) {
                            const ped = this.peds[pi];
                            if (!ped || ped.dead) continue;

                            const pdx = ped.x - v.x;
                            if (pdx >= 25 || pdx <= -25) continue;
                            const pdy = ped.y - v.y;
                            if (pdy >= 25 || pdy <= -25) continue;
                            if (v.z !== undefined && ped.z !== undefined && Math.abs(v.z - ped.z) > 0.24) continue;

                            if (ped.kind === "COP" && v.driver === "AI_COP") continue;

                            if (pdx * pdx + pdy * pdy < 625) {
                                if (isNonLethalWheeler) {
                                    if ((ped.stunnedTimer || 0) <= 0) {
                                        ped.stunnedTimer = 1.55;
                                        ped.panicTimer = 4.5;
                                        let kx = ped.x + (v.vx / Math.max(1, vSpeed)) * 18;
                                        let ky = ped.y + (v.vy / Math.max(1, vSpeed)) * 18;
                                        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                                            const kc = this.map.resolveCircleBuildingCollision(kx, ky, 8, ped.z || 2.0, false);
                                            kx = kc.x;
                                            ky = kc.y;
                                        }
                                        if (!this.map || !this.map.isWaterAtPixel || !this.map.isWaterAtPixel(kx, ky)) {
                                            ped.x = kx;
                                            ped.y = ky;
                                        }
                                        v.vx *= 0.84;
                                        v.vy *= 0.84;
                                        v.speed *= 0.84;
                                        if (v.driver === "PLAYER") {
                                            if (this.audio && typeof this.audio.playPedScream === "function") {
                                                this.audio.playPedScream();
                                            }
                                            this.addFloatingText(ped.x, ped.y - 22, "💫 KNOCKOUT!", "#38bdf8");
                                        }
                                    }
                                } else if (ped.kind === "COP" && !v.crushesCars) {
                                    if ((ped.stunnedTimer || 0) <= 0) {
                                        ped.hp -= vSpeed * 0.45;
                                        ped.stunnedTimer = 0.55;
                                        let kx = ped.x + (v.vx / Math.max(1, vSpeed)) * 16;
                                        let ky = ped.y + (v.vy / Math.max(1, vSpeed)) * 16;
                                        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                                            const kc = this.map.resolveCircleBuildingCollision(kx, ky, 8, ped.z || 2.0, false);
                                            kx = kc.x;
                                            ky = kc.y;
                                        }
                                        if (!this.map || !this.map.isWaterAtPixel || !this.map.isWaterAtPixel(kx, ky)) {
                                            ped.x = kx;
                                            ped.y = ky;
                                        }
                                        this.spawnParticle(ped.x, ped.y, "BLOOD");
                                        if (ped.hp <= 0) {
                                            this.killPed(ped, v.driver === "PLAYER");
                                        }
                                    }
                                } else if (vSpeed > 68 || (v.driver !== "PLAYER" && vSpeed > 110)) {
                                    this.killPed(ped, v.driver === "PLAYER");
                                } else if ((ped.stunnedTimer || 0) <= 0) {
                                    ped.stunnedTimer = 1.15;
                                    ped.panicTimer = 4.5;
                                    let kx = ped.x + (v.vx / Math.max(1, vSpeed)) * 14;
                                    let ky = ped.y + (v.vy / Math.max(1, vSpeed)) * 14;
                                    if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                                        const kc = this.map.resolveCircleBuildingCollision(kx, ky, 8, ped.z || 2.0, false);
                                        kx = kc.x;
                                        ky = kc.y;
                                    }
                                    ped.x = kx;
                                    ped.y = ky;
                                }
                            }
                        }
                    }
                }

                if (v.driver === "PLAYER" && vSpeed > 45 && this.map.crates) {
                    for (let ci = 0; ci < this.map.crates.length; ci++) {
                        const cr = this.map.crates[ci];
                        if (!cr.smashed && Math.abs(cr.x - v.x) < 30 && Math.abs(cr.y - v.y) < 30 && Math.hypot(cr.x - v.x, cr.y - v.y) < 30) {
                            this.smashCrate(cr);
                        }
                    }
                }

                // Allow cars, trucks, vans, buses & tanks (NOT motorcycles, bicycles, or e-scooters) to smash sidewalk payphone booths!
                const isTwoWheeler = Boolean(
                    isNonLethalWheeler ||
                    v.isMotorcycle ||
                    v.specKey === "STREET_BIKE" ||
                    v.specKey === "HARLEY_BIKE"
                );
                const isNearPlayerCamera = (v.driver === "PLAYER") || (Math.abs(v.x - p.x) < 920 && Math.abs(v.y - p.y) < 720);
                if (isNearPlayerCamera) {
                    if (!isTwoWheeler && vSpeed > 32 && this.missions && Array.isArray(this.missions.payphones)) {
                        const bOff = (v.w || 48) * 0.32;
                        const noseX = v.x + Math.cos(v.angle || 0) * bOff;
                        const noseY = v.y + Math.sin(v.angle || 0) * bOff;
                        for (const ph of this.missions.payphones) {
                            if (ph.isVirtualPhone || (ph.wipeoutTimer || 0) > 0) continue;
                            if (Math.abs(ph.x - v.x) > 54 || Math.abs(ph.y - v.y) > 54) continue;
                            const dPh = Math.min(Math.hypot(ph.x - v.x, ph.y - v.y), Math.hypot(ph.x - noseX, ph.y - noseY));
                            if (dPh < 26) {
                                ph.wipeoutTimer = 45.0;
                                ph.knockAng = Math.atan2(ph.y - v.y, ph.x - v.x);
                                if (this.audio && Math.hypot(ph.x - p.x, ph.y - p.y) < 550) {
                                    if (typeof this.audio.playCrateSmash === "function") this.audio.playCrateSmash();
                                    if (typeof this.audio.playCarCrash === "function") this.audio.playCarCrash(0.75);
                                }
                                const shardColors = ["#38bdf8", "#e0f2fe", "#94a3b8", "#facc15"];
                                for (let si = 0; si < 16; si++) {
                                    const ang = ph.knockAng + (Math.random() - 0.5) * 1.8;
                                    const spd = 50 + Math.random() * 125;
                                    this.particles.push({
                                        x: ph.x + (Math.random() - 0.5) * 8,
                                        y: ph.y + (Math.random() - 0.5) * 8,
                                        vx: Math.cos(ang) * spd,
                                        vy: Math.sin(ang) * spd,
                                        size: 3.5 + Math.random() * 4.0,
                                        color: shardColors[si % shardColors.length],
                                        life: 0.52,
                                        maxLife: 0.52
                                    });
                                }
                                if (v.driver === "PLAYER") {
                                    this.addFloatingText(ph.x, ph.y - 20, "☎️ PAYPHONE SMASHED!", "#38bdf8");
                                }
                            }
                        }
                    }

                    // Allow vehicles to plow through open-air street/beach animations, sunbathers, and parasols (non-lethal wheelers knock out instead of killing)!
                    if (
                        v._lastWipeoutX === undefined ||
                        Math.abs(v.x - v._lastWipeoutX) >= 6 ||
                        Math.abs(v.y - v._lastWipeoutY) >= 6
                    ) {
                        v._lastWipeoutX = v.x;
                        v._lastWipeoutY = v.y;
                        this.checkAndWipeoutLivingEvents(v.x, v.y, 28, v.driver === "PLAYER", true, isNonLethalWheeler);
                    }
                }

            }



            // Speeding AI / Police vehicles can knock down Lucia on foot unless she jumps over them ([SPACE])!

            if (

                !v.destroyed &&

                v.driver !== "PLAYER" &&

                !p.inVehicle &&

                !p.dead &&

                !this.activeInterior &&

                (p.jumpTimer || 0) <= 0 &&

                (p.slideCarTimer || 0) <= 0 &&

                (p.hitByCarCooldown || 0) <= 0 &&

                vSpeed > 65

            ) {

                if ((v.z === undefined || p.z === undefined || Math.abs(v.z - p.z) <= 0.24) && Math.hypot(p.x - v.x, p.y - v.y) < 22) {

                    p.hitByCarCooldown = 0.85;
                    p._velX = 0;
                    p._velY = 0;

                    let nx = p.x + (v.vx / vSpeed) * 18;
                    let ny = p.y + (v.vy / vSpeed) * 18;
                    if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                        const pCol = this.map.resolveCircleBuildingCollision(nx, ny, 11, p.z || 2.0, false, Boolean(p.isSwimming));
                        nx = pCol.x;
                        ny = pCol.y;
                    }
                    p.x = nx;
                    p.y = ny;

                    if (isNonLethalWheeler) {
                        p.slideCarTimer = 0.42;
                        if (p.hp > 1) {
                            this.damagePlayer(Math.min(p.hp - 1, 6));
                        }
                    } else {
                        this.damagePlayer(Math.min(26, vSpeed * 0.08));
                    }

                    this.spawnParticle(p.x, p.y, "SPARK");

                }

            }

        }



        // 2-Axle Rectangular Vehicle-to-Vehicle Collisions (Front/Rear Bumper Discs + PIT Spin Torque!)
        // Rebuild 256px spatial grid after movement and query only the 3x3 cells around each active vehicle!
        this.rebuildVehicleSpatialGrid();
        const vHead = this._vehGridHead;
        const vNext = this._vehGridNext;
        if (!this._activePairVehicles) this._activePairVehicles = [];
        const activeVehs = this._activePairVehicles;
        activeVehs.length = 0;
        for (let i = 0; i < activeSimVehicles.length; i++) {
            const v = activeSimVehicles[i];
            const isMovingOrDriven = Boolean(v.driver || Math.abs(v.speed || 0) > 0.05 || Math.abs(v.vx || 0) > 0.05 || Math.abs(v.vy || 0) > 0.05);
            const isNearOrPriority = (Math.abs(v.x - p.x) <= 1450 && Math.abs(v.y - p.y) <= 1450) || v.driver === "PLAYER" || v.driver === "REMOTE" || v.driver === "AI_COP" || v.driver === "AI_EMERGENCY" || v.driver === "AI_TOW" || v.driver === "AI_CRIMINAL";
            if (isMovingOrDriven && isNearOrPriority) {
                v._activePairIdx = activeVehs.length;
                activeVehs.push(v);
            } else {
                v._activePairIdx = -1;
            }
        }

        for (let ai = 0; ai < activeVehs.length; ai++) {

            const a = activeVehs[ai];
            const aRad = Math.max(10, Math.min(16, (a.h || 28) * 0.45));
            const aHalfL = Math.max(0, (a.w || 62) * 0.50 - aRad);
            const aCos = Math.cos(a.angle), aSin = Math.sin(a.angle);
            const ax0 = a.x + aCos * aHalfL, ay0 = a.y + aSin * aHalfL;
            const ax1 = a.x, ay1 = a.y;
            const ax2 = a.x - aCos * aHalfL, ay2 = a.y - aSin * aHalfL;
            const gx0 = Math.max(0, (a.x - 110) >> 8);
            const gx1 = Math.min(127, (a.x + 110) >> 8);
            const gy0 = Math.max(0, (a.y - 110) >> 8);
            const gy1 = Math.min(127, (a.y + 110) >> 8);

            for (let gy = gy0; gy <= gy1; gy++) {
                const rowOff = gy << 7;
                for (let gx = gx0; gx <= gx1; gx++) {
                    for (let j = vHead[rowOff | gx]; j !== -1; j = vNext[j]) {

                const b = this.vehicles[j];
                if (a === b || (b._activePairIdx >= 0 && b._activePairIdx <= ai)) continue;

                const maxReach = ((a.w || 62) + (b.w || 62)) * 0.52 + 16;
                if (Math.abs(b.x - a.x) > maxReach || Math.abs(b.y - a.y) > maxReach) continue;

                if (Boolean(a.waterOnly) !== Boolean(b.waterOnly)) continue;

                if (a.z !== undefined && b.z !== undefined && Math.abs(a.z - b.z) > 0.24) continue;

                if (a.towingVehicle === b || b.towingVehicle === a || a.towTarget === b || b.towTarget === a) continue;

                const bRad = Math.max(10, Math.min(16, (b.h || 28) * 0.45));

                const bHalfL = Math.max(0, (b.w || 62) * 0.50 - bRad);

                const minDist = aRad + bRad;
                const minDistSq = minDist * minDist;

                const bCos = Math.cos(b.angle), bSin = Math.sin(b.angle);
                const bx0 = b.x + bCos * bHalfL, by0 = b.y + bSin * bHalfL;
                const bx1 = b.x, by1 = b.y;
                const bx2 = b.x - bCos * bHalfL, by2 = b.y - bSin * bHalfL;

                let bestOverlap = 0;

                let bestNx = 0, bestNy = 0;

                let hitALever = 0, hitBLever = 0;

                for (let paIdx = 0; paIdx < 3; paIdx++) {
                    const pax = paIdx === 0 ? ax0 : (paIdx === 1 ? ax1 : ax2);
                    const pay = paIdx === 0 ? ay0 : (paIdx === 1 ? ay1 : ay2);
                    const paLev = paIdx === 0 ? 1 : (paIdx === 1 ? 0 : -1);
                    for (let pbIdx = 0; pbIdx < 3; pbIdx++) {
                        const pbx = pbIdx === 0 ? bx0 : (pbIdx === 1 ? bx1 : bx2);
                        const pby = pbIdx === 0 ? by0 : (pbIdx === 1 ? by1 : by2);
                        const dx = pbx - pax;
                        const dy = pby - pay;
                        const d2 = dx * dx + dy * dy;
                        if (d2 > 0 && d2 < minDistSq) {
                            const d = Math.sqrt(d2);
                            if ((minDist - d) > bestOverlap) {
                                bestOverlap = minDist - d;
                                bestNx = dx / d;
                                bestNy = dy / d;
                                hitALever = paLev;
                                hitBLever = pbIdx === 0 ? 1 : (pbIdx === 1 ? 0 : -1);
                            }
                        }
                    }
                }

                if (bestOverlap > 0) {
                    const clampShovedVehToWorld = (veh, nx, ny) => {
                        if (!veh || !this.map) {
                            if (veh) { veh.x = nx; veh.y = ny; }
                            return;
                        }
                        if (!veh.waterOnly && !veh.amphibious && veh.specKey !== "AIRBOAT" && this.map.isWaterAtPixel && this.map.isWaterAtPixel(nx, ny)) {
                            return;
                        }
                        if (veh.driver === "AI_TRAFFIC" && this.map.getGroundTypeAt && this.map.getGroundTypeAt(veh.x, veh.y) === GROUND_TYPE.ROAD && this.map.getGroundTypeAt(nx, ny) !== GROUND_TYPE.ROAD) {
                            return;
                        }
                        const vRad = Math.max(10, Math.min(15, (veh.h || 28) * 0.44));
                        if (typeof this.map.resolveCircleBuildingCollision === "function") {
                            const col = this.map.resolveCircleBuildingCollision(nx, ny, vRad, veh.z || 2.0, Boolean(veh.waterOnly || veh.amphibious || veh.specKey === "AIRBOAT"));
                            veh.x = col.x;
                            veh.y = col.y;
                        } else {
                            veh.x = nx;
                            veh.y = ny;
                        }
                    };

                    // Panzer Tank rams: the 50-ton hull shoves the other vehicle aside and dents it according to
                    // ramming speed. A slow nudge only pushes & dents; a full-speed ram sets the car on fire.
                    // (The car only blows up after several rams or a very fast hit, never on a simple contact.)
                    if ((a.crushesCars && !b.crushesCars) || (b.crushesCars && !a.crushesCars)) {

                        const tank = a.crushesCars ? a : b;

                        const victim = tank === a ? b : a;

                        const sgn = tank === a ? 1 : -1; // bestN points from a to b

                        // The tank doesn't budge: the victim takes the whole separation
                        clampShovedVehToWorld(
                            victim,
                            victim.x + bestNx * bestOverlap * 1.05 * sgn,
                            victim.y + bestNy * bestOverlap * 1.05 * sgn
                        );

                        const tankSpd = Math.hypot(tank.vx || 0, tank.vy || 0);

                        const closing = ((tank.vx || 0) - (victim.vx || 0)) * bestNx * sgn + ((tank.vy || 0) - (victim.vy || 0)) * bestNy * sgn;

                        if (closing > 0) {

                            const kickMul = victim.destroyed ? 0.6 : 0.85;

                            victim.vx = (victim.vx || 0) + bestNx * sgn * closing * kickMul;

                            victim.vy = (victim.vy || 0) + bestNy * sgn * closing * kickMul;

                            if (victim.destroyed) victim.angularVelocity = (victim.angularVelocity || 0) + (Math.random() - 0.5) * 2.5;

                        }

                        if (!victim.destroyed && tankSpd > 35 && closing > 20 && (victim.crashCooldown || 0) <= 0) {

                            victim.crashCooldown = 0.45;

                            if (tank.driver === "PLAYER") victim.damagedByPlayer = true;

                            const ramDmg = Math.max(0, closing - 20) * 0.9;

                            if (typeof victim.receiveImpactDamage === "function") victim.receiveImpactDamage(ramDmg, tank.x, tank.y);

                            else victim.hp -= ramDmg;

                            if (typeof victim.triggerPanic === "function") victim.triggerPanic(8.0);

                            this.spawnParticle((tank.x + victim.x) * 0.5, (tank.y + victim.y) * 0.5, "SPARK");

                            if (this.audio && Math.hypot(victim.x - p.x, victim.y - p.y) < 480) {

                                this.audio.playCarCrash(Math.min(1.5, ramDmg / 60));

                            }

                        }

                        continue;

                    }



                    // Only apply violent rigid-body PIT spin & impact damage when a human player is involved (or police vs criminal getaway car).
                    // AI-vs-AI pairs (including Police, Ambulance, Fire Truck, Tow Truck, and Civilian Traffic) resolve cleanly along their lanes
                    // so emergency vehicles NEVER spin buses sideways or create multi-car pileups!
                    if (a.driver === "PLAYER" || b.driver === "PLAYER") {
                        a._worldModified = true;
                        a._serverDriven = false;
                        b._worldModified = true;
                        b._serverDriven = false;
                    }
                    const involvesPlayerOrActiveCop =
                        a.driver === "PLAYER" ||
                        b.driver === "PLAYER" ||
                        a.driver === "REMOTE" ||
                        b.driver === "REMOTE" ||
                        (!a.destroyed && !b.destroyed && (
                            (a.driver === "AI_COP" && b.driver === "AI_CRIMINAL") ||
                            (b.driver === "AI_COP" && a.driver === "AI_CRIMINAL")
                        ));



                    // Wrecks are dead weight: only a real ram by the player (or a hulk already sliding from a blast) moves them.
                    // AI traffic simply stops/steers around them and never bulldozes a carcass.
                    const aSpdW = Math.hypot(a.vx || 0, a.vy || 0);
                    const bSpdW = Math.hypot(b.vx || 0, b.vy || 0);
                    const liveCar = a.destroyed && !b.destroyed ? b : (b.destroyed && !a.destroyed ? a : null);
                    const wreckCar = liveCar ? (liveCar === a ? b : a) : null;
                    const wreckMovable = Boolean(
                        liveCar && (
                            (liveCar.driver === "PLAYER" && (liveCar === a ? aSpdW : bSpdW) > 60) ||
                            Math.hypot(wreckCar.vx || 0, wreckCar.vy || 0) > 15
                        )
                    );
                    const wreckShove = wreckMovable;
                    const slidingWrecks = a.destroyed && b.destroyed && (aSpdW > 15 || bSpdW > 15);

                    if ((!involvesPlayerOrActiveCop && !wreckShove && !slidingWrecks) || (a.destroyed && b.destroyed && !slidingWrecks)) {

                        // AI-vs-AI traffic: enforce clean longitudinal separation along each vehicle's driving axis
                        // so AI vehicles never overlap or phase through each other (in-lane or when turning/crossing)!

                        if (!a.destroyed && !b.destroyed) {

                            // Emergency Corridor Assist: ONLY when a MOVING emergency responder overtakes a SAME-DIRECTION civilian car,
                            // smoothly nudge the civilian car away within its safe lane margin (while still running separation below so hulls NEVER overlap!).
                            const aStationary = Boolean(!a.driver || a.deployedMedic || a._parkedAtFireScene);
                            const bStationary = Boolean(!b.driver || b.deployedMedic || b._parkedAtFireScene);
                            const aPriority = Boolean(!aStationary && (a.sirenActive || a.driver === "AI_COP" || a.driver === "AI_EMERGENCY" || a.driver === "AI_TOW"));
                            const bPriority = Boolean(!bStationary && (b.sirenActive || b.driver === "AI_COP" || b.driver === "AI_EMERGENCY" || b.driver === "AI_TOW"));
                            if (aPriority !== bPriority && Math.cos((a.angle || 0) - (b.angle || 0)) > 0.68) {
                                const civ = aPriority ? b : a;
                                const emg = aPriority ? a : b;
                                const emgSpd = Math.hypot(emg.vx || 0, emg.vy || 0);
                                if (civ.driver === "AI_TRAFFIC" && emgSpd > 16) {
                                    const cRx = -Math.sin(civ.angle || 0);
                                    const cRy = Math.cos(civ.angle || 0);
                                    const awaySign = ((civ.x - emg.x) * cRx + (civ.y - emg.y) * cRy) >= -2 ? 1 : -1;
                                    civ.aiPullOverOffset = 13 * awaySign;
                                    civ.aiPullOverTimer = 1.8;
                                    const shiftStep = (bestOverlap * 0.55 + 1.0) * awaySign;
                                    const testCx = civ.x + cRx * shiftStep;
                                    const testCy = civ.y + cRy * shiftStep;
                                    if (
                                        this.map &&
                                        this.map.getGroundTypeAt &&
                                        this.map.getGroundTypeAt(testCx, testCy) === GROUND_TYPE.ROAD &&
                                        this.map.getGroundTypeAt(testCx + cRx * 12 * awaySign, testCy + cRy * 12 * awaySign) === GROUND_TYPE.ROAD
                                    ) {
                                        clampShovedVehToWorld(civ, testCx, testCy);
                                        emg.angularVelocity = 0;
                                        civ.angularVelocity = 0;
                                        continue;
                                    }
                                }
                            }

                            if (Math.cos(a.angle - b.angle) > 0.45 && aStationary === bStationary) {

                                const proj = (b.x - a.x) * aCos + (b.y - a.y) * aSin;

                                const rear = proj >= 0 ? a : b;

                                const front = proj >= 0 ? b : a;

                                const rCos = Math.cos(rear.angle);

                                const rSin = Math.sin(rear.angle);

                                const sep = bestOverlap + 2.0;

                                clampShovedVehToWorld(rear, rear.x - rCos * sep, rear.y - rSin * sep);

                                const frontSpd = Math.max(0, Math.hypot(front.vx, front.vy) * 0.85);

                                const rearSpd = Math.min(Math.hypot(rear.vx, rear.vy), frontSpd);

                                rear.vx = rCos * rearSpd;

                                rear.vy = rSin * rearSpd;

                                rear.speed = rearSpd;

                            } else {

                                // Crossing, turning, or stationary-responder AI pairs:
                                // Never shove a parked/deployed Ambulance or Fire Truck — back the moving AI vehicle cleanly along its own lane axis!
                                if (!aStationary && bStationary) {
                                    const sep = bestOverlap + 2.0;
                                    const toB = (b.x - a.x) * aCos + (b.y - a.y) * aSin;
                                    const backSign = toB >= 0 ? -1 : 1;
                                    clampShovedVehToWorld(a, a.x + aCos * sep * backSign, a.y + aSin * sep * backSign);
                                    a.vx = 0; a.vy = 0; a.speed = 0;
                                } else if (!bStationary && aStationary) {
                                    const sep = bestOverlap + 2.0;
                                    const toA = (a.x - b.x) * bCos + (a.y - b.y) * bSin;
                                    const backSign = toA >= 0 ? -1 : 1;
                                    clampShovedVehToWorld(b, b.x + bCos * sep * backSign, b.y + bSin * sep * backSign);
                                    b.vx = 0; b.vy = 0; b.speed = 0;
                                } else {
                                    const fwdA = (b.x - a.x) * aCos + (b.y - a.y) * aSin;
                                    const fwdB = (a.x - b.x) * bCos + (a.y - b.y) * bSin;
                                    const aTurn = Boolean(a.aiChosenDir && a.aiChosenDir.isTurn);
                                    const bTurn = Boolean(b.aiChosenDir && b.aiChosenDir.isTurn);
                                    let aWins = false;
                                    if (Boolean(a.sirenActive) !== Boolean(b.sirenActive)) {
                                        aWins = Boolean(a.sirenActive);
                                    } else if (aTurn !== bTurn) {
                                        aWins = !aTurn;
                                    } else if (Math.abs(fwdA - fwdB) > 6) {
                                        aWins = fwdA < fwdB;
                                    } else {
                                        aWins = String(a.id) > String(b.id);
                                    }
                                    const prioVeh = aWins ? a : b;
                                    const imp = aWins ? b : a;
                                    // Never push prioVeh backward against its forward motion! Only glide prioVeh laterally away from imp (<= 2.2px/frame on ROAD) so it clears cleanly!
                                    const pCos = Math.cos(prioVeh.angle);
                                    const pSin = Math.sin(prioVeh.angle);
                                    const pRx = -pSin;
                                    const pRy = pCos;
                                    const impSide = ((imp.x - prioVeh.x) * pRx + (imp.y - prioVeh.y) * pRy) >= 0 ? -1 : 1;
                                    const latStep = Math.min(2.2, bestOverlap * 0.45) * impSide;
                                    const testPx = prioVeh.x + pRx * latStep;
                                    const testPy = prioVeh.y + pRy * latStep;
                                    if (!this.map || !this.map.getGroundTypeAt || this.map.getGroundTypeAt(testPx + pRx * impSide * 11, testPy + pRy * impSide * 11) === GROUND_TYPE.ROAD) {
                                        clampShovedVehToWorld(prioVeh, testPx, testPy);
                                    }

                                    const iCos = Math.cos(imp.angle);
                                    const iSin = Math.sin(imp.angle);
                                    const sep = bestOverlap + 2.5;
                                    const toPrio = (prioVeh.x - imp.x) * iCos + (prioVeh.y - imp.y) * iSin;
                                    const backSign = toPrio >= 0 ? -1 : 1;
                                    clampShovedVehToWorld(imp, imp.x + iCos * sep * backSign, imp.y + iSin * sep * backSign);
                                    imp.vx = 0;
                                    imp.vy = 0;
                                    imp.speed = 0;
                                }

                            }

                        } else if (liveCar && !liveCar.destroyed) {
                            const lCos = Math.cos(liveCar.angle);
                            const lSin = Math.sin(liveCar.angle);
                            const sep = bestOverlap + 2.0;
                            const toWreck = (wreckCar.x - liveCar.x) * lCos + (wreckCar.y - liveCar.y) * lSin;
                            const backSign = toWreck >= 0 ? -1 : 1;
                            clampShovedVehToWorld(liveCar, liveCar.x + lCos * sep * backSign, liveCar.y + lSin * sep * backSign);
                            liveCar.vx = 0;
                            liveCar.vy = 0;
                            liveCar.speed = 0;
                        }

                        a.angularVelocity = 0;

                        b.angularVelocity = 0;

                        continue;

                    }



                    // Mass-based collision response: an e-scooter or bicycle can't shove a car, a car can't shove a bus,
                    // and a stationary wreck only gives way on a real ram / blast (otherwise it's an immovable hulk).
                    const massOf = (veh) => {
                        if (veh.crushesCars) return 12.0;
                        if (veh.specKey === "E_SCOOTER") return 0.10;
                        if (veh.specKey === "BMX_BIKE") return 0.14;
                        if (veh.isMotorcycle || veh.specKey === "JETSKI") return 0.30;
                        if (veh.specKey === "MICRO_KART") return 0.45;
                        const vw = veh.w || 48;
                        let m = vw >= 85 ? 3.0 : (vw >= 58 ? 1.8 : 1.0);
                        if (veh.destroyed) m *= 1.3;
                        return m;
                    };
                    const wreckFree = wreckMovable || slidingWrecks;
                    const invA = (a.destroyed && !wreckFree) ? 0 : 1 / massOf(a);
                    const invB = (b.destroyed && !wreckFree) ? 0 : 1 / massOf(b);
                    const invSum = invA + invB;

                    if (invSum > 0) {
                        const sepTotal = bestOverlap * 1.32;
                        if (invA > 0) {
                            clampShovedVehToWorld(a, a.x - bestNx * sepTotal * (invA / invSum), a.y - bestNy * sepTotal * (invA / invSum));
                        }
                        if (invB > 0) {
                            clampShovedVehToWorld(b, b.x + bestNx * sepTotal * (invB / invSum), b.y + bestNy * sepTotal * (invB / invSum));
                        }
                    }

                    // Realistic 2D impulse momentum transfer (restitution 0.36) + PIT maneuver angular spin
                    const rvx = b.vx - a.vx;
                    const rvy = b.vy - a.vy;
                    const normalVel = rvx * bestNx + rvy * bestNy;

                    if (normalVel < 0 && invSum > 0) {
                        const jImp = (1.36 * -normalVel) / invSum;
                        const dvA = jImp * invA;
                        const dvB = jImp * invB;
                        a.vx -= bestNx * dvA;
                        a.vy -= bestNy * dvA;
                        b.vx += bestNx * dvB;
                        b.vy += bestNy * dvB;

                        // Rotational torque on front/rear bumper impact (PIT maneuver spin!) — scaled by how hard each side was hit
                        const aCross = aCos * bestNy - aSin * bestNx;
                        const bCross = bCos * bestNy - bSin * bestNx;
                        if (!a.destroyed) a.angle -= hitALever * aCross * Math.min(0.22, dvA * 0.0014);
                        else if (invA > 0) a.angularVelocity = (a.angularVelocity || 0) - hitALever * aCross * Math.min(3.0, dvA * 0.018);
                        if (!b.destroyed) b.angle += hitBLever * bCross * Math.min(0.22, dvB * 0.0014);
                        else if (invB > 0) b.angularVelocity = (b.angularVelocity || 0) + hitBLever * bCross * Math.min(3.0, dvB * 0.018);
                    }



                    // Only trigger crash damage, sparks, horns & crash SFX on a true inward collision impulse (never when grinding/sliding in a loop!)

                    const inwardImpact = -normalVel;

                    const canTriggerCrashSfx = (a.crashCooldown || 0) <= 0 && (b.crashCooldown || 0) <= 0;

                    if (inwardImpact > 68 && canTriggerCrashSfx) {

                        if (inwardImpact >= 125) {
                            if (typeof a.triggerPanic === "function") a.triggerPanic(8.5);
                            if (typeof b.triggerPanic === "function") b.triggerPanic(8.5);
                        } else {
                            // Moderate fender-bender: calm AI drivers flash 4-way hazards and pause briefly to recover instead of flooring it blindly!
                            for (const veh of [a, b]) {
                                if (veh && !veh.destroyed && veh.driver === "AI_TRAFFIC" && (veh.aiPanicTimer || 0) <= 0) {
                                    veh.aiHazardStopTimer = 2.6 + Math.random() * 1.2;
                                    veh.aiTurnSignal = 2;
                                    veh.aiFlashHeadlightsTimer = 0.85;
                                }
                            }
                        }

                        if ((a.driver === "PLAYER" || b.driver === "PLAYER") && Math.random() < 0.45) {

                            const honker = a.driver === "PLAYER" ? b : a;

                            if (!honker.destroyed && honker.driver) {

                                this.audio.playHorn(Boolean(honker.isEmergency), honker.specKey);

                            }

                        }

                        // Aggressive AI drivers (Bikers, Muscle Cars, 4x4s) may bail out in road rage if rammed hard by the player!

                        const aiVictim = (a.driver === "PLAYER" && b.driver === "AI_TRAFFIC") ? b : ((b.driver === "PLAYER" && a.driver === "AI_TRAFFIC") ? a : null);

                        if (aiVictim && aiVictim.aiAggressive && inwardImpact > 115 && Math.hypot(aiVictim.vx, aiVictim.vy) < 85 && Math.random() < 0.35) {

                            this.ejectVehicleDriver(aiVictim, "ROAD_RAGE");

                        }

                    }

                    if (inwardImpact > 62 && canTriggerCrashSfx) {

                        a.crashCooldown = 0.45;

                        b.crashCooldown = 0.45;

                        const dmg = Math.max(4.5, inwardImpact * 0.052);

                        if (b.driver === "PLAYER") a.damagedByPlayer = true;

                        if (a.driver === "PLAYER") b.damagedByPlayer = true;

                        if (!a.destroyed) {

                            if (typeof a.receiveImpactDamage === "function") a.receiveImpactDamage(dmg, b.x, b.y, false, this);

                            else a.hp -= dmg;

                        }

                        if (!b.destroyed) {

                            if (typeof b.receiveImpactDamage === "function") b.receiveImpactDamage(dmg, a.x, a.y, false, this);

                            else b.hp -= dmg;

                        }

                        const crashX = (a.x + b.x) * 0.5;
                        const crashY = (a.y + b.y) * 0.5;
                        this.spawnParticle(crashX, crashY, "SPARK");

                        // Startle nearby sidewalk pedestrians so they step away from the violent car crash
                        if (Array.isArray(this.peds)) {
                            for (const ped of this.peds) {
                                if (!ped.dead && ped.kind === "CIVILIAN" && Math.hypot(ped.x - crashX, ped.y - crashY) < 115) {
                                    ped.panicTimer = Math.max(ped.panicTimer || 0, 3.2);
                                    ped.threatX = crashX;
                                    ped.threatY = crashY;
                                    ped.isCrossingRoad = false;
                                    ped.angle = Math.atan2(ped.y - crashY, ped.x - crashX);
                                    ped.targetBx = null;
                                    ped.targetBy = null;
                                }
                            }
                        }

                        if (Math.hypot(a.x - p.x, a.y - p.y) < 480) {
                            const bothMicro = (a.specKey === "BMX_BIKE" || a.specKey === "E_SCOOTER") &&
                                (b.specKey === "BMX_BIKE" || b.specKey === "E_SCOOTER");
                            this.audio.playCarCrash(Math.min(1.5, dmg / 14), bothMicro ? a.specKey : null);
                        }

                    }

                }

                    }
                }
            }

        }



        // 4A. Pay 'n' Spray Garage Check

        if (!this.activeInterior && Array.isArray(this.map.payNSprays)) {
            for (const pns of this.map.payNSprays) {

                if (pns.cooldown > 0) pns.cooldown -= dt;

                if (p.inVehicle && (p.seatIndex || 0) === 0 && pns.cooldown <= 0) {

                    const v = p.inVehicle;

                    if (!v.destroyed && !v.waterOnly && Math.abs((v.z || 2.0) - 2.0) <= 0.65 &&
                        v.x > pns.x && v.x < pns.x + pns.w && v.y > pns.y && v.y < pns.y + pns.h) {

                        pns.cooldown = 6.0;

                        if (typeof v.resetDamage === "function") v.resetDamage();
                        else v.hp = v.maxHp;

                        v.burnTimer = 0;
                        v.chainExplodeTimer = 0;
                        v.extinguishProgress = 0;
                        v.fireExtinguished = false;
                        v.frontDented = false;
                        v.rearDented = false;
                        v.heavyDented = false;
                        v._worldModified = true;
                        const keepOfficialLivery = Boolean(v.isPolice || v.isEmergency || v.specKey === "TOW_TRUCK" || v.crushesCars);
                        if (!keepOfficialLivery) {
                            v.remapIdx = ((v.remapIdx || 0) + 1) % 6;
                            const paintColors = ["#ff2a85", "#00f0ff", "#39ff14", "#ffd13b", "#a855f7", "#f97316"];
                            v.color = paintColors[v.remapIdx % paintColors.length];
                        }

                        this.wantedSpottedVehicle = null;
                        if (this.director && typeof this.director.onPayNSprayRespray === "function") {
                            this.director.onPayNSprayRespray(v);
                        }
                        this.setWantedLevel(0);

                        this.audio.playCashSound();

                        this.showBigBanner("PAY 'N' SPRAY", "NEW PAINT JOB + ENGINE & BODY REPAIRED + WANTED CLEARED!", "#39ff14", 2.2);
                        if (this.net && typeof this.net.broadcastStateNow === "function") {
                            this.net.broadcastStateNow();
                        }

                    }

                }

            }
        }



        // 4B. Classic GTA 1 Car Bomb Shop Check (never auto-buy on drive-over — must confirm with [E]!)

        if (!this.activeInterior && this.map.bombShops) {

            for (const bs of this.map.bombShops) {

                if (bs.cooldown > 0) bs.cooldown -= dt;

                if (p.inVehicle && (p.seatIndex || 0) === 0 && (bs.cooldown || 0) <= 0) {

                    const v = p.inVehicle;

                    const inside = !v.hasBomb && !v.destroyed && !v.waterOnly &&
                        v.specKey !== "BMX_BIKE" && v.specKey !== "E_SCOOTER" && v.specKey !== "FAGGIO_SCOOTER" &&
                        Math.abs((v.z || 2.0) - 2.0) <= 0.65 &&
                        v.x > bs.x && v.x < bs.x + bs.w && v.y > bs.y && v.y < bs.y + bs.h;

                    if (inside && !bs._promptShown) {

                        bs._promptShown = true;

                        const cost = bs.cost || 1000;

                        this.addFloatingText(v.x, v.y - 26, `💣 [E] CONFIRM CAR BOMB ($${cost.toLocaleString("en-US")})`, "#ff9900");

                    } else if (!inside) {

                        bs._promptShown = false;

                    }

                }

            }

        }



        // 4C. Classic GTA 1 Dockyard Magnetic Crane & Car Crusher Check

        if (this.map.cranes) {

            for (const cr of this.map.cranes) {
                if ((cr.cooldown || 0) > 0) {
                    cr.cooldown = Math.max(0, cr.cooldown - dt);
                }

                if (cr.crushingVehicle) {

                    const cv = cr.crushingVehicle;

                    cr.crushProgress += dt * 0.55;

                    cr.armAngle = Math.sin(cr.crushProgress * Math.PI) * 0.85;

                    cv.vx = 0;

                    cv.vy = 0;

                    if (Math.random() < 0.45) {

                        this.spawnParticle(cv.x + (Math.random() - 0.5) * 20, cv.y + (Math.random() - 0.5) * 20, "SPARK");

                    }

                    if (cr.crushProgress >= 1.0) {

                        const payout = Math.min(500, cv.resellValue || 250);

                        const vName = cv.name;

                        cv.destroyed = true;

                        this.vehicles = this.vehicles.filter((veh) => veh !== cv);
                        if (typeof this.rebuildVehicleSpatialGrid === "function") {
                            this.rebuildVehicleSpatialGrid();
                        }

                        if (this.net && typeof this.net.broadcastVehicleRemoved === "function" && cv.id) {
                            this.net.broadcastVehicleRemoved(cv.id);
                        }

                        cr.crushingVehicle = null;

                        cr.crushProgress = 0;

                        cr.armAngle = 0;
                        cr.cooldown = 45.0;

                        this.audio.playCrateSmash();

                        this.audio.playCashSound();

                        this.addCash(payout, "CRUSHED & EXPORTED!", true);
                        if (this.director && typeof this.director.onCraneVehicleExport === "function") {
                            this.director.onCraneVehicleExport(cv);
                        }
                        if (typeof this.addTurfInfluence === "function") this.addTurfInfluence(140);

                        this.showBigBanner(

                            "CAR CRUSHED!",

                            `${vName} COMPACTED FOR +$${payout.toLocaleString()} SCRAP BONUS!`,

                            "#ffd13b",

                            2.8

                        );

                    }

                } else if ((cr.cooldown || 0) <= 0 && Math.abs(p.x - cr.x) < 900 && Math.abs(p.y - cr.y) < 900) {

                    // Look for any unoccupied non-destroyed player-delivered vehicle parked inside the crane pad via spatial grid
                    const vHead = this._vehGridHead;
                    const vNext = this._vehGridNext;
                    if (vHead && vNext) {
                        const cx0 = Math.max(0, cr.x >> 8);
                        const cx1 = Math.min(127, (cr.x + cr.w) >> 8);
                        const cy0 = Math.max(0, cr.y >> 8);
                        const cy1 = Math.min(127, (cr.y + cr.h) >> 8);
                        let foundCraneVeh = false;
                        for (let cy = cy0; cy <= cy1 && !foundCraneVeh; cy++) {
                            const rowOff = cy << 7;
                            for (let cx = cx0; cx <= cx1; cx++) {
                                for (let vi = vHead[rowOff | cx]; vi !== -1; vi = vNext[vi]) {
                                    const v = this.vehicles[vi];
                                    if (v && !v.destroyed && !v.missionTag && v.driver === null && v !== p.inVehicle && v.lastPlayerDriven) {
                                        if (v.x > cr.x && v.x < cr.x + cr.w && v.y > cr.y && v.y < cr.y + cr.h) {
                                            cr.crushingVehicle = v;
                                            cr.crushProgress = 0.01;
                                            this.audio.playBeep(520, 0.1, "sawtooth", 0.08);
                                            this.addFloatingText(v.x, v.y - 24, "🏗️ MAGNETIC CRANE LOCKED!", "#ffd13b");
                                            foundCraneVeh = true;
                                            break;
                                        }
                                    }
                                }
                                if (foundCraneVeh) break;
                            }
                        }
                    }

                }

            }

        }



        // 5A. Smashable Crates Respawn Timer

        if (this.map.crates) {

            for (const cr of this.map.crates) {

                if (cr.smashed && cr.respawnTimer > 0) {

                    cr.respawnTimer -= dt;

                    if (cr.respawnTimer <= 0) cr.smashed = false;

                }

            }

        }



        // 5B. Kill Frenzy Tokens Check

        if (this.map.killFrenzies) {

            for (let i = 0; i < this.map.killFrenzies.length; i++) {

                const kf = this.map.killFrenzies[i];

                if (kf.cooldown > 0) {

                    kf.cooldown -= dt;

                    continue;

                }

                if (!this.activeInterior && !this.killFrenzy && Math.abs(p.x - kf.x) < 30 && Math.abs(p.y - kf.y) < 30 && Math.hypot(p.x - kf.x, p.y - kf.y) < 30) {

                    kf.cooldown = 45;

                    this.startKillFrenzy(kf);

                }

            }

        }



        // 5C. Pickups Check

        for (let i = 0; i < this.map.pickups.length; i++) {

            const pk = this.map.pickups[i];

            if (pk.respawnTimer > 0) {

                pk.respawnTimer -= dt;

                continue;

            }

            if (!this.activeInterior && Math.abs(p.x - pk.x) < 28 && Math.abs(p.y - pk.y) < 28 && Math.hypot(p.x - pk.x, p.y - pk.y) < 28) {

                pk.respawnTimer = 25;

                this.applyPickupEffect(pk);

            }

        }



        // 6. Pedestrians, GOURANGA Monk Chain, Alligators, Hostile Carjackers & VCPD Foot Officers Update
        // Pre-cache stationary / slow / parked vehicle OBB transforms + 128x128 spatial hash so pedestrian feelers check 0-2 cars instead of 545!
        if (!this._stoppedVehCache) this._stoppedVehCache = [];
        this._stoppedVehCache.length = 0;
        if (!this._stoppedVehGridHead) this._stoppedVehGridHead = new Int16Array(16384);
        const sHead = this._stoppedVehGridHead;
        sHead.fill(-1);
        const maxN = this.vehicles.length;
        if (!this._stoppedVehGridNext || this._stoppedVehGridNext.length < Math.max(1024, maxN + 64)) {
            this._stoppedVehGridNext = new Int16Array(Math.max(1024, maxN + 256));
        }
        const sNext = this._stoppedVehGridNext;
        for (let i = 0; i < maxN; i++) {
            const v = this.vehicles[i];
            if (!v) continue;
            const vx = v.vx || 0;
            const vy = v.vy || 0;
            if (!v.destroyed && v.driver !== null && (vx * vx + vy * vy) > 3364) continue; // 58^2 = 3364
            let entry = v._obbCacheEntry;
            if (!entry) {
                entry = {
                    v,
                    x: v.x,
                    y: v.y,
                    z: v.z,
                    cosA: Math.cos(v.angle),
                    sinA: Math.sin(v.angle),
                    halfL: (v.w || 46) * 0.44,
                    halfW: (v.h || 22) * 0.42,
                    ang: v.angle
                };
                v._obbCacheEntry = entry;
            } else {
                entry.x = v.x;
                entry.y = v.y;
                entry.z = v.z;
                if (entry.ang !== v.angle) {
                    entry.cosA = Math.cos(v.angle);
                    entry.sinA = Math.sin(v.angle);
                    entry.ang = v.angle;
                }
            }
            const cIdx = this._stoppedVehCache.length;
            this._stoppedVehCache.push(entry);
            const cx = Math.max(0, Math.min(127, v.x >> 8));
            const cy = Math.max(0, Math.min(127, v.y >> 8));
            const cell = (cy << 7) | cx;
            sNext[cIdx] = sHead[cell];
            sHead[cell] = cIdx;
        }

        // When connected as a Client to a World Host, interpolate authoritative WORLD_SYNC pedestrians at 60 FPS!
        const isClientWorldSync = Boolean(
            this.net &&
            typeof this.net.isClientWorldSyncActive === "function" &&
            this.net.isClientWorldSyncActive()
        );

        for (const ped of this.peds) {

            if (ped.dead) {

                ped.deadTimer = (ped.deadTimer || 0) + dt;

                continue;

            }
            const pedStartX = ped.x;
            const pedStartY = ped.y;

            if (ped.exitAnimTimer > 0) ped.exitAnimTimer = Math.max(0, ped.exitAnimTimer - dt);

            if (ped.muzzleTimer > 0) ped.muzzleTimer = Math.max(0, ped.muzzleTimer - dt);



            if (
                isClientWorldSync &&
                ped.netTargetX !== undefined &&
                ped.netTargetY !== undefined &&
                (performance.now() - (ped._lastNetSyncMs || 0)) < 1500
            ) {

                if ((ped.burnTimer || 0) > 0) {

                    ped.burnTimer = Math.max(0, ped.burnTimer - dt);

                    if (Math.random() < 0.35) this.spawnParticle(ped.x + (Math.random() - 0.5) * 10, ped.y + (Math.random() - 0.5) * 10, "FIRE");

                }

                if ((ped.electroTimer || 0) > 0) {

                    ped.electroTimer = Math.max(0, ped.electroTimer - dt);

                    if (Math.random() < 0.35) this.spawnParticle(ped.x + (Math.random() - 0.5) * 12, ped.y + (Math.random() - 0.5) * 12, "SPARK");

                }

                if ((ped.stunnedTimer || 0) > 0) {

                    ped.stunnedTimer = Math.max(0, ped.stunnedTimer - dt);

                }

                if (ped.netTargetX !== undefined && ped.netTargetY !== undefined) {
                    const moveSpd = (ped.stunnedTimer || 0) > 0 ? 0 : (ped.speed || 0);
                    const pAng = ped.netTargetAngle !== undefined ? ped.netTargetAngle : (ped.angle || 0);
                    ped.x += Math.cos(pAng) * moveSpd * dt;
                    ped.y += Math.sin(pAng) * moveSpd * dt;
                    const dx = ped.netTargetX - ped.x;
                    const dy = ped.netTargetY - ped.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 220) {
                        ped.x = ped.netTargetX;
                        ped.y = ped.netTargetY;
                        if (ped.netTargetZ !== undefined) ped.z = ped.netTargetZ;
                    } else {
                        const lerp = Math.min(1.0, dt * 6.5);
                        ped.x += dx * lerp;
                        ped.y += dy * lerp;
                        if (ped.netTargetZ !== undefined) ped.z += (ped.netTargetZ - ped.z) * lerp;
                    }
                    ped.netTargetX += Math.cos(pAng) * moveSpd * dt;
                    ped.netTargetY += Math.sin(pAng) * moveSpd * dt;

                    if (ped.netTargetAngle !== undefined) {
                        const angDiff = Math.atan2(Math.sin(ped.netTargetAngle - ped.angle), Math.cos(ped.netTargetAngle - ped.angle));
                        ped.angle += angDiff * Math.min(1.0, dt * 14.0);
                    }
                }

                // Check close-range COP baton strike / tackle arrest / car-door pull AND ranged weapon fire on local player even in client sync mode
                if (ped.kind === "COP" && (this.wantedLevel > 0 || ped.carjackedCop) && !p.dead && !this.activeInterior) {
                    ped.inCombat = true;
                    const effWantedSync = Math.max(1, this.wantedLevel || 1);
                    const targetEnt = p.inVehicle || p;
                    const dPlayer = Math.hypot(targetEnt.x - ped.x, targetEnt.y - ped.y);
                    const vehDoorReach = p.inVehicle ? Math.max(44, ((p.inVehicle.w || 56) * 0.50) + 16) : 34;
                    if (dPlayer <= vehDoorReach && !((ped.bustedGraceTimer || 0) > 0)) {
                        const maxHp = p.maxHp || 100;
                        if (!p.inVehicle) {
                            p._copArrestEngageFrame = 0.12;
                            p._copArrestTimer = (p._copArrestTimer || 0) + dt;
                            ped.meleeCooldown = (ped.meleeCooldown || 0) - dt;
                            if (ped.meleeCooldown <= 0) {
                                ped.meleeCooldown = 0.56;
                                ped.punchAnimTimer = 0.28;
                                p._batonSlowTimer = 0.45;
                                if (this.audio && typeof this.audio.playPunch === "function") this.audio.playPunch();
                                this.damagePlayer(16);
                                if (!p.dead && performance.now() - (this._lastBatonTextAt || 0) > 1200) {
                                    this._lastBatonTextAt = performance.now();
                                    this.addFloatingText(p.x, p.y - 26, "🚔 VCPD BATON! STOP RESISTING!", "#38bdf8");
                                }
                            }
                            if (!p.dead && (p._copArrestTimer >= 1.35 || p.hp <= maxHp * (effWantedSync <= 1 ? 0.35 : 0.25))) {
                                this.triggerWastedOrBusted("BUSTED!", "TACKLED & ARRESTED BY LEONIDA VCPD — RELEASED AT PRECINCT HQ", "#38bdf8", "POLICE");
                            }
                        } else if (Math.abs(p.inVehicle.speed || 0) < 65) {
                            p.inVehicle.doorOpenTimer = Math.max(p.inVehicle.doorOpenTimer || 0, 0.45);
                            p.inVehicle.vx *= Math.pow(0.08, dt);
                            p.inVehicle.vy *= Math.pow(0.08, dt);
                            p.inVehicle.speed *= Math.pow(0.08, dt);
                            p._copDoorPullTimer = (p._copDoorPullTimer || 0) + dt;
                            this.damagePlayer(24 * dt);
                            if (p._copDoorPullTimer >= 0.55 || p.hp < maxHp * (effWantedSync <= 1 ? 0.45 : 0.30)) {
                                p._copDoorPullTimer = 0;
                                this.triggerWastedOrBusted("BUSTED!", "PULLED FROM VEHICLE & ARRESTED BY LEONIDA VCPD", "#38bdf8", "POLICE");
                            }
                        }
                    } else if (p._copDoorPullTimer) {
                        p._copDoorPullTimer = Math.max(0, p._copDoorPullTimer - dt * 1.5);
                    }
                    ped.shootCooldown = (ped.shootCooldown || 0) - dt;
                    const canSyncCopShoot = Boolean(effWantedSync >= 2 || (p.inVehicle && (dPlayer > vehDoorReach || Math.abs(p.inVehicle.speed || 0) >= 42)));
                    if (canSyncCopShoot && dPlayer < 350 && ped.shootCooldown <= 0 && (ped.stunnedTimer || 0) <= 0) {
                        const blocked = this.map.traceSegment2D
                            ? this.map.traceSegment2D(ped.x, ped.y, targetEnt.x, targetEnt.y, ped.z || 2.0).hit
                            : false;
                        if (!blocked) {
                            const wep = ped.copWeapon || (effWantedSync >= 4 ? "SHOTGUN" : (effWantedSync >= 3 ? "UZI" : "PISTOL"));
                            ped.shootCooldown = wep === "UZI" ? 0.34 : (wep === "SHOTGUN" ? 1.15 : 0.85);
                            const leadX = targetEnt.x + (targetEnt.vx || 0) * 0.12;
                            const leadY = targetEnt.y + (targetEnt.vy || 0) * 0.12;
                            const aimAng = Math.atan2(leadY - ped.y, leadX - ped.x);
                            ped.angle = aimAng;
                            ped.muzzleTimer = 0.09;
                            this.fireWeapon(ped.x, ped.y, aimAng, wep, false, false, "COP");
                        } else {
                            ped.shootCooldown = 0.35;
                        }
                    }
                }

                continue;

            }

            // Off-screen calm civilian pedestrian 15 Hz LOD: smoothly advance inside current walkable tile on 3/4 frames,
            // running full obstacle feelers, OBB vehicle collisions & shop scans at 15 Hz or whenever crossing a tile edge!
            if (
                ped.kind === "CIVILIAN" &&
                (!ped.missionTag || ped.missionTag === "BEACH" || ped.missionTag === "PRISON_INMATE" || ped.missionTag === "PORT_CREW") &&
                !ped.isLivingProp &&
                (ped.burnTimer || 0) <= 0 &&
                (ped.electroTimer || 0) <= 0 &&
                (ped.drownTimer || 0) <= 0 &&
                (ped.stunnedTimer || 0) <= 0 &&
                (ped.panicTimer || 0) <= 0 &&
                (ped.dodgeTimer || 0) <= 0 &&
                (ped.slideCarTimer || 0) <= 0 &&
                !ped.isCrossingRoad &&
                !ped.waitingAtCrosswalk &&
                !ped._boardingVeh &&
                (Math.abs(ped.x - p.x) > 900 || Math.abs(ped.y - p.y) > 720)
            ) {
                const movedTeleport = ped._lastLodX === undefined || Math.abs(ped.x - ped._lastLodX) > 24 || Math.abs(ped.y - ped._lastLodY) > 24;
                ped._farLodTick = (ped._farLodTick === undefined || movedTeleport) ? ((ped.turnSeed || 0) & 3) : ((ped._farLodTick + 1) & 3);
                ped._lastLodX = ped.x;
                ped._lastLodY = ped.y;
                if (ped._farLodTick !== 0) {
                    if ((ped.socialTimer || 0) > 0) {
                        ped.socialTimer = Math.max(0, ped.socialTimer - dt);
                        continue;
                    }
                    if ((ped.hangoutTimer || 0) > 0) {
                        ped.hangoutTimer = Math.max(0, ped.hangoutTimer - dt);
                        continue;
                    }
                    if ((ped.hailingTaxiTimer || 0) <= 0 && ped.targetBx !== null && ped.targetBx !== undefined) {
                        const walkSpd = ped.speed || 38;
                        const nx = ped.x + Math.cos(ped.angle) * walkSpd * dt;
                        const ny = ped.y + Math.sin(ped.angle) * walkSpd * dt;
                        if (
                            Math.floor(nx / TILE_SIZE) === Math.floor(ped.x / TILE_SIZE) &&
                            Math.floor(ny / TILE_SIZE) === Math.floor(ped.y / TILE_SIZE)
                        ) {
                            ped.x = nx;
                            ped.y = ny;
                            ped._lastLodX = nx;
                            ped._lastLodY = ny;
                            ped.waypointTimer = (ped.waypointTimer || 0) + dt;
                            ped._stuckCheckTimer = (ped._stuckCheckTimer || 0) + dt;
                            continue;
                        }
                    }
                }
            }

            // 1997 GTA 1 Pedestrian::SetBurnEffectActive (Flamethrower burning pedestrians!)
            if ((ped.burnTimer || 0) > 0 && (ped.kind === "FIREMAN" || ped.g24Type === "g2_fireman")) {
                ped.burnTimer = 0; // Fireproof VCFD Nomex bunker suit!
            }

            if ((ped.burnTimer || 0) > 0) {

                ped.burnTimer -= dt;

                ped.hp -= 15 * dt;

                ped.panicTimer = 2.0;

                if (Math.random() < 0.4) {

                    this.spawnParticle(ped.x + (Math.random() - 0.5) * 10, ped.y + (Math.random() - 0.5) * 10, "FIRE");

                }

                if (ped.hp <= 0 || ped.burnTimer <= 0) {

                    ped.deathKind = "BURNT";

                    this.killPed(ped);

                    continue;

                }

            }



            // GTA 2 ePedestrianState_Electrocuted (ElectroGun): frozen in place, crackling sparks

            if ((ped.electroTimer || 0) > 0) {

                ped.electroTimer -= dt;

                if (Math.random() < 0.35) this.spawnParticle(ped.x + (Math.random() - 0.5) * 12, ped.y + (Math.random() - 0.5) * 12, "SPARK");

                if (ped.electroTimer <= 0) {

                    ped.electroTimer = 0;

                    ped.deathKind = "ELECTRO";

                    this.killPed(ped, ped.electroByPlayer !== false);

                }

                continue;

            }



            // GTA 2 ePedestrianState_Drowning: pedestrians can't swim — knocked/fleeing into deep water they sink

            if (ped.kind !== "GATOR" && (ped.z || 2.0) <= 2.38 && !((ped.drownTimer || 0) > 0) && this.map && this.map.getGroundTypeAt &&

                this.map.getGroundTypeAt(ped.x, ped.y) === GROUND_TYPE.WATER) {

                ped.drownTimer = 2.6;

                ped.burnTimer = 0;

                if (Math.hypot(ped.x - this.player.x, ped.y - this.player.y) < 480) this.audio.playPedScream();

            }

            if ((ped.drownTimer || 0) > 0) {

                ped.drownTimer -= dt;

                if (ped.drownTimer <= 0) {

                    ped.drownTimer = 0;

                    ped.deathKind = "DROWNED";

                    this.killPed(ped, false);

                }

                continue;

            }



            // 1997 GTA 1 ePedestrianState_Stunned (knocked down onto asphalt, frames 38..41)

            if ((ped.stunnedTimer || 0) > 0) {
                if ((ped.calling911Timer || 0) > 0 && !ped._isCarjackVictimCaller) {
                    if (this.director && typeof this.director.abortWitness911Call === "function") {
                        this.director.abortWitness911Call(ped, true);
                    } else {
                        ped.calling911Timer = 0;
                        ped.calling911Stars = 0;
                        ped.calling911Pos = null;
                    }
                }

                ped.stunnedTimer -= dt;

                continue;

            }
            if (ped._isCarjackVictimCaller) {
                ped._isCarjackVictimCaller = false;
            }

            // GTA 6 Street Hold-Up Intimidation / Surrender State ("HANDS UP!")
            if ((ped.surrenderTimer || 0) > 0) {
                ped.surrenderTimer = Math.max(0, ped.surrenderTimer - dt);
                ped.speed = 0;
                if (p && !p.dead) {
                    ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
                }
                if (ped.surrenderTimer <= 0) {
                    ped.panicTimer = 6.0;
                    if (p) {
                        ped.threatX = p.x;
                        ped.threatY = p.y;
                        ped.angle = Math.atan2(ped.y - p.y, ped.x - p.x);
                    }
                }
                continue;
            }



            if (ped.kind === "MONK") {

                // Single-file GOURANGA chain of 7 saffron-robed monks marching in a smooth closed promenade circuit!

                if ((ped.panicTimer || 0) > 0 || (ped.stunnedTimer || 0) > 0) {

                    if (ped.panicTimer > 0) ped.panicTimer -= dt;

                    if (ped.stunnedTimer > 0) ped.stunnedTimer -= dt;

                    ped.x += Math.cos(ped.angle) * 75 * dt;

                    ped.y += Math.sin(ped.angle) * 75 * dt;

                    const vColPanic = this.resolveCircleVehicleCollision(ped.x, ped.y, 7.5, ped.z || 2.0, null);
                    if (vColPanic.hit) {
                        ped.x = vColPanic.x;
                        ped.y = vColPanic.y;
                    }

                    ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);

                    continue;

                }



                // First active monk in the loop advances the parade forward along the circuit

                const firstAliveMonk = this.monkChain && this.monkChain.find((m) => m && !m.dead && (m.panicTimer || 0) <= 0 && (m.stunnedTimer || 0) <= 0);

                if (!firstAliveMonk || firstAliveMonk === ped) {

                    this.monkLeadS = (this.monkLeadS || 0) + 38 * dt;

                }



                const targetPos = this.getMonkTrackPosition((this.monkLeadS || 0) - ped.monkIndex * 22);
                if (Math.abs(ped.x - p.x) > 1050 || Math.abs(ped.y - p.y) > 850) {
                    ped.x = targetPos.x;
                    ped.y = targetPos.y;
                    ped.angle = targetPos.angle;
                    continue;
                }

                const dTarget = Math.hypot(targetPos.x - ped.x, targetPos.y - ped.y);

                if (dTarget > 4) {

                    ped.angle = this.steerPedWithObstacleFeelers(ped, targetPos.x, targetPos.y, null);

                    const catchSpeed = Math.min(62, Math.max(34, dTarget * 3.5));

                    ped.x += Math.cos(ped.angle) * catchSpeed * dt;

                    ped.y += Math.sin(ped.angle) * catchSpeed * dt;

                } else {

                    ped.x = targetPos.x;

                    ped.y = targetPos.y;

                    ped.angle = targetPos.angle;

                }

                const vColMonk = this.resolveCircleVehicleCollision(ped.x, ped.y, 7.5, ped.z || 2.0, null);
                if (vColMonk.hit) {
                    ped.x = vColMonk.x;
                    ped.y = vColMonk.y;
                }

                ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);

                continue;

            }



            const prevX = ped.x;

            const prevY = ped.y;

            ped._boardingVeh = null;



            if (ped.kind === "GATOR") {

                // Gator chases nearest human or Lucia if close, strictly bounded inside Grassrivers Everglades swamps

                const dPlayer = Math.hypot(p.x - ped.x, p.y - ped.y);

                if (!p.inVehicle && !this.activeInterior && dPlayer < 190) {

                    ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);

                    ped.x += Math.cos(ped.angle) * 82 * dt;

                    ped.y += Math.sin(ped.angle) * 82 * dt;

                    if (dPlayer < 22) {

                        this.damagePlayer(18 * dt);

                    }

                } else {

                    ped.x += Math.cos(ped.angle) * 28 * dt;

                    ped.y += Math.sin(ped.angle) * 28 * dt;

                    if (Math.random() < 0.02) ped.angle += (Math.random() - 0.5) * 1.8;

                }

                const minGx = 55 * TILE_SIZE, maxGx = 180 * TILE_SIZE, minGy = 385 * TILE_SIZE, maxGy = 475 * TILE_SIZE;

                if (ped.x < minGx || ped.x > maxGx || ped.y < minGy || ped.y > maxGy) {

                    ped.x = Math.max(minGx, Math.min(maxGx, prevX));

                    ped.y = Math.max(minGy, Math.min(maxGy, prevY));

                    ped.angle += Math.PI;

                }

            } else if (ped.kind === "COP") {

                if ((ped.bustedGraceTimer || 0) > 0) {

                    ped.bustedGraceTimer = Math.max(0, ped.bustedGraceTimer - dt);

                }
                const isCompoundGuard = (
                    ped.missionTag === "PRISON_GUARD" ||
                    ped.missionTag === "AIRPORT_GUARD" ||
                    ped.missionTag === "SERA_GUARD"
                );
                if (
                    isCompoundGuard &&
                    (Math.abs(ped.x - p.x) > 1150 || Math.abs(ped.y - p.y) > 950) &&
                    ((ped.turnSeed + this._vehTickFrame) & 3) !== 0
                ) {
                    ped.speed = 28;
                    ped.x += Math.cos(ped.angle) * 28 * dt;
                    ped.y += Math.sin(ped.angle) * 28 * dt;
                    if (ped.missionTag === "PRISON_GUARD") {
                        const minPx = 57.25 * TILE_SIZE, maxPx = 67.75 * TILE_SIZE, minPy = 77.25 * TILE_SIZE, maxPy = 145.55 * TILE_SIZE;
                        if (ped.x < minPx || ped.x > maxPx || ped.y < minPy || ped.y > maxPy) {
                            ped.x = Math.max(minPx, Math.min(maxPx, prevX));
                            ped.y = Math.max(minPy, Math.min(maxPy, prevY));
                            ped.angle += Math.PI * 0.85;
                        }
                    } else if (ped.missionTag === "AIRPORT_GUARD") {
                        const minAx = 65.5 * TILE_SIZE, maxAx = 164.5 * TILE_SIZE, minAy = 299.8 * TILE_SIZE, maxAy = 368.0 * TILE_SIZE;
                        if (ped.x < minAx || ped.x > maxAx || ped.y < minAy || ped.y > maxAy) {
                            ped.x = Math.max(minAx, Math.min(maxAx, prevX));
                            ped.y = Math.max(minAy, Math.min(maxAy, prevY));
                            ped.angle += Math.PI * 0.85;
                        }
                    } else if (ped.missionTag === "SERA_GUARD") {
                        const minSx = 459.2 * TILE_SIZE, maxSx = 479.8 * TILE_SIZE, minSy = 23.2 * TILE_SIZE, maxSy = 43.8 * TILE_SIZE;
                        if (ped.x < minSx || ped.x > maxSx || ped.y < minSy || ped.y > maxSy) {
                            ped.x = Math.max(minSx, Math.min(maxSx, prevX));
                            ped.y = Math.max(minSy, Math.min(maxSy, prevY));
                            ped.angle += Math.PI * 0.85;
                        }
                    }
                    continue;
                }

                const activeReliefTarget = Boolean(
                    ped.isReliefDriver &&
                    ped._boardingVeh &&
                    !ped._boardingVeh.destroyed &&
                    ped._boardingVeh.driver === null &&
                    !ped._boardingVeh.towedByTruck
                );
                let rawCopTarget = activeReliefTarget ? null : (this.getNearestWantedTarget(ped.x, ped.y, ped.angle) || (ped.carjackedCop && p && !p.dead ? {

                    x: p.inVehicle ? p.inVehicle.x : p.x,

                    y: p.inVehicle ? p.inVehicle.y : p.y,

                    vx: p.inVehicle ? (p.inVehicle.vx || 0) : 0,

                    vy: p.inVehicle ? (p.inVehicle.vy || 0) : 0,

                    inVehicle: Boolean(p.inVehicle),

                    isRemote: false,

                    wantedLevel: Math.max(1, this.wantedLevel || 1)

                } : null));
                if (isCompoundGuard && rawCopTarget && (Math.abs(rawCopTarget.x - ped.x) > 900 || Math.abs(rawCopTarget.y - ped.y) > 900)) {
                    rawCopTarget = null;
                }

                // Real-Life Squad Pursuit Recovery:
                // If the suspect has fled far away down a city street (> 420px, or > 260px in a speeding vehicle) and the officer's patrol cruiser
                // (homeCruiser) is nearby (< 360px), the officer runs back to the cruiser and re-boards it to resume high-speed vehicle pursuit!
                // On the open Vice Beach / Lummus Park sand (where foot officers are deployed specifically to chase suspects across the sand),
                // officers pursue on foot across the entire beach up to 1850px without turning back to re-board their cruiser!
                const rawDistToTarget = rawCopTarget ? Math.hypot(rawCopTarget.x - ped.x, rawCopTarget.y - ped.y) : 9999;
                const hc = ped.homeCruiser;
                const hcValid = Boolean(hc && !hc.destroyed && hc !== (p && p.inVehicle) && !hc.towedByTruck && hc._gridEpoch === this._gridEpoch);
                const dHomeCruiser = hcValid ? Math.hypot(hc.x - ped.x, hc.y - ped.y) : 9999;
        const targetOnRoadForCop = Boolean(rawCopTarget && this.map && this.map.isRoadAtPixel && this.map.isRoadAtPixel(rawCopTarget.x, rawCopTarget.y));
                const targetOnBeachOrParkForCop = Boolean(
                    rawCopTarget && !targetOnRoadForCop && (
                        rawCopTarget.x >= (rawCopTarget.y < 75 * TILE_SIZE ? 458.0 : 447.2) * TILE_SIZE ||
                        (this.map && this.map.getTileAtPixel && typeof TILE !== "undefined" && this.map.getTileAtPixel(rawCopTarget.x, rawCopTarget.y) === TILE.SAND)
                    )
                );
                // Whenever a wanted suspect is off-road (beach, park, golf course, stadium, airport tarmac, swamp),
                // deployed on-foot officers pursue across the off-road terrain up to 1850px without turning back to re-board their road cruiser!
                const reboardFootDist = !targetOnRoadForCop ? 1850 : 420;
                const reboardVehDist = !targetOnRoadForCop ? 950 : 260;
                const shouldReboardCruiser = Boolean(
                    rawCopTarget &&
                    hcValid &&
                    dHomeCruiser < 360 &&
                    (rawDistToTarget > reboardFootDist || (rawCopTarget.inVehicle && rawDistToTarget > reboardVehDist))
                );
                const copTarget = shouldReboardCruiser ? null : rawCopTarget;

                ped.inCombat = Boolean(copTarget);

                if (copTarget) {

                    const dTarget = Math.hypot(copTarget.x - ped.x, copTarget.y - ped.y);

                    let effWanted = Math.max(this.wantedLevel || 0, copTarget.wantedLevel || 1);

                    // If a 1★ suspect wades into ocean water to evade a physical baton arrest while a foot officer is right at the shoreline,
                    // VCPD escalates to 2★ so shoreline officers can engage!
                    const targetInWater = Boolean(!copTarget.isCriminalNPC && !copTarget.isSearchPoint && this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(copTarget.x, copTarget.y));
                    if (targetInWater && effWanted === 1 && dTarget < 240) {
                        this._waterEvadeTimer = (this._waterEvadeTimer || 0) + dt;
                        if (this._waterEvadeTimer >= 2.2) {
                            this._waterEvadeTimer = 0;
                            this.setWantedLevel(2, { x: copTarget.x, y: copTarget.y }, true);
                            this.addFloatingText(copTarget.x, copTarget.y - 34, "🚨 10-80 FLEEING INTO SURF — 2★!", "#ef4444");
                            effWanted = 2;
                        }
                    }

                    const baseCopSpd = ped.copWeapon === "SHOTGUN" || effWanted >= 3 ? 132 : 126;
                    const closeBatonLunge = (!copTarget.inVehicle && !copTarget.isSearchPoint && dTarget < 135) ? 20 : 0;
                    const copRunSpd = (targetOnBeachOrParkForCop ? (baseCopSpd + 10) : baseCopSpd) + closeBatonLunge;

                    const playerVeh = (!copTarget.isSearchPoint && !copTarget.isRemote && !copTarget.isCriminalNPC && p && p.inVehicle) ? p.inVehicle : null;
                    const vehDoorReach = playerVeh ? Math.max(44, ((playerVeh.w || 56) * 0.50) + 16) : 34;
                    let walkTargetX = copTarget.x;
                    let walkTargetY = copTarget.y;
                    let dWalkTarget = dTarget;
                    if (playerVeh && Math.abs(playerVeh.speed || 0) < 75) {
                        const vRx = -Math.sin(playerVeh.angle || 0);
                        const vRy = Math.cos(playerVeh.angle || 0);
                        const doorOff = ((playerVeh.h || 26) * 0.50) + 7;
                        const sideSign = ((ped.x - playerVeh.x) * vRx + (ped.y - playerVeh.y) * vRy) >= 0 ? 1 : -1;
                        walkTargetX = playerVeh.x + vRx * sideSign * doorOff;
                        walkTargetY = playerVeh.y + vRy * sideSign * doorOff;
                        dWalkTarget = Math.hypot(walkTargetX - ped.x, walkTargetY - ped.y);
                    }

                    const idealDist = copTarget.isCriminalNPC ? 95 : (playerVeh ? 16 : 24);
                    const checkDist = playerVeh ? dWalkTarget : dTarget;

                    if (checkDist > idealDist && (!playerVeh || dTarget > vehDoorReach)) {

                        ped.angle = this.steerPedWithObstacleFeelers(ped, walkTargetX, walkTargetY, playerVeh || copTarget.vehRef || null);

                        ped.x += Math.cos(ped.angle) * copRunSpd * dt;

                        ped.y += Math.sin(ped.angle) * copRunSpd * dt;

                    } else {

                        ped.angle = Math.atan2(copTarget.y - ped.y, copTarget.x - ped.x);
                        if (!playerVeh && checkDist > 18) {
                            ped.x += Math.cos(ped.angle) * (copRunSpd * 0.55) * dt;
                            ped.y += Math.sin(ped.angle) * (copRunSpd * 0.55) * dt;
                        }

                        if (copTarget.isCriminalNPC && dTarget < 60) {

                            // Tactical strafe when dueling armed criminals

                            const strafeAng = ped.angle + Math.PI * 0.5 * ((ped.id % 2 === 0) ? 1 : -1);

                            ped.x += Math.cos(strafeAng) * 52 * dt;

                            ped.y += Math.sin(strafeAng) * 52 * dt;

                        } else if (!copTarget.isSearchPoint && !copTarget.isRemote && !copTarget.isCriminalNPC && !p.dead && !this.activeInterior && !((ped.bustedGraceTimer || 0) > 0)) {

                            const maxHp = p.maxHp || 100;

                            if (!p.inVehicle && dTarget <= 34) {
                                p._copArrestEngageFrame = 0.12;
                                p._copArrestTimer = (p._copArrestTimer || 0) + dt;
                                ped.meleeCooldown = (ped.meleeCooldown || 0) - dt;
                                if (ped.meleeCooldown <= 0) {
                                    ped.meleeCooldown = 0.56;
                                    ped.punchAnimTimer = 0.28;
                                    p._batonSlowTimer = 0.45;
                                    // Physical baton jolt
                                    const pushX = p.x + Math.cos(ped.angle) * 5.5;
                                    const pushY = p.y + Math.sin(ped.angle) * 5.5;
                                    if (!this.map.resolveCircleBuildingCollision || !this.map.resolveCircleBuildingCollision(pushX, pushY, 10, p.z || 2.0).hit) {
                                        p.x = pushX;
                                        p.y = pushY;
                                    }
                                    if (this.audio && typeof this.audio.playPunch === "function") this.audio.playPunch();
                                    this.spawnParticle(p.x, p.y, "SPARK");
                                    this.damagePlayer(16);
                                    if (!p.dead && performance.now() - (this._lastBatonTextAt || 0) > 1200) {
                                        this._lastBatonTextAt = performance.now();
                                        this.addFloatingText(p.x, p.y - 26, "🚔 VCPD BATON! STOP RESISTING!", "#38bdf8");
                                    }
                                }
                                if (!p.dead && (p._copArrestTimer >= 1.35 || p.hp <= maxHp * (effWanted <= 1 ? 0.35 : 0.25))) {
                                    this.triggerWastedOrBusted("BUSTED!", "TACKLED & ARRESTED BY LEONIDA VCPD — RELEASED AT PRECINCT HQ", "#38bdf8", "POLICE");
                                }
                            } else if (p.inVehicle && dTarget <= vehDoorReach && Math.abs(p.inVehicle.speed || 0) < 65) {

                                // Foot officer at driver/passenger door of a stopped or slow vehicle: wrench door open, brake vehicle, and yank suspect out!
                                p.inVehicle.doorOpenTimer = Math.max(p.inVehicle.doorOpenTimer || 0, 0.45);
                                p.inVehicle.vx *= Math.pow(0.08, dt);
                                p.inVehicle.vy *= Math.pow(0.08, dt);
                                p.inVehicle.speed *= Math.pow(0.08, dt);
                                p._copDoorPullTimer = (p._copDoorPullTimer || 0) + dt;
                                this.damagePlayer(24 * dt);
                                if (p._copDoorPullTimer >= 0.55 || p.hp < maxHp * (effWanted <= 1 ? 0.45 : 0.30)) {
                                    p._copDoorPullTimer = 0;
                                    this.triggerWastedOrBusted("BUSTED!", "PULLED FROM VEHICLE & ARRESTED BY LEONIDA VCPD", "#38bdf8", "POLICE");
                                }

                            }

                        }

                    }

                    // If a 1★ suspect in a vehicle refuses to stop or evades an officer on foot within 280px, escalate to 2★ Vehicular Evasion
                    if (playerVeh && effWanted === 1 && dTarget < 280 && Math.abs(playerVeh.speed || 0) >= 38) {
                        this._vehEvadeTimer = (this._vehEvadeTimer || 0) + dt;
                        if (this._vehEvadeTimer >= 1.8) {
                            this._vehEvadeTimer = 0;
                            this.setWantedLevel(2, { x: copTarget.x, y: copTarget.y }, true, playerVeh);
                            this.addFloatingText(copTarget.x, copTarget.y - 34, "🚨 10-80 VEHICULAR EVASION — 2★!", "#ef4444");
                            effWanted = 2;
                        }
                    }

                    ped.shootCooldown = (ped.shootCooldown || 0) - dt;

                    // Real-Life Proportional Force:
                    // At 1★ on foot (unarmed suspect), VCPD officers pursue to make a physical baton arrest without opening fire.
                    // Against a suspect inside a 2-ton getaway vehicle (or at 2★+ / armed NPC criminals), officers open fire on the vehicle!
                    const maxCopShootDist = (targetOnBeachOrParkForCop || targetInWater) ? 385 : 325;
                    const canShootTarget = Boolean(
                        copTarget.isCriminalNPC ||
                        effWanted >= 2 ||
                        (copTarget.inVehicle && (!playerVeh || dTarget > vehDoorReach || Math.abs(playerVeh.speed || 0) >= 42))
                    );
                    if (!copTarget.isSearchPoint && canShootTarget && dTarget < maxCopShootDist && ped.shootCooldown <= 0 && (copTarget.isRemote || copTarget.isCriminalNPC || !this.activeInterior)) {

                        const blocked = this.map.traceSegment2D

                            ? this.map.traceSegment2D(ped.x, ped.y, copTarget.x, copTarget.y, ped.z || 2.0).hit

                            : false;

                        if (!blocked) {

                            const wep = ped.copWeapon || (effWanted >= 4 ? "SHOTGUN" : (effWanted >= 3 ? "UZI" : "PISTOL"));

                            ped.shootCooldown = wep === "UZI" ? 0.34 : (wep === "SHOTGUN" ? 1.15 : 0.85);

                            const leadX = copTarget.x + (copTarget.vx || 0) * 0.12;

                            const leadY = copTarget.y + (copTarget.vy || 0) * 0.12;

                            const aimAng = Math.atan2(leadY - ped.y, leadX - ped.x);

                            ped.angle = aimAng;

                            ped.muzzleTimer = 0.09;

                            this.fireWeapon(ped.x, ped.y, aimAng, wep, false, false, "COP");

                        } else {

                            ped.shootCooldown = 0.35;

                        }

                    }

                } else {

                    // Post-shootout scene cleanup OR Squad Re-Boarding for Distant Pursuit:
                    // VCPD officers walk/run back to their patrol cruiser (or nearest unoccupied police car), climb in, and drive off!
                    let returnCar = (ped.homeCruiser && !ped.homeCruiser.destroyed && ped.homeCruiser !== (p && p.inVehicle) && !ped.homeCruiser.towedByTruck && (ped.homeCruiser.driver === null || ped.homeCruiser.driver === "AI_COP") && (ped.homeCruiser._gridEpoch === this._gridEpoch || ped.isTrafficWarden))
                        ? ped.homeCruiser
                        : ((ped._boardingVeh && !ped._boardingVeh.destroyed && ped._boardingVeh.driver === null && !ped._boardingVeh.towedByTruck)
                            ? ped._boardingVeh
                            : null);
                    let bestCarDist = returnCar ? Math.hypot(returnCar.x - ped.x, returnCar.y - ped.y) : 780;
                    if (!returnCar && !isCompoundGuard) {
                        const vHead = this._vehGridHead;
                        const vNext = this._vehGridNext;
                        if (vHead && vNext) {
                            const cx0 = Math.max(0, (ped.x >> 8) - 3);
                            const cx1 = Math.min(127, (ped.x >> 8) + 3);
                            const cy0 = Math.max(0, (ped.y >> 8) - 3);
                            const cy1 = Math.min(127, (ped.y >> 8) + 3);
                            for (let cy = cy0; cy <= cy1; cy++) {
                                const rowOff = cy << 7;
                                for (let cx = cx0; cx <= cx1; cx++) {
                                    for (let vi = vHead[rowOff | cx]; vi !== -1; vi = vNext[vi]) {
                                        const v = this.vehicles[vi];
                                        if (
                                            v &&
                                            !v.destroyed &&
                                            v.driver === null &&
                                            !v.towedByTruck &&
                                            !v.isStaticParked &&
                                            !v.isCurbParked &&
                                            !v.isEstateCar &&
                                            (v.isPolice || v.wasCriminalCar || ped.isTrafficWarden)
                                        ) {
                                            const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                                            if (d < bestCarDist) {
                                                bestCarDist = d;
                                                returnCar = v;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (returnCar) {
                        ped._boardingVeh = returnCar;
                        const boardDist = Math.max(46, (returnCar.w || 48) * 0.54 + 14);
                        if (bestCarDist < boardDist) {
                            returnCar.driver = (returnCar.isPolice && this.wantedLevel > 0) ? "AI_COP" : "AI_TRAFFIC";
                            returnCar.noDeployCooldown = 4.8;
                            returnCar.wasCriminalCar = false;
                            returnCar.sirenActive = Boolean(returnCar.isPolice && this.wantedLevel > 0);
                            returnCar.lastPlayerDriven = false;
                            returnCar.abandonedTimer = 0;
                            returnCar.doorOpenTimer = 0.44;
                            if (ped.isTrafficWarden && this.director && this.director.laneTracker) {
                                const clearSide = (ped.wardenBottleneck && ped.wardenBottleneck.clearSide) ? ped.wardenBottleneck.clearSide : 1;
                                returnCar.aiPullOverOffset = clearSide * 24;
                                returnCar.aiPullOverTimer = 2.6;
                                this.director.laneTracker.totalWardenDirectives = (this.director.laneTracker.totalWardenDirectives || 0) + 1;
                                this.director.blackboard.totalTrafficWardenDirectives = this.director.laneTracker.totalWardenDirectives;
                                this.director.laneTracker.totalWardenBoardings = (this.director.laneTracker.totalWardenBoardings || 0) + 1;
                                this.director.blackboard.totalTrafficWardenBoardings = this.director.laneTracker.totalWardenBoardings;
                            }
                            ped._boardedVehicle = true;
                            ped.dead = true;
                            continue;
                        }
                        const runBackSpd = this.wantedLevel > 0 ? 102 : 92;
                        ped.speed = runBackSpd;
                        const copBackWp = (typeof PedNav !== "undefined" && typeof PedNav.routeWaypoint === "function")
                            ? PedNav.routeWaypoint(this, ped, returnCar.x, returnCar.y)
                            : null;
                        ped.angle = this.steerPedWithObstacleFeelers(ped, copBackWp ? copBackWp.x : returnCar.x, copBackWp ? copBackWp.y : returnCar.y, returnCar);
                        ped.x += Math.cos(ped.angle) * runBackSpd * dt;
                        ped.y += Math.sin(ped.angle) * runBackSpd * dt;
                    } else if (ped.isTrafficWarden && ped.wardenBottleneck) {
                        // In-Game Traffic AI Warden physically walks to the safe cone-taper flagger position (flaggerX, flaggerY)
                        // behind the obstruction (never blocking the open bypass lane) and regulates traffic with his LED baton!
                        const bn = ped.wardenBottleneck;
                        const flagX = (typeof bn.flaggerX === "number") ? bn.flaggerX : bn.x;
                        const flagY = (typeof bn.flaggerY === "number") ? bn.flaggerY : bn.y;
                        const distBn = Math.hypot(flagX - ped.x, flagY - ped.y);
                        if (distBn > 24) {
                            const wardenSpd = 88;
                            ped.speed = wardenSpd;
                            const wardenWp = (typeof PedNav !== "undefined" && typeof PedNav.routeWaypoint === "function")
                                ? PedNav.routeWaypoint(this, ped, flagX, flagY)
                                : null;
                            ped.angle = this.steerPedWithObstacleFeelers(ped, wardenWp ? wardenWp.x : flagX, wardenWp ? wardenWp.y : flagY, bn.obstacleVeh || null);
                            ped.x += Math.cos(ped.angle) * wardenSpd * dt;
                            ped.y += Math.sin(ped.angle) * wardenSpd * dt;
                        } else {
                            ped.speed = 0;
                            ped.isDirectingTraffic = true;
                            ped.wandWaveTimer = 0.85;
                            ped.angle = Math.atan2(bn.y - ped.y, bn.x - ped.x) + Math.sin((this.elapsedTime || 0) * 3.5) * 0.45;
                        }
                    } else {
                        // Routine VCPD / Penitentiary / Airport / SERA foot patrol when no wanted player or active criminal is nearby
                        ped.speed = 28;
                        ped.x += Math.cos(ped.angle) * 28 * dt;
                        ped.y += Math.sin(ped.angle) * 28 * dt;
                        if (Math.random() < 0.015) ped.angle += (Math.random() - 0.5) * 1.2;
                        if (ped.missionTag === "PRISON_GUARD") {
                            const minPx = 57.25 * TILE_SIZE, maxPx = 67.75 * TILE_SIZE, minPy = 77.25 * TILE_SIZE, maxPy = 145.55 * TILE_SIZE;
                            if (ped.x < minPx || ped.x > maxPx || ped.y < minPy || ped.y > maxPy) {
                                ped.x = Math.max(minPx, Math.min(maxPx, prevX));
                                ped.y = Math.max(minPy, Math.min(maxPy, prevY));
                                ped.angle += Math.PI * (0.7 + Math.random() * 0.6);
                            }
                        } else if (ped.missionTag === "AIRPORT_GUARD") {
                            const minAx = 65.5 * TILE_SIZE, maxAx = 164.5 * TILE_SIZE, minAy = 299.8 * TILE_SIZE, maxAy = 368.0 * TILE_SIZE;
                            if (ped.x < minAx || ped.x > maxAx || ped.y < minAy || ped.y > maxAy) {
                                ped.x = Math.max(minAx, Math.min(maxAx, prevX));
                                ped.y = Math.max(minAy, Math.min(maxAy, prevY));
                                ped.angle += Math.PI * (0.7 + Math.random() * 0.6);
                            }
                        } else if (ped.missionTag === "SERA_GUARD") {
                            const minSx = 459.2 * TILE_SIZE, maxSx = 479.8 * TILE_SIZE, minSy = 23.2 * TILE_SIZE, maxSy = 43.8 * TILE_SIZE;
                            if (ped.x < minSx || ped.x > maxSx || ped.y < minSy || ped.y > maxSy) {
                                ped.x = Math.max(minSx, Math.min(maxSx, prevX));
                                ped.y = Math.max(minSy, Math.min(maxSy, prevY));
                                ped.angle += Math.PI * (0.7 + Math.random() * 0.6);
                            }
                        }
                    }

                }

            } else if (ped.kind === "CRIMINAL") {

                // Ambient Bandit / Heist Crew AI: engages VCPD officers & cruisers in street shootouts (and player if attacked by player)

                let crimTarget = null;

                let bestCopDist = 440;

                if (this._pedGridHead && this._pedGridNext) {
                    const pHead = this._pedGridHead;
                    const pNext = this._pedGridNext;
                    const cx0 = Math.max(0, (ped.x - 440) >> 8);
                    const cx1 = Math.min(127, (ped.x + 440) >> 8);
                    const cy0 = Math.max(0, (ped.y - 440) >> 8);
                    const cy1 = Math.min(127, (ped.y + 440) >> 8);
                    for (let cy = cy0; cy <= cy1; cy++) {
                        const rowOff = cy << 7;
                        for (let cx = cx0; cx <= cx1; cx++) {
                            for (let pi = pHead[rowOff | cx]; pi !== -1; pi = pNext[pi]) {
                                const other = this.peds[pi];
                                if (other && !other.dead && other.kind === "COP") {
                                    const d = Math.hypot(other.x - ped.x, other.y - ped.y);
                                    if (d < bestCopDist) {
                                        bestCopDist = d;
                                        crimTarget = { x: other.x, y: other.y, vx: 0, vy: 0 };
                                    }
                                }
                            }
                        }
                    }
                } else {
                    for (const other of this.peds) {
                        if (!other.dead && other.kind === "COP") {
                            const d = Math.hypot(other.x - ped.x, other.y - ped.y);
                            if (d < bestCopDist) {
                                bestCopDist = d;
                                crimTarget = { x: other.x, y: other.y, vx: 0, vy: 0 };
                            }
                        }
                    }
                }

                if (this._vehGridHead && this._vehGridNext) {
                    const vHead = this._vehGridHead;
                    const vNext = this._vehGridNext;
                    const cx0 = Math.max(0, (ped.x >> 8) - 2);
                    const cx1 = Math.min(127, (ped.x >> 8) + 2);
                    const cy0 = Math.max(0, (ped.y >> 8) - 2);
                    const cy1 = Math.min(127, (ped.y >> 8) + 2);
                    for (let cy = cy0; cy <= cy1; cy++) {
                        const rowOff = cy << 7;
                        for (let cx = cx0; cx <= cx1; cx++) {
                            for (let vi = vHead[rowOff | cx]; vi !== -1; vi = vNext[vi]) {
                                const cv = this.vehicles[vi];
                                if (cv && !cv.destroyed && cv.driver === "AI_COP") {
                                    const d = Math.hypot(cv.x - ped.x, cv.y - ped.y);
                                    if (d < bestCopDist) {
                                        bestCopDist = d;
                                        crimTarget = { x: cv.x, y: cv.y, vx: cv.vx || 0, vy: cv.vy || 0 };
                                    }
                                }
                            }
                        }
                    }
                }

                if (ped.attackedByPlayer && p && !p.dead && !this.activeInterior) {

                    const px = p.inVehicle ? p.inVehicle.x : p.x;

                    const py = p.inVehicle ? p.inVehicle.y : p.y;

                    const dp = Math.hypot(px - ped.x, py - ped.y);

                    if (dp < bestCopDist) {

                        bestCopDist = dp;

                        crimTarget = { x: px, y: py, vx: p.inVehicle ? (p.inVehicle.vx || 0) : 0, vy: p.inVehicle ? (p.inVehicle.vy || 0) : 0 };

                    }

                }

                if (crimTarget) {

                    if (bestCopDist > 125) {

                        ped.angle = this.steerPedWithObstacleFeelers(ped, crimTarget.x, crimTarget.y);

                        ped.x += Math.cos(ped.angle) * 86 * dt;

                        ped.y += Math.sin(ped.angle) * 86 * dt;

                    } else if (bestCopDist < 72) {

                        const retreatAng = Math.atan2(ped.y - crimTarget.y, ped.x - crimTarget.x);

                        ped.angle = Math.atan2(crimTarget.y - ped.y, crimTarget.x - ped.x);

                        ped.x += Math.cos(retreatAng) * 68 * dt;

                        ped.y += Math.sin(retreatAng) * 68 * dt;

                    } else {

                        // Tactical street shootout strafe

                        ped.angle = Math.atan2(crimTarget.y - ped.y, crimTarget.x - ped.x);

                        const strafeDir = ((Math.floor(performance.now() * 0.0012) + (ped.id || 0)) % 2 === 0) ? 1 : -1;

                        const strafeAng = ped.angle + Math.PI * 0.5 * strafeDir;

                        ped.x += Math.cos(strafeAng) * 58 * dt;

                        ped.y += Math.sin(strafeAng) * 58 * dt;

                    }

                    ped.shootCooldown = (ped.shootCooldown || 0) - dt;

                    if (bestCopDist < 330 && ped.shootCooldown <= 0) {

                        const blocked = this.map.traceSegment2D

                            ? this.map.traceSegment2D(ped.x, ped.y, crimTarget.x, crimTarget.y, ped.z || 2.0).hit

                            : false;

                        if (!blocked) {

                            const wep = ped.copWeapon || "UZI";

                            ped.shootCooldown = wep === "UZI" ? 0.30 : (wep === "SHOTGUN" ? 1.10 : 0.78);

                            const leadX = crimTarget.x + (crimTarget.vx || 0) * 0.11;

                            const leadY = crimTarget.y + (crimTarget.vy || 0) * 0.11;

                            const aimAng = Math.atan2(leadY - ped.y, leadX - ped.x);

                            ped.angle = aimAng;

                            ped.muzzleTimer = 0.09;

                            this.fireWeapon(ped.x, ped.y, aimAng, wep, false, false, "CRIMINAL");

                        } else {

                            ped.shootCooldown = 0.32;

                        }

                    }

                } else {
                    // All pursuing cops neutralized — bandits hop into a fresh undamaged unoccupied getaway car (never re-boarding a bailed-out or damaged car)!
                    if ((ped.noBoardTimer || 0) > 0) {
                        ped.noBoardTimer = Math.max(0, ped.noBoardTimer - dt);
                    }
                    let getawayCar = null;
                    let bestCarDist = 380;
                    if ((ped.noBoardTimer || 0) <= 0 && this._vehGridHead && this._vehGridNext) {
                        const vHead = this._vehGridHead;
                        const vNext = this._vehGridNext;
                        const cx0 = Math.max(0, (ped.x >> 8) - 2);
                        const cx1 = Math.min(127, (ped.x >> 8) + 2);
                        const cy0 = Math.max(0, (ped.y >> 8) - 2);
                        const cy1 = Math.min(127, (ped.y >> 8) + 2);
                        for (let cy = cy0; cy <= cy1; cy++) {
                            const rowOff = cy << 7;
                            for (let cx = cx0; cx <= cx1; cx++) {
                                for (let vi = vHead[rowOff | cx]; vi !== -1; vi = vNext[vi]) {
                                    const v = this.vehicles[vi];
                                    if (
                                        v &&
                                        !v.destroyed &&
                                        v.driver === null &&
                                        !v.criminalBailedOut &&
                                        !v.criminalDeployDone &&
                                        !v.wasCriminalCar &&
                                        !v.isPolice &&
                                        v.hp > v.maxHp * 0.65 &&
                                        !v.towedByTruck &&
                                        !v.missionTag &&
                                        !v.isEstateCar
                                    ) {
                                        const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                                        if (d < bestCarDist) {
                                            bestCarDist = d;
                                            getawayCar = v;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (getawayCar) {
                        ped._boardingVeh = getawayCar;
                        const boardDist = Math.max(40, (getawayCar.w || 48) * 0.52 + 10);
                        if (bestCarDist < boardDist) {
                            getawayCar.driver = "AI_CRIMINAL";
                            getawayCar.wasCriminalCar = true;
                            getawayCar.doorOpenTimer = 0.44;
                            ped._boardedVehicle = true;
                            ped.dead = true;
                            continue;
                        }
                        ped.angle = this.steerPedWithObstacleFeelers(ped, getawayCar.x, getawayCar.y, getawayCar);
                        ped.x += Math.cos(ped.angle) * 96 * dt;
                        ped.y += Math.sin(ped.angle) * 96 * dt;
                    } else {
                        ped.x += Math.cos(ped.angle) * 96 * dt;
                        ped.y += Math.sin(ped.angle) * 96 * dt;
                        if (Math.random() < 0.025) ped.angle += (Math.random() - 0.5) * 1.1;
                    }
                }

            } else if (ped.kind === "HOSTILE") {

                // Road-Rage Driver / Gang Member AI: chases Lucia and punches or pulls her out of a slow car!

                const dPlayer = Math.hypot(p.x - ped.x, p.y - ped.y);

                if (dPlayer < 290 && !p.dead && !this.activeInterior) {

                    const reachDist = p.inVehicle ? Math.max(38, (p.inVehicle.w || 48) * 0.50 + 10) : 24;

                    if (p.inVehicle) ped._boardingVeh = p.inVehicle;

                    if (dPlayer > reachDist) {

                        ped.angle = this.steerPedWithObstacleFeelers(ped, p.x, p.y, p.inVehicle || null);

                        ped.x += Math.cos(ped.angle) * 90 * dt;

                        ped.y += Math.sin(ped.angle) * 90 * dt;

                    } else if (p.inVehicle && !p.inVehicle.crushesCars && Math.abs(p.inVehicle.speed) < 38) {

                        // Angry driver yanks Lucia out of the car and takes it back!

                        const stolenBack = p.inVehicle;
                        const prevSeat = p.seatIndex || 0;

                        p.inVehicle = null;
                        p.seatIndex = 0;

                        p.exitAnimTimer = 0.36;

                        let ejX = stolenBack.x - Math.sin(stolenBack.angle) * 28;
                        let ejY = stolenBack.y + Math.cos(stolenBack.angle) * 28;
                        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                            const ejCol = this.map.resolveCircleBuildingCollision(ejX, ejY, 10, p.z || 2.0, false);
                            ejX = ejCol.x;
                            ejY = ejCol.y;
                        }
                        p.x = ejX;
                        p.y = ejY;

                        stolenBack.driver = "AI_TRAFFIC";

                        stolenBack.doorOpenTimer = 0.48;
                        if (this.net) {
                            if (typeof this.net.broadcastWorldEvent === "function" && stolenBack.id) {
                                const sbFlags =
                                    (stolenBack.destroyed ? 1 : 0) |
                                    (stolenBack.sirenActive ? 2 : 0) |
                                    (stolenBack.frontDented ? 4 : 0) |
                                    (stolenBack.rearDented ? 8 : 0) |
                                    (stolenBack.heavyDented ? 16 : 0) |
                                    (stolenBack.fireExtinguished ? 128 : 0);
                                this.net.broadcastWorldEvent({
                                    kind: "VEH_EXIT",
                                    vehId: stolenBack.id,
                                    specKey: stolenBack.specKey || "MINT_STALLION",
                                    seat: prevSeat,
                                    x: Math.round(stolenBack.x),
                                    y: Math.round(stolenBack.y),
                                    z: Math.round((stolenBack.z || 2.0) * 100) / 100,
                                    a: Math.round((stolenBack.angle || 0) * 1000) / 1000,
                                    hp: Math.round(stolenBack.hp || 100),
                                    flags: sbFlags,
                                    remapIdx: stolenBack.remapIdx || 0
                                });
                            }
                            if (typeof this.net.broadcastStateNow === "function") {
                                this.net.broadcastStateNow();
                            }
                        }

                        ped._boardedVehicle = true;

                        ped.dead = true; // Driver is now back inside the vehicle

                        this.damagePlayer(8);

                        this.addFloatingText(stolenBack.x, stolenBack.y - 26, "🤬 CARJACKED BACK!", "#ef4444");

                        continue;

                    } else if (!p.inVehicle) {

                        this.damagePlayer(12 * dt);

                    }

                } else {

                    ped.kind = "CIVILIAN";

                }

            } else if (ped.kind === "MEDIC") {

                // On-Foot Paramedic AI: Runs from parked ambulance across sidewalks/beaches/parks to revive civilians or evacuate criminal corpses into the ambulance!

                ped.medicOutTimer = (ped.medicOutTimer || 0) + dt;

                if (!ped.homeAmbulance || ped.homeAmbulance._gridEpoch !== this._gridEpoch) {
                    let bestAmb = null;
                    let bestAmbDist = 820;
                    for (const v of this.vehicles) {
                        if (v && !v.destroyed && v.specKey === "MEDIC_AMBULANCE" && v.driver === "AI_EMERGENCY") {
                            const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                            if (d < bestAmbDist) {
                                bestAmbDist = d;
                                bestAmb = v;
                            }
                        }
                    }
                    if (bestAmb) {
                        ped.homeAmbulance = bestAmb;
                        bestAmb.deployedMedic = ped;
                    }
                }

                const amb = ped.homeAmbulance;

                if (!amb || amb.destroyed || amb.driver !== "AI_EMERGENCY") {

                    if (amb) amb.deployedMedic = null;
                    if (ped.carryingCorpse) ped.carryingCorpse = null;

                    ped._boardedVehicle = true;
                    ped.dead = true;

                    continue;

                }

                // Keep carried criminal corpse moving with the paramedic on the stretcher back to the ambulance
                if (ped.carryingCorpse) {
                    if (ped.carryingCorpse._gridEpoch !== this._gridEpoch) {
                        ped.carryingCorpse = null;
                    } else {
                        ped.carryingCorpse.x = ped.x - Math.cos(ped.angle) * 10;
                        ped.carryingCorpse.y = ped.y - Math.sin(ped.angle) * 10;
                        ped.carryingCorpse.z = ped.z || 2.0;
                        ped.carryingCorpse.angle = ped.angle;
                    }
                }

                let targetCorpse = null;

                let bestDist = 1850;

                if (!ped.carryingCorpse) {
                    for (const other of this.peds) {

                        if (

                            !other.dead ||

                            other.revived ||

                            other.unreachableForMedic ||

                            other.deathKind === "DROWNED"

                        ) {

                            continue;

                        }

                        if (Math.abs(other.x - amb.x) > 1850 || Math.abs(other.y - amb.y) > 1850) continue;
                        if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(other.x, other.y)) continue;

                        if (Math.hypot(other.x - amb.x, other.y - amb.y) > 1850) continue;

                        const d = Math.hypot(other.x - ped.x, other.y - ped.y);

                        if (d < bestDist) {

                            bestDist = d;

                            targetCorpse = other;

                        }

                    }
                }



                if (targetCorpse && ped.medicOutTimer < 30.0) {

                    if (bestDist < 28) {

                        ped.angle = Math.atan2(targetCorpse.y - ped.y, targetCorpse.x - ped.x);

                        // Step right up to the patient's chest (~12.5px) before kneeling down so the paramedic's hands reach the torso
                        if (bestDist > 13.0) {
                            const stepIn = Math.min(bestDist - 12.5, 76 * dt);
                            ped.x += Math.cos(ped.angle) * stepIn;
                            ped.y += Math.sin(ped.angle) * stepIn;
                        }
                        ped.speed = 0;
                        ped.isKneelingMedic = true;
                        ped.healingPatient = targetCorpse;

                        ped.healTimer = (ped.healTimer || 0) + dt;

                        ped.medicStuckTimer = 0;

                        const isCriminalOrBurnt = (
                            targetCorpse.kind === "CRIMINAL" ||
                            targetCorpse.kind === "HOSTILE" ||
                            targetCorpse.isCriminalNPC ||
                            targetCorpse.deathKind === "BURNT"
                        );

                        if (ped.healTimer >= (isCriminalOrBurnt ? 1.4 : 1.8)) {

                            ped.healTimer = 0;

                            if (isCriminalOrBurnt) {
                                // Evacuate dead criminal / hostile body back to the ambulance instead of reviving them on the street!
                                targetCorpse.revived = true;
                                ped.carryingCorpse = targetCorpse;
                                if (this.net) {
                                    if (typeof this.net.broadcastCorpseCleared === "function") {
                                        this.net.broadcastCorpseCleared(targetCorpse);
                                    }
                                    if (typeof this.net.broadcastWorldEvent === "function") {
                                        this.net.broadcastWorldEvent({
                                            kind: "PED_REVIVE",
                                            pedId: targetCorpse.id,
                                            x: Math.round(targetCorpse.x),
                                            y: Math.round(targetCorpse.y),
                                            evacuated: true
                                        });
                                    }
                                }
                                this.addFloatingText(targetCorpse.x, targetCorpse.y - 22, "🚑 EVACUATING CRIMINAL BODY!", "#38bdf8");
                            } else {
                                targetCorpse.dead = false;

                                targetCorpse.deadTimer = 0;

                                targetCorpse.revived = true;
                                targetCorpse._corpsePersisted = false;
                                targetCorpse.deathKind = null;

                                targetCorpse.hp = 35;

                                targetCorpse.speed = 36;

                                targetCorpse.stunnedTimer = 0;

                                targetCorpse.burnTimer = 0;

                                targetCorpse.electroTimer = 0;

                                targetCorpse.drownTimer = 0;

                                targetCorpse.panicTimer = 4.0;
                                if (this.net) {
                                    if (typeof this.net.broadcastCorpseCleared === "function") {
                                        this.net.broadcastCorpseCleared(targetCorpse);
                                    }
                                    if (typeof this.net.broadcastWorldEvent === "function") {
                                        this.net.broadcastWorldEvent({
                                            kind: "PED_REVIVE",
                                            pedId: targetCorpse.id,
                                            x: Math.round(targetCorpse.x),
                                            y: Math.round(targetCorpse.y),
                                            evacuated: false
                                        });
                                    }
                                }

                                for (let k = 0; k < 5; k++) {

                                    this.spawnParticle(

                                        targetCorpse.x + (Math.random() - 0.5) * 14,

                                        targetCorpse.y + (Math.random() - 0.5) * 14,

                                        "SPARK"

                                    );

                                }

                                this.addFloatingText(targetCorpse.x, targetCorpse.y - 22, "🚑 MEDIC REVIVED!", "#38bdf8");
                            }

                        }

                    } else {

                        ped.healTimer = 0;
                        ped.isKneelingMedic = false;
                        ped.healingPatient = null;
                        ped.speed = 96;

                        if (ped.medicTarget !== targetCorpse) {

                            ped.medicTarget = targetCorpse;

                            ped.lastBestDist = 9999;

                            ped.medicStuckTimer = 0;

                            ped.detourTimer = 0;

                        }

                        if ((ped.detourTimer || 0) > 0) {

                            // Side-step detour around a shoreline corner / wall that blocked the direct path

                            ped.detourTimer -= dt;

                            ped.angle = ped.detourAngle;

                        } else {

                            const mdWp = (typeof PedNav !== "undefined" && typeof PedNav.routeWaypoint === "function") ? PedNav.routeWaypoint(this, ped, targetCorpse.x, targetCorpse.y) : null;
                            ped.angle = this.steerPedWithObstacleFeelers(ped, mdWp ? mdWp.x : targetCorpse.x, mdWp ? mdWp.y : targetCorpse.y);

                        }

                        ped.x += Math.cos(ped.angle) * 96 * dt;

                        ped.y += Math.sin(ped.angle) * 96 * dt;

                        if (bestDist < (ped.lastBestDist || 9999) - 2) {

                            ped.lastBestDist = bestDist;

                            ped.medicStuckTimer = 0;

                        } else {

                            ped.medicStuckTimer = (ped.medicStuckTimer || 0) + dt;

                            if (ped.medicStuckTimer > 1.6 && (ped.detourTimer || 0) <= 0) {

                                const direct = Math.atan2(targetCorpse.y - ped.y, targetCorpse.x - ped.x);

                                ped.detourSign = -(ped.detourSign || 1);

                                ped.detourAngle = direct + ped.detourSign * Math.PI * 0.5;

                                ped.detourTimer = 1.3;

                            }

                            if (ped.medicStuckTimer > 18.0) {

                                targetCorpse.unreachableForMedic = true;

                                ped.medicStuckTimer = 0;

                                ped.lastBestDist = 9999;

                            }

                        }

                    }

                } else {

                    // Jog back to the ambulance (carrying a criminal corpse if any) and load / climb in!
                    ped.isKneelingMedic = false;
                    ped.healingPatient = null;
                    ped.speed = 96;

                    ped._boardingVeh = amb;

                    const dAmb = Math.hypot(amb.x - ped.x, amb.y - ped.y);

                    const ambBoardDist = Math.max(42, (amb.w || 62) * 0.52 + 10);

                    if (dAmb < ambBoardDist || ped.medicOutTimer > 34.0) {

                        amb.doorOpenTimer = 0.45;

                        if (ped.carryingCorpse) {
                            ped.carryingCorpse._boardedVehicle = true;
                            ped.carryingCorpse = null;
                            this.addFloatingText(amb.x, amb.y - 24, "🚑 BODY LOADED IN AMBULANCE!", "#38bdf8");
                        }

                        // Check if more casualties remain nearby before climbing back into the cab
                        const hasMoreCasualties = ped.medicOutTimer < 28.0 && this.peds.some((other) => (
                            other.dead &&
                            !other.revived &&
                            !other._boardedVehicle &&
                            !other.unreachableForMedic &&
                            other.deathKind !== "DROWNED" &&
                            !(this.map.isWaterAtPixel && this.map.isWaterAtPixel(other.x, other.y)) &&
                            Math.hypot(other.x - amb.x, other.y - amb.y) <= 760
                        ));

                        if (hasMoreCasualties) {
                            ped._boardingVeh = null;
                            ped.medicOutTimer = Math.min(ped.medicOutTimer, 10.0);
                            continue;
                        }

                        amb.deployedMedic = null;

                        ped._boardedVehicle = true;

                        ped.dead = true;

                        continue;

                    }

                    const mdBackWp = (typeof PedNav !== "undefined" && typeof PedNav.routeWaypoint === "function") ? PedNav.routeWaypoint(this, ped, amb.x, amb.y) : null;
                    ped.angle = this.steerPedWithObstacleFeelers(ped, mdBackWp ? mdBackWp.x : amb.x, mdBackWp ? mdBackWp.y : amb.y, amb);

                    ped.x += Math.cos(ped.angle) * 98 * dt;

                    ped.y += Math.sin(ped.angle) * 98 * dt;

                }

                if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                    const mdCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 9, ped.z || 2.0);
                    if (mdCol.hit) {
                        ped.x = mdCol.x;
                        ped.y = mdCol.y;
                    }
                    ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);
                }

            } else if (ped.kind === "FIREMAN") {

                // On-Foot VCFD Firefighter AI: Advances from parked Fire Engine with high-pressure hose nozzle to extinguish burning vehicles, wrecks & burning peds!

                ped.firemanOutTimer = (ped.firemanOutTimer || 0) + dt;

                if (!ped.homeFireTruck || ped.homeFireTruck._gridEpoch !== this._gridEpoch) {
                    let bestFt = null;
                    let bestFtDist = 480;
                    for (const v of this.vehicles) {
                        if (
                            v &&
                            !v.destroyed &&
                            v.specKey === "FIRE_TRUCK" &&
                            v.driver === "AI_EMERGENCY" &&
                            (!v.deployedFireman || v.deployedFireman === ped)
                        ) {
                            const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                            if (d < bestFtDist) {
                                bestFtDist = d;
                                bestFt = v;
                            }
                        }
                    }
                    if (bestFt) {
                        ped.homeFireTruck = bestFt;
                        bestFt.deployedFireman = ped;
                    }
                }

                const ft = ped.homeFireTruck;

                if (!ft || ft.destroyed || ft.driver !== "AI_EMERGENCY" || (ft.deployedFireman && ft.deployedFireman !== ped)) {

                    if (ft && ft.deployedFireman === ped) ft.deployedFireman = null;

                    ped.sprayingHose = false;

                    ped._boardedVehicle = true;

                    ped.dead = true;

                    continue;

                }

                let targetFire = null;

                let isPedTarget = false;

                let bestDist = 760;

                for (const v of this.vehicles) {

                    if (v === ft || v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") continue;
                    if (Math.abs(v.x - ft.x) > 760 || Math.abs(v.y - ft.y) > 760) continue;

                    if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(v.x, v.y)) continue;

                    const isLiveBurning = !v.destroyed && ((v.burnTimer || 0) > 0 || v.hp <= 50);

                    const isBurningWreck = v.destroyed && !v.fireExtinguished;

                    if (!isLiveBurning && !isBurningWreck) continue;

                    if (Math.hypot(v.x - ft.x, v.y - ft.y) > 760) continue;

                    const d = Math.hypot(v.x - ped.x, v.y - ped.y);

                    if (d < bestDist) {

                        bestDist = d;

                        targetFire = v;

                        isPedTarget = false;

                    }

                }

                for (const other of this.peds) {

                    if (other === ped || other.dead || (other.burnTimer || 0) <= 0) continue;
                    if (Math.abs(other.x - ft.x) > 620 || Math.abs(other.y - ft.y) > 620) continue;

                    if (Math.hypot(other.x - ft.x, other.y - ft.y) > 620) continue;

                    const d = Math.hypot(other.x - ped.x, other.y - ped.y);

                    if (d < bestDist) {

                        bestDist = d;

                        targetFire = other;

                        isPedTarget = true;

                    }

                }

                if (targetFire && ped.firemanOutTimer < 38.0) {

                    const hasFireLOS = !this.map.traceSegment2D || !this.map.traceSegment2D(ped.x, ped.y, targetFire.x, targetFire.y, ped.z || 2.0).hit;
                    const maxHoseReach = (ped.firemanStuckTimer || 0) > 0.8 ? 190 : 142;

                    if (bestDist < maxHoseReach && hasFireLOS) {

                        ped.angle = Math.atan2(targetFire.y - ped.y, targetFire.x - ped.x);
                        // Maintain safe 52px thermal standoff from an unexploded burning car so firefighter never stands inside the flames!
                        if (!isPedTarget && !targetFire.destroyed && bestDist < 52) {
                            const backStep = 34 * dt;
                            const bx = ped.x - Math.cos(ped.angle) * backStep;
                            const by = ped.y - Math.sin(ped.angle) * backStep;
                            if (!this.map.resolveCircleBuildingCollision || !this.map.resolveCircleBuildingCollision(bx, by, 8, ped.z || 2.0).hit) {
                                ped.x = bx;
                                ped.y = by;
                            }
                        }

                        ped.speed = 0;

                        ped.sprayingHose = true;

                        ped.firemanStuckTimer = 0;

                        const nozX = ped.x + Math.cos(ped.angle) * 12;

                        const nozY = ped.y + Math.sin(ped.angle) * 12;

                        const distFromNozzle = Math.max(18, Math.hypot(targetFire.x - nozX, targetFire.y - nozY) - (isPedTarget ? 4 : 12));

                        this.emitPressurizedWaterJet(nozX, nozY, ped.angle, distFromNozzle, false, targetFire, { sourceVeh: ft });

                        if (Math.random() < 0.55) {

                            this.spawnParticle(

                                targetFire.x + (Math.random() - 0.5) * 22,

                                targetFire.y + (Math.random() - 0.5) * 22,

                                "WHITE_SMOKE"

                            );

                        }

                        if (isPedTarget) {

                            targetFire.extinguishProgress = (targetFire.extinguishProgress || 0) + dt;

                            targetFire.burnTimer = Math.max(targetFire.burnTimer || 0.8, 0.8);

                            targetFire.hp = Math.max(targetFire.hp || 35, 35);

                            if (targetFire.extinguishProgress >= 1.8) {

                                targetFire.burnTimer = 0;

                                targetFire.extinguishProgress = 0;

                                targetFire.hp = Math.max(targetFire.hp || 45, 45);

                                this.addFloatingText(targetFire.x, targetFire.y - 22, "🚒 CITIZEN EXTINGUISHED!", "#38bdf8");

                            }

                        } else {

                            targetFire.extinguishProgress = (targetFire.extinguishProgress || 0) + dt * 0.85;

                            if (!targetFire.destroyed) {

                                targetFire.chainExplodeTimer = 0;

                                if ((targetFire.burnTimer || 0) > 0) {

                                    targetFire.burnTimer = Math.max(targetFire.burnTimer, 1.5);

                                }

                                if (targetFire.extinguishProgress >= 3.2) {

                                    targetFire.hp = Math.min(targetFire.maxHp, Math.max(targetFire.hp + 48 * dt, 58));

                                    targetFire.burnTimer = 0;

                                    targetFire.extinguishProgress = 0;

                                    if (!targetFire._vcfdSavedMsg) {

                                        targetFire._vcfdSavedMsg = true;

                                        this.addFloatingText(targetFire.x, targetFire.y - 24, "🚒 VCFD — FIRE EXTINGUISHED!", "#38bdf8");

                                    }

                                }

                            } else if (targetFire.extinguishProgress >= 4.5 && !targetFire.fireExtinguished) {

                                targetFire.fireExtinguished = true;

                                targetFire.burnTimer = 0;

                                this.addFloatingText(targetFire.x, targetFire.y - 24, "🚒 VCFD — FIRE EXTINGUISHED!", "#38bdf8");
                                if (this.net && typeof this.net.broadcastWorldEvent === "function" && targetFire.id) {
                                    this.net.broadcastWorldEvent({
                                        kind: "VEH_EXIT",
                                        vehId: targetFire.id,
                                        specKey: targetFire.specKey || "MINT_STALLION",
                                        x: Math.round(targetFire.x),
                                        y: Math.round(targetFire.y),
                                        z: Math.round((targetFire.z || 2.0) * 100) / 100,
                                        a: Math.round((targetFire.angle || 0) * 1000) / 1000,
                                        hp: 0,
                                        flags: 1 | 128,
                                        remapIdx: targetFire.remapIdx || 0
                                    });
                                }

                            }

                        }

                    } else {

                        ped.sprayingHose = false;

                        ped.speed = 98;

                        if (ped.fireTarget !== targetFire) {

                            ped.fireTarget = targetFire;

                            ped.lastBestDist = 9999;

                            ped.firemanStuckTimer = 0;

                            ped.detourTimer = 0;

                        }

                        if ((ped.detourTimer || 0) > 0) {

                            ped.detourTimer -= dt;

                            ped.angle = ped.detourAngle;

                        } else {

                            const fmWp = (typeof PedNav !== "undefined" && typeof PedNav.routeWaypoint === "function") ? PedNav.routeWaypoint(this, ped, targetFire.x, targetFire.y) : null;
                            ped.angle = this.steerPedWithObstacleFeelers(ped, fmWp ? fmWp.x : targetFire.x, fmWp ? fmWp.y : targetFire.y, isPedTarget ? null : targetFire);

                        }

                        ped.x += Math.cos(ped.angle) * 98 * dt;

                        ped.y += Math.sin(ped.angle) * 98 * dt;

                        if (bestDist < (ped.lastBestDist || 9999) - 2) {

                            ped.lastBestDist = bestDist;

                            ped.firemanStuckTimer = 0;

                        } else {

                            ped.firemanStuckTimer = (ped.firemanStuckTimer || 0) + dt;

                            if (ped.firemanStuckTimer > 1.5 && (ped.detourTimer || 0) <= 0) {

                                const direct = Math.atan2(targetFire.y - ped.y, targetFire.x - ped.x);

                                ped.detourSign = -(ped.detourSign || 1);

                                ped.detourAngle = direct + ped.detourSign * Math.PI * 0.5;

                                ped.detourTimer = 1.25;

                            }

                        }

                    }

                } else {

                    // All fires extinguished — reel in the hose point-by-point along _hoseTrail and climb back into the VCFD Fire Engine!

                    ped.sprayingHose = false;

                    ped.speed = 104;

                    ped._boardingVeh = ft;

                    const fcosB = Math.cos(ft.angle || 0), fsinB = Math.sin(ft.angle || 0);
                    const bedGoalX = ft.x - fcosB * ((ft.w || 66) * 0.5) - fsinB * 5;
                    const bedGoalY = ft.y - fsinB * ((ft.w || 66) * 0.5) + fcosB * 5;
                    const dFt = Math.min(Math.hypot(ft.x - ped.x, ft.y - ped.y), Math.hypot(bedGoalX - ped.x, bedGoalY - ped.y));

                    const ftBoardDist = Math.max(58, (ft.w || 66) * 0.58 + 16);

                    if (dFt < ftBoardDist || ped.firemanOutTimer > 42.0 || Math.abs(ft.speed || 0) > 42) {

                        ft.doorOpenTimer = 0.45;

                        ft.deployedFireman = null;

                        ft._parkedAtFireScene = false;

                        ped._boardedVehicle = true;

                        ped.dead = true;

                        continue;

                    }

                    let goalX = bedGoalX;
                    let goalY = bedGoalY;
                    if (Array.isArray(ped._hoseTrail) && ped._hoseTrail.length > 1) {
                        while (
                            ped._hoseTrail.length > 1 &&
                            Math.hypot(ped.x - ped._hoseTrail[ped._hoseTrail.length - 1].x, ped.y - ped._hoseTrail[ped._hoseTrail.length - 1].y) < 22
                        ) {
                            ped._hoseTrail.pop();
                        }
                        const pt = ped._hoseTrail[ped._hoseTrail.length - 1];
                        if (pt) {
                            goalX = pt.x;
                            goalY = pt.y;
                        }
                    }

                    const hasDirectBackLOS = !this.map.traceSegment2D || !this.map.traceSegment2D(ped.x, ped.y, goalX, goalY, ped.z || 2.0).hit;
                    if (hasDirectBackLOS) {
                        ped.angle = Math.atan2(goalY - ped.y, goalX - ped.x);
                    } else {
                        const fmBackWp = (typeof PedNav !== "undefined" && typeof PedNav.routeWaypoint === "function") ? PedNav.routeWaypoint(this, ped, goalX, goalY) : null;
                        ped.angle = this.steerPedWithObstacleFeelers(ped, fmBackWp ? fmBackWp.x : goalX, fmBackWp ? fmBackWp.y : goalY, ft);
                    }

                    ped.x += Math.cos(ped.angle) * 104 * dt;

                    ped.y += Math.sin(ped.angle) * 104 * dt;

                }

                // Resolve building collision before recording the hose trail so hose vertices always stay clear of walls/corners
                const fmBldCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 10, ped.z || 2.0);
                if (fmBldCol.hit) {
                    ped.x = fmBldCol.x;
                    ped.y = fmBldCol.y;
                }

                // The attack line lies on the ground exactly where the firefighter WALKED (it can never cut through a building),
                // is reeled back in when he retraces his steps, and is limited to 200 ft (~780 px) of hose.
                {
                    const HOSE_MAX_PX = 770;
                    const fcosT = Math.cos(ft.angle || 0), fsinT = Math.sin(ft.angle || 0);
                    let bedX = ft.x - fcosT * ((ft.w || 66) * 0.5) - fsinT * 5;
                    let bedY = ft.y - fsinT * ((ft.w || 66) * 0.5) + fcosT * 5;
                    const bedCol = this.map.resolveCircleBuildingCollision(bedX, bedY, 8, ped.z || 2.0);
                    if (bedCol.hit) {
                        bedX = bedCol.x;
                        bedY = bedCol.y;
                    }
                    let trail = ped._hoseTrail;
                    if (!trail || trail.truck !== ft) {
                        trail = [{ x: bedX, y: bedY }];
                        trail.truck = ft;
                        ped._hoseTrail = trail;
                    }
                    trail[0].x = bedX;
                    trail[0].y = bedY;
                    // Reel in: stepping back onto an earlier part of the hose retracts everything beyond it (only if unobstructed)
                    for (let ti = trail.length - 3; ti >= Math.max(0, trail.length - 45); ti--) {
                        if (Math.hypot(ped.x - trail[ti].x, ped.y - trail[ti].y) < 13 &&
                            (!this.map.traceSegment2D || !this.map.traceSegment2D(ped.x, ped.y, trail[ti].x, trail[ti].y, ped.z || 2.0).hit)) {
                            trail.length = ti + 1;
                            break;
                        }
                    }
                    const lastP = trail[trail.length - 1];
                    if (Math.hypot(ped.x - lastP.x, ped.y - lastP.y) > 8) {
                        // Length of hose already laid out (+ the new bit up to the firefighter)
                        let laid = 0;
                        for (let ti = 1; ti < trail.length; ti++) laid += Math.hypot(trail[ti].x - trail[ti - 1].x, trail[ti].y - trail[ti - 1].y);
                        laid += Math.hypot(ped.x - lastP.x, ped.y - lastP.y);
                        if (laid > HOSE_MAX_PX) {
                            // Out of hose: he is pulled up short on the spot where the line ends
                            ped.x = lastP.x;
                            ped.y = lastP.y;
                        } else {
                            trail.push({ x: ped.x, y: ped.y });
                        }
                    }
                }

            } else {

                // Private Estate Security / Villa Bodyguard AI:
                // Patrols calmly until attacked, shot at, or the villa alarm is tripped, then draws weapon & engages!
                if (ped.isVillaGuard) {
                    if (ped.hp < ped.maxHp || (ped.panicTimer || 0) > 0 || (ped.stunnedTimer || 0) > 0) {
                        ped.isAlertedGuard = true;
                        ped.panicTimer = 0;
                    }
                    if (ped.isAlertedGuard && !p.dead && !this.activeInterior) {
                        const targetEnt = p.inVehicle || p;
                        const dPlayer = Math.hypot(targetEnt.x - ped.x, targetEnt.y - ped.y);
                        const postX = ped.guardBaseX !== undefined ? ped.guardBaseX : ped.x;
                        const postY = ped.guardBaseY !== undefined ? ped.guardBaseY : ped.y;
                        const dPost = Math.hypot(targetEnt.x - postX, targetEnt.y - postY);
                        if (dPlayer < 360 && dPost < 440) {
                            const aimAng = Math.atan2(targetEnt.y - ped.y, targetEnt.x - ped.x);
                            if (dPlayer > 82) {
                                const moveAng = typeof this.steerPedWithObstacleFeelers === "function"
                                    ? this.steerPedWithObstacleFeelers(ped, targetEnt.x, targetEnt.y, null)
                                    : aimAng;
                                ped.angle = aimAng;
                                ped.speed = 74;
                                ped.x += Math.cos(moveAng) * 74 * dt;
                                ped.y += Math.sin(moveAng) * 74 * dt;
                                const gCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 8, ped.z || 2.0);
                                if (gCol.hit) {
                                    ped.x = gCol.x;
                                    ped.y = gCol.y;
                                }
                                const vCol = this.resolveCircleVehicleCollision(ped.x, ped.y, 7.5, ped.z || 2.0, null);
                                if (vCol.hit) {
                                    ped.x = vCol.x;
                                    ped.y = vCol.y;
                                }
                                ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);
                            } else {
                                ped.angle = aimAng;
                                ped.speed = 0;
                            }
                            ped.shootCooldown = Math.max(0, (ped.shootCooldown || 0) - dt);
                            if (dPlayer < 275 && ped.shootCooldown <= 0) {
                                ped.shootCooldown = 0.72 + Math.random() * 0.22;
                                if (this.hasLineOfSight(ped.x, ped.y, targetEnt.x, targetEnt.y, ped.z || 2.0)) {
                                    ped.muzzleTimer = 0.09;
                                    this.fireWeapon(ped.x, ped.y, aimAng + (Math.random() - 0.5) * 0.12, ped.copWeapon || "PISTOL", false, false, "CRIMINAL");
                                }
                            }
                        } else {
                            ped.isAlertedGuard = false;
                            const dBack = Math.hypot(postX - ped.x, postY - ped.y);
                            if (dBack > 14) {
                                ped.angle = Math.atan2(postY - ped.y, postX - ped.x);
                                ped.speed = 38;
                                ped.x += Math.cos(ped.angle) * 38 * dt;
                                ped.y += Math.sin(ped.angle) * 38 * dt;
                                const rgCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 8, ped.z || 2.0);
                                if (rgCol.hit) {
                                    ped.x = rgCol.x;
                                    ped.y = rgCol.y;
                                }
                                ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);
                            } else {
                                ped.speed = 0;
                            }
                        }
                    }
                    continue;
                }
                // Exact Port of 1997 GTA 1 AiCharacterController::UpdateWandering / ChooseWalkWaypoint / ContinueWalkToWaypoint

                // (AiCharacterController.cpp lines 250-365): Pedestrians stay strictly on PAWEMENT / FIELD blocks!

                if (ped.panicTimer > 0) ped.panicTimer = Math.max(0, ped.panicTimer - dt);

                // Real-Life 911 Witness Reporting:
                // If a civilian witness is dialing 911 and survives without being stunned/killed, they transmit the crime scene coordinates to VCPD Dispatch!
                if ((ped.calling911Timer || 0) > 0) {
                    if ((ped.stunnedTimer || 0) > 0 || (ped.electroTimer || 0) > 0 || (ped.burnTimer || 0) > 0 || (ped.drownTimer || 0) > 0) {
                        if (this.director && typeof this.director.abortWitness911Call === "function") {
                            this.director.abortWitness911Call(ped, false);
                        } else {
                            ped.calling911Timer = 0;
                            ped.calling911Stars = 0;
                            ped.calling911Pos = null;
                            ped.calling911Veh = null;
                        }
                    } else {
                        ped.calling911Timer -= dt;
                        if (ped.calling911Timer <= 0) {
                            const repStars = ped.calling911Stars || 1;
                            const repPos = ped.calling911Pos || { x: ped.x, y: ped.y };
                            const repVeh = ped.calling911Veh !== undefined ? ped.calling911Veh : null;
                            ped.calling911Timer = 0;
                            ped.calling911Stars = 0;
                            ped.calling911Pos = null;
                            ped.calling911Veh = null;
                            ped._isCarjackVictimCaller = false;
                            if (this.director && this.director.blackboard) {
                                this.director.blackboard.total911CallsCompleted++;
                            }
                            if (this.player && !this.player.dead) {
                                this.setWantedLevel(Math.max(this.wantedLevel || 0, repStars), repPos, false, repVeh);
                                const nowMs = performance.now();
                                if (nowMs - (this._last911DispatchedAt || 0) > 2500) {
                                    this._last911DispatchedAt = nowMs;
                                    this.addFloatingText(ped.x, ped.y - 24, "📡 911 CALL RECEIVED — DISPATCHING VCPD!", "#38bdf8");
                                }
                            }
                        }
                    }
                }
                // Habituation: a pedestrian who has been scared for 9+ continuous seconds calms down (and ignores lingering
                // hazards such as a parked damaged car) for 18s instead of fleeing back and forth forever.
                if ((ped._panicCalmCooldown || 0) > 0) ped._panicCalmCooldown = Math.max(0, ped._panicCalmCooldown - dt);
                if (ped.panicTimer > 0 && ped.kind === "CIVILIAN") {
                    ped._panicRun = (ped._panicRun || 0) + dt;
                    if (ped._panicRun > 9.0) {
                        ped.panicTimer = 0;
                        ped._panicRun = 0;
                        ped._panicCalmCooldown = 18.0;
                        ped._panicInherited = false;
                        ped.targetBx = null;
                        ped.targetBy = null;
                    }
                } else {
                    ped._panicRun = 0;
                }



                // Opportunistic Vice City street thief: only dedicated muggers walking near an abandoned unlocked road car steal it and drive off!
                const isStreetThiefType = ped.g24Type === "g2_mugger";
                let pursuingStealCar = false;
                if (isStreetThiefType && (ped.burnTimer || 0) <= 0 && !ped.isLivingProp) {
                    let stealTarget = null;
                    let bestStealDist = 115;
                    if (this._vehGridHead && this._vehGridNext) {
                        const vHead = this._vehGridHead;
                        const vNext = this._vehGridNext;
                        const cx0 = Math.max(0, (ped.x >> 8) - 1);
                        const cx1 = Math.min(127, (ped.x >> 8) + 1);
                        const cy0 = Math.max(0, (ped.y >> 8) - 1);
                        const cy1 = Math.min(127, (ped.y >> 8) + 1);
                        for (let cy = cy0; cy <= cy1; cy++) {
                            const rowOff = cy << 7;
                            for (let cx = cx0; cx <= cx1; cx++) {
                                for (let vi = vHead[rowOff | cx]; vi !== -1; vi = vNext[vi]) {
                                    const v = this.vehicles[vi];
                                    if (
                                        v &&
                                        !v.destroyed &&
                                        !v.waterOnly &&
                                        v.driver === null &&
                                        !v.towedByTruck &&
                                        !v.isStaticParked &&
                                        !v.isEstateCar &&
                                        !v.missionTag &&
                                        !v.isPolice &&
                                        !v.isEmergency &&
                                        (v.abandonedTimer || 0) > (v.lastPlayerDriven ? 75.0 : 22.0) &&
                                        Math.hypot(v.x - p.x, v.y - p.y) > 135
                                    ) {
                                        const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                                        if (d < bestStealDist) {
                                            bestStealDist = d;
                                            stealTarget = v;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (stealTarget) {
                        ped._boardingVeh = stealTarget;
                        const stealBoardDist = Math.max(38, (stealTarget.w || 48) * 0.52 + 10);
                        if (bestStealDist < stealBoardDist) {
                            stealTarget.driver = "AI_TRAFFIC";
                            stealTarget.aiPanicTimer = 6.0;
                            stealTarget.doorOpenTimer = 0.44;
                            this.addFloatingText(stealTarget.x, stealTarget.y - 22, "🚗 ABANDONED CAR STOLEN!", "#facc15");
                            ped._boardedVehicle = true;
                            ped.dead = true;
                            continue;
                        }
                        ped.angle = this.steerPedWithObstacleFeelers(ped, stealTarget.x, stealTarget.y, stealTarget);
                        ped.x += Math.cos(ped.angle) * 84 * dt;
                        ped.y += Math.sin(ped.angle) * 84 * dt;
                        pursuingStealCar = true;
                    }
                }

                if (!pursuingStealCar) {
                if ((ped.crosswalkCooldown || 0) > 0) {
                    ped.crosswalkCooldown = Math.max(0, ped.crosswalkCooldown - dt);
                }
                if ((ped._shoutCooldown || 0) > 0) {
                    ped._shoutCooldown = Math.max(0, ped._shoutCooldown - dt);
                }
                if ((ped.dodgeTimer || 0) > 0) {
                    ped.dodgeTimer = Math.max(0, ped.dodgeTimer - dt);
                }
                if ((ped.socialCooldown || 0) > 0) {
                    ped.socialCooldown = Math.max(0, ped.socialCooldown - dt);
                }
                if ((ped.taxiHailCooldown || 0) > 0) {
                    ped.taxiHailCooldown = Math.max(0, ped.taxiHailCooldown - dt);
                }

                if (!ped.baseWalkSpeed || ped.baseWalkSpeed <= 0 || ped.baseWalkSpeed > 54) {
                    ped.baseWalkSpeed = ped.isRollerblader
                        ? 46
                        : (ped.g24Type === "vc_jogger" ? 39 : (ped.isChild ? 22 : 24));
                }
                const baseWalkSpd = ped.kind === "COP" ? 26 : ped.baseWalkSpeed;
                const bx = Math.floor(ped.x / TILE_SIZE);
                const by = Math.floor(ped.y / TILE_SIZE);
                const pz = ped.z !== undefined ? ped.z : 2.0;

                // 1) Burning Vehicle Hazard Evasion + Predictive Oncoming Speeding Vehicle Evasion (Dive / Sidestep Reflex):
                const hazList = this._hazardVehicles || this.vehicles;
                if (Array.isArray(hazList)) {
                    for (let vi = 0; vi < hazList.length; vi++) {
                        const v = hazList[vi];
                        if (!v) continue;
                        if (v.z !== undefined && Math.abs(v.z - pz) > 0.85) continue;
                        const dx = ped.x - v.x;
                        const dy = ped.y - v.y;
                        if (Math.abs(dx) > 135 || Math.abs(dy) > 135) continue;

                        // A. Burning / About-to-Explode Vehicle Hazard Evasion (< 130px)
                        const isBurningCar = Boolean(
                            (v.burnTimer || 0) > 0 ||
                            (!v.destroyed && typeof v.hp === "number" && v.hp <= 42 && v.specKey !== "BMX_BIKE" && v.specKey !== "E_SCOOTER")
                        );
                        if (isBurningCar && Math.hypot(dx, dy) < 130 && (ped._panicCalmCooldown || 0) <= 0) {
                            ped.panicTimer = Math.max(ped.panicTimer || 0, 4.5);
                            ped.threatX = v.x;
                            ped.threatY = v.y;
                            ped.waitingAtCrosswalk = false;
                            ped.socialTimer = 0;
                            ped.hailingTaxiTimer = 0;
                            ped._hailingTaxi = null;
                            if ((ped._shoutCooldown || 0) <= 0 && Math.random() < 0.25) {
                                ped._shoutCooldown = 6.0;
                                this.addFloatingText(ped.x, ped.y - 20, "🔥 IT'S GONNA BLOW!", "#fb923c");
                            }
                            break;
                        }

                        // B. Oncoming Speeding Vehicle & Off-Road Emergency Siren Sidestep Reflex
                        if (v.destroyed || (ped.dodgeTimer || 0) > 0) continue;
                        const vSpd = Math.abs(v.speed || 0);
                        const isSirenUnit = Boolean(v.sirenActive);
                        if (vSpd < (isSirenUnit ? 28 : 62)) continue;
                        const vCos = Math.cos(v.angle || 0);
                        const vSin = Math.sin(v.angle || 0);
                        const fwdProj = dx * vCos + dy * vSin;
                        const latProj = -dx * vSin + dy * vCos;
                        const dangerCorridor = (v.h || 24) * 0.5 + (isSirenUnit ? 28 : 15);
                        const maxLookFwd = isSirenUnit ? 175 : 115;
                        if (fwdProj > 10 && fwdProj < maxLookFwd && Math.abs(latProj) < dangerCorridor && (isSirenUnit || (fwdProj / Math.max(1, vSpd)) < 1.15)) {
                            const sideSign = latProj >= 0 ? 1 : -1;
                            let dodgeAng = (v.angle || 0) + sideSign * Math.PI * 0.5;
                            // Prefer dodging toward the nearest PAWEMENT/FIELD sidewalk if one side is sidewalk
                            const testX1 = ped.x + Math.cos(dodgeAng) * 26;
                            const testY1 = ped.y + Math.sin(dodgeAng) * 26;
                            const altAng = (v.angle || 0) - sideSign * Math.PI * 0.5;
                            const testX2 = ped.x + Math.cos(altAng) * 26;
                            const testY2 = ped.y + Math.sin(altAng) * 26;
                            const gt1 = this.map.getGroundTypeAt ? this.map.getGroundTypeAt(testX1, testY1) : GROUND_TYPE.PAWEMENT;
                            const gt2 = this.map.getGroundTypeAt ? this.map.getGroundTypeAt(testX2, testY2) : GROUND_TYPE.PAWEMENT;
                            if (gt1 === GROUND_TYPE.ROAD && (gt2 === GROUND_TYPE.PAWEMENT || gt2 === GROUND_TYPE.FIELD)) {
                                dodgeAng = altAng;
                            }
                            ped.dodgeTimer = 0.68;
                            ped.dodgeAngle = dodgeAng;
                            if ((ped._panicCalmCooldown || 0) <= 0) ped.panicTimer = Math.max(ped.panicTimer || 0, 2.8);
                            ped.threatX = v.x;
                            ped.threatY = v.y;
                            ped.isCrossingRoad = false;
                            ped.waitingAtCrosswalk = false;
                            ped.socialTimer = 0;
                            ped.hailingTaxiTimer = 0;
                            if (v.driver === "PLAYER" && (ped._shoutCooldown || 0) <= 0 && Math.random() < 0.35) {
                                ped._shoutCooldown = 5.0;
                                this.addFloatingText(ped.x, ped.y - 20, Math.random() < 0.5 ? "😱 WATCH IT!" : "⚠️ HEY!", "#fde047");
                            }
                            break;
                        }
                    }
                }

                // 1B) Player Aimed Firearm Threat & Vehicle Horn Reaction
                if (ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0 && (ped.surrenderTimer || 0) <= 0 && !this.activeInterior) {
                    const pl = this.player;
                    if (pl && !pl.inVehicle && pl.weapon && pl.weapon !== "FIST" && (this.input.shoot || (pl.weaponDrawnTimer || 0) > 0.25)) {
                        const dxP = ped.x - pl.x;
                        const dyP = ped.y - pl.y;
                        const distP = Math.hypot(dxP, dyP);
                        if (distP > 10 && distP < 135) {
                            const toPedAng = Math.atan2(dyP, dxP);
                            const angDiff = Math.abs(Math.atan2(Math.sin(toPedAng - pl.angle), Math.cos(toPedAng - pl.angle)));
                            if (angDiff < 0.42) {
                                ped.activityTimer = 0;
                                ped.hangoutTimer = 0;
                                if (distP < 92 && !ped._intimidatedOnce && this.director && typeof this.director.tryIntimidateStreetPed === "function") {
                                    this.director.tryIntimidateStreetPed(92);
                                    if ((ped.surrenderTimer || 0) > 0) continue;
                                } else if (ped.personality === "BRAVE" && !ped.isChild && !ped.missionTag) {
                                    ped.kind = "HOSTILE";
                                    ped.baseWalkSpeed = 34;
                                    if ((ped._shoutCooldown || 0) <= 0) {
                                        ped._shoutCooldown = 6.0;
                                        this.addFloatingText(ped.x, ped.y - 20, "👊 BIG MISTAKE!", "#ef4444");
                                    }
                                } else {
                                    ped.panicTimer = 4.2;
                                    ped.threatX = pl.x;
                                    ped.threatY = pl.y;
                                    if ((ped._shoutCooldown || 0) <= 0) {
                                        ped._shoutCooldown = 5.5;
                                        this.addFloatingText(ped.x, ped.y - 20, Math.random() < 0.5 ? "🙌 DON'T SHOOT!" : "😱 HE'S GOT A GUN!", "#fde047");
                                    }
                                }
                            }
                        }
                    } else if (pl && pl.inVehicle && this.input && this.input.horn) {
                        const dxV = ped.x - pl.inVehicle.x;
                        const dyV = ped.y - pl.inVehicle.y;
                        const distV = Math.hypot(dxV, dyV);
                        if (distV < 105 && (ped._shoutCooldown || 0) <= 0) {
                            ped._shoutCooldown = 6.5;
                            if (distV < 58) {
                                ped.dodgeTimer = 0.45;
                                ped.dodgeAngle = Math.atan2(dyV, dxV);
                            }
                            if (Math.random() < 0.35) {
                                this.addFloatingText(ped.x, ped.y - 20, Math.random() < 0.5 ? "📢 WATCH IT!" : "🚕 EASY PAL!", "#fde047");
                            }
                        }
                    }
                }

                // Cancel calm states if panicked
                if ((ped.panicTimer || 0) > 0) {
                    ped.waitingAtCrosswalk = false;
                    ped.socialTimer = 0;
                    ped.activityTimer = 0;
                    if (ped._hailingTaxi && ped._hailingTaxi.aiPassengerTarget === ped) {
                        ped._hailingTaxi.aiPassengerTarget = null;
                    }
                    ped._hailingTaxi = null;
                    ped.hailingTaxiTimer = 0;
                }

                // Boarding a stopped city bus: walk to its front door, then climb aboard (the bus keeps its doors open for us)
                if (ped._boardingBus) {
                    const bus = ped._boardingBus;
                    ped._busBoardTimer = (ped._busBoardTimer || 0) - dt;
                    const busGone = !bus || bus.destroyed || Math.abs(bus.speed || 0) > 26 || ped._busBoardTimer <= 0 || (ped.panicTimer || 0) > 0;
                    if (busGone) {
                        ped._boardingBus = null;
                        ped.targetBx = null;
                        ped.targetBy = null;
                    } else {
                        const bcos = Math.cos(bus.angle || 0), bsin = Math.sin(bus.angle || 0);
                        const hw = (bus.w || 88) * 0.5;
                        const dX = bus.x + bcos * hw * 0.42 + (-bsin) * ((bus.h || 30) * 0.5 + 6);
                        const dY = bus.y + bsin * hw * 0.42 + bcos * ((bus.h || 30) * 0.5 + 6);
                        const dd = Math.hypot(dX - ped.x, dY - ped.y);
                        if (dd < 17) {
                            bus.doorOpenSide = 1;
                            bus.doorOpenTimer = 0.45;
                            ped._boardedVehicle = true;
                            ped.dead = true;
                            continue;
                        }
                        const walkSp = (ped.baseWalkSpeed || 24) * 1.35;
                        ped.angle = this.steerPedWithObstacleFeelers(ped, dX, dY, bus);
                        ped.speed = walkSp;
                        ped.x += Math.cos(ped.angle) * walkSp * dt;
                        ped.y += Math.sin(ped.angle) * walkSp * dt;
                        ped.waypointTimer = 0;
                        const bCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 8, ped.z || 2.0);
                        if (bCol.hit) { ped.x = bCol.x; ped.y = bCol.y; }
                        continue;
                    }
                }
                const curNavPre = this.map.getNavigationBlock ? this.map.getNavigationBlock(bx, by, pz) : null;
                if (ped.isCrossingRoad && curNavPre && (curNavPre.groundType === GROUND_TYPE.PAWEMENT || curNavPre.groundType === GROUND_TYPE.FIELD)) {
                    // If we already stepped onto at least one road tile and now reached the opposite sidewalk, finish crossing!
                    if (ped._enteredRoadOnCrosswalk) {
                        ped.isCrossingRoad = false;
                        ped._enteredRoadOnCrosswalk = false;
                        ped.crosswalkCooldown = 9.0;
                    }
                } else if (ped.isCrossingRoad && curNavPre && curNavPre.groundType === GROUND_TYPE.ROAD) {
                    ped._enteredRoadOnCrosswalk = true;
                }

                const nsGreenNow = typeof this.isNSGreen === "function" ? this.isNSGreen() : true;
                const ewGreenNow = typeof this.isEWGreen === "function" ? this.isEWGreen() : false;

                // 2) Crosswalk Curb Waiting State (Wait for WALK signal & look left/right before stepping onto zebra crosswalk)
                if (ped.waitingAtCrosswalk) {
                    ped.crossWaitTimer = (ped.crossWaitTimer || 0) - dt;
                    const baseA = typeof ped.crossBaseAngle === "number" ? ped.crossBaseAngle : ped.angle;
                    ped.angle = baseA + Math.sin(performance.now() * 0.0045 + (ped.turnSeed || 0)) * 0.32;
                    const walkGreen = (ped.crossDirX !== 0) ? ewGreenNow : nsGreenNow;
                    if (walkGreen && typeof ped.crossStartBx === "number" && typeof ped.crossStartBy === "number") {
                        const rCx = (ped.crossStartBx + 0.5) * TILE_SIZE;
                        const rCy = (ped.crossStartBy + 0.5) * TILE_SIZE;
                        let roadClear = true;
                        const cwVehicles = this._movingOrCrosswalkVehicles || this.vehicles;
                        if (Array.isArray(cwVehicles)) {
                            for (let vi = 0; vi < cwVehicles.length; vi++) {
                                const v = cwVehicles[vi];
                                if (!v || v.destroyed) continue;
                                if (Math.abs(v.x - rCx) < 82 && Math.abs(v.y - rCy) < 82 && Math.hypot(v.x - rCx, v.y - rCy) < 82 && (Math.abs(v.speed || 0) > 15 || v.sirenActive)) {
                                    roadClear = false;
                                    break;
                                }
                            }
                        }
                        if (roadClear) {
                            ped.waitingAtCrosswalk = false;
                            ped.isCrossingRoad = true;
                            ped._enteredRoadOnCrosswalk = false;
                            ped.targetBx = ped.crossStartBx;
                            ped.targetBy = ped.crossStartBy;
                            ped.angle = baseA;
                            ped.waypointTimer = 0;
                        }
                    } else if ((ped.crossWaitTimer || 0) <= 0) {
                        ped.waitingAtCrosswalk = false;
                        ped.crosswalkCooldown = 6.5;
                        ped.waypointTimer = 99;
                    }
                }

                // 3) Autonomous Taxi Hailing & Boarding (Calm adult sidewalk pedestrians hail passing AI VICE_CABs)
                if (
                    ped.kind === "CIVILIAN" &&
                    !ped.isChild &&
                    !ped.missionTag &&
                    (ped.panicTimer || 0) <= 0 &&
                    !ped.isCrossingRoad &&
                    !ped.waitingAtCrosswalk &&
                    (ped.socialTimer || 0) <= 0 &&
                    curNavPre &&
                    curNavPre.groundType === GROUND_TYPE.PAWEMENT
                ) {
                    if ((ped.hailingTaxiTimer || 0) > 0 && ped._hailingTaxi) {
                        ped.hailingTaxiTimer = Math.max(0, ped.hailingTaxiTimer - dt);
                        const cab = ped._hailingTaxi;
                        const cabDist = (!cab || cab.destroyed || cab.driver !== "AI_TRAFFIC") ? 999 : Math.hypot(cab.x - ped.x, cab.y - ped.y);
                        if (ped.hailingTaxiTimer <= 0 || cabDist > 165) {
                            if (cab && cab.aiPassengerTarget === ped) cab.aiPassengerTarget = null;
                            ped._hailingTaxi = null;
                            ped.hailingTaxiTimer = 0;
                            ped.taxiHailCooldown = 22.0;
                        } else if (Math.abs(cab.speed || 0) < 12 && cabDist < 88) {
                            // Walk to the stopped taxi's right-hand passenger door and board!
                            const doorX = cab.x - Math.sin(cab.angle || 0) * 18;
                            const doorY = cab.y + Math.cos(cab.angle || 0) * 18;
                            if (Math.hypot(doorX - ped.x, doorY - ped.y) < 22) {
                                cab.doorOpenSide = 1;
                                cab.doorOpenTimer = 0.45;
                                cab.aiPassengerTarget = null;
                                cab.aiPassengerStopTimer = 0.8;
                                cab.aiPassengerStopCooldown = 26.0;
                                this.addFloatingText(cab.x, cab.y - 22, "🚕 FARE PICKED UP!", "#facc15");
                                ped._boardedVehicle = true;
                                ped.dead = true;
                                continue;
                            }
                            ped.angle = this.steerPedWithObstacleFeelers(ped, doorX, doorY, cab);
                            ped.x += Math.cos(ped.angle) * baseWalkSpd * 1.15 * dt;
                            ped.y += Math.sin(ped.angle) * baseWalkSpd * 1.15 * dt;
                            ped.waypointTimer = 0;
                        } else {
                            // Wave at the approaching taxi from the curb
                            ped.angle = Math.atan2(cab.y - ped.y, cab.x - ped.x);
                        }
                    } else if ((ped.taxiHailCooldown || 0) <= 0 && ((ped.turnSeed || 0) % 19 === 0) && Array.isArray(this._activeTaxis || this.vehicles)) {
                        const cabList = this._activeTaxis || this.vehicles;
                        for (let vi = 0; vi < cabList.length; vi++) {
                            const v = cabList[vi];
                            if (!v || v.destroyed || v.specKey !== "VICE_CAB" || v.driver !== "AI_TRAFFIC") continue;
                            if (v.aiPassengerTarget || (v.aiPassengerStopTimer || 0) > 0 || (v.aiPassengerStopCooldown || 0) > 0) continue;
                            const dx = ped.x - v.x;
                            const dy = ped.y - v.y;
                            if (Math.abs(dx) > 125 || Math.abs(dy) > 125) continue;
                            const vCos = Math.cos(v.angle || 0);
                            const vSin = Math.sin(v.angle || 0);
                            const fwd = dx * vCos + dy * vSin;
                            const rightLat = -dx * vSin + dy * vCos;
                            if (fwd > 18 && fwd < 115 && rightLat > 12 && rightLat < 68) {
                                ped._hailingTaxi = v;
                                ped.hailingTaxiTimer = 7.5;
                                ped.taxiHailCooldown = 30.0;
                                v.aiPassengerTarget = ped;
                                if ((ped._shoutCooldown || 0) <= 0) {
                                    ped._shoutCooldown = 6.0;
                                    this.addFloatingText(ped.x, ped.y - 20, "🚕 TAXI!", "#facc15");
                                }
                                break;
                            }
                        }
                    }
                }

                // 4) Realistic Pedestrian Social Formations (SOLO, COUPLE, FAMILY, FRIEND_GROUP, HANGOUT_CIRCLE)
                ped.groupPartner = null;
                ped.socialTimer = 0;

                // Propagate panic across members of the same formationId and break formation if threatened.
                // ONLY a freshly-scared member (own event: gunfire / car / fire) spreads panic; members who merely INHERITED the panic
                // never re-spread it (otherwise a group re-panicked itself forever, running in circles).
                if ((ped.panicTimer || 0) <= 0) {
                    ped._panicInherited = false;
                }
                if (ped.formationId && ((ped.panicTimer || 0) > 0 || (ped.dodgeTimer || 0) > 0 || (ped.burnTimer || 0) > 0)) {
                    const panicId = ped.formationId;
                    ped.hangoutTimer = 0;
                    ped.formationLeader = null;
                    if (!ped._panicInherited) {
                        for (let fi = 0; fi < this.peds.length; fi++) {
                            const fm = this.peds[fi];
                            if (fm && !fm.dead && fm !== ped && fm.formationId === panicId) {
                                fm.hangoutTimer = 0;
                                fm.formationLeader = null;
                                if ((fm.panicTimer || 0) <= 0 && (fm._panicCalmCooldown || 0) <= 0) {
                                    fm.panicTimer = 2.6;
                                    fm._panicInherited = true;
                                    fm.threatX = ped.threatX ?? ped.x;
                                    fm.threatY = ped.threatY ?? ped.y;
                                }
                            }
                        }
                    }
                }

                // 4A) Hangout Circle State (2-3 people conversing in a circle before walking off together, or PORT_CREW on duty)
                if ((ped.hangoutTimer || 0) > 0) {
                    ped.hangoutTimer = Math.max(0, ped.hangoutTimer - dt);
                    ped.speed = 0;
                    const baseHangA = typeof ped.hangoutBaseAngle === "number" ? ped.hangoutBaseAngle : ped.angle;
                    ped.angle = baseHangA + Math.sin(performance.now() * 0.0032 + (ped.turnSeed || 0) * 1.7) * 0.24;
                    if (
                        ped.formationRole === "LEADER" &&
                        (ped._chatBubbleCooldown || 0) <= 0 &&
                        Math.abs(ped.x - this.player.x) < 420 &&
                        Math.abs(ped.y - this.player.y) < 320
                    ) {
                        ped._chatBubbleCooldown = 9.5 + ((ped.turnSeed || 0) % 6);
                        const chatIcons = ped.missionTag === "PORT_CREW"
                            ? ["📋 MANIFEST OK", "🏗️ CRANE READY", "🚢 DOCK CLEAR"]
                            : ["💬", "😂", "🌴", "🍻"];
                        const icon = chatIcons[(Math.floor(performance.now() * 0.001) + (ped.turnSeed || 0)) % chatIcons.length];
                        this.addFloatingText(ped.x, ped.y - 18, icon, ped.missionTag === "PORT_CREW" ? "#facc15" : "#f8fafc");
                    } else if ((ped._chatBubbleCooldown || 0) > 0) {
                        ped._chatBubbleCooldown = Math.max(0, ped._chatBubbleCooldown - dt);
                    }
                    if (ped.hangoutTimer <= 0) {
                        ped.speed = ped.baseWalkSpeed || 24;
                    }
                }

                // 4B) Validate formation leader for COUPLE_PARTNER / FAMILY_CHILD / GROUP_FOLLOWER
                const leader = ped.formationLeader;
                let hasActiveLeader = false;
                if (leader) {
                    const leaderDist = Math.hypot(leader.x - ped.x, leader.y - ped.y);
                    if (
                        leader.dead ||
                        (leader.panicTimer || 0) > 0 ||
                        (leader.burnTimer || 0) > 0 ||
                        leader._boardedVehicle ||
                        (leader.hailingTaxiTimer || 0) > 0 ||
                        leaderDist > 96
                    ) {
                        ped.formationLeader = null;
                        ped.speed = ped.baseWalkSpeed || 24;
                    } else {
                        hasActiveLeader = true;
                    }
                }

                if (hasActiveLeader && (ped.hangoutTimer || 0) <= 0) {
                    // Follower tracks its smoothed formation slot beside/behind the leader without orbiting
                    ped.waitingAtCrosswalk = Boolean(leader.waitingAtCrosswalk);
                    ped.isCrossingRoad = Boolean(leader.isCrossingRoad);
                    ped._enteredRoadOnCrosswalk = Boolean(leader._enteredRoadOnCrosswalk);
                    ped.crossDirX = leader.crossDirX || 0;
                    ped.crossDirY = leader.crossDirY || 0;

                    if (leader.waitingAtCrosswalk || (leader.hangoutTimer || 0) > 0) {
                        ped.speed = 0;
                        ped.angle = leader.angle + Math.sin(performance.now() * 0.004 + (ped.turnSeed || 0)) * 0.18;
                    } else {
                        const formAng = typeof leader._formAngle === "number" ? leader._formAngle : leader.angle;
                        const lCos = Math.cos(formAng);
                        const lSin = Math.sin(formAng);
                        const rPerpX = -lSin;
                        const rPerpY = lCos;
                        const fwdOff = typeof ped.formationFwdOff === "number" ? ped.formationFwdOff : -6;
                        const sideOff = typeof ped.formationSideOff === "number" ? ped.formationSideOff : 10;

                        let slotX = leader.x + lCos * fwdOff + rPerpX * sideOff;
                        let slotY = leader.y + lSin * fwdOff + rPerpY * sideOff;

                        // If the side-by-side slot is blocked by a road, water, building, Lummus lawn, or parked car,
                        // smoothly tuck single-file behind the leader at distinct per-member distances (14px, 28px)!
                        const sbx = Math.floor(slotX / TILE_SIZE);
                        const sby = Math.floor(slotY / TILE_SIZE);
                        const lbx = Math.floor(leader.x / TILE_SIZE);
                        const sNav = this.map.getNavigationBlock ? this.map.getNavigationBlock(sbx, sby, pz) : null;
                        const slotOnRoad = sNav && sNav.groundType === GROUND_TYPE.ROAD && !leader.isCrossingRoad;
                        const slotOnWaterOrBld = !sNav || sNav.groundType === GROUND_TYPE.WATER || sNav.groundType === GROUND_TYPE.BUILDING;
                        const slotOnLummusLawn = (sbx >= 449 && sbx <= 464) && sNav && sNav.lid === 10 && !(lbx >= 449 && lbx <= 464);
                        const slotHitBld = this.map.resolveCircleBuildingCollision(slotX, slotY, 8.0, pz).hit;
                        const slotHitVeh = this.resolveCircleVehicleCollision(slotX, slotY, 8.5, pz, null).hit;
                        if (slotOnRoad || slotOnWaterOrBld || slotOnLummusLawn || slotHitBld || slotHitVeh) {
                            const memberIdx = ped.formationMemberIndex || ((ped.formationRole === "GROUP_FOLLOWER" && fwdOff < -15) ? 2 : 1);
                            const tuckDist = 14 * memberIdx;
                            slotX = leader.x - lCos * tuckDist;
                            slotY = leader.y - lSin * tuckDist;
                        }

                        const dxSlot = slotX - ped.x;
                        const dySlot = slotY - ped.y;
                        const distSlot = Math.hypot(dxSlot, dySlot);
                        const fwdErr = dxSlot * lCos + dySlot * lSin;
                        const latErr = dxSlot * rPerpX + dySlot * rPerpY;

                        const leaderBase = leader.baseWalkSpeed || baseWalkSpd;
                        const leaderMoveSpd = leader.speed > 1 ? Math.min(leader.speed, leaderBase * 1.25) : leaderBase;
                        let followSpd = leaderMoveSpd;
                        let targetAngle = formAng;

                        if (fwdErr < -2.0) {
                            // Follower is already ahead of its slot along the walking direction:
                            // NEVER turn backwards (which causes circular orbiting); keep facing forward and slow down so the leader catches up!
                            followSpd = leaderMoveSpd * Math.max(0.35, 1.0 + fwdErr / 18.0);
                            const crabAng = Math.max(-0.42, Math.min(0.42, Math.atan2(latErr * 0.45, 16.0)));
                            targetAngle = formAng + crabAng;
                        } else if (distSlot > 4.0) {
                            if (fwdErr > 14) followSpd = leaderMoveSpd * 1.18;
                            else if (fwdErr > 5) followSpd = leaderMoveSpd * 1.08;
                            const aimFwd = Math.max(12.0, fwdErr + 12.0);
                            const aimLat = Math.max(-14.0, Math.min(14.0, latErr));
                            targetAngle = Math.atan2(lSin * aimFwd + rPerpY * aimLat, lCos * aimFwd + rPerpX * aimLat);
                        } else {
                            followSpd = leaderMoveSpd;
                            targetAngle = leader.angle;
                        }

                        const angDelta = Math.atan2(Math.sin(targetAngle - ped.angle), Math.cos(targetAngle - ped.angle));
                        const maxTurn = 6.5 * dt;
                        if (Math.abs(angDelta) <= maxTurn) {
                            ped.angle = targetAngle;
                        } else {
                            ped.angle += Math.sign(angDelta) * maxTurn;
                        }

                        ped.speed = followSpd;
                        ped.x += Math.cos(ped.angle) * followSpd * dt;
                        ped.y += Math.sin(ped.angle) * followSpd * dt;
                        ped.targetBx = leader.targetBx;
                        ped.targetBy = leader.targetBy;
                        ped.waypointTimer = 0;
                    }
                } else {
                    const isStandingStill = Boolean(
                        ped.waitingAtCrosswalk ||
                        (ped.hangoutTimer || 0) > 0 ||
                        ((ped.hailingTaxiTimer || 0) > 0 && ped._hailingTaxi && Math.abs(ped._hailingTaxi.speed || 0) >= 12)
                    );

                    const hurryOnCrosswalk = Boolean(
                        ped.isCrossingRoad &&
                        ped._enteredRoadOnCrosswalk &&
                        ((ped.crossDirX !== 0 && nsGreenNow) || (ped.crossDirY !== 0 && ewGreenNow))
                    );
                    const spd = isStandingStill
                        ? 0
                        : ((ped.burnTimer || 0) > 0
                            ? 86
                            : ((ped.dodgeTimer || 0) > 0
                                ? 76
                                : (ped.panicTimer > 0
                                    ? 68
                                    : (hurryOnCrosswalk ? baseWalkSpd * 1.30 : (ped.isCrossingRoad ? baseWalkSpd * 1.14 : baseWalkSpd)))));
                    ped.speed = spd;

                    ped.waypointTimer = (ped.waypointTimer || 0) + (isStandingStill ? 0 : dt);

                    const curTx = ped.targetBx !== null && ped.targetBx !== undefined
                        ? (ped.targetBx + 0.5) * TILE_SIZE + (ped.targetOffX || 0)
                        : ped.x;
                    const curTy = ped.targetBy !== null && ped.targetBy !== undefined
                        ? (ped.targetBy + 0.5) * TILE_SIZE + (ped.targetOffY || 0)
                        : ped.y;

                    const distToWp = Math.hypot(curTx - ped.x, curTy - ped.y);
                    const needTarget =
                        !isStandingStill &&
                        (ped.hailingTaxiTimer || 0) <= 0 &&
                        (
                            ped.targetBx === null ||
                            ped.targetBx === undefined ||
                            ped.waypointTimer > 4.5 ||
                            distToWp < 16
                        );

                    if (needTarget) {
                        const reachedTarget = ped.targetBx !== null && ped.targetBx !== undefined && (distToWp < 16 || (bx === ped.targetBx && by === ped.targetBy));
                        const baseX = reachedTarget ? ped.targetBx : bx;
                        const baseY = reachedTarget ? ped.targetBy : by;
                        if (reachedTarget || ped.waypointTimer > 4.5) {
                            ped._avoidBx = -1;
                            ped._avoidBy = -1;
                        }
                        ped.turnSeed = (ped.turnSeed || 1) + 1;

                        {
                            const navContext = this._pedNavCtx || (this._pedNavCtx = {
                                isCrossingRoad: false,
                                crossDirX: 0,
                                crossDirY: 0,
                                allowCrosswalk: false,
                                nsGreen: true,
                                ewGreen: false,
                                threatX: undefined,
                                threatY: undefined
                            });
                            navContext.isCrossingRoad = Boolean(ped.isCrossingRoad);
                            navContext.crossDirX = ped.crossDirX || 0;
                            navContext.crossDirY = ped.crossDirY || 0;
                            navContext.allowCrosswalk = ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0 && (ped.crosswalkCooldown || 0) <= 0;
                            navContext.nsGreen = nsGreenNow;
                            navContext.ewGreen = ewGreenNow;
                            navContext.threatX = (ped.panicTimer || 0) > 0 ? ped.threatX : undefined;
                            navContext.threatY = (ped.panicTimer || 0) > 0 ? ped.threatY : undefined;

                            // Choose next sidewalk block while avoiding 3D structures, Lummus Park grass, stopped vehicles, and threats
                            // Purposeful PedNav path-following first (far destinations, signalised crossings, flee routes); legacy tile walker as fallback
                            let nextStep = null;
                            if (ped.kind === "CIVILIAN" && !ped.isCrossingRoad && typeof PedNav !== "undefined") {
                                nextStep = PedNav.nextStep(this, ped, baseX, baseY, pz, navContext, reachedTarget);
                            }
                            if (!nextStep) nextStep = this.map.chooseNextSidewalkBlock(
                                baseX,
                                baseY,
                                ped.angle,
                                pz,
                                ped.turnSeed,
                                (ped.panicTimer || 0) > 0,
                                this.vehicles,
                                ped._avoidBx ?? -1,
                                ped._avoidBy ?? -1,
                                navContext
                            );

                            if (nextStep.isWaitingAtCurb) {
                                ped.waitingAtCrosswalk = true;
                                ped.crossWaitTimer = 5.5;
                                ped.crossBaseAngle = nextStep.angle;
                                ped.crossStartBx = nextStep.crossStartBx;
                                ped.crossStartBy = nextStep.crossStartBy;
                                ped.crossDirX = nextStep.crossDirX || 0;
                                ped.crossDirY = nextStep.crossDirY || 0;
                            } else if (nextStep.isCrosswalkEntry) {
                                ped.waitingAtCrosswalk = false;
                                ped.isCrossingRoad = true;
                                ped._enteredRoadOnCrosswalk = false;
                                ped.crossDirX = nextStep.crossDirX || nextStep.dx || 0;
                                ped.crossDirY = nextStep.crossDirY || nextStep.dy || 0;
                            } else if (nextStep.reachedOppositeSidewalk) {
                                ped.waitingAtCrosswalk = false;
                                ped.isCrossingRoad = false;
                                ped._enteredRoadOnCrosswalk = false;
                                ped.crosswalkCooldown = 9.0;
                            }

                            ped.targetBx = nextStep.bx;
                            ped.targetBy = nextStep.by;
                            ped.waypointTimer = 0;
                            // Subtle right-hand sidewalk lane offset (9px, or 4px for a formation leader so their partner fits alongside)
                            const rightPerpX = -Math.sin(nextStep.angle);
                            const rightPerpY = Math.cos(nextStep.angle);
                            const laneOff = ped.formationRole === "LEADER" ? 4.0 : 9.0;
                            ped.targetOffX = rightPerpX * laneOff;
                            ped.targetOffY = rightPerpY * laneOff;

                            const centerTx = (ped.targetBx + 0.5) * TILE_SIZE;
                            const centerTy = (ped.targetBy + 0.5) * TILE_SIZE;
                            // Keep walking pedestrians on the inner paved sidewalk corridor behind any recessed curbside parking bay!
                            if (!ped.isCrossingRoad && typeof this.map.getCurbParkingStripAt === "function") {
                                const strip = this.map.getCurbParkingStripAt(centerTx, centerTy, 8);
                                if (strip && strip.dc) {
                                    ped.targetOffX = -strip.dc * 18;
                                }
                            }

                            // If a stopped vehicle or structure partially overlaps the waypoint,
                            // shift the waypoint laterally (±18..24px) inside the corridor so the pedestrian bypasses it cleanly!
                            const testWpX = centerTx + (ped.targetOffX || 0);
                            const testWpY = centerTy + (ped.targetOffY || 0);
                            if (
                                this.resolveCircleVehicleCollision(testWpX, testWpY, 11, pz, null).hit ||
                                this.map.resolveCircleBuildingCollision(testWpX, testWpY, 11, pz).hit
                            ) {
                                const perpX = -Math.sin(nextStep.angle);
                                const perpY = Math.cos(nextStep.angle);
                                for (const lat of [0, 18, -18, 25, -25]) {
                                    const candX = centerTx + perpX * lat;
                                    const candY = centerTy + perpY * lat;
                                    const cbx = Math.floor(candX / TILE_SIZE);
                                    const cby = Math.floor(candY / TILE_SIZE);
                                    const cNav = this.map.getNavigationBlock ? this.map.getNavigationBlock(cbx, cby, pz) : null;
                                    if (cNav && cNav.groundType !== GROUND_TYPE.ROAD && cNav.groundType !== GROUND_TYPE.WATER && cNav.groundType !== GROUND_TYPE.BUILDING) {
                                        if (
                                            !this.resolveCircleVehicleCollision(candX, candY, 9, pz, null).hit &&
                                            !this.map.resolveCircleBuildingCollision(candX, candY, 9, pz).hit
                                        ) {
                                            ped.targetOffX = perpX * lat;
                                            ped.targetOffY = perpY * lat;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    let desiredAngle = ped.angle;
                    if ((ped.dodgeTimer || 0) > 0 && typeof ped.dodgeAngle === "number") {
                        desiredAngle = this.steerPedWithObstacleFeelers(
                            ped,
                            ped.x + Math.cos(ped.dodgeAngle) * 44,
                            ped.y + Math.sin(ped.dodgeAngle) * 44,
                            ped._boardingVeh || null
                        );
                    } else if (!isStandingStill && (ped.hailingTaxiTimer || 0) <= 0 && ped.targetBx !== null && ped.targetBx !== undefined) {
                        const tx = (ped.targetBx + 0.5) * TILE_SIZE + (ped.targetOffX || 0);
                        const ty = (ped.targetBy + 0.5) * TILE_SIZE + (ped.targetOffY || 0);
                        // Authentic 1997 GTA 1 AiCharacterController::ContinueWalkToWaypoint:
                        // Calm sidewalk pedestrians walk straight toward their verified sidewalk tile waypoint without erratic raycast swerving!
                        if (ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0 && !ped._boardingVeh) {
                            desiredAngle = Math.atan2(ty - ped.y, tx - ped.x);
                        } else {
                            desiredAngle = this.steerPedWithObstacleFeelers(ped, tx, ty, ped._boardingVeh || null);
                        }
                    }

                    if (!isStandingStill) {
                        const angDelta = Math.atan2(Math.sin(desiredAngle - ped.angle), Math.cos(desiredAngle - ped.angle));
                        const turnRate = ((ped.panicTimer || 0) > 0 || (ped.dodgeTimer || 0) > 0) ? 12.0 : 7.5;
                        const maxTurn = turnRate * dt;
                        if (Math.abs(angDelta) <= maxTurn) {
                            ped.angle = desiredAngle;
                        } else {
                            ped.angle += Math.sign(angDelta) * maxTurn;
                        }
                        if (ped.formationRole === "LEADER") {
                            if (typeof ped._formAngle !== "number") {
                                ped._formAngle = ped.angle;
                            } else {
                                const fDelta = Math.atan2(Math.sin(ped.angle - ped._formAngle), Math.cos(ped.angle - ped._formAngle));
                                const maxF = 2.6 * dt;
                                ped._formAngle += Math.abs(fDelta) <= maxF ? fDelta : Math.sign(fDelta) * maxF;
                            }
                        }
                    }

                    ped.x += Math.cos(ped.angle) * spd * dt;
                    ped.y += Math.sin(ped.angle) * spd * dt;
                }

                // Keep normal walking civilians strictly on PAWEMENT/FIELD sidewalks (unless actively crossing a zebra crosswalk!)
                const curNav = this.map.getNavigationBlock ? this.map.getNavigationBlock(bx, by, pz) : null;

                const newBx = Math.floor(ped.x / TILE_SIZE);

                const newBy = Math.floor(ped.y / TILE_SIZE);

                if (curNav && (curNav.groundType === GROUND_TYPE.PAWEMENT || curNav.groundType === GROUND_TYPE.FIELD)) {

                    const nextNav = this.map.getNavigationBlock(newBx, newBy, pz);

                    if (nextNav && nextNav.groundType === GROUND_TYPE.ROAD && !ped.isCrossingRoad) {

                        ped.x = prevX;

                        ped.y = prevY;

                        if (!ped.formationLeader) {
                            ped.targetBx = bx;
                            ped.targetBy = by;
                        }

                    }

                } else if (curNav && curNav.groundType === GROUND_TYPE.ROAD) {

                    if (ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0 && !ped.isCrossingRoad) {

                        ped.panicTimer = 1.6; // Hasten off the asphalt road!

                    }

                }

                // Keep prison inmates & prison guards strictly inside the prison yard (57..67, 77..145), and block street civilians from entering!

                const isPrisonInmateOrGuard = (ped.missionTag === "PRISONER" || ped.missionTag === "PRISON_GUARD" || ped.g24Type === "g2_prisoner");

                const newInPrison = (newBx >= 56 && newBx <= 68 && newBy >= 76 && newBy <= 146);

                if (isPrisonInmateOrGuard) {

                    const minPx = 57.15 * TILE_SIZE, maxPx = 67.85 * TILE_SIZE, minPy = 77.15 * TILE_SIZE, maxPy = 145.65 * TILE_SIZE;

                    if (ped.x < minPx || ped.x > maxPx || ped.y < minPy || ped.y > maxPy) {

                        ped.x = Math.max(minPx, Math.min(maxPx, prevX));

                        ped.y = Math.max(minPy, Math.min(maxPy, prevY));

                        ped.angle += Math.PI;

                        ped.targetBx = null;

                        ped.targetBy = null;

                    }

                } else if (newInPrison && ped.kind === "CIVILIAN") {

                    ped.x = prevX;

                    ped.y = prevY;

                    ped.angle += Math.PI;

                    ped.targetBx = null;

                    ped.targetBy = null;

                }
                }

            }



            // Pedestrians never wade through a villa swimming pool: step out to the nearest dry deck tile
            if (!ped.dead && !ped.isLivingProp && !ped.missionTag && ped.kind !== "GATOR" && typeof this.map.isSwimmingPoolAt === "function" && this.map.isSwimmingPoolAt(ped.x, ped.y)) {
                let escaped = false;
                for (let rr = 8; rr <= 110 && !escaped; rr += 6) {
                    for (let kk = 0; kk < 12; kk++) {
                        const ca = (kk / 12) * Math.PI * 2;
                        const cx2 = ped.x + Math.cos(ca) * rr;
                        const cy2 = ped.y + Math.sin(ca) * rr;
                        if (this.map.isSwimmingPoolAt(cx2, cy2)) continue;
                        if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(cx2, cy2)) continue;
                        const nb2 = this.map.getNavigationBlock(Math.floor(cx2 / TILE_SIZE), Math.floor(cy2 / TILE_SIZE), ped.z || 2.0);
                        if (!nb2 || (nb2.groundType !== GROUND_TYPE.PAWEMENT && nb2.groundType !== GROUND_TYPE.FIELD)) continue;
                        if (this.map.resolveCircleBuildingCollision(cx2, cy2, 8, ped.z || 2.0).hit) continue;
                        ped.x = cx2;
                        ped.y = cy2;
                        escaped = true;
                        break;
                    }
                }
                ped.targetBx = null;
                ped.targetBy = null;
                if (ped._navPath) ped._navPath = null;
            }

            if (ped.kind !== "GATOR" && this.map.isWaterAtPixel && this.map.isWaterAtPixel(ped.x, ped.y)) {

                ped.x = prevX;

                ped.y = prevY;

                ped.angle += Math.PI;

                ped.targetBx = null;

                ped.targetBy = null;

            }



            const pedMovedThisFrame = (ped.x !== pedStartX || ped.y !== pedStartY || !ped._colVerified);
            if (pedMovedThisFrame) {
                const pCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 8, ped.z || 2.0);

                if (pCol.hit) {

                    ped.x = pCol.x;

                    ped.y = pCol.y;

                    if (ped.kind === "CIVILIAN" && !ped.formationLeader) {
                        ped._avoidBx = ped.targetBx !== null && ped.targetBx !== undefined
                            ? ped.targetBx
                            : Math.floor((ped.x + Math.cos(ped.angle) * 20) / TILE_SIZE);
                        ped._avoidBy = ped.targetBy !== null && ped.targetBy !== undefined
                            ? ped.targetBy
                            : Math.floor((ped.y + Math.sin(ped.angle) * 20) / TILE_SIZE);
                        ped.targetBx = null;
                        ped.targetBy = null;
                        ped.turnSeed = (ped.turnSeed || 1) + 2;
                    } else if (ped.kind === "COP" && !ped.inCombat) {
                        ped.angle += Math.PI * (0.65 + Math.random() * 0.7);
                    }

                }

                // Physical collision against parked / stationary vehicles and wrecks (Emergency responders on foot can squeeze between jammed cars!)
                if ((ped.slideCarTimer || 0) <= 0 && (ped.exitAnimTimer || 0) <= 0 && ped.kind !== "FIREMAN" && ped.kind !== "MEDIC") {
                    const pedVehRadius = 7.5;
                    const vCol = this.resolveCircleVehicleCollision(ped.x, ped.y, pedVehRadius, ped.z || 2.0, ped._boardingVeh || ped.fireTarget || null);
                    if (vCol.hit) {
                        ped.x = vCol.x;
                        ped.y = vCol.y;
                        if (ped.kind === "CIVILIAN" && !ped._boardingVeh && !ped.formationLeader) {
                            ped._avoidBx = ped.targetBx !== null && ped.targetBx !== undefined
                                ? ped.targetBx
                                : Math.floor((ped.x + Math.cos(ped.angle) * 20) / TILE_SIZE);
                            ped._avoidBy = ped.targetBy !== null && ped.targetBy !== undefined
                                ? ped.targetBy
                                : Math.floor((ped.y + Math.sin(ped.angle) * 20) / TILE_SIZE);
                            ped.targetBx = null;
                            ped.targetBy = null;
                            ped.turnSeed = (ped.turnSeed || 1) + 3;
                        } else if (ped.kind === "COP" && !ped.inCombat && !ped._boardingVeh) {
                            ped.angle += Math.PI * (0.55 + Math.random() * 0.9);
                        }
                    }
                }
                ped._colVerified = true;
            }

            // Real-displacement anti-stuck watchdog: if any walking pedestrian or on-foot responder (COP, MEDIC, FIREMAN) moved < 4.5px over 1.35s,
            // nudge toward a clear lateral offset without random spinning!
            if (
                !ped.dead &&
                !ped.isLivingProp &&
                ped.kind !== "GATOR" &&
                !ped.isKneelingMedic &&
                (ped.healTimer || 0) <= 0 &&
                !ped.sprayingHose &&
                (ped.slideCarTimer || 0) <= 0 &&
                !ped.waitingAtCrosswalk &&
                (ped.hangoutTimer || 0) <= 0 &&
                (ped.hailingTaxiTimer || 0) <= 0 &&
                !(ped.formationLeader && (ped.formationLeader.waitingAtCrosswalk || (ped.formationLeader.hangoutTimer || 0) > 0))
            ) {
                ped._stuckCheckTimer = (ped._stuckCheckTimer || 0) + dt;
                if (ped._lastCheckX === undefined) {
                    ped._lastCheckX = ped.x;
                    ped._lastCheckY = ped.y;
                } else if (ped._stuckCheckTimer >= 1.25) {
                    const movedDist = Math.hypot(ped.x - ped._lastCheckX, ped.y - ped._lastCheckY);
                    ped._lastCheckX = ped.x;
                    ped._lastCheckY = ped.y;
                    ped._stuckCheckTimer = 0;
                    if (movedDist < 4.5) {
                        if (ped.kind === "COP" || ped.kind === "MEDIC" || ped.kind === "FIREMAN") {
                            const sideAng = (ped.angle || 0) + (((ped.turnSeed || 1) % 2 === 0) ? 1 : -1) * (Math.PI * 0.5);
                            const testX = ped.x + Math.cos(sideAng) * 16;
                            const testY = ped.y + Math.sin(sideAng) * 16;
                            if (!this.map.resolveCircleBuildingCollision(testX, testY, 8, ped.z || 2.0).hit) {
                                ped.x = testX;
                                ped.y = testY;
                            }
                            ped.turnSeed = (ped.turnSeed || 1) + 1;
                        } else if (ped.formationLeader) {
                            // If a follower is physically snagged on an obstacle while its leader moved ahead, detach cleanly so it walks around
                            ped.formationLeader = null;
                            ped.targetBx = null;
                            ped.targetBy = null;
                            ped.waypointTimer = 0;
                        } else {
                            const cbx = Math.floor(ped.x / TILE_SIZE);
                            const cby = Math.floor(ped.y / TILE_SIZE);
                            ped._avoidBx = ped.targetBx !== null && ped.targetBx !== undefined
                                ? ped.targetBx
                                : Math.floor((ped.x + Math.cos(ped.angle) * 22) / TILE_SIZE);
                            ped._avoidBy = ped.targetBy !== null && ped.targetBy !== undefined
                                ? ped.targetBy
                                : Math.floor((ped.y + Math.sin(ped.angle) * 22) / TILE_SIZE);
                            ped.x += ((cbx + 0.5) * TILE_SIZE - ped.x) * 0.22;
                            ped.y += ((cby + 0.5) * TILE_SIZE - ped.y) * 0.22;
                            ped.targetBx = null;
                            ped.targetBy = null;
                            ped.waypointTimer = 0;
                            ped.turnSeed = (ped.turnSeed || 1) + 3;
                        }
                    }
                }
            }

            if (pedMovedThisFrame || ped.x !== pedStartX || ped.y !== pedStartY) {
                ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);
                if (p && Math.abs(ped.x - p.x) < 420 && Math.abs(ped.y - p.y) < 320) {
                    this.emitPedFootprints(ped, dt);
                }
            }

        }

        for (let i = this.peds.length - 1; i >= 0; i--) {
            if (this.peds[i]._boardedVehicle) {
                this.peds.splice(i, 1);
            }
        }
        this.rebuildPedSpatialGrid();
        this._pedGridLastLen = this.peds.length;

        // 6B. Pedestrian-to-Pedestrian Mutual Separation & Reciprocal Collision Avoidance (RVO)
        // Eliminates conga lines, stacking, clumping, and ghost pass-throughs (Accelerated via 256px Spatial Grid!)
        const pCamX = this.player.x, pCamY = this.player.y;
        const pHeadRvo = this._pedGridHead;
        const pNextRvo = this._pedGridNext;
        if (pHeadRvo && pNextRvo) {
            const minDist = 11.0; // 11.0px separation diameter so passing pedestrians on 2-way sidewalks never block or shove each other
            const minDistSq = minDist * minDist;
            for (let i = 0; i < this.peds.length; i++) {
                const p1 = this.peds[i];
                if (!p1 || p1.dead || Math.abs(p1.x - pCamX) >= 800 || Math.abs(p1.y - pCamY) >= 600) continue;
                const cx0 = Math.max(0, (p1.x - 12) >> 8);
                const cx1 = Math.min(127, (p1.x + 12) >> 8);
                const cy0 = Math.max(0, (p1.y - 12) >> 8);
                const cy1 = Math.min(127, (p1.y + 12) >> 8);
                for (let cy = cy0; cy <= cy1; cy++) {
                    const rowOff = cy << 7;
                    for (let cx = cx0; cx <= cx1; cx++) {
                        for (let j = pHeadRvo[rowOff | cx]; j !== -1; j = pNextRvo[j]) {
                            if (j <= i) continue;
                            const p2 = this.peds[j];
                            if (!p2 || p2.dead) continue;
                            const dx = p1.x - p2.x;
                            if (dx >= 11.0 || dx <= -11.0) continue;
                            const dy = p1.y - p2.y;
                            if (dy >= 11.0 || dy <= -11.0) continue;

                            // Members of the same cohesive formation (couples, families, friend groups, hangout circles) never repel each other unless panicked
                            if (
                                p1.formationId &&
                                p1.formationId === p2.formationId &&
                                (p1.panicTimer || 0) <= 0 &&
                                (p2.panicTimer || 0) <= 0
                            ) {
                                continue;
                            }

                            const dist2 = dx * dx + dy * dy;
                            if (dist2 < minDistSq && dist2 > 0.001) {
                                const dist = Math.sqrt(dist2);
                                const overlap = (minDist - dist) * 0.45;
                                const nx = dx / dist;
                                const ny = dy / dist;

                                let nx1 = p1.x + nx * overlap;
                                let ny1 = p1.y + ny * overlap;
                                let nx2 = p2.x - nx * overlap;
                                let ny2 = p2.y - ny * overlap;

                                // If pedestrians are heading towards each other, step slightly to their right (reciprocal detour)
                                const dot = Math.cos(p1.angle) * Math.cos(p2.angle) + Math.sin(p1.angle) * Math.sin(p2.angle);
                                if (dot < -0.3) {
                                    const sideStep = 12 * dt;
                                    nx1 += -Math.sin(p1.angle) * sideStep;
                                    ny1 += Math.cos(p1.angle) * sideStep;
                                    nx2 += -Math.sin(p2.angle) * sideStep;
                                    ny2 += Math.cos(p2.angle) * sideStep;
                                }

                                // Smart positioning guard: never let crowd separation push a pedestrian onto road lanes, water, or inside buildings
                                const nav1 = this.map.getNavigationBlock(Math.floor(nx1 / TILE_SIZE), Math.floor(ny1 / TILE_SIZE), p1.z || 2);
                                if (nav1 && nav1.groundType !== GROUND_TYPE.ROAD && nav1.groundType !== GROUND_TYPE.WATER && nav1.groundType !== GROUND_TYPE.BUILDING &&
                                    !this.map.resolveCircleBuildingCollision(nx1, ny1, 9, p1.z || 2).hit) {
                                    p1.x = nx1;
                                    p1.y = ny1;
                                }
                                const nav2 = this.map.getNavigationBlock(Math.floor(nx2 / TILE_SIZE), Math.floor(ny2 / TILE_SIZE), p2.z || 2);
                                if (nav2 && nav2.groundType !== GROUND_TYPE.ROAD && nav2.groundType !== GROUND_TYPE.WATER && nav2.groundType !== GROUND_TYPE.BUILDING &&
                                    !this.map.resolveCircleBuildingCollision(nx2, ny2, 9, p2.z || 2).hit) {
                                    p2.x = nx2;
                                    p2.y = ny2;
                                }
                            }
                        }
                    }
                }
            }
        }



        // 7. VCPD Police Spawner, Roadblocks (Wanted >= 3) & Rational Real-Life APB / Search-Zone System
        if (this.pending911Report) {
            this.pending911Report.timer -= dt;
            if (this.pending911Report.timer <= 0) {
                const rep = this.pending911Report;
                this.pending911Report = null;
                if (p && !p.dead) {
                    this.setWantedLevel(Math.max(this.wantedLevel || 0, rep.stars || 1), rep.pos, false, rep.veh !== undefined ? rep.veh : null);
                    this.addFloatingText(rep.pos.x, rep.pos.y - 28, "📡 911 BLAST REPORTED TO VCPD!", "#38bdf8");
                }
            }
        }

        let nearestCopDist = 9999;

        let activeCopCars = 0;
        let emptyCopCarsNearScene = 0;

        let activeSwatCars = 0;

        let activeFootCopsNear = 0;

        let anyCopHasVisual = false;
        let copsAtCrimeScene = false;
        const pEnt = p.inVehicle || p;
        const pZ = pEnt.z || p.z || 2.0;
        const scenePos = this.lastKnownWantedPos || { x: pEnt.x, y: pEnt.y };

        const copVehList = this._copVehicles || this.vehicles;
        for (let vi = 0; vi < copVehList.length; vi++) {
            const v = copVehList[vi];
            if (v && v.isPolice && !v.destroyed) {
                if (v.driver === "AI_COP") {

                    activeCopCars++;

                    if (v.specKey === "SWAT_ENFORCER") activeSwatCars++;

                    const d = Math.hypot(v.x - pEnt.x, v.y - pEnt.y);

                    if (d < nearestCopDist) nearestCopDist = d;

                    if (!copsAtCrimeScene && Math.hypot(v.x - scenePos.x, v.y - scenePos.y) < 280) {
                        copsAtCrimeScene = true;
                    }

                    if (!anyCopHasVisual && this.canCopIdentifyPlayer(v.x, v.y, v.angle, 480)) {
                        anyCopHasVisual = true;
                    }

                } else if (v.driver === null && (Math.hypot(v.x - pEnt.x, v.y - pEnt.y) < 420 || Math.hypot(v.x - scenePos.x, v.y - scenePos.y) < 420)) {
                    emptyCopCarsNearScene++;
                }
            }

        }

        const copPedList = this._copPeds || this.peds;
        for (let pi = 0; pi < copPedList.length; pi++) {
            const ped = copPedList[pi];
            if (ped && !ped.dead && ped.kind === "COP") {

                const d = Math.hypot(ped.x - pEnt.x, ped.y - pEnt.y);

                if (d < nearestCopDist) nearestCopDist = d;

                if (d < 1150) activeFootCopsNear++;

                if (!copsAtCrimeScene && Math.hypot(ped.x - scenePos.x, ped.y - scenePos.y) < 260) {
                    copsAtCrimeScene = true;
                }

                if (!anyCopHasVisual && this.canCopIdentifyPlayer(ped.x, ped.y, ped.angle, 400)) {
                    anyCopHasVisual = true;
                }

            }

        }



        if (this.roadblockCooldown > 0) this.roadblockCooldown -= dt;



        const maxRoomWanted = this.wantedLevel || 0;



        if (!isClientWorldSync && maxRoomWanted > 0) {

            const spawnTarget = this.getNearestWantedTarget(p.x, p.y) || { x: p.x, y: p.y, z: p.z || 2.0, angle: p.angle || 0, wantedLevel: maxRoomWanted };

            const tWanted = spawnTarget.wantedLevel || maxRoomWanted;

            // Coherent Police Fleet Scaling: 1 Cruiser at 1★, 2 at 2★, 3 at 3★, up to 4 Cruisers/SWAT at 4★+
            // Each Cruiser parks cleanly on the nearest road (e.g. Ocean Drive) and deploys 2 VCPD officers on foot!
            const maxCops = Math.min(4, tWanted);

            const totalActiveUnits = activeCopCars + Math.floor(activeFootCopsNear * 0.5) + (emptyCopCarsNearScene >= 2 ? 1 : 0);

            const isEvadingNow = this.wantedLevel > 0 && !anyCopHasVisual && (this.wantedDecayTimer || 0) > 1.5 && totalActiveUnits >= maxCops;
            this.copSpawnTimer += dt * (isEvadingNow ? 0.32 : 1.0);

            const spawnInterval = tWanted <= 1 ? 17.5 : (tWanted === 2 ? 14.5 : (tWanted === 3 ? 11.5 : 9.0));

            if (totalActiveUnits < maxCops && activeCopCars < maxCops && emptyCopCarsNearScene < 3 && this.copSpawnTimer > spawnInterval) {

                this.copSpawnTimer = 0;

                const pz = spawnTarget.z || 2.0;

                // Persistent World Priority #1: Alert an existing patrolling VCPD Cruiser strictly far off-screen (1620..2800px)!
                // Never convert a nearby traffic cruiser into an instant ambush!
                const minPatrolAlertDist = 1620;
                let alertedPatrolCop = null;
                let bestPatrolDist = 2800;
                for (const v of this.vehicles) {
                    if (!v.destroyed && v.isPolice && v.driver === "AI_TRAFFIC") {
                        const d = Math.hypot(v.x - spawnTarget.x, v.y - spawnTarget.y);
                        if (d >= minPatrolAlertDist && d < bestPatrolDist && (this.isPoliceSpotted || !this.isPointInAnyPlayerCameraView(v.x, v.y, 180))) {
                            bestPatrolDist = d;
                            alertedPatrolCop = v;
                        }
                    }
                }
                if (alertedPatrolCop) {
                    alertedPatrolCop.driver = "AI_COP";
                    alertedPatrolCop.sirenActive = true;
                    alertedPatrolCop.isPersistentFleet = true;
                } else {
                    // Persistent World Priority #2: Dispatch a unit from the Central VCPD Police Precinct HQ (strictly off-screen)!
                    const spawnInfo = this.findStationDispatchSpawn("POLICE", spawnTarget.x, spawnTarget.y, pz);
                    if (spawnInfo) {
                        const useSwat = tWanted >= 4 && activeSwatCars < 1 && Math.random() < (tWanted >= 5 ? 0.35 : 0.25);
                        const specKey = useSwat ? "SWAT_ENFORCER" : "VCPD_CRUISER";
                        const copCar = new Vehicle(`cop_${Date.now()}`, specKey, spawnInfo.x, spawnInfo.y, spawnInfo.angle);
                        copCar.z = spawnInfo.z;
                        copCar.driver = "AI_COP";
                        copCar.isPersistentFleet = true;
                        copCar.homeStation = spawnInfo.station;
                        copCar.sirenActive = true;
                        copCar.speed = 112;
                        copCar.vx = Math.cos(spawnInfo.angle) * 112;
                        copCar.vy = Math.sin(spawnInfo.angle) * 112;
                        this.vehicles.push(copCar);
                    }
                }

            }



            // Spawn GTA 1 Police Roadblock at Wanted Level >= 3 (strictly off-screen at 1020px ahead so it never pops in front of the player's hood!)

            if (tWanted >= 3 && this.roadblockCooldown <= 0 && activeCopCars < 5) {

                this.roadblockCooldown = 46;

                const rbX = spawnTarget.x + Math.cos(spawnTarget.angle || 0) * 1020;

                const rbY = spawnTarget.y + Math.sin(spawnTarget.angle || 0) * 1020;

                const rbBx = Math.floor(rbX / TILE_SIZE);

                const rbBy = Math.floor(rbY / TILE_SIZE);

                if (!this.isPointInAnyPlayerCameraView(rbX, rbY, 220) && this.map.isRoadAtPixel(rbX, rbY) && !(this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(rbBx, rbBy))) {

                    const rbIsSwat = tWanted >= 4 && activeSwatCars < 1 && Math.random() < 0.25;
                    const rbSpec = rbIsSwat ? "SWAT_ENFORCER" : "VCPD_CRUISER";

                    const rbCar = new Vehicle(`rb_${Date.now()}`, rbSpec, rbX, rbY, (spawnTarget.angle || 0) + Math.PI * 0.5);
                    rbCar.sirenActive = true;
                    rbCar.isPersistentFleet = true;

                    this.vehicles.push(rbCar);

                    const perpAng = (spawnTarget.angle || 0) + Math.PI * 0.5;

                    const rbZ = this.map.getHeightAtPixel ? this.map.getHeightAtPixel(rbX, rbY, spawnTarget.z || 2.0) : (spawnTarget.z || 2.0);
                    rbCar.z = rbZ;

                    for (let side of [-1, 1]) {
                        let cx = rbX - Math.cos(spawnTarget.angle || 0) * 28 + Math.cos(perpAng) * side * 18;
                        let cy = rbY - Math.sin(spawnTarget.angle || 0) * 28 + Math.sin(perpAng) * side * 18;
                        if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                            const cCol = this.map.resolveCircleBuildingCollision(cx, cy, 9, rbZ, false);
                            cx = cCol.x;
                            cy = cCol.y;
                        }
                        if (this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(cx, cy)) {
                            cx = rbX;
                            cy = rbY;
                        }

                        const rbCop = new Pedestrian({

                            id: `rb_cop_${Date.now()}_${side}`,

                            x: cx,

                            y: cy,
                            z: rbZ,

                            angle: (spawnTarget.angle || 0) + Math.PI,

                            speed: 98,

                            kind: "COP",

                            g24Type: rbIsSwat ? "g2_swat" : "police",

                            isSwat: rbIsSwat,

                            shirtColor: rbIsSwat ? "#1e293b" : "#1e3a8a",

                            hp: 115,

                            maxHp: 115,

                            copWeapon: rbIsSwat ? "SHOTGUN" : "UZI",

                            dead: false,

                            panicTimer: 0

                        });
                        rbCop.homeCruiser = rbCar;
                        this.peds.push(rbCop);

                    }

                    if (this.director && typeof this.director.deployRoadblockSpikeStrip === "function") {
                        this.director.deployRoadblockSpikeStrip(rbX, rbY, spawnTarget.angle || 0);
                    }

                    this.addFloatingText(rbX, rbY - 26, "🚧 VCPD ROADBLOCK & SPIKE STRIP!", "#38bdf8");

                }

            }

        } else if (!isClientWorldSync) {
            // Persistent World Logic: when no player in the room is wanted (0★), VCPD cruisers turn off their sirens and resume calm street patrol!
            for (const v of this.vehicles) {
                if (!v.destroyed && v.isPolice) {
                    if (v.driver === "AI_COP") {
                        v.driver = "AI_TRAFFIC";
                    }
                    if (v.driver !== "PLAYER" && v.driver !== "REMOTE") {
                        v.sirenActive = false;
                    }
                }
            }
        }

        // 6-Star VCPD Police Pursuit Helicopter: departs from nearest VCPD Precinct / Helipad well off-screen (1550px) and orbits at wide standoff!
        if ((this.wantedLevel || 0) >= 6 || maxRoomWanted >= 6) {
            const realEnt = p.inVehicle || p;
            const targetEnt = (anyCopHasVisual || this.isPoliceSpotted || !this.lastKnownWantedPos)
                ? realEnt
                : { x: this.lastKnownWantedPos.x, y: this.lastKnownWantedPos.y, vx: 0, vy: 0 };
            if (!this.policeHeli) {
                const nearPrecinct = typeof this.getNearestEmergencyStation === "function"
                    ? this.getNearestEmergencyStation("POLICE", targetEnt.x, targetEnt.y)
                    : null;
                const initAng = nearPrecinct
                    ? Math.atan2(nearPrecinct.y - targetEnt.y, nearPrecinct.x - targetEnt.x)
                    : (Math.random() * Math.PI * 2);
                const spawnDist = 1550;
                const spawnX = targetEnt.x + Math.cos(initAng) * spawnDist;
                const spawnY = targetEnt.y + Math.sin(initAng) * spawnDist;
                this.policeHeli = {
                    x: spawnX,
                    y: spawnY,
                    z: 4.10,
                    cx: spawnX,
                    cy: spawnY,
                    orbitAngle: initAng,
                    orbitRx: 250,
                    orbitRy: 190,
                    angle: initAng + Math.PI,
                    searchX: spawnX,
                    searchY: spawnY,
                    burstTimer: 3.2,
                    burstShotsLeft: 0,
                    burstShotDelay: 0,
                    muzzleTimer: 0,
                    departing: false
                };
                this.addFloatingText(targetEnt.x, targetEnt.y - 32, "🚁 VCPD CHOPPER DISPATCHED FROM PRECINCT!", "#38bdf8");
            }
            const heli = this.policeHeli;
            heli.departing = false;
            // Smooth standoff tracking inertia so the chopper flies in from off-screen and orbits without gluing to the player's bumper
            heli.cx += (targetEnt.x - heli.cx) * Math.min(1, dt * 1.45);
            heli.cy += (targetEnt.y - heli.cy) * Math.min(1, dt * 1.45);
            const orbitOmega = 0.44; // ~14.2s per wide 360° observation orbit
            heli.orbitAngle = (heli.orbitAngle || 0) + orbitOmega * dt;
            const wobble = 1.0 + Math.sin(heli.orbitAngle * 2.0) * 0.06;
            const rx = (heli.orbitRx || 250) * wobble;
            const ry = (heli.orbitRy || 190) * wobble;
            const desX = heli.cx + Math.cos(heli.orbitAngle) * rx;
            const desY = heli.cy + Math.sin(heli.orbitAngle) * ry;
            const dx = desX - heli.x;
            const dy = desY - heli.y;
            const distToSlot = Math.hypot(dx, dy);
            const maxStep = 380 * dt;
            let vx, vy;
            if (distToSlot > maxStep) {
                vx = (dx / distToSlot) * 380;
                vy = (dy / distToSlot) * 380;
                heli.x += (dx / distToSlot) * maxStep;
                heli.y += (dy / distToSlot) * maxStep;
            } else {
                heli.x = desX;
                heli.y = desY;
                vx = -Math.sin(heli.orbitAngle) * rx * orbitOmega + (targetEnt.vx || 0) * 0.45;
                vy = Math.cos(heli.orbitAngle) * ry * orbitOmega + (targetEnt.vy || 0) * 0.45;
            }
            const tangentAng = Math.atan2(vy, vx);
            const toPlayerAng = Math.atan2(targetEnt.y - heli.y, targetEnt.x - heli.x);
            const desiredAng = Math.atan2(
                Math.sin(tangentAng) * 0.88 + Math.sin(toPlayerAng) * 0.12,
                Math.cos(tangentAng) * 0.88 + Math.cos(toPlayerAng) * 0.12
            );
            let angDiff = desiredAng - (heli.angle || 0);
            while (angDiff > Math.PI) angDiff -= Math.PI * 2;
            while (angDiff < -Math.PI) angDiff += Math.PI * 2;
            heli.angle = (heli.angle || 0) + angDiff * Math.min(1, dt * 5.5);
            // Dynamic rooftop-clearing radar altimeter: sample nearby building heights and climb smoothly when passing over buildings!
            let localRoofZ = 2.0;
            if (this.map && typeof this.map.getHeightAtPixel === "function") {
                const probes = [
                    [0, 0], [44, 0], [-44, 0], [0, 44], [0, -44]
                ];
                for (let pi = 0; pi < probes.length; pi++) {
                    const pz = this.map.getHeightAtPixel(heli.x + probes[pi][0], heli.y + probes[pi][1], 6.0, true);
                    if (pz > localRoofZ) localRoofZ = pz;
                }
            }
            const targetAltZ = (localRoofZ > 2.5 ? 4.12 : 3.88) + Math.sin(performance.now() * 0.0035) * 0.04;
            heli.z = (heli.z || 3.88) + (targetAltZ - (heli.z || 3.88)) * Math.min(1, dt * 3.5);
            heli.searchX += (targetEnt.x - (heli.searchX ?? targetEnt.x)) * Math.min(1, dt * 5.2);
            heli.searchY += (targetEnt.y - (heli.searchY ?? targetEnt.y)) * Math.min(1, dt * 5.2);

            const dHeli = Math.hypot(realEnt.x - heli.x, realEnt.y - heli.y);
            if (!this.activeInterior && dHeli < nearestCopDist) {
                nearestCopDist = dHeli;
            }
            if (!this.activeInterior && dHeli < 420) {
                anyCopHasVisual = true;
            }
            if (!this.activeInterior && !p.dead && (p.respawnGraceUntil || 0) <= performance.now() && dHeli < 420) {
                heli.burstTimer = (heli.burstTimer || 0) - dt;
                if (heli.burstTimer <= 0 && (heli.burstShotsLeft || 0) <= 0) {
                    const heliBlocked = this.map && this.map.traceSegment2D && this.map.traceSegment2D(heli.x, heli.y, realEnt.x, realEnt.y, (realEnt.z || 2.0) + 0.5).hit;
                    if (!heliBlocked) {
                        heli.burstShotsLeft = 3;
                        heli.burstShotDelay = 0;
                        heli.burstTimer = 2.6 + Math.random() * 1.2;
                    } else {
                        heli.burstTimer = 0.65;
                    }
                }
                if ((heli.burstShotsLeft || 0) > 0) {
                    heli.burstShotDelay = (heli.burstShotDelay || 0) - dt;
                    if (heli.burstShotDelay <= 0) {
                        heli.burstShotsLeft--;
                        heli.burstShotDelay = 0.14;
                        heli.muzzleTimer = 0.09;
                        const aimAng = Math.atan2(realEnt.y - heli.y, realEnt.x - heli.x) + (Math.random() - 0.5) * 0.18;
                        this.fireWeapon(heli.x, heli.y, aimAng, "UZI", false, false, "COP");
                    }
                }
            }
            if ((heli.muzzleTimer || 0) > 0) heli.muzzleTimer = Math.max(0, heli.muzzleTimer - dt);
        } else if (this.policeHeli) {
            const heli = this.policeHeli;
            heli.departing = true;
            heli.x += Math.cos(heli.angle || 0) * 360 * dt;
            heli.y += Math.sin(heli.angle || 0) * 360 * dt;
            if (Math.hypot(heli.x - p.x, heli.y - p.y) > 1650 && !this.isPointInAnyPlayerCameraView(heli.x, heli.y, 320)) {
                this.policeHeli = null;
            }
        }



        if (this.wantedLevel > 0) {

            // Rational Real-Life Police Pursuit & APB Search-Zone System:
            // 1. Visual Contact (anyCopHasVisual): Only true when a police cruiser, foot officer, or 6★ chopper has unobstructed line-of-sight!
            //    Updates Last Known Position (lastKnownWantedPos) and records the player's current vehicle description (wantedSpottedVehicle).
            //    If the player draws/fires a lethal weapon in front of police at 1★, VCPD escalates to 2★ (Armed Suspect)!
            // 2. Search Mode (!anyCopHasVisual): Police do NOT have magic GPS! lastKnownWantedPos remains frozen at the crime scene / last seen point.
            //    Dispatched units converge on lastKnownWantedPos and search a 320px perimeter around it.
            //    - While the player stays inside the 320px crime-scene perimeter and units are en route, the APB stays locked so stars never vanish before cops arrive!
            //    - Once the player leaves the 320px crime-scene perimeter unseen (or after police search the empty scene), wantedDecayTimer advances
            //      (1.75x faster if the player switched vehicles unseen!) and clears the entire wanted APB once the search timer completes!
            this.crimeSceneLockTimer = Math.max(0, (this.crimeSceneLockTimer || 0) - dt);
            if (copsAtCrimeScene && !anyCopHasVisual) {
                if (!this._crimeSceneAnnounced && this.lastKnownWantedPos) {
                    this._crimeSceneAnnounced = true;
                    this.addFloatingText(this.lastKnownWantedPos.x, this.lastKnownWantedPos.y - 28, "🔍 VCPD INVESTIGATING CRIME SCENE!", "#facc15");
                }
                this.crimeSceneSearchedTimer = (this.crimeSceneSearchedTimer || 0) + dt;
            }
            const decayThreshold = this.wantedLevel === 1 ? 12 : (this.wantedLevel === 2 ? 18 : (this.wantedLevel === 3 ? 25 : 32));
            this.wantedDecayDuration = decayThreshold;
            this.isPoliceSpotted = Boolean(anyCopHasVisual);

            if (this.isPoliceSpotted) {

                this.hasBeenDirectlySpottedByCop = true;
                this.lastKnownWantedPos = { x: pEnt.x, y: pEnt.y };
                this.wantedSpottedVehicle = p.inVehicle || null;
                this.crimeSceneSearchedTimer = 0;

                // Proportional Force Escalation: brandishing or firing a lethal gun in sight of VCPD at 1★ escalates to 2★!
                if (this.wantedLevel === 1 && p.weapon && p.weapon !== "FIST" && ((p.playerCombatTimer || 0) > 0 || (p.weaponDrawnTimer || 0) > 0)) {
                    this.setWantedLevel(2, { x: pEnt.x, y: pEnt.y }, true);
                    this.addFloatingText(pEnt.x, pEnt.y - 36, "🔫 ARMED SUSPECT — 2★ LETHAL FORCE!", "#ef4444");
                }

                // Drain search evasion progress rapidly when re-spotted by police
                this.wantedDecayTimer = Math.max(0, (this.wantedDecayTimer || 0) - dt * 3.2);

            } else {

                const lastKnown = this.lastKnownWantedPos || { x: pEnt.x, y: pEnt.y };
                const distToLastKnown = Math.hypot(pEnt.x - lastKnown.x, pEnt.y - lastKnown.y);
                // Real-Life Crime Scene Investigation Principle:
                // 1) If the player lingers at the crime scene (< 260px), or
                // 2) If a 911 unit is still en route from the Precinct and hasn't finished inspecting the crime scene (< 4.5s on scene),
                // the APB stays active until the unit arrives and inspects the scene!
                const unitEnRouteOrInspectingScene =
                    !this.hasBeenDirectlySpottedByCop &&
                    ((this.crimeSceneLockTimer || 0) > 0 && (this.crimeSceneSearchedTimer || 0) < 4.5);
                const lingeredAtCrimeScene =
                    (distToLastKnown < 260 && ((this.crimeSceneLockTimer || 0) > 0 || ((activeCopCars + activeFootCopsNear) > 0 && (this.crimeSceneSearchedTimer || 0) < 6.0))) ||
                    unitEnRouteOrInspectingScene;
                const switchedVehicleUnseen = Boolean(p.inVehicle && p.inVehicle !== this.wantedSpottedVehicle);
                const sceneClearedByCops = (this.crimeSceneSearchedTimer || 0) >= 4.5 && distToLastKnown >= 240;
                const evasionRate = lingeredAtCrimeScene ? 0.35 : (sceneClearedByCops ? 2.4 : (switchedVehicleUnseen ? 1.65 : 1.0));

                const nextDecay = (this.wantedDecayTimer || 0) + dt * evasionRate;
                this.wantedDecayTimer = lingeredAtCrimeScene ? Math.min(decayThreshold - 3.5, nextDecay) : nextDecay;

                if (this.wantedDecayTimer >= decayThreshold) {

                    // Full APB Search Cleared! Award getaway bonus if any pot accumulated and call off the pursuit.
                    if ((this.wantedGetawayPot || 0) >= 50 && !p.dead) {
                        const bonus = Math.round(this.wantedGetawayPot);
                        this.wantedGetawayPot = 0;
                        this.addCash(bonus, `🕵️ VCPD SEARCH EVADED (+$${bonus})!`);
                    }
                    this.setWantedLevel(0);

                }

            }

        } else {
            this.isPoliceSpotted = false;
            this.hasBeenDirectlySpottedByCop = false;
            this._crimeSceneAnnounced = false;
            this.wantedDecayTimer = 0;
            this.crimeSceneLockTimer = 0;
            this.crimeSceneSearchedTimer = 0;
        }



        // 7B. 911 Emergency Ambulance & Fire Department Dispatch (throttled to 4 Hz = 0.25s intervals)

        if (!isClientWorldSync) {

            if (this.medicDispatchCooldown > 0) {
                this.medicDispatchCooldown = Math.max(0, this.medicDispatchCooldown - dt);
            }
            this.fireDispatchCooldown = Math.max(0, (this.fireDispatchCooldown || 0) - dt);
            this._emergScanAccum = (this._emergScanAccum || 0) + dt;
            if (this._emergScanAccum >= 0.25) {
                const emergDt = this._emergScanAccum;
                this._emergScanAccum = 0;

            const unassignedCasualties = [];
            for (const ped of this.peds) {
                if (!ped.dead || ped.revived || ped._boardedVehicle || ped.unreachableForMedic || ped.deathKind === "DROWNED" || (ped.deadTimer || 0) < 2.5) continue;
                if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(ped.x, ped.y)) continue;
                if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(Math.floor(ped.x / TILE_SIZE), Math.floor(ped.y / TILE_SIZE))) continue;
                const d = this.getDistanceToNearestHumanPlayer(ped.x, ped.y);
                if (d < 1250) {
                    unassignedCasualties.push(ped);
                }
            }

            if (unassignedCasualties.length > 0 && (this.medicDispatchCooldown || 0) <= 0) {
                // Coherent Hospital Fleet Logic: 1 Ambulance for 1-3 victims, maximum 2 Ambulances for 4+ victims so they never pile up!
                const desiredMedics = Math.min(2, Math.ceil(unassignedCasualties.length / 3));
                let activeNearMedics = 0;
                let localMedics = 0;

                for (const v of this.vehicles) {
                    if (v.specKey === "MEDIC_AMBULANCE" && !v.destroyed && v.driver === "AI_EMERGENCY") {
                        const isRemoteFleet = String(v.id || "").startsWith("fleet_");
                        if (!isRemoteFleet) localMedics++;
                        const dPlayer = this.getDistanceToNearestHumanPlayer(v.x, v.y);
                        if (dPlayer < 1380) {
                            activeNearMedics++;
                            if (!v.deployedMedic && (!v.medicTargetPed || v.medicTargetPed.revived || !v.medicTargetPed.dead)) {
                                const pickCas = unassignedCasualties[activeNearMedics % unassignedCasualties.length];
                                v.medicTargetPed = pickCas;
                                v.sirenActive = true;
                            }
                        }
                    }
                }

                // Dispatch at most 2 local Ambulances from the Hospital, spaced by a 9.5s cooldown!
                if (activeNearMedics < desiredMedics && localMedics < 2) {
                    this.medicDispatchTimer = (this.medicDispatchTimer || 0) + emergDt;
                    if (this.medicDispatchTimer > 4.2) {
                        this.medicDispatchTimer = 2.0;
                        const targetCas = unassignedCasualties[activeNearMedics % unassignedCasualties.length];
                        const pz = targetCas.z || 2.0;
                        const spawnInfo = this.findStationDispatchSpawn("MEDIC", targetCas.x, targetCas.y, pz);
                        if (spawnInfo) {
                            const medCar = new Vehicle(`medic_${Date.now()}_${localMedics}`, "MEDIC_AMBULANCE", spawnInfo.x, spawnInfo.y, spawnInfo.angle);
                            medCar.z = spawnInfo.z;
                            medCar.driver = "AI_EMERGENCY";
                            medCar.isPersistentFleet = true;
                            medCar.homeStation = spawnInfo.station;
                            medCar.medicTargetPed = targetCas;
                            medCar.sirenActive = true;
                            medCar.speed = 98;
                            medCar.vx = Math.cos(spawnInfo.angle) * 98;
                            medCar.vy = Math.sin(spawnInfo.angle) * 98;
                            this.vehicles.push(medCar);
                            this.medicDispatchTimer = 0;
                            this.medicDispatchCooldown = 9.5;
                        }
                    }
                } else {
                    this.medicDispatchTimer = 0;
                }
            } else {
                this.medicDispatchTimer = 0;
            }

            // 7b-2. 911 Fire Department Dispatch (FIRE_TRUCK): VCFD Central Station dispatches 1 to 2 Fire Engines
            const burningVehsNearPlayer = [];
            for (const v of this.vehicles) {
                if (v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") continue;
                if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(v.x, v.y)) continue;
                if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(Math.floor(v.x / TILE_SIZE), Math.floor(v.y / TILE_SIZE))) continue;
                const isLiveBurning = !v.destroyed && ((v.burnTimer || 0) > 0 || v.hp <= 50);
                const isFreshBurningWreck = v.destroyed && !v.fireExtinguished && (v.abandonedTimer || 0) >= 1.5;
                if ((isLiveBurning || isFreshBurningWreck) && this.getDistanceToNearestHumanPlayer(v.x, v.y) < 1350) {
                    burningVehsNearPlayer.push(v);
                }
            }
            if (burningVehsNearPlayer.length > 0 && this.fireDispatchCooldown <= 0) {
                const desiredFireTrucks = Math.min(2, Math.ceil(burningVehsNearPlayer.length / 2));
                let activeNearFireTrucks = 0;
                let localFireTrucks = 0;

                for (const v of this.vehicles) {
                    if (!v.destroyed && v.specKey === "FIRE_TRUCK" && v.driver === "AI_EMERGENCY") {
                        const isRemoteFleet = String(v.id || "").startsWith("fleet_");
                        if (!isRemoteFleet) localFireTrucks++;
                        const dPlayer = this.getDistanceToNearestHumanPlayer(v.x, v.y);
                        if (dPlayer < 1520) {
                            activeNearFireTrucks++;
                            if (!v.deployedFireman && (!v.fireTargetCar || v.fireTargetCar.fireExtinguished)) {
                                v.fireTargetCar = burningVehsNearPlayer[activeNearFireTrucks % burningVehsNearPlayer.length];
                                v.sirenActive = true;
                            }
                        }
                    }
                }

                if (activeNearFireTrucks < desiredFireTrucks && localFireTrucks < 2) {
                    this.fireDispatchTimer = (this.fireDispatchTimer || 0) + emergDt;
                    if (this.fireDispatchTimer > 1.8) {
                        this.fireDispatchTimer = 0.8;
                        const targetFireVeh = burningVehsNearPlayer[activeNearFireTrucks % burningVehsNearPlayer.length];
                        const fz = targetFireVeh.z || 2.0;
                        const spawnInfo = this.findStationDispatchSpawn("FIRE", targetFireVeh.x, targetFireVeh.y, fz);
                        if (spawnInfo) {
                            const fireCar = new Vehicle(`vcfd_${Date.now()}_${localFireTrucks}`, "FIRE_TRUCK", spawnInfo.x, spawnInfo.y, spawnInfo.angle);
                            fireCar.z = spawnInfo.z;
                            fireCar.driver = "AI_EMERGENCY";
                            fireCar.isPersistentFleet = true;
                            fireCar.homeStation = spawnInfo.station;
                            fireCar.fireTargetCar = targetFireVeh;
                            fireCar.sirenActive = true;
                            fireCar.speed = 108;
                            fireCar.vx = Math.cos(spawnInfo.angle) * 108;
                            fireCar.vy = Math.sin(spawnInfo.angle) * 108;
                            this.vehicles.push(fireCar);
                            this.fireDispatchTimer = 0;
                            this.fireDispatchCooldown = 5.5;
                        }
                    }
                } else {
                    this.fireDispatchTimer = 0;
                }
            } else {
                this.fireDispatchTimer = 0;
            }
            }

            // 7c. Ambient Random Street Crime & Police Intervention Events (Independent of Player)
            this.updateAmbientCrimeEvents(dt);

            // 7d. Municipal Tow Truck (Fourrière) & Abandoned Road Vehicle Clearance
            this.updateRoadClearanceAndTowing(dt);

        }



        // 8. Projectiles Update (Hits buildings via GameMapManager::TraceSegment2D, vehicles, crates, peds, player)

        for (let i = this.projectiles.length - 1; i >= 0; i--) {

            const pr = this.projectiles[i];

            const prevX = pr.x;

            const prevY = pr.y;

            const stepX = pr.vx * dt;

            const stepY = pr.vy * dt;

            pr.x += stepX;

            pr.y += stepY;

            const stepDist = Math.hypot(stepX, stepY);
            pr.rangeLeft -= stepDist;

            if (pr.isRocket) {
                pr._trailAcc = (pr._trailAcc || 0) + stepDist;
                if (pr._trailAcc >= 14) {
                    pr._trailAcc -= 14;
                    const pAng = typeof pr.angle === "number" ? pr.angle : Math.atan2(pr.vy || 0, pr.vx || 1);
                    const tx = pr.x - Math.cos(pAng) * 10;
                    const ty = pr.y - Math.sin(pAng) * 10;
                    this.spawnParticle(tx, ty, "SMOKE");
                    if (pr.isTankShell) {
                        this.spawnParticle(tx, ty, "FIRE");
                    }
                }
            }



            let hitSomething = false;



            // Hit building? Exact 2D DDA grid raycast (GameMapManager::TraceSegment2D)
            const prZ = pr.z !== undefined ? pr.z : (p.z || 2.0);

            const traceRes = this.map.traceSegment2D(prevX, prevY, pr.x, pr.y, prZ);

            if (traceRes.hit) {

                pr.x = traceRes.pointX;

                pr.y = traceRes.pointY;

                hitSomething = true;

                if (!pr.isFlame && !pr.isRocket && Math.hypot(pr.x - p.x, pr.y - p.y) < 480) {

                    this.audio.playRicochet();

                }

            } else {

                const bCol = this.map.resolveCircleBuildingCollision(pr.x, pr.y, 3, prZ);

                if (bCol.hit) {

                    hitSomething = true;

                    if (!pr.isFlame && !pr.isRocket && Math.hypot(pr.x - p.x, pr.y - p.y) < 480) {

                        this.audio.playRicochet();

                    }

                }

            }



            // Hit smashable wooden crate?

            if (!hitSomething && this.map.crates) {

                for (let ci = 0; ci < this.map.crates.length; ci++) {

                    const cr = this.map.crates[ci];

                    if (!cr.smashed && Math.abs(cr.x - pr.x) < 18 && Math.abs(cr.y - pr.y) < 18 && Math.hypot(cr.x - pr.x, cr.y - pr.y) < 18) {

                        this.smashCrate(cr);

                        hitSomething = true;

                        break;

                    }

                }

            }



            // Hit vehicle? (Accelerated via 256px Vehicle Spatial Grid)

            if (!hitSomething) {

                const distTraveled = (pr.maxRange || 320) - (pr.rangeLeft || 0);
                const vHead = this._vehGridHead;
                const vNext = this._vehGridNext;

                const testVehHit = (v) => {
                    if (!v) return false;
                    if (v.z !== undefined && Math.abs(v.z - prZ) > 0.28) return false;
                    if (pr.fromPlayer && p.inVehicle === v) return false;
                    if (!pr.fromPlayer && pr.npcFaction === "COP" && v.isPolice && p.inVehicle !== v) return false;
                    if (!pr.fromPlayer && pr.npcFaction === "CRIMINAL" && v.driver === "AI_CRIMINAL") return false;
                    if (!pr.fromPlayer && !pr.npcFaction && v.isPolice && p.inVehicle !== v) return false;
                    const hitRad = (!pr.fromPlayer && p.inVehicle === v) ? Math.max(28, (v.w || 52) * 0.45) : 24;
                    const vdx = v.x - pr.x;
                    if (vdx >= hitRad || vdx <= -hitRad) return false;
                    const vdy = v.y - pr.y;
                    if (vdy >= hitRad || vdy <= -hitRad) return false;

                    // Do not let a vehicle immediately next to an NPC shooter swallow their bullet on spawn,
                    // nor swallow a bullet that is hitting the on-foot player right next to the car
                    if (!pr.fromPlayer && p.inVehicle !== v && (distTraveled < 44 || (!p.inVehicle && Math.hypot(p.x - pr.x, p.y - pr.y) < 16))) return false;

                    if (vdx * vdx + vdy * vdy < hitRad * hitRad) {
                        const vehDmg = pr.isRocket
                            ? pr.damage * 1.35
                            : (pr.isFlame ? pr.damage * 0.85 : (pr.fromPlayer ? pr.damage * 0.34 : pr.damage * 0.42));
                        if (pr.fromPlayer) {
                            v.damagedByPlayer = true;
                            if (v.isPolice && !pr.fromJason && Math.random() < 0.75) {
                                if (v.driver === "AI_COP" || v.driver === "AI_TRAFFIC") {
                                    this.setWantedLevel(Math.max(this.wantedLevel, 1), { x: v.x, y: v.y }, true);
                                } else {
                                    this.reportCrimeAt(v.x, v.y, Math.max(this.wantedLevel, 1), false, { isGunfire: true });
                                }
                            }
                        }
                        if (typeof v.receiveImpactDamage === "function") {
                            v.receiveImpactDamage(vehDmg, pr.x, pr.y, Boolean(pr.isRocket));
                        } else {
                            v.hp -= vehDmg;
                        }
                        if (!pr.fromPlayer && p.inVehicle === v && (v.isMotorcycle || v.isConvertible)) {
                            this.damagePlayer(pr.damage * 0.22);
                        }
                        this.spawnParticle(pr.x, pr.y, pr.isFlame ? "FIRE" : "SPARK");
                        if (!pr.isFlame && !pr.isRocket && Math.hypot(pr.x - p.x, pr.y - p.y) < 480) {
                            this.audio.playRicochet();
                        }
                        hitSomething = true;
                        return true;
                    }
                    return false;
                };

                if (vHead && vNext) {
                    const cx0 = Math.max(0, (pr.x - 28) >> 8);
                    const cx1 = Math.min(127, (pr.x + 28) >> 8);
                    const cy0 = Math.max(0, (pr.y - 28) >> 8);
                    const cy1 = Math.min(127, (pr.y + 28) >> 8);
                    for (let cy = cy0; cy <= cy1 && !hitSomething; cy++) {
                        const rowOff = cy << 7;
                        for (let cx = cx0; cx <= cx1 && !hitSomething; cx++) {
                            for (let vi = vHead[rowOff | cx]; vi !== -1; vi = vNext[vi]) {
                                if (testVehHit(this.vehicles[vi])) break;
                            }
                        }
                    }
                } else {
                    for (let vi = 0; vi < this.vehicles.length; vi++) {
                        if (testVehHit(this.vehicles[vi])) break;
                    }
                }

            }



            // Hit pedestrian? (Accelerated via 256px Pedestrian Spatial Grid)

            if (!hitSomething && (pr.fromPlayer || pr.fromRemoteId || pr.npcFaction === "COP" || pr.npcFaction === "CRIMINAL")) {
                const pHead = this._pedGridHead;
                const pNext = this._pedGridNext;

                const testPedHit = (ped) => {
                    if (!ped || ped.dead) return false;
                    if (ped.z !== undefined && Math.abs(ped.z - prZ) > 0.28) return false;
                    // Jason's cover fire never hits innocent civilians or monks!
                    if (pr.fromJason && ped.kind !== "COP" && ped.kind !== "HOSTILE" && ped.kind !== "CRIMINAL" && !ped.isAlertedGuard) return false;
                    // Police bullets only hit armed criminals on foot (never friendly fire other cops or civilians)
                    if (pr.npcFaction === "COP" && ped.kind !== "CRIMINAL") return false;
                    // Criminal bullets hit VCPD officers
                    if (pr.npcFaction === "CRIMINAL" && ped.kind !== "COP") return false;

                    const pdx = ped.x - pr.x;
                    if (pdx >= 13 || pdx <= -13) return false;
                    const pdy = ped.y - pr.y;
                    if (pdy >= 13 || pdy <= -13) return false;

                    if (pdx * pdx + pdy * pdy < 169) {
                        if (pr.isElectro) {
                            // GTA 2 ElectroGun: freeze & electrocute (X-ray skeleton flash) then drop charred
                            if (!(ped.electroTimer > 0)) {
                                ped.electroTimer = 1.5;
                                ped.electroByPlayer = Boolean(pr.fromPlayer);
                                ped.burnTimer = 0;
                                if (Math.hypot(ped.x - p.x, ped.y - p.y) < 480) this.audio.playPedScream();
                            }
                            this.spawnParticle(pr.x, pr.y, "SPARK");
                            hitSomething = true;
                            return true;
                        }

                        // Cop-vs-bandit crossfire is deliberately less lethal so street shootouts last long enough to be watched
                        const npcVsNpcMul = (pr.npcFaction === "COP" && ped.kind === "CRIMINAL") ? 0.36 : 0.62;
                        const pedDmg = (pr.fromPlayer || pr.fromRemoteId) ? pr.damage : pr.damage * npcVsNpcMul;
                        ped.hp -= pedDmg;

                        if (pr.fromPlayer && ped.kind === "CRIMINAL") {
                            ped.attackedByPlayer = true;
                        }
                        if (pr.fromPlayer && ped.isVillaGuard) {
                            ped.isAlertedGuard = true;
                            ped.panicTimer = 0;
                        }

                        this.spawnParticle(pr.x, pr.y, "BLOOD");

                        if (pr.fromPlayer && (ped.calling911Timer || 0) > 0) {
                            if (this.director && typeof this.director.abortWitness911Call === "function") {
                                this.director.abortWitness911Call(ped, true);
                            } else {
                                ped.calling911Timer = 0;
                                ped.calling911Stars = 0;
                                ped.calling911Pos = null;
                            }
                        }

                        if (pr.fromPlayer && ped.kind === "COP" && Math.random() < 0.80) {
                            this.setWantedLevel(Math.max(this.wantedLevel, 2), { x: ped.x, y: ped.y }, true);
                        } else if (pr.fromPlayer && ped.hp > 0 && ped.kind === "CIVILIAN" && !ped.isVillaGuard) {
                            this.reportCrimeAt(ped.x, ped.y, Math.max(this.wantedLevel || 0, 1), false, { isGunfire: true });
                        }

                        if (Math.hypot(ped.x - p.x, ped.y - p.y) < 480) {
                            this.audio.playPedScream();
                        }

                        if (pr.isFlame && ped.hp > 0) {
                            ped.burnTimer = 3.2;
                            ped.panicTimer = (ped.kind === "COP" || ped.kind === "CRIMINAL") ? 0 : 4.5;
                            if (ped.kind !== "COP" && ped.kind !== "CRIMINAL") ped.angle = Math.random() * Math.PI * 2;
                        }

                        if (ped.hp <= 0) {
                            if (pr.isFlame) ped.deathKind = "BURNT";
                            this.killPed(ped, Boolean(pr.fromPlayer), Boolean(pr.fromRemoteId));
                        }

                        hitSomething = true;
                        return true;
                    }
                    return false;
                };

                if (pHead && pNext) {
                    const cx0 = Math.max(0, (pr.x - 16) >> 8);
                    const cx1 = Math.min(127, (pr.x + 16) >> 8);
                    const cy0 = Math.max(0, (pr.y - 16) >> 8);
                    const cy1 = Math.min(127, (pr.y + 16) >> 8);
                    for (let cy = cy0; cy <= cy1 && !hitSomething; cy++) {
                        const rowOff = cy << 7;
                        for (let cx = cx0; cx <= cx1 && !hitSomething; cx++) {
                            for (let pi = pHead[rowOff | cx]; pi !== -1; pi = pNext[pi]) {
                                if (testPedHit(this.peds[pi])) break;
                            }
                        }
                    }
                } else {
                    for (let pi = 0; pi < this.peds.length; pi++) {
                        if (testPedHit(this.peds[pi])) break;
                    }
                }

            }



            // Hit open-air street/beach animation participants?

            if (!hitSomething) {

                if (this.checkAndWipeoutLivingEvents(pr.x, pr.y, 26, Boolean(pr.fromPlayer), false, false, Boolean(pr.fromRemoteId))) {

                    this.spawnParticle(pr.x, pr.y, "BLOOD");

                    hitSomething = true;

                }

            }

            // Hit remote online player or Rival Bot?

            if (!hitSomething && pr.fromPlayer && this.net && this.net.remotePlayers.size > 0) {

                for (const rp of this.net.remotePlayers.values()) {

                    if (rp.dead) continue;
                    if (rp.z !== undefined && Math.abs(rp.z - prZ) > 0.28) continue;

                    const hitRadius = rp.veh ? 24 : 15;

                    if (Math.hypot(rp.x - pr.x, rp.y - pr.y) < hitRadius) {

                        this.net.damageRemotePlayer(rp, pr.damage, !pr.fromJason);

                        this.spawnParticle(pr.x, pr.y, pr.isFlame ? "FIRE" : "SPARK");

                        hitSomething = true;

                        break;

                    }

                }

            }



            // Hit player? (Stray police bullets during an NPC crime shootout do NOT hurt an innocent bystander player!)

            if (!hitSomething && !pr.fromPlayer && !p.inVehicle && !this.activeInterior && (p.z === undefined || Math.abs(p.z - prZ) <= 0.28) && Math.abs(p.x - pr.x) < 15 && Math.abs(p.y - pr.y) < 15 && Math.hypot(p.x - pr.x, p.y - pr.y) < 15) {
                const isSameSyndicateAlly = Boolean(
                    pr.fromRemoteId &&
                    pr.fromRemoteSyndicate &&
                    this.net &&
                    pr.fromRemoteSyndicate === this.net.syndicate &&
                    (!this.activeServerBounty || this.activeServerBounty.targetId !== this.net.playerId)
                );
                const canHitPlayer =
                    !isSameSyndicateAlly && (
                        Boolean(pr.fromRemoteId) ||
                        (pr.npcFaction === "COP" && (this.wantedLevel > 0 || this.peds.some(pd => !pd.dead && pd.carjackedCop))) ||
                        (pr.npcFaction === "CRIMINAL" && (this.wantedLevel > 0 || this.peds.some(pd => !pd.dead && (pd.isAlertedGuard || (pd.kind === "CRIMINAL" && (pd.provokedByPlayer || pd.missionTag === "MISSION_ENEMY")))))) ||
                        (!pr.npcFaction && this.wantedLevel > 0)
                    );

                if (canHitPlayer) {

                    if (pr.fromRemoteId) {

                        this.lastAttackerId = pr.fromRemoteId;

                        this.lastAttackerName = pr.fromRemoteName || "ONLINE RIVAL";

                    }

                    this.damagePlayer(pr.damage * 0.45);

                    hitSomething = true;

                }

            }



            if (hitSomething || pr.rangeLeft <= 0) {

                if (pr.isRocket) {

                    this.explodeAt(pr.x, pr.y, 130, 220, Boolean(pr.fromPlayer));

                }

                this.projectiles.splice(i, 1);

            }

        }



        // 9. Particles & Floating Texts Update (with 3D Ballistic Hydrodynamic Water Jets, GTA 2 gibs.cpp + 3D bouncing detached car parts!)
        if (typeof this.ensureVehicleSpatialGrid === "function") this.ensureVehicleSpatialGrid();
        let pWrite = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const pt = this.particles[i];
            if (pt.kind === "WATER_JET") {
                // Aerodynamic drag + 3D gravity arc + real physical collisions against walls, vehicle OBBs & pedestrians!
                const dragMult = Math.exp(-(pt.dragK || 0.85) * dt);
                pt.vx *= dragMult;
                pt.vy *= dragMult;
                if (typeof pt.vz === "number") {
                    pt.vz -= (pt.grav || 1.05) * dt;
                    pt.z = (pt.z || 2.08) + pt.vz * dt;
                }
                const stepDx = pt.vx * dt;
                const stepDy = pt.vy * dt;
                const nextX = pt.x + stepDx;
                const nextY = pt.y + stepDy;
                pt.traveled = (pt.traveled || 0) + Math.hypot(stepDx, stepDy);

                const refFloorZ = typeof pt.z === "number" ? pt.z : 2.0;
                const floorZ = (this.map && typeof this.map.getHeightAtPixel === "function")
                    ? this.map.getHeightAtPixel(nextX, nextY, refFloorZ)
                    : 2.0;
                let impacted = false;
                let impNx = 0, impNy = 0, hitHot = false;

                // A. True 3D Building Wall Collision (airborne water flies freely over seawalls, curbs & guardrails, stopping ONLY on solid 3D buildings!)
                if (this.map && this.map.surfaceGround) {
                    const nbx = Math.floor(nextX / TILE_SIZE);
                    const nby = Math.floor(nextY / TILE_SIZE);
                    if (nbx >= 0 && nbx < MAP_COLS && nby >= 0 && nby < MAP_ROWS && this.map.surfaceGround[nby * MAP_COLS + nbx] === GROUND_TYPE.BUILDING) {
                        const jLen = Math.hypot(stepDx, stepDy) || 1;
                        impNx = -stepDx / jLen;
                        impNy = -stepDy / jLen;
                        impacted = true;
                    }
                }
                if (!impacted) {
                    pt.x = nextX;
                    pt.y = nextY;
                }

                // B. Physical Vehicle OBB Impact & Pedagogical/Hydrodynamic Effects (checked on primary slugs via spatial grid — zero per-particle closure!)
                if (!impacted && pt.isPrimarySlug && Array.isArray(this.vehicles)) {
                    const gHead = this._vehGridHead;
                    const gNext = this._vehGridNext;
                    const checkWaterVeh = (ov) => {
                        if (!ov || ov === pt.sourceVeh) return false;
                        const dx = pt.x - ov.x;
                        const dy = pt.y - ov.y;
                        if (dx > 68 || dx < -68 || dy > 68 || dy < -68) return false;
                        const ovZ = ov.z !== undefined ? ov.z : 2.0;
                        if (typeof pt.z === "number" && pt.z > ovZ + 0.24) return false;
                        const cA = Math.cos(ov.angle || 0), sA = Math.sin(ov.angle || 0);
                        const locX = dx * cA + dy * sA;
                        const locY = -dx * sA + dy * cA;
                        const halfL = (ov.w || 58) * 0.50 + 3.0;
                        const halfW = (ov.h || 26) * 0.50 + 3.0;
                        if (Math.abs(locX) <= halfL && Math.abs(locY) <= halfW) {
                            const dLen = Math.hypot(dx, dy) || 1;
                            impNx = dx / dLen;
                            impNy = dy / dLen;
                            if (ov._bloodDistLeft) ov._bloodDistLeft *= 0.82;
                            if (ov._bloodDistRight) ov._bloodDistRight *= 0.82;
                            const pressRatio = Math.max(0.1, 1.0 - (pt.traveled || 0) / (pt.maxReach || 375));
                            if ((ov.isMotorcycle || ov.specKey === "MICRO_KART") && ov.driver !== "PLAYER" && pressRatio > 0.35) {
                                const jLen = Math.hypot(pt.vx, pt.vy) || 1;
                                ov.vx = (ov.vx || 0) + (pt.vx / jLen) * 16 * pressRatio;
                                ov.vy = (ov.vy || 0) + (pt.vy / jLen) * 16 * pressRatio;
                            }
                            const wasBurning = (!ov.destroyed && ((ov.burnTimer || 0) > 0 || ov.hp <= 50)) || (ov.destroyed && !ov.fireExtinguished);
                            if (wasBurning) {
                                hitHot = true;
                                ov.extinguishProgress = (ov.extinguishProgress || 0) + (pt.fromPlayer ? 0.14 : 0.045);
                                if (!ov.destroyed) {
                                    ov.chainExplodeTimer = 0;
                                    if (pt.fromPlayer) {
                                        ov.hp = Math.min(ov.maxHp, Math.max(ov.hp + 7.5, 60));
                                        ov.burnTimer = 0;
                                        if (ov.extinguishProgress >= 1.0 && !ov._playerFireReward) {
                                            ov._playerFireReward = true;
                                            this.score += 150;
                                            this.addFloatingText(ov.x, ov.y - 24, "🚒 VCFD +$150 — FIRE EXTINGUISHED!", "#e0f2fe");
                                            this.updateHud();
                                        }
                                    }
                                } else if (pt.fromPlayer && ov.extinguishProgress >= 1.35 && !ov.fireExtinguished) {
                                    ov.fireExtinguished = true;
                                    ov.burnTimer = 0;
                                    this.score += 150;
                                    this.addFloatingText(ov.x, ov.y - 24, "🚒 VCFD +$150 — WRECK EXTINGUISHED!", "#e0f2fe");
                                    this.updateHud();
                                }
                            }
                            return true;
                        }
                        return false;
                    };
                    if (gHead && gNext) {
                        const gx0 = Math.max(0, (pt.x - 70) >> 8), gx1 = Math.min(127, (pt.x + 70) >> 8);
                        const gy0 = Math.max(0, (pt.y - 70) >> 8), gy1 = Math.min(127, (pt.y + 70) >> 8);
                        for (let gy = gy0; gy <= gy1 && !impacted; gy++) {
                            const rowOff = gy << 7;
                            for (let gx = gx0; gx <= gx1 && !impacted; gx++) {
                                for (let vi = gHead[rowOff | gx]; vi !== undefined && vi !== -1; vi = gNext[vi]) {
                                    if (checkWaterVeh(this.vehicles[vi])) {
                                        impacted = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        for (let vi = 0; vi < this.vehicles.length; vi++) {
                            if (checkWaterVeh(this.vehicles[vi])) {
                                impacted = true;
                                break;
                            }
                        }
                    }
                }

                // C. Physical Pedestrian Hydrodynamic Knockback & Flame Dousing in Flight (spatialized via 256px ped grid!)
                if (!impacted && pt.isPrimarySlug && Array.isArray(this.peds)) {
                    const distFrac = Math.min(1.0, (pt.traveled || 0) / (pt.maxReach || 375));
                    const pressRatio = Math.max(0.12, 1.0 - distFrac * 0.85);
                    const sprayRad = 11.5 + distFrac * 13.5;
                    const sprayRadSq = sprayRad * sprayRad;
                    const jSpd = Math.hypot(pt.vx, pt.vy) || 1;
                    const jCos = pt.vx / jSpd, jSin = pt.vy / jSpd;
                    const pHeadW = this._pedGridHead;
                    const pNextW = this._pedGridNext;
                    const hitWaterPed = (ped) => {
                        if (!ped || ped.dead || (ped.kind === "FIREMAN" && !pt.fromPlayer)) return false;
                        const pdx = ped.x - pt.x, pdy = ped.y - pt.y;
                        if (pdx > sprayRad || pdx < -sprayRad || pdy > sprayRad || pdy < -sprayRad) return false;
                        if (pdx * pdx + pdy * pdy > sprayRadSq) return false;
                        if (typeof pt.z === "number" && pt.z > (ped.z || 2.0) + 0.28) return false;
                        const wasPedOnFire = (ped.burnTimer || 0) > 0;
                        if (wasPedOnFire) {
                            hitHot = true;
                            ped.burnTimer = 0;
                            ped.hp = Math.max(ped.hp || 40, 40);
                            if (pt.fromPlayer && !ped._playerSavedBurn) {
                                ped._playerSavedBurn = true;
                                this.score += 100;
                                this.addFloatingText(ped.x, ped.y - 22, "🚒 +$100 — CITIZEN EXTINGUISHED!", "#e0f2fe");
                                this.updateHud();
                            }
                        }
                        if (pt.fromPlayer || wasPedOnFire) {
                            const pushPx = (pt.isDeckGun ? 9.5 : 4.8) * pressRatio;
                            if (pressRatio > 0.30 && ped.kind !== "FIREMAN") {
                                ped.stunnedTimer = Math.max(ped.stunnedTimer || 0, 0.78 * pressRatio);
                                if (ped.kind === "CIVILIAN") ped.panicTimer = Math.max(ped.panicTimer || 0, 4.0);
                            }
                            let kx = ped.x + jCos * pushPx;
                            let ky = ped.y + jSin * pushPx;
                            if (this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                                const kc = this.map.resolveCircleBuildingCollision(kx, ky, 8, ped.z || 2.0, false);
                                kx = kc.x;
                                ky = kc.y;
                            }
                            if (!this.map || !this.map.isWaterAtPixel || !this.map.isWaterAtPixel(kx, ky) || (ped.z || 2.0) > 2.38) {
                                ped.x = kx;
                                ped.y = ky;
                            }
                            impNx = -jCos;
                            impNy = -jSin;
                            return true;
                        }
                        return false;
                    };
                    if (pHeadW && pNextW && this._pedGridLastLen === this.peds.length) {
                        const px0 = Math.max(0, (pt.x - 28) >> 8), px1 = Math.min(127, (pt.x + 28) >> 8);
                        const py0 = Math.max(0, (pt.y - 28) >> 8), py1 = Math.min(127, (pt.y + 28) >> 8);
                        for (let py = py0; py <= py1 && !impacted; py++) {
                            const rowOff = py << 7;
                            for (let px = px0; px <= px1 && !impacted; px++) {
                                for (let pi = pHeadW[rowOff | px]; pi !== undefined && pi !== -1; pi = pNextW[pi]) {
                                    if (hitWaterPed(this.peds[pi])) {
                                        impacted = true;
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        for (let pi = 0; pi < this.peds.length; pi++) {
                            if (hitWaterPed(this.peds[pi])) {
                                impacted = true;
                                break;
                            }
                        }
                    }
                }

                // D. Ground Touchdown at End of 3D Parabolic Arc (`pt.z <= floorZ + 0.015` or `pt.life <= dt`)
                pt.life -= dt;
                if (impacted || (typeof pt.z === "number" && pt.z <= floorZ + 0.015) || pt.life <= 0) {
                    if (pt.spawnSplash) {
                        this.triggerWaterImpactAt(pt, impNx, impNy, hitHot);
                        this.particles[pWrite++] = pt;
                    }
                } else {
                    this.particles[pWrite++] = pt;
                }
                continue;
            }
            if (!pt.isRestingGib) {
                const nextX = pt.x + pt.vx * dt;
                const nextY = pt.y + pt.vy * dt;
                if (pt.kind === "CAR_PART" && this.map && typeof this.map.resolveCircleBuildingCollision === "function") {
                    const bCol = this.map.resolveCircleBuildingCollision(nextX, nextY, 4.5, 2.0, false);
                    if (bCol.hit) {
                        pt.x = bCol.x;
                        pt.y = bCol.y;
                        pt.vx *= -0.45;
                        pt.vy *= -0.45;
                    } else {
                        pt.x = nextX;
                        pt.y = nextY;
                    }
                    pt.rot = (pt.rot || 0) + (pt.vRot || 0) * dt;
                } else {
                    pt.x = nextX;
                    pt.y = nextY;
                }
            }
            pt.life -= dt;
            if (pt.life <= 0) {
                if (pt.kind === "CAR_PART" && !pt.isRestingGib) {
                    const inWater = Boolean(this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(pt.x, pt.y));
                    if (!inWater && (pt.bouncesLeft || 0) > 0) {
                        pt.bouncesLeft--;
                        pt.vx *= 0.48;
                        pt.vy *= 0.48;
                        pt.vRot = (pt.vRot || 0) * 0.52;
                        pt.peakZ = (pt.peakZ || 0.25) * 0.34;
                        pt.maxLife = 0.26;
                        pt.life = 0.26;
                        this.particles[pWrite++] = pt;
                    } else if (!inWater) {
                        pt.isRestingGib = true;
                        pt.vx = 0;
                        pt.vy = 0;
                        pt.vRot = 0;
                        const settleDur = (pt.partType === "GLASS" || pt.partType === "TAIL_GLASS" || pt.partType === "TRIM") ? 4.5 : 10.5;
                        pt.life = settleDur;
                        pt.maxLife = settleDur;
                        this.particles[pWrite++] = pt;
                    }
                } else if (pt.kind === "GIB_ARC" && !pt.isRestingGib) {
                    pt.isRestingGib = true;
                    pt.vx = 0;
                    pt.vy = 0;
                    pt.life = 18.0;
                    pt.maxLife = 18.0;
                    this.particles[pWrite++] = pt;
                }
            } else {
                this.particles[pWrite++] = pt;
            }
        }
        this.particles.length = pWrite;



        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {

            const ft = this.floatingTexts[i];

            ft.y -= 28 * dt;

            ft.life -= dt;

            if (ft.life <= 0) this.floatingTexts.splice(i, 1);

        }



        // Progressive fade-out & cleanup of tire/surface tracks (grass, sand, mud, road — single-pass O(N) compaction)
        let sWrite = 0;
        for (let i = 0; i < this.skidmarks.length; i++) {
            const sk = this.skidmarks[i];
            if (typeof sk.life === "number") {
                sk.life -= dt;
                if (sk.life > 0) {
                    this.skidmarks[sWrite++] = sk;
                }
            } else {
                this.skidmarks[sWrite++] = sk;
            }
        }
        this.skidmarks.length = sWrite;



        // 10. Official Vice City Landmarks ("Lieux Officiels") Discovery & Perks

        if (!this.activeInterior && Array.isArray(this.map.landmarks)) {

            for (let li = 0; li < this.map.landmarks.length; li++) {

                const lm = this.map.landmarks[li];

                if (lm.perkCooldown > 0) {

                    lm.perkCooldown = Math.max(0, lm.perkCooldown - dt);

                }

                if (Math.abs(p.x - lm.x) >= 105 || Math.abs(p.y - lm.y) >= 105) continue;

                const distLm = Math.hypot(p.x - lm.x, p.y - lm.y);

                if (distLm < 105) {

                    if (!lm.visited) {

                        lm.visited = true;

                        const visitedCount = this.map.landmarks.filter((l) => l.visited).length;

                        const totalLm = this.map.landmarks.length;

                        this.audio.playFanfare("MISSION");

                        this.showBigBanner(

                            `🌴 ${lm.name}`,

                            `${lm.sub} — LANDMARK ${visitedCount}/${totalLm} DISCOVERED!`,

                            lm.color || "#ff2a85",

                            3.2

                        );

                        this.sendPager(

                            "JASON DUVAL",

                            `WELCOME TO ${lm.name}! (${lm.district}) — ${lm.sub}. [${visitedCount}/${totalLm} VICE CITY LANDMARKS VISITED]`,

                            false

                        );

                    }

                    // Landmark perks (free heal / armor / cash) removed: everything is sold in shops

                }

            }

        }



        // 11. District Change Detection & Restricted Security Compound Trespass (VCIA Tarmac & Leonida Penitentiary Yard)
        const distTileKey = ((p.y >> 6) << 10) | (p.x >> 6);
        let newDist = this._cachedDistrictName;
        if (this._cachedDistrictTileKey !== distTileKey || !newDist) {
            this._cachedDistrictTileKey = distTileKey;
            newDist = this.map.getDistrictName(p.x, p.y);
            this._cachedDistrictName = newDist;
        }

        if (newDist !== this.currentDistrict) {

            this.currentDistrict = newDist;

            this.districtPopupTimer = 2.8;

            this.showDistrictBanner(newDist);

            const rLabel = document.getElementById("radar-label");

            if (rLabel) rLabel.textContent = newDist;

        }

        if (this.districtPopupTimer > 0) {

            this.districtPopupTimer = Math.max(0, this.districtPopupTimer - dt);

        }

        this.updateLivingEventsRespawn(dt);
        this.updateArcade2026Systems(dt);



        if (!p.dead && !this.activeInterior && this.map.prisonCompound) {

            const pc = this.map.prisonCompound;

            const inPrisonCompound = (p.x > pc.inX0 + 10 && p.x < pc.inX1 - 10 && p.y > pc.y0 + 24 && p.y < pc.inY1 - 10);

            if (inPrisonCompound) {

                const isAuthorized = Boolean((p.inVehicle && p.inVehicle.isPolice) || p.charId === "DETECTIVE" || p.charId === "CROCKETT");

                if (!isAuthorized) {

                    if (!this._inRestrictedPrison) {

                        this._inRestrictedPrison = true;

                        if (this.wantedLevel < 3) {

                            this.setWantedLevel(3);

                            this.wantedDecayTimer = 0;

                        }

                        this.addFloatingText(p.x, p.y - 30, "🚨 PENITENTIARY BREACH — 3★ WANTED!", "#ef4444");

                        this.sendPager(

                            "LEONIDA CORRECTIONS HQ",

                            "LOCKDOWN ALERT! Trespasser inside Leonida State Penitentiary yard! Correctional Officers & SWAT authorized to use lethal force!",

                            true

                        );

                    }

                    this.wantedDecayTimer = 0;

                }

            } else {

                this._inRestrictedPrison = false;

            }

        }



        if (!p.dead && !this.activeInterior && this.map.airportCompound) {

            const ac = this.map.airportCompound;

            const inAirportCompound = (p.x > ac.x0 + 36 && p.x < ac.x1 - 36 && p.y > ac.y0 + 36 && p.y < ac.y1 - 36);

            if (inAirportCompound) {

                const isAuthorizedVehicle = Boolean(p.inVehicle && (p.inVehicle.isPolice || p.inVehicle.isEmergency));

                const isCopOutfit = (p.charId === "DETECTIVE" || p.charId === "CROCKETT");

                if (!isAuthorizedVehicle && !isCopOutfit) {

                    if (!this._inRestrictedAirport) {

                        this._inRestrictedAirport = true;

                        if (this.wantedLevel < 2) {

                            this.setWantedLevel(2);

                            this.wantedDecayTimer = 0;

                        }

                        this.addFloatingText(p.x, p.y - 30, "🚨 RESTRICTED AIRFIELD TARMAC — 2★ WANTED!", "#ef4444");

                        this.sendPager(

                            "VCIA AIRPORT SECURITY",

                            "ALERT! Unauthorized trespass past VCIA security checkpoint onto active runways! VCPD Airport Units dispatched!",

                            true

                        );

                    }

                    this.wantedDecayTimer = 0;

                }

            } else {

                this._inRestrictedAirport = false;

            }

        }

        if (!p.dead && !this.activeInterior && this.map.seraCompound) {
            const sc = this.map.seraCompound;
            const inSeraCompound = (p.x > sc.x0 + 28 && p.x < sc.x1 - 28 && p.y > sc.y0 + 28 && p.y < sc.y1 - 28);
            if (inSeraCompound) {
                const isAuthorizedVehicle = Boolean(p.inVehicle && (p.inVehicle.isPolice || p.inVehicle.isEmergency));
                const isCopOutfit = (p.charId === "DETECTIVE" || p.charId === "CROCKETT");
                if (!isAuthorizedVehicle && !isCopOutfit) {
                    if (!this._inRestrictedSera) {
                        this._inRestrictedSera = true;
                        if (this.wantedLevel < 3) {
                            this.setWantedLevel(3);
                            this.wantedDecayTimer = 0;
                        }
                        this.addFloatingText(p.x, p.y - 30, "🚨 RESTRICTED AREA: SERA SPACE CENTER — 3★ WANTED!", "#ef4444");
                        this.sendPager(
                            "SERA FEDERAL SECURITY",
                            "ALERT! Unauthorized breach of SERA Launch Complex 39A security checkpoint! SWAT & Federal Units dispatched!",
                            true
                        );
                    }
                    this.wantedDecayTimer = 0;
                }
            } else {
                this._inRestrictedSera = false;
            }
        }



        // 12. Missions, Online P2P Network, Footsteps & Spatial Ambient Audio Update

        if (this.started && this.missions) {
            this.missions.update(dt);
        }

        if (this.net) {

            this.net.update(dt);

        }



        // 12A. Surface-aware Footsteps for Lucia on foot (Pavement, Vice Beach Sand, Park Grass, Water)
        if (this.started && !this.activeInterior) {

        if (!p.inVehicle && !p.dead) {

            const moveSpd = Math.hypot(p.vx || 0, p.vy || 0);

            if (moveSpd > 22) {

                this._footstepTimer = (this._footstepTimer || 0) - dt;

                const stepInterval = moveSpd > 145 ? 0.25 : 0.34;

                if (this._footstepTimer <= 0) {

                    this._footstepTimer = stepInterval;

                    this._footLeft = !this._footLeft;

                    const bc = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(p.x / 64)));

                    const br = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(p.y / 64)));

                    const bIdx = br * MAP_COLS + bc;

                    const gt = this.map.surfaceGround ? this.map.surfaceGround[bIdx] : 3;

                    const isSand = this.map.coastalSandMask && this.map.coastalSandMask[bIdx] === 1;

                    const surf = gt === 1 ? "WATER" : (isSand ? "SAND" : (gt === 4 ? "GRASS" : "PAVEMENT"));

                    this.audio.playFootstep(surf, this._footLeft);

                }

            } else {

                this._footstepTimer = 0.06;

            }

        }



        // 12B. Spatial AI Traffic Pass-By (with Doppler shift!), Emergency Siren Proximity & Ocean Surf

        let nearestTrafficDist = 9999;

        let nearestTrafficSpeed = 0;

        let trafficDoppler = 1.0;

        let trafficIsMoto = false;

        let nearestSirenDist = 9999;

        let nearestSirenType = "POLICE";

        let sirenDoppler = 1.0;

        const audioVehList = this.vehicles || [];
        const aHead = this._vehGridHead;
        const aNext = this._vehGridNext;
        const scanAudioVeh = (v) => {
            if (!v || v.destroyed) return;
            const dx = v.x - p.x;
            const dy = v.y - p.y;
            if (dx > 940 || dx < -940 || dy > 940 || dy < -940) return;
            const d = Math.hypot(dx, dy);
            const parkedOnSceneRig = Math.abs(v.speed || 0) < 5 && Boolean(v.deployedMedic || v.deployedFireman);
            if (!parkedOnSceneRig && v.specKey !== "TOW_TRUCK" && (v.sirenActive || (this.wantedLevel > 0 && v.isPolice && v.driver === "AI_COP")) && v.driver && v.driver !== "AI_TOW" && d < nearestSirenDist) {
                nearestSirenDist = d;
                nearestSirenType = v.specKey === "MEDIC_AMBULANCE"
                    ? "MEDIC"
                    : (v.specKey === "FIRE_TRUCK" ? "FIRE" : "POLICE");
                if (d > 1) {
                    const sRadVel = -((v.vx || 0) * (dx / d) + (v.vy || 0) * (dy / d));
                    sirenDoppler = 1.0 + Math.max(-0.12, Math.min(0.12, sRadVel / 650));
                } else {
                    sirenDoppler = 1.0;
                }
            }
            if (v === p.inVehicle || !v.driver) return;
            if (v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") return;
            const vSpd = Math.abs(v.speed || 0);
            if (vSpd < 10) return;
            if (d < nearestTrafficDist && d > 1) {
                nearestTrafficDist = d;
                nearestTrafficSpeed = vSpd;
                trafficIsMoto = Boolean(v.isMotorcycle);
                const radialVel = -((v.vx || 0) * (dx / d) + (v.vy || 0) * (dy / d));
                trafficDoppler = 1.0 + Math.max(-0.22, Math.min(0.24, radialVel / 650));
            }
        };
        if (aHead && aNext) {
            const ax0 = Math.max(0, (p.x - 940) >> 8), ax1 = Math.min(127, (p.x + 940) >> 8);
            const ay0 = Math.max(0, (p.y - 940) >> 8), ay1 = Math.min(127, (p.y + 940) >> 8);
            for (let ay = ay0; ay <= ay1; ay++) {
                const rowOff = ay << 7;
                for (let ax = ax0; ax <= ax1; ax++) {
                    for (let vi = aHead[rowOff | ax]; vi !== undefined && vi !== -1; vi = aNext[vi]) {
                        scanAudioVeh(audioVehList[vi]);
                    }
                }
            }
        } else {
            for (let i = 0; i < audioVehList.length; i++) {
                scanAudioVeh(audioVehList[i]);
            }
        }



        // Compute proximity to Atlantic Ocean / Biscayne Bay / Lake Leonida water tiles (cached per player 64px tile!)
        const pc = Math.max(4, Math.min(MAP_COLS - 5, p.x >> 6));
        const pr = Math.max(4, Math.min(MAP_ROWS - 5, p.y >> 6));
        const waterTileKey = (pr << 10) | pc;
        let waterProximity = this._cachedWaterProx || 0;
        if (this._cachedWaterTileKey !== waterTileKey) {
            this._cachedWaterTileKey = waterTileKey;
            waterProximity = 0;
            if (this.map.surfaceGround) {
                for (let dr = -4; dr <= 4; dr += 2) {
                    for (let dc = -4; dc <= 4; dc += 2) {
                        if (this.map.surfaceGround[(pr + dr) * MAP_COLS + (pc + dc)] === 1) {
                            const wd = Math.hypot(dc, dr);
                            waterProximity = Math.max(waterProximity, Math.max(0, 1 - wd / 5.5));
                        }
                    }
                }
            }
            this._cachedWaterProx = waterProximity;
        }



        const pVeh = p.inVehicle;

        const playerThrottle = pVeh

            ? ((this.input.up || (this.input.joyActive && this.input.joyMag > 0.15)) ? 1 : (this.input.down ? -1 : 0))

            : 0;

        const playerSirenType = (pVeh && pVeh.sirenActive)

            ? (pVeh.specKey === "MEDIC_AMBULANCE" ? "MEDIC" : (pVeh.specKey === "FIRE_TRUCK" ? "FIRE" : "POLICE"))

            : nearestSirenType;



        const nearestHeliDist = this.policeHeli
            ? Math.hypot(this.policeHeli.x - p.x, this.policeHeli.y - p.y)
            : 9999;
        const heliDoppler = (this.policeHeli && nearestHeliDist < 940)
            ? (1.0 + Math.sin((this.policeHeli.orbitAngle || 0) * 2.0) * 0.045)
            : 1.0;

        const audioState = this._audioStateObj || (this._audioStateObj = {});
        audioState.inVehicle = Boolean(pVeh);
        audioState.vehicleSpeed = pVeh ? pVeh.speed : 0;
        audioState.vehicleSpecKey = pVeh ? pVeh.specKey : null;
        audioState.vehicleMaxSpeed = pVeh ? pVeh.maxSpeed : 420;
        audioState.vehicleThrottle = playerThrottle;
        audioState.vehicleDrifting = Boolean(pVeh && pVeh.drifting);
        audioState.turretSpinSpeed = pVeh ? (pVeh.turretSpinSpeed || 0) : 0;
        audioState.playerSirenActive = Boolean(pVeh && pVeh.sirenActive);
        audioState.wantedLevel = this.wantedLevel;
        audioState.nearestCopDist = nearestCopDist;
        audioState.nearestSirenDist = nearestSirenDist;
        audioState.nearestSirenType = (pVeh && pVeh.sirenActive) ? playerSirenType : nearestSirenType;
        audioState.sirenDoppler = sirenDoppler;
        audioState.nearestHeliDist = nearestHeliDist;
        audioState.heliDoppler = heliDoppler;
        audioState.nearestTrafficDist = nearestTrafficDist;
        audioState.nearestTrafficSpeed = nearestTrafficSpeed;
        audioState.trafficDoppler = trafficDoppler;
        audioState.trafficIsMoto = trafficIsMoto;
        audioState.waterProximity = waterProximity;
        audioState.nightFactor = this.renderer ? (this.renderer.nightFactor || 0) : 0;
        this.audio.update(dt, audioState);
        }

        if (this.director && typeof this.director.updateAndAuditFrame === "function") {
            this.director.updateAndAuditFrame(dt);
        }

    }



    updateLivingEventsRespawn(dt) {
        if (!this.map || !this.player) return;
        this._livingRespawnAcc = (this._livingRespawnAcc || 0) + dt;
        if (this._livingRespawnAcc < 0.25) return;
        const stepDt = this._livingRespawnAcc;
        this._livingRespawnAcc = 0;
        const px = this.player.x;
        const py = this.player.y;
        const tickArray = (arr) => {
            if (!Array.isArray(arr)) return;
            for (let i = 0; i < arr.length; i++) {
                const it = arr[i];
                const wt = it.wipeoutTimer || 0;
                const uwt = it.umbWipeoutTimer || 0;
                if (wt <= 0 && uwt <= 0) continue;
                const distOut = Math.hypot(it.x - px, it.y - py) > 360;
                if (!distOut) continue;
                if (wt > 0) {
                    it.wipeoutTimer = Math.max(0, wt - stepDt);
                }
                if (uwt > 0) {
                    it.umbWipeoutTimer = Math.max(0, uwt - stepDt);
                }
            }
        };
        tickArray(this.map.streetEvents);
        tickArray(this.map.streetTakeovers);
        tickArray(this.map.beachSunbathers);
        tickArray(this.map.beachUmbrellas);
        tickArray(this.map.viceStreetDetails);
        if (this.missions && Array.isArray(this.missions.payphones)) {
            tickArray(this.missions.payphones);
        }
        tickArray(this.map.beachVolleyballCourts);
        tickArray(this.map.beachParties);
        tickArray(this.map.beachSwimmers);
        tickArray(this.map.beachCatchGames);
        tickArray(this.map.muscleBeachGyms);
        tickArray(this.map.wildernessCamps);
        tickArray(this.map.golfGreens);
        tickArray(this.map.tikiBars);
        if (this.map.stadiumScrimmage) {
            tickArray([this.map.stadiumScrimmage]);
        }
        if (this.map.industrialAndParkDetails) {
            tickArray(this.map.industrialAndParkDetails.bikerRallies);
            if (this.map.industrialAndParkDetails.miniGolf) {
                tickArray([this.map.industrialAndParkDetails.miniGolf]);
            }
        }
    }

    /* ========================================================================
       ARCADE 2026 RETENTION ENGINE (01_VISION_ARCADE_2026_RETENTION)
       - Spec-Ops Hot Drop Crate & Live Server Bounties (Balanced Economy)
       ======================================================================== */
    updateArcade2026Systems(dt) {
        const p = this.player;
        if (!p || !this.map) return;

        // 0. 3-Minute Active Flash District Hotspot & Dropped Kingpin Crown Trophy
        const fd = this.ensureActiveFlashDistrict();
        if (fd) {
            fd.timer = Math.max(0, (fd.timer || 180) - dt);
            if (fd.timer <= 0 && (!this.net || !this.net.wsConnected)) {
                const cat = this.getFlashDistrictCatalog();
                const next = cat[((fd.index || 0) + 1) % cat.length];
                this.activeFlashDistrict = {
                    index: next.index,
                    key: next.key,
                    label: next.label,
                    x: next.x,
                    y: next.y,
                    color: next.color,
                    timer: 180.0,
                    maxTimer: 180.0,
                    flamingoScore: 0,
                    cyanScore: 0
                };
            }
        }
        if (this.droppedKingpinCrown) {
            const cr = this.droppedKingpinCrown;
            cr.timer -= dt;
            const pObj = p.inVehicle || p;
            if (!p.dead && !this.activeInterior && Math.hypot(pObj.x - cr.x, pObj.y - cr.y) < 44) {
                const reward = cr.reward || 1000;
                this.droppedKingpinCrown = null;
                this.addCash(reward, "👑 STOLEN KINGPIN CROWN!", true);
                this.addTurfInfluence(600);
                this.showBigBanner(
                    "👑 KINGPIN CROWN CLAIMED!",
                    `YOU SEIZED THE GOLDEN CROWN (+$${reward.toLocaleString()} & +600 TURF INFLUENCE)!`,
                    "#fde047",
                    3.0
                );
                if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                    this.net.broadcastWorldEvent({ kind: "CROWN_CLAIM" });
                }
            } else if (cr.timer <= 0) {
                this.droppedKingpinCrown = null;
            }
        }

        // 1. 90s Hot Drop Flash Crate Event
        if (this.activeFlashEvent) {
            const ev = this.activeFlashEvent;
            ev.timer -= dt;
            const pObj = p.inVehicle || p;
            if (!this.activeInterior && Math.random() < 0.35 && typeof this.spawnParticle === "function") {
                this.spawnParticle(ev.x + (Math.random() - 0.5) * 18, ev.y + (Math.random() - 0.5) * 18, "SPARK");
            }
            if (!p.dead && !this.activeInterior && (Math.hypot(pObj.x - ev.x, pObj.y - ev.y) < 46 || Math.hypot(p.x - ev.x, p.y - ev.y) < 38)) {
                const reward = ev.reward || 800;
                const wep = ev.weapon || "ROCKET";
                this.activeFlashEvent = null;
                this.flashEventCooldown = 180.0;
                this.addCash(reward, "📦 HOT DROP CRATE!");
                p.armor = 100;
                if (Array.isArray(p.weaponsOwned) && !p.weaponsOwned.includes(wep)) {
                    p.weaponsOwned.push(wep);
                }
                if (p.ammo) {
                    p.ammo[wep] = Math.min(999, (p.ammo[wep] || 0) + (wep === "ROCKET" ? 8 : 80));
                }
                p.weapon = wep;
                if (this.audio && typeof this.audio.playFanfare === "function") {
                    this.audio.playFanfare("MISSION");
                }
                this.showBigBanner(
                    "📦 SPEC-OPS HOT DROP CLAIMED!",
                    `+$${reward.toLocaleString()} CASH • ${wep} & FULL ARMOR!`,
                    "#fde047",
                    3.0
                );
                const myName = (this.net && this.net.playerName) || p.nickname || "LUCIA";
                if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                    this.net.broadcastWorldEvent({
                        kind: "FLASH_DROP_CLAIM",
                        claimer: myName,
                        reward
                    });
                }
            } else if (ev.timer <= 0) {
                this.activeFlashEvent = null;
                this.flashEventCooldown = 180.0;
                this.addFloatingText(p.x, p.y - 24, "⌛ HOT DROP CRATE EXPIRED!", "#f97316");
            }
        } else if (!this.activeInterior && (!this.net || (!this.net.wsConnected && this.net.isWorldHost()))) {
            this.flashEventCooldown = (this.flashEventCooldown || 140.0) - dt;
            if (this.flashEventCooldown <= 0) {
                this.flashEventCooldown = 180.0;
                const pz = p.z || 2.0;
                for (let att = 0; att < 28; att++) {
                    const ang = Math.random() * Math.PI * 2;
                    const dist = 360 + Math.random() * 280;
                    const tx = Math.floor((p.x + Math.cos(ang) * dist) / TILE_SIZE);
                    const ty = Math.floor((p.y + Math.sin(ang) * dist) / TILE_SIZE);
                    if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(tx, ty)) continue;
                    const nb = this.map.getNavigationBlock ? this.map.getNavigationBlock(tx, ty, pz) : null;
                    if (!nb || (nb.groundType !== GROUND_TYPE.ROAD && nb.groundType !== GROUND_TYPE.PAWEMENT)) continue;
                    const wx = (tx + 0.5) * TILE_SIZE;
                    const wy = (ty + 0.5) * TILE_SIZE;
                    if (this.map.resolveCircleBuildingCollision && this.map.resolveCircleBuildingCollision(wx, wy, 20, pz).hit) continue;
                    const wepPool = ["ROCKET", "FLAMETHROWER", "ELECTRO", "SHOTGUN"];
                    const wep = wepPool[Math.floor(Math.random() * wepPool.length)];
                    const reward = 800;
                    const wz = this.map.getHeightAtPixel ? this.map.getHeightAtPixel(wx, wy, pz) : 2.0;
                    this.activeFlashEvent = { x: wx, y: wy, z: wz, timer: 90.0, maxTimer: 90.0, reward, weapon: wep };
                    this.sendPager(
                        "VICE NET FLASH EVENT",
                        `📦 SPEC-OPS HOT DROP CRATE landed nearby! Reach the golden flare within 90s for +$${reward.toLocaleString()} & ${wep}!`,
                        false
                    );
                    if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                        this.net.broadcastWorldEvent({
                            kind: "FLASH_DROP_SPAWN",
                            x: Math.round(wx),
                            y: Math.round(wy),
                            z: wz,
                            reward,
                            weapon: wep,
                            duration: 90
                        });
                    }
                    break;
                }
            }
        }

        // 2. Live Server Bounty System (Triggered at 4★+ Wanted Level)
        if (this.activeServerBounty) {
            this.activeServerBounty.timer -= dt;
            if (this.activeServerBounty.timer <= 0) {
                const b = this.activeServerBounty;
                this.activeServerBounty = null;
                this.bountyCooldown = 180.0;
                const myId = (this.net && this.net.playerId) || "local";
                if (b.targetId === myId && !p.dead) {
                    const survReward = b.reward || 1200;
                    this.addCash(survReward, "🏆 BOUNTY SURVIVED!");
                    if (this.audio && typeof this.audio.playFanfare === "function") {
                        this.audio.playFanfare("MISSION");
                    }
                    this.showBigBanner(
                        "🏆 BOUNTY SURVIVED!",
                        `SURVIVED SERVER MANHUNT — EARNED +$${survReward.toLocaleString()}!`,
                        "#39ff14",
                        3.0
                    );
                }
            }
        } else {
            this.bountyCooldown = Math.max(0, (this.bountyCooldown || 0) - dt);
            if (!p.dead && this.bountyCooldown <= 0 && (this.wantedLevel || 0) >= 4) {
                this.bountyCooldown = 180.0;
                const myId = (this.net && this.net.playerId) || "local";
                const myName = (this.net && this.net.playerName) || p.nickname || "LUCIA";
                const reward = 1200;
                this.activeServerBounty = {
                    targetId: myId,
                    targetName: myName,
                    reward,
                    timer: 60.0,
                    maxTimer: 60.0
                };
                this.sendPager(
                    "VICE NET SERVER BOUNTY",
                    `🎯 $${reward.toLocaleString()} BOUNTY PLACED ON ${myName}! Survive 60 seconds to claim the bounty yourself!`,
                    true
                );
                if (this.net && typeof this.net.broadcastWorldEvent === "function") {
                    this.net.broadcastWorldEvent({
                        kind: "BOUNTY_START",
                        targetId: myId,
                        targetName: myName,
                        reward,
                        duration: 60
                    });
                }
            }
        }
    }

    _ensureWipeoutCellMask() {
        if (this._wipeoutCellMask || !this.map || !Array.isArray(this.map.beachSunbathers)) {
            return this._wipeoutCellMask;
        }
        const mask = new Uint8Array(128 * 128);
        const markPt = (px, py, pad) => {
            const x0 = Math.max(0, (px - pad) >> 8);
            const x1 = Math.min(127, (px + pad) >> 8);
            const y0 = Math.max(0, (py - pad) >> 8);
            const y1 = Math.min(127, (py + pad) >> 8);
            for (let cy = y0; cy <= y1; cy++) {
                const rowOff = cy << 7;
                for (let cx = x0; cx <= x1; cx++) {
                    mask[rowOff | cx] = 1;
                }
            }
        };
        const m = this.map;
        const lists = [
            [m.beachSunbathers, 112],
            [m.beachUmbrellas, 76],
            [m.streetEvents, 86],
            [m.streetTakeovers, 108],
            [m.beachVolleyballCourts, 92],
            [m.beachParties, 92],
            [m.beachSwimmers, 86],
            [m.beachCatchGames, 86],
            [m.muscleBeachGyms, 86],
            [m.wildernessCamps, 84],
            [m.golfGreens, 82],
            [m.tikiBars, 92],
            [m.industrialAndParkDetails && m.industrialAndParkDetails.bikerRallies, 98]
        ];
        for (let li = 0; li < lists.length; li++) {
            const arr = lists[li][0];
            const pad = lists[li][1];
            if (!Array.isArray(arr)) continue;
            for (let i = 0; i < arr.length; i++) {
                const it = arr[i];
                if (it && typeof it.x === "number") markPt(it.x, it.y, pad);
            }
        }
        if (m.stadiumScrimmage) {
            markPt(m.stadiumScrimmage.x, m.stadiumScrimmage.y, 180);
        }
        if (m.industrialAndParkDetails && m.industrialAndParkDetails.miniGolf) {
            markPt(m.industrialAndParkDetails.miniGolf.x, m.industrialAndParkDetails.miniGolf.y, 92);
        }
        if (Array.isArray(m.viceStreetDetails)) {
            for (let i = 0; i < m.viceStreetDetails.length; i++) {
                const vd = m.viceStreetDetails[i];
                if (vd && (vd.kind === "CAFE_TABLE" || vd.kind === "CUBA_DOMINO_TABLE")) markPt(vd.x, vd.y, 76);
            }
        }
        this._wipeoutCellMask = mask;
        return mask;
    }

    checkAndWipeoutLivingEvents(hitX, hitY, hitRad = 28, byPlayer = true, isVehicleImpact = false, isNonLethal = false, fromNetwork = false, scatterOnly = false) {
        if (!this.map) return false;
        if (hitRad <= 52) {
            const mask = this._ensureWipeoutCellMask();
            if (mask) {
                const cx = hitX >> 8;
                const cy = hitY >> 8;
                if (cx < 0 || cx > 127 || cy < 0 || cy > 127 || !mask[(cy << 7) | cx]) {
                    return false;
                }
            }
        }
        let triggeredAny = false;

        const smashParasolFX = (ux, uy, knockAng) => {
            triggeredAny = true;
            if (this.audio && typeof this.audio.playCrateSmash === "function") {
                if (!this.player || Math.hypot(ux - this.player.x, uy - this.player.y) < 550) {
                    this.audio.playCrateSmash();
                }
            }
            const colors = ["#ff2a85", "#38bdf8", "#facc15", "#f8fafc", "#cbd5e1"];
            for (let pi = 0; pi < 14; pi++) {
                const spread = (Math.random() - 0.5) * 1.9;
                const ang = (knockAng !== undefined ? knockAng : Math.random() * Math.PI * 2) + spread;
                const spd = 45 + Math.random() * 115;
                this.particles.push({
                    x: ux + (Math.random() - 0.5) * 6,
                    y: uy + (Math.random() - 0.5) * 6,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    size: 3.5 + Math.random() * 4.0,
                    color: colors[pi % colors.length],
                    life: 0.48,
                    maxLife: 0.48
                });
            }
            if (byPlayer) {
                this.addFloatingText(ux, uy - 18, "⛱️ PARASOL SMASHED!", "#38bdf8");
            }
        };

        const spawnScenePeds = (scene, members, labelText, requireDirectHit = false) => {
            scene.wipeoutTimer = 40.0;
            triggeredAny = true;
            const bz = scene.z || this.map.getHeightAtPixel(scene.x, scene.y, 4.0);
            let killedCount = 0;
            const spawnedBatch = [];
            for (let i = 0; i < members.length; i++) {
                if (this.peds.length >= 235 && (scatterOnly || i > 0)) break;
                const m = members[i];
                const awayAng = Math.atan2(m.y - hitY, m.x - hitX);
                const ped = new Pedestrian({
                    x: m.x,
                    y: m.y,
                    z: bz,
                    angle: awayAng,
                    speed: 52,
                    kind: "CIVILIAN",
                    g24Type: m.ped || "vc_tourist",
                    g2Remapped: true,
                    shirtColor: "#f43f5e",
                    hp: 25,
                    dead: false,
                    panicTimer: 8.5,
                    threatX: hitX,
                    threatY: hitY,
                    turnSeed: i + 17
                });
                this.peds.push(ped);
                spawnedBatch.push({ ped, m, i, awayAng });
            }
            if (!scatterOnly) {
                for (let b = 0; b < spawnedBatch.length; b++) {
                    const { ped, m, i, awayAng } = spawnedBatch[b];
                    const checkX = m.seatX !== undefined ? m.seatX : m.x;
                    const checkY = m.seatY !== undefined ? m.seatY : m.y;
                    const d = Math.hypot(checkX - hitX, checkY - hitY);
                    if (d <= hitRad + 18 || (!requireDirectHit && i === 0 && killedCount === 0)) {
                        if (isNonLethal) {
                            ped.stunnedTimer = 1.65;
                            ped.panicTimer = 6.5;
                            ped.x += Math.cos(awayAng) * 14;
                            ped.y += Math.sin(awayAng) * 14;
                        } else {
                            this.killPed(ped, byPlayer, fromNetwork);
                        }
                        killedCount++;
                    }
                }
            }
            if (byPlayer && labelText && killedCount > 0) {
                this.addFloatingText(
                    scene.x,
                    scene.y - 22,
                    isNonLethal ? "💫 SUNBATHER KNOCKOUT!" : labelText,
                    isNonLethal ? "#38bdf8" : "#ff2a85"
                );
                if (isVehicleImpact && this.audio) {
                    if (isNonLethal && typeof this.audio.playPedScream === "function") {
                        this.audio.playPedScream();
                    } else if (!isNonLethal && typeof this.audio.playPedDeath === "function") {
                        this.audio.playPedDeath(null, true);
                    }
                }
            }
        };

        // 0. Lying Beach Sunbathers & Parasols (this.map.beachSunbathers, this.map.beachUmbrellas, sidewalk café parasols)
        const sbCull = hitRad + 56;
        if (Array.isArray(this.map.beachSunbathers)) {
            for (let i = 0; i < this.map.beachSunbathers.length; i++) {
                const sb = this.map.beachSunbathers[i];
                if (Math.abs(sb.x - hitX) > sbCull || Math.abs(sb.y - hitY) > sbCull) continue;
                let umbJustSmashed = false;
                if (sb.umbSpr && (sb.umbWipeoutTimer || 0) <= 0) {
                    const ux = sb.x + (sb.umbDx !== undefined ? sb.umbDx : -22);
                    const uy = sb.y + (sb.umbDy !== undefined ? sb.umbDy : -14);
                    if (Math.hypot(ux - hitX, uy - hitY) < hitRad + 16) {
                        sb.umbWipeoutTimer = 45.0;
                        sb.umbKnockAng = Math.atan2(uy - hitY, ux - hitX);
                        smashParasolFX(ux, uy, sb.umbKnockAng);
                        umbJustSmashed = true;
                    }
                }
                if ((sb.wipeoutTimer || 0) <= 0) {
                    const ang = sb.angle || 0;
                    const fx = sb.x - Math.sin(ang) * 25;
                    const fy = sb.y + Math.cos(ang) * 25;
                    const dMain = Math.hypot(sb.x - hitX, sb.y - hitY);
                    const dFriend = sb.friendPedType ? Math.hypot(fx - hitX, fy - hitY) : 9999;
                    if (dMain < hitRad + 18 || dFriend < hitRad + 18 || (umbJustSmashed && Math.min(dMain, dFriend) < hitRad + 34)) {
                        const members = [
                            { ped: sb.pedType || "bikini_pink", x: sb.x, y: sb.y }
                        ];
                        if (sb.friendPedType) {
                            members.push({ ped: sb.friendPedType, x: fx, y: fy });
                        }
                        if (sb.standingFriendType) {
                            members.push({ ped: sb.standingFriendType, x: sb.x + 14, y: sb.y - 12 });
                        }
                        if (sb.propSpr === "sandcastle_prop") {
                            const px = sb.x + (sb.propDx !== undefined ? sb.propDx : 24) + 11;
                            const py = sb.y + (sb.propDy !== undefined ? sb.propDy : -8) + 4;
                            members.push({ ped: (i % 2 === 0) ? "kid_beach" : "kid_girl_pink", x: px, y: py });
                        }
                        if (sb.extraPropSpr === "sandcastle_prop") {
                            const ex = sb.x + (sb.extraPropDx !== undefined ? sb.extraPropDx : 22) + 10;
                            const ey = sb.y + (sb.extraPropDy !== undefined ? sb.extraPropDy : 18) - 5;
                            members.push({ ped: "kid_boy_cap", x: ex, y: ey });
                        }
                        spawnScenePeds(sb, members, "🏖️ SUNBATHER FLATTENED!", true);
                    }
                }
            }
        }
        const umbCull = hitRad + 18;
        if (Array.isArray(this.map.beachUmbrellas)) {
            for (let i = 0; i < this.map.beachUmbrellas.length; i++) {
                const umb = this.map.beachUmbrellas[i];
                if ((umb.wipeoutTimer || 0) > 0) continue;
                if (Math.abs(umb.x - hitX) > umbCull || Math.abs(umb.y - hitY) > umbCull) continue;
                if (Math.hypot(umb.x - hitX, umb.y - hitY) < hitRad + 16) {
                    umb.wipeoutTimer = 45.0;
                    umb.knockAng = Math.atan2(umb.y - hitY, umb.x - hitX);
                    smashParasolFX(umb.x, umb.y, umb.knockAng);
                }
            }
        }
        if (Array.isArray(this.map.viceStreetDetails)) {
            const cafePairs = [
                ["bikini_pink", "vc_crockett"],
                ["vc_tourist", "bikini_cyan"],
                ["vc_cuban", "g2_civ_pink"],
                ["vc_hawaiian_red", "bikini_yellow"]
            ];
            for (let i = 0; i < this.map.viceStreetDetails.length; i++) {
                const vd = this.map.viceStreetDetails[i];
                if ((vd.kind !== "CAFE_TABLE" && vd.kind !== "CUBA_DOMINO_TABLE") || (vd.wipeoutTimer || 0) > 0) continue;
                if (Math.abs(vd.x - hitX) > umbCull || Math.abs(vd.y - hitY) > umbCull) continue;
                if (Math.hypot(vd.x - hitX, vd.y - hitY) < hitRad + 22) {
                    if (vd.kind === "CUBA_DOMINO_TABLE") {
                        spawnScenePeds(vd, [
                            { ped: "vc_cuban", x: vd.x - 24.5, y: vd.y, seatX: vd.x - 17.5, seatY: vd.y },
                            { ped: "vc_hawaiian_red", x: vd.x + 24.5, y: vd.y, seatX: vd.x + 17.5, seatY: vd.y },
                            { ped: "g2_civ_granny", x: vd.x, y: vd.y - 24.5, seatX: vd.x, seatY: vd.y - 17.5 }
                        ], "☕ CALLE OCHO DOMINO TABLE SCATTERED!");
                        continue;
                    }
                    const tblHash = Math.abs(Math.round(vd.y / 64));
                    const pair = cafePairs[tblHash % cafePairs.length];
                    const seatMode = tblHash % 3;
                    const pSittingHere = this.player && this.player.isSitting && this.player.sittingProp === vd;
                    const pNorth = (seatMode !== 2 && !(pSittingHere && this.player.sittingSeat === 0)) ? pair[0] : null;
                    const pSouth = (seatMode !== 1 && !(pSittingHere && this.player.sittingSeat === 1)) ? pair[1] : null;
                    const members = [];
                    if (pNorth) members.push({ ped: pNorth, x: vd.x + 19.5, y: vd.y - 18.0, seatX: vd.x, seatY: vd.y - 18.0 });
                    if (pSouth) members.push({ ped: pSouth, x: vd.x + 19.5, y: vd.y + 18.0, seatX: vd.x, seatY: vd.y + 18.0 });
                    if (members.length > 0) {
                        spawnScenePeds(vd, members, null);
                    } else {
                        vd.wipeoutTimer = 45.0;
                    }
                    vd.knockAng = Math.atan2(vd.y - hitY, vd.x - hitX);
                    smashParasolFX(vd.x, vd.y, vd.knockAng);
                }
            }
        }

        // 1. Street Events (Wynwood Breakdance Cyphers, Ocean Drive Bistro Tables, Park Benches, Club VIP Lines, Little Cuba Domino Crowds & Beach Social Circles)
        if (Array.isArray(this.map.streetEvents)) {
            const benchPairs = [
                ["bikini_pink", "vc_crockett"],
                ["vc_tourist", "bikini_cyan"],
                ["vc_tommy", null],
                ["g2_civ_aqua", "bikini_red"],
                [null, "bikini_yellow"]
            ];
            const northPeds = ["bikini_pink", "vc_tourist", "g2_civ_aqua", "bikini_red"];
            const southPeds = ["vc_crockett", "bikini_cyan", "vc_tommy", "bikini_yellow"];
            for (let i = 0; i < this.map.streetEvents.length; i++) {
                const ev = this.map.streetEvents[i];
                if ((ev.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(ev.x - hitX, ev.y - hitY) < hitRad + 26) {
                    const pSittingHere = this.player && this.player.isSitting && this.player.sittingProp === ev;
                    if (ev.kind === "WYNWOOD_CYPHER") {
                        spawnScenePeds(ev, [
                            { ped: "vc_cuban", x: ev.x, y: ev.y + 1 },
                            { ped: "vc_haitian", x: ev.x, y: ev.y - 26 },
                            { ped: "g2_civ_aqua", x: ev.x - 20, y: ev.y + 4 },
                            { ped: "bikini_pink", x: ev.x + 20, y: ev.y + 4 },
                            { ped: "vc_tourist", x: ev.x - 14, y: ev.y - 18 },
                            { ped: "g2_civ_pink", x: ev.x + 14, y: ev.y - 18 }
                        ], "💥 CYPHER CRASHED!");
                    } else if (ev.kind === "OCEAN_DRIVE_CROWD") {
                        const members = [];
                        if (!(pSittingHere && this.player.sittingSeat === 0)) {
                            members.push({ ped: northPeds[i % northPeds.length], x: ev.x + 19.5, y: ev.y - 18.0, seatX: ev.x, seatY: ev.y - 18.0 });
                        }
                        if (!(pSittingHere && this.player.sittingSeat === 1)) {
                            members.push({ ped: southPeds[i % southPeds.length], x: ev.x + 19.5, y: ev.y + 18.0, seatX: ev.x, seatY: ev.y + 18.0 });
                        }
                        if (members.length > 0) {
                            spawnScenePeds(ev, members, null);
                        } else {
                            ev.wipeoutTimer = 45.0;
                        }
                    } else if (ev.kind === "CLUB_VIP_LINE") {
                        spawnScenePeds(ev, [
                            { ped: "vc_bodybuilder", x: ev.x, y: ev.y - 18 },
                            { ped: "bikini_red", x: ev.x - 5, y: ev.y - 5 },
                            { ped: "vc_tubbs", x: ev.x + 5, y: ev.y + 5 },
                            { ped: "bikini_pink", x: ev.x - 4, y: ev.y + 15 },
                            { ped: "g2_civ_aqua", x: ev.x + 4, y: ev.y + 24 }
                        ], "🥂 VIP CLUB LINE CRASHED!");
                    } else if (ev.kind === "LITTLE_CUBA_CROWD") {
                        spawnScenePeds(ev, [
                            { ped: "vc_cuban", x: ev.x - 24.5, y: ev.y, seatX: ev.x - 17.5, seatY: ev.y },
                            { ped: "vc_hawaiian_red", x: ev.x + 24.5, y: ev.y, seatX: ev.x + 17.5, seatY: ev.y },
                            { ped: "g2_civ_granny", x: ev.x, y: ev.y - 24.5, seatX: ev.x, seatY: ev.y - 17.5 }
                        ], "☕ CALLE OCHO DOMINO TABLE SCATTERED!");
                    } else if (ev.kind === "BEACH_SOCIAL_CIRCLE") {
                        spawnScenePeds(ev, [
                            { ped: "bikini_pink", x: ev.x - 18, y: ev.y - 2 },
                            { ped: "surfer_guy", x: ev.x + 18, y: ev.y - 2 },
                            { ped: "bikini_cyan", x: ev.x, y: ev.y - 19 }
                        ], "🏖️ BEACH PARTY CIRCLE SCATTERED!", true);
                    } else if (ev.kind === "BOARDWALK_IGUANA_ACT") {
                        spawnScenePeds(ev, [
                            { ped: "surfer_guy", x: ev.x, y: ev.y },
                            { ped: "vc_tourist", x: ev.x - 18, y: ev.y - 11 },
                            { ped: "bikini_pink", x: ev.x + 18, y: ev.y + 11 }
                        ], null);
                    } else if (ev.kind === "BOARDWALK_ROLLERBLADERS") {
                        spawnScenePeds(ev, [
                            { ped: "bikini_pink", x: ev.x - 8, y: ev.y },
                            { ped: "vc_jogger", x: ev.x + 8, y: ev.y }
                        ], null);
                    } else if (ev.kind === "BOARDWALK_BUSKER") {
                        spawnScenePeds(ev, [
                            { ped: "vc_hawaiian_red", x: ev.x - 2, y: ev.y - 16 },
                            { ped: "bikini_cyan", x: ev.x + 12, y: ev.y + 10 }
                        ], null);
                    } else if (ev.kind === "BEACH_YOGA_CLASS") {
                        spawnScenePeds(ev, [
                            { ped: "bikini_white", x: ev.x, y: ev.y - 16 },
                            { ped: "bikini_pink", x: ev.x - 13, y: ev.y + 4 },
                            { ped: "vc_jogger", x: ev.x, y: ev.y + 8 },
                            { ped: "bikini_cyan", x: ev.x + 13, y: ev.y + 4 }
                        ], "🧘 YOGA CLASS SCATTERED!", true);
                    } else if (ev.kind === "FASHION_PHOTO_SHOOT") {
                        spawnScenePeds(ev, [
                            { ped: "vc_crockett", x: ev.x + 2, y: ev.y - 14 },
                            { ped: "bikini_pink", x: ev.x + 1, y: ev.y + 12 }
                        ], "📸 PHOTO SHOOT CRASHED!");
                    } else if (ev.kind === "STREET_FOOD_VENDOR_SCENE") {
                        spawnScenePeds(ev, [
                            { ped: "vc_cuban", x: ev.x - 11, y: ev.y },
                            { ped: "vc_tourist", x: ev.x + 12, y: ev.y - 5 },
                            { ped: "bikini_yellow", x: ev.x + 14, y: ev.y + 9 }
                        ], "🌭 STREET VENDOR CART CRASHED!");
                    } else if (ev.kind === "CONGA_SALSA_CIRCLE") {
                        spawnScenePeds(ev, [
                            { ped: "vc_cuban", x: ev.x - 15, y: ev.y + 2 },
                            { ped: "vc_hawaiian_red", x: ev.x + 6, y: ev.y - 5 },
                            { ped: "bikini_red", x: ev.x + 6, y: ev.y + 8 }
                        ], "🥁 SALSA CIRCLE SCATTERED!");
                    } else {
                        // PROMENADE_BENCH: spawn only the exact 1 or 2 seated NPCs falling forward in front of the bench!
                        const pair = benchPairs[i % benchPairs.length];
                        const bAng = ev.angle !== undefined ? ev.angle : 0;
                        const ca = Math.cos(bAng), sa = Math.sin(bAng);
                        const members = [];
                        if (pair[0] && !(pSittingHere && this.player.sittingSeat === 0)) {
                            members.push({
                                ped: pair[0],
                                x: ev.x + ca * 18.5 - sa * (-10.6),
                                y: ev.y + sa * 18.5 + ca * (-10.6),
                                seatX: ev.x + ca * 1.4 - sa * (-10.6),
                                seatY: ev.y + sa * 1.4 + ca * (-10.6)
                            });
                        }
                        if (pair[1] && !(pSittingHere && this.player.sittingSeat === 1)) {
                            members.push({
                                ped: pair[1],
                                x: ev.x + ca * 18.5 - sa * 10.6,
                                y: ev.y + sa * 18.5 + ca * 10.6,
                                seatX: ev.x + ca * 1.4 - sa * 10.6,
                                seatY: ev.y + sa * 1.4 + ca * 10.6
                            });
                        }
                        if (members.length > 0) {
                            spawnScenePeds(ev, members, null);
                        } else {
                            ev.wipeoutTimer = 45.0;
                        }
                    }
                }
            }
        }

        // 2. Street Takeovers
        if (Array.isArray(this.map.streetTakeovers)) {
            const crowdPeds = ["vc_haitian", "vc_cuban", "bikini_pink", "g2_civ_aqua", "vc_tourist", "g2_mugger"];
            for (let i = 0; i < this.map.streetTakeovers.length; i++) {
                const st = this.map.streetTakeovers[i];
                if ((st.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(st.x - hitX, st.y - hitY) < hitRad + 46) {
                    const members = [
                        { ped: "vc_cuban", x: st.x + 12, y: st.y },
                        { ped: "vc_haitian", x: st.x - 12, y: st.y }
                    ];
                    for (let ci = 0; ci < 6; ci++) {
                        const ca = (ci / 6) * Math.PI * 2 + 0.3;
                        members.push({
                            ped: crowdPeds[(ci + i) % crowdPeds.length],
                            x: st.x + Math.cos(ca) * 42,
                            y: st.y + Math.sin(ca) * 42
                        });
                    }
                    spawnScenePeds(st, members, "💥 TAKEOVER CROWD SCATTERED!");
                }
            }
        }

        // 3. Beach Volleyball Courts
        if (Array.isArray(this.map.beachVolleyballCourts)) {
            for (let i = 0; i < this.map.beachVolleyballCourts.length; i++) {
                const vc = this.map.beachVolleyballCourts[i];
                if ((vc.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(vc.x - hitX, vc.y - hitY) < hitRad + 32) {
                    spawnScenePeds(vc, [
                        { ped: vc.p0 || "bikini_pink", x: vc.x - 11, y: vc.y - 21 },
                        { ped: vc.p1 || "bikini_yellow", x: vc.x + 11, y: vc.y - 19 },
                        { ped: vc.p2 || "bikini_cyan", x: vc.x - 11, y: vc.y + 20 },
                        { ped: vc.p3 || "surfer_guy", x: vc.x + 11, y: vc.y + 22 },
                        { ped: "bikini_red", x: vc.x - 28, y: vc.y - 8 },
                        { ped: "surfer_guy", x: vc.x - 28, y: vc.y + 10 },
                        { ped: "bikini_white", x: vc.x + 28, y: vc.y - 9 },
                        { ped: "vc_bodybuilder", x: vc.x + 28, y: vc.y + 9 }
                    ], "🏐 VOLLEYBALL MATCH CRASHED!", true);
                }
            }
        }

        // 4. Beach Aerobics & Boombox Dance Parties
        if (Array.isArray(this.map.beachParties)) {
            const dancerPeds = ["bikini_pink", "bikini_cyan", "bikini_yellow", "surfer_guy", "bikini_white", "bikini_red", "vc_bodybuilder", "vc_jogger"];
            for (let i = 0; i < this.map.beachParties.length; i++) {
                const bp = this.map.beachParties[i];
                if ((bp.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(bp.x - hitX, bp.y - hitY) < hitRad + 32) {
                    const members = [{ ped: "bikini_red", x: bp.x - 4, y: bp.y }];
                    for (let di = 0; di < 8; di++) {
                        const row = ((di % 4) - 1.5) * 10;
                        const col = di < 4 ? 12 : 24;
                        members.push({ ped: dancerPeds[(di + i) % dancerPeds.length], x: bp.x + col, y: bp.y + row });
                    }
                    spawnScenePeds(bp, members, "📻 BEACH PARTY CRASHED!", true);
                }
            }
        }

        // 5. Muscle Beach Outdoor Fitness Gyms
        if (Array.isArray(this.map.muscleBeachGyms)) {
            for (let i = 0; i < this.map.muscleBeachGyms.length; i++) {
                const gm = this.map.muscleBeachGyms[i];
                if ((gm.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(gm.x - hitX, gm.y - hitY) < hitRad + 26) {
                    spawnScenePeds(gm, [
                        { ped: "vc_bodybuilder", x: gm.x - 6, y: gm.y - 14 },
                        { ped: "surfer_guy", x: gm.x - 6, y: gm.y + 14 },
                        { ped: "vc_jogger", x: gm.x + 16, y: gm.y - 11 },
                        { ped: "bikini_red", x: gm.x + 16, y: gm.y + 11 },
                        { ped: "vc_bodybuilder", x: gm.x + 2, y: gm.y }
                    ], "💪 MUSCLE BEACH WIPEOUT!");
                }
            }
        }

        // 6. Wilderness Camps & Golf Greens
        if (Array.isArray(this.map.wildernessCamps)) {
            for (let i = 0; i < this.map.wildernessCamps.length; i++) {
                const cp = this.map.wildernessCamps[i];
                if ((cp.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(cp.x - hitX, cp.y - hitY) < hitRad + 24) {
                    spawnScenePeds(cp, [
                        { ped: "g2_redneck_blond", x: cp.x + 13, y: cp.y + 11 },
                        { ped: "vc_tourist", x: cp.x - 4, y: cp.y + 21 }
                    ], "🏕️ CAMPSITE AMBUSHED!");
                }
            }
        }
        if (Array.isArray(this.map.golfGreens)) {
            for (let i = 0; i < this.map.golfGreens.length; i++) {
                const gg = this.map.golfGreens[i];
                if ((gg.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(gg.x - hitX, gg.y - hitY) < hitRad + 22) {
                    spawnScenePeds(gg, [
                        { ped: "vc_crockett", x: gg.x - 18, y: gg.y + 8 }
                    ], "⛳ FORE! GOLFER DOWN!");
                }
            }
        }

        // 7. Outlaw Biker Gang Chopper Rallies, Tiki Bars, Mini-Golf, Beach Catch Games, Swimmers & Stadium Scrimmage
        if (this.map.industrialAndParkDetails && Array.isArray(this.map.industrialAndParkDetails.bikerRallies)) {
            const rallies = this.map.industrialAndParkDetails.bikerRallies;
            for (let i = 0; i < rallies.length; i++) {
                const br = rallies[i];
                if ((br.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(br.x - hitX, br.y - hitY) < hitRad + 38) {
                    const members = [];
                    for (let bi = 0; bi < br.count; bi += 2) {
                        const bx = br.x + (bi - (br.count - 1) * 0.5) * 20;
                        members.push({ ped: (bi === 0) ? "g2_russian" : "g2_redneck_blond", x: bx + 4, y: br.y + 18 });
                    }
                    spawnScenePeds(br, members, "🏍️ BIKER RALLY CRASHED!");
                }
            }
        }
        if (this.map.industrialAndParkDetails && this.map.industrialAndParkDetails.miniGolf) {
            const mg = this.map.industrialAndParkDetails.miniGolf;
            if ((mg.wipeoutTimer || 0) <= 0 && Math.hypot(mg.x - hitX, mg.y - hitY) < hitRad + 36) {
                spawnScenePeds(mg, [
                    { ped: "vc_tourist", x: mg.x - 24, y: mg.y + 24 },
                    { ped: "bikini_cyan", x: mg.x + 24, y: mg.y + 24 }
                ], "⛳ MINI-GOLF PARTY SCATTERED!");
            }
        }
        if (Array.isArray(this.map.tikiBars)) {
            for (let i = 0; i < this.map.tikiBars.length; i++) {
                const tb = this.map.tikiBars[i];
                if ((tb.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(tb.x - hitX, tb.y - hitY) < hitRad + 34) {
                    const cs = Math.cos(tb.ang || 0), sn = Math.sin(tb.ang || 0);
                    spawnScenePeds(tb, [
                        { ped: "vc_cuban", x: tb.x, y: tb.y },
                        { ped: "bikini_pink", x: tb.x + sn * 22, y: tb.y - cs * 22 },
                        { ped: "vc_tommy", x: tb.x - cs * 18 + sn * 22, y: tb.y - sn * 18 - cs * 22 }
                    ], "🍹 TIKI BAR SCATTERED!");
                }
            }
        }
        if (Array.isArray(this.map.beachCatchGames)) {
            for (let i = 0; i < this.map.beachCatchGames.length; i++) {
                const bg = this.map.beachCatchGames[i];
                if ((bg.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(bg.x - hitX, bg.y - hitY) < hitRad + 28) {
                    const members = bg.kind === "METAL_DETECTOR"
                        ? [{ ped: "vc_tourist", x: bg.x, y: bg.y }]
                        : [
                            { ped: "surfer_guy", x: bg.x, y: bg.y - 18 },
                            { ped: "bikini_cyan", x: bg.x, y: bg.y + 18 }
                        ];
                    spawnScenePeds(bg, members, "🏖️ BEACH GAME CRASHED!", true);
                }
            }
        }
        if (Array.isArray(this.map.beachSwimmers)) {
            for (let i = 0; i < this.map.beachSwimmers.length; i++) {
                const sw = this.map.beachSwimmers[i];
                if ((sw.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(sw.x - hitX, sw.y - hitY) < hitRad + 24) {
                    const members = [{ ped: sw.pedType || (sw.isSurfer ? "surfer_guy" : "bikini_cyan"), x: sw.x, y: sw.y }];
                    if (sw.friendWaderType) {
                        members.push({ ped: sw.friendWaderType, x: sw.x + 8, y: sw.y + 13 });
                    }
                    spawnScenePeds(sw, members, "🌊 SWIMMER WIPED OUT!", true);
                }
            }
        }
        if (this.map.stadiumScrimmage && (this.map.stadiumScrimmage.wipeoutTimer || 0) <= 0) {
            const sc = this.map.stadiumScrimmage;
            if (Math.hypot(sc.x - hitX, sc.y - hitY) < hitRad + 95) {
                const members = [];
                for (let ti = 0; ti < 8; ti++) {
                    const isHome = ti < 4;
                    const idx = ti % 4;
                    members.push({
                        ped: isHome ? "vc_jogger" : "g2_civ_aqua",
                        x: sc.x + (isHome ? -55 : 55) + (idx % 2) * 24,
                        y: sc.y + (idx - 1.5) * 34
                    });
                }
                spawnScenePeds(sc, members, "⚽ STADIUM SCRIMMAGE SCATTERED!", true);
            }
        }

        return triggeredAny;
    }

    showDistrictBanner(name) {

        const el = document.getElementById("district-popup");

        if (!el) return;

        el.textContent = name;

        el.classList.add("show");

        clearTimeout(this._distTimeout);

        this._distTimeout = setTimeout(() => {

            el.classList.remove("show");

        }, 2400);

    }



    showBigBanner(title, sub, color = "#ff1e38", durationSec = 2.5) {

        const overlay = document.getElementById("big-status-overlay");

        const tEl = document.getElementById("big-status-title");

        const sEl = document.getElementById("big-status-sub");

        if (!overlay || !tEl || !sEl) return;



        tEl.textContent = title;

        tEl.style.color = color;

        sEl.textContent = sub;

        overlay.classList.add("visible");



        clearTimeout(this._bannerTimeout);

        this._bannerTimeout = setTimeout(() => {

            overlay.classList.remove("visible");

        }, durationSec * 1000);

    }



    sendPager(sender, text, urgent = false) {

        const box = document.getElementById("pager-box");

        const sEl = document.getElementById("pager-sender");

        const tEl = document.getElementById("pager-text");

        const lblEl = document.getElementById("pager-avatar-label");

        if (!box || !sEl || !tEl) return;



        sEl.textContent = `📱 SMARTPHONE // ${sender}`;

        tEl.textContent = text;

        this.lastSmsTimeStr = this.getClockString(true);

        if (lblEl) {

            lblEl.textContent = this.resolveSpeakerPortraitInfo(sender).label;

        }

        if (urgent) box.classList.add("urgent");

        else box.classList.remove("urgent");

        this._lastPagerSpeaker = sender;

        this.renderPortraits(sender);

    }



    updateHud() {
        const p = this.player;
        if (!this._hudEls) {
            this._hudEls = {
                hBar: document.getElementById("health-bar"),
                aBar: document.getElementById("armor-bar"),
                wEl: document.getElementById("weapon-display"),
                ankleBadge: document.getElementById("ankle-status-badge"),
                ankleLed: document.getElementById("ankle-led"),
                heads: Array.from(document.querySelectorAll(".cop-head")),
                vrBanner: document.getElementById("vehicle-radio-banner"),
                cashEl: document.getElementById("cash-counter"),
                multEl: document.getElementById("multiplier-badge"),
                livesEl: document.getElementById("lives-badge"),
                jailEl: document.getElementById("jail-free-badge"),
                targetEl: document.getElementById("target-score-badge"),
                objEl: document.getElementById("hud-objective-text"),
                timerEl: document.getElementById("hud-mission-timer"),
                charNameEl: document.querySelector("#hud-left .char-name"),
                charIdEl: document.querySelector("#hud-left .char-id")
            };
            this._hudCache = {};
        }
        const els = this._hudEls;
        const c = this._hudCache;

        const curCharId = String(p.charId || "LUCIA").toUpperCase();
        if (c.curCharId !== curCharId) {
            c.curCharId = curCharId;
            const badgeMap = {
                LUCIA: ["LUCIA", "#L-9724"],
                JASON: ["JASON", "#J-305"],
                DREQUAN: ["DRE'QUAN", "#RAW-1"],
                REALDIMEZ: ["DIMEZ", "#RD-26"],
                RAUL: ["RAUL", "#RB-88"],
                CALISTA: ["CALISTA", "#CA-26"],
                TOMMY: ["TOMMY", "#TV-86"],
                TREVOR: ["TREVOR", "#TP-13"],
                CJ: ["CJ", "#GS-92"],
                NIKO: ["NIKO", "#LC-08"],
                BIGSMOKE: ["SMOKE", "#BS-09"],
                CROCKETT: ["CROCKETT", "#MV-84"]
            };
            const pair = badgeMap[curCharId] || [curCharId.slice(0, 8), "#VC-26"];
            if (els.charNameEl) els.charNameEl.textContent = pair[0];
            if (els.charIdEl) els.charIdEl.textContent = pair[1];
        }

        const speaker = this._lastPagerSpeaker || "JASON";
        const portraitKey = `${p.charId || "LUCIA"}|${p.bandana ? 1 : 0}|${this.wantedLevel > 0 ? 1 : 0}|${speaker}`;
        if (c.portraitKey !== portraitKey) {
            c.portraitKey = portraitKey;
            this.renderPortraits(speaker);
        }

        // Health & Armor bars (quantized to 0.5% to avoid 60 Hz style invalidations during gradual damage)
        const hpStr = `${Math.max(0, Math.round((p.hp / p.maxHp) * 200) * 0.5)}%`;
        const armStr = `${Math.max(0, Math.round((p.armor / p.maxArmor) * 200) * 0.5)}%`;
        if (els.hBar && c.hpStr !== hpStr) {
            c.hpStr = hpStr;
            els.hBar.style.width = hpStr;
        }
        if (els.aBar && c.armStr !== armStr) {
            c.armStr = armStr;
            els.aBar.style.width = armStr;
        }

        // Weapon & Ammo
        if (els.wEl) {
            const spec = WEAPON_SPECS[p.weapon];
            const ammoStr = p.ammo[p.weapon] === Infinity ? "∞" : p.ammo[p.weapon];
            const wTxt = `${spec.name} [${ammoStr}]`;
            if (c.wTxt !== wTxt) {
                c.wTxt = wTxt;
                els.wEl.textContent = wTxt;
            }
        }

        // Ankle Monitor Badge
        const ankleMode = p.ankleScrambled ? 2 : (this.wantedLevel > 0 ? 1 : 0);
        if (els.ankleBadge && els.ankleLed && c.ankleMode !== ankleMode) {
            c.ankleMode = ankleMode;
            if (ankleMode === 2) {
                els.ankleBadge.textContent = "DOC: SCRAMBLED";
                els.ankleBadge.classList.remove("violation");
                els.ankleLed.classList.remove("alert");
            } else if (ankleMode === 1) {
                els.ankleBadge.textContent = "DOC: VIOLATION!";
                els.ankleBadge.classList.add("violation");
                els.ankleLed.classList.add("alert");
            } else {
                els.ankleBadge.textContent = "DOC: TRACKED";
                els.ankleBadge.classList.remove("violation");
                els.ankleLed.classList.remove("alert");
            }
        }

        // Wanted Heads (1..6): Solid Red/Blue strobe when actively spotted (isPoliceSpotted), Pulsing Gold/Cyan when in APB Search Mode (!isPoliceSpotted)
        const wantedStateKey = `${this.wantedLevel}|${this.isPoliceSpotted ? 1 : 0}`;
        if (c.wantedStateKey !== wantedStateKey) {
            c.wantedStateKey = wantedStateKey;
            c.wantedLevel = this.wantedLevel;
            for (let idx = 0; idx < els.heads.length; idx++) {
                if (idx < this.wantedLevel) {
                    els.heads[idx].classList.add("active");
                    if (this.isPoliceSpotted) els.heads[idx].classList.remove("searching");
                    else els.heads[idx].classList.add("searching");
                } else {
                    els.heads[idx].classList.remove("active");
                    els.heads[idx].classList.remove("searching");
                }
            }
        }

        // Vehicle & Radio Banner
        if (els.vrBanner) {
            if (p.inVehicle) {
                const st = this.audio.getCurrentStation();
                const bombTag = p.inVehicle.bombArmed
                    ? `  •  💣 ARMED (${Math.ceil(p.inVehicle.bombTimer)}s)!`
                    : (p.inVehicle.hasBomb ? "  •  💣 BOMB RIGGED [K]" : "  •  💣 [K] RIG BOMB");
                const vrTxt = `🚗 ${p.inVehicle.name}  •  📻 [R] ${st.name}${bombTag}`;
                if (!c.vrVisible) {
                    c.vrVisible = true;
                    els.vrBanner.style.display = "block";
                }
                if (c.vrTxt !== vrTxt) {
                    c.vrTxt = vrTxt;
                    els.vrBanner.textContent = vrTxt;
                }
            } else if (c.vrVisible !== false) {
                c.vrVisible = false;
                els.vrBanner.style.display = "none";
            }
        }

        // Cash, Multiplier, Lives, Jail Free & Target
        const cashVal = Math.floor(this.cash);
        if (els.cashEl && c.cashVal !== cashVal) {
            c.cashVal = cashVal;
            els.cashEl.textContent = "$" + String(cashVal).padStart(8, "0");
        }
        if (els.multEl && c.multiplier !== this.multiplier) {
            c.multiplier = this.multiplier;
            els.multEl.textContent = `x${this.multiplier}`;
        }
        if (els.livesEl && c.lives !== this.lives) {
            c.lives = this.lives;
            els.livesEl.textContent = `❤️x${this.lives}`;
        }
        if (els.jailEl && c.jailFree !== this.jailFreeCards) {
            c.jailFree = this.jailFreeCards;
            els.jailEl.textContent = `🃏 JAIL FREE: ${this.jailFreeCards}`;
            els.jailEl.style.opacity = this.jailFreeCards > 0 ? "1" : "0.45";
        }
        if (els.targetEl && c.chapterCleared !== this.chapterCleared) {
            c.chapterCleared = this.chapterCleared;
            els.targetEl.textContent = this.chapterCleared ? "🏆 $1M GOAL CLEARED!" : "GOAL: $1,000,000";
        }

        // Mission / Kill Frenzy Objective Mini Row
        let objTxt = "FREE ROAM LEONIDA";
        let timerTxt = "";
        if (this.killFrenzy) {
            objTxt = `💀 FRENZY: ${this.killFrenzy.kills}/${this.killFrenzy.targetKills} KILLS`;
            timerTxt = `⏱️ ${Math.ceil(this.killFrenzy.timer)}s`;
        } else {
            const target = this.missions.getTargetPosition();
            if (target) objTxt = target.label;
            const m = this.missions.activeMission;
            if (m && m.timer !== null && m.timer !== undefined) {
                timerTxt = `⏱️ ${Math.ceil(m.timer)}s`;
            }
        }
        if (els.objEl && c.objTxt !== objTxt) {
            c.objTxt = objTxt;
            els.objEl.textContent = objTxt;
        }
        if (els.timerEl && c.timerTxt !== timerTxt) {
            c.timerTxt = timerTxt;
            els.timerEl.textContent = timerTxt;
        }
    }



    loop() {
        let last = performance.now();
        let smoothedDt = 1 / 60;

        const stepSimulation = (now, doRender) => {
            const rawDt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
            let dt;
            if (this._resetLoopClock) {
                this._resetLoopClock = false;
                dt = 1 / 60;
                smoothedDt = dt;
            } else if (Math.abs(rawDt - smoothedDt) <= smoothedDt * 0.20) {
                // VSync cadence stabilizer (60/90/120/144/165/240 Hz): filters browser rAF timestamp jitter without lagging on real frame drops!
                smoothedDt = smoothedDt * 0.82 + rawDt * 0.18;
                dt = smoothedDt;
            } else {
                smoothedDt = rawDt;
                dt = rawDt;
            }
            last = now;

            try {
                this.update(dt);
                if (doRender && this.renderer) {
                    this.renderer.render(this, dt);
                    if (this.fullMapOpen) {
                        this.renderer.renderFullMap(this);
                    }
                }
                if (
                    doRender &&
                    (this.killFrenzy ||
                        (this.player.inVehicle && this.player.inVehicle.bombArmed) ||
                        (this.missions.activeMission && this.missions.activeMission.timer !== null))
                ) {
                    this.updateHud();
                }
            } catch (err) {
                console.error("Game frame error:", err);
            }
        };

        const frame = (now) => {
            if (typeof document === "undefined" || !document.hidden) {
                stepSimulation(now, true);
            }
            requestAnimationFrame(frame);
        };

        // Un-throttled Web Worker background ticker so minimizing the tab or switching windows NEVER pauses the persistent world simulation!
        try {
            const workerCode = "setInterval(function(){postMessage(1);}, 50);";
            const blob = new Blob([workerCode], { type: "application/javascript" });
            this._bgLoopWorker = new Worker(URL.createObjectURL(blob));
            this._bgLoopWorker.onmessage = () => {
                if (typeof document !== "undefined" && document.hidden) {
                    stepSimulation(performance.now(), false);
                }
            };
        } catch (_e) {
            setInterval(() => {
                if (typeof document !== "undefined" && document.hidden) {
                    stepSimulation(performance.now(), false);
                }
            }, 50);
        }

        requestAnimationFrame(frame);
    }

}



window.addEventListener("DOMContentLoaded", () => {

    window.game = new LeonidaGame();

    window.game.loop();

});

