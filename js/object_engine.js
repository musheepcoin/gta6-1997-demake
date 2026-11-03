/* ============================================================================
   VICE CITY 26 — TRUE 3D VOLUMETRIC WORLD OBJECT, LANDMARK & PROP ENGINE
   (js/object_engine.js)
   ----------------------------------------------------------------------------
   Unified 3D Architectural, Monument & Interactive Street Prop Engine:
   1. Strict 1:1 Physical Metric Scale (1 tile = 64 px = 8m, Car = 58x28 px,
      Pedestrian = 24x24 px, Garage Bay = 62 px, Double Entry Door = 38 px).
   2. Hardware Z-Buffered 3D WebGL Mesh Pipeline (gl.depthMask(true)):
      - 23 Verified 3D Residential Estates across 7 Districts
      - 3D Iconic GTA 6 Monuments & Infrastructure:
        * SERA Space Center Launch Pad 39A, 3D Umbilical Tower & Multi-Stage Rocket
        * Vice Port & Port Gellhorn 3D Corrugated Container Stacks & 3D Gantry Cranes
        * Key West & Cape Leonida 3D Coastal Lighthouses with Rotating Beacons
        * Vice Beach Pier 3D Vertically-Rotating Neon Ferris Wheel & Gondolas
        * Port Gellhorn 3D Dutch Mini-Golf Windmill with Vertically-Rotating 3D Sails
        * VCIA Airport 3D Security Checkpoint Guardhouses, 3D Tiki Bars,
          3D Beach Lifeguard Towers & 3D Allied Crystal Refinery Smokestacks
   3. 3D Destructible Street Furniture & Chaos Physics (this.streetProps):
      - 180+ True-3D Sidewalk Props (Cast-Iron Fire Hydrants with 3D Water Geysers,
        Art Deco Neon Streetlights, Glass Payphone Booths, Newspaper Stands)
      - Full 3D rigid-body knockback, gravity, bounce, electric sparks, 3D water
        geysers & "$100 STREET MAYHEM!" score bonuses on vehicle impact!
   ============================================================================ */

const WORLD_METRICS = {
    TILE_PX: 64.0,
    METERS_PER_TILE: 8.0,
    PX_PER_METER: 8.0,
    CAR_LENGTH_PX: 58.0,
    CAR_WIDTH_PX: 28.0,
    PED_SIZE_PX: 24.0,
    GARAGE_DOOR_W_PX: 62.0,
    ENTRY_DOOR_W_PX: 38.0,
    STORY_HEIGHT_BLOCKS: 0.72,
    UPPER_STORY_BLOCKS: 0.56,
    STILT_HEIGHT_BLOCKS: 0.36
};

const PREFAB_CATALOG = {
    mansion_star_island: {
        id: "mansion_star_island",
        category: "ESTATE",
        label: "Mediterranean Revival Grand Palazzo",
        w1: 284, d1: 168, h1: 0.72,
        w2: 168, d2: 108, h2: 0.54,
        roofStyle: "HIPPED_TERRACOTTA",
        roofOverhang: 12,
        roofPitch1: 0.28,
        roofPitch2: 0.22,
        frontWall1: "wall_star_front",
        sideWall1: "wall_star_side",
        upperWall: "wall_star_upper",
        roofTex1: "mansion_star_island",
        roofTex2: "mansion_star_island_top",
        wallColor: [0.97, 0.92, 0.84],
        trimColor: [0.88, 0.78, 0.64],
        roofBaseColor: [0.76, 0.34, 0.20],
        roofRidgeColor: [0.90, 0.48, 0.30],
        hasPortico: true,
        porticoW: 84, porticoD: 30, porticoH: 0.68,
        hasCupola: true,
        mapColor: "#f59e0b",
        mapRoofColor: "#c2410c"
    },
    mansion_modern_luxury: {
        id: "mansion_modern_luxury",
        category: "ESTATE",
        label: "Contemporary Minimalist Waterfront Villa",
        w1: 244, d1: 154, h1: 0.70,
        w2: 146, d2: 94,  h2: 0.54,
        w2OffsetX: -28, w2OffsetY: -10,
        roofStyle: "FLAT_CANTILEVER",
        roofOverhang: 10,
        roofPitch1: 0.08,
        roofPitch2: 0.07,
        frontWall1: "wall_modern_front",
        sideWall1: "wall_modern_side",
        upperWall: "wall_modern_upper",
        roofTex1: "mansion_modern_luxury",
        roofTex2: "mansion_modern_luxury_top",
        wallColor: [0.95, 0.96, 0.98],
        trimColor: [0.20, 0.24, 0.30],
        roofBaseColor: [0.90, 0.92, 0.94],
        roofRidgeColor: [0.22, 0.78, 0.92],
        hasPortico: false,
        hasGlassBalcony: true,
        mapColor: "#f8fafc",
        mapRoofColor: "#38bdf8"
    },
    house_canal_villa: {
        id: "house_canal_villa",
        category: "VILLA",
        label: "Spanish-Mediterranean Canal Villa",
        w1: 226, d1: 146, h1: 0.66,
        w2: 124, d2: 84,  h2: 0.48,
        w2OffsetX: 22, w2OffsetY: -8,
        roofStyle: "HIPPED_TERRACOTTA",
        roofOverhang: 10,
        roofPitch1: 0.25,
        roofPitch2: 0.19,
        frontWall1: "wall_canal_front",
        sideWall1: "wall_canal_side",
        upperWall: "wall_canal_upper",
        roofTex1: "house_canal_villa",
        roofTex2: "house_canal_villa_top",
        wallColor: [0.96, 0.86, 0.76],
        trimColor: [0.84, 0.72, 0.58],
        roofBaseColor: [0.80, 0.38, 0.24],
        roofRidgeColor: [0.94, 0.52, 0.34],
        hasPortico: true,
        porticoW: 68, porticoD: 24, porticoH: 0.60,
        mapColor: "#fed7aa",
        mapRoofColor: "#ea580c"
    },
    house_florida_bungalow: {
        id: "house_florida_bungalow",
        category: "BUNGALOW",
        label: "South Florida Pastel Conch Bungalow",
        w1: 198, d1: 136, h1: 0.60,
        w2: 96,  d2: 64,  h2: 0.28,
        roofStyle: "HIPPED_SHINGLE",
        roofOverhang: 10,
        roofPitch1: 0.24,
        roofPitch2: 0.16,
        frontWall1: "wall_bungalow_front",
        sideWall1: "wall_bungalow_side",
        upperWall: "wall_bungalow_side",
        roofTex1: "house_florida_bungalow",
        roofTex2: "house_florida_bungalow_top",
        wallColor: [0.86, 0.95, 0.90],
        trimColor: [0.97, 0.96, 0.93],
        roofBaseColor: [0.58, 0.38, 0.28],
        roofRidgeColor: [0.72, 0.48, 0.36],
        hasFrontPorch: true,
        porchD: 28,
        mapColor: "#a7f3d0",
        mapRoofColor: "#9a3412"
    },
    house_keys_stilt: {
        id: "house_keys_stilt",
        category: "STILT_HOUSE",
        label: "Leonida Keys Elevated Stilt Lodge",
        stiltH: 0.36,
        w1: 186, d1: 134, h1: 0.58,
        w2: 88,  d2: 62,  h2: 0.26,
        roofStyle: "HIPPED_METAL",
        roofOverhang: 11,
        roofPitch1: 0.25,
        roofPitch2: 0.16,
        frontWall1: "wall_keys_front",
        sideWall1: "wall_keys_side",
        upperWall: "wall_keys_side",
        roofTex1: "house_keys_stilt",
        roofTex2: "house_keys_stilt_top",
        wallColor: [0.42, 0.80, 0.84],
        trimColor: [0.96, 0.98, 0.99],
        stiltColor: [0.56, 0.38, 0.22],
        roofBaseColor: [0.68, 0.82, 0.86],
        roofRidgeColor: [0.88, 0.94, 0.96],
        hasStiltDeck: true,
        deckPad: 16,
        mapColor: "#67e8f9",
        mapRoofColor: "#0284c7"
    },
    villa_art_deco: {
        id: "villa_art_deco",
        category: "VILLA",
        label: "South Beach Tropical Art Deco Villa",
        w1: 216, d1: 144, h1: 0.66,
        w2: 120, d2: 78,  h2: 0.46,
        w2OffsetX: 0, w2OffsetY: -6,
        roofStyle: "FLAT_CANTILEVER",
        roofOverhang: 8,
        roofPitch1: 0.09,
        roofPitch2: 0.08,
        frontWall1: "wall_artdeco_front",
        sideWall1: "wall_artdeco_side",
        upperWall: "wall_artdeco_side",
        roofTex1: "roof_artdeco_terrazzo",
        roofTex2: "roof_artdeco_terrazzo",
        wallColor: [0.98, 0.95, 0.90],
        trimColor: [0.96, 0.52, 0.58],
        roofBaseColor: [0.94, 0.90, 0.85],
        roofRidgeColor: [0.44, 0.88, 0.81],
        hasPortico: true,
        porticoW: 64, porticoD: 22, porticoH: 0.58,
        hasGlassBalcony: true,
        mapColor: "#fbcfe8",
        mapRoofColor: "#ec4899"
    },
    shack_everglades_bayou: {
        id: "shack_everglades_bayou",
        category: "STILT_HOUSE",
        label: "Everglades Bayou Weathered Cypress Cabin",
        stiltH: 0.30,
        w1: 176, d1: 128, h1: 0.54,
        w2: 0,   d2: 0,   h2: 0.0,
        roofStyle: "HIPPED_METAL",
        roofOverhang: 10,
        roofPitch1: 0.22,
        roofPitch2: 0.0,
        frontWall1: "wall_shack_front",
        sideWall1: "wall_shack_side",
        upperWall: "wall_shack_side",
        roofTex1: "roof_rusted_tin",
        roofTex2: "roof_rusted_tin",
        wallColor: [0.46, 0.35, 0.25],
        trimColor: [0.34, 0.24, 0.16],
        stiltColor: [0.36, 0.26, 0.16],
        roofBaseColor: [0.58, 0.42, 0.32],
        roofRidgeColor: [0.48, 0.30, 0.20],
        hasStiltDeck: true,
        deckPad: 14,
        mapColor: "#a8a29e",
        mapRoofColor: "#78350f"
    },
    pavilion_tiki_club: {
        id: "pavilion_tiki_club",
        category: "LANDMARK_PROP",
        label: "3D Thatched Tiki Bar Pavilion",
        w1: 68, d1: 52, h1: 0.38,
        roofOverhang: 8,
        roofPitch1: 0.20
    },
    tower_lifeguard_3d: {
        id: "tower_lifeguard_3d",
        category: "LANDMARK_PROP",
        label: "3D Art Deco Beach Lifeguard Tower",
        stiltH: 0.24,
        w1: 42, d1: 38, h1: 0.34,
        roofOverhang: 5,
        roofPitch1: 0.14
    },
    industrial_refinery_stack: {
        id: "industrial_refinery_stack",
        category: "LANDMARK_PROP",
        label: "3D Allied Crystal Refinery Smokestack",
        w1: 28, d1: 28, h1: 0.85
    },
    sera_rocket_launchpad: {
        id: "sera_rocket_launchpad",
        category: "MONUMENT_3D",
        label: "SERA Space Center Launch Pad 39A & Rocket",
        w1: 120, d1: 120, h1: 2.15
    },
    port_gantry_crane_3d: {
        id: "port_gantry_crane_3d",
        category: "MONUMENT_3D",
        label: "3D Port Intermodal Hammerhead Gantry Crane",
        w1: 96, d1: 68, h1: 1.55
    },
    lighthouse_coastal_3d: {
        id: "lighthouse_coastal_3d",
        category: "MONUMENT_3D",
        label: "3D Leonida Coastal Lighthouse & Beacon",
        w1: 56, d1: 56, h1: 1.80
    },
    ferris_wheel_3d: {
        id: "ferris_wheel_3d",
        category: "MONUMENT_3D",
        label: "Vice Beach Pier 3D Neon Ferris Wheel",
        w1: 112, d1: 54, h1: 1.65
    }
};

class WorldObjectEngine {
    constructor(map) {
        this.map = map;
        this.instances = [];
        this.interactiveProps = [];
        this.streetProps = [];
        this.landmarks3D = {
            launchpad: { x: 458.5 * TILE_SIZE, y: 35.5 * TILE_SIZE, z: 2.0 },
            ferrisWheel: { x: 464.5 * TILE_SIZE, y: 194.5 * TILE_SIZE, z: 2.0 },
            lighthouses: [
                { id: "key_west_lh", x: 215.5 * TILE_SIZE, y: 476.5 * TILE_SIZE, z: 2.0, seed: 0.0 },
                { id: "cape_leonida_lh", x: 464.5 * TILE_SIZE, y: 134.5 * TILE_SIZE, z: 2.0, seed: 2.4 }
            ],
            gantryCranes: [
                { x: 336.8 * TILE_SIZE, y: 328.0 * TILE_SIZE, z: 2.0, ang: 0 },
                { x: 336.8 * TILE_SIZE, y: 333.0 * TILE_SIZE, z: 2.0, ang: 0 },
                { x: 57.2 * TILE_SIZE,  y: 208.5 * TILE_SIZE, z: 2.0, ang: Math.PI },
                { x: 57.2 * TILE_SIZE,  y: 240.5 * TILE_SIZE, z: 2.0, ang: Math.PI }
            ]
        };
        this.meshVbo = null;
        this.meshVertexCount = 0;
        this.dynVbo = null;
        this.meshProg = null;
        this.meshLocs = null;
        this.vehiclesSpawned = false;
        this.interiorsRegistered = false;
        this.streetPropsGenerated = false;
    }

    getPrefab(kind) {
        return PREFAB_CATALOG[kind] || PREFAB_CATALOG.house_canal_villa;
    }

