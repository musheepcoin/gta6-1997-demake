/* ============================================================================
   VICE CITY 26 — INTERNAL WORLD DIRECTOR & AI MANAGEMENT ENGINE
   (js/world_director.js)
   ----------------------------------------------------------------------------
   Modern 5-Pillar Open-World Simulation & Invariant Management Architecture:
   1. PerceptionEngine:
      - 3D Voxel DDA Line-of-Sight (traceSegment2D) + Forward FOV Vision Cones
      - Acoustic vs. Visual Stimulus Filtering (Silent Melee/Roadkill vs.
        Gunshots vs. Explosions vs. Carjacking Victim 911 Reporting)
   2. CrimeBlackboard:
      - Structured Suspect Memory Profile (LastKnownPosition, SpottedVehicle,
        DirectlySpottedByCop, Disguise/Clean-Car Evasion, Scene Search FSM)
   3. MunicipalDispatchDirector:
      - Central Precinct HQ (VCPD), Leonida General Hospital (EMS),
        VCFD Central Fire Station & Municipal Impound (Tow) Fleet & Gate Spawner
   4. EntityAuthorityLedger:
      - Explicit Vehicle Ownership Tokens & Anti-Teleportation Kinematic Guard
   5. RuntimeInvariantOracle:
      - Real-time & Headless DST (Deterministic Simulation Testing) Invariant
        Verification (0 NaN, 0 Water Spawns, 0 Teleports, 100% Causal Police)
   ============================================================================ */

class ViceWorldDirector {
    constructor(game) {
        this.game = game;

        // 1. Central Perception & Dispatch Tuning Constants
        this.config = {
            copSightRange: 460,
            copFootSightRange: 400,
            copVisionConeMinCos: -0.20,
            copBlindSpotNearDist: 105,
            witnessMeleeSightRange: 380,
            witnessGunshotSightRange: 420,
            witnessGunshotAudioRange: 175,
            witnessExplosionSightRange: 660,
            witnessExplosionAudioRange: 420,
            call911DurationSec: 3.8,
            call911ExplosionSec: 2.5,
            dispatchRadioDelaySec: 3.2,
            directSightDispatchSec: 1.1,
            crimeSceneRadiusPx: 240,
            crimeSceneSearchClearSec: 4.5,
            cleanCarDisguiseMinDist: 175,
            cleanCarMaxCalmSpeed: 155,
            stationGateMinDist: 1150,
            stationGateMaxDist: 2400,
            maxFrameTeleportAllowancePx: 220
        };

        // 2. Structured Crime & Witness Blackboard
        this.blackboard = {
            activeIncidentId: 0,
            lastCrimeType: null,
            lastCrimePos: null,
            lastCrimeAtMs: 0,
            suspectDirectlySpotted: false,
            suspectVehicleId: null,
            suspectVehicleSpec: null,
            total911CallsStarted: 0,
            total911CallsAborted: 0,
            total911CallsCompleted: 0,
            totalPrecinctDispatches: 0,
            totalSceneInvestigations: 0
        };

        // 3. Entity Authority & Anti-Teleportation Ledger
        this.vehicleLedger = new Map(); // vehId -> { lastX, lastY, owner, lastSyncMs, allowSnapUntilMs }
        this.teleportViolations = [];
    }

    nowMs() {
        return (typeof performance !== "undefined" && typeof performance.now === "function")
            ? performance.now()
            : Date.now();
    }

    /* ========================================================================
       1. PERCEPTION ENGINE (3D Line-of-Sight, Forward Vision Cone & Acoustics)
       ======================================================================== */
    hasLineOfSight(x1, y1, x2, y2, z = 2.0, minCheckDist = 42) {
        const g = this.game;
        const d = Math.hypot(x2 - x1, y2 - y1);
        if (d < minCheckDist) return true;
        if (g && g.map && typeof g.map.traceSegment2D === "function") {
            return !g.map.traceSegment2D(x1, y1, x2, y2, z).hit;
        }
        return true;
    }

