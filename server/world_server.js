#!/usr/bin/env node
/**
 * ============================================================================
 * VICE CITY 26 — PERSISTENT DEDICATED WORLD SERVER (Hostinger KVM2 / Node.js)
 * Zero external npm dependencies required (uses native Node.js http + crypto
 * RFC-6455 WebSocket implementation + atomic disk persistence).
 *
 * Features:
 * - 24/7 Persistent World State per Room (VICE97, MIAMI86, KEYS305):
 *   - Persists moved, parked, damaged & destroyed vehicles across sessions
 *   - Persists All-Time Best Scores Leaderboard (Top 25)
 *   - Persists last 30 Chat Messages per room
 *   - Persists Player Profiles (cash, weapon, armor, kills, last position)
 * - Real-time 20Hz Player Pose Relay & 10Hz World Sync
 * - Live Cross-Room Directory Counts (VICE97 / MIAMI86 / KEYS305)
 * - HTTP Status & Leaderboard API: GET /status , GET /health
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

/* ============================================================================
   1. PERSISTENT WORLD STATE STORE (RAM + ATOMIC JSON SNAPSHOT ON DISK)
   ============================================================================ */
const ROOM_CODES = ["VICE97", "MIAMI86", "KEYS305"];

const persistentStore = {
    updatedAt: new Date().toISOString(),
    leaderboard: [],
    profiles: {}, // profileKey -> { name, charId, cash, weapon, armor, kills, x, y, z, updatedAt }
    rooms: {
        VICE97: { vehs: {}, chat: [], trafficLightTimer: 0, updatedAt: 0 },
        MIAMI86: { vehs: {}, chat: [], trafficLightTimer: 0, updatedAt: 0 },
        KEYS305: { vehs: {}, chat: [], trafficLightTimer: 0, updatedAt: 0 }
    }
};

function ensureRoom(roomCode) {
    const code = String(roomCode || "VICE97").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "VICE97";
    if (!persistentStore.rooms[code]) {
        persistentStore.rooms[code] = { vehs: {}, chat: [], trafficLightTimer: 0, updatedAt: 0 };
    }
    return { code, room: persistentStore.rooms[code] };
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
setInterval(savePersistentStateNow, 5000);

/* ============================================================================
   2. NATIVE RFC-6455 WEBSOCKET PROTOCOL ENCODER / DECODER
   ============================================================================ */
const clients = new Map(); // socket -> clientMeta

function encodeWsFrame(payloadStr) {
    const payload = Buffer.from(payloadStr, "utf8");
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + text frame
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
        const frame = encodeWsFrame(JSON.stringify(obj));
        socket.write(frame);
    } catch (_e) {}
}

