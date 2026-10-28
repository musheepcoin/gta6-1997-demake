/* ============================================================================
   GRAND THEFT AUTO: VICE CITY '97 — AUTHENTIC GTA 1 (.CMP) 256x256x6 3D MAP
   1997 2.5D Voxel City Map Architecture:
   - Ground types, block faces, lid rotations, directional road arrows
   - Compressed 256x256x6 voxel column reader & slope/elevation resolver
   - Perspective mesh face builder & 2D raycast segment tracer
   ============================================================================ */

const MAP_BLOCK_TEXTURE_DIMS = 64;
const PIXELS_PER_MAP_UNIT = 64.0;
const METERS_PER_MAP_UNIT = 4.0;
const PIXELS_PER_METER = PIXELS_PER_MAP_UNIT / METERS_PER_MAP_UNIT; // 16.0 px/m

const TILE_SIZE = MAP_BLOCK_TEXTURE_DIMS;
const MAP_DIMENSIONS = 256;
const MAP_COLS = MAP_DIMENSIONS;
const MAP_ROWS = MAP_DIMENSIONS;
const MAP_LAYERS_COUNT = 6;
const MAP_LAYERS = MAP_LAYERS_COUNT;
const WORLD_W = MAP_COLS * TILE_SIZE;
const WORLD_H = MAP_ROWS * TILE_SIZE;

// Unit conversion helpers (blocks <-> meters <-> pixels)
const Convert = {
    metersToMapUnits: (meters) => meters / METERS_PER_MAP_UNIT,
    mapUnitsToMeters: (units) => units * METERS_PER_MAP_UNIT,
    pixelsToMapUnits: (pixels) => pixels / PIXELS_PER_MAP_UNIT,
    mapUnitsToPixels: (units) => units * PIXELS_PER_MAP_UNIT,
    pixelsToMeters: (pixels) => pixels / PIXELS_PER_METER,
    metersToPixels: (meters) => meters * PIXELS_PER_METER
};

const TILE = {
    WATER_DEEP: 0,
    WATER_SHALLOW: 1,
    SAND: 2,
    GRASS: 3,
    SWAMP_WATER: 4,
    SWAMP_MUD: 5,
    SIDEWALK: 6,
    ROAD_H: 7,
    ROAD_V: 8,
    ROAD_CROSS: 9,
    BRIDGE_H: 10,
    BRIDGE_V: 11,
    PRISON_YARD: 12,
    BOARDWALK: 13,
    PARKING: 14,
    BUILDING: 15
};

// Ground types from GameDefs.h (eGroundType)
const GROUND_TYPE = {
    AIR: 0,
    WATER: 1,
    ROAD: 2,
    PAWEMENT: 3,
    FIELD: 4,
    BUILDING: 5
};

// Block face directions from GameDefs.h (eBlockFace)
const BLOCK_FACE = {
    W: 0,
    E: 1,
    N: 2,
    S: 3,
    LID: 4,
    COUNT: 5
};

// Traffic hint enum from GameDefs.h (eTrafficHint)
const TRAFFIC_HINT = {
    NONE: 0,
    TRAFFIC_LIGHTS: 1,
    TRAIN_TURN_START: 2,
    TRAIN_TURN_END: 3,
    TRAIN_STATION_START: 4,
    TRAIN_STATION_END: 5
};

const EMPTY_BLOCK = Object.freeze({
    up: false,
    down: false,
    left: false,
    right: false,
    groundType: GROUND_TYPE.AIR,
    isFlat: false,
    slopeType: 0,
    lidRotation: 0,
    trafficHint: TRAFFIC_HINT.NONE,
    remap: 0,
    flipTB: false,
    flipLR: false,
    isRailway: false,
    w: 0,
    e: 0,
    n: 0,
    s: 0,
    lid: 0,
    faces: [0, 0, 0, 0, 0]
});

class LeonidaMap {
    constructor() {
        this.cols = MAP_COLS;
        this.rows = MAP_ROWS;
        this.layers = MAP_LAYERS;
        this.tileSize = TILE_SIZE;
        this.width = WORLD_W;
        this.height = WORLD_H;

        this.cmpLoaded = false;
        this.blocksData = [EMPTY_BLOCK];
        // Flat Uint16Array of size 6 * 256 * 256 storing block index in this.blocksData (mMapTiles[layer][y][x])
        this.voxelGrid = new Uint16Array(MAP_LAYERS * MAP_ROWS * MAP_COLS);
        // Surface elevation (in block units 0..5) and surface groundType cache per (r, c)
        this.surfaceLayer = new Uint8Array(MAP_ROWS * MAP_COLS);
        this.surfaceGround = new Uint8Array(MAP_ROWS * MAP_COLS);
        this.coastalSandMask = new Uint8Array(MAP_ROWS * MAP_COLS);

        this.buildings = [];
        this.districts = [];
        this.payNSprays = [];
        this.bombShops = [];
        this.cranes = [];
        this.killFrenzies = [];
        this.landmarks = [];
        this.pickups = [];
        this.trees = [];
        this.vicePalms = [];
        this.beachUmbrellas = [];
        this.beachProps = [];
        this.crates = [];
        this.infoSigns = [];
        this.streetFires = [];

        this.surfaceLayer.fill(2);
        this.surfaceGround.fill(GROUND_TYPE.PAWEMENT);
        this.initWorldFeatures();
    }

    /* ========================================================================
       EXACT NYC.CMP DECOMPRESSION (GameMapManager::ReadCompressedMapData)
       ======================================================================== */
    loadCmpBinary(arrayBuffer, districtsMeta = null) {
        const dv = new DataView(arrayBuffer);
        const numCols = dv.getUint32(0, true);
        const numBlocks = dv.getUint32(4, true);

        let pos = 8;
        const baseTiles = new Uint32Array(65536);
        for (let i = 0; i < 65536; i++) {
            baseTiles[i] = dv.getUint32(pos, true);
            pos += 4;
        }

        const colData = new Uint16Array(numCols);
        for (let i = 0; i < numCols; i++) {
            colData[i] = dv.getUint16(pos, true);
            pos += 2;
        }

        this.blocksData = new Array(numBlocks);
        for (let i = 0; i < numBlocks; i++) {
            const typeMap = dv.getUint16(pos, true);
            const typeMapExt = dv.getUint8(pos + 2);
            const fw = dv.getUint8(pos + 3);
            const fe = dv.getUint8(pos + 4);
            const fn = dv.getUint8(pos + 5);
            const fs = dv.getUint8(pos + 6);
            const flid = dv.getUint8(pos + 7);
            pos += 8;

            this.blocksData[i] = {
                up: (typeMap & 0x01) > 0,
                down: (typeMap & 0x02) > 0,
                left: (typeMap & 0x04) > 0,
                right: (typeMap & 0x08) > 0,
                groundType: (typeMap >> 4) & 0x07,
                isFlat: (typeMap & 0x80) > 0,
                slopeType: (typeMap >> 8) & 0x3F,
                lidRotation: (typeMap >> 14) & 0x03,
                trafficHint: typeMapExt & 0x07,
                remap: (typeMapExt >> 3) & 0x03,
                flipTB: (typeMapExt & 0x20) > 0,
                flipLR: (typeMapExt & 0x40) > 0,
                isRailway: (typeMapExt & 0x80) > 0,
                w: fw,
                e: fe,
                n: fn,
                s: fs,
                lid: flid,
                faces: [fw, fe, fn, fs, flid]
            };
        }

        // Decompress 256x256 columns (GameMapManager.cpp lines 193-204)
        this.voxelGrid.fill(0);
        for (let tiley = 0; tiley < MAP_ROWS; tiley++) {
            for (let tilex = 0; tilex < MAP_COLS; tilex++) {
                const columnElement = baseTiles[tiley * MAP_COLS + tilex] >> 1;
                const columnHeight = MAP_LAYERS - colData[columnElement];
                for (let tilez = 0; tilez < columnHeight && tilez < MAP_LAYERS; tilez++) {
                    const srcBlock = colData[columnElement + columnHeight - tilez];
                    this.voxelGrid[(tilez * MAP_ROWS + tiley) * MAP_COLS + tilex] = srcBlock;
                }
            }
        }

        this.cmpLoaded = true;

        // Build 2D surface lookup table & tree planter list (Lid 69)
        this.mapStyle = this.mapStyle || "VICE";
        this.coastalSandMask = new Uint8Array(MAP_ROWS * MAP_COLS);
        this.trees = [];
        this.vicePalms = [];
        this.beachUmbrellas = [];

        for (let r = 0; r < MAP_ROWS; r++) {
            for (let c = 0; c < MAP_COLS; c++) {
                let surfZ = 1;
                let surfGt = GROUND_TYPE.WATER;
                for (let z = MAP_LAYERS - 1; z >= 0; z--) {
                    const blk = this.getBlockInfo(c, r, z);
                    if (blk.lid === 69) {
                        this.trees.push({ x: (c + 0.5) * TILE_SIZE, y: (r + 0.5) * TILE_SIZE, z: z + 1, scale: 1.0 });
                    }
                    if (blk.groundType !== GROUND_TYPE.AIR) {
                        surfZ = z;
                        surfGt = blk.groundType;
                        break;
                    }
                }
                this.surfaceLayer[r * MAP_COLS + c] = surfZ;
                this.surfaceGround[r * MAP_COLS + c] = surfGt;
            }
        }

        // Second pass: Identify true sand tiles (lid 98/99) & place Vice City / GTA 6 tropical palm trees and beach parasols
        for (let r = 2; r < MAP_ROWS - 2; r++) {
            for (let c = 2; c < MAP_COLS - 2; c++) {
                const idx = r * MAP_COLS + c;
                const surfGt = this.surfaceGround[idx];
                const surfZ = this.surfaceLayer[idx];
                if (surfGt !== GROUND_TYPE.PAWEMENT && surfGt !== GROUND_TYPE.FIELD) continue;

                const blkZ1 = this.getBlockInfo(c, r, 1);
                const isSandTile = (blkZ1 && blkZ1.lid >= 98 && blkZ1.lid <= 101);

                let nearWater = false;
                let adjRoad = false;
                for (let dr = -2; dr <= 2; dr++) {
                    for (let dc = -2; dc <= 2; dc++) {
                        const ngt = this.surfaceGround[(r + dr) * MAP_COLS + (c + dc)];
                        if (ngt === GROUND_TYPE.WATER) nearWater = true;
                        if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && ngt === GROUND_TYPE.ROAD) adjRoad = true;
                    }
                }

                if (isSandTile) {
                    this.coastalSandMask[idx] = 1;
                    if (((c * 7 + r * 13) % 14) === 0 && c >= 216 && c <= 246) {
                        this.beachUmbrellas.push({
                            x: (c + 0.5) * TILE_SIZE,
                            y: (r + 0.5) * TILE_SIZE,
                            z: surfZ,
                            spr: ((c + r) % 2 === 0) ? "umbrella_pink" : "umbrella_cyan",
                            angle: ((c * 31 + r * 17) % 628) * 0.01
                        });
                    }
                }

                // Place tropical palm trees along Ocean Drive sidewalks, parks & coastal strips
                const isBoulevardPalm = (surfGt === GROUND_TYPE.PAWEMENT && adjRoad && ((c * 11 + r * 19) % 15 === 0));
                const isCoastalOrParkPalm = ((surfGt === GROUND_TYPE.FIELD && !isSandTile) && ((c * 17 + r * 7) % 11 === 0));
                if (isBoulevardPalm || isCoastalOrParkPalm) {
                    this.vicePalms.push({
                        x: (c + 0.5) * TILE_SIZE,
                        y: (r + 0.5) * TILE_SIZE,
                        z: surfZ,
                        scale: 0.92 + ((c * 3 + r * 5) % 4) * 0.06,
                        angle: ((c * 23 + r * 41) % 628) * 0.01
                    });
                }
            }
        }

