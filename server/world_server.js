#!/usr/bin/env node
/**
 * ============================================================================
 * VICE CITY 26 — PERSISTENT DEDICATED WORLD SERVER v2 (Hostinger KVM2)
 * True 24/7 World & Player Persistence:
 * - Permanent Modified/Parked/Damaged/Destroyed Vehicles (`modifiedVehs`)
 *   that are NEVER overwritten by a fresh client's default map reset!
 * - Permanent Smashed Street Props (`smashedProps`: streetlamps, traffic lights,
 *   bollards, hydrants, payphones, benches)
 * - Full Player Profile Persistence by Nickname (`profiles`: x, y, z, angle,
 *   cash, hp, armor, weapon, weaponsOwned, ammo, kills, inVehId)
 * - All-Time Best Scores Leaderboard & Room Chat History
 * ============================================================================
 */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Load the authentic 512x512x6 3D LeonidaMap engine directly on the Dedicated Server
// so the server simulates real road lanes, traffic lights, bridges, municipal stations, and sidewalks 24/7!
global.window = global;
require("../js/object_engine.js");
require("../js/map.js");
require("../js/world_director.js");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "world_state.json");
const MAP_BIN_FILE = path.join(__dirname, "..", "assets", "gta1", "gta1_map.bin");
const MAP_META_FILE = path.join(__dirname, "..", "assets", "gta1", "gta1_meta.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ROOM_CODES = ["VICE26", "VICE97", "MIAMI86", "KEYS305"];
const ECON_VERSION = 2;
const MIN_CLIENT_VER = 101181;
const FLASH_DISTRICTS = [
    { index: 0, key: "OCEAN_DRIVE", label: "OCEAN DRIVE NEON STRIP", x: Math.round(445.5 * 64), y: Math.round(279.0 * 64), color: "#ff2a85" },
    { index: 1, key: "STAR_ISLAND", label: "STAR ISLAND PALAZZO", x: Math.round(348.5 * 64), y: Math.round(173.5 * 64), color: "#c084fc" },
    { index: 2, key: "DOWNTOWN", label: "DOWNTOWN & LITTLE CUBA", x: Math.round(288.5 * 64), y: Math.round(202.5 * 64), color: "#38bdf8" },
    { index: 3, key: "WYNWOOD_HAITI", label: "WYNWOOD & MAMBAS STADIUM", x: Math.round(215.5 * 64), y: Math.round(148.5 * 64), color: "#39ff14" }
];
function createFlashDistrictState(idx = 0) {
    const d = FLASH_DISTRICTS[((idx % FLASH_DISTRICTS.length) + FLASH_DISTRICTS.length) % FLASH_DISTRICTS.length];
    return {
        index: d.index,
        key: d.key,
        label: d.label,
        x: d.x,
        y: d.y,
        color: d.color,
        duration: 180,
        startedAt: Date.now(),
        flamingoScore: 0,
        cyanScore: 0
    };
}
const CURRENT_BUILD = (() => {
    try {
        const idxFile = path.join(__dirname, "..", "index.html");
        if (fs.existsSync(idxFile)) {
            const m = fs.readFileSync(idxFile, "utf8").match(/__VC26_BUILD\s*=\s*"([^"]+)"/);
            if (m && m[1]) return m[1];
        }
    } catch (_e) {}
    return "101_220";
})();

const serverMap = new global.LeonidaMap();
let serverMapMeta = null;
const roadSpawnTiles = [];
const hotspotRoadTiles = [];
const sidewalkSpawnTiles = [];
let autonomousSimTickCount = 0;

function initServerMapAndRoadTopology() {
    try {
        if (fs.existsSync(MAP_META_FILE)) {
            serverMapMeta = JSON.parse(fs.readFileSync(MAP_META_FILE, "utf8"));
        }
        if (fs.existsSync(MAP_BIN_FILE)) {
            const binBuf = fs.readFileSync(MAP_BIN_FILE);
            const ab = binBuf.buffer.slice(binBuf.byteOffset, binBuf.byteOffset + binBuf.byteLength);
            serverMap.loadCmpBinary(ab, serverMapMeta ? serverMapMeta.districts : null);
        }
        if (serverMap.cmpLoaded) {
            for (let by = 6; by < global.MAP_ROWS - 6; by += 2) {
                for (let bx = 6; bx < global.MAP_COLS - 6; bx += 2) {
                    if (serverMap.isRestrictedNoTrafficZone && serverMap.isRestrictedNoTrafficZone(bx, by)) continue;
                    const z = serverMap.getHeightAtPixel((bx + 0.5) * global.TILE_SIZE, (by + 0.5) * global.TILE_SIZE, 4.0);
                    const nav = serverMap.getNavigationBlock(bx, by, z);
                    if (!nav) continue;
                    const isHotspot =
                        (bx >= 400 && bx <= 452 && by >= 40 && by <= 365) || // Ocean Drive, Collins Ave, Española Way, South Beach
                        (bx >= 325 && bx <= 405 && by >= 118 && by <= 220) || // Star Island & Venetian Isles
                        (bx >= 255 && bx <= 345 && by >= 105 && by <= 295) || // Downtown & Little Cuba
                        (bx >= 165 && bx <= 265 && by >= 95 && by <= 210);    // Wynwood & Mambas Stadium
                    if (nav.groundType === global.GROUND_TYPE.ROAD && !nav.isRailway && !nav.isParkingBay) {
                        const lidZ1 = serverMap.getBlockInfo ? serverMap.getBlockInfo(bx, by, 1).lid : 0;
                        const bits = (nav.up ? 1 : 0) + (nav.down ? 1 : 0) + (nav.left ? 1 : 0) + (nav.right ? 1 : 0);
                        if (bits === 1 && lidZ1 !== 25) {
                            const dirs = serverMap.getAllowedRoadDirections(bx, by, z);
                            if (dirs.length > 0) {
                                const entry = { bx, by, z, angle: dirs[0].angle, isHotspot };
                                roadSpawnTiles.push(entry);
                                if (isHotspot) hotspotRoadTiles.push(entry);
                            }
                        }
                    } else if (nav.groundType === global.GROUND_TYPE.PAWEMENT && isHotspot) {
                        const lidZ1 = serverMap.getBlockInfo ? serverMap.getBlockInfo(bx, by, 1).lid : 0;
                        if (lidZ1 !== 69 && !(bx >= 449 && bx <= 464 && lidZ1 === 10)) {
                            sidewalkSpawnTiles.push({ bx, by, z });
                        }
                    }
                }
            }
            console.log(`[WORLD-SIM] Loaded 512x512x6 LeonidaMap: roadTiles=${roadSpawnTiles.length} (hotspots=${hotspotRoadTiles.length}), sidewalkTiles=${sidewalkSpawnTiles.length}`);
        }
    } catch (err) {
        console.warn("[WORLD-SIM] Failed to load server map binary:", err.message);
    }
}
initServerMapAndRoadTopology();

const serverBaseVoxelSnapshots = new Map();
let serverVoxelTplBlocks = null;

function ensureServerVoxelTemplates() {
    if (serverVoxelTplBlocks || !serverMap || !serverMap.cmpLoaded || !Array.isArray(serverMap.blocksData)) return serverVoxelTplBlocks;
    const GT = global.GROUND_TYPE || { AIR: 0, WATER: 1, ROAD: 2, PAWEMENT: 3, FIELD: 4, BUILDING: 5 };
    const findOrAdd = (spec) => {
        for (let i = 1; i < serverMap.blocksData.length; i++) {
            const b = serverMap.blocksData[i];
            if (b && b.groundType === spec.groundType && (b.slopeType || 0) === 0 && Boolean(b.isFlat) === Boolean(spec.isFlat) &&
                b.faces[0] === spec.faces[0] && b.faces[1] === spec.faces[1] && b.faces[2] === spec.faces[2] && b.faces[3] === spec.faces[3] && b.faces[4] === spec.faces[4]) {
                return i;
            }
        }
        const idx = serverMap.blocksData.length;
        serverMap.blocksData.push({
            w: spec.faces[0], e: spec.faces[1], n: spec.faces[2], s: spec.faces[3], lid: spec.faces[4],
            faces: spec.faces.slice(), arrows: spec.arrows || 0, groundType: spec.groundType,
            slopeType: 0, lidRotation: 0, isFlat: Boolean(spec.isFlat), remap: 0, flipLR: false, flipTB: false
        });
        return idx;
    };
    serverVoxelTplBlocks = {
        roadNS_z1: findOrAdd({ faces: [0, 0, 0, 0, 74], groundType: GT.ROAD, arrows: 3 }),
        roadEW_z1: findOrAdd({ faces: [0, 0, 0, 0, 81], groundType: GT.ROAD, arrows: 12 }),
        roadCross_z1: findOrAdd({ faces: [0, 0, 0, 0, 25], groundType: GT.ROAD, arrows: 15 }),
        roadNav_z2: findOrAdd({ faces: [0, 0, 0, 0, 0], groundType: GT.ROAD, arrows: 15 }),
        pave_z1: findOrAdd({ faces: [8, 8, 8, 8, 8], groundType: GT.PAWEMENT }),
        boardwalk_z1: findOrAdd({ faces: [8, 8, 8, 8, 77], groundType: GT.PAWEMENT }),
        sand_z1: findOrAdd({ faces: [8, 8, 8, 8, 98], groundType: GT.PAWEMENT }),
        paveNav_z2: findOrAdd({ faces: [0, 0, 0, 0, 0], groundType: GT.PAWEMENT }),
        lawn_z1: findOrAdd({ faces: [8, 8, 8, 8, 10], groundType: GT.FIELD }),
        lawnNav_z2: findOrAdd({ faces: [0, 0, 0, 0, 0], groundType: GT.FIELD }),
        water_z1: findOrAdd({ faces: [0, 0, 0, 0, 41], groundType: GT.WATER, isFlat: true }),
        waterNav_z2: findOrAdd({ faces: [0, 0, 0, 0, 0], groundType: GT.WATER }),
        bldgWall_z: findOrAdd({ faces: [32, 32, 32, 32, 0], groundType: GT.BUILDING }),
        bldgTop_z: findOrAdd({ faces: [32, 32, 32, 32, 46], groundType: GT.BUILDING })
    };
    return serverVoxelTplBlocks;
}

function captureServerVoxelSnapshot(c, r) {
    if (!serverMap || !serverMap.voxelGrid) return null;
    const MC = global.MAP_COLS || 512;
    const MR = global.MAP_ROWS || 512;
    const ML = global.MAP_LAYERS || 6;
    const voxels = [];
    for (let z = 0; z < ML; z++) {
        voxels.push(serverMap.voxelGrid[(z * MR + r) * MC + c]);
    }
    const idx = r * MC + c;
    return {
        c,
        r,
        voxels,
        surfaceGround: serverMap.surfaceGround ? serverMap.surfaceGround[idx] : 0,
        surfaceLayer: serverMap.surfaceLayer ? serverMap.surfaceLayer[idx] : 1,
        bldgId: serverMap.bldgIdGrid ? serverMap.bldgIdGrid[idx] : 0,
        bldgStyle: serverMap.bldgStyleGrid ? serverMap.bldgStyleGrid[idx] : 0,
        bldgTopZ: serverMap.bldgTopZGrid ? serverMap.bldgTopZGrid[idx] : 2,
        coastalSand: serverMap.coastalSandMask ? serverMap.coastalSandMask[idx] : 0
    };
}

function restoreServerVoxelSnapshot(snap) {
    if (!serverMap || !serverMap.voxelGrid || !snap) return false;
    const MC = global.MAP_COLS || 512;
    const MR = global.MAP_ROWS || 512;
    const ML = global.MAP_LAYERS || 6;
    const { c, r } = snap;
    if (typeof c !== "number" || typeof r !== "number") return false;
    for (let z = 0; z < ML; z++) {
        serverMap.voxelGrid[(z * MR + r) * MC + c] = (snap.voxels && snap.voxels[z]) || 0;
    }
    const idx = r * MC + c;
    if (serverMap.surfaceGround) serverMap.surfaceGround[idx] = snap.surfaceGround;
    if (serverMap.surfaceLayer) serverMap.surfaceLayer[idx] = snap.surfaceLayer;
    if (serverMap.bldgIdGrid) serverMap.bldgIdGrid[idx] = snap.bldgId || 0;
    if (serverMap.bldgStyleGrid) serverMap.bldgStyleGrid[idx] = snap.bldgStyle || 0;
    if (serverMap.bldgTopZGrid) serverMap.bldgTopZGrid[idx] = snap.bldgTopZ || 2;
    if (serverMap.coastalSandMask) serverMap.coastalSandMask[idx] = snap.coastalSand || 0;
    return true;
}

function applyCreationOpToServerMap(op) {
    if (!op || !serverMap || !serverMap.cmpLoaded || !serverMap.voxelGrid) return false;
    const MC = global.MAP_COLS || 512;
    const MR = global.MAP_ROWS || 512;
    const ML = global.MAP_LAYERS || 6;
    const GT = global.GROUND_TYPE || { AIR: 0, WATER: 1, ROAD: 2, PAWEMENT: 3, FIELD: 4, BUILDING: 5 };
    if (!Array.isArray(serverMap.securityBarrierBoxes)) serverMap.securityBarrierBoxes = [];
    if (!serverMap._removedPreExistingBoxes) serverMap._removedPreExistingBoxes = new Map();

    const rebuildServerBarrierGrid = () => {
        serverMap.barrierBoxGrid = null;
        if (typeof serverMap.ensureBarrierSpatialGrids === "function") {
            serverMap.ensureBarrierSpatialGrids();
        }
    };

    if (op.action === "CLEAR_ALL") {
        for (const snap of serverBaseVoxelSnapshots.values()) {
            restoreServerVoxelSnapshot(snap);
        }
        serverBaseVoxelSnapshots.clear();
        serverMap.securityBarrierBoxes = serverMap.securityBarrierBoxes.filter((b) => !b || !b.isCustomServerBox);
        for (const boxes of serverMap._removedPreExistingBoxes.values()) {
            for (const bb of boxes) {
                if (!serverMap.securityBarrierBoxes.includes(bb)) {
                    serverMap.securityBarrierBoxes.push(bb);
                }
            }
        }
        serverMap._removedPreExistingBoxes.clear();
        rebuildServerBarrierGrid();
        return true;
    }
    if (op.action === "DEFINE_PREFAB_3D" && op.prefabId && op.config) {
        const cat = global.PREFAB_CATALOG || (global.PREFAB_CATALOG = {});
        const baseKey = (op.config.basePrefab && cat[op.config.basePrefab]) ? op.config.basePrefab : "villa_art_deco";
        const base = cat[baseKey] || { w1: 156, d1: 112, h1: 0.72, roofOverhang: 10 };
        cat[op.prefabId] = Object.assign({}, base, op.config, { id: op.prefabId });
        return true;
    }
    if (op.action === "PLACE_PREFAB_3D" && op.id && op.prefabId && typeof op.x === "number" && typeof op.y === "number") {
        if (op.prefabId === "VOLLEYBALL_COURT_3D" || op.prefabId === "STREET_TAKEOVER_RING" || op.prefabId === "SMUGGLER_CRATE_3D" || op.prefabId === "SODA_ECOLA_3D" || op.prefabId === "SODA_SPRUNK_3D") {
            return true;
        }
        const cat = global.PREFAB_CATALOG || {};
        const spec = cat[op.prefabId] || cat.villa_art_deco || { w1: 156, d1: 112 };
        const sc = Math.max(0.5, Math.min(2.2, Number(op.scale) || 1.0));
        const ang = Number(op.angle) || 0;
        const cosA = Math.cos(ang), sinA = Math.sin(ang);
        const wallHw = op.prefabId === "TIKI_BAR_3D" ? 26 : ((Number(spec.w1) || 156) * 0.5) * sc;
        const wallHh = op.prefabId === "TIKI_BAR_3D" ? 18 : ((Number(spec.d1) || 112) * 0.5) * sc;
        const wallEx = Math.abs(cosA) * wallHw + Math.abs(sinA) * wallHh;
        const wallEy = Math.abs(sinA) * wallHw + Math.abs(cosA) * wallHh;
        serverMap.securityBarrierBoxes = serverMap.securityBarrierBoxes.filter((b) => !b || b.estateId !== op.id);
        serverMap.securityBarrierBoxes.push({
            cx: op.x,
            cy: op.y,
            hw: wallHw,
            hh: wallHh,
             baseW1: Number(spec.w1) || 156,
            baseD1: Number(spec.d1) || 112,
            scale: sc,
            ang,
            cosA,
            sinA,
            minX: op.x - wallEx,
            maxX: op.x + wallEx,
            minY: op.y - wallEy,
            maxY: op.y + wallEy,
            estateId: op.id,
            isCustomServerBox: true
        });
        rebuildServerBarrierGrid();
        return true;
    }
    if (op.action === "RELOCATE_ENTITY" && op.targetId && typeof op.x === "number" && typeof op.y === "number") {
        let updated = false;
        for (const bb of serverMap.securityBarrierBoxes) {
            if (bb && bb.estateId === op.targetId) {
                const ang = op.angle !== undefined ? Number(op.angle) : (bb.ang || 0);
                const cosA = Math.cos(ang), sinA = Math.sin(ang);
                const ex = Math.abs(cosA) * bb.hw + Math.abs(sinA) * bb.hh;
                const ey = Math.abs(sinA) * bb.hw + Math.abs(cosA) * bb.hh;
                bb.cx = op.x;
                bb.cy = op.y;
                bb.ang = ang;
                bb.cosA = cosA;
                bb.sinA = sinA;
                bb.minX = op.x - ex;
                bb.maxX = op.x + ex;
                bb.minY = op.y - ey;
                bb.maxY = op.y + ey;
                updated = true;
            }
        }
        if (updated) rebuildServerBarrierGrid();
        return updated;
    }
    if (op.action === "MODIFY_ENTITY" && op.targetId && op.patch) {
        let updated = false;
        for (const bb of serverMap.securityBarrierBoxes) {
            if (bb && bb.estateId === op.targetId) {
                if (op.patch.scale !== undefined) bb.scale = Math.max(0.5, Math.min(2.2, Number(op.patch.scale) || 1.0));
                if (op.patch.w1) bb.baseW1 = Number(op.patch.w1);
                if (op.patch.d1) bb.baseD1 = Number(op.patch.d1);
                if (op.patch.angle !== undefined || op.patch.ang !== undefined) {
                    bb.ang = Number(op.patch.angle !== undefined ? op.patch.angle : op.patch.ang) || 0;
                }
                const sc = bb.scale || 1.0;
                bb.hw = ((bb.baseW1 || 156) * 0.5) * sc;
                bb.hh = ((bb.baseD1 || 112) * 0.5) * sc;
                const cosA = Math.cos(bb.ang || 0), sinA = Math.sin(bb.ang || 0);
                const ex = Math.abs(cosA) * bb.hw + Math.abs(sinA) * bb.hh;
                const ey = Math.abs(sinA) * bb.hw + Math.abs(cosA) * bb.hh;
                bb.cosA = cosA;
                bb.sinA = sinA;
                bb.minX = bb.cx - ex;
                bb.maxX = bb.cx + ex;
                bb.minY = bb.cy - ey;
                bb.maxY = bb.cy + ey;
                updated = true;
            }
        }
        if (updated) rebuildServerBarrierGrid();
        return updated;
    }
    if (op.action === "REMOVE" && (op.targetId || op.opKey)) {
        const tid = op.targetId || op.opKey;
        const removed = [];
        for (let i = serverMap.securityBarrierBoxes.length - 1; i >= 0; i--) {
            const bb = serverMap.securityBarrierBoxes[i];
            if (bb && (bb.estateId === tid || (op.isPreExisting && typeof op.x === "number" && typeof op.y === "number" && bb.cx !== undefined && Math.hypot(bb.cx - op.x, bb.cy - op.y) < 14))) {
                removed.push(bb);
                serverMap.securityBarrierBoxes.splice(i, 1);
            }
        }
        if (removed.length > 0) {
            if (op.isPreExisting) {
                serverMap._removedPreExistingBoxes.set(tid, removed);
            }
            rebuildServerBarrierGrid();
            return true;
        }
        return false;
    }
    if (op.action === "RESTORE_PREEXISTING" && op.targetId) {
        const boxes = serverMap._removedPreExistingBoxes.get(op.targetId);
        if (Array.isArray(boxes) && boxes.length > 0) {
            for (const bb of boxes) {
                if (!serverMap.securityBarrierBoxes.includes(bb)) {
                    serverMap.securityBarrierBoxes.push(bb);
                }
            }
            serverMap._removedPreExistingBoxes.delete(op.targetId);
            rebuildServerBarrierGrid();
            return true;
        }
        return false;
    }
    if (op.action === "RESTORE_VOXEL_TILE" && typeof op.c === "number" && typeof op.r === "number") {
        const c = Math.max(2, Math.min(MC - 3, Math.floor(op.c)));
        const r = Math.max(2, Math.min(MR - 3, Math.floor(op.r)));
        const snap = op.snap || serverBaseVoxelSnapshots.get(`${c}_${r}`);
        if (snap) {
            return restoreServerVoxelSnapshot(snap);
        }
        return false;
    }
    if (op.action === "VOXEL_TILE" && typeof op.c === "number" && typeof op.r === "number") {
        const c = Math.max(2, Math.min(MC - 3, Math.floor(op.c)));
        const r = Math.max(2, Math.min(MR - 3, Math.floor(op.r)));
        const T = ensureServerVoxelTemplates();
        if (!T) return false;
        const tKey = `${c}_${r}`;
        if (!serverBaseVoxelSnapshots.has(tKey)) {
            const baseSnap = captureServerVoxelSnapshot(c, r);
            if (baseSnap) serverBaseVoxelSnapshots.set(tKey, baseSnap);
        }
        const idx = r * MC + c;
        for (let z = 1; z < ML; z++) {
            serverMap.voxelGrid[(z * MR + r) * MC + c] = 0;
        }
        if (serverMap.bldgIdGrid) serverMap.bldgIdGrid[idx] = 0;
        if (serverMap.bldgStyleGrid) serverMap.bldgStyleGrid[idx] = 0;
        if (serverMap.bldgTopZGrid) serverMap.bldgTopZGrid[idx] = 2;
        if (serverMap.coastalSandMask) serverMap.coastalSandMask[idx] = 0;

        const presetKey = String(op.presetKey || "SIDEWALK");
        let newGround = GT.PAWEMENT;
        let newLayer = 2;
        if (presetKey === "ROAD_NS" || presetKey === "ROAD_EW" || presetKey === "ROAD_CROSS") {
            const z1Blk = presetKey === "ROAD_EW" ? T.roadEW_z1 : (presetKey === "ROAD_CROSS" ? T.roadCross_z1 : T.roadNS_z1);
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = z1Blk;
            serverMap.voxelGrid[(2 * MR + r) * MC + c] = T.roadNav_z2;
            newGround = GT.ROAD;
        } else if (presetKey === "SIDEWALK" || presetKey === "DEMOLISH_TO_PAVE") {
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = T.pave_z1;
            serverMap.voxelGrid[(2 * MR + r) * MC + c] = T.paveNav_z2;
            newGround = GT.PAWEMENT;
        } else if (presetKey === "WOOD_BOARDWALK") {
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = T.boardwalk_z1;
            serverMap.voxelGrid[(2 * MR + r) * MC + c] = T.paveNav_z2;
            newGround = GT.PAWEMENT;
        } else if (presetKey === "BEACH_SAND") {
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = T.sand_z1;
            serverMap.voxelGrid[(2 * MR + r) * MC + c] = T.paveNav_z2;
            if (serverMap.coastalSandMask) serverMap.coastalSandMask[idx] = 1;
            newGround = GT.PAWEMENT;
        } else if (presetKey === "TROPICAL_LAWN") {
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = T.lawn_z1;
            serverMap.voxelGrid[(2 * MR + r) * MC + c] = T.lawnNav_z2;
            newGround = GT.FIELD;
        } else if (presetKey === "OCEAN_WATER") {
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = T.water_z1;
            serverMap.voxelGrid[(2 * MR + r) * MC + c] = T.waterNav_z2;
            newGround = GT.WATER;
        } else if (presetKey.startsWith("BLDG_")) {
            let storeys = Number(op.storeys) || 2;
            let style = op.style !== undefined ? Number(op.style) : 0;
            if (presetKey === "BLDG_ART_DECO_3F") { storeys = Number(op.storeys) || 1; style = op.style !== undefined ? Number(op.style) : 0; }
            else if (presetKey === "BLDG_HOTEL_4F") { storeys = Number(op.storeys) || 2; style = op.style !== undefined ? Number(op.style) : 1; }
            else if (presetKey === "BLDG_TOWER_5F") { storeys = Number(op.storeys) || 3; style = op.style !== undefined ? Number(op.style) : 3; }
            else if (presetKey === "BLDG_SKYSCRAPER_6F") { storeys = Number(op.storeys) || 4; style = op.style !== undefined ? Number(op.style) : 10; }
            storeys = Math.max(1, Math.min(4, storeys));
            const topZ = Math.min(5, 1 + storeys);
            serverMap.voxelGrid[(1 * MR + r) * MC + c] = T.pave_z1;
            for (let z = 2; z < topZ; z++) {
                serverMap.voxelGrid[(z * MR + r) * MC + c] = T.bldgWall_z;
            }
            serverMap.voxelGrid[(topZ * MR + r) * MC + c] = T.bldgTop_z;
            newGround = GT.BUILDING;
            newLayer = topZ;
            if (serverMap.bldgIdGrid) serverMap.bldgIdGrid[idx] = 9000 + ((c * 31 + r * 17) & 0xfff);
            if (serverMap.bldgStyleGrid) serverMap.bldgStyleGrid[idx] = style % 12;
            if (serverMap.bldgTopZGrid) serverMap.bldgTopZGrid[idx] = topZ + 1;
        }
        if (serverMap.surfaceGround) serverMap.surfaceGround[idx] = newGround;
        if (serverMap.surfaceLayer) serverMap.surfaceLayer[idx] = newLayer;
        return true;
    }
    return false;
}

