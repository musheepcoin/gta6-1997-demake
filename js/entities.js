/* ============================================================================
   GRAND THEFT AUTO: LEONIDA '97 — ENTITIES & 1997 2D DRIFT PHYSICS
   Lucia, Jason, 9 Vehicle Archetypes, VCPD Police, Pedestrians & Alligators
   ============================================================================ */

const VEHICLE_SPECS = {
    // --- 1. MOTORCYCLES (vtype = 3 in STYLE001.G24 / 1997 GTA 1 eVehicle_Motorcycle) ---
    HARLEY_BIKE: {
        name: "CHOPPER CRUISER BIKE",
        sprId: "953",
        riderSprId: "962",
        w: 38,
        h: 18,
        maxSpeed: 445,
        accel: 420,
        turnSpeed: 4.15,
        grip: 0.92,
        driftGrip: 0.96,
        maxHp: 170,
        color: "#38bdf8",
        secondaryColor: "#0f172a",
        stripeColor: "#e2e8f0",
        bodyStyle: "MOTORCYCLE",
        isMotorcycle: true,
        isConvertible: true,
        amphibious: false
    },
    SUPERBIKE: {
        name: "SUPERBIKE 900 RR",
        sprId: "966",
        riderSprId: "975",
        w: 40,
        h: 16,
        maxSpeed: 515,
        accel: 490,
        turnSpeed: 4.45,
        grip: 0.94,
        driftGrip: 0.965,
        maxHp: 165,
        color: "#ef4444",
        secondaryColor: "#7f1d1d",
        stripeColor: "#fef08a",
        bodyStyle: "MOTORCYCLE",
        isMotorcycle: true,
        isConvertible: true,
        amphibious: false
    },

    // --- 2. HERO CONVERTIBLES, MUSCLE CARS & CLASSICS ---
    TULIP_MUSCLE: {
        name: "DECLASSE TULIP CONVERTIBLE",
        sprId: "57",
        w: 50,
        h: 25,
        maxSpeed: 395,
        accel: 315,
        turnSpeed: 3.15,
        grip: 0.88,
        driftGrip: 0.965,
        maxHp: 260,
        color: "#5eead4",
        secondaryColor: "#134e4a",
        stripeColor: "#ccfbf1",
        bodyStyle: "CONVERTIBLE",
        isConvertible: true,
        useBaseOnly: true,
        amphibious: false
    },
    MINT_STALLION: {
        name: "JUGULAR / STALLION GT",
        sprId: "82",
        w: 48,
        h: 24,
        maxSpeed: 415,
        accel: 330,
        turnSpeed: 3.2,
        grip: 0.89,
        driftGrip: 0.965,
        maxHp: 250,
        color: "#6ee7b7",
        secondaryColor: "#064e3b",
        stripeColor: "#a7f3d0",
        bodyStyle: "CONVERTIBLE",
        amphibious: false
    },
    SILVER_ROADSTER: {
        name: "THUNDERBIRD ROADSTER",
        sprId: "67",
        w: 50,
        h: 24,
        maxSpeed: 375,
        accel: 290,
        turnSpeed: 3.05,
        grip: 0.89,
        driftGrip: 0.96,
        maxHp: 250,
        color: "#cbd5e1",
        secondaryColor: "#450a0a",
        stripeColor: "#f8fafc",
        bodyStyle: "ROADSTER_SPARE",
        isConvertible: true,
        amphibious: false
    },
    CHALLENGER_RT: {
        name: "BRAVADO CHALLENGER R/T",
        sprId: "72",
        w: 52,
        h: 25,
        maxSpeed: 425,
        accel: 350,
        turnSpeed: 3.2,
        grip: 0.88,
        driftGrip: 0.968,
        maxHp: 270,
        color: "#f97316",
        secondaryColor: "#7c2d12",
        stripeColor: "#ffedd5",
        bodyStyle: "MUSCLE",
        amphibious: false
    },
    FJORD_FASTBACK: {
        name: "VAPID FJORD FASTBACK",
        sprId: "78",
        w: 50,
        h: 24,
        maxSpeed: 410,
        accel: 335,
        turnSpeed: 3.15,
        grip: 0.89,
        driftGrip: 0.965,
        maxHp: 260,
        color: "#3b82f6",
        secondaryColor: "#1e3a8a",
        stripeColor: "#dbeafe",
        bodyStyle: "FASTBACK",
        amphibious: false
    },

    // --- 3. SUPERCARS, EXOTICS & SPORTS GT ---
    VICE_CHEETAH: {
        name: "ITALI GTB / CHEETAH",
        sprId: "59",
        w: 50,
        h: 24,
        maxSpeed: 465,
        accel: 380,
        turnSpeed: 3.45,
        grip: 0.91,
        driftGrip: 0.96,
        maxHp: 230,
        color: "#f43f5e",
        secondaryColor: "#881337",
        stripeColor: "#fda4af",
        bodyStyle: "FASTBACK",
        amphibious: false
    },
    BANSHEE_GT: {
        name: "BEAST GTS / VIPER BANSHEE",
        sprId: "60",
        w: 48,
        h: 24,
        maxSpeed: 455,
        accel: 370,
        turnSpeed: 3.35,
        grip: 0.90,
        driftGrip: 0.968,
        maxHp: 235,
        color: "#38bdf8",
        secondaryColor: "#0c4a6e",
        stripeColor: "#bae6fd",
        bodyStyle: "FASTBACK",
        amphibious: false
    },
    PENETRATOR_GT: {
        name: "PENETRATOR COUNTACH V12",
        sprId: "61",
        w: 50,
        h: 25,
        maxSpeed: 480,
        accel: 395,
        turnSpeed: 3.5,
        grip: 0.92,
        driftGrip: 0.96,
        maxHp: 240,
        color: "#facc15",
        secondaryColor: "#713f12",
        stripeColor: "#fef9c3",
        bodyStyle: "FASTBACK",
        amphibious: false
    },
    PORKA_TURBO: {
        name: "PORKA 911 TURBO CABRIO",
        sprId: "70",
        w: 48,
        h: 24,
        maxSpeed: 450,
        accel: 365,
        turnSpeed: 3.45,
        grip: 0.91,
        driftGrip: 0.962,
        maxHp: 235,
        color: "#ec4899",
        secondaryColor: "#831843",
        stripeColor: "#fce7f3",
        bodyStyle: "CONVERTIBLE",
        isConvertible: true,
        amphibious: false
    },
    COSSIE_RS: {
        name: "COSSIE RALLY RS",
        sprId: "71",
        w: 48,
        h: 24,
        maxSpeed: 440,
        accel: 360,
        turnSpeed: 3.4,
        grip: 0.92,
        driftGrip: 0.965,
        maxHp: 245,
        color: "#22d3ee",
        secondaryColor: "#164e63",
        stripeColor: "#cffafe",
        bodyStyle: "FASTBACK",
        amphibious: false
    },
    STINGER_CABRIO: {
        name: "STINGER SPYDER CABRIO",
        sprId: "74",
        w: 48,
        h: 24,
        maxSpeed: 455,
        accel: 370,
        turnSpeed: 3.4,
        grip: 0.90,
        driftGrip: 0.962,
        maxHp: 230,
        color: "#ef4444",
        secondaryColor: "#7f1d1d",
        stripeColor: "#fecaca",
        bodyStyle: "CONVERTIBLE",
        isConvertible: true,
        amphibious: false
    },
    TURISMO_CABRIO: {
        name: "ROADSTER GT SPYDER",
        sprId: "75",
        w: 48,
        h: 24,
        maxSpeed: 460,
        accel: 375,
        turnSpeed: 3.45,
        grip: 0.91,
        driftGrip: 0.962,
        maxHp: 235,
        color: "#a855f7",
        secondaryColor: "#4c1d95",
        stripeColor: "#f3e8ff",
        bodyStyle: "CONVERTIBLE",
        isConvertible: true,
        amphibious: false
    },

    // --- 4. SEDANS, COMPACTS, WAGONS, TAXIS & MICRO-CARS ---
    VICE_CAB: {
        name: "KAUFMAN YELLOW CAB",
        sprId: "66",
        w: 48,
        h: 24,
        maxSpeed: 375,
        accel: 295,
        turnSpeed: 3.15,
        grip: 0.89,
        driftGrip: 0.965,
        maxHp: 250,
        color: "#f59e0b",
        secondaryColor: "#78350f",
        stripeColor: "#fde68a",
        bodyStyle: "MUSCLE",
        useBaseOnly: true,
        amphibious: false
    },
    REGAL_SEDAN: {
        name: "REGAL LUXURY SEDAN",
        sprId: "63",
        w: 50,
        h: 24,
        maxSpeed: 370,
        accel: 285,
        turnSpeed: 3.0,
        grip: 0.90,
        driftGrip: 0.958,
        maxHp: 265,
        color: "#94a3b8",
        secondaryColor: "#1e293b",
        stripeColor: "#f1f5f9",
        bodyStyle: "MUSCLE",
        amphibious: false
    },
    BEETLE_BUG: {
        name: "BF WEEVIL / BUG COMPACT",
        sprId: "65",
        w: 44,
        h: 22,
        maxSpeed: 350,
        accel: 280,
        turnSpeed: 3.35,
        grip: 0.90,
        driftGrip: 0.96,
        maxHp: 220,
        color: "#38bdf8",
        secondaryColor: "#0369a1",
        stripeColor: "#e0f2fe",
        bodyStyle: "COMPACT",
        amphibious: false
    },
    MUNDANO_WAGON: {
        name: "MUNDANO STATION WAGON",
        sprId: "68",
        w: 52,
        h: 24,
        maxSpeed: 360,
        accel: 275,
        turnSpeed: 2.95,
        grip: 0.90,
        driftGrip: 0.955,
        maxHp: 275,
        color: "#84cc16",
        secondaryColor: "#365314",
        stripeColor: "#ecfccb",
        bodyStyle: "WAGON",
        amphibious: false
    },
    LELAND_SEDAN: {
        name: "ALBANY LELAND SEDAN",
        sprId: "69",
        w: 50,
        h: 23,
        maxSpeed: 355,
        accel: 270,
        turnSpeed: 2.95,
        grip: 0.90,
        driftGrip: 0.955,
        maxHp: 265,
        color: "#fbbf24",
        secondaryColor: "#78350f",
        stripeColor: "#fef3c7",
        bodyStyle: "SEDAN",
        amphibious: false
    },
    MICRO_KART: {
        name: "POCKET MICRO-CAR",
        sprId: "80",
        w: 32,
        h: 20,
        maxSpeed: 420,
        accel: 390,
        turnSpeed: 4.15,
        grip: 0.92,
        driftGrip: 0.965,
        maxHp: 175,
        color: "#f43f5e",
        secondaryColor: "#881337",
        stripeColor: "#ffe4e6",
        bodyStyle: "COMPACT",
        amphibious: false
    },

    // --- 5. 4X4 JEEPS, DUNE BUGGIES, PICKUPS & VANS ---
    MONSTER_BUGGY: {
        name: "MONSTER DUNE BUGGY 4X4",
        sprId: "56",
        w: 52,
        h: 28,
        maxSpeed: 395,
        accel: 335,
        turnSpeed: 3.15,
        grip: 0.92,
        driftGrip: 0.955,
        maxHp: 350,
        color: "#eab308",
        secondaryColor: "#713f12",
        stripeColor: "#fef08a",
        bodyStyle: "TRUCK",
        amphibious: false
    },
    GATOR_4X4: {
        name: "GRASSRIVERS RANCHER 4X4",
        sprId: "62",
        w: 50,
        h: 25,
        maxSpeed: 365,
        accel: 295,
        turnSpeed: 2.95,
        grip: 0.91,
        driftGrip: 0.95,
        maxHp: 340,
        color: "#4d7c0f",
        secondaryColor: "#1a2e05",
        stripeColor: "#a3e635",
        bodyStyle: "ROADSTER_SPARE",
        isConvertible: true,
        amphibious: false
    },
    PICKUP_TRUCK: {
        name: "VAPID BISON PICKUP",
        sprId: "64",
        w: 52,
        h: 26,
        maxSpeed: 365,
        accel: 290,
        turnSpeed: 2.9,
        grip: 0.90,
        driftGrip: 0.952,
        maxHp: 330,
        color: "#dc2626",
        secondaryColor: "#7f1d1d",
        stripeColor: "#fecaca",
        bodyStyle: "TRUCK",
        amphibious: false
    },
    CAMPER_PICKUP: {
        name: "SANDKING CAMPER 4X4",
        sprId: "77",
        w: 54,
        h: 26,
        maxSpeed: 355,
        accel: 280,
        turnSpeed: 2.85,
        grip: 0.91,
        driftGrip: 0.95,
        maxHp: 350,
        color: "#0284c7",
        secondaryColor: "#0c4a6e",
        stripeColor: "#e0f2fe",
        bodyStyle: "TRUCK",
        amphibious: false
    },
    BRINKS_TRUCK: {
        name: "GRUPO SECURO ARMORED VAN",
        sprId: "76",
        w: 56,
        h: 27,
        maxSpeed: 325,
        accel: 240,
        turnSpeed: 2.5,
        grip: 0.93,
        driftGrip: 0.94,
        maxHp: 500,
        color: "#047857",
        secondaryColor: "#064e3b",
        stripeColor: "#ffd13b",
        bodyStyle: "TRUCK",
        amphibious: false
    },
    BOXVILLE_VAN: {
        name: "BOXVILLE CARGO VAN",
        sprId: "79",
        w: 58,
        h: 28,
        maxSpeed: 325,
        accel: 235,
        turnSpeed: 2.45,
        grip: 0.92,
        driftGrip: 0.945,
        maxHp: 400,
        color: "#f97316",
        secondaryColor: "#7c2d12",
        stripeColor: "#ffedd5",
        bodyStyle: "TRUCK",
        amphibious: false
    },
    HOTDOG_VAN: {
        name: "BEACH HOT-DOG / ICE-CREAM VAN",
        sprId: "81",
        w: 56,
        h: 28,
        maxSpeed: 330,
        accel: 245,
        turnSpeed: 2.55,
        grip: 0.91,
        driftGrip: 0.945,
        maxHp: 380,
        color: "#f472b6",
        secondaryColor: "#831843",
        stripeColor: "#fdf2f8",
        bodyStyle: "TRUCK",
        amphibious: false
    },

    // --- 6. BUSES, SCHOOL BUSES, STRETCH LIMOS & HEAVY RIGS (vtype = 0 in STYLE001.G24) ---
    CITY_BUS: {
        name: "LEONIDA TRANSIT CITY BUS",
        sprId: "50",
        w: 88,
        h: 28,
        maxSpeed: 315,
        accel: 215,
        turnSpeed: 2.15,
        grip: 0.94,
        driftGrip: 0.94,
        maxHp: 620,
        color: "#2563eb",
        secondaryColor: "#1e3a8a",
        stripeColor: "#dbeafe",
        bodyStyle: "TRUCK",
        useBaseOnly: true,
        amphibious: false
    },
    FLATBED_TRUCK: {
        name: "INDUSTRIAL CARGO RIG",
        sprId: "79",
        w: 64,
        h: 28,
        maxSpeed: 325,
        accel: 225,
        turnSpeed: 2.35,
        grip: 0.94,
        driftGrip: 0.94,
        maxHp: 560,
        color: "#d97706",
        secondaryColor: "#78350f",
        stripeColor: "#fef3c7",
        bodyStyle: "TRUCK",
        amphibious: false
    },
    TOUR_COACH: {
        name: "LEONIDA SCHOOL BUS",
        sprId: "53",
        w: 88,
        h: 28,
        maxSpeed: 335,
        accel: 230,
        turnSpeed: 2.2,
        grip: 0.94,
        driftGrip: 0.94,
        maxHp: 620,
        color: "#facc15",
        secondaryColor: "#713f12",
        stripeColor: "#fef08a",
        bodyStyle: "TRUCK",
        useBaseOnly: true,
        amphibious: false
    },
    TANKER_RIG: {
        name: "RON OIL HEAVY TANKER",
        sprId: "54",
        w: 92,
        h: 30,
        maxSpeed: 310,
        accel: 210,
        turnSpeed: 2.05,
        grip: 0.94,
        driftGrip: 0.94,
        maxHp: 680,
        color: "#4d7c0f",
        secondaryColor: "#1a2e05",
        stripeColor: "#bef264",
        bodyStyle: "TRUCK",
        useBaseOnly: true,
        amphibious: false
    },
    STRETCH_LIMO: {
        name: "VICE VIP STRETCH LIMOUSINE",
        sprId: "51",
        w: 90,
        h: 25,
        maxSpeed: 380,
        accel: 280,
        turnSpeed: 2.35,
        grip: 0.92,
        driftGrip: 0.95,
        maxHp: 440,
        color: "#38bdf8",
        secondaryColor: "#0f172a",
        stripeColor: "#e2e8f0",
        bodyStyle: "TRUCK",
        amphibious: false
    },

    // --- 7. POLICE, EMERGENCY, BOATS & MILITARY ---
    VCPD_CRUISER: {
        name: "VCPD INTERCEPTOR",
        sprId: "73",
        w: 48,
        h: 24,
        maxSpeed: 425,
        accel: 340,
        turnSpeed: 3.25,
        grip: 0.90,
        driftGrip: 0.96,
        maxHp: 280,
        color: "#1e293b",
        secondaryColor: "#f8fafc",
        stripeColor: "#f8fafc",
        bodyStyle: "CRUISER",
        isPolice: true,
        useBaseOnly: true,
        amphibious: false
    },
    SWAT_ENFORCER: {
        name: "VCPD SWAT ENFORCER",
        sprId: "76",
        w: 58,
        h: 28,
        maxSpeed: 330,
        accel: 240,
        turnSpeed: 2.35,
        grip: 0.93,
        driftGrip: 0.95,
        maxHp: 520,
        color: "#1e293b",
        secondaryColor: "#0f172a",
        stripeColor: "#38bdf8",
        bodyStyle: "TRUCK",
        isPolice: true,
        amphibious: false
    },
    AIRBOAT: {
        name: "EVERGLADES HYDRO-SPEEDBOAT",
        sprId: "49",
        w: 48,
        h: 26,
        maxSpeed: 385,
        accel: 310,
        turnSpeed: 3.3,
        grip: 0.85,
        driftGrip: 0.975,
        maxHp: 240,
        color: "#ea580c",
        secondaryColor: "#7c2d12",
        stripeColor: "#fde047",
        bodyStyle: "AIRBOAT",
        useBaseOnly: true,
        amphibious: true
    },
    MEDIC_AMBULANCE: {
        name: "LEONIDA MEDIC AMBULANCE",
        sprId: "58",
        w: 54,
        h: 26,
        maxSpeed: 375,
        accel: 285,
        turnSpeed: 2.85,
        grip: 0.90,
        driftGrip: 0.95,
        maxHp: 340,
        color: "#f8fafc",
        secondaryColor: "#dc2626",
        stripeColor: "#ef4444",
        bodyStyle: "AMBULANCE",
        isEmergency: true,
        useBaseOnly: true,
        amphibious: false
    },
    FIRE_TRUCK: {
        name: "LEONIDA FD FIRE ENGINE",
        sprId: "52",
        w: 62,
        h: 28,
        maxSpeed: 345,
        accel: 255,
        turnSpeed: 2.35,
        grip: 0.92,
        driftGrip: 0.95,
        maxHp: 540,
        color: "#dc2626",
        secondaryColor: "#f8fafc",
        stripeColor: "#fde047",
        bodyStyle: "FIRETRUCK",
        isEmergency: true,
        useBaseOnly: true,
        amphibious: false
    },
    PANZER_TANK: {
        name: "PANZER RHINO TANK",
        sprId: "940",
        w: 58,
        h: 32,
        maxSpeed: 245,
        accel: 230,
        turnSpeed: 2.45,
        grip: 0.96,
        driftGrip: 0.96,
        maxHp: 1800,
        color: "#3f6212",
        secondaryColor: "#1a2e05",
        stripeColor: "#84cc16",
        bodyStyle: "TANK",
        isTank: true,
        crushesCars: true,
        hasTurret: true,
        useBaseOnly: true,
        amphibious: false
    }
};

