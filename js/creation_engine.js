/* ============================================================================
   VICE CITY 26 — UNIFIED 3D WORLD, ASSET & MISSION CREATION ENGINE (v101_225)
   ----------------------------------------------------------------------------
   Provides both:
   1. A Declarative Programmatic Creation API (`game.creationEngine.*`) with
      automatic Spatial Safety Oracle (`validatePlacement`, `findSafePlacement`),
      3D Voxel Map Sculpting (`paintVoxelTile`), Custom Vehicle/3D Prefab/Prop/
      Flora/Interior Factory, Declarative Mission Composer, Pre-Existing World
      Inspector/Relocator/Mutator Bridge (`getPreExistingWorldSummary`,
      `inspectWorldAt`, `findNearestWorldEntity`, `relocateWorldEntity`,
      `removeNearestWorldEntity`), and JSON Blueprint Export/Import + Undo/Redo.
   2. An Interactive In-Game 3D Visual World & Asset Studio (`[F10]`) with
      Screen-to-3D-World Ray Projection, Live 3D Ghost Preview, Pre-Existing
      Entity Eyedropper/Cloner (`[C]`), Grab/Move (`[M]`), Free Camera Panning,
      Grid/Curb Snapping, Rotation (`[R]`), and 1-Click Placement.
   ============================================================================ */

