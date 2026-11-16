/* ============================================================================
   GRAND THEFT AUTO: LEONIDA '97 — SMARTPHONE STORY MISSION SYSTEM
   All story missions are launched & managed directly from Lucia's Smartphone.
   Street payphone booths remain physically present on sidewalks as silent props.
   ============================================================================ */

class MissionManager {
    constructor(game) {
        this.game = game;

        // Static sidewalk payphone booth locations + Smartphone Mission Contracts
        // (All 4 coordinates verified on clean PAWEMENT sidewalk tiles, off lid=69 planters, roads & palm canopies)
        this.payphones = [
            {
                id: "phone_ai_fixer",
                missionId: "M0_DYNAMIC_FIXER",
                shortTitle: "⚡ FIXER: LIVE 90S",
                caller: "ViceNet AI Fixer",
                rewardCash: 40000,
                name: "VICENET DYNAMIC 90S CONTRACT",
                briefing: "⚡ LIVE AI FIXER: Scans real vehicles & syndicates in your current district to generate an instant 90-second arcade contract!",
                x: 443.5 * TILE_SIZE,
                y: 285.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_motel",
                missionId: "M1_UNCLE_JACK",
                shortTitle: "M1: LIQUOR HOLD-UP",
                caller: "Jason Duval",
                rewardCash: 25000,
                name: "SOUTH BEACH LIQUOR HOLD-UP",
                briefing: "MISSION 1 (TRUST?): Hold up South Beach Liquor on Ocean Drive with Jason, then lose VCPD at Vice Customs!",
                x: 443.5 * TILE_SIZE,
                y: 285.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_scurve",
                missionId: "M2_GRASSRIVERS",
                shortTitle: "M2: PIER CONTRABAND",
                caller: "Dre'Quan Priest",
                rewardCash: 45000,
                name: "VICE BEACH PIER CONTRABAND",
                briefing: "MISSION 2 (CONTRABAND): Collect 3 contraband crates on Vice Beach & Ocean Pier, then deliver to Hotel Dixon!",
                x: 448.5 * TILE_SIZE,
                y: 293.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_downtown",
                missionId: "M3_OCEAN_DRIVE",
                shortTitle: "M3: CHEETAH BOOST",
                caller: "Jason Duval",
                rewardCash: 75000,
                name: "STAR ISLAND CHEETAH BOOST",
                briefing: "MISSION 3 (CHEETAH BOOST): Steal the VIP Grotti Cheetah on Star Island and deliver it to Vice Port Crane!",
                x: 344.5 * TILE_SIZE,
                y: 171.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_beach",
                missionId: "M4_ANKLE_OVERRIDE",
                shortTitle: "M4: ANKLE OVERRIDE",
                caller: "Lucia & Jason",
                rewardCash: 150000,
                name: "DOC ANKLE MONITOR OVERRIDE",
                briefing: "MISSION 4 (THE BIG SCORE): Ambush the Armored Van in Port Gellhorn, then hack the DOC Relay at VCIA Airport!",
                x: 68.5 * TILE_SIZE,
                y: 187.5 * TILE_SIZE,
                completed: false
            }
        ];

        this.selectedMissionIdx = 0;
        this.activeMission = null;
        this.ringTimer = 0;
        this._fixerRollIdx = 0;
    }

    getSelectedPhone() {
        if (!Array.isArray(this.payphones) || this.payphones.length === 0) return null;
        const idx = Math.max(0, Math.min(this.payphones.length - 1, this.selectedMissionIdx || 0));
        return this.payphones[idx];
    }

    cycleSelectedMission(delta = 1) {
        if (!Array.isArray(this.payphones) || this.payphones.length === 0) return null;
        this.selectedMissionIdx = (this.selectedMissionIdx + delta + this.payphones.length) % this.payphones.length;
        const sel = this.getSelectedPhone();
        if (sel && this.game && typeof this.game.sendPager === "function") {
            const statusTag = sel.completed ? " [REPLAY]" : ` [$${(sel.rewardCash || 25000).toLocaleString()}]`;
            this.game.sendPager(
                `📱 ${sel.caller.toUpperCase()}`,
                `${sel.briefing}${statusTag}`,
                false
            );
        }
        return sel;
    }

    startMobileMission() {
        if (this.activeMission) return false;
        const sel = this.getSelectedPhone();
        if (!sel) return false;
        this.startMission(sel);
        return true;
    }