const WEAPON_SPECS = {
    FIST: { name: "FIST", fireRate: 0.35, range: 28, damage: 24, speed: 500, spread: 0.1, isMelee: true },
    PISTOL: { name: "PISTOL", fireRate: 0.25, range: 360, damage: 34, speed: 600, spread: 0.03 },
    UZI: { name: "MACHINEGUN", fireRate: 0.0625, range: 360, damage: 22, speed: 600, spread: 0.08 },
    SHOTGUN: { name: "PUMP SHOTGUN", fireRate: 0.52, range: 270, damage: 22, speed: 560, spread: 0.24, pellets: 6 },
    FLAMETHROWER: { name: "FLAMETHROWER", fireRate: 0.0625, range: 155, damage: 10, speed: 270, spread: 0.16, isFlame: true },
    ROCKET: { name: "ROCKET LAUNCHER", fireRate: 0.85, range: 1100, damage: 240, speed: 380, spread: 0.01, isRocket: true }
};

// Car sprite delta damage bit indices from GameDefs.h (lines 39-45)
const CAR_DAMAGE_DELTA = Object.freeze({
    FR: 0, // front right
    BL: 1, // back left
    ML: 2, // middle left
    FL: 3, // front left
    BR: 4, // back right
    MR: 5, // middle right
    WS: 10 // windshield broken
});

// Vehicle tire identifiers from Vehicle.h (eCarTire)
const CAR_TIRE = Object.freeze({
    FRONT: 0,
    REAR: 1
});

// Pedestrian finite states from GameDefs.h (ePedestrianState)
const PED_STATE = Object.freeze({
    UNSPECIFIED: 0,
    STANDING_STILL: 1,
    WALKS: 2,
    RUNS: 3,
    FALLING: 4,
    ENTERING_CAR: 5,
    EXITING_CAR: 6,
    DRIVING_CAR: 7,
    SLIDE_ON_CAR: 8,
    DEAD: 9,
    STUNNED: 10,
    DROWNING: 11,
    ELECTROCUTED: 12
});

// Sprite draw order priority from GameDefs.h (eSpriteDrawOrder)
const SPRITE_DRAW_ORDER = Object.freeze({
    BACKGROUND: 0,
    GROUND_DECALS: 1,
    CORPSE: 2,
    TIRE_MARKS: 3,
    MAP_OBJECT: 4,
    PEDESTRIAN: 5,
    CAR_PASSENGER: 6,
    CAR: 7,
    CONVERTIBLE_PASSENGER: 8,
    CAR_ROOF: 9,
    JUMPING_PEDESTRIAN: 10,
    TREES: 11,
    PROJECTILES: 12,
    EXPLOSION: 13,
    HUD_ARROW: 14,
    FOREGROUND: 15
});