    /* ========================================================================
       1. TOPOGRAPHICAL LOT SCANNER, ROAD CLEARANCE & WATERFRONT PIER SNAPPER
       ======================================================================== */
    validateAndPrepareLots() {
        const map = this.map;
        if (!map || !Array.isArray(map.residentialHouses)) return;

        this.instances = [];
        this.interactiveProps = [];
        const M = MAP_COLS;

        const isDeepWater = (c, r) => {
            if (c < 2 || c >= M - 2 || r < 2 || r >= MAP_ROWS - 2) return false;
            if (map.surfaceGround[r * M + c] !== GROUND_TYPE.WATER) return false;
            return (
                map.surfaceGround[r * M + (c - 1)] === GROUND_TYPE.WATER &&
                map.surfaceGround[r * M + (c + 1)] === GROUND_TYPE.WATER &&
                map.surfaceGround[(r - 1) * M + c] === GROUND_TYPE.WATER &&
                map.surfaceGround[(r + 1) * M + c] === GROUND_TYPE.WATER
            );
        };

        for (let i = 0; i < map.residentialHouses.length; i++) {
            const raw = map.residentialHouses[i];
            const spec = this.getPrefab(raw.kind);
            const sc = raw.scale || 1.0;

            const hw = Math.max(raw.hw || 0, (spec.w1 * 0.5 + spec.roofOverhang) * sc);
            const hh = Math.max(raw.hh || 0, (spec.d1 * 0.5 + spec.roofOverhang) * sc);
            const ang = raw.ang || 0;
            const cosA = Math.cos(ang);
            const sinA = Math.sin(ang);

            const extX = Math.abs(cosA) * hw + Math.abs(sinA) * hh;
            const extY = Math.abs(sinA) * hw + Math.abs(cosA) * hh;

            let wx = raw.x !== undefined ? raw.x : raw.c * TILE_SIZE;
            let wy = raw.y !== undefined ? raw.y : raw.r * TILE_SIZE;

            if (map.surfaceGround) {
                for (let iter = 0; iter < 4; iter++) {
                    const minC = Math.max(2, Math.floor((wx - extX - 16) / TILE_SIZE));
                    const maxC = Math.min(M - 3, Math.floor((wx + extX + 16) / TILE_SIZE));
                    const minR = Math.max(2, Math.floor((wy - extY - 16) / TILE_SIZE));
                    const maxR = Math.min(MAP_ROWS - 3, Math.floor((wy + extY + 16) / TILE_SIZE));
                    let pushX = 0;
                    let pushY = 0;
                    let roadHits = 0;
                    for (let r = minR; r <= maxR; r++) {
                        for (let c = minC; c <= maxC; c++) {
                            if (map.surfaceGround[r * M + c] === GROUND_TYPE.ROAD) {
                                const rcx = (c + 0.5) * TILE_SIZE;
                                const rcy = (r + 0.5) * TILE_SIZE;
                                const dx = wx - rcx;
                                const dy = wy - rcy;
                                const d = Math.hypot(dx, dy) || 1.0;
                                pushX += (dx / d);
                                pushY += (dy / d);
                                roadHits++;
                            }
                        }
                    }
                    if (roadHits === 0) break;
                    const pLen = Math.hypot(pushX, pushY) || 1.0;
                    wx += (pushX / pLen) * 14.0;
                    wy += (pushY / pLen) * 14.0;
                }
            }

            raw.x = wx;
            raw.y = wy;
            raw.c = wx / TILE_SIZE;
            raw.r = wy / TILE_SIZE;
            raw.hw = hw;
            raw.hh = hh;

            if (map.voxelGrid && map.surfaceGround && map.surfaceLayer) {
                const minC = Math.max(2, Math.floor((wx - extX - 24) / TILE_SIZE));
                const maxC = Math.min(M - 3, Math.floor((wx + extX + 24) / TILE_SIZE));
                const minR = Math.max(2, Math.floor((wy - extY - 24) / TILE_SIZE));
                const maxR = Math.min(MAP_ROWS - 3, Math.floor((wy + extY + 24) / TILE_SIZE));
                for (let r = minR; r <= maxR; r++) {
                    for (let c = minC; c <= maxC; c++) {
                        const idx = r * M + c;
                        if (map.surfaceGround[idx] === GROUND_TYPE.BUILDING) {
                            for (let z = 0; z < MAP_LAYERS; z++) {
                                map.voxelGrid[(z * MAP_ROWS + r) * M + c] =
                                    map.voxelGrid[(z * MAP_ROWS + 165) * M + 339];
                            }
                            map.surfaceGround[idx] = GROUND_TYPE.FIELD;
                            map.surfaceLayer[idx] = 2;
                        }
                    }
                }
            }

            const clearRad = Math.max(hw, hh) + 46;
            if (Array.isArray(map.vicePalms)) {
                map.vicePalms = map.vicePalms.filter(p => Math.hypot(p.x - wx, p.y - wy) > clearRad);
            }
            if (Array.isArray(map.trees)) {
                map.trees = map.trees.filter(t => Math.hypot(t.x - wx, t.y - wy) > clearRad);
            }

            let validPool = null;
            if (raw.pool && map.surfaceGround) {
                const pl = raw.pool;
                const px = wx + cosA * pl.dx - sinA * pl.dy;
                const py = wy + sinA * pl.dx + cosA * pl.dy;
                const pc = Math.floor(px / TILE_SIZE);
                const pr = Math.floor(py / TILE_SIZE);
                const pgt = (pc >= 0 && pc < M && pr >= 0 && pr < MAP_ROWS) ? map.surfaceGround[pr * M + pc] : 0;
                if (pgt === GROUND_TYPE.FIELD || pgt === GROUND_TYPE.PAWEMENT) {
                    validPool = { ...pl, worldX: px, worldY: py };
                }
            }

            let validBoat = null;
            if (raw.dockBoat && map.surfaceGround) {
                const db = raw.dockBoat;
                let bx = wx + cosA * db.dx - sinA * db.dy;
                let by = wy + sinA * db.dx + cosA * db.dy;
                let bc = Math.floor(bx / TILE_SIZE);
                let br = Math.floor(by / TILE_SIZE);

                if (!isDeepWater(bc, br)) {
                    let bestW = null;
                    for (let rad = 1; rad <= 10; rad++) {
                        for (let dr = -rad; dr <= rad; dr++) {
                            for (let dc = -rad; dc <= rad; dc++) {
                                if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
                                const nc = bc + dc;
                                const nr = br + dr;
                                if (isDeepWater(nc, nr)) {
                                    const dist = Math.hypot((nc + 0.5) * TILE_SIZE - bx, (nr + 0.5) * TILE_SIZE - by);
                                    if (!bestW || dist < bestW.dist) {
                                        bestW = { c: nc, r: nr, dist };
                                    }
                                }
                            }
                        }
                        if (bestW) break;
                    }
                    if (bestW) {
                        bc = bestW.c;
                        br = bestW.r;
                        bx = (bc + 0.5) * TILE_SIZE;
                        by = (br + 0.5) * TILE_SIZE;
                    }
                }

                if (isDeepWater(bc, br)) {
                    const dirX = bx - wx;
                    const dirY = by - wy;
                    const dirLen = Math.hypot(dirX, dirY) || 1.0;
                    const ux = dirX / dirLen;
                    const uy = dirY / dirLen;
                    let shoreX = bx - ux * 58.0;
                    let shoreY = by - uy * 58.0;
                    for (let step = 36; step < dirLen - 20; step += 12) {
                        const tx = wx + ux * step;
                        const ty = wy + uy * step;
                        const tc = Math.floor(tx / TILE_SIZE);
                        const tr = Math.floor(ty / TILE_SIZE);
                        if (tc >= 0 && tc < M && tr >= 0 && tr < MAP_ROWS) {
                            if (map.surfaceGround[tr * M + tc] === GROUND_TYPE.WATER) {
                                shoreX = tx - ux * 10.0;
                                shoreY = ty - uy * 10.0;
                                break;
                            }
                        }
                    }
                    const pierEndX = bx - ux * 16.0;
                    const pierEndY = by - uy * 16.0;
                    const pierMidX = (shoreX + pierEndX) * 0.5;
                    const pierMidY = (shoreY + pierEndY) * 0.5;
                    const pierLen = Math.min(180, Math.max(42, Math.hypot(pierEndX - shoreX, pierEndY - shoreY)));
                    const pierAng = Math.atan2(pierEndY - shoreY, pierEndX - shoreX);

                    validBoat = {
                        spr: db.spr || "speedboat_v8",
                        worldX: bx,
                        worldY: by,
                        worldAng: pierAng + Math.PI * 0.5,
                        pierMidX,
                        pierMidY,
                        pierLen,
                        pierAng
                    };
                }
            }

            const totalHeightBlocks =
                (spec.stiltH || 0) +
                spec.h1 * sc +
                (spec.h2 || 0) * sc +
                (spec.roofPitch1 || 0.2) * sc +
                (spec.roofPitch2 || 0) * sc;

            const inst = {
                id: raw.id || `estate_${i}`,
                name: raw.name || spec.label,
                district: raw.district || "VICE CITY",
                kind: raw.kind,
                spec,
                x: wx,
                y: wy,
                z: raw.z || 2.0,
                ang,
                scale: sc,
                hw,
                hh,
                extX,
                extY,
                totalHeightBlocks,
                pool: validPool,
                drivewayCars: Array.isArray(raw.drivewayCars) ? raw.drivewayCars : [],
                dockBoat: validBoat,
                interiorSpec: raw.interior || null
            };
            this.instances.push(inst);

            if (validPool) {
                const pAng = ang + (validPool.ang || 0);
                const pSc = validPool.scale || 0.90;
                const csP = Math.cos(pAng);
                const snP = Math.sin(pAng);
                const ux = validPool.worldX + csP * (-58 * pSc);
                const uy = validPool.worldY + snP * (-58 * pSc);
                this.interactiveProps.push({
                    x: ux, y: uy, z: inst.z || 2.0,
                    vx: 0, vy: 0, vz: 0, ang: i * 0.7, vang: 0,
                    spr: "beach_umbrella_pink", scale: 1.05, broken: false, timer: 0
                });
                for (let li = -1; li <= 1; li += 2) {
                    const lx = validPool.worldX + csP * (-58 * pSc) - snP * (li * 18 * pSc);
                    const ly = validPool.worldY + snP * (-58 * pSc) + csP * (li * 18 * pSc);
                    this.interactiveProps.push({
                        x: lx, y: ly, z: inst.z || 2.0,
                        vx: 0, vy: 0, vz: 0, ang: pAng, vang: 0,
                        spr: "beach_lounger", scale: 1.02, broken: false, timer: 0
                    });
                }
            }
        }

        this.registerEstateInteriors();
        this.generate3DStreetProps();
        this.initVillaHeists();
    }

    /* ========================================================================
       1B. REGISTER WALKABLE LUXURY INTERIORS AT 3D PORTICO FRONT DOORS
       ======================================================================== */
    registerEstateInteriors() {
        const map = this.map;
        if (!map || !Array.isArray(map.interiors) || this.interiorsRegistered) return;
        this.interiorsRegistered = true;

        const findInst = (id) => this.instances.find(it => it.id === id);
        const computePorticoDoor = (inst) => {
            const cosA = Math.cos(inst.ang);
            const sinA = Math.sin(inst.ang);
            const frontDist = (inst.spec.d1 * 0.5 + (inst.spec.porticoD || 26) + 18) * inst.scale;
            const facing = Math.abs(inst.ang) > 2.0 ? "N" : (inst.ang < -0.8 ? "E" : "S");
            return {
                doorX: inst.x - sinA * frontDist,
                doorY: inst.y + cosA * frontDist,
                facing
            };
        };

        const vercetti = findInst("star_vercetti_palazzo");
        const starIntr = map.interiors.find(it => it.id === "STAR_ISLAND");
        if (vercetti && starIntr) {
            const pt = computePorticoDoor(vercetti);
            starIntr.doorX = pt.doorX;
            starIntr.doorY = pt.doorY;
            starIntr.facing = pt.facing;
        }

        const estateDoors = [
            {
                instId: "star_south_palazzo",
                id: "ESTATE_STAR_SOUTH",
                name: "🏛️ VILLA DI LEONIDA (SOUTH STAR ISLAND PALAZZO)",
                subtitle: "CARRARA MARBLE ATRIUM, PRIVATE YACHT HARBOR VAULT & INDOOR JACUZZI",
                theme: "MANSION",
                accent: "#f59e0b",
                matRGB: [0.96, 0.62, 0.04]
            },
            {
                instId: "venetian_south_palazzo",
                id: "ESTATE_VENETIAN_PALAZZO",
                name: "🏛️ CASA BELLA VENETIAN WATERFRONT PALAZZO",
                subtitle: "VENETIAN CAUSEWAY FOYER, SMUGGLER ARMORY & MARBLE SPA",
                theme: "MANSION",
                accent: "#fb923c",
                matRGB: [0.98, 0.55, 0.18]
            },
            {
                instId: "sobe_artdeco_villa_1",
                id: "ESTATE_SOBE_ARTDECO",
                name: "🦩 FLAMINGO COURT ART DECO BOUTIQUE VILLA",
                subtitle: "TERRAZZO LOBBY, NEON PENTHOUSE SUITE & DESIGNER WARDROBE",
                theme: "SHOP_HOTEL",
                accent: "#f472b6",
                matRGB: [0.96, 0.28, 0.68]
            },
            {
                instId: "shores_modern_villa",
                id: "ESTATE_SHORES_MODERN",
                name: "💎 GOLDEN GLADES MODERNIST GLASS PENTHOUSE",
                subtitle: "MINIMALIST TRAVERTINE GALLERY, VIP BAR & SECURITY SAFE",
                theme: "MANSION",
                accent: "#38bdf8",
                matRGB: [0.22, 0.74, 0.98]
            },
            {
                instId: "keys_stilt_islamorada",
                id: "ESTATE_KEYS_ISLAMORADA",
                name: "🌴 ISLAMORADA CONCH STILT LODGE & RUM LOUNGE",
                subtitle: "CARIBBEAN TEAK DECK LOUNGE, BILLIARDS & RUM SMUGGLER STASH",
                theme: "SHOP_BAR",
                accent: "#2dd4bf",
                matRGB: [0.18, 0.84, 0.75]
            },
            {
                instId: "lake_bayou_shack",
                id: "ESTATE_BAYOU_SHACK",
                name: "🐊 GATOR BAYOU SMUGGLER'S CABIN",
                subtitle: "CYPRESS SWAMP ARMORY, MOONSHINE BAR & AIRBOAT DOCK",
                theme: "SHOP_GUN_SHOP",
                accent: "#a3e635",
                matRGB: [0.64, 0.90, 0.21]
            }
        ];

        const baseMansion = starIntr || map.interiors[0];
        for (const ed of estateDoors) {
            const inst = findInst(ed.instId);
            if (!inst || map.interiors.some(it => it.id === ed.id)) continue;
            const pt = computePorticoDoor(inst);
            const tpl = (window.ShopInteriors && window.ShopInteriors.TEMPLATES && window.ShopInteriors.TEMPLATES[ed.theme.replace("SHOP_", "")]) || null;
            map.interiors.push({
                id: ed.id,
                name: ed.name,
                subtitle: ed.subtitle,
                theme: ed.theme,
                accent: ed.accent,
                matRGB: ed.matRGB,
                facing: pt.facing,
                doorX: pt.doorX,
                doorY: pt.doorY,
                w: 800,
                h: 540,
                npcs: tpl ? tpl.npcs.map(n => ({ ...n })) : (baseMansion ? baseMansion.npcs.map(n => ({ ...n })) : []),
                stations: tpl ? tpl.stations() : (baseMansion ? baseMansion.stations.map(s => ({ ...s })) : [])
            });
        }
    }

