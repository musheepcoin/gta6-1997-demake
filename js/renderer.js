/* ============================================================================
   GRAND THEFT AUTO: LEONIDA '97 — AUTHENTIC CARNAGE3D / GTA 1 WEBGL 3D ENGINE
   Direct Port of codenamecpp/carnage3d:
   - True 256x256x6 NYC.CMP 3D Voxel CityMesh (GameMapManager.cpp, GameMapHelpers.cpp, MapRenderer.cpp)
   - True 3D Perspective Camera: fovy = 55.0 deg, height = 20.0m / 5.0 blocks (FollowCameraController.cpp, GameCamera.cpp)
   - True 3D Depth-Tested WebGL SpriteBatch for .G24 Vehicles, Peds, Props & Effects (SpriteBatch.cpp)
   - Authentic .FON Bitmap Font HUD (HUD.cpp) + Interactive "Game Cheats" ImGui Window (GameCheatsWindow.cpp)
   ============================================================================ */

class RetroRenderer {
    constructor(canvas, radarCanvas, map) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.radarCanvas = radarCanvas;
        this.radarCtx = radarCanvas ? radarCanvas.getContext("2d") : null;
        this.map = map;

        // Default camera centered on Hotel Dixon & Ocean Drive Spawn (213.5, 146.0, z=2.0)
        this.camX = 213.5 * TILE_SIZE;
        this.camY = 146.0 * TILE_SIZE;
        this.camZBlocks = 2.0; // Smoothed player ground elevation in blocks (0..6)
        this.followHeightBlocks = 5.0; // 20.0m / 4.0m = 5.0 blocks above player ground (FollowCameraController.cpp)
        this.zoomOffsetBlocks = 0.0; // Mouse wheel zoom delta in blocks (-2.2 .. +8.0)
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.nightMode = false;
        this.time = 0;
        this.lastFrameDt = 0.0166;
        this.fpsSmoothed = 60.0;

        // Interactive Carnage3D "Game Cheats" Debug Window state ([C] key toggles visibility)
        this.showCheatsWindow = true;
        this.cheatsCollapsed = false;
        this.cheatButtons = [];
        this.cameraMode = "follow"; // "follow" or "free"

        // Track vehicle banner popup when player enters a vehicle (like carnage3d HUD.cpp)
        this.lastVehicleId = null;
        this.vehicleBannerTimer = 0;
        this.vehicleBannerName = "";

        // Map Visual Style: "VICE" (Vice City STYLE003 + GTA 6 Leonida Art Deco) or "NYC" (Original 1997 STYLE001)
        this.mapStyle = "VICE";
        if (this.map) this.map.mapStyle = "VICE";

        // Load Authentic GTA 1 / carnage3d Binary-Extracted Atlases, NYC.CMP Voxel Map & Metadata
        this.gta1Ready = false;
        this.cmpReady = false;
        this.gta1Meta = null;
        this.gta1TilesImg = new Image();
        this.gta1TilesViceImg = new Image();
        this.gta1SpritesImg = new Image();
        this.nycOverviewImg = new Image();
        this.nycOverviewReady = false;
        this.viceOverviewImg = new Image();
        this.viceOverviewReady = false;
        this.minimapZoomMode = 0; // 0 = Cruise (68 blocks), 1 = Wide (136 blocks), 2 = Full Island (256 blocks)

        // Offscreen WebGL 3D Canvas for true perspective CityMesh + 3D SpriteBatch rendering
        this.glCanvas = document.createElement("canvas");
        this.gl = null;
        this.cityChunks = [];
        this.initWebGL();

        // Pre-render static radar background (196x196) & Full Square GTA 1 Map background (576x576)
        this.radarBgCanvas = document.createElement("canvas");
        this.radarBgCanvas.width = 196;
        this.radarBgCanvas.height = 196;

        this.fullMapBgCanvas = document.createElement("canvas");
        this.fullMapBgCanvas.width = 576;
        this.fullMapBgCanvas.height = 576;

        this.loadAuthenticGta1Assets();
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    /* ========================================================================
       1. INITIALIZE WEBGL 3D CITYMESH & 3D SPRITEBATCH PIPELINE
       Matches codenamecpp/carnage3d MapRenderer.cpp + SpriteBatch.cpp + GameCamera.cpp
       ======================================================================== */
    initWebGL() {
        const gl = this.glCanvas.getContext("webgl", {
            alpha: false,
            Depth: true,
            antialias: false,
            preserveDrawingBuffer: true
        });
        if (!gl) {
            console.error("WebGL not supported!");
            return;
        }
        this.gl = gl;

        // 1A. CityMesh Shader: Perspective projection + animated water/fan UV offset + alpha discard
        const cityVS = `
            attribute vec3 aPos;
            attribute vec2 aUV;
            attribute float aAnim;
            uniform mat4 uViewProj;
            uniform float uWaterStep;
            uniform float uFanStep;
            varying vec2 vUV;
            varying float vAnim;
            void main() {
                vec2 uv = aUV;
                if (aAnim > 0.5 && aAnim < 1.5) {
                    // Lid 41 animated water: Aux frames 25..35 in 16x51 tile atlas
                    float idx = 698.0 + 25.0 + uWaterStep;
                    float col = mod(idx, 16.0);
                    float row = floor(idx / 16.0);
                    vec2 localUV = fract(aUV * vec2(16.0, 51.0));
                    uv = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                } else if (aAnim > 1.5) {
                    // Lid 22 animated rooftop fan: Aux frames 19..24 in 16x51 tile atlas
                    float idx = 698.0 + 19.0 + uFanStep;
                    float col = mod(idx, 16.0);
                    float row = floor(idx / 16.0);
                    vec2 localUV = fract(aUV * vec2(16.0, 51.0));
                    uv = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                }
                vUV = uv;
                vAnim = aAnim;
                gl_Position = uViewProj * vec4(aPos, 1.0);
            }
        `;

        const cityFS = `
            precision mediump float;
            varying vec2 vUV;
            varying float vAnim;
            uniform sampler2D uTex;
            uniform float uNightTint;
            uniform float uViceStyle;
            void main() {
                vec4 c = texture2D(uTex, vUV);
                if (c.a < 0.1) discard;
                if (uNightTint > 0.01) {
                    if (uViceStyle > 0.5 && vAnim < 0.5) {
                        // Vice City / GTA 6 Ocean Drive Neon Night: pink, cyan & gold hotel windows glow!
                        float neon = max(c.r - c.g * 0.65, max(c.b - c.r * 0.65, (c.r + c.g) * 0.52 - c.b * 0.72));
                        vec3 nightAmbient = vec3(0.50, 0.46, 0.82);
                        c.rgb = mix(c.rgb * nightAmbient, min(vec3(1.0), c.rgb * 1.15), clamp(neon * 2.2, 0.0, 1.0));
                    } else {
                        c.rgb *= mix(vec3(1.0), vec3(0.42, 0.52, 0.78), uNightTint);
                    }
                }
                gl_FragColor = c;
            }
        `;

        // 1B. 3D SpriteBatch Shader: Renders .G24 vehicles, peds, props & shadows in 3D space with depth test
        const spriteVS = `
            attribute vec3 aPos;
            attribute vec2 aUV;
            attribute vec4 aColor;
            uniform mat4 uViewProj;
            varying vec2 vUV;
            varying vec4 vColor;
            void main() {
                vUV = aUV;
                vColor = aColor;
                gl_Position = uViewProj * vec4(aPos, 1.0);
            }
        `;

        const spriteFS = `
            precision mediump float;
            varying vec2 vUV;
            varying vec4 vColor;
            uniform sampler2D uTex;
            void main() {
                if (vUV.x < 0.0) {
                    // Solid color quad (drop shadows, skidmarks, laser sights, bullets)
                    gl_FragColor = vColor;
                    return;
                }
                vec4 c = texture2D(uTex, vUV) * vColor;
                if (c.a < 0.08) discard;
                gl_FragColor = c;
            }
        `;

        this.cityProg = this.createProgram(gl, cityVS, cityFS);
        this.cityLocs = {
            aPos: gl.getAttribLocation(this.cityProg, "aPos"),
            aUV: gl.getAttribLocation(this.cityProg, "aUV"),
            aAnim: gl.getAttribLocation(this.cityProg, "aAnim"),
            uViewProj: gl.getUniformLocation(this.cityProg, "uViewProj"),
            uWaterStep: gl.getUniformLocation(this.cityProg, "uWaterStep"),
            uFanStep: gl.getUniformLocation(this.cityProg, "uFanStep"),
            uTex: gl.getUniformLocation(this.cityProg, "uTex"),
            uNightTint: gl.getUniformLocation(this.cityProg, "uNightTint"),
            uViceStyle: gl.getUniformLocation(this.cityProg, "uViceStyle")
        };

        this.spriteProg = this.createProgram(gl, spriteVS, spriteFS);
        this.spriteLocs = {
            aPos: gl.getAttribLocation(this.spriteProg, "aPos"),
            aUV: gl.getAttribLocation(this.spriteProg, "aUV"),
            aColor: gl.getAttribLocation(this.spriteProg, "aColor"),
            uViewProj: gl.getUniformLocation(this.spriteProg, "uViewProj"),
            uTex: gl.getUniformLocation(this.spriteProg, "uTex")
        };

        // Dynamic vertex buffer for 3D SpriteBatch (9 floats per vertex: x, y_elev, z_south, u, v, r, g, b, a)
        this.spriteBuffer = gl.createBuffer();
        this.maxSprites = 4096;
        this.spriteVerts = new Float32Array(this.maxSprites * 6 * 9);
        this.spriteCount = 0;
    }