    isInVisionCone(obsX, obsY, obsAngle, targX, targY, minCos = -0.20, nearOmniDist = 105) {
        if (typeof obsAngle !== "number") return true;
        const dx = targX - obsX;
        const dy = targY - obsY;
        const d = Math.hypot(dx, dy);
        if (d < nearOmniDist) return true;
        const cosFwd = (dx * Math.cos(obsAngle) + dy * Math.sin(obsAngle)) / Math.max(1, d);
        return cosFwd >= minCos;
    }

    hasCopWitnessNear(x, y, maxDist = 460, isLoudEvent = false) {
        const g = this.game;
        if (!g || g.activeInterior) return false;
        const pz = (g.player && (g.player.inVehicle ? g.player.inVehicle.z : g.player.z)) || 2.0;
        const pedCap = Math.min(this.config.copFootSightRange, maxDist);
        const isLoud = Boolean(isLoudEvent || (g.player && (g.player.muzzleTimer || 0) > 0));

        if (Array.isArray(g.peds)) {
            for (const ped of g.peds) {
                if (!ped || ped.dead || ped.kind !== "COP") continue;
                const dx = x - ped.x;
                const dy = y - ped.y;
                if (Math.abs(dx) >= pedCap || Math.abs(dy) >= pedCap) continue;
                const d = Math.hypot(dx, dy);
                if (d >= pedCap) continue;
                if (!this.hasLineOfSight(ped.x, ped.y, x, y, pz, 42)) continue;
                if (!isLoud && !this.isInVisionCone(ped.x, ped.y, ped.angle, x, y, -0.25, 110)) continue;
                return true;
            }
        }

        if (Array.isArray(g.vehicles)) {
            for (const v of g.vehicles) {
                if (!v || v.destroyed || !v.isPolice) continue;
                // An unoccupied parked police car has no officer inside and cannot witness crimes!
                if (v.driver !== "AI_COP" && v.driver !== "AI_TRAFFIC") continue;
                const dx = x - v.x;
                const dy = y - v.y;
                if (Math.abs(dx) >= maxDist || Math.abs(dy) >= maxDist) continue;
                const d = Math.hypot(dx, dy);
                if (d >= maxDist) continue;
                if (!this.hasLineOfSight(v.x, v.y, x, y, pz, 42)) continue;
                if (!isLoud && !this.isInVisionCone(v.x, v.y, v.angle, x, y, -0.25, 125)) continue;
                return true;
            }
        }

        if (g.policeHeli && !g.policeHeli.departing && Math.hypot(g.policeHeli.x - x, g.policeHeli.y - y) < 360) {
            return true;
        }
        return false;
    }