function normalizeRoomCode(roomCode) {
    const raw = String(roomCode || "VICE26").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "VICE26";
    return raw === "VICE97" ? "VICE26" : raw;
}

function wrapServerAngle(a) {
    if (!Number.isFinite(a)) return 0;
    return Math.round(Math.atan2(Math.sin(a), Math.cos(a)) * 1000) / 1000;
}

function clearCorpseSmashedPropsNear(room, x, y, radius = 42) {
    if (!room || !room.smashedProps || !Number.isFinite(x) || !Number.isFinite(y)) return;
    for (const [pk, pv] of Object.entries(room.smashedProps)) {
        if (pv && typeof pv.pType === "string" && pv.pType.startsWith("CORPSE:") && Math.hypot((pv.x || 0) - x, (pv.y || 0) - y) <= radius) {
            delete room.smashedProps[pk];
        }
    }
}

function isDynamicVehicleId(vid) {
    if (typeof vid !== "string") return false;
    return (
        vid.startsWith("trf_") ||
        vid.startsWith("traf_") ||
        vid.startsWith("srv_trf_") ||
        vid.startsWith("v_init_") ||
        vid.startsWith("cop_") ||
        vid.startsWith("rb_") ||
        vid.startsWith("amb_") ||
        vid.startsWith("medic_") ||
        vid.startsWith("vcfd_") ||
        vid.startsWith("fire_") ||
        vid.startsWith("tow_") ||
        vid.startsWith("nemesis_") ||
        vid.startsWith("crim_") ||
        vid.startsWith("fixer_") ||
        vid.startsWith("mission_") ||
        vid.startsWith("mcheetah_") ||
        vid.startsWith("mbrinks_")
    );
}

function isTransientResponderRow(vid, row) {
    if (typeof vid === "string" && (
        vid.startsWith("cop_") ||
        vid.startsWith("rb_") ||
        vid.startsWith("amb_") ||
        vid.startsWith("medic_") ||
        vid.startsWith("vcfd_") ||
        vid.startsWith("fire_") ||
        vid.startsWith("tow_") ||
        vid.startsWith("nemesis_") ||
        vid.startsWith("crim_")
    )) {
        return true;
    }
    const specKey = Array.isArray(row) ? row[1] : "";
    return (
        specKey === "VCPD_CRUISER" ||
        specKey === "SWAT_ENFORCER" ||
        specKey === "TOW_TRUCK" ||
        specKey === "FIRE_TRUCK" ||
        specKey === "MEDIC_AMBULANCE"
    );
}

function createEmptyRoom() {
    return {
        vehs: {},          // Live AI traffic, police, ambulance, fire, tow, bus, cab, and armored vehicles
        peds: {},          // Live sidewalk pedestrians & active responders
        modifiedVehs: {},  // Player-driven, moved, parked, damaged, or wrecked vehicles (NEVER overwritten by default map!)
        modifiedVehTs: {}, // Timestamp (ms) when each modifiedVeh was last updated
        smashedProps: {},  // Knocked-down streetlamps, traffic lights, bollards, hydrants, benches
        corpses: {},       // Recent pedestrian corpses (auto-cleaned after 180s or paramedic pickup)
        corpseTs: {},      // Timestamp (ms) when each corpse was recorded
        robbedVaults: {},  // Interior station / safe / register lockout timestamps { [vaultKey]: expiresAtMs }
        turfStandings: {}, // District Turf War Kingpins (leaderName, leaderColor, leaderScore)
        creationOps: {},   // Persisted Creation Engine operations (3D voxel edits, custom villas, shops, props, moves, modifications)
        graffitiTags: {},  // Persisted [P] Aerosol Graffiti Wall Tags across Vice City
        carRespect: {},    // Persisted [Y] Car Meet Respect Commendations { [vehId]: count }
        activeFlashDistrict: createFlashDistrictState(0),
        activeCustomMission: null,
        activeFlashDrop: null,
        activeBounty: null,
        chat: [],
        ver: 0,
        worldMinutes: 720,
        trafficLightTimer: 0,
        updatedAt: 0
    };
}

const persistentStore = {
    econVer: ECON_VERSION,
    updatedAt: new Date().toISOString(),
    leaderboard: [],
    profiles: {},
    rooms: {
        VICE26: createEmptyRoom(),
        MIAMI86: createEmptyRoom(),
        KEYS305: createEmptyRoom()
    }
};

function ensureRoom(roomCode) {
    const code = normalizeRoomCode(roomCode);
    if (!persistentStore.rooms[code]) {
        persistentStore.rooms[code] = createEmptyRoom();
    }
    const r = persistentStore.rooms[code];
    if (!r.modifiedVehs) r.modifiedVehs = {};
    if (!r.modifiedVehTs) r.modifiedVehTs = {};
    if (!r.smashedProps) r.smashedProps = {};
    if (!r.corpses) r.corpses = {};
    if (!r.corpseTs) r.corpseTs = {};
    if (!r.robbedVaults) r.robbedVaults = {};
    if (!r.turfStandings) r.turfStandings = {};
    if (!r.creationOps) r.creationOps = {};
    if (!r.graffitiTags) r.graffitiTags = {};
    if (!r.carRespect) r.carRespect = {};
    if (!r.activeFlashDistrict) r.activeFlashDistrict = createFlashDistrictState(0);
    if (!r.vehs) r.vehs = {};
    if (!r.peds) r.peds = {};
    if (!Array.isArray(r.chat)) r.chat = [];
    return { code, room: r };
}

let isDirty = false;

function loadPersistentState() {
    try {
        let raw = null;
        let parsedFromFile = null;
        for (const candidate of [STATE_FILE, `${STATE_FILE}.bak`, `${STATE_FILE}.tmp`]) {
            if (!fs.existsSync(candidate)) continue;
            try {
                const txt = fs.readFileSync(candidate, "utf8");
                const obj = JSON.parse(txt);
                if (obj && typeof obj === "object") {
                    raw = txt;
                    parsedFromFile = candidate;
                    break;
                }
            } catch (e) {
                console.warn(`[WORLD-DB] ${candidate} unreadable (${e.message}), trying next backup...`);
            }
        }
        if (raw) {
            if (parsedFromFile !== STATE_FILE) console.warn(`[WORLD-DB] Recovered world from backup ${parsedFromFile}`);
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                const nowMs = Date.now();
                let migratedAny = (Number(parsed.econVer) || 1) < ECON_VERSION;
                if (Array.isArray(parsed.leaderboard)) {
                    const filteredLb = parsed.leaderboard
                        .filter((e) => {
                            if (!e || !e.name) return false;
                            const entryVer = Number(e.econVer) || 1;
                            if (entryVer < ECON_VERSION && Number(e.score) > 50000) {
                                migratedAny = true;
                                return false;
                            }
                            return true;
                        })
                        .map((e) => Object.assign({}, e, { econVer: ECON_VERSION }))
                        .slice(0, 25);
                    persistentStore.leaderboard = filteredLb;
                }
                if (parsed.profiles && typeof parsed.profiles === "object") {
                    for (const [pk, pv] of Object.entries(parsed.profiles)) {
                        if (!pv || typeof pv !== "object") continue;
                        if ((Number(pv.econVer) || 1) < ECON_VERSION) {
                            pv.cash = 500;
                            pv.mlt = 1;
                            pv.econVer = ECON_VERSION;
                            migratedAny = true;
                        }
                        persistentStore.profiles[pk] = pv;
                    }
                }
                if (parsed.rooms && typeof parsed.rooms === "object") {
                    for (const [rk, rv] of Object.entries(parsed.rooms)) {
                        if (rv && typeof rv === "object") {
                            if (rk === "VICE97") migratedAny = true;
                            const normKey = normalizeRoomCode(rk);
                            const existing = persistentStore.rooms[normKey] || createEmptyRoom();
                            const rawModVehs = Object.assign({}, existing.modifiedVehs, (rv.modifiedVehs && typeof rv.modifiedVehs === "object") ? rv.modifiedVehs : {});
                            const cleanModVehs = {};
                            const cleanModTs = Object.assign({}, existing.modifiedVehTs || {}, (rv.modifiedVehTs && typeof rv.modifiedVehTs === "object") ? rv.modifiedVehTs : {});
                            for (const [vid, vrow] of Object.entries(rawModVehs)) {
                                if (!Array.isArray(vrow) || vrow.length < 11) continue;
                                if ((vrow[2] || 0) < 128 || (vrow[3] || 0) < 128) continue;
                                if (!Number.isFinite(vrow[2]) || !Number.isFinite(vrow[3]) || !Number.isFinite(vrow[5])) continue;
                                // PERMANENT WORLD: destroyed wrecks (and parked player cars) survive restarts exactly where they were left.
                                // Only transient traffic/cop/mission/responder cars that are NOT wrecks are dropped on startup.
                                if (!(vrow[10] & 1) && (isDynamicVehicleId(vid) || isTransientResponderRow(vid, vrow))) {
                                    migratedAny = true;
                                    continue;
                                }
                                vrow[5] = wrapServerAngle(vrow[5]);
                                vrow[8] = 0; // Ensure parked on startup
                                vrow[6] = 0;
                                vrow[7] = 0;
                                if (vrow[10] & 1) {
                                    vrow[9] = 0;
                                    vrow[10] &= ~2;
                                    const bx = Math.floor(vrow[2] / 64), by = Math.floor(vrow[3] / 64);
                                    const inRestr = serverMap && serverMap.isRestrictedNoTrafficZone && serverMap.isRestrictedNoTrafficZone(bx, by);
                                    const inWater = serverMap && serverMap.isWaterAtPixel && serverMap.isWaterAtPixel(vrow[2], vrow[3]);
                                    if ((inRestr || inWater) && (nowMs - (cleanModTs[vid] || 0)) > 120000) {
                                        delete cleanModTs[vid];
                                        migratedAny = true;
                                        continue;
                                    }
                                }
                                cleanModVehs[vid] = vrow;
                                if (!cleanModTs[vid]) cleanModTs[vid] = nowMs;
                            }
                            const loadedVehs = Object.assign({}, cleanModVehs);
                            if (rv.vehs && typeof rv.vehs === "object") {
                                for (const [vid, vrow] of Object.entries(rv.vehs)) {
                                    if (!Array.isArray(vrow) || vrow.length < 11) continue;
                                    if ((vrow[2] || 0) < 128 || (vrow[3] || 0) < 128) continue;
                                    if (cleanModVehs[vid]) continue;
                                    // PERMANENT WORLD: keep every autonomous vehicle at its last position across restarts;
                                    // only purge transient responders/pursuit/mission cars (identified by id prefix).
                                    if (!Number.isFinite(vrow[3]) || !Number.isFinite(vrow[5]) || (isDynamicVehicleId(vid) && !String(vid).startsWith("srv_trf_")) || isTransientResponderRow(vid, null)) {
                                        migratedAny = true;
                                        continue;
                                    }
                                    vrow[5] = wrapServerAngle(vrow[5]);
                                    if (vrow[8] === 4) vrow[8] = 0;
                                    if (vrow[10] & 1) vrow[9] = 0;
                                    loadedVehs[vid] = vrow;
                                }
                            }
                            const loadedPeds = {};
                            if (rv.peds && typeof rv.peds === "object") {
                                for (const [pid, prow] of Object.entries(rv.peds)) {
                                    if (Array.isArray(prow) && prow.length >= 10 && !(prow[9] & 1)) {
                                        // Only keep autonomous server sidewalk peds (ped_init_0..63) across server restarts; purge stale client/excess peds!
                                        const pedMatch = /^ped_init_(\d+)$/.exec(String(pid));
                                        if (!pedMatch || Number(pedMatch[1]) >= 64) {
                                            migratedAny = true;
                                            continue;
                                        }
                                        prow[6] = Math.round(wrapServerAngle(prow[6]) * 100) / 100;
                                        loadedPeds[pid] = prow;
                                    }
                                }
                            }
                            persistentStore.rooms[normKey] = {
                                vehs: loadedVehs,
                                peds: loadedPeds,
                                modifiedVehs: cleanModVehs,
                                modifiedVehTs: cleanModTs,
                                smashedProps: Object.assign({}, existing.smashedProps, (rv.smashedProps && typeof rv.smashedProps === "object") ? rv.smashedProps : {}),
                                corpses: (rv.corpses && typeof rv.corpses === "object") ? rv.corpses : {},
                                corpseTs: (rv.corpseTs && typeof rv.corpseTs === "object") ? rv.corpseTs : {},
                                robbedVaults: Object.assign({}, existing.robbedVaults || {}, (rv.robbedVaults && typeof rv.robbedVaults === "object") ? rv.robbedVaults : {}),
                                turfStandings: Object.assign({}, existing.turfStandings, (rv.turfStandings && typeof rv.turfStandings === "object") ? rv.turfStandings : {}),
                                creationOps: Object.assign({}, existing.creationOps || {}, (rv.creationOps && typeof rv.creationOps === "object") ? rv.creationOps : {}),
                                graffitiTags: Object.assign({}, existing.graffitiTags || {}, (rv.graffitiTags && typeof rv.graffitiTags === "object") ? rv.graffitiTags : {}),
                                carRespect: Object.assign({}, existing.carRespect || {}, (rv.carRespect && typeof rv.carRespect === "object") ? rv.carRespect : {}),
                                activeFlashDistrict: createFlashDistrictState(0),
                                activeCustomMission: null,
                                activeFlashDrop: null,
                                activeBounty: null,
                                chat: (existing.chat || []).concat(Array.isArray(rv.chat) ? rv.chat : []).slice(-30),
                                ver: Math.max(Number(existing.ver) || 0, Number(rv.ver) || 0),
                                worldMinutes: Number(rv.worldMinutes) || existing.worldMinutes || 720,
                                trafficLightTimer: Number(rv.trafficLightTimer) || existing.trafficLightTimer || 0,
                                fleetHome: (rv.fleetHome && typeof rv.fleetHome === "object") ? rv.fleetHome : {},
                                fleetHomeVer: Number(rv.fleetHomeVer) || 0,
                                updatedAt: Math.max(Number(existing.updatedAt) || 0, Number(rv.updatedAt) || 0)
                            };
                        }
                    }
                }
                persistentStore.econVer = ECON_VERSION;
                if (persistentStore.rooms.VICE26 && persistentStore.rooms.VICE26.creationOps) {
                    const savedOps = Object.values(persistentStore.rooms.VICE26.creationOps).sort((a, b) => ((a && a.ts) || 0) - ((b && b.ts) || 0));
                    for (const op of savedOps) {
                        applyCreationOpToServerMap(op);
                    }
                }
                if (migratedAny) {
                    isDirty = true;
                }
                console.log(`[WORLD-DB] Loaded persistent state from ${STATE_FILE} (econVer=${ECON_VERSION}, migrated=${migratedAny})`);
            }
        }
    } catch (err) {
        console.warn("[WORLD-DB] Failed to load state file, starting fresh:", err.message);
    }
}

