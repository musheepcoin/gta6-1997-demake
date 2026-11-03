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
const MAP_DIMENSIONS = 512;
const MAP_COLS = MAP_DIMENSIONS;
const MAP_ROWS = MAP_DIMENSIONS;
const MAP_LAYERS_COUNT = 6;
const MAP_LAYERS = MAP_LAYERS_COUNT;
const WORLD_W = MAP_COLS * TILE_SIZE;
const WORLD_H = MAP_ROWS * TILE_SIZE;

// Canonical 256 -> 512 coordinate lookup tables (preserves exact block-internal offsets across the 4x expanded 512x512 world)
const MAP_X_256 = [0, 1, 2, 3, 4, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 309, 310, 311, 312, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 453, 454, 455, 456, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 508, 509, 510, 511];
const MAP_Y_256 = [0, 1, 2, 3, 4, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 507, 508, 509, 510, 511];
const mx256 = (x) => {
    const ix = Math.max(0, Math.min(255, Math.floor(x)));
    return MAP_X_256[ix] + (x - Math.floor(x));
};
const my256 = (y) => {
    const iy = Math.max(0, Math.min(255, Math.floor(y)));
    return MAP_Y_256[iy] + (y - Math.floor(y));
};

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
        this.floraGrid = new Map();
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

        const is512Map = arrayBuffer.byteLength >= 600000;
        const binDim = is512Map ? 512 : 256;
        const numBaseTiles = binDim * binDim;

        let pos = 8;
        const baseTiles = new Uint32Array(numBaseTiles);
        for (let i = 0; i < numBaseTiles; i++) {
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
            const rawLid = dv.getUint8(pos + 7);
            const flid = (rawLid >= 99 && rawLid <= 101) ? 98 : rawLid;
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

        // Decompress 512x512 columns (with 256->512 fallback if loading a 256x256 .CMP)
        this.voxelGrid.fill(0);
        for (let tiley = 0; tiley < MAP_ROWS; tiley++) {
            const srcY = is512Map ? tiley : Math.min(255, tiley >> 1);
            for (let tilex = 0; tilex < MAP_COLS; tilex++) {
                const srcX = is512Map ? tilex : Math.min(255, tilex >> 1);
                const columnElement = baseTiles[srcY * binDim + srcX] >> 1;
                const columnHeight = MAP_LAYERS - colData[columnElement];
                for (let tilez = 0; tilez < columnHeight && tilez < MAP_LAYERS; tilez++) {
                    const srcBlock = colData[columnElement + columnHeight - tilez];
                    this.voxelGrid[(tilez * MAP_ROWS + tiley) * MAP_COLS + tilex] = srcBlock;
                }
            }
        }

        // Clean up VCIA North Perimeter Highway (y = 295..298) where internal airport runway strips (x = 76..77, 110..111, 148..149)
        // touched the highway from the south without any city street to the north: restore continuous East/West highway lanes (from x = 74)
        // so city traffic cruises smoothly past the airport fence and never treats airport runway gates as public street intersections!
        for (const falseJuncX of [76, 77, 110, 111, 148, 149]) {
            for (let y = 295; y <= 298; y++) {
                for (let z = 0; z < MAP_LAYERS; z++) {
                    this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + falseJuncX] =
                        this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + 74];
                }
            }
        }

        // Convert generic 1997 brick office blocks on Star Island & Venetian Isles into lush emerald waterfront estate lawns:
        // - East Star Island (x=347..355, y=164..170 & y=178..185)
        // - Southwest Star Island (x=335..342, y=178..183)
        // - Venetian Isles North (x=398..403, y=125..129)
        // - Venetian Isles South (x=389..403, y=205..209)
        const islandLawnBoxes = [
            [347, 355, 164, 170],
            [347, 355, 178, 185],
            [335, 342, 178, 183],
            [398, 403, 125, 129],
            [389, 403, 205, 209]
        ];
        for (const [x0, x1, y0, y1] of islandLawnBoxes) {
            for (let x = x0; x <= x1; x++) {
                for (let y = y0; y <= y1; y++) {
                    for (let z = 0; z < MAP_LAYERS; z++) {
                        this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + x] =
                            this.voxelGrid[(z * MAP_ROWS + 165) * MAP_COLS + 339];
                    }
                }
            }
        }

        // Pave SERA Space Center Launch Complex 39A security apron (x=458..471, y=29..40),
        // Cape Leonida Lighthouse headland plaza (x=457..466, y=132..136), and Key West Lighthouse plaza (x=197..201, y=475..478)
        // with native GTA 1 stone/concrete pavers (lid 8), and Vice Beach Pier boardwalk (x=455..467, y=193..196) with wooden planks (lid 77)!
        const stonePaverBoxes = [
            [458, 471, 29, 40],
            [457, 466, 132, 136],
            [197, 201, 475, 478]
        ];
        for (const [x0, x1, y0, y1] of stonePaverBoxes) {
            for (let x = x0; x <= x1; x++) {
                for (let y = y0; y <= y1; y++) {
                    for (let z = 0; z < MAP_LAYERS; z++) {
                        this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + x] =
                            this.voxelGrid[(z * MAP_ROWS + 41) * MAP_COLS + 462];
                    }
                }
            }
        }
        for (let x = 455; x <= 467; x++) {
            for (let y = 193; y <= 196; y++) {
                for (let z = 0; z < MAP_LAYERS; z++) {
                    this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + x] =
                        this.voxelGrid[(z * MAP_ROWS + 321) * MAP_COLS + 358];
                }
            }
        }

        // Authentic Miami South Beach Lummus Park & Vice Beach Shoreline Layout Pass:
        // In the 512x512 binary map, columns 448..451 were 4 wide columns of uniform pink concrete (lid 9) with no grass park at all!
        // Transform the East side of Ocean Drive (y=42..362, preserving all cross-roads, lighthouse plaza & pier boardwalk) into:
        // - x=448: East Curbside Coral Promenade (lid 9) with Royal Palms & parked classic cars
        // - x=449..450: Lush Lummus Park Tropical Grass Lawns (lid 10 from (339,165), rounded organic corners via shader animType 30.0) with coral cross-paths every 14 rows
        // - x=451: Oceanfront Rollerblading Boardwalk Promenade (lid 9) bordering the golden beach sand (x=452+)
        for (let y = 42; y <= 362; y++) {
            if ((y >= 131 && y <= 137) || (y >= 192 && y <= 197)) continue;
            const blk448 = this.blocksData[this.voxelGrid[(1 * MAP_ROWS + y) * MAP_COLS + 448]];
            const blk449 = this.blocksData[this.voxelGrid[(1 * MAP_ROWS + y) * MAP_COLS + 449]];
            const blk450 = this.blocksData[this.voxelGrid[(1 * MAP_ROWS + y) * MAP_COLS + 450]];
            if (!blk448 || !blk449 || !blk450) continue;
            // Only convert sidewalk/pavement rows (never overwrite road junctions)
            if ((blk448.lid === 9 || blk448.lid === 8 || blk448.lid === 69) && (blk449.lid === 9 || blk449.lid === 8 || blk449.lid === 10 || blk449.lid === 69)) {
                const isCrossWalk = ((y % 14) < 2);
                if (!isCrossWalk) {
                    for (let z = 0; z < MAP_LAYERS; z++) {
                        const grassVoxel = this.voxelGrid[(z * MAP_ROWS + 165) * MAP_COLS + 339];
                        this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + 449] = grassVoxel;
                        this.voxelGrid[(z * MAP_ROWS + y) * MAP_COLS + 450] = grassVoxel;
                    }
                }
            }
        }

        // Seamless GTA 2 Road Continuity Pass: record original intersection stop-line blocks (lid 24)
        // in stopLineMask, then replace disruptive barcode crosswalk blocks with their adjacent continuous lane block (lid 1, 80, or 74)
        // so curbs, yellow edge lines & lane dividers run unbroken to every junction while Traffic AI still knows every stop line!
        this.stopLineMask = new Uint8Array(MAP_ROWS * MAP_COLS);
        for (let tilez = 0; tilez < MAP_LAYERS; tilez++) {
            const zOff = tilez * MAP_ROWS;
            for (let tiley = 2; tiley < MAP_ROWS - 2; tiley++) {
                for (let tilex = 2; tilex < MAP_COLS - 2; tilex++) {
                    const gIdx = (zOff + tiley) * MAP_COLS + tilex;
                    const blkIdx = this.voxelGrid[gIdx];
                    const blk = this.blocksData[blkIdx];
                    if (!blk || blk.lid !== 24) continue;
                    if (tilez === 1) {
                        this.stopLineMask[tiley * MAP_COLS + tilex] = 1;
                    }
                    const candidates = (blk.lidRotation === 1 || blk.lidRotation === 3)
                        ? [[tilex - 1, tiley], [tilex + 1, tiley], [tilex - 2, tiley], [tilex + 2, tiley]]
                        : [[tilex, tiley - 1], [tilex, tiley + 1], [tilex, tiley - 2], [tilex, tiley + 2]];
                    for (const [nx, ny] of candidates) {
                        const nIdx = this.voxelGrid[(zOff + ny) * MAP_COLS + nx];
                        const nBlk = this.blocksData[nIdx];
                        if (nBlk && (nBlk.lid === 1 || nBlk.lid === 80 || nBlk.lid === 74)) {
                            this.voxelGrid[gIdx] = nIdx;
                            break;
                        }
                    }
                }
            }
        }

        // Miami Art Deco Rooftop Pool & Glass Skylight Atrium Pass:
        // Enriches penthouse & hotel roof tiles (lid 46, 48, 51) with centerpiece Turquoise Rooftop Pools (lid 35)
        // and 3ds Max Glass Skylight Atriums (lid 31) while preserving 100% of their 3D side walls (w, e, n, s)!
        const roofVariantCache = new Map();
        const getRoofVariantIdx = (origIdx, newLid, newRemap = 0) => {
            const key = `${origIdx}_${newLid}_${newRemap}`;
            if (roofVariantCache.has(key)) return roofVariantCache.get(key);
            const src = this.blocksData[origIdx];
            const clone = {
                ...src,
                lid: newLid,
                remap: newRemap,
                faces: [src.w, src.e, src.n, src.s, newLid]
            };
            const nextIdx = this.blocksData.length;
            this.blocksData.push(clone);
            roofVariantCache.set(key, nextIdx);
            return nextIdx;
        };

        const dixonY0 = MAP_Y_256[144];
        const dixonX0 = MAP_X_256[210];
        const oceanPentMinX = MAP_X_256[198];
        const oceanPentMaxX = MAP_X_256[212];

        this.rooftopParties = [];
        for (let tilez = 2; tilez < MAP_LAYERS; tilez++) {
            const zOff = tilez * MAP_ROWS;
            for (let tiley = 3; tiley < MAP_ROWS - 3; tiley++) {
                for (let tilex = 3; tilex < MAP_COLS - 3; tilex++) {
                    const gIdx = (zOff + tiley) * MAP_COLS + tilex;
                    const blkIdx = this.voxelGrid[gIdx];
                    const blk = this.blocksData[blkIdx];
                    if (!blk || blk.groundType !== GROUND_TYPE.BUILDING || (blk.lid !== 46 && blk.lid !== 48 && blk.lid !== 51)) {
                        continue;
                    }
                    // Ensure this is the top roof surface of this column
                    if (tilez + 1 < MAP_LAYERS) {
                        const aboveBlk = this.blocksData[this.voxelGrid[((tilez + 1) * MAP_ROWS + tiley) * MAP_COLS + tilex]];
                        if (aboveBlk && aboveBlk.groundType !== GROUND_TYPE.AIR) continue;
                    }
                    const nBlk = this.blocksData[this.voxelGrid[(zOff + tiley - 1) * MAP_COLS + tilex]];
                    const sBlk = this.blocksData[this.voxelGrid[(zOff + tiley + 1) * MAP_COLS + tilex]];
                    const wBlk = this.blocksData[this.voxelGrid[(zOff + tiley) * MAP_COLS + (tilex - 1)]];
                    const eBlk = this.blocksData[this.voxelGrid[(zOff + tiley) * MAP_COLS + (tilex + 1)]];
                    const hasNSRoof = nBlk && nBlk.lid > 0 && sBlk && sBlk.lid > 0;
                    const hasEWRoof = wBlk && wBlk.lid > 0 && eBlk && eBlk.lid > 0;
                    if (!hasNSRoof || !hasEWRoof) continue;

                    const isHotelDixonCenter = (tiley === dixonY0 && tilex === dixonX0);
                    const isOceanDrivePenthouse = (tilex >= oceanPentMinX && tilex <= oceanPentMaxX && tilez >= 4);
                    // Enforce at least 18 tiles minimum spacing between any two rooftop pools so a building never has multiple pools!
                    const tooCloseToExistingPool = this.rooftopParties.some(
                        (rp) => Math.hypot(rp.x / TILE_SIZE - (tilex + 0.5), rp.y / TILE_SIZE - (tiley + 0.5)) < 18.0
                    );

                    if (isHotelDixonCenter && !tooCloseToExistingPool) {
                        this.voxelGrid[gIdx] = getRoofVariantIdx(blkIdx, 35, blk.remap);
                        this.rooftopParties.push({
                            x: (tilex + 0.5) * TILE_SIZE,
                            y: (tiley + 0.5) * TILE_SIZE,
                            z: tilez + 1.0,
                            isHotelDixon: true,
                            seed: tilex * 13 + tiley * 7
                        });
                    } else if (!tooCloseToExistingPool && (isOceanDrivePenthouse ? ((tilex * 7 + tiley * 13) % 11 === 0) : ((tilex * 11 + tiley * 17) % 29 === 0))) {
                        this.voxelGrid[gIdx] = getRoofVariantIdx(blkIdx, 35, blk.remap);
                        this.rooftopParties.push({
                            x: (tilex + 0.5) * TILE_SIZE,
                            y: (tiley + 0.5) * TILE_SIZE,
                            z: tilez + 1.0,
                            isHotelDixon: false,
                            seed: tilex * 13 + tiley * 7
                        });
                    } else if ((tilex * 5 + tiley * 9) % 19 === 0) {
                        // Occasional glass skylight atrium (lid 31) without any pool or float
                        this.voxelGrid[gIdx] = getRoofVariantIdx(blkIdx, 31, blk.remap);
                    }
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
                    if (blk.groundType !== GROUND_TYPE.AIR) {
                        surfZ = z;
                        surfGt = blk.groundType;
                        break;
                    }
                }
                this.surfaceLayer[r * MAP_COLS + c] = surfZ;
                this.surfaceGround[r * MAP_COLS + c] = surfGt;

                // Open ground tiles store their visible lid at z = 1 and their navigation groundType at z = 2 (with lid = 0)
                const isInsidePrisonOrAirport = (c >= 55 && c <= 69 && r >= 75 && r <= 147) || (c >= 64 && c <= 166 && r >= 299 && r <= 369);
                const blkZ1 = this.getBlockInfo(c, r, 1);
                const blkZ2 = this.getBlockInfo(c, r, 2);
                if (blkZ1 && blkZ1.lid === 69) {
                    // Break rigid 4-corner symmetry of NYC.CMP circular sidewalk planters (lid 69):
                    // Keep only ~28% of circular planters asymmetrically across intersections (and 0% inside prison/airport),
                    // replacing the remaining ~72% with their natural adjacent sidewalk stone paver (lid 8 or lid 9).
                    const planterHash = (((c * 92837111) ^ (r * 689287499) ^ ((c * r) * 283927)) >>> 0) % 100;
                    const keepPlanter = !isInsidePrisonOrAirport && surfZ <= 2 && (!blkZ2 || blkZ2.lid === 0) && surfGt === GROUND_TYPE.PAWEMENT && (planterHash < 28);
                    if (keepPlanter) {
                        this.trees.push({ x: (c + 0.5) * TILE_SIZE, y: (r + 0.5) * TILE_SIZE, z: 2.0, scale: 1.0 });
                    } else {
                        const gIdx1 = (1 * MAP_ROWS + r) * MAP_COLS + c;
                        const origIdx1 = this.voxelGrid[gIdx1];
                        let targetPaverLid = 8;
                        const nCoords = [[c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1]];
                        for (let ni = 0; ni < nCoords.length; ni++) {
                            const nb = this.getBlockInfo(nCoords[ni][0], nCoords[ni][1], 1);
                            if (nb && (nb.lid === 8 || nb.lid === 9)) {
                                targetPaverLid = nb.lid;
                                break;
                            }
                        }
                        this.voxelGrid[gIdx1] = getRoofVariantIdx(origIdx1, targetPaverLid, blkZ1.remap || 0);
                    }
                }
            }
        }

        // Second pass: Identify true sand tiles (lid 98..101) & place Vice City / GTA 6 Leonida diverse flora
        // (10 distinct species: palm_tree, fan_palm, swamp_cypress, mangrove, banyan_tree, live_oak,
        //  bougainvillea_bush, sea_grape, tropical_shrub, sawgrass_clump) coherently distributed across
        //  the official map biomes (Ocean Drive, Star Island, Grassrivers, Lake Leonida, Keys, mainland).
        for (let r = 2; r < MAP_ROWS - 2; r++) {
            for (let c = 2; c < MAP_COLS - 2; c++) {
                const idx = r * MAP_COLS + c;
                const surfGt = this.surfaceGround[idx];
                const surfZ = this.surfaceLayer[idx];
                if (surfZ > 2) continue;
                if (surfGt !== GROUND_TYPE.PAWEMENT && surfGt !== GROUND_TYPE.FIELD && surfGt !== GROUND_TYPE.WATER) continue;

                const blkZ1 = this.getBlockInfo(c, r, 1);
                const blkZ2 = this.getBlockInfo(c, r, 2);
                if (!blkZ1 || (blkZ2 && blkZ2.lid !== 0)) continue;

                const isSandTile = (blkZ1.lid >= 98 && blkZ1.lid <= 101);
                if (isSandTile) {
                    this.coastalSandMask[idx] = 1;
                }

                // Never plant flora inside Leonida State Penitentiary or VCIA Airport active runways/tarmac
                if ((c >= 55 && c <= 69 && r >= 75 && r <= 147) || (c >= 64 && c <= 166 && r >= 299 && r <= 369)) {
                    continue;
                }

                let adjRoad = false;
                let nearLand = false;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const ngt = this.surfaceGround[(r + dr) * MAP_COLS + (c + dc)];
                        if (ngt === GROUND_TYPE.ROAD) adjRoad = true;
                        if (ngt === GROUND_TYPE.PAWEMENT || ngt === GROUND_TYPE.FIELD) nearLand = true;
                    }
                }

                const hs1 = (((c * 73856093) ^ (r * 19349663)) >>> 0) % 10000 / 10000;
                const hs2 = (((c * 83492791) ^ (r * 2654435761)) >>> 0) % 10000 / 10000;
                const seed = Math.floor(hs1 * 10000);

                let chosenKind = null;
                let scaleMul = 1.0;
                let heightMul = 1.0;
                let posX = (c + 0.5 + (hs1 - 0.5) * 0.28) * TILE_SIZE;
                let posY = (r + 0.5 + (hs2 - 0.5) * 0.28) * TILE_SIZE;
                let plantZ = (surfGt === GROUND_TYPE.WATER) ? 1.0 : 2.0;

                // 1) Ocean Drive Iconic Palm Boulevard & Lummus Park Promenade (c=443 West sidewalk & c=448..451 East Lummus Park)
                // AUTHENTIC MIAMI SOUTH BEACH LAYOUT:
                // - West sidewalk (c=443): Single elegant row of slender Royal Palms spaced every 8 blocks in front of Art Deco hotels.
                // - East promenade curb (c=448): Single matching row of Royal Palms spaced every 8 blocks (offset by 4 in alternating zipper).
                // - Lummus Park grass lawn (c=449..450): Spaced tropical fan palms & bougainvillea shrubs on the green grass parcels!
                // - Oceanfront Rollerblade Boardwalk (c=451): 100% WIDE OPEN WALKWAY for rollerbladers, pedestrians & cyclists! ZERO TREES!
                if (c >= 443 && c <= 451 && r >= 20 && r <= 365) {
                    const isWestSidewalk = (c === 443);
                    const isEastCurbside = (c === 448);
                    const isGardenVerge = (c >= 449 && c <= 450) && (blkZ1.lid === 10);

                    if (isWestSidewalk && (r % 8 === 0)) {
                        chosenKind = "palm_tree";
                        posX = (c + 0.22 + (hs1 - 0.5) * 0.10) * TILE_SIZE; // Slender royal palm curbside in front of Art Deco hotel facades
                        scaleMul = 0.95 + hs1 * 0.30;
                        heightMul = 0.90 + hs2 * 0.55;
                    } else if (isEastCurbside && ((r + 4) % 8 === 0)) {
                        chosenKind = "palm_tree";
                        posX = (c + 0.78 + (hs1 - 0.5) * 0.10) * TILE_SIZE; // Curbside royal palm row facing Lummus Park
                        scaleMul = 1.02 + hs1 * 0.35;
                        heightMul = 0.95 + hs2 * 0.60;
                    } else if (isGardenVerge && (r % 10 === 4) && (c === 449 + ((r >> 3) & 1))) {
                        if (seed % 3 === 0) {
                            chosenKind = "fan_palm";
                            scaleMul = 0.88 + hs1 * 0.28;
                        } else {
                            chosenKind = "bougainvillea_bush";
                            scaleMul = 0.90 + hs1 * 0.26;
                        }
                    }
                    // c=451: ZERO TREES! 100% open paved oceanfront boardwalk for rollerblading & walking!
                }
                // 2) Sidewalks & Tree Planters across Vice City (lid 69, or lid 8/9 adjacent to road)
                else if ((blkZ1.lid === 69 || (blkZ1.lid === 8 && adjRoad)) && (surfGt === GROUND_TYPE.PAWEMENT || surfGt === GROUND_TYPE.FIELD) && c < 443) {
                    if (seed % 28 === 0) {
                        chosenKind = "palm_tree";
                        scaleMul = 0.88 + hs1 * 0.35;
                        heightMul = 0.80 + hs2 * 0.55;
                    } else if (seed % 28 === 1) {
                        chosenKind = "fan_palm";
                        scaleMul = 0.82 + hs1 * 0.30;
                    } else if (seed % 28 === 2) {
                        chosenKind = "bougainvillea_bush";
                        scaleMul = 0.85 + hs1 * 0.28;
                    }
                }
                // 3) Vice Beach & Cape Leonida Coastal Dunes Sea Grape & Coconut Palms
                // STRICT RULE: ZERO flora on open sunbathing sand (c >= 452)! Clean golden sand for beachgoers, volleyball & lifeguard towers!
                else if ((blkZ1.lid >= 98 && blkZ1.lid <= 101) || (blkZ1.lid >= 488 && blkZ1.lid <= 495) || (c >= 452 && c <= 485 && r <= 390)) {
                    // 100% pristine open golden sand for towels, beach umbrellas, volleyball & lifeguard towers!
                }
                // 4) Star Island Waterfront Mansions (c=330..360, r=162..184)
                else if (c >= 330 && c <= 360 && r >= 162 && r <= 184 && surfGt === GROUND_TYPE.FIELD && !adjRoad) {
                    if (seed % 8 === 0) { chosenKind = "banyan_tree"; scaleMul = 1.05 + hs1 * 0.45; heightMul = 1.1 + hs2 * 0.5; }
                    else if (seed % 8 === 1) { chosenKind = "bougainvillea_bush"; scaleMul = 0.95 + hs1 * 0.35; }
                    else if (seed % 8 === 2) { chosenKind = "tropical_shrub"; scaleMul = 0.90 + hs1 * 0.30; }
                    else if (seed % 8 === 3) { chosenKind = "palm_tree"; scaleMul = 0.90 + hs1 * 0.45; heightMul = 0.9 + hs2 * 0.7; }
                }
                // 5) Grassrivers / Everglades / Thrillbilly Mud Park (c=60..230, r=370..495)
                else if (c >= 60 && c <= 230 && r >= 370 && r <= 495) {
                    if (surfGt === GROUND_TYPE.WATER && nearLand) {
                        if (seed % 16 === 0) { chosenKind = "sawgrass_clump"; scaleMul = 0.85 + hs1 * 0.35; }
                        else if (seed % 22 === 0) { chosenKind = "swamp_cypress"; scaleMul = 0.90 + hs1 * 0.45; heightMul = 1.0 + hs2 * 0.6; }
                        else if (seed % 22 === 1) { chosenKind = "mangrove"; scaleMul = 0.85 + hs1 * 0.40; }
                    } else if (surfGt === GROUND_TYPE.FIELD && !adjRoad) {
                        if (seed % 14 === 0) { chosenKind = "sawgrass_clump"; scaleMul = 0.90 + hs1 * 0.35; }
                        else if (seed % 16 === 0) { chosenKind = "swamp_cypress"; scaleMul = 0.95 + hs1 * 0.45; heightMul = 1.0 + hs2 * 0.6; }
                        else if (seed % 16 === 1) { chosenKind = "mangrove"; scaleMul = 0.90 + hs1 * 0.40; }
                        else if (seed % 20 === 0) { chosenKind = "live_oak"; scaleMul = 1.05 + hs1 * 0.45; heightMul = 1.1 + hs2 * 0.5; }
                    }
                }
                // 6) Lake Leonida & Gator Island (c=75..175, r=180..260)
                else if (c >= 75 && c <= 175 && r >= 180 && r <= 260) {
                    if (surfGt === GROUND_TYPE.WATER && nearLand) {
                        if (seed % 16 === 0) { chosenKind = "swamp_cypress"; scaleMul = 0.95 + hs1 * 0.45; heightMul = 1.0 + hs2 * 0.6; }
                        else if (seed % 20 === 0) { chosenKind = "sawgrass_clump"; scaleMul = 0.85 + hs1 * 0.35; }
                    } else if (surfGt === GROUND_TYPE.FIELD && !adjRoad) {
                        if (seed % 10 === 0) { chosenKind = "slash_pine"; scaleMul = 1.05 + hs1 * 0.45; heightMul = 1.1 + hs2 * 0.6; }
                        else if (seed % 14 === 0) { chosenKind = "swamp_cypress"; scaleMul = 0.92 + hs1 * 0.40; heightMul = 1.0 + hs2 * 0.6; }
                        else if (seed % 18 === 0) { chosenKind = "live_oak"; scaleMul = 0.95 + hs1 * 0.40; heightMul = 1.0 + hs2 * 0.5; }
                        else if (seed % 22 === 0) { chosenKind = "fan_palm"; scaleMul = 0.85 + hs1 * 0.35; }
                    }
                }
                // 7) Leonida Keys (c=180..460, r=410..495)
                else if (c >= 180 && c <= 460 && r >= 410 && r <= 495) {
                    if (surfGt === GROUND_TYPE.WATER && nearLand && (seed % 18 === 0)) {
                        chosenKind = "mangrove"; scaleMul = 0.90 + hs1 * 0.40;
                    } else if (surfGt === GROUND_TYPE.FIELD && !adjRoad) {
                        if (seed % 12 === 0) { chosenKind = "fan_palm"; scaleMul = 0.90 + hs1 * 0.40; }
                        else if (seed % 14 === 0) { chosenKind = "palm_tree"; scaleMul = 0.90 + hs1 * 0.45; heightMul = 0.85 + hs2 * 0.75; }
                        else if (seed % 16 === 0) { chosenKind = "mangrove"; scaleMul = 0.85 + hs1 * 0.40; }
                        else if (seed % 18 === 0) { chosenKind = "sea_grape"; scaleMul = 0.85 + hs1 * 0.35; }
                        else if (seed % 20 === 0) { chosenKind = "bougainvillea_bush"; scaleMul = 0.90 + hs1 * 0.35; }
                    }
                }
                // 8) Bayfront Park & Downtown Urban Parks (c=210..245, r=40..85, gt==FIELD)
                else if (c >= 210 && c <= 245 && r >= 40 && r <= 85 && surfGt === GROUND_TYPE.FIELD && !adjRoad) {
                    if (seed % 10 === 0) { chosenKind = "banyan_tree"; scaleMul = 1.10 + hs1 * 0.45; heightMul = 1.15 + hs2 * 0.5; }
                    else if (seed % 10 === 1) { chosenKind = "bougainvillea_bush"; scaleMul = 0.95 + hs1 * 0.35; }
                    else if (seed % 10 === 2) { chosenKind = "live_oak"; scaleMul = 1.05 + hs1 * 0.45; heightMul = 1.1 + hs2 * 0.5; }
                    else if (seed % 10 === 3) { chosenKind = "fan_palm"; scaleMul = 0.90 + hs1 * 0.35; }
                    else if (seed % 10 === 4) { chosenKind = "tropical_shrub"; scaleMul = 0.90 + hs1 * 0.30; }
                }
                // 9) General mainland fields / countryside / North Vice Shores (NEVER beach sand!)
                else if (surfGt === GROUND_TYPE.FIELD && !adjRoad && c < 453 && blkZ1.lid !== 98 && blkZ1.lid !== 99 && blkZ1.lid !== 100 && blkZ1.lid !== 101) {
                    if (seed % 22 === 0) { chosenKind = "live_oak"; scaleMul = 1.05 + hs1 * 0.45; heightMul = 1.1 + hs2 * 0.5; }
                    else if (seed % 24 === 0) { chosenKind = "fan_palm"; scaleMul = 0.90 + hs1 * 0.35; }
                    else if (seed % 26 === 0) { chosenKind = "palm_tree"; scaleMul = 0.90 + hs1 * 0.45; heightMul = 0.85 + hs2 * 0.75; }
                    else if (seed % 30 === 0) { chosenKind = "banyan_tree"; scaleMul = 1.10 + hs1 * 0.45; heightMul = 1.15 + hs2 * 0.5; }
                }

                if (chosenKind) {
                    this.vicePalms.push({
                        kind: chosenKind,
                        x: posX,
                        y: posY,
                        z: plantZ,
                        scale: scaleMul,
                        height: heightMul,
                        angle: ((c * 23 + r * 41) % 628) * 0.01
                    });
                }
            }
        }

        // Build O(1) Spatial Hash Grid for Leonida Flora & Tree Trunks (eliminates pedestrian/player tree-clipping)
        this.floraGrid = new Map();
        for (let pi = 0; pi < this.vicePalms.length; pi++) {
            const pm = this.vicePalms[pi];
            const fbx = Math.floor(pm.x / TILE_SIZE);
            const fby = Math.floor(pm.y / TILE_SIZE);
            const fkey = (fby << 16) | (fbx & 0xffff);
            let cell = this.floraGrid.get(fkey);
            if (!cell) {
                cell = [];
                this.floraGrid.set(fkey, cell);
            }
            cell.push(pm);
        }

        // Populate Official GTA 6 S-Curving Vice Beach Lifeguard Towers, Volleyball Courts, Star Island Pool & Neon Marquees!
        // Note: West Beach stands placed at x = 453.6 * TILE_SIZE (right beside Lummus Park so they are visible from Ocean Drive!)
        this.beachProps = [
            // 1. Vice Beach Lifeguard Stands (both West Beach beside Lummus Park at x=453.6 & East Shoreline near the Atlantic surf!)
            { spr: "lifeguard_neon",   x: mx256(238.8) * TILE_SIZE, y: my256(36.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 453.6 * TILE_SIZE,        y: my256(44.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: mx256(238.8) * TILE_SIZE, y: my256(62.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: mx256(238.8) * TILE_SIZE, y: my256(74.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 453.6 * TILE_SIZE,        y: 128.5 * TILE_SIZE,        z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 453.6 * TILE_SIZE,        y: my256(88.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: mx256(238.8) * TILE_SIZE, y: my256(106.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 453.6 * TILE_SIZE,        y: 205.5 * TILE_SIZE,        z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 453.6 * TILE_SIZE,        y: 235.5 * TILE_SIZE,        z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: mx256(238.8) * TILE_SIZE, y: my256(124.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 453.6 * TILE_SIZE,        y: my256(139.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 453.6 * TILE_SIZE,        y: my256(145.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: mx256(239.2) * TILE_SIZE, y: my256(144.0) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: mx256(239.2) * TILE_SIZE, y: my256(149.8) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 453.6 * TILE_SIZE,        y: my256(153.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: mx256(239.2) * TILE_SIZE, y: my256(156.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_tower",  x: 453.6 * TILE_SIZE,        y: my256(168.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: 453.6 * TILE_SIZE,        y: 342.5 * TILE_SIZE,        z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: mx256(237.5) * TILE_SIZE, y: my256(184.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            // West Coast Golden Beach & Southern Keys Lifeguard Towers
            { spr: "lifeguard_neon",   x: mx256(16.5) * TILE_SIZE,  y: my256(36.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: Math.PI },
            { spr: "lifeguard_tower",  x: mx256(16.5) * TILE_SIZE,  y: my256(72.5) * TILE_SIZE,  z: 2.0, scale: 1.12, angle: Math.PI },
            { spr: "lifeguard_neon",   x: mx256(14.5) * TILE_SIZE,  y: my256(108.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: Math.PI },
            { spr: "lifeguard_tower",  x: mx256(14.5) * TILE_SIZE,  y: my256(156.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: Math.PI },
            { spr: "lifeguard_neon",   x: mx256(18.5) * TILE_SIZE,  y: my256(180.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: Math.PI },
            { spr: "lifeguard_tower",  x: mx256(60.5) * TILE_SIZE,  y: my256(207.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            { spr: "lifeguard_neon",   x: mx256(116.5) * TILE_SIZE, y: my256(234.5) * TILE_SIZE, z: 2.0, scale: 1.12, angle: 0 },
            // 2. Star Island Mansion Central Lagoon Pool (on the mansion lawn at 173.0, 112.0)
            { spr: "vercetti_pool",    x: mx256(173.0) * TILE_SIZE, y: my256(112.0) * TILE_SIZE, z: 2.0, scale: 1.15, angle: 0 }
        ];

        // 3A. Live Animated 3D Beach Volleyball Courts (2v2 Bikini Women & Surfers + Raised 3D Net + Flying Volleyball!)
        this.beachVolleyballCourts = [
            { x: 454.2 * TILE_SIZE,        y: my256(46.5) * TILE_SIZE,  z: 2.0, p0: "bikini_pink",   p1: "bikini_yellow", p2: "bikini_cyan",  p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: 124.5 * TILE_SIZE,        z: 2.0, p0: "bikini_yellow", p1: "bikini_pink",   p2: "surfer_guy",   p3: "bikini_cyan" },
            { x: 454.2 * TILE_SIZE,        y: my256(86.5) * TILE_SIZE,  z: 2.0, p0: "bikini_red",    p1: "bikini_white",  p2: "bikini_pink",  p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: my256(106.5) * TILE_SIZE, z: 2.0, p0: "bikini_cyan",   p1: "bikini_pink",   p2: "bikini_yellow",p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: 210.5 * TILE_SIZE,        z: 2.0, p0: "bikini_pink",   p1: "bikini_red",    p2: "bikini_white", p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: 242.5 * TILE_SIZE,        z: 2.0, p0: "bikini_cyan",   p1: "bikini_yellow", p2: "bikini_pink",  p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: my256(137.5) * TILE_SIZE, z: 2.0, p0: "bikini_yellow", p1: "bikini_red",    p2: "bikini_white", p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: my256(143.2) * TILE_SIZE, z: 2.0, p0: "bikini_pink",   p1: "bikini_cyan",   p2: "bikini_yellow",p3: "bikini_red" },
            { x: mx256(236.8) * TILE_SIZE, y: my256(145.5) * TILE_SIZE, z: 2.0, p0: "bikini_white",  p1: "bikini_pink",   p2: "surfer_guy",   p3: "bikini_cyan" },
            { x: 454.2 * TILE_SIZE,        y: my256(151.8) * TILE_SIZE, z: 2.0, p0: "bikini_red",    p1: "bikini_yellow", p2: "bikini_pink",  p3: "surfer_guy" },
            { x: mx256(236.8) * TILE_SIZE, y: my256(154.2) * TILE_SIZE, z: 2.0, p0: "bikini_cyan",   p1: "bikini_white",  p2: "bikini_pink",  p3: "bikini_yellow" },
            { x: 454.2 * TILE_SIZE,        y: my256(158.8) * TILE_SIZE, z: 2.0, p0: "bikini_pink",   p1: "surfer_guy",    p2: "bikini_cyan",  p3: "bikini_red" },
            { x: 454.2 * TILE_SIZE,        y: my256(168.5) * TILE_SIZE, z: 2.0, p0: "bikini_yellow", p1: "bikini_pink",   p2: "bikini_white", p3: "surfer_guy" },
            { x: 454.2 * TILE_SIZE,        y: 344.5 * TILE_SIZE,        z: 2.0, p0: "bikini_pink",   p1: "bikini_cyan",   p2: "bikini_yellow",p3: "surfer_guy" },
            // West Coast Beach & Southern Keys Volleyball Courts
            { x: mx256(18.5) * TILE_SIZE,  y: my256(48.5) * TILE_SIZE,  z: 2.0, p0: "bikini_pink",   p1: "bikini_cyan",   p2: "bikini_yellow",p3: "surfer_guy" },
            { x: mx256(15.5) * TILE_SIZE,  y: my256(96.5) * TILE_SIZE,  z: 2.0, p0: "bikini_red",    p1: "bikini_white",  p2: "bikini_pink",  p3: "surfer_guy" },
            { x: mx256(16.5) * TILE_SIZE,  y: my256(168.5) * TILE_SIZE, z: 2.0, p0: "bikini_cyan",   p1: "bikini_yellow", p2: "bikini_red",   p3: "surfer_guy" },
            { x: mx256(74.5) * TILE_SIZE,  y: my256(217.5) * TILE_SIZE, z: 2.0, p0: "bikini_pink",   p1: "bikini_white",  p2: "bikini_cyan",  p3: "surfer_guy" }
        ];

        // 3B. Beach Aerobics & Retro Boombox Dance Parties on the Sand
        this.beachParties = [
            { x: 453.5 * TILE_SIZE,        y: my256(147.8) * TILE_SIZE, z: 2.0 },
            { x: mx256(238.0) * TILE_SIZE, y: my256(148.5) * TILE_SIZE, z: 2.0 },
            { x: 453.5 * TILE_SIZE,        y: my256(155.2) * TILE_SIZE, z: 2.0 },
            { x: 453.5 * TILE_SIZE,        y: my256(50.5) * TILE_SIZE,  z: 2.0 },
            { x: 453.5 * TILE_SIZE,        y: 218.5 * TILE_SIZE,        z: 2.0 },
            { x: mx256(192.4) * TILE_SIZE, y: my256(112.5) * TILE_SIZE, z: 2.0 },
            // West Coast Beach & Southern Keys Tiki Boombox Parties
            { x: mx256(16.5) * TILE_SIZE,  y: my256(60.5) * TILE_SIZE,  z: 2.0 },
            { x: mx256(21.5) * TILE_SIZE,  y: my256(120.5) * TILE_SIZE, z: 2.0 },
            { x: mx256(46.5) * TILE_SIZE,  y: my256(212.5) * TILE_SIZE, z: 2.0 },
            { x: mx256(88.5) * TILE_SIZE,  y: my256(211.5) * TILE_SIZE, z: 2.0 },
            { x: mx256(116.5) * TILE_SIZE, y: my256(234.5) * TILE_SIZE, z: 2.0 }
        ];

        // 3C. Sunbathing Bikini Women on Striped Towels & Resort Sun Loungers shaded by 3D Umbrellas + Side Beach Props
        this.beachSunbathers = [];
        const bikiniPool = ["bikini_pink", "bikini_cyan", "bikini_yellow", "bikini_red", "bikini_white"];
        const towelPool = ["beach_towel_pink", "beach_towel_cyan", "beach_towel_yellow", "beach_towel_coral", "beach_lounger"];
        const umbPool = ["umbrella_pink", "umbrella_cyan", "umbrella_yellow"];
        const sidePropPool = ["surfboard_pink", "surfboard_cyan", "surfboard_yellow", "beach_ball", "sandcastle", "beach_cooler"];

        const sunbatherRowsY256 = [
            42.5, 44.8, 48.8, 52.5, 56.0, 60.5, 65.0, 70.0, 76.0, 82.0,
            88.5, 92.5, 98.0, 103.5, 109.0, 115.0, 121.0, 128.0, 134.5,
            139.0, 140.8, 142.4, 146.2, 149.6, 153.4, 156.8, 160.5, 164.0, 171.0, 178.0, 184.0
        ];
        const sunbatherRows512 = [
            ...sunbatherRowsY256.map(y => my256(y)),
            116.5, 124.5, 132.5, 140.5, 192.5, 200.5, 208.5, 216.5, 224.5, 232.5, 240.5, 248.5, 334.5, 344.5, 354.5
        ];
        for (let i = 0; i < sunbatherRows512.length; i++) {
            const by = sunbatherRows512[i];
            // West/Mid Beach group right next to Lummus Park (starting at x = 453.2 so visible directly from Ocean Drive!)
            const westCol = 453.2 + (i % 4) * 2.4;
            this.beachSunbathers.push({
                x: westCol * TILE_SIZE,
                y: by * TILE_SIZE,
                z: 2.0,
                angle: ((i % 2) === 0 ? 0 : 0.18),
                pedType: bikiniPool[i % bikiniPool.length],
                towelSpr: towelPool[i % towelPool.length],
                friendPedType: bikiniPool[(i + 2) % bikiniPool.length],
                friendTowelSpr: towelPool[(i + 1) % towelPool.length],
                umbSpr: umbPool[i % umbPool.length],
                umbDx: -23,
                umbDy: -13,
                propSpr: sidePropPool[i % sidePropPool.length],
                propDx: 26,
                propDy: -10,
                propAngle: 0.45,
                extraPropSpr: (i % 2 === 0) ? "beach_ball" : "sandcastle",
                extraPropDx: 24,
                extraPropDy: 18
            });

            // East Shoreline group near the Atlantic surf
            const eastCol = mx256(235.4 + ((i + 1) % 3) * 2.1);
            this.beachSunbathers.push({
                x: eastCol * TILE_SIZE,
                y: (by + 0.6) * TILE_SIZE,
                z: 2.0,
                angle: -0.12,
                pedType: bikiniPool[(i + 1) % bikiniPool.length],
                towelSpr: towelPool[(i + 2) % towelPool.length],
                friendPedType: (i % 3 === 0) ? "surfer_guy" : bikiniPool[(i + 3) % bikiniPool.length],
                friendTowelSpr: towelPool[(i + 3) % towelPool.length],
                umbSpr: umbPool[(i + 1) % umbPool.length],
                umbDx: -23,
                umbDy: -13,
                propSpr: sidePropPool[(i + 2) % sidePropPool.length],
                propDx: 26,
                propDy: -10,
                propAngle: -0.35,
                extraPropSpr: (i % 2 === 1) ? "beach_cooler" : "sandcastle",
                extraPropDx: 24,
                extraPropDy: 18
            });
        }

        // Biscayne Bay West Beach & Star Island Celebrity Beach
        const bayRowsY = [101.5, 105.0, 108.5, 115.5, 119.5, 123.5];
        for (let bi = 0; bi < bayRowsY.length; bi++) {
            this.beachSunbathers.push({
                x: mx256(191.8 + (bi % 2) * 1.1) * TILE_SIZE,
                y: my256(bayRowsY[bi]) * TILE_SIZE,
                z: 2.0,
                angle: Math.PI,
                pedType: bikiniPool[bi % bikiniPool.length],
                towelSpr: towelPool[bi % towelPool.length],
                friendPedType: bikiniPool[(bi + 1) % bikiniPool.length],
                friendTowelSpr: towelPool[(bi + 2) % towelPool.length],
                umbSpr: umbPool[bi % umbPool.length],
                umbDx: 15,
                umbDy: -10,
                propSpr: sidePropPool[bi % sidePropPool.length],
                propDx: -16,
                propDy: 12
            });
        }
        this.beachSunbathers.push(
            {
                x: mx256(184.4) * TILE_SIZE,
                y: my256(111.5) * TILE_SIZE,
                z: 2.0,
                angle: 0,
                pedType: "bikini_pink",
                towelSpr: "beach_lounger",
                friendPedType: "bikini_white",
                friendTowelSpr: "beach_lounger",
                umbSpr: "umbrella_pink",
                propSpr: "beach_cooler"
            },
            {
                x: mx256(184.4) * TILE_SIZE,
                y: my256(114.2) * TILE_SIZE,
                z: 2.0,
                angle: 0,
                pedType: "bikini_yellow",
                towelSpr: "beach_lounger",
                friendPedType: "bikini_cyan",
                friendTowelSpr: "beach_lounger",
                umbSpr: "umbrella_cyan",
                propSpr: "beach_ball"
            }
        );

        // 3D. Atlantic & Biscayne Bay Wave Surfers & Shallow-Water Bikini Swimmers
        this.beachSwimmers = [];
        const surfRowsY256 = [
            44.5, 51.0, 64.0, 78.0, 90.0, 105.0, 122.0,
            138.5, 141.0, 143.2, 145.5, 147.8, 150.2, 152.5, 155.0, 157.5, 160.5, 168.0, 178.0
        ];
        const surfRows512 = [
            ...surfRowsY256.map(y => my256(y)),
            122.0, 138.0, 198.0, 215.0, 232.0, 248.0, 340.0
        ];
        const boardPool = ["surfboard_pink", "surfboard_cyan", "surfboard_yellow"];
        for (let si = 0; si < surfRows512.length; si++) {
            const sy = surfRows512[si];
            // Shallow-water bikini swimmer wading/swimming at the shoreline
            this.beachSwimmers.push({
                x: mx256(241.7 + (si % 2) * 0.6) * TILE_SIZE,
                y: sy * TILE_SIZE,
                z: 2.0,
                angle: Math.PI,
                isSurfer: false,
                pedType: bikiniPool[si % bikiniPool.length]
            });
            // Atlantic wave surfer riding/paddling on surfboard
            this.beachSwimmers.push({
                x: mx256(243.3 + (si % 2) * 0.9) * TILE_SIZE,
                y: (sy + 1.1) * TILE_SIZE,
                z: 2.0,
                angle: Math.PI,
                isSurfer: true,
                pedType: (si % 2 === 0) ? "surfer_guy" : bikiniPool[(si + 2) % bikiniPool.length],
                boardSpr: boardPool[si % boardPool.length]
            });
        }
        // Biscayne Bay swimmers & surfers along West Beach shoreline + Gulf of Mexico West Coast & Southern Keys!
        for (const by of [103.5, 114.5, 120.5]) {
            this.beachSwimmers.push({
                x: mx256(190.2) * TILE_SIZE,
                y: my256(by) * TILE_SIZE,
                z: 2.0,
                angle: 0,
                isSurfer: (by > 112),
                pedType: (by > 112) ? "bikini_pink" : "bikini_cyan",
                boardSpr: "surfboard_cyan"
            });
        }
        // West Coast Golden Beach Sunbathers & Gulf Swimmers/Surfers + Southern Keys Island Sunbathers
        const westSpots = [
            [16.5, 24.5], [18.5, 36.5], [19.5, 48.5], [16.5, 60.5], [16.5, 72.5], [14.5, 84.5],
            [14.5, 96.5], [14.5, 108.5], [21.5, 120.5], [14.5, 156.5], [16.5, 168.5], [18.5, 180.5],
            [46.5, 212.5], [60.5, 207.5], [74.5, 217.5], [88.5, 211.5], [116.5, 234.5]
        ];
        for (let wi = 0; wi < westSpots.length; wi++) {
            const [wc, wr] = westSpots[wi];
            this.beachSunbathers.push({
                x: mx256(wc) * TILE_SIZE,
                y: my256(wr) * TILE_SIZE,
                z: 2.0,
                angle: Math.PI,
                pedType: bikiniPool[wi % bikiniPool.length],
                towelSpr: towelPool[wi % towelPool.length],
                friendPedType: (wi % 2 === 0) ? "surfer_guy" : bikiniPool[(wi + 1) % bikiniPool.length],
                friendTowelSpr: towelPool[(wi + 2) % towelPool.length],
                umbSpr: umbPool[wi % umbPool.length],
                umbDx: 16,
                umbDy: -10,
                propSpr: sidePropPool[wi % sidePropPool.length],
                propDx: -16,
                propDy: 12
            });
            this.beachSwimmers.push({
                x: (mx256(wc) - 3.5) * TILE_SIZE,
                y: my256(wr) * TILE_SIZE,
                z: 2.0,
                angle: 0,
                isSurfer: (wi % 2 === 0),
                pedType: (wi % 2 === 0) ? "surfer_guy" : bikiniPool[wi % bikiniPool.length],
                boardSpr: boardPool[wi % boardPool.length]
            });
        }

        // Strict Ground-Truth Validation & Snap Pass for all Beach Props, Sunbathers, Courts, Parties & Swimmers:
        // Guarantees no towel, umbrella, sunbather, surfboard, volleyball court, lifeguard tower, or swimmer ever
        // lands on or adjacent to a ROAD, bridge, causeway, building, stone sidewalk, or wooden pier!
        const starLawnMinX = MAP_X_256[183], starLawnMaxX = MAP_X_256[185];
        const starLawnMinY = MAP_Y_256[111], starLawnMaxY = MAP_Y_256[115];
        const isCleanSandTile = (c, r, allowStarIsland = false) => {
            if (c < 2 || c >= MAP_COLS - 2 || r < 2 || r >= MAP_ROWS - 2) return false;
            if (r <= 46 && c >= 455) return false; // Exclude SERA Spaceport security perimeter
            if (r >= 131 && r <= 137 && c >= 456 && c <= 467) return false; // Exclude Cape Leonida Lighthouse Plaza
            if (r >= 192 && r <= 197 && c >= 454 && c <= 468) return false; // Exclude Vice Beach Pier Boardwalk
            if (r >= 474 && r <= 479 && c >= 196 && c <= 202) return false; // Exclude Key West Lighthouse Plaza
            const idx = r * MAP_COLS + c;
            const isStarLawn = allowStarIsland && c >= starLawnMinX && c <= starLawnMaxX && r >= starLawnMinY && r <= starLawnMaxY && this.surfaceGround[idx] === GROUND_TYPE.FIELD;
            if (!this.coastalSandMask[idx] && !isStarLawn) return false;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    const nIdx = nr * MAP_COLS + nc;
                    const gt = this.surfaceGround[nIdx];
                    const lid = this.getBlockInfo(nc, nr, 1)?.lid || 0;
                    if (gt === GROUND_TYPE.ROAD || gt === GROUND_TYPE.WATER || gt === GROUND_TYPE.BUILDING || lid === 77) {
                        return false;
                    }
                    if (!isStarLawn && (dr === 0 || dc === 0) && !this.coastalSandMask[nIdx]) {
                        return false;
                    }
                }
            }
            return true;
        };

        const snapPxToCleanSand = (px, py, allowStarIsland = false) => {
            const cxF = px / TILE_SIZE;
            const ryF = py / TILE_SIZE;
            const c0 = Math.floor(cxF);
            const r0 = Math.floor(ryF);
            const fracX = cxF - c0;
            if (isCleanSandTile(c0, r0, allowStarIsland)) return { x: px, y: py };
            const offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
            for (const dc of offsets) {
                if (isCleanSandTile(c0 + dc, r0, allowStarIsland)) {
                    return { x: (c0 + dc + fracX) * TILE_SIZE, y: py };
                }
            }
            return null;
        };

        const isCleanWaterTile = (c, r) => {
            if (c < 2 || c >= MAP_COLS - 2 || r < 2 || r >= MAP_ROWS - 2) return false;
            if (this.surfaceGround[r * MAP_COLS + c] !== GROUND_TYPE.WATER) return false;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    const gt = this.surfaceGround[nr * MAP_COLS + nc];
                    const lid = this.getBlockInfo(nc, nr, 1)?.lid || 0;
                    if (gt === GROUND_TYPE.ROAD || gt === GROUND_TYPE.BUILDING || lid === 77) {
                        return false;
                    }
                }
            }
            return true;
        };

        const snapPxToCleanWater = (px, py) => {
            const cxF = px / TILE_SIZE;
            const ryF = py / TILE_SIZE;
            const c0 = Math.floor(cxF);
            const r0 = Math.floor(ryF);
            const fracX = cxF - c0;
            if (isCleanWaterTile(c0, r0)) return { x: px, y: py };
            const dirs = c0 > MAP_X_256[210] ? [1, 2, 3, 4, 5, 6, -1, -2] : [-1, -2, -3, -4, -5, 1, 2, 3];
            for (const dc of dirs) {
                if (isCleanWaterTile(c0 + dc, r0)) {
                    return { x: (c0 + dc + fracX) * TILE_SIZE, y: py };
                }
            }
            return null;
        };

        this.beachUmbrellas = this.beachUmbrellas.filter(u => isCleanSandTile(Math.floor(u.x / TILE_SIZE), Math.floor(u.y / TILE_SIZE), false));

        this.beachSunbathers = this.beachSunbathers.filter(sb => {
            const snapped = snapPxToCleanSand(sb.x, sb.y, sb.towelSpr === "beach_lounger");
            if (!snapped) return false;
            sb.x = snapped.x;
            sb.y = snapped.y;
            return true;
        });

        this.beachVolleyballCourts = this.beachVolleyballCourts.filter(vc => {
            const snapped = snapPxToCleanSand(vc.x, vc.y, false);
            if (!snapped) return false;
            vc.x = snapped.x;
            vc.y = snapped.y;
            return true;
        });

        this.beachParties = this.beachParties.filter(bp => {
            const snapped = snapPxToCleanSand(bp.x, bp.y, false);
            if (!snapped) return false;
            bp.x = snapped.x;
            bp.y = snapped.y;
            return true;
        });

        this.beachProps = this.beachProps.filter(pr => {
            if (!pr.spr || !pr.spr.startsWith("lifeguard_")) return true;
            const snapped = snapPxToCleanSand(pr.x, pr.y, false);
            if (!snapped) return false;
            pr.x = snapped.x;
            pr.y = snapped.y;
            return true;
        });

        this.beachSwimmers = this.beachSwimmers.filter(sw => {
            const snapped = snapPxToCleanWater(sw.x, sw.y);
            if (!snapped) return false;
            sw.x = snapped.x;
            sw.y = snapped.y;
            return true;
        });

        // Snap any sidewalk/park props (crates, infoSigns, streetFires, pickups, killFrenzies) off ROAD/BUILDING/WATER tiles
        const snapPxToPedSurface = (px, py) => {
            const c0 = Math.floor(px / TILE_SIZE);
            const r0 = Math.floor(py / TILE_SIZE);
            if (c0 < 2 || c0 >= MAP_COLS - 2 || r0 < 2 || r0 >= MAP_ROWS - 2) return { x: px, y: py };
            const gt0 = this.surfaceGround[r0 * MAP_COLS + c0];
            if (gt0 === GROUND_TYPE.PAWEMENT || gt0 === GROUND_TYPE.FIELD) return { x: px, y: py };
            for (let rad = 1; rad <= 4; rad++) {
                for (let dr = -rad; dr <= rad; dr++) {
                    for (let dc = -rad; dc <= rad; dc++) {
                        if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
                        const nr = r0 + dr;
                        const nc = c0 + dc;
                        const gt = this.surfaceGround[nr * MAP_COLS + nc];
                        if (gt === GROUND_TYPE.PAWEMENT || gt === GROUND_TYPE.FIELD) {
                            return { x: (nc + 0.5) * TILE_SIZE, y: (nr + 0.5) * TILE_SIZE };
                        }
                    }
                }
            }
            return { x: px, y: py };
        };
        for (const list of [this.crates, this.infoSigns, this.streetFires, this.pickups, this.killFrenzies]) {
            if (!Array.isArray(list)) continue;
            for (const item of list) {
                const s = snapPxToPedSurface(item.x, item.y);
                item.x = s.x;
                item.y = s.y;
            }
        }

        // =========================================================================
        // 3F. GTA 6 LEONIDA & VICE CITY LIVING WORLD ECOSYSTEMS (Ground-Truth Snapped)
        // =========================================================================
        const isSafePedTile = (c, r) => {
            if (c < 3 || c >= MAP_COLS - 3 || r < 3 || r >= MAP_ROWS - 3) return false;
            const gt = this.surfaceGround[r * MAP_COLS + c];
            if (gt !== GROUND_TYPE.PAWEMENT && gt !== GROUND_TYPE.FIELD) return false;
            // Ensure no road or building right on the same tile
            return (this.surfaceLayer[r * MAP_COLS + c] || 2) <= 2;
        };
        const snapToVerifiedPed = (px, py, maxRad = 5) => {
            const c0 = Math.floor(px / TILE_SIZE);
            const r0 = Math.floor(py / TILE_SIZE);
            if (isSafePedTile(c0, r0)) return { x: px, y: py, z: 2.0 };
            for (let rad = 1; rad <= maxRad; rad++) {
                for (let dr = -rad; dr <= rad; dr++) {
                    for (let dc = -rad; dc <= rad; dc++) {
                        if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
                        const nc = c0 + dc, nr = r0 + dr;
                        if (isSafePedTile(nc, nr)) {
                            return { x: (nc + 0.5) * TILE_SIZE, y: (nr + 0.5) * TILE_SIZE, z: 2.0 };
                        }
                    }
                }
            }
            return null;
        };
        const isDeepWaterNeighborhood = (c, r, rad = 1) => {
            for (let dr = -rad; dr <= rad; dr++) {
                for (let dc = -rad; dc <= rad; dc++) {
                    if (!isCleanWaterTile(c + dc, r + dr)) return false;
                }
            }
            return true;
        };

        // 1) Muscle Beach Outdoor Weightlifting & Calisthenics Gyms (Lummus Park & South Beach Sand at x=453.2)
        this.muscleBeachGyms = [];
        for (const rGym of [94, 114, 134, 141, 155, 174]) {
            const snapped = snapPxToCleanSand(453.2 * TILE_SIZE, my256(rGym + 0.5) * TILE_SIZE, false);
            if (snapped) {
                this.muscleBeachGyms.push({ x: snapped.x, y: snapped.y, z: 2.0, seed: rGym });
            }
        }
        for (const rGym512 of [130, 212, 240, 282, 340]) {
            const snapped = snapPxToCleanSand(453.2 * TILE_SIZE, (rGym512 + 0.5) * TILE_SIZE, false);
            if (snapped) {
                this.muscleBeachGyms.push({ x: snapped.x, y: snapped.y, z: 2.0, seed: rGym512 });
            }
        }

        // 2) Leonida Alligators ("gator_3d"): Swimming in Lake Leonida / Grassrivers / Kalaga + Basking on Natural Swamp Banks!
        this.leonidaGators = [];
        const rawGators = [
            // Lake Leonida & Gator Island swimming & basking gators
            { c: mx256(69.5), r: my256(62.5), inWater: true, angle: 0.4 },
            { c: mx256(76.5), r: my256(68.5), inWater: true, angle: 2.1 },
            { c: mx256(84.5), r: my256(74.5), inWater: true, angle: -0.8 },
            { c: mx256(72.5), r: my256(81.5), inWater: true, angle: 1.2 },
            { c: mx256(86.5), r: my256(82.5), inWater: true, angle: -2.4 },
            { c: 105.5,       r: 132.5,       inWater: true, angle: 0.9 },
            { c: 140.5,       r: 136.5,       inWater: true, angle: -1.4 },
            { c: mx256(64.5), r: my256(64.5), inWater: false, angle: 0.2 }, // Basking on NW Lake Leonida bank
            { c: mx256(78.5), r: my256(74.5), inWater: false, angle: -0.5 }, // Gator Island basking
            // South Lake Leonida Lagoon
            { c: mx256(68.0), r: my256(101.5), inWater: true, angle: 1.5 },
            { c: 140.5,       r: 220.5,        inWater: true, angle: -0.6 },
            { c: mx256(63.5), r: my256(123.5), inWater: true, angle: -1.2 },
            // Mount Kalaga National Park Mountain Lake
            { c: mx256(55.5), r: my256(15.5), inWater: true, angle: 0.6 },
            { c: mx256(58.5), r: my256(17.0), inWater: true, angle: -2.2 },
            // Grassrivers Everglades & Southern Wetlands
            { c: mx256(48.5),  r: my256(218.5), inWater: true, angle: 0.3 },
            { c: mx256(64.5),  r: my256(222.5), inWater: true, angle: 2.6 },
            { c: mx256(82.5),  r: my256(216.5), inWater: true, angle: -0.7 },
            { c: mx256(98.5),  r: my256(224.5), inWater: true, angle: 1.1 },
            { c: mx256(116.5), r: my256(219.5), inWater: true, angle: -1.9 },
            { c: mx256(134.5), r: my256(225.5), inWater: true, angle: 0.8 }
        ];
        for (let gi = 0; gi < rawGators.length; gi++) {
            const g = rawGators[gi];
            const px = g.c * TILE_SIZE;
            const py = g.r * TILE_SIZE;
            if (g.inWater) {
                const sw = snapPxToCleanWater(px, py);
                if (sw) this.leonidaGators.push({ x: sw.x, y: sw.y, z: 2.0, inWater: true, angle: g.angle, seed: gi * 1.7 });
            } else {
                const sp = snapToVerifiedPed(px, py, 4);
                if (sp) this.leonidaGators.push({ x: sp.x, y: sp.y, z: 2.0, inWater: false, angle: g.angle, seed: gi * 1.7 });
            }
        }

        // 3) Leonida Pink Flamingo Flocks ("flamingo_pink" + "lilypad_green") in Park Lagoons, Lake Leonida & Grassrivers
        this.flamingoFlocks = [];
        const rawFlocks = [
            { c: mx256(67.5),  r: my256(60.5),  count: 6 }, // Lake Leonida North Cove
            { c: mx256(88.5),  r: my256(78.5),  count: 6 }, // Lake Leonida East Cove
            { c: mx256(68.0),  r: my256(99.5),  count: 5 }, // South Lake Leonida Park Lagoon
            { c: 138.0,        r: 215.0,        count: 6 }, // Expanded South Lake Leonida Lagoon
            { c: mx256(147.5), r: my256(55.5),  count: 6 }, // Vice City Golf Club Water Hazard
            { c: mx256(98.5),  r: my256(65.0),  count: 5 }, // Little Haiti Basin
            { c: mx256(110.5), r: my256(66.0),  count: 5 }, // Wynwood West Basin
            { c: mx256(134.5), r: my256(67.0),  count: 6 }, // Wynwood East Park Basin
            { c: mx256(135.5), r: my256(120.5), count: 5 }, // Downtown Reflecting Basin
            { c: mx256(213.5), r: my256(26.5),  count: 7 }, // SERA Spaceport / North Beach Lagoon
            { c: mx256(53.5),  r: my256(14.5),  count: 6 }, // North Vice Shores West Lagoon
            { c: mx256(81.0),  r: my256(15.5),  count: 6 }, // North Vice Shores Central Lagoon
            { c: mx256(128.0), r: my256(15.5),  count: 6 }, // Golden Glades East Lagoon
            { c: mx256(76.5),  r: my256(218.5), count: 7 }, // Grassrivers Flamingo Sanctuary West
            { c: mx256(112.5), r: my256(221.5), count: 7 }  // Grassrivers Flamingo Sanctuary East
        ];
        for (let fi = 0; fi < rawFlocks.length; fi++) {
            const fl = rawFlocks[fi];
            const sw = snapPxToCleanWater(fl.c * TILE_SIZE, fl.r * TILE_SIZE);
            if (sw) {
                this.flamingoFlocks.push({ x: sw.x, y: sw.y, z: 2.0, count: fl.count, seed: fi * 2.3 });
            }
        }

        // 4) Biscayne Bay, Star Island, Vice Port & Atlantic Luxury Superyacht Parties ("luxury_yacht") & Neon Jet-Skiers ("jetski_neon")
        this.yachtParties = [];
        const rawYachts = [
            { c: Math.round(mx256(162)), r: Math.round(my256(92)),  angle: -Math.PI * 0.5 },   // Biscayne Bay North (Star Island Yacht Basin)
            { c: Math.round(mx256(164)), r: Math.round(my256(116)), angle: Math.PI * 0.5 },    // Star Island South Channel
            { c: 320,                    r: 225,                    angle: Math.PI * 0.5 },    // Central Biscayne Bay Superyacht
            { c: Math.round(mx256(162)), r: Math.round(my256(142)), angle: -Math.PI * 0.35 },  // Vice Port / Biscayne Bay South
            { c: Math.round(mx256(243)), r: Math.round(my256(78)),  angle: Math.PI * 0.5 },    // North Beach Atlantic Offshore Superyacht
            { c: Math.round(mx256(244)), r: 215,                    angle: -Math.PI * 0.5 },   // Mid-Beach Atlantic Offshore Superyacht
            { c: Math.round(mx256(244)), r: Math.round(my256(118)), angle: -Math.PI * 0.5 },   // Flamingo / Mid-Beach Offshore Superyacht
            { c: Math.round(mx256(243)), r: Math.round(my256(156)), angle: Math.PI * 0.45 },   // South Beach / Ocean Drive Offshore Superyacht
            { c: Math.round(mx256(205)), r: Math.round(my256(218)), angle: 0.0 },              // Leonida Keys / Vice Point Marina Offshore
            { c: Math.round(mx256(148)), r: Math.round(my256(222)), angle: 0.15 },             // Central Leonida Keys Lagoon Superyacht
            { c: Math.round(mx256(9)),   r: Math.round(my256(76)),  angle: Math.PI * 0.5 },    // West Coast Gulf Offshore Superyacht
            { c: Math.round(mx256(9)),   r: Math.round(my256(136)), angle: -Math.PI * 0.5 },   // Port Gellhorn / West Beach Offshore Superyacht
            { c: Math.round(mx256(78)),  r: Math.round(my256(72)),  angle: 0.35 }              // Lake Leonida VIP Party Cruiser
        ];
        for (let yi = 0; yi < rawYachts.length; yi++) {
            const ry = rawYachts[yi];
            let placed = false;
            for (let rad = 0; rad <= 6 && !placed; rad++) {
                for (let dr = -rad; dr <= rad && !placed; dr++) {
                    for (let dc = -rad; dc <= rad && !placed; dc++) {
                        if (rad > 0 && Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
                        const nc = ry.c + dc, nr = ry.r + dr;
                        if (isDeepWaterNeighborhood(nc, nr, 1)) {
                            this.yachtParties.push({
                                x: (nc + 0.5) * TILE_SIZE,
                                y: (nr + 0.5) * TILE_SIZE,
                                z: 2.0,
                                angle: ry.angle,
                                seed: yi * 3.1
                            });
                            placed = true;
                        }
                    }
                }
            }
        }

        this.jetSkiers = [];
        const rawJetSkis = [
            { c: mx256(240), r: my256(66),  rx: 18, ry: 42, speed: 1.3 },
            { c: mx256(239), r: my256(98),  rx: 16, ry: 38, speed: 1.45 },
            { c: mx256(239), r: 220,        rx: 18, ry: 44, speed: 1.4 },
            { c: mx256(238), r: my256(132), rx: 18, ry: 44, speed: 1.35 },
            { c: mx256(239), r: 280,        rx: 18, ry: 46, speed: 1.55 },
            { c: mx256(239), r: 298,        rx: 16, ry: 40, speed: 1.45 },
            { c: mx256(239), r: my256(168), rx: 16, ry: 38, speed: 1.5 },
            { c: mx256(163), r: my256(104), rx: 22, ry: 32, speed: 1.4 },
            { c: 368,        r: 225,        rx: 24, ry: 36, speed: 1.4 },
            { c: 416,        r: 292,        rx: 22, ry: 28, speed: 1.5 },
            { c: mx256(163), r: my256(130), rx: 20, ry: 30, speed: 1.35 },
            { c: mx256(192), r: my256(214), rx: 36, ry: 22, speed: 1.5 },
            { c: mx256(74),  r: my256(66),  rx: 24, ry: 24, speed: 1.25 }
        ];
        const jetPeds = ["surfer_guy", "bikini_pink", "bikini_cyan", "vc_jogger", "bikini_red"];
        for (let ji = 0; ji < rawJetSkis.length; ji++) {
            const rj = rawJetSkis[ji];
            const sw = snapPxToCleanWater(rj.c * TILE_SIZE, rj.r * TILE_SIZE);
            if (sw && isDeepWaterNeighborhood(Math.floor(sw.x / TILE_SIZE), Math.floor(sw.y / TILE_SIZE), 1)) {
                this.jetSkiers.push({
                    x: sw.x,
                    y: sw.y,
                    z: 2.0,
                    rx: rj.rx,
                    ry: rj.ry,
                    speed: rj.speed,
                    ped: jetPeds[ji % jetPeds.length],
                    seed: ji * 2.1
                });
            }
        }

        // 5) Wynwood Walls Street-Art Breakdance Cyphers & Ocean Drive Social-Media Livestreamers ("streetEvents")
        this.streetEvents = [];
        const rawStreetEvents = [
            // Wynwood & Little Haiti Street-Art Mural + DJ Booth + Breakdancers
            { c: mx256(112.5), r: my256(71.5), kind: "WYNWOOD_CYPHER" },
            { c: mx256(124.5), r: my256(71.5), kind: "WYNWOOD_CYPHER" },
            { c: mx256(135.5), r: my256(72.5), kind: "WYNWOOD_CYPHER" },
            { c: mx256(101.5), r: my256(68.5), kind: "WYNWOOD_CYPHER" },
            { c: 212.5,        r: 128.5,       kind: "WYNWOOD_CYPHER" },
            // Ocean Drive & South Beach Social-Media Influencer Ring-Light Livestreamers (GTA 6 Trailer 1!)
            { c: mx256(218.4), r: my256(88.5),  kind: "INFLUENCER_STREAM" },
            { c: mx256(218.4), r: my256(112.5), kind: "INFLUENCER_STREAM" },
            { c: mx256(218.4), r: 222.5,        kind: "INFLUENCER_STREAM" },
            { c: mx256(218.4), r: my256(138.5), kind: "INFLUENCER_STREAM" },
            { c: mx256(218.4), r: my256(162.5), kind: "INFLUENCER_STREAM" },
            { c: mx256(204.5), r: my256(119.5), kind: "INFLUENCER_STREAM" }
        ];
        for (let ei = 0; ei < rawStreetEvents.length; ei++) {
            const ev = rawStreetEvents[ei];
            const sp = snapToVerifiedPed(ev.c * TILE_SIZE, ev.r * TILE_SIZE, 5);
            if (sp) {
                this.streetEvents.push({ x: sp.x, y: sp.y, z: 2.0, kind: ev.kind, seed: ei * 1.9 });
            }
        }

        // 6) Mount Kalaga National Park Wilderness Campsites ("wildernessCamps")
        this.wildernessCamps = [];
        for (const [cc, rr] of [[49.5, 11.2], [62.5, 11.2], [50.5, 20.8], [62.2, 20.8], [74.5, 16.5]]) {
            const sp = snapToVerifiedPed(mx256(cc) * TILE_SIZE, my256(rr) * TILE_SIZE, 4);
            if (sp) {
                this.wildernessCamps.push({ x: sp.x, y: sp.y, z: 2.0, seed: cc + rr });
            }
        }

        // 7) Vice City Golf Club Putting Greens ("golfGreens")
        this.golfGreens = [];
        for (const [cc, rr] of [[144.8, 53.5], [151.8, 53.5], [144.8, 59.2], [151.8, 59.2]]) {
            const sp = snapToVerifiedPed(mx256(cc) * TILE_SIZE, my256(rr) * TILE_SIZE, 4);
            if (sp) {
                this.golfGreens.push({ x: sp.x, y: sp.y, z: 2.0, seed: cc * 3 + rr });
            }
        }

        // 8) Mambas Stadium Live Football Pitch Scrimmage ("stadiumScrimmage" inside the emerald turf bowl)
        this.stadiumScrimmage = {
            x: mx256(115.5) * TILE_SIZE,
            y: my256(102.5) * TILE_SIZE,
            z: 2.0
        };

        // 9) VCIA Airport, SERA Spaceport, Star Island & Vice Port Aviation Props ("airportProps")
        this.airportProps = [
            // Commercial Widebody Airliners at VCIA open tarmac aprons (zero road or 3D building overlap)
            { kind: "AIRLINER", c: 84.5,  r: 310.5, ang: 0,              scale: 1.55 },
            { kind: "AIRLINER", c: 100.5, r: 310.5, ang: Math.PI,        scale: 1.55 },
            { kind: "AIRLINER", c: 138.5, r: 310.5, ang: Math.PI,        scale: 1.55 },
            { kind: "AIRLINER", c: 95.5,  r: 320.0, ang: 0,              scale: 1.60 },
            { kind: "AIRLINER", c: 138.5, r: 320.0, ang: Math.PI,        scale: 1.60 },
            // VIP Executive Learjets outside Hangars & FBO Terminals
            { kind: "LEARJET",  c: 73.0,  r: 304.0, ang: Math.PI * 0.5,  scale: 1.35 },
            { kind: "LEARJET",  c: 73.0,  r: 324.0, ang: 0,              scale: 1.35 },
            { kind: "LEARJET",  c: 151.5, r: 304.0, ang: Math.PI,        scale: 1.35 },
            { kind: "LEARJET",  c: 118.0, r: 353.0, ang: -Math.PI * 0.5, scale: 1.35 },
            { kind: "LEARJET",  c: 448.0, r: 49.5,  ang: 0,              scale: 1.30 },
            // Helipads with Live Spinning-Rotor Helicopters
            { kind: "HELIPAD",  c: 122.5, r: 303.5, ang: 0.4,            scale: 1.25 },
            { kind: "HELIPAD",  c: 158.5, r: 291.5, ang: -0.6,           scale: 1.25 },
            { kind: "HELIPAD",  c: 460.0, r: 40.5,  ang: 0.2,            scale: 1.25 },
            { kind: "HELIPAD",  c: 338.5, r: 163.5, ang: -0.8,           scale: 1.25 },
            { kind: "HELIPAD",  c: 336.5, r: 318.5, ang: 0.5,            scale: 1.25 },
            { kind: "HELIPAD",  c: 63.5,  r: 96.5,  ang: 1.1,            scale: 1.20 }
        ].map((p, i) => ({
            kind: p.kind,
            x: p.c * TILE_SIZE,
            y: p.r * TILE_SIZE,
            z: 2.0,
            ang: p.ang,
            scale: p.scale,
            seed: i * 1.7
        }));

        // 10) Leonida State Penitentiary Fenced Security Compound, Searchlights & Exercise Yard ("prisonCompound")
        const prisX0 = 56.15 * TILE_SIZE, prisY0 = 76.15 * TILE_SIZE, prisX1 = 68.85 * TILE_SIZE, prisY1 = 146.85 * TILE_SIZE, prisMidY = 103.5 * TILE_SIZE;
        const prisInX0 = 56.92 * TILE_SIZE, prisInX1 = 68.08 * TILE_SIZE, prisInY1 = 145.92 * TILE_SIZE;
        this.prisonCompound = {
            x0: prisX0,
            y0: prisY0,
            x1: prisX1,
            y1: prisY1,
            inX0: prisInX0,
            inX1: prisInX1,
            inY1: prisInY1,
            midY: prisMidY,
            courtX: 62.0 * TILE_SIZE,
            courtY: 123.5 * TILE_SIZE,
            z: 2.0,
            spans: [
                // Outer Maximum-Security Perimeter Fence (with North Sally-Port Gatehouse at c=60.8..63.2)
                { xA: prisX0,           yA: prisY0,   xB: 60.8 * TILE_SIZE, yB: prisY0,   isPrison: true },
                { xA: 63.2 * TILE_SIZE, yA: prisY0,   xB: prisX1,           yB: prisY0,   isPrison: true },
                { xA: prisX1,           yA: prisY0,   xB: prisX1,           yB: prisY1,   isPrison: true },
                { xA: prisX0,           yA: prisY1,   xB: prisX1,           yB: prisY1,   isPrison: true },
                { xA: prisX0,           yA: prisY0,   xB: prisX0,           yB: prisY1,   isPrison: true },
                // Inner Razor-Wire Security Fence (Double-Fence No-Man's-Land along East, West & South perimeter)
                { xA: prisInX1,         yA: prisY0,   xB: prisInX1,         yB: prisInY1, isPrison: true },
                { xA: prisInX0,         yA: prisY0,   xB: prisInX0,         yB: prisInY1, isPrison: true },
                { xA: prisInX0,         yA: prisInY1, xB: prisInX1,         yB: prisInY1, isPrison: true },
                // Internal Courtyard Security Divider (y = 103.5) with guarded center sally-port at c=61.0..63.0
                { xA: prisInX0,         yA: prisMidY, xB: 61.0 * TILE_SIZE, yB: prisMidY, isPrison: true },
                { xA: 63.0 * TILE_SIZE, yA: prisMidY, xB: prisInX1,         yB: prisMidY, isPrison: true }
            ],
            // Solid thick AABB barrier boxes: 100% impossible to tunnel through or exit-vehicle through along all walls!
            barrierBoxes: [
                // West Double-Fence Wall (58px thick solid barrier)
                { minX: 56.05 * TILE_SIZE, maxX: 56.98 * TILE_SIZE, minY: 76.05 * TILE_SIZE, maxY: 146.95 * TILE_SIZE },
                // East Double-Fence Wall (58px thick solid barrier blocking the entire East side & c=68 strip)
                { minX: 68.02 * TILE_SIZE, maxX: 68.95 * TILE_SIZE, minY: 76.05 * TILE_SIZE, maxY: 146.95 * TILE_SIZE },
                // South Double-Fence Wall (62px thick solid barrier)
                { minX: 56.05 * TILE_SIZE, maxX: 68.95 * TILE_SIZE, minY: 145.88 * TILE_SIZE, maxY: 146.95 * TILE_SIZE },
                // North-West & North-East Perimeter Walls
                { minX: 56.05 * TILE_SIZE, maxX: 60.85 * TILE_SIZE, minY: 76.05 * TILE_SIZE, maxY: 76.92 * TILE_SIZE },
                { minX: 63.15 * TILE_SIZE, maxX: 68.95 * TILE_SIZE, minY: 76.05 * TILE_SIZE, maxY: 76.92 * TILE_SIZE },
                // North Main Gatehouse Steel-Bar Vehicle Barrier (blocks 100% of cars/bikes; allows on-foot breach with 3★ alarm)
                { minX: 60.80 * TILE_SIZE, maxX: 63.20 * TILE_SIZE, minY: 76.08 * TILE_SIZE, maxY: 76.85 * TILE_SIZE, vehiclesOnly: true },
                // Internal Courtyard Divider Walls (y = 103.5) + Vehicle Barrier at center gate
                { minX: 56.05 * TILE_SIZE, maxX: 61.00 * TILE_SIZE, minY: 103.15 * TILE_SIZE, maxY: 103.85 * TILE_SIZE },
                { minX: 63.00 * TILE_SIZE, maxX: 68.95 * TILE_SIZE, minY: 103.15 * TILE_SIZE, maxY: 103.85 * TILE_SIZE },
                { minX: 60.95 * TILE_SIZE, maxX: 63.05 * TILE_SIZE, minY: 103.18 * TILE_SIZE, maxY: 103.82 * TILE_SIZE, vehiclesOnly: true }
            ],
            gates: [
                { x: 62.0 * TILE_SIZE, y: prisY0,   w: 2.4 * TILE_SIZE, boothX: 60.1 * TILE_SIZE, boothY: 76.5 * TILE_SIZE, label: "PENITENTIARY MAIN SALLY-PORT" },
                { x: 62.0 * TILE_SIZE, y: prisMidY, w: 2.0 * TILE_SIZE, boothX: 60.2 * TILE_SIZE, boothY: 103.5 * TILE_SIZE, label: "YARD SECURITY CHECKPOINT" }
            ],
            towers: [
                { x: 56.55 * TILE_SIZE, y: 76.6 * TILE_SIZE,  baseAng: 0.7 },
                { x: 68.45 * TILE_SIZE, y: 76.6 * TILE_SIZE,  baseAng: 2.4 },
                { x: 56.55 * TILE_SIZE, y: 103.5 * TILE_SIZE, baseAng: 0.2 },
                { x: 68.45 * TILE_SIZE, y: 103.5 * TILE_SIZE, baseAng: 2.8 },
                { x: 56.55 * TILE_SIZE, y: 124.5 * TILE_SIZE, baseAng: -0.2 },
                { x: 68.45 * TILE_SIZE, y: 124.5 * TILE_SIZE, baseAng: -2.8 },
                { x: 56.55 * TILE_SIZE, y: 146.3 * TILE_SIZE, baseAng: -0.7 },
                { x: 68.45 * TILE_SIZE, y: 146.3 * TILE_SIZE, baseAng: -2.4 }
            ]
        };

        // 10B) VCIA International Airport 3D Perimeter Security Fence, Guardhouse Checkpoints, Animated Boom Barriers & Tarmac Trespass Zone ("airportCompound")
        const airX0 = 64.25 * TILE_SIZE, airY0 = 299.25 * TILE_SIZE, airX1 = 165.75 * TILE_SIZE, airY1 = 368.75 * TILE_SIZE;
        this.airportCompound = {
            x0: airX0,
            y0: airY0,
            x1: airX1,
            y1: airY1,
            z: 2.0,
            spans: [
                // North Perimeter Fence (y = 299.25) with 5 road checkpoints
                { xA: airX0,             yA: airY0, xB: 75.8 * TILE_SIZE,  yB: airY0 },
                { xA: 78.2 * TILE_SIZE,  yA: airY0, xB: 109.8 * TILE_SIZE, yB: airY0 },
                { xA: 112.2 * TILE_SIZE, yA: airY0, xB: 125.6 * TILE_SIZE, yB: airY0 },
                { xA: 130.4 * TILE_SIZE, yA: airY0, xB: 147.8 * TILE_SIZE, yB: airY0 },
                { xA: 150.2 * TILE_SIZE, yA: airY0, xB: airX1,             yB: airY0 },
                // South Perimeter Fence (y = 368.75) with South Cargo Gate at c=126..130
                { xA: airX0,             yA: airY1, xB: 125.6 * TILE_SIZE, yB: airY1 },
                { xA: 130.4 * TILE_SIZE, yA: airY1, xB: airX1,             yB: airY1 },
                // West & East Continuous Perimeter Fences
                { xA: airX0,             yA: airY0, xB: airX0,             yB: airY1 },
                { xA: airX1,             yA: airY0, xB: airX1,             yB: airY1 }
            ],
            gates: [
                { x: 77.0 * TILE_SIZE,  y: airY0, w: 2.4 * TILE_SIZE, boothX: 75.1 * TILE_SIZE,  boothY: 300.2 * TILE_SIZE, guardAng: 0,       name: "WEST HANGAR GATE" },
                { x: 111.0 * TILE_SIZE, y: airY0, w: 2.4 * TILE_SIZE, boothX: 109.1 * TILE_SIZE, boothY: 300.2 * TILE_SIZE, guardAng: 0,       name: "CENTRAL APRON GATE" },
                { x: 128.0 * TILE_SIZE, y: airY0, w: 4.8 * TILE_SIZE, boothX: 124.8 * TILE_SIZE, boothY: 300.3 * TILE_SIZE, guardAng: 0,       name: "MAIN TERMINAL CHECKPOINT" },
                { x: 149.0 * TILE_SIZE, y: airY0, w: 2.4 * TILE_SIZE, boothX: 147.1 * TILE_SIZE, boothY: 300.2 * TILE_SIZE, guardAng: 0,       name: "EAST CARGO GATE" },
                { x: 128.0 * TILE_SIZE, y: airY1, w: 4.8 * TILE_SIZE, boothX: 124.8 * TILE_SIZE, boothY: 367.7 * TILE_SIZE, guardAng: Math.PI, name: "SOUTH RUNWAY CHECKPOINT" }
            ],
            patrolGuards: [
                { x: 79.0 * TILE_SIZE,  y: 300.6 * TILE_SIZE, dx: 0,  dy: 28, seed: 0.2 },
                { x: 113.0 * TILE_SIZE, y: 300.6 * TILE_SIZE, dx: 0,  dy: 28, seed: 1.5 },
                { x: 131.2 * TILE_SIZE, y: 300.6 * TILE_SIZE, dx: 26, dy: 0,  seed: 2.8 },
                { x: 151.0 * TILE_SIZE, y: 300.6 * TILE_SIZE, dx: 0,  dy: 28, seed: 4.1 },
                { x: 131.2 * TILE_SIZE, y: 367.4 * TILE_SIZE, dx: 26, dy: 0,  seed: 5.3 }
            ]
        };
        this.securityFenceSpans = [
            ...this.prisonCompound.spans,
            ...this.airportCompound.spans
        ];
        this.securityBarrierBoxes = [
            ...this.prisonCompound.barrierBoxes
        ];

        // 11) Vice Port, Port Gellhorn, Ambrosia Refinery & Island Marina Cargo Barges, Containers & Boats ("portTerminals")
        this.portTerminals = [
            // Deepwater Container Barges & Freighters (100% in clean open water gt=1)
            { kind: "BARGE",      c: 360.5, r: 302.5, ang: 0,              scale: 1.55 },
            { kind: "BARGE",      c: 362.5, r: 323.2, ang: Math.PI,        scale: 1.55 },
            { kind: "BARGE",      c: 362.5, r: 335.2, ang: 0,              scale: 1.60 },
            { kind: "BARGE",      c: 24.0,  r: 186.5, ang: Math.PI,        scale: 1.50 },
            { kind: "BARGE",      c: 38.0,  r: 209.5, ang: 0,              scale: 1.55 },
            { kind: "BARGE",      c: 38.0,  r: 253.5, ang: Math.PI,        scale: 1.55 },
            { kind: "BARGE",      c: 139.5, r: 100.5, ang: -Math.PI * 0.5, scale: 1.45 },
            { kind: "BARGE",      c: 137.0, r: 125.0, ang: Math.PI * 0.5,  scale: 1.45 },
            // Quayside Intermodal Container Stacks (aligned with 3D Gantry Cranes on the waterfront quay!)
            { kind: "CONTAINERS", c: 355.5, r: 323.2, ang: 0,              scale: 1.25 },
            { kind: "CONTAINERS", c: 355.5, r: 335.2, ang: 0,              scale: 1.25 },
            { kind: "CONTAINERS", c: 334.5, r: 332.8, ang: 0,              scale: 1.25 },
            { kind: "CONTAINERS", c: 339.0, r: 332.8, ang: 0,              scale: 1.25 },
            { kind: "CONTAINERS", c: 58.5,  r: 204.5, ang: Math.PI * 0.5,  scale: 1.25 },
            { kind: "CONTAINERS", c: 58.5,  r: 212.5, ang: Math.PI * 0.5,  scale: 1.25 },
            { kind: "CONTAINERS", c: 58.5,  r: 244.5, ang: Math.PI * 0.5,  scale: 1.25 },
            { kind: "CONTAINERS", c: 79.5,  r: 232.5, ang: Math.PI * 0.5,  scale: 1.25 },
            { kind: "CONTAINERS", c: 79.5,  r: 242.5, ang: Math.PI * 0.5,  scale: 1.25 },
            { kind: "CONTAINERS", c: 151.5, r: 107.5, ang: Math.PI * 0.5,  scale: 1.20 },
            { kind: "CONTAINERS", c: 152.5, r: 114.5, ang: Math.PI * 0.5,  scale: 1.20 },
            // Moored Harbor Yachts & Speedboats in clean water beside piers
            { kind: "YACHT",      c: 325.0, r: 305.0, ang: -Math.PI * 0.5, scale: 1.30 },
            { kind: "SPEEDBOAT",  c: 325.0, r: 312.0, ang: Math.PI * 0.5,  scale: 1.20 },
            { kind: "SPEEDBOAT",  c: 105.5, r: 100.2, ang: Math.PI,        scale: 1.20 },
            { kind: "YACHT",      c: 105.5, r: 105.2, ang: Math.PI,        scale: 1.25 },
            { kind: "YACHT",      c: 373.5, r: 116.0, ang: 0,              scale: 1.30 },
            { kind: "SPEEDBOAT",  c: 373.5, r: 121.2, ang: 0,              scale: 1.20 },
            { kind: "YACHT",      c: 379.5, r: 208.0, ang: 0,              scale: 1.30 },
            { kind: "SPEEDBOAT",  c: 379.5, r: 220.0, ang: 0,              scale: 1.20 },
            { kind: "YACHT",      c: 454.0, r: 394.0, ang: 0,              scale: 1.30 },
            { kind: "SPEEDBOAT",  c: 424.0, r: 426.0, ang: 0,              scale: 1.20 },
            { kind: "YACHT",      c: 396.0, r: 452.0, ang: 0,              scale: 1.30 },
            { kind: "SPEEDBOAT",  c: 329.0, r: 496.5, ang: Math.PI * 0.5,  scale: 1.20 },
            { kind: "YACHT",      c: 269.0, r: 496.5, ang: Math.PI * 0.5,  scale: 1.25 }
        ].map((p, i) => ({
            kind: p.kind,
            x: p.c * TILE_SIZE,
            y: p.r * TILE_SIZE,
            z: 2.0,
            ang: p.ang,
            scale: p.scale,
            seed: i * 2.3
        }));

        // 12) GTA 6 Grassrivers & Lake Leonida High-Speed Swamp Airboats ("evergladesAirboats")
        this.evergladesAirboats = [];
        const rawAirboats = [
            { c: 86.0,  r: 402.0, rx: 34, ry: 22, speed: 1.15 },
            { c: 145.0, r: 412.0, rx: 32, ry: 20, speed: 1.25 },
            { c: 76.0,  r: 434.0, rx: 28, ry: 18, speed: 1.20 },
            { c: 168.0, r: 454.0, rx: 30, ry: 18, speed: 1.18 },
            { c: 112.0, r: 138.0, rx: 28, ry: 24, speed: 1.22 },
            { c: 120.0, r: 184.0, rx: 30, ry: 24, speed: 1.16 },
            { c: 132.0, r: 258.0, rx: 26, ry: 18, speed: 1.20 }
        ];
        for (let ai = 0; ai < rawAirboats.length; ai++) {
            const ab = rawAirboats[ai];
            const sw = snapPxToCleanWater(ab.c * TILE_SIZE, ab.r * TILE_SIZE);
            if (sw) {
                this.evergladesAirboats.push({
                    x: sw.x,
                    y: sw.y,
                    z: 2.0,
                    rx: ab.rx,
                    ry: ab.ry,
                    speed: ab.speed,
                    seed: ai * 2.7
                });
            }
        }

        // 13) GTA 6 Trailer 1 "NINE 1 NINE" Sky-Banner Tow Planes ("bannerPlanes") & Moored Seaplanes ("mooredSeaplanes")
        this.bannerPlanes = [
            // Plane 1: Cruising N <-> S along the Vice Beach & Ocean Drive coastline
            { x0: 492 * TILE_SIZE, y0: 72 * TILE_SIZE,  x1: 492 * TILE_SIZE, y1: 356 * TILE_SIZE, z: 4.65, speed: 0.042, seed: 0.0 },
            // Plane 2: Cruising N <-> S over Biscayne Bay, Star Island & Vice Port
            { x0: 332 * TILE_SIZE, y0: 84 * TILE_SIZE,  x1: 332 * TILE_SIZE, y1: 344 * TILE_SIZE, z: 4.65, speed: 0.046, seed: 1.8 },
            // Plane 3: Cruising W <-> E across Lake Leonida, Wynwood & Club Nine 1 Nine
            { x0: 108 * TILE_SIZE, y0: 88 * TILE_SIZE,  x1: 468 * TILE_SIZE, y1: 88 * TILE_SIZE,  z: 4.75, speed: 0.038, seed: 3.4 }
        ];
        this.mooredSeaplanes = [
            { c: 101.5, r: 102.5, ang: 0 },
            { c: 336.0, r: 158.0, ang: Math.PI * 0.25 },
            { c: 376.5, r: 118.5, ang: -Math.PI * 0.5 },
            { c: 456.0, r: 396.5, ang: -Math.PI * 0.5 },
            { c: 396.0, r: 456.5, ang: 0 },
            { c: 190.0, r: 470.0, ang: 0 }
        ].map((sp, i) => ({
            x: sp.c * TILE_SIZE,
            y: sp.r * TILE_SIZE,
            z: 2.0,
            ang: sp.ang,
            seed: i * 1.9
        }));

        // 14) GTA 6 Street Takeovers / Sideshow Drift Donuts ("streetTakeovers" — ONLY in wide-open off-road plazas with zero buildings/doors/cars!)
        this.streetTakeovers = [
            { c: 224.5, r: 111.5, carSpr: "13", seed: 1.5 }, // Little Haiti Cultural Plaza Center
            { c: 64.5,  r: 177.5, carSpr: "1",  seed: 3.1 }, // Port Gellhorn Speedway Open Pit Apron
            { c: 150.5, r: 123.5, carSpr: "4",  seed: 0.0 }, // Ambrosia Refinery Open Concrete Yard
            { c: 336.5, r: 329.5, carSpr: "6",  seed: 4.4 }  // Vice Port Industrial Concrete Yard
        ].map((st) => ({
            x: st.c * TILE_SIZE,
            y: st.r * TILE_SIZE,
            z: 2.0,
            carSpr: st.carSpr,
            seed: st.seed
        }));

        // 15) Port Gellhorn Oval Dirt Speedway Stock-Car Race & Thrillbilly Mud Park Figure-8 Monster Mudders ("trackRacers")
        this.trackRacers = {
            speedway: {
                cx: 75.0 * TILE_SIZE,
                cy: 177.0 * TILE_SIZE,
                rx: 9.1 * TILE_SIZE,
                ry: 7.3 * TILE_SIZE,
                z: 2.0,
                cars: ["0", "1", "4", "6"]
            },
            mudPark: {
                cxW: 78.0 * TILE_SIZE,
                cxE: 102.0 * TILE_SIZE,
                cy:  464.0 * TILE_SIZE,
                rx:  10.0 * TILE_SIZE,
                ry:  8.5 * TILE_SIZE,
                z:   2.0,
                trucks: ["25", "27", "33", "21"]
            }
        };

        // 16) Leonida Keys, Ocean Drive Beachfront & Gator Island Thatched Tiki Bars ("tikiBars" — 100% open beach/island spots)
        this.tikiBars = [
            { c: 434.5, r: 395.5, ang: 0 },
            { c: 403.5, r: 427.5, ang: 0 },
            { c: 366.5, r: 455.5, ang: 0 },
            { c: 328.5, r: 477.5, ang: 0 },
            { c: 269.5, r: 477.5, ang: 0 },
            { c: 220.5, r: 477.5, ang: 0 },
            { c: 124.5, r: 108.5, ang: 0 },
            { c: 465.5, r: 155.5, ang: Math.PI * 0.5 },
            { c: 465.5, r: 185.5, ang: Math.PI * 0.5 },
            { c: 465.5, r: 225.5, ang: Math.PI * 0.5 },
            { c: 465.5, r: 282.5, ang: Math.PI * 0.5 },
            { c: 228.5, r: 108.5, ang: 0 }
        ].map((tb, ti) => ({
            x: tb.c * TILE_SIZE,
            y: tb.r * TILE_SIZE,
            z: 2.0,
            ang: tb.ang,
            seed: ti * 1.7
        }));

        // 17B) GTA 6 Leonida True 3D Volumetric Architectural Estates & Waterfront Mansions (23 Verified Estates across 7 Districts)
        // 1:1 Game Scale (TILE_SIZE = 64, vehicles = 58x28 px, peds = 24x24 px):
        // Multi-story 3D vertical walls + overhanging sloped/cantilevered roofs + pools, moored boats & drivable driveway cars!
        this.residentialHouses = [
            // =====================================================================
            // 1. STAR ISLAND BILLIONAIRE WATERFRONT ESTATES (3 Grand Estates)
            // =====================================================================
            {
                id: "star_vercetti_palazzo",
                name: "Villa de la Rosa — Star Island Grand Palazzo",
                district: "STAR ISLAND",
                kind: "mansion_star_island",
                c: 351.2, r: 166.5,
                x: 351.2 * TILE_SIZE, y: 166.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 1.0, hw: 142, hh: 84,
                pool: { dx: 0, dy: -136, scale: 0.90 },
                drivewayCars: [
                    { sprIdx: 0, dx: -82, dy: 168, ang: 0 },
                    { sprIdx: 6, dx: 82, dy: 168, ang: Math.PI }
                ],
                dockBoat: { spr: "speedboat_v8", dx: 180, dy: -180, ang: 0 }
            },
            {
                id: "star_south_palazzo",
                name: "Villa di Leonida — South Star Island Palazzo",
                district: "STAR ISLAND",
                kind: "mansion_star_island",
                c: 351.2, r: 181.5,
                x: 351.2 * TILE_SIZE, y: 181.5 * TILE_SIZE, z: 2.0,
                ang: Math.PI, scale: 1.0, hw: 142, hh: 84,
                pool: { dx: 0, dy: -136, scale: 0.90 },
                drivewayCars: [
                    { sprIdx: 4, dx: -82, dy: 168, ang: 0 },
                    { sprIdx: 1, dx: 82, dy: 168, ang: Math.PI }
                ],
                dockBoat: { spr: "speedboat_v8", dx: -160, dy: -220, ang: 0 }
            },
            {
                id: "star_southwest_modern",
                name: "Biscayne Bay Minimalist Glass Villa",
                district: "STAR ISLAND",
                kind: "mansion_modern_luxury",
                c: 338.8, r: 180.5,
                x: 338.8 * TILE_SIZE, y: 180.5 * TILE_SIZE, z: 2.0,
                ang: Math.PI, scale: 0.94, hw: 116, hh: 74,
                pool: { dx: 0, dy: -124, scale: 0.85 },
                drivewayCars: [
                    { sprIdx: 1, dx: -64, dy: 154, ang: 0 }
                ],
                dockBoat: { spr: "jetski_neon", dx: 150, dy: -180, ang: 0 }
            },

            // =====================================================================
            // 2. VENETIAN ISLES WATERFRONT VILLAS (4 Luxury Canal & Bay Estates)
            // =====================================================================
            {
                id: "venetian_north_villa_1",
                name: "San Marco Island Waterfront Villa",
                district: "VENETIAN ISLES",
                kind: "house_canal_villa",
                c: 393.5, r: 120.5,
                x: 393.5 * TILE_SIZE, y: 120.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.95, hw: 108, hh: 70,
                pool: { dx: 0, dy: -120, scale: 0.84 },
                drivewayCars: [
                    { sprIdx: 6, dx: -64, dy: 150, ang: 0 }
                ],
                dockBoat: { spr: "jetski_neon", dx: 0, dy: -220, ang: 0 }
            },
            {
                id: "venetian_north_modern",
                name: "Biscayne Island Contemporary Residence",
                district: "VENETIAN ISLES",
                kind: "mansion_modern_luxury",
                c: 400.2, r: 126.8,
                x: 400.2 * TILE_SIZE, y: 126.8 * TILE_SIZE, z: 2.0,
                ang: Math.PI, scale: 0.92, hw: 114, hh: 72,
                drivewayCars: [
                    { sprIdx: 0, dx: -64, dy: 152, ang: 0 }
                ],
                dockBoat: { spr: "speedboat_v8", dx: -160, dy: -160, ang: 0 }
            },
            {
                id: "venetian_south_palazzo",
                name: "Casa Bella — Belle Isle Grand Palazzo",
                district: "VENETIAN ISLES",
                kind: "mansion_star_island",
                c: 392.5, r: 206.8,
                x: 392.5 * TILE_SIZE, y: 206.8 * TILE_SIZE, z: 2.0,
                ang: Math.PI, scale: 0.95, hw: 136, hh: 80,
                pool: { dx: 0, dy: -128, scale: 0.86 },
                drivewayCars: [
                    { sprIdx: 0, dx: -76, dy: 164, ang: 0 }
                ],
                dockBoat: { spr: "speedboat_v8", dx: 0, dy: -220, ang: 0 }
            },
            {
                id: "venetian_south_villa",
                name: "Rivo Alto Canal Villa",
                district: "VENETIAN ISLES",
                kind: "house_canal_villa",
                c: 400.2, r: 206.8,
                x: 400.2 * TILE_SIZE, y: 206.8 * TILE_SIZE, z: 2.0,
                ang: Math.PI, scale: 0.95, hw: 108, hh: 70,
                drivewayCars: [
                    { sprIdx: 4, dx: -62, dy: 150, ang: 0 }
                ],
                dockBoat: { spr: "jetski_neon", dx: -150, dy: -180, ang: 0 }
            },

            // =====================================================================
            // 3. SOUTH BEACH & FLAMINGO PARK (3 Art Deco & Tropical Estates)
            // =====================================================================
            {
                id: "sobe_artdeco_villa_1",
                name: "Flamingo Court Tropical Art Deco Villa",
                district: "SOUTH BEACH",
                kind: "villa_art_deco",
                c: 441.0, r: 265.5,
                x: 441.0 * TILE_SIZE, y: 265.5 * TILE_SIZE, z: 2.0,
                ang: -Math.PI * 0.5, scale: 0.94, hw: 104, hh: 70,
                pool: { dx: 0, dy: -118, scale: 0.84 },
                drivewayCars: [
                    { sprIdx: 6, dx: 162, dy: 44, ang: Math.PI * 0.5 }
                ]
            },
            {
                id: "sobe_flamingo_bungalow",
                name: "Flamingo Park Pastel Conch Bungalow",
                district: "SOUTH BEACH",
                kind: "house_florida_bungalow",
                c: 431.0, r: 265.5,
                x: 431.0 * TILE_SIZE, y: 265.5 * TILE_SIZE, z: 2.0,
                ang: -Math.PI * 0.5, scale: 0.94, hw: 94, hh: 66,
                drivewayCars: [
                    { sprIdx: 13, dx: 156, dy: 46, ang: Math.PI * 0.5 }
                ]
            },
            {
                id: "sobe_artdeco_villa_2",
                name: "Meridian Avenue Streamline Moderne Villa",
                district: "SOUTH BEACH",
                kind: "villa_art_deco",
                c: 431.0, r: 235.5,
                x: 431.0 * TILE_SIZE, y: 235.5 * TILE_SIZE, z: 2.0,
                ang: -Math.PI * 0.5, scale: 0.94, hw: 104, hh: 70,
                drivewayCars: [
                    { sprIdx: 1, dx: 148, dy: 48, ang: Math.PI * 0.5 }
                ]
            },

            // =====================================================================
            // 4. NORTH VICE SHORES & GOLDEN GLADES LAGOON (3 Waterfront Villas)
            // =====================================================================
            {
                id: "shores_modern_villa",
                name: "Lagoon Overlook Modernist Glass Home",
                district: "NORTH VICE SHORES",
                kind: "mansion_modern_luxury",
                c: 149.0, r: 47.0,
                x: 149.0 * TILE_SIZE, y: 47.0 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.96, hw: 118, hh: 75,
                pool: { dx: 0, dy: -124, scale: 0.85 },
                drivewayCars: [
                    { sprIdx: 0, dx: -66, dy: 154, ang: 0 }
                ],
                dockBoat: { spr: "speedboat_v8", dx: -160, dy: -160, ang: 0 }
            },
            {
                id: "shores_canal_villa_1",
                name: "Pelican Bay Lagoon Waterfront Villa",
                district: "NORTH VICE SHORES",
                kind: "house_canal_villa",
                c: 159.0, r: 47.0,
                x: 159.0 * TILE_SIZE, y: 47.0 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.96, hw: 110, hh: 72,
                pool: { dx: 0, dy: -124, scale: 0.85 },
                drivewayCars: [
                    { sprIdx: 1, dx: -64, dy: 150, ang: 0 }
                ],
                dockBoat: { spr: "jetski_neon", dx: 0, dy: -220, ang: 0 }
            },
            {
                id: "shores_canal_villa_2",
                name: "Golden Glades Waterfront Residence",
                district: "NORTH VICE SHORES",
                kind: "house_canal_villa",
                c: 169.0, r: 47.0,
                x: 169.0 * TILE_SIZE, y: 47.0 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.96, hw: 110, hh: 72,
                pool: { dx: 0, dy: -124, scale: 0.85 },
                drivewayCars: [
                    { sprIdx: 4, dx: -64, dy: 150, ang: 0 }
                ]
            },

            // =====================================================================
            // 5. LITTLE HAITI & LITTLE HAVANA (4 Pastel Florida Bungalows & Villas)
            // =====================================================================
            {
                id: "haiti_bungalow_1",
                name: "Toussaint Louverture Pastel Conch Home",
                district: "LITTLE HAITI",
                kind: "house_florida_bungalow",
                c: 230.5, r: 83.5,
                x: 230.5 * TILE_SIZE, y: 83.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.94, hw: 94, hh: 66,
                drivewayCars: [
                    { sprIdx: 13, dx: -156, dy: 44, ang: Math.PI * 0.5 }
                ]
            },
            {
                id: "haiti_bungalow_2",
                name: "Kreyol Garden Tropical Bungalow",
                district: "LITTLE HAITI",
                kind: "house_florida_bungalow",
                c: 230.5, r: 91.5,
                x: 230.5 * TILE_SIZE, y: 91.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.94, hw: 94, hh: 66,
                drivewayCars: [
                    { sprIdx: 4, dx: -156, dy: 44, ang: Math.PI * 0.5 }
                ]
            },
            {
                id: "havana_bungalow_1",
                name: "Calle Ocho Coral Stucco Bungalow",
                district: "LITTLE HAVANA",
                kind: "house_florida_bungalow",
                c: 292.5, r: 183.5,
                x: 292.5 * TILE_SIZE, y: 183.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.94, hw: 94, hh: 66,
                drivewayCars: [
                    { sprIdx: 13, dx: -156, dy: 44, ang: Math.PI * 0.5 }
                ]
            },
            {
                id: "havana_artdeco_villa",
                name: "Domino Park Art Deco Residence",
                district: "LITTLE HAVANA",
                kind: "villa_art_deco",
                c: 297.5, r: 183.5,
                x: 297.5 * TILE_SIZE, y: 183.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.92, hw: 102, hh: 68,
                drivewayCars: [
                    { sprIdx: 1, dx: 162, dy: 44, ang: Math.PI * 0.5 }
                ]
            },

            // =====================================================================
            // 6. LAKE LEONIDA & GRASSRIVERS EVERGLADES (2 Bayou Stilted Shacks)
            // =====================================================================
            {
                id: "lake_bayou_shack",
                name: "Lake Leonida Cypress Bayou Hideout",
                district: "LAKE LEONIDA",
                kind: "shack_everglades_bayou",
                c: 94.0, r: 190.5,
                x: 94.0 * TILE_SIZE, y: 190.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.96, hw: 86, hh: 64,
                drivewayCars: [
                    { sprIdx: 25, dx: -52, dy: 152, ang: 0 }
                ],
                dockBoat: { spr: "airboat_gator", dx: 180, dy: 0, ang: 0 }
            },
            {
                id: "grassrivers_shack",
                name: "Grassrivers Swamp Stilted Cabin",
                district: "GRASSRIVERS",
                kind: "shack_everglades_bayou",
                c: 109.5, r: 388.5,
                x: 109.5 * TILE_SIZE, y: 388.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 0.96, hw: 86, hh: 64,
                drivewayCars: [
                    { sprIdx: 25, dx: -52, dy: 152, ang: 0 }
                ],
                dockBoat: { spr: "airboat_gator", dx: -160, dy: 120, ang: 0 }
            },

            // =====================================================================
            // 7. LEONIDA KEYS CARIBBEAN WATERFRONT STILT HOUSES (4 Conch Lodges)
            // =====================================================================
            {
                id: "keys_stilt_islamorada",
                name: "Islamorada Turquoise Water Stilt Lodge",
                district: "LEONIDA KEYS",
                kind: "house_keys_stilt",
                c: 368.5, r: 452.5,
                x: 368.5 * TILE_SIZE, y: 452.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 1.0, hw: 94, hh: 70,
                drivewayCars: [
                    { sprIdx: 25, dx: -56, dy: 156, ang: 0 }
                ],
                dockBoat: { spr: "jetski_neon", dx: 180, dy: -120, ang: Math.PI * 0.5 }
            },
            {
                id: "keys_stilt_marathon",
                name: "Marathon Key Reef-Side Conch House",
                district: "LEONIDA KEYS",
                kind: "house_keys_stilt",
                c: 330.5, r: 473.5,
                x: 330.5 * TILE_SIZE, y: 473.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 1.0, hw: 94, hh: 70,
                drivewayCars: [
                    { sprIdx: 1, dx: -56, dy: 156, ang: 0 }
                ],
                dockBoat: { spr: "speedboat_v8", dx: 180, dy: -120, ang: Math.PI * 0.5 }
            },
            {
                id: "keys_stilt_big_pine",
                name: "Big Pine Key Offshore Stilt Cabin",
                district: "LEONIDA KEYS",
                kind: "house_keys_stilt",
                c: 272.5, r: 474.5,
                x: 272.5 * TILE_SIZE, y: 474.5 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 1.0, hw: 94, hh: 70,
                drivewayCars: [
                    { sprIdx: 13, dx: -56, dy: 156, ang: 0 }
                ],
                dockBoat: { spr: "jetski_neon", dx: 180, dy: -120, ang: 0 }
            },
            {
                id: "keys_stilt_key_west",
                name: "Key West Sunset Conch Stilt Lodge",
                district: "LEONIDA KEYS",
                kind: "house_keys_stilt",
                c: 222.0, r: 475.0,
                x: 222.0 * TILE_SIZE, y: 475.0 * TILE_SIZE, z: 2.0,
                ang: 0, scale: 1.0, hw: 94, hh: 70,
                drivewayCars: [
                    { sprIdx: 25, dx: -56, dy: 156, ang: 0 }
                ],
                dockBoat: { spr: "speedboat_v8", dx: 180, dy: -120, ang: Math.PI * 0.5 }
            }
        ];

        // 16C) Initialize Unified 3D Volumetric World Object & Prefab Engine (validates road clearance, 1:1 scale & lot flora)
        this.objectEngine = typeof WorldObjectEngine !== "undefined" ? new WorldObjectEngine(this) : null;
        if (this.objectEngine) {
            this.objectEngine.validateAndPrepareLots();
        }
        try {
            if (window.ShopInteriors && Array.isArray(this.interiors)) {
                this.interiors = this.interiors.filter(intr => !intr.isShop || intr.id.startsWith("ESTATE_") || intr.id.startsWith("BIZ_"));
                window.ShopInteriors.snapLandmarkDoors(this);
                const shops = window.ShopInteriors.generate(this);
                for (const s of shops) this.interiors.push(s);
            }
        } catch (e) {
            console.warn("Post-CMP ShopInteriors generation failed:", e);
        }

        // 17) Ambrosia "Allied Crystal" 3D Refinery Smokestacks & Outlaw Biker Rally, Port Gellhorn Mini-Golf & Mount Kalaga Kayakers
        this.industrialAndParkDetails = {
            smokestacks: [
                { x: 155.5 * TILE_SIZE, y: 102.5 * TILE_SIZE, z: 5.0, seed: 0.0 },
                { x: 159.5 * TILE_SIZE, y: 102.5 * TILE_SIZE, z: 5.0, seed: 1.6 },
                { x: 156.5 * TILE_SIZE, y: 114.5 * TILE_SIZE, z: 5.0, seed: 3.2 }
            ],
            bikerRallies: [
                { x: 152.0 * TILE_SIZE, y: 128.5 * TILE_SIZE, z: 2.0, count: 5, seed: 0.5 }, // Ambrosia Sugar Refinery Biker Rally
                { x: 64.5 * TILE_SIZE,  y: 268.5 * TILE_SIZE, z: 2.0, count: 4, seed: 2.1 }  // Port Gellhorn Open Plaza Biker Hangout
            ],
            miniGolf: {
                x: 81.5 * TILE_SIZE,
                y: 264.5 * TILE_SIZE,
                z: 2.0
            },
            kayakers: [
                { x: 138.0 * TILE_SIZE, y: 34.0 * TILE_SIZE, rx: 46, ry: 18, z: 2.0, speed: 0.85, seed: 0.0 },
                { x: 142.0 * TILE_SIZE, y: 35.5 * TILE_SIZE, rx: 38, ry: 15, z: 2.0, speed: 0.92, seed: 2.2 },
                { x: 228.0 * TILE_SIZE, y: 34.0 * TILE_SIZE, rx: 52, ry: 20, z: 2.0, speed: 0.88, seed: 1.1 },
                { x: 224.0 * TILE_SIZE, y: 35.5 * TILE_SIZE, rx: 42, ry: 16, z: 2.0, speed: 0.95, seed: 3.5 }
            ]
        };

        // 18) Solid 3D OBB / AABB Collision Hulls for all Stationary Aviation, Marine, Port & World Props
        const pushPropOBB = (cx, cy, hw, hh, ang = 0) => {
            const cosA = Math.cos(ang);
            const sinA = Math.sin(ang);
            const ex = Math.abs(cosA) * hw + Math.abs(sinA) * hh;
            const ey = Math.abs(sinA) * hw + Math.abs(cosA) * hh;
            this.securityBarrierBoxes.push({
                cx,
                cy,
                hw,
                hh,
                cosA,
                sinA,
                minX: cx - ex,
                maxX: cx + ex,
                minY: cy - ey,
                maxY: cy + ey
            });
        };

        // 18A. Airport Widebody Airliners (Fuselage + Swept Wings/Engines + Tailplane), Executive Learjets & Helicopters
        for (const ap of this.airportProps) {
            const cs = Math.cos(ap.ang);
            const sn = Math.sin(ap.ang);
            const sc = ap.scale || 1.0;
            if (ap.kind === "AIRLINER") {
                pushPropOBB(ap.x, ap.y, 48 * sc, 9.5 * sc, ap.ang);
                pushPropOBB(ap.x - cs * 6 * sc, ap.y - sn * 6 * sc, 13 * sc, 43 * sc, ap.ang);
                pushPropOBB(ap.x - cs * 38 * sc, ap.y - sn * 38 * sc, 7 * sc, 21 * sc, ap.ang);
            } else if (ap.kind === "LEARJET") {
                pushPropOBB(ap.x, ap.y, 27 * sc, 6.5 * sc, ap.ang);
                pushPropOBB(ap.x - cs * 3 * sc, ap.y - sn * 3 * sc, 8 * sc, 24 * sc, ap.ang);
            } else if (ap.kind === "HELIPAD") {
                pushPropOBB(ap.x, ap.y, 26 * sc, 10 * sc, ap.ang);
            }
        }

        // 18B. Airport & Penitentiary Security Guardhouse Booths & Watchtowers
        for (const gt of this.airportCompound.gates) {
            if (gt.boothX && gt.boothY) pushPropOBB(gt.boothX, gt.boothY, 13, 10, 0);
        }
        for (const gt of this.prisonCompound.gates) {
            if (gt.boothX && gt.boothY) pushPropOBB(gt.boothX, gt.boothY, 17, 13, 0);
        }
        for (const tw of this.prisonCompound.towers) {
            pushPropOBB(tw.x, tw.y, 17, 17, 0);
        }

        // 18C. Port Terminals (Intermodal Container Stacks, Cargo Barges, Moored Yachts & Speedboats)
        for (const pt of this.portTerminals) {
            const sc = pt.scale || 1.0;
            if (pt.kind === "CONTAINERS") {
                pushPropOBB(pt.x, pt.y, 19 * sc, 8.5 * sc, pt.ang);
            } else if (pt.kind === "BARGE") {
                pushPropOBB(pt.x, pt.y, 53 * sc, 17 * sc, pt.ang);
            } else if (pt.kind === "YACHT") {
                pushPropOBB(pt.x, pt.y, 44 * sc, 16 * sc, pt.ang);
            } else if (pt.kind === "SPEEDBOAT") {
                pushPropOBB(pt.x, pt.y, 27 * sc, 12 * sc, pt.ang);
            }
        }

        // 18D. Moored Dodo Seaplanes, Superyacht Parties, Thatched Tiki Bars, Mini-Golf Windmill & Outlaw Biker Chopper Lineups
        for (const mp of this.mooredSeaplanes) {
            const cs = Math.cos(mp.ang);
            const sn = Math.sin(mp.ang);
            pushPropOBB(mp.x, mp.y, 28 * 1.18, 17 * 1.18, mp.ang);
            pushPropOBB(mp.x + cs * 2, mp.y + sn * 2, 8 * 1.18, 27 * 1.18, mp.ang);
        }
        if (Array.isArray(this.yachtParties)) {
            for (const yp of this.yachtParties) {
                pushPropOBB(yp.x, yp.y, 45, 16, yp.angle || 0);
            }
        }
        for (const tb of this.tikiBars) {
            pushPropOBB(tb.x, tb.y, 26, 18, tb.ang || 0);
        }
        if (Array.isArray(this.beachProps)) {
            for (const bp of this.beachProps) {
                if (bp.spr && bp.spr.startsWith("lifeguard_")) {
                    pushPropOBB(bp.x, bp.y, 24, 22, bp.angle || 0);
                }
            }
        }
        if (Array.isArray(this.muscleBeachGyms)) {
            for (const gym of this.muscleBeachGyms) {
                pushPropOBB(gym.x, gym.y, 22, 18, 0);
            }
        }
        if (this.industrialAndParkDetails.miniGolf) {
            pushPropOBB(this.industrialAndParkDetails.miniGolf.x, this.industrialAndParkDetails.miniGolf.y, 18, 18, 0);
        }
        // NOTE: Open-air animated pedestrian/biker scenes (bikerRallies, streetTakeovers, streetEvents, beachParties, etc.)
        // intentionally have ZERO solid collision boxes in securityBarrierBoxes so the player can drive through and
        // physically run over / scatter the participants! Vehicle spawners use this.isInsideLivingEventZone(x, y) instead.

        // 18D-2. 3D Landmarks & Monuments Solid OBB Collision Hulls (Launchpad, ATC Tower, Water Tower, Pier Arch Pylons, Ferris Wheel & Gantry Legs)
        pushPropOBB(465.0 * TILE_SIZE, 35.0 * TILE_SIZE, 78, 78, 0);              // SERA Launchpad MLP & Umbilical Tower
        pushPropOBB(460.8 * TILE_SIZE, 35.0 * TILE_SIZE, 28, 36, 0);              // SERA Launch Control Bunker
        pushPropOBB(106.5 * TILE_SIZE, 307.5 * TILE_SIZE, 38, 38, 0);             // VCIA 3D Air Traffic Control Tower
        pushPropOBB(148.5 * TILE_SIZE, 118.5 * TILE_SIZE, 32, 32, 0);             // Kelly County 3D Water Tower
        pushPropOBB(148.5 * TILE_SIZE + 54, 118.5 * TILE_SIZE, 14, 14, 0);        // Kelly County 3D Radio Mast
        pushPropOBB(456.5 * TILE_SIZE, 194.5 * TILE_SIZE - 42, 16, 16, 0);        // Vice Beach Pier Arch North Pylon (road stays open!)
        pushPropOBB(456.5 * TILE_SIZE, 194.5 * TILE_SIZE + 42, 16, 16, 0);        // Vice Beach Pier Arch South Pylon (road stays open!)
        pushPropOBB(464.5 * TILE_SIZE, 194.5 * TILE_SIZE - 20, 42, 8, 0);         // Vice Beach Ferris Wheel North A-Frame Base
        pushPropOBB(464.5 * TILE_SIZE, 194.5 * TILE_SIZE + 20, 42, 8, 0);         // Vice Beach Ferris Wheel South A-Frame Base
        pushPropOBB(199.5 * TILE_SIZE, 476.5 * TILE_SIZE, 24, 24, 0);             // Key West Lighthouse
        pushPropOBB(464.5 * TILE_SIZE, 134.5 * TILE_SIZE, 24, 24, 0);             // Cape Leonida Lighthouse
        pushPropOBB(118.5 * TILE_SIZE, 293.5 * TILE_SIZE, 82, 22, 0);             // VCIA Colossal 3D "VICE" Welcome Sign
        pushPropOBB(135.5 * TILE_SIZE, 23.5 * TILE_SIZE, 26, 26, 0);              // Mount Kalaga 3D Fire Lookout Tower
        pushPropOBB(135.5 * TILE_SIZE - 56, 23.5 * TILE_SIZE + 8, 30, 22, 0);     // Mount Kalaga Ranger Cabin
        pushPropOBB(160.5 * TILE_SIZE, 109.0 * TILE_SIZE, 68, 26, 0);             // Ambrosia "Allied Crystal" 3D Sugar Silos
        pushPropOBB(116.5 * TILE_SIZE - 36, 398.5 * TILE_SIZE - 12, 26, 13, 0);   // Grassrivers Giant 3D Roadside Gator Statue
        pushPropOBB(204.2 * TILE_SIZE, 476.5 * TILE_SIZE, 16, 16, 0);             // Key West Southernmost Point 3D Buoy Monument
        const gantryLocs = [
            { x: 359.4 * TILE_SIZE, y: 322.8 * TILE_SIZE },
            { x: 359.4 * TILE_SIZE, y: 335.4 * TILE_SIZE },
            { x: 57.2 * TILE_SIZE,  y: 208.5 * TILE_SIZE },
            { x: 57.2 * TILE_SIZE,  y: 243.5 * TILE_SIZE }
        ];
        for (const gl of gantryLocs) {
            pushPropOBB(gl.x - 24, gl.y - 26, 7, 7, 0);
            pushPropOBB(gl.x + 24, gl.y - 26, 7, 7, 0);
            pushPropOBB(gl.x - 24, gl.y + 26, 7, 7, 0);
            pushPropOBB(gl.x + 24, gl.y + 26, 7, 7, 0);
        }

        // 18E. GTA 6 Leonida Residential Estates & Waterfront Mansions Solid OBB Collision Hulls (exact 3D wall footprint, no roof overhang spill)
        if (Array.isArray(this.residentialHouses)) {
            for (const h of this.residentialHouses) {
                const sc = h.scale || 1.0;
                const spec = (this.objectEngine && typeof this.objectEngine.getPrefab === "function")
                    ? this.objectEngine.getPrefab(h.kind)
                    : null;
                const wallHw = spec ? (spec.w1 * 0.5 * sc) : (h.hw * 0.88);
                const wallHh = spec ? (spec.d1 * 0.5 * sc) : (h.hh * 0.88);
                pushPropOBB(h.x, h.y, wallHw, wallHh, h.ang);
                // Clear any overlapping flora within the house boundary + front yard
                const clearRad = Math.max(wallHw, wallHh) + 20;
                if (Array.isArray(this.vicePalms)) {
                    this.vicePalms = this.vicePalms.filter(p => Math.hypot(p.x - h.x, p.y - h.y) > clearRad);
                }
                if (Array.isArray(this.trees)) {
                    this.trees = this.trees.filter(t => Math.hypot(t.x - h.x, t.y - h.y) > clearRad);
                }
            }
        }

        // 4. Build GTA 2 Style 3D Curb Streetlamps (this.streetlights), 3-Phase Junction Traffic Signals (this.trafficSignals) & Vice City Streetscape Details
        this.streetlights = [];
        this.trafficSignals = [];
        this.viceStreetDetails = [];
        const urbanSigMinX = MAP_X_256[102], urbanSigMaxX = MAP_X_256[226];
        const urbanSigMinY = MAP_Y_256[34],  urbanSigMaxY = MAP_Y_256[204];
        const oceanDriveW = MAP_X_256[213],  oceanDriveE = MAP_X_256[218];

        for (let r = 3; r < MAP_ROWS - 3; r++) {
            for (let c = 3; c < MAP_COLS - 3; c++) {
                if (this.isRestrictedNoTrafficZone(c, r)) continue;
                const idx = r * MAP_COLS + c;
                if (this.surfaceGround[idx] !== GROUND_TYPE.PAWEMENT) continue;
                if (this.coastalSandMask[idx]) continue;

                const eRoad = this.surfaceGround[r * MAP_COLS + (c + 1)] === GROUND_TYPE.ROAD;
                const wRoad = this.surfaceGround[r * MAP_COLS + (c - 1)] === GROUND_TYPE.ROAD;
                const sRoad = this.surfaceGround[(r + 1) * MAP_COLS + c] === GROUND_TYPE.ROAD;
                const nRoad = this.surfaceGround[(r - 1) * MAP_COLS + c] === GROUND_TYPE.ROAD;
                const roadCount = (eRoad ? 1 : 0) + (wRoad ? 1 : 0) + (sRoad ? 1 : 0) + (nRoad ? 1 : 0);

                // Signalized Urban Intersections (1 NS + 1 EW gantry per intersection; check per-avenue distance so Collins Ave doesn't suppress Ocean Drive!)
                const isUrbanSignalZone = (c >= urbanSigMinX && c <= urbanSigMaxX && r >= urbanSigMinY && r <= urbanSigMaxY);
                if (isUrbanSignalZone && roadCount === 2 && eRoad && (sRoad || nRoad)) {
                    const dcCorner = 1;
                    const drCorner = sRoad ? 1 : -1;
                    // NW corner (eRoad && sRoad) -> 1 NS signal; SW corner (eRoad && nRoad) -> 1 EW signal
                    const isNS = sRoad;
                    const axis = isNS ? "NS" : "EW";
                    const tooClose = this.trafficSignals.some(
                        ts => ts.axis === axis && Math.abs(ts.c - c) < 7 && Math.abs(ts.r - r) < 6
                    );
                    if (!tooClose) {
                        const surfZ = this.surfaceLayer[idx] || 2.0;
                        const baseX = (c + 0.5) * TILE_SIZE + dcCorner * 18.0;
                        const baseY = (r + 0.5) * TILE_SIZE + drCorner * 18.0;
                        const dirX = isNS ? dcCorner : 0;
                        const dirY = isNS ? 0 : drCorner;
                        const headX = baseX + dirX * 32.0;
                        const headY = baseY + dirY * 32.0;
                        const armAngle = isNS ? 0 : (drCorner > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
                        this.trafficSignals.push({
                            c,
                            r,
                            baseX,
                            baseY,
                            headX,
                            headY,
                            dirX,
                            dirY,
                            z: surfZ,
                            armAngle,
                            axis
                        });
                        continue;
                    }
                }

                // Only place streetlamps along straight mid-block sidewalk curbs (1 road neighbor, never near corners or crosswalks!)
                if (roadCount !== 1) continue;
                // Exclude wilderness/swamp/mountain zones
                if (c < MAP_X_256[36] || (c < MAP_X_256[96] && r > MAP_Y_256[185]) || (c < MAP_X_256[105] && r < MAP_Y_256[42])) continue;

                let dc = 0, dr = 0;
                if (eRoad) dc = 1;
                else if (wRoad) dc = -1;
                else if (sRoad) dr = 1;
                else if (nRoad) dr = -1;

                // Never place a streetlamp right next to an intersection stop-line (stopLineMask) or intersection interior (lid 25)
                const roadLid = this.getBlockInfo(c + dc, r + dr, 1).lid;
                const isRoadStopLine = this.stopLineMask && this.stopLineMask[(r + dr) * MAP_COLS + (c + dc)] === 1;
                if (roadLid === 24 || roadLid === 25 || isRoadStopLine) continue;

                const isVerticalCurb = dc !== 0;
                // Ensure this sidewalk tile is truly mid-block (at least 1 straight sidewalk tile on each side along the curb)
                const prevC = isVerticalCurb ? c : c - 1;
                const prevR = isVerticalCurb ? r - 1 : r;
                const nextC = isVerticalCurb ? c : c + 1;
                const nextR = isVerticalCurb ? r + 1 : r;
                if (
                    this.surfaceGround[prevR * MAP_COLS + prevC] !== GROUND_TYPE.PAWEMENT ||
                    this.surfaceGround[nextR * MAP_COLS + nextC] !== GROUND_TYPE.PAWEMENT ||
                    this.getBlockInfo(prevC + dc, prevR + dr, 1).lid === 24 ||
                    this.getBlockInfo(nextC + dc, nextR + dr, 1).lid === 24 ||
                    (this.stopLineMask && this.stopLineMask[(prevR + dr) * MAP_COLS + (prevC + dc)] === 1) ||
                    (this.stopLineMask && this.stopLineMask[(nextR + dr) * MAP_COLS + (nextC + dc)] === 1)
                ) {
                    continue;
                }

                // On horizontal cross-streets, only place streetlamps on the North sidewalk (dr > 0) so narrow cross-blocks aren't doubled up
                if (!isVerticalCurb && dr < 0) continue;

                // Realistic urban spacing (7 tiles on Ocean Drive, 9 tiles on avenues) with staggered quinconce offset on opposite curbs!
                const isOceanDriveCurb = (c === oceanDriveW || c === oceanDriveE) && r >= urbanSigMinY && r <= urbanSigMaxY;
                const spacing = isOceanDriveCurb ? 7 : 9;
                const sideOffset = (dc < 0 || dr < 0) ? Math.floor(spacing * 0.5) : 0;
                const coordAlong = isVerticalCurb ? r : c;
                if (((coordAlong + sideOffset) % spacing) !== 2) continue;

                // Never crowd a traffic signal or another nearby streetlamp
                if (this.trafficSignals.some(ts => Math.hypot(ts.c - c, ts.r - r) < 4.2)) continue;
                if (this.streetlights.some(sl => Math.hypot(sl.c - c, sl.r - r) < 4.5)) continue;

                const surfZ = this.surfaceLayer[idx] || 2.0;
                // Position base near the curb edge of the sidewalk (+22px toward road), overhanging luminaire head +18px out over the street
                const baseX = (c + 0.5) * TILE_SIZE + dc * 22.0;
                const baseY = (r + 0.5) * TILE_SIZE + dr * 22.0;
                const headX = baseX + dc * 18.0;
                const headY = baseY + dr * 18.0;
                const armAngle = Math.atan2(dr, dc);

                // District-authentic GTA 2 / Vice City warm yellow/sodium streetlamp style
                let style = "BOULEVARD_GOLD";
                let colorType = "AMBER";
                if (c >= MAP_X_256[202] && c <= MAP_X_256[223]) {
                    style = "ART_DECO_NEON";
                    colorType = "AMBER";
                } else if (c >= MAP_X_256[152] && c <= MAP_X_256[201]) {
                    style = "STAR_RESORT";
                    colorType = "GOLD";
                } else if (c < MAP_X_256[95] || r >= MAP_Y_256[205]) {
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

        // Add Ornamental Streetlamps along the 3 Wooden Ocean Piers
        for (const pierR of [MAP_Y_256[45], MAP_Y_256[88], MAP_Y_256[154]]) {
            for (let c = MAP_X_256[233]; c <= MAP_X_256[245]; c += 6) {
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
                        colorType: "AMBER"
                    });
                }
            }
        }

        // Deep-Dive Vice City Architectural Streetscape Props:
        // A. Ocean Drive Art Deco Sidewalk Café Parasols (West sidewalk directly in front of 3D Art Deco hotels)
        for (let r = MAP_Y_256[42]; r <= MAP_Y_256[194]; r += 3) {
            if (this.surfaceGround[r * MAP_COLS + oceanDriveW] !== GROUND_TYPE.PAWEMENT) continue;
            // Only place café parasols directly in front of actual 3D Ocean Drive buildings (never in front of parks or roads!)
            if (this.surfaceGround[r * MAP_COLS + (oceanDriveW - 1)] !== GROUND_TYPE.BUILDING) continue;
            if (this.getBlockInfo(oceanDriveW, r, 1)?.lid === 69) continue;
            this.viceStreetDetails.push({
                kind: "CAFE_TABLE",
                x: (oceanDriveW + 0.22) * TILE_SIZE,
                y: (r + 0.5) * TILE_SIZE,
                z: 2.0,
                theme: ((r >> 1) % 2 === 0) ? "PINK" : "CYAN"
            });
        }

        // B. Española Way Overhead Mediterranean Bistro Light Strings
        const espanolaY = my256(106.5);
        for (let c = 414; c <= oceanDriveW - 1; c += 2) {
            this.viceStreetDetails.push({
                kind: "BISTRO_STRING",
                x: (c + 0.5) * TILE_SIZE,
                y: espanolaY * TILE_SIZE,
                z: 2.0,
                theme: (c % 4 === 0) ? "PINK" : "AMBER"
            });
        }

        // 16 Official GTA 6 (State of Leonida & Vice City) Bespoke Landmarks
        this.landmarks = this.buildGta6Landmarks();

        // 17. Filter this.vicePalms so flora never spawns inside volleyball courts, sunbathers, ramps, gym equipment or road/water tiles
        if (this.vicePalms && this.vicePalms.length > 0) {
            this.vicePalms = this.vicePalms.filter(pm => {
                const c = Math.floor(pm.x / TILE_SIZE);
                const r = Math.floor(pm.y / TILE_SIZE);
                if (c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS) {
                    const gt = this.surfaceGround[r * MAP_COLS + c];
                    if (gt === GROUND_TYPE.ROAD || gt === GROUND_TYPE.WATER || gt === GROUND_TYPE.BUILDING) return false;
                    // STRICT BEACH SAND BAN: Never allow any tree or shrub on open Atlantic sand (c >= 454) or beach sand blocks
                    if (c >= 454 && c <= 485 && r <= 390) return false;
                    const blk = this.getBlockInfo(c, r, 1);
                    if (blk && (blk.lid >= 98 && blk.lid <= 101) && c >= 454) return false;
                }
                if (this.beachVolleyballCourts) {
                    for (let i = 0; i < this.beachVolleyballCourts.length; i++) {
                        const vc = this.beachVolleyballCourts[i];
                        const dx = pm.x - vc.x, dy = pm.y - vc.y;
                        if (dx * dx + dy * dy < 56 * 56) return false;
                    }
                }
                if (this.beachSunbathers) {
                    for (let i = 0; i < this.beachSunbathers.length; i++) {
                        const sb = this.beachSunbathers[i];
                        const dx = pm.x - sb.x, dy = pm.y - sb.y;
                        if (dx * dx + dy * dy < 36 * 36) return false;
                    }
                }
                if (this.beachProps) {
                    for (let i = 0; i < this.beachProps.length; i++) {
                        const bp = this.beachProps[i];
                        const dx = pm.x - bp.x, dy = pm.y - bp.y;
                        if (dx * dx + dy * dy < 28 * 28) return false;
                    }
                }
                if (this.beachUmbrellas) {
                    for (let i = 0; i < this.beachUmbrellas.length; i++) {
                        const bu = this.beachUmbrellas[i];
                        const dx = pm.x - bu.x, dy = pm.y - bu.y;
                        if (dx * dx + dy * dy < 28 * 28) return false;
                    }
                }
                if (this.muscleBeachGyms) {
                    for (let i = 0; i < this.muscleBeachGyms.length; i++) {
                        const mg = this.muscleBeachGyms[i];
                        const dx = pm.x - mg.x, dy = pm.y - mg.y;
                        if (dx * dx + dy * dy < 38 * 38) return false;
                    }
                }
                if (this.stuntRamps) {
                    for (let i = 0; i < this.stuntRamps.length; i++) {
                        const sr = this.stuntRamps[i];
                        const dx = pm.x - sr.x, dy = pm.y - sr.y;
                        if (dx * dx + dy * dy < 42 * 42) return false;
                    }
                }
                if (this.viceStreetDetails) {
                    for (let i = 0; i < this.viceStreetDetails.length; i++) {
                        const sd = this.viceStreetDetails[i];
                        const dx = pm.x - sd.x, dy = pm.y - sd.y;
                        if (dx * dx + dy * dy < 28 * 28) return false;
                    }
                }
                if (this.airportProps) {
                    for (let i = 0; i < this.airportProps.length; i++) {
                        const ap = this.airportProps[i];
                        const dx = pm.x - ap.x, dy = pm.y - ap.y;
                        if (dx * dx + dy * dy < 68 * 68) return false;
                    }
                }
                if (this.streetTakeovers) {
                    for (let i = 0; i < this.streetTakeovers.length; i++) {
                        const st = this.streetTakeovers[i];
                        const dx = pm.x - st.x, dy = pm.y - st.y;
                        if (dx * dx + dy * dy < 72 * 72) return false;
                    }
                }
                if (this.tikiBars) {
                    for (let i = 0; i < this.tikiBars.length; i++) {
                        const tb = this.tikiBars[i];
                        const dx = pm.x - tb.x, dy = pm.y - tb.y;
                        if (dx * dx + dy * dy < 42 * 42) return false;
                    }
                }
                if (this.interiors) {
                    for (let i = 0; i < this.interiors.length; i++) {
                        const intr = this.interiors[i];
                        const dx = pm.x - intr.doorX, dy = pm.y - intr.doorY;
                        if (dx * dx + dy * dy < 48 * 48) return false;
                    }
                }
                const payphoneSpots = [
                    [443.5 * TILE_SIZE, 285.5 * TILE_SIZE],
                    [443.5 * TILE_SIZE, 284.5 * TILE_SIZE],
                    [448.5 * TILE_SIZE, 293.5 * TILE_SIZE],
                    [448.5 * TILE_SIZE, 292.5 * TILE_SIZE],
                    [344.5 * TILE_SIZE, 171.5 * TILE_SIZE],
                    [68.5 * TILE_SIZE, 187.5 * TILE_SIZE]
                ];
                for (let i = 0; i < payphoneSpots.length; i++) {
                    const dx = pm.x - payphoneSpots[i][0], dy = pm.y - payphoneSpots[i][1];
                    if (dx * dx + dy * dy < 58 * 58) return false;
                }
                return true;
            });

            if (Array.isArray(this.trees) && this.trees.length > 0) {
                const payphoneSpots = [
                    [443.5 * TILE_SIZE, 285.5 * TILE_SIZE],
                    [443.5 * TILE_SIZE, 284.5 * TILE_SIZE],
                    [448.5 * TILE_SIZE, 293.5 * TILE_SIZE],
                    [448.5 * TILE_SIZE, 292.5 * TILE_SIZE],
                    [344.5 * TILE_SIZE, 171.5 * TILE_SIZE],
                    [68.5 * TILE_SIZE, 187.5 * TILE_SIZE]
                ];
                this.trees = this.trees.filter(tr => {
                    for (let i = 0; i < payphoneSpots.length; i++) {
                        if (Math.hypot(tr.x - payphoneSpots[i][0], tr.y - payphoneSpots[i][1]) < 58) return false;
                    }
                    return true;
                });
            }

            // Rebuild O(1) Spatial Hash Grid for Leonida Flora & Tree Trunks
            this.floraGrid = new Map();
            for (let pi = 0; pi < this.vicePalms.length; pi++) {
                const pm = this.vicePalms[pi];
                const fbx = Math.floor(pm.x / TILE_SIZE);
                const fby = Math.floor(pm.y / TILE_SIZE);
                const fkey = (fby << 16) | (fbx & 0xffff);
                let cell = this.floraGrid.get(fkey);
                if (!cell) {
                    cell = [];
                    this.floraGrid.set(fkey, cell);
                }
                cell.push(pm);
            }
        }

        if (districtsMeta && Array.isArray(districtsMeta)) {
            this.districts = districtsMeta;
        }
    }

    buildGta6Landmarks() {
        const landmarksList = [
            {
                id: "VICE_BEACH",
                short: "VICE BEACH",
                shortName: "VICE BEACH & PIER",
                name: "🏖️ VICE BEACH, LUMMUS PARK & OCEAN PIER",
                sub: "S-CURVING GOLDEN SAND BEACH, 8 LIFEGUARD TOWERS, LUMMUS PARK & WOODEN PIER — +50 ARMOR!",
                district: "VICE BEACH & SOUTH POINT PIER",
                bx: mx256(225.5),
                by: my256(154.0),
                x: mx256(225.5) * TILE_SIZE,
                y: my256(154.0) * TILE_SIZE,
                color: "#facc15",
                perk: "ARMOR",
                visited: false
            },
            {
                id: "STAR_ISLAND_HOMES",
                short: "STAR MANSIONS",
                shortName: "STAR ISLAND MANSIONS",
                name: "🏛️ STAR ISLAND WATERFRONT PALAZZO",
                sub: "VILLA DE LA ROSA: BILLIONAIRE WATERFRONT ESTATE, PRIVATE PIER, SPEEDBOAT & SUPERCARS!",
                district: "BISCAYNE BAY — STAR ISLAND",
                bx: 351.2,
                by: 169.8,
                x: 351.2 * TILE_SIZE,
                y: 169.8 * TILE_SIZE,
                color: "#e879f9",
                perk: "ESTATE",
                visited: false
            },
            {
                id: "SOBE_RESIDENTIAL",
                short: "SOBE VILLAS",
                shortName: "SOUTH BEACH VILLAS",
                name: "🌴 SOUTH BEACH OCEANFRONT LUXURY VILLA",
                sub: "CONTEMPORARY ULTRA-LUXURY MIAMI BEACH ESTATE MINUTES FROM OCEAN DRIVE — 100% HEALTH!",
                district: "SOUTH BEACH — RESIDENTIAL DISTRICT",
                bx: 441.0,
                by: 269.2,
                x: 441.0 * TILE_SIZE,
                y: 269.2 * TILE_SIZE,
                color: "#34d399",
                perk: "HEAL",
                visited: false
            },
            {
                id: "KEYS_STILT_LODGE",
                short: "KEYS STILT HOMES",
                shortName: "LEONIDA KEYS STILT HOMES",
                name: "🌊 LEONIDA KEYS WATERFRONT STILT LODGE",
                sub: "CARIBBEAN-STYLE STILT HOUSE ELEVATED OVER TURQUOISE WATER WITH MOORED JET SKI!",
                district: "LEONIDA KEYS",
                bx: 368.0,
                by: 456.0,
                x: 368.0 * TILE_SIZE,
                y: 456.0 * TILE_SIZE,
                color: "#38bdf8",
                perk: "ESTATE",
                visited: false
            },
            {
                id: "HOTEL_DIXON",
                short: "HOTEL DIXON",
                shortName: "HOTEL DIXON",
                name: "🏨 HOTEL DIXON & OCEAN DRIVE",
                sub: "ICONIC VICE CITY NEON ART DECO HOTEL FACING LUMMUS PARK — 100% HEALTH!",
                district: "SOUTH BEACH — OCEAN DRIVE",
                bx: mx256(213.5),
                by: my256(146.0),
                x: mx256(213.5) * TILE_SIZE,
                y: my256(146.0) * TILE_SIZE,
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
                bx: mx256(208.5),
                by: my256(106.5),
                x: mx256(208.5) * TILE_SIZE,
                y: my256(106.5) * TILE_SIZE,
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
                bx: mx256(213.5),
                by: my256(48.0),
                x: mx256(213.5) * TILE_SIZE,
                y: my256(48.0) * TILE_SIZE,
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
                bx: mx256(224.5),
                by: my256(20.5),
                x: mx256(224.5) * TILE_SIZE,
                y: my256(20.5) * TILE_SIZE,
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
                bx: mx256(173.0),
                by: my256(106.5),
                x: mx256(173.0) * TILE_SIZE,
                y: my256(106.5) * TILE_SIZE,
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
                bx: mx256(171.5),
                by: my256(164.5),
                x: mx256(171.5) * TILE_SIZE,
                y: my256(164.5) * TILE_SIZE,
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
                bx: mx256(116.0),
                by: my256(105.0),
                x: mx256(116.0) * TILE_SIZE,
                y: my256(105.0) * TILE_SIZE,
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
                bx: mx256(141.5),
                by: my256(116.5),
                x: mx256(141.5) * TILE_SIZE,
                y: my256(116.5) * TILE_SIZE,
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
                bx: mx256(115.5),
                by: my256(82.5),
                x: mx256(115.5) * TILE_SIZE,
                y: my256(82.5) * TILE_SIZE,
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
                bx: mx256(77.5),
                by: my256(75.0),
                x: mx256(77.5) * TILE_SIZE,
                y: my256(75.0) * TILE_SIZE,
                color: "#2dd4bf",
                perk: "ARMOR",
                visited: false
            },
            {
                id: "MOUNT_KALAGA",
                short: "VICE SHORES",
                shortName: "NORTH VICE SHORES",
                name: "🌴 NORTH VICE SHORES & GOLDEN GLADES LAGOONS",
                sub: "3 CRYSTAL TURQUOISE RESORT LAGOONS, FLAMINGO COVES & SCENIC NORTH BOULEVARD — 100% HP!",
                district: "NORTH VICE SHORES & GOLDEN GLADES",
                bx: mx256(84.5),
                by: my256(25.5),
                x: mx256(84.5) * TILE_SIZE,
                y: my256(25.5) * TILE_SIZE,
                color: "#a3e635",
                perk: "HEAL",
                visited: false
            },
            {
                id: "PENITENTIARY",
                short: "PRISON",
                shortName: "LEONIDA PENITENTIARY",
                name: "🚨 LEONIDA STATE PENITENTIARY (KELLY COUNTY)",
                sub: "MAXIMUM-SECURITY PRISON FORTRESS, 8 GUARD WATCHTOWERS, ORANGE-JUMPSUIT INMATES & EXERCISE YARD!",
                district: "LEONIDA STATE PENITENTIARY",
                bx: 62.0,
                by: 75.2,
                x: 62.0 * TILE_SIZE,
                y: 75.2 * TILE_SIZE,
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
                bx: mx256(47.0),
                by: my256(113.5),
                x: mx256(47.0) * TILE_SIZE,
                y: my256(113.5) * TILE_SIZE,
                color: "#fb923c",
                perk: "REPAIR_CLEAR",
                visited: false
            },
            {
                id: "VCIA_AIRPORT",
                short: "VCIA AIRPORT",
                shortName: "VCIA INT'L AIRPORT",
                name: "✈️ VCIA INT'L AIRPORT (DUAL RUNWAYS & JET)",
                sub: "FENCED RESTRICTED TARMAC, SECURITY CHECKPOINTS, CROSSING RUNWAYS 18L/09 & 3D AIRLINERS!",
                district: "VCIA INTERNATIONAL AIRPORT",
                bx: 128.0,
                by: 297.5,
                x: 128.0 * TILE_SIZE,
                y: 297.5 * TILE_SIZE,
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
                bx: mx256(58.0),
                by: my256(214.5),
                x: mx256(58.0) * TILE_SIZE,
                y: my256(214.5) * TILE_SIZE,
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
                facing: "S",
                doorX: mx256(211.5) * TILE_SIZE,
                doorY: my256(147.5) * TILE_SIZE,
                w: 760,
                h: 520,
                npcs: [
                    { x: 380, y: 84, angle: Math.PI * 0.5, type: "civ2", label: "CONCIERGE" },
                    { x: 185, y: 265, angle: 0, type: "civ1", label: "GUEST" },
                    { x: 632, y: 76, angle: Math.PI * 0.5, type: "civ3", label: "BARTENDER" }
                ],
                stations: [
                    {
                        id: "DIXON_STASH",
                        x: 185,
                        y: 160,
                        color: "#39ff14",
                        label: "🔫 SUITE WEAPON STASH",
                        sub: "+100% HP, +100 ARMOR, UZI & SHOTGUN!",
                        rewardType: "ARSENAL"
                    },
                    {
                        id: "DIXON_WARDROBE",
                        x: 625,
                        y: 195,
                        color: "#38bdf8",
                        label: "👗 SAFEHOUSE WARDROBE",
                        sub: "CLEAR WANTED LEVEL + TOGGLE BANDANA + $2,000!",
                        rewardType: "WARDROBE"
                    },
                    {
                        id: "DIXON_BAR",
                        x: 585,
                        y: 300,
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
                facing: "S",
                doorX: mx256(211.5) * TILE_SIZE,
                doorY: my256(51.5) * TILE_SIZE,
                w: 800,
                h: 540,
                npcs: [
                    { x: 402, y: 108, z: 2.34, angle: Math.PI * 0.5, type: "gang", label: "RESIDENT DJ" },
                    { x: 340, y: 265, angle: 0.8, type: "civ2", label: "DANCER", dancing: true },
                    { x: 455, y: 265, angle: -0.8, type: "civ1", label: "DANCER", dancing: true },
                    { x: 395, y: 315, angle: -1.5, type: "civ3", label: "DANCER", dancing: true },
                    { x: 645, y: 245, angle: Math.PI, type: "civ0", label: "VIP HOST" }
                ],
                stations: [
                    {
                        id: "NINE_DJ",
                        x: 400,
                        y: 172,
                        color: "#00f0ff",
                        label: "🎧 DJ TURNTABLE BOOTH",
                        sub: "DROP THE BASS! +1 MULTIPLIER & +$4,000!",
                        rewardType: "MULTIPLIER_CASH"
                    },
                    {
                        id: "NINE_VIP",
                        x: 165,
                        y: 215,
                        color: "#f472b6",
                        label: "🍾 VIP BOTTLE SERVICE",
                        sub: "+100% HP, +100 ARMOR & UZI AMMO!",
                        rewardType: "ARSENAL"
                    },
                    {
                        id: "NINE_SAFE",
                        x: 660,
                        y: 198,
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
                facing: "S",
                doorX: mx256(111.5) * TILE_SIZE,
                doorY: my256(81.5) * TILE_SIZE,
                w: 800,
                h: 540,
                npcs: [
                    { x: 402, y: 252, z: 2.22, angle: Math.PI * 0.5, type: "bikini_pink", label: "STAGE PERFORMER", dancing: true },
                    { x: 268, y: 290, angle: 0, type: "gang", label: "BOOBIE IKE VIP" },
                    { x: 522, y: 290, angle: Math.PI, type: "civ1", label: "PATRON" },
                    { x: 645, y: 245, angle: Math.PI, type: "gang", label: "VAULT GUARD" }
                ],
                stations: [
                    {
                        id: "JACK_STAGE",
                        x: 400,
                        y: 405,
                        color: "#e879f9",
                        label: "💃 MAIN NEON STAGE",
                        sub: "MAKE IT RAIN! +1 MULTIPLIER & 100% HP!",
                        rewardType: "MULTIPLIER_CASH"
                    },
                    {
                        id: "JACK_VAULT",
                        x: 660,
                        y: 198,
                        color: "#fde047",
                        label: "💼 BOOBIE IKE'S CASH VAULT",
                        sub: "+$12,000 CASH HEIST + SHOTGUN & UZI!",
                        rewardType: "HEIST_SAFE"
                    },
                    {
                        id: "JACK_BAR",
                        x: 165,
                        y: 215,
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
                facing: "S",
                doorX: mx256(210.5) * TILE_SIZE,
                doorY: my256(105.5) * TILE_SIZE,
                w: 760,
                h: 520,
                npcs: [
                    { x: 370, y: 255, angle: 0.5, type: "civ1", label: "SALSA DANCER", dancing: true },
                    { x: 430, y: 255, angle: -2.5, type: "civ2", label: "SALSA DANCER", dancing: true },
                    { x: 120, y: 92, angle: Math.PI * 0.5, type: "gang", label: "SMUGGLER" }
                ],
                stations: [
                    {
                        id: "MALIBU_CRATE",
                        x: 145,
                        y: 195,
                        color: "#f97316",
                        label: "📦 SMUGGLER'S HEAVY CRATE",
                        sub: "FLAMETHROWER + ROCKET LAUNCHER + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "MALIBU_ARCADE",
                        x: 645,
                        y: 198,
                        color: "#39ff14",
                        label: "🕹️ 1997 GTA ARCADE CABINET",
                        sub: "+1 EXTRA LIFE & +$5,000 HIGH SCORE!",
                        rewardType: "EXTRA_LIFE"
                    },
                    {
                        id: "MALIBU_BAR",
                        x: 645,
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
                facing: "S",
                doorX: mx256(176.5) * TILE_SIZE,
                doorY: my256(104.5) * TILE_SIZE,
                w: 820,
                h: 550,
                npcs: [
                    { x: 410, y: 88, angle: Math.PI * 0.5, type: "gang", label: "CARTEL BOSS" },
                    { x: 300, y: 235, angle: 0, type: "gang", label: "BODYGUARD" },
                    { x: 520, y: 235, angle: Math.PI, type: "civ2", label: "VIP GUEST" }
                ],
                stations: [
                    {
                        id: "MANSION_DESK",
                        x: 410,
                        y: 185,
                        color: "#fde047",
                        label: "🖥️ SCARFACE OFFICE & SAFE",
                        sub: "+$15,000 CARTEL PAYROLL & 0 WANTED!",
                        rewardType: "HEIST_SAFE"
                    },
                    {
                        id: "MANSION_ARMORY",
                        x: 155,
                        y: 220,
                        color: "#f97316",
                        label: "🚀 GOLDEN HEAVY ARMORY",
                        sub: "ROCKET + FLAMETHROWER + UZI + SHOTGUN + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "MANSION_POOL",
                        x: 665,
                        y: 235,
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
                facing: "S",
                doorX: mx256(230.5) * TILE_SIZE,
                doorY: my256(17.5) * TILE_SIZE,
                w: 820,
                h: 540,
                npcs: [
                    { x: 410, y: 102, angle: Math.PI * 0.5, type: "civ1", label: "FLIGHT DIRECTOR" },
                    { x: 245, y: 255, angle: 0, type: "civ0", label: "ENGINEER" },
                    { x: 575, y: 255, angle: Math.PI, type: "civ3", label: "ASTRONAUT" }
                ],
                stations: [
                    {
                        id: "SERA_LAUNCH",
                        x: 410,
                        y: 198,
                        color: "#ef4444",
                        label: "🔴 [LAUNCH CAPE LEONIDA ROCKET!]",
                        sub: "IGNITE PAD 39A! +$20,000 & +2 MULTIPLIER!",
                        rewardType: "ROCKET_LAUNCH"
                    },
                    {
                        id: "SERA_ORDNANCE",
                        x: 155,
                        y: 250,
                        color: "#38bdf8",
                        label: "⚡ ORBITAL ORDNANCE LOCKER",
                        sub: "ROCKET LAUNCHER + FLAMETHROWER + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "SERA_MEDPOD",
                        x: 665,
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
                facing: "S",
                doorX: mx256(35.5) * TILE_SIZE,
                doorY: my256(76.5) * TILE_SIZE,
                w: 800,
                h: 530,
                npcs: [
                    { x: 400, y: 96, angle: Math.PI * 0.5, type: "police", label: "WARDEN" },
                    { x: 145, y: 195, angle: Math.PI * 0.5, type: "monk", label: "INMATE #09" },
                    { x: 560, y: 260, angle: Math.PI, type: "police", label: "CORRECTIONS OFFICER" }
                ],
                stations: [
                    {
                        id: "PRISON_PAROLE",
                        x: 400,
                        y: 195,
                        color: "#fde047",
                        label: "🗝️ WARDEN'S PAROLE SAFE",
                        sub: "+2 GET OUT OF JAIL FREE CARDS & 0 WANTED!",
                        rewardType: "JAIL_CARDS"
                    },
                    {
                        id: "PRISON_ARMORY",
                        x: 645,
                        y: 220,
                        color: "#38bdf8",
                        label: "🛡️ SWAT RIOT ARMORY",
                        sub: "SHOTGUN + UZI + ROCKET + 100 SWAT ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "PRISON_CELL06",
                        x: 195,
                        y: 220,
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
                facing: "S",
                doorX: mx256(36.5) * TILE_SIZE,
                doorY: my256(140.5) * TILE_SIZE,
                w: 760,
                h: 520,
                npcs: [
                    { x: 355, y: 124, angle: Math.PI * 0.5, type: "civ0", label: "CASHIER" },
                    { x: 205, y: 294, angle: Math.PI, type: "civ3", label: "DINER CUSTOMER" },
                    { x: 620, y: 106, angle: Math.PI * 0.5, type: "gang", label: "PAWN BROKER" }
                ],
                stations: [
                    {
                        id: "DINER_REGISTER",
                        x: 360,
                        y: 208,
                        color: "#fde047",
                        label: "💵 ROB DINER REGISTER (TRAILER 1!)",
                        sub: "STICK UP THE REGISTER FOR +$8,500 CASH!",
                        rewardType: "HEIST_SAFE"
                    },
                    {
                        id: "PAWN_GUNS",
                        x: 615,
                        y: 205,
                        color: "#f97316",
                        label: "🔫 UNCLE JACK'S GUN WALL",
                        sub: "SHOTGUN + UZI + FLAMETHROWER + 100 ARMOR!",
                        rewardType: "HEAVY_WEAPONS"
                    },
                    {
                        id: "HANK_WAFFLES",
                        x: 205,
                        y: 350,
                        color: "#39ff14",
                        label: "🧇 HANK'S WAFFLE BOOTH",
                        sub: "100% HEALTH + +1 MULTIPLIER!",
                        rewardType: "MULTIPLIER_CASH"
                    }
                ]
            }
        ];

        // Template-based shop interiors (restaurants, hotels, gun shops, bars, stores...) on real storefronts
        try {
            if (window.ShopInteriors) {
                window.ShopInteriors.snapLandmarkDoors(this);
                const shops = window.ShopInteriors.generate(this);
                for (const s of shops) this.interiors.push(s);
            }
        } catch (e) {
            console.warn("Shop interior generation failed:", e);
        }

        // 10 High-Flying Unique Stunt Jump Ramps across Vice City & Leonida!
        this.stuntRamps = [
            { id: "RAMP_OCEAN_SOUTH", name: "OCEAN DRIVE PROMENADE JUMP", x: 447.5 * TILE_SIZE, y: 292.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_OCEAN_MID", name: "LUMMUS PARK BEACH LAUNCH", x: 447.5 * TILE_SIZE, y: 265.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_MACARTHUR", name: "MACARTHUR CAUSEWAY BAY JUMP", x: 356.0 * TILE_SIZE, y: 297.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_VENETIAN", name: "VENETIAN ISLAND CANAL JUMP", x: 356.0 * TILE_SIZE, y: 176.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_JULIA_TUTTLE", name: "NORTH BAY SUPERJUMP", x: 356.0 * TILE_SIZE, y: 75.0 * TILE_SIZE, angle: 0 },
            { id: "RAMP_DOWNTOWN", name: "DOWNTOWN BAYFRONT LAUNCH", x: 285.5 * TILE_SIZE, y: 261.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_STADIUM", name: "MAMBAS STADIUM BOWL JUMP", x: 188.5 * TILE_SIZE, y: 188.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_SPEEDWAY", name: "PORT GELLHORN SPEEDWAY RAMP", x: 55.5 * TILE_SIZE, y: 177.5 * TILE_SIZE, angle: 0 },
            { id: "RAMP_AIRPORT", name: "VCIA RUNWAY JET RAMP", x: 90.5 * TILE_SIZE, y: 297.0 * TILE_SIZE, angle: -Math.PI * 0.5 },
            { id: "RAMP_KEYS", name: "LEONIDA KEYS BROKEN BRIDGE JUMP", x: 202.0 * TILE_SIZE, y: 480.5 * TILE_SIZE, angle: Math.PI }
        ];
        return landmarksList;
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

    // Raw surface eGroundType (GROUND_TYPE.*) at a world pixel position
    getGroundTypeAt(px, py) {
        const cx = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(px / TILE_SIZE)));
        const cy = Math.max(0, Math.min(MAP_ROWS - 1, Math.floor(py / TILE_SIZE)));
        return this.surfaceGround[cy * MAP_COLS + cx];
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
    isRestrictedNoTrafficZone(bx, by) {
        // VCIA International Airport Fenced Tarmac & Runways (c = 64..165, r = 299..368)
        if (bx >= 64 && bx <= 165 && by >= 299 && by <= 368) return true;
        // Leonida State Penitentiary Fenced Compound (c = 56..68, r = 76..146)
        if (bx >= 56 && bx <= 68 && by >= 76 && by <= 146) return true;
        return false;
    }

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
        const startInRestricted = this.isRestrictedNoTrafficZone(bx, by);
        for (let step = 1; step <= 6; step++) {
            const tx = bx + dx * step;
            const ty = by + dy * step;
            if (tx < 1 || tx >= MAP_COLS - 1 || ty < 1 || ty >= MAP_ROWS - 1) return false;
            if (!startInRestricted && this.isRestrictedNoTrafficZone(tx, ty)) return false;
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

    doesStraightLeadToValidExit(bx, by, dx, dy, zBlocks = 2.0, turnedInIntersection = false, entryAngle = null) {
        const startInRestricted = this.isRestrictedNoTrafficZone(bx, by);
        const dirAngle = Math.atan2(dy, dx);
        const isOppositeToEntry = typeof entryAngle === "number" &&
            Math.abs(this.normalizeAngleDiff(dirAngle, entryAngle)) > 2.4;
        if (!isOppositeToEntry && this.doesRoadExitIntersection(bx, by, dx, dy, zBlocks)) {
            return true;
        }
        if (turnedInIntersection) {
            return false;
        }
        for (let step = 1; step <= 4; step++) {
            const tx = bx + dx * step;
            const ty = by + dy * step;
            if (tx < 1 || tx >= MAP_COLS - 1 || ty < 1 || ty >= MAP_ROWS - 1) return false;
            if (!startInRestricted && this.isRestrictedNoTrafficZone(tx, ty)) return false;
            const tb = this.getNavigationBlock(tx, ty, zBlocks);
            if (!tb || tb.groundType !== GROUND_TYPE.ROAD) return false;
            const tlid = this.getBlockInfo(tx, ty, 1).lid;
            if (tlid !== 25) return false;
            const subDirs = this.getAllowedRoadDirections(tx, ty, zBlocks);
            for (const sd of subDirs) {
                if ((sd.dx === dx && sd.dy === dy) || (sd.dx === -dx && sd.dy === -dy)) continue;
                if (typeof entryAngle === "number" && Math.abs(this.normalizeAngleDiff(sd.angle, entryAngle)) > 2.4) {
                    continue;
                }
                if (this.doesRoadExitIntersection(tx, ty, sd.dx, sd.dy, zBlocks)) {
                    return true;
                }
            }
        }
        return false;
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

    isStopLineBlock(bx, by) {
        if (bx < 0 || bx >= MAP_COLS || by < 0 || by >= MAP_ROWS) return false;
        if (this.stopLineMask && this.stopLineMask[by * MAP_COLS + bx] === 1) return true;
        const blk = this.getBlockInfo(bx, by, 1);
        return Boolean(blk && (blk.lid === 24 || blk.trafficHint === 1));
    }

    hasTrafficSignalNear(x, y, maxDist = 360) {
        if (!Array.isArray(this.trafficSignals) || this.trafficSignals.length === 0) return false;
        const maxD2 = maxDist * maxDist;
        for (let i = 0; i < this.trafficSignals.length; i++) {
            const ts = this.trafficSignals[i];
            const dx = ts.headX - x;
            const dy = ts.headY - y;
            if (dx * dx + dy * dy <= maxD2) return true;
        }
        return false;
    }

    chooseTargetGuidedRoadBlock(bx, by, currentAngle, targetX, targetY, zBlocks = 2.0, turnedInIntersection = false, entryAngle = null) {
        const dirs = this.getAllowedRoadDirections(bx, by, zBlocks);
        const cardinals = [
            { key: "U", dx: 0, dy: -1, angle: -Math.PI * 0.5 },
            { key: "D", dx: 0, dy: 1, angle: Math.PI * 0.5 },
            { key: "L", dx: -1, dy: 0, angle: Math.PI },
            { key: "R", dx: 1, dy: 0, angle: 0 }
        ];
        const sourceDirs = dirs.length > 0 ? dirs : cardinals;
        const candidates = [];

        const startInRestricted = this.isRestrictedNoTrafficZone(bx, by);
        for (const d of sourceDirs) {
            const nx = bx + d.dx;
            const ny = by + d.dy;
            if (nx < 1 || nx >= MAP_COLS - 1 || ny < 1 || ny >= MAP_ROWS - 1) continue;
            if (!startInRestricted && this.isRestrictedNoTrafficZone(nx, ny)) continue;
            const nb = this.getNavigationBlock(nx, ny, zBlocks);
            if (!nb || nb.groundType === GROUND_TYPE.BUILDING || nb.groundType === GROUND_TYPE.WATER || nb.groundType === GROUND_TYPE.AIR) {
                continue;
            }
            const absDiff = Math.abs(this.normalizeAngleDiff(d.angle, currentAngle));
            const isTurn = absDiff > 0.45;
            const isEntryUturn = typeof entryAngle === "number" && Math.abs(this.normalizeAngleDiff(d.angle, entryAngle)) > 2.4;
            const isUturn = absDiff > 2.4 || isEntryUturn;
            const exitsIntersection = isTurn
                ? (!isEntryUturn && this.doesRoadExitIntersection(bx, by, d.dx, d.dy, zBlocks))
                : this.doesStraightLeadToValidExit(bx, by, d.dx, d.dy, zBlocks, turnedInIntersection, entryAngle);

            // Project 4 blocks ahead along (d.dx, d.dy) to score how well this road approaches (targetX, targetY)
            const lookX = (bx + d.dx * 4 + 0.5) * TILE_SIZE;
            const lookY = (by + d.dy * 4 + 0.5) * TILE_SIZE;
            const distToTarget = Math.hypot(targetX - lookX, targetY - lookY);
            const penalty =
                (nb.groundType === GROUND_TYPE.ROAD ? 0 : 220) +
                (exitsIntersection ? 0 : 380) +
                (isUturn ? 520 : 0) +
                (isTurn && turnedInIntersection ? 420 : 0);

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
            return this.chooseNextRoadBlock(bx, by, currentAngle, zBlocks, 0.2, turnedInIntersection, entryAngle);
        }
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0];
    }

    chooseNextRoadBlock(bx, by, currentAngle, zBlocks = 2.0, turnSeed = 0.5, turnedInIntersection = false, entryAngle = null) {
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

        const startInRestricted = this.isRestrictedNoTrafficZone(bx, by);
        const roadCandidates = [];
        const anyDrivable = [];
        for (const d of dirs) {
            const nx = bx + d.dx;
            const ny = by + d.dy;
            if (nx < 1 || nx >= MAP_COLS - 1 || ny < 1 || ny >= MAP_ROWS - 1) continue;
            if (!startInRestricted && this.isRestrictedNoTrafficZone(nx, ny)) continue;
            const nb = this.getNavigationBlock(nx, ny, zBlocks);
            const absDiff = Math.abs(this.normalizeAngleDiff(d.angle, currentAngle));
            const isTurn = absDiff > 0.45;
            const isEntryUturn = typeof entryAngle === "number" && Math.abs(this.normalizeAngleDiff(d.angle, entryAngle)) > 2.4;
            const isUturn = absDiff > 2.4 || isEntryUturn;
            const exitsIntersection = this.doesRoadExitIntersection(bx, by, d.dx, d.dy, zBlocks);
            const straightValid = !isTurn
                ? this.doesStraightLeadToValidExit(bx, by, d.dx, d.dy, zBlocks, turnedInIntersection, entryAngle)
                : false;
            const entry = { ...d, bx: nx, by: ny, absDiff, isTurn, isUturn, exitsIntersection, straightValid };
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
            exitsIntersection: true,
            straightValid: true
        })));

        const nonUturn = pool.filter((c) => !c.isUturn);
        if (nonUturn.length > 0) pool = nonUturn;

        // Filter out:
        // 1) straight steps inside an intersection that only lead to a wall/dead-end or force a U-turn,
        // 2) turns after the car already turned once inside this intersection, OR
        // 3) turns into an oncoming lane or dead-end stub
        const validFiltered = pool.filter((c) => {
            if (!c.isTurn) return Boolean(c.straightValid);
            if (turnedInIntersection) return false;
            return Boolean(c.exitsIntersection);
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
            // Reached dead-end or corner of sidewalk: U-turn back along sidewalk, NEVER step onto road!
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
        } else if (slopeType >= 49 && slopeType <= 52) {
            // BilinearLid (gta2-rtx-remix dll/src/ground.cpp): 4-corner bilinear interpolation for corner ramps (49..52)
            const hNW = slopeType === 49 ? 0.0 : 1.0;
            const hNE = slopeType === 50 ? 0.0 : 1.0;
            const hSW = slopeType === 51 ? 0.0 : 1.0;
            const hSE = slopeType === 52 ? 0.0 : 1.0;
            const north = hNW + (hNE - hNW) * cx;
            const south = hSW + (hSE - hSW) * cx;
            return north + (south - north) * cy;
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
            { id: "pns_oceandrive", name: "VICE CUSTOMS (COLLINS AVE / SOUTH BEACH)", x: 434.5 * TILE_SIZE, y: 287.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_northbeach", name: "VICE CUSTOMS (NORTH BEACH / 919)", x: 434.5 * TILE_SIZE, y: 75.5 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_downtown", name: "VICE CUSTOMS (BISCAYNE BLVD)", x: 285.0 * TILE_SIZE, y: 179.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_wynwood", name: "WYNWOOD CUSTOMS (MAMBAS STADIUM)", x: 188.5 * TILE_SIZE, y: 159.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_gellhorn", name: "GELLHORN SPEEDWAY CUSTOMS", x: 62.0 * TILE_SIZE, y: 259.0 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "pns_vcia", name: "VCIA AIRPORT CUSTOMS", x: 161.0 * TILE_SIZE, y: 295.5 * TILE_SIZE, w: 2 * TILE_SIZE, h: 1.5 * TILE_SIZE }
        ];

        // --------------------------------------------------------------------
        // 4 BOMB SHOPS
        // --------------------------------------------------------------------
        this.bombShops = [
            { id: "bomb_vcia", name: "8-BALL'S ORDNANCE (VCIA CARGO)", x: 123.5 * TILE_SIZE, y: 295.5 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "bomb_littlehaiti", name: "AMBROSIA BOMB SHOP (LAKE LEONIDA)", x: 168.5 * TILE_SIZE, y: 110.5 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "bomb_sera", name: "SERA ROCKET ORDNANCE (CAPE LEONIDA)", x: 445.0 * TILE_SIZE, y: 28.0 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE },
            { id: "bomb_gellhorn", name: "PAWN & GUN ORDNANCE (PORT GELLHORN)", x: 62.0 * TILE_SIZE, y: 281.0 * TILE_SIZE, w: 1.5 * TILE_SIZE, h: 1.5 * TILE_SIZE }
        ];

        // --------------------------------------------------------------------
        // DOCKYARD MAGNETIC CRANES & CAR CRUSHERS
        // --------------------------------------------------------------------
        this.cranes = [
            {
                id: "crane_viceport",
                name: "VICE PORT CONTAINER CRANE",
                x: mx256(171.5) * TILE_SIZE,
                y: my256(162.5) * TILE_SIZE,
                w: 2.5 * TILE_SIZE,
                h: 2.4 * TILE_SIZE,
                armAngle: 0,
                crushingVehicle: null,
                crushProgress: 0
            },
            {
                id: "crane_docks",
                name: "PORT GELLHORN MAGNETIC CRANE",
                x: mx256(29.5) * TILE_SIZE,
                y: my256(132.5) * TILE_SIZE,
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
                x: mx256(218.5) * TILE_SIZE,
                y: my256(145.5) * TILE_SIZE,
                weapon: "FLAMETHROWER",
                targetKills: 5,
                timeLimit: 35,
                reward: 30000,
                cooldown: 0
            },
            {
                id: "kf_starisland",
                title: "STAR ISLAND ROCKET RAMPAGE!",
                x: mx256(173.0) * TILE_SIZE,
                y: my256(103.5) * TILE_SIZE,
                weapon: "ROCKET",
                targetKills: 6,
                timeLimit: 40,
                reward: 50000,
                cooldown: 0
            },
            {
                id: "kf_stadium",
                title: "MAMBAS STADIUM BOWL RAMPAGE!",
                x: mx256(116.0) * TILE_SIZE,
                y: my256(102.0) * TILE_SIZE,
                weapon: "SHOTGUN",
                targetKills: 6,
                timeLimit: 40,
                reward: 45000,
                cooldown: 0
            },
            {
                id: "kf_sera",
                title: "SERA SPACEPORT LAUNCH PAD RAMPAGE!",
                x: mx256(228.5) * TILE_SIZE,
                y: my256(20.5) * TILE_SIZE,
                weapon: "ROCKET",
                targetKills: 5,
                timeLimit: 40,
                reward: 60000,
                cooldown: 0
            },
            {
                id: "kf_prison",
                title: "LEONIDA PENITENTIARY RIOT FRENZY!",
                x: mx256(31.5) * TILE_SIZE,
                y: my256(67.5) * TILE_SIZE,
                weapon: "SHOTGUN",
                targetKills: 6,
                timeLimit: 40,
                reward: 50000,
                cooldown: 0
            },
            {
                id: "kf_gellhorn",
                title: "PORT GELLHORN SPEEDWAY UZI RAMPAGE!",
                x: mx256(47.0) * TILE_SIZE,
                y: my256(106.0) * TILE_SIZE,
                weapon: "UZI",
                targetKills: 6,
                timeLimit: 35,
                reward: 40000,
                cooldown: 0
            },
            {
                id: "kf_vcia",
                title: "VCIA TARMAC JETLINER RAMPAGE!",
                x: mx256(62.5) * TILE_SIZE,
                y: my256(156.0) * TILE_SIZE,
                weapon: "ROCKET",
                targetKills: 5,
                timeLimit: 40,
                reward: 55000,
                cooldown: 0
            },
            {
                id: "kf_mudpark",
                title: "THRILLBILLY MUD PARK FLAME FRENZY!",
                x: mx256(58.0) * TILE_SIZE,
                y: my256(216.0) * TILE_SIZE,
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
        // Kill-frenzy tokens were street pickups too: removed
        this.killFrenzies = [];
    }

    initPickups() {
        // Street bonuses were removed: everything is bought in shops (see interiors.js)
        this.pickups = [];
    }

    initStreetProps() {
        // Street crates removed: all upgrades are sold in shops
        this.crates = [];

        this.infoSigns = [
            { x: 443.5 * TILE_SIZE, y: 288.2 * TILE_SIZE, z: 2.0, text: "STATE OF LEONIDA (512x512 MEGA-MAP): VICE BEACH, MAMBAS STADIUM, SERA SPACEPORT, PENITENTIARY, SPEEDWAY & KEYS! PRESS [M] OR USE [C] TOUR!" },
            { x: mx256(218.5) * TILE_SIZE, y: my256(152.5) * TILE_SIZE, z: 2.0, text: "LUMMUS PARK & VICE BEACH: WIPE OUT ALL 7 MONKS FOR A GOURANGA! BONUS, OR CLICK ANY OF THE 16 LANDMARKS IN THE TOP-LEFT [C] WINDOW!" }
        ];

        // Atmospheric street fires in Port Gellhorn & Thrillbilly Mud Park
        this.streetFires = [
            { x: mx256(35.8) * TILE_SIZE, y: my256(142.2) * TILE_SIZE, z: 2.05, size: 0.85 },
            { x: mx256(54.0) * TILE_SIZE, y: my256(216.0) * TILE_SIZE, z: 2.05, size: 0.85 }
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
                : (this.surfaceLayer[Math.max(0, Math.min(MAP_ROWS - 1, cy)) * MAP_COLS + Math.max(0, Math.min(MAP_COLS - 1, cx))] || 2);

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

        // Physical collision against Solid Security Barrier Boxes (Leonida State Penitentiary Double-Fence Perimeter & Gatehouses)
        if (this.securityBarrierBoxes && this.securityBarrierBoxes.length > 0 && (currentZBlocks === null || currentZBlocks < 2.8)) {
            for (let pass = 0; pass < 2; pass++) {
                for (let i = 0; i < this.securityBarrierBoxes.length; i++) {
                    const bb = this.securityBarrierBoxes[i];
                    if (bb.vehiclesOnly && radius < 11.5) continue;
                    if (nx + radius < bb.minX || nx - radius > bb.maxX || ny + radius < bb.minY || ny - radius > bb.maxY) continue;

                    if (bb.cx !== undefined) {
                        const relX = nx - bb.cx;
                        const relY = ny - bb.cy;
                        const lx = relX * bb.cosA + relY * bb.sinA;
                        const ly = -relX * bb.sinA + relY * bb.cosA;
                        const clX = Math.max(-bb.hw, Math.min(lx, bb.hw));
                        const clY = Math.max(-bb.hh, Math.min(ly, bb.hh));
                        const dlx = lx - clX;
                        const dly = ly - clY;
                        const distSq = dlx * dlx + dly * dly;
                        if (distSq < radius * radius) {
                            hit = true;
                            let pushLX = 0;
                            let pushLY = 0;
                            if (distSq > 0.0001) {
                                const dist = Math.sqrt(distSq);
                                const overlap = radius - dist;
                                pushLX = (dlx / dist) * overlap;
                                pushLY = (dly / dist) * overlap;
                            } else {
                                const dLeft = lx + bb.hw;
                                const dRight = bb.hw - lx;
                                const dTop = ly + bb.hh;
                                const dBot = bb.hh - ly;
                                const m = Math.min(dLeft, dRight, dTop, dBot);
                                if (m === dLeft) pushLX = -(dLeft + radius);
                                else if (m === dRight) pushLX = dRight + radius;
                                else if (m === dTop) pushLY = -(dTop + radius);
                                else pushLY = dBot + radius;
                            }
                            nx += pushLX * bb.cosA - pushLY * bb.sinA;
                            ny += pushLX * bb.sinA + pushLY * bb.cosA;
                        }
                    } else {
                        const clX = Math.max(bb.minX, Math.min(nx, bb.maxX));
                        const clY = Math.max(bb.minY, Math.min(ny, bb.maxY));
                        const ddx = nx - clX;
                        const ddy = ny - clY;
                        const distSq = ddx * ddx + ddy * ddy;

                        if (distSq < radius * radius) {
                            hit = true;
                            if (distSq > 0.0001) {
                                const dist = Math.sqrt(distSq);
                                const overlap = radius - dist;
                                nx += (ddx / dist) * overlap;
                                ny += (ddy / dist) * overlap;
                            } else {
                                // Center is inside the box: push out along nearest face
                                const dLeft = nx - bb.minX;
                                const dRight = bb.maxX - nx;
                                const dTop = ny - bb.minY;
                                const dBot = bb.maxY - ny;
                                const m = Math.min(dLeft, dRight, dTop, dBot);
                                if (m === dLeft) nx = bb.minX - radius;
                                else if (m === dRight) nx = bb.maxX + radius;
                                else if (m === dTop) ny = bb.minY - radius;
                                else ny = bb.maxY + radius;
                            }
                        }
                    }
                }
            }
        }

        // Physical collision against 3D Perimeter Security Fences (VCIA Airport & Leonida State Penitentiary)
        if (this.securityFenceSpans && this.securityFenceSpans.length > 0 && (currentZBlocks === null || currentZBlocks < 2.8)) {
            const fenceRadius = radius + 6.5;
            const fenceRadSq = fenceRadius * fenceRadius;
            for (let pass = 0; pass < 2; pass++) {
                for (let i = 0; i < this.securityFenceSpans.length; i++) {
                    const sp = this.securityFenceSpans[i];
                    const minX = Math.min(sp.xA, sp.xB) - fenceRadius;
                    const maxX = Math.max(sp.xA, sp.xB) + fenceRadius;
                    const minY = Math.min(sp.yA, sp.yB) - fenceRadius;
                    const maxY = Math.max(sp.yA, sp.yB) + fenceRadius;
                    if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;

                    const vx = sp.xB - sp.xA;
                    const vy = sp.yB - sp.yA;
                    const lenSq = vx * vx + vy * vy;
                    const t = lenSq > 0.001 ? Math.max(0.0, Math.min(1.0, ((nx - sp.xA) * vx + (ny - sp.yA) * vy) / lenSq)) : 0.0;
                    const cx = sp.xA + t * vx;
                    const cy = sp.yA + t * vy;
                    const ddx = nx - cx;
                    const ddy = ny - cy;
                    const distSq = ddx * ddx + ddy * ddy;
                    if (distSq < fenceRadSq) {
                        hit = true;
                        const dist = Math.sqrt(distSq) || 0.001;
                        const overlap = fenceRadius - dist;
                        if (dist > 0.01) {
                            nx += (ddx / dist) * overlap;
                            ny += (ddy / dist) * overlap;
                        } else {
                            nx += fenceRadius;
                        }
                    }
                }
            }
        }

        nx = Math.max(TILE_SIZE * 1.5, Math.min(this.width - TILE_SIZE * 1.5, nx));
        ny = Math.max(TILE_SIZE * 1.5, Math.min(this.height - TILE_SIZE * 1.5, ny));

        return { x: nx, y: ny, hit };
    }

    resolveCircleFloraCollision(x, y, radius = 8) {
        if (!this.floraGrid || this.floraGrid.size === 0) return { hit: false, x, y };
        const cx = Math.floor(x / TILE_SIZE);
        const cy = Math.floor(y / TILE_SIZE);
        let nx = x;
        let ny = y;
        let hit = false;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const key = ((cy + dy) << 16) | ((cx + dx) & 0xffff);
                const cell = this.floraGrid.get(key);
                if (!cell) continue;
                for (let i = 0; i < cell.length; i++) {
                    const pm = cell[i];
                    // Solid trunk collision: Palmetto, Cypress, Palm, Banyan, Oak
                    const trunkR = Math.max(9, Math.min(16, 12 * (pm.scale || 1.0)));
                    const ex = nx - pm.x;
                    const ey = ny - pm.y;
                    const dist2 = ex * ex + ey * ey;
                    const minDist = radius + trunkR;
                    if (dist2 < minDist * minDist && dist2 > 0.0001) {
                        const dist = Math.sqrt(dist2);
                        const push = minDist - dist;
                        nx += (ex / dist) * push;
                        ny += (ey / dist) * push;
                        hit = true;
                    }
                }
            }
        }
        return { hit, x: nx, y: ny };
    }

    /**
     * Non-physical spawn-exclusion check for open-air animated pedestrian/biker scenes
     * (streetEvents, streetTakeovers, bikerRallies, beachParties, volleyball, gyms, camps, golfGreens).
     * Keeps vehicle spawners clear of living animations WITHOUT placing any solid OBB wall around them!
     */
    isInsideLivingEventZone(x, y, extraMargin = 32) {
        if (Array.isArray(this.streetEvents)) {
            for (let i = 0; i < this.streetEvents.length; i++) {
                const ev = this.streetEvents[i];
                if (Math.hypot(x - ev.x, y - ev.y) < 34 + extraMargin) return true;
            }
        }
        if (Array.isArray(this.streetTakeovers)) {
            for (let i = 0; i < this.streetTakeovers.length; i++) {
                const st = this.streetTakeovers[i];
                if (Math.hypot(x - st.x, y - st.y) < 46 + extraMargin) return true;
            }
        }
        if (this.industrialAndParkDetails && Array.isArray(this.industrialAndParkDetails.bikerRallies)) {
            for (let i = 0; i < this.industrialAndParkDetails.bikerRallies.length; i++) {
                const br = this.industrialAndParkDetails.bikerRallies[i];
                if (Math.hypot(x - br.x, y - br.y) < (br.count || 4) * 10 + 18 + extraMargin) return true;
            }
        }
        if (Array.isArray(this.beachParties)) {
            for (let i = 0; i < this.beachParties.length; i++) {
                const bp = this.beachParties[i];
                if (Math.hypot(x - bp.x, y - bp.y) < 34 + extraMargin) return true;
            }
        }
        if (Array.isArray(this.beachVolleyballCourts)) {
            for (let i = 0; i < this.beachVolleyballCourts.length; i++) {
                const vc = this.beachVolleyballCourts[i];
                if (Math.hypot(x - vc.x, y - vc.y) < 36 + extraMargin) return true;
            }
        }
        if (Array.isArray(this.muscleBeachGyms)) {
            for (let i = 0; i < this.muscleBeachGyms.length; i++) {
                const gm = this.muscleBeachGyms[i];
                if (Math.hypot(x - gm.x, y - gm.y) < 34 + extraMargin) return true;
            }
        }
        if (Array.isArray(this.wildernessCamps)) {
            for (let i = 0; i < this.wildernessCamps.length; i++) {
                const cp = this.wildernessCamps[i];
                if (Math.hypot(x - cp.x, y - cp.y) < 34 + extraMargin) return true;
            }
        }
        if (Array.isArray(this.golfGreens)) {
            for (let i = 0; i < this.golfGreens.length; i++) {
                const gg = this.golfGreens[i];
                if (Math.hypot(x - gg.x, y - gg.y) < 28 + extraMargin) return true;
            }
        }
        return false;
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
window.MAP_X_256 = MAP_X_256;
window.MAP_Y_256 = MAP_Y_256;
window.mx256 = mx256;
window.my256 = my256;
window.LeonidaMap = LeonidaMap;
