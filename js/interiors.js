// ============================================================================
// VICE CITY '97 — HAND-CRAFTED MULTI-ROOM BUILDING INTERIORS & ORIENTATION ENGINE
// Non-generative architectural layouts with 4-way building entrance matching
// (facing: "S" | "N" | "E" | "W")
// ============================================================================

(function () {
    const SHOP_TEMPLATES = {
        SHOP_GUN_SHOP: {
            theme: "SHOP_GUN_SHOP",
            accent: "#f97316",
            matRGB: [0.98, 0.45, 0.12],
            w: 820,
            h: 560,
            subtitle: "ARMORED VESTIBULE, GLASS ORDNANCE SHOWCASE, GUNSMITH VAULT & 4-LANE FIRING RANGE",
            buildStations(id) {
                return [
                    { id: `${id}_PISTOL`, x: 304, y: 206, color: "#fbbf24", label: "🔫 9MM PISTOL CRATE ($250)", sub: "BUY PISTOL + 40 ROUNDS!", action: "BUY_PISTOL", cost: 250 },
                    { id: `${id}_UZI`, x: 452, y: 206, color: "#f97316", label: "🔫 MICRO-UZI SUBMACHINE GUN ($650)", sub: "BUY UZI + 80 ROUNDS!", action: "BUY_UZI", cost: 650 },
                    { id: `${id}_SHOTGUN`, x: 378, y: 362, color: "#ef4444", label: "💥 PUMP SHOTGUN ($900)", sub: "BUY SHOTGUN + 25 SHELLS!", action: "BUY_SHOTGUN", cost: 900 },
                    { id: `${id}_ARMOR`, x: 118, y: 296, color: "#38bdf8", label: "🛡️ KEVLAR TACTICAL VEST ($500)", sub: "+100% BODY ARMOR!", action: "BUY_ARMOR", cost: 500 },
                    { id: `${id}_ROCKET`, x: 666, y: 382, color: "#a855f7", label: "🚀 HEAVY ROCKET LAUNCHER ($2,500)", sub: "RANGE SPECIAL: ROCKET + 8 ROCKETS!", action: "BUY_ROCKET", cost: 2500 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 378, y: 96, angle: Math.PI * 0.5, type: "gang", label: "ARMS DEALER", dialog: "WELCOME TO AMMU-NATION! NO RECEIPTS, NO QUESTIONS!" },
                    { x: 118, y: 126, angle: Math.PI * 0.5, type: "civ0", label: "GUNSMITH", dialog: "CUSTOM BARRELS AND KEVLAR VESTS IN THE BACK VAULT!" },
                    { x: 410, y: 458, angle: Math.PI * 0.5, type: "police", label: "RANGE OFFICER", dialog: "KEEP YOUR PIECE HOLSTERED IN THE VESTIBULE!" },
                    { x: 596, y: 348, angle: -Math.PI * 0.5, type: "civ1", label: "SHOOTER", dialog: "TESTING OUT THIS NEW 12-GAUGE ON LANE 2!" },
                    { x: 712, y: 348, angle: -Math.PI * 0.5, type: "gang", label: "MARKSMAN", dialog: "CENTER MASS EVERY TIME, PAL." }
                ];
            }
        },

        SHOP_RESTAURANT: {
            theme: "SHOP_RESTAURANT",
            accent: "#ef4444",
            matRGB: [0.95, 0.25, 0.25],
            w: 820,
            h: 560,
            subtitle: "MAITRE D' FOYER, CHANDELIER DINING HALL, VIP WINE CELLAR & COMMERCIAL KITCHEN",
            buildStations(id) {
                return [
                    { id: `${id}_EXPRESS`, x: 185, y: 245, color: "#fbbf24", label: "🍕 HOT SLICE & ESPRESSO ($60)", sub: "+45 HP INSTANT HEAL!", action: "BUY_SNACK", cost: 60 },
                    { id: `${id}_FEAST`, x: 410, y: 245, color: "#22c55e", label: "🥩 CHEF'S FULL PLATTER ($180)", sub: "100% FULL HEALTH + SPRINT BOOST!", action: "BUY_MEAL", cost: 180 },
                    { id: `${id}_WINE`, x: 685, y: 350, color: "#e879f9", label: "🍷 VINTAGE RESERVE BOTTLE ($300)", sub: "100% HEALTH + +50 ARMOR!", action: "BUY_DRINK", cost: 300 },
                    { id: `${id}_REG`, x: 685, y: 155, color: "#fde047", label: "💵 OFFICE SAFE STICK-UP", sub: "ROB THE MANAGER'S SAFE (+$3,500, +2★ WANTED)!", action: "ROB_REGISTER", reward: 3500 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 205, y: 108, angle: Math.PI * 0.5, type: "civ0", label: "HEAD CHEF", dialog: "ORDER UP! FRESH FROM THE WOOD-FIRED OVEN!" },
                    { x: 425, y: 108, angle: Math.PI * 0.5, type: "civ2", label: "SOUS CHEF", dialog: "WATCH THE HOT SKILLETS IN THE PASS-THROUGH!" },
                    { x: 410, y: 462, angle: Math.PI * 0.5, type: "civ1", label: "MAITRE D'", dialog: "BUONA SERA! TABLE FOR TWO OR PRIVATE WINE ROOM?" },
                    { x: 112, y: 315, angle: 0, type: "civ3", label: "DINER", dialog: "THE SEAFOOD RISOTTO HERE IS UNBEATABLE." },
                    { x: 685, y: 285, angle: Math.PI * 0.5, type: "gang", label: "SOMMELIER", dialog: "PRIVATE RESERVE CELLAR — ONLY THE FINEST VINTAGES." }
                ];
            }
        },

        SHOP_HOTEL: {
            theme: "SHOP_HOTEL",
            accent: "#ec4899",
            matRGB: [0.94, 0.28, 0.68],
            w: 820,
            h: 560,
            subtitle: "COLONNADE FOYER, CONCIERGE HALL, KING BEDROOM SUITE, WARDROBE & INDOOR SPA POOL",
            buildStations(id) {
                return [
                    { id: `${id}_SUITE`, x: 138, y: 162, color: "#ec4899", label: "🛏️ PRESIDENTIAL KING SUITE ($300)", sub: "REST & HEAL 100% HP + CLEAR 1★ WANTED!", action: "RENT_SUITE", cost: 300 },
                    { id: `${id}_CLOSET`, x: 138, y: 395, color: "#38bdf8", label: "🕶️ WALK-IN SUITE WARDROBE ($400)", sub: "NEW DISGUISE — CLEAR ALL WANTED STARS!", action: "CHANGE_OUTFIT", cost: 400 },
                    { id: `${id}_CONCIERGE`, x: 410, y: 256, color: "#fde047", label: "🛎️ CONCIERGE SAFE DEPOSIT", sub: "COLLECT VIP GUEST STASH (+$1,500)!", action: "HOTEL_PERK", reward: 1500 },
                    { id: `${id}_BAR`, x: 665, y: 175, color: "#22d3ee", label: "🍹 POOLSIDE MOJITO BAR ($120)", sub: "FULL HEALTH + SPRINT SPEED BOOST!", action: "BUY_COCKTAIL", cost: 120 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 410, y: 145, angle: Math.PI * 0.5, type: "civ2", label: "CONCIERGE", dialog: "WELCOME TO OUR ART DECO LANDMARK! YOUR SUITE IS READY." },
                    { x: 335, y: 468, angle: 0, type: "civ0", label: "BELLHOP", dialog: "I'LL TAKE YOUR LUGGAGE UP TO THE PENTHOUSE, BOSS." },
                    { x: 655, y: 92, angle: Math.PI * 0.5, type: "civ1", label: "BARTENDER", dialog: "FRESH MINT MOJITOS AND CHAMPAGNE ON ICE!" },
                    { x: 675, y: 425, angle: -Math.PI * 0.5, type: "bikini_pink", label: "VIP GUEST", dialog: "THE HEATED INDOOR JACUZZI IS PURE VICE CITY LUXURY!" }
                ];
            }
        },

        SHOP_CLOTHES: {
            theme: "SHOP_CLOTHES",
            accent: "#a855f7",
            matRGB: [0.72, 0.32, 0.96],
            w: 820,
            h: 560,
            subtitle: "VELVET DISPLAY GALLERY, CENTRAL CATWALK, TAILOR ATELIER & PRIVATE FITTING CABINS",
            buildStations(id) {
                return [
                    { id: `${id}_STREET`, x: 135, y: 385, color: "#38bdf8", label: "👕 OCEAN DRIVE STREETWEAR ($200)", sub: "FRESH THREADS + CLEAR 2★ WANTED!", action: "BUY_OUTFIT_1", cost: 200 },
                    { id: `${id}_TAILOR`, x: 135, y: 165, color: "#ec4899", label: "🧥 BESPOKE PASTEL LINEN SUIT ($550)", sub: "CLEAR ALL WANTED STARS + +50 ARMOR!", action: "BUY_OUTFIT_2", cost: 550 },
                    { id: `${id}_VIP`, x: 675, y: 168, color: "#fde047", label: "💎 HIGH-ROLLER GOLD CHAIN & SILK ($900)", sub: "100% HP, 100 ARMOR, 0 WANTED & +1 MULTIPLIER!", action: "BUY_OUTFIT_VIP", cost: 900 },
                    { id: `${id}_FIT`, x: 645, y: 385, color: "#34d399", label: "🪞 PRIVATE FITTING CABIN", sub: "QUICK CHANGE — DROP 1★ WANTED FREE!", action: "BUY_OUTFIT_1", cost: 0 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 675, y: 96, angle: Math.PI * 0.5, type: "civ2", label: "BOUTIQUE STYLIST", dialog: "DARLING, ITALIAN SILK AND PASTEL LINEN ARE IN SEASON!" },
                    { x: 125, y: 96, angle: Math.PI * 0.5, type: "civ0", label: "MASTER TAILOR", dialog: "KEVLAR-LINED JACKETS CUSTOM FITTED IN MY ATELIER." },
                    { x: 475, y: 300, angle: Math.PI, type: "civ1", label: "SHOPPER", dialog: "LOOKING FOR SOMETHING FLASHY FOR CLUB NINE1NINE TONIGHT." },
                    { x: 335, y: 468, angle: Math.PI * 0.5, type: "civ3", label: "DOORMEN", dialog: "WELCOME TO VICE CITY COUTURE. BROWSE THE RUNWAY COLLECTION." }
                ];
            }
        },

        SHOP_CONVENIENCE: {
            theme: "SHOP_CONVENIENCE",
            accent: "#22c55e",
            matRGB: [0.18, 0.88, 0.45],
            w: 820,
            h: 560,
            subtitle: "BULLETPROOF CASHIER CAGE, 3 SUPERMARKET AISLES, WALK-IN COOLER & BACKROOM STOCK SAFE",
            buildStations(id) {
                return [
                    { id: `${id}_SLUSH`, x: 705, y: 265, color: "#38bdf8", label: "🥤 VICE BERRY SLUSHIE ($35)", sub: "+35 HP QUICK REFRESH!", action: "BUY_SNACK", cost: 35 },
                    { id: `${id}_ENERGY`, x: 705, y: 435, color: "#22c55e", label: "⚡ 6-PACK ENERGY DRINK ($95)", sub: "100% FULL HEALTH + SPEED BOOST!", action: "BUY_ENERGY", cost: 95 },
                    { id: `${id}_LOTTO`, x: 145, y: 315, color: "#fbbf24", label: "🎟️ LEONIDA SCRATCH-OFF ($100)", sub: "WIN UP TO $2,500 INSTANT CASH!", action: "PLAY_LOTTO", cost: 100 },
                    { id: `${id}_ROB`, x: 485, y: 118, color: "#ef4444", label: "💰 CRACK BACKROOM STOCK SAFE", sub: "ROB +$3,200 CASH (+2★ WANTED LEVEL)!", action: "ROB_REGISTER", reward: 3200 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 125, y: 185, angle: Math.PI * 0.5, type: "civ0", label: "CAGED CLERK", dialog: "CASH ONLY AT THE WINDOW! WALK-IN COOLER IS ON THE RIGHT!" },
                    { x: 245, y: 108, angle: Math.PI * 0.5, type: "civ1", label: "STOCK MANAGER", dialog: "INVENTORY DELIVERY JUST CAME IN THROUGH THE BACK STOCKROOM." },
                    { x: 465, y: 345, angle: -Math.PI * 0.5, type: "civ3", label: "CUSTOMER", dialog: "GRABBING A LATE-NIGHT COFFEE AND A LOTTO TICKET." }
                ];
            }
        },

        SHOP_BAR: {
            theme: "SHOP_BAR",
            accent: "#06b6d4",
            matRGB: [0.08, 0.82, 0.95],
            w: 820,
            h: 560,
            subtitle: "BOUNCER VESTIBULE, NEON TAPROOM, BILLIARDS PARLOR, VIP LOUNGE & BACKROOM SAFE",
            buildStations(id) {
                return [
                    { id: `${id}_BEER`, x: 410, y: 205, color: "#fbbf24", label: "🍺 ICE COLD VICE LAGER ($50)", sub: "+50 HP REFRESHMENT!", action: "BUY_SNACK", cost: 50 },
                    { id: `${id}_SHOT`, x: 135, y: 165, color: "#06b6d4", label: "🥃 TOP-SHELF TEQUILA FLIGHT ($160)", sub: "100% HEALTH + +50 ARMOR!", action: "BUY_DRINK", cost: 160 },
                    { id: `${id}_POOL`, x: 135, y: 395, color: "#22c55e", label: "🎱 HIGH-STAKES 8-BALL HUSTLE ($200)", sub: "BEAT THE HUSTLER FOR UP TO $3,000!", action: "PLAY_POOL", cost: 200 },
                    { id: `${id}_SAFE`, x: 685, y: 145, color: "#fde047", label: "💼 BACKROOM BOOKIE STASH", sub: "CRACK THE BAR OFFICE SAFE (+$3,500, +2★ WANTED)!", action: "ROB_REGISTER", reward: 3500 }
                ];
            },
            buildNpcs() {
                return [
                    { x: 410, y: 105, angle: Math.PI * 0.5, type: "civ1", label: "BARTENDER", dialog: "WHAT'LL IT BE? COLD DRAFT OR TOP-SHELF TEQUILA?" },
                    { x: 410, y: 468, angle: Math.PI * 0.5, type: "gang", label: "BOUNCER", dialog: "NO TROUBLE IN THE TAPROOM. POOL TABLE'S IN THE WEST WING." },
                    { x: 135, y: 318, angle: Math.PI * 0.5, type: "gang", label: "POOL SHARK", dialog: "RACK 'EM UP! $200 A GAME IF YOU THINK YOU CAN RUN THE TABLE." },
                    { x: 675, y: 355, angle: Math.PI, type: "civ2", label: "REGULAR", dialog: "BEST JUKEBOX AND NEON VIBES ON THE STRIP!" }
                ];
            }
        }
    };

    // ============================================================================
    // NON-GENERATIVE HAND-CRAFTED VICE CITY & LEONIDA ESTABLISHMENT CATALOG
    // Every establishment has an exact city coordinate (c, r) and explicit building
    // facade orientation (facing: "S" | "N" | "E" | "W") matching its street!
    // ============================================================================
    const HANDCRAFTED_ESTABLISHMENTS = [
        // --- OCEAN DRIVE & SOUTH BEACH (Verified straight-wall storefronts in c=431..443) ---
        { id: "ESTAB_COLONY_HOTEL", tpl: "SHOP_HOTEL", name: "🏨 THE COLONY ART DECO HOTEL", district: "OCEAN DRIVE", c: 443, r: 301, facing: "E" },
        { id: "ESTAB_CAFFE_ROMA", tpl: "SHOP_RESTAURANT", name: "🍝 CAFFÈ ROMA OCEAN TERRACE", district: "OCEAN DRIVE", c: 443, r: 275, facing: "E" },
        { id: "ESTAB_GIANNI_COUTURE", tpl: "SHOP_CLOTHES", name: "👗 GIANNI'S COUTURE & SILK", district: "OCEAN DRIVE", c: 441, r: 253, facing: "S" },
        { id: "ESTAB_CLEVELANDER_BAR", tpl: "SHOP_BAR", name: "🍹 THE CLEVELANDER POOL BAR", district: "OCEAN DRIVE", c: 443, r: 166, facing: "E" },
        { id: "ESTAB_SOBE_BODEGA", tpl: "SHOP_CONVENIENCE", name: "🏪 SOUTH POINTE 24/7 BODEGA", district: "SOUTH BEACH", c: 431, r: 306, facing: "S" },
        { id: "ESTAB_COLLINS_AMMU", tpl: "SHOP_GUN_SHOP", name: "🔫 COLLINS AVE AMMU-NATION", district: "SOUTH BEACH", c: 438, r: 278, facing: "W" },

        // --- MID-BEACH, ESPAÑOLA WAY & WASHINGTON AVE ---
        { id: "ESTAB_HAVANA_TAPAS", tpl: "SHOP_RESTAURANT", name: "🥘 HAVANA TAPAS & GRILL", district: "ESPAÑOLA WAY", c: 440, r: 168, facing: "S" },
        { id: "ESTAB_FLAMINGO_LOUNGE", tpl: "SHOP_BAR", name: "🦩 FLAMINGO COCKTAIL LOUNGE", district: "MID-BEACH", c: 440, r: 170, facing: "N" },
        { id: "ESTAB_WASH_SURPLUS", tpl: "SHOP_GUN_SHOP", name: "🔫 MID-BEACH TACTICAL SURPLUS", district: "WASHINGTON AVE", c: 438, r: 155, facing: "W" },
        { id: "ESTAB_OCEAN_SUITES", tpl: "SHOP_HOTEL", name: "🏨 CARLYLE ART DECO SUITES", district: "MID-BEACH", c: 441, r: 153, facing: "N" },
        { id: "ESTAB_MIDBEACH_MART", tpl: "SHOP_CONVENIENCE", name: "🏪 FLAMINGO PARK QUICK-STOP", district: "MID-BEACH", c: 431, r: 248, facing: "N" },

        // --- NORTH BEACH & VICE POINT ---
        { id: "ESTAB_VICEPOINT_SURF", tpl: "SHOP_CLOTHES", name: "👕 VICE POINT SURF & TAILOR", district: "VICE POINT", c: 443, r: 97, facing: "E" },
        { id: "ESTAB_NORTH_AMMU", tpl: "SHOP_GUN_SHOP", name: "🔫 NORTH BEACH GUN & RANGE", district: "NORTH BEACH", c: 431, r: 66, facing: "S" },
        { id: "ESTAB_STARLIGHT_HOTEL", tpl: "SHOP_HOTEL", name: "🏨 STARLIGHT OCEAN RESORT", district: "NORTH BEACH", c: 448, r: 43, facing: "E" },
        { id: "ESTAB_NEON_PALM_BAR", tpl: "SHOP_BAR", name: "🍸 NEON PALM COCKTAIL CLUB", district: "NORTH BEACH", c: 438, r: 87, facing: "W" },
        { id: "ESTAB_SHORES_OUTLET", tpl: "SHOP_CLOTHES", name: "🧥 VICE SHORES DESIGNER ATELIER", district: "NORTH VICE SHORES", c: 172, r: 66, facing: "N" },

        // --- DOWNTOWN VICE CITY, LITTLE HAVANA, LITTLE HAITI & WYNWOOD ---
        { id: "ESTAB_DOWNTOWN_ARMS", tpl: "SHOP_GUN_SHOP", name: "🔫 DOWNTOWN EXECUTIVE ARMS", district: "DOWNTOWN VC", c: 283, r: 169, facing: "E" },
        { id: "ESTAB_BAYFRONT_BISTRO", tpl: "SHOP_RESTAURANT", name: "🥩 BAYFRONT GRAND BRASSERIE", district: "DOWNTOWN VC", c: 281, r: 265, facing: "S" },
        { id: "ESTAB_CALLE_OCHO_CAFE", tpl: "SHOP_RESTAURANT", name: "☕ CALLE OCHO CAFÉ CUBANO", district: "LITTLE HAVANA", c: 241, r: 287, facing: "N" },
        { id: "ESTAB_HAVANA_BODEGA", tpl: "SHOP_CONVENIENCE", name: "🏪 LITTLE HAVANA BODEGA & LOTTO", district: "LITTLE HAVANA", c: 229, r: 259, facing: "S" },
        { id: "ESTAB_TOUSSAINT_RUM", tpl: "SHOP_BAR", name: "🥃 TOUSSAINT CREOLE RUM BAR", district: "LITTLE HAITI", c: 178, r: 157, facing: "W" },
        { id: "ESTAB_WYNWOOD_THREADS", tpl: "SHOP_CLOTHES", name: "🕶️ WYNWOOD VINTAGE & COUTURE", district: "WYNWOOD", c: 231, r: 157, facing: "E" },

        // --- PORT GELLHORN & INDUSTRIAL MAINLAND ---
        { id: "ESTAB_TURNPIKE_DINER", tpl: "SHOP_RESTAURANT", name: "🍔 TURNPIKE TRUCKER SMOKEHOUSE", district: "PORT GELLHORN", c: 170, r: 259, facing: "S" },
        { id: "ESTAB_KELLY_GUN_PAWN", tpl: "SHOP_GUN_SHOP", name: "🔫 KELLY COUNTY GUN & RANGE", district: "PORT GELLHORN", c: 68, r: 143, facing: "E" }
    ];

    // ============================================================================
    // 4-WAY CANONICAL TO ORIENTED ROOM COORDINATE TRANSFORMER
    // Canonical space is authored for facing === "S" inside the symmetric inner
    // perimeter frame: x in [18 .. rw - 18], y in [56 .. rh - 18].
    // Transforms rectangles, points, and angles cleanly for "S", "N", "E", "W"
    // so walls connect flush to perimeter walls without gaps or overlaps!
    // ============================================================================
    function transformRect(x, y, w, h, intr) {
        const facing = (intr && intr.facing) || "S";
        if (facing === "S" || y < 36) {
            return { x, y, w, h };
        }
        const rw = (intr && intr.w) || 820;
        const rh = (intr && intr.h) || 560;
        const ix0 = 18;
        const iw = Math.max(1, rw - 36);
        const iy0 = 56;
        const ih = Math.max(1, rh - 74);

        const u = (x - ix0) / iw;
        const du = w / iw;
        const v = (y - iy0) / ih;
        const dv = h / ih;

        if (facing === "N") {
            const nx = ix0 + (1.0 - (u + du)) * iw;
            const ny = iy0 + (1.0 - (v + dv)) * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + w);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + h);
            return {
                x: x1,
                y: y1,
                w: Math.max(2, x2 - x1),
                h: Math.max(2, y2 - y1)
            };
        }

        if (facing === "E") {
            // Canonical South (v = 1) -> East (u' = 1); Canonical North (v = 0) -> West (u' = 0)
            // Canonical West (u = 0) -> South (v' = 1); Canonical East (u = 1) -> North (v' = 0)
            const nw = dv * iw;
            const nh = du * ih;
            const nx = ix0 + v * iw;
            const ny = iy0 + (1.0 - (u + du)) * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + nw);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + nh);
            return {
                x: x1,
                y: y1,
                w: Math.max(2, x2 - x1),
                h: Math.max(2, y2 - y1)
            };
        }

        if (facing === "W") {
            // Canonical South (v = 1) -> West (u' = 0); Canonical North (v = 0) -> East (u' = 1)
            // Canonical West (u = 0) -> North (v' = 0); Canonical East (u = 1) -> South (v' = 1)
            const nw = dv * iw;
            const nh = du * ih;
            const nx = ix0 + (1.0 - (v + dv)) * iw;
            const ny = iy0 + u * ih;
            const x1 = Math.round(nx);
            const x2 = Math.round(nx + nw);
            const y1 = Math.round(ny);
            const y2 = Math.round(ny + nh);
            return {
                x: x1,
                y: y1,
                w: Math.max(2, x2 - x1),
                h: Math.max(2, y2 - y1)
            };
        }

        return { x, y, w, h };
    }

    function transformPoint(x, y, angle, intr) {
        const facing = (intr && intr.facing) || "S";
        const ang = angle || 0;
        if (facing === "S" || y < 36) {
            return { x, y, angle: ang };
        }
        const rw = (intr && intr.w) || 820;
        const rh = (intr && intr.h) || 560;
        const ix0 = 18;
        const iw = Math.max(1, rw - 36);
        const iy0 = 56;
        const ih = Math.max(1, rh - 74);
        const u = (x - ix0) / iw;
        const v = (y - iy0) / ih;

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

    function getEntrancePose(intr) {
        const rw = (intr && intr.w) || 820;
        const rh = (intr && intr.h) || 560;
        const y0 = 40;
        const midY = Math.round(y0 + (rh - y0) * 0.5);
        const facing = (intr && intr.facing) || "S";

        if (facing === "N") {
            return {
                facing: "N",
                spawnX: Math.round(rw * 0.5),
                spawnY: y0 + 82,
                spawnAngle: Math.PI * 0.5, // Enters from North wall facing South into building
                partnerX: Math.round(rw * 0.5 + 62),
                partnerY: y0 + 52,
                partnerAngle: Math.PI * 0.62,
                exitX: Math.round(rw * 0.5),
                exitY: y0 + 18,
                minX: 34,
                maxX: rw - 34,
                minY: y0 + 16,
                maxY: rh - 30,
                isAtExit(px, py) {
                    return py <= y0 + 36 && Math.abs(px - rw * 0.5) < 68;
                },
                isNearExit(px, py) {
                    return py <= y0 + 52 && Math.abs(px - rw * 0.5) < 76;
                }
            };
        }
        if (facing === "E") {
            return {
                facing: "E",
                spawnX: rw - 96,
                spawnY: midY,
                spawnAngle: Math.PI, // Enters from East wall facing West into building
                partnerX: rw - 56,
                partnerY: midY + 52,
                partnerAngle: -Math.PI * 0.82,
                exitX: rw - 18,
                exitY: midY,
                minX: 34,
                maxX: rw - 16,
                minY: 74,
                maxY: rh - 30,
                isAtExit(px, py) {
                    return px >= rw - 42 && Math.abs(py - midY) < 62;
                },
                isNearExit(px, py) {
                    return px >= rw - 56 && Math.abs(py - midY) < 72;
                }
            };
        }
        if (facing === "W") {
            return {
                facing: "W",
                spawnX: 96,
                spawnY: midY,
                spawnAngle: 0, // Enters from West wall facing East into building
                partnerX: 56,
                partnerY: midY - 52,
                partnerAngle: Math.PI * 0.18,
                exitX: 18,
                exitY: midY,
                minX: 16,
                maxX: rw - 34,
                minY: 74,
                maxY: rh - 30,
                isAtExit(px, py) {
                    return px <= 42 && Math.abs(py - midY) < 62;
                },
                isNearExit(px, py) {
                    return px <= 56 && Math.abs(py - midY) < 72;
                }
            };
        }
        // Default: facing === "S" (Door on South wall, player enters facing North)
        return {
            facing: "S",
            spawnX: Math.round(rw * 0.5),
            spawnY: rh - 92,
            spawnAngle: -Math.PI * 0.5,
            partnerX: Math.round(rw * 0.5 - 62),
            partnerY: rh - 56,
            partnerAngle: -Math.PI * 0.35,
            exitX: Math.round(rw * 0.5),
            exitY: rh - 18,
            minX: 34,
            maxX: rw - 34,
            minY: 74,
            maxY: rh - 16,
            isAtExit(px, py) {
                return py >= rh - 38 && Math.abs(px - rw * 0.5) < 68;
            },
            isNearExit(px, py) {
                return py >= rh - 52 && Math.abs(px - rw * 0.5) < 76;
            }
        };
    }

    function orientInterior(intr) {
        if (!intr) return intr;
        if (!intr.w || intr.w < 800) intr.w = 820;
        if (!intr.h || intr.h < 540) intr.h = 560;
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
            intr.npcs = intr._rawNpcs.map(npc => {
                const pt = transformPoint(npc.x, npc.y, npc.angle !== undefined ? npc.angle : Math.PI * 0.5, intr);
                return { ...npc, x: pt.x, y: pt.y, angle: pt.angle };
            });
        }
        intr._orientedFacing = intr.facing;
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

    // Helper: compute exact sidewalk door coordinates for tile (c, r) and facade direction
    function computeDoorPixelPos(c, r, facing, ts = 64) {
        let doorX = (c + 0.5) * ts;
        let doorY = (r + 0.5) * ts;
        if (facing === "S") doorY = r * ts + 22;
        else if (facing === "N") doorY = (r + 1) * ts - 22;
        else if (facing === "E") doorX = c * ts + 22;
        else if (facing === "W") doorX = (c + 1) * ts - 22;
        return { doorX, doorY };
    }

    // Snap a target (c, r, preferredFacing) to the closest real sidewalk-against-building wall interface
    function snapDoorToBuildingFacade(map, targetC, targetR, preferredFacing, maxRad = 18) {
        const cols = 512;
        const rows = 512;
        const ground = map.surfaceGround;
        const surfZ = map.surfaceLayer;
        if (!ground) return null;

        // GROUND_TYPE.BUILDING === 5, GROUND_TYPE.PAWEMENT === 3, GROUND_TYPE.ROAD === 2
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

        // Direction vectors from sidewalk tile (c, r) into adjacent building tile (c + dx, r + dy)
        const dirs = [
            { dx: 0, dy: -1, facing: "S" }, // Building is North of sidewalk -> South facade
            { dx: -1, dy: 0, facing: "E" }, // Building is West of sidewalk -> East facade (e.g. Ocean Drive!)
            { dx: 1, dy: 0, facing: "W" },  // Building is East of sidewalk -> West facade
            { dx: 0, dy: 1, facing: "N" }   // Building is South of sidewalk -> North facade
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
                    // Outward tile (in front of door) must be walkable sidewalk (3) or street (2)
                    const outG = ground[(r - d.dy) * cols + (c - d.dx)];
                    if (outG !== 2 && outG !== 3) continue;
                    // Strongly prefer straight walls where the building continues on both sides along the facade
                    // AND where the sidewalk tile itself is not wedged into an inner L-corner!
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

    // Snap existing landmark doors onto real building walls and orient their interior rooms
    function snapLandmarkDoors(map) {
        if (!map || !Array.isArray(map.interiors)) return;
        const ts = 64;

        for (const intr of map.interiors) {
            if (!intr) continue;
            // Ensure consistent room dimensions for multi-room floorplans
            intr.w = 820;
            intr.h = 560;

            if (intr.isShop || intr.isEstatePortico || intr.id === "STAR_ISLAND" || intr.id === "SERA_SPACE" || (intr.id && intr.id.startsWith("ESTATE_"))) {
                orientInterior(intr);
                continue;
            }

            // Preserve original authored door coordinates & facing before the procedural fallback pass
            // so when NYC.CMP loads later, snapping always starts from the clean authored coordinates!
            if (intr._origDoorX === undefined) {
                intr._origDoorX = intr.doorX;
                intr._origDoorY = intr.doorY;
                intr._origFacing = intr.facing || null;
            }

            const c0 = Math.floor(intr._origDoorX / ts);
            const r0 = Math.floor(intr._origDoorY / ts);
            // Snap landmark door to the actual building wall at its tile so the door frame, awning & interior always match 100%!
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

    // Build all 24 hand-crafted, non-generative Vice City establishments
    function generate(map) {
        const ts = 64;
        if (!map || !map.surfaceGround) return [];

        const existing = (map.interiors || []).map((it) => ({ c: it.doorX / ts, r: it.doorY / ts }));
        const placed = [];

        for (let i = 0; i < HANDCRAFTED_ESTABLISHMENTS.length; i++) {
            const spec = HANDCRAFTED_ESTABLISHMENTS[i];
            const tpl = SHOP_TEMPLATES[spec.tpl];
            if (!tpl) continue;

            const snapped = snapDoorToBuildingFacade(map, spec.c, spec.r, spec.facing, 20);
            const finalC = snapped ? snapped.c : spec.c;
            const finalR = snapped ? snapped.r : spec.r;
            const finalFacing = snapped ? snapped.facing : spec.facing;

            // Avoid overlapping an existing door on the exact same tile
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
    // COMPLEX MULTI-ROOM NON-GENERATIVE ARCHITECTURAL FLOORPLANS (Canonical "S")
    // Every layout defines 4-6 distinct interconnected rooms with horizontal &
    // vertical partition walls (isWall: true), framed doorways, and 3D furniture!
    // Automatically transformed to match intr.facing ("S", "N", "E", "W")!
    // ============================================================================
    function getRawObstacles(intr) {
        if (!intr) return [];
        const t = intr.theme || "";
        const rw = intr.w || 820;
        const rh = intr.h || 560;
        const obs = [];
        const add = (x, y, w, h, isWall = false) => obs.push({ x, y, w, h, isWall });

        if (t === "SHOP_GUN_SHOP") {
            // 1. Entrance Security Vestibule Baffle Walls (y = 414, doorways at x=170..266 & x=554..650)
            add(18, 414, 152, 16, true);
            add(266, 414, 288, 16, true);
            add(650, 414, rw - 668, 16, true);
            // 2. West Tactical Gunsmith & Kevlar Vault Wing Wall (x = 224, framed vault doorway at y=176..266)
            add(224, 56, 16, 120, true);
            add(224, 266, 16, 148, true);
            // 3. East 4-Lane Live Firing Range Wing Wall (x = 516, framed range doorway at y=216..306)
            add(516, 56, 16, 160, true);
            add(516, 306, 16, 108, true);
            // 4. Gunsmith Workbench, Kevlar Rack, Glass Weapon Showcase, Surplus Crates, Vestibule Desks & Firing Line Booths
            add(36, 68, 164, 26);
            add(36, 352, 164, 28);
            add(262, 128, 232, 28);
            add(258, 288, 86, 28);
            add(412, 288, 86, 28);
            add(548, 312, 236, 22);
            add(54, 468, 96, 30);
            add(664, 468, 96, 30);
        } else if (t === "SHOP_RESTAURANT") {
            // 1. Maitre D' Reception Foyer Partition Walls (y = 424, grand arch at x=346..474 & side passages)
            add(18, 424, 172, 16, true);
            add(268, 424, 78, 16, true);
            add(474, 424, 78, 16, true);
            add(630, 424, rw - 648, 16, true);
            // 2. North Commercial Kitchen Pass-Through Wall (y = 192, service doors at x=248..336 & x=536..622)
            add(18, 192, 230, 16, true);
            add(336, 192, 200, 16, true);
            add(622, 192, rw - 640, 16, true);
            // 3. Kitchen Walk-In Cold Storage Divider (x = 576, y = 56..136)
            add(576, 56, 16, 80, true);
            // 4. East Private VIP Wine Cellar Wall (x = 552, framed doorway at y=288..376)
            add(552, 208, 16, 80, true);
            add(552, 376, 16, 48, true);
            // 5. Stainless Kitchen Line, Dining Booths, Central Tables, NE Office Safe/Desk & Foyer Jukebox
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
            // 1. Grand Colonnade Foyer Partition Screens (y = 424, center arch x=348..472)
            add(250, 424, 98, 16, true);
            add(472, 424, 92, 16, true);
            // 2. West Presidential Suite & Wardrobe Wing Wall (x = 248, doorway at y=236..326)
            add(248, 56, 16, 180, true);
            add(248, 326, 16, rh - 344, true);
            // 3. Suite Bedroom / Walk-In Dressing Room Divider (y = 282, doorway at x=142..248)
            add(18, 282, 124, 16, true);
            // 4. East Cocktail Lounge & Sunken Jacuzzi Spa Wing Wall (x = 548, doorway at y=236..326)
            add(548, 56, 16, 180, true);
            add(548, 326, 16, rh - 344, true);
            // 5. East Bar / Jacuzzi Courtyard Divider (y = 252, doorway at x=564..658)
            add(658, 252, rw - 676, 16, true);
            // 6. Concierge Desk, Lobby Velvet Sofas, King Bed, Wardrobe Dresser, Bar Counter & Jacuzzi Pool
            add(316, 178, 188, 30);
            add(272, 278, 34, 74);
            add(502, 278, 34, 74);
            add(28, 96, 118, 86);
            add(28, 442, 112, 30);
            add(584, 112, 176, 28);
            add(588, 344, 176, 112);
        } else if (t === "SHOP_CLOTHES") {
            // 1. Velvet Display Gallery Foyer Wall (y = 424, central catwalk arch x=344..476)
            add(244, 424, 100, 16, true);
            add(476, 424, 92, 16, true);
            // 2. West Tailor Atelier & Ready-To-Wear Wing Wall (x = 242, doorway at y=236..324)
            add(242, 56, 16, 180, true);
            add(242, 324, 16, rh - 342, true);
            // 3. West Tailor / Streetwear Partition (y = 248, doorway at x=140..242)
            add(18, 248, 122, 16, true);
            // 4. East Cashier & Private Fitting Cabins Wing Wall (x = 562, doorway at y=236..324)
            add(562, 56, 16, 180, true);
            add(562, 324, 16, rh - 342, true);
            // 5. East Fitting Cabin Cubicle Partition Walls (y = 278 & y = 398)
            add(682, 278, rw - 700, 16, true);
            add(682, 398, rw - 700, 16, true);
            // 6. Central Mannequin Podium, Garment Racks, Tailor Table & Cashier Counter
            add(358, 266, 104, 72);
            add(42, 122, 124, 28);
            add(42, 316, 124, 26);
            add(602, 118, 164, 28);
        } else if (t === "SHOP_CONVENIENCE") {
            // 1. North Stockroom & Manager Vault Partition Wall (y = 186, doorway at x=336..436)
            add(18, 186, 318, 16, true);
            add(436, 186, rw - 454, 16, true);
            // 2. West Bulletproof Cashier Cage Partition (x = 228, y = 186..292)
            add(228, 186, 16, 106, true);
            // 3. East Walk-In Refrigerated Cooler Wing Wall (x = 608, doorway at y=296..386)
            add(608, 186, 16, 110, true);
            add(608, 386, 16, rh - 404, true);
            // 4. Cashier Counter, 3 Supermarket Gondola Shelving Aisles & Stockroom Crates
            add(38, 232, 168, 28);
            add(286, 248, 42, 164);
            add(398, 248, 42, 164);
            add(510, 248, 42, 164);
            add(54, 76, 140, 32);
            add(580, 76, 160, 32);
        } else if (t === "SHOP_BAR" || t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "MALIBU_CLUB") {
            // 1. Bouncer Security & Coat-Check Vestibule Wall (y = 428, central arch x=346..474)
            add(248, 428, 98, 16, true);
            add(474, 428, 92, 16, true);
            // 2. West Billiards / VIP Bottle Wing Wall (x = 248, doorway at y=236..326)
            add(248, 56, 16, 180, true);
            add(248, 326, 16, rh - 344, true);
            // 3. West Backroom / Billiards Divider (y = 246, doorway at x=142..248)
            add(18, 246, 124, 16, true);
            // 4. East Manager Vault & Arcade Lounge Wing Wall (x = 562, doorway at y=236..326)
            add(562, 56, 16, 180, true);
            add(562, 326, 16, rh - 344, true);
            // 5. North-East Armored Cash Vault Room Divider (y = 246, doorway at x=578..668)
            add(668, 246, rw - 686, 16, true);
            // 6. Center Bar/DJ/Stage & West Pool Table / Booths
            add(312, 122, 196, 32);
            if (t === "SHOP_BAR") {
                add(56, 338, 124, 64);
            } else if (t === "STRIP_CLUB") {
                add(368, 224, 84, 132);
            }
            add(608, 108, 148, 28);
        } else if (t === "MANSION") {
            // 1. Grand Marble Foyer Colonnade Screens (y = 426, center rotunda arch x=346..474)
            add(258, 426, 88, 16, true);
            add(474, 426, 88, 16, true);
            // 2. North Scarface Executive Office Partition Wall (y = 228, center double doorway x=356..464)
            add(258, 228, 98, 16, true);
            add(464, 228, 98, 16, true);
            // 3. West Golden Armory & Cigar Trophy Wing Wall (x = 258, doorway at y=244..334)
            add(258, 56, 16, 188, true);
            add(258, 334, 16, rh - 352, true);
            add(18, 258, 132, 16, true);
            // 4. East Roman Jacuzzi & Master Solarium Wing Wall (x = 556, doorway at y=244..334)
            add(556, 56, 16, 188, true);
            add(556, 334, 16, rh - 352, true);
            add(658, 228, rw - 676, 16, true);
            // 5. Executive Desk, Rotunda Fountain, Armory Racks & Sunken Jacuzzi
            add(336, 104, 148, 32);
            add(374, 304, 72, 68);
            add(42, 92, 176, 30);
            add(594, 326, 172, 134);
        } else if (t === "SPACE_BUNKER") {
            // 1. South Airlock Decontamination Baffle Wall (y = 426, airlock door x=354..466)
            add(252, 426, 102, 16, true);
            add(466, 426, 102, 16, true);
            // 2. West Orbital Munitions & Server Bay Bulkhead (x = 252, doorway at y=238..328)
            add(252, 56, 16, 182, true);
            add(252, 328, 16, rh - 346, true);
            // 3. East Zero-G Bio-Med Cleanroom Bulkhead (x = 564, doorway at y=238..328)
            add(564, 56, 16, 182, true);
            add(564, 328, 16, rh - 346, true);
            // 4. Flight Director Console, Telemetry Banks, Ordnance Racks & Medpod
            add(320, 118, 180, 28);
            add(290, 266, 96, 26);
            add(434, 266, 96, 26);
            add(44, 168, 74, 136);
            add(692, 214, 68, 68);
        } else if (t === "PRISON_BLOCK") {
            // 1. South Armored Sally-Port Checkpoint Wall (y = 426, gate x=354..466)
            add(246, 426, 108, 16, true);
            add(466, 426, 108, 16, true);
            // 2. North Cellblock & Warden Office Partition Walls (x = 278 & x = 516, y = 56..208)
            add(278, 56, 16, 152, true);
            add(516, 56, 16, 152, true);
            // 3. Horizontal Barred Cellblock Wall (y = 208, 3 security gates at x=145..215, 365..435, 595..665)
            add(18, 208, 127, 16, true);
            add(215, 208, 150, 16, true);
            add(435, 208, 160, 16, true);
            add(665, 208, rw - 683, 16, true);
            // 4. South-West Interrogation Room & South-East Guard Locker Wing Walls
            add(246, 298, 16, rh - 316, true);
            add(554, 298, 16, rh - 316, true);
            // 5. Cell Bunk, Warden Desk, SWAT Armory Racks & Dayroom Mess Tables
            add(36, 82, 86, 44);
            add(332, 102, 136, 28);
            add(566, 92, 196, 28);
            add(312, 336, 196, 36);
        } else if (t === "DINER_PAWN") {
            // 1. Diner / Uncle Jack's Pawn Dividing Brick Wall (x = 484, connecting breezeway at y=228..318)
            add(484, 56, 16, 172, true);
            add(484, 318, 16, rh - 336, true);
            // 2. Diner Entrance Vestibule Partition (y = 426, x = 18..165 & x = 315..484)
            add(18, 426, 147, 16, true);
            add(315, 426, 169, 16, true);
            // 3. Uncle Jack's Caged Gun Vault Partition Wall (y = 228, security door at x=580..668)
            add(500, 228, 80, 16, true);
            add(668, 228, rw - 686, 16, true);
            // 4. Short-Order Grill Counter, Diner Booths & Pawn Showcase Counter
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
        SHOP_TEMPLATES,
        HANDCRAFTED_ESTABLISHMENTS,
        transformRect,
        transformPoint,
        getEntrancePose,
        orientInterior,
        snapLandmarkDoors,
        generate,
        getRawObstacles,
        getObstacles
    };
})();
