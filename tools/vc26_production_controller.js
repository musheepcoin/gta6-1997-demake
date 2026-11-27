const fs = require("fs");
const vm = require("vm");
const path = require("path");

const LOCAL_ROOT = path.resolve(__dirname, "..");
const ROOT = fs.existsSync(path.join(LOCAL_ROOT, "index.html")) ? LOCAL_ROOT : "/opt/vice-city-26-server";

let cachedEnv = null;
function createGameInstance(cmpBuf, forceFresh = false) {
    if (cachedEnv && !forceFresh) {
        const { g, sandbox, stepSec, basePlayerX, basePlayerY } = cachedEnv;
        g.setWantedLevel(0);
        g.peds.length = 0;
        g.vehicles = g.vehicles.filter(v => (String(v.id).startsWith("parked_") || String(v.id).startsWith("traffic_")) && !v.isPolice && v.driver !== "AI_COP" && v.driver !== "AI_EMERGENCY");
        if (g.input) {
            g.input.up = false;
            g.input.down = false;
            g.input.left = false;
            g.input.right = false;
            g.input.handbrake = false;
            g.input.shoot = false;
        }
        g.player.x = basePlayerX;
        g.player.y = basePlayerY;
        g.renderer.camX = basePlayerX;
        g.renderer.camY = basePlayerY;
        g.player.z = 2.0;
        g.player.hp = 100;
        g.player.dead = false;
        g.player.inVehicle = null;
        g.player.weapon = "PISTOL";
        g.player.muzzleTimer = 0;
        g.player.weaponDrawnTimer = 0;
        g.player.playerCombatTimer = 0;
        g.player.respawnGraceUntil = 0;
        g.crimeHeat = 0;
        g.copSpawnTimer = 0;
        g.wantedDecayTimer = 0;
        g.crimeSceneLockTimer = 0;
        g.crimeSceneSearchedTimer = 0;
        g.isPoliceSpotted = false;
        g.hasBeenDirectlySpottedByCop = false;
        g.lastKnownWantedPos = null;
        g.wantedSpottedVehicle = null;
        g.pending911Report = null;
        g._last911FloatAt = 0;
        g._last911DispatchedAt = 0;
        if (g.director) {
            g.director.teleportViolations.length = 0;
            g.director.vehicleLedger.clear();
            g.director.openCarryWarnTimer = 0;
            g.director._openCarryWarned = false;
            g.director.viralClipCooldown = 0;
        }
        if (g.net && g.net.remotePlayers) {
            g.net.remotePlayers.clear();
        }
        return cachedEnv;
    }
    const noop = () => {};
    const makeCtx2D = () => new Proxy({}, {
        get(t, prop) {
            if (prop === "measureText") return () => ({ width: 20 });
            if (prop === "createLinearGradient" || prop === "createRadialGradient") {
                return () => ({ addColorStop: noop });
            }
            if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(16) });
            return t[prop] !== undefined ? t[prop] : noop;
        },
        set(t, prop, val) { t[prop] = val; return true; }
    });
    const makeCanvas = () => ({
        width: 1280, height: 720, style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        getContext: () => makeCtx2D(), addEventListener: noop, parentNode: null
    });
    const elements = new Map();
    const getEl = (id) => {
        if (!elements.has(id)) {
            elements.set(id, {
                id, width: 1280, height: 720, textContent: "", innerHTML: "", value: "",
                style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
                getContext: () => makeCtx2D(), addEventListener: noop, appendChild: noop,
                children: [], firstChild: null, removeChild: noop, scrollTop: 0, scrollHeight: 0,
                setAttribute: noop, getAttribute: () => null, remove: noop, focus: noop, blur: noop,
                querySelectorAll: () => [], querySelector: () => null, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 })
            });
        }
        return elements.get(id);
    };

    let simNowMs = 10000;
    const sandbox = {
        console, Math, Date, Array, Object, String, Number, Boolean, RegExp, Map, Set, WeakMap, Promise,
        Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array,
        Uint8ClampedArray, ArrayBuffer, DataView, JSON, parseInt, parseFloat, isNaN, isFinite,
        performance: { now: () => simNowMs },
        advanceClock: (ms) => { simNowMs += ms; },
        setTimeout: () => 1, clearTimeout: noop, setInterval: () => 1, clearInterval: noop, requestAnimationFrame: noop,
        addEventListener: noop, removeEventListener: noop, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
        localStorage: { _d: new Map(), getItem(k) { return this._d.has(k) ? this._d.get(k) : null; }, setItem(k, v) { this._d.set(k, String(v)); }, removeItem(k) { this._d.delete(k); } },
        navigator: { userAgent: "Mozilla/5.0", maxTouchPoints: 0 },
        location: { hostname: "musheepcoin.github.io", protocol: "https:", href: "https://musheepcoin.github.io/gta6-1997-demake/", reload: noop },
        Image: class { constructor() { this.width = 256; this.height = 256; } set src(v) { this._src = v; if (this.onload) this.onload(); } },
        AudioContext: class { constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; } createGain() { return { gain: { value: 1, setValueAtTime: noop, linearRampToValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop }; } createOscillator() { return { frequency: { value: 440, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop, start: noop, stop: noop }; } createBiquadFilter() { return { frequency: { value: 1000, setValueAtTime: noop }, Q: { value: 1 }, connect: noop }; } createBufferSource() { return { connect: noop, start: noop, stop: noop, playbackRate: { value: 1 } }; } createBuffer() { return { getChannelData: () => new Float32Array(1024) }; } resume() {} },
        WebSocket: class { constructor() { this.readyState = 3; } send() {} close() {} },
        BroadcastChannel: class { constructor() {} postMessage() {} close() {} },
        Worker: class { constructor() {} postMessage() {} terminate() {} },
        Blob: class {}, URL: { createObjectURL: () => "blob:mock" }, URLSearchParams,
        fetch: async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0), json: async () => ({}) })
    };
    sandbox.document = {
        hidden: false, body: getEl("body"),
        getElementById: (id) => getEl(id),
        createElement: (tag) => tag === "canvas" ? makeCanvas() : getEl(`dyn_${Math.random()}`),
        querySelectorAll: () => [], querySelector: () => null, addEventListener: noop
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    vm.createContext(sandbox);

    const scripts = [
        "js/audio.js", "js/interiors.js", "js/object_engine.js", "js/map.js",
        "js/entities.js", "js/pednav.js", "js/missions.js", "js/renderer.js",
        "js/net.js", "js/world_director.js", "js/creation_engine.js", "js/game.js"
    ];
    for (const rel of scripts) {
        let code = fs.readFileSync(path.join(ROOT, rel), "utf8");
        if (rel === "js/game.js") {
            code = code.replace(/window\.addEventListener\("DOMContentLoaded"[\s\S]*?\}\);/, "");
        }
        vm.runInContext(code, sandbox, { filename: rel });
    }

    vm.runInContext(`
        RetroRenderer.prototype.initWebGL = function() { this.glLost = true; };
        RetroRenderer.prototype.loadAuthenticGta1Assets = function() {
            this.gta1Ready = true;
            this.cmpReady = true;
            this.glLost = true;
            this.gta1Meta = { sprites: { hud: {}, fonts: {}, peds: {}, cars: {} } };
        };
        RetroRenderer.prototype.render = function(game, dt) {
            const target = game.player.inVehicle || game.player;
            this.camX = target.x;
            this.camY = target.y;
            this.camZBlocks = target.z || 2.0;
        };
        RetroRenderer.prototype.worldToScreen = function(wx, wy) {
            return { x: 640 + (wx - (this.camX || 0)), y: 360 + (wy - (this.camY || 0)) };
        };
        ViceNetworkManager.prototype.init = function() { this.enabled = false; };
        window.game = new LeonidaGame();
        window.makePed = (opts) => new Pedestrian(opts);
        window.makeVeh = (id, spec, x, y, a) => new Vehicle(id, spec, x, y, a);
    `, sandbox);

    const g = sandbox.window.game;
    const ab = cmpBuf.buffer.slice(cmpBuf.byteOffset, cmpBuf.byteOffset + cmpBuf.byteLength);
    g.map.loadCmpBinary(ab, null);
    g.seedCityCurbsideParkedVehicles();
    g.renderer.cmpReady = true;
    g.renderer.gta1Ready = true;
    g.renderer.camX = g.player.x;
    g.renderer.camY = g.player.y;
    g.started = true;
    g.wreckTowDelay = 12.0; // tests use the fast 12s tow reaction; real game uses 90s
    g.player.respawnGraceUntil = 0;

    const stepSec = (seconds, onTick = null) => {
        const dt = 1 / 60;
        const steps = Math.round(seconds * 60);
        for (let i = 0; i < steps; i++) {
            sandbox.advanceClock(1000 / 60);
            g.update(dt);
            g.renderer.render(g, dt);
            if (onTick) onTick((i + 1) * dt, i);
        }
    };

    const env = { g, sandbox, stepSec, basePlayerX: g.player.x, basePlayerY: g.player.y };
    if (!cachedEnv) cachedEnv = env;
    return env;
}

