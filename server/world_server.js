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
require("../js/map.js");

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
const CURRENT_BUILD = "101_204";

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

function normalizeRoomCode(roomCode) {
    const raw = String(roomCode || "VICE26").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "VICE26";
    return raw === "VICE97" ? "VICE26" : raw;
}

function isDynamicVehicleId(vid) {
    if (typeof vid !== "string") return false;
    return (
        vid.startsWith("trf_") ||
        vid.startsWith("traf_") ||
        vid.startsWith("cop_") ||
        vid.startsWith("rb_") ||
        vid.startsWith("amb_") ||
        vid.startsWith("medic_") ||
        vid.startsWith("vcfd_") ||
        vid.startsWith("tow_") ||
        vid.startsWith("fixer_") ||
        vid.startsWith("mission_") ||
        vid.startsWith("mcheetah_") ||
        vid.startsWith("mbrinks_")
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
    if (!r.vehs) r.vehs = {};
    if (!r.peds) r.peds = {};
    if (!Array.isArray(r.chat)) r.chat = [];
    return { code, room: r };
}

let isDirty = false;

function loadPersistentState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const raw = fs.readFileSync(STATE_FILE, "utf8");
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
                                // Strip destroyed wrecks and transient traffic/cop/mission cars from modifiedVehs on server startup
                                if ((vrow[10] & 1) || isDynamicVehicleId(vid)) {
                                    migratedAny = true;
                                    continue;
                                }
                                vrow[8] = 0; // Ensure parked on startup
                                vrow[6] = 0;
                                vrow[7] = 0;
                                cleanModVehs[vid] = vrow;
                                if (!cleanModTs[vid]) cleanModTs[vid] = nowMs;
                            }
                            const loadedVehs = Object.assign({}, cleanModVehs);
                            if (rv.vehs && typeof rv.vehs === "object") {
                                for (const [vid, vrow] of Object.entries(rv.vehs)) {
                                    if (!Array.isArray(vrow) || vrow.length < 11) continue;
                                    if ((vrow[2] || 0) < 128 || (vrow[3] || 0) < 128) continue;
                                    if (cleanModVehs[vid]) continue;
                                    // Only keep autonomous server traffic (srv_trf_*) across server restarts; purge stale client emergency/pursuit/traffic cars!
                                    if (!String(vid).startsWith("srv_trf_")) {
                                        migratedAny = true;
                                        continue;
                                    }
                                    if (vrow[8] === 4) vrow[8] = 0;
                                    loadedVehs[vid] = vrow;
                                }
                            }
                            const loadedPeds = {};
                            if (rv.peds && typeof rv.peds === "object") {
                                for (const [pid, prow] of Object.entries(rv.peds)) {
                                    if (Array.isArray(prow) && prow.length >= 10 && !(prow[9] & 1)) {
                                        // Only keep autonomous server sidewalk peds (ped_init_*) across server restarts; purge stale client peds!
                                        if (!String(pid).startsWith("ped_init_")) {
                                            migratedAny = true;
                                            continue;
                                        }
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
                                corpses: {},
                                corpseTs: {},
                                robbedVaults: Object.assign({}, existing.robbedVaults || {}, (rv.robbedVaults && typeof rv.robbedVaults === "object") ? rv.robbedVaults : {}),
                                turfStandings: Object.assign({}, existing.turfStandings, (rv.turfStandings && typeof rv.turfStandings === "object") ? rv.turfStandings : {}),
                                activeFlashDrop: null,
                                activeBounty: null,
                                chat: (existing.chat || []).concat(Array.isArray(rv.chat) ? rv.chat : []).slice(-30),
                                ver: Math.max(Number(existing.ver) || 0, Number(rv.ver) || 0),
                                worldMinutes: Number(rv.worldMinutes) || existing.worldMinutes || 720,
                                trafficLightTimer: Number(rv.trafficLightTimer) || existing.trafficLightTimer || 0,
                                updatedAt: Math.max(Number(existing.updatedAt) || 0, Number(rv.updatedAt) || 0)
                            };
                        }
                    }
                }
                persistentStore.econVer = ECON_VERSION;
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

    // 4. Persisted World Vehicles (Modified/Parked/Wrecked + Active Traffic) & Corpses/Peds
    const vehRows = getCombinedRoomVehicles(room);
    const pedRows = Object.values(Object.assign({}, room.peds || {}, room.corpses || {}));
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
    if (++meta.pktCount > 95) {
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

        // If player is driving a vehicle, persist its pose in room.modifiedVehs!
        if (pkt.started && pkt.veh && pkt.veh.id && typeof pkt.x === "number" && typeof pkt.y === "number") {
            const v = pkt.veh;
            const flags =
                (v.siren ? 2 : 0) |
                (v.fDent ? 4 : 0) |
                (v.rDent ? 8 : 0) |
                (v.hDent ? 16 : 0);
            const row = [
                v.id,
                v.specKey || "STALLION",
                Math.round(pkt.x),
                Math.round(pkt.y),
                Math.round((pkt.z || 2.0) * 100) / 100,
                Math.round((pkt.a || 0) * 1000) / 1000,
                Math.round(pkt.vx || 0),
                Math.round(pkt.vy || 0),
                4, // Driven
                Math.round(v.hp || 100),
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
            row[13] = 1;
            if (!room.modifiedVehs[vid] || row[8] !== 0) {
                room.modifiedVehTs[vid] = nowMs;
            }
            room.modifiedVehs[vid] = row;
            room.vehs[vid] = row;
        }
        // Keep all modifiedVehs (capped at 120 most recent) so parked/wrecked cars across the city never vanish!
        const modKeys = Object.keys(room.modifiedVehs);
        if (modKeys.length > 120) {
            const oldVid = modKeys[0];
            delete room.modifiedVehs[oldVid];
            delete room.modifiedVehTs[oldVid];
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
                pkt.specKey || "STALLION",
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
            if (typeof pkt.x === "number") row[2] = Math.round(pkt.x);
            if (typeof pkt.y === "number") row[3] = Math.round(pkt.y);
            if (typeof pkt.z === "number") row[4] = Math.round(pkt.z * 100) / 100;
            if (typeof pkt.a === "number") row[5] = Math.round(pkt.a * 1000) / 1000;
            row[6] = 0;
            row[7] = 0;
            row[8] = 0; // Parked (no driver)
            if (typeof pkt.hp === "number") row[9] = Math.round(pkt.hp);
            if (typeof pkt.flags === "number") row[10] = pkt.flags;
            row[13] = 1; // Permanent modified flag
            room.modifiedVehs[pkt.vehId] = row;
            room.modifiedVehTs[pkt.vehId] = Date.now();
            room.vehs[pkt.vehId] = row;
            isDirty = true;
        } else if (pkt.kind === "VEH_EXPLODE" && pkt.vehId) {
            const existing = room.modifiedVehs[pkt.vehId] || room.vehs[pkt.vehId];
            const row = existing ? existing.slice() : [
                pkt.vehId,
                pkt.specKey || "STALLION",
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
                activePedestrians: Object.keys(rv.peds || {}).length,
                smashedPropsCount: Object.keys(rv.smashedProps || {}).length,
                corpsesCount: Object.keys(rv.corpses || {}).length,
                vaultLockoutsCount: Object.keys(rv.robbedVaults || {}).length,
                turfZonesCount: Object.keys(rv.turfStandings || {}).length,
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
            if (m.lastState && m.lastState.veh && m.lastState.veh.id) {
                const { room: r } = ensureRoom(m.room);
                const vid = m.lastState.veh.id;
                if (r.modifiedVehs[vid] && r.modifiedVehs[vid][8] === 4) {
                    r.modifiedVehs[vid][8] = 0;
                    r.modifiedVehs[vid][6] = 0;
                    r.modifiedVehs[vid][7] = 0;
                    isDirty = true;
                }
                if (r.vehs[vid] && r.vehs[vid][8] === 4) {
                    r.vehs[vid][8] = 0;
                    r.vehs[vid][6] = 0;
                    r.vehs[vid][7] = 0;
                }
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

function getServerVehicleCruiseSpeed(specKey, drvCode, sirenActive) {
    if (specKey === "BMX_BIKE") return 54;
    if (specKey === "E_SCOOTER") return 64;
    if (sirenActive || drvCode === 2 || drvCode === 3) return 108;
    if (drvCode === 5) return 114;
    if (drvCode === 6) return 92;
    if (specKey === "CITY_BUS" || specKey === "TOUR_COACH" || specKey === "TANKER_RIG" || specKey === "FLATBED_TRUCK" || specKey === "BRINKS_TRUCK") return 72;
    if (specKey === "SUPERBIKE" || specKey === "BANSHEE_GT" || specKey === "PENETRATOR_GT" || specKey === "VICE_CHEETAH" || specKey === "STINGER_CABRIO" || specKey === "TURISMO_CABRIO") return 92;
    return 82;
}

function ensureRoomAutonomousPopulation(roomCode, room) {
    if (!serverMap || !serverMap.cmpLoaded) return;
    if (!room.vehs) room.vehs = {};
    if (!room.peds) room.peds = {};
    if (!room.vehNav) room.vehNav = {};
    if (!room.pedNav) room.pedNav = {};
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
        const ang = serverMap.getAlignedRoadAngle ? serverMap.getAlignedRoadAngle(bx, by, st.a, vz) : st.a;
        const spd = getServerVehicleCruiseSpeed(st.spec, 1, false);
        room.vehs[st.id] = [
            st.id,
            st.spec,
            Math.round(vx),
            Math.round(vy),
            Math.round(vz * 100) / 100,
            Math.round(ang * 1000) / 1000,
            Math.round(Math.cos(ang) * spd),
            Math.round(Math.sin(ang) * spd),
            1, // AI_TRAFFIC
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
            const spd = getServerVehicleCruiseSpeed(spec, 1, false);
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
                const spd = getServerVehicleCruiseSpeed(sr.spec, sr.drv, false);
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
    if (serviceType === "MEDIC") return { id: "ems_hq", x: global.mx256(208.5) * TS, y: global.my256(140.5) * TS };
    if (serviceType === "FIRE") return { id: "vcfd_hq", x: 428.5 * TS, y: 295.5 * TS };
    if (serviceType === "TOW") return { id: "tow_hq", x: 333.2 * TS, y: 306.5 * TS };
    return { id: "vcpd_hq", x: global.mx256(203.0) * TS, y: global.my256(146.0) * TS };
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
                if (nav && nav.groundType === global.GROUND_TYPE.ROAD && !nav.isParkingBay) {
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

function tickAutonomousRoom(roomCode, room, dt = 0.10) {
    if (!serverMap || !serverMap.cmpLoaded) return;
    ensureRoomAutonomousPopulation(roomCode, room);

    const nowMs = Date.now();
    const TS = global.TILE_SIZE || 64;

    // 1. Advance traffic lights (24s cycle) and 24-hour world clock continuously on the Dedicated Server 24/7
    room.trafficLightTimer = ((room.trafficLightTimer || 0) + dt) % 24.0;
    const prevHr = (((room.worldMinutes % 1440) + 1440) % 1440) / 60.0;
    room.worldMinutes = Math.round((((room.worldMinutes || 720) + dt * 0.35) % 1440) * 100) / 100;
    const nextHr = (((room.worldMinutes % 1440) + 1440) % 1440) / 60.0;
    if (prevHr < 17.0 && nextHr >= 17.0) {
        room.worldMinutes = 600;
    }

    if (!room.vehNav) room.vehNav = {};
    if (!room.pedNav) room.pedNav = {};

    // 2. Build 128x128 spatial hash (256px cells) of all vehicles so autonomous traffic obeys safe bumper spacing
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

    // 3. Autonomous Municipal Dispatch Check (every 1.0s = 10 ticks, 100% Server-Authoritative)
    room._dispatchTick = ((room._dispatchTick || 0) + 1) % 10;
    if (room._dispatchTick === 0) {
        // 3A. EMS Ambulance Dispatch from Leonida General Hospital (ems_hq) for street corpses
        const corpseEntries = Object.entries(room.corpses || {});
        if (corpseEntries.length > 0) {
            const activeAmbs = allVehEntries.filter(([, r]) => Array.isArray(r) && r[1] === "MEDIC_AMBULANCE" && !(r[10] & 1));
            if (activeAmbs.length < Math.min(3, corpseEntries.length)) {
                const [targetCid, targetCrow] = corpseEntries[0];
                if (Array.isArray(targetCrow)) {
                    const st = getStationCoords("MEDIC");
                    const sp = snapStationToNearestRoad(st.x, st.y);
                    const aid = `amb_srv_${nowMs.toString(36)}`;
                    const spd = 106;
                    room.vehs[aid] = [
                        aid, "MEDIC_AMBULANCE",
                        Math.round(sp.x), Math.round(sp.y), Math.round(sp.z * 100) / 100,
                        Math.round(sp.angle * 1000) / 1000,
                        Math.round(Math.cos(sp.angle) * spd), Math.round(Math.sin(sp.angle) * spd),
                        3, 160, 2, 0, 0, 0
                    ];
                    room.vehNav[aid] = {
                        role: "EMS",
                        phase: "TO_SCENE",
                        targetId: targetCid,
                        goalX: targetCrow[3],
                        goalY: targetCrow[4],
                        homeX: sp.x,
                        homeY: sp.y,
                        workTimer: 0,
                        turnSeed: 0.37
                    };
                }
            }
        }

        // 3B. VCFD Fire Engine Dispatch from Central Fire Station (vcfd_hq) & Tow Truck from Municipal Impound (tow_hq) for wrecks
        for (const [vid, vrow] of Object.entries(room.modifiedVehs || {})) {
            if (!Array.isArray(vrow) || !(vrow[10] & 1)) continue;
            const wx = vrow[2];
            const wy = vrow[3];
            if (!(vrow[10] & 128)) {
                const hasFireUnit = Object.values(room.vehNav).some((nv) => nv && nv.role === "FIRE" && nv.targetId === vid);
                if (!hasFireUnit) {
                    const st = getStationCoords("FIRE");
                    const sp = snapStationToNearestRoad(st.x, st.y);
                    const fid = `vcfd_srv_${nowMs.toString(36)}`;
                    const spd = 104;
                    room.vehs[fid] = [
                        fid, "FIRE_TRUCK",
                        Math.round(sp.x), Math.round(sp.y), Math.round(sp.z * 100) / 100,
                        Math.round(sp.angle * 1000) / 1000,
                        Math.round(Math.cos(sp.angle) * spd), Math.round(Math.sin(sp.angle) * spd),
                        3, 220, 2, 0, 0, 0
                    ];
                    room.vehNav[fid] = {
                        role: "FIRE",
                        phase: "TO_SCENE",
                        targetId: vid,
                        goalX: wx,
                        goalY: wy,
                        homeX: sp.x,
                        homeY: sp.y,
                        workTimer: 0,
                        turnSeed: 0.41
                    };
                }
            } else {
                const hasTowUnit = Object.values(room.vehNav).some((nv) => nv && nv.role === "TOW" && nv.targetId === vid);
                if (!hasTowUnit) {
                    const st = getStationCoords("TOW");
                    const sp = snapStationToNearestRoad(st.x, st.y);
                    const tid = `tow_srv_${nowMs.toString(36)}`;
                    const spd = 92;
                    room.vehs[tid] = [
                        tid, "TOW_TRUCK",
                        Math.round(sp.x), Math.round(sp.y), Math.round(sp.z * 100) / 100,
                        Math.round(sp.angle * 1000) / 1000,
                        Math.round(Math.cos(sp.angle) * spd), Math.round(Math.sin(sp.angle) * spd),
                        6, 180, 2, 0, 0, 0
                    ];
                    room.vehNav[tid] = {
                        role: "TOW",
                        phase: "TO_SCENE",
                        targetId: vid,
                        goalX: wx,
                        goalY: wy,
                        homeX: sp.x,
                        homeY: sp.y,
                        workTimer: 0,
                        turnSeed: 0.53
                    };
                }
            }
        }
    }

    // 4. Advance all autonomous vehicles along the .CMP road network (100% Dedicated Server Authoritative)
    let seq = 1;
    for (const [vid, row] of allVehEntries) {
        seq++;
        if (!Array.isArray(row) || row.length < 11) continue;

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
                entryAngle: row[5] || 0
            };
            room.vehNav[vid] = nav;
        }

        let x = row[2];
        let y = row[3];
        let z = row[4] || 2.0;
        let a = row[5] || 0;
        const specKey = row[1] || "STALLION";
        const sirenActive = Boolean(flags & 2);

        // Handle Municipal Fleet scene work & station return (EMS, FIRE, TOW)
        if (nav.role && nav.goalX !== undefined && nav.goalY !== undefined) {
            const distGoal = Math.hypot(nav.goalX - x, nav.goalY - y);
            if (nav.phase === "TO_SCENE" && distGoal < 125) {
                row[6] = 0;
                row[7] = 0;
                nav.workTimer = (nav.workTimer || 0) + dt;
                if (nav.workTimer >= 2.2) {
                    if (nav.role === "EMS" && nav.targetId && room.corpses && room.corpses[nav.targetId]) {
                        const crow = room.corpses[nav.targetId];
                        delete room.corpses[nav.targetId];
                        if (room.corpseTs) delete room.corpseTs[nav.targetId];
                        broadcastToRoom(roomCode, {
                            t: "WORLD_EVENT",
                            kind: "PED_REVIVE",
                            pedId: nav.targetId,
                            x: Array.isArray(crow) ? crow[3] : Math.round(x),
                            y: Array.isArray(crow) ? crow[4] : Math.round(y),
                            evacuated: false
                        });
                    } else if (nav.role === "FIRE" && nav.targetId) {
                        if (room.modifiedVehs && room.modifiedVehs[nav.targetId]) {
                            room.modifiedVehs[nav.targetId][10] |= 128;
                        }
                        if (room.vehs && room.vehs[nav.targetId]) {
                            room.vehs[nav.targetId][10] |= 128;
                        }
                    } else if (nav.role === "TOW" && nav.targetId) {
                        delete room.modifiedVehs[nav.targetId];
                        if (room.modifiedVehTs) delete room.modifiedVehTs[nav.targetId];
                        delete room.vehs[nav.targetId];
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
                delete room.vehs[vid];
                delete room.vehNav[vid];
                continue;
            }
        }

        const bx = Math.max(1, Math.min(510, Math.floor(x / TS)));
        const by = Math.max(1, Math.min(510, Math.floor(y / TS)));

        if (
            nav.targetBx === null ||
            nav.targetBy === null ||
            (bx === nav.targetBx && by === nav.targetBy && Math.hypot((nav.targetBx + 0.5) * TS - x, (nav.targetBy + 0.5) * TS - y) < 26) ||
            Math.hypot((nav.targetBx + 0.5) * TS - x, (nav.targetBy + 0.5) * TS - y) > TS * 2.6
        ) {
            nav.turnSeed = (nav.turnSeed + 0.381966011) % 1.0;
            const curDirs = serverMap.getAllowedRoadDirections(bx, by, z);
            if (curDirs.length <= 1) {
                nav.turnedInIntersection = false;
                nav.entryAngle = a;
            }
            const nextStep = (nav.role && typeof nav.goalX === "number" && typeof nav.goalY === "number")
                ? serverMap.chooseDirectedRoadBlock(bx, by, a, nav.goalX, nav.goalY, z, nav.turnedInIntersection, nav.entryAngle)
                : serverMap.chooseNextRoadBlock(bx, by, a, z, nav.turnSeed, nav.turnedInIntersection, nav.entryAngle);
            if (nextStep) {
                nav.targetBx = nextStep.bx;
                nav.targetBy = nextStep.by;
                nav.targetAngle = nextStep.angle;
                if (nextStep.isTurn) nav.turnedInIntersection = true;
            } else if (bx >= 447) {
                // Off-road on Vice Beach / Lummus Park: steer West back onto Ocean Drive (bx = 446)!
                nav.targetBx = bx - 1;
                nav.targetBy = by;
                nav.targetAngle = Math.PI;
            } else {
                const nearestRd = snapStationToNearestRoad(x, y);
                const rbx = Math.floor(nearestRd.x / TS);
                const rby = Math.floor(nearestRd.y / TS);
                nav.targetBx = bx + Math.sign(rbx - bx);
                nav.targetBy = by + (rbx === bx ? Math.sign(rby - by) : 0);
                nav.targetAngle = Math.atan2(nearestRd.y - y, nearestRd.x - x);
            }
        }

        const tx = (nav.targetBx + 0.5) * TS;
        const ty = (nav.targetBy + 0.5) * TS;
        const desiredAng = Math.atan2(ty - y, tx - x);
        let angDiff = desiredAng - a;
        while (angDiff > Math.PI) angDiff -= Math.PI * 2;
        while (angDiff < -Math.PI) angDiff += Math.PI * 2;
        const maxTurn = 4.2 * dt;
        if (Math.abs(angDiff) <= maxTurn) a = desiredAng;
        else a += Math.sign(angDiff) * maxTurn;

        // Check red traffic light when approaching intersection (unless emergency siren is active)
        let targetSpd = getServerVehicleCruiseSpeed(specKey, drvCode, sirenActive);
        if (!sirenActive && serverMap.isRedLightForApproach) {
            const hdx = Math.round(Math.cos(a));
            const hdy = Math.round(Math.sin(a));
            if ((hdx !== 0 || hdy !== 0) && serverMap.isRedLightForApproach(bx, by, hdx, hdy, room.trafficLightTimer, z)) {
                targetSpd = 0;
            }
        }

        // Check lead vehicle spacing in spatial hash
        if (targetSpd > 0) {
            const cfx = Math.cos(a);
            const cfy = Math.sin(a);
            const gx = x >> 8;
            const gy = y >> 8;
            let blockedByLead = false;
            for (let dy = -1; dy <= 1 && !blockedByLead; dy++) {
                for (let dx = -1; dx <= 1 && !blockedByLead; dx++) {
                    const bucket = cellBuckets.get(((gy + dy) << 8) | (gx + dx));
                    if (!bucket) continue;
                    for (let k = 0; k < bucket.length; k++) {
                        const other = bucket[k];
                        if (other === row) continue;
                        const odx = other[2] - x;
                        const ody = other[3] - y;
                        const fwd = odx * cfx + ody * cfy;
                        const lat = Math.abs(-odx * cfy + ody * cfx);
                        if (fwd > 8 && fwd < 90 && lat < 24) {
                            const otherSpd = Math.hypot(other[6] || 0, other[7] || 0);
                            targetSpd = fwd < 58 ? 0 : Math.min(targetSpd, otherSpd * 0.85);
                            if (targetSpd === 0) blockedByLead = true;
                        }
                    }
                }
            }
        }

        const vx = Math.cos(a) * targetSpd;
        const vy = Math.sin(a) * targetSpd;
        x += vx * dt;
        y += vy * dt;
        z = serverMap.getHeightAtPixel(x, y, z);

        row[2] = Math.round(x * 10) / 10;
        row[3] = Math.round(y * 10) / 10;
        row[4] = Math.round(z * 100) / 100;
        row[5] = Math.round(a * 1000) / 1000;
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
                pa = ((pa + Math.PI) % (Math.PI * 2));
                pnav.targetBx = bx + Math.round(Math.cos(pa));
                pnav.targetBy = by + Math.round(Math.sin(pa));
            }
        } else {
            const tx = (pnav.targetBx + 0.5) * TS;
            const ty = (pnav.targetBy + 0.5) * TS;
            pa = Math.atan2(ty - py, tx - px);
        }

        px += Math.cos(pa) * pspd * dt;
        py += Math.sin(pa) * pspd * dt;
        pz = serverMap.getHeightAtPixel(px, py, pz);

        prow[3] = Math.round(px * 10) / 10;
        prow[4] = Math.round(py * 10) / 10;
        prow[5] = Math.round(pz * 100) / 100;
        prow[6] = Math.round(pa * 100) / 100;
    }

    // 6. Broadcast authoritative Dedicated Server simulation ticks (1 Hz = every 10th tick) to all players in the room!
    if (room._dispatchTick === 0) {
        let hasRoomClients = false;
        for (const meta of clients.values()) {
            if (meta.room === roomCode && !meta.isOutdated) {
                hasRoomClients = true;
                break;
            }
        }
        if (hasRoomClients) {
            const vehRows = getCombinedRoomVehicles(room).slice(0, 140);
            const pedRows = Object.values(Object.assign({}, room.peds || {}, room.corpses || {})).slice(0, 90);
            broadcastToRoom(roomCode, {
                t: "WORLD_SYNC",
                id: "server_sim",
                ver: room.ver || MIN_CLIENT_VER,
                wm: room.worldMinutes || 720,
                tl: Math.round((room.trafficLightTimer || 0) * 100) / 100,
                vehs: vehRows,
                peds: pedRows
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

        // Municipal auto-repair for ancient smashed props (> 5 minutes old) & corpse cleanup (> 3 minutes old)
        if (rv.smashedProps) {
            for (const [pk, pv] of Object.entries(rv.smashedProps)) {
                const isCorpse = pv && typeof pv.pType === "string" && pv.pType.startsWith("CORPSE:");
                const maxAge = isCorpse ? 180000 : 300000;
                if (pv && pv.ts && (nowMs - pv.ts) > maxAge) {
                    delete rv.smashedProps[pk];
                    isDirty = true;
                }
            }
        }

        // Expire old corpses in rv.corpses after 3 minutes (180s)
        if (rv.corpses && rv.corpseTs) {
            for (const cid of Object.keys(rv.corpses)) {
                const cts = rv.corpseTs[cid] || 0;
                if (cts && (nowMs - cts) > 180000) {
                    delete rv.corpses[cid];
                    delete rv.corpseTs[cid];
                    isDirty = true;
                }
            }
        }

        // Expire burned wrecks (> 90s) and abandoned dynamic traffic/mission vehicles (> 180s) from modifiedVehs
        if (rv.modifiedVehs && rv.modifiedVehTs) {
            for (const [vid, vrow] of Object.entries(rv.modifiedVehs)) {
                if (!Array.isArray(vrow)) continue;
                const vts = rv.modifiedVehTs[vid] || nowMs;
                const isDestroyed = Boolean(vrow[10] & 1);
                const isUnoccupiedDynamic = (vrow[8] === 0) && isDynamicVehicleId(vid);
                const maxVehAge = isDestroyed ? 90000 : (isUnoccupiedDynamic ? 180000 : 0);
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
