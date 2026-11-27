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
        w: 42,
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
    E_SCOOTER: {
        name: "MIAMI NEON E-SCOOTER",
        sprId: "veh_escooter",
        w: 36,
        h: 16,
        maxSpeed: 285,
        accel: 360,
        turnSpeed: 5.25,
        grip: 0.96,
        driftGrip: 0.98,
        maxHp: 110,
        color: "#39ff14",
        secondaryColor: "#0f172a",
        stripeColor: "#00f0ff",
        bodyStyle: "MOTORCYCLE",
        isMotorcycle: true,
        isConvertible: true,
        useBaseOnly: true,
        amphibious: false
    },
    BMX_BIKE: {
        name: "SOUTH BEACH CRUISER BIKE",
        sprId: "veh_bicycle",
        w: 42,
        h: 16,
        maxSpeed: 265,
        accel: 335,
        turnSpeed: 4.95,
        grip: 0.95,
        driftGrip: 0.975,
        maxHp: 115,
        color: "#00f0ff",
        secondaryColor: "#ff2a85",
        stripeColor: "#fef08a",
        bodyStyle: "MOTORCYCLE",
        isMotorcycle: true,
        isConvertible: true,
        useBaseOnly: true,
        amphibious: false
    },

    // --- 2. HERO CONVERTIBLES, MUSCLE CARS & CLASSICS ---
    TULIP_MUSCLE: {
        name: "DECLASSE TULIP CONVERTIBLE",
        sprId: "57",
        w: 58,
        h: 28,
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
        amphibious: false
    },
    MINT_STALLION: {
        name: "JUGULAR / STALLION GT",
        sprId: "82",
        w: 62,
        h: 28,
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
        w: 63,
        h: 29,
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
        amphibious: false
    },
    CHALLENGER_RT: {
        name: "BRAVADO CHALLENGER R/T",
        sprId: "72",
        w: 63,
        h: 29,
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
        w: 64,
        h: 29,
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
        w: 60,
        h: 28,
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
        w: 63,
        h: 28,
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
        w: 62,
        h: 30,
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
        w: 62,
        h: 29,
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
        w: 64,
        h: 29,
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
        w: 60,
        h: 28,
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
        w: 62,
        h: 28,
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
        w: 64,
        h: 29,
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
        w: 64,
        h: 28,
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
        w: 62,
        h: 28,
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
        sprId: "81",
        w: 64,
        h: 28,
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
        w: 62,
        h: 29,
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
        w: 64,
        h: 32,
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
        w: 60,
        h: 27,
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
        w: 64,
        h: 29,
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
        w: 64,
        h: 31,
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
        w: 64,
        h: 29,
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
        w: 70,
        h: 30,
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
        sprId: "68",
        w: 64,
        h: 29,
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
        w: 120,
        h: 32,
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
        sprId: "55",
        w: 128,
        h: 34,
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
    TOW_TRUCK: {
        name: "VCPD IMPOUND WRECKER",
        sprId: "veh_tow_truck",
        w: 64,
        h: 28,
        maxSpeed: 295,
        accel: 220,
        turnSpeed: 2.45,
        grip: 0.94,
        driftGrip: 0.94,
        maxHp: 580,
        color: "#f59e0b",
        secondaryColor: "#0f172a",
        stripeColor: "#fde047",
        bodyStyle: "TRUCK",
        isEmergency: true,
        useBaseOnly: true,
        amphibious: false
    },
    TOUR_COACH: {
        name: "LEONIDA SCHOOL BUS",
        sprId: "53",
        w: 100,
        h: 32,
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
        w: 126,
        h: 34,
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
        w: 111,
        h: 29,
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
        w: 63,
        h: 29,
        maxSpeed: 405,
        accel: 325,
        turnSpeed: 3.20,
        grip: 0.90,
        driftGrip: 0.96,
        maxHp: 440,
        color: "#0f172a",
        secondaryColor: "#f8fafc",
        stripeColor: "#0d9488",
        bodyStyle: "CRUISER",
        isPolice: true,
        useBaseOnly: false,
        amphibious: false
    },
    SWAT_ENFORCER: {
        name: "VCPD SWAT ENFORCER",
        sprId: "76",
        w: 64,
        h: 29,
        maxSpeed: 355,
        accel: 275,
        turnSpeed: 2.60,
        grip: 0.93,
        driftGrip: 0.95,
        maxHp: 820,
        color: "#1e293b",
        secondaryColor: "#0f172a",
        stripeColor: "#38bdf8",
        bodyStyle: "TRUCK",
        isPolice: true,
        useBaseOnly: true,
        amphibious: false
    },
    AIRBOAT: {
        name: "EVERGLADES HYDRO-AIRBOAT",
        sprId: "airboat_fan",
        w: 52,
        h: 28,
        maxSpeed: 215,
        accel: 135,
        turnSpeed: 2.2,
        grip: 0.85,
        driftGrip: 0.975,
        maxHp: 240,
        color: "#ea580c",
        secondaryColor: "#7c2d12",
        stripeColor: "#fde047",
        bodyStyle: "AIRBOAT",
        useBaseOnly: true,
        isConvertible: true,
        horizontalSprite: true,
        amphibious: true
    },
    // --- Water-only craft: can only move on water, stop dead against beaches, docks & quays ---
    JETSKI: {
        name: "NEON VICE WAVERUNNER",
        sprId: "jetski_neon",
        w: 32,
        h: 14,
        maxSpeed: 235,
        accel: 165,
        turnSpeed: 2.7,
        grip: 0.80,
        driftGrip: 0.98,
        maxHp: 160,
        maxSeats: 2,
        color: "#ff2a85",
        secondaryColor: "#0f172a",
        stripeColor: "#00f0ff",
        bodyStyle: "AIRBOAT",
        useBaseOnly: true,
        isConvertible: true,
        horizontalSprite: true,
        waterOnly: true,
        amphibious: true
    },
    SPEEDBOAT: {
        name: "VICE V8 CIGARETTE SPEEDBOAT",
        sprId: "speedboat_v8",
        w: 58,
        h: 30,
        maxSpeed: 245,
        accel: 145,
        turnSpeed: 2.1,
        grip: 0.78,
        driftGrip: 0.98,
        maxHp: 340,
        maxSeats: 4,
        color: "#f8fafc",
        secondaryColor: "#1e3a8a",
        stripeColor: "#ff2a85",
        bodyStyle: "AIRBOAT",
        useBaseOnly: true,
        isConvertible: true,
        horizontalSprite: true,
        waterOnly: true,
        amphibious: true
    },
    MEDIC_AMBULANCE: {
        name: "LEONIDA MEDIC AMBULANCE",
        sprId: "58",
        w: 95,
        h: 30,
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
        w: 118,
        h: 34,
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
        w: 85,
        h: 36,
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
    ROCKET: { name: "ROCKET LAUNCHER", fireRate: 0.85, range: 1100, damage: 240, speed: 380, spread: 0.01, isRocket: true },
    // GTA 2 ElectroGun: freezes & electrocutes pedestrians (X-ray skeleton flash) before they drop charred
    ELECTRO: { name: "ELECTROGUN", fireRate: 0.16, range: 240, damage: 6, speed: 820, spread: 0.02, isElectro: true }
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

// Progressive detachable 3D bodywork & trim part bitflags
const CAR_DETACH_PART = Object.freeze({
    FRONT_BUMPER: 1 << 0,
    REAR_BUMPER:  1 << 1,
    HOOD:         1 << 2,
    TRUNK:        1 << 3,
    LEFT_DOOR:    1 << 4,
    RIGHT_DOOR:   1 << 5,
    LEFT_MIRROR:  1 << 6,
    RIGHT_MIRROR: 1 << 7
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
    DECALS: 1,
    CORPSE: 2,
    SKIDMARKS: 2,
    TIRE_MARKS: 3,
    MAP_OBJECT: 4,
    PEDESTRIAN: 5,
    PED: 5,
    PEDESTRIANS: 5,
    CAR_PASSENGER: 6,
    CAR: 7,
    CONVERTIBLE_PASSENGER: 8,
    CAR_ROOF: 9,
    JUMPING_PEDESTRIAN: 10,
    TREES: 11,
    PROJECTILES: 12,
    ROOF_LIGHTS: 12,
    EXPLOSION: 13,
    HUD_ARROW: 14,
    FOREGROUND: 15,
    SKY_AIRCRAFT: 16
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
        this.waterOnly = Boolean(spec.waterOnly);

        // Authentic .G24 Vehicle Color Remap index (-1 = base palette, 0..5 = 6 factory paintjob remaps)
        let idHash = 0;
        const idStr = String(id || "0");
        for (let i = 0; i < idStr.length; i++) {
            idHash = (idHash * 31 + idStr.charCodeAt(i)) | 0;
        }
        const paletteSlot = Math.abs(idHash) % 6;
        if (specKey === "VCPD_CRUISER") {
            // Vice-Dade / VCPD Fleet Distribution:
            // - 86% White & Green / Teal cruisers (the standard Leonida / Vice-Dade fleet: remaps 1, 2, 3)
            // - 14% Rare Black cruisers (9% remap 0 Black & White Panda, 5% remap 4 All-Black Unmarked Slicktop)
            const fleetRoll = Math.abs((idHash ^ Math.imul(Math.round(x || 0), 73856093) ^ Math.imul(Math.round(y || 0), 19349663))) % 100;
            this.remapIdx = fleetRoll < 36 ? 2 : (fleetRoll < 68 ? 1 : (fleetRoll < 86 ? 3 : (fleetRoll < 95 ? 0 : 4)));
            const vcpdFleetNames = [
                "VCPD PANDA INTERCEPTOR",
                "VICE-DADE CHARGER PURSUIT",
                "VICE-DADE TAURUS INTERCEPTOR",
                "VICE-DADE POLICE SUV",
                "VCPD UNMARKED STANIER"
            ];
            const vcpdFleetColors = [
                { c: "#0f172a", s: "#f8fafc", st: "#0d9488" },
                { c: "#0f766e", s: "#f8fafc", st: "#eab308" },
                { c: "#f8fafc", s: "#10b981", st: "#eab308" },
                { c: "#0f766e", s: "#f8fafc", st: "#eab308" },
                { c: "#0f172a", s: "#1e293b", st: "#64748b" }
            ];
            this.name = vcpdFleetNames[this.remapIdx] || this.name;
            const fc = vcpdFleetColors[this.remapIdx];
            if (fc) {
                this.color = fc.c;
                this.secondaryColor = fc.s;
                this.stripeColor = fc.st;
            }
        } else {
            this.remapIdx = (this.useBaseOnly || this.isPolice || this.isEmergency || this.isTank || this.amphibious)
                ? -1
                : (paletteSlot === 5 ? -1 : paletteSlot);
        }
        // The armored cash van shares sprite 76 with the SWAT van: never show the blue/white police base livery on it
        if (specKey === "BRINKS_TRUCK") this.remapIdx = 1;

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

        this.driver = null; // 'PLAYER', 'REMOTE', 'AI_TRAFFIC', 'AI_COP', 'AI_EMERGENCY', or null
        this.hasJason = false;
        this.maxSeats = this.computeMaxSeats(specKey, spec);
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
        this.detachedPartsMask = 0;
        this.hangingBumperMask = 0;
        this.hangingBumperSide = (Math.abs(idHash) % 2 === 0) ? 1 : -1;
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

        // Multi-Tier Vehicle & Driver Cruise Speed Diversity (54 px/s Cruiser Bikes -> 255 px/s Exotic Supercars)
        // Combines authentic vehicle class physics with continuous per-driver deterministic hash variance so no two cars march in lockstep!
        const drvHashU32 = (Math.imul(idHash ^ 0x9e3779b9, 2654435761) >>> 0);
        const drvUnit = drvHashU32 / 4294967295; // [0.0 .. 1.0] individual driver temperament
        const isPedalOrScooter = (specKey === "BMX_BIKE" || specKey === "E_SCOOTER");
        const isExoticOrSuperbike = Boolean(
            specKey === "SUPERBIKE" ||
            specKey === "PENETRATOR_GT" ||
            specKey === "VICE_CHEETAH" ||
            specKey === "BANSHEE_GT" ||
            specKey === "TURISMO_CABRIO" ||
            specKey === "STINGER_CABRIO" ||
            specKey === "PORKA_TURBO"
        );
        const isMuscleOrFast = Boolean(
            specKey === "HARLEY_BIKE" ||
            specKey === "COSSIE_RS" ||
            specKey === "CHALLENGER_RT" ||
            specKey === "MINT_STALLION" ||
            specKey === "FJORD_FASTBACK" ||
            specKey === "TULIP_MUSCLE" ||
            specKey === "MONSTER_BUGGY"
        );
        const isBriskUtilityOrCab = Boolean(
            specKey === "VICE_CAB" ||
            specKey === "VCPD_CRUISER" ||
            specKey === "SILVER_ROADSTER" ||
            specKey === "PICKUP_TRUCK" ||
            specKey === "GATOR_4X4"
        );
        const isHeavyVehicle = Boolean(this.w >= 70 || (spec.bodyStyle === "TRUCK" && !isMuscleOrFast && !isBriskUtilityOrCab));
        this.isHeavyVehicle = isHeavyVehicle;

        if (specKey === "BMX_BIKE") {
            this.aiTargetCruiseSpeed = 54 + drvUnit * 15; // 54 .. 69 px/s beach cruiser pedal pace
            this.aiStopDist = 42;
            this.aiScanDist = 96;
        } else if (specKey === "E_SCOOTER") {
            this.aiTargetCruiseSpeed = 66 + drvUnit * 18; // 66 .. 84 px/s electric scooter
            this.aiStopDist = 44;
            this.aiScanDist = 102;
        } else if (isHeavyVehicle) {
            const isBusOrBigRig = (this.w >= 96 || specKey === "CITY_BUS" || specKey === "TOUR_COACH" || specKey === "TANKER_RIG" || specKey === "FLATBED_TRUCK");
            this.aiTargetCruiseSpeed = isBusOrBigRig
                ? (92 + drvUnit * 22)   // 92 .. 114 px/s heavy transit bus / semi-tanker
                : (104 + drvUnit * 24); // 104 .. 128 px/s commercial van / armored / camper / limo
            this.aiStopDist = 68;
            this.aiScanDist = 136;
        } else if (isExoticOrSuperbike) {
            const spiritedBoost = drvUnit > 0.80 ? 12 : 0;
            this.aiTargetCruiseSpeed = 198 + drvUnit * 46 + spiritedBoost; // 198 .. 256 px/s Miami exotics & superbikes
            this.aiStopDist = 50;
            this.aiScanDist = 158;
        } else if (isMuscleOrFast) {
            this.aiTargetCruiseSpeed = (specKey === "HARLEY_BIKE" ? 176 : 164) + drvUnit * 40; // 164 .. 216 px/s muscle / rally / chopper
            this.aiStopDist = 52;
            this.aiScanDist = 144;
        } else if (isBriskUtilityOrCab) {
            this.aiTargetCruiseSpeed = 146 + drvUnit * 36; // 146 .. 182 px/s brisk yellow cabs, patrol cruisers & 4x4s
            this.aiStopDist = 54;
            this.aiScanDist = 132;
        } else {
            this.aiTargetCruiseSpeed = 122 + drvUnit * 38; // 122 .. 160 px/s calm compacts, family wagons & luxury sedans
            this.aiStopDist = 56;
            this.aiScanDist = 124;
        }
        this.aiCruiseFactor = Math.max(0.20, Math.min(0.88, this.aiTargetCruiseSpeed / Math.max(120, this.maxSpeed)));
        this.aiAggressive = Boolean(
            (!isPedalOrScooter && this.isMotorcycle) ||
            isExoticOrSuperbike && drvUnit > 0.45 ||
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
        this.resellValue = spec.maxSpeed > 420 ? 500 : (spec.maxSpeed > 370 ? 350 : 200);
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

    computeMaxSeats(specKey, spec) {
        if (spec && typeof spec.maxSeats === "number") return spec.maxSeats;
        if (specKey === "MICRO_KART") return 1;
        if (this.isMotorcycle) return 2;
        if (this.isTank || specKey === "PANZER_TANK") return 2; // Seat 0: Driver, Seat 1: 360° Turret Gunner
        if (specKey === "CITY_BUS" || specKey === "TOUR_COACH") return 8;
        if (specKey === "STRETCH_LIMO" || specKey === "SWAT_ENFORCER" || specKey === "BRINKS_TRUCK") return 6;
        const twoSeaters = new Set([
            "VICE_CHEETAH", "BANSHEE_GT", "PENETRATOR_GT", "PORKA_TURBO",
            "STINGER_CABRIO", "TURISMO_CABRIO", "SILVER_ROADSTER", "MINT_STALLION",
            "PICKUP_TRUCK", "FLATBED_TRUCK", "TANKER_RIG", "AIRBOAT"
        ]);
        if (twoSeaters.has(specKey)) return 2;
        return 4; // Sedans, Muscle Cars, Taxis, 4x4s, Police Cruisers, Ambulance, Fire Engine, Vans
    }

    getSeatOffset(seatIdx = 0) {
        const s = Math.max(0, seatIdx | 0);
        if (this.specKey === "MICRO_KART") {
            return { lx: -1.5, ly: 0 };
        }
        if (this.isMotorcycle || this.specKey === "JETSKI") {
            return s === 0 ? { lx: (this.specKey === "JETSKI" ? 0.0 : 2.0), ly: 0 } : { lx: -7.5, ly: 0 };
        }
        if (this.specKey === "AIRBOAT") {
            return s === 0 ? { lx: 1.0, ly: -3.2 } : { lx: 1.0, ly: 3.2 };
        }
        if (this.specKey === "SPEEDBOAT") {
            const row = Math.floor(s / 2);
            const isRight = (s % 2) === 1;
            return {
                lx: 2.0 - row * 10.0,
                ly: isRight ? 4.8 : -4.8
            };
        }
        if (this.maxSeats === 2) {
            return s === 0 ? { lx: -2.0, ly: -4.5 } : { lx: -2.0, ly: 4.5 };
        }
        // 4, 6, or 8 seat multi-row layout (Row 0 = front, Row 1 = middle/rear, Row 2..3 = back)
        const row = Math.floor(s / 2);
        const isRight = (s % 2) === 1;
        const frontX = this.w > 70 ? (this.w * 0.24) : 3.0;
        const rowSpacing = this.w > 70 ? 11.5 : 9.0;
        return {
            lx: frontX - row * rowSpacing,
            ly: isRight ? 4.6 : -4.6
        };
    }

    getSeatWorldPos(seatIdx = 0) {
        const off = this.getSeatOffset(seatIdx);
        const cosA = Math.cos(this.angle);
        const sinA = Math.sin(this.angle);
        return {
            x: this.x + off.lx * cosA - off.ly * sinA,
            y: this.y + off.lx * sinA + off.ly * cosA
        };
    }

    getOccupiedSeats(game) {
        const list = [];
        if (!game) return list;
        const p = game.player;
        if (p && !p.dead && p.inVehicle === this) {
            list.push({
                seat: p.seatIndex || 0,
                isLocal: true,
                id: (game.net && game.net.playerId) || "local",
                name: p.nickname || (game.net && game.net.playerName) || "PLAYER",
                color: (game.net && game.net.playerColor) || "#ff2a85",
                pedType: p.pedType || "lucia",
                muzzleTimer: p.muzzleTimer || 0
            });
        }
        if (game.net && typeof game.net.getHumanRemotePlayers === "function") {
            for (const rp of game.net.getHumanRemotePlayers()) {
                if (!rp.dead && rp.veh && rp.veh.id === this.id) {
                    const rSeat = typeof rp.veh.seat === "number" ? rp.veh.seat : 0;
                    list.push({
                        seat: rSeat,
                        isLocal: false,
                        id: rp.id,
                        name: rp.name || "PLAYER",
                        color: rp.color || "#00f0ff",
                        pedType: rp.pedType || "gang",
                        muzzleTimer: rp.muzzleTimer || 0,
                        rp
                    });
                }
            }
        }
        if (this.hasJason && (this.maxSeats || 4) >= 2 && !list.some((o) => o.seat === 1)) {
            list.push({
                seat: 1,
                isLocal: false,
                id: "jason_partner",
                name: "JASON",
                color: "#38bdf8",
                pedType: "jason",
                muzzleTimer: (game.jason && game.jason.muzzleTimer) || 0
            });
        }
        list.sort((a, b) => a.seat - b.seat);
        return list;
    }

    findFirstFreeSeat(game) {
        const occupied = new Set(this.getOccupiedSeats(game).map((o) => o.seat));
        for (let s = 0; s < (this.maxSeats || 4); s++) {
            if (!occupied.has(s)) return s;
        }
        return -1;
    }

    hasDamageDelta(deltaBit) {
        return (this.damageDeltaBits & (1 << deltaBit)) !== 0;
    }

    getBodyPaintRGB() {
        if (Array.isArray(this._bodyRGB) && this._bodyRGB.length === 3) {
            return this._bodyRGB;
        }
        const hex = String(this.color || "#94a3b8").trim();
        if (hex.startsWith("#") && (hex.length === 7 || hex.length === 4)) {
            const r = hex.length === 7 ? parseInt(hex.slice(1, 3), 16) : parseInt(hex[1] + hex[1], 16);
            const g = hex.length === 7 ? parseInt(hex.slice(3, 5), 16) : parseInt(hex[2] + hex[2], 16);
            const b = hex.length === 7 ? parseInt(hex.slice(5, 7), 16) : parseInt(hex[3] + hex[3], 16);
            if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
                return [r / 255, g / 255, b / 255];
            }
        }
        return [0.72, 0.76, 0.82];
    }

    spawnDetachedCarPart(gameRef, partType, wx, wy, launchAng, speedBase, wPx, hPx, peakZ = 0.28, bounces = 1) {
        const g = gameRef || this._gameRef || (typeof window !== "undefined" ? window.game : null);
        if (!g || !Array.isArray(g.particles)) return;
        if (g.player && this.driver !== "PLAYER" && Math.abs(wx - g.player.x) > 1050 && Math.abs(wy - g.player.y) > 850) {
            return;
        }
        if (g.particles.length >= 650) {
            g.particles.splice(0, g.particles.length - 600);
        }
        const [pr, pg, pb] = this.getBodyPaintRGB();
        const spd = speedBase * (0.82 + Math.random() * 0.38);
        const ang = launchAng + (Math.random() - 0.5) * 0.48;
        const flightDur = 0.34 + Math.random() * 0.22 + peakZ * 0.32;
        g.particles.push({
            x: wx,
            y: wy,
            vx: Math.cos(ang) * spd + (this.vx || 0) * 0.28,
            vy: Math.sin(ang) * spd + (this.vy || 0) * 0.28,
            w: wPx,
            h: hPx,
            size: Math.max(wPx, hPx),
            kind: "CAR_PART",
            partType,
            r: pr,
            g: pg,
            b: pb,
            peakZ,
            rot: (this.angle || 0) + (Math.random() - 0.5) * 0.6,
            vRot: (Math.random() < 0.5 ? -1 : 1) * (4.5 + Math.random() * 7.5),
            bouncesLeft: bounces,
            life: flightDur,
            maxLife: flightDur,
            isRestingGib: false
        });
    }

    emitExplosionBlowoutParts(gameRef) {
        if (this.crushesCars || this.isTank || this.waterOnly || this.specKey === "AIRBOAT" || this.specKey === "BMX_BIKE" || this.specKey === "E_SCOOTER") {
            return;
        }
        const cosA = Math.cos(this.angle || 0);
        const sinA = Math.sin(this.angle || 0);
        const hl = (this.w || 60) * 0.36;
        const hw = (this.h || 28) * 0.42;
        if (!this.isMotorcycle) {
            const isCabOverBody = Boolean(
                this.specKey === "CITY_BUS" || this.specKey === "TOUR_COACH" || this.specKey === "FIRE_TRUCK" ||
                this.specKey === "MEDIC_AMBULANCE" || this.specKey === "BOXVILLE_VAN" || this.specKey === "HOTDOG_VAN" ||
                this.specKey === "TANKER_RIG" || this.specKey === "FLATBED_TRUCK" || this.specKey === "BRINKS_TRUCK" || this.specKey === "SWAT_ENFORCER"
            );
            if (!(this.detachedPartsMask & CAR_DETACH_PART.HOOD) && !isCabOverBody) {
                this.detachedPartsMask |= CAR_DETACH_PART.HOOD;
                this.spawnDetachedCarPart(gameRef, "HOOD", this.x + cosA * hl, this.y + sinA * hl, (this.angle || 0) + (Math.random() - 0.5) * 0.8, 118, 12.0, 13.5, 0.66, 2);
            }
            if (!(this.detachedPartsMask & CAR_DETACH_PART.LEFT_DOOR)) {
                this.detachedPartsMask |= CAR_DETACH_PART.LEFT_DOOR;
                this.spawnDetachedCarPart(gameRef, "DOOR", this.x - sinA * (-hw), this.y + cosA * (-hw), (this.angle || 0) - Math.PI * 0.5, 108, 13.5, 5.2, 0.58, 2);
            }
            if (!(this.detachedPartsMask & CAR_DETACH_PART.RIGHT_DOOR) && Math.random() < 0.75) {
                this.detachedPartsMask |= CAR_DETACH_PART.RIGHT_DOOR;
                this.spawnDetachedCarPart(gameRef, "DOOR", this.x - sinA * hw, this.y + cosA * hw, (this.angle || 0) + Math.PI * 0.5, 108, 13.5, 5.2, 0.58, 2);
            }
            if (!(this.detachedPartsMask & CAR_DETACH_PART.FRONT_BUMPER)) {
                this.detachedPartsMask |= CAR_DETACH_PART.FRONT_BUMPER;
                this.hangingBumperMask &= ~CAR_DETACH_PART.FRONT_BUMPER;
                this.spawnDetachedCarPart(gameRef, "BUMPER", this.x + cosA * (hl + 6), this.y + sinA * (hl + 6), this.angle || 0, 125, 4.4, Math.min(18, (this.h || 26) * 0.68), 0.52, 2);
            }
        }
        // Launch 2 bouncing rubber tires with alloy rims!
        const tireCount = this.isMotorcycle ? 1 : 2;
        for (let ti = 0; ti < tireCount; ti++) {
            const side = ti === 0 ? -1 : 1;
            const tAng = (this.angle || 0) + side * (1.1 + Math.random() * 0.7);
            this.spawnDetachedCarPart(gameRef, "TIRE", this.x - sinA * (hw * side), this.y + cosA * (hw * side), tAng, 132, 8.6, 8.6, 0.68, 2);
        }
    }

    /* ========================================================================
       1997 GTA 1 6-ZONE LOCAL CONTACT POINT DAMAGE + PROGRESSIVE DETACHABLE PARTS
       Transforms hit point into chassis local space, sets FL/FR/ML/MR/BL/BR,
       and progressively detaches mirrors, hubcaps, hanging/flying bumpers, doors, trunk & hood!
       ======================================================================== */
    receiveImpactDamage(amount, hitX, hitY, isExplosive = false, gameRef = null) {
        if (this.destroyed || amount <= 0) return;
        const g = gameRef || this._gameRef || (typeof window !== "undefined" ? window.game : null);
        if (this.specKey === "BMX_BIKE" || this.specKey === "E_SCOOTER") {
            // A pedal bicycle or micro e-scooter has no gasoline fuel tank: normal wall/curb bumps never set it on fire!
            this.burnTimer = 0;
            this.chainExplodeTimer = 0;
            if (amount >= 5 && g) {
                const bx = hitX !== undefined ? hitX : this.x;
                const by = hitY !== undefined ? hitY : this.y;
                this.spawnDetachedCarPart(g, "TRIM", bx, by, Math.random() * 6.28, 72, 4.2, 2.2, 0.22, 1);
            }
            if (!isExplosive && amount < 38) {
                this.hp = Math.max(15, this.hp - amount * 0.35);
                return;
            }
            this.hp -= amount;
            if (this.hp <= 0) {
                this.hp = 0;
            }
            return;
        }
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

        const cosA = Math.cos(this.angle || 0);
        const sinA = Math.sin(this.angle || 0);
        const hl = (this.w || 60) * 0.45;
        const hw = (this.h || 26) * 0.46;
        let localX = hl * 0.8;
        let localY = 0;
        if (hitX !== undefined && hitY !== undefined) {
            const dx = hitX - this.x;
            const dy = hitY - this.y;
            localX = dx * cosA + dy * sinA;
            localY = -dx * sinA + dy * cosA;
        }
        const frBias = (this.w * 0.5) / 3.0; // fr_bias = maxx / 3.0f (Vehicle.cpp:723)

        const shouldDent = isExplosive || amount >= 4.2 || this.hp < this.maxHp * 0.90;
        if (shouldDent) {
            if (hitX !== undefined && hitY !== undefined) {
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
        }

        if (this.hp < this.maxHp * 0.56) {
            this.heavyDented = true;
            this.damageDeltaBits |= (1 << CAR_DAMAGE_DELTA.WS);
        }

        // Progressive 3D Detachable Car Parts, Shattered Glass & Trim Debris on Impact!
        if (!this.crushesCars && !this.isTank && !this.waterOnly && this.specKey !== "AIRBOAT" && (amount >= 3.2 || isExplosive)) {
            const hpRatio = Math.max(0, this.hp) / Math.max(1, this.maxHp || 200);
            const cPx = hitX !== undefined ? Math.max(this.x - 42, Math.min(this.x + 42, hitX)) : (this.x + cosA * hl);
            const cPy = hitY !== undefined ? Math.max(this.y - 42, Math.min(this.y + 42, hitY)) : (this.y + sinA * hl);
            const outAng = Math.atan2(cPy - this.y, cPx - this.x);

            // 1. Subtle shattered glass & torn metal splinters on meaningful hits (never confetti spam on tiny grazes)
            const shardCount = isExplosive ? 3 : (amount >= 14 ? 2 : (amount >= 6.0 ? 1 : 0));
            const glassKind = localX < -frBias ? "TAIL_GLASS" : "GLASS";
            for (let si = 0; si < shardCount; si++) {
                this.spawnDetachedCarPart(g, si === 1 ? "TRIM" : glassKind, cPx, cPy, outAng + (si - 0.5) * 0.55, 64 + amount * 1.4, 3.5, 3.5, 0.16 + Math.random() * 0.12, 1);
            }

            if (this.isMotorcycle) {
                if (amount >= 6.5 || hpRatio < 0.72) {
                    this.spawnDetachedCarPart(g, "MUFFLER", this.x - cosA * 12, this.y - sinA * 12, outAng + 0.6, 86, 6.8, 2.4, 0.28, 2);
                }
            } else {
                const isLeft = localY < 0;
                const sideSign = isLeft ? -1 : 1;
                const mirrorBit = isLeft ? CAR_DETACH_PART.LEFT_MIRROR : CAR_DETACH_PART.RIGHT_MIRROR;
                const doorBit = isLeft ? CAR_DETACH_PART.LEFT_DOOR : CAR_DETACH_PART.RIGHT_DOOR;
                const bumperSpan = Math.min(19, Math.max(12, (this.h || 26) * 0.68));

                // Side mirror & spinning silver hubcap snap off easily on corner or flank hits
                if ((amount >= 4.2 || hpRatio < 0.85) && !(this.detachedPartsMask & mirrorBit)) {
                    this.detachedPartsMask |= mirrorBit;
                    const mx = this.x + cosA * (hl * 0.34) - sinA * (hw * sideSign);
                    const my = this.y + sinA * (hl * 0.34) + cosA * (hw * sideSign);
                    this.spawnDetachedCarPart(g, "MIRROR", mx, my, (this.angle || 0) + sideSign * 1.35, 84, 4.6, 3.0, 0.26, 1);
                    this.spawnDetachedCarPart(g, "HUBCAP", mx - cosA * 6, my - sinA * 6, (this.angle || 0) + sideSign * 1.5, 96, 5.2, 5.2, 0.24, 2);
                }

                if (localX > frBias) {
                    // Front Zone: Stage 1 = Hanging crooked front bumper; Stage 2 = Front bumper flies off; Stage 3 = Hood flies off!
                    const fbBit = CAR_DETACH_PART.FRONT_BUMPER;
                    if (!(this.detachedPartsMask & fbBit)) {
                        if ((this.hangingBumperMask & fbBit) || amount >= 10.5 || hpRatio < 0.74 || isExplosive) {
                            this.detachedPartsMask |= fbBit;
                            this.hangingBumperMask &= ~fbBit;
                            this.spawnDetachedCarPart(
                                g,
                                "BUMPER",
                                this.x + cosA * (hl + 3),
                                this.y + sinA * (hl + 3),
                                (this.angle || 0) + sideSign * 0.55,
                                95 + Math.min(45, amount * 1.5),
                                4.4,
                                bumperSpan,
                                0.34,
                                2
                            );
                        } else if (amount >= 4.2) {
                            this.hangingBumperMask |= fbBit;
                            this.hangingBumperSide = sideSign;
                        }
                    }
                    const isCabOverBody = Boolean(
                        this.specKey === "CITY_BUS" || this.specKey === "TOUR_COACH" || this.specKey === "FIRE_TRUCK" ||
                        this.specKey === "MEDIC_AMBULANCE" || this.specKey === "BOXVILLE_VAN" || this.specKey === "HOTDOG_VAN" ||
                        this.specKey === "TANKER_RIG" || this.specKey === "FLATBED_TRUCK" || this.specKey === "BRINKS_TRUCK" || this.specKey === "SWAT_ENFORCER"
                    );
                    if (
                        !(this.detachedPartsMask & CAR_DETACH_PART.HOOD) &&
                        !isCabOverBody &&
                        (amount >= 14.5 || hpRatio < 0.58 || isExplosive)
                    ) {
                        this.detachedPartsMask |= CAR_DETACH_PART.HOOD;
                        this.spawnDetachedCarPart(
                            g,
                            "HOOD",
                            this.x + cosA * (hl * 0.65),
                            this.y + sinA * (hl * 0.65),
                            (this.angle || 0) + Math.PI + (Math.random() - 0.5) * 0.9,
                            88 + Math.min(55, amount * 1.4),
                            Math.min(15, (this.w || 60) * 0.22),
                            Math.min(17, (this.h || 26) * 0.62),
                            0.48,
                            2
                        );
                    }
                } else if (localX < -frBias) {
                    // Rear Zone: Stage 1 = Hanging rear bumper; Stage 2 = Rear bumper + exhaust muffler fly off; Stage 3 = Trunk lid flies off!
                    const rbBit = CAR_DETACH_PART.REAR_BUMPER;
                    if (!(this.detachedPartsMask & rbBit)) {
                        if ((this.hangingBumperMask & rbBit) || amount >= 10.5 || hpRatio < 0.72 || isExplosive) {
                            this.detachedPartsMask |= rbBit;
                            this.hangingBumperMask &= ~rbBit;
                            this.spawnDetachedCarPart(
                                g,
                                "BUMPER",
                                this.x - cosA * (hl + 3),
                                this.y - sinA * (hl + 3),
                                (this.angle || 0) + Math.PI + sideSign * 0.55,
                                92 + Math.min(45, amount * 1.4),
                                4.4,
                                bumperSpan,
                                0.32,
                                2
                            );
                            this.spawnDetachedCarPart(g, "MUFFLER", this.x - cosA * hl, this.y - sinA * hl, (this.angle || 0) + Math.PI - sideSign * 0.4, 82, 7.2, 2.5, 0.25, 2);
                        } else if (amount >= 4.2) {
                            this.hangingBumperMask |= rbBit;
                            this.hangingBumperSide = sideSign;
                        }
                    }
                    if (
                        !(this.detachedPartsMask & CAR_DETACH_PART.TRUNK) &&
                        this.bodyStyle !== "TRUCK" &&
                        (amount >= 15.0 || hpRatio < 0.54 || isExplosive)
                    ) {
                        this.detachedPartsMask |= CAR_DETACH_PART.TRUNK;
                        this.spawnDetachedCarPart(
                            g,
                            "TRUNK",
                            this.x - cosA * (hl * 0.68),
                            this.y - sinA * (hl * 0.68),
                            (this.angle || 0) + Math.PI + (Math.random() - 0.5) * 0.8,
                            86 + Math.min(50, amount * 1.3),
                            Math.min(11, (this.w || 60) * 0.17),
                            Math.min(16, (this.h || 26) * 0.58),
                            0.44,
                            2
                        );
                    }
                }

                // Flank / T-bone or heavy corner smash detaches Left or Right Car Door!
                if (
                    !(this.detachedPartsMask & doorBit) &&
                    (Math.abs(localX) <= frBias * 1.25 || hpRatio < 0.48 || isExplosive) &&
                    (amount >= 10.5 || hpRatio < 0.62 || isExplosive)
                ) {
                    this.detachedPartsMask |= doorBit;
                    this.spawnDetachedCarPart(
                        g,
                        "DOOR",
                        this.x - sinA * (hw * sideSign),
                        this.y + cosA * (hw * sideSign),
                        (this.angle || 0) + sideSign * (Math.PI * 0.5) + (Math.random() - 0.5) * 0.4,
                        92 + Math.min(48, amount * 1.4),
                        Math.min(14.5, (this.w || 60) * 0.24),
                        5.2,
                        0.40,
                        2
                    );
                }
            }
        }
    }

    resetDamage() {
        this.hp = this.maxHp;
        this.burnTimer = 0;
        this.chainExplodeTimer = 0;
        this.extinguishProgress = 0;
        this.fireExtinguished = false;
        this.damagedByPlayer = false;
        this.damageDeltaBits = 0;
        this.frontDented = false;
        this.rearDented = false;
        this.heavyDented = false;
        this.detachedPartsMask = 0;
        this.hangingBumperMask = 0;
    }

    normalizeAngle(a) {
        let diff = a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    triggerPanic(duration = 7.5, threatX = undefined, threatY = undefined) {
        if (this.driver === "AI_TRAFFIC") {
            this.aiPanicTimer = Math.max(this.aiPanicTimer, duration);
            this.aiState = "PANIC";
            if (typeof threatX === "number" && typeof threatY === "number") {
                this.aiThreatX = threatX;
                this.aiThreatY = threatY;
            }
        }
    }

    /* ========================================================================
       SAFE IN-LANE LATERAL OFFSET CLAMP
       Guarantees lateral pull-over / squeeze offsets NEVER push a road vehicle
       onto a sidewalk (PAWEMENT/FIELD) or across the centerline into oncoming lanes!
       ======================================================================== */
    clampSafeInLaneOffset(rawOffset, laneBx, laneBy, dirDx, dirDy, curZ, map) {
        if (!rawOffset || !Number.isFinite(rawOffset)) return 0;
        const clamped = Math.max(-13, Math.min(14, rawOffset));
        if (Math.abs(clamped) < 0.5) return 0;
        if (!map) return clamped;
        const rx = -dirDy;
        const ry = dirDx;
        const baseCx = (laneBx + 0.5) * TILE_SIZE;
        const baseCy = (laneBy + 0.5) * TILE_SIZE;
        const testX = baseCx + rx * clamped;
        const testY = baseCy + ry * clamped;
        const aheadX = testX + dirDx * 28;
        const aheadY = testY + dirDy * 28;
        if (map.isWaterAtPixel && (map.isWaterAtPixel(testX, testY) || map.isWaterAtPixel(aheadX, aheadY))) return 0;
        if (map.resolveCircleBuildingCollision && (map.resolveCircleBuildingCollision(testX, testY, 13, curZ).hit || map.resolveCircleBuildingCollision(aheadX, aheadY, 13, curZ).hit)) return 0;
        if (map.surfaceGround) {
            // Check outer wheel edge (clamped + 11px) so tires never mount a sidewalk or opposing lane!
            const outerOff = clamped + Math.sign(clamped) * 11;
            const edgeX = baseCx + rx * outerOff;
            const edgeY = baseCy + ry * outerOff;
            const ebx = Math.floor(edgeX / TILE_SIZE);
            const eby = Math.floor(edgeY / TILE_SIZE);
            if (ebx < 1 || ebx >= MAP_COLS - 1 || eby < 1 || eby >= MAP_ROWS - 1) return 0;
            const egt = map.surfaceGround[eby * MAP_COLS + ebx];
            if (egt !== GROUND_TYPE.ROAD) return 0;
            if ((ebx !== laneBx || eby !== laneBy) && map.getNavigationBlock) {
                const enb = map.getNavigationBlock(ebx, eby, curZ);
                if (!enb || enb.isParkingBay) return 0;
                const sameFlow =
                    (dirDx === 1 && enb.right && !enb.left) ||
                    (dirDx === -1 && enb.left && !enb.right) ||
                    (dirDy === 1 && enb.down && !enb.up) ||
                    (dirDy === -1 && enb.up && !enb.down);
                if (!sameFlow) return 0;
            }
        }
        return clamped;
    }

    /* ========================================================================
       SMART MULTI-LANE OVERTAKING (Parallel Same-Direction Lane Change)
       Checks adjacent road lane on 4-lane boulevards & highways when blocked ahead
       ======================================================================== */
    tryAdjacentLaneChange(bx, by, curZ, map, game) {
        if (this.aiLaneChangeCooldown > 0 || !this.aiChosenDir || this.aiChosenDir.isTurn || Math.abs(this.speed || 0) < 16) return false;
        const lidZ1 = map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0;
        if (lidZ1 === 25 || lidZ1 === 24 || (map.isStopLineBlock && map.isStopLineBlock(bx, by))) return false;

        const dx = this.aiChosenDir.dx || 0;
        const dy = this.aiChosenDir.dy || 0;
        if (dx === 0 && dy === 0) return false;
        if (map.getBlockInfo && map.getBlockInfo(bx + dx, by + dy, 1).lid === 25) return false;

        const perpX = -dy;
        const perpY = dx;
        const sides = this.aiTurnSeed > 0.5 ? [-1, 1] : [1, -1];
        const fx = Math.cos(this.aiChosenDir.angle);
        const fy = Math.sin(this.aiChosenDir.angle);

        for (const side of sides) {
            const nbx = bx + perpX * side;
            const nby = by + perpY * side;
            if (nbx < 2 || nbx >= MAP_COLS - 2 || nby < 2 || nby >= MAP_ROWS - 2) continue;
            if (map.isRestrictedNoTrafficZone && map.isRestrictedNoTrafficZone(nbx, nby)) continue;

            const nb = map.getNavigationBlock ? map.getNavigationBlock(nbx, nby, curZ) : null;
            if (!nb || nb.groundType !== GROUND_TYPE.ROAD || nb.isRailway || nb.isParkingBay) continue;
            if (map.surfaceGround && map.surfaceGround[nby * MAP_COLS + nbx] !== GROUND_TYPE.ROAD) continue;
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
            if (!fnb || fnb.groundType !== GROUND_TYPE.ROAD || fnb.isParkingBay) continue;
            if (map.surfaceGround && map.surfaceGround[(nby + dy) * MAP_COLS + (nbx + dx)] !== GROUND_TYPE.ROAD) continue;

            // Check that no vehicle or pedestrian is occupying the adjacent lane window [-halfLenSum .. +135px]
            // AND check rear-view mirror closing speed so we never cut off a fast-approaching vehicle or the player!
            const laneCenterX = (nbx + 0.5) * TILE_SIZE;
            const laneCenterY = (nby + 0.5) * TILE_SIZE;
            let laneClear = true;
            const mySpd = Math.abs(this.speed || 0);

            if (game && Array.isArray(game.vehicles)) {
                if (typeof game.ensureVehicleSpatialGrid === "function") game.ensureVehicleSpatialGrid();
                const gHead = game._vehGridHead;
                const gNext = game._vehGridNext;
                const checkLaneVeh = (other) => {
                    if (!other || other === this) return;
                    if (other.z !== undefined && Math.abs(other.z - curZ) > 0.85) return;
                    const odx = other.x - laneCenterX;
                    const ody = other.y - laneCenterY;
                    if (Math.abs(odx) > 190 || Math.abs(ody) > 190) return;
                    const longDist = odx * fx + ody * fy;
                    const latDist = Math.abs(odx * perpX + ody * perpY);
                    const halfLenSum = ((this.w || 48) + (other.w || 48)) * 0.5 + 14;
                    if (latDist < 28) {
                        if (longDist > -halfLenSum && longDist < 135) {
                            laneClear = false;
                            return;
                        }
                        const otherSpd = Math.abs(other.speed || 0);
                        if (longDist <= -halfLenSum && longDist > -165 && (otherSpd > mySpd + 24 || (other.driver === "PLAYER" && otherSpd > 35))) {
                            laneClear = false;
                        }
                    }
                };
                if (gHead && gNext) {
                    const gx0 = Math.max(0, (laneCenterX >> 8) - 1);
                    const gx1 = Math.min(127, (laneCenterX >> 8) + 1);
                    const gy0 = Math.max(0, (laneCenterY >> 8) - 1);
                    const gy1 = Math.min(127, (laneCenterY >> 8) + 1);
                    for (let gy = gy0; gy <= gy1 && laneClear; gy++) {
                        const rowOff = gy << 7;
                        for (let gx = gx0; gx <= gx1 && laneClear; gx++) {
                            for (let vi = gHead[rowOff | gx]; vi !== -1 && laneClear; vi = gNext[vi]) {
                                checkLaneVeh(game.vehicles[vi]);
                            }
                        }
                    }
                } else {
                    for (let vi = 0; vi < game.vehicles.length && laneClear; vi++) {
                        checkLaneVeh(game.vehicles[vi]);
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
                this.aiLaneShiftTimer = 1.15;
                this.aiLaneChangeSign = side;
                this.aiTurnSignal = side;
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
        if (this.aiPassengerStopCooldown > 0) this.aiPassengerStopCooldown = Math.max(0, this.aiPassengerStopCooldown - dt);
        if (this.aiHazardStopTimer > 0) this.aiHazardStopTimer = Math.max(0, this.aiHazardStopTimer - dt);
        if (this.aiFlashHeadlightsTimer > 0) this.aiFlashHeadlightsTimer = Math.max(0, this.aiFlashHeadlightsTimer - dt);
        if (this.aiFilteringTimer > 0) this.aiFilteringTimer = Math.max(0, this.aiFilteringTimer - dt);
        if (this._mergingFromCurbTimer > 0) this._mergingFromCurbTimer = Math.max(0, this._mergingFromCurbTimer - dt);
        this.aiTurnSignal = (this.aiHazardStopTimer || 0) > 0 ? 2 : 0;

        const curZ = this.z !== undefined ? this.z : 2.0;
        this.aiReverseTimer = 0;

        // Backing out of a gridlock: reverse straight back along the lane until we reach the previous intersection
        // (or the road behind us is blocked), then re-pick a route that avoids the jammed direction.
        if (this.gridlockReverseTimer > 0) {
            const rbx = Math.floor(this.x / TILE_SIZE);
            const rby = Math.floor(this.y / TILE_SIZE);
            const rLid = map.getBlockInfo ? map.getBlockInfo(rbx, rby, 1).lid : 0;
            const rCos = Math.cos(this.angle), rSin = Math.sin(this.angle);
            let rearBlocked = false;
            const rearX = this.x - rCos * ((this.w || 48) * 0.5 + 28);
            const rearY = this.y - rSin * ((this.w || 48) * 0.5 + 28);
            if (map.resolveCircleBuildingCollision && map.resolveCircleBuildingCollision(rearX, rearY, 12, curZ).hit) rearBlocked = true;
            if (!rearBlocked && map.surfaceGround) {
                const rrBx = Math.floor(rearX / TILE_SIZE);
                const rrBy = Math.floor(rearY / TILE_SIZE);
                const midRearX = this.x - rCos * ((this.w || 48) * 0.5 + 6);
                const midRearY = this.y - rSin * ((this.w || 48) * 0.5 + 6);
                const mrBx = Math.floor(midRearX / TILE_SIZE);
                const mrBy = Math.floor(midRearY / TILE_SIZE);
                if (
                    rrBx < 2 || rrBx >= MAP_COLS - 2 || rrBy < 2 || rrBy >= MAP_ROWS - 2 ||
                    map.surfaceGround[rrBy * MAP_COLS + rrBx] !== GROUND_TYPE.ROAD ||
                    map.surfaceGround[mrBy * MAP_COLS + mrBx] !== GROUND_TYPE.ROAD ||
                    (!this.gridlockStartedInBox && map.getBlockInfo && map.getBlockInfo(mrBx, mrBy, 1).lid === 25)
                ) {
                    rearBlocked = true;
                }
            }
            if (!rearBlocked && game && Array.isArray(game.vehicles)) {
                const checkRearVeh = (o) => {
                    if (!o || o === this || o === this.towingVehicle) return false;
                    if (o.z !== undefined && Math.abs(o.z - curZ) > 0.85) return false;
                    const ox = o.x - this.x, oy = o.y - this.y;
                    const along = ox * rCos + oy * rSin;
                    const lat = Math.abs(-ox * rSin + oy * rCos);
                    const need = ((this.w || 48) + (o.w || 48)) * 0.5 + 6;
                    return (along < 0 && along > -need && lat < ((this.h || 24) + (o.h || 24)) * 0.5);
                };
                if (game._vehGridHead && game._vehGridNext) {
                    const gCols = game._vehGridCols || 128;
                    const gRows = game._vehGridRows || 128;
                    const gx0 = Math.floor(this.x / 256);
                    const gy0 = Math.floor(this.y / 256);
                    for (let gy = Math.max(0, gy0 - 1); gy <= Math.min(gRows - 1, gy0 + 1) && !rearBlocked; gy++) {
                        const rowOff = gy * gCols;
                        for (let gx = Math.max(0, gx0 - 1); gx <= Math.min(gCols - 1, gx0 + 1); gx++) {
                            for (let vi = game._vehGridHead[rowOff + gx]; vi !== -1; vi = game._vehGridNext[vi]) {
                                if (checkRearVeh(game.vehicles[vi])) {
                                    rearBlocked = true;
                                    break;
                                }
                            }
                            if (rearBlocked) break;
                        }
                    }
                } else {
                    for (const o of game.vehicles) {
                        if (checkRearVeh(o)) {
                            rearBlocked = true;
                            break;
                        }
                    }
                }
            }
            const reachedRearLid = map.getBlockInfo ? map.getBlockInfo(Math.floor(rearX / TILE_SIZE), Math.floor(rearY / TILE_SIZE), 1).lid : 0;
            const reachedBox = (rLid === 25 || reachedRearLid === 25) && !this.gridlockStartedInBox;
            const leftBox = rLid !== 25 && this.gridlockStartedInBox;
            if (rearBlocked || reachedBox || leftBox) {
                this.gridlockReverseTimer = 0;
                this.vx = 0;
                this.vy = 0;
                this.speed = 0;
                this.aiBlockX = -1;
                this.aiBlockY = -1;
                this.aiChosenDir = null;
            } else {
                this.aiState = "REVERSING";
                return { throttle: this.speed < -42 ? 0 : -0.55, steer: 0, handbrake: false };
            }
        }

        let bx = Math.floor(this.x / TILE_SIZE);
        let by = Math.floor(this.y / TILE_SIZE);
        // Clamp any active pull-over offset to safe in-lane limits so it never pushes `bx`/`by` into sidewalks or oncoming lanes
        if (this.aiPullOverOffset && Math.abs(this.aiPullOverOffset) > 14) {
            this.aiPullOverOffset = Math.max(-13, Math.min(14, this.aiPullOverOffset));
        }
        const curBlk = map.getNavigationBlock ? map.getNavigationBlock(bx, by, curZ) : null;
        const lidZ1 = (map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0);

        // Off-road / sidewalk / esplanade parking-bay recovery: if a road vehicle is ever pushed onto a sidewalk, grass, or recessed parking bay,
        // steer (and slide smoothly) back onto the nearest legal same-direction road block instead of driving along the sidewalk!
        const onNonRoadSurface = Boolean(
            (curBlk && (curBlk.groundType !== GROUND_TYPE.ROAD || curBlk.isParkingBay)) ||
            (map.surfaceGround && bx >= 0 && bx < MAP_COLS && by >= 0 && by < MAP_ROWS && map.surfaceGround[by * MAP_COLS + bx] !== GROUND_TYPE.ROAD)
        );
        if (!this.waterOnly && !this.aiCurbParkingBay && (this._mergingFromCurbTimer || 0) <= 0 && onNonRoadSurface && map.getNavigationBlock) {
            this.aiPullOverOffset = 0;
            this.aiPullOverTimer = 0;
            let bestScore = 999999;
            let bestRx = -1;
            let bestRy = -1;
            let bestDir = null;
            for (let rdy = -3; rdy <= 3; rdy++) {
                for (let rdx = -3; rdx <= 3; rdx++) {
                    if (rdx === 0 && rdy === 0) continue;
                    const nbx = bx + rdx;
                    const nby = by + rdy;
                    if (nbx < 2 || nbx >= MAP_COLS - 2 || nby < 2 || nby >= MAP_ROWS - 2) continue;
                    if (map.surfaceGround && map.surfaceGround[nby * MAP_COLS + nbx] !== GROUND_TYPE.ROAD) continue;
                    const nb = map.getNavigationBlock(nbx, nby, curZ);
                    if (nb && nb.groundType === GROUND_TYPE.ROAD && !nb.isRailway && !nb.isParkingBay) {
                        const dirs = map.getAllowedRoadDirections ? map.getAllowedRoadDirections(nbx, nby, curZ) : [];
                        if (dirs.length === 0) continue;
                        const rcx = (nbx + 0.5) * TILE_SIZE;
                        const rcy = (nby + 0.5) * TILE_SIZE;
                        const dist = Math.hypot(rcx - this.x, rcy - this.y);
                        let alignPen = 90;
                        let pickDir = dirs[0];
                        for (const d of dirs) {
                            const pen = (1 - Math.cos(this.angle - d.angle)) * 55;
                            if (pen < alignPen) {
                                alignPen = pen;
                                pickDir = d;
                            }
                        }
                        const score = dist + alignPen;
                        if (score < bestScore) {
                            bestScore = score;
                            bestRx = nbx;
                            bestRy = nby;
                            bestDir = pickDir;
                        }
                    }
                }
            }
            if (bestRx < 0 && bx >= 447) {
                bestRx = 446;
                bestRy = by;
            }
            if (bestRx >= 0) {
                const targetRoadX = (bestRx + 0.5) * TILE_SIZE;
                const targetRoadY = (bestRy + 0.5) * TILE_SIZE;
                const dxR = targetRoadX - this.x;
                const dyR = targetRoadY - this.y;
                const dR = Math.hypot(dxR, dyR) || 1;
                const slideStep = Math.min(dR, 58 * dt);
                const nextX = this.x + (dxR / dR) * slideStep;
                const nextY = this.y + (dyR / dR) * slideStep;
                if (!map.resolveCircleBuildingCollision || !map.resolveCircleBuildingCollision(nextX, nextY, 12, curZ).hit) {
                    this.x = nextX;
                    this.y = nextY;
                }
                if (bestDir) {
                    const aErr = this.normalizeAngle(bestDir.angle - this.angle);
                    this.angle += aErr * Math.min(1, dt * 8.0);
                    this.aiBlockX = bestRx;
                    this.aiBlockY = bestRy;
                    this.aiChosenDir = { ...bestDir, bx: bestRx + bestDir.dx, by: bestRy + bestDir.dy, isTurn: false };
                    this.aiTargetBlockX = bestRx + bestDir.dx;
                    this.aiTargetBlockY = bestRy + bestDir.dy;
                }
                const toRoadAng = Math.atan2(targetRoadY - this.y, targetRoadX - this.x);
                return this.steerTowardTargetWithFeelers(dt, map, curZ, toRoadAng, 0.48, game);
            }
        }

        // Wrong-way self-correction on 1-way road lanes: if knocked or pushed into an opposing lane,
        // immediately shift into the adjacent legal right-hand lane if available, or re-orient with the legal flow!
        if (curBlk && curBlk.groundType === GROUND_TYPE.ROAD && lidZ1 !== 25 && !this.aiCurbParkingBay && map.getAllowedRoadDirections) {
            const tileDirs = map.getAllowedRoadDirections(bx, by, curZ);
            if (tileDirs.length === 1 && Math.cos(this.angle - tileDirs[0].angle) < -0.35) {
                this.aiPullOverOffset = 0;
                this.aiPullOverTimer = 0;
                const opp = tileDirs[0];
                const perpX = -opp.dy;
                const perpY = opp.dx;
                let shiftedToLegalLane = false;
                for (const side of [-1, 1]) {
                    const adjX = bx + perpX * side;
                    const adjY = by + perpY * side;
                    const adjNav = map.getNavigationBlock ? map.getNavigationBlock(adjX, adjY, curZ) : null;
                    if (!adjNav || adjNav.groundType !== GROUND_TYPE.ROAD || adjNav.isParkingBay) continue;
                    const adjDirs = map.getAllowedRoadDirections(adjX, adjY, curZ);
                    const matchDir = adjDirs.find((d) => Math.cos(this.angle - d.angle) > 0.65);
                    if (matchDir) {
                        bx = adjX;
                        by = adjY;
                        this.aiBlockX = adjX;
                        this.aiBlockY = adjY;
                        this.aiChosenDir = { ...matchDir, bx: adjX + matchDir.dx, by: adjY + matchDir.dy, isTurn: false };
                        this.aiTargetBlockX = adjX + matchDir.dx;
                        this.aiTargetBlockY = adjY + matchDir.dy;
                        this.aiLaneShiftTimer = 0.85;
                        const toLegalX = (adjX + 0.5) * TILE_SIZE - this.x;
                        const toLegalY = (adjY + 0.5) * TILE_SIZE - this.y;
                        const toLegalD = Math.hypot(toLegalX, toLegalY) || 1;
                        this.x += (toLegalX / toLegalD) * Math.min(toLegalD, 72 * dt);
                        this.y += (toLegalY / toLegalD) * Math.min(toLegalD, 72 * dt);
                        shiftedToLegalLane = true;
                        break;
                    }
                }
                if (shiftedToLegalLane) {
                    // Ensure heading is aligned with the matched legal lane so vehicle never points backward
                    this.angle = this.aiChosenDir.angle;
                } else {
                    this.angle = opp.angle;
                    this.aiBlockX = bx;
                    this.aiBlockY = by;
                    this.aiChosenDir = { ...opp, bx: bx + opp.dx, by: by + opp.dy, isTurn: false };
                    this.aiTargetBlockX = bx + opp.dx;
                    this.aiTargetBlockY = by + opp.dy;
                }
            }
        }

        // Reset single-turn intersection guard and record entry heading whenever outside an intersection (lidZ1 !== 25)
        if (lidZ1 !== 25) {
            this.aiTurnedInIntersection = false;
            this.aiIntersectionEntryAngle = (this.aiChosenDir && typeof this.aiChosenDir.angle === "number")
                ? this.aiChosenDir.angle
                : this.angle;
        }

        // 1. Commit to a valid outgoing NYC.CMP arrow direction upon entering each road block.
        // Pass the previously committed cardinal angle (refAngle) so a car mid-turn doesn't think its new lane is a 2nd turn!
        if (lidZ1 === 25 && this.aiLaneShiftTimer > 0) {
            this.aiLaneShiftTimer = 0;
        }
        const movedOutOfLane = !this.aiChosenDir || (this.aiLaneShiftTimer <= 0 && (bx !== this.aiBlockX || by !== this.aiBlockY));
        if (!movedOutOfLane && this.aiLaneShiftTimer > 0 && this.aiChosenDir && !this.aiChosenDir.isTurn) {
            if (this.aiChosenDir.dy !== 0 && by !== this.aiBlockY) {
                this.aiBlockY = by;
                this.aiTargetBlockX = this.aiBlockX;
                this.aiTargetBlockY = by + this.aiChosenDir.dy;
            } else if (this.aiChosenDir.dx !== 0 && bx !== this.aiBlockX) {
                this.aiBlockX = bx;
                this.aiTargetBlockX = bx + this.aiChosenDir.dx;
                this.aiTargetBlockY = this.aiBlockY;
            }
        }
        if (movedOutOfLane) {
            const refAngle = this.aiChosenDir && typeof this.aiChosenDir.angle === "number"
                ? this.aiChosenDir.angle
                : this.angle;
            const entryAngle = (lidZ1 === 25 && typeof this.aiIntersectionEntryAngle === "number")
                ? this.aiIntersectionEntryAngle
                : refAngle;
            this.aiBlockX = bx;
            this.aiBlockY = by;
            this.aiTurnSeed = (this.aiTurnSeed * 1.6180339887 + 0.31) % 1.0;
            if (typeof map.chooseNextRoadBlock === "function") {
                if (this.aiPanicTimer > 0 && typeof this.aiThreatX === "number" && typeof map.chooseTargetGuidedRoadBlock === "function") {
                    const fleeX = this.x + (this.x - this.aiThreatX) * 4.0;
                    const fleeY = this.y + (this.y - this.aiThreatY) * 4.0;
                    this.aiChosenDir = map.chooseTargetGuidedRoadBlock(
                        bx,
                        by,
                        refAngle,
                        fleeX,
                        fleeY,
                        curZ,
                        Boolean(this.aiTurnedInIntersection),
                        entryAngle
                    );
                } else {
                    this.aiChosenDir = map.chooseNextRoadBlock(
                        bx,
                        by,
                        refAngle,
                        curZ,
                        this.aiTurnSeed,
                        Boolean(this.aiTurnedInIntersection),
                        entryAngle
                    );
                }
                // Alternative route after backing out of a gridlock: try other exits than the jammed direction
                if (this.gridlockAvoidTimer > 0 && typeof this.gridlockAvoidAngle === "number") {
                    const isJammedDir = (dir) => dir && Math.abs(this.normalizeAngle(dir.angle - this.gridlockAvoidAngle)) < 0.3;
                    for (let k = 1; k <= 7 && isJammedDir(this.aiChosenDir); k++) {
                        const altSeed = (this.aiTurnSeed + k * 0.137) % 1.0;
                        const alt = map.chooseNextRoadBlock(bx, by, refAngle, curZ, altSeed, false, entryAngle);
                        if (alt && !isJammedDir(alt)) {
                            this.aiChosenDir = alt;
                            this.gridlockAvoidTimer = 0;
                        }
                    }
                }
            } else {
                const snapAngle = Math.round(refAngle / (Math.PI * 0.5)) * (Math.PI * 0.5);
                this.aiChosenDir = { dx: Math.round(Math.cos(snapAngle)), dy: Math.round(Math.sin(snapAngle)), angle: snapAngle, isTurn: false };
            }
            if (!this.aiChosenDir) {
                const snapAngle = Math.round(refAngle / (Math.PI * 0.5)) * (Math.PI * 0.5);
                this.aiChosenDir = { dx: Math.round(Math.cos(snapAngle)), dy: Math.round(Math.sin(snapAngle)), angle: snapAngle, isTurn: false };
            }
            if (this.aiChosenDir.isTurn) {
                this.aiTurnedInIntersection = true;
            }
            this.aiTargetBlockX = bx + this.aiChosenDir.dx;
            this.aiTargetBlockY = by + this.aiChosenDir.dy;
        }

        const isPanicked = (this.aiPanicTimer > 0 && !this.isHeavyVehicle) || Boolean(this.sirenActive);
        const baseCruiseThrottle = Math.max(0.38, this.aiCruiseFactor || 0.5);
        let desiredThrottle = isPanicked ? (this.sirenActive ? 0.78 : Math.min(0.76, baseCruiseThrottle + 0.16)) : baseCruiseThrottle;
        this.aiState = isPanicked ? "PANIC" : "CRUISE";
        if (this.aiCurbParkCooldown > 0) {
            this.aiCurbParkCooldown = Math.max(0, this.aiCurbParkCooldown - dt);
        }
        if ((this.wardenHoldTimer || 0) > 0) {
            this.wardenHoldTimer = Math.max(0, this.wardenHoldTimer - dt);
        }
        if (this.aiPullOverTimer > 0) {
            this.aiPullOverTimer = Math.max(0, this.aiPullOverTimer - dt);
        } else if (this.aiPullOverOffset) {
            this.aiPullOverOffset *= Math.pow(0.06, dt);
            if (Math.abs(this.aiPullOverOffset) < 0.4) this.aiPullOverOffset = 0;
        }
        // Real-World Traffic Warden / Flagger Alternating 1-Lane STOP Signal:
        // When an on-foot Traffic Warden holds opposing traffic while clearing a single-lane bottleneck, hold cleanly until signaled through!
        if (!isPanicked && (this.wardenHoldTimer || 0) > 0) {
            this.aiState = "STOPPED_LIGHT";
            const hMult = Math.pow(0.008, dt);
            this.vx *= hMult;
            this.vy *= hMult;
            this.speed *= hMult;
            if (Math.abs(this.speed) < 18) {
                this.vx = 0;
                this.vy = 0;
                this.speed = 0;
            }
            return { throttle: 0, steer: 0, handbrake: true };
        }

        // 1B. Emergency Corridor / Siren Detection (Ambulances, Tow Trucks, Fire Engines & Police)
        //     Runs BEFORE Curbside Parking & Bus/Taxi stops so priority emergency vehicles always take precedence!
        const fx = Math.cos(this.angle);
        const fy = Math.sin(this.angle);
        const rx = -fy;
        const ry = fx;
        let sirenBehind = false;
        let sirenYield = false;
        const sirenVehicles = (game && game._prioritySirenVehicles) || (game && game.vehicles);
        if (this.driver === "AI_TRAFFIC" && Array.isArray(sirenVehicles) && sirenVehicles.length > 0) {
            for (let si = 0; si < sirenVehicles.length; si++) {
                const other = sirenVehicles[si];
                if (!other || other === this || other.destroyed) continue;
                // Only yield for MOVING priority life-safety emergency rigs (Police, Ambulance, Fire Engine — NOT slow/parked units or Tow Trucks!)
                // so a parked Ambulance/Fire Truck on scene never freezes adjacent or oncoming street lanes!
                const isPriorityVeh = Boolean(
                    other.sirenActive &&
                    other.driver !== "AI_TOW" &&
                    other.specKey !== "TOW_TRUCK" &&
                    Math.abs(other.speed || Math.hypot(other.vx || 0, other.vy || 0)) > 16
                );
                if (!isPriorityVeh) continue;
                if (other.z !== undefined && Math.abs(other.z - curZ) > 0.85) continue;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                if (Math.abs(dx) > 290 || Math.abs(dy) > 290) continue;
                const dist = Math.hypot(dx, dy);
                if (dist > 290) continue;

                const forwardDist = dx * fx + dy * fy; // < 0 means emergency/tow vehicle is BEHIND us
                const signedLat = dx * rx + dy * ry;
                const lateralDist = Math.abs(signedLat);
                const cosDiff = Math.cos(other.angle - this.angle);

                const isRightSafe = (offPx) => {
                    const pxTest = this.x + rx * offPx;
                    const pyTest = this.y + ry * offPx;
                    return (
                        (!map.isWaterAtPixel || !map.isWaterAtPixel(pxTest, pyTest)) &&
                        (!map.resolveCircleBuildingCollision || !map.resolveCircleBuildingCollision(pxTest, pyTest, 14, curZ).hit)
                    );
                };

                if (cosDiff > 0.35 && forwardDist < 42 && forwardDist > -275 && lateralDist < 58) {
                    const prefSide = signedLat > 6 ? -1 : 1; // Default: pull right (+1), clamped to ±14px so vehicle stays strictly inside its 64px lane tile!
                    if (isRightSafe(prefSide * 14)) {
                        this.aiPullOverOffset = prefSide * 14;
                        this.aiPullOverTimer = 2.0;
                    } else if (isRightSafe(-prefSide * 14)) {
                        this.aiPullOverOffset = -prefSide * 14;
                        this.aiPullOverTimer = 2.0;
                    }
                    this.aiTurnSignal = 2; // 4-way hazard blinkers
                    if (lateralDist < 22 && forwardDist < 0) {
                        sirenBehind = true;
                        if (this.aiLaneChangeCooldown <= 0) {
                            this.tryAdjacentLaneChange(bx, by, curZ, map, game);
                        }
                    } else {
                        sirenYield = true;
                    }
                } else if (
                    (cosDiff < -0.35 && forwardDist > -15 && forwardDist < 190 && lateralDist < 62) ||
                    (Math.abs(cosDiff) <= 0.45 && forwardDist > -15 && forwardDist < 160 && lateralDist < 58)
                ) {
                    sirenYield = true;
                    this.aiTurnSignal = 2;
                    if (isRightSafe(14)) {
                        this.aiPullOverOffset = 14;
                        this.aiPullOverTimer = 1.8;
                    }
                }
            }
        }
        if (sirenBehind) {
            sirenYield = false;
            this.aiState = "PULL_OVER_SIREN";
            desiredThrottle = Math.max(desiredThrottle, 0.64);
        }

        // Release any active curbside parking stall if panicked, yielding to siren, or no longer normal AI traffic
        if (this.aiCurbParkingBay && (isPanicked || sirenBehind || sirenYield || this.driver !== "AI_TRAFFIC")) {
            const relBay = this.aiCurbParkingBay;
            if (relBay._occupiedBy === this) {
                relBay._occupiedBy = null;
            }
            const relSignY = Math.sin(relBay.angle || 0) >= 0 ? 1 : -1;
            this.aiBlockX = relBay.c + (relBay.dc || 0);
            this.aiBlockY = relBay.r;
            this.aiTargetBlockX = this.aiBlockX;
            this.aiTargetBlockY = this.aiBlockY + relSignY;
            this.aiLaneShiftTimer = 0.85;
            this._mergingFromCurbTimer = 1.45;
            this.aiCurbParkingBay = null;
            this.aiCurbParkedTimer = 0;
        }

        // 1A. Dynamic Curbside Parallel Parking Bay Pull-In & Pull-Out:
        //     Calm civilian cars occasionally pull into an unoccupied recessed curbside bay, park for 10..18s,
        //     and then check their mirror before smoothly merging back out into the travel lane!
        if (
            movedOutOfLane &&
            !this.aiCurbParkingBay &&
            !isPanicked &&
            !sirenBehind &&
            !sirenYield &&
            this.driver === "AI_TRAFFIC" &&
            !this.isHeavyVehicle &&
            !this.isMotorcycle &&
            !this.isPolice &&
            !this.isEmergency &&
            (this.aiCurbParkCooldown || 0) <= 0 &&
            this.aiChosenDir &&
            !this.aiChosenDir.isTurn &&
            this.aiChosenDir.dy !== 0 &&
            (!map.getBlockInfo || (
                map.getBlockInfo(bx, by + this.aiChosenDir.dy, 1).lid !== 25 &&
                map.getBlockInfo(bx, by + this.aiChosenDir.dy * 2, 1).lid !== 25
            )) &&
            map.curbParkingBayByRoadTile &&
            this.aiTurnSeed < 0.22
        ) {
            const rKey0 = (by << 16) | (bx & 0xffff);
            const rKey1 = ((by + this.aiChosenDir.dy) << 16) | (bx & 0xffff);
            const bayList0 = map.curbParkingBayByRoadTile.get(rKey0) || [];
            const bayList1 = map.curbParkingBayByRoadTile.get(rKey1) || [];
            const bayCandidates = bayList0.length > 0 && bayList1.length > 0 ? bayList0.concat(bayList1) : (bayList0.length > 0 ? bayList0 : bayList1);
            if (bayCandidates.length > 0 && game && Array.isArray(game.vehicles)) {
                for (let bi = 0; bi < bayCandidates.length; bi++) {
                    const bay = bayCandidates[bi];
                    if (bay._occupiedBy && !bay._occupiedBy.destroyed && bay._occupiedBy.aiCurbParkingBay === bay) continue;
                    const alongBay = (bay.y - this.y) * this.aiChosenDir.dy;
                    if (alongBay < 4 || alongBay > 115) continue;
                    let stallFree = true;
                    if (game._vehGridHead && game._vehGridNext) {
                        const gCols = game._vehGridCols || 128;
                        const gRows = game._vehGridRows || 128;
                        const gx0 = Math.floor(bay.x / 256);
                        const gy0 = Math.floor(bay.y / 256);
                        for (let gy = Math.max(0, gy0 - 1); gy <= Math.min(gRows - 1, gy0 + 1) && stallFree; gy++) {
                            const rowOff = gy * gCols;
                            for (let gx = Math.max(0, gx0 - 1); gx <= Math.min(gCols - 1, gx0 + 1); gx++) {
                                for (let vi = game._vehGridHead[rowOff + gx]; vi !== -1; vi = game._vehGridNext[vi]) {
                                    const ov = game.vehicles[vi];
                                    if (!ov || ov === this) continue;
                                    if (Math.hypot(ov.x - bay.x, ov.y - bay.y) < 54) {
                                        stallFree = false;
                                        break;
                                    }
                                }
                                if (!stallFree) break;
                            }
                        }
                    } else {
                        for (let vi = 0; vi < game.vehicles.length; vi++) {
                            const ov = game.vehicles[vi];
                            if (!ov || ov === this) continue;
                            if (Math.hypot(ov.x - bay.x, ov.y - bay.y) < 54) {
                                stallFree = false;
                                break;
                            }
                        }
                    }
                    if (stallFree) {
                        this.aiCurbParkingBay = bay;
                        bay._occupiedBy = this;
                        this.aiCurbParkedTimer = 10.0 + ((this.aiTurnSeed * 43.0) % 9.0);
                        break;
                    }
                }
            }
        }

        if (this.aiCurbParkingBay) {
            const bay = this.aiCurbParkingBay;
            const travelSignY = Math.sin(bay.angle) >= 0 ? 1 : -1;
            const alongErr = (bay.y - this.y) * travelSignY;
            const latErr = bay.x - this.x;
            // Right-hand side relative to vertical travel (0, travelSignY) is (-travelSignY, 0), so bay.dc * (-travelSignY) gives +1 right / -1 left
            const bayTurnSign = (bay.dc || 1) * (-travelSignY) >= 0 ? 1 : -1;
            // Smoothly steer/glide laterally into the recessed bay ONLY when right alongside the stall (< 52px) so cars never cruise along the sidewalk!
            const bayRollSpd = Math.abs(this.speed || 0);
            if (alongErr < 52 && alongErr > -14) {
                const maxBayLat = Math.min(48, bayRollSpd * 0.48) * dt;
                this.x += Math.max(-maxBayLat, Math.min(maxBayLat, latErr * Math.min(1, dt * 6.5)));
            }
            const signedBayLat = latErr * (-travelSignY);
            if (bayRollSpd > 8 && Math.abs(latErr) > 2.2) {
                const targetBayVis = Math.max(-0.26, Math.min(0.26, Math.atan2(signedBayLat * 0.65, 36)));
                this.visualSteerYaw = (this.visualSteerYaw || 0) + (targetBayVis - (this.visualSteerYaw || 0)) * Math.min(1, dt * 10.0);
            } else {
                this.visualSteerYaw = (this.visualSteerYaw || 0) * Math.pow(0.001, dt);
                if (Math.abs(this.visualSteerYaw) < 0.005 || bayRollSpd < 3) this.visualSteerYaw = 0;
            }
            const angErr = this.normalizeAngle(bay.angle - this.angle);
            this.angle += angErr * Math.min(1, dt * 10.0);
            this.angularVelocity = 0;
            this.steerAngleRad = 0;

            if (Math.abs(alongErr) <= 10 && Math.abs(latErr) <= 5) {
                this.x = bay.x;
                this.angle = bay.angle;
                this.vx = 0;
                this.vy = 0;
                this.speed = 0;
                this.aiState = "CURB_PARKED";
                this.aiCurbParkedTimer = (this.aiCurbParkedTimer || 0) - dt;
                // Activate road-side indicator 2.2s before pulling back out into the lane!
                if (this.aiCurbParkedTimer < 2.2) {
                    this.aiTurnSignal = -bayTurnSign;
                }
                if (this.aiCurbParkedTimer <= 0) {
                    // Check mirror & adjacent travel lane before pulling back out into traffic
                    const roadLaneX = (bay.c + (bay.dc || 0) + 0.5) * TILE_SIZE;
                    let canPullOut = true;
                    if (game && Array.isArray(game.vehicles)) {
                        const gHead = game._vehGridHead;
                        const gNext = game._vehGridNext;
                        if (gHead && gNext) {
                            const gx0 = Math.max(0, (this.x >> 8) - 1);
                            const gx1 = Math.min(127, (this.x >> 8) + 1);
                            const gy0 = Math.max(0, (this.y >> 8) - 1);
                            const gy1 = Math.min(127, (this.y >> 8) + 1);
                            for (let gy = gy0; gy <= gy1 && canPullOut; gy++) {
                                const rowOff = gy << 7;
                                for (let gx = gx0; gx <= gx1; gx++) {
                                    for (let vi = gHead[rowOff | gx]; vi !== undefined && vi !== -1; vi = gNext[vi]) {
                                        const ov = game.vehicles[vi];
                                        if (!ov || ov === this) continue;
                                        if (Math.abs(ov.x - roadLaneX) < 30) {
                                            const relY = (ov.y - this.y) * travelSignY;
                                            if (relY > -105 && relY < 72) {
                                                canPullOut = false;
                                                break;
                                            }
                                        }
                                    }
                                    if (!canPullOut) break;
                                }
                            }
                        } else {
                            for (let vi = 0; vi < game.vehicles.length; vi++) {
                                const ov = game.vehicles[vi];
                                if (!ov || ov === this) continue;
                                if (Math.abs(ov.x - roadLaneX) < 30) {
                                    const relY = (ov.y - this.y) * travelSignY;
                                    if (relY > -105 && relY < 72) {
                                        canPullOut = false;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if (canPullOut) {
                        if (bay._occupiedBy === this) bay._occupiedBy = null;
                        this.aiCurbParkingBay = null;
                        this.aiCurbParkCooldown = 26.0;
                        this.aiBlockX = bay.c + (bay.dc || 0);
                        this.aiBlockY = bay.r;
                        this.aiTargetBlockX = this.aiBlockX;
                        this.aiTargetBlockY = this.aiBlockY + travelSignY;
                        this.aiLaneShiftTimer = 0.85;
                        this._mergingFromCurbTimer = 1.45;
                        this.aiLaneChangeSign = -bayTurnSign;
                        this.aiTurnSignal = -bayTurnSign;
                        this.aiState = "CRUISE";
                    } else {
                        this.aiCurbParkedTimer = 1.5; // Wait 1.5s for traffic to pass before checking mirror again
                    }
                }
                return { throttle: 0, steer: 0, handbrake: true };
            } else if (alongErr > -4 && alongErr < 125) {
                this.aiState = "FOLLOWING";
                this.aiTurnSignal = bayTurnSign;
                const approachSpd = Math.max(14, Math.min(48, Math.abs(alongErr) * 1.4));
                if (this.speed > approachSpd) {
                    this.vx *= Math.pow(0.04, dt);
                    this.vy *= Math.pow(0.04, dt);
                    this.speed *= Math.pow(0.04, dt);
                    return { throttle: 0, steer: 0, handbrake: false };
                }
                return { throttle: 0.22, steer: 0, handbrake: false };
            } else {
                // Missed the bay window -> release and merge cleanly back into the road lane!
                if (bay._occupiedBy === this) bay._occupiedBy = null;
                this.aiCurbParkingBay = null;
                this.aiCurbParkCooldown = 14.0;
                this.aiBlockX = bay.c + (bay.dc || 0);
                this.aiBlockY = by;
                this.aiTargetBlockX = this.aiBlockX;
                this.aiTargetBlockY = by + travelSignY;
                this.aiLaneShiftTimer = 0.85;
                this._mergingFromCurbTimer = 1.45;
            }
        }

        // 1A-bis. Autonomous Taxi & City Bus Curbside Passenger Service (VICE_CAB, CITY_BUS, TOUR_COACH):
        //         Taxis respond to hailing pedestrians or pull over to drop off a fare; buses make brief scheduled curb stops!
        if (
            !isPanicked &&
            !sirenBehind &&
            !sirenYield &&
            this.driver === "AI_TRAFFIC" &&
            !this.aiCurbParkingBay &&
            (this.specKey === "VICE_CAB" || this.specKey === "CITY_BUS" || this.specKey === "TOUR_COACH")
        ) {
            const cDx = this.aiChosenDir ? (this.aiChosenDir.dx || 0) : 0;
            const cDy = this.aiChosenDir ? (this.aiChosenDir.dy || 0) : 0;
            const curAlignErr = this.aiChosenDir ? Math.abs(this.normalizeAngle(this.aiChosenDir.angle - this.angle)) : 0;
            const nearJunction = Boolean(
                lidZ1 === 25 ||
                (this.aiChosenDir && this.aiChosenDir.isTurn) ||
                (map.getBlockInfo && (
                    map.getBlockInfo(bx + cDx, by + cDy, 1).lid === 25 ||
                    map.getBlockInfo(bx + cDx * 2, by + cDy * 2, 1).lid === 25 ||
                    map.getBlockInfo(bx - cDx, by - cDy, 1).lid === 25
                )) ||
                (map.isStopLineBlock && (map.isStopLineBlock(bx, by) || map.isStopLineBlock(bx + cDx, by + cDy)))
            );
            if (nearJunction) {
                this.aiPassengerStopTimer = 0;
                this.aiPassengerDropPending = false;
                this.aiBoardingStarted = false;
                if (this.aiPassengerTarget) {
                    this.aiPassengerTarget = null;
                }
                if (!(this.gridlockEscapeTimer > 0)) {
                    this.aiPullOverOffset = 0;
                    this.aiPullOverTimer = 0;
                }
            } else if (
                movedOutOfLane &&
                !this.aiPassengerTarget &&
                (this.aiPassengerStopTimer || 0) <= 0 &&
                (this.aiPassengerStopCooldown || 0) <= 0 &&
                this.aiChosenDir &&
                !this.aiChosenDir.isTurn &&
                curAlignErr < 0.03 &&
                this.aiTurnSeed > 0.84
            ) {
                // Check if right-hand side is a paved sidewalk (GROUND_TYPE.PAWEMENT) both here and 1 tile ahead
                const rightBx = bx - cDy;
                const rightBy = by + cDx;
                const rightNav = map.getNavigationBlock ? map.getNavigationBlock(rightBx, rightBy, curZ) : null;
                const rightAheadNav = map.getNavigationBlock ? map.getNavigationBlock(rightBx + cDx, rightBy + cDy, curZ) : null;
                if (
                    rightNav &&
                    rightNav.groundType === GROUND_TYPE.PAWEMENT &&
                    rightAheadNav &&
                    rightAheadNav.groundType === GROUND_TYPE.PAWEMENT &&
                    (!map.resolveCircleBuildingCollision || !map.resolveCircleBuildingCollision((rightBx + 0.5) * TILE_SIZE, (rightBy + 0.5) * TILE_SIZE, 10, curZ).hit)
                ) {
                    this.aiPassengerStopTimer = this.specKey === "VICE_CAB" ? 3.2 : 4.2;
                    this.aiPassengerDropPending = true;
                }
            }
            const hailedPed = this.aiPassengerTarget;
            if (hailedPed && (hailedPed.dead || (hailedPed.panicTimer || 0) > 0 || (hailedPed.hailingTaxiTimer || 0) <= 0)) {
                this.aiPassengerTarget = null;
            }
            if (!nearJunction && (this.aiPassengerTarget || (this.aiPassengerStopTimer || 0) > 0)) {
                const isBusOrCoach = (this.specKey === "CITY_BUS" || this.specKey === "TOUR_COACH");
                this.aiPullOverOffset = isBusOrCoach ? 12 : 16;
                this.aiPullOverTimer = 1.2;
                this.aiTurnSignal = 2; // 4-way hazard flashers while picking up / dropping off passengers
                this.aiState = "STOPPED_LIGHT";
                if (this.aiChosenDir && typeof this.aiChosenDir.angle === "number") {
                    this.angle = this.aiChosenDir.angle;
                }
                const brakeMult = Math.pow(0.015, dt);
                this.vx *= brakeMult;
                this.vy *= brakeMult;
                this.speed *= brakeMult;
                if (Math.abs(this.speed) < 12) {
                    this.vx = 0;
                    this.vy = 0;
                    this.speed = 0;
                    if (this.aiPassengerDropPending && game && typeof game.spawnAlightingPassenger === "function") {
                        this.aiPassengerDropPending = false;
                        game.spawnAlightingPassenger(this);
                    }
                    // Buses / tour coaches: waiting pedestrians walk to the front door and climb aboard during the stop
                    if (!this.aiBoardingStarted && isBusOrCoach && game && typeof game.boardBusPassengers === "function") {
                        this.aiBoardingStarted = true;
                        game.boardBusPassengers(this);
                    }
                }
                if ((this.aiPassengerStopTimer || 0) > 0) {
                    this.aiPassengerStopTimer = Math.max(0, this.aiPassengerStopTimer - dt);
                    if (this.aiPassengerStopTimer <= 0) {
                        this.aiPassengerStopCooldown = 28.0;
                        this.aiBoardingStarted = false;
                    }
                }
            }
        }

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

        // Always center vehicle smoothly onto the active lane centerline ONLY while rolling forward (zero sideways strafing while stopped!)
        const rollSpd = Math.abs(this.speed || 0);
        const maxLatRate = this.aiChosenDir.isTurn
            ? Math.min(82, rollSpd * 0.85)
            : Math.min(54, rollSpd * 0.48);
        const maxLatStep = maxLatRate * dt;
        const laneBlockX = typeof this.aiBlockX === "number" && this.aiBlockX >= 0 ? this.aiBlockX : bx;
        const laneBlockY = typeof this.aiBlockY === "number" && this.aiBlockY >= 0 ? this.aiBlockY : by;
        const rawPullOff = (!this.aiChosenDir.isTurn && this.aiPullOverOffset) ? this.aiPullOverOffset : 0;
        const pullOff = rawPullOff
            ? this.clampSafeInLaneOffset(rawPullOff, laneBlockX, laneBlockY, this.aiChosenDir.dx || 0, this.aiChosenDir.dy || 0, curZ, map)
            : 0;
        let signedLatErr = 0;
        if (this.aiChosenDir.dx !== 0) {
            const centerY = (laneBlockY + 0.5) * TILE_SIZE + (this.aiChosenDir.dx > 0 ? pullOff : -pullOff);
            const dyErr = centerY - this.y;
            signedLatErr = dyErr * (this.aiChosenDir.dx > 0 ? 1 : -1);
            this.y += Math.max(-maxLatStep, Math.min(maxLatStep, dyErr * Math.min(1, dt * 8.5)));
        } else if (this.aiChosenDir.dy !== 0) {
            const centerX = (laneBlockX + 0.5) * TILE_SIZE + (this.aiChosenDir.dy > 0 ? -pullOff : pullOff);
            const dxErr = centerX - this.x;
            signedLatErr = dxErr * (this.aiChosenDir.dy > 0 ? -1 : 1);
            this.x += Math.max(-maxLatStep, Math.min(maxLatStep, dxErr * Math.min(1, dt * 8.5)));
        }
        // Purely visual nose yaw for the renderer during lane changes / pull-overs (never alters physics this.angle or AI radars!)
        const isBusOrCoach = (this.specKey === "CITY_BUS" || this.specKey === "TOUR_COACH");
        if (!this.aiChosenDir.isTurn && !isBusOrCoach && rollSpd > 14 && Math.abs(signedLatErr) > 2.2) {
            const targetVisYaw = Math.max(-0.26, Math.min(0.26, Math.atan2(signedLatErr * 0.65, Math.max(36, rollSpd * 0.55))));
            this.visualSteerYaw = (this.visualSteerYaw || 0) + (targetVisYaw - (this.visualSteerYaw || 0)) * Math.min(1, dt * 11.0);
        } else {
            this.visualSteerYaw = (this.visualSteerYaw || 0) * Math.pow(0.0005, dt);
            if (Math.abs(this.visualSteerYaw) < 0.005 || rollSpd < 4 || isBusOrCoach) this.visualSteerYaw = 0;
        }

        // 2B. Progressive Intersection-Approach Speed Staging (Allows full 54..256 px/s diversity on straightaways while guaranteeing 0 red-light runs!)
        const nextLidZ1 = map.getBlockInfo ? map.getBlockInfo(this.aiTargetBlockX, this.aiTargetBlockY, 1).lid : 0;
        const stepDx = this.aiTargetBlockX - bx;
        const stepDy = this.aiTargetBlockY - by;
        const twoAheadLidZ1 = map.getBlockInfo
            ? map.getBlockInfo(this.aiTargetBlockX + stepDx, this.aiTargetBlockY + stepDy, 1).lid
            : 0;
        const threeAheadLidZ1 = map.getBlockInfo
            ? map.getBlockInfo(this.aiTargetBlockX + stepDx * 2, this.aiTargetBlockY + stepDy * 2, 1).lid
            : 0;
        const distToTargetCenter = Math.hypot(tx - this.x, ty - this.y);
        const isStopBlock = (lidZ1 !== 25 && nextLidZ1 === 25 && distToTargetCenter > 31.5);
        const isPreStopBlock = (lidZ1 !== 25 && nextLidZ1 !== 25 && twoAheadLidZ1 === 25);
        const isThreePreStopBlock = (lidZ1 !== 25 && nextLidZ1 !== 25 && twoAheadLidZ1 !== 25 && threeAheadLidZ1 === 25);

        if (!isPanicked && !sirenBehind && this.driver === "AI_TRAFFIC") {
            const onBridgeSpan = Boolean(map.bridgeMask && map.bridgeMask[by * MAP_COLS + bx] > 0);
            const personalCruise = (this.aiTargetCruiseSpeed || ((this.maxSpeed || 280) * (this.aiCruiseFactor || 0.50))) * (onBridgeSpan ? 1.08 : 1.0);
            // Only stage speed down when approaching an intersection (3 -> 2 -> 1 tiles ahead); on open blocks each vehicle runs at its personal cruise speed!
            const approachCap = isStopBlock
                ? (this.isHeavyVehicle ? 72 : 84)
                : (isPreStopBlock
                    ? (this.isHeavyVehicle ? 76 : 94)
                    : (isThreePreStopBlock ? (this.isHeavyVehicle ? 96 : 138) : personalCruise));
            if (this.speed > approachCap + 1) {
                desiredThrottle = 0;
                const capMult = Math.pow((isStopBlock || isPreStopBlock) ? 0.12 : 0.18, dt);
                this.vx *= capMult;
                this.vy *= capMult;
                this.speed *= capMult;
            }
        }

        const maxTurnSpd = this.isHeavyVehicle ? 68 : 82;
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

        // 3. Authentic GTA 1 / GTA 2 Entrance Stop-Line Traffic Lights
        // Check signal presence relative to the intersection entry block (boxBx, boxBy) so PreStopBlock, StopBlock, and Box agree 100%!
        const sigBoxX = isPreStopBlock ? (this.aiTargetBlockX + stepDx + 0.5) * TILE_SIZE : tx;
        const sigBoxY = isPreStopBlock ? (this.aiTargetBlockY + stepDy + 0.5) * TILE_SIZE : ty;
        const hasSignal = (isStopBlock || isPreStopBlock) && map && typeof map.hasTrafficSignalNear === "function"
            ? map.hasTrafficSignalNear(sigBoxX, sigBoxY, 360)
            : true;
        // Compute active turn signal / blinker indicator (-1 = left, +1 = right, 2 = 4-way hazards)
        if (!this.aiTurnSignal) {
            if (this.aiLaneShiftTimer > 0 && this.aiLaneChangeSign) {
                this.aiTurnSignal = this.aiLaneChangeSign;
            } else if (this.aiChosenDir && this.aiChosenDir.isTurn) {
                const entryA = typeof this.aiIntersectionEntryAngle === "number" ? this.aiIntersectionEntryAngle : this.angle;
                const turnDelta = this.normalizeAngle(this.aiChosenDir.angle - entryA);
                if (Math.abs(turnDelta) > 0.12) {
                    this.aiTurnSignal = turnDelta >= 0 ? 1 : -1;
                }
            } else if (isStopBlock && typeof map.chooseNextRoadBlock === "function") {
                // Pre-signal upcoming turn at the intersection box ahead (cached per target block so we don't recompute 60x/s at red lights!)
                const previewKey = ((this.aiTargetBlockY & 511) << 9) | (this.aiTargetBlockX & 511);
                if (this._previewTurnBoxKey !== previewKey) {
                    this._previewTurnBoxKey = previewKey;
                    this._previewTurnSignalVal = 0;
                    const baseA = this.aiChosenDir ? this.aiChosenDir.angle : this.angle;
                    const previewTurn = map.chooseNextRoadBlock(
                        this.aiTargetBlockX,
                        this.aiTargetBlockY,
                        baseA,
                        curZ,
                        (this.aiTurnSeed * 1.6180339887 + 0.31) % 1.0,
                        false,
                        baseA
                    );
                    if (previewTurn && previewTurn.isTurn) {
                        const turnDelta = this.normalizeAngle(previewTurn.angle - baseA);
                        if (Math.abs(turnDelta) > 0.12) {
                            this._previewTurnSignalVal = turnDelta >= 0 ? 1 : -1;
                        }
                    }
                }
                this.aiTurnSignal = this._previewTurnSignalVal || 0;
            }
        }

        // 3B. "Don't Block the Box" Anti-Gridlock Rule:
        // Even on a GREEN light, if a same-direction car inside or just exiting the intersection box ahead is stopped (< 8px/s),
        // hold behind the stop line so we never trap cross-traffic when the signal changes!
        const isFarOffScreenTraffic = Boolean(
            !isPanicked &&
            !sirenBehind &&
            this.driver === "AI_TRAFFIC" &&
            !this.towingVehicle &&
            game &&
            game.player &&
            (Math.abs(this.x - game.player.x) > 1050 || Math.abs(this.y - game.player.y) > 850)
        );
        const runFullRadarNow = !isFarOffScreenTraffic || ((this._farRadarTick = (this._farRadarTick === undefined ? 0 : ((this._farRadarTick + 1) & 3))) === 0);

        let boxExitBlocked = false;
        if (!isPanicked && isStopBlock && runFullRadarNow && game && Array.isArray(game.vehicles)) {
            const gHead = game._vehGridHead;
            const gNext = game._vehGridNext;
            const checkBoxVeh = (ov) => {
                if (!ov || ov === this || ov.destroyed || ov.isCurbParked || ov.aiCurbParkingBay || ov.isEstateCar) return false;
                const dx = ov.x - this.x;
                const dy = ov.y - this.y;
                if (Math.abs(dx) > 220 || Math.abs(dy) > 220) return false;
                if (ov.z !== undefined && Math.abs(ov.z - curZ) > 0.85) return false;
                const fwd = dx * fx + dy * fy;
                const lat = Math.abs(dx * rx + dy * ry);
                const ovSpd = Math.abs(ov.speed || Math.hypot(ov.vx || 0, ov.vy || 0));
                const ovCos = Math.cos((ov.angle || 0) - this.angle);
                const ovAbsCos = Math.abs(ovCos);
                const ovLid = map.getBlockInfo ? map.getBlockInfo(ov.x >> 6, ov.y >> 6, 1).lid : 0;
                // 0. Never enter an intersection box if ANY vehicle stopped/deployed inside the box physically occupies our lane corridor
                //    (lat < 46 for cross/diagonal |cos| <= 0.78; lat < 26 for parallel/oncoming so opposite-lane traffic at lat=64px is never blocked!)
                const stopCorridorLat = ovAbsCos <= 0.78 ? 46 : 26;
                if (ovLid === 25 && fwd > 4 && fwd < 180 && lat < stopCorridorLat && (ovSpd < 9 || ov.driver === null || ov.deployedMedic || ov._parkedAtFireScene)) return true;
                // 1. Hold at stop line if ANY cross or diagonal vehicle (|cos| <= 0.78, ~38°..142°) is clearing the intersection box ahead!
                if (ovLid === 25 && ovAbsCos <= 0.78 && fwd > 4 && fwd < 170 && lat < 62) return true;
                // 2. Unsignalized intersection yield: yield at stop line if cross-traffic is actively entering the box!
                if (!hasSignal && ovAbsCos <= 0.65 && ovSpd > 10 && fwd > 6 && fwd < 155 && lat < 92) return true;
                // 3. "Don't Block the Box": hold at stop line if a same-direction vehicle is stopped inside the box or right in the exit throat!
                if (ovCos >= 0.65 && lat < 24 && ovSpd < 7 && fwd > 22 && (ovLid === 25 ? fwd < 225 : fwd < 155)) return true;
                return false;
            };
            if (gHead && gNext) {
                const gx0 = Math.max(0, (this.x >> 8) - 1);
                const gx1 = Math.min(127, (this.x >> 8) + 1);
                const gy0 = Math.max(0, (this.y >> 8) - 1);
                const gy1 = Math.min(127, (this.y >> 8) + 1);
                for (let gy = gy0; gy <= gy1 && !boxExitBlocked; gy++) {
                    const rowOff = gy << 7;
                    for (let gx = gx0; gx <= gx1; gx++) {
                        for (let vi = gHead[rowOff | gx]; vi !== undefined && vi !== -1; vi = gNext[vi]) {
                            if (checkBoxVeh(game.vehicles[vi])) {
                                boxExitBlocked = true;
                                break;
                            }
                        }
                        if (boxExitBlocked) break;
                    }
                }
            } else {
                for (let vi = 0; vi < game.vehicles.length; vi++) {
                    if (checkBoxVeh(game.vehicles[vi])) {
                        boxExitBlocked = true;
                        break;
                    }
                }
            }
            this._cachedBoxBlocked = boxExitBlocked;
        } else if (isFarOffScreenTraffic && isStopBlock) {
            boxExitBlocked = Boolean(this._cachedBoxBlocked);
        } else {
            this._cachedBoxBlocked = false;
        }

        if (!isPanicked && curBlk && (isStopBlock || isPreStopBlock) && ((hasSignal && !sirenBehind) || boxExitBlocked) && game) {
            const isNSLane = stepDy !== 0 ? true : (Boolean(curBlk.up || curBlk.down) && !curBlk.left && !curBlk.right);
            const isEWLane = stepDx !== 0 ? true : (Boolean(curBlk.left || curBlk.right) && !curBlk.up && !curBlk.down);
            const nsState = hasSignal && isNSLane && typeof game.getNSTrafficLightState === "function"
                ? game.getNSTrafficLightState()
                : (hasSignal && isNSLane && typeof game.isNSGreen === "function" ? (game.isNSGreen() ? "GREEN" : "RED") : "GREEN");
            const ewState = hasSignal && isEWLane && typeof game.getEWTrafficLightState === "function"
                ? game.getEWTrafficLightState()
                : (hasSignal && isEWLane && typeof game.isEWGreen === "function" ? (game.isEWGreen() ? "GREEN" : "RED") : "GREEN");
            const nsStop = !sirenBehind && isNSLane && nsState !== "GREEN";
            const ewStop = !sirenBehind && isEWLane && ewState !== "GREEN";
            const tlPh = (((game.trafficLightTimer || 0) % 12.0) + 12.0) % 12.0;
            const isEarlyYellow = (isNSLane && nsState === "AMBER" && tlPh < 5.05) || (isEWLane && ewState === "AMBER" && tlPh >= 10.6 && tlPh < 11.05);
            if (nsStop || ewStop || boxExitBlocked) {
                const halfLen = (this.w || 62) * 0.5;
                const stopDist = 37 + halfLen;
                const distToStopRef = isStopBlock ? distToTargetCenter : (distToTargetCenter + TILE_SIZE);
                const stopsInPreBlock = isPreStopBlock && stopDist > 94;
                const committedOnAmber = isEarlyYellow && !boxExitBlocked && isStopBlock && distToStopRef < (stopDist - 12) && Math.abs(this.speed || 0) > 24;
                if (committedOnAmber) {
                    desiredThrottle = Math.max(desiredThrottle, 0.46);
                } else if (isPreStopBlock && !stopsInPreBlock) {
                    if (this.speed > 56) {
                        desiredThrottle = 0;
                        const preMult = Math.pow(0.08, dt);
                        this.vx *= preMult;
                        this.vy *= preMult;
                        this.speed *= preMult;
                    } else {
                        desiredThrottle = Math.min(desiredThrottle, 0.22);
                    }
                } else if ((isStopBlock || stopsInPreBlock) && !committedOnAmber) {
                    this.aiState = (nsStop || ewStop) ? "STOPPED_LIGHT" : "YIELD_BOX";
                    if (distToStopRef > stopDist + 3) {
                        const rollSpd = Math.max(0, Math.min(54, (distToStopRef - stopDist) * 1.65));
                        if (this.speed > rollSpd) {
                            desiredThrottle = 0;
                            const slowMult = Math.pow(0.015, dt);
                            this.vx *= slowMult;
                            this.vy *= slowMult;
                            this.speed *= slowMult;
                        } else {
                            desiredThrottle = 0.14;
                        }
                    } else {
                        desiredThrottle = 0;
                        const brakeMult = Math.pow(0.0005, dt);
                        this.vx *= brakeMult;
                        this.vy *= brakeMult;
                        this.speed *= brakeMult;
                        if (Math.abs(this.speed) < 34 || distToStopRef <= stopDist + 1) {
                            this.vx = 0;
                            this.vy = 0;
                            this.speed = 0;
                            return { throttle: 0, steer: 0, handbrake: true };
                        }
                    }
                }
            }
        }

        // 4. Multi-Zone Forward Radar: True Bumper-to-Bumper Same-Lane Gap + Moving Cross-Traffic Check
        let closestBumperGap = 999;
        let closestEntity = null;
        let isPlayerBlocking = false;
        let crossTrafficYield = false;
        const inIntersectionBox = (lidZ1 === 25);

        if (!runFullRadarNow) {
            closestBumperGap = this._cachedClosestGap !== undefined ? this._cachedClosestGap : 999;
            closestEntity = this._cachedClosestEntity || null;
            crossTrafficYield = Boolean(this._cachedCrossYield);
        } else {
            if (game && Array.isArray(game.vehicles)) {
                if (typeof game.ensureVehicleSpatialGrid === "function") game.ensureVehicleSpatialGrid();
                const gHead = game._vehGridHead;
                const gNext = game._vehGridNext;
                const checkOtherVeh = (other) => {
                    if (!other || other === this || other === this.towingVehicle || other === this.towTarget) return;
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    if (Math.abs(dx) > 368 || Math.abs(dy) > 368) return;
                    if (dx * dx + dy * dy > 135424) return;
                    if (other.z !== undefined && Math.abs(other.z - curZ) > 0.85) return;

                const forwardDist = dx * fx + dy * fy;
                const lateralDist = Math.abs(dx * rx + dy * ry);
                const cosDiff = Math.cos(other.angle - this.angle);

                // B. Same-Direction Vehicle OR Stationary Wreck/Abandoned Car Ahead in Same Lane:
                // Strictly maintain true sprite-length bumper-to-bumper gap (half of our rendered length + half of lead car's rendered length)
                // Recessed curb-parked / driveway cars (`isCurbParked`, `aiCurbParkingBay`, `isEstateCar`) sit outside active travel lanes, so use tight 17px clearance!
                const isRecessedParked = Boolean(other.isCurbParked || other.aiCurbParkingBay || other.isEstateCar);
                const isStationaryObstacle = !isRecessedParked && Boolean(other.destroyed || other.driver === null || other.deployedMedic || other._parkedAtFireScene);
                const filteringPastThis = Boolean(
                    this.isMotorcycle &&
                    this.aiFilteringTimer > 0 &&
                    !other.isMotorcycle &&
                    Math.abs(other.speed || 0) < 10
                );
                const inTurnOrShift = Boolean(
                    (this.aiChosenDir && this.aiChosenDir.isTurn) ||
                    this.aiLaneShiftTimer > 0 ||
                    (other.aiChosenDir && other.aiChosenDir.isTurn) ||
                    other.aiLaneShiftTimer > 0
                );
                const myHalfLen = (this.w || 62) * 0.50;
                const myHalfWid = (this.h || 26) * 0.48;
                const otherHalfLen = (other.w || 62) * 0.50;
                const otherHalfWid = (other.h || 28) * 0.48;
                const absCos = Math.abs(cosDiff);
                const absSin = Math.sqrt(Math.max(0, 1 - Math.min(1, cosDiff * cosDiff)));
                const projOtherHalfLen = absCos * otherHalfLen + absSin * otherHalfWid;
                const projOtherHalfWid = absCos * otherHalfWid + absSin * otherHalfLen;
                const otherSpd = Math.abs(other.speed || Math.hypot(other.vx || 0, other.vy || 0));

                const halfWidthSum = filteringPastThis
                    ? 10
                    : (isRecessedParked ? 17 : Math.min(inTurnOrShift ? 32 : 30, (this.h + (other.h || 28)) * 0.48 + 3));
                const halfLengthSum = myHalfLen + otherHalfLen;
                if ((cosDiff > 0.42 || isStationaryObstacle) && forwardDist > 0 && lateralDist < halfWidthSum) {
                    const effHalfLenSum = cosDiff > 0.42 ? halfLengthSum : (myHalfLen + projOtherHalfLen);
                    const bumperGap = forwardDist - effHalfLenSum;
                    if (bumperGap < closestBumperGap) {
                        closestBumperGap = bumperGap;
                        closestEntity = other;
                        isPlayerBlocking = other.driver === "PLAYER";
                    }
                } else if (
                    !isRecessedParked &&
                    cosDiff <= 0.42 &&
                    forwardDist > 2 &&
                    lateralDist < (myHalfWid + projOtherHalfWid + 2)
                ) {
                    // OBB Cross-Hull Guard: never drive our front bumper into the flank or overhang of a perpendicular/diagonal car or bus!
                    const obbGap = forwardDist - (myHalfLen + projOtherHalfLen);
                    if (obbGap < 26 && (otherSpd < 12 || obbGap < 16) && obbGap < closestBumperGap) {
                        closestBumperGap = obbGap;
                        closestEntity = other;
                        isPlayerBlocking = other.driver === "PLAYER";
                    }
                }

                // B2. Rear-View Mirror Tailgater Detection:
                // If a fast-moving vehicle (player or speeding car) is closing in directly behind us in our lane,
                // cautious drivers yield the lane or pull slightly right, while aggressive drivers honk!
                if (
                    !isPanicked &&
                    this.driver === "AI_TRAFFIC" &&
                    this.aiState !== "STOPPED_LIGHT" &&
                    cosDiff > 0.72 &&
                    forwardDist < -14 &&
                    forwardDist > -95 &&
                    lateralDist < 20 &&
                    otherSpd > Math.abs(this.speed || 0) + 42
                ) {
                    if (!this.aiAggressive) {
                        if (this.aiLaneChangeCooldown <= 0) {
                            this.tryAdjacentLaneChange(bx, by, curZ, map, game);
                        } else {
                            const safeYieldRight = this.clampSafeInLaneOffset(14, laneBlockX, laneBlockY, this.aiChosenDir ? (this.aiChosenDir.dx || 0) : 0, this.aiChosenDir ? (this.aiChosenDir.dy || 0) : 0, curZ, map);
                            if (safeYieldRight >= 8) {
                                this.aiPullOverOffset = safeYieldRight;
                                this.aiPullOverTimer = 1.1;
                                this.aiTurnSignal = 1;
                            }
                        }
                    } else if (this.aiHornCooldown <= 0 && game && game.audio && other.driver === "PLAYER") {
                        this.aiHornCooldown = 5.0;
                        game.audio.playHorn(false, this.specKey);
                    }
                }

                // C. Cross-Traffic & Turning Priority Inside/Approaching Intersection Box (lidZ1 === 25):
                // Uses deterministic priority (Emergency > Straight-Through > Closer-to-Clearing > ID tie-breaker) even at low speeds
                // so two crossing vehicles NEVER mutually release brakes and T-bone inside the box!
                const nearOrInBox = inIntersectionBox || (nextLidZ1 === 25 && distToTargetCenter < 56);
                if (nearOrInBox && !other.destroyed && (other.driver !== null)) {
                    const otherFx = Math.cos(other.angle);
                    const otherFy = Math.sin(other.angle);
                    const theirForwardDist = (-dx) * otherFx + (-dy) * otherFy;
                    const myTurning = Boolean(this.aiChosenDir && this.aiChosenDir.isTurn);
                    const otherTurning = Boolean(other.aiChosenDir && other.aiChosenDir.isTurn);
                    const otherInBox = map.getBlockInfo ? (map.getBlockInfo(other.x >> 6, other.y >> 6, 1).lid === 25) : false;
                    const rearHullTail = -(otherHalfLen + 18);

                    if ((inIntersectionBox || otherInBox) && cosDiff <= 0.55 && forwardDist > -8 && forwardDist < 92 && lateralDist < 46 && theirForwardDist > rearHullTail && theirForwardDist < 96) {
                        const playerDirectlyInPath = other.driver === "PLAYER" && (otherSpd > 10 || (lateralDist < 22 && forwardDist < 52));
                        const emgBeatsMe = Boolean(other.sirenActive && !this.sirenActive);
                        const straightBeatsTurn = myTurning && !otherTurning && otherInBox;
                        const closerBeatsFurther = (myTurning === otherTurning) && (
                            theirForwardDist < forwardDist - 6 ||
                            (Math.abs(theirForwardDist - forwardDist) <= 6 && String(this.id) < String(other.id))
                        );
                        // Break 3-way circular yields: if `other` is stalled (>1.35s) and not physically in front of our bumper, roll clear of the box!
                        const otherStalledCycle = !playerDirectlyInPath && !emgBeatsMe && otherSpd < 3 && (other.gridlockTimer || 0) > 1.35 &&
                            (this.gridlockTimer || 0) <= (other.gridlockTimer || 0) &&
                            (lateralDist >= (myHalfWid + projOtherHalfWid - 2) || forwardDist > (myHalfLen + projOtherHalfLen + 14));
                        if (!otherStalledCycle && (playerDirectlyInPath || emgBeatsMe || straightBeatsTurn || closerBeatsFurther)) {
                            crossTrafficYield = true;
                        }
                    } else if (myTurning && !otherTurning && otherSpd > 16 && cosDiff < 0.35) {
                        if (forwardDist > -8 && forwardDist < 108 && lateralDist < 48 && theirForwardDist > rearHullTail && theirForwardDist < 112) {
                            crossTrafficYield = true;
                        }
                    }
                }
                };
                if (gHead && gNext) {
                    const extraCellX = Math.abs(this.speed || 0) > 150 ? Math.round(fx) : 0;
                    const extraCellY = Math.abs(this.speed || 0) > 150 ? Math.round(fy) : 0;
                    const gx0 = Math.max(0, (this.x >> 8) - 1 + Math.min(0, extraCellX));
                    const gx1 = Math.min(127, (this.x >> 8) + 1 + Math.max(0, extraCellX));
                    const gy0 = Math.max(0, (this.y >> 8) - 1 + Math.min(0, extraCellY));
                    const gy1 = Math.min(127, (this.y >> 8) + 1 + Math.max(0, extraCellY));
                    for (let gy = gy0; gy <= gy1; gy++) {
                        const rowOff = gy << 7;
                        for (let gx = gx0; gx <= gx1; gx++) {
                            for (let vi = gHead[rowOff | gx]; vi !== -1; vi = gNext[vi]) {
                                checkOtherVeh(game.vehicles[vi]);
                            }
                        }
                    }
                } else {
                    for (let vi = 0; vi < game.vehicles.length; vi++) {
                        checkOtherVeh(game.vehicles[vi]);
                    }
                }
            }

            // Check pedestrians or player on foot directly in front of car's bumper (and wider scan on zebra crosswalks!)
            if (game) {
                const myFrontHalf = (this.w || 62) * 0.46 + 6;
                const extraFrontReach = Math.max(0, myFrontHalf - 28);
                if (game.player && !game.player.inVehicle && !game.player.dead) {
                    const dx = game.player.x - this.x;
                    const dy = game.player.y - this.y;
                    if (Math.abs(dx) < 96 + extraFrontReach && Math.abs(dy) < 96 + extraFrontReach) {
                        const forwardDist = dx * fx + dy * fy;
                        const lateralDist = Math.abs(dx * rx + dy * ry);
                        if (forwardDist > 6 && forwardDist < 72 + extraFrontReach && lateralDist < 18) {
                            const gap = forwardDist - myFrontHalf;
                            if (gap < closestBumperGap) {
                                closestBumperGap = gap;
                                closestEntity = game.player;
                                isPlayerBlocking = true;
                            }
                        }
                    }
                }
                if (Array.isArray(game.peds)) {
                    const pHead = game._pedGridHead;
                    const pNext = game._pedGridNext;
                    const checkPedAhead = (ped) => {
                        if (!ped || ped.dead) return;
                        // An active Traffic Warden waving cars through from behind the safety cone taper is directing flow, not jaywalking!
                        if (ped.isTrafficWarden && ped.isDirectingTraffic) return;
                        const dx = ped.x - this.x;
                        const dy = ped.y - this.y;
                        if (Math.abs(dx) > 96 + extraFrontReach || Math.abs(dy) > 96 + extraFrontReach) return;
                        const forwardDist = dx * fx + dy * fy;
                        const lateralDist = Math.abs(dx * rx + dy * ry);
                        const onZebraCrosswalk = Boolean(
                            ped.isCrossingRoad ||
                            (map && map.isStopLineBlock && map.isStopLineBlock(ped.x >> 6, ped.y >> 6))
                        );
                        const maxFwd = ((onZebraCrosswalk && !this.aiAggressive) ? 84 : 56) + extraFrontReach;
                        const maxLat = (onZebraCrosswalk && !this.aiAggressive) ? 26 : 15;
                        if (forwardDist > 6 && forwardDist < maxFwd && lateralDist < maxLat) {
                            const gap = forwardDist - myFrontHalf;
                            if (gap < closestBumperGap) {
                                closestBumperGap = gap;
                                closestEntity = ped;
                            }
                        }
                    };
                    if (pHead && pNext) {
                        const gx0 = Math.max(0, (this.x >> 8) - 1);
                        const gx1 = Math.min(127, (this.x >> 8) + 1);
                        const gy0 = Math.max(0, (this.y >> 8) - 1);
                        const gy1 = Math.min(127, (this.y >> 8) + 1);
                        for (let gy = gy0; gy <= gy1; gy++) {
                            const rowOff = gy << 7;
                            for (let gx = gx0; gx <= gx1; gx++) {
                                for (let pi = pHead[rowOff | gx]; pi !== undefined && pi !== -1; pi = pNext[pi]) {
                                    checkPedAhead(game.peds[pi]);
                                }
                            }
                        }
                    } else {
                        for (let pi = 0; pi < game.peds.length; pi++) {
                            checkPedAhead(game.peds[pi]);
                        }
                    }
                }
            }
            this._cachedClosestGap = closestBumperGap;
            this._cachedClosestEntity = closestEntity;
            this._cachedCrossYield = crossTrafficYield;
        }

        // 5. Smooth Forward-Only Speed Regulation (Maintains a realistic sprite-length-aware bumper-to-bumper cushion!)
        const involvesLongVeh = Boolean((this.w || 62) >= 75 || (closestEntity && (closestEntity.w || 62) >= 75));
        // Real-World Tow Truck Work-Zone Buffer: give an actively maneuvering Tow Truck 92px of clearance so it can reverse & K-turn to hook a wreck!
        const isManeuveringTowAhead = Boolean(
            closestEntity &&
            closestEntity.driver === "AI_TOW" &&
            closestEntity.towTarget &&
            !closestEntity.towingVehicle &&
            Math.hypot(closestEntity.x - closestEntity.towTarget.x, closestEntity.y - closestEntity.towTarget.y) < 220
        );
        const minStopGap = isManeuveringTowAhead ? 92 : (this.isMotorcycle ? 11 : (involvesLongVeh ? 20 : 15));
        const curForwardSpd = Math.max(0, this.speed || 0);
        const highSpeedStoppingBuffer = Math.max(0, curForwardSpd - 120) * 0.65;
        const followHorizon = Math.max(145, minStopGap + curForwardSpd * (this.isHeavyVehicle ? 0.88 : 0.72) + highSpeedStoppingBuffer + 44);
        const stoppedAtSignalNow = (this.aiState === "STOPPED_LIGHT" && desiredThrottle === 0);
        if (sirenYield || crossTrafficYield) {
            this.aiState = sirenYield ? "YIELD_SIREN" : (stoppedAtSignalNow ? "STOPPED_LIGHT" : "FOLLOWING");
            desiredThrottle = 0;
            const brakeMult = Math.pow(0.01, dt);
            this.vx *= brakeMult;
            this.vy *= brakeMult;
            this.speed *= brakeMult;
        } else if (closestEntity && closestBumperGap < followHorizon) {
            const obstacleSpeed = closestEntity.speed !== undefined ? Math.max(0, closestEntity.speed) : 0;
            const isDeadOrAbandonedObstacle = Boolean(
                closestEntity.destroyed ||
                closestEntity.driver === null ||
                closestEntity.deployedMedic ||
                closestEntity._parkedAtFireScene
            );
            const isStationaryCar = Boolean(
                isDeadOrAbandonedObstacle ||
                (obstacleSpeed < 10 && this.aiState !== "STOPPED_LIGHT")
            );
            const myDesiredCruiseSpd = this.aiTargetCruiseSpeed || ((this.maxSpeed || 210) * (this.aiCruiseFactor || 0.50));
            const isSlowerMovingCar = Boolean(
                this.aiState !== "STOPPED_LIGHT" &&
                obstacleSpeed >= 10 &&
                obstacleSpeed < myDesiredCruiseSpd * 0.84 &&
                (this.isMotorcycle || this.aiAggressive || myDesiredCruiseSpd >= 140 || closestEntity.isHeavyVehicle || obstacleSpeed < 95)
            );
            const overtakeTriggerGap = Math.max(116, Math.min(180, 96 + Math.max(0, curForwardSpd - obstacleSpeed) * 0.85));
            if ((isStationaryCar || isSlowerMovingCar || sirenBehind || this.driver === "AI_TOW") && closestBumperGap < overtakeTriggerGap && this.aiLaneChangeCooldown <= 0) {
                this.tryAdjacentLaneChange(bx, by, curZ, map, game);
            }
            // Motorcycle Lane-Splitting / Queue Filtering at Red Lights & Traffic Queues:
            // Agile motorcycles filter along the lane-divider strip (±15px) past stopped cars up to the stop line!
            if (
                this.isMotorcycle &&
                !isPanicked &&
                !inIntersectionBox &&
                nextLidZ1 !== 25 &&
                twoAheadLidZ1 !== 25 &&
                closestEntity &&
                closestEntity.w &&
                !closestEntity.isMotorcycle &&
                obstacleSpeed < 10 &&
                closestBumperGap < 72 &&
                (!this.aiChosenDir || !this.aiChosenDir.isTurn)
            ) {
                for (const fSide of [-1, 1]) {
                    const safeStrip = this.clampSafeInLaneOffset(fSide * 14, laneBlockX, laneBlockY, this.aiChosenDir ? (this.aiChosenDir.dx || 0) : 0, this.aiChosenDir ? (this.aiChosenDir.dy || 0) : 0, curZ, map);
                    if (Math.abs(safeStrip) >= 11) {
                        this.aiPullOverOffset = safeStrip;
                        this.aiPullOverTimer = 1.0;
                        this.aiFilteringTimer = 1.0;
                        this.aiTurnSignal = fSide;
                        this.aiState = "LANE_CHANGE";
                        return { throttle: this.speed > 52 ? 0 : 0.28, steer: 0, handbrake: false };
                    }
                }
            }
            // Never wait forever behind a destroyed wreck or in-lane abandoned driverless vehicle:
            // first try changing to a legal adjacent same-direction lane, otherwise squeeze within safe in-lane limits (±14px max, never onto sidewalks or oncoming lanes!)
            if ((isDeadOrAbandonedObstacle || (this.driver === "AI_TOW" && this.towingVehicle && isStationaryCar)) && closestBumperGap < 92) {
                if (this.aiLaneChangeCooldown <= 0 && this.tryAdjacentLaneChange(bx, by, curZ, map, game)) {
                    return { throttle: this.speed > 62 ? 0 : 0.34, steer: 0, handbrake: false };
                }
                const prefSides = (this.aiPullOverOffset && this.aiPullOverOffset > 0) ? [1, -1] : [-1, 1];
                for (const bSide of prefSides) {
                    const safeOff = this.clampSafeInLaneOffset(bSide * 14, laneBlockX, laneBlockY, this.aiChosenDir.dx || 0, this.aiChosenDir.dy || 0, curZ, map);
                    if (Math.abs(safeOff) >= 10) {
                        this.aiPullOverOffset = safeOff;
                        this.aiPullOverTimer = 1.65;
                        this.aiTurnSignal = bSide;
                        break;
                    }
                }
            }
            if (isStationaryCar && closestBumperGap < 62 && (this.driver === "AI_TOW" || sirenBehind)) {
                const bypassSide = (this.aiPullOverOffset && this.aiPullOverOffset > 0) ? 1 : -1;
                const safeOff = this.clampSafeInLaneOffset(bypassSide * 14, laneBlockX, laneBlockY, this.aiChosenDir.dx || 0, this.aiChosenDir.dy || 0, curZ, map);
                if (Math.abs(safeOff) >= 8) {
                    this.aiPullOverOffset = safeOff;
                    this.aiPullOverTimer = 1.5;
                }
            }
            const leadStoppedAtLight = Boolean(
                !inIntersectionBox &&
                closestEntity &&
                (closestEntity.aiState === "STOPPED_LIGHT" || closestEntity.aiState === "STOPPED_QUEUE") &&
                obstacleSpeed < 10
            );
            this.aiState = stoppedAtSignalNow ? "STOPPED_LIGHT" : (leadStoppedAtLight ? "STOPPED_QUEUE" : "FOLLOWING");
            if (closestBumperGap < 50 && (isPlayerBlocking || (closestEntity && closestEntity.kind === "CIVILIAN"))) {
                this.aiFlashHeadlightsTimer = Math.max(this.aiFlashHeadlightsTimer || 0, 0.85);
            }
            if (stoppedAtSignalNow) {
                desiredThrottle = 0;
                if (closestBumperGap <= minStopGap) {
                    this.vx = 0;
                    this.vy = 0;
                    this.speed = 0;
                }
            } else if (closestBumperGap <= minStopGap) {
                desiredThrottle = 0;
                const brakeMult = Math.pow(0.0008, dt);
                this.vx *= brakeMult;
                this.vy *= brakeMult;
                this.speed *= brakeMult;
                if (Math.abs(this.speed) < 34 || closestBumperGap <= minStopGap - 1) {
                    this.vx = 0;
                    this.vy = 0;
                    this.speed = 0;
                }
                if (this.aiHornCooldown <= 0 && game && game.audio && isPlayerBlocking) {
                    this.aiHornCooldown = 4.2 + Math.random() * 3.0;
                    const distToPlayer = Math.hypot(game.player.x - this.x, game.player.y - this.y);
                    if (distToPlayer < 420) {
                        game.audio.playHorn(Boolean(this.isEmergency), this.specKey);
                    }
                }
            } else {
                // Proportional closing speed: smoothly matches lead vehicle speed and brakes early based on cushion!
                const gapMargin = Math.max(0, closestBumperGap - minStopGap);
                const closingGain = this.isHeavyVehicle ? 1.20 : 1.48;
                const targetSpd = obstacleSpeed * 0.92 + gapMargin * closingGain;
                if (this.speed > targetSpd) {
                    desiredThrottle = 0;
                    const decelStrength = gapMargin < 24 ? 0.002 : (gapMargin < 48 ? 0.012 : 0.035);
                    const slowMult = Math.pow(decelStrength, dt);
                    this.vx *= slowMult;
                    this.vy *= slowMult;
                    this.speed *= slowMult;
                    if (gapMargin < 18 && this.speed > targetSpd + 10) {
                        const clampSpd = Math.max(obstacleSpeed, targetSpd);
                        this.speed = clampSpd;
                        this.vx = fx * clampSpd;
                        this.vy = fy * clampSpd;
                    }
                } else if (this.speed < targetSpd - 6) {
                    desiredThrottle = Math.min(this.aiCruiseFactor, gapMargin < 28 ? 0.24 : 0.42);
                } else {
                    desiredThrottle = gapMargin < 22 ? 0.06 : 0.14;
                }
            }
        }

        const cannotStopInJunction = Boolean(
            lidZ1 === 25 ||
            nextLidZ1 === 25 ||
            (this.aiChosenDir && this.aiChosenDir.isTurn)
        );
        if (cannotStopInJunction && this.aiPassengerTarget) {
            this.aiPassengerTarget = null;
        }
        if (!isPanicked && !cannotStopInJunction && (this.aiPassengerTarget || (this.aiPassengerStopTimer || 0) > 0 || (this.aiHazardStopTimer || 0) > 0)) {
            if ((this.aiHazardStopTimer || 0) > 0) {
                this.aiTurnSignal = 2;
                this.aiState = "STOPPED_LIGHT";
                const hMult = Math.pow(0.015, dt);
                this.vx *= hMult;
                this.vy *= hMult;
                this.speed *= hMult;
                if (Math.abs(this.speed) < 10) {
                    this.vx = 0;
                    this.vy = 0;
                    this.speed = 0;
                }
            }
            desiredThrottle = 0;
            return { throttle: 0, steer: 0, handbrake: true };
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
       HYBRID CODE-3 EMERGENCY & TACTICAL OFF-ROAD PURSUIT (VCPD, EMS, VCFD)
       - Uses road-graph routing when far away across city blocks blocked by 3D buildings,
         running red lights and overtaking slow/stopped traffic on adjacent or oncoming lanes.
       - As soon as line-of-sight is clear of 3D buildings (or when entering Lummus Park /
         Vice Beach / plazas / sidewalks near the incident), switches to 13-ray off-road
         feeler navigation (`forceDirect`) to drive right onto the beach sand, park grass,
         or sidewalk up to the exact scene!
       ======================================================================== */
    computeTargetRoadOrFeelerControls(dt, map, game, targetX, targetY, targetVx = 0, targetVy = 0, maxThrottle = 0.94, allowPit = false, forceDirect = false) {
        const curZ = this.z !== undefined ? this.z : 2.0;
        if (this.aiLaneChangeCooldown > 0) this.aiLaneChangeCooldown -= dt;
        if (this.aiLaneShiftTimer > 0) this.aiLaneShiftTimer = Math.max(0, this.aiLaneShiftTimer - dt);
        this.aiReverseTimer = 0;
        this.aiTrafficBypassTimer = 0;

        const distToTarget = Math.hypot(targetX - this.x, targetY - this.y);
        const clearOfBuildings = map.traceSegment2D
            ? !map.traceSegment2D(this.x, this.y, targetX, targetY, curZ).hit
            : (distToTarget < 320);
        const cbx = Math.floor(this.x / TILE_SIZE);
        const cby = Math.floor(this.y / TILE_SIZE);
        const curNav = map.getNavigationBlock ? map.getNavigationBlock(cbx, cby, curZ) : null;
        const onRoadNow = Boolean(
            (curNav && curNav.groundType === GROUND_TYPE.ROAD && !curNav.isRailway) ||
            (map.isRoadAtPixel && map.isRoadAtPixel(this.x, this.y, curZ))
        );

        // Mode A: Real-Life Off-Road / Direct Tactical Interception (`forceDirect` ONLY):
        // Used strictly when crossing Lummus Park / Vice Beach (`this.x >= 445 * TILE_SIZE`) or pulling up onto an off-road plaza/sidewalk (< 240px).
        // On normal city streets (`forceDirect === false`), vehicles stay strictly in Mode B (Cardinal Road-Lane Routing) so they never spin against buildings!
        if (forceDirect) {
            this.aiChosenDir = null;
            this.aiBlockX = -1;
            this.aiBlockY = -1;
            this.aiTurnedInIntersection = false;
            const leadTime = Math.min(0.42, distToTarget / 640);
            let aimX = targetX + targetVx * leadTime;
            let aimY = targetY + targetVy * leadTime;

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

        // If off-road while still far from the target and blocked by city buildings, steer back to the nearest road corridor
        if (!onRoadNow && map.getNavigationBlock) {
            this.aiChosenDir = null;
            this.aiBlockX = -1;
            this.aiBlockY = -1;
            this.aiTurnedInIntersection = false;
            let bestR2 = 999999;
            let bestRx = -1;
            let bestRy = -1;
            for (let rdy = -4; rdy <= 4; rdy++) {
                for (let rdx = -4; rdx <= 4; rdx++) {
                    if (rdx === 0 && rdy === 0) continue;
                    const nbx = cbx + rdx;
                    const nby = cby + rdy;
                    const nb = map.getNavigationBlock(nbx, nby, curZ);
                    if (nb && nb.groundType === GROUND_TYPE.ROAD && !nb.isRailway && (!map.getAllowedRoadDirections || map.getAllowedRoadDirections(nbx, nby, curZ).length > 0)) {
                        const rcx = (nbx + 0.5) * TILE_SIZE;
                        const rcy = (nby + 0.5) * TILE_SIZE;
                        const d2 = (rcx - this.x) * (rcx - this.x) + (rcy - this.y) * (rcy - this.y);
                        if (d2 < bestR2) {
                            bestR2 = d2;
                            bestRx = nbx;
                            bestRy = nby;
                        }
                    }
                }
            }
            if (bestRx < 0 && cbx >= 447) {
                bestRx = 445;
                bestRy = cby;
            }
            if (bestRx >= 0) {
                const rcx = (bestRx + 0.5) * TILE_SIZE;
                const rcy = (bestRy + 0.5) * TILE_SIZE;
                const toRoadAng = Math.atan2(rcy - this.y, rcx - this.x);
                return this.steerTowardTargetWithFeelers(dt, map, curZ, toRoadAng, 0.68, game);
            }
        }

        // Mode B: Code-3 Road Network Routing (runs red lights, overtakes traffic via adjacent lanes without crossing into oncoming lane tiles!)
        let bx = Math.floor(this.x / TILE_SIZE);
        let by = Math.floor(this.y / TILE_SIZE);
        // Prevent a lateral pull-over offset from accidentally switching `bx` or `by` into the opposing traffic lane tile (which would flip direction 180°!)
        if ((this.aiPullOverTimer > 0 || Math.abs(this.aiPullOverOffset || 0) > 8) && this.aiChosenDir && !this.aiChosenDir.isTurn) {
            if (this.aiChosenDir.dy !== 0 && typeof this.aiBlockX === "number" && this.aiBlockX >= 0 && Math.abs(bx - this.aiBlockX) <= 1) {
                bx = this.aiBlockX;
            } else if (this.aiChosenDir.dx !== 0 && typeof this.aiBlockY === "number" && this.aiBlockY >= 0 && Math.abs(by - this.aiBlockY) <= 1) {
                by = this.aiBlockY;
            }
        }
        const lidZ1 = map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0;
        if (lidZ1 !== 25) {
            this.aiTurnedInIntersection = false;
            this.aiIntersectionEntryAngle = (this.aiChosenDir && typeof this.aiChosenDir.angle === "number")
                ? this.aiChosenDir.angle
                : this.angle;
        }
        if (lidZ1 === 25 && this.aiLaneShiftTimer > 0) {
            this.aiLaneShiftTimer = 0;
        }

        const movedOutOfLane = !this.aiChosenDir || (this.aiLaneShiftTimer <= 0 && (bx !== this.aiBlockX || by !== this.aiBlockY));
        if (!movedOutOfLane && this.aiLaneShiftTimer > 0 && this.aiChosenDir && !this.aiChosenDir.isTurn) {
            if (this.aiChosenDir.dy !== 0 && by !== this.aiBlockY) {
                this.aiBlockY = by;
                this.aiTargetBlockX = this.aiBlockX;
                this.aiTargetBlockY = by + this.aiChosenDir.dy;
            } else if (this.aiChosenDir.dx !== 0 && bx !== this.aiBlockX) {
                this.aiBlockX = bx;
                this.aiTargetBlockX = bx + this.aiChosenDir.dx;
                this.aiTargetBlockY = this.aiBlockY;
            }
        }
        if (movedOutOfLane) {
            const refAngle = this.aiChosenDir && typeof this.aiChosenDir.angle === "number"
                ? this.aiChosenDir.angle
                : this.angle;
            const entryAngle = (lidZ1 === 25 && typeof this.aiIntersectionEntryAngle === "number")
                ? this.aiIntersectionEntryAngle
                : refAngle;
            this.aiBlockX = bx;
            this.aiBlockY = by;
            if (typeof map.chooseTargetGuidedRoadBlock === "function") {
                this.aiChosenDir = map.chooseTargetGuidedRoadBlock(
                    bx,
                    by,
                    refAngle,
                    targetX,
                    targetY,
                    curZ,
                    Boolean(this.aiTurnedInIntersection),
                    entryAngle
                );
            } else {
                this.aiChosenDir = map.chooseNextRoadBlock(bx, by, refAngle, curZ, 0.2, Boolean(this.aiTurnedInIntersection), entryAngle);
            }
            if (this.aiChosenDir.isTurn) {
                this.aiTurnedInIntersection = true;
            }
            this.aiTargetBlockX = bx + this.aiChosenDir.dx;
            this.aiTargetBlockY = by + this.aiChosenDir.dy;
        }

        if (this.aiPullOverTimer > 0) {
            this.aiPullOverTimer = Math.max(0, this.aiPullOverTimer - dt);
        } else if (this.aiPullOverOffset) {
            this.aiPullOverOffset *= Math.pow(0.06, dt);
            if (Math.abs(this.aiPullOverOffset) < 0.4) this.aiPullOverOffset = 0;
        }

        const fx = Math.cos(this.angle);
        const fy = Math.sin(this.angle);
        const rx = -fy;
        const ry = fx;
        let sameLaneLeadGap = 9999;
        let sameLaneLeadSpd = 0;
        if (game && Array.isArray(game.vehicles)) {
            const inspectLead = (other) => {
                if (!other || other === this || other === this.towingVehicle || other === this.towTarget || other.driver === "PLAYER") return;
                if (other.z !== undefined && Math.abs(other.z - curZ) > 0.85) return;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const fDist = dx * fx + dy * fy;
                const lDist = Math.abs(dx * rx + dy * ry);
                const halfLenSum = ((this.w || 62) + (other.w || 62)) * 0.50;
                const bumperGap = fDist - halfLenSum;
                if (fDist > 4 && bumperGap < 125 && lDist < 24) {
                    if (bumperGap < sameLaneLeadGap) {
                        sameLaneLeadGap = bumperGap;
                        sameLaneLeadSpd = Math.max(0, other.speed || 0);
                    }
                    // Code-3 Overtaking: change to a same-direction adjacent lane, or offset within our own lane (max ±14px so we never enter an opposing lane tile!)
                    const changed = this.aiLaneChangeCooldown <= 0
                        ? this.tryAdjacentLaneChange(bx, by, curZ, map, game)
                        : false;
                    if (!changed && bumperGap < 98) {
                        const prefSides = (this.aiPullOverOffset && this.aiPullOverOffset < 0) ? [-1, 1] : [-1, 1];
                        for (const bSide of prefSides) {
                            const safeOff = this.clampSafeInLaneOffset(bSide * 14, bx, by, this.aiChosenDir.dx || 0, this.aiChosenDir.dy || 0, curZ, map);
                            if (Math.abs(safeOff) >= 10) {
                                this.aiPullOverOffset = safeOff;
                                this.aiPullOverTimer = 1.6;
                                break;
                            }
                        }
                    }
                }
            };
            if (game._vehGridHead && game._vehGridNext) {
                const gCols = game._vehGridCols || 128;
                const gRows = game._vehGridRows || 128;
                const gx0 = Math.floor(this.x / 256);
                const gy0 = Math.floor(this.y / 256);
                for (let gy = Math.max(0, gy0 - 1); gy <= Math.min(gRows - 1, gy0 + 1); gy++) {
                    const rowOff = gy * gCols;
                    for (let gx = Math.max(0, gx0 - 1); gx <= Math.min(gCols - 1, gx0 + 1); gx++) {
                        for (let vi = game._vehGridHead[rowOff + gx]; vi !== -1; vi = game._vehGridNext[vi]) {
                            inspectLead(game.vehicles[vi]);
                        }
                    }
                }
            } else {
                for (const other of game.vehicles) {
                    inspectLead(other);
                }
            }
        }

        const tx = (this.aiTargetBlockX + 0.5) * TILE_SIZE;
        const ty = (this.aiTargetBlockY + 0.5) * TILE_SIZE;
        let steer = 0;
        let throttle = maxThrottle;

        const laneAngleDiff = this.normalizeAngle(this.aiChosenDir.angle - this.angle);
        if (Math.abs(laneAngleDiff) < 0.03) {
            this.angle = this.aiChosenDir.angle;
        } else {
            this.angle += laneAngleDiff * Math.min(1, dt * (this.aiChosenDir.isTurn ? 11.0 : 15.0));
        }
        this.angularVelocity = 0;
        this.steerAngleRad = 0;

        const emRollSpd = Math.abs(this.speed || 0);
        const maxLatStep = Math.min(72, Math.max(28, emRollSpd * 0.62)) * dt;
        const laneBlockX = typeof this.aiBlockX === "number" && this.aiBlockX >= 0 ? this.aiBlockX : bx;
        const laneBlockY = typeof this.aiBlockY === "number" && this.aiBlockY >= 0 ? this.aiBlockY : by;
        const rawPullOff = (!this.aiChosenDir.isTurn && this.aiPullOverOffset) ? this.aiPullOverOffset : 0;
        const pullOff = rawPullOff
            ? this.clampSafeInLaneOffset(rawPullOff, laneBlockX, laneBlockY, this.aiChosenDir.dx || 0, this.aiChosenDir.dy || 0, curZ, map)
            : 0;
        let emSignedLat = 0;
        if (this.aiChosenDir.dx !== 0) {
            const centerY = (laneBlockY + 0.5) * TILE_SIZE + (this.aiChosenDir.dx > 0 ? pullOff : -pullOff);
            const dyErr = centerY - this.y;
            emSignedLat = dyErr * (this.aiChosenDir.dx > 0 ? 1 : -1);
            this.y += Math.max(-maxLatStep, Math.min(maxLatStep, dyErr * Math.min(1, dt * 8.5)));
        } else if (this.aiChosenDir.dy !== 0) {
            const centerX = (laneBlockX + 0.5) * TILE_SIZE + (this.aiChosenDir.dy > 0 ? -pullOff : pullOff);
            const dxErr = centerX - this.x;
            emSignedLat = dxErr * (this.aiChosenDir.dy > 0 ? -1 : 1);
            this.x += Math.max(-maxLatStep, Math.min(maxLatStep, dxErr * Math.min(1, dt * 8.5)));
        }
        if (!this.aiChosenDir.isTurn && emRollSpd > 14 && Math.abs(emSignedLat) > 2.2) {
            const targetVisYaw = Math.max(-0.22, Math.min(0.22, Math.atan2(emSignedLat * 0.55, Math.max(36, emRollSpd * 0.55))));
            this.visualSteerYaw = (this.visualSteerYaw || 0) + (targetVisYaw - (this.visualSteerYaw || 0)) * Math.min(1, dt * 11.0);
        } else {
            this.visualSteerYaw = (this.visualSteerYaw || 0) * Math.pow(0.0005, dt);
            if (Math.abs(this.visualSteerYaw) < 0.005 || emRollSpd < 4) this.visualSteerYaw = 0;
        }

        if (Math.abs(laneAngleDiff) > 0.18 || this.aiChosenDir.isTurn) {
            if (this.speed > 96) {
                throttle = 0;
                const slowMult = Math.pow(0.15, dt);
                this.vx *= slowMult;
                this.vy *= slowMult;
                this.speed *= slowMult;
            } else {
                throttle = Math.min(maxThrottle, 0.52);
            }
        }

        if (sameLaneLeadGap < 24 && Math.abs(this.aiPullOverOffset || 0) < 16) {
            throttle = 0;
            const brakeMult = Math.pow(0.004, dt);
            this.vx *= brakeMult;
            this.vy *= brakeMult;
            this.speed *= brakeMult;
        }

        this.aiStuckTimer = 0;
        return { throttle, steer, handbrake: false };
    }

    isOccupyingIntersectionBox(map) {
        if (!map || typeof map.getBlockInfo !== "function") return false;
        const bx = Math.floor(this.x / TILE_SIZE);
        const by = Math.floor(this.y / TILE_SIZE);
        if (map.getBlockInfo(bx, by, 1).lid === 25) return true;
        const hl = (this.w || 62) * 0.45;
        const c = Math.cos(this.angle || 0);
        const s = Math.sin(this.angle || 0);
        const fbx = Math.floor((this.x + c * hl) / TILE_SIZE);
        const fby = Math.floor((this.y + s * hl) / TILE_SIZE);
        if (map.getBlockInfo(fbx, fby, 1).lid === 25) return true;
        const rbx = Math.floor((this.x - c * hl) / TILE_SIZE);
        const rby = Math.floor((this.y - s * hl) / TILE_SIZE);
        return map.getBlockInfo(rbx, rby, 1).lid === 25;
    }

    // Helper: checks spacing against other stopped emergency/police units so responders never stack on top of each other
    // or seal off an entire 2-lane street or 4-way intersection with diagonal abandoned emergency rigs!
    alignCurbsideAndCheckSpacing(map, game, minSpacing = 68, tacticalTarget = null, forceAllowInBox = false) {
        const onRoad = Boolean(map && map.isRoadAtPixel && map.isRoadAtPixel(this.x, this.y));
        if (onRoad && !forceAllowInBox && this.isOccupyingIntersectionBox(map)) {
            return false;
        }
        let nearbyStoppedResponders = 0;
        if (game && Array.isArray(game.vehicles)) {
            for (const ov of game.vehicles) {
                if (!ov || ov === this || ov.destroyed) continue;
                const isOtherStoppedResponder = (ov.isPolice || ov.isEmergency) && (ov.driver === null || Math.abs(ov.speed || 0) < 20);
                if (!isOtherStoppedResponder) continue;
                const dMe = Math.hypot(ov.x - this.x, ov.y - this.y);
                if (dMe < minSpacing) {
                    return false;
                }
                if (dMe < 165) {
                    nearbyStoppedResponders++;
                }
            }
        }
        // Real-World Police Scene Management: cap parked/deployed cruisers within a 165px cluster at 2 units
        // so additional patrol units remain mobile or stage further back instead of sealing off every lane!
        if (nearbyStoppedResponders >= 2) {
            return false;
        }
        if (onRoad) {
            // Always snap parked road responders strictly parallel to the cardinal lane (even if aiChosenDir was null!)
            let laneAng = (this.aiChosenDir && typeof this.aiChosenDir.angle === "number") ? this.aiChosenDir.angle : null;
            if (laneAng === null && map && typeof map.getAllowedRoadDirections === "function") {
                const bx = Math.floor(this.x / TILE_SIZE);
                const by = Math.floor(this.y / TILE_SIZE);
                const dirs = map.getAllowedRoadDirections(bx, by, this.z || 2.0);
                let bestCos = -2;
                for (let di = 0; di < dirs.length; di++) {
                    const cs = Math.cos((this.angle || 0) - dirs[di].angle);
                    if (cs > bestCos) {
                        bestCos = cs;
                        laneAng = dirs[di].angle;
                    }
                }
            }
            if (laneAng === null) {
                laneAng = Math.round((this.angle || 0) / (Math.PI * 0.5)) * (Math.PI * 0.5);
            }
            this.angle = laneAng;
            // Pull slightly toward the right-hand curb (+12px) when parking to deploy crew so the adjacent lane remains passable
            const rCos = -Math.sin(this.angle);
            const rSin = Math.cos(this.angle);
            const curbX = this.x + rCos * 12;
            const curbY = this.y + rSin * 12;
            if (!map.resolveCircleBuildingCollision || !map.resolveCircleBuildingCollision(curbX, curbY, 14, this.z || 2.0).hit) {
                this.x = curbX;
                this.y = curbY;
            }
        } else if (tacticalTarget) {
            const toTarg = Math.atan2(tacticalTarget.y - this.y, tacticalTarget.x - this.x);
            const sideSign = ((String(this.id).charCodeAt(String(this.id).length - 1) || 0) % 2 === 0) ? 1 : -1;
            this.angle = toTarg + sideSign * 0.35;
        }
        this.visualSteerYaw = 0;
        this.angularVelocity = 0;
        this.steerAngleRad = 0;
        return true;
    }

    /* ========================================================================
       REAL-LIFE VCPD / SWAT TACTICAL PURSUIT AI (Off-Road Beach/Park + Fend-Off Stop)
       - Runs red lights, overtakes traffic, and leaves the road (`forceDirect = true`)
         to drive across Lummus Park, sidewalks, and Vice Beach sand right up to the suspect!
       - Stops at tactical standoff range (135..175px) in an angled fend-off posture
         and deploys its 2-officer squad!
       ======================================================================== */
    computePoliceControls(dt, map, game) {
        const wantedTarget = (game && typeof game.getNearestWantedTarget === "function")
            ? game.getNearestWantedTarget(this.x, this.y, this.angle)
            : ((game && game.wantedLevel > 0 && !game.player.dead)
                ? {
                    x: (game.player.inVehicle || game.player).x,
                    y: (game.player.inVehicle || game.player).y,
                    vx: (game.player.inVehicle || game.player).vx || 0,
                    vy: (game.player.inVehicle || game.player).vy || 0,
                    speed: (game.player.inVehicle || game.player).speed || 0,
                    inVehicle: Boolean(game.player.inVehicle)
                }
                : null);

        if (!wantedTarget) {
            this.sirenActive = false;
            this.aiBailTimer = 0;
            return this.computeTrafficControls(dt, map, game);
        }

        this.sirenActive = true;
        this.aiState = "PURSUIT";

        const curZ = this.z !== undefined ? this.z : 2.0;
        const distToPlayer = Math.hypot(wantedTarget.x - this.x, wantedTarget.y - this.y);
        const targetOnRoad = map.isRoadAtPixel ? map.isRoadAtPixel(wantedTarget.x, wantedTarget.y) : false;
        const targetOnSand = Boolean(!targetOnRoad && map.getTileAtPixel && map.getTileAtPixel(wantedTarget.x, wantedTarget.y) === TILE.SAND);
        const coastalRoadMinX = (wantedTarget.y < 75 * TILE_SIZE ? 455.5 : 444.0) * TILE_SIZE;
        const coastalOffRoadMinX = (wantedTarget.y < 75 * TILE_SIZE ? 458.0 : 447.2) * TILE_SIZE;
        const targetInBeachOrParkExpanse = Boolean(
            !targetOnRoad && (
                targetOnSand ||
                wantedTarget.x >= coastalOffRoadMinX
            )
        );
        const noProgress = this.updateApproachProgress(dt, distToPlayer);

        if ((this.noDeployCooldown || 0) > 0) {
            this.noDeployCooldown = Math.max(0, this.noDeployCooldown - dt);
        }

        // Tactical Squad Deployment right at the scene:
        // 1) Cruiser has driven up to tactical standoff range (< 175px) of a visually spotted suspect on foot (on the beach, park, or street), OR
        // 2) Boxed-in slow getaway car (< 130px), OR
        // 3) Blocked by a solid building wall / palm row / fence within 440px (or up to 1450px when intercepting an off-road suspect across a beach/park/golf course) for > 1.35s
        // Note: When patrolling a Search Zone (`wantedTarget.isSearchPoint === true`), cruisers stay mobile on patrol unless blocked by an obstacle!
        const playerOnFootAtScene = !wantedTarget.isSearchPoint && !wantedTarget.inVehicle && distToPlayer < 175;
        const playerBoxedNear = !wantedTarget.isSearchPoint && Boolean(wantedTarget.inVehicle) && (
            (Math.abs(wantedTarget.speed || 0) < 65 && distToPlayer < 155) ||
            (Math.abs(wantedTarget.speed || 0) < 85 && distToPlayer < 220 && noProgress > 1.05)
        );
        // Check if our front bumper is simply queued behind another vehicle on a street (so we overtake around it instead of mistaking it for a building wall 350px away!)
        let frontQueuedBehindVehicle = false;
        if (distToPlayer >= 195 && game && Array.isArray(game.vehicles)) {
            const pCos = Math.cos(this.angle), pSin = Math.sin(this.angle);
            const frontProbeX = this.x + pCos * ((this.w || 58) * 0.5 + 26);
            const frontProbeY = this.y + pSin * ((this.w || 58) * 0.5 + 26);
            for (let vi = 0; vi < game.vehicles.length; vi++) {
                const ov = game.vehicles[vi];
                if (!ov || ov === this) continue;
                if (Math.hypot(ov.x - frontProbeX, ov.y - frontProbeY) < 36) {
                    frontQueuedBehindVehicle = true;
                    break;
                }
            }
        }
        const blockedMaxDist = (targetInBeachOrParkExpanse && this.x >= coastalRoadMinX) ? 1450 : 440;
        const blockedByWallNear = !frontQueuedBehindVehicle && (!wantedTarget.inVehicle || Math.abs(wantedTarget.speed || 0) < 85) && distToPlayer < blockedMaxDist && noProgress > 1.35;

        if ((this.noDeployCooldown || 0) <= 0 && (playerOnFootAtScene || playerBoxedNear || blockedByWallNear)) {
            const spacingOk = this.alignCurbsideAndCheckSpacing(map, game, 68, wantedTarget, noProgress > 3.0);
            if (!spacingOk) {
                this.aiBailTimer = 0;
                const offRoadHere = map && map.isRoadAtPixel ? !map.isRoadAtPixel(this.x, this.y) : false;
                return this.computeTargetRoadOrFeelerControls(dt, map, game, wantedTarget.x, wantedTarget.y, 0, 0, 0.48, false, offRoadHere);
            }
            this.aiBailTimer += dt;
            const brakeMult = Math.pow(0.001, dt);
            this.vx *= brakeMult;
            this.vy *= brakeMult;
            this.speed *= brakeMult;
            const bailDelay = playerBoxedNear ? 0.35 : 0.18;
            if (this.aiBailTimer > bailDelay && typeof game.ejectVehicleDriver === "function") {
                this.aiBailTimer = 0;
                this.approachNoProgress = 0;
                this.vx = 0;
                this.vy = 0;
                this.speed = 0;
                game.ejectVehicleDriver(this, "COP_DEPLOY");
                return { throttle: 0, steer: 0, handbrake: true };
            }
            return { throttle: 0, steer: 0, handbrake: true };
        }
        this.aiBailTimer = Math.max(0, this.aiBailTimer - dt * 1.5);

        // Real-Life Off-Road Pursuit:
        // Leave the asphalt road (`forceDirect = true`) ONLY when:
        // - The suspect is on Vice Beach / North Beach / Lummus Park and the cruiser has reached the coastal road (coastalRoadMinX)
        //   and is aligned in Y within 440px (or already off-road in the park/beach this.x >= coastalOffRoadMinX), OR
        // - The cruiser is ALREADY off-road (`!onRoadSelf`) in a plaza/park with clear line-of-sight!
        // On normal city streets (`onRoadSelf`), cruisers stay strictly in cardinal lanes so they never cut diagonally across intersections!
        const onRoadSelf = Boolean(map && map.isRoadAtPixel && map.isRoadAtPixel(this.x, this.y));
        const clearOfBuildings = map.traceSegment2D
            ? !map.traceSegment2D(this.x, this.y, wantedTarget.x, wantedTarget.y, curZ).hit
            : (distToPlayer < 240);
        const readyToCutOntoBeach =
            this.x >= coastalRoadMinX &&
            (this.x >= coastalOffRoadMinX || Math.abs(wantedTarget.y - this.y) <= 440 || distToPlayer < 520);
        const forceDirect =
            (targetInBeachOrParkExpanse && readyToCutOntoBeach && distToPlayer < 2500) ||
            (!onRoadSelf && !targetOnRoad && clearOfBuildings && distToPlayer < 240);

        // When pursuing a visually spotted target (or ambient AI_CRIMINAL getaway vehicle) with clear line-of-sight, the police passenger / tank turret fires!
        const isTankUnit = Boolean(this.isTank || this.specKey === "PANZER_TANK");
        if (isTankUnit) {
            this.turretAngle = Math.atan2(wantedTarget.y - this.y, wantedTarget.x - this.x);
        }
        const effWantedStars = wantedTarget.wantedLevel || (game && game.wantedLevel) || 1;
        const canDriveByShoot =
            !wantedTarget.isSearchPoint &&
            clearOfBuildings && (
                (wantedTarget.isCriminalNPC && wantedTarget.inVehicle) ||
                (!wantedTarget.isCriminalNPC && effWantedStars >= 2)
            );
        const maxShootDist = isTankUnit ? 420 : 285;
        if (canDriveByShoot && distToPlayer < maxShootDist && (!isTankUnit || distToPlayer > 75) && game && typeof game.fireWeapon === "function") {
            this.copDriveByTimer = (this.copDriveByTimer || 0) - dt;
            if (this.copDriveByTimer <= 0) {
                this.copDriveByTimer = isTankUnit ? (2.2 + Math.random() * 0.8) : (0.78 + Math.random() * 0.55);
                const aimAng = Math.atan2(wantedTarget.y - this.y, wantedTarget.x - this.x);
                if (isTankUnit) {
                    this.turretAngle = aimAng;
                    this.turretRecoil = 1.0;
                    game.fireWeapon(this.x, this.y, aimAng, "ROCKET", false, false, "COP", "TANK_CANNON");
                } else {
                    game.fireWeapon(this.x, this.y, aimAng, this.specKey === "SWAT_ENFORCER" ? "UZI" : "PISTOL", false, false, "COP");
                }
            }
        }

        const copPursuitThrottle = effWantedStars <= 1
            ? (forceDirect ? 0.58 : 0.62)
            : (effWantedStars === 2 ? (forceDirect ? 0.70 : 0.74) : (effWantedStars === 3 ? 0.82 : 0.90));

        return this.computeTargetRoadOrFeelerControls(
            dt,
            map,
            game,
            wantedTarget.x,
            wantedTarget.y,
            wantedTarget.vx || 0,
            wantedTarget.vy || 0,
            copPursuitThrottle,
            Boolean(wantedTarget.inVehicle && (targetOnRoad || forceDirect)),
            forceDirect
        );
    }

    /* ========================================================================
       AMBIENT GANG / BANDIT GETAWAY VEHICLE AI (AI_CRIMINAL)
       Speeds through traffic, exchanges drive-by gunfire with VCPD, and bails
       out on foot for a street shootout when boxed in or heavily damaged!
       ======================================================================== */
    computeCriminalControls(dt, map, game) {
        if (this.criminalBailedOut || this.destroyed) {
            this.driver = null;
            return { throttle: 0, steer: 0, handbrake: true };
        }
        this.aiPanicTimer = Math.max(this.aiPanicTimer || 0, 8.0);
        const ctrl = this.computeTrafficControls(dt, map, game);
        ctrl.throttle = Math.max(ctrl.throttle, 0.86);

        if (game) {
            let nearestCop = null;
            let bestCopDist = 380;
            for (const v of game.vehicles) {
                if (!v.destroyed && v.isPolice && v.driver === "AI_COP") {
                    if (Math.abs(v.x - this.x) >= bestCopDist || Math.abs(v.y - this.y) >= bestCopDist) continue;
                    const d = Math.hypot(v.x - this.x, v.y - this.y);
                    if (d < bestCopDist) {
                        bestCopDist = d;
                        nearestCop = v;
                    }
                }
            }
            for (const ped of game.peds) {
                if (!ped.dead && ped.kind === "COP") {
                    if (Math.abs(ped.x - this.x) >= bestCopDist || Math.abs(ped.y - this.y) >= bestCopDist) continue;
                    const d = Math.hypot(ped.x - this.x, ped.y - this.y);
                    if (d < bestCopDist) {
                        bestCopDist = d;
                        nearestCop = ped;
                    }
                }
            }

            // Drive-by gunfire from the bandit getaway car at pursuing police!
            if (nearestCop && bestCopDist < 285 && typeof game.fireWeapon === "function") {
                this.crimDriveByTimer = (this.crimDriveByTimer || 0) - dt;
                if (this.crimDriveByTimer <= 0) {
                    this.crimDriveByTimer = 0.52 + Math.random() * 0.42;
                    const aimAng = Math.atan2(nearestCop.y - this.y, nearestCop.x - this.x);
                    game.fireWeapon(this.x, this.y, aimAng, "UZI", false, false, "CRIMINAL");
                }
            }

            // Bail out on foot for a street gunfight ONLY once if boxed in by police or heavily damaged near police!
            const boxedByCop = nearestCop && bestCopDist < 145 && Math.abs(this.speed || 0) < 34;
            const heavilyDamaged = nearestCop && bestCopDist < 320 && this.hp < this.maxHp * 0.44;
            if ((boxedByCop || heavilyDamaged) && !this.criminalBailedOut) {
                this.aiBailTimer = (this.aiBailTimer || 0) + dt;
                if ((this.aiBailTimer > 0.75 || heavilyDamaged) && typeof game.ejectVehicleDriver === "function") {
                    this.aiBailTimer = 0;
                    this.criminalBailedOut = true;
                    game.ejectVehicleDriver(this, "CRIMINAL_DEPLOY");
                    return { throttle: 0, steer: 0, handbrake: true };
                }
            } else {
                this.aiBailTimer = Math.max(0, (this.aiBailTimer || 0) - dt);
            }
        }
        return ctrl;
    }

    // Tracks whether an emergency vehicle is actually getting closer to its target; returns seconds without progress
    updateApproachProgress(dt, dist) {
        if (this.approachBestDist === undefined || dist > this.approachBestDist + 160) {
            this.approachBestDist = dist;
            this.approachNoProgress = 0;
        } else if (dist < this.approachBestDist - 6) {
            this.approachBestDist = dist;
            this.approachNoProgress = 0;
        } else {
            this.approachNoProgress = (this.approachNoProgress || 0) + dt;
        }
        return this.approachNoProgress;
    }

    steerTowardTargetWithFeelers(dt, map, curZ, directAngle, maxThrottle = 0.92, game = null) {
        // Evaluate 13 candidate feeler directions anchored around `directAngle` (the fixed world bearing to target, NOT `this.angle`!)
        // so an obstacle ahead never causes a positive-feedback 360-degree spin loop (`tourne sur eux meme`)!
        const candidateOffsets = [0, -0.18, 0.18, -0.38, 0.38, -0.62, 0.62, -0.88, 0.88, -1.15, 1.15, -1.42, 1.42];
        let bestCandAng = directAngle;
        let bestScore = -9999;
        const myFrontHalf = (this.w || 62) * 0.50;
        const probeClose = myFrontHalf + 10;
        const probeNear = myFrontHalf + 34;
        const probeFar = myFrontHalf + 68;
        let frontBlockedClose = false;

        // Pre-collect nearby vehicles once via the 256px spatial hash grid
        const nearbyVehs = [];
        const maxProbeReach = probeFar + 48;
        if (game && Array.isArray(game.vehicles)) {
            if (game._vehGridHead && game._vehGridNext) {
                const gCols = game._vehGridCols || 128;
                const gRows = game._vehGridRows || 128;
                const gx0 = Math.floor(this.x / 256);
                const gy0 = Math.floor(this.y / 256);
                for (let gy = Math.max(0, gy0 - 1); gy <= Math.min(gRows - 1, gy0 + 1); gy++) {
                    const rowOff = gy * gCols;
                    for (let gx = Math.max(0, gx0 - 1); gx <= Math.min(gCols - 1, gx0 + 1); gx++) {
                        for (let vi = game._vehGridHead[rowOff + gx]; vi !== -1; vi = game._vehGridNext[vi]) {
                            const other = game.vehicles[vi];
                            if (!other || other === this || other === this.towingVehicle || other === this.towTarget || other.driver === "PLAYER") continue;
                            if (Math.abs(other.x - this.x) <= maxProbeReach && Math.abs(other.y - this.y) <= maxProbeReach) {
                                nearbyVehs.push(other);
                            }
                        }
                    }
                }
            } else {
                for (const other of game.vehicles) {
                    if (!other || other === this || other === this.towingVehicle || other === this.towTarget || other.driver === "PLAYER") continue;
                    if (Math.abs(other.x - this.x) <= maxProbeReach && Math.abs(other.y - this.y) <= maxProbeReach) {
                        nearbyVehs.push(other);
                    }
                }
            }
        }

        for (const off of candidateOffsets) {
            const candAng = directAngle + off;
            const turnFromHeading = Math.abs(this.normalizeAngle(candAng - this.angle));
            let score = -Math.abs(off) * 3.2 - turnFromHeading * 1.35;

            const cCos = Math.cos(candAng);
            const cSin = Math.sin(candAng);
            const p0x = this.x + cCos * probeClose;
            const p0y = this.y + cSin * probeClose;
            const p1x = this.x + cCos * probeNear;
            const p1y = this.y + cSin * probeNear;
            const p2x = this.x + cCos * probeFar;
            const p2y = this.y + cSin * probeFar;

            // Check 3D buildings, security barriers & solid palm/tree trunks at all 3 distances
            if (map.resolveCircleBuildingCollision(p0x, p0y, 15, curZ).hit) {
                score -= 85;
                if (off === 0) frontBlockedClose = true;
            }
            if (map.resolveCircleBuildingCollision(p1x, p1y, 15, curZ).hit) {
                score -= 55;
            }
            if (map.resolveCircleBuildingCollision(p2x, p2y, 15, curZ).hit) {
                score -= 28;
            }
            if (map.isWaterAtPixel(p0x, p0y) || map.isWaterAtPixel(p1x, p1y) || map.isWaterAtPixel(p2x, p2y)) {
                score -= 95;
            }

            // Prefer open sand trails / paved walkways (lid !== 10) over dense palm lawn in Lummus Park (c = 448..464)
            if (map.getBlockInfo) {
                const b1x = Math.floor(p1x / TILE_SIZE);
                const b1y = Math.floor(p1y / TILE_SIZE);
                if (b1x >= 448 && b1x <= 464) {
                    const lid1 = map.getBlockInfo(b1x, b1y, 1).lid;
                    if (lid1 >= 98 && lid1 <= 101) score += 3.5;
                }
            }

            // Penalize feelers that collide with civilian/wrecked vehicles
            for (let vi = 0; vi < nearbyVehs.length; vi++) {
                const other = nearbyVehs[vi];
                const oRad = Math.max(24, (other.w || 62) * 0.35);
                const d0 = Math.hypot(other.x - p0x, other.y - p0y);
                const d1 = Math.hypot(other.x - p1x, other.y - p1y);
                const d2 = Math.hypot(other.x - p2x, other.y - p2y);
                if (d0 < oRad) {
                    score -= 52;
                    if (off === 0) frontBlockedClose = true;
                } else if (d1 < oRad) {
                    score -= 34;
                } else if (d2 < oRad) {
                    score -= 18;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestCandAng = candAng;
            }
        }

        const chosenAngle = bestScore < -75 ? directAngle : bestCandAng;
        const diff = this.normalizeAngle(chosenAngle - this.angle);
        const maxTurnStep = 3.6 * dt;
        this.angle += Math.max(-maxTurnStep, Math.min(maxTurnStep, diff));
        this.angularVelocity = 0;
        this.steerAngleRad = 0;
        let throttle = Math.abs(diff) > 0.65 && this.speed > 125 ? 0.36 : maxThrottle;
        if (frontBlockedClose && this.speed > 68) {
            throttle = 0.22;
        }
        this.aiStuckTimer = 0;
        this.aiReverseTimer = 0;
        return { throttle, steer: 0, handbrake: false };
    }

    /* ========================================================================
       REAL-LIFE EMS AMBULANCE & VCFD FIRE ENGINE AI
       - Staging Protocol ("Scene Safety"): Ambulance waits at safe standoff (260..320px)
         while active gunfire/explosions are occurring at the casualty scene!
       - Off-Road Rescue: Once safe, drives across sidewalks, Lummus Park, and onto
         Vice Beach sand right up to the casualties (85..135px) and deploys its Paramedic!
       ======================================================================== */
    computeEmergencyControls(dt, map, game) {
        if (!game) return this.computeTrafficControls(dt, map, game);

        // A. MEDIC AMBULANCE
        if (this.specKey === "MEDIC_AMBULANCE" && Array.isArray(game.peds)) {
            if (this.deployedMedic) {
                if (
                    this.deployedMedic.dead ||
                    (this.deployedMedic.medicOutTimer || 0) > 36.0 ||
                    !game.peds.includes(this.deployedMedic)
                ) {
                    this.deployedMedic = null;
                } else {
                    this.sirenActive = true;
                    this.aiState = "EMERGENCY_MEDIC";
                    return { throttle: this.speed > 6 ? -0.85 : 0, steer: 0, handbrake: true };
                }
            }

            let nearestCorpse = null;
            let bestDist = 1850;
            for (const ped of game.peds) {
                if (
                    !ped.dead ||
                    ped.revived ||
                    ped._boardedVehicle ||
                    ped.unreachableForMedic ||
                    ped.deathKind === "DROWNED" ||
                    (ped.deadTimer || 0) < 2.5
                ) {
                    continue;
                }
                if (map.isWaterAtPixel && map.isWaterAtPixel(ped.x, ped.y)) continue;
                const claimedByOther = Array.isArray(game.vehicles) && game.vehicles.some(
                    (ov) => ov && ov !== this && !ov.destroyed && ov.specKey === "MEDIC_AMBULANCE" &&
                        (ov.medicTargetPed === ped || (ov.deployedMedic && ov.deployedMedic.healingPatient === ped))
                );
                const d = Math.hypot(ped.x - this.x, ped.y - this.y) + (claimedByOther ? 420 : 0);
                if (d < bestDist) {
                    bestDist = d;
                    nearestCorpse = ped;
                }
            }

            if (nearestCorpse) {
                const curZ = this.z !== undefined ? this.z : 2.0;
                const rawDist = Math.hypot(nearestCorpse.x - this.x, nearestCorpse.y - this.y);
                this.sirenActive = true;
                this.aiState = "EMERGENCY_MEDIC";
                if (this.medicTargetPed !== nearestCorpse) {
                    this.medicTargetPed = nearestCorpse;
                    this.approachBestDist = undefined;
                    this.approachNoProgress = 0;
                }

                // Real-Life EMS "Scene Safety" Staging: hold at 260..320px while active gunfire/rockets are happening right on the casualties!
                const activeShooterOnScene = Boolean(
                    game.player &&
                    !game.player.dead &&
                    (game.player.playerCombatTimer || 0) > 0.5 &&
                    Math.hypot(game.player.x - nearestCorpse.x, game.player.y - nearestCorpse.y) < 250
                );
                if (activeShooterOnScene && rawDist < 310) {
                    const brakeMult = Math.pow(0.004, dt);
                    this.vx *= brakeMult;
                    this.vy *= brakeMult;
                    this.speed *= brakeMult;
                    return { throttle: 0, steer: 0, handbrake: true };
                }

                const noProgress = this.updateApproachProgress(dt, rawDist);
                const onRoadAmb = Boolean(map && map.isRoadAtPixel && map.isRoadAtPixel(this.x, this.y));
                const inJctBoxAmb = onRoadAmb && this.isOccupyingIntersectionBox(map);
                const corpseOnRoad = map.isRoadAtPixel ? map.isRoadAtPixel(nearestCorpse.x, nearestCorpse.y) : false;
                const corpseInBeachOrPark = Boolean(
                    !corpseOnRoad && (
                        nearestCorpse.x >= 447.5 * TILE_SIZE ||
                        (map.getTileAtPixel && map.getTileAtPixel(nearestCorpse.x, nearestCorpse.y) === TILE.SAND)
                    )
                );

                // Stop parallel at the curb beside the victim (< 145px on beach/road, never voluntarily inside an intersection box!) and deploy Paramedic!
                if ((!inJctBoxAmb || noProgress > 3.2) && (rawDist < 145 || (rawDist < 460 && noProgress > 1.50))) {
                    const spacingOk = this.alignCurbsideAndCheckSpacing(map, game, 68, nearestCorpse, noProgress > 3.2);
                    if (!spacingOk && this.aiBailTimer < 0.7) {
                        this.aiBailTimer += dt * 0.4;
                        return this.computeTargetRoadOrFeelerControls(dt, map, game, nearestCorpse.x, nearestCorpse.y, 0, 0, 0.44, false, !onRoadAmb);
                    }
                    this.aiBailTimer += dt;
                    const brakeMult = Math.pow(0.002, dt);
                    this.vx *= brakeMult;
                    this.vy *= brakeMult;
                    this.speed *= brakeMult;
                    if (this.aiBailTimer > 0.28 && typeof game.deployParamedicFromAmbulance === "function") {
                        this.aiBailTimer = 0;
                        this.approachNoProgress = 0;
                        this.vx = 0;
                        this.vy = 0;
                        this.speed = 0;
                        game.deployParamedicFromAmbulance(this, nearestCorpse);
                    }
                    return { throttle: 0, steer: 0, handbrake: true };
                }
                this.aiBailTimer = 0;
                const clearOfBuildings = map.traceSegment2D
                    ? !map.traceSegment2D(this.x, this.y, nearestCorpse.x, nearestCorpse.y, curZ).hit
                    : (rawDist < 240);
                // Stay strictly in cardinal road lanes on city streets so Ambulances never cut diagonally across 4-way intersections!
                const forceDirect =
                    (corpseInBeachOrPark && this.x >= 444.0 * TILE_SIZE && rawDist < 2400) ||
                    (!onRoadAmb && !corpseOnRoad && clearOfBuildings && rawDist < 240);
                return this.computeTargetRoadOrFeelerControls(
                    dt,
                    map,
                    game,
                    nearestCorpse.x,
                    nearestCorpse.y,
                    0,
                    0,
                    forceDirect ? 0.76 : 0.86,
                    false,
                    forceDirect
                );
            }
            this.medicTargetPed = null;
        }

        // B. FIRE ENGINE: Responds to burning vehicles & burning wrecks within 1650px, deploys an on-foot VCFD Firefighter, and sprays high-pressure water cannon!
        if (this.specKey === "FIRE_TRUCK" && Array.isArray(game.vehicles)) {
            if (this.deployedFireman) {
                if (
                    this.deployedFireman.dead ||
                    (this.deployedFireman.firemanOutTimer || 0) > 44.0 ||
                    !game.peds.includes(this.deployedFireman)
                ) {
                    this.deployedFireman = null;
                }
            }

            let burningCar = null;
            let bestDist = 1650;
            for (const v of game.vehicles) {
                if (v === this || v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER") continue;
                if (map && map.isWaterAtPixel && map.isWaterAtPixel(v.x, v.y)) continue;
                if (map && map.isRestrictedNoTrafficZone && map.isRestrictedNoTrafficZone(Math.floor(v.x / TILE_SIZE), Math.floor(v.y / TILE_SIZE))) continue;
                const isLiveBurning = !v.destroyed && ((v.burnTimer || 0) > 0 || v.hp <= 50);
                const isBurningWreck = v.destroyed && !v.fireExtinguished && (v.abandonedTimer || 0) >= 1.5;
                if (!isLiveBurning && !isBurningWreck) continue;
                const d = Math.hypot(v.x - this.x, v.y - this.y);
                if (d < bestDist) {
                    bestDist = d;
                    burningCar = v;
                }
            }

            if (burningCar) {
                this.sirenActive = true;
                this.aiState = "EMERGENCY_FIRE";
                if (this.fireTargetCar !== burningCar) {
                    this.fireTargetCar = burningCar;
                    this.approachBestDist = bestDist;
                    this.approachNoProgress = 0;
                    if (bestDist > 360) this._parkedAtFireScene = false;
                } else if (bestDist < (this.approachBestDist ?? 9999) - 6) {
                    this.approachBestDist = bestDist;
                    this.approachNoProgress = 0;
                } else {
                    this.approachNoProgress = (this.approachNoProgress || 0) + dt;
                }

                const ang = Math.atan2(burningCar.y - this.y, burningCar.x - this.x);
                const onRoadFire = Boolean(map && map.isRoadAtPixel && map.isRoadAtPixel(this.x, this.y));
                const inJctBoxFire = onRoadFire && this.isOccupyingIntersectionBox(map);
                const blockedNearFire = bestDist < 380 && (!inJctBoxFire || (this.approachNoProgress || 0) > 2.8) && (
                    (this.approachNoProgress || 0) > 1.15 ||
                    (this.aiStuckTimer || 0) > 0.28 ||
                    (this.aiReverseTimer || 0) > 0
                );
                const shouldParkAndDeploy =
                    (bestDist < 285 && !inJctBoxFire) ||
                    blockedNearFire ||
                    Boolean(this.deployedFireman) ||
                    Boolean(this._parkedAtFireScene && bestDist < 420);

                if (shouldParkAndDeploy) {
                    this.alignCurbsideAndCheckSpacing(map, game, 82, burningCar, true);
                    this._parkedAtFireScene = true;
                    // Never reverse back-and-forth once at the fire scene: lock brakes and deploy!
                    this.aiReverseTimer = 0;
                    this.aiStuckTimer = 0;
                    if (Math.abs(this.speed) < 22) {
                        this.speed = 0;
                        this.vx = 0;
                        this.vy = 0;
                    }
                    // Deploy an on-foot VCFD Firefighter in bunker gear & helmet with a handheld fire hose!
                    if (!this.deployedFireman) {
                        this.aiBailTimer = (this.aiBailTimer || 0) + dt;
                        if (this.aiBailTimer > 0.30 && Math.abs(this.speed) < 36 && typeof game.deployFirefighterFromTruck === "function") {
                            this.aiBailTimer = 0;
                            this.approachNoProgress = 0;
                            game.deployFirefighterFromTruck(this, burningCar);
                        }
                    }

                    // If within rooftop deck-gun range (< 320px), also fire the truck's rooftop water cannon all the way onto the burning target!
                    if (bestDist < 320) {
                        this._cannonAngle = ang;
                        this._sprayingCannonTimer = 0.16;
                        const nozX = this.x + Math.cos(this.angle || 0) * 8 + Math.cos(ang) * 16;
                        const nozY = this.y + Math.sin(this.angle || 0) * 8 + Math.sin(ang) * 16;
                        const reachToTarget = Math.max(22, Math.hypot(burningCar.x - nozX, burningCar.y - nozY) - 10);
                        if (typeof game.emitPressurizedWaterJet === "function") {
                            game.emitPressurizedWaterJet(nozX, nozY, ang, reachToTarget, true, burningCar);
                        }
                        if (Math.random() < 0.55 && typeof game.spawnParticle === "function") {
                            game.spawnParticle(
                                burningCar.x + (Math.random() - 0.5) * 22,
                                burningCar.y + (Math.random() - 0.5) * 22,
                                "WHITE_SMOKE"
                            );
                        }
                        burningCar.extinguishProgress = (burningCar.extinguishProgress || 0) + dt * 0.45;
                        if (!burningCar.destroyed) {
                            burningCar.chainExplodeTimer = 0;
                            if ((burningCar.burnTimer || 0) > 0) {
                                burningCar.burnTimer = Math.max(burningCar.burnTimer, 1.5);
                            }
                            if (burningCar.extinguishProgress >= 3.0) {
                                burningCar.hp = Math.min(burningCar.maxHp, Math.max(burningCar.hp + 35 * dt, 58));
                                burningCar.burnTimer = 0;
                                burningCar.extinguishProgress = 0;
                                if (!burningCar._vcfdSavedMsg && typeof game.addFloatingText === "function") {
                                    burningCar._vcfdSavedMsg = true;
                                    game.addFloatingText(burningCar.x, burningCar.y - 24, "🚒 VCFD — FIRE EXTINGUISHED!", "#38bdf8");
                                }
                            }
                        } else if (burningCar.extinguishProgress >= 4.5 && !burningCar.fireExtinguished) {
                            burningCar.fireExtinguished = true;
                            burningCar.burnTimer = 0;
                            if (typeof game.addFloatingText === "function") {
                                game.addFloatingText(burningCar.x, burningCar.y - 24, "🚒 VCFD — FIRE EXTINGUISHED!", "#38bdf8");
                            }
                            if (game.net && typeof game.net.broadcastWorldEvent === "function" && burningCar.id) {
                                game.net.broadcastWorldEvent({
                                    kind: "VEH_EXIT",
                                    vehId: burningCar.id,
                                    specKey: burningCar.specKey || "MINT_STALLION",
                                    x: Math.round(burningCar.x),
                                    y: Math.round(burningCar.y),
                                    z: Math.round((burningCar.z || 2.0) * 100) / 100,
                                    a: Math.round((burningCar.angle || 0) * 1000) / 1000,
                                    hp: 0,
                                    flags: 1 | 128,
                                    remapIdx: burningCar.remapIdx || 0
                                });
                            }
                        }
                    }
                    return { throttle: this.speed > 8 ? -0.85 : 0, steer: 0, handbrake: true };
                }
                this.aiBailTimer = 0;
                const fireOnRoad = map.isRoadAtPixel ? map.isRoadAtPixel(burningCar.x, burningCar.y) : false;
                const fireInBeachOrPark = Boolean(
                    !fireOnRoad && (
                        burningCar.x >= 447.5 * TILE_SIZE ||
                        (map.getTileAtPixel && map.getTileAtPixel(burningCar.x, burningCar.y) === TILE.SAND)
                    )
                );
                const fireClearOfBuildings = map.traceSegment2D
                    ? !map.traceSegment2D(this.x, this.y, burningCar.x, burningCar.y, this.z || 2.0).hit
                    : (bestDist < 240);
                const fireForceDirect =
                    (fireInBeachOrPark && this.x >= 444.0 * TILE_SIZE && bestDist < 2400) ||
                    (!onRoadFire && !fireOnRoad && fireClearOfBuildings && bestDist < 240);
                const fireCtrl = this.computeTargetRoadOrFeelerControls(
                    dt,
                    map,
                    game,
                    burningCar.x,
                    burningCar.y,
                    burningCar.vx || 0,
                    burningCar.vy || 0,
                    0.68,
                    false,
                    fireForceDirect
                );
                // A heavy fire engine drives to the scene at a measured emergency pace (not race speed),
                // and slows right down on the final approach so it can stop & deploy the crew
                const fireMaxSpd = bestDist < 340 ? 68 : 122;
                if (this.speed > fireMaxSpd) {
                    fireCtrl.throttle = -0.35;
                } else if (fireCtrl.throttle > 0) {
                    fireCtrl.throttle = Math.min(fireCtrl.throttle, this.speed > fireMaxSpd - 15 ? 0.12 : 0.45);
                }
                return fireCtrl;
            }
            this.fireTargetCar = null;
            this._parkedAtFireScene = false;
            if (this.deployedFireman) {
                this.sirenActive = true;
                this.aiState = "EMERGENCY_FIRE";
                this.aiReverseTimer = 0;
                this.aiStuckTimer = 0;
                if (Math.abs(this.speed) < 22) {
                    this.speed = 0;
                    this.vx = 0;
                    this.vy = 0;
                }
                return { throttle: this.speed > 6 ? -0.85 : 0, steer: 0, handbrake: true };
            }
        }

        this.sirenActive = false;
        this.aiState = "PATROL";
        // Persistent World Logic: once an Ambulance or Fire Engine finishes its 911 call, it drives back toward its Hospital or VCFD Fire Station!
        if (!this.homeStation && game && typeof game.getNearestEmergencyStation === "function") {
            const stType = this.specKey === "FIRE_TRUCK" ? "FIRE" : "MEDIC";
            this.homeStation = game.getNearestEmergencyStation(stType, this.x, this.y);
        }
        if (this.homeStation) {
            const dHome = Math.hypot(this.x - this.homeStation.x, this.y - this.homeStation.y);
            const isOffscreen = game && typeof game.isPointInAnyPlayerCameraView === "function"
                ? !game.isPointInAnyPlayerCameraView(this.x, this.y, 120)
                : true;
            // Once the Ambulance or Fire Engine returns to its Hospital / Firehouse (or is off-screen heading back after 14s), it enters the station garage!
            this._returnToBaseTimer = (this._returnToBaseTimer || 0) + dt;
            if ((dHome < 240 && isOffscreen) || (this._returnToBaseTimer > 14.0 && isOffscreen)) {
                const idx = game.vehicles.indexOf(this);
                if (idx !== -1 && this !== (game.player && game.player.inVehicle)) {
                    game.vehicles.splice(idx, 1);
                    if (typeof game.rebuildVehicleSpatialGrid === "function") {
                        game.rebuildVehicleSpatialGrid();
                    }
                }
                return { throttle: 0, steer: 0, handbrake: true };
            }
            if (this._returnToBaseTimer > 20.0) {
                this._returnToBaseTimer = 0;
                this.sirenActive = false;
                return this.computeTrafficControls(dt, map, game);
            }
            if (dHome > 180) {
                const retCtrl = this.computeTargetRoadOrFeelerControls(
                    dt,
                    map,
                    game,
                    this.homeStation.x,
                    this.homeStation.y,
                    0,
                    0,
                    0.48,
                    false,
                    false
                );
                if (this.speed > 86) retCtrl.throttle = -0.25;
                return retCtrl;
            }
        }
        return this.computeTrafficControls(dt, map, game);
    }

    computeTowControls(dt, map, game) {
        this.aiState = "TOW_TRUCK";
        this.sirenActive = Boolean(this.towTarget || this.towingVehicle);

        // If already towing a vehicle/wreck, haul it along the road network directly toward the nearest Municipal Impound / Vice Customs Yard!
        if (this.towingVehicle) {
            const tv = this.towingVehicle;
            this.towingTimer = (this.towingTimer || 0) + dt;
            const tvBurning = (!tv.destroyed && ((tv.burnTimer || 0) > 0 || tv.hp <= 50)) ||
                (tv.destroyed && !tv.fireExtinguished && tv.specKey !== "BMX_BIKE" && tv.specKey !== "E_SCOOTER");
            if (!this.impoundDepot && game && typeof game.getNearestEmergencyStation === "function") {
                this.impoundDepot = game.getNearestEmergencyStation("TOW", this.x, this.y);
            }
            const distToDepot = this.impoundDepot ? Math.hypot(this.x - this.impoundDepot.x, this.y - this.impoundDepot.y) : 9999;
            const isOffscreen = game && typeof game.isPointInAnyPlayerCameraView === "function"
                ? !game.isPointInAnyPlayerCameraView(this.x, this.y, 80)
                : ((game && game.player) ? Math.hypot(tv.x - game.player.x, tv.y - game.player.y) > 720 : true);
            // Deliver towed vehicle ONLY once it physically reaches the Vice Customs / Impound Yard (< 190px) or is hauled off-screen toward the depot!
            if (
                distToDepot < 190 ||
                (this.towingTimer > 12.0 && isOffscreen && distToDepot < 680) ||
                (this.towingTimer > 28.0 && isOffscreen)
            ) {
                if (this.impoundDepot && game && typeof game.addFloatingText === "function" && !isOffscreen) {
                    game.addFloatingText(tv.x, tv.y - 24, `🛻 IMPOUNDED AT ${this.impoundDepot.shortName || "VICE CUSTOMS"}!`, "#ffd13b");
                }
                tv.towedByTruck = null;
                this.towingVehicle = null;
                this.towingTimer = 0;
                const tvIdx = game.vehicles.indexOf(tv);
                if (tvIdx !== -1 && tv !== (game.player && game.player.inVehicle)) {
                    game.vehicles.splice(tvIdx, 1);
                }
                if (game.net && typeof game.net.broadcastVehicleRemoved === "function" && tv.id) {
                    game.net.broadcastVehicleRemoved(tv.id);
                }
                this.sirenActive = false;
                return this.computeTrafficControls(dt, map, game);
            }
            if (!game.vehicles.includes(tv) || tv.driver === "PLAYER" || tvBurning) {
                tv.towedByTruck = null;
                this.towingVehicle = null;
                this.towingTimer = 0;
            } else {
                const tCtrl = this.impoundDepot
                    ? this.computeTargetRoadOrFeelerControls(dt, map, game, this.impoundDepot.x, this.impoundDepot.y, 0, 0, 0.35, false, false)
                    : this.computeTrafficControls(dt, map, game);
                if (this.speed > 64) {
                    tCtrl.throttle = -0.25;
                } else {
                    tCtrl.throttle = Math.min(tCtrl.throttle, 0.28);
                }
                return tCtrl;
            }
        }

        // Validate or acquire target abandoned / wrecked vehicle on road
        // (Tow Truck prioritizes cooled wrecks first so it can peel a multi-car pileup while the Fire Truck extinguishes burning ones!)
        const isVehBurning = (v) =>
            (!v.destroyed && ((v.burnTimer || 0) > 0 || v.hp <= 50)) ||
            (v.destroyed && !v.fireExtinguished && v.specKey !== "BMX_BIKE" && v.specKey !== "E_SCOOTER");

        const isValidTowCandidate = (v) => {
            if (!v || v === this || v.towedByTruck || v.isStaticParked || v.missionTag || v.isEstateCar) return false;
            // NEVER target a burning vehicle or un-extinguished wreck — wait for VCFD Fire Engine to extinguish it first!
            if (isVehBurning(v)) return false;
            if (map && map.isWaterAtPixel && map.isWaterAtPixel(v.x, v.y)) return false;
            if (map && map.isRestrictedNoTrafficZone && map.isRestrictedNoTrafficZone(Math.floor(v.x / TILE_SIZE), Math.floor(v.y / TILE_SIZE))) return false;
            const towDelay = Math.max(12.0, Math.min(45.0, (game && game.wreckTowDelay) || 45.0));
            const isWreck = v.destroyed && (v.abandonedTimer || 0) > towDelay;
            const isAbandoned = !v.destroyed &&
                v.driver === null &&
                (v.abandonedTimer || 0) > (v.lastPlayerDriven ? 55.0 : (v.isPolice ? 42.0 : 35.0));
            if (!isWreck && !isAbandoned) return false;
            if (game && Array.isArray(game.vehicles)) {
                for (let ti = 0; ti < game.vehicles.length; ti++) {
                    const ot = game.vehicles[ti];
                    if (!ot || ot === this || ot.destroyed || ot.driver !== "AI_TOW") continue;
                    if (ot.towTarget === v || ot.towingVehicle === v) return false;
                }
            }
            return true;
        };

        let target = this.towTarget;
        if (
            !target ||
            !game.vehicles.includes(target) ||
            isVehBurning(target) ||
            (target.driver !== null && !target.destroyed) ||
            (target.towedByTruck && target.towedByTruck !== this) ||
            target.isStaticParked ||
            target.missionTag
        ) {
            target = null;
            this.towTarget = null;
            this._towKTurnActive = false;
        }

        // Acquire nearest valid cooled wreck or abandoned car blocking a lane
        if (!target || (this.approachNoProgress || 0) > 1.4) {
            let bestCand = null;
            let bestScore = 99999;
            for (const v of game.vehicles) {
                if (!isValidTowCandidate(v)) continue;
                const d = Math.hypot(v.x - this.x, v.y - this.y);
                if (d > 1400) continue;
                if (d < bestScore) {
                    bestScore = d;
                    bestCand = v;
                }
            }
            if (bestCand && bestCand !== target) {
                const curDist = target ? Math.hypot(target.x - this.x, target.y - this.y) : 9999;
                if (!target || bestScore < curDist - 16) {
                    target = bestCand;
                    this.towTarget = target;
                    this.sirenActive = true;
                    this.approachBestDist = undefined;
                    this.approachNoProgress = 0;
                    this._towKTurnActive = false;
                }
            }
        }

        if (!target) {
            this.sirenActive = false;
            this._towKTurnActive = false;
            if (!this.homeStation && game && typeof game.getNearestEmergencyStation === "function") {
                this.homeStation = game.getNearestEmergencyStation("TOW", this.x, this.y);
            }
            if (this.homeStation) {
                const dHome = Math.hypot(this.x - this.homeStation.x, this.y - this.homeStation.y);
                const isOffscreen = game && typeof game.isPointInAnyPlayerCameraView === "function"
                    ? !game.isPointInAnyPlayerCameraView(this.x, this.y, 120)
                    : true;
                this._returnToBaseTimer = (this._returnToBaseTimer || 0) + dt;
                if ((dHome < 240 && isOffscreen) || (this._returnToBaseTimer > 14.0 && isOffscreen)) {
                    const idx = game.vehicles.indexOf(this);
                    if (idx !== -1 && this !== (game.player && game.player.inVehicle)) {
                        game.vehicles.splice(idx, 1);
                        if (typeof game.rebuildVehicleSpatialGrid === "function") {
                            game.rebuildVehicleSpatialGrid();
                        }
                    }
                    return { throttle: 0, steer: 0, handbrake: true };
                }
                if (this._returnToBaseTimer > 20.0) {
                    this._returnToBaseTimer = 0;
                    this.sirenActive = false;
                    return this.computeTrafficControls(dt, map, game);
                }
                if (dHome > 180) {
                    const retCtrl = this.computeTargetRoadOrFeelerControls(dt, map, game, this.homeStation.x, this.homeStation.y, 0, 0, 0.45, false, false);
                    if (this.speed > 76) retCtrl.throttle = -0.25;
                    return retCtrl;
                }
            }
            return this.computeTrafficControls(dt, map, game);
        }

        const targetStillBurning = isVehBurning(target);

        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        // If the target vehicle/wreck is still on fire, the Tow Truck parks at a safe standby distance (145..215px) pulled over to the side
        // (and backs up slightly if closer than 135px so it never blocks the Fire Truck's access to the flames!)
        if (targetStillBurning && dist < 215) {
            this.towHookTimer = 0;
            this.approachNoProgress = 0;
            this.aiPullOverOffset = 24;
            this.aiPullOverTimer = 1.5;
            if (dist < 135) {
                return {
                    throttle: -0.55,
                    steer: 0.35,
                    handbrake: false
                };
            }
            return {
                throttle: this.speed > 6 ? -0.75 : 0,
                steer: 0,
                handbrake: true
            };
        }

        const noProgress = this.updateApproachProgress(dt, dist);
        const hCos = Math.cos(this.angle);
        const hSin = Math.sin(this.angle);
        const rCos = -hSin;
        const rSin = hCos;
        const relDx = target.x - this.x;
        const relDy = target.y - this.y;
        const along = relDx * hCos + relDy * hSin; // < 0 means target is behind the Tow Truck's rear winch boom
        const lat = relDx * rCos + relDy * rSin;
        const hitchDist = ((this.w || 56) + (target.w || 46)) * 0.52 + 8;
        const rearBoomX = this.x - hCos * hitchDist;
        const rearBoomY = this.y - hSin * hitchDist;
        const rearBoomDist = Math.hypot(target.x - rearBoomX, target.y - rearBoomY);
        const hookDist = Math.max(76, ((this.w || 62) + (target.w || 48)) * 0.54 + 14);

        // Physical Rear-Boom Hooking Protocol (Zero teleportation / Zero 180° instant snap!):
        // The Tow Truck's winch boom is at the REAR. When within 185px of the target vehicle:
        // 1) If target is still in front of the Tow Truck's cab (`along > -10`):
        //    - If the road 82px ahead of target is open, steer past target on the clear lateral side so target ends up behind our rear boom!
        //    - If the road ahead of target is blocked by other cars/walls (e.g. a pileup), execute a physical 3-point K-turn with the wheels
        //      until the Tow Truck faces outbound and its rear boom faces target!
        // 2) Once target is behind the Tow Truck (`along <= -10`), reverse slowly (`throttle = -0.34`) guiding the rear boom up to target's bumper!
        if (!targetStillBurning && dist < 185 && along > -10) {
            const curZ = this.z !== undefined ? this.z : 2.0;
            const aheadX = target.x + hCos * 82;
            const aheadY = target.y + hSin * 82;
            let aheadBlocked = Boolean(
                (map.isWaterAtPixel && map.isWaterAtPixel(aheadX, aheadY)) ||
                (map.resolveCircleBuildingCollision && map.resolveCircleBuildingCollision(aheadX, aheadY, 15, curZ).hit)
            );
            if (!aheadBlocked && game && Array.isArray(game.vehicles)) {
                for (let vi = 0; vi < game.vehicles.length; vi++) {
                    const ov = game.vehicles[vi];
                    if (!ov || ov === this || ov === target) continue;
                    if (Math.hypot(ov.x - aheadX, ov.y - aheadY) < 46) {
                        aheadBlocked = true;
                        break;
                    }
                }
            }
            if (!aheadBlocked && !this._towKTurnActive && noProgress < 1.6) {
                const passSide = lat >= 0 ? -1 : 1;
                const stageX = aheadX + rCos * passSide * 26;
                const stageY = aheadY + rSin * passSide * 26;
                const passAng = Math.atan2(stageY - this.y, stageX - this.x);
                return this.steerTowardTargetWithFeelers(dt, map, curZ, passAng, 0.36, game);
            }
            // Execute a real physical 3-point K-turn using the wheels so the Tow Truck turns around to face the clear outbound lane!
            if (!this._towKTurnActive) {
                this._towKTurnActive = true;
                this._towKTurnGoal = this.normalizeAngle(Math.atan2(this.y - target.y, this.x - target.x));
                this._towKTurnTimer = 0;
            }
            const angErr = this.normalizeAngle(this._towKTurnGoal - this.angle);
            if (Math.abs(angErr) > 0.28) {
                this._towKTurnTimer = (this._towKTurnTimer || 0) + dt;
                const turnSign = angErr >= 0 ? 1 : -1;
                const frontTestX = this.x + hCos * ((this.w || 62) * 0.5 + 22);
                const frontTestY = this.y + hSin * ((this.w || 62) * 0.5 + 22);
                let frontHit = Boolean(
                    (map.isWaterAtPixel && map.isWaterAtPixel(frontTestX, frontTestY)) ||
                    (map.resolveCircleBuildingCollision && map.resolveCircleBuildingCollision(frontTestX, frontTestY, 13, curZ).hit)
                );
                if (!frontHit && game && Array.isArray(game.vehicles)) {
                    for (let vi = 0; vi < game.vehicles.length; vi++) {
                        const ov = game.vehicles[vi];
                        if (!ov || ov === this) continue;
                        if (Math.hypot(ov.x - frontTestX, ov.y - frontTestY) < 28) {
                            frontHit = true;
                            break;
                        }
                    }
                }
                const inReverseLeg = frontHit || ((this._towKTurnTimer % 2.5) < 1.35);
                if (inReverseLeg) {
                    return { throttle: -0.48, steer: -turnSign * 0.95, handbrake: false };
                }
                return { throttle: 0.44, steer: turnSign * 0.95, handbrake: false };
            }
            this._towKTurnActive = false;
        }

        // Once target is behind the Tow Truck's rear boom (`along <= -10`), back the rear winch boom right up to target's bumper!
        if (!targetStillBurning && dist < 185 && along <= -10 && rearBoomDist > 38 && noProgress < 2.2) {
            this.towHookTimer = 0;
            const rearToTargetAng = this.normalizeAngle(Math.atan2(target.y - this.y, target.x - this.x) - (this.angle + Math.PI));
            const revSteer = Math.max(-0.85, Math.min(0.85, -rearToTargetAng * 2.2));
            return {
                throttle: this.speed < -38 ? 0 : -0.34,
                steer: revSteer,
                handbrake: false
            };
        }

        if (!targetStillBurning && along <= -6 && (rearBoomDist <= 38 || dist < hookDist || (dist < 175 && noProgress >= 2.2))) {
            // Stop for 1.8s to attach the rear tow winch cable before pulling away!
            this.towHookTimer = (this.towHookTimer || 0) + dt;
            if (this.towHookTimer < 1.8) {
                return {
                    throttle: Math.abs(this.speed) > 6 ? (this.speed > 0 ? -0.75 : 0.75) : 0,
                    steer: 0,
                    handbrake: true
                };
            }
            this.towHookTimer = 0;
            this._towKTurnActive = false;
            this.approachBestDist = undefined;
            this.approachNoProgress = 0;
            this.towingVehicle = target;
            this.towTarget = null;
            target.towedByTruck = this;
            target.driver = null;
            target.sirenActive = false;
            target.vx = 0;
            target.vy = 0;
            target.speed = 0;
            this.aiBlockX = -1;
            this.aiBlockY = -1;
            this.aiChosenDir = null;
            if (game.audio && typeof game.audio.playBeep === "function") {
                game.audio.playBeep(580, 0.08, "square", 0.06);
            }
            if (typeof game.addFloatingText === "function") {
                game.addFloatingText(target.x, target.y - 24, "🪝 VCPD IMPOUND — TOWING!", "#f59e0b");
            }
            return { throttle: 0.22, steer: 0, handbrake: false };
        }
        this.towHookTimer = 0;

        const towTargetOnRoad = map.isRoadAtPixel ? map.isRoadAtPixel(target.x, target.y) : false;
        const towTargetInBeachOrPark = Boolean(
            !towTargetOnRoad && (
                target.x >= 447.5 * TILE_SIZE ||
                (map.getTileAtPixel && map.getTileAtPixel(target.x, target.y) === TILE.SAND)
            )
        );
        const closeApproach = dist < 175 || (towTargetInBeachOrPark && this.x >= 444.0 * TILE_SIZE && dist < 2400);
        const towForceDirect = (!towTargetOnRoad && dist < 175) || (towTargetInBeachOrPark && this.x >= 444.0 * TILE_SIZE && dist < 2400);
        const roadCtrl = this.computeTargetRoadOrFeelerControls(
            dt,
            map,
            game,
            target.x,
            target.y,
            0,
            0,
            closeApproach ? 0.34 : 0.42,
            false,
            towForceDirect
        );
        const maxTowSpd = closeApproach ? 52 : 86;
        if (this.speed > maxTowSpd) {
            roadCtrl.throttle = -0.25;
        }
        return roadCtrl;
    }

    update(dt, input, map, game) {
        if (game) this._gameRef = game;
        // Fast early-out for healthy stationary parked vehicles (~540 curb-parked & lot-parked cars):
        // Avoids 300+ lines of per-frame timer/damage/AI/physics checks when completely idle!
        if (
            !this.driver &&
            !this.destroyed &&
            !this.towedByTruck &&
            !this.bombArmed &&
            !(this.chainExplodeTimer > 0) &&
            !(this.burnTimer > 0) &&
            this.hp > 30 &&
            !(this.doorOpenTimer > 0) &&
            !(this.crashCooldown > 0) &&
            !(this.stuntAirTimer > 0) &&
            Math.abs(this.speed || 0) < 0.05 &&
            Math.abs(this.vx || 0) < 0.05 &&
            Math.abs(this.vy || 0) < 0.05 &&
            Math.abs(this.angularVelocity || 0) < 0.01
        ) {
            return;
        }

        // If this vehicle or wreck is hooked to a Tow Truck, follow behind its rear hitch!
        if (this.towedByTruck) {
            const truck = this.towedByTruck;
            if (
                !truck ||
                truck.destroyed ||
                truck.towingVehicle !== this ||
                this.driver === "PLAYER" ||
                (game && !game.vehicles.includes(truck))
            ) {
                if (truck && truck.towingVehicle === this) truck.towingVehicle = null;
                this.towedByTruck = null;
            } else {
                const hitchDist = ((truck.w || 56) + (this.w || 46)) * 0.52 + 8;
                const targetX = truck.x - Math.cos(truck.angle) * hitchDist;
                const targetY = truck.y - Math.sin(truck.angle) * hitchDist;
                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const pullAng = Math.atan2(truck.y - this.y, truck.x - this.x);
                const angDiff = Math.atan2(Math.sin(pullAng - this.angle), Math.cos(pullAng - this.angle));
                this.angle += angDiff * Math.min(1.0, dt * 4.5);
                this.x += dx * Math.min(1.0, dt * 5.2);
                this.y += dy * Math.min(1.0, dt * 5.2);
                if (map && typeof map.resolveCircleBuildingCollision === "function") {
                    const tCol = map.resolveCircleBuildingCollision(this.x, this.y, 12, truck.z || 2.0, false);
                    if (tCol.hit) {
                        this.x = tCol.x;
                        this.y = tCol.y;
                    }
                }
                this.burnTimer = 0;
                this.z = truck.z;
                this.vx = truck.vx;
                this.vy = truck.vy;
                this.speed = truck.speed;
                return;
            }
        }

        if (this.destroyed) {
            this.abandonedTimer = (this.abandonedTimer || 0) + dt;
            // Burned-out wrecks are heavy dead hulks: they still slide & spin when blasted or rammed,
            // grinding to a halt with strong scrape friction (no engine, locked wheels) and bouncing off walls.
            const wSpd = Math.hypot(this.vx || 0, this.vy || 0);
            const wSpin = Math.abs(this.angularVelocity || 0);
            if (wSpd > 0.5 || wSpin > 0.01) {
                const fr = Math.pow(0.12, dt);
                this.vx *= fr;
                this.vy *= fr;
                this.angle += (this.angularVelocity || 0) * dt;
                this.angularVelocity = (this.angularVelocity || 0) * Math.pow(0.06, dt);
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                if (map && typeof map.resolveCircleBuildingCollision === "function") {
                    const wz = this.z !== undefined ? this.z : 2.0;
                    const wRad = Math.min(18, Math.max(11, (this.h || 24) * 0.45));
                    const wCol = map.resolveCircleBuildingCollision(this.x, this.y, wRad, wz, false);
                    if (wCol.hit) {
                        this.x = wCol.x;
                        this.y = wCol.y;
                        this.vx *= -0.3;
                        this.vy *= -0.3;
                        this.angularVelocity = (this.angularVelocity || 0) * 0.5;
                    }
                }
                if (map && typeof map.getHeightAtPixel === "function") {
                    const isWaterWreck = Boolean(this.waterOnly || this.specKey === "AIRBOAT" || (map.isWaterAtPixel && map.isWaterAtPixel(this.x, this.y)));
                    this.z = isWaterWreck
                        ? Math.max(2.0, map.getHeightAtPixel(this.x, this.y, this.z !== undefined ? this.z : 2.0, false))
                        : map.getHeightAtPixel(this.x, this.y, this.z !== undefined ? this.z : 2.0);
                }
                // Scraping metal sparks while the hulk slides fast
                if (wSpd > 70 && game && typeof game.spawnParticle === "function" && Math.random() < 0.35) {
                    game.spawnParticle(this.x + (Math.random() - 0.5) * 18, this.y + (Math.random() - 0.5) * 18, "SPARK");
                }
                if (Math.hypot(this.vx, this.vy) < 3) {
                    this.vx = 0;
                    this.vy = 0;
                }
                if (Math.abs(this.angularVelocity || 0) < 0.02) this.angularVelocity = 0;
            }
            this.speed = 0;
            return;
        }

        if (this.driver === "PLAYER") {
            this.lastPlayerDriven = true;
            this.isStaticParked = false;
            this.abandonedTimer = 0;
        } else if (this.driver !== null) {
            this.isStaticParked = false;
            this.abandonedTimer = 0;
        } else {
            this.abandonedTimer = (this.abandonedTimer || 0) + dt;
        }

        this.sirenPhase += dt * 10;
        if ((this._sprayingCannonTimer || 0) > 0) {
            this._sprayingCannonTimer = Math.max(0, this._sprayingCannonTimer - dt);
        }

        // Gridlock resolution (no cheating, everything stays solid): an AI vehicle frozen for a long time
        // (not at a red light / not parked on purpose) BACKS UP out of the jam like a real driver and re-picks its route,
        // which frees the intersection box for the cross traffic. Drivers back up one after another (staggered by id).
        if (this.gridlockReverseTimer > 0) {
            this.gridlockReverseTimer = Math.max(0, this.gridlockReverseTimer - dt);
        }
        if (this.gridlockEscapeTimer > 0) {
            this.gridlockEscapeTimer = Math.max(0, this.gridlockEscapeTimer - dt);
        }
        if (this.gridlockAvoidTimer > 0) {
            this.gridlockAvoidTimer = Math.max(0, this.gridlockAvoidTimer - dt);
        }
        const isAiDriven =
            this.driver === "AI_TRAFFIC" ||
            this.driver === "AI_TOW" ||
            this.driver === "AI_EMERGENCY" ||
            this.driver === "AI_COP" ||
            this.driver === "AI_CRIMINAL";
        if (this._glAnchorX === undefined || Math.hypot(this.x - this._glAnchorX, this.y - this._glAnchorY) > 10) {
            this._glAnchorX = this.x;
            this._glAnchorY = this.y;
            if (!(this.gridlockReverseTimer > 0)) {
                this.gridlockTimer = 0;
            }
        }
        const notMakingWorldProgress = Math.hypot(this.x - this._glAnchorX, this.y - this._glAnchorY) <= 10;
        if (isAiDriven && this.aiState !== "STOPPED_LIGHT" && this.aiState !== "STOPPED_QUEUE" && this.aiState !== "CURB_PARKED" && notMakingWorldProgress && !(this.gridlockReverseTimer > 0) && !(this.gridlockEscapeTimer > 0)) {
            let counts = true;
            if (this.driver === "AI_TOW") counts = (Boolean(this.towingVehicle) && (this.towingStuckTimer || 0) > 2.5) || ((this.approachNoProgress || 0) > 3.0 && !this.towHookTimer);
            else if (this.driver === "AI_EMERGENCY") counts = !this.deployedFireman && !this.deployedMedic && (this.approachNoProgress || 0) > 3.0;
            if (counts) {
                this.gridlockTimer = (this.gridlockTimer || 0) + dt;
                const idNum = parseInt(String(this.id).replace(/\D/g, ""), 10) || 0;
                const inBox = Boolean(map && map.getBlockInfo && map.getBlockInfo(Math.floor(this.x / TILE_SIZE), Math.floor(this.y / TILE_SIZE), 1).lid === 25);
                const threshold = (inBox ? 2.0 : 10.5) + (idNum % 4) * 0.55;
                if (this.gridlockTimer > threshold) {
                    // Only back up if there is free road behind us; if another AI car is bumper-to-bumper behind us, signal it to ripple-reverse first!
                    const bCos = Math.cos(this.angle), bSin = Math.sin(this.angle);
                    const rearProbeX = this.x - bCos * ((this.w || 48) * 0.5 + 22);
                    const rearProbeY = this.y - bSin * ((this.w || 48) * 0.5 + 22);
                    const rpbx = Math.floor(rearProbeX / TILE_SIZE);
                    const rpby = Math.floor(rearProbeY / TILE_SIZE);
                    let rearClear = !(
                        map && map.surfaceGround && (
                            rpbx < 2 || rpbx >= MAP_COLS - 2 || rpby < 2 || rpby >= MAP_ROWS - 2 ||
                            map.surfaceGround[rpby * MAP_COLS + rpbx] !== GROUND_TYPE.ROAD
                        )
                    );
                    let blockingRearVeh = null;
                    if (game && Array.isArray(game.vehicles)) {
                        const vHead = game._vehGridHead;
                        const vNext = game._vehGridNext;
                        const checkRear = (o) => {
                            if (!o || o === this || o === this.towingVehicle) return false;
                            if (o.z !== undefined && Math.abs(o.z - (this.z !== undefined ? this.z : 2.0)) > 0.85) return false;
                            const ox = o.x - this.x, oy = o.y - this.y;
                            if (ox > 110 || ox < -110 || oy > 110 || oy < -110) return false;
                            const along = ox * bCos + oy * bSin;
                            const lat = Math.abs(-ox * bSin + oy * bCos);
                            const need = ((this.w || 48) + (o.w || 48)) * 0.5 + 8;
                            if (along < 0 && along > -(need + (inBox ? 10 : 24)) && lat < ((this.h || 24) + (o.h || 24)) * 0.5 + 4) {
                                blockingRearVeh = o;
                                return true;
                            }
                            return false;
                        };
                        if (vHead && vNext) {
                            const gcx = this.x >> 8;
                            const gcy = this.y >> 8;
                            const x0 = gcx > 0 ? gcx - 1 : 0;
                            const x1 = gcx < 127 ? gcx + 1 : 127;
                            const y0 = gcy > 0 ? gcy - 1 : 0;
                            const y1 = gcy < 127 ? gcy + 1 : 127;
                            for (let cy = y0; cy <= y1 && rearClear; cy++) {
                                const rowOff = cy << 7;
                                for (let cx = x0; cx <= x1; cx++) {
                                    let idx = vHead[rowOff | cx];
                                    while (idx !== -1) {
                                        if (checkRear(game.vehicles[idx])) {
                                            rearClear = false;
                                            break;
                                        }
                                        idx = vNext[idx];
                                    }
                                    if (!rearClear) break;
                                }
                            }
                        } else {
                            for (const o of game.vehicles) {
                                if (checkRear(o)) {
                                    rearClear = false;
                                    break;
                                }
                            }
                        }
                    }
                    if (rearClear && (inBox || this.aiState !== "YIELD_BOX")) {
                        this.gridlockReverseTimer = inBox ? 2.2 : 2.6;
                        this.gridlockStartedInBox = inBox;
                        this.gridlockAvoidAngle = this.aiChosenDir && typeof this.aiChosenDir.angle === "number" ? this.aiChosenDir.angle : this.angle;
                        this.gridlockAvoidTimer = 14.0;
                        this.gridlockTimer = 0;
                        this.aiLaneChangeCooldown = 0;
                        this.aiBlockX = -1;
                        this.aiBlockY = -1;
                        this.aiChosenDir = null;
                        if (this.driver !== "AI_TRAFFIC") {
                            this.aiReverseTimer = 1.2;
                            this.aiReverseSteer = Math.random() < 0.5 ? 0.8 : -0.8;
                        }
                    } else {
                        // Cooperative Ripple Back-Up ONLY when `this` is trapped inside an intersection box (`inBox`)
                        // and `blockingRearVeh` has safe non-intersection road behind it!
                        if (
                            inBox &&
                            blockingRearVeh &&
                            blockingRearVeh.driver === "AI_TRAFFIC" &&
                            !blockingRearVeh.destroyed &&
                            !(blockingRearVeh.gridlockReverseTimer > 0)
                        ) {
                            const brCos = Math.cos(blockingRearVeh.angle || 0), brSin = Math.sin(blockingRearVeh.angle || 0);
                            const brX = blockingRearVeh.x - brCos * ((blockingRearVeh.w || 48) * 0.5 + 28);
                            const brY = blockingRearVeh.y - brSin * ((blockingRearVeh.w || 48) * 0.5 + 28);
                            const brBx = Math.floor(brX / TILE_SIZE), brBy = Math.floor(brY / TILE_SIZE);
                            const brSafeRoad = Boolean(
                                map && map.surfaceGround &&
                                brBx >= 2 && brBx < MAP_COLS - 2 && brBy >= 2 && brBy < MAP_ROWS - 2 &&
                                map.surfaceGround[brBy * MAP_COLS + brBx] === GROUND_TYPE.ROAD &&
                                (!map.getBlockInfo || map.getBlockInfo(brBx, brBy, 1).lid !== 25)
                            );
                            if (brSafeRoad) {
                                blockingRearVeh.gridlockReverseTimer = 1.35;
                                blockingRearVeh.gridlockStartedInBox = false;
                                this.gridlockTimer = Math.max(0, threshold - 0.95);
                            } else {
                                this.gridlockTimer = 0;
                            }
                        } else {
                            this.gridlockTimer = 0;
                        }
                        const gbx = Math.floor(this.x / TILE_SIZE);
                        const gby = Math.floor(this.y / TILE_SIZE);
                        const gz = this.z !== undefined ? this.z : 2.0;
                        if (!inBox) {
                            if (!this.tryAdjacentLaneChange(gbx, gby, gz, map, game)) {
                                this.gridlockAvoidAngle = this.aiChosenDir && typeof this.aiChosenDir.angle === "number" ? this.aiChosenDir.angle : this.angle;
                                this.gridlockAvoidTimer = 10.0;
                                this.aiBlockX = -1;
                                this.aiBlockY = -1;
                                this.aiChosenDir = null;
                            }
                        } else {
                            this.gridlockAvoidAngle = this.aiChosenDir && typeof this.aiChosenDir.angle === "number" ? this.aiChosenDir.angle : this.angle;
                            this.gridlockAvoidTimer = 10.0;
                            this.aiTurnedInIntersection = false;
                            this.aiBlockX = -1;
                            this.aiBlockY = -1;
                            this.aiChosenDir = null;
                        }
                        this.aiLaneChangeCooldown = 0;
                    }
                }
            } else {
                this.gridlockTimer = Math.max(0, (this.gridlockTimer || 0) - dt * 2);
            }
        } else if (!(this.gridlockReverseTimer > 0)) {
            this.gridlockTimer = Math.max(0, (this.gridlockTimer || 0) - dt * 2);
        }
        if (this.doorOpenTimer > 0) {
            this.doorOpenTimer = Math.max(0, this.doorOpenTimer - dt);
        }
        if (this.crashCooldown > 0) {
            this.crashCooldown = Math.max(0, this.crashCooldown - dt);
        }

        // Remote player driven vehicle: pose is updated directly at 60 FPS from remote player state in net.js
        if (this.driver === "REMOTE") {
            return;
        }

        // Dedicated Server & Client World Sync Mode: continuous 60 FPS velocity dead-reckoning + smooth error-offset decay (zero rubber-banding!)
        const isServerDrivenActive = Boolean(
            this._serverDriven &&
            !this._worldModified &&
            this.driver !== "PLAYER" &&
            (performance.now() - (this._lastNetSyncMs || 0)) < 2200
        );
        if (
            this.driver !== "PLAYER" &&
            this.netTargetX !== undefined &&
            this.netTargetY !== undefined &&
            (isServerDrivenActive || (
                (performance.now() - (this._lastNetSyncMs || 0)) < 1200 &&
                game &&
                game.net &&
                typeof game.net.isClientWorldSyncActive === "function" &&
                game.net.isClientWorldSyncActive()
            ))
        ) {
            this.x += (this.vx || 0) * dt;
            this.y += (this.vy || 0) * dt;
            if (this.netErrX || this.netErrY) {
                const blend = Math.min(1.0, dt * 6.5);
                this.x += (this.netErrX || 0) * blend;
                this.y += (this.netErrY || 0) * blend;
                this.netErrX = (this.netErrX || 0) * (1.0 - blend);
                this.netErrY = (this.netErrY || 0) * (1.0 - blend);
            }
            if (this.netTargetZ !== undefined) {
                this.z += (this.netTargetZ - this.z) * Math.min(1.0, dt * 10.0);
            }
            if (this.netTargetAngle !== undefined) {
                const angDiff = Math.atan2(Math.sin(this.netTargetAngle - this.angle), Math.cos(this.netTargetAngle - this.angle));
                this.angle += angDiff * Math.min(1.0, dt * 10.0);
            }
            if (this.hp < this.maxHp * 0.55 && Math.random() < 0.25 && !map.isWaterAtPixel(this.x, this.y)) {
                game.spawnParticle(
                    this.x + Math.cos(this.angle) * 18,
                    this.y + Math.sin(this.angle) * 18,
                    this.hp < this.maxHp * 0.3 ? "BLACK_SMOKE" : "WHITE_SMOKE"
                );
            }
            return;
        }

        // 1997 GTA 1 Delayed Chain-Reaction Explosion (mCarExplosionChainDelayTime)
        if (this.chainExplodeTimer > 0) {
            if (this.specKey === "BMX_BIKE" || this.specKey === "E_SCOOTER") {
                this.chainExplodeTimer = 0;
                this.burnTimer = 0;
                game.explodeVehicle(this);
                return;
            }
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

        // Pedal bicycles and e-scooters never catch gasoline engine fire or emit engine smoke!
        if (this.specKey === "BMX_BIKE" || this.specKey === "E_SCOOTER") {
            this.burnTimer = 0;
            if (this.hp <= 0 && !this.destroyed) {
                game.explodeVehicle(this);
                return;
            }
        } else if ((this.hp <= 30 || this.burnTimer > 0) && !this.destroyed && !map.isWaterAtPixel(this.x, this.y)) {
            // Burning vehicle countdown to explosion + AI Driver Bail-Out!
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
        } else if (this.hp <= 0 && !this.destroyed) {
            // Vehicle destroyed while in water: disable cleanly so it doesn't stay alive at negative HP
            this.destroyed = true;
            this.burnTimer = 0;
            this.sirenActive = false;
            this.drifting = false;
            this.speed = 0;
            this.vx = 0;
            this.vy = 0;
            if (game && game.player && game.player.inVehicle !== this) {
                this.driver = null;
            }
            return;
        } else if (this.hp < this.maxHp * 0.55 && Math.random() < 0.25 && !map.isWaterAtPixel(this.x, this.y)) {
            game.spawnParticle(
                this.x + Math.cos(this.angle) * 18,
                this.y + Math.sin(this.angle) * 18,
                this.hp < this.maxHp * 0.3 ? "BLACK_SMOKE" : "WHITE_SMOKE"
            );
        }

        // Fast early-out for stationary parked vehicles (zero per-frame physics/collision overhead while motionless!)
        if (
            !this.driver &&
            !this.towedByTruck &&
            Math.abs(this.speed || 0) < 0.05 &&
            Math.abs(this.vx || 0) < 0.05 &&
            Math.abs(this.vy || 0) < 0.05 &&
            (this.stuntAirTimer || 0) <= 0
        ) {
            this.speed = 0;
            this.vx = 0;
            this.vy = 0;
            this.angularVelocity = 0;
            return;
        }
        if (this.isStaticParked && (this.driver || Math.abs(this.speed || 0) > 25)) {
            this.isStaticParked = false;
        }

        // Control inputs
        let throttle = 0;
        let steer = 0;
        let handbrake = false;
        const surfaceMult = this.computeSurfaceMultiplier(map);

        if (this.driver === "PLAYER" && input && input.joyActive && (Math.abs(input.joyX) > 0.1 || Math.abs(input.joyY) > 0.1)) {
            // Mobile Direct 360° Stick Driving (Pedestrian-like: point stick in any direction -> car turns & goes there immediately)
            this.aiState = "PLAYER";
            input.joyWasUsed = true;
            const targetAngle = Math.atan2(input.joyY, input.joyX);
            let diff = targetAngle - this.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            const turnStep = 11.5 * dt;
            if (Math.abs(diff) <= turnStep) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(diff) * turnStep;
            }
            this.steerAngleRad = Math.max(-0.52, Math.min(0.52, diff * 0.65));

            const joyMag = Math.min(1.0, Math.max(0.28, input.joyMag || 1.0));
            const targetMaxSpd = this.maxSpeed * surfaceMult * joyMag;
            let curSpd = Math.hypot(this.vx, this.vy);
            curSpd = Math.min(targetMaxSpd, curSpd + this.accel * 1.25 * dt);
            if (input.handbrake) {
                curSpd *= Math.pow(0.35, dt);
            }
            this.speed = curSpd;
            this.vx = Math.cos(this.angle) * curSpd;
            this.vy = Math.sin(this.angle) * curSpd;
            this.drifting = (Math.abs(diff) > 0.45 || Boolean(input.handbrake)) && curSpd > 110;
        } else if (this.driver === "PLAYER" && input && input.joyWasUsed && !input.up && !input.down && !input.left && !input.right) {
            // Mobile stick released: smooth immediate stop like pedestrian movement
            this.aiState = "PLAYER";
            this.steerAngleRad = 0;
            this.drifting = false;
            this.vx *= Math.pow(0.025, dt);
            this.vy *= Math.pow(0.025, dt);
            if (Math.hypot(this.vx, this.vy) < 6) {
                this.vx = 0;
                this.vy = 0;
            }
            this.speed = Math.hypot(this.vx, this.vy);
        } else {
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
            } else if (this.driver === "AI_CRIMINAL") {
                const crimCtrl = this.computeCriminalControls(dt, map, game);
                throttle = crimCtrl.throttle;
                steer = crimCtrl.steer;
                handbrake = crimCtrl.handbrake;
            } else if (this.driver === "AI_TOW") {
                const towCtrl = this.computeTowControls(dt, map, game);
                throttle = towCtrl.throttle;
                steer = towCtrl.steer;
                handbrake = towCtrl.handbrake;
            }

            this.updateSteer(dt, steer);
            let { forwardVel, lateralVel } = this.updateDrive(dt, throttle, handbrake, surfaceMult);
            ({ forwardVel, lateralVel } = this.updateFriction(dt, forwardVel, lateralVel, handbrake, map, game));

            // Reconstruct world velocity from 2-axle tire state
            const nfx = Math.cos(this.angle);
            const nfy = Math.sin(this.angle);
            const nrx = -nfy;
            const nry = nfx;

            this.vx = nfx * forwardVel + nrx * lateralVel;
            this.vy = nfy * forwardVel + nry * lateralVel;
        }

        const preMoveX = this.x;
        const preMoveY = this.y;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Hard longitudinal anti-overlap safety clamp for AI traffic:
        // Ensures an AI vehicle never creeps into or phases through the rear bumper of its lead vehicle!
        if (
            this.driver &&
            this.driver !== "PLAYER" &&
            this.driver !== "REMOTE" &&
            this.driver !== "AI_COP" &&
            !this.waterOnly &&
            (this.speed || 0) > 0 &&
            this._cachedClosestEntity &&
            this._cachedClosestEntity.w &&
            !this._cachedClosestEntity.waterOnly &&
            this._cachedClosestEntity !== this.towingVehicle &&
            this._cachedClosestEntity !== this.towTarget
        ) {
            const lead = this._cachedClosestEntity;
            const cfx = Math.cos(this.angle);
            const cfy = Math.sin(this.angle);
            const dx = lead.x - this.x;
            const dy = lead.y - this.y;
            const fDist = dx * cfx + dy * cfy;
            const lDist = Math.abs(-dx * cfy + dy * cfx);
            const latTol = Math.min(27, ((this.h || 28) + (lead.h || 28)) * 0.43);
            const minCenterDist = ((this.w || 62) + (lead.w || 62)) * 0.50 + (this.isMotorcycle ? 12 : 18);
            if (fDist > 4 && fDist < minCenterDist && lDist < latTol) {
                const pushBack = minCenterDist - fDist;
                this.x -= cfx * pushBack;
                this.y -= cfy * pushBack;
                const capSpd = Math.max(0, (lead.speed || 0) * 0.90);
                if (this.speed > capSpd) {
                    this.speed = capSpd;
                    this.vx = cfx * capSpd;
                    this.vy = cfy * capSpd;
                }
            }
        }

        // Water-only craft (jet-ski, speedboat): the hull runs aground on beaches, docks & quays,
        // but passes freely through the water channel underneath elevated bridges (`isBoatNavigableWater`)!
        if (this.waterOnly && map.isWaterAtPixel) {
            const isNavWater = (px, py) => map.isBoatNavigableWater ? map.isBoatNavigableWater(px, py) : map.isWaterAtPixel(px, py);
            const dirSign = (this.vx * Math.cos(this.angle) + this.vy * Math.sin(this.angle)) >= 0 ? 1 : -1;
            const bowX = this.x + Math.cos(this.angle) * (this.w || 40) * 0.36 * dirSign;
            const bowY = this.y + Math.sin(this.angle) * (this.w || 40) * 0.36 * dirSign;
            const preBowX = preMoveX + Math.cos(this.angle) * (this.w || 40) * 0.36 * dirSign;
            const preBowY = preMoveY + Math.sin(this.angle) * (this.w || 40) * 0.36 * dirSign;
            const centerHitLand = !isNavWater(this.x, this.y) && isNavWater(preMoveX, preMoveY);
            const bowHitLand = !isNavWater(bowX, bowY) && isNavWater(preBowX, preBowY);
            if (centerHitLand || bowHitLand) {
                const impact = Math.hypot(this.vx, this.vy);
                this.x = preMoveX;
                this.y = preMoveY;
                this.vx *= -0.18;
                this.vy *= -0.18;
                this.speed = (this.speed || 0) * -0.18;
                this.angularVelocity = 0;
                if (impact > 160 && (this.crashCooldown || 0) <= 0) {
                    this.crashCooldown = 0.6;
                    this.receiveImpactDamage((impact - 150) * 0.05, bowX, bowY);
                    if (this.driver === "PLAYER" && game && game.audio && typeof game.audio.playCarCrash === "function") {
                        game.audio.playCarCrash(Math.min(1.2, (impact - 140) / 160));
                    }
                }
            } else if (this.driver === "PLAYER" && !isNavWater(this.x, this.y)) {
                // If a moored/spawned boat center slightly overlaps a pier/shore tile, slide it smoothly into adjacent water
                for (let rad = 8; rad <= 48; rad += 8) {
                    let pushed = false;
                    for (let a = 0; a < 8; a++) {
                        const ang = a * Math.PI * 0.25;
                        const tx = this.x + Math.cos(ang) * rad;
                        const ty = this.y + Math.sin(ang) * rad;
                        if (isNavWater(tx, ty)) {
                            this.x = tx;
                            this.y = ty;
                            pushed = true;
                            break;
                        }
                    }
                    if (pushed) break;
                }
            }
        }

        // Building & Seawall/Bridge Guardrail collision check (uses lateral half-width so long buses/limos don't clip adjacent lane walls)
        const curZ = this.z !== undefined ? this.z : 2.0;
        const isUnderBridgeWaterCraft = Boolean(this.waterOnly || this.specKey === "AIRBOAT");
        const wallRad = this.driver === "PLAYER"
            ? Math.min(22, Math.max(12, (this.h || 24) * 0.52))
            : Math.min(18, Math.max(11, (this.h || 24) * 0.45));
        const col = map.resolveCircleBuildingCollision(
            this.x,
            this.y,
            wallRad,
            curZ,
            Boolean(this.amphibious || this.waterOnly || (this.stuntAirTimer || 0) > 0),
            isUnderBridgeWaterCraft
        );
        if (col.hit) {
            const impact = Math.hypot(this.vx, this.vy);
            const hitSign = this.speed >= 0 ? 1 : -1;
            const hitX = this.x + Math.cos(this.angle) * 20 * hitSign;
            const hitY = this.y + Math.sin(this.angle) * 20 * hitSign;
            const pushDx = col.x - this.x;
            const pushDy = col.y - this.y;
            this.x = col.x;
            this.y = col.y;
            this.angularVelocity = 0;
            if (this.driver === "AI_TRAFFIC") {
                this.vx *= 0.25;
                this.vy *= 0.25;
                if (this.aiChosenDir && typeof this.aiChosenDir.angle === "number") {
                    this.angle = this.aiChosenDir.angle;
                }
            } else if (this.driver === "AI_COP" || this.driver === "AI_EMERGENCY" || this.driver === "AI_TOW") {
                // Smooth tangential slide around palm trunks, benches & curbs so off-road emergency units never bounce backwards or jackknife!
                const pushLen = Math.hypot(pushDx, pushDy);
                if (pushLen > 0.01) {
                    const nx = pushDx / pushLen;
                    const ny = pushDy / pushLen;
                    const vn = this.vx * nx + this.vy * ny;
                    if (vn < 0) {
                        this.vx -= nx * vn;
                        this.vy -= ny * vn;
                    }
                    const tangentAng = Math.atan2(this.vy, this.vx);
                    if (Math.hypot(this.vx, this.vy) > 12) {
                        const aDiff = this.normalizeAngle(tangentAng - this.angle);
                        this.angle += aDiff * 0.35;
                    }
                }
                this.speed = Math.hypot(this.vx, this.vy);
            } else {
                const pushLen = Math.hypot(pushDx, pushDy);
                let headOnRatio = 1.0;
                if (pushLen > 0.01 && impact > 1.0) {
                    const nx = pushDx / pushLen;
                    const ny = pushDy / pushLen;
                    const vn = this.vx * nx + this.vy * ny;
                    headOnRatio = Math.max(0, -vn / impact);
                    if (vn < 0 && headOnRatio < 0.72) {
                        // Oblique wall graze: slide smoothly along the wall tangent instead of bouncing backward!
                        this.vx = (this.vx - nx * vn) * 0.84;
                        this.vy = (this.vy - ny * vn) * 0.84;
                        this.speed = Math.hypot(this.vx, this.vy) * (this.speed >= 0 ? 1 : -1);
                        const tangentAng = Math.atan2(this.vy, this.vx);
                        if (Math.abs(this.speed) > 25 && this.speed > 0) {
                            const aDiff = this.normalizeAngle(tangentAng - this.angle);
                            if (Math.abs(aDiff) < 0.85) {
                                this.angle += aDiff * 0.28;
                            }
                        }
                    } else {
                        this.vx *= -0.32;
                        this.vy *= -0.32;
                        this.speed *= -0.32;
                    }
                } else {
                    this.vx *= -0.32;
                    this.vy *= -0.32;
                    this.speed *= -0.32;
                }
                if (this.driver && this.driver !== "PLAYER" && this.aiReverseTimer <= 0) {
                    this.aiReverseTimer = 0.85;
                    this.aiReverseSteer = Math.random() < 0.5 ? 0.9 : -0.9;
                }
                if (impact > 92 && (this.crashCooldown || 0) <= 0) {
                    this.crashCooldown = 0.45;
                    const stuntShield = ((this.stuntAirTimer || 0) > 0 || (this._stuntLandingGrace || 0) > 0) ? 0.25 : 1.0;
                    const dmgScale = (0.35 + 0.65 * headOnRatio) * stuntShield;
                    this.receiveImpactDamage(Math.max(4.6, (impact - 80) * (this.driver === "PLAYER" ? 0.095 : 0.068) * dmgScale), hitX, hitY, false, game);
                    if (this.driver === "PLAYER") {
                        if (this.specKey !== "BMX_BIKE") {
                            game.spawnParticle(hitX, hitY, "SPARK");
                        }
                        if (game && game.audio) {
                            game.audio.playCarCrash(Math.min(1.5, Math.max(0.42, (impact - 80) / 145) * (0.45 + 0.55 * headOnRatio)), this.specKey);
                        }
                    }
                }
            }
        }
        // Dragging crooked front/rear bumper emits occasional scraping sparks at high speed!
        if (this.hangingBumperMask && Math.abs(this.speed || 0) > 95 && game && typeof game.spawnParticle === "function" && Math.random() < 0.20) {
            const dragFront = Boolean(this.hangingBumperMask & CAR_DETACH_PART.FRONT_BUMPER);
            const dragSign = dragFront ? 1 : -1;
            const bSide = this.hangingBumperSide || 1;
            const sx = this.x + Math.cos(this.angle) * ((this.w || 58) * 0.46 * dragSign) - Math.sin(this.angle) * ((this.h || 26) * 0.40 * bSide);
            const sy = this.y + Math.sin(this.angle) * ((this.w || 58) * 0.46 * dragSign) + Math.cos(this.angle) * ((this.h || 26) * 0.40 * bSide);
            game.spawnParticle(sx, sy, "SPARK");
        }
        if (typeof map.getHeightAtPixel === "function") {
            const onWater = Boolean(this.waterOnly || this.specKey === "AIRBOAT" || (this.amphibious && map.isWaterAtPixel && map.isWaterAtPixel(this.x, this.y)));
            this.z = onWater
                ? Math.max(2.0, map.getHeightAtPixel(this.x, this.y, curZ, false))
                : map.getHeightAtPixel(this.x, this.y, curZ);
        }
        this.emitWheelTracks(map, game);
    }

    getSurfaceTrackStyle(x, y, map, isDrifting) {
        if (!map || map.isWaterAtPixel(x, y)) return null;
        const tile = map.getTileAtPixel(x, y);
        const gt = typeof map.getGroundTypeAt === "function" ? map.getGroundTypeAt(x, y) : 0;
        if (tile === TILE.SAND) {
            return {
                surface: "SAND",
                r: 0.74,
                g: 0.67,
                b: 0.54,
                alpha: 0.44,
                maxLife: 19.0
            };
        }
        if (tile === TILE.SWAMP_MUD) {
            return {
                surface: "MUD",
                r: 0.19,
                g: 0.14,
                b: 0.08,
                alpha: 0.64,
                maxLife: 21.0
            };
        }
        if (tile === TILE.GRASS || gt === GROUND_TYPE.FIELD) {
            return {
                surface: "GRASS",
                r: 0.13,
                g: 0.25,
                b: 0.10,
                alpha: 0.56,
                maxLife: 18.0
            };
        }
        if (isDrifting) {
            return {
                surface: "ROAD",
                r: 0.07,
                g: 0.07,
                b: 0.09,
                alpha: 0.48,
                maxLife: 8.0
            };
        }
        return null;
    }

    emitWheelTracks(map, game) {
        if (!map || !game || typeof game.addSkidmark !== "function") return;
        if (this.specKey === "AIRBOAT" || this.waterOnly || (this.stuntAirTimer || 0) > 0) return;
        if (map.isWaterAtPixel(this.x, this.y)) return;

        const curSpeed = Math.hypot(this.vx, this.vy);
        if (curSpeed < 10) return;

        const fx = Math.cos(this.angle);
        const fy = Math.sin(this.angle);
        const rx = -fy;
        const ry = fx;

        // Check if left/right tires roll through a fresh corpse blood puddle:
        // Distance-based per-side wheel staining (~108..122px = ~1.8 car lengths, independent of speed!)
        const MAX_BLOOD_ROLL_PX = 116.0;
        let stainedInPuddleNow = false;
        if (game && Array.isArray(game.peds) && (this.driver === "PLAYER" || (game.player && Math.abs(this.x - game.player.x) < 640))) {
            const halfSpan = Math.max(15, (this.w || 56) * 0.42);
            const halfLat = Math.max(11, (this.h || 26) * 0.50);
            for (let pi = 0; pi < game.peds.length; pi++) {
                const cp = game.peds[pi];
                if (!cp || !cp.dead || (cp.deadTimer || 0) >= 32) continue;
                const cdx = cp.x - this.x;
                const cdy = cp.y - this.y;
                if (Math.abs(cdx) > halfSpan + 10 || Math.abs(cdy) > halfSpan + 10) continue;
                const cAlong = Math.abs(cdx * fx + cdy * fy);
                const cLat = cdx * rx + cdy * ry;
                if (cAlong < halfSpan && Math.abs(cLat) < halfLat) {
                    if (cLat <= 5.5) this._bloodDistLeft = MAX_BLOOD_ROLL_PX * (0.92 + ((pi * 17) % 5) * 0.03);
                    if (cLat >= -5.5) this._bloodDistRight = MAX_BLOOD_ROLL_PX * (0.94 + ((pi * 23) % 5) * 0.03);
                    stainedInPuddleNow = true;
                    break;
                }
            }
        }

        // Distance-gate track segments so marks form crisp tire-tread imprints regardless of framerate
        const stepDist = 5.0;
        const moved = this._lastTrackX === undefined
            ? 999
            : Math.hypot(this.x - this._lastTrackX, this.y - this._lastTrackY);
        if (moved < stepDist) return;
        this._lastTrackX = this.x;
        this._lastTrackY = this.y;

        if (!stainedInPuddleNow) {
            const rollDecay = Math.min(18.0, moved);
            if ((this._bloodDistLeft || 0) > 0) this._bloodDistLeft = Math.max(0, this._bloodDistLeft - rollDecay);
            if ((this._bloodDistRight || 0) > 0) this._bloodDistRight = Math.max(0, this._bloodDistRight - rollDecay);
        }
        const maxBloodDist = Math.max(this._bloodDistLeft || 0, this._bloodDistRight || 0);
        this._bloodyTiresTimer = maxBloodDist / 45.0;
        this._bloodStepSeq = ((this._bloodStepSeq || 0) + 1) & 1023;

        const hasBloodTires = maxBloodDist > 0;
        const baseTerrainStyle = this.getSurfaceTrackStyle(this.x, this.y, map, Boolean(this.drifting));
        if (!hasBloodTires && !baseTerrainStyle) return;

        const frontAng = this.angle + (this.steerAngleRad || 0) * 0.68;
        const rearAng = this.angle;
        const vz = this.z !== undefined ? this.z : 2.0;
        const isOffroad = Boolean(baseTerrainStyle && baseTerrainStyle.surface !== "ROAD");

        // Emit golden sand-spray or drift tire-smoke puffs behind rear tires (GTA 6 Vice Beach & Street Drift vibe)
        if (game && Array.isArray(game.particles) && (this.driver === "PLAYER" || (game.player && Math.abs(this.x - game.player.x) < 620))) {
            const onBeachSand = (baseTerrainStyle && baseTerrainStyle.surface === "SAND") || (typeof TILE !== "undefined" && map.getTileAtPixel && map.getTileAtPixel(this.x, this.y) === TILE.SAND);
            if (onBeachSand && curSpeed > 58 && game.particles.length < 220) {
                const spX = this.x - fx * ((this.w || 48) * 0.42) + (Math.random() - 0.5) * 10;
                const spY = this.y - fy * ((this.w || 48) * 0.42) + (Math.random() - 0.5) * 10;
                game.particles.push({
                    x: spX,
                    y: spY,
                    vx: -this.vx * 0.18 + (Math.random() - 0.5) * 28,
                    vy: -this.vy * 0.18 + (Math.random() - 0.5) * 28,
                    size: 4.5 + Math.random() * 3.5,
                    color: "#e6c687",
                    life: 0.34,
                    maxLife: 0.34
                });
            } else if (this.drifting && curSpeed > 82 && game.particles.length < 220) {
                const smX = this.x - fx * ((this.w || 48) * 0.40) + (Math.random() - 0.5) * 12;
                const smY = this.y - fy * ((this.w || 48) * 0.40) + (Math.random() - 0.5) * 12;
                game.particles.push({
                    x: smX,
                    y: smY,
                    vx: -this.vx * 0.12 + (Math.random() - 0.5) * 22,
                    vy: -this.vy * 0.12 + (Math.random() - 0.5) * 22,
                    size: 5.5 + Math.random() * 4.5,
                    color: "#cbd5e1",
                    life: 0.38,
                    maxLife: 0.38
                });
            }
        }

        const pushWheelMark = (wx, wy, ang, segLen, tireWidth, alphaMult = 1.0, sideSign = 0) => {
            const sideBloodDist = sideSign < 0
                ? (this._bloodDistLeft || 0)
                : (sideSign > 0 ? (this._bloodDistRight || 0) : maxBloodDist);
            if (sideBloodDist > 0) {
                const wetness = Math.max(0, Math.min(1, sideBloodDist / MAX_BLOOD_ROLL_PX));
                // As the tire dries out (< 34% wetness), skip intermittent tread lugs so the trail breaks up organically instead of cutting off flat!
                const seq = this._bloodStepSeq + (sideSign > 0 ? 3 : 0);
                if (wetness < 0.16 && (seq % 3) !== 0) return;
                if (wetness < 0.34 && (seq % 2) === 1) return;

                // Deep arterial crimson while wet -> darker coagulated maroon mixed with tire rubber as it dries
                const br = 0.34 + wetness * 0.28;
                const bg = 0.02 + wetness * 0.025;
                const bb = 0.04 + wetness * 0.035;
                const bAlpha = Math.min(0.84, (0.14 + Math.pow(wetness, 0.85) * 0.66) * alphaMult);
                const wScale = 0.78 + wetness * 0.34;
                game.addSkidmark(wx, wy, {
                    z: vz,
                    angle: ang,
                    w: segLen * wScale,
                    h: tireWidth * (0.82 + wetness * 0.28),
                    r: br,
                    g: bg,
                    b: bb,
                    alpha: bAlpha,
                    life: 9.5,
                    maxLife: 9.5,
                    surface: "BLOOD",
                    variant: 0
                });
                // Fresh puddle exit (> 68% wet): fling subtle organic blood splatter droplets beside the spinning tire!
                if (wetness > 0.68 && (seq % 2) === 0) {
                    const flingSide = (sideSign || 1) * (2.6 + (seq % 3) * 1.1);
                    game.addSkidmark(wx + rx * flingSide, wy + ry * flingSide, {
                        z: vz,
                        angle: ang + 0.6,
                        w: 3.2 + wetness * 1.4,
                        h: 3.0,
                        r: 0.56,
                        g: 0.03,
                        b: 0.05,
                        alpha: bAlpha * 0.78,
                        life: 8.0,
                        maxLife: 8.0,
                        surface: "BLOOD",
                        variant: 1
                    });
                }
                return;
            }
            const wStyle = this.getSurfaceTrackStyle(wx, wy, map, Boolean(this.drifting)) || baseTerrainStyle;
            if (!wStyle) return;
            game.addSkidmark(wx, wy, {
                z: vz,
                angle: ang,
                w: segLen,
                h: tireWidth,
                r: wStyle.r,
                g: wStyle.g,
                b: wStyle.b,
                alpha: Math.min(0.82, wStyle.alpha * alphaMult),
                life: wStyle.maxLife,
                maxLife: wStyle.maxLife,
                surface: wStyle.surface
            });
        };

        // 1) 2-Wheelers (Motorcycles, Scooters, BMX): 2 inline wheels (front steered + rear drive)
        if (this.isMotorcycle) {
            const tireW = (this.specKey === "BMX_BIKE" || this.specKey === "E_SCOOTER") ? 1.8 : 2.4;
            const rearX = this.x + fx * this.rearTireOffset;
            const rearY = this.y + fy * this.rearTireOffset;
            pushWheelMark(rearX, rearY, rearAng, 6.8, tireW, 1.0, 0);
            if (isOffroad || hasBloodTires) {
                const frontX = this.x + fx * this.frontTireOffset;
                const frontY = this.y + fy * this.frontTireOffset;
                pushWheelMark(frontX, frontY, frontAng, 6.4, tireW * 0.92, 0.82, 0);
            }
            return;
        }

        // 2) Tracked Armored Tank: 2 wide heavy caterpillar treads
        if (this.isTank || this.specKey === "PANZER_TANK") {
            const latOff = Math.max(9.5, (this.h || 28) * 0.38);
            for (const side of [-1, 1]) {
                const tx = this.x + rx * (latOff * side);
                const ty = this.y + ry * (latOff * side);
                pushWheelMark(tx, ty, rearAng, 8.2, 5.4, 1.2, side);
            }
            return;
        }

        // 3) 6-Wheel / Multi-Axle Heavy Trucks, Buses, Armored Vans & Stretch Limos (3 axles / dual rear tires)
        const isSixWheeler = Boolean(
            this.isHeavyVehicle ||
            this.specKey === "FLATBED_TRUCK" ||
            this.specKey === "TANKER_RIG" ||
            this.specKey === "CITY_BUS" ||
            this.specKey === "TOUR_COACH" ||
            this.specKey === "SWAT_ENFORCER" ||
            this.specKey === "BRINKS_TRUCK" ||
            this.specKey === "FIRE_TRUCK" ||
            this.specKey === "STRETCH_LIMO"
        );
        const latOff = Math.max(6.8, (this.h || 22) * 0.38);

        if (isSixWheeler) {
            const frontOff = this.frontTireOffset;
            const midRearOff = this.rearTireOffset * 0.56;
            const backRearOff = this.rearTireOffset * 1.04;
            for (const side of [-1, 1]) {
                // Rear dual-wheel tandem axle 1 (outer dual)
                pushWheelMark(
                    this.x + fx * backRearOff + rx * ((latOff + 0.9) * side),
                    this.y + fy * backRearOff + ry * ((latOff + 0.9) * side),
                    rearAng,
                    7.2,
                    3.8,
                    1.08,
                    side
                );
                // Rear dual-wheel tandem axle 2 (inner/mid offset)
                pushWheelMark(
                    this.x + fx * midRearOff + rx * ((latOff - 1.1) * side),
                    this.y + fy * midRearOff + ry * ((latOff - 1.1) * side),
                    rearAng,
                    7.0,
                    3.4,
                    0.96,
                    side
                );
                // Steered front axle (2 front wheels)
                if (isOffroad || hasBloodTires) {
                    pushWheelMark(
                        this.x + fx * frontOff + rx * (latOff * side),
                        this.y + fy * frontOff + ry * (latOff * side),
                        frontAng,
                        6.8,
                        3.0,
                        0.86,
                        side
                    );
                }
            }
            return;
        }

        // 4) Standard 4-Wheel Cars, Muscle Cars, Sports Cars, SUVs & 4x4s (2 front steered wheels + 2 rear drive wheels)
        const isOffroad4x4 = Boolean(
            this.specKey === "GATOR_4X4" ||
            this.specKey === "MONSTER_BUGGY" ||
            this.specKey === "PICKUP_TRUCK" ||
            this.specKey === "CAMPER_PICKUP"
        );
        const tireW = isOffroad4x4 ? 3.5 : 2.8;
        for (const side of [-1, 1]) {
            const rearX = this.x + fx * this.rearTireOffset + rx * (latOff * side);
            const rearY = this.y + fy * this.rearTireOffset + ry * (latOff * side);
            pushWheelMark(rearX, rearY, rearAng, 7.0, tireW, 1.0, side);
            if (isOffroad || hasBloodTires) {
                const frontX = this.x + fx * this.frontTireOffset + rx * (latOff * side);
                const frontY = this.y + fy * this.frontTireOffset + ry * (latOff * side);
                pushWheelMark(frontX, frontY, frontAng, 6.6, tireW * 0.94, 0.84, side);
            }
        }
    }

    computeSurfaceMultiplier(map) {
        const currentTile = map.getTileAtPixel(this.x, this.y);
        if ((currentTile === TILE.SAND || currentTile === TILE.SWAMP_MUD) && !this.amphibious && !this.waterOnly) {
            const isOffroad4x4 = Boolean(
                this.isTank ||
                this.specKey === "GATOR_4X4" ||
                this.specKey === "MONSTER_BUGGY" ||
                this.specKey === "PICKUP_TRUCK" ||
                this.specKey === "CAMPER_PICKUP" ||
                this.specKey === "SWAT_ENFORCER"
            );
            const isResponderOnSand = (this.driver === "AI_COP" || this.driver === "AI_EMERGENCY" || this.driver === "AI_TOW") && currentTile === TILE.SAND;
            return isOffroad4x4 ? 0.92 : (isResponderOnSand ? 0.88 : 0.72);
        }
        if (map.isWaterAtPixel(this.x, this.y) && !this.amphibious && !this.waterOnly) {
            this.burnTimer = 0; // water extinguishes engine fire
            return 0.22;
        }
        if (map.isWaterAtPixel(this.x, this.y)) {
            this.burnTimer = 0;
        }
        return 1.0;
    }

    /* ========================================================================
       1997 GTA 1 Vehicle::UpdateSteer (Vehicle.cpp:1058-1095)
       Front wheels steer up to ±30 deg (0.5236 rad) at 270 deg/s (4.712 rad/s),
       with 1.45x self-centering caster return when steering input is released.
       ======================================================================== */
    updateSteer(dt, steerInput) {
        const maxSteerAngle = 0.5236; // 30 degrees
        const steerRate = steerInput === 0 ? 6.83 : 4.712;
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
        const isWaterCraft = Boolean(this.waterOnly || this.specKey === "AIRBOAT");

        let forwardVel = this.vx * fx + this.vy * fy;
        let lateralVel = this.vx * rx + this.vy * ry;

        if (throttle !== 0) {
            const isBrakingAgainstMotion = (forwardVel > 12 && throttle < 0) || (forwardVel < -12 && throttle > 0);
            const brakeGain = (isBrakingAgainstMotion && !isWaterCraft) ? 1.75 : 1.0;
            forwardVel += throttle * this.accel * brakeGain * dt;
        } else {
            forwardVel *= Math.pow(isWaterCraft ? 0.42 : 0.22, dt);
        }

        if (handbrake && !isWaterCraft) {
            forwardVel *= Math.pow(0.18, dt);
        }

        if (surfaceMult < 0.3) {
            forwardVel *= Math.pow(0.12, dt);
        }

        if ((this.tirePuncturedTimer || 0) > 0) {
            this.tirePuncturedTimer = Math.max(0, this.tirePuncturedTimer - dt);
        }
        const tirePunctured = (this.tirePuncturedTimer || 0) > 0;
        const tireMult = tirePunctured ? 0.58 : 1.0;

        let aiMaxCap = 1.0;
        if (this.driver === "AI_TRAFFIC" && this.aiPanicTimer <= 0) {
            const bridgeBoost = (this._gameRef && this._gameRef.map && this._gameRef.map.bridgeMask && this._gameRef.map.bridgeMask[(Math.floor(this.y / TILE_SIZE) * MAP_COLS) + Math.floor(this.x / TILE_SIZE)] > 0) ? 1.08 : 1.0;
            aiMaxCap = Math.min(0.90, this.aiCruiseFactor * bridgeBoost);
        }
        const effectiveMax = this.maxSpeed * surfaceMult * aiMaxCap * tireMult;
        forwardVel = Math.max(-this.maxSpeed * (isWaterCraft ? 0.52 : 0.45) * tireMult, Math.min(effectiveMax, forwardVel));
        this.speed = forwardVel;

        const maxSteerAngle = 0.5236;
        const normSteer = this.steerAngleRad / maxSteerAngle;
        if (Math.abs(forwardVel) > 8) {
            const dir = forwardVel >= 0 ? 1 : -1;
            const speedFactor = isWaterCraft
                ? Math.max(0.48, Math.min(1, Math.abs(forwardVel) / 95))
                : Math.min(1, Math.abs(forwardVel) / 115);
            const driftBoost = (handbrake || tirePunctured) ? 1.34 : 1.0;
            this.angularVelocity = normSteer * this.turnSpeed * speedFactor * driftBoost * dir;
            this.angle += this.angularVelocity * dt;
        } else if (isWaterCraft && Math.abs(normSteer) > 0.05) {
            // Marine waterjet / outboard vector thrust allows pivoting in place away from docks & shorelines!
            this.angularVelocity = normSteer * this.turnSpeed * 0.65;
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
        const tirePunctured = (this.tirePuncturedTimer || 0) > 0;
        const baseRetention = handbrake ? this.driftGrip : this.grip;
        const lateralRetention = tirePunctured ? Math.min(baseRetention, 0.35) : baseRetention;
        lateralVel *= Math.pow(1 - lateralRetention, dt * 10);

        this.drifting = (tirePunctured && Math.abs(forwardVel) > 55) || (handbrake && Math.abs(forwardVel) > 130) || Math.abs(lateralVel) > 75;
        if (tirePunctured && Math.abs(forwardVel) > 40 && game && typeof game.spawnParticle === "function" && Math.random() < 0.35) {
            game.spawnParticle(this.x - Math.cos(this.angle) * 14, this.y - Math.sin(this.angle) * 14, "SPARK");
        }
        if (this.drifting && !map.isWaterAtPixel(this.x, this.y)) {
            const tile = map.getTileAtPixel(this.x, this.y);
            const gt = typeof map.getGroundTypeAt === "function" ? map.getGroundTypeAt(this.x, this.y) : 0;
            const isSoftSurface = tile === TILE.SAND || tile === TILE.SWAMP_MUD || tile === TILE.GRASS || gt === GROUND_TYPE.FIELD;
            if (!isSoftSurface && this.driver === "PLAYER" && this.specKey !== "BMX_BIKE" && this.specKey !== "E_SCOOTER" && Math.random() < 0.25) {
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
        if (!Pedestrian._sessionTag) {
            Pedestrian._sessionTag = Math.random().toString(36).slice(2, 6);
        }
        this.id = props.id || `ped_${Pedestrian._sessionTag}_${++Pedestrian._nextId}`;
        this.x = props.x || 0;
        this.y = props.y || 0;
        this.z = props.z !== undefined ? props.z : 2.0;
        this.angle = props.angle || 0;
        const initWalkSpd = props.baseWalkSpeed !== undefined
            ? props.baseWalkSpeed
            : (props.speed !== undefined && props.speed > 0 && props.speed < 60 ? props.speed : 24);
        this.baseWalkSpeed = initWalkSpd;
        this.speed = props.speed !== undefined ? props.speed : initWalkSpd;
        this.kind = props.kind || "CIVILIAN"; // CIVILIAN, COP, MONK, HOSTILE, GATOR
        this.g24Type = props.g24Type || null;
        this.g2Remapped = Boolean(props.g2Remapped);
        this.archetype = props.archetype || null;
        this.missionTag = props.missionTag || null;
        this.isVillaGuard = Boolean(props.isVillaGuard);
        this.isAlertedGuard = Boolean(props.isAlertedGuard);
        this.guardBaseX = props.guardBaseX;
        this.guardBaseY = props.guardBaseY;
        this.monkIndex = props.monkIndex !== undefined ? props.monkIndex : 0;
        this.shirtColor = props.shirtColor || "#06b6d4";
        const defaultHp = this.kind === "COP" ? 105 : 35;
        this.hp = props.hp !== undefined ? props.hp : defaultHp;
        this.maxHp = props.maxHp !== undefined ? props.maxHp : Math.max(this.hp, defaultHp);
        this.copWeapon = props.copWeapon || null;
        this.homeCruiser = props.homeCruiser || null;
        this.homeAmbulance = props.homeAmbulance || null;
        this.homeFireTruck = props.homeFireTruck || null;
        this.carjackedCop = Boolean(props.carjackedCop);
        this.bustedGraceTimer = props.bustedGraceTimer || 0;
        this.isSwat = Boolean(props.isSwat);
        this.isReliefDriver = Boolean(props.isReliefDriver);
        this.noBoardTimer = props.noBoardTimer || 0;
        this.shootCooldown = props.shootCooldown || 0;
        this.dead = Boolean(props.dead);
        this.deadTimer = props.deadTimer || 0;
        this.revived = Boolean(props.revived);
        this.calling911Timer = props.calling911Timer || 0;
        this.calling911Stars = props.calling911Stars || 0;
        this.calling911Pos = props.calling911Pos || null;
        this.surrenderTimer = props.surrenderTimer || 0;
        this.personality = props.personality || "CAUTIOUS";
        this.panicTimer = props.panicTimer || 0;
        this.threatX = props.threatX;
        this.threatY = props.threatY;
        this.stunnedTimer = props.stunnedTimer || 0;
        this.burnTimer = props.burnTimer || 0;
        this.exitAnimTimer = props.exitAnimTimer || 0;
        this.slideCarTimer = props.slideCarTimer || 0;
        this.turnSeed = props.turnSeed !== undefined ? props.turnSeed : (Math.floor(Math.random() * 16) + 1);
        this.targetBx = props.targetBx !== undefined ? props.targetBx : null;
        this.targetBy = props.targetBy !== undefined ? props.targetBy : null;
        this.animSeed = props.animSeed !== undefined ? props.animSeed : ((this.x + this.y) * 0.01);
        this.hasDog = props.hasDog !== undefined ? Boolean(props.hasDog) : undefined;
        this.dogBreed = props.dogBreed || null;
        this.state = this.computeState();
    }

    /* ========================================================================
       PedestrianStatesManager::GetCurrentStateID (PedestrianStates.cpp)
       ======================================================================== */
    computeState() {
        if (this.dead) return PED_STATE.DEAD;
        if ((this.stunnedTimer || 0) > 0) return PED_STATE.STUNNED;
        if ((this.surrenderTimer || 0) > 0) return PED_STATE.STANDING_STILL;
        if ((this.exitAnimTimer || 0) > 0) return PED_STATE.EXITING_CAR;
        if ((this.slideCarTimer || 0) > 0) return PED_STATE.SLIDE_ON_CAR;
        if ((this.panicTimer || 0) > 0 || (this.burnTimer || 0) > 0 || this.kind === "COP" || this.kind === "HOSTILE") {
            return PED_STATE.RUNS;
        }
        if (
            this.waitingAtCrosswalk ||
            (this.socialTimer || 0) > 0 ||
            (this.hangoutTimer || 0) > 0 ||
            ((this.hailingTaxiTimer || 0) > 0 && this._hailingTaxi && Math.abs(this._hailingTaxi.speed || 0) >= 12)
        ) {
            return PED_STATE.STANDING_STILL;
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
Pedestrian._nextId = 1;

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
        const isMobile = typeof window !== "undefined" && (
            window.innerWidth <= 960 ||
            window.innerHeight <= 560 ||
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
        );
        this.isMobile = isMobile;
        this.genCarsCooldown = isMobile ? 0.72 : 0.55;
        this.genPedsCooldown = isMobile ? 0.32 : 0.12;
        this.maxTrafficCars = isMobile ? 16 : 22;
        this.maxTrafficPeds = isMobile ? 76 : 124;
        this.carsMaxDistanceBlocks = isMobile ? 6 : 8; // mTrafficGenCarsMaxDistance
        this.pedsMaxDistanceBlocks = isMobile ? 7 : 9; // mTrafficGenPedsMaxDistance
        this._spawnPlayerCursor = 0;
        this._trafficSeq = 1;
    }

    chooseDistrictPedSpec(bx, by, isSand = false, map = null, seed = 0) {
        const inPrisonYard = (bx >= 57 && bx <= 67 && by >= 77 && by <= 145);
        if (inPrisonYard) {
            if ((seed % 5) === 0) {
                return { kind: "COP", g24Type: "police", missionTag: "PRISON_GUARD", copWeapon: "SHOTGUN", shirtColor: "#1e3a8a", hp: 110, speed: 26 };
            }
            return { kind: "CIVILIAN", g24Type: "g2_prisoner", g2Remapped: true, missionTag: "PRISONER", shirtColor: "#ff6608", hp: 45, speed: 23 };
        }

        const r1 = ((bx * 73856093) ^ (by * 19349663) ^ (seed * 83492791)) >>> 0;
        const r2 = (((r1 >>> 7) ^ (bx * 2654435761) ^ (by * 2246822519) ^ (seed * 3266489917)) >>> 0);
        const pickFrom = (arr) => arr[r1 % arr.length];

        const decoratePedSpec = (spec) => {
            const gt = spec.g24Type || "civ0";
            if (gt === "vc_jogger" || spec.isJogger) {
                spec.isJogger = true;
                spec.speed = Math.max(spec.speed || 0, 39 + (r2 % 6));
                if (!spec.carryProp) spec.carryProp = "JOGGER_GEAR";
            }
            if (!spec.isJogger && !spec.isRollerblader && !spec.isChild && !isSand && (
                gt === "kid_skater" ||
                ((gt === "beach_guy_lime" || gt === "beach_guy_yellow" || gt === "surfer_guy" || gt === "g2_civ_redtee" || gt === "g2_civ_blueshorts") && (r2 % 4) === 1)
            )) {
                spec.isSkateboarder = true;
                spec.speed = 42 + (r2 % 5);
            } else if (
                !spec.isJogger && !spec.isRollerblader && !spec.isSkateboarder && !spec.isChild && !isSand &&
                bx >= 424 && bx <= 449 &&
                (gt === "bikini_cyan" || gt === "bikini_pink" || gt === "g2_civ_pink" || gt === "g2_civ_aqua" || gt === "vc_tourist") &&
                (r2 % 5) === 2
            ) {
                spec.isRollerblader = true;
                spec.speed = 46 + (r2 % 6);
            }
            if (!spec.carryProp && !spec.isRollerblader && !spec.isSkateboarder && !spec.isChild) {
                if (gt === "surfer_guy" && (r2 % 2) === 0) {
                    spec.carryProp = "SURFBOARD";
                } else if ((gt === "beach_guy_red" || gt === "beach_guy_yellow" || gt === "beach_guy_lime") && (r2 % 3) === 0) {
                    spec.carryProp = (r2 % 2 === 0) ? "BOOMBOX" : "BEACH_COOLER";
                } else if ((gt === "g2_zaibatsu" || gt === "g2_yakuza" || gt === "g2_civ_greysuit" || gt === "vc_crockett") && (r2 % 2) === 0) {
                    spec.carryProp = "BRIEFCASE";
                } else if ((gt === "g2_scientist" || gt === "dockworker_orange") && (r2 % 2) === 0) {
                    spec.carryProp = "CLIPBOARD";
                } else if ((gt === "g2_civ_pink" || gt === "g2_civ_lilac" || gt === "g2_civ_burgundy" || gt === "bikini_white" || gt === "bikini_cyan") && (r2 % 3) === 0) {
                    spec.carryProp = "SHOPPING_BAG";
                } else if ((gt === "vc_tourist" || gt === "vc_hawaiian_red" || gt === "bikini_pink") && (r2 % 3) === 0) {
                    spec.carryProp = "CAMERA";
                } else if ((gt === "g2_civ_yellowtee" || gt === "g2_civ_redtee") && (r2 % 3) === 1) {
                    spec.carryProp = "PIZZA_STACK";
                } else if ((gt === "vc_cuban" || gt === "g2_civ_aqua" || gt === "vc_tommy") && (r2 % 3) === 1) {
                    spec.carryProp = "COFFEE_CUP";
                } else if ((gt === "vc_haitian" || gt === "gang") && (r2 % 3) === 0) {
                    spec.carryProp = "BOOMBOX";
                }
            }
            if (spec.hasDog === undefined && spec.kind === "CIVILIAN" && !spec.isRollerblader && !spec.isSkateboarder && !spec.isChild && !isSand && spec.missionTag !== "PRISONER") {
                if ((r2 % 11) === 3) {
                    const dogBreeds = ["GOLDEN", "FRENCHIE", "DALMATIAN", "DOBERMAN"];
                    spec.hasDog = true;
                    spec.dogBreed = dogBreeds[(r2 >>> 4) % dogBreeds.length];
                } else {
                    spec.hasDog = false;
                }
            }
            if (!spec.personality) {
                if (gt === "g2_russian" || gt === "vc_haitian" || gt === "vc_cuban" || gt === "gang" || gt === "g2_mugger" || gt === "g2_redneck_red") {
                    spec.personality = (r1 % 3) === 0 ? "BRAVE" : "STREET";
                } else if (gt === "vc_tourist" || gt === "vc_hawaiian_red" || spec.carryProp === "CAMERA") {
                    spec.personality = "TOURIST";
                } else if (spec.carryProp === "SHOPPING_BAG" || gt === "g2_civ_pink" || gt === "g2_civ_lilac") {
                    spec.personality = "SHOPPER";
                } else {
                    spec.personality = "CAUTIOUS";
                }
            }
            return spec;
        };

        // 1. Vice Beach Golden Sand Strollers, Bikini Beachgoers, Joggers, Shirtless Surfers & Bodybuilders
        if (isSand || (bx >= 450 && bx <= 484 && by >= 46 && by <= 375)) {
            const beachPool = [
                "bikini_pink", "bikini_cyan", "bikini_yellow", "bikini_red", "bikini_white",
                "surfer_guy", "beach_guy_red", "beach_guy_yellow", "beach_guy_lime",
                "vc_bodybuilder", "vc_jogger", "vc_jogger", "kid_beach", "kid_girl_pink"
            ];
            const gType = pickFrom(beachPool);
            const isChild = gType.startsWith("kid_");
            const isJogger = (gType === "vc_jogger") || (!isChild && (r1 % 7) === 0);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                missionTag: "BEACH",
                shirtColor: "#f472b6",
                hp: 35,
                speed: isJogger ? (39 + (r1 % 5)) : (isChild ? 22 : (22 + (r1 % 5))),
                isJogger,
                isChild
            });
        }

        // 1B. SERA Spaceport & Cape Leonida Launch Complex (bx >= 415, by <= 45)
        if (bx >= 415 && by <= 45) {
            const spaceportPool = [
                "g2_scientist", "g2_scientist", "g2_zaibatsu", "dockworker_orange",
                "dockworker_yellow", "g2_civ_greysuit", "vc_tourist"
            ];
            const gType = pickFrom(spaceportPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#e2e8f0",
                hp: 42,
                speed: 23 + (r1 % 5)
            });
        }

        // 2. Lummus Park Ocean Drive Promenade (c = 447..464): Rollerbladers, Skateboarders, Joggers & Bikini Promenaders
        if (bx >= 447 && bx <= 464 && by >= 44 && by <= 362) {
            const skatePool = [
                "bikini_pink", "bikini_cyan", "bikini_yellow", "bikini_red", "bikini_white",
                "surfer_guy", "beach_guy_red", "beach_guy_yellow", "beach_guy_lime",
                "vc_jogger", "vc_jogger", "vc_bodybuilder", "kid_skater"
            ];
            const gType = pickFrom(skatePool);
            const isRollerblader = bx === 448 && ((r1 % 10) < 4 || gType === "kid_skater");
            const isChild = gType.startsWith("kid_");
            const isJogger = !isRollerblader && !isChild && (gType === "vc_jogger" || (r1 % 5) === 0);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#00f0ff",
                hp: 35,
                speed: isRollerblader ? (45 + (r1 % 7)) : (isJogger ? (40 + (r1 % 5)) : (23 + (r1 % 5))),
                isRollerblader,
                isJogger,
                isChild
            });
        }

        // 3. Ocean Drive, Lummus Curbside, South Beach & Espanola Way (bx = 408..450, by = 40..370)
        if (bx >= 408 && bx <= 450 && by >= 40 && by <= 370) {
            const oceanDrivePool = [
                "bikini_pink", "bikini_cyan", "bikini_yellow", "bikini_red", "bikini_white",
                "surfer_guy", "beach_guy_red", "beach_guy_yellow", "beach_guy_lime",
                "vc_jogger", "vc_jogger", "vc_bodybuilder", "vc_tourist", "g2_civ_blueshorts",
                "g2_civ_yellowtee", "g2_civ_redtee", "vc_tommy", "vc_crockett",
                "kid_beach", "kid_girl_pink"
            ];
            const gType = pickFrom(oceanDrivePool);
            const isRollerblader = (bx === 448 && (r1 % 5) === 0);
            const isChild = gType.startsWith("kid_");
            const isJogger = !isRollerblader && !isChild && (gType === "vc_jogger" || (r1 % 6) === 0);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#ff2a85",
                hp: 35,
                speed: isRollerblader ? 46 : (isJogger ? (40 + (r1 % 5)) : (isChild ? 22 : (22 + (r1 % 6)))),
                isRollerblader,
                isJogger,
                isChild
            });
        }

        // 4. Little Cuba / Calle Ocho (bx = 255..325, by = 215..292)
        if (bx >= 255 && bx <= 325 && by >= 215 && by <= 292) {
            const cubaPool = [
                "vc_cuban", "vc_cuban", "vc_cuban", "vc_hawaiian_red",
                "vc_tourist", "g2_civ_aqua", "g2_civ_redtee", "g2_civ_yellowtee",
                "g2_civ_burgundy", "g2_civ_granny", "civ0", "civ1"
            ];
            const gType = pickFrom(cubaPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#f59e0b",
                hp: 38,
                speed: gType === "g2_civ_granny" ? 19 : (22 + (r1 % 6))
            });
        }

        // 5. Wynwood Walls, Little Haiti & Club Jack of Hearts (bx = 165..265, by = 92..212)
        if (bx >= 165 && bx <= 265 && by >= 92 && by <= 212) {
            const wynwoodPool = [
                "vc_haitian", "vc_haitian", "vc_cuban", "gang",
                "g2_russian", "vc_tourist", "g2_civ_pink", "g2_civ_lilac",
                "g2_civ_redtee", "g2_civ_darkgreen", "civ1", "civ2"
            ];
            const gType = pickFrom(wynwoodPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#a855f7",
                hp: 38,
                speed: 22 + (r1 % 6)
            });
        }

        // 6. Star Island & Venetian Isles Luxury Archipelago (bx = 328..407, by = 118..215)
        if (bx >= 328 && bx <= 407 && by >= 118 && by <= 215) {
            const starPool = [
                "bikini_white", "bikini_pink", "bikini_cyan", "vc_crockett",
                "vc_tubbs", "vc_tommy", "vc_tourist", "vc_jogger", "vc_sailor",
                "g2_zaibatsu", "g2_civ_aqua", "g2_civ_pink", "g2_civ_lilac"
            ];
            const gType = pickFrom(starPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#38bdf8",
                hp: 35,
                speed: gType === "vc_jogger" ? (38 + (r1 % 5)) : (23 + (r1 % 5))
            });
        }

        // 7. Leonida Keys Tropical Islands (by >= 400)
        if (by >= 400) {
            const keysPool = [
                "vc_tourist", "surfer_guy", "vc_sailor", "bikini_cyan", "bikini_yellow",
                "bikini_pink", "vc_hawaiian_red", "g2_civ_blueshorts", "g2_civ_yellowtee", "g2_civ_aqua"
            ];
            const gType = pickFrom(keysPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#2dd4bf",
                hp: 35,
                speed: 22 + (r1 % 6)
            });
        }

        // 7B. Port of Vice City (bx = 328..363, by = 298..338), Port Gellhorn Docks (bx = 36..88, by = 201..265) & Allied Sugar Refinery (bx = 138..168, by = 96..132)
        if (
            (bx >= 328 && bx <= 363 && by >= 298 && by <= 338) ||
            (bx >= 36 && bx <= 88 && by >= 201 && by <= 265) ||
            (bx >= 138 && bx <= 168 && by >= 96 && by <= 132)
        ) {
            const portWorkerPool = [
                "dockworker_yellow", "dockworker_orange", "dockworker_yellow", "dockworker_orange",
                "dockworker_yellow", "dockworker_orange", "dockworker_yellow", "vc_sailor"
            ];
            const gType = pickFrom(portWorkerPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: gType === "dockworker_orange" ? "#f97316" : "#eab308",
                hp: 45,
                speed: 23 + (r1 % 5)
            });
        }

        // 7C. Port Gellhorn Town, Thrillbilly Mud Park, Grassrivers & Mount Kalaga Frontier (bx <= 155)
        if (bx <= 155) {
            const frontierPool = [
                "g2_redneck_red", "g2_redneck_blond", "g2_redneck_red", "g2_russian",
                "dockworker_yellow", "vc_sailor", "g2_civ_blueshorts", "g2_civ_darkgreen",
                "g2_civ_redtee", "vc_tourist"
            ];
            const gType = pickFrom(frontierPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#d97706",
                hp: 42,
                speed: 22 + (r1 % 6)
            });
        }

        // 7D. Downtown Financial & Civic High-Rise District (bx = 265..345, by = 105..214)
        if (bx >= 265 && bx <= 345 && by >= 105 && by <= 214) {
            const downtownExecPool = [
                "g2_zaibatsu", "g2_yakuza", "g2_civ_greysuit", "g2_civ_burgundy",
                "g2_civ_lilac", "vc_crockett", "vc_tubbs", "vc_tourist",
                "vc_jogger", "g2_civ_aqua", "g2_civ_pink", "civ0", "civ2"
            ];
            const gType = pickFrom(downtownExecPool);
            return decoratePedSpec({
                kind: "CIVILIAN",
                g24Type: gType,
                shirtColor: "#475569",
                hp: 38,
                speed: gType === "vc_jogger" ? (38 + (r1 % 5)) : (23 + (r1 % 5))
            });
        }

        // 8. General Vice City Mainland & Boulevards
        const cityPool = [
            "civ0", "civ1", "civ2", "civ3", "vc_tourist", "vc_jogger",
            "vc_crockett", "vc_tubbs", "vc_hawaiian_red", "g2_civ_aqua",
            "g2_civ_pink", "g2_civ_redtee", "g2_civ_blueshorts", "g2_civ_yellowtee",
            "g2_civ_lilac", "g2_civ_burgundy", "g2_civ_greysuit", "g2_civ_darkgreen",
            "vc_cuban", "vc_haitian"
        ];
        const gType = pickFrom(cityPool);
        return decoratePedSpec({
            kind: "CIVILIAN",
            g24Type: gType,
            shirtColor: "#06b6d4",
            hp: 35,
            speed: gType === "vc_jogger" ? (38 + (r1 % 5)) : (22 + (r1 % 6))
        });
    }

    /* ========================================================================
       REALISTIC PEDESTRIAN SOCIAL FORMATIONS (SOLO, COUPLE, FAMILY, FRIEND_GROUP, HANGOUT_CIRCLE)
       Spawns cohesive social units together at creation time with shared formationId
       and district-matched sprites.
       ======================================================================== */
    chooseFormationRoster(bx, by, isSand = false, inPrisonYard = false, map = null, seed = 0) {
        const r = ((bx * 73856093) ^ (by * 19349663) ^ (seed * 83492791)) >>> 0;
        if (inPrisonYard) {
            const single = (seed % 5 === 0)
                ? { kind: "COP", g24Type: "police", missionTag: "PRISON_GUARD", copWeapon: "SHOTGUN", shirtColor: "#1e3a8a", hp: 110, speed: 26 }
                : { kind: "CIVILIAN", g24Type: "g2_prisoner", g2Remapped: true, missionTag: "PRISONER", shirtColor: "#ff6608", hp: 45, speed: 23 };
            return { type: "SOLO", members: [single] };
        }

        const isBeach = isSand || (bx >= 450 && bx <= 484 && by >= 46 && by <= 375);
        const isSpaceport = bx >= 415 && by <= 45;
        const isBoardwalk = (bx >= 447 && bx <= 464) && by >= 44 && by <= 362;
        const isOceanDrive = bx >= 408 && bx <= 450 && by >= 40 && by <= 370;
        const isCuba = bx >= 255 && bx <= 325 && by >= 215 && by <= 292;
        const isWynwood = bx >= 165 && bx <= 265 && by >= 92 && by <= 212;
        const isStarIsland = bx >= 328 && bx <= 407 && by >= 118 && by <= 215;
        const isDowntown = bx >= 265 && bx <= 345 && by >= 105 && by <= 214;
        const isFrontier = bx <= 155;
        const isIndustrial =
            (bx >= 328 && bx <= 363 && by >= 298 && by <= 338) ||
            (bx >= 36 && bx <= 88 && by >= 201 && by <= 265) ||
            (bx >= 138 && bx <= 168 && by >= 96 && by <= 132);

        const roll = r % 100;
        let formType = "SOLO";
        if (isIndustrial || isSpaceport) {
            formType = roll < 68 ? "SOLO" : "COUPLE";
        } else if (isBoardwalk) {
            formType = roll < 62 ? "SOLO" : (roll < 86 ? "COUPLE" : (roll < 95 ? "FRIEND_GROUP" : "FAMILY"));
        } else {
            // 60% SOLO, 24% COUPLE, 8% FAMILY, 8% FRIEND_GROUP (all walking naturally along the sidewalk — no frozen hangout clusters!)
            if (roll < 60) formType = "SOLO";
            else if (roll < 84) formType = "COUPLE";
            else if (roll < 92) formType = "FAMILY";
            else formType = "FRIEND_GROUP";
        }

        if (formType === "SOLO") {
            return {
                type: "SOLO",
                members: [this.chooseDistrictPedSpec(bx, by, isSand, map, seed)]
            };
        }

        if (formType === "COUPLE") {
            let pairs;
            if (isSpaceport) {
                pairs = [
                    ["g2_scientist", "g2_scientist"],
                    ["g2_zaibatsu", "g2_scientist"],
                    ["dockworker_orange", "dockworker_yellow"]
                ];
            } else if (isIndustrial) {
                pairs = [
                    ["dockworker_yellow", "dockworker_orange"],
                    ["dockworker_yellow", "vc_sailor"]
                ];
            } else if (isBeach || isBoardwalk) {
                pairs = [
                    ["surfer_guy", "bikini_pink"],
                    ["beach_guy_red", "bikini_cyan"],
                    ["beach_guy_yellow", "bikini_yellow"],
                    ["beach_guy_lime", "bikini_white"],
                    ["vc_bodybuilder", "bikini_red"],
                    ["vc_jogger", "bikini_pink"]
                ];
            } else if (isOceanDrive || isStarIsland) {
                pairs = [
                    ["surfer_guy", "bikini_pink"],
                    ["beach_guy_red", "bikini_white"],
                    ["beach_guy_yellow", "bikini_cyan"],
                    ["beach_guy_lime", "bikini_yellow"],
                    ["vc_bodybuilder", "bikini_red"],
                    ["vc_tourist", "bikini_pink"],
                    ["vc_crockett", "bikini_cyan"]
                ];
            } else if (isCuba) {
                pairs = [
                    ["vc_cuban", "g2_civ_pink"],
                    ["vc_cuban", "g2_civ_burgundy"],
                    ["vc_hawaiian_red", "g2_civ_aqua"],
                    ["vc_cuban", "g2_civ_granny"]
                ];
            } else if (isWynwood) {
                pairs = [
                    ["vc_haitian", "g2_civ_pink"],
                    ["gang", "g2_civ_lilac"],
                    ["g2_russian", "g2_civ_redtee"],
                    ["vc_cuban", "civ2"]
                ];
            } else if (isFrontier) {
                pairs = [
                    ["g2_redneck_red", "g2_redneck_blond"],
                    ["g2_russian", "g2_redneck_red"],
                    ["dockworker_yellow", "g2_civ_blueshorts"]
                ];
            } else if (isDowntown) {
                pairs = [
                    ["g2_zaibatsu", "g2_civ_greysuit"],
                    ["g2_yakuza", "g2_civ_lilac"],
                    ["vc_crockett", "vc_tubbs"],
                    ["g2_civ_greysuit", "g2_civ_burgundy"]
                ];
            } else {
                pairs = [
                    ["civ0", "g2_civ_pink"],
                    ["vc_crockett", "g2_civ_aqua"],
                    ["vc_tourist", "g2_civ_lilac"],
                    ["vc_tommy", "bikini_white"],
                    ["g2_civ_redtee", "g2_civ_yellowtee"]
                ];
            }
            const pair = pairs[(r >>> 3) % pairs.length];
            const isJoggingDuo = (pair[0] === "vc_jogger" || pair[1] === "vc_jogger" || ((isBeach || isBoardwalk || isOceanDrive || isStarIsland) && (r % 5) === 0));
            const sharedSpeed = isJoggingDuo ? (39 + (r % 5)) : (23 + (r % 4));
            const tag = isBeach ? "BEACH" : undefined;
            return {
                type: "COUPLE",
                members: [
                    {
                        kind: "CIVILIAN",
                        g24Type: pair[0],
                        missionTag: tag,
                        shirtColor: "#38bdf8",
                        hp: 38,
                        speed: sharedSpeed,
                        isJogger: isJoggingDuo,
                        carryProp: isJoggingDuo ? "JOGGER_GEAR" : undefined,
                        formationRole: "LEADER",
                        formationFwdOff: 0,
                        formationSideOff: -6
                    },
                    {
                        kind: "CIVILIAN",
                        g24Type: pair[1],
                        missionTag: tag,
                        shirtColor: "#f472b6",
                        hp: 36,
                        speed: sharedSpeed,
                        isJogger: isJoggingDuo,
                        carryProp: isJoggingDuo ? "JOGGER_GEAR" : undefined,
                        formationRole: "COUPLE_PARTNER",
                        formationFwdOff: -6,
                        formationSideOff: 11
                    }
                ]
            };
        }

        if (formType === "FAMILY") {
            const parentPool = (isBeach || isBoardwalk || isOceanDrive)
                ? ["surfer_guy", "beach_guy_red", "beach_guy_yellow", "bikini_pink", "bikini_cyan", "bikini_white"]
                : (isCuba ? ["vc_cuban", "civ1"] : ["civ0", "civ1", "vc_tourist", "g2_civ_aqua"]);
            const childPool = isBeach
                ? ["kid_beach", "kid_girl_pink"]
                : ["kid_boy_cap", "kid_girl_pink", "kid_beach"];
            const parentType = parentPool[(r >>> 3) % parentPool.length];
            const childType = childPool[(r >>> 5) % childPool.length];
            const famSpeed = 22 + (r % 3);
            const tag = isBeach ? "BEACH" : undefined;
            const members = [
                {
                    kind: "CIVILIAN",
                    g24Type: parentType,
                    missionTag: tag,
                    shirtColor: "#06b6d4",
                    hp: 38,
                    speed: famSpeed,
                    formationRole: "LEADER",
                    formationFwdOff: 0,
                    formationSideOff: -6
                },
                {
                    kind: "CIVILIAN",
                    g24Type: childType,
                    missionTag: tag,
                    shirtColor: "#facc15",
                    hp: 32,
                    speed: famSpeed,
                    isChild: true,
                    formationRole: "FAMILY_CHILD",
                    formationFwdOff: -11,
                    formationSideOff: 10
                }
            ];
            if ((r % 3) === 0) {
                const secondParent = parentPool[((r >>> 3) + 1) % parentPool.length];
                members.push({
                    kind: "CIVILIAN",
                    g24Type: secondParent,
                    missionTag: tag,
                    shirtColor: "#f472b6",
                    hp: 36,
                    speed: famSpeed,
                    formationRole: "GROUP_FOLLOWER",
                    formationFwdOff: -23,
                    formationSideOff: -4
                });
            }
            return { type: "FAMILY", members };
        }

        if (formType === "FRIEND_GROUP") {
            let trios;
            if (isBeach || isBoardwalk || isOceanDrive) {
                trios = [
                    ["surfer_guy", "bikini_pink", "bikini_cyan"],
                    ["bikini_yellow", "bikini_pink", "bikini_white"],
                    ["beach_guy_red", "beach_guy_yellow", "bikini_red"],
                    ["vc_bodybuilder", "beach_guy_lime", "bikini_cyan"]
                ];
            } else if (isCuba) {
                trios = [
                    ["vc_cuban", "vc_cuban", "vc_hawaiian_red"],
                    ["vc_cuban", "g2_civ_aqua", "civ1"]
                ];
            } else if (isWynwood) {
                trios = [
                    ["vc_haitian", "vc_haitian", "gang"],
                    ["gang", "vc_cuban", "g2_civ_pink"]
                ];
            } else {
                trios = [
                    ["vc_tourist", "vc_hawaiian_red", "g2_civ_pink"],
                    ["vc_crockett", "vc_tubbs", "vc_tommy"],
                    ["civ0", "civ2", "g2_civ_aqua"]
                ];
            }
            const trio = trios[(r >>> 3) % trios.length];
            const grpSpeed = 23 + (r % 4);
            const tag = isBeach ? "BEACH" : undefined;
            return {
                type: "FRIEND_GROUP",
                members: [
                    {
                        kind: "CIVILIAN",
                        g24Type: trio[0],
                        missionTag: tag,
                        shirtColor: "#38bdf8",
                        hp: 38,
                        speed: grpSpeed,
                        formationRole: "LEADER",
                        formationFwdOff: 0,
                        formationSideOff: -6
                    },
                    {
                        kind: "CIVILIAN",
                        g24Type: trio[1],
                        missionTag: tag,
                        shirtColor: "#f472b6",
                        hp: 38,
                        speed: grpSpeed,
                        formationRole: "GROUP_FOLLOWER",
                        formationFwdOff: -12,
                        formationSideOff: 11
                    },
                    {
                        kind: "CIVILIAN",
                        g24Type: trio[2],
                        missionTag: tag,
                        shirtColor: "#a855f7",
                        hp: 38,
                        speed: grpSpeed,
                        formationRole: "GROUP_FOLLOWER",
                        formationFwdOff: -25,
                        formationSideOff: -3
                    }
                ]
            };
        }

        // HANGOUT_CIRCLE (2 or 3 people standing in a small circle chatting for 14..22s before walking together)
        const count = (r % 3 === 0) ? 3 : 2;
        const hangoutDuration = 14 + (r % 9);
        const members = [];
        for (let m = 0; m < count; m++) {
            const spec = this.chooseDistrictPedSpec(bx, by, isSand, map, seed + m * 17);
            if (spec.isChild || spec.isRollerblader || spec.g24Type === "vc_jogger") {
                spec.g24Type = isBeach ? "bikini_pink" : (isIndustrial ? "dockworker_yellow" : "vc_tourist");
                spec.isChild = false;
                spec.isRollerblader = false;
            }
            spec.speed = 24;
            spec.hangoutTimer = hangoutDuration;
            spec.formationRole = m === 0 ? "LEADER" : (count === 2 ? "COUPLE_PARTNER" : "GROUP_FOLLOWER");
            spec.formationFwdOff = m === 0 ? 0 : (m === 1 ? -3 : -13);
            spec.formationSideOff = m === 0 ? -5 : (m === 1 ? 8 : -2);
            members.push(spec);
        }
        return { type: "HANGOUT_CIRCLE", members };
    }

    spawnFormationAt(bx, by, pedX, pedY, pedZ, pedAngle, pedStep, isSand = false, inPrisonYard = false, seed = 0) {
        const game = this.game;
        const map = game.map;
        const roster = this.chooseFormationRoster(bx, by, isSand, inPrisonYard, map, seed);
        const formationId = ++TrafficManager._nextFormationId;
        const fCos = Math.cos(pedAngle);
        const fSin = Math.sin(pedAngle);
        const rPerpX = -fSin;
        const rPerpY = fCos;

        let leaderPed = null;
        let spawnedCount = 0;
        const count = roster.members.length;

        for (let m = 0; m < count; m++) {
            const spec = roster.members[m];
            let mx = pedX;
            let my = pedY;
            let mAngle = pedAngle;

            if (roster.type === "HANGOUT_CIRCLE") {
                const theta = pedAngle + (m * Math.PI * 2) / count;
                const radius = count === 2 ? 9.5 : 11.0;
                mx = pedX + Math.cos(theta) * radius;
                my = pedY + Math.sin(theta) * radius;
                mAngle = Math.atan2(pedY - my, pedX - mx);
            } else if (m > 0) {
                const fwd = spec.formationFwdOff || (-5 * m);
                const side = spec.formationSideOff || (m === 1 ? 8 : -3);
                mx = pedX + fCos * fwd + rPerpX * side;
                my = pedY + fSin * fwd + rPerpY * side;
            }

            // If a companion slot lands on a road, water, building, Lummus lawn, or vehicle, tuck behind the leader or skip
            if (m > 0) {
                const mbx = Math.floor(mx / TILE_SIZE);
                const mby = Math.floor(my / TILE_SIZE);
                const mNav = map.getNavigationBlock ? map.getNavigationBlock(mbx, mby, pedZ) : null;
                const onLummusLawn = (mbx >= 449 && mbx <= 464) && mNav && mNav.lid === 10 && !(bx >= 449 && bx <= 464);
                const badGround = !mNav || mNav.groundType === GROUND_TYPE.ROAD || mNav.groundType === GROUND_TYPE.WATER || mNav.groundType === GROUND_TYPE.BUILDING || onLummusLawn;
                const hitBld = typeof map.resolveCircleBuildingCollision === "function" && map.resolveCircleBuildingCollision(mx, my, 8.5, pedZ).hit;
                const hitVeh = typeof game.resolveCircleVehicleCollision === "function" && game.resolveCircleVehicleCollision(mx, my, 9.5, pedZ).hit;
                if (badGround || hitBld || hitVeh) {
                    const tuckX = pedX - fCos * (14 * m);
                    const tuckY = pedY - fSin * (14 * m);
                    const tbx = Math.floor(tuckX / TILE_SIZE);
                    const tby = Math.floor(tuckY / TILE_SIZE);
                    const tNav = map.getNavigationBlock ? map.getNavigationBlock(tbx, tby, pedZ) : null;
                    const tuckOnLawn = (tbx >= 449 && tbx <= 464) && tNav && tNav.lid === 10 && !(bx >= 449 && bx <= 464);
                    const tuckBad = !tNav || tNav.groundType === GROUND_TYPE.ROAD || tNav.groundType === GROUND_TYPE.WATER || tNav.groundType === GROUND_TYPE.BUILDING || tuckOnLawn ||
                        (typeof map.resolveCircleBuildingCollision === "function" && map.resolveCircleBuildingCollision(tuckX, tuckY, 8.5, pedZ).hit) ||
                        (typeof game.resolveCircleVehicleCollision === "function" && game.resolveCircleVehicleCollision(tuckX, tuckY, 9.5, pedZ).hit);
                    if (tuckBad) continue;
                    mx = tuckX;
                    my = tuckY;
                }
            }

            const baseSpeed = spec.isRollerblader
                ? (45 + Math.random() * 6)
                : (spec.isChild ? (21 + Math.random() * 3) : (spec.speed || (22 + Math.random() * 5)));

            if (!this._sessionTag) {
                this._sessionTag = Math.random().toString(36).slice(2, 6);
            }
            const newPed = new Pedestrian({
                id: `dped_${this._sessionTag}_${++Pedestrian._nextId}`,
                x: mx,
                y: my,
                z: pedZ,
                angle: mAngle,
                speed: roster.type === "HANGOUT_CIRCLE" ? 0 : baseSpeed,
                ...spec,
                dead: false,
                panicTimer: 0,
                targetBx: pedStep ? pedStep.bx : null,
                targetBy: pedStep ? pedStep.by : null,
                turnSeed: (game.peds.length + seed + m + 1)
            });
            newPed.baseWalkSpeed = baseSpeed;
            newPed.formationId = count > 1 ? formationId : 0;
            newPed.formationType = roster.type;
            newPed.formationRole = spec.formationRole || "SOLO";
            newPed.formationMemberIndex = m;
            newPed._formAngle = mAngle;
            newPed.formationFwdOff = spec.formationFwdOff || 0;
            newPed.formationSideOff = spec.formationSideOff || 0;
            if (roster.type === "HANGOUT_CIRCLE") {
                newPed.hangoutTimer = spec.hangoutTimer || 16;
                newPed.hangoutCenterX = pedX;
                newPed.hangoutCenterY = pedY;
                newPed.hangoutBaseAngle = mAngle;
            }
            if (spec.isRollerblader) newPed.isRollerblader = true;
            if (spec.isSkateboarder) newPed.isSkateboarder = true;
            if (spec.isJogger) newPed.isJogger = true;
            if (spec.isChild) newPed.isChild = true;
            if (spec.carryProp) newPed.carryProp = spec.carryProp;
            if (spec.hasDog !== undefined) newPed.hasDog = spec.hasDog;
            if (spec.dogBreed) newPed.dogBreed = spec.dogBreed;
            if (spec.personality) newPed.personality = spec.personality;

            if (m === 0) {
                leaderPed = newPed;
            } else if (leaderPed) {
                newPed.formationLeader = leaderPed;
            }
            game.peds.push(newPed);
            spawnedCount++;
        }
        return spawnedCount;
    }

    /* ========================================================================
       CONTEXTUAL VICE PORT WORK TEAMS & GATE SECURITY (`missionTag: "PORT_CREW"`)
       Places 5 purposeful 2-person dock crews & gate officers at the warehouse
       loading courts, semi-trucks, and security gatehouses of Port of Vice City.
       ======================================================================== */
    ensureVicePortWorkCrews(refX, refY) {
        const game = this.game;
        const map = game.map;
        if (!map || !map.cmpLoaded) return;
        const rBx = Math.floor(refX / TILE_SIZE);
        const rBy = Math.floor(refY / TILE_SIZE);
        // Activate when within 28 blocks of Vice Port (c = 328..363, r = 298..338)
        if (rBx < 300 || rBx > 390 || rBy < 270 || rBy > 366) return;

        let activePortCrew = 0;
        for (let i = 0; i < game.peds.length; i++) {
            const p = game.peds[i];
            if (!p.dead && p.missionTag === "PORT_CREW") activePortCrew++;
        }
        if (activePortCrew >= 6) return;

        const portTeams = [
            // 1. NW Warehouse Loading Court (between backed-in Flatbed & Box Truck)
            {
                cx: 338.8 * TILE_SIZE,
                cy: 306.5 * TILE_SIZE,
                members: [
                    { g24Type: "dockworker_yellow", shirtColor: "#eab308", dx: -7, dy: 0, angle: 0 },
                    { g24Type: "dockworker_orange", shirtColor: "#f97316", dx: 7, dy: 0, angle: Math.PI }
                ]
            },
            // 2. NE Harbor Master & Cold-Storage Court (Customs Officer & Foreman inspecting manifest)
            {
                cx: 348.5 * TILE_SIZE,
                cy: 306.2 * TILE_SIZE,
                members: [
                    { g24Type: "vc_sailor", shirtColor: "#38bdf8", dx: -7, dy: -2, angle: 0.25 },
                    { g24Type: "dockworker_orange", shirtColor: "#f97316", dx: 7, dy: 2, angle: Math.PI + 0.25 }
                ]
            },
            // 3. SW Heavy Rigging Court (Crane rigging crew)
            {
                cx: 339.2 * TILE_SIZE,
                cy: 320.8 * TILE_SIZE,
                members: [
                    { g24Type: "dockworker_yellow", shirtColor: "#eab308", dx: -6, dy: -4, angle: 0.6 },
                    { g24Type: "dockworker_orange", shirtColor: "#f97316", dx: 6, dy: 4, angle: -2.5 }
                ]
            },
            // 4. SE Export & Fuel Tanker Depot (Tanker engineer & Sailor)
            {
                cx: 349.0 * TILE_SIZE,
                cy: 328.0 * TILE_SIZE,
                members: [
                    { g24Type: "dockworker_orange", shirtColor: "#f97316", dx: -7, dy: 0, angle: 0 },
                    { g24Type: "vc_sailor", shirtColor: "#38bdf8", dx: 7, dy: 0, angle: Math.PI }
                ]
            },
            // 5. North Entry Gatehouses Security Post
            {
                cx: 342.4 * TILE_SIZE,
                cy: 300.4 * TILE_SIZE,
                members: [
                    { g24Type: "dockworker_yellow", shirtColor: "#eab308", dx: -6, dy: 0, angle: 0 },
                    { g24Type: "dockworker_orange", shirtColor: "#f97316", dx: 6, dy: 0, angle: Math.PI }
                ]
            }
        ];

        for (let t = 0; t < portTeams.length; t++) {
            const team = portTeams[t];
            const nearExisting = game.peds.some((p) => !p.dead && Math.hypot(p.x - team.cx, p.y - team.cy) < 48);
            if (nearExisting) continue;
            const formId = ++TrafficManager._nextFormationId;
            let leader = null;
            for (let m = 0; m < team.members.length; m++) {
                const spec = team.members[m];
                const px = team.cx + spec.dx;
                const py = team.cy + spec.dy;
                const pz = map.getHeightAtPixel(px, py, 2.0);
                const ped = new Pedestrian({
                    x: px,
                    y: py,
                    z: pz,
                    angle: spec.angle,
                    speed: 0,
                    kind: "CIVILIAN",
                    g24Type: spec.g24Type,
                    shirtColor: spec.shirtColor,
                    missionTag: "PORT_CREW",
                    hp: 48,
                    dead: false,
                    panicTimer: 0,
                    targetBx: Math.floor(px / TILE_SIZE),
                    targetBy: Math.floor(py / TILE_SIZE),
                    turnSeed: 700 + t * 5 + m
                });
                ped.baseWalkSpeed = 24;
                ped.formationId = formId;
                ped.formationType = "HANGOUT_CIRCLE";
                ped.formationRole = m === 0 ? "LEADER" : "COUPLE_PARTNER";
                ped.formationFwdOff = m === 0 ? 0 : -3;
                ped.formationSideOff = m === 0 ? -5 : 8;
                ped.hangoutTimer = 999999; // Permanent contextual port work post unless startled
                ped.hangoutCenterX = team.cx;
                ped.hangoutCenterY = team.cy;
                ped.hangoutBaseAngle = spec.angle;
                if (spec.g24Type === "dockworker_orange") ped.carryProp = "CLIPBOARD";
                if (m === 0) leader = ped;
                else ped.formationLeader = leader;
                game.peds.push(ped);
            }
        }
    }

    getAllHumanPlayerViewports() {
        const game = this.game;
        const renderer = game.renderer;
        const map = game.map;
        const canvasW = renderer && renderer.canvas ? renderer.canvas.width : 1280;
        const canvasH = renderer && renderer.canvas ? renderer.canvas.height : 720;
        const camDist = renderer ? (renderer.followHeightBlocks + renderer.zoomOffsetBlocks) : 5.0;

        const useRendererCam = Boolean(renderer && !game.activeInterior);
        const camX = useRendererCam ? renderer.camX : game.player.x;
        const camY = useRendererCam ? renderer.camY : game.player.y;
        const camZ = useRendererCam ? renderer.camZBlocks : (game.player.z || 2.0);
        const list = [{
            x: camX,
            y: camY,
            z: camZ,
            area: map.getOnScreenMapArea(camX, camY, camZ, canvasW, canvasH, camDist)
        }];

        // On the Dedicated Server (wsConnected), each client manages ambient peds/cars strictly around its own local camera
        if (game.net && !game.net.wsConnected && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
            for (const rp of game.net.remotePlayers.values()) {
                if (rp.isBot) continue;
                const rz = rp.z !== undefined ? rp.z : 2.0;
                list.push({
                    x: rp.x,
                    y: rp.y,
                    z: rz,
                    area: map.getOnScreenMapArea(rp.x, rp.y, rz, 1280, 720, 5.0)
                });
            }
        }
        return list;
    }

    updateTraffic(dt) {
        const game = this.game;
        const isClientSync = Boolean(
            game &&
            game.net &&
            typeof game.net.isClientWorldSyncActive === "function" &&
            game.net.isClientWorldSyncActive()
        );

        this.lastGenCarsTime += dt;
        this.lastGenPedsTime += dt;

        const map = game.map;
        if (!map || !map.cmpLoaded) return;

        const viewports = this.getAllHumanPlayerViewports();
        const vp = viewports[this._spawnPlayerCursor % viewports.length];

        if (!isClientSync && this.lastGenCarsTime >= this.genCarsCooldown) {
            this.lastGenCarsTime = 0;
            this.removeOffscreenCars(viewports);
            this.generateTrafficCars(vp.area, vp.z);
        }

        if (!isClientSync && this.lastGenPedsTime >= this.genPedsCooldown) {
            this.lastGenPedsTime = 0;
            this.removeOffscreenPeds(viewports);
            this.generateTrafficPeds(vp.area, vp.z, vp.x, vp.y);
            this._spawnPlayerCursor = (this._spawnPlayerCursor + 1) % Math.max(1, viewports.length);
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

    removeOffscreenCars(viewports) {
        const game = this.game;
        const map = game.map;
        const vps = Array.isArray(viewports) ? viewports : [{ area: viewports }];
        const minKeep = 24 + (vps.length - 1) * 10;
        const outerRects = vps.map((vp) => this.expandRect(vp.area, this.carsMaxDistanceBlocks + 2));
        const farWreckRects = vps.map((vp) => this.expandRect(vp.area, 48));
        let activeMovingCount = 0;
        for (let k = 0; k < game.vehicles.length; k++) {
            const mv = game.vehicles[k];
            if (mv && !mv.destroyed && (mv.driver === "AI_TRAFFIC" || mv.driver === "AI_EMERGENCY" || mv.driver === "AI_COP")) {
                activeMovingCount++;
            }
        }

        for (let i = game.vehicles.length - 1; i >= 0; i--) {
            const v = game.vehicles[i];
            if (!v || v.towedByTruck) continue;
            const anyWanted = game.wantedLevel > 0 || (game.net && typeof game.net.getMaxWantedLevel === "function" && game.net.getMaxWantedLevel() > 0);
            const isAbandonedOrWreck =
                !v.isStaticParked &&
                !v.isEstateCar &&
                ((v.destroyed && (v.abandonedTimer || 0) > 90.0) ||
                 (!v.destroyed && v.driver === null && (v.abandonedTimer || 0) > (v.lastPlayerDriven ? 180.0 : 85.0)));
            const canRecycle =
                v.driver === "AI_TRAFFIC" ||
                v.driver === "AI_EMERGENCY" ||
                v.driver === "AI_CRIMINAL" ||
                v.driver === "AI_TOW" ||
                v.driver === "AI_COP" ||
                isAbandonedOrWreck;
            // Only protect a player-modified vehicle from off-screen recycling while it sits parked & unoccupied (< 180s).
            // Once an AI driver (AI_COP, AI_TRAFFIC, AI_CRIMINAL, AI_TOW) drives it off-screen, recycle and purge it!
            // Also never locally delete the Dedicated Server's persistent autonomous fleet (srv_trf_* / _serverDriven)!
            const isRecentParkedMod = v._worldModified && !v.destroyed && v.driver === null && !isAbandonedOrWreck;
            const isServerPersistentFleet = Boolean(v._serverDriven || (typeof v.id === "string" && v.id.startsWith("srv_trf_")));
            // PERMANENT WORLD: wrecks and player-modified parked cars are NEVER culled/recycled by distance or timers (and never broadcast as removed to the server);
            // only a physical Tow Truck may remove them.
            const isPermanentWorldObject = Boolean(v.destroyed || (v._worldModified && v.driver === null));
            if (isPermanentWorldObject || !canRecycle || v === game.scurveHeroCar || v.missionTag || v.driver === "REMOTE" || isRecentParkedMod || isServerPersistentFleet) continue;

            const bx = Math.floor(v.x / TILE_SIZE);
            const by = Math.floor(v.y / TILE_SIZE);
            // Immediately remove any civilian/emergency traffic car that ever wanders or spawns inside a restricted compound (VCIA Airport / Penitentiary)
            if (map && map.isRestrictedNoTrafficZone && map.isRestrictedNoTrafficZone(bx, by)) {
                if (v.aiCurbParkingBay && v.aiCurbParkingBay._occupiedBy === v) v.aiCurbParkingBay._occupiedBy = null;
                if (v.towingVehicle) {
                    const tIdx = game.vehicles.indexOf(v.towingVehicle);
                    if (tIdx >= 0) {
                        if (game.net && typeof game.net.broadcastVehicleRemoved === "function" && v.towingVehicle.id) {
                            game.net.broadcastVehicleRemoved(v.towingVehicle.id);
                        }
                        game.vehicles.splice(tIdx, 1);
                        if (tIdx < i) i--;
                    }
                }
                if (v._worldModified && game.net && typeof game.net.broadcastVehicleRemoved === "function" && v.id) {
                    game.net.broadcastVehicleRemoved(v.id);
                }
                game.vehicles.splice(i, 1);
                continue;
            }
            const isApproachingTowTruck = v.driver === "AI_TOW";
            const isEmergencyFleet = v.driver === "AI_EMERGENCY" || v.specKey === "FIRE_TRUCK" || v.specKey === "MEDIC_AMBULANCE" || Boolean(v.isPersistentFleet);
            const isActiveWantedCop = anyWanted && v.driver === "AI_COP";
            if (activeMovingCount <= minKeep && !isAbandonedOrWreck && v.driver !== "AI_TOW" && !isEmergencyFleet && !isActiveWantedCop) continue;
            // Burned wrecks, abandoned cars, Tow Trucks, Ambulances, Fire Engines, and active pursuit Cops stay in the wider district (38 blocks / ~2432px)
            // so units dispatched from real Precincts, Hospitals, Firehouses, and Impound Yards drive all the way to the incident without ever vanishing!
            const checkRects = (isAbandonedOrWreck || isApproachingTowTruck || isEmergencyFleet || isActiveWantedCop) ? farWreckRects : outerRects;
            const nearAnyPlayer = checkRects.some((r) => this.isPointInRect(bx, by, r));
            if (!nearAnyPlayer) {
                if (v.aiCurbParkingBay && v.aiCurbParkingBay._occupiedBy === v) v.aiCurbParkingBay._occupiedBy = null;
                if (v.towingVehicle) {
                    const tIdx = game.vehicles.indexOf(v.towingVehicle);
                    if (tIdx >= 0) {
                        if (game.net && typeof game.net.broadcastVehicleRemoved === "function" && v.towingVehicle.id) {
                            game.net.broadcastVehicleRemoved(v.towingVehicle.id);
                        }
                        game.vehicles.splice(tIdx, 1);
                        if (tIdx < i) i--;
                    }
                }
                if ((v._worldModified || v.destroyed || v.lastPlayerDriven) && game.net && typeof game.net.broadcastVehicleRemoved === "function" && v.id) {
                    game.net.broadcastVehicleRemoved(v.id);
                }
                if (v.driver === "AI_TRAFFIC" || v.driver === "AI_EMERGENCY" || v.driver === "AI_COP") {
                    activeMovingCount--;
                }
                game.vehicles.splice(i, 1);
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
                if (map.isRestrictedNoTrafficZone && map.isRestrictedNoTrafficZone(bx, by)) continue;
                const navBlk = map.getNavigationBlock(bx, by, camZ);
                if (!navBlk || navBlk.groundType !== GROUND_TYPE.ROAD || navBlk.isRailway || navBlk.isParkingBay) continue;
                if (map.surfaceGround && map.surfaceGround[by * MAP_COLS + bx] !== GROUND_TYPE.ROAD) continue;
                // 1997 GTA 1 TrafficManager.cpp:368-374 — ONLY spawn on single-direction straight lane blocks (bits === 1), never intersections!
                const lidZ1 = map.getBlockInfo ? map.getBlockInfo(bx, by, 1).lid : 0;
                const bits = (navBlk.up ? 1 : 0) + (navBlk.down ? 1 : 0) + (navBlk.left ? 1 : 0) + (navBlk.right ? 1 : 0);
                if (bits === 1 && lidZ1 !== 25 && !navBlk.isParkingBay) {
                    const sdx = navBlk.right ? 1 : (navBlk.left ? -1 : 0);
                    const sdy = navBlk.down ? 1 : (navBlk.up ? -1 : 0);
                    const nextLid = map.getBlockInfo ? map.getBlockInfo(bx + sdx, by + sdy, 1).lid : 0;
                    // Never spawn a cruising 85 px/s car right on a stop-line block immediately entering an intersection!
                    if (nextLid !== 25) {
                        candidates.push({ bx, by });
                    }
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
            if (game.player && Math.hypot(game.player.x - vx, game.player.y - vy) < 120) continue;
            if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
                let nearRemote = false;
                for (const rp of game.net.remotePlayers.values()) {
                    if (rp && Math.hypot((rp.x || 0) - vx, (rp.y || 0) - vy) < 120) {
                        nearRemote = true;
                        break;
                    }
                }
                if (nearRemote) continue;
            }
            let occupied = false;
            for (const other of game.vehicles) {
                const minGap = (other.isStaticParked && !other.driver) ? 42 : 135;
                if (Math.hypot(other.x - vx, other.y - vy) < minGap) {
                    occupied = true;
                    break;
                }
            }
            if (occupied) continue;

            const vz = map.getHeightAtPixel(vx, vy, 4.0);
            const roadAngle = dirs[Math.floor(Math.random() * dirs.length)].angle;
            let spec = specPool[Math.floor(Math.random() * specPool.length)];
            const isHeavySpec = (spec === "CITY_BUS" || spec === "TOUR_COACH" || spec === "TANKER_RIG" || spec === "FLATBED_TRUCK" || spec === "STRETCH_LIMO");
            if (isHeavySpec) {
                const activeHeavyNear = game.vehicles.filter(
                    (ov) => !ov.destroyed && (ov.specKey === "CITY_BUS" || ov.specKey === "TOUR_COACH" || ov.specKey === "TANKER_RIG" || ov.specKey === "FLATBED_TRUCK" || ov.specKey === "STRETCH_LIMO") &&
                        Math.hypot(ov.x - vx, ov.y - vy) < 1600
                ).length;
                if (activeHeavyNear >= 1) spec = "REGAL_SEDAN";
            }
            if (!this._sessionTag) {
                this._sessionTag = Math.floor(100 + Math.random() * 900);
            }
            const newCar = new Vehicle(`trf_${this._sessionTag}_${++this._trafficSeq}`, spec, vx, vy, roadAngle);
            newCar.z = vz;
            newCar.driver = (spec === "FIRE_TRUCK" || spec === "MEDIC_AMBULANCE") ? "AI_EMERGENCY" : "AI_TRAFFIC";
            newCar.speed = 85;
            newCar.vx = Math.cos(roadAngle) * 85;
            newCar.vy = Math.sin(roadAngle) * 85;
            game.vehicles.push(newCar);
            break;
        }
    }

    removeOffscreenPeds(viewports) {
        const game = this.game;
        const vps = Array.isArray(viewports) ? viewports : [{ area: viewports }];
        const outerRects = vps.map((vp) => this.expandRect(vp.area, this.pedsMaxDistanceBlocks + 5));
        const farRects = vps.map((vp) => this.expandRect(vp.area, this.pedsMaxDistanceBlocks + 9));

        let corpseCount = 0;
        for (let i = game.peds.length - 1; i >= 0; i--) {
            const ped = game.peds[i];
            const bx = Math.floor(ped.x / TILE_SIZE);
            const by = Math.floor(ped.y / TILE_SIZE);
            if (ped.dead) {
                if (ped._boardedVehicle) {
                    if (game.net && typeof game.net.broadcastCorpseCleared === "function") {
                        game.net.broadcastCorpseCleared(ped);
                    }
                    game.peds.splice(i, 1);
                    continue;
                }
                corpseCount++;
                const nearAnyViewport = outerRects.some((r) => this.isPointInRect(bx, by, r));
                if (corpseCount > 55 || ((ped.deadTimer || 0) > 95 && !nearAnyViewport)) {
                    if (game.net && typeof game.net.broadcastCorpseCleared === "function") {
                        game.net.broadcastCorpseCleared(ped);
                    }
                    game.peds.splice(i, 1);
                }
                continue;
            }
            if ((ped.missionTag && ped.missionTag !== "BEACH") || ped.kind === "MEDIC" || ped.kind === "FIREMAN" || ped.isTrafficWarden) continue;
            // Immediately remove any ambient civilian/criminal pedestrian inside Port Gellhorn Super-Speedway or Port of Vice City industrial zone
            if ((ped.kind === "CIVILIAN" || ped.kind === "CRIMINAL") && (
                (bx >= 26 && bx <= 87 && by >= 149 && by <= 200) ||
                (bx >= 328 && bx <= 363 && by >= 298 && by <= 338)
            )) {
                game.peds.splice(i, 1);
                continue;
            }
            // Civilians that PedNav found trapped in a tiny walled pocket vanish as soon as nobody is looking
            if (ped.kind === "CIVILIAN" && ped._navTrapped) {
                const watched = vps.some((vp) => this.isPointInRect(bx, by, this.expandRect(vp.area, 1)));
                if (!watched) {
                    game.peds.splice(i, 1);
                    continue;
                }
            }
            if (ped.kind === "CIVILIAN") {
                const nearAnyPlayer = outerRects.some((r) => this.isPointInRect(bx, by, r));
                if (!nearAnyPlayer) {
                    game.peds.splice(i, 1);
                }
            } else if (ped.kind === "CRIMINAL" || (ped.kind === "COP" && (game.wantedLevel || 0) === 0)) {
                const withinFar = farRects.some((r) => this.isPointInRect(bx, by, r));
                if (!withinFar) {
                    game.peds.splice(i, 1);
                }
            }
        }
    }

    generateTrafficPeds(onScreenArea, camZ, refX = null, refY = null) {
        const game = this.game;
        const map = game.map;
        const outerRect = this.expandRect(onScreenArea, this.pedsMaxDistanceBlocks);

        let nearbyPeds = 0;
        let totalAlivePeds = 0;
        let vicePortPeds = 0;
        for (const ped of game.peds) {
            if (!ped.dead) {
                const isPermanentCompoundGuard = Boolean(ped.missionTag && ped.missionTag !== "BEACH");
                if (!isPermanentCompoundGuard) {
                    totalAlivePeds++;
                }
                const bx = Math.floor(ped.x / TILE_SIZE);
                const by = Math.floor(ped.y / TILE_SIZE);
                if (this.isPointInRect(bx, by, outerRect)) {
                    nearbyPeds++;
                }
                if (bx >= 328 && bx <= 363 && by >= 298 && by <= 338) {
                    vicePortPeds++;
                }
            }
        }
        const maxTotalAlivePeds = this.isMobile ? 155 : 225;
        if (nearbyPeds >= this.maxTrafficPeds || totalAlivePeds >= maxTotalAlivePeds) return;

        const allowEdgeOnScreen = nearbyPeds < (this.isMobile ? 56 : 92);
        const px = refX !== null ? refX : (game.player ? game.player.x : 0);
        const py = refY !== null ? refY : (game.player ? game.player.y : 0);
        this.ensureVicePortWorkCrews(px, py);
        const dirs = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];
        const needed = Math.min(this.isMobile ? 10 : 18, this.maxTrafficPeds - nearbyPeds);
        let spawned = 0;
        const spanX = Math.max(1, outerRect.maxX - outerRect.minX + 1);
        const spanY = Math.max(1, outerRect.maxY - outerRect.minY + 1);
        const maxProbes = this.isMobile ? 84 : 140;

        for (let attempt = 0; attempt < maxProbes && spawned < needed; attempt++) {
            const bx = outerRect.minX + Math.floor(Math.random() * spanX);
            const by = outerRect.minY + Math.floor(Math.random() * spanY);
            if (bx >= 64 && bx <= 165 && by >= 299 && by <= 368) continue;
            if (bx >= 26 && bx <= 87 && by >= 149 && by <= 200) continue;
            if (bx >= 458 && bx <= 481 && by >= 21 && by <= 45) continue;
            if (bx >= 179 && bx <= 197 && by >= 164 && by <= 180) continue;
            if (bx >= 56 && bx <= 68 && by >= 76 && by <= 146 && (bx === 56 || bx === 68 || by === 76 || by === 146)) continue;
            if (bx >= 328 && bx <= 363 && by >= 298 && by <= 338) continue;

            const inScreen = this.isPointInRect(bx, by, onScreenArea);
            if (inScreen && !allowEdgeOnScreen) continue;
            const centerPedX = (bx + 0.5) * TILE_SIZE;
            const centerPedY = (by + 0.5) * TILE_SIZE;
            if (inScreen && Math.hypot(centerPedX - px, centerPedY - py) < 135) continue;

            const nav = map.getNavigationBlock(bx, by, camZ);
            if (!nav) continue;
            const inPrisonYard = (bx >= 57 && bx <= 67 && by >= 77 && by <= 145);
            const isSand = !!(map.coastalSandMask && map.coastalSandMask[by * MAP_COLS + bx] === 1 && nav.groundType === GROUND_TYPE.FIELD);
            if (
                nav.groundType !== GROUND_TYPE.PAWEMENT &&
                !isSand &&
                !(nav.groundType === GROUND_TYPE.FIELD && inPrisonYard)
            ) {
                continue;
            }
            const col = map.getColumn ? map.getColumn(bx, by) : null;
            if (col && col.length > 1) continue;
            const lid = map.getBlockInfo ? (map.getBlockInfo(bx, by, 1)?.lid || 0) : 0;
            if (lid === 69) continue;
            if (bx >= 449 && bx <= 464 && lid === 10) continue;
            // Never spawn inside a tiny enclosed sidewalk pocket (they could only pace back and forth)
            if (typeof PedNav !== "undefined" && !PedNav.isGoodSpawnTile(game, bx, by, camZ)) continue;

            const pick = { bx, by, isPave: nav.groundType === GROUND_TYPE.PAWEMENT, isSand, inPrisonYard };
            const pedX = (pick.bx + 0.25 + Math.random() * 0.5) * TILE_SIZE;
            const pedY = (pick.by + 0.25 + Math.random() * 0.5) * TILE_SIZE;

            let tooClose = false;
            for (let pi = 0; pi < game.peds.length; pi++) {
                const other = game.peds[pi];
                if (!other || other.dead) continue;
                const odx = other.x - pedX;
                if (odx > 34 || odx < -34) continue;
                const ody = other.y - pedY;
                if (ody > 34 || ody < -34) continue;
                if (odx * odx + ody * ody < 1156) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            const pedZ = map.getHeightAtPixel(pedX, pedY, 4.0);
            if (typeof map.resolveCircleBuildingCollision === "function" && map.resolveCircleBuildingCollision(pedX, pedY, 10, pedZ).hit) {
                continue;
            }
            if (typeof game.resolveCircleVehicleCollision === "function" && game.resolveCircleVehicleCollision(pedX, pedY, 11, pedZ).hit) {
                continue;
            }
            if (typeof map.isInsideLivingEventZone === "function" && map.isInsideLivingEventZone(pedX, pedY, 14)) {
                continue;
            }
            if (map.objectEngine && Array.isArray(map.objectEngine.clearZones)) {
                let inClearZone = false;
                const czList = map.objectEngine.clearZones;
                for (let ci = 0; ci < czList.length; ci++) {
                    const cz = czList[ci];
                    const czR = Math.min(72, cz.r || 60);
                    const cdx = cz.x - pedX;
                    if (cdx > czR || cdx < -czR) continue;
                    const cdy = cz.y - pedY;
                    if (cdy > czR || cdy < -czR) continue;
                    if (cdx * cdx + cdy * cdy < czR * czR) {
                        inClearZone = true;
                        break;
                    }
                }
                if (inClearZone) continue;
            }

            const rawAngle = dirs[Math.floor(Math.random() * dirs.length)];
            const pedStep = map.chooseNextSidewalkBlock ? map.chooseNextSidewalkBlock(pick.bx, pick.by, rawAngle, camZ, Math.random(), false) : null;
            const pedAngle = pedStep ? pedStep.angle : rawAngle;
            this._trafficSeq = (this._trafficSeq || 0) + 1;
            const added = this.spawnFormationAt(
                pick.bx,
                pick.by,
                pedX,
                pedY,
                pedZ,
                pedAngle,
                pedStep,
                pick.isSand,
                pick.inPrisonYard,
                this._trafficSeq + attempt
            );
            spawned += Math.max(1, added);
        }
    }
}
TrafficManager._nextFormationId = 1;

window.CAR_DAMAGE_DELTA = CAR_DAMAGE_DELTA;
window.CAR_DETACH_PART = CAR_DETACH_PART;
window.CAR_TIRE = CAR_TIRE;
window.PED_STATE = PED_STATE;
window.SPRITE_DRAW_ORDER = SPRITE_DRAW_ORDER;
window.VEHICLE_SPECS = VEHICLE_SPECS;
window.WEAPON_SPECS = WEAPON_SPECS;
window.Vehicle = Vehicle;
window.Pedestrian = Pedestrian;
window.TrafficManager = TrafficManager;
