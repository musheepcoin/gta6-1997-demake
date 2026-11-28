// ============================================================================
// VICE CITY 26 — GTA VI LEONIDA MULTI-ROOM 3D INTERIOR & CUTAWAY ENGINE 2.0
// Real-World .CMP Facade Cutaway Alignment, Tailored Venue Footprints,
// Storefront Glass Windows, Smashable Showcases, Surface Materials & Live NPCs
// ============================================================================

(function () {
    const CANON_W = 820;
    const CANON_H = 560;
    const CANON_IX0 = 18;
    const CANON_IW = CANON_W - 36; // 784
    const CANON_IY0 = 56;
    const CANON_IH = CANON_H - 74; // 486

    const THEME_DIMENSIONS = {
        SHOP_CONVENIENCE: { w: 720, h: 500 },
        STARLET_MOTEL:    { w: 760, h: 510 },
        SHOP_CLOTHES:     { w: 800, h: 540 },
        SHOP_BAR:         { w: 820, h: 550 },
        SHOP_RESTAURANT:  { w: 840, h: 560 },
        DINER_PAWN:       { w: 860, h: 570 },
        ONLYRAW_STUDIO:   { w: 860, h: 570 },
        SHOP_GUN_SHOP:    { w: 860, h: 580 },
        SHOP_HOTEL:       { w: 880, h: 590 },
        ART_DECO_HOTEL:   { w: 880, h: 590 },
        MALIBU_CLUB:      { w: 900, h: 600 },
        NEON_CLUB:        { w: 920, h: 610 },
        STRIP_CLUB:       { w: 920, h: 610 },
        SPACE_BUNKER:     { w: 900, h: 600 },
        PRISON_BLOCK:     { w: 900, h: 600 },
        MANSION:          { w: 960, h: 640 }
    };

    const SHOP_TEMPLATES = {
        SHOP_GUN_SHOP: {
            theme: "SHOP_GUN_SHOP",
            accent: "#f97316",
            matRGB: [0.98, 0.45, 0.12],
            w: 860,
            h: 580,
            subtitle: "PHIL'S TACTICAL SHOWROOM, KEVLAR VAULT, SMASHABLE GLASS CASES & LIVE 4-LANE RANGE",
            buildStations(id) {
                return [
                    { id: `${id}_PISTOL`, x: 304, y: 206, color: "#fbbf24", label: "9MM TACTICAL PISTOL ($250)", sub: "EQUIP 9MM + 40 ROUNDS", action: "BUY_PISTOL", cost: 250 },
                    { id: `${id}_UZI`, x: 452, y: 206, color: "#f97316", label: "STAR-SPANGLED MICRO-UZI ($650)", sub: "EQUIP UZI + 80 ROUNDS", action: "BUY_UZI", cost: 650 },
                    { id: `${id}_SHOTGUN`, x: 378, y: 362, color: "#ef4444", label: "HONKY-TONK 12GA SHOTGUN ($900)", sub: "EQUIP SHOTGUN + 25 SHELLS", action: "BUY_SHOTGUN", cost: 900 },
                    { id: `${id}_ARMOR`, x: 118, y: 296, color: "#38bdf8", label: "LEVEL-IV KEVLAR VEST ($500)", sub: "+100% TACTICAL BODY ARMOR", action: "BUY_ARMOR", cost: 500 },
                    { id: `${id}_ROCKET`, x: 666, y: 382, color: "#a855f7", label: "PHIL'S HEAVY RPG CRATE ($2,500)", sub: "RPG LAUNCHER + 8 ROCKETS", action: "BUY_ROCKET", cost: 2500 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 378, y: 96, angle: Math.PI * 0.5, type: "gang", label: "PHIL'S ARMS DEALER", roleBehavior: "CLERK", armed: true, weapon: "SHOTGUN", dialog: "PHIL'S AMMU-NATION! TRY ANY IRON ON THE LIVE 4-LANE RANGE!" },
                    { x: 118, y: 126, angle: Math.PI * 0.5, type: "civ0", label: "GUNSMITH", roleBehavior: "CLERK", armed: true, weapon: "PISTOL", dialog: "CERAMIC TRAUMA PLATES & CUSTOM BARRELS IN THE VAULT." },
                    { x: 410, y: 458, angle: Math.PI * 0.5, type: "police", label: "RANGE OFFICER", roleBehavior: "GUARD", armed: true, weapon: "SHOTGUN", dialog: "KEEP LIVE FIRE STRICTLY INSIDE LANES 1 TO 4, PAL!" },
                    { x: 596, y: 348, angle: -Math.PI * 0.5, type: "civ1", label: "SHOOTER", roleBehavior: "SHOOTER", dialog: "SIGHTING IN THIS 12-GAUGE DOWNRANGE!" },
                    { x: 712, y: 348, angle: -Math.PI * 0.5, type: "gang", label: "MARKSMAN", roleBehavior: "SHOOTER", dialog: "DOUBLE-TAP CENTER MASS EVERY TIME." }
                ];
            }
        },

        SHOP_RESTAURANT: {
            theme: "SHOP_RESTAURANT",
            accent: "#ef4444",
            matRGB: [0.95, 0.25, 0.25],
            w: 840,
            h: 560,
            subtitle: "SUNLIT BISTRO TERRACE, CANDLELIT DINING TABLES, WINE CELLAR & SIZZLING KITCHEN",
            buildStations(id) {
                return [
                    { id: `${id}_EXPRESS`, x: 185, y: 245, color: "#fbbf24", label: "CUBAN CORTADITO & PASTELITO ($60)", sub: "+45 HP INSTANT BOOST", action: "BUY_SNACK", healHp: 45, cost: 60 },
                    { id: `${id}_FEAST`, x: 410, y: 245, color: "#22c55e", label: "CHEF'S SEAFOOD PLATTER ($180)", sub: "100% HP + 16S SPRINT RUSH", action: "BUY_MEAL", cost: 180 },
                    { id: `${id}_WINE`, x: 685, y: 350, color: "#e879f9", label: "RESERVA VINTAGE BOTTLE ($300)", sub: "100% HP + +50 ARMOR", action: "BUY_DRINK", cost: 300 },
                    { id: `${id}_JUKE`, x: 112, y: 472, color: "#38bdf8", label: "HAVANA WURLITZER JUKEBOX ($25)", sub: "NEXT TRACK + +15S ADRENALINE VIBE", action: "JUKEBOX_VIBE", cost: 25 },
                    { id: `${id}_REG`, x: 685, y: 155, color: "#fde047", label: "HOLD UP MANAGER'S SAFE", sub: "CRACK OFFICE SAFE (+$350, +2★ WANTED)", action: "ROB_REGISTER", reward: 350 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 205, y: 108, angle: Math.PI * 0.5, type: "civ0", label: "HEAD CHEF", roleBehavior: "BARTENDER", patrolSpan: 48, dialog: "FRESH SNAPPER & CUBAN PRESS RIGHT OFF THE PLANCHA!" },
                    { x: 425, y: 108, angle: Math.PI * 0.5, type: "civ2", label: "SOUS CHEF", roleBehavior: "BARTENDER", patrolSpan: 36, dialog: "HOT SKILLETS COMING THROUGH THE PASS!" },
                    { x: 410, y: 462, angle: Math.PI * 0.5, type: "civ1", label: "MAITRE D'", roleBehavior: "CLERK", dialog: "BIENVENIDOS! CANDLELIT BOOTH OR PRIVATE WINE CELLAR?" },
                    { x: 188, y: 315, angle: 0, type: "civ3", label: "PATRON", roleBehavior: "SHOPPER", patrolRadius: 28, dialog: "BEST ESPRESSO AND KEY LIME PIE IN LEONIDA." },
                    { x: 685, y: 285, angle: Math.PI * 0.5, type: "gang", label: "SOMMELIER", roleBehavior: "CLERK", armed: true, weapon: "PISTOL", dialog: "PRIVATE CELLAR VINTAGES — HANDS OFF THE OFFICE SAFE." }
                ];
            }
        },

        SHOP_HOTEL: {
            theme: "SHOP_HOTEL",
            accent: "#ec4899",
            matRGB: [0.94, 0.28, 0.68],
            w: 880,
            h: 590,
            subtitle: "OCEAN VIEW ART DECO LOBBY, PRESIDENTIAL KING SUITE, WALK-IN WARDROBE & JACUZZI SPA",
            buildStations(id) {
                return [
                    { id: `${id}_SUITE`, x: 138, y: 162, color: "#ec4899", label: "OCEAN VIEW KING SUITE ($300)", sub: "100% HP & ARMOR + CLEAR 2★ WANTED", action: "RENT_SUITE", cost: 300 },
                    { id: `${id}_CLOSET`, x: 138, y: 395, color: "#38bdf8", label: "DESIGNER SUITE WARDROBE ($400)", sub: "NEW DISGUISE — CLEAR ALL WANTED STARS", action: "CHANGE_OUTFIT", cost: 400 },
                    { id: `${id}_CONCIERGE`, x: 410, y: 248, color: "#fde047", label: "CONCIERGE LOCKBOX STASH", sub: "COLLECT VIP GUEST ENVELOPE (+$250)", action: "HOTEL_PERK", reward: 250 },
                    { id: `${id}_BAR`, x: 665, y: 175, color: "#22d3ee", label: "FLAMINGO MOJITO BAR ($120)", sub: "100% HP + +25 ARMOR + TROPICAL RUSH", action: "BUY_COCKTAIL", cost: 120 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 410, y: 145, angle: Math.PI * 0.5, type: "civ2", label: "CONCIERGE", roleBehavior: "CLERK", dialog: "WELCOME TO OUR SOUTH BEACH ART DECO LANDMARK!" },
                    { x: 335, y: 468, angle: 0, type: "civ0", label: "BELLHOP", roleBehavior: "SHOPPER", patrolRadius: 34, dialog: "PENTHOUSE BAGS ARE HEADING RIGHT UP, BOSS." },
                    { x: 655, y: 92, angle: Math.PI * 0.5, type: "civ1", label: "BARTENDER", roleBehavior: "BARTENDER", patrolSpan: 44, dialog: "FRESH YERBA BUENA MOJITOS & FROZEN DAIQUIRIS!" },
                    { x: 675, y: 425, angle: -Math.PI * 0.5, type: "bikini_pink", label: "VIP GUEST", roleBehavior: "DANCER", dancing: true, dialog: "THE HEATED TERRAZZO JACUZZI IS PURE VICE LUXURY!" }
                ];
            }
        },

        SHOP_CLOTHES: {
            theme: "SHOP_CLOTHES",
            accent: "#a855f7",
            matRGB: [0.72, 0.32, 0.96],
            w: 800,
            h: 540,
            subtitle: "PASTEL SILK RUNWAY, GLASS JEWELRY VITRINES, TAILOR ATELIER & MIRRORED FITTING CABINS",
            buildStations(id) {
                return [
                    { id: `${id}_STREET`, x: 135, y: 385, color: "#38bdf8", label: "VICE BEACH STREETWEAR ($200)", sub: "FRESH THREADS + DROP 2★ WANTED", action: "BUY_OUTFIT_1", cost: 200 },
                    { id: `${id}_TAILOR`, x: 135, y: 165, color: "#ec4899", label: "PASTEL ITALIAN LINEN SUIT ($550)", sub: "0 WANTED STARS + +50 KEVLAR WEAVE", action: "BUY_OUTFIT_2", cost: 550 },
                    { id: `${id}_VIP`, x: 675, y: 168, color: "#fde047", label: "CUBAN LINK & COUTURE ($900)", sub: "100% HP/ARMOR, 0★ & +1 MULTIPLIER", action: "BUY_OUTFIT_VIP", cost: 900 },
                    { id: `${id}_FIT`, x: 645, y: 385, color: "#34d399", label: "MIRRORED FITTING CABIN", sub: "FREE QUICK DISGUISE — DROP 1★ WANTED", action: "QUICK_FIT", cost: 0 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 675, y: 96, angle: Math.PI * 0.5, type: "civ2", label: "BOUTIQUE STYLIST", roleBehavior: "CLERK", dialog: "SILK RESORT WEAR & GOLD CUBAN LINKS — SMASH-PROOF GLASS!" },
                    { x: 125, y: 96, angle: Math.PI * 0.5, type: "civ0", label: "MASTER TAILOR", roleBehavior: "BARTENDER", patrolSpan: 32, dialog: "BALLISTIC LINING TAILORED RIGHT INTO ITALIAN SILK." },
                    { x: 475, y: 300, angle: Math.PI, type: "bikini_cyan", label: "INFLUENCER", roleBehavior: "SHOPPER", patrolRadius: 42, dialog: "STREAMING MY OUTFIT HAUL LIVE FOR LEONIDA GRAM!" },
                    { x: 335, y: 468, angle: Math.PI * 0.5, type: "gang", label: "BOUTIQUE SECURITY", roleBehavior: "GUARD", armed: true, weapon: "PISTOL", dialog: "ADMIRE THE JEWELRY CASES — DON'T TOUCH THE GLASS." }
                ];
            }
        },

        SHOP_CONVENIENCE: {
            theme: "SHOP_CONVENIENCE",
            accent: "#22c55e",
            matRGB: [0.18, 0.88, 0.45],
            w: 720,
            h: 500,
            subtitle: "CASHIER REGISTER COUNTER, STOCKED ECOLA/LIQUOR AISLES, WALK-IN COOLER & BACKROOM SAFE",
            buildStations(id) {
                return [
                    { id: `${id}_SLUSH`, x: 705, y: 265, color: "#38bdf8", label: "ECOLA & BERRY SLUSHIE ($35)", sub: "+35 HP ICE-COLD REFRESH", action: "BUY_SNACK", healHp: 35, cost: 35 },
                    { id: `${id}_ENERGY`, x: 705, y: 435, color: "#22c55e", label: "SPRUNK EXTREME 6-PACK ($95)", sub: "100% HP + 20S SPRINT BOOST", action: "BUY_ENERGY", cost: 95 },
                    { id: `${id}_LOTTO`, x: 145, y: 305, color: "#fbbf24", label: "LEONIDA FLAMINGO LOTTO ($50)", sub: "SCRATCH FOR UP TO $400 JACKPOT", action: "PLAY_LOTTO", cost: 50 },
                    { id: `${id}_ROB`, x: 485, y: 118, color: "#ef4444", label: "STICK UP REGISTER & SAFE", sub: "EMPTY TILL & BACKROOM SAFE (+$320, +2★)", action: "ROB_REGISTER", reward: 320 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 125, y: 196, angle: Math.PI * 0.5, type: "civ0", label: "STORE CLERK", roleBehavior: "CLERK", dialog: "UNCLE JACK'S & 24/7 — GRAB A COLD SPRUNK OR LOTTO TICKET!" },
                    { x: 245, y: 108, angle: Math.PI * 0.5, type: "civ1", label: "STOCK CLERK", roleBehavior: "BARTENDER", patrolSpan: 44, dialog: "FRESH CASES OF PIßWASSER JUST ROLLED INTO THE BACK." },
                    { x: 465, y: 345, angle: -Math.PI * 0.5, type: "civ3", label: "LATE SHOPPER", roleBehavior: "SHOPPER", patrolRadius: 48, dialog: "ICE CHEST AND WALK-IN BEER COOLER ARE FREEZING COLD!" }
                ];
            }
        },

        SHOP_BAR: {
            theme: "SHOP_BAR",
            accent: "#06b6d4",
            matRGB: [0.08, 0.82, 0.95],
            w: 820,
            h: 550,
            subtitle: "NEON BEER TAPROOM, TOURNAMENT 8-BALL POOL PARLOR, VIDEO SLOTS & BOOKIE BACKROOM",
            buildStations(id) {
                return [
                    { id: `${id}_BEER`, x: 410, y: 205, color: "#fbbf24", label: "KEYS DRAFT LAGER ($50)", sub: "+50 HP COLD PINT", action: "BUY_SNACK", healHp: 50, cost: 50 },
                    { id: `${id}_SHOT`, x: 135, y: 165, color: "#06b6d4", label: "ANEJO TEQUILA FLIGHT ($160)", sub: "100% HP + +50 BRAWLER GRIT", action: "BUY_DRINK", cost: 160 },
                    { id: `${id}_POOL`, x: 135, y: 395, color: "#22c55e", label: "8-BALL SHARK HUSTLE ($100)", sub: "RUN THE RACK FOR UP TO $350", action: "PLAY_POOL", cost: 100 },
                    { id: `${id}_SLOTS`, x: 675, y: 385, color: "#e879f9", label: "NEON CHERRY SLOTS ($75)", sub: "SPIN 777 FOR UP TO $500 JACKPOT", action: "PLAY_SLOTS", cost: 75 },
                    { id: `${id}_SAFE`, x: 685, y: 155, color: "#fde047", label: "CRACK BOOKIE OFFICE SAFE", sub: "ROB BACKROOM STASH (+$350, +2★ WANTED)", action: "ROB_REGISTER", reward: 350 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 410, y: 102, angle: Math.PI * 0.5, type: "civ1", label: "BARTENDER", roleBehavior: "BARTENDER", patrolSpan: 54, dialog: "ICE-COLD PIßWASSER ON TAP OR TOP-SHELF RUM!" },
                    { x: 310, y: 468, angle: Math.PI * 0.5, type: "gang", label: "BOUNCER", roleBehavior: "BOUNCER", armed: true, weapon: "PISTOL", dialog: "KEEP IT COOL AT THE BAR. POOL SHARK'S WAITING WEST." },
                    { x: 135, y: 312, angle: Math.PI * 0.5, type: "gang", label: "POOL SHARK", roleBehavior: "CLERK", dialog: "EIGHT-BALL CORNER POCKET — PUT YOUR HUNDREDS ON THE RAIL!" },
                    { x: 665, y: 335, angle: 0, type: "civ2", label: "BAR REGULAR", roleBehavior: "SHOPPER", patrolRadius: 34, dialog: "CAL HAMPTON SWORE HE HEARD COAST GUARD CHATTER ON THAT TV!" }
                ];
            }
        },

        STARLET_MOTEL: {
            theme: "STARLET_MOTEL",
            accent: "#fb7185",
            matRGB: [0.96, 0.42, 0.54],
            w: 760,
            h: 510,
            subtitle: "CHAPTER 2 SAFEHOUSE ROOM #104, HEIST DUFFEL STASH, MOTEL FRONT OFFICE & COIN LAUNDRY",
            buildStations(id) {
                return [
                    { id: `${id}_BED`, x: 145, y: 185, color: "#fb7185", label: "ROOM #104 SAFEHOUSE BED (FREE)", sub: "100% HP, +50 ARMOR & DROP 2★ HEAT", action: "RENT_SUITE", cost: 0 },
                    { id: `${id}_DUFFEL`, x: 145, y: 375, color: "#fde047", label: "UNDER-BED HEIST DUFFEL ($350)", sub: "EQUIP MICRO-UZI + 80 RDS & DISGUISE", action: "BUY_UZI", cost: 350 },
                    { id: `${id}_LAUNDRY`, x: 675, y: 365, color: "#38bdf8", label: "MOTEL COIN LAUNDRY DISGUISE", sub: "SWAP CLOTHES — DROP 1★ WANTED FREE", action: "QUICK_FIT", cost: 0 },
                    { id: `${id}_OFFICE`, x: 435, y: 165, color: "#ef4444", label: "NIGHT MANAGER CASH BOX", sub: "ROB MOTEL REGISTER (+$280, +2★ WANTED)", action: "ROB_REGISTER", reward: 280 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 415, y: 102, angle: Math.PI * 0.5, type: "civ0", label: "MOTEL CLERK", roleBehavior: "CLERK", dialog: "STARLET MOTEL — HOURLY OR WEEKLY, NO ID REQUIRED." },
                    { x: 645, y: 295, angle: 0, type: "civ3", label: "DRIFTER", roleBehavior: "SHOPPER", patrolRadius: 30, dialog: "DRYER #2 EATS QUARTERS, WATCH OUT FOR KELLY COUNTY DEPUTIES." },
                    { x: 355, y: 325, angle: -Math.PI * 0.5, type: "gang", label: "LOOKOUT", roleBehavior: "PATROL", patrolRadius: 42, dialog: "RAUL BAUTISTA CALLED — PAWN SHOP VAN ROLLS AT DUSK." }
                ];
            }
        },

        ONLYRAW_STUDIO: {
            theme: "ONLYRAW_STUDIO",
            accent: "#38bdf8",
            matRGB: [0.22, 0.74, 0.98],
            w: 860,
            h: 570,
            subtitle: "DRE'QUAN PRIEST'S MIXING CONSOLE, REAL DIMEZ VOCAL BOOTH, PLATINUM LOUNGE & LABEL SAFE",
            buildStations(id) {
                return [
                    { id: `${id}_MIX`, x: 410, y: 190, color: "#00f0ff", label: "SSL MASTERING BOARD ($150)", sub: "DROP ONLYRAW ANTHEM! 100% HP & SPRINT", action: "BUY_COCKTAIL", cost: 150 },
                    { id: `${id}_VIP`, x: 145, y: 178, color: "#ec4899", label: "REAL DIMEZ VIP CHAMPAGNE ($450)", sub: "100% HP, +50 ARMOR & CLEAR WANTED", action: "BUY_OUTFIT_2", cost: 450 },
                    { id: `${id}_SLOTS`, x: 665, y: 375, color: "#a855f7", label: "GREEN-ROOM HIGH-LIMIT ARCADE ($75)", sub: "WIN UP TO $500 STUDIO POT", action: "PLAY_SLOTS", cost: 75 },
                    { id: `${id}_SAFE`, x: 665, y: 168, color: "#fde047", label: "ROYALTY ADVANCE SAFE", sub: "CRACK LABEL VAULT (+$350, +2★ WANTED)", action: "ROB_REGISTER", reward: 350 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 410, y: 98, angle: Math.PI * 0.5, type: "gang", label: "DRE'QUAN PRIEST", roleBehavior: "BARTENDER", patrolSpan: 44, dialog: "ONLYRAW RECORDS! THIS NEW REAL DIMEZ TRACK IS PURE PLATINUM!" },
                    { x: 118, y: 332, angle: 0, type: "bikini_pink", label: "BAE-LUXE (REAL DIMEZ)", roleBehavior: "DANCER", dancing: true, dialog: "WE GOING VIRAL FROM WYNWOOD TO CLUB NINE1NINE!" },
                    { x: 174, y: 352, angle: -0.6, type: "bikini_cyan", label: "ROXY (REAL DIMEZ)", roleBehavior: "DANCER", dancing: true, dialog: "TURN UP THE 808S IN THE VOCAL BOOTH!" },
                    { x: 520, y: 458, angle: Math.PI * 0.5, type: "gang", label: "STUDIO SECURITY", roleBehavior: "BOUNCER", armed: true, weapon: "UZI", dialog: "BOOBIE IKE & DRE'QUAN RUN THIS BUILDING. RESPECT THE STUDIO." }
                ];
            }
        }
    };

    // ============================================================================
    // NON-GENERATIVE HAND-CRAFTED GTA VI VICE CITY & LEONIDA ESTABLISHMENTS
    // ============================================================================
    const HANDCRAFTED_ESTABLISHMENTS = [
        // --- OCEAN DRIVE & SOUTH BEACH ---
        { id: "ESTAB_COLONY_HOTEL", tpl: "SHOP_HOTEL", name: "🏨 OCEAN VIEW & COLONY ART DECO HOTEL", district: "OCEAN DRIVE", c: 443, r: 301, facing: "E" },
        { id: "ESTAB_CAFFE_ROMA", tpl: "SHOP_RESTAURANT", name: "🍝 CAFFÈ ROMA OCEAN TERRACE", district: "OCEAN DRIVE", c: 443, r: 275, facing: "E" },
        { id: "ESTAB_GIANNI_COUTURE", tpl: "SHOP_CLOTHES", name: "👗 GIANNI'S COUTURE & SILK", district: "OCEAN DRIVE", c: 441, r: 253, facing: "S" },
        { id: "ESTAB_CLEVELANDER_BAR", tpl: "SHOP_BAR", name: "🍹 THE CLEVELANDER POOL BAR", district: "OCEAN DRIVE", c: 443, r: 166, facing: "E" },
        { id: "ESTAB_SOBE_BODEGA", tpl: "SHOP_CONVENIENCE", name: "🏪 UNCLE JACK'S LIQUOR & 24/7", district: "SOUTH BEACH", c: 431, r: 306, facing: "S" },
        { id: "ESTAB_COLLINS_AMMU", tpl: "SHOP_GUN_SHOP", name: "🔫 PHIL'S AMMU-NATION SOUTH BEACH", district: "SOUTH BEACH", c: 438, r: 278, facing: "W" },

        // --- MID-BEACH, ESPAÑOLA WAY & WASHINGTON AVE ---
        { id: "ESTAB_HAVANA_TAPAS", tpl: "SHOP_RESTAURANT", name: "🥘 LA PERLA CUBAN GRILL", district: "ESPAÑOLA WAY", c: 440, r: 168, facing: "S" },
        { id: "ESTAB_FLAMINGO_LOUNGE", tpl: "SHOP_BAR", name: "🦩 FLAMINGO COCKTAIL LOUNGE", district: "MID-BEACH", c: 440, r: 170, facing: "N" },
        { id: "ESTAB_WASH_SURPLUS", tpl: "SHOP_GUN_SHOP", name: "🔫 WASHINGTON TACTICAL & PAWN", district: "WASHINGTON AVE", c: 438, r: 155, facing: "W" },
        { id: "ESTAB_OCEAN_SUITES", tpl: "SHOP_HOTEL", name: "🏨 BOARDWALK ART DECO SUITES", district: "MID-BEACH", c: 441, r: 153, facing: "N" },
        { id: "ESTAB_MIDBEACH_MART", tpl: "SHOP_CONVENIENCE", name: "🏪 GATOR MART 24/7 & LOTTO", district: "MID-BEACH", c: 431, r: 248, facing: "N" },

        // --- NORTH BEACH & VICE POINT ---
        { id: "ESTAB_VICEPOINT_SURF", tpl: "SHOP_CLOTHES", name: "👕 VICE POINT SURF & COUTURE", district: "VICE POINT", c: 443, r: 97, facing: "E" },
        { id: "ESTAB_NORTH_AMMU", tpl: "SHOP_GUN_SHOP", name: "🔫 NORTH BEACH GUN & RANGE", district: "NORTH BEACH", c: 431, r: 66, facing: "S" },
        { id: "ESTAB_STARLIGHT_HOTEL", tpl: "SHOP_HOTEL", name: "🏨 STARLIGHT OCEAN RESORT", district: "NORTH BEACH", c: 448, r: 43, facing: "E" },
        { id: "ESTAB_NEON_PALM_BAR", tpl: "SHOP_BAR", name: "🍸 NEON PALM COCKTAIL CLUB", district: "NORTH BEACH", c: 438, r: 87, facing: "W" },
        { id: "ESTAB_SHORES_OUTLET", tpl: "SHOP_CLOTHES", name: "🧥 VICE SHORES DESIGNER ATELIER", district: "NORTH VICE SHORES", c: 172, r: 66, facing: "N" },

        // --- DOWNTOWN VICE CITY, LITTLE CUBA / LITTLE HAVANA, LITTLE HAITI & WYNWOOD ---
        { id: "ESTAB_DOWNTOWN_ARMS", tpl: "SHOP_GUN_SHOP", name: "🔫 CROSSTOWN PAWN & EXECUTIVE ARMS", district: "DOWNTOWN VC", c: 283, r: 169, facing: "E" },
        { id: "ESTAB_BAYFRONT_BISTRO", tpl: "SHOP_RESTAURANT", name: "🥩 BAYFRONT GRAND BRASSERIE", district: "DOWNTOWN VC", c: 281, r: 265, facing: "S" },
        { id: "ESTAB_CALLE_OCHO_CAFE", tpl: "SHOP_RESTAURANT", name: "☕ LITTLE CUBA VENTANITA & GRILL", district: "LITTLE HAVANA", c: 241, r: 287, facing: "N" },
        { id: "ESTAB_HAVANA_BODEGA", tpl: "SHOP_CONVENIENCE", name: "🏪 UNCLE JACK'S LIQUOR LITTLE CUBA", district: "LITTLE HAVANA", c: 229, r: 259, facing: "S" },
        { id: "ESTAB_TOUSSAINT_RUM", tpl: "SHOP_BAR", name: "🥃 TOUSSAINT CREOLE RUM BAR", district: "LITTLE HAITI", c: 178, r: 157, facing: "W" },
        { id: "ESTAB_WYNWOOD_THREADS", tpl: "SHOP_CLOTHES", name: "🕶️ WYNWOOD STREETWEAR & GOLD", district: "WYNWOOD", c: 231, r: 157, facing: "E" },
        { id: "ESTAB_ONLYRAW_STUDIO", tpl: "ONLYRAW_STUDIO", name: "🎙️ ONLYRAW RECORDS STUDIO (DRE'QUAN)", district: "WYNWOOD", c: 218, r: 169, facing: "S" },

        // --- PORT GELLHORN, AMBROSIA & LEONIDA KEYS ---
        { id: "ESTAB_STARLET_MOTEL", tpl: "STARLET_MOTEL", name: "🏩 STARLET MOTEL ROOM #104 (SAFEHOUSE)", district: "PORT GELLHORN", c: 88, r: 205, facing: "S" },
        { id: "ESTAB_TURNPIKE_DINER", tpl: "SHOP_RESTAURANT", name: "🍔 AMBROSIA SUGAR-MILL SMOKEHOUSE", district: "AMBROSIA", c: 170, r: 259, facing: "S" },
        { id: "ESTAB_KELLY_GUN_PAWN", tpl: "SHOP_GUN_SHOP", name: "🔫 PHIL'S AMMU-NATION KELLY COUNTY", district: "PORT GELLHORN", c: 68, r: 143, facing: "E" },
        { id: "ESTAB_RUSTY_ANCHOR", tpl: "SHOP_BAR", name: "⚓ THE RUSTY ANCHOR WATERFRONT BAR", district: "LEONIDA KEYS", c: 224, r: 446, facing: "S" }
    ];

    function getThemeDimensions(theme) {
        return THEME_DIMENSIONS[theme] || { w: CANON_W, h: CANON_H };
    }

    // ============================================================================
    // UNIVERSAL CANONICAL (820x560) <-> ORIENTED VENUE (rw x rh, S|N|E|W) TRANSFORMER
    // ============================================================================
    function transformRect(x, y, w, h, intr) {
        const rw = (intr && intr.w) || CANON_W;
        const rh = (intr && intr.h) || CANON_H;
        const facing = (intr && intr.facing) || "S";
        if (y < 36) {
            const sx = rw / CANON_W;
            return { x: Math.round(x * sx), y, w: Math.max(2, Math.round(w * sx)), h };
        }
        const ix0 = CANON_IX0;
        const iw = Math.max(1, rw - 36);
        const iy0 = CANON_IY0;
        const ih = Math.max(1, rh - 74);

        const u = (x - CANON_IX0) / CANON_IW;
        const du = w / CANON_IW;
        const v = (y - CANON_IY0) / CANON_IH;
        const dv = h / CANON_IH;

        if (facing === "S") {
            const nx = ix0 + u * iw;
            const ny = iy0 + v * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + du * iw);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + dv * ih);
            return { x: x1, y: y1, w: Math.max(2, x2 - x1), h: Math.max(2, y2 - y1) };
        }

        if (facing === "N") {
            const nx = ix0 + (1.0 - (u + du)) * iw;
            const ny = iy0 + (1.0 - (v + dv)) * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + du * iw);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + dv * ih);
            return { x: x1, y: y1, w: Math.max(2, x2 - x1), h: Math.max(2, y2 - y1) };
        }

        if (facing === "E") {
            const nw = dv * iw;
            const nh = du * ih;
            const nx = ix0 + v * iw;
            const ny = iy0 + (1.0 - (u + du)) * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + nw);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + nh);
            return { x: x1, y: y1, w: Math.max(2, x2 - x1), h: Math.max(2, y2 - y1) };
        }

        if (facing === "W") {
            const nw = dv * iw;
            const nh = du * ih;
            const nx = ix0 + (1.0 - (v + dv)) * iw;
            const ny = iy0 + u * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + nw);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + nh);
            return { x: x1, y: y1, w: Math.max(2, x2 - x1), h: Math.max(2, y2 - y1) };
        }

        return { x, y, w, h };
    }

    function transformPoint(x, y, angle, intr) {
        const rw = (intr && intr.w) || CANON_W;
        const rh = (intr && intr.h) || CANON_H;
        const facing = (intr && intr.facing) || "S";
        const ang = angle || 0;
        if (y < 36) {
            return { x: Math.round(x * (rw / CANON_W)), y, angle: ang };
        }
        const ix0 = CANON_IX0;
        const iw = Math.max(1, rw - 36);
        const iy0 = CANON_IY0;
        const ih = Math.max(1, rh - 74);
        const u = (x - CANON_IX0) / CANON_IW;
        const v = (y - CANON_IY0) / CANON_IH;

        if (facing === "S") {
            return {
                x: Math.round(ix0 + u * iw),
                y: Math.round(iy0 + v * ih),
                angle: ang
            };
        }
        if (facing === "N") {
            return {
                x: Math.round(ix0 + (1.0 - u) * iw),
                y: Math.round(iy0 + (1.0 - v) * ih),
                angle: ang + Math.PI
            };
        }
        if (facing === "E") {
            return {
                x: Math.round(ix0 + v * iw),
                y: Math.round(iy0 + (1.0 - u) * ih),
                angle: ang - Math.PI * 0.5
            };
        }
        if (facing === "W") {
            return {
                x: Math.round(ix0 + (1.0 - v) * iw),
                y: Math.round(iy0 + u * ih),
                angle: ang + Math.PI * 0.5
            };
        }
        return { x, y, angle: ang };
    }

    // Inverse mapping from oriented room coordinates back to canonical (820x560) for material/zone lookup
    function inverseTransformPoint(rx, ry, intr) {
        const rw = (intr && intr.w) || CANON_W;
        const rh = (intr && intr.h) || CANON_H;
        const facing = (intr && intr.facing) || "S";
        const iw = Math.max(1, rw - 36);
        const ih = Math.max(1, rh - 74);
        const uPrime = (rx - CANON_IX0) / iw;
        const vPrime = (ry - CANON_IY0) / ih;
        let u = uPrime, v = vPrime;
        if (facing === "N") {
            u = 1.0 - uPrime;
            v = 1.0 - vPrime;
        } else if (facing === "E") {
            u = 1.0 - vPrime;
            v = uPrime;
        } else if (facing === "W") {
            u = vPrime;
            v = 1.0 - uPrime;
        }
        return {
            x: CANON_IX0 + u * CANON_IW,
            y: CANON_IY0 + v * CANON_IH
        };
    }

    function getEntrancePose(intr) {
        const rw = (intr && intr.w) || CANON_W;
        const rh = (intr && intr.h) || CANON_H;
        const y0 = 40;
        const midY = Math.round(y0 + (rh - y0) * 0.5);
        const facing = (intr && intr.facing) || "S";

        if (facing === "N") {
            return {
                facing: "N",
                spawnX: Math.round(rw * 0.5),
                spawnY: y0 + 76,
                spawnAngle: Math.PI * 0.5,
                partnerX: Math.round(rw * 0.5 + 48),
                partnerY: y0 + 56,
                partnerAngle: Math.PI * 0.55,
                exitX: Math.round(rw * 0.5),
                exitY: y0 + 16,
                minX: 28,
                maxX: rw - 28,
                minY: y0 + 14,
                maxY: rh - 26,
                isAtExit(px, py) {
                    return py <= y0 + 34 && Math.abs(px - rw * 0.5) < 68;
                },
                isNearExit(px, py) {
                    return py <= y0 + 52 && Math.abs(px - rw * 0.5) < 76;
                }
            };
        }
        if (facing === "E") {
            return {
                facing: "E",
                spawnX: rw - 86,
                spawnY: midY,
                spawnAngle: Math.PI,
                partnerX: rw - 54,
                partnerY: midY + 44,
                partnerAngle: -Math.PI * 0.85,
                exitX: rw - 16,
                exitY: midY,
                minX: 28,
                maxX: rw - 14,
                minY: 66,
                maxY: rh - 26,
                isAtExit(px, py) {
                    return px >= rw - 38 && Math.abs(py - midY) < 62;
                },
                isNearExit(px, py) {
                    return px >= rw - 56 && Math.abs(py - midY) < 72;
                }
            };
        }
        if (facing === "W") {
            return {
                facing: "W",
                spawnX: 86,
                spawnY: midY,
                spawnAngle: 0,
                partnerX: 54,
                partnerY: midY - 44,
                partnerAngle: Math.PI * 0.15,
                exitX: 16,
                exitY: midY,
                minX: 14,
                maxX: rw - 28,
                minY: 66,
                maxY: rh - 26,
                isAtExit(px, py) {
                    return px <= 38 && Math.abs(py - midY) < 62;
                },
                isNearExit(px, py) {
                    return px <= 56 && Math.abs(py - midY) < 72;
                }
            };
        }
        return {
            facing: "S",
            spawnX: Math.round(rw * 0.5),
            spawnY: rh - 82,
            spawnAngle: -Math.PI * 0.5,
            partnerX: Math.round(rw * 0.5 - 48),
            partnerY: rh - 54,
            partnerAngle: -Math.PI * 0.42,
            exitX: Math.round(rw * 0.5),
            exitY: rh - 16,
            minX: 28,
            maxX: rw - 28,
            minY: 66,
            maxY: rh - 14,
            isAtExit(px, py) {
                return py >= rh - 36 && Math.abs(px - rw * 0.5) < 68;
            },
            isNearExit(px, py) {
                return py >= rh - 52 && Math.abs(px - rw * 0.5) < 76;
            }
        };
    }

    // ============================================================================
    // REAL-WORLD .CMP CUTAWAY ANCHORING: Maps local interior (0..rw, 0..rh) onto
    // the exact Vice City street facade so the live city, ocean & traffic sit right
    // outside the open doorway and storefront windows!
    // ============================================================================
    function getWorldOrigin(intr) {
        if (!intr) return { x: 0, y: 0, wallX: 0, wallY: 0 };
        const ts = 64;
        const rw = intr.w || CANON_W;
        const rh = intr.h || CANON_H;
        const facing = intr.facing || "S";
        const doorX = Number(intr.doorX) || 0;
        const doorY = Number(intr.doorY) || 0;
        const cacheKey = `${doorX}|${doorY}|${facing}|${rw}|${rh}|${intr.isEstatePortico ? 1 : 0}`;
        if (intr._worldOriginCache && intr._worldOriginKey === cacheKey) {
            return intr._worldOriginCache;
        }

        const fnv = ({ S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] })[facing] || [0, 1];
        let wallX, wallY;
        if (intr.isEstatePortico) {
            wallX = doorX - fnv[0] * 10;
            wallY = doorY - fnv[1] * 10;
        } else {
            const tcx = Math.floor(doorX / ts) * ts + ts * 0.5;
            const tcy = Math.floor(doorY / ts) * ts + ts * 0.5;
            wallX = tcx - fnv[0] * (ts * 0.5);
            wallY = tcy - fnv[1] * (ts * 0.5);
        }

        const doorMidY = Math.round(40 + (rh - 40) * 0.5);
        let ox = 0, oy = 0;
        if (facing === "S") {
            ox = Math.round(wallX - rw * 0.5);
            oy = Math.round(wallY - (rh - 9));
        } else if (facing === "N") {
            ox = Math.round(wallX - rw * 0.5);
            oy = Math.round(wallY - 49);
        } else if (facing === "E") {
            ox = Math.round(wallX - (rw - 9));
            oy = Math.round(wallY - doorMidY);
        } else if (facing === "W") {
            ox = Math.round(wallX - 9);
            oy = Math.round(wallY - doorMidY);
        }

        const res = {
            x: ox,
            y: oy,
            wallX,
            wallY,
            // Inner room cutaway footprint in 64px world block units (discards .CMP blocks inside the room)
            cutMinBX: (ox - 2) / ts,
            cutMinBZ: (oy + 38) / ts,
            cutMaxBX: (ox + rw + 2) / ts,
            cutMaxBZ: (oy + rh - 2) / ts,
            // Outer roof-slice collar in block units (slices tall neighbor building roofs > 2.24 so they never overhang the cutaway view)
            outerMinBX: (ox - 44) / ts,
            outerMinBZ: (oy + 4) / ts,
            outerMaxBX: (ox + rw + 44) / ts,
            outerMaxBZ: (oy + rh + 96) / ts
        };
        intr._worldOriginKey = cacheKey;
        intr._worldOriginCache = res;
        return res;
    }

    // ============================================================================
    // ORIENTED 3D STOREFRONT & SIDE WINDOWS (for translucent 3D glass bays + sunbeams)
    // ============================================================================
    function getWindows(intr) {
        if (!intr) return [];
        const rw = intr.w || CANON_W;
        const rh = intr.h || CANON_H;
        const facing = intr.facing || "S";
        const t = intr.theme || "SHOP_CONVENIENCE";
        if (t === "SPACE_BUNKER" || t === "PRISON_BLOCK") return [];

        const wins = [];
        const doorMidY = Math.round(40 + (rh - 40) * 0.5);
        const isNightVenue = (t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "ONLYRAW_STUDIO");

        // Primary storefront windows flanking the active street entrance
        if (facing === "S") {
            const dL = rw * 0.5 - 86, dR = rw * 0.5 + 86;
            if (dL > 130) wins.push({ wall: "S", x: 54, y: rh - 18, w: Math.min(180, dL - 76), h: 18, sign: !isNightVenue });
            if (rw - dR > 130) wins.push({ wall: "S", x: dR + 22, y: rh - 18, w: Math.min(180, rw - dR - 76), h: 18, sign: true });
        } else if (facing === "N") {
            const dL = rw * 0.5 - 86, dR = rw * 0.5 + 86;
            if (dL > 130) wins.push({ wall: "N", x: 54, y: 40, w: Math.min(180, dL - 76), h: 18, sign: !isNightVenue });
            if (rw - dR > 130) wins.push({ wall: "N", x: dR + 22, y: 40, w: Math.min(180, rw - dR - 76), h: 18, sign: true });
        } else if (facing === "E") {
            const dT = doorMidY - 74, dB = doorMidY + 74;
            if (dT - 40 > 96) wins.push({ wall: "E", x: rw - 18, y: 68, w: 18, h: Math.min(130, dT - 86), sign: true });
            if (rh - 18 - dB > 96) wins.push({ wall: "E", x: rw - 18, y: dB + 18, w: 18, h: Math.min(130, rh - 44 - dB), sign: !isNightVenue });
        } else if (facing === "W") {
            const dT = doorMidY - 74, dB = doorMidY + 74;
            if (dT - 40 > 96) wins.push({ wall: "W", x: 0, y: 68, w: 18, h: Math.min(130, dT - 86), sign: true });
            if (rh - 18 - dB > 96) wins.push({ wall: "W", x: 0, y: dB + 18, w: 18, h: Math.min(130, rh - 44 - dB), sign: !isNightVenue });
        }

        // Sunlit resort / restaurant / mansion side picture windows
        if (!isNightVenue && (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL" || t === "SHOP_RESTAURANT" || t === "DINER_PAWN" || t === "MANSION" || t === "STARLET_MOTEL")) {
            if (facing !== "N") {
                wins.push({ wall: "N", x: Math.round(rw * 0.16), y: 40, w: 108, h: 18, sign: false });
                wins.push({ wall: "N", x: Math.round(rw * 0.70), y: 40, w: 108, h: 18, sign: false });
            }
        }
        return wins;
    }

    // ============================================================================
    // PHYSICAL 3D CASH REGISTERS & SMASHABLE GLASS DISPLAY CASES (GTA VI Hold-Ups!)
    // ============================================================================
    function getBreakables(intr) {
        if (!intr) return [];
        const key = `${intr.facing || "S"}_${intr.w}_${intr.h}`;
        if (Array.isArray(intr._breakables) && intr._breakablesKey === key) {
            return intr._breakables;
        }
        const t = intr.theme || "SHOP_CONVENIENCE";
        const raw = [];
        if (t === "SHOP_GUN_SHOP") {
            raw.push({ id: "reg_main", kind: "REGISTER", x: 268, y: 130, w: 24, h: 20, loot: 220 });
            raw.push({ id: "case_1", kind: "GLASS_CASE", x: 298, y: 129, w: 60, h: 24, loot: 260 });
            raw.push({ id: "case_2", kind: "GLASS_CASE", x: 364, y: 129, w: 60, h: 24, loot: 260 });
            raw.push({ id: "case_3", kind: "GLASS_CASE", x: 430, y: 129, w: 60, h: 24, loot: 280 });
        } else if (t === "DINER_PAWN") {
            raw.push({ id: "reg_diner", kind: "REGISTER", x: 332, y: 134, w: 26, h: 20, loot: 240 });
            raw.push({ id: "case_pawn1", kind: "GLASS_CASE", x: 544, y: 125, w: 88, h: 24, loot: 290 });
            raw.push({ id: "case_pawn2", kind: "GLASS_CASE", x: 646, y: 125, w: 92, h: 24, loot: 310 });
        } else if (t === "SHOP_CONVENIENCE") {
            raw.push({ id: "reg_mart", kind: "REGISTER", x: 112, y: 234, w: 26, h: 20, loot: 210 });
            raw.push({ id: "case_lotto", kind: "GLASS_CASE", x: 46, y: 234, w: 56, h: 22, loot: 180 });
        } else if (t === "SHOP_CLOTHES") {
            raw.push({ id: "reg_pos", kind: "REGISTER", x: 610, y: 120, w: 24, h: 20, loot: 240 });
            raw.push({ id: "case_jewel1", kind: "GLASS_CASE", x: 642, y: 119, w: 56, h: 24, loot: 320 });
            raw.push({ id: "case_jewel2", kind: "GLASS_CASE", x: 704, y: 119, w: 56, h: 24, loot: 320 });
        } else if (t === "SHOP_RESTAURANT") {
            raw.push({ id: "reg_bistro", kind: "REGISTER", x: 636, y: 68, w: 26, h: 20, loot: 230 });
        } else if (t === "SHOP_BAR" || t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "MALIBU_CLUB") {
            raw.push({ id: "reg_bar", kind: "REGISTER", x: 472, y: 125, w: 26, h: 20, loot: 220 });
        } else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL") {
            raw.push({ id: "reg_hotel", kind: "REGISTER", x: 466, y: 180, w: 26, h: 20, loot: 240 });
        } else if (t === "STARLET_MOTEL") {
            raw.push({ id: "reg_motel", kind: "REGISTER", x: 422, y: 126, w: 26, h: 20, loot: 200 });
        } else if (t === "ONLYRAW_STUDIO") {
            raw.push({ id: "case_gold", kind: "GLASS_CASE", x: 612, y: 110, w: 72, h: 24, loot: 300 });
        }

        const prevStates = {};
        if (Array.isArray(intr._breakables)) {
            for (const b of intr._breakables) prevStates[b.id] = b.brokenUntilMs || 0;
        }
        const nowMs = Date.now();
        intr._breakables = raw.map((item) => {
            const tr = transformRect(item.x, item.y, item.w, item.h, intr);
            const until = prevStates[item.id] || 0;
            return {
                id: item.id,
                kind: item.kind,
                x: tr.x,
                y: tr.y,
                w: tr.w,
                h: tr.h,
                cx: tr.x + tr.w * 0.5,
                cy: tr.y + tr.h * 0.5,
                loot: item.loot,
                brokenUntilMs: until,
                broken: until > nowMs
            };
        });
        intr._breakablesKey = key;
        return intr._breakables;
    }

    // ============================================================================
    // MATERIAL-ACCURATE FLOOR SURFACE RESOLVER (for authentic indoor footsteps!)
    // ============================================================================
    function getSurfaceAt(intr, rx, ry) {
        if (!intr) return "TILE";
        const cp = inverseTransformPoint(rx, ry, intr);
        const x = cp.x, y = cp.y;
        const t = intr.theme || "SHOP_CONVENIENCE";

        if (t === "SPACE_BUNKER") return (x > 260 && x < 560) ? "METAL" : "TILE";
        if (t === "PRISON_BLOCK") return (y < 216 && x > 286 && x < 516) ? "WOOD" : "METAL";
        if (t === "SHOP_GUN_SHOP") {
            if (x >= 260 && x <= 496 && y >= 170 && y <= 274) return "CARPET";
            if (x < 224) return "WOOD";
            return "TILE";
        }
        if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL") {
            if ((x >= 350 && x <= 470 && y >= 205) || (x < 220 && y >= 84 && y <= 495)) return "CARPET";
            if (x < 248) return "WOOD";
            return "MARBLE";
        }
        if (t === "SHOP_CLOTHES") {
            if (x >= 334 && x <= 486 && y >= 164 && y <= 424) return "CARPET";
            if (x < 242 || x > 562) return "WOOD";
            return "MARBLE";
        }
        if (t === "MANSION") {
            if (x >= 344 && x <= 476 && y >= 145) return "CARPET";
            if (x < 258) return "WOOD";
            return "MARBLE";
        }
        if (t === "SHOP_BAR") {
            if (x < 248) return "CARPET";
            return "WOOD";
        }
        if (t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "MALIBU_CLUB" || t === "ONLYRAW_STUDIO") {
            if (x < 248) return "CARPET";
            if (x >= 280 && x <= 540 && y >= 195 && y <= 400) return "WOOD";
            return "MARBLE";
        }
        if (t === "SHOP_RESTAURANT" || t === "DINER_PAWN") {
            if (y < 194) return "TILE";
            if (x >= 350 && x <= 470 && t === "SHOP_RESTAURANT") return "CARPET";
            if (x > 500) return "WOOD";
            return "TILE";
        }
        if (t === "STARLET_MOTEL") {
            if (x < 280) return "CARPET";
            return "TILE";
        }
        return "TILE";
    }

    function orientInterior(intr) {
        if (!intr) return intr;
        const dims = getThemeDimensions(intr.theme);
        if (!intr._customSizeAssigned) {
            intr.w = dims.w;
            intr.h = dims.h;
            intr._customSizeAssigned = true;
        }
        if (!intr.facing) intr.facing = "S";

        if (!intr._rawStations && Array.isArray(intr.stations)) {
            intr._rawStations = intr.stations.map(st => ({ ...st }));
        }
        if (!intr._rawNpcs && Array.isArray(intr.npcs)) {
            intr._rawNpcs = intr.npcs.map(npc => ({ ...npc }));
        }

        if (Array.isArray(intr._rawStations)) {
            intr.stations = intr._rawStations.map(st => {
                const pt = transformPoint(st.x, st.y, 0, intr);
                return { ...st, x: pt.x, y: pt.y };
            });
        }
        if (Array.isArray(intr._rawNpcs)) {
            intr.npcs = intr._rawNpcs.map((npc, idx) => {
                const pt = transformPoint(npc.x, npc.y, npc.angle !== undefined ? npc.angle : Math.PI * 0.5, intr);
                return {
                    ...npc,
                    x: pt.x,
                    y: pt.y,
                    homeX: pt.x,
                    homeY: pt.y,
                    homeAngle: pt.angle,
                    angle: pt.angle,
                    hp: 100,
                    maxHp: 100,
                    dead: false,
                    fleeing: false,
                    hostile: false,
                    fireCooldown: 0.4 + (idx % 3) * 0.25,
                    walkPhase: idx * 1.37
                };
            });
        }
        intr._orientedFacing = intr.facing;
        intr._worldOriginKey = null;
        intr._breakablesKey = null;
        getBreakables(intr);
        return intr;
    }

    function hasTreeOnTile(map, c, r) {
        const ts = 64;
        const lists = [map.trees, map.vicePalms];
        for (const list of lists) {
            if (!Array.isArray(list)) continue;
            for (let i = 0; i < list.length; i++) {
                const t = list[i];
                if (Math.floor(t.x / ts) === c && Math.floor(t.y / ts) === r) return true;
            }
        }
        return false;
    }

    function computeDoorPixelPos(c, r, facing, ts = 64) {
        let doorX = (c + 0.5) * ts;
        let doorY = (r + 0.5) * ts;
        if (facing === "S") doorY = r * ts + 22;
        else if (facing === "N") doorY = (r + 1) * ts - 22;
        else if (facing === "E") doorX = c * ts + 22;
        else if (facing === "W") doorX = (c + 1) * ts - 22;
        return { doorX, doorY };
    }

    function snapDoorToBuildingFacade(map, targetC, targetR, preferredFacing, maxRad = 18) {
        const cols = 512;
        const rows = 512;
        const ground = map.surfaceGround;
        const surfZ = map.surfaceLayer;
        if (!ground) return null;

        const isBuilding = (c, r) => {
            if (c < 2 || r < 2 || c >= cols - 2 || r >= rows - 2) return false;
            const idx = r * cols + c;
            return ground[idx] === 5 && (!surfZ || surfZ[idx] >= 3);
        };
        const isWalkableSidewalk = (c, r) => {
            if (c < 2 || r < 2 || c >= cols - 2 || r >= rows - 2) return false;
            const idx = r * cols + c;
            return ground[idx] === 3 && (!surfZ || surfZ[idx] <= 2);
        };

        const dirs = [
            { dx: 0, dy: -1, facing: "S" },
            { dx: -1, dy: 0, facing: "E" },
            { dx: 1, dy: 0, facing: "W" },
            { dx: 0, dy: 1, facing: "N" }
        ];

        let best = null;
        let bestScore = 1e9;
        for (let dr = -maxRad; dr <= maxRad; dr++) {
            for (let dc = -maxRad; dc <= maxRad; dc++) {
                const c = targetC + dc;
                const r = targetR + dr;
                if (!isWalkableSidewalk(c, r)) continue;
                const treePen = hasTreeOnTile(map, c, r) ? 14.0 : 0.0;
                const dist = Math.hypot(dc, dr);
                for (const d of dirs) {
                    if (!isBuilding(c + d.dx, r + d.dy)) continue;
                    const outG = ground[(r - d.dy) * cols + (c - d.dx)];
                    if (outG !== 2 && outG !== 3) continue;
                    const perpX = d.dy;
                    const perpY = d.dx;
                    const wallCont = (isBuilding(c + d.dx + perpX, r + d.dy + perpY) ? 1 : 0) +
                                     (isBuilding(c + d.dx - perpX, r + d.dy - perpY) ? 1 : 0);
                    const swCont = (!isBuilding(c + perpX, r + perpY) ? 1 : 0) +
                                   (!isBuilding(c - perpX, r - perpY) ? 1 : 0);
                    const cornerPen = (wallCont === 2 ? 0.0 : (wallCont === 1 ? 3.5 : 8.0)) + (2 - swCont) * 6.0;
                    const facePen = (preferredFacing && d.facing !== preferredFacing) ? 9.5 : 0.0;
                    const score = dist + facePen + cornerPen + treePen;
                    if (score < bestScore) {
                        bestScore = score;
                        best = { c, r, facing: d.facing };
                    }
                }
            }
        }
        return best;
    }

    function snapLandmarkDoors(map) {
        if (!map || !Array.isArray(map.interiors)) return;
        const ts = 64;

        for (const intr of map.interiors) {
            if (!intr) continue;
            const dims = getThemeDimensions(intr.theme);
            intr.w = dims.w;
            intr.h = dims.h;
            intr._customSizeAssigned = true;

            if (intr.isShop || intr.isEstatePortico || intr.id === "STAR_ISLAND" || intr.id === "SERA_SPACE" || (intr.id && intr.id.startsWith("ESTATE_"))) {
                orientInterior(intr);
                continue;
            }

            if (intr._origDoorX === undefined) {
                intr._origDoorX = intr.doorX;
                intr._origDoorY = intr.doorY;
                intr._origFacing = intr.facing || null;
            }

            const c0 = Math.floor(intr._origDoorX / ts);
            const r0 = Math.floor(intr._origDoorY / ts);
            const snapped = snapDoorToBuildingFacade(map, c0, r0, intr._origFacing, 12);

            if (snapped) {
                const pos = computeDoorPixelPos(snapped.c, snapped.r, snapped.facing, ts);
                intr.doorX = pos.doorX;
                intr.doorY = pos.doorY;
                intr.facing = snapped.facing;
            }
            orientInterior(intr);
        }
    }

    function generate(map) {
        const ts = 64;
        if (!map || !map.surfaceGround) return [];

        const existing = (map.interiors || []).map((it) => ({ c: it.doorX / ts, r: it.doorY / ts }));
        const placed = [];

        for (let i = 0; i < HANDCRAFTED_ESTABLISHMENTS.length; i++) {
            const spec = HANDCRAFTED_ESTABLISHMENTS[i];
            const tpl = SHOP_TEMPLATES[spec.tpl];
            if (!tpl) continue;

            const snapped = snapDoorToBuildingFacade(map, spec.c, spec.r, spec.facing, 28);
            if (!snapped) continue;
            const finalC = snapped.c;
            const finalR = snapped.r;
            const finalFacing = snapped.facing;

            let tooClose = false;
            for (const ex of existing) {
                if (Math.hypot(ex.c - finalC, ex.r - finalR) < 2.2) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            const pos = computeDoorPixelPos(finalC, finalR, finalFacing, ts);
            const intr = {
                id: spec.id,
                name: spec.name,
                subtitle: `${spec.district} — ${tpl.subtitle}`,
                theme: tpl.theme,
                accent: tpl.accent,
                matRGB: tpl.matRGB,
                facing: finalFacing,
                doorX: pos.doorX,
                doorY: pos.doorY,
                w: tpl.w,
                h: tpl.h,
                _customSizeAssigned: true,
                isShop: true,
                npcs: tpl.buildNpcs(),
                stations: tpl.buildStations(spec.id)
            };

            orientInterior(intr);
            placed.push(intr);
            existing.push({ c: finalC, r: finalR });
        }

        return placed;
    }

    // ============================================================================
    // COMPLEX MULTI-ROOM ARCHITECTURAL FLOORPLANS (Canonical 820x560 Space)
    // Automatically scaled & rotated to (intr.w, intr.h, intr.facing)!
    // ============================================================================
    function getRawObstacles(intr) {
        if (!intr) return [];
        const t = intr.theme || "";
        const rw = CANON_W;
        const rh = CANON_H;
        const obs = [];
        const add = (x, y, w, h, isWall = false) => obs.push({ x, y, w, h, isWall });

        if (t === "SHOP_GUN_SHOP") {
            add(18, 414, 152, 16, true);
            add(266, 414, 288, 16, true);
            add(650, 414, rw - 668, 16, true);
            add(224, 56, 16, 120, true);
            add(224, 266, 16, 148, true);
            add(516, 56, 16, 160, true);
            add(516, 306, 16, 108, true);
            add(36, 68, 164, 26);
            add(36, 352, 164, 28);
            add(262, 128, 232, 28);
            add(258, 288, 86, 28);
            add(412, 288, 86, 28);
            add(548, 312, 236, 22);
            add(54, 468, 96, 30);
            add(664, 468, 96, 30);
        } else if (t === "SHOP_RESTAURANT") {
            add(18, 424, 172, 16, true);
            add(268, 424, 78, 16, true);
            add(474, 424, 78, 16, true);
            add(630, 424, rw - 648, 16, true);
            add(18, 192, 230, 16, true);
            add(336, 192, 200, 16, true);
            add(622, 192, rw - 640, 16, true);
            add(576, 56, 16, 80, true);
            add(552, 208, 16, 80, true);
            add(552, 376, 16, 48, true);
            add(48, 64, 480, 28);
            add(220, 124, 180, 24);
            add(628, 66, 144, 30);
            add(36, 238, 96, 42);
            add(36, 338, 96, 42);
            add(254, 252, 62, 46);
            add(402, 252, 62, 46);
            add(254, 354, 62, 46);
            add(402, 354, 62, 46);
            add(56, 466, 64, 36);
        } else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL") {
            add(250, 424, 98, 16, true);
            add(472, 424, 92, 16, true);
            add(248, 56, 16, 180, true);
            add(248, 326, 16, rh - 344, true);
            add(18, 282, 124, 16, true);
            add(548, 56, 16, 180, true);
            add(548, 326, 16, rh - 344, true);
            add(658, 252, rw - 676, 16, true);
            add(316, 178, 188, 30);
            add(272, 278, 34, 74);
            add(502, 278, 34, 74);
            add(28, 96, 118, 86);
            add(28, 442, 112, 30);
            add(584, 112, 176, 28);
            add(588, 344, 176, 112);
        } else if (t === "SHOP_CLOTHES") {
            add(244, 424, 100, 16, true);
            add(476, 424, 92, 16, true);
            add(242, 56, 16, 180, true);
            add(242, 324, 16, rh - 342, true);
            add(18, 248, 122, 16, true);
            add(562, 56, 16, 180, true);
            add(562, 324, 16, rh - 342, true);
            add(682, 278, rw - 700, 16, true);
            add(682, 398, rw - 700, 16, true);
            add(358, 266, 104, 72);
            add(42, 122, 124, 28);
            add(42, 316, 124, 26);
            add(602, 118, 164, 28);
        } else if (t === "SHOP_CONVENIENCE") {
            add(18, 186, 318, 16, true);
            add(436, 186, rw - 454, 16, true);
            add(228, 186, 16, 106, true);
            add(608, 186, 16, 110, true);
            add(608, 386, 16, rh - 404, true);
            add(38, 232, 168, 28);
            add(286, 248, 42, 164);
            add(398, 248, 42, 164);
            add(510, 248, 42, 164);
            add(54, 76, 140, 32);
            add(580, 76, 160, 32);
        } else if (t === "SHOP_BAR" || t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "MALIBU_CLUB" || t === "ONLYRAW_STUDIO") {
            add(248, 428, 98, 16, true);
            add(474, 428, 92, 16, true);
            add(248, 56, 16, 180, true);
            add(248, 326, 16, rh - 344, true);
            add(18, 246, 124, 16, true);
            add(562, 56, 16, 180, true);
            add(562, 326, 16, rh - 344, true);
            add(668, 246, rw - 686, 16, true);
            add(312, 122, 196, 32);
            if (t === "SHOP_BAR") {
                add(56, 338, 124, 64);
            } else if (t === "STRIP_CLUB") {
                add(368, 224, 84, 132);
            }
            add(608, 108, 148, 28);
        } else if (t === "STARLET_MOTEL") {
            // West Room #104 Bedroom & Bathroom Wing Wall (x = 276, door at y=240..326)
            add(276, 56, 16, 184, true);
            add(276, 326, 16, rh - 344, true);
            // East Coin Laundry & Ice Machine Alcove Wall (x = 566, door at y=240..326)
            add(566, 56, 16, 184, true);
            add(566, 326, 16, rh - 344, true);
            // Center Motel Night-Office Counter, Room #104 Queen Bed, TV Credenza & Laundry Machines
            add(336, 124, 176, 28);
            add(38, 98, 118, 82);
            add(38, 424, 124, 30);
            add(612, 96, 146, 32);
            add(724, 286, 48, 148);
        } else if (t === "MANSION") {
            add(258, 426, 88, 16, true);
            add(474, 426, 88, 16, true);
            add(258, 228, 98, 16, true);
            add(464, 228, 98, 16, true);
            add(258, 56, 16, 188, true);
            add(258, 334, 16, rh - 352, true);
            add(18, 258, 132, 16, true);
            add(556, 56, 16, 188, true);
            add(556, 334, 16, rh - 352, true);
            add(658, 228, rw - 676, 16, true);
            add(336, 104, 148, 32);
            add(374, 304, 72, 68);
            add(42, 92, 176, 30);
            add(594, 326, 172, 134);
        } else if (t === "SPACE_BUNKER") {
            add(252, 426, 102, 16, true);
            add(466, 426, 102, 16, true);
            add(252, 56, 16, 182, true);
            add(252, 328, 16, rh - 346, true);
            add(564, 56, 16, 182, true);
            add(564, 328, 16, rh - 346, true);
            add(320, 118, 180, 28);
            add(290, 266, 96, 26);
            add(434, 266, 96, 26);
            add(44, 168, 74, 136);
            add(692, 214, 68, 68);
        } else if (t === "PRISON_BLOCK") {
            add(246, 426, 108, 16, true);
            add(466, 426, 108, 16, true);
            add(278, 56, 16, 152, true);
            add(516, 56, 16, 152, true);
            add(18, 208, 127, 16, true);
            add(215, 208, 150, 16, true);
            add(435, 208, 160, 16, true);
            add(665, 208, rw - 683, 16, true);
            add(246, 298, 16, rh - 316, true);
            add(554, 298, 16, rh - 316, true);
            add(36, 82, 86, 44);
            add(332, 102, 136, 28);
            add(566, 92, 196, 28);
            add(312, 336, 196, 36);
        } else if (t === "DINER_PAWN") {
            add(484, 56, 16, 172, true);
            add(484, 318, 16, rh - 336, true);
            add(18, 426, 147, 16, true);
            add(315, 426, 169, 16, true);
            add(500, 228, 80, 16, true);
            add(668, 228, rw - 686, 16, true);
            add(56, 132, 376, 26);
            add(38, 256, 118, 36);
            add(38, 344, 118, 36);
            add(536, 124, 210, 28);
            add(546, 346, 196, 32);
        }
        return obs;
    }

    function getObstacles(intr) {
        if (!intr) return [];
        const raw = getRawObstacles(intr);
        return raw.map(ob => {
            const tr = transformRect(ob.x, ob.y, ob.w, ob.h, intr);
            return {
                x: tr.x,
                y: tr.y,
                w: tr.w,
                h: tr.h,
                isWall: !!ob.isWall
            };
        });
    }

    window.ShopInteriors = {
        CANON_W,
        CANON_H,
        THEME_DIMENSIONS,
        SHOP_TEMPLATES,
        HANDCRAFTED_ESTABLISHMENTS,
        getThemeDimensions,
        transformRect,
        transformPoint,
        inverseTransformPoint,
        getEntrancePose,
        getWorldOrigin,
        getWindows,
        getBreakables,
        getSurfaceAt,
        orientInterior,
        snapLandmarkDoors,
        generate,
        getRawObstacles,
        getObstacles
    };
})();
