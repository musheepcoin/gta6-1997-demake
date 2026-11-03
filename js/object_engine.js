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
            // GTA 6 Deepsearch Geographical Landmarks (Thrillbilly Mud Club, Gellhorn Speedway, Wynwood Walls, Gator Island, Seven Mile Bridge):
            thrillbillyArena: { x: 82.0 * TILE_SIZE, y: 455.0 * TILE_SIZE, z: 2.0, cooldown: 0 },
            gellhornSpeedway: { x: 72.0 * TILE_SIZE, y: 178.0 * TILE_SIZE, z: 2.0, pitX: 72.0 * TILE_SIZE, pitY: 172.2 * TILE_SIZE },
            wynwoodWalls: { x: 189.5 * TILE_SIZE, y: 128.5 * TILE_SIZE, z: 2.0 },
            lakeLeonidaOutpost: { x: 125.5 * TILE_SIZE, y: 103.0 * TILE_SIZE, z: 2.0 },
            sevenMileOldSpan: { x: 202.0 * TILE_SIZE, y: 478.6 * TILE_SIZE, z: 2.0, jumpX: 202.0 * TILE_SIZE, jumpY: 480.5 * TILE_SIZE, cooldown: 0 },
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
        // (Placed on open PAWEMENT sidewalks, clear of lid=69 planters, palm trees & café parasols)
        this.sodaMachines = [
            { x: 443.35 * TILE_SIZE, y: 291.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 443.35 * TILE_SIZE, y: 254.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "SPRUNK", ad: "ad_sprunk" },
            { x: 443.35 * TILE_SIZE, y: 206.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 352.0 * TILE_SIZE,  y: 176.2 * TILE_SIZE, z: 2.0, ang: 0,             brand: "SPRUNK", ad: "ad_sprunk" },
            { x: 282.5 * TILE_SIZE,  y: 246.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 224.5 * TILE_SIZE,  y: 112.5 * TILE_SIZE, z: 2.0, ang: 0,             brand: "SPRUNK", ad: "ad_sprunk" },
            { x: 115.5 * TILE_SIZE,  y: 293.5 * TILE_SIZE, z: 2.0, ang: 0,             brand: "eCOLA",  ad: "ad_ecola"  },
            { x: 64.5 * TILE_SIZE,   y: 186.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, brand: "SPRUNK", ad: "ad_sprunk" }
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
        // 4. Wynwood Walls & Leonida Street-Art 3D Graffiti Tagging Challenge (6 Mural Monoliths)
        this.graffitiWalls = [
            { id: "tag_wynwood_main",  name: "WYNWOOD GALLERY MAIN WALL",     x: 189.5 * TILE_SIZE, y: 128.5 * TILE_SIZE, z: 2.0, ang: 0,             tagged: false, neon: [0.98, 0.24, 0.78], ad: "ad_vice26"     },
            { id: "tag_wynwood_east",  name: "WYNWOOD ARTS DISTRICT ALLEY",   x: 212.5 * TILE_SIZE, y: 132.5 * TILE_SIZE, z: 2.0, ang: 0,             tagged: false, neon: [0.18, 0.94, 0.98], ad: "ad_sprunk"     },
            { id: "tag_little_haiti",  name: "LITTLE HAITI CARIBBEAN MURAL",  x: 224.5 * TILE_SIZE, y: 110.5 * TILE_SIZE, z: 2.0, ang: 0,             tagged: false, neon: [0.98, 0.82, 0.16], ad: "ad_call_morgan"},
            { id: "tag_ocean_alley",   name: "OCEAN DRIVE ART DECO MURAL",    x: 442.5 * TILE_SIZE, y: 264.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, tagged: false, neon: [0.98, 0.30, 0.68], ad: "ad_vice26"     },
            { id: "tag_downtown_arts", name: "DOWNTOWN METROMOVER PLAZA WALL",x: 282.5 * TILE_SIZE, y: 228.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, tagged: false, neon: [0.24, 0.96, 0.48], ad: "ad_ecola"      },
            { id: "tag_gellhorn_yard", name: "PORT GELLHORN RAILYARD MURAL",  x: 64.5 * TILE_SIZE,  y: 198.5 * TILE_SIZE, z: 2.0, ang: Math.PI * 0.5, tagged: false, neon: [0.98, 0.52, 0.16], ad: "ad_ammunation" }
        ];
        // 5. Lake Leonida, Grassrivers & Leonida Keys 3D Floating Smuggler Contraband Airdrop Crates
        this.smugglerDrops = [
            { id: "drop_lake_nw",      name: "LAKE LEONIDA NORTHWEST DROP",   x: 112.5 * TILE_SIZE, y: 95.5 * TILE_SIZE,  z: 2.0, active: true, cooldown: 0, seed: 0.4 },
            { id: "drop_lake_ne",      name: "LAKE LEONIDA NORTHEAST DROP",   x: 138.5 * TILE_SIZE, y: 96.5 * TILE_SIZE,  z: 2.0, active: true, cooldown: 0, seed: 1.5 },
            { id: "drop_lake_south",   name: "GATOR ISLAND SOUTH COVE DROP",  x: 125.5 * TILE_SIZE, y: 116.5 * TILE_SIZE, z: 2.0, active: true, cooldown: 0, seed: 2.6 },
            { id: "drop_ambrosia_cov", name: "AMBROSIA SUGAR CANAL DROP",     x: 141.5 * TILE_SIZE, y: 110.5 * TILE_SIZE, z: 2.0, active: true, cooldown: 0, seed: 3.7 },
            { id: "drop_bayou_north",  name: "GRASSRIVERS BAYOU DROP",        x: 116.5 * TILE_SIZE, y: 405.5 * TILE_SIZE, z: 2.0, active: true, cooldown: 0, seed: 4.8 },
            { id: "drop_bayou_west",   name: "EVERGLADES MANGROVE DROP",      x: 96.5 * TILE_SIZE,  y: 425.5 * TILE_SIZE, z: 2.0, active: true, cooldown: 0, seed: 5.9 },
            { id: "drop_biscayne_bay", name: "BISCAYNE BAY SMUGGLER DROP",    x: 362.5 * TILE_SIZE, y: 235.5 * TILE_SIZE, z: 2.0, active: true, cooldown: 0, seed: 1.1 },
            { id: "drop_keys_channel", name: "SEVEN MILE CHANNEL DROP",       x: 202.0 * TILE_SIZE, y: 484.5 * TILE_SIZE, z: 2.0, active: true, cooldown: 0, seed: 2.2 }
        ];
        // 6. Port Gellhorn International Raceway 3D Hot-Lap Time Trial Circuit State
        this.speedwayRace = {
            active: false,
            timer: 0,
            bestTime: 38.5,
            checkpointIdx: 0,
            pitCooldown: 0,
            checkpoints: [
                { name: "EAST BANKING TURN 1", x: 95.0 * TILE_SIZE, y: 165.0 * TILE_SIZE },
                { name: "NORTH BACKSTRETCH",   x: 72.0 * TILE_SIZE, y: 152.0 * TILE_SIZE },
                { name: "WEST HAIRPIN TURN 3", x: 49.0 * TILE_SIZE, y: 165.0 * TILE_SIZE },
                { name: "START/FINISH GANTRY", x: 72.0 * TILE_SIZE, y: 178.0 * TILE_SIZE }
            ]
        };
        // 7. Vice City Mambas Stadium 3D Arena, Mount Kalaga Skunk Ape Cryptid, Muscle Beach & Street Takeovers
        this.mambasStadium = {
            x: 188.0 * TILE_SIZE,
            y: 172.0 * TILE_SIZE,
            z: 2.0,
            cooldown: 0,
            fireworkTimer: 0
        };
        this.skunkApe = {
            name: "MOUNT KALAGA SKUNK APE (BIGFOOT)",
            x: 132.8 * TILE_SIZE,
            y: 24.5 * TILE_SIZE,
            z: 2.0,
            ang: 0.4,
            active: true,
            cooldown: 0
        };
        this.takeoverCooldown = 0;
        this.gymCooldown = 0;
        this.tikiCooldown = 0;
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
            if (this.landmarks3D.thrillbillyArena) {
                clearZones.push({ x: this.landmarks3D.thrillbillyArena.x, y: this.landmarks3D.thrillbillyArena.y, r: 195 });
            }
            if (this.landmarks3D.gellhornSpeedway) {
                clearZones.push({ x: this.landmarks3D.gellhornSpeedway.x, y: this.landmarks3D.gellhornSpeedway.y, r: 165 });
                clearZones.push({ x: this.landmarks3D.gellhornSpeedway.pitX, y: this.landmarks3D.gellhornSpeedway.pitY, r: 95 });
            }
            if (this.landmarks3D.wynwoodWalls) {
                const ww = this.landmarks3D.wynwoodWalls;
                if (map.surfaceGround) {
                    const wc = Math.floor(ww.x / TILE_SIZE);
                    const wr = Math.floor(ww.y / TILE_SIZE);
                    for (let r = Math.max(2, wr - 2); r <= Math.min(MAP_ROWS - 3, wr + 2); r++) {
                        for (let c = Math.max(2, wc - 2); c <= Math.min(M - 3, wc + 2); c++) {
                            const idx = r * M + c;
                            if (map.surfaceGround[idx] === GROUND_TYPE.BUILDING && map.voxelGrid) {
                                for (let z = 0; z < MAP_LAYERS; z++) {
                                    map.voxelGrid[(z * MAP_ROWS + r) * M + c] =
                                        map.voxelGrid[(z * MAP_ROWS + 165) * M + 339];
                                }
                                map.surfaceGround[idx] = GROUND_TYPE.PAWEMENT;
                                map.surfaceLayer[idx] = 2;
                            }
                        }
                    }
                }
                clearZones.push({ x: ww.x, y: ww.y, r: 135 });
            }
            if (this.landmarks3D.lakeLeonidaOutpost) {
                clearZones.push({ x: this.landmarks3D.lakeLeonidaOutpost.x, y: this.landmarks3D.lakeLeonidaOutpost.y, r: 120 });
            }
            if (this.landmarks3D.sevenMileOldSpan) {
                clearZones.push({ x: this.landmarks3D.sevenMileOldSpan.x, y: this.landmarks3D.sevenMileOldSpan.y, r: 110 });
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
            if (Array.isArray(this.landmarks3D.gtaBillboards)) {
                for (const bb of this.landmarks3D.gtaBillboards) {
                    clearZones.push({ x: bb.x, y: bb.y, r: 58 });
                }
            }
            if (Array.isArray(this.landmarks3D.speedTraps)) {
                for (const st of this.landmarks3D.speedTraps) {
                    clearZones.push({ x: st.x, y: st.y, r: 52 });
                }
            }
        }
        if (Array.isArray(this.graffitiWalls) && map.surfaceGround) {
            for (const gw of this.graffitiWalls) {
                const c0 = Math.floor(gw.x / TILE_SIZE);
                const r0 = Math.floor(gw.y / TILE_SIZE);
                if (map.surfaceGround[r0 * M + c0] === GROUND_TYPE.ROAD) {
                    for (let rad = 1; rad <= 5; rad++) {
                        let found = false;
                        for (let dr = -rad; dr <= rad && !found; dr++) {
                            for (let dc = -rad; dc <= rad && !found; dc++) {
                                const nc = c0 + dc, nr = r0 + dr;
                                if (nc > 2 && nc < M - 3 && nr > 2 && nr < MAP_ROWS - 3) {
                                    const gt = map.surfaceGround[nr * M + nc];
                                    if (gt === GROUND_TYPE.PAWEMENT || gt === GROUND_TYPE.FIELD) {
                                        gw.x = (nc + 0.5) * TILE_SIZE;
                                        gw.y = (nr + 0.5) * TILE_SIZE;
                                        found = true;
                                    }
                                }
                            }
                        }
                        if (found) break;
                    }
                }
                clearZones.push({ x: gw.x, y: gw.y, r: 56 });
            }
        }
        if (Array.isArray(this.sodaMachines)) {
            for (const sm of this.sodaMachines) {
                clearZones.push({ x: sm.x, y: sm.y, r: 58 });
            }
        }
        for (const [px, py] of [
            [443.5 * TILE_SIZE, 285.5 * TILE_SIZE],
            [443.5 * TILE_SIZE, 284.5 * TILE_SIZE],
            [448.5 * TILE_SIZE, 293.5 * TILE_SIZE],
            [448.5 * TILE_SIZE, 292.5 * TILE_SIZE],
            [344.5 * TILE_SIZE, 171.5 * TILE_SIZE],
            [68.5 * TILE_SIZE, 187.5 * TILE_SIZE]
        ]) {
            clearZones.push({ x: px, y: py, r: 58 });
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

        // 0E. Wynwood Walls & Leonida Street-Art 3D Graffiti Tagging Challenge ([E] on foot!)
        if (Array.isArray(this.graffitiWalls)) {
            for (const gw of this.graffitiWalls) {
                if (!gw.tagged && Math.hypot(px - gw.x, py - gw.y) < 76) {
                    gw.tagged = true;
                    const taggedCount = this.graffitiWalls.filter(w => w.tagged).length;
                    const totalWalls = this.graffitiWalls.length;
                    const isAllTagged = taggedCount === totalWalls;
                    const reward = isAllTagged ? 28500 : 3500;
                    if (typeof game.addScore === "function") game.addScore(reward);
                    if (typeof game.addCash === "function") game.addCash(reward, `🎨 ${gw.name} TAGGED!`);
                    if (game.wantedSystem && (game.wantedSystem.level || 0) > 0) {
                        game.wantedSystem.level = Math.max(0, game.wantedSystem.level - 1);
                    }
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner(
                            isAllTagged ? "🎨 KING OF WYNWOOD! ALL 6 MURALS TAGGED!" : `🎨 VICE 26 PIECE PAINTED! (${taggedCount}/${totalWalls})`,
                            isAllTagged
                                ? `${gw.name} COMPLETED • +$28,500 GRAND BONUS & WANTED CLEARED!`
                                : `${gw.name} • +$3,500 STREET CRED & -1 WANTED STAR!`,
                            "#f472b6",
                            2.8
                        );
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: gw.x,
                            y: gw.y,
                            z: 2.68,
                            text: isAllTagged
                                ? "🎨 KING OF WYNWOOD! ALL 6 MURALS TAGGED! +$28,500!"
                                : `🎨 STREET-ART PIECE TAGGED (${taggedCount}/${totalWalls})! +$3,500 & -1 STAR!`,
                            color: "#f472b6",
                            life: 2.8
                        });
                    }
                    return true;
                }
            }
        }

        // 0F. Thrillbilly Mud Club Announcer Stand & Flaming Ring Derby Trigger ([E]!)
        if (this.landmarks3D && this.landmarks3D.thrillbillyArena) {
            const tb = this.landmarks3D.thrillbillyArena;
            if ((tb.cooldown || 0) <= 0 && (Math.hypot(px - tb.x, py - (tb.y - 126)) < 82 || Math.hypot(px - tb.x, py - tb.y) < 88)) {
                tb.cooldown = 18.0;
                if (typeof game.addScore === "function") game.addScore(10000);
                if (typeof game.addCash === "function") game.addCash(10000, "🔥 THRILLBILLY MUD-BOGGING DERBY!");
                if (typeof game.addMultiplier === "function") game.addMultiplier(1);
                if (game.audio) game.audio.playPickup("WEAPON");
                if (typeof game.showBigBanner === "function") {
                    game.showBigBanner("🔥 THRILLBILLY MUD CLUB CHAMPION!", "FLAMING RING MONSTER MUD DERBY • +$10,000 & +1 MULTIPLIER!", "#f97316", 3.0);
                }
                if (Array.isArray(game.floatingTexts)) {
                    game.floatingTexts.push({
                        x: tb.x,
                        y: tb.y,
                        z: 2.85,
                        text: "🔥 THRILLBILLY MUD-BOGGING CHAMPION! +$10,000 + +1X!",
                        color: "#f97316",
                        life: 3.0
                    });
                }
                return true;
            }
        }

        // 0G. Port Gellhorn International Raceway Pit Stop & Hot-Lap Time Trial Start ([E]!)
        if (this.landmarks3D && this.landmarks3D.gellhornSpeedway && this.speedwayRace) {
            const gs = this.landmarks3D.gellhornSpeedway;
            const sr = this.speedwayRace;
            if (Math.hypot(px - gs.pitX, py - gs.pitY) < 86 || Math.hypot(px - gs.x, py - gs.y) < 86) {
                game.player.hp = game.player.maxHp || 100;
                game.player.armor = Math.max(game.player.armor || 0, 100);
                if (!sr.active) {
                    sr.active = true;
                    sr.timer = 0;
                    sr.checkpointIdx = 0;
                }
                if (game.audio) game.audio.playPickup("WEAPON");
                if (typeof game.showBigBanner === "function") {
                    game.showBigBanner("🏁 GELLHORN HOT-LAP CIRCUIT STARTED!", "PIT CREW FULL TUNE-UP • HIT ALL 4 TRACK CHECKPOINTS FOR +$15,000!", "#facc15", 2.8);
                }
                if (Array.isArray(game.floatingTexts)) {
                    game.floatingTexts.push({
                        x: px,
                        y: py,
                        z: 2.68,
                        text: "🏁 GELLHORN SPEEDWAY HOT-LAP STARTED! FULL HP/ARMOR!",
                        color: "#facc15",
                        life: 2.8
                    });
                }
                return true;
            }
        }

        // 0H. Lake Leonida & Grassrivers Floating Smuggler Contraband Crate Pickup ([E]!)
        if (Array.isArray(this.smugglerDrops)) {
            for (const sd of this.smugglerDrops) {
                if (sd.active && Math.hypot(px - sd.x, py - sd.y) < 72) {
                    this.collectSmugglerDrop(game, sd);
                    return true;
                }
            }
        }

        // 0I. Muscle Beach 3D Outdoor Weightlifting Bench-Press Challenge ([E]!)
        if (this.map && Array.isArray(this.map.muscleBeachGyms) && (this.gymCooldown || 0) <= 0) {
            for (const mg of this.map.muscleBeachGyms) {
                if (Math.hypot(px - mg.x, py - mg.y) < 68) {
                    this.gymCooldown = 14.0;
                    game.player.maxHp = 150;
                    game.player.hp = 150;
                    if (typeof game.addScore === "function") game.addScore(2000);
                    if (typeof game.addCash === "function") game.addCash(2000, "💪 MUSCLE BEACH BENCH-PRESS RECORD!");
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("💪 MUSCLE BEACH IRON PUMPED!", "315 LBS BENCH-PRESS REP RECORD • MAX HP UPGRADED TO 150 & +$2,000!", "#4ade80", 2.8);
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: mg.x,
                            y: mg.y,
                            z: 2.65,
                            text: "💪 MUSCLE BEACH GAINS! 150 MAX HP + $2,000!",
                            color: "#4ade80",
                            life: 2.6
                        });
                    }
                    return true;
                }
            }
        }

        // 0J. Leonida Keys, Gator Island & Vice Beach 3D Thatched Tiki Bar Tropical Mojito ([E]!)
        if (this.map && Array.isArray(this.map.tikiBars) && (this.tikiCooldown || 0) <= 0) {
            for (const tb of this.map.tikiBars) {
                if (Math.hypot(px - tb.x, py - tb.y) < 68) {
                    this.tikiCooldown = 10.0;
                    const maxHp = game.player.maxHp || 100;
                    game.player.hp = maxHp;
                    game.player.armor = Math.min(100, (game.player.armor || 0) + 50);
                    if (typeof game.addScore === "function") game.addScore(1500);
                    if (typeof game.addCash === "function") game.addCash(1500, "🍹 KEYS TIKI MOJITO HAPPY HOUR!");
                    if (game.audio) game.audio.playPickup("SCORE");
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: tb.x,
                            y: tb.y,
                            z: 2.60,
                            text: "🍹 LEONIDA TIKI BAR MOJITO! FULL HP + +50 ARMOR & +$1,500!",
                            color: "#2dd4bf",
                            life: 2.6
                        });
                    }
                    return true;
                }
            }
        }

        // 0K. Vice City Mambas Stadium Field-Goal / Touchdown Show ([E]!)
        if (this.mambasStadium && (this.mambasStadium.cooldown || 0) <= 0) {
            const ms = this.mambasStadium;
            if (Math.hypot(px - ms.x, py - ms.y) < 135) {
                ms.cooldown = 18.0;
                ms.fireworkTimer = 8.0;
                if (typeof game.addScore === "function") game.addScore(10000);
                if (typeof game.addCash === "function") game.addCash(10000, "🏈 MAMBAS STADIUM TOUCHDOWN!");
                if (typeof game.addMultiplier === "function") game.addMultiplier(1);
                if (game.audio) game.audio.playPickup("WEAPON");
                if (typeof game.showBigBanner === "function") {
                    game.showBigBanner("🏈 VICE CITY MAMBAS TOUCHDOWN!", "HALFTIME PYROTECHNICS SHOW • +$10,000 & +1X MULTIPLIER!", "#facc15", 3.0);
                }
                if (Array.isArray(game.floatingTexts)) {
                    game.floatingTexts.push({
                        x: ms.x,
                        y: ms.y,
                        z: 2.85,
                        text: "🏈 MAMBAS STADIUM TOUCHDOWN! +$10,000 + FIREWORKS!",
                        color: "#facc15",
                        life: 3.0
                    });
                }
                return true;
            }
        }

        // 0L. Mount Kalaga National Park "Skunk Ape" (Florida Bigfoot) Cryptid Encounter ([E]!)
        if (this.skunkApe && this.skunkApe.active && Math.hypot(px - this.skunkApe.x, py - this.skunkApe.y) < 84) {
            this.skunkApe.active = false;
            this.skunkApe.cooldown = 50.0;
            if (typeof game.addScore === "function") game.addScore(25000);
            if (typeof game.addCash === "function") game.addCash(25000, "🦶 KALAGA SKUNK APE CRYPTID BOUNTY!");
            if (typeof game.addMultiplier === "function") game.addMultiplier(2);
            if (game.audio) game.audio.playPickup("WEAPON");
            if (typeof game.showBigBanner === "function") {
                game.showBigBanner("🦶 LEONIDA SKUNK APE DISCOVERED!", "MOUNT KALAGA BIGFOOT VIRAL EVIDENCE • +$25,000 & +2X MULTIPLIER!", "#f97316", 3.4);
            }
            if (Array.isArray(game.floatingTexts)) {
                game.floatingTexts.push({
                    x: this.skunkApe.x,
                    y: this.skunkApe.y,
                    z: 2.85,
                    text: "🦶 MOUNT KALAGA SKUNK APE FOUND! +$25,000 + +2X!",
                    color: "#f97316",
                    life: 3.4
                });
            }
            return true;
        }

        // 0M. GTA 6 Street Takeover / Sideshow Drift Ring Crowd Hype ([E]!)
        if (this.map && Array.isArray(this.map.streetTakeovers) && (this.takeoverCooldown || 0) <= 0) {
            for (const st of this.map.streetTakeovers) {
                if (Math.hypot(px - st.x, py - st.y) < 88) {
                    this.takeoverCooldown = 15.0;
                    if (typeof game.addScore === "function") game.addScore(8500);
                    if (typeof game.addCash === "function") game.addCash(8500, "🔥 LEONIDA STREET TAKEOVER KING!");
                    if (typeof game.addMultiplier === "function") game.addMultiplier(1);
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🔥 LEONIDA STREET TAKEOVER!", "SIDESHOW DRIFT PIT CHAMPION • +$8,500 & +1X MULTIPLIER!", "#ec4899", 2.8);
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: st.x,
                            y: st.y,
                            z: 2.75,
                            text: "🔥 STREET TAKEOVER SIDESHOW KING! +$8,500 + +1X!",
                            color: "#ec4899",
                            life: 2.8
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
        const pVeh = p ? (p.inVehicle || p.car || null) : null;
        const px = pVeh ? pVeh.x : (p ? p.x : 0);
        const py = pVeh ? pVeh.y : (p ? p.y : 0);
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
                const escapeBonus = (p.inVehicle && pVeh && pVeh.isEstateCar) ? 8000 : 5000;
                const bonusText = (p.inVehicle && pVeh && pVeh.isEstateCar)
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
            const pCar = pVeh;
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
            const pCar = pVeh;
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
            const pCar = pVeh;
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
        if (p && pVeh && game.input && game.input.handbrake) {
            const spd = Math.hypot(pVeh.vx || 0, pVeh.vy || 0);
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
                            x: pVeh.x,
                            y: pVeh.y,
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

        // 8. Update Thrillbilly Mud Club Flaming Hoop Vehicle Jump & Mud-Bogging Boost (c=82.0, r=455.0)
        if (this.landmarks3D && this.landmarks3D.thrillbillyArena) {
            const tb = this.landmarks3D.thrillbillyArena;
            if ((tb.cooldown || 0) > 0) tb.cooldown = Math.max(0, tb.cooldown - dt);
            if (pVeh && (tb.cooldown || 0) <= 0 && Math.hypot(pVeh.x - tb.x, pVeh.y - tb.y) < 58) {
                const spd = Math.hypot(pVeh.vx || 0, pVeh.vy || 0) || Math.abs(pVeh.speed || 0);
                if (spd > 65) {
                    tb.cooldown = 18.0;
                    pVeh.vx = (pVeh.vx || 0) * 1.32;
                    pVeh.vy = (pVeh.vy || 0) * 1.32;
                    pVeh.vz = Math.max(pVeh.vz || 0, 0.14);
                    if (typeof game.addScore === "function") game.addScore(10000);
                    if (typeof game.addCash === "function") game.addCash(10000, "🔥 THRILLBILLY FLAMING HOOP JUMP!");
                    if (typeof game.addMultiplier === "function") game.addMultiplier(1);
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🔥 THRILLBILLY FLAMING HOOP STUNT!", "GRASSRIVERS MONSTER MUD JUMP • +$10,000 + NITRO & +1X!", "#f97316", 3.0);
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: tb.x,
                            y: tb.y,
                            z: 2.85,
                            text: "🔥 FLAMING RING MONSTER STUNT! +$10,000 + NITRO!",
                            color: "#f97316",
                            life: 3.0
                        });
                    }
                }
            }
        }

        // 9. Update Port Gellhorn International Raceway Start/Finish Gantry, Pit Repair & Hot-Lap Time Trial (c=72.0, r=178.0)
        if (this.landmarks3D && this.landmarks3D.gellhornSpeedway && this.speedwayRace) {
            const gs = this.landmarks3D.gellhornSpeedway;
            const sr = this.speedwayRace;
            if ((sr.pitCooldown || 0) > 0) sr.pitCooldown = Math.max(0, sr.pitCooldown - dt);

            // Driving through Start/Finish Gantry or Pit Lane repairs vehicle & starts Hot-Lap Circuit if not active
            if (pVeh && !sr.active && (sr.pitCooldown || 0) <= 0 &&
                (Math.hypot(pVeh.x - gs.x, pVeh.y - gs.y) < 76 || Math.hypot(pVeh.x - gs.pitX, pVeh.y - gs.pitY) < 76)) {
                const spd = Math.hypot(pVeh.vx || 0, pVeh.vy || 0) || Math.abs(pVeh.speed || 0);
                if (spd > 45) {
                    sr.active = true;
                    sr.timer = 0;
                    sr.checkpointIdx = 0;
                    sr.pitCooldown = 8.0;
                    pVeh.hp = pVeh.maxHp || 100;
                    pVeh.vx = (pVeh.vx || 0) * 1.24;
                    pVeh.vy = (pVeh.vy || 0) * 1.24;
                    if (game.audio) game.audio.playPickup("SCORE");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🏁 GELLHORN HOT-LAP CIRCUIT!", "CAR 100% REPAIRED • HIT ALL 4 OVAL CHECKPOINTS FOR +$15,000!", "#facc15", 2.6);
                    }
                }
            }

            if (sr.active) {
                sr.timer += dt;
                const cp = sr.checkpoints[sr.checkpointIdx];
                if (cp && Math.hypot(px - cp.x, py - cp.y) < 120) {
                    sr.checkpointIdx++;
                    if (sr.checkpointIdx >= sr.checkpoints.length) {
                        const lapTime = sr.timer;
                        sr.active = false;
                        sr.pitCooldown = 10.0;
                        const isRecord = lapTime < (sr.bestTime || 40.0);
                        if (isRecord) sr.bestTime = lapTime;
                        const prize = isRecord ? 20000 : 15000;
                        if (typeof game.addScore === "function") game.addScore(prize);
                        if (typeof game.addCash === "function") game.addCash(prize, `🏆 SPEEDWAY LAP: ${lapTime.toFixed(1)}s!`);
                        if (typeof game.addMultiplier === "function") game.addMultiplier(2);
                        if (game.audio) game.audio.playPickup("WEAPON");
                        if (typeof game.showBigBanner === "function") {
                            game.showBigBanner(
                                `🏆 HOT-LAP COMPLETE: ${lapTime.toFixed(1)}s!`,
                                `PORT GELLHORN RACEWAY CHAMPION • +$${prize.toLocaleString()} & +2 MULTIPLIER!`,
                                "#4ade80",
                                3.4
                            );
                        }
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: px,
                                y: py,
                                z: 2.80,
                                text: `🏆 GELLHORN HOT-LAP (${lapTime.toFixed(1)}s)! +$${prize.toLocaleString()} + +2X!`,
                                color: "#4ade80",
                                life: 3.2
                            });
                        }
                    } else {
                        if (typeof game.addScore === "function") game.addScore(2000);
                        if (typeof game.addCash === "function") game.addCash(2000, `🏁 CHECKPOINT ${sr.checkpointIdx}/4!`);
                        if (game.audio) game.audio.playPickup("SCORE");
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: cp.x,
                                y: cp.y,
                                z: 2.65,
                                text: `🏁 SPLIT ${sr.checkpointIdx}/4 (${sr.timer.toFixed(1)}s) • +$2,000!`,
                                color: "#facc15",
                                life: 2.0
                            });
                        }
                    }
                } else if (sr.timer > 75.0) {
                    sr.active = false;
                }
            }
        }

        // 10. Update Lake Leonida, Grassrivers & Keys Floating Smuggler Contraband Airdrop Crates
        if (Array.isArray(this.smugglerDrops)) {
            for (const sd of this.smugglerDrops) {
                if (!sd.active) {
                    sd.cooldown = Math.max(0, (sd.cooldown || 0) - dt);
                    if (sd.cooldown <= 0 && Math.hypot(px - sd.x, py - sd.y) > 420) {
                        sd.active = true;
                    }
                    continue;
                }
                if (p && Math.hypot(px - sd.x, py - sd.y) < 52) {
                    this.collectSmugglerDrop(game, sd);
                }
            }
        }

        // 11. Update Leonida Keys Old Seven Mile Bridge Broken Span Overwater Jump Bonus (c=202.0, r=478.6)
        if (this.landmarks3D && this.landmarks3D.sevenMileOldSpan) {
            const sm = this.landmarks3D.sevenMileOldSpan;
            if ((sm.cooldown || 0) > 0) sm.cooldown = Math.max(0, sm.cooldown - dt);
            if (pVeh && (sm.cooldown || 0) <= 0 &&
                (Math.hypot(pVeh.x - sm.x, pVeh.y - sm.y) < 64 || Math.hypot(pVeh.x - sm.jumpX, pVeh.y - sm.jumpY) < 62)) {
                const spd = Math.hypot(pVeh.vx || 0, pVeh.vy || 0) || Math.abs(pVeh.speed || 0);
                if (spd > 125) {
                    sm.cooldown = 20.0;
                    pVeh.vz = Math.max(pVeh.vz || 0, 0.13);
                    if (typeof game.addScore === "function") game.addScore(7500);
                    if (typeof game.addCash === "function") game.addCash(7500, "🌴 SEVEN MILE BRIDGE OVERWATER JUMP!");
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🌴 SEVEN MILE BRIDGE STUNT!", "LEONIDA KEYS OVERWATER GAP CLEARED • +$7,500!", "#2dd4bf", 2.8);
                    }
                    if (Array.isArray(game.floatingTexts)) {
                        game.floatingTexts.push({
                            x: pVeh.x,
                            y: pVeh.y,
                            z: 2.75,
                            text: "🌴 SEVEN MILE BRIDGE OVERWATER STUNT! +$7,500!",
                            color: "#2dd4bf",
                            life: 2.8
                        });
                    }
                }
            }
        }

        // 12. Update Muscle Beach, Tiki Bars, Mambas Stadium, Mount Kalaga Skunk Ape & Street Takeover Drift Rings
        if ((this.gymCooldown || 0) > 0) this.gymCooldown = Math.max(0, this.gymCooldown - dt);
        if ((this.tikiCooldown || 0) > 0) this.tikiCooldown = Math.max(0, this.tikiCooldown - dt);
        if ((this.takeoverCooldown || 0) > 0) this.takeoverCooldown = Math.max(0, this.takeoverCooldown - dt);
        if (this.mambasStadium) {
            const ms = this.mambasStadium;
            if ((ms.cooldown || 0) > 0) ms.cooldown = Math.max(0, ms.cooldown - dt);
            if ((ms.fireworkTimer || 0) > 0) ms.fireworkTimer = Math.max(0, ms.fireworkTimer - dt);
            if (pVeh && (ms.cooldown || 0) <= 0 &&
                (Math.hypot(pVeh.x - ms.x, pVeh.y - (ms.y - 96)) < 54 || Math.hypot(pVeh.x - ms.x, pVeh.y - (ms.y + 96)) < 54)) {
                const spd = Math.hypot(pVeh.vx || 0, pVeh.vy || 0) || Math.abs(pVeh.speed || 0);
                if (spd > 65) {
                    ms.cooldown = 18.0;
                    ms.fireworkTimer = 8.0;
                    pVeh.vz = Math.max(pVeh.vz || 0, 0.14);
                    if (typeof game.addScore === "function") game.addScore(10000);
                    if (typeof game.addCash === "function") game.addCash(10000, "🏈 MAMBAS STADIUM FIELD-GOAL JUMP!");
                    if (typeof game.addMultiplier === "function") game.addMultiplier(1);
                    if (game.audio) game.audio.playPickup("WEAPON");
                    if (typeof game.showBigBanner === "function") {
                        game.showBigBanner("🏈 IT'S GOOD! MAMBAS FIELD-GOAL STUNT!", "HALFTIME PYROTECHNICS SHOW • +$10,000 & +1X MULTIPLIER!", "#facc15", 3.0);
                    }
                }
            }
        }
        if (this.skunkApe) {
            const sa = this.skunkApe;
            if (!sa.active) {
                sa.cooldown = Math.max(0, (sa.cooldown || 0) - dt);
                if (sa.cooldown <= 0 && Math.hypot(px - sa.x, py - sa.y) > 450) {
                    sa.active = true;
                }
            } else {
                const dP = Math.hypot(px - sa.x, py - sa.y);
                if (dP < 180 && dP > 12) {
                    sa.ang = Math.atan2(py - sa.y, px - sa.x);
                }
            }
        }
        if (pVeh && this.map && Array.isArray(this.map.streetTakeovers) && (this.takeoverCooldown || 0) <= 0) {
            const spd = Math.hypot(pVeh.vx || 0, pVeh.vy || 0) || Math.abs(pVeh.speed || 0);
            if (spd > 85) {
                for (const st of this.map.streetTakeovers) {
                    if (Math.hypot(pVeh.x - st.x, pVeh.y - st.y) < 92) {
                        this.takeoverCooldown = 16.0;
                        pVeh.vx = (pVeh.vx || 0) * 1.25;
                        pVeh.vy = (pVeh.vy || 0) * 1.25;
                        if (typeof game.addScore === "function") game.addScore(8500);
                        if (typeof game.addCash === "function") game.addCash(8500, "🔥 LEONIDA SIDESHOW DRIFT KING!");
                        if (typeof game.addMultiplier === "function") game.addMultiplier(1);
                        if (game.audio) game.audio.playPickup("WEAPON");
                        if (typeof game.showBigBanner === "function") {
                            game.showBigBanner("🔥 LEONIDA STREET TAKEOVER KING!", "SIDESHOW DONUT RING BONUS • +$8,500 + NITRO & +1X!", "#ec4899", 2.8);
                        }
                        if (Array.isArray(game.floatingTexts)) {
                            game.floatingTexts.push({
                                x: st.x,
                                y: st.y,
                                z: 2.75,
                                text: "🔥 SIDESHOW DRIFT TAKEOVER! +$8,500 + NITRO!",
                                color: "#ec4899",
                                life: 2.8
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    collectSmugglerDrop(game, sd) {
        if (!sd || !sd.active) return;
        sd.active = false;
        sd.cooldown = 55.0;
        if (game.player) {
            game.player.armor = Math.min(100, (game.player.armor || 0) + 50);
            game.player.hp = Math.min(game.player.maxHp || 100, (game.player.hp || 100) + 40);
            if (game.player.ammo) {
                game.player.ammo.UZI = (game.player.ammo.UZI || 0) + 90;
                game.player.ammo.SHOTGUN = (game.player.ammo.SHOTGUN || 0) + 25;
                game.player.ammo.ROCKET = (game.player.ammo.ROCKET || 0) + 5;
            }
        }
        if (typeof game.addScore === "function") game.addScore(5000);
        if (typeof game.addCash === "function") game.addCash(5000, `📦 ${sd.name}!`);
        if (game.audio) game.audio.playPickup("WEAPON");
        if (typeof game.showBigBanner === "function") {
            game.showBigBanner("📦 SMUGGLER CONTRABAND CRATE!", `${sd.name} • +$5,000 + HEAVY AMMO & +50 ARMOR!`, "#38bdf8", 2.6);
        }
        if (Array.isArray(game.floatingTexts)) {
            game.floatingTexts.push({
                x: sd.x,
                y: sd.y,
                z: 2.65,
                text: "📦 SMUGGLER AIRDROP RECOVERED! +$5,000 + HEAVY AMMO & ARMOR!",
                color: "#38bdf8",
                life: 2.8
            });
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
                // Never place sidewalk booths or street furniture on lid 69 tree planter tiles
                const blk1 = map.getBlockInfo ? map.getBlockInfo(c, r, 1) : null;
                if (blk1 && blk1.lid === 69) continue;

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

                // Ensure not blocking any interior door, tree/palm canopy, café parasol, soda machine, or mission payphone
                if (Array.isArray(map.interiors) && map.interiors.some(it => Math.hypot(it.doorX - px, it.doorY - py) < 52)) {
                    continue;
                }
                if (Array.isArray(map.vicePalms) && map.vicePalms.some(pm => Math.hypot(pm.x - px, pm.y - py) < 56)) {
                    continue;
                }
                if (Array.isArray(map.trees) && map.trees.some(tr => Math.hypot(tr.x - px, tr.y - py) < 56)) {
                    continue;
                }
                if (Array.isArray(map.viceStreetDetails) && map.viceStreetDetails.some(vd => Math.hypot(vd.x - px, vd.y - py) < 44)) {
                    continue;
                }
                if (Array.isArray(this.sodaMachines) && this.sodaMachines.some(sm => Math.hypot(sm.x - px, sm.y - py) < 56)) {
                    continue;
                }
                if (
                    Math.hypot(443.5 * TILE_SIZE - px, 285.5 * TILE_SIZE - py) < 56 ||
                    Math.hypot(448.5 * TILE_SIZE - px, 293.5 * TILE_SIZE - py) < 56 ||
                    Math.hypot(344.5 * TILE_SIZE - px, 171.5 * TILE_SIZE - py) < 56 ||
                    Math.hypot(68.5 * TILE_SIZE - px, 187.5 * TILE_SIZE - py) < 56
                ) {
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

        // Rebuild map.floraGrid after all WorldObjectEngine flora & booth clearance passes
        if (Array.isArray(map.vicePalms)) {
            map.floraGrid = new Map();
            for (let pi = 0; pi < map.vicePalms.length; pi++) {
                const pm = map.vicePalms[pi];
                const fbx = Math.floor(pm.x / TILE_SIZE);
                const fby = Math.floor(pm.y / TILE_SIZE);
                const fkey = (fby << 16) | (fbx & 0xffff);
                let cell = map.floraGrid.get(fkey);
                if (!cell) {
                    cell = [];
                    map.floraGrid.set(fkey, cell);
                }
                cell.push(pm);
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

        const g = this.map && this.map.surfaceGround ? this.map.surfaceGround : null;
        const M = MAP_COLS;
        const isDryLotPoint = (wx, wy, roadPad = 24) => {
            if (!g) return true;
            const checks = [
                [0, 0],
                [-roadPad, 0], [roadPad, 0],
                [0, -roadPad], [0, roadPad],
                [-roadPad * 0.7, -roadPad * 0.7], [roadPad * 0.7, -roadPad * 0.7],
                [-roadPad * 0.7, roadPad * 0.7],  [roadPad * 0.7, roadPad * 0.7]
            ];
            for (let k = 0; k < checks.length; k++) {
                const tc = Math.floor((wx + checks[k][0]) / TILE_SIZE);
                const tr = Math.floor((wy + checks[k][1]) / TILE_SIZE);
                if (tc < 2 || tc >= M - 2 || tr < 2 || tr >= MAP_ROWS - 2) return false;
                const gt = g[tr * M + tc];
                if (gt !== GROUND_TYPE.FIELD && gt !== GROUND_TYPE.PAWEMENT) return false;
            }
            return true;
        };

        for (let i = 0; i < this.instances.length; i++) {
            const inst = this.instances[i];
            if (!inst.drivewayCars || inst.drivewayCars.length === 0) continue;
            const spec = inst.spec;
            const sc = inst.scale || 1.0;
            const cosA = Math.cos(inst.ang);
            const sinA = Math.sin(inst.ang);
            const bz = (this.map && typeof this.map.getHeightAtPixel === "function")
                ? this.map.getHeightAtPixel(inst.x, inst.y, 4.0)
                : (inst.z || 2.0);

            // True 3D architectural footprint including roof overhangs, front porches, portico columns & stilt stairs
            const halfW = (spec.w1 * 0.5 + Math.max(spec.roofOverhang || 10, spec.deckPad || 0)) * sc;
            const backD = (spec.d1 * 0.5 + Math.max(spec.roofOverhang || 10, spec.deckPad || 0)) * sc;
            const frontExtra = spec.hasPortico ? (spec.porticoD || 26) * 1.08
                             : spec.hasFrontPorch ? (spec.porchD || 26) * 1.08
                             : spec.hasStiltDeck ? 42
                             : (spec.roofOverhang || 10);
            const frontD = (spec.d1 * 0.5 + frontExtra) * sc;
            const minWallGap = 38; // Mandatory 38px open breathing room between house/porch edge and car body

            for (let ci = 0; ci < inst.drivewayCars.length; ci++) {
                const dc = inst.drivewayCars[ci];
                const baseAng = dc.ang !== undefined ? dc.ang : 0;
                const sideSign = (dc.dx || 0) >= 0 ? 1 : -1;

                // Candidate local placements: requested spot first, then side driveways & deep front courtyard
                const candidates = [
                    { lx: dc.dx || 0, ly: dc.dy || (frontD + 56), relAng: baseAng },
                    { lx: sideSign * (halfW + 56), ly: 44, relAng: Math.PI * 0.5 },
                    { lx: -sideSign * (halfW + 56), ly: 44, relAng: Math.PI * 0.5 },
                    { lx: (dc.dx || -60), ly: frontD + 56, relAng: 0 },
                    { lx: sideSign * (halfW + 64), ly: 18, relAng: Math.PI * 0.5 },
                    { lx: -sideSign * (halfW + 64), ly: 18, relAng: Math.PI * 0.5 },
                    { lx: -(dc.dx || -60), ly: frontD + 58, relAng: 0 }
                ];

                let chosen = null;
                for (let k = 0; k < candidates.length; k++) {
                    let { lx, ly, relAng } = candidates[k];
                    const carHalfX = Math.abs(Math.cos(relAng)) * 30 + Math.abs(Math.sin(relAng)) * 16;
                    const carHalfY = Math.abs(Math.sin(relAng)) * 30 + Math.abs(Math.cos(relAng)) * 16;
                    const safeX = halfW + carHalfX + minWallGap;
                    const safeFrontY = frontD + carHalfY + minWallGap;
                    const safeBackY = backD + carHalfY + minWallGap;

                    // Enforce strict minimum clearance from house walls, porch, portico columns & roof overhang
                    if (Math.abs(lx) < safeX && ly > -safeBackY && ly < safeFrontY) {
                        if (Math.abs(lx) > halfW * 0.85) {
                            lx = (lx >= 0 ? 1 : -1) * safeX;
                        } else {
                            ly = safeFrontY;
                        }
                    }

                    // Ensure clear of backyard pool deck if present
                    if (inst.pool) {
                        const pSc = inst.pool.scale || 0.90;
                        if (Math.abs(lx - inst.pool.dx) < 80 * pSc + carHalfX + 20 &&
                            Math.abs(ly - inst.pool.dy) < 50 * pSc + carHalfY + 20) {
                            continue;
                        }
                    }

                    const vx = inst.x + cosA * lx - sinA * ly;
                    const vy = inst.y + sinA * lx + cosA * ly;
                    const vang = inst.ang + relAng;

                    if (!isDryLotPoint(vx, vy, 26)) continue;
                    if (this.map && typeof this.map.isInsideLivingEventZone === "function" && this.map.isInsideLivingEventZone(vx, vy, 26)) continue;
                    if (game.vehicles.some(v => Math.hypot(v.x - vx, v.y - vy) < 46)) continue;

                    chosen = { vx, vy, vang };
                    break;
                }

                if (!chosen) continue;

                // Clear any random decorative bush/tree/palm overlapping the parked driveway car
                if (this.map && Array.isArray(this.map.trees)) {
                    this.map.trees = this.map.trees.filter(t => Math.hypot(t.x - chosen.vx, t.y - chosen.vy) > 42);
                }
                if (this.map && Array.isArray(this.map.vicePalms)) {
                    this.map.vicePalms = this.map.vicePalms.filter(p => Math.hypot(p.x - chosen.vx, p.y - chosen.vy) > 42);
                }
                if (this.map && this.map.floraGrid && typeof this.map.floraGrid.get === "function") {
                    const fcx = Math.floor(chosen.vx / TILE_SIZE);
                    const fcy = Math.floor(chosen.vy / TILE_SIZE);
                    for (let fdy = -1; fdy <= 1; fdy++) {
                        for (let fdx = -1; fdx <= 1; fdx++) {
                            const fkey = ((fcy + fdy) << 16) | ((fcx + fdx) & 0xffff);
                            const cell = this.map.floraGrid.get(fkey);
                            if (Array.isArray(cell)) {
                                this.map.floraGrid.set(fkey, cell.filter(pm => Math.hypot(pm.x - chosen.vx, pm.y - chosen.vy) > 42));
                            }
                        }
                    }
                }

                const specKey = dc.spec || sprToSpec[dc.sprIdx] || "STINGER_CABRIO";
                if (typeof Vehicle === "function") {
                    const v = new Vehicle(`estate_${inst.id}_car_${ci}`, specKey, chosen.vx, chosen.vy, chosen.vang);
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
        const pCar = player ? (player.inVehicle || player.car || null) : null;

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

        // 15. GTA 6 THRILLBILLY MUD CLUB & FLAMING RING MONSTER STUNT ARENA (Grassrivers / Redhill, c=82.0, r=455.0)
        if (this.landmarks3D && this.landmarks3D.thrillbillyArena) {
            const tb = this.landmarks3D.thrillbillyArena;
            const bz = tb.z || 2.0;
            const [tu0, tv0, tu1, tv1] = getTileAtlasUV(363, 0.0, 0.0, 1.0, 1.0);

            // A. North Rustic Timber & Open-Lattice Steel Entrance Archway + Announcer Stand (offY = -126)
            emitAOShadow3D(tb.x, tb.y, 1, 0, 0, -126, 148, 42, bz, 0.38);
            for (const px of [-54, 54]) {
                emitTileBox3D(tb.x, tb.y, 1, 0, px, -126, 16, 16, bz, bz + 0.18, 177, 177, 77, [0.76, 0.58, 0.38], false);
                emitTileBox3D(tb.x, tb.y, 1, 0, px, -126, 12, 12, bz + 0.18, bz + 1.12, 363, 246, 77, [0.84, 0.46, 0.24], false);
            }
            emitTileBox3D(tb.x, tb.y, 1, 0, 0, -126, 128, 16, bz + 0.96, bz + 1.14, 250, 363, 77, [0.82, 0.62, 0.38], false);
            emitBox3D(tb.x, tb.y, 1, 0, -28, -126, 52, 10, bz + 1.14, bz + 1.44, "ad_patriot_beer", "ad_patriot_beer", [0.96, 0.28, 0.32]);
            emitBox3D(tb.x, tb.y, 1, 0,  28, -126, 52, 10, bz + 1.14, bz + 1.44, "ad_pisswasser", "ad_pisswasser", [0.98, 0.82, 0.18]);
            // Announcer Podium & Derby Trigger Console at (0, -126)
            emitTileBox3D(tb.x, tb.y, 1, 0, 0, -126, 22, 16, bz, bz + 0.26, 172, 173, 77, [0.92, 0.78, 0.54], false);
            emitCylinder3D(tb.x, tb.y, 0, -126, 5.0, 5.0, bz + 0.26, bz + 0.34, 10, [0.98, 0.44, 0.14], 5, true);

            // B. South 3-Tier Stepped Wooden Spectator Bleachers (offY = +132, L77 boardwalk planks)
            emitAOShadow3D(tb.x, tb.y, 1, 0, 0, 134, 168, 52, bz, 0.40);
            emitTileBox3D(tb.x, tb.y, 1, 0, 0, 122, 152, 14, bz, bz + 0.14, 177, 177, 77, [0.82, 0.64, 0.42], false);
            emitTileBox3D(tb.x, tb.y, 1, 0, 0, 134, 152, 14, bz, bz + 0.28, 177, 177, 77, [0.76, 0.58, 0.38], false);
            emitTileBox3D(tb.x, tb.y, 1, 0, 0, 146, 152, 14, bz, bz + 0.42, 177, 177, 77, [0.70, 0.52, 0.34], false);

            // C. Twin Opposing 3D Sloped Monster Mud Launch Ramps (at offX = -78 launching East, offX = +78 launching West)
            for (const dir of [-1, 1]) {
                const rx = tb.x + dir * 78;
                const ry = tb.y;
                const cA = -dir; // -1 -> launches East (+1), +1 -> launches West (-1)
                const hw = 26.0, hd = 16.0;
                const yLow = bz + 0.015, yMid = bz + 0.18, yHigh = bz + 0.30;
                const bNW = toWorld(rx, ry, cA, 0, -hw, -hd, yLow);
                const bSW = toWorld(rx, ry, cA, 0, -hw,  hd, yLow);
                const mNW = toWorld(rx, ry, cA, 0, hw * 0.25, -hd, yMid);
                const mSW = toWorld(rx, ry, cA, 0, hw * 0.25,  hd, yMid);
                const tNE = toWorld(rx, ry, cA, 0,  hw, -hd, yHigh);
                const tSE = toWorld(rx, ry, cA, 0,  hw,  hd, yHigh);
                const bNE = toWorld(rx, ry, cA, 0,  hw, -hd, bz);
                const bSE = toWorld(rx, ry, cA, 0,  hw,  hd, bz);
                pushTileQuad3D(bNW, mNW, bSW, mSW, 390 + 77, 0.86, 0.68, 0.46, 1.0);
                pushMatQuad3D(mNW, tNE, mSW, tSE, 3, 1.00, 0.82, 0.16, 1.0);
                pushTri3D(bNW, tNE, bNE, [tu0, tv1], [tu1, tv0], [tu1, tv1], 0.88, 0.72, 0.50, 1.0);
                pushTri3D(bSW, bSE, tSE, [tu0, tv1], [tu1, tv1], [tu1, tv0], 0.88, 0.72, 0.50, 1.0);
                pushMatQuad3D(tSE, tNE, bSE, bNE, 3, 0.92, 0.74, 0.14, 1.0);
            }

            // D. Centerpiece Elevated 3D Flaming Hoop Steel Scaffold (at offX = 0, offY = -36 & +36 so cars drive right through!)
            for (const py of [-36, 36]) {
                emitTileBox3D(tb.x, tb.y, 1, 0, 0, py, 10, 10, bz, bz + 0.96, 246, 363, 64, [0.90, 0.34, 0.24], false);
            }
            emitTileBox3D(tb.x, tb.y, 1, 0, 0, 0, 12, 82, bz + 0.88, bz + 1.00, 250, 363, 64, [0.96, 0.48, 0.16], false);
        }

        // 16. PORT GELLHORN INTERNATIONAL RACEWAY 3D START/FINISH GANTRY, GRANDSTAND & PIT GARAGE (c=72.0, r=178.0)
        if (this.landmarks3D && this.landmarks3D.gellhornSpeedway) {
            const gs = this.landmarks3D.gellhornSpeedway;
            const bz = gs.z || 2.0;

            // A. Twin Open-Lattice Steel Race Gantry Pylons on North & South Track Shoulders (offY = -148 & +148)
            for (const sy of [-148, 148]) {
                emitAOShadow3D(gs.x, gs.y, 1, 0, 0, sy, 28, 28, bz, 0.38);
                emitTileBox3D(gs.x, gs.y, 1, 0, 0, sy, 18, 18, bz, bz + 0.18, 177, 177, 71, [0.92, 0.94, 0.98], false);
                emitSolidBox3D(gs.x, gs.y, 1, 0, 0, sy, 16, 16, bz + 0.18, bz + 0.28, [0.98, 0.82, 0.16], 3);
                emitTileBox3D(gs.x, gs.y, 1, 0, 0, sy, 12, 12, bz + 0.28, bz + 1.28, 363, 246, 64, [0.94, 0.96, 0.99], false);
            }
            // High Overhead Start/Finish Steel Truss Bridge (bz+1.14..1.28 — 100% clear for cars underneath!)
            emitTileBox3D(gs.x, gs.y, 1, 0, 0, 0, 18, 312, bz + 1.14, bz + 1.28, 250, 363, 64, [0.94, 0.96, 0.99], false);
            emitBox3D(gs.x, gs.y, 0, 1, -68, 0, 88, 10, bz + 1.28, bz + 1.58, "ad_vice26", "ad_vice26", [0.98, 0.30, 0.72]);
            emitBox3D(gs.x, gs.y, 0, 1,  68, 0, 88, 10, bz + 1.28, bz + 1.58, "ad_sprunk", "ad_sprunk", [0.22, 0.96, 0.42]);

            // B. Pit Crew Repair Garage & Tool Bay in Infield (at gs.pitX, gs.pitY)
            emitAOShadow3D(gs.pitX, gs.pitY, 1, 0, 0, 0, 112, 62, bz, 0.42);
            emitTileBox3D(gs.pitX, gs.pitY, 1, 0, 0, 0, 96, 46, bz, bz + 0.46, 86, 199, 86, [0.94, 0.96, 1.00], false);
            emitSolidBox3D(gs.pitX, gs.pitY, 1, 0, 0, 0, 102, 50, bz + 0.46, bz + 0.54, [0.92, 0.24, 0.20], 5);
            emitBox3D(gs.pitX, gs.pitY, 1, 0, 0, 0, 74, 10, bz + 0.54, bz + 0.80, "ad_pisswasser", "ad_pisswasser", [0.98, 0.82, 0.18]);
        }

        // 17. WYNWOOD WALLS 3D OPEN-AIR GRAFFITI GALLERY & 6 LEONIDA STREET-ART MURAL MONOLITHS
        if (this.landmarks3D && this.landmarks3D.wynwoodWalls) {
            const ww = this.landmarks3D.wynwoodWalls;
            const bz = ww.z || 2.0;
            emitAOShadow3D(ww.x, ww.y, 1, 0, 0, 0, 136, 96, bz, 0.38);
            emitOctagonPad3D(ww.x, ww.y, 0, 0, 56, 42, 52, 38, 0.24, bz, bz + 0.08, [0.92, 0.90, 0.88], [0.84, 0.82, 0.80], 2, 177, 8);
            // Twin Overhead S363 Neon Festival Light Columns & Spanning S250 Arch
            for (const wx of [-46, 46]) {
                emitTileBox3D(ww.x, ww.y, 1, 0, wx, -18, 10, 10, bz + 0.08, bz + 1.06, 363, 363, 64, [0.96, 0.32, 0.76], false);
            }
            emitTileBox3D(ww.x, ww.y, 1, 0, 0, -18, 104, 12, bz + 0.96, bz + 1.08, 250, 363, 64, [0.20, 0.92, 0.98], false);
        }
        if (Array.isArray(this.graffitiWalls)) {
            for (const gw of this.graffitiWalls) {
                const bz = gw.z || 2.0;
                const gCos = Math.cos(gw.ang || 0);
                const gSin = Math.sin(gw.ang || 0);
                const nc = gw.neon || [0.98, 0.24, 0.78];
                emitAOShadow3D(gw.x, gw.y, gCos, gSin, 0, 0, 68, 24, bz, 0.36);
                // Brutalist Concrete Mural Plinth & Wall Monolith (S177 + S86)
                emitTileBox3D(gw.x, gw.y, gCos, gSin, 0, 0, 58, 14, bz, bz + 0.08, 177, 177, 71, [0.88, 0.90, 0.94], false);
                emitTileBox3D(gw.x, gw.y, gCos, gSin, 0, 0, 54, 10, bz + 0.08, bz + 0.56, 86, 86, 46, [0.82, 0.84, 0.88], false);
                // Street-Art Mural Canvas Panel + Neon Crown Frame
                emitBox3D(gw.x, gw.y, gCos, gSin, 0, 0, 48, 11.2, bz + 0.12, bz + 0.52, gw.ad, gw.ad, nc);
                emitSolidBox3D(gw.x, gw.y, gCos, gSin, 0, 0, 56, 12, bz + 0.56, bz + 0.61, nc, 7);
            }
        }

        // 18. LAKE LEONIDA GATOR ISLAND 3D SMUGGLER RADAR OUTPOST & AIRBOAT DOCK (c=125.5, r=103.0)
        if (this.landmarks3D && this.landmarks3D.lakeLeonidaOutpost) {
            const lo = this.landmarks3D.lakeLeonidaOutpost;
            const bz = lo.z || 2.0;
            emitAOShadow3D(lo.x, lo.y, 1, 0, 0, 18, 138, 148, bz, 0.42);
            // 1. Stilted Cypress Smuggler Cabin (at offX = -28, offY = -12)
            emitBox3D(lo.x, lo.y, 1, 0, -28, -12, 64, 48, bz, bz + 0.48, "wall_shack_front", "wall_shack_side", [0.52, 0.38, 0.26]);
            emitHippedRoof3D(lo.x, lo.y, 1, 0, -28, -12, 74, 58, bz + 0.48, 0.22, "roof_rusted_tin", [0.76, 0.38, 0.22], [0.58, 0.28, 0.16]);
            // 2. 4-Tier Open-Lattice S363 Smuggler Radio & Radar Tower (at offX = +36, offY = -12)
            emitOctagonPad3D(lo.x, lo.y, 36, -12, 24, 24, 22, 22, 0.26, bz, bz + 0.12, [0.84, 0.86, 0.90], [0.76, 0.78, 0.82], 2, 177, 71);
            for (let lv = 0; lv < 4; lv++) {
                const y0 = bz + 0.12 + lv * 0.34;
                const w = 18 - lv * 2.0;
                emitTileBox3D(lo.x, lo.y, 1, 0, 36, -12, w, w, y0, y0 + 0.34, (lv % 2 === 0) ? 246 : 363, 363, 64, [0.90, 0.92, 0.96], false);
            }
            // 3. Wooden Airboat Smuggler Dock Pier extending South into Lake Leonida (L77) + Stacked Contraband Crates (MAT 6)
            emitTileBox3D(lo.x, lo.y, 1, 0, 0, 68, 32, 112, bz + 0.04, bz + 0.14, 177, 177, 77, [0.82, 0.64, 0.42], true);
            emitSolidBox3D(lo.x, lo.y, 1, 0, 12, 18, 22, 16, bz + 0.10, bz + 0.28, [0.24, 0.54, 0.30], 6);
            emitSolidBox3D(lo.x, lo.y, 1, 0, 12, 18, 18, 14, bz + 0.28, bz + 0.42, [0.88, 0.46, 0.16], 6);
        }

        // 19. LEONIDA KEYS HISTORIC OLD SEVEN MILE BRIDGE 3D BROKEN SPAN PIER (c=202.0, r=478.6)
        if (this.landmarks3D && this.landmarks3D.sevenMileOldSpan) {
            const sm = this.landmarks3D.sevenMileOldSpan;
            const bz = sm.z || 2.0;
            // West & East Broken Concrete Bridge Spans supported on 3D Cylindrical Concrete Pilings over the Keys Channel!
            for (const dir of [-1, 1]) {
                const sx = sm.x + dir * 74;
                for (const pxOff of [-22, 22]) {
                    emitCylinder3D(sx, sm.y, pxOff, -12, 4.5, 4.0, bz - 0.05, bz + 0.32, 10, [0.78, 0.80, 0.84], 2, false);
                    emitCylinder3D(sx, sm.y, pxOff,  12, 4.5, 4.0, bz - 0.05, bz + 0.32, 10, [0.78, 0.80, 0.84], 2, false);
                }
                emitTileBox3D(sx, sm.y, 1, 0, 0, 0, 82, 34, bz + 0.28, bz + 0.38, 177, 177, 71, [0.88, 0.90, 0.94], true);
                emitSolidBox3D(sx, sm.y, 1, 0, -dir * 34, 0, 14, 34, bz + 0.38, bz + 0.44, [0.98, 0.82, 0.16], 3);
            }
        }

        // 20. VICE BEACH 3D PASTEL ART DECO LIFEGUARD TOWERS ON STILTS (this.map.beachProps)
        if (this.map && Array.isArray(this.map.beachProps)) {
            const pastelPal = [
                [0.98, 0.42, 0.76], // Miami Hot Pink
                [0.24, 0.90, 0.96], // South Beach Cyan
                [0.98, 0.84, 0.24]  // Sunburst Yellow
            ];
            let lgIdx = 0;
            for (const bp of this.map.beachProps) {
                if (!bp.spr || !bp.spr.startsWith("lifeguard_")) continue;
                const bz = bp.z || 2.0;
                const col = pastelPal[lgIdx % pastelPal.length];
                lgIdx++;
                emitAOShadow3D(bp.x, bp.y, 1, 0, 0, 0, 44, 38, bz, 0.36);
                // 4 Timber Stilts (S363) + Elevated Wooden Observation Deck (L77)
                for (const [lx, ly] of [[-12, -10], [12, -10], [-12, 10], [12, 10]]) {
                    emitTileBox3D(bp.x, bp.y, 1, 0, lx, ly, 4.5, 4.5, bz, bz + 0.18, 363, 363, 77, [0.86, 0.72, 0.54], false);
                }
                emitTileBox3D(bp.x, bp.y, 1, 0, 0, 0, 34, 28, bz + 0.18, bz + 0.24, 177, 177, 77, [0.92, 0.86, 0.76], false);
                // Pastel Art Deco Lifeguard Cabin (S199 windows) + Cantilevered Sunburst Roof Canopy
                emitTileBox3D(bp.x, bp.y, 1, 0, -2, 0, 22, 20, bz + 0.24, bz + 0.48, 199, 199, 86, [0.98, 0.98, 1.00], false);
                emitSolidBox3D(bp.x, bp.y, 1, 0, -2, 0, 24, 22, bz + 0.34, bz + 0.39, col, 5);
                emitSolidBox3D(bp.x, bp.y, 1, 0, 0, 0, 32, 26, bz + 0.48, bz + 0.54, col, 5);
            }
        }

        // 21. MUSCLE BEACH 3D OUTDOOR WEIGHTLIFTING PAVILIONS & BENCH-PRESS RACKS (this.map.muscleBeachGyms)
        if (this.map && Array.isArray(this.map.muscleBeachGyms)) {
            for (const mg of this.map.muscleBeachGyms) {
                const bz = mg.z || 2.0;
                emitAOShadow3D(mg.x, mg.y, 1, 0, 0, 0, 56, 42, bz, 0.34);
                // Rubberized Outdoor Gym Mat Plinth (L87)
                emitTileBox3D(mg.x, mg.y, 1, 0, 0, 0, 48, 34, bz, bz + 0.04, 177, 177, 87, [0.36, 0.42, 0.52], false);
                // 3D Chrome Calisthenics Pull-Up Frame (at offX = -14)
                emitTileBox3D(mg.x, mg.y, 1, 0, -14, -10, 3.5, 3.5, bz + 0.04, bz + 0.32, 363, 363, 45, [0.92, 0.94, 0.98], false);
                emitTileBox3D(mg.x, mg.y, 1, 0, -14,  10, 3.5, 3.5, bz + 0.04, bz + 0.32, 363, 363, 45, [0.92, 0.94, 0.98], false);
                emitSolidBox3D(mg.x, mg.y, 1, 0, -14, 0, 4.0, 24, bz + 0.29, bz + 0.33, [0.98, 0.82, 0.18], 5);
                // 3D Bench-Press Pad & Heavy Olympic Barbell Discs (at offX = +10)
                emitSolidBox3D(mg.x, mg.y, 1, 0, 10, 0, 18, 7, bz + 0.04, bz + 0.12, [0.88, 0.20, 0.22], 5);
                emitSolidBox3D(mg.x, mg.y, 1, 0, 16, 0, 2.5, 22, bz + 0.16, bz + 0.19, [0.88, 0.92, 0.96], 5);
                emitCylinder3D(mg.x, mg.y, 16, -9, 4.5, 4.5, bz + 0.13, bz + 0.22, 10, [0.16, 0.18, 0.22], 5, true);
                emitCylinder3D(mg.x, mg.y, 16,  9, 4.5, 4.5, bz + 0.13, bz + 0.22, 10, [0.16, 0.18, 0.22], 5, true);
            }
        }

        // 22. LEONIDA KEYS, GATOR ISLAND & VICE BEACH 3D THATCHED TIKI BARS (this.map.tikiBars)
        if (this.map && Array.isArray(this.map.tikiBars)) {
            for (const tb of this.map.tikiBars) {
                const bz = tb.z || 2.0;
                const tCos = Math.cos(tb.ang || 0);
                const tSin = Math.sin(tb.ang || 0);
                emitAOShadow3D(tb.x, tb.y, tCos, tSin, 0, 0, 54, 38, bz, 0.38);
                // Bamboo & Wooden Deck (L77) + Wrap-Around Tiki Cocktail Counter (MAT 6)
                emitTileBox3D(tb.x, tb.y, tCos, tSin, 0, 0, 46, 30, bz, bz + 0.06, 177, 177, 77, [0.84, 0.66, 0.44], false);
                emitSolidBox3D(tb.x, tb.y, tCos, tSin, 0, 6, 34, 10, bz + 0.06, bz + 0.20, [0.68, 0.46, 0.24], 6);
                emitSolidBox3D(tb.x, tb.y, tCos, tSin, 0, 6, 36, 12, bz + 0.20, bz + 0.23, [0.92, 0.78, 0.54], 1);
                // 4 Corner Bamboo Posts + Hipped Thatched Palm Roof + Glowing Neon Cocktail Sign
                for (const [px, py] of [[-18, -11], [18, -11], [-18, 11], [18, 11]]) {
                    const wx = tb.x + px * tCos - py * tSin;
                    const wy = tb.y + px * tSin + py * tCos;
                    emitCylinder3D(wx, wy, 0, 0, 2.2, 2.2, bz + 0.06, bz + 0.42, 8, [0.58, 0.38, 0.20], 1, false);
                }
                emitHippedRoof3D(tb.x, tb.y, tCos, tSin, 0, 0, 52, 36, bz + 0.42, 0.20, "mansion_star_island", [0.80, 0.62, 0.34], [0.90, 0.72, 0.40]);
                emitSolidBox3D(tb.x, tb.y, tCos, tSin, 0, 14, 22, 3, bz + 0.38, bz + 0.44, [0.98, 0.30, 0.74], 7);
            }
        }

        // 23. VICE CITY MAMBAS STADIUM 3D GOALPOSTS, 4 FLOODLIGHT PYLONS & JUMBOTRON SCOREBOARD (c=188.0, r=172.0)
        if (this.mambasStadium) {
            const ms = this.mambasStadium;
            const bz = ms.z || 2.0;
            const gold = [0.98, 0.84, 0.16];
            // A. North & South Endzone 3D Tubular Golden Football Goalposts (offY = -96 & +96)
            for (const gy of [-96, 96]) {
                emitCylinder3D(ms.x, ms.y, 0, gy, 2.5, 2.5, bz, bz + 0.34, 8, gold, 5, true);
                emitSolidBox3D(ms.x, ms.y, 1, 0, 0, gy, 38, 3.5, bz + 0.32, bz + 0.36, gold, 7);
                emitCylinder3D(ms.x, ms.y, -17, gy, 1.8, 1.8, bz + 0.34, bz + 0.88, 8, gold, 7, true);
                emitCylinder3D(ms.x, ms.y,  17, gy, 1.8, 1.8, bz + 0.34, bz + 0.88, 8, gold, 7, true);
            }
            // B. 4 Towering Open-Lattice S363 Stadium Floodlight Pylons at Pitch Corners
            for (const [fx, fy] of [[-86, -108], [86, -108], [-86, 108], [86, 108]]) {
                emitTileBox3D(ms.x, ms.y, 1, 0, fx, fy, 12, 12, bz, bz + 1.48, 363, 363, 64, [0.88, 0.92, 0.96], false);
                emitSolidBox3D(ms.x, ms.y, 1, 0, fx, fy, 26, 8, bz + 1.48, bz + 1.68, [0.98, 0.98, 0.90], 7);
            }
            // C. North Endzone 3D Mambas Jumbotron Scoreboard Gantry (offY = -124)
            for (const jx of [-38, 38]) {
                emitTileBox3D(ms.x, ms.y, 1, 0, jx, -124, 10, 10, bz, bz + 0.96, 363, 246, 64, [0.86, 0.90, 0.96], false);
            }
            emitSolidBox3D(ms.x, ms.y, 1, 0, 0, -124, 96, 10, bz + 0.56, bz + 1.12, [0.14, 0.18, 0.26], 5);
            emitBox3D(ms.x, ms.y, 1, 0, 0, -124, 88, 11.5, bz + 0.60, bz + 1.06, "ad_vice26", "ad_sprunk", [0.22, 0.94, 0.98]);
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

        // 9. Thrillbilly Mud Club Animated 3D Flaming Hoop Ring (c=82.0, r=455.0)
        if (this.landmarks3D && this.landmarks3D.thrillbillyArena) {
            const tb = this.landmarks3D.thrillbillyArena;
            if (tb.x >= minX - 220 && tb.x <= maxX + 220 && tb.y >= minY - 220 && tb.y <= maxY + 220) {
                const bz = tb.z || 2.0;
                const ringCenterElev = bz + 0.52;
                const ringRadY = 26.0;
                const ringRadZ = 0.34;
                for (let fi = 0; fi < 12; fi++) {
                    const ang = (fi * Math.PI * 2.0) / 12.0 + t * 1.4;
                    const fy = tb.y + Math.cos(ang) * ringRadY;
                    const fz = ringCenterElev + Math.sin(ang) * ringRadZ;
                    const flick = 0.85 + 0.25 * Math.sin(t * 18.0 + fi * 2.1);
                    const fCol = (fi % 2 === 0) ? [1.0, 0.48, 0.10] : [1.0, 0.88, 0.22];
                    emitDynBox(tb.x, fy, 1, 0, 0, 0, 7 * flick, 7 * flick, fz - 0.04, fz + 0.06 * flick, fCol, 0.92, 7);
                }
            }
        }

        // 10. Port Gellhorn International Raceway 3D Starting Tree Lights & Active Hot-Lap Checkpoint Pylons
        if (this.landmarks3D && this.landmarks3D.gellhornSpeedway) {
            const gs = this.landmarks3D.gellhornSpeedway;
            if (gs.x >= minX - 320 && gs.x <= maxX + 320 && gs.y >= minY - 320 && gs.y <= maxY + 320) {
                const bz = gs.z || 2.0;
                const stage = Math.floor(t * 2.5) % 4;
                for (const ly of [-42, 0, 42]) {
                    const col = stage === 0 ? [1.0, 0.18, 0.20] : (stage === 1 ? [1.0, 0.78, 0.14] : [0.18, 0.98, 0.42]);
                    emitDynBox(gs.x, gs.y, 1, 0, 0, ly, 20, 12, bz + 1.06, bz + 1.14, col, 0.96, 7);
                }
            }
            if (this.speedwayRace && this.speedwayRace.active) {
                const cp = this.speedwayRace.checkpoints[this.speedwayRace.checkpointIdx];
                if (cp && cp.x >= minX - 220 && cp.x <= maxX + 220 && cp.y >= minY - 220 && cp.y <= maxY + 220) {
                    const pulse = 0.72 + 0.24 * Math.sin(t * 8.0);
                    emitDynCylinder(cp.x, cp.y, 0, 0, 32.0, 26.0, 2.02, 2.55, 16, [0.98, 0.84, 0.16], 7, false, pulse * 0.65);
                }
            }
        }

        // 11. Wynwood Walls Live-Rotating 3D Neon Pop-Art Sculpture & Tagged Graffiti Mural Glow
        if (this.landmarks3D && this.landmarks3D.wynwoodWalls) {
            const ww = this.landmarks3D.wynwoodWalls;
            if (ww.x >= minX - 180 && ww.x <= maxX + 180 && ww.y >= minY - 180 && ww.y <= maxY + 180) {
                const bz = ww.z || 2.0;
                const sAng = t * 1.8;
                const cA = Math.cos(sAng), sA = Math.sin(sAng);
                const bob = Math.sin(t * 3.0) * 0.04;
                emitDynBox(ww.x, ww.y + 18, cA, sA, 0, 0, 16, 16, bz + 0.18 + bob, bz + 0.44 + bob, [0.98, 0.26, 0.78], 0.94, 7);
                emitDynBox(ww.x, ww.y + 18, -sA, cA, 0, 0, 12, 12, bz + 0.44 + bob, bz + 0.64 + bob, [0.18, 0.94, 0.98], 0.94, 7);
            }
        }
        if (Array.isArray(this.graffitiWalls)) {
            for (let i = 0; i < this.graffitiWalls.length; i++) {
                const gw = this.graffitiWalls[i];
                if (gw.x < minX - 140 || gw.x > maxX + 140 || gw.y < minY - 140 || gw.y > maxY + 140) continue;
                const bz = gw.z || 2.0;
                const gCos = Math.cos(gw.ang || 0);
                const gSin = Math.sin(gw.ang || 0);
                if (gw.tagged) {
                    const nc = gw.neon || [0.98, 0.24, 0.78];
                    const pulse = 0.82 + 0.18 * Math.sin(t * 6.0 + i);
                    emitDynBox(gw.x, gw.y, gCos, gSin, 0, 0, 52, 12.2, bz + 0.10, bz + 0.54, nc, pulse * 0.55, 7);
                    emitDynBox(gw.x, gw.y, gCos, gSin, 0, 0, 58, 13.0, bz + 0.56, bz + 0.65, [0.22, 0.96, 0.98], 0.95, 7);
                } else {
                    // Spinning 3D Neon Spray-Paint Can icon in front of untagged wall
                    const cAng = t * 3.2 + i;
                    const bob = Math.sin(t * 4.2 + i) * 0.03;
                    emitDynCylinder(gw.x - gSin * 18, gw.y + gCos * 18, 0, 0, 4.5, 4.5, bz + 0.06 + bob, bz + 0.22 + bob, 10, gw.neon || [0.98, 0.28, 0.76], 7, true);
                    emitDynCylinder(gw.x - gSin * 18, gw.y + gCos * 18, 0, 0, 2.2, 2.2, bz + 0.22 + bob, bz + 0.27 + bob, 8, [0.96, 0.98, 1.00], 5, true);
                }
            }
        }

        // 12. Lake Leonida Gator Island Live-Rotating Smuggler Radar Dish & 8 Bobbing 3D Contraband Airdrop Crates
        if (this.landmarks3D && this.landmarks3D.lakeLeonidaOutpost) {
            const lo = this.landmarks3D.lakeLeonidaOutpost;
            if (lo.x >= minX - 200 && lo.x <= maxX + 200 && lo.y >= minY - 200 && lo.y <= maxY + 200) {
                const bz = lo.z || 2.0;
                const rAng = t * 2.4;
                emitDynBox(lo.x + 36, lo.y - 12, Math.cos(rAng), Math.sin(rAng), 0, 0, 24, 5, bz + 1.48, bz + 1.58, [0.92, 0.95, 0.99], 1.0, 4);
                if (Math.sin(t * 7.5) > 0) {
                    emitDynCylinder(lo.x + 36, lo.y - 12, 0, 0, 3.0, 3.0, bz + 1.58, bz + 1.66, 8, [0.18, 0.98, 0.48], 7, true);
                }
            }
        }
        if (Array.isArray(this.smugglerDrops)) {
            for (let i = 0; i < this.smugglerDrops.length; i++) {
                const sd = this.smugglerDrops[i];
                if (!sd.active || sd.x < minX - 140 || sd.x > maxX + 140 || sd.y < minY - 140 || sd.y > maxY + 140) continue;
                const bob = Math.sin(t * 2.8 + sd.seed) * 0.022;
                const bz = (sd.z || 2.0) + 0.01 + bob;
                const cAng = t * 0.6 + sd.seed;
                const cA = Math.cos(cAng), sA = Math.sin(cAng);
                // Yellow Inflatable Flotation Collar + Military Olive & Hazard-Orange 3D Supply Crate + Blinking Strobe!
                emitDynCylinder(sd.x, sd.y, 0, 0, 15.0, 15.0, bz, bz + 0.06, 12, [0.96, 0.78, 0.14], 5, true);
                emitDynBox(sd.x, sd.y, cA, sA, 0, 0, 18, 18, bz + 0.05, bz + 0.24, [0.22, 0.48, 0.26], 1.0, 6);
                emitDynBox(sd.x, sd.y, cA, sA, 0, 0, 19, 6, bz + 0.11, bz + 0.19, [0.96, 0.48, 0.14], 1.0, 3);
                if (Math.sin(t * 8.5 + sd.seed) > -0.2) {
                    emitDynCylinder(sd.x, sd.y, 0, 0, 3.5, 3.5, bz + 0.24, bz + 0.32, 8, [0.22, 0.94, 0.98], 7, true);
                }
            }
        }

        // 13. Vice City Mambas Stadium 3D Halftime Pyrotechnics & Fireworks Show
        if (this.mambasStadium && (this.mambasStadium.fireworkTimer || 0) > 0) {
            const ms = this.mambasStadium;
            if (ms.x >= minX - 280 && ms.x <= maxX + 280 && ms.y >= minY - 280 && ms.y <= maxY + 280) {
                const bz = ms.z || 2.0;
                const fwCols = [[0.98, 0.24, 0.78], [0.20, 0.94, 0.98], [0.98, 0.86, 0.16], [0.24, 0.98, 0.46]];
                for (let b = 0; b < 4; b++) {
                    const phase = ((t * 1.4 + b * 0.25) % 1.0);
                    const bx = ms.x + (b - 1.5) * 48;
                    const by = ms.y - 96;
                    const rad = 8 + phase * 38;
                    const zElev = bz + 0.75 + phase * 0.85;
                    const col = fwCols[b % fwCols.length];
                    for (let sp = 0; sp < 8; sp++) {
                        const a = (sp * Math.PI * 2.0) / 8.0 + t * 2.0;
                        emitDynBox(bx + Math.cos(a) * rad, by + Math.sin(a) * rad, 1, 0, 0, 0, 6, 6, zElev, zElev + 0.08, col, 1.0 - phase * 0.7, 7);
                    }
                }
            }
        }

        // 14. Mount Kalaga National Park 3D Animated "Skunk Ape" (Florida Bigfoot) Cryptid
        if (this.skunkApe && this.skunkApe.active) {
            const sa = this.skunkApe;
            if (sa.x >= minX - 140 && sa.x <= maxX + 140 && sa.y >= minY - 140 && sa.y <= maxY + 140) {
                const bz = sa.z || 2.0;
                const cA = Math.cos(sa.ang || 0), sA = Math.sin(sa.ang || 0);
                const stride = Math.sin(t * 4.5) * 3.2;
                const fur = [0.28, 0.18, 0.12];
                // Muscular bipedal legs + shaggy hominid torso + swinging arms + head with glowing amber eyes!
                emitDynBox(sa.x, sa.y, cA, sA,  stride, -4.5, 6, 5, bz, bz + 0.12, fur, 1.0, 6);
                emitDynBox(sa.x, sa.y, cA, sA, -stride,  4.5, 6, 5, bz, bz + 0.12, fur, 1.0, 6);
                emitDynBox(sa.x, sa.y, cA, sA, 0, 0, 12, 16, bz + 0.11, bz + 0.29, [0.34, 0.22, 0.14], 1.0, 6);
                emitDynBox(sa.x, sa.y, cA, sA, -stride * 1.1, -9.5, 5, 4.5, bz + 0.12, bz + 0.27, fur, 1.0, 6);
                emitDynBox(sa.x, sa.y, cA, sA,  stride * 1.1,  9.5, 5, 4.5, bz + 0.12, bz + 0.27, fur, 1.0, 6);
                emitDynBox(sa.x, sa.y, cA, sA, 1, 0, 9, 9, bz + 0.29, bz + 0.39, fur, 1.0, 6);
                emitDynBox(sa.x, sa.y, cA, sA, 5.2, -2.2, 2.2, 2.0, bz + 0.33, bz + 0.36, [1.0, 0.78, 0.14], 1.0, 7);
                emitDynBox(sa.x, sa.y, cA, sA, 5.2,  2.2, 2.2, 2.0, bz + 0.33, bz + 0.36, [1.0, 0.78, 0.14], 1.0, 7);
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

        // Render Pulsing Ground/Water Rings for Thrillbilly Mud Club, Gellhorn Speedway, Wynwood Graffiti Walls & Smuggler Drops
        if (this.landmarks3D && this.landmarks3D.thrillbillyArena) {
            const tb = this.landmarks3D.thrillbillyArena;
            if (tb.x >= minX - 200 && tb.x <= maxX + 200 && tb.y >= minY - 200 && tb.y <= maxY + 200) {
                const rSz = 46 + Math.sin(renderer.time * 6.0) * 5.0;
                renderer.pushSolidQuad3D(tb.x, tb.y, 2.03, rSz, rSz, renderer.time * 1.4, 0.98, 0.48, 0.12, 0.45, SPRITE_DRAW_ORDER.TIRE_MARKS);
                renderer.pushSolidQuad3D(tb.x, tb.y - 126, 2.03, 28, 28, renderer.time * 1.2, 0.98, 0.78, 0.16, 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
        }
        if (this.landmarks3D && this.landmarks3D.gellhornSpeedway) {
            const gs = this.landmarks3D.gellhornSpeedway;
            if (gs.x >= minX - 240 && gs.x <= maxX + 240 && gs.y >= minY - 240 && gs.y <= maxY + 240) {
                renderer.pushSolidQuad3D(gs.pitX, gs.pitY, 2.03, 34, 34, renderer.time * 1.2, 0.22, 0.94, 0.48, 0.46, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
            if (this.speedwayRace && this.speedwayRace.active) {
                const cp = this.speedwayRace.checkpoints[this.speedwayRace.checkpointIdx];
                if (cp && cp.x >= minX - 240 && cp.x <= maxX + 240 && cp.y >= minY - 240 && cp.y <= maxY + 240) {
                    const rSz = 64 + Math.sin(renderer.time * 7.0) * 6.0;
                    renderer.pushSolidQuad3D(cp.x, cp.y, 2.035, rSz, rSz, renderer.time * 1.8, 0.98, 0.84, 0.16, 0.52, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }
        }
        if (Array.isArray(this.graffitiWalls)) {
            for (let i = 0; i < this.graffitiWalls.length; i++) {
                const gw = this.graffitiWalls[i];
                if (gw.tagged || gw.x < minX - 120 || gw.x > maxX + 120 || gw.y < minY - 120 || gw.y > maxY + 120) continue;
                const gCos = Math.cos(gw.ang || 0), gSin = Math.sin(gw.ang || 0);
                const rSz = 26 + Math.sin(renderer.time * 5.5 + i) * 3.0;
                renderer.pushSolidQuad3D(gw.x - gSin * 18, gw.y + gCos * 18, 2.03, rSz, rSz, renderer.time * 1.4, 0.98, 0.28, 0.78, 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
        }
        if (Array.isArray(this.smugglerDrops)) {
            for (let i = 0; i < this.smugglerDrops.length; i++) {
                const sd = this.smugglerDrops[i];
                if (!sd.active || sd.x < minX - 140 || sd.x > maxX + 140 || sd.y < minY - 140 || sd.y > maxY + 140) continue;
                const rSz = 36 + Math.sin(renderer.time * 5.0 + sd.seed) * 4.5;
                renderer.pushSolidQuad3D(sd.x, sd.y, 2.025, rSz, rSz, renderer.time * 1.2, 0.22, 0.92, 0.98, 0.45, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
        }
    }

    /* ========================================================================
       6B. RENDER 2D VILLA HEIST INTERACTION PROMPTS & ACTIVE GETAWAY BANNER
       ======================================================================== */
    renderHeistPrompts(ctx, renderer, game) {
        if (!ctx || !renderer || !game || !game.player || game.activeInterior) return;

        const p = game.player;
        const pVeh = p ? (p.inVehicle || p.car || null) : null;
        const px = pVeh ? pVeh.x : p.x;
        const py = pVeh ? pVeh.y : p.y;

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

        // 0C. Wynwood Street-Art Graffiti Tagging, Thrillbilly Mud Club, Gellhorn Speedway & Smuggler Drop Prompts
        if (Array.isArray(this.graffitiWalls)) {
            for (const gw of this.graffitiWalls) {
                if (!gw.tagged && Math.hypot(px - gw.x, py - gw.y) < 105) {
                    const scr = renderer.worldToScreen(gw.x, gw.y - 16, (gw.z || 2.0) + 0.56);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.92)";
                    ctx.fillRect(scr.x - 180, scr.y - 22, 360, 22);
                    ctx.strokeStyle = "#f472b6";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 180, scr.y - 22, 360, 22);
                    ctx.fillStyle = "#f472b6";
                    ctx.fillText("🎨 [E] SPRAY-PAINT VICE 26 MURAL (+$3,500 & -1 STAR)", scr.x, scr.y - 7);
                }
            }
        }
        if (this.landmarks3D && this.landmarks3D.thrillbillyArena) {
            const tb = this.landmarks3D.thrillbillyArena;
            if ((tb.cooldown || 0) <= 0 && (Math.hypot(px - tb.x, py - tb.y) < 155 || Math.hypot(px - tb.x, py - (tb.y - 126)) < 115)) {
                const scr = renderer.worldToScreen(tb.x, tb.y - 18, 2.75);
                ctx.font = "900 11px monospace";
                ctx.fillStyle = "rgba(8,12,22,0.92)";
                ctx.fillRect(scr.x - 190, scr.y - 22, 380, 22);
                ctx.strokeStyle = "#f97316";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(scr.x - 190, scr.y - 22, 380, 22);
                ctx.fillStyle = "#fde047";
                ctx.fillText(
                    p.inVehicle
                        ? "🔥 JUMP FLAMING MUD RING (+$10,000 + NITRO & +1X)"
                        : "🔥 [E] THRILLBILLY MUD-BOGGING DERBY (+$10,000 & +1X)",
                    scr.x,
                    scr.y - 7
                );
            }
        }
        if (this.landmarks3D && this.landmarks3D.gellhornSpeedway && this.speedwayRace) {
            const gs = this.landmarks3D.gellhornSpeedway;
            const sr = this.speedwayRace;
            if (!sr.active && (Math.hypot(px - gs.x, py - gs.y) < 140 || Math.hypot(px - gs.pitX, py - gs.pitY) < 120)) {
                const scr = renderer.worldToScreen(gs.x, gs.y - 18, 2.65);
                ctx.font = "900 11px monospace";
                ctx.fillStyle = "rgba(8,12,22,0.92)";
                ctx.fillRect(scr.x - 195, scr.y - 22, 390, 22);
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(scr.x - 195, scr.y - 22, 390, 22);
                ctx.fillStyle = "#facc15";
                ctx.fillText("🏁 DRIVE THROUGH OR [E] START GELLHORN HOT-LAP (+$15,000)", scr.x, scr.y - 7);
            } else if (sr.active) {
                const cp = sr.checkpoints[sr.checkpointIdx];
                const distM = cp ? Math.round(Math.hypot(px - cp.x, py - cp.y) / 16) : 0;
                const cx = ctx.canvas.width * 0.5;
                const cy = 62;
                ctx.fillStyle = "rgba(10, 14, 26, 0.92)";
                ctx.fillRect(cx - 235, cy - 24, 470, 48);
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 2;
                ctx.strokeRect(cx - 235, cy - 24, 470, 48);
                ctx.font = "900 12px monospace";
                ctx.fillStyle = "#facc15";
                ctx.fillText(`🏁 PORT GELLHORN HOT-LAP — TIME: ${sr.timer.toFixed(1)}s (BEST: ${sr.bestTime.toFixed(1)}s)`, cx, cy - 6);
                ctx.font = "700 11px monospace";
                ctx.fillStyle = "#4ade80";
                ctx.fillText(`CHECKPOINT ${sr.checkpointIdx + 1}/4: ${cp ? cp.name : "FINISH"} (${distM}m) • +$15,000 PRIZE`, cx, cy + 14);
            }
        }
        if (Array.isArray(this.smugglerDrops)) {
            for (const sd of this.smugglerDrops) {
                if (sd.active && Math.hypot(px - sd.x, py - sd.y) < 130) {
                    const scr = renderer.worldToScreen(sd.x, sd.y - 14, 2.38);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.90)";
                    ctx.fillRect(scr.x - 175, scr.y - 22, 350, 22);
                    ctx.strokeStyle = "#38bdf8";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 175, scr.y - 22, 350, 22);
                    ctx.fillStyle = "#38bdf8";
                    ctx.fillText("📦 TOUCH OR [E] COLLECT SMUGGLER CRATE (+$5,000 & AMMO)", scr.x, scr.y - 7);
                }
            }
        }
        if (!p.inVehicle && this.map && Array.isArray(this.map.muscleBeachGyms) && (this.gymCooldown || 0) <= 0) {
            for (const mg of this.map.muscleBeachGyms) {
                if (Math.hypot(px - mg.x, py - mg.y) < 92) {
                    const scr = renderer.worldToScreen(mg.x, mg.y - 14, 2.34);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.90)";
                    ctx.fillRect(scr.x - 175, scr.y - 22, 350, 22);
                    ctx.strokeStyle = "#4ade80";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 175, scr.y - 22, 350, 22);
                    ctx.fillStyle = "#4ade80";
                    ctx.fillText("💪 [E] PUMP IRON AT MUSCLE BEACH (150 MAX HP & +$2,000)", scr.x, scr.y - 7);
                }
            }
        }
        if (!p.inVehicle && this.map && Array.isArray(this.map.tikiBars) && (this.tikiCooldown || 0) <= 0) {
            for (const tb of this.map.tikiBars) {
                if (Math.hypot(px - tb.x, py - tb.y) < 92) {
                    const scr = renderer.worldToScreen(tb.x, tb.y - 14, 2.48);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.90)";
                    ctx.fillRect(scr.x - 175, scr.y - 22, 350, 22);
                    ctx.strokeStyle = "#2dd4bf";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 175, scr.y - 22, 350, 22);
                    ctx.fillStyle = "#2dd4bf";
                    ctx.fillText("🍹 [E] ORDER KEYS TIKI MOJITO (FULL HP + +50 ARMOR)", scr.x, scr.y - 7);
                }
            }
        }
        if (this.mambasStadium && (this.mambasStadium.cooldown || 0) <= 0 && Math.hypot(px - this.mambasStadium.x, py - this.mambasStadium.y) < 165) {
            const scr = renderer.worldToScreen(this.mambasStadium.x, this.mambasStadium.y - 24, 2.65);
            ctx.font = "900 11px monospace";
            ctx.fillStyle = "rgba(8,12,22,0.92)";
            ctx.fillRect(scr.x - 190, scr.y - 22, 380, 22);
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(scr.x - 190, scr.y - 22, 380, 22);
            ctx.fillStyle = "#facc15";
            ctx.fillText("🏈 [E] OR DRIVE GOALPOSTS: MAMBAS TOUCHDOWN (+$10,000)", scr.x, scr.y - 7);
        }
        if (this.skunkApe && this.skunkApe.active && Math.hypot(px - this.skunkApe.x, py - this.skunkApe.y) < 145) {
            const scr = renderer.worldToScreen(this.skunkApe.x, this.skunkApe.y - 16, 2.45);
            ctx.font = "900 11px monospace";
            ctx.fillStyle = "rgba(8,12,22,0.92)";
            ctx.fillRect(scr.x - 190, scr.y - 22, 380, 22);
            ctx.strokeStyle = "#f97316";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(scr.x - 190, scr.y - 22, 380, 22);
            ctx.fillStyle = "#fde047";
            ctx.fillText("🦶 [E] PHOTOGRAPH MOUNT KALAGA SKUNK APE (+$25,000)", scr.x, scr.y - 7);
        }
        if (this.map && Array.isArray(this.map.streetTakeovers) && (this.takeoverCooldown || 0) <= 0) {
            for (const st of this.map.streetTakeovers) {
                if (Math.hypot(px - st.x, py - st.y) < 135) {
                    const scr = renderer.worldToScreen(st.x, st.y - 18, 2.42);
                    ctx.font = "900 11px monospace";
                    ctx.fillStyle = "rgba(8,12,22,0.92)";
                    ctx.fillRect(scr.x - 190, scr.y - 22, 380, 22);
                    ctx.strokeStyle = "#ec4899";
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(scr.x - 190, scr.y - 22, 380, 22);
                    ctx.fillStyle = "#ec4899";
                    ctx.fillText(
                        p.inVehicle
                            ? "🔥 DRIFT IN SIDESHOW RING (+$8,500 + NITRO & +1X)"
                            : "🔥 [E] HYPE STREET TAKEOVER SIDESHOW (+$8,500 & +1X)",
                        scr.x,
                        scr.y - 7
                    );
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
        if (lm.thrillbillyArena) {
            ctx.fillStyle = "#f97316";
            ctx.fillRect((lm.thrillbillyArena.x - 78) * sx, (lm.thrillbillyArena.y - 48) * sy, 156 * sx, 96 * sy);
        }
        if (lm.gellhornSpeedway) {
            ctx.fillStyle = "#facc15";
            ctx.fillRect((lm.gellhornSpeedway.x - 24) * sx, (lm.gellhornSpeedway.y - 128) * sy, 48 * sx, 256 * sy);
        }
        if (lm.wynwoodWalls) {
            ctx.fillStyle = "#ec4899";
            ctx.fillRect((lm.wynwoodWalls.x - 54) * sx, (lm.wynwoodWalls.y - 36) * sy, 108 * sx, 72 * sy);
        }
        if (lm.lakeLeonidaOutpost) {
            ctx.fillStyle = "#2dd4bf";
            ctx.fillRect((lm.lakeLeonidaOutpost.x - 42) * sx, (lm.lakeLeonidaOutpost.y - 42) * sy, 84 * sx, 84 * sy);
        }
        if (lm.sevenMileOldSpan) {
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect((lm.sevenMileOldSpan.x - 110) * sx, (lm.sevenMileOldSpan.y - 18) * sy, 220 * sx, 36 * sy);
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

    /* ========================================================================
       8. TRUE 3D WEBGL MULTI-ROOM INTERIOR ARCHITECTURE & FURNITURE ENGINE
       ======================================================================== */
    renderInterior3DMesh(gl, renderer, game, viewProj) {
        if (!gl || !renderer || !game || !game.activeInterior) return;
        this.initShader(gl, renderer);
        if (!this.meshProg || !renderer.spritesTex) return;

        const intr = game.activeInterior;
        const rw = intr.w || 760;
        const rh = intr.h || 520;
        const theme = intr.theme || "SHOP_CONVENIENCE";
        const t = renderer.time || 0;

        const objSprites = (renderer.gta1Meta && renderer.gta1Meta.sprites && renderer.gta1Meta.sprites.objects) || {};
        const texW = renderer.spritesTexW || (renderer.gta1SpritesImg && renderer.gta1SpritesImg.width) || 2048;
        const texH = renderer.spritesTexH || (renderer.gta1SpritesImg && renderer.gta1SpritesImg.height) || 4096;

        const iVerts = [];
        const pushV = (x, yElev, z, u, v, r, g, b, a = 1.0) => {
            iVerts.push(x, yElev, z, u, v, r, g, b, a);
        };
        const encUV = (matId, u, v) => [
            -matId - Math.max(0.01, Math.min(0.99, u)) * 0.85,
            Math.max(0.01, Math.min(0.99, v))
        ];
        const getTileUV = (tileIdx, u0 = 0.0, v0 = 0.0, u1 = 1.0, v1 = 1.0) => {
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
        const encLidWorldUV = (lidIdx) => {
            const idx = 390 + lidIdx;
            return [-20.0 - (idx % 16), Math.floor(idx / 16)];
        };
        const getSprUV = (key) => {
            const rect = objSprites[key];
            if (!rect) return null;
            const [sx, sy, sw, sh] = rect;
            return [
                (sx + 0.5) / texW,
                (sy + 0.5) / texH,
                (sx + sw - 0.5) / texW,
                (sy + sh - 0.5) / texH
            ];
        };
        const hexToRgb = (hex) => {
            if (!hex || typeof hex !== "string") return [0.95, 0.35, 0.75];
            const clean = hex.replace("#", "");
            const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
            if (isNaN(num)) return [0.95, 0.35, 0.75];
            return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
        };

        const pushQuad = (p0, p1, p2, p3, u0, v0, u1, v1, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], u0, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);
            pushV(p1[0], p1[1], p1[2], u1, v0, r, g, b, a);
            pushV(p2[0], p2[1], p2[2], u0, v1, r, g, b, a);
            pushV(p3[0], p3[1], p3[2], u1, v1, r, g, b, a);
        };
        const pushMatQuad = (p0, p1, p2, p3, matId, r, g, b, a = 1.0) => {
            const [u0, v0] = encUV(matId, 0.02, 0.98);
            const [u1, v1] = encUV(matId, 0.98, 0.02);
            pushQuad(p0, p1, p2, p3, u0, v0, u1, v1, r, g, b, a);
        };
        const pushTri = (p0, p1, p2, uv0, uv1, uv2, r, g, b, a = 1.0) => {
            pushV(p0[0], p0[1], p0[2], uv0[0], uv0[1], r, g, b, a);
            pushV(p1[0], p1[1], p1[2], uv1[0], uv1[1], r, g, b, a);
            pushV(p2[0], p2[1], p2[2], uv2[0], uv2[1], r, g, b, a);
        };

        // Axis-aligned 3D box in interior pixel coordinates [x, y, w, h]
        const boxR = (x, y, w, h, yBot, yTop, col, matId = 1, alpha = 1.0) => {
            const x0 = x / TILE_SIZE;
            const x1 = (x + w) / TILE_SIZE;
            const z0 = y / TILE_SIZE;
            const z1 = (y + h) / TILE_SIZE;
            const [r, g, b] = col;
            const tNW = [x0, yTop, z0], tNE = [x1, yTop, z0], tSW = [x0, yTop, z1], tSE = [x1, yTop, z1];
            const bNW = [x0, yBot, z0], bNE = [x1, yBot, z0], bSW = [x0, yBot, z1], bSE = [x1, yBot, z1];
            pushMatQuad(tSW, tSE, bSW, bSE, matId, r, g, b, alpha);
            pushMatQuad(tNE, tNW, bNE, bNW, matId, r * 0.78, g * 0.80, b * 0.85, alpha);
            pushMatQuad(tNW, tSW, bNW, bSW, matId, r * 0.90, g * 0.91, b * 0.94, alpha);
            pushMatQuad(tSE, tNE, bSE, bNE, matId, r * 0.84, g * 0.86, b * 0.90, alpha);
            if (matId !== 4) {
                pushMatQuad(tNW, tNE, tSW, tSE, matId, Math.min(1, r * 1.06), Math.min(1, g * 1.06), Math.min(1, b * 1.06), alpha);
            }
        };

        // 3D Box textured with gta1_tiles_vice.png side & lid tiles
        const tileBoxR = (x, y, w, h, yBot, yTop, frontTileIdx, sideTileIdx, topLidIdx = null, col = [1, 1, 1], worldTileTop = true) => {
            const x0 = x / TILE_SIZE;
            const x1 = (x + w) / TILE_SIZE;
            const z0 = y / TILE_SIZE;
            const z1 = (y + h) / TILE_SIZE;
            const [r, g, b] = col;
            const tNW = [x0, yTop, z0], tNE = [x1, yTop, z0], tSW = [x0, yTop, z1], tSE = [x1, yTop, z1];
            const bNW = [x0, yBot, z0], bNE = [x1, yBot, z0], bSW = [x0, yBot, z1], bSE = [x1, yBot, z1];
            const sIdx = (sideTileIdx !== null && sideTileIdx !== undefined) ? sideTileIdx : frontTileIdx;
            if (frontTileIdx !== null && frontTileIdx !== undefined) {
                const [fu0, fv0, fu1, fv1] = getTileUV(frontTileIdx);
                const [su0, sv0, su1, sv1] = getTileUV(sIdx);
                pushQuad(tSW, tSE, bSW, bSE, fu0, fv0, fu1, fv1, r * 1.02, g * 1.01, b * 0.99, 1.0);
                pushQuad(tNE, tNW, bNE, bNW, su0, sv0, su1, sv1, r * 0.78, g * 0.80, b * 0.85, 1.0);
                pushQuad(tNW, tSW, bNW, bSW, su0, sv0, su1, sv1, r * 0.92, g * 0.93, b * 0.95, 1.0);
                pushQuad(tSE, tNE, bSE, bNE, su0, sv0, su1, sv1, r * 0.85, g * 0.86, b * 0.90, 1.0);
            }
            if (topLidIdx !== null && topLidIdx !== undefined) {
                if (worldTileTop) {
                    const [wu, wv] = encLidWorldUV(topLidIdx);
                    pushQuad(tNW, tNE, tSW, tSE, wu, wv, wu, wv, r, g, b, 1.0);
                } else {
                    const [tu0, tv0, tu1, tv1] = getTileUV(390 + topLidIdx);
                    pushQuad(tNW, tNE, tSW, tSE, tu0, tv0, tu1, tv1, r, g, b, 1.0);
                }
            }
        };

        // Seamless World-Tiled 64x64 Lid Floor Slab
        const floorLidR = (x, y, w, h, yElev, lidIdx, col = [1, 1, 1], alpha = 1.0) => {
            const x0 = x / TILE_SIZE;
            const x1 = (x + w) / TILE_SIZE;
            const z0 = y / TILE_SIZE;
            const z1 = (y + h) / TILE_SIZE;
            const [wu, wv] = encLidWorldUV(lidIdx);
            pushQuad([x0, yElev, z0], [x1, yElev, z0], [x0, yElev, z1], [x1, yElev, z1], wu, wv, wu, wv, col[0], col[1], col[2], alpha);
        };

        // Soft 3D Ground Ambient Occlusion Contact Shadow Skirt (MAT 8)
        const aoR = (x, y, w, h, yElev = 2.003, pad = 10, alpha = 0.36) => {
            const x0 = (x - pad) / TILE_SIZE;
            const x1 = (x + w + pad) / TILE_SIZE;
            const z0 = (y - pad) / TILE_SIZE;
            const z1 = (y + h + pad) / TILE_SIZE;
            pushMatQuad([x0, yElev, z0], [x1, yElev, z0], [x0, yElev, z1], [x1, yElev, z1], 8, 0.02, 0.03, 0.06, alpha);
        };

        // 3D Poster / Billboard / Vending Front mounted on a 3D Box
        const posterBoxR = (x, y, w, h, yBot, yTop, sprKey, frameCol = [0.16, 0.20, 0.28]) => {
            boxR(x - 2, y - 1, w + 4, h + 2, yBot - 0.015, yTop + 0.015, frameCol, 5);
            const uv = getSprUV(sprKey);
            if (!uv) {
                boxR(x, y, w, h, yBot, yTop, [0.95, 0.35, 0.65], 7);
                return;
            }
            const x0 = x / TILE_SIZE;
            const x1 = (x + w) / TILE_SIZE;
            const z1 = (y + h + 1.5) / TILE_SIZE;
            pushQuad([x0, yTop, z1], [x1, yTop, z1], [x0, yBot, z1], [x1, yBot, z1], uv[0], uv[1], uv[2], uv[3], 1.0, 1.0, 1.0, 1.0);
        };

        // 3D Vertical Cylinder (Pillars, Barstools, Lamps, Turntables, Rocket Hologram, Prison Bars)
        const cyl = (cxPx, cyPx, rBotPx, rTopPx, yBot, yTop, segs, col, matId = 5, capTop = true, alpha = 1.0) => {
            const [r, g, b] = col;
            const cx = cxPx / TILE_SIZE;
            const cz = cyPx / TILE_SIZE;
            const rb = rBotPx / TILE_SIZE;
            const rt = rTopPx / TILE_SIZE;
            const [tcU, tcV] = encUV(matId, 0.5, 0.5);
            for (let s = 0; s < segs; s++) {
                const a0 = (s / segs) * Math.PI * 2;
                const a1 = ((s + 1) / segs) * Math.PI * 2;
                const c0 = Math.cos(a0), s0 = Math.sin(a0);
                const c1 = Math.cos(a1), s1 = Math.sin(a1);
                const b0 = [cx + c0 * rb, yBot, cz + s0 * rb];
                const b1 = [cx + c1 * rb, yBot, cz + s1 * rb];
                const t0 = [cx + c0 * rt, yTop, cz + s0 * rt];
                const t1 = [cx + c1 * rt, yTop, cz + s1 * rt];
                const shade = 0.88 + 0.14 * Math.cos(a0 - 0.8);
                pushMatQuad(t0, t1, b0, b1, matId, Math.min(1, r * shade), Math.min(1, g * shade), Math.min(1, b * shade), alpha);
                if (capTop && rt > 0.0005) {
                    const [u0, v0] = encUV(matId, 0.5 + c0 * 0.45, 0.5 + s0 * 0.45);
                    const [u1, v1] = encUV(matId, 0.5 + c1 * 0.45, 0.5 + s1 * 0.45);
                    pushTri([cx, yTop, cz], t1, t0, [tcU, tcV], [u1, v1], [u0, v0], Math.min(1, r * 1.08), Math.min(1, g * 1.08), Math.min(1, b * 1.08), alpha);
                }
            }
        };

        // 3D Vertical Cone (Lampshades, Rocket Nosecones, Fountain Spires)
        const cone = (cxPx, cyPx, rBotPx, yBot, yTop, segs, col, matId = 5, alpha = 1.0) => {
            cyl(cxPx, cyPx, rBotPx, 0.4, yBot, yTop, segs, col, matId, false, alpha);
        };

        const accentRgb = hexToRgb(intr.accent || "#f472b6");

        // 1. ARCHITECTURAL BASE CUTAWAY PLINTH & EXTERIOR SHELL SHADOW (y = 1.80..2.00)
        boxR(-18, 24, rw + 36, rh - 10, 1.80, 1.996, [0.06, 0.08, 0.14], 2);
        boxR(-6, 34, rw + 12, rh - 26, 1.92, 1.998, [0.14, 0.18, 0.26], 1);

        // Determine primary floor lid & perimeter wall tiles per theme
        let mainFloorLid = 8;
        let mainFloorTint = [0.95, 0.95, 0.98];
        let northWallTile = 160;
        let sideWallTile = 156;
        let wallCrownCol = accentRgb;

        if (theme === "SHOP_GUN_SHOP") {
            mainFloorLid = 71; mainFloorTint = [0.68, 0.74, 0.82]; northWallTile = 244; sideWallTile = 245;
        } else if (theme === "SHOP_RESTAURANT" || theme === "DINER_PAWN") {
            mainFloorLid = 8; mainFloorTint = [0.96, 0.90, 0.82]; northWallTile = 148; sideWallTile = 149;
        } else if (theme === "SHOP_HOTEL" || theme === "ART_DECO_HOTEL") {
            mainFloorLid = 9; mainFloorTint = [0.88, 0.78, 0.92]; northWallTile = 160; sideWallTile = 161;
        } else if (theme === "SHOP_CLOTHES") {
            mainFloorLid = 8; mainFloorTint = [0.98, 0.96, 1.0]; northWallTile = 162; sideWallTile = 163;
        } else if (theme === "SHOP_CONVENIENCE") {
            mainFloorLid = 8; mainFloorTint = [0.92, 0.97, 0.96]; northWallTile = 152; sideWallTile = 153;
        } else if (theme === "SHOP_BAR") {
            mainFloorLid = 77; mainFloorTint = [0.76, 0.56, 0.40]; northWallTile = 144; sideWallTile = 145;
        } else if (theme === "NEON_CLUB" || theme === "STRIP_CLUB" || theme === "MALIBU_CLUB") {
            mainFloorLid = 71; mainFloorTint = [0.55, 0.45, 0.75]; northWallTile = 164; sideWallTile = 165;
        } else if (theme === "MANSION") {
            mainFloorLid = 8; mainFloorTint = [1.0, 0.96, 0.88]; northWallTile = 160; sideWallTile = 161;
        } else if (theme === "SPACE_BUNKER") {
            mainFloorLid = 45; mainFloorTint = [0.72, 0.84, 0.96]; northWallTile = 246; sideWallTile = 246;
        } else if (theme === "PRISON_BLOCK") {
            mainFloorLid = 71; mainFloorTint = [0.64, 0.68, 0.74]; northWallTile = 244; sideWallTile = 244;
        }

        // 2. PRIMARY 3D FLOOR SLAB (y = 2.00)
        floorLidR(14, 64, rw - 28, rh - 76, 2.000, mainFloorLid, mainFloorTint);

        // 3. THEME-SPECIFIC 3D FLOOR ZONES, 3D FURNITURE, PROPS & ANIMATED 3D ELEMENTS
        if (theme === "SHOP_HOTEL" || theme === "ART_DECO_HOTEL") {
            // West Master Suite Hardwood Floor (lid 77) & Crimson Silk Rug
            floorLidR(18, 72, 232, rh - 86, 2.002, 77, [0.85, 0.64, 0.46]);
            boxR(42, 218, 168, 128, 2.004, 2.016, [0.64, 0.12, 0.24], 1);
            boxR(46, 222, 160, 120, 2.006, 2.020, [0.78, 0.16, 0.30], 1);
            // Center Lobby Red Velvet Carpet Runner
            boxR(340, 134, 96, rh - 156, 2.003, 2.018, [0.86, 0.68, 0.20], 1);
            boxR(344, 138, 88, rh - 164, 2.005, 2.022, [0.68, 0.10, 0.22], 1);
            // East VIP Spa & Cocktail Lounge White Marble Floor (lid 8)
            floorLidR(526, 72, rw - 544, rh - 86, 2.002, 8, [0.96, 0.98, 1.0]);

            // Center North: 3D Concierge Mahogany Desk, Computer Terminal, Brass Bell & Key Rack
            aoR(300, 90, 176, 34, 2.004, 10, 0.42);
            tileBoxR(300, 90, 176, 34, 2.00, 2.22, 144, 144, 77, [0.68, 0.38, 0.20], false);
            boxR(296, 88, 184, 38, 2.22, 2.26, [0.92, 0.74, 0.26], 5);
            boxR(324, 96, 26, 18, 2.26, 2.30, [0.96, 0.94, 0.86], 1); // Guest register book
            boxR(420, 96, 30, 18, 2.26, 2.40, [0.12, 0.18, 0.28], 5); // Concierge monitor
            boxR(422, 98, 26, 14, 2.28, 2.38, [0.22, 0.88, 0.98], 7);
            cyl(388, 108, 6, 2, 2.26, 2.33, 10, [0.98, 0.82, 0.22], 5, true); // Service bell
            // North wall 3D Golden Room-Key Cubby Matrix
            boxR(290, 56, 196, 16, 2.24, 2.58, [0.28, 0.14, 0.08], 1);
            for (let kx = 300; kx < 476; kx += 16) {
                boxR(kx, 60, 10, 14, 2.28, 2.52, [0.96, 0.78, 0.22], 7);
            }
            // Brass Bellhop Luggage Cart (x=276, y=312)
            aoR(276, 312, 42, 28, 2.004, 8, 0.36);
            boxR(276, 312, 42, 28, 2.02, 2.08, [0.76, 0.14, 0.22], 1);
            cyl(280, 316, 3, 3, 2.08, 2.38, 8, [0.96, 0.80, 0.24], 5, true);
            cyl(314, 316, 3, 3, 2.08, 2.38, 8, [0.96, 0.80, 0.24], 5, true);
            boxR(284, 316, 24, 18, 2.08, 2.24, [0.58, 0.34, 0.16], 1);

            // West Master Suite: 3D King Bed with Carved Headboard, Pillows, Silk Duvet & Twin Nightstands
            aoR(28, 118, 128, 92, 2.004, 12, 0.44);
            boxR(28, 118, 16, 92, 2.00, 2.42, [0.46, 0.24, 0.12], 1); // Tall carved mahogany headboard
            boxR(30, 122, 14, 84, 2.16, 2.38, [0.92, 0.74, 0.24], 5); // Brass headboard inlay
            boxR(40, 120, 114, 88, 2.00, 2.16, [0.96, 0.96, 0.98], 1); // Mattress
            boxR(74, 122, 78, 84, 2.02, 2.19, [0.88, 0.16, 0.44], 1);  // Hot-pink silk bedspread
            boxR(124, 122, 26, 84, 2.03, 2.20, [0.98, 0.78, 0.22], 1); // Gold silk throw
            boxR(46, 128, 22, 32, 2.16, 2.23, [0.98, 0.98, 1.0], 1);   // Pillow N
            boxR(46, 168, 22, 32, 2.16, 2.23, [0.98, 0.98, 1.0], 1);   // Pillow S
            // Twin Nightstands & 3D Glowing Table Lamps
            for (const ny of [86, 214]) {
                boxR(28, ny, 28, 28, 2.00, 2.18, [0.48, 0.26, 0.14], 1);
                cyl(42, ny + 14, 4, 3, 2.18, 2.28, 8, [0.96, 0.80, 0.24], 5, true);
                cone(42, ny + 14, 11, 2.26, 2.38, 10, [1.0, 0.90, 0.46], 7, 0.95);
            }
            // Suite Weapon Stash Crate & Mahogany Dresser + Vanity Sink
            aoR(30, 386, 92, 34, 2.004, 8, 0.38);
            boxR(30, 386, 92, 34, 2.00, 2.24, [0.46, 0.24, 0.12], 1);
            boxR(140, 386, 86, 34, 2.00, 2.22, [0.92, 0.96, 0.98], 1);
            cyl(183, 403, 12, 14, 2.20, 2.25, 12, [0.22, 0.82, 0.96], 7, true);

            // East VIP Lounge: Backlit Cocktail Bar, 3D Barstools, Designer Wardrobe & 3D Marble Jacuzzi
            aoR(552, 92, 168, 34, 2.004, 10, 0.42);
            boxR(552, 92, 168, 34, 2.00, 2.22, [0.36, 0.16, 0.28], 1);
            boxR(548, 90, 176, 38, 2.22, 2.26, [0.22, 0.90, 0.98], 7); // Glowing cyan bar top
            for (let sx = 564; sx <= 708; sx += 24) {
                cyl(sx, 136, 7, 7, 2.00, 2.15, 10, [0.92, 0.22, 0.56], 5, true);
            }
            // North wall Neon Liquor Bottle Shelves
            for (let bx = 548; bx <= 712; bx += 22) {
                const bCol = (bx % 44 === 0) ? [0.96, 0.28, 0.66] : [0.22, 0.88, 0.98];
                boxR(bx, 58, 12, 12, 2.26, 2.54, bCol, 7);
            }
            // Safehouse Wardrobe Hanging Rack (x=564..696, y=148)
            boxR(564, 146, 132, 16, 2.00, 2.34, [0.88, 0.72, 0.24], 4);
            // 3D Sunken/Rimmed Marble Jacuzzi Pool (x=554..726, y=344..456)
            aoR(554, 344, 172, 112, 2.004, 12, 0.45);
            boxR(554, 344, 172, 112, 2.00, 2.16, [0.92, 0.96, 0.99], 1);
            floorLidR(566, 356, 148, 88, 2.12, 35, [0.25, 0.92, 1.0]);
            // Animated 3D Rising Jacuzzi Bubbles
            for (let bi = 0; bi < 8; bi++) {
                const bx = 584 + ((bi * 37) % 112) + Math.sin(t * 3.0 + bi) * 5;
                const by = 372 + ((bi * 29) % 56) + Math.cos(t * 2.6 + bi) * 4;
                const bz = 2.12 + ((t * 0.45 + bi * 0.17) % 0.10);
                cyl(bx, by, 4.5, 4.5, bz, bz + 0.025, 8, [0.88, 0.98, 1.0], 7, true, 0.85);
            }
        } else if (theme === "SHOP_GUN_SHOP") {
            // West Sales Showroom, Center Heavy Ordnance Vault, East 3-Lane Firing Range
            floorLidR(500, 72, rw - 518, rh - 86, 2.002, 71, [0.42, 0.46, 0.54]);
            // North Wall Illuminated Rifle Pegboard + Ammu-Nation 3D Billboard
            boxR(34, 56, 250, 14, 2.18, 2.62, [0.16, 0.22, 0.32], 6);
            posterBoxR(328, 56, 138, 14, 2.22, 2.62, "ad_ammunation", [0.88, 0.18, 0.18]);
            // West Armored Glass L-Counter (x=36..276, y=156..196)
            aoR(36, 156, 240, 40, 2.004, 10, 0.44);
            boxR(36, 156, 240, 40, 2.00, 2.16, [0.22, 0.26, 0.34], 6);
            boxR(36, 156, 240, 40, 2.16, 2.24, [0.38, 0.86, 0.98], 7, 0.88);
            // 3D Weapon Displays inside Case
            for (let wx = 52; wx <= 244; wx += 48) {
                boxR(wx, 166, 32, 18, 2.15, 2.19, [0.12, 0.14, 0.18], 5);
            }
            // West Tactical Kevlar Armor & Camo Racks (y=292..328)
            aoR(42, 292, 92, 36, 2.004, 8, 0.38);
            boxR(42, 292, 92, 36, 2.00, 2.34, [0.24, 0.36, 0.24], 6);
            aoR(168, 292, 92, 36, 2.004, 8, 0.38);
            boxR(168, 292, 92, 36, 2.00, 2.34, [0.22, 0.32, 0.44], 6);

            // Center Heavy Ordnance Vault: Military Spec Olive Crates & 3D Cylindrical RPG / Napalm Tanks
            aoR(324, 156, 148, 42, 2.004, 10, 0.44);
            boxR(324, 156, 148, 42, 2.00, 2.24, [0.28, 0.36, 0.20], 6);
            boxR(328, 160, 140, 34, 2.24, 2.28, [0.92, 0.72, 0.14], 3); // Hazard stripe lid
            cyl(354, 176, 8, 8, 2.28, 2.48, 10, [0.88, 0.22, 0.18], 5, true); // Napalm tank
            cyl(438, 176, 6, 6, 2.28, 2.46, 10, [0.32, 0.44, 0.24], 5, true);
            cone(438, 176, 7, 2.46, 2.58, 10, [0.88, 0.68, 0.16], 5); // RPG warhead cone
            // South Vault Stacked Ammo Crates
            aoR(336, 368, 124, 42, 2.004, 8, 0.40);
            boxR(336, 368, 60, 40, 2.00, 2.26, [0.32, 0.40, 0.22], 6);
            boxR(402, 368, 56, 40, 2.00, 2.36, [0.36, 0.44, 0.24], 6);

            // East 3-Lane Live Indoor Firing Range
            boxR(500, 198, 240, 6, 2.00, 2.28, [0.92, 0.72, 0.14], 3); // Shooting booth safety barrier
            boxR(500, 198, 240, 6, 2.28, 2.48, [0.38, 0.88, 0.98], 7, 0.75); // Bulletproof glass
            for (let lane = 0; lane < 3; lane++) {
                const ly = 112 + lane * 116;
                if (lane > 0) {
                    boxR(510, ly - 16, 224, 4, 2.00, 2.36, [0.32, 0.36, 0.44], 6);
                }
                // Animated Moving 3D Silhouette Target on overhead rail!
                const targX = 688 + Math.sin(t * 2.2 + lane * 1.7) * 28;
                boxR(targX, ly + 18, 6, 34, 2.08, 2.42, [0.96, 0.94, 0.88], 1);
                boxR(targX - 2, ly + 26, 6, 18, 2.18, 2.34, [0.92, 0.18, 0.22], 7);
            }
            // Bullet trap backstop wall at x=726
            boxR(724, 80, 16, rh - 102, 2.00, 2.58, [0.22, 0.24, 0.28], 3);
        } else if (theme === "SHOP_RESTAURANT" || theme === "DINER_PAWN") {
            // North Commercial Kitchen Tile Floor (lid 71)
            floorLidR(18, 72, 464, 152, 2.002, 71, [0.82, 0.86, 0.90]);
            // North Stainless Kitchen Line: Flattop Griddle, Deep Fryers, Prep Table & Overhead Exhaust Hood
            aoR(36, 84, 188, 36, 2.004, 10, 0.42);
            boxR(36, 84, 188, 36, 2.00, 2.22, [0.76, 0.80, 0.86], 5);
            boxR(42, 88, 92, 28, 2.22, 2.25, [0.18, 0.20, 0.24], 6); // Cast-iron griddle plate
            boxR(144, 88, 72, 28, 2.22, 2.26, [0.92, 0.68, 0.14], 7); // Golden frying oil vats
            // Overhead 3D Stainless Exhaust Hood
            boxR(34, 78, 192, 42, 2.44, 2.66, [0.82, 0.86, 0.92], 5);
            // Center Prep & Espresso Station
            aoR(264, 84, 192, 36, 2.004, 10, 0.42);
            boxR(264, 84, 192, 36, 2.00, 2.22, [0.78, 0.82, 0.88], 5);
            boxR(396, 88, 44, 26, 2.22, 2.38, [0.88, 0.18, 0.22], 5); // Red Italian Espresso Machine
            posterBoxR(280, 56, 130, 14, 2.24, 2.62, "ad_burger", [0.92, 0.38, 0.14]);

            // Service Pass-Through Counter (y=192..224) + 8 Red Vinyl 3D Barstools
            aoR(36, 192, 168, 32, 2.004, 10, 0.42);
            boxR(36, 192, 168, 32, 2.00, 2.22, [0.82, 0.18, 0.22], 1);
            boxR(34, 190, 172, 36, 2.22, 2.26, [0.96, 0.96, 0.98], 5);
            aoR(276, 192, 180, 32, 2.004, 10, 0.42);
            boxR(276, 192, 180, 32, 2.00, 2.22, [0.82, 0.18, 0.22], 1);
            boxR(274, 190, 184, 36, 2.22, 2.26, [0.96, 0.96, 0.98], 5);
            for (const sx of [54, 88, 122, 156, 296, 336, 376, 416]) {
                cyl(sx, 236, 7, 7, 2.00, 2.15, 10, [0.92, 0.18, 0.22], 5, true);
            }

            // South Dining Room: Red Tufted Vinyl & Chrome Booths
            const boothXs = (theme === "DINER_PAWN") ? [36, 240] : [36, 286];
            for (const bx of boothXs) {
                for (const by of [284, 384]) {
                    aoR(bx, by, 144, 52, 2.004, 8, 0.38);
                    boxR(bx, by, 144, 14, 2.00, 2.24, [0.84, 0.14, 0.20], 1);      // North booth bench
                    boxR(bx, by + 38, 144, 14, 2.00, 2.24, [0.84, 0.14, 0.20], 1); // South booth bench
                    boxR(bx + 10, by + 15, 124, 22, 2.00, 2.18, [0.94, 0.96, 0.98], 5); // Formica table
                }
            }

            if (theme === "DINER_PAWN") {
                // East Wing: Uncle Jack's Caged Pawn Counter, Heavy Armory Safe & Gun Wall
                floorLidR(484, 72, rw - 502, rh - 86, 2.002, 77, [0.68, 0.48, 0.34]);
                aoR(532, 134, 196, 36, 2.004, 10, 0.44);
                boxR(532, 134, 196, 36, 2.00, 2.22, [0.46, 0.26, 0.14], 1);
                boxR(532, 134, 196, 6, 2.22, 2.52, [0.88, 0.72, 0.22], 4); // Brass security cage mesh
                boxR(648, 82, 68, 42, 2.00, 2.46, [0.22, 0.26, 0.32], 6);  // Heavy pawn vault safe
                posterBoxR(540, 56, 128, 14, 2.24, 2.62, "ad_ammunation", [0.92, 0.72, 0.18]);
            } else {
                // East Beverage Lounge: 3D Glowing Wurlitzer Jukebox & Soda Fountain
                aoR(548, 118, 168, 36, 2.004, 10, 0.42);
                boxR(548, 118, 168, 36, 2.00, 2.22, [0.18, 0.68, 0.74], 5);
                posterBoxR(562, 56, 136, 14, 2.24, 2.62, "ad_ecola", [0.92, 0.18, 0.22]);
                // 3D Wurlitzer Neon Jukebox at (688, 250)
                aoR(668, 232, 44, 36, 2.004, 8, 0.42);
                boxR(668, 232, 44, 36, 2.00, 2.38, [0.48, 0.22, 0.12], 1);
                cyl(690, 250, 22, 22, 2.32, 2.48, 12, [0.98, 0.36, 0.72], 7, true);
                // East High-Top Cocktail Tables
                for (const ty of [308, 404]) {
                    cyl(606, ty, 24, 24, 2.00, 2.18, 12, [0.92, 0.22, 0.26], 5, true);
                }
            }
        } else if (theme === "SHOP_CLOTHES") {
            // West Luxury Marble Showroom + East Velvet Fitting Suites
            floorLidR(504, 72, rw - 522, rh - 86, 2.002, 9, [0.92, 0.74, 0.88]);
            // North Backlit Sneaker & Couture Wall + Vice 26 Billboard
            boxR(36, 56, 260, 14, 2.18, 2.60, [0.98, 0.94, 0.84], 7);
            posterBoxR(324, 56, 144, 14, 2.22, 2.62, "ad_vice26", [0.96, 0.36, 0.76]);
            // West Glass Jewelry & POS Counter (x=42..246, y=132..168)
            aoR(42, 132, 204, 36, 2.004, 10, 0.40);
            boxR(42, 132, 204, 36, 2.00, 2.16, [0.94, 0.88, 0.76], 1);
            boxR(42, 132, 204, 36, 2.16, 2.24, [0.42, 0.90, 0.98], 7, 0.88);
            // Center Circular 3D Velvet Mannequin Podium (cx=318, cy=274)
            cyl(318, 274, 62, 62, 2.00, 2.12, 18, [0.92, 0.74, 0.22], 5, true);
            cyl(318, 274, 56, 56, 2.12, 2.18, 18, [0.78, 0.14, 0.44], 1, true);
            // Designer Garment Racks (NW & SW)
            for (const ry of [246, 364]) {
                aoR(52, ry, 144, 30, 2.004, 8, 0.36);
                boxR(52, ry, 144, 30, 2.00, 2.06, [0.92, 0.76, 0.24], 5);
                boxR(56, ry + 8, 136, 14, 2.06, 2.34, [0.94, 0.36, 0.72], 4);
            }
            // East 3 Private Fitting Suites with 3D Full-Length Mirrors & Velvet Ottomans
            for (const fy of [96, 232, 368]) {
                boxR(722, fy, 12, 76, 2.04, 2.52, [0.56, 0.92, 1.0], 7); // 3D Mirror
                cyl(646, fy + 38, 16, 16, 2.00, 2.14, 12, [0.88, 0.22, 0.58], 1, true); // Velvet ottoman
            }
        } else if (theme === "SHOP_CONVENIENCE") {
            // North 7-Door Walk-In Glass Beverage Coolers + eCola & Sprunk 3D Vending Machines
            aoR(24, 56, rw - 48, 22, 2.004, 8, 0.42);
            boxR(24, 56, rw - 48, 22, 2.00, 2.56, [0.16, 0.22, 0.30], 6);
            for (let cx = 36; cx < rw - 180; cx += 72) {
                boxR(cx, 60, 62, 18, 2.06, 2.50, [0.32, 0.88, 0.98], 7, 0.90);
            }
            posterBoxR(rw - 168, 58, 64, 20, 2.04, 2.52, "ad_ecola", [0.92, 0.16, 0.20]);
            posterBoxR(rw - 96, 58, 64, 20, 2.04, 2.52, "ad_sprunk", [0.16, 0.86, 0.36]);

            // West L-Shaped Checkout Counter with Dual Registers & Lotto Display
            aoR(36, 124, 152, 38, 2.004, 10, 0.42);
            boxR(36, 124, 152, 38, 2.00, 2.22, [0.18, 0.56, 0.48], 1);
            boxR(34, 122, 156, 42, 2.22, 2.25, [0.92, 0.96, 0.98], 5);
            boxR(36, 162, 38, 96, 2.00, 2.22, [0.18, 0.56, 0.48], 1);
            boxR(64, 130, 28, 22, 2.25, 2.38, [0.22, 0.26, 0.34], 5); // Register 1
            boxR(124, 130, 28, 22, 2.25, 2.38, [0.22, 0.26, 0.34], 5); // Register 2

            // Center 4 Double-Sided 3D Supermarket Gondola Shelving Aisles
            for (const gx of [256, 424]) {
                for (const gy of [136, 304]) {
                    aoR(gx, gy, 92, 108, 2.004, 10, 0.42);
                    boxR(gx, gy, 92, 108, 2.00, 2.34, [0.92, 0.94, 0.98], 1);
                    boxR(gx + 6, gy + 4, 80, 100, 2.08, 2.30, [0.92, 0.38, 0.18], 6);
                    boxR(gx + 40, gy, 12, 108, 2.00, 2.38, [0.18, 0.24, 0.34], 5); // Center spine
                }
            }

            // East Slushie, Roller Grill & Coffee Counter + Twin 3D Slushie Domes
            aoR(656, 136, 68, 240, 2.004, 10, 0.42);
            boxR(656, 136, 68, 240, 2.00, 2.22, [0.22, 0.28, 0.36], 5);
            cyl(690, 168, 14, 14, 2.22, 2.42, 12, [0.98, 0.18, 0.32], 7, true); // Cherry slushie dome
            cyl(690, 204, 14, 14, 2.22, 2.42, 12, [0.18, 0.88, 0.98], 7, true); // Blue raspberry dome
            // SW ATM Kiosk (x=42, y=356)
            aoR(42, 356, 96, 44, 2.004, 8, 0.40);
            boxR(42, 356, 96, 44, 2.00, 2.42, [0.14, 0.38, 0.68], 5);
            boxR(56, 364, 68, 28, 2.18, 2.36, [0.24, 0.96, 0.56], 7);
        } else if (theme === "SHOP_BAR") {
            // East Billiards & Arcade Parlor Checkered Floor
            floorLidR(484, 72, rw - 502, rh - 86, 2.002, 71, [0.38, 0.44, 0.38]);
            // West 3D Mahogany Dive Bar Counter + Brass Foot-Rail + 7 Red Leather Barstools
            aoR(42, 118, 268, 40, 2.004, 10, 0.45);
            tileBoxR(42, 118, 268, 40, 2.00, 2.22, 144, 144, 77, [0.58, 0.30, 0.14], false);
            boxR(38, 114, 276, 48, 2.22, 2.26, [0.76, 0.44, 0.20], 1);
            // Twin 3D Draft Beer Towers
            cyl(116, 134, 5, 5, 2.26, 2.40, 8, [0.96, 0.80, 0.22], 5, true);
            cyl(224, 134, 5, 5, 2.26, 2.40, 8, [0.96, 0.80, 0.22], 5, true);
            for (let sx = 58; sx <= 298; sx += 40) {
                cyl(sx, 172, 7, 7, 2.00, 2.15, 10, [0.82, 0.16, 0.18], 5, true);
            }
            posterBoxR(110, 56, 140, 14, 2.24, 2.62, "ad_pißwasser", [0.96, 0.78, 0.18]);

            // SW Live Band Wooden Stage (x=28..208, y=354..468) with 3D Speaker Stacks
            aoR(28, 354, 180, 114, 2.004, 10, 0.42);
            tileBoxR(28, 354, 180, 114, 2.00, 2.10, 144, 144, 77, [0.68, 0.42, 0.22], false);
            boxR(36, 362, 32, 32, 2.10, 2.48, [0.12, 0.14, 0.18], 6); // Left PA Speaker Stack
            boxR(36, 428, 32, 32, 2.10, 2.48, [0.12, 0.14, 0.18], 6); // Right PA Speaker Stack
            cyl(154, 410, 3, 2, 2.10, 2.38, 8, [0.88, 0.90, 0.94], 5, true); // Chrome mic stand

            // Center Leather Lounge Booths
            for (const by of [258, 368]) {
                aoR(276, by, 132, 48, 2.004, 8, 0.40);
                boxR(276, by, 132, 48, 2.00, 2.20, [0.48, 0.22, 0.12], 1);
            }

            // East Wing: 3 Retro 1997 Arcade Cabinets + 3D Tournament Pool Table
            for (let ai = 0; ai < 3; ai++) {
                const ax = 516 + ai * 68;
                aoR(ax, 84, 48, 36, 2.004, 6, 0.42);
                boxR(ax, 84, 48, 36, 2.00, 2.46, [0.18, 0.14, 0.34], 5);
                const scrCol = ai === 0 ? [0.98, 0.24, 0.56] : (ai === 1 ? [0.22, 0.92, 0.98] : [0.24, 0.96, 0.42]);
                boxR(ax + 6, 92, 36, 26, 2.20, 2.40, scrCol, 7);
            }
            // 3D Emerald-Felt Tournament Pool Table (x=532..696, y=252..344)
            aoR(532, 252, 164, 92, 2.004, 12, 0.46);
            boxR(532, 252, 164, 92, 2.00, 2.18, [0.48, 0.24, 0.12], 1); // Mahogany rails
            boxR(542, 262, 144, 72, 2.04, 2.20, [0.08, 0.58, 0.32], 1); // Emerald billiard felt
            cyl(580, 298, 3.5, 3.5, 2.20, 2.23, 8, [0.98, 0.98, 1.0], 5, true); // Cue ball
            cyl(642, 298, 9.0, 9.0, 2.20, 2.23, 6, [0.96, 0.78, 0.16], 5, true); // Rack of balls
        } else if (theme === "NEON_CLUB" || theme === "STRIP_CLUB" || theme === "MALIBU_CLUB") {
            // West VIP Bottle Service Lounge, Center LED Dancefloor / Runway, East Armored Cash Vault
            floorLidR(554, 72, rw - 572, rh - 86, 2.002, 45, [0.68, 0.74, 0.82]);
            // North 3D Raised DJ Booth Stage (x=304..500, y=82..140) + Giant Subwoofer Towers
            aoR(304, 82, 196, 58, 2.004, 12, 0.48);
            boxR(304, 82, 196, 58, 2.00, 2.26, [0.14, 0.12, 0.24], 5);
            boxR(308, 86, 188, 50, 2.26, 2.30, accentRgb, 7);
            // Twin Rotating 3D Vinyl Turntables + Mixer
            cyl(368, 108, 14, 14, 2.30, 2.34, 12, [0.12, 0.14, 0.18], 5, true);
            cyl(436, 108, 14, 14, 2.30, 2.34, 12, [0.12, 0.14, 0.18], 5, true);
            // Giant Concert Subwoofer Towers flanking DJ Booth
            boxR(266, 78, 34, 48, 2.00, 2.58, [0.10, 0.12, 0.16], 6);
            boxR(504, 78, 34, 48, 2.00, 2.58, [0.10, 0.12, 0.16], 6);
            posterBoxR(336, 56, 132, 14, 2.32, 2.66, "ad_flashfm", accentRgb);

            if (theme === "STRIP_CLUB") {
                // Illuminated Velvet Runway Stage + Twin 3D Brass Dance Poles
                aoR(308, 204, 188, 176, 2.004, 12, 0.46);
                boxR(308, 204, 188, 176, 2.00, 2.14, [0.32, 0.08, 0.24], 1);
                boxR(314, 210, 176, 164, 2.14, 2.17, [0.96, 0.24, 0.64], 7);
                cyl(364, 292, 3.5, 3.5, 2.17, 2.68, 10, [0.98, 0.82, 0.24], 5, true);
                cyl(440, 292, 3.5, 3.5, 2.17, 2.68, 10, [0.98, 0.82, 0.24], 5, true);
            } else {
                // Animated Pulsing 3D LED Glass Dancefloor Matrix (4x3 tiles)
                for (let gx = 0; gx < 4; gx++) {
                    for (let gy = 0; gy < 3; gy++) {
                        const pulse = 0.55 + 0.45 * Math.sin(t * 4.2 + gx * 1.3 + gy * 1.7);
                        const cCol = ((gx + gy) % 2 === 0)
                            ? [0.96 * pulse, 0.22 * pulse, 0.68 * pulse]
                            : [0.18 * pulse, 0.88 * pulse, 0.98 * pulse];
                        boxR(292 + gx * 56, 212 + gy * 56, 52, 52, 2.002, 2.024, cCol, 7);
                    }
                }
            }

            // West VIP Bottle-Service Bar & Velvet Booths
            aoR(36, 118, 168, 38, 2.004, 10, 0.44);
            boxR(36, 118, 168, 38, 2.00, 2.22, [0.28, 0.10, 0.26], 1);
            boxR(34, 116, 172, 42, 2.22, 2.26, accentRgb, 7);
            for (const by of [258, 372]) {
                aoR(36, by, 148, 52, 2.004, 8, 0.40);
                boxR(36, by, 148, 52, 2.00, 2.22, [0.58, 0.12, 0.36], 1);
            }

            // East Wing: Armored Manager's Cash Vault, Counting Table & Gold Bullion Safe
            aoR(592, 134, 176, 42, 2.004, 10, 0.44);
            boxR(592, 134, 176, 42, 2.00, 2.22, [0.24, 0.28, 0.36], 5);
            // Stacks of emerald cash & gold bars on vault table
            boxR(612, 142, 36, 22, 2.22, 2.30, [0.16, 0.82, 0.38], 1);
            boxR(664, 142, 36, 22, 2.22, 2.32, [0.98, 0.80, 0.18], 5);
            // Heavy Steel Vault Safe on North-East Wall
            boxR(716, 78, 64, 46, 2.00, 2.52, [0.20, 0.24, 0.30], 6);
            cyl(748, 126, 10, 10, 2.22, 2.34, 10, [0.98, 0.82, 0.22], 5, true);
        } else if (theme === "MANSION") {
            // West Private Armory Hardwood, Center Carrara Marble Rotunda, East Indoor Spa Pool
            floorLidR(18, 72, 220, rh - 86, 2.002, 77, [0.82, 0.58, 0.38]);
            floorLidR(578, 72, rw - 596, rh - 86, 2.002, 9, [0.94, 0.90, 0.96]);
            // Grand Red Velvet Foyer Carpet & 4 3D Marble Colonnade Pillars
            boxR(348, 168, 124, rh - 188, 2.003, 2.018, [0.92, 0.74, 0.20], 1);
            boxR(354, 174, 112, rh - 200, 2.005, 2.022, [0.72, 0.10, 0.18], 1);
            for (const px of [284, 536]) {
                for (const py of [210, 390]) {
                    cyl(px, py, 14, 12, 2.00, 2.62, 12, [0.96, 0.94, 0.88], 1, true);
                    cyl(px, py, 17, 17, 2.00, 2.08, 12, [0.92, 0.76, 0.24], 5, true);
                }
            }
            // Centerpiece 3D "THE WORLD IS YOURS" Golden Globe Fountain at (410, 330)
            cyl(410, 330, 52, 54, 2.00, 2.14, 18, [0.94, 0.92, 0.86], 1, true);
            cyl(410, 330, 44, 44, 2.02, 2.16, 18, [0.18, 0.86, 0.98], 7, true);
            cone(410, 330, 16, 2.16, 2.38, 12, [0.98, 0.80, 0.20], 5);
            cyl(410, 330, 18, 18, 2.36, 2.54, 14, [1.0, 0.84, 0.22], 7, true); // Golden Globe

            // North Scarface Executive Mahogany Desk & Multi-Screen CCTV Wall
            aoR(310, 108, 200, 44, 2.004, 12, 0.46);
            tileBoxR(310, 108, 200, 44, 2.00, 2.24, 144, 144, 77, [0.58, 0.28, 0.12], false);
            boxR(306, 104, 208, 52, 2.24, 2.28, [0.96, 0.78, 0.22], 5);
            for (let mx = 318; mx <= 478; mx += 40) {
                boxR(mx, 56, 34, 14, 2.26, 2.56, [0.18, 0.88, 0.96], 7);
            }

            // West Golden Heavy Armory Racks & RPG Crates
            aoR(42, 140, 156, 42, 2.004, 10, 0.44);
            boxR(42, 140, 156, 42, 2.00, 2.26, [0.24, 0.28, 0.34], 6);
            boxR(46, 144, 148, 34, 2.26, 2.30, [0.98, 0.80, 0.20], 5);
            aoR(42, 340, 144, 48, 2.004, 10, 0.42);
            boxR(42, 340, 144, 48, 2.00, 2.28, [0.30, 0.38, 0.22], 6);

            // East Indoor Marble Jacuzzi & Champagne Bar
            aoR(612, 120, 156, 38, 2.004, 10, 0.42);
            boxR(612, 120, 156, 38, 2.00, 2.22, [0.94, 0.92, 0.86], 1);
            boxR(608, 118, 164, 42, 2.22, 2.26, [0.96, 0.78, 0.22], 5);
            aoR(612, 290, 164, 156, 2.004, 12, 0.46);
            boxR(612, 290, 164, 156, 2.00, 2.16, [0.96, 0.96, 0.98], 1);
            floorLidR(624, 302, 140, 132, 2.12, 35, [0.22, 0.92, 1.0]);
        } else if (theme === "SPACE_BUNKER") {
            // North Giant Orbital Telemetry Screen Wall (y = 2.18..2.66)
            boxR(264, 54, 292, 16, 2.16, 2.66, [0.08, 0.14, 0.24], 5);
            boxR(272, 58, 276, 14, 2.20, 2.62, [0.16, 0.86, 0.98], 7);
            // Center 3 Tiered 3D Mission Control Telemetry Consoles
            for (const cy of [128, 238, 348]) {
                aoR(292, cy, 236, 40, 2.004, 10, 0.45);
                boxR(292, cy, 236, 40, 2.00, 2.22, [0.18, 0.24, 0.34], 5);
                boxR(296, cy + 4, 228, 16, 2.22, 2.34, [0.18, 0.90, 0.98], 7);
            }
            // Rotating 3D Scale Hologram of SERA Artemis VI Rocket at (410, 192)
            cyl(410, 192, 22, 24, 2.00, 2.10, 14, [0.22, 0.30, 0.42], 5, true);
            cyl(410, 192, 8, 8, 2.12, 2.46, 12, [0.24, 0.92, 1.0], 7, true, 0.88);
            cone(410, 192, 10, 2.46, 2.62, 12, [0.98, 0.56, 0.18], 7, 0.92);

            // West Prototype Weapons Lab
            aoR(42, 144, 156, 44, 2.004, 10, 0.44);
            boxR(42, 144, 156, 44, 2.00, 2.28, [0.22, 0.28, 0.38], 5);
            boxR(46, 148, 148, 36, 2.28, 2.32, [0.98, 0.52, 0.16], 7);
            aoR(42, 336, 156, 44, 2.004, 10, 0.42);
            boxR(42, 336, 156, 44, 2.00, 2.26, [0.22, 0.28, 0.38], 5);

            // East Zero-G Medbay & Glowing Cylindrical Bio-Stasis Pod
            aoR(616, 144, 156, 44, 2.004, 10, 0.44);
            boxR(616, 144, 156, 44, 2.00, 2.24, [0.88, 0.94, 0.98], 5);
            cyl(694, 344, 38, 38, 2.00, 2.12, 16, [0.82, 0.88, 0.94], 5, true);
            cyl(694, 344, 30, 30, 2.12, 2.54, 16, [0.22, 0.98, 0.64], 7, true, 0.82);
        } else if (theme === "PRISON_BLOCK") {
            // West Lucia's Cell #06: Steel Bunk Bed & Stainless Toilet
            aoR(34, 96, 118, 52, 2.004, 8, 0.44);
            boxR(34, 96, 118, 52, 2.00, 2.28, [0.34, 0.40, 0.48], 6);
            boxR(40, 102, 106, 40, 2.14, 2.20, [0.22, 0.38, 0.64], 1); // Prison blanket
            cyl(218, 108, 10, 12, 2.00, 2.18, 10, [0.82, 0.86, 0.92], 5, true); // Cell toilet
            // 3D Vertical Steel Prison Bars enclosing Cell #06 (y=248 & x=254)
            for (let bx = 26; bx <= 172; bx += 16) {
                cyl(bx, 256, 2.2, 2.2, 2.00, 2.56, 6, [0.72, 0.78, 0.86], 5, false);
            }
            // Center Warden's Office Desk & Parole Computer
            aoR(310, 122, 180, 42, 2.004, 10, 0.44);
            boxR(310, 122, 180, 42, 2.00, 2.22, [0.46, 0.28, 0.16], 1);
            boxR(384, 128, 32, 20, 2.22, 2.38, [0.22, 0.88, 0.98], 7);
            // South Steel Mess Hall Tables
            for (const tx of [64, 336]) {
                aoR(tx, 348, 136, 48, 2.004, 8, 0.40);
                boxR(tx, 348, 136, 48, 2.00, 2.18, [0.68, 0.74, 0.82], 5);
            }
            // East SWAT Riot Armory Racks & Heavy Lockers
            aoR(596, 134, 168, 42, 2.004, 10, 0.44);
            boxR(596, 134, 168, 42, 2.00, 2.32, [0.20, 0.26, 0.36], 6);
            aoR(596, 336, 168, 44, 2.004, 10, 0.42);
            boxR(596, 336, 168, 44, 2.00, 2.36, [0.20, 0.26, 0.36], 6);
        }

        // 4. 3D INTERIOR PARTITION WALLS & OVERHEAD DOORWAY LINTELS
        const obsProvider = window.ShopInteriors || window.Interiors;
        const obsList = (obsProvider && typeof obsProvider.getObstacles === "function")
            ? obsProvider.getObstacles(intr)
            : [];
        for (let i = 0; i < obsList.length; i++) {
            const ob = obsList[i];
            const isVertWall = ob.w <= 24 && ob.h >= 60;
            const isHorizWall = ob.h <= 24 && ob.w >= 60;
            if (!isVertWall && !isHorizWall) continue;

            aoR(ob.x, ob.y, ob.w, ob.h, 2.004, 8, 0.40);
            tileBoxR(ob.x, ob.y, ob.w, ob.h, 2.00, 2.54, sideWallTile, sideWallTile, 8, [0.92, 0.94, 0.98], false);
            boxR(ob.x - 1, ob.y - 1, ob.w + 2, ob.h + 2, 2.54, 2.58, wallCrownCol, 7);

            // Connect consecutive collinear partition segments with a 3D Overhead Doorway Lintel & Jamb Pillars!
            for (let j = i + 1; j < obsList.length; j++) {
                const ob2 = obsList[j];
                if (isVertWall && Math.abs(ob.x - ob2.x) <= 4 && ob2.w <= 24) {
                    const top1 = ob.y + ob.h;
                    const gap = ob2.y - top1;
                    if (gap >= 40 && gap <= 140) {
                        boxR(ob.x, top1, ob.w, gap, 2.40, 2.56, [0.22, 0.26, 0.36], 1);
                        boxR(ob.x - 1, top1, ob.w + 2, gap, 2.56, 2.59, wallCrownCol, 7);
                        cyl(ob.x + ob.w * 0.5, top1 + 2, 6, 6, 2.00, 2.42, 10, wallCrownCol, 5, true);
                        cyl(ob.x + ob.w * 0.5, ob2.y - 2, 6, 6, 2.00, 2.42, 10, wallCrownCol, 5, true);
                    }
                } else if (isHorizWall && Math.abs(ob.y - ob2.y) <= 4 && ob2.h <= 24) {
                    const right1 = ob.x + ob.w;
                    const gap = ob2.x - right1;
                    if (gap >= 40 && gap <= 140) {
                        boxR(right1, ob.y, gap, ob.h, 2.40, 2.56, [0.22, 0.26, 0.36], 1);
                        boxR(right1, ob.y - 1, gap, ob.h + 2, 2.56, 2.59, wallCrownCol, 7);
                        cyl(right1 + 2, ob.y + ob.h * 0.5, 6, 6, 2.00, 2.42, 10, wallCrownCol, 5, true);
                        cyl(ob2.x - 2, ob.y + ob.h * 0.5, 6, 6, 2.00, 2.42, 10, wallCrownCol, 5, true);
                    }
                }
            }
        }

        // 5. 3D EXTRUDED PERIMETER WALLS, CORNICE CROWN & SOUTH ENTRANCE ARCHWAY
        // North Back Wall (full height 2.00..2.74 with authentic facade tiles)
        aoR(0, 44, rw, 28, 2.004, 14, 0.52);
        tileBoxR(0, 40, rw, 28, 2.00, 2.72, northWallTile, sideWallTile, 8, [0.96, 0.96, 1.0], false);
        boxR(-2, 38, rw + 4, 32, 2.72, 2.78, wallCrownCol, 7);

        // West & East Side Walls (2.00..2.64)
        aoR(0, 64, 18, rh - 76, 2.004, 12, 0.45);
        tileBoxR(0, 40, 18, rh - 46, 2.00, 2.64, sideWallTile, sideWallTile, 8, [0.92, 0.94, 0.98], false);
        boxR(-2, 40, 22, rh - 46, 2.64, 2.69, wallCrownCol, 7);

        aoR(rw - 18, 64, 18, rh - 76, 2.004, 12, 0.45);
        tileBoxR(rw - 18, 40, 18, rh - 46, 2.00, 2.64, sideWallTile, sideWallTile, 8, [0.92, 0.94, 0.98], false);
        boxR(rw - 20, 40, 22, rh - 46, 2.64, 2.69, wallCrownCol, 7);

        // South Cutaway Wall + Grand 3D Exit Archway & Twin Brass/Neon Pillars
        const doorHalfW = 92;
        const leftWallW = Math.max(40, rw * 0.5 - doorHalfW);
        const rightWallX = rw * 0.5 + doorHalfW;
        const rightWallW = Math.max(40, rw - rightWallX);
        boxR(0, rh - 14, leftWallW, 14, 2.00, 2.26, [0.18, 0.22, 0.32], 1);
        boxR(0, rh - 15, leftWallW, 16, 2.26, 2.30, wallCrownCol, 7);
        boxR(rightWallX, rh - 14, rightWallW, 14, 2.00, 2.26, [0.18, 0.22, 0.32], 1);
        boxR(rightWallX, rh - 15, rightWallW, 16, 2.26, 2.30, wallCrownCol, 7);

        // South Exit Welcome Threshold & Twin 3D Entrance Columns
        boxR(rw * 0.5 - 86, rh - 26, 172, 22, 2.002, 2.022, [0.46, 0.14, 0.22], 1);
        boxR(rw * 0.5 - 90, rh - 28, 180, 26, 2.001, 2.015, [0.96, 0.78, 0.22], 5);
        cyl(rw * 0.5 - 88, rh - 12, 9, 8, 2.00, 2.48, 12, [0.96, 0.80, 0.24], 5, true);
        cyl(rw * 0.5 + 88, rh - 12, 9, 8, 2.00, 2.48, 12, [0.96, 0.80, 0.24], 5, true);

        // 6. 3D INTERACTIVE STATION RINGS & PULSING HOLOGRAPHIC PEDESTALS
        const stations = intr.stations || [];
        for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            const stCol = hexToRgb(st.color || intr.accent || "#38bdf8");
            const pulseR = 20 + Math.sin(t * 5.0 + i * 1.4) * 3.5;
            cyl(st.x, st.y, 18, 20, 2.003, 2.024, 14, [0.12, 0.16, 0.24], 5, true);
            cyl(st.x, st.y, pulseR, pulseR - 2, 2.024, 2.042, 14, stCol, 7, true, 0.88);
        }

        if (iVerts.length === 0) return;

        gl.useProgram(this.meshProg);
        gl.uniformMatrix4fv(this.meshLocs.uViewProj, false, viewProj);
        gl.uniform1f(this.meshLocs.uNightTint, 0.0);
        gl.uniform1f(this.meshLocs.uSunsetTint, 0.0);
        if (this.meshLocs.uSunDir) {
            gl.uniform2f(this.meshLocs.uSunDir, 0.45, 0.88);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderer.spritesTex);
        gl.uniform1i(this.meshLocs.uTex, 0);

        const viceTilesTex = renderer.tilesTexVice || renderer.tilesTex || renderer.spritesTex;
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, viceTilesTex);
        if (this.meshLocs.uTilesTex) {
            gl.uniform1i(this.meshLocs.uTilesTex, 1);
        }

        const lightMapTex = renderer.dayLightTex || viceTilesTex;
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, lightMapTex);
        if (this.meshLocs.uDayLightTex) {
            gl.uniform1i(this.meshLocs.uDayLightTex, 2);
        }

        if (!this.interiorVbo) {
            this.interiorVbo = gl.createBuffer();
        }
        const stride = 9 * 4;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.interiorVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(iVerts), gl.STREAM_DRAW);
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

        gl.drawArrays(gl.TRIANGLES, 0, iVerts.length / 9);
        gl.activeTexture(gl.TEXTURE0);
    }

    batchInteriorSprites3D(renderer, game) {
        if (!renderer || !game || !game.activeInterior) return;
        const intr = game.activeInterior;
        const rw = intr.w || 760;
        const rh = intr.h || 520;
        const theme = intr.theme || "SHOP_CONVENIENCE";
        const t = renderer.time || 0;

        // 1. 3D Potted Tropical Miami Palms inside Hotels, Mansions, Boutiques & Clubs
        if (
            theme === "SHOP_HOTEL" ||
            theme === "ART_DECO_HOTEL" ||
            theme === "MANSION" ||
            theme === "SHOP_CLOTHES" ||
            theme === "MALIBU_CLUB" ||
            theme === "NEON_CLUB"
        ) {
            const palmSpots = [
                [rw * 0.5 - 108, rh - 52, 1.1],
                [rw * 0.5 + 108, rh - 52, 2.7]
            ];
            if (theme === "MANSION") {
                palmSpots.push([268, 124, 3.9], [552, 124, 5.1]);
            }
            for (const [px, py, seed] of palmSpots) {
                renderer.renderMiamiPalmTree3D(px, py, 2.02, 0.48, seed);
            }
        }

        // 2. Theme-Specific 3D Props (Jacuzzi Flamingo Float, Sizzling Kitchen Steam, Boutique Mannequins)
        if (theme === "SHOP_HOTEL" || theme === "ART_DECO_HOTEL") {
            const fx = 640 + Math.sin(t * 2.0) * 8;
            const fy = 400 + Math.cos(t * 1.6) * 6;
            renderer.batchObjectSprite3D("flamingo_float", fx, fy, 2.16, t * 0.45, 0.82, SPRITE_DRAW_ORDER.MAP_OBJECT);
        } else if (theme === "MANSION") {
            const fx = 694 + Math.sin(t * 2.0) * 10;
            const fy = 368 + Math.cos(t * 1.6) * 8;
            renderer.batchObjectSprite3D("flamingo_float", fx, fy, 2.16, t * 0.45, 0.88, SPRITE_DRAW_ORDER.MAP_OBJECT);
        } else if (theme === "SHOP_RESTAURANT" || theme === "DINER_PAWN") {
            for (let s = 0; s < 3; s++) {
                const age = (t * 0.9 + s * 0.33) % 1.0;
                const smSpr = String(200 + (s % 6));
                renderer.batchObjectSprite3D(smSpr, 88 + s * 28, 100 - age * 8, 2.26 + age * 0.18, t + s, 0.38 + age * 0.22, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
            }
        } else if (theme === "SHOP_CLOTHES") {
            // 3 Rotating Couture Mannequins on the Center Velvet Podium
            const mRoles = ["bikini_pink", "lucia", "bikini_cyan"];
            for (let m = 0; m < 3; m++) {
                const ma = t * 0.65 + (m * Math.PI * 2) / 3;
                const mx = 318 + Math.cos(ma) * 28;
                const my = 274 + Math.sin(ma) * 28;
                renderer.batchPedSprite3D(mRoles[m], 0, mx, my, 2.19, ma + Math.PI * 0.5, 1.32, false, SPRITE_DRAW_ORDER.PED);
            }
        }

        // 3. 3D Floating / Rotating Weapon & Item Icons above Interactive Stations
        const stations = intr.stations || [];
        for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            const bobZ = 2.14 + Math.sin(t * 4.2 + i) * 0.025;
            const spinA = t * 2.4 + i;
            let iconSpr = null;
            if (st.action === "BUY_PISTOL") iconSpr = "pistol";
            else if (st.action === "BUY_UZI") iconSpr = "uzi";
            else if (st.action === "BUY_SHOTGUN") iconSpr = "shotgun";
            else if (st.action === "BUY_ROCKET" || st.action === "ORBITAL_STRIKE") iconSpr = "rocket";
            else if (st.action === "BUY_ARMOR") iconSpr = "armor";
            else if (st.action === "BUY_SNACK" || st.action === "BUY_MEAL" || st.action === "BUY_ENERGY" || st.action === "ZERO_G_HEAL") iconSpr = "medkit";
            else if (st.action === "COLLECT_VAULT" || st.action === "SCARFACE_STASH" || st.action === "PAWN_FENCE" || st.action === "LUCIA_STASH") iconSpr = "briefcase";

            if (iconSpr) {
                renderer.batchObjectSprite3D(iconSpr, st.x, st.y, bobZ, spinA, 1.15, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        // 4. All Interior NPCs (Bartenders, Clerks, Guards, Dancers, Mechanics, Guests)
        const npcs = intr.npcs || [];
        for (let i = 0; i < npcs.length; i++) {
            const npc = npcs[i];
            const isDancing = !!(npc.dancing || npc.label === "DANCER" || npc.label === "CLUBBER");
            const nx = npc.x + (isDancing ? Math.sin(t * 4.0 + i) * 7.5 : Math.sin(t * 1.4 + i * 2.1) * 2.0);
            const ny = npc.y + (isDancing ? Math.cos(t * 4.0 + i) * 5.5 : Math.cos(t * 1.1 + i * 1.7) * 1.2);
            const baseAng = npc.angle !== undefined ? npc.angle : Math.PI * 0.5;
            const nAng = isDancing ? (baseAng + Math.sin(t * 3.0 + i) * 0.65) : (baseAng + Math.sin(t * 1.6 + i) * 0.18);
            const frame = isDancing ? (Math.floor(t * 6.0 + i * 2) % 8) : 0;
            const role = npc.type || npc.role || "civ2";

            renderer.batchPedSprite3D(role, frame, nx + 4, ny + 5, 2.012, nAng, 1.44, true, SPRITE_DRAW_ORDER.TIRE_MARKS);
            renderer.batchPedSprite3D(role, frame, nx, ny, 2.048, nAng, 1.44, false, SPRITE_DRAW_ORDER.PED);
        }

        // 5. Companion Partner (Jason Duval or Lucia Caminos) standing watch near the entrance
        const p = game.player;
        const partnerRole = (p && p.charId === "jason") ? "lucia" : "jason";
        const jx = rw * 0.5 - 64;
        const jy = rh - 62;
        const jAng = -Math.PI * 0.35 + Math.sin(t * 1.2) * 0.15;
        renderer.batchPedSprite3D(partnerRole, 0, jx + 4, jy + 5, 2.012, jAng, 1.40, true, SPRITE_DRAW_ORDER.TIRE_MARKS);
        renderer.batchPedSprite3D(partnerRole, 0, jx, jy, 2.050, jAng, 1.40, false, SPRITE_DRAW_ORDER.PED);

        // 6. Active Player Character inside the 3D Interior
        if (p) {
            const px = game.interiorX || rw * 0.5;
            const py = game.interiorY || rh - 78;
            const pAng = (game.interiorAngle !== undefined ? game.interiorAngle : (p.angle || -Math.PI * 0.5));
            const isMoving = !!(p.isMoving || game._interiorMoveTarget);
            const pFrame = isMoving ? (Math.floor((p.walkPhase || t) * 8.0) % 8) : 0;
            const charRole = p.charId || "lucia";

            // Pulsing cyan/pink player locator ring on floor
            const pRing = 22 + Math.sin(t * 6.0) * 2.5;
            renderer.pushSolidQuad3D(px, py, 2.010, pRing, pRing, t * 1.5, 0.96, 0.32, 0.72, 0.42, SPRITE_DRAW_ORDER.TIRE_MARKS);

            renderer.batchPedSprite3D(charRole, pFrame, px + 4, py + 5, 2.014, pAng, 1.46, true, SPRITE_DRAW_ORDER.TIRE_MARKS);
            renderer.batchPedSprite3D(charRole, pFrame, px, py, 2.055, pAng, 1.46, false, SPRITE_DRAW_ORDER.PLAYER);
        }
    }
}

window.WORLD_METRICS = WORLD_METRICS;
window.PREFAB_CATALOG = PREFAB_CATALOG;
window.WorldObjectEngine = WorldObjectEngine;