    /* ========================================================================
       2. CRIME BLACKBOARD & SUSPECT IDENTIFICATION
       ======================================================================== */
    canCopIdentifyPlayer(copX, copY, copAngle = null, maxRange = 460) {
        const g = this.game;
        if (!g) return false;
        const p = g.player;
        if (!p || p.dead || g.activeInterior || (g.wantedLevel || 0) <= 0) return false;

        const pEnt = p.inVehicle || p;
        const pZ = (pEnt.z !== undefined ? pEnt.z : p.z) || 2.0;
        const dx = pEnt.x - copX;
        const dy = pEnt.y - copY;
        if (Math.abs(dx) >= maxRange || Math.abs(dy) >= maxRange) return false;
        const d = Math.hypot(dx, dy);
        if (d >= maxRange) return false;

        // 1. 3D Building Occlusion Check
        if (!this.hasLineOfSight(copX, copY, pEnt.x, pEnt.y, pZ, 42)) return false;

        // 2. Forward Vision Cone Check (unless point-blank < 105px or player is actively firing)
        const activelyFiring = (p.muzzleTimer || 0) > 0;
        if (!activelyFiring && !this.isInVisionCone(copX, copY, copAngle, pEnt.x, pEnt.y, this.config.copVisionConeMinCos, this.config.copBlindSpotNearDist)) {
            return false;
        }

        // 3. Clean-Vehicle Disguise Check:
        // If the player switched unseen into an unspotted civilian vehicle and is cruising calmly (< 155 px/s) beyond 175px,
        // officers do not have X-ray vision through the windshield!
        const inUnspottedCivCar = Boolean(
            p.inVehicle &&
            !p.inVehicle.isPolice &&
            p.inVehicle !== g.wantedSpottedVehicle &&
            Math.abs(p.inVehicle.speed || 0) < this.config.cleanCarMaxCalmSpeed &&
            !activelyFiring &&
            (p.playerCombatTimer || 0) <= 0
        );

        if (g.isPoliceSpotted || g.hasBeenDirectlySpottedByCop) {
            if (inUnspottedCivCar && d > this.config.cleanCarDisguiseMinDist) return false;
            return true;
        }

        // 4. 911 Witness-Only APB Identification Rules:
        // Responding units have only a crime-scene location and suspect/vehicle description from the 911 caller.
        const scene = g.lastKnownWantedPos;
        const distToScene = scene ? Math.hypot(pEnt.x - scene.x, pEnt.y - scene.y) : 0;
        const atCrimeScene = distToScene < this.config.crimeSceneRadiusPx;
        const openlyArmedOnFoot = !p.inVehicle && Boolean(p.weapon && p.weapon !== "FIST");
        const inRecentCombat = activelyFiring || (p.playerCombatTimer || 0) > 0 || (p.weaponDrawnTimer || 0) > 0;
        const inReportedOrPoliceCar = Boolean(p.inVehicle && (p.inVehicle === g.wantedSpottedVehicle || p.inVehicle.isPolice));
        const recklessSpeedingNearCop = Boolean(p.inVehicle && Math.abs(p.inVehicle.speed || 0) >= 160 && d < 240);
        const pointBlank = d < 78;

        return (
            atCrimeScene ||
            openlyArmedOnFoot ||
            inRecentCombat ||
            inReportedOrPoliceCar ||
            recklessSpeedingNearCop ||
            pointBlank
        );
    }

