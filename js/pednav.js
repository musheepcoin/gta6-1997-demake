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
    const MAX_COST = 46;       // path cost horizon (~ 40 tiles of sidewalk, plenty for multi-block travel)
    const MAX_NODES = 1200;
    const MIN_DEST_COST = 14;  // never choose a destination closer than this
    const CROSS_BASE_COST = 7; // crossing a street costs ~ 8-10 tiles of sidewalk walking

    const stats = { plans: 0, replans: 0, failedPlans: 0, crossingsPlanned: 0, stuckEscapes: 0 };

    class Navigator {
        constructor(map) {
            this.map = map;
            const totalTiles = MAP_COLS * MAP_ROWS;
            this.walkCache = new Uint8Array(totalTiles); // 0 unknown, 1 walkable, 2 blocked
            this.crossCache = new Map();
            // Pre-allocated zero-GC Dijkstra buffers
            this._planStamp = 1;
            this._seenStamp = new Int32Array(totalTiles);
            this._distArr = new Int16Array(totalTiles);
            this._parentArr = new Int32Array(totalTiles);
            this._hopIdxArr = new Int16Array(totalTiles);
            this._hopList = [];
            this._visitedKeys = new Int32Array(MAX_NODES + 512);
            this._visitedCount = 0;
            this._heapCost = new Int16Array(MAX_NODES * 4);
            this._heapKey = new Int32Array(MAX_NODES * 4);
            this._candKeys = new Int32Array(MAX_NODES + 512);
        }

        _restricted(x, y) {
            // Same hard no-go zones as the legacy sidewalk walker
            if (x >= 26 && x <= 87 && y >= 149 && y <= 200) return true;
            if (x >= 64 && x <= 165 && y >= 299 && y <= 368) return true;
            if (x >= 331 && x <= 360 && y >= 299 && y <= 336 && x !== 342 && x !== 345) return true;
            if (x >= 56 && x <= 68 && y >= 76 && y <= 146) return true; // prison compound
            if (x >= 458 && x <= 481 && y >= 21 && y <= 45) return true; // gated SERA Spaceport compound
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
            const useGroundCache = (z === undefined || z === null || z < 2.8 || z >= 3.8);
            if (!useGroundCache) return this._calcWalk(x, y, z);
            const i = y * MAP_COLS + x;
            let v = this.walkCache[i];
            if (v === 0) {
                v = this._calcWalk(x, y, 2.0) ? 1 : 2;
                this.walkCache[i] = v;
            }
            return v === 1;
        }

        // Signalised zebra crossings that start from sidewalk tile (x, y)
        crossingsFrom(x, y, z) {
            const key = y * MAP_COLS + x;
            const useGroundCache = (z === undefined || z === null || z < 2.8 || z >= 3.8);
            if (useGroundCache) {
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
            if (useGroundCache) this.crossCache.set(key, out);
            return out;
        }

        // Zero-GC Dijkstra over sidewalk tiles (+ crossing edges) using pre-allocated typed arrays
        plan(sx, sy, z, allowCross, avoid, now) {
            let stamp = (this._planStamp + 1) | 0;
            if (stamp <= 0 || stamp >= 0x7ffffff0) {
                this._seenStamp.fill(0);
                stamp = 1;
            }
            this._planStamp = stamp;

            const seenStamp = this._seenStamp;
            const distArr = this._distArr;
            const parentArr = this._parentArr;
            const hopIdxArr = this._hopIdxArr;
            const hopList = this._hopList;
            hopList.length = 1; // 0 = no crossing hop
            const visitedKeys = this._visitedKeys;
            let visitedCount = 0;

            const heapCost = this._heapCost;
            const heapKey = this._heapKey;
            let heapLen = 0;

            const push = (cost, key) => {
                let i = heapLen++;
                heapCost[i] = cost;
                heapKey[i] = key;
                while (i > 0) {
                    const p = (i - 1) >> 1;
                    if (heapCost[p] <= cost) break;
                    heapCost[i] = heapCost[p];
                    heapKey[i] = heapKey[p];
                    heapCost[p] = cost;
                    heapKey[p] = key;
                    i = p;
                }
            };

            const startKey = sy * MAP_COLS + sx;
            seenStamp[startKey] = stamp;
            distArr[startKey] = 0;
            parentArr[startKey] = -1;
            hopIdxArr[startKey] = 0;
            visitedKeys[visitedCount++] = startKey;
            push(0, startKey);

            const hasAvoid = Boolean(avoid && avoid.size > 0);
            let expanded = 0;
            let maxCostSeen = 0;

            while (heapLen > 0 && expanded < MAX_NODES) {
                const cost = heapCost[0];
                const key = heapKey[0];
                heapLen--;
                if (heapLen > 0) {
                    const lc = heapCost[heapLen];
                    const lk = heapKey[heapLen];
                    heapCost[0] = lc;
                    heapKey[0] = lk;
                    let i = 0;
                    for (;;) {
                        const l = (i << 1) + 1, r = l + 1;
                        let m = i;
                        if (l < heapLen && heapCost[l] < heapCost[m]) m = l;
                        if (r < heapLen && heapCost[r] < heapCost[m]) m = r;
                        if (m === i) break;
                        const tc = heapCost[m], tk = heapKey[m];
                        heapCost[m] = heapCost[i]; heapKey[m] = heapKey[i];
                        heapCost[i] = tc; heapKey[i] = tk;
                        i = m;
                    }
                }
                if (cost > distArr[key]) continue;
                expanded++;
                if (cost > maxCostSeen) maxCostSeen = cost;

                const x = key & 511;
                const y = key >> 9;
                const nc1 = cost + 1;
                if (nc1 <= MAX_COST) {
                    for (let ci = 0; ci < 4; ci++) {
                        const nx = x + CARD[ci].dx, ny = y + CARD[ci].dy;
                        const nk = (ny << 9) | nx;
                        if (seenStamp[nk] === stamp && distArr[nk] <= nc1) continue;
                        if (hasAvoid && avoid.has(nk) && avoid.get(nk) > now) continue;
                        if (!this.walkable(nx, ny, z)) continue;
                        if (seenStamp[nk] !== stamp) {
                            seenStamp[nk] = stamp;
                            if (visitedCount < visitedKeys.length) visitedKeys[visitedCount++] = nk;
                        }
                        distArr[nk] = nc1;
                        parentArr[nk] = key;
                        hopIdxArr[nk] = 0;
                        push(nc1, nk);
                    }
                }
                if (allowCross) {
                    const cr = this.crossingsFrom(x, y, z);
                    for (let i = 0; i < cr.length; i++) {
                        const c = cr[i];
                        const nk = (c.by << 9) | c.bx;
                        const nc = cost + CROSS_BASE_COST + c.steps;
                        if (nc > MAX_COST) continue;
                        if (seenStamp[nk] === stamp && distArr[nk] <= nc) continue;
                        if (hasAvoid) {
                            if (avoid.has(nk) && avoid.get(nk) > now) continue;
                            if (avoid.has(-1 - key) && avoid.get(-1 - key) > now) continue;
                        }
                        if (seenStamp[nk] !== stamp) {
                            seenStamp[nk] = stamp;
                            if (visitedCount < visitedKeys.length) visitedKeys[visitedCount++] = nk;
                        }
                        distArr[nk] = nc;
                        parentArr[nk] = key;
                        const hIdx = hopList.length;
                        hopList.push(c);
                        hopIdxArr[nk] = hIdx;
                        push(nc, nk);
                    }
                }
            }
            this._visitedCount = visitedCount;
            return {
                nav: this,
                stamp,
                startKey,
                size: visitedCount,
                maxCost: maxCostSeen
            };
        }

        buildPath(res, destKey) {
            const rev = [];
            const seenStamp = this._seenStamp;
            const parentArr = this._parentArr;
            const hopIdxArr = this._hopIdxArr;
            const hopList = this._hopList;
            const stamp = res.stamp;
            let k = destKey;
            let guard = 0;
            while (k !== res.startKey && guard++ < 500) {
                if (k < 0 || seenStamp[k] !== stamp) return null;
                const hIdx = hopIdxArr[k];
                const h = hIdx > 0 ? hopList[hIdx] : null;
                rev.push({ bx: k & 511, by: k >> 9, cross: h });
                k = parentArr[k];
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
        const nav = res.nav;
        const visitedKeys = nav._visitedKeys;
        const visitedCount = res.size;
        const distArr = nav._distArr;
        const hopIdxArr = nav._hopIdxArr;
        const candKeys = nav._candKeys;
        let candCount = 0;
        const maxC = res.maxCost;
        const minC = Math.max(3, Math.min(MIN_DEST_COST, Math.floor(maxC * 0.6)));
        const thrC = fleeing ? Math.min(6, minC) : minC;

        for (let i = 0; i < visitedCount; i++) {
            const k = visitedKeys[i];
            if (distArr[k] >= thrC) {
                candKeys[candCount++] = k;
            }
        }
        if (candCount === 0) {
            return -1;
        }
        const recent = ped._navRecent || [];
        const heading = ped.angle || 0;
        const hcos = Math.cos(heading), hsin = Math.sin(heading);
        let bestK = -1, bestScore = -1e9;
        const samples = Math.min(candCount, 56);
        for (let si = 0; si < samples; si++) {
            const k = candKeys[(Math.random() * candCount) | 0];
            const x = k & 511, y = k >> 9;
            const c = distArr[k];
            let score;
            if (fleeing) {
                const px = (x + 0.5) * TILE_SIZE, py = (y + 0.5) * TILE_SIZE;
                score = Math.hypot(px - threatX, py - threatY) / TILE_SIZE - c * 0.12 + Math.random() * 1.2;
            } else {
                const dx = x - sx, dy = y - sy;
                const dl = Math.hypot(dx, dy) || 1;
                const align = (hcos * dx + hsin * dy) / dl;
                score = align * 0.9 + Math.min(c, 44) / 44 * 0.8 + Math.random() * 1.3;
                if (hopIdxArr[k] > 0) score += 0.25;
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
        const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
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
            if (!fleeing && res.size < 24) {
                // Enclosed pocket (courtyard / walled alley / lone tile): nothing meaningful to walk to -> idle chat, vanish when unwatched
                stats.failedPlans++;
                ped._navTrapped = true;
                ped._navDest = null;
                ped.hangoutTimer = Math.max(ped.hangoutTimer || 0, 25);
                ped.hangoutBaseAngle = ped.angle;
                return null;
            }
            // People pause when they arrive (window shopping, phone, chat); always in small enclosed areas so nobody paces non-stop
            if (justArrived && (res.size < 160 || Math.random() < 0.22)) {
                ped.hangoutTimer = Math.max(ped.hangoutTimer || 0, 3 + Math.random() * 8);
                ped.hangoutBaseAngle = ped.angle;
            }
            let destKey = -1;
            if (!fleeing && ped._navDest) {
                const dk = ped._navDest.by * MAP_COLS + ped._navDest.bx;
                if (nav._seenStamp[dk] === res.stamp && nav._distArr[dk] >= 2) destKey = dk;
            }
            if (destKey < 0) {
                destKey = pickDestination(ped, res, baseX, baseY, fleeing, navContext.threatX, navContext.threatY);
            }
            if (destKey < 0 || destKey === res.startKey) {
                stats.failedPlans++;
                if (res.size < 24) {
                    // Trapped in a tiny pocket: stand around chatting instead of pacing back and forth; vanishes when unwatched
                    ped._navTrapped = true;
                    if (!fleeing) {
                        ped.hangoutTimer = Math.max(ped.hangoutTimer || 0, 25);
                        ped.hangoutBaseAngle = ped.angle;
                    }
                }
                if (!stats.failInfo) stats.failInfo = [];
                if (stats.failInfo.length < 40) stats.failInfo.push(baseX + ',' + baseY + ' n=' + res.size + ' cross=' + allowCross + ' flee=' + fleeing);
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
        let seen = null;
        if (nav.walkable(bx, by, z)) {
            seen = new Set([key]);
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
        if (seen) {
            for (const sk of seen) {
                spawnCache.set(sk, good);
            }
        } else {
            spawnCache.set(key, false);
        }
        return good;
    }

    // Free-roaming route (firefighters, paramedics...): A* over every non-building / non-water tile so the walker goes AROUND
    // buildings instead of grinding against them. Returns a pixel waypoint to steer to, or null (= use direct steering).
    function routeWaypoint(game, ped, tx, ty) {
        const map = game.map;
        if (!map || !map.getNavigationBlock) return null;
        const z = ped.z !== undefined ? ped.z : 2.0;
        // If there is a direct unobstructed line of sight (no building wall in between), walk straight to (tx, ty) without grid-tile zig-zagging!
        if (Math.hypot(tx - ped.x, ty - ped.y) < 96 || !map.traceSegment2D || !map.traceSegment2D(ped.x, ped.y, tx, ty, z).hit) {
            ped._route = null;
            return null;
        }
        const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
        const sx = Math.floor(ped.x / TILE_SIZE), sy = Math.floor(ped.y / TILE_SIZE);
        const gx = Math.floor(tx / TILE_SIZE), gy = Math.floor(ty / TILE_SIZE);
        const navInst = getNav(game);
        const goalRestricted = navInst._restricted(gx, gy);
        let rt = ped._route;
        const stale = !rt || Math.abs(now - rt.t) > 1.8 || Math.hypot(rt.tx - tx, rt.ty - ty) > 70 || rt.idx >= rt.pts.length;
        if (stale) {
            const ok = (x, y) => {
                if (x < 2 || y < 2 || x >= MAP_COLS - 2 || y >= MAP_ROWS - 2) return false;
                if (!goalRestricted && navInst._restricted(x, y)) return false;
                const nb = map.getNavigationBlock(x, y, z);
                if (!nb) return false;
                if (nb.groundType === GROUND_TYPE.BUILDING || nb.groundType === GROUND_TYPE.WATER || nb.groundType === GROUND_TYPE.AIR) return false;
                if (map.isTileBlockedForPed && map.isTileBlockedForPed(x, y, z, null)) return false;
                return true;
            };
            const isBld = (bx, by) => {
                if (bx < 0 || by < 0 || bx >= MAP_COLS || by >= MAP_ROWS) return true;
                const nb = map.getNavigationBlock(bx, by, z);
                return !nb || nb.groundType === GROUND_TYPE.BUILDING;
            };
            const bldPenalty = (bx, by) => {
                let p = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if ((dx || dy) && isBld(bx + dx, by + dy)) {
                            p = Math.max(p, (dx === 0 || dy === 0) ? 0.65 : 0.32);
                        }
                    }
                }
                return p;
            };
            const startKey = sy * MAP_COLS + sx, goalKey = gy * MAP_COLS + gx;
            const g = new Map([[startKey, 0]]);
            const parent = new Map();
            const open = [[Math.abs(gx - sx) + Math.abs(gy - sy), startKey]];
            let found = -1, expanded = 0;
            while (open.length && expanded < 6000) {
                // tiny binary-less min search: open list stays small for these distances
                let bi = 0;
                for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
                const [, key] = open.splice(bi, 1)[0];
                expanded++;
                const x = key % MAP_COLS, y = (key / MAP_COLS) | 0;
                if (Math.abs(x - gx) + Math.abs(y - gy) <= 1) { found = key; break; }
                const gc = g.get(key);
                for (let ci = 0; ci < 4; ci++) {
                    const nx = x + CARD[ci].dx, ny = y + CARD[ci].dy;
                    const nk = ny * MAP_COLS + nx;
                    const nc = gc + 1 + bldPenalty(nx, ny);
                    if (nc > 110) continue;
                    const og = g.get(nk);
                    if (og !== undefined && og <= nc) continue;
                    if (!ok(nx, ny)) continue;
                    g.set(nk, nc);
                    parent.set(nk, key);
                    open.push([nc + Math.abs(gx - nx) + Math.abs(gy - ny), nk]);
                }
            }
            const pts = [];
            if (found >= 0) {
                let k = found;
                let guard = 0;
                while (k !== undefined && k !== startKey && guard++ < 400) {
                    const tx0 = k % MAP_COLS, ty0 = (k / MAP_COLS) | 0;
                    // Push waypoint toward the outer (curb) side of the sidewalk, away from adjacent/diagonal building walls
                    let ox = 0, oy = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if ((dx || dy) && isBld(tx0 + dx, ty0 + dy)) {
                                ox -= dx;
                                oy -= dy;
                            }
                        }
                    }
                    const olen = Math.hypot(ox, oy);
                    const shift = olen > 0 ? 18 / olen : 0;
                    pts.push({
                        x: (tx0 + 0.5) * TILE_SIZE + ox * shift,
                        y: (ty0 + 0.5) * TILE_SIZE + oy * shift
                    });
                    k = parent.get(k);
                }
                pts.reverse();
                pts.push({ x: tx, y: ty });
            }
            rt = { pts, idx: 0, t: now, tx, ty };
            ped._route = rt;
        }
        if (!rt.pts.length) return null;
        // Advance past reached waypoints strictly in order (no corner-cutting across building walls/awnings!)
        while (rt.idx < rt.pts.length - 1 && Math.hypot(rt.pts[rt.idx].x - ped.x, rt.pts[rt.idx].y - ped.y) < 20) rt.idx++;
        return rt.pts[rt.idx];
    }

    function invalidateCache(game) {
        spawnCache.clear();
        if (game && game._pedNavigator) {
            game._pedNavigator.walkCache.fill(0);
            game._pedNavigator.crossCache.clear();
        }
    }

    return { nextStep, stats, getNav, isGoodSpawnTile, routeWaypoint, invalidateCache };
})();
if (typeof window !== "undefined") {
    window.PedNav = PedNav;
}
