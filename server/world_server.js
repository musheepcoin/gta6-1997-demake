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

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "world_state.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ROOM_CODES = ["VICE26", "VICE97", "MIAMI86", "KEYS305"];
const ECON_VERSION = 2;
const MIN_CLIENT_VER = 101181;
const CURRENT_BUILD = "101_183";

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
        vehs: {},          // Live AI traffic vehicles
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
                                // Strip destroyed wrecks and transient traffic/cop/mission cars on server startup
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
                            persistentStore.rooms[normKey] = {
                                vehs: Object.assign({}, cleanModVehs),
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
        const payload = JSON.stringify(persistentStore);
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

function broadcastToRoom(roomCode, obj, excludeSocket = null) {
    const frame = encodeWsFrame(JSON.stringify(obj));
    for (const [sock, meta] of clients.entries()) {
        if (sock === excludeSocket || sock.destroyed || !sock.writable) continue;
        if (meta.room === roomCode) {
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

    // 7. Current active players in the room
    for (const [otherSock, otherMeta] of clients.entries()) {
        if (otherSock !== socket && otherMeta.room === code && otherMeta.lastState) {
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
        if (typeof pkt.wm === "number") {
            room.worldMinutes = pkt.wm;
        }
        if (typeof pkt.tl === "number") {
            room.trafficLightTimer = pkt.tl;
        }
        const nowMs = Date.now();
        room.updatedAt = nowMs;
        const nextVehs = {};
        const maxVehs = Math.min(pkt.vehs.length, 200);
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
            // Skip unmodified driverless static map vehicles (every client spawns them locally)
            if (!isMod && row[8] === 0 && !(row[10] & 256)) {
                if (room.modifiedVehs[vid]) {
                    nextVehs[vid] = room.modifiedVehs[vid];
                }
                continue;
            }
            if (isMod) {
                row[13] = 1;
                if (!room.modifiedVehs[vid] || row[8] !== 0) {
                    room.modifiedVehTs[vid] = nowMs;
                }
                room.modifiedVehs[vid] = row;
                nextVehs[vid] = row;
            } else if (!room.modifiedVehs[vid]) {
                // Only update unmodified active traffic row if this vehicle was NOT modified in room.modifiedVehs!
                nextVehs[vid] = row;
            } else {
                // Preserve the persisted modified vehicle!
                nextVehs[vid] = room.modifiedVehs[vid];
            }
        }
        // Keep all modifiedVehs (capped at 120 most recent) so parked/wrecked cars across the city never vanish!
        const modKeys = Object.keys(room.modifiedVehs);
        if (modKeys.length > 120) {
            const oldVid = modKeys[0];
            delete room.modifiedVehs[oldVid];
            delete room.modifiedVehTs[oldVid];
        }
        room.vehs = nextVehs;
        if (Array.isArray(pkt.peds)) {
            if (!room.corpses) room.corpses = {};
            if (!room.corpseTs) room.corpseTs = {};
            const nextPeds = {};
            const maxPeds = Math.min(pkt.peds.length, 160);
            for (let i = 0; i < maxPeds; i++) {
                const pr = pkt.peds[i];
                if (!Array.isArray(pr) || !pr[0]) continue;
                const pid = pr[0];
                nextPeds[pid] = pr;
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
            room.peds = nextPeds;
            pkt.peds = Object.values(Object.assign({}, room.peds, room.corpses));
        }
        isDirty = true;

        // Broadcast the authoritative merged vehicle & ped list to other players in the room
        pkt.vehs = getCombinedRoomVehicles(room);
        broadcastToRoom(roomCode, pkt, socket);
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
            roomSummary[rk] = {
                playersOnline: roomClients.length,
                players: roomClients.map((m) => m.name),
                persistedVehicles: Object.keys(Object.assign({}, rv.vehs || {}, rv.modifiedVehs || {})).length,
                playerModifiedVehicles: Object.keys(rv.modifiedVehs || {}).length,
                smashedPropsCount: Object.keys(rv.smashedProps || {}).length,
                corpsesCount: Object.keys(rv.corpses || {}).length,
                vaultLockoutsCount: Object.keys(rv.robbedVaults || {}).length,
                turfZonesCount: Object.keys(rv.turfStandings || {}).length,
                chatMessages: (rv.chat || []).length
            };
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
            ok: true,
            service: "VICE CITY 26 — Persistent World Server v2",
            build: CURRENT_BUILD,
            minClientVer: MIN_CLIENT_VER,
            econVer: ECON_VERSION,
            uptimeSec: Math.round(process.uptime()),
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

    // 2. Per-room periodic maintenance: traffic lights, world clock, prop auto-repair, corpse TTL, wreck TTL & event expiry
    for (const [rCode, rv] of Object.entries(persistentStore.rooms)) {
        rv.trafficLightTimer = ((rv.trafficLightTimer || 0) + 0.5) % 24.0;
        if ((nowMs - (rv.updatedAt || 0)) > 3000) {
            rv.worldMinutes = Math.round((((rv.worldMinutes || 720) + 0.125) % 1440) * 100) / 100;
        }
        // If no WORLD_SYNC has arrived in the room for > 15s, prune transient AI traffic from rv.vehs while keeping rv.modifiedVehs
        if ((nowMs - (rv.updatedAt || 0)) > 15000 && rv.vehs) {
            for (const vid of Object.keys(rv.vehs)) {
                if (!rv.modifiedVehs || !rv.modifiedVehs[vid]) {
                    delete rv.vehs[vid];
                }
            }
        }
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