function savePersistentStateNow() {
    if (!isDirty) return;
    try {
        persistentStore.updatedAt = new Date().toISOString();
        const tmpFile = `${STATE_FILE}.tmp`;
        const bakFile = `${STATE_FILE}.bak`;
        const payload = JSON.stringify(persistentStore, (k, v) => (
            (k === "vehNav" || k === "pedNav" || k === "vehClientSyncMs" || k === "pedClientSyncMs") ? undefined : v
        ));
        fs.writeFileSync(tmpFile, payload, "utf8");
        if (fs.existsSync(STATE_FILE)) {
            try { fs.copyFileSync(STATE_FILE, bakFile); } catch (_e) {}
            // Rolling hourly snapshot (keep last 24) so a corrupted world can always be rolled back
            try {
                const hourTag = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
                const snapFile = path.join(DATA_DIR, `world_state.${hourTag}.snap.json`);
                if (!fs.existsSync(snapFile)) {
                    fs.copyFileSync(STATE_FILE, snapFile);
                    const snaps = fs.readdirSync(DATA_DIR).filter((f) => /^world_state\.\d+\.snap\.json$/.test(f)).sort();
                    while (snaps.length > 24) fs.unlinkSync(path.join(DATA_DIR, snaps.shift()));
                }
            } catch (_e) {}
        }
        fs.renameSync(tmpFile, STATE_FILE);
        isDirty = false;
    } catch (err) {
        console.warn("[WORLD-DB] Failed to save state:", err.message);
    }
}

function mergeLeaderboardEntry(name, charId, score, color, econVer = 1) {
    const cleanName = String(name || "").trim().slice(0, 18).toUpperCase();
    const sc = Math.floor(Number(score) || 0);
    if (!cleanName || sc <= 0) return false;
    // Ignore un-migrated pre-v2 inflated scores (> $50,000 without econVer >= 2)
    if ((Number(econVer) || 1) < ECON_VERSION && sc > 50000) return false;
    const existing = persistentStore.leaderboard.find((e) => e.name === cleanName);
    if (existing) {
        const existingIsLegacy = (Number(existing.econVer) || 1) < ECON_VERSION && existing.score > 50000;
        if (sc > existing.score || existingIsLegacy) {
            existing.score = sc;
            existing.charId = charId || existing.charId || "LUCIA";
            existing.color = color || existing.color || "#00f0ff";
            existing.econVer = ECON_VERSION;
            existing.ts = Date.now();
            isDirty = true;
        } else {
            return false;
        }
    } else {
        persistentStore.leaderboard.push({
            name: cleanName,
            charId: charId || "LUCIA",
            score: sc,
            color: color || "#00f0ff",
            econVer: ECON_VERSION,
            ts: Date.now()
        });
        isDirty = true;
    }
    persistentStore.leaderboard.sort((a, b) => b.score - a.score);
    if (persistentStore.leaderboard.length > 25) {
        persistentStore.leaderboard.length = 25;
    }
    return true;
}

loadPersistentState();
setInterval(savePersistentStateNow, 4000);

/* ============================================================================
   2. NATIVE RFC-6455 WEBSOCKET PROTOCOL ENCODER / DECODER
   ============================================================================ */
const clients = new Map();