class Vehicle {
    constructor(id, specKey, x, y, angle = 0) {
        const spec = VEHICLE_SPECS[specKey] || VEHICLE_SPECS.VICE_CAB;
        this.id = id;
        this.specKey = specKey;
        this.name = spec.name;
        this.w = spec.w;
        this.h = spec.h;
        this.maxSpeed = spec.maxSpeed;
        this.accel = spec.accel;
        this.turnSpeed = spec.turnSpeed;
        this.grip = spec.grip;
        this.driftGrip = spec.driftGrip;
        this.maxHp = spec.maxHp;
        this.hp = spec.maxHp;
        this.color = spec.color;
        this.secondaryColor = spec.secondaryColor || "#1e293b";
        this.stripeColor = spec.stripeColor;
        this.bodyStyle = spec.bodyStyle || "MUSCLE";
        this.sprId = spec.sprId || "66";
        this.riderSprId = spec.riderSprId || null;
        this.isMotorcycle = Boolean(spec.isMotorcycle);
        this.isConvertible = Boolean(spec.isConvertible);
        this.isTank = Boolean(spec.isTank);
        this.useBaseOnly = Boolean(spec.useBaseOnly);
        this.isPolice = Boolean(spec.isPolice);
        this.isEmergency = Boolean(spec.isPolice || spec.isEmergency);
        this.crushesCars = Boolean(spec.crushesCars);
        this.hasTurret = Boolean(spec.hasTurret);
        this.turretAngle = angle;
        this.amphibious = Boolean(spec.amphibious);

        // Authentic .G24 Vehicle Color Remap index (-1 = base palette, 0..5 = 6 factory paintjob remaps)
        let idHash = 0;
        const idStr = String(id || "0");
        for (let i = 0; i < idStr.length; i++) {
            idHash = (idHash * 31 + idStr.charCodeAt(i)) | 0;
        }
        const paletteSlot = Math.abs(idHash) % 7;
        this.remapIdx = (this.useBaseOnly || this.isPolice || this.isEmergency || this.isTank || this.amphibious)
            ? -1
            : (paletteSlot === 6 ? -1 : paletteSlot);

        this.x = x;
        this.y = y;
        this.z = 2.0;
        this.vx = 0;
        this.vy = 0;
        this.angle = angle;
        this.angularVelocity = 0;
        this.speed = 0;
        this.drifting = false;
        this.steerAngleRad = 0; // 1997 GTA 1 Vehicle::UpdateSteer (±30 deg front wheel lock)

        // 1997 GTA 1 2-axle tire offsets in pixels along longitudinal axis (mFrontTireOffset, mRearTireOffset)
        this.frontTireOffset = this.w * 0.34;
        this.rearTireOffset = -this.w * 0.34;

        this.driver = null; // 'PLAYER', 'AI_TRAFFIC', 'AI_COP', 'AI_EMERGENCY', or null
        this.hasJason = false;
        this.destroyed = false;
        this.burnTimer = 0;
        this.chainExplodeTimer = 0; // 1997 GTA 1 mCarExplosionChainDelayTime (0.28s chain reaction)
        this.sirenActive = false;
        this.sirenPhase = Math.random() * 6.28;
        this.aiTargetAngle = angle;
        this.aiTurnCooldown = 0;
        this.missionTag = null;

        // Authentic 1997 1997 GTA 1 6-Zone Localized .G24 Delta Damage & Door Animation (Vehicle.cpp:717-748)
        this.damageDeltaBits = 0;
        this.frontDented = false;
        this.rearDented = false;
        this.heavyDented = false;
        this.doorOpenTimer = 0;
        this.doorOpenDuration = 0.48;

        // Authentic 1997 1997 GTA 1 Traffic & Pursuit AI State
        this.aiState = "CRUISE"; // CRUISE, STOPPED_LIGHT, FOLLOWING, LANE_CHANGE, YIELD_SIREN, PANIC, PURSUIT, REVERSING
        this.aiBlockX = -1;
        this.aiBlockY = -1;
        this.aiChosenDir = null;
        this.aiTurnSeed = Math.random();
        this.aiLaneChangeCooldown = 0;
        this.aiLaneShiftTimer = 0;
        this.aiTargetBlockX = -1;
        this.aiTargetBlockY = -1;
        this.aiStuckTimer = 0;
        this.aiBlockedTimer = 0;
        this.aiReverseTimer = 0;
        this.aiReverseSteer = 1;
        this.aiPanicTimer = 0;
        this.aiHornCooldown = 0;
        this.aiBailTimer = 0;

        // Archetype-specific driving personality (Sport/Bikes vs Sedans vs Heavy Trucks/Buses)
        const hashSeed = Math.abs((id || "0").charCodeAt((id || "0").length - 1)) % 5;
        const isSportOrBike = Boolean(this.isMotorcycle || spec.maxSpeed >= 415);
        const isHeavyVehicle = Boolean(this.w >= 72 || spec.bodyStyle === "TRUCK");
        this. isHeavyVehicle = isHeavyVehicle;
        if (isSportOrBike) {
            this.aiCruiseFactor = 0.55 + hashSeed * 0.032; // 0.55 .. 0.68 agile cruise
            this.aiStopDist = 48;
            this.aiScanDist = 118;
        } else if (isHeavyVehicle) {
            this.aiCruiseFactor = 0.41 + hashSeed * 0.022; // 0.41 .. 0.50 steady heavy cruise
            this.aiStopDist = 68;
            this.aiScanDist = 132;
        } else {
            this.aiCruiseFactor = 0.48 + hashSeed * 0.030; // 0.48 .. 0.60 standard cruise
            this.aiStopDist = 56;
            this.aiScanDist = 120;
        }
        this.aiAggressive = Boolean(
            this.isMotorcycle ||
            specKey === "TULIP_MUSCLE" ||
            specKey === "CHALLENGER_RT" ||
            specKey === "GATOR_4X4" ||
            specKey === "PICKUP_TRUCK" ||
            specKey === "MONSTER_BUGGY"
        );

        // Classic 1997 GTA 1 Car Bomb
        this.hasBomb = false;
        this.bombArmed = false;
        this.bombTimer = 0;
        this.bombTickSecond = 5;
        this.resellValue = spec.maxSpeed > 420 ? 22000 : (spec.maxSpeed > 370 ? 15000 : 10000);
    }

    /* ========================================================================
       1997 GTA 1 2-AXLE TIRE KINEMATICS & CHASSIS OBB GEOMETRY (Vehicle.cpp)
       ======================================================================== */
    getTireOffset(tireID) {
        return tireID === CAR_TIRE.FRONT ? this.frontTireOffset : this.rearTireOffset;
    }

    getTirePosition(tireID) {
        const offset = this.getTireOffset(tireID);
        return {
            x: this.x + Math.cos(this.angle) * offset,
            y: this.y + Math.sin(this.angle) * offset
        };
    }

    getTireForward(tireID) {
        const ang = tireID === CAR_TIRE.FRONT ? (this.angle + this.steerAngleRad) : this.angle;
        return { x: Math.cos(ang), y: Math.sin(ang) };
    }

    getTireLateral(tireID) {
        const fwd = this.getTireForward(tireID);
        return { x: -fwd.y, y: fwd.x };
    }

    getTireVelocity(tireID) {
        const offset = this.getTireOffset(tireID);
        const tangentX = -Math.sin(this.angle) * (this.angularVelocity * offset);
        const tangentY = Math.cos(this.angle) * (this.angularVelocity * offset);
        return {
            x: this.vx + tangentX,
            y: this.vy + tangentY
        };
    }

    getTireForwardVelocity(tireID) {
        const fwd = this.getTireForward(tireID);
        const vel = this.getTireVelocity(tireID);
        return vel.x * fwd.x + vel.y * fwd.y;
    }

    getTireLateralVelocity(tireID) {
        const lat = this.getTireLateral(tireID);
        const vel = this.getTireVelocity(tireID);
        return vel.x * lat.x + vel.y * lat.y;
    }

    getChassisCorners() {
        const hl = this.w * 0.5;
        const hw = this.h * 0.5;
        const cosA = Math.cos(this.angle);
        const sinA = Math.sin(this.angle);
        const local = [
            [hl, -hw],
            [hl, hw],
            [-hl, hw],
            [-hl, -hw]
        ];
        return local.map(([lx, ly]) => ({
            x: this.x + lx * cosA - ly * sinA,
            y: this.y + lx * sinA + ly * cosA
        }));
    }

    getTireCorners(tireID) {
        const pos = this.getTirePosition(tireID);
        const ang = tireID === CAR_TIRE.FRONT ? (this.angle + this.steerAngleRad) : this.angle;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        // CAR_WHEEL_SIZE_H_PX = 12, CAR_WHEEL_SIZE_W_PX = 6 (GameDefs.h:26-27)
        const hl = 6.0;
        const hw = 3.0;
        const local = [
            [hl, -hw],
            [hl, hw],
            [-hl, hw],
            [-hl, -hw]
        ];
        return local.map(([lx, ly]) => ({
            x: pos.x + lx * cosA - ly * sinA,
            y: pos.y + lx * sinA + ly * cosA
        }));
    }

    getDoorPosition(doorIdx = 0) {
        const side = doorIdx === 0 ? -1 : 1;
        const cosA = Math.cos(this.angle);
        const sinA = Math.sin(this.angle);
        const lx = this.w * 0.06;
        const ly = side * (this.h * 0.5 + 4);
        return {
            x: this.x + lx * cosA - ly * sinA,
            y: this.y + lx * sinA + ly * cosA
        };
    }

    hasDamageDelta(deltaBit) {
        return (this.damageDeltaBits & (1 << deltaBit)) !== 0;
    }

