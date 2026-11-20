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
            totalSceneInvestigations: 0,
            totalTrunksLooted: 0,
            totalViralClips: 0,
            totalStickUps: 0,
            totalTrackersJammed: 0,
            totalTrackerPings: 0,
            totalFocusBursts: 0,
            totalGatorsWrangled: 0,
            totalSpikeStripsDeployed: 0,
            totalSpikeStripHits: 0,
            totalTakeoverHypes: 0,
            totalSmugglerExports: 0,
            totalMedicDispatches: 0,
            totalFireDispatches: 0,
            totalTowDispatches: 0,
            totalAnomaliesHealed: 0,
            totalLaneBottlenecks: 0,
            totalIntersectionDetours: 0,
            totalTrafficWardensDispatched: 0,
            totalTrafficWardenDirectives: 0,
            totalTrafficWardenBoardings: 0
        };

        // 2C. Real-Time Navigable Lane Flow Tracker & In-Game Traffic AI Warden State
        this.laneTracker = {
            scanAccumSec: 0,
            congestedTilesCount: 0,
            activeBottlenecks: [],
            activeWardensCount: 0,
            totalBottlenecksDetected: 0,
            totalBottlenecksResolved: 0,
            totalWardensDispatched: 0,
            totalWardenDirectives: 0,
            totalWardenBoardings: 0
        };

        // 2B. GTA 6 Modern-Arcade State (Exotic GPS Trackers, Focus Mode, Street Hold-Ups, @LeonidaFeed Social Ticker, Spike Strips, Takeovers)
        this.luxuryTrackedSpecs = new Set([
            "VICE_CHEETAH",
            "BANSHEE_GT",
            "STINGER_CABRIO",
            "PENETRATOR_GT",
            "PORKA_TURBO",
            "TURISMO_CABRIO"
        ]);
        this.focusCharge = 100;
        this.focusActiveTimer = 0;
        this.leonidaFeedPosts = [];
        this.activeSocialTicker = null;
        this.spikeStrips = [];
        this.takeoverDriftProgress = 0;
        this.takeoverHypeCooldown = 0;
        this.telemetryOverlayOpen = false;

        // 3. Entity Authority & Anti-Teleportation Ledger + Municipal Fleet Ledger + Event Bus
        this.vehicleLedger = new Map(); // vehId -> { lastX, lastY, lastDryX, lastDryY, owner, lastSyncMs, allowSnapUntilMs }
        this.teleportViolations = [];
        this.fleetLedger = []; // ring buffer of municipal station dispatches
        this.eventLog = []; // ring buffer of structured causal engine events
        this._eventListeners = new Map();
    }

    on(eventType, handler) {
        if (!eventType || typeof handler !== "function") return;
        let list = this._eventListeners.get(eventType);
        if (!list) {
            list = [];
            this._eventListeners.set(eventType, list);
        }
        list.push(handler);
    }

    emitEvent(eventType, payload = {}) {
        const evt = {
            id: (this.eventLog.length ? this.eventLog[this.eventLog.length - 1].id + 1 : 1),
            type: eventType,
            atMs: Math.round(this.nowMs()),
            payload
        };
        this.eventLog.push(evt);
        if (this.eventLog.length > 60) {
            this.eventLog.shift();
        }
        const listeners = this._eventListeners.get(eventType);
        if (Array.isArray(listeners)) {
            for (let i = 0; i < listeners.length; i++) {
                try {
                    listeners[i](evt);
                } catch (_e) {}
            }
        }
        return evt;
    }

    toggleTelemetryOverlay(forceState = null) {
        this.telemetryOverlayOpen = forceState !== null ? Boolean(forceState) : !this.telemetryOverlayOpen;
        return this.telemetryOverlayOpen;
    }

    nowMs() {
        return (typeof performance !== "undefined" && typeof performance.now === "function")
            ? performance.now()
            : Date.now();
    }

    /* ========================================================================
       1. PERCEPTION ENGINE (3D Line-of-Sight, Forward Vision Cone & Acoustics)
       ======================================================================== */
    isPointInOpenBeachOrPark(wx, wy) {
        const g = this.game;
        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const minBeachX = (wy < 75 * tileSize ? 458.0 : 447.2) * tileSize;
        if (wx >= minBeachX && wy >= 44 * tileSize && wy <= 368 * tileSize) {
            return true;
        }
        if (g && g.map && typeof g.map.getTileAtPixel === "function" && typeof TILE !== "undefined") {
            if (g.map.getTileAtPixel(wx, wy) === TILE.SAND) return true;
        }
        return false;
    }

    isPointOffRoad(wx, wy) {
        const g = this.game;
        if (g && g.map && typeof g.map.isRoadAtPixel === "function") {
            return !g.map.isRoadAtPixel(wx, wy);
        }
        return this.isPointInOpenBeachOrPark(wx, wy);
    }

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
        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const eventOnOpenBeach = this.isPointInOpenBeachOrPark(x, y);
        const effMaxDist = eventOnOpenBeach ? Math.max(maxDist, isLoudEvent ? 980 : 760) : maxDist;
        const pedCap = eventOnOpenBeach
            ? Math.max(this.config.copFootSightRange, isLoudEvent ? 860 : 680)
            : Math.min(this.config.copFootSightRange, maxDist);
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
                if (!isLoud && !this.isInVisionCone(ped.x, ped.y, ped.angle, x, y, eventOnOpenBeach ? -0.45 : -0.25, 110)) continue;
                return true;
            }
        }

        if (Array.isArray(g.vehicles)) {
            for (const v of g.vehicles) {
                if (!v || v.destroyed || !v.isPolice) continue;
                // An unoccupied parked police car has no officer inside and cannot witness crimes!
                if (v.driver !== "AI_COP" && v.driver !== "AI_TRAFFIC") continue;
                const vCap = (eventOnOpenBeach && (v.x >= 443.0 * tileSize || this.isPointInOpenBeachOrPark(v.x, v.y))) ? effMaxDist : maxDist;
                const dx = x - v.x;
                const dy = y - v.y;
                if (Math.abs(dx) >= vCap || Math.abs(dy) >= vCap) continue;
                const d = Math.hypot(dx, dy);
                if (d >= vCap) continue;
                if (!this.hasLineOfSight(v.x, v.y, x, y, pz, 42)) continue;
                if (!isLoud && !this.isInVisionCone(v.x, v.y, v.angle, x, y, eventOnOpenBeach ? -0.50 : -0.25, 125)) continue;
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
        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const playerOnOpenBeach = this.isPointInOpenBeachOrPark(pEnt.x, pEnt.y);
        const playerOffRoad = playerOnOpenBeach || this.isPointOffRoad(pEnt.x, pEnt.y);
        const coastalRoadMinX = (pEnt.y < 75 * tileSize ? 455.0 : 443.0) * tileSize;
        const copNearBeachfront = copX >= coastalRoadMinX || this.isPointInOpenBeachOrPark(copX, copY);
        // Vice Beach & Lummus Park form an unobstructed 2,300px open expanse east of Ocean Drive with zero buildings (2450px sight),
        // and any active pursuit across open off-road terrain (parks, golf courses, stadium, airport tarmac, swamps) maintains sight up to 1450px
        // whenever the 3D building raycast is 100% clear!
        const effectiveMaxRange = (playerOnOpenBeach && copNearBeachfront)
            ? Math.max(maxRange, 2450)
            : ((playerOffRoad && (g.isPoliceSpotted || g.hasBeenDirectlySpottedByCop))
                ? Math.max(maxRange, 1450)
                : maxRange);

        const dx = pEnt.x - copX;
        const dy = pEnt.y - copY;
        if (Math.abs(dx) >= effectiveMaxRange || Math.abs(dy) >= effectiveMaxRange) return false;
        const d = Math.hypot(dx, dy);
        if (d >= effectiveMaxRange) return false;

        // 1. 3D Building Occlusion Check (always enforced so buildings West of Ocean Drive still block sight 100%)
        if (!this.hasLineOfSight(copX, copY, pEnt.x, pEnt.y, pZ, 42)) return false;

        // 2. Forward Vision Cone Check (unless point-blank < 105px or player is actively firing; wider lateral scan across open beach)
        const activelyFiring = (p.muzzleTimer || 0) > 0;
        const minConeCos = (playerOnOpenBeach && copNearBeachfront) ? -0.65 : this.config.copVisionConeMinCos;
        if (!activelyFiring && !this.isInVisionCone(copX, copY, copAngle, pEnt.x, pEnt.y, minConeCos, this.config.copBlindSpotNearDist)) {
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
        // On open Vice Beach sand (where there are no buildings to hide behind), a fugitive fleeing across the beach sand
        // from an Ocean Drive or Beach crime scene is exposed to responding units scanning the beachfront!
        const scene = g.lastKnownWantedPos;
        const distToScene = scene ? Math.hypot(pEnt.x - scene.x, pEnt.y - scene.y) : 0;
        const playerOnBeachSand = Boolean(
            pEnt.x >= 451.0 * tileSize ||
            (g.map && g.map.getTileAtPixel && typeof TILE !== "undefined" && g.map.getTileAtPixel(pEnt.x, pEnt.y) === TILE.SAND)
        );
        const sceneNearBeach = Boolean(scene && (scene.x >= 441.5 * tileSize || this.isPointInOpenBeachOrPark(scene.x, scene.y)));
        const effectiveSceneRadius = (playerOnBeachSand && sceneNearBeach && !inUnspottedCivCar)
            ? 1850
            : this.config.crimeSceneRadiusPx;
        const atCrimeScene = distToScene < effectiveSceneRadius;
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
        const crimeOnOpenBeach = this.isPointInOpenBeachOrPark(x, y);
        const baseWitnessDist = isExplosion
            ? this.config.witnessExplosionSightRange
            : (isGunfire ? this.config.witnessGunshotSightRange : this.config.witnessMeleeSightRange);
        const maxWitnessDist = crimeOnOpenBeach ? Math.max(baseWitnessDist, 820) : baseWitnessDist;
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
       2B. GTA 6 LEONIDA SANDBOX TRANSPOSITIONS
       - Recognition Status Badges (SPOTTED / HOT VEHICLE / INCOGNITO / SEARCHING)
       - Tactical Vehicle Trunk [B] (Arsenal Stash & Quick Outfit Disguise)
       - Heavy Weapon Open-Carry Police Scrutiny vs. Holstered Stealth
       - @LeonidaFeed Bystander Smartphone Viral Clips
       ======================================================================== */
    getWantedRecognitionStatus() {
        const g = this.game;
        if (!g || !g.player || g.player.dead) return null;
        const p = g.player;
        const wl = g.wantedLevel || 0;

        if (wl <= 0) {
            let activeCaller = null;
            if (Array.isArray(g.peds)) {
                for (let i = 0; i < g.peds.length; i++) {
                    const ped = g.peds[i];
                    if (ped && !ped.dead && (ped.calling911Timer || 0) > 0) {
                        activeCaller = ped;
                        break;
                    }
                }
            }
            if (activeCaller || g.pending911Report) {
                return {
                    code: "CALLING_911",
                    label: "📞 911 CALL IN PROGRESS — SILENCE WITNESS!",
                    color: "#facc15"
                };
            }
            if (p.inVehicle && (p.inVehicle.gpsTrackerTimer || 0) > 0) {
                return {
                    code: "GPS_TRACKER_ACTIVE",
                    label: `📡 EXOTIC GPS TRACKER (${Math.ceil(p.inVehicle.gpsTrackerTimer)}s) — PRESS [B] TO JAM!`,
                    color: "#f59e0b"
                };
            }
            if (p.inVehicle && (p.inVehicle.tirePuncturedTimer || 0) > 0) {
                return {
                    code: "TIRE_PUNCTURED",
                    label: `🛞 TIRES SHREDDED (${Math.ceil(p.inVehicle.tirePuncturedTimer)}s) — SWAP CAR OR RESPRAY!`,
                    color: "#fb923c"
                };
            }
            if ((this.openCarryWarnTimer || 0) > 0.1) {
                return {
                    code: "OPEN_CARRY_WARN",
                    label: "🚓 VCPD: HOLSTER HEAVY WEAPON [1]!",
                    color: "#fb923c"
                };
            }
            if ((this.focusActiveTimer || 0) > 0) {
                return {
                    code: "FOCUS_ACTIVE",
                    label: `🎯 GTA 6 FOCUS MODE (${this.focusActiveTimer.toFixed(1)}s) — LASER AIM!`,
                    color: "#00f0ff"
                };
            }
            return null;
        }

        if (g.isPoliceSpotted) {
            return {
                code: "SPOTTED",
                label: "👁️ VCPD VISUAL CONTACT",
                color: "#ff1e38"
            };
        }
        if (p.inVehicle && (p.inVehicle === g.wantedSpottedVehicle || p.inVehicle.isPolice)) {
            return {
                code: "HOT_VEHICLE",
                label: "🚗 HOT VEHICLE — SWAP CAR OR RESPRAY!",
                color: "#f97316"
            };
        }
        if (
            p.inVehicle &&
            !p.inVehicle.isPolice &&
            p.inVehicle !== g.wantedSpottedVehicle &&
            Math.abs(p.inVehicle.speed || 0) < this.config.cleanCarMaxCalmSpeed
        ) {
            return {
                code: "INCOGNITO_CAR",
                label: "🕵️ INCOGNITO VEHICLE — DRIVE CALMLY",
                color: "#39ff14"
            };
        }
        if (!p.inVehicle && p.weapon && p.weapon !== "FIST") {
            return {
                code: "ARMED_EXPOSED",
                label: "🔫 WEAPON EXPOSED — HOLSTER [1] OR TRUNK [B]",
                color: "#fb923c"
            };
        }
        return {
            code: "SEARCHING_SCENE",
            label: "🔍 VCPD SEARCHING LAST SCENE",
            color: "#38bdf8"
        };
    }

    findNearestTrunkVehicle(maxDist = 56) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.player.inVehicle || g.activeInterior) return null;
        if (!Array.isArray(g.vehicles)) return null;
        const p = g.player;
        const noTrunkSpecs = new Set(["BMX_BIKE", "E_SCOOTER", "JETSKI", "AIRBOAT", "SPEEDBOAT", "YACHT", "SWAMP_BOAT", "MICRO_KART"]);
        let bestVeh = null;
        let bestScore = Infinity;

        for (let i = 0; i < g.vehicles.length; i++) {
            const v = g.vehicles[i];
            if (!v || v.destroyed || v.isMotorcycle || v.waterOnly || noTrunkSpecs.has(v.specKey)) continue;
            if (Math.abs(v.speed || 0) > 22) continue;
            const dx = p.x - v.x;
            const dy = p.y - v.y;
            if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue;
            const dCenter = Math.hypot(dx, dy);
            if (dCenter > maxDist) continue;

            // Compute rear trunk world position of the vehicle (prefer unlooted trunks when two cars are adjacent)
            const halfLen = (v.w || 48) * 0.5;
            const trunkX = v.x - Math.cos(v.angle || 0) * halfLen;
            const trunkY = v.y - Math.sin(v.angle || 0) * halfLen;
            const dTrunk = Math.hypot(p.x - trunkX, p.y - trunkY);
            const score = Math.min(dTrunk, dCenter * 0.85) + (v._trunkLooted ? 18 : 0);
            if (score < bestScore) {
                bestScore = score;
                bestVeh = v;
            }
        }
        return bestVeh;
    }

    interactWithNearestVehicleTrunk() {
        const g = this.game;
        if (!g || !g.player || g.player.dead) return { ok: false, reason: "NO_PLAYER" };
        const p = g.player;
        if (p.inVehicle) {
            if ((p.inVehicle.gpsTrackerTimer || 0) > 0) {
                return this.tryJamVehicleGpsTracker(p.inVehicle);
            }
            g.addFloatingText(p.x, p.y - 26, "🧰 EXIT VEHICLE [F] TO OPEN TRUNK [B]!", "#fde047");
            return { ok: false, reason: "IN_VEHICLE" };
        }
        const v = this.findNearestTrunkVehicle(58);
        if (!v) {
            g.addFloatingText(p.x, p.y - 26, "🧰 STAND BEHIND A CAR TRUNK & PRESS [B]!", "#94a3b8");
            return { ok: false, reason: "NO_TRUNK_NEARBY" };
        }

        v.trunkOpenTimer = 1.8;
        v.doorOpenTimer = Math.max(v.doorOpenTimer || 0, 0.55);
        if (g.audio && typeof g.audio.playBeep === "function") {
            g.audio.playBeep(520, 0.07, "triangle", 0.08);
        }

        // 1. GTA 6 Quick Outfit Disguise & Weapon Holster (when out of direct police sight!)
        const outfits = ["#00f0ff", "#ff2a85", "#fde047", "#39ff14", "#c084fc", "#fb923c"];
        this._disguiseIdx = ((this._disguiseIdx || 0) + 1) % outfits.length;
        p.disguiseColor = outfits[this._disguiseIdx];
        p.weapon = "FIST";
        p.muzzleTimer = 0;
        p.weaponDrawnTimer = 0;
        let disguised = false;

        if (!g.isPoliceSpotted) {
            disguised = true;
            g.hasBeenDirectlySpottedByCop = false;
            if ((g.wantedLevel || 0) > 0) {
                const scene = g.lastKnownWantedPos;
                const dScene = scene ? Math.hypot(p.x - scene.x, p.y - scene.y) : 999;
                if (g.wantedLevel === 1 && dScene > 220) {
                    g.setWantedLevel(0);
                    g.addFloatingText(p.x, p.y - 42, "🧥 TRUNK DISGUISE — 1★ APB EVADED!", "#39ff14");
                } else {
                    g.wantedDecayTimer = (g.wantedDecayTimer || 0) + 4.5;
                    g.addFloatingText(p.x, p.y - 42, "🧥 TRUNK DISGUISE — OUTFIT SWAPPED!", "#38bdf8");
                }
            } else {
                g.addFloatingText(p.x, p.y - 42, "🧥 TRUNK OUTFIT SWAPPED & WEAPON STORED!", "#38bdf8");
            }
        }

        // 2. GTA 6 Vehicle Trunk Arsenal Stash (one-time per vehicle)
        let lootType = "ALREADY_LOOTED";
        if (!v._trunkLooted) {
            v._trunkLooted = true;
            this.blackboard.totalTrunksLooted = (this.blackboard.totalTrunksLooted || 0) + 1;
            if (!Array.isArray(p.weaponsOwned)) p.weaponsOwned = ["FIST", "PISTOL"];
            if (!p.ammo) p.ammo = { PISTOL: 45, UZI: 0, SHOTGUN: 0, FLAMETHROWER: 0, ROCKET: 0, ELECTRO: 0 };

            if (v.isPolice) {
                lootType = "POLICE_RACK";
                p.armor = Math.min(p.maxArmor || 100, (p.armor || 0) + 50);
                if (!p.weaponsOwned.includes("SHOTGUN")) p.weaponsOwned.push("SHOTGUN");
                p.ammo.SHOTGUN = Math.min(999, (p.ammo.SHOTGUN || 0) + 24);
                g.addFloatingText(v.x, v.y - 26, "🚔 VCPD TRUNK RACK: +50 ARMOR & +24 SHOTGUN!", "#00f0ff");
            } else if (
                v.driver === "AI_CRIMINAL" ||
                v.wasCriminalCar ||
                v.isEstateCar ||
                v.specKey === "VICE_CHEETAH" ||
                v.specKey === "BANSHEE_GT" ||
                v.specKey === "STINGER_CABRIO" ||
                v.specKey === "PENETRATOR_GT"
            ) {
                lootType = "SYNDICATE_STASH";
                if (!p.weaponsOwned.includes("UZI")) p.weaponsOwned.push("UZI");
                p.ammo.UZI = Math.min(999, (p.ammo.UZI || 0) + 60);
                if (typeof g.addCash === "function") {
                    g.addCash(350, "💼 TRUNK STASH (+60 UZI)", true);
                }
            } else {
                lootType = "EMERGENCY_KIT";
                p.hp = Math.min(p.maxHp || 100, (p.hp || 0) + 25);
                p.ammo.PISTOL = Math.min(999, (p.ammo.PISTOL || 0) + 24);
                g.addFloatingText(v.x, v.y - 26, "🧰 TRUNK KIT: +25 HP & +24 PISTOL AMMO!", "#39ff14");
            }
            if (typeof g.updateHud === "function") g.updateHud();
        }

        return { ok: true, vehicle: v, disguised, lootType };
    }

    updateOpenCarryScrutiny(dt) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.activeInterior) return;
        const p = g.player;
        if ((g.wantedLevel || 0) > 0 || p.inVehicle || (p.respawnGraceUntil || 0) > this.nowMs()) {
            this.openCarryWarnTimer = 0;
            this._openCarryWarned = false;
            return;
        }
        const heavyWeapons = new Set(["SHOTGUN", "ROCKET", "FLAMETHROWER", "ELECTRO"]);
        const isOpenCarryHeavy = Boolean(p.weapon && heavyWeapons.has(p.weapon));
        if (isOpenCarryHeavy && this.hasCopWitnessNear(p.x, p.y, 195, false)) {
            this.openCarryWarnTimer = (this.openCarryWarnTimer || 0) + dt;
            if (!this._openCarryWarned) {
                this._openCarryWarned = true;
                g.addFloatingText(p.x, p.y - 32, "🚓 VCPD: HOLSTER THAT HEAVY WEAPON [1]!", "#fb923c");
            }
            if (this.openCarryWarnTimer >= 2.0) {
                this.openCarryWarnTimer = 0;
                this._openCarryWarned = false;
                g.setWantedLevel(1, { x: p.x, y: p.y }, true);
                g.addFloatingText(p.x, p.y - 44, "🚨 10-32 OPEN CARRY VIOLATION — 1★!", "#ff1e38");
            }
        } else {
            this.openCarryWarnTimer = Math.max(0, (this.openCarryWarnTimer || 0) - dt * 2.0);
            if (this.openCarryWarnTimer <= 0) {
                this._openCarryWarned = false;
            }
        }
    }

    updateLeonidaViralClips(dt) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.activeInterior || !Array.isArray(g.peds)) return;
        const p = g.player;
        this.viralClipCooldown = Math.max(0, (this.viralClipCooldown || 0) - dt);

        // Tick any bystander currently filming a viral clip
        for (let i = 0; i < g.peds.length; i++) {
            const ped = g.peds[i];
            if (!ped || ped.dead || !((ped.filmingViralTimer || 0) > 0)) continue;
            if ((ped.stunnedTimer || 0) > 0 || (ped.burnTimer || 0) > 0 || (ped.electroTimer || 0) > 0) {
                ped.filmingViralTimer = 0;
                continue;
            }
            ped.filmingViralTimer -= dt;
            if (ped.filmingViralTimer <= 0) {
                ped.filmingViralTimer = 0;
                this.blackboard.totalViralClips = (this.blackboard.totalViralClips || 0) + 1;
                if (typeof g.addCash === "function") {
                    g.addCash(150, "📱 @LeonidaFeed VIRAL CLIP!", true);
                }
                const distTag = String(g.currentDistrict || "VICE CITY").toUpperCase();
                this.pushLeonidaFeedPost(
                    "@LeonidaClips",
                    `🔥 Wild street action caught on camera in ${distTag}! #OnlyInLeonida`,
                    "185K",
                    "#f472b6"
                );
                if (typeof g.sendPager === "function" && (this.nowMs() - (this._lastViralPagerMs || 0)) > 18000) {
                    this._lastViralPagerMs = this.nowMs();
                    g.sendPager(
                        "📱 @LEONIDAFEED // VIRAL TRENDING",
                        "🔥 A bystander just posted your clip to Leonida Social Feed! +150K views & +$150 Viral Hype bonus!",
                        false
                    );
                }
            }
        }

        if (this.viralClipCooldown > 0) return;
        const v = p.inVehicle;
        const isFlashyDrift = Boolean(v && !v.destroyed && v.drifting && Math.abs(v.speed || 0) > 125);
        const isAirStunt = Boolean(v && !v.destroyed && (v.stuntAirTimer || 0) > 0.12);
        const isStreetAction = Boolean((p.playerCombatTimer || 0) > 0 || (g.wantedLevel || 0) >= 2);
        if (!isFlashyDrift && !isAirStunt && !isStreetAction) return;

        const px = v ? v.x : p.x;
        const py = v ? v.y : p.y;
        const pz = (v ? v.z : p.z) || 2.0;

        for (let i = 0; i < g.peds.length; i++) {
            const ped = g.peds[i];
            if (!ped || ped.dead || ped.kind !== "CIVILIAN" || (ped.calling911Timer || 0) > 0 || (ped.filmingViralTimer || 0) > 0 || (ped.surrenderTimer || 0) > 0) continue;
            const d = Math.hypot(ped.x - px, ped.y - py);
            if (d > 38 && d < 240 && this.hasLineOfSight(ped.x, ped.y, px, py, pz, 38)) {
                ped.filmingViralTimer = 2.2;
                ped.angle = Math.atan2(py - ped.y, px - ped.x);
                this.viralClipCooldown = 14.0;
                g.addFloatingText(ped.x, ped.y - 22, "📱 FILMING LEONIDA CLIP!", "#f472b6");
                break;
            }
        }
    }

    /* ========================================================================
       2C. GTA 6 WAVE 2 MODERN-ARCADE SYSTEMS:
       - High-End Exotic Vehicle Factory GPS Tracker & Cal Hampton Signal Jammer [B]
       - Dynamic Street Hold-Ups & NPC Intimidation / Surrender (Hands Up & Cash Drop)
       - Unified Focus Mode / Eagle-Eye Tactical Combat Burst ([L] / Right-Click)
       - Leonida Gator Wrangler & Live @LeonidaFeed Social Media Ticker
       ======================================================================== */
    pushLeonidaFeedPost(handle, text, viewsStr = "142K", color = "#f472b6") {
        const post = {
            handle: handle || "@LeonidaFeed",
            text: text || "Wild day in Leonida!",
            views: viewsStr,
            color,
            atMs: this.nowMs()
        };
        this.leonidaFeedPosts.push(post);
        if (this.leonidaFeedPosts.length > 25) {
            this.leonidaFeedPosts.shift();
        }
        this.activeSocialTicker = {
            handle: post.handle,
            text: post.text,
            views: post.views,
            color: post.color,
            timer: 4.5
        };
        return post;
    }

    onPlayerEnteredVehicle(v, _wasOccupied = false) {
        const g = this.game;
        if (!g || !v || v.destroyed || v.isPolice || v.isEmergency) return;
        if (this.luxuryTrackedSpecs.has(v.specKey) && !v._gpsTrackerJammed && !v._gpsTrackerPinged) {
            v.gpsTrackerTimer = 12.0;
            g.addFloatingText(v.x, v.y - 54, "📡 EXOTIC GPS TRACKER ACTIVE — PRESS [B] TO JAM (12s)!", "#f59e0b");
        }
    }

    tryJamVehicleGpsTracker(veh = null) {
        const g = this.game;
        if (!g || !g.player || g.player.dead) return { ok: false, reason: "NO_PLAYER" };
        const v = veh || g.player.inVehicle;
        if (!v) return { ok: false, reason: "NOT_IN_VEHICLE" };
        if (!((v.gpsTrackerTimer || 0) > 0)) {
            return { ok: false, reason: "NO_ACTIVE_TRACKER" };
        }
        v.gpsTrackerTimer = 0;
        v._gpsTrackerJammed = true;
        this.blackboard.totalTrackersJammed = (this.blackboard.totalTrackersJammed || 0) + 1;
        if (g.wantedSpottedVehicle === v && !g.isPoliceSpotted) {
            g.wantedSpottedVehicle = null;
        }
        if (g.audio && typeof g.audio.playBeep === "function") {
            g.audio.playBeep(880, 0.08, "sine", 0.09);
        }
        if (typeof g.addCash === "function") {
            g.addCash(200, "🔓 EXOTIC GPS TRACKER JAMMED!", true);
        }
        this.addFocusCharge(25);
        this.pushLeonidaFeedPost(
            "@CalHamptonTech",
            `🔓 Factory LoJack scrambled on a ${v.name}! Zero satellite trace on the scanner.`,
            "94K",
            "#38bdf8"
        );
        return { ok: true, vehicle: v, jammed: true };
    }

    updateLuxuryGpsTrackers(dt) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.activeInterior) return;
        const v = g.player.inVehicle;
        if (!v || v.destroyed || !((v.gpsTrackerTimer || 0) > 0)) return;
        v.gpsTrackerTimer -= dt;
        if (v.gpsTrackerTimer <= 0) {
            v.gpsTrackerTimer = 0;
            v._gpsTrackerPinged = true;
            this.blackboard.totalTrackerPings = (this.blackboard.totalTrackerPings || 0) + 1;
            g.setWantedLevel(Math.max(g.wantedLevel || 0, 1), { x: v.x, y: v.y }, false, v);
            g.addFloatingText(v.x, v.y - 36, "🚨 LOJACK SATELLITE PINGED VCPD — 1★ HOT VEHICLE!", "#ff1e38");
        }
    }

    tryIntimidateStreetPed(maxDist = 110) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.player.inVehicle || g.activeInterior) {
            return { ok: false, reason: "NOT_ON_FOOT" };
        }
        const p = g.player;
        if (!p.weapon || p.weapon === "FIST") {
            return { ok: false, reason: "UNARMED" };
        }
        if (!Array.isArray(g.peds)) return { ok: false, reason: "NO_PEDS" };

        const pz = p.z || 2.0;
        const aimCos = Math.cos(p.angle || 0);
        const aimSin = Math.sin(p.angle || 0);
        let bestPed = null;
        let bestDist = maxDist;

        for (let i = 0; i < g.peds.length; i++) {
            const ped = g.peds[i];
            if (!ped || ped.dead || ped.kind !== "CIVILIAN" || ped._intimidatedOnce || ped.isChild) continue;
            if ((ped.filmingViralTimer || 0) > 0) continue;
            const dx = ped.x - p.x;
            const dy = ped.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d < 10 || d >= bestDist) continue;
            const cosFwd = (dx * aimCos + dy * aimSin) / Math.max(1, d);
            if (cosFwd < 0.72) continue;
            if (!this.hasLineOfSight(p.x, p.y, ped.x, ped.y, pz, 28)) continue;
            bestDist = d;
            bestPed = ped;
        }

        if (!bestPed) return { ok: false, reason: "NO_TARGET_IN_SIGHTS" };

        bestPed._intimidatedOnce = true;
        p.weaponDrawnTimer = Math.max(p.weaponDrawnTimer || 0, 0.9);
        if ((bestPed.calling911Timer || 0) > 0) {
            this.abortWitness911Call(bestPed, true);
        }

        if (bestPed.personality === "BRAVE") {
            bestPed.kind = "HOSTILE";
            bestPed.panicTimer = 0;
            bestPed.surrenderTimer = 0;
            bestPed.speed = 92;
            g.addFloatingText(bestPed.x, bestPed.y - 24, "🤬 WRONG ONE! FIGHTING BACK!", "#ef4444");
            return { ok: true, ped: bestPed, outcome: "FOUGHT_BACK", cashDropped: 0 };
        }

        bestPed.surrenderTimer = 4.5;
        bestPed.panicTimer = 0;
        bestPed.speed = 0;
        bestPed.angle = Math.atan2(p.y - bestPed.y, p.x - bestPed.x);
        this.blackboard.totalStickUps = (this.blackboard.totalStickUps || 0) + 1;
        const cashDropped = 75;
        if (typeof g.addCash === "function") {
            g.addCash(cashDropped, "🙌 STREET HOLD-UP!", true);
        }
        g.addFloatingText(bestPed.x, bestPed.y - 26, "🙌 HANDS UP! DON'T SHOOT!", "#fde047");
        this.addFocusCharge(20);
        this.pushLeonidaFeedPost(
            "@OceanBeachWatch",
            `🙌 Brazen daylight stick-up on ${g.currentDistrict || "Ocean Drive"}! Suspect took wallet & vanished!`,
            "118K",
            "#fde047"
        );
        return { ok: true, ped: bestPed, outcome: "SURRENDERED", cashDropped };
    }

    updateStreetIntimidation(dt) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.player.inVehicle || g.activeInterior) return;
        const p = g.player;
        if (!p.weapon || p.weapon === "FIST") {
            this._aimIntimidateAccum = 0;
            return;
        }
        // Automatic close-quarters intimidation when gun is actively drawn/aimed (< 78px in front)
        if ((p.weaponDrawnTimer || 0) > 0 && (p.muzzleTimer || 0) <= 0) {
            this._aimIntimidateAccum = (this._aimIntimidateAccum || 0) + dt;
            if (this._aimIntimidateAccum >= 0.25) {
                this._aimIntimidateAccum = 0;
                this.tryIntimidateStreetPed(78);
            }
        } else {
            this._aimIntimidateAccum = 0;
        }
    }

    addFocusCharge(amount = 15) {
        this.focusCharge = Math.max(0, Math.min(100, (this.focusCharge || 0) + amount));
        return this.focusCharge;
    }

    activateFocusMode() {
        const g = this.game;
        if (!g || !g.player || g.player.dead) return { ok: false, reason: "NO_PLAYER" };
        if ((this.focusActiveTimer || 0) > 0) {
            return { ok: true, alreadyActive: true, remaining: this.focusActiveTimer };
        }
        if ((this.focusCharge || 0) < 35) {
            g.addFloatingText(g.player.x, g.player.y - 28, `🎯 FOCUS RECHARGING (${Math.round(this.focusCharge || 0)}/35)!`, "#94a3b8");
            return { ok: false, reason: "LOW_CHARGE" };
        }
        this.focusCharge = Math.max(0, (this.focusCharge || 0) - 45);
        this.focusActiveTimer = 4.5;
        this.blackboard.totalFocusBursts = (this.blackboard.totalFocusBursts || 0) + 1;
        if (g.audio && typeof g.audio.playBeep === "function") {
            g.audio.playBeep(740, 0.09, "triangle", 0.08);
        }
        g.addFloatingText(g.player.x, g.player.y - 38, "🎯 GTA 6 FOCUS MODE: LASER AIM & +35% DMG!", "#00f0ff");
        return { ok: true, remaining: this.focusActiveTimer };
    }

    updateFocusMode(dt) {
        if ((this.focusActiveTimer || 0) > 0) {
            this.focusActiveTimer = Math.max(0, this.focusActiveTimer - dt);
        } else {
            this.focusCharge = Math.min(100, (this.focusCharge || 0) + dt * 9.0);
        }
        if (this.activeSocialTicker && (this.activeSocialTicker.timer || 0) > 0) {
            this.activeSocialTicker.timer = Math.max(0, this.activeSocialTicker.timer - dt);
            if (this.activeSocialTicker.timer <= 0) {
                this.activeSocialTicker = null;
            }
        }
    }

    onGatorWrangled(gatorPed) {
        const g = this.game;
        if (!g || !gatorPed) return;
        this.blackboard.totalGatorsWrangled = (this.blackboard.totalGatorsWrangled || 0) + 1;
        this.addFocusCharge(30);
        if (typeof g.addCash === "function") {
            g.addCash(150, "🐊 LEONIDA GATOR WRANGLER!", true);
        }
        this.pushLeonidaFeedPost(
            "@GrassriversDaily",
            "🐊 #LeonidaMan just wrangled a 12-foot Grassrivers gator in broad daylight! 🔥",
            "310K",
            "#39ff14"
        );
    }

    /* ========================================================================
       2D. GTA 6 WAVE 3 MODERN-ARCADE SYSTEMS:
       - VCPD Tactical Roadblock Spike Strips & Tire Blowout Interdiction (3★+)
       - Rideout Customs / Pay 'n' Spray Chop-Shop Tracker Strip & Brian Heder Fence
       - Real Dimez (Bae-Luxe & Roxy) Street Takeover & Thrillbilly Drift Hype
       ======================================================================== */
    deployRoadblockSpikeStrip(rbX, rbY, roadAngle = 0) {
        const g = this.game;
        if (!g) return null;
        const perpAng = roadAngle + Math.PI * 0.5;
        const sx = rbX + Math.cos(perpAng) * 24;
        const sy = rbY + Math.sin(perpAng) * 24;
        const strip = {
            id: `spike_${Date.now()}_${this.spikeStrips.length}`,
            x: sx,
            y: sy,
            z: (g.map && typeof g.map.getHeightAtPixel === "function") ? g.map.getHeightAtPixel(sx, sy, 2.0) : 2.0,
            angle: perpAng,
            width: 52,
            timer: 32.0,
            hit: false,
            dodged: false
        };
        this.spikeStrips.push(strip);
        if (this.spikeStrips.length > 6) {
            this.spikeStrips.shift();
        }
        this.blackboard.totalSpikeStripsDeployed = (this.blackboard.totalSpikeStripsDeployed || 0) + 1;
        return strip;
    }

    updateSpikeStrips(dt) {
        const g = this.game;
        if (!g || !Array.isArray(this.spikeStrips) || this.spikeStrips.length === 0) return;
        const p = g.player;
        const pVeh = (p && !p.dead) ? p.inVehicle : null;

        for (let i = this.spikeStrips.length - 1; i >= 0; i--) {
            const st = this.spikeStrips[i];
            st.timer -= dt;
            if (st.timer <= 0 || st.hit || (g.wantedLevel || 0) <= 0) {
                this.spikeStrips.splice(i, 1);
                continue;
            }
            if (pVeh && !pVeh.destroyed && !pVeh.crushesCars && !pVeh.waterOnly) {
                const d = Math.hypot(pVeh.x - st.x, pVeh.y - st.y);
                if (d < 34) {
                    st.hit = true;
                    pVeh.tirePuncturedTimer = 7.0;
                    this.blackboard.totalSpikeStripHits = (this.blackboard.totalSpikeStripHits || 0) + 1;
                    if (g.audio && typeof g.audio.playTireScreech === "function") {
                        g.audio.playTireScreech();
                    }
                    if (typeof g.spawnParticle === "function") {
                        for (let k = 0; k < 8; k++) {
                            g.spawnParticle(pVeh.x + (Math.random() - 0.5) * 20, pVeh.y + (Math.random() - 0.5) * 20, "SPARK");
                        }
                    }
                    g.addFloatingText(pVeh.x, pVeh.y - 36, "🚨 VCPD SPIKE STRIP HIT — TIRES SHREDDED!", "#ff1e38");
                    this.spikeStrips.splice(i, 1);
                } else if (!st.dodged && d >= 34 && d < 78 && Math.abs(pVeh.speed || 0) > 95) {
                    st.dodged = true;
                    this.addFocusCharge(25);
                    g.addFloatingText(pVeh.x, pVeh.y - 32, "🛞 DODGED VCPD SPIKE STRIP (+25 FOCUS)!", "#38bdf8");
                }
            }
        }
    }

    onPayNSprayRespray(v) {
        const g = this.game;
        if (!g || !v) return { ok: false };
        const hadTracker = (v.gpsTrackerTimer || 0) > 0;
        const hadFlatTires = (v.tirePuncturedTimer || 0) > 0;
        v.gpsTrackerTimer = 0;
        v._gpsTrackerJammed = true;
        v.tirePuncturedTimer = 0;

        let smugglerBonus = 0;
        if ((this.luxuryTrackedSpecs.has(v.specKey) || v.wasCriminalCar || hadTracker) && !v._chopShopFenced) {
            v._chopShopFenced = true;
            smugglerBonus = 250;
            this.blackboard.totalSmugglerExports = (this.blackboard.totalSmugglerExports || 0) + 1;
            if (typeof g.addCash === "function") {
                g.addCash(smugglerBonus, "🔧 RIDEOUT CUSTOMS CHOP-SHOP FENCE!", true);
            }
            this.pushLeonidaFeedPost(
                "@RideoutCustoms",
                `🔧 Fresh plates, new chameleon wrap & zero factory LoJack on that ${v.name}!`,
                "164K",
                "#39ff14"
            );
        } else if (hadFlatTires) {
            g.addFloatingText(v.x, v.y - 36, "🛞 SHREDDED TIRES REPLACED AT RIDEOUT CUSTOMS!", "#39ff14");
        }
        return { ok: true, hadTracker, hadFlatTires, smugglerBonus };
    }

    onCraneVehicleExport(v) {
        const g = this.game;
        if (!g || !v) return { ok: false, bonus: 0 };
        let bonus = 0;
        if (this.luxuryTrackedSpecs.has(v.specKey) || v.wasCriminalCar) {
            bonus = 250;
            this.blackboard.totalSmugglerExports = (this.blackboard.totalSmugglerExports || 0) + 1;
            if (typeof g.addCash === "function") {
                g.addCash(bonus, "⚓ BRIAN HEDER KEYS EXPORT BONUS!", true);
            }
            this.pushLeonidaFeedPost(
                "@BrianHederKeys",
                `⚓ High-end ${v.name} loaded onto the Keys cargo freighter. Clean smuggler payout!`,
                "210K",
                "#38bdf8"
            );
        }
        return { ok: true, bonus };
    }

    updateStreetTakeoverHype(dt) {
        const g = this.game;
        if (!g || !g.player || g.player.dead || g.activeInterior || !g.map || !Array.isArray(g.map.streetTakeovers)) return;
        this.takeoverHypeCooldown = Math.max(0, (this.takeoverHypeCooldown || 0) - dt);
        if (this.takeoverHypeCooldown > 0) return;

        const v = g.player.inVehicle;
        if (!v || v.destroyed) {
            this.takeoverDriftProgress = 0;
            return;
        }
        const vSpd = Math.max(Math.abs(v.speed || 0), Math.hypot(v.vx || 0, v.vy || 0));
        const isStunting = Boolean(((v.drifting || (g.input && g.input.handbrake)) && vSpd > 50) || (v.wheelieTimer || 0) > 0.2);
        if (!isStunting) {
            this.takeoverDriftProgress = Math.max(0, (this.takeoverDriftProgress || 0) - dt * 0.5);
            return;
        }

        let nearTakeover = null;
        for (let i = 0; i < g.map.streetTakeovers.length; i++) {
            const st = g.map.streetTakeovers[i];
            if (!st || (st.wipeoutTimer || 0) > 0) continue;
            if (Math.hypot(v.x - st.x, v.y - st.y) <= 210) {
                nearTakeover = st;
                break;
            }
        }
        if (!nearTakeover) {
            this.takeoverDriftProgress = Math.max(0, (this.takeoverDriftProgress || 0) - dt * 0.5);
            return;
        }

        this.takeoverDriftProgress = (this.takeoverDriftProgress || 0) + dt;
        if (this.takeoverDriftProgress >= 1.2) {
            this.takeoverDriftProgress = 0;
            this.takeoverHypeCooldown = 12.0;
            this.blackboard.totalTakeoverHypes = (this.blackboard.totalTakeoverHypes || 0) + 1;
            this.addFocusCharge(35);
            if (typeof g.addCash === "function") {
                g.addCash(250, "🔥 REAL DIMEZ TAKEOVER HYPE!", true);
            }
            g.addFloatingText(v.x, v.y - 38, "🎤 REAL DIMEZ (BAE-LUXE & ROXY): SICK TAKEOVER DRIFT!", "#f472b6");
            this.pushLeonidaFeedPost(
                "@RealDimez",
                `🎤 Bae-Luxe & Roxy went LIVE at the street takeover! Cleanest ${v.name} drift in Leonida! #OnlyRawRecords`,
                "420K",
                "#f472b6"
            );
        }
    }

    /* ========================================================================
       3. MUNICIPAL DISPATCH DIRECTOR (VCPD, EMS Hospital, VCFD Fire, Tow Impound)
       ======================================================================== */
    getEmergencyStations(serviceType) {
        const g = this.game;
        const list = [];
        if (g && g.map && Array.isArray(g.map.emergencyStations)) {
            for (const st of g.map.emergencyStations) {
                if (st && st.type === serviceType) list.push(st);
            }
        }
        return list;
    }

    getNearestEmergencyStation(serviceType, wx, wy) {
        const stations = this.getEmergencyStations(serviceType);
        let best = null;
        let bestDist = Infinity;
        for (const st of stations) {
            const d = Math.hypot(st.x - wx, st.y - wy);
            if (d < bestDist) {
                bestDist = d;
                best = st;
            }
        }
        return best;
    }

    findStationDispatchSpawn(serviceType, targetX, targetY, targetZ = 2.0) {
        const g = this.game;
        if (!g || !g.map || typeof g.map.getNavigationBlock !== "function") return null;
        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const mapCols = (typeof MAP_COLS !== "undefined") ? MAP_COLS : (g.map.cols || 512);
        const mapRows = (typeof MAP_ROWS !== "undefined") ? MAP_ROWS : (g.map.rows || 512);
        const roadType = (typeof GROUND_TYPE !== "undefined" && GROUND_TYPE.ROAD !== undefined) ? GROUND_TYPE.ROAD : 2;
        const stations = this.getEmergencyStations(serviceType).slice();
        stations.sort((a, b) => Math.hypot(a.x - targetX, a.y - targetY) - Math.hypot(b.x - targetX, b.y - targetY));

        const targetOnEastBeach = targetX >= 447.2 * tileSize && targetY >= 44 * tileSize && targetY <= 368 * tileSize;
        const roadTargetX = targetOnEastBeach
            ? ((targetY < 75 * tileSize ? 456.5 : 445.0) * tileSize)
            : targetX;

        for (let pass = 0; pass < 2; pass++) {
            const strictLaneAlign = (pass === 0);
            for (let si = 0; si < stations.length; si++) {
                const st = stations[si];
                const distStToTarget = Math.hypot(st.x - roadTargetX, st.y - targetY);
                const inViewSt = typeof g.isPointInAnyPlayerCameraView === "function"
                    ? g.isPointInAnyPlayerCameraView(st.x, st.y, 220)
                    : false;
                const useStationGate = distStToTarget >= this.config.stationGateMinDist &&
                    distStToTarget <= this.config.stationGateMaxDist &&
                    !inViewSt;
                const dirFromTargetToSt = Math.atan2(st.y - targetY, st.x - roadTargetX);
                const corridorDist = Math.max(1350, Math.min(distStToTarget, 1750));
                const anchorX = useStationGate ? st.x : (roadTargetX + Math.cos(dirFromTargetToSt) * corridorDist);
                const anchorY = useStationGate ? st.y : (targetY + Math.sin(dirFromTargetToSt) * corridorDist);
                const baseBx = Math.floor(anchorX / tileSize);
                const baseBy = Math.floor(anchorY / tileSize);

                for (let r = 0; r <= 36; r++) {
                    for (let dy = -r; dy <= r; dy++) {
                        for (let dx = -r; dx <= r; dx++) {
                            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                            const bx = baseBx + dx;
                            const by = baseBy + dy;
                            if (bx < 2 || bx >= mapCols - 2 || by < 2 || by >= mapRows - 2) continue;
                            if (g.map.isRestrictedNoTrafficZone && g.map.isRestrictedNoTrafficZone(bx, by)) continue;
                            const navBlk = g.map.getNavigationBlock(bx, by, targetZ);
                            if (!navBlk || navBlk.groundType !== roadType || navBlk.isRailway) continue;
                            if (strictLaneAlign) {
                                const lidZ1 = g.map.getBlockInfo ? g.map.getBlockInfo(bx, by, 1).lid : 0;
                                const bits = (navBlk.up ? 1 : 0) + (navBlk.down ? 1 : 0) + (navBlk.left ? 1 : 0) + (navBlk.right ? 1 : 0);
                                if (bits !== 1 || lidZ1 === 25) continue;
                            }
                            const sx = (bx + 0.5) * tileSize;
                            const sy = (by + 0.5) * tileSize;
                            if (Math.hypot(sx - targetX, sy - targetY) < 1180) continue;
                            if (typeof g.isPointInAnyPlayerCameraView === "function" && g.isPointInAnyPlayerCameraView(sx, sy, 220)) continue;
                            const alignTargetX = (targetOnEastBeach && bx >= 443) ? roadTargetX : targetX;
                            const toTargetAng = Math.atan2(targetY - sy, alignTargetX - sx);
                            const roadAng = typeof g.map.getAlignedRoadAngle === "function"
                                ? g.map.getAlignedRoadAngle(bx, by, toTargetAng, targetZ)
                                : toTargetAng;
                            if (strictLaneAlign && Math.cos(roadAng - toTargetAng) < 0.12) continue;
                            const occupied = Array.isArray(g.vehicles) && g.vehicles.some((ov) => ov && Math.hypot(ov.x - sx, ov.y - sy) < 76);
                            if (occupied) continue;
                            const sz = g.map.getHeightAtPixel ? g.map.getHeightAtPixel(sx, sy, 4.0) : 2.0;

                            if (serviceType === "POLICE") this.blackboard.totalPrecinctDispatches = (this.blackboard.totalPrecinctDispatches || 0) + 1;
                            else if (serviceType === "MEDIC") this.blackboard.totalMedicDispatches = (this.blackboard.totalMedicDispatches || 0) + 1;
                            else if (serviceType === "FIRE") this.blackboard.totalFireDispatches = (this.blackboard.totalFireDispatches || 0) + 1;
                            else if (serviceType === "TOW") this.blackboard.totalTowDispatches = (this.blackboard.totalTowDispatches || 0) + 1;

                            const spawnRecord = {
                                serviceType,
                                x: sx,
                                y: sy,
                                z: sz,
                                angle: roadAng,
                                station: st,
                                usedStationGate: useStationGate,
                                distToTarget: Math.round(Math.hypot(sx - targetX, sy - targetY)),
                                atMs: Math.round(this.nowMs())
                            };
                            this.fleetLedger.push(spawnRecord);
                            if (this.fleetLedger.length > 40) this.fleetLedger.shift();
                            this.emitEvent("MUNICIPAL_DISPATCH", {
                                serviceType,
                                stationId: st ? st.id : null,
                                distToTarget: spawnRecord.distToTarget,
                                usedStationGate: useStationGate
                            });
                            return spawnRecord;
                        }
                    }
                }
            }
        }
        return null;
    }

    getFleetTelemetry() {
        const g = this.game;
        const stats = {
            activePoliceCruisers: 0,
            activeSwatUnits: 0,
            activeFootCops: 0,
            activeTrafficWardens: 0,
            activeAmbulances: 0,
            activeFireTrucks: 0,
            activeTowTrucks: 0,
            pending911Callers: 0,
            activeSpikeStrips: Array.isArray(this.spikeStrips) ? this.spikeStrips.length : 0,
            activeLaneBottlenecks: (this.laneTracker && Array.isArray(this.laneTracker.activeBottlenecks)) ? this.laneTracker.activeBottlenecks.length : 0,
            congestedRoadTiles: (this.laneTracker && this.laneTracker.congestedTilesCount) || 0
        };
        if (!g) return stats;
        if (Array.isArray(g.vehicles)) {
            for (let i = 0; i < g.vehicles.length; i++) {
                const v = g.vehicles[i];
                if (!v || v.destroyed) continue;
                if (v.isPolice && v.driver === "AI_COP") {
                    stats.activePoliceCruisers++;
                    if (v.specKey === "SWAT_ENFORCER") stats.activeSwatUnits++;
                } else if (v.specKey === "MEDIC_AMBULANCE" && v.driver === "AI_EMERGENCY") {
                    stats.activeAmbulances++;
                } else if (v.specKey === "FIRE_TRUCK" && v.driver === "AI_EMERGENCY") {
                    stats.activeFireTrucks++;
                } else if (v.specKey === "TOW_TRUCK" && v.driver === "AI_TOW") {
                    stats.activeTowTrucks++;
                }
            }
        }
        if (Array.isArray(g.peds)) {
            for (let i = 0; i < g.peds.length; i++) {
                const ped = g.peds[i];
                if (!ped || ped.dead) continue;
                if (ped.kind === "COP") stats.activeFootCops++;
                if (ped.isTrafficWarden) stats.activeTrafficWardens++;
                if ((ped.calling911Timer || 0) > 0) stats.pending911Callers++;
            }
        }
        return stats;
    }

    /* ========================================================================
       3B. NAVIGABLE LANE FLOW TRACKER & IN-GAME TRAFFIC WARDEN AI ENTITY
       ------------------------------------------------------------------------
       - Continuously tracks every navigable .CMP road tile & lane flow vector
       - Back-propagates lane obstructions & stalled queues 1..6 tiles upstream
         into map.laneCongestionMap so upstream intersections divert traffic
       - Diagnoses physical bottlenecks (WRECK_OBSTRUCTION, ABANDONED_VEHICLE,
         TOW_RECOVERY_MANEUVER, INTERSECTION_GRIDLOCK) and computes the open
         lateral bypass corridor (clearSide = -1 | +1)
       - Dispatches a physical in-game VCPD Traffic Warden / Road Ranger entity
         (high-vis safety vest + glowing orange 3D traffic baton) who walks to
         the jam, waves stalled drivers around the obstacle, and physically
         walks to the door of any intact abandoned lane-blocking car to board
         it and drive it clear (100% physical, zero teleport/ghost-car cheats!)
       ======================================================================== */
    computeOptimalBypassSideAt(x, y, roadAngle, obstacleX, obstacleY, z = 2.0) {
        const g = this.game;
        const rCos = Math.cos(roadAngle || 0);
        const rSin = Math.sin(roadAngle || 0);
        // Perpendicular vector (+1 = right of road heading, -1 = left of road heading)
        const pCos = -rSin;
        const pSin = rCos;
        const latOffset = (obstacleX - x) * pCos + (obstacleY - y) * pSin;
        let preferSide = latOffset >= 0 ? -1 : 1;
        if (g && g.map && typeof g.map.resolveCircleBuildingCollision === "function") {
            const testDist = 27;
            const prefX = x + pCos * (preferSide * testDist);
            const prefY = y + pSin * (preferSide * testDist);
            const altX = x + pCos * (-preferSide * testDist);
            const altY = y + pSin * (-preferSide * testDist);
            const prefHit = g.map.resolveCircleBuildingCollision(prefX, prefY, 15, z).hit;
            const altHit = g.map.resolveCircleBuildingCollision(altX, altY, 15, z).hit;
            if (prefHit && !altHit) preferSide = -preferSide;
        }
        return preferSide;
    }

    updateNavigableLaneTracker(dt, forceScan = false) {
        const g = this.game;
        if (!g || !g.map || !Array.isArray(g.vehicles)) return;
        const lt = this.laneTracker;
        const stepDt = Math.max(0, dt || 0);
        lt.scanAccumSec = (lt.scanAccumSec || 0) + stepDt;
        if ((g.signalPreemptionTimer || 0) > 0) {
            g.signalPreemptionTimer = Math.max(0, g.signalPreemptionTimer - stepDt);
            if (g.signalPreemptionTimer <= 0) {
                g.signalPreemptionAxis = null;
            }
        }

        // Step active Traffic Warden entities every frame for smooth physical walking, wand waving & door boarding
        if (Array.isArray(g.peds)) {
            let activeWardens = 0;
            for (let i = 0; i < g.peds.length; i++) {
                const ped = g.peds[i];
                if (!ped || ped.dead || !ped.isTrafficWarden) continue;
                activeWardens++;
                this.updateTrafficWardenBehavior(ped, dt);
            }
            lt.activeWardensCount = activeWardens;
        }

        if (!forceScan && lt.scanAccumSec < 0.35) return;
        lt.scanAccumSec = 0;

        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const roadType = (typeof GROUND_TYPE !== "undefined" && GROUND_TYPE.ROAD !== undefined) ? GROUND_TYPE.ROAD : 2;
        if (!g.map.laneCongestionMap) {
            g.map.laneCongestionMap = new Map();
        } else {
            g.map.laneCongestionMap.clear();
        }
        const congMap = g.map.laneCongestionMap;
        const addTileCongestion = (bx, by, weight) => {
            if (bx < 1 || bx >= 511 || by < 1 || by >= 511 || weight <= 0) return;
            const key = (by << 16) | (bx & 0xffff);
            congMap.set(key, Math.min(120, (congMap.get(key) || 0) + weight));
        };

        const rawIncidents = [];
        const pVeh = g.player ? g.player.inVehicle : null;
        let opticomAxis = null;
        let nsQueueDemand = 0;
        let ewQueueDemand = 0;

        for (let i = 0; i < g.vehicles.length; i++) {
            const v = g.vehicles[i];
            if (!v || v === pVeh || v.towedByTruck || v.isStaticParked || v.isCurbParked || v.isEstateCar) continue;
            const bx = Math.floor(v.x / tileSize);
            const by = Math.floor(v.y / tileSize);
            const vz = v.z || 2.0;
            const nav = typeof g.map.getNavigationBlock === "function" ? g.map.getNavigationBlock(bx, by, vz) : null;
            if (!nav || nav.groundType !== roadType || nav.isRailway) continue;

            // Real-World 3M Opticom Infrared Signal Preemption:
            // If an active emergency responder (Police, Ambulance, Fire Engine, or Tow Truck with sirenActive)
            // is within 1..3 tiles of a signalized intersection stop-line, preempt the traffic light to GREEN on its axis
            // so queued civilian cars at the red light ahead roll forward and clear the intersection!
            const isPrioritySiren = !v.destroyed && Boolean(
                v.sirenActive ||
                (v.driver === "AI_TOW" && (v.towTarget || v.towingVehicle))
            );
            if (isPrioritySiren && !opticomAxis && typeof g.map.getBlockInfo === "function") {
                const fDx = Math.round(Math.cos(v.angle || 0));
                const fDy = Math.round(Math.sin(v.angle || 0));
                for (let look = 0; look <= 4; look++) {
                    const lbx = bx + fDx * look;
                    const lby = by + fDy * look;
                    const blk1 = g.map.getBlockInfo(lbx, lby, 1);
                    const dirsAtLook = typeof g.map.getAllowedRoadDirections === "function"
                        ? g.map.getAllowedRoadDirections(lbx, lby, vz)
                        : [];
                    const isJunctionAhead =
                        (blk1 && blk1.lid === 25) ||
                        dirsAtLook.length >= 2 ||
                        (g.map.isStopLineBlock && g.map.isStopLineBlock(lbx, lby));
                    if (isJunctionAhead) {
                        opticomAxis = Math.abs(Math.sin(v.angle || 0)) >= Math.abs(Math.cos(v.angle || 0)) ? "NS" : "EW";
                        break;
                    }
                }
            }

            const spd = Math.abs(v.speed || 0);
            if (!v.destroyed && v.driver === "AI_TRAFFIC" && spd < 14) {
                if (Math.abs(Math.sin(v.angle || 0)) >= Math.abs(Math.cos(v.angle || 0))) nsQueueDemand++;
                else ewQueueDemand++;
            }
            const isWreck = Boolean(v.destroyed && !v.towedByTruck);
            const isAbandoned = !isWreck && !v.towedByTruck && v.driver === null && (v.abandonedTimer || 0) >= 2.5;
            const isTowManeuver = !isWreck && v.driver === "AI_TOW" && !v.towingVehicle && spd < 24;
            const isStalledTraffic = !isWreck && !v.towedByTruck && v.driver !== null && v.driver !== "PLAYER" &&
                spd < 12 &&
                v.aiState !== "STOPPED_LIGHT" &&
                v.aiState !== "CURB_PARKED" &&
                (v.wardenHoldTimer || 0) <= 0 &&
                ((v.gridlockTimer || 0) >= 1.1 || (v.yieldTimer || 0) >= 1.2 || v.aiState === "YIELDING" || (v.blockedTimer || 0) >= 1.1);

            if (!isWreck && !isAbandoned && !isTowManeuver && !isStalledTraffic) continue;

            const baseWeight = isWreck ? 38 : (isAbandoned ? 28 : (isTowManeuver ? 20 : 14));
            addTileCongestion(bx, by, baseWeight);

            // Back-propagate lane congestion 1..5 tiles UPSTREAM against the tile's allowed traffic flow direction
            // so upstream intersections immediately know this outgoing branch is obstructed!
            const dirs = typeof g.map.getAllowedRoadDirections === "function"
                ? g.map.getAllowedRoadDirections(bx, by, vz)
                : [];
            const flowAng = dirs.length > 0 ? dirs[0].angle : (v.angle || 0);
            const upDx = -Math.round(Math.cos(flowAng));
            const upDy = -Math.round(Math.sin(flowAng));
            if (upDx !== 0 || upDy !== 0) {
                for (let s = 1; s <= 5; s++) {
                    addTileCongestion(bx + upDx * s, by + upDy * s, Math.round(baseWeight * (1.0 - s * 0.16)));
                }
            }

            rawIncidents.push({
                veh: v,
                bx,
                by,
                x: v.x,
                y: v.y,
                z: vz,
                flowAng,
                weight: baseWeight,
                kind: isWreck
                    ? "WRECK_OBSTRUCTION"
                    : (isAbandoned
                        ? "ABANDONED_VEHICLE"
                        : (isTowManeuver ? "TOW_RECOVERY_MANEUVER" : "INTERSECTION_GRIDLOCK"))
            });
        }

        // Apply 3M Opticom Emergency Preemption or SCATS Adaptive Queue Demand to city traffic signals
        if (opticomAxis) {
            if (g.signalPreemptionAxis !== opticomAxis || (g.signalPreemptionTimer || 0) <= 0.4) {
                lt.totalSignalPreemptions = (lt.totalSignalPreemptions || 0) + 1;
            }
            g.signalPreemptionAxis = opticomAxis;
            g.signalPreemptionTimer = 2.6;
        } else if ((g.signalPreemptionTimer || 0) <= 0) {
            if (nsQueueDemand >= ewQueueDemand + 4 && !g.isNSGreen()) {
                g.signalPreemptionAxis = "NS";
                g.signalPreemptionTimer = 2.2;
                lt.totalSignalPreemptions = (lt.totalSignalPreemptions || 0) + 1;
            } else if (ewQueueDemand >= nsQueueDemand + 4 && !g.isEWGreen()) {
                g.signalPreemptionAxis = "EW";
                g.signalPreemptionTimer = 2.2;
                lt.totalSignalPreemptions = (lt.totalSignalPreemptions || 0) + 1;
            }
        }

        lt.congestedTilesCount = congMap.size;
        this.blackboard.totalIntersectionDetours = g.map.totalIntersectionDetours || 0;

        // Cluster nearby lane incidents (within 185px) into diagnosed Traffic Bottlenecks
        const clusters = [];
        for (let i = 0; i < rawIncidents.length; i++) {
            const inc = rawIncidents[i];
            let merged = null;
            for (let c = 0; c < clusters.length; c++) {
                if (Math.hypot(clusters[c].x - inc.x, clusters[c].y - inc.y) < 185) {
                    merged = clusters[c];
                    break;
                }
            }
            if (!merged) {
                merged = {
                    id: `bn_${inc.bx}_${inc.by}`,
                    bx: inc.bx,
                    by: inc.by,
                    x: inc.x,
                    y: inc.y,
                    z: inc.z,
                    flowAng: inc.flowAng,
                    cause: inc.kind,
                    severity: inc.weight,
                    obstacleVeh: (inc.kind === "WRECK_OBSTRUCTION" || inc.kind === "ABANDONED_VEHICLE") ? inc.veh : null,
                    stalledVehicles: (inc.veh.driver && inc.veh.driver !== "PLAYER") ? [inc.veh] : []
                };
                clusters.push(merged);
            } else {
                merged.severity += inc.weight;
                if (inc.kind === "WRECK_OBSTRUCTION" || (inc.kind === "ABANDONED_VEHICLE" && merged.cause !== "WRECK_OBSTRUCTION")) {
                    merged.cause = inc.kind;
                    merged.obstacleVeh = inc.veh;
                    merged.x = inc.x;
                    merged.y = inc.y;
                }
                if (inc.veh.driver && inc.veh.driver !== "PLAYER" && !merged.stalledVehicles.includes(inc.veh)) {
                    merged.stalledVehicles.push(inc.veh);
                }
            }
        }

        const prevCount = Array.isArray(lt.activeBottlenecks) ? lt.activeBottlenecks.length : 0;
        const activeBottlenecks = [];
        for (let i = 0; i < clusters.length; i++) {
            const c = clusters[i];
            // Only promote to an actionable bottleneck if there's a physical obstruction (wreck/abandoned car) OR >= 2 stalled vehicles
            if (!c.obstacleVeh && c.stalledVehicles.length < 2 && c.severity < 24) continue;
            const tileCenterX = (c.bx + 0.5) * tileSize;
            const tileCenterY = (c.by + 0.5) * tileSize;
            const obsX = c.obstacleVeh ? c.obstacleVeh.x : c.x;
            const obsY = c.obstacleVeh ? c.obstacleVeh.y : c.y;
            c.clearSide = this.computeOptimalBypassSideAt(tileCenterX, tileCenterY, c.flowAng, obsX, obsY, c.z);

            // Real-World FDOT Road Ranger Safety Cone Taper:
            // Place 3 physical 3D orange-and-white reflective traffic cones upstream of the obstruction
            // in a diagonal taper to channel approaching drivers smoothly into the open bypass lane!
            const fCos = Math.cos(c.flowAng || 0);
            const fSin = Math.sin(c.flowAng || 0);
            const pCos = -fSin;
            const pSin = fCos;
            c.taperCones = [
                { x: obsX - fCos * 86 - pCos * c.clearSide * 12, y: obsY - fSin * 86 - pSin * c.clearSide * 12, z: c.z },
                { x: obsX - fCos * 58 - pCos * c.clearSide * 3,  y: obsY - fSin * 58 - pSin * c.clearSide * 3,  z: c.z },
                { x: obsX - fCos * 32 + pCos * c.clearSide * 7,  y: obsY - fSin * 32 + pSin * c.clearSide * 7,  z: c.z }
            ];
            // Safe Flagger Stand Position: behind the cone taper on the obstructed lane side, never blocking the open bypass lane!
            c.flaggerX = obsX - fCos * 42 - pCos * c.clearSide * 18;
            c.flaggerY = obsY - fSin * 42 - pSin * c.clearSide * 18;
            activeBottlenecks.push(c);
        }

        if (activeBottlenecks.length > prevCount) {
            const added = activeBottlenecks.length - prevCount;
            lt.totalBottlenecksDetected += added;
            this.blackboard.totalLaneBottlenecks = lt.totalBottlenecksDetected;
        } else if (prevCount > activeBottlenecks.length) {
            lt.totalBottlenecksResolved += (prevCount - activeBottlenecks.length);
        }
        lt.activeBottlenecks = activeBottlenecks;

        // Assign or dispatch a physical in-game VCPD Traffic Warden entity for each actionable bottleneck
        for (let i = 0; i < activeBottlenecks.length; i++) {
            this.dispatchTrafficWardenForBottleneck(activeBottlenecks[i]);
        }

        // Stand-Down Protocol: release any Traffic Warden whose bottleneck has been cleared so they resume normal sidewalk patrol!
        if (Array.isArray(g.peds)) {
            for (let pi = 0; pi < g.peds.length; pi++) {
                const ped = g.peds[pi];
                if (!ped || ped.dead || !ped.isTrafficWarden) continue;
                const hasBoardTarget = Boolean(
                    ped._boardingVeh &&
                    !ped._boardingVeh.destroyed &&
                    ped._boardingVeh.driver === null &&
                    !ped._boardingVeh.towedByTruck &&
                    g.vehicles.includes(ped._boardingVeh)
                );
                let matchedBn = null;
                for (let bi = 0; bi < activeBottlenecks.length; bi++) {
                    const ab = activeBottlenecks[bi];
                    if (ab.wardenId === ped.id) {
                        matchedBn = ab;
                        break;
                    }
                }
                if (matchedBn) {
                    ped.wardenBottleneck = matchedBn;
                } else if (!hasBoardTarget) {
                    ped.isTrafficWarden = false;
                    ped.isReliefDriver = false;
                    ped.isDirectingTraffic = false;
                    ped.wardenBottleneck = null;
                    ped.carryProp = null;
                    ped.wandWaveTimer = 0;
                }
            }
        }
    }

    dispatchTrafficWardenForBottleneck(bn) {
        const g = this.game;
        if (!g || !bn || !Array.isArray(g.peds)) return null;

        // 1. Check if an active Traffic Warden or nearby calm on-foot VCPD officer is already within 560px
        let assignedWarden = null;
        let bestDist = 560;
        for (let i = 0; i < g.peds.length; i++) {
            const ped = g.peds[i];
            if (!ped || ped.dead) continue;
            if (ped.isTrafficWarden) {
                const d = Math.hypot(ped.x - bn.x, ped.y - bn.y);
                if (d < 620) {
                    ped.wardenBottleneck = bn;
                    if (bn.obstacleVeh && !bn.obstacleVeh.destroyed && bn.obstacleVeh.driver === null && !bn.obstacleVeh.towedByTruck) {
                        ped._boardingVeh = bn.obstacleVeh;
                    }
                    bn.wardenId = ped.id;
                    return ped;
                }
            }
            if (ped.kind === "COP" && !ped.inCombat && !ped.missionTag && (!ped._boardingVeh || ped._boardingVeh === bn.obstacleVeh)) {
                const d = Math.hypot(ped.x - bn.x, ped.y - bn.y);
                if (d < bestDist) {
                    bestDist = d;
                    assignedWarden = ped;
                }
            }
        }

        if (assignedWarden) {
            assignedWarden.isTrafficWarden = true;
            assignedWarden.wardenRole = "VCPD TRAFFIC WARDEN";
            assignedWarden.carryProp = "TRAFFIC_WAND";
            assignedWarden.wardenBottleneck = bn;
            if (bn.obstacleVeh && !bn.obstacleVeh.destroyed && bn.obstacleVeh.driver === null && !bn.obstacleVeh.towedByTruck) {
                assignedWarden._boardingVeh = bn.obstacleVeh;
                assignedWarden.homeCruiser = bn.obstacleVeh;
            }
            bn.wardenId = assignedWarden.id;
            return assignedWarden;
        }

        // 2. Otherwise, spawn a physical VCPD Traffic Warden / Road Ranger strictly off-screen on a nearby sidewalk/road
        if (g.peds.length >= 168 || typeof Pedestrian === "undefined") return null;
        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const p = g.player;
        const camX = (g.renderer && g.renderer.camX !== undefined) ? g.renderer.camX : (p ? p.x : bn.x);
        const camY = (g.renderer && g.renderer.camY !== undefined) ? g.renderer.camY : (p ? p.y : bn.y);
        const halfW = ((g.renderer && g.renderer.canvas && g.renderer.canvas.width) ? g.renderer.canvas.width : 1280) * 0.5 + 36;
        const halfH = ((g.renderer && g.renderer.canvas && g.renderer.canvas.height) ? g.renderer.canvas.height : 720) * 0.5 + 36;
        const cz = bn.z || 2.0;

        for (let ca = 0; ca < 16; ca++) {
            const ang = ((ca * 4 + Math.floor(ca / 4)) % 16) * (Math.PI * 2 / 16);
            const sDist = 415 + (ca % 3) * 55;
            const sx = bn.x + Math.cos(ang) * sDist;
            const sy = bn.y + Math.sin(ang) * sDist;
            let onScreenNow = Math.abs(sx - camX) < halfW * 0.78 && Math.abs(sy - camY) < halfH * 0.78;
            if (g.renderer && typeof g.renderer.worldToScreen === "function" && g.renderer.canvas) {
                const sp = g.renderer.worldToScreen(sx, sy, cz);
                const W = g.renderer.canvas.width || 1280;
                const H = g.renderer.canvas.height || 720;
                if (sp && typeof sp.x === "number" && typeof sp.y === "number" && (sp.x !== 0 || sp.y !== 0)) {
                    onScreenNow = (sp.x >= -32 && sp.x <= W + 32 && sp.y >= -32 && sp.y <= H + 32);
                }
            }
            if (onScreenNow) continue;
            const sbx = Math.floor(sx / tileSize);
            const sby = Math.floor(sy / tileSize);
            const nav = g.map.getNavigationBlock ? g.map.getNavigationBlock(sbx, sby, cz) : null;
            if (
                nav &&
                (nav.groundType === GROUND_TYPE.PAWEMENT || nav.groundType === GROUND_TYPE.ROAD) &&
                (!g.map.isWaterAtPixel || !g.map.isWaterAtPixel(sx, sy)) &&
                (!g.map.resolveCircleBuildingCollision || !g.map.resolveCircleBuildingCollision(sx, sy, 10, cz).hit)
            ) {
                const warden = new Pedestrian({
                    id: `warden_${Date.now()}_${ca}`,
                    x: sx,
                    y: sy,
                    z: cz,
                    angle: Math.atan2(bn.y - sy, bn.x - sx),
                    kind: "COP",
                    g24Type: "police",
                    copWeapon: "PISTOL",
                    hp: 115,
                    speed: 94
                });
                warden.isTrafficWarden = true;
                warden.isReliefDriver = true;
                warden.wardenRole = "VCPD TRAFFIC WARDEN";
                warden.carryProp = "TRAFFIC_WAND";
                warden.wardenBottleneck = bn;
                if (bn.obstacleVeh && !bn.obstacleVeh.destroyed && bn.obstacleVeh.driver === null && !bn.obstacleVeh.towedByTruck) {
                    warden._boardingVeh = bn.obstacleVeh;
                    warden.homeCruiser = bn.obstacleVeh;
                }
                g.peds.push(warden);
                bn.wardenId = warden.id;
                this.laneTracker.totalWardensDispatched++;
                this.blackboard.totalTrafficWardensDispatched = this.laneTracker.totalWardensDispatched;
                this.emitEvent("TRAFFIC_WARDEN_DISPATCHED", {
                    wardenId: warden.id,
                    bottleneckId: bn.id,
                    cause: bn.cause,
                    bx: bn.bx,
                    by: bn.by
                });
                return warden;
            }
        }
        return null;
    }

    updateTrafficWardenBehavior(ped, dt) {
        const g = this.game;
        if (!g || !ped || ped.dead || !ped.isTrafficWarden) return;
        ped.carryProp = "TRAFFIC_WAND";
        if ((ped.wandWaveTimer || 0) > 0) {
            ped.wandWaveTimer = Math.max(0, ped.wandWaveTimer - dt);
        }

        const bn = ped.wardenBottleneck;
        const obsVeh = (bn && bn.obstacleVeh && !bn.obstacleVeh.towedByTruck)
            ? bn.obstacleVeh
            : ((ped._boardingVeh && !ped._boardingVeh.towedByTruck) ? ped._boardingVeh : null);
        const hasActiveObstruction = Boolean(
            obsVeh &&
            !obsVeh.towedByTruck &&
            Array.isArray(g.vehicles) &&
            g.vehicles.includes(obsVeh) &&
            (obsVeh.destroyed || obsVeh.driver === null)
        );
        if (!hasActiveObstruction && (!bn || !Array.isArray(this.laneTracker.activeBottlenecks) || !this.laneTracker.activeBottlenecks.includes(bn))) {
            ped.isTrafficWarden = false;
            ped.isReliefDriver = false;
            ped.isDirectingTraffic = false;
            ped.wardenBottleneck = null;
            ped.carryProp = null;
            ped.wandWaveTimer = 0;
            return;
        }
        const targetX = obsVeh ? obsVeh.x : (bn ? bn.x : ped.x);
        const targetY = obsVeh ? obsVeh.y : (bn ? bn.y : ped.y);
        const distToTarget = Math.hypot(targetX - ped.x, targetY - ped.y);
        const clearSide = (bn && bn.clearSide) ? bn.clearSide : 1;

        // 1. When within 175px of the jam, wave the glowing orange traffic baton & issue physical steering/reverse/alternating-hold directives!
        if (distToTarget < 175 && Array.isArray(g.vehicles)) {
            ped.isDirectingTraffic = true;
            ped.wandWaveTimer = 0.85;
            const flowAng = (bn && typeof bn.flowAng === "number") ? bn.flowAng : (obsVeh ? (obsVeh.angle || 0) : (ped.angle || 0));
            const fCos = Math.cos(flowAng);
            const fSin = Math.sin(flowAng);
            let bypassingSameDirCount = 0;

            for (let i = 0; i < g.vehicles.length; i++) {
                const v = g.vehicles[i];
                if (!v || v.destroyed || !v.driver || v.driver === "PLAYER" || v === obsVeh) continue;
                const dv = Math.hypot(v.x - targetX, v.y - targetY);
                if (dv > 175) continue;
                const dirCos = Math.cos((v.angle || 0) - flowAng);

                if (dirCos >= -0.35) {
                    bypassingSameDirCount++;
                    // Early Cone-Taper Guidance: channel approaching or stalled vehicles smoothly along the diagonal cone taper onto the open lane
                    const targetOff = clearSide * 27;
                    if (Math.abs((v.aiPullOverOffset || 0) - targetOff) > 4 || (v.aiPullOverTimer || 0) < 1.2) {
                        v.aiPullOverOffset = targetOff;
                        v.aiPullOverTimer = Math.max(v.aiPullOverTimer || 0, 3.4);
                        v.aiTurnSignal = clearSide;
                        this.laneTracker.totalWardenDirectives++;
                        this.blackboard.totalTrafficWardenDirectives = this.laneTracker.totalWardenDirectives;
                    }
                    // If the vehicle is wedged behind an obstacle with gridlockTimer > 0.8, command a physical reverse-and-steer maneuver
                    if (Math.abs(v.speed || 0) < 8 && (v.wardenHoldTimer || 0) <= 0 && ((v.gridlockTimer || 0) > 0.8 || (v.yieldTimer || 0) > 1.4)) {
                        v.gridlockReverseTimer = Math.max(v.gridlockReverseTimer || 0, 1.35);
                        v.gridlockEscapeDir = clearSide;
                        v.gridlockEscapeTimer = Math.max(v.gridlockEscapeTimer || 0, 2.8);
                        v.yieldTimer = 0;
                    }
                }
            }

            // Real-World Alternating One-Lane Flagging:
            // While an active stationary obstacle blocks one lane and vehicles from the obstructed lane are bypassing onto the single remaining lane,
            // hold approaching oncoming traffic 38..155px before the pinch point on an alternating 4.5s window so neither direction deadlocks!
            const inHoldPhase = (Math.floor(((g.elapsedTime || 0) + (ped.animTime || 0)) / 4.5) % 2) === 0;
            if (hasActiveObstruction && bypassingSameDirCount > 0 && inHoldPhase) {
                for (let i = 0; i < g.vehicles.length; i++) {
                    const v = g.vehicles[i];
                    if (!v || v.destroyed || v.driver !== "AI_TRAFFIC" || v === obsVeh) continue;
                    const dirCos = Math.cos((v.angle || 0) - flowAng);
                    if (dirCos >= -0.45) continue;
                    // Oncoming vehicle travels along (-fCos, -fSin), so it is approaching the obstacle when (v - target) dot (fCos, fSin) > 38
                    const alongAhead = (v.x - targetX) * fCos + (v.y - targetY) * fSin;
                    const latDist = Math.abs(-(v.x - targetX) * fSin + (v.y - targetY) * fCos);
                    if (alongAhead > 38 && alongAhead < 155 && latDist < 42) {
                        if ((v.wardenHoldTimer || 0) <= 0.2) {
                            this.laneTracker.totalAlternatingHolds = (this.laneTracker.totalAlternatingHolds || 0) + 1;
                        }
                        v.wardenHoldTimer = Math.max(v.wardenHoldTimer || 0, 1.25);
                    }
                }
            }
        } else {
            ped.isDirectingTraffic = false;
        }

        // 2. If there is an intact unoccupied vehicle obstructing the traffic lane (whether police cruiser, criminal car, or abandoned civilian car),
        // the Traffic Warden physically walks up to its driver-side door, opens the door, climbs in, and drives it out of the blocked lane!
        if (obsVeh && !obsVeh.destroyed && obsVeh.driver === null && !obsVeh.towedByTruck && obsVeh !== (g.player && g.player.inVehicle)) {
            ped._boardingVeh = obsVeh;
            ped.homeCruiser = obsVeh;
            const boardDist = Math.max(46, (obsVeh.w || 48) * 0.54 + 14);
            if (distToTarget < boardDist) {
                obsVeh.driver = (obsVeh.isPolice && (g.wantedLevel || 0) > 0) ? "AI_COP" : "AI_TRAFFIC";
                obsVeh.noDeployCooldown = 5.2;
                obsVeh.wasCriminalCar = false;
                obsVeh.lastPlayerDriven = false;
                obsVeh.abandonedTimer = 0;
                obsVeh.doorOpenTimer = 0.44;
                obsVeh.aiPullOverOffset = clearSide * 24;
                obsVeh.aiPullOverTimer = 2.6;
                ped._boardedVehicle = true;
                ped.dead = true;
                this.laneTracker.totalWardenDirectives++;
                this.blackboard.totalTrafficWardenDirectives = this.laneTracker.totalWardenDirectives;
                this.laneTracker.totalWardenBoardings++;
                this.blackboard.totalTrafficWardenBoardings = this.laneTracker.totalWardenBoardings;
                this.emitEvent("TRAFFIC_WARDEN_CLEARED_VEHICLE", {
                    wardenId: ped.id,
                    vehId: obsVeh.id,
                    specKey: obsVeh.specKey
                });
                return;
            }
        }
    }

    /* ========================================================================
       4. ENTITY AUTHORITY LEDGER, SELF-HEALING SANITIZER & KINEMATIC VALIDATOR
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
            entry = { lastX: v.x, lastY: v.y, lastDryX: v.x, lastDryY: v.y, owner: this.getVehicleAuthority(v), lastSyncMs: now, allowSnapUntilMs: 0 };
            this.vehicleLedger.set(v.id, entry);
        }
        entry.allowSnapUntilMs = now + durationMs;
        entry.lastX = v.x;
        entry.lastY = v.y;
    }

    autoHealWorldAnomalies() {
        const g = this.game;
        if (!g) return 0;
        let healed = 0;
        const boatSpecs = new Set(["AIRBOAT", "SPEEDBOAT", "JETSKI", "YACHT", "SWAMP_BOAT"]);

        if (Array.isArray(g.vehicles)) {
            for (let i = 0; i < g.vehicles.length; i++) {
                const v = g.vehicles[i];
                if (!v) continue;
                const entry = v.id ? this.vehicleLedger.get(v.id) : null;

                // 1. Heal NaN vehicle kinematics
                if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z || 0) || !Number.isFinite(v.angle || 0)) {
                    v.x = (entry && Number.isFinite(entry.lastX)) ? entry.lastX : ((g.player && Number.isFinite(g.player.x)) ? g.player.x : 16384);
                    v.y = (entry && Number.isFinite(entry.lastY)) ? entry.lastY : ((g.player && Number.isFinite(g.player.y)) ? g.player.y : 16384);
                    v.z = 2.0;
                    v.angle = 0;
                    v.vx = 0;
                    v.vy = 0;
                    v.speed = 0;
                    v.angularVelocity = 0;
                    healed++;
                    this.emitEvent("ANOMALY_HEALED", { kind: "NAN_VEHICLE", vehId: v.id });
                }

                // 2. Heal asymmetric / orphaned tow links
                if (v.towingVehicle && v.towingVehicle.towedByTruck !== v) {
                    v.towingVehicle = null;
                    healed++;
                    this.emitEvent("ANOMALY_HEALED", { kind: "ORPHAN_TOW_LINK", vehId: v.id });
                }
                if (v.towedByTruck && v.towedByTruck.towingVehicle !== v) {
                    v.towedByTruck = null;
                    healed++;
                    this.emitEvent("ANOMALY_HEALED", { kind: "ORPHAN_TOWED_BY_LINK", vehId: v.id });
                }

                // 3. Heal AI land vehicles accidentally pushed into deep water
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
                    if (entry && Number.isFinite(entry.lastDryX) && Number.isFinite(entry.lastDryY) && !g.map.isWaterAtPixel(entry.lastDryX, entry.lastDryY)) {
                        v.x = entry.lastDryX;
                        v.y = entry.lastDryY;
                        v.vx = 0;
                        v.vy = 0;
                        v.speed = 0;
                        healed++;
                        this.emitEvent("ANOMALY_HEALED", { kind: "AI_VEHICLE_IN_WATER", vehId: v.id });
                    }
                }
            }
        }

        if (Array.isArray(g.peds)) {
            for (let i = 0; i < g.peds.length; i++) {
                const ped = g.peds[i];
                if (!ped) continue;
                if (!Number.isFinite(ped.x) || !Number.isFinite(ped.y) || !Number.isFinite(ped.angle || 0)) {
                    ped.x = (g.player && Number.isFinite(g.player.x)) ? g.player.x + 64 : 16384;
                    ped.y = (g.player && Number.isFinite(g.player.y)) ? g.player.y + 64 : 16384;
                    ped.z = 2.0;
                    ped.angle = 0;
                    ped.speed = 0;
                    healed++;
                    this.emitEvent("ANOMALY_HEALED", { kind: "NAN_PED", pedId: ped.id });
                }
            }
        }

        if (healed > 0) {
            this.blackboard.totalAnomaliesHealed = (this.blackboard.totalAnomaliesHealed || 0) + healed;
        }
        return healed;
    }

    updateAndAuditFrame(dt) {
        const g = this.game;
        if (!g) return;
        this.updateOpenCarryScrutiny(dt);
        this.updateLeonidaViralClips(dt);
        this.updateLuxuryGpsTrackers(dt);
        this.updateStreetIntimidation(dt);
        this.updateFocusMode(dt);
        this.updateSpikeStrips(dt);
        this.updateStreetTakeoverHype(dt);
        this.updateNavigableLaneTracker(dt);
        this.autoHealWorldAnomalies();
        if (!Array.isArray(g.vehicles)) return;
        const now = this.nowMs();
        const p = g.player;
        const camX = (g.renderer && Number.isFinite(g.renderer.camX)) ? g.renderer.camX : (p ? p.x : 0);
        const camY = (g.renderer && Number.isFinite(g.renderer.camY)) ? g.renderer.camY : (p ? p.y : 0);

        for (let i = 0; i < g.vehicles.length; i++) {
            const v = g.vehicles[i];
            if (!v || !v.id) continue;
            const auth = this.getVehicleAuthority(v);
            const isDry = !(g.map && typeof g.map.isWaterAtPixel === "function" && g.map.isWaterAtPixel(v.x, v.y));
            let entry = this.vehicleLedger.get(v.id);
            if (!entry) {
                this.vehicleLedger.set(v.id, {
                    lastX: v.x,
                    lastY: v.y,
                    lastDryX: isDry ? v.x : undefined,
                    lastDryY: isDry ? v.y : undefined,
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
            if (isDry) {
                entry.lastDryX = v.x;
                entry.lastDryY = v.y;
            }
            entry.owner = auth;
            entry.lastSyncMs = now;
        }

        // Periodic Vehicle Ledger Garbage Collection (prevents memory growth from despawned traffic/emergency IDs over 24/7 sessions)
        if (this.vehicleLedger.size > g.vehicles.length + 48) {
            for (const [vid, entry] of this.vehicleLedger.entries()) {
                if (!entry || (now - (entry.lastSyncMs || 0)) > 15000) {
                    this.vehicleLedger.delete(vid);
                }
            }
        }
    }

    /* ========================================================================
       5. PRODUCTION CONTROL, SPATIAL PURSUIT PROBE & AUTOMATED SELF-AUDIT
       ======================================================================== */
    probePursuitReachabilityAt(targetX, targetY) {
        const g = this.game;
        const tileSize = (typeof TILE_SIZE !== "undefined") ? TILE_SIZE : 64;
        const onRoad = Boolean(g && g.map && typeof g.map.isRoadAtPixel === "function" && g.map.isRoadAtPixel(targetX, targetY));
        const onOpenBeach = this.isPointInOpenBeachOrPark(targetX, targetY);
        const offRoad = !onRoad;
        const coastalRoadX = (targetY < 75 * tileSize ? 456.5 : 445.0) * tileSize;

        let nearestRoadDistPx = onRoad ? 0 : 9999;
        let nearestRoadX = targetX;
        let nearestRoadY = targetY;
        if (!onRoad && g && g.map && typeof g.map.getNavigationBlock === "function") {
            const cbx = Math.floor(targetX / tileSize);
            const cby = Math.floor(targetY / tileSize);
            const roadType = (typeof GROUND_TYPE !== "undefined" && GROUND_TYPE.ROAD !== undefined) ? GROUND_TYPE.ROAD : 2;
            for (let r = 1; r <= 38 && nearestRoadDistPx === 9999; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                        const bx = cbx + dx;
                        const by = cby + dy;
                        if (bx < 2 || bx >= 510 || by < 2 || by >= 510) continue;
                        const nb = g.map.getNavigationBlock(bx, by, 2.0);
                        if (nb && nb.groundType === roadType && !nb.isRailway) {
                            const rx = (bx + 0.5) * tileSize;
                            const ry = (by + 0.5) * tileSize;
                            const d = Math.hypot(rx - targetX, ry - targetY);
                            if (d < nearestRoadDistPx) {
                                nearestRoadDistPx = Math.round(d);
                                nearestRoadX = rx;
                                nearestRoadY = ry;
                            }
                        }
                    }
                }
            }
        }

        const clearFromNearestRoad = this.hasLineOfSight(nearestRoadX, nearestRoadY, targetX, targetY, 2.0, 42);
        const cruiserCanCutOffRoad = Boolean(
            onRoad ||
            (onOpenBeach && Math.hypot(coastalRoadX - targetX, 0) < 2500) ||
            (offRoad && clearFromNearestRoad && nearestRoadDistPx < 950)
        );
        const footCopReboardThresholdPx = offRoad ? 1850 : 420;
        const effectiveSightRangePx = onOpenBeach ? 2450 : (offRoad ? 1450 : 480);

        return {
            x: Math.round(targetX),
            y: Math.round(targetY),
            bx: Math.floor(targetX / tileSize),
            by: Math.floor(targetY / tileSize),
            onRoad,
            onOpenBeach,
            offRoad,
            nearestRoadDistPx,
            nearestRoadX: Math.round(nearestRoadX),
            nearestRoadY: Math.round(nearestRoadY),
            clearFromNearestRoad,
            cruiserCanCutOffRoad,
            footCopReboardThresholdPx,
            effectiveSightRangePx,
            pursuitMode: onRoad ? "ROAD_GRID" : (onOpenBeach ? "BEACH_OFFROAD_INTERCEPT" : "OPEN_TERRAIN_INTERCEPT")
        };
    }

    runProductionSelfAudit() {
        const g = this.game;
        const checks = [];
        const addCheck = (id, ok, detail) => {
            checks.push({ id, ok: Boolean(ok), detail: String(detail || "") });
        };

        // 1. Map Topology & Coastal Mask
        const mapOk = Boolean(g && g.map && g.map.cmpLoaded && g.map.coastalSandMask && typeof g.map.traceSegment2D === "function");
        addCheck("MAP_TOPOLOGY", mapOk, mapOk ? "512x512x6 .CMP voxel map & 3D raycaster online" : "Map not loaded");

        // 2. 4-Agency Municipal HQ Stations
        const pSt = this.getEmergencyStations("POLICE");
        const mSt = this.getEmergencyStations("MEDIC");
        const fSt = this.getEmergencyStations("FIRE");
        const tSt = this.getEmergencyStations("TOW");
        const hqOk = pSt.length >= 1 && mSt.length >= 1 && fSt.length >= 1 && tSt.length >= 1;
        addCheck("MUNICIPAL_HQ_GATES", hqOk, `POLICE=${pSt.length}, MEDIC=${mSt.length}, FIRE=${fSt.length}, TOW=${tSt.length}`);

        // 3. 3D Perception & Open-Beach vs Building Occlusion
        const wallBlocked = g && g.map ? g.map.traceSegment2D(439.5 * 64, 284.5 * 64, 443.5 * 64, 284.5 * 64, 2.0).hit : false;
        const beachClear = g && g.map ? !g.map.traceSegment2D(444.5 * 64, 276.5 * 64, 468.0 * 64, 276.5 * 64, 2.0).hit : false;
        addCheck("PERCEPTION_3D_LOS", wallBlocked && beachClear, `Building occlusion=${wallBlocked}, Open beach LOS=${beachClear}`);

        // 4. Beach & Off-Road Pursuit Reachability (South Beach + North Beach)
        const sbProbe = this.probePursuitReachabilityAt(467.0 * 64, 276.5 * 64);
        const nbProbe = this.probePursuitReachabilityAt(467.0 * 64, 58.5 * 64);
        const beachPursuitOk = sbProbe.onOpenBeach && sbProbe.cruiserCanCutOffRoad && sbProbe.footCopReboardThresholdPx === 1850 &&
                               nbProbe.onOpenBeach && nbProbe.cruiserCanCutOffRoad && nbProbe.footCopReboardThresholdPx === 1850;
        addCheck("BEACH_OFFROAD_PURSUIT", beachPursuitOk, `SouthBeach=${sbProbe.pursuitMode}:cut=${sbProbe.cruiserCanCutOffRoad}:los=${sbProbe.clearFromNearestRoad}, NorthBeach=${nbProbe.pursuitMode}:cut=${nbProbe.cruiserCanCutOffRoad}:los=${nbProbe.clearFromNearestRoad}:road=(${Math.floor(nbProbe.nearestRoadX / 64)},${Math.floor(nbProbe.nearestRoadY / 64)})`);

        // 5. 911 Witness Pipeline Config
        const w911Ok = this.config.call911DurationSec >= 3.5 && this.config.crimeSceneRadiusPx === 240;
        addCheck("WITNESS_911_PIPELINE", w911Ok, `callDuration=${this.config.call911DurationSec}s, sceneRadius=${this.config.crimeSceneRadiusPx}px`);

        // 6. GTA 6 Trunk & Outfit Disguise API
        const trunkOk = typeof this.findNearestTrunkVehicle === "function" && typeof this.interactWithNearestVehicleTrunk === "function";
        addCheck("GTA6_TRUNK_DISGUISE", trunkOk, "Vehicle trunk arsenal & outfit disguise ready");

        // 7. GTA 6 Luxury Exotic GPS Tracker & Cal Hampton Jammer
        const gpsOk = this.luxuryTrackedSpecs instanceof Set && this.luxuryTrackedSpecs.has("VICE_CHEETAH") && typeof this.tryJamVehicleGpsTracker === "function";
        addCheck("GTA6_GPS_JAMMER", gpsOk, `Tracked exotic specs=${this.luxuryTrackedSpecs ? this.luxuryTrackedSpecs.size : 0}`);

        // 8. GTA 6 Street Hold-Ups & Intimidation
        const holdupOk = typeof this.tryIntimidateStreetPed === "function" && typeof this.updateStreetIntimidation === "function";
        addCheck("GTA6_HOLDUP_INTIMIDATION", holdupOk, "Street hold-up & brave NPC combat active");

        // 9. GTA 6 Unified Focus Mode / Eagle-Eye
        const focusOk = typeof this.activateFocusMode === "function" && typeof this.updateFocusMode === "function" && Number.isFinite(this.focusCharge);
        addCheck("GTA6_FOCUS_EAGLE_EYE", focusOk, `focusCharge=${Math.round(this.focusCharge || 0)}%`);

        // 10. GTA 6 Spike Strips & Rideout Customs Chop-Shop
        const spikeOk = typeof this.deployRoadblockSpikeStrip === "function" && typeof this.onPayNSprayRespray === "function" && typeof this.onCraneVehicleExport === "function";
        addCheck("GTA6_SPIKE_AND_CUSTOMS", spikeOk, "3★+ spike strips, tire blowout & chop-shop fence ready");

        // 11. GTA 6 @LeonidaFeed Social Ticker & Real Dimez Street Takeovers
        const socialOk = typeof this.pushLeonidaFeedPost === "function" && typeof this.updateStreetTakeoverHype === "function" && typeof this.onGatorWrangled === "function";
        addCheck("GTA6_SOCIAL_AND_TAKEOVERS", socialOk, `feedPosts=${this.leonidaFeedPosts.length}`);

        // 12. Runtime Invariant Oracle & Self-Healing Sanitizer
        this.autoHealWorldAnomalies();
        const inv = this.auditWorldInvariants();
        addCheck("WORLD_SANITIZER_ORACLE", inv.ok, `ok=${inv.ok}, healed=${this.blackboard.totalAnomaliesHealed || 0}, ledger=${this.vehicleLedger.size}`);

        // 13. Navigable Lane Flow Tracker & In-Game VCPD Traffic Warden AI Entity
        const laneOk = Boolean(
            this.laneTracker &&
            typeof this.updateNavigableLaneTracker === "function" &&
            typeof this.dispatchTrafficWardenForBottleneck === "function" &&
            typeof this.updateTrafficWardenBehavior === "function" &&
            g && g.map && typeof g.map.getLaneCongestionScore === "function"
        );
        addCheck("NAVIGABLE_LANE_TRACKER_AND_WARDEN_AI", laneOk, `congestedTiles=${this.laneTracker ? this.laneTracker.congestedTilesCount : 0}, wardens=${this.laneTracker ? this.laneTracker.totalWardensDispatched : 0}`);

        const passedCount = checks.filter((c) => c.ok).length;
        const buildVersion = (typeof window !== "undefined" && window.__VC26_BUILD) ? window.__VC26_BUILD : "101_219";
        const result = {
            ok: passedCount === checks.length,
            passedCount,
            totalCount: checks.length,
            buildVersion,
            checks,
            atMs: Math.round(this.nowMs())
        };
        this._lastSelfAudit = result;
        return result;
    }

    getEngineSnapshot() {
        const g = this.game;
        const recog = this.getWantedRecognitionStatus();
        const fleet = this.getFleetTelemetry();
        const inv = this.auditWorldInvariants();
        const pEnt = (g && g.player) ? (g.player.inVehicle || g.player) : null;
        const pursuitProbe = pEnt ? this.probePursuitReachabilityAt(pEnt.x, pEnt.y) : null;
        const audit = this._lastSelfAudit || this.runProductionSelfAudit();
        return {
            buildVersion: audit.buildVersion,
            wantedLevel: g ? (g.wantedLevel || 0) : 0,
            recognitionCode: recog ? recog.code : "CLEAN",
            recognitionLabel: recog ? recog.label : "0★ CLEAN PROFILE",
            focusCharge: Math.round(this.focusCharge || 0),
            focusActiveSec: Number((this.focusActiveTimer || 0).toFixed(1)),
            pursuitMode: pursuitProbe ? pursuitProbe.pursuitMode : "ROAD_GRID",
            effectiveSightRangePx: pursuitProbe ? pursuitProbe.effectiveSightRangePx : 480,
            blackboard: { ...this.blackboard },
            fleet,
            laneTracker: this.laneTracker ? {
                congestedTilesCount: this.laneTracker.congestedTilesCount || 0,
                activeBottlenecksCount: Array.isArray(this.laneTracker.activeBottlenecks) ? this.laneTracker.activeBottlenecks.length : 0,
                activeWardensCount: this.laneTracker.activeWardensCount || 0,
                totalBottlenecksDetected: this.laneTracker.totalBottlenecksDetected || 0,
                totalBottlenecksResolved: this.laneTracker.totalBottlenecksResolved || 0,
                totalWardensDispatched: this.laneTracker.totalWardensDispatched || 0,
                totalWardenDirectives: this.laneTracker.totalWardenDirectives || 0,
                totalWardenBoardings: this.laneTracker.totalWardenBoardings || 0,
                totalIntersectionDetours: (g && g.map && g.map.totalIntersectionDetours) || 0
            } : null,
            invariantsOk: inv.ok,
            anomaliesHealed: this.blackboard.totalAnomaliesHealed || 0,
            vehicleLedgerSize: this.vehicleLedger.size,
            auditPassedCount: audit.passedCount,
            auditTotalCount: audit.totalCount,
            recentEventsCount: this.eventLog.length,
            latestFeedPost: this.leonidaFeedPosts.length ? this.leonidaFeedPosts[this.leonidaFeedPosts.length - 1] : null
        };
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
