/* ============================================================================
   PEDESTRIAN NAVIGATION (PedNav)
   Purposeful sidewalk travel for calm civilians (and fleeing ones):
   - each pedestrian picks a FAR destination (12..40 tiles) and walks the shortest sidewalk path to it,
     instead of re-rolling a random neighbouring tile at every waypoint (which made crowds pace back and forth
     along one block face or circle the same building forever);
   - the path graph includes signalised ZEBRA crossings (A* style Dijkstra over sidewalk tiles + crossing edges),
     so people really cross the city rather than orbiting one block;
   - destinations are novelty-biased (never close to the last visited ones) and heading-biased (keep going forward);
   - blocked tiles (stopped cars / props) and stalled waypoints are temporarily avoided and trigger a re-plan;
   - fleeing pedestrians head for a reachable sidewalk tile as far as possible from the threat.
   ============================================================================ */
const PedNav = (function () {
    const CARD = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];
    const MAX_COST = 78;       // path cost horizon (~ 60 tiles of sidewalk)
    const MAX_NODES = 5200;
    const MIN_DEST_COST = 14;  // never choose a destination closer than this
    const CROSS_BASE_COST = 7; // crossing a street costs ~ 8-10 tiles of sidewalk walking

    const stats = { plans: 0, replans: 0, failedPlans: 0, crossingsPlanned: 0, stuckEscapes: 0 };

    class Navigator {
        constructor(map) {
            this.map = map;
            this.walkCache = new Uint8Array(MAP_COLS * MAP_ROWS); // 0 unknown, 1 walkable, 2 blocked
            this.crossCache = new Map();
        }

        _restricted(x, y) {
            // Same hard no-go zones as the legacy sidewalk walker
            if (x >= 26 && x <= 87 && y >= 149 && y <= 200) return true;
            if (x >= 64 && x <= 165 && y >= 299 && y <= 368) return true;
            if (x >= 331 && x <= 360 && y >= 299 && y <= 336 && x !== 342 && x !== 345) return true;
            if (x >= 56 && x <= 68 && y >= 76 && y <= 146) return true; // prison compound
            return false;
        }

        _calcWalk(x, y, z) {
            if (x < 2 || y < 2 || x >= MAP_COLS - 2 || y >= MAP_ROWS - 2) return false;
            if (this._restricted(x, y)) return false;
            const map = this.map;
            const nb = map.getNavigationBlock(x, y, z);
            if (!nb) return false;
            const gt = nb.groundType;
            if (gt !== GROUND_TYPE.PAWEMENT && gt !== GROUND_TYPE.FIELD) return false;
            // Lummus Park decorative lawn strip (lid 10) is not a walkway
            if (x >= 449 && x <= 464 && y >= 46 && y <= 362) {
                const l1 = map.getBlockInfo(x, y, 1);
                if (l1 && l1.lid === 10) return false;
            }
            if (map.isTileBlockedForPed && map.isTileBlockedForPed(x, y, z, null)) return false;
            return true;
        }

        walkable(x, y, z) {
            if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return false;
            if (z !== 2.0) return this._calcWalk(x, y, z);
            const i = y * MAP_COLS + x;
            let v = this.walkCache[i];
            if (v === 0) {
                v = this._calcWalk(x, y, z) ? 1 : 2;
                this.walkCache[i] = v;
            }
            return v === 1;
        }

        // Signalised zebra crossings that start from sidewalk tile (x, y)
        crossingsFrom(x, y, z) {
            const key = y * MAP_COLS + x;
            if (z === 2.0) {
                const c = this.crossCache.get(key);
                if (c) return c;
            }
            const map = this.map;
            const out = [];
            for (let ci = 0; ci < 4; ci++) {
                const d = CARD[ci];
                const r1x = x + d.dx, r1y = y + d.dy;
                const n1 = map.getNavigationBlock(r1x, r1y, z);
                if (!n1 || n1.groundType !== GROUND_TYPE.ROAD) continue;
                if (!map.isStopLineBlock || !map.isStopLineBlock(r1x, r1y)) continue;
                let opposite = null;
                let valid = true;
                for (let step = 1; step <= 3; step++) {
                    const tx = x + d.dx * step, ty = y + d.dy * step;
                    if (tx < 2 || ty < 2 || tx >= MAP_COLS - 2 || ty >= MAP_ROWS - 2) { valid = false; break; }
                    const tb = map.getNavigationBlock(tx, ty, z);
                    if (!tb) { valid = false; break; }
                    if (tb.groundType === GROUND_TYPE.PAWEMENT || tb.groundType === GROUND_TYPE.FIELD) {
                        if (step >= 2 && this.walkable(tx, ty, z)) opposite = { bx: tx, by: ty, steps: step };
                        break;
                    }
                    const l1 = map.getBlockInfo(tx, ty, 1);
                    if (tb.groundType !== GROUND_TYPE.ROAD || (l1 && l1.lid === 25)) { valid = false; break; }
                }
                if (valid && opposite) {
                    out.push({ dx: d.dx, dy: d.dy, bx: opposite.bx, by: opposite.by, steps: opposite.steps, ax: x, ay: y });
                }
            }
            if (z === 2.0) this.crossCache.set(key, out);
            return out;
        }

        // Dijkstra over sidewalk tiles (+ crossing edges). Returns { dist, parent, hop, nodes }
        plan(sx, sy, z, allowCross, avoid, now) {
            const dist = new Map();
            const parent = new Map();
            const hop = new Map();
            const heap = []; // [cost, key]
            const push = (cost, key) => {
                heap.push([cost, key]);
                let i = heap.length - 1;
                while (i > 0) {
                    const p = (i - 1) >> 1;
                    if (heap[p][0] <= heap[i][0]) break;
                    const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
                    i = p;
                }
            };
            const pop = () => {
                const top = heap[0];
                const last = heap.pop();
                if (heap.length > 0) {
                    heap[0] = last;
                    let i = 0;
                    for (;;) {
                        const l = i * 2 + 1, r = l + 1;
                        let m = i;
                        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                        if (m === i) break;
                        const t = heap[m]; heap[m] = heap[i]; heap[i] = t;
                        i = m;
                    }
                }
                return top;
            };
            const startKey = sy * MAP_COLS + sx;
            dist.set(startKey, 0);
            push(0, startKey);
            let expanded = 0;
            while (heap.length > 0 && expanded < MAX_NODES) {
                const [cost, key] = pop();
                if (cost > dist.get(key)) continue;
                expanded++;
                const x = key % MAP_COLS;
                const y = (key / MAP_COLS) | 0;
                for (let ci = 0; ci < 4; ci++) {
                    const nx = x + CARD[ci].dx, ny = y + CARD[ci].dy;
                    const nk = ny * MAP_COLS + nx;
                    const nc = cost + 1;
                    if (nc > MAX_COST) continue;
                    const od = dist.get(nk);
                    if (od !== undefined && od <= nc) continue;
                    if (avoid && avoid.has(nk) && avoid.get(nk) > now) continue;
                    if (!this.walkable(nx, ny, z)) continue;
                    dist.set(nk, nc);
                    parent.set(nk, key);
                    hop.delete(nk);
                    push(nc, nk);
                }
                if (allowCross) {
                    const cr = this.crossingsFrom(x, y, z);
                    for (let i = 0; i < cr.length; i++) {
                        const c = cr[i];
                        const nk = c.by * MAP_COLS + c.bx;
                        const nc = cost + CROSS_BASE_COST + c.steps;
                        if (nc > MAX_COST) continue;
                        const od = dist.get(nk);
                        if (od !== undefined && od <= nc) continue;
                        if (avoid && avoid.has(nk) && avoid.get(nk) > now) continue;
                        if (avoid && avoid.has(-1 - key) && avoid.get(-1 - key) > now) continue; // crossing edge temporarily avoided
                        dist.set(nk, nc);
                        parent.set(nk, key);
                        hop.set(nk, c);
                        push(nc, nk);
                    }
                }
            }
            return { dist, parent, hop, startKey };
        }

        buildPath(res, destKey) {
            const rev = [];
            let k = destKey;
            let guard = 0;
            while (k !== res.startKey && guard++ < 500) {
                const h = res.hop.get(k) || null;
                rev.push({ bx: k % MAP_COLS, by: (k / MAP_COLS) | 0, cross: h });
                k = res.parent.get(k);
                if (k === undefined) return null;
            }
            rev.reverse();
            return rev;
        }
    }

    function getNav(game) {
        if (!game._pedNavigator || game._pedNavigator.map !== game.map) {
            game._pedNavigator = new Navigator(game.map);
        }
        return game._pedNavigator;
    }

    function pickDestination(ped, res, sx, sy, fleeing, threatX, threatY) {
        const nodes = [];
        let maxC = 0;
        res.dist.forEach((c) => { if (c > maxC) maxC = c; });
        // Small plazas / islands: scale the minimum trip length to the reachable area so people still cross it
        const minC = Math.max(3, Math.min(MIN_DEST_COST, Math.floor(maxC * 0.6)));
        res.dist.forEach((c, k) => {
            if (fleeing) {
                if (c >= Math.min(6, minC)) nodes.push(k);
            } else if (c >= minC) {
                nodes.push(k);
            }
        });
        if (nodes.length === 0) {
            // Tiny enclosed pocket (walled courtyard / alley): there is nowhere meaningful to walk to
            return -1;
        }
        const recent = ped._navRecent || [];
        const heading = ped.angle || 0;
        const hcos = Math.cos(heading), hsin = Math.sin(heading);
        let bestK = -1, bestScore = -1e9;
        const samples = Math.min(nodes.length, 70);
        for (let si = 0; si < samples; si++) {
            const k = nodes[(Math.random() * nodes.length) | 0];
            const x = k % MAP_COLS, y = (k / MAP_COLS) | 0;
            const c = res.dist.get(k);
            let score;
            if (fleeing) {
                const px = (x + 0.5) * TILE_SIZE, py = (y + 0.5) * TILE_SIZE;
                score = Math.hypot(px - threatX, py - threatY) / TILE_SIZE - c * 0.12 + Math.random() * 1.2;
            } else {
                const dx = x - sx, dy = y - sy;
                const dl = Math.hypot(dx, dy) || 1;
                const align = (hcos * dx + hsin * dy) / dl;
                score = align * 0.9 + Math.min(c, 44) / 44 * 0.8 + Math.random() * 1.3;
                // crossing streets keeps people moving between blocks
                if (res.hop.has(k)) score += 0.25;
                for (let ri = 0; ri < recent.length; ri++) {
                    const r = recent[ri];
                    if (Math.abs(r.bx - x) + Math.abs(r.by - y) < 8) score -= 1.6;
                }
            }
            if (score > bestScore) { bestScore = score; bestK = k; }
        }
        return bestK;
    }

    // Returns a step object compatible with Map.chooseNextSidewalkBlock(), or null to fall back to the legacy walker.
    function nextStep(game, ped, baseX, baseY, pz, navContext, reachedTarget) {
        const map = game.map;
        if (!map || !map.getNavigationBlock || !map.isStopLineBlock) return null;
        const nav = getNav(game);
        const now = game.trafficLightTimer || 0;
        const z = pz;

        // Must be standing on a normal sidewalk tile to plan; otherwise let the legacy logic recover (road exit etc.)
        if (!nav.walkable(baseX, baseY, z)) return null;

        const fleeing = (ped.panicTimer || 0) > 0 && typeof navContext.threatX === "number" && typeof navContext.threatY === "number";
        if ((ped.panicTimer || 0) > 0 && !fleeing) return null;

        if (!ped._navAvoid) ped._navAvoid = new Map();
        const avoid = ped._navAvoid;
        if (avoid.size > 24) {
            avoid.forEach((exp, k) => { if (exp <= now) avoid.delete(k); });
        }

        // Stall detection (position based): called at every waypoint hand-over
        const lastT = ped._navLastT;
        if (lastT !== undefined && now - lastT > 0.01) {
            const moved = Math.hypot(ped.x - (ped._navLastX || ped.x), ped.y - (ped._navLastY || ped.y));
            const elapsed = now - lastT;
            if (elapsed > 3.2 && moved < 14 && !ped.waitingAtCrosswalk && (ped.hangoutTimer || 0) <= 0 && (ped.socialTimer || 0) <= 0) {
                // Stalled against something: forbid the tile we were heading to and re-plan from scratch
                if (ped._navPath && ped._navPath.length > 0) {
                    const h0 = ped._navPath[0];
                    avoid.set(h0.by * MAP_COLS + h0.bx, now + 14);
                }
                ped._navPath = null;
                ped._navStuck = (ped._navStuck || 0) + 1;
                stats.stuckEscapes++;
                if (ped._navStuck >= 3) { ped._navDest = null; ped._navStuck = 0; }
            }
        }
        if (ped._navLastT === undefined || now - ped._navLastT > 3.0) {
            ped._navLastT = now;
            ped._navLastX = ped.x;
            ped._navLastY = ped.y;
        }

        // Legacy collision handlers mark a tile to avoid
        if (typeof ped._avoidBx === "number" && ped._avoidBx >= 0) {
            avoid.set(ped._avoidBy * MAP_COLS + ped._avoidBx, now + 10);
            if (ped._navPath && ped._navPath.length > 0 && ped._navPath[0].bx === ped._avoidBx && ped._navPath[0].by === ped._avoidBy) {
                ped._navPath = null;
            }
        }

        const mode = fleeing ? "FLEE" : "WALK";
        if (ped._navMode !== mode) {
            ped._navMode = mode;
            ped._navPath = null;
            if (mode === "FLEE") ped._navDest = null;
        }

        // Validate the head of the current path
        let path = ped._navPath;
        if (path && path.length > 0) {
            const head = path[0];
            let ok;
            if (head.cross) ok = (head.cross.ax === baseX && head.cross.ay === baseY);
            else ok = Math.abs(head.bx - baseX) + Math.abs(head.by - baseY) === 1;
            if (ok && !head.cross) {
                const hk = head.by * MAP_COLS + head.bx;
                if ((avoid.has(hk) && avoid.get(hk) > now) || map.isTileBlockedForPed(head.bx, head.by, z, game.vehicles)) {
                    avoid.set(hk, now + 7);
                    ok = false;
                }
            }
            if (!ok) { ped._navPath = null; path = null; }
        }

        const allowCross = !fleeing && Boolean(navContext && navContext.allowCrosswalk);

        if (!path || path.length === 0) {
            let justArrived = false;
            if (!fleeing && ped._navDest && baseX === ped._navDest.bx && baseY === ped._navDest.by) {
                justArrived = true;
                ped._navDest = null;
            }
            const wasReplan = Boolean(ped._navDest);
            const res = nav.plan(baseX, baseY, z, allowCross, avoid, now);
            stats.plans++;
            if (wasReplan) stats.replans++;
            if (!fleeing && res.dist.size < 24) {
                // Enclosed pocket (courtyard / walled alley / lone tile): nothing meaningful to walk to -> idle chat, vanish when unwatched
                stats.failedPlans++;
                ped._navTrapped = true;
                ped._navDest = null;
                ped.hangoutTimer = Math.max(ped.hangoutTimer || 0, 25);
                ped.hangoutBaseAngle = ped.angle;
                return null;
            }
            // People pause when they arrive (window shopping, phone, chat); always in small enclosed areas so nobody paces non-stop
            if (justArrived && (res.dist.size < 160 || Math.random() < 0.22)) {
                ped.hangoutTimer = Math.max(ped.hangoutTimer || 0, 3 + Math.random() * 8);
                ped.hangoutBaseAngle = ped.angle;
            }
            let destKey = -1;
            if (!fleeing && ped._navDest) {
                const dk = ped._navDest.by * MAP_COLS + ped._navDest.bx;
                if (res.dist.has(dk) && res.dist.get(dk) >= 2) destKey = dk;
            }
            if (destKey < 0) {
                destKey = pickDestination(ped, res, baseX, baseY, fleeing, navContext.threatX, navContext.threatY);
            }
            if (destKey < 0 || destKey === res.startKey) {
                stats.failedPlans++;
                if (res.dist.size < 24) {
                    // Trapped in a tiny pocket: stand around chatting instead of pacing back and forth; vanishes when unwatched
                    ped._navTrapped = true;
                    if (!fleeing) {
                        ped.hangoutTimer = Math.max(ped.hangoutTimer || 0, 25);
                        ped.hangoutBaseAngle = ped.angle;
                    }
                }
                if (!stats.failInfo) stats.failInfo = [];
                if (stats.failInfo.length < 40) stats.failInfo.push(baseX + ',' + baseY + ' n=' + res.dist.size + ' cross=' + allowCross + ' flee=' + fleeing);
                ped._navDest = null;
                return null; // isolated pocket: legacy walker handles it (U-turn)
            }
            path = nav.buildPath(res, destKey);
            if (!path || path.length === 0) {
                stats.failedPlans++;
                return null;
            }
            const dbx = destKey % MAP_COLS, dby = (destKey / MAP_COLS) | 0;
            ped._navDest = { bx: dbx, by: dby };
            if (!ped._navDestLog) ped._navDestLog = [];
            ped._navDestLog.push(dbx + ',' + dby + (fleeing ? 'F' : '') + '#' + path.length);
            if (ped._navDestLog.length > 14) ped._navDestLog.shift();
            ped._navTrapped = false;
            if (!fleeing) {
                if (!ped._navRecent) ped._navRecent = [];
                ped._navRecent.push({ bx: dbx, by: dby });
                if (ped._navRecent.length > 7) ped._navRecent.shift();
            }
            for (let i = 0; i < path.length; i++) if (path[i].cross) { stats.crossingsPlanned++; break; }
            ped._navPath = path;
        }

        const head = path[0];
        if (head.cross) {
            // Hand over to the legacy signalised-crossing logic, restricted to this exact crossing
            if (!allowCross || (ped.crosswalkCooldown || 0) > 0) {
                ped._navPath = null;
                avoid.set(-1 - (head.cross.ay * MAP_COLS + head.cross.ax), now + 12);
                return null;
            }
            const ctx = Object.assign({}, navContext, { forceCrossDir: { dx: head.cross.dx, dy: head.cross.dy } });
            const step = map.chooseNextSidewalkBlock(
                baseX, baseY, ped.angle, z, 0.99, false, game.vehicles,
                ped._avoidBx ?? -1, ped._avoidBy ?? -1, ctx
            );
            if (step && (step.isCrosswalkEntry || step.isWaitingAtCurb)) {
                if (step.isCrosswalkEntry) {
                    path.shift(); // crossing starts now; the legacy crossing branch finishes it
                    ped._navPath = path;
                }
                return step;
            }
            // Crossing no longer valid (blocked geometry): forget this edge for a while and plan again
            ped._navPath = null;
            avoid.set(-1 - (head.cross.ay * MAP_COLS + head.cross.ax), now + 30);
            return null;
        }

        path.shift();
        const dx = head.bx - baseX, dy = head.by - baseY;
        return {
            dx, dy,
            bx: head.bx,
            by: head.by,
            angle: Math.atan2(dy, dx),
            navStep: true
        };
    }

    // Spawn quality: reject tiles that sit in a tiny enclosed pocket of sidewalk (courtyards, walled alleys...)
    const spawnCache = new Map();
    function isGoodSpawnTile(game, bx, by, z) {
        const nav = getNav(game);
        if (nav._restricted(bx, by)) return true; // prison yard etc. keep legacy behaviour
        const key = by * MAP_COLS + bx;
        const cached = spawnCache.get(key);
        if (cached !== undefined) return cached;
        let good = false;
        if (nav.walkable(bx, by, z)) {
            const seen = new Set([key]);
            const queue = [key];
            let qi = 0;
            while (qi < queue.length && seen.size < 160) {
                const k = queue[qi++];
                const x = k % MAP_COLS, y = (k / MAP_COLS) | 0;
                for (let ci = 0; ci < 4; ci++) {
                    const nx = x + CARD[ci].dx, ny = y + CARD[ci].dy;
                    const nk = ny * MAP_COLS + nx;
                    if (seen.has(nk) || !nav.walkable(nx, ny, z)) continue;
                    seen.add(nk);
                    queue.push(nk);
                }
                const cr = nav.crossingsFrom(x, y, z);
                for (let i = 0; i < cr.length; i++) {
                    const nk = cr[i].by * MAP_COLS + cr[i].bx;
                    if (!seen.has(nk)) { seen.add(nk); queue.push(nk); }
                }
            }
            good = seen.size >= 160;
        }
        if (spawnCache.size > 60000) spawnCache.clear();
        spawnCache.set(key, good);
        return good;
    }

    return { nextStep, stats, getNav, isGoodSpawnTile };
})();