    /* ========================================================================
       1997 GTA 1 6-ZONE LOCAL CONTACT POINT DAMAGE (Vehicle::ReceiveImpact, lines 717-748)
       Transforms hit point into chassis local space and sets FL/FR/ML/MR/BL/BR
       using fr_bias = maxx / 3.0f.
       ======================================================================== */
    receiveImpactDamage(amount, hitX, hitY, isExplosive = false) {
        if (this.destroyed || amount <= 0) return;
        const wasBurning = this.burnTimer > 0 || this.hp <= 30;
        this.hp -= amount;
        if (!isExplosive && this.hp <= 0) {
            if (!wasBurning) {
                this.hp = 1;
                this.burnTimer = Math.max(this.burnTimer, 0.1);
            } else {
                this.hp = 1;
                this.burnTimer += amount * 0.045;
            }
        }

        if (hitX !== undefined && hitY !== undefined) {
            const dx = hitX - this.x;
            const dy = hitY - this.y;
            const cosA = Math.cos(this.angle);
            const sinA = Math.sin(this.angle);
            const localX = dx * cosA + dy * sinA;
            const localY = -dx * sinA + dy * cosA;
            const frBias = (this.w * 0.5) / 3.0; // fr_bias = maxx / 3.0f (Vehicle.cpp:723)

            if (localX > frBias) {
                if (localY < 0.0) this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.FL);
                else this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.FR);
                this.frontDented = true;
            } else if (localX < -frBias) {
                if (localY < 0.0) this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.BL);
                else this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.BR);
                this.rearDented = true;
            } else {
                if (localY < 0.0) this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.ML);
                else this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.MR);
                this.frontDented = true;
            }
        } else {
            this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.FL) | (1 << CAR_DAMAGE_DELTA.FR);
            this.frontDented = true;
        }

        if (this.hp < this.maxHp * 0.48) {
            this.heavyDented = true;
            this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.WS);
        }
    }

    resetDamage() {
        this.hp = this.maxHp;
        this.burnTimer = 0;
        this.damageDeltaBits = 0;
        this.frontDented = false;
        this.rearDented = false;
        this.heavyDented = false;
    }

    normalizeAngle(a) {
        let diff = a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    triggerPanic(duration = 7.5) {
        if (this.driver === "AI_TRAFFIC") {
            this.aiPanicTimer = Math.max(this.aiPanicTimer, duration);
            this.aiState = "PANIC";
        }
    }

    /* ========================================================================
       SMART MULTI-LANE OVERTAKING (Parallel Same-Direction Lane Change)
       Checks adjacent road lane on 4-lane boulevards & highways when blocked ahead
       ======================================================================== */
    tryAdjacentLaneChange(bx, by, curZ, map, game) {
        if (this.aiLaneChangeCooldown > 0 || !this.aiChosenDir || this.aiChosenDir.isTurn) return false;
        const lidZ1 = map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0;
        if (lidZ1 === 25 || lidZ1 === 24) return false;

        const dx = this.aiChosenDir.dx || 0;
        const dy = this.aiChosenDir.dy || 0;
        if (dx === 0 && dy === 0) return false;

        const perpX = -dy;
        const perpY = dx;
        const sides = this.aiTurnSeed > 0.5 ? [-1, 1] : [1, -1];
        const fx = Math.cos(this.aiChosenDir.angle);
        const fy = Math.sin(this.aiChosenDir.angle);

        for (const side of sides) {
            const nbx = bx + perpX * side;
            const nby = by + perpY * side;
            if (nbx < 2 || nbx >= MAP_COLS - 2 || nby < 2 || nby >= MAP_ROWS - 2) continue;

            const nb = map.getNavigationBlock ? map.getNavigationBlock(nbx, nby, curZ) : null;
            if (!nb || nb.groundType !== GROUND_TYPE.ROAD || nb.isRailway) continue;
            const nlid = map.getBlockInfo ? map.getBlockInfo(nbx, nby, 1).lid : 0;
            if (nlid === 25) continue;

            // Adjacent lane must permit the exact same travel direction (and not be an oncoming lane)
            const sameDir =
                (dx === 1 && nb.right && !nb.left) ||
                (dx === -1 && nb.left && !nb.right) ||
                (dy === 1 && nb.down && !nb.up) ||
                (dy === -1 && nb.up && !nb.down);
            if (!sameDir) continue;

            // Verify the forward block in the adjacent lane is also a valid road block
            const fnb = map.getNavigationBlock ? map.getNavigationBlock(nbx + dx, nby + dy, curZ) : null;
            if (!fnb || fnb.groundType !== GROUND_TYPE.ROAD) continue;

            // Check that no vehicle or pedestrian is occupying the adjacent lane window [-44px .. +135px]
            const laneCenterX = (nbx + 0.5) * TILE_SIZE;
            const laneCenterY = (nby + 0.5) * TILE_SIZE;
            let laneClear = true;

            if (game && Array.isArray(game.vehicles)) {
                for (const other of game.vehicles) {
                    if (other === this) continue;
                    if (other.z !== undefined && Math.abs(other.z - curZ) > 0.85) continue;
                    const odx = other.x - laneCenterX;
                    const ody = other.y - laneCenterY;
                    const longDist = odx * fx + ody * fy;
                    const latDist = Math.abs(odx * perpX + ody * perpY);
                    if (longDist > -44 && longDist < 135 && latDist < 28) {
                        laneClear = false;
                        break;
                    }
                }
            }

            if (laneClear && game && game.player && !game.player.inVehicle && !game.player.dead) {
                const pdx = game.player.x - laneCenterX;
                const pdy = game.player.y - laneCenterY;
                const longDist = pdx * fx + pdy * fy;
                const latDist = Math.abs(pdx * perpX + pdy * perpY);
                if (longDist > -24 && longDist < 110 && latDist < 24) {
                    laneClear = false;
                }
            }

            if (laneClear) {
                this.aiBlockX = nbx;
                this.aiBlockY = nby;
                this.aiTargetBlockX = nbx + dx;
                this.aiTargetBlockY = nby + dy;
                this.aiLaneChangeCooldown = this.isMotorcycle ? 1.8 : 2.8;
                this.aiLaneShiftTimer = 0.58;
                this.aiState = "LANE_CHANGE";
                return true;
            }
        }
        return false;
    }

    /* ========================================================================
       AUTHENTIC 1997 GTA 1 TRAFFIC AI (NYC.CMP Arrow Graph + Strict Lane Discipline + Deadlock-Free Intersections)
       ======================================================================== */
    computeTrafficControls(dt, map, game) {
        if (this.aiHornCooldown > 0) this.aiHornCooldown -= dt;
        if (this.aiLaneChangeCooldown > 0) this.aiLaneChangeCooldown -= dt;
        if (this.aiLaneShiftTimer > 0) this.aiLaneShiftTimer = Math.max(0, this.aiLaneShiftTimer - dt);
        if (this.aiPanicTimer > 0) this.aiPanicTimer = Math.max(0, this.aiPanicTimer - dt);

        const curZ = this.z !== undefined ? this.z : 2.0;
        this.aiReverseTimer = 0;
        this.aiLaneShiftTimer = 0;

        const bx = Math.floor(this.x / TILE_SIZE);
        const by = Math.floor(this.y / TILE_SIZE);
        const curBlk = map.getNavigationBlock ? map.getNavigationBlock(bx, by, curZ) : null;
        const lidZ1 = (map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0);

        // Reset single-turn intersection guard once the car exits the intersection (lidZ1 !== 25)
        if (lidZ1 !== 25) {
            this.aiTurnedInIntersection = false;
        }

        // 1. Commit to a valid outgoing NYC.CMP arrow direction upon entering each road block.
        // Pass the previously committed cardinal angle (refAngle) so a car mid-turn doesn't think its new lane is a 2nd turn!
        const movedOutOfLane = (bx !== this.aiBlockX || by !== this.aiBlockY || !this.aiChosenDir);
        if (movedOutOfLane) {
            const refAngle = this.aiChosenDir && typeof this.aiChosenDir.angle === "number"
                ? this.aiChosenDir.angle
                : this.angle;
            this.aiBlockX = bx;
            this.aiBlockY = by;
            this.aiTurnSeed = (this.aiTurnSeed * 1.6180339887 + 0.31) % 1.0;
            if (typeof map.chooseNextRoadBlock === "function") {
                this.aiChosenDir = map.chooseNextRoadBlock(
                    bx,
                    by,
                    refAngle,
                    curZ,
                    this.aiTurnSeed,
                    Boolean(this.aiTurnedInIntersection)
                );
            } else {
                const snapAngle = Math.round(refAngle / (Math.PI * 0.5)) * (Math.PI * 0.5);
                this.aiChosenDir = { dx: Math.round(Math.cos(snapAngle)), dy: Math.round(Math.sin(snapAngle)), angle: snapAngle, isTurn: false };
            }
            if (this.aiChosenDir.isTurn) {
                this.aiTurnedInIntersection = true;
            }
            this.aiTargetBlockX = bx + this.aiChosenDir.dx;
            this.aiTargetBlockY = by + this.aiChosenDir.dy;
        }

        const isPanicked = this.aiPanicTimer > 0 || this.driver === "AI_EMERGENCY";
        let desiredThrottle = isPanicked ? 0.78 : this.aiCruiseFactor;
        this.aiState = isPanicked ? "PANIC" : "CRUISE";

        // 2. Strict Cardinal Lane-Centered Steering & Clean 90-Degree Pivot Alignment
        const tx = (this.aiTargetBlockX + 0.5) * TILE_SIZE;
        const ty = (this.aiTargetBlockY + 0.5) * TILE_SIZE;
        const desiredAngle = Math.atan2(ty - this.y, tx - this.x);
        const angleDiff = this.normalizeAngle(desiredAngle - this.angle);
        let steer = Math.max(-1, Math.min(1, angleDiff * 2.4));

        const laneAngleDiff = this.normalizeAngle(this.aiChosenDir.angle - this.angle);
        if (Math.abs(laneAngleDiff) < 0.025) {
            this.angle = this.aiChosenDir.angle;
        } else {
            this.angle += laneAngleDiff * Math.min(1, dt * (this.aiChosenDir.isTurn ? 10.5 : 15.0));
        }
        this.angularVelocity = 0;
        this.steerAngleRad = 0;
        steer = 0;

        // Always center vehicle smoothly onto the active lane centerline (including when pivoting into a 90-deg turn)
        const maxLatStep = (this.aiChosenDir.isTurn ? 82 : 98) * dt;
        if (this.aiChosenDir.dx !== 0) {
            const centerY = (by + 0.5) * TILE_SIZE;
            const dyErr = centerY - this.y;
            this.y += Math.max(-maxLatStep, Math.min(maxLatStep, dyErr * Math.min(1, dt * 10.5)));
        } else if (this.aiChosenDir.dy !== 0) {
            const centerX = (bx + 0.5) * TILE_SIZE;
            const dxErr = centerX - this.x;
            this.x += Math.max(-maxLatStep, Math.min(maxLatStep, dxErr * Math.min(1, dt * 10.5)));
        }

        // 2B. Look-Ahead Turn Speed Control (Never uses negative reverse throttle!)
        const maxTurnSpd = this.isHeavyVehicle ? 72 : 88;
        if (Math.abs(laneAngleDiff) > 0.16 || this.aiChosenDir.isTurn) {
            if (this.speed > maxTurnSpd) {
                desiredThrottle = 0;
                const slowMult = Math.pow(0.15, dt);
                this.vx *= slowMult;
                this.vy *= slowMult;
                this.speed *= slowMult;
            } else {
                desiredThrottle = Math.min(desiredThrottle, 0.42);
            }
        }

        // 3. Authentic GTA 1 Entrance Crosswalk Traffic Lights
        // Stop ONLY before entering an intersection (lidZ1 === 25), and if already past the stop line on the crosswalk, keep going to clear!
        const nextLidZ1 = map.getBlockInfo ? map.getBlockInfo(this.aiTargetBlockX, this.aiTargetBlockY, 1).lid : 0;
        const distToTargetCenter = Math.hypot(tx - this.x, ty - this.y);
        const isBeforeStopLine = (lidZ1 === 24 && nextLidZ1 === 25 && distToTargetCenter > 50);

        if (!isPanicked && curBlk && (curBlk.trafficHint === 1 || lidZ1 === 24) && isBeforeStopLine && game) {
            const isNSLane = Boolean(curBlk.up || curBlk.down) && !curBlk.left && !curBlk.right;
            const isEWLane = Boolean(curBlk.left || curBlk.right) && !curBlk.up && !curBlk.down;
            const nsRed = isNSLane && typeof game.isNSGreen === "function" && !game.isNSGreen();
            const ewRed = isEWLane && typeof game.isEWGreen === "function" && !game.isEWGreen();
            if (nsRed || ewRed) {
                this.aiState = "STOPPED_LIGHT";
                desiredThrottle = 0;
                const brakeMult = Math.pow(0.015, dt);
                this.vx *= brakeMult;
                this.vy *= brakeMult;
                this.speed *= brakeMult;
                if (Math.abs(this.speed) < 12) {
                    this.vx = 0;
                    this.vy = 0;
                    this.speed = 0;
                }
            }
        }

        // 4. Multi-Zone Forward Radar: True Bumper-to-Bumper Same-Lane Gap + Moving Cross-Traffic Check
        const fx = Math.cos(this.angle);
        const fy = Math.sin(this.angle);
        const rx = -fy;
        const ry = fx;

        let closestBumperGap = 999;
        let closestEntity = null;
        let isPlayerBlocking = false;
        let sirenYield = false;
        let crossTrafficYield = false;
        const inIntersectionBox = (lidZ1 === 25);

        if (game && Array.isArray(game.vehicles)) {
            for (const other of game.vehicles) {
                if (other === this) continue;
                if (other.z !== undefined && Math.abs(other.z - curZ) > 0.85) continue;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 180) continue;

                const forwardDist = dx * fx + dy * fy;
                const lateralDist = Math.abs(dx * rx + dy * ry);
                const cosDiff = Math.cos(other.angle - this.angle);

                // A. Yield to nearby active Police / Ambulance / Fire Engine sirens!
                if (!isPanicked && this.driver === "AI_TRAFFIC" && other.sirenActive && !other.destroyed && dist < 140) {
                    if (forwardDist > -20 && forwardDist < 105 && lateralDist < 42) {
                        sirenYield = true;
                    }
                }

                // B. Same-Direction Vehicle Ahead in Same Lane (cosDiff > 0.55):
                // Strictly maintain bumper-to-bumper gap behind the car ahead in our lane.
                const halfWidthSum = (this.h + (other.h || 24)) * 0.44 + 3;
                const halfLengthSum = ((this.w || 48) + (other.w || 48)) * 0.32 + 5;
                if (cosDiff > 0.55 && forwardDist > 6 && lateralDist < halfWidthSum) {
                    const bumperGap = Math.max(0, forwardDist - halfLengthSum);
                    if (bumperGap < closestBumperGap) {
                        closestBumperGap = bumperGap;
                        closestEntity = other;
                        isPlayerBlocking = other.driver === "PLAYER";
                    }
                }

                // C. Moving Cross-Traffic Inside Intersection Box (lidZ1 === 25):
                // NEVER yield to a stopped car (which would cause both cars to wait forever!).
                // Only yield briefly if a perpendicular car is ACTIVELY MOVING across our path right in front of us!
                const otherSpd = Math.abs(other.speed || Math.hypot(other.vx || 0, other.vy || 0));
                if (inIntersectionBox && cosDiff <= 0.55 && !other.destroyed && (otherSpd > 18 || other.driver === "PLAYER")) {
                    if (forwardDist > 4 && forwardDist < 62 && lateralDist < 30) {
                        const otherFx = Math.cos(other.angle);
                        const otherFy = Math.sin(other.angle);
                        const theirForwardDist = (-dx) * otherFx + (-dy) * otherFy;
                        const mustYieldToOther =
                            other.driver === "PLAYER" ||
                            other.sirenActive ||
                            (theirForwardDist > -10 && theirForwardDist < forwardDist);
                        if (mustYieldToOther) {
                            crossTrafficYield = true;
                        }
                    }
                }
            }
        }

        // Check pedestrians or player on foot directly in front of car's bumper
        if (!isPanicked && game) {
            const myFrontHalf = (this.w || 48) * 0.34 + 6;
            if (game.player && !game.player.inVehicle && !game.player.dead) {
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                const forwardDist = dx * fx + dy * fy;
                const lateralDist = Math.abs(dx * rx + dy * ry);
                if (forwardDist > 6 && forwardDist < 68 && lateralDist < 18) {
                    const gap = Math.max(0, forwardDist - myFrontHalf);
                    if (gap < closestBumperGap) {
                        closestBumperGap = gap;
                        closestEntity = game.player;
                        isPlayerBlocking = true;
                    }
                }
            }
            if (Array.isArray(game.peds)) {
                for (const ped of game.peds) {
                    if (ped.dead) continue;
                    const dx = ped.x - this.x;
                    const dy = ped.y - this.y;
                    if (Math.abs(dx) > 65 || Math.abs(dy) > 65) continue;
                    const forwardDist = dx * fx + dy * fy;
                    const lateralDist = Math.abs(dx * rx + dy * ry);
                    if (forwardDist > 6 && forwardDist < 52 && lateralDist < 14) {
                        const gap = Math.max(0, forwardDist - myFrontHalf);
                        if (gap < closestBumperGap) {
                            closestBumperGap = gap;
                            closestEntity = ped;
                        }
                    }
                }
            }
        }

        // 5. Smooth Forward-Only Speed Regulation (Never reverses, never freezes when gap >= 18px!)
        if (sirenYield || crossTrafficYield) {
            this.aiState = sirenYield ? "YIELD_SIREN" : "FOLLOWING";
            desiredThrottle = 0;
            const brakeMult = Math.pow(0.02, dt);
            this.vx *= brakeMult;
            this.vy *= brakeMult;
            this.speed *= brakeMult;
        } else if (closestEntity && closestBumperGap < 72) {
            const obstacleSpeed = closestEntity.speed !== undefined ? Math.max(0, closestEntity.speed) : 0;
            this.aiState = "FOLLOWING";
            if (closestBumperGap < 18) {
                desiredThrottle = 0;
                const brakeMult = Math.pow(0.015, dt);
                this.vx *= brakeMult;
                this.vy *= brakeMult;
                this.speed *= brakeMult;
                if (Math.abs(this.speed) < 10) {
                    this.vx = 0;
                    this.vy = 0;
                    this.speed = 0;
                }
                if (this.aiHornCooldown <= 0 && game && game.audio && isPlayerBlocking) {
                    this.aiHornCooldown = 4.2 + Math.random() * 3.0;
                    const distToPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);
                    if (distToPlayer < 420) {
                        game.audio.playHorn();
                    }
                }
            } else {
                // Proportional closing speed: rolls smoothly up to the 18px bumper gap even if lead car is stopped,
                // and accelerates immediately as soon as the lead car moves!
                const targetSpd = obstacleSpeed * 0.92 + (closestBumperGap - 18) * 1.65;
                if (this.speed > targetSpd + 8) {
                    desiredThrottle = 0;
                    const slowMult = Math.pow(0.12, dt);
                    this.vx *= slowMult;
                    this.vy *= slowMult;
                    this.speed *= slowMult;
                } else if (this.speed < targetSpd) {
                    desiredThrottle = Math.min(this.aiCruiseFactor, 0.48);
                } else {
                    desiredThrottle = 0.18;
                }
            }
        }

        return { throttle: desiredThrottle, steer, handbrake: false };
    }

    ChosenDirDxOrZero() {
        return this.aiChosenDir ? (this.aiChosenDir.dx || 0) : 0;
    }

    ChosenDirDyOrZero() {
        return this.aiChosenDir ? (this.aiChosenDir.dy || 0) : 0;
    }

    /* ========================================================================
       HYBRID ROAD-GRAPH + TACTICAL FEELER PURSUIT (VCPD Police & Emergency AI)
       Uses road-network intersection routing when blocked by buildings/far away,
       and switches to 9-feeler tactical interception + PIT maneuver on line-of-sight!
       ======================================================================== */
    computeTargetRoadOrFeelerControls(dt, map, game, targetX, targetY, targetVx = 0, targetVy = 0, maxThrottle = 0.94, allowPit = false) {
        const curZ = this.z !== undefined ? this.z : 2.0;
        if (this.aiLaneChangeCooldown > 0) this.aiLaneChangeCooldown -= dt;
        if (this.aiLaneShiftTimer > 0) this.aiLaneShiftTimer = Math.max(0, this.aiLaneShiftTimer - dt);

        if (this.aiReverseTimer > 0) {
            this.aiReverseTimer -= dt;
            const rearX = this.x - Math.cos(this.angle) * (this.w * 0.48 + 10);
            const rearY = this.y - Math.sin(this.angle) * (this.w * 0.48 + 10);
            if (
                map.isWaterAtPixel(rearX, rearY) ||
                map.resolveCircleBuildingCollision(rearX, rearY, 14, curZ).hit
            ) {
                this.aiReverseTimer = 0;
            }
            if (this.aiReverseTimer <= 0) {
                this.aiReverseTimer = 0;
                this.aiBlockX = -1;
                this.aiBlockY = -1;
                this.aiChosenDir = null;
            } else {
                this.aiState = "REVERSING";
                return { throttle: -0.75, steer: this.aiReverseSteer, handbrake: false };
            }
        }

        const distToTarget = Math.hypot(targetX - this.x, targetY - this.y);
        const hasLOS = typeof map.hasClearLineOfSightForVehicle === "function"
            ? map.hasClearLineOfSightForVehicle(this.x, this.y, targetX, targetY, curZ)
            : (distToTarget < 210);
        const onRoadNow = map.isRoadAtPixel(this.x, this.y);

        // Mode A: Direct Line-of-Sight Tactical Interception & PIT Maneuver (or when off-road)
        if ((hasLOS && distToTarget < 275) || !onRoadNow) {
            const leadTime = Math.min(0.44, distToTarget / 640);
            let aimX = targetX + targetVx * leadTime;
            let aimY = targetY + targetVy * leadTime;

            // 1997 GTA 1 PIT Maneuver: aim slightly at the fleeing car's rear flank when closing in fast
            const targetSpd = Math.hypot(targetVx, targetVy);
            if (allowPit && distToTarget > 34 && distToTarget < 115 && targetSpd > 85) {
                const tAng = Math.atan2(targetVy, targetVx);
                const flankSign = ((String(this.id).charCodeAt(String(this.id).length - 1) || 0) % 2 === 0) ? 1 : -1;
                aimX -= Math.cos(tAng) * 14 - Math.sin(tAng) * (12 * flankSign);
                aimY -= Math.sin(tAng) * 14 + Math.cos(tAng) * (12 * flankSign);
            }

            const directAngle = Math.atan2(aimY - this.y, aimX - this.x);
            return this.steerTowardTargetWithFeelers(dt, map, curZ, directAngle, maxThrottle, game);
        }

        // Mode B: Target-Guided Road Network Routing (navigates city blocks & intersections around buildings!)
        const bx = Math.floor(this.x / TILE_SIZE);
        const by = Math.floor(this.y / TILE_SIZE);
        const lidZ1 = map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0;
        if (lidZ1 !== 25) {
            this.aiTurnedInIntersection = false;
        }

        if (this.aiLaneShiftTimer <= 0 && (bx !== this.aiBlockX || by !== this.aiBlockY || !this.aiChosenDir)) {
            this.aiBlockX = bx;
            this.aiBlockY = by;
            if (typeof map.chooseTargetGuidedRoadBlock === "function") {
                this.aiChosenDir = map.chooseTargetGuidedRoadBlock(
                    bx,
                    by,
                    this.angle,
                    targetX,
                    targetY,
                    curZ,
                    Boolean(this.aiTurnedInIntersection)
                );
            } else {
                this.aiChosenDir = map.chooseNextRoadBlock(bx, by, this.angle, curZ, 0.2, Boolean(this.aiTurnedInIntersection));
            }
            if (this.aiChosenDir.isTurn) {
                this.aiTurnedInIntersection = true;
            }
            this.aiTargetBlockX = bx + this.aiChosenDir.dx;
            this.aiTargetBlockY = by + this.aiChosenDir.dy;
        }

        // Overtake civilian traffic in the same lane while racing down the avenue
        const fx = Math.cos(this.angle);
        const fy = Math.sin(this.angle);
        const rx = -fy;
        const ry = fx;
        if (game && Array.isArray(game.vehicles) && this.aiLaneChangeCooldown <= 0) {
            for (const other of game.vehicles) {
                if (other === this || other.driver === "PLAYER") continue;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const fDist = dx * fx + dy * fy;
                const lDist = Math.abs(dx * rx + dy * ry);
                if (fDist > 12 && fDist < 105 && lDist < 22) {
                    this.tryAdjacentLaneChange(bx, by, curZ, map, game);
                    break;
                }
            }
        }

        const tx = (this.aiTargetBlockX + 0.5) * TILE_SIZE;
        const ty = (this.aiTargetBlockY + 0.5) * TILE_SIZE;
        const desiredAngle = Math.atan2(ty - this.y, tx - this.x);
        const angleDiff = this.normalizeAngle(desiredAngle - this.angle);
        let steer = Math.max(-1, Math.min(1, angleDiff * 2.75));
        let throttle = maxThrottle;

        const laneAngleDiff = this.normalizeAngle(this.aiChosenDir.angle - this.angle);
        if (!this.aiChosenDir.isTurn && Math.abs(laneAngleDiff) < 0.40) {
            this.angle += laneAngleDiff * Math.min(1, dt * 14.0);
            this.angularVelocity = 0;
            this.steerAngleRad = 0;
            steer = 0;
            const maxLatStep = 115 * dt;
            if (this.aiChosenDir.dx !== 0) {
                const centerY = (this.aiTargetBlockY + 0.5) * TILE_SIZE;
                this.y += Math.max(-maxLatStep, Math.min(maxLatStep, (centerY - this.y) * Math.min(1, dt * 9.0)));
            } else if (this.aiChosenDir.dy !== 0) {
                const centerX = (this.aiTargetBlockX + 0.5) * TILE_SIZE;
                this.x += Math.max(-maxLatStep, Math.min(maxLatStep, (centerX - this.x) * Math.min(1, dt * 9.0)));
            }
        } else {
            this.angle += angleDiff * Math.min(1, dt * 5.5);
            if (this.speed > 135) {
                throttle = -0.35;
            } else {
                throttle = Math.min(maxThrottle, 0.48);
            }
        }

        if (Math.abs(this.speed) < 15) {
            this.aiStuckTimer += dt;
            if (this.aiStuckTimer > 0.80) {
                this.aiStuckTimer = 0;
                this.aiReverseTimer = 0.95;
                this.aiReverseSteer = angleDiff > 0 ? -0.9 : 0.9;
            }
        } else {
            this.aiStuckTimer = Math.max(0, this.aiStuckTimer - dt * 2.0);
        }

        return { throttle, steer, handbrake: false };
    }

    /* ========================================================================
       AUTHENTIC GTA 1 VCPD POLICE PURSUIT AI (Road-Graph + 9-Feeler + PIT)
       ======================================================================== */
    computePoliceControls(dt, map, game) {
        if (!game || game.wantedLevel <= 0 || game.player.dead) {
            this.sirenActive = false;
            this.aiBailTimer = 0;
            return this.computeTrafficControls(dt, map, game);
        }

        this.sirenActive = true;
        this.aiState = "PURSUIT";

        const target = game.player.inVehicle || game.player;
        const distToPlayer = Math.hypot(target.x - this.x, target.y - this.y);

        // GTA 1 Tactical Officer Bail-Out:
        // When close to a player on foot (or a boxed-in slow car), brake hard and deploy VCPD Officer on foot!
        const playerOnFootNear = !game.player.inVehicle && distToPlayer < 110;
        const playerBoxedNear = Boolean(game.player.inVehicle) && Math.abs(target.speed || 0) < 35 && distToPlayer < 92;
        if (playerOnFootNear || playerBoxedNear) {
            this.aiBailTimer += dt;
            if (this.aiBailTimer > (playerOnFootNear ? 0.42 : 0.95) && typeof game.ejectVehicleDriver === "function") {
                this.aiBailTimer = 0;
                game.ejectVehicleDriver(this, "COP_DEPLOY");
                return { throttle: 0, steer: 0, handbrake: true };
            }
            if (playerOnFootNear && distToPlayer < 78) {
                return { throttle: this.speed > 10 ? -0.8 : 0, steer: 0, handbrake: true };
            }
        } else {
            this.aiBailTimer = Math.max(0, this.aiBailTimer - dt * 1.5);
        }

        return this.computeTargetRoadOrFeelerControls(
            dt,
            map,
            game,
            target.x,
            target.y,
            target.vx || 0,
            target.vy || 0,
            0.96,
            Boolean(game.player.inVehicle)
        );
    }

    steerTowardTargetWithFeelers(dt, map, curZ, directAngle, maxThrottle = 0.92, game = null) {
        // Evaluate 9 candidate feeler directions (-72 deg .. +72 deg) to steer around buildings, water & traffic!
        const candidateOffsets = [-1.25, -0.90, -0.56, -0.26, 0, 0.26, 0.56, 0.90, 1.25];
        let bestOffset = 0;
        let bestScore = -9999;

        for (const off of candidateOffsets) {
            const candAng = this.angle + off;
            const alignDiff = Math.abs(this.normalizeAngle(directAngle - candAng));
            let score = -alignDiff * 3.2 - Math.abs(off) * 0.32;

            const cCos = Math.cos(candAng);
            const cSin = Math.sin(candAng);
            const p1x = this.x + cCos * 44;
            const p1y = this.y + cSin * 44;
            const p2x = this.x + cCos * 88;
            const p2y = this.y + cSin * 88;

            if (map.resolveCircleBuildingCollision(p1x, p1y, 16, curZ).hit) {
                score -= 55;
            }
            if (map.resolveCircleBuildingCollision(p2x, p2y, 16, curZ).hit) {
                score -= 30;
            }
            if (map.isWaterAtPixel(p1x, p1y) || map.isWaterAtPixel(p2x, p2y)) {
                score -= 65;
            }
            if (map.isRoadAtPixel(p1x, p1y)) {
                score += 1.5;
            }
            if (map.isRoadAtPixel(p2x, p2y)) {
                score += 1.2;
            }

            // Penalize feelers that collide with civilian/wrecked vehicles so police weave around traffic!
            if (game && Array.isArray(game.vehicles)) {
                for (const other of game.vehicles) {
                    if (other === this || other.driver === "PLAYER") continue;
                    const d1 = Math.hypot(other.x - p1x, other.y - p1y);
                    const d2 = Math.hypot(other.x - p2x, other.y - p2y);
                    if (d1 < 26) score -= 24;
                    else if (d2 < 26) score -= 14;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestOffset = off;
            }
        }

        const chosenAngle = bestScore < -35 ? directAngle : (this.angle + bestOffset);
        const diff = this.normalizeAngle(chosenAngle - this.angle);
        const steer = Math.max(-1, Math.min(1, diff * 2.9));
        const throttle = Math.abs(diff) > 0.75 && this.speed > 175 ? 0.35 : maxThrottle;

        if (Math.abs(this.speed) < 15) {
            this.aiStuckTimer += dt;
            if (this.aiStuckTimer > 0.75) {
                this.aiStuckTimer = 0;
                this.aiReverseTimer = 1.0;
                this.aiReverseSteer = diff > 0 ? -0.9 : 0.9;
            }
        } else {
            this.aiStuckTimer = Math.max(0, this.aiStuckTimer - dt * 2);
        }

        return { throttle, steer, handbrake: false };
    }

    /* ========================================================================
       AUTHENTIC GTA 1 EMERGENCY AI (Ambulance Paramedics & Fire Engine Hose)
       ======================================================================== */
    computeEmergencyControls(dt, map, game) {
        if (!game) return this.computeTrafficControls(dt, map, game);

        // A. MEDIC AMBULANCE: Responds to dead casualties within 640px and revives them!
        if (this.specKey === "MEDIC_AMBULANCE" && Array.isArray(game.peds)) {
            let nearestCorpse = null;
            let bestDist = 640;
            for (const ped of game.peds) {
                if (!ped.dead || ped.revived) continue;
                const d = Math.hypot(ped.x - this.x, ped.y - this.y);
                if (d < bestDist) {
                    bestDist = d;
                    nearestCorpse = ped;
                }
            }

            if (nearestCorpse) {
                this.sirenActive = true;
                this.aiState = "EMERGENCY_MEDIC";
                if (bestDist < 52) {
                    this.aiBailTimer += dt;
                    if (this.aiBailTimer > 1.0) {
                        this.aiBailTimer = 0;
                        nearestCorpse.dead = false;
                        nearestCorpse.revived = true;
                        nearestCorpse.hp = 35;
                        nearestCorpse.speed = 36;
                        nearestCorpse.panicTimer = 4.0;
                        game.addFloatingText(nearestCorpse.x, nearestCorpse.y - 22, "🚑 MEDIC REVIVED!", "#38bdf8");
                    }
                    return { throttle: this.speed > 8 ? -0.85 : 0, steer: 0, handbrake: true };
                }
                return this.computeTargetRoadOrFeelerControls(
                    dt,
                    map,
                    game,
                    nearestCorpse.x,
                    nearestCorpse.y,
                    0,
                    0,
                    0.90,
                    false
                );
            }
        }

        // B. FIRE ENGINE: Responds to burning vehicles within 640px and sprays water cannon!
        if (this.specKey === "FIRE_TRUCK" && Array.isArray(game.vehicles)) {
            let burningCar = null;
            let bestDist = 640;
            for (const v of game.vehicles) {
                if (v === this || v.destroyed || v.hp > 50) continue;
                const d = Math.hypot(v.x - this.x, v.y - this.y);
                if (d < bestDist) {
                    bestDist = d;
                    burningCar = v;
                }
            }

            if (burningCar) {
                this.sirenActive = true;
                this.aiState = "EMERGENCY_FIRE";
                const ang = Math.atan2(burningCar.y - this.y, burningCar.x - this.x);
                if (bestDist < 110) {
                    // Spray water stream particles & extinguish vehicle fire!
                    if (Math.random() < 0.65) {
                        game.particles.push({
                            x: this.x + Math.cos(ang) * 24,
                            y: this.y + Math.sin(ang) * 24,
                            vx: Math.cos(ang + (Math.random() - 0.5) * 0.18) * 210,
                            vy: Math.sin(ang + (Math.random() - 0.5) * 0.18) * 210,
                            size: 4,
                            color: "#38bdf8",
                            life: 0.35,
                            maxLife: 0.35
                        });
                    }
                    burningCar.hp = Math.min(burningCar.maxHp, burningCar.hp + 38 * dt);
                    burningCar.burnTimer = 0;
                    return { throttle: this.speed > 8 ? -0.85 : 0, steer: 0, handbrake: true };
                }
                return this.computeTargetRoadOrFeelerControls(
                    dt,
                    map,
                    game,
                    burningCar.x,
                    burningCar.y,
                    burningCar.vx || 0,
                    burningCar.vy || 0,
                    0.90,
                    false
                );
            }
        }

        this.sirenActive = false;
        return this.computeTrafficControls(dt, map, game);
    }

    update(dt, input, map, game) {
        if (this.destroyed) return;

        this.sirenPhase += dt * 10;
        if (this.doorOpenTimer > 0) {
            this.doorOpenTimer = Math.max(0, this.doorOpenTimer - dt);
        }

        // 1997 GTA 1 Delayed Chain-Reaction Explosion (mCarExplosionChainDelayTime)
        if (this.chainExplodeTimer > 0) {
            this.chainExplodeTimer -= dt;
            if (Math.random() < 0.5) {
                game.spawnParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, "FIRE");
            }
            if (this.chainExplodeTimer <= 0) {
                this.chainExplodeTimer = 0;
                game.explodeVehicle(this);
                return;
            }
        }

        // GTA 1 Ticking 5-Second Car Bomb Countdown!
        if (this.bombArmed) {
            this.bombTimer -= dt;
            const secLeft = Math.ceil(this.bombTimer);
            if (secLeft < this.bombTickSecond && secLeft > 0) {
                this.bombTickSecond = secLeft;
                game.audio.playBeep(820 + (5 - secLeft) * 160, 0.09, "square", 0.09);
                game.addFloatingText(this.x, this.y - 24, `BOMB ${secLeft}...`, "#ff1e38");
            }
            if (this.bombTimer <= 0) {
                this.bombArmed = false;
                this.hasBomb = false;
                game.explodeAt(this.x, this.y, 195, 360);
                game.explodeVehicle(this);
                return;
            }
        }

        // Burning vehicle countdown to explosion + AI Driver Bail-Out!
        if ((this.hp <= 30 || this.burnTimer > 0) && !this.destroyed && !map.isWaterAtPixel(this.x, this.y)) {
            this.burnTimer += dt;
            this.heavyDented = true;
            if (this.burnTimer > 0.35 && this.driver && this.driver !== "PLAYER" && typeof game.ejectVehicleDriver === "function") {
                game.ejectVehicleDriver(this, "BAIL_FIRE");
            }
            if (Math.random() < 0.38) {
                game.spawnParticle(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, "FIRE");
            }
            if (this.burnTimer > 2.6 || this.hp <= 0) {
                game.explodeVehicle(this);
                return;
            }
        } else if (this.hp < this.maxHp * 0.55 && Math.random() < 0.25 && !map.isWaterAtPixel(this.x, this.y)) {
            game.spawnParticle(
                this.x + Math.cos(this.angle) * 18,
                this.y + Math.sin(this.angle) * 18,
                this.hp < this.maxHp * 0.3 ? "BLACK_SMOKE" : "WHITE_SMOKE"
            );
        }

        // Control inputs
        let throttle = 0;
        let steer = 0;
        let handbrake = false;

        if (this.driver === "PLAYER") {
            this.aiState = "PLAYER";
            if (input.up) throttle += 1;
            if (input.down) throttle -= 0.7;
            if (input.left) steer -= 1;
            if (input.right) steer += 1;
            handbrake = Boolean(input.handbrake);
        } else if (this.driver === "AI_TRAFFIC") {
            const aiCtrl = this.computeTrafficControls(dt, map, game);
            throttle = aiCtrl.throttle;
            steer = aiCtrl.steer;
            handbrake = aiCtrl.handbrake;
        } else if (this.driver === "AI_EMERGENCY") {
            const emCtrl = this.computeEmergencyControls(dt, map, game);
            throttle = emCtrl.throttle;
            steer = emCtrl.steer;
            handbrake = emCtrl.handbrake;
        } else if (this.driver === "AI_COP") {
            const copCtrl = this.computePoliceControls(dt, map, game);
            throttle = copCtrl.throttle;
            steer = copCtrl.steer;
            handbrake = copCtrl.handbrake;
        }

        this.updateSteer(dt, steer);
        const surfaceMult = this.computeSurfaceMultiplier(map);
        let { forwardVel, lateralVel } = this.updateDrive(dt, throttle, handbrake, surfaceMult);
        ({ forwardVel, lateralVel } = this.updateFriction(dt, forwardVel, lateralVel, handbrake, map, game));

        // Reconstruct world velocity from 2-axle tire state
        const nfx = Math.cos(this.angle);
        const nfy = Math.sin(this.angle);
        const nrx = -nfy;
        const nry = nfx;

        this.vx = nfx * forwardVel + nrx * lateralVel;
        this.vy = nfy * forwardVel + nry * lateralVel;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Building & Seawall/Bridge Guardrail collision check (uses lateral half-width so long buses/limos don't clip adjacent lane walls)
        const curZ = this.z !== undefined ? this.z : 2.0;
        const wallRad = this.driver === "PLAYER"
            ? Math.min(22, Math.max(12, (this.h || 24) * 0.52))
            : Math.min(18, Math.max(11, (this.h || 24) * 0.45));
        const col = map.resolveCircleBuildingCollision(
            this.x,
            this.y,
            wallRad,
            curZ,
            Boolean(this.amphibious || (this.stuntAirTimer || 0) > 0)
        );
        if (col.hit) {
            const impact = Math.hypot(this.vx, this.vy);
            const hitSign = this.speed >= 0 ? 1 : -1;
            const hitX = this.x + Math.cos(this.angle) * 20 * hitSign;
            const hitY = this.y + Math.sin(this.angle) * 20 * hitSign;
            this.x = col.x;
            this.y = col.y;
            this.angularVelocity = 0;
            if (this.driver === "AI_TRAFFIC") {
                this.vx *= 0.25;
                this.vy *= 0.25;
                if (this.aiChosenDir && typeof this.aiChosenDir.angle === "number") {
                    this.angle = this.aiChosenDir.angle;
                }
            } else {
                this.vx *= -0.35;
                this.vy *= -0.35;
                if (this.driver && this.driver !== "PLAYER" && this.aiReverseTimer <= 0) {
                    this.aiReverseTimer = 0.85;
                    this.aiReverseSteer = Math.random() < 0.5 ? 0.9 : -0.9;
                }
                if (this.driver === "PLAYER" && impact > 155) {
                    this.receiveImpactDamage((impact - 140) * 0.085, hitX, hitY);
                    game.spawnParticle(hitX, hitY, "SPARK");
                }
            }
        }
        if (typeof map.getHeightAtPixel === "function") {
            this.z = map.getHeightAtPixel(this.x, this.y, curZ);
        }
    }

    computeSurfaceMultiplier(map) {
        const currentTile = map.getTileAtPixel(this.x, this.y);
        if ((currentTile === TILE.SAND || currentTile === TILE.SWAMP_MUD) && !this.amphibious) {
            return 0.72;
        }
        if (map.isWaterAtPixel(this.x, this.y) && !this.amphibious) {
            this.burnTimer = 0; // water extinguishes engine fire
            return 0.22;
        }
        return 1.0;
    }

    /* ========================================================================
       1997 GTA 1 Vehicle::UpdateSteer (Vehicle.cpp:1058-1095)
       Front wheels steer up to ±30 deg (0.5236 rad) at 270 deg/s (4.712 rad/s)
       ======================================================================== */
    updateSteer(dt, steerInput) {
        const maxSteerAngle = 0.5236; // 30 degrees
        const steerRate = 4.712;      // 270 degrees/sec
        const targetSteerAngle = steerInput * maxSteerAngle;
        if (this.steerAngleRad < targetSteerAngle) {
            this.steerAngleRad = Math.min(targetSteerAngle, this.steerAngleRad + steerRate * dt);
        } else if (this.steerAngleRad > targetSteerAngle) {
            this.steerAngleRad = Math.max(targetSteerAngle, this.steerAngleRad - steerRate * dt);
        }
    }

    /* ========================================================================
       1997 GTA 1 Vehicle::UpdateDrive (Vehicle.cpp:1156-1204)
       Applies rear-wheel drive acceleration, braking, and steering angular rate
       ======================================================================== */
    updateDrive(dt, throttle, handbrake, surfaceMult) {
        const fx = Math.cos(this.angle);
        const fy = Math.sin(this.angle);
        const rx = -fy;
        const ry = fx;

        let forwardVel = this.vx * fx + this.vy * fy;
        let lateralVel = this.vx * rx + this.vy * ry;

        if (throttle !== 0) {
            forwardVel += throttle * this.accel * dt;
        } else {
            forwardVel *= Math.pow(0.22, dt);
        }

        if (handbrake) {
            forwardVel *= Math.pow(0.18, dt);
        }

        if (surfaceMult < 0.3) {
            forwardVel *= Math.pow(0.12, dt);
        }

        let aiMaxCap = 1.0;
        if (this.driver === "AI_TRAFFIC" && this.aiPanicTimer <= 0) {
            aiMaxCap = this.aiCruiseFactor;
        }
        const effectiveMax = this.maxSpeed * surfaceMult * aiMaxCap;
        forwardVel = Math.max(-this.maxSpeed * 0.45, Math.min(effectiveMax, forwardVel));
        this.speed = forwardVel;

        const maxSteerAngle = 0.5236;
        if (Math.abs(forwardVel) > 8) {
            const dir = forwardVel >= 0 ? 1 : -1;
            const speedFactor = Math.min(1, Math.abs(forwardVel) / 115);
            const driftBoost = handbrake ? 1.34 : 1.0;
            const normSteer = this.steerAngleRad / maxSteerAngle;
            this.angularVelocity = normSteer * this.turnSpeed * speedFactor * driftBoost * dir;
            this.angle += this.angularVelocity * dt;
        } else {
            this.angularVelocity = 0;
        }

        return { forwardVel, lateralVel };
    }

    /* ========================================================================
       1997 GTA 1 Vehicle::UpdateFriction (Vehicle.cpp:1097-1154)
       Kills lateral tire velocity, determines drift state & emits tire marks
       ======================================================================== */
    updateFriction(dt, forwardVel, lateralVel, handbrake, map, game) {
        const lateralRetention = handbrake ? this.driftGrip : this.grip;
        lateralVel *= Math.pow(1 - lateralRetention, dt * 10);

        this.drifting = (handbrake && Math.abs(forwardVel) > 130) || Math.abs(lateralVel) > 75;
        if (this.drifting && !map.isWaterAtPixel(this.x, this.y)) {
            const rearTire = this.getTirePosition(CAR_TIRE.REAR);
            const lat = this.getTireLateral(CAR_TIRE.REAR);
            game.addSkidmark(rearTire.x + lat.x * 8, rearTire.y + lat.y * 8);
            game.addSkidmark(rearTire.x - lat.x * 8, rearTire.y - lat.y * 8);
            if (this.driver === "PLAYER" && Math.random() < 0.25) {
                game.audio.playTireScreech();
            }
        }
        return { forwardVel, lateralVel };
    }
}

