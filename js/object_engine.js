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
            launchpad: {
                x: 465.0 * TILE_SIZE,
                y: 35.0 * TILE_SIZE,
                z: 2.0,
                consoleX: 460.8 * TILE_SIZE,
                consoleY: 35.0 * TILE_SIZE,
                splashX: 490.6 * TILE_SIZE,
                splashY: 35.0 * TILE_SIZE
            },
            ferrisWheel: { x: 464.5 * TILE_SIZE, y: 194.5 * TILE_SIZE, z: 2.0 },
            pierArch: { x: 456.5 * TILE_SIZE, y: 194.5 * TILE_SIZE, z: 2.0 },
            atcTower: { x: 106.5 * TILE_SIZE, y: 307.5 * TILE_SIZE, z: 2.0 },
            waterTower: { x: 148.5 * TILE_SIZE, y: 118.5 * TILE_SIZE, z: 2.0 },
            // GTA 6 Leonida Regional 3D World-Building Monuments:
            viceSign: { x: 118.5 * TILE_SIZE, y: 293.5 * TILE_SIZE, z: 2.0 },
            kalagaLookout: { x: 135.5 * TILE_SIZE, y: 23.5 * TILE_SIZE, z: 2.0 },
            alliedSugarSilos: { x: 160.5 * TILE_SIZE, y: 109.0 * TILE_SIZE, z: 2.0 },
            grassriversOutpost: { x: 116.5 * TILE_SIZE, y: 398.5 * TILE_SIZE, z: 2.0 },
            southernmostBuoy: { x: 204.2 * TILE_SIZE, y: 476.5 * TILE_SIZE, z: 2.0 },
            highwayGantries: [
                // 4 Full-Span Twin-Pylon 3D Overhead Green FDOT Highway Gantries (pylons strictly on PAVE/FIELD shoulders!)
                { id: "gantry_vcia_exp",   x: 130.0 * TILE_SIZE, y: 296.8 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, spanPx: 332, fullSpan: true },
                { id: "gantry_downtown",   x: 285.8 * TILE_SIZE, y: 230.0 * TILE_SIZE, z: 2.0, ang: 0,             spanPx: 332, fullSpan: true },
                { id: "gantry_gellhorn",   x: 88.5 * TILE_SIZE,  y: 220.0 * TILE_SIZE, z: 2.0, ang: 0,             spanPx: 216, fullSpan: true },
                { id: "gantry_keys_hwy",   x: 260.0 * TILE_SIZE, y: 480.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, spanPx: 216, fullSpan: true },
                // 4 Cantilevered Single-Pylon 3D Overhead Green FDOT Causeway & Beach Gantries (pylon on PAVE, arm over ROAD!)
                { id: "gantry_macarthur",  x: 345.0 * TILE_SIZE, y: 299.3 * TILE_SIZE, z: 2.0, ang: -Math.PI * 0.5, armPx: 148, fullSpan: false },
                { id: "gantry_venetian",   x: 345.0 * TILE_SIZE, y: 176.3 * TILE_SIZE, z: 2.0, ang: -Math.PI * 0.5, armPx: 148, fullSpan: false },
                { id: "gantry_ocean_nth",  x: 448.3 * TILE_SIZE, y: 210.0 * TILE_SIZE, z: 2.0, ang: Math.PI,        armPx: 148, fullSpan: false },
                { id: "gantry_ocean_sth",  x: 448.3 * TILE_SIZE, y: 275.0 * TILE_SIZE, z: 2.0, ang: Math.PI,        armPx: 148, fullSpan: false }
            ],
            marineBuoys: [
                { x: 320.0 * TILE_SIZE, y: 310.0 * TILE_SIZE, z: 2.0, isRed: true,  seed: 0.0 },
                { x: 320.0 * TILE_SIZE, y: 325.0 * TILE_SIZE, z: 2.0, isRed: false, seed: 1.1 },
                { x: 368.0 * TILE_SIZE, y: 285.0 * TILE_SIZE, z: 2.0, isRed: true,  seed: 2.2 },
                { x: 368.0 * TILE_SIZE, y: 200.0 * TILE_SIZE, z: 2.0, isRed: false, seed: 3.3 },
                { x: 335.0 * TILE_SIZE, y: 152.0 * TILE_SIZE, z: 2.0, isRed: true,  seed: 4.4 },
                { x: 335.0 * TILE_SIZE, y: 188.0 * TILE_SIZE, z: 2.0, isRed: false, seed: 5.5 },
                { x: 112.0 * TILE_SIZE, y: 150.0 * TILE_SIZE, z: 2.0, isRed: true,  seed: 0.7 },
                { x: 118.0 * TILE_SIZE, y: 184.0 * TILE_SIZE, z: 2.0, isRed: false, seed: 1.8 },
                { x: 498.0 * TILE_SIZE, y: 250.0 * TILE_SIZE, z: 2.0, isRed: true,  seed: 2.9 },
                { x: 492.0 * TILE_SIZE, y: 194.5 * TILE_SIZE, z: 2.0, isRed: false, seed: 4.0 },
                { x: 325.0 * TILE_SIZE, y: 494.0 * TILE_SIZE, z: 2.0, isRed: true,  seed: 5.1 },
                { x: 190.0 * TILE_SIZE, y: 476.0 * TILE_SIZE, z: 2.0, isRed: false, seed: 6.2 }
            ],
            lighthouses: [
                { id: "key_west_lh", x: 199.5 * TILE_SIZE, y: 476.5 * TILE_SIZE, z: 2.0, seed: 0.0 },
                { id: "cape_leonida_lh", x: 464.5 * TILE_SIZE, y: 134.5 * TILE_SIZE, z: 2.0, seed: 2.4 }
            ],
            gantryCranes: [
                { x: 359.4 * TILE_SIZE, y: 322.8 * TILE_SIZE, z: 2.0, ang: 0 },
                { x: 359.4 * TILE_SIZE, y: 335.4 * TILE_SIZE, z: 2.0, ang: 0 },
                { x: 57.2 * TILE_SIZE,  y: 208.5 * TILE_SIZE, z: 2.0, ang: Math.PI },
                { x: 57.2 * TILE_SIZE,  y: 243.5 * TILE_SIZE, z: 2.0, ang: Math.PI }
            ],
            // 16 Satirical GTA 6 & GTA Universe 3D Illuminated Roadside Advertising Billboards
            gtaBillboards: [
                { x: 448.5 * TILE_SIZE, y: 285.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_pisswasser",   neon: [0.98, 0.82, 0.18] }, // Ocean Drive South
                { x: 448.5 * TILE_SIZE, y: 252.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_ecola",        neon: [0.98, 0.22, 0.28] }, // Ocean Drive Mid
                { x: 448.5 * TILE_SIZE, y: 202.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_sprunk",       neon: [0.22, 0.96, 0.42] }, // Ocean Drive Pier
                { x: 448.5 * TILE_SIZE, y: 165.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_angstipan",    neon: [0.22, 0.92, 0.96] }, // North Beach
                { x: 352.0 * TILE_SIZE, y: 299.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_patriot_beer", neon: [0.96, 0.28, 0.32] }, // MacArthur Causeway
                { x: 352.0 * TILE_SIZE, y: 176.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_burgershot",   neon: [0.98, 0.62, 0.16] }, // Venetian Causeway
                { x: 282.5 * TILE_SIZE, y: 248.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_call_morgan",  neon: [0.98, 0.84, 0.18] }, // Downtown South
                { x: 282.5 * TILE_SIZE, y: 215.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_ammunation",   neon: [0.96, 0.24, 0.24] }, // Downtown North
                { x: 224.5 * TILE_SIZE, y: 114.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_sprunk",       neon: [0.22, 0.96, 0.42] }, // Little Haiti
                { x: 214.5 * TILE_SIZE, y: 132.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_ecola",        neon: [0.98, 0.22, 0.28] }, // Wynwood
                { x: 112.5 * TILE_SIZE, y: 293.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_angstipan",    neon: [0.22, 0.92, 0.96] }, // VCIA West
                { x: 142.5 * TILE_SIZE, y: 293.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_call_morgan",  neon: [0.98, 0.84, 0.18] }, // VCIA East
                { x: 64.5 * TILE_SIZE,  y: 192.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_patriot_beer", neon: [0.96, 0.28, 0.32] }, // Port Gellhorn Strip
                { x: 86.5 * TILE_SIZE,  y: 235.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, ad: "ad_ammunation",   neon: [0.96, 0.24, 0.24] }, // Port Gellhorn South
                { x: 152.5 * TILE_SIZE, y: 124.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_pisswasser",   neon: [0.98, 0.82, 0.18] }, // Ambrosia Refinery
                { x: 260.0 * TILE_SIZE, y: 478.5 * TILE_SIZE, z: 2.0, ang: 0,             ad: "ad_burgershot",   neon: [0.98, 0.62, 0.16] }  // Leonida Keys Highway
            ]
        };
        // 8 Interactive 3D Illuminated eCola & Sprunk Sidewalk Soda Vending Machines + Ad Kiosks
        this.sodaMachines = [
            { x: 442.5 * TILE_SIZE, y: 294.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 442.5 * TILE_SIZE, y: 256.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "SPRUNK", ad: "ad_sprunk" },
            { x: 443.4 * TILE_SIZE, y: 206.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 352.0 * TILE_SIZE, y: 176.2 * TILE_SIZE, z: 2.0, ang: 0,             brand: "SPRUNK", ad: "ad_sprunk" },
            { x: 282.5 * TILE_SIZE, y: 246.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 224.5 * TILE_SIZE, y: 112.5 * TILE_SIZE, z: 2.0, ang: 0,             brand: "SPRUNK", ad: "ad_sprunk" },
            { x: 115.5 * TILE_SIZE, y: 293.5 * TILE_SIZE, z: 2.0, ang: 0,             brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 64.5 * TILE_SIZE,  y: 186.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "SPRUNK", ad: "ad_sprunk" }
        ];
        this.rocketLaunch = {
            state: "IDLE", // IDLE | COUNTDOWN | LIFTOFF | COOLDOWN
            timer: 0,
            liftZ: 0,
            velZ: 0,
            armSwing: 0,
            appliedZoom: 0,
            capsuleActive: false,
            capsuleAlt: 0,
            capsuleX: 490.6 * TILE_SIZE,
            capsuleY: 35.0 * TILE_SIZE
        };
        // GTA 6 Trailer 1 & Screenshots "Instant Fun" Interactive Encounters:
        // 1. Rogue Leonida Alligators (Convenience Stores, Mansion Pools & Sidewalks)
        this.gatorEncounters = [
            { id: "gator_ocean_liquor", name: "OCEAN DRIVE 24/7 LIQUOR GATOR", x: 442.5 * TILE_SIZE, y: 288.0 * TILE_SIZE, z: 2.0, ang: 0.35, active: true, cooldown: 0 },
            { id: "gator_star_pool",    name: "STAR ISLAND POOL GATOR",        x: 351.2 * TILE_SIZE, y: 169.2 * TILE_SIZE, z: 2.0, ang: -0.60, active: true, cooldown: 0 },
            { id: "gator_venetian",     name: "VENETIAN VILLA ROGUE GATOR",    x: 393.5 * TILE_SIZE, y: 121.8 * TILE_SIZE, z: 2.0, ang: 1.15, active: true, cooldown: 0 },
            { id: "gator_gellhorn",     name: "PORT GELLHORN GAS STATION GATOR", x: 64.5 * TILE_SIZE, y: 182.5 * TILE_SIZE, z: 2.0, ang: -0.25, active: true, cooldown: 0 },
            { id: "gator_little_haiti", name: "LITTLE HAITI MARKET GATOR",     x: 226.5 * TILE_SIZE, y: 111.5 * TILE_SIZE, z: 2.0, ang: 0.80, active: true, cooldown: 0 },
            { id: "gator_grassrivers",  name: "GRASSRIVERS BULL GATOR",        x: 110.5 * TILE_SIZE, y: 390.5 * TILE_SIZE, z: 2.0, ang: -1.10, active: true, cooldown: 0 }
        ];
        // 2. VCPD High-Speed Radar Speed Traps & Nitrous Boost Portals (strictly on PAVE/FIELD sidewalks beside the road!)
        this.speedTraps = [
            { id: "radar_ocean_dr",   name: "OCEAN DRIVE NEON RADAR",       x: 448.3 * TILE_SIZE, y: 240.0 * TILE_SIZE, roadX: 446.0 * TILE_SIZE, roadY: 240.0 * TILE_SIZE, z: 2.0, ang: 0,            cooldown: 0, flashTimer: 0, bestMph: 145 },
            { id: "radar_macarthur",  name: "MACARTHUR CAUSEWAY RADAR",     x: 344.5 * TILE_SIZE, y: 299.3 * TILE_SIZE, roadX: 344.5 * TILE_SIZE, roadY: 297.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, cooldown: 0, flashTimer: 0, bestMph: 155 },
            { id: "radar_venetian",   name: "VENETIAN CAUSEWAY RADAR",      x: 344.5 * TILE_SIZE, y: 176.3 * TILE_SIZE, roadX: 344.5 * TILE_SIZE, roadY: 174.0 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, cooldown: 0, flashTimer: 0, bestMph: 150 },
            { id: "radar_julia",      name: "JULIA TUTTLE NORTH BAY RADAR", x: 430.0 * TILE_SIZE, y: 76.3 * TILE_SIZE,  roadX: 430.0 * TILE_SIZE, roadY: 74.0 * TILE_SIZE,  z: 2.0, ang: Math.PI * 0.5, cooldown: 0, flashTimer: 0, bestMph: 160 },
            { id: "radar_keys_hwy",   name: "OVERSEAS HIGHWAY KEYS RADAR",  x: 263.0 * TILE_SIZE, y: 479.3 * TILE_SIZE, roadX: 263.0 * TILE_SIZE, roadY: 480.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, cooldown: 0, flashTimer: 0, bestMph: 155 },
            { id: "radar_vcia_blvd",  name: "VCIA EXPRESSWAY RADAR",        x: 87.3 * TILE_SIZE,  y: 275.0 * TILE_SIZE, roadX: 88.5 * TILE_SIZE,  roadY: 275.0 * TILE_SIZE, z: 2.0, ang: 0,            cooldown: 0, flashTimer: 0, bestMph: 145 }
        ];
        // 3. Grupo Seguro Armored Cash Truck 3D Briefcase Drops & Viral Social Media Reels State
        this.cashDrops = [];
        this.viralCooldown = 0;
        this.viralDriftTimer = 0;
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

        const clearZones = [];
        if (this.landmarks3D) {
            if (this.landmarks3D.launchpad) {
                clearZones.push({ x: this.landmarks3D.launchpad.x - 40, y: this.landmarks3D.launchpad.y, r: 340 });
            }
            if (this.landmarks3D.ferrisWheel) {
                clearZones.push({ x: this.landmarks3D.ferrisWheel.x, y: this.landmarks3D.ferrisWheel.y, r: 165 });
            }
            if (this.landmarks3D.pierArch) {
                clearZones.push({ x: this.landmarks3D.pierArch.x, y: this.landmarks3D.pierArch.y, r: 95 });
            }
            if (this.landmarks3D.atcTower) {
                clearZones.push({ x: this.landmarks3D.atcTower.x, y: this.landmarks3D.atcTower.y, r: 120 });
            }
            if (this.landmarks3D.waterTower) {
                clearZones.push({ x: this.landmarks3D.waterTower.x + 20, y: this.landmarks3D.waterTower.y, r: 115 });
            }
            if (this.landmarks3D.viceSign) {
                clearZones.push({ x: this.landmarks3D.viceSign.x, y: this.landmarks3D.viceSign.y, r: 120 });
            }
            if (this.landmarks3D.kalagaLookout) {
                clearZones.push({ x: this.landmarks3D.kalagaLookout.x, y: this.landmarks3D.kalagaLookout.y, r: 115 });
            }
            if (this.landmarks3D.alliedSugarSilos) {
                clearZones.push({ x: this.landmarks3D.alliedSugarSilos.x, y: this.landmarks3D.alliedSugarSilos.y, r: 125 });
            }
            if (this.landmarks3D.grassriversOutpost) {
                clearZones.push({ x: this.landmarks3D.grassriversOutpost.x, y: this.landmarks3D.grassriversOutpost.y, r: 115 });
            }
            if (this.landmarks3D.southernmostBuoy) {
                clearZones.push({ x: this.landmarks3D.southernmostBuoy.x, y: this.landmarks3D.southernmostBuoy.y, r: 64 });
            }
            if (Array.isArray(this.landmarks3D.lighthouses)) {
                for (const lh of this.landmarks3D.lighthouses) {
                    clearZones.push({ x: lh.x, y: lh.y, r: 96 });
                }
            }
            if (Array.isArray(this.landmarks3D.gantryCranes)) {
                for (const gc of this.landmarks3D.gantryCranes) {
                    clearZones.push({ x: gc.x, y: gc.y, r: 110 });
                }
            }
        }
        const notInClearZone = (obj) => !clearZones.some(z => Math.hypot(obj.x - z.x, obj.y - z.y) < z.r);
        if (Array.isArray(map.vicePalms)) map.vicePalms = map.vicePalms.filter(notInClearZone);
        if (Array.isArray(map.trees)) map.trees = map.trees.filter(notInClearZone);
        if (Array.isArray(map.beachSunbathers)) map.beachSunbathers = map.beachSunbathers.filter(notInClearZone);
        if (Array.isArray(map.beachUmbrellas)) map.beachUmbrellas = map.beachUmbrellas.filter(notInClearZone);
        if (Array.isArray(map.beachVolleyballCourts)) map.beachVolleyballCourts = map.beachVolleyballCourts.filter(notInClearZone);
        if (Array.isArray(map.beachParties)) map.beachParties = map.beachParties.filter(notInClearZone);

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

    triggerRocketLaunch(game) {
        if (!this.rocketLaunch || this.rocketLaunch.state !== "IDLE") return false;
        this.rocketLaunch.state = "COUNTDOWN";
        this.rocketLaunch.timer = 0;
        this.rocketLaunch.liftZ = 0;
        this.rocketLaunch.velZ = 0;
        this.rocketLaunch.armSwing = 0;

        if (game) {
            if (typeof game.addScore === "function") game.addScore(25000);
            if (game.audio) game.audio.playPickup("WEAPON");
            if (typeof game.showBigBanner === "function") {
                game.showBigBanner("🚀 SERA ARTEMIS VI — IGNITION SEQUENCE!", "MAIN ENGINES START • UMBILICAL ARMS RETRACTING • +$25,000", "#f97316", 3.2);
            }
            const lp = this.landmarks3D && this.landmarks3D.launchpad;
            if (lp && Array.isArray(game.floatingTexts)) {
                game.floatingTexts.push({
                    x: lp.x,
                    y: lp.y,
                    z: 3.2,
                    text: "🚀 T-MINUS 3s — MAIN ENGINE START! +$25,000!",
                    color: "#f97316",
                    life: 3.2
                });
            }
        }
        return true;
    }

    tryTriggerHeistAction(game) {
        if (!game || !game.player || game.player.inVehicle || game.activeInterior) return false;
        const px = game.player.x;
        const py = game.player.y;

        // 0. SERA Space Center Launch Complex 39A — Exterior Launch Control Console & Orion Capsule Recovery!
        if (this.landmarks3D && this.landmarks3D.launchpad) {
            const lp = this.landmarks3D.launchpad;
            if (this.rocketLaunch && this.rocketLaunch.capsuleActive && Math.hypot(px - this.rocketLaunch.capsuleX, py - this.rocketLaunch.capsuleY) < 92) {
                this.rocketLaunch.capsuleActive = false;
                if (typeof game.addScore === "function") game.addScore(50000);
                if (game.audio) game.audio.playPickup("WEAPON");
                if (typeof game.showBigBanner === "function") {
                    game.showBigBanner("🪂 ORION CAPSULE RECOVERED!", "CLASSIFIED NASA LUNAR PAYLOAD SECURED • +$50,000", "#4ade80", 3.4);
                }
                if (Array.isArray(game.floatingTexts)) {
                    game.floatingTexts.push({
                        x: this.rocketLaunch.capsuleX,
                        y: this.rocketLaunch.capsuleY,
                        z: 2.75,
                        text: "🪂 ORION LUNAR PAYLOAD RECOVERED! +$50,000!",
                        color: "#4ade80",
                        life: 3.4
                    });
                }
                return true;
            }
            if (Math.hypot(px - lp.consoleX, py - lp.consoleY) < 72 || Math.hypot(px - lp.x, py - lp.y) < 155) {
                if (this.triggerRocketLaunch(game)) return true;
            }
        }

        // 0B. GTA 6 Trailer 1 Rogue Leonida Alligator Wrangler Action ([E] on foot!)
        if (Array.isArray(this.gatorEncounters)) {
            for (const ge of this.gatorEncounters) {
                if (ge.active && Math.hypot(px - ge.x, py - ge.y) < 68) {
                    ge.active = false;
                    ge.cooldown = 35.0;
                    if (typeof game.addScore === "function") game.addScore(2500);
                    if (typeof game.addCash === "function") game.addCash(2500, "🐊 GATOR WRANGLER BOUNTY!");
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🐊 LEONIDA GATOR WRANGLED!", `${ge.name} BAGGED • +$2,500 ANIMAL CONTROL BOUNTY!`, "#4ade80", 2.8);
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: ge.x,
                            y: ge.y,
                            z: 2.65,
                            text: "🐊 ROGUE GATOR WRANGLED! +$2,500 & VIRAL REEL!",
                            color: "#4ade80",
                            life: 2.8
                        });
                    }
                    return true;
                }
            }
        }

        // 0C. Breach Grupo Seguro Armored Cash Truck Rear Vault Doors on Foot ([E]!)
        if (Array.isArray(game.vehicles)) {
            for (const v of game.vehicles) {
                if (v.isArmoredCashTruck && (v.cashBagsLeft || 0) > 0 && Math.hypot(px - v.x, py - v.y) < 76) {
                    this.ejectArmoredCashDrops(game, v, Math.min(3, v.cashBagsLeft));
                    return true;
                }
            }
        }

        // 0D. Drink Ice-Cold eCola or Sprunk from 3D Illuminated Sidewalk Soda Vending Machines ([E] on foot!)
        if (Array.isArray(this.sodaMachines)) {
            for (const sm of this.sodaMachines) {
                if (Math.hypot(px - sm.x, py - sm.y) < 58) {
                    const maxHp = game.player.maxHp || 100;
                    game.player.hp = Math.min(maxHp, (game.player.hp || 100) + 35);
                    if (typeof game.addScore === "function") game.addScore(250);
                    if (typeof game.addCash === "function") game.addCash(250, `🥤 ${sm.brand} SUGAR RUSH!`);
                    if (game.audio) game.audio.playPickup("SCORE");
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: sm.x,
                            y: sm.y,
                            z: 2.55,
                            text: sm.brand === "SPRUNK"
                                ? "🥤 ICE-COLD SPRUNK! THE ESSENCE OF LIFE! +35 HP & +$250!"
                                : "🥤 ICE-COLD eCOLA! INFECTIOUSLY DELICIOUS! +35 HP & +$250!",
                            color: sm.brand === "SPRUNK" ? "#4ade80" : "#f87171",
                            life: 2.4
                        });
                    }
                    return true;
                }
            }
        }

        if (!this.heistTargets || this.heistTargets.length === 0) return false;

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

        // Update SERA Space Center 3D Rocket Launch Sequence (Camera Zoom, Thermal Blast Wave & Orion Capsule Splashdown!)
        if (this.rocketLaunch) {
            const rl = this.rocketLaunch;
            const lp = this.landmarks3D && this.landmarks3D.launchpad;

            // Remove previous frame's temporary launch camera pullback so user zoom is preserved cleanly
            if (game.renderer && rl.appliedZoom) {
                game.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, (game.renderer.zoomOffsetBlocks || 0) - rl.appliedZoom));
                rl.appliedZoom = 0;
            }

            let targetZoom = 0.0;
            if (rl.state !== "IDLE") {
                rl.timer += dt;
                if (rl.state === "COUNTDOWN") {
                    rl.armSwing = Math.min(1.42, (rl.timer / 2.6) * 1.42);
                    targetZoom = (rl.timer / 3.0) * 1.35;
                    if (game.camera) {
                        game.camera.shake = Math.max(game.camera.shake || 0, 2.5);
                    }
                    if (rl.timer >= 3.0) {
                        rl.state = "LIFTOFF";
                        rl.timer = 0;
                        rl.velZ = 0.08;
                        if (lp) {
                            // 3D Thermal Blast Wave across the Flame Deflector Trench (L33): hurls nearby cars & peds outward!
                            const bx = lp.x + 14;
                            const by = lp.y;
                            if (Array.isArray(game.vehicles)) {
                                for (const v of game.vehicles) {
                                    const d = Math.hypot(v.x - bx, v.y - by);
                                    if (d > 1 && d < 165) {
                                        const push = (1.0 - d / 165) * 420;
                                        v.vx = (v.vx || 0) + ((v.x - bx) / d) * push;
                                        v.vy = (v.vy || 0) + ((v.y - by) / d) * push;
                                        v.speed = Math.max(v.speed || 0, 180);
                                    }
                                }
                            }
                            if (Array.isArray(game.pedestrians)) {
                                for (const ped of game.pedestrians) {
                                    const d = Math.hypot(ped.x - bx, ped.y - by);
                                    if (d > 1 && d < 155) {
                                        ped.vx = ((ped.x - bx) / d) * 260;
                                        ped.vy = ((ped.y - by) / d) * 260;
                                    }
                                }
                            }
                            if (Array.isArray(game.floatingTexts)) {
                                game.floatingTexts.push({
                                    x: lp.x,
                                    y: lp.y,
                                    z: 3.8,
                                    text: "🔥 LIFTOFF! WE HAVE LIFTOFF OF SERA ARTEMIS VI!",
                                    color: "#fde047",
                                    life: 3.8
                                });
                            }
                        }
                    }
                } else if (rl.state === "LIFTOFF") {
                    rl.armSwing = 1.42;
                    rl.velZ += (0.22 + rl.timer * 0.16) * dt;
                    rl.liftZ += rl.velZ * dt;
                    // Smooth automatic camera pullback so player sees the full vertical rocket ascent past the LUT tower!
                    if (rl.liftZ < 9.0) {
                        targetZoom = 1.35 + Math.min(3.15, rl.liftZ * 0.48);
                    } else {
                        targetZoom = Math.max(0.0, 4.50 * (1.0 - (rl.liftZ - 9.0) / 6.0));
                    }
                    if (game.camera && rl.liftZ < 6.0) {
                        game.camera.shake = Math.max(game.camera.shake || 0, 5.5 - rl.liftZ * 0.7);
                    }
                    if (rl.liftZ > 15.0) {
                        rl.state = "COOLDOWN";
                        rl.timer = 0;
                        // Deploy Orion Crew Capsule under 3D Parachutes just east of SERA Spaceport Beach!
                        if (lp) {
                            rl.capsuleActive = true;
                            rl.capsuleAlt = 3.4;
                            rl.capsuleX = lp.splashX || (473.5 * TILE_SIZE);
                            rl.capsuleY = lp.splashY || (35.0 * TILE_SIZE);
                            if (Array.isArray(game.floatingTexts)) {
                                game.floatingTexts.push({
                                    x: rl.capsuleX,
                                    y: rl.capsuleY,
                                    z: 3.4,
                                    text: "🪂 ORION CAPSULE DESCENDING EAST OF PAD (+$50,000)!",
                                    color: "#38bdf8",
                                    life: 4.0
                                });
                            }
                        }
                    }
                } else if (rl.state === "COOLDOWN") {
                    if (rl.timer > 22.0) {
                        rl.state = "IDLE";
                        rl.timer = 0;
                        rl.liftZ = 0;
                        rl.velZ = 0;
                        rl.armSwing = 0;
                    }
                }
            }

            // Apply launch camera zoom pullback if player is near SERA Spaceport
            if (targetZoom > 0.01 && lp && game.renderer && Math.hypot(px - lp.x, py - lp.y) < 780) {
                rl.appliedZoom = targetZoom;
                game.renderer.zoomOffsetBlocks = Math.max(-2.2, Math.min(8.0, (game.renderer.zoomOffsetBlocks || 0) + rl.appliedZoom));
            }

            // Update Parachuting / Splashed-Down Orion Crew Capsule
            if (rl.capsuleActive) {
                if (rl.capsuleAlt > 0) {
                    rl.capsuleAlt = Math.max(0, rl.capsuleAlt - 0.52 * dt);
                } else if (p && Math.hypot(px - rl.capsuleX, py - rl.capsuleY) < 54) {
                    // Instant pickup when walking/swimming/boating over the splashed-down capsule!
                    rl.capsuleActive = false;
                    if (typeof game.addScore === "function") game.addScore(50000);
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🪂 ORION CAPSULE RECOVERED!", "CLASSIFIED NASA LUNAR PAYLOAD SECURED • +$50,000", "#4ade80", 3.4);
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: rl.capsuleX,
                            y: rl.capsuleY,
                            z: 2.75,
                            text: "🪂 ORION LUNAR PAYLOAD RECOVERED! +$50,000!",
                            color: "#4ade80",
                            life: 3.4
                        });
                    }
                }
            }
        }

        // 4. Update GTA 6 Trailer 1 Rogue Leonida Alligators (Poolside & Convenience Store Forecourts)
        if (Array.isArray(this.gatorEncounters)) {
            const pCar = p && p.car ? p.car : null;
            for (const ge of this.gatorEncounters) {
                if (!ge.active) {
                    ge.cooldown = Math.max(0, (ge.cooldown || 0) - dt);
                    if (ge.cooldown <= 0 && Math.hypot(px - ge.x, py - ge.y) > 420) {
                        ge.active = true;
                    }
                    continue;
                }
                // Slowly turn head toward player if close
                const dPlayer = Math.hypot(px - ge.x, py - ge.y);
                if (dPlayer < 140 && dPlayer > 12) {
                    const targetAng = Math.atan2(py - ge.y, px - ge.x);
                    let diff = targetAng - ge.ang;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    ge.ang += diff * Math.min(1.0, dt * 2.5);
                }
                // Vehicle roadkill impact on rogue gator!
                if (pCar && Math.hypot(pCar.x - ge.x, pCar.y - ge.y) < 38) {
                    const spd = Math.hypot(pCar.vx || 0, pCar.vy || 0) || Math.abs(pCar.speed || 0);
                    if (spd > 45) {
                        ge.active = false;
                        ge.cooldown = 35.0;
                        if (typeof game.addScore === "function") game.addScore(1500);
                        if (typeof game.addCash === "function") game.addCash(1500, "🐊 ROGUE GATOR ROADKILL!");
                        if (game.audio) game.audio.playPickup("SCORE");
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: ge.x,
                                y: ge.y,
                                z: 2.55,
                                text: "🐊 LEONIDA GATOR ROADKILL! +$1,500",
                                color: "#4ade80",
                                life: 2.2
                            });
                        }
                    }
                }
            }
        }

        // 5. Update GTA 6 VCPD High-Speed Radar Speed Traps & Nitrous Boost Portals
        if (Array.isArray(this.speedTraps)) {
            const pCar = p && p.car ? p.car : null;
            for (const st of this.speedTraps) {
                if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dt);
                if (st.flashTimer > 0) st.flashTimer = Math.max(0, st.flashTimer - dt);
                if (pCar && st.cooldown <= 0 && Math.hypot(pCar.x - st.roadX, pCar.y - st.roadY) < 62) {
                    const spd = Math.hypot(pCar.vx || 0, pCar.vy || 0) || Math.abs(pCar.speed || 0);
                    if (spd > 135) {
                        const mph = Math.max(85, Math.round(spd * 0.52));
                        st.cooldown = 12.0;
                        st.flashTimer = 0.45;
                        const isRecord = mph > (st.bestMph || 140);
                        if (isRecord) st.bestMph = mph;
                        const bonus = isRecord ? 5000 : 3500;
                        // Apply Nitrous Oxide Overdrive Boost!
                        pCar.vx = (pCar.vx || 0) * 1.28;
                        pCar.vy = (pCar.vy || 0) * 1.28;
                        if (typeof game.addScore === "function") game.addScore(bonus);
                        if (typeof game.addCash === "function") game.addCash(bonus, `📸 ${st.name}: ${mph} MPH!`);
                        if (game.audio) game.audio.playPickup("WEAPON");
                        if (typeof game.showBigBanner === "function") {
                            game.showBigBanner(
                                `📸 VCPD RADAR: ${mph} MPH!`,
                                `${st.name} • +$${bonus.toLocaleString()} & NITROUS OVERDRIVE BOOST!`,
                                "#38bdf8",
                                2.4
                            );
                        }
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: pCar.x,
                                y: pCar.y,
                                z: 2.75,
                                text: `📸 ${mph} MPH CLOCKED! +$${bonus.toLocaleString()} + NITRO BOOST!`,
                                color: "#38bdf8",
                                life: 2.6
                            });
                        }
                    }
                }
            }
        }

        // 6. Update Grupo Seguro Armored Cash Trucks & 3D Spinning Emerald/Gold Cash Briefcase Drops
        if (Array.isArray(game.vehicles)) {
            const pCar = p && p.car ? p.car : null;
            for (const v of game.vehicles) {
                if (!v.isArmoredCashTruck) continue;
                if (v.lastCashHitHp === undefined) v.lastCashHitHp = v.hp;
                if ((v.cashBagsLeft || 0) > 0) {
                    const rammedByPlayer = pCar && pCar !== v && Math.hypot(pCar.x - v.x, pCar.y - v.y) < 58 &&
                        Math.hypot(pCar.vx || 0, pCar.vy || 0) > 75;
                    if (v.hp < v.lastCashHitHp - 8 || v.destroyed || rammedByPlayer) {
                        v.lastCashHitHp = v.hp;
                        const dropCount = v.destroyed ? v.cashBagsLeft : Math.min(2, v.cashBagsLeft);
                        this.ejectArmoredCashDrops(game, v, dropCount);
                    }
                }
            }
        }
        if (Array.isArray(this.cashDrops) && this.cashDrops.length > 0) {
            for (let i = this.cashDrops.length - 1; i >= 0; i--) {
                const cd = this.cashDrops[i];
                cd.age = (cd.age || 0) + dt;
                cd.x += (cd.vx || 0) * dt;
                cd.y += (cd.vy || 0) * dt;
                cd.vx *= Math.pow(0.15, dt);
                cd.vy *= Math.pow(0.15, dt);
                if (p && Math.hypot(px - cd.x, py - cd.y) < 44) {
                    this.cashDrops.splice(i, 1);
                    if (typeof game.addScore === "function") game.addScore(2500);
                    if (typeof game.addCash === "function") game.addCash(2500, "💼 ARMORED VAULT CASH!");
                    if (game.audio) game.audio.playPickup("SCORE");
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: cd.x,
                            y: cd.y,
                            z: 2.55,
                            text: "💼 GRUPO SEGURO CASH BRIEFCASE! +$2,500!",
                            color: "#fde047",
                            life: 2.2
                        });
                    }
                } else if (cd.age > 45.0) {
                    this.cashDrops.splice(i, 1);
                }
            }
        }

        // 7. Update GTA 6 Leonida Social Media Viral Reels Meter (Drifting / Wheelies / Stunts for Live Streamers!)
        if (this.viralCooldown > 0) {
            this.viralCooldown = Math.max(0, this.viralCooldown - dt);
        }
        if (p && p.inVehicle && p.car && game.input && game.input.handbrake) {
            const spd = Math.hypot(p.car.vx || 0, p.car.vy || 0);
            if (spd > 135) {
                this.viralDriftTimer = (this.viralDriftTimer || 0) + dt;
                if (this.viralDriftTimer >= 0.85 && this.viralCooldown <= 0) {
                    this.viralDriftTimer = 0;
                    this.viralCooldown = 15.0;
                    const viewsK = 45 + Math.floor(Math.random() * 85);
                    if (typeof game.addScore === "function") game.addScore(3000);
                    if (typeof game.addCash === "function") game.addCash(3000, `📱 VIRAL REEL (+${viewsK}K VIEWS)!`);
                    if (game.audio) game.audio.playPickup("SCORE");
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: p.car.x,
                            y: p.car.y,
                            z: 2.68,
                            text: `📱 GOING VIRAL ON LEONIDA REELS! +${viewsK}K VIEWS • +$3,000!`,
                            color: "#f472b6",
                            life: 2.6
                        });
                    }
                }
            } else {
                this.viralDriftTimer = Math.max(0, (this.viralDriftTimer || 0) - dt);
            }
        } else {
            this.viralDriftTimer = 0;
        }
    }

    ejectArmoredCashDrops(game, v, count) {
        if (!v || (v.cashBagsLeft || 0) <= 0) return;
        const n = Math.min(count, v.cashBagsLeft);
        v.cashBagsLeft -= n;
        const backAng = (v.angle || 0) + Math.PI;
        for (let i = 0; i < n; i++) {
            const spread = (i - (n - 1) * 0.5) * 0.55 + (Math.random() - 0.5) * 0.25;
            const ejAng = backAng + spread;
            const dist = 34 + i * 10;
            this.cashDrops.push({
                x: v.x + Math.cos(ejAng) * dist,
                y: v.y + Math.sin(ejAng) * dist,
                z: v.z || 2.0,
                vx: Math.cos(ejAng) * (95 + Math.random() * 55),
                vy: Math.sin(ejAng) * (95 + Math.random() * 55),
                seed: Math.random() * 6.28,
                age: 0
            });
        }
        if (game.wantedSystem) {
            game.wantedSystem.addChaos(120, "ARMORED_TRUCK_HEIST", game);
            if ((game.wantedSystem.level || 0) < 2) game.wantedSystem.level = 2;
        }
        if (game.audio) game.audio.playPickup("WEAPON");
        if (Array.isArray(game.floatingTexts)) {
            game.floatingTexts.push({
                x: v.x,
                y: v.y,
                z: 2.75,
                text: `💰 ARMORED TRUCK DOORS BREACHED! ${n}x CASH BRIEFCASES EJECTED!`,
                color: "#fde047",
                life: 2.8
            });
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
            if (this.landmarks3D.atcTower) stampTower(this.landmarks3D.atcTower.x, this.landmarks3D.atcTower.y, 1, 4.2);
            if (this.landmarks3D.waterTower) stampTower(this.landmarks3D.waterTower.x, this.landmarks3D.waterTower.y, 1, 4.0);
            if (this.landmarks3D.viceSign) stampTower(this.landmarks3D.viceSign.x, this.landmarks3D.viceSign.y, 1, 3.6);
            if (this.landmarks3D.kalagaLookout) stampTower(this.landmarks3D.kalagaLookout.x, this.landmarks3D.kalagaLookout.y, 1, 4.1);
            if (this.landmarks3D.alliedSugarSilos) stampTower(this.landmarks3D.alliedSugarSilos.x, this.landmarks3D.alliedSugarSilos.y, 1, 3.7);
            for (const lh of this.landmarks3D.lighthouses) stampTower(lh.x, lh.y, 1, 3.8);
            if (Array.isArray(this.landmarks3D.gtaBillboards)) {
                for (const bb of this.landmarks3D.gtaBillboards) stampTower(bb.x, bb.y, 0, 2.95);
            }
        }
        if (this.map && this.map.prisonCompound && Array.isArray(this.map.prisonCompound.towers)) {
            for (const tw of this.map.prisonCompound.towers) {
                stampTower(tw.x, tw.y, 0, 2.85);
            }
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

        // Spawn 3 Interactive GTA 6 "Grupo Seguro" Armored Cash Trucks ($15,000 Vault Payload each!)
        if (typeof Vehicle === "function") {
            const armoredSpecs = [
                { id: "armored_ocean_dr",  x: 445.5 * TILE_SIZE, y: 222.0 * TILE_SIZE, ang: Math.PI * 0.5 },
                { id: "armored_downtown",  x: 285.5 * TILE_SIZE, y: 250.0 * TILE_SIZE, ang: Math.PI * 0.5 },
                { id: "armored_vice_port", x: 342.0 * TILE_SIZE, y: 326.0 * TILE_SIZE, ang: 0 }
            ];
            for (const as of armoredSpecs) {
                if (game.vehicles.some(v => Math.hypot(v.x - as.x, v.y - as.y) < 36)) continue;
                const av = new Vehicle(as.id, "BRINKS_TRUCK", as.x, as.y, as.ang);
                av.z = 2.0;
                av.missionTag = "LANDMARK";
                av.isArmoredCashTruck = true;
                av.cashBagsLeft = 6;
                av.lastCashHitHp = av.hp;
                game.vehicles.push(av);
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
            uniform sampler2D uTilesTex;
            uniform sampler2D uDayLightTex;
            uniform vec2 uSunDir;
            uniform float uNightTint;
            uniform float uSunsetTint;

            float hash21(vec2 p) {
                p = fract(p * vec2(123.34, 456.21));
                p += dot(p, p + 45.32);
                return fract(p.x * p.y);
            }

            // Sample authentic 64x64 3ds Max pixel-art tile from gta1_tiles_vice.png (16x51 atlas)
            vec4 sampleViceTile(float col, float row, vec2 uv) {
                vec2 localUV = clamp(uv, vec2(0.5 / 64.0), vec2(63.5 / 64.0));
                return texture2D(uTilesTex, (vec2(col, row) + localUV) / vec2(16.0, 51.0));
            }

            void main() {
                vec4 c;
                bool isShadowSkirt = false;

                // 64px-per-tile pixel-art texel grid quantization (matches GTA 1 / Vice City 26 1:1 texel density)
                vec3 qWorld = floor(vWorldPos * 64.0 + 0.5) / 64.0;

                if (vUV.x >= 1.5) {
                    // MODE A: Face-Mapped 64x64 Tile directly from gta1_tiles_vice.png (uTilesTex)
                    vec4 tex = texture2D(uTilesTex, vec2(vUV.x - 2.0, vUV.y));
                    if (tex.a < 0.12) discard;
                    c = vec4(tex.rgb * vColor.rgb, tex.a * vColor.a);
                } else if (vUV.x < -19.5) {
                    // MODE B: World-Tiled 1:1 64x64 Lid Tile from gta1_tiles_vice.png (matches sampleLidTile in cityFS!)
                    float col = floor(-vUV.x - 20.0 + 0.5);
                    float row = floor(vUV.y + 0.5);
                    vec4 tex = sampleViceTile(col, row, fract(vWorldPos.xz));
                    c = vec4(tex.rgb * vColor.rgb, vColor.a);
                } else if (vUV.x < -0.5) {
                    // MODE C: 64px-Quantized Pixel-Art + uTilesTex-Blended Materials (MAT 1..8)
                    float rawX = -vUV.x;
                    float matId = floor(rawX + 0.001);
                    vec2 puv = vec2(clamp((rawX - matId) / 0.85, 0.0, 1.0), clamp(vUV.y, 0.0, 1.0));
                    vec2 qUV = floor(puv * 32.0 + 0.5) / 32.0;
                    c = vColor;

                    // Quantized 64px texel grain & dark charcoal pixel-art contour color (#0f172a)
                    float grain = (hash21(floor(vWorldPos.xz * 64.0 + vWorldPos.y * 32.0)) - 0.5) * 0.06;
                    vec3 darkInk = vec3(0.09, 0.12, 0.18);
                    float edgeX = min(puv.x, 1.0 - puv.x);
                    float edgeY = min(puv.y, 1.0 - puv.y);

                    if (matId < 1.5) {
                        // MAT 1: Architectural Stucco / Masonry / Trim (blends L8 stone tile grain + 1px dark contour)
                        vec3 stoneTex = sampleViceTile(14.0, 24.0, fract(qWorld.xz + vec2(qWorld.y))).rgb;
                        float stoneMod = 0.88 + dot(stoneTex, vec3(0.333)) * 0.18;
                        float bevel = step(0.04, min(edgeX, edgeY));
                        float vAO = mix(0.86, 1.04, qUV.y);
                        c.rgb = c.rgb * stoneMod * vAO + grain;
                        c.rgb = mix(darkInk, c.rgb, mix(0.55, 1.0, bevel));
                    } else if (matId < 2.5) {
                        // MAT 2: Industrial Concrete Blast Pad & Retaining Wall (samples L71 concrete grid & L8 pavers at 1:1 scale)
                        vec3 concTex = sampleViceTile(13.0, 28.0, fract(vWorldPos.xz)).rgb;
                        vec3 paverTex = sampleViceTile(14.0, 24.0, fract(vWorldPos.xz * 0.5)).rgb;
                        vec3 baseTex = mix(concTex, paverTex, 0.42);
                        float rad = length(qUV - vec2(0.5, 0.5)) * 2.0;
                        float scorch = smoothstep(0.12, 0.78, rad);
                        float outline = step(0.035, min(edgeX, edgeY));
                        c.rgb = mix(baseTex * c.rgb * 1.32, c.rgb * (0.72 + baseTex * 0.42), 0.45) * mix(0.78, 1.02, scorch) + grain;
                        c.rgb = mix(darkInk, c.rgb, mix(0.45, 1.0, outline));
                    } else if (matId < 3.5) {
                        // MAT 3: 64px-Quantized Yellow/Black Hazard Chevrons over L33 Riveted Blast Steel
                        vec3 steelTex = sampleViceTile(7.0, 26.0, fract(qWorld.xz * 2.0)).rgb;
                        float stripe = step(0.0, sin((qWorld.x + qWorld.z + qWorld.y * 0.5) * 25.1327));
                        vec3 hazYellow = vec3(0.92, 0.72, 0.14) * (0.85 + steelTex.r * 0.35);
                        vec3 hazDark = steelTex * 0.85;
                        float border = step(0.06, min(edgeX, edgeY));
                        c.rgb = mix(hazDark, hazYellow, stripe) + grain;
                        c.rgb = mix(darkInk, c.rgb, mix(0.40, 1.0, border));
                    } else if (matId < 4.5) {
                        // MAT 4: 24x24 Pixel-Art Open-Lattice Riveted Steel Truss (matches S246 & S363 in gta1_tiles_vice.png)
                        vec2 tp = floor(puv * 24.0) / 24.0;
                        float fx = min(tp.x, 1.0 - tp.x);
                        float fy = min(tp.y, 1.0 - tp.y);
                        float d1 = abs(tp.x - tp.y);
                        float d2 = abs(tp.x - (1.0 - tp.y));
                        bool isOuter = (fx < 0.17) || (fy < 0.17);
                        bool isCross = (d1 < 0.125) || (d2 < 0.125);
                        if (!isOuter && !isCross) discard;
                        // 1-texel dark charcoal pixel-art girder outline + corner gusset rivets + L45 steel grain
                        bool isOutline = (fx < 0.045) || (fy < 0.045) ||
                                         (!isOuter && d1 > 0.082 && d2 > 0.082) ||
                                         (isOuter && fx > 0.125 && fy > 0.125 && !isCross);
                        vec3 steelTex = sampleViceTile(3.0, 27.0, tp).rgb;
                        float rivet = step(0.86, sin(tp.x * 75.398) * sin(tp.y * 75.398)) * (isOuter ? 0.12 : 0.0);
                        c.rgb = c.rgb * (0.76 + steelTex * 0.38) * (isOuter ? 1.04 : 0.88) + rivet + grain;
                        if (isOutline) c.rgb = mix(c.rgb, darkInk, 0.72);
                    } else if (matId < 5.5) {
                        // MAT 5: 3ds Max Pixel-Art Aerospace Fuselage / Cryo Sphere / Cylindrical Monument (samples L45 brushed steel)
                        vec3 aeroTex = sampleViceTile(3.0, 27.0, qUV).rgb;
                        float ring = step(0.42, abs(fract(qUV.y * 4.0) - 0.5));
                        float stringer = step(0.42, abs(fract(qUV.x * 8.0) - 0.5));
                        // Stepped 3ds Max metallic highlight band + dark charcoal panel weld seams
                        float sheen = floor(pow(max(0.0, 1.0 - abs(qUV.x - 0.38) * 2.0), 2.0) * 5.0) / 5.0 * 0.14;
                        c.rgb = c.rgb * (0.78 + aeroTex * 0.34) + sheen + grain;
                        c.rgb = mix(c.rgb, darkInk, max(ring * 0.38, stringer * 0.22));
                    } else if (matId < 6.5) {
                        // MAT 6: 3ds Max Corrugated Steel Shipping Container (samples L63 corrugated metal + dark corner castings)
                        vec3 corrTex = sampleViceTile(5.0, 28.0, qUV).rgb;
                        float rib = floor(sin(qUV.x * 50.265) * 3.0) / 3.0 * 0.09;
                        bool isFrame = (edgeX < 0.065) || (edgeY < 0.085);
                        bool isDarkEdge = (edgeX < 0.03) || (edgeY < 0.04);
                        c.rgb = c.rgb * (0.76 + dot(corrTex, vec3(0.333)) * 0.38) + rib + (isFrame ? 0.06 : 0.0) + grain;
                        if (isDarkEdge) c.rgb = mix(c.rgb, darkInk, 0.70);
                    } else if (matId < 7.5) {
                        // MAT 7: Observation Bunker & Fresnel Lantern Glass (samples L31 blue glass skylight grid)
                        vec3 glassTex = sampleViceTile(5.0, 26.0, qUV).rgb;
                        float mullionX = step(0.40, abs(fract(qUV.x * 4.0) - 0.5));
                        float mullionY = step(0.40, abs(fract(qUV.y * 2.0) - 0.5));
                        float mullion = max(mullionX, mullionY);
                        c.rgb = mix(mix(c.rgb, glassTex, 0.48), darkInk, mullion * 0.72);
                    } else if (matId < 8.5) {
                        // MAT 8: Soft Ground Ambient Occlusion Contact Shadow Skirt
                        isShadowSkirt = true;
                        vec2 d = abs(puv - vec2(0.5, 0.5)) * 2.0;
                        float dist = max(d.x, d.y);
                        float falloff = 1.0 - smoothstep(0.45, 0.98, dist);
                        c = vec4(0.02, 0.03, 0.06, vColor.a * falloff);
                    }
                } else {
                    // MODE D: Sprite & Custom 3D House Facade Atlas (gta1_sprites.png)
                    c = texture2D(uTex, vUV) * vColor;
                    if (c.a < 0.12) discard;
                }

                // Apply exact cityFS (js/renderer.js) Daytime Solar Grading, Ray-Marched Lightmap (uDayLightTex) & Storey AO!
                if (!isShadowSkirt) {
                    float dayAmt = clamp(1.0 - uNightTint * 1.15, 0.0, 1.0);
                    if (dayAmt > 0.01) {
                        vec4 lm = texture2D(uDayLightTex, vWorldPos.xz / 512.0);
                        float onGround = clamp(2.65 - vWorldPos.y, 0.0, 1.0);
                        float bldAO = lm.g * onGround * 0.50;
                        float westSunWeight = clamp(0.76 - uSunDir.x * 0.35, 0.25, 0.92);
                        float bldShadow = max(lm.a * westSunWeight, lm.b * (1.0 - westSunWeight * 0.45)) * onGround * 0.60;
                        float totalShade = clamp(max(bldShadow, bldAO), 0.0, 1.0);
                        vec3 sunlitTint = vec3(1.07, 1.03, 0.95);
                        vec3 shadowTint = vec3(0.68, 0.75, 0.88);
                        vec3 dayGrading = mix(sunlitTint, shadowTint, totalShade);
                        float baseAO = mix(0.86, 1.0, smoothstep(2.0, 2.45, vWorldPos.y));
                        c.rgb = min(vec3(1.0), c.rgb * mix(vec3(1.0), dayGrading * baseAO, dayAmt));
                    }
                    if (uSunsetTint > 0.01) {
                        vec3 sunsetRgb = c.rgb * vec3(1.16, 0.88, 0.96) + vec3(0.04, 0.01, 0.02);
                        c.rgb = mix(c.rgb, min(vec3(1.0), sunsetRgb), uSunsetTint * 0.60);
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
            uTilesTex: gl.getUniformLocation(this.meshProg, "uTilesTex"),
            uDayLightTex: gl.getUniformLocation(this.meshProg, "uDayLightTex"),
            uSunDir: gl.getUniformLocation(this.meshProg, "uSunDir"),
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
        const encodeMatUV = (matId, u, v) => [
            -matId - Math.max(0.01, Math.min(0.99, u)) * 0.85,
            Math.max(0.01, Math.min(0.99, v))
        ];
        // Direct 64x64 Tile Atlas UVs in gta1_tiles_vice.png (sideIdx 0..389, lidIdx 390 + lid)
        const getTileAtlasUV = (tileIdx, u0 = 0.0, v0 = 0.0, u1 = 1.0, v1 = 1.0) => {
            const col = tileIdx % 16;
            const row = Math.floor(tileIdx / 16);
            const pu0 = Math.max(0.5 / 64.0, Math.min(63.5 / 64.0, u0));
            const pv0 = Math.max(0.5 / 64.0, Math.min(63.5 / 64.0, v0));
            const pu1 = Math.max(0.5 / 64.0, Math.min(63.5 / 64.0, u1));
            const pv1 = Math.max(0.5 / 64.0, Math.min(63.5 / 64.0, v1));
            return [
                2.0 + (col + pu0) / 16.0,
                (row + pv0) / 51.0,
                2.0 + (col + pu1) / 16.0,
                (row + pv1) / 51.0
            ];
        };
        // World-Tiled 1:1 64x64 Lid Tile UV encoding (tiles seamlessly across world-space fract(vWorldPos.xz))
        const encodeLidWorldUV = (lidIdx) => {
            const idx = 390 + lidIdx;
            const col = idx % 16;
            const row = Math.floor(idx / 16);
            return [-20.0 - col, row];
        };
        const pushQuad3D = (p0, p1, p2, p3, u0, v0, u1, v1, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], u0, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);

            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p3[0], p3[1], p3[2], u1, v1, r, g, b, a);
        };
        const pushMatQuad3D = (p0, p1, p2, p3, matId, r, g, b, a = 1.0) => {
            const [u0, v0] = encodeMatUV(matId, 0.02, 0.98);
            const [u1, v1] = encodeMatUV(matId, 0.98, 0.02);
            pushQuad3D(p0, p1, p2, p3, u0, v0, u1, v1, r, g, b, a);
        };
        const pushTileQuad3D = (p0, p1, p2, p3, tileIdx, r = 1.0, g = 1.0, b = 1.0, a = 1.0) => {
            const [u0, v0, u1, v1] = getTileAtlasUV(tileIdx, 0.0, 0.0, 1.0, 1.0);
            pushQuad3D(p0, p1, p2, p3, u0, v0, u1, v1, r, g, b, a);
        };
        const pushWorldLidQuad3D = (p0, p1, p2, p3, lidIdx, r = 1.0, g = 1.0, b = 1.0, a = 1.0) => {
            const [wu, wv] = encodeLidWorldUV(lidIdx);
            pushQuad3D(p0, p1, p2, p3, wu, wv, wu, wv, r, g, b, a);
        };
        const pushTri3D = (p0, p1, p2, uv0, uv1, uv2, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], uv0[0], uv0[1], r, g, b, a);
            pushV(p1[0], p1[1], p1[2], uv1[0], uv1[1], r, g, b, a);
            pushV(p2[0], p2[1], p2[2], uv2[0], uv2[1], r, g, b, a);
        };

        const getUV = (key) => {
            const rect = objSprites[key];
            if (!rect) return [-1.4, 0.5, -1.4, 0.5];
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
                pushMatQuad3D(tNW, tNE, tSW, tSE, 1, topColor[0], topColor[1], topColor[2], 1.0);
            }
        };

        // 3D Box Textured Directly with Authentic 64x64 Tiles from gta1_tiles_vice.png (uTilesTex)
        const emitTileBox3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yBot, yTop, frontTileIdx, sideTileIdx, topLidIdx = null, col = [1.0, 1.0, 1.0], worldTileTop = false) => {
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

            const sIdx = (sideTileIdx !== null && sideTileIdx !== undefined) ? sideTileIdx : frontTileIdx;
            if (frontTileIdx !== null && frontTileIdx !== undefined) {
                pushTileQuad3D(tSW, tSE, bSW, bSE, frontTileIdx, r * 1.02, g * 1.01, b * 0.99, 1.0);
                pushTileQuad3D(tNE, tNW, bNE, bNW, sIdx, r * 0.78, g * 0.80, b * 0.85, 1.0);
                pushTileQuad3D(tNW, tSW, bNW, bSW, sIdx, r * 0.92, g * 0.93, b * 0.95, 1.0);
                pushTileQuad3D(tSE, tNE, bSE, bNE, sIdx, r * 0.85, g * 0.86, b * 0.90, 1.0);
            }
            if (topLidIdx !== null && topLidIdx !== undefined) {
                if (worldTileTop) {
                    pushWorldLidQuad3D(tNW, tNE, tSW, tSE, topLidIdx, r, g, b, 1.0);
                } else {
                    pushTileQuad3D(tNW, tNE, tSW, tSE, 390 + topLidIdx, r, g, b, 1.0);
                }
            }
        };

        const emitSolidBox3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yBot, yTop, col, matId = 1, alpha = 1.0) => {
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

            pushMatQuad3D(tSW, tSE, bSW, bSE, matId, r * 1.00, g * 1.00, b * 1.00, alpha);
            pushMatQuad3D(tNE, tNW, bNE, bNW, matId, r * 0.76, g * 0.78, b * 0.82, alpha);
            pushMatQuad3D(tNW, tSW, bNW, bSW, matId, r * 0.92, g * 0.92, b * 0.94, alpha);
            pushMatQuad3D(tSE, tNE, bSE, bNE, matId, r * 0.84, g * 0.85, b * 0.88, alpha);
            if (matId !== 4) {
                pushMatQuad3D(tNW, tNE, tSW, tSE, matId, Math.min(1, r * 1.06), Math.min(1, g * 1.06), Math.min(1, b * 1.06), alpha);
            }
        };

        const emitAOShadow3D = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yGround, alpha = 0.44) => {
            const hw = wPx * 0.5;
            const hd = dPx * 0.5;
            const yS = yGround + 0.012;
            const pNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yS);
            const pNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yS);
            const pSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yS);
            const pSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yS);
            pushMatQuad3D(pNW, pNE, pSW, pSE, 8, 0.02, 0.03, 0.06, alpha);
        };

        // True 3D Multi-Segment Cylinder / Frustum with Smooth Radial Sun Shading & Circular Cap
        const emitCylinder3D = (cxPx, cyPx, offX, offY, rBotPx, rTopPx, yBot, yTop, segs, col, matId = 5, capTop = true) => {
            const [r, g, b] = col;
            const centerTop = toWorld(cxPx, cyPx, 1, 0, offX, offY, yTop);
            const uvCenter = encodeMatUV(matId, 0.5, 0.5);
            for (let s = 0; s < segs; s++) {
                const a0 = (s * Math.PI * 2.0) / segs;
                const a1 = ((s + 1) * Math.PI * 2.0) / segs;
                const aMid = (a0 + a1) * 0.5;
                const nx = Math.cos(aMid);
                const ny = Math.sin(aMid);
                // Directional sun from South-East (0.65, 0.76)
                const sunDot = nx * 0.65 + ny * 0.76;
                const shade = 0.86 + 0.18 * sunDot + Math.pow(Math.max(0, sunDot), 4.0) * 0.08;
                const sr = Math.min(1.0, r * shade);
                const sg = Math.min(1.0, g * shade);
                const sb = Math.min(1.0, b * shade);

                const b0 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a0) * rBotPx, offY + Math.sin(a0) * rBotPx, yBot);
                const b1 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a1) * rBotPx, offY + Math.sin(a1) * rBotPx, yBot);
                const t0 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a0) * rTopPx, offY + Math.sin(a0) * rTopPx, yTop);
                const t1 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a1) * rTopPx, offY + Math.sin(a1) * rTopPx, yTop);

                const [u0, v0] = encodeMatUV(matId, s / segs, 0.98);
                const [u1, v1] = encodeMatUV(matId, (s + 1) / segs, 0.02);
                pushQuad3D(t0, t1, b0, b1, u0, v0, u1, v1, sr, sg, sb, 1.0);

                if (capTop && rTopPx > 0.5) {
                    const uv0 = encodeMatUV(matId, 0.5 + 0.45 * Math.cos(a0), 0.5 + 0.45 * Math.sin(a0));
                    const uv1 = encodeMatUV(matId, 0.5 + 0.45 * Math.cos(a1), 0.5 + 0.45 * Math.sin(a1));
                    pushTri3D(centerTop, t0, t1, uvCenter, uv0, uv1, Math.min(1, r * 1.07), Math.min(1, g * 1.07), Math.min(1, b * 1.07), 1.0);
                }
            }
        };

        // True 3D Conical Nose Cone / Dome Cap with Smooth Circumferential Shading
        const emitCone3D = (cxPx, cyPx, offX, offY, rBotPx, yBot, yTop, segs, col, matId = 5) => {
            const [r, g, b] = col;
            const apex = toWorld(cxPx, cyPx, 1, 0, offX, offY, yTop);
            const uvApex = encodeMatUV(matId, 0.5, 0.98);
            for (let s = 0; s < segs; s++) {
                const a0 = (s * Math.PI * 2.0) / segs;
                const a1 = ((s + 1) * Math.PI * 2.0) / segs;
                const aMid = (a0 + a1) * 0.5;
                const sunDot = Math.cos(aMid) * 0.65 + Math.sin(aMid) * 0.76;
                const shade = 0.88 + 0.18 * sunDot;
                const b0 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a0) * rBotPx, offY + Math.sin(a0) * rBotPx, yBot);
                const b1 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a1) * rBotPx, offY + Math.sin(a1) * rBotPx, yBot);
                const uv0 = encodeMatUV(matId, s / segs, 0.05);
                const uv1 = encodeMatUV(matId, (s + 1) / segs, 0.05);
                pushTri3D(apex, b0, b1, uvApex, uv0, uv1, Math.min(1, r * shade), Math.min(1, g * shade), Math.min(1, b * shade), 1.0);
            }
        };

        // True 3D Geodesic UV Sphere (for Cryogenic LOX/LH2 Propellant Spheres & Radomes)
        const emitSphere3D = (cxPx, cyPx, offX, offY, rPx, yCenter, rElev, latSegs, lonSegs, col, matId = 5) => {
            const [r, g, b] = col;
            for (let la = 0; la < latSegs; la++) {
                const phi0 = -Math.PI * 0.42 + (la / latSegs) * (Math.PI * 0.92);
                const phi1 = -Math.PI * 0.42 + ((la + 1) / latSegs) * (Math.PI * 0.92);
                const y0 = yCenter + Math.sin(phi0) * rElev;
                const y1 = yCenter + Math.sin(phi1) * rElev;
                const pr0 = Math.cos(phi0) * rPx;
                const pr1 = Math.cos(phi1) * rPx;
                for (let lo = 0; lo < lonSegs; lo++) {
                    const a0 = (lo * Math.PI * 2.0) / lonSegs;
                    const a1 = ((lo + 1) * Math.PI * 2.0) / lonSegs;
                    const aMid = (a0 + a1) * 0.5;
                    const phiMid = (phi0 + phi1) * 0.5;
                    const nx = Math.cos(phiMid) * Math.cos(aMid);
                    const ny = Math.sin(phiMid);
                    const nz = Math.cos(phiMid) * Math.sin(aMid);
                    const sunDot = nx * 0.52 + ny * 0.62 + nz * 0.58;
                    const spec = Math.pow(Math.max(0, sunDot), 6.0) * 0.14;
                    const shade = 0.80 + 0.22 * sunDot + spec;

                    const b0 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a0) * pr0, offY + Math.sin(a0) * pr0, y0);
                    const b1 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a1) * pr0, offY + Math.sin(a1) * pr0, y0);
                    const t0 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a0) * pr1, offY + Math.sin(a0) * pr1, y1);
                    const t1 = toWorld(cxPx, cyPx, 1, 0, offX + Math.cos(a1) * pr1, offY + Math.sin(a1) * pr1, y1);

                    const [u0, v0] = encodeMatUV(matId, lo / lonSegs, (la + 1) / latSegs);
                    const [u1, v1] = encodeMatUV(matId, (lo + 1) / lonSegs, la / latSegs);
                    pushQuad3D(t0, t1, b0, b1, u0, v0, u1, v1, Math.min(1, r * shade), Math.min(1, g * shade), Math.min(1, b * shade), 1.0);
                }
            }
        };

        // True 8-Sided Chamfered Concrete Pad with Authentic gta1_tiles_vice.png Sloped Retaining Walls & World-Tiled Lid Deck
        const emitOctagonPad3D = (cxPx, cyPx, offX, offY, rxBot, ryBot, rxTop, ryTop, bevelRatio, yBot, yTop, sideCol, topCol, matId = 2, sideTileIdx = 177, topLidIdx = 71) => {
            const makeOctPts = (rx, ry, yE) => {
                const bx = rx * (1.0 - bevelRatio);
                const by = ry * (1.0 - bevelRatio);
                return [
                    toWorld(cxPx, cyPx, 1, 0, offX - bx, offY - ry, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX + bx, offY - ry, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX + rx, offY - by, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX + rx, offY + by, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX + bx, offY + ry, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX - bx, offY + ry, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX - rx, offY + by, yE),
                    toWorld(cxPx, cyPx, 1, 0, offX - rx, offY - by, yE)
                ];
            };
            const botPts = makeOctPts(rxBot, ryBot, yBot);
            const topPts = makeOctPts(rxTop, ryTop, yTop);
            const centerTop = toWorld(cxPx, cyPx, 1, 0, offX, offY, yTop);
            const worldLidUV = (topLidIdx !== null && topLidIdx !== undefined) ? encodeLidWorldUV(topLidIdx) : null;
            const uvCenter = worldLidUV || encodeMatUV(matId, 0.5, 0.5);
            for (let i = 0; i < 8; i++) {
                const ni = (i + 1) % 8;
                const shade = 0.84 + 0.16 * Math.sin((i / 8.0) * Math.PI * 2.0);
                if (sideTileIdx !== null && sideTileIdx !== undefined) {
                    pushTileQuad3D(
                        topPts[i], topPts[ni], botPts[i], botPts[ni],
                        sideTileIdx,
                        sideCol[0] * shade, sideCol[1] * shade, sideCol[2] * shade, 1.0
                    );
                } else {
                    pushMatQuad3D(
                        topPts[i], topPts[ni], botPts[i], botPts[ni],
                        matId,
                        sideCol[0] * shade, sideCol[1] * shade, sideCol[2] * shade, 1.0
                    );
                }
                const a0 = (i / 8.0) * Math.PI * 2.0;
                const a1 = (ni / 8.0) * Math.PI * 2.0;
                const uv0 = worldLidUV || encodeMatUV(matId, 0.5 + 0.46 * Math.cos(a0), 0.5 + 0.46 * Math.sin(a0));
                const uv1 = worldLidUV || encodeMatUV(matId, 0.5 + 0.46 * Math.cos(a1), 0.5 + 0.46 * Math.sin(a1));
                pushTri3D(centerTop, topPts[i], topPts[ni], uvCenter, uv0, uv1, topCol[0], topCol[1], topCol[2], 1.0);
            }
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
            emitTileBox3D(cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yEave - 0.04, yEave + 0.03, 177, 177, 46, [0.95, 0.97, 0.99], true);
            const hw = (wPx - 8) * 0.5;
            const hd = (dPx - 8) * 0.5;
            const [u0, v0, u1, v1] = getUV(roofKey);
            const pNW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY - hd, yEave + 0.036);
            const pNE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY - hd, yEave + 0.036);
            const pSW = toWorld(cxPx, cyPx, cosA, sinA, offX - hw, offY + hd, yEave + 0.036);
            const pSE = toWorld(cxPx, cyPx, cosA, sinA, offX + hw, offY + hd, yEave + 0.036);
            pushQuad3D(pNW, pNE, pSW, pSE, u0, v0, u1, v1, 1.0, 1.0, 1.0, 1.0);

            const pT = 5.0;
            emitTileBox3D(cxPx, cyPx, cosA, sinA, offX, offY - dPx * 0.5 + pT * 0.5, wPx, pT, yEave + 0.03, yEave + parapetH, 177, 177, 46, trimCol, false);
            emitTileBox3D(cxPx, cyPx, cosA, sinA, offX, offY + dPx * 0.5 - pT * 0.5, wPx, pT, yEave + 0.03, yEave + parapetH, 177, 177, 46, trimCol, false);
            emitTileBox3D(cxPx, cyPx, cosA, sinA, offX - wPx * 0.5 + pT * 0.5, offY, pT, dPx, yEave + 0.03, yEave + parapetH, 177, 177, 46, trimCol, false);
            emitTileBox3D(cxPx, cyPx, cosA, sinA, offX + wPx * 0.5 - pT * 0.5, offY, pT, dPx, yEave + 0.03, yEave + parapetH, 177, 177, 46, trimCol, false);
        };

        // ====================================================================
        // A. COMPILE ALL 23 3D RESIDENTIAL ESTATES, MANSIONS, VILLAS & SHACKS
        //    (Stilt Decks, Piers, Pools, Porches & Foundations Textured with Native L77/L8/L27/S177 Tiles!)
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
            emitAOShadow3D(cx, cy, cosA, sinA, 0, 0, w1 + 36 * sc, d1 + 36 * sc, bz, 0.38);

            if (spec.hasStiltDeck && spec.stiltH > 0) {
                const stiltTop = bz + spec.stiltH * sc;
                const deckW = w1 + (spec.deckPad || 16) * 2 * sc;
                const deckD = d1 + (spec.deckPad || 16) * 2 * sc;
                const pilingCol = spec.stiltColor || [0.76, 0.62, 0.48];
                for (const sx of [-w1 * 0.44, 0, w1 * 0.44]) {
                    for (const sy of [-d1 * 0.44, d1 * 0.44]) {
                        emitTileBox3D(cx, cy, cosA, sinA, sx, sy, 9 * sc, 9 * sc, bz - 0.15, stiltTop, 177, 177, 77, pilingCol, false);
                    }
                }
                // Authentic L77 GTA 1 Wooden Boardwalk Planks on Stilt Deck & Entry Stairs!
                emitTileBox3D(cx, cy, cosA, sinA, 0, 0, deckW, deckD, stiltTop - 0.05, stiltTop + 0.02, 177, 177, 77, [0.94, 0.90, 0.84], true);
                for (let st = 0; st < 5; st++) {
                    const stY = d1 * 0.5 + (14 + st * 6) * sc;
                    const stZ = stiltTop * (1.0 - st / 5.0) + bz * (st / 5.0);
                    emitTileBox3D(cx, cy, cosA, sinA, 22 * sc, stY, 26 * sc, 6 * sc, bz, stZ, 177, 177, 77, [0.92, 0.88, 0.80], false);
                }
                zBase = stiltTop + 0.02;
            } else {
                emitTileBox3D(cx, cy, cosA, sinA, 0, 0, w1 + 8 * sc, d1 + 8 * sc, bz, bz + 0.045, 177, 177, 8, spec.trimColor, true);
            }

            const z1 = zBase + spec.h1 * sc;
            emitBox3D(cx, cy, cosA, sinA, 0, 0, w1, d1, zBase + 0.04, z1, spec.frontWall1, spec.sideWall1, spec.wallColor);

            if (spec.hasPortico) {
                const pw = (spec.porticoW || 76) * sc;
                const pd = (spec.porticoD || 26) * sc;
                const ph = (spec.porticoH || 0.62) * sc;
                const py = d1 * 0.5 + pd * 0.45;
                emitTileBox3D(cx, cy, cosA, sinA, 0, py + pd * 0.3, pw + 10 * sc, pd * 0.6, zBase, zBase + 0.06, 177, 177, 8, [0.96, 0.94, 0.90], true);
                for (const colX of [-pw * 0.42, -pw * 0.15, pw * 0.15, pw * 0.42]) {
                    emitTileBox3D(cx, cy, cosA, sinA, colX, py + pd * 0.35, 7.5 * sc, 7.5 * sc, zBase + 0.05, zBase + ph, 177, 177, 46, [0.97, 0.95, 0.90], false);
                }
                emitHippedRoof3D(cx, cy, cosA, sinA, 0, py, pw + 12 * sc, pd + 10 * sc, zBase + ph, 0.16 * sc, spec.roofTex2 || spec.roofTex1, spec.trimColor, spec.roofRidgeColor);
            } else if (spec.hasFrontPorch) {
                const pd = (spec.porchD || 26) * sc;
                const py = d1 * 0.5 + pd * 0.5;
                emitTileBox3D(cx, cy, cosA, sinA, 0, py, w1 * 0.82, pd, zBase, zBase + 0.055, 177, 177, 8, [0.95, 0.95, 0.97], true);
                for (const colX of [-w1 * 0.36, -w1 * 0.12, w1 * 0.12, w1 * 0.36]) {
                    emitTileBox3D(cx, cy, cosA, sinA, colX, py + pd * 0.38, 6.5 * sc, 6.5 * sc, zBase + 0.05, z1 - 0.06, 177, 177, 46, [0.98, 0.98, 1.0], false);
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
                    emitTileBox3D(cx, cy, cosA, sinA, ox2 + 24 * sc, oy2 + d2 * 0.5 + 14 * sc, w2 * 0.85, 4.0 * sc, z1 + 0.04, z1 + 0.18 * sc, 199, 199, 31, [0.88, 0.96, 1.00], false);
                }

                if (spec.roofStyle === "FLAT_CANTILEVER") {
                    emitModernFlatRoof3D(cx, cy, cosA, sinA, ox2, oy2, w2 + ovh * 1.6, d2 + ovh * 1.6, z2Top, 0.08 * sc, spec.roofTex2, spec.trimColor);
                } else {
                    emitHippedRoof3D(cx, cy, cosA, sinA, ox2, oy2, w2 + ovh * 1.6, d2 + ovh * 1.6, z2Top, (spec.roofPitch2 || 0.20) * sc, spec.roofTex2, spec.trimColor, spec.roofRidgeColor);
                }

                if (spec.hasCupola) {
                    const zCup = z2Top + (spec.roofPitch2 || 0.20) * sc * 0.75;
                    emitTileBox3D(cx, cy, cosA, sinA, ox2, oy2, 36 * sc, 36 * sc, zCup, zCup + 0.18 * sc, 199, 86, 46, spec.wallColor, false);
                    emitHippedRoof3D(cx, cy, cosA, sinA, ox2, oy2, 46 * sc, 46 * sc, zCup + 0.18 * sc, 0.14 * sc, spec.roofTex2, spec.trimColor, spec.roofRidgeColor);
                }
            }

            if (inst.pool) {
                const pl = inst.pool;
                const pSc = pl.scale || 0.90;
                // Authentic L8 Travertine Paver Pool Deck + L27 Turquoise GTA 1 Water Basin!
                emitTileBox3D(cx, cy, cosA, sinA, pl.dx, pl.dy, 154 * pSc, 94 * pSc, bz, bz + 0.030, 177, 177, 8, [0.96, 0.95, 0.92], true);
                emitTileBox3D(cx, cy, cosA, sinA, pl.dx, pl.dy, 126 * pSc, 68 * pSc, bz + 0.030, bz + 0.034, 177, 177, 27, [0.88, 0.98, 1.00], true);
            }

            if (inst.dockBoat) {
                const db = inst.dockBoat;
                const pCos = Math.cos(db.pierAng);
                const pSin = Math.sin(db.pierAng);
                // Authentic L77 GTA 1 Wooden Boardwalk Planks on Waterfront Boat Pier + Timber Pilings!
                emitTileBox3D(db.pierMidX, db.pierMidY, pCos, pSin, 0, 0, db.pierLen, 22, 1.88, 2.08, 177, 177, 77, [0.94, 0.90, 0.84], true);
                const numPiles = Math.max(2, Math.floor(db.pierLen / 28));
                for (let pi = 0; pi <= numPiles; pi++) {
                    const lx = -db.pierLen * 0.45 + (db.pierLen * 0.9 * pi) / numPiles;
                    emitTileBox3D(db.pierMidX, db.pierMidY, pCos, pSin, lx, -9, 5, 5, 1.72, 2.16, 177, 177, 77, [0.76, 0.62, 0.48], false);
                    emitTileBox3D(db.pierMidX, db.pierMidY, pCos, pSin, lx,  9, 5, 5, 1.72, 2.16, 177, 177, 77, [0.76, 0.62, 0.48], false);
                }
            }
        }

        // ====================================================================
        // B. COMPILE 3D THATCHED TIKI PAVILIONS (this.map.tikiBars)
        //    (Textured with L77 Wooden Boardwalk Planks & S177 Timber Counters)
        // ====================================================================
        if (this.map && Array.isArray(this.map.tikiBars)) {
            for (let i = 0; i < this.map.tikiBars.length; i++) {
                const tb = this.map.tikiBars[i];
                const cosA = Math.cos(tb.ang || 0);
                const sinA = Math.sin(tb.ang || 0);
                const bz = tb.z || 2.0;
                emitTileBox3D(tb.x, tb.y, cosA, sinA, 0, 0, 58, 44, bz, bz + 0.04, 177, 177, 77, [0.94, 0.90, 0.82], true);
                for (const px of [-24, 24]) {
                    for (const py of [-18, 18]) {
                        emitTileBox3D(tb.x, tb.y, cosA, sinA, px, py, 5, 5, bz + 0.04, bz + 0.36, 177, 177, 77, [0.84, 0.68, 0.48], false);
                    }
                }
                emitTileBox3D(tb.x, tb.y, cosA, sinA, 0, 10, 42, 12, bz + 0.04, bz + 0.18, 177, 177, 77, [0.78, 0.58, 0.38], false);
                emitHippedRoof3D(tb.x, tb.y, cosA, sinA, 0, 0, 68, 52, bz + 0.35, 0.20, "house_florida_bungalow", [0.76, 0.56, 0.26], [0.86, 0.68, 0.34]);
            }
        }

        // ====================================================================
        // C. COMPILE 3D ART DECO BEACH LIFEGUARD TOWERS (this.map.beachProps)
        //    (Textured with L77 Wooden Observation Deck & S177 Pilings)
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
                        emitTileBox3D(pr.x, pr.y, cosA, sinA, sx, sy, 4.5, 4.5, bz, bz + 0.22, 177, 177, 46, [0.92, 0.92, 0.94], false);
                    }
                }
                emitTileBox3D(pr.x, pr.y, cosA, sinA, 0, 0, 44, 40, bz + 0.20, bz + 0.24, 177, 177, 77, [0.96, 0.94, 0.90], true);
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
                    emitAOShadow3D(st.x, st.y, 1, 0, 0, 0, 34, 34, rz, 0.36);
                    for (let lv = 0; lv < 7; lv++) {
                        const r0 = 12.5 - lv * 0.75;
                        const r1 = 12.5 - (lv + 1) * 0.75;
                        const y0 = rz + lv * 0.14;
                        const y1 = y0 + 0.14;
                        const col = (lv % 2 === 1) ? [0.84, 0.22, 0.18] : [0.94, 0.95, 0.97];
                        emitCylinder3D(st.x, st.y, 0, 0, r0, r1, y0, y1, 16, col, 5, lv === 6);
                    }
                    // Dark soot exhaust crown ring at top of chimney
                    emitCylinder3D(st.x, st.y, 0, 0, 7.6, 8.0, rz + 0.96, rz + 1.02, 16, [0.16, 0.18, 0.22], 5, true);
                }
            }
            if (ind.miniGolf) {
                const mg = ind.miniGolf;
                const bz = mg.z || 2.0;
                emitAOShadow3D(mg.x, mg.y, 1, 0, 0, 0, 58, 58, bz, 0.40);
                // Octagonal Stone Patio Base (S177 / L8) + 3D Octagonal Tapered Dutch Windmill Tower + Conical Cap
                emitOctagonPad3D(mg.x, mg.y, 0, 0, 26, 26, 24, 24, 0.28, bz, bz + 0.08, [0.92, 0.92, 0.95], [0.84, 0.86, 0.90], 2, 177, 8);
                emitCylinder3D(mg.x, mg.y, 0, 0, 20, 17, bz + 0.08, bz + 0.30, 8, [0.80, 0.32, 0.22], 1, false);
                emitCylinder3D(mg.x, mg.y, 0, 0, 17, 14, bz + 0.30, bz + 0.54, 8, [0.94, 0.92, 0.86], 1, true);
                emitCone3D(mg.x, mg.y, 0, 0, 18.5, bz + 0.54, bz + 0.78, 12, [0.42, 0.26, 0.16], 1);
            }
        }

        // ====================================================================
        // E. COMPILE 3D AIRPORT CHECKPOINT GUARDHOUSES & LEONIDA STATE PENITENTIARY
        //    WATCHTOWERS + SALLY-PORT GATEHOUSES (100% gta1_tiles_vice.png)
        // ====================================================================
        if (this.map && this.map.airportCompound && Array.isArray(this.map.airportCompound.gates)) {
            for (const gt of this.map.airportCompound.gates) {
                const bx = gt.boothX, by = gt.boothY, bz = 2.0;
                emitAOShadow3D(bx, by, 1, 0, 0, 0, 42, 34, bz, 0.38);
                emitTileBox3D(bx, by, 1, 0, 0, 0, 28, 22, bz, bz + 0.18, 177, 177, 46, [0.94, 0.96, 0.99], true);
                emitTileBox3D(bx, by, 1, 0, 0, 0, 24, 18, bz + 0.18, bz + 0.38, 199, 199, 31, [0.96, 0.98, 1.00], false);
                emitTileBox3D(bx, by, 1, 0, 0, 0, 30, 24, bz + 0.38, bz + 0.44, 173, 173, 86, [0.92, 0.94, 0.98], false);
                emitSolidBox3D(bx, by, 1, 0, 0, 0, 18, 5, bz + 0.44, bz + 0.48, [0.94, 0.74, 0.14], 3);
            }
        }

        if (this.map && this.map.prisonCompound) {
            const pris = this.map.prisonCompound;
            // E.1: 2 Prison 3D Sally-Port Gatehouses & Overhead Steel Portals
            if (Array.isArray(pris.gates)) {
                for (const gt of pris.gates) {
                    const bz = 2.0;
                    if (gt.boothX && gt.boothY) {
                        const bx = gt.boothX, by = gt.boothY;
                        emitAOShadow3D(bx, by, 1, 0, 0, 0, 46, 36, bz, 0.42);
                        // Brutalist Concrete Bunker Base (S177 bevelled stone + S86 ribbed concrete + L46 roof)
                        emitTileBox3D(bx, by, 1, 0, 0, 0, 36, 28, bz, bz + 0.20, 177, 86, 46, [0.86, 0.88, 0.92], true);
                        // 360° Armored Observation Window Tier (S199 glass + L31 skylight)
                        emitTileBox3D(bx, by, 1, 0, 0, 0, 32, 24, bz + 0.20, bz + 0.40, 199, 199, 31, [0.92, 0.96, 1.00], false);
                        // Reinforced Overhanging Concrete Roof Slab + HVAC (S177 + L86)
                        emitTileBox3D(bx, by, 1, 0, 0, 0, 38, 30, bz + 0.40, bz + 0.48, 177, 177, 86, [0.84, 0.86, 0.90], false);
                    }
                    // Heavy 3D Overhead Sally-Port Steel Gantry Portal spanning the vehicle gate
                    const gw = (gt.w || 110) + 12;
                    // Left & Right Concrete Portal Columns (S86)
                    emitTileBox3D(gt.x, gt.y, 1, 0, -gw * 0.48, 0, 10, 12, bz, bz + 0.46, 86, 86, 46, [0.84, 0.86, 0.90], true);
                    emitTileBox3D(gt.x, gt.y, 1, 0,  gw * 0.48, 0, 10, 12, bz, bz + 0.46, 86, 86, 46, [0.84, 0.86, 0.90], true);
                    // Overhead Riveted Steel Cross-Beam + Alpha-Cutout S250 Steel Truss
                    emitTileBox3D(gt.x, gt.y, 1, 0, 0, 0, gw + 8, 12, bz + 0.36, bz + 0.46, 250, 363, 45, [0.88, 0.90, 0.94], false);
                    emitSolidBox3D(gt.x, gt.y, 1, 0, 0, 0, gw * 0.82, 8, bz + 0.46, bz + 0.52, [0.94, 0.74, 0.14], 3);
                }
            }
            // E.2: 8 Leonida State Penitentiary 3D Concrete & Steel Guard Watchtowers
            if (Array.isArray(pris.towers)) {
                for (const tw of pris.towers) {
                    const tx = tw.x, ty = tw.y, bz = 2.0;
                    emitAOShadow3D(tx, ty, 1, 0, 0, 0, 52, 52, bz, 0.46);
                    // 1. Octagonal Bevelled Concrete Blast Plinth (S177 stone walls + L71 concrete top)
                    emitOctagonPad3D(tx, ty, 0, 0, 42, 42, 38, 38, 0.25, bz, bz + 0.14, [0.88, 0.90, 0.94], [0.82, 0.84, 0.88], 2, 177, 71);
                    // 2. Brutalist Ribbed Concrete Watchtower Shaft (S86 columns + L46 concrete deck)
                    emitTileBox3D(tx, ty, 1, 0, 0, 0, 26, 26, bz + 0.14, bz + 0.52, 86, 86, 46, [0.88, 0.90, 0.94], false);
                    // 3. Alpha-Cutout Vertical Steel Service Ladder (S249) mounted on inner yard face
                    const ladOffX = (tw.baseAng === 0) ? 14.5 : -14.5;
                    emitTileBox3D(tx, ty, 1, 0, ladOffX, 0, 2.5, 8, bz + 0.14, bz + 0.54, 249, 249, 45, [0.92, 0.94, 0.98], false);
                    // 4. Cantilevered Steel Grate Sniper Catwalk Deck & Safety Railing (S363 truss + L45 steel plate)
                    emitTileBox3D(tx, ty, 1, 0, 0, 0, 40, 40, bz + 0.52, bz + 0.58, 363, 363, 45, [0.86, 0.88, 0.92], false);
                    // 5. 360° Armored Glass Guardhouse Cab (S199 windows + L31 skylight)
                    emitTileBox3D(tx, ty, 1, 0, 0, 0, 32, 32, bz + 0.58, bz + 0.78, 199, 199, 31, [0.94, 0.98, 1.00], false);
                    // 6. Overhanging Concrete Roof Slab & Searchlight Turret Pedestal (S177 + L86)
                    emitTileBox3D(tx, ty, 1, 0, 0, 0, 38, 38, bz + 0.78, bz + 0.85, 177, 177, 86, [0.88, 0.90, 0.94], false);
                    emitCylinder3D(tx, ty, 0, 0, 6.5, 5.0, bz + 0.85, bz + 0.93, 8, [0.36, 0.40, 0.46], 5, true);
                }
            }
        }

        // ====================================================================
        // F. COMPILE 3D CORRUGATED SHIPPING CONTAINERS & SEE-THROUGH PORT GANTRY CRANES
        //    (Uses real alpha-cutout 3ds Max steel truss tiles S246, S250, S363 + MAT 6 containers)
        // ====================================================================
        if (this.map && Array.isArray(this.map.portTerminals)) {
            const containerPalette = [
                [0.80, 0.24, 0.20], // Hapag Weathered Crimson
                [0.18, 0.52, 0.74], // Maersk Weathered Cyan-Blue
                [0.20, 0.58, 0.36], // Evergreen Weathered Green
                [0.86, 0.48, 0.16], // Hazard Rust-Orange
                [0.26, 0.38, 0.64]  // Cosco Industrial Navy
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
                emitAOShadow3D(pt.x, pt.y, cosA, sinA, 0, 0, cw + 18, cd * 2.4 + 16, bz, 0.44);
                // Side-by-side 2x2 + 1 top 3D corrugated steel shipping containers (MAT 6 blends L63 steel ribs)
                for (let row = -1; row <= 1; row += 2) {
                    const oy = row * (cd * 0.55);
                    const c1 = containerPalette[(i + (row > 0 ? 1 : 0)) % containerPalette.length];
                    const c2 = containerPalette[(i + (row > 0 ? 3 : 2)) % containerPalette.length];
                    emitSolidBox3D(pt.x, pt.y, cosA, sinA, 0, oy, cw, cd, bz, bz + 0.24, c1, 6);
                    emitSolidBox3D(pt.x, pt.y, cosA, sinA, 0, oy, cw, cd, bz + 0.245, bz + 0.48, c2, 6);
                }
                if (i % 2 === 0) {
                    const c3 = containerPalette[(i + 4) % containerPalette.length];
                    emitSolidBox3D(pt.x, pt.y, cosA, sinA, 0, 0, cw, cd, bz + 0.485, bz + 0.72, c3, 6);
                }
            }
        }

        if (this.landmarks3D && Array.isArray(this.landmarks3D.gantryCranes)) {
            for (const gc of this.landmarks3D.gantryCranes) {
                const cosA = Math.cos(gc.ang || 0);
                const sinA = Math.sin(gc.ang || 0);
                const bz = gc.z || 2.0;
                const red = [0.92, 0.36, 0.32];
                const white = [0.96, 0.97, 0.99];
                const steel = [0.28, 0.32, 0.38];
                emitAOShadow3D(gc.x, gc.y, cosA, sinA, 0, 0, 96, 96, bz, 0.38);
                // 4 Mega-Port Panamax Portal Legs with real 3ds Max S246 & S363 alpha-cutout steel truss tiles!
                for (const lx of [-34, 34]) {
                    for (const ly of [-36, 36]) {
                        emitTileBox3D(gc.x, gc.y, cosA, sinA, lx, ly, 11, 11, bz, bz + 0.95, 246, 246, 64, red, false);
                        emitTileBox3D(gc.x, gc.y, cosA, sinA, lx, ly, 10, 10, bz + 0.95, bz + 1.65, 363, 363, 64, white, false);
                    }
                }
                // Cross-Portal Truss Beam (S250) + Operator Glass Cab (S199 / L86) + 214px Open-Lattice Hammerhead Boom (S250 / L64)
                emitTileBox3D(gc.x, gc.y, cosA, sinA, 0, 0, 84, 86, bz + 0.90, bz + 1.04, 250, 250, 64, red, false);
                emitTileBox3D(gc.x, gc.y, cosA, sinA, 18, 0, 26, 22, bz + 1.42, bz + 1.64, 199, 86, 86, [0.95, 0.97, 1.00], false);
                emitTileBox3D(gc.x, gc.y, cosA, sinA, 54, 0, 214, 18, bz + 1.64, bz + 1.82, 250, 363, 64, red, false);
                emitTileBox3D(gc.x, gc.y, cosA, sinA, 0, 0, 24, 24, bz + 1.82, bz + 2.15, 363, 363, 64, white, false);
                // Spreader steel cables + suspended 3D Maersk/Hapag corrugated container (MAT 6)
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 108, -8, 2.5, 2.5, bz + 0.78, bz + 1.64, steel, 1);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 108,  8, 2.5, 2.5, bz + 0.78, bz + 1.64, steel, 1);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 108, 0, 28, 16, bz + 0.70, bz + 0.78, [0.94, 0.74, 0.14], 3);
                emitSolidBox3D(gc.x, gc.y, cosA, sinA, 108, 0, 24, 56, bz + 0.44, bz + 0.70, [0.18, 0.52, 0.74], 6);
            }
        }

        // ====================================================================
        // G. COMPILE SERA SPACE CENTER LAUNCH COMPLEX 39A (KENNEDY / CAPE CANAVERAL)
        //    100% Textured with Authentic 64x64 GTA 1 Tiles from gta1_tiles_vice.png:
        //    - S86 / S199 / L86 / L31: NASA/SERA Launch Control Bunker (matches SERA building across road!)
        //    - S177 / L71 & S503(L113) / L87: Stepped Chamfered Octagonal Concrete Blast Pad
        //    - L33 / L22: Scorched Riveted Steel Flame Deflector Trench & Exhaust Turbine Shafts
        //    - S172 / S173 / L109: Mobile Launcher Platform (MLP) with Helipad/Target Ring Deck
        //    - S191 / L67: Cryogenic LOX/LH2 Pipeline Manifolds & Geodesic Storage Spheres
        //    - S363 / S246 / S249 / L64: 7-Tier Alpha-Cutout Open-Lattice Steel Umbilical Tower (LUT)
        // ====================================================================
        if (this.landmarks3D && this.landmarks3D.launchpad) {
            const lp = this.landmarks3D.launchpad;
            const bz = lp.z || 2.0;

            // 0. Soft Ground Ambient Occlusion Contact Shadow Skirt on the Paved Spaceport Compound (lid 8)
            emitAOShadow3D(lp.x, lp.y, 1, 0, -14, 0, 316, 288, bz, 0.44);

            // 1. West Crawlerway Steel Track Roadway (L33 / L87) connecting Control Bunker (460.8) to Pad (465.0)
            //    Stays strictly east of c=458 so it NEVER overlaps the asphalt road at c=456..457!
            emitTileBox3D(lp.x, lp.y, 1, 0, -92, 0, 88, 76, bz, bz + 0.06, 177, 177, 87, [0.92, 0.94, 0.98], true);
            emitTileBox3D(lp.x, lp.y, 1, 0, -92, -18, 84, 12, bz + 0.06, bz + 0.095, 173, 173, 33, [0.90, 0.92, 0.96], false);
            emitTileBox3D(lp.x, lp.y, 1, 0, -92,  18, 84, 12, bz + 0.06, bz + 0.095, 173, 173, 33, [0.90, 0.92, 0.96], false);
            emitSolidBox3D(lp.x, lp.y, 1, 0, -92, -35, 84, 5, bz + 0.06, bz + 0.11, [0.94, 0.74, 0.14], 3);
            emitSolidBox3D(lp.x, lp.y, 1, 0, -92,  35, 84, 5, bz + 0.06, bz + 0.11, [0.94, 0.74, 0.14], 3);

            // 1B. SERA Launch Control Bunker (at lp.consoleX = 460.8, north of crawlerway)
            //     Uses exact S86 & S199 blue/white facade tiles from the SERA Space Center building across the street!
            emitAOShadow3D(lp.consoleX, lp.consoleY, 1, 0, 8, -54, 74, 54, bz, 0.42);
            emitTileBox3D(lp.consoleX, lp.consoleY, 1, 0, 8, -54, 56, 36, bz, bz + 0.22, 177, 86, 46, [0.96, 0.98, 1.00], true);
            emitTileBox3D(lp.consoleX, lp.consoleY, 1, 0, 8, -54, 52, 32, bz + 0.22, bz + 0.42, 199, 86, 86, [0.98, 0.99, 1.00], false);
            emitTileBox3D(lp.consoleX, lp.consoleY, 1, 0, 8, -54, 24, 20, bz + 0.42, bz + 0.47, 172, 172, 31, [0.94, 0.96, 1.00], false);
            // Rooftop Telemetry Radar Dish on Control Bunker
            emitCylinder3D(lp.consoleX, lp.consoleY, -6, -54, 2.5, 2.5, bz + 0.42, bz + 0.58, 10, [0.82, 0.86, 0.90], 5, true);
            emitCone3D(lp.consoleX, lp.consoleY, -6, -54, 10.0, bz + 0.64, bz + 0.54, 14, [0.94, 0.96, 0.99], 5);
            // Interactive Launch Ignition Pedestal (S172 telemetry console + glowing red trigger dome)
            emitTileBox3D(lp.consoleX, lp.consoleY, 1, 0, 0, 0, 18, 14, bz + 0.06, bz + 0.28, 172, 173, 86, [0.92, 0.95, 0.99], false);
            emitCylinder3D(lp.consoleX, lp.consoleY, 0, 0, 5.2, 5.2, bz + 0.28, bz + 0.35, 12, [0.94, 0.20, 0.18], 5, true);

            // 2. Stepped Chamfered Octagonal Concrete Blast Pad (LC-39A)
            //    Tier 1: Reinforced Concrete Security Perimeter Pad (S177 concrete walls + L71 1:1 world-tiled concrete grid)
            emitOctagonPad3D(lp.x, lp.y, 0, 0, 134, 126, 128, 120, 0.24, bz, bz + 0.09, [0.90, 0.92, 0.96], [0.84, 0.86, 0.90], 2, 177, 71);
            //    Tier 2: Sloped Riveted Blast Apron (L113 sloped riveted apron walls + L87 reinforced steel/concrete deck)
            emitOctagonPad3D(lp.x, lp.y, 0, 0, 104, 98, 92, 86, 0.26, bz + 0.09, bz + 0.24, [0.94, 0.96, 0.99], [0.88, 0.90, 0.94], 2, 390 + 113, 87);

            // 2B. Deep East-West Scorched Flame Deflector Trench (L33 dark riveted blast steel + L22 exhaust turbine shafts)
            emitTileBox3D(lp.x, lp.y, 1, 0, 14, 0, 148, 46, bz + 0.24, bz + 0.265, 173, 173, 33, [0.82, 0.84, 0.88], true);
            emitTileBox3D(lp.x, lp.y, 1, 0, -32, 0, 34, 34, bz + 0.265, bz + 0.275, 173, 173, 22, [0.92, 0.94, 0.98], false);
            emitTileBox3D(lp.x, lp.y, 1, 0,  62, 0, 34, 34, bz + 0.265, bz + 0.275, 173, 173, 22, [0.92, 0.94, 0.98], false);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 14, -25, 148, 5.5, bz + 0.24, bz + 0.33, [0.94, 0.74, 0.14], 3);
            emitSolidBox3D(lp.x, lp.y, 1, 0, 14,  25, 148, 5.5, bz + 0.24, bz + 0.33, [0.94, 0.74, 0.14], 3);

            // 2C. Mobile Launcher Platform (MLP) Steel Pedestal straddling the Flame Trench under the Rocket
            //     Textured with S172/S173 cryogenic instrumentation fins on sides & L109 circular target ring on top!
            emitTileBox3D(lp.x, lp.y, 1, 0, 14, 0, 66, 64, bz + 0.24, bz + 0.33, 172, 173, 109, [0.94, 0.96, 1.00], false);
            for (const [hx, hy] of [[-6, -20], [34, -20], [-6, 20], [34, 20]]) {
                emitCylinder3D(lp.x, lp.y, hx, hy, 3.5, 2.8, bz + 0.33, bz + 0.43, 10, [0.32, 0.36, 0.42], 5, true);
            }

            // 3. Twin True 3D Geodesic Spherical Cryogenic LOX / LH2 Propellant Storage Tanks + S191 Pipeline Racks
            for (const sy of [-68, 68]) {
                const tx = 70;
                // Octagonal/Circular concrete pad & 6 cylindrical support legs
                emitCylinder3D(lp.x, lp.y, tx, sy, 23, 22, bz + 0.09, bz + 0.16, 16, [0.62, 0.66, 0.72], 2, true);
                for (let li = 0; li < 6; li++) {
                    const la = (li * Math.PI * 2.0) / 6;
                    emitCylinder3D(lp.x, lp.y, tx + Math.cos(la) * 16.5, sy + Math.sin(la) * 16.5, 2.2, 2.2, bz + 0.16, bz + 0.46, 8, [0.36, 0.40, 0.46], 5, false);
                }
                // Equatorial structural steel ring + 3D Geodesic Cryo Sphere (MAT 5 blends L45 aerospace plating + pixel-art outlines)
                emitCylinder3D(lp.x, lp.y, tx, sy, 21.5, 21.5, bz + 0.42, bz + 0.48, 18, [0.84, 0.26, 0.20], 5, false);
                emitSphere3D(lp.x, lp.y, tx, sy, 20.5, bz + 0.46, 0.30, 9, 18, [0.92, 0.95, 0.99], 5);
                // Authentic S191 Dual Cryogenic Feed Pipeline Manifold connecting sphere to MLP
                emitTileBox3D(lp.x, lp.y, 1, 0, 42, sy * 0.52, 12, 34, bz + 0.24, bz + 0.32, 191, 191, 67, [0.92, 0.95, 0.99], false);
            }

            // 4. Four Sleek Tapered Cylindrical Perimeter Lightning Arrestor Masts (at Outer Octagon Corners)
            for (const [mx, my] of [[-104, -98], [104, -98], [-104, 98], [104, 98]]) {
                // Authentic 3ds Max S363 alpha-cutout steel lattice pedestal base + Tapered 12-sided cylindrical mast
                emitTileBox3D(lp.x, lp.y, 1, 0, mx, my, 15, 15, bz + 0.09, bz + 0.46, 363, 363, 64, [0.88, 0.91, 0.96], false);
                emitCylinder3D(lp.x, lp.y, mx, my, 4.0, 1.4, bz + 0.46, bz + 1.50, 12, [0.86, 0.89, 0.94], 5, true);
                emitCone3D(lp.x, lp.y, mx, my, 2.4, bz + 1.50, bz + 1.64, 10, [0.92, 0.22, 0.18], 5);
            }

            // 5. True Open-Lattice 3D Steel Umbilical Launch Tower (LUT) at North-West Pad Deck (offX=-44, offY=-32)
            //    Uses authentic 3ds Max alpha-cutout riveted steel truss tiles (S363 & S246), L64 steel grating floors,
            //    and S249 alpha-cutout vertical steel service ladders so it is 100% cohesive with GTA 1 bridges & cranes!
            const lutX = -44;
            const lutY = -32;
            for (let lv = 0; lv < 7; lv++) {
                const y0 = bz + 0.24 + lv * 0.28;
                const y1 = y0 + 0.28;
                const isRed = (lv % 2 === 0);
                const trussCol = isRed ? [0.90, 0.34, 0.28] : [0.94, 0.96, 0.99];
                const trussTile = isRed ? 246 : 363;
                // Alpha-cutout 3ds Max riveted steel truss bay + L64 X-braced steel walk-grating deck
                emitTileBox3D(lp.x, lp.y, 1, 0, lutX, lutY, 38, 38, y0, y1, trussTile, trussTile, 64, trussCol, false);
                // S173 / L64 Structural steel floor deck rim at each level
                emitTileBox3D(lp.x, lp.y, 1, 0, lutX, lutY, 40, 40, y1 - 0.028, y1, 173, 173, 64, [0.76, 0.80, 0.86], false);
            }
            // 4 Solid Steel Corner I-Beam Columns & Central Dark Elevator Core + S249 Alpha-Cutout Ladder
            for (const [cxOff, cyOff] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) {
                emitCylinder3D(lp.x, lp.y, lutX + cxOff, lutY + cyOff, 2.4, 2.2, bz + 0.24, bz + 2.20, 8, [0.80, 0.24, 0.20], 5, true);
            }
            emitTileBox3D(lp.x, lp.y, 1, 0, lutX, lutY, 14, 14, bz + 0.24, bz + 2.22, 249, 172, 86, [0.84, 0.88, 0.94], false);
            // Top Open-Lattice Hammerhead Crane Boom on Umbilical Tower (S250 / S363 alpha-cutout truss)
            emitTileBox3D(lp.x, lp.y, 1, 0, lutX + 16, lutY, 68, 18, bz + 2.20, bz + 2.35, 250, 363, 64, [0.94, 0.96, 0.99], false);
        }

        // ====================================================================
        // H. COMPILE TRUE CYLINDRICAL 3D COASTAL LIGHTHOUSES, 3D NEON FERRIS WHEEL,
        //    3D VICE PIER NEON ARCHWAY, 3D VCIA ATC TOWER & 3D KELLY COUNTY WATER TOWER
        // ====================================================================
        if (this.landmarks3D && Array.isArray(this.landmarks3D.lighthouses)) {
            for (const lh of this.landmarks3D.lighthouses) {
                const bz = lh.z || 2.0;
                emitAOShadow3D(lh.x, lh.y, 1, 0, -18, 8, 136, 96, bz, 0.44);
                // Keeper's Coral-Roofed Villa
                emitBox3D(lh.x, lh.y, 1, 0, -44, 16, 70, 50, bz, bz + 0.54, "wall_keys_front", "wall_keys_side", [0.96, 0.96, 0.98]);
                emitHippedRoof3D(lh.x, lh.y, 1, 0, -44, 16, 80, 60, bz + 0.54, 0.22, "mansion_star_island_top", [0.92, 0.92, 0.94], [0.84, 0.32, 0.20]);
                // Octagonal Masonry Foundation Base (Textured with S177 / L8 pavers)
                emitOctagonPad3D(lh.x, lh.y, 0, 0, 28, 28, 25, 25, 0.28, bz, bz + 0.22, [0.90, 0.92, 0.95], [0.82, 0.85, 0.90], 2, 177, 8);
                // 7-Tier Smooth 20-Sided Tapered Cylindrical Red & White Lighthouse Tower (rising to bz + 2.18)
                for (let lv = 0; lv < 7; lv++) {
                    const r0 = 23.0 - lv * 1.25;
                    const r1 = 23.0 - (lv + 1) * 1.25;
                    const y0 = bz + 0.22 + lv * 0.26;
                    const col = (lv % 2 === 1) ? [0.84, 0.22, 0.20] : [0.95, 0.96, 0.98];
                    emitCylinder3D(lh.x, lh.y, 0, 0, r0, r1, y0, y0 + 0.26, 20, col, 5, lv === 6);
                }
                // Circular Black Iron Watch Gallery Deck + Glowing Cylindrical Fresnel Glass Lantern Room + Conical Copper Dome
                emitCylinder3D(lh.x, lh.y, 0, 0, 17.5, 17.5, bz + 2.04, bz + 2.11, 20, [0.18, 0.20, 0.26], 5, true);
                emitCylinder3D(lh.x, lh.y, 0, 0, 12.5, 12.5, bz + 2.11, bz + 2.38, 16, [1.00, 0.92, 0.58], 7, true);
                emitCone3D(lh.x, lh.y, 0, 0, 16.0, bz + 2.38, bz + 2.64, 20, [0.80, 0.20, 0.18], 5);
            }
        }

        if (this.landmarks3D && this.landmarks3D.ferrisWheel) {
            const fw = this.landmarks3D.ferrisWheel;
            const bz = fw.z || 2.0;
            emitAOShadow3D(fw.x, fw.y, 1, 0, 0, 0, 210, 98, bz, 0.42);
            // Giant Wooden Boardwalk Deck (L77 boardwalk planks) + Twin S363 Alpha-Cutout Steel Support Towers
            emitTileBox3D(fw.x, fw.y, 1, 0, 0, 0, 196, 84, bz, bz + 0.10, 177, 177, 77, [0.94, 0.90, 0.84], true);
            for (const sideY of [-26, 26]) {
                emitTileBox3D(fw.x, fw.y, 1, 0, -34, sideY, 11, 11, bz + 0.10, bz + 1.38, 363, 363, 64, [0.94, 0.96, 0.99], false);
                emitTileBox3D(fw.x, fw.y, 1, 0,  34, sideY, 11, 11, bz + 0.10, bz + 1.38, 363, 363, 64, [0.94, 0.96, 0.99], false);
                emitTileBox3D(fw.x, fw.y, 1, 0,   0, sideY, 22, 14, bz + 1.32, bz + 1.48, 199, 172, 86, [0.98, 0.42, 0.78], false);
            }
            emitSolidBox3D(fw.x, fw.y, 1, 0, 0, 0, 14, 62, bz + 1.36, bz + 1.46, [0.22, 0.86, 0.96], 5);
        }

        // H2. 3D VICE BEACH PIER NEON ENTRANCE ARCHWAY (at c=456.5, r=194.5 welcoming traffic & peds onto the L77 Boardwalk!)
        if (this.landmarks3D && this.landmarks3D.pierArch) {
            const pa = this.landmarks3D.pierArch;
            const bz = pa.z || 2.0;
            emitAOShadow3D(pa.x, pa.y, 1, 0, 0, 0, 48, 132, bz, 0.36);
            for (const py of [-48, 48]) {
                // Concrete masonry base (S177 / L8) + S363 Alpha-Cutout Steel Truss Pylon + Neon Crown
                emitTileBox3D(pa.x, pa.y, 1, 0, 0, py, 20, 20, bz, bz + 0.24, 177, 177, 8, [0.94, 0.96, 0.99], false);
                emitTileBox3D(pa.x, pa.y, 1, 0, 0, py, 14, 14, bz + 0.24, bz + 1.18, 363, 246, 64, [0.96, 0.44, 0.78], false);
                emitCone3D(pa.x, pa.y, 0, py, 8.5, bz + 1.34, bz + 1.52, 10, [0.22, 0.88, 0.98], 5);
            }
            // Overhead Art Deco Spanning Arch Beam (S199 / S250 / L86) high enough (bz+1.10) for cars & trucks to drive right underneath!
            emitTileBox3D(pa.x, pa.y, 1, 0, 0, 0, 24, 114, bz + 1.12, bz + 1.34, 199, 250, 86, [0.96, 0.98, 1.00], false);
            emitTileBox3D(pa.x, pa.y, 1, 0, 0, 0, 16, 76, bz + 1.34, bz + 1.48, 86, 199, 31, [0.98, 0.42, 0.78], false);
        }

        // H3. 3D VCIA AIRPORT AIR TRAFFIC CONTROL (ATC) TOWER + RADAR PLATFORM (at c=106.5, r=307.5)
        if (this.landmarks3D && this.landmarks3D.atcTower) {
            const atc = this.landmarks3D.atcTower;
            const bz = atc.z || 2.0;
            emitAOShadow3D(atc.x, atc.y, 1, 0, 0, 0, 128, 128, bz, 0.44);
            // 1. Octagonal Reinforced Concrete Security Apron Base (S177 / L71)
            emitOctagonPad3D(atc.x, atc.y, 0, 0, 56, 56, 52, 52, 0.26, bz, bz + 0.14, [0.92, 0.94, 0.98], [0.84, 0.86, 0.90], 2, 177, 71);
            // 2. 2-Story Airport Operations Terminal Base Building (S86 / S199 blue/white windows + L86 HVAC roof)
            emitTileBox3D(atc.x, atc.y, 1, 0, -18, 14, 64, 48, bz + 0.14, bz + 0.56, 86, 199, 86, [0.96, 0.98, 1.00], false);
            // 3. 5-Tier Fluted Concrete & Cryo-Fin ATC Shaft (S172 / S173 + S249 Alpha-Cutout Service Ladder)
            emitTileBox3D(atc.x, atc.y, 1, 0, 8, -6, 30, 30, bz + 0.14, bz + 1.62, 172, 173, 86, [0.94, 0.96, 0.99], false);
            emitTileBox3D(atc.x, atc.y, 1, 0, 8, -22, 12, 6, bz + 0.14, bz + 1.62, 249, 249, 64, [0.88, 0.92, 0.96], false);
            // 4. Cantilevered S363 Alpha-Cutout Steel Observation Catwalk & 360-Degree S199 Blue Glass Control Cab!
            emitOctagonPad3D(atc.x, atc.y, 8, -6, 30, 30, 34, 34, 0.26, bz + 1.62, bz + 1.74, [0.88, 0.90, 0.94], [0.78, 0.82, 0.88], 2, 363, 64);
            emitTileBox3D(atc.x, atc.y, 1, 0, 8, -6, 44, 44, bz + 1.74, bz + 2.08, 199, 199, 86, [0.94, 0.98, 1.00], false);
            emitOctagonPad3D(atc.x, atc.y, 8, -6, 28, 28, 25, 25, 0.26, bz + 2.08, bz + 2.18, [0.94, 0.96, 0.99], [0.84, 0.88, 0.92], 2, 173, 31);
            // Radar Pedestal Mast on top of Control Cab (live rotating radar dish rendered in renderDynamic3DMeshes!)
            emitCylinder3D(atc.x, atc.y, 8, -6, 4.5, 3.5, bz + 2.18, bz + 2.38, 12, [0.82, 0.86, 0.92], 5, true);
        }

        // H4. 3D KELLY COUNTY / AMBROSIA OPEN-LATTICE WATER TOWER & AVIATION RADIO MAST (at c=148.5, r=118.5)
        if (this.landmarks3D && this.landmarks3D.waterTower) {
            const wt = this.landmarks3D.waterTower;
            const bz = wt.z || 2.0;
            emitAOShadow3D(wt.x, wt.y, 1, 0, 12, 0, 134, 108, bz, 0.42);
            // 1. Octagonal Reinforced Concrete Pad (S177 / L71)
            emitOctagonPad3D(wt.x, wt.y, 0, 0, 44, 44, 40, 40, 0.26, bz, bz + 0.10, [0.90, 0.92, 0.96], [0.82, 0.85, 0.90], 2, 177, 71);
            // 2. 4 Open-Lattice S363 Steel Truss Legs + Central S191 Riser Pipe + S249 Alpha-Cutout Ladder
            for (const lx of [-20, 20]) {
                for (const ly of [-20, 20]) {
                    emitTileBox3D(wt.x, wt.y, 1, 0, lx, ly, 10, 10, bz + 0.10, bz + 1.24, 363, 363, 64, [0.88, 0.91, 0.96], false);
                }
            }
            emitTileBox3D(wt.x, wt.y, 1, 0, 0, 0, 28, 28, bz + 0.62, bz + 0.70, 250, 250, 64, [0.86, 0.30, 0.24], false);
            emitCylinder3D(wt.x, wt.y, 0, 0, 6.5, 6.5, bz + 0.10, bz + 1.28, 12, [0.36, 0.40, 0.46], 5, false);
            emitTileBox3D(wt.x, wt.y, 1, 0, -10, 0, 6, 10, bz + 0.10, bz + 1.28, 249, 249, 64, [0.90, 0.92, 0.96], false);
            // 3. Circular L64 Catwalk Ring + Colossal 20-Sided Riveted Steel Water Tank & Conical Roof
            emitOctagonPad3D(wt.x, wt.y, 0, 0, 34, 34, 32, 32, 0.28, bz + 1.24, bz + 1.32, [0.86, 0.89, 0.94], [0.76, 0.80, 0.86], 2, 173, 64);
            emitCylinder3D(wt.x, wt.y, 0, 0, 26.0, 28.0, bz + 1.32, bz + 1.62, 20, [0.92, 0.94, 0.98], 5, false);
            emitCylinder3D(wt.x, wt.y, 0, 0, 28.2, 28.2, bz + 1.62, bz + 1.82, 20, [0.84, 0.24, 0.20], 5, false);
            emitCylinder3D(wt.x, wt.y, 0, 0, 28.0, 25.0, bz + 1.82, bz + 2.04, 20, [0.92, 0.94, 0.98], 5, true);
            emitCone3D(wt.x, wt.y, 0, 0, 27.0, bz + 2.04, bz + 2.34, 20, [0.82, 0.22, 0.18], 5);
            // 4. Adjacent 6-Tier S363 Alpha-Cutout Aviation Radio Transmission Mast (at offX = +54)
            for (let lv = 0; lv < 6; lv++) {
                const y0 = bz + 0.10 + lv * 0.36;
                const w = 16 - lv * 1.4;
                const isRed = (lv % 2 === 0);
                emitTileBox3D(wt.x, wt.y, 1, 0, 54, 0, w, w, y0, y0 + 0.36, isRed ? 246 : 363, 363, 64, isRed ? [0.90, 0.30, 0.24] : [0.95, 0.97, 1.00], false);
            }
            emitCylinder3D(wt.x, wt.y, 54, 0, 2.2, 1.0, bz + 2.26, bz + 2.62, 8, [0.92, 0.94, 0.98], 5, true);
        }

        // H5. 10 TRUE 3D SLOPED TRIANGULAR WEDGE STUNT JUMP RAMPS (this.map.stuntRamps)
        //     Replaces flat 2D yellow rectangles with authentic 3D steel-truss & hazard-chevron launch wedges!
        if (this.map && Array.isArray(this.map.stuntRamps)) {
            const [tu0, tv0, tu1, tv1] = getTileAtlasUV(363, 0.0, 0.0, 1.0, 1.0); // S363 alpha-cutout steel truss
            for (const ramp of this.map.stuntRamps) {
                const bz = (this.map && typeof this.map.getHeightAtPixel === "function")
                    ? this.map.getHeightAtPixel(ramp.x, ramp.y, 2.0)
                    : 2.0;
                const ang = ramp.angle || 0;
                const cosA = Math.cos(ang);
                const sinA = Math.sin(ang);
                const hw = 22.0; // 44px long along launch direction
                const hd = 13.0; // 26px wide
                const yLow = bz + 0.015;
                const yMid = bz + 0.185;
                const yHigh = bz + 0.285;
                const xMid = hw * 0.30;

                emitAOShadow3D(ramp.x, ramp.y, cosA, sinA, 2, 0, 48, 30, bz, 0.38);

                // Low entry corners (-hw), mid deck transition (xMid), and high launch lip (+hw)
                const bNW = toWorld(ramp.x, ramp.y, cosA, sinA, -hw, -hd, yLow);
                const bSW = toWorld(ramp.x, ramp.y, cosA, sinA, -hw,  hd, yLow);
                const mNW = toWorld(ramp.x, ramp.y, cosA, sinA, xMid, -hd, yMid);
                const mSW = toWorld(ramp.x, ramp.y, cosA, sinA, xMid,  hd, yMid);
                const tNE = toWorld(ramp.x, ramp.y, cosA, sinA,  hw, -hd, yHigh);
                const tSE = toWorld(ramp.x, ramp.y, cosA, sinA,  hw,  hd, yHigh);
                const bNE = toWorld(ramp.x, ramp.y, cosA, sinA,  hw, -hd, bz);
                const bSE = toWorld(ramp.x, ramp.y, cosA, sinA,  hw,  hd, bz);

                // 1. Sloped Steel Ramp Deck: Lower section (L45 brushed steel plate) + Upper Launch Lip (MAT 3 Hazard Chevrons)
                pushTileQuad3D(bNW, mNW, bSW, mSW, 390 + 45, 0.94, 0.96, 1.00, 1.0);
                pushMatQuad3D(mNW, tNE, mSW, tSE, 3, 1.00, 0.88, 0.18, 1.0);

                // 2. Left & Right Triangular S363 Alpha-Cutout Steel Truss Side Walls
                pushTri3D(bNW, tNE, bNE, [tu0, tv1], [tu1, tv0], [tu1, tv1], 0.92, 0.95, 0.99, 1.0);
                pushTri3D(bSW, bSE, tSE, [tu0, tv1], [tu1, tv1], [tu1, tv0], 0.92, 0.95, 0.99, 1.0);

                // 3. High Launch Back-Face Bulkhead (MAT 3 Hazard Chevrons)
                pushMatQuad3D(tSE, tNE, bSE, bNE, 3, 0.92, 0.78, 0.16, 1.0);
            }
        }

        // H6. 6 3D ROADSIDE VCPD RADAR SPEED TRAP GANTRIES (this.speedTraps)
        if (Array.isArray(this.speedTraps)) {
            for (const st of this.speedTraps) {
                const bz = st.z || 2.0;
                const cosA = Math.cos(st.ang || 0);
                const sinA = Math.sin(st.ang || 0);
                emitAOShadow3D(st.x, st.y, cosA, sinA, 0, 0, 26, 26, bz, 0.36);
                // S177 Concrete Foundation Pad + MAT 3 Yellow/Black Hazard Base Collar
                emitTileBox3D(st.x, st.y, cosA, sinA, 0, 0, 16, 16, bz, bz + 0.10, 177, 177, 71, [0.92, 0.94, 0.98], false);
                emitSolidBox3D(st.x, st.y, cosA, sinA, 0, 0, 14, 14, bz + 0.10, bz + 0.20, [0.96, 0.82, 0.16], 3);
                // S249 Alpha-Cutout Vertical Steel Truss Mast
                emitTileBox3D(st.x, st.y, cosA, sinA, 0, 0, 9, 9, bz + 0.20, bz + 0.68, 249, 249, 64, [0.90, 0.94, 0.98], false);
                // S199 VCPD Digital Radar Camera Box + Dual Flash Hoods
                emitTileBox3D(st.x, st.y, cosA, sinA, 0, 0, 18, 14, bz + 0.68, bz + 0.92, 199, 172, 86, [0.96, 0.98, 1.00], false);
                emitSolidBox3D(st.x, st.y, cosA, sinA, 0, 0, 20, 16, bz + 0.92, bz + 0.96, [0.96, 0.80, 0.16], 3);
            }
        }

        // H7. COLOSSAL GTA 6 STYLIZED 3D "VICE" AIRPORT WELCOME SIGN ON OPEN-LATTICE STEEL TRUSS SCAFFOLD (c=118.5, r=293.5)
        if (this.landmarks3D && this.landmarks3D.viceSign) {
            const vs = this.landmarks3D.viceSign;
            const bz = vs.z || 2.0;
            emitAOShadow3D(vs.x, vs.y, 1, 0, 0, 0, 184, 68, bz, 0.44);
            // 1. Reinforced Concrete Foundation Plinth (S177 / L71) + MAT 3 Hazard Perimeter Trim
            emitTileBox3D(vs.x, vs.y, 1, 0, 0, 0, 168, 48, bz, bz + 0.14, 177, 177, 71, [0.92, 0.94, 0.98], true);
            // 2. 4 Open-Lattice S363 Steel Truss Support Columns & 3 Horizontal S250 Catwalk Girders
            for (const sx of [-64, -22, 22, 64]) {
                emitTileBox3D(vs.x, vs.y, 1, 0, sx, -10, 12, 12, bz + 0.14, bz + 1.48, 363, 363, 64, [0.88, 0.92, 0.96], false);
                // Upward ground floodlight housing in front of each letter
                emitSolidBox3D(vs.x, vs.y, 1, 0, sx, 16, 10, 8, bz + 0.14, bz + 0.22, [0.22, 0.26, 0.34], 5);
                emitSolidBox3D(vs.x, vs.y, 1, 0, sx, 15, 8, 6, bz + 0.22, bz + 0.26, [0.98, 0.96, 0.78], 7);
            }
            for (const gy of [bz + 0.48, bz + 0.96, bz + 1.44]) {
                emitTileBox3D(vs.x, vs.y, 1, 0, 0, -10, 156, 14, gy, gy + 0.08, 250, 363, 64, [0.90, 0.93, 0.98], false);
            }
            // 3. Sculpted 3D Block Letters "V - I - C - E" (Crisp White MAT 1 Masonry + Hot-Pink & Cyan Neon Front Trim MAT 7)
            const yL0 = bz + 0.52, yL1 = bz + 1.52;
            const white = [0.98, 0.98, 1.00];
            const pink  = [0.98, 0.32, 0.76];
            const cyan  = [0.20, 0.90, 0.98];
            // Letter 'V' (centered at offX = -60)
            emitSolidBox3D(vs.x, vs.y, 1, 0, -68, 4, 9, 10, yL0 + 0.22, yL1, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, -52, 4, 9, 10, yL0 + 0.22, yL1, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, -60, 4, 14, 10, yL0, yL0 + 0.26, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, -60, 9.5, 24, 3, yL0, yL1, pink, 7);
            // Letter 'I' (centered at offX = -20)
            emitSolidBox3D(vs.x, vs.y, 1, 0, -20, 4, 24, 10, yL1 - 0.18, yL1, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, -20, 4, 10, 10, yL0 + 0.18, yL1 - 0.18, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, -20, 4, 24, 10, yL0, yL0 + 0.18, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, -20, 9.5, 10, 3, yL0, yL1, cyan, 7);
            // Letter 'C' (centered at offX = +20)
            emitSolidBox3D(vs.x, vs.y, 1, 0, 20, 4, 26, 10, yL1 - 0.18, yL1, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 11, 4, 9, 10, yL0 + 0.18, yL1 - 0.18, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 20, 4, 26, 10, yL0, yL0 + 0.18, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 11, 9.5, 9, 3, yL0, yL1, pink, 7);
            // Letter 'E' (centered at offX = +60)
            emitSolidBox3D(vs.x, vs.y, 1, 0, 60, 4, 26, 10, yL1 - 0.18, yL1, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 58, 4, 20, 10, yL0 + 0.42, yL0 + 0.58, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 60, 4, 26, 10, yL0, yL0 + 0.18, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 51, 4, 9, 10, yL0 + 0.18, yL1 - 0.18, white, 1);
            emitSolidBox3D(vs.x, vs.y, 1, 0, 51, 9.5, 9, 3, yL0, yL1, cyan, 7);
        }

        // H8. 8 TRUE 3D LEONIDA INTERSTATE & CAUSEWAY OVERHEAD GREEN FDOT HIGHWAY GANTRIES (this.landmarks3D.highwayGantries)
        if (this.landmarks3D && Array.isArray(this.landmarks3D.highwayGantries)) {
            for (const hg of this.landmarks3D.highwayGantries) {
                const bz = hg.z || 2.0;
                const cosA = Math.cos(hg.ang || 0);
                const sinA = Math.sin(hg.ang || 0);
                if (hg.fullSpan) {
                    const halfSpan = (hg.spanPx || 256) * 0.5;
                    for (const sideX of [-halfSpan, halfSpan]) {
                        emitAOShadow3D(hg.x, hg.y, cosA, sinA, sideX, 0, 26, 26, bz, 0.36);
                        emitTileBox3D(hg.x, hg.y, cosA, sinA, sideX, 0, 16, 16, bz, bz + 0.18, 177, 177, 71, [0.92, 0.94, 0.98], false);
                        emitSolidBox3D(hg.x, hg.y, cosA, sinA, sideX, 0, 14, 14, bz + 0.18, bz + 0.28, [0.96, 0.82, 0.16], 3);
                        emitTileBox3D(hg.x, hg.y, cosA, sinA, sideX, 0, 11, 11, bz + 0.28, bz + 1.28, 363, 363, 64, [0.90, 0.94, 0.98], false);
                    }
                    // Overhead Spanning S250 Steel Truss Box Girder (bz+1.14..1.28 — cars & trucks pass cleanly underneath!)
                    emitTileBox3D(hg.x, hg.y, cosA, sinA, 0, 0, hg.spanPx + 14, 14, bz + 1.14, bz + 1.28, 250, 363, 64, [0.92, 0.95, 0.99], false);
                    // Twin Emerald-Green FDOT Highway Sign Boards + White Reflective Border Trim
                    for (const bxOff of [-halfSpan * 0.44, halfSpan * 0.44]) {
                        emitSolidBox3D(hg.x, hg.y, cosA, sinA, bxOff, 0, 74, 8, bz + 1.06, bz + 1.44, [0.96, 0.98, 1.00], 1);
                        emitSolidBox3D(hg.x, hg.y, cosA, sinA, bxOff, 0, 68, 9.5, bz + 1.09, bz + 1.41, [0.04, 0.48, 0.34], 1);
                    }
                } else {
                    const armLen = hg.armPx || 148;
                    emitAOShadow3D(hg.x, hg.y, cosA, sinA, 0, 0, 28, 28, bz, 0.38);
                    emitTileBox3D(hg.x, hg.y, cosA, sinA, 0, 0, 18, 18, bz, bz + 0.20, 177, 177, 71, [0.92, 0.94, 0.98], false);
                    emitSolidBox3D(hg.x, hg.y, cosA, sinA, 0, 0, 16, 16, bz + 0.20, bz + 0.30, [0.96, 0.82, 0.16], 3);
                    emitTileBox3D(hg.x, hg.y, cosA, sinA, 0, 0, 12, 12, bz + 0.30, bz + 1.30, 363, 363, 64, [0.90, 0.94, 0.98], false);
                    // Cantilevered S250 Truss Arm + Emerald-Green FDOT Highway Sign Board extending out over the road!
                    emitTileBox3D(hg.x, hg.y, cosA, sinA, armLen * 0.5, 0, armLen, 13, bz + 1.14, bz + 1.28, 250, 363, 64, [0.92, 0.95, 0.99], false);
                    emitSolidBox3D(hg.x, hg.y, cosA, sinA, armLen * 0.62, 0, 82, 8, bz + 1.06, bz + 1.44, [0.96, 0.98, 1.00], 1);
                    emitSolidBox3D(hg.x, hg.y, cosA, sinA, armLen * 0.62, 0, 76, 9.5, bz + 1.09, bz + 1.41, [0.04, 0.48, 0.34], 1);
                }
            }
        }

        // H9. MOUNT KALAGA NATIONAL PARK 3D WILDERNESS FIRE LOOKOUT TOWER & RANGER STATION (c=135.5, r=23.5)
        if (this.landmarks3D && this.landmarks3D.kalagaLookout) {
            const kl = this.landmarks3D.kalagaLookout;
            const bz = kl.z || 2.0;
            emitAOShadow3D(kl.x, kl.y, 1, 0, -18, 0, 148, 104, bz, 0.44);
            // 1. Stone & Timber Foundation Pad (S177 / L8) + Log Ranger Cabin Outpost at offX = -52
            emitOctagonPad3D(kl.x, kl.y, 0, 0, 38, 38, 35, 35, 0.26, bz, bz + 0.12, [0.76, 0.72, 0.66], [0.68, 0.64, 0.58], 2, 177, 8);
            emitBox3D(kl.x, kl.y, 1, 0, -56, 8, 62, 46, bz, bz + 0.48, "wall_shack_front", "wall_shack_side", [0.48, 0.36, 0.26]);
            emitHippedRoof3D(kl.x, kl.y, 1, 0, -56, 8, 72, 56, bz + 0.48, 0.22, "roof_rusted_tin", [0.24, 0.46, 0.30], [0.18, 0.36, 0.22]);
            // 2. 4 Open-Lattice S363 Timber/Steel Truss Legs + Central S249 Alpha-Cutout Climbing Ladder Shaft
            for (const lx of [-18, 18]) {
                for (const ly of [-18, 18]) {
                    emitTileBox3D(kl.x, kl.y, 1, 0, lx, ly, 10, 10, bz + 0.12, bz + 1.56, 363, 363, 64, [0.72, 0.54, 0.36], false);
                }
            }
            emitTileBox3D(kl.x, kl.y, 1, 0, 0, 0, 28, 28, bz + 0.82, bz + 0.90, 250, 250, 77, [0.68, 0.50, 0.32], false);
            emitTileBox3D(kl.x, kl.y, 1, 0, 0, 0, 10, 10, bz + 0.12, bz + 1.56, 249, 249, 77, [0.82, 0.76, 0.68], false);
            // 3. Elevated L77 Wooden Wrap-Around Observation Catwalk + 360-Degree S199 Glass Fire-Spotter Cab + Pyramidal Forest-Green Roof!
            emitTileBox3D(kl.x, kl.y, 1, 0, 0, 0, 56, 56, bz + 1.56, bz + 1.66, 177, 177, 77, [0.84, 0.66, 0.44], true);
            emitTileBox3D(kl.x, kl.y, 1, 0, 0, 0, 38, 38, bz + 1.66, bz + 1.98, 199, 199, 77, [0.94, 0.96, 0.99], false);
            emitHippedRoof3D(kl.x, kl.y, 1, 0, 0, 0, 52, 52, bz + 1.98, 0.28, "roof_rusted_tin", [0.20, 0.48, 0.30], [0.14, 0.36, 0.22]);
        }

        // H10. AMBROSIA "ALLIED CRYSTAL" SUGAR REFINERY 3D CYLINDRICAL MOLASSES SILO COMPLEX & CONVEYOR BRIDGE (c=160.5, r=109.0)
        if (this.landmarks3D && this.landmarks3D.alliedSugarSilos) {
            const as = this.landmarks3D.alliedSugarSilos;
            const bz = as.z || 2.0;
            emitAOShadow3D(as.x, as.y, 1, 0, 0, 0, 156, 86, bz, 0.44);
            emitTileBox3D(as.x, as.y, 1, 0, 0, 0, 144, 72, bz, bz + 0.12, 177, 177, 71, [0.88, 0.90, 0.94], true);
            // 3 Colossal 20-Sided Cylindrical Sugar & Molasses Silos (at offX = -44, 0, +44)
            for (const [si, sx] of [[-44, 0], [0, 1], [44, 2]]) {
                emitCylinder3D(as.x, as.y, si, 0, 19.5, 19.5, bz + 0.12, bz + 1.38, 20, [0.92, 0.91, 0.88], 5, false);
                // Weathered Allied Crystal Rust-Orange & Ribbed Steel Bands (MAT 6)
                emitCylinder3D(as.x, as.y, si, 0, 19.8, 19.8, bz + 0.68, bz + 0.84, 20, [0.82, 0.38, 0.18], 6, false);
                emitCylinder3D(as.x, as.y, si, 0, 19.8, 19.8, bz + 1.24, bz + 1.38, 20, [0.24, 0.28, 0.34], 6, true);
                emitCone3D(as.x, as.y, si, 0, 20.5, bz + 1.38, bz + 1.64, 20, [0.78, 0.34, 0.18], 5);
                // External S249 Alpha-Cutout Safety Ladder on South Face
                emitTileBox3D(as.x, as.y, 1, 0, si, 21, 8, 5, bz + 0.12, bz + 1.42, 249, 249, 64, [0.86, 0.88, 0.92], false);
            }
            // High-Level S250 / S363 Open-Lattice Steel Truss Overhead Conveyor Bridge linking all 3 Silos!
            emitTileBox3D(as.x, as.y, 1, 0, 0, 0, 118, 16, bz + 1.62, bz + 1.78, 250, 363, 64, [0.90, 0.92, 0.96], false);
        }

        // H11. GRASSRIVERS EVERGLADES 3D STILTED WOODEN SWAMP BOARDWALK, AIRBOAT DOCK & GIANT ROADSIDE 3D GATOR STATUE (c=116.5, r=398.5)
        if (this.landmarks3D && this.landmarks3D.grassriversOutpost) {
            const go = this.landmarks3D.grassriversOutpost;
            const bz = go.z || 2.0;
            emitAOShadow3D(go.x, go.y, 1, 0, 0, 48, 118, 196, bz, 0.38);
            // 1. Elevated L77 Wooden Swamp Boardwalk extending 160px South into the Grassrivers Bayou Water!
            emitTileBox3D(go.x, go.y, 1, 0, 0, 72, 34, 168, bz + 0.04, bz + 0.14, 177, 177, 77, [0.82, 0.64, 0.42], true);
            // Thatched Bayou Airboat Dock Pavilion at the southern pier end (offY = +132)
            for (const px of [-13, 13]) {
                for (const py of [112, 148]) {
                    emitCylinder3D(go.x, go.y, px, py, 2.5, 2.5, bz + 0.14, bz + 0.56, 8, [0.54, 0.36, 0.20], 1, false);
                }
            }
            emitHippedRoof3D(go.x, go.y, 1, 0, 0, 130, 46, 52, bz + 0.56, 0.22, "mansion_star_island", [0.76, 0.58, 0.32], [0.88, 0.68, 0.38]);
            // 2. Giant Roadside 3D Florida Gator Mascot Monument on Stone Plinth (at offX = -42, offY = -12)
            emitTileBox3D(go.x, go.y, 1, 0, -42, -12, 54, 26, bz, bz + 0.16, 177, 177, 8, [0.90, 0.88, 0.82], false);
            emitSolidBox3D(go.x, go.y, 1, 0, -42, -12, 36, 16, bz + 0.16, bz + 0.34, [0.20, 0.48, 0.24], 6);
            emitSolidBox3D(go.x, go.y, 1, 0, -42, -12, 26, 8,  bz + 0.34, bz + 0.40, [0.14, 0.36, 0.16], 6);
            emitSolidBox3D(go.x, go.y, 1, 0, -18, -12, 18, 13, bz + 0.16, bz + 0.24, [0.26, 0.54, 0.28], 1);
            emitSolidBox3D(go.x, go.y, 1, 0, -18, -12, 16, 11, bz + 0.24, bz + 0.30, [0.98, 0.96, 0.90], 1);
            emitSolidBox3D(go.x, go.y, 1, 0, -18, -12, 18, 13, bz + 0.30, bz + 0.39, [0.20, 0.48, 0.24], 6);
        }

        // H12. KEY WEST 3D "SOUTHERNMOST POINT IN LEONIDA — 90 MILES TO CUBA" STRIPED CONCRETE BUOY MONUMENT (c=204.2, r=476.5)
        if (this.landmarks3D && this.landmarks3D.southernmostBuoy) {
            const sb = this.landmarks3D.southernmostBuoy;
            const bz = sb.z || 2.0;
            emitAOShadow3D(sb.x, sb.y, 1, 0, 0, 0, 52, 52, bz, 0.40);
            emitOctagonPad3D(sb.x, sb.y, 0, 0, 22, 22, 20, 20, 0.28, bz, bz + 0.12, [0.92, 0.90, 0.86], [0.84, 0.82, 0.78], 2, 177, 8);
            // 5-Tier Multi-Colored Striped Cylindrical Concrete Buoy (Red Base, White Mid, Yellow Stripe, Red Upper, Black Top!)
            emitCylinder3D(sb.x, sb.y, 0, 0, 12.5, 13.0, bz + 0.12, bz + 0.30, 18, [0.86, 0.20, 0.18], 5, false);
            emitCylinder3D(sb.x, sb.y, 0, 0, 13.0, 12.8, bz + 0.30, bz + 0.50, 18, [0.96, 0.97, 0.99], 5, false);
            emitCylinder3D(sb.x, sb.y, 0, 0, 12.8, 12.2, bz + 0.50, bz + 0.60, 18, [0.98, 0.82, 0.16], 5, false);
            emitCylinder3D(sb.x, sb.y, 0, 0, 12.2, 10.5, bz + 0.60, bz + 0.78, 18, [0.86, 0.20, 0.18], 5, false);
            emitCylinder3D(sb.x, sb.y, 0, 0, 10.5,  7.5, bz + 0.78, bz + 0.94, 18, [0.14, 0.16, 0.20], 5, true);
        }

        // 13. 16 Satirical GTA 6 & GTA Universe 3D Illuminated Roadside Advertising Billboards
        //     (Pißwasser, eCola, Sprunk, Angstipan Rx, Patriot Beer, Burger Shot, Phil's Ammu-Nation, Call Morgan!)
        if (this.landmarks3D && Array.isArray(this.landmarks3D.gtaBillboards)) {
            for (const bb of this.landmarks3D.gtaBillboards) {
                const bz = bb.z || 2.0;
                const bCos = Math.cos(bb.ang || 0);
                const bSin = Math.sin(bb.ang || 0);
                const nc = bb.neon || [0.98, 0.82, 0.18];

                emitAOShadow3D(bb.x, bb.y, bCos, bSin, 0, 0, 86, 26, bz, 0.36);
                // Twin Reinforced Concrete Footings (S177)
                emitTileBox3D(bb.x, bb.y, bCos, bSin, -26, 0, 10, 10, bz, bz + 0.12, 177, 177, 71, [0.88, 0.90, 0.94]);
                emitTileBox3D(bb.x, bb.y, bCos, bSin,  26, 0, 10, 10, bz, bz + 0.12, 177, 177, 71, [0.88, 0.90, 0.94]);
                // Twin Alpha-Cutout Open Steel Truss Columns (S363) + Maintenance Ladder (S249)
                emitTileBox3D(bb.x, bb.y, bCos, bSin, -26, 0, 6.5, 6.5, bz + 0.12, bz + 0.48, 363, 363, 45, [0.76, 0.80, 0.86]);
                emitTileBox3D(bb.x, bb.y, bCos, bSin,  26, 0, 6.5, 6.5, bz + 0.12, bz + 0.48, 363, 363, 45, [0.76, 0.80, 0.86]);
                emitTileBox3D(bb.x, bb.y, bCos, bSin, -30, 0, 2.5, 3.5, bz + 0.12, bz + 0.50, 249, 249, 45, [0.92, 0.84, 0.32]);
                // Front & Back Maintenance Catwalk Grilles (S250) + Upward Halogen Floodlight Bars
                emitTileBox3D(bb.x, bb.y, bCos, bSin, 0,  8, 76, 5, bz + 0.45, bz + 0.49, 250, 250, 45, [0.78, 0.82, 0.88]);
                emitTileBox3D(bb.x, bb.y, bCos, bSin, 0, -8, 76, 5, bz + 0.45, bz + 0.49, 250, 250, 45, [0.78, 0.82, 0.88]);
                for (let lx = -24; lx <= 24; lx += 24) {
                    emitSolidBox3D(bb.x, bb.y, bCos, bSin, lx,  9.5, 6, 3, bz + 0.49, bz + 0.52, [0.99, 0.96, 0.80], 1);
                    emitSolidBox3D(bb.x, bb.y, bCos, bSin, lx, -9.5, 6, 3, bz + 0.49, bz + 0.52, [0.99, 0.96, 0.80], 1);
                }
                // Structural Steel Backing Frame (L45) & Illuminated Neon Crown Header
                emitSolidBox3D(bb.x, bb.y, bCos, bSin, 0, 0, 82, 7.5, bz + 0.46, bz + 0.90, [0.16, 0.20, 0.28], 5);
                emitSolidBox3D(bb.x, bb.y, bCos, bSin, 0, 0, 84, 9.0, bz + 0.90, bz + 0.94, nc, 1);
                // Double-Sided High-Resolution 128x64 Satirical GTA Advertising Panel (MODE D from gta1_sprites.png!)
                emitBox3D(bb.x, bb.y, bCos, bSin, 0, 0, 78, 9.2, bz + 0.48, bz + 0.88, bb.ad, bb.ad, [0.22, 0.26, 0.34]);
            }
        }

        // 14. 8 Interactive 3D Illuminated eCola & Sprunk Sidewalk Soda Vending Machines + Ad Kiosks
        if (Array.isArray(this.sodaMachines)) {
            for (const sm of this.sodaMachines) {
                const bz = sm.z || 2.0;
                const sCos = Math.cos(sm.ang || 0);
                const sSin = Math.sin(sm.ang || 0);
                const isSprunk = sm.brand === "SPRUNK";
                const bodyCol = isSprunk ? [0.12, 0.78, 0.32] : [0.86, 0.14, 0.18];
                const glowCol = isSprunk ? [0.32, 0.98, 0.48] : [0.98, 0.28, 0.32];

                emitAOShadow3D(sm.x, sm.y, sCos, sSin, 0, 0, 22, 18, bz, 0.34);
                // Concrete Plinth & Enamel Vending Cabinet Body
                emitTileBox3D(sm.x, sm.y, sCos, sSin, 0, 0, 16, 12, bz, bz + 0.05, 177, 177, 71, [0.86, 0.88, 0.92]);
                emitSolidBox3D(sm.x, sm.y, sCos, sSin, 0, 0, 14, 10, bz + 0.05, bz + 0.29, bodyCol, 5);
                // Illuminated Front/Back Branded Graphic Panel (ad_ecola / ad_sprunk) + Neon Top Canopy
                emitBox3D(sm.x, sm.y, sCos, sSin, 0, 0, 12.5, 10.6, bz + 0.08, bz + 0.26, sm.ad, sm.ad, glowCol);
                emitSolidBox3D(sm.x, sm.y, sCos, sSin, 0, 0, 15, 11, bz + 0.29, bz + 0.32, glowCol, 1);
            }
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
        if (this.meshLocs.uSunDir) {
            gl.uniform2f(this.meshLocs.uSunDir, 0.55, 0.83);
        }

        // Unit 0: gta1_sprites.png (mansions, roof tiles, signage)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.spritesTex);
        gl.uniform1i(this.meshLocs.uTex, 0);

        // Unit 1: gta1_tiles_vice.png (authentic 1997 64x64 3ds Max world tile atlas!)
        const viceTilesTex = renderer.tilesTexVice || renderer.tilesTex || renderer.spritesTex;
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, viceTilesTex);
        if (this.meshLocs.uTilesTex) {
            gl.uniform1i(this.meshLocs.uTilesTex, 1);
        }

        // Unit 2: 512x512 ray-marched city lightmap (uDayLightTex)
        const lightMapTex = renderer.dayLightTex || viceTilesTex;
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, lightMapTex);
        if (this.meshLocs.uDayLightTex) {
            gl.uniform1i(this.meshLocs.uDayLightTex, 2);
        }

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
        //         3D Windmill Sails, Cylindrical Artemis VI Rocket) & 3D Street Furniture!
        this.renderDynamic3DMeshes(gl, renderer, stride);

        // Restore active texture unit 0 for subsequent 2D/3D passes in renderer.js
        gl.activeTexture(gl.TEXTURE0);
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
        const encUV = (matId, u, v) => [
            -matId - Math.max(0.01, Math.min(0.99, u)) * 0.85,
            Math.max(0.01, Math.min(0.99, v))
        ];
        const pushV = (x, yElev, z, u, v, r, g, b, a = 1.0) => {
            dVerts.push(x, yElev, z, u, v, r, g, b, a);
        };
        const pushQ = (p0, p1, p2, p3, matId, r, g, b, a = 1.0) => {
            const [u0, v0] = encUV(matId, 0.02, 0.98);
            const [u1, v1] = encUV(matId, 0.98, 0.02);
            pushV(p0[0], p0[1], p0[2], u0, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);
            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p3[0], p3[1], p3[2], u1, v1, r, g, b, a);
        };
        const pushTri = (p0, p1, p2, uv0, uv1, uv2, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], uv0[0], uv0[1], r, g, b, a);
            pushV(p1[0], p1[1], p1[2], uv1[0], uv1[1], r, g, b, a);
            pushV(p2[0], p2[1], p2[2], uv2[0], uv2[1], r, g, b, a);
        };
        const emitDynBox = (cxPx, cyPx, cosA, sinA, offX, offY, wPx, dPx, yBot, yTop, col, alpha = 1.0, matId = 1) => {
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

            pushQ(tSW, tSE, bSW, bSE, matId, r, g, b, alpha);
            pushQ(tNE, tNW, bNE, bNW, matId, r * 0.78, g * 0.80, b * 0.84, alpha);
            pushQ(tNW, tSW, bNW, bSW, matId, r * 0.92, g * 0.92, b * 0.95, alpha);
            pushQ(tSE, tNE, bSE, bNE, matId, r * 0.85, g * 0.86, b * 0.90, alpha);
            if (matId !== 4) {
                pushQ(tNW, tNE, tSW, tSE, matId, Math.min(1, r * 1.06), Math.min(1, g * 1.06), Math.min(1, b * 1.06), alpha);
            }
        };
        const emitDynCylinder = (cxPx, cyPx, offX, offY, rBotPx, rTopPx, yBot, yTop, segs, col, matId = 5, capTop = true, alpha = 1.0, checkerRoll = false) => {
            const [r, g, b] = col;
            const toW = (lx, ly, yE) => [(cxPx + lx) / TILE_SIZE, yE, (cyPx + ly) / TILE_SIZE];
            const centerTop = toW(offX, offY, yTop);
            const uvCenter = encUV(matId, 0.5, 0.5);
            for (let s = 0; s < segs; s++) {
                const a0 = (s * Math.PI * 2.0) / segs;
                const a1 = ((s + 1) * Math.PI * 2.0) / segs;
                const aMid = (a0 + a1) * 0.5;
                const sunDot = Math.cos(aMid) * 0.65 + Math.sin(aMid) * 0.76;
                const shade = 0.85 + 0.19 * sunDot + Math.pow(Math.max(0, sunDot), 4.0) * 0.08;
                const isBlk = checkerRoll && (s % 4 < 2);
                const cr = (isBlk ? 0.14 : r) * shade;
                const cg = (isBlk ? 0.16 : g) * shade;
                const cb = (isBlk ? 0.20 : b) * shade;

                const b0 = toW(offX + Math.cos(a0) * rBotPx, offY + Math.sin(a0) * rBotPx, yBot);
                const b1 = toW(offX + Math.cos(a1) * rBotPx, offY + Math.sin(a1) * rBotPx, yBot);
                const t0 = toW(offX + Math.cos(a0) * rTopPx, offY + Math.sin(a0) * rTopPx, yTop);
                const t1 = toW(offX + Math.cos(a1) * rTopPx, offY + Math.sin(a1) * rTopPx, yTop);

                const [u0, v0] = encUV(matId, s / segs, 0.98);
                const [u1, v1] = encUV(matId, (s + 1) / segs, 0.02);
                pushV(t0[0], t0[1], t0[2], u0, v0, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb), alpha);
                pushV(b0[0], b0[1], b0[2], u0, v1, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb), alpha);
                pushV(t1[0], t1[1], t1[2], u1, v0, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb), alpha);
                pushV(t1[0], t1[1], t1[2], u1, v0, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb), alpha);
                pushV(b0[0], b0[1], b0[2], u0, v1, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb), alpha);
                pushV(b1[0], b1[1], b1[2], u1, v1, Math.min(1, cr), Math.min(1, cg), Math.min(1, cb), alpha);

                if (capTop && rTopPx > 0.5) {
                    const uv0 = encUV(matId, 0.5 + 0.45 * Math.cos(a0), 0.5 + 0.45 * Math.sin(a0));
                    const uv1 = encUV(matId, 0.5 + 0.45 * Math.cos(a1), 0.5 + 0.45 * Math.sin(a1));
                    pushTri(centerTop, t0, t1, uvCenter, uv0, uv1, Math.min(1, r * 1.06), Math.min(1, g * 1.06), Math.min(1, b * 1.06), alpha);
                }
            }
        };
        const emitDynCone = (cxPx, cyPx, offX, offY, rBotPx, yBot, yTop, segs, col, matId = 5, alpha = 1.0) => {
            const [r, g, b] = col;
            const toW = (lx, ly, yE) => [(cxPx + lx) / TILE_SIZE, yE, (cyPx + ly) / TILE_SIZE];
            const apex = toW(offX, offY, yTop);
            const uvApex = encUV(matId, 0.5, 0.98);
            for (let s = 0; s < segs; s++) {
                const a0 = (s * Math.PI * 2.0) / segs;
                const a1 = ((s + 1) * Math.PI * 2.0) / segs;
                const aMid = (a0 + a1) * 0.5;
                const sunDot = Math.cos(aMid) * 0.65 + Math.sin(aMid) * 0.76;
                const shade = 0.88 + 0.18 * sunDot;
                const b0 = toW(offX + Math.cos(a0) * rBotPx, offY + Math.sin(a0) * rBotPx, yBot);
                const b1 = toW(offX + Math.cos(a1) * rBotPx, offY + Math.sin(a1) * rBotPx, yBot);
                const uv0 = encUV(matId, s / segs, 0.05);
                const uv1 = encUV(matId, (s + 1) / segs, 0.05);
                pushTri(apex, b0, b1, uvApex, uv0, uv1, Math.min(1, r * shade), Math.min(1, g * shade), Math.min(1, b * shade), alpha);
            }
        };

        // 1. Live Vertically-Rotating Supersized 3D Neon Ferris Wheel at Vice Beach Pier
        if (this.landmarks3D && this.landmarks3D.ferrisWheel) {
            const fw = this.landmarks3D.ferrisWheel;
            if (fw.x >= minX - 240 && fw.x <= maxX + 240 && fw.y >= minY - 240 && fw.y <= maxY + 240) {
                const hubElev = (fw.z || 2.0) + 1.40;
                const radPx = 78.0;
                const radElev = 1.15;
                const numGondolas = 12;
                for (let gi = 0; gi < numGondolas; gi++) {
                    const theta = t * 0.65 + (gi * Math.PI * 2.0) / numGondolas;
                    const gx = fw.x + Math.cos(theta) * radPx;
                    const gyElev = hubElev + Math.sin(theta) * radElev;
                    const isPink = (gi % 2 === 0);
                    const gCol = isPink ? [0.92, 0.30, 0.68] : [0.22, 0.82, 0.92];
                    // 3D Cylindrical Passenger Gondola Cabin + Radial Spoke
                    emitDynCylinder(gx, fw.y, 0, 0, 10.5, 11.5, gyElev - 0.12, gyElev + 0.05, 10, gCol, 5, true);
                    const mx = fw.x + Math.cos(theta) * (radPx * 0.52);
                    const myElev = hubElev + Math.sin(theta) * (radElev * 0.52);
                    emitDynBox(mx, fw.y, 1, 0, 0, 0, 7, 32, myElev - 0.035, myElev + 0.035, [0.94, 0.88, 0.48], 1.0, 4);
                }
            }
        }

        // 1B. TRUE 3D CYLINDRICAL & CONICAL SERA ARTEMIS VI HEAVY-LIFT ROCKET + SEE-THROUGH TRUSS SWING ARMS + LIFTOFF PLUME
        //     (Shaded by MAT 5 & MAT 6 which blend L45 & L63 steel tiles from gta1_tiles_vice.png + dark charcoal pixel-art outlines!)
        if (this.landmarks3D && this.landmarks3D.launchpad) {
            const lp = this.landmarks3D.launchpad;
            if (lp.x >= minX - 360 && lp.x <= maxX + 360 && lp.y >= minY - 360 && lp.y <= maxY + 360) {
                const bz = lp.z || 2.0;
                const rl = this.rocketLaunch || { state: "IDLE", timer: 0, liftZ: 0, armSwing: 0 };

                // A. 3 Open-Lattice Steel Umbilical Swing Arms (MAT 4 blends S363 riveted truss) pivoting from LUT toward Rocket
                const baseAng = 0.50; // Points from (-44, -32) to (+14, 0)
                const armAng = baseAng - (rl.armSwing || 0);
                const armCos = Math.cos(armAng);
                const armSin = Math.sin(armAng);
                const pivotX = lp.x - 32;
                const pivotY = lp.y - 24;
                for (const armZ of [bz + 0.85, bz + 1.40, bz + 1.95]) {
                    emitDynBox(pivotX, pivotY, armCos, armSin, 24, 0, 52, 9, armZ, armZ + 0.10, [0.84, 0.26, 0.20], 1.0, 4);
                }

                // B. True 20-Sided Cylindrical & Conical SERA Artemis VI Heavy-Lift Rocket (unless in COOLDOWN)
                if (rl.state !== "COOLDOWN") {
                    const rx = lp.x + 14;
                    const ry = lp.y;
                    const rBase = bz + 0.33 + (rl.liftZ || 0);

                    // 1. 4 Clustered Conical RS-25 Liquid Hydrogen Main Engine Nozzles (Gunmetal Steel)
                    for (const [nx, ny] of [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]]) {
                        emitDynCylinder(rx, ry, nx, ny, 5.8, 3.2, rBase - 0.04, rBase + 0.10, 12, [0.24, 0.27, 0.34], 5, false);
                    }

                    // 2. Twin 16-Sided Cylindrical Solid Rocket Boosters (SRBs) on North & South Flanks (offY = -26 and +26)
                    for (const srbY of [-26, 26]) {
                        // Flared aft booster skirt + nozzle
                        emitDynCylinder(rx, ry, 0, srbY, 9.8, 8.2, rBase - 0.02, rBase + 0.12, 16, [0.28, 0.31, 0.38], 5, false);
                        // Weathered Aerospace White segmented SRB cylindrical casing (MAT 5 blends L45 steel plate + pixel-art outlines)
                        emitDynCylinder(rx, ry, 0, srbY, 8.2, 8.2, rBase + 0.12, rBase + 1.42, 16, [0.91, 0.93, 0.96], 5, false);
                        // Weathered NASA Crimson separation ring & dark charcoal telemetry band
                        emitDynCylinder(rx, ry, 0, srbY, 8.4, 8.4, rBase + 1.02, rBase + 1.12, 16, [0.80, 0.22, 0.18], 5, false);
                        emitDynCylinder(rx, ry, 0, srbY, 8.3, 8.3, rBase + 1.36, rBase + 1.43, 16, [0.16, 0.19, 0.24], 5, false);
                        // Smooth 16-Sided Aerodynamic Conical SRB Nose Cone + Crimson Tip!
                        emitDynCone(rx, ry, 0, srbY, 8.2, rBase + 1.42, rBase + 1.76, 16, [0.92, 0.94, 0.97], 5);
                        emitDynCone(rx, ry, 0, srbY, 3.2, rBase + 1.66, rBase + 1.80, 12, [0.82, 0.22, 0.18], 5);
                        // Structural attach struts between SRB and Core Stage
                        emitDynBox(rx, ry, 1, 0, 0, srbY * 0.65, 6, 10, rBase + 0.28, rBase + 0.34, [0.36, 0.40, 0.46], 1.0, 5);
                        emitDynBox(rx, ry, 1, 0, 0, srbY * 0.65, 6, 10, rBase + 1.24, rBase + 1.30, [0.36, 0.40, 0.46], 1.0, 5);
                    }

                    // 3. Colossal 20-Sided Cylindrical Cryogenic Core Stage (Weathered NASA SLS Rust-Orange, r = 17.0px)
                    emitDynCylinder(rx, ry, 0, 0, 17.0, 17.0, rBase + 0.08, rBase + 0.18, 20, [0.90, 0.92, 0.96], 5, false);
                    emitDynCylinder(rx, ry, 0, 0, 17.0, 17.0, rBase + 0.18, rBase + 1.44, 20, [0.82, 0.43, 0.18], 5, false);
                    // Ribbed Dark Cryogenic Intertank Band (MAT 6 blends L63 corrugated ribs) & External LOX Feedline Tunnel
                    emitDynCylinder(rx, ry, 0, 0, 17.4, 17.4, rBase + 0.98, rBase + 1.14, 20, [0.24, 0.27, 0.34], 6, false);
                    emitDynCylinder(rx, ry, 16.2, 0, 2.2, 2.2, rBase + 0.14, rBase + 1.38, 8, [0.80, 0.84, 0.90], 5, true);

                    // 4. Saturn V / Artemis Black-and-White Checker Roll-Pattern Ring + Tapered Upper Stage Adapter
                    emitDynCylinder(rx, ry, 0, 0, 17.1, 17.1, rBase + 1.44, rBase + 1.58, 20, [0.92, 0.94, 0.97], 5, false, 1.0, true);
                    emitDynCylinder(rx, ry, 0, 0, 17.0, 11.8, rBase + 1.58, rBase + 1.82, 20, [0.91, 0.93, 0.96], 5, false);

                    // 5. Cylindrical Orion Service Module + Smooth Conical Crew Capsule + Launch Abort System (LAS) Escape Tower!
                    emitDynCylinder(rx, ry, 0, 0, 11.8, 11.8, rBase + 1.82, rBase + 2.04, 20, [0.92, 0.94, 0.97], 5, false);
                    emitDynCylinder(rx, ry, 0, 0, 12.0, 12.0, rBase + 1.90, rBase + 1.96, 20, [0.80, 0.22, 0.18], 5, false);
                    emitDynCone(rx, ry, 0, 0, 11.8, rBase + 2.04, rBase + 2.34, 20, [0.94, 0.96, 0.99], 5);
                    emitDynCylinder(rx, ry, 0, 0, 2.2, 1.1, rBase + 2.30, rBase + 2.58, 12, [0.84, 0.22, 0.18], 5, true);

                    // C. Cylindrical & Conical 3D Main Engine Supersonic Exhaust Plume & Flame Trench Steam Billows
                    if (rl.state === "COUNTDOWN" || rl.state === "LIFTOFF") {
                        const flicker = 0.88 + 0.12 * Math.sin(t * 42.0);
                        const pBot = Math.max(bz + 0.25, rBase - 0.95);
                        emitDynCylinder(rx, ry, 0, 0, 28 * flicker, 18 * flicker, pBot, rBase, 16, [1.0, 0.96, 0.72], 5, false, 0.95);
                        emitDynCylinder(rx, ry, 0, 0, 42 * flicker, 26 * flicker, Math.max(bz + 0.25, rBase - 1.45), Math.max(bz + 0.30, rBase - 0.18), 16, [1.0, 0.54, 0.14], 5, false, 0.85);
                        for (let fb = 0; fb < 6; fb++) {
                            const phase = ((t * 2.6 + fb * 0.17) % 1.0);
                            const dir = (fb % 2 === 0) ? 1 : -1;
                            const fx = rx + dir * (32 + phase * 135);
                            const fRad = 18 + phase * 28;
                            const fTop = bz + 0.38 + phase * 0.65;
                            const col = phase < 0.4 ? [1.0, 0.64, 0.18] : [0.92, 0.95, 0.99];
                            emitDynCylinder(fx, ry, 0, 0, fRad, fRad * 0.75, bz + 0.25, fTop, 12, col, 5, true, 0.82 - phase * 0.55);
                        }
                    }
                }

                // D. Parachuting & Splashed-Down 3D Conical Orion Crew Capsule (+$50,000 Lunar Payload!)
                if (rl.capsuleActive) {
                    const cxCap = rl.capsuleX || (473.5 * TILE_SIZE);
                    const cyCap = rl.capsuleY || (35.0 * TILE_SIZE);
                    const bob = (rl.capsuleAlt <= 0) ? Math.sin(t * 3.2) * 0.015 : 0;
                    const cBase = 2.02 + (rl.capsuleAlt || 0) + bob;
                    // Inflatable NASA Orange Recovery Flotation Collar + Scorched Heatshield Base + Conical Crew Module
                    emitDynCylinder(cxCap, cyCap, 0, 0, 16.5, 16.5, cBase, cBase + 0.08, 16, [0.94, 0.46, 0.14], 5, true);
                    emitDynCone(cxCap, cyCap, 0, 0, 14.0, cBase + 0.06, cBase + 0.38, 18, [0.88, 0.90, 0.94], 5);
                    emitDynCylinder(cxCap, cyCap, 0, 0, 4.5, 4.5, cBase + 0.34, cBase + 0.44, 12, [0.22, 0.26, 0.34], 5, true);
                    // Flashing Green Recovery Beacon on apex of Orion Capsule
                    if (Math.sin(t * 10.0) > -0.2) {
                        emitDynCylinder(cxCap, cyCap, 0, 0, 3.2, 3.2, cBase + 0.44, cBase + 0.52, 8, [0.18, 0.98, 0.46], 5, true);
                    }
                    // Triple 3D NASA Orange-and-White Main Parachute Canopies while descending!
                    if (rl.capsuleAlt > 0.02) {
                        for (let pi = 0; pi < 3; pi++) {
                            const pAng = t * 0.6 + (pi * Math.PI * 2.0) / 3.0;
                            const pxOff = Math.cos(pAng) * 24.0;
                            const pyOff = Math.sin(pAng) * 24.0;
                            // Shroud cable strut + Conical Parachute Canopy
                            emitDynBox(cxCap + pxOff * 0.5, cyCap + pyOff * 0.5, 1, 0, 0, 0, 2.5, 2.5, cBase + 0.38, cBase + 1.05, [0.86, 0.88, 0.92], 0.85, 5);
                            emitDynCone(cxCap, cyCap, pxOff, pyOff, 22.0, cBase + 1.02, cBase + 1.28, 14, (pi % 2 === 0) ? [0.94, 0.38, 0.16] : [0.96, 0.97, 1.00], 5, 0.94);
                        }
                    }
                }
            }
        }

        // 1C. Live-Rotating 3D VCIA Airport Surveillance Radar (ASR) Dish & Kelly County Radio Mast Strobe
        if (this.landmarks3D && this.landmarks3D.atcTower) {
            const atc = this.landmarks3D.atcTower;
            if (atc.x >= minX - 240 && atc.x <= maxX + 240 && atc.y >= minY - 240 && atc.y <= maxY + 240) {
                const bz = atc.z || 2.0;
                const rAng = t * 2.2;
                const rCos = Math.cos(rAng);
                const rSin = Math.sin(rAng);
                // Rotating Open-Lattice Radar Reflector Dish (MAT 4) + Feed Horn Arm (MAT 5)
                emitDynBox(atc.x + 8, atc.y - 6, rCos, rSin, 0, 0, 34, 6, bz + 2.38, bz + 2.52, [0.94, 0.96, 1.00], 1.0, 4);
                emitDynBox(atc.x + 8, atc.y - 6, rCos, rSin, 0, 10, 5, 16, bz + 2.42, bz + 2.48, [0.84, 0.24, 0.20], 1.0, 5);
                if (Math.sin(t * 8.0) > 0) {
                    emitDynCylinder(atc.x + 8, atc.y - 6, 0, 0, 3.0, 3.0, bz + 2.52, bz + 2.60, 8, [1.0, 0.16, 0.18], 5, true);
                }
            }
        }
        if (this.landmarks3D && this.landmarks3D.waterTower) {
            const wt = this.landmarks3D.waterTower;
            if (wt.x >= minX - 240 && wt.x <= maxX + 240 && wt.y >= minY - 240 && wt.y <= maxY + 240) {
                const bz = wt.z || 2.0;
                if (Math.sin(t * 7.0) > 0) {
                    emitDynCylinder(wt.x + 54, wt.y, 0, 0, 3.2, 3.2, bz + 2.62, bz + 2.72, 8, [1.0, 0.16, 0.18], 5, true);
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
                        emitDynBox(sx, mg.y + 19, 1, 0, 0, 0, 7, 4, syElev - 0.03, syElev + 0.03, [0.98, 0.92, 0.68], 1.0, 4);
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
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 12, 7, bz, bz + 0.07, [0.88, 0.22, 0.18], 1.0, 5);
                        // High-pressure 3D Water Geyser erupting from homeX, homeY!
                        if (sp.geyserTimer > 0) {
                            for (let w = 0; w < 5; w++) {
                                const phase = ((t * 3.8 + w * 0.2) % 1.0);
                                const wyElev = 2.02 + phase * 0.78;
                                const spread = 5.0 + phase * 14.0;
                                emitDynBox(sp.homeX, sp.homeY, 1, 0, 0, 0, spread, spread, wyElev, wyElev + 0.11, [0.68, 0.94, 1.0], 0.78 - phase * 0.45, 7);
                            }
                        }
                    } else {
                        emitDynBox(sp.x, sp.y, 1, 0, 0, 0, 7, 7, bz, bz + 0.12, [0.88, 0.22, 0.18], 1.0, 5);
                        emitDynBox(sp.x, sp.y, 1, 0, 0, 0, 9, 5, bz + 0.06, bz + 0.09, [0.94, 0.80, 0.18], 1.0, 5);
                    }
                } else if (sp.kind === "STREETLIGHT_NEON") {
                    const neonCol = sp.neonPink ? [0.96, 0.34, 0.76] : [0.22, 0.88, 0.96];
                    if (sp.broken) {
                        // Knocked-down 3D streetlight pole lying horizontal on the ground
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 38, 4, bz, bz + 0.05, [0.78, 0.82, 0.88], 1.0, 5);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 16, 0, 10, 6, bz, bz + 0.06, neonCol, 1.0, 7);
                    } else {
                        // Vertical 3D Art Deco pole + cantilevered glowing neon luminary arm
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 4.5, 4.5, bz, bz + 0.54, [0.82, 0.86, 0.92], 1.0, 5);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 9, 0, 18, 4.0, bz + 0.50, bz + 0.54, [0.82, 0.86, 0.92], 1.0, 5);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 14, 0, 10, 6.0, bz + 0.47, bz + 0.51, neonCol, 1.0, 7);
                    }
                } else if (sp.kind === "PAYPHONE_BOOTH") {
                    if (sp.broken) {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 22, 12, bz, bz + 0.09, [0.22, 0.64, 0.84], 1.0, 7);
                    } else {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 14, 14, bz, bz + 0.28, [0.22, 0.64, 0.84], 1.0, 7);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 16, 16, bz + 0.28, bz + 0.32, [0.94, 0.96, 0.99], 1.0, 5);
                    }
                } else if (sp.kind === "NEWS_STAND") {
                    if (sp.broken) {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 14, 10, bz, bz + 0.07, [0.92, 0.64, 0.16], 1.0, 6);
                    } else {
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 12, 10, bz, bz + 0.16, [0.92, 0.64, 0.16], 1.0, 6);
                        emitDynBox(sp.x, sp.y, cosA, sinA, 0, 0, 12, 10, bz + 0.11, bz + 0.16, [0.94, 0.95, 0.98], 1.0, 7);
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
                emitDynBox(ht.keypadX, ht.keypadY, cosA, sinA, 0, 0, 8, 6, bz, bz + 0.22, [0.24, 0.28, 0.34], 1.0, 5);
                emitDynBox(ht.keypadX, ht.keypadY, cosA, sinA, 0, 0, 6, 6.5, bz + 0.14, bz + 0.20, ledCol, 1.0, 7);

                // 3D Red Laser Security Beams across the Villa Portico (when unhacked & unlooted)
                if (!ht.hacked && !ht.looted) {
                    const pulse = 0.72 + 0.25 * Math.sin(t * 9.0 + i);
                    for (const hOff of [0.07, 0.15, 0.23]) {
                        emitDynBox(ht.laserX, ht.laserY, cosA, sinA, 0, 0, ht.laserW, 2.2, bz + hOff, bz + hOff + 0.018, [1.0, 0.12, 0.18], pulse);
                    }
                }

                // 3D Black & Gold Armored Cartel Vault on Rear/Poolside Terrace (MAT 5/6 steel plating)
                if (ht.looted) {
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 22, 16, bz, bz + 0.14, [0.18, 0.20, 0.26], 1.0, 6);
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 14, 10, bz + 0.14, bz + 0.19, [0.94, 0.78, 0.18], 1.0, 5);
                } else {
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 22, 16, bz, bz + 0.28, [0.16, 0.18, 0.24], 1.0, 6);
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 24, 18, bz + 0.26, bz + 0.30, [0.92, 0.74, 0.16], 1.0, 5);
                    emitDynBox(ht.vaultX, ht.vaultY, cosA, sinA, 0, 0, 10, 17, bz + 0.08, bz + 0.20, [0.94, 0.80, 0.22], 1.0, 5);
                }

                // Pulsing 3D Red Roof Alarm Strobes when Alarm is Tripped
                if (ht.alarmTripped && Math.sin(t * 14.0 + i) > 0) {
                    const topY = bz + inst.totalHeightBlocks;
                    emitDynBox(inst.x, inst.y, cosA, sinA, 0, 0, 18, 18, topY, topY + 0.14, [1.0, 0.12, 0.16], 0.92);
                }
            }
        }

        // 5. 3D Articulated GTA 6 Trailer 1 Rogue Leonida Alligators (Poolside & Convenience Store Forecourts!)
        if (Array.isArray(this.gatorEncounters)) {
            for (let i = 0; i < this.gatorEncounters.length; i++) {
                const ge = this.gatorEncounters[i];
                if (!ge.active || ge.x < minX - 120 || ge.x > maxX + 120 || ge.y < minY - 120 || ge.y > maxY + 120) continue;
                const bz = ge.z || 2.0;
                const cosA = Math.cos(ge.ang || 0);
                const sinA = Math.sin(ge.ang || 0);
                const tailSwing = Math.sin(t * 5.2 + i * 1.7) * 3.8;
                const jawLift = Math.max(0, Math.sin(t * 4.2 + i * 1.3)) * 0.052;

                // Armored scaly olive-emerald torso + 3 dorsal osteoderm scute ridges (MAT 6 ribbed texture)
                emitDynBox(ge.x, ge.y, cosA, sinA, 0, 0, 24, 11, bz + 0.015, bz + 0.105, [0.22, 0.44, 0.24], 1.0, 6);
                emitDynBox(ge.x, ge.y, cosA, sinA, -2, 0, 18, 5, bz + 0.105, bz + 0.135, [0.15, 0.32, 0.16], 1.0, 6);
                // 4 Splayed Muscular Gator Legs
                for (const [lx, ly] of [[7, -7.5], [7, 7.5], [-7, -7.5], [-7, 7.5]]) {
                    emitDynBox(ge.x, ge.y, cosA, sinA, lx, ly, 5, 4.5, bz + 0.01, bz + 0.065, [0.18, 0.38, 0.20], 1.0, 1);
                }
                // 2-Segment Articulated Swishing Tail
                emitDynBox(ge.x, ge.y, cosA, sinA, -16, tailSwing * 0.45, 11, 7, bz + 0.015, bz + 0.085, [0.20, 0.40, 0.22], 1.0, 6);
                emitDynBox(ge.x, ge.y, cosA, sinA, -25, tailSwing, 10, 4.5, bz + 0.015, bz + 0.065, [0.16, 0.34, 0.18], 1.0, 6);
                // Hinged Lower Jaw + Snapping Upper Snout + Ivory Teeth + Glowing Amber Eyes
                emitDynBox(ge.x, ge.y, cosA, sinA, 16, 0, 12, 8.5, bz + 0.015, bz + 0.050, [0.28, 0.50, 0.28], 1.0, 1);
                emitDynBox(ge.x, ge.y, cosA, sinA, 16, 0, 10, 7.0, bz + 0.050, bz + 0.050 + jawLift * 0.6, [0.96, 0.94, 0.86], 1.0, 1);
                emitDynBox(ge.x, ge.y, cosA, sinA, 16, 0, 12.5, 9.0, bz + 0.052 + jawLift, bz + 0.102 + jawLift, [0.22, 0.45, 0.24], 1.0, 6);
                emitDynBox(ge.x, ge.y, cosA, sinA, 11.5, -3.2, 2.8, 2.2, bz + 0.102 + jawLift, bz + 0.125 + jawLift, [1.0, 0.78, 0.12], 1.0, 7);
                emitDynBox(ge.x, ge.y, cosA, sinA, 11.5,  3.2, 2.8, 2.2, bz + 0.102 + jawLift, bz + 0.125 + jawLift, [1.0, 0.78, 0.12], 1.0, 7);
            }
        }

        // 6. 3D VCPD Radar Speed Trap Strobe Flash & Pulsing LED Speed Readout
        if (Array.isArray(this.speedTraps)) {
            for (let i = 0; i < this.speedTraps.length; i++) {
                const st = this.speedTraps[i];
                if (st.x < minX - 140 || st.x > maxX + 140 || st.y < minY - 140 || st.y > maxY + 140) continue;
                const bz = st.z || 2.0;
                const cosA = Math.cos(st.ang || 0);
                const sinA = Math.sin(st.ang || 0);
                const isFlashing = (st.flashTimer || 0) > 0;
                const ledCol = isFlashing ? [1.0, 1.0, 1.0] : ((Math.sin(t * 6.0 + i) > 0) ? [0.18, 0.92, 1.0] : [1.0, 0.24, 0.32]);
                emitDynBox(st.x, st.y, cosA, sinA, 0, 0, 14, 15.5, bz + 0.72, bz + 0.88, ledCol, 1.0, 7);
                if (isFlashing) {
                    emitDynCylinder(st.x, st.y, 0, 0, 22.0, 22.0, bz + 0.65, bz + 1.08, 12, [1.0, 0.98, 0.88], 7, true, 0.85);
                }
            }
        }

        // 7. 3D Spinning Emerald & Gold Cash Briefcases (Ejected from Grupo Seguro Armored Cash Trucks!)
        if (Array.isArray(this.cashDrops) && this.cashDrops.length > 0) {
            for (let i = 0; i < this.cashDrops.length; i++) {
                const cd = this.cashDrops[i];
                if (cd.x < minX - 100 || cd.x > maxX + 100 || cd.y < minY - 100 || cd.y > maxY + 100) continue;
                const bz = (cd.z || 2.0) + 0.02 + Math.abs(Math.sin(t * 4.5 + cd.seed)) * 0.04;
                const bAng = t * 3.2 + cd.seed;
                const cosA = Math.cos(bAng);
                const sinA = Math.sin(bAng);
                emitDynBox(cd.x, cd.y, cosA, sinA, 0, 0, 14, 10, bz, bz + 0.08, [0.12, 0.78, 0.38], 1.0, 5);
                emitDynBox(cd.x, cd.y, cosA, sinA, 0, 0, 15, 3.5, bz + 0.01, bz + 0.09, [0.98, 0.82, 0.18], 1.0, 7);
            }
        }

        // 8. 12 Bobbing 3D Red Port & Green Starboard Marine Channel Navigation Buoys + Mount Kalaga Lookout Beacon
        if (this.landmarks3D && Array.isArray(this.landmarks3D.marineBuoys)) {
            for (let i = 0; i < this.landmarks3D.marineBuoys.length; i++) {
                const mb = this.landmarks3D.marineBuoys[i];
                if (mb.x < minX - 120 || mb.x > maxX + 120 || mb.y < minY - 120 || mb.y > maxY + 120) continue;
                const bob = Math.sin(t * 2.5 + mb.seed) * 0.018;
                const bz = (mb.z || 2.0) + 0.01 + bob;
                const col = mb.isRed ? [0.88, 0.20, 0.18] : [0.14, 0.76, 0.38];
                emitDynCylinder(mb.x, mb.y, 0, 0, 9.5, 8.5, bz, bz + 0.08, 12, col, 5, true);
                emitDynBox(mb.x, mb.y, 1, 0, 0, 0, 7.5, 7.5, bz + 0.08, bz + 0.34, col, 1.0, 4);
                if (Math.sin(t * 5.5 + mb.seed) > -0.1) {
                    const led = mb.isRed ? [1.0, 0.18, 0.22] : [0.18, 0.98, 0.48];
                    emitDynCylinder(mb.x, mb.y, 0, 0, 3.5, 3.5, bz + 0.34, bz + 0.42, 8, led, 7, true);
                }
            }
        }
        if (this.landmarks3D && this.landmarks3D.kalagaLookout) {
            const kl = this.landmarks3D.kalagaLookout;
            if (kl.x >= minX - 180 && kl.x <= maxX + 180 && kl.y >= minY - 180 && kl.y <= maxY + 180) {
                const bz = kl.z || 2.0;
                const vAng = t * 2.8;
                emitDynBox(kl.x, kl.y, Math.cos(vAng), Math.sin(vAng), 0, 0, 18, 3.5, bz + 2.26, bz + 2.31, [0.92, 0.94, 0.98], 1.0, 5);
                if (Math.sin(t * 6.0) > 0) {
                    emitDynCylinder(kl.x, kl.y, 0, 0, 2.8, 2.8, bz + 2.31, bz + 2.38, 8, [0.98, 0.62, 0.14], 7, true);
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
                    renderer.pushSolidQuad3D(bx, by, (lh.z || 2.0) + 2.24, 76, 18, bAng, 1.0, 0.96, 0.68, 0.42, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
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

        // Render Glowing Ignition Console Ring & Orion Capsule Recovery Ring at SERA Space Center
        if (this.landmarks3D && this.landmarks3D.launchpad) {
            const lp = this.landmarks3D.launchpad;
            if (lp.consoleX >= minX - 180 && lp.consoleX <= maxX + 180 && lp.consoleY >= minY - 180 && lp.consoleY <= maxY + 180) {
                const isIdle = !this.rocketLaunch || this.rocketLaunch.state === "IDLE";
                const rSz = 30 + Math.sin(renderer.time * 5.0) * 4.0;
                renderer.pushSolidQuad3D(
                    lp.consoleX,
                    lp.consoleY,
                    2.12,
                    rSz,
                    rSz,
                    renderer.time * 1.4,
                    isIdle ? 0.98 : 0.38,
                    isIdle ? 0.36 : 0.86,
                    0.12,
                    0.52,
                    SPRITE_DRAW_ORDER.TIRE_MARKS
                );
            }
            if (this.rocketLaunch && this.rocketLaunch.capsuleActive) {
                const cxCap = this.rocketLaunch.capsuleX;
                const cyCap = this.rocketLaunch.capsuleY;
                if (cxCap >= minX - 180 && cxCap <= maxX + 180 && cyCap >= minY - 180 && cyCap <= maxY + 180) {
                    const rSz = 42 + Math.sin(renderer.time * 6.0) * 5.0;
                    renderer.pushSolidQuad3D(cxCap, cyCap, 2.04, rSz, rSz, renderer.time * 1.8, 0.18, 0.96, 0.46, 0.55, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }
        }

        // Render GTA 6 Rogue Alligator Bystander Livestreamers & Pulsing Gator Bounty Rings
        if (Array.isArray(this.gatorEncounters)) {
            const pFrame = Math.floor(renderer.time * 4.5) % 8;
            for (let i = 0; i < this.gatorEncounters.length; i++) {
                const ge = this.gatorEncounters[i];
                if (!ge.active || ge.x < minX - 160 || ge.x > maxX + 160 || ge.y < minY - 160 || ge.y > maxY + 160) continue;
                const bz = ge.z || 2.0;
                const rSz = 26 + Math.sin(renderer.time * 5.5 + i) * 3.5;
                renderer.pushSolidQuad3D(ge.x, ge.y, bz + 0.025, rSz, rSz, renderer.time * 1.1, 0.18, 0.94, 0.44, 0.44, SPRITE_DRAW_ORDER.TIRE_MARKS);
                // 2 Bystander Tourists filming the rogue gator on glowing cyan smartphones!
                for (let bi = 0; bi < 2; bi++) {
                    const bAng = (ge.ang || 0) + (bi === 0 ? 1.85 : -1.85);
                    const bx = ge.x + Math.cos(bAng) * 36.0;
                    const by = ge.y + Math.sin(bAng) * 36.0;
                    const faceGator = Math.atan2(ge.y - by, ge.x - bx);
                    renderer.batchPedSprite3D(bi === 0 ? "bikini_pink" : "civ1", pFrame, bx, by, bz + 0.045, faceGator, 1.22, false, SPRITE_DRAW_ORDER.PED);
                    const phX = bx + Math.cos(faceGator) * 9.0;
                    const phY = by + Math.sin(faceGator) * 9.0;
                    renderer.pushSolidQuad3D(phX, phY, bz + 0.075, 4.5, 3.0, faceGator, 0.22, 0.94, 1.0, 0.92, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                }
            }
        }

        // Render Armored Truck Gold Halos & Cash Drop Rings
        if (game && Array.isArray(game.vehicles)) {
            for (const v of game.vehicles) {
                if (!v.isArmoredCashTruck || (v.cashBagsLeft || 0) <= 0) continue;
                if (v.x < minX - 140 || v.x > maxX + 140 || v.y < minY - 140 || v.y > maxY + 140) continue;
                const rSz = 44 + Math.sin(renderer.time * 5.0) * 4.5;
                renderer.pushSolidQuad3D(v.x, v.y, (v.z || 2.0) + 0.024, rSz, 28, v.angle || 0, 0.98, 0.82, 0.16, 0.42, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
        }
        if (Array.isArray(this.cashDrops)) {
            for (let i = 0; i < this.cashDrops.length; i++) {
                const cd = this.cashDrops[i];
                if (cd.x < minX - 100 || cd.x > maxX + 100 || cd.y < minY - 100 || cd.y > maxY + 100) continue;
                const rSz = 20 + Math.sin(renderer.time * 6.0 + cd.seed) * 2.5;
                renderer.pushSolidQuad3D(cd.x, cd.y, (cd.z || 2.0) + 0.024, rSz, rSz, renderer.time * 2.0, 0.98, 0.84, 0.18, 0.52, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
        }
    }

    /* ========================================================================
       6B. RENDER 2D VILLA HEIST INTERACTION PROMPTS & ACTIVE GETAWAY BANNER
       ======================================================================== */
    renderHeistPrompts(ctx, renderer, game) {
        if (!ctx || !renderer || !game || !game.player || game.activeInterior) return;

        const p = game.player;
        const px = p.car ? p.car.x : p.x;
        const py = p.car ? p.car.y : p.y;

        ctx.save();
        ctx.textAlign = "center";

        // 0. SERA Space Center Launch Complex 39A Ignition Console Prompt, Orion Recovery & Live Launch Telemetry Banner
        if (this.landmarks3D && this.landmarks3D.launchpad) {
            const lp = this.landmarks3D.launchpad;
            const rl = this.rocketLaunch || { state: "IDLE", timer: 0, liftZ: 0, velZ: 0 };
            if (rl.capsuleActive && Math.hypot(px - rl.capsuleX, py - rl.capsuleY) < 165) {
                const scr = renderer.worldToScreen(rl.capsuleX, rl.capsuleY - 18, 2.55 + (rl.capsuleAlt || 0));
                ctx.font = "900 12px monospace";
                ctx.fillStyle = "rgba(10,14,26,0.92)";
                ctx.fillRect(scr.x - 195, scr.y - 24, 390, 24);
                ctx.strokeStyle = "#4ade80";
                ctx.lineWidth = 2.0;
                ctx.strokeRect(scr.x - 195, scr.y - 24, 390, 24);
                ctx.fillStyle = "#4ade80";
                ctx.fillText("🪂 [E] RECOVER ORION LUNAR CAPSULE (+$50,000)", scr.x, scr.y - 8);
            }
            if (!p.inVehicle && rl.state === "IDLE") {
                if (Math.hypot(px - lp.consoleX, py - lp.consoleY) < 92 || Math.hypot(px - lp.x, py - lp.y) < 165) {
                    const scr = renderer.worldToScreen(lp.consoleX, lp.consoleY - 18, 2.52);
                    ctx.font = "900 12px monospace";
                    ctx.fillStyle = "rgba(10,14,26,0.92)";
                    ctx.fillRect(scr.x - 185, scr.y - 24, 370, 24);
                    ctx.strokeStyle = "#f97316";
                    ctx.lineWidth = 2.0;
                    ctx.strokeRect(scr.x - 185, scr.y - 24, 370, 24);
                    ctx.fillStyle = "#fde047";
                    ctx.fillText("🚀 [E] IGNITE SERA ARTEMIS VI ROCKET (+$25,000)", scr.x, scr.y - 8);
                }
            } else if (rl.state === "COUNTDOWN" || rl.state === "LIFTOFF") {
                const cx = ctx.canvas.width * 0.5;
                const cy = 62;
                const altMeters = Math.round((rl.liftZ || 0) * 2850);
                const mach = ((rl.velZ || 0) * 3.8).toFixed(1);
                ctx.fillStyle = "rgba(10, 14, 26, 0.92)";
                ctx.fillRect(cx - 240, cy - 24, 480, 48);
                ctx.strokeStyle = "#f97316";
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - 240, cy - 24, 480, 48);
                ctx.font = "900 12px monospace";
                ctx.fillStyle = "#fde047";
                ctx.fillText(
                    rl.state === "COUNTDOWN"
                        ? `🚀 SERA LAUNCH COMPLEX 39A — T-MINUS ${Math.max(0, (3.0 - rl.timer)).toFixed(1)}s (MAIN ENGINE START)`
                        : `🚀 SERA ARTEMIS VI LIFTOFF — ALTITUDE: ${altMeters.toLocaleString()}m | SPEED: MACH ${mach}`,
                    cx,
                    cy - 6
                );
                ctx.font = "700 11px monospace";
                ctx.fillStyle = "#38bdf8";
                ctx.fillText("AUTO-ZOOM ACTIVE • THERMAL BLAST CLEAR • ORION SPLASHDOWN NEXT", cx, cy + 14);
            }
        }

        // 0B. Rogue Leonida Gator Wrangler & Grupo Seguro Armored Cash Truck Prompts
        if (Array.isArray(this.gatorEncounters)) {
            for (const ge of this.gatorEncounters) {
                if (ge.active && Math.hypot(px - ge.x, py - ge.y) < 110) {
                    const scr = renderer.worldToScreen(ge.x, ge.y - 16, (ge.z || 2.0) + 0.25);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.90)";
                    ctx.fillRect(scr.x - 165, scr.y - 22, 330, 22);
                    ctx.strokeStyle = "#4ade80";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 165, scr.y - 22, 330, 22);
                    ctx.fillStyle = "#4ade80";
                    ctx.fillText(
                        p.inVehicle ? "🐊 RAM ROGUE LEONIDA GATOR (+$1,500)" : "🐊 [E] WRANGLE ROGUE LEONIDA GATOR (+$2,500)",
                        scr.x,
                        scr.y - 7
                    );
                }
            }
        }
        if (Array.isArray(game.vehicles)) {
            for (const v of game.vehicles) {
                if (v.isArmoredCashTruck && (v.cashBagsLeft || 0) > 0 && Math.hypot(px - v.x, py - v.y) < 145) {
                    const scr = renderer.worldToScreen(v.x, v.y - 18, (v.z || 2.0) + 0.38);
                    const cashRem = v.cashBagsLeft * 2500;
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.92)";
                    ctx.fillRect(scr.x - 185, scr.y - 22, 370, 22);
                    ctx.strokeStyle = "#fde047";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 185, scr.y - 22, 370, 22);
                    ctx.fillStyle = "#fde047";
                    ctx.fillText(`💰 RAM, SHOOT OR [E] BREACH ARMORED VAN ($${cashRem.toLocaleString()})`, scr.x, scr.y - 7);
                }
            }
        }
        if (!p.inVehicle && Array.isArray(this.sodaMachines)) {
            for (const sm of this.sodaMachines) {
                if (Math.hypot(px - sm.x, py - sm.y) < 68) {
                    const scr = renderer.worldToScreen(sm.x, sm.y - 14, (sm.z || 2.0) + 0.34);
                    const col = sm.brand === "SPRUNK" ? "#4ade80" : "#f87171";
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.90)";
                    ctx.fillRect(scr.x - 155, scr.y - 22, 310, 22);
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 155, scr.y - 22, 310, 22);
                    ctx.fillStyle = col;
                    ctx.fillText(`🥤 [E] DRINK ICE-COLD ${sm.brand} (+35 HP & +$250)`, scr.x, scr.y - 7);
                }
            }
        }

        if (!this.heistTargets || this.heistTargets.length === 0) {
            ctx.restore();
            return;
        }

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

        // Paved Landmark Plazas & Boardwalk Compounds on GPS / Overview Map
        ctx.fillStyle = "#e6dcc5";
        const pavedStonePlazas = [
            [458, 471, 29, 40],   // SERA Cape Canaveral Spaceport Compound
            [457, 466, 132, 136], // Cape Leonida Lighthouse Plaza
            [197, 201, 475, 478]  // Key West Lighthouse Plaza
        ];
        for (const [x0, x1, y0, y1] of pavedStonePlazas) {
            ctx.fillRect(x0 * TILE_SIZE * sx, y0 * TILE_SIZE * sy, (x1 - x0 + 1) * TILE_SIZE * sx, (y1 - y0 + 1) * TILE_SIZE * sy);
        }
        // Vice Beach Pier Wooden Boardwalk (c = 455..467, r = 193..196)
        ctx.fillStyle = "#b88655";
        ctx.fillRect(455 * TILE_SIZE * sx, 193 * TILE_SIZE * sy, 13 * TILE_SIZE * sx, 4 * TILE_SIZE * sy);

        // Major 3D Landmarks on GPS / Overview Map
        const lm = this.landmarks3D || {};
        if (lm.launchpad) {
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect((lm.launchpad.x - 104) * sx, (lm.launchpad.y - 104) * sy, 208 * sx, 208 * sy);
            ctx.fillStyle = "#ea580c";
            ctx.fillRect((lm.launchpad.x - 24) * sx, (lm.launchpad.y - 24) * sy, 48 * sx, 48 * sy);
        }
        if (lm.atcTower) {
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect((lm.atcTower.x - 42) * sx, (lm.atcTower.y - 42) * sy, 84 * sx, 84 * sy);
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect((lm.atcTower.x - 20) * sx, (lm.atcTower.y - 20) * sy, 40 * sx, 40 * sy);
        }
        if (lm.waterTower) {
            ctx.fillStyle = "#ef4444";
            ctx.fillRect((lm.waterTower.x - 32) * sx, (lm.waterTower.y - 32) * sy, 64 * sx, 64 * sy);
        }
        if (lm.ferrisWheel) {
            ctx.fillStyle = "#ec4899";
            ctx.fillRect((lm.ferrisWheel.x - 36) * sx, (lm.ferrisWheel.y - 16) * sy, 72 * sx, 32 * sy);
        }
        if (lm.viceSign) {
            ctx.fillStyle = "#f472b6";
            ctx.fillRect((lm.viceSign.x - 72) * sx, (lm.viceSign.y - 18) * sy, 144 * sx, 36 * sy);
        }
        if (lm.kalagaLookout) {
            ctx.fillStyle = "#22c55e";
            ctx.fillRect((lm.kalagaLookout.x - 36) * sx, (lm.kalagaLookout.y - 36) * sy, 72 * sx, 72 * sy);
        }
        if (lm.alliedSugarSilos) {
            ctx.fillStyle = "#f97316";
            ctx.fillRect((lm.alliedSugarSilos.x - 64) * sx, (lm.alliedSugarSilos.y - 28) * sy, 128 * sx, 56 * sy);
        }
        if (lm.grassriversOutpost) {
            ctx.fillStyle = "#b88655";
            ctx.fillRect((lm.grassriversOutpost.x - 18) * sx, (lm.grassriversOutpost.y - 12) * sy, 36 * sx, 160 * sy);
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