    createProgram(gl, vsSrc, fsSrc) {
        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                console.error("Shader compile error:", gl.getShaderInfoLog(s));
            }
            return s;
        };
        const vs = compile(gl.VERTEX_SHADER, vsSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(p));
        }
        return p;
    }

    createGLTexture(img) {
        const gl = this.gl;
        if (!gl) return null;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        // Nearest-neighbor filtering (exact crisp 1997 GTA 1 / carnage3d pixel art!)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    loadAuthenticGta1Assets() {
        let loadedCount = 0;
        let mapBinBuffer = null;

        const checkReady = () => {
            loadedCount++;
            if (loadedCount >= 5 && this.gta1Meta && mapBinBuffer) {
                this.vehicleBySprIdx = {};
                if (Array.isArray(this.gta1Meta.sprites.vehicles)) {
                    for (const ve of this.gta1Meta.sprites.vehicles) {
                        this.vehicleBySprIdx[String(ve.spr_idx)] = ve;
                    }
                }
                if (this.gl) {
                    this.tilesTexNyc = this.createGLTexture(this.gta1TilesImg);
                    this.tilesTexVice = this.createGLTexture(this.gta1TilesViceImg);
                    this.tilesTex = this.mapStyle === "VICE" ? this.tilesTexVice : this.tilesTexNyc;
                    this.spritesTex = this.createGLTexture(this.gta1SpritesImg);
                }
                // Decompress NYC.CMP 256x256x6 voxel map into LeonidaMap and build 3D WebGL CityMesh!
                this.map.mapStyle = this.mapStyle;
                this.map.loadCmpBinary(mapBinBuffer, this.gta1Meta.districts);
                this.buildCityMesh();
                this.gta1Ready = true;
                this.cmpReady = true;
                this.bakeRadarBackground();

                if (window.game && typeof window.game.onCmpLoaded === "function") {
                    window.game.onCmpLoaded(this.gta1Meta);
                }
            }
        };

        this.gta1TilesImg.onload = checkReady;
        this.gta1TilesViceImg.onload = checkReady;
        this.gta1SpritesImg.onload = checkReady;
        this.gta1TilesImg.src = "assets/gta1/gta1_tiles.png?v=97_57";
        this.gta1TilesViceImg.src = "assets/gta1/gta1_tiles_vice.png?v=97_57";
        this.gta1SpritesImg.src = "assets/gta1/gta1_sprites.png?v=97_57";

        this.nycOverviewImg.onload = () => {
            this.nycOverviewReady = true;
            this.bakeRadarBackground();
        };
        this.nycOverviewImg.src = "assets/gta1/nyc_cmp_overview.png?v=97_57";

        this.viceOverviewImg.onload = () => {
            this.viceOverviewReady = true;
            this.bakeRadarBackground();
        };
        this.viceOverviewImg.src = "assets/gta1/vice_cmp_overview.png?v=97_57";

        fetch("assets/gta1/gta1_meta.json?v=97_57")
            .then((res) => res.json())
            .then((meta) => {
                this.gta1Meta = meta;
                checkReady();
            })
            .catch((err) => console.error("Failed to load gta1_meta.json:", err));

        fetch("assets/gta1/gta1_map.bin?v=97_57")
            .then((res) => res.arrayBuffer())
            .then((buf) => {
                mapBinBuffer = buf;
                checkReady();
            })
            .catch((err) => console.error("Failed to load gta1_map.bin:", err));
    }

    toggleMapStyle(game) {
        this.mapStyle = this.mapStyle === "VICE" ? "NYC" : "VICE";
        if (this.map) {
            this.map.mapStyle = this.mapStyle;
        }
        this.tilesTex = this.mapStyle === "VICE" ? this.tilesTexVice : this.tilesTexNyc;
        this.buildCityMesh();
        this.bakeRadarBackground();
        if (game && game.player) {
            game.currentDistrict = this.map.getDistrictName(game.player.x, game.player.y);
            game.districtPopupTimer = 3.2;
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.glCanvas) {
            this.glCanvas.width = window.innerWidth;
            this.glCanvas.height = window.innerHeight;
        }
    }

    /* ========================================================================
       2. BUILD 3D NYC.CMP CITYMESH (16x16 CHUNKS OF 16x16x6 VOXEL BLOCKS)
       Direct Port of GameMapHelpers::BuildMapMesh & PutBlockFace (lines 61-255)
       ======================================================================== */
    buildCityMesh() {
        const gl = this.gl;
        if (!gl || !this.map.cmpLoaded || !this.gta1Meta) return;

        // Clean up any previous buffers
        for (const ch of this.cityChunks) {
            if (ch.vbo) gl.deleteBuffer(ch.vbo);
        }
        this.cityChunks = [];

        const CHUNK_SIZE = 16;
        const NUM_CHUNKS = 16; // 16 * 16 = 256

        for (let cy = 0; cy < NUM_CHUNKS; cy++) {
            for (let cx = 0; cx < NUM_CHUNKS; cx++) {
                const opaqueVerts = [];
                const flatVerts = [];

                const x0 = cx * CHUNK_SIZE;
                const y0 = cy * CHUNK_SIZE;

                for (let z = 0; z < MAP_LAYERS; z++) {
                    for (let y = y0; y < y0 + CHUNK_SIZE; y++) {
                        for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
                            const blkIdx = this.map.getBlockIndex(x, y, z);
                            if (blkIdx === 0) continue;
                            const b = this.map.getBlockInfo(blkIdx);
                            if (!b) continue;

                            const targetArr = b.isFlat ? flatVerts : opaqueVerts;
                            for (let face = 0; face < 5; face++) {
                                if (b.faces[face] !== 0) {
                                    this.putBlockFace(targetArr, x, z, y, face, b);
                                }
                            }
                        }
                    }
                }

                const totalFloats = opaqueVerts.length + flatVerts.length;
                if (totalFloats === 0) continue;

                const combined = new Float32Array(totalFloats);
                combined.set(opaqueVerts, 0);
                combined.set(flatVerts, opaqueVerts.length);

                const vbo = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
                gl.bufferData(gl.ARRAY_BUFFER, combined, gl.STATIC_DRAW);

                this.cityChunks.push({
                    cx,
                    cy,
                    minX: x0,
                    maxX: x0 + CHUNK_SIZE,
                    minY: y0,
                    maxY: y0 + CHUNK_SIZE,
                    vbo,
                    opaqueCount: opaqueVerts.length / 6,
                    flatOffset: opaqueVerts.length / 6,
                    flatCount: flatVerts.length / 6
                });
            }
        }
    }

    putBlockFace(verts, x, y_elev, z_south, face, b) {
        const tileIdx = b.faces[face];
        if (tileIdx === 0) return;

        // 8 corners of the unit voxel block in 3D block coordinates:
        // X: East [x .. x+1], Y: Elevation [y_elev .. y_elev+1], Z: South [z_south .. z_south+1]
        const p = [
            [x,     y_elev + 1.0, z_south],     // 0: Top-NW
            [x + 1, y_elev + 1.0, z_south],     // 1: Top-NE
            [x,     y_elev,       z_south],     // 2: Bot-NW
            [x + 1, y_elev,       z_south],     // 3: Bot-NE
            [x,     y_elev + 1.0, z_south + 1], // 4: Top-SW
            [x + 1, y_elev + 1.0, z_south + 1], // 5: Top-SE
            [x,     y_elev,       z_south + 1], // 6: Bot-SW
            [x + 1, y_elev,       z_south + 1]  // 7: Bot-SE
        ];

        // Exact 44 slope vertex adjustments from GameMapHelpers.cpp (lines 82-182)
        const st = b.slopeType;
        if (st > 0 && st < 45) {
            switch (st) {
                case 1:
                    p[0][1] -= 0.5; p[1][1] -= 0.5;
                    p[4][1] -= 1.0; p[5][1] -= 1.0;
                    break;
                case 2:
                    p[4][1] -= 0.5; p[5][1] -= 0.5;
                    break;
                case 3:
                    p[0][1] -= 1.0; p[1][1] -= 1.0;
                    p[4][1] -= 0.5; p[5][1] -= 0.5;
                    break;
                case 4:
                    p[0][1] -= 0.5; p[1][1] -= 0.5;
                    break;
                case 5:
                    p[0][1] -= 0.5; p[4][1] -= 0.5;
                    p[1][1] -= 1.0; p[5][1] -= 1.0;
                    break;
                case 6:
                    p[1][1] -= 0.5; p[5][1] -= 0.5;
                    break;
                case 7:
                    p[0][1] -= 1.0; p[4][1] -= 1.0;
                    p[1][1] -= 0.5; p[5][1] -= 0.5;
                    break;
                case 8:
                    p[0][1] -= 0.5; p[4][1] -= 0.5;
                    break;
                case 9: case 10: case 11: case 12: case 13: case 14: case 15: case 16: {
                    const s = st - 9;
                    p[0][1] -= 1.0 - (s + 1) * 0.125;
                    p[1][1] -= 1.0 - (s + 1) * 0.125;
                    p[4][1] -= 1.0 - s * 0.125;
                    p[5][1] -= 1.0 - s * 0.125;
                    break;
                }
                case 17: case 18: case 19: case 20: case 21: case 22: case 23: case 24: {
                    const s = st - 17;
                    p[4][1] -= 1.0 - (s + 1) * 0.125;
                    p[5][1] -= 1.0 - (s + 1) * 0.125;
                    p[0][1] -= 1.0 - s * 0.125;
                    p[1][1] -= 1.0 - s * 0.125;
                    break;
                }
                case 25: case 26: case 27: case 28: case 29: case 30: case 31: case 32: {
                    const s = st - 25;
                    p[0][1] -= 1.0 - (s + 1) * 0.125;
                    p[4][1] -= 1.0 - (s + 1) * 0.125;
                    p[1][1] -= 1.0 - s * 0.125;
                    p[5][1] -= 1.0 - s * 0.125;
                    break;
                }
                case 33: case 34: case 35: case 36: case 37: case 38: case 39: case 40: {
                    const s = st - 33;
                    p[1][1] -= 1.0 - (s + 1) * 0.125;
                    p[5][1] -= 1.0 - (s + 1) * 0.125;
                    p[0][1] -= 1.0 - s * 0.125;
                    p[4][1] -= 1.0 - s * 0.125;
                    break;
                }
                case 41:
                    p[4][1] -= 1.0; p[5][1] -= 1.0;
                    break;
                case 42:
                    p[0][1] -= 1.0; p[1][1] -= 1.0;
                    break;
                case 43:
                    p[1][1] -= 1.0; p[5][1] -= 1.0;
                    break;
                case 44:
                    p[0][1] -= 1.0; p[4][1] -= 1.0;
                    break;
            }
        }

        // Select quad corner vertex indices (GameMapHelpers.cpp lines 184-213)
        let qi;
        if (b.isFlat) {
            if (face === 0) qi = [4, 0, 6, 2];      // W
            else if (face === 1) qi = [0, 4, 2, 6]; // E drawn at W plane when flat
            else if (face === 2) qi = [0, 1, 2, 3]; // N
            else if (face === 3) qi = [0, 1, 2, 3]; // S drawn at N plane when flat
            else qi = [0, 1, 4, 5];                 // Lid
        } else {
            if (face === 0) qi = [4, 0, 6, 2];      // W
            else if (face === 1) qi = [1, 5, 3, 7]; // E
            else if (face === 2) qi = [0, 1, 2, 3]; // N
            else if (face === 3) qi = [5, 4, 7, 6]; // S
            else qi = [0, 1, 4, 5];                 // Lid
        }

        // Compute UV corner permutation (0:TL, 1:TR, 2:BL, 3:BR)
        let uvIdx = [0, 1, 2, 3];
        if (face === 4 && b.lidRotation > 0) {
            const rot = b.lidRotation & 3;
            for (let r = 0; r < rot; r++) {
                uvIdx = [uvIdx[2], uvIdx[0], uvIdx[3], uvIdx[1]];
            }
        }
        if (b.flipLR) {
            uvIdx = [uvIdx[1], uvIdx[0], uvIdx[3], uvIdx[2]];
        }
        if (b.flipTB) {
            uvIdx = [uvIdx[2], uvIdx[3], uvIdx[0], uvIdx[1]];
        }

        // Compute atlas index in gta1_tiles.png (16 cols x 51 rows, 64x64 per tile)
        const tiles = this.gta1Meta.tiles;
        let atlasIdx = 0;
        let animType = 0.0;

        if (face < 4) {
            // Side face (0..194)
            const base = b.isFlat ? (tiles.side_flat_start || 195) : (tiles.side_start || 0);
            atlasIdx = base + (tileIdx % tiles.side_count);
        } else {
            // Lid face (0..153): directly uses compiled GTA 6 lid indices (lid 8 sidewalk, lid 9 boardwalk, lid 98 golden sand, lid 99 surf shoreline)
            let effTileIdx = tileIdx;
            let effRemap = b.remap;

            if (effTileIdx === 41) animType = 1.0;      // Animated water
            else if (effTileIdx === 22) animType = 2.0; // Animated rooftop fan

            if (effRemap > 0 && tiles.remap_lids) {
                const rKey = `${effTileIdx}_${effRemap}`;
                if (tiles.remap_lids[rKey] !== undefined) {
                    atlasIdx = tiles.remap_lids[rKey];
                } else {
                    atlasIdx = (b.isFlat ? tiles.lid_flat_start : tiles.lid_start) + (effTileIdx % tiles.lid_count);
                }
            } else {
                atlasIdx = (b.isFlat ? tiles.lid_flat_start : tiles.lid_start) + (effTileIdx % tiles.lid_count);
            }
        }

        const col = atlasIdx % 16;
        const row = Math.floor(atlasIdx / 16);
        // Inset UV by 0.25 texels to prevent mip/edge bleeding at perspective angles
        const padU = 0.25 / 1024.0;
        const padV = 0.25 / 3264.0;
        const u0 = col / 16.0 + padU;
        const u1 = (col + 1.0) / 16.0 - padU;
        const v0 = row / 51.0 + padV;
        const v1 = (row + 1.0) / 51.0 - padV;

        const baseUV = [
            [u0, v0], // 0: TL
            [u1, v0], // 1: TR
            [u0, v1], // 2: BL
            [u1, v1]  // 3: BR
        ];

        // Emit 2 triangles for quad: (0, 2, 1) and (1, 2, 3)
        const triOrder = [0, 2, 1, 1, 2, 3];
        for (let k = 0; k < 6; k++) {
            const c = triOrder[k];
            const pos = p[qi[c]];
            const uv = baseUV[uvIdx[c]];
            verts.push(pos[0], pos[1], pos[2], uv[0], uv[1], animType);
        }
    }

    /* ========================================================================
       3. TRUE 3D PERSPECTIVE CAMERA MATRIX & WORLD-TO-SCREEN PROJECTION
       Exact Port of FollowCameraController.cpp + GameCamera.cpp:
       - fovy = 55.0 deg
       - mFollowPedCameraHeight = 20.0m (5.0 map blocks above player ground z)
       - Looking straight down (-Y elevation axis) with Up = (0, 0, -1) (North)
       ======================================================================== */
    computeViewProjMatrix() {
        const W = Math.max(1, this.canvas.width);
        const H = Math.max(1, this.canvas.height);
        const aspect = W / H;
        const fovyRad = (55.0 * Math.PI) / 180.0;
        const f = 1.0 / Math.tan(fovyRad * 0.5); // ~1.92098

        const camXBlocks = this.camX / TILE_SIZE;
        const camYBlocks = this.camY / TILE_SIZE;
        const distBlocks = Math.max(2.2, this.followHeightBlocks + this.zoomOffsetBlocks);
        const camElev = this.camZBlocks + distBlocks;
        this.currentCamElev = camElev;
        this.currentCamDist = distBlocks;

        const near = 0.25;
        const far = 64.0;
        const A = (far + near) / (far - near);
        const B = (-2.0 * far * near) / (far - near);

        const sx = f / aspect;
        const sy = -f;

        // Column-major 4x4 ViewProjection matrix mapping (x_east, y_elev, z_south, 1):
        // clipX = (x - camXBlocks) * sx
        // clipY = (z_south - camYBlocks) * sy  (so North z < camY is +Y top of screen)
        // clipZ = A * (camElev - y_elev) + B
        // clipW = (camElev - y_elev)
        return new Float32Array([
            sx,  0,   0,  0,
            0,   0,  -A, -1,
            0,   sy,  0,  0,
            -camXBlocks * sx, -camYBlocks * sy, A * camElev + B, camElev
        ]);
    }

    worldToScreen(px, py, zBlocks = 2.0) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const aspect = W / Math.max(1, H);
        const f = 1.0 / Math.tan((55.0 * Math.PI) / 360.0);

        const xBlocks = px / TILE_SIZE;
        const yBlocks = py / TILE_SIZE;
        const camXBlocks = this.camX / TILE_SIZE;
        const camYBlocks = this.camY / TILE_SIZE;
        const camElev = this.currentCamElev || (this.camZBlocks + this.followHeightBlocks);
        const w = Math.max(0.25, camElev - zBlocks);

        const ndcX = ((xBlocks - camXBlocks) * (f / aspect)) / w;
        const ndcY = (-(yBlocks - camYBlocks) * f) / w;

        return {
            x: (ndcX * 0.5 + 0.5) * W,
            y: (0.5 - ndcY * 0.5) * H,
            scale: f / w
        };
    }

    /* ========================================================================
       4. WEBGL 3D SPRITEBATCH (Draws rotated 3D quads in world block units)
       Exact Port of SpriteBatch.cpp:
       - PIXELS_PER_MAP_UNIT = 64.0
       - SortSprites(eSpritesSortMode_HeightAndDrawOrder)
       ======================================================================== */
    beginSpriteBatch() {
        this.spriteCount = 0;
        if (!this.spriteQueue) {
            this.spriteQueue = [];
        } else {
            this.spriteQueue.length = 0;
        }
    }

    pushSpriteQuad3D(
        xPx,
        yPx,
        zBlocks,
        wPx,
        hPx,
        angleRad,
        u0,
        v0,
        u1,
        v1,
        r = 1,
        g = 1,
        b = 1,
        a = 1,
        drawOrder = 4
    ) {
        if (!this.spriteQueue) this.spriteQueue = [];
        if (this.spriteQueue.length >= this.maxSprites) return;
        this.spriteQueue.push({
            xPx,
            yPx,
            zBlocks,
            wPx,
            hPx,
            angleRad,
            u0,
            v0,
            u1,
            v1,
            r,
            g,
            b,
            a,
            drawOrder,
            seq: this.spriteQueue.length
        });
    }

    pushAtlasSprite3D(rect, xPx, yPx, zBlocks, angleRad = 0, scale = 1.0, drawOrder = 4, r = 1, g = 1, b = 1, a = 1) {
        if (!rect || !this.gta1SpritesImg.width) return;
        const [sx, sy, sw, sh] = rect;
        const texW = this.gta1SpritesImg.width;
        const texH = this.gta1SpritesImg.height;
        const u0 = (sx + 0.15) / texW;
        const v0 = (sy + 0.15) / texH;
        const u1 = (sx + sw - 0.15) / texW;
        const v1 = (sy + sh - 0.15) / texH;
        this.pushSpriteQuad3D(xPx, yPx, zBlocks, sw * scale, sh * scale, angleRad, u0, v0, u1, v1, r, g, b, a, drawOrder);
    }

    pushSolidQuad3D(xPx, yPx, zBlocks, wPx, hPx, angleRad, r, g, b, a, drawOrder = 1) {
        this.pushSpriteQuad3D(xPx, yPx, zBlocks, wPx, hPx, angleRad, -1.0, -1.0, -1.0, -1.0, r, g, b, a, drawOrder);
    }

    /* ========================================================================
       SpriteBatch::SortSprites (SpriteBatch.cpp:201-213)
       Sorts by (mHeight, mDrawOrder) using quantized layer bucket + eSpriteDrawOrder
       ======================================================================== */
    sortAndBuildSpriteBatch() {
        if (!this.spriteQueue || this.spriteQueue.length === 0) {
            this.spriteCount = 0;
            return;
        }
        this.spriteQueue.sort((lhs, rhs) => {
            const lh = Math.round(lhs.zBlocks * 2.0);
            const rh = Math.round(rhs.zBlocks * 2.0);
            if (lh !== rh) return lh - rh;
            if (lhs.drawOrder !== rhs.drawOrder) return lhs.drawOrder - rhs.drawOrder;
            if (lhs.zBlocks !== rhs.zBlocks) return lhs.zBlocks - rhs.zBlocks;
            return lhs.seq - rhs.seq;
        });

        const tri = [0, 2, 1, 1, 2, 3];
        const verts = this.spriteVerts;
        let offset = 0;
        const count = Math.min(this.maxSprites, this.spriteQueue.length);

        for (let i = 0; i < count; i++) {
            const s = this.spriteQueue[i];
            const cx = s.xPx / TILE_SIZE;
            const cz = s.yPx / TILE_SIZE;
            const hw = (s.wPx / TILE_SIZE) * 0.5;
            const hh = (s.hPx / TILE_SIZE) * 0.5;
            const cosA = Math.cos(s.angleRad);
            const sinA = Math.sin(s.angleRad);

            const lx0 = -hw, lx1 = hw, lx2 = -hw, lx3 = hw;
            const lz0 = -hh, lz1 = -hh, lz2 = hh, lz3 = hh;
            const lx = [lx0, lx1, lx2, lx3];
            const lz = [lz0, lz1, lz2, lz3];
            const uvs = [
                [s.u0, s.v0],
                [s.u1, s.v0],
                [s.u0, s.v1],
                [s.u1, s.v1]
            ];

            for (let k = 0; k < 6; k++) {
                const idx = tri[k];
                const wx = cx + lx[idx] * cosA - lz[idx] * sinA;
                const wz = cz + lx[idx] * sinA + lz[idx] * cosA;
                verts[offset++] = wx;
                verts[offset++] = s.zBlocks;
                verts[offset++] = wz;
                verts[offset++] = uvs[idx][0];
                verts[offset++] = uvs[idx][1];
                verts[offset++] = s.r;
                verts[offset++] = s.g;
                verts[offset++] = s.b;
                verts[offset++] = s.a;
            }
        }
        this.spriteCount = count;
    }

    flushSpriteBatch(viewProj) {
        const gl = this.gl;
        this.sortAndBuildSpriteBatch();
        if (!gl || this.spriteCount === 0 || !this.spritesTex) return;

        gl.useProgram(this.spriteProg);
        gl.uniformMatrix4fv(this.spriteLocs.uViewProj, false, viewProj);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.spritesTex);
        gl.uniform1i(this.spriteLocs.uTex, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.spriteVerts.subarray(0, this.spriteCount * 6 * 9),
            gl.DYNAMIC_DRAW
        );

        const stride = 9 * 4;
        gl.enableVertexAttribArray(this.spriteLocs.aPos);
        gl.vertexAttribPointer(this.spriteLocs.aPos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(this.spriteLocs.aUV);
        gl.vertexAttribPointer(this.spriteLocs.aUV, 2, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(this.spriteLocs.aColor);
        gl.vertexAttribPointer(this.spriteLocs.aColor, 4, gl.FLOAT, false, stride, 20);

        // Depth test enabled so 3D buildings/bridges occlude sprites below/behind them,
        // while depthMask(false) allows overlapping sprites (shadows, drivers, turrets, sirens) to layer cleanly!
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArrays(gl.TRIANGLES, 0, this.spriteCount * 6);

        gl.depthMask(true);
    }

    /* ========================================================================
       5. MAIN RENDER ENTRYPOINT
       ======================================================================== */
    render(game, dt) {
        this.time += dt;
        if (dt > 0.001 && dt < 0.25) {
            this.lastFrameDt = dt;
            this.fpsSmoothed = this.fpsSmoothed * 0.9 + (1.0 / dt) * 0.1;
        }

        // Detect vehicle entry to trigger authentic GTA 1 car name banner (HUD.cpp)
        const curVeh = game.player.inVehicle;
        const curVehId = curVeh ? curVeh.id : null;
        if (curVehId && curVehId !== this.lastVehicleId) {
            this.vehicleBannerName = curVeh.name || "STALLION";
            this.vehicleBannerTimer = 3.2;
        }
        this.lastVehicleId = curVehId;
        if (this.vehicleBannerTimer > 0) {
            this.vehicleBannerTimer = Math.max(0, this.vehicleBannerTimer - dt);
        }

        // FollowCameraController.cpp: Smoothly track player X, Y and ground elevation Z
        const target = game.player.inVehicle || game.player;
        const leadX = curVeh ? Math.cos(curVeh.angle) * Math.abs(curVeh.speed) * 0.18 : 0;
        const leadY = curVeh ? Math.sin(curVeh.angle) * Math.abs(curVeh.speed) * 0.18 : 0;

        this.camX += (target.x + leadX - this.camX) * Math.min(1, dt * 8.5);
        this.camY += (target.y + leadY - this.camY) * Math.min(1, dt * 8.5);

        const rawTargetZ = target.z !== undefined
            ? target.z
            : this.map.getHeightAtPixel(target.x, target.y, this.camZBlocks);
        this.camZBlocks += (rawTargetZ - this.camZBlocks) * Math.min(1, dt * 6.0);

        // Velocity zoom-out when driving fast (FollowCameraController.cpp mStartupSpeedMax)
        const speedZoomBlocks = curVeh ? Math.min(1.6, Math.abs(curVeh.speed) / 260.0) : 0.0;
        const effectiveViewProj = this.computeViewProjMatrixWithSpeed(speedZoomBlocks);

        // 1. Render 3D WebGL CityMesh + 3D SpriteBatch into this.glCanvas
        this.renderWebGLScene(game, effectiveViewProj);

        // 2. Composite WebGL 3D scene onto 2D main canvas + draw floating scores, HUD & Game Cheats window
        const ctx = this.ctx;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.glCanvas, 0, 0);

        // Optional Carnage3D DebugRenderer Wireframe Overlay (Vehicle::DebugDraw / Pedestrian::DebugDraw)
        if (this.debugDrawPhysics && !game.activeInterior) {
            this.renderDebugWireframe(ctx, game);
        }

        this.cheatButtons = [];

        // World 2D Prompts for Enterable Venue Doors & Stunt Jumps (or Active Interior Room!)
        if (game.activeInterior) {
            this.renderActiveInterior(ctx, game);
        } else {
            this.renderWorldFunPrompts(ctx, game);
        }

        // Floating cash/score popups projected from 3D world to screen
        for (const ft of game.floatingTexts) {
            if (game.activeInterior) {
                this.drawGta1FontString(ctx, "SUB2", String(ft.text || "").toUpperCase(), this.canvas.width * 0.5, 118, 1.35, "center");
            } else {
                const ftZ = ft.z !== undefined ? ft.z : (this.camZBlocks + 0.35);
                const sp = this.worldToScreen(ft.x, ft.y, ftZ);
                this.drawGta1FontString(ctx, "SUB2", String(ft.text || "").toUpperCase(), sp.x, sp.y, 1.35, "center");
            }
        }

        // Authentic 1997 GTA 1 / carnage3d .FON & .G24 HUD Overlay + Top-Right Live Vice City Minimap
        this.renderAuthenticGta1Hud(ctx, game);

        // Authentic carnage3D_wasm.html "Game Cheats" ImGui Window (Top-Left, toggle with [C])
        this.renderCarnage3DCheatsWindow(ctx, game);

        ctx.restore();
    }

    computeViewProjMatrixWithSpeed(extraHeightBlocks = 0) {
        const saved = this.zoomOffsetBlocks;
        this.zoomOffsetBlocks = saved + extraHeightBlocks;
        const mat = this.computeViewProjMatrix();
        this.zoomOffsetBlocks = saved;
        return mat;
    }

    renderWebGLScene(game, viewProj) {
        const gl = this.gl;
        if (!gl) return;

        gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        if (this.mapStyle === "VICE") {
            // Tropical Atlantic / Biscayne Bay turquoise sea-level clear color
            if (this.nightMode) {
                gl.clearColor(0.02, 0.16, 0.28, 1.0);
            } else {
                gl.clearColor(0.03, 0.44, 0.56, 1.0);
            }
        } else {
            // Sea-level dark abyss clear color (matches MapRenderer.cpp)
            gl.clearColor(0.08, 0.14, 0.18, 1.0);
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const activeTilesTex = this.mapStyle === "VICE"
            ? (this.tilesTexVice || this.tilesTex)
            : (this.tilesTexNyc || this.tilesTex);
        if (!this.gta1Ready || !this.cmpReady || !activeTilesTex) return;

        // Visible ground frustum in block units (with margin for tall z=6 skyscrapers)
        const camXBlocks = this.camX / TILE_SIZE;
        const camYBlocks = this.camY / TILE_SIZE;
        const marginX = 14.0;
        const marginY = 11.0;
        const minBX = camXBlocks - marginX;
        const maxBX = camXBlocks + marginX;
        const minBY = camYBlocks - marginY;
        const maxBY = camYBlocks + marginY;

        // A. Draw 3D NYC.CMP Voxel CityMesh Chunks
        gl.useProgram(this.cityProg);
        gl.uniformMatrix4fv(this.cityLocs.uViewProj, false, viewProj);
        gl.uniform1f(this.cityLocs.uWaterStep, Math.floor(this.time * 7.0) % 11);
        gl.uniform1f(this.cityLocs.uFanStep, Math.floor(this.time * 9.0) % 6);
        gl.uniform1f(this.cityLocs.uNightTint, this.nightMode ? 1.0 : 0.0);
        gl.uniform1f(this.cityLocs.uViceStyle, this.mapStyle === "VICE" ? 1.0 : 0.0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, activeTilesTex);
        gl.uniform1i(this.cityLocs.uTex, 0);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disable(gl.CULL_FACE);

        const stride = 6 * 4;
        // Pass 1: Opaque voxel blocks
        for (const ch of this.cityChunks) {
            if (ch.maxX < minBX || ch.minX > maxBX || ch.maxY < minBY || ch.minY > maxBY) continue;
            if (ch.opaqueCount === 0) continue;
            gl.bindBuffer(gl.ARRAY_BUFFER, ch.vbo);
            gl.enableVertexAttribArray(this.cityLocs.aPos);
            gl.vertexAttribPointer(this.cityLocs.aPos, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(this.cityLocs.aUV);
            gl.vertexAttribPointer(this.cityLocs.aUV, 2, gl.FLOAT, false, stride, 12);
            gl.enableVertexAttribArray(this.cityLocs.aAnim);
            gl.vertexAttribPointer(this.cityLocs.aAnim, 1, gl.FLOAT, false, stride, 20);
            gl.drawArrays(gl.TRIANGLES, 0, ch.opaqueCount);
        }

        // Pass 2: Flat transparent voxel blocks (railings, fences, bridge girders, water animations)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        for (const ch of this.cityChunks) {
            if (ch.maxX < minBX || ch.minX > maxBX || ch.maxY < minBY || ch.minY > maxBY) continue;
            if (ch.flatCount === 0) continue;
            gl.bindBuffer(gl.ARRAY_BUFFER, ch.vbo);
            gl.enableVertexAttribArray(this.cityLocs.aPos);
            gl.vertexAttribPointer(this.cityLocs.aPos, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(this.cityLocs.aUV);
            gl.vertexAttribPointer(this.cityLocs.aUV, 2, gl.FLOAT, false, stride, 12);
            gl.enableVertexAttribArray(this.cityLocs.aAnim);
            gl.vertexAttribPointer(this.cityLocs.aAnim, 1, gl.FLOAT, false, stride, 20);
            gl.drawArrays(gl.TRIANGLES, ch.flatOffset, ch.flatCount);
        }

        // B. Populate & Flush 3D Depth-Tested SpriteBatch
        const minPxX = minBX * TILE_SIZE;
        const maxPxX = maxBX * TILE_SIZE;
        const minPxY = minBY * TILE_SIZE;
        const maxPxY = maxBY * TILE_SIZE;

        this.beginSpriteBatch();
        this.batchWorldSprites3D(game, minPxX, minPxY, maxPxX, maxPxY);
        this.flushSpriteBatch(viewProj);
    }

    getEntityZ(ent, offset = 0.03) {
        if (ent && typeof ent.z === "number" && !Number.isNaN(ent.z)) {
            return ent.z + offset;
        }
        const h = this.map.getHeightAtPixel(ent.x, ent.y, this.camZBlocks);
        if (ent) ent.z = h;
        return h + offset;
    }

    batchObjectSprite3D(objIdStr, x, y, zBlocks, angle = 0, scale = 1.0, drawOrder = SPRITE_DRAW_ORDER.MAP_OBJECT) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.objects[objIdStr]) return;
        const rect = this.gta1Meta.sprites.objects[objIdStr];
        this.pushAtlasSprite3D(rect, x, y, zBlocks, angle, scale, drawOrder);
    }

    batchPedSprite3D(pedType, frameIdx, x, y, zBlocks, angle, scale = 1.0, muzzleFlash = false, drawOrder = SPRITE_DRAW_ORDER.PEDESTRIAN) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.peds[pedType]) return;
        const frames = this.gta1Meta.sprites.peds[pedType];
        const rect = frames[String(frameIdx)] || frames["98"] || frames["0"];
        if (!rect) return;
        // SPRITE_ZERO_ANGLE = 90.0f in GameDefs.h: .G24 sprites face South (+Y, Math.PI/2)
        const rot = angle - Math.PI * 0.5;
        this.pushAtlasSprite3D(rect, x, y, zBlocks, rot, scale, drawOrder);

        if (muzzleFlash && this.gta1Meta.sprites.objects["234"]) {
            const fl = this.gta1Meta.sprites.objects["234"];
            const fx = x + Math.cos(angle) * 10;
            const fy = y + Math.sin(angle) * 10;
            this.pushAtlasSprite3D(fl, fx, fy, zBlocks + 0.02, rot, 0.55, SPRITE_DRAW_ORDER.PROJECTILES);
        }
    }

    batchWorldSprites3D(game, minX, minY, maxX, maxY) {
        // 1. Tire Skidmarks on Road Surface (eSpriteDrawOrder_TireMarks)
        for (const s of game.skidmarks) {
            if (s.x < minX || s.x > maxX || s.y < minY || s.y > maxY) continue;
            const sz = this.getEntityZ(s, 0.015);
            this.pushSolidQuad3D(s.x, s.y, sz, 3, 3, 0, 0.08, 0.08, 0.10, 0.45, SPRITE_DRAW_ORDER.TIRE_MARKS);
        }

        // 2. Crates, Kill Frenzies, Info Signs, Powerups & Ringing Payphones (eSpriteDrawOrder_MapObject)
        if (this.map.crates) {
            for (const cr of this.map.crates) {
                if (cr.smashed) continue;
                if (cr.x < minX || cr.x > maxX || cr.y < minY || cr.y > maxY) continue;
                this.batchObjectSprite3D("503", cr.x, cr.y, this.getEntityZ(cr, 0.04), 0, 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        if (this.map.killFrenzies) {
            for (const kf of this.map.killFrenzies) {
                if (kf.cooldown > 0) continue;
                if (kf.x < minX || kf.x > maxX || kf.y < minY || kf.y > maxY) continue;
                const anim8 = Math.floor(this.time * 10) % 8;
                this.batchObjectSprite3D(String(556 + anim8), kf.x, kf.y, this.getEntityZ(kf, 0.06), 0, 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        for (const pk of this.map.pickups) {
            if (pk.respawnTimer > 0) continue;
            if (pk.x < minX || pk.x > maxX || pk.y < minY || pk.y > maxY) continue;
            const anim8 = Math.floor(this.time * 10 + pk.x * 0.05) % 8;
            let sprId = 548 + (anim8 % 6);
            if (pk.type === "WEAPON") {
                if (pk.subtype === "PISTOL") sprId = 548 + (anim8 % 6);
                else if (pk.subtype === "UZI" || pk.subtype === "SHOTGUN") sprId = 554 + (anim8 % 2);
                else if (pk.subtype === "ROCKET") sprId = 556 + anim8;
                else if (pk.subtype === "FLAMETHROWER") sprId = 564 + anim8;
                else sprId = 556 + anim8;
            } else if (pk.type === "ARMOR") sprId = 597 + anim8;
            else if (pk.type === "HEALTH") sprId = 621 + anim8;
            else if (pk.type === "BRIBE") sprId = 637 + anim8;
            else if (pk.type === "JAIL_FREE") sprId = 613 + anim8;
            else if (pk.type === "MULTIPLIER") sprId = 605 + anim8;
            else if (pk.type === "EXTRA_LIFE") sprId = 629 + anim8;
            else if (pk.type === "CASH") sprId = 277;

            this.batchObjectSprite3D(String(sprId), pk.x, pk.y, this.getEntityZ(pk, 0.05), 0, 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
        }

        for (const ph of game.missions.payphones) {
            if (ph.x < minX || ph.x > maxX || ph.y < minY || ph.y > maxY) continue;
            const isRinging = !ph.completed && !game.missions.activeMission;
            const phoneFrame = isRinging ? 274 + (Math.floor(this.time * 12) % 3) : 274;
            this.batchObjectSprite3D(String(phoneFrame), ph.x, ph.y, this.getEntityZ(ph, 0.06), 0, 1.05, SPRITE_DRAW_ORDER.MAP_OBJECT);
        }

        const m = game.missions.activeMission;
        if (m && m.crates) {
            for (const c of m.crates) {
                this.batchObjectSprite3D("503", c.x, c.y, this.getEntityZ(c, 0.05), 0, 1.05, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        // 2B. Enterable Venue Interior Glowing Door Mats & Unique Stunt Jump Ramps in 3D
        if (Array.isArray(this.map.interiors)) {
            const pulse = 0.65 + Math.sin(this.time * 6.0) * 0.25;
            for (const intr of this.map.interiors) {
                if (intr.doorX < minX || intr.doorX > maxX || intr.doorY < minY || intr.doorY > maxY) continue;
                const dz = this.map.getHeightAtPixel(intr.doorX, intr.doorY, 2.0) + 0.03;
                this.pushSolidQuad3D(intr.doorX, intr.doorY, dz, 26, 26, this.time * 1.2, 0.96, 0.25, 0.65, pulse, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(intr.doorX, intr.doorY, dz + 0.01, 16, 16, -this.time * 1.8, 0.15, 0.92, 0.98, 0.9, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }
        if (Array.isArray(this.map.stuntRamps)) {
            for (const ramp of this.map.stuntRamps) {
                if (ramp.x < minX || ramp.x > maxX || ramp.y < minY || ramp.y > maxY) continue;
                const rz = this.map.getHeightAtPixel(ramp.x, ramp.y, 2.0) + 0.025;
                this.pushSolidQuad3D(ramp.x, ramp.y, rz, 36, 22, ramp.angle || 0, 0.98, 0.68, 0.08, 0.92, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(ramp.x, ramp.y, rz + 0.01, 24, 14, ramp.angle || 0, 0.99, 0.92, 0.25, 0.95, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        // 3. Dead Pedestrians & Blood Pools (Sprite 444 + Frame 42 — eSpriteDrawOrder_Corpse)
        for (const ped of game.peds) {
            if (!ped.dead) continue;
            if (ped.x < minX || ped.x > maxX || ped.y < minY || ped.y > maxY) continue;
            const pz = this.getEntityZ(ped, 0.025);
            this.batchObjectSprite3D("444", ped.x, ped.y, pz, ped.angle, 1.0, SPRITE_DRAW_ORDER.CORPSE);
            let pedType = ped.g24Type || "civ2";
            if (ped.kind === "MONK") pedType = "monk";
            else if (ped.kind === "COP") pedType = "police";
            this.batchPedSprite3D(pedType, 42, ped.x, ped.y, pz + 0.005, ped.angle, 1.0, false, SPRITE_DRAW_ORDER.CORPSE);
        }

        // 4. Living Pedestrians, Monks, Cops, Jason Duval & Lucia Caminos (eSpriteDrawOrder_Pedestrian / JumpingPedestrian)
        // Native carnage3d .G24 ped scale = 1.0 (15x11 texels = 15/64 x 11/64 map blocks!)
        const pedScale = 1.0;
        for (const ped of game.peds) {
            if (ped.dead) continue;
            if (ped.x < minX || ped.x > maxX || ped.y < minY || ped.y > maxY) continue;
            if (ped.animSeed === undefined) ped.animSeed = (ped.x + ped.y) * 0.01;
            const pz = this.getEntityZ(ped, 0.04);

            let pedType = ped.g24Type;
            if (!pedType) {
                if (ped.kind === "MONK") pedType = "monk";
                else if (ped.kind === "COP") pedType = "police";
                else if (ped.kind === "HOSTILE" || ped.archetype === "PAULY" || ped.archetype === "DELL") pedType = "gang";
                else {
                    const civTypes = ["gang", "civ0", "civ1", "civ2", "civ3"];
                    const h = Math.abs(Math.floor(ped.x * 0.13 + ped.y * 0.07)) % civTypes.length;
                    pedType = civTypes[h];
                    ped.g24Type = pedType;
                }
            }

            if (ped.kind === "GATOR") {
                this.pushSolidQuad3D(ped.x, ped.y, pz, 24, 7, ped.angle, 0.21, 0.33, 0.08, 1.0, SPRITE_DRAW_ORDER.PEDESTRIAN);
                continue;
            }

            const pedDrawOrder = typeof ped.getDrawOrder === "function"
                ? ped.getDrawOrder()
                : SPRITE_DRAW_ORDER.PEDESTRIAN;

            let frameIdx;
            if ((ped.stunnedTimer || 0) > 0) {
                // Authentic GTA 1 fall_long / stunned frames (38..41)
                const prog = Math.max(0, Math.min(1, 1.0 - ped.stunnedTimer / 1.2));
                frameIdx = 38 + Math.min(3, Math.floor(prog * 4));
            } else if ((ped.exitAnimTimer || 0) > 0) {
                // Authentic GTA 1 exit_bike frames (85..88) or exit_car frames (16..23)
                const prog = Math.max(0, Math.min(1, 1.0 - ped.exitAnimTimer / 0.32));
                frameIdx = ped.fromBike
                    ? (85 + Math.min(3, Math.floor(prog * 4)))
                    : (16 + Math.min(7, Math.floor(prog * 8)));
            } else if (ped.kind === "MONK") {
                const walkPhase = this.time * 1.6 + (ped.monkIndex || 0) * 0.25;
                frameIdx = this.getPedFrameIndex("FIST", true, false, walkPhase);
            } else if (ped.kind === "COP") {
                const walkPhase = this.time * 1.8 + ped.animSeed;
                frameIdx = this.getPedFrameIndex("PISTOL", true, true, walkPhase);
            } else if (ped.kind === "HOSTILE") {
                const walkPhase = this.time * 2.2 + ped.animSeed;
                frameIdx = this.getPedFrameIndex("FIST", true, true, walkPhase);
            } else {
                const isRunning = (ped.panicTimer || 0) > 0 || (ped.burnTimer || 0) > 0;
                const walkPhase = this.time * (isRunning ? 2.4 : 1.5) + ped.animSeed;
                frameIdx = this.getPedFrameIndex("FIST", ped.speed > 0, isRunning, walkPhase);
            }

            this.batchPedSprite3D(pedType, frameIdx, ped.x, ped.y, pz, ped.angle, pedScale, false, pedDrawOrder);

            // Carnage3D Pedestrian::SetBurnEffectActive — attach .G24 fire sprite (234..241) on burning peds!
            if ((ped.burnTimer || 0) > 0) {
                const fireFrame = 234 + (Math.floor(this.time * 14 + ped.animSeed * 10) % 8);
                this.batchObjectSprite3D(String(fireFrame), ped.x, ped.y, pz + 0.025, 0, 0.78, SPRITE_DRAW_ORDER.EXPLOSION);
            }
        }

        const jason = game.jason;
        if (jason && !jason.inVehicle) {
            const jWeapon = jason.weaponKey || "FIST";
            const frameIdx = this.getPedFrameIndex(jWeapon, Boolean(jason.isMoving), Boolean(jason.isRunning), jason.walkPhase || 0);
            this.batchPedSprite3D(
                "jason",
                frameIdx,
                jason.x,
                jason.y,
                this.getEntityZ(jason, 0.045),
                jason.angle,
                pedScale * 1.18,
                (jason.muzzleTimer || 0) > 0,
                SPRITE_DRAW_ORDER.PEDESTRIAN
            );
        }

        const p = game.player;
        if (!p.inVehicle) {
            const baseZ = this.getEntityZ(p, 0.05);
            const jumpZ = p.jumpZOffset || 0;
            const isJumpingOrSliding = jumpZ > 0.02 || (p.slideCarTimer || 0) > 0;
            if (jumpZ > 0.02) {
                // Draw dark ground shadow under jumping character
                this.pushSolidQuad3D(p.x, p.y, baseZ - 0.02, 12, 12, 0, 0.05, 0.05, 0.08, 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }

            let frameIdx;
            if ((p.slideCarTimer || 0) > 0) {
                // Authentic GTA 1 jump_onto_car / slide_on_car frames (91..96)
                const prog = Math.max(0, Math.min(1, 1.0 - p.slideCarTimer / 0.42));
                frameIdx = 91 + Math.min(5, Math.floor(prog * 6));
            } else if ((p.exitAnimTimer || 0) > 0) {
                // Authentic GTA 1 exit_bike frames (85..88) or exit_car frames (16..23)
                const prog = Math.max(0, Math.min(1, 1.0 - p.exitAnimTimer / 0.36));
                frameIdx = p.fromBike
                    ? (85 + Math.min(3, Math.floor(prog * 4)))
                    : (16 + Math.min(7, Math.floor(prog * 8)));
            } else if ((p.punchTimer || 0) > 0) {
                // Authentic GTA 1 punching_while_running (181..188) or punching_while_standing (50..55)
                const prog = Math.max(0, Math.min(1, 1.0 - p.punchTimer / 0.34));
                frameIdx = p.isMoving
                    ? (181 + Math.min(7, Math.floor(prog * 8)))
                    : (50 + Math.min(5, Math.floor(prog * 6)));
            } else {
                frameIdx = this.getPedFrameIndex(
                    p.weapon,
                    Boolean(p.isMoving || jumpZ > 0.02),
                    Boolean(game.input.sprint || jumpZ > 0.02),
                    p.walkPhase || 0
                );
            }

            this.batchPedSprite3D(
                "lucia",
                frameIdx,
                p.x,
                p.y,
                baseZ + jumpZ,
                p.angle,
                pedScale * 1.24,
                (p.muzzleTimer || 0) > 0,
                isJumpingOrSliding ? SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN : SPRITE_DRAW_ORDER.PEDESTRIAN
            );
        }

        // 5. Authentic STYLE001.G24 Vehicles (1:1 carnage3d scale = 1.0 + Delta Doors & Crash Dents! — eSpriteDrawOrder_Car)
        const carScale = 1.0;
        for (const v of game.vehicles) {
            if (v.x < minX || v.x > maxX || v.y < minY || v.y > maxY) continue;
            const vz = this.getEntityZ(v, 0.06);
            const mapInfo = this.getVehicleG24Mapping(v);
            let rect = null;
            let sirens = [];

            if (v.destroyed) {
                let wId = "979";
                if (mapInfo.isTank) {
                    wId = "983";
                } else {
                    const wreckIds = ["979", "980"];
                    wId = wreckIds[Math.abs((v.id || "0").charCodeAt((v.id || "0").length - 1)) % wreckIds.length];
                }
                rect = this.gta1Meta.sprites.wrecked[wId] || this.gta1Meta.sprites.wrecked["979"];
            } else {
                const vehEntry = this.vehicleBySprIdx ? this.vehicleBySprIdx[mapInfo.sprId] : null;
                if (vehEntry) {
                    sirens = vehEntry.sirens || [];
                }

                // 1) Animated .G24 Car Door Swing (CAR_DOOR1_SPRITE_DELTA_0..3) when entering/exiting!
                if ((v.doorOpenTimer || 0) > 0 && vehEntry && Array.isArray(vehEntry.doors) && vehEntry.doors.length > 0) {
                    const norm = 1.0 - Math.max(0, Math.min(1, v.doorOpenTimer / 0.48));
                    // Open 0->1->2->3 then close 3->2->1->0
                    const tri = norm < 0.5 ? (norm * 2.0) : ((1.0 - norm) * 2.0);
                    const dIdx = Math.min(vehEntry.doors.length - 1, Math.floor(tri * vehEntry.doors.length));
                    rect = vehEntry.doors[dIdx];
                }

                // 2) Localized .G24 Crash Damage Delta Sprites (Front Dent, Rear Dent, Heavy Front+Rear!)
                if (!rect && vehEntry && vehEntry.damage) {
                    if (v.heavyDented && vehEntry.damage.heavy) {
                        rect = vehEntry.damage.heavy;
                    } else if (v.frontDented && v.rearDented && vehEntry.damage.heavy) {
                        rect = vehEntry.damage.heavy;
                    } else if (v.frontDented && vehEntry.damage.front) {
                        rect = vehEntry.damage.front;
                    } else if (v.rearDented && vehEntry.damage.rear) {
                        rect = vehEntry.damage.rear;
                    }
                }

                // 3) Default Pristine .G24 Car Sprite
                if (!rect) {
                    if (mapInfo.useBaseObject && this.gta1Meta.sprites.objects[mapInfo.sprId]) {
                        rect = this.gta1Meta.sprites.objects[mapInfo.sprId];
                    } else if (vehEntry) {
                        rect = (vehEntry.remaps && vehEntry.remaps[(mapInfo.remapIdx || 0) % vehEntry.remaps.length]) || vehEntry.base;
                    } else if (this.gta1Meta.sprites.objects[mapInfo.sprId]) {
                        rect = this.gta1Meta.sprites.objects[mapInfo.sprId];
                    }
                }
            }

            if (!rect) continue;
            const rot = v.angle - Math.PI * 0.5;
            const airZ = v.stuntZOffset || 0;
            const vScale = carScale * (1.0 + airZ * 0.22);
            const vDrawOrder = airZ > 0.05 ? SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN : SPRITE_DRAW_ORDER.CAR;

            if (airZ > 0.05) {
                // Draw dark ground shadow under airborne stunt-jumping vehicle!
                this.pushSolidQuad3D(v.x, v.y, vz - 0.02, v.w * 0.75, v.h * 0.75, v.angle, 0.04, 0.04, 0.08, 0.52, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }

            // Car body sprite (.G24 car sprites already have crisp dark pixel outlines, seats & shading baked in)
            this.pushAtlasSprite3D(rect, v.x, v.y, vz + airZ, rot, vScale, vDrawOrder);

            // Authentic Carnage3D Motorcycle Riders (frame 84 = sitting_on_bike, 80..83 = enter_bike) & Convertible Drivers (frame 97 = sitting_in_car)
            // Port of PedestrianStatesManager::StateDriveCar_ProcessEnter (PedestrianStates.cpp:354-366) & Vehicle::GetSeatPosLocal (Vehicle.cpp:473-493)
            if (!v.destroyed && v.driver) {
                const cosA = Math.cos(v.angle);
                const sinA = Math.sin(v.angle);
                const riderDrawOrder = airZ > 0.05 ? SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN : SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER;
                let idHash = 0;
                const idStr = String(v.id || "0");
                for (let ci = 0; ci < idStr.length; ci++) {
                    idHash = (idHash * 31 + idStr.charCodeAt(ci)) | 0;
                }
                idHash = Math.abs(idHash);

                if (mapInfo.isMotorcycle) {
                    const bikerTypes = ["gang", "gang", "civ0", "civ1", "civ2", "civ3"];
                    const riderPedType = v.driver === "PLAYER"
                        ? "lucia"
                        : (v.driver === "AI_COP" ? "police" : bikerTypes[idHash % bikerTypes.length]);
                    const riderFrame = (v.doorOpenTimer || 0) > 0
                        ? (80 + Math.min(3, Math.floor((1.0 - v.doorOpenTimer / 0.48) * 4)))
                        : 84; // Frame 84 = sitting_on_bike in ped_animations.json
                    const rScale = vScale * (riderPedType === "lucia" ? 0.94 : 1.08);
                    const rx = v.x + cosA * 1.5;
                    const ry = v.y + sinA * 1.5;

                    this.batchPedSprite3D(
                        riderPedType,
                        riderFrame,
                        rx,
                        ry,
                        vz + airZ + 0.014,
                        v.angle,
                        rScale,
                        v.driver === "PLAYER" && (p.muzzleTimer || 0) > 0,
                        riderDrawOrder
                    );

                    // If Jason is riding pillion with Lucia on the motorcycle, render Jason on the rear saddle!
                    if (v.driver === "PLAYER" && v.hasJason && game.jason) {
                        const jx = v.x - cosA * 7.5;
                        const jy = v.y - sinA * 7.5;
                        this.batchPedSprite3D(
                            "jason",
                            84,
                            jx,
                            jy,
                            vz + airZ + 0.016,
                            v.angle,
                            vScale * 0.92,
                            (game.jason.muzzleTimer || 0) > 0,
                            riderDrawOrder
                        );
                    }
                } else if (
                    mapInfo.isConvertible ||
                    v.specKey === "MICRO_KART" ||
                    v.specKey === "MONSTER_BUGGY" ||
                    v.specKey === "AIRBOAT"
                ) {
                    const civTypes = ["civ0", "civ1", "civ2", "civ3", "gang"];
                    const drvPedType = v.driver === "PLAYER"
                        ? "lucia"
                        : (v.driver === "AI_COP" ? "police" : civTypes[idHash % civTypes.length]);
                    const isCenterSeat = v.specKey === "MICRO_KART" || v.specKey === "AIRBOAT";
                    const latOff = isCenterSeat ? 0 : -4.5;
                    const longOff = -2.0;
                    const dx = v.x + cosA * longOff - sinA * latOff;
                    const dy = v.y + sinA * longOff + cosA * latOff;
                    const dScale = vScale * (drvPedType === "lucia" ? 0.88 : 1.0);

                    // Frame 97 = sitting_in_car in ped_animations.json
                    this.batchPedSprite3D(
                        drvPedType,
                        97,
                        dx,
                        dy,
                        vz + airZ + 0.014,
                        v.angle,
                        dScale,
                        v.driver === "PLAYER" && (p.muzzleTimer || 0) > 0,
                        riderDrawOrder
                    );

                    if (!isCenterSeat && v.driver === "PLAYER" && v.hasJason && game.jason) {
                        const px = v.x + cosA * longOff - sinA * 4.5;
                        const py = v.y + sinA * longOff + cosA * 4.5;
                        this.batchPedSprite3D(
                            "jason",
                            97,
                            px,
                            py,
                            vz + airZ + 0.014,
                            v.angle,
                            vScale * 0.88,
                            (game.jason.muzzleTimer || 0) > 0,
                            riderDrawOrder
                        );
                    }
                }
            }

            // Siren Overlays (eSpriteDrawOrder_CarRoof)
            if (!v.destroyed && v.isEmergency && v.sirenActive && sirens.length > 0) {
                const sIdx = Math.floor(this.time * 10) % sirens.length;
                const sRect = sirens[sIdx];
                if (sRect) this.pushAtlasSprite3D(sRect, v.x, v.y, vz + airZ + 0.015, rot, vScale, SPRITE_DRAW_ORDER.CAR_ROOF);
            }

            // Tank Turret & Barrel (Sprite 267 — eSpriteDrawOrder_CarRoof)
            if (mapInfo.isTank && !v.destroyed) {
                const turretRect = this.gta1Meta.sprites.objects["267"];
                if (turretRect) {
                    const tRot = (v.turretAngle || v.angle) - Math.PI * 0.5;
                    this.pushAtlasSprite3D(turretRect, v.x, v.y, vz + 0.02, tRot, carScale, SPRITE_DRAW_ORDER.CAR_ROOF);
                }
            }

            if (v.destroyed) {
                const frameId = 234 + (Math.floor(this.time * 11 + Math.abs(v.x * 0.1)) % 8);
                this.batchObjectSprite3D(String(frameId), v.x, v.y, vz + 0.03, 0, 1.0, SPRITE_DRAW_ORDER.EXPLOSION);
            }
        }

        // 6. Dockyard Magnetic Cranes (Sprites 410 & 260)
        if (this.map.cranes) {
            for (const cr of this.map.cranes) {
                if (cr.x < minX || cr.x > maxX || cr.y < minY || cr.y > maxY) continue;
                const cz = this.getEntityZ(cr, 0.25);
                const baseX = cr.x + cr.w + 18;
                const baseY = cr.y + cr.h * 0.5;
                const swing = cr.crushingVehicle ? cr.armAngle : Math.sin(this.time * 1.4) * 0.25;
                this.batchObjectSprite3D("410", baseX, baseY, cz, 0, 1.15, SPRITE_DRAW_ORDER.TREES);
                this.batchObjectSprite3D("260", cr.x + cr.w * 0.55, baseY, cz + 0.15, swing, 1.15, SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 7. Trees (Sprite 257 / palm_tree) & Street Fires (Sprites 234..241)
        if (this.map.streetFires) {
            for (const sf of this.map.streetFires) {
                if (sf.x < minX || sf.x > maxX || sf.y < minY || sf.y > maxY) continue;
                const frameId = 234 + (Math.floor(this.time * 11 + Math.abs(sf.x * 0.1 + sf.y * 0.1)) % 8);
                this.batchObjectSprite3D(String(frameId), sf.x, sf.y, this.getEntityZ(sf, 0.08), 0, (sf.size || 1.0), SPRITE_DRAW_ORDER.EXPLOSION);
            }
        }
        if (this.mapStyle === "VICE") {
            if (this.map.beachProps) {
                for (const bp of this.map.beachProps) {
                    if (bp.x < minX || bp.x > maxX || bp.y < minY || bp.y > maxY) continue;
                    const bz = this.getEntityZ(bp, 0.04) + (bp.zOff || 0.03);
                    this.batchObjectSprite3D(bp.spr, bp.x, bp.y, bz, bp.angle || 0, bp.scale || 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
                }
            }
            if (this.map.beachUmbrellas) {
                for (const umb of this.map.beachUmbrellas) {
                    if (umb.x < minX || umb.x > maxX || umb.y < minY || umb.y > maxY) continue;
                    const uz = this.getEntityZ(umb, 0.04);
                    this.batchObjectSprite3D(umb.spr || "umbrella_pink", umb.x, umb.y, uz + 0.08, umb.angle || 0, 0.92, SPRITE_DRAW_ORDER.TREES);
                }
            }
            const palmSpr = this.gta1Meta.sprites.objects["palm_tree"] ? "palm_tree" : "257";
            if (this.map.trees) {
                for (const tr of this.map.trees) {
                    if (tr.x < minX || tr.x > maxX || tr.y < minY || tr.y > maxY) continue;
                    const tz = this.getEntityZ(tr, 0.14);
                    this.batchObjectSprite3D(palmSpr, tr.x, tr.y, tz, (tr.x * 0.03 + tr.y * 0.05) % 6.28, (tr.scale || 1.0), SPRITE_DRAW_ORDER.TREES);
                }
            }
            if (this.map.vicePalms) {
                for (const pm of this.map.vicePalms) {
                    if (pm.x < minX || pm.x > maxX || pm.y < minY || pm.y > maxY) continue;
                    const pz = this.getEntityZ(pm, 0.15);
                    this.batchObjectSprite3D(palmSpr, pm.x, pm.y, pz, pm.angle || 0, pm.scale || 1.0, SPRITE_DRAW_ORDER.TREES);
                }
            }
        } else if (this.map.trees) {
            for (const tr of this.map.trees) {
                if (tr.x < minX || tr.x > maxX || tr.y < minY || tr.y > maxY) continue;
                this.batchObjectSprite3D("257", tr.x, tr.y, this.getEntityZ(tr, 0.12), 0, (tr.scale || 1.0), SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 8. Projectiles & Authentic STYLE001.G24 Sprite Particles (Smoke 200..210, Sparks 219..223, Blood 224..229, Fire 234..249)
        for (const pr of game.projectiles) {
            const pz = this.camZBlocks + 0.15;
            if (pr.isFlame) {
                const frameId = 234 + (Math.floor(this.time * 14) % 8);
                this.batchObjectSprite3D(String(frameId), pr.x, pr.y, pz, 0, 0.85, SPRITE_DRAW_ORDER.PROJECTILES);
            } else if (pr.isRocket) {
                this.batchObjectSprite3D("261", pr.x, pr.y, pz, pr.angle - Math.PI * 0.5, 0.85, SPRITE_DRAW_ORDER.PROJECTILES);
            } else {
                this.pushSolidQuad3D(pr.x, pr.y, pz, 2.5, 2.5, 0, 1.0, 0.94, 0.54, 1.0, SPRITE_DRAW_ORDER.PROJECTILES);
            }
        }

        for (const pt of game.particles) {
            const prog = Math.max(0, Math.min(0.999, 1.0 - pt.life / Math.max(0.01, pt.maxLife)));
            const pz = this.camZBlocks + 0.09;
            const isBlood = pt.kind === "BLOOD" || pt.color === "#dc2626" || pt.color === "#991b1b";
            if (isBlood) {
                const frameId = 224 + Math.min(5, Math.floor(prog * 6));
                this.batchObjectSprite3D(String(frameId), pt.x, pt.y, pz, 0, 0.72, SPRITE_DRAW_ORDER.PROJECTILES);
            } else if (pt.kind === "SMOKE") {
                const frameId = 200 + Math.min(10, Math.floor(prog * 11));
                this.batchObjectSprite3D(String(frameId), pt.x, pt.y, pz, 0, 0.78, SPRITE_DRAW_ORDER.EXPLOSION);
            } else if (pt.kind === "EXPLOSION") {
                const frameId = 242 + Math.min(7, Math.floor(prog * 8));
                this.batchObjectSprite3D(String(frameId), pt.x, pt.y, pz + 0.02, 0, 0.95, SPRITE_DRAW_ORDER.EXPLOSION);
            } else if (pt.kind === "FIRE") {
                const frameId = 234 + Math.min(7, Math.floor(prog * 8));
                this.batchObjectSprite3D(String(frameId), pt.x, pt.y, pz + 0.01, 0, 0.75, SPRITE_DRAW_ORDER.EXPLOSION);
            } else if (pt.color === "#38bdf8") {
                // Fire truck water cannon droplets
                this.pushSolidQuad3D(pt.x, pt.y, pz, 3, 3, 0, 0.22, 0.74, 0.97, 1.0 - prog * 0.5, SPRITE_DRAW_ORDER.PROJECTILES);
            } else {
                // Authentic .G24 Spark frames (219..223)
                const frameId = 219 + Math.min(4, Math.floor(prog * 5));
                this.batchObjectSprite3D(String(frameId), pt.x, pt.y, pz, 0, 0.75, SPRITE_DRAW_ORDER.PROJECTILES);
            }
        }

        // 9. Authentic GTA 1 Orbiting Directional Arrow (HUD Sprite 24) pointing to ringing Payphones & Mission Targets!
        const target = game.missions.getTargetPosition();
        if (target && this.gta1Meta.sprites.hud["24"]) {
            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const dist = Math.hypot(dx, dy);
            if (dist >= 48) {
                const angle = Math.atan2(dy, dx);
                const orbitR = 38;
                const ax = p.x + Math.cos(angle) * orbitR;
                const ay = p.y + Math.sin(angle) * orbitR;
                const rect = this.gta1Meta.sprites.hud["24"];
                this.pushAtlasSprite3D(rect, ax, ay, this.camZBlocks + 0.25, angle + Math.PI * 0.5, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
            }
        }
    }

    /* ========================================================================
       5A. WORLD 2D PROMPTS FOR ENTERABLE VENUE DOORS & STUNT RAMPS
       ======================================================================== */
    renderWorldFunPrompts(ctx, game) {
        const p = game.player;
        ctx.save();
        ctx.font = "bold 11px Consolas, 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 1. Glowing Enterable Venue Interior Door Badges
        if (Array.isArray(this.map.interiors)) {
            for (const intr of this.map.interiors) {
                const dist = Math.hypot(p.x - intr.doorX, p.y - intr.doorY);
                if (dist > 340) continue;
                const dz = this.map.getHeightAtPixel(intr.doorX, intr.doorY, 2.0) + 0.22;
                const sc = this.worldToScreen(intr.doorX, intr.doorY, dz);
                const isClose = dist < 95;
                const label = isClose ? `🚪 [CLICK OR PRESS E] ENTER ${intr.name}` : `🚪 ${intr.name}`;
                const bw = Math.max(150, ctx.measureText(label).width + 18);
                const bh = 22;
                const bx = Math.round(sc.x - bw * 0.5);
                const by = Math.round(sc.y - 26);

                ctx.fillStyle = isClose ? "rgba(180, 24, 112, 0.94)" : "rgba(12, 18, 32, 0.86)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = intr.accent || "#f472b6";
                ctx.lineWidth = isClose ? 2 : 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(label, sc.x, by + bh * 0.5);

                this.cheatButtons.push({
                    id: "ENTER_INTERIOR",
                    x: bx,
                    y: by,
                    w: bw,
                    h: bh,
                    interiorId: intr.id
                });
            }
        }

        // 2. Stunt Jump Ramp Labels when nearby
        if (Array.isArray(this.map.stuntRamps)) {
            for (const ramp of this.map.stuntRamps) {
                const dist = Math.hypot(p.x - ramp.x, p.y - ramp.y);
                if (dist > 280) continue;
                const rz = this.map.getHeightAtPixel(ramp.x, ramp.y, 2.0) + 0.16;
                const sc = this.worldToScreen(ramp.x, ramp.y, rz);
                const label = `🔥 STUNT RAMP: ${ramp.name}`;
                const bw = ctx.measureText(label).width + 14;
                const bx = Math.round(sc.x - bw * 0.5);
                const by = Math.round(sc.y - 20);
                ctx.fillStyle = "rgba(24, 16, 6, 0.85)";
                ctx.fillRect(bx, by, bw, 18);
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 17);
                ctx.fillStyle = "#fde047";
                ctx.fillText(label, sc.x, by + 9);
            }
        }

        ctx.restore();
    }

    drawPedSprite2D(ctx, pedType, frameIdx, x, y, angle, scale = 2.4) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.peds[pedType]) return;
        const frames = this.gta1Meta.sprites.peds[pedType];
        const rect = frames[String(frameIdx)] || frames["98"] || frames["0"];
        if (!rect) return;
        const [sx, sy, sw, sh] = rect;
        const dw = sw * scale;
        const dh = sh * scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle - Math.PI * 0.5);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.gta1SpritesImg, sx, sy, sw, sh, -dw * 0.5, -dh * 0.5, dw, dh);
        ctx.restore();
    }

    /* ========================================================================
       5A2. PLAYABLE WALKABLE LANDMARK INTERIOR ROOM RENDERER
       Renders Hotel Dixon, Club Nine1Nine, Club Jack of Hearts, The Malibu,
       Star Island Mansion, SERA Space Bunker, Leonida Penitentiary & Hank's Diner!
       ======================================================================== */
    renderActiveInterior(ctx, game) {
        const intr = game.activeInterior;
        if (!intr) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const rw = intr.w || 780;
        const rh = intr.h || 530;
        const ox = Math.round((W - rw) * 0.5);
        const oy = Math.round((H - rh) * 0.5) + 12;

        ctx.save();

        // Dark backdrop dim over the exterior city view
        ctx.fillStyle = "rgba(6, 9, 18, 0.84)";
        ctx.fillRect(0, 0, W, H);

        // 1. Interior Floor Tiles by Venue Theme
        const tileSz = 40;
        for (let y = 0; y < rh; y += tileSz) {
            for (let x = 0; x < rw; x += tileSz) {
                const gx = Math.floor(x / tileSz);
                const gy = Math.floor(y / tileSz);
                const checker = (gx + gy) % 2 === 0;
                let col = checker ? "#1e293b" : "#0f172a";

                if (intr.theme === "ART_DECO_HOTEL") {
                    col = checker ? "#2d1b38" : "#192f3d";
                } else if (intr.theme === "NEON_CLUB") {
                    // Center pulsing LED Dancefloor (x=240..560, y=180..370)
                    if (x >= 240 && x < 560 && y >= 180 && y < 370) {
                        const pulseIdx = Math.floor(this.time * 5 + gx * 1.3 + gy * 1.7) % 4;
                        col = ["#db2777", "#0284c7", "#7c3aed", "#ca8a04"][pulseIdx];
                    } else {
                        col = checker ? "#170f26" : "#0f0a1c";
                    }
                } else if (intr.theme === "STRIP_CLUB") {
                    if (x >= 320 && x < 480 && y >= 130 && y < 340) {
                        col = (( gx + Math.floor(this.time * 4)) % 2 === 0) ? "#be185d" : "#701a75";
                    } else {
                        col = checker ? "#311024" : "#1f0918";
                    }
                } else if (intr.theme === "MALIBU_CLUB") {
                    col = checker ? "#3b1d2e" : "#2b2118";
                } else if (intr.theme === "MANSION") {
                    if (x >= 350 && x < 470) {
                        col = "#7f1d1d"; // Royal red carpet runner
                    } else if (x >= 560 && y >= 230 && y < 390) {
                        col = "#0891b2"; // Indoor marble Jacuzzi pool
                    } else {
                        col = checker ? "#334155" : "#1e293b";
                    }
                } else if (intr.theme === "SPACE_BUNKER") {
                    col = checker ? "#0f293a" : "#0a1926";
                } else if (intr.theme === "PRISON_BLOCK") {
                    col = checker ? "#27272a" : "#18181b";
                } else if (intr.theme === "DINER_PAWN") {
                    col = checker ? "#334155" : "#0f172a";
                }

                ctx.fillStyle = col;
                ctx.fillRect(ox + x, oy + y, Math.min(tileSz, rw - x), Math.min(tileSz, rh - y));
            }
        }

        // 2. Interior Walls, Neon Trim & Header Banner
        ctx.strokeStyle = intr.accent || "#00f0ff";
        ctx.lineWidth = 4;
        ctx.strokeRect(ox, oy, rw, rh);

        ctx.fillStyle = "rgba(10, 15, 28, 0.95)";
        ctx.fillRect(ox + 4, oy + 4, rw - 8, 58);
        ctx.strokeStyle = intr.accent || "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox + 4, oy + 4, rw - 8, 58);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 17px Consolas, 'Courier New', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(intr.name, ox + rw * 0.5, oy + 23);
        ctx.font = "bold 11px Consolas, 'Courier New', monospace";
        ctx.fillStyle = intr.accent || "#38bdf8";
        ctx.fillText(intr.subtitle, ox + rw * 0.5, oy + 45);

        // 3. Interactive Stations inside the Venue (Walk onto pad OR Click to activate!)
        if (Array.isArray(intr.stations)) {
            for (const st of intr.stations) {
                const sx = ox + st.x;
                const sy = oy + st.y;
                const ready = (st.cooldown || 0) <= 0;
                const pulseR = 30 + Math.sin(this.time * 6) * 4;

                // Glowing floor pad
                ctx.fillStyle = ready ? "rgba(16, 185, 129, 0.22)" : "rgba(100, 116, 139, 0.18)";
                ctx.beginPath();
                ctx.arc(sx, sy, pulseR, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = ready ? (st.color || "#39ff14") : "#64748b";
                ctx.lineWidth = 2.5;
                ctx.stroke();

                // Station counter/table box
                const bw = 205;
                const bh = 44;
                const bx = Math.round(sx - bw * 0.5);
                const by = Math.round(sy - 56);
                ctx.fillStyle = "rgba(9, 13, 24, 0.92)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = ready ? (st.color || "#39ff14") : "#475569";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

                ctx.font = "bold 11px Consolas, 'Courier New', monospace";
                ctx.fillStyle = ready ? "#ffffff" : "#94a3b8";
                ctx.fillText(st.label, sx, by + 14);
                ctx.font = "10px Consolas, 'Courier New', monospace";
                ctx.fillStyle = ready ? (st.color || "#39ff14") : "#64748b";
                ctx.fillText(ready ? st.sub : `RECHARGING (${Math.ceil(st.cooldown)}S)`, sx, by + 31);

                if (ready) {
                    this.cheatButtons.push({
                        id: "TRIGGER_STATION",
                        x: bx,
                        y: by,
                        w: bw,
                        h: bh + 56,
                        station: st
                    });
                }
            }
        }

        // 4. Venue NPCs (Bartenders, DJs, Dancers, Guards, Astronauts)
        if (Array.isArray(intr.npcs)) {
            for (let i = 0; i < intr.npcs.length; i++) {
                const npc = intr.npcs[i];
                const nx = ox + npc.x + (npc.dancing ? Math.sin(this.time * 4 + i) * 8 : 0);
                const ny = oy + npc.y + (npc.dancing ? Math.cos(this.time * 4 + i) * 6 : 0);
                const nAng = npc.dancing ? (npc.angle + Math.sin(this.time * 3 + i) * 0.7) : npc.angle;
                const fIdx = npc.dancing ? (Math.floor(this.time * 6 + i * 2) % 8) : 98;
                this.drawPedSprite2D(ctx, npc.type || "civ2", fIdx, nx, ny, nAng, 2.35);

                if (npc.label) {
                    ctx.font = "bold 9px Consolas, monospace";
                    ctx.fillStyle = "#cbd5e1";
                    ctx.fillText(npc.label, nx, ny - 24);
                }
            }
        }

        // 5. Render Jason Duval & Lucia Caminos walking inside the Interior Room!
        const jFrame = this.getPedFrameIndex(
            "FIST",
            Boolean(game.jason && game.jason.isMoving),
            false,
            (game.jason && game.jason.walkPhase) || 0
        );
        this.drawPedSprite2D(ctx, "jason", jFrame, ox + game.interiorJasonX, oy + game.interiorJasonY, game.interiorJasonAngle, 2.5);
        ctx.font = "bold 10px Consolas, monospace";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("JASON", ox + game.interiorJasonX, oy + game.interiorJasonY - 26);

        const p = game.player;
        const lFrame = this.getPedFrameIndex(
            p.weapon,
            Boolean(p.isMoving),
            Boolean(game.input.sprint),
            p.walkPhase || 0
        );
        this.drawPedSprite2D(ctx, "lucia", lFrame, ox + game.interiorX, oy + game.interiorY, game.interiorAngle, 2.6);
        ctx.fillStyle = "#f472b6";
        ctx.fillText("LUCIA", ox + game.interiorX, oy + game.interiorY - 27);

        // 6. Bottom Glowing [🚪 EXIT TO STREET] Door Mat & Clickable Button
        const exitW = 290;
        const exitH = 34;
        const exitX = Math.round(ox + (rw - exitW) * 0.5);
        const exitY = oy + rh - exitH - 6;
        ctx.fillStyle = "rgba(180, 24, 112, 0.94)";
        ctx.fillRect(exitX, exitY, exitW, exitH);
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 2;
        ctx.strokeRect(exitX + 0.5, exitY + 0.5, exitW - 1, exitH - 1);
        ctx.font = "bold 12px Consolas, 'Courier New', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("🚪 EXIT TO STREET [WALK HERE / ESC / CLICK]", ox + rw * 0.5, exitY + exitH * 0.5);

        this.cheatButtons.push({
            id: "EXIT_INTERIOR",
            x: exitX,
            y: exitY,
            w: exitW,
            h: exitH
        });

        ctx.restore();
    }

    /* ========================================================================
       5B. CARNAGE3D PHYSICS & TIRE KINEMATICS DEBUG RENDERER (Vehicle::DebugDraw)
       Exact Port of Vehicle.cpp:668-706 & Pedestrian::DebugDraw:
       - Red OBB wireframe for vehicle chassis
       - Yellow OBB wireframes for FRONT & REAR tires (with steering angle)
       - Green forward tire velocity vector + Red lateral tire slip vector
       - Yellow boxes for vehicle entry doors (GetDoorPosition)
       - Pedestrian circular collider & state/heading vector
       ======================================================================== */
    renderDebugWireframe(ctx, game) {
        ctx.save();
        ctx.lineWidth = 1.25;
        ctx.font = "10px Consolas, monospace";

        const drawWorldPoly = (corners, zBlocks, strokeStyle) => {
            if (!corners || corners.length === 0) return;
            ctx.strokeStyle = strokeStyle;
            ctx.beginPath();
            for (let i = 0; i < corners.length; i++) {
                const sc = this.worldToScreen(corners[i].x, corners[i].y, zBlocks);
                if (i === 0) ctx.moveTo(sc.x, sc.y);
                else ctx.lineTo(sc.x, sc.y);
            }
            ctx.closePath();
            ctx.stroke();
        };

        const drawWorldLine = (x0, y0, x1, y1, zBlocks, strokeStyle) => {
            const s0 = this.worldToScreen(x0, y0, zBlocks);
            const s1 = this.worldToScreen(x1, y1, zBlocks);
            ctx.strokeStyle = strokeStyle;
            ctx.beginPath();
            ctx.moveTo(s0.x, s0.y);
            ctx.lineTo(s1.x, s1.y);
            ctx.stroke();
        };

        for (const v of game.vehicles) {
            if (Math.hypot(v.x - this.camX, v.y - this.camY) > 780) continue;
            const vz = this.getEntityZ(v, 0.08);

            // 1. Chassis OBB (Color32_Red in Vehicle::DebugDraw)
            if (typeof v.getChassisCorners === "function") {
                drawWorldPoly(v.getChassisCorners(), vz, "#ef4444");
            }

            // 2. Front & Rear Axle Tires (Color32_Yellow + Green Forward Vel + Red Lateral Vel)
            if (typeof v.getTireCorners === "function" && typeof v.getTirePosition === "function") {
                for (let tireId = 0; tireId < 2; tireId++) {
                    drawWorldPoly(v.getTireCorners(tireId), vz + 0.01, "#facc15");
                    const tPos = v.getTirePosition(tireId);
                    const fwdVel = v.getTireForwardVelocity(tireId);
                    const latVel = v.getTireLateralVelocity(tireId);
                    // Scale velocity vector for visualization
                    drawWorldLine(tPos.x, tPos.y, tPos.x + fwdVel.x * 0.18, tPos.y + fwdVel.y * 0.18, vz + 0.02, "#22c55e");
                    drawWorldLine(tPos.x, tPos.y, tPos.x + latVel.x * 0.35, tPos.y + latVel.y * 0.35, vz + 0.02, "#ef4444");
                }
            }

            // 3. Vehicle Entry Door Positions (Color32_Yellow)
            if (typeof v.getDoorPosition === "function") {
                for (let dIdx = 0; dIdx < 2; dIdx++) {
                    const dPos = v.getDoorPosition(dIdx);
                    const sc = this.worldToScreen(dPos.x, dPos.y, vz + 0.01);
                    ctx.strokeStyle = "#fde047";
                    ctx.strokeRect(sc.x - 3, sc.y - 3, 6, 6);
                }
            }
        }

        // 4. Pedestrian & Player Physics Colliders + Heading Vector
        const allPeds = [...game.peds];
        if (!game.player.inVehicle) allPeds.push(game.player);
        for (const ped of allPeds) {
            if (ped.dead) continue;
            if (Math.hypot(ped.x - this.camX, ped.y - this.camY) > 650) continue;
            const pz = this.getEntityZ(ped, 0.06);
            const sc = this.worldToScreen(ped.x, ped.y, pz);
            ctx.strokeStyle = ped === game.player ? "#38bdf8" : "#a3e635";
            ctx.beginPath();
            ctx.arc(sc.x, sc.y, 7, 0, Math.PI * 2);
            ctx.stroke();
            drawWorldLine(
                ped.x,
                ped.y,
                ped.x + Math.cos(ped.angle) * 14,
                ped.y + Math.sin(ped.angle) * 14,
                pz,
                "#fde047"
            );
        }

        ctx.restore();
    }

    /* ========================================================================
       6. AUTHENTIC CARNAGE3D "GAME CHEATS" IMGUI WINDOW (GameCheatsWindow.cpp)
       Matches carnage3D_wasm.html top-left dark debug/cheat window + Vice City Official Tour!
       ======================================================================== */
    renderCarnage3DCheatsWindow(ctx, game) {
        if (!this.showCheatsWindow) return;

        const wx = 10;
        const wy = 10;
        const ww = 276;
        const wh = this.cheatsCollapsed ? 24 : 458;

        ctx.save();
        // Dearborn ImGui dark translucent window background & border
        ctx.fillStyle = "rgba(15, 17, 20, 0.90)";
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = "rgba(75, 82, 95, 0.85)";
        ctx.lineWidth = 1;
        ctx.strokeRect(wx + 0.5, wy + 0.5, ww - 1, wh - 1);

        // Title bar
        ctx.fillStyle = "rgba(38, 68, 115, 0.95)";
        ctx.fillRect(wx + 1, wy + 1, ww - 2, 22);

        ctx.fillStyle = "#e8ecf2";
        ctx.font = "12px Consolas, 'Courier New', monospace";
        ctx.textBaseline = "middle";
        const arrow = this.cheatsCollapsed ? "▶" : "▼";
        ctx.fillText(`${arrow} Game Cheats & Leonida Tour [C]`, wx + 8, wy + 12);

        this.cheatButtons.push({
            id: "TOGGLE_COLLAPSE",
            x: wx,
            y: wy,
            w: ww,
            h: 22
        });

        if (this.cheatsCollapsed) {
            ctx.restore();
            return;
        }

        const drawImGuiBtn = (id, label, bx, by, bw, bh = 18, highlight = false, extra = null) => {
            ctx.fillStyle = highlight ? "rgba(180, 42, 118, 0.88)" : "rgba(44, 78, 128, 0.92)";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = highlight ? "rgba(255, 120, 196, 0.85)" : "rgba(92, 134, 196, 0.65)";
            ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, bx + 4, by + bh * 0.5 + 1);
            this.cheatButtons.push({ id, x: bx, y: by, w: bw, h: bh, ...(extra || {}) });
        };

        let cy = wy + 27;
        // Row 1: Exact Carnage3D action buttons + GTA1 Tank Controls toggle
        drawImGuiBtn("CREATE_CARS", "Create Cars", wx + 8, cy, 86, 19);
        drawImGuiBtn("CREATE_PEDS", "Create Peds", wx + 98, cy, 86, 19);
        drawImGuiBtn(
            "TOGGLE_TANK_CTRL",
            game.player.tankControls ? "GTA1 Tank" : "WASD Free",
            wx + 188,
            cy,
            80,
            19
        );
        cy += 22;

        // Row 2: Instant Map Style Switcher (GTA 6 Leonida <-> NYC.CMP) + Physics Debug Draw (Vehicle::DebugDraw)
        drawImGuiBtn(
            "TOGGLE_DEBUG_DRAW",
            this.debugDrawPhysics ? "PhysBox: ON" : "PhysBox: OFF",
            wx + 8,
            cy - 1,
            86,
            18,
            Boolean(this.debugDrawPhysics)
        );
        ctx.fillStyle = "#9fb4d4";
        ctx.fillText(this.mapStyle === "VICE" ? "Leonida" : "NYC.CMP", wx + 100, cy + 8);
        drawImGuiBtn(
            "TOGGLE_MAP_STYLE",
            this.mapStyle === "VICE" ? "Style: GTA 6" : "Style: NYC97",
            wx + 180,
            cy - 1,
            88,
            18
        );
        cy += 21;

        // Official GTA 6 (State of Leonida & Vice City) 16 Bespoke Landmarks Tour section
        const visitedCount = Array.isArray(this.map.landmarks)
            ? this.map.landmarks.filter((lm) => lm.visited).length
            : 0;
        const totalLm = Array.isArray(this.map.landmarks) ? this.map.landmarks.length : 16;
        ctx.fillStyle = "rgba(138, 35, 92, 0.82)";
        ctx.fillRect(wx + 6, cy - 4, ww - 12, 16);
        ctx.fillStyle = "#ffe4f2";
        ctx.fillText(`▼ GTA 6 Leonida Tour (${visitedCount}/${totalLm} Landmarks)`, wx + 10, cy + 4);
        cy += 15;

        ctx.font = "11px Consolas, 'Courier New', monospace";
        const tourPairs = [
            [
                { id: "VICE_BEACH", label: "🏖️ Vice Beach", hi: true, car: false },
                { id: "HOTEL_DIXON", label: "🏨 Hotel Dixon", hi: true, car: true }
            ],
            [
                { id: "ESPANOLA_WAY", label: "🦩 Española Way", hi: false, car: false },
                { id: "CLUB_NINE1NINE", label: "💃 Nine1Nine", hi: false, car: true }
            ],
            [
                { id: "SERA_SPACE", label: "🚀 SERA Space", hi: true, car: false },
                { id: "STAR_ISLAND", label: "🏛️ Star Island", hi: false, car: false }
            ],
            [
                { id: "VICE_PORT", label: "🚢 Cruise Port", hi: false, car: false },
                { id: "MAMBAS_STADIUM", label: "🏟️ Stadium Bowl", hi: true, car: false }
            ],
            [
                { id: "DOWNTOWN_VC", label: "🏙️ Downtown/Golf", hi: false, car: false },
                { id: "JACK_OF_HEARTS", label: "🎨 Wynwood/Jack", hi: false, car: true }
            ],
            [
                { id: "LAKE_LEONIDA", label: "🌊 Lake Leonida", hi: false, car: false },
                { id: "MOUNT_KALAGA", label: "⛰️ Mt Kalaga", hi: false, car: false }
            ],
            [
                { id: "PENITENTIARY", label: "🚨 Penitentiary", hi: true, car: false },
                { id: "PORT_GELLHORN", label: "🏁 Dirt Speedway", hi: true, car: true }
            ],
            [
                { id: "VCIA_AIRPORT", label: "✈️ VCIA Airport", hi: false, car: false },
                { id: "GRASSRIVERS", label: "🐊 Mud Park/Keys", hi: false, car: false }
            ]
        ];

        for (const [leftBtn, rightBtn] of tourPairs) {
            const leftHasInt = Array.isArray(this.map.interiors) && this.map.interiors.some((it) => it.id === leftBtn.id);
            const rightHasInt = Array.isArray(this.map.interiors) && this.map.interiors.some((it) => it.id === rightBtn.id);

            drawImGuiBtn("TP_LANDMARK", leftBtn.label, wx + 8, cy, leftHasInt ? 102 : 126, 18, leftBtn.hi, {
                landmarkId: leftBtn.id,
                enterCar: leftBtn.car
            });
            if (leftHasInt) {
                drawImGuiBtn("ENTER_INTERIOR", "🚪", wx + 112, cy, 22, 18, true, { interiorId: leftBtn.id });
            }

            drawImGuiBtn("TP_LANDMARK", rightBtn.label, wx + 140, cy, rightHasInt ? 104 : 128, 18, rightBtn.hi, {
                landmarkId: rightBtn.id,
                enterCar: rightBtn.car
            });
            if (rightHasInt) {
                drawImGuiBtn("ENTER_INTERIOR", "🚪", wx + 246, cy, 22, 18, true, { interiorId: rightBtn.id });
            }
            cy += 20;
        }
        cy += 4;
        ctx.font = "12px Consolas, 'Courier New', monospace";

        // Separator line
        ctx.strokeStyle = "rgba(85, 95, 110, 0.65)";
        ctx.beginPath();
        ctx.moveTo(wx + 6, cy);
        ctx.lineTo(wx + ww - 6, cy);
        ctx.stroke();
        cy += 10;

        // Frame Time & FPS
        const ms = (this.lastFrameDt * 1000).toFixed(2);
        const fps = this.fpsSmoothed.toFixed(1);
        ctx.fillStyle = "#e5e9f0";
        ctx.fillText(`Frame Time: ${ms} ms (${fps} FPS)`, wx + 8, cy);
        cy += 15;

        // ▼ Player section
        ctx.fillStyle = "rgba(42, 73, 118, 0.72)";
        ctx.fillRect(wx + 6, cy - 8, ww - 12, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("▼ Player", wx + 10, cy);
        cy += 14;

        const targetEnt = game.player.inVehicle || game.player;
        const bx = Math.floor(targetEnt.x / TILE_SIZE);
        const by = Math.floor(targetEnt.y / TILE_SIZE);
        const bz = Math.floor(this.camZBlocks);
        const physX = ((targetEnt.x / TILE_SIZE) * 4.0).toFixed(2);
        const physY = (this.camZBlocks * 4.0).toFixed(2);
        const physZ = ((targetEnt.y / TILE_SIZE) * 4.0).toFixed(2);
        const headingDeg = (((targetEnt.angle * 180) / Math.PI) % 360).toFixed(1);

        let groundName = "pawement";
        const gt = this.map.getGroundTypeAtBlock(bx, by, Math.max(0, bz - 1));
        if (gt === 1) groundName = "road";
        else if (gt === 3) groundName = "beach / field";
        else if (gt === 0) groundName = "air / water";

        const activeAiCars = Array.isArray(game.vehicles)
            ? game.vehicles.filter((v) => !v.destroyed && v.driver && v.driver !== "PLAYER").length
            : 0;
        const activeAiPeds = Array.isArray(game.peds)
            ? game.peds.filter((pd) => !pd.dead).length
            : 0;
        const lightPhase = typeof game.isNSGreen === "function" && game.isNSGreen()
            ? "N/S GRN"
            : (typeof game.isEWGreen === "function" && game.isEWGreen() ? "E/W GRN" : "ALL RED");

        ctx.fillStyle = "#d8dee9";
        ctx.fillText(`heading: ${headingDeg} deg`, wx + 12, cy); cy += 14;
        ctx.fillText(`physical pos: ${physX}, ${physY}, ${physZ}`, wx + 12, cy); cy += 14;
        ctx.fillText(`logical pos: ${bx}, ${bz}, ${by}`, wx + 12, cy); cy += 14;
        ctx.fillText(`block: ${groundName}`, wx + 12, cy); cy += 14;
        ctx.fillText(`ai: ${activeAiCars} cars, ${activeAiPeds} peds (${lightPhase})`, wx + 12, cy); cy += 16;

        // ▼ Camera section
        ctx.fillStyle = "rgba(42, 73, 118, 0.72)";
        ctx.fillRect(wx + 6, cy - 8, ww - 12, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("▼ Camera (Scroll Wheel = Zoom)", wx + 10, cy);
        cy += 15;
        ctx.fillStyle = "#d8dee9";
        const distM = ((this.followHeightBlocks + this.zoomOffsetBlocks) * 4.0).toFixed(1);
        ctx.fillText(`mode: (•) Follow  h=${distM}m  fovy=55°`, wx + 12, cy);

        ctx.restore();
    }

    handleCheatsClick(screenX, screenY, game) {
        if (!Array.isArray(this.cheatButtons)) return false;
        for (const btn of this.cheatButtons) {
            if (
                screenX >= btn.x &&
                screenX <= btn.x + btn.w &&
                screenY >= btn.y &&
                screenY <= btn.y + btn.h
            ) {
                if (btn.id === "MINIMAP_ZOOM") {
                    this.minimapZoomMode = ((this.minimapZoomMode || 0) + 1) % 3;
                    return true;
                }
                if (btn.id === "ENTER_INTERIOR" && btn.interiorId && typeof game.enterInterior === "function") {
                    game.enterInterior(btn.interiorId);
                    return true;
                }
                if (btn.id === "EXIT_INTERIOR" && typeof game.exitInterior === "function") {
                    game.exitInterior();
                    return true;
                }
                if (btn.id === "TRIGGER_STATION" && btn.station && typeof game.triggerInteriorStation === "function") {
                    game.triggerInteriorStation(btn.station);
                    return true;
                }
                if (btn.id === "MINIMAP_FULLMAP" && typeof game.toggleFullMap === "function") {
                    game.toggleFullMap();
                    return true;
                }
                if (btn.id === "MINIMAP_NEXT_LM" && btn.landmarkId && typeof game.teleportToLandmark === "function") {
                    game.teleportToLandmark(btn.landmarkId, false);
                    return true;
                }
                if (btn.id === "MINIMAP_CANVAS" && typeof game.teleportToBlock === "function") {
                    const rx = (screenX - btn.x) / btn.w;
                    const ry = (screenY - btn.y) / btn.h;
                    const worldX = btn.viewWorldX + rx * btn.viewWorldW;
                    const worldY = btn.viewWorldY + ry * btn.viewWorldH;
                    const bx = Math.max(2, Math.min(MAP_COLS - 3, worldX / TILE_SIZE));
                    const by = Math.max(2, Math.min(MAP_ROWS - 3, worldY / TILE_SIZE));
                    game.teleportToBlock(bx, by, false);
                    return true;
                }
                if (!this.showCheatsWindow) continue;
                if (btn.id === "TOGGLE_COLLAPSE") {
                    this.cheatsCollapsed = !this.cheatsCollapsed;
                    return true;
                }
                if (btn.id === "CREATE_CARS" && typeof game.cheatCreateCars === "function") {
                    game.cheatCreateCars();
                    return true;
                }
                if (btn.id === "CREATE_PEDS" && typeof game.cheatCreatePeds === "function") {
                    game.cheatCreatePeds();
                    return true;
                }
                if (btn.id === "TOGGLE_TANK_CTRL") {
                    game.player.tankControls = !game.player.tankControls;
                    return true;
                }
                if (btn.id === "TOGGLE_DEBUG_DRAW") {
                    this.debugDrawPhysics = !this.debugDrawPhysics;
                    return true;
                }
                if (btn.id === "TOGGLE_MAP_STYLE") {
                    this.toggleMapStyle(game);
                    return true;
                }
                if (btn.id === "TP_LANDMARK" && btn.landmarkId && typeof game.teleportToLandmark === "function") {
                    game.teleportToLandmark(btn.landmarkId, Boolean(btn.enterCar));
                    return true;
                }
            }
        }
        return false;
    }

    /* ========================================================================
       7. PED & VEHICLE SPRITE FRAME MAPPINGS
       ======================================================================== */
    getPedFrameIndex(weaponKey, isMoving, isRunning, walkPhase) {
        const rate = isRunning ? 6.8 : 5.2;
        const step8 = Math.floor(Math.abs(walkPhase * rate)) % 8;
        if (!weaponKey || weaponKey === "FIST") {
            if (!isMoving) return 98;
            return step8;
        }
        if (weaponKey === "PISTOL") {
            if (!isMoving) return 89;
            return 99 + step8;
        }
        if (weaponKey === "UZI" || weaponKey === "SHOTGUN") {
            if (!isMoving) return 152;
            return 136 + step8;
        }
        if (weaponKey === "FLAMETHROWER") {
            if (!isMoving) return 134;
            return 118 + step8;
        }
        if (!isMoving) return 170;
        return 154 + step8;
    }

    getVehicleG24Mapping(v) {
        const specObj = (typeof VEHICLE_SPECS !== "undefined" && VEHICLE_SPECS[v.specKey]) || {};
        const sprId = String(v.sprId || specObj.sprId || "66");
        const isTank = Boolean(v.isTank || specObj.isTank || sprId === "940");
        const isConvertible = Boolean(v.isConvertible || specObj.isConvertible);
        const isMotorcycle = Boolean(v.isMotorcycle || specObj.isMotorcycle);

        if (v.specKey === "VCPD_CRUISER" || sprId === "73") {
            return { sprId: "73", useBaseObject: false, remapIdx: 0, isConvertible: false, isTank: false };
        }

        const hasRemap = typeof v.remapIdx === "number" && v.remapIdx >= 0 && !v.useBaseOnly && !specObj.useBaseOnly;
        return {
            sprId,
            useBaseObject: !hasRemap,
            remapIdx: hasRemap ? v.remapIdx : 0,
            isConvertible,
            isMotorcycle,
            isTank
        };
    }

    /* ========================================================================
       8. AUTHENTIC 1997 GTA 1 / CARNAGE3D BITMAP FONT & HUD RENDERER (HUD.cpp)
       ======================================================================== */
    measureGta1FontString(fontName, text, scale = 1.0) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.fonts[fontName]) return text.length * 12 * scale;
        const font = this.gta1Meta.sprites.fonts[fontName];
        const glyphs = font.glyphs || {};
        const spaceW = (glyphs["0"] ? glyphs["0"][2] : 10) * scale;
        let totalW = 0;
        for (let i = 0; i < text.length; i++) {
            const idx = String(text.charCodeAt(i) - font.base);
            const g = glyphs[idx];
            totalW += g ? g[2] * scale : spaceW;
        }
        return totalW;
    }

    drawGta1FontString(ctx, fontName, text, x, y, scale = 1.0, align = "left") {
        if (!this.gta1Ready || !this.gta1Meta.sprites.fonts[fontName]) return 0;
        const font = this.gta1Meta.sprites.fonts[fontName];
        const glyphs = font.glyphs || {};
        const totalW = this.measureGta1FontString(fontName, text, scale);

        let curX = x;
        if (align === "center") curX -= totalW * 0.5;
        else if (align === "right") curX -= totalW;
        curX = Math.round(curX);
        const drawY = Math.round(y);

        const spaceW = Math.round((glyphs["0"] ? glyphs["0"][2] : 10) * scale);
        for (let i = 0; i < text.length; i++) {
            const idx = String(text.charCodeAt(i) - font.base);
            const g = glyphs[idx];
            if (!g) {
                curX += spaceW;
                continue;
            }
            const [gx, gy, gw0, gh0] = g;
            const gw = Math.round(gw0 * scale);
            const gh = Math.round(gh0 * scale);
            ctx.drawImage(this.gta1SpritesImg, gx, gy, gw0, gh0, curX, drawY, gw, gh);
            curX += gw;
        }
        return totalW;
    }

    drawHudSprite(ctx, hudIdStr, x, y, scale = 2.0) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.hud[hudIdStr]) return { w: 0, h: 0 };
        const [sx, sy, sw, sh] = this.gta1Meta.sprites.hud[hudIdStr];
        const dw = Math.round(sw * scale);
        const dh = Math.round(sh * scale);
        ctx.drawImage(this.gta1SpritesImg, sx, sy, sw, sh, Math.round(x), Math.round(y), dw, dh);
        return { w: dw, h: dh };
    }

    renderAuthenticGta1Hud(ctx, game) {
        if (!this.gta1Ready) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const s = 1.45;

        // A. TOP-RIGHT: AUTHENTIC CARNAGE3D SCORE, MULTIPLIER & LIVES PANEL
        const scoreStr = String(Math.max(0, Math.floor(game.cash || 0))).padStart(8, "0");
        const scoreW = this.measureGta1FontString("SCORE2", scoreStr, s);
        const scoreX = W - scoreW - 14;
        const scoreY = 10;
        this.drawGta1FontString(ctx, "SCORE2", scoreStr, scoreX, scoreY, s, "left");

        const mulStr = String(Math.max(1, game.multiplier || 1));
        const livesStr = `:${Math.max(0, game.lives !== undefined ? game.lives : 3)}`;
        const mulW = this.measureGta1FontString("MISSMUL2_GREEN", mulStr, s);
        const livesW = this.measureGta1FontString("MISSMUL2", livesStr, s);

        const badgeSp = this.gta1Meta.sprites.hud["24"];
        const badgeW = badgeSp ? badgeSp[2] * s : 16;

        const mulTextX = scoreX - 6 - mulW;
        const badgeX = mulTextX - badgeW - 2;
        this.drawHudSprite(ctx, "24", badgeX, scoreY + 2, s);
        this.drawGta1FontString(ctx, "MISSMUL2_GREEN", mulStr, mulTextX, scoreY, s, "left");

        const livesX = scoreX - 6 - livesW;
        this.drawGta1FontString(ctx, "MISSMUL2", livesStr, livesX, scoreY + 13 * s, s, "left");

        // B. LEFT PANEL (Below ▼ Game Cheats): LUCIA GTA 6 MUGSHOT BADGE + WEAPON, ARMOR, KEY & PAGER POPUP
        const leftX = 12;
        let leftY = this.showCheatsWindow ? (this.cheatsCollapsed ? 42 : 476) : 12;
        const iconScale = 1.35;

        let iconX = leftX;
        const p = game.player;

        // Draw Lucia Caminos 1997 Pixel-Art Portrait Badge + Health Bar
        const mugW = 48;
        const mugH = 48;
        this.drawPixelPortraitRect(ctx, iconX, leftY, mugW, mugH, "LUCIA", {
            bandana: Boolean(p.bandana),
            alert: (game.wantedLevel || 0) > 0
        });
        // Health Bar right below Lucia's Mugshot
        ctx.fillStyle = "rgba(10, 12, 20, 0.88)";
        ctx.fillRect(iconX, leftY + mugH + 2, mugW, 7);
        const hpRatio = Math.max(0, Math.min(1, (p.hp || 0) / (p.maxHp || 100)));
        ctx.fillStyle = hpRatio > 0.35 ? "#39ff14" : "#ff1e38";
        ctx.fillRect(iconX + 1, leftY + mugH + 3, Math.round((mugW - 2) * hpRatio), 5);
        iconX += mugW + 8;

        if (p.weapon && p.weapon !== "FIST") {
            let weapSpr = "30";
            if (p.weapon === "UZI" || p.weapon === "SHOTGUN") weapSpr = "31";
            else if (p.weapon === "ROCKET") weapSpr = "32";
            else if (p.weapon === "FLAMETHROWER") weapSpr = "33";

            const wDim = this.drawHudSprite(ctx, weapSpr, iconX, leftY, iconScale);
            const ammoVal = p.ammo ? p.ammo[p.weapon] : 99;
            if (ammoVal !== undefined && Number.isFinite(ammoVal)) {
                const ammoStr = String(Math.min(999, Math.max(0, ammoVal))).padStart(2, "0");
                this.drawGta1FontString(ctx, "SUB1", ammoStr, iconX + wDim.w * 0.5, leftY + wDim.h - 10 * iconScale, iconScale, "center");
            }
            iconX += wDim.w + 6;
        }

        if ((p.armor || 0) > 0) {
            const aDim = this.drawHudSprite(ctx, "43", iconX, leftY, iconScale);
            const armStr = String(Math.min(99, Math.ceil(p.armor))).padStart(2, "0");
            this.drawGta1FontString(ctx, "SUB1_RED", armStr, iconX + aDim.w * 0.5, leftY + aDim.h * 0.58, iconScale, "center");
            iconX += aDim.w + 6;
        }

        if ((game.jailFreeCards || 0) > 0) {
            this.drawHudSprite(ctx, "45", iconX, leftY, iconScale);
        }

        // Only draw Pager when an active mission or pager notification is triggered
        if (game.missions.activeMission || (game.pagerPopupTimer || 0) > 0) {
            const pagerY = leftY + 62;
            const pagerEl = document.getElementById("pager-text");
            const rawPagerText = pagerEl ? (pagerEl.textContent || "").trim().toUpperCase() : "MISSION ACTIVE";

            this.drawHudSprite(ctx, "28", leftX, pagerY, iconScale);
            if (Math.floor(this.time * 4) % 2 === 0) {
                this.drawHudSprite(ctx, "29", leftX + 14 * iconScale, pagerY + 31 * iconScale, iconScale);
            }

            ctx.save();
            ctx.beginPath();
            ctx.rect(
                leftX + Math.round(19 * iconScale),
                pagerY + Math.round(12 * iconScale),
                Math.round(86 * iconScale),
                Math.round(15 * iconScale)
            );
            ctx.clip();
            const scrollSpeed = 52 * iconScale;
            const paddedPager = `   ${rawPagerText}   `;
            const totalPagerW = this.measureGta1FontString("PAGER1", paddedPager, iconScale);
            const scrollOffset = (this.time * scrollSpeed) % Math.max(1, totalPagerW);
            this.drawGta1FontString(
                ctx,
                "PAGER1",
                paddedPager + paddedPager,
                leftX + Math.round(19 * iconScale) - scrollOffset,
                pagerY + Math.round(12 * iconScale),
                iconScale,
                "left"
            );
            ctx.restore();
        }

        // B2. TOP-RIGHT LIVE VICE CITY MINIMAP / GPS RADAR (Below Score Counter)
        this.renderTopMinimap(ctx, game);

        // C. TOP-CENTER: WANTED POLICE HEADS (41/42 — UP TO 6 HEADS), DISTRICT BANNER (25/26) & CAR NAME (27)
        if ((game.wantedLevel || 0) > 0) {
            const headSp = this.gta1Meta.sprites.hud["41"];
            const headW = headSp ? headSp[2] * s : 32;
            const maxHeads = 6;
            const stripW = maxHeads * (headW + 4);
            let hx = Math.round((W - stripW) * 0.5);
            const flashActive = Math.floor(this.time * 6) % 2 === 0;

            for (let i = 0; i < maxHeads; i++) {
                const isLit = i < game.wantedLevel;
                const sprId = isLit ? (flashActive ? "41" : "42") : "42";
                ctx.save();
                if (!isLit) ctx.globalAlpha = 0.32;
                this.drawHudSprite(ctx, sprId, hx, 10, s);
                ctx.restore();
                hx += headW + 4;
            }
        }

        if ((game.districtPopupTimer || 0) > 0 && game.currentDistrict) {
            const spL = this.gta1Meta.sprites.hud["25"];
            const spR = this.gta1Meta.sprites.hud["26"];
            if (spL && spR) {
                const totalBannerW = (spL[2] + spR[2]) * s;
                const bx = Math.round((W - totalBannerW) * 0.5);
                const by = 52;
                this.drawHudSprite(ctx, "25", bx, by, s);
                this.drawHudSprite(ctx, "26", bx + spL[2] * s, by, s);
                this.drawGta1FontString(ctx, "SUB2", game.currentDistrict.toUpperCase(), W * 0.5, by + 6 * s, s, "center");
            }
        } else if (this.vehicleBannerTimer > 0 && this.vehicleBannerName) {
            const spCar = this.gta1Meta.sprites.hud["27"];
            if (spCar) {
                const bx = Math.round((W - spCar[2] * s) * 0.5);
                const by = 52;
                this.drawHudSprite(ctx, "27", bx, by, s);
                this.drawGta1FontString(ctx, "SUB2", this.vehicleBannerName.toUpperCase(), W * 0.5, by + 6 * s, s, "center");
            }
        }

        // D. CENTER SCREEN BIG MESSAGE (BIG1.FON: "WASTED", "BUSTED", "GOURANGA!")
        const bigOverlay = document.getElementById("big-status-overlay");
        const bigTitleEl = document.getElementById("big-status-title");
        const bigSubEl = document.getElementById("big-status-sub");
        if (bigOverlay && bigOverlay.classList.contains("visible") && bigTitleEl) {
            const bigText = (bigTitleEl.textContent || "").trim().toUpperCase();
            if (bigText) {
                this.drawGta1FontString(ctx, "BIG1", bigText, W * 0.5, H * 0.40, s * 1.3, "center");
            }
            if (bigSubEl) {
                const subText = (bigSubEl.textContent || "").trim().toUpperCase();
                if (subText) {
                    this.drawGta1FontString(ctx, "SUB2", subText, W * 0.5, H * 0.40 + 46 * s, s, "center");
                }
            }
        }

        // E. BOTTOM-CENTER MISSION OBJECTIVE & TIMER IN SUB2.FON (when mission active)
        if (game.missions.activeMission) {
            const objEl = document.getElementById("hud-objective-text");
            const timerEl = document.getElementById("hud-mission-timer");
            const objText = objEl ? (objEl.textContent || "").trim().toUpperCase() : "";
            const timerText = timerEl ? (timerEl.textContent || "").trim().toUpperCase() : "";
            if (objText) {
                const fullLine = timerText ? `${objText}  ${timerText}` : objText;
                this.drawGta1FontString(ctx, "SUB2", fullLine, W * 0.5, H - 24 * s, s, "center");
            }
        }
    }

    renderTopMinimap(ctx, game) {
        const useVice = this.mapStyle === "VICE" && this.viceOverviewReady;
        const srcImg = useVice ? this.viceOverviewImg : (this.nycOverviewReady ? this.nycOverviewImg : null);
        if (!srcImg) return;

        const W = this.canvas.width;
        const mw = 192;
        const mh = 192;
        const mx = W - mw - 12;
        const my = 78; // Below Top-Right GTA 1 Score & Lives counter (header sits at y=56..78)

        const p = game.player;
        const worldW = this.map.width;  // 256 * 64 = 16384
        const worldH = this.map.height; // 256 * 64 = 16384

        // Zoom span in blocks: 0 = Cruise (68 blocks), 1 = Wide (136 blocks), 2 = Full Island (256 blocks)
        const zoomMode = this.minimapZoomMode || 0;
        const spanBlocks = zoomMode === 0 ? 68 : (zoomMode === 1 ? 136 : 256);
        const viewWorldW = spanBlocks * TILE_SIZE;
        const viewWorldH = spanBlocks * TILE_SIZE;

        let viewWorldX = p.x - viewWorldW * 0.5;
        let viewWorldY = p.y - viewWorldH * 0.5;
        viewWorldX = Math.max(0, Math.min(worldW - viewWorldW, viewWorldX));
        viewWorldY = Math.max(0, Math.min(worldH - viewWorldH, viewWorldY));

        const imgScaleX = srcImg.width / worldW;
        const imgScaleY = srcImg.height / worldH;
        const srcX = viewWorldX * imgScaleX;
        const srcY = viewWorldY * imgScaleY;
        const srcW = viewWorldW * imgScaleX;
        const srcH = viewWorldH * imgScaleY;

        ctx.save();

        // 1. Header Bar (District Name + [ZOOM] + [M] buttons)
        const hdrY = my - 21;
        ctx.fillStyle = "rgba(9, 13, 22, 0.92)";
        ctx.fillRect(mx, hdrY, mw, 21);
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mx + 0.5, hdrY + 0.5, mw - 1, 20);

        ctx.font = "bold 10px Consolas, 'Courier New', monospace";
        ctx.textBaseline = "middle";
        const distName = (game.currentDistrict || "VICE CITY").toUpperCase();
        ctx.fillStyle = "#00f0ff";
        ctx.fillText(distName.slice(0, 14), mx + 5, hdrY + 11);

        // [ZOOM] button
        const zoomLabels = ["1x", "2x", "ALL"];
        const zBtnW = 32;
        const zBtnX = mx + mw - 68;
        ctx.fillStyle = "rgba(44, 78, 128, 0.95)";
        ctx.fillRect(zBtnX, hdrY + 2, zBtnW, 16);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.strokeRect(zBtnX + 0.5, hdrY + 2.5, zBtnW - 1, 15);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(zoomLabels[zoomMode], zBtnX + 5, hdrY + 11);
        this.cheatButtons.push({ id: "MINIMAP_ZOOM", x: zBtnX, y: hdrY + 2, w: zBtnW, h: 16 });

        // [MAP] button
        const mBtnW = 32;
        const mBtnX = mx + mw - 34;
        ctx.fillStyle = "rgba(180, 42, 118, 0.95)";
        ctx.fillRect(mBtnX, hdrY + 2, mBtnW, 16);
        ctx.strokeStyle = "#ff78c4";
        ctx.strokeRect(mBtnX + 0.5, hdrY + 2.5, mBtnW - 1, 15);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("[M]", mBtnX + 6, hdrY + 11);
        this.cheatButtons.push({ id: "MINIMAP_FULLMAP", x: mBtnX, y: hdrY + 2, w: mBtnW, h: 16 });

        // 2. Minimap Satellite Frame & Cropped Image
        ctx.fillStyle = "#07101c";
        ctx.fillRect(mx, my, mw, mh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(srcImg, srcX, srcY, srcW, srcH, mx, my, mw, mh);

        // Register click-to-teleport on the minimap canvas itself!
        this.cheatButtons.push({
            id: "MINIMAP_CANVAS",
            x: mx,
            y: my,
            w: mw,
            h: mh,
            viewWorldX,
            viewWorldY,
            viewWorldW,
            viewWorldH
        });

        // Clip inside minimap box for world markers
        ctx.save();
        ctx.beginPath();
        ctx.rect(mx, my, mw, mh);
        ctx.clip();

        const worldToMini = (wx, wy) => ({
            x: mx + ((wx - viewWorldX) / viewWorldW) * mw,
            y: my + ((wy - viewWorldY) / viewWorldH) * mh
        });

        // 3. Pay 'n' Spray Shops (Green [P])
        if (Array.isArray(this.map.payNSprays)) {
            for (const pns of this.map.payNSprays) {
                const pt = worldToMini(pns.x + pns.w * 0.5, pns.y + pns.h * 0.5);
                if (pt.x < mx - 6 || pt.x > mx + mw + 6 || pt.y < my - 6 || pt.y > my + mh + 6) continue;
                ctx.fillStyle = "#14532d";
                ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
                ctx.strokeStyle = "#39ff14";
                ctx.lineWidth = 1;
                ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);
            }
        }

        // 4. Ringing Payphones
        if (game.missions && Array.isArray(game.missions.payphones)) {
            for (const ph of game.missions.payphones) {
                if (ph.completed) continue;
                const pt = worldToMini(ph.x, ph.y);
                if (pt.x < mx - 6 || pt.x > mx + mw + 6 || pt.y < my - 6 || pt.y > my + mh + 6) continue;
                ctx.fillStyle = "#39ff14";
                ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
            }
        }

        // 5. Nearby Vehicles & VCPD Cop Cars
        if (Array.isArray(game.vehicles) && zoomMode < 2) {
            const copFlash = Math.floor(this.time * 8) % 2 === 0;
            for (const v of game.vehicles) {
                if (v.destroyed || v === p.inVehicle) continue;
                const pt = worldToMini(v.x, v.y);
                if (pt.x < mx || pt.x > mx + mw || pt.y < my || pt.y > my + mh) continue;
                if (v.driver === "AI_COP" || v.isPolice) {
                    ctx.fillStyle = copFlash ? "#ef4444" : "#3b82f6";
                    ctx.fillRect(pt.x - 2.5, pt.y - 2.5, 5, 5);
                } else if (v.missionTag === "LANDMARK") {
                    ctx.fillStyle = "#ffd13b";
                    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
                }
            }
        }

        // 6. Official Vice City Landmarks ("Lieux Officiels") — Inside & Edge-Clamped GPS Blips!
        let nearestLm = null;
        let nearestDist = Infinity;
        if (Array.isArray(this.map.landmarks)) {
            ctx.font = "bold 8.5px Consolas, 'Courier New', monospace";
            for (const lm of this.map.landmarks) {
                const d = Math.hypot(lm.x - p.x, lm.y - p.y);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestLm = lm;
                }
                const pt = worldToMini(lm.x, lm.y);
                const inside = pt.x >= mx + 8 && pt.x <= mx + mw - 8 && pt.y >= my + 8 && pt.y <= my + mh - 8;
                if (inside) {
                    ctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                    ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
                    ctx.strokeStyle = "#050811";
                    ctx.lineWidth = 1.2;
                    ctx.strokeRect(pt.x - 4, pt.y - 4, 8, 8);

                    const rawShort = lm.short || lm.shortName || "LANDMARK";
                    const tag = String(rawShort).replace("VICE ", "").replace("VERCETTI ", "VERCETTI").slice(0, 10);
                    const tw = ctx.measureText(tag).width + 4;
                    const tx = Math.min(mx + mw - tw - 2, Math.max(mx + 2, pt.x - tw * 0.5));
                    const ty = pt.y - 10 < my + 8 ? pt.y + 9 : pt.y - 9;
                    ctx.fillStyle = "rgba(6, 10, 18, 0.85)";
                    ctx.fillRect(tx, ty - 5, tw, 10);
                    ctx.fillStyle = lm.visited ? "#86efac" : "#ffffff";
                    ctx.fillText(tag, tx + 2, ty);
                } else {
                    // Clamp directional blip to minimap border so player can always navigate to Vice Beach & Landmarks!
                    const cx = Math.max(mx + 6, Math.min(mx + mw - 6, pt.x));
                    const cy = Math.max(my + 6, Math.min(my + mh - 6, pt.y));
                    ctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                    ctx.fillRect(cx - 3, cy - 3, 6, 6);
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(cx - 3, cy - 3, 6, 6);
                }
            }
        }

        // 7. Active Mission Target Blip
        const mTarget = game.missions ? game.missions.getTargetPosition() : null;
        if (mTarget) {
            const pt = worldToMini(mTarget.x, mTarget.y);
            const cx = Math.max(mx + 6, Math.min(mx + mw - 6, pt.x));
            const cy = Math.max(my + 6, Math.min(my + mh - 6, pt.y));
            const pulse = 4 + Math.sin(this.time * 9) * 2;
            ctx.strokeStyle = "#ff2a85";
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - pulse, cy - pulse, pulse * 2, pulse * 2);
        }

        // 8. Jason Duval Partner Blip
        if (game.jason) {
            const jp = worldToMini(game.jason.x, game.jason.y);
            ctx.fillStyle = "#00f0ff";
            ctx.fillRect(jp.x - 3, jp.y - 3, 6, 6);
        }

        // 9. Lucia / Player Directional Arrow & Vision Cone
        const pp = worldToMini(p.x, p.y);
        const ang = (p.inVehicle ? p.inVehicle.angle : p.angle) || 0;
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(ang);
        // Subtle heading cone
        ctx.fillStyle = "rgba(0, 240, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(26, -13);
        ctx.lineTo(26, 13);
        ctx.closePath();
        ctx.fill();
        // Crisp directional player arrow
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#ff2a85";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-2.5, 0);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore(); // End minimap clip

        // Outer neon border + North "N" badge
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);

        ctx.fillStyle = "rgba(8, 12, 22, 0.9)";
        ctx.fillRect(mx + mw * 0.5 - 7, my + 1, 14, 11);
        ctx.fillStyle = "#ffd13b";
        ctx.font = "bold 9px Consolas, 'Courier New', monospace";
        ctx.fillText("N", mx + mw * 0.5 - 3, my + 7);

        // 10. Bottom GPS Landmark Bar (Shows nearest Landmark + 1-click Teleport!)
        const ftrY = my + mh;
        ctx.fillStyle = "rgba(9, 13, 22, 0.92)";
        ctx.fillRect(mx, ftrY, mw, 20);
        ctx.strokeStyle = "#ff2a85";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(mx + 0.5, ftrY + 0.5, mw - 1, 19);

        if (nearestLm) {
            const distMeters = Math.round(nearestDist / 16);
            const dx = nearestLm.x - p.x;
            const dy = nearestLm.y - p.y;
            const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
            const dirIdx = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
            const dirStr = dirs[dirIdx];

            // Pick target for [GO] button: if already within 45m of nearestLm, cycle to next unvisited landmark!
            let goTarget = nearestLm;
            if (distMeters < 45 && Array.isArray(this.map.landmarks)) {
                const unvisited = this.map.landmarks.find((l) => !l.visited && l.id !== nearestLm.id);
                const nextIdx = (this.map.landmarks.indexOf(nearestLm) + 1) % this.map.landmarks.length;
                goTarget = unvisited || this.map.landmarks[nextIdx];
            }

            const nearShort = nearestLm.short || nearestLm.shortName || "LANDMARK";
            ctx.font = "bold 9.5px Consolas, 'Courier New', monospace";
            ctx.fillStyle = "#ffd13b";
            const statusTxt = distMeters < 35
                ? `★ AT ${nearShort}`
                : `📍 ${nearShort} (${distMeters}m ${dirStr})`;
            ctx.fillText(statusTxt.slice(0, 22), mx + 5, ftrY + 10.5);

            // [GO] button on right of footer
            const goW = 34;
            const goX = mx + mw - goW - 2;
            ctx.fillStyle = "rgba(25, 115, 72, 0.95)";
            ctx.fillRect(goX, ftrY + 2, goW, 15);
            ctx.strokeStyle = "#39ff14";
            ctx.strokeRect(goX + 0.5, ftrY + 2.5, goW - 1, 14);
            ctx.fillStyle = "#ffffff";
            ctx.fillText("GO▶", goX + 5, ftrY + 10.5);

            this.cheatButtons.push({
                id: "MINIMAP_NEXT_LM",
                landmarkId: goTarget.id,
                x: mx,
                y: ftrY,
                w: mw,
                h: 20
            });
        }

        ctx.restore();
    }

    /* ========================================================================
       9. CHARACTER PORTRAITS & FULL 256x256 NYC.CMP SQUARE MAP ([M] KEY)
       ======================================================================== */
    drawPixelPortraitRect(ctx, rx, ry, rw, rh, character = "LUCIA", opts = {}) {
        ctx.save();
        // 24x24 pixel-art grid scaled to (rw, rh)
        const G = 24;
        const px = rw / G;
        const py = rh / G;
        const dot = (gx, gy, gw, gh, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(
                Math.floor(rx + gx * px),
                Math.floor(ry + gy * py),
                Math.ceil(gw * px),
                Math.ceil(gh * py)
            );
        };

        // Vice City Sunset Background
        dot(0, 0, 24, 8, "#3b0764");
        dot(0, 8, 24, 8, "#9d174d");
        dot(0, 16, 24, 8, "#ea580c");

        if (character === "LUCIA") {
            // Jet-black tied-back hair + ponytail bun + wavy side strands
            dot(8, 1, 8, 3, "#140d18"); // top bun / ponytail
            dot(9, 3, 6, 1, "#ff2e93"); // pink hair tie
            dot(6, 3, 12, 6, "#140d18"); // hair crown
            dot(5, 5, 2, 10, "#140d18"); // left hair lock
            dot(17, 5, 2, 10, "#140d18"); // right hair lock

            // Bare Golden-Tan Latina Shoulders & Neck
            dot(4, 18, 16, 6, "#d99568");
            dot(9, 15, 6, 4, "#c68256");

            // Hot-Pink Camisole Tank Top + Straps
            dot(7, 18, 2, 6, "#ff2e93"); // left strap
            dot(15, 18, 2, 6, "#ff2e93"); // right strap
            dot(7, 20, 10, 4, "#f43f5e");
            dot(8, 21, 8, 3, "#db2777");

            // Gold Hoop Earrings
            dot(4, 10, 2, 4, "#facc15");
            dot(18, 10, 2, 4, "#facc15");

            // Golden-Tan Face
            dot(7, 5, 10, 10, "#e2a276");
            dot(8, 14, 8, 2, "#d99568");

            // Arched Dark Brows & Expressive Dark Eyes
            dot(8, 7, 3, 1, "#1e1124");
            dot(13, 7, 3, 1, "#1e1124");
            dot(8, 8, 3, 2, "#140d18");
            dot(13, 8, 3, 2, "#140d18");
            dot(8, 8, 1, 1, "#ffffff"); // eye catchlight
            dot(13, 8, 1, 1, "#ffffff");

            if (opts.bandana) {
                // Red GTA 6 Heist Bandana covering nose & mouth ([B] toggle)
                dot(7, 11, 10, 4, "#dc2626");
                dot(8, 14, 8, 2, "#991b1b");
                dot(9, 12, 2, 1, "#fecaca");
                dot(13, 12, 2, 1, "#fecaca");
            } else {
                // Nose shadow & full berry-rose lips
                dot(11, 10, 2, 2, "#c68256");
                dot(10, 13, 4, 2, "#be185d");
                dot(11, 13, 2, 1, "#f43f5e");
            }
        } else {
            // Jason Duval: Backwards Crimson Cap, Dirty-Blond Hair, White Ribbed Tank Top
            dot(6, 2, 12, 5, "#dc2626"); // red cap crown
            dot(4, 5, 4, 2, "#991b1b"); // backwards cap strap/brim
            dot(6, 6, 12, 2, "#92623a"); // dirty-blond hair edge
            dot(4, 18, 16, 6, "#dca074"); // tanned muscular shoulders
            dot(7, 18, 10, 6, "#f1f5f9"); // white ribbed tank top
            dot(9, 15, 6, 4, "#c48558");
            dot(7, 6, 10, 10, "#e4a87e");
            dot(8, 8, 3, 2, "#1e293b");
            dot(13, 8, 3, 2, "#1e293b");
            dot(8, 12, 8, 3, "#a16e47"); // stubble
            dot(10, 13, 4, 1, "#7c4d2b");
        }

        // Crisp 1997 Arcade Border
        ctx.strokeStyle = opts.alert ? "#ff1e38" : "#f472b6";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
        ctx.restore();
    }

    drawCharacterPortrait(canvasEl, character = "LUCIA", opts = {}) {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        this.drawPixelPortraitRect(ctx, 0, 0, canvasEl.width, canvasEl.height, character, opts);
    }

    bakeRadarBackground() {
        const useVice = this.mapStyle === "VICE" && this.viceOverviewReady;
        const srcImg = useVice ? this.viceOverviewImg : (this.nycOverviewReady ? this.nycOverviewImg : null);
        if (!srcImg) return;
        if (this.fullMapBgCanvas) {
            const fctx = this.fullMapBgCanvas.getContext("2d");
            fctx.imageSmoothingEnabled = false;
            fctx.drawImage(srcImg, 0, 0, this.fullMapBgCanvas.width, this.fullMapBgCanvas.height);
        }
        if (this.radarBgCanvas) {
            const rctx = this.radarBgCanvas.getContext("2d");
            rctx.imageSmoothingEnabled = false;
            rctx.drawImage(srcImg, 0, 0, this.radarBgCanvas.width, this.radarBgCanvas.height);
        }
    }

    renderRadar(game) {
        // Rendered inside Full Square NYC.CMP Map ([M] key)
    }

    renderFullMap(game) {
        const canvasEl = document.getElementById("fullmap-canvas");
        if (!canvasEl || !this.fullMapBgCanvas) return;
        const fctx = canvasEl.getContext("2d");
        const w = canvasEl.width;
        const h = canvasEl.height;
        const sx = w / this.map.width;
        const sy = h / this.map.height;

        fctx.imageSmoothingEnabled = false;
        fctx.clearRect(0, 0, w, h);
        fctx.drawImage(this.fullMapBgCanvas, 0, 0);

        for (const pns of this.map.payNSprays) {
            const px = Math.round((pns.x + pns.w * 0.5) * sx);
            const py = Math.round((pns.y + pns.h * 0.5) * sy);
            fctx.fillStyle = "#14532d";
            fctx.fillRect(px - 5, py - 5, 10, 10);
            fctx.strokeStyle = "#39ff14";
            fctx.lineWidth = 1.5;
            fctx.strokeRect(px - 5, py - 5, 10, 10);
        }

        for (const ph of game.missions.payphones) {
            if (ph.completed) continue;
            const px = Math.round(ph.x * sx);
            const py = Math.round(ph.y * sy);
            fctx.fillStyle = "#39ff14";
            fctx.fillRect(px - 4, py - 4, 8, 8);
            fctx.strokeStyle = "#052e16";
            fctx.lineWidth = 1.5;
            fctx.strokeRect(px - 4, py - 4, 8, 8);
        }

        // Official Vice City Landmarks ("Lieux Officiels") on the [M] Full Map
        if (Array.isArray(this.map.landmarks)) {
            fctx.font = "bold 9px Consolas, 'Courier New', monospace";
            fctx.textBaseline = "middle";
            for (const lm of this.map.landmarks) {
                const lx = Math.round(lm.x * sx);
                const ly = Math.round(lm.y * sy);
                // Glowing diamond/badge
                fctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                fctx.fillRect(lx - 5, ly - 5, 10, 10);
                fctx.strokeStyle = "#090d16";
                fctx.lineWidth = 1.5;
                fctx.strokeRect(lx - 5, ly - 5, 10, 10);

                // Label pill
                const labelTxt = lm.visited ? `✓ ${lm.short}` : lm.short;
                const tw = fctx.measureText(labelTxt).width + 6;
                const labelX = lx + 8 + tw > w - 4 ? lx - 8 - tw : lx + 8;
                const labelY = Math.max(10, Math.min(h - 10, ly));
                fctx.fillStyle = "rgba(8, 12, 22, 0.85)";
                fctx.fillRect(labelX, labelY - 6, tw, 12);
                fctx.strokeStyle = lm.color || "#ff2a85";
                fctx.lineWidth = 1;
                fctx.strokeRect(labelX, labelY - 6, tw, 12);
                fctx.fillStyle = "#ffffff";
                fctx.fillText(labelTxt, labelX + 3, labelY);
            }
        }

        const target = game.missions.getTargetPosition();
        if (target) {
            const tx = Math.round(target.x * sx);
            const ty = Math.round(target.y * sy);
            const pulse = 6 + Math.sin(this.time * 8) * 2.5;
            fctx.strokeStyle = "#ff2a85";
            fctx.lineWidth = 2;
            fctx.strokeRect(tx - pulse, ty - pulse, pulse * 2, pulse * 2);
        }

        if (game.jason) {
            const jx = Math.round(game.jason.x * sx);
            const jy = Math.round(game.jason.y * sy);
            fctx.fillStyle = "#00f0ff";
            fctx.fillRect(jx - 4, jy - 4, 8, 8);
        }

        const lx = Math.round(game.player.x * sx);
        const ly = Math.round(game.player.y * sx);
        fctx.fillStyle = "#ffffff";
        fctx.fillRect(lx - 5, ly - 5, 10, 10);
        fctx.strokeStyle = "#ff2a85";
        fctx.lineWidth = 2.5;
        fctx.strokeRect(lx - 5, ly - 5, 10, 10);
    }
}

window.RetroRenderer = RetroRenderer;