        // Signature hand-placed Ocean Drive / Star Island / Mambas Stadium / Lake Leonida / Keys palm rows
        const heroPalms = [
            // Ocean Drive & Lummus Park Promenade Palms (around Hotel Dixon y=142..156)
            [213.4, 143.5], [213.4, 146.5], [213.4, 149.5], [213.4, 152.5],
            [218.6, 142.5], [218.6, 145.5], [218.6, 148.5], [218.6, 151.5], [218.6, 155.5],
            // Mid-Beach / Malibu Club & Española Way Palms (y=86..108)
            [218.6, 86.5], [218.6, 89.5], [213.4, 105.5], [213.4, 108.5],
            // North Beach / Club Nine1Nine Palms (y=44..52)
            [213.4, 45.5], [213.4, 48.5], [218.6, 45.5], [218.6, 48.5],
            // Star Island & Venetian Islands Palms (173, 106)
            [168.5, 102.5], [177.5, 102.5], [168.5, 110.5], [177.5, 110.5],
            // Vice City Golf Club & Mambas Stadium Palms
            [138.5, 50.5], [144.5, 54.5], [106.5, 98.5], [125.5, 98.5],
            // Grassrivers Everglades & Diagonal Leonida Keys Palms
            [54.5, 212.5], [62.5, 212.5], [135.0, 241.5], [105.5, 239.5]
        ];
        for (const [hx, hy] of heroPalms) {
            const hz = this.surfaceLayer[Math.floor(hy) * MAP_COLS + Math.floor(hx)] || 2;
            this.vicePalms.push({
                x: hx * TILE_SIZE,
                y: hy * TILE_SIZE,
                z: hz,
                scale: 1.04,
                angle: (hx * 1.7 + hy * 0.9) % 6.28
            });
        }

        // Populate Official GTA 6 S-Curving Vice Beach Lifeguard Towers, Volleyball Courts, Star Island Pool & Neon Marquees!
        this.beachProps = [
            // 1. S-Curving Eastern Vice Beach Lifeguard Stands & Sand Volleyball Courts (North Beach -> Mid Beach -> Lummus Park -> South Point)
            { spr: "lifeguard_neon",   x: 231.5 * TILE_SIZE, y: 36.5 * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 233.5 * TILE_SIZE, y: 44.5 * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 235.5 * TILE_SIZE, y: 62.5 * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 237.5 * TILE_SIZE, y: 74.5 * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 239.5 * TILE_SIZE, y: 88.5 * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 237.5 * TILE_SIZE, y: 106.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 235.5 * TILE_SIZE, y: 124.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 233.5 * TILE_SIZE, y: 138.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 232.5 * TILE_SIZE, y: 145.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 232.5 * TILE_SIZE, y: 150.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 231.5 * TILE_SIZE, y: 156.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 229.5 * TILE_SIZE, y: 168.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 227.5 * TILE_SIZE, y: 184.5 * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "volleyball_court", x: 226.5 * TILE_SIZE, y: 46.5 * TILE_SIZE,  z: 1.98, scale: 1.2, angle: 0 },
            { spr: "volleyball_court", x: 229.5 * TILE_SIZE, y: 106.5 * TILE_SIZE, z: 1.98, scale: 1.2, angle: 0 },
            { spr: "volleyball_court", x: 226.5 * TILE_SIZE, y: 145.5 * TILE_SIZE, z: 1.98, scale: 1.2, angle: 0 },
            { spr: "volleyball_court", x: 225.5 * TILE_SIZE, y: 156.5 * TILE_SIZE, z: 1.98, scale: 1.2, angle: 0 },
            // 2. Star Island Mansion Central Lagoon Pool (inside Biscayne Bay at 173.0, 105.0)
            { spr: "vercetti_pool",    x: 173.0 * TILE_SIZE, y: 105.0 * TILE_SIZE, z: 1.98, scale: 1.25, angle: 0 },
            // 3. Official GTA 6 Neon Landmark Marquees on the 3D Buildings
            { spr: "sign_hotel_dixon", x: 212.3 * TILE_SIZE, y: 145.0 * TILE_SIZE, z: 2.35, scale: 1.20, angle: 0 },
            { spr: "sign_ocean_view",  x: 212.3 * TILE_SIZE, y: 151.0 * TILE_SIZE, z: 2.35, scale: 1.15, angle: 0 },
            { spr: "sign_nine1nine",   x: 212.3 * TILE_SIZE, y: 47.5 * TILE_SIZE,  z: 2.35, scale: 1.20, angle: 0 },
            { spr: "sign_malibu",      x: 212.3 * TILE_SIZE, y: 87.5 * TILE_SIZE,  z: 2.35, scale: 1.18, angle: 0 },
            { spr: "sign_jack_hearts", x: 113.2 * TILE_SIZE, y: 78.5 * TILE_SIZE,  z: 2.35, scale: 1.20, angle: 0 },
            { spr: "sign_uncle_jacks", x: 35.2 * TILE_SIZE,  y: 140.5 * TILE_SIZE, z: 2.35, scale: 1.20, angle: 0 },
            { spr: "sign_grassrivers", x: 56.5 * TILE_SIZE,  y: 211.5 * TILE_SIZE, z: 2.25, scale: 1.20, angle: 0 }
        ];

        // Sunbather Beach Towels & Parasols along S-Curving Vice Beach right across from Lummus Park!
        const eastBeachRowsY = [
            44.0, 47.5, 50.0,
            86.5, 90.0, 104.5, 108.5,
            143.0, 145.0, 147.5, 149.0, 151.0, 152.5, 155.5, 158.0
        ];
        for (let i = 0; i < eastBeachRowsY.length; i++) {
            const by = eastBeachRowsY[i];
            const sxShift = Math.max(-1, Math.round(0.5 * (6.5 * Math.sin((by - 38) * 0.036) - 3.0 * Math.cos((by - 38) * 0.019))));
            const bx = 226.2 + sxShift + (i % 3) * 2.2;
            this.beachProps.push({
                spr: (i % 2 === 0) ? "beach_towel_pink" : "beach_towel_cyan",
                x: bx * TILE_SIZE,
                y: by * TILE_SIZE,
                z: 1.98,
                scale: 1.05,
                angle: 0
            });
            this.beachUmbrellas.push({
                x: (bx - 0.4) * TILE_SIZE,
                y: (by - 0.25) * TILE_SIZE,
                z: 2.0,
                spr: (i % 2 === 0) ? "umbrella_pink" : "umbrella_cyan",
                angle: i * 0.9
            });
        }

        // 4. Build GTA 2 Style 3D Curb Streetlamps (this.streetlights), 3-Phase Junction Traffic Signals (this.trafficSignals) & Vice City Streetscape Details
        this.streetlights = [];
        this.trafficSignals = [];
        this.viceStreetDetails = [];
        for (let r = 3; r < MAP_ROWS - 3; r++) {
            for (let c = 3; c < MAP_COLS - 3; c++) {
                const idx = r * MAP_COLS + c;
                if (this.surfaceGround[idx] !== GROUND_TYPE.PAWEMENT) continue;
                if (this.coastalSandMask[idx]) continue;

                const eRoad = this.surfaceGround[r * MAP_COLS + (c + 1)] === GROUND_TYPE.ROAD;
                const wRoad = this.surfaceGround[r * MAP_COLS + (c - 1)] === GROUND_TYPE.ROAD;
                const sRoad = this.surfaceGround[(r + 1) * MAP_COLS + c] === GROUND_TYPE.ROAD;
                const nRoad = this.surfaceGround[(r - 1) * MAP_COLS + c] === GROUND_TYPE.ROAD;
                const roadCount = (eRoad ? 1 : 0) + (wRoad ? 1 : 0) + (sRoad ? 1 : 0) + (nRoad ? 1 : 0);

                // Intersection Corner (1 E/W road neighbor + 1 N/S road neighbor): Place GTA 2 3-Phase Traffic Light Signal Gantry!
                if (roadCount === 2 && (eRoad || wRoad) && (sRoad || nRoad) && ((c + r) % 2 === 0)) {
                    const dcCorner = eRoad ? 1 : -1;
                    const drCorner = sRoad ? 1 : -1;
                    const surfZ = this.surfaceLayer[idx] || 2.0;
                    const baseX = (c + 0.5) * TILE_SIZE + dcCorner * 19.0;
                    const baseY = (r + 0.5) * TILE_SIZE + drCorner * 19.0;
                    const isNS = (c % 2 === 0);
                    const headX = isNS ? (baseX + dcCorner * 17.0) : baseX;
                    const headY = isNS ? baseY : (baseY + drCorner * 17.0);
                    const armAngle = isNS ? (dcCorner > 0 ? 0 : Math.PI) : (drCorner > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
                    this.trafficSignals.push({
                        c,
                        r,
                        baseX,
                        baseY,
                        headX,
                        headY,
                        z: surfZ,
                        armAngle,
                        axis: isNS ? "NS" : "EW"
                    });
                    continue;
                }

                // Only place streetlamps along straight sidewalk curbs (1 road neighbor, never blocking intersection corners!)
                if (roadCount !== 1) continue;

                let dc = 0, dr = 0;
                if (eRoad) dc = 1;
                else if (wRoad) dc = -1;
                else if (sRoad) dr = 1;
                else if (nRoad) dr = -1;

                const isVerticalCurb = dc !== 0;
                const isOceanDriveCurb = (c === 213 || c === 218) && r >= 34 && r <= 204;
                const spacing = isOceanDriveCurb ? 2 : 3;
                const coordAlong = isVerticalCurb ? r : c;
                if ((coordAlong % spacing) !== 1) continue;

                const surfZ = this.surfaceLayer[idx] || 2.0;
                // Position base near the curb edge of the sidewalk (+20px toward road), overhanging luminaire head +13px out over the street
                const baseX = (c + 0.5) * TILE_SIZE + dc * 20.0;
                const baseY = (r + 0.5) * TILE_SIZE + dr * 20.0;
                const headX = baseX + dc * 13.0;
                const headY = baseY + dr * 13.0;
                const armAngle = Math.atan2(dr, dc);

                // District-authentic GTA 2 / Vice City streetlamp style & color palette
                let style = "BOULEVARD_GOLD";
                let colorType = "AMBER";
                if (c >= 202 && c <= 223) {
                    style = "ART_DECO_NEON";
                    const bucket = (c + r) % 3;
                    colorType = bucket === 0 ? "PINK" : (bucket === 1 ? "CYAN" : "AMBER");
                } else if (c >= 152 && c <= 201) {
                    style = "STAR_RESORT";
                    colorType = ((c + r) % 4 === 0) ? "CYAN" : "GOLD";
                } else if (c < 95 || r >= 205) {
                    style = "SODIUM_HIGHWAY";
                    colorType = "SODIUM";
                }

                this.streetlights.push({
                    c,
                    r,
                    baseX,
                    baseY,
                    headX,
                    headY,
                    z: surfZ,
                    armAngle,
                    style,
                    colorType
                });
            }
        }

        // Add Ornamental Twin-Globe Bollard Streetlamps along Lummus Park Promenade & the 3 Wooden Ocean Piers!
        for (let r = 38; r <= 198; r += 4) {
            if (this.surfaceGround[r * MAP_COLS + 220] === GROUND_TYPE.PAWEMENT) {
                const bx = 220.35 * TILE_SIZE;
                const by = (r + 0.5) * TILE_SIZE;
                this.streetlights.push({
                    c: 220,
                    r,
                    baseX: bx,
                    baseY: by,
                    headX: bx + 6.0,
                    headY: by,
                    z: 2.0,
                    armAngle: 0,
                    style: "PROMENADE_TWIN",
                    colorType: (r % 8 === 2) ? "PINK" : "CYAN"
                });
            }
        }
        for (const pierR of [45, 88, 154]) {
            for (let c = 232; c <= 246; c += 3) {
                if (this.surfaceGround[pierR * MAP_COLS + c] === GROUND_TYPE.PAWEMENT) {
                    const bx = (c + 0.5) * TILE_SIZE;
                    const by = (pierR + 0.22) * TILE_SIZE;
                    this.streetlights.push({
                        c,
                        r: pierR,
                        baseX: bx,
                        baseY: by,
                        headX: bx,
                        headY: by + 8.0,
                        z: 2.0,
                        armAngle: Math.PI * 0.5,
                        style: "PROMENADE_TWIN",
                        colorType: (c % 2 === 0) ? "AMBER" : "PINK"
                    });
                }
            }
        }

        // Deep-Dive Vice City Architectural Streetscape Props:
        // A. Ocean Drive Art Deco Sidewalk Café Tables & Pastel Bistro Umbrellas (West sidewalk x=213.18 in front of Art Deco hotels)
        for (let r = 42; r <= 194; r += 2) {
            if (this.surfaceGround[r * MAP_COLS + 213] !== GROUND_TYPE.PAWEMENT) continue;
            // Skip cross-street intersections
            if (this.surfaceGround[r * MAP_COLS + 212] === GROUND_TYPE.ROAD) continue;
            this.viceStreetDetails.push({
                kind: "CAFE_TABLE",
                x: 213.18 * TILE_SIZE,
                y: (r + 0.5) * TILE_SIZE,
                z: 2.0,
                theme: ((r >> 1) % 3 === 0) ? "PINK" : (((r >> 1) % 3 === 1) ? "CYAN" : "YELLOW")
            });
        }

        // B. Lummus Park Pastel Art Deco Serpentine Beach Wall & Neon Uplight Planters (along x=220.85 separating promenade from beach sand)
        for (let r = 40; r <= 192; r += 2) {
            if (this.surfaceGround[r * MAP_COLS + 220] !== GROUND_TYPE.PAWEMENT) continue;
            if (r % 12 === 0) continue; // Leave pedestrian beach access openings every 12 blocks!
            const waveX = Math.sin(r * 0.45) * 4.5;
            this.viceStreetDetails.push({
                kind: "SERPENTINE_WALL",
                x: 220.82 * TILE_SIZE + waveX,
                y: (r + 0.5) * TILE_SIZE,
                z: 2.0,
                theme: (r % 4 === 0) ? "PINK" : "CYAN"
            });
        }

        // C. Española Way Overhead Mediterranean Bistro Light Strings (y=105..108, x=204..213)
        for (let c = 204; c <= 212; c += 2) {
            this.viceStreetDetails.push({
                kind: "BISTRO_STRING",
                x: (c + 0.5) * TILE_SIZE,
                y: 106.5 * TILE_SIZE,
                z: 2.0,
                theme: (c % 4 === 0) ? "PINK" : "AMBER"
            });
        }

        // 16 Official GTA 6 (State of Leonida & Vice City) Bespoke Landmarks
        this.landmarks = this.buildGta6Landmarks();

        if (districtsMeta && Array.isArray(districtsMeta)) {
            this.districts = districtsMeta;
        }
    }