/* ============================================================================
   1997 GTA 1 PEDESTRIAN & FINITE STATE MACHINE (Pedestrian.cpp / PedestrianStates.cpp)
   Supports all ePedestrianState states, ComputeDrawOrder, and SetBurnEffectActive
   ============================================================================ */
class Pedestrian {
    constructor(props = {}) {
        this.x = props.x || 0;
        this.y = props.y || 0;
        this.z = props.z !== undefined ? props.z : 2.0;
        this.angle = props.angle || 0;
        this.speed = props.speed !== undefined ? props.speed : 36;
        this.kind = props.kind || "CIVILIAN"; // CIVILIAN, COP, MONK, HOSTILE, GATOR
        this.g24Type = props.g24Type || null;
        this.archetype = props.archetype || null;
        this.missionTag = props.missionTag || null;
        this.monkIndex = props.monkIndex !== undefined ? props.monkIndex : 0;
        this.shirtColor = props.shirtColor || "#06b6d4";
        this.hp = props.hp !== undefined ? props.hp : 35;
        this.maxHp = this.hp;
        this.dead = Boolean(props.dead);
        this.revived = Boolean(props.revived);
        this.panicTimer = props.panicTimer || 0;
        this.stunnedTimer = props.stunnedTimer || 0;
        this.burnTimer = props.burnTimer || 0;
        this.exitAnimTimer = props.exitAnimTimer || 0;
        this.slideCarTimer = props.slideCarTimer || 0;
        this.turnSeed = props.turnSeed !== undefined ? props.turnSeed : (Math.floor(Math.random() * 16) + 1);
        this.targetBx = props.targetBx !== undefined ? props.targetBx : null;
        this.targetBy = props.targetBy !== undefined ? props.targetBy : null;
        this.animSeed = props.animSeed !== undefined ? props.animSeed : ((this.x + this.y) * 0.01);
        this.state = this.computeState();
    }