function encodeWsFrame(payloadStr) {
    const payload = Buffer.from(payloadStr, "utf8");
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81;
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

function sendJson(socket, obj) {
    if (!socket || socket.destroyed || !socket.writable) return;
    try {
        socket.write(encodeWsFrame(JSON.stringify(obj)));
    } catch (_e) {}
}

function hasOtherRoomClients(roomCode, excludeSocket = null) {
    for (const [sock, meta] of clients.entries()) {
        if (sock === excludeSocket || sock.destroyed || !sock.writable) continue;
        if (meta.room === roomCode) return true;
    }
    return false;
}

function broadcastToRoom(roomCode, obj, excludeSocket = null) {
    let frame = null;
    for (const [sock, meta] of clients.entries()) {
        if (sock === excludeSocket || sock.destroyed || !sock.writable) continue;
        if (meta.room === roomCode) {
            if (!frame) frame = encodeWsFrame(JSON.stringify(obj));
            try { sock.write(frame); } catch (_e) {}
        }
    }
}

function broadcastDirectoryCounts() {
    const counts = {};
    for (const code of ROOM_CODES) counts[code] = 0;
    for (const meta of clients.values()) {
        if (meta.isOutdated) continue;
        const r = normalizeRoomCode(meta.room || "VICE26");
        counts[r] = (counts[r] || 0) + 1 + (meta.bots || 0);
    }
    // Mirror VICE26 <-> VICE97 count so both legacy and current UI badges match 100%
    counts.VICE97 = counts.VICE26 || 0;
    const frame = encodeWsFrame(JSON.stringify({ t: "DIR_COUNTS", counts }));
    for (const [sock] of clients.entries()) {
        if (!sock.destroyed && sock.writable) {
            try { sock.write(frame); } catch (_e) {}
        }
    }
}

function assignRoomSlot(roomCode, excludeSocket = null) {
    const used = new Set();
    for (const [sock, meta] of clients.entries()) {
        if (sock !== excludeSocket && meta.room === roomCode && typeof meta.slot === "number" && meta.slot >= 0) {
            used.add(meta.slot);
        }
    }
    for (let s = 0; s < 24; s++) {
        if (!used.has(s)) return s;
    }
    return 0;
}

function getCombinedRoomVehicles(room) {
    const merged = Object.assign({}, room.vehs || {}, room.modifiedVehs || {});
    return Object.values(merged);
}

function sendRoomBootstrap(socket, meta) {
    const { code, room } = ensureRoom(meta.room);

    // 1. Welcome + Slot
    sendJson(socket, {
        t: "WELCOME",
        slot: meta.slot,
        room: code,
        online: Array.from(clients.values()).filter((m) => m.room === code).length
    });

    // 2. Leaderboard
    if (persistentStore.leaderboard.length > 0) {
        sendJson(socket, {
            t: "LEADERBOARD_SYNC",
            entries: persistentStore.leaderboard
        });
    }

    // 3. Chat History
    if (Array.isArray(room.chat) && room.chat.length > 0) {
        sendJson(socket, {
            t: "CHAT_HISTORY",
            messages: room.chat.slice(-20)
        });
    }

    // 4. Persisted Player-Modified World Vehicles (Parked/Damaged/Wrecked/Player-Driven) & Corpses
    const vehRows = Object.values(room.modifiedVehs || {}).filter(
        (r) => Array.isArray(r) && (r[8] === 0 || r[8] === 4 || Boolean(r[10] & 1))
    );
    const pedRows = Object.values(room.corpses || {});
    sendJson(socket, {
        t: "WORLD_SYNC",
        id: "server_world",
        ver: room.ver || 101162,
        wm: room.worldMinutes || 720,
        tl: room.trafficLightTimer || 0,
        vehs: vehRows,
        peds: pedRows
    });

    // 5. Persisted Smashed Street Props (Streetlamps, Traffic Signals, Bollards, Hydrants, Benches)
    const propList = Object.values(room.smashedProps || {});
    if (propList.length > 0) {
        sendJson(socket, {
            t: "PROP_SYNC",
            props: propList
        });
    }

    // 6. Saved Player Profile (always send PROFILE_SYNC even if null so client unlocks profile saving!)
    const prof = (meta.profileKey && persistentStore.profiles[meta.profileKey]) || null;
    sendJson(socket, {
        t: "PROFILE_SYNC",
        profileKey: meta.profileKey,
        profile: prof
    });

    // 6B. Persisted District Turf Standings + Active Vault Lockouts + Active Hot Drop / Bounty Events
    if (room.robbedVaults && typeof room.robbedVaults === "object") {
        const nowMs = Date.now();
        const activeVaults = {};
        let hasVaults = false;
        for (const [vk, expMs] of Object.entries(room.robbedVaults)) {
            if (expMs > nowMs) {
                activeVaults[vk] = Math.ceil((expMs - nowMs) / 1000);
                hasVaults = true;
            }
        }
        if (hasVaults) {
            sendJson(socket, {
                t: "WORLD_EVENT",
                kind: "VAULT_SYNC",
                vaults: activeVaults
            });
        }
    }
    if (room.turfStandings && Object.keys(room.turfStandings).length > 0) {
        sendJson(socket, {
            t: "WORLD_EVENT",
            kind: "TURF_SYNC",
            standings: room.turfStandings
        });
    }
    sendJson(socket, {
        t: "WORLD_EVENT",
        kind: "CREATION_SYNC",
        ops: Object.values(room.creationOps || {})
    });
    if (room.activeFlashDistrict) {
        const fd = room.activeFlashDistrict;
        const remSec = Math.max(10, Math.round((fd.duration || 180) - (Date.now() - (fd.startedAt || Date.now())) / 1000));
        sendJson(socket, {
            t: "WORLD_EVENT",
            kind: "FLASH_DISTRICT_SYNC",
            district: Object.assign({}, fd, { duration: remSec })
        });
    }
    if (room.carRespect && Object.keys(room.carRespect).length > 0) {
        sendJson(socket, {
            t: "WORLD_EVENT",
            kind: "CAR_RESPECT_SYNC",
            respect: room.carRespect
        });
    }
    if (room.graffitiTags && Object.keys(room.graffitiTags).length > 0) {
        sendJson(socket, {
            t: "WORLD_EVENT",
            kind: "GRAFFITI_SYNC",
            tags: Object.values(room.graffitiTags)
        });
    }
    if (room.activeCustomMission && room.activeCustomMission.blueprint && (Date.now() - (room.activeCustomMission.startedAt || 0)) < ((room.activeCustomMission.blueprint.timer || 180) * 1000)) {
        sendJson(socket, {
            t: "WORLD_EVENT",
            kind: "CREATION_OP",
            op: {
                action: "LAUNCH_MISSION",
                opKey: `active_msn_${room.activeCustomMission.id}`,
                id: room.activeCustomMission.id,
                blueprint: room.activeCustomMission.blueprint
            }
        });
    }
    if (room.activeFlashDrop && (Date.now() - (room.activeFlashDrop.startedAt || 0)) < (room.activeFlashDrop.duration || 90) * 1000) {
        const remSec = Math.max(5, Math.round((room.activeFlashDrop.duration || 90) - (Date.now() - room.activeFlashDrop.startedAt) / 1000));
        sendJson(socket, Object.assign({}, room.activeFlashDrop, {
            t: "WORLD_EVENT",
            kind: "FLASH_DROP_SPAWN",
            duration: remSec
        }));
    }
    if (room.activeBounty && (Date.now() - (room.activeBounty.startedAt || 0)) < (room.activeBounty.duration || 60) * 1000) {
        const remSec = Math.max(5, Math.round((room.activeBounty.duration || 60) - (Date.now() - room.activeBounty.startedAt) / 1000));
        sendJson(socket, Object.assign({}, room.activeBounty, {
            t: "WORLD_EVENT",
            kind: "BOUNTY_START",
            duration: remSec
        }));
    }

    // 7. Current active players in the room (only send players who have started and sent a fresh STATE within the last 8s)
    const bootNowMs = Date.now();
    for (const [otherSock, otherMeta] of clients.entries()) {
        if (
            otherSock !== socket &&
            otherMeta.room === code &&
            !otherMeta.isOutdated &&
            otherMeta.lastState &&
            otherMeta.lastState.started &&
            (bootNowMs - (otherMeta.lastStateMs || 0)) < 8000
        ) {
            sendJson(socket, otherMeta.lastState);
        }
    }
}

function handleClientPacket(socket, pkt) {
    if (!pkt || typeof pkt !== "object") return;
    const meta = clients.get(socket);
    if (!meta) return;

    // Per-socket token-bucket packet rate limiter (max 95 packets/sec)
    const nowPktMs = Date.now();
    if (!meta.pktWindowMs || (nowPktMs - meta.pktWindowMs) >= 1000) {
        meta.pktWindowMs = nowPktMs;
        meta.pktCount = 0;
    }
    const isHighFreqStatePkt = pkt.t === "STATE" || pkt.t === "WORLD_SYNC";
    if (isHighFreqStatePkt && ++meta.pktCount > 360) {
        return;
    }

    if (pkt.id) {
        meta.playerId = String(pkt.id).slice(0, 40);
        // Evict any lingering ghost socket from the same browser tab / playerId
        for (const [otherSock, otherMeta] of clients.entries()) {
            if (otherSock !== socket && otherMeta.playerId === meta.playerId) {
                try { otherSock.destroy(); } catch (_e) {}
                clients.delete(otherSock);
            }
        }
    }
    if (pkt.name) {
        meta.name = String(pkt.name).slice(0, 18).toUpperCase();
        meta.profileKey = meta.name.replace(/[^A-Z0-9_#]/g, "");
    }
    if (pkt.color) meta.color = String(pkt.color).slice(0, 16);
    if (pkt.pedType) meta.pedType = String(pkt.pedType).slice(0, 16);

    if (pkt.t === "PING") {
        meta.lastSeen = Date.now();
        sendJson(socket, { t: "PONG", ts: pkt.ts || Date.now() });
        return;
    }

    if (pkt.t === "SWITCH_ROOM" && pkt.room) {
        const prevRoom = meta.room;
        const { code } = ensureRoom(pkt.room);
        if (prevRoom && prevRoom !== code) {
            if (meta.lastDrivenVehId) {
                const { room: pr } = ensureRoom(prevRoom);
                const oldVid = meta.lastDrivenVehId;
                if (pr.modifiedVehs && pr.modifiedVehs[oldVid] && pr.modifiedVehs[oldVid][8] === 4) {
                    pr.modifiedVehs[oldVid][8] = 0;
                    pr.modifiedVehs[oldVid][6] = 0;
                    pr.modifiedVehs[oldVid][7] = 0;
                    pr.modifiedVehs[oldVid][10] = (pr.modifiedVehs[oldVid][10] || 0) & ~2;
                }
                if (pr.vehs && pr.vehs[oldVid] && pr.vehs[oldVid][8] === 4) {
                    pr.vehs[oldVid][8] = 0;
                    pr.vehs[oldVid][6] = 0;
                    pr.vehs[oldVid][7] = 0;
                    pr.vehs[oldVid][10] = (pr.vehs[oldVid][10] || 0) & ~2;
                }
                meta.lastDrivenVehId = null;
            }
            broadcastToRoom(prevRoom, { t: "LEAVE", id: meta.playerId, name: meta.name }, socket);
        }
        meta.room = code;
        meta.slot = assignRoomSlot(code, socket);
        sendRoomBootstrap(socket, meta);
        broadcastDirectoryCounts();
        return;
    }

    const { code: roomCode, room } = ensureRoom(pkt.room || meta.room);
    if (meta.room !== roomCode) {
        meta.room = roomCode;
        meta.slot = assignRoomSlot(roomCode, socket);
    }

    if (pkt.t === "NAME" && pkt.name) {
        meta.name = String(pkt.name).slice(0, 18).toUpperCase();
        meta.profileKey = meta.name.replace(/[^A-Z0-9_#]/g, "");
        const prof = (meta.profileKey && persistentStore.profiles[meta.profileKey]) || null;
        sendJson(socket, {
            t: "PROFILE_SYNC",
            profileKey: meta.profileKey,
            profile: prof
        });
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "JOIN") {
        if (typeof pkt.ver === "number") {
            meta.ver = pkt.ver;
            meta.isOutdated = pkt.ver < MIN_CLIENT_VER;
        }
        pkt.slot = meta.slot;
        sendRoomBootstrap(socket, meta);
        if (!meta.isOutdated) {
            broadcastToRoom(roomCode, pkt, socket);
        } else {
            sendJson(socket, { t: "FORCE_RELOAD", build: CURRENT_BUILD });
        }
        broadcastDirectoryCounts();
        return;
    }

    if (pkt.t === "DIR_HEARTBEAT") {
        meta.bots = Math.max(0, Math.min(16, Number(pkt.bots) || 0));
        broadcastDirectoryCounts();
        return;
    }

    if (pkt.t === "STATE") {
        pkt.slot = meta.slot;
        meta.lastSeen = Date.now();
        if (typeof pkt.ver === "number") {
            meta.ver = pkt.ver;
        }
        if ((Number(pkt.ver) || 0) < MIN_CLIENT_VER) {
            const wasOutdated = meta.isOutdated;
            meta.isOutdated = true;
            meta.lastState = null;
            if (!wasOutdated) broadcastDirectoryCounts();
            if (!meta.lastForceReloadMs || (Date.now() - meta.lastForceReloadMs) > 4000) {
                meta.lastForceReloadMs = Date.now();
                sendJson(socket, { t: "FORCE_RELOAD", build: CURRENT_BUILD });
            }
            return;
        }
        if (meta.isOutdated) {
            meta.isOutdated = false;
            broadcastDirectoryCounts();
        }
        meta.lastState = pkt;
        meta.lastStateMs = Date.now();

        if (typeof pkt.sc === "number" && pkt.sc > 0) {
            mergeLeaderboardEntry(meta.name, pkt.charId || "LUCIA", pkt.sc, meta.color, pkt.econVer || 1);
        }

        // Only overwrite saved player profile when the player has actually started playing & synced!
        if (pkt.started && meta.profileKey && typeof pkt.x === "number" && typeof pkt.y === "number") {
            const clientEconVer = Number(pkt.econVer) || 1;
            const safeCash = clientEconVer >= ECON_VERSION ? Math.round(pkt.sc || 0) : Math.min(500, Math.round(pkt.sc || 500));
            const prevProf = persistentStore.profiles[meta.profileKey] || {};
            persistentStore.profiles[meta.profileKey] = {
                econVer: ECON_VERSION,
                name: meta.name,
                charId: pkt.charId || "LUCIA",
                pedType: pkt.pedType || meta.pedType || "lucia",
                color: pkt.color || meta.color || "#00f0ff",
                cash: safeCash,
                mlt: Math.max(1, Math.min(5, Math.round(pkt.mlt || 1))),
                lvs: Math.max(1, Math.min(9, Math.round(pkt.lvs !== undefined ? pkt.lvs : 3))),
                jfc: Math.max(0, Math.min(9, Math.round(pkt.jfc !== undefined ? pkt.jfc : 1))),
                bnd: Boolean(pkt.bnd),
                msn: Math.max(Number(prevProf.msn) || 0, Math.max(0, Math.min(31, Math.round(pkt.msn || 0)))) | (Math.max(0, Math.min(31, Math.round(pkt.msn || 0)))),
                ank: Boolean(pkt.ank || prevProf.ank),
                hp: Math.round(pkt.hp !== undefined ? pkt.hp : 100),
                armor: Math.round(pkt.ar || 0),
                dead: Boolean(pkt.dead),
                weapon: pkt.wep || "PISTOL",
                weaponsOwned: Array.isArray(pkt.weps) ? pkt.weps.slice(0, 12) : ["FIST", "PISTOL"],
                ammo: (pkt.ammo && typeof pkt.ammo === "object") ? pkt.ammo : null,
                kills: Math.round(pkt.k || 0),
                wl: Math.round(pkt.wl || 0),
                x: Math.round(pkt.x),
                y: Math.round(pkt.y),
                z: Number(pkt.z) || 2.0,
                a: Number(pkt.a) || 0,
                inVehId: (pkt.veh && pkt.veh.id) ? pkt.veh.id : null,
                updatedAt: Date.now()
            };
            isDirty = true;
        }

        // If player was previously driving a vehicle and has now exited or switched vehicles, release the old vehicle on the server!
        const curDrivenId = (pkt.started && pkt.veh && pkt.veh.id && (pkt.veh.seat || 0) === 0) ? pkt.veh.id : null;
        if (meta.lastDrivenVehId && meta.lastDrivenVehId !== curDrivenId) {
            const oldVid = meta.lastDrivenVehId;
            if (room.modifiedVehs && room.modifiedVehs[oldVid] && room.modifiedVehs[oldVid][8] === 4) {
                room.modifiedVehs[oldVid][8] = 0;
                room.modifiedVehs[oldVid][6] = 0;
                room.modifiedVehs[oldVid][7] = 0;
                room.modifiedVehs[oldVid][10] = (room.modifiedVehs[oldVid][10] || 0) & ~2;
                isDirty = true;
            }
            if (room.vehs && room.vehs[oldVid] && room.vehs[oldVid][8] === 4) {
                room.vehs[oldVid][8] = 0;
                room.vehs[oldVid][6] = 0;
                room.vehs[oldVid][7] = 0;
                room.vehs[oldVid][10] = (room.vehs[oldVid][10] || 0) & ~2;
            }
        }
        meta.lastDrivenVehId = curDrivenId;

        // If player is driving a vehicle (seat === 0), persist its pose in room.modifiedVehs!
        if (curDrivenId && typeof pkt.x === "number" && typeof pkt.y === "number" && Number.isFinite(pkt.x) && Number.isFinite(pkt.y)) {
            const v = pkt.veh;
            const safeHp = Math.max(0, Math.round(v.hp !== undefined ? v.hp : 100));
            const flags =
                (safeHp <= 0 ? 1 : 0) |
                (v.siren && safeHp > 0 ? 2 : 0) |
                (v.fDent ? 4 : 0) |
                (v.rDent ? 8 : 0) |
                (v.hDent ? 16 : 0);
            const row = [
                v.id,
                v.specKey || "MINT_STALLION",
                Math.round(pkt.x),
                Math.round(pkt.y),
                Math.round((pkt.z || 2.0) * 100) / 100,
                wrapServerAngle(pkt.a || 0),
                safeHp > 0 ? Math.round(pkt.vx || 0) : 0,
                safeHp > 0 ? Math.round(pkt.vy || 0) : 0,
                safeHp > 0 ? 4 : 0, // Driven (or wrecked)
                safeHp,
                flags,
                v.remapIdx || 0,
                0,
                1 // mod = 1 (persisted player-modified vehicle)
            ];
            room.modifiedVehs[v.id] = row;
            room.modifiedVehTs[v.id] = Date.now();
            room.vehs[v.id] = row;
            isDirty = true;
        }

        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "WORLD_SYNC" && Array.isArray(pkt.vehs)) {
        meta.lastSeen = Date.now();
        // Reject WORLD_SYNC from outdated un-refreshed browser tabs (< MIN_CLIENT_VER) and instruct them to reload!
        if ((Number(pkt.ver) || 0) < MIN_CLIENT_VER) {
            if (!meta.lastForceReloadMs || (Date.now() - meta.lastForceReloadMs) > 4000) {
                meta.lastForceReloadMs = Date.now();
                sendJson(socket, { t: "FORCE_RELOAD", build: CURRENT_BUILD });
            }
            return;
        }
        if (typeof pkt.ver === "number" && pkt.ver > (room.ver || 0)) {
            room.ver = pkt.ver;
        }
        // Dedicated Server is the SOLE 24/7 World Host:
        // Clients NEVER overwrite room.worldMinutes, room.trafficLightTimer, or pause tickAutonomousRoom!
        // Clients only report player-modified vehicles (isMod === 1) and corpses to persist in the world DB.
        const nowMs = Date.now();
        room.updatedAt = nowMs;
        if (!room.modifiedVehs) room.modifiedVehs = {};
        if (!room.modifiedVehTs) room.modifiedVehTs = {};
        const maxVehs = Math.min(pkt.vehs.length, 220);
        for (let i = 0; i < maxVehs; i++) {
            const row = pkt.vehs[i];
            if (!Array.isArray(row) || !row[0]) continue;
            const vid = row[0];
            if (row[2] < 128 || row[3] < 128) {
                delete room.modifiedVehs[vid];
                delete room.modifiedVehTs[vid];
                delete room.vehs[vid];
                continue;
            }
            const isMod = Boolean(row[13]) || Boolean(row[10] & 1); // mod === 1 or destroyed
            if (!isMod) continue;
            if (
                (row[8] !== 0 && row[8] !== 4 && !(row[10] & 1)) ||
                (isTransientResponderRow(vid, row) && row[8] !== 4 && !(row[10] & 1))
            ) {
                delete room.modifiedVehs[vid];
                delete room.modifiedVehTs[vid];
                if (isTransientResponderRow(vid, row) && row[8] === 0 && !(row[10] & 1)) {
                    delete room.vehs[vid];
                }
                continue;
            }
            row[5] = wrapServerAngle(row[5]);
            if (row[10] & 1) {
                row[9] = 0;
                row[8] = 0;
                row[6] = 0;
                row[7] = 0;
                row[10] &= ~2;
            } else if ((row[9] || 0) <= 0) {
                row[9] = 1;
            }
            row[13] = 1;
            if (!room.modifiedVehs[vid] || row[8] !== 0) {
                room.modifiedVehTs[vid] = nowMs;
            }
            room.modifiedVehs[vid] = row;
            room.vehs[vid] = row;
        }
        // Keep all modifiedVehs (capped at 400 most recent, never evicting actively driven cars)
        const modKeys = Object.keys(room.modifiedVehs);
        if (modKeys.length > 400) {
            let oldestVid = null;
            let oldestTs = Infinity;
            for (const mk of modKeys) {
                const mr = room.modifiedVehs[mk];
                if (Array.isArray(mr) && mr[8] === 4) continue;
                const ts = (room.modifiedVehTs && room.modifiedVehTs[mk]) || 0;
                if (ts < oldestTs) {
                    oldestTs = ts;
                    oldestVid = mk;
                }
            }
            if (oldestVid) {
                delete room.modifiedVehs[oldestVid];
                delete room.modifiedVehTs[oldestVid];
            }
        }
        if (Array.isArray(pkt.peds)) {
            if (!room.corpses) room.corpses = {};
            if (!room.corpseTs) room.corpseTs = {};
            const maxPeds = Math.min(pkt.peds.length, 160);
            for (let i = 0; i < maxPeds; i++) {
                const pr = pkt.peds[i];
                if (!Array.isArray(pr) || !pr[0]) continue;
                const pid = pr[0];
                if (pr[9] & 1) {
                    if (!room.corpses[pid]) room.corpseTs[pid] = nowMs;
                    room.corpses[pid] = pr;
                }
            }
            const cKeys = Object.keys(room.corpses);
            if (cKeys.length > 65) {
                const oldCid = cKeys[0];
                delete room.corpses[oldCid];
                delete room.corpseTs[oldCid];
            }
        }
        isDirty = true;
        return;
    }

    if (pkt.t === "WORLD_EVENT") {
        meta.lastSeen = Date.now();
        if (pkt.kind === "VEH_EXIT" && pkt.vehId) {
            if (typeof pkt.x === "number" && typeof pkt.y === "number" && (pkt.x < 128 || pkt.y < 128)) {
                delete room.modifiedVehs[pkt.vehId];
                delete room.modifiedVehTs[pkt.vehId];
                delete room.vehs[pkt.vehId];
                isDirty = true;
                broadcastToRoom(roomCode, pkt, socket);
                return;
            }
            const existing = room.modifiedVehs[pkt.vehId] || room.vehs[pkt.vehId];
            const row = existing ? existing.slice() : [
                pkt.vehId,
                pkt.specKey || "MINT_STALLION",
                Math.round(pkt.x || 0),
                Math.round(pkt.y || 0),
                Math.round((pkt.z || 2.0) * 100) / 100,
                Math.round((pkt.a || 0) * 1000) / 1000,
                0,
                0,
                0,
                Math.round(pkt.hp || 100),
                pkt.flags || 0,
                pkt.remapIdx || 0,
                0,
                1
            ];
            if (typeof pkt.x === "number" && Number.isFinite(pkt.x)) row[2] = Math.round(pkt.x);
            if (typeof pkt.y === "number" && Number.isFinite(pkt.y)) row[3] = Math.round(pkt.y);
            if (typeof pkt.z === "number" && Number.isFinite(pkt.z)) row[4] = Math.round(pkt.z * 100) / 100;
            if (typeof pkt.a === "number" && Number.isFinite(pkt.a)) row[5] = wrapServerAngle(pkt.a);
            row[6] = 0;
            row[7] = 0;
            row[8] = 0; // Parked (no driver)
            if (typeof pkt.hp === "number" && Number.isFinite(pkt.hp)) row[9] = Math.max(0, Math.round(pkt.hp));
            if (typeof pkt.flags === "number" && Number.isFinite(pkt.flags)) row[10] = pkt.flags & ~2;
            if (row[10] & 1) row[9] = 0;
            row[13] = 1; // Permanent modified flag
            room.modifiedVehs[pkt.vehId] = row;
            room.modifiedVehTs[pkt.vehId] = Date.now();
            room.vehs[pkt.vehId] = row;
            isDirty = true;
        } else if (pkt.kind === "VEH_EXPLODE" && pkt.vehId) {
            const existing = room.modifiedVehs[pkt.vehId] || room.vehs[pkt.vehId];
            const row = existing ? existing.slice() : [
                pkt.vehId,
                pkt.specKey || "MINT_STALLION",
                Math.round(pkt.x || 0),
                Math.round(pkt.y || 0),
                Math.round((pkt.z || 2.0) * 100) / 100,
                Math.round((pkt.a || 0) * 1000) / 1000,
                0,
                0,
                0,
                0,
                1,
                pkt.remapIdx || 0,
                0,
                1
            ];
            if (typeof pkt.x === "number") row[2] = Math.round(pkt.x);
            if (typeof pkt.y === "number") row[3] = Math.round(pkt.y);
            row[6] = 0;
            row[7] = 0;
            row[8] = 0;
            row[9] = 0;
            row[10] = (row[10] || 0) | 1; // Destroyed flag
            row[13] = 1;
            room.modifiedVehs[pkt.vehId] = row;
            room.modifiedVehTs[pkt.vehId] = Date.now();
            room.vehs[pkt.vehId] = row;
            isDirty = true;
        } else if (pkt.kind === "PROP_SMASH" && pkt.pType && typeof pkt.x === "number" && typeof pkt.y === "number") {
            const pKey = `${pkt.pType}_${Math.round(pkt.x)}_${Math.round(pkt.y)}`;
            if (Number(pkt.a) < -900) {
                delete room.smashedProps[pKey];
                if (typeof pkt.pType === "string" && pkt.pType.startsWith("CORPSE:") && room.corpses) {
                    if (pkt.pedId && room.corpses[pkt.pedId]) {
                        delete room.corpses[pkt.pedId];
                        if (room.corpseTs) delete room.corpseTs[pkt.pedId];
                    }
                    for (const [cid, crow] of Object.entries(room.corpses)) {
                        if (Array.isArray(crow) && Math.hypot((crow[3] || 0) - pkt.x, (crow[4] || 0) - pkt.y) < 38) {
                            delete room.corpses[cid];
                            if (room.corpseTs) delete room.corpseTs[cid];
                        }
                    }
                }
                isDirty = true;
                broadcastToRoom(roomCode, pkt, socket);
                return;
            }
            room.smashedProps[pKey] = {
                pType: pkt.pType,
                x: Math.round(pkt.x),
                y: Math.round(pkt.y),
                a: Number(pkt.a) || 0,
                ts: Date.now()
            };
            const propKeys = Object.keys(room.smashedProps);
            if (propKeys.length > 400) {
                delete room.smashedProps[propKeys[0]];
            }
            isDirty = true;
        } else if (pkt.kind === "PED_REVIVE") {
            if (room.corpses) {
                if (pkt.pedId && room.corpses[pkt.pedId]) {
                    delete room.corpses[pkt.pedId];
                    if (room.corpseTs) delete room.corpseTs[pkt.pedId];
                }
                if (typeof pkt.x === "number" && typeof pkt.y === "number") {
                    for (const [cid, crow] of Object.entries(room.corpses)) {
                        if (Array.isArray(crow) && Math.hypot((crow[3] || 0) - pkt.x, (crow[4] || 0) - pkt.y) < 38) {
                            delete room.corpses[cid];
                            if (room.corpseTs) delete room.corpseTs[cid];
                        }
                    }
                }
            }
            if (typeof pkt.x === "number" && typeof pkt.y === "number") {
                for (const [pk, pv] of Object.entries(room.smashedProps)) {
                    if (pv && typeof pv.pType === "string" && pv.pType.startsWith("CORPSE:") && Math.hypot((pv.x || 0) - pkt.x, (pv.y || 0) - pkt.y) < 38) {
                        delete room.smashedProps[pk];
                    }
                }
            }
            isDirty = true;
        } else if (pkt.kind === "TURF_TAKEOVER" && pkt.turfKey) {
            if (!room.turfStandings) room.turfStandings = {};
            room.turfStandings[pkt.turfKey] = {
                leaderName: pkt.leaderName || "PLAYER",
                leaderColor: pkt.leaderColor || "#00f0ff",
                leaderScore: Number(pkt.leaderScore) || 600
            };
            isDirty = true;
        } else if (pkt.kind === "TURF_SYNC" && pkt.standings && typeof pkt.standings === "object") {
            if (!room.turfStandings) room.turfStandings = {};
            for (const [tk, ts] of Object.entries(pkt.standings)) {
                if (ts && ts.leaderName && (Number(ts.leaderScore) || 0) > ((room.turfStandings[tk] && room.turfStandings[tk].leaderScore) || 0)) {
                    room.turfStandings[tk] = {
                        leaderName: ts.leaderName,
                        leaderColor: ts.leaderColor || "#00f0ff",
                        leaderScore: Number(ts.leaderScore) || 600
                    };
                    isDirty = true;
                }
            }
        } else if (pkt.kind === "FLASH_DROP_SPAWN" && typeof pkt.x === "number" && typeof pkt.y === "number") {
            room.activeFlashDrop = {
                x: pkt.x,
                y: pkt.y,
                z: pkt.z || 2.0,
                reward: pkt.reward || 800,
                weapon: pkt.weapon || "ROCKET",
                duration: pkt.duration || 90,
                startedAt: Date.now()
            };
        } else if (pkt.kind === "FLASH_DROP_CLAIM") {
            room.activeFlashDrop = null;
        } else if (pkt.kind === "BOUNTY_START" && pkt.targetId) {
            room.activeBounty = {
                targetId: pkt.targetId,
                targetName: pkt.targetName || "PLAYER",
                reward: pkt.reward || 1200,
                duration: pkt.duration || 60,
                startedAt: Date.now()
            };
        } else if (pkt.kind === "VAULT_ROBBED" && pkt.vaultKey) {
            if (!room.robbedVaults) room.robbedVaults = {};
            const cdSec = Math.max(5, Math.min(600, Number(pkt.cooldownSec) || 120));
            room.robbedVaults[String(pkt.vaultKey).slice(0, 80)] = Date.now() + cdSec * 1000;
            isDirty = true;
        } else if (pkt.kind === "GRAFFITI_TAG" && pkt.tag && typeof pkt.tag.x === "number" && typeof pkt.tag.y === "number") {
            if (!room.graffitiTags) room.graffitiTags = {};
            const tKey = `tag_${Math.round(pkt.tag.x)}_${Math.round(pkt.tag.y)}`;
            room.graffitiTags[tKey] = Object.assign({}, pkt.tag, { ts: Date.now() });
            const gKeys = Object.keys(room.graffitiTags);
            if (gKeys.length > 120) {
                delete room.graffitiTags[gKeys[0]];
            }
            isDirty = true;
        } else if (pkt.kind === "SYNDICATE_SCORE" && pkt.syndicate) {
            if (!room.activeFlashDistrict) room.activeFlashDistrict = createFlashDistrictState(0);
            const pts = Math.max(1, Math.min(5000, Math.round(Number(pkt.points) || 100)));
            if (String(pkt.syndicate).toUpperCase() === "CYAN") {
                room.activeFlashDistrict.cyanScore = (room.activeFlashDistrict.cyanScore || 0) + pts;
            } else {
                room.activeFlashDistrict.flamingoScore = (room.activeFlashDistrict.flamingoScore || 0) + pts;
            }
            pkt.flamingoScore = room.activeFlashDistrict.flamingoScore;
            pkt.cyanScore = room.activeFlashDistrict.cyanScore;
        } else if (pkt.kind === "CAR_RESPECT" && pkt.vehId) {
            if (!room.carRespect) room.carRespect = {};
            const vk = String(pkt.vehId).slice(0, 64);
            room.carRespect[vk] = (Number(room.carRespect[vk]) || 0) + 1;
            pkt.count = room.carRespect[vk];
            isDirty = true;
        } else if (pkt.kind === "CREATION_OP" && pkt.op && typeof pkt.op === "object") {
            if (!room.creationOps) room.creationOps = {};
            const op = pkt.op;
            if ((op.x !== undefined && !Number.isFinite(Number(op.x))) || (op.y !== undefined && !Number.isFinite(Number(op.y)))) {
                return;
            }
            if (op.action === "CLEAR_ALL") {
                for (const oldOp of Object.values(room.creationOps)) {
                    if (oldOp && oldOp.action === "SPAWN_VEHICLE" && oldOp.id) {
                        if (room.modifiedVehs) delete room.modifiedVehs[oldOp.id];
                        if (room.modifiedVehTs) delete room.modifiedVehTs[oldOp.id];
                        if (room.vehs) delete room.vehs[oldOp.id];
                    }
                }
                if (room.modifiedVehs) {
                    for (const vid of Object.keys(room.modifiedVehs)) {
                        if (String(vid).startsWith("ce_veh_") || String(vid).startsWith("exp_")) {
                            delete room.modifiedVehs[vid];
                            if (room.modifiedVehTs) delete room.modifiedVehTs[vid];
                            if (room.vehs) delete room.vehs[vid];
                        }
                    }
                }
                room.creationOps = {};
                room.activeCustomMission = null;
                if (roomCode === "VICE26") applyCreationOpToServerMap(op);
                isDirty = true;
            } else if (op.action === "LAUNCH_MISSION" && op.blueprint) {
                room.activeCustomMission = {
                    id: op.id || op.blueprint.id,
                    blueprint: op.blueprint,
                    startedAt: Date.now()
                };
            } else if (op.action === "COMPLETE_MISSION") {
                room.activeCustomMission = null;
            } else if (op.action === "RESTORE_VOXEL_TILE" && op.opKey) {
                const k = String(op.opKey).slice(0, 96);
                delete room.creationOps[k];
                if (roomCode === "VICE26") applyCreationOpToServerMap(op);
                isDirty = true;
            } else if (op.action === "RESTORE_PREEXISTING") {
                if (op.opKey) delete room.creationOps[String(op.opKey).slice(0, 96)];
                if (op.targetId) delete room.creationOps[`rm_${String(op.targetId).slice(0, 92)}`];
                if (roomCode === "VICE26") applyCreationOpToServerMap(op);
                isDirty = true;
            } else if (op.action === "REMOVE" && op.opKey) {
                const k = String(op.opKey).slice(0, 96);
                if (op.isPreExisting) {
                    room.creationOps[k] = Object.assign({}, op, { ts: Date.now() });
                } else {
                    delete room.creationOps[k];
                }
                const targetId = op.targetId || op.opKey;
                if (targetId) {
                    if (room.modifiedVehs && room.modifiedVehs[targetId]) delete room.modifiedVehs[targetId];
                    if (room.modifiedVehTs && room.modifiedVehTs[targetId]) delete room.modifiedVehTs[targetId];
                    if (room.vehs && room.vehs[targetId]) delete room.vehs[targetId];
                    if (room.creationOps[`msn_${targetId}`]) delete room.creationOps[`msn_${targetId}`];
                }
                if (roomCode === "VICE26") applyCreationOpToServerMap(op);
                isDirty = true;
            } else if (op.opKey) {
                const k = String(op.opKey).slice(0, 96);
                room.creationOps[k] = Object.assign({}, op, { ts: Date.now() });
                const keys = Object.keys(room.creationOps);
                if (keys.length > 2500) {
                    delete room.creationOps[keys[0]];
                }
                if (roomCode === "VICE26") {
                    applyCreationOpToServerMap(op);
                }
                if (op.action === "SPAWN_VEHICLE" && op.id && op.specKey) {
                    const vrow = [
                        op.id,
                        op.specKey,
                        Math.round(op.x || 0),
                        Math.round(op.y || 0),
                        2.0,
                        Math.round((Number(op.angle) || 0) * 1000) / 1000,
                        0,
                        0,
                        0,
                        140,
                        0,
                        0,
                        0,
                        1
                    ];
                    if (!room.modifiedVehs) room.modifiedVehs = {};
                    if (!room.modifiedVehTs) room.modifiedVehTs = {};
                    room.modifiedVehs[op.id] = vrow;
                    room.modifiedVehTs[op.id] = Date.now();
                    room.vehs[op.id] = vrow;
                } else if (op.action === "RELOCATE_ENTITY" && op.targetId) {
                    const existingVeh = (room.modifiedVehs && room.modifiedVehs[op.targetId]) || (room.vehs && room.vehs[op.targetId]);
                    if (Array.isArray(existingVeh) && existingVeh.length >= 11) {
                        const uRow = existingVeh.slice();
                        if (typeof op.x === "number") uRow[2] = Math.round(op.x);
                        if (typeof op.y === "number") uRow[3] = Math.round(op.y);
                        if (typeof op.angle === "number") uRow[5] = Math.round(op.angle * 1000) / 1000;
                        uRow[6] = 0;
                        uRow[7] = 0;
                        uRow[13] = 1;
                        if (!room.modifiedVehs) room.modifiedVehs = {};
                        if (!room.modifiedVehTs) room.modifiedVehTs = {};
                        room.modifiedVehs[op.targetId] = uRow;
                        room.modifiedVehTs[op.targetId] = Date.now();
                        room.vehs[op.targetId] = uRow;
                    }
                }
                isDirty = true;
            }
        }
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "CHAT" && pkt.text) {
        const cleanText = String(pkt.text).trim().slice(0, 140);
        if (!cleanText) return;
        const nowMs = Date.now();
        meta.lastSeen = nowMs;
        if (meta.lastChatMs && (nowMs - meta.lastChatMs) < 500) return;
        if (meta.lastChatText && meta.lastChatText.toLowerCase() === cleanText.toLowerCase() && (nowMs - (meta.lastChatMs || 0)) < 4500) return;
        meta.lastChatMs = nowMs;
        meta.lastChatText = cleanText;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        room.chat.push({
            timeStr,
            author: meta.name || pkt.name || "PLAYER",
            color: meta.color || pkt.color || "#00f0ff",
            text: cleanText,
            ts: nowMs
        });
        if (room.chat.length > 30) room.chat.shift();
        isDirty = true;
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "HISCORE") {
        if (mergeLeaderboardEntry(pkt.name || meta.name, pkt.charId, pkt.sc, pkt.color || meta.color, pkt.econVer || 1)) {
            broadcastToRoom(roomCode, {
                t: "LEADERBOARD_SYNC",
                econVer: ECON_VERSION,
                entries: persistentStore.leaderboard
            });
        }
        return;
    }

    if (pkt.t === "LEADERBOARD_SYNC" && Array.isArray(pkt.entries)) {
        let changed = false;
        const pktEconVer = pkt.econVer || 1;
        for (const e of pkt.entries) {
            if (e && e.name && e.score) {
                if (mergeLeaderboardEntry(e.name, e.charId, e.score, e.color, e.econVer || pktEconVer)) {
                    changed = true;
                }
            }
        }
        if (changed) {
            broadcastToRoom(roomCode, {
                t: "LEADERBOARD_SYNC",
                econVer: ECON_VERSION,
                entries: persistentStore.leaderboard
            });
        }
        return;
    }

    if (pkt.t === "KILLED") {
        if (room.activeBounty && (room.activeBounty.targetId === (pkt.victimId || pkt.id) || room.activeBounty.targetName === pkt.victimName)) {
            room.activeBounty = null;
        }
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    broadcastToRoom(roomCode, pkt, socket);
}

/* ============================================================================
   4. HTTP SERVER + WEBSOCKET UPGRADE HANDLER
   ============================================================================ */
const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === "/health" || req.url === "/status" || req.url === "/") {
        const roomSummary = {};
        let activeClientsCount = 0;
        let outdatedTabsCount = 0;
        for (const m of clients.values()) {
            if (m.isOutdated) outdatedTabsCount++;
            else activeClientsCount++;
        }
        for (const [rk, rv] of Object.entries(persistentStore.rooms)) {
            const roomClients = Array.from(clients.values()).filter((m) => m.room === rk && !m.isOutdated);
            const allVehs = Object.values(Object.assign({}, rv.vehs || {}, rv.modifiedVehs || {}));
            const movingVehs = allVehs.filter((row) => Array.isArray(row) && row[8] > 0 && !(row[10] & 1));
            roomSummary[rk] = {
                playersOnline: roomClients.length,
                players: roomClients.map((m) => m.name),
                persistedVehicles: allVehs.length,
                autonomousMovingVehicles: movingVehs.length,
                playerModifiedVehicles: Object.keys(rv.modifiedVehs || {}).length,
                persistedWrecks: allVehs.filter((row) => Array.isArray(row) && (row[10] & 1)).length,
                activePedestrians: Object.keys(rv.peds || {}).length,
                smashedPropsCount: Object.keys(rv.smashedProps || {}).length,
                corpsesCount: Object.keys(rv.corpses || {}).length,
                vaultLockoutsCount: Object.keys(rv.robbedVaults || {}).length,
                turfZonesCount: Object.keys(rv.turfStandings || {}).length,
                creationOpsCount: Object.keys(rv.creationOps || {}).length,
                activeFlashDrop: Boolean(rv.activeFlashDrop),
                activeBounty: Boolean(rv.activeBounty),
                worldMinutes: rv.worldMinutes || 720,
                trafficLightTimer: Math.round((rv.trafficLightTimer || 0) * 100) / 100,
                chatMessages: (rv.chat || []).length
            };
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
            ok: true,
            service: "VICE CITY 26 — Persistent World Server v2 (24/7 Autonomous Living World Engine)",
            build: CURRENT_BUILD,
            minClientVer: MIN_CLIENT_VER,
            econVer: ECON_VERSION,
            uptimeSec: Math.round(process.uptime()),
            autonomousWorldEngine: {
                enabled: true,
                cmpLoaded: Boolean(serverMap && serverMap.cmpLoaded),
                roadTilesIndexed: roadSpawnTiles.length,
                hotspotRoadTilesIndexed: hotspotRoadTiles.length,
                sidewalkTilesIndexed: sidewalkSpawnTiles.length,
                tickRateHz: 10,
                simTickCount: autonomousSimTickCount
            },
            totalPlayersOnline: activeClientsCount,
            outdatedTabsQuarantined: outdatedTabsCount,
            rooms: roomSummary,
            topScores: persistentStore.leaderboard.slice(0, 10),
            savedProfilesCount: Object.keys(persistentStore.profiles).length,
            updatedAt: persistentStore.updatedAt
        }, null, 2));
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (!key) {
        socket.destroy();
        return;
    }
    const accept = crypto
        .createHash("sha1")
        .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "binary")
        .digest("base64");

    socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    socket.setNoDelay(true);

    let initRoom = "VICE26";
    let initId = `p_${Date.now().toString(36)}`;
    let initName = "PLAYER";
    let initVer = 0;
    try {
        const u = new URL(req.url, "http://localhost");
        if (u.searchParams.get("room")) initRoom = u.searchParams.get("room");
        if (u.searchParams.get("id")) initId = u.searchParams.get("id");
        if (u.searchParams.get("name")) initName = u.searchParams.get("name");
        if (u.searchParams.get("ver")) initVer = Number(u.searchParams.get("ver")) || 0;
    } catch (_e) {}

    const { code } = ensureRoom(initRoom);
    const slot = assignRoomSlot(code);
    const meta = {
        playerId: initId,
        name: String(initName).slice(0, 18).toUpperCase(),
        profileKey: String(initName).toUpperCase().replace(/[^A-Z0-9_#]/g, ""),
        color: "#00f0ff",
        pedType: "lucia",
        room: code,
        slot,
        ver: initVer,
        isOutdated: initVer < MIN_CLIENT_VER,
        bots: 0,
        lastSeen: Date.now(),
        lastState: null
    };
    clients.set(socket, meta);
    broadcastDirectoryCounts();

    let rxBuf = Buffer.alloc(0);

    socket.on("data", (chunk) => {
        try {
            rxBuf = Buffer.concat([rxBuf, chunk]);
            if (rxBuf.length > 524288) {
                rxBuf = Buffer.alloc(0);
                socket.destroy();
                return;
            }
            while (rxBuf.length >= 2) {
                const firstByte = rxBuf[0];
                const secondByte = rxBuf[1];
                const opcode = firstByte & 0x0f;
                const isMasked = Boolean(secondByte & 0x80);
                let payloadLen = secondByte & 0x7f;
                let offset = 2;

                if (payloadLen === 126) {
                    if (rxBuf.length < 4) return;
                    payloadLen = rxBuf.readUInt16BE(2);
                    offset = 4;
                } else if (payloadLen === 127) {
                    if (rxBuf.length < 10) return;
                    payloadLen = Number(rxBuf.readBigUInt64BE(2));
                    offset = 10;
                }

                if (payloadLen > 262144) {
                    rxBuf = Buffer.alloc(0);
                    socket.destroy();
                    return;
                }

                const maskLen = isMasked ? 4 : 0;
                const totalFrameLen = offset + maskLen + payloadLen;
                if (rxBuf.length < totalFrameLen) return;

                if (opcode === 0x8) {
                    socket.end();
                    return;
                }

                let payload = rxBuf.subarray(offset + maskLen, totalFrameLen);
                if (isMasked && payloadLen > 0) {
                    const mask = rxBuf.subarray(offset, offset + 4);
                    const unmasked = Buffer.allocUnsafe(payload.length);
                    for (let i = 0; i < payload.length; i++) {
                        unmasked[i] = payload[i] ^ mask[i & 3];
                    }
                    payload = unmasked;
                }
                rxBuf = rxBuf.subarray(totalFrameLen);

                if (opcode === 0x9) {
                    meta.lastSeen = Date.now();
                    const pLen = Math.min(payload.length, 125);
                    const pong = Buffer.allocUnsafe(2 + pLen);
                    pong[0] = 0x8a;
                    pong[1] = pLen;
                    if (pLen > 0) payload.copy(pong, 2, 0, pLen);
                    try { socket.write(pong); } catch (_e) {}
                    continue;
                }

                if (opcode === 0x1) {
                    try {
                        const pkt = JSON.parse(payload.toString("utf8"));
                        handleClientPacket(socket, pkt);
                    } catch (_e) {}
                }
            }
        } catch (_err) {
            rxBuf = Buffer.alloc(0);
        }
    });

    const cleanup = () => {
        const m = clients.get(socket);
        if (m) {
            // Release any vehicle this player was driving so it becomes a parked unoccupied car (drvCode = 0)
            const relVid = m.lastDrivenVehId || (m.lastState && m.lastState.veh && (m.lastState.veh.seat || 0) === 0 && m.lastState.veh.id);
            if (relVid) {
                const { room: r } = ensureRoom(m.room);
                if (r.modifiedVehs[relVid] && r.modifiedVehs[relVid][8] === 4) {
                    r.modifiedVehs[relVid][8] = 0;
                    r.modifiedVehs[relVid][6] = 0;
                    r.modifiedVehs[relVid][7] = 0;
                    r.modifiedVehs[relVid][10] = (r.modifiedVehs[relVid][10] || 0) & ~2;
                    isDirty = true;
                }
                if (r.vehs[relVid] && r.vehs[relVid][8] === 4) {
                    r.vehs[relVid][8] = 0;
                    r.vehs[relVid][6] = 0;
                    r.vehs[relVid][7] = 0;
                    r.vehs[relVid][10] = (r.vehs[relVid][10] || 0) & ~2;
                    isDirty = true;
                }
            }
            const { room: mRoom } = ensureRoom(m.room);
            if (mRoom.activeBounty && mRoom.activeBounty.targetId === m.playerId) {
                mRoom.activeBounty = null;
            }
            clients.delete(socket);
            broadcastToRoom(m.room, { t: "LEAVE", id: m.playerId, name: m.name }, socket);
            broadcastDirectoryCounts();
        }
    };
    socket.on("close", cleanup);
    socket.on("error", cleanup);
});

/* ============================================================================
   5. 24/7 AUTONOMOUS SERVER-SIDE LIVING WORLD ENGINE (10 HZ / 100MS TICK)
   - Runs continuously on the Dedicated Server even when 0 players are online!
   - Drives 115+ persistent vehicles along the real 512x512x6 .CMP road network,
     obeying traffic lights, intersection turns, bridges, and bumper spacing.
   - Dispatches & returns Municipal EMS Ambulances (ems_hq), VCFD Fire Engines (vcfd_hq),
     Tow Trucks (tow_hq), and VCPD Patrol Cruisers (vcpd_hq) autonomously.
   - Advances 64+ sidewalk pedestrians along .CMP sidewalks and crosswalks.
   ============================================================================ */
const SERVER_SPEC_POOL = [
    "HARLEY_BIKE", "SUPERBIKE", "E_SCOOTER", "BMX_BIKE", "VICE_CAB",
    "BANSHEE_GT", "PENETRATOR_GT", "PORKA_TURBO", "COSSIE_RS", "STINGER_CABRIO",
    "TURISMO_CABRIO", "MINT_STALLION", "SILVER_ROADSTER", "VICE_CHEETAH",
    "TULIP_MUSCLE", "CHALLENGER_RT", "FJORD_FASTBACK", "REGAL_SEDAN",
    "BEETLE_BUG", "MUNDANO_WAGON", "LELAND_SEDAN", "MICRO_KART", "MONSTER_BUGGY",
    "GATOR_4X4", "PICKUP_TRUCK", "CAMPER_PICKUP", "BOXVILLE_VAN", "HOTDOG_VAN"
];

const SERVER_STARTER_TRAFFIC = [
    { id: "parked_0", spec: "STINGER_CABRIO", c: 217.5, r: 136.5, a: -Math.PI * 0.5 },
    { id: "parked_1", spec: "TURISMO_CABRIO", c: 214.5, r: 138.5, a: Math.PI * 0.5 },
    { id: "parked_2", spec: "TULIP_MUSCLE", c: 216.5, r: 143.5, a: -Math.PI * 0.5 },
    { id: "parked_3", spec: "SUPERBIKE", c: 216.5, r: 141.5, a: -Math.PI * 0.5 },
    { id: "parked_4", spec: "HARLEY_BIKE", c: 215.5, r: 148.5, a: Math.PI * 0.5 },
    { id: "parked_5", spec: "BANSHEE_GT", c: 217.5, r: 158.5, a: -Math.PI * 0.5 },
    { id: "parked_6", spec: "CHALLENGER_RT", c: 206.5, r: 143.5, a: -Math.PI * 0.5 },
    { id: "parked_7", spec: "PORKA_TURBO", c: 207.5, r: 150.5, a: -Math.PI * 0.5 },
    { id: "parked_8", spec: "SUPERBIKE", c: 216.5, r: 148.5, a: -Math.PI * 0.5 },
    { id: "parked_9", spec: "HARLEY_BIKE", c: 214.5, r: 142.5, a: Math.PI * 0.5 },
    { id: "parked_10", spec: "STINGER_CABRIO", c: 217.5, r: 152.5, a: -Math.PI * 0.5 },
    { id: "parked_11", spec: "BANSHEE_GT", c: 216.5, r: 145.5, a: -Math.PI * 0.5 },
    { id: "parked_12", spec: "VICE_CAB", c: 215.5, r: 144.5, a: Math.PI * 0.5 },
    { id: "parked_13", spec: "CHALLENGER_RT", c: 216.5, r: 155.5, a: -Math.PI * 0.5 },
    { id: "parked_14", spec: "VCPD_CRUISER", c: 214.5, r: 154.5, a: Math.PI * 0.5 },
    { id: "parked_15", spec: "REGAL_SEDAN", c: 204.5, r: 147.5, a: Math.PI * 0.5 },
    { id: "parked_19", spec: "TURISMO_CABRIO", c: 208.5, r: 106.5, a: 0 },
    { id: "parked_20", spec: "STRETCH_LIMO", c: 214.5, r: 47.5, a: Math.PI * 0.5 },
    { id: "parked_21", spec: "PENETRATOR_GT", c: 214.5, r: 50.0, a: Math.PI * 0.5 },
    { id: "parked_28", spec: "SUPERBIKE", c: 141.5, r: 116.5, a: Math.PI * 0.5 },
    { id: "parked_30", spec: "HARLEY_BIKE", c: 116.5, r: 82.5, a: Math.PI * 0.5 },
    { id: "parked_41", spec: "STINGER_CABRIO", c: 231.0, r: 480.5, a: -Math.PI, raw512: true },
    { id: "parked_42", spec: "BANSHEE_GT", c: 446.5, r: 215.5, a: -Math.PI * 0.5, raw512: true },
    { id: "parked_43", spec: "TURISMO_CABRIO", c: 445.5, r: 280.5, a: Math.PI * 0.5, raw512: true },
    { id: "parked_44", spec: "STINGER_CABRIO", c: 395.5, r: 297.5, a: 0, raw512: true },
    { id: "parked_45", spec: "CHALLENGER_RT", c: 285.5, r: 215.5, a: Math.PI * 0.5, raw512: true },
    { id: "micromob_0", spec: "E_SCOOTER", c: 214.5, r: 145.8, a: Math.PI * 0.5 },
    { id: "micromob_1", spec: "BMX_BIKE", c: 215.5, r: 151.8, a: Math.PI * 0.5 },
    { id: "micromob_2", spec: "E_SCOOTER", c: 217.5, r: 143.2, a: -Math.PI * 0.5 },
    { id: "micromob_3", spec: "BMX_BIKE", c: 216.5, r: 152.4, a: -Math.PI * 0.5 },
    { id: "micromob_4", spec: "E_SCOOTER", c: 215.5, r: 138.0, a: Math.PI * 0.5 },
    { id: "micromob_5", spec: "BMX_BIKE", c: 216.5, r: 158.0, a: -Math.PI * 0.5 },
    { id: "micromob_6", spec: "E_SCOOTER", c: 207.5, r: 146.0, a: -Math.PI * 0.5 },
    { id: "micromob_7", spec: "E_SCOOTER", c: 217.5, r: 146.8, a: -Math.PI * 0.5 },
    { id: "micromob_8", spec: "BMX_BIKE", c: 217.5, r: 150.2, a: -Math.PI * 0.5 },
    { id: "micromob_9", spec: "E_SCOOTER", c: 214.5, r: 149.2, a: Math.PI * 0.5 },
    { id: "micromob_10", spec: "BMX_BIKE", c: 214.5, r: 135.5, a: Math.PI * 0.5 }
];

function getServerVehicleCruiseSpeed(specKey, drvCode, sirenActive, vid = "") {
    let h = 2166136261;
    const s = String(vid || specKey || "0");
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
    }
    const u = h / 4294967295; // [0.0 .. 1.0] per-vehicle driver personality spread
    if (specKey === "BMX_BIKE") return Math.round(50 + u * 15);
    if (specKey === "E_SCOOTER") return Math.round(62 + u * 16);
    if (sirenActive || drvCode === 2 || drvCode === 3) return Math.round(148 + u * 28);
    if (drvCode === 5) return Math.round(162 + u * 30);
    if (drvCode === 6 || specKey === "TOW_TRUCK") return Math.round(88 + u * 16);
    if (specKey === "CITY_BUS" || specKey === "TOUR_COACH" || specKey === "TANKER_RIG" || specKey === "FLATBED_TRUCK") {
        return Math.round(76 + u * 18);
    }
    if (specKey === "BRINKS_TRUCK" || specKey === "BOXVILLE_VAN" || specKey === "HOTDOG_VAN" || specKey === "CAMPER_PICKUP") {
        return Math.round(86 + u * 20);
    }
    if (
        specKey === "SUPERBIKE" ||
        specKey === "PENETRATOR_GT" ||
        specKey === "VICE_CHEETAH" ||
        specKey === "BANSHEE_GT" ||
        specKey === "PORKA_TURBO" ||
        specKey === "STINGER_CABRIO" ||
        specKey === "TURISMO_CABRIO"
    ) {
        return Math.round(148 + u * 38);
    }
    if (
        specKey === "HARLEY_BIKE" ||
        specKey === "COSSIE_RS" ||
        specKey === "CHALLENGER_RT" ||
        specKey === "MINT_STALLION" ||
        specKey === "FJORD_FASTBACK" ||
        specKey === "TULIP_MUSCLE" ||
        specKey === "MONSTER_BUGGY"
    ) {
        return Math.round(126 + u * 30);
    }
    if (specKey === "VICE_CAB" || specKey === "VCPD_CRUISER" || specKey === "PICKUP_TRUCK" || specKey === "GATOR_4X4" || specKey === "SILVER_ROADSTER") {
        return Math.round(112 + u * 26);
    }
    return Math.round(96 + u * 26);
}

function ensureRoomAutonomousPopulation(roomCode, room) {
    if (!serverMap || !serverMap.cmpLoaded) return;
    if (!room.vehs) room.vehs = {};
    if (!room.peds) room.peds = {};
    if (!room.vehNav) room.vehNav = {};
    if (!room.pedNav) room.pedNav = {};
    if (room.modifiedVehs) {
        for (const [mvid, mrow] of Object.entries(room.modifiedVehs)) {
            if (!Array.isArray(mrow) || (mrow[8] !== 0 && mrow[8] !== 4 && !(mrow[10] & 1))) {
                delete room.modifiedVehs[mvid];
                if (room.modifiedVehTs) delete room.modifiedVehTs[mvid];
            }
        }
    }
    const TS = global.TILE_SIZE || 64;

    // 1. Seed starter Ocean Drive / Collins Ave / Española Way moving vehicles if missing
    for (let i = 0; i < SERVER_STARTER_TRAFFIC.length; i++) {
        const st = SERVER_STARTER_TRAFFIC[i];
        if (room.vehs[st.id] || (room.modifiedVehs && room.modifiedVehs[st.id])) continue;
        const bx = Math.floor(st.raw512 ? st.c : global.mx256(st.c));
        const by = Math.floor(st.raw512 ? st.r : global.my256(st.r));
        const vx = (bx + 0.5) * TS;
        const vy = (by + 0.5) * TS;
        const vz = serverMap.getHeightAtPixel(vx, vy, 4.0);
        const navSt = serverMap.getNavigationBlock ? serverMap.getNavigationBlock(bx, by, vz) : null;
        const lidSt = serverMap.getBlockInfo ? serverMap.getBlockInfo(bx, by, 1).lid : 0;
        const isValidCruiseLane = Boolean(
            navSt &&
            navSt.groundType === global.GROUND_TYPE.ROAD &&
            !navSt.isRailway &&
            !navSt.isParkingBay &&
            (!serverMap.surfaceGround || serverMap.surfaceGround[by * 512 + bx] === global.GROUND_TYPE.ROAD) &&
            lidSt !== 25
        );
        const ang = (isValidCruiseLane && serverMap.getAlignedRoadAngle) ? serverMap.getAlignedRoadAngle(bx, by, st.a, vz) : st.a;
        const drvSt = isValidCruiseLane ? 1 : 0;
        const spd = drvSt === 1 ? getServerVehicleCruiseSpeed(st.spec, 1, false, st.id) : 0;
        room.vehs[st.id] = [
            st.id,
            st.spec,
            Math.round(vx),
            Math.round(vy),
            Math.round(vz * 100) / 100,
            Math.round(ang * 1000) / 1000,
            Math.round(Math.cos(ang) * spd),
            Math.round(Math.sin(ang) * spd),
            drvSt,
            100,
            0,
            i % 6,
            0,
            0
        ];
    }

    // 2. Seed cmp_car_0..71 from gta1_meta.json startup_cars if missing
    if (serverMapMeta && Array.isArray(serverMapMeta.startup_cars)) {
        const count = Math.min(72, serverMapMeta.startup_cars.length);
        for (let i = 0; i < count; i++) {
            const vid = `cmp_car_${i}`;
            if (room.vehs[vid] || (room.modifiedVehs && room.modifiedVehs[vid])) continue;
            const sc = serverMapMeta.startup_cars[i];
            const bx = Math.floor(sc.x);
            const by = Math.floor(sc.y);
            if (bx < 2 || bx >= 510 || by < 2 || by >= 510) continue;
            if (serverMap.surfaceGround && serverMap.surfaceGround[by * 512 + bx] !== global.GROUND_TYPE.ROAD) continue;
            if (serverMap.isRestrictedNoTrafficZone && serverMap.isRestrictedNoTrafficZone(bx, by)) continue;
            const lidZ1 = serverMap.getBlockInfo ? serverMap.getBlockInfo(bx, by, 1).lid : 0;
            if (lidZ1 === 25) continue;
            const vx = (bx + 0.5) * TS;
            const vy = (by + 0.5) * TS;
            const vz = serverMap.getHeightAtPixel(vx, vy, 4.0);
            const spec = SERVER_SPEC_POOL[i % SERVER_SPEC_POOL.length];
            const rawAng = sc.ang !== undefined ? sc.ang : (((sc.rot || 0) / 1024.0) * Math.PI * 2);
            const ang = serverMap.getAlignedRoadAngle ? serverMap.getAlignedRoadAngle(bx, by, rawAng, vz) : rawAng;
            const spd = getServerVehicleCruiseSpeed(spec, 1, false, vid);
            room.vehs[vid] = [
                vid,
                spec,
                Math.round(vx),
                Math.round(vy),
                Math.round(vz * 100) / 100,
                Math.round(ang * 1000) / 1000,
                Math.round(Math.cos(ang) * spd),
                Math.round(Math.sin(ang) * spd),
                1,
                100,
                0,
                i % 6,
                0,
                0
            ];
        }
    }

    // 3. Seed Dedicated Municipal & City Service Patrols (8 VCPD Cruisers, 1 Transit Bus, 8 Vice Cabs, 1 Brinks Armored Truck)
    const serviceRoster = [
        { prefix: "srv_cop_", count: 8, spec: "VCPD_CRUISER", drv: 1, hp: 140 },
        { prefix: "srv_bus_", count: 1, spec: "CITY_BUS", drv: 1, hp: 180 },
        { prefix: "srv_cab_", count: 8, spec: "VICE_CAB", drv: 1, hp: 110 },
        { prefix: "srv_brinks_", count: 1, spec: "BRINKS_TRUCK", drv: 1, hp: 220 }
    ];
    // Clean up any legacy excess buses or heavy trucks from persisted room state
    for (let bIdx = 1; bIdx < 8; bIdx++) {
        delete room.vehs[`srv_bus_${bIdx}`];
        if (room.modifiedVehs) delete room.modifiedVehs[`srv_bus_${bIdx}`];
        if (bIdx >= 1 && bIdx < 5) {
            delete room.vehs[`srv_brinks_${bIdx}`];
            if (room.modifiedVehs) delete room.modifiedVehs[`srv_brinks_${bIdx}`];
        }
    }
    for (const [vid, row] of Object.entries(room.vehs)) {
        if (Array.isArray(row) && vid !== "srv_bus_0" && (row[1] === "CITY_BUS" || row[1] === "TOUR_COACH" || row[1] === "TANKER_RIG" || row[1] === "FLATBED_TRUCK")) {
            row[1] = "REGAL_SEDAN";
        }
    }
    const tilePool = hotspotRoadTiles.length > 0 ? hotspotRoadTiles : roadSpawnTiles;
    if (tilePool.length > 0) {
        let seedIdx = 7;
        for (const sr of serviceRoster) {
            for (let k = 0; k < sr.count; k++) {
                const vid = `${sr.prefix}${k}`;
                if (room.vehs[vid] || (room.modifiedVehs && room.modifiedVehs[vid])) continue;
                const spot = tilePool[(seedIdx * 37 + k * 53) % tilePool.length];
                seedIdx++;
                const vx = (spot.bx + 0.5) * TS;
                const vy = (spot.by + 0.5) * TS;
                const spd = getServerVehicleCruiseSpeed(sr.spec, sr.drv, false, vid);
                room.vehs[vid] = [
                    vid,
                    sr.spec,
                    Math.round(vx),
                    Math.round(vy),
                    Math.round(spot.z * 100) / 100,
                    Math.round(spot.angle * 1000) / 1000,
                    Math.round(Math.cos(spot.angle) * spd),
                    Math.round(Math.sin(spot.angle) * spd),
                    sr.drv,
                    sr.hp,
                    0,
                    k % 4,
                    0,
                    0
                ];
            }
        }
    }

    // 4. Seed 64 Autonomous Sidewalk Pedestrians across Ocean Drive, South Beach, Española Way, Downtown & Little Cuba
    if (sidewalkSpawnTiles.length > 0 && Object.keys(room.peds).length < 48) {
        const pedTypes = [
            "civ0", "civ1", "civ2", "civ3", "bikini_pink", "bikini_cyan", "bikini_yellow",
            "surfer_guy", "beach_guy_red", "vc_tourist", "vc_jogger", "vc_crockett", "vc_tubbs",
            "g2_civ_aqua", "g2_civ_pink", "vc_cuban", "vc_haitian"
        ];
        const cardAngles = [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5];
        for (let i = 0; i < 64; i++) {
            const pid = `ped_init_${i}`;
            if (room.peds[pid]) continue;
            const tile = sidewalkSpawnTiles[(i * 29 + 11) % sidewalkSpawnTiles.length];
            const px = (tile.bx + 0.5) * TS;
            const py = (tile.by + 0.5) * TS;
            const ang = cardAngles[i % 4];
            const gType = pedTypes[i % pedTypes.length];
            const spd = gType === "vc_jogger" ? 38 : 25;
            room.peds[pid] = [
                pid,
                0, // CIVILIAN
                gType,
                Math.round(px),
                Math.round(py),
                Math.round(tile.z * 100) / 100,
                Math.round(ang * 100) / 100,
                spd,
                35,
                0,
                0,
                0
            ];
        }
    }
}

function getStationCoords(serviceType) {
    const TS = global.TILE_SIZE || 64;
    if (serverMap && Array.isArray(serverMap.emergencyStations)) {
        const st = serverMap.emergencyStations.find((s) => s.type === serviceType);
        if (st) return st;
    }
    if (serviceType === "MEDIC") return { id: "ems_hq", x: 421.5 * TS, y: 252.5 * TS };
    if (serviceType === "FIRE") return { id: "vcfd_hq", x: 421.5 * TS, y: 304.5 * TS };
    if (serviceType === "TOW") return { id: "tow_hq", x: 333.2 * TS, y: 306.5 * TS };
    return { id: "vcpd_hq", x: 425.5 * TS, y: 266.5 * TS };
}

function snapStationToNearestRoad(wx, wy) {
    const TS = global.TILE_SIZE || 64;
    const baseBx = Math.floor(wx / TS);
    const baseBy = Math.floor(wy / TS);
    for (let r = 0; r <= 8; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const bx = baseBx + dx;
                const by = baseBy + dy;
                if (bx < 2 || bx >= 510 || by < 2 || by >= 510) continue;
                const nav = serverMap.getNavigationBlock(bx, by, 2.0);
                const surfOk = !serverMap.surfaceGround || serverMap.surfaceGround[by * 512 + bx] === global.GROUND_TYPE.ROAD;
                if (nav && nav.groundType === global.GROUND_TYPE.ROAD && !nav.isParkingBay && !nav.isRailway && surfOk) {
                    const dirs = serverMap.getAllowedRoadDirections(bx, by, 2.0);
                    const ang = dirs.length > 0 ? dirs[0].angle : 0;
                    const rx = (bx + 0.5) * TS;
                    const ry = (by + 0.5) * TS;
                    return { x: rx, y: ry, z: serverMap.getHeightAtPixel(rx, ry, 4.0), angle: ang };
                }
            }
        }
    }
    return { x: wx, y: wy, z: 2.0, angle: 0 };
}