function broadcastToRoom(roomCode, obj, excludeSocket = null) {
    const frame = encodeWsFrame(JSON.stringify(obj));
    for (const [sock, meta] of clients.entries()) {
        if (sock === excludeSocket || sock.destroyed || !sock.writable) continue;
        if (meta.room === roomCode) {
            try {
                sock.write(frame);
            } catch (_e) {}
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
    const pkt = { t: "DIR_COUNTS", counts };
    const frame = encodeWsFrame(JSON.stringify(pkt));
    for (const [sock] of clients.entries()) {
        if (!sock.destroyed && sock.writable) {
            try { sock.write(frame); } catch (_e) {}
        }
    }
}

/* ============================================================================
   3. WORLD SIMULATION & PACKET HANDLER
   ============================================================================ */
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

function sendRoomBootstrap(socket, meta) {
    const { code, room } = ensureRoom(meta.room);

    // 1. Send assigned deterministic slot + live server counts
    sendJson(socket, {
        t: "WELCOME",
        slot: meta.slot,
        room: code,
        online: Array.from(clients.values()).filter((m) => m.room === code).length
    });

    // 2. Send persisted All-Time High Scores
    if (persistentStore.leaderboard.length > 0) {
        sendJson(socket, {
            t: "LEADERBOARD_SYNC",
            entries: persistentStore.leaderboard
        });
    }

    // 3. Send recent chat history for this room
    if (Array.isArray(room.chat) && room.chat.length > 0) {
        sendJson(socket, {
            t: "CHAT_HISTORY",
            messages: room.chat.slice(-20)
        });
    }

    // 4. Send persisted World Vehicles snapshot for this room if available
    const vehRows = Object.values(room.vehs || {});
    if (vehRows.length > 0) {
        sendJson(socket, {
            t: "WORLD_SYNC",
            id: "server_world",
            tl: room.trafficLightTimer || 0,
            vehs: vehRows
        });
    }

    // 5. Send saved player profile if matching playerName / profileKey exists
    if (meta.profileKey && persistentStore.profiles[meta.profileKey]) {
        sendJson(socket, {
            t: "PROFILE_SYNC",
            profile: persistentStore.profiles[meta.profileKey]
        });
    }

    // 6. Send current active players in the same room immediately
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

    // Room switch or initial join
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

        // Persist player profile & high score
        if (typeof pkt.sc === "number" && pkt.sc > 0) {
            mergeLeaderboardEntry(meta.name, pkt.charId || "LUCIA", pkt.sc, meta.color);
        }
        if (meta.profileKey && typeof pkt.x === "number" && typeof pkt.y === "number") {
            persistentStore.profiles[meta.profileKey] = {
                name: meta.name,
                charId: pkt.charId || "LUCIA",
                cash: Math.round(pkt.sc || 0),
                weapon: pkt.wep || "PISTOL",
                armor: Math.round(pkt.ar || 0),
                kills: Math.round(pkt.k || 0),
                x: Math.round(pkt.x),
                y: Math.round(pkt.y),
                z: Number(pkt.z) || 2.0,
                updatedAt: Date.now()
            };
            isDirty = true;
        }

        // If player is driving a vehicle, update that vehicle's persistent pose in the room store!
        if (pkt.veh && pkt.veh.id && typeof pkt.x === "number" && typeof pkt.y === "number") {
            const v = pkt.veh;
            const flags =
                (v.siren ? 2 : 0) |
                (v.fDent ? 4 : 0) |
                (v.rDent ? 8 : 0) |
                (v.hDent ? 16 : 0);
            room.vehs[v.id] = [
                v.id,
                v.specKey || "STALLION",
                Math.round(pkt.x),
                Math.round(pkt.y),
                Math.round((pkt.z || 2.0) * 100) / 100,
                Math.round((pkt.a || 0) * 1000) / 1000,
                Math.round(pkt.vx || 0),
                Math.round(pkt.vy || 0),
                4, // PLAYER / REMOTE driven
                100,
                flags,
                v.remapIdx || 0,
                0
            ];
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
        // Update room's persistent vehicle map (cap at 180 active vehicles per room)
        const nextVehs = {};
        const maxVehs = Math.min(pkt.vehs.length, 180);
        for (let i = 0; i < maxVehs; i++) {
            const row = pkt.vehs[i];
            if (Array.isArray(row) && row[0]) {
                nextVehs[row[0]] = row;
            }
        }
        room.vehs = nextVehs;
        isDirty = true;
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "WORLD_EVENT") {
        // Persist vehicle exit position or explosion state immediately in room store
        if (pkt.kind === "VEH_EXIT" && pkt.vehId && room.vehs[pkt.vehId]) {
            const row = room.vehs[pkt.vehId];
            if (typeof pkt.x === "number") row[2] = Math.round(pkt.x);
            if (typeof pkt.y === "number") row[3] = Math.round(pkt.y);
            if (typeof pkt.z === "number") row[4] = Math.round(pkt.z * 100) / 100;
            if (typeof pkt.a === "number") row[5] = Math.round(pkt.a * 1000) / 1000;
            row[6] = 0;
            row[7] = 0;
            row[8] = 0; // Parked (no driver)
            isDirty = true;
        } else if (pkt.kind === "VEH_EXPLODE" && pkt.vehId && room.vehs[pkt.vehId]) {
            const row = room.vehs[pkt.vehId];
            row[9] = 0; // 0 HP
            row[10] = (row[10] || 0) | 1; // destroyed flag
            isDirty = true;
        }
        broadcastToRoom(roomCode, pkt, socket);
        return;
    }

    if (pkt.t === "CHAT" && pkt.text) {
        const cleanText = String(pkt.text).trim().slice(0, 140);
        if (!cleanText) return;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        room.chat.push({
            timeStr,
            author: meta.name || pkt.name || "PLAYER",
            color: meta.color || pkt.color || "#00f0ff",
            text: cleanText,
            ts: Date.now()
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

    // Relay all other real-time packets (SHOOT, EXPLODE, HORN, KILLED, NAME, LEAVE) to the room
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
                persistedVehicles: Object.keys(rv.vehs || {}).length,
                chatMessages: (rv.chat || []).length
            };
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
            ok: true,
            service: "VICE CITY 26 — Persistent World Server",
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

    // Parse initial room from query string (?room=VICE97&id=...)
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
                // Close frame
                socket.end();
                return;
            }
            if (opcode === 0x9) {
                // Ping -> Pong
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

// Advance global traffic light timer on the server even when rooms are idle
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
    console.log(`🌴 VICE CITY 26 — PERSISTENT WORLD SERVER RUNNING`);
    console.log(`🔗 WebSocket URL : ws://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    console.log(`📊 Status URL    : http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/status`);
    console.log(`💾 World DB File : ${STATE_FILE}`);
    console.log(`====================================================================`);
});