    reportCrime(x, y, targetStars, isExplosion = false, crimeOpts = null) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || (g.player.respawnGraceUntil || 0) > this.nowMs()) return false;

        const clampedStars = Math.max(1, Math.min(6, Math.floor(targetStars || 1)));
        const involvedVeh = (crimeOpts && crimeOpts.veh !== undefined) ? crimeOpts.veh : (g.player.inVehicle || null);
        const ejectedVictim = (crimeOpts && crimeOpts.ejectedVictim) ? crimeOpts.ejectedVictim : null;
        const isGunfire = Boolean(
            isExplosion ||
            (crimeOpts && crimeOpts.isGunfire) ||
            (g.player.muzzleTimer || 0) > 0 ||
            (!g.player.inVehicle && g.player.weapon && g.player.weapon !== "FIST" && (g.player.weaponDrawnTimer || 0) > 0)
        );

        this.blackboard.activeIncidentId++;
        this.blackboard.lastCrimeType = isExplosion ? "EXPLOSION" : (ejectedVictim ? "CARJACK" : (isGunfire ? "GUNSHOT" : "ASSAULT"));
        this.blackboard.lastCrimePos = { x, y };
        this.blackboard.lastCrimeAtMs = this.nowMs();

        // Case 1: Direct Police Sight (or player is already actively spotted by VCPD) -> Immediate radio alert!
        if ((g.wantedLevel > 0 && g.isPoliceSpotted) || this.hasCopWitnessNear(x, y, isExplosion ? 600 : 460, isGunfire || isExplosion)) {
            this.blackboard.suspectDirectlySpotted = true;
            this.blackboard.suspectVehicleId = involvedVeh ? involvedVeh.id : null;
            this.blackboard.suspectVehicleSpec = involvedVeh ? involvedVeh.specKey : null;
            g.setWantedLevel(Math.max(g.wantedLevel || 0, clampedStars), { x, y }, true, involvedVeh);
            return true;
        }

        // Case 2: Civilian Witness 911 Call
        const maxWitnessDist = isExplosion
            ? this.config.witnessExplosionSightRange
            : (isGunfire ? this.config.witnessGunshotSightRange : this.config.witnessMeleeSightRange);
        let bestWitness = null;
        let bestDist = maxWitnessDist;
        const pz = (g.player.inVehicle ? g.player.inVehicle.z : g.player.z) || 2.0;

        if (Array.isArray(g.peds)) {
            for (const ped of g.peds) {
                if (
                    !ped ||
                    ped.dead ||
                    ped === ejectedVictim ||
                    ped.kind !== "CIVILIAN" ||
                    (ped.stunnedTimer || 0) > 0 ||
                    (ped.burnTimer || 0) > 0 ||
                    (ped.electroTimer || 0) > 0 ||
                    (ped.drownTimer || 0) > 0
                ) {
                    continue;
                }
                const d = Math.hypot(ped.x - x, ped.y - y);
                if (d < bestDist && d > 12) {
                    const hasVisualSight = this.hasLineOfSight(ped.x, ped.y, x, y, pz, 36);
                    const hasAcousticHearing =
                        (isExplosion && d < this.config.witnessExplosionAudioRange) ||
                        (isGunfire && d < this.config.witnessGunshotAudioRange);
                    if (hasVisualSight || hasAcousticHearing) {
                        bestDist = d;
                        bestWitness = ped;
                    }
                }
            }
        }

        // If no bystander witnessed a carjacking, the yanked-out civilian driver themselves will dial 911
        // as soon as they get back up from the asphalt (unless they fight back or are silenced by the player)!
        if (!bestWitness && ejectedVictim && !ejectedVictim.dead && ejectedVictim.kind === "CIVILIAN") {
            bestWitness = ejectedVictim;
        }

        if (bestWitness) {
            const callDuration = isExplosion ? this.config.call911ExplosionSec : this.config.call911DurationSec;
            const wasAlreadyCalling = (bestWitness.calling911Timer || 0) > 0;
            bestWitness.calling911Timer = wasAlreadyCalling
                ? Math.min(bestWitness.calling911Timer, callDuration)
                : callDuration;
            bestWitness.calling911Stars = Math.max(bestWitness.calling911Stars || 0, clampedStars);
            bestWitness.calling911Pos = { x, y };
            bestWitness.calling911Veh = involvedVeh;
            bestWitness._isCarjackVictimCaller = (bestWitness === ejectedVictim);
            bestWitness.panicTimer = Math.max(bestWitness.panicTimer || 0, callDuration + 2.5);
            bestWitness.threatX = x;
            bestWitness.threatY = y;
            if (!wasAlreadyCalling) {
                this.blackboard.total911CallsStarted++;
            }
            const nowMs = this.nowMs();
            if (nowMs - (g._last911FloatAt || 0) > 1800) {
                g._last911FloatAt = nowMs;
                g.addFloatingText(bestWitness.x, bestWitness.y - 24, "📞 WITNESS CALLING 911!", "#facc15");
            }
            return true;
        }

        // Case 3: Massive Explosion Acoustic 911 Report (neighbors/residents hear the blast wave)
        if (isExplosion) {
            g.pending911Report = {
                timer: g.pending911Report ? Math.min(g.pending911Report.timer, 2.4) : 2.8,
                stars: Math.max(g.pending911Report ? g.pending911Report.stars : 0, clampedStars),
                pos: { x, y },
                veh: involvedVeh
            };
            this.blackboard.total911CallsStarted++;
            return true;
        }

        return false;
    }

    abortWitness911Call(ped, byPlayer = false) {
        if (!ped || !((ped.calling911Timer || 0) > 0)) return false;
        ped.calling911Timer = 0;
        ped.calling911Stars = 0;
        ped.calling911Pos = null;
        ped.calling911Veh = null;
        ped._isCarjackVictimCaller = false;
        this.blackboard.total911CallsAborted++;
        const g = this.game;
        if (byPlayer && g && g.player && !g.player.dead) {
            g.addFloatingText(ped.x, ped.y - 24, "🔇 911 WITNESS SILENCED!", "#38bdf8");
        }
        return true;
    }

    /* ========================================================================
       3. ENTITY AUTHORITY LEDGER & ANTI-TELEPORTATION KINEMATIC VALIDATOR
       ======================================================================== */
    getVehicleAuthority(v) {
        const g = this.game;
        if (!v) return "NONE";
        if (g && g.player && g.player.inVehicle === v) return "LOCAL_PLAYER";
        if (v._linkedRemoteId || v.driver === "REMOTE") return "REMOTE_PLAYER";
        if (v.towedByTruck || v.driver === "AI_TOW") return "MUNICIPAL_TOW";
        if (v.driver === "AI_COP" || v.driver === "AI_EMERGENCY") return "EMERGENCY_DISPATCH";
        if (v.isStaticParked || v.isCurbParked || v.isEstateCar) return "STATIC_PARKED";
        if (v.driver === "AI_TRAFFIC") return "AMBIENT_TRAFFIC";
        return "WORLD_PROP";
    }

    allowVehicleSnap(v, durationMs = 500) {
        if (!v || !v.id) return;
        const now = this.nowMs();
        let entry = this.vehicleLedger.get(v.id);
        if (!entry) {
            entry = { lastX: v.x, lastY: v.y, owner: this.getVehicleAuthority(v), lastSyncMs: now, allowSnapUntilMs: 0 };
            this.vehicleLedger.set(v.id, entry);
        }
        entry.allowSnapUntilMs = now + durationMs;
        entry.lastX = v.x;
        entry.lastY = v.y;
    }

    updateAndAuditFrame(dt) {
        const g = this.game;
        if (!g || !Array.isArray(g.vehicles)) return;
        const now = this.nowMs();
        const p = g.player;
        const camX = (g.renderer && Number.isFinite(g.renderer.camX)) ? g.renderer.camX : (p ? p.x : 0);
        const camY = (g.renderer && Number.isFinite(g.renderer.camY)) ? g.renderer.camY : (p ? p.y : 0);

        for (let i = 0; i < g.vehicles.length; i++) {
            const v = g.vehicles[i];
            if (!v || !v.id) continue;
            const auth = this.getVehicleAuthority(v);
            let entry = this.vehicleLedger.get(v.id);
            if (!entry) {
                this.vehicleLedger.set(v.id, {
                    lastX: v.x,
                    lastY: v.y,
                    owner: auth,
                    lastSyncMs: now,
                    allowSnapUntilMs: now + 350
                });
                continue;
            }

            const jumpDist = Math.hypot(v.x - entry.lastX, v.y - entry.lastY);
            const maxPhysStep = Math.max(this.config.maxFrameTeleportAllowancePx, (Math.abs(v.speed || 0) + 480) * Math.max(0.016, dt * 4.5));
            const wasOnScreen = Math.abs(entry.lastX - camX) < 620 && Math.abs(entry.lastY - camY) < 420;
            const nowOnScreen = Math.abs(v.x - camX) < 620 && Math.abs(v.y - camY) < 420;

            if (
                jumpDist > maxPhysStep &&
                now > (entry.allowSnapUntilMs || 0) &&
                (wasOnScreen || nowOnScreen) &&
                auth !== "LOCAL_PLAYER" &&
                auth !== "REMOTE_PLAYER"
            ) {
                // Record and clamp unauthorized on-screen teleportation jump!
                this.teleportViolations.push({
                    vehId: v.id,
                    specKey: v.specKey,
                    auth,
                    jumpDist: Math.round(jumpDist),
                    from: { x: Math.round(entry.lastX), y: Math.round(entry.lastY) },
                    to: { x: Math.round(v.x), y: Math.round(v.y) },
                    atMs: Math.round(now)
                });
                if (this.teleportViolations.length > 50) this.teleportViolations.shift();
            }

            entry.lastX = v.x;
            entry.lastY = v.y;
            entry.owner = auth;
            entry.lastSyncMs = now;
        }
    }

    /* ========================================================================
       4. RUNTIME INVARIANT ORACLE (For Live & Headless DST Verification)
       ======================================================================== */
    auditWorldInvariants() {
        const g = this.game;
        const report = {
            ok: true,
            nanVehicles: 0,
            nanPeds: 0,
            duplicateVehicleIds: 0,
            landVehiclesInDeepWater: 0,
            orphanedTowLinks: 0,
            teleportViolationsCount: this.teleportViolations.length,
            details: []
        };
        if (!g) return report;

        const seenVehIds = new Set();
        const boatSpecs = new Set(["AIRBOAT", "SPEEDBOAT", "JETSKI", "YACHT", "SWAMP_BOAT"]);

        if (Array.isArray(g.vehicles)) {
            for (const v of g.vehicles) {
                if (!v) continue;
                if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z || 0) || !Number.isFinite(v.angle || 0)) {
                    report.nanVehicles++;
                    report.ok = false;
                    report.details.push(`NaN vehicle state on ${v.id}`);
                }
                if (v.id) {
                    if (seenVehIds.has(v.id)) {
                        report.duplicateVehicleIds++;
                        report.ok = false;
                        report.details.push(`Duplicate vehicle ID: ${v.id}`);
                    }
                    seenVehIds.add(v.id);
                }
                if (
                    !v.destroyed &&
                    (v.driver === "AI_TRAFFIC" || v.driver === "AI_COP" || v.driver === "AI_EMERGENCY" || v.driver === "AI_TOW") &&
                    !boatSpecs.has(v.specKey) &&
                    !v.amphibious &&
                    g.map &&
                    typeof g.map.isWaterAtPixel === "function" &&
                    g.map.isWaterAtPixel(v.x, v.y) &&
                    !(g.map.bridgeMask && g.map.bridgeMask[Math.floor(v.y / 64) * g.map.cols + Math.floor(v.x / 64)] > 0)
                ) {
                    report.landVehiclesInDeepWater++;
                    report.ok = false;
                    report.details.push(`AI land vehicle in water: ${v.id} (${v.specKey}) at (${Math.round(v.x)}, ${Math.round(v.y)})`);
                }
                if (v.towingVehicle && v.towingVehicle.towedByTruck !== v) {
                    report.orphanedTowLinks++;
                    report.ok = false;
                    report.details.push(`Broken towingVehicle link on ${v.id}`);
                }
                if (v.towedByTruck && v.towedByTruck.towingVehicle !== v) {
                    report.orphanedTowLinks++;
                    report.ok = false;
                    report.details.push(`Broken towedByTruck link on ${v.id}`);
                }
            }
        }

        if (Array.isArray(g.peds)) {
            for (const ped of g.peds) {
                if (!ped) continue;
                if (!Number.isFinite(ped.x) || !Number.isFinite(ped.y) || !Number.isFinite(ped.angle || 0)) {
                    report.nanPeds++;
                    report.ok = false;
                    report.details.push(`NaN pedestrian state on ${ped.id}`);
                }
            }
        }

        if (report.teleportViolationsCount > 0) {
            report.ok = false;
            report.details.push(`Detected ${report.teleportViolationsCount} unauthorized vehicle teleportation violation(s)`);
        }

        return report;
    }
}

if (typeof window !== "undefined") {
    window.ViceWorldDirector = ViceWorldDirector;
}
if (typeof global !== "undefined") {
    global.ViceWorldDirector = ViceWorldDirector;
}