    /* ========================================================================
       PedestrianStatesManager::GetCurrentStateID (PedestrianStates.cpp)
       ======================================================================== */
    computeState() {
        if (this.dead) return PED_STATE.DEAD;
        if ((this.stunnedTimer || 0) > 0) return PED_STATE.STUNNED;
        if ((this.exitAnimTimer || 0) > 0) return PED_STATE.EXITING_CAR;
        if ((this.slideCarTimer || 0) > 0) return PED_STATE.SLIDE_ON_CAR;
        if ((this.panicTimer || 0) > 0 || (this.burnTimer || 0) > 0 || this.kind === "COP" || this.kind === "HOSTILE") {
            return PED_STATE.RUNS;
        }
        if (this.speed > 1) return PED_STATE.WALKS;
        return PED_STATE.STANDING_STILL;
    }

    /* ========================================================================
       Pedestrian::ComputeDrawHeight (Pedestrian.cpp:238-269)
       Returns eSpriteDrawOrder for SpriteBatch sorting
       ======================================================================== */
    getDrawOrder() {
        const st = this.computeState();
        if (st === PED_STATE.DEAD) return SPRITE_DRAW_ORDER.CORPSE;
        if (st === PED_STATE.SLIDE_ON_CAR) return SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN;
        return SPRITE_DRAW_ORDER.PEDESTRIAN;
    }