/* ============================================================================
   PERMANENT MUNICIPAL FLEET (EMS / VCFD / TOW)
   Units are seeded ONCE, parked at their depot, persist across restarts, drive out on
   a call and drive back to park again. They are never created or deleted per mission.
   ============================================================================ */
const FLEET_DEFS = {
    EMS:  { spec: "MEDIC_AMBULANCE", station: "MEDIC", count: 8, hp: 160, drv: 3 },
    FIRE: { spec: "FIRE_TRUCK",      station: "FIRE",  count: 5, hp: 220, drv: 3 },
    TOW:  { spec: "TOW_TRUCK",       station: "TOW",   count: 6, hp: 180, drv: 6 }
};

function fleetUnitId(role, k) {
    return `fleet_${role.toLowerCase()}_${k}`;
}

function findFleetParkingSpot(stationType, used) {
    const TS = global.TILE_SIZE || 64;
    const st = getStationCoords(stationType);
    const baseBx = Math.floor(st.x / TS);
    const baseBy = Math.floor(st.y / TS);
    let best = null;
    for (let r = 0; r <= 14 && !best; r++) {
        for (let dy = -r; dy <= r && !best; dy++) {
            for (let dx = -r; dx <= r && !best; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const bx = baseBx + dx;
                const by = baseBy + dy;
                if (bx < 2 || bx >= 510 || by < 2 || by >= 510) continue;
                const nav = serverMap.getNavigationBlock(bx, by, 2.0);
                if (!nav || nav.groundType !== global.GROUND_TYPE.ROAD || !nav.isParkingBay) continue;
                const px = (bx + 0.5) * TS;
                const py = (by + 0.5) * TS;
                if (used.some((u) => Math.hypot(u.x - px, u.y - py) < 40)) continue;
                best = { x: px, y: py, z: serverMap.getHeightAtPixel(px, py, 2.0), angle: Math.PI * 0.5 };
            }
        }
    }
    if (best) return best;
    // Fallback: spread units along the nearest road tiles around the depot
    for (let k = 0; k < 60; k++) {
        const sp = snapStationToNearestRoad(st.x + (k % 10) * TS * 1.0, st.y + Math.floor(k / 10) * TS * 1.0);
        if (!used.some((u) => Math.hypot(u.x - sp.x, u.y - sp.y) < 40)) return sp;
    }
    return snapStationToNearestRoad(st.x, st.y);
}

