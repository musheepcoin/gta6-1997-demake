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

const ROOM_CODES = ["VICE97", "MIAMI86", "KEYS305"];

function createEmptyRoom() {
    return {
        vehs: {},          // Live AI traffic vehicles
        modifiedVehs: {},  // Player-driven, moved, parked, damaged, or wrecked vehicles (NEVER overwritten by default map!)
        smashedProps: {},  // Knocked-down streetlamps, traffic lights, bollards, hydrants, benches
        chat: [],
        trafficLightTimer: 0,
        updatedAt: 0
    };
}

const persistentStore = {
    updatedAt: new Date().toISOString(),
    leaderboard: [],
    profiles: {},
    rooms: {
        VICE97: createEmptyRoom(),
        MIAMI86: createEmptyRoom(),
        KEYS305: createEmptyRoom()
    }
};

function ensureRoom(roomCode) {
    const code = String(roomCode || "VICE97").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "VICE97";
    if (!persistentStore.rooms[code]) {
        persistentStore.rooms[code] = createEmptyRoom();
    }
    const r = persistentStore.rooms[code];
    if (!r.modifiedVehs) r.modifiedVehs = {};
    if (!r.smashedProps) r.smashedProps = {};
    if (!r.vehs) r.vehs = {};
    if (!Array.isArray(r.chat)) r.chat = [];
    return { code, room: r };
}

function loadPersistentState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const raw = fs.readFileSync(STATE_FILE, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                if (Array.isArray(parsed.leaderboard)) {
                    persistentStore.leaderboard = parsed.leaderboard.slice(0, 25);
                }
                if (parsed.profiles && typeof parsed.profiles === "object") {
                    persistentStore.profiles = parsed.profiles;
                }
                if (parsed.rooms && typeof parsed.rooms === "object") {
                    for (const [rk, rv] of Object.entries(parsed.rooms)) {
                        if (rv && typeof rv === "object") {
                            persistentStore.rooms[rk] = {
                                vehs: (rv.vehs && typeof rv.vehs === "object") ? rv.vehs : {},
                                modifiedVehs: (rv.modifiedVehs && typeof rv.modifiedVehs === "object") ? rv.modifiedVehs : {},
                                smashedProps: (rv.smashedProps && typeof rv.smashedProps === "object") ? rv.smashedProps : {},
                                chat: Array.isArray(rv.chat) ? rv.chat.slice(-30) : [],
                                trafficLightTimer: Number(rv.trafficLightTimer) || 0,
                                updatedAt: Number(rv.updatedAt) || 0
                            };
                        }
                    }
                }
                console.log(`[WORLD-DB] Loaded persistent state from ${STATE_FILE}`);
            }
        }
    } catch (err) {
        console.warn("[WORLD-DB] Failed to load state file, starting fresh:", err.message);
    }
}

