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

const NET_PED_TYPES = ["gang", "civ0", "civ1", "civ2", "civ3", "jason"];

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

        // Room code (from URL ?room=XXX or default public lobby "VICE97")
        const urlParams = new URLSearchParams(window.location.search || "");
        const rawRoom = (urlParams.get("room") || "VICE97").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
        this.roomCode = rawRoom || "VICE97";

        // Map of remote players: id -> state object
        this.remotePlayers = new Map();
        this.kills = 0;
        this.deaths = 0;

        // Timing
        this.syncAccumulator = 0;
        this.syncInterval = 0.05; // 20 Hz state broadcast
        this.cleanupAccumulator = 0;

        // Transports
        this.bc = null;
        this.peer = null;
        this.peerConns = new Map(); // peerId -> DataConnection
        this.slotIndex = -1;
        this.maxSlots = 12;
        this.webrtcReady = false;
        this.statusText = "CONNECTING...";
        this.isChatTyping = false;
        this.chatHistory = [];

        this.initChatUI();
        this.initBroadcastChannel();
        this.initWebRTCMesh();
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
        this.chatToggleBtn = document.getElementById("mp-chat-toggle-btn");

        if (this.chatRoomBadge) {
            this.chatRoomBadge.textContent = `[${this.roomCode}]`;
        }
        if (this.chatNameBtn) {
            this.chatNameBtn.textContent = `✏️ ${this.playerName.slice(0, 12)}`;
            this.chatNameBtn.addEventListener("click", () => {
                this.focusChatInput("/name ");
            });
        }
        if (this.chatToggleBtn && this.chatWidget) {
            this.chatToggleBtn.addEventListener("click", () => {
                const collapsed = this.chatWidget.classList.toggle("chat-collapsed");
                this.chatToggleBtn.textContent = collapsed ? "+" : "–";
            });
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

        document.querySelectorAll(".mp-quick-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const msg = btn.getAttribute("data-msg");
                if (msg) {
                    this.sendChatMessage(msg);
                }
            });
        });

        this.addChatLog(
            "VICE NET",
            `Connected to room [${this.roomCode}] as ${this.playerName}. Press [T] to chat or [O] for Online Action!`,
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

    addChatLog(author, text, color = "#00f0ff", isSystem = false) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const timeStr = `${hh}:${mm}`;

        this.chatHistory.push({ timeStr, author, text, color, isSystem });
        if (this.chatHistory.length > 40) {
            this.chatHistory.shift();
        }

        if (!this.chatMessagesEl) return;
        const row = document.createElement("div");
        row.className = isSystem ? "mp-chat-line mp-sys" : "mp-chat-line";

        const timeSpan = document.createElement("span");
        timeSpan.className = "mp-time";
        timeSpan.textContent = timeStr;
        row.appendChild(timeSpan);

        const authSpan = document.createElement("span");
        authSpan.className = "mp-author";
        authSpan.style.color = color || "#00f0ff";
        authSpan.textContent = isSystem ? `[${author}]` : `${author}:`;
        row.appendChild(authSpan);

        const msgSpan = document.createElement("span");
        msgSpan.textContent = text;
        row.appendChild(msgSpan);

        this.chatMessagesEl.appendChild(row);
        while (this.chatMessagesEl.children.length > 40) {
            this.chatMessagesEl.removeChild(this.chatMessagesEl.firstChild);
        }
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
    }

    sendChatMessage(rawText) {
        const cleaned = String(rawText || "").trim().slice(0, 140);
        if (!cleaned) return;

        // Slash command: /name NewPseudo or /nick NewPseudo
        if (/^\/(name|nick|pseudo)\s+/i.test(cleaned)) {
            const newName = cleaned.replace(/^\/(name|nick|pseudo)\s+/i, "").trim().slice(0, 18).toUpperCase();
            if (newName) {
                const oldName = this.playerName;
                this.playerName = newName;
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
            }
            return;
        }

        // Slash command: /clear
        if (/^\/clear$/i.test(cleaned)) {
            if (this.chatMessagesEl) this.chatMessagesEl.innerHTML = "";
            this.addChatLog("VICE NET", "Chat history cleared.", "#00f0ff", true);
            return;
        }

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

        // If any Online Rival Bots are present in the lobby, let one reply naturally after ~1s!
        const bots = Array.from(this.remotePlayers.values()).filter((r) => r.isBot && !r.dead);
        if (bots.length > 0) {
            const bot = bots[Math.floor(Math.random() * bots.length)];
            setTimeout(() => {
                if (!this.remotePlayers.has(bot.id)) return;
                const lower = cleaned.toLowerCase();
                let reply = "On se retrouve sur Ocean Drive devant le Hotel Dixon ! 🌴🔥";
                if (lower.includes("race") || lower.includes("course")) {
                    reply = "Vas-y ! Départ Ocean Drive jusqu'au Pier, le dernier paie sa tournée au Club Nine1Nine ! 🏎️💨";
                } else if (lower.includes("yo") || lower.includes("salut") || lower.includes("hello") || lower.includes("slt") || lower.includes("cc")) {
                    reply = `Yo ${this.playerName} ! Bienvenue dans Vice City '97 ! 👋🌴`;
                } else if (lower.includes("gg") || lower.includes("bien joué")) {
                    reply = "GG ! Ce moteur 1997 tourne comme une horloge ! 🔥";
                } else if (lower.includes("gps") || lower.includes("rejoins") || lower.includes("me")) {
                    reply = "J'arrive plein gaz sur ta position GPS ! 📍🚓";
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
        if (typeof window.Peer === "function") {
            this.claimRoomSlot(0);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
        script.async = true;
        script.onload = () => {
            if (typeof window.Peer === "function") {
                this.claimRoomSlot(0);
            }
        };
        script.onerror = () => {
            this.statusText = `LOCAL ONLINE (${this.roomCode})`;
        };
        document.head.appendChild(script);
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
            if (this.peer) {
                try { this.peer.destroy(); } catch (_e) {}
            }
            const peer = peerId ? new window.Peer(peerId) : new window.Peer();
            this.peer = peer;

            peer.on("open", (id) => {
                this.slotIndex = slotIdx;
                this.webrtcReady = true;
                this.statusText = `ONLINE (${this.roomCode})`;
                // Connect to all other slots in the room to form a full P2P mesh
                for (let s = 0; s < this.maxSlots; s++) {
                    if (s === slotIdx) continue;
                    const targetPeerId = this.getSlotPeerId(s);
                    if (targetPeerId === id) continue;
                    const conn = peer.connect(targetPeerId, { reliable: false });
                    this.setupDataConnection(conn);
                }
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
        pkt.ts = performance.now();

        if (this.bc) {
            try {
                this.bc.postMessage(pkt);
            } catch (_e) {}
        }

        if (this.peerConns.size > 0) {
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

        if (pkt.t === "JOIN") {
            const isNew = !this.remotePlayers.has(pkt.id);
            this.ensureRemotePlayer(pkt);
            if (isNew && this.game) {
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
                        `🌐 ${pkt.name || "PLAYER"} joined room [${this.roomCode}]! (${this.getPlayerCount()} players online). Press [T] to chat or [O] to teleport.`,
                        false
                    );
                }
            }
            // Reply with our current state immediately so the newcomer sees us right away
            this.broadcastStateNow();
            return;
        }

        if (pkt.t === "CHAT") {
            const rp = this.ensureRemotePlayer(pkt);
            const msg = String(pkt.text || "").slice(0, 140);
            if (!msg) return;
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
            const rp = this.ensureRemotePlayer(pkt);
            rp.name = pkt.name || rp.name;
            rp.color = pkt.color || rp.color;
            rp.pedType = pkt.pedType || rp.pedType;
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
            rp.veh = pkt.veh || null;
            rp.lastSeen = performance.now();

            if (!rp.initialized) {
                rp.x = rp.targetX;
                rp.y = rp.targetY;
                rp.z = rp.targetZ;
                rp.angle = rp.targetAngle;
                rp.initialized = true;
            }
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
                for (const pl of pkt.pellets) {
                    this.game.projectiles.push({
                        x: pl.x,
                        y: pl.y,
                        vx: pl.vx,
                        vy: pl.vy,
                        damage: pl.dmg || 20,
                        rangeLeft: pl.rng || 320,
                        isFlame: Boolean(pl.flm),
                        isRocket: Boolean(pl.rck),
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
            this.game.explodeAt(pkt.x, pkt.y, pkt.rad || 120, pkt.dmg || 180, false, true);
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
            if (pkt.killerId === this.playerId) {
                this.kills++;
                this.game.multiplier += 1;
                this.game.addCash(5000, `PVP FRAG: ${pkt.victimName}!`);
                this.game.showBigBanner(
                    "ONLINE FRAG!",
                    `YOU WASTED ${pkt.victimName}! (+$5,000 & MULTIPLIER +1 • KILLS: ${this.kills})`,
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
            rp = {
                id: pkt.id,
                name: pkt.name || "LUCIA ONLINE",
                color: pkt.color || "#00f0ff",
                pedType: pkt.pedType || "gang",
                x: pkt.x || 213.5 * 64,
                y: pkt.y || 146.0 * 64,
                z: pkt.z || 2.0,
                angle: pkt.a || 0,
                targetX: pkt.x || 213.5 * 64,
                targetY: pkt.y || 146.0 * 64,
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
                veh: null,
                initialized: pkt.x !== undefined,
                lastSeen: performance.now(),
                isBot: false
            };
            this.remotePlayers.set(pkt.id, rp);
        }
        return rp;
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
        }

        // 3. Check bumper-to-bumper collisions between remote player vehicles and local player/vehicles
        this.checkRemoteVehicleInteractions(dt);

        // 4. Broadcast local player state at 20 Hz
        this.syncAccumulator += dt;
        if (this.syncAccumulator >= this.syncInterval) {
            this.syncAccumulator = 0;
            this.broadcastStateNow();
        }
    }

    broadcastStateNow() {
        const p = this.game.player;
        if (!p) return;
        const v = p.inVehicle;

        let vehData = null;
        if (v) {
            vehData = {
                specKey: v.specKey || "STALLION",
                sprId: v.sprId || "66",
                remapIdx: v.remapIdx || 0,
                w: v.w || 48,
                h: v.h || 24,
                speed: Math.round(v.speed || 0),
                siren: Boolean(v.sirenActive),
                isEmerg: Boolean(v.isEmergency),
                isMoto: Boolean(v.isMotorcycle),
                fDent: Boolean(v.frontDented),
                rDent: Boolean(v.rearDented),
                hDent: Boolean(v.heavyDented)
            };
        }

        this.sendPacket({
            t: "STATE",
            name: this.playerName,
            color: this.playerColor,
            pedType: this.pedSpriteType,
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
            mov: Boolean(p.isMoving),
            run: Boolean(this.game.input && this.game.input.sprint),
            wp: Math.round((p.walkPhase || 0) * 100) / 100,
            mz: (p.muzzleTimer || 0) > 0 ? 0.08 : 0,
            k: this.kills,
            veh: vehData
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
                rck: pr.isRocket ? 1 : 0
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
            if (rp.dead || !rp.veh) continue;
            const rSpeed = Math.hypot(rp.vx || 0, rp.vy || 0);
            if (rSpeed < 45) continue;

            if (!p.inVehicle && (p.hitByCarCooldown || 0) <= 0 && (p.jumpTimer || 0) <= 0) {
                if (Math.hypot(p.x - rp.x, p.y - rp.y) < 24) {
                    p.hitByCarCooldown = 0.85;
                    p.x += ((rp.vx || 0) / Math.max(1, rSpeed)) * 20;
                    p.y += ((rp.vy || 0) / Math.max(1, rSpeed)) * 20;
                    this.game.lastAttackerId = rp.id;
                    this.game.lastAttackerName = rp.name;
                    this.game.damagePlayer(Math.min(34, rSpeed * 0.10));
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
        const spawnX = 215.5 * 64;
        const spawnY = Math.max(40 * 64, Math.min(200 * 64, p.y - 160 + (idx % 2 === 0 ? -120 : 180)));

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
                    rp.x = 215.5 * 64;
                    rp.y = Math.max(45 * 64, Math.min(195 * 64, p.y - 240));
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
                    this.game.multiplier += 1;
                    this.game.addCash(5000, `ONLINE RIVAL WASTED: ${rp.name}!`);
                    this.game.showBigBanner(
                        "ONLINE FRAG!",
                        `YOU WASTED ${rp.name}! (+$5,000 & MULTIPLIER +1 • KILLS: ${this.kills})`,
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
       7. INTERACTIVE [O] ONLINE ACTION (Teleport to Player / Spawn Rival / Room)
       ======================================================================== */
    triggerOnlineAction() {
        const p = this.game.player;
        const remotes = Array.from(this.remotePlayers.values());

        if (remotes.length === 0) {
            // If alone in lobby, spawn an active Online Rival Player so they can test MP combat/chases immediately,
            // AND remind them they can open a 2nd browser tab or share the URL to play with real players!
            const rival = this.spawnSimulatedRival();
            if (typeof this.game.sendPager === "function") {
                this.game.sendPager(
                    "VICE CITY ONLINE",
                    `🌐 Room [${this.roomCode}] active! Spawned Online Rival ${rival.name} near you. Open a 2nd browser tab or share this URL with friends to play real P2P Multiplayer!`,
                    false
                );
            }
            return;
        }

        // If remote players exist, cycle teleport to the next remote player (or spawn an extra rival if already next to them)
        this._tpIdx = ((this._tpIdx || 0) + 1) % remotes.length;
        const target = remotes[this._tpIdx];
        const dist = Math.hypot(target.x - p.x, target.y - p.y);

        if (dist > 220) {
            const targetObj = p.inVehicle || p;
            targetObj.x = target.x - 64;
            targetObj.y = target.y;
            targetObj.z = target.z || 2.0;
            this.game.addFloatingText(targetObj.x, targetObj.y - 30, `🌐 WARPED TO ${target.name}!`, target.color || "#00f0ff");
        } else {
            const rival = this.spawnSimulatedRival();
            this.game.addFloatingText(p.x, p.y - 30, `🌐 +1 RIVAL: ${rival.name} (${this.getPlayerCount()}P ONLINE)`, rival.color);
        }
    }
}

window.ViceNetworkManager = ViceNetworkManager;