function ensureFleetParked(room) {
    if (!room.fleetHome || room.fleetHomeVer !== 2) {
        // v2: every unit of every depot gets its own unique bay (no overlaps between EMS / VCFD / TOW)
        room.fleetHome = {};
        room.fleetHomeVer = 2;
        for (const id of Object.keys(room.vehs)) {
            if (id.startsWith("fleet_")) {
                const row = room.vehs[id];
                if (Array.isArray(row) && row[8] === 0) delete room.vehs[id]; // idle units are re-created at their new bay
            }
        }
        isDirty = true;
    }
    const used = [];
    for (const h of Object.values(room.fleetHome)) used.push(h);
    for (const [role, def] of Object.entries(FLEET_DEFS)) {
        for (let k = 0; k < def.count; k++) {
            const id = fleetUnitId(role, k);
            if (!room.fleetHome[id]) {
                const sp = findFleetParkingSpot(def.station, used);
                room.fleetHome[id] = { x: Math.round(sp.x), y: Math.round(sp.y), z: Math.round((sp.z || 2.0) * 100) / 100, angle: Math.round((sp.angle || 0) * 1000) / 1000 };
                used.push(room.fleetHome[id]);
                isDirty = true;
            }
            if (!room.vehs[id] || (Array.isArray(room.vehs[id]) && (room.vehs[id][10] & 1))) {
                const h = room.fleetHome[id];
                room.vehs[id] = [id, def.spec, h.x, h.y, h.z, h.angle, 0, 0, 0, def.hp, 0, k % 4, 0, 0];
                if (room.vehNav) delete room.vehNav[id];
                isDirty = true;
            }
        }
    }
}

