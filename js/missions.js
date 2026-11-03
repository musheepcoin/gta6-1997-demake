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
                    m.targetPos = { x: mx256(203.0) * TILE_SIZE, y: my256(146.5) * TILE_SIZE };
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
                if (Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 75) {
                    this.completeMission(m.phone, "VICE BEACH CONTRABAND RUN", 45000);
                }
            }
        } else if (m.id === "M3_OCEAN_DRIVE") {
            if (m.stage === 1) {
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
                if (p.inVehicle === m.targetCar && Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 85) {
                    this.completeMission(m.phone, "STAR ISLAND GRAND THEFT", 75000);
                }
            }
        } else if (m.id === "M4_ANKLE_OVERRIDE") {
            if (m.stage === 1) {
                const v = m.armoredVan;
                if (!v || v.destroyed || p.inVehicle === v) {
                    m.stage = 2;
                    g.addCash(50000, "ARMORED VAULT LOOT!");
                    g.setWantedLevel(Math.max(g.wantedLevel, 4));
                    m.targetPos = { x: mx256(66.5) * TILE_SIZE, y: my256(152.0) * TILE_SIZE };
                    m.objectiveLabel = "HACK DOC RELAY AT VCIA AIRPORT";
                    g.sendPager(
                        "LUCIA & JASON",
                        "Vault cash secured! 4-STAR SWAT MANHUNT! Race east to VCIA International Airport to scramble Lucia's DOC Ankle Monitor!",
                        true
                    );
                }
            } else if (m.stage === 2) {
                if (Math.hypot(p.x - m.targetPos.x, p.y - m.targetPos.y) < 80) {
                    g.player.ankleScrambled = true;
                    g.setWantedLevel(0);
                    this.completeMission(m.phone, "LEONIDA KINGPIN — ANKLE MONITOR OVERRIDDEN!", 150000);
                }
            }
        }
    }

    startMission(phone) {
        const g = this.game;
        g.audio.playCashSound();

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
                "MISSION 1: 'TRUST?' — Red heist bandana on! Head south down Ocean Drive, rob the register, and lose the cops at Vice Customs on Collins Ave!",
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
            const cheetah = new Vehicle("mission_cheetah", "VICE_CHEETAH", mx256(173.5) * TILE_SIZE, my256(107.5) * TILE_SIZE, 0);
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
            const brinks = new Vehicle("mission_brinks", "BRINKS_TRUCK", mx256(38.5) * TILE_SIZE, my256(140.5) * TILE_SIZE, Math.PI * 0.5);
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
                "FINAL MISSION: 'ANKLE MONITOR OVERRIDE' — Hit the Grupo Seguro Armored Van at Uncle Jack's in Port Gellhorn (38, 140), then hack the DOC Relay at VCIA Airport!",
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