(function () {
    "use strict";

    const STORAGE_KEY = "vc26_creation_blueprint_v1";

    class ViceCreationEngine {
        constructor(game) {
            this.game = game;
            this.version = "101_225";
            this.studioActive = false;
            this.freeCamActive = true;
            this.gridSnap = false;
            this.autoSafeSnap = true;
            this.camX = 0;
            this.camY = 0;
            this.placementAngle = 0; // radians
            this.buildingStoreys = 2; // 1..4 storeys above ground z=2
            this.buildingStyle = 0;   // 0..11 GTA 6 facade style
            this.grabbedEntity = null;
            this.selectedEntity = null;
            this.activeExpansionIdx = 0;
            this._paletteThemeIdx = 0;
            this._preExistingIndexed = false;
            this._baseVoxelSnapshots = new Map();
            this._activeVoxelEdits = new Map();
            this._deletedPreExistingMap = new Map();
            this._basePreExistingPoses = new Map();
            this._basePreExistingStates = new Map();
            this._persistedEntityPatches = new Map();
            this._serverCreationSynced = false;
            this._pendingAuthoritativeOps = null;

            // Active Studio UI state
            this.categories = ["TERRAIN", "VEHICLES", "PREFABS_3D", "PROPS_FLORA", "INTERIORS", "MISSIONS"];
            this.categoryLabels = {
                TERRAIN: "1. VOXEL & 3D BLDG",
                VEHICLES: "2. VEHICLES (43+)",
                PREFABS_3D: "3. 3D PREFABS",
                PROPS_FLORA: "4. PROPS & FLORA",
                INTERIORS: "5. 3D INTERIORS",
                MISSIONS: "6. MISSIONS"
            };
            this.activeCategoryIdx = 0;
            this.selectedItemIdxByCat = {
                TERRAIN: 0,
                VEHICLES: 0,
                PREFABS_3D: 0,
                PROPS_FLORA: 0,
                INTERIORS: 0,
                MISSIONS: 0
            };
            this.paletteScrollByCat = {
                TERRAIN: 0,
                VEHICLES: 0,
                PREFABS_3D: 0,
                PROPS_FLORA: 0,
                INTERIORS: 0,
                MISSIONS: 0
            };

            // Undo / Redo & Blueprint State
            this.undoStack = [];
            this.redoStack = [];
            this.createdEntities = [];
            this.customVehicles = {};
            this.customPrefabs = {};
            this.customMissions = {};
            this.studioButtons = [];
            this.statusMessage = "READY — PRESS [F10] TO TOGGLE CREATION STUDIO • LEFT-CLICK TO PLACE • RIGHT-CLICK TO DELETE";
            this.statusTimer = 0;

            // Cached canonical voxel block templates extracted once map is loaded
            this._voxelTemplatesReady = false;
            this._tplBlocks = null;
            if (this.game && this.game.map && typeof this.game.map.getSurfaceGroundType !== "function") {
                this.game.map.getSurfaceGroundType = function (c, r) {
                    if (!this.surfaceGround || c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return 0;
                    return this.surfaceGround[r * MAP_COLS + c];
                };
            }
        }

        getSurfaceGroundAtTile(c, r) {
            const map = this.game && this.game.map;
            if (!map || !map.surfaceGround || c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return 0;
            return map.surfaceGround[r * MAP_COLS + c];
        }

        /* ====================================================================
           1. UNIFIED CATALOG & PALETTE REGISTRY
           ==================================================================== */
        getActiveCategory() {
            return this.categories[this.activeCategoryIdx] || "TERRAIN";
        }

        getCatalogForCategory(cat) {
            if (cat === "TERRAIN") {
                return [
                    { key: "ROAD_NS", label: "Asphalt Road (N-S)", icon: "🛣️", groundType: 2 },
                    { key: "ROAD_EW", label: "Asphalt Road (E-W)", icon: "🛣️", groundType: 2 },
                    { key: "ROAD_CROSS", label: "4-Way Intersection", icon: "✚", groundType: 2 },
                    { key: "SIDEWALK", label: "Coral Sidewalk Paver", icon: "⬜", groundType: 3 },
                    { key: "WOOD_BOARDWALK", label: "Teak Pier Boardwalk", icon: "🪵", groundType: 3 },
                    { key: "BEACH_SAND", label: "Golden Beach Sand", icon: "🏖️", groundType: 3 },
                    { key: "TROPICAL_LAWN", label: "Tropical Park Lawn", icon: "🌿", groundType: 4 },
                    { key: "OCEAN_WATER", label: "Atlantic Ocean Water", icon: "🌊", groundType: 1 },
                    { key: "BLDG_ART_DECO_3F", label: "3D Art Deco Hotel (3F)", icon: "🏨", groundType: 5, storeys: 1, style: 0 },
                    { key: "BLDG_HOTEL_4F", label: "3D Neon Resort (4F)", icon: "🏢", groundType: 5, storeys: 2, style: 1 },
                    { key: "BLDG_TOWER_5F", label: "3D Vice Highrise (5F)", icon: "🏙️", groundType: 5, storeys: 3, style: 3 },
                    { key: "BLDG_SKYSCRAPER_6F", label: "3D Glass Tower (6F)", icon: "🌆", groundType: 5, storeys: 4, style: 10 },
                    { key: "DEMOLISH_TO_PAVE", label: "Demolish to Plaza", icon: "🧨", groundType: 3 }
                ];
            }
            if (cat === "VEHICLES") {
                const items = [];
                const specs = (typeof VEHICLE_SPECS !== "undefined" && VEHICLE_SPECS) ? VEHICLE_SPECS : {};
                for (const [k, s] of Object.entries(specs)) {
                    const icon = s.waterOnly ? "🚤" : (s.isTank ? "🪖" : (s.isPolice ? "🚓" : (s.isMotorcycle ? "🏍️" : "🚗")));
                    items.push({
                        key: k,
                        label: s.name || k,
                        icon,
                        waterOnly: Boolean(s.waterOnly),
                        amphibious: Boolean(s.amphibious)
                    });
                }
                return items;
            }
            if (cat === "PREFABS_3D") {
                const items = [];
                const cat3D = (window.PREFAB_CATALOG && typeof window.PREFAB_CATALOG === "object") ? window.PREFAB_CATALOG : {};
                for (const [k, p] of Object.entries(cat3D)) {
                    items.push({
                        key: k,
                        label: p.label || k,
                        icon: "🏛️",
                        isEstatePrefab: true,
                        footprintW: p.w1 || ((p.footprintTiles ? p.footprintTiles[0] : 2) * 64),
                        footprintH: p.d1 || ((p.footprintTiles ? p.footprintTiles[1] : 2) * 64)
                    });
                }
                items.push(
                    { key: "TIKI_BAR_3D", label: "3D Thatch Beach Tiki Bar", icon: "🍹", isInteractiveEncounter: true, footprintW: 52, footprintH: 36 },
                    { key: "VOLLEYBALL_COURT_3D", label: "3D Beach Volleyball Court", icon: "🏐", isInteractiveEncounter: true, footprintW: 72, footprintH: 48 },
                    { key: "STREET_TAKEOVER_RING", label: "3D Drift Takeover Ring", icon: "🍩", isInteractiveEncounter: true, footprintW: 120, footprintH: 120 },
                    { key: "SMUGGLER_CRATE_3D", label: "3D Smuggler Contraband Drop", icon: "📦", isInteractiveEncounter: true, footprintW: 36, footprintH: 36 },
                    { key: "SODA_ECOLA_3D", label: "3D eCola Vending Machine", icon: "🥤", isInteractiveEncounter: true, footprintW: 28, footprintH: 24 },
                    { key: "SODA_SPRUNK_3D", label: "3D Sprunk Vending Machine", icon: "🟢", isInteractiveEncounter: true, footprintW: 28, footprintH: 24 }
                );
                return items;
            }
            if (cat === "PROPS_FLORA") {
                return [
                    { key: "HYDRANT", label: "3D Pressurized Fire Hydrant", icon: "🚒", isStreetProp: true },
                    { key: "STREETLAMP", label: "3D Twin-Arm Neon Streetlamp", icon: "💡", isStreetProp: true },
                    { key: "PAYPHONE", label: "3D Vice Payphone Kiosk", icon: "☎️", isStreetProp: true },
                    { key: "NEWS_STAND", label: "3D Miami News Dispenser", icon: "📰", isStreetProp: true },
                    { key: "palm_tree", label: "Royal Miami Coconut Palm", icon: "🌴", isFlora: true },
                    { key: "coconut_palm_cluster", label: "Twin Resort Palm Cluster", icon: "🌴", isFlora: true },
                    { key: "banyan_tree", label: "Giant Coral Gables Banyan", icon: "🌳", isFlora: true },
                    { key: "live_oak", label: "Southern Live Oak Canopy", icon: "🌳", isFlora: true },
                    { key: "swamp_cypress", label: "Grassrivers Bald Cypress", icon: "🌲", isFlora: true },
                    { key: "slash_pine", label: "Mount Kalaga Slash Pine", icon: "🌲", isFlora: true },
                    { key: "bougainvillea_bush", label: "Neon Pink Bougainvillea", icon: "🌺", isFlora: true }
                ];
            }
            if (cat === "INTERIORS") {
                return [
                    { key: "SHOP_RESTAURANT", label: "3D Vice Diner & Restaurant", icon: "🍔" },
                    { key: "SHOP_CLOTHES", label: "3D Ocean Drive Fashion Boutique", icon: "👗" },
                    { key: "SHOP_BAR", label: "3D Neon Cocktail Lounge & Bar", icon: "🍸" },
                    { key: "SHOP_CONVENIENCE", label: "3D 24/7 Vice Bodega & ATM", icon: "🏪" },
                    { key: "SHOP_GUN_SHOP", label: "3D Ammu-Nation & Firing Range", icon: "🔫" },
                    { key: "SHOP_HOTEL", label: "3D Art Deco Hotel & Spa Suite", icon: "🛎️" }
                ];
            }
            if (cat === "MISSIONS") {
                const items = [
                    { key: "HIJACK_VEHICLE", label: "Hijack & Deliver Exotic Car", icon: "🏎️" },
                    { key: "CONTRABAND_DROP", label: "Collect 3 Contraband Drops", icon: "📦" },
                    { key: "ARMORED_AMBUSH", label: "Intercept Armored Bank Van", icon: "🚐" },
                    { key: "VIP_ELIMINATION", label: "Eliminate Cartel Hit Squad", icon: "🎯" }
                ];
                for (const [mId, mSpec] of Object.entries(this.customMissions)) {
                    items.push({
                        key: mId,
                        label: mSpec.title || mId,
                        icon: "⭐",
                        isCustomBlueprint: true
                    });
                }
                return items;
            }
            return [];
        }

        getSelectedItem() {
            const cat = this.getActiveCategory();
            const list = this.getCatalogForCategory(cat);
            if (!list.length) return null;
            const idx = Math.max(0, Math.min(list.length - 1, this.selectedItemIdxByCat[cat] || 0));
            return list[idx];
        }

        /* ====================================================================
           2. 3D SCREEN-TO-WORLD RAY PROJECTION & SPATIAL SAFETY ORACLE
           ==================================================================== */
        screenToWorld(sx, sy, zBlocks = 2.0) {
            const r = this.game && this.game.renderer;
            if (!r || !r.canvas) {
                const px = this.game && this.game.player ? this.game.player.x : 16384;
                const py = this.game && this.game.player ? this.game.player.y : 16384;
                return { x: px, y: py, c: Math.floor(px / 64), r: Math.floor(py / 64), z: zBlocks };
            }
            const W = Math.max(1, r.canvas.width);
            const H = Math.max(1, r.canvas.height);
            const aspect = W / H;
            const f = 1.0 / Math.tan((55.0 * Math.PI) / 360.0);

            const camXBlocks = r.camX / TILE_SIZE;
            const camYBlocks = r.camY / TILE_SIZE;
            const camElev = r.currentCamElev || ((r.camZBlocks || 2.0) + (r.followHeightBlocks || 5.0));
            const w = Math.max(0.25, camElev - zBlocks);

            const ndcX = (sx / W - 0.5) * 2.0;
            const ndcY = (0.5 - sy / H) * 2.0;

            const xBlocks = camXBlocks + (ndcX * w * aspect) / f;
            const yBlocks = camYBlocks - (ndcY * w) / f;

            const rawX = Math.max(128, Math.min((MAP_COLS - 2) * TILE_SIZE, xBlocks * TILE_SIZE));
            const rawY = Math.max(128, Math.min((MAP_ROWS - 2) * TILE_SIZE, yBlocks * TILE_SIZE));
            const c = Math.max(2, Math.min(MAP_COLS - 3, Math.floor(rawX / TILE_SIZE)));
            const row = Math.max(2, Math.min(MAP_ROWS - 3, Math.floor(rawY / TILE_SIZE)));

            const finalX = this.gridSnap ? (c + 0.5) * TILE_SIZE : rawX;
            const finalY = this.gridSnap ? (row + 0.5) * TILE_SIZE : rawY;

            return {
                x: finalX,
                y: finalY,
                c,
                r: row,
                z: zBlocks
            };
        }

        validatePlacement(category, itemKey, x, y, angle = 0, opts = {}) {
            const map = this.game && this.game.map;
            if (!map || !map.cmpLoaded) {
                return { ok: false, reason: "MAP_NOT_LOADED", snappedX: x, snappedY: y, snappedAngle: angle };
            }
            const c = Math.max(2, Math.min(MAP_COLS - 3, Math.floor(x / TILE_SIZE)));
            const r = Math.max(2, Math.min(MAP_ROWS - 3, Math.floor(y / TILE_SIZE)));
            const gt = this.getSurfaceGroundAtTile(c, r);
            const isWater = map.isWaterAtPixel ? map.isWaterAtPixel(x, y) : (gt === GROUND_TYPE.WATER);
            const isBuilding = gt === GROUND_TYPE.BUILDING || (map.isSolidBuildingAtPixel && map.isSolidBuildingAtPixel(x, y, 2.0));

            if (category === "TERRAIN") {
                return {
                    ok: true,
                    reason: "VALID_VOXEL_TILE",
                    snappedX: (c + 0.5) * TILE_SIZE,
                    snappedY: (r + 0.5) * TILE_SIZE,
                    snappedAngle: 0,
                    tileC: c,
                    tileR: r,
                    groundType: gt
                };
            }

            if (category === "VEHICLES") {
                const spec = (typeof VEHICLE_SPECS !== "undefined" && VEHICLE_SPECS[itemKey]) || {};
                const needsWater = Boolean(spec.waterOnly);
                const canWater = Boolean(spec.waterOnly || spec.amphibious);
                if (needsWater && !isWater) {
                    if (opts.autoSnap !== false && this.autoSafeSnap) {
                        const safe = this.findSafePlacement(category, itemKey, x, y, angle);
                        if (safe.ok) return safe;
                    }
                    return { ok: false, reason: "BOAT_REQUIRES_WATER", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                if (!canWater && isWater) {
                    if (opts.autoSnap !== false && this.autoSafeSnap) {
                        const safe = this.findSafePlacement(category, itemKey, x, y, angle);
                        if (safe.ok) return safe;
                    }
                    return { ok: false, reason: "VEHICLE_IN_WATER", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                if (isBuilding) {
                    if (opts.autoSnap !== false && this.autoSafeSnap) {
                        const safe = this.findSafePlacement(category, itemKey, x, y, angle);
                        if (safe.ok) return safe;
                    }
                    return { ok: false, reason: "BLOCKED_BY_3D_BUILDING", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                return { ok: true, reason: "VALID_VEHICLE_SPOT", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
            }

            if (category === "PREFABS_3D" || category === "PROPS_FLORA") {
                if (isWater) {
                    if (opts.autoSnap !== false && this.autoSafeSnap) {
                        const safe = this.findSafePlacement(category, itemKey, x, y, angle);
                        if (safe.ok) return safe;
                    }
                    return { ok: false, reason: "CANNOT_PLACE_ON_WATER", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                if (isBuilding) {
                    if (opts.autoSnap !== false && this.autoSafeSnap) {
                        const safe = this.findSafePlacement(category, itemKey, x, y, angle);
                        if (safe.ok) return safe;
                    }
                    return { ok: false, reason: "INSIDE_SOLID_BUILDING", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                // 3D Estate Prefabs and Street Props should not sit in the middle of an active road tile unless forced
                if (gt === GROUND_TYPE.ROAD && itemKey !== "STREET_TAKEOVER_RING" && !opts.allowRoad) {
                    if (opts.autoSnap !== false && this.autoSafeSnap) {
                        const safe = this.findSafePlacement(category, itemKey, x, y, angle);
                        if (safe.ok) return safe;
                    }
                    return { ok: false, reason: "BLOCKS_ACTIVE_ROAD_LANE", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                return { ok: true, reason: "VALID_DRY_GROUND", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
            }

            if (category === "INTERIORS") {
                // Find nearest building-to-sidewalk facade wall within 8 tiles
                const wall = this.findNearestBuildingFacadeDoor(c, r);
                if (!wall) {
                    return { ok: false, reason: "NO_NEARBY_BUILDING_FACADE", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
                }
                return {
                    ok: true,
                    reason: wall.autoSnapped ? "AUTO_SNAPPED_TO_FACADE" : "VALID_FACADE_DOOR",
                    snappedX: wall.doorX,
                    snappedY: wall.doorY,
                    snappedAngle: wall.angle,
                    facing: wall.facing,
                    tileC: wall.c,
                    tileR: wall.r,
                    groundType: gt
                };
            }

            if (category === "MISSIONS") {
                if (isBuilding || isWater) {
                    const safe = this.findSafePlacement("PROPS_FLORA", "PAYPHONE", x, y, angle);
                    if (safe.ok) return safe;
                }
                return { ok: true, reason: "VALID_MISSION_TRIGGER", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
            }

            return { ok: true, reason: "VALID", snappedX: x, snappedY: y, snappedAngle: angle, tileC: c, tileR: r, groundType: gt };
        }

        findSafePlacement(category, itemKey, x, y, angle = 0) {
            const map = this.game && this.game.map;
            if (!map) return { ok: false, reason: "NO_MAP", snappedX: x, snappedY: y, snappedAngle: angle };
            const baseC = Math.floor(x / TILE_SIZE);
            const baseR = Math.floor(y / TILE_SIZE);
            const spec = (category === "VEHICLES" && typeof VEHICLE_SPECS !== "undefined" && VEHICLE_SPECS[itemKey]) || {};
            const needsWater = Boolean(spec.waterOnly);

            for (let rad = 1; rad <= 10; rad++) {
                for (let dr = -rad; dr <= rad; dr++) {
                    for (let dc = -rad; dc <= rad; dc++) {
                        if (Math.abs(dc) !== rad && Math.abs(dr) !== rad) continue;
                        const nc = baseC + dc;
                        const nr = baseR + dr;
                        if (nc < 3 || nc >= MAP_COLS - 3 || nr < 3 || nr >= MAP_ROWS - 3) continue;
                        const gt = this.getSurfaceGroundAtTile(nc, nr);
                        const px = (nc + 0.5) * TILE_SIZE;
                        const py = (nr + 0.5) * TILE_SIZE;
                        const isW = map.isWaterAtPixel ? map.isWaterAtPixel(px, py) : (gt === GROUND_TYPE.WATER);
                        const isB = gt === GROUND_TYPE.BUILDING || (map.isSolidBuildingAtPixel && map.isSolidBuildingAtPixel(px, py, 2.0));

                        if (needsWater) {
                            if (isW && !isB) {
                                return {
                                    ok: true,
                                    reason: "AUTO_SNAPPED_TO_WATER",
                                    autoSnapped: true,
                                    snappedX: px,
                                    snappedY: py,
                                    snappedAngle: angle,
                                    tileC: nc,
                                    tileR: nr,
                                    groundType: gt
                                };
                            }
                        } else if (category === "VEHICLES") {
                            if (!isW && !isB && (gt === GROUND_TYPE.ROAD || gt === GROUND_TYPE.PAWEMENT || gt === GROUND_TYPE.FIELD)) {
                                return {
                                    ok: true,
                                    reason: "AUTO_SNAPPED_TO_ROAD",
                                    autoSnapped: true,
                                    snappedX: px,
                                    snappedY: py,
                                    snappedAngle: angle,
                                    tileC: nc,
                                    tileR: nr,
                                    groundType: gt
                                };
                            }
                        } else {
                            if (!isW && !isB && (gt === GROUND_TYPE.PAWEMENT || gt === GROUND_TYPE.FIELD)) {
                                return {
                                    ok: true,
                                    reason: "AUTO_SNAPPED_TO_CURB",
                                    autoSnapped: true,
                                    snappedX: px,
                                    snappedY: py,
                                    snappedAngle: angle,
                                    tileC: nc,
                                    tileR: nr,
                                    groundType: gt
                                };
                            }
                        }
                    }
                }
            }
            return { ok: false, reason: "NO_SAFE_SPOT_NEARBY", snappedX: x, snappedY: y, snappedAngle: angle };
        }

        findNearestBuildingFacadeDoor(c, r) {
            const map = this.game && this.game.map;
            if (!map) return null;
            const dirs = [
                { facing: "S", dc: 0, dr: 1, offX: 32, offY: 16, angle: Math.PI * 0.5 },
                { facing: "N", dc: 0, dr: -1, offX: 32, offY: 48, angle: -Math.PI * 0.5 },
                { facing: "E", dc: 1, dr: 0, offX: 16, offY: 32, angle: 0 },
                { facing: "W", dc: -1, dr: 0, offX: 48, offY: 32, angle: Math.PI }
            ];
            for (let rad = 0; rad <= 10; rad++) {
                for (let dr = -rad; dr <= rad; dr++) {
                    for (let dc = -rad; dc <= rad; dc++) {
                        if (rad > 0 && Math.abs(dc) !== rad && Math.abs(dr) !== rad) continue;
                        const bc = c + dc;
                        const br = r + dr;
                        if (bc < 3 || bc >= MAP_COLS - 3 || br < 3 || br >= MAP_ROWS - 3) continue;
                        if (this.getSurfaceGroundAtTile(bc, br) !== GROUND_TYPE.BUILDING) continue;
                        for (const d of dirs) {
                            const sc = bc + d.dc;
                            const sr = br + d.dr;
                            const sgt = this.getSurfaceGroundAtTile(sc, sr);
                            if (sgt === GROUND_TYPE.PAWEMENT || sgt === GROUND_TYPE.FIELD) {
                                return {
                                    c: sc,
                                    r: sr,
                                    bldgC: bc,
                                    bldgR: br,
                                    facing: d.facing,
                                    doorX: sc * TILE_SIZE + d.offX,
                                    doorY: sr * TILE_SIZE + d.offY,
                                    angle: d.angle,
                                    autoSnapped: rad > 0
                                };
                            }
                        }
                    }
                }
            }
            return null;
        }

        /* ====================================================================
           3. PILLAR 1: REAL-TIME 3D VOXEL & ARCHITECTURAL TERRAIN SCULPTOR
           ==================================================================== */
        _ensureVoxelTemplates() {
            if (this._voxelTemplatesReady && this._tplBlocks) return;
            const map = this.game && this.game.map;
            if (!map || !map.cmpLoaded || !Array.isArray(map.blocksData)) return;

            const findOrAddBlock = (spec) => {
                for (let i = 1; i < map.blocksData.length; i++) {
                    const b = map.blocksData[i];
                    if (!b) continue;
                    if (
                        b.groundType === spec.groundType &&
                        (b.slopeType || 0) === 0 &&
                        Boolean(b.isFlat) === Boolean(spec.isFlat) &&
                        b.faces[0] === spec.faces[0] &&
                        b.faces[1] === spec.faces[1] &&
                        b.faces[2] === spec.faces[2] &&
                        b.faces[3] === spec.faces[3] &&
                        b.faces[4] === spec.faces[4]
                    ) {
                        return i;
                    }
                }
                const newIdx = map.blocksData.length;
                map.blocksData.push({
                    w: spec.faces[0],
                    e: spec.faces[1],
                    n: spec.faces[2],
                    s: spec.faces[3],
                    lid: spec.faces[4],
                    faces: spec.faces.slice(),
                    arrows: spec.arrows || 0,
                    groundType: spec.groundType,
                    slopeType: 0,
                    lidRotation: spec.lidRotation || 0,
                    isFlat: Boolean(spec.isFlat),
                    remap: 0,
                    flipLR: false,
                    flipTB: false
                });
                return newIdx;
            };

            this._tplBlocks = {
                roadNS_z1: findOrAddBlock({ faces: [0, 0, 0, 0, 74], groundType: GROUND_TYPE.ROAD, arrows: 3 }),
                roadEW_z1: findOrAddBlock({ faces: [0, 0, 0, 0, 81], groundType: GROUND_TYPE.ROAD, arrows: 12 }),
                roadCross_z1: findOrAddBlock({ faces: [0, 0, 0, 0, 25], groundType: GROUND_TYPE.ROAD, arrows: 15 }),
                roadNav_z2: findOrAddBlock({ faces: [0, 0, 0, 0, 0], groundType: GROUND_TYPE.ROAD, arrows: 15 }),

                pave_z1: findOrAddBlock({ faces: [8, 8, 8, 8, 8], groundType: GROUND_TYPE.PAWEMENT }),
                boardwalk_z1: findOrAddBlock({ faces: [8, 8, 8, 8, 77], groundType: GROUND_TYPE.PAWEMENT }),
                sand_z1: findOrAddBlock({ faces: [8, 8, 8, 8, 98], groundType: GROUND_TYPE.PAWEMENT }),
                paveNav_z2: findOrAddBlock({ faces: [0, 0, 0, 0, 0], groundType: GROUND_TYPE.PAWEMENT }),

                lawn_z1: findOrAddBlock({ faces: [8, 8, 8, 8, 10], groundType: GROUND_TYPE.FIELD }),
                lawnNav_z2: findOrAddBlock({ faces: [0, 0, 0, 0, 0], groundType: GROUND_TYPE.FIELD }),

                water_z1: findOrAddBlock({ faces: [0, 0, 0, 0, 41], groundType: GROUND_TYPE.WATER, isFlat: true }),
                waterNav_z2: findOrAddBlock({ faces: [0, 0, 0, 0, 0], groundType: GROUND_TYPE.WATER }),

                bldgWall_z: findOrAddBlock({ faces: [32, 32, 32, 32, 0], groundType: GROUND_TYPE.BUILDING }),
                bldgTop_z: findOrAddBlock({ faces: [32, 32, 32, 32, 46], groundType: GROUND_TYPE.BUILDING })
            };
            this._voxelTemplatesReady = true;
        }

        captureVoxelColumnSnapshot(c, r) {
            const map = this.game && this.game.map;
            if (!map || !map.voxelGrid) return null;
            const col = new Uint16Array(MAP_LAYERS);
            for (let z = 0; z < MAP_LAYERS; z++) {
                col[z] = map.voxelGrid[(z * MAP_ROWS + r) * MAP_COLS + c];
            }
            const idx = r * MAP_COLS + c;
            return {
                c,
                r,
                voxels: Array.from(col),
                surfaceGround: map.surfaceGround ? map.surfaceGround[idx] : 0,
                surfaceLayer: map.surfaceLayer ? map.surfaceLayer[idx] : 1,
                bldgId: map.bldgIdGrid ? map.bldgIdGrid[idx] : 0,
                bldgStyle: map.bldgStyleGrid ? map.bldgStyleGrid[idx] : 0,
                bldgTopZ: map.bldgTopZGrid ? map.bldgTopZGrid[idx] : 2,
                coastalSand: map.coastalSandMask ? map.coastalSandMask[idx] : 0
            };
        }

        restoreVoxelColumnSnapshot(snap, rebuildMesh = true) {
            const map = this.game && this.game.map;
            if (!map || !snap) return;
            const { c, r } = snap;
            for (let z = 0; z < MAP_LAYERS; z++) {
                map.voxelGrid[(z * MAP_ROWS + r) * MAP_COLS + c] = snap.voxels[z] || 0;
            }
            const idx = r * MAP_COLS + c;
            if (map.surfaceGround) map.surfaceGround[idx] = snap.surfaceGround;
            if (map.surfaceLayer) map.surfaceLayer[idx] = snap.surfaceLayer;
            if (map.bldgIdGrid) map.bldgIdGrid[idx] = snap.bldgId;
            if (map.bldgStyleGrid) map.bldgStyleGrid[idx] = snap.bldgStyle;
            if (map.bldgTopZGrid) map.bldgTopZGrid[idx] = snap.bldgTopZ;
            if (map.coastalSandMask) map.coastalSandMask[idx] = snap.coastalSand;
            const tKey = `${c}_${r}`;
            const baseSnap = this._baseVoxelSnapshots ? this._baseVoxelSnapshots.get(tKey) : null;
            if (baseSnap && snap.surfaceGround === baseSnap.surfaceGround && snap.bldgId === baseSnap.bldgId) {
                this._activeVoxelEdits.delete(tKey);
            }
            if (rebuildMesh) this.rebuildWorldMeshes(true);
        }

        paintVoxelTile(c, r, presetKey, opts = {}) {
            const map = this.game && this.game.map;
            if (!map || !map.cmpLoaded) return { ok: false, reason: "MAP_NOT_LOADED" };
            c = Math.max(2, Math.min(MAP_COLS - 3, Math.floor(c)));
            r = Math.max(2, Math.min(MAP_ROWS - 3, Math.floor(r)));
            this._ensureVoxelTemplates();
            const T = this._tplBlocks;
            if (!T) return { ok: false, reason: "TEMPLATES_UNAVAILABLE" };

            const tKey = `${c}_${r}`;
            const beforeSnap = this.captureVoxelColumnSnapshot(c, r);
            if (!this._baseVoxelSnapshots.has(tKey) && beforeSnap) {
                this._baseVoxelSnapshots.set(tKey, beforeSnap);
            }
            this._activeVoxelEdits.set(tKey, {
                c,
                r,
                presetKey,
                opts: { storeys: opts.storeys, style: opts.style }
            });
            const idx = r * MAP_COLS + c;

            // Clear column layers 1..5 first
            for (let z = 1; z < MAP_LAYERS; z++) {
                map.voxelGrid[(z * MAP_ROWS + r) * MAP_COLS + c] = 0;
            }
            if (map.bldgIdGrid) map.bldgIdGrid[idx] = 0;
            if (map.bldgStyleGrid) map.bldgStyleGrid[idx] = 0;
            if (map.bldgTopZGrid) map.bldgTopZGrid[idx] = 2;
            if (map.coastalSandMask) map.coastalSandMask[idx] = 0;

            let newGround = GROUND_TYPE.PAWEMENT;
            let newLayer = 2;

            if (presetKey === "ROAD_NS" || presetKey === "ROAD_EW" || presetKey === "ROAD_CROSS") {
                const z1Blk = presetKey === "ROAD_EW" ? T.roadEW_z1 : (presetKey === "ROAD_CROSS" ? T.roadCross_z1 : T.roadNS_z1);
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = z1Blk;
                map.voxelGrid[(2 * MAP_ROWS + r) * MAP_COLS + c] = T.roadNav_z2;
                newGround = GROUND_TYPE.ROAD;
            } else if (presetKey === "SIDEWALK" || presetKey === "DEMOLISH_TO_PAVE") {
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = T.pave_z1;
                map.voxelGrid[(2 * MAP_ROWS + r) * MAP_COLS + c] = T.paveNav_z2;
                newGround = GROUND_TYPE.PAWEMENT;
            } else if (presetKey === "WOOD_BOARDWALK") {
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = T.boardwalk_z1;
                map.voxelGrid[(2 * MAP_ROWS + r) * MAP_COLS + c] = T.paveNav_z2;
                newGround = GROUND_TYPE.PAWEMENT;
            } else if (presetKey === "BEACH_SAND") {
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = T.sand_z1;
                map.voxelGrid[(2 * MAP_ROWS + r) * MAP_COLS + c] = T.paveNav_z2;
                if (map.coastalSandMask) map.coastalSandMask[idx] = 1;
                newGround = GROUND_TYPE.PAWEMENT;
            } else if (presetKey === "TROPICAL_LAWN") {
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = T.lawn_z1;
                map.voxelGrid[(2 * MAP_ROWS + r) * MAP_COLS + c] = T.lawnNav_z2;
                newGround = GROUND_TYPE.FIELD;
            } else if (presetKey === "OCEAN_WATER") {
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = T.water_z1;
                map.voxelGrid[(2 * MAP_ROWS + r) * MAP_COLS + c] = T.waterNav_z2;
                newGround = GROUND_TYPE.WATER;
            } else if (presetKey.startsWith("BLDG_")) {
                let storeys = opts.storeys || this.buildingStoreys || 2;
                let style = opts.style !== undefined ? opts.style : this.buildingStyle;
                if (presetKey === "BLDG_ART_DECO_3F") { storeys = opts.storeys || 1; style = opts.style !== undefined ? opts.style : 0; }
                else if (presetKey === "BLDG_HOTEL_4F") { storeys = opts.storeys || 2; style = opts.style !== undefined ? opts.style : 1; }
                else if (presetKey === "BLDG_TOWER_5F") { storeys = opts.storeys || 3; style = opts.style !== undefined ? opts.style : 3; }
                else if (presetKey === "BLDG_SKYSCRAPER_6F") { storeys = opts.storeys || 4; style = opts.style !== undefined ? opts.style : 10; }

                storeys = Math.max(1, Math.min(4, storeys));
                const topZ = Math.min(5, 1 + storeys); // z=2..topZ
                map.voxelGrid[(1 * MAP_ROWS + r) * MAP_COLS + c] = T.pave_z1;
                for (let z = 2; z < topZ; z++) {
                    map.voxelGrid[(z * MAP_ROWS + r) * MAP_COLS + c] = T.bldgWall_z;
                }
                map.voxelGrid[(topZ * MAP_ROWS + r) * MAP_COLS + c] = T.bldgTop_z;
                newGround = GROUND_TYPE.BUILDING;
                newLayer = topZ;
                if (map.bldgIdGrid) map.bldgIdGrid[idx] = 9000 + ((c * 31 + r * 17) & 0xfff);
                if (map.bldgStyleGrid) map.bldgStyleGrid[idx] = style % 12;
                if (map.bldgTopZGrid) map.bldgTopZGrid[idx] = topZ + 1;
            }

            if (map.surfaceGround) map.surfaceGround[idx] = newGround;
            if (map.surfaceLayer) map.surfaceLayer[idx] = newLayer;

            const afterSnap = this.captureVoxelColumnSnapshot(c, r);

            if (!opts.skipHistory) {
                this._pushHistory({
                    type: "VOXEL_TILE",
                    c,
                    r,
                    presetKey,
                    opts: { storeys: opts.storeys, style: opts.style },
                    beforeSnap,
                    afterSnap
                });
            }

            if (opts.rebuildMesh !== false) {
                this.rebuildWorldMeshes(true);
            }
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "VOXEL_TILE",
                opKey: `voxel_${c}_${r}`,
                c,
                r,
                presetKey,
                storeys: opts.storeys,
                style: opts.style
            }, opts);
            this.setStatus(`PAINTED VOXEL [${presetKey}] AT TILE (${c}, ${r})`);
            return { ok: true, c, r, presetKey, groundType: newGround };
        }

        _broadcastCreationOp(op, opts = {}) {
            if (!op || opts.isRemote || opts.skipBroadcast) return false;
            const net = this.game && this.game.net;
            if (net && typeof net.broadcastWorldEvent === "function") {
                net.broadcastWorldEvent({
                    kind: "CREATION_OP",
                    op
                });
                return true;
            }
            return false;
        }

        rebuildWorldMeshes(fast = true) {
            const r = this.game && this.game.renderer;
            if (!r) return;
            if (typeof r.buildCityMesh === "function" && r.gl) {
                r.buildCityMesh(Boolean(fast));
            }
            if (!fast && r.map && r.map.objectEngine && typeof r.map.objectEngine.buildStatic3DMesh === "function" && r.gl) {
                r.map.objectEngine.buildStatic3DMesh(r.gl, r);
            }
            if (typeof r.bakeRadarBackground === "function") {
                r.bakeRadarBackground();
            }
        }

        /* ====================================================================
           4. PILLAR 2: UNIFIED VEHICLE, 3D PREFAB, PROP, FLORA & INTERIOR FACTORY
           ==================================================================== */
        defineVehicle(specKey, config = {}) {
            if (!specKey || typeof VEHICLE_SPECS === "undefined") return null;
            const key = String(specKey).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
            const base = VEHICLE_SPECS[config.baseSpec || "BANSHEE_GT"] || VEHICLE_SPECS.MINT_STALLION || {};
            const merged = Object.assign({}, base, {
                name: config.name || key.replace(/_/g, " "),
                w: config.w || base.w || 50,
                h: config.h || base.h || 24,
                maxSpeed: config.maxSpeed || base.maxSpeed || 420,
                accel: config.accel || base.accel || 270,
                handling: config.handling || base.handling || 3.4,
                mass: config.mass || base.mass || 1.25,
                hp: config.hp || base.hp || 130,
                color: config.color || base.color || "#00f0ff",
                stripe: config.stripe !== undefined ? config.stripe : (base.stripe || "#ff2a85"),
                roof: config.roof || base.roof || "#0f172a",
                sprId: String(config.sprId || base.sprId || "66"),
                remapIdx: config.remapIdx !== undefined ? config.remapIdx : (base.remapIdx || 0),
                isPolice: Boolean(config.isPolice),
                isEmergency: Boolean(config.isEmergency || config.isPolice),
                isMotorcycle: Boolean(config.isMotorcycle),
                isConvertible: Boolean(config.isConvertible),
                isTank: Boolean(config.isTank),
                waterOnly: Boolean(config.waterOnly),
                amphibious: Boolean(config.amphibious)
            });
            VEHICLE_SPECS[key] = merged;
            this.customVehicles[key] = Object.assign({ baseSpec: config.baseSpec || "BANSHEE_GT" }, config);
            this._broadcastCreationOp({
                action: "DEFINE_VEHICLE",
                opKey: `defveh_${key}`,
                specKey: key,
                config: this.customVehicles[key]
            }, config);
            this.setStatus(`DEFINED CUSTOM VEHICLE ARCHETYPE [${key}] (${merged.name})`);
            return merged;
        }

        spawnVehicle(specKey, x, y, angle = 0, opts = {}) {
            if (!this.game || typeof Vehicle === "undefined") return null;
            const key = (typeof VEHICLE_SPECS !== "undefined" && VEHICLE_SPECS[specKey]) ? specKey : "MINT_STALLION";
            const check = this.validatePlacement("VEHICLES", key, x, y, angle, opts);
            const sx = check.snappedX !== undefined ? check.snappedX : x;
            const sy = check.snappedY !== undefined ? check.snappedY : y;
            const sa = check.snappedAngle !== undefined ? check.snappedAngle : angle;

            const id = opts.id || `ce_veh_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            const existing = this.game.vehicles.find((veh) => veh && veh.id === id);
            if (existing) {
                existing.x = sx;
                existing.y = sy;
                existing.angle = sa;
                this.reapplyPersistedEntityPatch(existing);
                return existing;
            }
            const v = new Vehicle(id, key, sx, sy, sa);
            v.z = this.game.map ? this.game.map.getHeightAtPixel(sx, sy, 2.0, !v.waterOnly) : 2.0;
            if (v.waterOnly) v.z = Math.max(2.0, v.z);
            v.driver = opts.driver || null;
            v.createdByEngine = true;
            this.reapplyPersistedEntityPatch(v);
            this.game.vehicles.push(v);
            if (typeof this.game.rebuildVehicleSpatialGrid === "function") {
                this.game.rebuildVehicleSpatialGrid();
            }

            const record = {
                type: "VEHICLE",
                id,
                specKey: key,
                x: sx,
                y: sy,
                angle: sa,
                entityRef: v
            };
            this.createdEntities.push(record);
            if (!opts.skipHistory) this._pushHistory(record);
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "SPAWN_VEHICLE",
                opKey: id,
                id,
                specKey: key,
                x: Math.round(sx * 10) / 10,
                y: Math.round(sy * 10) / 10,
                angle: Math.round(sa * 1000) / 1000
            }, opts);
            this.setStatus(`SPAWNED VEHICLE [${v.name}] AT (${Math.round(sx)}, ${Math.round(sy)})`);
            return v;
        }

        definePrefab3D(prefabId, config = {}) {
            if (!prefabId) return null;
            const key = String(prefabId).replace(/[^A-Za-z0-9_]/g, "_");
            const cat = window.PREFAB_CATALOG || (window.PREFAB_CATALOG = {});
            const baseKey = (config.basePrefab && cat[config.basePrefab])
                ? config.basePrefab
                : (cat.villa_art_deco ? "villa_art_deco" : Object.keys(cat)[0]);
            const base = (baseKey && cat[baseKey]) || {
                id: "villa_art_deco",
                category: "ESTATE",
                label: "South Beach Art Deco Boutique Villa",
                w1: 156, d1: 112, h1: 0.72,
                w2: 98,  d2: 72,  h2: 0.56,
                roofStyle: "FLAT_DECO",
                roofOverhang: 10,
                roofPitch1: 0.08,
                roofPitch2: 0.08,
                frontWall1: "wall_art_deco_hotel",
                sideWall1:  "wall_art_deco_hotel",
                upperWall:  "wall_art_deco_hotel",
                roofTex1:   "roof_terracotta_crown",
                roofTex2:   "roof_terracotta_crown",
                wallColor:  [0.98, 0.94, 0.96],
                trimColor:  [0.25, 0.92, 0.88],
                roofBaseColor:  [0.94, 0.92, 0.90],
                roofRidgeColor: [0.96, 0.38, 0.68],
                hasPortico: true,
                porticoW: 48, porticoD: 22, porticoH: 0.68,
                hasGlassBalcony: true,
                mapColor: "#fdf2f8",
                mapRoofColor: "#ec4899"
            };
            const firstBox = Array.isArray(config.boxes) && config.boxes.length > 0 ? config.boxes[0] : null;
            const secondBox = Array.isArray(config.boxes) && config.boxes.length > 1 ? config.boxes[1] : null;
            const spec = Object.assign({}, base, {
                id: key,
                category: config.category || base.category || "ESTATE",
                label: config.label || key.replace(/_/g, " "),
                w1: Number(config.w1 || (firstBox && firstBox.w) || base.w1 || 156),
                d1: Number(config.d1 || (firstBox && firstBox.h) || base.d1 || 112),
                h1: Number(config.h1 || (firstBox && ((firstBox.z1 || 1.0) - (firstBox.z0 || 0.0))) || base.h1 || 0.72),
                w2: config.w2 !== undefined ? Number(config.w2) : (secondBox ? Number(secondBox.w || 96) : (base.w2 || 0)),
                d2: config.d2 !== undefined ? Number(config.d2) : (secondBox ? Number(secondBox.h || 68) : (base.d2 || 0)),
                h2: config.h2 !== undefined ? Number(config.h2) : (secondBox ? Number((secondBox.z1 || 1.5) - (secondBox.z0 || 0.72)) : (base.h2 || 0)),
                roofStyle: config.roofStyle || base.roofStyle || "FLAT_DECO",
                roofOverhang: config.roofOverhang !== undefined ? Number(config.roofOverhang) : (base.roofOverhang || 10),
                roofPitch1: config.roofPitch1 !== undefined ? Number(config.roofPitch1) : (base.roofPitch1 || 0.12),
                roofPitch2: config.roofPitch2 !== undefined ? Number(config.roofPitch2) : (base.roofPitch2 || 0.08),
                wallColor: Array.isArray(config.wallColor) ? config.wallColor : (firstBox && Array.isArray(firstBox.rgb) ? firstBox.rgb : base.wallColor),
                trimColor: Array.isArray(config.trimColor) ? config.trimColor : (secondBox && Array.isArray(secondBox.rgb) ? secondBox.rgb : base.trimColor),
                mapColor: config.mapColor || base.mapColor || "#f8fafc",
                mapRoofColor: config.mapRoofColor || base.mapRoofColor || "#ec4899",
                footprintTiles: config.footprintTiles || [3, 2],
                clearPaddingPx: config.clearPaddingPx || 68,
                boxes: Array.isArray(config.boxes) ? config.boxes.map((b) => Object.assign({}, b)) : [],
                props: Array.isArray(config.props) ? config.props.map((p) => Object.assign({}, p)) : []
            });
            cat[key] = spec;
            this.customPrefabs[key] = config;
            this._broadcastCreationOp({
                action: "DEFINE_PREFAB_3D",
                opKey: `defprefab_${key}`,
                prefabId: key,
                config
            }, config);
            this.setStatus(`DEFINED 3D ARCHITECTURAL PREFAB [${key}] (${spec.w1}x${spec.d1}px)`);
            return spec;
        }

        _invalidateArrayAndPromptMasks(arr) {
            if (Array.isArray(arr)) {
                arr._chunkMask32 = null;
                arr._boundsComputed = false;
            }
            const map = this.game && this.game.map;
            if (map) {
                map._livingEventGrid = null;
                if (map.objectEngine) {
                    map.objectEngine._promptCellGrid = null;
                }
            }
        }

        placePrefab3D(prefabId, x, y, angle = 0, opts = {}) {
            const map = this.game && this.game.map;
            if (!map) return null;
            const check = this.validatePlacement("PREFABS_3D", prefabId, x, y, angle, opts);
            const sx = check.snappedX !== undefined ? check.snappedX : x;
            const sy = check.snappedY !== undefined ? check.snappedY : y;
            const sa = check.snappedAngle !== undefined ? check.snappedAngle : angle;
            const id = opts.id || `ce_prefab_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
            const oe = map.objectEngine;

            // Case A: Interactive 3D Encounter / World Activity Prefab
            if (prefabId === "TIKI_BAR_3D") {
                const tb = { id, x: sx, y: sy, z: 2.0, ang: sa, angle: sa, seed: Math.random() * 10, createdByEngine: true };
                if (!Array.isArray(map.tikiBars)) map.tikiBars = [];
                map.tikiBars.push(tb);
                this._invalidateArrayAndPromptMasks(map.tikiBars);
                if (Array.isArray(map.securityBarrierBoxes)) {
                    const cosA = Math.cos(sa), sinA = Math.sin(sa);
                    const hw = 26, hh = 18;
                    const ex = Math.abs(cosA) * hw + Math.abs(sinA) * hh;
                    const ey = Math.abs(sinA) * hw + Math.abs(cosA) * hh;
                    map.securityBarrierBoxes.push({
                        cx: sx, cy: sy, hw, hh, cosA, sinA,
                        minX: sx - ex, maxX: sx + ex, minY: sy - ey, maxY: sy + ey,
                        estateId: id
                    });
                    map.barrierBoxGrid = null;
                    if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                }
                if (opts.rebuildMesh !== false && oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                }
                const rec = { type: "PREFAB_3D", subtype: "TIKI_BAR_3D", id, prefabId, x: sx, y: sy, angle: sa, entityRef: tb };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
                if (!opts.skipSave) this.saveToLocalStorage();
                this.setStatus(`PLACED 3D TIKI BAR AT (${Math.round(sx)}, ${Math.round(sy)})`);
                return tb;
            }
            if (prefabId === "VOLLEYBALL_COURT_3D") {
                const vc = { id, x: sx, y: sy, z: 2.0, ang: sa, angle: sa, seed: Math.random() * 10, createdByEngine: true };
                if (!Array.isArray(map.beachVolleyballCourts)) map.beachVolleyballCourts = [];
                map.beachVolleyballCourts.push(vc);
                this._invalidateArrayAndPromptMasks(map.beachVolleyballCourts);
                const rec = { type: "PREFAB_3D", subtype: "VOLLEYBALL_COURT_3D", id, prefabId, x: sx, y: sy, angle: sa, entityRef: vc };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
                if (!opts.skipSave) this.saveToLocalStorage();
                this.setStatus(`PLACED 3D BEACH VOLLEYBALL COURT AT (${Math.round(sx)}, ${Math.round(sy)})`);
                return vc;
            }
            if (prefabId === "STREET_TAKEOVER_RING") {
                const st = { id, x: sx, y: sy, z: 2.0, radius: 74, carSpr: "0", carSpec: "BANSHEE_GT", seed: Math.random() * 10, createdByEngine: true };
                if (!Array.isArray(map.streetTakeovers)) map.streetTakeovers = [];
                map.streetTakeovers.push(st);
                this._invalidateArrayAndPromptMasks(map.streetTakeovers);
                const rec = { type: "PREFAB_3D", subtype: "STREET_TAKEOVER_RING", id, prefabId, x: sx, y: sy, angle: sa, entityRef: st };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
                if (!opts.skipSave) this.saveToLocalStorage();
                this.setStatus(`PLACED 3D STREET TAKEOVER RING AT (${Math.round(sx)}, ${Math.round(sy)})`);
                return st;
            }
            if (prefabId === "SMUGGLER_CRATE_3D") {
                const drop = {
                    id,
                    name: opts.name || "CUSTOM SMUGGLER CONTRABAND DROP",
                    x: sx,
                    y: sy,
                    z: 2.0,
                    ang: sa,
                    angle: sa,
                    active: true,
                    cooldown: 0,
                    seed: 1.25,
                    reward: 5000,
                    weapon: "ROCKET",
                    collected: false,
                    respawnTimer: 0,
                    createdByEngine: true
                };
                if (oe && Array.isArray(oe.smugglerDrops)) {
                    oe.smugglerDrops.push(drop);
                    this._invalidateArrayAndPromptMasks(oe.smugglerDrops);
                }
                const rec = { type: "PREFAB_3D", subtype: "SMUGGLER_CRATE_3D", id, prefabId, x: sx, y: sy, angle: sa, entityRef: drop };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
                if (!opts.skipSave) this.saveToLocalStorage();
                this.setStatus(`PLACED 3D SMUGGLER CONTRABAND CRATE AT (${Math.round(sx)}, ${Math.round(sy)})`);
                return drop;
            }
            if (prefabId === "SODA_ECOLA_3D" || prefabId === "SODA_SPRUNK_3D") {
                const brand = prefabId === "SODA_SPRUNK_3D" ? "SPRUNK" : "eCOLA";
                const sm = {
                    id,
                    x: sx,
                    y: sy,
                    z: 2.0,
                    ang: sa,
                    angle: sa,
                    brand,
                    ad: brand === "SPRUNK" ? "ad_sprunk" : "ad_ecola",
                    cooldown: 0,
                    broken: false,
                    spr: "soda_machine",
                    createdByEngine: true
                };
                if (oe && Array.isArray(oe.sodaMachines)) {
                    oe.sodaMachines.push(sm);
                    this._invalidateArrayAndPromptMasks(oe.sodaMachines);
                }
                if (oe && Array.isArray(oe.interactiveProps)) {
                    oe.interactiveProps.push(sm);
                    oe._usableInteractProps = null;
                    oe._propColGrid = null;
                }
                if (opts.rebuildMesh !== false && oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                }
                const rec = { type: "PREFAB_3D", subtype: prefabId, id, prefabId, x: sx, y: sy, angle: sa, entityRef: sm };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
                if (!opts.skipSave) this.saveToLocalStorage();
                this.setStatus(`PLACED 3D ${brand} MACHINE AT (${Math.round(sx)}, ${Math.round(sy)})`);
                return sm;
            }

            // Case B: Full 3D Volumetric Architectural Estate / Landmark Prefab (`PREFAB_CATALOG`)
            const cat = window.PREFAB_CATALOG || {};
            const resolvedKey = cat[prefabId]
                ? prefabId
                : (cat[String(prefabId).toLowerCase()] ? String(prefabId).toLowerCase() : (cat.villa_art_deco ? "villa_art_deco" : Object.keys(cat)[0]));
            const spec = cat[resolvedKey];
            if (!spec || !oe) return null;

            const sc = Number(opts.scale) || 1.0;
            const cosA = Math.cos(sa);
            const sinA = Math.sin(sa);
            const overhang = Number(spec.roofOverhang) || 10;
            const w1 = Number(spec.w1) || 156;
            const d1 = Number(spec.d1) || 112;
            const h1 = Number(spec.h1) || 0.72;
            const hw = (w1 * 0.5 + overhang) * sc;
            const hh = (d1 * 0.5 + overhang) * sc;
            const extX = Math.abs(cosA) * hw + Math.abs(sinA) * hh;
            const extY = Math.abs(sinA) * hw + Math.abs(cosA) * hh;
            const totalHeightBlocks =
                (Number(spec.stiltH) || 0) +
                h1 * sc +
                (Number(spec.h2) || 0) * sc +
                (Number(spec.roofPitch1) || 0.2) * sc +
                (Number(spec.roofPitch2) || 0) * sc;

            const inst = {
                id,
                name: opts.name || spec.label || resolvedKey,
                kind: resolvedKey,
                prefabId: resolvedKey,
                spec,
                x: sx,
                y: sy,
                z: 2.0,
                ang: sa,
                angle: sa,
                scale: sc,
                hw,
                hh,
                extX,
                extY,
                totalHeightBlocks,
                district: map.getDistrictName ? map.getDistrictName(sx, sy) : "VICE CITY",
                pool: null,
                drivewayCars: [],
                worldProps: [],
                dockBoat: null,
                createdByEngine: true
            };

            for (const p of (spec.props || [])) {
                const wx = sx + p.dx * cosA - p.dy * sinA;
                const wy = sy + p.dx * sinA + p.dy * cosA;
                const wp = {
                    spr: p.spr,
                    x: wx,
                    y: wy,
                    z: 2.0,
                    scale: p.scale || 1.0,
                    rot: sa + (p.rot || 0),
                    solid: Boolean(p.solid),
                    radius: p.radius || 10,
                    interact: p.interact || null,
                    estateId: id
                };
                inst.worldProps.push(wp);
                if (wp.interact) {
                    oe.interactiveProps.push(wp);
                    oe._usableInteractProps = null;
                    oe._propColGrid = null;
                }
            }

            oe.instances.push(inst);
            if (Array.isArray(map.residentialHouses)) {
                map.residentialHouses.push({
                    id,
                    name: inst.name,
                    district: inst.district,
                    kind: resolvedKey,
                    c: sx / TILE_SIZE,
                    r: sy / TILE_SIZE,
                    x: sx,
                    y: sy,
                    z: 2.0,
                    ang: sa,
                    scale: sc,
                    hw,
                    hh,
                    createdByEngine: true
                });
            }
            if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                this.game.renderer._staticChunkGridMap.delete(oe.instances);
            }

            // Register 3D OBB collision hull for solid building footprint into map.securityBarrierBoxes
            if (!Array.isArray(map.securityBarrierBoxes)) map.securityBarrierBoxes = [];
            const wallHw = (w1 * 0.5) * sc;
            const wallHh = (d1 * 0.5) * sc;
            const wallEx = Math.abs(cosA) * wallHw + Math.abs(sinA) * wallHh;
            const wallEy = Math.abs(sinA) * wallHw + Math.abs(cosA) * wallHh;
            map.securityBarrierBoxes.push({
                cx: sx,
                cy: sy,
                hw: wallHw,
                hh: wallHh,
                cosA,
                sinA,
                minX: sx - wallEx,
                maxX: sx + wallEx,
                minY: sy - wallEy,
                maxY: sy + wallEy,
                estateId: id
            });
            map.barrierBoxGrid = null;
            if (typeof map.ensureBarrierSpatialGrids === "function") {
                map.ensureBarrierSpatialGrids();
            }

            if (opts.rebuildMesh !== false && this.game.renderer && this.game.renderer.gl) {
                oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                if (typeof this.game.renderer.bakeRadarBackground === "function") {
                    this.game.renderer.bakeRadarBackground();
                }
            }

            const rec = {
                type: "PREFAB_3D",
                subtype: "ESTATE",
                id,
                prefabId: resolvedKey,
                x: sx,
                y: sy,
                angle: sa,
                entityRef: inst
            };
            this.createdEntities.push(rec);
            if (!opts.skipHistory) this._pushHistory(rec);
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "PLACE_PREFAB_3D",
                opKey: id,
                id,
                prefabId: resolvedKey,
                x: Math.round(sx * 10) / 10,
                y: Math.round(sy * 10) / 10,
                angle: Math.round(sa * 1000) / 1000,
                scale: sc
            }, opts);
            this.setStatus(`PLACED 3D PREFAB [${spec.label || resolvedKey}] AT (${Math.round(sx)}, ${Math.round(sy)})`);
            return inst;
        }

        _normalizeStreetPropKind(kind) {
            if (kind === "PAYPHONE" || kind === "PAYPHONE_BOOTH") return "PAYPHONE_BOOTH";
            if (kind === "STREETLAMP" || kind === "STREETLIGHT_NEON") return "STREETLIGHT_NEON";
            if (kind === "HYDRANT") return "HYDRANT";
            if (kind === "NEWS_STAND") return "NEWS_STAND";
            return null;
        }

        placePropOrFlora(kind, x, y, angle = 0, opts = {}) {
            const map = this.game && this.game.map;
            if (!map) return null;
            const check = this.validatePlacement("PROPS_FLORA", kind, x, y, angle, opts);
            const sx = check.snappedX !== undefined ? check.snappedX : x;
            const sy = check.snappedY !== undefined ? check.snappedY : y;
            const sa = check.snappedAngle !== undefined ? check.snappedAngle : angle;
            const id = opts.id || `ce_prop_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

            const nativeStreetKind = this._normalizeStreetPropKind(kind);
            if (nativeStreetKind) {
                const oe = map.objectEngine;
                if (!oe || !Array.isArray(oe.streetProps)) return null;
                const prop = {
                    id,
                    kind: nativeStreetKind,
                    aliasKind: kind,
                    homeX: sx,
                    homeY: sy,
                    x: sx,
                    y: sy,
                    z: 2.0,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                    ang: sa,
                    angle: sa,
                    vang: 0,
                    broken: false,
                    damaged: false,
                    timer: 0,
                    geyserTimer: 0,
                    neonPink: true,
                    createdByEngine: true
                };
                oe.streetProps.push(prop);
                oe._propColGrid = null;
                if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                    this.game.renderer._staticChunkGridMap.delete(oe.streetProps);
                }
                const rec = { type: "PROP_FLORA", subtype: "STREET_PROP", id, kind: nativeStreetKind, x: sx, y: sy, angle: sa, entityRef: prop };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
                if (!opts.skipSave) this.saveToLocalStorage();
                this._broadcastCreationOp({
                    action: "PLACE_PROP_FLORA",
                    opKey: id,
                    id,
                    kind: nativeStreetKind,
                    x: Math.round(sx * 10) / 10,
                    y: Math.round(sy * 10) / 10,
                    angle: Math.round(sa * 1000) / 1000
                }, opts);
                this.setStatus(`PLACED 3D STREET PROP [${nativeStreetKind}] AT (${Math.round(sx)}, ${Math.round(sy)})`);
                return prop;
            }

            // Tropical Flora / Tree
            const flora = {
                id,
                x: sx,
                y: sy,
                z: 2.0,
                kind,
                scale: opts.scale || 1.04,
                height: opts.height || 1.15,
                angle: sa,
                solid: kind !== "bougainvillea_bush",
                trunkRadius: kind === "banyan_tree" ? 11.0 : 6.0,
                createdByEngine: true
            };
            if (!Array.isArray(map.vicePalms)) map.vicePalms = [];
            map.vicePalms.push(flora);
            if (flora.solid && map.floraGrid instanceof Map) {
                const fc = Math.floor(sx / TILE_SIZE);
                const fr = Math.floor(sy / TILE_SIZE);
                if (fc >= 0 && fc < MAP_COLS && fr >= 0 && fr < MAP_ROWS) {
                    const key = (fr << 16) | (fc & 0xffff);
                    let cell = map.floraGrid.get(key);
                    if (!cell) {
                        cell = [];
                        map.floraGrid.set(key, cell);
                    }
                    cell.push(flora);
                }
            }
            if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                this.game.renderer._staticChunkGridMap.delete(map.vicePalms);
            }

            const rec = { type: "PROP_FLORA", subtype: "FLORA", id, kind, x: sx, y: sy, angle: sa, entityRef: flora };
            this.createdEntities.push(rec);
            if (!opts.skipHistory) this._pushHistory(rec);
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "PLACE_PROP_FLORA",
                opKey: id,
                id,
                kind,
                x: Math.round(sx * 10) / 10,
                y: Math.round(sy * 10) / 10,
                angle: Math.round(sa * 1000) / 1000,
                scale: flora.scale
            }, opts);
            this.setStatus(`PLANTED 3D FLORA [${kind}] AT (${Math.round(sx)}, ${Math.round(sy)})`);
            return flora;
        }

        placeEstablishment(config = {}, opts = {}) {
            const map = this.game && this.game.map;
            if (!map || !window.ShopInteriors) return null;
            const tplKey = config.tpl || config.theme || "SHOP_BAR";
            const rawX = config.x !== undefined ? config.x : ((config.c || 200) + 0.5) * TILE_SIZE;
            const rawY = config.y !== undefined ? config.y : ((config.r || 200) + 0.5) * TILE_SIZE;

            const check = this.validatePlacement("INTERIORS", tplKey, rawX, rawY, 0, opts);
            const c = check.tileC !== undefined ? check.tileC : Math.floor(rawX / TILE_SIZE);
            const r = check.tileR !== undefined ? check.tileR : Math.floor(rawY / TILE_SIZE);
            const facing = config.facing || check.facing || "S";
            const id = config.id || `ce_shop_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

            const T = window.ShopInteriors.SHOP_TEMPLATES || {};
            const base = T[tplKey] || T.SHOP_BAR;
            if (!base) return null;

            const cloneStations = (arr) => (arr || []).map((s) => Object.assign({}, s, { id: `${id}_${s.id || "st"}`, cooldown: 0 }));
            const cloneNpcs = (arr) => (arr || []).map((n) => Object.assign({}, n));
            const builtStations = typeof base.buildStations === "function"
                ? base.buildStations(id).map((s) => Object.assign({}, s, { cooldown: 0 }))
                : cloneStations(base.stations);
            const builtNpcs = typeof base.buildNpcs === "function"
                ? base.buildNpcs().map((n) => Object.assign({}, n))
                : cloneNpcs(base.npcs);

            const off = { S: [32, 16], N: [32, 48], E: [16, 32], W: [48, 32] }[facing] || [32, 16];
            const doorX = check.snappedX !== undefined ? check.snappedX : (c * TILE_SIZE + off[0]);
            const doorY = check.snappedY !== undefined ? check.snappedY : (r * TILE_SIZE + off[1]);

            const intr = {
                id,
                name: config.name || `CUSTOM ${tplKey.replace("SHOP_", "")}`,
                subtitle: config.subtitle || base.subtitle || `${map.getDistrictName ? map.getDistrictName(doorX, doorY) : "VICE CITY"} • ENTERABLE 3D VENUE`,
                district: config.district || (map.getDistrictName ? map.getDistrictName(doorX, doorY) : "VICE CITY"),
                doorX,
                doorY,
                facing,
                isShop: true,
                theme: base.theme,
                accent: config.accent || base.accent,
                matRGB: base.matRGB,
                floorColor: base.floorColor,
                floorGridColor: base.floorGridColor,
                w: base.w || 820,
                h: base.h || 560,
                stations: builtStations,
                npcs: builtNpcs,
                createdByEngine: true
            };

            if (typeof window.ShopInteriors.orientInterior === "function") {
                window.ShopInteriors.orientInterior(intr);
            }

            if (!Array.isArray(map.interiors)) map.interiors = [];
            map.interiors.push(intr);
            if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                this.game.renderer._staticChunkGridMap.delete(map.interiors);
            }

            const rec = {
                type: "INTERIOR",
                id,
                tpl: tplKey,
                name: intr.name,
                c,
                r,
                facing,
                x: doorX,
                y: doorY,
                entityRef: intr
            };
            this.createdEntities.push(rec);
            if (!opts.skipHistory) this._pushHistory(rec);
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "PLACE_INTERIOR",
                opKey: id,
                id,
                tpl: tplKey,
                name: intr.name,
                c,
                r,
                facing,
                x: Math.round(doorX * 10) / 10,
                y: Math.round(doorY * 10) / 10
            }, opts);
            this.setStatus(`CREATED 3D ENTERABLE VENUE [${intr.name}] FACING [${facing}] AT (${c}, ${r})`);
            return intr;
        }

        /* ====================================================================
           5. PILLAR 3: DECLARATIVE MISSION & ENCOUNTER COMPOSER
           ==================================================================== */
        createCustomMission(blueprint = {}, opts = {}) {
            const id = blueprint.id || `ce_mission_${Date.now()}_${Math.floor(Math.random() * 999)}`;
            const type = blueprint.type || "HIJACK_VEHICLE";
            const px = this.game && this.game.player ? this.game.player.x : 16384;
            const py = this.game && this.game.player ? this.game.player.y : 16384;
            const spec = {
                id,
                type,
                title: blueprint.title || `CUSTOM ${type.replace(/_/g, " ")}`,
                pagerText: blueprint.pagerText || "JASON [5G DM]: Custom contract live on your GPS! Hit the target and secure the payout!",
                reward: blueprint.reward || 25000,
                wantedStars: blueprint.wantedStars !== undefined ? blueprint.wantedStars : 2,
                timer: blueprint.timer || 180,
                startX: blueprint.startX !== undefined ? blueprint.startX : px + 160,
                startY: blueprint.startY !== undefined ? blueprint.startY : py,
                dropoffX: blueprint.dropoffX !== undefined ? blueprint.dropoffX : px + 512,
                dropoffY: blueprint.dropoffY !== undefined ? blueprint.dropoffY : py - 256,
                vehicleSpec: blueprint.vehicleSpec || "VICE_CHEETAH"
            };
            this.customMissions[id] = spec;
            if (!this.createdEntities.some((e) => e && e.id === id)) {
                const rec = { type: "MISSION_BLUEPRINT", id, blueprint: spec };
                this.createdEntities.push(rec);
                if (!opts.skipHistory) this._pushHistory(rec);
            }
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "CREATE_MISSION",
                opKey: `msn_${id}`,
                id,
                blueprint: spec
            }, opts);
            this.setStatus(`COMPOSED CUSTOM MISSION [${spec.title}] ($${spec.reward.toLocaleString()})`);
            return spec;
        }

        launchCustomMission(idOrBlueprint, opts = {}) {
            if (!this.game || !this.game.missions) return null;
            const spec = (typeof idOrBlueprint === "string")
                ? (this.customMissions[idOrBlueprint] || this.createCustomMission({ type: idOrBlueprint }, opts))
                : this.createCustomMission(idOrBlueprint, opts);
            if (!spec) return null;

            const mm = this.game.missions;
            if (mm.activeMission && typeof mm.abortMission === "function") {
                mm.abortMission();
            }

            const check = this.validatePlacement("VEHICLES", spec.vehicleSpec || "VICE_CHEETAH", spec.startX, spec.startY, 0);
            const tx = check.snappedX || spec.startX;
            const ty = check.snappedY || spec.startY;

            const m = {
                id: spec.id,
                title: spec.title,
                reward: spec.reward,
                timer: spec.timer,
                stage: 0,
                objectiveLabel: spec.title,
                targetX: tx,
                targetY: ty,
                isCustomEngineMission: true
            };

            const finishMmoMission = (g) => {
                this._broadcastCreationOp({
                    action: "COMPLETE_MISSION",
                    opKey: `active_msn_${spec.id}`,
                    id: spec.id,
                    title: spec.title,
                    winner: (g.net && g.net.playerName) || "LUCIA",
                    reward: spec.reward
                }, {});
                mm.completeMission(g, m);
            };

            if (spec.type === "CONTRABAND_DROP") {
                m.crates = [
                    { x: tx, y: ty },
                    { x: tx + 140, y: ty - 90 },
                    { x: tx - 120, y: ty + 110 }
                ];
                m.objectiveLabel = `${spec.title} (3 CRATES LEFT)`;
                m.update = (g) => {
                    const p = g.player.inVehicle || g.player;
                    m.crates = m.crates.filter((c) => {
                        if (Math.hypot(p.x - c.x, p.y - c.y) < 46) {
                            g.audio.playPickup();
                            g.addFloatingText("📦 CONTRABAND SECURED!", c.x, c.y, "#39ff14");
                            return false;
                        }
                        return true;
                    });
                    if (m.crates.length > 0) {
                        m.targetX = m.crates[0].x;
                        m.targetY = m.crates[0].y;
                        m.objectiveLabel = `${spec.title} (${m.crates.length} LEFT)`;
                    } else {
                        finishMmoMission(g);
                    }
                };
            } else if (spec.type === "ARMORED_AMBUSH") {
                const van = this.spawnVehicle("ARMORED_VAN", tx, ty, 0, { id: `${spec.id}_van`, skipHistory: true, skipSave: true, skipBroadcast: true });
                van.driver = "AI_TRAFFIC";
                van.hp = 180;
                m.armoredVan = van;
                m.briefcase = null;
                m.update = (g) => {
                    if (!m.briefcase) {
                        m.targetX = van.x;
                        m.targetY = van.y;
                        m.objectiveLabel = "DESTROY ARMORED VAN";
                        if (van.destroyed) {
                            m.briefcase = { x: van.x, y: van.y };
                            m.targetX = van.x;
                            m.targetY = van.y;
                            m.objectiveLabel = "COLLECT ARMORED PAYOUT";
                        }
                    } else {
                        const p = g.player.inVehicle || g.player;
                        if (Math.hypot(p.x - m.briefcase.x, p.y - m.briefcase.y) < 48) {
                            finishMmoMission(g);
                        }
                    }
                };
            } else if (spec.type === "VIP_ELIMINATION") {
                const targets = [];
                for (let i = 0; i < 3; i++) {
                    const ped = new Pedestrian({
                        id: `${spec.id}_vip_${i}`,
                        x: tx + (i - 1) * 28,
                        y: ty,
                        z: 2.0,
                        kind: "HOSTILE",
                        archetype: "CARTEL",
                        weapon: "UZI"
                    });
                    this.game.peds.push(ped);
                    targets.push(ped);
                }
                m.targets = targets;
                m.update = (g) => {
                    const alive = m.targets.filter((t) => !t.dead);
                    if (alive.length > 0) {
                        m.targetX = alive[0].x;
                        m.targetY = alive[0].y;
                        m.objectiveLabel = `ELIMINATE VIP SQUAD (${alive.length} LEFT)`;
                    } else {
                        finishMmoMission(g);
                    }
                };
            } else {
                // Default: HIJACK_VEHICLE & deliver to dropoff
                const car = this.spawnVehicle(spec.vehicleSpec || "VICE_CHEETAH", tx, ty, 0, { id: `${spec.id}_veh`, skipHistory: true, skipSave: true, skipBroadcast: true });
                m.targetCar = car;
                m.dropoff = { x: spec.dropoffX, y: spec.dropoffY };
                m.update = (g) => {
                    if (car.destroyed) {
                        mm.failMission(g, "TARGET VEHICLE DESTROYED!");
                        return;
                    }
                    if (g.player.inVehicle !== car) {
                        m.targetX = car.x;
                        m.targetY = car.y;
                        m.objectiveLabel = `STEAL ${car.name}`;
                    } else {
                        m.targetX = m.dropoff.x;
                        m.targetY = m.dropoff.y;
                        m.objectiveLabel = "DELIVER TO DROP-OFF ZONE";
                        if (Math.hypot(car.x - m.dropoff.x, car.y - m.dropoff.y) < 76) {
                            finishMmoMission(g);
                        }
                    }
                };
            }

            mm.activeMission = m;
            if (spec.wantedStars > 0 && typeof this.game.raiseWanted === "function") {
                this.game.raiseWanted(spec.wantedStars);
            }
            if (typeof mm.setPagerMessage === "function") {
                mm.setPagerMessage(spec.pagerText);
            } else if (typeof mm.setPager === "function") {
                mm.setPager(spec.pagerText);
            }
            if (typeof this.game.updateHud === "function") this.game.updateHud();
            this._broadcastCreationOp({
                action: "LAUNCH_MISSION",
                opKey: `active_msn_${spec.id}`,
                id: spec.id,
                blueprint: spec
            }, opts);
            this.setStatus(`LAUNCHED MMO ROOM MISSION [${spec.title}]!`);
            return m;
        }

        /* ====================================================================
           6. PILLAR 4: PRE-EXISTING WORLD INSPECTOR, RELOCATOR & MUTATOR BRIDGE
           ==================================================================== */
        indexPreExistingWorld() {
            const map = this.game && this.game.map;
            if (!map) return false;
            const oe = map.objectEngine;

            // 1. Tag every pre-existing 3D Estate instance and link its OBB in map.securityBarrierBoxes
            if (oe && Array.isArray(oe.instances)) {
                for (let i = 0; i < oe.instances.length; i++) {
                    const inst = oe.instances[i];
                    if (!inst) continue;
                    if (!inst.id) inst.id = `pre_estate_${i}`;
                    if (inst.angle === undefined) inst.angle = inst.ang || 0;
                    if (inst.ang === undefined) inst.ang = inst.angle || 0;
                    if (inst.prefabId === undefined) inst.prefabId = inst.kind || (inst.spec && inst.spec.id) || "villa_art_deco";
                    if (Array.isArray(map.securityBarrierBoxes)) {
                        for (let bi = 0; bi < map.securityBarrierBoxes.length; bi++) {
                            const bb = map.securityBarrierBoxes[bi];
                            if (bb && !bb.estateId && bb.cx !== undefined && Math.hypot(bb.cx - inst.x, bb.cy - inst.y) < 12) {
                                bb.estateId = inst.id;
                            }
                        }
                    }
                }
            }

            // 2. Ensure stable IDs on pre-existing interiors, streetProps, sodaMachines, smugglerDrops, tikiBars, volleyball, takeovers, flora
            if (Array.isArray(map.interiors)) {
                for (let i = 0; i < map.interiors.length; i++) {
                    const intr = map.interiors[i];
                    if (intr && !intr.id) intr.id = `pre_interior_${i}`;
                }
            }
            if (oe && Array.isArray(oe.streetProps)) {
                for (let i = 0; i < oe.streetProps.length; i++) {
                    const sp = oe.streetProps[i];
                    if (sp && !sp.id) sp.id = `pre_sprop_${i}`;
                }
            }
            if (oe && Array.isArray(oe.sodaMachines)) {
                for (let i = 0; i < oe.sodaMachines.length; i++) {
                    const sm = oe.sodaMachines[i];
                    if (sm && !sm.id) sm.id = `pre_soda_${i}`;
                }
            }
            if (oe && Array.isArray(oe.smugglerDrops)) {
                for (let i = 0; i < oe.smugglerDrops.length; i++) {
                    const sd = oe.smugglerDrops[i];
                    if (sd && !sd.id) sd.id = `pre_smuggler_${i}`;
                }
            }
            if (Array.isArray(map.tikiBars)) {
                for (let i = 0; i < map.tikiBars.length; i++) {
                    const tb = map.tikiBars[i];
                    if (!tb) continue;
                    if (!tb.id) tb.id = `pre_tiki_${i}`;
                    if (Array.isArray(map.securityBarrierBoxes)) {
                        for (let bi = 0; bi < map.securityBarrierBoxes.length; bi++) {
                            const bb = map.securityBarrierBoxes[bi];
                            if (bb && !bb.estateId && bb.cx !== undefined && Math.hypot(bb.cx - tb.x, bb.cy - tb.y) < 8) {
                                bb.estateId = tb.id;
                            }
                        }
                    }
                }
            }
            if (Array.isArray(map.beachVolleyballCourts)) {
                for (let i = 0; i < map.beachVolleyballCourts.length; i++) {
                    const vc = map.beachVolleyballCourts[i];
                    if (vc && !vc.id) vc.id = `pre_volleyball_${i}`;
                }
            }
            if (Array.isArray(map.streetTakeovers)) {
                for (let i = 0; i < map.streetTakeovers.length; i++) {
                    const st = map.streetTakeovers[i];
                    if (st && !st.id) st.id = `pre_takeover_${i}`;
                }
            }
            if (Array.isArray(map.vicePalms)) {
                for (let i = 0; i < map.vicePalms.length; i++) {
                    const pm = map.vicePalms[i];
                    if (pm && !pm.id) pm.id = `pre_flora_${i}`;
                }
            }
            this._preExistingIndexed = true;
            return true;
        }

        getPreExistingWorldSummary() {
            this.indexPreExistingWorld();
            const map = this.game && this.game.map;
            const oe = map && map.objectEngine;
            const mm = this.game && this.game.missions;
            return {
                estates3D: (oe && Array.isArray(oe.instances)) ? oe.instances.length : 0,
                interiors3D: (map && Array.isArray(map.interiors)) ? map.interiors.length : 0,
                streetProps3D: (oe && Array.isArray(oe.streetProps)) ? oe.streetProps.length : 0,
                streetlights3D: (map && Array.isArray(map.streetlights)) ? map.streetlights.length : 0,
                trafficSignals3D: (map && Array.isArray(map.trafficSignals)) ? map.trafficSignals.length : 0,
                sodaMachines3D: (oe && Array.isArray(oe.sodaMachines)) ? oe.sodaMachines.length : 0,
                smugglerDrops3D: (oe && Array.isArray(oe.smugglerDrops)) ? oe.smugglerDrops.length : 0,
                tikiBars3D: (map && Array.isArray(map.tikiBars)) ? map.tikiBars.length : 0,
                volleyballCourts3D: (map && Array.isArray(map.beachVolleyballCourts)) ? map.beachVolleyballCourts.length : 0,
                streetTakeovers3D: (map && Array.isArray(map.streetTakeovers)) ? map.streetTakeovers.length : 0,
                flora3D: (map && Array.isArray(map.vicePalms)) ? map.vicePalms.length : 0,
                vehicles: (this.game && Array.isArray(this.game.vehicles)) ? this.game.vehicles.length : 0,
                storyMissions: (mm && Array.isArray(mm.storyMissions)) ? mm.storyMissions.length : 5,
                customCreatedCount: this.createdEntities.length
            };
        }

        inspectWorldAt(x, y, radius = 160, includePreExisting = true) {
            this.indexPreExistingWorld();
            const map = this.game && this.game.map;
            const oe = map && map.objectEngine;
            const results = [];
            const seenRefs = new Set();

            const consider = (desc) => {
                if (!desc || !desc.entityRef || seenRefs.has(desc.entityRef)) return;
                if (!includePreExisting && desc.isPreExisting) return;
                const d = Math.hypot((desc.x || 0) - x, (desc.y || 0) - y);
                if (d <= radius) {
                    seenRefs.add(desc.entityRef);
                    desc.distance = d;
                    results.push(desc);
                }
            };

            // 1. Custom created entities first
            for (let i = this.createdEntities.length - 1; i >= 0; i--) {
                const ce = this.createdEntities[i];
                if (!ce || !ce.entityRef || typeof ce.x !== "number" || typeof ce.y !== "number") continue;
                consider({
                    type: ce.type,
                    subtype: ce.subtype || ce.type,
                    category: ce.type === "VEHICLE" ? "VEHICLES" : (ce.type === "PREFAB_3D" ? "PREFABS_3D" : (ce.type === "PROP_FLORA" ? "PROPS_FLORA" : "INTERIORS")),
                    id: ce.id,
                    kind: ce.prefabId || ce.specKey || ce.kind || ce.tpl,
                    label: ce.name || ce.prefabId || ce.specKey || ce.kind || ce.id,
                    x: ce.entityRef.doorX !== undefined ? ce.entityRef.doorX : ce.entityRef.x,
                    y: ce.entityRef.doorY !== undefined ? ce.entityRef.doorY : ce.entityRef.y,
                    angle: ce.entityRef.ang !== undefined ? ce.entityRef.ang : (ce.entityRef.angle || 0),
                    isPreExisting: false,
                    createdRecord: ce,
                    entityRef: ce.entityRef
                });
            }

            if (includePreExisting && map) {
                // 2. 3D Architectural Estates (oe.instances)
                if (oe && Array.isArray(oe.instances)) {
                    for (const inst of oe.instances) {
                        if (!inst) continue;
                        consider({
                            type: "PREFAB_3D",
                            subtype: "ESTATE",
                            category: "PREFABS_3D",
                            id: inst.id,
                            kind: inst.kind || inst.prefabId || (inst.spec && inst.spec.id) || "villa_art_deco",
                            label: inst.name || (inst.spec && inst.spec.label) || inst.id,
                            x: inst.x,
                            y: inst.y,
                            angle: inst.ang !== undefined ? inst.ang : (inst.angle || 0),
                            isPreExisting: !inst.createdByEngine,
                            sourceArray: oe.instances,
                            entityRef: inst
                        });
                    }
                }
                // 3. 3D Enterable Interiors (map.interiors)
                if (Array.isArray(map.interiors)) {
                    for (const intr of map.interiors) {
                        if (!intr) continue;
                        consider({
                            type: "INTERIOR",
                            subtype: "INTERIOR",
                            category: "INTERIORS",
                            id: intr.id,
                            kind: intr.theme || "SHOP_BAR",
                            label: intr.name || intr.id,
                            x: intr.doorX,
                            y: intr.doorY,
                            angle: 0,
                            facing: intr.facing || "S",
                            isPreExisting: !intr.createdByEngine,
                            sourceArray: map.interiors,
                            entityRef: intr
                        });
                    }
                }
                // 4. 3D Street Props (oe.streetProps)
                if (oe && Array.isArray(oe.streetProps)) {
                    for (const sp of oe.streetProps) {
                        if (!sp) continue;
                        consider({
                            type: "PROP_FLORA",
                            subtype: "STREET_PROP",
                            category: "PROPS_FLORA",
                            id: sp.id,
                            kind: sp.kind,
                            label: `3D ${sp.kind}`,
                            x: sp.x,
                            y: sp.y,
                            angle: sp.ang !== undefined ? sp.ang : (sp.angle || 0),
                            isPreExisting: !sp.createdByEngine,
                            sourceArray: oe.streetProps,
                            entityRef: sp
                        });
                    }
                }
                // 5. 3D Interactive Encounters (tikiBars, volleyball, streetTakeovers, smugglerDrops, sodaMachines)
                if (Array.isArray(map.tikiBars)) {
                    for (const tb of map.tikiBars) {
                        if (!tb) continue;
                        consider({
                            type: "PREFAB_3D",
                            subtype: "TIKI_BAR_3D",
                            category: "PREFABS_3D",
                            id: tb.id,
                            kind: "TIKI_BAR_3D",
                            label: "3D Thatch Beach Tiki Bar",
                            x: tb.x,
                            y: tb.y,
                            angle: tb.ang || tb.angle || 0,
                            isPreExisting: !tb.createdByEngine,
                            sourceArray: map.tikiBars,
                            entityRef: tb
                        });
                    }
                }
                if (Array.isArray(map.beachVolleyballCourts)) {
                    for (const vc of map.beachVolleyballCourts) {
                        if (!vc) continue;
                        consider({
                            type: "PREFAB_3D",
                            subtype: "VOLLEYBALL_COURT_3D",
                            category: "PREFABS_3D",
                            id: vc.id,
                            kind: "VOLLEYBALL_COURT_3D",
                            label: "3D Beach Volleyball Court",
                            x: vc.x,
                            y: vc.y,
                            angle: vc.ang || vc.angle || 0,
                            isPreExisting: !vc.createdByEngine,
                            sourceArray: map.beachVolleyballCourts,
                            entityRef: vc
                        });
                    }
                }
                if (Array.isArray(map.streetTakeovers)) {
                    for (const st of map.streetTakeovers) {
                        if (!st) continue;
                        consider({
                            type: "PREFAB_3D",
                            subtype: "STREET_TAKEOVER_RING",
                            category: "PREFABS_3D",
                            id: st.id,
                            kind: "STREET_TAKEOVER_RING",
                            label: "3D Street Takeover Ring",
                            x: st.x,
                            y: st.y,
                            angle: 0,
                            isPreExisting: !st.createdByEngine,
                            sourceArray: map.streetTakeovers,
                            entityRef: st
                        });
                    }
                }
                if (oe && Array.isArray(oe.smugglerDrops)) {
                    for (const sd of oe.smugglerDrops) {
                        if (!sd) continue;
                        consider({
                            type: "PREFAB_3D",
                            subtype: "SMUGGLER_CRATE_3D",
                            category: "PREFABS_3D",
                            id: sd.id,
                            kind: "SMUGGLER_CRATE_3D",
                            label: sd.name || "3D Smuggler Contraband Crate",
                            x: sd.x,
                            y: sd.y,
                            angle: sd.ang || sd.angle || 0,
                            isPreExisting: !sd.createdByEngine,
                            sourceArray: oe.smugglerDrops,
                            entityRef: sd
                        });
                    }
                }
                if (oe && Array.isArray(oe.sodaMachines)) {
                    for (const sm of oe.sodaMachines) {
                        if (!sm) continue;
                        const k = sm.brand === "SPRUNK" ? "SODA_SPRUNK_3D" : "SODA_ECOLA_3D";
                        consider({
                            type: "PREFAB_3D",
                            subtype: k,
                            category: "PREFABS_3D",
                            id: sm.id,
                            kind: k,
                            label: `3D ${sm.brand || "eCOLA"} Machine`,
                            x: sm.x,
                            y: sm.y,
                            angle: sm.ang || sm.angle || 0,
                            isPreExisting: !sm.createdByEngine,
                            sourceArray: oe.sodaMachines,
                            entityRef: sm
                        });
                    }
                }
                // 6. Vehicles (game.vehicles)
                if (this.game && Array.isArray(this.game.vehicles)) {
                    for (const v of this.game.vehicles) {
                        if (!v || v.destroyed) continue;
                        consider({
                            type: "VEHICLE",
                            subtype: "VEHICLE",
                            category: "VEHICLES",
                            id: v.id,
                            kind: v.specKey || "MINT_STALLION",
                            label: v.name || v.specKey || v.id,
                            x: v.x,
                            y: v.y,
                            angle: v.angle || 0,
                            isPreExisting: !v.createdByEngine,
                            sourceArray: this.game.vehicles,
                            entityRef: v
                        });
                    }
                }
                // 7. Tropical Flora (map.vicePalms)
                if (Array.isArray(map.vicePalms)) {
                    for (const pm of map.vicePalms) {
                        if (!pm) continue;
                        consider({
                            type: "PROP_FLORA",
                            subtype: "FLORA",
                            category: "PROPS_FLORA",
                            id: pm.id,
                            kind: pm.kind || "palm_tree",
                            label: `3D Flora (${pm.kind || "palm_tree"})`,
                            x: pm.x,
                            y: pm.y,
                            angle: pm.angle || 0,
                            isPreExisting: !pm.createdByEngine,
                            sourceArray: map.vicePalms,
                            entityRef: pm
                        });
                    }
                }
            }

            results.sort((a, b) => a.distance - b.distance);
            return results;
        }

        findNearestWorldEntity(x, y, maxRadius = 140, includePreExisting = true) {
            const list = this.inspectWorldAt(x, y, maxRadius, includePreExisting);
            return list.length > 0 ? list[0] : null;
        }

        _applyEntityPose(desc, newX, newY, newAngle, opts = {}) {
            if (!desc || !desc.entityRef) return false;
            const map = this.game && this.game.map;
            const oe = map && map.objectEngine;
            const ent = desc.entityRef;
            const oldX = desc.type === "INTERIOR" ? ent.doorX : ent.x;
            const oldY = desc.type === "INTERIOR" ? ent.doorY : ent.y;
            const ang = newAngle !== undefined ? newAngle : (ent.ang !== undefined ? ent.ang : (ent.angle || 0));

            if (desc.type === "INTERIOR") {
                const check = opts.skipValidation
                    ? { snappedX: newX, snappedY: newY, facing: opts.facing || ent.facing || "S", tileC: Math.floor(newX / TILE_SIZE), tileR: Math.floor(newY / TILE_SIZE) }
                    : this.validatePlacement("INTERIORS", desc.kind || "SHOP_BAR", newX, newY, ang, opts);
                ent.doorX = check.snappedX !== undefined ? check.snappedX : newX;
                ent.doorY = check.snappedY !== undefined ? check.snappedY : newY;
                if (check.facing) ent.facing = check.facing;
                if (window.ShopInteriors && typeof window.ShopInteriors.orientInterior === "function") {
                    window.ShopInteriors.orientInterior(ent);
                }
                if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                    this.game.renderer._staticChunkGridMap.delete(map.interiors);
                }
            } else if (desc.subtype === "ESTATE") {
                const cosA = Math.cos(ang);
                const sinA = Math.sin(ang);
                const dx = newX - oldX;
                const dy = newY - oldY;
                ent.x = newX;
                ent.y = newY;
                ent.ang = ang;
                ent.angle = ang;
                const sc = ent.scale || 1.0;
                const spec = ent.spec || {};
                const hw = ((spec.w1 || 156) * 0.5 + (spec.roofOverhang || 10)) * sc;
                const hh = ((spec.d1 || 112) * 0.5 + (spec.roofOverhang || 10)) * sc;
                ent.hw = hw;
                ent.hh = hh;
                ent.extX = Math.abs(cosA) * hw + Math.abs(sinA) * hh;
                ent.extY = Math.abs(sinA) * hw + Math.abs(cosA) * hh;
                if (ent.pool) {
                    ent.pool.worldX = newX + cosA * (ent.pool.dx || 0) - sinA * (ent.pool.dy || 0);
                    ent.pool.worldY = newY + sinA * (ent.pool.dx || 0) + cosA * (ent.pool.dy || 0);
                }
                if (Array.isArray(map.residentialHouses)) {
                    const rh = map.residentialHouses.find((h) => h && (h.id === ent.id || Math.hypot(h.x - oldX, h.y - oldY) < 8));
                    if (rh) {
                        rh.x = newX;
                        rh.y = newY;
                        rh.c = newX / TILE_SIZE;
                        rh.r = newY / TILE_SIZE;
                        rh.ang = ang;
                    }
                }
                if (Array.isArray(map.securityBarrierBoxes)) {
                    const wallHw = ((spec.w1 || 156) * 0.5) * sc;
                    const wallHh = ((spec.d1 || 112) * 0.5) * sc;
                    const ex = Math.abs(cosA) * wallHw + Math.abs(sinA) * wallHh;
                    const ey = Math.abs(sinA) * wallHw + Math.abs(cosA) * wallHh;
                    for (const bb of map.securityBarrierBoxes) {
                        if (bb && (bb.estateId === ent.id || (bb.cx !== undefined && Math.hypot(bb.cx - oldX, bb.cy - oldY) < 12))) {
                            bb.estateId = ent.id;
                            bb.cx = newX;
                            bb.cy = newY;
                            bb.hw = wallHw;
                            bb.hh = wallHh;
                            bb.cosA = cosA;
                            bb.sinA = sinA;
                            bb.minX = newX - ex;
                            bb.maxX = newX + ex;
                            bb.minY = newY - ey;
                            bb.maxY = newY + ey;
                        }
                    }
                    map.barrierBoxGrid = null;
                    if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                }
                if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                    this.game.renderer._staticChunkGridMap.delete(oe.instances);
                }
                if (opts.rebuildMesh !== false && oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                }
            } else if (desc.subtype === "STREET_PROP") {
                ent.x = newX;
                ent.y = newY;
                ent.homeX = newX;
                ent.homeY = newY;
                ent.ang = ang;
                ent.angle = ang;
                ent.broken = false;
                ent.damaged = false;
                if (oe) oe._propColGrid = null;
                if (this.game.renderer && this.game.renderer._staticChunkGridMap && oe) {
                    this.game.renderer._staticChunkGridMap.delete(oe.streetProps);
                }
            } else if (desc.subtype === "FLORA") {
                if (map.floraGrid instanceof Map) {
                    const oldC = Math.floor(oldX / TILE_SIZE);
                    const oldR = Math.floor(oldY / TILE_SIZE);
                    const oldKey = (oldR << 16) | (oldC & 0xffff);
                    const oldCell = map.floraGrid.get(oldKey);
                    if (Array.isArray(oldCell)) {
                        map.floraGrid.set(oldKey, oldCell.filter((p) => p !== ent));
                    }
                }
                ent.x = newX;
                ent.y = newY;
                ent.angle = ang;
                if (ent.solid !== false && map.floraGrid instanceof Map) {
                    const nc = Math.floor(newX / TILE_SIZE);
                    const nr = Math.floor(newY / TILE_SIZE);
                    const newKey = (nr << 16) | (nc & 0xffff);
                    let cell = map.floraGrid.get(newKey);
                    if (!cell) {
                        cell = [];
                        map.floraGrid.set(newKey, cell);
                    }
                    cell.push(ent);
                }
                if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                    this.game.renderer._staticChunkGridMap.delete(map.vicePalms);
                }
            } else if (desc.type === "VEHICLE") {
                ent.x = newX;
                ent.y = newY;
                ent.angle = ang;
                ent.netTargetX = newX;
                ent.netTargetY = newY;
                ent.netTargetAngle = ang;
                ent.netErrX = 0;
                ent.netErrY = 0;
                ent.vx = 0;
                ent.vy = 0;
                ent.speed = 0;
                ent._worldModified = true;
                ent.isStaticParked = false;
                if (typeof this.game.rebuildVehicleSpatialGrid === "function") {
                    this.game.rebuildVehicleSpatialGrid();
                }
            } else {
                // 3D Interactive Encounter (tikiBars, volleyball, streetTakeovers, smugglerDrops, sodaMachines)
                ent.x = newX;
                ent.y = newY;
                ent.ang = ang;
                ent.angle = ang;
                if (desc.subtype === "TIKI_BAR_3D" && Array.isArray(map.securityBarrierBoxes)) {
                    const cosA = Math.cos(ang), sinA = Math.sin(ang);
                    const ex = Math.abs(cosA) * 26 + Math.abs(sinA) * 18;
                    const ey = Math.abs(sinA) * 26 + Math.abs(cosA) * 18;
                    for (const bb of map.securityBarrierBoxes) {
                        if (bb && (bb.estateId === ent.id || (bb.cx !== undefined && Math.hypot(bb.cx - oldX, bb.cy - oldY) < 8))) {
                            bb.estateId = ent.id;
                            bb.cx = newX;
                            bb.cy = newY;
                            bb.cosA = cosA;
                            bb.sinA = sinA;
                            bb.minX = newX - ex;
                            bb.maxX = newX + ex;
                            bb.minY = newY - ey;
                            bb.maxY = newY + ey;
                        }
                    }
                    map.barrierBoxGrid = null;
                    if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                }
                this._invalidateArrayAndPromptMasks(desc.sourceArray);
                if (oe) oe._propColGrid = null;
                if (opts.rebuildMesh !== false && oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                }
            }

            if (desc.createdRecord) {
                desc.createdRecord.x = desc.type === "INTERIOR" ? ent.doorX : ent.x;
                desc.createdRecord.y = desc.type === "INTERIOR" ? ent.doorY : ent.y;
                desc.createdRecord.angle = ang;
                if (desc.type === "INTERIOR") {
                    desc.createdRecord.c = Math.floor(ent.doorX / TILE_SIZE);
                    desc.createdRecord.r = Math.floor(ent.doorY / TILE_SIZE);
                    desc.createdRecord.facing = ent.facing;
                }
            }
            return true;
        }

        relocateWorldEntity(targetOrId, newX, newY, newAngle, opts = {}) {
            this.indexPreExistingWorld();
            let desc = null;
            if (typeof targetOrId === "string") {
                const all = this.inspectWorldAt(16384, 16384, 99999, true);
                desc = all.find((d) => d.id === targetOrId || (d.entityRef && d.entityRef.id === targetOrId));
            } else if (targetOrId && targetOrId.entityRef) {
                desc = targetOrId;
            } else if (targetOrId && typeof targetOrId === "object") {
                const px = targetOrId.doorX !== undefined ? targetOrId.doorX : (targetOrId.x || 0);
                const py = targetOrId.doorY !== undefined ? targetOrId.doorY : (targetOrId.y || 0);
                const near = this.inspectWorldAt(px, py, 32, true);
                desc = near.find((d) => d.entityRef === targetOrId) || near[0];
            }
            if (!desc || !desc.entityRef) return null;

            const ent = desc.entityRef;
            const beforeX = desc.type === "INTERIOR" ? ent.doorX : ent.x;
            const beforeY = desc.type === "INTERIOR" ? ent.doorY : ent.y;
            const beforeAngle = ent.ang !== undefined ? ent.ang : (ent.angle || 0);
            const beforeFacing = ent.facing;
            if (desc.isPreExisting && !this._basePreExistingPoses.has(desc.id)) {
                this._basePreExistingPoses.set(desc.id, {
                    desc,
                    x: beforeX,
                    y: beforeY,
                    angle: beforeAngle,
                    facing: beforeFacing
                });
            }

            const check = opts.skipValidation
                ? { ok: true, snappedX: newX, snappedY: newY, snappedAngle: newAngle !== undefined ? newAngle : beforeAngle }
                : this.validatePlacement(desc.category || "PREFABS_3D", desc.kind, newX, newY, newAngle !== undefined ? newAngle : beforeAngle, opts);
            const sx = check.snappedX !== undefined ? check.snappedX : newX;
            const sy = check.snappedY !== undefined ? check.snappedY : newY;
            const sa = check.snappedAngle !== undefined ? check.snappedAngle : (newAngle !== undefined ? newAngle : beforeAngle);

            this._applyEntityPose(desc, sx, sy, sa, opts);

            if (!opts.skipHistory) {
                this._pushHistory({
                    type: "RELOCATE_ENTITY",
                    id: desc.id,
                    desc,
                    beforeX,
                    beforeY,
                    beforeAngle,
                    beforeFacing,
                    afterX: desc.type === "INTERIOR" ? ent.doorX : ent.x,
                    afterY: desc.type === "INTERIOR" ? ent.doorY : ent.y,
                    afterAngle: sa,
                    afterFacing: ent.facing
                });
            }
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "RELOCATE_ENTITY",
                opKey: `reloc_${desc.id}`,
                targetId: desc.id,
                x: Math.round((desc.type === "INTERIOR" ? ent.doorX : ent.x) * 10) / 10,
                y: Math.round((desc.type === "INTERIOR" ? ent.doorY : ent.y) * 10) / 10,
                angle: Math.round(sa * 1000) / 1000,
                facing: ent.facing
            }, opts);
            this.setStatus(`MOVED [${desc.label}] TO (${Math.round(sx)}, ${Math.round(sy)})`);
            return ent;
        }

        selectWorldEntityAt(x, y, maxRadius = 160, includePreExisting = true) {
            const desc = this.findNearestWorldEntity(x, y, maxRadius, includePreExisting);
            this.selectedEntity = desc || null;
            if (desc) {
                this.setStatus(`SELECTED [${desc.label}] (${desc.isPreExisting ? "PRE-EXISTING" : "CUSTOM"}) — EDIT IN RIGHT INSPECTOR`);
            } else {
                this.setStatus("NO ENTITY FOUND AT CURSOR TO INSPECT");
            }
            return this.selectedEntity;
        }

        _resolveEntityDescriptor(targetOrId) {
            this.indexPreExistingWorld();
            if (!targetOrId) return null;
            if (typeof targetOrId === "string") {
                const all = this.inspectWorldAt(16384, 16384, 99999, true);
                return all.find((d) => d.id === targetOrId || (d.entityRef && d.entityRef.id === targetOrId)) || null;
            }
            if (targetOrId.entityRef) return targetOrId;
            if (typeof targetOrId === "object") {
                const px = targetOrId.doorX !== undefined ? targetOrId.doorX : (targetOrId.x || 0);
                const py = targetOrId.doorY !== undefined ? targetOrId.doorY : (targetOrId.y || 0);
                const near = this.inspectWorldAt(px, py, 48, true);
                return near.find((d) => d.entityRef === targetOrId) || near[0] || null;
            }
            return null;
        }

        _captureEntityParametricState(desc) {
            if (!desc || !desc.entityRef) return null;
            const ent = desc.entityRef;
            const state = {
                name: ent.name,
                ang: ent.ang,
                angle: ent.angle,
                scale: ent.scale,
                height: ent.height,
                facing: ent.facing,
                theme: ent.theme,
                accent: ent.accent,
                color: ent.color,
                stripe: ent.stripe,
                maxSpeed: ent.maxSpeed,
                accel: ent.accel,
                hp: ent.hp,
                broken: ent.broken,
                damaged: ent.damaged
            };
            if (ent.spec && typeof ent.spec === "object") {
                state.specCopy = Object.assign({}, ent.spec);
                if (Array.isArray(ent.spec.wallColor)) state.specCopy.wallColor = ent.spec.wallColor.slice();
                if (Array.isArray(ent.spec.trimColor)) state.specCopy.trimColor = ent.spec.trimColor.slice();
                if (Array.isArray(ent.spec.roofBaseColor)) state.specCopy.roofBaseColor = ent.spec.roofBaseColor.slice();
                if (Array.isArray(ent.spec.roofRidgeColor)) state.specCopy.roofRidgeColor = ent.spec.roofRidgeColor.slice();
            }
            return state;
        }

        _applyEntityParametricPatch(desc, patch = {}, opts = {}) {
            if (!desc || !desc.entityRef || !patch) return false;
            const map = this.game && this.game.map;
            const oe = map && map.objectEngine;
            const ent = desc.entityRef;

            if (desc.isPreExisting && !this._basePreExistingStates.has(desc.id)) {
                this._basePreExistingStates.set(desc.id, {
                    desc,
                    state: this._captureEntityParametricState(desc)
                });
            }

            if (patch.name !== undefined) {
                ent.name = String(patch.name);
                desc.label = ent.name;
            }
            if (patch.angle !== undefined || patch.ang !== undefined) {
                const na = Number(patch.angle !== undefined ? patch.angle : patch.ang) || 0;
                ent.ang = na;
                ent.angle = na;
                desc.angle = na;
            }

            if (desc.subtype === "ESTATE") {
                if (patch.specCopy) {
                    ent.spec = Object.assign({}, patch.specCopy);
                } else if (patch.wallColor || patch.trimColor || patch.roofBaseColor || patch.roofRidgeColor || patch.mapColor || patch.mapRoofColor || patch.w1 || patch.d1 || patch.h1 || patch.roofStyle) {
                    ent.spec = Object.assign({}, ent.spec || {});
                    if (Array.isArray(patch.wallColor)) ent.spec.wallColor = patch.wallColor.slice();
                    if (Array.isArray(patch.trimColor)) ent.spec.trimColor = patch.trimColor.slice();
                    if (Array.isArray(patch.roofBaseColor)) ent.spec.roofBaseColor = patch.roofBaseColor.slice();
                    if (Array.isArray(patch.roofRidgeColor)) ent.spec.roofRidgeColor = patch.roofRidgeColor.slice();
                    if (patch.mapColor) ent.spec.mapColor = patch.mapColor;
                    if (patch.mapRoofColor) ent.spec.mapRoofColor = patch.mapRoofColor;
                    if (patch.w1) ent.spec.w1 = Number(patch.w1);
                    if (patch.d1) ent.spec.d1 = Number(patch.d1);
                    if (patch.h1) ent.spec.h1 = Number(patch.h1);
                    if (patch.roofStyle) ent.spec.roofStyle = patch.roofStyle;
                }
                if (patch.scale !== undefined) {
                    ent.scale = Math.max(0.5, Math.min(2.2, Number(patch.scale) || 1.0));
                }
                const sc = ent.scale || 1.0;
                const spec = ent.spec || {};
                const ang = ent.ang || 0;
                const cosA = Math.cos(ang), sinA = Math.sin(ang);
                const w1 = Number(spec.w1) || 156;
                const d1 = Number(spec.d1) || 112;
                const h1 = Number(spec.h1) || 0.72;
                const overhang = Number(spec.roofOverhang) || 10;
                ent.hw = (w1 * 0.5 + overhang) * sc;
                ent.hh = (d1 * 0.5 + overhang) * sc;
                ent.extX = Math.abs(cosA) * ent.hw + Math.abs(sinA) * ent.hh;
                ent.extY = Math.abs(sinA) * ent.hw + Math.abs(cosA) * ent.hh;
                ent.totalHeightBlocks = (Number(spec.stiltH) || 0) + h1 * sc + (Number(spec.h2) || 0) * sc + (Number(spec.roofPitch1) || 0.2) * sc + (Number(spec.roofPitch2) || 0) * sc;

                if (map && Array.isArray(map.securityBarrierBoxes)) {
                    const wallHw = (w1 * 0.5) * sc;
                    const wallHh = (d1 * 0.5) * sc;
                    const ex = Math.abs(cosA) * wallHw + Math.abs(sinA) * wallHh;
                    const ey = Math.abs(sinA) * wallHw + Math.abs(cosA) * wallHh;
                    for (const bb of map.securityBarrierBoxes) {
                        if (bb && (bb.estateId === ent.id || (bb.cx !== undefined && Math.hypot(bb.cx - ent.x, bb.cy - ent.y) < 12))) {
                            bb.estateId = ent.id;
                            bb.hw = wallHw;
                            bb.hh = wallHh;
                            bb.cosA = cosA;
                            bb.sinA = sinA;
                            bb.minX = ent.x - ex;
                            bb.maxX = ent.x + ex;
                            bb.minY = ent.y - ey;
                            bb.maxY = ent.y + ey;
                        }
                    }
                    map.barrierBoxGrid = null;
                    if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                }
                if (opts.rebuildMesh !== false && oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                    if (typeof this.game.renderer.bakeRadarBackground === "function") {
                        this.game.renderer.bakeRadarBackground();
                    }
                }
            } else if (desc.type === "INTERIOR") {
                if (patch.theme && window.ShopInteriors && window.ShopInteriors.SHOP_TEMPLATES && window.ShopInteriors.SHOP_TEMPLATES[patch.theme]) {
                    const tpl = window.ShopInteriors.SHOP_TEMPLATES[patch.theme];
                    ent.theme = tpl.theme;
                    ent.accent = patch.accent || tpl.accent;
                    ent.matRGB = tpl.matRGB;
                    ent.w = tpl.w || 820;
                    ent.h = tpl.h || 560;
                    if (typeof tpl.buildStations === "function") {
                        ent.stations = tpl.buildStations(ent.id).map((s) => Object.assign({}, s, { cooldown: 0 }));
                        delete ent._rawStations;
                    }
                    if (typeof tpl.buildNpcs === "function") {
                        ent.npcs = tpl.buildNpcs().map((n) => Object.assign({}, n));
                        delete ent._rawNpcs;
                    }
                }
                if (patch.accent) ent.accent = patch.accent;
                if (patch.facing && ["S", "N", "E", "W"].includes(patch.facing)) {
                    ent.facing = patch.facing;
                }
                if (window.ShopInteriors && typeof window.ShopInteriors.orientInterior === "function") {
                    ent._orientedFacing = null;
                    window.ShopInteriors.orientInterior(ent);
                }
                if (this.game.renderer && this.game.renderer._staticChunkGridMap && map) {
                    this.game.renderer._staticChunkGridMap.delete(map.interiors);
                }
            } else if (desc.type === "VEHICLE") {
                if (patch.color) ent.color = patch.color;
                if (patch.stripe !== undefined) ent.stripe = patch.stripe;
                if (patch.maxSpeed !== undefined) ent.maxSpeed = Number(patch.maxSpeed);
                if (patch.accel !== undefined) ent.accel = Number(patch.accel);
                if (patch.hp !== undefined) {
                    ent.hp = Number(patch.hp);
                    ent.maxHp = Math.max(ent.maxHp || 120, ent.hp);
                    ent.destroyed = false;
                    ent.smokeTimer = 0;
                }
                ent._worldModified = true;
                ent.isStaticParked = false;
            } else if (desc.type === "PROP_FLORA") {
                if (patch.scale !== undefined) ent.scale = Math.max(0.4, Math.min(2.5, Number(patch.scale) || 1.0));
                if (patch.height !== undefined) ent.height = Math.max(0.4, Math.min(2.8, Number(patch.height) || 1.15));
                if (patch.broken !== undefined) ent.broken = Boolean(patch.broken);
                if (patch.damaged !== undefined) ent.damaged = Boolean(patch.damaged);
                if (oe) oe._propColGrid = null;
                if (this.game.renderer && this.game.renderer._staticChunkGridMap && map) {
                    this.game.renderer._staticChunkGridMap.delete(map.vicePalms);
                    if (oe) this.game.renderer._staticChunkGridMap.delete(oe.streetProps);
                }
            }

            if (desc.id) {
                const prevPatch = this._persistedEntityPatches.get(desc.id) || {};
                this._persistedEntityPatches.set(desc.id, Object.assign({}, prevPatch, patch));
            }
            return true;
        }

        reapplyPersistedEntityPatch(entityOrId) {
            if (!entityOrId || !this._persistedEntityPatches || this._persistedEntityPatches.size === 0) return false;
            const id = typeof entityOrId === "string" ? entityOrId : entityOrId.id;
            if (!id || !this._persistedEntityPatches.has(id)) return false;
            const patch = this._persistedEntityPatches.get(id);
            const ent = typeof entityOrId === "object" ? entityOrId : null;
            if (ent) {
                if (patch.color) ent.color = patch.color;
                if (patch.stripe !== undefined) ent.stripe = patch.stripe;
                if (patch.maxSpeed !== undefined) ent.maxSpeed = Number(patch.maxSpeed);
                if (patch.accel !== undefined) ent.accel = Number(patch.accel);
                if (patch.hp !== undefined) {
                    ent.hp = Math.max(ent.hp || 100, Number(patch.hp));
                    ent.maxHp = Math.max(ent.maxHp || 120, Number(patch.hp));
                }
                return true;
            }
            const desc = this._resolveEntityDescriptor(id);
            if (desc) {
                return this._applyEntityParametricPatch(desc, patch, { rebuildMesh: false });
            }
            return false;
        }

        modifyWorldEntity(targetOrId, patch = {}, opts = {}) {
            const desc = this._resolveEntityDescriptor(targetOrId);
            if (!desc || !desc.entityRef) return null;

            const beforeState = this._captureEntityParametricState(desc);
            this._applyEntityParametricPatch(desc, patch, opts);
            const afterState = this._captureEntityParametricState(desc);

            if (!opts.skipHistory) {
                this._pushHistory({
                    type: "MODIFY_ENTITY",
                    id: desc.id,
                    desc,
                    beforeState,
                    afterState,
                    patch: Object.assign({}, patch)
                });
            }
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "MODIFY_ENTITY",
                opKey: `mod_${desc.id}`,
                targetId: desc.id,
                patch
            }, opts);
            this.setStatus(`MODIFIED [${desc.label}] (${Object.keys(patch).join(", ")})`);
            return desc.entityRef;
        }

        _removeWorldEntityDescriptor(desc, opts = {}) {
            if (!desc) return null;
            if (this.selectedEntity && this.selectedEntity.id === desc.id) {
                this.selectedEntity = null;
            }
            if (!desc.isPreExisting && desc.createdRecord) {
                const idx = this.createdEntities.indexOf(desc.createdRecord);
                if (idx >= 0) this.createdEntities.splice(idx, 1);
                this.removeCreatedRecord(desc.createdRecord);
                if (!opts.skipHistory) {
                    this._pushHistory({
                        type: "DELETE_CREATED",
                        record: desc.createdRecord
                    });
                }
                if (!opts.skipSave) this.saveToLocalStorage();
                this._broadcastCreationOp({
                    action: "REMOVE",
                    opKey: desc.id,
                    targetId: desc.id,
                    x: Math.round(desc.x),
                    y: Math.round(desc.y),
                    isPreExisting: false
                }, opts);
                this.setStatus(`DELETED CUSTOM [${desc.label}]`);
                return desc;
            }

            // Deleting a Pre-Existing World Entity with full Undo/Redo & MMO Restore support!
            const map = this.game && this.game.map;
            const oe = map && map.objectEngine;
            const arr = desc.sourceArray;
            const ent = desc.entityRef;
            const arrIdx = Array.isArray(arr) ? arr.indexOf(ent) : -1;
            if (arrIdx >= 0) {
                arr.splice(arrIdx, 1);
            }
            const removedBarriers = [];
            if (map && Array.isArray(map.securityBarrierBoxes) && (desc.subtype === "ESTATE" || desc.subtype === "TIKI_BAR_3D")) {
                for (let i = map.securityBarrierBoxes.length - 1; i >= 0; i--) {
                    const bb = map.securityBarrierBoxes[i];
                    if (bb && (bb.estateId === ent.id || (bb.cx !== undefined && Math.hypot(bb.cx - desc.x, bb.cy - desc.y) < 12))) {
                        removedBarriers.push(bb);
                        map.securityBarrierBoxes.splice(i, 1);
                    }
                }
                map.barrierBoxGrid = null;
                if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
            }
            if (desc.subtype === "FLORA" && map && map.floraGrid instanceof Map) {
                const fc = Math.floor(desc.x / TILE_SIZE);
                const fr = Math.floor(desc.y / TILE_SIZE);
                const key = (fr << 16) | (fc & 0xffff);
                const cell = map.floraGrid.get(key);
                if (Array.isArray(cell)) {
                    map.floraGrid.set(key, cell.filter((p) => p !== ent));
                }
            }
            this._invalidateArrayAndPromptMasks(arr);
            if (oe) oe._propColGrid = null;
            if (this.game.renderer && this.game.renderer._staticChunkGridMap && arr) {
                this.game.renderer._staticChunkGridMap.delete(arr);
            }
            if (typeof this.game.rebuildVehicleSpatialGrid === "function" && desc.type === "VEHICLE") {
                this.game.rebuildVehicleSpatialGrid();
            }
            if (opts.rebuildMesh !== false && oe && this.game.renderer && this.game.renderer.gl && (desc.subtype === "ESTATE" || desc.subtype === "TIKI_BAR_3D" || desc.subtype === "SODA_ECOLA_3D" || desc.subtype === "SODA_SPRUNK_3D")) {
                oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
            }

            const delRecord = {
                type: "DELETE_PREEXISTING",
                desc,
                sourceArray: arr,
                arrayIndex: arrIdx,
                entityRef: ent,
                removedBarriers
            };
            this._deletedPreExistingMap.set(desc.id, delRecord);

            if (!opts.skipHistory) {
                this._pushHistory(delRecord);
            }
            this._broadcastCreationOp({
                action: "REMOVE",
                opKey: `rm_${desc.id}`,
                targetId: desc.id,
                x: Math.round(desc.x),
                y: Math.round(desc.y),
                isPreExisting: true
            }, opts);
            this.setStatus(`DELETED PRE-EXISTING [${desc.label}] ([CTRL+Z] TO RESTORE)`);
            return desc;
        }

        removeNearestWorldEntity(x, y, maxRadius = 140, includePreExisting = true, opts = {}) {
            const desc = this.findNearestWorldEntity(x, y, maxRadius, includePreExisting);
            if (!desc) {
                this.setStatus("NO WORLD ENTITY WITHIN RANGE TO DELETE");
                return null;
            }
            return this._removeWorldEntityDescriptor(desc, opts);
        }

        cloneWorldEntityToPalette(x, y, maxRadius = 160) {
            const desc = this.findNearestWorldEntity(x, y, maxRadius, true);
            if (!desc) {
                this.setStatus("NO ENTITY UNDER CURSOR TO CLONE");
                return null;
            }
            const catIdx = this.categories.indexOf(desc.category);
            if (catIdx >= 0) {
                this.activeCategoryIdx = catIdx;
                const cat = this.categories[catIdx];
                const list = this.getCatalogForCategory(cat);
                let matchIdx = list.findIndex((it) => it.key === desc.kind);
                if (matchIdx < 0 && desc.subtype === "STREET_PROP") {
                    const alias = desc.kind === "PAYPHONE_BOOTH" ? "PAYPHONE" : (desc.kind === "STREETLIGHT_NEON" ? "STREETLAMP" : desc.kind);
                    matchIdx = list.findIndex((it) => it.key === alias);
                }
                if (matchIdx >= 0) {
                    this.selectedItemIdxByCat[cat] = matchIdx;
                    this.paletteScrollByCat[cat] = Math.max(0, Math.min(Math.max(0, list.length - 8), matchIdx - 2));
                }
            }
            this.placementAngle = desc.angle || 0;
            this.setStatus(`CLONED [${desc.label}] TO BRUSH (${desc.isPreExisting ? "PRE-EXISTING" : "CUSTOM"})`);
            return desc;
        }

        /* ====================================================================
           7. PILLAR 5: UNDO / REDO HISTORY STACK, DELETION & BLUEPRINT JSON I/O
           ==================================================================== */
        _pushHistory(action) {
            this.undoStack.push(action);
            if (this.undoStack.length > 250) this.undoStack.shift();
            this.redoStack.length = 0;
        }

        removeCreatedRecord(rec) {
            if (!rec || !this.game) return false;
            const map = this.game.map;
            const oe = map && map.objectEngine;

            if (rec.type === "VOXEL_TILE" && rec.beforeSnap) {
                this.restoreVoxelColumnSnapshot(rec.beforeSnap, true);
                return true;
            }
            if (rec.type === "RELOCATE_ENTITY" && rec.desc) {
                this._applyEntityPose(rec.desc, rec.beforeX, rec.beforeY, rec.beforeAngle, {
                    skipValidation: true,
                    facing: rec.beforeFacing
                });
                return true;
            }
            if (rec.type === "MODIFY_ENTITY" && rec.desc && rec.beforeState) {
                this._applyEntityParametricPatch(rec.desc, rec.beforeState);
                return true;
            }
            if (rec.type === "DELETE_CREATED" && rec.record) {
                this.reapplyCreatedRecord(rec.record);
                return true;
            }
            if (rec.type === "DELETE_PREEXISTING" && rec.entityRef && Array.isArray(rec.sourceArray)) {
                if (!rec.sourceArray.includes(rec.entityRef)) {
                    const idx = Math.max(0, Math.min(rec.sourceArray.length, rec.arrayIndex >= 0 ? rec.arrayIndex : rec.sourceArray.length));
                    rec.sourceArray.splice(idx, 0, rec.entityRef);
                }
                if (rec.desc && rec.desc.id) {
                    this._deletedPreExistingMap.delete(rec.desc.id);
                }
                if (map && Array.isArray(map.securityBarrierBoxes) && Array.isArray(rec.removedBarriers) && rec.removedBarriers.length > 0) {
                    for (const bb of rec.removedBarriers) {
                        if (!map.securityBarrierBoxes.includes(bb)) map.securityBarrierBoxes.push(bb);
                    }
                    map.barrierBoxGrid = null;
                    if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                }
                if (rec.desc && rec.desc.subtype === "FLORA" && map && map.floraGrid instanceof Map) {
                    const fc = Math.floor(rec.entityRef.x / TILE_SIZE);
                    const fr = Math.floor(rec.entityRef.y / TILE_SIZE);
                    const key = (fr << 16) | (fc & 0xffff);
                    let cell = map.floraGrid.get(key);
                    if (!cell) {
                        cell = [];
                        map.floraGrid.set(key, cell);
                    }
                    if (!cell.includes(rec.entityRef)) cell.push(rec.entityRef);
                }
                this._invalidateArrayAndPromptMasks(rec.sourceArray);
                if (oe) oe._propColGrid = null;
                if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                    this.game.renderer._staticChunkGridMap.delete(rec.sourceArray);
                }
                if (typeof this.game.rebuildVehicleSpatialGrid === "function" && rec.desc && rec.desc.type === "VEHICLE") {
                    this.game.rebuildVehicleSpatialGrid();
                }
                if (oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                }
                return true;
            }
            if (rec.type === "VEHICLE") {
                this.game.vehicles = this.game.vehicles.filter((v) => v !== rec.entityRef && v.id !== rec.id);
                if (typeof this.game.rebuildVehicleSpatialGrid === "function") this.game.rebuildVehicleSpatialGrid();
                return true;
            }
            if (rec.type === "PREFAB_3D") {
                if (rec.subtype === "TIKI_BAR_3D" && Array.isArray(map.tikiBars)) {
                    map.tikiBars = map.tikiBars.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                    this._invalidateArrayAndPromptMasks(map.tikiBars);
                    if (Array.isArray(map.securityBarrierBoxes)) {
                        map.securityBarrierBoxes = map.securityBarrierBoxes.filter((b) => b.estateId !== rec.id);
                        map.barrierBoxGrid = null;
                        if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                    }
                } else if (rec.subtype === "VOLLEYBALL_COURT_3D" && Array.isArray(map.beachVolleyballCourts)) {
                    map.beachVolleyballCourts = map.beachVolleyballCourts.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                    this._invalidateArrayAndPromptMasks(map.beachVolleyballCourts);
                } else if (rec.subtype === "STREET_TAKEOVER_RING" && Array.isArray(map.streetTakeovers)) {
                    map.streetTakeovers = map.streetTakeovers.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                    this._invalidateArrayAndPromptMasks(map.streetTakeovers);
                } else if (rec.subtype === "SMUGGLER_CRATE_3D" && oe && Array.isArray(oe.smugglerDrops)) {
                    oe.smugglerDrops = oe.smugglerDrops.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                    this._invalidateArrayAndPromptMasks(oe.smugglerDrops);
                } else if ((rec.subtype === "SODA_ECOLA_3D" || rec.subtype === "SODA_SPRUNK_3D") && oe) {
                    if (Array.isArray(oe.sodaMachines)) {
                        oe.sodaMachines = oe.sodaMachines.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                        this._invalidateArrayAndPromptMasks(oe.sodaMachines);
                    }
                    if (Array.isArray(oe.interactiveProps)) oe.interactiveProps = oe.interactiveProps.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                    oe._propColGrid = null;
                } else if (oe && Array.isArray(oe.instances)) {
                    oe.instances = oe.instances.filter((x) => x !== rec.entityRef && x.id !== rec.id);
                    if (Array.isArray(map.residentialHouses)) {
                        map.residentialHouses = map.residentialHouses.filter((h) => h.id !== rec.id);
                    }
                    if (Array.isArray(map.securityBarrierBoxes)) {
                        map.securityBarrierBoxes = map.securityBarrierBoxes.filter((b) => b.estateId !== rec.id);
                        map.barrierBoxGrid = null;
                        if (typeof map.ensureBarrierSpatialGrids === "function") {
                            map.ensureBarrierSpatialGrids();
                        }
                    }
                }
                if (oe && this.game.renderer && this.game.renderer.gl) {
                    oe.buildStatic3DMesh(this.game.renderer.gl, this.game.renderer);
                }
                return true;
            }
            if (rec.type === "PROP_FLORA") {
                if (rec.subtype === "STREET_PROP" && oe && Array.isArray(oe.streetProps)) {
                    oe.streetProps = oe.streetProps.filter((p) => p !== rec.entityRef && p.id !== rec.id);
                    oe._propColGrid = null;
                    if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                        this.game.renderer._staticChunkGridMap.delete(oe.streetProps);
                    }
                } else if (Array.isArray(map.vicePalms)) {
                    map.vicePalms = map.vicePalms.filter((p) => p !== rec.entityRef && p.id !== rec.id);
                    if (map.floraGrid instanceof Map && rec.entityRef) {
                        const fc = Math.floor(rec.entityRef.x / TILE_SIZE);
                        const fr = Math.floor(rec.entityRef.y / TILE_SIZE);
                        const key = (fr << 16) | (fc & 0xffff);
                        const cell = map.floraGrid.get(key);
                        if (Array.isArray(cell)) {
                            map.floraGrid.set(key, cell.filter((p) => p !== rec.entityRef && p.id !== rec.id));
                        }
                    }
                    if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                        this.game.renderer._staticChunkGridMap.delete(map.vicePalms);
                    }
                }
                return true;
            }
            if (rec.type === "INTERIOR" && Array.isArray(map.interiors)) {
                map.interiors = map.interiors.filter((i) => i !== rec.entityRef && i.id !== rec.id);
                if (this.game.renderer && this.game.renderer._staticChunkGridMap) {
                    this.game.renderer._staticChunkGridMap.delete(map.interiors);
                }
                return true;
            }
            if (rec.type === "MISSION_BLUEPRINT" && rec.id) {
                delete this.customMissions[rec.id];
                return true;
            }
            return false;
        }

        reapplyCreatedRecord(rec) {
            if (!rec) return false;
            const map = this.game && this.game.map;
            const oe = map && map.objectEngine;

            if (rec.type === "VOXEL_TILE" && rec.afterSnap) {
                this.restoreVoxelColumnSnapshot(rec.afterSnap, true);
                this._activeVoxelEdits.set(`${rec.c}_${rec.r}`, {
                    c: rec.c,
                    r: rec.r,
                    presetKey: rec.presetKey,
                    opts: rec.opts || {}
                });
                return true;
            }
            if (rec.type === "RELOCATE_ENTITY" && rec.desc) {
                this._applyEntityPose(rec.desc, rec.afterX, rec.afterY, rec.afterAngle, {
                    skipValidation: true,
                    facing: rec.afterFacing
                });
                return true;
            }
            if (rec.type === "MODIFY_ENTITY" && rec.desc && rec.afterState) {
                this._applyEntityParametricPatch(rec.desc, rec.afterState);
                return true;
            }
            if (rec.type === "DELETE_CREATED" && rec.record) {
                this.removeCreatedRecord(rec.record);
                this.createdEntities = this.createdEntities.filter((e) => e !== rec.record && e.id !== rec.record.id);
                return true;
            }
            if (rec.type === "DELETE_PREEXISTING" && rec.entityRef && Array.isArray(rec.sourceArray)) {
                const idx = rec.sourceArray.indexOf(rec.entityRef);
                if (idx >= 0) rec.sourceArray.splice(idx, 1);
                if (rec.desc && rec.desc.id) {
                    this._deletedPreExistingMap.set(rec.desc.id, rec);
                }
                if (map && Array.isArray(map.securityBarrierBoxes) && Array.isArray(rec.removedBarriers) && rec.removedBarriers.length > 0) {
                    const rmSet = new Set(rec.removedBarriers);
                    map.securityBarrierBoxes = map.securityBarrierBoxes.filter((b) => !rmSet.has(b));
                    map.barrierBoxGrid = null;
                    if (typeof map.ensureBarrierSpatialGrids === "function") map.ensureBarrierSpatialGrids();
                }
                this._invalidateArrayAndPromptMasks(rec.sourceArray);
                if (oe) oe._propColGrid = null;
                return true;
            }
            if (rec.type === "VEHICLE") {
                const v = this.spawnVehicle(rec.specKey, rec.x, rec.y, rec.angle, { id: rec.id, skipHistory: true, skipSave: true });
                rec.entityRef = v;
                return Boolean(v);
            }
            if (rec.type === "PREFAB_3D") {
                const inst = this.placePrefab3D(rec.prefabId, rec.x, rec.y, rec.angle, { id: rec.id, skipHistory: true, skipSave: true });
                rec.entityRef = inst;
                return Boolean(inst);
            }
            if (rec.type === "PROP_FLORA") {
                const p = this.placePropOrFlora(rec.kind, rec.x, rec.y, rec.angle, { id: rec.id, skipHistory: true, skipSave: true });
                rec.entityRef = p;
                return Boolean(p);
            }
            if (rec.type === "INTERIOR") {
                const intr = this.placeEstablishment({ id: rec.id, tpl: rec.tpl, name: rec.name, c: rec.c, r: rec.r, facing: rec.facing, x: rec.x, y: rec.y }, { skipHistory: true, skipSave: true });
                rec.entityRef = intr;
                return Boolean(intr);
            }
            if (rec.type === "MISSION_BLUEPRINT" && rec.blueprint) {
                this.createCustomMission(rec.blueprint, { skipHistory: true, skipSave: true });
                return true;
            }
            return false;
        }

        _broadcastUndoAction(act) {
            if (!act) return;
            if (act.type === "VOXEL_TILE") {
                this._broadcastCreationOp({
                    action: "RESTORE_VOXEL_TILE",
                    opKey: `voxel_${act.c}_${act.r}`,
                    c: act.c,
                    r: act.r,
                    snap: act.beforeSnap
                });
            } else if (act.type === "RELOCATE_ENTITY" && act.id) {
                this._broadcastCreationOp({
                    action: "RELOCATE_ENTITY",
                    opKey: `reloc_${act.id}`,
                    targetId: act.id,
                    x: Math.round((act.beforeX || 0) * 10) / 10,
                    y: Math.round((act.beforeY || 0) * 10) / 10,
                    angle: Math.round((act.beforeAngle || 0) * 1000) / 1000,
                    facing: act.beforeFacing
                });
            } else if (act.type === "MODIFY_ENTITY" && act.id && act.beforeState) {
                this._broadcastCreationOp({
                    action: "MODIFY_ENTITY",
                    opKey: `mod_${act.id}`,
                    targetId: act.id,
                    patch: act.beforeState
                });
            } else if (act.type === "DELETE_PREEXISTING" && act.desc && act.desc.id) {
                this._broadcastCreationOp({
                    action: "RESTORE_PREEXISTING",
                    opKey: `rm_${act.desc.id}`,
                    targetId: act.desc.id
                });
            } else if ((act.type === "VEHICLE" || act.type === "PREFAB_3D" || act.type === "PROP_FLORA" || act.type === "INTERIOR") && act.id) {
                this._broadcastCreationOp({
                    action: "REMOVE",
                    opKey: act.id,
                    targetId: act.id,
                    x: Math.round(act.x || 0),
                    y: Math.round(act.y || 0),
                    isPreExisting: false
                });
            } else if (act.type === "MISSION_BLUEPRINT" && act.id) {
                this._broadcastCreationOp({
                    action: "REMOVE",
                    opKey: `msn_${act.id}`,
                    targetId: act.id,
                    isPreExisting: false
                });
            }
        }

        _broadcastRedoAction(act) {
            if (!act) return;
            if (act.type === "VOXEL_TILE") {
                this._broadcastCreationOp({
                    action: "VOXEL_TILE",
                    opKey: `voxel_${act.c}_${act.r}`,
                    c: act.c,
                    r: act.r,
                    presetKey: act.presetKey,
                    storeys: act.opts && act.opts.storeys,
                    style: act.opts && act.opts.style
                });
            } else if (act.type === "RELOCATE_ENTITY" && act.id) {
                this._broadcastCreationOp({
                    action: "RELOCATE_ENTITY",
                    opKey: `reloc_${act.id}`,
                    targetId: act.id,
                    x: Math.round((act.afterX || 0) * 10) / 10,
                    y: Math.round((act.afterY || 0) * 10) / 10,
                    angle: Math.round((act.afterAngle || 0) * 1000) / 1000,
                    facing: act.afterFacing
                });
            } else if (act.type === "MODIFY_ENTITY" && act.id && act.afterState) {
                this._broadcastCreationOp({
                    action: "MODIFY_ENTITY",
                    opKey: `mod_${act.id}`,
                    targetId: act.id,
                    patch: act.afterState
                });
            } else if (act.type === "DELETE_CREATED" && act.record && act.record.id) {
                this._broadcastCreationOp({
                    action: "REMOVE",
                    opKey: act.record.id,
                    targetId: act.record.id,
                    x: Math.round(act.record.x || 0),
                    y: Math.round(act.record.y || 0),
                    isPreExisting: false
                });
            } else if (act.type === "DELETE_PREEXISTING" && act.desc && act.desc.id) {
                this._broadcastCreationOp({
                    action: "REMOVE",
                    opKey: `rm_${act.desc.id}`,
                    targetId: act.desc.id,
                    x: Math.round(act.desc.x || 0),
                    y: Math.round(act.desc.y || 0),
                    isPreExisting: true
                });
            }
        }

        undo() {
            if (this.undoStack.length === 0) {
                this.setStatus("UNDO STACK EMPTY");
                return false;
            }
            const act = this.undoStack.pop();
            this.removeCreatedRecord(act);
            if (act.type !== "RELOCATE_ENTITY" && act.type !== "MODIFY_ENTITY" && act.type !== "DELETE_PREEXISTING" && act.type !== "DELETE_CREATED") {
                this.createdEntities = this.createdEntities.filter((e) => e !== act && (e.id === undefined || e.id !== act.id));
            }
            this._broadcastUndoAction(act);
            this.redoStack.push(act);
            this.saveToLocalStorage();
            this.setStatus(`UNDID [${act.type}]`);
            return true;
        }

        redo() {
            if (this.redoStack.length === 0) {
                this.setStatus("REDO STACK EMPTY");
                return false;
            }
            const act = this.redoStack.pop();
            this.reapplyCreatedRecord(act);
            this._broadcastRedoAction(act);
            this.undoStack.push(act);
            this.saveToLocalStorage();
            this.setStatus(`REDID [${act.type}]`);
            return true;
        }

        removeNearestCreatedEntity(x, y, maxRadius = 110, allowPreExisting = false) {
            return this.removeNearestWorldEntity(x, y, maxRadius, Boolean(allowPreExisting));
        }

        resetToCleanBaseWorld() {
            while (this.undoStack.length > 0) {
                const act = this.undoStack.pop();
                this.removeCreatedRecord(act);
            }
            for (const rec of this.createdEntities) {
                this.removeCreatedRecord(rec);
            }
            this.createdEntities.length = 0;
            this.redoStack.length = 0;
            this.selectedEntity = null;
            this.grabbedEntity = null;

            if (this._deletedPreExistingMap && this._deletedPreExistingMap.size > 0) {
                for (const delRec of Array.from(this._deletedPreExistingMap.values())) {
                    this.removeCreatedRecord(Object.assign({ type: "DELETE_PREEXISTING" }, delRec));
                }
                this._deletedPreExistingMap.clear();
            }
            if (this._basePreExistingStates && this._basePreExistingStates.size > 0) {
                for (const { desc, state } of this._basePreExistingStates.values()) {
                    this._applyEntityParametricPatch(desc, state, { rebuildMesh: false });
                }
                this._basePreExistingStates.clear();
            }
            if (this._basePreExistingPoses && this._basePreExistingPoses.size > 0) {
                for (const { desc, x, y, angle, facing } of this._basePreExistingPoses.values()) {
                    this._applyEntityPose(desc, x, y, angle, { skipValidation: true, facing, rebuildMesh: false });
                }
                this._basePreExistingPoses.clear();
            }
            if (this._baseVoxelSnapshots && this._baseVoxelSnapshots.size > 0) {
                for (const snap of this._baseVoxelSnapshots.values()) {
                    this.restoreVoxelColumnSnapshot(snap, false);
                }
                this._baseVoxelSnapshots.clear();
            }
            if (this._activeVoxelEdits) this._activeVoxelEdits.clear();
            if (this._persistedEntityPatches) this._persistedEntityPatches.clear();
            return true;
        }

        clearAllCreations(opts = {}) {
            this.resetToCleanBaseWorld();
            if (opts.rebuildMesh !== false) {
                this.rebuildWorldMeshes(true);
            }
            if (!opts.skipSave) this.saveToLocalStorage();
            this._broadcastCreationOp({
                action: "CLEAR_ALL",
                opKey: "clear_all"
            }, opts);
            this.setStatus("CLEARED ALL CUSTOM CREATIONS");
            return true;
        }

        /* ====================================================================
           7B. MULTIPLAYER & DEDICATED SERVER REAL-TIME CREATION SYNC
           ==================================================================== */
        applyRemoteCreationOp(op, opts = {}) {
            if (!op || typeof op !== "object" || !this.game || !this.game.map) return false;
            const remoteOpts = {
                id: op.id,
                isRemote: true,
                skipBroadcast: true,
                skipHistory: true,
                skipSave: true,
                rebuildMesh: !opts.batch
            };

            if (op.action === "VOXEL_TILE" && typeof op.c === "number" && typeof op.r === "number") {
                this.paintVoxelTile(op.c, op.r, op.presetKey || "SIDEWALK", Object.assign({}, remoteOpts, {
                    storeys: op.storeys,
                    style: op.style
                }));
                return true;
            }
            if (op.action === "RESTORE_VOXEL_TILE" && typeof op.c === "number" && typeof op.r === "number") {
                const snap = op.snap || (this._baseVoxelSnapshots ? this._baseVoxelSnapshots.get(`${op.c}_${op.r}`) : null);
                if (snap) {
                    this.restoreVoxelColumnSnapshot(snap, !opts.batch);
                    return true;
                }
                return false;
            }
            if (op.action === "DEFINE_VEHICLE" && op.specKey) {
                this.defineVehicle(op.specKey, Object.assign({}, op.config, { isRemote: true, skipBroadcast: true }));
                return true;
            }
            if (op.action === "SPAWN_VEHICLE" && op.specKey) {
                this.spawnVehicle(op.specKey, op.x, op.y, op.angle || 0, remoteOpts);
                return true;
            }
            if (op.action === "DEFINE_PREFAB_3D" && op.prefabId) {
                this.definePrefab3D(op.prefabId, Object.assign({}, op.config, { isRemote: true, skipBroadcast: true }));
                return true;
            }
            if (op.action === "PLACE_PREFAB_3D" && op.prefabId) {
                if (op.id && this.createdEntities.some((e) => e && e.id === op.id)) return true;
                this.placePrefab3D(op.prefabId, op.x, op.y, op.angle || 0, Object.assign({}, remoteOpts, { scale: op.scale }));
                return true;
            }
            if (op.action === "PLACE_PROP_FLORA" && op.kind) {
                if (op.id && this.createdEntities.some((e) => e && e.id === op.id)) return true;
                this.placePropOrFlora(op.kind, op.x, op.y, op.angle || 0, Object.assign({}, remoteOpts, { scale: op.scale }));
                return true;
            }
            if (op.action === "PLACE_INTERIOR" && op.tpl) {
                if (op.id && this.createdEntities.some((e) => e && e.id === op.id)) return true;
                this.placeEstablishment({
                    id: op.id,
                    tpl: op.tpl,
                    name: op.name,
                    c: op.c,
                    r: op.r,
                    facing: op.facing,
                    x: op.x,
                    y: op.y
                }, remoteOpts);
                return true;
            }
            if (op.action === "RELOCATE_ENTITY" && op.targetId) {
                this.relocateWorldEntity(op.targetId, op.x, op.y, op.angle, Object.assign({}, remoteOpts, {
                    skipValidation: true,
                    facing: op.facing
                }));
                return true;
            }
            if (op.action === "MODIFY_ENTITY" && op.targetId && op.patch) {
                this.modifyWorldEntity(op.targetId, op.patch, remoteOpts);
                return true;
            }
            if (op.action === "CREATE_MISSION" && op.blueprint) {
                this.createCustomMission(op.blueprint, remoteOpts);
                return true;
            }
            if (op.action === "LAUNCH_MISSION" && op.blueprint) {
                this.launchCustomMission(op.blueprint, remoteOpts);
                return true;
            }
            if (op.action === "COMPLETE_MISSION" && op.id) {
                const mm = this.game && this.game.missions;
                if (mm && mm.activeMission && mm.activeMission.id === op.id) {
                    mm.activeMission = null;
                    if (typeof this.game.showBigBanner === "function") {
                        this.game.showBigBanner(
                            "🏆 MMO ROOM CONTRACT COMPLETED!",
                            `${op.winner || "PLAYER"} COMPLETED ${op.title || op.id} (+$${Number(op.reward || 25000).toLocaleString()})`,
                            "#39ff14",
                            3.0
                        );
                    }
                    if (typeof this.game.updateHud === "function") this.game.updateHud();
                }
                return true;
            }
            if (op.action === "RESTORE_PREEXISTING" && op.targetId) {
                const delRec = this._deletedPreExistingMap ? this._deletedPreExistingMap.get(op.targetId) : null;
                if (delRec) {
                    this.removeCreatedRecord(Object.assign({ type: "DELETE_PREEXISTING" }, delRec));
                    return true;
                }
                return false;
            }
            if (op.action === "REMOVE") {
                const desc = op.targetId ? this._resolveEntityDescriptor(op.targetId) : null;
                if (desc) {
                    this._removeWorldEntityDescriptor(desc, remoteOpts);
                    return true;
                }
                if (typeof op.x === "number" && typeof op.y === "number") {
                    this.removeNearestWorldEntity(op.x, op.y, 48, Boolean(op.isPreExisting), remoteOpts);
                    return true;
                }
                return false;
            }
            if (op.action === "CLEAR_ALL") {
                this.clearAllCreations(remoteOpts);
                return true;
            }
            return false;
        }

        applyAuthoritativeServerCreationSync(ops = []) {
            if (!this.game || !this.game.map || !this.game.map.cmpLoaded) {
                this._pendingAuthoritativeOps = Array.isArray(ops) ? ops.slice() : [];
                return false;
            }
            this._pendingAuthoritativeOps = null;
            this.resetToCleanBaseWorld();
            const sortedOps = (Array.isArray(ops) ? ops.slice() : []).sort((a, b) => ((a && a.ts) || 0) - ((b && b.ts) || 0));
            let applied = 0;
            for (const op of sortedOps) {
                if (this.applyRemoteCreationOp(op, { batch: true })) {
                    applied++;
                }
            }
            this._serverCreationSynced = true;
            this.rebuildWorldMeshes(false);
            this.saveToLocalStorage();
            this.setStatus(`MMO WORLD SYNCED (${applied} AUTHORITATIVE SERVER CREATIONS)`);
            return true;
        }

        /* ====================================================================
           7C. DECLARATIVE WORLD EXPANSION PACK LIBRARY (ZERO MONOLITH BLOAT)
           ==================================================================== */
        getBuiltInExpansionPacks() {
            return {
                OCEAN_DRIVE_NEON_FESTIVAL: {
                    id: "OCEAN_DRIVE_NEON_FESTIVAL",
                    title: "Ocean Drive Neon Block Party & VIP Showcase",
                    district: "OCEAN DRIVE",
                    customVehicles: {
                        OCEAN_FEST_TURBO: {
                            name: "OCEAN FEST TURBO GT",
                            baseSpec: "VICE_CHEETAH",
                            maxSpeed: 515,
                            accel: 335,
                            color: "#00f0ff",
                            stripe: "#ff2a85"
                        }
                    },
                    entities: [
                        { type: "PREFAB_3D", id: "exp_od_tiki", prefabId: "TIKI_BAR_3D", x: 465.5 * TILE_SIZE, y: 274.5 * TILE_SIZE, angle: 0 },
                        { type: "PREFAB_3D", id: "exp_od_volley", prefabId: "VOLLEYBALL_COURT_3D", x: 466.5 * TILE_SIZE, y: 277.5 * TILE_SIZE, angle: 0 },
                        { type: "PREFAB_3D", id: "exp_od_ecola", prefabId: "SODA_ECOLA_3D", x: 448.5 * TILE_SIZE, y: 275.5 * TILE_SIZE, angle: 0 },
                        { type: "PROP_FLORA", id: "exp_od_palm1", kind: "coconut_palm_cluster", x: 449.5 * TILE_SIZE, y: 274.5 * TILE_SIZE, angle: 0.4 },
                        { type: "PROP_FLORA", id: "exp_od_lamp1", kind: "STREETLAMP", x: 448.5 * TILE_SIZE, y: 276.5 * TILE_SIZE, angle: 0 },
                        { type: "VEHICLE", id: "exp_od_hypercar", specKey: "OCEAN_FEST_TURBO", x: 445.5 * TILE_SIZE, y: 275.5 * TILE_SIZE, angle: Math.PI * 0.5 },
                        { type: "INTERIOR", id: "exp_od_lounge", tpl: "SHOP_BAR", name: "NEON MIRAGE ROOFTOP BAR", x: 443.5 * TILE_SIZE, y: 275.5 * TILE_SIZE }
                    ]
                },
                STAR_ISLAND_CARTEL_COMPOUND: {
                    id: "STAR_ISLAND_CARTEL_COMPOUND",
                    title: "Star Island Cartel Waterfront Compound",
                    district: "STAR ISLAND",
                    entities: [
                        { type: "PREFAB_3D", id: "exp_si_crate1", prefabId: "SMUGGLER_CRATE_3D", x: 351.5 * TILE_SIZE, y: 171.5 * TILE_SIZE, angle: 0 },
                        { type: "PREFAB_3D", id: "exp_si_sprunk", prefabId: "SODA_SPRUNK_3D", x: 350.5 * TILE_SIZE, y: 171.5 * TILE_SIZE, angle: 0 },
                        { type: "PROP_FLORA", id: "exp_si_phone", kind: "PAYPHONE", x: 349.5 * TILE_SIZE, y: 171.5 * TILE_SIZE, angle: 0 },
                        { type: "VEHICLE", id: "exp_si_stinger", specKey: "STINGER_CABRIO", x: 348.5 * TILE_SIZE, y: 173.5 * TILE_SIZE, angle: 0 }
                    ]
                },
                VICE_BEACH_SPORTS_PLAZA: {
                    id: "VICE_BEACH_SPORTS_PLAZA",
                    title: "Vice Beach Drift & Boardwalk Sports Plaza",
                    district: "SOUTH BEACH",
                    entities: [
                        { type: "PREFAB_3D", id: "exp_vb_ring", prefabId: "STREET_TAKEOVER_RING", x: 448.5 * TILE_SIZE, y: 234.5 * TILE_SIZE, angle: 0 },
                        { type: "PREFAB_3D", id: "exp_vb_tiki2", prefabId: "TIKI_BAR_3D", x: 465.5 * TILE_SIZE, y: 234.5 * TILE_SIZE, angle: 0 },
                        { type: "PROP_FLORA", id: "exp_vb_hydrant", kind: "HYDRANT", x: 448.5 * TILE_SIZE, y: 232.5 * TILE_SIZE, angle: 0 }
                    ]
                }
            };
        }

        applyExpansionPack(packId, opts = {}) {
            const packs = this.getBuiltInExpansionPacks();
            const keys = Object.keys(packs);
            const resolvedKey = (packId && packs[packId]) ? packId : keys[this.activeExpansionIdx % keys.length];
            const pack = packs[resolvedKey];
            if (!pack) return { ok: false, reason: "PACK_NOT_FOUND" };
            this.activeExpansionIdx = (keys.indexOf(resolvedKey) + 1) % keys.length;
            const res = this.importBlueprintJSON(pack, opts);
            this.setStatus(`DEPLOYED EXPANSION PACK [${pack.title}] (${res.count} ASSETS)`);
            return Object.assign({ packId: resolvedKey, title: pack.title }, res);
        }

        exportBlueprintJSON() {
            const voxelEdits = this._activeVoxelEdits && this._activeVoxelEdits.size > 0
                ? Array.from(this._activeVoxelEdits.values())
                : [];
            const entities = this.createdEntities.map((e) => ({
                type: e.type,
                subtype: e.subtype,
                id: e.id,
                specKey: e.specKey,
                prefabId: e.prefabId,
                kind: e.kind,
                tpl: e.tpl,
                name: e.name,
                c: e.c,
                r: e.r,
                facing: e.facing,
                x: e.x,
                y: e.y,
                angle: e.angle,
                blueprint: e.blueprint
            }));

            const payload = {
                engine: "VC26_CREATION_ENGINE",
                version: this.version,
                timestamp: new Date().toISOString(),
                customVehicles: this.customVehicles,
                customPrefabs: this.customPrefabs,
                customMissions: this.customMissions,
                voxelEdits,
                entities
            };
            return JSON.stringify(payload, null, 2);
        }

        importBlueprintJSON(jsonOrObj, opts = {}) {
            let data = jsonOrObj;
            if (typeof jsonOrObj === "string") {
                try {
                    data = JSON.parse(jsonOrObj);
                } catch (err) {
                    console.error("Invalid VC26 Blueprint JSON:", err);
                    return { ok: false, reason: "INVALID_JSON" };
                }
            }
            if (!data || typeof data !== "object") return { ok: false, reason: "EMPTY_BLUEPRINT" };

            if (opts.clearExisting) {
                this.clearAllCreations();
            }

            let count = 0;
            if (data.customVehicles && typeof data.customVehicles === "object") {
                for (const [k, cfg] of Object.entries(data.customVehicles)) {
                    this.defineVehicle(k, cfg);
                    count++;
                }
            }
            if (data.customPrefabs && typeof data.customPrefabs === "object") {
                for (const [k, cfg] of Object.entries(data.customPrefabs)) {
                    this.definePrefab3D(k, cfg);
                    count++;
                }
            }
            if (Array.isArray(data.voxelEdits)) {
                for (const ve of data.voxelEdits) {
                    this.paintVoxelTile(ve.c, ve.r, ve.presetKey, Object.assign({}, ve.opts, { rebuildMesh: false, skipSave: true }));
                    count++;
                }
            }
            if (Array.isArray(data.entities)) {
                for (const ent of data.entities) {
                    if (ent.type === "VEHICLE") {
                        this.spawnVehicle(ent.specKey, ent.x, ent.y, ent.angle || 0, { id: ent.id, skipSave: true });
                        count++;
                    } else if (ent.type === "PREFAB_3D") {
                        this.placePrefab3D(ent.prefabId, ent.x, ent.y, ent.angle || 0, { id: ent.id, rebuildMesh: false, skipSave: true });
                        count++;
                    } else if (ent.type === "PROP_FLORA") {
                        this.placePropOrFlora(ent.kind, ent.x, ent.y, ent.angle || 0, { id: ent.id, skipSave: true });
                        count++;
                    } else if (ent.type === "INTERIOR") {
                        this.placeEstablishment(ent, { skipSave: true });
                        count++;
                    } else if (ent.type === "MISSION_BLUEPRINT" && ent.blueprint) {
                        this.createCustomMission(ent.blueprint, { skipSave: true });
                        count++;
                    }
                }
            }

            this.rebuildWorldMeshes(false);
            if (!opts.skipSave) this.saveToLocalStorage();
            this.setStatus(`IMPORTED BLUEPRINT (${count} ITEMS APPLIED)`);
            return { ok: true, count };
        }

        saveToLocalStorage() {
            if (typeof localStorage === "undefined") return false;
            try {
                localStorage.setItem(STORAGE_KEY, this.exportBlueprintJSON());
                return true;
            } catch (_e) {
                return false;
            }
        }

        loadFromLocalStorage() {
            if (typeof localStorage === "undefined") return false;
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return false;
                const res = this.importBlueprintJSON(raw, { skipSave: true });
                return Boolean(res && res.ok);
            } catch (_e) {
                return false;
            }
        }

        /* ====================================================================
           7. INTERACTIVE IN-GAME VISUAL STUDIO ([F10] UI, INPUT & 3D GHOST CURSOR)
           ==================================================================== */
        setStatus(msg) {
            this.statusMessage = String(msg || "");
            this.statusTimer = 5.0;
        }

        toggleStudio(force) {
            this.studioActive = typeof force === "boolean" ? force : !this.studioActive;
            if (this.studioActive && this.game) {
                const target = this.game.player.inVehicle || this.game.player;
                this.camX = (this.game.renderer && this.game.renderer.camX) || target.x;
                this.camY = (this.game.renderer && this.game.renderer.camY) || target.y;
                this.setStatus("VC26 CREATION STUDIO ACTIVE — [1..6] TABS • [R] ROTATE • [G] GRID SNAP • [CTRL+Z] UNDO");
            }
            return this.studioActive;
        }

        update(dt) {
            if (this.statusTimer > 0) {
                this.statusTimer = Math.max(0, this.statusTimer - dt);
            }
            if (!this.studioActive || !this.game) return;

            if (this.freeCamActive) {
                const panSpeed = (this.game.input.sprint ? 1150 : 540) * dt;
                if (this.game.input.up) this.camY -= panSpeed;
                if (this.game.input.down) this.camY += panSpeed;
                if (this.game.input.left) this.camX -= panSpeed;
                if (this.game.input.right) this.camX += panSpeed;
                this.camX = Math.max(128, Math.min((MAP_COLS - 2) * TILE_SIZE, this.camX));
                this.camY = Math.max(128, Math.min((MAP_ROWS - 2) * TILE_SIZE, this.camY));
            }
        }

        handleKeyDown(e) {
            const code = e.code;
            if (code === "F10") {
                e.preventDefault();
                this.toggleStudio();
                return true;
            }
            if (!this.studioActive) return false;

            if ((e.ctrlKey || e.metaKey) && code === "KeyZ") {
                e.preventDefault();
                this.undo();
                return true;
            }
            if ((e.ctrlKey || e.metaKey) && code === "KeyY") {
                e.preventDefault();
                this.redo();
                return true;
            }
            if (code === "Digit1" || code === "Digit2" || code === "Digit3" || code === "Digit4" || code === "Digit5" || code === "Digit6") {
                const idx = parseInt(code.replace("Digit", ""), 10) - 1;
                if (idx >= 0 && idx < this.categories.length) {
                    this.activeCategoryIdx = idx;
                    this.setStatus(`CATEGORY: ${this.categoryLabels[this.getActiveCategory()]}`);
                }
                return true;
            }
            if (code === "BracketLeft") {
                const cat = this.getActiveCategory();
                const list = this.getCatalogForCategory(cat);
                if (list.length > 0) {
                    this.selectedItemIdxByCat[cat] = ((this.selectedItemIdxByCat[cat] || 0) - 1 + list.length) % list.length;
                }
                return true;
            }
            if (code === "BracketRight") {
                const cat = this.getActiveCategory();
                const list = this.getCatalogForCategory(cat);
                if (list.length > 0) {
                    this.selectedItemIdxByCat[cat] = ((this.selectedItemIdxByCat[cat] || 0) + 1) % list.length;
                }
                return true;
            }
            if (code === "KeyR") {
                this.placementAngle = (this.placementAngle + Math.PI * 0.25) % (Math.PI * 2);
                this.setStatus(`ROTATION: ${Math.round((this.placementAngle * 180) / Math.PI)}°`);
                return true;
            }
            if (code === "KeyG") {
                this.gridSnap = !this.gridSnap;
                this.setStatus(`64PX TILE GRID SNAP: ${this.gridSnap ? "ON" : "OFF"}`);
                return true;
            }
            if (code === "KeyF") {
                this.freeCamActive = !this.freeCamActive;
                this.setStatus(`STUDIO FREE CAMERA: ${this.freeCamActive ? "ON (WASD PANS CAMERA)" : "FOLLOW PLAYER"}`);
                return true;
            }
            if (code === "KeyE") {
                const cur = this.screenToWorld(this.game.input.mouseX || 0, this.game.input.mouseY || 0, 2.0);
                this.selectWorldEntityAt(cur.x, cur.y, 160, true);
                return true;
            }
            if (code === "KeyC") {
                const cur = this.screenToWorld(this.game.input.mouseX || 0, this.game.input.mouseY || 0, 2.0);
                this.cloneWorldEntityToPalette(cur.x, cur.y, 160);
                return true;
            }
            if (code === "KeyM") {
                const cur = this.screenToWorld(this.game.input.mouseX || 0, this.game.input.mouseY || 0, 2.0);
                if (this.grabbedEntity) {
                    this.relocateWorldEntity(this.grabbedEntity, cur.x, cur.y, this.placementAngle);
                    this.grabbedEntity = null;
                } else {
                    const hit = this.findNearestWorldEntity(cur.x, cur.y, 160, true);
                    if (hit) {
                        this.grabbedEntity = hit;
                        this.selectedEntity = hit;
                        this.placementAngle = hit.angle || 0;
                        this.setStatus(`GRABBED [${hit.label}] — CLICK OR PRESS [M] AT DESTINATION ([R] TO ROTATE)`);
                    } else {
                        this.setStatus("NO WORLD ENTITY UNDER CURSOR TO MOVE");
                    }
                }
                return true;
            }
            if (code === "Delete" || code === "Backspace") {
                const cur = this.screenToWorld(this.game.input.mouseX || 0, this.game.input.mouseY || 0, 2.0);
                this.removeNearestWorldEntity(cur.x, cur.y, 140, true);
                return true;
            }
            if (code === "KeyX") {
                const json = this.exportBlueprintJSON();
                if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(json).catch(() => {});
                }
                this.setStatus(`EXPORTED BLUEPRINT JSON (${this.createdEntities.length} ENTITIES, ${this.undoStack.length} ACTIONS)`);
                return true;
            }
            return false;
        }

        _cycleEntityPaletteTheme(desc) {
            if (!desc || !desc.entityRef) return;
            const themes = [
                { name: "FLAMINGO NEON", wall: [0.98, 0.90, 0.95], trim: [1.0, 0.16, 0.52], hex: "#ff2a85", stripe: "#00f0ff", shopTpl: "SHOP_BAR" },
                { name: "OCEAN CYAN",    wall: [0.90, 0.98, 1.00], trim: [0.0, 0.94, 1.00], hex: "#00f0ff", stripe: "#fde047", shopTpl: "SHOP_HOTEL" },
                { name: "STAR GOLD",     wall: [0.99, 0.97, 0.88], trim: [0.98, 0.78, 0.15], hex: "#fde047", stripe: "#0f172a", shopTpl: "SHOP_RESTAURANT" },
                { name: "EMERALD PALM",  wall: [0.92, 0.99, 0.94], trim: [0.22, 0.98, 0.45], hex: "#39ff14", stripe: "#ffffff", shopTpl: "SHOP_CONVENIENCE" },
                { name: "ULTRAVIOLET",   wall: [0.95, 0.91, 1.00], trim: [0.68, 0.32, 0.98], hex: "#a855f7", stripe: "#38bdf8", shopTpl: "SHOP_CLOTHES" }
            ];
            this._paletteThemeIdx = ((this._paletteThemeIdx || 0) + 1) % themes.length;
            const t = themes[this._paletteThemeIdx];
            if (desc.subtype === "ESTATE") {
                this.modifyWorldEntity(desc, {
                    wallColor: t.wall,
                    trimColor: t.trim,
                    roofRidgeColor: t.trim,
                    mapRoofColor: t.hex
                });
            } else if (desc.type === "VEHICLE") {
                this.modifyWorldEntity(desc, {
                    color: t.hex,
                    stripe: t.stripe
                });
            } else if (desc.type === "INTERIOR") {
                this.modifyWorldEntity(desc, {
                    theme: t.shopTpl,
                    accent: t.hex
                });
            }
        }

        handleMouseDown(screenX, screenY, button = 0) {
            if (!this.studioActive) return false;

            // Check Studio HUD Panel buttons first (Left Dock & Right Inspector Dock)
            for (const b of this.studioButtons) {
                if (screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h) {
                    if (b.id === "STUDIO_CLOSE") {
                        this.toggleStudio(false);
                    } else if (b.id === "STUDIO_CAT" && typeof b.catIdx === "number") {
                        this.activeCategoryIdx = b.catIdx;
                    } else if (b.id === "STUDIO_ITEM" && typeof b.itemIdx === "number") {
                        this.selectedItemIdxByCat[this.getActiveCategory()] = b.itemIdx;
                    } else if (b.id === "STUDIO_SCROLL_UP") {
                        const cat = this.getActiveCategory();
                        this.paletteScrollByCat[cat] = Math.max(0, (this.paletteScrollByCat[cat] || 0) - 5);
                    } else if (b.id === "STUDIO_SCROLL_DOWN") {
                        const cat = this.getActiveCategory();
                        const list = this.getCatalogForCategory(cat);
                        this.paletteScrollByCat[cat] = Math.min(Math.max(0, list.length - 8), (this.paletteScrollByCat[cat] || 0) + 5);
                    } else if (b.id === "STUDIO_UNDO") {
                        this.undo();
                    } else if (b.id === "STUDIO_REDO") {
                        this.redo();
                    } else if (b.id === "STUDIO_ROTATE") {
                        this.placementAngle = (this.placementAngle + Math.PI * 0.25) % (Math.PI * 2);
                    } else if (b.id === "STUDIO_GRID") {
                        this.gridSnap = !this.gridSnap;
                    } else if (b.id === "STUDIO_FREECAM") {
                        this.freeCamActive = !this.freeCamActive;
                    } else if (b.id === "STUDIO_EXPORT") {
                        const json = this.exportBlueprintJSON();
                        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(json).catch(() => {});
                        }
                        this.setStatus("BLUEPRINT JSON COPIED TO CLIPBOARD!");
                    } else if (b.id === "STUDIO_EXPANSION") {
                        this.applyExpansionPack();
                    } else if (b.id === "STUDIO_CLEAR") {
                        this.clearAllCreations();
                    } else if (b.id === "INSP_CLOSE") {
                        this.selectedEntity = null;
                    } else if (b.id === "INSP_ROT_CCW" && this.selectedEntity) {
                        const curA = this.selectedEntity.entityRef.ang !== undefined ? this.selectedEntity.entityRef.ang : (this.selectedEntity.entityRef.angle || 0);
                        this.modifyWorldEntity(this.selectedEntity, { angle: curA - Math.PI * 0.25 });
                    } else if (b.id === "INSP_ROT_CW" && this.selectedEntity) {
                        const curA = this.selectedEntity.entityRef.ang !== undefined ? this.selectedEntity.entityRef.ang : (this.selectedEntity.entityRef.angle || 0);
                        this.modifyWorldEntity(this.selectedEntity, { angle: curA + Math.PI * 0.25 });
                    } else if (b.id === "INSP_SCALE_DOWN" && this.selectedEntity) {
                        const ent = this.selectedEntity.entityRef;
                        if (this.selectedEntity.type === "INTERIOR") {
                            const dirs = ["S", "W", "N", "E"];
                            const nextF = dirs[(dirs.indexOf(ent.facing || "S") + 1) % 4];
                            this.modifyWorldEntity(this.selectedEntity, { facing: nextF });
                        } else if (this.selectedEntity.type === "VEHICLE") {
                            this.modifyWorldEntity(this.selectedEntity, { hp: 250 });
                        } else {
                            this.modifyWorldEntity(this.selectedEntity, { scale: Math.max(0.6, (ent.scale || 1.0) - 0.15) });
                        }
                    } else if (b.id === "INSP_SCALE_UP" && this.selectedEntity) {
                        const ent = this.selectedEntity.entityRef;
                        if (this.selectedEntity.type === "INTERIOR") {
                            if (typeof this.game.enterInterior === "function") {
                                this.toggleStudio(false);
                                this.game.enterInterior(ent);
                            }
                        } else if (this.selectedEntity.type === "VEHICLE") {
                            this.modifyWorldEntity(this.selectedEntity, {
                                maxSpeed: Math.round((ent.maxSpeed || 400) * 1.25),
                                accel: Math.round((ent.accel || 260) * 1.25)
                            });
                        } else {
                            this.modifyWorldEntity(this.selectedEntity, { scale: Math.min(1.85, (ent.scale || 1.0) + 0.15) });
                        }
                    } else if (b.id === "INSP_THEME" && this.selectedEntity) {
                        this._cycleEntityPaletteTheme(this.selectedEntity);
                    } else if (b.id === "INSP_CLONE" && this.selectedEntity) {
                        this.cloneWorldEntityToPalette(this.selectedEntity.x, this.selectedEntity.y, 64);
                    } else if (b.id === "INSP_MOVE" && this.selectedEntity) {
                        this.grabbedEntity = this.selectedEntity;
                        this.setStatus(`GRABBED [${this.selectedEntity.label}] — CLICK DESTINATION IN WORLD`);
                    } else if (b.id === "INSP_DELETE" && this.selectedEntity) {
                        this.removeNearestWorldEntity(this.selectedEntity.x, this.selectedEntity.y, 48, true);
                    }
                    return true;
                }
            }

            // Avoid placing in world if clicking inside left dock or right inspector dock
            if (screenX <= 292 && screenY >= 56 && screenY <= 585) {
                return true;
            }
            const W = (this.game && this.game.renderer && this.game.renderer.canvas) ? this.game.renderer.canvas.width : 1280;
            if (this.selectedEntity && screenX >= W - 266 && screenY >= 68 && screenY <= 360) {
                return true;
            }

            const cur = this.screenToWorld(screenX, screenY, 2.0);
            if (button === 1) {
                this.selectWorldEntityAt(cur.x, cur.y, 160, true);
                return true;
            }
            if (button === 2) {
                this.removeNearestWorldEntity(cur.x, cur.y, 140, true);
                return true;
            }

            if (this.grabbedEntity) {
                this.relocateWorldEntity(this.grabbedEntity, cur.x, cur.y, this.placementAngle);
                this.grabbedEntity = null;
                return true;
            }

            this.placeSelectedItemAt(cur.x, cur.y, this.placementAngle);
            return true;
        }

        placeSelectedItemAt(x, y, angle = 0) {
            const cat = this.getActiveCategory();
            const item = this.getSelectedItem();
            if (!item) return null;

            if (cat === "TERRAIN") {
                const c = Math.floor(x / TILE_SIZE);
                const r = Math.floor(y / TILE_SIZE);
                return this.paintVoxelTile(c, r, item.key, { storeys: item.storeys, style: item.style });
            }
            if (cat === "VEHICLES") {
                return this.spawnVehicle(item.key, x, y, angle);
            }
            if (cat === "PREFABS_3D") {
                return this.placePrefab3D(item.key, x, y, angle);
            }
            if (cat === "PROPS_FLORA") {
                return this.placePropOrFlora(item.key, x, y, angle);
            }
            if (cat === "INTERIORS") {
                return this.placeEstablishment({ tpl: item.key, x, y });
            }
            if (cat === "MISSIONS") {
                return this.launchCustomMission({ type: item.key, startX: x, startY: y });
            }
            return null;
        }

        renderStudioOverlay(ctx, renderer) {
            if (!ctx || !renderer) return;
            this.studioButtons = [];

            const W = renderer.canvas.width;
            const H = renderer.canvas.height;

            // Always render a subtle top-right [🛠️ F10 STUDIO] badge when closed so user can click it or press F10
            if (!this.studioActive) {
                return;
            }

            ctx.save();
            const cat = this.getActiveCategory();
            const item = this.getSelectedItem();
            const mx = this.game.input.mouseX || W * 0.5;
            const my = this.game.input.mouseY || H * 0.5;
            const cur = this.screenToWorld(mx, my, 2.0);
            const safety = item
                ? this.validatePlacement(cat, item.key, cur.x, cur.y, this.placementAngle)
                : { ok: true, reason: "READY", snappedX: cur.x, snappedY: cur.y, snappedAngle: this.placementAngle };

            // 1. 3D World Ghost Wireframe Preview at Cursor / Snapped Spot
            const gx = safety.snappedX !== undefined ? safety.snappedX : cur.x;
            const gy = safety.snappedY !== undefined ? safety.snappedY : cur.y;
            const gAng = safety.snappedAngle !== undefined ? safety.snappedAngle : this.placementAngle;
            const sc = renderer.worldToScreen(gx, gy, 2.05);

            const col = !safety.ok ? "#ef4444" : (safety.autoSnapped ? "#00f0ff" : "#39ff14");
            const boxW = (item && item.footprintW) ? item.footprintW : (cat === "TERRAIN" ? 64 : (cat === "VEHICLES" ? 54 : 38));
            const boxH = (item && item.footprintH) ? item.footprintH : (cat === "TERRAIN" ? 64 : (cat === "VEHICLES" ? 26 : 38));
            const hw = boxW * 0.5;
            const hh = boxH * 0.5;
            const ca = Math.cos(gAng);
            const sa = Math.sin(gAng);
            const corners = [
                { x: gx + (-hw * ca - -hh * sa), y: gy + (-hw * sa + -hh * ca) },
                { x: gx + ( hw * ca - -hh * sa), y: gy + ( hw * sa + -hh * ca) },
                { x: gx + ( hw * ca -  hh * sa), y: gy + ( hw * sa +  hh * ca) },
                { x: gx + (-hw * ca -  hh * sa), y: gy + (-hw * sa +  hh * ca) }
            ];

            ctx.strokeStyle = col;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const p = renderer.worldToScreen(corners[i].x, corners[i].y, 2.04);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            ctx.fillStyle = !safety.ok ? "rgba(239, 68, 68, 0.22)" : (safety.autoSnapped ? "rgba(0, 240, 255, 0.20)" : "rgba(57, 255, 20, 0.20)");
            ctx.fill();
            ctx.stroke();

            // Heading arrow on ghost box
            const tip = renderer.worldToScreen(gx + ca * (hw + 14), gy + sa * (hw + 14), 2.05);
            ctx.beginPath();
            ctx.moveTo(sc.x, sc.y);
            ctx.lineTo(tip.x, tip.y);
            ctx.stroke();

            // Cursor floating coordinates + safety oracle pill
            const badgeTxt = this.grabbedEntity
                ? `✋ MOVING: ${this.grabbedEntity.label} • (${cur.c}, ${cur.r}) • CLICK TO DROP`
                : `${item ? item.icon + " " + item.label : ""} • (${cur.c}, ${cur.r}) • ${safety.reason}`;
            ctx.font = "bold 10px Consolas, 'Courier New', monospace";
            const bw = Math.max(180, ctx.measureText(badgeTxt).width + 18);
            const bx = Math.round(sc.x - bw * 0.5);
            const by = Math.round(sc.y - 38);
            ctx.fillStyle = "rgba(8, 12, 24, 0.92)";
            ctx.fillRect(bx, by, bw, 20);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 19);
            ctx.fillStyle = col;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(badgeTxt, sc.x, by + 10);

            // 1B. Live Pre-Existing / Custom World Entity Inspector Highlight Under Cursor
            const hovered = this.findNearestWorldEntity(cur.x, cur.y, 96, true);
            if (hovered && !this.grabbedEntity) {
                const hScr = renderer.worldToScreen(hovered.x, hovered.y, 2.08);
                const hTag = hovered.isPreExisting ? "PRE-EXISTING" : "CUSTOM";
                const hTxt = `🔎 [${hTag}] ${hovered.label} • [C] CLONE • [M] MOVE • [DEL] DELETE`;
                const hW = Math.max(220, ctx.measureText(hTxt).width + 18);
                const hX = Math.round(hScr.x - hW * 0.5);
                const hY = Math.round(hScr.y + 18);
                ctx.strokeStyle = "#fde047";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(hScr.x, hScr.y, 16, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
                ctx.fillRect(hX, hY, hW, 19);
                ctx.strokeRect(hX + 0.5, hY + 0.5, hW - 1, 18);
                ctx.fillStyle = "#fde047";
                ctx.fillText(hTxt, hScr.x, hY + 9.5);
            }

            // 2. Left Dock Studio Panel
            const px = 12;
            const py = 68;
            const pw = 274;
            const ph = Math.min(510, H - 84);

            ctx.fillStyle = "rgba(9, 14, 28, 0.95)";
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

            // Header bar
            ctx.fillStyle = "#1e1b4b";
            ctx.fillRect(px + 2, py + 2, pw - 4, 26);
            ctx.fillStyle = "#fde047";
            ctx.textAlign = "left";
            ctx.font = "bold 11px Consolas, 'Courier New', monospace";
            ctx.fillText("🛠️ VC26 CREATION ENGINE [F10]", px + 8, py + 15);

            const closeX = px + pw - 26;
            ctx.fillStyle = "#7f1d1d";
            ctx.fillRect(closeX, py + 5, 20, 19);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText("✖", closeX + 10, py + 14.5);
            this.studioButtons.push({ id: "STUDIO_CLOSE", x: closeX, y: py + 5, w: 20, h: 19 });

            // Category Tabs (2x3 grid)
            const tabW = Math.floor((pw - 16) / 2);
            const tabH = 22;
            for (let i = 0; i < this.categories.length; i++) {
                const colIdx = i % 2;
                const rowIdx = Math.floor(i / 2);
                const tx = px + 6 + colIdx * (tabW + 4);
                const ty = py + 33 + rowIdx * (tabH + 3);
                const active = i === this.activeCategoryIdx;
                ctx.fillStyle = active ? "#be185d" : "#1e293b";
                ctx.fillRect(tx, ty, tabW, tabH);
                ctx.strokeStyle = active ? "#ff2a85" : "#475569";
                ctx.lineWidth = 1.2;
                ctx.strokeRect(tx + 0.5, ty + 0.5, tabW - 1, tabH - 1);
                ctx.fillStyle = active ? "#ffffff" : "#cbd5e1";
                ctx.font = "bold 8.8px Consolas, 'Courier New', monospace";
                ctx.textAlign = "left";
                ctx.fillText(this.categoryLabels[this.categories[i]], tx + 5, ty + 11);
                this.studioButtons.push({ id: "STUDIO_CAT", catIdx: i, x: tx, y: ty, w: tabW, h: tabH });
            }

            // Item Palette List (8 visible rows + scroll buttons)
            const list = this.getCatalogForCategory(cat);
            const selIdx = this.selectedItemIdxByCat[cat] || 0;
            const scroll = Math.max(0, Math.min(Math.max(0, list.length - 8), this.paletteScrollByCat[cat] || 0));
            const listY0 = py + 112;
            const rowH = 25;

            for (let row = 0; row < 8; row++) {
                const idx = scroll + row;
                if (idx >= list.length) break;
                const it = list[idx];
                const ry = listY0 + row * (rowH + 3);
                const isSel = idx === selIdx;
                ctx.fillStyle = isSel ? "#065f46" : "#0f172a";
                ctx.fillRect(px + 6, ry, pw - 38, rowH);
                ctx.strokeStyle = isSel ? "#39ff14" : "#334155";
                ctx.lineWidth = isSel ? 1.6 : 1;
                ctx.strokeRect(px + 6.5, ry + 0.5, pw - 39, rowH - 1);
                ctx.fillStyle = isSel ? "#fde047" : "#f8fafc";
                ctx.font = "bold 9.5px Consolas, 'Courier New', monospace";
                ctx.textAlign = "left";
                ctx.fillText(`${it.icon} ${it.label}`.slice(0, 29), px + 11, ry + rowH * 0.5);
                this.studioButtons.push({ id: "STUDIO_ITEM", itemIdx: idx, x: px + 6, y: ry, w: pw - 38, h: rowH });
            }

            // Scroll Up / Down buttons on right edge of palette list
            const sbX = px + pw - 28;
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(sbX, listY0, 22, 108);
            ctx.strokeStyle = "#38bdf8";
            ctx.strokeRect(sbX + 0.5, listY0 + 0.5, 21, 107);
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText("▲", sbX + 11, listY0 + 54);
            this.studioButtons.push({ id: "STUDIO_SCROLL_UP", x: sbX, y: listY0, w: 22, h: 108 });

            ctx.fillStyle = "#1e293b";
            ctx.fillRect(sbX, listY0 + 113, 22, 108);
            ctx.strokeStyle = "#38bdf8";
            ctx.strokeRect(sbX + 0.5, listY0 + 113.5, 21, 107);
            ctx.fillStyle = "#ffffff";
            ctx.fillText("▼", sbX + 11, listY0 + 167);
            this.studioButtons.push({ id: "STUDIO_SCROLL_DOWN", x: sbX, y: listY0 + 113, w: 22, h: 108 });

            // Bottom Action Toolbar Buttons (UNDO | REDO | ROTATE [R] | GRID [G] | CAM [F] | EXPORT [X] | CLEAR)
            const actY = listY0 + 8 * (rowH + 3) + 8;
            const drawActBtn = (id, label, bx, by, bw, bh, fill, border) => {
                ctx.fillStyle = fill;
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = border;
                ctx.lineWidth = 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 8.8px Consolas, 'Courier New', monospace";
                ctx.textAlign = "center";
                ctx.fillText(label, bx + bw * 0.5, by + bh * 0.5);
                this.studioButtons.push({ id, x: bx, y: by, w: bw, h: bh });
            };

            const b3W = Math.floor((pw - 18) / 3);
            drawActBtn("STUDIO_UNDO", `↶ UNDO (${this.undoStack.length})`, px + 6, actY, b3W, 24, "#1e293b", "#38bdf8");
            drawActBtn("STUDIO_REDO", `↷ REDO (${this.redoStack.length})`, px + 9 + b3W, actY, b3W, 24, "#1e293b", "#38bdf8");
            drawActBtn("STUDIO_ROTATE", `⟳ ROT ${Math.round((this.placementAngle * 180) / Math.PI)}° [R]`, px + 12 + b3W * 2, actY, b3W, 24, "#31102f", "#ff2a85");

            const actY2 = actY + 28;
            drawActBtn("STUDIO_GRID", `GRID: ${this.gridSnap ? "ON" : "OFF"} [G]`, px + 6, actY2, b3W, 24, this.gridSnap ? "#065f46" : "#1e293b", "#39ff14");
            drawActBtn("STUDIO_FREECAM", `CAM: ${this.freeCamActive ? "FREE" : "PLAY"} [F]`, px + 9 + b3W, actY2, b3W, 24, this.freeCamActive ? "#0369a1" : "#1e293b", "#00f0ff");
            drawActBtn("STUDIO_EXPORT", "📋 JSON [X]", px + 12 + b3W * 2, actY2, b3W, 24, "#3b0764", "#fde047");

            const actY3 = actY2 + 28;
            const b2W = Math.floor((pw - 16) / 2);
            drawActBtn("STUDIO_EXPANSION", "📦 EXPANSION PACK", px + 6, actY3, b2W, 22, "#065f46", "#39ff14");
            drawActBtn("STUDIO_CLEAR", `🗑️ CLEAR (${this.createdEntities.length})`, px + 10 + b2W, actY3, b2W, 22, "#450a0a", "#ef4444");

            // 3. Right-Side Live Parametric Entity Inspector Dock (when an entity is selected via [E] or Middle-Click)
            if (this.selectedEntity && this.selectedEntity.entityRef) {
                const sel = this.selectedEntity;
                const ent = sel.entityRef;
                const rx = W - 264;
                const ry = 68;
                const rw = 252;
                const rh = 276;

                ctx.fillStyle = "rgba(9, 14, 28, 0.95)";
                ctx.fillRect(rx, ry, rw, rh);
                ctx.strokeStyle = "#ff2a85";
                ctx.lineWidth = 2;
                ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);

                ctx.fillStyle = "#31102f";
                ctx.fillRect(rx + 2, ry + 2, rw - 4, 24);
                ctx.fillStyle = "#fde047";
                ctx.textAlign = "left";
                ctx.font = "bold 10.5px Consolas, 'Courier New', monospace";
                ctx.fillText("🔎 PARAMETRIC INSPECTOR [E]", rx + 8, ry + 14);
                drawActBtn("INSP_CLOSE", "✖", rx + rw - 24, ry + 4, 19, 18, "#7f1d1d", "#ef4444");

                ctx.fillStyle = "#38bdf8";
                ctx.textAlign = "left";
                ctx.font = "bold 9.5px Consolas, 'Courier New', monospace";
                ctx.fillText(`${sel.isPreExisting ? "[PRE-EXISTING]" : "[CUSTOM]"} ${sel.type}`, rx + 10, ry + 38);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(String(sel.label || sel.id).slice(0, 30), rx + 10, ry + 54);
                const ex = Math.round(sel.type === "INTERIOR" ? (ent.doorX || 0) : (ent.x || 0));
                const ey = Math.round(sel.type === "INTERIOR" ? (ent.doorY || 0) : (ent.y || 0));
                const ea = Math.round((((ent.ang !== undefined ? ent.ang : (ent.angle || 0)) * 180) / Math.PI) % 360);
                ctx.fillStyle = "#cbd5e1";
                ctx.fillText(`POS: (${ex}, ${ey}) • ROT: ${ea}°`, rx + 10, ry + 70);
                const metaLine = sel.type === "INTERIOR"
                    ? `FACING: ${ent.facing || "S"} • THEME: ${ent.theme || "SHOP"}`
                    : (sel.type === "VEHICLE"
                        ? `SPD: ${ent.maxSpeed || 400} • HP: ${Math.round(ent.hp || 100)}`
                        : `SCALE: ${(ent.scale || 1.0).toFixed(2)}x • ID: ${String(sel.id).slice(0, 12)}`);
                ctx.fillText(metaLine.slice(0, 32), rx + 10, ry + 86);

                const ibW = Math.floor((rw - 20) / 2);
                drawActBtn("INSP_ROT_CCW", "⟲ ROT -45°", rx + 8, ry + 102, ibW, 24, "#1e293b", "#38bdf8");
                drawActBtn("INSP_ROT_CW", "⟳ ROT +45°", rx + 12 + ibW, ry + 102, ibW, 24, "#1e293b", "#38bdf8");

                const leftLbl = sel.type === "INTERIOR" ? "🔄 FACING" : (sel.type === "VEHICLE" ? "🔧 REPAIR 100%" : "➖ SCALE -15%");
                const rightLbl = sel.type === "INTERIOR" ? "🚪 ENTER 3D" : (sel.type === "VEHICLE" ? "⚡ +25% TURBO" : "➕ SCALE +15%");
                drawActBtn("INSP_SCALE_DOWN", leftLbl, rx + 8, ry + 132, ibW, 24, "#1e293b", "#39ff14");
                drawActBtn("INSP_SCALE_UP", rightLbl, rx + 12 + ibW, ry + 132, ibW, 24, "#065f46", "#39ff14");

                drawActBtn("INSP_THEME", "🎨 CYCLE MIAMI VICE PALETTE", rx + 8, ry + 162, rw - 16, 24, "#3b0764", "#ff2a85");

                drawActBtn("INSP_CLONE", "📋 CLONE [C]", rx + 8, ry + 192, ibW, 24, "#1e293b", "#fde047");
                drawActBtn("INSP_MOVE", "✋ MOVE [M]", rx + 12 + ibW, ry + 192, ibW, 24, "#0369a1", "#00f0ff");

                drawActBtn("INSP_DELETE", "🗑️ DELETE ENTITY [DEL]", rx + 8, ry + 222, rw - 16, 24, "#450a0a", "#ef4444");
            }

            // Bottom status bar banner
            const stW = Math.min(760, W - 320);
            const stX = Math.max(296, Math.round((W - stW) * 0.5));
            const stY = H - 36;
            ctx.fillStyle = "rgba(8, 13, 26, 0.92)";
            ctx.fillRect(stX, stY, stW, 24);
            ctx.strokeStyle = "#fde047";
            ctx.lineWidth = 1.4;
            ctx.strokeRect(stX + 0.5, stY + 0.5, stW - 1, 23);
            ctx.fillStyle = "#fde047";
            ctx.font = "bold 10px Consolas, 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText(this.statusMessage.slice(0, 96), stX + stW * 0.5, stY + 12);

            ctx.restore();
        }
    }

    window.ViceCreationEngine = ViceCreationEngine;
})();