function parkFleetUnit(room, id) {
    const row = room.vehs[id];
    const h = room.fleetHome && room.fleetHome[id];
    if (!Array.isArray(row) || !h) return;
    let maxHp = 180;
    if (String(id).startsWith("fleet_ems_")) maxHp = FLEET_DEFS.EMS.hp;
    else if (String(id).startsWith("fleet_fire_")) maxHp = FLEET_DEFS.FIRE.hp;
    else if (String(id).startsWith("fleet_tow_")) maxHp = FLEET_DEFS.TOW.hp;
    row[2] = h.x; row[3] = h.y; row[4] = h.z; row[5] = wrapServerAngle(h.angle);
    row[6] = 0; row[7] = 0; row[8] = 0;
    row[9] = maxHp;
    row[10] = 0; // Repair dents & turn siren off at depot
    if (room.vehNav) delete room.vehNav[id];
    isDirty = true;
}

function launchFleetUnit(room, role, targetId, goalX, goalY) {
    const def = FLEET_DEFS[role];
    if (!def || !room.fleetHome) return false;
    for (let k = 0; k < def.count; k++) {
        const id = fleetUnitId(role, k);
        const row = room.vehs[id];
        const nav = room.vehNav[id];
        if (!Array.isArray(row) || row[8] !== 0 || (nav && nav.role) || (row[10] & 1)) continue;
        const h = room.fleetHome[id];
        row[8] = def.drv;
        row[10] = (row[10] || 0) | 2;
        row[6] = 0; row[7] = 0;
        room.vehNav[id] = {
            role,
            phase: "TO_SCENE",
            targetId,
            targetBx: null,
            targetBy: null,
            turnedInIntersection: false,
            entryAngle: row[5],
            goalX: goalX,
            goalY: goalY,
            homeX: h.x,
            homeY: h.y,
            workTimer: 0,
            turnSeed: 0.37 + k * 0.07
        };
        return true;
    }
    return false;
}

function tickAutonomousRoom(roomCode, room, dt = 0.10) {
    if (!serverMap || !serverMap.cmpLoaded) return;
    ensureRoomAutonomousPopulation(roomCode, room);
    ensureFleetParked(room);

    const nowMs = Date.now();
    const TS = global.TILE_SIZE || 64;

    // 1. Advance traffic lights (24s cycle) and 24-hour world clock continuously on the Dedicated Server 24/7
    // Asymmetric Arcade 24h Cycle (~14 min real time: 1.50 min/s Day, 1.15 min/s Golden/Sunset, 2.70 min/s Night, 1.65 min/s Dawn)
    room.trafficLightTimer = ((room.trafficLightTimer || 0) + dt) % 24.0;
    const prevHr = (((room.worldMinutes % 1440) + 1440) % 1440) / 60.0;
    let srvClockRate = 1.50;
    if (prevHr >= 20.25 || prevHr < 5.25) srvClockRate = 2.70;
    else if (prevHr >= 16.0 && prevHr < 20.25) srvClockRate = 1.15;
    else if (prevHr >= 5.25 && prevHr < 7.75) srvClockRate = 1.65;
    room.worldMinutes = Math.round((((room.worldMinutes || 720) + dt * srvClockRate) % 1440) * 100) / 100;

    if (!room.vehNav) room.vehNav = {};
    if (!room.pedNav) room.pedNav = {};

    // 2. Build 128x128 spatial hash (256px cells) of all vehicles AND online players so autonomous server traffic obeys safe bumper spacing
    const cellBuckets = new Map();
    const allVehEntries = Object.entries(room.vehs);
    for (let i = 0; i < allVehEntries.length; i++) {
        const vrow = allVehEntries[i][1];
        if (!Array.isArray(vrow)) continue;
        const cx = vrow[2] >> 8;
        const cy = vrow[3] >> 8;
        const key = (cy << 8) | cx;
        let b = cellBuckets.get(key);
        if (!b) {
            b = [];
            cellBuckets.set(key, b);
        }
        b.push(vrow);
    }
    for (const meta of clients.values()) {
        if (meta.room === roomCode && !meta.isOutdated && meta.lastState && meta.lastState.started && (nowMs - (meta.lastStateMs || 0)) < 8000) {
            const st = meta.lastState;
            if (typeof st.x === "number" && typeof st.y === "number") {
                const cx = st.x >> 8;
                const cy = st.y >> 8;
                const key = (cy << 8) | cx;
                let b = cellBuckets.get(key);
                if (!b) {
                    b = [];
                    cellBuckets.set(key, b);
                }
                b.push([meta.playerId, "PLAYER", st.x, st.y, st.z || 2.0, st.a || 0, st.vx || 0, st.vy || 0]);
            }
        }
    }

    // 3. Autonomous Municipal Dispatch & Spec-Ops Hot Drop Check (every 1.0s = 10 ticks, 100% Server-Authoritative)
    room._dispatchTick = ((room._dispatchTick || 0) + 1) % 10;
    if (room._dispatchTick === 0) {
        // 3-0A. Autonomous 3-Minute Flash District Social Magnet Rotation (100% Server-Authoritative)
        if (!room.activeFlashDistrict) {
            room.activeFlashDistrict = createFlashDistrictState(0);
        } else if ((nowMs - (room.activeFlashDistrict.startedAt || 0)) >= (room.activeFlashDistrict.duration || 180) * 1000) {
            const nextIdx = ((room.activeFlashDistrict.index || 0) + 1) % FLASH_DISTRICTS.length;
            room.activeFlashDistrict = createFlashDistrictState(nextIdx);
            broadcastToRoom(roomCode, {
                t: "WORLD_EVENT",
                kind: "FLASH_DISTRICT_SYNC",
                district: room.activeFlashDistrict
            });
            // Force a Hot Drop Crate in the new Flash District right away to pull players together!
            room._flashDropCooldown = 0;
        }

        // 3-0. Autonomous Spec-Ops Hot Drop Crate Spawner (focused inside the active Flash District Magnet!)
        room._flashDropCooldown = Math.max(0, (room._flashDropCooldown !== undefined ? room._flashDropCooldown : 90) - 1.0);
        if (!room.activeFlashDrop && room._flashDropCooldown <= 0 && hotspotRoadTiles.length > 0) {
            room._flashDropCooldown = 180;
            const fd = room.activeFlashDistrict || FLASH_DISTRICTS[0];
            const isClearDropTile = (t) => {
                const tx = (t.bx + 0.5) * TS;
                const ty = (t.by + 0.5) * TS;
                if (serverMap.resolveCircleBuildingCollision && serverMap.resolveCircleBuildingCollision(tx, ty, 18, t.z || 2.0).hit) return false;
                return true;
            };
            const nearTiles = hotspotRoadTiles.filter((t) => Math.hypot((t.bx + 0.5) * TS - fd.x, (t.by + 0.5) * TS - fd.y) < 1500 && isClearDropTile(t));
            const pool = nearTiles.length > 0 ? nearTiles : hotspotRoadTiles.filter(isClearDropTile);
            const tile = (pool.length > 0 ? pool : hotspotRoadTiles)[Math.floor(Math.random() * (pool.length > 0 ? pool.length : hotspotRoadTiles.length))];
            const wx = Math.round((tile.bx + 0.5) * TS);
            const wy = Math.round((tile.by + 0.5) * TS);
            const wz = Math.round((tile.z || 2.0) * 100) / 100;
            const wepPool = ["ROCKET", "FLAMETHROWER", "ELECTRO", "SHOTGUN"];
            const wep = wepPool[Math.floor(Math.random() * wepPool.length)];
            room.activeFlashDrop = {
                x: wx,
                y: wy,
                z: wz,
                reward: 800,
                weapon: wep,
                duration: 90,
                startedAt: nowMs
            };
            broadcastToRoom(roomCode, {
                t: "WORLD_EVENT",
                kind: "FLASH_DROP_SPAWN",
                x: wx,
                y: wy,
                z: wz,
                reward: 800,
                weapon: wep,
                duration: 90
            });
        }
        // 3-0B. Sanitize any invalid/corrupted vehicle rows (NaN/null coordinates or < 128px) and release orphaned player-driven (drv=4) cars
        const activeDrivenVehIds = new Set();
        for (const meta of clients.values()) {
            if (meta.room === roomCode && !meta.isOutdated && meta.lastDrivenVehId) {
                activeDrivenVehIds.add(meta.lastDrivenVehId);
            }
        }
        for (const [vid, vrow] of Object.entries(room.vehs)) {
            if (
                !Array.isArray(vrow) ||
                vrow.length < 11 ||
                !Number.isFinite(vrow[2]) ||
                !Number.isFinite(vrow[3]) ||
                vrow[2] < 128 ||
                vrow[3] < 128 ||
                !Number.isFinite(vrow[5])
            ) {
                delete room.vehs[vid];
                if (room.modifiedVehs) delete room.modifiedVehs[vid];
                if (room.modifiedVehTs) delete room.modifiedVehTs[vid];
                if (room.vehNav) delete room.vehNav[vid];
                isDirty = true;
                continue;
            }
            if (vrow[8] === 4 && !activeDrivenVehIds.has(vid)) {
                vrow[8] = 0;
                vrow[6] = 0;
                vrow[7] = 0;
                vrow[10] = (vrow[10] || 0) & ~2;
                if (room.modifiedVehs && room.modifiedVehs[vid]) {
                    room.modifiedVehs[vid][8] = 0;
                    room.modifiedVehs[vid][6] = 0;
                    room.modifiedVehs[vid][7] = 0;
                    room.modifiedVehs[vid][10] = (room.modifiedVehs[vid][10] || 0) & ~2;
                }
                isDirty = true;
            }
            if (String(vid).startsWith("fleet_") && vrow[8] !== 0 && (!room.vehNav[vid] || !room.vehNav[vid].role)) {
                parkFleetUnit(room, vid);
            }
            if (
                (String(vid).startsWith("amb_srv_") || String(vid).startsWith("vcfd_srv_") || String(vid).startsWith("tow_srv_")) &&
                (!room.vehNav[vid] || !room.vehNav[vid].role)
            ) {
                delete room.vehs[vid];
                if (room.vehNav) delete room.vehNav[vid];
                isDirty = true;
            }
        }

        // 3A. EMS Ambulance Dispatch from Leonida General Hospital (ems_hq) for street corpses
        const roomPlayerPts = [];
        for (const meta of clients.values()) {
            if (meta.room === roomCode && !meta.isOutdated && meta.lastState && Number.isFinite(meta.lastState.x)) {
                roomPlayerPts.push(meta.lastState);
            }
        }
        const corpseEntries = Object.entries(room.corpses || {});
        if (corpseEntries.length > 0) {
            corpseEntries.sort((a, b) => {
                const da = roomPlayerPts.reduce((m, p) => Math.min(m, Math.hypot((a[1][3] || 0) - p.x, (a[1][4] || 0) - p.y)), 999999);
                const db = roomPlayerPts.reduce((m, p) => Math.min(m, Math.hypot((b[1][3] || 0) - p.x, (b[1][4] || 0) - p.y)), 999999);
                return da - db;
            });
            const activeAmbs = Object.entries(room.vehNav).filter(([, nv]) => nv && nv.role === "EMS");
            const claimedCorpses = new Set(activeAmbs.map(([, nv]) => nv.targetId));
            let launchedEms = 0;
            for (const [targetCid, targetCrow] of corpseEntries) {
                if (claimedCorpses.has(targetCid)) continue;
                if (!Array.isArray(targetCrow) || !Number.isFinite(targetCrow[3]) || !Number.isFinite(targetCrow[4])) continue;
                const cx = targetCrow[3], cy = targetCrow[4];
                const cbx = Math.floor(cx / TS), cby = Math.floor(cy / TS);
                const inNoTraffic = serverMap.isRestrictedNoTrafficZone && serverMap.isRestrictedNoTrafficZone(cbx, cby);
                const inWater = serverMap.isWaterAtPixel && serverMap.isWaterAtPixel(cx, cy);
                const snappedCorpseGoal = snapStationToNearestRoad(cx, cy);
                const corpseReachable = !inNoTraffic && !inWater && Math.hypot(snappedCorpseGoal.x - cx, snappedCorpseGoal.y - cy) <= 185;
                const corpseAgeMs = nowMs - ((room.corpseTs && room.corpseTs[targetCid]) || nowMs);
                if (!corpseReachable) {
                    if (corpseAgeMs > 45000) {
                        delete room.corpses[targetCid];
                        if (room.corpseTs) delete room.corpseTs[targetCid];
                        clearCorpseSmashedPropsNear(room, cx, cy);
                        isDirty = true;
                        broadcastToRoom(roomCode, {
                            t: "WORLD_EVENT",
                            kind: "PROP_SMASH",
                            pedId: targetCid,
                            pType: `CORPSE:${targetCrow[2] || "civ0"}:CIVILIAN`,
                            x: Math.round(cx),
                            y: Math.round(cy),
                            a: -999
                        });
                    }
                    continue;
                }
                if (!launchFleetUnit(room, "EMS", targetCid, snappedCorpseGoal.x, snappedCorpseGoal.y)) break; // whole fleet busy
                if (++launchedEms >= 3) break; // stagger departures
            }
        }

        // 3B. VCFD Fire Engine Dispatch from Central Fire Station (vcfd_hq) & Tow Truck from Municipal Impound (tow_hq) for wrecks
        // Prioritize wrecks closest to active online players and skip unreachable gated/off-road wrecks so fleet units NEVER deadlock!
        const wreckList = Object.entries(room.modifiedVehs || {}).filter(([, vrow]) => Array.isArray(vrow) && (vrow[10] & 1));
        wreckList.sort((a, b) => {
            const da = roomPlayerPts.reduce((m, p) => Math.min(m, Math.hypot(a[1][2] - p.x, a[1][3] - p.y)), 999999);
            const db = roomPlayerPts.reduce((m, p) => Math.min(m, Math.hypot(b[1][2] - p.x, b[1][3] - p.y)), 999999);
            return da - db;
        });
        for (const [vid, vrow] of wreckList) {
            if ((vrow[9] || 0) > 0) {
                vrow[9] = 0;
                if (room.vehs && room.vehs[vid]) room.vehs[vid][9] = 0;
                isDirty = true;
            }
            const wx = vrow[2];
            const wy = vrow[3];
            if (!Number.isFinite(wx) || !Number.isFinite(wy) || wx < 128 || wy < 128) continue;
            const wbx = Math.floor(wx / TS), wby = Math.floor(wy / TS);
            const inNoTraffic = serverMap.isRestrictedNoTrafficZone && serverMap.isRestrictedNoTrafficZone(wbx, wby);
            const inWater = serverMap.isWaterAtPixel && serverMap.isWaterAtPixel(wx, wy);
            const snappedGoal = snapStationToNearestRoad(wx, wy);
            const roadReachable = !inNoTraffic && !inWater && Math.hypot(snappedGoal.x - wx, snappedGoal.y - wy) <= 185;
            const wreckAgeMs = nowMs - ((room.modifiedVehTs && room.modifiedVehTs[vid]) || nowMs);
            if (!(vrow[10] & 128)) {
                if (!roadReachable) {
                    if (wreckAgeMs > 35000) {
                        vrow[10] |= 128;
                        if (room.vehs && room.vehs[vid]) room.vehs[vid][10] |= 128;
                        isDirty = true;
                    }
                    continue;
                }
                const hasFireUnit = Object.values(room.vehNav).some((nv) => nv && nv.role === "FIRE" && nv.targetId === vid);
                if (!hasFireUnit) launchFleetUnit(room, "FIRE", vid, snappedGoal.x, snappedGoal.y);
            } else if (roadReachable) {
                const hasTowUnit = Object.values(room.vehNav).some((nv) => nv && nv.role === "TOW" && nv.targetId === vid);
                if (!hasTowUnit && wreckAgeMs > 120000) launchFleetUnit(room, "TOW", vid, snappedGoal.x, snappedGoal.y);
            } else if (wreckAgeMs > 120000) {
                // Municipal clearance of off-road / compound / water extinguished wrecks after 2 minutes so world_state.json never clogs!
                delete room.modifiedVehs[vid];
                if (room.modifiedVehTs) delete room.modifiedVehTs[vid];
                delete room.vehs[vid];
                isDirty = true;
                broadcastToRoom(roomCode, {
                    t: "WORLD_EVENT",
                    kind: "VEH_EXIT",
                    vehId: vid,
                    x: -9999,
                    y: -9999,
                    z: -99,
                    a: 0,
                    hp: 0,
                    flags: 0
                });
            }
        }
    }

    // 4. Advance all autonomous vehicles along the .CMP road network (100% Dedicated Server Authoritative)
    let seq = 1;
    for (const [vid, row] of allVehEntries) {
        seq++;
        if (!Array.isArray(row) || row.length < 11) continue;
        if (!Number.isFinite(row[2]) || !Number.isFinite(row[3]) || row[2] < 128 || row[3] < 128) {
            delete room.vehs[vid];
            if (room.vehNav) delete room.vehNav[vid];
            continue;
        }

        const drvCode = row[8] || 0;
        const flags = row[10] || 0;
        if (drvCode === 0 || drvCode === 4 || (flags & 1)) {
            row[6] = 0;
            row[7] = 0;
            continue;
        }

        let nav = room.vehNav[vid];
        if (!nav) {
            nav = {
                targetBx: null,
                targetBy: null,
                turnSeed: ((seq * 0.6180339887) % 1.0),
                turnedInIntersection: false,
                entryAngle: Number.isFinite(row[5]) ? row[5] : 0
            };
            room.vehNav[vid] = nav;
        }

        let x = row[2];
        let y = row[3];
        let z = Number.isFinite(row[4]) ? row[4] : 2.0;
        let a = Number.isFinite(row[5]) ? row[5] : 0;
        const specKey = row[1] || "MINT_STALLION";
        const sirenActive = Boolean(flags & 2);

        // Handle Municipal Fleet scene work, mission timeout anti-deadlock & station return (EMS, FIRE, TOW)
        if (nav.role && Number.isFinite(nav.goalX) && Number.isFinite(nav.goalY)) {
            nav.elapsedSec = (nav.elapsedSec || 0) + dt;
            const distGoal = Math.hypot(nav.goalX - x, nav.goalY - y);
            const timedOutToScene = (nav.phase === "TO_SCENE" && nav.elapsedSec > 65.0);
            if (nav.phase === "RETURNING" && nav.elapsedSec > 75.0 && String(vid).startsWith("fleet_")) {
                parkFleetUnit(room, vid);
                continue;
            }
            if ((nav.phase === "TO_SCENE" && distGoal < 165) || timedOutToScene) {
                row[6] = 0;
                row[7] = 0;
                nav.workTimer = (nav.workTimer || 0) + (timedOutToScene ? 3.0 : dt);
                if (nav.workTimer >= 2.2) {
                    nav.elapsedSec = 0;
                    if (nav.role === "EMS" && nav.targetId && room.corpses && room.corpses[nav.targetId]) {
                        const crow = room.corpses[nav.targetId];
                        const revX = Array.isArray(crow) ? crow[3] : Math.round(x);
                        const revY = Array.isArray(crow) ? crow[4] : Math.round(y);
                        delete room.corpses[nav.targetId];
                        if (room.corpseTs) delete room.corpseTs[nav.targetId];
                        clearCorpseSmashedPropsNear(room, revX, revY);
                        isDirty = true;
                        broadcastToRoom(roomCode, {
                            t: "WORLD_EVENT",
                            kind: "PED_REVIVE",
                            pedId: nav.targetId,
                            x: revX,
                            y: revY,
                            evacuated: false
                        });
                    } else if (nav.role === "FIRE" && nav.targetId) {
                        if (room.modifiedVehs && room.modifiedVehs[nav.targetId]) {
                            room.modifiedVehs[nav.targetId][10] |= 128;
                            room.modifiedVehs[nav.targetId][9] = 0;
                        }
                        if (room.vehs && room.vehs[nav.targetId]) {
                            room.vehs[nav.targetId][10] |= 128;
                            room.vehs[nav.targetId][9] = 0;
                        }
                        isDirty = true;
                    } else if (nav.role === "TOW" && nav.targetId) {
                        delete room.modifiedVehs[nav.targetId];
                        if (room.modifiedVehTs) delete room.modifiedVehTs[nav.targetId];
                        delete room.vehs[nav.targetId];
                        isDirty = true;
                        broadcastToRoom(roomCode, {
                            t: "WORLD_EVENT",
                            kind: "VEH_EXIT",
                            vehId: nav.targetId,
                            x: -9999,
                            y: -9999,
                            z: -99,
                            a: 0,
                            hp: 0,
                            flags: 0
                        });
                    }
                    nav.phase = "RETURNING";
                    nav.goalX = nav.homeX;
                    nav.goalY = nav.homeY;
                    row[10] = flags & ~2; // Turn siren off for return trip
                }
                continue;
            } else if (nav.phase === "RETURNING" && distGoal < 110) {
                if (String(vid).startsWith("fleet_")) {
                    // Roll the last metres into the parking bay, then park for good (siren off, ready for the next call)
                    if (distGoal < 6) {
                        parkFleetUnit(room, vid);
                        continue;
                    }
                    const homeAng = Math.atan2(nav.goalY - y, nav.goalX - x);
                    row[2] = Math.round((x + Math.cos(homeAng) * 46 * dt) * 10) / 10;
                    row[3] = Math.round((y + Math.sin(homeAng) * 46 * dt) * 10) / 10;
                    row[5] = Math.round(homeAng * 1000) / 1000;
                    row[6] = Math.round(Math.cos(homeAng) * 46);
                    row[7] = Math.round(Math.sin(homeAng) * 46);
                    row[10] = (row[10] || 0) & ~2;
                    continue;
                }
                delete room.vehs[vid];
                delete room.vehNav[vid];
                continue;
            }
        }

        const bx = Math.max(1, Math.min(510, Math.floor(x / TS)));
        const by = Math.max(1, Math.min(510, Math.floor(y / TS)));

        const onTrueRoad = !serverMap.surfaceGround || serverMap.surfaceGround[by * 512 + bx] === global.GROUND_TYPE.ROAD;
        const curLid1 = serverMap.getBlockInfo ? serverMap.getBlockInfo(bx, by, 1).lid : 0;
        const curDirsNow = onTrueRoad ? serverMap.getAllowedRoadDirections(bx, by, z) : [];
        if (onTrueRoad && curLid1 !== 25 && curDirsNow.length === 1 && Math.cos(a - curDirsNow[0].angle) < -0.35) {
            a = curDirsNow[0].angle;
            nav.targetBx = null;
            nav.targetBy = null;
        }

        if (
            !onTrueRoad ||
            typeof nav.targetBx !== "number" ||
            typeof nav.targetBy !== "number" ||
            !Number.isFinite(nav.targetBx) ||
            !Number.isFinite(nav.targetBy) ||
            (bx === nav.targetBx && by === nav.targetBy && Math.hypot((nav.targetBx + 0.5) * TS - x, (nav.targetBy + 0.5) * TS - y) < 26) ||
            Math.hypot((nav.targetBx + 0.5) * TS - x, (nav.targetBy + 0.5) * TS - y) > TS * 2.6
        ) {
            nav.turnSeed = (nav.turnSeed + 0.381966011) % 1.0;
            const curDirs = onTrueRoad ? curDirsNow : [];
            if (curDirs.length <= 1) {
                nav.turnedInIntersection = false;
                nav.entryAngle = a;
            }
            const nextStep = onTrueRoad
                ? ((nav.role && Number.isFinite(nav.goalX) && Number.isFinite(nav.goalY))
                    ? serverMap.chooseTargetGuidedRoadBlock(bx, by, a, nav.goalX, nav.goalY, z, nav.turnedInIntersection, nav.entryAngle)
                    : serverMap.chooseNextRoadBlock(bx, by, a, z, nav.turnSeed, nav.turnedInIntersection, nav.entryAngle))
                : null;
            if (nextStep) {
                nav.targetBx = nextStep.bx;
                nav.targetBy = nextStep.by;
                nav.targetAngle = nextStep.angle;
                if (nextStep.isTurn) nav.turnedInIntersection = true;
            } else {
                const nearestRd = snapStationToNearestRoad(x, y);
                const rbx = Math.floor(nearestRd.x / TS);
                const rby = Math.floor(nearestRd.y / TS);
                nav.targetBx = rbx;
                nav.targetBy = rby;
                nav.targetAngle = nearestRd.angle || 0;
                x += (nearestRd.x - x) * Math.min(1, dt * 3.5);
                y += (nearestRd.y - y) * Math.min(1, dt * 3.5);
            }
        }

        const tx = (nav.targetBx + 0.5) * TS;
        const ty = (nav.targetBy + 0.5) * TS;
        const desiredAng = (tx !== x || ty !== y) ? Math.atan2(ty - y, tx - x) : a;
        let angDiff = desiredAng - a;
        while (angDiff > Math.PI) angDiff -= Math.PI * 2;
        while (angDiff < -Math.PI) angDiff += Math.PI * 2;
        const maxTurn = 7.8 * dt;
        if (Math.abs(angDiff) <= maxTurn) a = desiredAng;
        else a += Math.sign(angDiff) * maxTurn;

        // Check red traffic light when approaching intersection (unless emergency siren is active)
        let targetSpd = getServerVehicleCruiseSpeed(specKey, drvCode, sirenActive, vid);
        let stoppedAtRedLight = false;
        if (!sirenActive && serverMap.isRedLightForApproach) {
            const hdx = Math.round(Math.cos(a));
            const hdy = Math.round(Math.sin(a));
            if ((hdx !== 0 || hdy !== 0) && serverMap.isRedLightForApproach(bx, by, hdx, hdy, room.trafficLightTimer, z)) {
                targetSpd = 0;
                stoppedAtRedLight = true;
            }
        }

        // Check lead vehicle spacing in spatial hash (scales lookahead with speed so fast supercars brake smoothly behind slower vehicles!)
        if (targetSpd > 0) {
            const cfx = Math.cos(a);
            const cfy = Math.sin(a);
            const gx = x >> 8;
            const gy = y >> 8;
            const leadLookAhead = Math.max(88, targetSpd * 0.72);
            let blockedByLead = false;
            for (let dy = -1; dy <= 1 && !blockedByLead; dy++) {
                for (let dx = -1; dx <= 1 && !blockedByLead; dx++) {
                    const bucket = cellBuckets.get(((gy + dy) << 8) | (gx + dx));
                    if (!bucket) continue;
                    for (let k = 0; k < bucket.length; k++) {
                        const other = bucket[k];
                        if (other === row) continue;
                        if (!Number.isFinite(other[2]) || !Number.isFinite(other[3])) continue;
                        const odx = other[2] - x;
                        const ody = other[3] - y;
                        const fwd = odx * cfx + ody * cfy;
                        const lat = Math.abs(-odx * cfy + ody * cfx);
                        if (fwd > 8 && fwd < leadLookAhead && lat < 22) {
                            const otherSpd = Math.hypot(other[6] || 0, other[7] || 0);
                            const otherAng = Number.isFinite(other[5]) ? other[5] : a;
                            // Ignore oncoming cars moving in the opposite lane so opposite flows never deadlock
                            if (otherSpd > 5 && Math.cos(otherAng - a) < -0.15) continue;
                            targetSpd = fwd < 58 ? 0 : Math.min(targetSpd, otherSpd * 0.90);
                            if (targetSpd === 0) blockedByLead = true;
                        }
                    }
                }
            }
        }
        if (targetSpd === 0 && !stoppedAtRedLight) {
            nav.stuckTicks = (nav.stuckTicks || 0) + 1;
            if (nav.stuckTicks > 150) {
                nav.stuckTicks = 0;
                nav.targetBx = null;
                nav.targetBy = null;
                nav.turnedInIntersection = false;
            }
        } else if (targetSpd > 0) {
            nav.stuckTicks = 0;
        }

        const vx = Math.cos(a) * targetSpd;
        const vy = Math.sin(a) * targetSpd;
        x += vx * dt;
        y += vy * dt;
        z = serverMap.getHeightAtPixel(x, y, z);

        row[2] = Math.round(x * 10) / 10;
        row[3] = Math.round(y * 10) / 10;
        row[4] = Math.round(z * 100) / 100;
        row[5] = wrapServerAngle(a);
        row[6] = Math.round(vx);
        row[7] = Math.round(vy);
    }

    // 5. Advance all autonomous pedestrians along .CMP sidewalks (100% Dedicated Server Authoritative)
    let pSeq = 1;
    for (const [pid, prow] of Object.entries(room.peds)) {
        pSeq++;
        if (!Array.isArray(prow) || prow.length < 10) continue;
        if (prow[9] & 1) continue; // Dead corpse

        let pnav = room.pedNav[pid];
        if (!pnav) {
            pnav = { targetBx: null, targetBy: null, turnSeed: ((pSeq * 0.6180339) % 1.0) };
            room.pedNav[pid] = pnav;
        }
        let px = prow[3];
        let py = prow[4];
        let pz = prow[5] || 2.0;
        let pa = prow[6] || 0;
        const pspd = prow[7] || 25;
        const bx = Math.max(1, Math.min(510, Math.floor(px / TS)));
        const by = Math.max(1, Math.min(510, Math.floor(py / TS)));

        if (
            pnav.targetBx === null ||
            pnav.targetBy === null ||
            Math.hypot((pnav.targetBx + 0.5) * TS - px, (pnav.targetBy + 0.5) * TS - py) < 16 ||
            Math.hypot((pnav.targetBx + 0.5) * TS - px, (pnav.targetBy + 0.5) * TS - py) > TS * 2.2
        ) {
            pnav.turnSeed = (pnav.turnSeed + 0.381966011) % 1.0;
            const step = serverMap.chooseNextSidewalkBlock
                ? serverMap.chooseNextSidewalkBlock(bx, by, pa, pz, pnav.turnSeed, false, null, -1, -1, null)
                : null;
            if (step) {
                pnav.targetBx = step.bx;
                pnav.targetBy = step.by;
                pa = step.angle;
            } else {
                pa = wrapServerAngle(pa + Math.PI);
                const fbx = bx + Math.round(Math.cos(pa));
                const fby = by + Math.round(Math.sin(pa));
                const fNav = serverMap.getNavigationBlock ? serverMap.getNavigationBlock(fbx, fby, pz) : null;
                if (fNav && fNav.groundType !== global.GROUND_TYPE.WATER && fNav.groundType !== global.GROUND_TYPE.BUILDING) {
                    pnav.targetBx = fbx;
                    pnav.targetBy = fby;
                } else {
                    pnav.targetBx = bx;
                    pnav.targetBy = by;
                }
            }
        } else {
            const tx = (pnav.targetBx + 0.5) * TS;
            const ty = (pnav.targetBy + 0.5) * TS;
            pa = Math.atan2(ty - py, tx - px);
        }

        const nextPx = px + Math.cos(pa) * pspd * dt;
        const nextPy = py + Math.sin(pa) * pspd * dt;
        if (
            (serverMap.isWaterAtPixel && serverMap.isWaterAtPixel(nextPx, nextPy)) ||
            (serverMap.resolveCircleBuildingCollision && serverMap.resolveCircleBuildingCollision(nextPx, nextPy, 8, pz).hit)
        ) {
            if (sidewalkSpawnTiles.length > 0) {
                const safeTile = sidewalkSpawnTiles[(pSeq * 29 + 11) % sidewalkSpawnTiles.length];
                px = (safeTile.bx + 0.5) * TS;
                py = (safeTile.by + 0.5) * TS;
                pz = safeTile.z || 2.0;
                pnav.targetBx = null;
                pnav.targetBy = null;
            }
        } else {
            px = nextPx;
            py = nextPy;
            pz = serverMap.getHeightAtPixel(px, py, pz);
        }

        prow[3] = Math.round(px * 10) / 10;
        prow[4] = Math.round(py * 10) / 10;
        prow[5] = Math.round(pz * 100) / 100;
        prow[6] = Math.round(wrapServerAngle(pa) * 100) / 100;
    }

    // 6. Broadcast authoritative Dedicated Server simulation ticks (2 Hz = every 5th tick = 500ms) to all players in the room!
    if ((room._dispatchTick % 5) === 0) {
        let hasRoomClients = false;
        for (const meta of clients.values()) {
            if (meta.room === roomCode && !meta.isOutdated) {
                hasRoomClients = true;
                break;
            }
        }
        if (hasRoomClients) {
            broadcastToRoom(roomCode, {
                t: "WORLD_SYNC",
                id: "server_sim",
                ver: room.ver || MIN_CLIENT_VER,
                wm: room.worldMinutes || 720,
                tl: Math.round((room.trafficLightTimer || 0) * 100) / 100
            });
        }
    }
}