    /* ========================================================================
       Pedestrian::SetBurnEffectActive (Pedestrian.cpp:395-418)
       ======================================================================== */
    setBurnEffectActive(duration = 3.2) {
        if (this.dead) return;
        this.burnTimer = Math.max(this.burnTimer || 0, duration);
        this.panicTimer = Math.max(this.panicTimer || 0, duration + 1.5);
    }
}

/* ============================================================================
   1997 GTA 1 TRAFFIC MANAGER (TrafficManager.cpp)
   Spawns and recycles off-screen vehicles, pedestrians, and Hare Krishna chains
   within the off-screen ring around the camera's mOnScreenMapArea frustum.
   ============================================================================ */
class TrafficManager {
    constructor(game) {
        this.game = game;
        this.lastGenCarsTime = 0;
        this.lastGenPedsTime = 0;
        this.genCarsCooldown = 0.70;
        this.genPedsCooldown = 0.28;
        this.maxTrafficCars = 14;
        this.maxTrafficPeds = 38;
        this.carsMaxDistanceBlocks = 5; // mTrafficGenCarsMaxDistance
        this.pedsMaxDistanceBlocks = 4; // mTrafficGenPedsMaxDistance
    }

    updateTraffic(dt) {
        this.lastGenCarsTime += dt;
        this.lastGenPedsTime += dt;

        const game = this.game;
        const renderer = game.renderer;
        const map = game.map;
        if (!map || !map.cmpLoaded) return;

        const camX = renderer ? renderer.camX : game.player.x;
        const camY = renderer ? renderer.camY : game.player.y;
        const camZ = renderer ? renderer.camZBlocks : (game.player.z || 2.0);
        const canvasW = renderer && renderer.canvas ? renderer.canvas.width : 1280;
        const canvasH = renderer && renderer.canvas ? renderer.canvas.height : 720;
        const camDist = renderer ? (renderer.followHeightBlocks + renderer.zoomOffsetBlocks) : 5.0;

        const onScreenArea = map.getOnScreenMapArea(camX, camY, camZ, canvasW, canvasH, camDist);

        if (this.lastGenCarsTime >= this.genCarsCooldown) {
            this.lastGenCarsTime = 0;
            this.removeOffscreenCars(onScreenArea);
            this.generateTrafficCars(onScreenArea, camZ);
        }

        if (this.lastGenPedsTime >= this.genPedsCooldown) {
            this.lastGenPedsTime = 0;
            this.removeOffscreenPeds(onScreenArea);
            this.generateTrafficPeds(onScreenArea, camZ);
        }
    }

