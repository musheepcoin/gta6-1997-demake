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
            subtitle: "PISTOLS, SMGS, SHOTGUNS & BODY ARMOR — LICENSED DEALER (LOL)",
            npcs: [
                { x: 380, y: 130, angle: Math.PI * 0.5, type: "gang", label: "GUN DEALER" },
                { x: 600, y: 410, angle: Math.PI, type: "civ1", label: "CUSTOMER" }
            ],
            stations: () => [
                buy("GUN_PISTOL", 150, 165, "#fde047", "🔫 PISTOL +60", 150, { weapon: "PISTOL", ammo: 60, desc: "PISTOL + 60 AMMO" }),
                buy("GUN_UZI", 380, 165, "#f97316", "🔫 SMG +150", 800, { weapon: "UZI", ammo: 150, desc: "FULL-AUTO SMG" }),
                buy("GUN_SHOTGUN", 610, 165, "#ef4444", "🔫 SHOTGUN +30", 1200, { weapon: "SHOTGUN", ammo: 30, desc: "6-PELLET SPREAD" }),
                buy("GUN_ARMOR", 150, 335, "#38bdf8", "🛡️ BODY ARMOR", 500, { armor: 100, desc: "+100 ARMOR" }),
                buy("GUN_ROCKET", 380, 335, "#a855f7", "🚀 ROCKETS +8", 4000, { weapon: "ROCKET", ammo: 8, desc: "BIG BOOM" }),
                buy("GUN_FLAME", 610, 335, "#fb923c", "🔥 FLAMETHROWER +150", 2500, { weapon: "FLAMETHROWER", ammo: 150, desc: "BURN EVERYTHING" })
            ]
        },
        RESTAURANT: {
            theme: "SHOP_RESTAURANT",
            accent: "#facc15",
            mat: [0.98, 0.82, 0.10],
            icon: "🍔",
            names: ["CAFE CUBANO", "OCEAN GRILL", "BURGER SHOT", "EL PESCADOR", "NEON DINER", "PALM BISTRO", "SUNSET TACOS"],
            subtitle: "HOT FOOD, COLD DRINKS — RESTORE HEALTH",
            npcs: [
                { x: 380, y: 125, angle: Math.PI * 0.5, type: "civ0", label: "CHEF" },
                { x: 170, y: 395, angle: 0, type: "civ3", label: "DINER" },
                { x: 600, y: 395, angle: Math.PI, type: "civ2", label: "DINER" }
            ],
            stations: () => [
                buy("FOOD_BURGER", 150, 165, "#fb923c", "🍔 BURGER", 40, { hp: 40, desc: "+40 HEALTH" }),
                buy("FOOD_MEAL", 380, 165, "#39ff14", "🍽️ CHEF'S SPECIAL", 120, { hp: 999, desc: "FULL HEALTH" }),
                buy("FOOD_COFFEE", 610, 165, "#a16207", "☕ DOUBLE ESPRESSO", 25, { speed: 20, desc: "SPEED BOOST 20S" })
            ]
        },
        HOTEL: {
            theme: "SHOP_HOTEL",
            accent: "#f472b6",
            mat: [0.96, 0.25, 0.65],
            icon: "🏨",
            names: ["HOTEL FLAMINGO", "PALMS MOTEL", "OCEAN VIEW SUITES", "THE GOLDEN IGUANA", "HOTEL TRIPICANA"],
            subtitle: "SLEEP IT OFF — CLEAR YOUR WANTED LEVEL",
            npcs: [
                { x: 380, y: 125, angle: Math.PI * 0.5, type: "civ2", label: "RECEPTION" },
                { x: 620, y: 395, angle: Math.PI, type: "civ1", label: "GUEST" }
            ],
            stations: () => [
                buy("HOTEL_ROOM", 190, 165, "#f472b6", "🛏️ PRIVATE ROOM", 500, { hp: 999, armor: 50, clearWanted: true, setMinutes: 480, desc: "HEAL, NO STARS, MORNING" }),
                buy("HOTEL_MINIBAR", 570, 165, "#38bdf8", "🍸 MINIBAR", 60, { hp: 25, speed: 12, desc: "+25 HP + SPEED" }),
                buy("HOTEL_LIFE", 190, 335, "#39ff14", "❤️ LIFE INSURANCE", 3000, { extraLife: 1, desc: "+1 EXTRA LIFE" }),
                buy("HOTEL_SUITE", 570, 335, "#fde047", "👑 PENTHOUSE SUITE", 1500, { hp: 999, armor: 100, clearWanted: true, setMinutes: 1200, desc: "FULL HEAL, NO STARS, NIGHT" })
            ]
        },
        CLOTHES: {
            theme: "SHOP_CLOTHES",
            accent: "#38bdf8",
            mat: [0.22, 0.74, 0.98],
            icon: "👗",
            names: ["VICE THREADS", "BOARDWALK BOUTIQUE", "SUNNY STYLE", "MIAMI KICKS", "LUXE & LEO"],
            subtitle: "NEW LOOK, NEW IDENTITY — SHAKE THE COPS",
            npcs: [
                { x: 380, y: 125, angle: Math.PI * 0.5, type: "civ2", label: "CLERK" },
                { x: 600, y: 400, angle: Math.PI, type: "civ3", label: "SHOPPER" }
            ],
            stations: () => [
                buy("CLOTHES_DISGUISE", 240, 165, "#38bdf8", "🕶️ NEW DISGUISE", 250, { bandanaToggle: true, clearWanted: true, desc: "NO STARS + NEW LOOK" }),
                buy("CLOTHES_VEST", 520, 165, "#a3e635", "🧥 KEVLAR JACKET", 350, { armor: 70, desc: "+70 ARMOR" }),
                buy("CLOTHES_VIP", 380, 335, "#facc15", "💎 DESIGNER LABEL", 4000, { multiplier: 1, desc: "SCORE MULTIPLIER +1" })
            ]
        },
        CONVENIENCE: {
            theme: "SHOP_CONVENIENCE",
            accent: "#39ff14",
            mat: [0.22, 0.95, 0.12],
            icon: "🏪",
            names: ["24/7 QUICK STOP", "PALM MART", "SUNSHINE MINI MARKET", "LITTLE HAVANA CORNER STORE", "NIGHT OWL MART"],
            subtitle: "SNACKS, SODA — OR ROB THE REGISTER (3 STARS!)",
            npcs: [
                { x: 380, y: 125, angle: Math.PI * 0.5, type: "civ0", label: "CLERK" },
                { x: 180, y: 400, angle: 0, type: "civ1", label: "SHOPPER" }
            ],
            stations: () => [
                buy("STORE_SNACK", 150, 165, "#fb923c", "🌮 SNACK PACK", 15, { hp: 20, desc: "+20 HEALTH" }),
                buy("STORE_MEDKIT", 380, 165, "#ef4444", "🩹 FIRST AID KIT", 90, { hp: 999, desc: "FULL HEALTH" }),
                buy("STORE_ENERGY", 610, 165, "#22d3ee", "⚡ ENERGY DRINK", 30, { speed: 25, desc: "SPEED BOOST 25S" }),
                buy("STORE_JAIL", 150, 335, "#38bdf8", "🎟️ GET OUT OF JAIL FREE", 800, { jailCards: 1, desc: "+1 JAIL-FREE CARD" }),
                {
                    id: "STORE_ROB",
                    x: 380,
                    y: 335,
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
            subtitle: "COLD ONES & CONFIDENCE — LIQUID COURAGE",
            npcs: [
                { x: 380, y: 125, angle: Math.PI * 0.5, type: "civ3", label: "BARTENDER" },
                { x: 200, y: 330, angle: 0, type: "gang", label: "REGULAR" },
                { x: 610, y: 395, angle: Math.PI, type: "civ1", label: "PATRON" }
            ],
            stations: () => [
                buy("BAR_BEER", 190, 165, "#facc15", "🍺 ICE-COLD BEER", 20, { hp: 15, speed: 10, desc: "+15 HP, SPEED" }),
                buy("BAR_COCKTAIL", 570, 165, "#f472b6", "🍹 MOJITO", 45, { hp: 40, speed: 18, desc: "+40 HP, SPEED 18S" }),
                buy("BAR_SHOT", 190, 335, "#ef4444", "🥃 TEQUILA SHOT", 35, { armor: 30, speed: 15, desc: "+30 ARMOR, SPEED" }),
                buy("BAR_BRIBE", 570, 335, "#facc15", "💰 PAY OFF A COP", 500, { bribe: 2, desc: "-2 WANTED STARS" })
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
            { dc: 0, dr: -1, facing: "S" }, // building to the north -> door in a south-facing wall
            { dc: 0, dr: 1, facing: "N" },
            { dc: -1, dr: 0, facing: "E" },
            { dc: 1, dr: 0, facing: "W" }
        ];
        for (const intr of map.interiors) {
            if (intr.isShop || intr.facing) continue;
            const c0 = Math.floor(intr.doorX / ts);
            const r0 = Math.floor(intr.doorY / ts);
            let best = null;
            for (let dr = -maxDist; dr <= maxDist; dr++) {
                for (let dc = -maxDist; dc <= maxDist; dc++) {
                    const c = c0 + dc;
                    const r = r0 + dr;
                    if (!walkable(c, r)) continue;
                    for (const d of dirs) {
                        if (gt(c + d.dc, r + d.dr) !== GROUND_TYPE.BUILDING) continue;
                        const dist = Math.hypot(dc, dr) + (d.facing === "S" ? 0 : 0.15);
                        if (!best || dist < best.dist) best = { c, r, facing: d.facing, dist };
                    }
                }
            }
            if (best) {
                intr.facing = best.facing;
                intr.doorX = (best.c + 0.5) * ts;
                intr.doorY = (best.r + 0.5) * ts;
                intr.matRGB = hexToRgb(intr.accent);
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
                        // Door sidewalk tile needs walkable neighbours (not a 1-tile pavement sliver)
                        if (isP(mid - 1, r + 1) || isP(mid + 1, r + 1)) {
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

    window.ShopInteriors = { generate, snapLandmarkDoors, TEMPLATES: SHOP_TEMPLATES, ROOM_W, ROOM_H };
})();