// Run the 10 Hz (100ms) Autonomous World Simulation across all persistent rooms 24/7!
for (const [rCode, rv] of Object.entries(persistentStore.rooms)) {
    ensureRoomAutonomousPopulation(rCode, rv);
}
setInterval(() => {
    autonomousSimTickCount++;
    for (const [rCode, rv] of Object.entries(persistentStore.rooms)) {
        tickAutonomousRoom(rCode, rv, 0.10);
    }
    if ((autonomousSimTickCount % 40) === 0) {
        isDirty = true;
    }
}, 100);

setInterval(() => {
    const nowMs = Date.now();
    // 1. Evict silent/dead zombie sockets (> 65s without PING, STATE, or WORLD_SYNC)
    let evictedAny = false;
    for (const [sock, meta] of clients.entries()) {
        if ((nowMs - (meta.lastSeen || 0)) > 65000) {
            try { sock.destroy(); } catch (_e) {}
            clients.delete(sock);
            broadcastToRoom(meta.room, { t: "LEAVE", id: meta.playerId, name: meta.name }, sock);
            evictedAny = true;
        }
    }
    if (evictedAny) {
        broadcastDirectoryCounts();
    }

    // 2. Per-room periodic maintenance: prop auto-repair, corpse TTL, wreck TTL & event expiry
    for (const [rCode, rv] of Object.entries(persistentStore.rooms)) {
        if (rv.robbedVaults) {
            for (const [vk, expMs] of Object.entries(rv.robbedVaults)) {
                if (!expMs || nowMs >= expMs) {
                    delete rv.robbedVaults[vk];
                }
            }
        }

        if (rv.activeFlashDrop && (nowMs - (rv.activeFlashDrop.startedAt || 0)) >= (rv.activeFlashDrop.duration || 90) * 1000) {
            rv.activeFlashDrop = null;
        }
        if (rv.activeBounty && (nowMs - (rv.activeBounty.startedAt || 0)) >= (rv.activeBounty.duration || 60) * 1000) {
            rv.activeBounty = null;
        }

        // Municipal auto-repair for ancient smashed props (> 30 minutes old) & corpse cleanup (> 3 minutes old)
        if (rv.smashedProps) {
            for (const [pk, pv] of Object.entries(rv.smashedProps)) {
                const isCorpse = pv && typeof pv.pType === "string" && pv.pType.startsWith("CORPSE:");
                const maxAge = isCorpse ? 180000 : 1800000;
                if (pv && pv.ts && (nowMs - pv.ts) > maxAge) {
                    delete rv.smashedProps[pk];
                    isDirty = true;
                }
            }
        }

        // Expire old corpses in rv.corpses after 3 minutes (180s) and clear matching smashedProps corpse markers
        if (rv.corpses && rv.corpseTs) {
            for (const cid of Object.keys(rv.corpses)) {
                const cts = rv.corpseTs[cid] || 0;
                if (cts && (nowMs - cts) > 180000) {
                    const crow = rv.corpses[cid];
                    if (Array.isArray(crow)) clearCorpseSmashedPropsNear(rv, crow[3], crow[4]);
                    delete rv.corpses[cid];
                    delete rv.corpseTs[cid];
                    isDirty = true;
                }
            }
        }

        // Expire burned wrecks (> 60s), unoccupied transient/dynamic vehicles (> 45s), and other unoccupied modified cars (> 180s) from modifiedVehs
        if (rv.modifiedVehs && rv.modifiedVehTs) {
            for (const [vid, vrow] of Object.entries(rv.modifiedVehs)) {
                if (!Array.isArray(vrow)) continue;
                const vts = rv.modifiedVehTs[vid] || nowMs;
                const isDestroyed = Boolean(vrow[10] & 1);
                const isUnoccupiedResponderOrDynamic = (vrow[8] === 0) && (isDynamicVehicleId(vid) || isTransientResponderRow(vid, vrow));
                const isUnoccupiedOther = (vrow[8] === 0);
                // Realism: wrecks and parked player cars never evaporate on a timer - only a physical Tow Truck removes them (server tow dispatches after 2 min)
                const maxVehAge = isDestroyed ? 0 : (isUnoccupiedResponderOrDynamic ? 45000 : 0);
                if (maxVehAge > 0 && (nowMs - vts) > maxVehAge) {
                    delete rv.modifiedVehs[vid];
                    delete rv.modifiedVehTs[vid];
                    delete rv.vehs[vid];
                    isDirty = true;
                    broadcastToRoom(rCode, {
                        t: "WORLD_EVENT",
                        kind: "VEH_EXIT",
                        vehId: vid,
                        x: -9999,
                        y: -9999,
                        z: -99,
                        a: 0,
                        hp: 0,
                        flags: 0
                    });
                }
            }
        }
    }
}, 500);

process.on("uncaughtException", (err) => {
    console.warn("[WORLD-SERVER] Uncaught Exception:", err && err.message);
    savePersistentStateNow();
});
process.on("unhandledRejection", (reason) => {
    console.warn("[WORLD-SERVER] Unhandled Rejection:", reason);
});
process.on("SIGINT", () => {
    savePersistentStateNow();
    process.exit(0);
});
process.on("SIGTERM", () => {
    savePersistentStateNow();
    process.exit(0);
});

server.listen(PORT, HOST, () => {
    savePersistentStateNow();
    console.log(`====================================================================`);
    console.log(`🌴 VICE CITY 26 — PERSISTENT WORLD SERVER v2 RUNNING`);
    console.log(`🔗 WebSocket URL : ws://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    console.log(`📊 Status URL    : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/status`);
    console.log(`💾 World DB File : ${STATE_FILE}`);
    console.log(`====================================================================`);
});