    isPointInRect(bx, by, rect) {
        return bx >= rect.minX && bx <= rect.maxX && by >= rect.minY && by <= rect.maxY;
    }

    expandRect(rect, marginBlocks) {
        return {
            minX: Math.max(2, rect.minX - marginBlocks),
            maxX: Math.min(MAP_COLS - 3, rect.maxX + marginBlocks),
            minY: Math.max(2, rect.minY - marginBlocks),
            maxY: Math.min(MAP_ROWS - 3, rect.maxY + marginBlocks)
        };
    }

    removeOffscreenCars(onScreenArea) {
        const game = this.game;
        if (game.vehicles.length <= 24) return;
        const outerRect = this.expandRect(onScreenArea, this.carsMaxDistanceBlocks + 2);

        for (let i = game.vehicles.length - 1; i >= 0; i--) {
            const v = game.vehicles[i];
            const canRecycle =
                v.driver === "AI_TRAFFIC" ||
                (game.wantedLevel === 0 && v.driver === "AI_COP");
            if (!canRecycle || v === game.scurveHeroCar || v.missionTag) continue;

            const bx = Math.floor(v.x / TILE_SIZE);
            const by = Math.floor(v.y / TILE_SIZE);
            if (!this.isPointInRect(bx, by, outerRect)) {
                game.vehicles.splice(i, 1);
                if (game.vehicles.length <= 24) break;
            }
        }
    }

    generateTrafficCars(onScreenArea, camZ) {
        const game = this.game;
        const map = game.map;
        const outerRect = this.expandRect(onScreenArea, this.carsMaxDistanceBlocks);

        // Count active moving traffic cars within outerRect
        let activeTraffic = 0;
        for (const v of game.vehicles) {
            if (!v.destroyed && (v.driver === "AI_TRAFFIC" || v.driver === "AI_EMERGENCY")) {
                const bx = Math.floor(v.x / TILE_SIZE);
                const by = Math.floor(v.y / TILE_SIZE);
                if (this.isPointInRect(bx, by, outerRect)) {
                    activeTraffic++;
                }
            }
        }
        if (activeTraffic >= this.maxTrafficCars) return;

        // Collect candidate road blocks in the offscreen ring (outerRect \ onScreenArea)
        const candidates = [];
        for (let by = outerRect.minY; by <= outerRect.maxY; by += 2) {
            for (let bx = outerRect.minX; bx <= outerRect.maxX; bx += 2) {
                if (this.isPointInRect(bx, by, onScreenArea)) continue;
                const navBlk = map.getNavigationBlock(bx, by, camZ);
                if (!navBlk || navBlk.groundType !== GROUND_TYPE.ROAD || navBlk.isRailway) continue;
                // 1997 GTA 1 TrafficManager.cpp:368-374 — ONLY spawn on single-direction straight lane blocks (bits === 1), never intersections!
                const lidZ1 = map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0;
                const bits = (navBlk.up ? 1 : 0) + (navBlk.down ? 1 : 0) + (navBlk.left ? 1 : 0) + (navBlk.right ? 1 : 0);
                if (bits === 1 && lidZ1 !== 25) {
                    candidates.push({ bx, by });
                }
            }
        }
        if (candidates.length === 0) return;

        const specPool = [
            "HARLEY_BIKE",
            "SUPERBIKE",
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
            "TANKER_RIG"
        ];

        for (let attempt = 0; attempt < 8 && candidates.length > 0; attempt++) {
            const pickIdx = Math.floor(Math.random() * candidates.length);
            const { bx, by } = candidates[pickIdx];
            const dirs = map.getAllowedRoadDirections(bx, by, camZ);
            if (dirs.length === 0) continue;

            const vx = (bx + 0.5) * TILE_SIZE;
            const vy = (by + 0.5) * TILE_SIZE;
            let occupied = false;
            for (const other of game.vehicles) {
                if (Math.hypot(other.x - vx, other.y - vy) < 135) {
                    occupied = true;
                    break;
                }
            }
            if (occupied) continue;

            const vz = map.getHeightAtPixel(vx, vy, 4.0);
            const roadAngle = dirs[Math.floor(Math.random() * dirs.length)].angle;
            const spec = specPool[Math.floor(Math.random() * specPool.length)];
            const newCar = new Vehicle(`traffic_${Date.now()}_${attempt}`, spec, vx, vy, roadAngle);
            newCar.z = vz;
            newCar.driver = "AI_TRAFFIC";
            newCar.speed = 85;
            newCar.vx = Math.cos(roadAngle) * 85;
            newCar.vy = Math.sin(roadAngle) * 85;
            game.vehicles.push(newCar);
            break;
        }
    }

    removeOffscreenPeds(onScreenArea) {
        const game = this.game;
        const outerRect = this.expandRect(onScreenArea, this.pedsMaxDistanceBlocks + 2);

        for (let i = game.peds.length - 1; i >= 0; i--) {
            const ped = game.peds[i];
            if (ped.kind !== "CIVILIAN" || ped.missionTag) continue;
            const bx = Math.floor(ped.x / TILE_SIZE);
            const by = Math.floor(ped.y / TILE_SIZE);
            if (!this.isPointInRect(bx, by, outerRect)) {
                game.peds.splice(i, 1);
            }
        }
    }

    generateTrafficPeds(onScreenArea, camZ) {
        const game = this.game;
        const map = game.map;
        const outerRect = this.expandRect(onScreenArea, this.pedsMaxDistanceBlocks);

        let nearbyPeds = 0;
        for (const ped of game.peds) {
            if (!ped.dead) {
                const bx = Math.floor(ped.x / TILE_SIZE);
                const by = Math.floor(ped.y / TILE_SIZE);
                if (this.isPointInRect(bx, by, outerRect)) {
                    nearbyPeds++;
                }
            }
        }
        if (nearbyPeds >= this.maxTrafficPeds) return;

        // Collect all valid sidewalk (PAWEMENT) and promenade/beach (FIELD) tiles in outerRect.
        // If nearby pedestrian density is low (< 18), also allow sidewalk tiles on screen at least 170px from the player
        // so fast driving or teleporting into a district immediately shows bustling sidewalks.
        const allowEdgeOnScreen = nearbyPeds < 18;
        const px = game.player ? game.player.x : 0;
        const py = game.player ? game.player.y : 0;
        const candidates = [];

        for (let by = outerRect.minY; by <= outerRect.maxY; by++) {
            for (let bx = outerRect.minX; bx <= outerRect.maxX; bx++) {
                const inScreen = this.isPointInRect(bx, by, onScreenArea);
                if (inScreen && !allowEdgeOnScreen) continue;
                const pedX = (bx + 0.5) * TILE_SIZE;
                const pedY = (by + 0.5) * TILE_SIZE;
                if (inScreen && Math.hypot(pedX - px, pedY - py) < 175) continue;

                const nav = map.getNavigationBlock(bx, by, camZ);
                if (!nav) continue;
                if (nav.groundType === GROUND_TYPE.PAWEMENT || (nav.groundType === GROUND_TYPE.FIELD && bx >= 216)) {
                    candidates.push({ bx, by, isPave: nav.groundType === GROUND_TYPE.PAWEMENT });
                }
            }
        }
        if (candidates.length === 0) return;

        const civTypes = ["civ0", "civ1", "civ2", "civ3", "gang"];
        const dirs = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];
        const needed = Math.min(5, this.maxTrafficPeds - nearbyPeds);
        let spawned = 0;

        for (let attempt = 0; attempt < 18 && spawned < needed; attempt++) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            const pedX = (pick.bx + 0.25 + Math.random() * 0.5) * TILE_SIZE;
            const pedY = (pick.by + 0.25 + Math.random() * 0.5) * TILE_SIZE;

            let tooClose = false;
            for (const other of game.peds) {
                if (!other.dead && Math.hypot(other.x - pedX, other.y - pedY) < 28) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            const pedZ = map.getHeightAtPixel(pedX, pedY, 4.0);
            const pedAngle = dirs[Math.floor(Math.random() * dirs.length)];

            game.peds.push(new Pedestrian({
                x: pedX,
                y: pedY,
                z: pedZ,
                angle: pedAngle,
                speed: 35 + Math.random() * 9,
                kind: "CIVILIAN",
                g24Type: civTypes[Math.floor(Math.random() * civTypes.length)],
                shirtColor: "#06b6d4",
                hp: 35,
                dead: false,
                panicTimer: 0,
                turnSeed: (game.peds.length + attempt + 1)
            }));
            spawned++;
        }
    }
}

window.CAR_DAMAGE_DELTA = CAR_DAMAGE_DELTA;
window.CAR_TIRE = CAR_TIRE;
window.PED_STATE = PED_STATE;
window.SPRITE_DRAW_ORDER = SPRITE_DRAW_ORDER;
window.VEHICLE_SPECS = VEHICLE_SPECS;
window.WEAPON_SPECS = WEAPON_SPECS;
window.Vehicle = Vehicle;
window.Pedestrian = Pedestrian;
window.TrafficManager = TrafficManager;
