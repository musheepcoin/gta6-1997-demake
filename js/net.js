/* ============================================================================
   GRAND THEFT AUTO: VICE CITY '97 — ZERO-SERVER WEBRTC & LOCAL MESH MULTIPLAYER
   - Transport 1: BroadcastChannel ("vice_city_97_net_v1") for 0ms multi-tab sync
   - Transport 2: PeerJS WebRTC DataChannel Mesh (deterministic room slots 0..15)
     for cross-internet P2P multiplayer directly on GitHub Pages (0 server cost!)
   - Syncs: 20Hz Player & Vehicle 3D Pose, Dead-Reckoning 60Hz Interpolation,
     Projectiles (Bullets, Rockets, Flamethrower), Explosions, Horn/Siren & PvP Kills
   ============================================================================ */

const NET_COLORS = [
    "#00f0ff", // Vice Cyan
    "#ff2a85", // Flamingo Neon Pink
    "#fde047", // Sunburst Gold
    "#39ff14", // Arcade Emerald
    "#c084fc", // Star Island Purple
    "#fb923c", // Sunset Coral
    "#38bdf8", // Biscayne Sky
    "#f43f5e"  // Ocean Drive Crimson
];

const NET_PED_TYPES = ["lucia", "jason", "tommy", "trevor", "cj", "niko", "claude", "bigsmoke", "crockett"];

class ViceNetworkManager {
    constructor(game) {
        this.game = game;
        this.enabled = true;

        // Unique session player ID, nickname & neon color
        const randNum = Math.floor(100 + Math.random() * 900);
        this.playerId = `p_${Date.now().toString(36)}_${randNum}`;
        const savedName = this.safeGetStorage("vc97_mp_name");
        this.playerName = savedName || `LUCIA #${randNum}`;
        this.playerColor = NET_COLORS[randNum % NET_COLORS.length];
        this.pedSpriteType = NET_PED_TYPES[randNum % NET_PED_TYPES.length];

        // Room code (from URL ?room=XXX or default public lobby "VICE26")
        const urlParams = new URLSearchParams(window.location.search || "");
        const rawRoom = (urlParams.get("room") || "VICE26").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        this.roomCode = this.normalizeRoomCode(rawRoom || "VICE26");

        // Map of remote players: id -> state object
        this.remotePlayers = new Map();
        this.kills = 0;
        this.deaths = 0;

        // Timing
        this.syncAccumulator = 0;
        this.syncInterval = 0.05; // 20 Hz state broadcast
        this.worldSyncAccumulator = 0;
        this.worldSyncInterval = 0.10; // 10 Hz full-map world broadcast (vehicles, police, peds, clock)
        this.lastWorldSyncReceivedMs = 0;
        this.cleanupAccumulator = 0;

        // Transports
        this.ws = null;
        this.wsConnected = false;
        this.wsUrl = this.resolveInitialWsUrl();
        this.serverRoomCounts = null;
        this._wsReconnectTimer = null;
        this._pendingServerWorldSnapshot = null;
        this._pendingPropSync = [];
        this._pendingProfileSync = undefined;
        this._serverBootstrapApplied = false;
        this._profileSynced = false;
        this.bc = null;
        this.dirBc = null;
        this.directoryPeers = new Map(); // playerId -> { room, bots, lastSeen }
        this.dirAccumulator = 0;
        this.peer = null;
        this.peerConns = new Map(); // peerId -> DataConnection
        this.slotIndex = -1;
        this.maxSlots = 24;
        this.webrtcReady = false;
        this.statusText = "CONNECTING...";
        this.isChatTyping = false;
        this.chatHistory = [];

        this.initChatUI();
        this.initServerDirectory();
        this.initWebSocketServer();
        this.initBroadcastChannel();
        this.initWebRTCMesh();

        // Immediately broadcast hid/foc state on tab visibility or window focus change BEFORE browser suspends requestAnimationFrame!
        if (typeof document !== "undefined") {
            const notifyFocusChange = () => {
                if (this.game && this.game.started) {
                    this.broadcastStateNow();
                }
            };
            document.addEventListener("visibilitychange", notifyFocusChange);
            if (typeof window !== "undefined") {
                window.addEventListener("focus", notifyFocusChange);
                window.addEventListener("blur", notifyFocusChange);
            }
        }
    }

    resolveInitialWsUrl() {
        if (typeof window === "undefined") return "";
        try {
            const urlParams = new URLSearchParams(window.location.search || "");
            const paramWs = urlParams.get("ws") || urlParams.get("server");
            if (paramWs) {
                const clean = paramWs.trim();
                this.safeSetStorage("vc97_ws_url", clean);
                return clean;
            }
            if (window.__VC26_WS_URL) {
                return String(window.__VC26_WS_URL).trim();
            }
            const savedWs = this.safeGetStorage("vc97_ws_url");
            if (savedWs) {
                return savedWs.trim();
            }
            return "wss://srv2162111.hstgr.cloud:8443";
        } catch (_e) {}
        return "";
    }

    /* ========================================================================
       00. PERSISTENT DEDICATED WEBSOCKET WORLD SERVER (Hostinger KVM2 / Node.js)
       ======================================================================== */
    initWebSocketServer(customUrl) {
        if (typeof window === "undefined" || typeof WebSocket === "undefined") return;
        if (customUrl !== undefined) {
            this.wsUrl = String(customUrl || "").trim();
            if (this.wsUrl) {
                this.safeSetStorage("vc97_ws_url", this.wsUrl);
            } else if (window.localStorage) {
                try { window.localStorage.removeItem("vc97_ws_url"); } catch (_e) {}
            }
        }
        if (this._wsReconnectTimer) {
            clearTimeout(this._wsReconnectTimer);
            this._wsReconnectTimer = null;
        }
        if (this.ws) {
            try {
                this.ws.onclose = null;
                this.ws.onerror = null;
                this.ws.onmessage = null;
                this.ws.close();
            } catch (_e) {}
            this.ws = null;
            this.wsConnected = false;
        }
        if (!this.wsUrl) return;

        try {
            const sep = this.wsUrl.includes("?") ? "&" : "?";
            const fullUrl = `${this.wsUrl}${sep}room=${encodeURIComponent(this.roomCode)}&id=${encodeURIComponent(this.playerId)}&name=${encodeURIComponent(this.playerName)}&ver=101181`;
            const ws = new WebSocket(fullUrl);
            this.ws = ws;

            ws.onopen = () => {
                if (this.ws !== ws) return;
                this.wsConnected = true;
                this.statusText = `DEDICATED (${this.roomCode})`;
                // Tear down any P2P WebRTC fallback timers/sockets since the dedicated server is connected
                if (this._slotDialTimer) {
                    clearInterval(this._slotDialTimer);
                    this._slotDialTimer = null;
                }
                if (this.peer) {
                    try { this.peer.destroy(); } catch (_e) {}
                    this.peer = null;
                }
                ws.send(JSON.stringify({
                    t: "JOIN",
                    ver: 101181,
                    started: Boolean(this.game && this.game.started),
                    id: this.playerId,
                    room: this.roomCode,
                    name: this.playerName,
                    color: this.playerColor,
                    pedType: this.pedSpriteType
                }));
            };

            ws.onmessage = (ev) => {
                if (!ev || !ev.data) return;
                try {
                    const pkt = JSON.parse(ev.data);
                    this.handleServerPacket(pkt);
                } catch (_e) {}
            };

            const scheduleReconnect = () => {
                if (this.ws !== ws) return;
                this.wsConnected = false;
                this._serverBootstrapApplied = false;
                this.serverRoomCounts = null;
                this.ws = null;
                if (this.wsUrl) {
                    const retryCount = (this._wsRetryCount = Math.min(6, (this._wsRetryCount || 0) + 1));
                    const delayMs = Math.min(12000, 1800 + retryCount * 1200);
                    this._wsReconnectTimer = setTimeout(() => {
                        this.initWebSocketServer();
                    }, delayMs);
                }
            };
            ws.onclose = scheduleReconnect;
            ws.onerror = scheduleReconnect;
        } catch (_e) {}
    }

    handleServerPacket(pkt) {
        if (!pkt || typeof pkt !== "object") return;
        if (pkt.t === "PONG") {
            return;
        }
        if (pkt.t === "FORCE_RELOAD" && typeof window !== "undefined") {
            const targetBuild = String(pkt.build || "101_180");
            if (window.__VC26_BUILD !== targetBuild) {
                try {
                    const lastReload = Number(window.sessionStorage.getItem("vc26_force_reload_ts") || 0);
                    if (Date.now() - lastReload > 15000) {
                        window.sessionStorage.setItem("vc26_force_reload_ts", String(Date.now()));
                        window.location.replace(window.location.pathname + "?v=" + targetBuild);
                    }
                } catch (_e) {
                    window.location.reload();
                }
            }
            return;
        }
        if (pkt.t === "WELCOME") {
            this._wsRetryCount = 0;
            if (typeof pkt.slot === "number") {
                this.slotIndex = pkt.slot;
            }
            const welcomeKey = `${pkt.room || this.roomCode}_${pkt.slot || 0}`;
            if (this._lastWelcomeKey !== welcomeKey) {
                this._lastWelcomeKey = welcomeKey;
                this.addChatLog(
                    "WORLD SERVER",
                    `⚡ Persistent Server [${this.getRoomDisplayName(pkt.room || this.roomCode)}] connected (Slot #${(pkt.slot || 0) + 1})`,
                    "#39ff14",
                    true
                );
            }
            return;
        }
        if (pkt.t === "DIR_COUNTS" && pkt.counts) {
            this.serverRoomCounts = pkt.counts;
            this.updateServerListUI();
            return;
        }
        if (pkt.t === "CHAT_HISTORY" && Array.isArray(pkt.messages)) {
            if (!this._seenChatKeys) this._seenChatKeys = new Set();
            for (const m of pkt.messages) {
                if (m && m.text) {
                    const chatKey = `${m.ts || m.timeStr || ""}|${m.author || "PLAYER"}|${m.text}`;
                    if (this._seenChatKeys.has(chatKey)) continue;
                    this._seenChatKeys.add(chatKey);
                    if (this._seenChatKeys.size > 150) {
                        const first = this._seenChatKeys.values().next().value;
                        this._seenChatKeys.delete(first);
                    }
                    this.addChatLog(m.author || "PLAYER", m.text, m.color || "#00f0ff", false, m.timeStr);
                }
            }
            return;
        }
        if (pkt.t === "PROP_SYNC" && Array.isArray(pkt.props)) {
            for (const pr of pkt.props) {
                if (this._pendingPropSync.length >= 260) this._pendingPropSync.shift();
                this._pendingPropSync.push(pr);
            }
            this.flushPendingPropSync();
            return;
        }
        if (pkt.t === "PROFILE_SYNC") {
            if (this._profileSynced && this.game && this.game.started) {
                this.broadcastStateNow();
                return;
            }
            this._pendingProfileSync = pkt.profile || null;
            this.tryApplyPendingProfileSync();
            return;
        }
        this.handlePacket(pkt);
    }

    flushPendingPropSync() {
        if (!this._pendingPropSync || this._pendingPropSync.length === 0) return;
        if (!this.game || !this.game.map || !this.game.map.cmpLoaded) return;
        const oe = this.game.map.objectEngine;
        const list = this._pendingPropSync.splice(0, this._pendingPropSync.length);
        // Pass 1: collect all corpse tombstones (a < -900 or x < 128) so even slightly shifted corpses within 36px are purged!
        const corpseTombstones = [];
        for (const item of list) {
            if (!item || typeof item.pType !== "string" || !item.pType.startsWith("CORPSE:")) continue;
            const cx = Number(item.x) || 0;
            const cy = Number(item.y) || 0;
            const ca = Number(item.a) || 0;
            if (ca < -900 || cx < 128 || cy < 128) {
                corpseTombstones.push({ x: cx, y: cy });
                if (Array.isArray(this.game.peds)) {
                    for (let pi = this.game.peds.length - 1; pi >= 0; pi--) {
                        const pd = this.game.peds[pi];
                        if (pd && pd.dead && Math.hypot((pd.x || 0) - cx, (pd.y || 0) - cy) < 36) {
                            this.game.peds.splice(pi, 1);
                        }
                    }
                }
            }
        }
        // Pass 2: apply remaining live corpse / smashed prop entries
        for (const item of list) {
            if (!item || !item.pType) continue;
            if (typeof item.pType === "string" && item.pType.startsWith("CORPSE:")) {
                const parts = item.pType.split(":");
                const g24Type = parts[1] || "civ0";
                const kindStr = parts[2] || "CIVILIAN";
                const cx = Number(item.x) || 0;
                const cy = Number(item.y) || 0;
                const ca = Number(item.a) || 0;
                if (ca < -900 || cx < 128 || cy < 128) {
                    continue;
                }
                if (corpseTombstones.some((tb) => Math.hypot(tb.x - cx, tb.y - cy) < 36)) {
                    continue;
                }
                if (Array.isArray(this.game.peds) && typeof Pedestrian === "function") {
                    let ped = this.game.peds.find((p) => p && Math.hypot((p.x || 0) - cx, (p.y || 0) - cy) < 22);
                    const cz = this.game.map.getHeightAtPixel ? this.game.map.getHeightAtPixel(cx, cy, 2.0) : 2.0;
                    if (!ped) {
                        ped = new Pedestrian({
                            id: `corpse_${Math.round(cx)}_${Math.round(cy)}`,
                            x: cx,
                            y: cy,
                            z: cz,
                            angle: ca,
                            kind: kindStr,
                            g24Type,
                            hp: 0,
                            speed: 0,
                            dead: true
                        });
                        ped._corpsePersisted = true;
                        ped._corpseSmashPType = item.pType;
                        ped._corpseSmashX = Math.round(cx);
                        ped._corpseSmashY = Math.round(cy);
                        this.game.peds.push(ped);
                    } else {
                        ped.dead = true;
                        ped.hp = 0;
                        ped.speed = 0;
                        ped.x = cx;
                        ped.y = cy;
                        ped.angle = ca;
                        ped._corpsePersisted = true;
                        ped._corpseSmashPType = item.pType;
                        ped._corpseSmashX = Math.round(cx);
                        ped._corpseSmashY = Math.round(cy);
                        if (typeof ped.computeState === "function") ped.state = ped.computeState();
                    }
                    if (Array.isArray(this.game.bloodDecals)) {
                        const hasBlood = this.game.bloodDecals.some((b) => Math.hypot((b.x || 0) - cx, (b.y || 0) - cy) < 18);
                        if (!hasBlood) {
                            if (this.game.bloodDecals.length >= 80) this.game.bloodDecals.shift();
                            this.game.bloodDecals.push({ x: cx, y: cy, z: cz, r: 10, alpha: 0.85 });
                        }
                    }
                }
                continue;
            }
            if (oe && typeof oe.applySmashedProp === "function") {
                oe.applySmashedProp(item);
            }
        }
    }

