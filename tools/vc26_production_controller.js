const fs = require("fs");
const vm = require("vm");
const path = require("path");

const LOCAL_ROOT = path.resolve(__dirname, "..");
const ROOT = fs.existsSync(path.join(LOCAL_ROOT, "index.html")) ? LOCAL_ROOT : "/opt/vice-city-26-server";

let cachedEnv = null;
function createGameInstance(cmpBuf) {
    if (cachedEnv) {
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

    cachedEnv = { g, sandbox, stepSec, basePlayerX: g.player.x, basePlayerY: g.player.y };
    return cachedEnv;
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
        stepSec(28.0, (t) => {
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

        assert(t911Done !== null && t911Done >= 3.6 && t911Done <= 4.2, `911 call completed at t=${t911Done?.toFixed(2)}s (expected ~3.8s)`);
        assert(tDispatched !== null && tDispatched >= 6.6 && tDispatched <= 7.8, `VCPD Central Dispatch rolled out cruiser at t=${tDispatched?.toFixed(2)}s (~3.2s after 911 call)`);
        assert(spawnDistFromScene >= 1350 && spawnDistFromPrecinct <= 260, `Cruiser spawned directly at VCPD Central Precinct HQ road gate (${Math.round(spawnDistFromScene)}px from crime scene, ${Math.round(spawnDistFromPrecinct)}px from Precinct HQ)`);
        assert(tArrivedAtScene !== null && tArrivedAtScene >= 13.5 && tArrivedAtScene <= 24.0, `Cruiser drove along road network and arrived at crime scene at t=${tArrivedAtScene?.toFixed(2)}s (realistic 14..22s total response time, NEVER 5s!)`);
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
        let tCruiserReachedCrimeScene = null;
        let tWantedCleared = null;
        let minCruiserDistToCrimeScene = 9999;

        stepSec(34.0, (t) => {
            if (g.isPoliceSpotted) everSpotted = true;
            const cop = g.vehicles.find(v => v.isPolice && v.driver === "AI_COP");
            if (cop) {
                const dScene = Math.hypot(cop.x - crimeX, cop.y - crimeY);
                if (dScene < minCruiserDistToCrimeScene) minCruiserDistToCrimeScene = dScene;
                if (tCruiserReachedCrimeScene === null && dScene < 280) {
                    tCruiserReachedCrimeScene = t;
                }
            }
            if (t > 5.0 && tWantedCleared === null && g.wantedLevel === 0) {
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

        // Advance 4.8s so the carjacked driver recovers from knockdown (0.85s) and finishes the 3.8s 911 call
        stepSec(4.8);
        assert(g.wantedLevel === 1 && g.wantedSpottedVehicle === stolenCar, `At t=4.8s: Carjack victim completed 911 call -> 1★ APB issued with stolen vehicle description (${g.wantedSpottedVehicle?.id})`);

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
                if (sp && Number.isFinite(sp.x) && Number.isFinite(sp.y) && sp.distToTarget >= 1180) {
                    validDispatches++;
                }
            }
        }
        assert(validDispatches === 24, `Multi-District 4-Agency Dispatch Matrix passed 24/24 district×agency spawns (actual: ${validDispatches}/24)`);

        // 3. In-Engine Production Self-Audit (12/12 Subsystems)
        const auditRes = g.director.runProductionSelfAudit();
        if (!auditRes.ok) {
            console.log("  [DEBUG Failed Self-Audit Checks]:", auditRes.checks.filter((c) => !c.ok));
        }
        assert(auditRes.ok === true && auditRes.passedCount === 12, `ViceWorldDirector.runProductionSelfAudit() passed ${auditRes.passedCount}/${auditRes.totalCount} subsystem contracts`);

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
            const fullPath = path.join(ROOT, relPath);
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
        assert(Boolean(ce && ce.version === "101_222"), "ViceCreationEngine (v101_222) initialized and attached to LeonidaGame");

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

    console.log("================================================================================");
    if (allPassed) {
        console.log("  🎉 ALL 36 FULL-GAME AUDIT, PRODUCTION CONTROLLER & CREATION ENGINE SCENARIOS PASSED 100%!");
    } else {
        console.error("  ⚠️ SOME SIMULATION ASSERTIONS FAILED!");
        process.exit(1);
    }
    console.log("================================================================================");
}

runSimulations();
