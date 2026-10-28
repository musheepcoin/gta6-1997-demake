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
            x: 213.5 * TILE_SIZE,
            y: 146.0 * TILE_SIZE,
            z: 2.0,
            angle: 0,
            hp: 100,
            maxHp: 100,
            armor: 50,
            maxArmor: 100,
            inVehicle: null,
            weapon: "PISTOL",
            weaponsOwned: ["FIST", "PISTOL", "UZI", "SHOTGUN", "FLAMETHROWER", "ROCKET"],
            ammo: {
                FIST: Infinity,
                PISTOL: 150,
                UZI: 300,
                SHOTGUN: 60,
                FLAMETHROWER: 200,
                ROCKET: 20
            },
            shootCooldown: 0,
            muzzleTimer: 0,
            walkPhase: 0,
            isMoving: false,
            tankControls: false,
            jumpTimer: 0,
            jumpZOffset: 0,
            enteringVehicle: null,
            mouseShoot: false,
            bandana: false,
            ankleScrambled: false,
            dead: false
        };

        // GTA 6 Partner AI: Jason Duval (follows Lucia on foot, rides shotgun, and only fires when Lucia fights!)
        this.jason = {
            x: 213.5 * TILE_SIZE,
            y: 144.8 * TILE_SIZE,
            z: 2.0,
            angle: 0,
            recruited: true,
            inVehicle: null,
            weaponKey: "FIST",
            combatAnimTimer: 0,
            shootCooldown: 0,
            muzzleTimer: 0,
            walkPhase: 0,
            isMoving: false
        };

        // Classic 1997 GTA 1 Score, Multiplier, Lives & Get Out of Jail Free Cards
        this.cash = 500;
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

        // Active Kill Frenzy, GOURANGA Monk Chain & Enterable Venue Interior state
        this.killFrenzy = null;
        this.monkChain = [];
        this.monksKilled = 0;
        this.monkRespawnTimer = 0;
        this.activeInterior = null;
        this.interiorCooldown = 0;
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
        this.craters = [];

        // Start directly in the live GTA 1 street scene!
        this.started = true;
        this.respawnTimer = 0;

        this.initWorldEntities();
        this.bindEvents();
        this.renderPortraits();
        this.updateHud();
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
            // --- A. Ocean Drive & Hotel Dixon Spawn: Curb-parked Hero Tulip & Motorcycles on the Promenade edge (x=218.55, off the 4 road lanes 214..217!) ---
            { spec: "TULIP_MUSCLE", c: 218.55, r: 144.2, a: -Math.PI * 0.5, z: 2.0, isScurveHero: true },
            { spec: "SUPERBIKE", c: 218.55, r: 146.8, a: -Math.PI * 0.5, z: 2.0 },
            { spec: "HARLEY_BIKE", c: 218.55, r: 149.2, a: -Math.PI * 0.5, z: 2.0 },
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
            { spec: "MONSTER_BUGGY", c: 224.5, r: 148.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },
            { spec: "GATOR_4X4", c: 225.5, r: 156.0, a: -Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },
            { spec: "AIRBOAT", c: 250.5, r: 154.0, a: 0, z: 1.0, missionTag: "LANDMARK" },

            // --- C. Española Way & Club Nine1Nine (moving traffic on streets) ---
            { spec: "TURISMO_CABRIO", c: 208.5, r: 106.5, a: 0, z: 2.0, driver: "AI_TRAFFIC" },
            { spec: "STRETCH_LIMO", c: 214.5, r: 47.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { spec: "PENETRATOR_GT", c: 214.5, r: 50.0, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },

            // --- D. SERA Space Center Restricted Military Launch Pad 39A (off-road concrete pad at x=230.5, y=22.5) ---
            { spec: "PANZER_TANK", c: 230.5, r: 22.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },

            // --- E. Star Island Mansions & Port of Vice City Cruise Terminal ---
            { spec: "STINGER_CABRIO", c: 172.5, r: 104.5, a: 0, z: 2.0, missionTag: "LANDMARK" },
            { spec: "PENETRATOR_GT", c: 174.5, r: 104.5, a: Math.PI, z: 2.0, missionTag: "LANDMARK" },
            { spec: "AIRBOAT", c: 185.5, r: 160.0, a: 0, z: 1.0, missionTag: "LANDMARK" },

            // --- F. Vice City Mambas Open-Air Stadium, Downtown & Golf Club ---
            { spec: "SUPERBIKE", c: 141.5, r: 116.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { spec: "MICRO_KART", c: 145.5, r: 53.5, a: 0, z: 2.0, missionTag: "LANDMARK" },

            // --- G. Wynwood, Lake Leonida Gator Island & Mount Kalaga ---
            { spec: "HARLEY_BIKE", c: 116.5, r: 82.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_TRAFFIC" },
            { spec: "AIRBOAT", c: 82.5, r: 78.0, a: 0, z: 1.0, missionTag: "LANDMARK" },
            { spec: "CAMPER_PICKUP", c: 73.5, r: 76.0, a: 0, z: 2.0, missionTag: "LANDMARK" },
            { spec: "MONSTER_BUGGY", c: 84.5, r: 22.5, a: 0, z: 2.0, missionTag: "LANDMARK" },

            // --- H. Leonida State Penitentiary Yard & Port Gellhorn Dirt Speedway Oval ---
            { spec: "VCPD_CRUISER", c: 31.5, r: 76.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },
            { spec: "CHALLENGER_RT", c: 46.5, r: 112.5, a: 0, z: 2.0, missionTag: "LANDMARK" },
            { spec: "FJORD_FASTBACK", c: 49.5, r: 112.5, a: 0, z: 2.0, missionTag: "LANDMARK" },
            { spec: "FIRE_TRUCK", c: 38.5, r: 136.5, a: Math.PI * 0.5, z: 2.0, driver: "AI_EMERGENCY" },

            // --- I. VCIA International Airport Tarmac & Grassrivers Thrillbilly Mud Park / Keys ---
            { spec: "SUPERBIKE", c: 55.5, r: 149.5, a: Math.PI * 0.5, z: 2.0, missionTag: "LANDMARK" },
            { spec: "PICKUP_TRUCK", c: 58.0, r: 212.5, a: 0, z: 2.0, missionTag: "LANDMARK" },
            { spec: "AIRBOAT", c: 68.5, r: 222.5, a: 0, z: 1.0, missionTag: "LANDMARK" },
            { spec: "STINGER_CABRIO", c: 135.0, r: 239.5, a: -Math.PI, z: 2.0, driver: "AI_TRAFFIC" }
        ];

        parked.forEach((p, idx) => {
            const vx = p.c * TILE_SIZE;
            const vy = p.r * TILE_SIZE;
            const v = new Vehicle(`parked_${idx}`, p.spec, vx, vy, p.a);
            v.z = p.z || 2.0;
            if (p.driver) {
                v.driver = p.driver;
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
            { c: 218.5, r: 140.5, a: Math.PI * 0.5, type: "civ0" },
            { c: 218.5, r: 144.8, a: -Math.PI * 0.5, type: "civ1" },
            { c: 218.5, r: 148.6, a: Math.PI * 0.5, type: "civ3" },
            { c: 218.5, r: 152.4, a: -Math.PI * 0.5, type: "civ2" },
            { c: 218.5, r: 156.8, a: Math.PI * 0.5, type: "gang" },
            { c: 219.5, r: 142.5, a: Math.PI * 0.5, type: "civ0" },
            { c: 219.5, r: 145.5, a: Math.PI * 0.5, type: "civ1" },
            { c: 219.5, r: 150.2, a: -Math.PI * 0.5, type: "civ3" },
            { c: 219.5, r: 154.5, a: -Math.PI * 0.5, type: "gang" },
            { c: 219.5, r: 158.2, a: Math.PI * 0.5, type: "civ2" },

            // Collins Ave Sidewalks (x = 203.5 West sidewalk & x = 208.5 East sidewalk — NEVER on road lanes x = 204..207!)
            { c: 203.5, r: 143.5, a: Math.PI * 0.5, type: "civ1" },
            { c: 203.5, r: 149.5, a: -Math.PI * 0.5, type: "civ0" },
            { c: 203.5, r: 145.5, a: Math.PI * 0.5, type: "civ2" },
            { c: 208.5, r: 152.5, a: -Math.PI * 0.5, type: "civ3" },
            { c: 208.5, r: 138.5, a: 0, type: "civ1" },
            { c: 211.5, r: 153.5, a: Math.PI, type: "gang" },

            // S-Curving Golden-Sand Vice Beach & Wooden Ocean Pier (x = 224..246, y = 144..158) beachgoers & volleyball players
            { c: 224.5, r: 146.5, a: Math.PI * 0.5, type: "civ2", missionTag: "BEACH" },
            { c: 226.8, r: 149.2, a: -Math.PI * 0.5, type: "civ1", missionTag: "BEACH" },
            { c: 227.5, r: 147.8, a: Math.PI * 0.5, type: "civ3", missionTag: "BEACH" },
            { c: 229.2, r: 151.5, a: -Math.PI * 0.5, type: "civ0", missionTag: "BEACH" },
            { c: 225.8, r: 154.5, a: Math.PI * 0.5, type: "civ2", missionTag: "BEACH" },
            { c: 230.5, r: 149.5, a: -Math.PI * 0.5, type: "civ1", missionTag: "BEACH" },
            { c: 238.5, r: 154.0, a: 0, type: "civ2", missionTag: "BEACH" },
            { c: 243.5, r: 154.0, a: Math.PI, type: "civ3", missionTag: "BEACH" },

            // North Vice Beach & Club Nine1Nine beachgoers
            { c: 224.5, r: 46.5, a: Math.PI * 0.5, type: "civ2", missionTag: "BEACH" },
            { c: 226.5, r: 49.5, a: -Math.PI * 0.5, type: "civ1", missionTag: "BEACH" },

            // Grassrivers Everglades Alligators near Thrillbilly Mud Park & Swamp Islands
            { c: 46.0, r: 222.0, a: 0.4, type: "civ0", kind: "GATOR", missionTag: "BEACH" },
            { c: 74.0, r: 224.0, a: -0.8, type: "civ0", kind: "GATOR", missionTag: "BEACH" }
        ];
        starterPeds.forEach((sp, idx) => {
            this.peds.push(new Pedestrian({
                x: sp.c * TILE_SIZE,
                y: sp.r * TILE_SIZE,
                z: 2.0,
                angle: sp.a,
                speed: sp.dead ? 0 : 36,
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
            }));
        });

        // Spawn the Iconic GTA 1 "GOURANGA!" Chain of 7 Saffron-Robed Monks marching in single file along Lummus Park / Ocean Drive!
        this.spawnMonkChain();
    }

    onCmpLoaded(meta) {
        // 1. Spawn authentic startup_cars from the binary map on single-direction straight lanes!
        if (meta && Array.isArray(meta.startup_cars)) {
            const specPool = [
                "HARLEY_BIKE",
                "SUPERBIKE",
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
                "VCPD_CRUISER"
            ];
            const count = Math.min(72, meta.startup_cars.length);
            for (let i = 0; i < count; i++) {
                const sc = meta.startup_cars[i];
                const bx = Math.floor(sc.x);
                const by = Math.floor(sc.y);
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
                v.driver = "AI_TRAFFIC";
                this.vehicles.push(v);
            }
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
                if (nav && nav.groundType !== GROUND_TYPE.ROAD) {
                    for (let r = 1; r <= 4; r++) {
                        let foundRoad = false;
                        for (let dy = -r; dy <= r && !foundRoad; dy++) {
                            for (let dx = -r; dx <= r && !foundRoad; dx++) {
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
            } else if (!v.driver && nav && nav.groundType === GROUND_TYPE.ROAD) {
                // Never leave a driverless parked car blocking an active road lane!
                for (let r = 1; r <= 4; r++) {
                    let foundCurb = false;
                    for (let dy = -r; dy <= r && !foundCurb; dy++) {
                        for (let dx = -r; dx <= r && !foundCurb; dx++) {
                            const nb = this.map.getNavigationBlock(bx + dx, by + dy, v.z);
                            if (nb && (nb.groundType === GROUND_TYPE.PAWEMENT || nb.groundType === GROUND_TYPE.FIELD)) {
                                v.x = (bx + dx + 0.5) * TILE_SIZE;
                                v.y = (by + dy + 0.5) * TILE_SIZE;
                                foundCurb = true;
                            }
                        }
                    }
                    if (foundCurb) break;
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
        this.currentDistrict = this.map.getDistrictName(this.player.x, this.player.y);
        this.districtPopupTimer = 0;
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
                const nav = this.map.getNavigationBlock(bx, by, 2.0);
                if (nav && nav.groundType === GROUND_TYPE.PAWEMENT) {
                    candidates.push({ bx, by });
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
            this.peds.push(new Pedestrian({
                x: px,
                y: py,
                z: pz,
                angle: dirs[Math.floor(Math.random() * dirs.length)],
                speed: 35 + Math.random() * 9,
                kind: "CIVILIAN",
                g24Type: civTypes[(this.peds.length + i) % civTypes.length],
                shirtColor: "#06b6d4",
                hp: 35,
                dead: false,
                panicTimer: 0,
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
        const tx = blockX * TILE_SIZE;
        const ty = blockY * TILE_SIZE;
        const tz = this.map.getHeightAtPixel(tx, ty, 4.0);

        if (this.player.inVehicle) {
            this.player.inVehicle.driver = null;
            this.player.inVehicle.hasJason = false;
            this.player.inVehicle = null;
        }
        if (this.jason) {
            this.jason.inVehicle = null;
        }

        this.player.x = tx;
        this.player.y = ty;
        this.player.z = tz;

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

    spawnMonkChain() {
        // Remove any old dead monk entries
        this.peds = this.peds.filter((p) => p.kind !== "MONK");
        this.monkChain = [];
        this.monksKilled = 0;

        // 7 Saffron-Robed Hare Krishna Monks marching in single file along the Lummus Park / Ocean Drive Promenade (x=218.5, y=146.5..152)!
        const startX = 218.5 * TILE_SIZE;
        const startY = 146.5 * TILE_SIZE;
        const spacing = 19;

        for (let i = 0; i < 7; i++) {
            const monk = new Pedestrian({
                x: startX,
                y: startY + i * spacing,
                z: 2.0,
                angle: -Math.PI * 0.5,
                speed: 42,
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
                return;
            }
            const code = e.code;
            const key = e.key.toLowerCase();

            // Start modal shortcut
            if (!this.started && (code === "Enter" || code === "Space")) {
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

            // Enter / Exit / Carjack Vehicle (F or Enter or E)
            if (code === "KeyF" || code === "Enter" || code === "KeyE") {
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

            // Cycle Radio Station / Skip YouTube Radio Track (R)
            if (code === "KeyR") {
                this.skipYouTubeRadioTrack();
                if (this.player.inVehicle) {
                    const st = this.audio.cycleStation();
                    this.addFloatingText(this.player.x, this.player.y - 30, `📻 ${st.name}`, "#00f0ff");
                    this.updateHud();
                } else {
                    this.addFloatingText(this.player.x, this.player.y - 30, "📻 YT RADIO: PISTE SUIVANTE", "#00f0ff");
                }
            }

            // Cycle Weapon (Tab or X)
            if (code === "Tab" || key === "x") {
                e.preventDefault();
                this.cycleWeapon(1);
            }

            // Number keys 1..6 for direct weapon selection
            if (key >= "1" && key <= "6") {
                const idx = parseInt(key, 10) - 1;
                if (this.player.weaponsOwned[idx]) {
                    this.player.weapon = this.player.weaponsOwned[idx];
                    this.audio.playBeep(660, 0.04, "square", 0.05);
                    this.updateHud();
                }
            }

            // Toggle Neon Night / Dusk Mode (N)
            if (code === "KeyN") {
                this.renderer.nightMode = !this.renderer.nightMode;
                this.addFloatingText(
                    this.player.x,
                    this.player.y - 30,
                    this.renderer.nightMode ? "🌙 NEON NIGHT MODE" : "☀️ LEONIDA DAYLIGHT",
                    "#ff2a85"
                );
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
                if (modal) modal.classList.toggle("hidden");
            }

            // Toggle Full Square GTA 1 (.CMP) City Map Modal (M)
            if (code === "KeyM") {
                this.toggleFullMap();
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
            this.input.mouseX = e.clientX;
            this.input.mouseY = e.clientY;
        });

        this.canvas.addEventListener("mousedown", (e) => {
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

        const startBtn = document.getElementById("btn-start-game");
        if (startBtn) {
            startBtn.addEventListener("click", () => this.startGame());
        }

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
            fullMapCanvas.addEventListener("click", (e) => {
                const rect = fullMapCanvas.getBoundingClientRect();
                const u = (e.clientX - rect.left) / rect.width;
                const v = (e.clientY - rect.top) / rect.height;
                const col = u * this.map.cols;
                const row = v * this.map.rows;
                this.teleportToTile(col, row);
                this.toggleFullMap(false);
            });
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

        this.initYouTubeRadio();
    }

    initYouTubeRadio() {
        this.ytSeekOffset = 0;
        this.ytMusicEnabled = true;
        const toggleBtn = document.getElementById("yt-btn-toggle");
        const skipBtn = document.getElementById("yt-btn-skip");
        const volSlider = document.getElementById("yt-vol-slider");
        const iframe = document.getElementById("yt-player-iframe");

        const tryAutoStart = () => {
            if (!this.ytMusicEnabled) return;
            const vol = volSlider ? (parseInt(volSlider.value, 10) || 75) : 75;
            this.sendYouTubeCommand("unMute", []);
            this.sendYouTubeCommand("setVolume", [vol]);
            this.sendYouTubeCommand("playVideo", []);
        };

        if (iframe) {
            iframe.addEventListener("load", () => {
                setTimeout(tryAutoStart, 250);
                setTimeout(tryAutoStart, 1000);
            });
        }

        // Start audio automatically on first user gesture if browser blocked initial autoplay
        const unlockOnce = () => {
            tryAutoStart();
        };
        window.addEventListener("pointerdown", unlockOnce, { once: true });
        window.addEventListener("keydown", unlockOnce, { once: true });

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
            const vol = volSlider ? (parseInt(volSlider.value, 10) || 75) : 75;
            this.sendYouTubeCommand("unMute", []);
            this.sendYouTubeCommand("setVolume", [vol]);
            this.sendYouTubeCommand("playVideo", []);
            if (toggleBtn) {
                toggleBtn.textContent = "🔊 MUSIQUE : ON";
                toggleBtn.classList.add("yt-btn-active");
                toggleBtn.classList.remove("yt-btn-muted");
            }
            if (led) led.classList.remove("paused");
            if (eq) eq.classList.remove("paused");
        } else {
            this.sendYouTubeCommand("pauseVideo", []);
            if (toggleBtn) {
                toggleBtn.textContent = "🔇 MUSIQUE : OFF";
                toggleBtn.classList.remove("yt-btn-active");
                toggleBtn.classList.add("yt-btn-muted");
            }
            if (led) led.classList.add("paused");
            if (eq) eq.classList.add("paused");
        }
        // Keep internal 8-bit synth muted so turning off music truly silences all music
        if (this.audio) {
            this.audio.ytRadioPlaying = true;
        }
    }

    sendYouTubeCommand(func, args = []) {
        const iframe = document.getElementById("yt-player-iframe");
        if (!iframe || !iframe.contentWindow) return;
        try {
            iframe.contentWindow.postMessage(
                JSON.stringify({ event: "command", func, args }),
                "*"
            );
        } catch (err) {
            // Ignore cross-origin frame readiness race
        }
    }

    skipYouTubeRadioTrack() {
        // Advance ~3m15s into compilation mixes (or next video if playlist)
        this.ytSeekOffset = ((this.ytSeekOffset || 0) + 195) % 3400;
        if (!this.ytMusicEnabled) {
            this.setYouTubeMusicEnabled(true);
        }
        this.sendYouTubeCommand("seekTo", [this.ytSeekOffset, true]);
        this.sendYouTubeCommand("nextVideo", []);
        this.sendYouTubeCommand("playVideo", []);
        if (this.audio) {
            this.audio.playBeep(680, 0.04, "square", 0.04);
        }
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

    renderPortraits(pagerSpeaker = "JASON") {
        if (!this.renderer || !this.renderer.drawCharacterPortrait) return;
        const alert = this.wantedLevel > 0 && !this.player.ankleScrambled;
        this.renderer.drawCharacterPortrait(
            document.getElementById("lucia-hud-portrait"),
            "LUCIA",
            { bandana: this.player.bandana, alert }
        );
        this.renderer.drawCharacterPortrait(
            document.getElementById("lucia-dossier-portrait"),
            "LUCIA",
            { bandana: false, alert: false }
        );
        this.renderer.drawCharacterPortrait(
            document.getElementById("jason-dossier-portrait"),
            "JASON",
            { bandana: false, alert: false }
        );
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
        if (this.ytMusicEnabled) {
            this.sendYouTubeCommand("unMute", []);
            this.sendYouTubeCommand("playVideo", []);
        }
        const modal = document.getElementById("start-modal");
        if (modal) modal.classList.add("hidden");

        this.sendPager(
            "JASON (PARTNER)",
            "Welcome out of Leonida Penitentiary, Lucia! Watch that DOC Ankle Monitor. Hop in my red Declasse Tulip outside the gate [Press F] and let's answer the ringing payphone at the Pink Velvet Motel!",
            true
        );
        this.showDistrictBanner("KELLY COUNTY — LEONIDA PENITENTIARY");
    }

    cycleWeapon(dir = 1) {
        const list = this.player.weaponsOwned;
        const idx = list.indexOf(this.player.weapon);
        const nextIdx = (idx + dir + list.length) % list.length;
        this.player.weapon = list[nextIdx];
        this.audio.playBeep(620, 0.04, "square", 0.04);
        this.updateHud();
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
            p.inVehicle = null;
            if (this.jason) this.jason.inVehicle = null;
        }

        // Remember exterior coordinates right outside this venue's door
        p.x = intr.doorX;
        p.y = intr.doorY + 24;
        p.z = this.map.getHeightAtPixel(p.x, p.y, 4.0);
        if (this.jason) {
            this.jason.x = p.x + 24;
            this.jason.y = p.y;
            this.jason.z = p.z;
        }

        this.activeInterior = intr;
        this.interiorCooldown = 0.85;
        this.interiorX = intr.w * 0.5;
        this.interiorY = intr.h - 76;
        this.interiorAngle = -Math.PI * 0.5;
        this.interiorJasonX = intr.w * 0.5 + 38;
        this.interiorJasonY = intr.h - 68;
        this.interiorJasonAngle = -Math.PI * 0.5;

        if (Array.isArray(intr.stations)) {
            for (const st of intr.stations) {
                st.cooldown = 0;
            }
        }

        this.audio.playCashSound();
        this.showBigBanner(intr.name, intr.subtitle, intr.accent || "#00f0ff", 2.6);
        this.updateHud();
        return true;
    }

    exitInterior() {
        if (!this.activeInterior) return;
        const intr = this.activeInterior;
        this.activeInterior = null;
        this.interiorCooldown = 1.4;
        this.player.x = intr.doorX;
        this.player.y = intr.doorY + 26;
        this.player.z = this.map.getHeightAtPixel(this.player.x, this.player.y, 4.0);
        if (this.jason) {
            this.jason.x = this.player.x + 24;
            this.jason.y = this.player.y;
            this.jason.z = this.player.z;
        }
        this.renderer.camX = this.player.x;
        this.renderer.camY = this.player.y;
        this.renderer.camZBlocks = this.player.z;
        this.audio.playBeep(420, 0.06, "triangle", 0.06);
        this.addFloatingText(this.player.x, this.player.y - 24, `🚪 EXITED ${intr.id.replace("_", " ")}`, "#38bdf8");
        this.updateHud();
    }

    triggerInteriorStation(st) {
        if (!st || (st.cooldown || 0) > 0) return;
        st.cooldown = 8.0;
        const p = this.player;
        const grantWep = (wKey, ammoAmt) => {
            if (!p.weaponsOwned.includes(wKey)) p.weaponsOwned.push(wKey);
            p.ammo[wKey] = Math.min(999, (p.ammo[wKey] || 0) + ammoAmt);
            p.weapon = wKey;
        };

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

        // If inside a building interior, [E] / [F] / [Enter] activates a nearby station or exits the interior!
        if (this.activeInterior) {
            const intr = this.activeInterior;
            if (Array.isArray(intr.stations)) {
                for (const st of intr.stations) {
                    if (Math.hypot(this.interiorX - st.x, this.interiorY - st.y) < 62 && (st.cooldown || 0) <= 0) {
                        this.triggerInteriorStation(st);
                        return;
                    }
                }
            }
            this.exitInterior();
            return;
        }

        // If on foot near a landmark interior entrance door, [E] / [F] / [Enter] enters the interior!
        if (!p.inVehicle && Array.isArray(this.map.interiors)) {
            for (const intr of this.map.interiors) {
                if (Math.hypot(p.x - intr.doorX, p.y - intr.doorY) < 64) {
                    this.enterInterior(intr);
                    return;
                }
            }
        }

        // Exit current vehicle (with classic GTA 1 open door animation & exit_car ped frames 16..23!)
        if (p.inVehicle) {
            const v = p.inVehicle;
            let exitX = v.x - Math.sin(v.angle) * 26;
            let exitY = v.y + Math.cos(v.angle) * 26;
            const resolvedExit = this.map.resolveCircleBuildingCollision(exitX, exitY, 10, p.z || 2.0, false);
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
            v.driver = null;
            v.hasJason = false;
            v.doorOpenTimer = 0.48;
            p.inVehicle = null;
            p.enteringVehicle = null;
            p.exitAnimTimer = 0.36;
            p.fromBike = Boolean(v.isMotorcycle);
            p.x = exitX;
            p.y = exitY;
            p.angle = v.angle + Math.PI * 0.5;
            if (this.jason && this.jason.inVehicle === v) {
                this.jason.inVehicle = null;
                const jRes = this.map.resolveCircleBuildingCollision(
                    v.x + Math.sin(v.angle) * 26,
                    v.y - Math.cos(v.angle) * 26,
                    10,
                    this.jason.z || 2.0,
                    false
                );
                this.jason.x = this.map.getGroundTypeAt(jRes.x, jRes.y) === GROUND_TYPE.WATER ? exitX : jRes.x;
                this.jason.y = this.map.getGroundTypeAt(jRes.x, jRes.y) === GROUND_TYPE.WATER ? exitY : jRes.y;
            }
            this.audio.playBeep(320, 0.05, "triangle", 0.05);
            this.updateHud();
            return;
        }

        // Snappy Vehicle Entry + .G24 Door Swing: enter immediately if within 68px,
        // or run quickly to the driver-side door if up to 125px away!
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

        const wasOccupied =
            closest.driver === "AI_TRAFFIC" ||
            closest.driver === "AI_COP" ||
            closest.driver === "AI_EMERGENCY";

        if (wasOccupied) {
            this.addCash(150, "GRAND THEFT AUTO!");
            this.ejectVehicleDriver(closest, "CARJACK");
            if (closest.isPolice) {
                this.setWantedLevel(Math.max(this.wantedLevel, 1));
            } else {
                const copWitness =
                    this.vehicles.some(v => v.isPolice && !v.destroyed && Math.hypot(v.x - closest.x, v.y - closest.y) < 340) ||
                    this.peds.some(ped => !ped.dead && ped.kind === "COP" && Math.hypot(ped.x - closest.x, ped.y - closest.y) < 300);
                if (copWitness) {
                    this.setWantedLevel(Math.max(this.wantedLevel, 1));
                }
            }
        }

        closest.driver = "PLAYER";
        closest.doorOpenTimer = 0.48;
        p.enterAnimTimer = 0.36;
        p.inVehicle = closest;
        p.x = closest.x;
        p.y = closest.y;

        if (this.jason && this.jason.recruited) {
            this.jason.inVehicle = closest;
            closest.hasJason = true;
        }

        // Trigger authentic GTA 1 top-center Blue/Gold Car Name Banner
        if (this.renderer) {
            this.renderer.vehicleBannerName = closest.name;
            this.renderer.vehicleBannerTimer = 3.0;
        }

        // Entering the hidden PANZER TANK triggers a classic GTA 1 Tank Kill Frenzy!
        if (closest.specKey === "PANZER_TANK" && !closest._tankFrenzyTriggered) {
            closest._tankFrenzyTriggered = true;
            this.startKillFrenzy({
                title: "PANZER TANK RAMPAGE!",
                weapon: "ROCKET",
                targetKills: 8,
                duration: 40,
                reward: 50000
            });
        } else {
            const st = this.audio.getCurrentStation();
            this.addFloatingText(closest.x, closest.y - 26, `${closest.name}`, "#ffd13b");
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

        if (reason === "COP_DEPLOY" || vehicle.isPolice) {
            this.peds.push(new Pedestrian({
                x: doorX,
                y: doorY,
                z: vz,
                angle: Math.atan2(this.player.y - doorY, this.player.x - doorX),
                speed: 98,
                kind: "COP",
                g24Type: "police",
                shirtColor: "#1e3a8a",
                hp: 55,
                dead: false,
                panicTimer: 0,
                exitAnimTimer: 0.32
            }));
            if (reason === "COP_DEPLOY") {
                this.addFloatingText(doorX, doorY - 22, "🚓 VCPD OFFICER DEPLOYED!", "#38bdf8");
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

        // CARJACK: Civilian driver is yanked out onto the asphalt (plays GTA 1 fall/stunned frames 38..41, then flees or fights back if aggressive!)
        const fleeAngle = Math.atan2(doorY - this.player.y, doorX - this.player.x);
        const fightsBack = Boolean(vehicle.aiAggressive && Math.random() < 0.45);
        this.peds.push(new Pedestrian({
            x: doorX,
            y: doorY,
            z: vz,
            angle: fleeAngle,
            speed: fightsBack ? 90 : 86,
            kind: fightsBack ? "HOSTILE" : "CIVILIAN",
            g24Type: fightsBack ? "gang" : "civ1",
            shirtColor: "#f43f5e",
            hp: 45,
            dead: false,
            stunnedTimer: 0.85,
            panicTimer: fightsBack ? 0 : 6.5,
            turnSeed: Math.floor(Math.random() * 16) + 1
        }));
    }

    // Classic 1997 GTA 1 Horn / Siren (in vehicle) OR Famous Burp & Fart (on foot!) [G or V]
    triggerHornOrBurp() {
        const p = this.player;
        if (p.dead) return;

        if (p.inVehicle) {
            const v = p.inVehicle;
            if (v.isEmergency) {
                v.sirenActive = !v.sirenActive;
                this.audio.playHorn(true);
                this.addFloatingText(v.x, v.y - 28, v.sirenActive ? "🚨 SIREN ON!" : "🚨 SIREN OFF", "#38bdf8");
            } else {
                this.audio.playHorn(false);
                this.addFloatingText(v.x, v.y - 28, "📯 HONK! HONK!", "#ffd13b");
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
            timer: kf.duration || 30,
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
        if (!this.jason) {
            this.jason = {
                x: this.player.x + 26,
                y: this.player.y + 16,
                z: this.player.z || 2.0,
                angle: this.player.angle,
                recruited: true,
                inVehicle: this.player.inVehicle || null,
                weaponKey: "PISTOL",
                shootCooldown: 0,
                muzzleTimer: 0,
                walkPhase: 0,
                isMoving: false
            };
        } else {
            this.jason.recruited = true;
        }
        this.addFloatingText(this.player.x, this.player.y - 30, "🤝 JASON PARTNER ACTIVE!", "#00f0ff");
    }

    setWantedLevel(level) {
        const clamped = Math.max(0, Math.min(6, Math.floor(level)));
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

    addFloatingText(x, y, text, color = "#39ff14") {
        this.floatingTexts.push({ x, y, text, color, life: 1.35 });
    }

    addSkidmark(x, y) {
        this.skidmarks.push({ x, y });
        if (this.skidmarks.length > 420) {
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

    explodeAt(x, y, radius = 115, damage = 180, byPlayer = false) {
        this.audio.playExplosion();

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
                const dmg = damage * (1 - d / radius);
                if (byPlayer) v.damagedByPlayer = true;
                if (typeof v.receiveImpactDamage === "function") {
                    v.receiveImpactDamage(dmg, x, y);
                } else {
                    v.hp -= dmg;
                }
                if (v.hp <= 0 && !v.destroyed && (v.chainExplodeTimer || 0) <= 0) {
                    v.hp = 1;
                    v.chainExplodeTimer = 0.28 + Math.random() * 0.18;
                }
            }
            if (d < radius * 2.8 && typeof v.triggerPanic === "function") {
                v.triggerPanic(9.0);
            }
        }

        // Damage nearby peds & trigger pedestrian panic!
        for (const ped of this.peds) {
            if (ped.dead) continue;
            const d = Math.hypot(ped.x - x, ped.y - y);
            if (d < radius) {
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

        // Damage player if on foot nearby
        const dp = Math.hypot(this.player.x - x, this.player.y - y);
        if (dp < radius) {
            this.damagePlayer(damage * 0.45 * (1 - dp / radius));
        }
    }

    explodeVehicle(v, byPlayer = false) {
        if (v.destroyed) return;
        v.destroyed = true;
        v.vx = 0;
        v.vy = 0;

        const playerResponsible = Boolean(byPlayer || v.damagedByPlayer || this.player.inVehicle === v);

        if (this.player.inVehicle === v) {
            this.player.inVehicle = null;
            this.player.x = v.x - 32;
            this.player.y = v.y - 32;
            this.damagePlayer(45);
        }
        if (this.jason && this.jason.inVehicle === v) {
            this.jason.inVehicle = null;
        }

        this.explodeAt(v.x, v.y, 130, 200, playerResponsible);
        if (playerResponsible) {
            this.addCash(500, `${v.name} WRECKED!`);
            this.recordFrenzyKill();
            if (v.isPolice) {
                this.setWantedLevel(this.wantedLevel + 1);
            }
        }
    }

    killPed(ped, byPlayer = true) {
        if (ped.dead) return;
        ped.dead = true;
        ped.burnTimer = 0;
        for (let i = 0; i < 8; i++) {
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

        // If an AI traffic or AI police car ran over this pedestrian, do NOT blame or reward the player!
        if (!byPlayer) return;

        this.recordFrenzyKill();

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

        const reward = ped.kind === "COP" ? 1000 : (ped.kind === "GATOR" ? 600 : 100);
        const label = ped.kind === "COP" ? "COP DOWN!" : (ped.kind === "GATOR" ? "GATOR BAG!" : "");
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

        if (ped.kind === "COP") {
            this.setWantedLevel(Math.max(this.wantedLevel, 2));
        } else if (ped.kind === "CIVILIAN" && Math.random() < 0.45) {
            this.setWantedLevel(Math.max(this.wantedLevel, 1));
        }
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
        p.dead = true;
        p.inVehicle = null;
        if (this.jason) this.jason.inVehicle = null;
        this.killFrenzy = null;
        this.setWantedLevel(0);

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
                this.showBigBanner(
                    title,
                    `${subtitle} — MULTIPLIER HALVED (x${this.multiplier})`,
                    color,
                    3.0
                );
            }
        } else {
            // WASTED: lose 1 life & halve multiplier
            this.lives = Math.max(0, this.lives - 1);
            this.multiplier = Math.max(1, Math.floor(this.multiplier * 0.5));
            if (this.lives === 0) {
                this.lives = 3;
                this.showBigBanner("WASTED! (LIVES RESET)", `${subtitle} — LIVES RESTORED TO 3`, color, 3.2);
            } else {
                this.showBigBanner(title, `${subtitle} — LIVES LEFT: ${this.lives}`, color, 3.0);
            }
        }

        this.updateHud();

        setTimeout(() => {
            p.dead = false;
            p.hp = 100;
            p.armor = 50;
            if (targetType === "POLICE") {
                // VCPD South Beach Precinct (Collins Ave)
                p.x = 203.0 * TILE_SIZE;
                p.y = 146.0 * TILE_SIZE;
            } else {
                // Ocean Drive / Hotel Dixon Medical Suite
                p.x = 213.5 * TILE_SIZE;
                p.y = 146.0 * TILE_SIZE;
            }
            p.z = this.map.getHeightAtPixel(p.x, p.y, 4.0);
            if (this.jason) {
                this.jason.x = p.x;
                this.jason.y = p.y - 48;
                this.jason.z = p.z;
            }
            this.updateHud();
        }, 2800);
    }

    fireWeapon(shooterX, shooterY, angle, weaponKey, isPlayer = true, fromJason = false) {
        const spec = WEAPON_SPECS[weaponKey] || WEAPON_SPECS.PISTOL;
        this.audio.playShot(weaponKey);

        // Authentic 1997 GTA 1 FIST Melee Punch & Knockdown (weapons.json: base_hit_range 0.2 blocks)
        if (spec.isMelee) {
            if (isPlayer) {
                this.player.punchTimer = 0.34;
            }
            const hitX = shooterX + Math.cos(angle) * 16;
            const hitY = shooterY + Math.sin(angle) * 16;
            for (const ped of this.peds) {
                if (ped.dead) continue;
                if (Math.hypot(ped.x - hitX, ped.y - hitY) < 25) {
                    ped.hp -= spec.damage;
                    ped.x += Math.cos(angle) * 10;
                    ped.y += Math.sin(angle) * 10;
                    ped.stunnedTimer = 1.25;
                    ped.panicTimer = 4.5;
                    this.spawnParticle(ped.x, ped.y, "SPARK");
                    if (ped.hp <= 0) {
                        this.killPed(ped);
                    } else {
                        this.addFloatingText(ped.x, ped.y - 20, "👊 KNOCKDOWN!", "#fde047");
                    }
                    break;
                }
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
                ped.panicTimer = 5.5;
            }
        }

        const count = spec.pellets || 1;
        for (let i = 0; i < count; i++) {
            const a = angle + (Math.random() - 0.5) * spec.spread;
            this.projectiles.push({
                x: shooterX + Math.cos(a) * 16,
                y: shooterY + Math.sin(a) * 16,
                vx: Math.cos(a) * spec.speed,
                vy: Math.sin(a) * spec.speed,
                damage: spec.damage,
                rangeLeft: spec.range,
                isFlame: Boolean(spec.isFlame),
                isRocket: Boolean(spec.isRocket),
                fromPlayer: isPlayer,
                fromJason: Boolean(fromJason),
                r: spec.isFlame ? 9 : 4
            });
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
        if (p.tankControls) {
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

        // Clamp Lucia inside the interior walls
        this.interiorX = Math.max(64, Math.min(intr.w - 64, this.interiorX));
        this.interiorY = Math.max(88, Math.min(intr.h - 24, this.interiorY));

        // Jason follows Lucia inside the venue
        const dj = Math.hypot(this.interiorX - this.interiorJasonX, this.interiorY - this.interiorJasonY);
        if (dj > 48) {
            const jAng = Math.atan2(this.interiorY - this.interiorJasonY, this.interiorX - this.interiorJasonX);
            this.interiorJasonAngle = jAng;
            this.interiorJasonX += Math.cos(jAng) * 150 * dt;
            this.interiorJasonY += Math.sin(jAng) * 150 * dt;
            if (this.jason) {
                this.jason.isMoving = true;
                this.jason.walkPhase = (this.jason.walkPhase || 0) + dt * 1.2;
            }
        } else if (this.jason) {
            this.jason.isMoving = false;
        }

        // Step onto any interactive station pad inside the venue to trigger its perk/heist/minigame!
        if (Array.isArray(intr.stations)) {
            for (const st of intr.stations) {
                if ((st.cooldown || 0) <= 0 && Math.hypot(this.interiorX - st.x, this.interiorY - st.y) < 34) {
                    this.triggerInteriorStation(st);
                    break;
                }
            }
        }

        // Step onto the bottom EXIT DOOR mat (near center bottom) to return to the street!
        if (this.interiorCooldown <= 0 &&
            this.interiorY >= intr.h - 42 &&
            Math.abs(this.interiorX - intr.w * 0.5) < 68) {
            this.exitInterior();
        }
    }

    update(dt) {
        if (!this.started) return;

        if (this.interiorCooldown > 0) {
            this.interiorCooldown = Math.max(0, this.interiorCooldown - dt);
        }
        if ((this.player.speedBoostTimer || 0) > 0) {
            this.player.speedBoostTimer = Math.max(0, this.player.speedBoostTimer - dt);
        }

        // If Lucia is currently inside a Venue Interior, update the interior room!
        if (this.activeInterior) {
            this.updateInterior(dt);
            return;
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

            // Aim toward mouse cursor when firing with mouse, or straight along p.angle in GTA 1 Tank Controls!
            const pScreen = this.renderer.worldToScreen(p.x, p.y, p.z || 2.0);
            const mouseAimAngle = Math.atan2(this.input.mouseY - pScreen.y, this.input.mouseX - pScreen.x);
            const shotAngle = (!p.inVehicle && p.tankControls && !p.mouseShoot) ? p.angle : mouseAimAngle;

            if (p.inVehicle) {
                const v = p.inVehicle;
                p.enteringVehicle = null;
                p.x = v.x;
                p.y = v.y;
                p.z = v.z !== undefined ? v.z : this.map.getHeightAtPixel(v.x, v.y, p.z || 2.0);
                p.angle = v.angle;
                p.isMoving = false;
                if (v.hasTurret) {
                    v.turretAngle = mouseAimAngle;
                }
                if (this.jason && this.jason.inVehicle === v) {
                    this.jason.x = v.x;
                    this.jason.y = v.y;
                    this.jason.z = p.z;
                    this.jason.isMoving = false;
                }

                // A. Unique Stunt Jump Ramps! Launching bikes & cars high into 3D air!
                if ((v.stuntAirTimer || 0) > 0) {
                    v.stuntAirTimer = Math.max(0, v.stuntAirTimer - dt);
                    const prog = 1.0 - v.stuntAirTimer / (v.stuntMaxTime || 1.15);
                    v.stuntZOffset = Math.sin(prog * Math.PI) * 1.45;
                    if (v.stuntAirTimer <= 0) {
                        v.stuntZOffset = 0;
                        this.multiplier += 1;
                        this.audio.playCashSound();
                        this.addCash(5000, "🔥 INSANE STUNT JUMP!");
                        this.showBigBanner("UNIQUE STUNT BONUS!", `${v.lastRampName || "BIG AIR"} — +$5,000 & MULTIPLIER +1!`, "#fde047", 2.4);
                    }
                } else if (Array.isArray(this.map.stuntRamps)) {
                    const vSpd = Math.hypot(v.vx, v.vy);
                    if (vSpd > 145) {
                        for (const ramp of this.map.stuntRamps) {
                            if (Math.hypot(v.x - ramp.x, v.y - ramp.y) < 42) {
                                v.stuntMaxTime = Math.min(1.45, Math.max(0.95, vSpd / 290));
                                v.stuntAirTimer = v.stuntMaxTime;
                                v.lastRampName = ramp.name;
                                v.vx *= 1.18;
                                v.vy *= 1.18;
                                this.audio.playBeep(520, 0.12, "sawtooth", 0.08);
                                this.addFloatingText(v.x, v.y - 28, `🚀 ${ramp.name}!`, "#fde047");
                                break;
                            }
                        }
                    }
                }

                // B. Motorcycle Wheelie Bonus ([SPACE] while riding a Superbike or Chopper at speed!)
                if (v.isMotorcycle && this.input.handbrake && Math.hypot(v.vx, v.vy) > 130) {
                    v.wheelieTimer = (v.wheelieTimer || 0) + dt;
                    v.vx += Math.cos(v.angle) * 120 * dt;
                    v.vy += Math.sin(v.angle) * 120 * dt;
                    if (v.wheelieTimer >= 1.2) {
                        v.wheelieTimer = 0;
                        this.addCash(500, "🏍️ WHEELIE BONUS!");
                    }
                } else {
                    v.wheelieTimer = 0;
                }
            } else {
                const boostMult = (p.speedBoostTimer || 0) > 0 ? 1.28 : 1.0;
                const walkSpeed = (this.input.sprint ? 195 : 138) * boostMult * (this.map.isWaterAtPixel(p.x, p.y) ? 0.55 : 1);
                const manualInput = this.input.up || this.input.down || this.input.left || this.input.right;
                if (manualInput) {
                    p.enteringVehicle = null;
                }

                // StateEnteringCar (PedestrianStates.cpp): physically run to the vehicle's driver-side door!
                if (p.enteringVehicle && !p.enteringVehicle.destroyed) {
                    const ev = p.enteringVehicle;
                    const doorX = ev.x - Math.sin(ev.angle) * 20;
                    const doorY = ev.y + Math.cos(ev.angle) * 20;
                    const distDoor = Math.hypot(doorX - p.x, doorY - p.y);
                    if (distDoor < 24) {
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
                    if (this.input.shoot && p.mouseShoot) {
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
                    if (this.input.shoot) {
                        p.angle = mouseAimAngle;
                    }
                }

                const col = this.map.resolveCircleBuildingCollision(p.x, p.y, 11, p.z || 2.0);
                p.x = col.x;
                p.y = col.y;
                p.z = this.map.getHeightAtPixel(p.x, p.y, p.z || 2.0);

                // Walk directly onto a glowing Venue Door Mat (< 20px) to enter its Interior!
                if (this.interiorCooldown <= 0 && Array.isArray(this.map.interiors)) {
                    for (const intr of this.map.interiors) {
                        if (Math.hypot(p.x - intr.doorX, p.y - intr.doorY) < 20) {
                            this.enterInterior(intr);
                            return;
                        }
                    }
                }
            }

            // On-Foot & Drive-By Shooting:
            // On foot -> fire equipped weapon; In Tank -> fire Rocket Cannon; In normal vehicle -> Drive-By UZI / PISTOL!
            p.shootCooldown -= dt;
            if ((p.playerCombatTimer || 0) > 0) {
                p.playerCombatTimer = Math.max(0, p.playerCombatTimer - dt);
            }
            if (this.input.shoot && p.shootCooldown <= 0) {
                const isTank = Boolean(p.inVehicle && p.inVehicle.hasTurret);
                let activeWep = p.weapon;
                if (isTank) {
                    activeWep = "ROCKET";
                } else if (p.inVehicle) {
                    activeWep = (p.ammo.UZI > 0) ? "UZI" : "PISTOL";
                }
                const spec = WEAPON_SPECS[activeWep] || WEAPON_SPECS.PISTOL;
                const hasFrenzyUnlimited = this.killFrenzy && this.killFrenzy.weapon === activeWep;

                if (isTank || hasFrenzyUnlimited || p.ammo[activeWep] > 0) {
                    if (!isTank && !hasFrenzyUnlimited && p.ammo[activeWep] !== Infinity) {
                        p.ammo[activeWep]--;
                    }
                    p.shootCooldown = isTank ? 0.85 : spec.fireRate;
                    p.muzzleTimer = 0.08;
                    if (!spec.isMelee) {
                        p.playerCombatTimer = 3.5;
                    }
                    this.fireWeapon(p.x, p.y, shotAngle, activeWep, true, false);
                    this.updateHud();
                } else if (!p.inVehicle) {
                    p.weapon = "FIST";
                    this.updateHud();
                }
            }
        }

        // 2. Jason Partner AI Update (Follows Lucia, boards passenger seat & only fires when Lucia fights!)
        if (this.jason && !p.dead) {
            if (this.jason.muzzleTimer > 0) this.jason.muzzleTimer -= dt;
            if (this.jason.shootCooldown > 0) this.jason.shootCooldown -= dt;
            if ((this.jason.combatAnimTimer || 0) > 0) {
                this.jason.combatAnimTimer -= dt;
                if (this.jason.combatAnimTimer <= 0) {
                    this.jason.weaponKey = "FIST"; // Holster weapon when not actively shooting!
                }
            } else {
                this.jason.weaponKey = "FIST";
            }

            // Auto-board passenger seat if Lucia is in a vehicle and Jason is nearby
            if (p.inVehicle && !this.jason.inVehicle) {
                const dCar = Math.hypot(p.inVehicle.x - this.jason.x, p.inVehicle.y - this.jason.y);
                if (dCar < 36) {
                    this.jason.inVehicle = p.inVehicle;
                    p.inVehicle.hasJason = true;
                }
            }

            if (!this.jason.inVehicle) {
                const distToLucia = Math.hypot(p.x - this.jason.x, p.y - this.jason.y);
                // Hysteresis: start moving at > 56px, keep moving smoothly until < 36px (eliminates 60Hz start/stop flicker!)
                const shouldMove = this.jason.isMoving ? (distToLucia > 36) : (distToLucia > 56);
                if (shouldMove) {
                    const targetAng = Math.atan2(p.y - this.jason.y, p.x - this.jason.x);
                    if ((this.jason.combatAnimTimer || 0) <= 0) {
                        const diff = Math.atan2(Math.sin(targetAng - this.jason.angle), Math.cos(targetAng - this.jason.angle));
                        this.jason.angle += diff * Math.min(1, dt * 12);
                    }
                    const jRunning = distToLucia > 95 || Boolean(this.input.sprint);
                    const jSpeed = jRunning ? 190 : 138;
                    this.jason.x += Math.cos(targetAng) * jSpeed * dt;
                    this.jason.y += Math.sin(targetAng) * jSpeed * dt;
                    this.jason.isMoving = true;
                    this.jason.isRunning = jRunning;
                    this.jason.walkPhase = (this.jason.walkPhase || 0) + dt * (jRunning ? 1.45 : 1.0);
                    const jCol = this.map.resolveCircleBuildingCollision(this.jason.x, this.jason.y, 10, this.jason.z || 2.0);
                    this.jason.x = jCol.x;
                    this.jason.y = jCol.y;
                    this.jason.z = this.map.getHeightAtPixel(this.jason.x, this.jason.y, this.jason.z || 2.0);
                } else {
                    this.jason.isMoving = false;
                    this.jason.isRunning = false;
                }
            }

            // Jason Combat Wingman AI: ONLY fires when Lucia is actively shooting (playerCombatTimer > 0)
            // OR when a HOSTILE attacker is right on top of Lucia (< 115px)! Never shoots unprovoked!
            const playerFighting = (p.playerCombatTimer || 0) > 0;
            if (this.jason.shootCooldown <= 0) {
                let nearestThreat = null;
                let bestThreatDist = playerFighting ? 250 : 115;
                for (const ped of this.peds) {
                    if (ped.dead) continue;
                    const isEnemy =
                        ped.kind === "HOSTILE" ||
                        (playerFighting && ped.kind === "COP" && this.wantedLevel > 0);
                    if (!isEnemy) continue;
                    const d = Math.hypot(ped.x - this.jason.x, ped.y - this.jason.y);
                    if (d < bestThreatDist) {
                        bestThreatDist = d;
                        nearestThreat = ped;
                    }
                }
                if (nearestThreat) {
                    const shotAng = Math.atan2(nearestThreat.y - this.jason.y, nearestThreat.x - this.jason.x);
                    this.jason.angle = shotAng;
                    this.jason.weaponKey = this.jason.inVehicle ? "UZI" : "PISTOL";
                    this.jason.combatAnimTimer = 0.65;
                    this.jason.shootCooldown = 0.48;
                    this.jason.muzzleTimer = 0.08;
                    this.fireWeapon(this.jason.x, this.jason.y, shotAng, this.jason.weaponKey, true, true);
                }
            }
        }

        // 3. Update All Vehicles & Collisions
        if ((p.hitByCarCooldown || 0) > 0) {
            p.hitByCarCooldown = Math.max(0, p.hitByCarCooldown - dt);
        }
        for (const v of this.vehicles) {
            v.update(dt, this.input, this.map, this);

            // Check player vehicle OR high-speed panicked/cop vehicle hitting pedestrians:
            // Low-speed bumps (30 < vSpeed <= 68) knock pedestrians down (stunnedTimer); high-speed (> 68) runs them over!
            const vSpeed = Math.hypot(v.vx, v.vy);
            const isActiveThreatCar =
                !v.destroyed &&
                (v.driver === "PLAYER" || v.driver === "AI_COP" || v.aiPanicTimer > 0);
            if (isActiveThreatCar && vSpeed > 30) {
                for (const ped of this.peds) {
                    if (ped.dead) continue;
                    if (Math.hypot(ped.x - v.x, ped.y - v.y) < 25) {
                        if (vSpeed > 68 || (v.driver !== "PLAYER" && vSpeed > 110)) {
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
                    this.damagePlayer(Math.min(26, vSpeed * 0.08));
                    this.spawnParticle(p.x, p.y, "SPARK");
                }
            }
        }

        // 2-Axle Rectangular Vehicle-to-Vehicle Collisions (Front/Rear Bumper Discs + PIT Spin Torque!)
        for (let i = 0; i < this.vehicles.length; i++) {
            for (let j = i + 1; j < this.vehicles.length; j++) {
                const a = this.vehicles[i];
                const b = this.vehicles[j];
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
                    // Panzer Tank crushes other vehicles on contact!
                    if (a.crushesCars && !b.crushesCars && !b.destroyed && Math.hypot(a.vx, a.vy) > 35) {
                        this.explodeVehicle(b, a.driver === "PLAYER");
                        continue;
                    }
                    if (b.crushesCars && !a.crushesCars && !a.destroyed && Math.hypot(b.vx, b.vy) > 35) {
                        this.explodeVehicle(a, b.driver === "PLAYER");
                        continue;
                    }

                    const involvesPlayerOrActiveCop =
                        a.driver === "PLAYER" ||
                        b.driver === "PLAYER" ||
                        (this.wantedLevel > 0 && (a.driver === "AI_COP" || b.driver === "AI_COP"));

                    if (!involvesPlayerOrActiveCop) {
                        // AI-vs-AI traffic: only enforce longitudinal spacing between same-direction vehicles;
                        // never push AI cars laterally out of their lane or wedge crossing AI cars inside an intersection!
                        if (Math.cos(a.angle - b.angle) > 0.65) {
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

                    const push = bestOverlap * 0.5;
                    a.x -= bestNx * push;
                    a.y -= bestNy * push;
                    b.x += bestNx * push;
                    b.y += bestNy * push;

                    // Realistic 2D impulse momentum transfer + PIT maneuver angular spin when Player or Active Cop is involved!
                    const rvx = b.vx - a.vx;
                    const rvy = b.vy - a.vy;
                    const normalVel = rvx * bestNx + rvy * bestNy;
                    if (normalVel < 0) {
                        const impulse = -0.64 * normalVel;
                        a.vx -= bestNx * impulse;
                        a.vy -= bestNy * impulse;
                        b.vx += bestNx * impulse;
                        b.vy += bestNy * impulse;

                        // Rotational torque on front/rear bumper impact (PIT maneuver spin!)
                        const aCross = aCos * bestNy - aSin * bestNx;
                        const bCross = bCos * bestNy - bSin * bestNx;
                        a.angle -= hitALever * aCross * Math.min(0.22, impulse * 0.0014);
                        b.angle += hitBLever * bCross * Math.min(0.22, impulse * 0.0014);
                    }

                    const relSpeed = Math.hypot(rvx, rvy);
                    if (relSpeed > 95) {
                        if (typeof a.triggerPanic === "function") a.triggerPanic(8.5);
                        if (typeof b.triggerPanic === "function") b.triggerPanic(8.5);
                        if ((a.driver === "PLAYER" || b.driver === "PLAYER") && Math.random() < 0.5) {
                            this.audio.playHorn();
                        }
                        // Aggressive AI drivers (Bikers, Muscle Cars, 4x4s) may bail out in road rage if rammed hard by the player!
                        const aiVictim = (a.driver === "PLAYER" && b.driver === "AI_TRAFFIC") ? b : ((b.driver === "PLAYER" && a.driver === "AI_TRAFFIC") ? a : null);
                        if (aiVictim && aiVictim.aiAggressive && relSpeed > 135 && Math.hypot(aiVictim.vx, aiVictim.vy) < 85 && Math.random() < 0.35) {
                            this.ejectVehicleDriver(aiVictim, "ROAD_RAGE");
                        }
                    }
                    if (relSpeed > 125) {
                        const dmg = relSpeed * 0.042;
                        if (b.driver === "PLAYER") a.damagedByPlayer = true;
                        if (a.driver === "PLAYER") b.damagedByPlayer = true;
                        if (typeof a.receiveImpactDamage === "function") a.receiveImpactDamage(dmg, b.x, b.y);
                        else a.hp -= dmg;
                        if (typeof b.receiveImpactDamage === "function") b.receiveImpactDamage(dmg, a.x, a.y);
                        else b.hp -= dmg;
                        this.spawnParticle((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, "SPARK");
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

        // 4B. Classic GTA 1 Car Bomb Shop Check
        if (this.map.bombShops) {
            for (const bs of this.map.bombShops) {
                if (bs.cooldown > 0) bs.cooldown -= dt;
                if (p.inVehicle && bs.cooldown <= 0) {
                    const v = p.inVehicle;
                    if (!v.hasBomb && v.x > bs.x && v.x < bs.x + bs.w && v.y > bs.y && v.y < bs.y + bs.h) {
                        bs.cooldown = 5.0;
                        if (this.cash >= bs.cost) this.cash -= bs.cost;
                        v.hasBomb = true;
                        this.audio.playCashSound();
                        this.showBigBanner(
                            "CAR BOMB RIGGED!",
                            "PRESS [K] ANYTIME TO ARM THE 5-SECOND DETONATOR, THEN [F] TO BAIL OUT!",
                            "#ff9900",
                            2.6
                        );
                        this.updateHud();
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
        let leadMonk = null;
        for (const ped of this.peds) {
            if (ped.dead) continue;
            if (ped.exitAnimTimer > 0) ped.exitAnimTimer = Math.max(0, ped.exitAnimTimer - dt);

            // 1997 GTA 1 Pedestrian::SetBurnEffectActive (Flamethrower burning pedestrians!)
            if ((ped.burnTimer || 0) > 0) {
                ped.burnTimer -= dt;
                ped.hp -= 15 * dt;
                ped.panicTimer = 2.0;
                if (Math.random() < 0.4) {
                    this.spawnParticle(ped.x + (Math.random() - 0.5) * 10, ped.y + (Math.random() - 0.5) * 10, "FIRE");
                }
                if (ped.hp <= 0 || ped.burnTimer <= 0) {
                    this.killPed(ped);
                    continue;
                }
            }

            // 1997 GTA 1 ePedestrianState_Stunned (knocked down onto asphalt, frames 38..41)
            if ((ped.stunnedTimer || 0) > 0) {
                ped.stunnedTimer -= dt;
                continue;
            }

            if (ped.kind === "MONK") {
                // Single-file GOURANGA chain of 7 saffron-robed monks!
                if (!leadMonk) {
                    leadMonk = ped;
                    ped.x += Math.cos(ped.angle) * ped.speed * dt;
                    ped.y += Math.sin(ped.angle) * ped.speed * dt;
                    // Patrol back and forth along the Ocean Drive Boardwalk between rows 143.5 and 155.5
                    if (ped.y < 143.5 * TILE_SIZE) ped.angle = Math.PI * 0.5;
                    if (ped.y > 155.5 * TILE_SIZE) ped.angle = -Math.PI * 0.5;
                } else {
                    const dx = leadMonk.x - ped.x;
                    const dy = leadMonk.y - ped.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 17) {
                        ped.angle = Math.atan2(dy, dx);
                        ped.x += Math.cos(ped.angle) * (ped.speed * 1.08) * dt;
                        ped.y += Math.sin(ped.angle) * (ped.speed * 1.08) * dt;
                    }
                    leadMonk = ped;
                }
                ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);
                continue;
            }

            const prevX = ped.x;
            const prevY = ped.y;

            if (ped.kind === "GATOR") {
                // Gator chases nearest human or Lucia if close
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
            } else if (ped.kind === "COP" && this.wantedLevel > 0 && !p.dead) {
                const dPlayer = Math.hypot(p.x - ped.x, p.y - ped.y);
                ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
                if (dPlayer > 28) {
                    ped.x += Math.cos(ped.angle) * 98 * dt;
                    ped.y += Math.sin(ped.angle) * 98 * dt;
                } else {
                    // Authentic GTA 1 BUSTED: Cop grabs Lucia on foot OR pulls her out of a stopped/slow car!
                    const inSlowCar = p.inVehicle && !p.inVehicle.crushesCars && Math.abs(p.inVehicle.speed) < 42;
                    if (!p.inVehicle && p.hp < 55) {
                        this.triggerWastedOrBusted("BUSTED!", "ARRESTED BY LEONIDA VCPD — RELEASED AT PRECINCT HQ", "#38bdf8", "POLICE");
                    } else if (inSlowCar) {
                        this.triggerWastedOrBusted("BUSTED!", "PULLED OUT OF VEHICLE BY VCPD OFFICER!", "#38bdf8", "POLICE");
                    } else if (!p.inVehicle) {
                        this.damagePlayer(14 * dt);
                    }
                }
                if (dPlayer < 280 && Math.random() < 0.025) {
                    this.fireWeapon(ped.x, ped.y, ped.angle, "PISTOL", false);
                }
            } else if (ped.kind === "HOSTILE") {
                // Road-Rage Driver / Gang Member AI: chases Lucia and punches or pulls her out of a slow car!
                const dPlayer = Math.hypot(p.x - ped.x, p.y - ped.y);
                if (dPlayer < 290 && !p.dead) {
                    ped.angle = Math.atan2(p.y - ped.y, p.x - ped.x);
                    if (dPlayer > 24) {
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
            } else {
                // Exact Port of 1997 GTA 1 AiCharacterController::UpdateWandering / ChooseWalkWaypoint / ContinueWalkToWaypoint
                // (AiCharacterController.cpp lines 250-365): Pedestrians stay strictly on PAWEMENT / FIELD blocks!
                if (ped.panicTimer > 0) ped.panicTimer = Math.max(0, ped.panicTimer - dt);

                const baseWalkSpd = ped.kind === "COP" ? 38 : (ped.speed || 36);
                const spd = (ped.burnTimer || 0) > 0 ? 105 : (ped.panicTimer > 0 ? 82 : baseWalkSpd);
                const bx = Math.floor(ped.x / TILE_SIZE);
                const by = Math.floor(ped.y / TILE_SIZE);
                const pz = ped.z !== undefined ? ped.z : 2.0;

                const needTarget =
                    ped.targetBx === null ||
                    ped.targetBx === undefined ||
                    Math.hypot((ped.targetBx + 0.5) * TILE_SIZE - ped.x, (ped.targetBy + 0.5) * TILE_SIZE - ped.y) < 10;

                if (needTarget) {
                    const baseX = ped.targetBx !== null && ped.targetBx !== undefined ? ped.targetBx : bx;
                    const baseY = ped.targetBy !== null && ped.targetBy !== undefined ? ped.targetBy : by;
                    ped.turnSeed = (ped.turnSeed || 1) + 1;
                    // Never step onto ROAD blocks (isPanic = false keeps pedestrians strictly on sidewalks/beaches)
                    const nextStep = this.map.chooseNextSidewalkBlock(
                        baseX,
                        baseY,
                        ped.angle,
                        pz,
                        ped.turnSeed,
                        false
                    );
                    ped.targetBx = nextStep.bx;
                    ped.targetBy = nextStep.by;
                    ped.angle = nextStep.angle;
                }

                if (ped.targetBx !== null && ped.targetBx !== undefined) {
                    const tx = (ped.targetBx + 0.5) * TILE_SIZE;
                    const ty = (ped.targetBy + 0.5) * TILE_SIZE;
                    ped.angle = Math.atan2(ty - ped.y, tx - ped.x);
                }

                ped.x += Math.cos(ped.angle) * spd * dt;
                ped.y += Math.sin(ped.angle) * spd * dt;

                // Keep normal walking civilians strictly on PAWEMENT/FIELD sidewalks so they never wander into road lanes
                const curNav = this.map.getNavigationBlock ? this.map.getNavigationBlock(bx, by, pz) : null;
                const newBx = Math.floor(ped.x / TILE_SIZE);
                const newBy = Math.floor(ped.y / TILE_SIZE);
                if (
                    curNav &&
                    (curNav.groundType === GROUND_TYPE.PAWEMENT || curNav.groundType === GROUND_TYPE.FIELD) &&
                    (newBx !== bx || newBy !== by)
                ) {
                    const nextNav = this.map.getNavigationBlock(newBx, newBy, pz);
                    if (nextNav && nextNav.groundType === GROUND_TYPE.ROAD) {
                        ped.x = prevX;
                        ped.y = prevY;
                        ped.angle += Math.PI;
                        ped.targetBx = bx;
                        ped.targetBy = by;
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
                ped.angle += Math.PI * 0.5;
                ped.targetBx = null;
                ped.targetBy = null;
            }
            ped.z = this.map.getHeightAtPixel(ped.x, ped.y, ped.z || 2.0);
        }

        // 7. VCPD Police Spawner, Roadblocks (Wanted >= 3) & Wanted Decay
        let nearestCopDist = 9999;
        let activeCopCars = 0;
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
            }
        }

        if (this.roadblockCooldown > 0) this.roadblockCooldown -= dt;

        if (this.wantedLevel > 0) {
            this.copSpawnTimer += dt;
            const maxCops = Math.min(4, this.wantedLevel);
            if (activeCopCars < maxCops && this.copSpawnTimer > 7.5) {
                this.copSpawnTimer = 0;
                const baseBx = Math.floor(p.x / TILE_SIZE);
                const baseBy = Math.floor(p.y / TILE_SIZE);
                const pz = p.z || 2.0;
                for (let attempt = 0; attempt < 8; attempt++) {
                    const ang = Math.random() * Math.PI * 2;
                    const distB = 9.5 + Math.random() * 4.0;
                    const bx = Math.floor(baseBx + Math.cos(ang) * distB);
                    const by = Math.floor(baseBy + Math.sin(ang) * distB);
                    const navBlk = this.map.getNavigationBlock(bx, by, pz);
                    if (navBlk && navBlk.groundType === GROUND_TYPE.ROAD) {
                        const sx = (bx + 0.5) * TILE_SIZE;
                        const sy = (by + 0.5) * TILE_SIZE;
                        const toPlayerAng = Math.atan2(p.y - sy, p.x - sx);
                        const roadAng = typeof this.map.getAlignedRoadAngle === "function"
                            ? this.map.getAlignedRoadAngle(bx, by, toPlayerAng, pz)
                            : toPlayerAng;
                        const specKey = this.wantedLevel >= 4 ? "SWAT_ENFORCER" : "VCPD_CRUISER";
                        const copCar = new Vehicle(`cop_${Date.now()}`, specKey, sx, sy, roadAng);
                        copCar.z = this.map.getHeightAtPixel(sx, sy, 4.0);
                        copCar.driver = "AI_COP";
                        copCar.speed = 140;
                        copCar.vx = Math.cos(roadAng) * 140;
                        copCar.vy = Math.sin(roadAng) * 140;
                        this.vehicles.push(copCar);
                        break;
                    }
                }
            }

            // Spawn GTA 1 Police Roadblock at Wanted Level >= 3
            if (this.wantedLevel >= 3 && this.roadblockCooldown <= 0 && activeCopCars < 5) {
                this.roadblockCooldown = 28;
                const rbX = p.x + Math.cos(p.angle) * 480;
                const rbY = p.y + Math.sin(p.angle) * 480;
                if (this.map.isRoadAtPixel(rbX, rbY)) {
                    const rbCar = new Vehicle(`rb_${Date.now()}`, "VCPD_CRUISER", rbX, rbY, p.angle + Math.PI * 0.5);
                    this.vehicles.push(rbCar);
                    this.peds.push(new Pedestrian({
                        x: rbX - Math.cos(p.angle) * 28,
                        y: rbY - Math.sin(p.angle) * 28,
                        angle: p.angle + Math.PI,
                        speed: 90,
                        kind: "COP",
                        g24Type: "police",
                        shirtColor: "#1e3a8a",
                        hp: 45,
                        dead: false,
                        panicTimer: 0
                    }));
                    this.addFloatingText(rbX, rbY - 26, "🚧 VCPD ROADBLOCK!", "#38bdf8");
                }
            }

            // Decay 1 Wanted Head when out of immediate police sight (> 420px), or slowly over time at 1-2 heads if no new crimes occur!
            const decayThreshold = this.wantedLevel === 1 ? 11 : 15;
            if (nearestCopDist > 420) {
                this.wantedDecayTimer += dt;
            } else if (this.wantedLevel <= 2) {
                this.wantedDecayTimer += dt * 0.35;
            }
            if (this.wantedDecayTimer >= decayThreshold) {
                this.setWantedLevel(this.wantedLevel - 1);
            }
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
            } else {
                const bCol = this.map.resolveCircleBuildingCollision(pr.x, pr.y, 3, p.z || 2.0);
                if (bCol.hit) hitSomething = true;
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
                for (const v of this.vehicles) {
                    if (pr.fromPlayer && p.inVehicle === v) continue;
                    if (Math.hypot(v.x - pr.x, v.y - pr.y) < 24) {
                        const vehDmg = pr.isRocket
                            ? pr.damage * 1.35
                            : (pr.isFlame ? pr.damage * 0.85 : pr.damage * 0.34);
                        if (pr.fromPlayer) {
                            v.damagedByPlayer = true;
                            if (v.isPolice && !pr.fromJason) {
                                this.setWantedLevel(Math.max(this.wantedLevel, 1));
                            }
                        }
                        if (typeof v.receiveImpactDamage === "function") {
                            v.receiveImpactDamage(vehDmg, pr.x, pr.y, Boolean(pr.isRocket));
                        } else {
                            v.hp -= vehDmg;
                        }
                        if (pr.fromPlayer && !v.destroyed) {
                            this.cash += 10 * this.multiplier;
                        }
                        this.spawnParticle(pr.x, pr.y, pr.isFlame ? "FIRE" : "SPARK");
                        hitSomething = true;
                        break;
                    }
                }
            }

            // Hit pedestrian?
            if (!hitSomething && pr.fromPlayer) {
                for (const ped of this.peds) {
                    if (ped.dead) continue;
                    // Jason's cover fire never hits innocent civilians or monks!
                    if (pr.fromJason && ped.kind !== "COP" && ped.kind !== "HOSTILE") continue;
                    if (Math.hypot(ped.x - pr.x, ped.y - pr.y) < 13) {
                        ped.hp -= pr.damage;
                        if (pr.isFlame && ped.hp > 0) {
                            ped.burnTimer = 3.2;
                            ped.panicTimer = 4.5;
                            ped.angle = Math.random() * Math.PI * 2;
                        }
                        if (ped.hp <= 0) this.killPed(ped, true);
                        hitSomething = true;
                        break;
                    }
                }
            }

            // Hit player?
            if (!hitSomething && !pr.fromPlayer && !p.inVehicle) {
                if (Math.hypot(p.x - pr.x, p.y - pr.y) < 13) {
                    this.damagePlayer(pr.damage * 0.35);
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

        // 9. Particles & Floating Texts Update
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.life -= dt;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 28 * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
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
                        this.addCash(2500, `${lm.short} DISCOVERED!`);
                        this.showBigBanner(
                            `🌴 ${lm.name}`,
                            `${lm.sub} — LANDMARK ${visitedCount}/${totalLm} DISCOVERED (+$2,500)!`,
                            lm.color || "#ff2a85",
                            3.2
                        );
                        this.sendPager(
                            "JASON DUVAL",
                            `WELCOME TO ${lm.name}! (${lm.district}) — ${lm.sub}. [${visitedCount}/${totalLm} VICE CITY LANDMARKS VISITED]`,
                            false
                        );
                    }
                    if (!lm.perkCooldown || lm.perkCooldown <= 0) {
                        lm.perkCooldown = 16.0;
                        if (lm.perk === "HEAL" && p.hp < p.maxHp) {
                            p.hp = p.maxHp;
                            this.addFloatingText(p.x, p.y - 28, "🏨 HOTEL DIXON SUITE: FULL HEALTH!", "#39ff14");
                            this.updateHud();
                        } else if (lm.perk === "ARMOR" && p.armor < p.maxArmor) {
                            p.armor = Math.min(p.maxArmor, p.armor + 50);
                            this.addFloatingText(p.x, p.y - 28, "🏖️ VICE BEACH / GRASSRIVERS: +50 ARMOR!", "#00f0ff");
                            this.updateHud();
                        } else if (lm.perk === "MULTIPLIER") {
                            this.multiplier += 1;
                            this.addFloatingText(p.x, p.y - 28, `💃 CLUB NINE1NINE VIP: MULTIPLIER x${this.multiplier}!`, "#ff2a85");
                            this.updateHud();
                        } else if (lm.perk === "ESTATE") {
                            p.hp = p.maxHp;
                            p.armor = p.maxArmor;
                            if (!p.weaponsOwned.includes("UZI")) p.weaponsOwned.push("UZI");
                            p.ammo.UZI = Math.min(999, (p.ammo.UZI || 0) + 90);
                            this.addFloatingText(p.x, p.y - 28, "🏛️ STAR ISLAND MANSION: FULL HP/ARMOR + UZI!", "#a855f7");
                            this.updateHud();
                        } else if (lm.perk === "REPAIR_CLEAR") {
                            if (p.inVehicle) {
                                p.inVehicle.hp = p.inVehicle.maxHp;
                                p.inVehicle.dentMask = 0;
                            }
                            if (this.wantedLevel > 0) {
                                this.setWantedLevel(0);
                            }
                            this.addFloatingText(p.x, p.y - 28, "🏪 PORT GELLHORN CUSTOMS: FREE REPAIR & WANTED CLEARED!", "#f97316");
                            this.updateHud();
                        } else if (lm.perk === "TAXI_BONUS") {
                            this.addCash(3000, "🃏 JACK OF HEARTS VIP BONUS");
                        }
                    }
                }
            }
        }

        // 11. District Change Detection
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

        // 12. Missions & Audio Update
        this.missions.update(dt);
        this.audio.update(dt, {
            inVehicle: Boolean(p.inVehicle),
            vehicleSpeed: p.inVehicle ? p.inVehicle.speed : 0,
            wantedLevel: this.wantedLevel,
            nearestCopDist: nearestCopDist
        });
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

        sEl.textContent = `📟 PAGER // ${sender}`;
        tEl.textContent = text;
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