    tryApplyPendingProfileSync() {
        if (this._pendingProfileSync === undefined) return;
        if (!this.game || !this.game.started || !this.game.map || !this.game.map.cmpLoaded) return;
        const prof = this._pendingProfileSync;
        this._pendingProfileSync = undefined;
        this._profileSynced = true;
        if (!prof || typeof prof !== "object") {
            this.broadcastStateNow();
            return;
        }
        const g = this.game;
        const p = g.player;
        if (!p) return;

        // Economy v2 Migration Guard:
        // If the remote server sends a legacy pre-v2 profile (missing econVer >= 2) and this profileKey hasn't been migrated yet,
        // reset cash to START_CASH ($500) so old pre-v101_174 millionaire saves on the server are cleanly migrated to $500!
        const profKey = String(prof.name || this.playerName || "PLAYER").toUpperCase().replace(/[^A-Z0-9_#]/g, "");
        const migKey = `vc26_econ_v2_mig_${profKey}`;
        const alreadyMigratedLocal = this.safeGetStorage(migKey) === "1";
        const isV2Profile = (Number(prof.econVer) || 1) >= 2;
        if (!isV2Profile && !alreadyMigratedLocal) {
            this.safeSetStorage(migKey, "1");
            g.cash = g.START_CASH || 500;
            g.multiplier = 1;
        } else {
            this.safeSetStorage(migKey, "1");
            if (!prof.dead && typeof prof.cash === "number" && prof.cash >= (g.START_CASH || 500)) {
                g.cash = prof.cash;
            }
            if (!prof.dead && typeof prof.mlt === "number" && prof.mlt >= 1) {
                g.multiplier = Math.min(5, Math.max(1, Math.round(prof.mlt)));
            }
        }

        if (typeof prof.lvs === "number" && prof.lvs >= 1) {
            g.lives = Math.min(9, Math.max(1, Math.round(prof.lvs)));
        }
        if (typeof prof.jfc === "number" && prof.jfc >= 0) {
            g.jailFreeCards = Math.min(9, Math.max(0, Math.round(prof.jfc)));
        }
        if (typeof prof.bnd === "boolean") {
            p.bandana = prof.bnd;
        }
        if (typeof prof.msn === "number" && prof.msn > 0 && g.missions && typeof g.missions.applyStoryBitmask === "function") {
            g.missions.applyStoryBitmask(prof.msn);
        }
        if (prof.ank) {
            p.ankleScrambled = true;
        }
        if (!prof.dead && typeof prof.hp === "number" && prof.hp > 0) {
            p.hp = Math.min(p.maxHp || 100, prof.hp);
        }
        if (typeof prof.armor === "number") {
            p.armor = Math.min(p.maxArmor || 100, Math.max(p.armor || 0, prof.armor));
        }
        if (Array.isArray(prof.weaponsOwned) && prof.weaponsOwned.length > 0) {
            for (const w of prof.weaponsOwned) {
                if (w && !p.weaponsOwned.includes(w)) {
                    p.weaponsOwned.push(w);
                }
            }
        }
        if (prof.ammo && typeof prof.ammo === "object" && p.ammo) {
            for (const [wk, av] of Object.entries(prof.ammo)) {
                if (wk !== "FIST" && typeof av === "number" && av > (p.ammo[wk] || 0)) {
                    p.ammo[wk] = av;
                }
            }
        }
        if (prof.weapon && p.weaponsOwned.includes(prof.weapon)) {
            p.weapon = prof.weapon;
        }
        if (typeof prof.kills === "number" && prof.kills > this.kills) {
            this.kills = prof.kills;
        }
        if (!prof.dead && typeof prof.x === "number" && typeof prof.y === "number" && prof.x > 128 && prof.y > 128) {
            const isWater = g.map && typeof g.map.isWaterAtPixel === "function" && g.map.isWaterAtPixel(prof.x, prof.y);
            if (!isWater || prof.inVehId) {
                p.x = prof.x;
                p.y = prof.y;
                p.z = typeof prof.z === "number" ? prof.z : 2.0;
                if (typeof prof.a === "number") p.angle = prof.a;
                if (!prof.inVehId && g.map && typeof g.map.resolveCircleBuildingCollision === "function") {
                    const col = g.map.resolveCircleBuildingCollision(p.x, p.y, p.r || 10, p.z);
                    if (col && col.hit) {
                        p.x = col.x;
                        p.y = col.y;
                    }
                }
                g.cameraX = p.x;
                g.cameraY = p.y;
            }
        }
        if (prof.inVehId && Array.isArray(g.vehicles) && !p.inVehicle) {
            const v = g.vehicles.find((veh) => veh.id === prof.inVehId && !veh.destroyed);
            if (v && Math.hypot(v.x - p.x, v.y - p.y) < 180 && v.driver !== "REMOTE") {
                p.inVehicle = v;
                p.seatIndex = 0;
                v.driver = "PLAYER";
                v._worldModified = true;
                v.isStaticParked = false;
            }
        }
        if (typeof g.updateHud === "function") g.updateHud();
        if (typeof g.addFloatingText === "function") {
            g.addFloatingText(p.x, p.y - 42, "💾 PERSISTENT PROFILE RESTORED!", "#39ff14");
        }
        this.broadcastStateNow();
    }

    /* ========================================================================
       0A. LIVE 3-SERVER DIRECTORY & PLAYER COUNT TRACKER (VICE97 / MIAMI86 / KEYS305)
       ======================================================================== */
    initServerDirectory() {
        if (typeof BroadcastChannel !== "undefined") {
            try {
                this.dirBc = new BroadcastChannel("vc97_server_directory_v1");
                this.dirBc.onmessage = (ev) => {
                    const data = ev && ev.data;
                    if (!data || data.id === this.playerId) return;
                    if (data.t === "DIR_PING") {
                        this.broadcastDirectoryHeartbeat();
                    } else if (data.t === "DIR_HEARTBEAT") {
                        this.directoryPeers.set(data.id, {
                            room: data.room || "VICE97",
                            bots: data.bots || 0,
                            lastSeen: performance.now()
                        });
                        this.updateServerListUI();
                    } else if (data.t === "DIR_LEAVE") {
                        this.directoryPeers.delete(data.id);
                        this.updateServerListUI();
                    }
                };
                this.dirBc.postMessage({ t: "DIR_PING", id: this.playerId });
                this.broadcastDirectoryHeartbeat();
            } catch (_e) {}
        }
        if (typeof window !== "undefined") {
            const flushDisconnect = () => {
                if (this._disconnectFlushed) return;
                this._disconnectFlushed = true;
                if (this.game && this.game.started) {
                    const p = this.game.player;
                    if (p && p.inVehicle && (p.seatIndex || 0) === 0) {
                        const v = p.inVehicle;
                        this.broadcastWorldEvent({
                            kind: "VEH_EXIT",
                            vehId: v.id,
                            seat: 0,
                            specKey: v.specKey || "STALLION",
                            x: Math.round(v.x),
                            y: Math.round(v.y),
                            z: Math.round((v.z || 2.0) * 100) / 100,
                            a: Math.round((v.angle || 0) * 1000) / 1000,
                            hp: Math.round(v.hp || 100),
                            flags: (v.destroyed ? 1 : 0) | (v.frontDented ? 4 : 0) | (v.rearDented ? 8 : 0) | (v.heavyDented ? 16 : 0) | (v.fireExtinguished ? 128 : 0),
                            remapIdx: v.remapIdx || 0
                        });
                    }
                    this.broadcastStateNow();
                }
                this.sendPacket({ t: "LEAVE", id: this.playerId, name: this.playerName });
                if (this.dirBc) {
                    try {
                        this.dirBc.postMessage({ t: "DIR_LEAVE", id: this.playerId });
                    } catch (_e) {}
                }
            };
            window.addEventListener("beforeunload", flushDisconnect);
            window.addEventListener("pagehide", flushDisconnect);
            window.addEventListener("online", () => {
                if (!this.wsConnected && this.wsUrl) {
                    this._wsRetryCount = 0;
                    this.initWebSocketServer();
                }
            });
            if (typeof document !== "undefined") {
                document.addEventListener("visibilitychange", () => {
                    if (document.hidden) {
                        if (this.game && this.game.started) {
                            this.broadcastStateNow();
                        }
                    } else if (!this.wsConnected && this.wsUrl) {
                        this._wsRetryCount = 0;
                        this.initWebSocketServer();
                    }
                });
            }
        }
        this.updateServerListUI();
    }

    broadcastDirectoryHeartbeat() {
        const botCount = Array.from(this.remotePlayers.values()).filter((r) => r.isBot).length;
        if (this.wsConnected && this.ws && this._lastWsBots !== botCount) {
            this._lastWsBots = botCount;
            try {
                this.ws.send(JSON.stringify({
                    t: "DIR_HEARTBEAT",
                    id: this.playerId,
                    room: this.roomCode,
                    bots: botCount
                }));
            } catch (_e) {}
        }
        if (!this.dirBc) return;
        try {
            this.dirBc.postMessage({
                t: "DIR_HEARTBEAT",
                id: this.playerId,
                room: this.roomCode,
                bots: botCount
            });
        } catch (_e) {}
    }

    normalizeRoomCode(rawCode) {
        const clean = String(rawCode || "VICE26").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "VICE26";
        return clean === "VICE97" ? "VICE26" : clean;
    }

    getServerPlayerCount(targetRoom) {
        const normRoom = this.normalizeRoomCode(targetRoom);
        let srvCount = 0;
        if (this.wsConnected && this.serverRoomCounts) {
            if (normRoom === "VICE26") {
                // Combine VICE26 and legacy VICE97 counts if server hasn't restarted yet
                srvCount = Math.max(
                    Number(this.serverRoomCounts.VICE26) || 0,
                    Number(this.serverRoomCounts.VICE97) || 0
                );
            } else if (typeof this.serverRoomCounts[normRoom] === "number") {
                srvCount = this.serverRoomCounts[normRoom];
            }
        }
        if (normRoom === this.roomCode) {
            return Math.max(this.getPlayerCount(), srvCount);
        }
        if (this.wsConnected && this.serverRoomCounts) {
            return srvCount;
        }
        const now = performance.now();
        let count = 0;
        let maxBotsInRoom = 0;

        for (const [pid, info] of this.directoryPeers.entries()) {
            if (now - info.lastSeen > 4500) {
                this.directoryPeers.delete(pid);
                continue;
            }
            if (this.normalizeRoomCode(info.room) === normRoom) {
                count++;
                if ((info.bots || 0) > maxBotsInRoom) {
                    maxBotsInRoom = info.bots;
                }
            }
        }
        return count + maxBotsInRoom;
    }

    updateServerListUI() {
        if (typeof document === "undefined") return;
        const servers = ["VICE26", "MIAMI86", "KEYS305"];
        for (const srv of servers) {
            const count = this.getServerPlayerCount(srv);
            const countEl = document.getElementById(`srv-count-${srv}`) || (srv === "VICE26" ? document.getElementById("srv-count-VICE97") : null);
            const dotEl = document.getElementById(`srv-dot-${srv}`) || (srv === "VICE26" ? document.getElementById("srv-dot-VICE97") : null);
            if (countEl) {
                if (count <= 0) {
                    countEl.textContent = "0 ONLINE";
                } else if (count === 1) {
                    countEl.textContent = "1 PLAYER";
                } else {
                    countEl.textContent = `${count} PLAYERS`;
                }
            }
            if (dotEl) {
                dotEl.classList.toggle("online", count > 0);
            }
        }
    }

    getRoomDisplayName(code = this.roomCode) {
        return code === "VICE97" ? "VICE26" : code;
    }

    switchServer(newRoomCode) {
        const cleanRoom = this.normalizeRoomCode(newRoomCode);
        if (!cleanRoom) return;
        if (cleanRoom !== this.roomCode) {
            if (this.game && this.game.player && this.game.player.inVehicle && (this.game.player.seatIndex || 0) === 0) {
                const v = this.game.player.inVehicle;
                this.broadcastWorldEvent({
                    kind: "VEH_EXIT",
                    vehId: v.id,
                    seat: 0,
                    specKey: v.specKey || "STALLION",
                    x: Math.round(v.x),
                    y: Math.round(v.y),
                    z: Math.round((v.z || 2.0) * 100) / 100,
                    a: Math.round((v.angle || 0) * 1000) / 1000,
                    hp: Math.round(v.hp || 100),
                    flags: (v.destroyed ? 1 : 0) | (v.frontDented ? 4 : 0) | (v.rearDented ? 8 : 0) | (v.heavyDented ? 16 : 0) | (v.fireExtinguished ? 128 : 0),
                    remapIdx: v.remapIdx || 0
                });
            }
            this.sendPacket({ t: "LEAVE", id: this.playerId, name: this.playerName });
            this.roomCode = cleanRoom;
            this.remotePlayers.clear();
            this._pendingPropSync = [];
            this._pendingServerWorldSnapshot = null;
            this._serverBootstrapApplied = false;
            if (this.chatRoomBadge) {
                this.chatRoomBadge.textContent = `[${this.getRoomDisplayName()}]`;
            }
            if (this.wsConnected && this.ws) {
                try {
                    this.ws.send(JSON.stringify({
                        t: "SWITCH_ROOM",
                        id: this.playerId,
                        name: this.playerName,
                        room: this.roomCode
                    }));
                } catch (_e) {}
            }
            this.initBroadcastChannel();
            this.claimRoomSlot(0);
        }
        this.broadcastDirectoryHeartbeat();
        this.updateServerListUI();
    }

    /* ========================================================================
       0. LIVE MULTIPLAYER CHAT UI & 3D SPEECH BUBBLE SYSTEM [T]
       ======================================================================== */
    initChatUI() {
        if (typeof document === "undefined") return;
        this.chatWidget = document.getElementById("mp-chat-widget");
        this.chatMessagesEl = document.getElementById("mp-chat-messages");
        this.chatForm = document.getElementById("mp-chat-form");
        this.chatInput = document.getElementById("mp-chat-input");
        this.chatRoomBadge = document.getElementById("mp-chat-room");
        this.chatNameBtn = document.getElementById("mp-chat-name-btn");
        this.chatSizeBtn = document.getElementById("mp-chat-size-btn");
        this.chatResizeGrip = document.getElementById("mp-chat-resize-grip");
        this.chatToggleBtn = document.getElementById("mp-chat-toggle-btn");

        // Anti-spam state (local + quick buttons)
        this._chatSentTimestamps = [];
        this._chatMuteUntilMs = 0;
        this._lastChatSentText = "";
        this._lastChatSentMs = 0;
        this._quickCooldownUntilMs = 0;
        this._quickCooldownTimer = null;

        // PC Customizable Chat Size (S / M / L presets + free top-left corner drag resize, persisted in localStorage)
        const isMobileInit = typeof window !== "undefined" && (
            window.innerWidth <= 960 ||
            window.innerHeight <= 560 ||
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
        );
        const sizePresets = [
            { label: "S", w: 284, h: 86 },
            { label: "M", w: 344, h: 126 },
            { label: "L", w: 448, h: 224 }
        ];
        this._chatPresetIdx = 1;

        const applyChatDimensions = (w, h, presetLabel = null, save = true) => {
            if (!this.chatWidget || !this.chatMessagesEl || isMobileInit) return;
            const maxW = Math.max(280, Math.min(580, (window.innerWidth || 1280) - 32));
            const maxH = Math.max(80, Math.min(400, (window.innerHeight || 720) - 180));
            const clampedW = Math.max(260, Math.min(maxW, Math.round(w)));
            const clampedH = Math.max(76, Math.min(maxH, Math.round(h)));
            this.chatWidget.style.width = `${clampedW}px`;
            this.chatMessagesEl.style.height = `${clampedH}px`;
            if (this.chatSizeBtn) {
                this.chatSizeBtn.textContent = `⤢ ${presetLabel || "C"}`;
            }
            if (save) {
                this.safeSetStorage("vc97_chat_w", String(clampedW));
                this.safeSetStorage("vc97_chat_h", String(clampedH));
                if (presetLabel) this.safeSetStorage("vc97_chat_preset", presetLabel);
            }
            this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
        };

        if (!isMobileInit && this.chatWidget && this.chatMessagesEl) {
            const savedW = parseInt(this.safeGetStorage("vc97_chat_w") || "", 10);
            const savedH = parseInt(this.safeGetStorage("vc97_chat_h") || "", 10);
            const savedPreset = this.safeGetStorage("vc97_chat_preset") || "M";
            const foundIdx = sizePresets.findIndex((p) => p.label === savedPreset);
            if (foundIdx >= 0) this._chatPresetIdx = foundIdx;
            if (Number.isFinite(savedW) && Number.isFinite(savedH) && savedW >= 250 && savedH >= 70) {
                applyChatDimensions(savedW, savedH, savedPreset, false);
            }
        }

        if (this.chatSizeBtn && !isMobileInit) {
            this.chatSizeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.chatWidget && this.chatWidget.classList.contains("chat-collapsed")) {
                    this.chatWidget.classList.remove("chat-collapsed");
                    if (this.chatToggleBtn) this.chatToggleBtn.textContent = "–";
                }
                this._chatPresetIdx = (this._chatPresetIdx + 1) % sizePresets.length;
                const pr = sizePresets[this._chatPresetIdx];
                applyChatDimensions(pr.w, pr.h, pr.label, true);
            });
        }

