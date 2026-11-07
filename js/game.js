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

        this.renderer = new RetroRenderer(this.canvas, this.radarCanvas, this.map);

        this.missions = new MissionManager(this);

        this.trafficManager = new TrafficManager(this);

        this.net = typeof ViceNetworkManager !== "undefined" ? new ViceNetworkManager(this) : null;



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

        // Starts at 12:00 (Sunny midday on Ocean Drive)

        this.worldMinutes = 12 * 60;

        this.timeScale = 1.0;

        this.lastSmsTimeStr = "12:00";

        this._lastAnnouncedPhase = "DAY";



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



        // Start directly in the live GTA 1 street scene!

        this.started = true;

        this.respawnTimer = 0;



        this.initWorldEntities();

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



        // Warm Vice City Sunset (17:15..20:15, peak 18:45) & Sunrise (05:15..07:45, peak 06:30) factor

        let sunsetFactor = 0.0;

        if (hour >= 17.25 && hour <= 20.25) {

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

        } else if (hour >= 7.5 && hour < 17.75) {

            phase = "DAY";

            icon = "☀️";

            dockLabel = "☀️ DAY [N]";

        } else if (hour >= 17.75 && hour < 20.25) {

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



    advanceTimeOfDayPhase() {

        const hour = (((this.worldMinutes % 1440) + 1440) % 1440) / 60.0;

        let nextMins = 14 * 60;

        let banner = "☀️ LEONIDA DAYLIGHT";

        let color = "#fde047";



        if (hour >= 7.25 && hour < 17.5) {

            nextMins = 18 * 60 + 45; // 18:45 Golden Sunset

            banner = "🌇 VICE CITY SUNSET";

            color = "#fb7185";

        } else if (hour >= 17.5 && hour < 20.25) {

            nextMins = 22 * 60 + 30; // 22:30 Neon Night

            banner = "🌙 NEON NIGHT MODE";

            color = "#ff2a85";

        } else if (hour >= 20.25 || hour < 5.25) {

            nextMins = 6 * 60 + 25; // 06:25 Atlantic Sunrise

            banner = "🌅 ATLANTIC SUNRISE";

            color = "#f97316";

        } else {

            nextMins = 14 * 60; // 14:00 Sunny Afternoon

            banner = "☀️ LEONIDA DAYLIGHT";

            color = "#fde047";

        }



        this.worldMinutes = nextMins;

        this.syncDayNightCycle();

        this._lastAnnouncedPhase = this.getTimePhaseInfo().phase;

        this.addFloatingText(

            this.player.x,

            this.player.y - 30,

            `${banner} (${this.getClockString(true)})`,

            color

        );

    }



    isNSGreen() {

        const ph = this.trafficLightTimer % 12.0;

        return ph < 5.2;

    }



    isEWGreen() {

        const ph = this.trafficLightTimer % 12.0;

        return ph >= 6.0 && ph < 11.2;

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

            { spec: "VCPD_CRUISER", c: 214.5, r: 154.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "CITY_BUS", c: 204.5, r: 147.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "MEDIC_AMBULANCE", c: 205.5, r: 152.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_EMERGENCY" },



            // --- B. S-Curving Vice Beach Sand & South Wooden Pier (off-road on beach sand & water) ---

            { spec: "MONSTER_BUGGY", c: 463.5, r: 280.5, raw512: true, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },

            { spec: "GATOR_4X4", c: 464.5, r: 300.0, raw512: true, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },

            { spec: "AIRBOAT", c: 250.5, r: 154.0, a: 0, z: 1.0, missionTag: "LANDMARK" },



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

            { spec: "PENETRATOR_GT", c: 343.5, r: 171.5, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "AIRBOAT", c: 185.5, r: 160.0, a: 0, z: 1.0, missionTag: "LANDMARK" },



            // --- F. Vice City Mambas Open-Air Stadium, Downtown & Golf Club ---

            { spec: "SUPERBIKE", c: 141.5, r: 116.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "MICRO_KART", c: 145.5, r: 53.5, a: 0, z: 2.0, missionTag: "LANDMARK" },



            // --- G. Wynwood, Lake Leonida Gator Island & Mount Kalaga ---

            { spec: "HARLEY_BIKE", c: 116.5, r: 82.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            { spec: "AIRBOAT", c: 101.5, r: 102.5, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },

            { spec: "CAMPER_PICKUP", c: 73.5, r: 76.0, a: 0, z: 2.0, missionTag: "LANDMARK" },

            { spec: "MONSTER_BUGGY", c: 84.5, r: 22.5, a: 0, z: 2.0, missionTag: "LANDMARK" },



            // --- H. Leonida State Penitentiary Yard & Port Gellhorn International Super-Speedway Oval ---

            { spec: "VCPD_CRUISER", c: 59.5, r: 76.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "CHALLENGER_RT", c: 84.5, r: 173.2, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "FJORD_FASTBACK", c: 55.2, r: 176.2, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "BANSHEE_GT", c: 58.8, r: 176.2, a: Math.PI, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "FIRE_TRUCK", c: 63.2, r: 176.2, a: 0, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "FIRE_TRUCK", c: 38.5, r: 136.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_EMERGENCY" },

            { spec: "FIRE_TRUCK", c: 286.5, r: 230.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_EMERGENCY", raw512: true },



            // --- I. VCIA International Airport Tarmac & Grassrivers Thrillbilly Mud Park / Keys ---

            { spec: "SUPERBIKE", c: 124.5, r: 301.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

            { spec: "PICKUP_TRUCK", c: 58.0, r: 212.5, a: 0, z: 2.0, missionTag: "LANDMARK" },

            { spec: "AIRBOAT", c: 86.0, r: 402.0, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },

            { spec: "STINGER_CABRIO", c: 231.0, r: 480.5, a: -Math.PI, z: 2.0, driver: "AI_TRAFFIC", raw512: true },



            // --- J. Extra 512x512 Mega-Map Vehicles across Expanded Vice City & Leonida ---

            { spec: "BANSHEE_GT", c: 446.5, r: 215.5, a: -Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "TURISMO_CABRIO", c: 445.5, r: 280.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "STINGER_CABRIO", c: 395.5, r: 297.5, a: 0, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "CHALLENGER_RT", c: 285.5, r: 215.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC", raw512: true },

            { spec: "AIRBOAT", c: 120.0, r: 184.0, a: 0.4, z: 1.0, missionTag: "LANDMARK", raw512: true },

            { spec: "AIRBOAT", c: 145.0, r: 412.0, a: 0.0, z: 1.0, missionTag: "LANDMARK", raw512: true },

            { spec: "GATOR_4X4", c: 465.5, r: 219.0, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK", raw512: true },

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

            // --- N. Drivable water craft moored at the harbors (speedboats) & jet-skis beside them ---
            { id: "boat_speed_0", spec: "SPEEDBOAT", c: 325.0, r: 312.0, a: Math.PI * 0.5, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_1", spec: "SPEEDBOAT", c: 105.5, r: 100.2, a: Math.PI, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_2", spec: "SPEEDBOAT", c: 373.5, r: 121.2, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_3", spec: "SPEEDBOAT", c: 379.5, r: 220.0, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_4", spec: "SPEEDBOAT", c: 424.0, r: 426.0, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_speed_5", spec: "SPEEDBOAT", c: 329.0, r: 496.5, a: Math.PI * 0.5, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_0", spec: "JETSKI", c: 327.5, r: 314.5, a: Math.PI * 0.5, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_1", spec: "JETSKI", c: 376.0, r: 123.5, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_2", spec: "JETSKI", c: 382.0, r: 222.5, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true },
            { id: "boat_jetski_3", spec: "JETSKI", c: 426.5, r: 428.5, a: 0, z: 1.0, missionTag: "LANDMARK", raw512: true }

        ];



        parked.forEach((p, idx) => {

            let vx = (p.raw512 ? p.c : mx256(p.c)) * TILE_SIZE;

            let vy = (p.raw512 ? p.r : my256(p.r)) * TILE_SIZE;

            // Ensure parked scooters/bikes/cars never spawn overlapping an already-placed parked vehicle
            for (let shiftTry = 0; shiftTry < 4; shiftTry++) {
                const overlap = this.vehicles.some((other) => Math.hypot(other.x - vx, other.y - vy) < 36);
                if (!overlap) break;
                vy += 42;
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

            // Lummus Park Oceanfront Boardwalk Rollerbladers & Kids (c = 451.5 raw512, gliding along the beach promenade!)
            { c: 451.5, r: 222.0, raw512: true, a: Math.PI * 0.5,  type: "vc_jogger",     isRollerblader: true },
            { c: 451.5, r: 225.2, raw512: true, a: Math.PI * 0.5,  type: "kid_skater",    isRollerblader: true, isChild: true },
            { c: 451.5, r: 228.5, raw512: true, a: -Math.PI * 0.5, type: "bikini_cyan",   isRollerblader: true },
            { c: 451.5, r: 231.5, raw512: true, a: -Math.PI * 0.5, type: "kid_girl_pink", isChild: true },
            { c: 451.5, r: 234.0, raw512: true, a: Math.PI * 0.5,  type: "g2_civ_pink",   isRollerblader: true },
            { c: 451.5, r: 237.2, raw512: true, a: Math.PI * 0.5,  type: "kid_boy_cap",   isChild: true },
            { c: 451.5, r: 240.5, raw512: true, a: -Math.PI * 0.5, type: "vc_tourist",    isRollerblader: true },
            { c: 451.5, r: 243.5, raw512: true, a: -Math.PI * 0.5, type: "kid_beach",     isChild: true },
            { c: 451.5, r: 246.0, raw512: true, a: Math.PI * 0.5,  type: "bikini_pink",   isRollerblader: true },
            { c: 451.5, r: 252.5, raw512: true, a: -Math.PI * 0.5, type: "g2_civ_aqua",   isRollerblader: true },

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



            // Grassrivers Everglades Alligators near Thrillbilly Mud Park & Swamp Islands

            { c: 46.0, r: 222.0, a: 0.4, type: "civ0", kind: "GATOR", missionTag: "BEACH" },

            { c: 74.0, r: 224.0, a: -0.8, type: "civ0", kind: "GATOR", missionTag: "BEACH" }

        ];

        starterPeds.forEach((sp, idx) => {

            const pedObj = new Pedestrian({

                id: `ped_init_${idx}`,

                x: (sp.raw512 ? sp.c : mx256(sp.c)) * TILE_SIZE,

                y: (sp.raw512 ? sp.r : my256(sp.r)) * TILE_SIZE,

                z: 2.0,

                angle: sp.a,

                speed: sp.dead ? 0 : (sp.isRollerblader ? 66 : 36),

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
            if (sp.isRollerblader) pedObj.isRollerblader = true;
            if (sp.isChild || (sp.type && sp.type.startsWith("kid_"))) pedObj.isChild = true;
            this.peds.push(pedObj);

        });



        // Spawn the Iconic GTA 1 "GOURANGA!" Chain of 7 Saffron-Robed Monks marching in single file along Lummus Park / Ocean Drive!

        this.spawnMonkChain();

    }



    // Water-only craft (jet-skis, speedboats) must float: move each one that is not on open water
    // to the nearest open-water spot (spiral search up to ~8 tiles). Called after spawning and once the real map is loaded.
    snapWaterCraftToWater() {
        if (!this.map || typeof this.map.isWaterAtPixel !== "function" || !Array.isArray(this.vehicles)) return;
        const isOpenWater = (x, y) => {
            for (const [ox, oy] of [[0, 0], [24, 0], [-24, 0], [0, 18], [0, -18]]) {
                if (!this.map.isWaterAtPixel(x + ox, y + oy)) return false;
            }
            return true;
        };
        for (const v of this.vehicles) {
            if (!v.waterOnly || v.driver || v.destroyed) continue;
            if (isOpenWater(v.x, v.y)) continue;
            let found = null;
            for (let rad = 12; rad <= TILE_SIZE * 8 && !found; rad += 12) {
                for (let k = 0; k < 16; k++) {
                    const ang = (k / 16) * Math.PI * 2;
                    const tx = v.x + Math.cos(ang) * rad;
                    const ty = v.y + Math.sin(ang) * rad;
                    if (isOpenWater(tx, ty) && !this.vehicles.some((o) => o !== v && Math.hypot(o.x - tx, o.y - ty) < 40)) {
                        found = { x: tx, y: ty };
                        break;
                    }
                }
            }
            if (found) {
                v.x = found.x;
                v.y = found.y;
                v.vx = 0;
                v.vy = 0;
                v.speed = 0;
            }
        }
    }

    onCmpLoaded(meta) {

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

                "TANKER_RIG",

                "VCPD_CRUISER",

                "MEDIC_AMBULANCE"

            ];

            const count = Math.min(72, meta.startup_cars.length);

            for (let i = 0; i < count; i++) {

                const sc = meta.startup_cars[i];

                const bx = Math.floor(sc.x);

                const by = Math.floor(sc.y);

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



        // 2. Refresh exact 3D elevation z & reset AI lane state once binary map is loaded

        this.player.z = this.map.getHeightAtPixel(this.player.x, this.player.y, 4.0);

        if (this.jason) {

            this.jason.z = this.map.getHeightAtPixel(this.jason.x, this.jason.y, 4.0);

        }

        for (const v of this.vehicles) {

            v.z = this.map.getHeightAtPixel(v.x, v.y, 4.0);

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

                v.steerAngleRad = 0;

                v.angularVelocity = 0;

                v.aiBlockX = -1;

                v.aiBlockY = -1;

                v.aiChosenDir = null;

                v.aiTurnedInIntersection = false;

            } else if (!v.driver) {

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
                    czList.some(cz => Math.hypot(cz.x - px, cz.y - py) < Math.max(54, cz.r || 54)) ||
                    beachStructs.some(bs => Math.hypot(bs.x - px, bs.y - py) < 76);

                if (nav && nav.groundType === GROUND_TYPE.ROAD) {
                    // Never snap a road vehicle onto a pedestrian sidewalk: convert it to live moving traffic!
                    v.driver = "AI_TRAFFIC";
                    v.isStaticParked = false;
                    v.x = (bx + 0.5) * TILE_SIZE;
                    v.y = (by + 0.5) * TILE_SIZE;
                    v.angle = this.map.getAlignedRoadAngle(bx, by, v.angle, v.z);
                } else if (v.missionTag !== "LANDMARK" && hitsClearZone(v.x, v.y)) {

                    // Never leave a driverless parked car underneath a 3D billboard/landmark or overlapping another parked vehicle!

                    for (let r = 1; r <= 4; r++) {

                        let foundCurb = false;

                        for (let dy = -r; dy <= r && !foundCurb; dy++) {

                            for (let dx = -r; dx <= r && !foundCurb; dx++) {

                                const cbx = bx + dx;
                                const cby = by + dy;
                                // Never shift parked cars onto narrow Ocean Drive sidewalks (col 443, 448, 451) or restricted compounds
                                if (cbx === 443 || cbx === 448 || cbx === 451 || (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(cbx, cby))) continue;

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

        this.populateNearbySidewalks(this.player.x, this.player.y, 32, 14);

        this.seedPenitentiaryInmatesAndGuards();

        this.currentDistrict = this.map.getDistrictName(this.player.x, this.player.y);

        this.districtPopupTimer = 0;

    }



    seedPenitentiaryInmatesAndGuards() {

        if (!this.map || !this.map.cmpLoaded) return;

        // Pre-seed interactive Orange-Jumpsuit Prison Inmates & Correctional Officers across all courtyards of Leonida State Penitentiary (c=57..67, r=78..144)

        const inmateSpots = [

            [58.5, 78.5], [64.5, 78.5], [58.5, 85.5], [65.5, 85.5], [58.5, 92.5], [65.5, 92.5],

            [58.5, 97.5], [61.5, 98.5], [64.5, 97.5], [59.5, 101.5], [63.5, 101.5],

            [58.5, 106.5], [65.5, 106.5], [59.5, 110.5], [62.5, 111.5], [65.5, 110.5],

            [58.5, 114.5], [64.5, 114.5], [60.5, 120.5], [63.5, 126.5], [59.5, 136.5], [63.5, 141.5]

        ];

        for (let i = 0; i < inmateSpots.length; i++) {

            const [bx, by] = inmateSpots[i];

            const px = bx * TILE_SIZE;

            const py = by * TILE_SIZE;

            const pz = this.map.getHeightAtPixel(px, py, 4.0);

            this.peds.push(new Pedestrian({

                x: px,

                y: py,

                z: pz,

                angle: (i % 4) * Math.PI * 0.5,

                speed: 34 + (i % 5) * 2,

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

            [61.5, 77.4], [66.5, 96.5], [66.5, 104.5], [58.5, 123.5], [65.5, 139.5]

        ];

        for (let g = 0; g < guardSpots.length; g++) {

            const [bx, by] = guardSpots[g];

            const px = bx * TILE_SIZE;

            const py = by * TILE_SIZE;

            const pz = this.map.getHeightAtPixel(px, py, 4.0);

            this.peds.push(new Pedestrian({

                x: px,

                y: py,

                z: pz,

                angle: (g % 2 === 0) ? Math.PI * 0.5 : -Math.PI * 0.5,

                speed: 38,

                kind: "COP",

                g24Type: "police",

                missionTag: "PRISON_GUARD",

                copWeapon: "SHOTGUN",

                shirtColor: "#1e3a8a",

                hp: 115,

                dead: false,

                panicTimer: 0,

                turnSeed: g + 201

            }));

        }

    }



    populateNearbySidewalks(centerX, centerY, targetCount = 30, radiusBlocks = 14) {

        if (!this.map || !this.map.cmpLoaded) return;

        const cBx = Math.floor(centerX / TILE_SIZE);

        const cBy = Math.floor(centerY / TILE_SIZE);

        const minX = Math.max(2, cBx - radiusBlocks);

        const maxX = Math.min(MAP_COLS - 3, cBx + radiusBlocks);

        const minY = Math.max(2, cBy - radiusBlocks);

        const maxY = Math.min(MAP_ROWS - 3, cBy + radiusBlocks);



        let existing = 0;

        for (const ped of this.peds) {

            if (!ped.dead && Math.abs(ped.x - centerX) <= radiusBlocks * TILE_SIZE && Math.abs(ped.y - centerY) <= radiusBlocks * TILE_SIZE) {

                existing++;

            }

        }

        if (existing >= targetCount) return;



        const candidates = [];

        for (let by = minY; by <= maxY; by++) {

            for (let bx = minX; bx <= maxX; bx++) {

                if (Math.abs(bx - cBx) <= 1 && Math.abs(by - cBy) <= 1) continue;

                // Exclude VCIA Airport tarmac, Port Gellhorn Super-Speedway, SERA Space Center, Stadium pitch and Prison perimeter double-fence strips

                if (bx >= 64 && bx <= 165 && by >= 299 && by <= 368) continue;

                if (bx >= 26 && bx <= 87 && by >= 149 && by <= 200) continue;

                if (bx >= 458 && bx <= 481 && by >= 21 && by <= 45) continue;

                if (bx >= 179 && bx <= 197 && by >= 164 && by <= 180) continue;

                if (bx >= 56 && bx <= 68 && by >= 76 && by <= 146 && (bx === 56 || bx === 68 || by === 76 || by === 146)) continue;

                const nav = this.map.getNavigationBlock(bx, by, 2.0);

                const inPrisonYard = (bx >= 57 && bx <= 67 && by >= 77 && by <= 145);

                if (nav && (nav.groundType === GROUND_TYPE.PAWEMENT || (inPrisonYard && nav.groundType === GROUND_TYPE.FIELD))) {

                    candidates.push({ bx, by, inPrisonYard });

                }

            }

        }

        if (candidates.length === 0) return;



        const civTypes = ["civ0", "civ1", "civ2", "civ3", "gang"];

        const dirs = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];

        const needed = targetCount - existing;

        let spawned = 0;



        for (let i = 0; i < needed * 3 && spawned < needed; i++) {

            const pick = candidates[Math.floor(Math.random() * candidates.length)];

            const px = (pick.bx + 0.25 + Math.random() * 0.5) * TILE_SIZE;

            const py = (pick.by + 0.25 + Math.random() * 0.5) * TILE_SIZE;

            let tooClose = false;

            for (const other of this.peds) {

                if (!other.dead && Math.hypot(other.x - px, other.y - py) < 28) {

                    tooClose = true;

                    break;

                }

            }

            if (tooClose) continue;

            const pz = this.map.getHeightAtPixel(px, py, 4.0);

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

            const rawAngle = dirs[Math.floor(Math.random() * dirs.length)];

            const pedStep = this.map.chooseNextSidewalkBlock ? this.map.chooseNextSidewalkBlock(pick.bx, pick.by, rawAngle, pz, Math.random(), false) : null;

            const pedAngle = pedStep ? pedStep.angle : rawAngle;

            this.peds.push(new Pedestrian({

                x: px,

                y: py,

                z: pz,

                angle: pedAngle,

                speed: 35 + Math.random() * 9,

                ...pedProps,

                dead: false,

                panicTimer: 0,

                targetBx: pedStep ? pedStep.bx : null,

                targetBy: pedStep ? pedStep.by : null,

                turnSeed: this.peds.length + i + 1

            }));

            spawned++;

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

        if (!enterScurveCar && this.map && typeof this.map.resolveCircleBuildingCollision === "function") {

            const safePos = this.map.resolveCircleBuildingCollision(tx, ty, 12, tz, false);

            tx = safePos.x;

            ty = safePos.y;

            tz = this.map.getHeightAtPixel(tx, ty, 4.0);

        }



        if (this.player.inVehicle) {

            const prevVeh = this.player.inVehicle;

            if ((this.player.seatIndex || 0) === 0) {

                prevVeh.driver = null;

                prevVeh.vx = 0;

                prevVeh.vy = 0;

                prevVeh.speed = 0;

                prevVeh.drifting = false;

                prevVeh.sirenActive = false;

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

        this.player.isMoving = false;

        this.player.enteringVehicle = null;



        if (this.jason) {

            this.jason.x = tx + 24;

            this.jason.y = ty + 20;

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



        this.populateNearbySidewalks(this.player.x, this.player.y, 30, 14);

        this.currentDistrict = this.map.getDistrictName(this.player.x, this.player.y);

        this.districtPopupTimer = 0;

        this.renderer.camX = this.player.x;

        this.renderer.camY = this.player.y;

        this.renderer.camZBlocks = this.player.z;

        this.updateHud();

    }



    getMonkTrackPosition(s) {

        // Walk strictly along paved Lummus Park walkways:
        // xA = col 448.5 (East Curbside Coral Promenade), xB = col 451.5 (Oceanfront Boardwalk Promenade),
        // yTop = row 280.6 & yBottom = row 294.6 (paved Lummus Park crosswalks where y % 14 < 2, completely off the green grass!)
        const xA = 448.5 * TILE_SIZE;

        const xB = 451.5 * TILE_SIZE;

        const yTop = 280.6 * TILE_SIZE;

        const yBottom = 294.6 * TILE_SIZE;

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



    bindEvents() {

        window.addEventListener("keydown", (e) => {

            if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {

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

            if ((!this.started || startModalOpen) && (code === "Enter" || code === "Space")) {

                e.preventDefault();

                this.startGame();

                return;

            }



            if (code === "KeyW" || code === "KeyZ" || code === "ArrowUp") this.input.up = true;

            if (code === "KeyS" || code === "ArrowDown") this.input.down = true;

            if (code === "KeyA" || code === "KeyQ" || code === "ArrowLeft") this.input.left = true;

            if (code === "KeyD" || code === "ArrowRight") this.input.right = true;

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



            // Advance Time-of-Day Phase (Day -> Sunset -> Night -> Sunrise) (N)

            if (code === "KeyN") {

                this.advanceTimeOfDayPhase();

            }



            // Toggle Vice City GPS Tour Drawer (C)

            if (code === "KeyC") {

                this.renderer.showCheatsWindow = true;

                this.renderer.cheatsCollapsed = !this.renderer.cheatsCollapsed;

            }



            // Toggle Lucia's Iconic Red Heist Bandana Mask (B)

            if (code === "KeyB") {

                this.toggleBandana();

            }



            // Toggle Dossier Modal (H)

            if (code === "KeyH") {

                const modal = document.getElementById("start-modal");

                if (modal) {

                    const willShow = modal.classList.contains("hidden");

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



            // Online P2P Multiplayer Action: Teleport to Remote Player / Spawn Online Rival [O]

            if (code === "KeyO") {

                if (this.net) this.net.triggerOnlineAction();

            }



            // Open Online Multiplayer Live Chat Input [T or Y]

            if (code === "KeyT" || code === "KeyY") {

                if (this.net && typeof this.net.focusChatInput === "function") {

                    e.preventDefault();

                    this.net.focusChatInput();

                    return;

                }

            }



            if (code === "Escape") {

                if (this.activeInterior) {

                    this.exitInterior();

                } else if (this.fullMapOpen) {

                    this.toggleFullMap(false);

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

            if (document.body && document.body.classList.contains("touch-enabled")) return;

            if (e.button === 0) {

                this.audio.resume();

                if (this.renderer && this.renderer.handleCheatsClick(e.clientX, e.clientY, this)) {

                    return;

                }

                this.input.shoot = true;

                this.player.mouseShoot = true;

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

            // FollowCameraController.cpp: Mouse wheel adjusts 3D camera height above target

            if (this.renderer) {

                const step = e.deltaY > 0 ? 0.5 : -0.5;

                this.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, this.renderer.zoomOffsetBlocks + step));

            }

        });



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



        const subscribeYtEvents = () => {

            if (!iframe || !iframe.contentWindow) return;

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

                this._lastYtProgressMs = performance.now();

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



        const tryAutoStart = (fromUserGesture = false) => {

            if (!this.ytMusicEnabled) return;

            subscribeYtEvents();

            const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

            if (fromUserGesture) {

                this.sendYouTubeCommand("unMute", []);

                this.sendYouTubeCommand("setVolume", [vol]);

                this.sendYouTubeCommand("playVideo", []);

                this._ytGestureUnlocked = true;

            } else if (!this.ytActuallyPlaying && !this._ytBuffering) {

                // Outside a user gesture, only send playVideo (never unMute, which mobile WebKit blocks/pauses)

                this.sendYouTubeCommand("playVideo", []);

            }

        };



        // Load official YouTube IFrame API so YT.Player keeps widget channel & mobile media state synchronized

        if (iframe && typeof window !== "undefined" && !window._vc26YtApiLoaded) {

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

                                    if (this.ytMusicEnabled && !this.ytActuallyPlaying && !this._ytBuffering) {

                                        this.sendYouTubeCommand("playVideo", []);

                                    }

                                },

                                onStateChange: (ev) => {

                                    if (ev && typeof ev.data === "number") {

                                        handleYtStateChange(ev.data);

                                    }

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



        // Listen for YouTube iframe playerState & auto-resume if paused while Music is ON

        window.addEventListener("message", (ev) => {

            if (!ev || typeof ev.data !== "string") return;

            try {

                const msg = JSON.parse(ev.data);

                if (!msg) return;

                if (msg.event === "onReady") {

                    subscribeYtEvents();

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



        // Start/resume YouTube audio on any user gesture in capture phase (before canvas/joystick e.preventDefault())

        const unlockGesture = () => {

            if (this.audio) this.audio.resume();

            if (!this.ytMusicEnabled) return;

            const nowMs = performance.now();

            if (!this.ytActuallyPlaying && !this._ytBuffering) {

                if (nowMs - (this._lastYtKickMs || 0) > 1200) {

                    this._lastYtKickMs = nowMs;

                    tryAutoStart(true);

                }

            } else if (!this._ytGestureUnlocked) {

                this._ytGestureUnlocked = true;

                const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

                this.sendYouTubeCommand("unMute", []);

                this.sendYouTubeCommand("setVolume", [vol]);

            }

        };

        window.addEventListener("pointerdown", unlockGesture, { capture: true, passive: true });

        window.addEventListener("touchstart", unlockGesture, { capture: true, passive: true });

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

                if (!this.ytActuallyPlaying && !this._ytBuffering) {

                    tryAutoStart(false);

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

            const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

            this.sendYouTubeCommand("unMute", []);

            this.sendYouTubeCommand("setVolume", [vol]);

            this.sendYouTubeCommand("playVideo", []);

            this._ytGestureUnlocked = true;

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

        this.sendYouTubeCommand("seekTo", [this.ytSeekOffset, true]);

        this.sendYouTubeCommand("playVideo", []);

        if (this.audio) {

            this.audio.playBeep(680, 0.04, "square", 0.04);

        }

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



    toggleBandana(forceState = null) {

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



        // Bind the 3 Official Server Slot Buttons (VICE97 / MIAMI86 / KEYS305)

        const currentRoom = (this.net && this.net.roomCode) || "VICE97";

        serverBtns.forEach((btn) => {

            if (btn.getAttribute("data-room") === currentRoom) {

                serverBtns.forEach((b) => b.classList.remove("active-server"));

                btn.classList.add("active-server");

            }

            btn.addEventListener("click", () => {

                serverBtns.forEach((b) => b.classList.remove("active-server"));

                btn.classList.add("active-server");

                const targetRoom = btn.getAttribute("data-room") || "VICE97";

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

            { name: "TOMMY_86", charId: "TOMMY", score: 50000, color: "#38bdf8" },

            { name: "CROCKETT", charId: "CROCKETT", score: 35000, color: "#fde047" },

            { name: "TREVOR_TP", charId: "TREVOR", score: 20000, color: "#f97316" },

            { name: "CJ_GROVE", charId: "CJ", score: 12500, color: "#22c55e" },

            { name: "JASON_305", charId: "JASON", score: 7500, color: "#00f0ff" }

        ];

        this.allTimeScores = defaultScores.slice();

        try {

            const raw = window.localStorage ? window.localStorage.getItem("vc26_alltime_scores_v1") : null;

            if (raw) {

                const parsed = JSON.parse(raw);

                if (Array.isArray(parsed) && parsed.length > 0) {

                    this.mergeAllTimeScores(parsed, false);

                }

            }

        } catch (_e) {}

    }



    saveAllTimeScores() {

        try {

            if (window.localStorage && Array.isArray(this.allTimeScores)) {

                window.localStorage.setItem("vc26_alltime_scores_v1", JSON.stringify(this.allTimeScores.slice(0, 10)));

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

                    color: color || "#ff2a85"

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



    mergeAllTimeScores(entries, render = true) {

        if (!Array.isArray(entries)) return;

        if (!Array.isArray(this.allTimeScores)) {

            this.allTimeScores = [];

        }

        for (const item of entries) {

            if (!item || !item.name) continue;

            const sc = Math.floor(Number(item.score) || 0);

            if (sc <= 0) continue;

            const cleanName = String(item.name).trim().slice(0, 18).toUpperCase();

            const existing = this.allTimeScores.find((e) => String(e.name).toUpperCase() === cleanName);

            if (existing) {

                if (sc > existing.score) {

                    existing.score = sc;

                    if (item.charId) existing.charId = item.charId;

                    if (item.color) existing.color = item.color;

                }

            } else {

                this.allTimeScores.push({

                    name: cleanName,

                    charId: item.charId || "LUCIA",

                    score: sc,

                    color: item.color || "#00f0ff"

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

        const isLuciaPager = String(pagerSpeaker).toUpperCase().includes("LUCIA");

        this.renderer.drawCharacterPortrait(

            document.getElementById("pager-portrait"),

            isLuciaPager ? "LUCIA" : "JASON",

            { bandana: this.player.bandana && isLuciaPager, alert }

        );

    }



    startGame() {

        this.started = true;

        this.audio.resume();



        // Read chosen Nickname, Server Slot & Character from the Selection Modal

        const nickInput = document.getElementById("start-nickname-input");

        const activeSrvBtn = document.querySelector(".server-slot-btn.active-server");

        const activeCard = document.querySelector(".char-select-card.active-mug");



        const chosenCharId = activeCard ? (activeCard.getAttribute("data-char-id") || "LUCIA") : (this.player.charId || "LUCIA");

        const chosenPedType = activeCard ? (activeCard.getAttribute("data-ped-type") || "lucia") : (this.player.pedType || "lucia");

        const chosenColor = activeCard ? (activeCard.getAttribute("data-color") || "#ff2a85") : "#ff2a85";

        const chosenWeapon = activeCard ? (activeCard.getAttribute("data-weapon") || "PISTOL") : "PISTOL";

        const chosenNick = (nickInput && nickInput.value.trim()) ? nickInput.value.trim().toUpperCase() : `${chosenCharId} #97`;

        const chosenRoom = activeSrvBtn ? (activeSrvBtn.getAttribute("data-room") || "VICE97") : "VICE97";



        this.player.charId = chosenCharId;

        this.player.pedType = chosenPedType;

        this.player.nickname = chosenNick;

        this.player.weapon = "PISTOL"; // Everyone starts with the exact same loadout & stats

        if (this.jason) {
            this.jason.pedType = chosenCharId === "JASON" ? "lucia" : "jason";
        }



        if (this.net && typeof this.net.setIdentity === "function") {

            this.net.setIdentity(chosenNick, chosenCharId, chosenPedType, chosenColor, chosenRoom);

        }



        this.recordHighScore(chosenNick, chosenCharId, this.cash, chosenColor, true);

        this.renderAllTimeHighScoresUI();

        this.renderPortraits();

        this.updateHud();



        if (this.ytMusicEnabled) {

            const volSlider = document.getElementById("yt-vol-slider");

            const vol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (this.ytVolume || 28);

            this.sendYouTubeCommand("unMute", []);

            this.sendYouTubeCommand("setVolume", [vol]);

            this.sendYouTubeCommand("playVideo", []);

            setTimeout(() => this.sendYouTubeCommand("setVolume", [vol]), 400);

        }

        const modal = document.getElementById("start-modal");

        if (modal) modal.classList.add("hidden");



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

            v.driver = null;

            v.hasJason = false;

            v.vx = 0;

            v.vy = 0;

            v.speed = 0;

            v.drifting = false;

            v.sirenActive = false;

            p.inVehicle = null;

            if (this.jason) this.jason.inVehicle = null;

        }

        p.vx = 0;

        p.vy = 0;

        p.isMoving = false;

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }



        // Remember exterior coordinates right outside this venue's door on the sidewalk

        const { x: dtx, y: dty, fnv: dn } = this.getDoorThresholdPos(intr);

        p.x = dtx + dn[0] * 18;

        p.y = dty + dn[1] * 18;

        p.z = this.map.getHeightAtPixel(p.x, p.y, 4.0);

        if (this.jason) {

            this.jason.x = p.x + 24;

            this.jason.y = p.y;

            this.jason.z = p.z;

        }



        if (window.ShopInteriors && typeof window.ShopInteriors.orientInterior === "function") {
            window.ShopInteriors.orientInterior(intr);
        }
        const pose = (window.ShopInteriors && typeof window.ShopInteriors.getEntrancePose === "function")
            ? window.ShopInteriors.getEntrancePose(intr)
            : { spawnX: intr.w * 0.5, spawnY: intr.h - 120, spawnAngle: -Math.PI * 0.5, partnerX: intr.w * 0.5 + 38, partnerY: intr.h - 112, partnerAngle: -Math.PI * 0.5 };
        this.activeInterior = intr;
        this.interiorCooldown = 0.85;
        this.interiorX = pose.spawnX;
        this.interiorY = pose.spawnY;
        this.interiorAngle = pose.spawnAngle;
        this.interiorJasonX = pose.partnerX;
        this.interiorJasonY = pose.partnerY;
        this.interiorJasonAngle = pose.partnerAngle;



        if (Array.isArray(intr.stations)) {

            for (const st of intr.stations) {

                st.cooldown = 0;

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

        this.doorRearmBlock = intr;

        this.interiorCooldown = 0.6;

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }

        const { x: dtx, y: dty, fnv: dnx } = this.getDoorThresholdPos(intr);

        this.player.x = dtx + dnx[0] * 18;

        this.player.y = dty + dnx[1] * 18;

        this.player.z = this.map.getHeightAtPixel(this.player.x, this.player.y, 4.0);
        this.player.angle = Math.atan2(dnx[1], dnx[0]);
        this.player.vx = 0;

        this.player.vy = 0;

        this.player.isMoving = false;

        if (this.jason) {

            this.jason.x = this.player.x + 24;

            this.jason.y = this.player.y;

            this.jason.z = this.player.z;

        }

        this.renderer.camX = this.player.x;

        this.renderer.camY = this.player.y;

        this.renderer.camZBlocks = this.player.z;

        this.fadeAlpha = 1.0;

        this.addFloatingText(this.player.x, this.player.y - 24, `🚪 EXITED ${intr.id.replace(/_/g, " ")}`, "#38bdf8");

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

        if (fx.extraLife) this.lives += fx.extraLife;

        if (fx.jailCards) this.jailFreeCards = (this.jailFreeCards || 0) + fx.jailCards;

        if (fx.multiplier) this.multiplier += fx.multiplier;

        if (typeof fx.setMinutes === "number") {

            this.worldMinutes = fx.setMinutes;

            this.syncDayNightCycle();

        }

        if (Array.isArray(fx.heist)) {

            const loot = fx.heist[0] + Math.floor(Math.random() * (fx.heist[1] - fx.heist[0] + 1));

            this.addCash(loot, "HOLD-UP!");

            this.setWantedLevel(Math.max(this.wantedLevel, fx.wanted || 3));

            this.audio.playShot("PISTOL");

        } else {

            this.audio.playCashSound();

        }

        this.showBigBanner(st.label.split(" — ")[0], fx.desc || "PURCHASED", st.color || "#39ff14", 1.8);

        this.updateHud();

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
            if (cost > 0 && this.cash < cost) {
                if (this.audio && this.audio.playTone) this.audio.playTone(150, 0.16, "sawtooth", 0.25);
                this.showBigBanner("INSUFFICIENT CASH", `NEED $${cost.toLocaleString()} FOR ${st.label.split(" (")[0]}`, "#ef4444", 1.8);
                return;
            }
            if (cost > 0) {
                this.cash -= cost;
            }
            st.cooldown = st.action === "ROB_REGISTER" ? 28.0 : 2.5;
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
                case "BUY_SNACK":
                    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.35));
                    bannerSub = "+35% HEALTH RESTORED!";
                    break;
                case "BUY_MEAL":
                    p.hp = p.maxHp;
                    bannerSub = "+100% FULL HEALTH RESTORED!";
                    break;
                case "BUY_DRINK":
                    p.hp = p.maxHp;
                    p.armor = Math.min(100, (p.armor || 0) + 50);
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 14.0);
                    bannerSub = "100% HEALTH RESTORED + +50 ARMOR!";
                    break;
                case "BUY_ENERGY":
                    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.50));
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 20.0);
                    bannerSub = "+50% HP & 20S ADRENALINE SPEED BOOST!";
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
                    this.setWantedLevel(0);
                    bannerSub = "100% HP & ARMOR + WANTED LEVEL CLEARED!";
                    break;
                case "CHANGE_OUTFIT":
                case "BUY_OUTFIT_1":
                    p.hp = p.maxHp;
                    p.bandana = !p.bandana;
                    this.setWantedLevel(0);
                    this.renderPortraits();
                    bannerSub = "FRESH VICE THREADS! WANTED LEVEL CLEARED!";
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
                    p.hp = p.maxHp;
                    p.armor = 100;
                    p.bandana = !p.bandana;
                    this.multiplier += 1;
                    this.setWantedLevel(0);
                    this.renderPortraits();
                    bannerSub = "VIP COUTURE! +100 ARMOR, +1 MULTIPLIER & 0 WANTED!";
                    break;
                case "HOTEL_PERK": {
                    const stash = Number(st.reward) || 1500;
                    st.cooldown = 20.0;
                    p.hp = p.maxHp;
                    p.armor = Math.min(100, (p.armor || 0) + 50);
                    p.speedBoostTimer = Math.max(p.speedBoostTimer || 0, 20.0);
                    this.addCash(stash, "🛎️ VIP GUEST STASH!");
                    bannerSub = `COLLECTED +$${stash.toLocaleString()} VIP STASH + 100% HP & +50 ARMOR!`;
                    break;
                }
                case "PLAY_LOTTO": {
                    const roll = Math.random();
                    if (roll < 0.22) {
                        this.addCash(2500, "🎰 FLORIDA LOTTO JACKPOT!");
                        bannerTitle = "🎰 LOTTO JACKPOT WINNER!";
                        bannerSub = "SCRATCHED 3 GOLDEN FLAMINGOS: WON +$2,500!";
                        bannerCol = "#fde047";
                    } else if (roll < 0.58) {
                        this.addCash(250, "🎟️ LOTTO PRIZE WINNER!");
                        bannerTitle = "🎟️ SCRATCH-OFF WINNER!";
                        bannerSub = "MATCHED 2 PALM TREES: WON +$250!";
                        bannerCol = "#39ff14";
                    } else {
                        bannerTitle = "🎟️ NO MATCH THIS TIME";
                        bannerSub = "TRY AGAIN! JACKPOT UP TO $2,500!";
                        bannerCol = "#94a3b8";
                    }
                    break;
                }
                case "PLAY_POOL": {
                    const poolRoll = Math.random();
                    if (poolRoll < 0.25) {
                        this.addCash(3000, "🎱 8-BALL TABLE RUN HUSTLE!");
                        bannerTitle = "🎱 CLEAN TABLE RUN!";
                        bannerSub = "RAN THE RACK ON THE SHARK: WON +$3,000!";
                        bannerCol = "#fde047";
                    } else if (poolRoll < 0.70) {
                        this.addCash(800, "🎱 8-BALL BANK SHOT HUSTLE!");
                        bannerTitle = "🎱 SANK THE 8-BALL!";
                        bannerSub = "CORNER POCKET BANK SHOT: HUSTLED +$800!";
                        bannerCol = "#39ff14";
                    } else {
                        bannerTitle = "🎱 SCRATCH ON THE 8-BALL!";
                        bannerSub = "TOUGH BREAK! RACK 'EM UP AGAIN ($100)";
                        bannerCol = "#fb923c";
                    }
                    break;
                }
                case "ROB_REGISTER": {
                    const take = Number(st.reward) || 1250;
                    this.addCash(take, "💵 ARMED REGISTER HOLD-UP!");
                    this.setWantedLevel(Math.max(this.wantedLevel + 1, 2));
                    if (this.missions && typeof this.missions.onInteriorRobbery === "function") {
                        this.missions.onInteriorRobbery();
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
                    break;
            }

            if (this.audio && this.audio.playCashSound) this.audio.playCashSound();
            this.showBigBanner(bannerTitle, bannerSub, bannerCol, 2.2);
            this.updateHud();
            return;
        }

        st.cooldown = 8.0;



        switch (st.rewardType) {

            case "ARSENAL":

                p.hp = p.maxHp;

                p.armor = 100;

                grantWep("SHOTGUN", 40);

                grantWep("UZI", 180);

                this.addCash(2000, st.label);

                break;

            case "HEAVY_WEAPONS":

                p.hp = p.maxHp;

                p.armor = 100;

                grantWep("SHOTGUN", 50);

                grantWep("UZI", 200);

                grantWep("FLAMETHROWER", 240);

                grantWep("ROCKET", 16);

                this.addCash(3500, st.label);

                break;

            case "WARDROBE":

                p.hp = p.maxHp;

                p.armor = Math.max(p.armor || 0, 100);

                p.bandana = !p.bandana;

                this.setWantedLevel(0);

                this.renderPortraits();

                this.addCash(2500, "DISGUISE & WANTED CLEARED!");

                break;

            case "LOUNGE":

                p.hp = p.maxHp;

                p.speedBoostTimer = 18.0;

                this.addCash(2000, "ADRENALINE SPEED BOOST!");

                break;

            case "MULTIPLIER_CASH":

                p.hp = p.maxHp;

                this.multiplier += 1;

                this.addCash(4000, "MULTIPLIER +1!");

                break;

            case "HEIST_SAFE":

                p.hp = p.maxHp;

                grantWep("SHOTGUN", 30);

                grantWep("UZI", 150);

                this.addCash(12000, "VAULT CRACKED!");

                if (this.missions && typeof this.missions.onInteriorRobbery === "function") {
                    this.missions.onInteriorRobbery();
                }

                if (this.map && this.map.objectEngine && typeof this.map.objectEngine.onInteriorVaultCracked === "function") {

                    this.map.objectEngine.onInteriorVaultCracked(this, this.activeInterior);

                }

                break;

            case "EXTRA_LIFE":

                p.hp = p.maxHp;

                this.lives += 1;

                this.addCash(5000, "1UP EXTRA LIFE!");

                break;

            case "JAIL_CARDS":

                p.hp = p.maxHp;

                this.jailFreeCards = (this.jailFreeCards || 0) + 2;

                this.setWantedLevel(0);

                this.addCash(5000, "+2 JAIL FREE CARDS!");

                break;

            case "ROCKET_LAUNCH":

                p.hp = p.maxHp;

                this.multiplier += 2;

                grantWep("ROCKET", 20);

                this.addCash(20000, "🚀 CAPE LEONIDA ROCKET LAUNCHED!");

                break;

            default:

                p.hp = p.maxHp;

                this.addCash(3000, st.label);

                break;

        }

        this.audio.playCashSound();

        this.showBigBanner(st.label, st.sub, st.color || "#39ff14", 2.2);

        this.updateHud();

    }



    toggleVehicleEntry() {

        const p = this.player;

        if (p.dead) return;



        // If inside a building interior, [E] / [F] / [Enter] confirms the station the player is standing on or exits at the door mat!

        if (this.activeInterior) {

            const intr = this.activeInterior;

            if (Array.isArray(intr.stations)) {

                let bestSt = null;

                let bestDist = 42;

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

        if (p.inVehicle && Array.isArray(this.map.bombShops)) {

            const v = p.inVehicle;

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

                // Search nearby dry land (dock / shore) if exiting an airboat near the coast

                let foundDry = null;

                for (let r = 24; r <= 96 && !foundDry; r += 16) {

                    for (let a = 0; a < 8; a++) {

                        const ang = (a / 8) * Math.PI * 2;

                        const tx = v.x + Math.cos(ang) * r;

                        const ty = v.y + Math.sin(ang) * r;

                        if (this.map.getGroundTypeAt(tx, ty) !== GROUND_TYPE.WATER &&

                            this.map.getGroundTypeAt(tx, ty) !== GROUND_TYPE.BUILDING) {

                            foundDry = { x: tx, y: ty };

                            break;

                        }

                    }

                }

                if (!foundDry) {

                    this.showBanner("CANNOT EXIT INTO DEEP WATER", 1.5);

                    return;

                }

                exitX = foundDry.x;

                exitY = foundDry.y;

            }

            if (mySeat === 0) {

                v.driver = null;

            }

            v.hasJason = false;

            v.doorOpenTimer = 0.48;

            p.inVehicle = null;

            p.seatIndex = 0;

            p.enteringVehicle = null;

            p.exitAnimTimer = 0.36;

            p.fromBike = Boolean(v.isMotorcycle);

            p.x = exitX;

            p.y = exitY;

            p.angle = v.angle + (mySeat % 2 === 1 ? -Math.PI * 0.5 : Math.PI * 0.5);

            if (this.net) {

                if (typeof this.net.broadcastWorldEvent === "function") {

                    this.net.broadcastWorldEvent({

                        kind: "VEH_EXIT",

                        vehId: v.id,

                        seat: mySeat,

                        x: Math.round(v.x),

                        y: Math.round(v.y),

                        z: Math.round((v.z || 2.0) * 100) / 100,

                        a: Math.round((v.angle || 0) * 1000) / 1000

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



        // Snappy Vehicle Entry + .G24 Door Swing: enter immediately if within 68px,

        // or run quickly to the nearest door if up to 125px away!

        let closest = null;

        let bestDist = 125;

        for (const v of this.vehicles) {

            if (v.destroyed) continue;

            const d = Math.hypot(v.x - p.x, v.y - p.y);

            if (d < bestDist) {

                bestDist = d;

                closest = v;

            }

        }



        if (closest) {

            if (bestDist < 68) {

                this.completeVehicleEntry(closest);

            } else {

                p.enteringVehicle = closest;

            }

        }

    }



    completeVehicleEntry(closest) {

        const p = this.player;

        if (!closest || closest.destroyed) {

            p.enteringVehicle = null;

            return;

        }

        p.enteringVehicle = null;



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

            this.addCash(150, "CARJACKED!");

            this.ejectVehicleDriver(closest, "CARJACK");

            if (closest.isPolice) {

                this.setWantedLevel(Math.max(this.wantedLevel, 1));

            } else {

                const copWitness =

                    this.vehicles.some(v => v.isPolice && !v.destroyed && Math.hypot(v.x - closest.x, v.y - closest.y) < 340) ||

                    this.peds.some(ped => !ped.dead && ped.kind === "COP" && Math.hypot(ped.x - closest.x, ped.y - closest.y) < 300);

                if (copWitness && Math.random() < 0.70) {

                    this.setWantedLevel(Math.max(this.wantedLevel, 1));

                }

            }

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



        if (this.net) {

            if (typeof this.net.broadcastWorldEvent === "function") {

                this.net.broadcastWorldEvent({

                    kind: "VEH_ENTER",

                    vehId: closest.id,

                    seat: freeSeat,

                    carjack: Boolean(wasOccupied)

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

            const isSwat = vehicle.specKey === "SWAT_ENFORCER";

            const copHp = isSwat ? 145 : 105;

            const copWep = isSwat ? "SHOTGUN" : (this.wantedLevel >= 3 ? "UZI" : "PISTOL");

            const isCarjacked = reason === "CARJACK";

            const deployTarget = this.getNearestWantedTarget(doorX, doorY) || this.player;

            this.peds.push(new Pedestrian({

                x: doorX,

                y: doorY,

                z: vz,

                angle: Math.atan2(deployTarget.y - doorY, deployTarget.x - doorX),

                speed: isSwat ? 104 : 98,

                kind: "COP",

                g24Type: isSwat ? "g2_swat" : "police",

                isSwat,

                shirtColor: isSwat ? "#1e293b" : "#1e3a8a",

                hp: copHp,

                maxHp: copHp,

                copWeapon: copWep,

                carjackedCop: isCarjacked,

                stunnedTimer: isCarjacked ? 1.15 : 0,

                bustedGraceTimer: isCarjacked ? 2.2 : 0,

                shootCooldown: isCarjacked ? 1.30 : 0.25,

                dead: false,

                panicTimer: 0,

                exitAnimTimer: 0.32

            }));

            if (isCarjacked) {

                this.addFloatingText(doorX, doorY - 22, "🚓 VCPD OFFICER YANKED OUT! STEP ON IT!", "#38bdf8");

            }

            if (isSwat && reason === "COP_DEPLOY") {

                const doorX2 = vehicle.x + Math.sin(vehicle.angle) * 28;

                const doorY2 = vehicle.y - Math.cos(vehicle.angle) * 28;

                this.peds.push(new Pedestrian({

                    x: doorX2,

                    y: doorY2,

                    z: vz,

                    angle: Math.atan2(this.player.y - doorY2, this.player.x - doorX2),

                    speed: 104,

                    kind: "COP",

                    g24Type: "g2_swat",

                    isSwat: true,

                    shirtColor: "#1e293b",

                    hp: copHp,

                    maxHp: copHp,

                    copWeapon: "UZI",

                    dead: false,

                    panicTimer: 0,

                    exitAnimTimer: 0.32

                }));

            }

            if (reason === "COP_DEPLOY") {

                this.addFloatingText(doorX, doorY - 22, isSwat ? "🚓 SWAT SQUAD DEPLOYED!" : "🚓 VCPD OFFICER DEPLOYED!", "#38bdf8");

            }

            return;

        }



        if (reason === "BAIL_FIRE") {

            const fleeAngle = vehicle.angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;

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

        this.peds.push(new Pedestrian({

            x: doorX,

            y: doorY,

            z: vz,

            angle: fleeAngle,

            speed: fightsBack ? 90 : 86,

            kind: fightsBack ? "HOSTILE" : "CIVILIAN",

            g24Type: driverSpriteType,

            g2Remapped: isFiremanDriver || isMedicDriver,

            shirtColor: isFiremanDriver ? "#eab308" : (isMedicDriver ? "#38bdf8" : "#f43f5e"),

            hp: isFiremanDriver ? 75 : 45,

            dead: false,

            stunnedTimer: 0.85,

            panicTimer: fightsBack ? 0 : 6.5,

            turnSeed: Math.floor(Math.random() * 16) + 1

        }));

        if (isFiremanDriver) {
            this.addFloatingText(doorX, doorY - 22, "🚒 VCFD FIREFIGHTER YANKED OUT!", "#f97316");
        } else if (isMedicDriver) {
            this.addFloatingText(doorX, doorY - 22, "🚑 PARAMEDIC YANKED OUT!", "#38bdf8");
        }

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

        const doorX = ambulance.x + rightX * sideSign * 24;

        const doorY = ambulance.y + rightY * sideSign * 24;

        const vz = ambulance.z !== undefined ? ambulance.z : 2.0;



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

        const doorX = fireTruck.x + rightX * sideSign * 26;

        const doorY = fireTruck.y + rightY * sideSign * 26;

        const vz = fireTruck.z !== undefined ? fireTruck.z : 2.0;



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



        for (const off of offsets) {

            const cand = directAngle + off;

            const cCos = Math.cos(cand);

            const cSin = Math.sin(cand);

            const turnFromCur = Math.abs(Math.atan2(Math.sin(cand - curHeading), Math.cos(cand - curHeading)));

            // Hysteresis term (-turnFromCur * 0.45) keeps the pedestrian committed to one side of an obstacle without fluttering
            const baseScore = -Math.abs(off) * 1.35 - turnFromCur * 0.45;
            let score = baseScore;

            const p1x = ped.x + cCos * 16;

            const p1y = ped.y + cSin * 16;

            const p2x = ped.x + cCos * 34;

            const p2y = ped.y + cSin * 34;

            if (this.map.isWaterAtPixel && (this.map.isWaterAtPixel(p1x, p1y) || this.map.isWaterAtPixel(p2x, p2y))) {

                score -= 90;

            }

            if (this.map.resolveCircleBuildingCollision(p1x, p1y, 9, pz).hit) {

                score -= 75;

            } else if (this.map.resolveCircleBuildingCollision(p2x, p2y, 9, pz).hit) {

                score -= 36;

            }

            if (this.resolveCircleVehicleCollision(p1x, p1y, 9, pz, ignoreVeh).hit) {

                score -= 68;

            } else if (this.resolveCircleVehicleCollision(p2x, p2y, 9, pz, ignoreVeh).hit) {

                score -= 32;

            }

            if (ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0) {

                if (typeof this.map.isInsideLivingEventZone === "function" && this.map.isInsideLivingEventZone(p1x, p1y, 6)) {

                    score -= 40;

                }

                if (this.map.getNavigationBlock) {

                    const fbx = Math.floor(p1x / TILE_SIZE);

                    const fby = Math.floor(p1y / TILE_SIZE);

                    const fNav = this.map.getNavigationBlock(fbx, fby, pz);

                    if (fNav && fNav.groundType === GROUND_TYPE.ROAD) {

                        score -= 55;

                    }

                    const flid = this.map.getBlockInfo ? (this.map.getBlockInfo(fbx, fby, 1)?.lid || 0) : 0;

                    if (fbx >= 449 && fbx <= 450 && fby >= 42 && fby <= 362 && flid === 10) {

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
            this.graffitiTags.push(tg);
            if (this.graffitiTags.length > 120) this.graffitiTags.shift();
            this.saveGraffitiTags();
            this.tagSprayTarget = null;
            this.addCash(75, `🎨 TAG #${this.graffitiTags.length} SPRAYED!`);
            // Cops that see vandalism get angry
            const copWitness =
                this.peds.some((ped) => !ped.dead && ped.kind === "COP" && Math.hypot(ped.x - p.x, ped.y - p.y) < 260) ||
                this.vehicles.some((v) => v.isPolice && !v.destroyed && Math.hypot(v.x - p.x, v.y - p.y) < 300);
            if (copWitness && Math.random() < 0.7) {
                this.setWantedLevel(Math.max(this.wantedLevel, 1));
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

            // Make nearby pedestrians panic and clear the road

            for (const ped of this.peds) {

                if (!ped.dead && ped.kind === "CIVILIAN" && Math.hypot(ped.x - v.x, ped.y - v.y) < 150) {

                    ped.panicTimer = 3.5;

                    ped.angle = Math.atan2(ped.y - v.y, ped.x - v.x);

                }

            }

        } else {

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

            p.ammo[wep] = Math.max(p.ammo[wep] || 0, 120);

        }

        this.killFrenzy = {

            title: kf.title || "KILL FRENZY!",

            weapon: wep,

            kills: 0,

            targetKills: kf.targetKills || 6,

            timer: kf.duration || kf.timeLimit || 35,

            reward: kf.reward || 30000

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

            const reward = this.killFrenzy.reward;

            this.killFrenzy = null;

            this.multiplier += 1;

            this.audio.playFanfare("GOURANGA");

            this.addCash(reward, "FRENZY PASSED!");

            this.showBigBanner(

                "FRENZY PASSED!",

                `KILL FRENZY COMPLETED! +$${(reward * this.multiplier).toLocaleString()} & MULTIPLIER x${this.multiplier}!`,

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

            this.addFloatingText(pk.x, pk.y - 16, "⭐ POLICE BRIBE (-2 HEADS)", "#00f0ff");

        } else if (pk.type === "JAIL_FREE") {

            this.jailFreeCards += 1;

            this.addFloatingText(pk.x, pk.y - 16, "🃏 GET OUT OF JAIL FREE CARD!", "#ffd13b");

        } else if (pk.type === "MULTIPLIER") {

            this.multiplier += 1;

            this.addFloatingText(pk.x, pk.y - 16, `✨ MULTIPLIER x${this.multiplier}!`, "#39ff14");

        } else if (pk.type === "EXTRA_LIFE") {

            this.lives += 1;

            this.addFloatingText(pk.x, pk.y - 16, `❤️ EXTRA LIFE! (LIVES: ${this.lives})`, "#ff2a85");

        } else if (pk.type === "CASH") {

            this.addCash(pk.amount || 5000, pk.label);

        }

        this.updateHud();

    }



    recruitJason() {

        this.jason = null;

    }



    getNearestWantedTarget(fromX, fromY) {

        const candidates = [];

        const p = this.player;

        const anyRemoteWanted = this.net && typeof this.net.getMaxWantedLevel === "function" && this.net.getMaxWantedLevel() > 0;

        const effectiveGlobalWanted = Math.max(this.wantedLevel || 0, anyRemoteWanted ? this.net.getMaxWantedLevel() : 0);



        if (this.wantedLevel > 0 && p && !p.dead) {

            const v = p.inVehicle;

            candidates.push({

                x: v ? v.x : p.x,

                y: v ? v.y : p.y,

                z: (v ? v.z : p.z) || 2.0,

                angle: (v ? v.angle : p.angle) || 0,

                vx: v ? (v.vx || 0) : 0,

                vy: v ? (v.vy || 0) : 0,

                speed: v ? (v.speed || 0) : 0,

                inVehicle: Boolean(v),

                isRemote: false,

                isCriminalNPC: false,

                wantedLevel: this.wantedLevel

            });

        }



        if (effectiveGlobalWanted > 0 && this.net && this.net.remotePlayers && this.net.remotePlayers.size > 0) {

            for (const rp of this.net.remotePlayers.values()) {

                if (rp.isBot || rp.dead) continue;

                if ((rp.wantedLevel || 0) > 0 || this.wantedLevel > 0) {

                    candidates.push({

                        x: rp.x,

                        y: rp.y,

                        z: rp.z || 2.0,

                        angle: rp.angle || 0,

                        vx: rp.vx || 0,

                        vy: rp.vy || 0,

                        speed: rp.veh ? (rp.veh.speed || Math.hypot(rp.vx || 0, rp.vy || 0)) : Math.hypot(rp.vx || 0, rp.vy || 0),

                        inVehicle: Boolean(rp.veh),

                        isRemote: true,

                        isCriminalNPC: false,

                        wantedLevel: rp.wantedLevel || effectiveGlobalWanted

                    });

                }

            }

        }



        // Ambient Crime Targets (AI_CRIMINAL getaway vehicles & CRIMINAL bandits on foot within 950px)
        if (Array.isArray(this.vehicles)) {
            for (const v of this.vehicles) {
                if (v.destroyed || v.driver !== "AI_CRIMINAL") continue;
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
        if (Array.isArray(this.peds)) {
            for (const ped of this.peds) {
                if (ped.dead || ped.kind !== "CRIMINAL") continue;
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
        if (Array.isArray(this.vehicles)) {
            for (let i = this.vehicles.length - 1; i >= 0; i--) {
                const v = this.vehicles[i];
                v.lastHitByPlayer = false;
                if (v.driver === "AI_COP") {
                    v.sirenActive = false;
                    if (despawnNearPoint && this.player && Math.hypot(v.x - this.player.x, v.y - this.player.y) < 380) {
                        this.vehicles.splice(i, 1);
                    }
                }
            }
        }

        // Reset all NPC aggro / pursuit flags toward the player
        if (Array.isArray(this.peds)) {
            for (let i = this.peds.length - 1; i >= 0; i--) {
                const ped = this.peds[i];
                if (ped.dead) continue;
                ped.carjackedCop = false;
                ped.attackedByPlayer = false;
                ped.provokedByPlayer = false;
                ped.inCombat = false;
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

    setWantedLevel(level) {

        const clamped = Math.max(0, Math.min(6, Math.floor(level)));

        // Never allow wanted stars to increase while the player is dead/busted or during respawn grace
        if (clamped > 0 && this.player && (this.player.dead || (this.player.respawnGraceUntil || 0) > performance.now())) {
            return;
        }

        if (this.wantedLevel === 0 && clamped > 0) {

            this.copSpawnTimer = 2.5; // Progressive dispatch delay so police don't appear instantly on top of the player

        } else if (clamped === 0) {

            this.clearAllPlayerPursuit(false);

        }

        if (clamped > this.wantedLevel && !this.player.ankleScrambled) {

            this.audio.playAnkleMonitorAlert();

        }

        this.wantedLevel = clamped;

        this.wantedDecayTimer = 0;

        this.updateHud();

    }



    addCash(amount, label = "") {

        const total = Math.floor(amount * this.multiplier);

        this.cash += total;

        if (label) {

            this.addFloatingText(this.player.x, this.player.y - 22, `${label} +$${total.toLocaleString()}`, "#39ff14");

        } else {

            this.addFloatingText(this.player.x, this.player.y - 22, `+$${total.toLocaleString()}`, "#39ff14");

        }



        const pName = (this.net && this.net.playerName) || (this.player && this.player.nickname) || "LUCIA";

        const pColor = (this.net && this.net.playerColor) || "#ff2a85";

        this.recordHighScore(pName, (this.player && this.player.charId) || "LUCIA", this.cash, pColor, true);



        // Classic 1997 GTA 1 Chapter Target Score ($1,000,000) Check!

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



        this.updateHud();

    }

    addMultiplier(n = 1) {
        this.multiplier = Math.max(1, (this.multiplier || 1) + n);
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



    addFloatingText(x, y, text, color = "#39ff14") {

        this.floatingTexts.push({ x, y, text, color, life: 1.35 });

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

            surface: opts.surface || "ROAD"

        });

        if (this.skidmarks.length > 2800) {

            this.skidmarks.shift();

        }

    }



    spawnParticle(x, y, kind = "SPARK") {

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

        this.audio.playExplosion();

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

            if (d < radius * 2.8 && typeof v.triggerPanic === "function") {

                v.triggerPanic(9.0);

            }

        }



        // Damage nearby peds & trigger pedestrian panic + GTA 2 Explosive Gibs Arc (gibs.cpp FUN_0048C9C0 / FUN_0048C270)!

        for (const ped of this.peds) {

            if (ped.dead) continue;

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

                this.killPed(ped, byPlayer);

            } else if (d < radius * 2.5) {

                ped.panicTimer = 6.5;

            }

        }



        // Smash nearby crates

        if (this.map.crates) {

            for (const cr of this.map.crates) {

                if (!cr.smashed && Math.hypot(cr.x - x, cr.y - y) < radius) {

                    this.smashCrate(cr);

                }

            }

        }

        // Wipe out open-air living events / street animations within blast radius

        this.checkAndWipeoutLivingEvents(x, y, radius, byPlayer, false);



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

        if (!fromNetwork && this.net && typeof this.net.broadcastWorldEvent === "function") {

            this.net.broadcastWorldEvent({

                kind: "VEH_EXPLODE",

                vehId: v.id,

                x: Math.round(v.x),

                y: Math.round(v.y)

            });

        }



        const playerResponsible = Boolean(byPlayer || v.damagedByPlayer || this.player.inVehicle === v);



        if (this.player.inVehicle === v) {

            this.player.inVehicle = null;

            this.player.seatIndex = 0;

            this.player.x = v.x - (isBicycle || isScooter ? 18 : 32);

            this.player.y = v.y - (isBicycle || isScooter ? 18 : 32);

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
            // A bicycle or e-scooter crumples / short-circuits with sparks & smoke without a lethal fireball!
            if (this.audio && typeof this.audio.playCarCrash === "function") {
                this.audio.playCarCrash(0.55);
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
            if (playerResponsible) {
                this.addCash(isScooter ? 150 : 50, `${v.name} WRECKED!`);
            }
            return;
        }

        this.explodeAt(v.x, v.y, 130, 200, playerResponsible);

        if (playerResponsible) {

            const isCriminalCar = (v.driver === "AI_CRIMINAL" || v.wasCriminalCar);

            this.addCash(500, isCriminalCar ? `⚖️ VIGILANTE TAKEDOWN! (${v.name})` : `${v.name} WRECKED!`);

            this.recordFrenzyKill();

            const isPlayerInGraceOrDead = Boolean(this.player && (this.player.dead || (this.player.respawnGraceUntil || 0) > performance.now()));
            if (!isCriminalCar && !isPlayerInGraceOrDead) {

                this.wantedDecayTimer = 0;

                if (v.isPolice) {

                    if (Math.random() < 0.85) {

                        this.crimeHeat = (this.crimeHeat || 0) + 3;

                        this.setWantedLevel(Math.max(2, this.wantedLevel + 1));

                    }

                } else if (Math.random() < 0.60) {

                    this.crimeHeat = (this.crimeHeat || 0) + 2;

                    const targetWanted = Math.min(6, Math.max(this.wantedLevel, 1 + Math.floor(this.crimeHeat / 4)));

                    this.setWantedLevel(targetWanted);

                }

            }

        }

    }



    killPed(ped, byPlayer = true, fromNetwork = false) {

        if (ped.dead) return;

        ped.dead = true;

        ped.burnTimer = 0;

        ped.electroTimer = 0;

        ped.drownTimer = 0;

        if (!fromNetwork && this.net && typeof this.net.broadcastWorldEvent === "function") {

            this.net.broadcastWorldEvent({

                kind: "PED_KILL",

                pedId: ped.id,

                x: Math.round(ped.x),

                y: Math.round(ped.y),

                deathKind: ped.deathKind || null

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

            if (Math.random() < 0.85) {

                this.crimeHeat = (this.crimeHeat || 0) + 3;

                this.setWantedLevel(Math.max(2, this.wantedLevel + 1));

            }

        } else if (ped.kind !== "GATOR" && ped.kind !== "CRIMINAL" && Math.random() < 0.38) {

            this.crimeHeat = (this.crimeHeat || 0) + 1;

            const targetWanted = Math.min(6, Math.max(this.wantedLevel, 1 + Math.floor((this.crimeHeat - 1) / 4)));

            this.setWantedLevel(targetWanted);

        }



        // Check Iconic 1997 GTA 1 "GOURANGA!" 7-Monk Chain Bonus!

        if (ped.kind === "MONK") {

            this.monksKilled++;

            this.addCash(200, `MONK DOWN (${this.monksKilled}/7)`);

            if (this.monksKilled >= 7) {

                this.monkRespawnTimer = 28;

                this.multiplier += 1;

                this.audio.playFanfare("GOURANGA");

                this.addCash(50000, "GOURANGA!");

                this.showBigBanner(

                    "GOURANGA!",

                    "ALL 7 SAFFRON MONKS WIPED OUT! +$50,000 BONUS & MULTIPLIER +1!",

                    "#ff9900",

                    3.4

                );

            }

            return;

        }



        const reward = ped.kind === "COP" ? 1000 : (ped.kind === "GATOR" ? 600 : (ped.kind === "CRIMINAL" ? 500 : 100));

        const label = ped.kind === "COP" ? "COP DOWN!" : (ped.kind === "GATOR" ? "GATOR BAG!" : (ped.kind === "CRIMINAL" ? "⚖️ VIGILANTE BONUS!" : ""));

        this.addCash(reward, label);



        // GTA 2 Style Splatter / Multi-Kill Chain Combo (within 2.4s window)

        const nowSec = performance.now() * 0.001;

        if (this.lastKillTime && (nowSec - this.lastKillTime) < 2.4) {

            this.comboCount = (this.comboCount || 1) + 1;

            const comboBonus = Math.min(2000, this.comboCount * 150);

            const comboTitle =

                this.comboCount === 2 ? "DOUBLE KILL!" :

                this.comboCount === 3 ? "TRIPLE KILL!" :

                `MULTI SPLATTER x${this.comboCount}!`;

            this.cash += comboBonus * this.multiplier;

            this.addFloatingText(ped.x, ped.y - 28, `🔥 ${comboTitle} +$${(comboBonus * this.multiplier).toLocaleString()}`, "#facc15");

        } else {

            this.comboCount = 1;

        }

        this.lastKillTime = nowSec;

    }



    damagePlayer(amount) {

        const p = this.player;

        if (p.dead) return;

        let rem = amount;

        if (p.armor > 0) {

            const absorbed = Math.min(p.armor, rem * 0.65);

            p.armor -= absorbed;

            rem -= absorbed;

        }

        p.hp -= rem;

        if (p.hp <= 0) {

            p.hp = 0;

            this.triggerWastedOrBusted("WASTED!", "LUCIA FLATLINED — TRANSFERRED TO LEONIDA GENERAL HOSPITAL", "#ff1e38", "HOSPITAL");

        }

        this.updateHud();

    }



    triggerWastedOrBusted(title, subtitle, color, targetType) {

        const p = this.player;

        if (!p || p.dead) return;

        if (targetType === "POLICE") {

            const maxHp = p.maxHp || 100;

            if (p.inVehicle || p.hp >= maxHp * 0.25) {

                return;

            }

        }

        p.dead = true;
        p.respawnGraceUntil = performance.now() + 4500;

        if (p.inVehicle) {

            const prevVeh = p.inVehicle;

            if ((p.seatIndex || 0) === 0) {

                prevVeh.driver = null;

                prevVeh.vx = 0;

                prevVeh.vy = 0;

                prevVeh.speed = 0;

                prevVeh.drifting = false;

                prevVeh.sirenActive = false;

            }

            p.inVehicle = null;

            p.seatIndex = 0;

        }

        p.vx = 0;

        p.vy = 0;

        p.isMoving = false;

        if (this.jason) this.jason.inVehicle = null;

        this.killFrenzy = null;

        this.setWantedLevel(0);

        if (this.audio && typeof this.audio.resetLoops === "function") {

            this.audio.resetLoops();

        }

        if (this.audio && typeof this.audio.playFanfare === "function") {

            this.audio.playFanfare(targetType === "POLICE" ? "BUSTED" : "WASTED");

        }



        // Dying (or being arrested without a get-out-of-jail card) costs ALL your money: back to the starting sum

        const loseAllCash = () => {

            const lost = Math.max(0, this.cash - this.START_CASH);

            this.cash = this.START_CASH;

            if (lost > 0) {

                this.addFloatingText(p.x, p.y - 30, `-$${lost.toLocaleString("en-US")} LOST`, "#ef4444");

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

            p.z = this.map.getHeightAtPixel(p.x, p.y, 4.0);

            p.vx = 0;

            p.vy = 0;

            p.isMoving = false;

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

        }, 2800);

    }



    fireWeapon(shooterX, shooterY, angle, weaponKey, isPlayer = true, fromJason = false, npcFaction = null) {

        const spec = WEAPON_SPECS[weaponKey] || WEAPON_SPECS.PISTOL;

        if (isPlayer || !this.player || Math.hypot(shooterX - this.player.x, shooterY - this.player.y) < 560) {
            this.audio.playShot(weaponKey);
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

                    if (ped.kind === "COP") {

                        this.setWantedLevel(Math.max(this.wantedLevel, 1));

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



        // Gunfire triggers GTA 1 panic in nearby AI traffic drivers & pedestrians!

        for (const v of this.vehicles) {

            if (!v.destroyed && v.driver === "AI_TRAFFIC" && Math.hypot(v.x - shooterX, v.y - shooterY) < 310) {

                if (typeof v.triggerPanic === "function") v.triggerPanic(7.5);

            }

        }

        for (const ped of this.peds) {

            if (!ped.dead && ped.kind === "CIVILIAN" && Math.hypot(ped.x - shooterX, ped.y - shooterY) < 280) {

                if (ped.isVillaGuard) {
                    if (isPlayer) {
                        ped.isAlertedGuard = true;
                        ped.panicTimer = 0;
                        ped.angle = Math.atan2(shooterY - ped.y, shooterX - ped.x);
                    }
                } else {
                    ped.panicTimer = 5.5;
                }

            }

        }



        const count = spec.pellets || 1;

        const spawnedPellets = [];

        for (let i = 0; i < count; i++) {

            const a = angle + (Math.random() - 0.5) * spec.spread;

            const proj = {

                x: shooterX + Math.cos(a) * 16,

                y: shooterY + Math.sin(a) * 16,

                vx: Math.cos(a) * spec.speed,

                vy: Math.sin(a) * spec.speed,

                damage: spec.damage,

                rangeLeft: spec.range,

                maxRange: spec.range,

                isFlame: Boolean(spec.isFlame),

                isRocket: Boolean(spec.isRocket),

                isElectro: Boolean(spec.isElectro),

                fromPlayer: isPlayer,

                fromJason: Boolean(fromJason),

                npcFaction: npcFaction || null,

                r: spec.isFlame ? 9 : 4

            };

            this.projectiles.push(proj);

            spawnedPellets.push(proj);

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

        if (this.missionMgr && this.missionMgr.activeMission) return;



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

        for (const v of this.vehicles) {

            if (!v.destroyed && v.driver === "AI_CRIMINAL" && Math.hypot(v.x - p.x, v.y - p.y) < 1500) {

                activeNearby++;

            }

        }

        for (const ped of this.peds) {

            if (!ped.dead && ped.kind === "CRIMINAL" && Math.hypot(ped.x - p.x, ped.y - p.y) < 1500) {

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

            const dist = 520 + Math.random() * 330;

            const tx = Math.floor((p.x + Math.cos(ang) * dist) / TILE_SIZE);

            const ty = Math.floor((p.y + Math.sin(ang) * dist) / TILE_SIZE);

            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(tx, ty)) continue;

            const navBlk = typeof this.map.getNavigationBlock === "function"

                ? this.map.getNavigationBlock(tx, ty, pz)

                : null;

            if (!navBlk || navBlk.groundType !== GROUND_TYPE.ROAD) continue;

            const wx = (tx + 0.5) * TILE_SIZE;

            const wy = (ty + 0.5) * TILE_SIZE;

            if (Math.hypot(wx - p.x, wy - p.y) < 480) continue;

            if (isVisibleToAnyPlayer(wx, wy)) continue;

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

                const copSpec = (i === 1 && Math.random() < 0.4) ? "SWAT_ENFORCER" : "VCPD_CRUISER";

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



            const copSpec = Math.random() < 0.38 ? "SWAT_ENFORCER" : "VCPD_CRUISER";

            const copCar = new Vehicle(`amb_heist_copcar_${nowId}`, copSpec, x - fwdX * 190 - sideX * 10, y - fwdY * 190 - sideY * 10, roadAng - 0.22);

            copCar.z = z;

            copCar.driver = null;

            copCar.sirenActive = true;

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



    resolveCircleVehicleCollision(x, y, radius = 8.5, z = 2.0, ignoreVeh = null) {
        let hit = false;
        let curX = x;
        let curY = y;
        const rSq = radius * radius;
        const cache = this._stoppedVehCache;
        if (cache) {
            for (let i = 0; i < cache.length; i++) {
                const vc = cache[i];
                if (vc.v === ignoreVeh) continue;
                const dx = curX - vc.x;
                if (dx > 54 || dx < -54) continue;
                const dy = curY - vc.y;
                if (dy > 54 || dy < -54) continue;
                if (vc.z !== undefined && z !== undefined && Math.abs(vc.z - z) > 0.85) continue;

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
            return { hit, x: curX, y: curY };
        }

        for (let i = 0; i < this.vehicles.length; i++) {
            const v = this.vehicles[i];
            if (!v || v === ignoreVeh) continue;
            if (v.z !== undefined && z !== undefined && Math.abs(v.z - z) > 0.85) continue;
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

        if (!p || p.dead || this.activeInterior) return;



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

            const isWreck = v.destroyed && (v.abandonedTimer || 0) > 12.0;

            const isAbandoned = !v.destroyed &&
                v.driver === null &&
                (v.abandonedTimer || 0) > (v.lastPlayerDriven ? 55.0 : 35.0);

            if (!isWreck && !isAbandoned) continue;



            const dPlayer = Math.hypot(v.x - p.x, v.y - p.y);

            if ((!isWreck && dPlayer < 42) || dPlayer >= bestDist) continue;



            const bx = Math.floor(v.x / TILE_SIZE);

            const by = Math.floor(v.y / TILE_SIZE);

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



            // Check if a tow truck is already assigned or close to this vehicle

            const alreadyTargeted = this.vehicles.some(

                (tv) => !tv.destroyed && tv.driver === "AI_TOW" && (tv.towTarget === v || (!tv.towingVehicle && Math.hypot(tv.x - v.x, tv.y - v.y) < 340))

            );

            if (alreadyTargeted) continue;



            bestDist = dPlayer;

            targetBlockedCar = v;

        }



        if (!targetBlockedCar) {

            this.towDispatchTimer = 0;

            return;

        }



        this.towDispatchTimer = (this.towDispatchTimer || 0) + dt;

        if (this.towDispatchTimer < 6.0) return;

        this.towDispatchTimer = 3.0; // retry ~3s later if no road spawn block found



        const baseBx = Math.floor(targetBlockedCar.x / TILE_SIZE);

        const baseBy = Math.floor(targetBlockedCar.y / TILE_SIZE);

        const pz = targetBlockedCar.z || 2.0;



        for (let attempt = 0; attempt < 32; attempt++) {

            const ang = Math.random() * Math.PI * 2;

            const distB = 5.0 + Math.random() * 3.2;

            const bx = Math.floor(baseBx + Math.cos(ang) * distB);

            const by = Math.floor(baseBy + Math.sin(ang) * distB);

            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;

            const navBlk = typeof this.map.getNavigationBlock === "function"

                ? this.map.getNavigationBlock(bx, by, pz)

                : null;

            if (!navBlk || navBlk.groundType !== GROUND_TYPE.ROAD) continue;



            const sx = (bx + 0.5) * TILE_SIZE;

            const sy = (by + 0.5) * TILE_SIZE;

            if (Math.hypot(sx - p.x, sy - p.y) < 260) continue;



            const toCarAng = Math.atan2(targetBlockedCar.y - sy, targetBlockedCar.x - sx);

            const roadAng = typeof this.map.getAlignedRoadAngle === "function"

                ? this.map.getAlignedRoadAngle(bx, by, toCarAng, pz)

                : toCarAng;

            const sz = this.map.getHeightAtPixel(sx, sy, 4.0);



            if (farTowTruck) {

                farTowTruck.x = sx;

                farTowTruck.y = sy;

                farTowTruck.z = sz;

                farTowTruck.angle = roadAng;

                farTowTruck.towTarget = targetBlockedCar;

                farTowTruck.towingVehicle = null;

                farTowTruck.sirenActive = true;

                farTowTruck.speed = 68;

                farTowTruck.vx = Math.cos(roadAng) * 68;

                farTowTruck.vy = Math.sin(roadAng) * 68;

                farTowTruck.aiStuckTimer = 0;

                farTowTruck.aiChosenDir = null;

                farTowTruck.approachBestDist = undefined;

                farTowTruck.approachNoProgress = 0;

            } else if (activeTowTrucks < 2) {

                const towTruck = new Vehicle(`tow_${Date.now()}_${attempt}`, "TOW_TRUCK", sx, sy, roadAng);

                towTruck.z = sz;

                towTruck.driver = "AI_TOW";

                towTruck.isEmergency = true;

                towTruck.sirenActive = true;

                towTruck.towTarget = targetBlockedCar;

                towTruck.speed = 68;

                towTruck.vx = Math.cos(roadAng) * 68;

                towTruck.vy = Math.sin(roadAng) * 68;

                this.vehicles.push(towTruck);

            }

            this.towDispatchTimer = 0;

            break;

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

            for (const st of intr.stations) {

                if ((st.cooldown || 0) > 0) {

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
        if (this.input.shoot && p.fireTimer <= 0) {
            const wKey = p.weapon || "FIST";
            const wDef = (typeof WEAPON_SPECS !== "undefined" && (WEAPON_SPECS[wKey] || WEAPON_SPECS.FIST)) || { fireRate: 0.25 };
            if (wKey !== "FIST" && (p.ammo[wKey] || 0) <= 0) {
                p.weapon = "FIST";
                this.updateHud();
            } else {
                p.fireTimer = wDef.fireRate || 0.22;
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
                if (intr.theme === "SHOP_GUN_SHOP" && wKey !== "FIST" && window.ShopInteriors && typeof window.ShopInteriors.transformPoint === "function") {
                    const tNow = performance.now() * 0.001;
                    for (let lane = 0; lane < 4; lane++) {
                        const lx = 550 + lane * 58;
                        const targY = 86 + Math.sin(tNow * 2.0 + lane * 1.4) * 6;
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
                            const isBullseye = dist <= 10;
                            const prize = isBullseye ? 250 : 100;
                            this.cash += prize;
                            this.score += prize * this.multiplier;
                            if (!this.interiorPopups) this.interiorPopups = [];
                            this.interiorPopups.push({
                                x: tp.x,
                                y: tp.y,
                                text: isBullseye ? `🎯 BULLSEYE! +$${prize}` : `🎯 TARGET HIT! +$${prize}`,
                                color: isBullseye ? "#fde047" : "#39ff14",
                                life: 1.15
                            });
                            if (this.audio && this.audio.playCashSound) this.audio.playCashSound();
                            this.updateHud();
                            break;
                        }
                    }
                }

                // If firing inside a shop outside the range (or hitting near an NPC), trigger panic / hold-up!
                if (!hitRangeTarget && wKey !== "FIST" && Array.isArray(intr.npcs)) {
                    for (const npc of intr.npcs) {
                        npc._robbedTimer = Math.max(npc._robbedTimer || 0, 8.0);
                    }
                }
            }
        }



        // Keep active missions ticking while inside a building (so interior robberies, wanted clears, and hotel check-ins complete immediately!)
        if (this.missions && typeof this.missions.update === "function") {
            this.missions.update(dt);
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

        if (!this.started) return;



        // Advance Live 24-Hour Smartphone Clock & Smooth Day / Sunset / Night / Sunrise Cycle

        // (1.0 in-game minute per 1.0 real second = 24 real minutes for a full 24h cycle!)

        this.worldMinutes = (this.worldMinutes + dt * 1.0 * (this.timeScale || 1.0)) % 1440;

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



        // If Lucia is currently inside a Venue Interior, update the interior room!

        if (this.activeInterior) {

            this.updateInterior(dt);

            return;

        }



        // Spawn / respawn / teleport (big jump in one frame): never auto-enter a door we land next to

        if (Array.isArray(this.map.interiors)) {

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

        this.trafficLightTimer += dt;

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

        if (!p.dead) {

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

                p.z = v.z !== undefined ? v.z : this.map.getHeightAtPixel(v.x, v.y, p.z || 2.0);

                p.angle = v.angle;

                p.isMoving = false;



                // Tank Co-Op Turret Logic: Seat 1 (Gunner) controls turret if occupied; otherwise Seat 0 (Driver) controls it!

                const hasRemoteGunner = occList.some((o) => !o.isLocal && o.seat === 1);

                if (v.hasTurret && (mySeat === 1 || (mySeat === 0 && !hasRemoteGunner))) {

                    v.turretAngle = (this.input.joyActive && typeof this.input.joyAngle === "number")

                        ? this.input.joyAngle

                        : (useMouseAim ? mouseAimAngle : v.angle);

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

                        if (mySeat === 0) {

                            this.multiplier += 1;

                            this.audio.playCashSound();

                            this.addCash(5000, "🔥 INSANE STUNT JUMP!");

                            this.showBigBanner("UNIQUE STUNT BONUS!", `${v.lastRampName || "BIG AIR"} — +$5,000 & MULTIPLIER +1!`, "#fde047", 2.4);

                        }

                    }

                } else if (mySeat === 0 && Array.isArray(this.map.stuntRamps)) {

                    const vSpd = Math.hypot(v.vx, v.vy);

                    if (vSpd > 125) {

                        for (const ramp of this.map.stuntRamps) {

                            if (Math.hypot(v.x - ramp.x, v.y - ramp.y) < 46) {

                                v.stuntMaxTime = Math.min(1.45, Math.max(0.95, vSpd / 280));

                                v.stuntAirTimer = v.stuntMaxTime;

                                v.lastRampName = ramp.name;

                                v.vx *= 1.22;

                                v.vy *= 1.22;

                                this.audio.playBeep(520, 0.12, "sawtooth", 0.08);

                                this.addFloatingText(v.x, v.y - 28, `🚀 ${ramp.name}!`, "#fde047");

                                break;

                            }

                        }

                    }

                }



                // B. Motorcycle Wheelie Bonus ([SPACE] while riding a Superbike or Chopper at speed!)

                if (mySeat === 0 && v.isMotorcycle && this.input.handbrake && Math.hypot(v.vx, v.vy) > 130) {

                    v.wheelieTimer = (v.wheelieTimer || 0) + dt;

                    v.vx += Math.cos(v.angle) * 120 * dt;

                    v.vy += Math.sin(v.angle) * 120 * dt;

                    if (v.wheelieTimer >= 1.2) {

                        v.wheelieTimer = 0;

                        this.addCash(500, "🏍️ WHEELIE BONUS!");

                    }

                } else if (mySeat === 0) {

                    v.wheelieTimer = 0;

                }

            } else {

                const boostMult = (p.speedBoostTimer || 0) > 0 ? 1.28 : 1.0;

                const walkSpeed = (this.input.sprint ? 195 : 138) * boostMult * (this.map.isWaterAtPixel(p.x, p.y) ? 0.55 : 1);

                const manualInput = this.input.up || this.input.down || this.input.left || this.input.right;

                if (manualInput) {

                    p.enteringVehicle = null;

                }



                // StateEnteringCar (PedestrianStates.cpp): physically run to the vehicle's door!

                if (p.enteringVehicle && !p.enteringVehicle.destroyed) {

                    const ev = p.enteringVehicle;

                    const targetSeat = typeof ev.findFirstFreeSeat === "function" ? Math.max(0, ev.findFirstFreeSeat(this)) : 0;

                    const sideSign = (targetSeat % 2 === 1) ? 1 : -1;

                    const doorX = ev.x + sideSign * Math.sin(ev.angle) * 20;

                    const doorY = ev.y - sideSign * Math.cos(ev.angle) * 20;

                    const distDoor = Math.hypot(doorX - p.x, doorY - p.y);

                    const distCarCenter = Math.hypot(ev.x - p.x, ev.y - p.y);

                    if (distDoor < 26 || distCarCenter < 38) {

                        this.completeVehicleEntry(ev);

                    } else if (distDoor > 180) {

                        p.enteringVehicle = null;

                    } else {

                        p.angle = Math.atan2(doorY - p.y, doorX - p.x);

                        p.x += Math.cos(p.angle) * 185 * dt;

                        p.y += Math.sin(p.angle) * 185 * dt;

                        p.isMoving = true;

                        p.walkPhase += dt * 1.45;

                    }

                } else if (this.input.joyActive && (Math.abs(this.input.joyX) > 0.1 || Math.abs(this.input.joyY) > 0.1)) {

                    // Mobile 360° Virtual Analog Stick On-Foot Movement

                    p.angle = Math.atan2(this.input.joyY, this.input.joyX);

                    const mag = Math.min(1.0, this.input.joyMag || 1.0);

                    const spd = p.jumpTimer > 0 ? Math.max(walkSpeed, 175) : walkSpeed * mag;

                    p.x += Math.cos(p.angle) * spd * dt;

                    p.y += Math.sin(p.angle) * spd * dt;

                    p.isMoving = true;

                    p.walkPhase += dt * (this.input.sprint ? 1.55 : 1.0);

                } else if (p.tankControls) {

                    // Authentic 1997 1997 GTA 1 Rotational On-Foot Controls:

                    // Left/Right rotates character; Up walks/runs forward; Down steps backward!

                    const turnRate = 4.35;

                    if (this.input.left) p.angle -= turnRate * dt;

                    if (this.input.right) p.angle += turnRate * dt;



                    let moveDir = 0;

                    if (this.input.up) moveDir += 1.0;

                    if (this.input.down) moveDir -= 0.6;



                    if (moveDir !== 0 || p.jumpTimer > 0) {

                        const spd = p.jumpTimer > 0 ? Math.max(walkSpeed, 175) * (moveDir !== 0 ? Math.sign(moveDir) : 1) : walkSpeed * moveDir;

                        p.x += Math.cos(p.angle) * spd * dt;

                        p.y += Math.sin(p.angle) * spd * dt;

                        p.isMoving = true;

                        p.walkPhase += dt * (this.input.sprint ? 1.55 : 1.0);

                    } else {

                        p.isMoving = false;

                    }

                    if (this.input.shoot && useMouseAim) {

                        p.angle = mouseAimAngle;

                    }

                } else {

                    // Modern Cardinal 8-Way WASD Controls

                    let mx = 0;

                    let my = 0;

                    if (this.input.up) my -= 1;

                    if (this.input.down) my += 1;

                    if (this.input.left) mx -= 1;

                    if (this.input.right) mx += 1;



                    if (mx !== 0 || my !== 0) {

                        const len = Math.hypot(mx, my);

                        p.x += (mx / len) * walkSpeed * dt;

                        p.y += (my / len) * walkSpeed * dt;

                        p.isMoving = true;

                        p.walkPhase += dt * (this.input.sprint ? 1.55 : 1.0);

                        p.angle = Math.atan2(my, mx);

                    } else {

                        p.isMoving = false;

                    }

                    if (this.input.shoot && useMouseAim) {

                        p.angle = mouseAimAngle;

                    }

                }



                const col = this.map.resolveCircleBuildingCollision(p.x, p.y, 11, p.z || 2.0);

                p.x = col.x;

                p.y = col.y;



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

                p.z = this.map.getHeightAtPixel(p.x, p.y, p.z || 2.0);



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

            if (this.input.shoot && p.shootCooldown <= 0) {

                const v = p.inVehicle;

                const mySeat = p.seatIndex || 0;

                if (v && v.specKey === "FIRE_TRUCK" && mySeat === 0) {
                    // Rooftop High-Pressure Water Cannon when driving a Fire Truck!
                    p.shootCooldown = 0.045;
                    const cannonAng = shotAngle;
                    const nozX = v.x + Math.cos(cannonAng) * 26;
                    const nozY = v.y + Math.sin(cannonAng) * 26;
                    for (let k = 0; k < 3; k++) {
                        const spread = (Math.random() - 0.5) * 0.16;
                        const spd = 250 + Math.random() * 75;
                        this.particles.push({
                            x: nozX,
                            y: nozY,
                            vx: Math.cos(cannonAng + spread) * spd,
                            vy: Math.sin(cannonAng + spread) * spd,
                            size: 3.8 + Math.random() * 2.2,
                            color: Math.random() < 0.38 ? "#bae6fd" : "#38bdf8",
                            life: 0.44,
                            maxLife: 0.44
                        });
                    }
                    // Extinguish burning vehicles / wrecks & knock back pedestrians in the water stream cone
                    for (const ov of this.vehicles) {
                        if (ov === v) continue;
                        const dx = ov.x - v.x;
                        const dy = ov.y - v.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 195) continue;
                        const aDiff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - cannonAng), Math.cos(Math.atan2(dy, dx) - cannonAng)));
                        if (aDiff > 0.36) continue;
                        const wasBurning = (!ov.destroyed && ((ov.burnTimer || 0) > 0 || ov.hp <= 50)) || (ov.destroyed && !ov.fireExtinguished);
                        if (wasBurning) {
                            ov.extinguishProgress = (ov.extinguishProgress || 0) + 0.09;
                            if (Math.random() < 0.55) {
                                this.spawnParticle(ov.x + (Math.random() - 0.5) * 20, ov.y + (Math.random() - 0.5) * 20, "WHITE_SMOKE");
                            }
                            if (!ov.destroyed) {
                                ov.hp = Math.min(ov.maxHp, Math.max(ov.hp + 6.5, 60));
                                ov.burnTimer = 0;
                                ov.chainExplodeTimer = 0;
                                if (ov.extinguishProgress >= 1.1 && !ov._playerFireReward) {
                                    ov._playerFireReward = true;
                                    this.score += 150;
                                    this.addFloatingText(ov.x, ov.y - 24, "🚒 VCFD +$150 — FIRE EXTINGUISHED!", "#38bdf8");
                                    this.updateHud();
                                }
                            } else if (ov.extinguishProgress >= 1.5 && !ov.fireExtinguished) {
                                ov.fireExtinguished = true;
                                ov.burnTimer = 0;
                                this.score += 150;
                                this.addFloatingText(ov.x, ov.y - 24, "🚒 VCFD +$150 — WRECK EXTINGUISHED!", "#38bdf8");
                                this.updateHud();
                            }
                        }
                    }
                    for (const ped of this.peds) {
                        if (ped.dead) continue;
                        const dx = ped.x - v.x;
                        const dy = ped.y - v.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist > 175) continue;
                        const aDiff = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - cannonAng), Math.cos(Math.atan2(dy, dx) - cannonAng)));
                        if (aDiff <= 0.30) {
                            ped.burnTimer = 0;
                            ped.stunnedTimer = Math.max(ped.stunnedTimer || 0, 0.75);
                            ped.panicTimer = 4.0;
                            ped.x += Math.cos(cannonAng) * 5.5;
                            ped.y += Math.sin(cannonAng) * 5.5;
                        }
                    }
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

                    const fireAng = controlsTankTurret ? (v.turretAngle || shotAngle) : shotAngle;

                    this.fireWeapon(p.x, p.y, fireAng, activeWep, true, false);

                    this.updateHud();

                } else if (!p.inVehicle) {

                    p.weapon = "FIST";

                    this.updateHud();

                }

                }

            }

        }



        // 2. Partner AI removed (solo & multiplayer only)

        this.updateGraffitiTagging(dt);



        // 3. Update All Vehicles & Collisions

        if ((p.hitByCarCooldown || 0) > 0) {

            p.hitByCarCooldown = Math.max(0, p.hitByCarCooldown - dt);

        }

        for (const v of this.vehicles) {

            v.update(dt, this.input, this.map, this);



            // Check player vehicle OR high-speed panicked/cop vehicle hitting pedestrians:
            // E-Scooters & Bicycles NEVER kill pedestrians — they only knock them out (stunnedTimer)!
            // For cars/motorcycles: low-speed bumps (30 < vSpeed <= 68) knock pedestrians down; high-speed (> 68) runs them over!

            const vSpeed = Math.hypot(v.vx, v.vy);

            const isNonLethalWheeler = (v.specKey === "E_SCOOTER" || v.specKey === "BMX_BIKE");

            const isActiveThreatCar =

                !v.destroyed &&

                (v.driver === "PLAYER" || v.driver === "AI_COP" || v.aiPanicTimer > 0);

            if (isActiveThreatCar && vSpeed > 28) {

                for (const ped of this.peds) {

                    if (ped.dead) continue;

                    if (ped.kind === "COP" && v.driver === "AI_COP") continue;

                    if (Math.hypot(ped.x - v.x, ped.y - v.y) < 25) {

                        if (isNonLethalWheeler) {

                            if ((ped.stunnedTimer || 0) <= 0) {

                                ped.stunnedTimer = 1.55;

                                ped.panicTimer = 4.5;

                                ped.x += (v.vx / Math.max(1, vSpeed)) * 18;

                                ped.y += (v.vy / Math.max(1, vSpeed)) * 18;

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

                                ped.x += (v.vx / Math.max(1, vSpeed)) * 16;

                                ped.y += (v.vy / Math.max(1, vSpeed)) * 16;

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

                            ped.x += (v.vx / Math.max(1, vSpeed)) * 14;

                            ped.y += (v.vy / Math.max(1, vSpeed)) * 14;

                        }

                    }

                }

                if (v.driver === "PLAYER" && vSpeed > 45 && this.map.crates) {

                    for (const cr of this.map.crates) {

                        if (!cr.smashed && Math.hypot(cr.x - v.x, cr.y - v.y) < 30) {

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
                            if ((ph.wipeoutTimer || 0) > 0) continue;
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
                                    this.score += 85 * this.multiplier;
                                    this.updateHud();
                                    this.addFloatingText(ph.x, ph.y - 20, "☎️ PAYPHONE SMASHED! +$85", "#38bdf8");
                                }
                            }
                        }
                    }

                    // Allow vehicles to plow through open-air street/beach animations, sunbathers, and parasols (non-lethal wheelers knock out instead of killing)!
                    this.checkAndWipeoutLivingEvents(v.x, v.y, 28, v.driver === "PLAYER", true, isNonLethalWheeler);
                }

            }



            // Speeding AI / Police vehicles can knock down Lucia on foot unless she jumps over them ([SPACE])!

            if (

                !v.destroyed &&

                v.driver !== "PLAYER" &&

                !p.inVehicle &&

                !p.dead &&

                (p.jumpTimer || 0) <= 0 &&

                (p.slideCarTimer || 0) <= 0 &&

                (p.hitByCarCooldown || 0) <= 0 &&

                vSpeed > 65

            ) {

                if (Math.hypot(p.x - v.x, p.y - v.y) < 22) {

                    p.hitByCarCooldown = 0.85;

                    p.x += (v.vx / vSpeed) * 18;

                    p.y += (v.vy / vSpeed) * 18;

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

        for (let i = 0; i < this.vehicles.length; i++) {

            for (let j = i + 1; j < this.vehicles.length; j++) {

                const a = this.vehicles[i];

                const b = this.vehicles[j];

                if (a.towingVehicle === b || b.towingVehicle === a || a.towTarget === b || b.towTarget === a) continue;

                if (a.z !== undefined && b.z !== undefined && Math.abs(a.z - b.z) > 0.85) continue;

                if (Math.abs(b.x - a.x) > 68 || Math.abs(b.y - a.y) > 68) continue;



                const aHalfL = (a.w || 48) * 0.26;

                const bHalfL = (b.w || 48) * 0.26;

                const aRad = Math.max(11, (a.h || 24) * 0.48);

                const bRad = Math.max(11, (b.h || 24) * 0.48);

                const minDist = aRad + bRad;



                const aCos = Math.cos(a.angle), aSin = Math.sin(a.angle);

                const bCos = Math.cos(b.angle), bSin = Math.sin(b.angle);



                const aPts = [

                    { x: a.x + aCos * aHalfL, y: a.y + aSin * aHalfL, lever: 1 },

                    { x: a.x - aCos * aHalfL, y: a.y - aSin * aHalfL, lever: -1 }

                ];

                const bPts = [

                    { x: b.x + bCos * bHalfL, y: b.y + bSin * bHalfL, lever: 1 },

                    { x: b.x - bCos * bHalfL, y: b.y - bSin * bHalfL, lever: -1 }

                ];



                let bestOverlap = 0;

                let bestNx = 0, bestNy = 0;

                let hitALever = 0, hitBLever = 0;



                for (const pa of aPts) {

                    for (const pb of bPts) {

                        const dx = pb.x - pa.x;

                        const dy = pb.y - pa.y;

                        const d = Math.hypot(dx, dy);

                        if (d > 0 && d < minDist && (minDist - d) > bestOverlap) {

                            bestOverlap = minDist - d;

                            bestNx = dx / d;

                            bestNy = dy / d;

                            hitALever = pa.lever;

                            hitBLever = pb.lever;

                        }

                    }

                }



                if (bestOverlap > 0) {

                    // Panzer Tank rams: the 50-ton hull shoves the other vehicle aside and dents it according to
                    // ramming speed. A slow nudge only pushes & dents; a full-speed ram sets the car on fire.
                    // (The car only blows up after several rams or a very fast hit, never on a simple contact.)
                    if ((a.crushesCars && !b.crushesCars) || (b.crushesCars && !a.crushesCars)) {

                        const tank = a.crushesCars ? a : b;

                        const victim = tank === a ? b : a;

                        const sgn = tank === a ? 1 : -1; // bestN points from a to b

                        // The tank doesn't budge: the victim takes the whole separation
                        victim.x += bestNx * bestOverlap * 1.05 * sgn;

                        victim.y += bestNy * bestOverlap * 1.05 * sgn;

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



                    const involvesPlayerOrActiveCop =

                        a.driver === "PLAYER" ||

                        b.driver === "PLAYER" ||

                        (!a.destroyed && a.driver === "AI_CRIMINAL") ||

                        (!b.destroyed && b.driver === "AI_CRIMINAL") ||

                        (!a.destroyed && a.driver === "AI_TOW") ||

                        (!b.destroyed && b.driver === "AI_TOW") ||

                        (!a.destroyed && a.driver === "AI_EMERGENCY" && a.sirenActive) ||

                        (!b.destroyed && b.driver === "AI_EMERGENCY" && b.sirenActive) ||

                        (((!a.destroyed && a.driver === "AI_COP") || (!b.destroyed && b.driver === "AI_COP")) && (this.wantedLevel > 0 || a.sirenActive || b.sirenActive));



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

                        // AI-vs-AI traffic: only enforce longitudinal spacing between same-direction vehicles;

                        // never push AI cars laterally out of their lane or wedge crossing AI cars inside an intersection!

                        if (!a.destroyed && !b.destroyed && Math.cos(a.angle - b.angle) > 0.65) {

                            const proj = (b.x - a.x) * aCos + (b.y - a.y) * aSin;

                            const rear = proj >= 0 ? a : b;

                            const front = proj >= 0 ? b : a;

                            const rCos = Math.cos(rear.angle);

                            const rSin = Math.sin(rear.angle);

                            rear.x -= rCos * bestOverlap;

                            rear.y -= rSin * bestOverlap;

                            const frontSpd = Math.max(0, Math.hypot(front.vx, front.vy) * 0.85);

                            const rearSpd = Math.min(Math.hypot(rear.vx, rear.vy), frontSpd);

                            rear.vx = rCos * rearSpd;

                            rear.vy = rSin * rearSpd;

                            rear.speed = rearSpd;

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
                        a.x -= bestNx * sepTotal * (invA / invSum);
                        a.y -= bestNy * sepTotal * (invA / invSum);
                        b.x += bestNx * sepTotal * (invB / invSum);
                        b.y += bestNy * sepTotal * (invB / invSum);
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

                        if (typeof a.triggerPanic === "function") a.triggerPanic(8.5);

                        if (typeof b.triggerPanic === "function") b.triggerPanic(8.5);

                        if ((a.driver === "PLAYER" || b.driver === "PLAYER") && Math.random() < 0.38) {

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

                    if (inwardImpact > 88 && canTriggerCrashSfx) {

                        a.crashCooldown = 0.52;

                        b.crashCooldown = 0.52;

                        const dmg = inwardImpact * 0.042;

                        if (b.driver === "PLAYER") a.damagedByPlayer = true;

                        if (a.driver === "PLAYER") b.damagedByPlayer = true;

                        if (!a.destroyed) {

                            if (typeof a.receiveImpactDamage === "function") a.receiveImpactDamage(dmg, b.x, b.y);

                            else a.hp -= dmg;

                        }

                        if (!b.destroyed) {

                            if (typeof b.receiveImpactDamage === "function") b.receiveImpactDamage(dmg, a.x, a.y);

                            else b.hp -= dmg;

                        }

                        this.spawnParticle((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, "SPARK");

                        if (Math.hypot(a.x - p.x, a.y - p.y) < 480) {

                            this.audio.playCarCrash(Math.min(1.5, dmg / 14));

                        }

                    }

                }

            }

        }



        // 4A. Pay 'n' Spray Garage Check

        for (const pns of this.map.payNSprays) {

            if (pns.cooldown > 0) pns.cooldown -= dt;

            if (p.inVehicle && pns.cooldown <= 0) {

                const v = p.inVehicle;

                if (v.x > pns.x && v.x < pns.x + pns.w && v.y > pns.y && v.y < pns.y + pns.h) {

                    pns.cooldown = 6.0;

                    if (typeof v.resetDamage === "function") v.resetDamage();

                    else v.hp = v.maxHp;

                    const paintColors = ["#ff2a85", "#00f0ff", "#39ff14", "#ffd13b", "#a855f7", "#f97316"];

                    v.color = paintColors[Math.floor(Math.random() * paintColors.length)];

                    this.setWantedLevel(0);

                    this.audio.playCashSound();

                    this.showBigBanner("PAY 'N' SPRAY", "NEW PAINT JOB + BODY DENTS REPAIRED + WANTED CLEARED!", "#39ff14", 2.2);

                }

            }

        }



        // 4B. Classic GTA 1 Car Bomb Shop Check (never auto-buy on drive-over — must confirm with [E]!)

        if (this.map.bombShops) {

            for (const bs of this.map.bombShops) {

                if (bs.cooldown > 0) bs.cooldown -= dt;

                if (p.inVehicle && (bs.cooldown || 0) <= 0) {

                    const v = p.inVehicle;

                    const inside = !v.hasBomb && v.x > bs.x && v.x < bs.x + bs.w && v.y > bs.y && v.y < bs.y + bs.h;

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

                        const payout = cv.resellValue || 12000;

                        const vName = cv.name;

                        cv.destroyed = true;

                        this.vehicles = this.vehicles.filter((veh) => veh !== cv);

                        cr.crushingVehicle = null;

                        cr.crushProgress = 0;

                        cr.armAngle = 0;

                        this.multiplier += 1;

                        this.audio.playCrateSmash();

                        this.audio.playCashSound();

                        this.addCash(payout, "CRUSHED & EXPORTED!");

                        this.showBigBanner(

                            "CAR CRUSHED!",

                            `${vName} COMPACTED FOR +$${(payout * this.multiplier).toLocaleString()} & MULTIPLIER +1!`,

                            "#ffd13b",

                            2.8

                        );

                    }

                } else {

                    // Look for any unoccupied non-destroyed vehicle parked inside the crane pad

                    for (const v of this.vehicles) {

                        if (!v.destroyed && v.driver === null && v !== p.inVehicle) {

                            if (v.x > cr.x && v.x < cr.x + cr.w && v.y > cr.y && v.y < cr.y + cr.h) {

                                cr.crushingVehicle = v;

                                cr.crushProgress = 0.01;

                                this.audio.playBeep(520, 0.1, "sawtooth", 0.08);

                                this.addFloatingText(v.x, v.y - 24, "🏗️ MAGNETIC CRANE LOCKED!", "#ffd13b");

                                break;

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

            for (const kf of this.map.killFrenzies) {

                if (kf.cooldown > 0) {

                    kf.cooldown -= dt;

                    continue;

                }

                if (!this.killFrenzy && Math.hypot(p.x - kf.x, p.y - kf.y) < 30) {

                    kf.cooldown = 45;

                    this.startKillFrenzy(kf);

                }

            }

        }



        // 5C. Pickups Check

        for (const pk of this.map.pickups) {

            if (pk.respawnTimer > 0) {

                pk.respawnTimer -= dt;

                continue;

            }

            if (Math.hypot(p.x - pk.x, p.y - pk.y) < 28) {

                pk.respawnTimer = 25;

                this.applyPickupEffect(pk);

            }

        }



        // 6. Pedestrians, GOURANGA Monk Chain, Alligators, Hostile Carjackers & VCPD Foot Officers Update
        // Pre-cache stationary / slow / parked vehicle OBB transforms once per frame to eliminate thousands of trig/hypot calls in pedestrian feelers
        if (!this._stoppedVehCache) this._stoppedVehCache = [];
        this._stoppedVehCache.length = 0;
        for (let i = 0; i < this.vehicles.length; i++) {
            const v = this.vehicles[i];
            if (!v) continue;
            const vx = v.vx || 0;
            const vy = v.vy || 0;
            if (!v.destroyed && v.driver !== null && (vx * vx + vy * vy) > 3364) continue; // 58^2 = 3364
            this._stoppedVehCache.push({
                v,
                x: v.x,
                y: v.y,
                z: v.z,
                cosA: Math.cos(v.angle),
                sinA: Math.sin(v.angle),
                halfL: (v.w || 46) * 0.44,
                halfW: (v.h || 22) * 0.42
            });
        }

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

            if (ped.exitAnimTimer > 0) ped.exitAnimTimer = Math.max(0, ped.exitAnimTimer - dt);

            if (ped.muzzleTimer > 0) ped.muzzleTimer = Math.max(0, ped.muzzleTimer - dt);



            if (isClientWorldSync) {

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

                    ped.netTargetX += Math.cos(ped.netTargetAngle || ped.angle || 0) * moveSpd * dt * 0.48;

                    ped.netTargetY += Math.sin(ped.netTargetAngle || ped.angle || 0) * moveSpd * dt * 0.48;

                    const dx = ped.netTargetX - ped.x;

                    const dy = ped.netTargetY - ped.y;

                    const dist = Math.hypot(dx, dy);

                    if (dist > 260) {

                        ped.x = ped.netTargetX;

                        ped.y = ped.netTargetY;

                        if (ped.netTargetZ !== undefined) ped.z = ped.netTargetZ;

                    } else {

                        const lerp = Math.min(1.0, dt * 13.5);

                        ped.x += dx * lerp;

                        ped.y += dy * lerp;

                        if (ped.netTargetZ !== undefined) ped.z += (ped.netTargetZ - ped.z) * lerp;

                    }

                    if (ped.netTargetAngle !== undefined) {

                        const angDiff = Math.atan2(Math.sin(ped.netTargetAngle - ped.angle), Math.cos(ped.netTargetAngle - ped.angle));

                        ped.angle += angDiff * Math.min(1.0, dt * 14.0);

                    }

                }

                // Check close-range COP arrest / damage AND ranged weapon fire on local player even in client sync mode
                if (ped.kind === "COP" && (this.wantedLevel > 0 || ped.carjackedCop) && !p.dead) {
                    ped.inCombat = true;
                    const targetEnt = p.inVehicle || p;
                    const dPlayer = Math.hypot(targetEnt.x - ped.x, targetEnt.y - ped.y);
                    if (dPlayer <= 28 && !p.inVehicle) {
                        const maxHp = p.maxHp || 100;
                        if (p.hp < maxHp * 0.25) {
                            this.triggerWastedOrBusted("BUSTED!", "ARRESTED BY LEONIDA VCPD — RELEASED AT PRECINCT HQ", "#38bdf8", "POLICE");
                        } else {
                            this.damagePlayer(18 * dt);
                        }
                    }
                    ped.shootCooldown = (ped.shootCooldown || 0) - dt;
                    if (dPlayer < 325 && ped.shootCooldown <= 0 && (ped.stunnedTimer || 0) <= 0) {
                        const blocked = this.map.traceSegment2D
                            ? this.map.traceSegment2D(ped.x, ped.y, targetEnt.x, targetEnt.y, ped.z || 2.0).hit
                            : false;
                        if (!blocked) {
                            const effWanted = Math.max(1, this.wantedLevel || 1);
                            const wep = ped.copWeapon || (effWanted >= 4 ? "SHOTGUN" : (effWanted >= 3 ? "UZI" : "PISTOL"));
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

            if (ped.kind !== "GATOR" && !((ped.drownTimer || 0) > 0) && this.map && this.map.getGroundTypeAt &&

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

                ped.stunnedTimer -= dt;

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

                if (!p.inVehicle && dPlayer < 190) {

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

                const copTarget = this.getNearestWantedTarget(ped.x, ped.y) || (ped.carjackedCop && p && !p.dead ? {

                    x: p.inVehicle ? p.inVehicle.x : p.x,

                    y: p.inVehicle ? p.inVehicle.y : p.y,

                    vx: p.inVehicle ? (p.inVehicle.vx || 0) : 0,

                    vy: p.inVehicle ? (p.inVehicle.vy || 0) : 0,

                    isRemote: false,

                    wantedLevel: Math.max(1, this.wantedLevel || 1)

                } : null);

                ped.inCombat = Boolean(copTarget);

                if (copTarget) {

                    const dTarget = Math.hypot(copTarget.x - ped.x, copTarget.y - ped.y);

                    const effWanted = Math.max(this.wantedLevel || 0, copTarget.wantedLevel || 1);

                    const copRunSpd = ped.copWeapon === "SHOTGUN" || effWanted >= 3 ? 104 : 96;

                    const idealDist = copTarget.isCriminalNPC ? 95 : 28;

                    if (dTarget > idealDist) {

                        ped.angle = this.steerPedWithObstacleFeelers(ped, copTarget.x, copTarget.y);

                        ped.x += Math.cos(ped.angle) * copRunSpd * dt;

                        ped.y += Math.sin(ped.angle) * copRunSpd * dt;

                    } else {

                        ped.angle = Math.atan2(copTarget.y - ped.y, copTarget.x - ped.x);

                        if (copTarget.isCriminalNPC && dTarget < 60) {

                            // Tactical strafe when dueling armed criminals

                            const strafeAng = ped.angle + Math.PI * 0.5 * ((ped.id % 2 === 0) ? 1 : -1);

                            ped.x += Math.cos(strafeAng) * 52 * dt;

                            ped.y += Math.sin(strafeAng) * 52 * dt;

                        } else if (!copTarget.isRemote && !copTarget.isCriminalNPC && !p.dead && !((ped.bustedGraceTimer || 0) > 0)) {

                            // Cops never bust a player inside a vehicle; on foot, arrest only triggers below 25% HP!

                            if (!p.inVehicle) {

                                const maxHp = p.maxHp || 100;

                                if (p.hp < maxHp * 0.25) {

                                    this.triggerWastedOrBusted("BUSTED!", "ARRESTED BY LEONIDA VCPD — RELEASED AT PRECINCT HQ", "#38bdf8", "POLICE");

                                } else {

                                    this.damagePlayer(18 * dt);

                                }

                            }

                        }

                    }

                    ped.shootCooldown = (ped.shootCooldown || 0) - dt;

                    if (dTarget < 325 && ped.shootCooldown <= 0) {

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

                    // Post-shootout scene cleanup: if an unoccupied police cruiser or bandit getaway car is nearby,
                    // VCPD officers walk back to it, climb in, and drive it away on patrol!
                    let returnCar = null;
                    let bestCarDist = 420;
                    if (ped.missionTag !== "PRISON_GUARD") {
                        for (const v of this.vehicles) {
                            if (
                                !v.destroyed &&
                                v.driver === null &&
                                !v.towedByTruck &&
                                (v.isPolice || v.wasCriminalCar)
                            ) {
                                const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                                if (d < bestCarDist) {
                                    bestCarDist = d;
                                    returnCar = v;
                                }
                            }
                        }
                    }

                    if (returnCar) {
                        ped._boardingVeh = returnCar;
                        const boardDist = Math.max(40, (returnCar.w || 48) * 0.52 + 10);
                        if (bestCarDist < boardDist) {
                            returnCar.driver = "AI_COP";
                            returnCar.wasCriminalCar = false;
                            returnCar.sirenActive = false;
                            returnCar.doorOpenTimer = 0.44;
                            ped._boardedVehicle = true;
                            ped.dead = true;
                            continue;
                        }
                        ped.angle = this.steerPedWithObstacleFeelers(ped, returnCar.x, returnCar.y, returnCar);
                        ped.x += Math.cos(ped.angle) * 76 * dt;
                        ped.y += Math.sin(ped.angle) * 76 * dt;
                    } else {
                        // Routine VCPD foot patrol when no wanted player or active criminal is nearby
                        ped.x += Math.cos(ped.angle) * 42 * dt;
                        ped.y += Math.sin(ped.angle) * 42 * dt;
                        if (Math.random() < 0.015) ped.angle += (Math.random() - 0.5) * 1.2;
                    }

                }

            } else if (ped.kind === "CRIMINAL") {

                // Ambient Bandit / Heist Crew AI: engages VCPD officers & cruisers in street shootouts (and player if attacked by player)

                let crimTarget = null;

                let bestCopDist = 440;

                for (const other of this.peds) {

                    if (!other.dead && other.kind === "COP") {

                        const d = Math.hypot(other.x - ped.x, other.y - ped.y);

                        if (d < bestCopDist) {

                            bestCopDist = d;

                            crimTarget = { x: other.x, y: other.y, vx: 0, vy: 0 };

                        }

                    }

                }

                for (const cv of this.vehicles) {

                    if (!cv.destroyed && cv.driver === "AI_COP") {

                        const d = Math.hypot(cv.x - ped.x, cv.y - ped.y);

                        if (d < bestCopDist) {

                            bestCopDist = d;

                            crimTarget = { x: cv.x, y: cv.y, vx: cv.vx || 0, vy: cv.vy || 0 };

                        }

                    }

                }

                if (ped.attackedByPlayer && p && !p.dead) {

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
                    if ((ped.noBoardTimer || 0) <= 0) {
                        for (const v of this.vehicles) {
                            if (
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

                if (dPlayer < 290 && !p.dead) {

                    const reachDist = p.inVehicle ? Math.max(38, (p.inVehicle.w || 48) * 0.50 + 10) : 24;

                    if (p.inVehicle) ped._boardingVeh = p.inVehicle;

                    if (dPlayer > reachDist) {

                        ped.angle = this.steerPedWithObstacleFeelers(ped, p.x, p.y, p.inVehicle || null);

                        ped.x += Math.cos(ped.angle) * 90 * dt;

                        ped.y += Math.sin(ped.angle) * 90 * dt;

                    } else if (p.inVehicle && !p.inVehicle.crushesCars && Math.abs(p.inVehicle.speed) < 38) {

                        // Angry driver yanks Lucia out of the car and takes it back!

                        const stolenBack = p.inVehicle;

                        p.inVehicle = null;

                        p.exitAnimTimer = 0.36;

                        p.x = stolenBack.x - Math.sin(stolenBack.angle) * 28;

                        p.y = stolenBack.y + Math.cos(stolenBack.angle) * 28;

                        stolenBack.driver = "AI_TRAFFIC";

                        stolenBack.doorOpenTimer = 0.48;

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

                const amb = ped.homeAmbulance;

                if (!amb || amb.destroyed || amb.driver !== "AI_EMERGENCY") {

                    if (amb) amb.deployedMedic = null;
                    if (ped.carryingCorpse) ped.carryingCorpse = null;

                    ped.kind = "CIVILIAN";

                    continue;

                }

                // Keep carried criminal corpse moving with the paramedic on the stretcher back to the ambulance
                if (ped.carryingCorpse) {
                    if (!this.peds.includes(ped.carryingCorpse)) {
                        ped.carryingCorpse = null;
                    } else {
                        ped.carryingCorpse.x = ped.x - Math.cos(ped.angle) * 10;
                        ped.carryingCorpse.y = ped.y - Math.sin(ped.angle) * 10;
                        ped.carryingCorpse.z = ped.z || 2.0;
                        ped.carryingCorpse.angle = ped.angle;
                    }
                }

                let targetCorpse = null;

                let bestDist = 760;

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

                        if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(other.x, other.y)) continue;

                        if (Math.hypot(other.x - amb.x, other.y - amb.y) > 760) continue;

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
                                this.addFloatingText(targetCorpse.x, targetCorpse.y - 22, "🚑 EVACUATING CRIMINAL BODY!", "#38bdf8");
                            } else {
                                targetCorpse.dead = false;

                                targetCorpse.deadTimer = 0;

                                targetCorpse.revived = true;

                                targetCorpse.hp = 35;

                                targetCorpse.speed = 36;

                                targetCorpse.stunnedTimer = 0;

                                targetCorpse.burnTimer = 0;

                                targetCorpse.electroTimer = 0;

                                targetCorpse.drownTimer = 0;

                                targetCorpse.panicTimer = 4.0;

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

                            ped.angle = this.steerPedWithObstacleFeelers(ped, targetCorpse.x, targetCorpse.y);

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

                            if (ped.medicStuckTimer > 9.0) {

                                targetCorpse.unreachableForMedic = true;

                                ped.medicStuckTimer = 0;

                                ped.lastBestDist = 9999;

                            }

                        }

                    }

                } else {

                    // Jog back to the ambulance (carrying a criminal corpse if any) and load / climb in!

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

                    ped.angle = this.steerPedWithObstacleFeelers(ped, amb.x, amb.y, amb);

                    ped.x += Math.cos(ped.angle) * 98 * dt;

                    ped.y += Math.sin(ped.angle) * 98 * dt;

                }

            } else if (ped.kind === "FIREMAN") {

                // On-Foot VCFD Firefighter AI: Advances from parked Fire Engine with high-pressure hose nozzle to extinguish burning vehicles, wrecks & burning peds!

                ped.firemanOutTimer = (ped.firemanOutTimer || 0) + dt;

                const ft = ped.homeFireTruck;

                if (!ft || ft.destroyed || ft.driver !== "AI_EMERGENCY") {

                    if (ft) ft.deployedFireman = null;

                    ped.sprayingHose = false;

                    ped.kind = "CIVILIAN";

                    continue;

                }

                let targetFire = null;

                let isPedTarget = false;

                let bestDist = 760;

                for (const v of this.vehicles) {

                    if (v === ft || v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") continue;

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

                    if (Math.hypot(other.x - ft.x, other.y - ft.y) > 620) continue;

                    const d = Math.hypot(other.x - ped.x, other.y - ped.y);

                    if (d < bestDist) {

                        bestDist = d;

                        targetFire = other;

                        isPedTarget = true;

                    }

                }

                if (targetFire && ped.firemanOutTimer < 30.0) {

                    if (bestDist < 128) {

                        ped.angle = Math.atan2(targetFire.y - ped.y, targetFire.x - ped.x);

                        ped.speed = 0;

                        ped.sprayingHose = true;

                        ped.firemanStuckTimer = 0;

                        const nozX = ped.x + Math.cos(ped.angle) * 11;

                        const nozY = ped.y + Math.sin(ped.angle) * 11;

                        const jetSpeed = Math.max(150, Math.min(255, bestDist * 2.5));

                        for (let k = 0; k < 2; k++) {

                            if (Math.random() < 0.88) {

                                const spread = (Math.random() - 0.5) * 0.18;

                                this.particles.push({

                                    x: nozX,

                                    y: nozY,

                                    vx: Math.cos(ped.angle + spread) * jetSpeed,

                                    vy: Math.sin(ped.angle + spread) * jetSpeed,

                                    size: 3.2 + Math.random() * 1.8,

                                    color: Math.random() < 0.40 ? "#bae6fd" : "#38bdf8",

                                    life: 0.34,

                                    maxLife: 0.34

                                });

                            }

                        }

                        if (Math.random() < 0.45) {

                            this.spawnParticle(

                                targetFire.x + (Math.random() - 0.5) * 20,

                                targetFire.y + (Math.random() - 0.5) * 20,

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

                            targetFire.extinguishProgress = (targetFire.extinguishProgress || 0) + dt * 0.55;

                            if (!targetFire.destroyed) {

                                targetFire.chainExplodeTimer = 0;

                                if ((targetFire.burnTimer || 0) > 0) {

                                    targetFire.burnTimer = Math.max(targetFire.burnTimer, 1.5);

                                }

                                if (targetFire.extinguishProgress >= 3.2) {

                                    targetFire.hp = Math.min(targetFire.maxHp, Math.max(targetFire.hp + 48 * dt, 58));

                                    targetFire.burnTimer = 0;

                                    if (!targetFire._vcfdSavedMsg) {

                                        targetFire._vcfdSavedMsg = true;

                                        this.addFloatingText(targetFire.x, targetFire.y - 24, "🚒 VCFD — FIRE EXTINGUISHED!", "#38bdf8");

                                    }

                                }

                            } else if (targetFire.extinguishProgress >= 5.2 && !targetFire.fireExtinguished) {

                                targetFire.fireExtinguished = true;

                                targetFire.burnTimer = 0;

                                this.addFloatingText(targetFire.x, targetFire.y - 24, "🚒 VCFD — FIRE EXTINGUISHED!", "#38bdf8");

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

                            ped.angle = this.steerPedWithObstacleFeelers(ped, targetFire.x, targetFire.y, isPedTarget ? null : targetFire);

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

                    // All fires extinguished — reel in the hose and climb back into the VCFD Fire Engine!

                    ped.sprayingHose = false;

                    ped.speed = 98;

                    ped._boardingVeh = ft;

                    const dFt = Math.hypot(ft.x - ped.x, ft.y - ped.y);

                    const ftBoardDist = Math.max(44, (ft.w || 66) * 0.52 + 12);

                    if (dFt < ftBoardDist || ped.firemanOutTimer > 34.0) {

                        ft.doorOpenTimer = 0.45;

                        ft.deployedFireman = null;

                        ped._boardedVehicle = true;

                        ped.dead = true;

                        continue;

                    }

                    ped.angle = this.steerPedWithObstacleFeelers(ped, ft.x, ft.y, ft);

                    ped.x += Math.cos(ped.angle) * 98 * dt;

                    ped.y += Math.sin(ped.angle) * 98 * dt;

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
                                if (this.hasLineOfSight(ped.x, ped.y, targetEnt.x, targetEnt.y)) {
                                    ped.muzzleTimer = 0.09;
                                    this.fireWeapon(ped.x, ped.y, aimAng + (Math.random() - 0.5) * 0.12, ped.copWeapon || "PISTOL", false, false, "CRIMINAL");
                                }
                            }
                        } else if (dPlayer >= 460) {
                            ped.isAlertedGuard = false;
                        }
                    }
                    continue;
                }
                // Exact Port of 1997 GTA 1 AiCharacterController::UpdateWandering / ChooseWalkWaypoint / ContinueWalkToWaypoint

                // (AiCharacterController.cpp lines 250-365): Pedestrians stay strictly on PAWEMENT / FIELD blocks!

                if (ped.panicTimer > 0) ped.panicTimer = Math.max(0, ped.panicTimer - dt);



                // Opportunistic Vice City street thief: gang members / muggers walking near an abandoned unlocked road car steal it and drive off!
                const isStreetThiefType =
                    ped.g24Type === "g2_mugger" ||
                    ped.g24Type === "gang" ||
                    ped.g24Type === "vc_haitian" ||
                    ped.g24Type === "vc_cuban";
                let pursuingStealCar = false;
                if (isStreetThiefType && (ped.burnTimer || 0) <= 0 && !ped.isLivingProp) {
                    let stealTarget = null;
                    let bestStealDist = 115;
                    for (const v of this.vehicles) {
                        if (
                            !v.destroyed &&
                            v.driver === null &&
                            !v.towedByTruck &&
                            !v.isStaticParked &&
                            !v.isEstateCar &&
                            !v.missionTag &&
                            !v.isPolice &&
                            !v.isEmergency &&
                            (v.abandonedTimer || 0) > 18.0 &&
                            Math.hypot(v.x - p.x, v.y - p.y) > 95
                        ) {
                            const d = Math.hypot(v.x - ped.x, v.y - ped.y);
                            if (d < bestStealDist) {
                                bestStealDist = d;
                                stealTarget = v;
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
                const baseWalkSpd = ped.kind === "COP" ? 38 : (ped.speed || 36);

                const spd = (ped.burnTimer || 0) > 0 ? 105 : (ped.panicTimer > 0 ? 82 : baseWalkSpd);

                const bx = Math.floor(ped.x / TILE_SIZE);

                const by = Math.floor(ped.y / TILE_SIZE);

                const pz = ped.z !== undefined ? ped.z : 2.0;



                ped.waypointTimer = (ped.waypointTimer || 0) + dt;

                const curTx = ped.targetBx !== null && ped.targetBx !== undefined
                    ? (ped.targetBx + 0.5) * TILE_SIZE + (ped.targetOffX || 0)
                    : ped.x;
                const curTy = ped.targetBy !== null && ped.targetBy !== undefined
                    ? (ped.targetBy + 0.5) * TILE_SIZE + (ped.targetOffY || 0)
                    : ped.y;

                const needTarget =

                    ped.targetBx === null ||

                    ped.targetBx === undefined ||

                    ped.waypointTimer > 2.2 ||

                    Math.hypot(curTx - ped.x, curTy - ped.y) < 18;



                if (needTarget) {

                    const reachedTarget = ped.targetBx !== null && ped.targetBx !== undefined && Math.hypot(curTx - ped.x, curTy - ped.y) < 18;

                    const baseX = reachedTarget ? ped.targetBx : bx;

                    const baseY = reachedTarget ? ped.targetBy : by;

                    if (reachedTarget) {
                        ped._avoidBx = -1;
                        ped._avoidBy = -1;
                    }

                    ped.turnSeed = (ped.turnSeed || 1) + 1;

                    // Choose next sidewalk block while avoiding 3D structures, Lummus Park grass, and stopped vehicles
                    const nextStep = this.map.chooseNextSidewalkBlock(

                        baseX,

                        baseY,

                        ped.angle,

                        pz,

                        ped.turnSeed,

                        (ped.panicTimer || 0) > 0,

                        this.vehicles,

                        ped._avoidBx ?? -1,

                        ped._avoidBy ?? -1

                    );

                    ped.targetBx = nextStep.bx;

                    ped.targetBy = nextStep.by;

                    ped.angle = nextStep.angle;

                    ped.waypointTimer = 0;

                    ped.targetOffX = 0;

                    ped.targetOffY = 0;

                    // If a stopped vehicle or structure partially overlaps the center of (targetBx, targetBy),
                    // shift the waypoint laterally (±18..24px) inside the corridor so the pedestrian bypasses it cleanly!
                    const centerTx = (ped.targetBx + 0.5) * TILE_SIZE;
                    const centerTy = (ped.targetBy + 0.5) * TILE_SIZE;
                    if (
                        this.resolveCircleVehicleCollision(centerTx, centerTy, 11, pz, null).hit ||
                        this.map.resolveCircleBuildingCollision(centerTx, centerTy, 11, pz).hit
                    ) {
                        const perpX = -Math.sin(nextStep.angle);
                        const perpY = Math.cos(nextStep.angle);
                        for (const lat of [18, -18, 25, -25]) {
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



                if (ped.targetBx !== null && ped.targetBx !== undefined) {

                    const tx = (ped.targetBx + 0.5) * TILE_SIZE + (ped.targetOffX || 0);

                    const ty = (ped.targetBy + 0.5) * TILE_SIZE + (ped.targetOffY || 0);

                    ped.angle = this.steerPedWithObstacleFeelers(ped, tx, ty, ped._boardingVeh || null);

                }



                ped.x += Math.cos(ped.angle) * spd * dt;

                ped.y += Math.sin(ped.angle) * spd * dt;



                // Keep normal walking civilians strictly on PAWEMENT/FIELD sidewalks so they never wander into road lanes

                const curNav = this.map.getNavigationBlock ? this.map.getNavigationBlock(bx, by, pz) : null;

                const newBx = Math.floor(ped.x / TILE_SIZE);

                const newBy = Math.floor(ped.y / TILE_SIZE);

                if (curNav && (curNav.groundType === GROUND_TYPE.PAWEMENT || curNav.groundType === GROUND_TYPE.FIELD)) {

                    const nextNav = this.map.getNavigationBlock(newBx, newBy, pz);

                    if (nextNav && nextNav.groundType === GROUND_TYPE.ROAD) {

                        ped.x = prevX;

                        ped.y = prevY;

                        ped.angle += Math.PI * 0.75 + (Math.random() - 0.5) * 0.5;

                        ped.targetBx = bx;

                        ped.targetBy = by;

                    }

                } else if (curNav && curNav.groundType === GROUND_TYPE.ROAD) {

                    if (ped.kind === "CIVILIAN" && (ped.panicTimer || 0) <= 0) {

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



            if (ped.kind !== "GATOR" && this.map.isWaterAtPixel && this.map.isWaterAtPixel(ped.x, ped.y)) {

                ped.x = prevX;

                ped.y = prevY;

                ped.angle += Math.PI;

                ped.targetBx = null;

                ped.targetBy = null;

            }



            const pCol = this.map.resolveCircleBuildingCollision(ped.x, ped.y, 8, ped.z || 2.0);

            if (pCol.hit) {

                ped.x = pCol.x;

                ped.y = pCol.y;

                if (ped.kind === "CIVILIAN") {
                    ped._avoidBx = ped.targetBx !== null && ped.targetBx !== undefined
                        ? ped.targetBx
                        : Math.floor((ped.x + Math.cos(ped.angle) * 20) / TILE_SIZE);
                    ped._avoidBy = ped.targetBy !== null && ped.targetBy !== undefined
                        ? ped.targetBy
                        : Math.floor((ped.y + Math.sin(ped.angle) * 20) / TILE_SIZE);
                }

                if (!ped.inCombat) {
                    ped.angle += Math.PI + (Math.random() - 0.5) * 0.8;
                }

                ped.targetBx = null;

                ped.targetBy = null;

                ped.turnSeed = (ped.turnSeed || 1) + 2;

            }

            // Physical collision against parked / stationary vehicles and wrecks
            if ((ped.slideCarTimer || 0) <= 0 && (ped.exitAnimTimer || 0) <= 0) {
                const pedVehRadius = (ped.kind === "FIREMAN" || ped.kind === "MEDIC") ? 4.5 : 7.5;
                const vCol = this.resolveCircleVehicleCollision(ped.x, ped.y, pedVehRadius, ped.z || 2.0, ped._boardingVeh || ped.fireTarget || null);
                if (vCol.hit) {
                    ped.x = vCol.x;
                    ped.y = vCol.y;
                    if (ped.kind === "CIVILIAN" && !ped._boardingVeh) {
                        ped._avoidBx = ped.targetBx !== null && ped.targetBx !== undefined
                            ? ped.targetBx
                            : Math.floor((ped.x + Math.cos(ped.angle) * 20) / TILE_SIZE);
                        ped._avoidBy = ped.targetBy !== null && ped.targetBy !== undefined
                            ? ped.targetBy
                            : Math.floor((ped.y + Math.sin(ped.angle) * 20) / TILE_SIZE);
                        ped.angle += Math.PI + (Math.random() - 0.5) * 0.8;
                        ped.targetBx = null;
                        ped.targetBy = null;
                        ped.turnSeed = (ped.turnSeed || 1) + 3;
                    }
                }
            }

            // Real-displacement anti-stuck watchdog: if any walking pedestrian moved < 7px over 0.50s,
            // mark the tile ahead as blocked, nudge toward the center of the current walkable tile, and pick a clear direction!
            if (!ped.dead && !ped.isLivingProp && !ped.inCombat && ped.kind !== "GATOR" && (ped.healTimer || 0) <= 0 && !ped.sprayingHose && (ped.slideCarTimer || 0) <= 0) {
                ped._stuckCheckTimer = (ped._stuckCheckTimer || 0) + dt;
                if (ped._lastCheckX === undefined) {
                    ped._lastCheckX = ped.x;
                    ped._lastCheckY = ped.y;
                } else if (ped._stuckCheckTimer >= 0.50) {
                    const movedDist = Math.hypot(ped.x - ped._lastCheckX, ped.y - ped._lastCheckY);
                    ped._lastCheckX = ped.x;
                    ped._lastCheckY = ped.y;
                    ped._stuckCheckTimer = 0;
                    if (movedDist < 7.0) {
                        const cbx = Math.floor(ped.x / TILE_SIZE);
                        const cby = Math.floor(ped.y / TILE_SIZE);
                        ped._avoidBx = ped.targetBx !== null && ped.targetBx !== undefined
                            ? ped.targetBx
                            : Math.floor((ped.x + Math.cos(ped.angle) * 22) / TILE_SIZE);
                        ped._avoidBy = ped.targetBy !== null && ped.targetBy !== undefined
                            ? ped.targetBy
                            : Math.floor((ped.y + Math.sin(ped.angle) * 22) / TILE_SIZE);
                        ped.x += ((cbx + 0.5) * TILE_SIZE - ped.x) * 0.18;
                        ped.y += ((cby + 0.5) * TILE_SIZE - ped.y) * 0.18;
                        ped.angle += Math.PI * 0.8 + (Math.random() - 0.5) * 0.7;
                        ped.targetBx = null;
                        ped.targetBy = null;
                        ped.waypointTimer = 0;
                        ped.turnSeed = (ped.turnSeed || 1) + 3;
                    }
                }
            }

            ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);

        }

        for (let i = this.peds.length - 1; i >= 0; i--) {
            if (this.peds[i]._boardedVehicle) {
                this.peds.splice(i, 1);
            }
        }



        // 6B. Pedestrian-to-Pedestrian Mutual Separation & Reciprocal Collision Avoidance (RVO)

        // Eliminates conga lines, stacking, clumping, and ghost pass-throughs

        const nearPeds = [];

        const pCamX = this.player.x, pCamY = this.player.y;

        for (let i = 0; i < this.peds.length; i++) {

            const p = this.peds[i];

            if (!p.dead && Math.abs(p.x - pCamX) < 800 && Math.abs(p.y - pCamY) < 600) {

                nearPeds.push(p);

            }

        }

        for (let i = 0; i < nearPeds.length; i++) {

            const p1 = nearPeds[i];

            for (let j = i + 1; j < nearPeds.length; j++) {

                const p2 = nearPeds[j];

                const dx = p1.x - p2.x;

                const dy = p1.y - p2.y;

                const dist2 = dx * dx + dy * dy;

                const minDist = 18; // 18px separation diameter

                if (dist2 < minDist * minDist && dist2 > 0.001) {

                    const dist = Math.sqrt(dist2);

                    const overlap = (minDist - dist) * 0.5;

                    const nx = dx / dist;

                    const ny = dy / dist;

                    p1.x += nx * overlap;

                    p1.y += ny * overlap;

                    p2.x -= nx * overlap;

                    p2.y -= ny * overlap;



                    // If pedestrians are heading towards each other, step slightly to their right (reciprocal detour)

                    const dot = Math.cos(p1.angle) * Math.cos(p2.angle) + Math.sin(p1.angle) * Math.sin(p2.angle);

                    if (dot < -0.3) {

                        const sideStep = 14 * dt;

                        p1.x += -Math.sin(p1.angle) * sideStep;

                        p1.y += Math.cos(p1.angle) * sideStep;

                        p2.x += -Math.sin(p2.angle) * sideStep;

                        p2.y += Math.cos(p2.angle) * sideStep;

                    }

                }

            }

        }



        // 7. VCPD Police Spawner, Roadblocks (Wanted >= 3) & Wanted Decay

        let nearestCopDist = 9999;

        let activeCopCars = 0;

        let activeFootCopsNear = 0;

        for (const v of this.vehicles) {

            if (v.isPolice && !v.destroyed && v.driver === "AI_COP") {

                activeCopCars++;

                const d = Math.hypot(v.x - p.x, v.y - p.y);

                if (d < nearestCopDist) nearestCopDist = d;

            }

        }

        for (const ped of this.peds) {

            if (!ped.dead && ped.kind === "COP") {

                const d = Math.hypot(ped.x - p.x, ped.y - p.y);

                if (d < nearestCopDist) nearestCopDist = d;

                if (d < 850) activeFootCopsNear++;

            }

        }



        if (this.roadblockCooldown > 0) this.roadblockCooldown -= dt;



        const maxRoomWanted = Math.max(

            this.wantedLevel || 0,

            (!isClientWorldSync && this.net && typeof this.net.getMaxWantedLevel === "function")

                ? this.net.getMaxWantedLevel()

                : 0

        );



        if (!isClientWorldSync && maxRoomWanted > 0) {

            const spawnTarget = this.getNearestWantedTarget(p.x, p.y) || { x: p.x, y: p.y, z: p.z || 2.0, angle: p.angle || 0, wantedLevel: maxRoomWanted };

            const tWanted = spawnTarget.wantedLevel || maxRoomWanted;

            this.copSpawnTimer += dt;

            const maxCops = Math.min(5, Math.ceil(tWanted * 0.85) + (this.net && this.net.remotePlayers && this.net.remotePlayers.size > 0 ? 1 : 0));

            const totalActiveUnits = activeCopCars + activeFootCopsNear;

            const spawnInterval = tWanted <= 1 ? 11.0 : (tWanted === 2 ? 9.0 : (tWanted === 3 ? 7.5 : 6.0));

            if (totalActiveUnits < maxCops && this.copSpawnTimer > spawnInterval) {

                this.copSpawnTimer = 0;

                const baseBx = Math.floor(spawnTarget.x / TILE_SIZE);

                const baseBy = Math.floor(spawnTarget.y / TILE_SIZE);

                const pz = spawnTarget.z || 2.0;

                for (let attempt = 0; attempt < 28; attempt++) {

                    const ang = Math.random() * Math.PI * 2;

                    const distB = 11.5 + Math.random() * 4.5; // 736..1024px away so police arrive progressively from a distance

                    const bx = Math.floor(baseBx + Math.cos(ang) * distB);

                    const by = Math.floor(baseBy + Math.sin(ang) * distB);

                    if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;

                    const navBlk = this.map.getNavigationBlock(bx, by, pz);

                    if (navBlk && navBlk.groundType === GROUND_TYPE.ROAD) {

                        const sx = (bx + 0.5) * TILE_SIZE;

                        const sy = (by + 0.5) * TILE_SIZE;

                        if (Math.hypot(sx - spawnTarget.x, sy - spawnTarget.y) < 680) continue;

                        const toPlayerAng = Math.atan2(spawnTarget.y - sy, spawnTarget.x - sx);

                        const roadAng = typeof this.map.getAlignedRoadAngle === "function"

                            ? this.map.getAlignedRoadAngle(bx, by, toPlayerAng, pz)

                            : toPlayerAng;

                        const specKey = tWanted >= 4 ? "SWAT_ENFORCER" : "VCPD_CRUISER";

                        const copCar = new Vehicle(`cop_${Date.now()}_${attempt}`, specKey, sx, sy, roadAng);

                        copCar.z = this.map.getHeightAtPixel(sx, sy, 4.0);

                        copCar.driver = "AI_COP";

                        copCar.sirenActive = true;

                        copCar.speed = 110;

                        copCar.vx = Math.cos(roadAng) * 110;

                        copCar.vy = Math.sin(roadAng) * 110;

                        this.vehicles.push(copCar);

                        break;

                    }

                }

            }



            // Spawn GTA 1 Police Roadblock at Wanted Level >= 3

            if (tWanted >= 3 && this.roadblockCooldown <= 0 && activeCopCars < 5) {

                this.roadblockCooldown = 28;

                const rbX = spawnTarget.x + Math.cos(spawnTarget.angle || 0) * 480;

                const rbY = spawnTarget.y + Math.sin(spawnTarget.angle || 0) * 480;

                const rbBx = Math.floor(rbX / TILE_SIZE);

                const rbBy = Math.floor(rbY / TILE_SIZE);

                if (this.map.isRoadAtPixel(rbX, rbY) && !(this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(rbBx, rbBy))) {

                    const rbSpec = tWanted >= 4 ? "SWAT_ENFORCER" : "VCPD_CRUISER";

                    const rbCar = new Vehicle(`rb_${Date.now()}`, rbSpec, rbX, rbY, (spawnTarget.angle || 0) + Math.PI * 0.5);

                    this.vehicles.push(rbCar);

                    const perpAng = (spawnTarget.angle || 0) + Math.PI * 0.5;

                    for (let side of [-1, 1]) {

                        this.peds.push(new Pedestrian({

                            id: `rb_cop_${Date.now()}_${side}`,

                            x: rbX - Math.cos(spawnTarget.angle || 0) * 28 + Math.cos(perpAng) * side * 18,

                            y: rbY - Math.sin(spawnTarget.angle || 0) * 28 + Math.sin(perpAng) * side * 18,

                            angle: (spawnTarget.angle || 0) + Math.PI,

                            speed: 98,

                            kind: "COP",

                            g24Type: tWanted >= 4 ? "g2_swat" : "police",

                            isSwat: tWanted >= 4,

                            shirtColor: tWanted >= 4 ? "#1e293b" : "#1e3a8a",

                            hp: 115,

                            maxHp: 115,

                            copWeapon: tWanted >= 4 ? "SHOTGUN" : "UZI",

                            dead: false,

                            panicTimer: 0

                        }));

                    }

                    this.addFloatingText(rbX, rbY - 26, "🚧 VCPD ROADBLOCK!", "#38bdf8");

                }

            }

        }



        if (this.wantedLevel > 0) {

            // Only decay Wanted Level when completely out of police sight (>= 720px) and not actively shooting/fighting!

            const decayThreshold = this.wantedLevel === 1 ? 28 : 38;

            if (nearestCopDist < 720 || (p.playerCombatTimer || 0) > 0) {

                this.wantedDecayTimer = 0;

            } else {

                this.wantedDecayTimer += dt;

                if (this.wantedDecayTimer >= decayThreshold) {

                    this.setWantedLevel(this.wantedLevel - 1);

                }

            }

        }



        // 7B. 911 Emergency Ambulance Dispatch: Automatically dispatches a MEDIC_AMBULANCE when casualties occur nearby!

        if (!isClientWorldSync) {

            if (this.medicDispatchCooldown > 0) {
                this.medicDispatchCooldown = Math.max(0, this.medicDispatchCooldown - dt);
            }

            let casualtyNearPlayer = null;

            let bestCasDist = 680;

            for (const ped of this.peds) {

                if (!ped.dead || ped.revived || ped._boardedVehicle || ped.unreachableForMedic || ped.deathKind === "DROWNED" || (ped.deadTimer || 0) < 6.0) continue;

                if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(ped.x, ped.y)) continue;

                const d = Math.hypot(ped.x - p.x, ped.y - p.y);

                if (d < bestCasDist) {

                    bestCasDist = d;

                    casualtyNearPlayer = ped;

                }

            }

            if (casualtyNearPlayer && (this.medicDispatchCooldown || 0) <= 0) {

                let medicNearCasualty = false;

                let farMedicCar = null;

                let totalMedics = 0;

                for (const v of this.vehicles) {

                    if (v.specKey === "MEDIC_AMBULANCE" && !v.destroyed && v.driver === "AI_EMERGENCY") {

                        totalMedics++;

                        const dCas = Math.hypot(v.x - casualtyNearPlayer.x, v.y - casualtyNearPlayer.y);

                        if (v.aiState === "EMERGENCY_MEDIC" || v.deployedMedic || dCas < 980) {

                            medicNearCasualty = true;

                        } else if (Math.hypot(v.x - p.x, v.y - p.y) > 1250) {

                            farMedicCar = v;

                        }

                    }

                }

                if (!medicNearCasualty) {

                    this.medicDispatchTimer = (this.medicDispatchTimer || 0) + dt;

                    if (this.medicDispatchTimer > 14.0) {

                        this.medicDispatchTimer = 10.0; // if no road spawn point is found, retry ~4s later

                        const baseBx = Math.floor(casualtyNearPlayer.x / TILE_SIZE);

                        const baseBy = Math.floor(casualtyNearPlayer.y / TILE_SIZE);

                        const pz = casualtyNearPlayer.z || 2.0;

                        for (let attempt = 0; attempt < 30; attempt++) {

                            const ang = Math.random() * Math.PI * 2;

                            const distB = 11.0 + Math.random() * 6.0;

                            const bx = Math.floor(baseBx + Math.cos(ang) * distB);

                            const by = Math.floor(baseBy + Math.sin(ang) * distB);

                            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;

                            const navBlk = this.map.getNavigationBlock(bx, by, pz);

                            if (navBlk && navBlk.groundType === GROUND_TYPE.ROAD) {

                                const sx = (bx + 0.5) * TILE_SIZE;

                                const sy = (by + 0.5) * TILE_SIZE;

                                if (Math.hypot(sx - p.x, sy - p.y) < 640) continue;

                                const toCasAng = Math.atan2(casualtyNearPlayer.y - sy, casualtyNearPlayer.x - sx);

                                const roadAng = typeof this.map.getAlignedRoadAngle === "function"

                                    ? this.map.getAlignedRoadAngle(bx, by, toCasAng, pz)

                                    : toCasAng;

                                const sz = this.map.getHeightAtPixel(sx, sy, 4.0);

                                if (farMedicCar) {

                                    const reuseCar = farMedicCar;

                                    reuseCar.x = sx;

                                    reuseCar.y = sy;

                                    reuseCar.z = sz;

                                    reuseCar.angle = roadAng;

                                    reuseCar.speed = 95;

                                    reuseCar.vx = Math.cos(roadAng) * 95;

                                    reuseCar.vy = Math.sin(roadAng) * 95;

                                    reuseCar.sirenActive = true;

                                    reuseCar.aiStuckTimer = 0;

                                    reuseCar.aiChosenDir = null;

                                    reuseCar.approachBestDist = undefined;

                                    reuseCar.approachNoProgress = 0;

                                    this.medicDispatchTimer = 0;

                                    this.medicDispatchCooldown = 22.0;

                                } else if (totalMedics < 3) {

                                    const medCar = new Vehicle(`medic_${Date.now()}_${attempt}`, "MEDIC_AMBULANCE", sx, sy, roadAng);

                                    medCar.z = sz;

                                    medCar.driver = "AI_EMERGENCY";

                                    medCar.sirenActive = true;

                                    medCar.speed = 95;

                                    medCar.vx = Math.cos(roadAng) * 95;

                                    medCar.vy = Math.sin(roadAng) * 95;

                                    this.vehicles.push(medCar);

                                    this.medicDispatchTimer = 0;

                                    this.medicDispatchCooldown = 22.0;

                                }

                                break;

                            }

                        }

                    }

                } else {

                    this.medicDispatchTimer = 0;

                }

            } else {

                this.medicDispatchTimer = 0;

            }

            // 7b-2. 911 Fire Department Dispatch (FIRE_TRUCK) for Burning Cars & Unextinguished Burning Wrecks
            this.fireDispatchCooldown = Math.max(0, (this.fireDispatchCooldown || 0) - dt);
            let burningVehNearPlayer = null;
            for (const v of this.vehicles) {
                if (v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") continue;
                if (this.map.isWaterAtPixel && this.map.isWaterAtPixel(v.x, v.y)) continue;
                const isLiveBurning = !v.destroyed && ((v.burnTimer || 0) > 0 || v.hp <= 50);
                const isFreshBurningWreck = v.destroyed && !v.fireExtinguished && (v.abandonedTimer || 0) >= 3.0;
                if ((isLiveBurning || isFreshBurningWreck) && Math.hypot(v.x - p.x, v.y - p.y) < 780) {
                    burningVehNearPlayer = v;
                    break;
                }
            }
            if (burningVehNearPlayer && this.fireDispatchCooldown <= 0) {
                let fireTruckNearTarget = false;
                let farFireTruck = null;
                let totalFireTrucks = 0;
                for (const v of this.vehicles) {
                    if (!v.destroyed && v.specKey === "FIRE_TRUCK" && v.driver === "AI_EMERGENCY") {
                        totalFireTrucks++;
                        const dFire = Math.hypot(v.x - burningVehNearPlayer.x, v.y - burningVehNearPlayer.y);
                        if (dFire < 980) {
                            fireTruckNearTarget = true;
                        } else if (Math.hypot(v.x - p.x, v.y - p.y) > 820) {
                            farFireTruck = v;
                        }
                    }
                }
                if (!fireTruckNearTarget) {
                    this.fireDispatchTimer = (this.fireDispatchTimer || 0) + dt;
                    if (this.fireDispatchTimer > 12.0) {
                        this.fireDispatchTimer = 8.0; // retry ~4s later if road candidate busy
                        const baseBx = Math.floor(burningVehNearPlayer.x / TILE_SIZE);
                        const baseBy = Math.floor(burningVehNearPlayer.y / TILE_SIZE);
                        const fz = burningVehNearPlayer.z || 2.0;
                        for (let attempt = 0; attempt < 30; attempt++) {
                            const ang = Math.random() * Math.PI * 2;
                            const distB = 12.0 + Math.random() * 6.0;
                            const bx = Math.floor(baseBx + Math.cos(ang) * distB);
                            const by = Math.floor(baseBy + Math.sin(ang) * distB);
                            if (this.map.isRestrictedNoTrafficZone && this.map.isRestrictedNoTrafficZone(bx, by)) continue;
                            const navBlk = this.map.getNavigationBlock(bx, by, fz);
                            if (navBlk && navBlk.groundType === GROUND_TYPE.ROAD) {
                                const sx = (bx + 0.5) * TILE_SIZE;
                                const sy = (by + 0.5) * TILE_SIZE;
                                if (Math.hypot(sx - p.x, sy - p.y) < 650) continue;
                                const toFireAng = Math.atan2(burningVehNearPlayer.y - sy, burningVehNearPlayer.x - sx);
                                const roadAng = typeof this.map.getAlignedRoadAngle === "function"
                                    ? this.map.getAlignedRoadAngle(bx, by, toFireAng, fz)
                                    : toFireAng;
                                const sz = this.map.getHeightAtPixel(sx, sy, 4.0);
                                if (farFireTruck) {
                                    farFireTruck.x = sx;
                                    farFireTruck.y = sy;
                                    farFireTruck.z = sz;
                                    farFireTruck.angle = roadAng;
                                    farFireTruck.speed = 95;
                                    farFireTruck.vx = Math.cos(roadAng) * 95;
                                    farFireTruck.vy = Math.sin(roadAng) * 95;
                                    farFireTruck.sirenActive = true;
                                    farFireTruck.aiStuckTimer = 0;
                                    farFireTruck.aiChosenDir = null;
                                    farFireTruck.approachBestDist = undefined;
                                    farFireTruck.approachNoProgress = 0;
                                    this.fireDispatchTimer = 0;
                                    this.fireDispatchCooldown = 36.0;
                                } else if (totalFireTrucks < 3) {
                                    const fireCar = new Vehicle(`vcfd_${Date.now()}_${attempt}`, "FIRE_TRUCK", sx, sy, roadAng);
                                    fireCar.z = sz;
                                    fireCar.driver = "AI_EMERGENCY";
                                    fireCar.sirenActive = true;
                                    fireCar.speed = 95;
                                    fireCar.vx = Math.cos(roadAng) * 95;
                                    fireCar.vy = Math.sin(roadAng) * 95;
                                    this.vehicles.push(fireCar);
                                    this.fireDispatchTimer = 0;
                                    this.fireDispatchCooldown = 36.0;
                                }
                                break;
                            }
                        }
                    }
                } else {
                    this.fireDispatchTimer = 0;
                }
            } else {
                this.fireDispatchTimer = 0;
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

            pr.rangeLeft -= Math.hypot(stepX, stepY);



            let hitSomething = false;



            // Hit building? Exact 2D DDA grid raycast (GameMapManager::TraceSegment2D)

            const traceRes = this.map.traceSegment2D(prevX, prevY, pr.x, pr.y, p.z || 2.0);

            if (traceRes.hit) {

                pr.x = traceRes.pointX;

                pr.y = traceRes.pointY;

                hitSomething = true;

                if (!pr.isFlame && !pr.isRocket && Math.hypot(pr.x - p.x, pr.y - p.y) < 480) {

                    this.audio.playRicochet();

                }

            } else {

                const bCol = this.map.resolveCircleBuildingCollision(pr.x, pr.y, 3, p.z || 2.0);

                if (bCol.hit) {

                    hitSomething = true;

                    if (!pr.isFlame && !pr.isRocket && Math.hypot(pr.x - p.x, pr.y - p.y) < 480) {

                        this.audio.playRicochet();

                    }

                }

            }



            // Hit smashable wooden crate?

            if (!hitSomething && this.map.crates) {

                for (const cr of this.map.crates) {

                    if (!cr.smashed && Math.hypot(cr.x - pr.x, cr.y - pr.y) < 18) {

                        this.smashCrate(cr);

                        hitSomething = true;

                        break;

                    }

                }

            }



            // Hit vehicle?

            if (!hitSomething) {

                const distTraveled = (pr.maxRange || 320) - (pr.rangeLeft || 0);

                for (const v of this.vehicles) {

                    if (pr.fromPlayer && p.inVehicle === v) continue;

                    if (!pr.fromPlayer && pr.npcFaction === "COP" && v.isPolice && p.inVehicle !== v) continue;

                    if (!pr.fromPlayer && pr.npcFaction === "CRIMINAL" && v.driver === "AI_CRIMINAL") continue;

                    if (!pr.fromPlayer && !pr.npcFaction && v.isPolice && p.inVehicle !== v) continue;

                    // Do not let a vehicle immediately next to an NPC shooter swallow their bullet on spawn,
                    // nor swallow a bullet that is hitting the on-foot player right next to the car
                    if (!pr.fromPlayer && p.inVehicle !== v && (distTraveled < 44 || (!p.inVehicle && Math.hypot(p.x - pr.x, p.y - pr.y) < 16))) continue;

                    if (Math.hypot(v.x - pr.x, v.y - pr.y) < 24) {

                        const vehDmg = pr.isRocket

                            ? pr.damage * 1.35

                            : (pr.isFlame ? pr.damage * 0.85 : (pr.fromPlayer ? pr.damage * 0.34 : pr.damage * 0.42));

                        if (pr.fromPlayer) {

                            v.damagedByPlayer = true;

                            if (v.isPolice && !pr.fromJason && Math.random() < 0.75) {

                                this.setWantedLevel(Math.max(this.wantedLevel, 1));

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

                        if (pr.fromPlayer && !v.destroyed) {

                            this.cash += 10 * this.multiplier;

                        }

                        this.spawnParticle(pr.x, pr.y, pr.isFlame ? "FIRE" : "SPARK");

                        if (!pr.isFlame && !pr.isRocket && Math.hypot(pr.x - p.x, pr.y - p.y) < 480) {

                            this.audio.playRicochet();

                        }

                        hitSomething = true;

                        break;

                    }

                }

            }



            // Hit pedestrian?

            if (!hitSomething && (pr.fromPlayer || pr.npcFaction === "COP" || pr.npcFaction === "CRIMINAL")) {

                for (const ped of this.peds) {

                    if (ped.dead) continue;

                    // Jason's cover fire never hits innocent civilians or monks!

                    if (pr.fromJason && ped.kind !== "COP" && ped.kind !== "HOSTILE" && ped.kind !== "CRIMINAL") continue;

                    // Police bullets only hit armed criminals on foot (never friendly fire other cops or civilians)

                    if (pr.npcFaction === "COP" && ped.kind !== "CRIMINAL") continue;

                    // Criminal bullets hit VCPD officers (and occasionally stray-hit nearby panicking civilians)

                    if (pr.npcFaction === "CRIMINAL" && ped.kind !== "COP") continue;

                    if (Math.hypot(ped.x - pr.x, ped.y - pr.y) < 13) {

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

                            break;

                        }

                        // Cop-vs-bandit crossfire is deliberately less lethal so street shootouts last long enough to be watched
                        const npcVsNpcMul = (pr.npcFaction === "COP" && ped.kind === "CRIMINAL") ? 0.36 : 0.62;

                        const pedDmg = pr.fromPlayer ? pr.damage : pr.damage * npcVsNpcMul;

                        ped.hp -= pedDmg;

                        if (pr.fromPlayer && ped.kind === "CRIMINAL") {

                            ped.attackedByPlayer = true;

                        }

                        this.spawnParticle(pr.x, pr.y, "BLOOD");

                        if (pr.fromPlayer && ped.kind === "COP" && Math.random() < 0.80) {

                            this.setWantedLevel(Math.max(this.wantedLevel, 2));

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

                            this.killPed(ped, Boolean(pr.fromPlayer));

                        }

                        hitSomething = true;

                        break;

                    }

                }

            }



            // Hit open-air street/beach animation participants?

            if (!hitSomething && pr.fromPlayer) {

                if (this.checkAndWipeoutLivingEvents(pr.x, pr.y, 20, true, false)) {

                    this.spawnParticle(pr.x, pr.y, "BLOOD");

                    hitSomething = true;

                }

            }

            // Hit remote online player or Rival Bot?

            if (!hitSomething && pr.fromPlayer && this.net && this.net.remotePlayers.size > 0) {

                for (const rp of this.net.remotePlayers.values()) {

                    if (rp.dead) continue;

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

            if (!hitSomething && !pr.fromPlayer && !p.inVehicle) {

                const canHitPlayer =

                    Boolean(pr.fromRemoteId) ||

                    (pr.npcFaction === "COP" && (this.wantedLevel > 0 || this.peds.some(pd => !pd.dead && pd.carjackedCop))) ||

                    (pr.npcFaction === "CRIMINAL" && (this.wantedLevel > 0 || this.peds.some(pd => !pd.dead && (pd.isAlertedGuard || (pd.kind === "CRIMINAL" && (pd.provokedByPlayer || pd.missionTag === "MISSION_ENEMY")))))) ||

                    (!pr.npcFaction && this.wantedLevel > 0);

                if (canHitPlayer && Math.hypot(p.x - pr.x, p.y - pr.y) < 15) {

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



        // 9. Particles & Floating Texts Update (with GTA 2 gibs.cpp resting arc settlement!)

        for (let i = this.particles.length - 1; i >= 0; i--) {

            const pt = this.particles[i];

            if (!pt.isRestingGib) {

                pt.x += pt.vx * dt;

                pt.y += pt.vy * dt;

            }

            pt.life -= dt;

            if (pt.life <= 0) {

                if (pt.kind === "GIB_ARC" && !pt.isRestingGib) {

                    pt.isRestingGib = true;

                    pt.vx = 0;

                    pt.vy = 0;

                    pt.life = 18.0;

                    pt.maxLife = 18.0;

                } else {

                    this.particles.splice(i, 1);

                }

            }

        }



        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {

            const ft = this.floatingTexts[i];

            ft.y -= 28 * dt;

            ft.life -= dt;

            if (ft.life <= 0) this.floatingTexts.splice(i, 1);

        }



        // Progressive fade-out & cleanup of tire/surface tracks (grass, sand, mud, road)

        for (let i = this.skidmarks.length - 1; i >= 0; i--) {

            const sk = this.skidmarks[i];

            if (typeof sk.life === "number") {

                sk.life -= dt;

                if (sk.life <= 0) {

                    this.skidmarks.splice(i, 1);

                }

            }

        }



        // 10. Official Vice City Landmarks ("Lieux Officiels") Discovery & Perks

        if (Array.isArray(this.map.landmarks)) {

            for (const lm of this.map.landmarks) {

                if (lm.perkCooldown > 0) {

                    lm.perkCooldown = Math.max(0, lm.perkCooldown - dt);

                }

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

        const newDist = this.map.getDistrictName(p.x, p.y);

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



        if (!p.dead && this.map.prisonCompound) {

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



        if (!p.dead && this.map.airportCompound) {

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

        if (!p.dead && this.map.seraCompound) {
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

        this.missions.update(dt);

        if (this.net) {

            this.net.update(dt);

        }



        // 12A. Surface-aware Footsteps for Lucia on foot (Pavement, Vice Beach Sand, Park Grass, Water)

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

        let nearestSirenDist = this.wantedLevel > 0 ? nearestCopDist : 9999;

        let nearestSirenType = "POLICE";

        for (let i = 0; i < this.vehicles.length; i++) {

            const v = this.vehicles[i];

            if (v.destroyed) continue;

            const dx = v.x - p.x;

            const dy = v.y - p.y;

            const d = Math.hypot(dx, dy);

            if (v.sirenActive && v.driver !== "AI_TOW" && d < nearestSirenDist) {

                nearestSirenDist = d;

                nearestSirenType = v.specKey === "MEDIC_AMBULANCE"

                    ? "MEDIC"

                    : (v.specKey === "FIRE_TRUCK" ? "FIRE" : "POLICE");

            }

            if (v === p.inVehicle || !v.driver) continue;

            if (v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") continue;

            const vSpd = Math.abs(v.speed || 0);

            if (vSpd < 10) continue;

            if (d < nearestTrafficDist && d > 1) {

                nearestTrafficDist = d;

                nearestTrafficSpeed = vSpd;

                trafficIsMoto = Boolean(v.isMotorcycle);

                // Radial velocity toward player for realistic Doppler pitch shift

                const radialVel = -((v.vx || 0) * (dx / d) + (v.vy || 0) * (dy / d));

                trafficDoppler = 1.0 + Math.max(-0.22, Math.min(0.24, radialVel / 650));

            }

        }



        // Compute proximity to Atlantic Ocean / Biscayne Bay / Lake Leonida water tiles

        let waterProximity = 0;

        const pc = Math.max(4, Math.min(MAP_COLS - 5, Math.floor(p.x / 64)));

        const pr = Math.max(4, Math.min(MAP_ROWS - 5, Math.floor(p.y / 64)));

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



        const pVeh = p.inVehicle;

        const playerThrottle = pVeh

            ? ((this.input.up || (this.input.joyActive && this.input.joyMag > 0.15)) ? 1 : (this.input.down ? -1 : 0))

            : 0;

        const playerSirenType = pVeh

            ? (pVeh.specKey === "MEDIC_AMBULANCE" ? "MEDIC" : (pVeh.specKey === "FIRE_TRUCK" ? "FIRE" : "POLICE"))

            : nearestSirenType;



        this.audio.update(dt, {

            inVehicle: Boolean(pVeh),

            vehicleSpeed: pVeh ? pVeh.speed : 0,

            vehicleSpecKey: pVeh ? pVeh.specKey : null,

            vehicleMaxSpeed: pVeh ? pVeh.maxSpeed : 420,

            vehicleThrottle: playerThrottle,

            vehicleDrifting: Boolean(pVeh && pVeh.drifting),

            playerSirenActive: Boolean(pVeh && pVeh.sirenActive),

            wantedLevel: this.wantedLevel,

            nearestCopDist: nearestCopDist,

            nearestSirenDist,

            nearestSirenType: (pVeh && pVeh.sirenActive) ? playerSirenType : nearestSirenType,

            nearestTrafficDist,

            nearestTrafficSpeed,

            trafficDoppler,

            trafficIsMoto,

            waterProximity,

            nightFactor: this.renderer ? (this.renderer.nightFactor || 0) : 0

        });

    }



    updateLivingEventsRespawn(dt) {
        if (!this.map || !this.player) return;
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
                    it.wipeoutTimer = Math.max(0, wt - dt);
                }
                if (uwt > 0) {
                    it.umbWipeoutTimer = Math.max(0, uwt - dt);
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
        tickArray(this.map.muscleBeachGyms);
        tickArray(this.map.wildernessCamps);
        tickArray(this.map.golfGreens);
        if (this.map.industrialAndParkDetails) {
            tickArray(this.map.industrialAndParkDetails.bikerRallies);
        }
    }

    checkAndWipeoutLivingEvents(hitX, hitY, hitRad = 28, byPlayer = true, isVehicleImpact = false, isNonLethal = false) {
        if (!this.map) return false;
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
                this.score += 25 * this.multiplier;
                this.updateHud();
                this.addFloatingText(ux, uy - 18, "⛱️ PARASOL SMASHED!", "#38bdf8");
            }
        };

        const spawnScenePeds = (scene, members, labelText, requireDirectHit = false) => {
            scene.wipeoutTimer = 40.0;
            triggeredAny = true;
            const bz = scene.z || this.map.getHeightAtPixel(scene.x, scene.y, 4.0);
            let killedCount = 0;
            for (let i = 0; i < members.length; i++) {
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
                    turnSeed: i + 17
                });
                this.peds.push(ped);
                const d = Math.hypot(m.x - hitX, m.y - hitY);
                if (d <= hitRad + 18 || (!requireDirectHit && i === 0 && killedCount === 0)) {
                    if (isNonLethal) {
                        ped.stunnedTimer = 1.65;
                        ped.panicTimer = 6.5;
                        ped.x += Math.cos(awayAng) * 14;
                        ped.y += Math.sin(awayAng) * 14;
                    } else {
                        this.killPed(ped, byPlayer);
                    }
                    killedCount++;
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
            for (let i = 0; i < this.map.viceStreetDetails.length; i++) {
                const vd = this.map.viceStreetDetails[i];
                if (vd.kind !== "CAFE_TABLE" || (vd.wipeoutTimer || 0) > 0) continue;
                if (Math.abs(vd.x - hitX) > umbCull || Math.abs(vd.y - hitY) > umbCull) continue;
                if (Math.hypot(vd.x - hitX, vd.y - hitY) < hitRad + 16) {
                    vd.wipeoutTimer = 45.0;
                    vd.knockAng = Math.atan2(vd.y - hitY, vd.x - hitX);
                    smashParasolFX(vd.x, vd.y, vd.knockAng);
                }
            }
        }

        // 1. Street Events (Wynwood Breakdance Cyphers & Ocean Drive Livestreamers)
        if (Array.isArray(this.map.streetEvents)) {
            for (let i = 0; i < this.map.streetEvents.length; i++) {
                const ev = this.map.streetEvents[i];
                if ((ev.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(ev.x - hitX, ev.y - hitY) < hitRad + 26) {
                    if (ev.kind === "WYNWOOD_CYPHER") {
                        spawnScenePeds(ev, [
                            { ped: "vc_cuban", x: ev.x, y: ev.y + 1 },
                            { ped: "vc_haitian", x: ev.x, y: ev.y - 26 },
                            { ped: "g2_civ_aqua", x: ev.x - 20, y: ev.y + 4 },
                            { ped: "bikini_pink", x: ev.x + 20, y: ev.y + 4 }
                        ], "💥 CYPHER CRASHED!");
                    } else {
                        spawnScenePeds(ev, [
                            { ped: "bikini_pink", x: ev.x + 6, y: ev.y },
                            { ped: "vc_tourist", x: ev.x - 19, y: ev.y },
                            { ped: "vc_crockett", x: ev.x + 4, y: ev.y - 14 }
                        ], "📱 LIVESTREAM PHOTOBOMBED!");
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
                if (Math.hypot(vc.x - hitX, vc.y - hitY) < hitRad + 28) {
                    spawnScenePeds(vc, [
                        { ped: vc.p0 || "bikini_pink", x: vc.x - 11, y: vc.y - 21 },
                        { ped: vc.p1 || "bikini_yellow", x: vc.x + 11, y: vc.y - 19 },
                        { ped: vc.p2 || "bikini_cyan", x: vc.x - 11, y: vc.y + 20 },
                        { ped: vc.p3 || "surfer_guy", x: vc.x + 11, y: vc.y + 22 }
                    ], "🏐 VOLLEYBALL MATCH CRASHED!");
                }
            }
        }

        // 4. Beach Aerobics & Boombox Dance Parties
        if (Array.isArray(this.map.beachParties)) {
            const dancerPeds = ["bikini_pink", "bikini_cyan", "bikini_yellow", "surfer_guy", "bikini_white"];
            for (let i = 0; i < this.map.beachParties.length; i++) {
                const bp = this.map.beachParties[i];
                if ((bp.wipeoutTimer || 0) > 0) continue;
                if (Math.hypot(bp.x - hitX, bp.y - hitY) < hitRad + 28) {
                    const members = [{ ped: "bikini_red", x: bp.x - 4, y: bp.y }];
                    for (let di = 0; di < 4; di++) {
                        const row = (di % 2) === 0 ? -11 : 11;
                        const col = di < 2 ? 12 : 24;
                        members.push({ ped: dancerPeds[(di + i) % dancerPeds.length], x: bp.x + col, y: bp.y + row });
                    }
                    spawnScenePeds(bp, members, "📻 BEACH PARTY CRASHED!");
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

        // 7. Outlaw Biker Gang Chopper Rallies
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

            lblEl.textContent = String(sender).toUpperCase().includes("LUCIA") ? "LUCIA" : "JASON";

        }

        if (urgent) box.classList.add("urgent");

        else box.classList.remove("urgent");

        this._lastPagerSpeaker = sender;

        this.renderPortraits(sender);

    }



    updateHud() {

        const p = this.player;

        this.renderPortraits(this._lastPagerSpeaker || "JASON");



        // Health & Armor bars

        const hBar = document.getElementById("health-bar");

        const aBar = document.getElementById("armor-bar");

        if (hBar) hBar.style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;

        if (aBar) aBar.style.width = `${Math.max(0, (p.armor / p.maxArmor) * 100)}%`;



        // Weapon & Ammo

        const wEl = document.getElementById("weapon-display");

        if (wEl) {

            const spec = WEAPON_SPECS[p.weapon];

            const ammoStr = p.ammo[p.weapon] === Infinity ? "∞" : p.ammo[p.weapon];

            wEl.textContent = `${spec.name} [${ammoStr}]`;

        }



        // Ankle Monitor Badge

        const ankleBadge = document.getElementById("ankle-status-badge");

        const ankleLed = document.getElementById("ankle-led");

        if (ankleBadge && ankleLed) {

            if (p.ankleScrambled) {

                ankleBadge.textContent = "DOC: SCRAMBLED";

                ankleBadge.classList.remove("violation");

                ankleLed.classList.remove("alert");

            } else if (this.wantedLevel > 0) {

                ankleBadge.textContent = "DOC: VIOLATION!";

                ankleBadge.classList.add("violation");

                ankleLed.classList.add("alert");

            } else {

                ankleBadge.textContent = "DOC: TRACKED";

                ankleBadge.classList.remove("violation");

                ankleLed.classList.remove("alert");

            }

        }



        // Wanted Heads (1..6)

        const heads = document.querySelectorAll(".cop-head");

        heads.forEach((h, idx) => {

            if (idx < this.wantedLevel) h.classList.add("active");

            else h.classList.remove("active");

        });



        // Vehicle & Radio Banner (including Car Bomb status!)

        const vrBanner = document.getElementById("vehicle-radio-banner");

        if (vrBanner) {

            if (p.inVehicle) {

                const st = this.audio.getCurrentStation();

                const bombTag = p.inVehicle.bombArmed

                    ? `  •  💣 ARMED (${Math.ceil(p.inVehicle.bombTimer)}s)!`

                    : (p.inVehicle.hasBomb ? "  •  💣 BOMB RIGGED [K]" : "  •  💣 [K] RIG BOMB");

                vrBanner.style.display = "block";

                vrBanner.textContent = `🚗 ${p.inVehicle.name}  •  📻 [R] ${st.name}${bombTag}`;

            } else {

                vrBanner.style.display = "none";

            }

        }



        // Cash, Multiplier, Lives, Get Out of Jail Free Cards & Chapter Target ($1,000,000)

        const cashEl = document.getElementById("cash-counter");

        const multEl = document.getElementById("multiplier-badge");

        const livesEl = document.getElementById("lives-badge");

        const jailEl = document.getElementById("jail-free-badge");

        const targetEl = document.getElementById("target-score-badge");

        if (cashEl) {

            cashEl.textContent = "$" + String(this.cash).padStart(8, "0");

        }

        if (multEl) {

            multEl.textContent = `x${this.multiplier}`;

        }

        if (livesEl) {

            livesEl.textContent = `❤️x${this.lives}`;

        }

        if (jailEl) {

            jailEl.textContent = `🃏 JAIL FREE: ${this.jailFreeCards}`;

            jailEl.style.opacity = this.jailFreeCards > 0 ? "1" : "0.45";

        }

        if (targetEl) {

            targetEl.textContent = this.chapterCleared ? "🏆 $1M GOAL CLEARED!" : "GOAL: $1,000,000";

        }



        // Mission / Kill Frenzy Objective Mini Row

        const objEl = document.getElementById("hud-objective-text");

        const timerEl = document.getElementById("hud-mission-timer");

        if (this.killFrenzy) {

            if (objEl) {

                objEl.textContent = `💀 FRENZY: ${this.killFrenzy.kills}/${this.killFrenzy.targetKills} KILLS`;

            }

            if (timerEl) {

                timerEl.textContent = `⏱️ ${Math.ceil(this.killFrenzy.timer)}s`;

            }

        } else {

            const target = this.missions.getTargetPosition();

            if (objEl) {

                objEl.textContent = target ? target.label : "FREE ROAM LEONIDA";

            }

            if (timerEl) {

                const m = this.missions.activeMission;

                if (m && m.timer !== null && m.timer !== undefined) {

                    timerEl.textContent = `⏱️ ${Math.ceil(m.timer)}s`;

                } else {

                    timerEl.textContent = "";

                }

            }

        }

    }



    loop() {

        let last = performance.now();

        const frame = (now) => {

            const dt = Math.min(0.05, (now - last) / 1000);

            last = now;

            this.update(dt);

            this.renderer.render(this, dt);

            if (this.fullMapOpen && this.renderer) {

                this.renderer.renderFullMap(this);

            }

            if (

                this.killFrenzy ||

                (this.player.inVehicle && this.player.inVehicle.bombArmed) ||

                (this.missions.activeMission && this.missions.activeMission.timer !== null)

            ) {

                this.updateHud();

            }

            requestAnimationFrame(frame);

        };

        requestAnimationFrame(frame);

    }

}



window.addEventListener("DOMContentLoaded", () => {

    window.game = new LeonidaGame();

    window.game.loop();

});