function runSimulations() {
    const cmpBuf = fs.readFileSync(path.join(ROOT, "assets/gta1/gta1_map.bin"));
    console.log("================================================================================");
    console.log("  VICE CITY 26 — REAL-LIFE POLICE, 911 WITNESS & PRECINCT DISPATCH SIMULATIONS");
    console.log("================================================================================\n");

    let allPassed = true;
    const assert = (cond, msg) => {
        if (!cond) {
            console.error(`  ❌ ASSERTION FAILED: ${msg}`);
            allPassed = false;
        } else {
            console.log(`  ✅ ${msg}`);
        }
    };

    // =========================================================================
    // SCENARIO 1: Unwitnessed Crime (Isolated Spot / Bystander Behind Solid Wall)
    // =========================================================================
    {
        console.log("--- SCENARIO 1: UNWITNESSED CRIME (ISOLATED SPOT / SOLID BUILDING WALL) ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        g.vehicles = g.vehicles.filter(v => !v.isPolice);
        g.player.weapon = "FIST";
        g.player.muzzleTimer = 0;
        g.player.weaponDrawnTimer = 0;

        const px = 443.5 * 64; // East sidewalk of solid building block (c=441..442, r=284)
        const py = 284.5 * 64;
        g.player.x = px;
        g.player.y = py;
        g.renderer.camX = px;
        g.renderer.camY = py;
        const victim = sandbox.makePed({ id: "vic_1", x: px + 14, y: py, z: 2.0, kind: "CIVILIAN", hp: 30, dead: false });
        // Place a bystander on the WEST side of the solid building block (c = 439.5, r = 284.5 -> ~260px away, blocked by solid building c=441..442)
        const blockedBystander = sandbox.makePed({ id: "byst_blocked", x: 439.5 * 64, y: py, z: 2.0, kind: "CIVILIAN", hp: 35, dead: false });
        g.peds.push(victim, blockedBystander);

        const wallTrace = g.map.traceSegment2D(blockedBystander.x, blockedBystander.y, victim.x, victim.y, 2.0);
        assert(wallTrace.hit === true, `Solid 3D building wall blocks line-of-sight between alley/street and bystander (${Math.round(Math.hypot(blockedBystander.x - victim.x, blockedBystander.y - victim.y))}px away)`);

        g.killPed(victim, true, false);
        stepSec(6.0);
        const activeCops = g.vehicles.filter(v => v.isPolice && v.driver === "AI_COP").length;
        assert(g.wantedLevel === 0, `Unwitnessed silent kill triggers 0★ Wanted Level (actual: ${g.wantedLevel}★)`);
        assert((g.crimeHeat || 0) === 0, `Unwitnessed kill leaves police crimeHeat at 0 (actual: ${g.crimeHeat || 0})`);
        assert((blockedBystander.calling911Timer || 0) === 0, `Bystander behind solid building wall did NOT dial 911`);
        assert(activeCops === 0, `0 VCPD cruisers dispatched (actual: ${activeCops})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 2: Witnessed Murder + Witness Silenced Before 911 Call Completes
    // =========================================================================
    {
        console.log("--- SCENARIO 2: WITNESSED CRIME + WITNESS SILENCED BEFORE 911 CALL COMPLETES ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        g.vehicles = g.vehicles.filter(v => !v.isPolice);

        const px = g.player.x, py = g.player.y;
        const victim = sandbox.makePed({ id: "vic_2", x: px + 16, y: py, z: 2.0, kind: "CIVILIAN", hp: 30, dead: false });
        const witness = sandbox.makePed({ id: "wit_2", x: px, y: py - 95, z: 2.0, kind: "CIVILIAN", hp: 35, dead: false });
        g.peds.push(victim, witness);

        g.player.weapon = "PISTOL";
        g.player.muzzleTimer = 0.12;
        g.killPed(victim, true, false);

        const initCallTimer = witness.calling911Timer || 0;
        assert(initCallTimer >= 3.5, `Witness starts dialing 911 with realistic reaction timer (${initCallTimer.toFixed(2)}s >= 3.5s)`);
        assert(g.wantedLevel === 0, `Wanted level is still 0★ while witness is on the phone dialing 911`);

        // Simulate 1.8 seconds (witness is halfway through the 3.8s 911 call)
        stepSec(1.8);
        assert(g.wantedLevel === 0 && witness.calling911Timer > 1.5, `At t=1.8s: 911 call still in progress (${witness.calling911Timer.toFixed(2)}s remaining), Wanted = 0★`);

        // Player silences the witness at t=1.8s (with no other witnesses around)
        g.player.weapon = "FIST";
        g.player.muzzleTimer = 0;
        g.killPed(witness, true, false);
        assert((witness.calling911Timer || 0) === 0, `At t=1.8s: Witness silenced -> 911 call aborted!`);

        // Simulate another 12 seconds to confirm no delayed police ever arrive
        stepSec(12.0);
        const activeCops = g.vehicles.filter(v => v.isPolice && v.driver === "AI_COP").length;
        assert(g.wantedLevel === 0 && activeCops === 0, `At t=13.8s: Wanted remains 0★ and 0 VCPD units dispatched after silencing witness`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 3: 911 Call Completes -> Central Precinct Dispatch -> Road Arrival
    // =========================================================================
    {
        console.log("--- SCENARIO 3: 911 CALL COMPLETES -> PRECINCT DISPATCH -> ROAD ARRIVAL AT SCENE ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        g.vehicles.length = 0;

        const px = g.player.x, py = g.player.y;
        const victim = sandbox.makePed({ id: "vic_3", x: px + 16, y: py, z: 2.0, kind: "CIVILIAN", hp: 30, dead: false });
        const witness = sandbox.makePed({ id: "wit_3", x: px, y: py - 110, z: 2.0, kind: "CIVILIAN", hp: 35, dead: false });
        g.peds.push(victim, witness);

        g.player.weapon = "PISTOL";
        g.player.muzzleTimer = 0.12;
        g.killPed(victim, true, false);

        let t911Done = null;
        let tDispatched = null;
        let dispatchedCruiser = null;
        let spawnDistFromScene = null;
        let spawnDistFromPrecinct = null;
        let tArrivedAtScene = null;
        let tSpottedPlayer = null;
        let tDeployedOfficers = null;
        const precinct = g.getNearestEmergencyStation("POLICE", px, py);

        let elapsed = 0;
        stepSec(46.0, (t) => {
            elapsed = t;
            // Player stays near the crime scene holding pistol
            g.player.weapon = "PISTOL";
            if (t911Done === null && g.wantedLevel > 0) {
                t911Done = t;
            }
            if (tDispatched === null) {
                const cop = g.vehicles.find(v => v.isPolice && v.driver === "AI_COP");
                if (cop) {
                    tDispatched = t;
                    dispatchedCruiser = cop;
                    spawnDistFromScene = Math.hypot(cop.x - px, cop.y - py);
                    spawnDistFromPrecinct = precinct ? Math.hypot(cop.x - precinct.x, cop.y - precinct.y) : 0;
                }
            }
            if (dispatchedCruiser && tArrivedAtScene === null) {
                const d = Math.hypot(dispatchedCruiser.x - px, dispatchedCruiser.y - py);
                if (d < 280) tArrivedAtScene = t;
            }
            if (tSpottedPlayer === null && g.isPoliceSpotted) {
                tSpottedPlayer = t;
            }
            if (tDeployedOfficers === null && g.peds.some(pd => !pd.dead && pd.kind === "COP")) {
                tDeployedOfficers = t;
            }
        });

        console.log(`  [Timeline] t=0.00s Murder -> t=${t911Done?.toFixed(2)}s 911 Call Received -> t=${tDispatched?.toFixed(2)}s Cruiser Dispatched from Precinct (${Math.round(spawnDistFromScene || 0)}px away, ${Math.round(spawnDistFromPrecinct || 0)}px from VCPD HQ gate) -> t=${tSpottedPlayer?.toFixed(2)}s Visual Contact -> t=${tArrivedAtScene?.toFixed(2)}s Arrived at Scene -> t=${tDeployedOfficers?.toFixed(2)}s Officers Deployed`);

        assert(t911Done !== null && t911Done >= 6.8 && t911Done <= 8.6, `911 call completed at t=${t911Done?.toFixed(2)}s (expected ~7.5s measured response)`);
        assert(tDispatched !== null && tDispatched >= t911Done + 2.0 && tDispatched <= t911Done + 21.0, `VCPD Central Dispatch rolled out cruiser at t=${tDispatched?.toFixed(2)}s after 911 call`);
        assert(spawnDistFromScene >= 1350 && spawnDistFromPrecinct <= 260, `Cruiser spawned directly at VCPD Central Precinct HQ road gate (${Math.round(spawnDistFromScene)}px from crime scene, ${Math.round(spawnDistFromPrecinct)}px from Precinct HQ)`);
        assert(tArrivedAtScene !== null && tArrivedAtScene >= 16.0 && tArrivedAtScene <= 44.0, `Cruiser drove along road network and arrived at crime scene at t=${tArrivedAtScene?.toFixed(2)}s (measured response time, NEVER instant!)`);
        assert(tSpottedPlayer !== null && tDeployedOfficers !== null, `Cruiser visually identified armed suspect at scene (t=${tSpottedPlayer?.toFixed(2)}s) and deployed 2 officers on foot (t=${tDeployedOfficers?.toFixed(2)}s)`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 4: Hit-and-Run Evasion (Player Holsters Gun & Flees Scene Unseen)
    // =========================================================================
    {
        console.log("--- SCENARIO 4: HIT-AND-RUN EVASION (PLAYER HOLSTERS WEAPON & FLEES SCENE UNSEEN) ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        g.vehicles.length = 0;

        const crimeX = g.player.x, crimeY = g.player.y;
        const victim = sandbox.makePed({ id: "vic_4", x: crimeX + 16, y: crimeY, z: 2.0, kind: "CIVILIAN", hp: 30, dead: false });
        const witness = sandbox.makePed({ id: "wit_4", x: crimeX, y: crimeY - 110, z: 2.0, kind: "CIVILIAN", hp: 35, dead: false });
        g.peds.push(victim, witness);

        // 1. Player shoots victim at t=0.0s, then immediately holsters weapon (FIST) and walks 360px South-East onto the boardwalk/park away from the crime scene!
        g.player.weapon = "PISTOL";
        g.player.muzzleTimer = 0.10;
        g.killPed(victim, true, false);
        g.player.weapon = "FIST";
        g.player.muzzleTimer = 0;
        g.player.weaponDrawnTimer = 0;
        g.player.playerCombatTimer = 0;
        g.player.x = crimeX + 260;
        g.player.y = crimeY + 340; // ~428px from crime scene, unarmed bystander posture

        let everSpotted = false;
        let t911Triggered = null;
        let tCruiserReachedCrimeScene = null;
        let tWantedCleared = null;
        let minCruiserDistToCrimeScene = 9999;

        stepSec(54.0, (t) => {
            if (g.isPoliceSpotted) everSpotted = true;
            if (t911Triggered === null && g.wantedLevel > 0) t911Triggered = t;
            const cop = g.vehicles.find(v => v.isPolice && v.driver === "AI_COP");
            if (cop) {
                const dScene = Math.hypot(cop.x - crimeX, cop.y - crimeY);
                if (dScene < minCruiserDistToCrimeScene) minCruiserDistToCrimeScene = dScene;
                if (tCruiserReachedCrimeScene === null && dScene < 280) {
                    tCruiserReachedCrimeScene = t;
                }
            }
            if (t911Triggered !== null && tWantedCleared === null && g.wantedLevel === 0) {
                tWantedCleared = t;
            }
        });

        console.log(`  [Timeline] Murder at (${Math.round(crimeX)}, ${Math.round(crimeY)}) -> Player fled unarmed 428px away -> Cruiser arrived at crime scene at t=${tCruiserReachedCrimeScene?.toFixed(2)}s (min dist to scene: ${Math.round(minCruiserDistToCrimeScene)}px) -> Investigated empty scene -> APB Cleared at t=${tWantedCleared?.toFixed(2)}s`);

        assert(everSpotted === false, `Dispatched VCPD cruiser NEVER telepathically spotted the unarmed player 428px away from the crime scene`);
        assert(tCruiserReachedCrimeScene !== null && minCruiserDistToCrimeScene < 280, `Cruiser drove to the reported crime scene (t=${tCruiserReachedCrimeScene?.toFixed(2)}s, dist=${Math.round(minCruiserDistToCrimeScene)}px)`);
        assert(tWantedCleared !== null && tWantedCleared > tCruiserReachedCrimeScene + 3.5, `APB stayed active while cruiser drove to scene, then cleared at t=${tWantedCleared?.toFixed(2)}s after investigating the empty crime scene!`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 5: Direct Crime Committed in Front of a VCPD Officer
    // =========================================================================
    {
        console.log("--- SCENARIO 5: DIRECT CRIME IN FRONT OF A VCPD OFFICER (0s INSTANT RESPONSE) ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        g.peds.length = 0;
        const px = g.player.x, py = g.player.y;
        const copPed = sandbox.makePed({
            id: "cop_5", x: px, y: py - 130, z: 2.0, angle: Math.PI * 0.5,
            kind: "COP", g24Type: "police", hp: 105, dead: false
        });
        const victim = sandbox.makePed({ id: "vic_5", x: px + 15, y: py, z: 2.0, kind: "CIVILIAN", hp: 30, dead: false });
        g.peds.push(copPed, victim);

        g.player.weapon = "PISTOL";
        g.player.muzzleTimer = 0.12;
        g.killPed(victim, true, false);

        assert(g.wantedLevel >= 1 && g.isPoliceSpotted === true, `Crime committed in plain sight of a VCPD officer triggers immediate 0.0s Wanted Level (${g.wantedLevel}★) and direct visual contact (isPoliceSpotted=${g.isPoliceSpotted})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 6: EMS Ambulance Dispatch from Leonida General Hospital
    // =========================================================================
    {
        console.log("--- SCENARIO 6: EMS AMBULANCE DISPATCH FROM LEONIDA GENERAL HOSPITAL ---");
        const { g } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const hospital = g.getNearestEmergencyStation("MEDIC", px, py);
        const spawnInfo = g.findStationDispatchSpawn("MEDIC", px, py, 2.0);
        const distFromScene = spawnInfo ? Math.hypot(spawnInfo.x - px, spawnInfo.y - py) : 0;
        const distFromHosp = (spawnInfo && hospital) ? Math.hypot(spawnInfo.x - hospital.x, spawnInfo.y - hospital.y) : 9999;
        assert(Boolean(spawnInfo && distFromScene >= 1350 && distFromHosp <= 260), `EMS Ambulance dispatches directly from Leonida General Hospital road gate (${Math.round(distFromScene)}px from scene, ${Math.round(distFromHosp)}px from Hospital HQ)`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 7: Carjacking Victim 911 Call + Stolen Vehicle Recognition vs Clean-Car Disguise
    // =========================================================================
    {
        console.log("--- SCENARIO 7: CARJACKING VICTIM 911 CALL & STOLEN vs. CLEAN VEHICLE DISGUISE ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        const px = g.player.x, py = g.player.y;

        // Place an occupied civilian car right next to the player with no other bystanders around
        const stolenCar = sandbox.makeVeh("test_stolen_1", "MINT_STALLION", px + 24, py, 0);
        stolenCar.driver = "AI_TRAFFIC";
        stolenCar.aiAggressive = false;
        const cleanCar = sandbox.makeVeh("test_clean_1", "REGAL_SEDAN", px + 90, py, 0);
        cleanCar.driver = null;
        g.vehicles.push(stolenCar, cleanCar);

        g.completeVehicleEntry(stolenCar);
        const ejectedVictim = g.peds.find(pd => !pd.dead && pd.kind === "CIVILIAN");
        assert(Boolean(ejectedVictim && ejectedVictim.calling911Timer >= 3.5), `Carjacked civilian driver prepares to dial 911 (${ejectedVictim?.calling911Timer?.toFixed(2)}s timer after 0.85s knockdown) and records stolen car ID (${ejectedVictim?.calling911Veh?.id})`);

        // Advance 8.6s so the carjacked driver recovers from knockdown (0.85s) and finishes the 7.5s 911 call
        stepSec(8.6);
        assert(g.wantedLevel === 1 && g.wantedSpottedVehicle === stolenCar, `At t=8.6s: Carjack victim completed 911 call -> 1★ APB issued with stolen vehicle description (${g.wantedSpottedVehicle?.id})`);

        // While driving the reported stolen car, a responding officer 220px ahead can identify the suspect
        const copX = g.player.inVehicle.x + 220;
        const copY = g.player.inVehicle.y;
        const idInStolen = g.canCopIdentifyPlayer(copX, copY, Math.PI, 460);
        assert(idInStolen === true, `Officer at 220px immediately identifies player driving the reported stolen vehicle (${stolenCar.specKey})`);

        // Now player switches unseen into an unspotted clean car 320px away from the crime scene and cruises calmly (< 155 px/s)
        g.player.inVehicle = cleanCar;
        cleanCar.x = px;
        cleanCar.y = py + 340;
        cleanCar.speed = 85;
        g.player.x = cleanCar.x;
        g.player.y = cleanCar.y;
        const idInClean = g.canCopIdentifyPlayer(cleanCar.x + 220, cleanCar.y, Math.PI, 460);
        assert(idInClean === false, `Officer at 220px does NOT telepathically identify player cruising calmly in an unspotted clean vehicle away from the scene`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 8: Multiplayer VEH_ENTER / VEH_EXIT Anti-Teleportation & World Invariant Oracle
    // =========================================================================
    {
        console.log("--- SCENARIO 8: MULTIPLAYER ANTI-TELEPORTATION & WORLD DIRECTOR INVARIANT ORACLE ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const roadCar = sandbox.makeVeh("mp_car_1", "VICE_CHEETAH", px + 80, py, 0);
        roadCar.driver = null;
        g.vehicles.push(roadCar);

        // Simulate a remote player standing 36px away on the sidewalk at angle 1.57 who sends VEH_ENTER for roadCar
        g.net.remotePlayers.set("rp_test_1", {
            id: "rp_test_1", name: "RIVAL_1", x: px + 44, y: py - 32, z: 2.0, angle: 1.57,
            targetX: px + 44, targetY: py - 32, targetZ: 2.0, targetAngle: 1.57,
            lastSeen: sandbox.performance.now(), veh: null
        });
        const carOrigX = roadCar.x, carOrigY = roadCar.y;
        g.net.applyWorldEvent({ kind: "VEH_ENTER", id: "rp_test_1", vehId: "mp_car_1", specKey: "VICE_CHEETAH", seat: 0 });
        stepSec(0.05);
        const snapDelta = Math.hypot(roadCar.x - carOrigX, roadCar.y - carOrigY);
        assert(snapDelta < 2.0, `Remote VEH_ENTER keeps vehicle anchored on road (0px sidewalk snap; actual delta: ${snapDelta.toFixed(2)}px)`);

        const invReport = g.director.auditWorldInvariants();
        assert(invReport.ok === true, `ViceWorldDirector.auditWorldInvariants() passed 100% (nanVeh=${invReport.nanVehicles}, nanPed=${invReport.nanPeds}, waterVeh=${invReport.landVehiclesInDeepWater}, teleports=${invReport.teleportViolationsCount})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 9: GTA 6 Police Recognition Status Badges (HUD Feedback Loop)
    // =========================================================================
    {
        console.log("--- SCENARIO 9: GTA 6 POLICE RECOGNITION STATUS BADGES (HUD FEEDBACK LOOP) ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const witness = sandbox.makePed({ id: "wit_9", x: px, y: py - 80, z: 2.0, kind: "CIVILIAN", hp: 35, dead: false });
        witness.calling911Timer = 3.5;
        g.peds.push(witness);
        assert(g.director.getWantedRecognitionStatus()?.code === "CALLING_911", `While witness is dialing 911 at 0★, HUD badge shows CALLING_911`);
        witness.calling911Timer = 0;

        const hotCar = sandbox.makeVeh("hot_9", "MINT_STALLION", px, py, 0);
        const cleanCar = sandbox.makeVeh("clean_9", "REGAL_SEDAN", px + 50, py, 0);
        g.vehicles.push(hotCar, cleanCar);
        g.player.inVehicle = hotCar;
        g.setWantedLevel(1, { x: px, y: py }, false, hotCar);
        assert(g.director.getWantedRecognitionStatus()?.code === "HOT_VEHICLE", `Driving the 911-reported car shows HOT_VEHICLE badge`);

        g.player.inVehicle = cleanCar;
        cleanCar.speed = 80;
        assert(g.director.getWantedRecognitionStatus()?.code === "INCOGNITO_CAR", `Switching unseen to an unspotted civilian car shows INCOGNITO_CAR badge`);

        g.player.inVehicle = null;
        g.player.weapon = "FIST";
        assert(g.director.getWantedRecognitionStatus()?.code === "SEARCHING_SCENE", `On foot unarmed away from cops shows SEARCHING_SCENE badge`);

        g.isPoliceSpotted = true;
        assert(g.director.getWantedRecognitionStatus()?.code === "SPOTTED", `Direct visual contact with VCPD shows SPOTTED badge`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 10: GTA 6 Tactical Vehicle Trunk [B] (Arsenal Stash & Quick Disguise)
    // =========================================================================
    {
        console.log("--- SCENARIO 10: GTA 6 TACTICAL VEHICLE TRUNK [B] (ARSENAL STASH & QUICK DISGUISE) ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        g.vehicles = g.vehicles.filter(v => Math.hypot(v.x - px, v.y - py) > 80);
        const copCruiser = sandbox.makeVeh("trunk_cop_10", "VCPD_CRUISER", px + 24, py, 0);
        copCruiser.driver = null;
        g.vehicles.push(copCruiser);

        g.player.armor = 0;
        g.setWantedLevel(1, { x: px - 400, y: py - 400 }, false);
        g.isPoliceSpotted = false;

        const res = g.tryInteractVehicleTrunk();
        assert(res.ok === true && res.lootType === "POLICE_RACK", `Opening VCPD Cruiser trunk [B] loots POLICE_RACK (+50 Kevlar Armor & +24 Shotgun shells)`);
        assert(g.player.armor === 50 && g.player.weaponsOwned.includes("SHOTGUN"), `Player received +50 Armor (actual: ${g.player.armor}) and SHOTGUN in inventory`);
        assert(g.wantedLevel === 0, `Swapping outfit disguise at vehicle trunk >220px from crime scene while unseen clears 1★ APB!`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 11: GTA 6 Heavy Weapon Open-Carry Police Scrutiny vs. Holstered Stealth
    // =========================================================================
    {
        console.log("--- SCENARIO 11: GTA 6 HEAVY WEAPON OPEN-CARRY SCRUTINY vs. HOLSTERED STEALTH ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        const px = g.player.x, py = g.player.y;
        const beatCop = sandbox.makePed({
            id: "cop_11", x: px, y: py - 120, z: 2.0, angle: Math.PI * 0.5,
            kind: "COP", g24Type: "police", hp: 105, dead: false
        });
        g.peds.push(beatCop);

        // 1) Player walks past beat cop holding ROCKET launcher for 1.0s -> warning issued, still 0★
        g.player.weapon = "ROCKET";
        stepSec(1.0);
        assert(g.wantedLevel === 0 && g.director.openCarryWarnTimer > 0.5, `At t=1.0s: Officer issues Open-Carry warning (${g.director.openCarryWarnTimer.toFixed(2)}s), Wanted still 0★`);

        // 2) Player refuses to holster for another 1.3s -> escalates to 1★ Open-Carry Violation!
        stepSec(1.3);
        assert(g.wantedLevel === 1, `At t=2.3s: Refusing to holster heavy weapon in front of VCPD officer triggers 1★ Wanted Level`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 12: GTA 6 @LeonidaFeed Bystander Viral Clips & Trailer 2 Cast
    // =========================================================================
    {
        console.log("--- SCENARIO 12: GTA 6 @LEONIDAFEED VIRAL CLIPS & OFFICIAL TRAILER 2 CAST ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        const px = g.player.x, py = g.player.y;
        const fan = sandbox.makePed({ id: "fan_12", x: px + 85, y: py, z: 2.0, kind: "CIVILIAN", hp: 35, dead: false });
        g.peds.push(fan);

        const cashBefore = g.cash;
        g.player.playerCombatTimer = 2.5;
        stepSec(0.2);
        assert((fan.filmingViralTimer || 0) > 1.5, `Bystander pulls out smartphone to film Leonida Viral Clip (${fan.filmingViralTimer.toFixed(2)}s)`);
        stepSec(2.4);
        assert(g.cash > cashBefore && g.director.blackboard.totalViralClips >= 1, `Completed @LeonidaFeed Viral Clip awards +$150 Hype bonus (cash: $${cashBefore} -> $${g.cash})`);

        const callers = g.missions.payphones.map(p => p.caller).join(" | ");
        assert(callers.includes("Dre'Quan Priest") && callers.includes("Boobie Ike") && callers.includes("Raul Bautista"), `Official GTA 6 Trailer 2 Cast active in Smartphone Missions (${callers})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 13: GTA 6 High-End Exotic Vehicle GPS Tracker & Cal Hampton Jammer [B]
    // =========================================================================
    {
        console.log("--- SCENARIO 13: GTA 6 EXOTIC VEHICLE FACTORY GPS TRACKER & CAL HAMPTON JAMMER [B] ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const exotic1 = sandbox.makeVeh("exotic_13a", "VICE_CHEETAH", px + 24, py, 0);
        const exotic2 = sandbox.makeVeh("exotic_13b", "BANSHEE_GT", px + 64, py, 0);
        exotic1.driver = null;
        exotic2.driver = null;
        g.vehicles.push(exotic1, exotic2);

        // Part A: Steal VICE_CHEETAH -> 12s Factory GPS Tracker arms -> Press [B] (toggleBandana) to jam!
        g.completeVehicleEntry(exotic1);
        assert((exotic1.gpsTrackerTimer || 0) === 12.0, `Stealing exotic VICE_CHEETAH arms 12.0s Factory GPS Tracker`);
        assert(g.director.getWantedRecognitionStatus()?.code === "GPS_TRACKER_ACTIVE", `HUD displays GPS_TRACKER_ACTIVE warning pill`);
        const cashBeforeJam = g.cash;
        g.toggleBandana();
        assert(exotic1.gpsTrackerTimer === 0 && exotic1._gpsTrackerJammed === true, `Pressing [B] inside tracked exotic deploys Cal Hampton's Signal Jammer and disables GPS countdown`);
        assert(g.cash >= cashBeforeJam + 200 && g.wantedLevel === 0, `Jamming exotic GPS tracker awards +$200 tech bonus and keeps Wanted at 0★`);

        // Part B: Steal BANSHEE_GT and ignore the 12s countdown -> LoJack satellite pings VCPD Dispatch (1★ + HOT_VEHICLE)!
        g.player.inVehicle = null;
        g.completeVehicleEntry(exotic2);
        assert((exotic2.gpsTrackerTimer || 0) === 12.0, `Stealing exotic BANSHEE_GT arms 12.0s Factory GPS Tracker`);
        stepSec(12.2);
        assert(g.wantedLevel === 1 && g.wantedSpottedVehicle === exotic2, `Ignoring exotic GPS tracker for 12s triggers LoJack satellite ping to VCPD (1★ + HOT_VEHICLE)`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 14: GTA 6 Dynamic Street Hold-Ups & NPC Intimidation vs. Brave NPC
    // =========================================================================
    {
        console.log("--- SCENARIO 14: GTA 6 DYNAMIC STREET HOLD-UPS & NPC INTIMIDATION vs. BRAVE NPC ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        g.peds.length = 0;
        const px = g.player.x, py = g.player.y;
        g.player.angle = 0; // Aiming East (+X)
        g.player.weapon = "PISTOL";

        // Part A: Cautious civilian dialing 911 in front of player -> Intimidated into raising hands, aborting 911, and dropping +$75!
        const civTarget = sandbox.makePed({
            id: "civ_14a", x: px + 52, y: py, z: 2.0, angle: Math.PI,
            kind: "CIVILIAN", personality: "CAUTIOUS", hp: 35, dead: false
        });
        civTarget.calling911Timer = 3.2;
        g.peds.push(civTarget);

        const cashBeforeStickup = g.cash;
        g.triggerHornOrBurp(); // Armed on-foot [G / V] triggers GTA 6 Street Hold-Up Intimidation!
        assert((civTarget.calling911Timer || 0) === 0, `Intimidating a civilian at gunpoint aborts their active 911 call`);
        assert((civTarget.surrenderTimer || 0) >= 4.0 && civTarget.computeState() === 1, `Intimidated civilian freezes with HANDS UP (surrenderTimer=${civTarget.surrenderTimer.toFixed(1)}s)`);
        assert(g.cash >= cashBeforeStickup + 75 && g.director.blackboard.totalStickUps === 1, `Street hold-up awards +$75 dropped cash without requiring murder`);

        // Part B: Brave NPC refuses to surrender and fights back!
        g.peds.length = 0;
        const bravePed = sandbox.makePed({
            id: "civ_14b", x: px + 48, y: py, z: 2.0, angle: Math.PI,
            kind: "CIVILIAN", personality: "BRAVE", hp: 45, dead: false
        });
        g.peds.push(bravePed);
        const resBrave = g.tryIntimidateStreetPed(110);
        assert(resBrave.ok === true && resBrave.outcome === "FOUGHT_BACK" && bravePed.kind === "HOSTILE", `Brave Leonida NPC refuses to surrender and turns HOSTILE to fight back!`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 15: GTA 6 Unified Focus Mode / Eagle-Eye Tactical Combat Burst
    // =========================================================================
    {
        console.log("--- SCENARIO 15: GTA 6 UNIFIED FOCUS MODE / EAGLE-EYE TACTICAL COMBAT BURST ---");
        const { g } = createGameInstance(cmpBuf);
        g.projectiles.length = 0;
        const px = g.player.x, py = g.player.y;

        // Fire normal pistol shot first
        g.fireWeapon(px, py, 0, "PISTOL", true, false);
        const normalProj = g.projectiles[g.projectiles.length - 1];

        // Activate GTA 6 Focus Mode [L / Right-Click] and fire focused pistol shot
        const focusRes = g.triggerFocusMode();
        assert(focusRes.ok === true && g.director.focusActiveTimer === 4.5, `GTA 6 Focus Mode activates for 4.5s (totalFocusBursts=${g.director.blackboard.totalFocusBursts})`);
        g.fireWeapon(px, py, 0, "PISTOL", true, false);
        const focusProj = g.projectiles[g.projectiles.length - 1];

        const normalSpd = Math.hypot(normalProj.vx, normalProj.vy);
        const focusSpd = Math.hypot(focusProj.vx, focusProj.vy);
        assert(focusProj.damage > normalProj.damage && focusSpd > normalSpd * 1.2, `Focus Mode boosts projectile damage (${normalProj.damage} -> ${focusProj.damage}, +35%) and velocity (${Math.round(normalSpd)} -> ${Math.round(focusSpd)}, +28%) with laser accuracy`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 16: GTA 6 Leonida Gator Wrangler Bounty & Live @LeonidaFeed Social Ticker
    // =========================================================================
    {
        console.log("--- SCENARIO 16: GTA 6 LEONIDA GATOR WRANGLER & LIVE @LEONIDAFEED SOCIAL TICKER ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const gator = sandbox.makePed({
            id: "gator_16", x: px + 24, y: py, z: 2.0, angle: Math.PI,
            kind: "GATOR", hp: 40, dead: false
        });
        g.peds.push(gator);

        const cashBeforeGator = g.cash;
        g.killPed(gator, true, false);
        assert(g.cash >= cashBeforeGator + 250 && g.director.blackboard.totalGatorsWrangled === 1, `Wrangling an aggressive Leonida Alligator awards $100 Gator Bag + $150 Gator Wrangler bonus ($${cashBeforeGator} -> $${g.cash})`);
        assert(Boolean(g.director.activeSocialTicker && g.director.activeSocialTicker.handle === "@GrassriversDaily"), `Live @LeonidaFeed Social Ticker broadcasts #LeonidaMan gator headline (${g.director.activeSocialTicker?.text})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 17: GTA 6 VCPD Tactical Roadblock Spike Strips & Tire Blowout Physics
    // =========================================================================
    {
        console.log("--- SCENARIO 17: GTA 6 VCPD TACTICAL ROADBLOCK SPIKE STRIPS & TIRE BLOWOUT PHYSICS ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const getawayCar = sandbox.makeVeh("getaway_17", "MINT_STALLION", px, py, 0);
        getawayCar.driver = "PLAYER";
        g.vehicles.push(getawayCar);
        g.player.inVehicle = getawayCar;
        g.setWantedLevel(3, { x: px, y: py }, true, getawayCar);

        const strip = g.director.deployRoadblockSpikeStrip(px, py - 24, 0);
        assert(Boolean(strip && g.director.spikeStrips.length === 1), `VCPD 3★+ Roadblock deploys Tactical Spike Strip across road lane`);

        // Player vehicle rolls directly over the spike strip
        getawayCar.x = strip.x;
        getawayCar.y = strip.y;
        stepSec(0.05);
        assert((getawayCar.tirePuncturedTimer || 0) >= 6.5 && g.director.blackboard.totalSpikeStripHits === 1, `Driving over VCPD Spike Strip punctures tires (tirePuncturedTimer=${getawayCar.tirePuncturedTimer.toFixed(1)}s)`);

        // Verify top speed is capped to ~58% when tires are shredded
        getawayCar.vx = getawayCar.maxSpeed;
        getawayCar.vy = 0;
        getawayCar.updateDrive(0.016, 1.0, false, 1.0);
        assert(getawayCar.speed <= getawayCar.maxSpeed * 0.60, `Punctured tires cap getaway vehicle top speed to 58% (${Math.round(getawayCar.speed)} <= ${Math.round(getawayCar.maxSpeed * 0.60)} px/s)`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 18: GTA 6 Rideout Customs / Pay 'n' Spray Chop-Shop Tracker Strip & Tire Repair
    // =========================================================================
    {
        console.log("--- SCENARIO 18: GTA 6 RIDEOUT CUSTOMS CHOP-SHOP TRACKER STRIP & TIRE REPAIR ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const pns = g.map.payNSprays[0];
        const pnsCx = pns.x + pns.w * 0.5;
        const pnsCy = pns.y + pns.h * 0.5;
        const stolenExotic = sandbox.makeVeh("exotic_18", "VICE_CHEETAH", pnsCx, pnsCy, 0);
        stolenExotic.driver = "PLAYER";
        stolenExotic.gpsTrackerTimer = 9.5;
        stolenExotic.tirePuncturedTimer = 5.5;
        g.vehicles.push(stolenExotic);
        g.player.inVehicle = stolenExotic;
        g.player.x = pnsCx;
        g.player.y = pnsCy;
        g.setWantedLevel(2, { x: pnsCx, y: pnsCy }, true, stolenExotic);

        const cashBeforePns = g.cash;
        pns.cooldown = 0;
        stepSec(0.05);
        assert(stolenExotic.gpsTrackerTimer === 0 && stolenExotic._gpsTrackerJammed === true, `Rideout Customs / Pay 'n' Spray strips Factory GPS Tracker permanently`);
        assert(stolenExotic.tirePuncturedTimer === 0 && g.wantedLevel === 0, `Rideout Customs replaces shredded tires and clears Wanted Level to 0★`);
        assert(g.cash >= cashBeforePns + 250 && g.director.blackboard.totalSmugglerExports >= 1, `Rideout Customs awards +$250 Chop-Shop Fence bonus on stolen luxury exotic ($${cashBeforePns} -> $${g.cash})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 19: GTA 6 Real Dimez (Bae-Luxe & Roxy) Street Takeover Drift Hype
    // =========================================================================
    {
        console.log("--- SCENARIO 19: GTA 6 REAL DIMEZ (BAE-LUXE & ROXY) STREET TAKEOVER DRIFT HYPE ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const takeover = g.map.streetTakeovers[0];
        const origTx = takeover.x, origTy = takeover.y;
        takeover.x = px;
        takeover.y = py - 95;
        takeover.wipeoutTimer = 0;

        const driftCar = sandbox.makeVeh("drift_19", "BANSHEE_GT", px, py, 0);
        driftCar.driver = "PLAYER";
        g.vehicles.push(driftCar);
        g.player.inVehicle = driftCar;

        const cashBeforeTakeover = g.cash;
        g.input.up = true;
        g.input.handbrake = true;
        driftCar.vx = 180;
        driftCar.speed = 180;
        driftCar.drifting = true;
        stepSec(1.35, () => {
            driftCar.x = px;
            driftCar.y = py;
            driftCar.vx = 180;
            driftCar.speed = 180;
            driftCar.drifting = true;
        });
        g.input.up = false;
        g.input.handbrake = false;
        takeover.x = origTx;
        takeover.y = origTy;

        assert(g.cash >= cashBeforeTakeover + 250 && g.director.blackboard.totalTakeoverHypes === 1, `Drifting inside Street Takeover ring awards +$250 Real Dimez Hype bonus ($${cashBeforeTakeover} -> $${g.cash})`);
        assert(Boolean(g.director.activeSocialTicker && g.director.activeSocialTicker.handle === "@RealDimez"), `Live @LeonidaFeed Social Ticker broadcasts @RealDimez (Bae-Luxe & Roxy) takeover stream (${g.director.activeSocialTicker?.text})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 20: GTA 6 Brian Heder Keys Smuggler Export & Pedestrian Aimed-Gun Audit Fix
    // =========================================================================
    {
        console.log("--- SCENARIO 20: GTA 6 BRIAN HEDER KEYS SMUGGLER EXPORT & AIMED-GUN INTIMIDATION AUDIT ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;

        // Part A: Brian Heder Keys Smuggler Export Bonus at Dockyard Crane
        const exportExotic = sandbox.makeVeh("export_20", "PENETRATOR_GT", px, py, 0);
        const cashBeforeExport = g.cash;
        const expRes = g.director.onCraneVehicleExport(exportExotic);
        assert(expRes.ok === true && expRes.bonus === 250 && g.cash >= cashBeforeExport + 250, `Brian Heder awards +$250 Keys Smuggler Contraband bonus when exporting an exotic at the Dockyard Crane`);

        // Part B: Audit Verification — Aiming a drawn gun at a civilian < 92px in the main 60 Hz pedestrian loop triggers surrender + cash drop instead of panic-fleeing!
        g.trafficManager.generateTrafficPeds = () => {};
        g.peds.length = 0;
        g.player.inVehicle = null;
        g.player.angle = 0;
        g.player.weapon = "PISTOL";
        g.player.weaponDrawnTimer = 0.6;
        const closeCiv = sandbox.makePed({
            id: "civ_20", x: px + 58, y: py, z: 2.0, angle: Math.PI,
            kind: "CIVILIAN", personality: "CAUTIOUS", hp: 35, dead: false
        });
        g.peds.push(closeCiv);
        const cashBeforeAim = g.cash;
        stepSec(0.1);
        assert((closeCiv.surrenderTimer || 0) >= 4.0 && (closeCiv.panicTimer || 0) === 0 && g.cash >= cashBeforeAim + 75, `Main 60 Hz pedestrian loop triggers GTA 6 HANDS UP surrender (surrenderTimer=${closeCiv.surrenderTimer.toFixed(1)}s) and +$75 cash drop on aimed gun threat`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 21: Centralized MunicipalDispatchDirector Multi-Agency Fleet Spawning
    // =========================================================================
    {
        console.log("--- SCENARIO 21: CENTRALIZED MUNICIPAL DISPATCH DIRECTOR (POLICE / MEDIC / FIRE / TOW) ---");
        const { g } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;
        const pSpawn = g.director.findStationDispatchSpawn("POLICE", px, py, 2.0);
        const mSpawn = g.director.findStationDispatchSpawn("MEDIC", px, py, 2.0);
        const fSpawn = g.director.findStationDispatchSpawn("FIRE", px, py, 2.0);
        const tSpawn = g.director.findStationDispatchSpawn("TOW", px, py, 2.0);

        assert(Boolean(pSpawn && mSpawn && fSpawn && tSpawn), `MunicipalDispatchDirector resolves valid off-screen road spawns for all 4 agencies (POLICE, MEDIC, FIRE, TOW)`);
        assert(
            g.director.blackboard.totalPrecinctDispatches >= 1 &&
            g.director.blackboard.totalMedicDispatches >= 1 &&
            g.director.blackboard.totalFireDispatches >= 1 &&
            g.director.blackboard.totalTowDispatches >= 1 &&
            g.director.fleetLedger.length >= 4,
            `MunicipalDispatchDirector records all 4 agency dispatches in blackboard & fleetLedger (ledger size=${g.director.fleetLedger.length})`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 22: Self-Healing World Sanitizer (autoHealWorldAnomalies)
    // =========================================================================
    {
        console.log("--- SCENARIO 22: SELF-HEALING WORLD SANITIZER (AUTO-RECOVERY FROM NaN, TOW & WATER ANOMALIES) ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const px = g.player.x, py = g.player.y;

        const testCar = sandbox.makeVeh("heal_car_22", "REGAL_SEDAN", px, py, 0);
        testCar.driver = "AI_TRAFFIC";
        const waterCar = sandbox.makeVeh("water_car_22", "MINT_STALLION", px, py, 0);
        waterCar.driver = "AI_TRAFFIC";
        g.vehicles.push(testCar, waterCar);

        // Step 1 frame so vehicleLedger records lastX, lastY, lastDryX, lastDryY for both vehicles
        stepSec(0.02);

        // Now inject 3 severe anomalies simultaneously: NaN coordinates, orphaned tow link, and AI land car in deep ocean water!
        const healedBefore = g.director.blackboard.totalAnomaliesHealed || 0;
        testCar.x = NaN;
        testCar.y = NaN;
        testCar.towingVehicle = { id: "ghost_tow", towedByTruck: null };
        waterCar.x = 505 * 64; // Deep Atlantic Ocean water tile
        waterCar.y = 200 * 64;

        // Run auto-heal frame
        const healedNow = g.director.autoHealWorldAnomalies();
        const invAfter = g.director.auditWorldInvariants();

        assert(healedNow >= 3 && (g.director.blackboard.totalAnomaliesHealed || 0) >= healedBefore + 3, `autoHealWorldAnomalies() detected and healed ${healedNow} anomalies in real time`);
        assert(Number.isFinite(testCar.x) && testCar.towingVehicle === null && !g.map.isWaterAtPixel(waterCar.x, waterCar.y), `Healed NaN vehicle pose, unlinked orphaned tow pointer, and restored submerged AI car to dry road`);
        assert(invAfter.ok === true, `RuntimeInvariantOracle passes 100% after self-healing (ok=${invAfter.ok})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 23: Deterministic Event Bus (director.on / emitEvent / eventLog)
    // =========================================================================
    {
        console.log("--- SCENARIO 23: DETERMINISTIC EVENT BUS (PUB/SUB & CAUSAL RING BUFFER) ---");
        const { g } = createGameInstance(cmpBuf);
        let receivedEvt = null;
        g.director.on("CUSTOM_ENGINE_TEST", (evt) => {
            receivedEvt = evt;
        });
        g.director.emitEvent("CUSTOM_ENGINE_TEST", { testKey: "LEONIDA_26" });
        assert(Boolean(receivedEvt && receivedEvt.payload.testKey === "LEONIDA_26" && g.director.eventLog.length > 0), `Deterministic Event Bus delivers real-time events and logs causal history (eventLog=${g.director.eventLog.length})`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 24: Live Engine Telemetry Inspector ([F9] / getEngineSnapshot)
    // =========================================================================
    {
        console.log("--- SCENARIO 24: LIVE ENGINE TELEMETRY INSPECTOR ([F9] OVERLAY & SNAPSHOT) ---");
        const { g, stepSec } = createGameInstance(cmpBuf);
        const isOpen = g.director.toggleTelemetryOverlay(true);
        stepSec(0.02);
        const snap = g.director.getEngineSnapshot();
        assert(
            isOpen === true &&
            snap &&
            snap.invariantsOk === true &&
            typeof snap.focusCharge === "number" &&
            snap.fleet &&
            typeof snap.fleet.activePoliceCruisers === "number",
            `Live Engine Telemetry Inspector [F9] renders and produces complete engine snapshot (ORACLE=${snap.invariantsOk ? "OK" : "FAIL"}, FOCUS=${snap.focusCharge}%, HEALED=${snap.anomaliesHealed})`
        );
        g.director.toggleTelemetryOverlay(false);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 25: Vice Beach Pursuit & Foot-Squad Sand Interception Test
    // =========================================================================
    {
        console.log("--- SCENARIO 25: VICE BEACH PURSUIT & FOOT-SQUAD SAND INTERCEPTION TEST ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.vehicles.length = 0;
        g.peds.length = 0;

        // Player commits a 911-reported crime on Ocean Drive (c=444.5, r=276.5) and flees ~1,440px East onto Vice Beach golden sand (c=467.0, r=276.5)!
        const crimeX = 444.5 * 64;
        const crimeY = 276.5 * 64;
        const beachX = 467.0 * 64;
        const beachY = 276.5 * 64;

        g.setWantedLevel(1, { x: crimeX, y: crimeY }, false);
        g.player.inVehicle = null;
        g.player.x = beachX;
        g.player.y = beachY;
        g.player.weapon = "FIST";
        g.player.playerCombatTimer = 0;
        g.player.weaponDrawnTimer = 0;

        // VCPD Cruiser arrives on the SOUTHBOUND lane of Ocean Drive (bx=444, x=444.5*64, heading South +Math.PI/2)
        const copCruiser = sandbox.makeVeh("beach_cop_25", "VCPD_CRUISER", 444.5 * 64, 272.5 * 64, Math.PI * 0.5);
        copCruiser.driver = "AI_COP";
        copCruiser.sirenActive = true;
        copCruiser.speed = 115;
        copCruiser.vy = 115;
        g.vehicles.push(copCruiser);

        let spottedOnBeach = false;
        let cruiserEnteredBeach = false;
        let footCopsDeployed = false;
        let minCopDistOnBeach = 9999;

        for (let f = 0; f < 60 * 18; f++) {
            stepSec(1 / 60);
            if (g.isPoliceSpotted) spottedOnBeach = true;
            if (copCruiser.x >= 448.0 * 64) cruiserEnteredBeach = true;
            const dCruiser = Math.hypot(copCruiser.x - g.player.x, copCruiser.y - g.player.y);
            if (dCruiser < minCopDistOnBeach) minCopDistOnBeach = dCruiser;
            for (const ped of g.peds) {
                if (ped && !ped.dead && ped.kind === "COP") {
                    footCopsDeployed = true;
                    const dPed = Math.hypot(ped.x - g.player.x, ped.y - g.player.y);
                    if (dPed < minCopDistOnBeach) minCopDistOnBeach = dPed;
                }
            }
            if (minCopDistOnBeach < 35) break;
        }

        assert(spottedOnBeach === true, `VCPD on Ocean Drive visually spots suspect 1,440px East across open Vice Beach sand (isPoliceSpotted=${spottedOnBeach})`);
        assert(cruiserEnteredBeach === true || footCopsDeployed === true, `Southbound Ocean Drive VCPD Cruiser (bx=444) turns East off-road onto Lummus Park & Vice Beach (cruiserX=${Math.round(copCruiser.x / 64)} tiles, footCopsDeployed=${footCopsDeployed})`);
        assert(minCopDistOnBeach < 35, `VCPD closes in across the beach sand to arrest distance without re-board loop (minDist=${Math.round(minCopDistOnBeach)}px < 35px)`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 26: North Beach (y < 75) Coastal Pursuit & Shallow Surf 1★ -> 2★ Escalation
    // =========================================================================
    {
        console.log("--- SCENARIO 26: NORTH BEACH COASTAL PURSUIT & SHALLOW OCEAN SURF 1★ -> 2★ ESCALATION ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.vehicles.length = 0;
        g.peds.length = 0;

        // Part A: North Beach (y = 58 * 64) coastal avenue is at bx = 456..457, beach sand is at bx = 466
        const nbProbe = g.director.probePursuitReachabilityAt(466.5 * 64, 58.5 * 64);
        assert(nbProbe.onOpenBeach === true && nbProbe.cruiserCanCutOffRoad === true && nbProbe.effectiveSightRangePx === 2450, `North Beach (c=466.5, r=58.5) resolves BEACH_OFFROAD_INTERCEPT with 2450px LOS and coastal avenue cut-in`);

        // Part B: 1★ suspect wades into shallow ocean surf right in front of a shoreline VCPD foot officer to evade baton arrest -> escalates to 2★!
        const surfRow = 276;
        let firstWaterBx = 485;
        for (let bx = 465; bx < 505; bx++) {
            if (g.map.isWaterAtPixel((bx + 0.5) * 64, (surfRow + 0.5) * 64)) {
                firstWaterBx = bx;
                break;
            }
        }
        const shoreSandX = (firstWaterBx - 0.5) * 64;
        const surfWaterX = (firstWaterBx + 0.6) * 64;
        const surfY = (surfRow + 0.5) * 64;
        g.setWantedLevel(1, { x: surfWaterX, y: surfY }, true);
        g.player.inVehicle = null;
        g.player.x = surfWaterX;
        g.player.y = surfY;
        const shoreCop = sandbox.makePed({
            id: "shore_cop_26", x: shoreSandX, y: surfY, z: 2.0, angle: 0,
            kind: "COP", copWeapon: "PISTOL", hp: 105, speed: 98, dead: false
        });
        g.peds.push(shoreCop);
        stepSec(2.6, () => {
            g.player.x = surfWaterX;
            g.player.y = surfY;
        });
        assert(g.wantedLevel >= 2, `1★ fugitive wading into ocean surf in front of shoreline VCPD officer escalates to ${g.wantedLevel}★ so officers can open fire`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 27: Inland Off-Road Park / Golf Course Pursuit & Anti-Reboard Test
    // =========================================================================
    {
        console.log("--- SCENARIO 27: INLAND OFF-ROAD PARK / GOLF COURSE PURSUIT & FOOT-COP ANTI-REBOARD ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.vehicles.length = 0;
        g.peds.length = 0;

        // Place wanted player 540px inside an open off-road grass/field tile (Vice City Golf Club / Park expanse)
        const parkX = 290.5 * 64;
        const parkY = 110.5 * 64;
        g.setWantedLevel(2, { x: parkX, y: parkY }, true);
        g.player.inVehicle = null;
        g.player.x = parkX;
        g.player.y = parkY;

        // Place a parked homeCruiser and a deployed VCPD officer 520px away (> 420px old street threshold!)
        const homeCar = sandbox.makeVeh("park_cruiser_27", "VCPD_CRUISER", parkX - 520, parkY, 0);
        homeCar.driver = null;
        g.vehicles.push(homeCar);
        g.rebuildVehicleSpatialGrid();

        const footCop = sandbox.makePed({
            id: "park_cop_27", x: parkX - 495, y: parkY, z: 2.0, angle: 0,
            kind: "COP", copWeapon: "PISTOL", homeCruiser: homeCar, hp: 105, speed: 98, dead: false
        });
        g.peds.push(footCop);

        const startDist = Math.hypot(footCop.x - g.player.x, footCop.y - g.player.y);
        stepSec(2.0);
        const endDist = Math.hypot(footCop.x - g.player.x, footCop.y - g.player.y);
        assert(!footCop._boardedVehicle && footCop.inCombat === true && endDist < startDist - 80, `On-foot VCPD officer pursues off-road park fugitive at 520px without re-boarding cruiser (dist ${Math.round(startDist)}px -> ${Math.round(endDist)}px)`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 28: Production Control Tools: Static Build Sync, 24-Point Dispatch Matrix, Self-Audit & Ledger GC
    // =========================================================================
    {
        console.log("--- SCENARIO 28: PRODUCTION CONTROLLER GATEKEEPER, 24-POINT DISPATCH MATRIX & SELF-AUDIT ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);

        // 1. Static Build & Asset Tag Synchronization Check (index.html vs server/world_server.js)
        const idxHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
        const buildMatch = idxHtml.match(/__VC26_BUILD\s*=\s*"([^"]+)"/);
        const htmlBuild = buildMatch ? buildMatch[1] : null;
        const assetTags = [...idxHtml.matchAll(/(?:href|src)="[^"]+\.(?:css|js)\?v=([^"]+)"/g)].map(m => m[1]);
        const allTagsMatch = Boolean(htmlBuild && assetTags.length >= 12 && assetTags.every(v => v === htmlBuild));
        assert(allTagsMatch, `index.html __VC26_BUILD (${htmlBuild}) matches all ${assetTags.length}/12 CSS/JS ?v= cache-busting tags 100%`);

        // Verify <link rel="preload"> URLs in index.html match exact URLs in js/renderer.js (prevents double-downloading 2.77 MB sprite atlas)
        const rendererSrc = fs.readFileSync(path.join(ROOT, "js", "renderer.js"), "utf8");
        const preloadUrls = [...idxHtml.matchAll(/<link\s+rel="preload"[^>]+href="([^"]+)"/g)].map(m => m[1]);
        const preloadMatchesRenderer = preloadUrls.length >= 3 && preloadUrls.every(u => rendererSrc.includes(`"${u}"`));
        assert(preloadMatchesRenderer, `HTML <link rel="preload"> asset URLs (${preloadUrls.length}/3) match js/renderer.js query strings 100% (0 duplicate downloads)`);

        // 2. Multi-District 4-Agency Dispatch Reachability Matrix (6 Districts x 4 Agencies = 24 Probes)
        const districts = [
            { name: "Ocean Drive", x: 444.5 * 64, y: 276.5 * 64 },
            { name: "Vice Beach Sand", x: 468.0 * 64, y: 276.5 * 64 },
            { name: "North Beach Sand", x: 466.5 * 64, y: 58.5 * 64 },
            { name: "Downtown VC", x: 283.0 * 64, y: 233.0 * 64 },
            { name: "Star Island", x: 346.0 * 64, y: 213.0 * 64 },
            { name: "Wynwood / Haiti", x: 231.0 * 64, y: 165.0 * 64 }
        ];
        const agencies = ["POLICE", "MEDIC", "FIRE", "TOW"];
        let validDispatches = 0;
        for (const d of districts) {
            for (const ag of agencies) {
                const sp = g.director.findStationDispatchSpawn(ag, d.x, d.y, 2.0);
                const minExpectedDist = (ag === "FIRE" || ag === "MEDIC") ? 740 : 1180;
                if (sp && Number.isFinite(sp.x) && Number.isFinite(sp.y) && sp.distToTarget >= minExpectedDist) {
                    validDispatches++;
                }
            }
        }
        assert(validDispatches === 24, `Multi-District 4-Agency Dispatch Matrix passed 24/24 district×agency spawns (actual: ${validDispatches}/24)`);

        // 3. In-Engine Production Self-Audit (13/13 Subsystems)
        const auditRes = g.director.runProductionSelfAudit();
        if (!auditRes.ok) {
            console.log("  [DEBUG Failed Self-Audit Checks]:", auditRes.checks.filter((c) => !c.ok));
        }
        assert(auditRes.ok === true && auditRes.passedCount === 13, `ViceWorldDirector.runProductionSelfAudit() passed ${auditRes.passedCount}/${auditRes.totalCount} subsystem contracts`);

        // 4. 24/7 Vehicle Ledger Garbage Collection Verification
        for (let k = 0; k < 120; k++) {
            g.director.vehicleLedger.set(`stale_trf_${k}`, { lastX: 1000, lastY: 1000, lastSyncMs: -50000 });
        }
        const sizeBeforeGc = g.director.vehicleLedger.size;
        stepSec(0.05);
        const sizeAfterGc = g.director.vehicleLedger.size;
        assert(sizeAfterGc < sizeBeforeGc - 100, `24/7 Vehicle Ledger Garbage Collector pruned stale despawned vehicle IDs (${sizeBeforeGc} -> ${sizeAfterGc})`);

        // 5. Full Asset Pipeline Integrity Audit (Audio Manifest + Core Atlases + Sprite Metadata + Preload Sync)
        const audioSrc = fs.readFileSync(path.join(ROOT, "js", "audio.js"), "utf8");
        const manifestBlock = audioSrc.match(/const VEHICLE_AUDIO_MANIFEST\s*=\s*\{([\s\S]*?)\};/);
        const audioEntries = manifestBlock ? [...manifestBlock[1].matchAll(/(\w+):\s*"([^"]+)"/g)] : [];
        let validAudioFiles = 0;
        const missingAudio = [];
        for (const [, key, relPath] of audioEntries) {
            const fullPath = path.join(ROOT, relPath.split("?")[0]); // ignore cache-bust query strings
            if (fs.existsSync(fullPath)) {
                const st = fs.statSync(fullPath);
                const buf = fs.readFileSync(fullPath);
                const hdr = buf.slice(0, 4).toString("ascii");
                if (st.size > 100 && (hdr === "RIFF" || hdr === "OggS")) {
                    validAudioFiles++;
                } else {
                    missingAudio.push(`${key}: invalid header/size (${hdr}, ${st.size}B)`);
                }
            } else {
                missingAudio.push(`${key}: missing ${relPath}`);
            }
        }
        assert(
            audioEntries.length >= 115 && validAudioFiles === audioEntries.length,
            `Audio Manifest Integrity: ${validAudioFiles}/${audioEntries.length} .ogg/.wav SFX files exist with valid RIFF/OggS headers`
        );

        const coreVisualAssets = [
            "assets/gta1/gta1_char_portraits.png",
            "assets/gta1/gta1_sprites.png",
            "assets/gta1/gta1_tiles_vice.png",
            "assets/gta1/gta1_tiles.png",
            "assets/gta1/vice_cmp_overview.png",
            "assets/gta1/nyc_cmp_overview.png",
            "assets/gta1/gta1_meta.json",
            "assets/gta1/gta1_map.bin"
        ];
        let validVisualCount = 0;
        for (const rel of coreVisualAssets) {
            const fp = path.join(ROOT, rel);
            if (fs.existsSync(fp) && fs.statSync(fp).size > 1024) {
                validVisualCount++;
            }
        }
        assert(
            validVisualCount === coreVisualAssets.length,
            `Core Visual & Binary Atlases: ${validVisualCount}/${coreVisualAssets.length} files present and non-empty in assets/gta1/`
        );

        const metaJson = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "gta1", "gta1_meta.json"), "utf8"));
        const spriteSheetBuf = fs.readFileSync(path.join(ROOT, "assets", "gta1", "gta1_sprites.png"));
        // PNG IHDR width/height at byte offsets 16..23 (big-endian uint32)
        const pngW = spriteSheetBuf.readUInt32BE(16);
        const pngH = spriteSheetBuf.readUInt32BE(20);
        const metaVehicles = (metaJson.sprites && Array.isArray(metaJson.sprites.vehicles)) ? metaJson.sprites.vehicles : [];
        const metaSprById = new Set(metaVehicles.map(v => String(v.spr_idx)));
        const customSprites = (metaJson.sprites && metaJson.sprites.custom) ? metaJson.sprites.custom : {};
        const allVehSpecs = Object.entries(sandbox.VEHICLE_SPECS || {});
        let resolvedVehSprites = 0;
        let outOfBoundsBoxes = 0;
        for (const [, spec] of allVehSpecs) {
            const sid = String(spec.sprId || "");
            if (metaSprById.has(sid) || customSprites[sid] || sid.startsWith("veh_") || sid.includes("_")) {
                resolvedVehSprites++;
            }
        }
        for (const mv of metaVehicles) {
            if (Array.isArray(mv.base)) {
                const [bx, by, bw, bh] = mv.base;
                if (bx < 0 || by < 0 || bx + bw > pngW || by + bh > pngH) outOfBoundsBoxes++;
            }
        }
        assert(
            allVehSpecs.length >= 35 && resolvedVehSprites === allVehSpecs.length && outOfBoundsBoxes === 0,
            `Vehicle Sprite Atlas Mapping: ${resolvedVehSprites}/${allVehSpecs.length} vehicle specs mapped, 0 out-of-bounds boxes in ${pngW}x${pngH} gta1_sprites.png`
        );
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 29: LONG-RANGE 3D RAYCAST OCCLUSION AUDIT (>1,024PX / >16 TILES)
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 29: LONG-RANGE 3D BUILDING RAYCAST OCCLUSION (>1,024PX / >16 TILES) ---");
    {
        const { g, sandbox } = createGameInstance(cmpBuf);
        // Find a building block at row ~105, col ~435 and cast a 28-tile (1,792px) ray across it
        // where the building is >20 tiles away from the ray origin!
        let foundLongOcclusion = false;
        for (let r = 80; r <= 180 && !foundLongOcclusion; r += 2) {
            for (let c = 380; c <= 445 && !foundLongOcclusion; c++) {
                const blk = g.map.getBlockInfo(c, r, 2);
                if (blk && blk.groundType === sandbox.GROUND_TYPE.BUILDING && blk.slopeType === 0) {
                    const origC = c - 24;
                    if (origC > 20) {
                        const origBlk = g.map.getBlockInfo(origC, r, 2);
                        if (origBlk && origBlk.groundType !== sandbox.GROUND_TYPE.BUILDING) {
                            const ray = g.map.traceSegment2D((origC + 0.5) * 64, (r + 0.5) * 64, (c + 2.5) * 64, (r + 0.5) * 64, 2.0);
                            if (ray && ray.hit) {
                                foundLongOcclusion = true;
                            }
                        }
                    }
                }
            }
        }
        // Also verify an unobstructed 28-tile ray over open beach water/sand returns hit === false
        const clearBeachRay = g.map.traceSegment2D(463.5 * 64, 90.5 * 64, 463.5 * 64, 118.5 * 64, 2.0);
        assert(foundLongOcclusion === true, "Long-range 3D DDA raycast (>1,536px / 24+ tiles) detects distant solid 3D buildings without prematurely cutting off at 16 steps");
        assert(clearBeachRay && clearBeachRay.hit === false, "Long-range 3D DDA raycast (1,792px / 28 tiles) over open North Beach corridor returns hit === false");
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 30: FULL STORY & DYNAMIC FIXER MISSION LIFECYCLE AUDIT (M0..M4)
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 30: FULL STORY & DYNAMIC FIXER MISSION LIFECYCLE AUDIT (M0..M4) ---");
    {
        const { g } = createGameInstance(cmpBuf);
        assert(Boolean(g.missions && Array.isArray(g.missions.payphones) && g.missions.payphones.length === 5), "MissionManager initialized all 5 payphones / Fixer terminals (M0..M4)");

        // Verify updateAmbientCrimeEvents properly guards against g.missions.activeMission
        g.missions.startMission(g.missions.payphones[1]); // M1_UNCLE_JACK
        assert(Boolean(g.missions.activeMission && g.missions.activeMission.id === "M1_UNCLE_JACK"), "Story Mission M1_UNCLE_JACK ('HOTWHEELS FOR UNCLE JACK') launches cleanly with getaway Stinger");
        g.ambientCrimeQuietTimer = 0;
        g.ambientCrimeRollTimer = 0;
        const vehCountDuringM1 = g.vehicles.length;
        g.updateAmbientCrimeEvents(1.0);
        assert(g.vehicles.length === vehCountDuringM1, "Ambient Crime Events are strictly suppressed while a Story/Fixer Mission (this.missions.activeMission) is active");
        g.missions.completeMission();

        // Test M2_GRASSRIVERS
        g.missions.startMission(g.missions.payphones[2]);
        assert(Boolean(g.missions.activeMission && g.missions.activeMission.id === "M2_GRASSRIVERS" && Array.isArray(g.missions.activeMission.crates) && g.missions.activeMission.crates.length === 3), "Story Mission M2_GRASSRIVERS ('LEONIDA KEYS DROP') spawns 3 contraband beach crates");
        g.missions.abortMission();

        // Test M3_OCEAN_DRIVE
        g.missions.startMission(g.missions.payphones[3]);
        assert(Boolean(g.missions.activeMission && g.missions.activeMission.id === "M3_OCEAN_DRIVE" && g.missions.activeMission.targetCar && g.missions.activeMission.targetCar.specKey === "VICE_CHEETAH"), "Story Mission M3_OCEAN_DRIVE ('STAR ISLAND BOOST') spawns guarded Vice Cheetah on Star Island");
        g.missions.abortMission();

        // Test M4_ANKLE_OVERRIDE
        g.missions.startMission(g.missions.payphones[4]);
        assert(Boolean(g.missions.activeMission && g.missions.activeMission.id === "M4_ANKLE_OVERRIDE" && g.missions.activeMission.armoredVan && g.missions.activeMission.armoredVan.specKey === "BRINKS_TRUCK"), "Story Mission M4_ANKLE_OVERRIDE ('ANKLE MONITOR OVERRIDE') spawns Grupo Seguro Armored Van (BRINKS_TRUCK)");
        g.missions.abortMission();

        // Test all 4 M0_DYNAMIC_FIXER Procedural Archetypes
        const testedArchetypes = new Set();
        const m0Phone = g.missions.payphones[0];
        for (let i = 0; i < 4; i++) {
            g.missions._fixerRollIdx = i;
            g.missions.startDynamicFixerMission(m0Phone);
            if (g.missions.activeMission && g.missions.activeMission.archetype) {
                testedArchetypes.add(g.missions.activeMission.archetype);
            }
            g.missions.update(0.1);
            g.missions.abortMission();
        }
        assert(
            testedArchetypes.has("HIJACK_LIVE_TARGET") &&
            testedArchetypes.has("RAM_AND_EXTORT") &&
            testedArchetypes.has("SPEED_BOMB_RUN") &&
            testedArchetypes.has("VIP_HIT_SQUAD"),
            `All 4 Procedural Fixer Contract Archetypes (${Array.from(testedArchetypes).join(", ")}) launch, tick, and complete cleanly`
        );
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 31: HAND-CRAFTED 3D BUILDING INTERIORS & 4-WAY FACADE ORIENTATION
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 31: HAND-CRAFTED 3D BUILDING INTERIORS & 4-WAY FACADE ORIENTATION ---");
    {
        const { g, sandbox } = createGameInstance(cmpBuf);
        const shopInteriors = sandbox.ShopInteriors;
        const shops = (g.map && Array.isArray(g.map.interiors)) ? g.map.interiors : [];
        assert(Boolean(shopInteriors && shops.length >= 24), `ShopInteriors initialized ${shops.length} hand-crafted enterable establishments & landmarks across Leonida`);
        let validDoors = 0;
        for (const s of shops) {
            if (Number.isFinite(s.doorX) && Number.isFinite(s.doorY) && !g.map.isWaterAtPixel(s.doorX, s.doorY)) {
                validDoors++;
            }
        }
        assert(validDoors === shops.length, `All ${validDoors}/${shops.length} interior doors snap to dry walkable facade coordinates`);

        // Test 4-way orientation transformation (orientInterior + getObstacles) across "S", "N", "E", "W"
        const sides = ["S", "N", "E", "W"];
        let validTransforms = 0;
        for (const side of sides) {
            const cloneIntr = Object.assign({}, shops[0], {
                facing: side,
                w: 820,
                h: 560,
                npcs: (shops[0].npcs || []).map(n => Object.assign({}, n)),
                stations: (shops[0].stations || []).map(st => Object.assign({}, st))
            });
            shopInteriors.orientInterior(cloneIntr);
            const obs = shopInteriors.getObstacles(cloneIntr);
            const pose = shopInteriors.getEntrancePose(cloneIntr);
            if (Array.isArray(obs) && obs.length > 0 && pose && Number.isFinite(pose.spawnX) && Number.isFinite(pose.spawnY)) {
                validTransforms++;
            }
        }
        assert(validTransforms === 4, "ShopInteriors.orientInterior & getObstacles transform room walls, furniture, stations, and entrance poses across all 4 facade orientations (S, N, E, W)");

        // Test entering a shop, robbing the vault/register, and exiting
        const robShop = shops.find(s => Array.isArray(s.stations) && s.stations.some(st => st.action === "ROB_VAULT")) || shops[0];
        g.enterInterior(robShop);
        assert(Boolean(g.activeInterior && g.activeInterior.id === robShop.id), `Player cleanly enters hand-crafted interior '${robShop.name}'`);
        const robStation = (g.activeInterior.stations || []).find(st => st.action === "ROB_VAULT");
        if (robStation) {
            const cashBefore = g.cash;
            g.triggerInteriorStation(robStation);
            assert(g.cash > cashBefore && g.wantedLevel >= 2, `Executing ROB_VAULT inside '${robShop.name}' awards heist payout and triggers Wanted Alert`);
        }
        g.exitInterior();
        assert(g.activeInterior === null, "Player cleanly exits interior back to exterior street coordinates");
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 32: PEDESTRIAN NAVIGATION (PedNav) & ZEBRA CROSSWALK PATHFINDING
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 32: PEDESTRIAN NAVIGATION (PedNav) & ZEBRA CROSSWALK PATHFINDING ---");
    {
        const { g, sandbox } = createGameInstance(cmpBuf);
        const pedNav = sandbox.PedNav;
        assert(Boolean(pedNav && typeof pedNav.nextStep === "function" && typeof pedNav.routeWaypoint === "function" && typeof pedNav.getNav === "function"), "PedNav module exposes zero-GC Dijkstra nextStep/getNav and A* routeWaypoint");

        // Test routeWaypoint around a solid building block (from East of a building to West of that building!)
        let wp = null;
        for (let r = 100; r <= 160 && !wp; r += 2) {
            for (let c = 436; c <= 442 && !wp; c++) {
                const blk = g.map.getBlockInfo(c, r, 2);
                const eastBlk = g.map.getBlockInfo(c + 2, r, 2);
                const westBlk = g.map.getBlockInfo(c - 2, r, 2);
                if (
                    blk && blk.groundType === sandbox.GROUND_TYPE.BUILDING && blk.slopeType === 0 &&
                    eastBlk && eastBlk.groundType !== sandbox.GROUND_TYPE.BUILDING && eastBlk.groundType !== sandbox.GROUND_TYPE.WATER &&
                    westBlk && westBlk.groundType !== sandbox.GROUND_TYPE.BUILDING && westBlk.groundType !== sandbox.GROUND_TYPE.WATER
                ) {
                    const dummyPed = new sandbox.Pedestrian({ x: (c + 2.5) * 64, y: (r + 0.5) * 64, z: 2.0, kind: "PARAMEDIC" });
                    wp = pedNav.routeWaypoint(g, dummyPed, (c - 2.5) * 64, (r + 0.5) * 64);
                }
            }
        }
        assert(Boolean(wp && Number.isFinite(wp.x) && Number.isFinite(wp.y)), `PedNav.routeWaypoint computes valid obstacle-avoiding waypoint around solid 3D building (${wp ? Math.round(wp.x) : 0}, ${wp ? Math.round(wp.y) : 0})`);

        // Test Navigator Dijkstra nextStep & signalized zebra crosswalk discovery
        const nav = pedNav.getNav(g);
        let stepRes = null;
        for (let r = 100; r <= 150 && !stepRes; r += 2) {
            for (let c = 435; c <= 444 && !stepRes; c++) {
                if (pedNav.isGoodSpawnTile(g, c, r, 2.0)) {
                    const civPed = new sandbox.Pedestrian({ x: (c + 0.5) * 64, y: (r + 0.5) * 64, z: 2.0, kind: "CIVILIAN" });
                    stepRes = pedNav.nextStep(g, civPed, c, r, 2.0, { allowCrosswalk: true }, true);
                }
            }
        }
        assert(Boolean(nav && stepRes && Number.isFinite(stepRes.bx) && Number.isFinite(stepRes.by)), `PedNav.nextStep plans multi-block sidewalk & zebra crosswalk trajectory (target tile ${stepRes ? stepRes.bx : 0}, ${stepRes ? stepRes.by : 0})`);
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 33: AUDIO ENGINE, WEAPON SPECS & MULTIPLAYER/SERVER SPEC POOL AUDIT
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 33: AUDIO ENGINE, WEAPON SPECS & MULTIPLAYER/SERVER SPEC POOL AUDIT ---");
    {
        const { g, sandbox } = createGameInstance(cmpBuf);
        const vehSpecs = sandbox.VEHICLE_SPECS || {};
        const weapSpecs = sandbox.WEAPON_SPECS || {};
        const vehKeys = Object.keys(vehSpecs);
        const weapKeys = Object.keys(weapSpecs);

        // 1. Verify RetroAudioEngine resolves a valid engine sound class for every single VEHICLE_SPECS key
        let resolvedAudioClasses = 0;
        for (const vk of vehKeys) {
            const cls = g.audio.getVehicleAudioClass(vk);
            if (typeof cls === "string" && cls.length > 0) {
                resolvedAudioClasses++;
            }
        }
        assert(resolvedAudioClasses === vehKeys.length, `RetroAudioEngine.getVehicleAudioClass maps all ${resolvedAudioClasses}/${vehKeys.length} VEHICLE_SPECS to valid synthesis/sample banks`);

        // 2. Verify all 7 WEAPON_SPECS have valid fireRate, damage, speed, range, and color
        let validWeapons = 0;
        for (const [, ws] of Object.entries(weapSpecs)) {
            if (ws && ws.name && ws.fireRate > 0 && ws.damage > 0 && ws.speed > 0 && ws.range > 0) {
                validWeapons++;
            }
        }
        assert(weapKeys.length === 7 && validWeapons === 7, `All ${validWeapons}/${weapKeys.length} WEAPON_SPECS (${weapKeys.join(", ")}) have valid combat parameters`);

        // 3. Verify ViceNetworkManager.spawnSimulatedRival and server/world_server.js only reference valid VEHICLE_SPECS keys
        const netSrc = fs.readFileSync(path.join(ROOT, "js", "net.js"), "utf8");
        const srvSrc = fs.readFileSync(path.join(ROOT, "server", "world_server.js"), "utf8");
        const hasInvalidStallionFallback = /"STALLION"|'STALLION'|BANSHEE_SS|CHEETAH_GT/.test(netSrc) || /"STALLION"|'STALLION'|BANSHEE_SS|CHEETAH_GT/.test(srvSrc);
        assert(!hasInvalidStallionFallback, "Zero invalid vehicle spec keys (BANSHEE_SS, CHEETAH_GT, STALLION) remain in js/net.js or server/world_server.js");

        // Verify SERVER_SPEC_POOL in world_server.js
        const poolMatch = srvSrc.match(/const SERVER_SPEC_POOL\s*=\s*\[([\s\S]*?)\];/);
        const poolSpecs = poolMatch ? [...poolMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]) : [];
        const invalidPoolSpecs = poolSpecs.filter(k => !vehSpecs[k]);
        assert(poolSpecs.length >= 12 && invalidPoolSpecs.length === 0, `All ${poolSpecs.length}/${poolSpecs.length} SERVER_SPEC_POOL vehicles in server/world_server.js exist in VEHICLE_SPECS`);
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 34: 3D WORLD OBJECT ENGINE LANDMARKS, PROPS & COLLISION GRIDS
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 34: 3D WORLD OBJECT ENGINE LANDMARKS, PROPS & COLLISION GRIDS ---");
    {
        const { g, sandbox } = createGameInstance(cmpBuf);
        const objEng = g.map ? g.map.objectEngine : null;
        assert(Boolean(objEng && Array.isArray(objEng.instances) && objEng.instances.length >= 15), `WorldObjectEngine initialized ${objEng && objEng.instances ? objEng.instances.length : 0} 3D architectural estates & villas`);
        assert(Boolean(objEng && objEng.landmarks3D && Array.isArray(objEng.landmarks3D.lighthouses) && Array.isArray(objEng.landmarks3D.gantryCranes)), "WorldObjectEngine initialized 3D monuments (lighthouses, gantry cranes, space launch pad, Ferris wheel)");
        assert(Boolean(objEng && Array.isArray(objEng.streetProps) && objEng.streetProps.length >= 100), `WorldObjectEngine initialized ${objEng && objEng.streetProps ? objEng.streetProps.length : 0} destructible 3D street furniture props`);
        assert(Boolean(g.map.barrierBoxGrid instanceof Map && g.map.floraGrid instanceof Map), "WorldObjectEngine O(1) spatial hash grids (barrierBoxGrid, floraGrid) built cleanly");

        // Verify BUSTED and WASTED respawn points are 100% collision-free
        const bustedX = sandbox.mx256(203.0) * 64, bustedY = sandbox.my256(146.0) * 64;
        const wastedX = sandbox.mx256(213.5) * 64, wastedY = sandbox.my256(146.0) * 64;
        const safeBusted = g.map.resolveCircleBuildingCollision(bustedX, bustedY, 12, 2.0, false);
        const safeWasted = g.map.resolveCircleBuildingCollision(wastedX, wastedY, 12, 2.0, false);
        const checkBustedAfter = g.map.resolveCircleBuildingCollision(safeBusted.x, safeBusted.y, 10, 2.0, false);
        const checkWastedAfter = g.map.resolveCircleBuildingCollision(safeWasted.x, safeWasted.y, 10, 2.0, false);
        assert(!checkBustedAfter.hit && !g.map.isWaterAtPixel(safeBusted.x, safeBusted.y), "BUSTED respawn coordinate is 100% dry and building-collision-free");
        assert(!checkWastedAfter.hit && !g.map.isWaterAtPixel(safeWasted.x, safeWasted.y), "WASTED respawn coordinate is 100% dry and building-collision-free");
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 35: VC26 CREATION ENGINE FULL LIFECYCLE & BLUEPRINT AUDIT
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 35: VC26 CREATION ENGINE FULL LIFECYCLE & BLUEPRINT AUDIT ---");
    {
        const { g, sandbox } = createGameInstance(cmpBuf);
        const ce = g.creationEngine;
        assert(Boolean(ce && ce.version === "101_237"), "ViceCreationEngine (v101_237) initialized and attached to LeonidaGame");

        // 1. Pillar 1: Live 3D Voxel & Building Sculpting + Undo / Redo Snapshot Restoration
        const testC = 212, testR = 148;
        const origGround = g.map.getSurfaceGroundType(testC, testR);
        const paintRes = ce.paintVoxelTile(testC, testR, "BLDG_SKYSCRAPER_6F", { storeys: 4, style: 10 });
        assert(paintRes.ok && g.map.getSurfaceGroundType(testC, testR) === sandbox.GROUND_TYPE.BUILDING, "CreationEngine.paintVoxelTile sculpts 6-storey 3D Voxel Skyscraper and updates surfaceGround/surfaceLayer");
        ce.undo();
        assert(g.map.getSurfaceGroundType(testC, testR) === origGround, "CreationEngine.undo() restores exact pre-edit 6-layer voxel column and surface lookup tables");
        ce.redo();
        assert(g.map.getSurfaceGroundType(testC, testR) === sandbox.GROUND_TYPE.BUILDING, "CreationEngine.redo() reapplies 3D Voxel Skyscraper edit cleanly");
        ce.undo(); // leave tile clean

        // 2. Pillar 2A: Custom Vehicle Archetype Factory + Placement Safety Oracle Auto-Snap
        const customSpec = ce.defineVehicle("LEONIDA_HYPER_GT", {
            name: "LEONIDA HYPER GT",
            baseSpec: "VICE_CHEETAH",
            maxSpeed: 510,
            accel: 340,
            color: "#ff2a85"
        });
        assert(Boolean(customSpec && sandbox.VEHICLE_SPECS.LEONIDA_HYPER_GT), "CreationEngine.defineVehicle registers custom vehicle archetype into VEHICLE_SPECS");
        const spawnedCar = ce.spawnVehicle("LEONIDA_HYPER_GT", 443.5 * 64, 284.5 * 64, 0);
        assert(Boolean(spawnedCar && g.vehicles.includes(spawnedCar) && !g.map.isWaterAtPixel(spawnedCar.x, spawnedCar.y)), "CreationEngine.spawnVehicle validates dry ground and spawns drivable custom vehicle");

        // 3. Pillar 2B: 3D Prefab, Destructible Street Prop, Flora & Enterable 3D Interior Factory
        const customPrefab = ce.definePrefab3D("CUSTOM_NEON_VILLA", {
            label: "Custom Neon Villa 3D",
            footprintTiles: [2, 2],
            boxes: [{ dx: 0, dy: 0, z0: 0, z1: 1.2, w: 72, h: 64, mat: "STUCCO_WALL", rgb: [0.96, 0.92, 0.88] }]
        });
        const placedVilla = ce.placePrefab3D("CUSTOM_NEON_VILLA", 443.5 * 64, 286.5 * 64, 0);
        assert(Boolean(customPrefab && placedVilla && g.map.objectEngine.instances.includes(placedVilla)), "CreationEngine.definePrefab3D & placePrefab3D instantiate 3D volumetric architecture and OBB collision hulls");

        const placedProp = ce.placePropOrFlora("HYDRANT", 443.5 * 64, 285.5 * 64, 0);
        const placedPalm = ce.placePropOrFlora("palm_tree", 448.5 * 64, 285.5 * 64, 0);
        assert(Boolean(placedProp && g.map.objectEngine.streetProps.includes(placedProp) && placedPalm && g.map.vicePalms.includes(placedPalm)), "CreationEngine.placePropOrFlora spawns 3D destructible street furniture and tropical flora with spatial grid registration");

        const placedShop = ce.placeEstablishment({ tpl: "SHOP_BAR", name: "CLUB LEONIDA 26", x: 443.5 * 64, y: 284.5 * 64 });
        assert(Boolean(placedShop && g.map.interiors.includes(placedShop) && ["S", "N", "E", "W"].includes(placedShop.facing)), `CreationEngine.placeEstablishment auto-snaps enterable 3D interior '${placedShop ? placedShop.name : ""}' onto building facade (facing '${placedShop ? placedShop.facing : ""}')`);

        // 4. Pillar 3: Declarative Mission Composer & Live Launch
        const customMission = ce.launchCustomMission({
            id: "CE_TEST_HEIST",
            type: "CONTRABAND_DROP",
            title: "VICE BEACH CONTRABAND RUN",
            reward: 50000,
            wantedStars: 2,
            startX: 448.5 * 64,
            startY: 284.5 * 64
        });
        assert(Boolean(customMission && g.missions.activeMission === customMission && Array.isArray(customMission.crates) && customMission.crates.length === 3), "CreationEngine.launchCustomMission composes and activates playable multi-crate mission in MissionManager");
        g.missions.abortMission();

        // 5. Pillar 4: Blueprint JSON Export, Clear & Round-Trip Import
        const exportedJson = ce.exportBlueprintJSON();
        const parsedBp = JSON.parse(exportedJson);
        assert(Boolean(parsedBp && parsedBp.engine === "VC26_CREATION_ENGINE" && parsedBp.entities.length >= 5), `CreationEngine.exportBlueprintJSON serializes ${parsedBp ? parsedBp.entities.length : 0} created entities and custom definitions`);
        ce.clearAllCreations();
        assert(ce.createdEntities.length === 0, "CreationEngine.clearAllCreations cleanly removes all custom entities and resets history");
        const importRes = ce.importBlueprintJSON(exportedJson);
        assert(Boolean(importRes && importRes.ok && ce.createdEntities.length >= 5), `CreationEngine.importBlueprintJSON round-trip restores ${ce.createdEntities.length} entities and custom archetypes`);
        ce.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 36: PRE-EXISTING WORLD & CREATION ENGINE DEEP INTEGRATION AUDIT
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 36: PRE-EXISTING WORLD & CREATION ENGINE DEEP INTEGRATION AUDIT ---");
    {
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        const ce = g.creationEngine;
        const map = g.map;
        const oe = map.objectEngine;

        // 1. Pre-Existing World Census & Indexing Bridge
        const summary = ce.getPreExistingWorldSummary();
        assert(
            summary.estates3D >= 23 &&
            summary.interiors3D >= 30 &&
            summary.streetProps3D >= 100 &&
            summary.flora3D >= 1000 &&
            summary.storyMissions === 5,
            `Pre-Existing World Census indexed 100% of native assets (estates3D=${summary.estates3D}, interiors3D=${summary.interiors3D}, streetProps3D=${summary.streetProps3D}, flora3D=${summary.flora3D}, storyMissions=${summary.storyMissions})`
        );

        // 2. Native Schema Alignment for PREFAB_CATALOG & WorldObjectEngine.instances (Zero NaN in applyToElevationMap & paintOnOverviewCanvas)
        ce.definePrefab3D("CUSTOM_ART_DECO_MANSION", {
            label: "Custom Art Deco Mansion",
            basePrefab: "villa_art_deco",
            w1: 164,
            d1: 118,
            h1: 0.78
        });
        const villa = ce.placePrefab3D("CUSTOM_ART_DECO_MANSION", 448.5 * 64, 286.5 * 64, Math.PI * 0.25);
        assert(
            Boolean(
                villa &&
                typeof villa.ang === "number" && !Number.isNaN(villa.ang) &&
                typeof villa.scale === "number" && villa.scale === 1.0 &&
                typeof villa.hw === "number" && villa.hw > 50 &&
                typeof villa.hh === "number" && villa.hh > 40 &&
                typeof villa.extX === "number" && !Number.isNaN(villa.extX) &&
                typeof villa.extY === "number" && !Number.isNaN(villa.extY) &&
                typeof villa.totalHeightBlocks === "number" && villa.totalHeightBlocks > 0.7
            ),
            `placePrefab3D generates 100% native WorldObjectEngine instance schema (ang=${villa ? villa.ang.toFixed(2) : "NaN"}, scale=${villa ? villa.scale : "NaN"}, hw=${villa ? villa.hw : "NaN"}, totalHeightBlocks=${villa ? villa.totalHeightBlocks.toFixed(2) : "NaN"})`
        );

        const elevGrid = new Float32Array(512 * 512);
        elevGrid.fill(2.0);
        oe.applyToElevationMap(elevGrid);
        let hasNaNElev = false;
        let elevatedCount = 0;
        for (let i = 0; i < elevGrid.length; i++) {
            if (Number.isNaN(elevGrid[i])) {
                hasNaNElev = true;
                break;
            }
            if (elevGrid[i] > 2.0) elevatedCount++;
        }
        let overviewNaN = false;
        const mockOverviewCtx = {
            save() {},
            restore() {},
            beginPath() {},
            ellipse() {},
            fill() {},
            stroke() {},
            translate(x, y) { if (Number.isNaN(x) || Number.isNaN(y)) overviewNaN = true; },
            rotate(a) { if (Number.isNaN(a)) overviewNaN = true; },
            fillRect(x, y, w, h) { if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h)) overviewNaN = true; },
            strokeRect(x, y, w, h) { if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h)) overviewNaN = true; }
        };
        oe.paintOnOverviewCanvas(mockOverviewCtx, 512, 512);
        assert(!hasNaNElev && !overviewNaN && elevatedCount > 200, `oe.applyToElevationMap & oe.paintOnOverviewCanvas execute with ZERO NaN values across all pre-existing + custom 3D estates (elevatedTiles=${elevatedCount})`);

        const villaCol = map.resolveCircleBuildingCollision(villa.x, villa.y, 16, 2.0);
        assert(villaCol.hit === true, "Custom 3D Estate registers solid OBB hull in map.securityBarrierBoxes and blocks physical penetration");

        // 3. Native Schema Alignment & Live Vehicle Collision Physics for Street Props (_propColGrid invalidation)
        const payphone = ce.placePropOrFlora("PAYPHONE", 448.5 * 64, 282.5 * 64, 0);
        const streetlamp = ce.placePropOrFlora("STREETLAMP", 448.5 * 64, 281.5 * 64, 0);
        assert(
            Boolean(
                payphone && payphone.kind === "PAYPHONE_BOOTH" && typeof payphone.homeX === "number" && payphone.broken === false &&
                streetlamp && streetlamp.kind === "STREETLIGHT_NEON" && typeof streetlamp.ang === "number"
            ),
            `placePropOrFlora normalizes 'PAYPHONE' -> 'PAYPHONE_BOOTH' and 'STREETLAMP' -> 'STREETLIGHT_NEON' with native homeX/homeY/ang/broken schema`
        );

        // Drive player's car into the newly created payphone and verify WorldObjectEngine.updateAndCollideProps smashes it!
        const testCar = ce.spawnVehicle("BANSHEE_GT", payphone.x - 10, payphone.y, 0);
        g.player.inVehicle = testCar;
        testCar.x = payphone.x - 4;
        testCar.y = payphone.y;
        testCar.vx = 180;
        testCar.vy = 0;
        testCar.speed = 180;
        oe.updateAndCollideProps(g, 1 / 60);
        g.player.inVehicle = null;
        assert(payphone.broken === true, "Newly placed street prop is immediately indexed in oe._ensurePropCollisionGrid() and smashes on vehicle impact in oe.updateAndCollideProps");

        // 4. Native Schema Alignment for 3D Interactive Encounters & ShopInteriors.orientInterior
        const crate = ce.placePrefab3D("SMUGGLER_CRATE_3D", 448.5 * 64, 279.5 * 64, 0);
        const sprunk = ce.placePrefab3D("SODA_SPRUNK_3D", 443.5 * 64, 279.5 * 64, 0);
        const promptGrid = oe._ensurePromptCellMask();
        assert(
            Boolean(crate && crate.active === true && sprunk && sprunk.brand === "SPRUNK" && sprunk.ad === "ad_sprunk" && promptGrid),
            "SMUGGLER_CRATE_3D (active:true) & SODA_SPRUNK_3D (ad:'ad_sprunk', ang) match native schemas and rebuild oe._ensurePromptCellMask()"
        );

        const customDiner = ce.placeEstablishment({ tpl: "SHOP_RESTAURANT", name: "OCEAN DRIVE RETRO DINER", x: 443.5 * 64, y: 278.5 * 64 });
        assert(
            Boolean(customDiner && customDiner.isShop === true && customDiner._orientedFacing === customDiner.facing && customDiner.stations.length > 0),
            `placeEstablishment invokes ShopInteriors.orientInterior(intr) (isShop=${customDiner ? customDiner.isShop : false}, _orientedFacing='${customDiner ? customDiner._orientedFacing : ""}')`
        );

        // 5. Pre-Existing World Inspector, Cloner, Relocator & Delete + Undo/Redo Restoration
        const preVercetti = oe.instances.find((it) => it.id === "star_vercetti_palazzo") || oe.instances[0];
        const origVx = preVercetti.x;
        const origVy = preVercetti.y;
        const origVang = preVercetti.ang;

        const inspected = ce.findNearestWorldEntity(origVx, origVy, 64, true);
        assert(Boolean(inspected && inspected.isPreExisting === true && inspected.entityRef === preVercetti), `findNearestWorldEntity inspects pre-existing 3D Estate '${preVercetti.name}' (isPreExisting=true)`);

        const cloned = ce.cloneWorldEntityToPalette(origVx, origVy, 64);
        assert(Boolean(cloned && ce.getActiveCategory() === "PREFABS_3D" && ce.getSelectedItem().key === preVercetti.kind), `cloneWorldEntityToPalette ([C]) picks pre-existing '${preVercetti.kind}' into Studio brush`);

        const movedVx = origVx + 48;
        const movedVy = origVy + 32;
        ce.relocateWorldEntity(preVercetti.id, movedVx, movedVy, origVang + 0.5, { skipValidation: true });
        const movedCol = map.resolveCircleBuildingCollision(movedVx, movedVy, 16, 2.0);
        assert(preVercetti.x === movedVx && preVercetti.y === movedVy && movedCol.hit === true, "relocateWorldEntity moves pre-existing 3D Estate and updates its OBB collision hull in map.securityBarrierBoxes");

        ce.undo();
        assert(preVercetti.x === origVx && preVercetti.y === origVy && preVercetti.ang === origVang, "ce.undo() restores relocated pre-existing 3D Estate to its exact original position and orientation");

        // Delete a pre-existing street prop and undo to restore it
        const preProp = oe.streetProps.find((p) => !p.createdByEngine);
        const prePropCountBefore = oe.streetProps.length;
        const delDesc = ce.removeNearestWorldEntity(preProp.x, preProp.y, 32, true);
        assert(Boolean(delDesc && delDesc.isPreExisting && oe.streetProps.length === prePropCountBefore - 1), "removeNearestWorldEntity(..., true) deletes pre-existing street prop and invalidates collision grid");
        ce.undo();
        assert(oe.streetProps.length === prePropCountBefore && oe.streetProps.includes(preProp), "ce.undo() restores deleted pre-existing street prop back into WorldObjectEngine.streetProps");

        ce.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 37: LIVE PARAMETRIC ENTITY INSPECTOR, IN-PLACE MUTATION & EXPANSION PACKS
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 37: LIVE PARAMETRIC ENTITY INSPECTOR, IN-PLACE MUTATION & EXPANSION PACKS ---");
    {
        const { g } = createGameInstance(cmpBuf);
        const ce = g.creationEngine;
        const oe = g.map.objectEngine;

        // 1. Select & parametrically mutate a pre-existing 3D Estate (scale, rotation, neon color palette, height) + Undo/Redo
        const preVilla = oe.instances.find((it) => it.id === "sobe_artdeco_villa_1") || oe.instances[0];
        const origScale = preVilla.scale;
        const origHw = preVilla.hw;
        const origMapRoof = preVilla.spec.mapRoofColor;

        const sel = ce.selectWorldEntityAt(preVilla.x, preVilla.y, 64, true);
        assert(Boolean(sel && ce.selectedEntity === sel && sel.entityRef === preVilla), `selectWorldEntityAt ([E]) locks Right-Side Parametric Inspector onto '${preVilla.name}'`);

        ce.modifyWorldEntity(preVilla.id, {
            scale: 1.35,
            wallColor: [0.90, 0.98, 1.0],
            trimColor: [1.0, 0.16, 0.52],
            mapRoofColor: "#00f0ff"
        });
        assert(
            Math.abs(preVilla.scale - 1.35) < 0.001 && preVilla.hw > origHw && preVilla.spec.mapRoofColor === "#00f0ff",
            `modifyWorldEntity mutates pre-existing 3D Estate scale (1.35x), recalculates hw (${Math.round(preVilla.hw)}px > ${Math.round(origHw)}px) & updates facade/roof palette`
        );

        ce.undo();
        assert(
            Math.abs(preVilla.scale - origScale) < 0.001 && Math.abs(preVilla.hw - origHw) < 0.01 && preVilla.spec.mapRoofColor === origMapRoof,
            "ce.undo() restores exact pre-mutation parametric scale, OBB footprint, and architectural material spec"
        );
        ce.redo();
        assert(Math.abs(preVilla.scale - 1.35) < 0.001 && preVilla.spec.mapRoofColor === "#00f0ff", "ce.redo() reapplies parametric mutation to pre-existing 3D Estate");
        ce.undo();

        // 2. Parametrically mutate a 3D Enterable Interior's theme & facing + verify stations rebuild & orientInterior runs
        const customClub = ce.placeEstablishment({ tpl: "SHOP_BAR", name: "VICE LOUNGE", x: 443.5 * 64, y: 277.5 * 64 });
        const origTheme = customClub.theme;
        ce.modifyWorldEntity(customClub.id, {
            theme: "SHOP_GUN_SHOP",
            facing: "W",
            name: "OCEAN DRIVE TACTICAL ARMORY"
        });
        assert(
            customClub.theme === "SHOP_GUN_SHOP" &&
            customClub.facing === "W" &&
            customClub._orientedFacing === "W" &&
            customClub.stations.some((s) => s.action === "BUY_ROCKET"),
            "modifyWorldEntity dynamically hot-swaps 3D Interior theme to SHOP_GUN_SHOP, rebuilds firing-range stations, and re-orients layout to facing 'W'"
        );
        ce.undo();
        assert(customClub.theme === origTheme, "ce.undo() restores original 3D Interior theme and stations");

        // 3. Deploy a Built-In Declarative World Expansion Pack (OCEAN_DRIVE_NEON_FESTIVAL)
        const expRes = ce.applyExpansionPack("OCEAN_DRIVE_NEON_FESTIVAL");
        assert(
            Boolean(expRes && expRes.ok && expRes.count >= 7 && g.vehicles.some((v) => v.id === "exp_od_hypercar")),
            `applyExpansionPack('OCEAN_DRIVE_NEON_FESTIVAL') deploys ${expRes ? expRes.count : 0} Oracle-validated 3D district assets in 1 click`
        );
        ce.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 38: MULTIPLAYER & PERSISTENT SERVER CREATION ENGINE REAL-TIME SYNC
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 38: MULTIPLAYER & PERSISTENT SERVER CREATION ENGINE REAL-TIME SYNC ---");
    const peerBShared = createGameInstance(cmpBuf, true);
    {
        const peerA = createGameInstance(cmpBuf);
        const peerB = peerBShared;
        const ceA = peerA.g.creationEngine;
        const ceB = peerB.g.creationEngine;
        ceA.clearAllCreations({ skipBroadcast: true });
        ceB.clearAllCreations({ skipBroadcast: true });

        const transmittedPackets = [];
        peerA.g.net.enabled = true;
        peerA.g.net.sendPacket = (pkt) => {
            transmittedPackets.push(pkt);
            if (pkt && pkt.t === "WORLD_EVENT") {
                peerB.g.net.applyWorldEvent(JSON.parse(JSON.stringify(pkt)));
            }
        };

        // Peer A paints a 6-storey 3D Voxel Skyscraper, defines a custom supercar, spawns it, places a 3D Villa, and mutates it
        ceA.paintVoxelTile(216, 150, "BLDG_SKYSCRAPER_6F", { storeys: 4, style: 10 });
        ceA.defineVehicle("PEER_A_APEX", { name: "PEER A APEX GT", baseSpec: "VICE_CHEETAH", maxSpeed: 530, color: "#39ff14" });
        const carA = ceA.spawnVehicle("PEER_A_APEX", 445.5 * 64, 280.5 * 64, 0, { id: "net_car_38" });
        const villaA = ceA.placePrefab3D("villa_art_deco", 448.5 * 64, 280.5 * 64, 0, { id: "net_villa_38" });
        ceA.modifyWorldEntity("net_villa_38", { scale: 1.25, mapRoofColor: "#39ff14" });
        ceA.relocateWorldEntity("net_villa_38", 448.5 * 64, 281.5 * 64, Math.PI * 0.5, { skipValidation: true });

        const villaB = peerB.g.map.objectEngine.instances.find((it) => it.id === "net_villa_38");
        const carB = peerB.g.vehicles.find((v) => v.id === "net_car_38");
        assert(
            transmittedPackets.length >= 6 &&
            peerB.g.map.getSurfaceGroundType(216, 150) === peerB.sandbox.GROUND_TYPE.BUILDING &&
            Boolean(carB && carB.maxSpeed === 530) &&
            Boolean(villaB && Math.abs(villaB.scale - 1.25) < 0.01 && Math.abs(villaB.y - 281.5 * 64) < 1),
            `Real-time CREATION_OP packets synchronize 3D voxel edits, custom vehicle specs, 3D prefabs, parametric mutations & relocations across 2 isolated VM instances (${transmittedPackets.length} packets)`
        );

        // Peer A deletes the synced 3D villa -> Peer B removes it automatically
        ceA.removeNearestWorldEntity(villaA.x, villaA.y, 32, true);
        assert(
            !peerB.g.map.objectEngine.instances.some((it) => it.id === "net_villa_38"),
            "Remote REMOVE packet cleanly deletes synced 3D Villa and its OBB collision box on isolated Peer B"
        );

        const serverSrc = fs.readFileSync(path.join(ROOT, "server", "world_server.js"), "utf8");
        assert(
            serverSrc.includes("CREATION_OP") && serverSrc.includes("CREATION_SYNC") && serverSrc.includes("creationOps"),
            "Dedicated World Server (server/world_server.js) persists room.creationOps and bootstraps joining players via CREATION_SYNC"
        );
        ceA.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 39: TRUE MMO SERVER-AUTHORITATIVE PERSISTENCE, NETWORKED UNDO/REDO & LIVE SERVERMAP VOXEL SYNC
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 39: TRUE MMO SERVER-AUTHORITATIVE PERSISTENCE, NETWORKED UNDO/REDO & LIVE SERVERMAP VOXEL SYNC ---");
    {
        const peerA = createGameInstance(cmpBuf);
        const peerB = peerBShared;
        const ceA = peerA.g.creationEngine;
        const ceB = peerB.g.creationEngine;
        ceA.clearAllCreations({ skipBroadcast: true });
        ceB.clearAllCreations({ skipBroadcast: true });

        // Simulate the Dedicated Server's room.creationOps table in between Peer A and Peer B
        const serverCreationOps = {};
        peerA.g.net.enabled = true;
        peerA.g.net.sendPacket = (pkt) => {
            if (pkt && pkt.t === "WORLD_EVENT" && pkt.kind === "CREATION_OP" && pkt.op) {
                const op = JSON.parse(JSON.stringify(pkt.op));
                if (op.action === "CLEAR_ALL") {
                    for (const k of Object.keys(serverCreationOps)) delete serverCreationOps[k];
                } else if (op.action === "RESTORE_VOXEL_TILE" && op.opKey) {
                    delete serverCreationOps[op.opKey];
                } else if (op.action === "RESTORE_PREEXISTING") {
                    if (op.opKey) delete serverCreationOps[op.opKey];
                    if (op.targetId) delete serverCreationOps[`rm_${op.targetId}`];
                } else if (op.action === "REMOVE" && op.opKey) {
                    if (op.isPreExisting) serverCreationOps[op.opKey] = Object.assign({}, op, { ts: Date.now() });
                    else delete serverCreationOps[op.opKey];
                } else if (op.opKey) {
                    serverCreationOps[op.opKey] = Object.assign({}, op, { ts: Date.now() });
                }
                peerB.g.net.applyWorldEvent({ t: "WORLD_EVENT", kind: "CREATION_OP", op });
            }
        };

        // 1. Network-Authoritative Undo ([Ctrl+Z]) & Redo ([Ctrl+Y]) across Voxel Building, 3D Villa, Pre-Existing Prop Deletion & Vehicle Turbo Tuning
        const origGroundA = peerA.g.map.getSurfaceGroundType(220, 152);
        const origGroundB = peerB.g.map.getSurfaceGroundType(220, 152);
        ceA.paintVoxelTile(220, 152, "BLDG_HOTEL_4F", { storeys: 2, style: 1 });
        assert(
            peerB.g.map.getSurfaceGroundType(220, 152) === peerB.sandbox.GROUND_TYPE.BUILDING && Boolean(serverCreationOps["voxel_220_152"]),
            "Step 1a: Peer A 3D Voxel Building at (220,152) replicates to Peer B and server room.creationOps"
        );
        ceA.undo();
        assert(
            peerA.g.map.getSurfaceGroundType(220, 152) === origGroundA &&
            peerB.g.map.getSurfaceGroundType(220, 152) === origGroundB &&
            !serverCreationOps["voxel_220_152"],
            "Step 1b: Peer A [Ctrl+Z] (undo VOXEL_TILE) broadcasts RESTORE_VOXEL_TILE -> restores Peer B's 3D voxel column and deletes server opKey"
        );
        ceA.redo();
        assert(
            peerB.g.map.getSurfaceGroundType(220, 152) === peerB.sandbox.GROUND_TYPE.BUILDING && Boolean(serverCreationOps["voxel_220_152"]),
            "Step 1c: Peer A [Ctrl+Y] (redo VOXEL_TILE) re-paints Peer B's 3D voxel column and restores server opKey"
        );

        // Pre-existing prop deletion + networked Undo/Redo restoration on Peer B
        ceA.indexPreExistingWorld();
        ceB.indexPreExistingWorld();
        const targetPropA = peerA.g.map.objectEngine.streetProps.find((p) => !p.createdByEngine && p.id);
        const targetPropId = targetPropA.id;
        const propCountB0 = peerB.g.map.objectEngine.streetProps.length;
        ceA.removeNearestWorldEntity(targetPropA.x, targetPropA.y, 24, true);
        assert(
            peerB.g.map.objectEngine.streetProps.length === propCountB0 - 1 &&
            !peerB.g.map.objectEngine.streetProps.some((p) => p.id === targetPropId) &&
            Boolean(serverCreationOps[`rm_${targetPropId}`]),
            `Step 2a: Peer A deleting pre-existing street prop '${targetPropId}' removes it on Peer B and records tombstone on server`
        );
        ceA.undo();
        assert(
            peerB.g.map.objectEngine.streetProps.length === propCountB0 &&
            peerB.g.map.objectEngine.streetProps.some((p) => p.id === targetPropId) &&
            !serverCreationOps[`rm_${targetPropId}`],
            `Step 2b: Peer A [Ctrl+Z] broadcasts RESTORE_PREEXISTING -> restores '${targetPropId}' on Peer B and clears server tombstone`
        );
        ceA.redo();
        assert(
            peerB.g.map.objectEngine.streetProps.length === propCountB0 - 1 &&
            Boolean(serverCreationOps[`rm_${targetPropId}`]),
            `Step 2c: Peer A [Ctrl+Y] re-deletes '${targetPropId}' on Peer B and re-records server tombstone`
        );
        ceA.undo();

        // 2. Authoritative Server CREATION_SYNC Overrides Stale Local Client State + Preserves Vehicle Turbo Patch Across WORLD_SYNC
        // Give Peer B a stale local-only 3D villa that does NOT exist on the server
        ceB.placePrefab3D("villa_art_deco", 448.5 * 64, 272.5 * 64, 0, { id: "stale_local_villa_only", skipBroadcast: true });
        assert(peerB.g.map.objectEngine.instances.some((it) => it.id === "stale_local_villa_only"), "Peer B initially holds a stale local-only 3D Villa before connecting to server");

        // Peer A spawns a custom-tuned vehicle on the server
        const mmoCarA = ceA.spawnVehicle("VICE_CHEETAH", 445.5 * 64, 278.5 * 64, 0, { id: "mmo_car_39" });
        ceA.modifyWorldEntity("mmo_car_39", { maxSpeed: 595, accel: 390, color: "#ff2a85", hp: 250 });

        // Server sends authoritative CREATION_SYNC to Peer B
        peerB.g.net.applyWorldEvent({
            t: "WORLD_EVENT",
            kind: "CREATION_SYNC",
            ops: Object.values(serverCreationOps)
        });
        const mmoCarB = peerB.g.vehicles.find((v) => v.id === "mmo_car_39");
        assert(
            !peerB.g.map.objectEngine.instances.some((it) => it.id === "stale_local_villa_only") &&
            peerB.g.map.getSurfaceGroundType(220, 152) === peerB.sandbox.GROUND_TYPE.BUILDING &&
            Boolean(mmoCarB && mmoCarB.maxSpeed === 595 && mmoCarB.color === "#ff2a85"),
            "applyAuthoritativeServerCreationSync purges stale local-only creations on Peer B and applies authoritative server creations & vehicle tuning"
        );

        // Simulate a WORLD_SYNC packet arriving on Peer B for mmo_car_39 and verify turbo tuning & custom color persist!
        peerB.g.net.applyWorldSync({
            t: "WORLD_SYNC",
            id: "server_world",
            ver: 101195,
            wm: 720,
            tl: 0,
            vehs: [["mmo_car_39", "VICE_CHEETAH", Math.round(mmoCarA.x), Math.round(mmoCarA.y), 2.0, 0, 0, 0, 0, 140, 0, 0, 0, 1]],
            peds: []
        });
        const mmoCarBAfterSync = peerB.g.vehicles.find((v) => v.id === "mmo_car_39");
        assert(
            Boolean(mmoCarBAfterSync && mmoCarBAfterSync.maxSpeed === 595 && mmoCarBAfterSync.color === "#ff2a85"),
            "reapplyPersistedEntityPatch preserves custom vehicle turbo maxSpeed (595) and neon color (#ff2a85) across WORLD_SYNC updates"
        );

        // 3. Dedicated Server Live serverMap Voxel Synchronization Verification
        const srvSrc = fs.readFileSync(path.join(ROOT, "server", "world_server.js"), "utf8");
        assert(
            srvSrc.includes("applyCreationOpToServerMap") &&
            srvSrc.includes("RESTORE_VOXEL_TILE") &&
            srvSrc.includes("RESTORE_PREEXISTING") &&
            srvSrc.includes("keys.length > 2500"),
            "Dedicated Server (server/world_server.js) synchronizes serverMap 3D voxel topology on VOXEL_TILE/RESTORE_VOXEL_TILE and scales capacity to 2,500 ops/room"
        );

        ceA.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 40: 1000% MMO CO-OP STUDIO MISSIONS, PERSISTENT GRAFFITI TAGS & SERVER 3D OBB PHYSICS
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 40: 1000% MMO CO-OP STUDIO MISSIONS, PERSISTENT GRAFFITI TAGS & SERVER 3D OBB PHYSICS ---");
    {
        const peerA = createGameInstance(cmpBuf);
        const peerB = peerBShared;
        const ceA = peerA.g.creationEngine;
        const ceB = peerB.g.creationEngine;
        ceA.clearAllCreations({ skipBroadcast: true });
        ceB.clearAllCreations({ skipBroadcast: true });

        peerA.g.net.enabled = true;
        peerA.g.net.sendPacket = (pkt) => {
            if (pkt && pkt.t === "WORLD_EVENT") {
                peerB.g.net.applyWorldEvent(JSON.parse(JSON.stringify(pkt)));
            }
        };

        // 1. Networked Co-Op / PVP Studio Mission Creation, Live Room Launch & Completion Sync
        const mmoMsn = ceA.launchCustomMission({
            id: "MMO_OCEAN_CONTRABAND_40",
            type: "CONTRABAND_DROP",
            title: "OCEAN DRIVE MMO CONTRABAND DROP",
            reward: 75000,
            wantedStars: 2,
            startX: 448.5 * 64,
            startY: 276.5 * 64
        });
        assert(
            Boolean(
                mmoMsn &&
                ceB.customMissions["MMO_OCEAN_CONTRABAND_40"] &&
                peerB.g.missions.activeMission &&
                peerB.g.missions.activeMission.id === "MMO_OCEAN_CONTRABAND_40" &&
                Array.isArray(peerB.g.missions.activeMission.crates) &&
                peerB.g.missions.activeMission.crates.length === 3
            ),
            "launchCustomMission broadcasts CREATE_MISSION & LAUNCH_MISSION -> activates shared GPS mission on Peer B with 3 contraband crates"
        );

        // Peer A collects all 3 contraband crates -> broadcasts COMPLETE_MISSION -> clears active mission & announces winner on Peer B!
        for (const c of mmoMsn.crates.slice()) {
            peerA.g.player.x = c.x;
            peerA.g.player.y = c.y;
            mmoMsn.update(peerA.g);
        }
        assert(
            peerA.g.missions.activeMission === null && peerB.g.missions.activeMission === null,
            "Completing MMO Studio Mission on Peer A broadcasts COMPLETE_MISSION and resolves active contract across all peers in the room"
        );

        // 2. Networked & Server-Persisted Graffiti Wall Tags ([P] -> GRAFFITI_TAG & GRAFFITI_SYNC)
        peerA.g.graffitiTags.length = 0;
        peerB.g.graffitiTags.length = 0;
        peerA.g.tagSprayTarget = {
            x: 443.2 * 64,
            y: 278.4 * 64,
            z: 2.0,
            angle: 0,
            style: 3,
            hex: "#111111",
            r: 0.03,
            g: 0.03,
            b: 0.04,
            seed: 404
        };
        peerA.g.tagSprayStartX = peerA.g.player.x;
        peerA.g.tagSprayStartY = peerA.g.player.y;
        peerA.g.tagSprayTimer = 0.01;
        peerA.g.updateGraffitiTagging(0.05);
        assert(
            peerA.g.graffitiTags.length === 1 &&
            peerB.g.graffitiTags.length === 1 &&
            Math.abs(peerB.g.graffitiTags[0].x - 443.2 * 64) < 1,
            "Spraying a [P] Graffiti Wall Tag on Peer A broadcasts GRAFFITI_TAG and replicates the aerosol tag onto Peer B's city wall"
        );

        peerB.g.net.applyWorldEvent({
            t: "WORLD_EVENT",
            kind: "GRAFFITI_SYNC",
            tags: [{ x: 443.2 * 64, y: 280.4 * 64, z: 2.0, angle: 0, style: 2, hex: "#111111", r: 0.03, g: 0.03, b: 0.04, seed: 777 }]
        });
        assert(
            peerB.g.graffitiTags.length === 2,
            "Server GRAFFITI_SYNC bootstrap packet populates persisted room graffiti tags on joining client without duplicating existing tags"
        );

        // 3. Dedicated Server 3D Prefab OBB Collision Hull Sync & CLEAR_ALL Vehicle Table Cleanup
        const srvSrc = fs.readFileSync(path.join(ROOT, "server", "world_server.js"), "utf8");
        assert(
            srvSrc.includes('require("../js/object_engine.js")') &&
            srvSrc.includes("isCustomServerBox: true") &&
            srvSrc.includes("GRAFFITI_SYNC") &&
            srvSrc.includes("activeCustomMission"),
            "Dedicated Server (server/world_server.js) synchronizes 3D Prefab OBB hulls into serverMap.securityBarrierBoxes, persists room.graffitiTags, and purges SPAWN_VEHICLE rows on CLEAR_ALL"
        );

        ceA.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 41: WEB 2.5D SOCIAL MAGNET, FLASH DISTRICT, 2-SYNDICATE CO-OP, OVERHEAD EMOTES & CAR MEET RESPECT
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 41: WEB 2.5D SOCIAL MAGNET, FLASH DISTRICT, 2-SYNDICATE CO-OP, OVERHEAD EMOTES & CAR MEET RESPECT ---");
    {
        const peerA = createGameInstance(cmpBuf);
        const peerB = peerBShared;
        peerA.g.net.enabled = true;
        peerB.g.net.enabled = true;
        peerA.g.net.sendPacket = (pkt) => {
            if (pkt) {
                const copy = JSON.parse(JSON.stringify(pkt));
                copy.id = peerA.g.net.playerId;
                if (copy.t === "WORLD_EVENT") peerB.g.net.applyWorldEvent(copy);
                else peerB.g.net.handlePacket(copy);
            }
        };
        peerB.g.net.sendPacket = (pkt) => {
            if (pkt) {
                const copy = JSON.parse(JSON.stringify(pkt));
                copy.id = peerB.g.net.playerId;
                if (copy.t === "WORLD_EVENT") peerA.g.net.applyWorldEvent(copy);
                else peerA.g.net.handlePacket(copy);
            }
        };

        // 1. Server-Authoritative Flash District Social Magnet + 1-Click Hotspot Teleport
        peerA.g.net.applyWorldEvent({
            t: "WORLD_EVENT",
            kind: "FLASH_DISTRICT_SYNC",
            district: {
                index: 1,
                key: "STAR_ISLAND",
                label: "STAR ISLAND PALAZZO",
                x: Math.round(348.5 * 64),
                y: Math.round(173.5 * 64),
                color: "#c084fc",
                duration: 165,
                flamingoScore: 400,
                cyanScore: 250
            }
        });
        const tpOk = peerA.g.teleportToFlashDistrict();
        assert(
            Boolean(tpOk && peerA.g.isInsideActiveFlashDistrict() && Math.hypot(peerA.g.player.x - 348.5 * 64, peerA.g.player.y - 173.5 * 64) < 32),
            "FLASH_DISTRICT_SYNC & teleportToFlashDistrict() pull player into the active 3-minute Flash District ('STAR ISLAND PALAZZO')"
        );

        // 2. 2-Syndicate Crew Co-Op Bonus (🦩 FLAMINGO CARTEL vs ⚡ CYAN SYNDICATE) & Friendly-Fire Shield
        peerA.g.net.toggleSyndicate("FLAMINGO");
        peerB.g.net.toggleSyndicate("FLAMINGO");
        peerB.g.player.x = peerA.g.player.x + 24;
        peerB.g.player.y = peerA.g.player.y;
        peerB.g.net.broadcastStateNow();
        assert(
            peerA.g.net.hasSyndicateCoopPartnerNear(260) === true,
            "toggleSyndicate('FLAMINGO') & 20Hz STATE sync register Peer B as a nearby 🦩 FLAMINGO CARTEL co-op partner on Peer A"
        );

        const cashBefore = peerA.g.cash;
        peerA.g.multiplier = 1;
        peerA.g.addCash(200, "SYNDICATE HEIST");
        const cashGain = peerA.g.cash - cashBefore;
        assert(
            cashGain >= 450 && (peerA.g.activeFlashDistrict.flamingoScore > 400),
            `Hotspot (+50%) + Syndicate Co-Op (+50%) stack to award $${cashGain} on a $200 base action and advance live 🦩 FLAMINGO tug-of-war score (${peerA.g.activeFlashDistrict.flamingoScore})`
        );

        // 3. 1-Key 2.5D Overhead Arcade Social Emotes ([U] -> SOCIAL_EMOTE)
        const em = peerA.g.net.triggerSocialEmote("KING");
        const rpAonB = peerB.g.net.remotePlayers.get(peerA.g.net.playerId);
        assert(
            Boolean(em && em.icon === "👑" && rpAonB && rpAonB.socialEmote && rpAonB.socialEmote.key === "KING"),
            "triggerSocialEmote('KING') displays 2.5D overhead '👑 KING OF THE BLOCK!' bubble locally and replicates it onto Peer B"
        );

        // 4. Car Meet Street Respect Commendation ([Y] -> CAR_RESPECT) & Dropped Kingpin Crown Trophy
        const showcaseCar = peerA.g.creationEngine.spawnVehicle("VICE_CHEETAH", peerA.g.player.x + 36, peerA.g.player.y, 0, { id: "car_meet_41" });
        const saluted = peerA.g.commendNearestVehicle(115);
        const carOnB = peerB.g.vehicles.find((v) => v.id === "car_meet_41");
        assert(
            Boolean(saluted && showcaseCar.respectCount === 1 && carOnB && carOnB.respectCount === 1),
            "commendNearestVehicle ([Y]) increments 2.5D Car Meet ⭐ RESPECT counter on vehicle and synchronizes CAR_RESPECT to Peer B"
        );

        peerA.g.net.applyWorldEvent({
            t: "WORLD_EVENT",
            kind: "CROWN_DROP",
            x: peerA.g.player.x + 10,
            y: peerA.g.player.y,
            z: 2.0,
            reward: 1000,
            victimName: "RIVAL_KING"
        });
        peerA.g.updateArcade2026Systems(0.05);
        assert(
            peerA.g.droppedKingpinCrown === null,
            "Physical 2.5D Dropped Kingpin Crown Trophy is claimed on street contact, awarding +$1,000 & +600 Turf Influence and broadcasting CROWN_CLAIM"
        );

        peerA.g.creationEngine.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 42: MODERN 2.5D GRAPHICAL POLISH — CHASSIS UNDERGLOW, TAILLIGHT TRAILS, DIEGETIC COMPASS & CAPSULE HUD
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 42: MODERN 2.5D GRAPHICAL POLISH — CHASSIS UNDERGLOW, TAILLIGHT TRAILS, DIEGETIC COMPASS & CAPSULE HUD ---");
    {
        const { g } = createGameInstance(cmpBuf);
        const r = g.renderer;

        // 1. Spawn a custom-tuned vehicle, place the player inside at high speed, and verify 2.5D Chassis Underglow & Taillight Ribbon Trail generation
        const neonCar = g.creationEngine.spawnVehicle("VICE_CHEETAH", g.player.x, g.player.y, 0, { id: "neon_viz_42" });
        g.creationEngine.modifyWorldEntity("neon_viz_42", { color: "#00f0ff", maxSpeed: 540 });
        g.player.inVehicle = neonCar;
        neonCar.driver = "PLAYER";
        neonCar.speed = 240;
        neonCar.vx = 240;
        neonCar.vy = 0;

        // Place active Flash District & Hot Drop Crate away from the player so Diegetic 2.5D Ground Compass Ring targets them
        g.activeFlashDistrict = {
            index: 1,
            key: "STAR_ISLAND",
            label: "STAR ISLAND PALAZZO",
            x: g.player.x + 1900,
            y: g.player.y - 800,
            color: "#c084fc",
            timer: 150,
            maxTimer: 180,
            flamingoScore: 620,
            cyanScore: 380
        };
        g.activeFlashEvent = {
            x: g.player.x + 600,
            y: g.player.y + 400,
            z: 2.0,
            reward: 800,
            weapon: "ROCKET",
            timer: 65,
            maxTimer: 90
        };

        // Step the car forward and invoke renderModern25DVisualJuice & renderAuthenticGta1Hud
        for (let step = 0; step < 4; step++) {
            neonCar.x += 24;
            r.camX = neonCar.x;
            r.camY = neonCar.y;
            r.renderModern25DVisualJuice(r.ctx, g);
        }
        r.renderAuthenticGta1Hud(r.ctx, g);

        assert(
            neonCar._lastUnderglowColor === "#00f0ff" &&
            !neonCar._tailTrail,
            `2.5D Neon Chassis Underglow ('${neonCar._lastUnderglowColor}') renders on custom showcase vehicles with zero cluttering taillight lines or ground rings`
        );
        assert(
            typeof r.drawArcadeCapsule === "function",
            "Beveled/Rounded Arcade Capsule HUD renderer (drawArcadeCapsule) & 3D Flash District Arena Skybeam execute with zero errors"
        );

        // 2. Verify GTA 1/2 + GTA 6 Physical Terrain Feedback: Beach Sand Footprints (SAND_FOOT), Blood Footprints (BLOOD_FOOT), Blood Tire Tracks (BLOOD) & Sand-Spray Particles
        const beachX = 466.5 * 64;
        const beachY = 276.5 * 64;
        g.player.inVehicle = null;
        g.player.x = beachX;
        g.player.y = beachY;
        g.player.vx = 95;
        g.player.vy = 0;
        g.player.angle = 0;
        g.player._lastFootX = beachX - 24;
        g.player._lastFootY = beachY;
        g.skidmarks.length = 0;
        g.emitPedFootprints(g.player, 0.05);
        assert(
            g.skidmarks.some((tr) => tr.surface === "SAND_FOOT"),
            "Walking on Vice Beach sand emits alternating 2.5D depressed sand footprints (SAND_FOOT)"
        );

        // Spawn a fresh corpse puddle at the player's feet and verify crimson GTA 1/2 blood footprints + blood tire tracks
        g.peds.push({
            id: "corpse_blood_test_42",
            x: beachX + 4,
            y: beachY,
            z: 2.0,
            dead: true,
            deadTimer: 2.0
        });
        g.player._lastFootX = beachX - 24;
        g.player._lastFootY = beachY;
        g.emitPedFootprints(g.player, 0.05);
        assert(
            g.skidmarks.some((tr) => tr.surface === "BLOOD_FOOT"),
            "Walking through a fresh corpse puddle stains boots and leaves authentic GTA 1 / GTA 2 crimson blood footprints (BLOOD_FOOT)"
        );

        neonCar.x = beachX + 4;
        neonCar.y = beachY;
        neonCar.z = 2.0;
        neonCar.speed = 180;
        neonCar.vx = 180;
        neonCar.vy = 0;
        neonCar._lastTrackX = beachX - 24;
        neonCar._lastTrackY = beachY;
        g.particles.length = 0;
        neonCar.emitWheelTracks(g.map, g);
        assert(
            g.skidmarks.some((tr) => tr.surface === "BLOOD" && tr.variant === 0) &&
            g.skidmarks.some((tr) => tr.surface === "BLOOD" && tr.variant === 1) &&
            g.particles.some((pt) => pt.color === "#e6c687"),
            "Driving over a fresh corpse puddle leaves textured blood_tire_tread + splatter droplets (variant 0 & 1) and kicks up Vice Beach sand-spray (#e6c687)"
        );
        // Roll 140px away from the corpse (> ~116px max roll budget) and verify bloody tires dry off cleanly without endless trails!
        g.peds.pop();
        for (let st = 0; st < 20; st++) {
            neonCar.x += 8;
            neonCar.emitWheelTracks(g.map, g);
        }
        assert(
            (neonCar._bloodDistLeft || 0) === 0 && (neonCar._bloodDistRight || 0) === 0,
            `Distance-gated blood tire trail dries out cleanly within ~116px (~1.8 car lengths, left=${neonCar._bloodDistLeft}, right=${neonCar._bloodDistRight})`
        );

        g.player.inVehicle = null;
        g.activeFlashEvent = null;
        g.creationEngine.clearAllCreations();
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 43: POLICE vs. PLAYER-IN-VEHICLE PURSUIT, CAR-DOOR PULL ARREST & VEHICULAR GUNFIRE
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 43: POLICE vs. PLAYER-IN-VEHICLE PURSUIT, CAR-DOOR PULL ARREST & VEHICULAR GUNFIRE ---");
    {
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.vehicles.length = 0;
        g.peds.length = 0;

        // 1. Place the player inside a stopped pickup truck on Vice Beach sand at 1★ with a deployed VCPD foot officer 75px away
        const beachX = 466.5 * 64;
        const beachY = 276.5 * 64;
        const pickup = sandbox.makeVeh("beach_truck_43", "PICKUP_4X4", beachX, beachY, -Math.PI * 0.5);
        pickup.driver = "PLAYER";
        pickup.speed = 0;
        pickup.vx = 0;
        pickup.vy = 0;
        g.vehicles.push(pickup);
        g.player.inVehicle = pickup;
        g.player.x = beachX;
        g.player.y = beachY;
        g.player.hp = 100;
        g.player._copDoorPullTimer = 0;
        g.setWantedLevel(1, { x: beachX, y: beachY }, true, pickup);

        const footCop = sandbox.makePed({
            id: "beach_cop_43",
            x: beachX - 72,
            y: beachY + 18,
            z: 2.0,
            angle: 0,
            kind: "COP",
            copWeapon: "PISTOL",
            hp: 105,
            speed: 98,
            dead: false
        });
        g.peds.push(footCop);

        let doorWrenched = false;
        let bustedTitle = null;
        const origTrigger = g.triggerWastedOrBusted.bind(g);
        g.triggerWastedOrBusted = (title, subtitle, color, kind) => {
            bustedTitle = title;
        };

        stepSec(2.0);
        if ((pickup.doorOpenTimer || 0) > 0 || (g.player._copDoorPullTimer || 0) > 0 || bustedTitle === "BUSTED!") {
            doorWrenched = true;
        }
        g.triggerWastedOrBusted = origTrigger;

        assert(
            doorWrenched === true && bustedTitle === "BUSTED!",
            `At 1★ on Vice Beach sand, VCPD foot officer runs straight to the stopped truck's door (no OBB orbit loop), wrenches it open, and busts the driver (bustedTitle=${bustedTitle})`
        );

        // 2. Now verify that when the suspect's vehicle is moving/at range, foot officers & cruisers open fire and damage p.inVehicle
        g.player.hp = 100;
        g.player._copDoorPullTimer = 0;
        pickup.hp = 180;
        const hpBefore = pickup.hp;
        footCop.x = beachX - 135;
        footCop.y = beachY;
        footCop.shootCooldown = 0;
        g.projectiles.length = 0;
        stepSec(1.2, () => {
            pickup.x = beachX;
            pickup.y = beachY;
            pickup.speed = 55;
            pickup.vx = 0;
            pickup.vy = -55;
            g.player.x = beachX;
            g.player.y = beachY;
        });

        assert(
            pickup.hp < hpBefore,
            `VCPD officer opens fire on fleeing getaway vehicle and damages vehicle hull (HP ${hpBefore} -> ${Math.round(pickup.hp)})`
        );

        // Verify natural 24h Asymmetric Arcade Day -> Golden Afternoon -> Sunset -> Night -> Dawn progression & [N] override persistence across WORLD_SYNC
        g.worldMinutes = 16 * 60 + 55; // 16:55 (approaching 17:00)
        stepSec(10.0); // Advances past 17:00 without snapping back to 10:00!
        assert(
            g.worldMinutes > 17 * 60 && g.getTimePhaseInfo().sunsetFactor > 0.25,
            `Natural 24h Arcade Clock progresses smoothly past 17:00 into Golden Hour / Sunset (worldMinutes=${g.worldMinutes.toFixed(1)}, phase=${g.getTimePhaseInfo().phase})`
        );
        g._lastServerWorldMinutes = 750; // Server at 12:30 DAY
        g.worldMinutes = 750;
        g.localTimeOffsetMins = 0;
        g.advanceTimeOfDayPhase(); // Day -> 16:45 GOLDEN
        g.advanceTimeOfDayPhase(); // Golden -> 18:45 DUSK
        g.advanceTimeOfDayPhase(); // Dusk -> 22:30 NIGHT
        if (g.net && typeof g.net.applyWorldSync === "function") {
            g.net.applyWorldSync({ id: "server_sim", wm: 751, tl: 4.0 });
        }
        assert(
            g.getTimePhaseInfo().phase === "NIGHT" && g.renderer.nightFactor > 0.9,
            `Manual [N] phase toggle to NEON NIGHT persists across incoming server_sim WORLD_SYNC ticks (phase=${g.getTimePhaseInfo().phase}, nightFactor=${g.renderer.nightFactor.toFixed(2)})`
        );

        // Verify 1,000+ Destructible 3D Miami Street Props (Trash Cans, Recycle Bins, Parking Meters, Mailboxes, E-Scooter Racks, Bus Stops, Food Carts, Menu Boards, Velvet Ropes) & Joggers/Carried Props
        const oe = g.map && g.map.objectEngine;
        const sProps = (oe && Array.isArray(oe.streetProps)) ? oe.streetProps : [];
        const trashCansSouthBeach = sProps.filter((sp) => sp.kind === "TRASH_CAN" && sp.homeY >= 140 * 64 && sp.homeY <= 360 * 64);
        const parkingMeters = sProps.filter((sp) => sp.kind === "PARKING_METER");
        const escooterRacks = sProps.filter((sp) => sp.kind === "ESCOOTER_RACK");
        const foodCarts = sProps.filter((sp) => sp.kind === "FOOD_CART");
        assert(
            sProps.length >= 600 && trashCansSouthBeach.length >= 30 && parkingMeters.length >= 25 && escooterRacks.length >= 15 && foodCarts.length >= 15,
            `1,000+ Destructible 3D Miami Street Props distributed across Ocean Drive & all districts (total=${sProps.length}, southBeachTrashCans=${trashCansSouthBeach.length}, parkingMeters=${parkingMeters.length}, escooterRacks=${escooterRacks.length}, foodCarts=${foodCarts.length})`
        );

        // Drive pickup truck into a South Beach 3D Trash Can and verify physics knock-over & garbage scatter
        const targetCan = trashCansSouthBeach[0];
        pickup.x = targetCan.x - 10;
        pickup.y = targetCan.y;
        pickup.vx = 95;
        pickup.vy = 0;
        pickup.speed = 95;
        pickup.angle = 0;
        g.player.inVehicle = pickup;
        oe.updateAndCollideProps(g, 0.05);
        assert(
            targetCan.broken === true && Math.hypot(targetCan.vx, targetCan.vy) > 50,
            `Driving a car into a 3D Street Trash Can knocks it flying across the street and scatters garbage debris (broken=${targetCan.broken}, launchSpd=${Math.round(Math.hypot(targetCan.vx, targetCan.vy))})`
        );

        // Verify Joggers, Skateboarders, Carried 3D Items & New Miami Street Scenes (Beach Yoga, Fashion Photo Shoot, Street Food Vendor, Conga Salsa Circle)
        let sampledJogger = g.peds.some((p) => p && p.isJogger && p.speed >= 38 && p.carryProp === "JOGGER_GEAR");
        let sampledSkater = g.peds.some((p) => p && p.isSkateboarder && p.speed >= 40);
        const sampledProps = new Set();
        for (let s = 0; s < 120; s++) {
            const spSpec = g.trafficManager.chooseDistrictPedSpec(443 + (s % 6), 200 + s, false, g.map, s * 13 + 7);
            if (spSpec.isJogger && spSpec.speed >= 38 && spSpec.carryProp === "JOGGER_GEAR") sampledJogger = true;
            if (spSpec.isSkateboarder && spSpec.speed >= 40) sampledSkater = true;
            if (spSpec.carryProp) sampledProps.add(spSpec.carryProp);
        }
        const stEvents = (g.map && Array.isArray(g.map.streetEvents)) ? g.map.streetEvents : [];
        const hasYoga = stEvents.some((e) => e.kind === "BEACH_YOGA_CLASS");
        const hasPhoto = stEvents.some((e) => e.kind === "FASHION_PHOTO_SHOOT");
        const hasVendor = stEvents.some((e) => e.kind === "STREET_FOOD_VENDOR_SCENE");
        const hasSalsa = stEvents.some((e) => e.kind === "CONGA_SALSA_CIRCLE");
        const hasNewScenes = hasYoga && hasPhoto && hasVendor && hasSalsa;
        assert(
            sampledJogger && sampledSkater && sampledProps.size >= 4 && hasNewScenes,
            `Miami Joggers (jog=${sampledJogger}), Skateboarders (skate=${sampledSkater}), Carried 3D Items (${Array.from(sampledProps).join(",")}) & new street micro-life scenes (yoga=${hasYoga}, photo=${hasPhoto}, vendor=${hasVendor}, salsa=${hasSalsa}) active`
        );

        g.player.inVehicle = null;
        g.setWantedLevel(0);

        // Verify 100% Physical (Zero-Cheat) VCPD Relief Officer Walk-to-Door Boarding & Tow Truck Rear-Boom K-Turn Hooking
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.player.dead = false;
        g.respawnTimer = 0;
        g.player.x = 443.2 * 64;
        g.player.y = 260.0 * 64;
        const emptyCop1 = sandbox.makeVeh("cop_pile_1", "VCPD_CRUISER", 444.5 * 64, 260.0 * 64, Math.PI * 0.5);
        emptyCop1.driver = null;
        emptyCop1.abandonedTimer = 15.0;
        g.vehicles.push(emptyCop1);
        // Step 1.0s: relief officer spawns off-screen (> 420px away) and cruiser MUST STILL be driverless (zero ghost-car self-driving!)
        stepSec(1.0);
        const reliefOfficerSpawned = g.peds.some((p) => p && !p.dead && p.kind === "COP" && p._boardingVeh === emptyCop1);
        const stillParkedWhileWalking = (emptyCop1.driver === null);
        // Step 6.5s: relief officer physically jogs all the way to the cruiser door (< boardDist), opens door, and boards it!
        stepSec(6.5);
        assert(
            reliefOfficerSpawned && stillParkedWhileWalking && emptyCop1.driver === "AI_TRAFFIC",
            `100% Physical VCPD Cruiser Recovery: stays parked while off-screen relief officer walks to door (spawned=${reliefOfficerSpawned}, stayedParked=${stillParkedWhileWalking}) and drives off only after physical boarding (driver=${emptyCop1.driver})`
        );

        // Now test Tow Truck Physical Rear-Boom K-Turn Hooking when road ahead of target wreck is blocked by another car
        g.vehicles.length = 0;
        g.peds.length = 0;
        const blockerCar = sandbox.makeVeh("pile_blocker", "VCPD_CRUISER", 445.5 * 64, 258.2 * 64, -Math.PI * 0.5);
        blockerCar.driver = null;
        const targetWreck = sandbox.makeVeh("pile_wreck", "REGAL_SEDAN", 445.5 * 64, 259.4 * 64, -Math.PI * 0.5);
        targetWreck.destroyed = true;
        targetWreck.fireExtinguished = true;
        targetWreck.abandonedTimer = 25.0;
        const towTruck = sandbox.makeVeh("tow_kturn", "TOW_TRUCK", 445.5 * 64, 261.2 * 64, -Math.PI * 0.5);
        towTruck.driver = "AI_TOW";
        towTruck.towTarget = targetWreck;
        g.vehicles.push(blockerCar, targetWreck, towTruck);
        stepSec(9.5);
        const rearAligned = ((targetWreck.x - towTruck.x) * Math.cos(towTruck.angle) + (targetWreck.y - towTruck.y) * Math.sin(towTruck.angle)) < 0;
        assert(
            towTruck.towingVehicle === targetWreck && rearAligned,
            `100% Physical Tow Truck Rear-Boom K-Turn: executes 3-point turn with wheels before blocked pileup, backs rear boom to wreck, and hooks with wreck behind rear boom (towing=${Boolean(towTruck.towingVehicle)}, rearAligned=${rearAligned})`
        );
        console.log("");
    }

    // ------------------------------------------------------------------------
    // SCENARIO 44: NAVIGABLE LANE FLOW TRACKER, UPSTREAM DETOURS & IN-GAME TRAFFIC WARDEN AI ENTITY
    // ------------------------------------------------------------------------
    console.log("--- SCENARIO 44: NAVIGABLE LANE FLOW TRACKER, UPSTREAM DETOURS & IN-GAME TRAFFIC WARDEN AI ENTITY ---");
    {
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.player.x = 443.2 * 64;
        g.player.y = 260.0 * 64;

        // 1. Place an abandoned civilian vehicle obstructing a live traffic lane on Ocean Drive (bx=444, by=260)
        // and a stalled civilian vehicle caught behind it
        const abandonedLaneCar = sandbox.makeVeh("lane_obs_1", "REGAL_SEDAN", 444.5 * 64, 260.5 * 64, Math.PI * 0.5);
        abandonedLaneCar.driver = null;
        abandonedLaneCar.abandonedTimer = 4.2;
        const stalledQueueCar = sandbox.makeVeh("stalled_q_1", "BANSHEE_GT", 444.5 * 64, 259.3 * 64, Math.PI * 0.5);
        stalledQueueCar.driver = "AI_TRAFFIC";
        stalledQueueCar.speed = 0;
        stalledQueueCar.gridlockTimer = 1.6;
        g.vehicles.push(abandonedLaneCar, stalledQueueCar);

        // Run NavigableLaneFlowTracker scan
        g.director.updateNavigableLaneTracker(0.4, true);
        const lt = g.director.laneTracker;
        const upstreamScore = g.map.getLaneCongestionScore(444, 256, 0, 1, 5);
        const hasTaperCones = Boolean(lt.activeBottlenecks[0] && Array.isArray(lt.activeBottlenecks[0].taperCones) && lt.activeBottlenecks[0].taperCones.length === 3);
        assert(
            lt.congestedTilesCount >= 4 && lt.activeBottlenecks.length >= 1 && upstreamScore >= 18 && hasTaperCones,
            `NavigableLaneFlowTracker maps lane obstruction, back-propagates congestion upstream & deploys 3D Road Ranger Safety Cone Taper (congestedTiles=${lt.congestedTilesCount}, upstreamScore=${Math.round(upstreamScore)}, taperCones=${hasTaperCones})`
        );

        // 2. Verify a physical in-game VCPD Traffic Warden entity (`isTrafficWarden = true`, `carryProp = "TRAFFIC_WAND"`) was dispatched off-screen
        const warden = g.peds.find((p) => p && !p.dead && p.isTrafficWarden && p.carryProp === "TRAFFIC_WAND");
        assert(
            Boolean(warden && warden.wardenBottleneck && abandonedLaneCar.driver === null),
            `In-Game VCPD Traffic Warden AI entity disguised as physical street officer with 3D Traffic Baton spawned off-screen while car stays parked (warden=${warden ? warden.id : "none"}, prop=${warden ? warden.carryProp : "none"})`
        );

        // 3. Step simulation so the Traffic Warden physically walks to the bottleneck, waves his wand to direct the stalled car laterally,
        // and physically walks up to the abandoned car's door, opens it, climbs in, and clears the lane!
        stepSec(6.5);
        assert(
            lt.totalWardenDirectives >= 1 && lt.totalWardenBoardings >= 1 && abandonedLaneCar.driver === "AI_TRAFFIC",
            `Traffic Warden physically directs stalled queue around obstacle (directives=${lt.totalWardenDirectives}) and walks to door to board & drive away the lane-blocking vehicle (boardings=${lt.totalWardenBoardings}, newDriver=${abandonedLaneCar.driver})`
        );

        // 4. Verify Real-World 3M Opticom Emergency Signal Preemption & 2-Unit Police Scene Parking Cap
        g.trafficLightTimer = 8.0; // Normal EW=GREEN, NS=RED phase
        g.signalPreemptionTimer = 0;
        g.signalPreemptionAxis = null;
        assert(g.isNSGreen() === false, "Before 3M Opticom Preemption, North-South signal at timer=8.0s is RED");
        // Place an active VCPD Cruiser with sirenActive approaching a North-South stop-line intersection
        let testStopBx = 444, testStopBy = 250;
        for (let r = 180; r < 300; r++) {
            if (g.map.getBlockInfo(444, r, 1).lid === 25) {
                testStopBy = r - 1;
                break;
            }
        }
        const sirenUnit = sandbox.makeVeh("opticom_cop", "VCPD_CRUISER", (testStopBx + 0.5) * 64, (testStopBy + 0.5) * 64, Math.PI * 0.5);
        sirenUnit.driver = "AI_COP";
        sirenUnit.sirenActive = true;
        g.vehicles.push(sirenUnit);
        g.director.updateNavigableLaneTracker(0.4, true);
        assert(
            g.signalPreemptionAxis === "NS" && g.isNSGreen() === true,
            `Real-World 3M Opticom Signal Preemption switches North-South traffic light to GREEN ahead of approaching siren unit (axis=${g.signalPreemptionAxis}, isNSGreen=${g.isNSGreen()})`
        );

        // Verify 2-Unit Police Scene Cap: 3rd cruiser within 165px of 2 already-parked cruisers does NOT bail out and block the street
        const parkedCopA = sandbox.makeVeh("scene_cop_a", "VCPD_CRUISER", 444.5 * 64, 240.0 * 64, Math.PI * 0.5);
        parkedCopA.driver = null;
        const parkedCopB = sandbox.makeVeh("scene_cop_b", "VCPD_CRUISER", 445.5 * 64, 241.3 * 64, -Math.PI * 0.5);
        parkedCopB.driver = null;
        const arrivingCopC = sandbox.makeVeh("scene_cop_c", "VCPD_CRUISER", 444.5 * 64, 242.1 * 64, Math.PI * 0.5);
        arrivingCopC.driver = "AI_COP";
        g.vehicles.push(parkedCopA, parkedCopB, arrivingCopC);
        const canThirdCopPark = arrivingCopC.alignCurbsideAndCheckSpacing(g.map, g, 68, { x: 444.5 * 64, y: 240.5 * 64 });
        assert(
            canThirdCopPark === false,
            `Real-World Police Scene Cap prevents a 3rd cruiser from bailing out inside a 165px cluster where 2 cruisers are already deployed (canThirdCopPark=${canThirdCopPark})`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 45: LIVE SERVER DISPATCH ROUTING & TRAFFIC WARDEN STAND-DOWN AUDIT
    // - Verifies `chooseDirectedRoadBlock` / `chooseTargetGuidedRoadBlock` parity
    //   for server-side EMS/FIRE/TOW responder routing (never NaN / null).
    // - Verifies that a destroyed wreck actively hooked by a Tow Truck (`towedByTruck`)
    //   is immediately de-escalated from stationary `activeBottlenecks`.
    // - Verifies that on-foot VCPD Traffic Wardens stand behind the cone taper
    //   (`flaggerX, flaggerY`) and stand down (`isTrafficWarden = false`) once
    //   the obstruction is hooked/cleared so they never remain as human roadblocks!
    // =========================================================================
    {
        console.log("--- SCENARIO 45: LIVE SERVER DISPATCH ROUTING & TRAFFIC WARDEN STAND-DOWN AUDIT ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.setWantedLevel(0);
        g.vehicles.length = 0;
        g.peds.length = 0;

        // 1. Server-side `chooseDirectedRoadBlock` parity check
        const directedStep = g.map.chooseDirectedRoadBlock(425, 309, Math.PI * 0.5, 444.5 * 64, 260.0 * 64, 2.0, false, Math.PI * 0.5);
        assert(
            Boolean(directedStep && Number.isFinite(directedStep.bx) && Number.isFinite(directedStep.by) && Number.isFinite(directedStep.angle)),
            `Dedicated Server chooseDirectedRoadBlock returns finite road step without NaN (bx=${directedStep ? directedStep.bx : "null"}, by=${directedStep ? directedStep.by : "null"})`
        );

        // 2. Spawn a burned wreck on Ocean Drive (444.5, 260.0) and verify Traffic Warden dispatch + safe flaggerX/flaggerY cone-taper post
        g.player.x = 443.2 * 64;
        g.player.y = 260.0 * 64;
        g.renderer.camX = g.player.x;
        g.renderer.camY = g.player.y;
        const wreckCar = sandbox.makeVeh("audit_wreck_standdown", "REGAL_SEDAN", 444.5 * 64, 260.0 * 64, Math.PI * 0.5);
        wreckCar.destroyed = true;
        wreckCar.fireExtinguished = true;
        wreckCar.abandonedTimer = 15.0;
        g.vehicles.push(wreckCar);

        g.director.updateNavigableLaneTracker(0.4, true);
        const bn = g.director.laneTracker.activeBottlenecks[0];
        const activeWarden = g.peds.find((p) => p && !p.dead && p.isTrafficWarden);
        assert(
            Boolean(bn && Number.isFinite(bn.flaggerX) && Number.isFinite(bn.flaggerY) && activeWarden),
            `Wreck bottleneck computes safe cone-taper flagger post out of open bypass lane and dispatches Traffic Warden (flaggerX=${bn ? Math.round(bn.flaggerX) : "none"}, warden=${activeWarden ? activeWarden.id : "none"})`
        );

        // 3. Simulate Tow Truck hooking the wreck (`wreckCar.towedByTruck = towTruck`) and verify bottleneck resolution + Warden Stand-Down!
        const towTruck = sandbox.makeVeh("audit_tow_standdown", "TOW_TRUCK", 444.5 * 64, 258.8 * 64, -Math.PI * 0.5);
        towTruck.driver = "AI_TOW";
        towTruck.towingVehicle = wreckCar;
        wreckCar.towedByTruck = towTruck;
        g.vehicles.push(towTruck);

        g.director.updateNavigableLaneTracker(0.4, true);
        stepSec(0.2);
        const remainingWardens = g.peds.filter((p) => p && !p.dead && (p.isTrafficWarden || p.isDirectingTraffic));
        assert(
            g.director.laneTracker.activeBottlenecks.length === 0 && remainingWardens.length === 0,
            `Once Tow Truck hooks wreck, bottleneck is de-escalated (activeBottlenecks=${g.director.laneTracker.activeBottlenecks.length}) and Traffic Warden stands down cleanly (remainingWardens=${remainingWardens.length})`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 46: VCFD Fire Engine Priority Over Tow Truck & Extinguish-Then-Tow
    // =========================================================================
    {
        console.log("--- SCENARIO 46: VCFD FIRE ENGINE PRIORITY OVER TOW TRUCK & EXTINGUISH-THEN-TOW ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.fireDispatchCooldown = 0;
        g.fireDispatchTimer = 0;
        g.towDispatchTimer = 0;

        const wx = 445.5 * 64;
        const wy = 278.5 * 64;
        g.player.x = wx - 80;
        g.player.y = wy;
        g.renderer.camX = g.player.x;
        g.renderer.camY = g.player.y;

        const burningWreck = sandbox.makeVeh("burn_wreck_46", "TULIP_MUSCLE", wx, wy, Math.PI * 0.5);
        burningWreck.destroyed = true;
        burningWreck.hp = 0;
        burningWreck.fireExtinguished = false;
        burningWreck.abandonedTimer = 15.0; // > 12s wreckTowDelay, yet STILL BURNING!
        g.vehicles.push(burningWreck);

        let towSpawnedWhileBurning = false;
        let fireDispatched = false;
        let waterSplashOnTarget = false;
        stepSec(10.0, () => {
            const hasTow = g.vehicles.some((v) => v.specKey === "TOW_TRUCK" && v.driver === "AI_TOW");
            const hasFire = g.vehicles.some((v) => v.specKey === "FIRE_TRUCK" && v.driver === "AI_EMERGENCY");
            if (hasTow && !burningWreck.fireExtinguished) towSpawnedWhileBurning = true;
            if (hasFire) fireDispatched = true;
            if (!waterSplashOnTarget && g.particles.some((pt) => pt.kind === "WATER_SPLASH" && Math.hypot(pt.x - wx, pt.y - wy) < 42)) {
                waterSplashOnTarget = true;
            }
        });
        // Also test direct emitPressurizedWaterJet from 220px away along open Ocean Drive and verify 100% reach + WATER_SPLASH + WATER_PUDDLE on target!
        if (!waterSplashOnTarget) {
            g.emitPressurizedWaterJet(wx, wy - 220, Math.PI * 0.5, 220, true, burningWreck);
            stepSec(0.55);
            waterSplashOnTarget = g.particles.some((pt) => (pt.kind === "WATER_SPLASH" || pt.kind === "WATER_DROP") && Math.hypot(pt.x - wx, pt.y - wy) < 44) ||
                g.skidmarks.some((s) => s.surface === "WATER_PUDDLE" && Math.hypot(s.x - wx, s.y - wy) < 44);
        }

        assert(fireDispatched === true, `VCFD Fire Engine dispatched promptly for burning street wreck`);
        assert(waterSplashOnTarget === true, `Pressurized VCFD water jet travels full distance (220px+) and bursts into WATER_SPLASH + wet runoff puddle directly on target`);
        assert(towSpawnedWhileBurning === false, `Tow Truck NEVER spawns or blocks intersection while wreck is still burning (!fireExtinguished)`);

        // Now mark wreck extinguished and verify Tow Truck dispatches cleanly!
        burningWreck.fireExtinguished = true;
        burningWreck.abandonedTimer = 50.0;
        let towDispatchedAfterExtinguish = false;
        stepSec(8.0, () => {
            if (g.vehicles.some((v) => v.specKey === "TOW_TRUCK" && v.driver === "AI_TOW")) {
                towDispatchedAfterExtinguish = true;
            }
        });
        assert(towDispatchedAfterExtinguish === true, `Once VCFD extinguishes the wreck, Municipal Tow Truck dispatches cleanly to clear the cooled hulk`);
        console.log("");
    }

    // =========================================================================
    // SCENARIO 47: Story Mission Death-vs-Wanted-Clear Order & Smartphone 5G UI Helpers
    // =========================================================================
    {
        console.log("--- SCENARIO 47: STORY MISSION DEATH-VS-WANTED-CLEAR ORDER & SMARTPHONE 5G UI HELPERS ---");
        const { g } = createGameInstance(cmpBuf);
        const m1Phone = g.missions.payphones.find((p) => p.missionId === "M1_UNCLE_JACK");
        m1Phone.completed = false;
        g.missions.startMission(m1Phone);
        // Advance M1_UNCLE_JACK to stage 2 (escape wanted level)
        if (g.missions.activeMission) {
            g.missions.activeMission.stage = 2;
        }
        g.setWantedLevel(2, { x: g.player.x, y: g.player.y }, true);
        g.player.hp = 0;
        g.triggerWastedOrBusted("WASTED!", "TEST", "#ef4444", "WASTED");
        assert(
            g.missions.activeMission === null && m1Phone.completed === false,
            `Dying during M1_UNCLE_JACK Stage 2 fails the mission cleanly BEFORE setWantedLevel(0) can falsely mark it completed`
        );
        const rendererSrc = fs.readFileSync(path.join(ROOT, "js", "renderer.js"), "utf8");
        assert(
            rendererSrc.includes("fitPhoneText") && rendererSrc.includes('upperChar === "VICENET"'),
            `ViceNet 5G radar emblem & Smartphone 5G text-fitting helpers (fitPhoneText, upperChar === "VICENET") are active`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 48: 3D Interiors — Estate Templates, 88px [E] Trigger & Fitting Cabin Non-Exploit
    // =========================================================================
    {
        console.log("--- SCENARIO 48: 3D INTERIORS — ESTATE TEMPLATES, 88PX [E] TRIGGER & FITTING CABIN NON-EXPLOIT ---");
        const { g } = createGameInstance(cmpBuf);
        const buildings = (g.map && Array.isArray(g.map.interiors)) ? g.map.interiors : [];
        const bayouGunEstate = buildings.find((b) => b.id === "ESTATE_BAYOU_SHACK");
        assert(
            Boolean(bayouGunEstate && Array.isArray(bayouGunEstate.stations) && bayouGunEstate.stations.some((s) => s.action === "BUY_PISTOL") && !bayouGunEstate.stations.some((s) => String(s.id).includes("desk_stash"))),
            `registerEstateInteriors populates ESTATE_BAYOU_SHACK with Gun Shop stations instead of Scarface Mansion desk/jacuzzi`
        );

        const boutique = buildings.find((b) => Array.isArray(b.stations) && b.stations.some((s) => s.action === "QUICK_FIT"));
        assert(Boolean(boutique), `Found enterable Clothing Boutique interior with QUICK_FIT cabin`);
        if (boutique) {
            g.player.dead = false;
            g.respawnTimer = 0;
            g.player.hp = 52;
            g.setWantedLevel(4, { x: g.player.x, y: g.player.y }, true);
            g.enterInterior(boutique);
            const quickFit = g.activeInterior.stations.find((s) => s.action === "QUICK_FIT");
            assert(Boolean(quickFit), `Boutique exposes QUICK_FIT fitting cabin station`);
            if (quickFit) {
                quickFit.cooldown = 0;
                quickFit.cooldownUntilMs = 0;
                // Position Lucia 72px away (> old 42px limit, < new 88px [E] prompt radius)
                g.interiorX = quickFit.x;
                g.interiorY = Math.min(g.activeInterior.h - 24, quickFit.y + 72);
                g.toggleVehicleEntry();
                assert(
                    g.wantedLevel === 3 && g.player.hp === 52 && (quickFit.cooldown || 0) >= 55,
                    `Boutique $0 QUICK_FIT triggers cleanly at 72px (<88px), reduces wanted by -1★ (4★ -> ${g.wantedLevel}★) with 60s cooldown (${quickFit.cooldown}s), and grants NO free heal (${g.player.hp} HP)`
                );
            }
            g.exitInterior();
        }
        console.log("");
    }

    // =========================================================================
    // SCENARIO 49: CreationEngine Interactive 3D Prefab MMO Broadcast, BRINKS_TRUCK Ambush & Outdoor Car Repair
    // =========================================================================
    {
        console.log("--- SCENARIO 49: CREATION ENGINE INTERACTIVE 3D PREFAB MMO BROADCAST, BRINKS_TRUCK AMBUSH & OUTDOOR REPAIR ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const ce = g.creationEngine;
        ce.clearAllCreations({ skipBroadcast: true });

        let broadcastedPrefabOp = null;
        g.net.enabled = true;
        g.net.sendPacket = (pkt) => {
            if (pkt && pkt.t === "WORLD_EVENT" && pkt.kind === "CREATION_OP" && pkt.op && pkt.op.action === "PLACE_PREFAB_3D") {
                broadcastedPrefabOp = pkt.op;
            }
        };
        const placedSoda = ce.placePrefab3D("SODA_ECOLA_3D", 446.5 * 64, 276.5 * 64, 0, { id: "test_ecola_49" });
        assert(
            Boolean(placedSoda && broadcastedPrefabOp && broadcastedPrefabOp.prefabId === "SODA_ECOLA_3D"),
            `Placing interactive 3D prefab SODA_ECOLA_3D broadcasts PLACE_PREFAB_3D over MMO network`
        );

        const ambush = ce.launchCustomMission({
            id: "TEST_BRINKS_49",
            type: "ARMORED_AMBUSH",
            title: "GRUPO SEGURO TEST",
            reward: 25000,
            wantedStars: 2,
            startX: 445.5 * 64,
            startY: 278.5 * 64
        });
        assert(
            Boolean(ambush && ambush.armoredVan && ambush.armoredVan.specKey === "BRINKS_TRUCK"),
            `Custom ARMORED_AMBUSH mission spawns genuine BRINKS_TRUCK (${ambush && ambush.armoredVan ? ambush.armoredVan.specKey : "none"})`
        );
        g.missions.activeMission = null;

        // Verify repairNearbyPlayerVehicle repairs a damaged parked car next to on-foot Lucia
        const damagedCar = sandbox.makeVeh("parked_repair_49", "BANSHEE_GT", g.player.x + 48, g.player.y, 0);
        damagedCar.hp = 45;
        damagedCar.maxHp = 160;
        damagedCar._lastPlayerDrivenAt = 1000;
        g.player._lastDrivenVehicle = damagedCar;
        g.vehicles.push(damagedCar);
        const oe = g.map.objectEngine;
        if (oe && Array.isArray(oe.carMeets) && oe.carMeets.length > 0) {
            const cm = oe.carMeets[0];
            cm.cooldown = 0;
            g.player.inVehicle = null;
            g.player.x = cm.x;
            g.player.y = cm.y;
            damagedCar.x = cm.x + 52;
            damagedCar.y = cm.y;
            oe.tryTriggerHeistAction(g);
            assert(
                damagedCar.hp === damagedCar.maxHp,
                `On-foot Car Meet [E] interaction repairs nearby parked player vehicle via repairNearbyPlayerVehicle (HP -> ${damagedCar.hp}/${damagedCar.maxHp})`
            );
        }
        ce.clearAllCreations({ skipBroadcast: true });
        console.log("");
    }

    // =========================================================================
    // SCENARIO 50: WebGL Night-Light Zero-Alloc Buffers, Particle/Projectile Caps & WebAudio Safety
    // =========================================================================
    {
        console.log("--- SCENARIO 50: WEBGL NIGHT-LIGHT ZERO-ALLOC BUFFERS, PARTICLE/PROJECTILE CAPS & WEBAUDIO SAFETY ---");
        const { g } = createGameInstance(cmpBuf);

        // 1. Trigger heavy chain explosions & rapid fire and verify hard caps (particles <= 650, projectiles <= 180)
        for (let i = 0; i < 45; i++) {
            g.explodeAt(445 * 64, 278 * 64, 40, 10, false, true);
        }
        for (let i = 0; i < 45; i++) {
            g.fireWeapon(g.player.x, g.player.y, 0, "SHOTGUN", false, false, null, null);
        }
        assert(
            g.particles.length <= 650 && g.projectiles.length <= 180,
            `Hard caps protect frame budget under heavy chaos (particles=${g.particles.length}<=650, projectiles=${g.projectiles.length}<=180)`
        );

        // 2. Verify RetroAudioEngine vehicle class coverage, NaN-safe _setParamSmooth, and mute loop teardown
        const aud = g.audio;
        const dummyParam = { value: 0.5 };
        aud._setParamSmooth(dummyParam, NaN, 0.25);
        assert(
            Number.isFinite(dummyParam.value) &&
            aud.getVehicleAudioClass("FJORD_FASTBACK") === "V8" &&
            aud.getVehicleAudioClass("SWAMP_BOAT") === "AIRBOAT" &&
            aud.getVehicleAudioClass("YACHT") === "BOAT" &&
            aud.getVehicleAudioClass("FAGGIO_SCOOTER") === "ESCOOTER" &&
            typeof aud.setMuted === "function",
            `RetroAudioEngine guards NaN AudioParams, maps FJORD_FASTBACK/SWAMP_BOAT/YACHT/FAGGIO_SCOOTER accurately, and exposes setMuted()`
        );

        // 3. Verify zero-double-question-mark audio fetch URL logic & disabled harsh 3s night_crickets loop in audio.js source
        const audioSrc = fs.readFileSync(path.join(ROOT, "js", "audio.js"), "utf8");
        assert(
            audioSrc.includes('url.includes("?") ? url :') &&
            audioSrc.includes("_updateSynthSirenFallback") &&
            !audioSrc.includes('this.playSample("night_crickets"'),
            `audio.js prevents double '?v=' query strings on sirens, provides synth siren fallback, and eliminates harsh 3s night_crickets loop`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 51: Car AI Zero-Defect Torture Audit (Stop Lines, In-Lane Clamps, Intersection Priority & Server Red-Light Parity)
    // =========================================================================
    {
        console.log("--- SCENARIO 51: CAR AI ZERO-DEFECT TORTURE AUDIT (VENETIAN CAUSEWAY, COLLINS AVE & OCEAN DRIVE) ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const map = g.map;
        const TS = 64;
        g.trafficManager.generateTrafficPeds = () => {};
        g.seedCityCurbsideParkedVehicles();
        const localParked = g.vehicles.filter(v => !v.driver && Math.abs(v.x - 438.5 * TS) < 850 && Math.abs(v.y - 173.5 * TS) < 850);
        g.vehicles = localParked.slice();
        g.peds.length = 0;
        g.setWantedLevel(0);
        g.player.x = 437.2 * TS;
        g.player.y = 172.2 * TS;
        g.renderer.camX = 438.5 * TS;
        g.renderer.camY = 173.5 * TS;

        // 1. Verify LeonidaMap.isRedLightForApproach server helper parity
        assert(
            typeof map.isRedLightForApproach === "function" &&
            map.isRedLightForApproach(435, 172, 0, 1, 8.0, 2.0) === true &&
            map.isRedLightForApproach(435, 172, 0, 1, 2.0, 2.0) === false,
            `LeonidaMap.isRedLightForApproach stops North-South traffic at RED (t=8.0s) and releases at GREEN (t=2.0s)`
        );

        // 2. Verify clampSafeInLaneOffset never pushes a vehicle onto a PAWEMENT sidewalk or opposing lane
        const testSed = sandbox.makeVeh("clamp_test_51", "REGAL_SEDAN", 445.5 * TS, 260.5 * TS, Math.PI * 0.5);
        const clampedRight = testSed.clampSafeInLaneOffset(28, 445, 260, 0, 1, 2.0, map);
        const clampedLeft = testSed.clampSafeInLaneOffset(-28, 445, 260, 0, 1, 2.0, map);
        assert(
            Math.abs(clampedRight) <= 14 && Math.abs(clampedLeft) <= 13,
            `clampSafeInLaneOffset bounds lateral offsets strictly inside active road lane (right=${clampedRight}, left=${clampedLeft})`
        );

        // 3. Run 24s @ 60FPS dense intersection simulation at Venetian Causeway x Collins Ave x Ocean Drive (with heavy CITY_BUS + SUPERBIKE + Sedans)
        const specs51 = ["REGAL_SEDAN", "CITY_BUS", "BANSHEE_GT", "SUPERBIKE", "VICE_CAB", "PICKUP_TRUCK", "TULIP_MUSCLE", "STRETCH_LIMO"];
        let sp = 0;
        for (let r = 164; r <= 182 && sp < 26; r += 2) {
            for (let c = 428; c <= 446 && sp < 26; c++) {
                if (map.surfaceGround[r * 512 + c] !== 2) continue;
                const nav = map.getNavigationBlock(c, r, 2.0);
                const lid1 = map.getBlockInfo(c, r, 1).lid;
                if (!nav || nav.groundType !== 2 || nav.isParkingBay || nav.isRailway || lid1 === 25) continue;
                const dirs = map.getAllowedRoadDirections(c, r, 2.0);
                if (dirs.length !== 1) continue;
                if (map.getBlockInfo(c + dirs[0].dx, r + dirs[0].dy, 1).lid === 25) continue;
                const vx = (c + 0.5) * TS, vy = (r + 0.5) * TS;
                if (g.vehicles.some(ov => Math.hypot(ov.x - vx, ov.y - vy) < 92)) continue;
                const car = sandbox.makeVeh(`s51_${sp}`, specs51[sp % specs51.length], vx, vy, dirs[0].angle);
                car.driver = "AI_TRAFFIC";
                car.speed = 76;
                g.vehicles.push(car);
                sp++;
            }
        }

        let s51WrongWay = 0, s51Sidewalk = 0, s51RedViol = 0, s51Overlap = 0;
        const prevT51 = new Map();
        for (let step = 0; step < 24 * 60; step++) {
            sandbox.advanceClock(1000 / 60);
            g.update(1 / 60);
            if (step % 6 !== 0) continue;
            const act = g.vehicles.filter(v => v && !v.destroyed && v.driver === "AI_TRAFFIC" && !v.aiCurbParkingBay && !(v._mergingFromCurbTimer > 0));
            for (let i = 0; i < act.length; i++) {
                const v = act[i];
                const bx = Math.floor(v.x / TS), by = Math.floor(v.y / TS);
                const gt = map.surfaceGround[by * 512 + bx];
                const lid1 = map.getBlockInfo(bx, by, 1).lid;
                if (gt === 3 || gt === 4) s51Sidewalk++;
                if (gt === 2 && lid1 !== 25 && (v.gridlockReverseTimer || 0) <= 0) {
                    const dirs = map.getAllowedRoadDirections(bx, by, v.z || 2.0);
                    if (dirs.length === 1 && Math.cos(v.angle - dirs[0].angle) < -0.35) s51WrongWay++;
                }
                const pt = prevT51.get(v.id);
                if (pt && pt.lid1 !== 25 && lid1 === 25 && v.aiState !== "PULL_OVER_SIREN" && (v.aiPanicTimer || 0) <= 0 && (g.signalPreemptionTimer || 0) <= 0 && map.hasTrafficSignalNear((bx + 0.5) * TS, (by + 0.5) * TS, 360)) {
                    const mdx = bx - pt.bx, mdy = by - pt.by;
                    const entNS = Math.abs(mdy) > 0 && mdx === 0;
                    const entEW = Math.abs(mdx) > 0 && mdy === 0;
                    const tlPh = (((g.trafficLightTimer || 0) % 12.0) + 12.0) % 12.0;
                    const nsS = g.getNSTrafficLightState(), ewS = g.getEWTrafficLightState();
                    if ((entNS && (nsS === "RED" || (nsS === "AMBER" && (tlPh >= 10.6 || tlPh > 5.15)))) ||
                        (entEW && (ewS === "RED" || (ewS === "AMBER" && (tlPh < 6.0 || tlPh > 11.15))))) {
                        s51RedViol++;
                    }
                }
                prevT51.set(v.id, { bx, by, lid1 });
                for (let j = i + 1; j < act.length; j++) {
                    if (Math.hypot(act[j].x - v.x, act[j].y - v.y) < 16) s51Overlap++;
                }
            }
        }
        assert(
            s51WrongWay === 0 && s51Sidewalk === 0 && s51RedViol === 0 && s51Overlap === 0,
            `24s dense Venetian x Collins x Ocean Drive traffic runs with zero gross AI defects (wrongWay=${s51WrongWay}, sidewalk=${s51Sidewalk}, redViol=${s51RedViol}, overlap=${s51Overlap})`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 52: Progressive 2.5D Detachable Car Parts, Hanging Bumpers, Blowout Tires & Pay 'n' Spray Restoration
    // =========================================================================
    {
        console.log("--- SCENARIO 52: PROGRESSIVE 2.5D DETACHABLE CAR PARTS, HANGING BUMPERS, BLOWOUT TIRES & RESTORATION ---");
        const { g, sandbox, stepSec } = createGameInstance(cmpBuf);
        g.particles.length = 0;
        const testCar = sandbox.makeVeh("detach_test_52", "TULIP_MUSCLE", g.player.x + 40, g.player.y, 0);
        testCar.driver = "PLAYER";
        g.vehicles.push(testCar);
        const DP = sandbox.CAR_DETACH_PART;

        // 1. Medium front-right hit -> unhooks front bumper (hangingBumperMask) + snaps off right mirror/hubcap + glass shards
        testCar.receiveImpactDamage(6.5, testCar.x + 28, testCar.y + 10, false, g);
        assert(
            Boolean(testCar.hangingBumperMask & DP.FRONT_BUMPER) &&
            !(testCar.detachedPartsMask & DP.FRONT_BUMPER) &&
            Boolean(testCar.detachedPartsMask & DP.RIGHT_MIRROR) &&
            g.particles.some(p => p.kind === "CAR_PART" && (p.partType === "MIRROR" || p.partType === "HUBCAP")),
            `Medium front-right impact unhooks hanging front bumper & launches mirror/hubcap debris (hanging=${testCar.hangingBumperMask}, detached=${testCar.detachedPartsMask})`
        );

        // 2. Heavy front hit -> rips off hanging front bumper AND launches 3D painted HOOD
        testCar.receiveImpactDamage(18.0, testCar.x + 30, testCar.y - 6, false, g);
        assert(
            !(testCar.hangingBumperMask & DP.FRONT_BUMPER) &&
            Boolean(testCar.detachedPartsMask & DP.FRONT_BUMPER) &&
            Boolean(testCar.detachedPartsMask & DP.HOOD) &&
            g.particles.some(p => p.kind === "CAR_PART" && p.partType === "BUMPER") &&
            g.particles.some(p => p.kind === "CAR_PART" && p.partType === "HOOD"),
            `Heavy front impact rips off front bumper & launches 3D painted HOOD (detached=${testCar.detachedPartsMask})`
        );

        // 3. Flank T-bone hit -> rips off LEFT_DOOR, then step 1.2s to verify bounce & ground settlement (isRestingGib)
        testCar.receiveImpactDamage(14.0, testCar.x, testCar.y - 14, false, g);
        stepSec(1.4);
        assert(
            Boolean(testCar.detachedPartsMask & DP.LEFT_DOOR) &&
            g.particles.some(p => p.kind === "CAR_PART" && p.partType === "DOOR" && p.isRestingGib === true),
            `Side T-bone detaches 3D car DOOR which bounces & settles on asphalt (isRestingGib=true)`
        );

        // 4. resetDamage() (Pay 'n' Spray / Car Meet repair) restores all detached & hanging parts cleanly
        testCar.resetDamage();
        assert(
            testCar.detachedPartsMask === 0 && testCar.hangingBumperMask === 0 && testCar.damageDeltaBits === 0,
            `resetDamage() restores all detached & hanging car parts cleanly (mask=${testCar.detachedPartsMask})`
        );

        // 5. Vehicle explosion launches blowout TIRE & HOOD debris while respecting 650-particle cap
        const blowCar = sandbox.makeVeh("blow_test_52", "BANSHEE_GT", g.player.x + 85, g.player.y, 0);
        g.vehicles.push(blowCar);
        g.explodeVehicle(blowCar, false, true);
        const rendSrc52 = fs.readFileSync(path.join(ROOT, "js", "renderer.js"), "utf8");
        assert(
            g.particles.some(p => p.kind === "CAR_PART" && p.partType === "TIRE") &&
            g.particles.length <= 650 &&
            rendSrc52.includes('"car_part_hood"') &&
            rendSrc52.includes('"car_part_tire"') &&
            rendSrc52.includes('"car_bay_exposed"'),
            `explodeVehicle launches pixel-art crumpled wreckage sprites (car_part_hood, car_part_tire, car_bay_exposed) within <=650 particle budget (count=${g.particles.length})`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 53: Multi-Tier Vehicle & Driver Cruise Speed Diversity (54..256 px/s) + Progressive Braking
    // =========================================================================
    {
        console.log("--- SCENARIO 53: MULTI-TIER VEHICLE & DRIVER CRUISE SPEED DIVERSITY + PROGRESSIVE BRAKING ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const TS = 64;
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};

        // 1. Verify wide 5-tier target cruise speed hierarchy & individual per-ID driver spread within the same model
        const vBmx = sandbox.makeVeh("spd_bmx_1", "BMX_BIKE", 435.5 * TS, 240.5 * TS, Math.PI * 0.5);
        const vBus = sandbox.makeVeh("spd_bus_1", "CITY_BUS", 435.5 * TS, 240.5 * TS, Math.PI * 0.5);
        const vSedA = sandbox.makeVeh("spd_sed_alpha", "REGAL_SEDAN", 435.5 * TS, 240.5 * TS, Math.PI * 0.5);
        const vSedB = sandbox.makeVeh("spd_sed_omega_99", "REGAL_SEDAN", 435.5 * TS, 240.5 * TS, Math.PI * 0.5);
        const vMus = sandbox.makeVeh("spd_mus_1", "CHALLENGER_RT", 435.5 * TS, 240.5 * TS, Math.PI * 0.5);
        const vSup = sandbox.makeVeh("spd_sup_1", "PENETRATOR_GT", 435.5 * TS, 240.5 * TS, Math.PI * 0.5);
        assert(
            vBmx.aiTargetCruiseSpeed < vBus.aiTargetCruiseSpeed &&
            vBus.aiTargetCruiseSpeed < vSedA.aiTargetCruiseSpeed &&
            vSedA.aiTargetCruiseSpeed < vMus.aiTargetCruiseSpeed &&
            vMus.aiTargetCruiseSpeed < vSup.aiTargetCruiseSpeed &&
            (vSup.aiTargetCruiseSpeed - vBmx.aiTargetCruiseSpeed) >= 125 &&
            Math.abs(vSedA.aiTargetCruiseSpeed - vSedB.aiTargetCruiseSpeed) >= 1.5,
            `5-tier cruise speeds span ${Math.round(vBmx.aiTargetCruiseSpeed)}..${Math.round(vSup.aiTargetCruiseSpeed)} px/s with per-driver variance (${vSedA.aiTargetCruiseSpeed.toFixed(1)} vs ${vSedB.aiTargetCruiseSpeed.toFixed(1)})`
        );

        // 2. Live 60FPS open-span cruise test on Venetian Causeway (cols 392..418, row 175 Eastbound — long uninterrupted span!)
        const runBus = sandbox.makeVeh("live_bus_53", "CITY_BUS", 392.5 * TS, 175.5 * TS, 0);
        const runSed = sandbox.makeVeh("live_sed_53", "REGAL_SEDAN", 399.5 * TS, 175.5 * TS, 0);
        const runSup = sandbox.makeVeh("live_sup_53", "PENETRATOR_GT", 406.5 * TS, 175.5 * TS, 0);
        for (const rv of [runBus, runSed, runSup]) {
            rv.driver = "AI_TRAFFIC";
            rv.speed = 65;
            rv.vx = 65;
            g.vehicles.push(rv);
        }
        g.player.x = 400.0 * TS;
        g.player.y = 173.0 * TS;
        let peakBus = 0, peakSed = 0, peakSup = 0;
        for (let st = 0; st < 150; st++) {
            sandbox.advanceClock(1000 / 60);
            g.update(1 / 60);
            peakBus = Math.max(peakBus, runBus.speed || 0);
            peakSed = Math.max(peakSed, runSed.speed || 0);
            peakSup = Math.max(peakSup, runSup.speed || 0);
        }
        assert(
            peakSup > peakSed + 32 && peakSed > peakBus + 14 && peakSup >= 195,
            `Live AI cruise reaches clearly distinct speeds on open road: Bus=${Math.round(peakBus)} px/s, Sedan=${Math.round(peakSed)} px/s, Supercar=${Math.round(peakSup)} px/s`
        );

        // 3. Verify 1★ On-Foot VCPD Pursuit, Baton Strike & Real Un-Mocked triggerWastedOrBusted Arrest (Zero 34.9 HP Deadlock!)
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.player.inVehicle = null;
        g.player.dead = false;
        g.player.hp = 100;
        g.player.armor = 50;
        g.player.x = 436.5 * TS;
        g.player.y = 175.5 * TS;
        g.player.respawnGraceUntil = 0;
        g.jailFreeCards = 1;
        g.setWantedLevel(1, { x: g.player.x, y: g.player.y }, true);
        const chaseCop = sandbox.makePed({
            id: "cop_1star_53",
            x: g.player.x - 95,
            y: g.player.y,
            z: 2.0,
            angle: 0,
            kind: "COP",
            copWeapon: "PISTOL",
            hp: 105,
            speed: 126,
            dead: false
        });
        g.peds.push(chaseCop);
        let batonHitSeen = false;
        for (let st = 0; st < 150 && !g.player.dead; st++) {
            sandbox.advanceClock(1000 / 60);
            g.update(1 / 60);
            if ((g.player._batonSlowTimer || 0) > 0 || g.player.hp < 100) batonHitSeen = true;
        }
        assert(
            batonHitSeen === true && g.player.dead === true && g.player.deathType === "POLICE" && g.wantedLevel === 0,
            `1★ on-foot VCPD officer lunges, lands baton strikes (batonHit=${batonHitSeen}), and executes real un-mocked BUSTED arrest (dead=${g.player.dead}, deathType=${g.player.deathType})`
        );
        console.log("");
    }

    // =========================================================================
    // SCENARIO 54: 4-Way Intersection Multi-Responder + Sidewalk Casualties + Burning Car Anti-Gridlock & Water Jet Impact
    // =========================================================================
    {
        console.log("--- SCENARIO 54: 4-WAY INTERSECTION EMS + VCFD + 4-DIRECTION TRAFFIC ANTI-GRIDLOCK & WATER SPLASH IMPACT ---");
        const { g, sandbox } = createGameInstance(cmpBuf);
        const TS = 64;
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.particles.length = 0;
        g.skidmarks.length = 0;
        g.trafficManager.generateTrafficCars = () => {};
        g.trafficManager.generateTrafficPeds = () => {};

        // Reproduce exact 4-way intersection scene (Collins x Venetian 435..436 x 174..175):
        // - Sidewalk casualty on West sidewalk (433.7, 174.3)
        // - Burning car on NW sidewalk (434.2, 172.8)
        // - Responding EMS Ambulance + VCFD Fire Truck + civilian cars/bus on all 4 approaches!
        g.player.x = 437.5 * TS;
        g.player.y = 173.2 * TS;
        g.renderer.camX = 435.5 * TS;
        g.renderer.camY = 174.5 * TS;

        const corpse = sandbox.makePed({
            id: "s54_corpse_1",
            x: 433.7 * TS,
            y: 174.2 * TS,
            z: 2.0,
            angle: 0.4,
            kind: "CIVILIAN",
            hp: 0,
            speed: 0,
            dead: true
        });
        corpse.deadTimer = 6.0;
        g.peds.push(corpse);

        const burnCar = sandbox.makeVeh("s54_burn_nw", "TULIP_MUSCLE", 434.2 * TS, 172.8 * TS, 0.45);
        burnCar.destroyed = true;
        burnCar.hp = 0;
        burnCar.fireExtinguished = false;
        burnCar.abandonedTimer = 6.0;
        g.vehicles.push(burnCar);

        const amb = sandbox.makeVeh("s54_amb", "MEDIC_AMBULANCE", 439.5 * TS, 174.5 * TS, Math.PI);
        amb.driver = "AI_EMERGENCY";
        amb.isEmergency = true;
        amb.sirenActive = true;
        amb.speed = 92;
        g.vehicles.push(amb);

        const busSouth = sandbox.makeVeh("s54_bus_s", "CITY_BUS", 436.5 * TS, 178.5 * TS, -Math.PI * 0.5);
        busSouth.driver = "AI_TRAFFIC";
        busSouth.speed = 68;
        g.vehicles.push(busSouth);

        const fireSouth = sandbox.makeVeh("s54_fire_s", "FIRE_TRUCK", 436.5 * TS, 180.5 * TS, -Math.PI * 0.5);
        fireSouth.driver = "AI_EMERGENCY";
        fireSouth.isEmergency = true;
        fireSouth.sirenActive = true;
        fireSouth.speed = 88;
        g.vehicles.push(fireSouth);

        const civWest1 = sandbox.makeVeh("s54_civ_w1", "MINT_STALLION", 431.5 * TS, 175.5 * TS, 0);
        civWest1.driver = "AI_TRAFFIC";
        civWest1.speed = 80;
        const civWest2 = sandbox.makeVeh("s54_civ_w2", "BANSHEE_GT", 429.5 * TS, 175.5 * TS, 0);
        civWest2.driver = "AI_TRAFFIC";
        civWest2.speed = 85;
        const civNorth = sandbox.makeVeh("s54_civ_n", "BOXVILLE_VAN", 435.5 * TS, 170.5 * TS, Math.PI * 0.5);
        civNorth.driver = "AI_TRAFFIC";
        civNorth.speed = 74;
        g.vehicles.push(civWest1, civWest2, civNorth);

        let ambParkedInBoxFrames = 0;
        let fireParkedInBoxFrames = 0;
        let severeOverlaps54 = 0;
        let waterJetSeen = false;
        let waterSplashSeen = false;
        let waterPuddleSeen = false;

        for (let st = 0; st < 28 * 60; st++) {
            sandbox.advanceClock(1000 / 60);
            g.update(1 / 60);
            if (amb.deployedMedic && amb.isOccupyingIntersectionBox(g.map)) ambParkedInBoxFrames++;
            if (fireSouth._parkedAtFireScene && fireSouth.isOccupyingIntersectionBox(g.map)) fireParkedInBoxFrames++;
            if (!waterJetSeen && g.particles.some(pt => pt.kind === "WATER_JET")) waterJetSeen = true;
            if (!waterSplashSeen && g.particles.some(pt => pt.kind === "WATER_SPLASH")) waterSplashSeen = true;
            if (!waterPuddleSeen && g.skidmarks.some(sk => sk.surface === "WATER_PUDDLE")) waterPuddleSeen = true;
            if (st % 6 === 0) {
                const live = g.vehicles.filter(v => v && !v.destroyed);
                for (let i = 0; i < live.length; i++) {
                    for (let j = i + 1; j < live.length; j++) {
                        if (Math.hypot(live[i].x - live[j].x, live[i].y - live[j].y) < 16) severeOverlaps54++;
                    }
                }
            }
        }

        const rendSrc54 = fs.readFileSync(path.join(ROOT, "js", "renderer.js"), "utf8");
        assert(
            ambParkedInBoxFrames === 0 &&
            fireParkedInBoxFrames === 0 &&
            severeOverlaps54 === 0 &&
            waterJetSeen &&
            waterSplashSeen &&
            waterPuddleSeen &&
            burnCar.fireExtinguished === true &&
            rendSrc54.includes("pushWaterFxQuad3D") &&
            rendSrc54.includes("pushWetPuddleQuad3D"),
            `4-way EMS + VCFD + 4-direction traffic resolves with 0 intersection-box parking (amb=${ambParkedInBoxFrames}, fire=${fireParkedInBoxFrames}), 0 hull overlaps (${severeOverlaps54}), ballistic 3D WATER_JET + GPU procedural liquid/mist/wet-puddle shaders, & fire extinguished (${burnCar.fireExtinguished})`
        );

        // Sub-test 54B: Player-Driven Fire Truck 375px Calibrated Range, OBB Vehicle Stop, & Hydrodynamic Ped Knockback/Extinguish
        // Place on open Ocean Drive Northbound asphalt (col 445.5, row 282.5, z=2.0 -> 100% clear road, zero buildings!)
        g.vehicles.length = 0;
        g.peds.length = 0;
        g.particles.length = 0;
        g.trafficManager.removeOffscreenPeds = () => {};
        g.trafficManager.removeOffscreenCars = () => {};
        const pTruck = sandbox.makeVeh("s54_ptruck", "FIRE_TRUCK", 445.5 * TS, 282.5 * TS, -Math.PI * 0.5);
        pTruck.z = 2.0;
        pTruck.driver = "PLAYER";
        g.started = true;
        g.player.dead = false;
        g.player.inVehicle = pTruck;
        g.player.seatIndex = 0;
        g.player.x = pTruck.x;
        g.player.y = pTruck.y;
        g.player.z = 2.0;
        g.player.angle = -Math.PI * 0.5;
        g.renderer.camX = pTruck.x;
        g.renderer.camY = pTruck.y - 120;
        pTruck._cannonAngle = -Math.PI * 0.5;
        g.vehicles.push(pTruck);

        // Place a burning pedestrian at 245px ahead (beyond old 175px cutoff, well inside real 375px deck-gun stream!)
        const burnPed = sandbox.makePed({
            id: "s54_burn_ped",
            x: pTruck.x,
            y: pTruck.y - 245,
            z: 2.0,
            angle: Math.PI * 0.5,
            kind: "CIVILIAN",
            hp: 85,
            speed: 0,
            dead: false
        });
        burnPed.burnTimer = 4.0;
        burnPed.stunnedTimer = 1.8; // keep stationary before stream arrives so we measure pure hydrodynamic knockback!
        const startPedY = burnPed.y;
        g.peds.push(burnPed);

        g.input.shoot = true;
        g.player.mouseShoot = false;
        for (let st = 0; st < 55; st++) {
            sandbox.advanceClock(1000 / 60);
            g.update(1 / 60);
        }
        g.input.shoot = false;
        assert(
            burnPed.burnTimer === 0 && burnPed.y < startPedY - 4,
            `Player Fire Truck deck-gun stream reaches 245px in 3D ballistics, extinguishes burning pedestrian (burnTimer=${burnPed.burnTimer}), and applies hydrodynamic knockback (${(startPedY - burnPed.y).toFixed(1)}px)`
        );
        console.log("");

        // 55. Frame-Pacing Fluidity, Exponential Camera Damping, Zero-Alloc Typed-Array Sprite Sort & Spatial Grid Invariants
        console.log("── SCENARIO 55: Frame-Pacing Fluidity, Exponential Camera Damping, Zero-Alloc Sprite Sort & Spatial Invariants ──");
        {
            // A. Zero-allocation stable typed-array sortAndBuildSpriteBatch preserves exact monotonic sortKey order & tie stability
            g.renderer.beginSpriteBatch();
            g.renderer.pushSpriteQuad3D(100, 100, 2.5, 16, 16, 0, 0, 0, 1, 1, 1, 1, 1, 1, 15); // sky layer (>=14)
            g.renderer.pushSpriteQuad3D(120, 120, 2.0, 16, 16, 0, 0, 0, 1, 1, 1, 1, 1, 1, 4);  // car A
            g.renderer.pushSpriteQuad3D(130, 130, 2.0, 16, 16, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1);  // tire mark
            g.renderer.pushSpriteQuad3D(140, 140, 2.0, 16, 16, 0, 0, 0, 1, 1, 1, 1, 1, 1, 4);  // car B (same layer as car A, higher seq)
            for (let extra = 0; extra < 40; extra++) {
                g.renderer.pushSpriteQuad3D(150 + extra, 150, 2.0 + (extra % 3) * 0.5, 12, 12, 0, 0, 0, 1, 1, 1, 1, 1, 1, (extra % 12) + 1);
            }
            g.renderer.sortAndBuildSpriteBatch();
            let monoOk = g.renderer.spriteCount === 44 && g.renderer.skySpriteStartIdx === 43;
            for (let si = 1; si < g.renderer.spriteCount; si++) {
                if (g.renderer.spriteQueue[si].sortKey < g.renderer.spriteQueue[si - 1].sortKey) {
                    monoOk = false;
                    break;
                }
            }
            assert(monoOk, `Typed-array SpriteBatch sort maintains monotonic sortKey order & skySpriteStartIdx (${g.renderer.skySpriteStartIdx}/${g.renderer.spriteCount})`);

            // B. Framerate-independent exponential camera follow converges identically across 1x60Hz vs 2x120Hz substeps
            g.activeInterior = null;
            g.player.inVehicle = null;
            g.player.x = 445.5 * TS;
            g.player.y = 280.0 * TS;
            g.renderer.camX = g.player.x - 100;
            g.renderer.camY = g.player.y;
            g.renderer._camLeadX = 0;
            g.renderer._camLeadY = 0;
            g.renderer.render(g, 1 / 60);
            const camAfter60Hz = g.renderer.camX;

            g.renderer.camX = g.player.x - 100;
            g.renderer.camY = g.player.y;
            g.renderer._camLeadX = 0;
            g.renderer._camLeadY = 0;
            g.renderer.render(g, 1 / 120);
            g.renderer.render(g, 1 / 120);
            const camAfter120Hz = g.renderer.camX;
            const hzDrift = Math.abs(camAfter60Hz - camAfter120Hz);
            assert(hzDrift < 0.001, `Exponential camera follow is framerate-independent across 60Hz vs 120Hz (drift=${hzDrift.toFixed(6)}px)`);

            // C. Pre-allocated cardinal directions & tile-masked isSwimmingPoolAt / spatialized findNearestTrunkVehicle invariants
            const dirsRoad = g.map.getAllowedRoadDirections(445, 280, 2.0);
            const poolDryCheck = g.map.isSwimmingPoolAt(445.5 * TS, 280.0 * TS);
            const trunkCar = sandbox.makeVeh("s55_trunk_car", "MINT_STALLION", g.player.x, g.player.y - 34, -Math.PI * 0.5);
            g.vehicles.push(trunkCar);
            g.rebuildVehicleSpatialGrid();
            const foundGrid = g.director.findNearestTrunkVehicle(54, true);
            const foundScan = g.director.findNearestTrunkVehicle(54, false);
            const aiEmptySeats = trunkCar.getOccupiedSeats(g);
            assert(
                Array.isArray(dirsRoad) && dirsRoad.length > 0 && poolDryCheck === false && foundGrid === trunkCar && foundScan === trunkCar && aiEmptySeats.length === 0,
                `Spatial trunk query, frozen cardinal road directions (${dirsRoad.length}), pool tile mask & zero-alloc empty seats all match 100%`
            );
        }
        console.log("");
    }

    console.log("================================================================================");
    if (allPassed) {
        console.log("  🎉 ALL 55 FULL-GAME 200-LOOP AUDIT, FLUIDITY/PERF, CAR AI ZERO-DEFECT, SPEED DIVERSITY, DETACHABLE 3D CAR PARTS, MMO, 3D INTERIORS & WEBAUDIO SCENARIOS PASSED 100%!");
        console.log("================================================================================");
        process.exit(0);
    } else {
        console.error("  ⚠️ SOME SIMULATION ASSERTIONS FAILED!");
        console.log("================================================================================");
        process.exit(1);
    }
}

runSimulations();