    buildGta6Landmarks() {
        return [
            {
                id: "VICE_BEACH",
                short: "VICE BEACH",
                shortName: "VICE BEACH & PIER",
                name: "🏖️ VICE BEACH, LUMMUS PARK & OCEAN PIER",
                sub: "S-CURVING GOLDEN SAND BEACH, 8 LIFEGUARD TOWERS, LUMMUS PARK & WOODEN PIER — +50 ARMOR!",
                district: "VICE BEACH & SOUTH POINT PIER",
                bx: 225.5,
                by: 154.0,
                x: 225.5 * TILE_SIZE,
                y: 154.0 * TILE_SIZE,
                color: "#facc15",
                perk: "ARMOR",
                visited: false
            },
            {
                id: "HOTEL_DIXON",
                short: "HOTEL DIXON",
                shortName: "HOTEL DIXON",
                name: "🏨 HOTEL DIXON & OCEAN DRIVE",
                sub: "ICONIC VICE CITY NEON ART DECO HOTEL FACING LUMMUS PARK — 100% HEALTH!",
                district: "SOUTH BEACH — OCEAN DRIVE",
                bx: 213.5,
                by: 146.0,
                x: 213.5 * TILE_SIZE,
                y: 146.0 * TILE_SIZE,
                color: "#f472b6",
                perk: "HEAL",
                visited: false
            },
            {
                id: "ESPANOLA_WAY",
                short: "ESPANOLA WAY",
                shortName: "ESPANOLA & FLAMINGO",
                name: "🦩 ESPAÑOLA WAY PLAZA & FLAMINGO PARK",
                sub: "PEDESTRIAN CORAL PROMENADE, MALIBU CLUB & FLAMINGO SPORTS FIELD — +1 MULTIPLIER!",
                district: "MID-BEACH — ESPAÑOLA WAY & FLAMINGO PARK",
                bx: 208.5,
                by: 106.5,
                x: 208.5 * TILE_SIZE,
                y: 106.5 * TILE_SIZE,
                color: "#fb7185",
                perk: "MULTIPLIER",
                visited: false
            },
            {
                id: "CLUB_NINE1NINE",
                short: "NINE1NINE",
                shortName: "CLUB NINE1NINE",
                name: "💃 CLUB NINE1NINE & NORTH BEACH MALL",
                sub: "VICE CITY FLAGSHIP VIP NIGHTCLUB & OPEN-AIR SHOPPING PROMENADE — +1 MULTIPLIER!",
                district: "NORTH BEACH — CLUB NINE1NINE",
                bx: 213.5,
                by: 48.0,
                x: 213.5 * TILE_SIZE,
                y: 48.0 * TILE_SIZE,
                color: "#22d3ee",
                perk: "MULTIPLIER",
                visited: false
            },
            {
                id: "SERA_SPACE",
                short: "SERA SPACE",
                shortName: "SERA SPACE CENTER",
                name: "🚀 SERA SPACE CENTER & LAUNCH PADS 39A/39B",
                sub: "CAPE LEONIDA VAB, BANANA RIVER LAGOON & 2 3D ROCKET GANTRY TOWERS — ROCKET & ARMOR!",
                district: "CAPE LEONIDA — SERA SPACEPORT",
                bx: 224.5,
                by: 20.5,
                x: 224.5 * TILE_SIZE,
                y: 20.5 * TILE_SIZE,
                color: "#38bdf8",
                perk: "ESTATE",
                visited: false
            },
            {
                id: "STAR_ISLAND",
                short: "STAR ISLAND",
                shortName: "STAR & VENETIAN ISLES",
                name: "🏛️ STAR ISLAND & VENETIAN ARCHIPELAGO",
                sub: "4 BISCAYNE BAY ISLANDS (HIBISCUS, SAN MARCO, BELLE ISLE & STAR MANSIONS) — FULL HP/ARMOR!",
                district: "BISCAYNE BAY — STAR ISLAND",
                bx: 173.0,
                by: 106.5,
                x: 173.0 * TILE_SIZE,
                y: 106.5 * TILE_SIZE,
                color: "#c084fc",
                perk: "ESTATE",
                visited: false
            },
            {
                id: "VICE_PORT",
                short: "VICE PORT",
                shortName: "VICE PORT & CRUISES",
                name: "🚢 PORT OF VICE CITY & 3D MEGA CRUISE SHIPS",
                sub: "2 GIANT DOCKED CRUISE LINERS, CONTAINER CRANES & DEEPWATER TERMINAL — +$3,000 BONUS!",
                district: "PORT OF VICE CITY & CRUISE TERMINAL",
                bx: 171.5,
                by: 164.5,
                x: 171.5 * TILE_SIZE,
                y: 164.5 * TILE_SIZE,
                color: "#60a5fa",
                perk: "TAXI_BONUS",
                visited: false
            },
            {
                id: "MAMBAS_STADIUM",
                short: "STADIUM",
                shortName: "MAMBAS STADIUM",
                name: "🏟️ VICE CITY MAMBAS OPEN-AIR STADIUM",
                sub: "DRIVE RIGHT INSIDE THE 3D STADIUM BOWL ONTO THE EMERALD FOOTBALL PITCH — +1 MULTIPLIER!",
                district: "VICE CITY MAMBAS STADIUM",
                bx: 116.0,
                by: 105.0,
                x: 116.0 * TILE_SIZE,
                y: 105.0 * TILE_SIZE,
                color: "#34d399",
                perk: "MULTIPLIER",
                visited: false
            },
            {
                id: "DOWNTOWN_VC",
                short: "DOWNTOWN VC",
                shortName: "DOWNTOWN & GOLF CLUB",
                name: "🏙️ DOWNTOWN SKYLINE, BAYFRONT & GOLF CLUB",
                sub: "CRUCIFORM SKYSCRAPERS, BAYFRONT MARINA, VICE RIVER & 9-HOLE GOLF COURSE — 100% HEALTH!",
                district: "DOWNTOWN VICE CITY & BAYFRONT PARK",
                bx: 141.5,
                by: 116.5,
                x: 141.5 * TILE_SIZE,
                y: 116.5 * TILE_SIZE,
                color: "#818cf8",
                perk: "HEAL",
                visited: false
            },
            {
                id: "JACK_OF_HEARTS",
                short: "WYNWOOD/JACK",
                shortName: "WYNWOOD & JACK'S",
                name: "🎨 WYNWOOD WALLS, LITTLE HAITI & JACK OF HEARTS",
                sub: "STREET ART COURTYARDS, TOUSSAINT MARKET & BOOBIE IKE'S STRIP CLUB — +$3,000 VIP BONUS!",
                district: "WYNWOOD WALLS & CLUB JACK OF HEARTS",
                bx: 115.5,
                by: 82.5,
                x: 115.5 * TILE_SIZE,
                y: 82.5 * TILE_SIZE,
                color: "#e879f9",
                perk: "TAXI_BONUS",
                visited: false
            },
            {
                id: "LAKE_LEONIDA",
                short: "LAKE LEONIDA",
                shortName: "LAKE LEONIDA & AMBROSIA",
                name: "🌊 LAKE LEONIDA GATOR ISLAND & AMBROSIA",
                sub: "MULTI-LOBED CENTRAL LAKE, I-95 CAUSEWAY BRIDGE & SUGAR REFINERY — +50 ARMOR & AIRBOAT!",
                district: "LAKE LEONIDA & GATOR ISLAND",
                bx: 77.5,
                by: 75.0,
                x: 77.5 * TILE_SIZE,
                y: 75.0 * TILE_SIZE,
                color: "#2dd4bf",
                perk: "ARMOR",
                visited: false
            },
            {
                id: "MOUNT_KALAGA",
                short: "MT KALAGA",
                shortName: "MOUNT KALAGA CANYON",
                name: "⛰️ MOUNT KALAGA NATIONAL PARK & CANYON",
                sub: "6 3D MOUNTAIN MASSIFS, SCENIC CANYON HIGHWAY, WATERFALL GORGE & RANGER POST — 100% HP!",
                district: "MOUNT KALAGA NATIONAL PARK",
                bx: 84.5,
                by: 25.5,
                x: 84.5 * TILE_SIZE,
                y: 25.5 * TILE_SIZE,
                color: "#a3e635",
                perk: "HEAL",
                visited: false
            },
            {
                id: "PENITENTIARY",
                short: "PRISON",
                shortName: "LEONIDA PENITENTIARY",
                name: "🚨 LEONIDA STATE PENITENTIARY (KELLY COUNTY)",
                sub: "ENTERABLE WALLED PRISON FORTRESS, 8 GUARD WATCHTOWERS & EXERCISE YARD — JAIL FREE CARD!",
                district: "LEONIDA STATE PENITENTIARY",
                bx: 31.5,
                by: 76.5,
                x: 31.5 * TILE_SIZE,
                y: 76.5 * TILE_SIZE,
                color: "#f87171",
                perk: "ESTATE",
                visited: false
            },
            {
                id: "PORT_GELLHORN",
                short: "PT GELLHORN",
                shortName: "GELLHORN & SPEEDWAY",
                name: "🏁 PORT GELLHORN OVAL SPEEDWAY & HANK'S",
                sub: "DRIVEABLE DIRT OVAL RACE TRACK, HANK'S WAFFLES, UNCLE JACK'S & DOCKS — REPAIR & 0 WANTED!",
                district: "PORT GELLHORN DIRT SPEEDWAY",
                bx: 47.0,
                by: 113.5,
                x: 47.0 * TILE_SIZE,
                y: 113.5 * TILE_SIZE,
                color: "#fb923c",
                perk: "REPAIR_CLEAR",
                visited: false
            },
            {
                id: "VCIA_AIRPORT",
                short: "VCIA AIRPORT",
                shortName: "VCIA INT'L AIRPORT",
                name: "✈️ VCIA INT'L AIRPORT (DUAL RUNWAYS & JET)",
                sub: "CROSSING RUNWAYS 18L/09, Y-TERMINAL, CONTROL TOWER & 3D PARKED AIRLINER — 100% HEALTH!",
                district: "VCIA INTERNATIONAL AIRPORT",
                bx: 66.5,
                by: 152.0,
                x: 66.5 * TILE_SIZE,
                y: 152.0 * TILE_SIZE,
                color: "#38bdf8",
                perk: "HEAL",
                visited: false
            },
            {
                id: "GRASSRIVERS",
                short: "MUD PARK/KEYS",
                shortName: "MUD PARK & KEYS",
                name: "🐊 THRILLBILLY MUD PARK, EVERGLADES & KEYS",
                sub: "FIGURE-8 MUD TRACK, GATOR SWAMP & 6 LEONIDA KEYS WITH BROKEN BRIDGE JUMP — +50 ARMOR!",
                district: "GRASSRIVERS & THRILLBILLY MUD PARK",
                bx: 58.0,
                by: 214.5,
                x: 58.0 * TILE_SIZE,
                y: 214.5 * TILE_SIZE,
                color: "#4ade80",
                perk: "ARMOR",
                visited: false
            }
        ];

        // 8 Enterable Iconic GTA 6 Landmark Interiors (Press [E] at the door or click [🚪 Enter Interior]!)
        this.interiors = [
            {
                id: "HOTEL_DIXON",
                name: "🏨 HOTEL DIXON LOBBY & SAFEHOUSE SUITE",
                subtitle: "ART DECO TERRAZZO LOBBY, COCKTAIL BAR, LUCIA & JASON'S SUITE STASH & WARDROBE",
                theme: "ART_DECO_HOTEL",
                accent: "#f472b6",
                doorX: 213.35 * TILE_SIZE,
                doorY: 145.8 * TILE_SIZE,
                w: 760,
                h: 520,
                npcs: [
                    { x: 380, y: 125, angle: Math.PI * 0.5, type: "civ2", label: "CONCIERGE" },
                    { x: 185, y: 260, angle: 0, type: "civ1", label: "GUEST" },
                    { x: 580, y: 280, angle: Math.PI, type: "civ3", label: "BARTENDER" }
                ],
                stations: [
                    {
                        id: "DIXON_STASH",
                        x: 165,
                        y: 145,
                        color: "#39ff14",
                        label: "🔫 SUITE WEAPON STASH",
                        sub: "+100% HP, +100 ARMOR, UZI & SHOTGUN!",
                        rewardType: "ARSENAL"
                    },
                    {
                        id: "DIXON_WARDROBE",
                        x: 600,
                        y: 145,
                        color: "#38bdf8",
                        label: "👗 SAFEHOUSE WARDROBE",
                        sub: "CLEAR WANTED LEVEL + TOGGLE BANDANA + $2,000!",
                        rewardType: "WARDROBE"
                    },
                    {
                        id: "DIXON_BAR",
                        x: 590,
                        y: 350,
                        color: "#f472b6",
                        label: "🍹 NEON MOJITO LOUNGE",
                        sub: "FULL HEALTH + SPEED BOOST + $1,500!",
                        rewardType: "LOUNGE"
                    }
                ]
            },
            {
                id: "CLUB_NINE1NINE",
                name: "💃 CLUB NINE1NINE VIP NIGHTCLUB",
                subtitle: "PULSING LED DANCEFLOOR, DJ TURNTABLE BOOTH, VIP BOTTLES & MANAGER VAULT",
                theme: "NEON_CLUB",
                accent: "#fb923c",
                doorX: 213.4 * TILE_SIZE,
                doorY: 48.0 * TILE_SIZE,
                w: 800,
                h: 540,
                npcs: [
                    { x: 400, y: 115, angle: Math.PI * 0.5, type: "gang", label: "RESIDENT DJ" },
                    { x: 340, y: 265, angle: 0.8, type: "civ2", label: "DANCER", dancing: true },
                    { x: 455, y: 265, angle: -0.8, type: "civ1", label: "DANCER", dancing: true },
                    { x: 395, y: 315, angle: -1.5, type: "civ3", label: "DANCER", dancing: true },
                    { x: 640, y: 220, angle: Math.PI, type: "civ0", label: "VIP HOST" }
                ],
                stations: [
                    {
                        id: "NINE_DJ",
                        x: 400,
                        y: 150,
                        color: "#00f0ff",
                        label: "🎧 DJ TURNTABLE BOOTH",
                        sub: "DROP THE BASS! +1 MULTIPLIER & +$4,000!",
                        rewardType: "MULTIPLIER_CASH"
                    },
                    {
                        id: "NINE_VIP",
                        x: 165,
                        y: 250,
                        color: "#f472b6",
                        label: "🍾 VIP BOTTLE SERVICE",
                        sub: "+100% HP, +100 ARMOR & UZI AMMO!",
                        rewardType: "ARSENAL"
                    },
                    {
                        id: "NINE_SAFE",
                        x: 645,
                        y: 145,
                        color: "#fde047",
                        label: "💰 NIGHTCLUB OFFICE VAULT",
                        sub: "CRACK THE SAFE FOR +$10,000 CASH!",
                        rewardType: "HEIST_SAFE"
                    }
                ]
            },
            {
                id: "JACK_OF_HEARTS",
                name: "💎 CLUB JACK OF HEARTS (BOOBIE IKE'S LOUNGE)",
                subtitle: "NEON STAGE RUNWAY, VELVET VIP BOOTHS & BOOBIE IKE'S BACKROOM COUNTING VAULT",
                theme: "STRIP_CLUB",
                accent: "#e879f9",
                doorX: 115.5 * TILE_SIZE,
                doorY: 82.5 * TILE_SIZE,
                w: 800,
                h: 540,
                npcs: [
                    { x: 400, y: 220, angle: Math.PI * 0.5, type: "civ2", label: "STAGE PERFORMER", dancing: true },
                    { x: 330, y: 290, angle: -0.6, type: "gang", label: "BOOBIE IKE VIP" },
                    { x: 470, y: 290, angle: -2.4, type: "civ1", label: "PATRON" },
                    { x: 640, y: 150, angle: Math.PI, type: "gang", label: "VAULT GUARD" }
                ],
                stations: [
                    {
                        id: "JACK_STAGE",
                        x: 400,
                        y: 265,
                        color: "#e879f9",
                        label: "💃 MAIN NEON STAGE",
                        sub: "MAKE IT RAIN! +1 MULTIPLIER & 100% HP!",
                        rewardType: "MULTIPLIER_CASH"
                    },
                    {
                        id: "JACK_VAULT",
                        x: 645,
                        y: 145,
                        color: "#fde047",
                        label: "💼 BOOBIE IKE'S CASH VAULT",
                        sub: "+$12,000 CASH HEIST + SHOTGUN & UZI!",
                        rewardType: "HEIST_SAFE"
                    },
                    {
                        id: "JACK_BAR",
                        x: 165,
                        y: 250,
                        color: "#38bdf8",
                        label: "🥃 VELVET VIP BAR",
                        sub: "+100 ARMOR & CLEAR WANTED LEVEL!",
                        rewardType: "WARDROBE"
                    }
                ]
            },
            {
                id: "ESPANOLA_WAY",
                name: "🦩 THE MALIBU & ESPAÑOLA WAY ARCADE LOUNGE",
                subtitle: "CORAL HAVANA DANCE HALL, RETRO 1997 ARCADE CABINETS & SMUGGLER BACKROOM",
                theme: "MALIBU_CLUB",
                accent: "#fb7185",
                doorX: 208.5 * TILE_SIZE,
                doorY: 106.5 * TILE_SIZE,
                w: 760,
                h: 520,
                npcs: [
                    { x: 380, y: 240, angle: 0.5, type: "civ1", label: "SALSA DANCER", dancing: true },
                    { x: 430, y: 240, angle: -2.5, type: "civ2", label: "SALSA DANCER", dancing: true },
                    { x: 180, y: 150, angle: 0, type: "gang", label: "SMUGGLER" }
                ],
                stations: [
                    {
                        id: "MALIBU_CRATE",
                        x: 165,
                        y: 145,
                        color: "#f97316",
                        label: "📦 SMUGGLER'S HEAVY CRATE",
                        sub: "FLAMETHROWER + ROCKET LAUNCHER + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "MALIBU_ARCADE",
                        x: 600,
                        y: 155,
                        color: "#39ff14",
                        label: "🕹️ 1997 GTA ARCADE CABINET",
                        sub: "+1 EXTRA LIFE & +$5,000 HIGH SCORE!",
                        rewardType: "EXTRA_LIFE"
                    },
                    {
                        id: "MALIBU_BAR",
                        x: 590,
                        y: 350,
                        color: "#fb7185",
                        label: "🍸 HAVANA MOJITO COUNTER",
                        sub: "100% HEALTH + SPEED BOOST + $2,000!",
                        rewardType: "LOUNGE"
                    }
                ]
            },
            {
                id: "STAR_ISLAND",
                name: "🏛️ STAR ISLAND MANSION ('THE WORLD IS YOURS' PALAZZO)",
                subtitle: "GRAND CARRARA MARBLE FOYER, SCARFACE SECURITY OFFICE, INDOOR JACUZZI & GOLDEN VAULT",
                theme: "MANSION",
                accent: "#c084fc",
                doorX: 173.0 * TILE_SIZE,
                doorY: 106.5 * TILE_SIZE,
                w: 820,
                h: 550,
                npcs: [
                    { x: 410, y: 140, angle: Math.PI * 0.5, type: "gang", label: "CARTEL BOSS" },
                    { x: 260, y: 220, angle: 0, type: "gang", label: "BODYGUARD" },
                    { x: 560, y: 220, angle: Math.PI, type: "civ2", label: "VIP GUEST" }
                ],
                stations: [
                    {
                        id: "MANSION_DESK",
                        x: 410,
                        y: 150,
                        color: "#fde047",
                        label: "🖥️ SCARFACE OFFICE & SAFE",
                        sub: "+$15,000 CARTEL PAYROLL & 0 WANTED!",
                        rewardType: "HEIST_SAFE"
                    },
                    {
                        id: "MANSION_ARMORY",
                        x: 175,
                        y: 165,
                        color: "#f97316",
                        label: "🚀 GOLDEN HEAVY ARMORY",
                        sub: "ROCKET + FLAMETHROWER + UZI + SHOTGUN + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "MANSION_POOL",
                        x: 645,
                        y: 310,
                        color: "#22d3ee",
                        label: "🌊 INDOOR MARBLE JACUZZI",
                        sub: "100% HEALTH + +1 SCORE MULTIPLIER!",
                        rewardType: "MULTIPLIER_CASH"
                    }
                ]
            },
            {
                id: "SERA_SPACE",
                name: "🚀 SERA SPACE CENTER MISSION CONTROL BUNKER",
                subtitle: "ORBITAL TELEMETRY SCREENS, APOLLO LAUNCH DIRECTOR CONSOLE & PROTOTYPE LAB",
                theme: "SPACE_BUNKER",
                accent: "#38bdf8",
                doorX: 224.5 * TILE_SIZE,
                doorY: 20.5 * TILE_SIZE,
                w: 820,
                h: 540,
                npcs: [
                    { x: 410, y: 145, angle: -Math.PI * 0.5, type: "civ1", label: "FLIGHT DIRECTOR" },
                    { x: 260, y: 230, angle: -Math.PI * 0.5, type: "civ0", label: "ENGINEER" },
                    { x: 560, y: 230, angle: -Math.PI * 0.5, type: "civ3", label: "ASTRONAUT" }
                ],
                stations: [
                    {
                        id: "SERA_LAUNCH",
                        x: 410,
                        y: 160,
                        color: "#ef4444",
                        label: "🔴 [LAUNCH CAPE LEONIDA ROCKET!]",
                        sub: "IGNITE PAD 39A! +$20,000 & +2 MULTIPLIER!",
                        rewardType: "ROCKET_LAUNCH"
                    },
                    {
                        id: "SERA_ORDNANCE",
                        x: 175,
                        y: 250,
                        color: "#38bdf8",
                        label: "⚡ ORBITAL ORDNANCE LOCKER",
                        sub: "ROCKET LAUNCHER + FLAMETHROWER + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "SERA_MEDPOD",
                        x: 645,
                        y: 250,
                        color: "#39ff14",
                        label: "🧬 ZERO-G BIO-MEDPOD",
                        sub: "+1 EXTRA LIFE & 100% HEALTH!",
                        rewardType: "EXTRA_LIFE"
                    }
                ]
            },
            {
                id: "PENITENTIARY",
                name: "🚨 LEONIDA STATE PENITENTIARY CELLBLOCK B & ARMORY",
                subtitle: "LUCIA'S OLD CELL #06, RIOT SWAT WEAPON LOCKER & WARDEN'S PAROLE SAFE",
                theme: "PRISON_BLOCK",
                accent: "#f87171",
                doorX: 31.5 * TILE_SIZE,
                doorY: 76.5 * TILE_SIZE,
                w: 800,
                h: 530,
                npcs: [
                    { x: 400, y: 155, angle: Math.PI * 0.5, type: "police", label: "WARDEN" },
                    { x: 220, y: 155, angle: Math.PI * 0.5, type: "monk", label: "INMATE #09" },
                    { x: 580, y: 280, angle: Math.PI, type: "police", label: "CORRECTIONS OFFICER" }
                ],
                stations: [
                    {
                        id: "PRISON_PAROLE",
                        x: 400,
                        y: 155,
                        color: "#fde047",
                        label: "🗝️ WARDEN'S PAROLE SAFE",
                        sub: "+2 GET OUT OF JAIL FREE CARDS & 0 WANTED!",
                        rewardType: "JAIL_CARDS"
                    },
                    {
                        id: "PRISON_ARMORY",
                        x: 635,
                        y: 175,
                        color: "#38bdf8",
                        label: "🛡️ SWAT RIOT ARMORY",
                        sub: "SHOTGUN + UZI + ROCKET + 100 SWAT ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "PRISON_CELL06",
                        x: 175,
                        y: 175,
                        color: "#f87171",
                        label: "🛏️ LUCIA'S CELL #06 STASH",
                        sub: "+$7,500 CONTRABAND STASH & 100% HP!",
                        rewardType: "HEIST_SAFE"
                    }
                ]
            },
            {
                id: "PORT_GELLHORN",
                name: "🍔 HANK'S WAFFLES & UNCLE JACK'S PAWN / LIQUOR",
                subtitle: "VICE CITY DINER HOLDUP REGISTER, WAFFLE COUNTER & BACKROOM GUN RACK",
                theme: "DINER_PAWN",
                accent: "#fb923c",
                doorX: 38.5 * TILE_SIZE,
                doorY: 142.5 * TILE_SIZE,
                w: 760,
                h: 520,
                npcs: [
                    { x: 380, y: 140, angle: Math.PI * 0.5, type: "civ0", label: "CASHIER" },
                    { x: 220, y: 270, angle: 0, type: "civ3", label: "DINER CUSTOMER" },
                    { x: 590, y: 155, angle: Math.PI * 0.5, type: "gang", label: "PAWN BROKER" }
                ],
                stations: [
                    {
                        id: "DINER_REGISTER",
                        x: 380,
                        y: 165,
                        color: "#fde047",
                        label: "💵 ROB DINER REGISTER (TRAILER 1!)",
                        sub: "STICK UP THE REGISTER FOR +$8,500 CASH!",
                        rewardType: "HEIST_SAFE"
                    },
                    {
                        id: "PAWN_GUNS",
                        x: 595,
                        y: 165,
                        color: "#f97316",
                        label: "🔫 UNCLE JACK'S GUN WALL",
                        sub: "SHOTGUN + UZI + FLAMETHROWER + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "HANK_WAFFLES",
                        x: 175,
                        y: 330,
                        color: "#39ff14",
                        label: "🧇 HANK'S WAFFLE BOOTH",
                        sub: "100% HEALTH + +1 MULTIPLIER!",
                        rewardType: "MULTIPLIER_CASH"
                    }
                ]
            }
        ];

        // 10 High-Flying Unique Stunt Jump Ramps across Vice City & Leonida!
        this.stuntRamps = [
            { id: "RAMP_OCEAN_SOUTH", name: "OCEAN DRIVE PROMENADE JUMP", x: 217.5 * TILE_SIZE, y: 151.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_OCEAN_MID", name: "LUMMUS PARK BEACH LAUNCH", x: 217.5 * TILE_SIZE, y: 124.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_MACARTHUR", name: "MACARTHUR CAUSEWAY BAY JUMP", x: 184.0 * TILE_SIZE, y: 156.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_VENETIAN", name: "VENETIAN ISLAND CANAL JUMP", x: 184.0 * TILE_SIZE, y: 109.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_JULIA_TUTTLE", name: "NORTH BAY SUPERJUMP", x: 184.0 * TILE_SIZE, y: 49.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_DOWNTOWN", name: "DOWNTOWN BAYFRONT LAUNCH", x: 141.5 * TILE_SIZE, y: 120.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_STADIUM", name: "MAMBAS STADIUM BOWL JUMP", x: 116.0 * TILE_SIZE, y: 111.5 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_SPEEDWAY", name: "PORT GELLHORN SPEEDWAY RAMP", x: 47.0 * TILE_SIZE, y: 120.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_AIRPORT", name: "VCIA RUNWAY JET RAMP", x: 66.5 * TILE_SIZE, y: 156.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_KEYS", name: "LEONIDA KEYS BROKEN BRIDGE JUMP", x: 124.0 * TILE_SIZE, y: 241.5 * TILE_SIZE, angle: 0 }
        ];
    }

    getBlockIndex(coordx, coordy, layer) {
        if (!this.cmpLoaded) return 0;
        const l = Math.max(0, Math.min(MAP_LAYERS - 1, layer | 0));
        const cx = Math.max(0, Math.min(MAP_COLS - 1, coordx | 0));
        const cy = Math.max(0, Math.min(MAP_ROWS - 1, coordy | 0));
        return this.voxelGrid[(l * MAP_ROWS + cy) * MAP_COLS + cx];
    }

    getBlockInfo(coordxOrIdx, coordy, layer) {
        if (!this.cmpLoaded) return EMPTY_BLOCK;
        if (coordy === undefined) {
            return this.blocksData[coordxOrIdx] || EMPTY_BLOCK;
        }
        const l = Math.max(0, Math.min(MAP_LAYERS - 1, layer | 0));
        const cx = Math.max(0, Math.min(MAP_COLS - 1, coordxOrIdx | 0));
        const cy = Math.max(0, Math.min(MAP_ROWS - 1, coordy | 0));
        const idx = this.voxelGrid[(l * MAP_ROWS + cy) * MAP_COLS + cx];
        return this.blocksData[idx] || EMPTY_BLOCK;
    }

    getGroundTypeAtBlock(bx, by, bz = 0) {
        const cx = Math.max(0, Math.min(MAP_COLS - 1, bx | 0));
        const cy = Math.max(0, Math.min(MAP_ROWS - 1, by | 0));
        const gt = this.surfaceGround[cy * MAP_COLS + cx];
        if (gt === GROUND_TYPE.ROAD) return 1;
        if (gt === GROUND_TYPE.PAWEMENT) return 2;
        if (gt === GROUND_TYPE.FIELD) return 3;
        return 0;
    }

    /* ========================================================================
       AUTHENTIC NYC.CMP ROAD ARROW & LANE NAVIGATION GRAPH (1997 GTA 1)
       Uses BlockStyle directional bitmask (up/down/left/right) & trafficHint
       ======================================================================== */
    getNavigationBlock(bx, by, zBlocks = 2.0) {
        const cx = Math.max(0, Math.min(MAP_COLS - 1, bx | 0));
        const cy = Math.max(0, Math.min(MAP_ROWS - 1, by | 0));
        if (!this.cmpLoaded) {
            return {
                up: false,
                down: false,
                left: false,
                right: false,
                groundType: GROUND_TYPE.ROAD,
                trafficHint: 0,
                slopeType: 0
            };
        }

        const targetZ = Math.max(0, Math.min(MAP_LAYERS - 1, Math.round(zBlocks)));
        const blkAtZ = this.getBlockInfo(cx, cy, targetZ);
        if (blkAtZ && blkAtZ.groundType !== GROUND_TYPE.AIR) {
            return blkAtZ;
        }
        const surfZ = this.surfaceLayer[cy * MAP_COLS + cx];
        return this.getBlockInfo(cx, cy, surfZ);
    }

    getAllowedRoadDirections(bx, by, zBlocks = 2.0) {
        const blk = this.getNavigationBlock(bx, by, zBlocks);
        const dirs = [];
        if (blk.up) dirs.push({ key: "U", dx: 0, dy: -1, angle: -Math.PI * 0.5 });
        if (blk.down) dirs.push({ key: "D", dx: 0, dy: 1, angle: Math.PI * 0.5 });
        if (blk.left) dirs.push({ key: "L", dx: -1, dy: 0, angle: Math.PI });
        if (blk.right) dirs.push({ key: "R", dx: 1, dy: 0, angle: 0 });

        // Fallback if a road tile has no explicit arrow bitmask: check adjacent road tiles
        if (dirs.length === 0) {
            const cardinals = [
                { key: "U", dx: 0, dy: -1, angle: -Math.PI * 0.5 },
                { key: "D", dx: 0, dy: 1, angle: Math.PI * 0.5 },
                { key: "L", dx: -1, dy: 0, angle: Math.PI },
                { key: "R", dx: 1, dy: 0, angle: 0 }
            ];
            for (const c of cardinals) {
                const nb = this.getNavigationBlock(bx + c.dx, by + c.dy, zBlocks);
                if (nb && nb.groundType === GROUND_TYPE.ROAD) {
                    dirs.push(c);
                }
            }
        }
        return dirs;
    }

    normalizeAngleDiff(a, b) {
        let diff = a - b;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    getAlignedRoadAngle(bx, by, fallbackAngle = Math.PI * 0.5, zBlocks = 2.0) {
        const dirs = this.getAllowedRoadDirections(bx, by, zBlocks);
        if (dirs.length === 0) return fallbackAngle;
        let bestAngle = dirs[0].angle;
        let bestDiff = Math.abs(this.normalizeAngleDiff(dirs[0].angle, fallbackAngle));
        for (let i = 1; i < dirs.length; i++) {
            const d = Math.abs(this.normalizeAngleDiff(dirs[i].angle, fallbackAngle));
            if (d < bestDiff) {
                bestDiff = d;
                bestAngle = dirs[i].angle;
            }
        }
        return bestAngle;
    }

    doesRoadExitIntersection(bx, by, dx, dy, zBlocks = 2.0) {
        for (let step = 1; step <= 6; step++) {
            const tx = bx + dx * step;
            const ty = by + dy * step;
            if (tx < 1 || tx >= MAP_COLS - 1 || ty < 1 || ty >= MAP_ROWS - 1) return false;
            const tb = this.getNavigationBlock(tx, ty, zBlocks);
            if (!tb || tb.groundType !== GROUND_TYPE.ROAD) return false;
            const tlid = this.getBlockInfo(tx, ty, 1).lid;
            if (tlid !== 25) {
                // Verify that the outgoing lane after the intersection actually flows in direction (dx, dy)
                // so a car never turns into an oncoming lane!
                const hasAnyArrow = Boolean(tb.up || tb.down || tb.left || tb.right);
                if (!hasAnyArrow) return true;
                if (dx === 1) return Boolean(tb.right);
                if (dx === -1) return Boolean(tb.left);
                if (dy === 1) return Boolean(tb.down);
                if (dy === -1) return Boolean(tb.up);
                return true;
            }
        }
        return true;
    }

    hasClearLineOfSightForVehicle(x1, y1, x2, y2, zBlocks = 2.0) {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 24) return true;
        const steps = Math.min(16, Math.ceil(dist / 24));
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const sx = x1 + (x2 - x1) * t;
            const sy = y1 + (y2 - y1) * t;
            if (this.isWaterAtPixel(sx, sy)) return false;
            if (this.resolveCircleBuildingCollision(sx, sy, 14, zBlocks).hit) return false;
        }
        return true;
    }