    abortMission() {
        if (!this.activeMission) return false;
        const g = this.game;
        this.cleanupMissionVehicles();
        this.activeMission = null;
        if (g) {
            if (typeof g.showBigBanner === "function") {
                g.showBigBanner("MISSION CANCELED", "CONTRACT ABORTED FROM SMARTPHONE", "#f87171", 2.2);
            }
            if (typeof g.sendPager === "function") {
                g.sendPager(
                    "📱 SMARTPHONE // DISPATCH",
                    "Mission contract aborted. Tap [START] on your Smartphone whenever you want to launch a mission.",
                    false
                );
            }
        }
        return true;
    }

    cleanupMissionVehicles() {
        const g = this.game;
        if (!g || !Array.isArray(g.vehicles)) return;
        const pVeh = g.player ? g.player.inVehicle : null;
        g.vehicles = g.vehicles.filter((v) => {
            if (!v || v === pVeh) return true;
            return v.id !== "mission_cheetah" && v.id !== "mission_brinks" && v.id !== "fixer_target_car";
        });
        if (Array.isArray(g.peds)) {
            g.peds = g.peds.filter((pd) => !pd || pd.missionTag !== "FIXER_VIP");
        }
    }

    onInteriorRobbery() {
        const m = this.activeMission;
        const g = this.game;
        if (!m || !g) return;
        if (m.id === "M1_UNCLE_JACK" && m.stage === 1) {
            m.stage = 2;
            g.setWantedLevel(Math.max(g.wantedLevel, 2));
            g.sendPager(
                "JASON (SMARTPHONE)",
                "REGISTER CLEARED! VCPD cruisers incoming! Drive to VICE CUSTOMS PAY 'N' SPRAY on Collins Ave (or change outfits) to lose the heat!",
                true
            );
            m.targetPos = { x: 435.5 * TILE_SIZE, y: 287.7 * TILE_SIZE };
            m.objectiveLabel = "RESPRAY AT VICE CUSTOMS (COLLINS AVE)";
        }
    }

    getTargetPosition() {
        if (this.activeMission && this.activeMission.targetPos) {
            return {
                x: this.activeMission.targetPos.x,
                y: this.activeMission.targetPos.y,
                label: this.activeMission.objectiveLabel || "OBJECTIVE",
                color: "#ff2a85"
            };
        }
        // Payphones never ring or act as mission triggers anymore; missions are launched via Smartphone!
        return null;
    }