        if (this.chatResizeGrip && this.chatWidget && this.chatMessagesEl && !isMobileInit) {
            this.chatResizeGrip.addEventListener("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = this.chatWidget.offsetWidth || 344;
                const startH = this.chatMessagesEl.offsetHeight || 126;

                const onMove = (me) => {
                    // Dragging top-left corner left/up increases width/height (since widget is anchored bottom-right)
                    const newW = startW + (startX - me.clientX);
                    const newH = startH + (startY - me.clientY);
                    applyChatDimensions(newW, newH, "C", false);
                };
                const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                    applyChatDimensions(
                        this.chatWidget.offsetWidth || 344,
                        this.chatMessagesEl.offsetHeight || 126,
                        "C",
                        true
                    );
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
            });
        }

        if (this.chatRoomBadge) {
            this.chatRoomBadge.textContent = `[${this.getRoomDisplayName()}]`;
        }
        if (this.chatNameBtn) {
            this.chatNameBtn.textContent = `✏️ ${this.playerName.slice(0, 12)}`;
            this.chatNameBtn.addEventListener("click", () => {
                this.focusChatInput("/name ");
            });
        }
        if (this.chatToggleBtn && this.chatWidget) {
            const isMobileInit = typeof window !== "undefined" && (
                window.innerWidth <= 960 ||
                window.innerHeight <= 560 ||
                (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
            );
            if (isMobileInit) {
                this.chatWidget.classList.add("chat-collapsed");
                this.chatToggleBtn.textContent = "+";
            }
            const toggleChatCollapse = () => {
                const collapsed = this.chatWidget.classList.toggle("chat-collapsed");
                this.chatToggleBtn.textContent = collapsed ? "+" : "–";
            };
            this.chatToggleBtn.addEventListener("click", toggleChatCollapse);
            const titleWrap = this.chatWidget.querySelector(".mp-chat-title-wrap");
            if (titleWrap) {
                titleWrap.style.cursor = "pointer";
                titleWrap.addEventListener("click", toggleChatCollapse);
            }
        }

        if (this.chatInput) {
            this.chatInput.addEventListener("focus", () => {
                this.isChatTyping = true;
                if (this.chatWidget) this.chatWidget.classList.add("chat-active");
                // Clear held movement/shoot keys so Lucia stops moving while typing
                if (this.game && this.game.input) {
                    this.game.input.up = false;
                    this.game.input.down = false;
                    this.game.input.left = false;
                    this.game.input.right = false;
                    this.game.input.handbrake = false;
                    this.game.input.shoot = false;
                    this.game.input.sprint = false;
                }
            });
            this.chatInput.addEventListener("blur", () => {
                this.isChatTyping = false;
                if (this.chatWidget) this.chatWidget.classList.remove("chat-active");
            });
        }

        if (this.chatForm) {
            this.chatForm.addEventListener("submit", (e) => {
                e.preventDefault();
                if (!this.chatInput) return;
                const val = this.chatInput.value.trim();
                this.chatInput.value = "";
                this.chatInput.blur();
                if (val) {
                    this.sendChatMessage(val);
                }
            });
        }

        const quickBtns = Array.from(document.querySelectorAll(".mp-quick-btn"));
        quickBtns.forEach((btn) => {
            btn.setAttribute("data-orig-label", btn.textContent || "");
            btn.addEventListener("click", () => {
                const msg = btn.getAttribute("data-msg");
                if (!msg) return;
                const nowMs = performance.now();
                if (nowMs < (this._quickCooldownUntilMs || 0)) {
                    const waitSec = Math.ceil(((this._quickCooldownUntilMs || 0) - nowMs) / 1000);
                    this.addChatLog("ANTI-SPAM", `⏳ Quick-chat cooldown (${waitSec}s)...`, "#fde047", true);
                    return;
                }
                const sent = this.sendChatMessage(msg, true);
                if (sent) {
                    this._quickCooldownUntilMs = nowMs + 4000;
                    quickBtns.forEach((b) => {
                        b.disabled = true;
                        b.classList.add("mp-quick-cooldown");
                    });
                    if (this._quickCooldownTimer) clearInterval(this._quickCooldownTimer);
                    const updateQuickBtnLabels = () => {
                        const remMs = (this._quickCooldownUntilMs || 0) - performance.now();
                        if (remMs <= 0) {
                            clearInterval(this._quickCooldownTimer);
                            this._quickCooldownTimer = null;
                            quickBtns.forEach((b) => {
                                b.disabled = false;
                                b.classList.remove("mp-quick-cooldown");
                                b.textContent = b.getAttribute("data-orig-label") || b.textContent;
                            });
                        } else {
                            const sec = Math.ceil(remMs / 1000);
                            btn.textContent = `⏳ ${sec}s`;
                        }
                    };
                    updateQuickBtnLabels();
                    this._quickCooldownTimer = setInterval(updateQuickBtnLabels, 250);
                }
            });
        });

        this.addChatLog(
            "VICE NET",
            `🟢 Room [${this.getRoomDisplayName()}] • ${this.playerName}`,
            "#00f0ff",
            true
        );
    }

    focusChatInput(prefill = "") {
        if (!this.chatInput) return;
        if (this.chatWidget && this.chatWidget.classList.contains("chat-collapsed")) {
            this.chatWidget.classList.remove("chat-collapsed");
            if (this.chatToggleBtn) this.chatToggleBtn.textContent = "–";
        }
        if (prefill) {
            this.chatInput.value = prefill;
        }
        this.chatInput.focus();
    }

    addChatLog(author, text, color = "#00f0ff", isSystem = false, customTimeStr = null) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const timeStr = customTimeStr || `${hh}:${mm}`;

        if (!isSystem && text) {
            if (!this._seenChatKeys) this._seenChatKeys = new Set();
            this._seenChatKeys.add(`${timeStr}|${author || "PLAYER"}|${text}`);
        }

        this.chatHistory.push({ timeStr, author, text, color, isSystem });
        if (this.chatHistory.length > 40) {
            this.chatHistory.shift();
        }

        if (!this.chatMessagesEl) return;
        const row = document.createElement("div");
        row.className = isSystem ? "mp-chat-line mp-sys" : "mp-chat-line";
        if (isSystem && typeof text === "string" && text.startsWith("🟢 Room [")) {
            row.setAttribute("data-room-banner", "1");
            const oldBanners = this.chatMessagesEl.querySelectorAll('[data-room-banner="1"]');
            oldBanners.forEach((el) => el.remove());
        }

        const timeSpan = document.createElement("span");
        timeSpan.className = "mp-time";
        timeSpan.textContent = timeStr;
        row.appendChild(timeSpan);

        if (!isSystem || (author && author !== "VICE NET")) {
            const authSpan = document.createElement("span");
            authSpan.className = "mp-author";
            authSpan.style.color = color || "#00f0ff";
            authSpan.textContent = isSystem ? `[${author}]` : `${author}:`;
            row.appendChild(authSpan);
        }

        const msgSpan = document.createElement("span");
        msgSpan.className = "mp-msg-text";
        msgSpan.textContent = text;
        row.appendChild(msgSpan);

        this.chatMessagesEl.appendChild(row);
        while (this.chatMessagesEl.children.length > 40) {
            this.chatMessagesEl.removeChild(this.chatMessagesEl.firstChild);
        }
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
    }

    setIdentity(nickname, charId, pedType, color, roomCode) {
        const cleanName = String(nickname || "").trim().slice(0, 18).toUpperCase();
        if (cleanName) {
            this.playerName = cleanName;
            this.safeSetStorage("vc97_mp_name", cleanName);
            if (this.chatNameBtn) {
                this.chatNameBtn.textContent = `✏️ ${this.playerName.slice(0, 12)}`;
            }
        }
        if (charId) {
            this.safeSetStorage("vc97_mp_char", charId);
        }
        if (pedType) {
            this.pedSpriteType = pedType;
        }
        if (color) {
            this.playerColor = color;
        }
        const cleanRoom = roomCode ? this.normalizeRoomCode(roomCode) : "";
        this._profileSynced = false;
        if (cleanRoom && cleanRoom !== this.roomCode) {
            this.roomCode = cleanRoom;
            this.remotePlayers.clear();
            if (this.chatRoomBadge) {
                this.chatRoomBadge.textContent = `[${this.getRoomDisplayName()}]`;
            }
            if (this.wsConnected && this.ws) {
                try {
                    this.ws.send(JSON.stringify({
                        t: "SWITCH_ROOM",
                        id: this.playerId,
                        name: this.playerName,
                        color: this.playerColor,
                        pedType: this.pedSpriteType,
                        room: this.roomCode
                    }));
                } catch (_e) {}
            }
            this.initBroadcastChannel();
            this.claimRoomSlot(0);
        } else {
            this.sendPacket({
                t: "JOIN",
                started: true,
                id: this.playerId,
                name: this.playerName,
                color: this.playerColor,
                pedType: this.pedSpriteType
            });
            if (!this.wsConnected) {
                this._profileSynced = true;
                this.broadcastStateNow();
            }
        }
        // Replace initial startup system line if no player messages have been sent yet
        if (
            this.chatMessagesEl &&
            this.chatMessagesEl.children.length === 1 &&
            this.chatMessagesEl.firstChild.classList.contains("mp-sys")
        ) {
            this.chatMessagesEl.innerHTML = "";
            this.chatHistory.length = 0;
        }
        this.addChatLog(
            "VICE NET",
            `🟢 Room [${this.getRoomDisplayName()}] • ${this.playerName} (${charId || "LUCIA"})`,
            this.playerColor,
            true
        );
    }

    sendChatMessage(rawText, isQuick = false) {
        const cleaned = String(rawText || "").trim().slice(0, 140);
        if (!cleaned) return false;

        // Slash command: /name NewPseudo or /nick NewPseudo
        if (/^\/(name|nick|pseudo)\s+/i.test(cleaned)) {
            const newName = cleaned.replace(/^\/(name|nick|pseudo)\s+/i, "").trim().slice(0, 18).toUpperCase();
            if (newName) {
                const oldName = this.playerName;
                this.playerName = newName;
                if (this.game && this.game.player) {
                    this.game.player.nickname = newName;
                }
                this.safeSetStorage("vc97_mp_name", newName);
                if (this.chatNameBtn) {
                    this.chatNameBtn.textContent = `✏️ ${this.playerName.slice(0, 12)}`;
                }
                this.addChatLog("VICE NET", `You changed your nickname to ${this.playerName}`, "#39ff14", true);
                this.sendPacket({
                    t: "NAME",
                    oldName,
                    name: this.playerName,
                    color: this.playerColor
                });
                this.broadcastStateNow();
            }
            return true;
        }

        // Slash command: /clear
        if (/^\/clear$/i.test(cleaned)) {
            if (this.chatMessagesEl) this.chatMessagesEl.innerHTML = "";
            this.addChatLog("VICE NET", "Chat history cleared.", "#00f0ff", true);
            return true;
        }

        // Slash command: /server ws://IP:8787 or /server wss://domain (connect to Hostinger KVM2 Persistent World Server)
        if (/^\/(server|ws)\b/i.test(cleaned)) {
            const arg = cleaned.replace(/^\/(server|ws)\s*/i, "").trim();
            if (!arg) {
                const status = this.wsConnected ? `🟢 CONNECTED (${this.wsUrl})` : (this.wsUrl ? `🟡 RECONNECTING (${this.wsUrl})` : "⚪ P2P MODE (Use /server ws://IP:8787 to link KVM2)");
                this.addChatLog("WORLD SERVER", status, "#00f0ff", true);
            } else if (arg.toLowerCase() === "off" || arg.toLowerCase() === "p2p") {
                this.initWebSocketServer("");
                this.addChatLog("WORLD SERVER", "Switched to P2P mode.", "#fde047", true);
            } else {
                const normalized = /^wss?:\/\//i.test(arg) ? arg : `ws://${arg}`;
                this.addChatLog("WORLD SERVER", `Connecting to ${normalized}...`, "#39ff14", true);
                this.initWebSocketServer(normalized);
            }
            return true;
        }

        // ====================================================================
        // ANTI-SPAM FILTER (Quick-Chat Cooldown + Burst Rate Limit + Duplicate Block)
        // ====================================================================
        const nowMs = performance.now();
        if (nowMs < (this._chatMuteUntilMs || 0)) {
            const waitSec = Math.ceil(((this._chatMuteUntilMs || 0) - nowMs) / 1000);
            this.addChatLog("ANTI-SPAM", `🚫 Muted for spam! Wait ${waitSec}s.`, "#ff2a85", true);
            return false;
        }

        const minGapMs = isQuick ? 4000 : 550;
        if (this._lastChatSentMs && (nowMs - this._lastChatSentMs) < minGapMs) {
            const waitSec = Math.max(1, Math.ceil((minGapMs - (nowMs - this._lastChatSentMs)) / 1000));
            this.addChatLog("ANTI-SPAM", `⏳ Slow down! Wait ${waitSec}s.`, "#fde047", true);
            return false;
        }

        const dupWindowMs = isQuick ? 8000 : 4500;
        if (
            this._lastChatSentText &&
            this._lastChatSentText.toLowerCase() === cleaned.toLowerCase() &&
            (nowMs - (this._lastChatSentMs || 0)) < dupWindowMs
        ) {
            this.addChatLog("ANTI-SPAM", "⏳ Please don't spam the same message!", "#fde047", true);
            return false;
        }

        if (!this._chatSentTimestamps) this._chatSentTimestamps = [];
        this._chatSentTimestamps = this._chatSentTimestamps.filter((t) => nowMs - t < 10000);
        if (this._chatSentTimestamps.length >= 7) {
            this._chatMuteUntilMs = nowMs + 5000;
            this.addChatLog("ANTI-SPAM", "🚫 Flood detected! Chat paused for 5s.", "#ff2a85", true);
            return false;
        }
        this._chatSentTimestamps.push(nowMs);
        this._lastChatSentMs = nowMs;
        this._lastChatSentText = cleaned;

        const p = this.game ? this.game.player : null;
        if (p) {
            p.chatText = cleaned;
            p.chatTimer = 6.5;
        }

        this.addChatLog(this.playerName, cleaned, this.playerColor, false);

        if (this.game && this.game.audio) {
            this.game.audio.playBeep(720, 0.035, "sine", 0.04);
        }
        if (this.game && typeof this.game.sendPager === "function") {
            this.game.sendPager(`💬 ${this.playerName}`, cleaned, false);
        }

        this.sendPacket({
            t: "CHAT",
            name: this.playerName,
            color: this.playerColor,
            text: cleaned,
            x: p ? Math.round(p.x) : 0,
            y: p ? Math.round(p.y) : 0
        });

        // Interactive AI Agents (@fixer, @diaz, @sonny, @toussaint, @mitch, @cortez, @radio, /ai)
        this.handleInteractiveAiChat(cleaned);

        // If any Online Rival Bots are present in the lobby, let one reply naturally after ~1s!
        const bots = Array.from(this.remotePlayers.values()).filter((r) => r.isBot && !r.dead);
        if (bots.length > 0) {
            const bot = bots[Math.floor(Math.random() * bots.length)];
            setTimeout(() => {
                if (!this.remotePlayers.has(bot.id)) return;
                const lower = cleaned.toLowerCase();
                let reply = "Meet up on Ocean Drive in front of Hotel Dixon! 🌴🔥";
                if (lower.includes("race") || lower.includes("course")) {
                    reply = "Let's go! Ocean Drive to South Pier, last one there buys a round at Club Nine1Nine! 🏎️💨";
                } else if (lower.includes("yo") || lower.includes("salut") || lower.includes("hello") || lower.includes("slt") || lower.includes("cc")) {
                    reply = `Yo ${this.playerName}! Welcome to Vice City 26! 👋🌴`;
                } else if (lower.includes("gg") || lower.includes("bien joué")) {
                    reply = "GG! This engine runs like clockwork! 🔥";
                } else if (lower.includes("gps") || lower.includes("rejoins") || lower.includes("me")) {
                    reply = "On my way full throttle to your GPS ping! 📍🚓";
                }
                bot.chatText = reply;
                bot.chatTimer = 6.5;
                this.addChatLog(bot.name, reply, bot.color, false);
                if (this.game && this.game.audio) {
                    this.game.audio.playBeep(820, 0.04, "sine", 0.04);
                }
                if (this.game && typeof this.game.sendPager === "function") {
                    this.game.sendPager(`💬 ${bot.name}`, reply, false);
                }
            }, 950);
        }
        return true;
    }

    safeGetStorage(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (_e) {
            return null;
        }
    }

    safeSetStorage(key, val) {
        try {
            if (window.localStorage) window.localStorage.setItem(key, val);
        } catch (_e) {
            // Ignore storage errors in private browsing
        }
    }

    /* ========================================================================
       1. LOCAL MULTI-TAB / SAME-PC TRANSPORT (BroadcastChannel, 0ms latency)
       ======================================================================== */
    initBroadcastChannel() {
        if (typeof BroadcastChannel === "undefined") return;
        try {
            if (this.bc) this.bc.close();
            this.bc = new BroadcastChannel(`vc97_room_${this.roomCode}`);
            this.bc.onmessage = (ev) => {
                // When connected to the dedicated WebSocket server, ignore duplicate local BroadcastChannel echo to prevent 50ms double-packet jitter!
                if (this.wsConnected) return;
                if (ev && ev.data) {
                    this.handlePacket(ev.data);
                }
            };
            this.statusText = `ONLINE (${this.roomCode})`;
            // Announce join immediately
            this.sendPacket({
                t: "JOIN",
                id: this.playerId,
                name: this.playerName,
                color: this.playerColor,
                pedType: this.pedSpriteType
            });
        } catch (err) {
            console.warn("BroadcastChannel init failed:", err);
        }
    }

    /* ========================================================================
       2. GLOBAL INTERNET WEBRTC P2P MESH (PeerJS Deterministic Room Slots)
       ======================================================================== */
    initWebRTCMesh() {
        if (typeof window === "undefined") return;
        // Only initialize PeerJS WebRTC fallback if the dedicated Hostinger WebSocket server is not connected after 3.5s
        setTimeout(() => {
            if (this.wsConnected) return;
            if (typeof window.Peer === "function") {
                this.claimRoomSlot(0);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
            script.async = true;
            script.onload = () => {
                if (!this.wsConnected && typeof window.Peer === "function") {
                    this.claimRoomSlot(0);
                }
            };
            script.onerror = () => {
                if (!this.wsConnected) {
                    this.statusText = `LOCAL ONLINE (${this.roomCode})`;
                }
            };
            document.head.appendChild(script);
        }, 3500);
    }

    getSlotPeerId(slotIdx) {
        return `vc97-demake-${this.roomCode.toLowerCase()}-slot-${slotIdx}`;
    }

    claimRoomSlot(trySlot) {
        if (typeof window.Peer !== "function") return;
        if (trySlot >= this.maxSlots) {
            // Fallback to random Peer ID and connect to all slots
            this.createPeerInstance(null, -1);
            return;
        }
        const candidateId = this.getSlotPeerId(trySlot);
        this.createPeerInstance(candidateId, trySlot);
    }

    createPeerInstance(peerId, slotIdx) {
        try {
            if (this._slotDialTimer) {
                clearInterval(this._slotDialTimer);
                this._slotDialTimer = null;
            }
            if (this.peer) {
                try { this.peer.destroy(); } catch (_e) {}
            }
            const peer = peerId ? new window.Peer(peerId) : new window.Peer();
            this.peer = peer;

            peer.on("open", (id) => {
                this.slotIndex = slotIdx;
                this.webrtcReady = true;
                this.statusText = `ONLINE (${this.roomCode})`;
                // Stagger outgoing P2P mesh slot connections (1 per 35ms instead of 23 in 1 frame)
                // so WebRTC ICE setup never causes a main-thread hitch!
                let s = 0;
                this._slotDialTimer = setInterval(() => {
                    if (!this.peer || this.peer !== peer || this.peer.destroyed || s >= this.maxSlots) {
                        clearInterval(this._slotDialTimer);
                        this._slotDialTimer = null;
                        return;
                    }
                    const curSlot = s++;
                    if (curSlot === slotIdx) return;
                    const targetPeerId = this.getSlotPeerId(curSlot);
                    if (targetPeerId === id) return;
                    try {
                        const conn = peer.connect(targetPeerId, { reliable: false });
                        this.setupDataConnection(conn);
                    } catch (_e) {}
                }, 35);
            });

            peer.on("connection", (conn) => {
                this.setupDataConnection(conn);
            });

            peer.on("error", (err) => {
                if (err && err.type === "unavailable-id" && slotIdx >= 0) {
                    // This slot is occupied by another player in the room; try the next slot!
                    this.claimRoomSlot(slotIdx + 1);
                }
            });
        } catch (_err) {
            // Keep BroadcastChannel active if WebRTC fails
        }
    }

    setupDataConnection(conn) {
        if (!conn) return;
        conn.on("open", () => {
            this.peerConns.set(conn.peer, conn);
            conn.send({
                t: "JOIN",
                id: this.playerId,
                name: this.playerName,
                color: this.playerColor,
                pedType: this.pedSpriteType
            });
        });
        conn.on("data", (data) => {
            if (data && typeof data === "object") {
                this.handlePacket(data);
            }
        });
        conn.on("close", () => {
            this.peerConns.delete(conn.peer);
        });
        conn.on("error", () => {
            this.peerConns.delete(conn.peer);
        });
    }

    /* ========================================================================
       3. PACKET TRANSMISSION & RECEPTION
       ======================================================================== */
    sendPacket(pkt) {
        if (!this.enabled) return;
        pkt.id = this.playerId;
        pkt.room = this.roomCode;
        pkt.ts = performance.now();

        if (this.wsConnected && this.ws && this.ws.readyState === 1) {
            try {
                this.ws.send(JSON.stringify(pkt));
            } catch (_e) {}
        } else if (this.bc) {
            try {
                this.bc.postMessage(pkt);
            } catch (_e) {}
        }

        // When connected to the dedicated Hostinger KVM2 WebSocket server, skip redundant P2P mesh fan-out
        if (!this.wsConnected && this.peerConns.size > 0) {
            for (const [peerId, conn] of this.peerConns.entries()) {
                if (conn && conn.open) {
                    try {
                        conn.send(pkt);
                    } catch (_e) {
                        this.peerConns.delete(peerId);
                    }
                }
            }
        }
    }

    handlePacket(pkt) {
        if (!pkt || pkt.id === this.playerId) return;

        if (pkt.t === "LEAVE") {
            if (this.remotePlayers.has(pkt.id)) {
                this.remotePlayers.delete(pkt.id);
                this.updateServerListUI();
            }
            return;
        }

        if (pkt.t === "JOIN") {
            if (pkt.started === false) return;
            const isNew = !this.remotePlayers.has(pkt.id);
            const rp = this.ensureRemotePlayer(pkt);
            if (typeof pkt.slot === "number") rp.slot = pkt.slot;
            const nowMs = performance.now();
            if (isNew && this.game && (nowMs - (rp._lastJoinAnnounceMs || 0)) > 12000) {
                rp._lastJoinAnnounceMs = nowMs;
                this.addChatLog(
                    "VICE NET",
                    `🌐 ${pkt.name || "PLAYER"} joined room [${this.roomCode}] (${this.getPlayerCount()}P online)`,
                    pkt.color || "#00f0ff",
                    true
                );
                this.game.addFloatingText(
                    this.game.player.x,
                    this.game.player.y - 34,
                    `🌐 ${pkt.name || "PLAYER"} JOINED!`,
                    pkt.color || "#00f0ff"
                );
                if (typeof this.game.sendPager === "function") {
                    this.game.sendPager(
                        "VICE CITY ONLINE",
                        `🌐 ${pkt.name || "PLAYER"} joined room [${this.roomCode}]! (${this.getPlayerCount()} players online).`,
                        false
                    );
                }
            }
            // Reply with our current state & all-time high scores immediately so the newcomer sees us right away
            this.broadcastStateNow();
            if (this.game && typeof this.game.getAllTimeHighScores === "function") {
                this.sendPacket({
                    t: "LEADERBOARD_SYNC",
                    econVer: 2,
                    entries: this.game.getAllTimeHighScores()
                });
            }
            if (this.game && typeof this.game.ensureTurfZones === "function") {
                const zones = this.game.ensureTurfZones();
                const standings = {};
                let hasAny = false;
                for (const [k, z] of Object.entries(zones)) {
                    if (z && z.leaderName && z.leaderScore > 0) {
                        standings[k] = {
                            leaderName: z.leaderName,
                            leaderColor: z.leaderColor || "#00f0ff",
                            leaderScore: z.leaderScore
                        };
                        hasAny = true;
                    }
                }
                if (hasAny) {
                    this.broadcastWorldEvent({
                        kind: "TURF_SYNC",
                        standings
                    });
                }
            }
            if (this.isWorldHost()) {
                if (this.game && this.game.activeFlashEvent && (this.game.activeFlashEvent.timer || 0) > 5) {
                    this.broadcastWorldEvent({
                        kind: "FLASH_DROP_SPAWN",
                        x: Math.round(this.game.activeFlashEvent.x),
                        y: Math.round(this.game.activeFlashEvent.y),
                        z: this.game.activeFlashEvent.z || 2.0,
                        reward: this.game.activeFlashEvent.reward || 800,
                        weapon: this.game.activeFlashEvent.weapon || "ROCKET",
                        duration: Math.ceil(this.game.activeFlashEvent.timer)
                    });
                }
                if (this.game && this.game.activeServerBounty && (this.game.activeServerBounty.timer || 0) > 5) {
                    this.broadcastWorldEvent({
                        kind: "BOUNTY_START",
                        targetId: this.game.activeServerBounty.targetId,
                        targetName: this.game.activeServerBounty.targetName,
                        reward: this.game.activeServerBounty.reward || 1200,
                        duration: Math.ceil(this.game.activeServerBounty.timer)
                    });
                }
                this.broadcastWorldSync();
            }
            return;
        }

        if (pkt.t === "LEADERBOARD_SYNC" && this.game && typeof this.game.mergeAllTimeScores === "function") {
            this.game.mergeAllTimeScores(pkt.entries, true, pkt.econVer || 1);
            return;
        }

        if (pkt.t === "HISCORE" && this.game && typeof this.game.recordHighScore === "function") {
            if ((pkt.econVer || 1) >= 2 || (pkt.sc || 0) <= 50000) {
                this.game.recordHighScore(pkt.name, pkt.charId || "LUCIA", pkt.sc || 0, pkt.color || "#00f0ff", false);
            }
            return;
        }

        if (pkt.t === "CHAT") {
            const rp = this.ensureRemotePlayer(pkt);
            const msg = String(pkt.text || "").trim().slice(0, 140);
            if (!msg) return;
            // Remote player anti-spam guard (ignore rapid floods or repeated identical messages)
            const nowMs = performance.now();
            if (rp._lastChatMs && (nowMs - rp._lastChatMs) < 500) return;
            if (rp._lastChatText && rp._lastChatText.toLowerCase() === msg.toLowerCase() && (nowMs - (rp._lastChatMs || 0)) < 4500) return;
            rp._lastChatMs = nowMs;
            rp._lastChatText = msg;
            rp.name = pkt.name || rp.name;
            rp.color = pkt.color || rp.color;
            rp.chatText = msg;
            rp.chatTimer = 6.5;
            this.addChatLog(rp.name, msg, rp.color, false);
            if (this.game && this.game.audio) {
                this.game.audio.playBeep(820, 0.04, "sine", 0.045);
            }
            if (this.game && typeof this.game.sendPager === "function") {
                this.game.sendPager(`💬 ${rp.name}`, msg, false);
            }
            return;
        }

        if (pkt.t === "NAME") {
            const rp = this.ensureRemotePlayer(pkt);
            const oldName = pkt.oldName || rp.name;
            rp.name = pkt.name || rp.name;
            this.addChatLog("VICE NET", `✏️ ${oldName} is now known as ${rp.name}`, rp.color || "#39ff14", true);
            return;
        }

        if (pkt.t === "STATE") {
            // Ignore un-started lobby tabs or outdated zombie browser tabs (< v101_181)
            if (pkt.started === false || (pkt.ver || 0) < 101181) {
                if (this.remotePlayers.has(pkt.id)) {
                    this.remotePlayers.delete(pkt.id);
                    this.updateServerListUI();
                }
                return;
            }
            const rp = this.ensureRemotePlayer(pkt);
            rp.name = pkt.name || rp.name;
            rp.color = pkt.color || rp.color;
            rp.pedType = pkt.pedType || rp.pedType;
            if (typeof pkt.slot === "number") rp.slot = pkt.slot;
            rp.wantedLevel = pkt.wl || 0;
            rp.targetX = pkt.x;
            rp.targetY = pkt.y;
            rp.targetZ = pkt.z !== undefined ? pkt.z : 2.0;
            rp.targetAngle = pkt.a || 0;
            rp.vx = pkt.vx || 0;
            rp.vy = pkt.vy || 0;
            rp.hp = pkt.hp !== undefined ? pkt.hp : 100;
            rp.armor = pkt.ar !== undefined ? pkt.ar : 0;
            rp.dead = Boolean(pkt.dead);
            rp.weapon = pkt.wep || "FIST";
            rp.isMoving = Boolean(pkt.mov);
            rp.isRunning = Boolean(pkt.run);
            rp.walkPhase = pkt.wp || 0;
            rp.muzzleTimer = pkt.mz || 0;
            rp.kills = pkt.k || 0;
            rp.isHidden = Boolean(pkt.hid);
            rp.isFocused = pkt.foc !== undefined ? Boolean(pkt.foc) : !pkt.hid;
            rp.ver = pkt.ver || 0;
            rp.veh = pkt.veh || null;
            rp.lastSeen = performance.now();
            if (typeof pkt.sc === "number" && pkt.sc > 0 && ((pkt.econVer || 1) >= 2 || pkt.sc <= 50000) && this.game && typeof this.game.recordHighScore === "function") {
                this.game.recordHighScore(rp.name, pkt.charId || "LUCIA", pkt.sc, rp.color, false);
            }

            if (!rp.initialized) {
                rp.x = rp.targetX;
                rp.y = rp.targetY;
                rp.z = rp.targetZ;
                rp.angle = rp.targetAngle;
                rp.initialized = true;
            }
            return;
        }

        if (pkt.t === "WORLD_SYNC" && this.game) {
            if (pkt.id === "server_world") {
                if (this.game.map && this.game.map.cmpLoaded && this.game.vehicles && this.game.vehicles.length > 0) {
                    this.applyWorldSync(pkt);
                } else {
                    this._pendingServerWorldSnapshot = pkt;
                }
            } else if ((pkt.ver || 0) >= 101181 && !this.isWorldHost()) {
                this.applyWorldSync(pkt);
            }
            return;
        }

        if (pkt.t === "WORLD_EVENT" && this.game) {
            this.applyWorldEvent(pkt);
            return;
        }

        if (pkt.t === "SHOOT" && this.game) {
            const rp = this.remotePlayers.get(pkt.id);
            if (rp) {
                rp.muzzleTimer = 0.10;
            }
            const dist = Math.hypot((pkt.x || 0) - this.game.player.x, (pkt.y || 0) - this.game.player.y);
            if (dist < 620 && this.game.audio) {
                this.game.audio.playShot(pkt.wep || "PISTOL");
            }
            if (Array.isArray(pkt.pellets)) {
                const maxPellets = pkt.pellets.slice(0, 12);
                for (const pl of maxPellets) {
                    if (!pl || typeof pl.x !== "number" || typeof pl.y !== "number") continue;
                    this.game.projectiles.push({
                        x: pl.x,
                        y: pl.y,
                        vx: Number(pl.vx) || 0,
                        vy: Number(pl.vy) || 0,
                        angle: Math.atan2(pl.vy || 0, pl.vx || 1),
                        damage: Math.max(1, Math.min(180, Number(pl.dmg) || 20)),
                        rangeLeft: Math.max(10, Math.min(900, Number(pl.rng) || 320)),
                        isFlame: Boolean(pl.flm),
                        isRocket: Boolean(pl.rck),
                        isTankShell: Boolean(pl.tsh),
                        isElectro: Boolean(pl.elc),
                        fromPlayer: false,
                        fromRemoteId: pkt.id,
                        fromRemoteName: pkt.name || "REMOTE PLAYER",
                        r: pl.flm ? 9 : 4
                    });
                }
            }
            return;
        }

        if (pkt.t === "EXPLODE" && this.game) {
            if (typeof pkt.x === "number" && typeof pkt.y === "number") {
                const safeRad = Math.max(20, Math.min(180, Number(pkt.rad) || 120));
                const safeDmg = Math.max(10, Math.min(250, Number(pkt.dmg) || 180));
                this.game.explodeAt(pkt.x, pkt.y, safeRad, safeDmg, false, true);
            }
            return;
        }

        if (pkt.t === "HORN" && this.game) {
            const dist = Math.hypot((pkt.x || 0) - this.game.player.x, (pkt.y || 0) - this.game.player.y);
            if (dist < 600 && this.game.audio) {
                this.game.audio.playHorn(Boolean(pkt.siren));
            }
            this.game.addFloatingText(pkt.x, pkt.y - 28, pkt.text || "📯 HONK!", pkt.color || "#ffd13b");
            return;
        }

        if (pkt.t === "KILLED" && this.game) {
            this.addChatLog(
                "PVP FRAG",
                `💀 ${pkt.killerName} wasted ${pkt.victimName}!`,
                "#ff2a85",
                true
            );
            let bountyBonus = 0;
            if (this.game.activeServerBounty && (this.game.activeServerBounty.targetId === pkt.id || this.game.activeServerBounty.targetName === pkt.victimName)) {
                bountyBonus = this.game.activeServerBounty.reward || 1200;
                this.game.activeServerBounty = null;
                this.addChatLog(
                    "VICE NET BOUNTY",
                    `🎯 ${pkt.killerName} claimed the $${bountyBonus.toLocaleString()} bounty on ${pkt.victimName}!`,
                    "#fde047",
                    true
                );
            }
            if (pkt.killerId === this.playerId) {
                this.kills++;
                this.game.addCash(500 + bountyBonus, bountyBonus > 0 ? `🎯 BOUNTY FRAG: ${pkt.victimName}!` : `PVP FRAG: ${pkt.victimName}!`);
                this.game.showBigBanner(
                    bountyBonus > 0 ? "🎯 SERVER BOUNTY CLAIMED!" : "ONLINE FRAG!",
                    `YOU WASTED ${pkt.victimName}! (+$${(500 + bountyBonus).toLocaleString()} • KILLS: ${this.kills})`,
                    "#00f0ff",
                    2.6
                );
            } else {
                this.game.addFloatingText(
                    pkt.x || this.game.player.x,
                    (pkt.y || this.game.player.y) - 32,
                    `💀 ${pkt.killerName} WASTED ${pkt.victimName}!`,
                    "#ff2a85"
                );
            }
        }
    }

    ensureRemotePlayer(pkt) {
        let rp = this.remotePlayers.get(pkt.id);
        if (!rp) {
            const defX = (typeof mx256 === "function" ? mx256(213.5) : 443.5) * 64;
            const defY = (typeof my256 === "function" ? my256(146.0) : 287.0) * 64;
            rp = {
                id: pkt.id,
                name: pkt.name || "LUCIA ONLINE",
                color: pkt.color || "#00f0ff",
                pedType: pkt.pedType || "gang",
                x: pkt.x || defX,
                y: pkt.y || defY,
                z: pkt.z || 2.0,
                angle: pkt.a || 0,
                targetX: pkt.x || defX,
                targetY: pkt.y || defY,
                targetZ: pkt.z || 2.0,
                targetAngle: pkt.a || 0,
                vx: 0,
                vy: 0,
                hp: 100,
                armor: 50,
                dead: false,
                weapon: "PISTOL",
                isMoving: false,
                isRunning: false,
                walkPhase: 0,
                muzzleTimer: 0,
                kills: 0,
                wantedLevel: pkt.wl || 0,
                slot: typeof pkt.slot === "number" ? pkt.slot : -1,
                veh: null,
                _linkedWorldVeh: false,
                initialized: pkt.x !== undefined,
                lastSeen: performance.now(),
                isBot: false
            };
            this.remotePlayers.set(pkt.id, rp);
        }
        return rp;
    }

    getHumanRemotePlayers() {
        const list = [];
        const now = performance.now();
        for (const rp of this.remotePlayers.values()) {
            if (!rp.isBot && now - rp.lastSeen <= 8500) {
                list.push(rp);
            }
        }
        return list;
    }

    getMaxWantedLevel() {
        let maxW = 0;
        for (const rp of this.getHumanRemotePlayers()) {
            if ((rp.wantedLevel || 0) > maxW) {
                maxW = rp.wantedLevel || 0;
            }
        }
        return maxW;
    }

    isWorldHost() {
        const MY_VER = 101181;
        const humans = this.getHumanRemotePlayers();
        if (humans.length === 0) return true;
        const now = performance.now();
        const myHidden = Boolean(typeof document !== "undefined" && document.hidden);
        const myFocused = Boolean(!myHidden && (typeof document === "undefined" || typeof document.hasFocus !== "function" || document.hasFocus()));
        const mySlot = (typeof this.slotIndex === "number" && this.slotIndex >= 0) ? this.slotIndex : 999;
        for (const rp of humans) {
            if ((now - (rp.lastSeen || 0)) > 1600) continue;
            const rpVer = rp.ver || 0;
            if (rpVer > MY_VER) return false;
            if (rpVer < MY_VER) continue;
            const rpHidden = Boolean(rp.isHidden);
            if (myHidden && !rpHidden) return false;
            if (!myHidden && rpHidden) continue;
            const rpFocused = rp.isFocused !== undefined ? Boolean(rp.isFocused) : !rpHidden;
            // An actively focused window always takes World Host priority over an unfocused background window!
            if (!myFocused && rpFocused) return false;
            if (myFocused && !rpFocused) continue;
            const rpSlot = (typeof rp.slot === "number" && rp.slot >= 0) ? rp.slot : 999;
            if (rpSlot < mySlot) return false;
            if (rpSlot === mySlot && String(rp.id) < String(this.playerId)) return false;
        }
        return true;
    }

    isClientWorldSyncActive() {
        if (this.isWorldHost()) return false;
        return (performance.now() - (this.lastWorldSyncReceivedMs || 0)) < 1200;
    }

    broadcastWorldEvent(ev) {
        if (!this.enabled || !ev) return;
        this.sendPacket(Object.assign({ t: "WORLD_EVENT" }, ev));
    }

    broadcastVehicleRemoved(vehId) {
        if (!this.enabled || !vehId) return;
        // Tombstone the vehicle in server room.modifiedVehs (using negative coords so both existing and updated servers purge it)
        this.broadcastWorldEvent({
            kind: "VEH_EXIT",
            vehId,
            x: -9999,
            y: -9999,
            z: -99,
            a: 0,
            hp: 0,
            flags: 0
        });
    }

    broadcastCorpseCleared(ped) {
        if (!this.enabled || !ped) return;
        const pType = ped._corpseSmashPType || `CORPSE:${ped.g24Type || "civ0"}:${ped.kind || "CIVILIAN"}`;
        const sx = ped._corpseSmashX !== undefined ? ped._corpseSmashX : Math.round(ped.x || 0);
        const sy = ped._corpseSmashY !== undefined ? ped._corpseSmashY : Math.round(ped.y || 0);
        this.broadcastWorldEvent({
            kind: "PROP_SMASH",
            pedId: ped.id || null,
            pType,
            x: sx,
            y: sy,
            a: -999
        });
    }

    applyWorldEvent(pkt) {
        if (!this.game || !pkt || !pkt.kind) return;
        if (pkt.kind === "VEH_ENTER" && pkt.vehId) {
            const v = this.game.vehicles.find((veh) => veh.id === pkt.vehId);
            const rSeat = typeof pkt.seat === "number" ? pkt.seat : 0;
            if (v) {
                v.doorOpenTimer = 0.48;
                const localIsDriver = this.game.player.inVehicle === v && (this.game.player.seatIndex || 0) === 0;
                if (rSeat === 0 && !localIsDriver) {
                    if (pkt.carjack && (v.driver === "AI_TRAFFIC" || v.driver === "AI_COP" || v.driver === "AI_EMERGENCY")) {
                        if (typeof this.game.ejectVehicleDriver === "function") {
                            this.game.ejectVehicleDriver(v, "CARJACK");
                        }
                    }
                    v.driver = "REMOTE";
                    v._linkedRemoteId = pkt.id;
                }
            }
        } else if (pkt.kind === "VEH_EXIT" && pkt.vehId) {
            if (typeof pkt.x === "number" && typeof pkt.y === "number" && (pkt.x < 128 || pkt.y < 128)) {
                const idx = this.game.vehicles.findIndex((veh) => veh.id === pkt.vehId);
                if (idx !== -1 && this.game.vehicles[idx] !== this.game.player.inVehicle) {
                    this.game.vehicles.splice(idx, 1);
                    if (typeof this.game.rebuildVehicleSpatialGrid === "function") {
                        this.game.rebuildVehicleSpatialGrid();
                    }
                }
                return;
            }
            const v = this.game.vehicles.find((veh) => veh.id === pkt.vehId);
            const rSeat = typeof pkt.seat === "number" ? pkt.seat : 0;
            if (v) {
                v.doorOpenTimer = 0.48;
                v._worldModified = true;
                v.isStaticParked = false;
                const localIsDriver = this.game.player.inVehicle === v && (this.game.player.seatIndex || 0) === 0;
                if (rSeat === 0 && !localIsDriver) {
                    v.driver = null;
                    v._linkedRemoteId = null;
                    if (typeof pkt.x === "number") { v.x = pkt.x; v.netTargetX = pkt.x; }
                    if (typeof pkt.y === "number") { v.y = pkt.y; v.netTargetY = pkt.y; }
                    if (typeof pkt.z === "number") { v.z = pkt.z; v.netTargetZ = pkt.z; }
                    if (typeof pkt.a === "number") { v.angle = pkt.a; v.netTargetAngle = pkt.a; }
                    v.vx = 0;
                    v.vy = 0;
                    v.speed = 0;
                }
            }
        } else if (pkt.kind === "VEH_EXPLODE" && pkt.vehId) {
            const v = this.game.vehicles.find((veh) => veh.id === pkt.vehId);
            if (v) {
                v._worldModified = true;
                v.isStaticParked = false;
                if (!v.destroyed) {
                    this.game.explodeVehicle(v, false, true);
                }
            }
        } else if (pkt.kind === "PROP_SMASH" && pkt.pType) {
            this._pendingPropSync.push(pkt);
            this.flushPendingPropSync();
        } else if (pkt.kind === "PED_KILL" && (pkt.pedId || (typeof pkt.x === "number" && typeof pkt.y === "number"))) {
            let ped = this.game.peds.find((pd) => pd.id === pkt.pedId);
            if (!ped && typeof pkt.x === "number" && typeof pkt.y === "number") {
                ped = this.game.peds.find((pd) => pd && !pd.dead && Math.hypot((pd.x || 0) - pkt.x, (pd.y || 0) - pkt.y) < 28);
            }
            if (!ped && typeof Pedestrian === "function" && typeof pkt.x === "number" && typeof pkt.y === "number") {
                ped = new Pedestrian({
                    id: pkt.pedId || `corpse_${Math.round(pkt.x)}_${Math.round(pkt.y)}`,
                    x: pkt.x,
                    y: pkt.y,
                    z: typeof pkt.z === "number" ? pkt.z : 2.0,
                    angle: pkt.a || 0,
                    kind: pkt.pedKind || "CIVILIAN",
                    g24Type: pkt.g24Type || "civ0",
                    hp: 10,
                    speed: 0
                });
                this.game.peds.push(ped);
            }
            if (ped && !ped.dead) {
                if (typeof pkt.x === "number") ped.x = pkt.x;
                if (typeof pkt.y === "number") ped.y = pkt.y;
                if (typeof pkt.a === "number") ped.angle = pkt.a;
                if (pkt.deathKind) ped.deathKind = pkt.deathKind;
                ped._corpsePersisted = true;
                this.game.killPed(ped, false, true);
            }
        } else if (pkt.kind === "PED_REVIVE") {
            let ped = pkt.pedId ? this.game.peds.find((pd) => pd && pd.id === pkt.pedId) : null;
            if (!ped && typeof pkt.x === "number" && typeof pkt.y === "number") {
                ped = this.game.peds.find((pd) => pd && pd.dead && Math.hypot((pd.x || 0) - pkt.x, (pd.y || 0) - pkt.y) < 32);
            }
            if (ped) {
                ped.revived = true;
                if (pkt.evacuated) {
                    ped._boardedVehicle = true;
                } else {
                    ped.dead = false;
                    ped.deadTimer = 0;
                    ped.hp = 35;
                    ped.speed = 36;
                    ped.panicTimer = 4.0;
                    if (typeof ped.computeState === "function") ped.state = ped.computeState();
                }
            }
        } else if (pkt.kind === "FLASH_DROP_SPAWN" && this.game && typeof pkt.x === "number" && typeof pkt.y === "number") {
            this.game.activeFlashEvent = {
                x: pkt.x,
                y: pkt.y,
                z: pkt.z || 2.0,
                reward: pkt.reward || 800,
                weapon: pkt.weapon || "ROCKET",
                timer: pkt.duration || 90,
                maxTimer: pkt.duration || 90
            };
            if (typeof this.game.sendPager === "function") {
                this.game.sendPager(
                    "VICE NET FLASH EVENT",
                    `📦 SPEC-OPS HOT DROP CRATE landed in Vice City! Race to the golden flare for +$${(pkt.reward || 800).toLocaleString()} & ${pkt.weapon || "ROCKET"}!`,
                    false
                );
            }
        } else if (pkt.kind === "FLASH_DROP_CLAIM" && this.game) {
            this.game.activeFlashEvent = null;
            this.addChatLog(
                "FLASH EVENT",
                `📦 ${pkt.claimer || "PLAYER"} claimed the Spec-Ops Hot Drop Crate (+$${Number(pkt.reward || 800).toLocaleString()})!`,
                "#fde047",
                true
            );
        } else if (pkt.kind === "BOUNTY_START" && this.game && pkt.targetId) {
            this.game.activeServerBounty = {
                targetId: pkt.targetId,
                targetName: pkt.targetName || "PLAYER",
                reward: pkt.reward || 1200,
                timer: pkt.duration || 60,
                maxTimer: pkt.duration || 60
            };
            this.addChatLog(
                "VICE NET BOUNTY",
                `🎯 $${Number(pkt.reward || 1200).toLocaleString()} BOUNTY placed on ${pkt.targetName || "PLAYER"}! (${pkt.duration || 60}s)`,
                "#ff2a85",
                true
            );
        } else if (pkt.kind === "TURF_TAKEOVER" && this.game && pkt.turfKey) {
            const zones = typeof this.game.ensureTurfZones === "function" ? this.game.ensureTurfZones() : null;
            if (zones && zones[pkt.turfKey]) {
                zones[pkt.turfKey].leaderName = pkt.leaderName || "PLAYER";
                zones[pkt.turfKey].leaderColor = pkt.leaderColor || "#00f0ff";
                zones[pkt.turfKey].leaderScore = pkt.leaderScore || 600;
                if (typeof this.game.saveTurfStandings === "function") this.game.saveTurfStandings();
            }
            if (pkt.wasTakeover) {
                this.addChatLog(
                    "TURF WAR",
                    `👑 ${pkt.leaderName || "PLAYER"} took control of ${pkt.shortLabel || pkt.turfKey} ($${Number(pkt.leaderScore || 600).toLocaleString()})!`,
                    pkt.leaderColor || "#fde047",
                    true
                );
            }
        } else if (pkt.kind === "TURF_SYNC" && this.game && pkt.standings && typeof pkt.standings === "object") {
            const zones = typeof this.game.ensureTurfZones === "function" ? this.game.ensureTurfZones() : null;
            if (zones) {
                let updatedTurf = false;
                for (const [k, s] of Object.entries(pkt.standings)) {
                    if (zones[k] && s && s.leaderName && (s.leaderScore || 0) > (zones[k].leaderScore || 0)) {
                        zones[k].leaderName = s.leaderName;
                        zones[k].leaderColor = s.leaderColor || "#00f0ff";
                        zones[k].leaderScore = s.leaderScore;
                        updatedTurf = true;
                    }
                }
                if (updatedTurf && typeof this.game.saveTurfStandings === "function") {
                    this.game.saveTurfStandings();
                }
            }
        } else if (pkt.kind === "VAULT_ROBBED" && this.game && pkt.vaultKey && typeof this.game.applyNetworkVaultCooldown === "function") {
            this.game.applyNetworkVaultCooldown(pkt.vaultKey, Number(pkt.cooldownSec) || 120);
        } else if (pkt.kind === "VAULT_SYNC" && this.game && pkt.vaults && typeof pkt.vaults === "object" && typeof this.game.applyNetworkVaultCooldown === "function") {
            for (const [vk, remSec] of Object.entries(pkt.vaults)) {
                if (vk && Number(remSec) > 0) {
                    this.game.applyNetworkVaultCooldown(vk, Number(remSec));
                }
            }
        }
    }

    handleInteractiveAiChat(rawText) {
        if (!this.game || !rawText) return;
        const lower = rawText.toLowerCase();
        const isAiTrigger =
            /^@(fixer|diaz|sonny|toussaint|mitch|cortez|radio|ai)\b/i.test(rawText) ||
            /^\/ai\b/i.test(rawText);
        if (!isAiTrigger) return;

        const g = this.game;
        const p = g.player;
        const pName = this.playerName || "LUCIA";
        const dist = g.currentDistrict || "OCEAN DRIVE";
        const isFr = /[éèêàùç]|(\b(donne|mission|contrat|salut|qui|quoi|argent|flic|quartier|boss)\b)/i.test(lower);

        setTimeout(() => {
            if (!this.game) return;
            let agentName = "📱 VICENET AI FIXER";
            let agentColor = "#00f0ff";
            let reply = "";

            if (lower.startsWith("@radio") || lower.includes("lazlow") || lower.includes("news")) {
                agentName = "🎙️ DJ LAZLOW (FLASH FM)";
                agentColor = "#f472b6";
                const turf = typeof g.getCurrentDistrictTurf === "function" ? g.getCurrentDistrictTurf() : null;
                const king = (turf && turf.leaderName) ? turf.leaderName : (isFr ? "personne pour l'instant" : "nobody yet");
                reply = isFr
                    ? `En direct sur Flash FM ! ${pName} roule dans ${dist} avec $${Math.floor(g.cash || 0).toLocaleString()} en poche ! Le boss actuel du quartier est ${king}. Faites chauffer le bitume !`
                    : `Live on Flash FM! ${pName} is cruising through ${dist} holding $${Math.floor(g.cash || 0).toLocaleString()}! Current district Kingpin: ${king}!`;
            } else if (lower.startsWith("@diaz") || lower.startsWith("@sonny") || lower.startsWith("@toussaint") || lower.startsWith("@mitch") || lower.startsWith("@cortez")) {
                const bossMap = {
                    "@diaz": { name: "🏛️ DON DIAZ (STAR CARTEL)", col: "#c084fc", fKey: "STAR" },
                    "@sonny": { name: "🌴 SONNY (OCEAN SYNDICATE)", col: "#fb7185", fKey: "BEACH" },
                    "@toussaint": { name: "🎨 TOUSSAINT (ZOE POUND)", col: "#e879f9", fKey: "HAITI" },
                    "@mitch": { name: "🏙️ BIG MITCH (BROTHERHOOD)", col: "#fb923c", fKey: "BIKER" },
                    "@cortez": { name: "🚔 CAPT. CORTEZ (VCPD)", col: "#38bdf8", fKey: "VCPD" }
                };
                const tag = Object.keys(bossMap).find((k) => lower.startsWith(k)) || "@diaz";
                agentName = bossMap[tag].name;
                agentColor = bossMap[tag].col;
                reply = isFr
                    ? `Tu oses m'appeler depuis ${dist}, ${pName} ?! Montre ce que tu vaux : fais grimper ton score dans le quartier ou affronte mes gars !`
                    : `You got nerve messaging me from ${dist}, ${pName}! Prove yourself on my turf or face my hit squad!`;
                if (typeof g.recordFactionGrudge === "function") {
                    g.recordFactionGrudge("CHALLENGE", "Syndicate Turf", tag === "@cortez", bossMap[tag].fKey);
                }
            } else {
                // @fixer or /ai -> Launch a live dynamic contract or drop a crate if requested!
                agentName = "📱 VICENET AI FIXER";
                agentColor = "#39ff14";
                if (g.missions && !g.missions.activeMission) {
                    const fixerPhone = g.missions.payphones ? g.missions.payphones[0] : null;
                    if (fixerPhone && typeof g.missions.startDynamicFixerMission === "function") {
                        g.missions.startDynamicFixerMission(fixerPhone);
                        const m = g.missions.activeMission;
                        reply = isFr
                            ? `Reçu 5/5 ${pName} ! Je viens de scanner ${dist} : contrat "${m ? m.title : "LIVE 90S"}" verrouillé sur ton GPS ($${m ? (m.reward || 1500).toLocaleString() : "1,500"} à la clé). Fonce !`
                            : `Copy that ${pName}! Scanned ${dist} — contract "${m ? m.title : "LIVE 90S"}" is now locked on your GPS ($${m ? (m.reward || 1500).toLocaleString() : "1,500"} payout). Punch it!`;
                    }
                } else {
                    reply = isFr
                        ? `${pName}, tu es dans ${dist} (Multiplicateur x${g.multiplier}). Termine ton contrat en cours ou tape [START] sur ton Smartphone pour un nouveau coup !`
                        : `${pName}, you're in ${dist} (Multiplier x${g.multiplier}). Finish your active contract or hit [START] on your Smartphone for a fresh score!`;
                }
            }

            if (reply) {
                this.addChatLog(agentName, reply, agentColor, false);
                if (typeof g.sendPager === "function") {
                    g.sendPager(agentName, reply, false);
                }
                this.sendPacket({
                    t: "CHAT",
                    name: agentName,
                    color: agentColor,
                    text: reply,
                    x: p ? Math.round(p.x) : 0,
                    y: p ? Math.round(p.y) : 0
                });
            }
        }, 550);
    }

    onWorldReady() {
        this.flushPendingPropSync();
        this.tryApplyPendingProfileSync();
        if (this._pendingServerBootstrapPkt) {
            const bootPkt = this._pendingServerBootstrapPkt;
            this._pendingServerBootstrapPkt = null;
            this.applyWorldSync(bootPkt);
        }
        if (this._pendingWorldSyncPkt) {
            const syncPkt = this._pendingWorldSyncPkt;
            this._pendingWorldSyncPkt = null;
            this.applyWorldSync(syncPkt);
        }
    }

    broadcastWorldSync() {
        if (!this.enabled || !this.game || !this.game.worldReady || !this.game.map || !this.game.map.cmpLoaded) return;
        if (this.wsConnected && !this._serverBootstrapApplied) return;
        const g = this.game;

        const drvToCode = (d) => {
            if (d === "AI_TRAFFIC") return 1;
            if (d === "AI_COP") return 2;
            if (d === "AI_EMERGENCY") return 3;
            if (d === "PLAYER" || d === "REMOTE") return 4;
            if (d === "AI_CRIMINAL") return 5;
            if (d === "AI_TOW") return 6;
            return 0;
        };

        const priorityVehs = this._syncPriorityVehs || (this._syncPriorityVehs = []);
        const regularVehs = this._syncRegularVehs || (this._syncRegularVehs = []);
        const vehs = this._syncVehOut || (this._syncVehOut = []);
        priorityVehs.length = 0;
        regularVehs.length = 0;
        vehs.length = 0;
        for (let i = 0; i < g.vehicles.length; i++) {
            const v = g.vehicles[i];
            const isMod = Boolean(
                v._worldModified ||
                v.lastPlayerDriven ||
                v.destroyed ||
                v.driver === "PLAYER" ||
                v.driver === "REMOTE"
            );
            // Skip untouched driverless static map vehicles (every client spawns them deterministically)
            // while syncing ALL active moving traffic, police, emergency units, tow trucks AND player-modified cars across the persistent universe!
            const isUntouchedStatic = Boolean(
                !isMod &&
                !v.driver &&
                !v.destroyed &&
                !v.towedByTruck &&
                (v.hp || v.maxHp || 100) >= (v.maxHp || 100)
            );
            if (isUntouchedStatic) {
                continue;
            }
            const flags =
                (v.destroyed ? 1 : 0) |
                (v.sirenActive ? 2 : 0) |
                (v.frontDented ? 4 : 0) |
                (v.rearDented ? 8 : 0) |
                (v.heavyDented ? 16 : 0) |
                ((v.doorOpenTimer || 0) > 0 ? 32 : 0) |
                ((v.aiPanicTimer || 0) > 0 ? 64 : 0) |
                (v.fireExtinguished ? 128 : 0) |
                (v.towedByTruck ? 256 : 0);
            const row = [
                v.id,
                v.specKey || "STALLION",
                Math.round(v.x),
                Math.round(v.y),
                Math.round((v.z || 2.0) * 100) / 100,
                Math.round((v.angle || 0) * 1000) / 1000,
                Math.round(v.vx || 0),
                Math.round(v.vy || 0),
                drvToCode(v.driver),
                Math.round(v.hp || 0),
                flags,
                v.remapIdx || 0,
                v.missionTag || 0,
                isMod ? 1 : 0
            ];
            if (isMod || v.isPolice || v.isEmergency || v.driver === "AI_COP" || v.driver === "AI_EMERGENCY" || v.driver === "AI_TOW" || v.driver === "AI_CRIMINAL") {
                if (priorityVehs.length < 220) priorityVehs.push(row);
            } else {
                regularVehs.push(row);
            }
        }
        for (let i = 0; i < priorityVehs.length && vehs.length < 220; i++) {
            vehs.push(priorityVehs[i]);
        }
        for (let i = 0; i < regularVehs.length && vehs.length < 220; i++) {
            vehs.push(regularVehs[i]);
        }

        const kindToCode = (k) => {
            if (k === "COP") return 1;
            if (k === "MONK") return 2;
            if (k === "HOSTILE") return 3;
            if (k === "GATOR") return 4;
            if (k === "CRIMINAL") return 5;
            if (k === "PARAMEDIC" || k === "MEDIC") return 6;
            if (k === "FIREMAN") return 7;
            return 0;
        };

        const priorityPeds = this._syncPriorityPeds || (this._syncPriorityPeds = []);
        const regularPeds = this._syncRegularPeds || (this._syncRegularPeds = []);
        const peds = this._syncPedOut || (this._syncPedOut = []);
        priorityPeds.length = 0;
        regularPeds.length = 0;
        peds.length = 0;
        for (let i = 0; i < g.peds.length; i++) {
            const pd = g.peds[i];
            if (!pd || pd._boardedVehicle) continue;
            if (pd.dead && !pd._corpsePersisted && !pd.revived) {
                pd._corpsePersisted = true;
                const pType = `CORPSE:${pd.g24Type || "civ0"}:${pd.kind || "CIVILIAN"}`;
                const sx = Math.round(pd.x);
                const sy = Math.round(pd.y);
                pd._corpseSmashPType = pType;
                pd._corpseSmashX = sx;
                pd._corpseSmashY = sy;
                this.broadcastWorldEvent({
                    kind: "PROP_SMASH",
                    pType,
                    x: sx,
                    y: sy,
                    a: Math.round((pd.angle || 0) * 100) / 100
                });
            }
            const flags =
                (pd.dead ? 1 : 0) |
                ((pd.panicTimer || 0) > 0 ? 2 : 0) |
                ((pd.stunnedTimer || 0) > 0 ? 4 : 0) |
                ((pd.burnTimer || 0) > 0 ? 8 : 0) |
                ((pd.electroTimer || 0) > 0 ? 16 : 0) |
                ((pd.drownTimer || 0) > 0 ? 32 : 0) |
                ((pd.exitAnimTimer || 0) > 0 ? 64 : 0) |
                ((pd.muzzleTimer || 0) > 0 ? 128 : 0) |
                (pd.inCombat ? 256 : 0);
            const pRow = [
                pd.id,
                kindToCode(pd.kind),
                pd.g24Type || "civ0",
                Math.round(pd.x),
                Math.round(pd.y),
                Math.round((pd.z || 2.0) * 100) / 100,
                Math.round((pd.angle || 0) * 100) / 100,
                Math.round(pd.speed || 0),
                Math.round(pd.hp || 0),
                flags,
                pd.missionTag || 0,
                pd.copWeapon || 0
            ];
            if (pd.kind !== "CIVILIAN" || pd.dead || (pd.calling911Timer || 0) > 0 || (pd.panicTimer || 0) > 0) {
                if (priorityPeds.length < 160) priorityPeds.push(pRow);
            } else {
                regularPeds.push(pRow);
            }
        }
        for (let i = 0; i < priorityPeds.length && peds.length < 160; i++) {
            peds.push(priorityPeds[i]);
        }
        for (let i = 0; i < regularPeds.length && peds.length < 160; i++) {
            peds.push(regularPeds[i]);
        }

        this.sendPacket({
            t: "WORLD_SYNC",
            ver: 101195,
            wm: Math.round((g.worldMinutes || 720) * 10) / 10,
            tl: Math.round(((g.trafficLightTimer || 0) % 24.0) * 100) / 100,
            vehs,
            peds
        });
    }

    applyWorldSync(pkt) {
        if (!pkt) return;
        const isInitialServerBootstrap = (pkt.id === "server_world");
        const isAutonomousServerTick = (pkt.id === "server_sim");
        if (!this.game || !this.game.worldReady || !this.game.map || !this.game.map.cmpLoaded) {
            if (isInitialServerBootstrap) {
                this._pendingServerBootstrapPkt = pkt;
            } else {
                this._pendingWorldSyncPkt = pkt;
            }
            return;
        }
        const syncNowMs = performance.now();
        if (!isInitialServerBootstrap && !isAutonomousServerTick) {
            this.lastWorldSyncReceivedMs = syncNowMs;
        }
        if (isInitialServerBootstrap || isAutonomousServerTick) {
            this._serverBootstrapApplied = true;
        }
        const g = this.game;

        if (typeof pkt.wm === "number") {
            g.worldMinutes = pkt.wm;
        }
        if (typeof pkt.tl === "number") {
            const curTl = ((g.trafficLightTimer || 0) % 24.0 + 24.0) % 24.0;
            const netTl = ((pkt.tl || 0) % 24.0 + 24.0) % 24.0;
            const rawDiff = Math.abs(curTl - netTl);
            const circDiff = Math.min(rawDiff, 24.0 - rawDiff);
            if (isInitialServerBootstrap || circDiff > 0.8) {
                g.trafficLightTimer = netTl;
            }
        }

        const codeToDrv = (c) => {
            if (c === 1) return "AI_TRAFFIC";
            if (c === 2) return "AI_COP";
            if (c === 3) return "AI_EMERGENCY";
            if (c === 4) return "REMOTE";
            if (c === 5) return "AI_CRIMINAL";
            if (c === 6) return "AI_TOW";
            return null;
        };

        if (Array.isArray(pkt.vehs) && typeof Vehicle === "function") {
            // On initial server bootstrap, replace default local startup traffic cars (`trf_*`) with the persistent server's traffic fleet
            // so `g.vehicles` never doubles from ~180 to 380+ vehicles!
            if (isInitialServerBootstrap) {
                for (let oi = g.vehicles.length - 1; oi >= 0; oi--) {
                    const ov = g.vehicles[oi];
                    if (
                        ov &&
                        ov !== g.player.inVehicle &&
                        !ov._worldModified &&
                        ov.driver === "AI_TRAFFIC" &&
                        !ov.isPolice &&
                        !ov.isEmergency &&
                        typeof ov.id === "string" &&
                        ov.id.startsWith("trf_")
                    ) {
                        g.vehicles.splice(oi, 1);
                    }
                }
            }
            const existingById = new Map();
            for (const v of g.vehicles) {
                existingById.set(v.id, v);
            }
            const seenIds = new Set();

            for (const row of pkt.vehs) {
                if (!Array.isArray(row) || row.length < 11) continue;
                let [id, specKey, x, y, z, a, vx, vy, drvCode, hp, flags, remapIdx, missionTag, isMod] = row;
                // Tombstoned / impounded / crushed vehicle: remove locally if present and skip!
                if (x < 128 || y < 128) {
                    const ex = existingById.get(id);
                    if (ex && ex !== g.player.inVehicle) {
                        const rIdx = g.vehicles.indexOf(ex);
                        if (rIdx !== -1) g.vehicles.splice(rIdx, 1);
                        existingById.delete(id);
                    }
                    continue;
                }
                if (g.map && typeof g.map.isWaterAtPixel === "function" && g.map.isWaterAtPixel(x, y) && specKey !== "AIRBOAT" && specKey !== "SPEEDBOAT" && specKey !== "JETSKI" && specKey !== "YACHT" && specKey !== "SWAMP_BOAT") {
                    continue;
                }
                if (x >= 460 * 64 && g.map && Array.isArray(g.map.beachProps)) {
                    for (const bp of g.map.beachProps) {
                        const dx = x - bp.x;
                        const dy = y - bp.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist < 68) {
                            const pushAng = dist > 1 ? Math.atan2(dy, dx) : 0;
                            x = bp.x + Math.cos(pushAng) * 76;
                            y = bp.y + Math.sin(pushAng) * 76;
                        }
                    }
                }
                seenIds.add(id);
                // Only skip static parked cars if they have NOT been modified/moved/damaged by any player!
                if (!isMod && typeof id === "string" && (id.startsWith("curb_park_") || id.startsWith("estate_") || id.startsWith("boat_") || id.startsWith("vport_") || id.startsWith("armored_") || id.startsWith("parked_") || missionTag === "LANDMARK") && drvCode === 0 && !(flags & 1)) {
                    continue;
                }
                let v = existingById.get(id);
                if (v && specKey && v.specKey !== specKey) {
                    const idx = g.vehicles.indexOf(v);
                    if (idx !== -1) g.vehicles.splice(idx, 1);
                    existingById.delete(id);
                    v = null;
                }
                if (!v) {
                    // Prevent stacking a newly spawned server vehicle on top of an untouched static curb-parked or local startup car
                    for (let oi = g.vehicles.length - 1; oi >= 0; oi--) {
                        const ov = g.vehicles[oi];
                        if (!ov || ov === g.player.inVehicle || seenIds.has(ov.id)) continue;
                        const isDisposableLocal = !ov._worldModified && (ov.isStaticParked || ov.isCurbParked || (isInitialServerBootstrap && ov.driver === "AI_TRAFFIC"));
                        if (isDisposableLocal && Math.hypot(ov.x - x, ov.y - y) < 58) {
                            g.vehicles.splice(oi, 1);
                        }
                    }
                    v = new Vehicle(id, specKey, x, y, a);
                    v.z = z;
                    v.netTargetX = x;
                    v.netTargetY = y;
                    v.netTargetZ = z;
                    v.netTargetAngle = a;
                    v.netErrX = 0;
                    v.netErrY = 0;
                    if (remapIdx !== undefined) v.remapIdx = remapIdx;
                    if (missionTag) v.missionTag = missionTag;
                    g.vehicles.push(v);
                } else if (isInitialServerBootstrap) {
                    v.aiBlockX = -1;
                    v.aiBlockY = -1;
                    v.aiChosenDir = null;
                    v.aiTurnedInIntersection = false;
                }

                if (isMod) {
                    v._worldModified = true;
                    v.isStaticParked = false;
                }

                // Never overwrite the vehicle currently driven by the local player, linked to a 20Hz remote player, or actively towed locally
                if (g.player.inVehicle === v || v._linkedRemoteId || v.towedByTruck) {
                    continue;
                }

                // Project moving vehicle coordinates forward by ~35ms one-way transit latency and compute smooth error offset (zero rubber-banding!)
                const predX = drvCode !== 0 ? (x + (vx || 0) * 0.035) : x;
                const predY = drvCode !== 0 ? (y + (vy || 0) * 0.035) : y;
                const errDist = Math.hypot(predX - (v.x || 0), predY - (v.y || 0));
                if (isInitialServerBootstrap || (isMod && drvCode === 0 && !(flags & 256)) || errDist > 220) {
                    v.x = predX;
                    v.y = predY;
                    v.z = z;
                    v.angle = a;
                    v.netErrX = 0;
                    v.netErrY = 0;
                } else {
                    v.netErrX = predX - v.x;
                    v.netErrY = predY - v.y;
                }
                v.netTargetX = predX;
                v.netTargetY = predY;
                v.netTargetZ = z;
                v.netTargetAngle = a;
                if (!isInitialServerBootstrap) {
                    v._lastNetSyncMs = syncNowMs;
                }
                let resolvedDriver = codeToDrv(drvCode);
                if (resolvedDriver === "REMOTE") {
                    // Only keep driver = "REMOTE" if an active remote player is actually claiming this vehicle!
                    let hasActiveRemote = false;
                    for (const rp of this.remotePlayers.values()) {
                        if (rp && rp.veh && rp.veh.id === id && (rp.veh.seat || 0) === 0) {
                            hasActiveRemote = true;
                            break;
                        }
                    }
                    if (!hasActiveRemote) {
                        resolvedDriver = null;
                    }
                }
                v.driver = resolvedDriver;
                if (resolvedDriver === null) {
                    v.vx = 0;
                    v.vy = 0;
                    v.speed = 0;
                } else {
                    v.vx = vx;
                    v.vy = vy;
                    v.speed = Math.hypot(vx, vy);
                }
                if (Number.isFinite(hp)) {
                    v.hp = (hp >= (v.maxHp || 100) && !(flags & 28)) ? hp : (Number.isFinite(v.hp) ? Math.min(v.hp, hp) : hp);
                }
                const wasDestroyed = v.destroyed;
                const nowDestroyed = Boolean(flags & 1);
                if (isInitialServerBootstrap && v.driver === null && v.isPolice && !nowDestroyed) {
                    v.abandonedTimer = Math.max(v.abandonedTimer || 0, 10.0);
                }
                if (!wasDestroyed && nowDestroyed) {
                    g.explodeVehicle(v, false, true);
                } else if (nowDestroyed) {
                    v.destroyed = true;
                }
                if (flags & 128) {
                    v.fireExtinguished = true;
                    v.burnTimer = 0;
                }
                v.sirenActive = resolvedDriver === null ? false : Boolean(flags & 2);
                v.frontDented = Boolean(flags & 4);
                v.rearDented = Boolean(flags & 8);
                v.heavyDented = Boolean(flags & 16);
                if ((flags & 32) && (v.doorOpenTimer || 0) <= 0) v.doorOpenTimer = 0.35;
                if (flags & 64) v.aiPanicTimer = Math.max(v.aiPanicTimer || 0, 1.0);
            }

            if (typeof g.rebuildVehicleSpatialGrid === "function") {
                g.rebuildVehicleSpatialGrid();
            }
        }

        const codeToKind = (c) => {
            if (c === 1) return "COP";
            if (c === 2) return "MONK";
            if (c === 3) return "HOSTILE";
            if (c === 4) return "GATOR";
            if (c === 5) return "CRIMINAL";
            if (c === 6) return "MEDIC";
            if (c === 7) return "FIREMAN";
            return "CIVILIAN";
        };

        if (Array.isArray(pkt.peds) && typeof Pedestrian === "function" && Array.isArray(g.peds)) {
            const existingPedById = new Map();
            for (const p of g.peds) {
                if (p && p.id) existingPedById.set(p.id, p);
            }
            const seenPedIds = new Set();

            for (const row of pkt.peds) {
                if (!Array.isArray(row) || row.length < 10) continue;
                const [id, kindCode, g24Type, x, y, z, a, spd, hp, flags, missionTag, copWeapon] = row;
                const isDead = Boolean(flags & 1);
                seenPedIds.add(id);
                const kindStr = codeToKind(kindCode);
                let ped = existingPedById.get(id);
                // On initial server bootstrap, never hijack a distant living starter pedestrian whose sequential ID happened to match an old persisted corpse!
                if (isInitialServerBootstrap && isDead && ped && !ped.dead && Math.hypot((ped.x || 0) - x, (ped.y || 0) - y) > 48) {
                    ped = null;
                }

                // If a corpse arrives with a remote ID, match any local ped at the exact same spot so we don't duplicate
                if (!ped && isDead) {
                    for (const lp of g.peds) {
                        if (lp && Math.hypot((lp.x || 0) - x, (lp.y || 0) - y) < 22) {
                            ped = lp;
                            seenPedIds.add(lp.id);
                            break;
                        }
                    }
                }

                if (!ped) {
                    const resolvedPedId = (isInitialServerBootstrap && isDead && existingPedById.has(id))
                        ? `corpse_${Math.round(x)}_${Math.round(y)}`
                        : id;
                    ped = new Pedestrian({
                        id: resolvedPedId,
                        x,
                        y,
                        z: z !== undefined ? z : 2.0,
                        angle: a || 0,
                        kind: kindStr,
                        g24Type: g24Type || "civ0",
                        hp: isDead ? 0 : (hp !== undefined ? hp : 35),
                        speed: isDead ? 0 : (spd || 0),
                        dead: isDead,
                        missionTag: missionTag || null,
                        copWeapon: copWeapon || null
                    });
                    g.peds.push(ped);
                    existingPedById.set(resolvedPedId, ped);
                    seenPedIds.add(resolvedPedId);
                }

                if (isDead) {
                    if (!ped.dead && Array.isArray(g.bloodDecals)) {
                        const hasBlood = g.bloodDecals.some((b) => Math.hypot((b.x || 0) - x, (b.y || 0) - y) < 18);
                        if (!hasBlood) {
                            if (g.bloodDecals.length >= 80) g.bloodDecals.shift();
                            g.bloodDecals.push({ x, y, z: z !== undefined ? z : 2.0, r: 10, alpha: 0.85 });
                        }
                    }
                    ped.dead = true;
                    ped.hp = 0;
                    ped.speed = 0;
                    ped.x = x;
                    ped.y = y;
                    ped.z = z !== undefined ? z : 2.0;
                    ped.angle = a || 0;
                    if (typeof ped.computeState === "function") ped.state = ped.computeState();
                } else if (!ped.dead) {
                    if (isInitialServerBootstrap || Math.hypot((ped.x || 0) - x, (ped.y || 0) - y) > 120) {
                        ped.x = x;
                        ped.y = y;
                    }
                    ped.netTargetX = x;
                    ped.netTargetY = y;
                    ped.netTargetZ = z !== undefined ? z : 2.0;
                    ped.netTargetAngle = a || 0;
                    ped.z = z !== undefined ? z : 2.0;
                    ped.speed = spd || 0;
                    ped.hp = hp !== undefined ? hp : ped.hp;
                    ped.kind = kindStr;
                    if (g24Type) ped.g24Type = g24Type;
                    if (copWeapon) ped.copWeapon = copWeapon;
                    ped.panicTimer = (flags & 2) ? Math.max(ped.panicTimer || 0, 1.0) : 0;
                    ped.stunnedTimer = (flags & 4) ? Math.max(ped.stunnedTimer || 0, 0.6) : 0;
                    ped.burnTimer = (flags & 8) ? Math.max(ped.burnTimer || 0, 1.0) : 0;
                    ped.electroTimer = (flags & 16) ? Math.max(ped.electroTimer || 0, 0.6) : 0;
                    ped.drownTimer = (flags & 32) ? Math.max(ped.drownTimer || 0, 0.6) : 0;
                    ped.exitAnimTimer = (flags & 64) ? Math.max(ped.exitAnimTimer || 0, 0.35) : 0;
                    ped.muzzleTimer = (flags & 128) ? Math.max(ped.muzzleTimer || 0, 0.2) : 0;
                    ped.inCombat = Boolean(flags & 256);
                    if (typeof ped.computeState === "function") ped.state = ped.computeState();
                }
            }
        }
    }

    /* ========================================================================
       4. 60 FPS INTERPOLATION, BOT RIVAL AI & 20 HZ STATE BROADCAST
       ======================================================================== */
    update(dt) {
        if (!this.game) return;
        const now = performance.now();

        if (this.game.player && (this.game.player.chatTimer || 0) > 0) {
            this.game.player.chatTimer = Math.max(0, this.game.player.chatTimer - dt);
        }

        // 1. Update simulated Online Rival Bots (if user spawned any via [O] for instant solo testing)
        this.updateSimulatedRivals(dt);

        // 2. Smooth 60 FPS dead-reckoning interpolation for all remote players
        for (const [id, rp] of this.remotePlayers.entries()) {
            if ((rp.chatTimer || 0) > 0) {
                rp.chatTimer = Math.max(0, rp.chatTimer - dt);
            }
            if (rp.isBot) continue;
            if (now - rp.lastSeen > 8500) {
                this.remotePlayers.delete(id);
                continue;
            }
            if ((rp.muzzleTimer || 0) > 0) {
                rp.muzzleTimer = Math.max(0, rp.muzzleTimer - dt);
            }

            // Predict with velocity + blend toward target position
            rp.targetX += (rp.vx || 0) * dt * 0.45;
            rp.targetY += (rp.vy || 0) * dt * 0.45;

            const dx = rp.targetX - rp.x;
            const dy = rp.targetY - rp.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 380) {
                rp.x = rp.targetX;
                rp.y = rp.targetY;
                rp.z = rp.targetZ;
            } else {
                const lerp = Math.min(1.0, dt * 14.0);
                rp.x += dx * lerp;
                rp.y += dy * lerp;
                rp.z += (rp.targetZ - rp.z) * lerp;
            }

            const angDiff = Math.atan2(Math.sin(rp.targetAngle - rp.angle), Math.cos(rp.targetAngle - rp.angle));
            rp.angle += angDiff * Math.min(1.0, dt * 15.0);

            if (rp.isMoving && !rp.veh) {
                rp.walkPhase = (rp.walkPhase || 0) + dt * (rp.isRunning ? 1.5 : 1.0);
            }

            // Link remote player's driven or passenger vehicle directly to the unified world vehicle in game.vehicles!
            if (rp.veh && rp.veh.id && this.game && Array.isArray(this.game.vehicles)) {
                let wv = this.game.vehicles.find((v) => v.id === rp.veh.id);
                if (!wv && typeof Vehicle === "function") {
                    wv = new Vehicle(rp.veh.id, rp.veh.specKey || "STALLION", rp.x, rp.y, rp.angle);
                    this.game.vehicles.push(wv);
                    if (typeof this.game.rebuildVehicleSpatialGrid === "function") {
                        this.game.rebuildVehicleSpatialGrid();
                    }
                }
                const rSeat = typeof rp.veh.seat === "number" ? rp.veh.seat : 0;
                const localIsDriver = Boolean(wv && this.game.player.inVehicle === wv && (this.game.player.seatIndex || 0) === 0);

                if (wv && rSeat === 0 && !localIsDriver) {
                    wv._linkedRemoteId = rp.id;
                    wv.driver = "REMOTE";
                    wv.remotePedType = rp.pedType || "gang";
                    wv.x = rp.x;
                    wv.y = rp.y;
                    wv.z = rp.z;
                    wv.angle = rp.angle;
                    wv.vx = rp.vx || 0;
                    wv.vy = rp.vy || 0;
                    wv.speed = rp.veh.speed || Math.hypot(rp.vx || 0, rp.vy || 0);
                    wv.sirenActive = Boolean(rp.veh.siren);
                    wv.frontDented = Boolean(rp.veh.fDent);
                    wv.rearDented = Boolean(rp.veh.rDent);
                    wv.heavyDented = Boolean(rp.veh.hDent);
                    // Only let seat 0 update tank turret if no co-op gunner (seat 1) is overriding it
                    if (wv.hasTurret && typeof rp.veh.tAng === "number") {
                        const localIsGunner = this.game.player.inVehicle === wv && (this.game.player.seatIndex || 0) === 1;
                        if (!localIsGunner) {
                            wv.turretAngle = rp.veh.tAng;
                        }
                    }
                    rp._linkedWorldVeh = true;
                } else if (wv && rSeat > 0) {
                    // Remote player is a Passenger / Gunner inside wv: lock their world coords to their seat on wv!
                    const sPos = typeof wv.getSeatWorldPos === "function" ? wv.getSeatWorldPos(rSeat) : { x: wv.x, y: wv.y };
                    rp.x = sPos.x;
                    rp.y = sPos.y;
                    rp.z = wv.z !== undefined ? wv.z : rp.z;
                    rp.angle = wv.angle;
                    if (wv.hasTurret && rSeat === 1 && typeof rp.veh.tAng === "number") {
                        wv.turretAngle = rp.veh.tAng;
                    }
                    rp._linkedWorldVeh = true;
                } else {
                    rp._linkedWorldVeh = false;
                }
            } else {
                rp._linkedWorldVeh = false;
            }
        }

        // Release any world vehicle whose remote driver exited or disconnected
        if (this.game && Array.isArray(this.game.vehicles)) {
            for (const v of this.game.vehicles) {
                if (v._linkedRemoteId || v.driver === "REMOTE") {
                    let owner = v._linkedRemoteId ? this.remotePlayers.get(v._linkedRemoteId) : null;
                    if (!owner) {
                        for (const rp of this.remotePlayers.values()) {
                            if (rp && rp.veh && rp.veh.id === v.id && (rp.veh.seat || 0) === 0) {
                                owner = rp;
                                v._linkedRemoteId = rp.id;
                                break;
                            }
                        }
                    }
                    if (!owner || !owner.veh || owner.veh.id !== v.id || (owner.veh.seat || 0) !== 0) {
                        v._linkedRemoteId = null;
                        if (v.driver === "REMOTE") {
                            v.driver = null;
                            v.vx = 0;
                            v.vy = 0;
                            v.speed = 0;
                        }
                    }
                }
            }
        }

        // 3. Check bumper-to-bumper collisions between remote player vehicles and local player/vehicles
        this.checkRemoteVehicleInteractions(dt);

        // Apply deferred initial world snapshot, smashed props, and player profile once local map finishes loading
        if (this._pendingServerWorldSnapshot && this.game.map && this.game.map.cmpLoaded && this.game.vehicles && this.game.vehicles.length > 0) {
            const snap = this._pendingServerWorldSnapshot;
            this._pendingServerWorldSnapshot = null;
            this.applyWorldSync(snap);
        }
        this.flushPendingPropSync();
        this.tryApplyPendingProfileSync();

        // 4. Adaptive Network Tick Rate:
        //    - Multiplayer active (visible tab): 20 Hz STATE (0.05s) + 10 Hz WORLD_SYNC (0.10s)
        //    - Solo on Persistent Server (visible tab): 0.67 Hz STATE (1.5s) + 0.33 Hz WORLD_SYNC (3.0s) -> cuts solo bandwidth by ~90%!
        //    - Minimized / Background tab (document.hidden): throttled to 2 Hz (multiplayer) or 0.25 Hz (solo)
        if (this.game.started) {
            const hasRemoteHumans = this.getHumanRemotePlayers().length > 0;
            const isTabHidden = Boolean(typeof document !== "undefined" && document.hidden);
            const targetStateInterval = hasRemoteHumans
                ? (isTabHidden ? 0.50 : this.syncInterval)
                : (isTabHidden ? 4.0 : 1.5);
            this.syncAccumulator += dt;
            if (this.syncAccumulator >= targetStateInterval) {
                this.syncAccumulator = 0;
                this.broadcastStateNow();
            }
            // Never broadcast WORLD_SYNC from a hidden/background tab (whose requestAnimationFrame is throttled to 1 Hz by the browser!)
            if (!isTabHidden && this.isWorldHost() && (hasRemoteHumans || (this.wsConnected && this._serverBootstrapApplied))) {
                this.worldSyncAccumulator = (this.worldSyncAccumulator || 0) + dt;
                const targetWorldInterval = hasRemoteHumans ? this.worldSyncInterval : 3.0;
                if (this.worldSyncAccumulator >= targetWorldInterval) {
                    this.worldSyncAccumulator = 0;
                    this.broadcastWorldSync();
                }
            }
        }
        this.dirAccumulator = (this.dirAccumulator || 0) + dt;
        if (this.dirAccumulator >= 0.85) {
            this.dirAccumulator = 0;
            this.broadcastDirectoryHeartbeat();
            this.updateServerListUI();
        }
        if (this.wsConnected && this.ws && this.ws.readyState === 1) {
            this._wsPingAccum = (this._wsPingAccum || 0) + dt;
            if (this._wsPingAccum >= 22.0) {
                this._wsPingAccum = 0;
                try {
                    this.ws.send(JSON.stringify({ t: "PING", ts: Date.now() }));
                } catch (_e) {}
            }
        }
    }

    broadcastStateNow() {
        const p = this.game.player;
        if (!p) return;
        const v = p.inVehicle;

        let vehData = null;
        if (v) {
            vehData = {
                id: v.id || "player_car",
                seat: p.seatIndex || 0,
                specKey: v.specKey || "STALLION",
                sprId: v.sprId || "66",
                remapIdx: v.remapIdx || 0,
                w: v.w || 48,
                h: v.h || 24,
                speed: Math.round(v.speed || 0),
                hp: Math.round(v.hp || 100),
                siren: Boolean(v.sirenActive),
                isEmerg: Boolean(v.isEmergency),
                isMoto: Boolean(v.isMotorcycle),
                fDent: Boolean(v.frontDented),
                rDent: Boolean(v.rearDented),
                hDent: Boolean(v.heavyDented),
                tAng: v.hasTurret ? Math.round((v.turretAngle || 0) * 1000) / 1000 : undefined
            };
        }

        const storyMask = (this.game && this.game.missions && typeof this.game.missions.getStoryBitmask === "function")
            ? this.game.missions.getStoryBitmask()
            : 0;

        this.sendPacket({
            t: "STATE",
            ver: 101181,
            econVer: 2,
            started: Boolean(this.game && this.game.started && (this._profileSynced || !this.wsConnected)),
            hid: Boolean(typeof document !== "undefined" && document.hidden),
            foc: Boolean(typeof document !== "undefined" && !document.hidden && (typeof document.hasFocus !== "function" || document.hasFocus())),
            name: this.playerName,
            color: this.playerColor,
            pedType: this.pedSpriteType,
            slot: this.slotIndex,
            wl: this.game.wantedLevel || 0,
            x: Math.round((v ? v.x : p.x) * 10) / 10,
            y: Math.round((v ? v.y : p.y) * 10) / 10,
            z: Math.round(((v ? v.z : p.z) || 2.0) * 100) / 100,
            a: Math.round(((v ? v.angle : p.angle) || 0) * 1000) / 1000,
            vx: Math.round(v ? (v.vx || 0) : ((p.isMoving ? Math.cos(p.angle) * 130 : 0))),
            vy: Math.round(v ? (v.vy || 0) : ((p.isMoving ? Math.sin(p.angle) * 130 : 0))),
            hp: Math.round(p.hp || 0),
            ar: Math.round(p.armor || 0),
            dead: Boolean(p.dead),
            wep: p.weapon || "FIST",
            weps: Array.isArray(p.weaponsOwned) ? p.weaponsOwned : ["FIST", "PISTOL"],
            ammo: p.ammo ? {
                PISTOL: p.ammo.PISTOL || 0,
                UZI: p.ammo.UZI || 0,
                SHOTGUN: p.ammo.SHOTGUN || 0,
                FLAMETHROWER: p.ammo.FLAMETHROWER || 0,
                ROCKET: p.ammo.ROCKET || 0,
                ELECTRO: p.ammo.ELECTRO || 0
            } : null,
            mov: Boolean(p.isMoving),
            run: Boolean(this.game.input && this.game.input.sprint),
            wp: Math.round((p.walkPhase || 0) * 100) / 100,
            mz: (p.muzzleTimer || 0) > 0 ? 0.08 : 0,
            k: this.kills,
            sc: Math.round(this.game.cash || 0),
            mlt: Math.round(this.game.multiplier || 1),
            lvs: Math.round(this.game.lives !== undefined ? this.game.lives : 3),
            jfc: Math.round(this.game.jailFreeCards !== undefined ? this.game.jailFreeCards : 1),
            bnd: Boolean(p.bandana),
            msn: storyMask,
            ank: Boolean(p.ankleScrambled),
            charId: p.charId || "LUCIA",
            veh: vehData
        });
    }

    broadcastHighScore(name, charId, score, color) {
        if (!this.enabled) return;
        this.sendPacket({
            t: "HISCORE",
            econVer: 2,
            name,
            charId: charId || "LUCIA",
            sc: Math.round(score || 0),
            color: color || "#ff2a85"
        });
    }

    broadcastShoot(weaponKey, pellets) {
        if (!this.enabled || !Array.isArray(pellets) || pellets.length === 0) return;
        const p = this.game.player;
        this.sendPacket({
            t: "SHOOT",
            name: this.playerName,
            wep: weaponKey,
            x: Math.round(p.x),
            y: Math.round(p.y),
            pellets: pellets.map((pr) => ({
                x: Math.round(pr.x),
                y: Math.round(pr.y),
                vx: Math.round(pr.vx),
                vy: Math.round(pr.vy),
                dmg: pr.damage,
                rng: Math.round(pr.rangeLeft),
                flm: pr.isFlame ? 1 : 0,
                rck: pr.isRocket ? 1 : 0,
                tsh: pr.isTankShell ? 1 : 0,
                elc: pr.isElectro ? 1 : 0
            }))
        });
    }

    broadcastExplosion(x, y, radius, damage) {
        if (!this.enabled) return;
        this.sendPacket({
            t: "EXPLODE",
            x: Math.round(x),
            y: Math.round(y),
            rad: Math.round(radius),
            dmg: Math.round(damage)
        });
    }

    broadcastHorn(x, y, isSiren, text, color) {
        if (!this.enabled) return;
        this.sendPacket({
            t: "HORN",
            x: Math.round(x),
            y: Math.round(y),
            siren: Boolean(isSiren),
            text,
            color
        });
    }

    broadcastKilledBy(killerId, killerName) {
        this.deaths++;
        this.sendPacket({
            t: "KILLED",
            killerId,
            killerName: killerName || "ONLINE RIVAL",
            victimId: this.playerId,
            victimName: this.playerName,
            x: Math.round(this.game.player.x),
            y: Math.round(this.game.player.y)
        });
    }

    /* ========================================================================
       5. REMOTE VEHICLE & PVP COLLISION INTERACTIONS
       ======================================================================== */
    checkRemoteVehicleInteractions(dt) {
        const p = this.game.player;
        if (!p || p.dead) return;

        for (const rp of this.remotePlayers.values()) {
            if (rp.dead || !rp.veh || (rp.veh.seat || 0) > 0) continue;
            if (p.inVehicle && p.inVehicle.id === rp.veh.id) continue;
            const rSpeed = Math.hypot(rp.vx || 0, rp.vy || 0);
            if (rSpeed < 45) continue;

            if (!p.inVehicle && (p.hitByCarCooldown || 0) <= 0 && (p.jumpTimer || 0) <= 0) {
                if (Math.hypot(p.x - rp.x, p.y - rp.y) < 24) {
                    p.hitByCarCooldown = 0.85;
                    p.x += ((rp.vx || 0) / Math.max(1, rSpeed)) * 20;
                    p.y += ((rp.vy || 0) / Math.max(1, rSpeed)) * 20;
                    const isRemoteScooterOrBike = rp.veh && (rp.veh.specKey === "E_SCOOTER" || rp.veh.specKey === "BMX_BIKE");
                    if (isRemoteScooterOrBike) {
                        p.slideCarTimer = 0.42;
                        if (p.hp > 1) {
                            this.game.damagePlayer(Math.min(p.hp - 1, 6));
                        }
                        this.game.addFloatingText(p.x, p.y - 22, "💫 KNOCKOUT!", "#38bdf8");
                    } else {
                        this.game.lastAttackerId = rp.id;
                        this.game.lastAttackerName = rp.name;
                        this.game.damagePlayer(Math.min(34, rSpeed * 0.10));
                    }
                    this.game.spawnParticle(p.x, p.y, "SPARK");
                }
            } else if (p.inVehicle) {
                const lv = p.inVehicle;
                const d = Math.hypot(lv.x - rp.x, lv.y - rp.y);
                if (d < 36 && d > 1) {
                    const nx = (lv.x - rp.x) / d;
                    const ny = (lv.y - rp.y) / d;
                    const push = (36 - d) * 0.5;
                    lv.x += nx * push;
                    lv.y += ny * push;
                    lv.vx += nx * Math.min(90, rSpeed * 0.35) * dt * 15;
                    lv.vy += ny * Math.min(90, rSpeed * 0.35) * dt * 15;
                }
            }
        }
    }

    /* ========================================================================
       6. INSTANT ONLINE RIVAL BOT SIMULATION (For solo players testing MP!)
       ======================================================================== */
    spawnSimulatedRival() {
        const p = this.game.player;
        const botCount = Array.from(this.remotePlayers.values()).filter((r) => r.isBot).length;
        const callSigns = ["TOMMY_V #86", "RICO_GT #305", "VALERIA #97", "DANTE_VC #404"];
        const specs = ["BANSHEE_SS", "STINGER_CABRIO", "CHEETAH_GT", "SUPERBIKE"];
        const idx = botCount % callSigns.length;
        const botId = `bot_rival_${Date.now()}_${idx}`;

        // Spawn on nearest road or 2 blocks along Ocean Drive
        const spawnX = (typeof mx256 === "function" ? mx256(215.5) : 445.5) * 64;
        const spawnY = Math.max(40 * 64, Math.min(480 * 64, p.y - 160 + (idx % 2 === 0 ? -120 : 180)));

        const rp = {
            id: botId,
            name: callSigns[idx],
            color: NET_COLORS[(idx + 1) % NET_COLORS.length],
            pedType: NET_PED_TYPES[idx % NET_PED_TYPES.length],
            x: spawnX,
            y: spawnY,
            z: 2.0,
            angle: Math.PI * 0.5,
            targetX: spawnX,
            targetY: spawnY,
            targetZ: 2.0,
            targetAngle: Math.PI * 0.5,
            vx: 0,
            vy: 145,
            hp: 100,
            armor: 50,
            dead: false,
            weapon: "UZI",
            isMoving: true,
            isRunning: true,
            walkPhase: 0,
            muzzleTimer: 0,
            kills: idx + 1,
            veh: {
                specKey: specs[idx],
                sprId: idx === 3 ? "71" : "66",
                remapIdx: idx % 4,
                w: idx === 3 ? 34 : 48,
                h: idx === 3 ? 16 : 24,
                speed: 145,
                siren: false,
                isEmerg: false,
                isMoto: idx === 3,
                fDent: false,
                rDent: false,
                hDent: false
            },
            initialized: true,
            lastSeen: performance.now(),
            isBot: true,
            shootTimer: 1.5
        };
        this.remotePlayers.set(botId, rp);
        this.game.addFloatingText(p.x, p.y - 34, `🌐 ONLINE RIVAL JOINED: ${rp.name}!`, rp.color);
        this.addChatLog("VICE NET", `🌐 ${rp.name} joined room [${this.roomCode}]! Say hi with [T]!`, rp.color, true);
        return rp;
    }

    updateSimulatedRivals(dt) {
        const p = this.game.player;
        if (!p) return;

        for (const [id, rp] of this.remotePlayers.entries()) {
            if (!rp.isBot) continue;
            if (rp.dead) {
                rp.respawnTimer = (rp.respawnTimer || 4.0) - dt;
                if (rp.respawnTimer <= 0) {
                    rp.dead = false;
                    rp.hp = 100;
                    rp.x = (typeof mx256 === "function" ? mx256(215.5) : 445.5) * 64;
                    rp.y = Math.max(45 * 64, Math.min(480 * 64, p.y - 240));
                }
                continue;
            }

            if ((rp.muzzleTimer || 0) > 0) rp.muzzleTimer = Math.max(0, rp.muzzleTimer - dt);

            const dx = p.x - rp.x;
            const dy = p.y - rp.y;
            const dist = Math.hypot(dx, dy);
            const desiredAngle = Math.atan2(dy, dx);

            if (rp.veh) {
                // Cruise along road or circle toward player
                const turnDiff = Math.atan2(Math.sin(desiredAngle - rp.angle), Math.cos(desiredAngle - rp.angle));
                rp.angle += turnDiff * Math.min(1, dt * 2.4);
                const spd = dist > 180 ? 155 : 95;
                rp.vx = Math.cos(rp.angle) * spd;
                rp.vy = Math.sin(rp.angle) * spd;
                rp.x += rp.vx * dt;
                rp.y += rp.vy * dt;
                rp.veh.speed = spd;
            } else {
                rp.angle = desiredAngle;
                if (dist > 95) {
                    rp.x += Math.cos(rp.angle) * 135 * dt;
                    rp.y += Math.sin(rp.angle) * 135 * dt;
                    rp.isMoving = true;
                    rp.walkPhase += dt * 1.4;
                } else {
                    rp.isMoving = false;
                }
            }

            const bCol = this.game.map.resolveCircleBuildingCollision(rp.x, rp.y, 14, rp.z || 2.0);
            if (bCol.hit) {
                rp.x = bCol.x;
                rp.y = bCol.y;
                rp.angle += Math.PI * 0.6;
            }
            rp.z = this.game.map.getHeightAtPixel(rp.x, rp.y, rp.z || 2.0);

            // Drive-by or on-foot burst when near player and player is in combat
            rp.shootTimer = (rp.shootTimer || 1.2) - dt;
            if (dist < 260 && rp.shootTimer <= 0 && (p.playerCombatTimer || 0) > 0) {
                rp.shootTimer = 1.1 + Math.random() * 0.8;
                rp.muzzleTimer = 0.09;
                const aim = desiredAngle + (Math.random() - 0.5) * 0.18;
                this.game.projectiles.push({
                    x: rp.x + Math.cos(aim) * 18,
                    y: rp.y + Math.sin(aim) * 18,
                    vx: Math.cos(aim) * 520,
                    vy: Math.sin(aim) * 520,
                    damage: 10,
                    rangeLeft: 320,
                    isFlame: false,
                    isRocket: false,
                    fromPlayer: false,
                    fromRemoteId: id,
                    fromRemoteName: rp.name,
                    r: 4
                });
                if (this.game.audio) this.game.audio.playShot("UZI");
            }
        }
    }

    damageRemotePlayer(rp, amount, byLocalPlayer = true) {
        if (!rp || rp.dead) return;
        if (rp.isBot) {
            rp.hp -= amount;
            this.game.spawnParticle(rp.x, rp.y, "SPARK");
            if (rp.hp <= 0) {
                rp.hp = 0;
                rp.dead = true;
                rp.respawnTimer = 5.0;
                this.kills++;
                if (byLocalPlayer) {
                    if (typeof this.game.addMultiplier === "function") {
                        this.game.addMultiplier(1);
                    }
                    this.game.addCash(300, `ONLINE RIVAL WASTED: ${rp.name}!`);
                    this.game.showBigBanner(
                        "ONLINE FRAG!",
                        `YOU WASTED ${rp.name}! (+$300 • KILLS: ${this.kills})`,
                        "#00f0ff",
                        2.6
                    );
                }
                if (rp.veh) {
                    this.game.explodeAt(rp.x, rp.y, 110, 150, byLocalPlayer, true);
                }
            }
        }
    }

    getPlayerCount() {
        return 1 + this.remotePlayers.size;
    }

    /* ========================================================================
       7. INTERACTIVE [O] ONLINE ACTION (Teleport to Real Connected Player / Open Server List)
       ======================================================================== */
    triggerOnlineAction() {
        const p = this.game.player;
        const remotes = Array.from(this.remotePlayers.values()).filter((r) => !r.isBot);

        if (remotes.length === 0) {
            // No other real players in this room yet -> Open the Server & Character Selector modal!
            this.updateServerListUI();
            const modal = document.getElementById("start-modal");
            if (modal) {
                modal.classList.remove("hidden");
            }
            if (this.game && typeof this.game.renderAllTimeHighScoresUI === "function") {
                this.game.renderAllTimeHighScoresUI();
            }
            this.addChatLog(
                "VICE NET",
                `🌐 1/${this.maxSlots} joueur sur [${this.roomCode}]. Partagez l'URL avec un ami ou changez de serveur !`,
                "#00f0ff",
                true
            );
            return;
        }

        // Cycle teleport to the next real connected player in the room
        this._tpIdx = ((this._tpIdx || 0) + 1) % remotes.length;
        const target = remotes[this._tpIdx];
        if (this.game && this.game.activeInterior) {
            this.game.activeInterior = null;
        }
        if (this.game && this.game.audio && typeof this.game.audio.resetLoops === "function") {
            this.game.audio.resetLoops();
        }
        const targetObj = p.inVehicle || p;
        if (p.inVehicle) {
            p.inVehicle._worldModified = true;
            p.inVehicle.isStaticParked = false;
        }
        targetObj.x = target.x - 64;
        targetObj.y = target.y;
        targetObj.z = target.z || 2.0;
        targetObj.vx = 0;
        targetObj.vy = 0;
        if (targetObj.speed !== undefined) targetObj.speed = 0;
        if (this.game) {
            this.game.cameraX = targetObj.x;
            this.game.cameraY = targetObj.y;
            if (typeof this.game.rebuildVehicleSpatialGrid === "function") {
                this.game.rebuildVehicleSpatialGrid();
            }
        }
        this.broadcastStateNow();
        this.game.addFloatingText(targetObj.x, targetObj.y - 30, `🌐 TELEPORTED TO ${target.name}!`, target.color || "#00f0ff");
        this.addChatLog("VICE NET", `🌐 Teleported to ${target.name}`, target.color || "#00f0ff", true);
    }
}

window.ViceNetworkManager = ViceNetworkManager;