    /* ========================================================================
       1D. GTA 6 CARTEL & VILLA HEISTS (HOME INVASION, 3D LASER GRIDS,
           KEYPAD HACKING, 3D ARMORED VAULTS & MARINE SPEEDBOAT GETAWAYS)
       ======================================================================== */
    initVillaHeists() {
        if (this.villaHeistsInitialized) return;
        this.villaHeistsInitialized = true;
        this.heistTargets = [];
        this.activeHeist = null;

        const specs = [
            {
                instId: "star_vercetti_palazzo",
                interiorId: "STAR_ISLAND",
                title: "OPÉRATION SCARFACE — PALAZZO DE LA ROSA",
                lootCash: 25000,
                bonusWeapon: "ROCKET_LAUNCHER",
                bonusAmmo: 8
            },
            {
                instId: "star_south_palazzo",
                interiorId: "ESTATE_STAR_SOUTH",
                title: "BRAQUAGE DU CARTEL — VILLA DI LEONIDA",
                lootCash: 22000,
                bonusWeapon: "UZI",
                bonusAmmo: 120
            },
            {
                instId: "venetian_south_palazzo",
                interiorId: "ESTATE_VENETIAN_PALAZZO",
                title: "HOME INVASION — CASA BELLA VENETIAN",
                lootCash: 18500,
                bonusWeapon: "SHOTGUN",
                bonusAmmo: 30
            },
            {
                instId: "sobe_artdeco_villa_1",
                interiorId: "ESTATE_SOBE_ARTDECO",
                title: "CASSE ART DÉCO — FLAMINGO COURT",
                lootCash: 16500,
                bonusWeapon: "UZI",
                bonusAmmo: 90
            },
            {
                instId: "shores_modern_villa",
                interiorId: "ESTATE_SHORES_MODERN",
                title: "RAID HAUTE SÉCURITÉ — PENTHOUSE GOLDEN GLADES",
                lootCash: 20000,
                bonusWeapon: "FLAMETHROWER",
                bonusAmmo: 60
            },
            {
                instId: "keys_stilt_islamorada",
                interiorId: "ESTATE_KEYS_ISLAMORADA",
                title: "RAID DES KEYS — PLANQUE D'ISLAMORADA",
                lootCash: 15000,
                bonusWeapon: "SHOTGUN",
                bonusAmmo: 24
            }
        ];

        for (let i = 0; i < specs.length; i++) {
            const sp = specs[i];
            const inst = this.instances.find(it => it.id === sp.instId);
            if (!inst) continue;

            const sc = inst.scale || 1.0;
            const cosA = Math.cos(inst.ang);
            const sinA = Math.sin(inst.ang);
            const toWorld = (lx, ly) => ({
                x: inst.x + cosA * (lx * sc) - sinA * (ly * sc),
                y: inst.y + sinA * (lx * sc) + cosA * (ly * sc)
            });

            const pW = inst.spec.porticoW || 56;
            const pD = inst.spec.porticoD || 26;
            const frontY = inst.spec.d1 * 0.5 + pD + 8;

            const kpPos = toWorld(pW * 0.5 + 16, frontY - 4);
            const lsPos = toWorld(0, frontY);
            const vtPos = toWorld(0, -inst.spec.d1 * 0.5 - 24);
            const g1Pos = toWorld(-pW * 0.65 - 18, frontY + 14);
            const g2Pos = toWorld(pW * 0.65 + 18, -inst.spec.d1 * 0.45);

            this.heistTargets.push({
                ...sp,
                inst,
                hacked: false,
                alarmTripped: false,
                looted: false,
                cooldown: 0,
                keypadX: kpPos.x,
                keypadY: kpPos.y,
                laserX: lsPos.x,
                laserY: lsPos.y,
                laserW: (pW + 14) * sc,
                vaultX: vtPos.x,
                vaultY: vtPos.y,
                guards: [
                    { baseX: g1Pos.x, baseY: g1Pos.y, x: g1Pos.x, y: g1Pos.y, ang: inst.ang + Math.PI * 0.5, phase: i * 1.1 },
                    { baseX: g2Pos.x, baseY: g2Pos.y, x: g2Pos.x, y: g2Pos.y, ang: inst.ang - Math.PI * 0.5, phase: i * 1.1 + 3.14 }
                ]
            });
        }
    }

    startHeistEscape(game, ht, sourceLabel) {
        if (!game || !ht) return;
        ht.looted = true;
        ht.cooldown = 150.0;
        const stealthBonus = (!ht.alarmTripped && ht.hacked) ? 5000 : 0;
        const totalTake = ht.lootCash + stealthBonus;

        if (typeof game.addScore === "function") game.addScore(totalTake);
        if (game.player) {
            game.player.armor = Math.max(game.player.armor || 0, 100);
            if (ht.bonusWeapon && typeof game.player.giveWeapon === "function") {
                game.player.giveWeapon(ht.bonusWeapon, ht.bonusAmmo || 30);
            }
        }
        if (game.wantedSystem && typeof game.wantedSystem.addChaos === "function") {
            game.wantedSystem.addChaos(ht.hacked ? 120 : 280, "VILLA_HEIST", game);
            if (!ht.hacked && (game.wantedSystem.level || 0) < 3) {
                game.wantedSystem.level = 3;
            }
        }
        ht.alarmTripped = true;

        this.activeHeist = {
            target: ht,
            title: ht.title,
            bagCash: totalTake,
            escapeRadius: 430,
            timer: 0
        };

        if (game.audio) game.audio.playPickup("WEAPON");
        if (Array.isArray(game.floatingTexts) && game.player) {
            game.floatingTexts.push({
                x: game.player.x,
                y: game.player.y,
                z: 2.65,
                text: `💰 ${sourceLabel}: +$${totalTake.toLocaleString()}! ESCAPE THE ESTATE!`,
                color: "#fde047",
                life: 3.0
            });
        }
    }

    onInteriorVaultCracked(game, intr) {
        if (!game || !intr || !this.heistTargets) return;
        const ht = this.heistTargets.find(t => t.interiorId === intr.id);
        if (!ht || ht.looted) return;
        this.startHeistEscape(game, ht, "INTERIOR VAULT CRACKED");
    }