    chooseTargetGuidedRoadBlock(bx, by, currentAngle, targetX, targetY, zBlocks = 2.0, turnedInIntersection = false) {
        const dirs = this.getAllowedRoadDirections(bx, by, zBlocks);
        const cardinals = [
            { key: "U", dx: 0, dy: -1, angle: -Math.PI * 0.5 },
            { key: "D", dx: 0, dy: 1, angle: Math.PI * 0.5 },
            { key: "L", dx: -1, dy: 0, angle: Math.PI },
            { key: "R", dx: 1, dy: 0, angle: 0 }
        ];
        const sourceDirs = dirs.length > 0 ? dirs : cardinals;
        const candidates = [];

        for (const d of sourceDirs) {
            const nx = bx + d.dx;
            const ny = by + d.dy;
            if (nx < 1 || nx >= MAP_COLS - 1 || ny < 1 || ny >= MAP_ROWS - 1) continue;
            const nb = this.getNavigationBlock(nx, ny, zBlocks);
            if (!nb || nb.groundType === GROUND_TYPE.BUILDING || nb.groundType === GROUND_TYPE.WATER || nb.groundType === GROUND_TYPE.AIR) {
                continue;
            }
            const absDiff = Math.abs(this.normalizeAngleDiff(d.angle, currentAngle));
            const isTurn = absDiff > 0.45;
            const isUturn = absDiff > 2.4;
            const exitsIntersection = this.doesRoadExitIntersection(bx, by, d.dx, d.dy, zBlocks);

            // Project 4 blocks ahead along (d.dx, d.dy) to score how well this road approaches (targetX, targetY)
            const lookX = (bx + d.dx * 4 + 0.5) * TILE_SIZE;
            const lookY = (by + d.dy * 4 + 0.5) * TILE_SIZE;
            const distToTarget = Math.hypot(targetX - lookX, targetY - lookY);
            const penalty =
                (nb.groundType === GROUND_TYPE.ROAD ? 0 : 220) +
                (exitsIntersection ? 0 : 180) +
                (isUturn ? 320 : 0) +
                (isTurn && turnedInIntersection ? 260 : 0);

            candidates.push({
                ...d,
                bx: nx,
                by: ny,
                absDiff,
                isTurn,
                isUturn,
                exitsIntersection,
                score: -distToTarget - penalty
            });
        }

        if (candidates.length === 0) {
            return this.chooseNextRoadBlock(bx, by, currentAngle, zBlocks, 0.2, turnedInIntersection);
        }
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0];
    }

    chooseNextRoadBlock(bx, by, currentAngle, zBlocks = 2.0, turnSeed = 0.5, turnedInIntersection = false) {
        const normSeed = ((turnSeed % 1.0) + 1.0) % 1.0;
        const dirs = this.getAllowedRoadDirections(bx, by, zBlocks);
        if (dirs.length === 0) {
            const snapAngle = Math.round(currentAngle / (Math.PI * 0.5)) * (Math.PI * 0.5);
            const dx = Math.round(Math.cos(snapAngle));
            const dy = Math.round(Math.sin(snapAngle));
            return {
                dx,
                dy,
                bx: bx + dx,
                by: by + dy,
                angle: snapAngle,
                isTurn: false
            };
        }

        const roadCandidates = [];
        const anyDrivable = [];
        for (const d of dirs) {
            const nx = bx + d.dx;
            const ny = by + d.dy;
            if (nx < 1 || nx >= MAP_COLS - 1 || ny < 1 || ny >= MAP_ROWS - 1) continue;
            const nb = this.getNavigationBlock(nx, ny, zBlocks);
            const absDiff = Math.abs(this.normalizeAngleDiff(d.angle, currentAngle));
            const isTurn = absDiff > 0.45;
            const isUturn = absDiff > 2.4;
            const exitsIntersection = this.doesRoadExitIntersection(bx, by, d.dx, d.dy, zBlocks);
            const entry = { ...d, bx: nx, by: ny, absDiff, isTurn, isUturn, exitsIntersection };
            if (nb.groundType === GROUND_TYPE.ROAD) {
                roadCandidates.push(entry);
            } else if (nb.groundType !== GROUND_TYPE.BUILDING && nb.groundType !== GROUND_TYPE.WATER) {
                anyDrivable.push(entry);
            }
        }

        let pool = roadCandidates.length > 0 ? roadCandidates : (anyDrivable.length > 0 ? anyDrivable : dirs.map((d) => ({
            ...d,
            bx: bx + d.dx,
            by: by + d.dy,
            absDiff: Math.abs(this.normalizeAngleDiff(d.angle, currentAngle)),
            isTurn: Math.abs(this.normalizeAngleDiff(d.angle, currentAngle)) > 0.45,
            isUturn: Math.abs(this.normalizeAngleDiff(d.angle, currentAngle)) > 2.4,
            exitsIntersection: true
        })));

        const nonUturn = pool.filter((c) => !c.isUturn);
        if (nonUturn.length > 0) pool = nonUturn;

        // Filter out turns that either:
        // 1) happen after the car already turned once inside this intersection, OR
        // 2) turn into an oncoming lane or dead-end T-intersection stub when going straight is valid
        const validFiltered = pool.filter((c) => {
            if (!c.isTurn) return true;
            if (turnedInIntersection) return false;
            return c.exitsIntersection;
        });
        if (validFiltered.length > 0) {
            pool = validFiltered;
        }

        if (pool.length === 1) {
            return pool[0];
        }

        // Sort by closeness to current heading (straight first, 90-deg turns second)
        pool.sort((a, b) => a.absDiff - b.absDiff);
        // At intersections, continue straight 82% of the time, or take a clean 90-degree right-hand lane turn 18% of the time
        if (normSeed < 0.82) {
            return pool[0];
        }
        return pool[Math.min(pool.length - 1, 1 + Math.floor((normSeed - 0.82) * 5.5 * (pool.length - 1)))];
    }

    // Exact port of AiCharacterController::ChooseWalkWaypoint (AiCharacterController.cpp lines 287-345)
    chooseNextSidewalkBlock(bx, by, currentAngle, zBlocks = 2.0, turnSeed = 0.5, isPanic = false) {
        const normSeed = turnSeed > 1.0 ? (((turnSeed * 0.6180339887) % 1.0) + 1.0) % 1.0 : (((turnSeed % 1.0) + 1.0) % 1.0);
        const curBlk = this.getNavigationBlock(bx, by, zBlocks);
        const onRoadNow = curBlk && curBlk.groundType === GROUND_TYPE.ROAD;

        const cardinals = [
            { key: "U", dx: 0, dy: -1, angle: -Math.PI * 0.5 },
            { key: "D", dx: 0, dy: 1, angle: Math.PI * 0.5 },
            { key: "L", dx: -1, dy: 0, angle: Math.PI },
            { key: "R", dx: 1, dy: 0, angle: 0 }
        ];

        const sidewalkDirs = [];
        const roadDirs = [];

        for (const c of cardinals) {
            const nx = bx + c.dx;
            const ny = by + c.dy;
            if (nx < 1 || nx >= MAP_COLS - 1 || ny < 1 || ny >= MAP_ROWS - 1) continue;
            const nb = this.getNavigationBlock(nx, ny, zBlocks);
            if (!nb || nb.groundType === GROUND_TYPE.BUILDING || nb.groundType === GROUND_TYPE.WATER || nb.groundType === GROUND_TYPE.AIR) {
                continue;
            }
            const absDiff = Math.abs(this.normalizeAngleDiff(c.angle, currentAngle));
            const entry = { ...c, bx: nx, by: ny, absDiff, isUturn: absDiff > 2.4, groundType: nb.groundType };
            if (nb.groundType === GROUND_TYPE.PAWEMENT || nb.groundType === GROUND_TYPE.FIELD) {
                sidewalkDirs.push(entry);
            } else if (nb.groundType === GROUND_TYPE.ROAD) {
                roadDirs.push(entry);
            }
        }

        // 1. If a pedestrian ever ends up on a ROAD block (e.g. ejected driver on a 4-lane road),
        //    scan up to 4 blocks in each cardinal direction to walk shortest-path onto the nearest PAWEMENT/FIELD sidewalk!
        if (onRoadNow) {
            if (sidewalkDirs.length > 0) {
                sidewalkDirs.sort((a, b) => a.absDiff - b.absDiff);
                return sidewalkDirs[0];
            }
            let bestExit = null;
            let bestSteps = 99;
            for (const c of cardinals) {
                for (let step = 1; step <= 4; step++) {
                    const tx = bx + c.dx * step;
                    const ty = by + c.dy * step;
                    if (tx < 1 || tx >= MAP_COLS - 1 || ty < 1 || ty >= MAP_ROWS - 1) break;
                    const tb = this.getNavigationBlock(tx, ty, zBlocks);
                    if (!tb || tb.groundType === GROUND_TYPE.BUILDING || tb.groundType === GROUND_TYPE.WATER || tb.groundType === GROUND_TYPE.AIR) {
                        break;
                    }
                    if (tb.groundType === GROUND_TYPE.PAWEMENT || tb.groundType === GROUND_TYPE.FIELD) {
                        if (step < bestSteps) {
                            bestSteps = step;
                            bestExit = { ...c, bx: bx + c.dx, by: by + c.dy };
                        }
                        break;
                    }
                }
            }
            if (bestExit) {
                return bestExit;
            }
            const forwardRoad = roadDirs.filter((d) => !d.isUturn);
            if (forwardRoad.length > 0) {
                forwardRoad.sort((a, b) => a.absDiff - b.absDiff);
                return forwardRoad[0];
            }
        }

        // 2. AiCharacterController::ChooseWalkWaypoint:
        //    Pedestrians NEVER step from a sidewalk (PAWEMENT/FIELD) onto a ROAD block!
        let pool = sidewalkDirs;
        if (pool.length === 0) {
            pool = roadDirs;
        }
        if (pool.length === 0) {
            const revAngle = this.normalizeAngleDiff(currentAngle + Math.PI, 0);
            const dx = Math.round(Math.cos(revAngle));
            const dy = Math.round(Math.sin(revAngle));
            return {
                dx,
                dy,
                bx: bx + dx,
                by: by + dy,
                angle: revAngle
            };
        }

        const nonUturn = pool.filter((d) => !d.isUturn);
        if (nonUturn.length > 0) pool = nonUturn;

        pool.sort((a, b) => a.absDiff - b.absDiff);
        if (pool.length === 1 || normSeed < 0.84) {
            return pool[0];
        }
        return pool[Math.min(pool.length - 1, 1 + Math.floor((normSeed - 0.84) * 6.25 * (pool.length - 1)))];
    }

    /* ========================================================================
       EXACT 44-SLOPE ELEVATION SOLVER (GameMapHelpers::GetSlopeHeight)
       ======================================================================== */
    getSlopeHeight(slopeType, coordX, coordY) {
        if (!slopeType) return 0.0;
        const cx = Math.max(0.0, Math.min(1.0, coordX));
        const cy = Math.max(0.0, Math.min(1.0, coordY));

        let minElev = 0.0;
        let maxElev = 0.0;
        let lerpFactor = 0.0;

        if (slopeType >= 1 && slopeType <= 2) {
            minElev = 0.5 * (slopeType - 1 + 1);
            maxElev = 0.5 * (slopeType - 1);
            lerpFactor = cy;
        } else if (slopeType >= 3 && slopeType <= 4) {
            minElev = 0.5 * (slopeType - 3);
            maxElev = 0.5 * (slopeType - 3 + 1);
            lerpFactor = cy;
        } else if (slopeType >= 5 && slopeType <= 6) {
            minElev = 0.5 * (slopeType - 5 + 1);
            maxElev = 0.5 * (slopeType - 5);
            lerpFactor = cx;
        } else if (slopeType >= 7 && slopeType <= 8) {
            minElev = 0.5 * (slopeType - 7);
            maxElev = 0.5 * (slopeType - 7 + 1);
            lerpFactor = cx;
        } else if (slopeType >= 9 && slopeType <= 16) {
            minElev = 0.125 * (slopeType - 9 + 1);
            maxElev = 0.125 * (slopeType - 9);
            lerpFactor = cy;
        } else if (slopeType >= 17 && slopeType <= 24) {
            minElev = 0.125 * (slopeType - 17);
            maxElev = 0.125 * (slopeType - 17 + 1);
            lerpFactor = cy;
        } else if (slopeType >= 25 && slopeType <= 32) {
            minElev = 0.125 * (slopeType - 25 + 1);
            maxElev = 0.125 * (slopeType - 25);
            lerpFactor = cx;
        } else if (slopeType >= 33 && slopeType <= 40) {
            minElev = 0.125 * (slopeType - 33);
            maxElev = 0.125 * (slopeType - 33 + 1);
            lerpFactor = cx;
        } else if (slopeType === 41) {
            minElev = 1.0;
            maxElev = 0.0;
            lerpFactor = cy;
        } else if (slopeType === 42) {
            minElev = 0.0;
            maxElev = 1.0;
            lerpFactor = cy;
        } else if (slopeType === 43) {
            minElev = 1.0;
            maxElev = 0.0;
            lerpFactor = cx;
        } else if (slopeType === 44) {
            minElev = 0.0;
            maxElev = 1.0;
            lerpFactor = cx;
        } else {
            return 0.0;
        }

        return minElev + (maxElev - minElev) * lerpFactor;
    }

    /* ========================================================================
       EXACT 3D HEIGHT AT POSITION (GameMapManager::GetHeightAtPosition)
       Returns height in block units (0.0 .. 6.0; multiply by 4.0 for meters)
       ======================================================================== */
    getHeightAtPixel(px, py, currentZBlocks = 4.5, excludeWater = true) {
        if (!this.cmpLoaded) return 2.0;
        const mapX = px / TILE_SIZE;
        const mapY = py / TILE_SIZE;
        const bx = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(mapX)));
        const by = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(mapY)));

        let layer = Math.max(0, Math.min(MAP_LAYERS - 1, Math.floor(currentZBlocks + 0.15)));
        let currentHeight = layer;

        while (currentHeight > 0) {
            const blockData = this.getBlockInfo(bx, by, layer);
            if (blockData.slopeType > 0) {
                const fx = mapX - bx;
                const fy = mapY - by;
                currentHeight = layer + this.getSlopeHeight(blockData.slopeType, fx, fy);
                break;
            }
            if (
                blockData.groundType === GROUND_TYPE.AIR ||
                (blockData.groundType === GROUND_TYPE.WATER && excludeWater)
            ) {
                currentHeight -= 1.0;
                layer -= 1;
                continue;
            }
            break;
        }
        return Math.max(0.0, currentHeight);
    }

    getGroundTypeNameAtPixel(px, py, zBlocks = 2.0) {
        if (!this.cmpLoaded) return "pawement";
        const bx = Math.floor(px / TILE_SIZE);
        const by = Math.floor(py / TILE_SIZE);
        const bz = Math.max(0, Math.min(MAP_LAYERS - 1, Math.floor(zBlocks + 0.1)));
        const blk = this.getBlockInfo(bx, by, bz);
        switch (blk.groundType) {
            case GROUND_TYPE.AIR: return "air";
            case GROUND_TYPE.WATER: return "water";
            case GROUND_TYPE.ROAD: return "road";
            case GROUND_TYPE.PAWEMENT: return "pawement";
            case GROUND_TYPE.FIELD: return "field";
            case GROUND_TYPE.BUILDING: return "building";
            default: return "pawement";
        }
    }

    initWorldFeatures() {
        // --------------------------------------------------------------------
        // 6 PAY 'N' SPRAY SHOPS ("VICE CUSTOMS") ON STATE OF LEONIDA ROADS
        // --------------------------------------------------------------------
        this.payNSprays = [
            { id: "pns_oceandrive", name: "VICE CUSTOMS (COLLINS AVE / SOUTH BEACH)", x: 203.0 * TILE_SIZE, y: 146.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_northbeach", name: "VICE CUSTOMS (NORTH BEACH / 919)", x: 203.0 * TILE_SIZE, y: 48.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_downtown", name: "VICE CUSTOMS (BISCAYNE BLVD)", x: 141.0 * TILE_SIZE, y: 112.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_wynwood", name: "WYNWOOD CUSTOMS (MAMBAS STADIUM)", x: 115.0 * TILE_SIZE, y: 92.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_gellhorn", name: "GELLHORN SPEEDWAY CUSTOMS", x: 38.0 * TILE_SIZE, y: 118.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_vcia", name: "VCIA AIRPORT CUSTOMS", x: 89.0 * TILE_SIZE, y: 148.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE }
        ];

        // --------------------------------------------------------------------
        // 4 BOMB SHOPS
        // --------------------------------------------------------------------
        this.bombShops = [
            { id: "bomb_vcia", name: "8-BALL'S ORDNANCE (VCIA CARGO)", x: 74.0 * TILE_SIZE, y: 152.0 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "bomb_littlehaiti", name: "AMBROSIA BOMB SHOP (LAKE LEONIDA)", x: 94.0 * TILE_SIZE, y: 80.0 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "bomb_sera", name: "SERA ROCKET ORDNANCE (CAPE LEONIDA)", x: 215.0 * TILE_SIZE, y: 20.0 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "bomb_gellhorn", name: "PAWN & GUN ORDNANCE (PORT GELLHORN)", x: 38.0 * TILE_SIZE, y: 140.0 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE }
        ];

        // --------------------------------------------------------------------
        // DOCKYARD MAGNETIC CRANES & CAR CRUSHERS
        // --------------------------------------------------------------------
        this.cranes = [
            {
                id: "crane_viceport",
                name: "VICE PORT CONTAINER CRANE",
                x: 171.5 * TILE_SIZE,
                y: 164.5 * TILE_SIZE,
                w: 2.5 * TILE_SIZE,
                h: 2.4 * TILE_SIZE,
                armAngle: 0,
                crushingVehicle: null,
                crushProgress: 0
            },
            {
                id: "crane_docks",
                name: "PORT GELLHORN MAGNETIC CRANE",
                x: 19.5 * TILE_SIZE,
                y: 132.5 * TILE_SIZE,
                w: 2.6 * TILE_SIZE,
                h: 2.4 * TILE_SIZE,
                armAngle: 0,
                crushingVehicle: null,
                crushProgress: 0
            }
        ];

        // --------------------------------------------------------------------
        // 8 GTA 1 "KILL FRENZY!" RAMPAGE TOKENS ACROSS ALL REGIONS
        // --------------------------------------------------------------------
        this.killFrenzies = [
            {
                id: "kf_oceandrive",
                title: "OCEAN DRIVE FLAME FRENZY!",
                x: 218.5 * TILE_SIZE,
                y: 145.5 * TILE_SIZE,
                weapon: "FLAMETHROWER",
                targetKills: 5,
                timeLimit: 35,
                reward: 30000,
                cooldown: 0
            },
            {
                id: "kf_starisland",
                title: "STAR ISLAND ROCKET RAMPAGE!",
                x: 173.0 * TILE_SIZE,
                y: 103.5 * TILE_SIZE,
                weapon: "ROCKET",
                targetKills: 6,
                timeLimit: 40,
                reward: 50000,
                cooldown: 0
            },
            {
                id: "kf_stadium",
                title: "MAMBAS STADIUM BOWL RAMPAGE!",
                x: 116.0 * TILE_SIZE,
                y: 102.0 * TILE_SIZE,
                weapon: "SHOTGUN",
                targetKills: 6,
                timeLimit: 40,
                reward: 45000,
                cooldown: 0
            },
            {
                id: "kf_sera",
                title: "SERA SPACEPORT LAUNCH PAD RAMPAGE!",
                x: 228.5 * TILE_SIZE,
                y: 20.5 * TILE_SIZE,
                weapon: "ROCKET",
                targetKills: 5,
                timeLimit: 40,
                reward: 60000,
                cooldown: 0
            },
            {
                id: "kf_prison",
                title: "LEONIDA PENITENTIARY RIOT FRENZY!",
                x: 31.5 * TILE_SIZE,
                y: 67.5 * TILE_SIZE,
                weapon: "SHOTGUN",
                targetKills: 6,
                timeLimit: 40,
                reward: 50000,
                cooldown: 0
            },
            {
                id: "kf_gellhorn",
                title: "PORT GELLHORN SPEEDWAY UZI RAMPAGE!",
                x: 47.0 * TILE_SIZE,
                y: 106.0 * TILE_SIZE,
                weapon: "UZI",
                targetKills: 6,
                timeLimit: 35,
                reward: 40000,
                cooldown: 0
            },
            {
                id: "kf_vcia",
                title: "VCIA TARMAC JETLINER RAMPAGE!",
                x: 62.5 * TILE_SIZE,
                y: 156.0 * TILE_SIZE,
                weapon: "ROCKET",
                targetKills: 5,
                timeLimit: 40,
                reward: 55000,
                cooldown: 0
            },
            {
                id: "kf_mudpark",
                title: "THRILLBILLY MUD PARK FLAME FRENZY!",
                x: 58.0 * TILE_SIZE,
                y: 216.0 * TILE_SIZE,
                weapon: "FLAMETHROWER",
                targetKills: 5,
                timeLimit: 40,
                reward: 45000,
                cooldown: 0
            }
        ];

        this.landmarks = this.buildGta6Landmarks();

        this.initPickups();
        this.initStreetProps();
    }

    initPickups() {
        this.pickups = [
            // 1. Pickups right around Hotel Dixon & Ocean Drive Spawn (213.5, 146.0)
            { x: 213.5 * TILE_SIZE, y: 143.5 * TILE_SIZE, type: "JAIL_FREE", label: "GET OUT OF JAIL FREE CARD", respawnTimer: 0 },
            { x: 213.5 * TILE_SIZE, y: 150.5 * TILE_SIZE, type: "WEAPON", subtype: "UZI", ammo: 120, label: "MICRO-UZI", respawnTimer: 0 },
            { x: 218.5 * TILE_SIZE, y: 149.5 * TILE_SIZE, type: "ARMOR", label: "OCEAN DRIVE KEVLAR VEST", respawnTimer: 0 },
            { x: 218.5 * TILE_SIZE, y: 154.5 * TILE_SIZE, type: "HEALTH", label: "MEDKIT +50", respawnTimer: 0 },
            { x: 213.5 * TILE_SIZE, y: 155.0 * TILE_SIZE, type: "BRIBE", label: "COP BRIBE (-2 HEADS)", respawnTimer: 0 },
            { x: 218.5 * TILE_SIZE, y: 142.5 * TILE_SIZE, type: "MULTIPLIER", label: "MULTIPLIER +1", respawnTimer: 0 },

            // 2. Pickups on S-Curving Vice Beach, Lummus Park & South Wooden Pier (225.5, 154.0)
            { x: 224.5 * TILE_SIZE, y: 148.5 * TILE_SIZE, type: "ARMOR", label: "VICE BEACH KEVLAR", respawnTimer: 0 },
            { x: 226.5 * TILE_SIZE, y: 158.0 * TILE_SIZE, type: "CASH", amount: 5000, label: "BEACH STASH $5,000", respawnTimer: 0 },
            { x: 245.5 * TILE_SIZE, y: 154.0 * TILE_SIZE, type: "WEAPON", subtype: "ROCKET", ammo: 15, label: "OCEAN PIER ROCKET LAUNCHER", respawnTimer: 0 },

            // 3. Española Way, Flamingo Park (210, 118), Club Nine1Nine (213.5, 48.0) & SERA Space Center (224.5, 20.5)
            { x: 210.5 * TILE_SIZE, y: 118.5 * TILE_SIZE, type: "EXTRA_LIFE", label: "FLAMINGO PARK EXTRA LIFE (+1)", respawnTimer: 0 },
            { x: 213.5 * TILE_SIZE, y: 46.5 * TILE_SIZE, type: "WEAPON", subtype: "SHOTGUN", ammo: 40, label: "CLUB 919 SHOTGUN", respawnTimer: 0 },
            { x: 232.0 * TILE_SIZE, y: 18.5 * TILE_SIZE, type: "WEAPON", subtype: "ROCKET", ammo: 20, label: "LAUNCH PAD 39A ROCKET LAUNCHER", respawnTimer: 0 },
            { x: 222.5 * TILE_SIZE, y: 20.5 * TILE_SIZE, type: "ARMOR", label: "SERA SPACEPORT KEVLAR", respawnTimer: 0 },

            // 4. Star Island (173, 106.5), Vice Port Cruise Ships (171.5, 164.5), Mambas Stadium (116, 105) & Golf Club (141.5, 52)
            { x: 171.5 * TILE_SIZE, y: 105.0 * TILE_SIZE, type: "EXTRA_LIFE", label: "STAR ISLAND EXTRA LIFE (+1)", respawnTimer: 0 },
            { x: 174.5 * TILE_SIZE, y: 107.5 * TILE_SIZE, type: "CASH", amount: 10000, label: "STAR ISLAND MANSION STASH $10,000", respawnTimer: 0 },
            { x: 171.5 * TILE_SIZE, y: 162.5 * TILE_SIZE, type: "CASH", amount: 10000, label: "CRUISE LINER VAULT $10,000", respawnTimer: 0 },
            { x: 116.0 * TILE_SIZE, y: 105.0 * TILE_SIZE, type: "MULTIPLIER", label: "50-YARD LINE MULTIPLIER +1", respawnTimer: 0 },
            { x: 141.5 * TILE_SIZE, y: 52.0 * TILE_SIZE, type: "CASH", amount: 7500, label: "COUNTRY CLUB TROPHY $7,500", respawnTimer: 0 },

            // 5. Wynwood & Jack of Hearts (115.5, 82.5), Lake Leonida Gator Island (77.5, 75), Mount Kalaga (84.5, 25.5)
            { x: 114.5 * TILE_SIZE, y: 80.5 * TILE_SIZE, type: "WEAPON", subtype: "UZI", ammo: 150, label: "JACK OF HEARTS MICRO-UZI", respawnTimer: 0 },
            { x: 77.5 * TILE_SIZE, y: 75.0 * TILE_SIZE, type: "ARMOR", label: "GATOR ISLAND KEVLAR", respawnTimer: 0 },
            { x: 84.5 * TILE_SIZE, y: 24.0 * TILE_SIZE, type: "WEAPON", subtype: "SHOTGUN", ammo: 50, label: "MOUNT KALAGA RANGER SHOTGUN", respawnTimer: 0 },

            // 6. Leonida Penitentiary (31.5, 68), Port Gellhorn Speedway (47, 113.5), VCIA Airport (66.5, 152) & Keys (135, 246.5)
            { x: 31.5 * TILE_SIZE, y: 69.5 * TILE_SIZE, type: "JAIL_FREE", label: "PENITENTIARY WARDEN KEYCARD", respawnTimer: 0 },
            { x: 47.0 * TILE_SIZE, y: 112.5 * TILE_SIZE, type: "CASH", amount: 10000, label: "SPEEDWAY CHAMPION PURSE $10,000", respawnTimer: 0 },
            { x: 64.5 * TILE_SIZE, y: 152.0 * TILE_SIZE, type: "WEAPON", subtype: "ROCKET", ammo: 15, label: "VCIA JETLINER ROCKET LAUNCHER", respawnTimer: 0 },
            { x: 58.0 * TILE_SIZE, y: 213.0 * TILE_SIZE, type: "WEAPON", subtype: "FLAMETHROWER", ammo: 150, label: "THRILLBILLY MUD PARK FLAMETHROWER", respawnTimer: 0 },
            { x: 135.0 * TILE_SIZE, y: 246.5 * TILE_SIZE, type: "MULTIPLIER", label: "BAHIA HONDA BROKEN BRIDGE JUMP +1", respawnTimer: 0 }
        ];
    }

    initStreetProps() {
        this.crates = [
            // Near Hotel Dixon & Ocean Drive Spawn (213.5, 146.0)
            { x: 213.45 * TILE_SIZE, y: 145.2 * TILE_SIZE, z: 2.0, w: 28, h: 28, smashed: false, respawnTimer: 0, dropType: "MULTIPLIER", dropLabel: "MULTIPLIER +1" },
            { x: 218.55 * TILE_SIZE, y: 147.5 * TILE_SIZE, z: 2.0, w: 28, h: 28, smashed: false, respawnTimer: 0, dropType: "WEAPON", dropSubtype: "SHOTGUN", dropAmmo: 35, dropLabel: "PUMP SHOTGUN" },
            { x: 218.55 * TILE_SIZE, y: 151.2 * TILE_SIZE, z: 2.0, w: 30, h: 34, smashed: false, respawnTimer: 0, dropType: "JAIL_FREE", dropLabel: "GET OUT OF JAIL FREE CARD" }
        ];

        this.infoSigns = [
            { x: 213.5 * TILE_SIZE, y: 148.5 * TILE_SIZE, z: 2.0, text: "STATE OF LEONIDA (12 BESPOKE REGIONS): VICE BEACH, MAMBAS STADIUM, SERA SPACEPORT, PENITENTIARY, SPEEDWAY & KEYS! PRESS [M] OR USE [C] TOUR!" },
            { x: 218.5 * TILE_SIZE, y: 152.5 * TILE_SIZE, z: 2.0, text: "LUMMUS PARK & VICE BEACH: WIPE OUT ALL 7 MONKS FOR A GOURANGA! BONUS, OR CLICK ANY OF THE 16 LANDMARKS IN THE TOP-LEFT [C] WINDOW!" }
        ];

        // Atmospheric street fires in Port Gellhorn & Thrillbilly Mud Park
        this.streetFires = [
            { x: 35.8 * TILE_SIZE, y: 142.2 * TILE_SIZE, z: 2.05, size: 0.85 },
            { x: 54.0 * TILE_SIZE, y: 216.0 * TILE_SIZE, z: 2.05, size: 0.85 }
        ];
    }

    getTileAtPixel(px, py) {
        const c = Math.floor(px / TILE_SIZE);
        const r = Math.floor(py / TILE_SIZE);
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return TILE.WATER_DEEP;
        const idx = r * this.cols + c;
        const gt = this.surfaceGround[idx];
        if (gt === GROUND_TYPE.WATER) return TILE.WATER_SHALLOW;
        if (gt === GROUND_TYPE.ROAD) return TILE.ROAD_CROSS;
        if (gt === GROUND_TYPE.BUILDING) return TILE.BUILDING;
        if (this.coastalSandMask[idx]) return TILE.SAND;
        if (gt === GROUND_TYPE.FIELD) return TILE.GRASS;
        return TILE.SIDEWALK;
    }

    isWaterAtPixel(px, py) {
        const c = Math.floor(px / TILE_SIZE);
        const r = Math.floor(py / TILE_SIZE);
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
        return this.surfaceGround[r * this.cols + c] === GROUND_TYPE.WATER;
    }

    isRoadAtPixel(px, py) {
        const c = Math.floor(px / TILE_SIZE);
        const r = Math.floor(py / TILE_SIZE);
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
        return this.surfaceGround[r * this.cols + c] === GROUND_TYPE.ROAD;
    }

    /* ========================================================================
       EXACT WATER LEVEL AT POSITION (GameMapManager::GetWaterLevelAtPosition2)
       Returns water height in block units (0.0 .. 5.0)
       ======================================================================== */
    getWaterLevelAtPosition2(px, py) {
        const bx = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(px / TILE_SIZE)));
        const by = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(py / TILE_SIZE)));
        for (let i = MAP_LAYERS_COUNT; i > 0; --i) {
            const blockData = this.getBlockInfo(bx, by, i - 1);
            if (blockData.groundType === GROUND_TYPE.WATER) {
                return i - 1.0;
            }
        }
        return 0.0;
    }

    /* ========================================================================
       EXACT 2D DDA SEGMENT RAYCASTER (GameMapManager::TraceSegment2D)
       Traces a 2D line segment in pixel coordinates at block height `heightZ`
       against solid eGroundType_Building blocks (up to 16 DDA steps).
       ======================================================================== */
    traceSegment2D(originPxX, originPxY, destPxX, destPxY, heightZ = 2.0) {
        if (!this.cmpLoaded) {
            return { hit: false, x: destPxX, y: destPxY };
        }
        const originX = originPxX / TILE_SIZE;
        const originY = originPxY / TILE_SIZE;
        const destX = destPxX / TILE_SIZE;
        const destY = destPxY / TILE_SIZE;

        const dx = destX - originX;
        const dy = destY - originY;
        const segLen = Math.hypot(dx, dy);
        if (segLen < 1e-5) {
            return { hit: false, x: destPxX, y: destPxY };
        }

        const dirX = dx / segLen;
        const dirY = dy / segLen;
        const mapZ = Math.max(1, Math.min(MAP_LAYERS - 1, Math.floor(heightZ + 0.25)));

        let currX = Math.floor(originX);
        let currY = Math.floor(originY);
        const endX = Math.floor(destX);
        const endY = Math.floor(destY);

        const deltaDistX = Math.abs(dirX) > 1e-6 ? Math.abs(1.0 / dirX) : 1e30;
        const deltaDistY = Math.abs(dirY) > 1e-6 ? Math.abs(1.0 / dirY) : 1e30;

        let stepX, sideDistX;
        if (dirX < 0.0) {
            stepX = -1;
            sideDistX = (originX - currX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (currX + 1.0 - originX) * deltaDistX;
        }

        let stepY, sideDistY;
        if (dirY < 0.0) {
            stepY = -1;
            sideDistY = (originY - currY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (currY + 1.0 - originY) * deltaDistY;
        }

        // Check starting cell if already inside a solid building block
        const startBlk = this.getBlockInfo(currX, currY, mapZ);
        if (startBlk.groundType === GROUND_TYPE.BUILDING && startBlk.slopeType === 0) {
            return { hit: true, x: originPxX, y: originPxY, bx: currX, by: currY };
        }
        if (currX === endX && currY === endY) {
            return { hit: false, x: destPxX, y: destPxY };
        }

        const MAX_STEPS = 16;
        let side = 0;
        for (let istep = 0; istep < MAX_STEPS; ++istep) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                currX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                currY += stepY;
                side = 1;
            }

            if (currX < 0 || currX >= MAP_COLS || currY < 0 || currY >= MAP_ROWS) {
                return { hit: true, x: destPxX, y: destPxY, bx: currX, by: currY };
            }

            let perpWallDist;
            if (side === 0) {
                perpWallDist = (currX - originX + (1 - stepX) * 0.5) / dirX;
            } else {
                perpWallDist = (currY - originY + (1 - stepY) * 0.5) / dirY;
            }

            if (perpWallDist > segLen) {
                return { hit: false, x: destPxX, y: destPxY };
            }

            const blockData = this.getBlockInfo(currX, currY, mapZ);
            if (blockData.groundType === GROUND_TYPE.BUILDING && blockData.slopeType === 0) {
                return {
                    hit: true,
                    x: (originX + dirX * perpWallDist) * TILE_SIZE,
                    y: (originY + dirY * perpWallDist) * TILE_SIZE,
                    bx: currX,
                    by: currY
                };
            }

            if (currX === endX && currY === endY) {
                break;
            }
        }
        return { hit: false, x: destPxX, y: destPxY };
    }

    /* ========================================================================
       EXACT ON-SCREEN MAP AREA FRUSTUM (RenderView::mOnScreenMapArea)
       Computes visible map block rectangle for camera frustum (fovy = 55 deg)
       Used by TrafficManager (GenerateTrafficCars / GenerateTrafficPeds)
       ======================================================================== */
    getOnScreenMapArea(camX, camY, camZBlocks = 2.0, canvasW = 1280, canvasH = 720, extraHeightBlocks = 5.0) {
        const aspect = Math.max(0.5, canvasW / Math.max(1, canvasH));
        const tanHalfFovy = Math.tan((55.0 * Math.PI) / 360.0); // ~0.520567
        const distBlocks = Math.max(2.2, extraHeightBlocks);
        const halfH = distBlocks * tanHalfFovy + 1.0;
        const halfW = halfH * aspect + 1.0;

        const cx = camX / TILE_SIZE;
        const cy = camY / TILE_SIZE;
        const minX = Math.max(1, Math.floor(cx - halfW));
        const maxX = Math.min(MAP_COLS - 2, Math.ceil(cx + halfW));
        const minY = Math.max(1, Math.floor(cy - halfH));
        const maxY = Math.min(MAP_ROWS - 2, Math.ceil(cy + halfH));

        return {
            x: minX,
            y: minY,
            w: Math.max(1, maxX - minX),
            h: Math.max(1, maxY - minY),
            minX,
            minY,
            maxX,
            maxY
        };
    }

    getDistrictName(px, py) {
        const c = px / TILE_SIZE;
        const r = py / TILE_SIZE;
        if (this.districts && this.districts.length > 0) {
            for (const d of this.districts) {
                if (c >= d.x && c <= d.x + d.w && r >= d.y && r <= d.y + d.h) {
                    if (this.mapStyle === "NYC") {
                        return (d.orig || d.name).toUpperCase();
                    }
                    return d.name.toUpperCase();
                }
            }
        }
        return this.mapStyle === "NYC" ? "LIBERTY CITY" : "VICE BEACH - LEONIDA";
    }

    /* ========================================================================
       3D VOXEL BUILDING & SEAWALL / BRIDGE GUARDRAIL COLLISION SOLVER
       Checks solid building blocks AND blocks non-amphibious entities from
       crossing from roads, bridges, or sidewalks into WATER tiles.
       ======================================================================== */
    resolveCircleBuildingCollision(x, y, radius, currentZBlocks = null, isAmphibious = false) {
        let nx = x;
        let ny = y;
        let hit = false;

        if (this.cmpLoaded) {
            const cx = Math.floor(nx / TILE_SIZE);
            const cy = Math.floor(ny / TILE_SIZE);
            const baseZ = currentZBlocks !== null
                ? Math.max(1, Math.min(MAP_LAYERS - 1, Math.floor(currentZBlocks + 0.25)))
                : (this.surfaceLayer[Math.max(0, Math.min(255, cy)) * MAP_COLS + Math.max(0, Math.min(255, cx))] || 2);

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const tx = cx + dx;
                    const ty = cy + dy;
                    if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) continue;

                    const blk = this.getBlockInfo(tx, ty, baseZ);
                    const isSolidBuilding = (blk.groundType === GROUND_TYPE.BUILDING && blk.slopeType === 0);
                    const isWaterBarrier = !isAmphibious && (this.surfaceGround[ty * MAP_COLS + tx] === GROUND_TYPE.WATER);
                    // Solid obstacle if 3D building OR water barrier (guardrail/seawall/shoreline) for non-amphibious entities
                    if (isSolidBuilding || isWaterBarrier) {
                        const bx = tx * TILE_SIZE;
                        const by = ty * TILE_SIZE;
                        const closestX = Math.max(bx, Math.min(nx, bx + TILE_SIZE));
                        const closestY = Math.max(by, Math.min(ny, by + TILE_SIZE));
                        const ddx = nx - closestX;
                        const ddy = ny - closestY;
                        const distSq = ddx * ddx + ddy * ddy;

                        if (distSq < radius * radius) {
                            hit = true;
                            const dist = Math.sqrt(distSq) || 0.001;
                            const overlap = radius - dist;
                            if (dist > 0.01) {
                                nx += (ddx / dist) * overlap;
                                ny += (ddy / dist) * overlap;
                            } else {
                                nx += radius;
                            }
                        }
                    }
                }
            }
        }

        nx = Math.max(TILE_SIZE * 1.5, Math.min(this.width - TILE_SIZE * 1.5, nx));
        ny = Math.max(TILE_SIZE * 1.5, Math.min(this.height - TILE_SIZE * 1.5, ny));

        return { x: nx, y: ny, hit };
    }
}

window.Convert = Convert;
window.TILE = TILE;
window.GROUND_TYPE = GROUND_TYPE;
window.BLOCK_FACE = BLOCK_FACE;
window.TRAFFIC_HINT = TRAFFIC_HINT;
window.TILE_SIZE = TILE_SIZE;
window.PIXELS_PER_MAP_UNIT = PIXELS_PER_MAP_UNIT;
window.METERS_PER_MAP_UNIT = METERS_PER_MAP_UNIT;
window.MAP_COLS = MAP_COLS;
window.MAP_ROWS = MAP_ROWS;
window.MAP_LAYERS = MAP_LAYERS;
window.LeonidaMap = LeonidaMap;