let isDirty = false;
function savePersistentStateNow() {
    if (!isDirty) return;
    try {
        persistentStore.updatedAt = new Date().toISOString();
        const tmpFile = `${STATE_FILE}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(persistentStore), "utf8");
        fs.renameSync(tmpFile, STATE_FILE);
        isDirty = false;
    } catch (err) {
        console.warn("[WORLD-DB] Failed to save state:", err.message);
    }
}

function mergeLeaderboardEntry(name, charId, score, color) {
    const cleanName = String(name || "").trim().slice(0, 18).toUpperCase();
    const sc = Math.floor(Number(score) || 0);
    if (!cleanName || sc <= 0) return false;
    const existing = persistentStore.leaderboard.find((e) => e.name === cleanName);
    if (existing) {
        if (sc > existing.score) {
            existing.score = sc;
            existing.charId = charId || existing.charId || "LUCIA";
            existing.color = color || existing.color || "#00f0ff";
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
        const r = meta.room || "VICE97";
        counts[r] = (counts[r] || 0) + 1 + (meta.bots || 0);
    }
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

    // 4. Persisted World Vehicles (Modified/Parked/Wrecked + Active Traffic)
    const vehRows = getCombinedRoomVehicles(room);
    sendJson(socket, {
        t: "WORLD_SYNC",
        id: "server_world",
        tl: room.trafficLightTimer || 0,
        vehs: vehRows
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

    if (pkt.id) meta.playerId = String(pkt.id).slice(0, 40);
    if (pkt.name) {
        meta.name = String(pkt.name).slice(0, 18).toUpperCase();
        meta.profileKey = meta.name.replace(/[^A-Z0-9_#]/g, "");
    }
    if (pkt.color) meta.color = String(pkt.color).slice(0, 16);
    if (pkt.pedType) meta.pedType = String(pkt.pedType).slice(0, 16);

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

    if (pkt.t === "JOIN") {
        pkt.slot = meta.slot;
        sendRoomBootstrap(socket, meta);
        broadcastToRoom(roomCode, pkt, socket);
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
        meta.lastState = pkt;
        meta.lastSeen = Date.now();

        if (typeof pkt.sc === "number" && pkt.sc > 0) {
            mergeLeaderboardEntry(meta.name, pkt.charId || "LUCIA", pkt.sc, meta.color);
        }

        // Only overwrite saved player profile when the player has actually started playing & synced!
        if (pkt.started && meta.profileKey && typeof pkt.x === "number" && typeof pkt.y === "number") {
            persistentStore.profiles[meta.profileKey] = {
                name: meta.name,
                charId: pkt.charId || "LUCIA",
                pedType: pkt.pedType || meta.pedType || "lucia",
                color: pkt.color || meta.color || "#00f0ff",
                cash: Math.round(pkt.sc || 0),
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
            room.vehs[v.id] = row;
            isDirty = true;
        }

        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "WORLD_SYNC" && Array.isArray(pkt.vehs)) {
        if (typeof pkt.tl === "number") {
            room.trafficLightTimer = pkt.tl;
        }
        room.updatedAt = Date.now();
        const nextVehs = {};
        const maxVehs = Math.min(pkt.vehs.length, 200);
        for (let i = 0; i < maxVehs; i++) {
            const row = pkt.vehs[i];
            if (!Array.isArray(row) || !row[0]) continue;
            const vid = row[0];
            const isMod = Boolean(row[13]) || Boolean(row[10] & 1); // mod === 1 or destroyed
            if (isMod) {
                row[13] = 1;
                room.modifiedVehs[vid] = row;
                nextVehs[vid] = row;
            } else if (!room.modifiedVehs[vid]) {
                // Only update unmodified traffic/parked row if this vehicle was NOT modified in room.modifiedVehs!
                nextVehs[vid] = row;
            } else {
                // Preserve the persisted modified vehicle!
                nextVehs[vid] = room.modifiedVehs[vid];
            }
        }
        // Keep all modifiedVehs (capped at 120 most recent) so parked/wrecked cars across the city never vanish!
        const modKeys = Object.keys(room.modifiedVehs);
        if (modKeys.length > 120) {
            delete room.modifiedVehs[modKeys[0]];
        }
        room.vehs = nextVehs;
        isDirty = true;

        // Broadcast the authoritative merged vehicle list to other players in the room
        pkt.vehs = getCombinedRoomVehicles(room);
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "WORLD_EVENT") {
        if (pkt.kind === "VEH_EXIT" && pkt.vehId) {
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
            room.vehs[pkt.vehId] = row;
            isDirty = true;
        } else if (pkt.kind === "PROP_SMASH" && pkt.pType && typeof pkt.x === "number" && typeof pkt.y === "number") {
            const pKey = `${pkt.pType}_${Math.round(pkt.x)}_${Math.round(pkt.y)}`;
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
        }
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "CHAT" && pkt.text) {
        const cleanText = String(pkt.text).trim().slice(0, 140);
        if (!cleanText) return;
        const nowMs = Date.now();
        if (meta.lastChatMs && (nowMs - meta.lastChatMs) < 1500) return;
        if (meta.lastChatText && meta.lastChatText.toLowerCase() === cleanText.toLowerCase() && (nowMs - (meta.lastChatMs || 0)) < 10000) return;
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
        if (mergeLeaderboardEntry(pkt.name || meta.name, pkt.charId, pkt.sc, pkt.color || meta.color)) {
            broadcastToRoom(roomCode, {
                t: "LEADERBOARD_SYNC",
                entries: persistentStore.leaderboard
            });
        }
        return;
    }

    if (pkt.t === "LEADERBOARD_SYNC" && Array.isArray(pkt.entries)) {
        let changed = false;
        for (const e of pkt.entries) {
            if (e && e.name && e.score) {
                if (mergeLeaderboardEntry(e.name, e.charId, e.score, e.color)) {
                    changed = true;
                }
            }
        }
        if (changed) {
            broadcastToRoom(roomCode, {
                t: "LEADERBOARD_SYNC",
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
        for (const [rk, rv] of Object.entries(persistentStore.rooms)) {
            roomSummary[rk] = {
                playersOnline: Array.from(clients.values()).filter((m) => m.room === rk).length,
                persistedVehicles: Object.keys(Object.assign({}, rv.vehs || {}, rv.modifiedVehs || {})).length,
                playerModifiedVehicles: Object.keys(rv.modifiedVehs || {}).length,
                smashedPropsCount: Object.keys(rv.smashedProps || {}).length,
                chatMessages: (rv.chat || []).length
            };
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
            ok: true,
            service: "VICE CITY 26 — Persistent World Server v2",
            uptimeSec: Math.round(process.uptime()),
            totalPlayersOnline: clients.size,
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

    let initRoom = "VICE97";
    let initId = `p_${Date.now().toString(36)}`;
    let initName = "PLAYER";
    try {
        const u = new URL(req.url, "http://localhost");
        if (u.searchParams.get("room")) initRoom = u.searchParams.get("room");
        if (u.searchParams.get("id")) initId = u.searchParams.get("id");
        if (u.searchParams.get("name")) initName = u.searchParams.get("name");
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
        bots: 0,
        lastSeen: Date.now(),
        lastState: null
    };
    clients.set(socket, meta);
    broadcastDirectoryCounts();

    let rxBuf = Buffer.alloc(0);

    socket.on("data", (chunk) => {
        rxBuf = Buffer.concat([rxBuf, chunk]);
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

            const maskLen = isMasked ? 4 : 0;
            const totalFrameLen = offset + maskLen + payloadLen;
            if (rxBuf.length < totalFrameLen) return;

            if (opcode === 0x8) {
                socket.end();
                return;
            }
            if (opcode === 0x9) {
                const pong = Buffer.from([0x8a, 0x00]);
                try { socket.write(pong); } catch (_e) {}
                rxBuf = rxBuf.subarray(totalFrameLen);
                continue;
            }

            let payload = rxBuf.subarray(offset + maskLen, totalFrameLen);
            if (isMasked) {
                const mask = rxBuf.subarray(offset, offset + 4);
                const unmasked = Buffer.allocUnsafe(payload.length);
                for (let i = 0; i < payload.length; i++) {
                    unmasked[i] = payload[i] ^ mask[i & 3];
                }
                payload = unmasked;
            }
            rxBuf = rxBuf.subarray(totalFrameLen);

            if (opcode === 0x1) {
                try {
                    const pkt = JSON.parse(payload.toString("utf8"));
                    handleClientPacket(socket, pkt);
                } catch (_e) {}
            }
        }
    });

    const cleanup = () => {
        const m = clients.get(socket);
        if (m) {
            clients.delete(socket);
            broadcastToRoom(m.room, { t: "LEAVE", id: m.playerId, name: m.name }, socket);
            broadcastDirectoryCounts();
        }
    };
    socket.on("close", cleanup);
    socket.on("error", cleanup);
});

setInterval(() => {
    for (const rv of Object.values(persistentStore.rooms)) {
        rv.trafficLightTimer = ((rv.trafficLightTimer || 0) + 0.5) % 14.0;
    }
}, 500);

process.on("SIGINT", () => {
    savePersistentStateNow();
    process.exit(0);
});
process.on("SIGTERM", () => {
    savePersistentStateNow();
    process.exit(0);
});

server.listen(PORT, HOST, () => {
    console.log(`====================================================================`);
    console.log(`🌴 VICE CITY 26 — PERSISTENT WORLD SERVER v2 RUNNING`);
    console.log(`🔗 WebSocket URL : ws://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    console.log(`📊 Status URL    : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/status`);
    console.log(`💾 World DB File : ${STATE_FILE}`);
    console.log(`====================================================================`);
});