    update(dt) {
        const g = this.game;
        const p = g.player;

        if (!this.activeMission) {
            return;
        }

        const m = this.activeMission;
        if (m.timer !== null && m.timer !== undefined) {
            m.timer -= dt;
            if (m.timer <= 0) {
                this.failMission("TIME EXPIRED! THE SCORE GOT AWAY.");
                return;
            }
        }

        if (m.id === "M1_UNCLE_JACK") {
            if (m.stage === 1) {
                const d = Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y);
                if (d < 68) {
                    m.stage = 2;
                    g.addCash(15000, "REGISTER ROBBED!");
                    g.setWantedLevel(Math.max(g.wantedLevel, 2));
                    g.sendPager(
                        "JASON (SMARTPHONE)",
                        "REGISTER CLEARED ($15,000)! VCPD cruisers incoming! Drive west to VICE CUSTOMS PAY 'N' SPRAY on Collins Ave to lose the heat!",
                        true
                    );
                    m.targetPos = { x: 435.5 * TILE_SIZE, y: 287.7 * TILE_SIZE };
                    m.objectiveLabel = "RESPRAY AT VICE CUSTOMS (COLLINS AVE)";
                }
            } else if (m.stage === 2) {
                if (g.wantedLevel === 0) {
                    this.completeMission(m.phone, "TRUST? — HOLD-UP COMPLETE", 25000);
                }
            }
        } else if (m.id === "M2_GRASSRIVERS") {
            if (m.stage === 1) {
                for (let i = m.crates.length - 1; i >= 0; i--) {
                    const c = m.crates[i];
                    if (Math.hypot(p.x - c.x, p.y - c.y) < 58) {
                        m.crates.splice(i, 1);
                        g.addCash(5000, "CONTRABAND CRATE");
                        g.audio.playCashSound();
                    }
                }
                if (m.crates.length > 0) {
                    m.targetPos = { x: m.crates[0].x, y: m.crates[0].y };
                    m.objectiveLabel = `COLLECT BEACH & PIER CRATES (${3 - m.crates.length}/3)`;
                } else {
                    m.stage = 2;
                    m.targetPos = { x: mx256(213.5) * TILE_SIZE, y: my256(146.0) * TILE_SIZE };
                    m.objectiveLabel = "DELIVER HAUL TO HOTEL DIXON";
                    g.setWantedLevel(Math.max(g.wantedLevel, 2));
                    g.sendPager(
                        "DRE'QUAN (SMARTPHONE)",
                        "All 3 beach contraband crates secured! Bring the stash back to Hotel Dixon on Ocean Drive!",
                        true
                    );
                }
            } else if (m.stage === 2) {
                const insideHotelDixon = Boolean(g.activeInterior && g.activeInterior.id === "HOTEL_DIXON");
                if (insideHotelDixon || Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 82) {
                    this.completeMission(m.phone, "VICE BEACH CONTRABAND RUN", 45000);
                }
            }
        } else if (m.id === "M3_OCEAN_DRIVE") {
            if (m.stage === 1) {
                if (m.targetCar && !m.targetCar.destroyed) {
                    m.targetPos = { x: m.targetCar.x, y: m.targetCar.y };
                }
                if (p.inVehicle && p.inVehicle === m.targetCar) {
                    m.stage = 2;
                    m.timer = 90;
                    g.setWantedLevel(Math.max(g.wantedLevel, 3));
                    m.targetPos = { x: mx256(171.5) * TILE_SIZE, y: my256(164.5) * TILE_SIZE };
                    m.objectiveLabel = "DELIVER CHEETAH TO VICE PORT CRANE";
                    g.sendPager(
                        "JASON (SMARTPHONE)",
                        "Sweet ride! 3-Star VCPD alert! Punch it south across the causeway to the Port of Vice City Container Crane before time runs out!",
                        true
                    );
                } else if (m.targetCar && m.targetCar.destroyed) {
                    this.failMission("THE TARGET CHEETAH WAS DESTROYED!");
                }
            } else if (m.stage === 2) {
                if (m.targetCar && m.targetCar.destroyed) {
                    this.failMission("THE TARGET CHEETAH WAS DESTROYED!");
                    return;
                }
                const craneDist = Math.min(
                    Math.hypot(p.x - mx256(171.5) * TILE_SIZE, p.y - my256(162.5) * TILE_SIZE),
                    Math.hypot(p.x - 333.2 * TILE_SIZE, p.y - 306.5 * TILE_SIZE)
                );
                if (p.inVehicle === m.targetCar && (Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 95 || craneDist < 110)) {
                    this.completeMission(m.phone, "STAR ISLAND GRAND THEFT", 75000);
                }
            }
        } else if (m.id === "M4_ANKLE_OVERRIDE") {
            if (m.stage === 1) {
                const v = m.armoredVan;
                if (v && !v.destroyed) {
                    m.targetPos = { x: v.x, y: v.y };
                }
                if (!v || v.destroyed || p.inVehicle === v) {
                    m.stage = 2;
                    g.addCash(50000, "ARMORED VAULT LOOT!");
                    g.setWantedLevel(Math.max(g.wantedLevel, 4));
                    m.targetPos = { x: 128.0 * TILE_SIZE, y: 297.5 * TILE_SIZE };
                    m.objectiveLabel = "HACK DOC RELAY AT VCIA AIRPORT";
                    g.sendPager(
                        "LUCIA & JASON",
                        "Vault cash secured! 4-STAR SWAT MANHUNT! Race south to VCIA International Airport Terminal (128, 297) to scramble Lucia's DOC Ankle Monitor!",
                        true
                    );
                }
            } else if (m.stage === 2) {
                const altAirDist = Math.hypot(p.x - mx256(66.5) * TILE_SIZE, p.y - my256(152.0) * TILE_SIZE);
                if (Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 92 || altAirDist < 92) {
                    g.player.ankleScrambled = true;
                    g.setWantedLevel(0);
                    this.completeMission(m.phone, "LEONIDA KINGPIN — ANKLE MONITOR OVERRIDDEN!", 150000);
                }
            }
        } else if (m.id === "M0_DYNAMIC_FIXER") {
            if (m.archetype === "HIJACK_LIVE_TARGET") {
                if (m.stage === 1) {
                    if (!m.targetCar || m.targetCar.destroyed) {
                        this.failMission("THE TARGET VEHICLE WAS DESTROYED!");
                        return;
                    }
                    m.targetPos = { x: m.targetCar.x, y: m.targetCar.y };
                    if (p.inVehicle === m.targetCar) {
                        m.stage = 2;
                        m.timer = 90;
                        g.setWantedLevel(Math.max(g.wantedLevel, 2));
                        m.targetPos = { x: m.dropPos.x, y: m.dropPos.y };
                        m.objectiveLabel = `DELIVER ${m.targetCar.name} TO ${m.dropName}`;
                        g.sendPager(
                            "📱 VICENET AI FIXER",
                            `🔥 You're in the ${m.targetCar.name}! VCPD alerted (2★)! Deliver it intact to ${m.dropName} before the 90s timer runs out!`,
                            true
                        );
                    }
                } else if (m.stage === 2) {
                    if (!m.targetCar || m.targetCar.destroyed) {
                        this.failMission("THE TARGET VEHICLE WAS WRECKED BEFORE DELIVERY!");
                        return;
                    }
                    if (p.inVehicle === m.targetCar && Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 92) {
                        this.completeMission(null, `FIXER BOOST: ${m.targetCar.name}`, m.reward || 35000);
                    }
                }
            } else if (m.archetype === "RAM_AND_EXTORT") {
                if (m.stage === 1) {
                    const tc = m.targetCar;
                    if (tc && !tc.destroyed && tc.hp > tc.maxHp * 0.48 && p.inVehicle !== tc) {
                        m.targetPos = { x: tc.x, y: tc.y };
                    } else {
                        const dropX = tc ? tc.x : m.targetPos.x;
                        const dropY = tc ? tc.y : m.targetPos.y;
                        if (p.inVehicle === tc) {
                            this.completeMission(null, "COURIER HIJACKED & LOOTED", m.reward || 40000);
                            return;
                        }
                        m.stage = 2;
                        m.targetPos = { x: dropX, y: dropY };
                        m.objectiveLabel = "GRAB THE DROPPED CARTEL BRIEFCASE!";
                        g.addFloatingText(dropX, dropY - 24, "💼 BRIEFCASE DROPPED!", "#fde047");
                        g.sendPager(
                            "📱 VICENET AI FIXER",
                            "💼 The courier panicked and dropped the briefcase! Grab the cash at the marker right now!",
                            true
                        );
                    }
                } else if (m.stage === 2) {
                    if (Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 46) {
                        this.completeMission(null, "CARTEL COURIER EXTORTION", m.reward || 40000);
                    }
                }
            } else if (m.archetype === "SPEED_BOMB_RUN") {
                if (!m.targetCar || m.targetCar.destroyed) {
                    this.failMission("THE NITRO-RIGGED VEHICLE BLEW UP!");
                    return;
                }
                if (m.stage === 1) {
                    m.targetPos = { x: m.targetCar.x, y: m.targetCar.y };
                    if (p.inVehicle === m.targetCar) {
                        m.stage = 2;
                        m.timer = 75;
                        m.slowTimer = 0;
                        m.targetPos = { x: m.dropPos.x, y: m.dropPos.y };
                        m.objectiveLabel = `KEEP SPEED HIGH -> ${m.dropName}`;
                        g.sendPager(
                            "📱 VICENET AI FIXER",
                            `💣 NITRO RIG ARMED! Keep the ${m.targetCar.name} moving fast to ${m.dropName}! If you stop for 4.5 seconds, it blows!`,
                            true
                        );
                    }
                } else if (m.stage === 2) {
                    if (p.inVehicle !== m.targetCar) {
                        m.objectiveLabel = `GET BACK IN THE ${m.targetCar.name}!`;
                    } else {
                        m.objectiveLabel = `SPEED RUN -> ${m.dropName}`;
                    }
                    const spd = Math.hypot(m.targetCar.vx || 0, m.targetCar.vy || 0) || Math.abs(m.targetCar.speed || 0);
                    if (spd < 48) {
                        m.slowTimer = (m.slowTimer || 0) + dt;
                        if (Math.floor((m.slowTimer - dt) * 2) !== Math.floor(m.slowTimer * 2)) {
                            const left = Math.max(1, Math.ceil(4.5 - m.slowTimer));
                            g.addFloatingText(m.targetCar.x, m.targetCar.y - 26, `💣 SPEED LOW! DETONATION IN ${left}s!`, "#ef4444");
                            if (g.audio && typeof g.audio.playBeep === "function") g.audio.playBeep(880, 0.07, "square", 0.08);
                        }
                        if (m.slowTimer >= 4.5) {
                            g.explodeVehicle(m.targetCar, false, false);
                            this.failMission("STOPPED TOO LONG — NITRO RIG DETONATED!");
                            return;
                        }
                    } else {
                        m.slowTimer = Math.max(0, (m.slowTimer || 0) - dt * 1.6);
                    }
                    if (p.inVehicle === m.targetCar && Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 90) {
                        this.completeMission(null, `NITRO SPEED DELIVERY (${m.dropName})`, m.reward || 45000);
                    }
                }
            } else if (m.archetype === "VIP_HIT_SQUAD") {
                if (m.targetPed && !m.targetPed.dead) {
                    m.targetPos = { x: m.targetPed.x, y: m.targetPed.y };
                } else {
                    this.completeMission(null, `SYNDICATE VIP ELIMINATED`, m.reward || 35000);
                }
            }
        }
    }

    findNearbyRoadSpot(minDist = 200, maxDist = 420) {
        const g = this.game;
        const p = g.player;
        const pz = p.z || 2.0;
        for (let att = 0; att < 32; att++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const tx = Math.floor((p.x + Math.cos(ang) * dist) / TILE_SIZE);
            const ty = Math.floor((p.y + Math.sin(ang) * dist) / TILE_SIZE);
            if (g.map.isRestrictedNoTrafficZone && g.map.isRestrictedNoTrafficZone(tx, ty)) continue;
            const nb = g.map.getNavigationBlock ? g.map.getNavigationBlock(tx, ty, pz) : null;
            if (!nb || nb.groundType !== GROUND_TYPE.ROAD) continue;
            const wx = (tx + 0.5) * TILE_SIZE;
            const wy = (ty + 0.5) * TILE_SIZE;
            if (g.map.resolveCircleBuildingCollision && g.map.resolveCircleBuildingCollision(wx, wy, 22, pz).hit) continue;
            const wz = g.map.getHeightAtPixel ? g.map.getHeightAtPixel(wx, wy, pz) : 2.0;
            const roadAng = g.map.getAlignedRoadAngle ? g.map.getAlignedRoadAngle(tx, ty, ang, pz) : 0;
            return { x: wx, y: wy, z: wz, angle: roadAng };
        }
        return { x: p.x + 220, y: p.y, z: pz, angle: 0 };
    }

    startDynamicFixerMission(phone) {
        const g = this.game;
        const p = g.player;
        const pName = (g.net && g.net.playerName) || p.nickname || "LUCIA";
        const distName = g.currentDistrict || "VICE CITY";
        const archetypes = ["HIJACK_LIVE_TARGET", "RAM_AND_EXTORT", "SPEED_BOMB_RUN", "VIP_HIT_SQUAD"];
        const arch = archetypes[(this._fixerRollIdx++) % archetypes.length];

        if (arch === "HIJACK_LIVE_TARGET") {
            // Scan for a real live exotic/muscle car in the player's vicinity first!
            let targetCar = null;
            let bestScore = -1;
            for (const v of g.vehicles) {
                if (!v || v.destroyed || v === p.inVehicle || v.driver === "REMOTE" || v.missionTag || v.isEstateCar || v.waterOnly) continue;
                const d = Math.hypot(v.x - p.x, v.y - p.y);
                if (d < 130 || d > 520) continue;
                const isExotic = v.maxSpeed >= 265 ? 2 : 1;
                const sc = isExotic * 1000 - d;
                if (sc > bestScore) {
                    bestScore = sc;
                    targetCar = v;
                }
            }
            if (!targetCar) {
                const spot = this.findNearbyRoadSpot(220, 380);
                const pool = ["VICE_CHEETAH", "BANSHEE_GT", "STINGER_CABRIO", "PENETRATOR_GT", "CHALLENGER_RT"];
                const spec = pool[Math.floor(Math.random() * pool.length)];
                targetCar = new Vehicle("fixer_target_car", spec, spot.x, spot.y, spot.angle);
                targetCar.z = spot.z;
                targetCar.driver = "AI_TRAFFIC";
                g.vehicles.push(targetCar);
            }
            // Pick nearest Pay 'n' Spray or Crane as drop-off
            let bestDrop = { name: "VICE CUSTOMS", x: 435.5 * TILE_SIZE, y: 287.7 * TILE_SIZE };
            let bestDropDist = Infinity;
            if (g.map && Array.isArray(g.map.payNSprays)) {
                for (const pns of g.map.payNSprays) {
                    const dx = pns.x + pns.w * 0.5;
                    const dy = pns.y + pns.h * 0.5;
                    const d = Math.hypot(dx - targetCar.x, dy - targetCar.y);
                    if (d > 260 && d < bestDropDist) {
                        bestDropDist = d;
                        bestDrop = { name: pns.name.split("(")[0].trim(), x: dx, y: dy };
                    }
                }
            }
            this.activeMission = {
                id: "M0_DYNAMIC_FIXER",
                archetype: "HIJACK_LIVE_TARGET",
                title: `LIVE BOOST: ${targetCar.name}`,
                phone,
                stage: 1,
                timer: 95,
                reward: 35000,
                targetCar,
                dropPos: { x: bestDrop.x, y: bestDrop.y },
                dropName: bestDrop.name,
                targetPos: { x: targetCar.x, y: targetCar.y },
                objectiveLabel: `BOOST ${targetCar.name} IN ${distName}`
            };
            g.sendPager(
                "📱 VICENET AI FIXER",
                `Yo ${pName}! Our spotter in ${distName} just tagged a high-value ${targetCar.name}! Hijack it and deliver it to ${bestDrop.name} for $35,000!`,
                true
            );
            g.showBigBanner("⚡ FIXER: LIVE BOOST", `STEAL THE ${targetCar.name} & DELIVER TO ${bestDrop.name}`, "#00f0ff", 2.6);
        } else if (arch === "RAM_AND_EXTORT") {
            const spot = this.findNearbyRoadSpot(220, 390);
            const pool = ["CHALLENGER_RT", "TULIP_MUSCLE", "PENETRATOR_GT"];
            const spec = pool[Math.floor(Math.random() * pool.length)];
            const courier = new Vehicle("fixer_target_car", spec, spot.x, spot.y, spot.angle);
            courier.z = spot.z;
            courier.driver = "AI_CRIMINAL";
            courier.wasCriminalCar = true;
            courier.hp = 260;
            courier.maxHp = 260;
            g.vehicles.push(courier);

            this.activeMission = {
                id: "M0_DYNAMIC_FIXER",
                archetype: "RAM_AND_EXTORT",
                title: "CARTEL COURIER EXTORTION",
                phone,
                stage: 1,
                timer: 90,
                reward: 40000,
                targetCar: courier,
                targetPos: { x: courier.x, y: courier.y },
                objectiveLabel: `RAM OR SHOOT THE ${courier.name} COURIER!`
            };
            g.sendPager(
                "📱 VICENET AI FIXER",
                `${pName}, a Cartel courier in a ${courier.name} is cutting through ${distName} with $40,000 in bearer bonds! Ram or shoot his car until he drops the briefcase!`,
                true
            );
            g.showBigBanner("💥 FIXER: RAM & EXTORT", `SMASH THE ${courier.name} COURIER FOR $40,000!`, "#f97316", 2.6);
        } else if (arch === "SPEED_BOMB_RUN") {
            let bombCar = (p.inVehicle && !p.inVehicle.destroyed && !p.inVehicle.waterOnly) ? p.inVehicle : null;
            if (!bombCar) {
                const spot = this.findNearbyRoadSpot(90, 190);
                bombCar = new Vehicle("fixer_target_car", "BANSHEE_GT", spot.x, spot.y, spot.angle);
                bombCar.z = spot.z;
                g.vehicles.push(bombCar);
            }
            let dropLm = { shortName: "OCEAN DRIVE", x: 443.5 * TILE_SIZE, y: 287.0 * TILE_SIZE };
            if (g.map && Array.isArray(g.map.landmarks)) {
                const cands = g.map.landmarks.filter((lm) => {
                    const d = Math.hypot(lm.x - p.x, lm.y - p.y);
                    return d > 520 && d < 1800;
                });
                if (cands.length > 0) {
                    dropLm = cands[Math.floor(Math.random() * cands.length)];
                }
            }
            const alreadyIn = (p.inVehicle === bombCar);
            this.activeMission = {
                id: "M0_DYNAMIC_FIXER",
                archetype: "SPEED_BOMB_RUN",
                title: "60 MPH NITRO RUN",
                phone,
                stage: alreadyIn ? 2 : 1,
                timer: alreadyIn ? 75 : 90,
                slowTimer: 0,
                reward: 45000,
                targetCar: bombCar,
                dropPos: { x: dropLm.x, y: dropLm.y },
                dropName: dropLm.shortName || dropLm.short || "DROP ZONE",
                targetPos: alreadyIn ? { x: dropLm.x, y: dropLm.y } : { x: bombCar.x, y: bombCar.y },
                objectiveLabel: alreadyIn ? `SPEED RUN -> ${dropLm.shortName || "DROP ZONE"}` : `BOARD THE NITRO ${bombCar.name}`
            };
            g.sendPager(
                "📱 VICENET AI FIXER",
                `💣 High-voltage job, ${pName}! This ${bombCar.name} is wired with a speed-sensitive nitro payload. Floor it to ${this.activeMission.dropName} without stopping for $45,000!`,
                true
            );
            g.showBigBanner("💣 60 MPH NITRO RUN", `FLOOR IT TO ${this.activeMission.dropName} — DO NOT STOP!`, "#ef4444", 2.6);
        } else {
            const spot = this.findNearbyRoadSpot(230, 390);
            const vip = new Pedestrian({
                id: `fixer_vip_${Date.now()}`,
                x: spot.x,
                y: spot.y,
                z: spot.z,
                kind: "CRIMINAL",
                g24Type: "g2_zaibatsu",
                g2Remapped: true,
                missionTag: "FIXER_VIP",
                copWeapon: "UZI",
                hp: 155,
                maxHp: 155,
                speed: 88
            });
            vip.attackedByPlayer = true;
            g.peds.push(vip);
            for (let b = 0; b < 2; b++) {
                const guard = new Pedestrian({
                    id: `fixer_guard_${Date.now()}_${b}`,
                    x: spot.x + (b === 0 ? -18 : 18),
                    y: spot.y + 14,
                    z: spot.z,
                    kind: "CRIMINAL",
                    g24Type: "g2_russian",
                    g2Remapped: true,
                    missionTag: "FIXER_VIP",
                    copWeapon: b === 0 ? "SHOTGUN" : "PISTOL",
                    hp: 110,
                    maxHp: 110,
                    speed: 84
                });
                guard.attackedByPlayer = true;
                g.peds.push(guard);
            }
            this.activeMission = {
                id: "M0_DYNAMIC_FIXER",
                archetype: "VIP_HIT_SQUAD",
                title: "SYNDICATE VIP HIT",
                phone,
                stage: 1,
                timer: 90,
                reward: 35000,
                targetPed: vip,
                targetPos: { x: vip.x, y: vip.y },
                objectiveLabel: `ELIMINATE SYNDICATE LIEUTENANT IN ${distName}`
            };
            g.sendPager(
                "📱 VICENET AI FIXER",
                `🎯 Contract live for ${pName}: A Syndicate Lieutenant and his 2 bodyguards were just spotted in ${distName}. Take him out within 90s for $35,000!`,
                true
            );
            g.showBigBanner("🎯 SYNDICATE VIP HIT", `ELIMINATE THE LIEUTENANT IN ${distName}`, "#ff2a85", 2.6);
        }
    }

    startMission(phone) {
        const g = this.game;
        this.cleanupMissionVehicles();
        g.audio.playCashSound();

        if (phone.missionId === "M0_DYNAMIC_FIXER") {
            this.startDynamicFixerMission(phone);
            return;
        }
        if (phone.missionId === "M1_UNCLE_JACK") {
            this.activeMission = {
                id: "M1_UNCLE_JACK",
                title: "TRUST? — SOUTH BEACH LIQUOR",
                phone: phone,
                stage: 1,
                timer: null,
                targetPos: { x: mx256(213.5) * TILE_SIZE, y: my256(155.5) * TILE_SIZE },
                objectiveLabel: "HOLD UP SOUTH BEACH LIQUOR"
            };
            g.recruitJason();
            g.toggleBandana(true);
            g.sendPager(
                "LUCIA & JASON",
                "MISSION 1: 'TRUST?' — Red heist bandana on! Head south down Ocean Drive (or enter any Bodega/Shop to rob the register), then lose the cops at Vice Customs!",
                true
            );
            g.showBigBanner("MISSION 1: TRUST?", "ROB SOUTH BEACH LIQUOR WITH JASON", "#ff2a85", 2.4);
        } else if (phone.missionId === "M2_GRASSRIVERS") {
            const crates = [
                { x: mx256(224.5) * TILE_SIZE, y: my256(150.0) * TILE_SIZE },
                { x: mx256(232.5) * TILE_SIZE, y: my256(154.0) * TILE_SIZE },
                { x: mx256(245.5) * TILE_SIZE, y: my256(154.0) * TILE_SIZE }
            ];
            this.activeMission = {
                id: "M2_GRASSRIVERS",
                title: "VICE BEACH PIER CONTRABAND",
                phone: phone,
                stage: 1,
                timer: 120,
                crates: crates,
                targetPos: { x: crates[0].x, y: crates[0].y },
                objectiveLabel: "COLLECT BEACH & PIER CRATES (0/3)"
            };
            g.sendPager(
                "DRE'QUAN (SMARTPHONE)",
                "MISSION 2: 'VICE BEACH PIER CONTRABAND' — Grab all 3 contraband crates across Vice Beach and the Wooden Ocean Pier before the VCPD arrives!",
                true
            );
            g.showBigBanner("PIER CONTRABAND RUN", "COLLECT 3 CRATES ON VICE BEACH & OCEAN PIER", "#a3e635", 2.4);
        } else if (phone.missionId === "M3_OCEAN_DRIVE") {
            const cx = mx256(173.5) * TILE_SIZE;
            const cy = my256(107.5) * TILE_SIZE;
            const cheetah = new Vehicle("mission_cheetah", "VICE_CHEETAH", cx, cy, 0);
            cheetah.z = g.map && typeof g.map.getHeightAtPixel === "function" ? g.map.getHeightAtPixel(cx, cy, 4.0) : 2.0;
            cheetah.missionTag = "TARGET_CHEETAH";
            g.vehicles.push(cheetah);

            this.activeMission = {
                id: "M3_OCEAN_DRIVE",
                title: "STAR ISLAND CHEETAH BOOST",
                phone: phone,
                stage: 1,
                timer: null,
                targetCar: cheetah,
                targetPos: { x: cheetah.x, y: cheetah.y },
                objectiveLabel: "STEAL THE CHEETAH ON STAR ISLAND"
            };
            g.sendPager(
                "JASON (SMARTPHONE)",
                "MISSION 3: 'STAR ISLAND CHEETAH BOOST' — A VIP Grotti Cheetah is parked on Star Island. Boost it and deliver it to the Port of Vice City!",
                true
            );
            g.showBigBanner("CHEETAH BOOST", "STEAL THE VIP CHEETAH ON STAR ISLAND", "#00f0ff", 2.4);
        } else if (phone.missionId === "M4_ANKLE_OVERRIDE") {
            const bx = 70.5 * TILE_SIZE;
            const by = 213.5 * TILE_SIZE;
            const brinks = new Vehicle("mission_brinks", "BRINKS_TRUCK", bx, by, 0);
            brinks.z = g.map && typeof g.map.getHeightAtPixel === "function" ? g.map.getHeightAtPixel(bx, by, 4.0) : 2.0;
            brinks.missionTag = "ARMORED_TARGET";
            g.vehicles.push(brinks);

            this.activeMission = {
                id: "M4_ANKLE_OVERRIDE",
                title: "ANKLE MONITOR OVERRIDE",
                phone: phone,
                stage: 1,
                timer: 140,
                armoredVan: brinks,
                targetPos: { x: brinks.x, y: brinks.y },
                objectiveLabel: "HIJACK OR BLOW UP ARMORED VAN"
            };
            g.recruitJason();
            g.sendPager(
                "LUCIA & JASON",
                "FINAL MISSION: 'ANKLE MONITOR OVERRIDE' — Hit the Grupo Seguro Armored Van outside Uncle Jack's & Hank's Waffles in Port Gellhorn (70, 213), then hack the DOC Relay at VCIA Airport!",
                true
            );
            g.showBigBanner("THE BIG LEONIDA SCORE", "AMBUSH THE ARMORED VAN & HACK DOC RELAY", "#ffd13b", 2.6);
        }
    }

    completeMission(phone, title, reward) {
        const g = this.game;
        if (phone) phone.completed = true;
        this.activeMission = null;
        g.multiplier = Math.min(9, g.multiplier + 1);
        g.addCash(reward, "MISSION PASSED!");
        g.audio.playCashSound();
        g.showBigBanner("MISSION PASSED!", `${title} — +$${reward.toLocaleString()} (MULTIPLIER x${g.multiplier})`, "#39ff14", 3.5);

        const nextIdx = this.payphones.findIndex(p => !p.completed);
        if (nextIdx !== -1) {
            this.selectedMissionIdx = nextIdx;
            const nextPhone = this.payphones[nextIdx];
            g.sendPager(
                "JASON (SMARTPHONE)",
                `Score locked in! Multiplier is now x${g.multiplier}. Next contract ready on your Smartphone: ${nextPhone.shortTitle}!`,
                false
            );
        } else {
            g.sendPager(
                "STATE OF LEONIDA",
                "ALL STORY MISSIONS COMPLETED! Lucia's DOC Ankle Monitor is permanently scrambled. You can replay any mission from your Smartphone!",
                true
            );
        }
    }

    failMission(reason) {
        const g = this.game;
        this.activeMission = null;
        g.showBigBanner("MISSION FAILED", reason, "#ff1e38", 3.0);
        g.sendPager(
            "SMARTPHONE // DISPATCH",
            `${reason} — Tap [START] on your Smartphone whenever you're ready to retry the contract.`,
            true
        );
    }
}

window.MissionManager = MissionManager;