    tryTriggerHeistAction(game) {
        if (!game || !game.player || game.player.inVehicle || game.activeInterior) return false;
        if (!this.heistTargets || this.heistTargets.length === 0) return false;
        const px = game.player.x;
        const py = game.player.y;

        for (let i = 0; i < this.heistTargets.length; i++) {
            const ht = this.heistTargets[i];

            // 1. Marine Speedboat / Jet-Ski Getaway on the 3D Waterfront Pier!
            if (ht.inst.dockBoat) {
                const db = ht.inst.dockBoat;
                const dBoat = Math.hypot(px - db.worldX, py - db.worldY);
                const dPier = Math.hypot(px - db.pierMidX, py - db.pierMidY);
                if (dBoat < 64 || (this.activeHeist && this.activeHeist.target === ht && dPier < 75)) {
                    const ux = Math.cos(db.pierAng);
                    const uy = Math.sin(db.pierAng);
                    game.player.x = db.worldX + ux * 42;
                    game.player.y = db.worldY + uy * 42;
                    if (this.activeHeist && this.activeHeist.target === ht) {
                        if (typeof game.addScore === "function") game.addScore(7500);
                        if (game.wantedSystem) game.wantedSystem.level = Math.max(0, (game.wantedSystem.level || 0) - 2);
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: game.player.x,
                                y: game.player.y,
                                z: 2.75,
                                text: `🚤 MARINE SPEEDBOAT GETAWAY! +$7,500 CLEAN ESCAPE!`,
                                color: "#2dd4bf",
                                life: 3.2
                            });
                        }
                        this.activeHeist = null;
                    } else {
                        if (typeof game.addScore === "function") game.addScore(500);
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: game.player.x,
                                y: game.player.y,
                                z: 2.55,
                                text: `🚤 PIER SPEEDBOAT LAUNCH! +$500`,
                                color: "#38bdf8",
                                life: 1.8
                            });
                        }
                    }
                    if (game.audio) game.audio.playPickup("SCORE");
                    return true;
                }
            }

            if (ht.looted) continue;

            // 2. Hack 3D Security Laser Keypad Box
            if (!ht.hacked && Math.hypot(px - ht.keypadX, py - ht.keypadY) < 48) {
                ht.hacked = true;
                ht.alarmTripped = false;
                if (typeof game.addScore === "function") game.addScore(1500);
                if (game.audio) game.audio.playPickup("SCORE");
                if (Array.isArray(game.floatingTexts)) {
                    game.floatingTexts.push({
                        x: ht.keypadX,
                        y: ht.keypadY,
                        z: 2.55,
                        text: `🔓 LASER GRID HACKED! +$1,500 (STEALTH BONUS UNLOCKED)`,
                        color: "#4ade80",
                        life: 2.4
                    });
                }
                return true;
            }

            // 3. Crack Exterior 3D Armored Cartel Vault on Terrace
            if (Math.hypot(px - ht.vaultX, py - ht.vaultY) < 54) {
                this.startHeistEscape(game, ht, "3D CARTEL VAULT LOOTED");
                return true;
            }
        }
        return false;
    }

    updateHeists(game, dt) {
        if (!game || !this.heistTargets) return;
        const p = game.player;
        const px = p ? (p.car ? p.car.x : p.x) : 0;
        const py = p ? (p.car ? p.car.y : p.y) : 0;
        const t = performance.now() * 0.001;

        for (let i = 0; i < this.heistTargets.length; i++) {
            const ht = this.heistTargets[i];
            if (ht.looted) {
                ht.cooldown = Math.max(0, ht.cooldown - dt);
                if (ht.cooldown <= 0 && Math.hypot(px - ht.inst.x, py - ht.inst.y) > 650) {
                    ht.looted = false;
                    ht.hacked = false;
                    ht.alarmTripped = false;
                }
            }

            // Patrol Cartel Bodyguards around the villa perimeter
            for (let gi = 0; gi < ht.guards.length; gi++) {
                const g = ht.guards[gi];
                const speed = ht.alarmTripped ? 2.8 : 1.1;
                const rad = ht.alarmTripped ? 26.0 : 18.0;
                const nx = g.baseX + Math.cos(t * speed + g.phase) * rad;
                const ny = g.baseY + Math.sin(t * speed + g.phase) * rad;
                g.ang = Math.atan2(ny - g.y, nx - g.x);
                g.x = nx;
                g.y = ny;
            }

            // Check if player walks through unhacked 3D Red Laser Security Grid
            if (p && !p.inVehicle && !game.activeInterior && !ht.hacked && !ht.alarmTripped && !ht.looted) {
                if (Math.hypot(p.x - ht.laserX, p.y - ht.laserY) < 28) {
                    ht.alarmTripped = true;
                    if (game.wantedSystem) {
                        game.wantedSystem.addChaos(180, "VILLA_ALARM", game);
                        if ((game.wantedSystem.level || 0) < 2) game.wantedSystem.level = 2;
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: ht.laserX,
                            y: ht.laserY,
                            z: 2.65,
                            text: `🚨 CARTEL LASER ALARM TRIPPED! GUARDS ALERTED!`,
                            color: "#ef4444",
                            life: 2.6
                        });
                    }
                }
            }
        }

        // Update Active Villa Heist Escape Phase
        if (this.activeHeist && p && !game.activeInterior) {
            this.activeHeist.timer += dt;
            const ht = this.activeHeist.target;
            const dist = Math.hypot(px - ht.inst.x, py - ht.inst.y);
            if (dist > this.activeHeist.escapeRadius) {
                const escapeBonus = (p.inVehicle && p.car && p.car.isEstateCar) ? 8000 : 5000;
                const bonusText = (p.inVehicle && p.car && p.car.isEstateCar)
                    ? `🏎️ SUPERCAR HEIST GETAWAY COMPLETE! +$${escapeBonus.toLocaleString()}!`
                    : `🏆 VILLA HEIST ESCAPE COMPLETE! +$${escapeBonus.toLocaleString()}!`;
                if (typeof game.addScore === "function") game.addScore(escapeBonus);
                if (game.audio) game.audio.playPickup("WEAPON");
                if (Array.isArray(game.floatingTexts)) {
                    game.floatingTexts.push({
                        x: px,
                        y: py,
                        z: 2.75,
                        text: bonusText,
                        color: "#4ade80",
                        life: 3.4
                    });
                }
                this.activeHeist = null;
            }
        }
    }

    /* ========================================================================
       1C. GENERATE 180+ VERIFIED 3D DESTRUCTIBLE SIDEWALK FURNITURE PROPS
       (Fire Hydrants with 3D Water Geysers, Art Deco Neon Streetlights,
        Glass Payphone Booths & Newspaper Stands along Curb Edges)
       ======================================================================== */
    generate3DStreetProps() {
        const map = this.map;
        if (!map || !map.surfaceGround || this.streetPropsGenerated) return;
        this.streetPropsGenerated = true;
        this.streetProps = [];

        const M = MAP_COLS;
        const g = map.surfaceGround;
        const kinds = ["STREETLIGHT_NEON", "HYDRANT", "STREETLIGHT_NEON", "NEWS_STAND", "PAYPHONE_BOOTH", "HYDRANT"];
        let kIdx = 0;

        // Scan sidewalk curb tiles (PAWEMENT adjacent to ROAD) with deterministic spacing
        for (let r = 24; r < MAP_ROWS - 24; r += 7) {
            for (let c = 24; c < M - 24; c += 7) {
                if (this.streetProps.length >= 210) break;
                const idx = r * M + c;
                if (g[idx] !== GROUND_TYPE.PAWEMENT) continue;
                // Check which neighbor is a ROAD tile so we place the prop near the curb facing the street
                let curbDx = 0, curbDy = 0, armAng = 0, hasRoad = false;
                if (g[r * M + (c + 1)] === GROUND_TYPE.ROAD) {
                    curbDx = 18; curbDy = 0; armAng = 0; hasRoad = true;
                } else if (g[r * M + (c - 1)] === GROUND_TYPE.ROAD) {
                    curbDx = -18; curbDy = 0; armAng = Math.PI; hasRoad = true;
                } else if (g[(r + 1) * M + c] === GROUND_TYPE.ROAD) {
                    curbDx = 0; curbDy = 18; armAng = Math.PI * 0.5; hasRoad = true;
                } else if (g[(r - 1) * M + c] === GROUND_TYPE.ROAD) {
                    curbDx = 0; curbDy = -18; armAng = -Math.PI * 0.5; hasRoad = true;
                }
                if (!hasRoad) continue;

                const px = (c + 0.5) * TILE_SIZE + curbDx;
                const py = (r + 0.5) * TILE_SIZE + curbDy;

                // Ensure not blocking any interior door
                if (Array.isArray(map.interiors) && map.interiors.some(it => Math.hypot(it.doorX - px, it.doorY - py) < 52)) {
                    continue;
                }

                const kind = kinds[kIdx % kinds.length];
                kIdx++;
                this.streetProps.push({
                    id: `stprop_${kIdx}`,
                    kind,
                    homeX: px,
                    homeY: py,
                    x: px,
                    y: py,
                    z: 2.0,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                    ang: armAng,
                    vang: 0,
                    broken: false,
                    timer: 0,
                    geyserTimer: 0,
                    neonPink: (kIdx % 2 === 0)
                });
            }
        }
    }

    /* ========================================================================
       2. INJECT 3D ROOF & LANDMARK HEIGHTS INTO RAY-MARCHED SOLAR LIGHTMAP
       ======================================================================== */
    applyToElevationMap(colTopElev) {
        if (!colTopElev || !this.instances || this.instances.length === 0) return;
        const M = MAP_COLS;
        for (let i = 0; i < this.instances.length; i++) {
            const inst = this.instances[i];
            const cosA = Math.cos(inst.ang);
            const sinA = Math.sin(inst.ang);
            const hw = inst.spec.w1 * 0.5 * inst.scale;
            const hd = inst.spec.d1 * 0.5 * inst.scale;
            const minC = Math.max(1, Math.floor((inst.x - inst.extX) / TILE_SIZE));
            const maxC = Math.min(M - 2, Math.ceil((inst.x + inst.extX) / TILE_SIZE));
            const minR = Math.max(1, Math.floor((inst.y - inst.extY) / TILE_SIZE));
            const maxR = Math.min(MAP_ROWS - 2, Math.ceil((inst.y + inst.extY) / TILE_SIZE));
            const topY = (inst.z || 2.0) + inst.totalHeightBlocks;

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const px = (c + 0.5) * TILE_SIZE - inst.x;
                    const py = (r + 0.5) * TILE_SIZE - inst.y;
                    const lx = px * cosA + py * sinA;
                    const ly = -px * sinA + py * cosA;
                    if (Math.abs(lx) <= hw && Math.abs(ly) <= hd) {
                        const idx = r * M + c;
                        if (topY > colTopElev[idx]) {
                            colTopElev[idx] = topY;
                        }
                    }
                }
            }
        }
        // Inject 3D Coastal Lighthouses & SERA Launchpad into solar shadow map
        const stampTower = (wx, wy, radTiles, topElev) => {
            const c0 = Math.round(wx / TILE_SIZE);
            const r0 = Math.round(wy / TILE_SIZE);
            for (let dr = -radTiles; dr <= radTiles; dr++) {
                for (let dc = -radTiles; dc <= radTiles; dc++) {
                    const c = c0 + dc, r = r0 + dr;
                    if (c >= 1 && c < M - 1 && r >= 1 && r < MAP_ROWS - 1) {
                        const idx = r * M + c;
                        if (topElev > colTopElev[idx]) colTopElev[idx] = topElev;
                    }
                }
            }
        };
        if (this.landmarks3D) {
            if (this.landmarks3D.launchpad) stampTower(this.landmarks3D.launchpad.x, this.landmarks3D.launchpad.y, 1, 4.1);
            for (const lh of this.landmarks3D.lighthouses) stampTower(lh.x, lh.y, 1, 3.8);
        }
    }

    /* ========================================================================
       3. SPAWN REAL INTERACTIVE DRIVABLE VEHICLES IN ESTATE DRIVEWAYS
       ======================================================================== */
    spawnPrefabVehicles(game) {
        if (!game || !Array.isArray(game.vehicles) || this.vehiclesSpawned) return;
        this.vehiclesSpawned = true;

        const sprToSpec = {
            0: "BANSHEE_GT",
            1: "STINGER_CABRIO",
            4: "CHALLENGER_RT",
            6: "TURISMO_CABRIO",
            13: "TULIP_MUSCLE",
            25: "GATOR_4X4"
        };

        for (let i = 0; i < this.instances.length; i++) {
            const inst = this.instances[i];
            if (!inst.drivewayCars || inst.drivewayCars.length === 0) continue;
            const cosA = Math.cos(inst.ang);
            const sinA = Math.sin(inst.ang);
            const bz = (this.map && typeof this.map.getHeightAtPixel === "function")
                ? this.map.getHeightAtPixel(inst.x, inst.y, 4.0)
                : (inst.z || 2.0);

            for (let ci = 0; ci < inst.drivewayCars.length; ci++) {
                const dc = inst.drivewayCars[ci];
                const vx = inst.x + cosA * dc.dx - sinA * dc.dy;
                const vy = inst.y + sinA * dc.dx + cosA * dc.dy;
                const vang = inst.ang + (dc.ang || 0);
                const specKey = dc.spec || sprToSpec[dc.sprIdx] || "STINGER_CABRIO";

                const exists = game.vehicles.some(v => Math.hypot(v.x - vx, v.y - vy) < 28);
                if (exists) continue;

                if (typeof Vehicle === "function") {
                    const v = new Vehicle(`estate_${inst.id}_car_${ci}`, specKey, vx, vy, vang);
                    v.z = bz;
                    v.missionTag = "LANDMARK";
                    v.isEstateCar = true;
                    game.vehicles.push(v);
                }
            }
        }
    }

    /* ========================================================================
       3B. DESTRUCTIBLE / INTERACTIVE WORLD PROP & STREET FURNITURE PHYSICS
       ======================================================================== */
    updateAndCollideProps(game, dt) {
        if (!game) return;
        const player = game.player;
        const pCar = player && player.car ? player.car : null;

        // 1. Poolside & Terrace Props
        for (let i = 0; i < this.interactiveProps.length; i++) {
            const pr = this.interactiveProps[i];
            if (pr.broken) {
                pr.timer += dt;
                pr.x += pr.vx * dt;
                pr.y += pr.vy * dt;
                pr.vx *= Math.pow(0.18, dt);
                pr.vy *= Math.pow(0.18, dt);
                pr.ang += pr.vang * dt;
                pr.vang *= Math.pow(0.25, dt);
                if (pr.timer > 18.0) {
                    pr.broken = false;
                    pr.timer = 0;
                    pr.vx = 0;
                    pr.vy = 0;
                }
                continue;
            }
            if (pCar && Math.hypot(pCar.x - pr.x, pCar.y - pr.y) < 34) {
                const spd = Math.hypot(pCar.vx || 0, pCar.vy || 0) || Math.abs(pCar.speed || 0);
                if (spd > 35) {
                    pr.broken = true;
                    pr.timer = 0;
                    const dx = pr.x - pCar.x;
                    const dy = pr.y - pCar.y;
                    const d = Math.hypot(dx, dy) || 1.0;
                    pr.vx = (dx / d) * Math.min(260, spd * 1.15);
                    pr.vy = (dy / d) * Math.min(260, spd * 1.15);
                    pr.vang = (Math.random() - 0.5) * 14.0;
                }
            }
        }

        // 2. 3D Sidewalk Street Furniture (Hydrants, Neon Streetlights, Payphones, News Stands)
        if (!this.streetProps || this.streetProps.length === 0) return;
        const cx = pCar ? pCar.x : (player ? player.x : 0);
        const cy = pCar ? pCar.y : (player ? player.y : 0);

        for (let i = 0; i < this.streetProps.length; i++) {
            const sp = this.streetProps[i];
            if (sp.broken) {
                sp.timer += dt;
                if (sp.geyserTimer > 0) {
                    sp.geyserTimer = Math.max(0, sp.geyserTimer - dt);
                }
                sp.x += sp.vx * dt;
                sp.y += sp.vy * dt;
                sp.z += sp.vz * dt;
                if (sp.z > 2.02) {
                    sp.vz -= 1.85 * dt;
                } else {
                    sp.z = 2.02;
                    sp.vz = Math.abs(sp.vz) > 0.15 ? Math.abs(sp.vz) * 0.35 : 0;
                }
                sp.vx *= Math.pow(0.20, dt);
                sp.vy *= Math.pow(0.20, dt);
                sp.ang += sp.vang * dt;
                sp.vang *= Math.pow(0.28, dt);

                if (sp.timer > 24.0 && Math.hypot(cx - sp.homeX, cy - sp.homeY) > 320) {
                    sp.broken = false;
                    sp.timer = 0;
                    sp.geyserTimer = 0;
                    sp.x = sp.homeX;
                    sp.y = sp.homeY;
                    sp.z = 2.0;
                    sp.vx = 0;
                    sp.vy = 0;
                    sp.vz = 0;
                }
                continue;
            }

            if (pCar && Math.abs(pCar.x - sp.x) < 32 && Math.abs(pCar.y - sp.y) < 32) {
                const spd = Math.hypot(pCar.vx || 0, pCar.vy || 0) || Math.abs(pCar.speed || 0);
                if (spd > 28 && Math.hypot(pCar.x - sp.x, pCar.y - sp.y) < 28) {
                    sp.broken = true;
                    sp.timer = 0;
                    const dx = sp.x - pCar.x;
                    const dy = sp.y - pCar.y;
                    const d = Math.hypot(dx, dy) || 1.0;
                    const launchSpd = Math.min(310, Math.max(110, spd * 1.25));
                    sp.vx = (dx / d) * launchSpd;
                    sp.vy = (dy / d) * launchSpd;
                    sp.vz = 0.55;
                    sp.vang = (Math.random() - 0.5) * 16.0;

                    if (sp.kind === "HYDRANT") {
                        sp.geyserTimer = 14.0;
                        if (typeof game.addScore === "function") game.addScore(125);
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({ x: sp.x, y: sp.y, z: 2.35, text: "💦 HYDRANT BURST! +$125", color: "#38bdf8", life: 1.3 });
                        }
                    } else if (sp.kind === "STREETLIGHT_NEON") {
                        if (typeof game.addScore === "function") game.addScore(100);
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({ x: sp.x, y: sp.y, z: 2.40, text: "⚡ STREET MAYHEM! +$100", color: "#f472b6", life: 1.2 });
                        }
                    } else {
                        if (typeof game.addScore === "function") game.addScore(75);
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({ x: sp.x, y: sp.y, z: 2.30, text: "💥 PROP SMASH! +$75", color: "#fde047", life: 1.1 });
                        }
                    }
                }
            }
        }
    }

    /* ========================================================================
       4. HARDWARE Z-BUFFERED 3D ARCHITECTURAL & MONUMENT MESH COMPILER
       ======================================================================== */
    initShader(gl, renderer) {
        if (this.meshProg) return;
        const vs = `
            attribute vec3 aPos;
            attribute vec2 aUV;
            attribute vec4 aColor;
            uniform mat4 uViewProj;
            varying vec2 vUV;
            varying vec4 vColor;
            varying vec3 vWorldPos;
            void main() {
                vUV = aUV;
                vColor = aColor;
                vWorldPos = aPos;
                gl_Position = uViewProj * vec4(aPos, 1.0);
            }
        `;
        const fs = `
            precision mediump float;
            varying vec2 vUV;
            varying vec4 vColor;
            varying vec3 vWorldPos;
            uniform sampler2D uTex;
            uniform float uNightTint;
            uniform float uSunsetTint;
            void main() {
                vec4 c;
                if (vUV.x < -0.5) {
                    c = vColor;
                } else {
                    c = texture2D(uTex, vUV) * vColor;
                    if (c.a < 0.12) discard;
                }
                if (uSunsetTint > 0.01) {
                    vec3 sunsetRgb = c.rgb * vec3(1.12, 0.90, 0.78);
                    c.rgb = mix(c.rgb, sunsetRgb, uSunsetTint * 0.52);
                }
                if (uNightTint > 0.01) {
                    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                    float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
                    float isWindow = clamp((lum - 0.50) * 3.4 + (sat - 0.28) * 2.6, 0.0, 1.0);
                    vec3 darkWall = c.rgb * vec3(0.46, 0.54, 0.78);
                    vec3 warmGlow = min(vec3(1.0), mix(c.rgb * 1.38, vec3(1.0, 0.86, 0.52), 0.42));
                    vec3 nightRgb = mix(darkWall, warmGlow, isWindow * 0.90);
                    c.rgb = mix(c.rgb, nightRgb, clamp(uNightTint, 0.0, 1.0));
                }
                gl_FragColor = c;
            }
        `;
        this.meshProg = renderer.createProgram(gl, vs, fs);
        this.meshLocs = {
            aPos: gl.getAttribLocation(this.meshProg, "aPos"),
            aUV: gl.getAttribLocation(this.meshProg, "aUV"),
            aColor: gl.getAttribLocation(this.meshProg, "aColor"),
            uViewProj: gl.getUniformLocation(this.meshProg, "uViewProj"),
            uTex: gl.getUniformLocation(this.meshProg, "uTex"),
            uNightTint: gl.getUniformLocation(this.meshProg, "uNightTint"),
            uSunsetTint: gl.getUniformLocation(this.meshProg, "uSunsetTint")
        };
    }

    buildStatic3DMesh(gl, renderer) {
        if (!gl || !renderer || !renderer.gta1Meta || !renderer.gta1Meta.sprites) return;
        this.initShader(gl, renderer);
        this.validateAndPrepareLots();

        const objSprites = renderer.gta1Meta.sprites.objects || {};
        const texW = renderer.spritesTexW || renderer.gta1SpritesImg.width || 2048;
        const texH = renderer.spritesTexH || renderer.gta1SpritesImg.height || 4096;

        const verts = [];
        const pushV = (x, yElev, z, u, v, r, g, b, a = 1.0) => {
            verts.push(x, yElev, z, u, v, r, g, b, a);
        };
        const pushQuad3D = (p0, p1, p2, p3, u0, v0, u1, v1, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], u0, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);

            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p3[0], p3[1], p3[2], u1, v1, r, g, b, a);
        };
        const pushTri3D = (p0, p1, p2, uv0, uv1, uv2, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], uv0[0], uv0[1], r, g, b, a);
            pushV(p1[0], p1[1], p1[2], uv1[0], uv1[1], r, g, b, a);
            pushV(p2[0], p2[1], p2[2], uv2[0], uv2[1], r, g, b, a);
        };

        const getUV = (key) => {
            const rect = objSprites[key];
            if (!rect) return [-1, -1, -1, -1];
            const [sx, sy, sw, sh] = rect;
            return [
                (sx + 0.5) / texW,
                (sy + 0.5) / texH,
                (sx + sw - 0.5) / texW,
                (sy + sh - 0.5) / texH
            ];
        };

        const toWorld = (cxPx, cyPx, cosA, sinA, lxPx, lyPx, yElev) => [
            (cxPx + lxPx * cosA - lyPx * sinA) / TILE_SIZE,
            yElev,
            (cyPx + lxPx * sinA + lyPx * cosA) / TILE_SIZE
        ];

        const emitBox3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yBot, yTop, frontKey, sideKey, topColor = null) => {
            const hw = wPx * 0.5;
            const hd = dPx * 0.5;
            const [fu0, fv0, fu1, fv1] = getUV(frontKey);
            const [su0, sv0, su1, sv1] = getUV(sideKey || frontKey);

            const tNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yTop);
            const tNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yTop);
            const tSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yTop);
            const tSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yTop);

            const bNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yBot);
            const bNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yBot);
            const bSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yBot);
            const bSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yBot);

            pushQuad3D(tSW, tSE, bSW, bSE, fu0, fv0, fu1, fv1, 1.02, 1.01, 0.99, 1.0);
            pushQuad3D(tNE, tNW, bNE, bNW, su0, sv0, su1, sv1, 0.80, 0.82, 0.86, 1.0);
            pushQuad3D(tNW, tSW, bNW, bSW, su0, sv0, su1, sv1, 0.94, 0.94, 0.95, 1.0);
            pushQuad3D(tSE, tNE, bSE, bNE, su0, sv0, su1, sv1, 0.86, 0.87, 0.90, 1.0);

            if (topColor) {
                pushQuad3D(tNW, tNE, tSW, tSE, -1, -1, -1, -1, topColor[0], topColor[1], topColor[2], 1.0);
            }
        };

        const emitSolidBox3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yBot, yTop, col) => {
            const hw = wPx * 0.5;
            const hd = dPx * 0.5;
            const [r, g, b] = col;
            const tNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yTop);
            const tNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yTop);
            const tSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yTop);
            const tSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yTop);
            const bNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yBot);
            const bNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yBot);
            const bSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yBot);
            const bSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yBot);

            pushQuad3D(tSW, tSE, bSW, bSE, -1, -1, -1, -1, r * 1.00, g * 1.00, b * 1.00, 1.0);
            pushQuad3D(tNE, tNW, bNE, bNW, -1, -1, -1, -1, r * 0.76, g * 0.78, b * 0.82, 1.0);
            pushQuad3D(tNW, tSW, bNW, bSW, -1, -1, -1, -1, r * 0.92, g * 0.92, b * 0.94, 1.0);
            pushQuad3D(tSE, tNE, bSE, bNE, -1, -1, -1, -1, r * 0.84, g * 0.85, b * 0.88, 1.0);
            pushQuad3D(tNW, tNE, tSW, tSE, -1, -1, -1, -1, Math.min(1, r * 1.06), Math.min(1, g * 1.06), Math.min(1, b * 1.06), 1.0);
        };

        const emitHippedRoof3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yEave, pitchH, roofKey, trimCol, ridgeCol) => {
            const hw = wPx * 0.5;
            const hd = dPx * 0.5;
            const yTop = yEave + pitchH;
            const yFasciaBot = yEave - 0.04;

            emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yFasciaBot, yEave, trimCol);

            const ridgeHalf = Math.max(8.0, (wPx - dPx) * 0.5);
            const [u0, v0, u1, v1] = getUV(roofKey);
            const uMidL = u0 + (u1 - u0) * (0.5 - (ridgeHalf / wPx));
            const uMidR = u0 + (u1 - u0) * (0.5 + (ridgeHalf / wPx));
            const vMid = (v0 + v1) * 0.5;

            const eNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yEave);
            const eNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yEave);
            const eSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yEave);
            const eSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yEave);

            const rW = toWorld(cxPx, cyPx, cosA, sinA, offX - ridgeHalf, offY, yTop);
            const rE = toWorld(cxPx, cyPx, cosA, sinA, offX + ridgeHalf, offY, yTop);

            pushTri3D(eNW, rW, eNE, [u0, v0], [uMidL, vMid], [u1, v0], 1.06, 1.04, 1.00, 1.0);
            pushTri3D(eNE, rW, rE,  [u1, v0], [uMidL, vMid], [uMidR, vMid], 1.06, 1.04, 1.00, 1.0);

            pushTri3D(rW, eSW, rE,  [uMidL, vMid], [u0, v1], [uMidR, vMid], 0.94, 0.92, 0.90, 1.0);
            pushTri3D(rE, eSW, eSE, [uMidR, vMid], [u0, v1], [u1, v1], 0.94, 0.92, 0.90, 1.0);

            pushTri3D(eNW, eSW, rW, [u0, v0], [u0, v1], [uMidL, vMid], 1.02, 1.00, 0.98, 1.0);
            pushTri3D(rE, eSE, eNE, [uMidR, vMid], [u1, v1], [u1, v0], 0.85, 0.84, 0.86, 1.0);

            if (ridgeCol && ridgeHalf > 4) {
                emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX, offY, ridgeHalf * 2.0, 7.0, yTop - 0.015, yTop + 0.028, ridgeCol);
            }
        };

        const emitModernFlatRoof3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yEave, parapetH, roofKey, trimCol) => {
            emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yEave - 0.04, yEave + 0.03, [0.95, 0.97, 0.99]);
            const hw = (wPx - 8) * 0.5;
            const hd = (dPx - 8) * 0.5;
            const [u0, v0, u1, v1] = getUV(roofKey);
            const pNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yEave + 0.036);
            const pNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yEave + 0.036);
            const pSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yEave + 0.036);
            const pSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yEave + 0.036);
            pushQuad3D(pNW, pNE, pSW, pSE, u0, v0, u1, v1, 1.0, 1.0, 1.0, 1.0);

            const pT = 5.0;
            emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX, offY - dPx * 0.5 + pT * 0.5, wPx, pT, yEave + 0.03, yEave + parapetH, trimCol);
            emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX, offY + dPx * 0.5 - pT * 0.5, wPx, pT, yEave + 0.03, yEave + parapetH, trimCol);
            emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX - wPx * 0.5 + pT * 0.5, offY, pT, dPx, yEave + 0.03, yEave + parapetH, trimCol);
            emitSolidBox3D(cxPx, cyPx, cosA, sinA, offX + wPx * 0.5 - pT * 0.5, offY, pT, dPx, yEave + 0.03, yEave + parapetH, trimCol);
        };

        // ====================================================================
        // A. COMPILE ALL 23 3D RESIDENTIAL ESTATES, MANSIONS, VILLAS & SHACKS
        // ====================================================================
        for (let i = 0; i < this.instances.length; i++) {
            const inst = this.instances[i];
            const spec = inst.spec;
            const sc = inst.scale;
            const cx = inst.x;
            const cy = inst.y;
            const cosA = Math.cos(inst.ang);
            const sinA = Math.sin(inst.ang);
            const bz = (this.map && typeof this.map.getHeightAtPixel === "function")
                ? this.map.getHeightAtPixel(cx, cy, 4.0)
                : (inst.z || 2.0);

            const w1 = spec.w1 * sc;
            const d1 = spec.d1 * sc;
            const ovh = (spec.roofOverhang || 10) * sc;
            let zBase = bz;

            if (spec.hasStiltDeck && spec.stiltH > 0) {
                const stiltTop = bz + spec.stiltH * sc;
                const deckW = w1 + (spec.deckPad || 16) * 2 * sc;
                const deckD = d1 + (spec.deckPad || 16) * 2 * sc;
                const pilingCol = spec.stiltColor || [0.56, 0.38, 0.22];
                for (const sx of [-w1 * 0.44, 0, w1 * 0.44]) {
                    for (const sy of [-d1 * 0.44, d1 * 0.44]) {
                        emitSolidBox3D(cx, cy, cosA, sinA, sx, sy, 9 * sc, 9 * sc, bz - 0.15, stiltTop, pilingCol);
                    }
                }
                emitSolidBox3D(cx, cy, cosA, sinA, 0, 0, deckW, deckD, stiltTop - 0.05, stiltTop + 0.02, [0.68, 0.46, 0.26]);
                for (let st = 0; st < 5; st++) {
                    const stY = d1 * 0.5 + (14 + st * 6) * sc;
                    const stZ = stiltTop * (1.0 - st / 5.0) + bz * (st / 5.0);
                    emitSolidBox3D(cx, cy, cosA, sinA, 22 * sc, stY, 26 * sc, 6 * sc, bz, stZ, [0.76, 0.54, 0.32]);
                }
                zBase = stiltTop + 0.02;
            } else {
                emitSolidBox3D(cx, cy, cosA, sinA, 0, 0, w1 + 8 * sc, d1 + 8 * sc, bz, bz + 0.045, spec.trimColor);
            }

            const z1 = zBase + spec.h1 * sc;
            emitBox3D(cx, cy, cosA, sinA, 0, 0, w1, d1, zBase + 0.04, z1, spec.frontWall1, spec.sideWall1, spec.wallColor);

            if (spec.hasPortico) {
                const pw = (spec.porticoW || 76) * sc;
                const pd = (spec.porticoD || 26) * sc;
                const ph = (spec.porticoH || 0.62) * sc;
                const py = d1 * 0.5 + pd * 0.45;
                emitSolidBox3D(cx, cy, cosA, sinA, 0, py + pd * 0.3, pw + 10 * sc, pd * 0.6, zBase, zBase + 0.06, [0.92, 0.88, 0.80]);
                for (const colX of [-pw * 0.42, -pw * 0.15, pw * 0.15, pw * 0.42]) {
                    emitSolidBox3D(cx, cy, cosA, sinA, colX, py + pd * 0.35, 7.5 * sc, 7.5 * sc, zBase + 0.05, zBase + ph, [0.97, 0.95, 0.90]);
                }
                emitHippedRoof3D(cx, cy, cosA, sinA, 0, py, pw + 12 * sc, pd + 10 * sc, zBase + ph, 0.16 * sc, spec.roofTex2 || spec.roofTex1, spec.trimColor, spec.roofRidgeColor);
            } else if (spec.hasFrontPorch) {
                const pd = (spec.porchD || 26) * sc;
                const py = d1 * 0.5 + pd * 0.5;
                emitSolidBox3D(cx, cy, cosA, sinA, 0, py, w1 * 0.82, pd, zBase, zBase + 0.055, [0.94, 0.94, 0.96]);
                for (const colX of [-w1 * 0.36, -w1 * 0.12, w1 * 0.12, w1 * 0.36]) {
                    emitSolidBox3D(cx, cy, cosA, sinA, colX, py + pd * 0.38, 6.5 * sc, 6.5 * sc, zBase + 0.05, z1 - 0.06, [0.98, 0.98, 1.0]);
                }
            }

            if (spec.roofStyle === "FLAT_CANTILEVER") {
                emitModernFlatRoof3D(cx, cy, cosA, sinA, 0, 0, w1 + ovh * 2, d1 + ovh * 2, z1, 0.09 * sc, spec.roofTex1, spec.trimColor);
            } else {
                emitHippedRoof3D(cx, cy, cosA, sinA, 0, 0, w1 + ovh * 2, d1 + ovh * 2, z1, (spec.roofPitch1 || 0.25) * sc, spec.roofTex1, spec.trimColor, spec.roofRidgeColor);
            }

            if (spec.w2 > 0 && spec.h2 > 0) {
                const w2 = spec.w2 * sc;
                const d2 = spec.d2 * sc;
                const ox2 = (spec.w2OffsetX || 0) * sc;
                const oy2 = (spec.w2OffsetY || 0) * sc;
                const z2Bot = z1 + (spec.roofStyle === "FLAT_CANTILEVER" ? 0.04 : 0.10) * sc;
                const z2Top = z2Bot + spec.h2 * sc;

                emitBox3D(cx, cy, cosA, sinA, ox2, oy2, w2, d2, z2Bot, z2Top, spec.upperWall, spec.upperWall, spec.wallColor);

                if (spec.hasGlassBalcony) {
                    emitSolidBox3D(cx, cy, cosA, sinA, ox2 + 24 * sc, oy2 + d2 * 0.5 + 14 * sc, w2 * 0.85, 3.5 * sc, z1 + 0.04, z1 + 0.18 * sc, [0.22, 0.86, 0.96]);
                }

                if (spec.roofStyle === "FLAT_CANTILEVER") {
                    emitModernFlatRoof3D(cx, cy, cosA, sinA, ox2, oy2, w2 + ovh * 1.6, d2 + ovh * 1.6, z2Top, 0.08 * sc, spec.roofTex2, spec.trimColor);
                } else {
                    emitHippedRoof3D(cx, cy, cosA, sinA, ox2, oy2, w2 + ovh * 1.6, d2 + ovh * 1.6, z2Top, (spec.roofPitch2 || 0.20) * sc, spec.roofTex2, spec.trimColor, spec.roofRidgeColor);
                }

                if (spec.hasCupola) {
                    const zCup = z2Top + (spec.roofPitch2 || 0.20) * sc * 0.75;
                    emitSolidBox3D(cx, cy, cosA, sinA, ox2, oy2, 36 * sc, 36 * sc, zCup, zCup + 0.18 * sc, spec.wallColor);
                    emitHippedRoof3D(cx, cy, cosA, sinA, ox2, oy2, 46 * sc, 46 * sc, zCup + 0.18 * sc, 0.14 * sc, spec.roofTex2, spec.trimColor, spec.roofRidgeColor);
                }
            }

            if (inst.pool) {
                const pl = inst.pool;
                const pSc = pl.scale || 0.90;
                emitSolidBox3D(cx, cy, cosA, sinA, pl.dx, pl.dy, 152 * pSc, 92 * pSc, bz, bz + 0.032, [0.92, 0.90, 0.86]);
            }

            if (inst.dockBoat) {
                const db = inst.dockBoat;
                const pCos = Math.cos(db.pierAng);
                const pSin = Math.sin(db.pierAng);
                emitSolidBox3D(db.pierMidX, db.pierMidY, pCos, pSin, 0, 0, db.pierLen, 22, 1.88, 2.08, [0.58, 0.38, 0.20]);
                const numPiles = Math.max(2, Math.floor(db.pierLen / 28));
                for (let pi = 0; pi <= numPiles; pi++) {
                    const lx = -db.pierLen * 0.45 + (db.pierLen * 0.9 * pi) / numPiles;
                    emitSolidBox3D(db.pierMidX, db.pierMidY, pCos, pSin, lx, -9, 5, 5, 1.72, 2.16, [0.42, 0.26, 0.12]);
                    emitSolidBox3D(db.pierMidX, db.pierMidY, pCos, pSin, lx,  9, 5, 5, 1.72, 2.16, [0.42, 0.26, 0.12]);
                }
            }
        }

        // ====================================================================
        // B. COMPILE 3D THATCHED TIKI PAVILIONS (this.map.tikiBars)
        // ====================================================================
        if (this.map && Array.isArray(this.map.tikiBars)) {
            for (let i = 0; i < this.map.tikiBars.length; i++) {
                const tb = this.map.tikiBars[i];
                const cosA = Math.cos(tb.ang || 0);
                const sinA = Math.sin(tb.ang || 0);
                const bz = tb.z || 2.0;
                for (const px of [-24, 24]) {
                    for (const py of [-18, 18]) {
                        emitSolidBox3D(tb.x, tb.y, cosA, sinA, px, py, 5, 5, bz, bz + 0.36, [0.68, 0.48, 0.22]);
                    }
                }
                emitSolidBox3D(tb.x, tb.y, cosA, sinA, 0, 10, 42, 12, bz, bz + 0.16, [0.54, 0.32, 0.14]);
                emitHippedRoof3D(tb.x, tb.y, cosA, sinA, 0, 0, 68, 52, bz + 0.35, 0.20, "house_florida_bungalow", [0.76, 0.56, 0.26], [0.86, 0.68, 0.34]);
            }
        }

        // ====================================================================
        // C. COMPILE 3D ART DECO BEACH LIFEGUARD TOWERS (this.map.beachProps)
        // ====================================================================
        if (this.map && Array.isArray(this.map.beachProps)) {
            for (let i = 0; i < this.map.beachProps.length; i++) {
                const pr = this.map.beachProps[i];
                if (!pr.spr || !pr.spr.startsWith("lifeguard_")) continue;
                const cosA = Math.cos(pr.ang || 0);
                const sinA = Math.sin(pr.ang || 0);
                const bz = pr.z || 2.0;
                const isPink = pr.spr.includes("pink");
                const isCyan = pr.spr.includes("cyan");
                const cabinCol = isPink ? [0.98, 0.56, 0.72] : (isCyan ? [0.36, 0.88, 0.92] : [0.98, 0.82, 0.32]);
                const roofCol = isPink ? [0.24, 0.86, 0.82] : [0.96, 0.44, 0.58];
                for (const sx of [-14, 14]) {
                    for (const sy of [-12, 12]) {
                        emitSolidBox3D(pr.x, pr.y, cosA, sinA, sx, sy, 4, 4, bz, bz + 0.22, [0.92, 0.92, 0.94]);
                    }
                }
                emitSolidBox3D(pr.x, pr.y, cosA, sinA, 0, 0, 42, 38, bz + 0.21, bz + 0.24, [0.96, 0.96, 0.98]);
                emitBox3D(pr.x, pr.y, cosA, sinA, 0, 0, 32, 28, bz + 0.24, bz + 0.52, "wall_artdeco_side", "wall_artdeco_side", cabinCol);
                emitHippedRoof3D(pr.x, pr.y, cosA, sinA, 0, 0, 40, 36, bz + 0.52, 0.14, "roof_artdeco_terrazzo", roofCol, cabinCol);
            }
        }

        // ====================================================================
        // D. COMPILE 3D REFINERY SMOKESTACKS & 3D MINI-GOLF WINDMILL TOWER
        // ====================================================================
        if (this.map && this.map.industrialAndParkDetails) {
            const ind = this.map.industrialAndParkDetails;
            if (Array.isArray(ind.smokestacks)) {
                for (let i = 0; i < ind.smokestacks.length; i++) {
                    const st = ind.smokestacks[i];
                    const rz = st.z || 3.0;
                    for (let lv = 0; lv < 7; lv++) {
                        const sz = 24.0 - lv * 1.6;
                        const y0 = rz + lv * 0.14;
                        const y1 = y0 + 0.14;
                        const col = (lv % 2 === 1) ? [0.88, 0.20, 0.18] : [0.94, 0.94, 0.96];
                        emitSolidBox3D(st.x, st.y, 1, 0, 0, 0, sz, sz, y0, y1, col);
                    }
                }
            }
            if (ind.miniGolf) {
                const mg = ind.miniGolf;
                const bz = mg.z || 2.0;
                // 3D Tapered Dutch Windmill Tower + Conical Terracotta Cap
                emitSolidBox3D(mg.x, mg.y, 1, 0, 0, 0, 36, 36, bz, bz + 0.24, [0.86, 0.34, 0.24]);
                emitSolidBox3D(mg.x, mg.y, 1, 0, 0, 0, 30, 30, bz + 0.24, bz + 0.48, [0.96, 0.94, 0.88]);
                emitHippedRoof3D(mg.x, mg.y, 1, 0, 0, 0, 36, 36, bz + 0.48, 0.18, "mansion_star_island_top", [0.42, 0.28, 0.18], [0.92, 0.72, 0.24]);
            }
        }

        // ====================================================================
        // E. COMPILE 3D AIRPORT CHECKPOINT GUARDHOUSES (airportCompound.gates)
        // ====================================================================
        if (this.map && this.map.airportCompound && Array.isArray(this.map.airportCompound.gates)) {
            for (const gt of this.map.airportCompound.gates) {
                const bx = gt.boothX, by = gt.boothY, bz = 2.0;
                emitSolidBox3D(bx, by, 1, 0, 0, 0, 28, 22, bz, bz + 0.18, [0.86, 0.89, 0.94]);
                emitBox3D(bx, by, 1, 0, 0, 0, 24, 18, bz + 0.18, bz + 0.38, "wall_modern_upper", "wall_modern_upper", [0.24, 0.28, 0.36]);
                emitSolidBox3D(bx, by, 1, 0, 0, 0, 30, 24, bz + 0.38, bz + 0.43, [0.22, 0.26, 0.34]);
                emitSolidBox3D(bx, by, 1, 0, 0, 0, 18, 5, bz + 0.43, bz + 0.47, [0.98, 0.78, 0.12]);
            }
        }

        // ====================================================================
        // F. COMPILE 3D SHIPPING CONTAINER STACKS & 3D PORT GANTRY CRANES
        // ====================================================================
        if (this.map && Array.isArray(this.map.portTerminals)) {
            const containerPalette = [
                [0.84, 0.22, 0.18], // Hapag Crimson
                [0.14, 0.54, 0.78], // Maersk Cyan-Blue
                [0.16, 0.62, 0.36], // Evergreen
                [0.92, 0.52, 0.12], // Hazard Orange
                [0.24, 0.36, 0.68]  // Cosco Navy
            ];
            for (let i = 0; i < this.map.portTerminals.length; i++) {
                const pt = this.map.portTerminals[i];
                if (pt.kind !== "CONTAINERS") continue;
                const cosA = Math.cos(pt.ang || 0);
                const sinA = Math.sin(pt.ang || 0);
                const bz = pt.z || 2.0;
                const sc = pt.scale || 1.2;
                const cw = 54 * sc;
                const cd = 22 * sc;
                // Side-by-side 2x2 + 1 top 3D corrugated steel shipping containers
                for (let row = -1; row <= 1; row += 2) {
                    const oy = row * (cd * 0.55);
                    const c1 = containerPalette[(i + (row > 0 ? 1 : 0)) % containerPalette.length];
                    const c2 = containerPalette[(i + (row > 0 ? 3 : 2)) % containerPalette.length];
                    emitSolidBox3D(pt.x, pt.y, cosA, sinA, 0, oy, cw, cd, bz, bz + 0.24, c1);
                    emitSolidBox3D(pt.x, pt.y, cosA, sinA, 0, oy, cw, cd, bz + 0.245, bz + 0.48, c2);
                }
                if (i % 2 === 0) {
                    const c3 = containerPalette[(i + 4) % containerPalette.length];
                    emitSolidBox3D(pt.x, pt.y, cosA, sinA, 0, 0, cw, cd, bz + 0.485, bz + 0.72, c3);
                }
            }
        }

        if (this.landmarks3D && Array.isArray(this.landmarks3D.gantryCranes)) {
            for (const gc of this.landmarks3D.gantryCranes) {
                const cosA = Math.cos(gc.ang || 0);
                const sinA = Math.sin(gc.ang || 0);
                const bz = gc.z || 2.0;
                const red = [0.88, 0.18, 0.16];
                const white = [0.95, 0.96, 0.98];
                const steel = [0.26, 0.30, 0.36];
                // 4 Portal Legs (leaves wide 48px drive-through lane underneath!)
                for (const lx of [-24, 24]) {
                    for (const ly of [-26, 26]) {
                        emitSolidBox3D(gc.x, gc.y, cosA, sinA, lx, ly, 7, 7, bz, bz + 0.75, red);
                        emitSolidBox3D(gc.x, gc.y, cosA, sinA, lx, ly, 6, 6, bz + 0.75, bz + 1.25, white);
                    }
                }
                // Cross-Portal Beam + Operator Glass Cab + Long Over-Water Hammerhead Boom
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 0, 0, 58, 60, bz + 0.72, bz + 0.80, red);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 12, 0, 18, 16, bz + 1.08, bz + 1.24, white);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 38, 0, 148, 14, bz + 1.24, bz + 1.34, red);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 0, 0, 18, 18, bz + 1.34, bz + 1.62, white);
                // Spreader cable + suspended container hook block
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 78, 0, 3, 3, bz + 0.55, bz + 1.24, steel);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 78, 0, 18, 10, bz + 0.48, bz + 0.55, [0.96, 0.76, 0.12]);
            }
        }

        // ====================================================================
        // G. COMPILE SERA SPACE CENTER 3D LAUNCH PAD 39A & APOLLO/ARTEMIS ROCKET
        // ====================================================================
        if (this.landmarks3D && this.landmarks3D.launchpad) {
            const lp = this.landmarks3D.launchpad;
            const bz = lp.z || 2.0;
            // Concrete Octagonal Flame Trench Pad + 4 Perimeter Lightning Masts
            emitSolidBox3D(lp.x, lp.y, 1, 0, 0, 0, 112, 112, bz, bz + 0.14, [0.68, 0.70, 0.74]);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 0, 0, 82, 82, bz + 0.14, bz + 0.24, [0.52, 0.54, 0.58]);
            for (const [mx, my] of [[-50, -50], [50, -50], [-50, 50], [50, 50]]) {
                emitSolidBox3D(lp.x, lp.y, 1, 0, mx, my, 4, 4, bz + 0.14, bz + 1.45, [0.82, 0.84, 0.88]);
            }
            // 3D Steel Umbilical Launch Tower (West of Rocket) + 3 Swing Access Arms
            for (let lv = 0; lv < 8; lv++) {
                const y0 = bz + 0.24 + lv * 0.20;
                emitSolidBox3D(lp.x, lp.y, 1, 0, -26, 0, 20, 20, y0, y0 + 0.18, (lv % 2 === 0) ? [0.86, 0.22, 0.18] : [0.88, 0.90, 0.94]);
            }
            for (const armZ of [bz + 0.75, bz + 1.15, bz + 1.55]) {
                emitSolidBox3D(lp.x, lp.y, 1, 0, -10, 0, 24, 6, armZ, armZ + 0.05, [0.86, 0.22, 0.18]);
            }
            // 3D Multi-Stage Heavy Space Rocket + Twin Solid Rocket Boosters
            // SRBs
            emitSolidBox3D(lp.x, lp.y, 1, 0, 6, -12, 8, 8, bz + 0.24, bz + 1.32, [0.96, 0.96, 0.98]);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 6,  12, 8, 8, bz + 0.24, bz + 1.32, [0.96, 0.96, 0.98]);
            // Core Cryogenic Orange Stage + White Upper Stage + Crew Capsule Spire
            emitSolidBox3D(lp.x, lp.y, 1, 0, 6, 0, 16, 16, bz + 0.24, bz + 1.24, [0.90, 0.44, 0.16]);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 6, 0, 14, 14, bz + 1.24, bz + 1.72, [0.97, 0.98, 1.00]);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 6, 0, 10, 10, bz + 1.72, bz + 1.98, [0.18, 0.20, 0.24]);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 6, 0, 4,  4,  bz + 1.98, bz + 2.22, [0.98, 0.22, 0.22]);
        }

        // ====================================================================
        // H. COMPILE 3D COASTAL LIGHTHOUSES & 3D FERRIS WHEEL SUPPORT FRAME
        // ====================================================================
        if (this.landmarks3D && Array.isArray(this.landmarks3D.lighthouses)) {
            for (const lh of this.landmarks3D.lighthouses) {
                const bz = lh.z || 2.0;
                // Keeper's Coral-Roofed Cottage Base + 6-Tier Tapered Red & White Lighthouse Tower
                emitBox3D(lh.x, lh.y, 1, 0, -24, 10, 44, 34, bz, bz + 0.38, "wall_keys_front", "wall_keys_side", [0.96, 0.96, 0.98]);
                emitHippedRoof3D(lh.x, lh.y, 1, 0, -24, 10, 52, 42, bz + 0.38, 0.16, "mansion_star_island_top", [0.92, 0.92, 0.94], [0.84, 0.32, 0.20]);
                for (let lv = 0; lv < 6; lv++) {
                    const sz = 28.0 - lv * 2.4;
                    const y0 = bz + lv * 0.24;
                    const col = (lv % 2 === 1) ? [0.88, 0.18, 0.18] : [0.97, 0.97, 0.99];
                    emitSolidBox3D(lh.x, lh.y, 1, 0, 0, 0, sz, sz, y0, y0 + 0.24, col);
                }
                // Black Iron Lantern Walk + Glowing Glass Beacon Room + Conical Copper Dome
                emitSolidBox3D(lh.x, lh.y, 1, 0, 0, 0, 20, 20, bz + 1.44, bz + 1.49, [0.16, 0.18, 0.22]);
                emitSolidBox3D(lh.x, lh.y, 1, 0, 0, 0, 14, 14, bz + 1.49, bz + 1.68, [1.00, 0.94, 0.62]);
                emitHippedRoof3D(lh.x, lh.y, 1, 0, 0, 0, 20, 20, bz + 1.68, 0.14, "mansion_star_island_top", [0.82, 0.18, 0.18], [0.98, 0.82, 0.24]);
            }
        }

        if (this.landmarks3D && this.landmarks3D.ferrisWheel) {
            const fw = this.landmarks3D.ferrisWheel;
            const bz = fw.z || 2.0;
            // Wooden Boardwalk Deck + Twin A-Frame Steel Support Towers + Central Axle Hub
            emitSolidBox3D(fw.x, fw.y, 1, 0, 0, 0, 116, 52, bz, bz + 0.06, [0.64, 0.42, 0.24]);
            for (const sideY of [-16, 16]) {
                emitSolidBox3D(fw.x, fw.y, 1, 0, -22, sideY, 6, 6, bz + 0.06, bz + 0.92, [0.94, 0.96, 0.99]);
                emitSolidBox3D(fw.x, fw.y, 1, 0,  22, sideY, 6, 6, bz + 0.06, bz + 0.92, [0.94, 0.96, 0.99]);
                emitSolidBox3D(fw.x, fw.y, 1, 0,   0, sideY, 12, 8, bz + 0.88, bz + 0.98, [0.98, 0.24, 0.68]);
            }
            emitSolidBox3D(fw.x, fw.y, 1, 0, 0, 0, 8, 38, bz + 0.90, bz + 0.96, [0.18, 0.88, 0.98]);
        }

        if (this.meshVbo) {
            gl.deleteBuffer(this.meshVbo);
        }
        this.meshVertexCount = verts.length / 9;
        this.meshVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    }

    /* ========================================================================
       5. RENDER HARDWARE-DEPTH-BUFFERED 3D STATIC + DYNAMIC ANIMATED MESHES
       ======================================================================== */
    renderStatic3DMesh(gl, renderer, viewProj, nf = 0.0, sf = 0.0) {
        if (!gl || !this.meshVbo || this.meshVertexCount === 0 || !this.meshProg || !renderer.spritesTex) return;

        gl.useProgram(this.meshProg);
        gl.uniformMatrix4fv(this.meshLocs.uViewProj, false, viewProj);
        gl.uniform1f(this.meshLocs.uNightTint, nf);
        gl.uniform1f(this.meshLocs.uSunsetTint, sf);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.spritesTex);
        gl.uniform1i(this.meshLocs.uTex, 0);

        const stride = 9 * 4;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVbo);
        gl.enableVertexAttribArray(this.meshLocs.aPos);
        gl.vertexAttribPointer(this.meshLocs.aPos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(this.meshLocs.aUV);
        gl.vertexAttribPointer(this.meshLocs.aUV, 2, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(this.meshLocs.aColor);
        gl.vertexAttribPointer(this.meshLocs.aColor, 4, gl.FLOAT, false, stride, 20);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Pass 1: Static 3D Estates & Landmarks
        gl.drawArrays(gl.TRIANGLES, 0, this.meshVertexCount);

        // Pass 2: Dynamic 3D Animated Landmarks (Vertically-Rotating 3D Ferris Wheel,
        //         3D Windmill Sails) & 3D Destructible Street Furniture + 3D Water Geysers!
        this.renderDynamic3DMeshes(gl, renderer, stride);
    }

    renderDynamic3DMeshes(gl, renderer, stride) {
        const camX = renderer.camX || 0;
        const camY = renderer.camY || 0;
        const minX = camX - 920;
        const maxX = camX + 920;
        const minY = camY - 720;
        const maxY = camY + 720;
        const t = renderer.time || 0;

        const dVerts = [];
        const pushV = (x, yElev, z, r, g, b, a = 1.0) => {
            dVerts.push(x, yElev, z, -1.0, -1.0, r, g, b, a);
        };
        const pushQ = (p0, p1, p2, p3, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], r, g, b, a);
            pushV(p2[0], p2[1], p2[2], r, g, b, a);
            pushV(p1[0], p1[1], p1[2], r, g, b, a);
            pushV(p1[0], p1[1], p1[2], r, g, b, a);
            pushV(p2[0], p2[1], p2[2], r, g, b, a);
            pushV(p3[0], p3[1], p3[2], r, g, b, a);
        };
        const emitDynBox = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yBot, yTop, col, alpha = 1.0) => {
            const hw = wPx * 0.5;
            const hd = dPx * 0.5;
            const [r, g, b] = col;
            const toW = (lx, ly, yE) => [
                (cxPx + lx * cosA - ly * sinA) / TILE_SIZE,
                yE,
                (cyPx + lx * sinA + ly * cosA) / TILE_SIZE
            ];
            const tNW = toW(offX - hw, offY - hd, yTop);
            const tNE = toW(offX + hw, offY - hd, yTop);
            const tSW = toW(offX - hw, offY + hd, yTop);
            const tSE = toW(offX + hw, offY + hd, yTop);
            const bNW = toW(offX - hw, offY - hd, yBot);
            const bNE = toW(offX + hw, offY - hd, yBot);
            const bSW = toW(offX - hw, offY + hd, yBot);
            const bSE = toW(offX + hw, offY + hd, yBot);

            pushQ(tSW, tSE, bSW, bSE, r, g, b, alpha);
            pushQ(tNE, tNW, bNE, bNW, r * 0.78, g * 0.80, b * 0.84, alpha);
            pushQ(tNW, tSW, bNW, bSW, r * 0.92, g * 0.92, b * 0.95, alpha);
            pushQ(tSE, tNE, bSE, bNE, r * 0.85, g * 0.86, b * 0.90, alpha);
            pushQ(tNW, tNE, tSW, tSE, Math.min(1, r * 1.06), Math.min(1, g * 1.06), Math.min(1, b * 1.06), alpha);
        };

        // 1. Live Vertically-Rotating 3D Neon Ferris Wheel at Vice Beach Pier
        if (this.landmarks3D && this.landmarks3D.ferrisWheel) {
            const fw = this.landmarks3D.ferrisWheel;
            if (fw.x >= minX - 180 && fw.x <= maxX + 180 && fw.y >= minY - 180 && fw.y <= maxY + 180) {
                const hubElev = (fw.z || 2.0) + 0.93;
                const radPx = 46.0;
                const radElev = 0.68;
                const numGondolas = 10;
                for (let gi = 0; gi < numGondolas; gi++) {
                    const theta = t * 0.65 + (gi * Math.PI * 2.0) / numGondolas;
                    const gx = fw.x + Math.cos(theta) * radPx;
                    const gyElev = hubElev + Math.sin(theta) * radElev;
                    const isPink = (gi % 2 === 0);
                    const gCol = isPink ? [0.98, 0.28, 0.72] : [0.18, 0.90, 0.98];
                    // 3D Passenger Gondola Cabin hanging at (gx, gyElev, fw.y)
                    emitDynBox(gx, fw.y, 1, 0, 0, 0, 14, 18, gyElev - 0.08, gyElev + 0.04, gCol);
                    // Half-radius neon spoke bar
                    const mx = fw.x + Math.cos(theta) * (radPx * 0.5);
                    const myElev = hubElev + Math.sin(theta) * (radElev * 0.5);
                    emitDynBox(mx, fw.y, 1, 0, 0, 0, 5, 24, myElev - 0.02, myElev + 0.02, [0.98, 0.94, 0.52]);
                }
            }
        }

        // 2. Live Vertically-Rotating 3D Dutch Windmill Sails at Port Gellhorn Mini-Golf
        if (this.map && this.map.industrialAndParkDetails && this.map.industrialAndParkDetails.miniGolf) {
            const mg = this.map.industrialAndParkDetails.miniGolf;
            if (mg.x >= minX - 140 && mg.x <= maxX + 140 && mg.y >= minY - 140 && mg.y <= maxY + 140) {
                const hubElev = (mg.z || 2.0) + 0.42;
                for (let bi = 0; bi < 4; bi++) {
                    const ang = t * 1.8 + bi * (Math.PI * 0.5);
                    for (const step of [0.45, 0.85]) {
                        const sx = mg.x + Math.cos(ang) * (24.0 * step);
                        const syElev = hubElev + Math.sin(ang) * (0.34 * step);
                        emitDynBox(sx, mg.y + 19, 1, 0, 0, 0, 7, 4, syElev - 0.03, syElev + 0.03, [0.98, 0.92, 0.68]);
                    }
                }
            }
        }

        // 3. 180+ True 3D Destructible Sidewalk Street Props & 3D Water Geysers
        if (this.streetProps && this.streetProps.length > 0) {
            for (let i = 0; i < this.streetProps.length; i++) {
                const sp = this.streetProps[i];
                if (sp.x < minX || sp.x > maxX || sp.y < minY || sp.y > maxY) continue;
                const cosA = Math.cos(sp.ang);
                const sinA = Math.sin(sp.ang);
                const bz = sp.z || 2.0;

                if (sp.kind === "HYDRANT") {
                    if (sp.broken) {
                        // Toppled hydrant body flying / lying on street
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 12, 7, bz, bz + 0.07, [0.92, 0.20, 0.16]);
                        // High-pressure 3D Water Geyser erupting from homeX, homeY!
                        if (sp.geyserTimer > 0) {
                            for (let w = 0; w < 5; w++) {
                                const phase = ((t * 3.8 + w * 0.2) % 1.0);
                                const wyElev = 2.02 + phase * 0.78;
                                const spread = 5.0 + phase * 14.0;
                                emitDynBox(sp.homeX, sp.homeY, 1, 0, 0, 0, spread, spread, wyElev, wyElev + 0.11, [0.68, 0.94, 1.0], 0.78 - phase * 0.45);
                            }
                        }
                    } else {
                        emitDynBox(sp.x, sp.y, 1, 0, 0, 0, 7, 7, bz, bz + 0.12, [0.92, 0.20, 0.16]);
                        emitDynBox(sp.x, sp.y, 1, 0, 0, 0, 9, 5, bz + 0.06, bz + 0.09, [0.96, 0.84, 0.18]);
                    }
                } else if (sp.kind === "STREETLIGHT_NEON") {
                    const neonCol = sp.neonPink ? [0.98, 0.32, 0.78] : [0.18, 0.92, 0.98];
                    if (sp.broken) {
                        // Knocked-down 3D streetlight pole lying horizontal on the ground
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 38, 4, bz, bz + 0.05, [0.78, 0.82, 0.88]);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 16, 0, 10, 6, bz, bz + 0.06, neonCol);
                    } else {
                        // Vertical 3D Art Deco pole + cantilevered glowing neon luminary arm
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 4.5, 4.5, bz, bz + 0.54, [0.82, 0.86, 0.92]);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 9, 0, 18, 4.0, bz + 0.50, bz + 0.54, [0.82, 0.86, 0.92]);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 14, 0, 10, 6.0, bz + 0.47, bz + 0.51, neonCol);
                    }
                } else if (sp.kind === "PAYPHONE_BOOTH") {
                    if (sp.broken) {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 22, 12, bz, bz + 0.09, [0.18, 0.68, 0.88]);
                    } else {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 14, 14, bz, bz + 0.28, [0.18, 0.68, 0.88]);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 16, 16, bz + 0.28, bz + 0.32, [0.96, 0.98, 1.0]);
                    }
                } else if (sp.kind === "NEWS_STAND") {
                    if (sp.broken) {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 14, 10, bz, bz + 0.07, [0.96, 0.68, 0.14]);
                    } else {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 12, 10, bz, bz + 0.16, [0.96, 0.68, 0.14]);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 12, 10, bz + 0.11, bz + 0.16, [0.96, 0.96, 0.98]);
                    }
                }
            }
        }

        // 4. 3D Villa Heist Security Grids, Keypads, Armored Cartel Vaults & Roof Alarm Strobes
        if (this.heistTargets && this.heistTargets.length > 0) {
            for (let i = 0; i < this.heistTargets.length; i++) {
                const ht = this.heistTargets[i];
                const inst = ht.inst;
                if (inst.x < minX - 240 || inst.x > maxX + 240 || inst.y < minY - 240 || inst.y > maxY + 240) continue;
                const cosA = Math.cos(inst.ang);
                const sinA = Math.sin(inst.ang);
                const bz = inst.z || 2.0;

                // 3D Security Keypad Box next to Portico
                const ledCol = ht.hacked ? [0.18, 0.96, 0.42] : [0.98, 0.18, 0.22];
                emitDynBox(ht.keypadX, ht.keypadY, cosA, sinA, 0, 0, 8, 6, bz, bz + 0.22, [0.22, 0.26, 0.32]);
                emitDynBox(ht.keypadX, ht.keypadY, cosA, sinA, 0, 0, 6, 6.5, bz + 0.14, bz + 0.20, ledCol);

                // 3D Red Laser Security Beams across the Villa Portico (when unhacked & unlooted)
                if (!ht.hacked && !ht.looted) {
                    const pulse = 0.72 + 0.25 * Math.sin(t * 9.0 + i);
                    for (const hOff of [0.07, 0.15, 0.23]) {
                        emitDynBox(ht.laserX, ht.laserY, cosA, sinA, 0, 0, ht.laserW, 2.2, bz + hOff, bz + hOff + 0.018, [1.0, 0.12, 0.18], pulse);
                    }
                }

                // 3D Black & Gold Armored Cartel Vault on Rear/Poolside Terrace
                if (ht.looted) {
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 22, 16, bz, bz + 0.14, [0.16, 0.18, 0.22]);
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 14, 10, bz + 0.14, bz + 0.19, [0.98, 0.82, 0.18]);
                } else {
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 22, 16, bz, bz + 0.28, [0.14, 0.16, 0.20]);
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 24, 18, bz + 0.26, bz + 0.30, [0.96, 0.78, 0.16]);
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 10, 17, bz + 0.08, bz + 0.20, [0.98, 0.84, 0.22]);
                }

                // Pulsing 3D Red Roof Alarm Strobes when Alarm is Tripped
                if (ht.alarmTripped && Math.sin(t * 14.0 + i) > 0) {
                    const topY = bz + inst.totalHeightBlocks;
                    emitDynBox(inst.x, inst.y, cosA, sinA, 0, 0, 18, 18, topY, topY + 0.14, [1.0, 0.12, 0.16], 0.92);
                }
            }
        }

        if (dVerts.length === 0) return;
        if (!this.dynVbo) {
            this.dynVbo = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dVerts), gl.STREAM_DRAW);
        gl.vertexAttribPointer(this.meshLocs.aPos, 3, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(this.meshLocs.aUV, 2, gl.FLOAT, false, stride, 12);
        gl.vertexAttribPointer(this.meshLocs.aColor, 4, gl.FLOAT, false, stride, 20);
        gl.drawArrays(gl.TRIANGLES, 0, dVerts.length / 9);
    }

    /* ========================================================================
       6. RENDER DYNAMIC CHILD SOCKETS (POOLS, SUNBATHERS, BOATS, BEACONS)
       ======================================================================== */
    batchDynamicSockets3D(renderer, game, minX, minY, maxX, maxY, sunCos, sunSin) {
        if (!renderer || !this.instances || this.instances.length === 0) return;
        if (game && !this.vehiclesSpawned) {
            this.spawnPrefabVehicles(game);
        }
        if (game) {
            this.updateAndCollideProps(game, 1 / 60);
            this.updateHeists(game, 1 / 60);
        }

        for (let i = 0; i < this.instances.length; i++) {
            const h = this.instances[i];
            if (h.x < minX - 360 || h.x > maxX + 360 || h.y < minY - 360 || h.y > maxY + 360) continue;

            const bz = (this.map && typeof this.map.getHeightAtPixel === "function")
                ? this.map.getHeightAtPixel(h.x, h.y, 4.0)
                : (h.z || 2.0);
            const sc = h.scale || 1.0;

            renderer.batchObjectSprite3D(
                h.spec.roofTex1 || "mansion_star_island",
                h.x + sunCos * 14,
                h.y + sunSin * 14,
                bz + 0.015,
                h.ang,
                sc * 1.06,
                SPRITE_DRAW_ORDER.TIRE_MARKS,
                0.02, 0.03, 0.06, 0.36
            );

            if (h.pool) {
                const pl = h.pool;
                const px = pl.worldX;
                const py = pl.worldY;
                const pAng = h.ang + (pl.ang || 0);
                const pSc = pl.scale || 0.90;
                const csP = Math.cos(pAng);
                const snP = Math.sin(pAng);

                renderer.batchObjectSprite3D("vercetti_pool", px, py, bz + 0.036, pAng, pSc, SPRITE_DRAW_ORDER.TIRE_MARKS);

                const flX = px + Math.sin(renderer.time * 1.8 + i) * 5.0;
                const flY = py + Math.cos(renderer.time * 1.5 + i) * 3.5;
                renderer.batchObjectSprite3D("flamingo_float", flX, flY, bz + 0.044, renderer.time * 0.35 + i, 0.88, SPRITE_DRAW_ORDER.MAP_OBJECT);

                for (let li = -1; li <= 1; li += 2) {
                    const lx = px + csP * (-58 * pSc) - snP * (li * 18 * pSc);
                    const ly = py + snP * (-58 * pSc) + csP * (li * 18 * pSc);
                    renderer.batchPedSprite3D(li < 0 ? "bikini_pink" : "bikini_cyan", 42, lx, ly, bz + 0.048, pAng, 1.24, false, SPRITE_DRAW_ORDER.CORPSE);
                }
            }

            if (h.dockBoat) {
                const db = h.dockBoat;
                const boatX = db.worldX;
                const boatY = db.worldY;
                const boatAng = db.worldAng;
                const bob = Math.sin(renderer.time * 2.2 + i * 1.3) * 0.008;
                renderer.batchObjectSprite3D(db.spr, boatX + sunCos * 3.5, boatY + sunSin * 3.5, 2.015, boatAng, 1.12, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.28);
                renderer.batchObjectSprite3D(db.spr, boatX, boatY, 2.045 + bob, boatAng, 1.12, SPRITE_DRAW_ORDER.CAR);
            }
        }

        // Render Poolside Interactive Props
        for (let i = 0; i < this.interactiveProps.length; i++) {
            const pr = this.interactiveProps[i];
            if (pr.x < minX - 120 || pr.x > maxX + 120 || pr.y < minY - 120 || pr.y > maxY + 120) continue;
            const zElev = pr.spr.includes("umbrella") ? (pr.z + (pr.broken ? 0.05 : 0.16)) : (pr.z + 0.040);
            const drawOrder = pr.spr.includes("umbrella") ? SPRITE_DRAW_ORDER.TREES : SPRITE_DRAW_ORDER.TIRE_MARKS;
            renderer.batchObjectSprite3D(pr.spr, pr.x, pr.y, zElev, pr.ang, pr.scale, drawOrder);
        }

        // Render SERA Rocket Cryogenic Vapor Plumes & Coastal Lighthouse Rotating Searchlight Beams
        if (this.landmarks3D) {
            const lp = this.landmarks3D.launchpad;
            if (lp && lp.x >= minX - 220 && lp.x <= maxX + 220 && lp.y >= minY - 220 && lp.y <= maxY + 220) {
                for (let p = 0; p < 3; p++) {
                    const age = ((renderer.time * 0.85 + p * 0.33) % 1.0);
                    const smSpr = String(200 + (p % 6));
                    renderer.batchObjectSprite3D(smSpr, lp.x + 12 + age * 28, lp.y + age * 8, 2.55 + age * 0.65, renderer.time + p, 0.72 + age * 0.45, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                }
            }
            if (Array.isArray(this.landmarks3D.lighthouses)) {
                for (const lh of this.landmarks3D.lighthouses) {
                    if (lh.x < minX - 260 || lh.x > maxX + 260 || lh.y < minY - 260 || lh.y > maxY + 260) continue;
                    const bAng = renderer.time * 1.15 + lh.seed;
                    const bx = lh.x + Math.cos(bAng) * 44;
                    const by = lh.y + Math.sin(bAng) * 44;
                    renderer.pushSolidQuad3D(bx, by, 3.56, 76, 18, bAng, 1.0, 0.96, 0.68, 0.42, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                }
            }
        }

        // Render Cartel Villa Bodyguards & Interactive Heist Ground Rings
        if (this.heistTargets && this.heistTargets.length > 0) {
            const walkFrame = Math.floor(renderer.time * 6.5) % 8;
            for (let i = 0; i < this.heistTargets.length; i++) {
                const ht = this.heistTargets[i];
                const inst = ht.inst;
                if (inst.x < minX - 280 || inst.x > maxX + 280 || inst.y < minY - 280 || inst.y > maxY + 280) continue;
                const bz = inst.z || 2.0;

                for (let gi = 0; gi < ht.guards.length; gi++) {
                    const g = ht.guards[gi];
                    renderer.batchPedSprite3D(gi === 0 ? "g2_swat" : "gang", walkFrame, g.x, g.y, bz + 0.045, g.ang, 1.26, false, SPRITE_DRAW_ORDER.PED);
                }

                if (!ht.looted) {
                    const ringSz = 26 + Math.sin(renderer.time * 4.5 + i) * 3.0;
                    renderer.pushSolidQuad3D(ht.vaultX, ht.vaultY, bz + 0.032, ringSz, ringSz, renderer.time * 0.8, 0.98, 0.82, 0.16, 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    if (!ht.hacked) {
                        renderer.pushSolidQuad3D(ht.keypadX, ht.keypadY, bz + 0.032, 18, 18, renderer.time * 1.2, 0.98, 0.22, 0.28, 0.45, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                }
            }
        }
    }

    /* ========================================================================
       6B. RENDER 2D VILLA HEIST INTERACTION PROMPTS & ACTIVE GETAWAY BANNER
       ======================================================================== */
    renderHeistPrompts(ctx, renderer, game) {
        if (!ctx || !renderer || !game || !game.player || game.activeInterior) return;
        if (!this.heistTargets || this.heistTargets.length === 0) return;

        const p = game.player;
        const px = p.car ? p.car.x : p.x;
        const py = p.car ? p.car.y : p.y;

        ctx.save();
        ctx.textAlign = "center";

        // 1. On-Foot Proximity Prompts for Keypads, 3D Cartel Vaults, and Getaway Boats
        if (!p.inVehicle) {
            for (let i = 0; i < this.heistTargets.length; i++) {
                const ht = this.heistTargets[i];

                if (!ht.looted && !ht.hacked && Math.hypot(px - ht.keypadX, py - ht.keypadY) < 62) {
                    const scr = renderer.worldToScreen(ht.keypadX, ht.keypadY - 18, (ht.inst.z || 2.0) + 0.28);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.88)";
                    ctx.fillRect(scr.x - 135, scr.y - 22, 270, 22);
                    ctx.strokeStyle = "#4ade80";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 135, scr.y - 22, 270, 22);
                    ctx.fillStyle = "#4ade80";
                    ctx.fillText("🔓 [E] HACK LASER SECURITY (+$1,500)", scr.x, scr.y - 7);
                }

                if (!ht.looted && Math.hypot(px - ht.vaultX, py - ht.vaultY) < 70) {
                    const scr = renderer.worldToScreen(ht.vaultX, ht.vaultY - 18, (ht.inst.z || 2.0) + 0.34);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.90)";
                    ctx.fillRect(scr.x - 150, scr.y - 22, 300, 22);
                    ctx.strokeStyle = "#fde047";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 150, scr.y - 22, 300, 22);
                    ctx.fillStyle = "#fde047";
                    ctx.fillText(`💰 [E] CRACK CARTEL VAULT ($${ht.lootCash.toLocaleString()})`, scr.x, scr.y - 7);
                }

                if (ht.inst.dockBoat) {
                    const db = ht.inst.dockBoat;
                    if (Math.hypot(px - db.worldX, py - db.worldY) < 76 || Math.hypot(px - db.pierMidX, py - db.pierMidY) < 72) {
                        const scr = renderer.worldToScreen(db.worldX, db.worldY - 14, 2.25);
                        ctx.font = "900 11px monospace";
                        ctx.fillStyle = "rgba(8,12,22,0.88)";
                        ctx.fillRect(scr.x - 135, scr.y - 22, 270, 22);
                        ctx.strokeStyle = "#2dd4bf";
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(scr.x - 135, scr.y - 22, 270, 22);
                        ctx.fillStyle = "#2dd4bf";
                        ctx.fillText("🚤 [E] LAUNCH PIER SPEEDBOAT GETAWAY", scr.x, scr.y - 7);
                    }
                }
            }
        }

        // 2. Top-Center Active Villa Heist Escape HUD Banner
        if (this.activeHeist) {
            const ah = this.activeHeist;
            const ht = ah.target;
            const dist = Math.hypot(px - ht.inst.x, py - ht.inst.y);
            const rem = Math.max(0, Math.ceil(ah.escapeRadius - dist));
            const cx = ctx.canvas.width * 0.5;
            const cy = 62;

            ctx.fillStyle = "rgba(10, 14, 26, 0.90)";
            ctx.fillRect(cx - 220, cy - 24, 440, 48);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - 220, cy - 24, 440, 48);

            ctx.font = "900 12px monospace";
            ctx.fillStyle = "#fde047";
            ctx.fillText(`🚨 ${ah.title} — TAKE: $${ah.bagCash.toLocaleString()}`, cx, cy - 6);
            ctx.font = "700 11px monospace";
            ctx.fillStyle = "#38bdf8";
            ctx.fillText(`ESCAPE ZONE: ${rem}m REMAINING (USE DRIVEWAY SUPERCAR OR PIER BOAT!)`, cx, cy + 14);
        }

        ctx.restore();
    }

    /* ========================================================================
       7. BAKE CLEARED LAWNS & 3D ARCHITECTURAL ESTATES ONTO RADAR / FULL MAP
       ======================================================================== */
    paintOnOverviewCanvas(ctx, canvasW, canvasH) {
        if (!ctx || !this.instances || this.instances.length === 0) return;
        const sx = canvasW / (MAP_COLS * TILE_SIZE);
        const sy = canvasH / (MAP_ROWS * TILE_SIZE);

        ctx.save();
        ctx.fillStyle = "#16a34a";
        const clearedLawns = [
            [347, 355, 164, 170],
            [347, 355, 178, 185],
            [335, 342, 178, 183],
            [398, 403, 125, 129],
            [389, 403, 205, 209]
        ];
        for (const [x0, x1, y0, y1] of clearedLawns) {
            const rx = x0 * TILE_SIZE * sx;
            const ry = y0 * TILE_SIZE * sy;
            const rw = (x1 - x0 + 1) * TILE_SIZE * sx;
            const rh = (y1 - y0 + 1) * TILE_SIZE * sy;
            ctx.fillRect(rx, ry, rw, rh);
        }

        for (let i = 0; i < this.instances.length; i++) {
            const inst = this.instances[i];
            const spec = inst.spec;
            const px = inst.x * sx;
            const py = inst.y * sy;
            const rw = Math.max(3, spec.w1 * inst.scale * sx);
            const rh = Math.max(2, spec.d1 * inst.scale * sy);

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(inst.ang);
            ctx.fillStyle = spec.mapColor || "#f8fafc";
            ctx.fillRect(-rw * 0.5 - 1, -rh * 0.5 - 1, rw + 2, rh + 2);
            ctx.fillStyle = spec.mapRoofColor || "#ea580c";
            ctx.fillRect(-rw * 0.5, -rh * 0.5, rw, rh);
            ctx.restore();

            if (inst.pool) {
                ctx.fillStyle = "#06b6d4";
                ctx.fillRect(inst.pool.worldX * sx - 2.5, inst.pool.worldY * sy - 1.5, 5, 3);
            }
        }
        ctx.restore();
    }
}

window.WORLD_METRICS = WORLD_METRICS;
window.PREFAB_CATALOG = PREFAB_CATALOG;
window.WorldObjectEngine = WorldObjectEngine;
