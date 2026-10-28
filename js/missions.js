/* ============================================================================
   GRAND THEFT AUTO: LEONIDA '97 — STORY MISSIONS & PAYPHONE SYSTEM ON NYC.CMP
   Transposing GTA VI's Lucia & Jason Storyline into 1997 GTA 1 Payphone Missions
   ============================================================================ */

class MissionManager {
    constructor(game) {
        this.game = game;

        // Ringing Payphones placed on the 12-region bespoke GTA 6 (State of Leonida) sidewalks
        this.payphones = [
            {
                id: "phone_motel",
                missionId: "M1_UNCLE_JACK",
                name: "HOTEL DIXON PAYPHONE (OCEAN DRIVE)",
                x: 213.5 * TILE_SIZE,
                y: 143.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_scurve",
                missionId: "M2_GRASSRIVERS",
                name: "LUMMUS PARK & VICE BEACH PAYPHONE",
                x: 218.5 * TILE_SIZE,
                y: 151.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_downtown",
                missionId: "M3_OCEAN_DRIVE",
                name: "STAR ISLAND MANSION PAYPHONE",
                x: 173.0 * TILE_SIZE,
                y: 104.5 * TILE_SIZE,
                completed: false
            },
            {
                id: "phone_beach",
                missionId: "M4_ANKLE_OVERRIDE",
                name: "PORT GELLHORN SPEEDWAY PAYPHONE",
                x: 47.0 * TILE_SIZE,
                y: 114.5 * TILE_SIZE,
                completed: false
            }
        ];

        this.activeMission = null;
        this.ringTimer = 0;
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

        const nextPhone = this.payphones.find(p => !p.completed);
        if (nextPhone) {
            return {
                x: nextPhone.x,
                y: nextPhone.y,
                label: "ANSWER PAYPHONE: " + nextPhone.name,
                color: "#39ff14"
            };
        }

        return null;
    }

    update(dt) {
        const g = this.game;
        const p = g.player;

        this.ringTimer += dt;

        if (!this.activeMission) {
            for (const phone of this.payphones) {
                if (phone.completed) continue;
                const d = Math.hypot(p.x - phone.x, p.y - phone.y);
                if (d < 220 && this.ringTimer > 2.2) {
                    this.ringTimer = 0;
                    g.audio.playPayphoneRing();
                }
                if (d < 46 && !p.inVehicle) {
                    this.startMission(phone);
                    break;
                }
            }
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
                        "JASON (PARTNER)",
                        "REGISTER CLEARED ($15,000)! VCPD cruisers incoming! Drive west to VICE CUSTOMS PAY 'N' SPRAY on Collins Ave (203, 146) to lose the heat!",
                        true
                    );
                    m.targetPos = { x: 203.0 * TILE_SIZE, y: 146.5 * TILE_SIZE };
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
                    m.targetPos = { x: 213.5 * TILE_SIZE, y: 146.0 * TILE_SIZE };
                    m.objectiveLabel = "DELIVER HAUL TO HOTEL DIXON";
                    g.setWantedLevel(Math.max(g.wantedLevel, 2));
                    g.sendPager(
                        "DRE'QUAN (VICE BEACH)",
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
                    m.targetPos = { x: 171.5 * TILE_SIZE, y: 164.5 * TILE_SIZE };
                    m.objectiveLabel = "DELIVER CHEETAH TO VICE PORT CRANE";
                    g.sendPager(
                        "JASON (PARTNER)",
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
                    m.targetPos = { x: 66.5 * TILE_SIZE, y: 152.0 * TILE_SIZE };
                    m.objectiveLabel = "HACK DOC RELAY AT VCIA AIRPORT";
                    g.sendPager(
                        "LUCIA & JASON",
                        "Vault cash secured! 4-STAR SWAT MANHUNT! Race east to VCIA International Airport (66, 152) to scramble Lucia's DOC Ankle Monitor!",
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
                targetPos: { x: 213.5 * TILE_SIZE, y: 155.5 * TILE_SIZE },
                objectiveLabel: "HOLD UP SOUTH BEACH LIQUOR"
            };
            g.recruitJason();
            g.toggleBandana(true);
            g.sendPager(
                "LUCIA & JASON",
                "MISSION 1: 'TRUST?' — Red heist bandana on! Head south down Ocean Drive (213, 155), rob the register, and lose the cops at Vice Customs on Collins Ave!",
                true
            );
            g.showBigBanner("MISSION 1: TRUST?", "ROB SOUTH BEACH LIQUOR WITH JASON", "#ff2a85", 2.4);
        } else if (phone.missionId === "M2_GRASSRIVERS") {
            const crates = [
                { x: 224.5 * TILE_SIZE, y: 150.0 * TILE_SIZE },
                { x: 232.5 * TILE_SIZE, y: 154.0 * TILE_SIZE },
                { x: 245.5 * TILE_SIZE, y: 154.0 * TILE_SIZE }
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
                "DRE'QUAN (PAYPHONE)",
                "MISSION 2: 'VICE BEACH PIER CONTRABAND' — Grab all 3 contraband crates across Vice Beach and the Wooden Ocean Pier before the VCPD arrives!",
                true
            );
            g.showBigBanner("PIER CONTRABAND RUN", "COLLECT 3 CRATES ON VICE BEACH & OCEAN PIER", "#a3e635", 2.4);
        } else if (phone.missionId === "M3_OCEAN_DRIVE") {
            const cheetah = new Vehicle("mission_cheetah", "VICE_CHEETAH", 173.5 * TILE_SIZE, 107.5 * TILE_SIZE, 0);
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
                "JASON (PAYPHONE)",
                "MISSION 3: 'STAR ISLAND CHEETAH BOOST' — A VIP Grotti Cheetah is parked on Star Island (173, 107). Boost it and deliver it to the Port of Vice City!",
                true
            );
            g.showBigBanner("CHEETAH BOOST", "STEAL THE VIP CHEETAH ON STAR ISLAND", "#00f0ff", 2.4);
        } else if (phone.missionId === "M4_ANKLE_OVERRIDE") {
            const brinks = new Vehicle("mission_brinks", "BRINKS_TRUCK", 38.5 * TILE_SIZE, 140.5 * TILE_SIZE, Math.PI * 0.5);
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

        const nextPhone = this.payphones.find(p => !p.completed);
        if (nextPhone) {
            g.sendPager(
                "JASON (PAGER)",
                `Score locked in! Multiplier is now x${g.multiplier}. Next ringing payphone is at ${nextPhone.name} — follow the yellow arrow!`,
                false
            );
        } else {
            g.sendPager(
                "STATE OF LEONIDA",
                "ALL STORY MISSIONS COMPLETED! Lucia's DOC Ankle Monitor is permanently scrambled. Rule the streets of Leonida!",
                true
            );
        }
    }

    failMission(reason) {
        const g = this.game;
        this.activeMission = null;
        g.showBigBanner("MISSION FAILED", reason, "#ff1e38", 3.0);
        g.sendPager(
            "DISPATCH // PAGER",
            `${reason} — Head back to the ringing payphone whenever you're ready to retry.`,
            true
        );
    }
}

window.MissionManager = MissionManager;
