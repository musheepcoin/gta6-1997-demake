/* ==========================================================================
   SHOP INTERIORS — template system + automatic storefront door placement.

   Every template builds a walkable room (same format as the hand-made
   landmark interiors in map.js) with PRICED stations: walk next to a pad and
   press [E] (or click it) to buy. Doors are generated on real south-facing
   building facades that sit on a sidewalk, so any commercial building can be
   entered (teleport + fade, no seamless streaming needed).
   ========================================================================== */
(function () {
    "use strict";

    const ROOM_W = 760;
    const ROOM_H = 520;

    // Cooldown (seconds) before a purchase pad can be used again
    const BUY_CD = 5.0;

    const buy = (id, x, y, color, label, price, effect, extra = {}) => ({
        id,
        x,
        y,
        color,
        label: `${label} — $${price.toLocaleString("en-US")}`,
        sub: `[E] ${effect.desc}`,
        price,
        effect,
        cooldownSec: BUY_CD,
        ...extra
    });

    const SHOP_TEMPLATES = {
        GUN_SHOP: {
            theme: "SHOP_GUN_SHOP",
            accent: "#f97316",
            mat: [0.98, 0.45, 0.08],
            icon: "🔫",
            names: ["AMMU-NATION LEONIDA", "GUNS & GLORY", "DEAD EYE ARMORY", "SUNSHINE FIREARMS", "BIG TONY'S GUN SHOP"],
            subtitle: "ARMORED SHOWROOM, HEAVY ORDNANCE VAULT & INDOOR FIRING RANGE",
            npcs: [
                { x: 205, y: 96, angle: Math.PI * 0.5, type: "gang", label: "GUN DEALER" },
                { x: 532, y: 265, angle: 0, type: "civ1", label: "RANGE SHOOTER" }
            ],
            stations: () => [
                buy("GUN_PISTOL", 115, 195, "#fde047", "🔫 PISTOL +60", 150, { weapon: "PISTOL", ammo: 60, desc: "PISTOL + 60 AMMO" }),
                buy("GUN_UZI", 245, 195, "#f97316", "🔫 SMG +150", 800, { weapon: "UZI", ammo: 150, desc: "FULL-AUTO SMG" }),
                buy("GUN_SHOTGUN", 375, 195, "#ef4444", "🔫 SHOTGUN +30", 1200, { weapon: "SHOTGUN", ammo: 30, desc: "6-PELLET SPREAD" }),
                buy("GUN_ARMOR", 150, 355, "#38bdf8", "🛡️ BODY ARMOR", 500, { armor: 100, desc: "+100 ARMOR" }),
                buy("GUN_ROCKET", 395, 295, "#a855f7", "🚀 ROCKETS +8", 4000, { weapon: "ROCKET", ammo: 8, desc: "BIG BOOM" }),
                buy("GUN_FLAME", 395, 425, "#fb923c", "🔥 FLAMETHROWER +150", 2500, { weapon: "FLAMETHROWER", ammo: 150, desc: "BURN EVERYTHING" })
            ]
        },
        RESTAURANT: {
            theme: "SHOP_RESTAURANT",
            accent: "#facc15",
            mat: [0.98, 0.82, 0.10],
            icon: "🍔",
            names: ["CAFE CUBANO", "OCEAN GRILL", "BURGER SHOT", "EL PESCADOR", "NEON DINER", "PALM BISTRO", "SUNSET TACOS"],
            subtitle: "OPEN COMMERCIAL KITCHEN, CHROME DINER BOOTHS & WURLITZER JUKEBOX",
            npcs: [
                { x: 355, y: 126, angle: Math.PI * 0.5, type: "civ0", label: "HEAD CHEF" },
                { x: 135, y: 126, angle: -Math.PI * 0.5, type: "civ1", label: "LINE COOK" },
                { x: 205, y: 294, angle: Math.PI, type: "civ3", label: "DINER" },
                { x: 642, y: 308, angle: Math.PI, type: "civ2", label: "DINER" }
            ],
            stations: () => [
                buy("FOOD_BURGER", 135, 214, "#fb923c", "🍔 BURGER", 40, { hp: 40, desc: "+40 HEALTH" }),
                buy("FOOD_MEAL", 360, 214, "#39ff14", "🍽️ CHEF'S SPECIAL", 120, { hp: 999, desc: "FULL HEALTH" }),
                buy("FOOD_COFFEE", 625, 162, "#a16207", "☕ DOUBLE ESPRESSO", 25, { speed: 20, desc: "SPEED BOOST 20S" })
            ]
        },
        HOTEL: {
            theme: "SHOP_HOTEL",
            accent: "#f472b6",
            mat: [0.96, 0.25, 0.65],
            icon: "🏨",
            names: ["HOTEL FLAMINGO", "PALMS MOTEL", "OCEAN VIEW SUITES", "THE GOLDEN IGUANA", "HOTEL TROPICANA"],
            subtitle: "TERRAZZO CONCIERGE LOBBY, KING BEDROOM SUITE & VIP JACUZZI LOUNGE",
            npcs: [
                { x: 380, y: 84, angle: Math.PI * 0.5, type: "civ2", label: "CONCIERGE" },
                { x: 585, y: 275, angle: Math.PI, type: "civ1", label: "VIP GUEST" }
            ],
            stations: () => [
                buy("HOTEL_ROOM", 325, 185, "#f472b6", "🛏️ PRIVATE ROOM", 500, { hp: 999, armor: 50, clearWanted: true, setMinutes: 480, desc: "HEAL, NO STARS, MORNING" }),
                buy("HOTEL_MINIBAR", 630, 195, "#38bdf8", "🍸 MINIBAR", 60, { hp: 25, speed: 12, desc: "+25 HP + SPEED" }),
                buy("HOTEL_LIFE", 445, 185, "#39ff14", "❤️ LIFE INSURANCE", 3000, { extraLife: 1, desc: "+1 EXTRA LIFE" }),
                buy("HOTEL_SUITE", 185, 265, "#fde047", "👑 PENTHOUSE SUITE", 1500, { hp: 999, armor: 100, clearWanted: true, setMinutes: 1200, desc: "FULL HEAL, NO STARS, NIGHT" })
            ]
        },
        CLOTHES: {
            theme: "SHOP_CLOTHES",
            accent: "#38bdf8",
            mat: [0.22, 0.74, 0.98],
            icon: "👗",
            names: ["VICE THREADS", "BOARDWALK BOUTIQUE", "SUNNY STYLE", "MIAMI KICKS", "LUXE & LEO"],
            subtitle: "CARRARA MARBLE SHOWROOM, DESIGNER PODIUM & PRIVATE FITTING SUITES",
            npcs: [
                { x: 145, y: 98, angle: Math.PI * 0.5, type: "civ2", label: "STYLIST" },
                { x: 595, y: 260, angle: 0, type: "civ3", label: "SHOPPER" }
            ],
            stations: () => [
                buy("CLOTHES_DISGUISE", 155, 195, "#38bdf8", "🕶️ NEW DISGUISE", 250, { bandanaToggle: true, clearWanted: true, desc: "NO STARS + NEW LOOK" }),
                buy("CLOTHES_VEST", 365, 180, "#a3e635", "🧥 KEVLAR JACKET", 350, { armor: 70, desc: "+70 ARMOR" }),
                buy("CLOTHES_VIP", 365, 395, "#facc15", "💎 DESIGNER LABEL", 4000, { multiplier: 1, desc: "SCORE MULTIPLIER +1" })
            ]
        },
        CONVENIENCE: {
            theme: "SHOP_CONVENIENCE",
            accent: "#39ff14",
            mat: [0.22, 0.95, 0.12],
            icon: "🏪",
            names: ["24/7 QUICK STOP", "PALM MART", "SUNSHINE MINI MARKET", "LITTLE HAVANA CORNER STORE", "NIGHT OWL MART"],
            subtitle: "WALK-IN COOLERS, SUPERMARKET AISLES, SLUSHIE BAR & CASHIER REGISTER",
            npcs: [
                { x: 106, y: 100, angle: Math.PI * 0.5, type: "civ0", label: "CASHIER" },
                { x: 386, y: 274, angle: Math.PI, type: "civ1", label: "SHOPPER" }
            ],
            stations: () => [
                buy("STORE_SNACK", 386, 120, "#fb923c", "🌮 SNACK PACK", 15, { hp: 20, desc: "+20 HEALTH" }),
                buy("STORE_MEDKIT", 585, 290, "#ef4444", "🩹 FIRST AID KIT", 90, { hp: 999, desc: "FULL HEALTH" }),
                buy("STORE_ENERGY", 605, 165, "#22d3ee", "⚡ ENERGY DRINK", 30, { speed: 25, desc: "SPEED BOOST 25S" }),
                buy("STORE_JAIL", 155, 420, "#38bdf8", "🎟️ GET OUT OF JAIL FREE", 800, { jailCards: 1, desc: "+1 JAIL-FREE CARD" }),
                {
                    id: "STORE_ROB",
                    x: 135,
                    y: 200,
                    color: "#fde047",
                    label: "💵 ROB THE REGISTER",
                    sub: "[E] +$1.5-4K BUT 3 STARS!",
                    effect: { heist: [1500, 4000], wanted: 3, desc: "HOLD-UP" },
                    cooldownSec: 120
                }
            ]
        },
        BAR: {
            theme: "SHOP_BAR",
            accent: "#c084fc",
            mat: [0.75, 0.5, 0.98],
            icon: "🍹",
            names: ["THE RUSTY ANCHOR", "FLAMINGO LOUNGE", "PALM TREE TAVERN", "COCO LOCO BAR", "LAST CALL"],
            subtitle: "MAHOGANY NEON TAVERN, TOURNAMENT POOL PARLOR & RETRO ARCADE",
            npcs: [
                { x: 176, y: 94, angle: Math.PI * 0.5, type: "civ3", label: "BARTENDER" },
                { x: 238, y: 282, angle: 0, type: "gang", label: "REGULAR" },
                { x: 614, y: 374, angle: -Math.PI * 0.5, type: "civ1", label: "POOL SHARK" }
            ],
            stations: () => [
                buy("BAR_BEER", 135, 198, "#facc15", "🍺 ICE-COLD BEER", 20, { hp: 15, speed: 10, desc: "+15 HP, SPEED" }),
                buy("BAR_COCKTAIL", 605, 195, "#f472b6", "🍹 MOJITO", 45, { hp: 40, speed: 18, desc: "+40 HP, SPEED 18S" }),
                buy("BAR_SHOT", 275, 198, "#ef4444", "🥃 TEQUILA SHOT", 35, { armor: 30, speed: 15, desc: "+30 ARMOR, SPEED" }),
                buy("BAR_BRIBE", 614, 420, "#facc15", "💰 PAY OFF A COP", 500, { bribe: 2, desc: "-2 WANTED STARS" })
            ]
        }
    };

    // Round-robin so every type is guaranteed to show up on the map
    const TYPE_ORDER = [
        "GUN_SHOP", "RESTAURANT", "CONVENIENCE", "HOTEL", "BAR", "CLOTHES",
        "RESTAURANT", "CONVENIENCE", "BAR", "RESTAURANT"
    ];

    function hash2(a, b) {
        let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
        return (h ^ (h >>> 15)) >>> 0;
    }


    function hexToRgb(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
        if (!m) return [0.96, 0.25, 0.65];
        const n = parseInt(m[1], 16);
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }

    /**
     * Hand-made landmark interiors were authored with a free-floating door position. Snap each one to the
     * nearest sidewalk/ground tile touching a building facade and record which wall (facing = wall normal).
     * Landmarks with no building nearby keep their classic glowing mat.
     */
    function snapLandmarkDoors(map, maxDist = 5) {
        const cols = MAP_COLS;
        const rows = MAP_ROWS;
        const ts = TILE_SIZE;
        const ground = map.surfaceGround;
        if (!ground || !map.interiors) return;
        const gt = (c, r) => (c >= 0 && r >= 0 && c < cols && r < rows ? ground[r * cols + c] : -1);
        const walkable = (c, r) => gt(c, r) === GROUND_TYPE.PAWEMENT || gt(c, r) === GROUND_TYPE.FIELD;
        const dirs = [
            { dc: 0, dr: -1, facing: "S", penalty: 0.0 }, // building to the north -> door in a south-facing wall
            { dc: -1, dr: 0, facing: "E", penalty: 1.5 },
            { dc: 1, dr: 0, facing: "W", penalty: 1.5 },
            { dc: 0, dr: 1, facing: "N", penalty: 6.0 }
        ];
        for (const intr of map.interiors) {
            if (intr.isShop || intr.id === "STAR_ISLAND") continue;
            intr.matRGB = hexToRgb(intr.accent);
            const cInit = Math.floor(intr.doorX / ts);
            const rInit = Math.floor(intr.doorY / ts);
            if (intr.facing === "S" && walkable(cInit, rInit) && gt(cInit, rInit - 1) === GROUND_TYPE.BUILDING) {
                intr.doorX = (cInit + 0.5) * ts;
                intr.doorY = (rInit + 0.5) * ts;
                continue;
            }
            const c0 = cInit;
            const r0 = rInit;
            let best = null;
            for (let dr = -maxDist; dr <= maxDist; dr++) {
                for (let dc = -maxDist; dc <= maxDist; dc++) {
                    const c = c0 + dc;
                    const r = r0 + dr;
                    if (!walkable(c, r)) continue;
                    for (const d of dirs) {
                        if (gt(c + d.dc, r + d.dr) !== GROUND_TYPE.BUILDING) continue;
                        if (d.facing === "S" && gt(c, r + 1) === GROUND_TYPE.BUILDING) continue;
                        const dist = Math.hypot(dc, dr) + d.penalty;
                        if (!best || dist < best.dist) best = { c, r, facing: d.facing, dist };
                    }
                }
            }
            if (best) {
                intr.facing = best.facing;
                intr.doorX = (best.c + 0.5) * ts;
                intr.doorY = (best.r + 0.5) * ts;
            }
        }
    }

    function buildInterior(type, index, c, r, tileSize) {
        const tpl = SHOP_TEMPLATES[type];
        const nm = tpl.names[hash2(c, r) % tpl.names.length];
        return {
            id: `SHOP_${type}_${c}_${r}`,
            shopType: type,
            isShop: true,
            name: `${tpl.icon} ${nm}`,
            subtitle: tpl.subtitle,
            theme: tpl.theme,
            accent: tpl.accent,
            matRGB: tpl.mat,
            facing: "S",
            doorX: (c + 0.5) * tileSize,
            doorY: (r + 1.5) * tileSize,
            w: ROOM_W,
            h: ROOM_H,
            npcs: tpl.npcs.map((n) => ({ ...n })),
            stations: tpl.stations()
        };
    }

    /**
     * Scan the map for south-facing storefronts (BUILDING tile whose southern
     * neighbour is sidewalk) and create shop interiors on a spaced-out subset.
     * Deterministic: same map => same shops.
     */
    function generate(map, opts = {}) {
        const maxShops = opts.maxShops || 72;
        const minSpacing = opts.minSpacing || 9;
        const cols = MAP_COLS;
        const rows = MAP_ROWS;
        const ts = TILE_SIZE;
        const ground = map.surfaceGround;
        if (!ground) return [];

        const isB = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && ground[r * cols + c] === GROUND_TYPE.BUILDING;
        const isP = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && ground[r * cols + c] === GROUND_TYPE.PAWEMENT;

        const existing = (map.interiors || []).map((it) => ({ c: it.doorX / ts, r: it.doorY / ts }));

        // 1. Collect storefront runs (>= 2 tiles wide) on south-facing facades
        const cands = [];
        for (let r = 4; r < rows - 4; r++) {
            let c = 1;
            while (c < cols - 1) {
                if (isB(c, r) && isP(c, r + 1)) {
                    let c1 = c;
                    while (c1 + 1 < cols - 1 && isB(c1 + 1, r) && isP(c1 + 1, r + 1)) c1++;
                    const len = c1 - c + 1;
                    if (len >= 2) {
                        const mid = c + (len >> 1);
                        // Door sidewalk tile needs walkable neighbours and must not be trapped in a 1-tile alley behind another building
                        const isRestricted = typeof map.isRestrictedNoTrafficZone === "function" && map.isRestrictedNoTrafficZone(mid, r + 1);
                        if (!isRestricted && (isP(mid - 1, r + 1) || isP(mid + 1, r + 1)) && !isB(mid, r + 2)) {
                            cands.push({ c: mid, r, len });
                        }
                    }
                    c = c1 + 1;
                } else {
                    c++;
                }
            }
        }

        // 2. Reject tiny building clusters (fences, signs, wall stubs)
        const clusterSize = (sc, sr, cap) => {
            const seen = new Set([sr * cols + sc]);
            const q = [sr * cols + sc];
            while (q.length && seen.size < cap) {
                const k = q.pop();
                const kc = k % cols;
                const kr = (k / cols) | 0;
                for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    if (isB(kc + dc, kr + dr)) {
                        const nk = (kr + dr) * cols + (kc + dc);
                        if (!seen.has(nk)) {
                            seen.add(nk);
                            q.push(nk);
                        }
                    }
                }
            }
            return seen.size;
        };
        const good = cands.filter((cd) => clusterSize(cd.c, cd.r, 8) >= 6);

        // 3. Deterministic shuffle (bigger storefronts first within each hash bucket)
        good.sort((a, b) => (hash2(a.c, a.r) - hash2(b.c, b.r)) || (b.len - a.len));

        // 4. Greedy spaced selection
        const chosen = [];
        const tooClose = (cd, list) => list.some((o) => Math.hypot(o.c - cd.c, o.r - cd.r) < minSpacing);
        for (const cd of good) {
            if (chosen.length >= maxShops) break;
            if (tooClose(cd, existing) || tooClose(cd, chosen)) continue;
            chosen.push(cd);
        }

        const out = chosen.map((cd, i) => buildInterior(TYPE_ORDER[i % TYPE_ORDER.length], i, cd.c, cd.r, ts));
        return out;
    }

    /**
     * Physical solid AABBs (partition walls, counters, pool tables, beds, gondola shelves)
     * inside an interior room so the player collides realistically with the architecture
     * while all doorways and station pads remain unobstructed.
     */
    function getObstacles(intr) {
        if (!intr) return [];
        const t = intr.theme;
        if (t === "SHOP_GUN_SHOP") {
            return [
                // North showroom armored glass weapon counter
                { x: 42, y: 122, w: 404, h: 32 },
                // Partition wall between showroom & East Firing Range (doorway at y=170..246)
                { x: 490, y: 68, w: 16, h: 102, isWall: true },
                { x: 490, y: 246, w: 16, h: 224, isWall: true },
                // Firing range booth barrier & lane dividers
                { x: 556, y: 84, w: 10, h: 372 },
                // South-west tactical armor display racks
                { x: 42, y: 284, w: 186, h: 34 }
            ];
        } else if (t === "SHOP_RESTAURANT") {
            return [
                // North commercial kitchen back line
                { x: 36, y: 74, w: 420, h: 32 },
                // Service pass-through counters (open gap at x=224..264 and x=456..548)
                { x: 36, y: 148, w: 188, h: 30 },
                { x: 264, y: 148, w: 192, h: 30 },
                // East beverage & espresso counter
                { x: 548, y: 84, w: 168, h: 36 },
                // West & Center diner booths
                { x: 36, y: 268, w: 136, h: 52 },
                { x: 36, y: 368, w: 136, h: 52 },
                { x: 286, y: 268, w: 136, h: 52 },
                { x: 286, y: 368, w: 136, h: 52 }
            ];
        } else if (t === "SHOP_HOTEL") {
            return [
                // Central concierge mahogany desk
                { x: 300, y: 108, w: 160, h: 30 },
                // West bedroom suite partition wall (doorway at y=220..308)
                { x: 246, y: 68, w: 16, h: 152, isWall: true },
                { x: 246, y: 308, w: 16, h: 168, isWall: true },
                // King bed inside west suite
                { x: 28, y: 112, w: 120, h: 92 },
                // East VIP Lounge & Spa partition wall (doorway at y=220..308)
                { x: 504, y: 68, w: 16, h: 152, isWall: true },
                { x: 504, y: 308, w: 16, h: 168, isWall: true },
                // East cocktail bar counter
                { x: 548, y: 92, w: 168, h: 30 },
                // East sunken jacuzzi rim
                { x: 554, y: 344, w: 172, h: 112 }
            ];
        } else if (t === "SHOP_CLOTHES") {
            return [
                // North-west glass checkout & jewelry counter
                { x: 46, y: 126, w: 200, h: 32 },
                // Central circular velvet mannequin podium
                { x: 316, y: 232, w: 96, h: 96 },
                // Left designer garment racks
                { x: 56, y: 252, w: 140, h: 28 },
                { x: 56, y: 364, w: 140, h: 28 },
                // East Fitting Rooms partition wall (archway at y=212..300)
                { x: 548, y: 68, w: 16, h: 144, isWall: true },
                { x: 548, y: 300, w: 16, h: 176, isWall: true }
            ];
        } else if (t === "SHOP_CONVENIENCE") {
            return [
                // West L-shaped cashier counter
                { x: 36, y: 132, w: 140, h: 32 },
                { x: 36, y: 164, w: 36, h: 76 },
                // Gondola supermarket shelving aisles
                { x: 256, y: 144, w: 88, h: 100 },
                { x: 436, y: 144, w: 88, h: 100 },
                { x: 256, y: 312, w: 88, h: 100 },
                { x: 436, y: 312, w: 88, h: 100 },
                // East slushie & coffee counter
                { x: 656, y: 136, w: 68, h: 230 }
            ];
        } else if (t === "SHOP_BAR") {
            return [
                // North-west mahogany dive bar counter
                { x: 42, y: 122, w: 268, h: 34 },
                // East Billiards & Arcade partition pillars (wide archway y=192..332)
                { x: 482, y: 68, w: 16, h: 124, isWall: true },
                { x: 482, y: 332, w: 16, h: 144, isWall: true },
                // Tournament emerald-felt Pool Table in east wing
                { x: 532, y: 252, w: 164, h: 92 },
                // Center leather booths
                { x: 276, y: 258, w: 132, h: 44 },
                { x: 276, y: 368, w: 132, h: 44 }
            ];
        } else if (t === "ART_DECO_HOTEL") {
            return [
                { x: 300, y: 108, w: 160, h: 30 },
                { x: 246, y: 68, w: 16, h: 152, isWall: true },
                { x: 246, y: 308, w: 16, h: 168, isWall: true },
                { x: 28, y: 112, w: 120, h: 92 },
                { x: 504, y: 68, w: 16, h: 152, isWall: true },
                { x: 504, y: 308, w: 16, h: 168, isWall: true },
                { x: 548, y: 92, w: 168, h: 30 },
                { x: 554, y: 344, w: 172, h: 112 }
            ];
        } else if (t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "MALIBU_CLUB") {
            return [
                // West VIP bar counter
                { x: 36, y: 118, w: 168, h: 36 },
                // East Manager Vault Room partition wall (doorway at y=185..265)
                { x: 556, y: 68, w: 16, h: 117, isWall: true },
                { x: 556, y: 265, w: 16, h: 195, isWall: true }
            ];
        } else if (t === "MANSION") {
            return [
                // North executive desk
                { x: 310, y: 114, w: 200, h: 38 },
                // West Armory & East Jacuzzi wing walls
                { x: 256, y: 68, w: 18, h: 115, isWall: true },
                { x: 256, y: 275, w: 18, h: 185, isWall: true },
                { x: 556, y: 68, w: 18, h: 115, isWall: true },
                { x: 556, y: 275, w: 18, h: 185, isWall: true }
            ];
        } else if (t === "SPACE_BUNKER") {
            return [
                { x: 292, y: 128, w: 236, h: 36 },
                { x: 292, y: 238, w: 236, h: 36 },
                { x: 292, y: 348, w: 236, h: 36 }
            ];
        } else if (t === "PRISON_BLOCK") {
            return [
                // North cellblock dividers between Cell #06, Warden Office & SWAT Armory
                { x: 268, y: 68, w: 16, h: 145, isWall: true },
                { x: 526, y: 68, w: 16, h: 145, isWall: true },
                // Warden's desk
                { x: 310, y: 122, w: 180, h: 38 },
                // South cellblock mess tables
                { x: 64, y: 348, w: 136, h: 44 },
                { x: 336, y: 348, w: 136, h: 44 }
            ];
        } else if (t === "DINER_PAWN") {
            return [
                // Partition wall between Hank's Waffles (west/center) and Uncle Jack's Pawn Shop (east)
                { x: 484, y: 68, w: 16, h: 145, isWall: true },
                { x: 484, y: 305, w: 16, h: 170, isWall: true },
                // Hank's Diner counter & Uncle Jack's Pawn counter
                { x: 36, y: 148, w: 188, h: 30 },
                { x: 264, y: 148, w: 192, h: 30 },
                { x: 532, y: 134, w: 196, h: 34 }
            ];
        }
        return [];
    }

    window.ShopInteriors = { generate, snapLandmarkDoors, getObstacles, TEMPLATES: SHOP_TEMPLATES, ROOM_W, ROOM_H };
})();
