/* ============================================================================
   GRAND THEFT AUTO: VICE CITY '97 — CUSTOM 2.5D WEBGL VOXEL & SPRITE ENGINE
   - 256x256x6 3D Voxel CityMesh & Coastal Terrain Renderer
   - 3D Perspective Top-Down Camera (fovy = 55.0 deg)
   - Depth-Tested WebGL SpriteBatch for Vehicles, Peds, Props & Effects
   - Retro 1997 Vice City Bitmap Font HUD & Neon GPS Express Drawer
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
        this.followHeightBlocks = 5.0; // 20.0m / 4.0m = 5.0 blocks above player ground
        this.zoomOffsetBlocks = 0.0; // Mouse wheel zoom delta in blocks (-2.2 .. +8.0)
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.nightMode = false;
        this.nightFactor = 0.0;
        this.sunsetFactor = 0.0;
        this.time = 0;
        this.lastFrameDt = 0.0166;
        this.fpsSmoothed = 60.0;

        // Vice City Neon GPS Express Drawer ([C] key or click header toggles open/collapsed)
        this.showCheatsWindow = true;
        this.cheatsCollapsed = true;
        this.cheatButtons = [];
        this.cameraMode = "follow";

        // Track vehicle banner popup when player enters a vehicle
        this.lastVehicleId = null;
        this.vehicleBannerTimer = 0;
        this.vehicleBannerName = "";

        // Map Visual Style: "VICE" (Vice City Art Deco) or "NYC" (Classic 1997)
        this.mapStyle = "VICE";
        if (this.map) this.map.mapStyle = "VICE";

        // Load Atlases, Voxel Map & Metadata
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
       Matches 1997 GTA 1 2.5D Engine MapRenderer.cpp + SpriteBatch.cpp + GameCamera.cpp
       ======================================================================== */
    initWebGL() {
        const gl = this.glCanvas.getContext("webgl", {
            alpha: false,
            depth: true,
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
            varying vec3 vWorldPos;
            void main() {
                vec2 uv = aUV;
                if (aAnim > 0.5 && aAnim < 1.5) {
                    // Lid 41 animated water: Aux frames 25..35 in 16x51 tile atlas
                    float idx = 698.0 + 25.0 + uWaterStep;
                    float col = mod(idx, 16.0);
                    float row = floor(idx / 16.0);
                    vec2 localUV = clamp(fract(aUV * vec2(16.0, 51.0)), vec2(0.5 / 64.0), vec2(63.5 / 64.0));
                    uv = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                } else if (aAnim > 1.5 && aAnim < 2.5) {
                    // Lid 22 animated rooftop fan: Aux frames 19..24 in 16x51 tile atlas
                    float idx = 698.0 + 19.0 + uFanStep;
                    float col = mod(idx, 16.0);
                    float row = floor(idx / 16.0);
                    vec2 localUV = clamp(fract(aUV * vec2(16.0, 51.0)), vec2(0.5 / 64.0), vec2(63.5 / 64.0));
                    uv = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                }
                vUV = uv;
                vAnim = aAnim;
                vWorldPos = aPos;
                gl_Position = uViewProj * vec4(aPos, 1.0);
            }
        `;

        const cityFS = `
            precision mediump float;
            varying vec2 vUV;
            varying float vAnim;
            varying vec3 vWorldPos;
            uniform sampler2D uTex;
            uniform float uNightTint;
            uniform float uSunsetTint;
            uniform float uViceStyle;
            uniform float uTime;
            uniform vec2 uSunDir;
            void main() {
                vec4 c = texture2D(uTex, vUV);
                if (c.a < 0.1) discard;

                // 1. AddRiverbed (world_mesh.cpp): 3D Sunken Sandy Seabed Floor (vAnim == 3.0) & Translucent Water Surface (vAnim == 1.0)
                if (vAnim > 2.5 && vAnim < 3.5) {
                    // Sunken 3D sandy seabed floor 0.42 blocks beneath the water surface with refracted underwater caustics!
                    float w1 = sin(vWorldPos.x * 4.2 + uTime * 2.3) * cos(vWorldPos.z * 4.2 - uTime * 1.8);
                    float w2 = sin((vWorldPos.x + vWorldPos.z) * 3.1 - uTime * 2.7);
                    float caust = max(0.0, w1 * 0.65 + w2 * 0.35);
                    vec3 submergedSand = c.rgb * vec3(0.45, 0.78, 0.86) + vec3(0.28, 0.34, 0.22) * caust * (1.0 - uNightTint * 0.7);
                    c.rgb = submergedSand;
                } else if (vAnim > 0.5 && vAnim < 1.5) {
                    // Translucent animated turquoise water surface (alpha = 0.78) revealing the 3D sunken seabed with parallax!
                    float w1 = sin(vUV.x * 220.0 + uTime * 2.3) * cos(vUV.y * 220.0 - uTime * 1.8);
                    float w2 = sin((vUV.x + vUV.y) * 160.0 - uTime * 2.7);
                    float caust = max(0.0, w1 * 0.65 + w2 * 0.35);
                    vec3 crestFoam = vec3(0.88, 0.96, 0.98);
                    c.rgb = mix(c.rgb, crestFoam, caust * 0.15 * (1.0 - uNightTint * 0.65));
                    c.a = 0.78;
                }

                // 2. 3D Cardinal Wall Normals, Solar Directional Shading & Ground-Contact Ambient Occlusion (world_mesh.cpp)
                if (vAnim < -0.5) {
                    vec2 wallNormal = vec2(0.0, 1.0);
                    if (vAnim > -1.5) wallNormal = vec2(-1.0, 0.0);      // West wall (-1.0)
                    else if (vAnim > -2.5) wallNormal = vec2(1.0, 0.0);  // East wall (-2.0)
                    else if (vAnim > -3.5) wallNormal = vec2(0.0, -1.0); // North wall (-3.0)
                    else wallNormal = vec2(0.0, 1.0);                    // South wall (-4.0)

                    float sunDot = dot(wallNormal, uSunDir);
                    float dirShade = 1.0 + sunDot * 0.14 * (1.0 - uNightTint * 0.75);
                    // Subtle Ground-Contact Ambient Occlusion at the base of each 3D building storey
                    float storeyY = fract(vWorldPos.y);
                    float baseAO = mix(0.84, 1.0, smoothstep(0.0, 0.32, storeyY));
                    c.rgb = min(vec3(1.0), c.rgb * dirShade * baseAO);
                }

                if (uSunsetTint > 0.01) {
                    // Warm Vice City Golden-Pink Sunset & Atlantic Sunrise glow
                    vec3 sunsetCol = c.rgb * vec3(1.16, 0.88, 0.96) + vec3(0.05, 0.01, 0.03);
                    c.rgb = mix(c.rgb, min(vec3(1.0), sunsetCol), uSunsetTint * 0.65);
                }
                if (uNightTint > 0.01) {
                    vec3 nightRgb = c.rgb;
                    if (vAnim < -0.5) {
                        // Inspired by gta2-rtx-remix SubUSDs/*_emissive.e.rtex.dds & lamp_emissives.py:
                        // Vertical 3D building facade (face < 4) with per-room emissive window masks & Vice neon trim!
                        float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                        float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
                        float isGlassOrNeon = clamp((lum - 0.50) * 3.8 + (sat - 0.34) * 2.8, 0.0, 1.0);

                        // Deterministic 3D room cell hash so ~62% of hotel/office rooms are lit and ~38% are dark
                        vec3 roomCell = floor(vWorldPos * vec3(2.0, 2.0, 2.0));
                        float roomHash = fract(sin(dot(roomCell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
                        float roomLit = step(0.36, roomHash);

                        vec3 roomTint = vec3(1.0, 0.86, 0.52); // Warm tungsten hotel/apartment window light
                        if (uViceStyle > 0.5) {
                            if (roomHash > 0.82) roomTint = vec3(0.28, 0.95, 1.0);      // Ocean Drive Neon Cyan
                            else if (roomHash > 0.66) roomTint = vec3(1.0, 0.36, 0.76); // Art Deco Flamingo Pink
                        }

                        vec3 wallDark = c.rgb * vec3(0.46, 0.54, 0.78);
                        vec3 windowGlow = min(vec3(1.0), mix(c.rgb * 1.38, roomTint, 0.42) + vec3(0.08, 0.05, 0.10));
                        nightRgb = mix(wallDark, windowGlow, isGlassOrNeon * (0.28 + 0.72 * roomLit));
                    } else if (vAnim > 0.5 && vAnim < 1.5) {
                        // Ocean / Bay / Lake water at night: deep nocturnal navy
                        nightRgb = c.rgb * vec3(0.42, 0.52, 0.78);
                    } else if (vAnim > 2.5 && vAnim < 3.5) {
                        // Sunken seabed at night
                        nightRgb = c.rgb * vec3(0.35, 0.45, 0.70);
                    } else {
                        // Horizontal ground (roads, sidewalks, golden beach sand, grass, rooftops):
                        // Cool nocturnal moonlight base (darkened & lit dynamically by renderNightLighting!)
                        nightRgb = c.rgb * vec3(0.68, 0.73, 0.90);
                    }
                    c.rgb = mix(c.rgb, nightRgb, clamp(uNightTint, 0.0, 1.0));
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
            uSunsetTint: gl.getUniformLocation(this.cityProg, "uSunsetTint"),
            uViceStyle: gl.getUniformLocation(this.cityProg, "uViceStyle"),
            uTime: gl.getUniformLocation(this.cityProg, "uTime"),
            uSunDir: gl.getUniformLocation(this.cityProg, "uSunDir")
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

    createGLTexture(img, useLinear = false) {
        const gl = this.gl;
        if (!gl) return null;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        const filter = useLinear ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    /* ========================================================================
       1C. GTA2-RTX-REMIX SPRITE & TEXTURE ENHANCEMENT PIPELINE
       Direct Port of:
       - src/alpha_bleed.h CloseInteriorHoles (Repairs interior palette-index-0 black holes inside cars & peds)
       - dll/src/texture_store.cpp ConvertEffectToAlpha (Luminance-to-alpha soft glow on fire, explosions, smoke & sparks)
       - src/alpha_bleed.h BleedTransparentEdges (Dilates border RGB into alpha=0 texels to prevent dark edge halos)
       ======================================================================== */
    processGtaSpritesRtx(img, meta) {
        if (!img || !img.width || !img.height || !meta || !meta.sprites) return img;
        try {
            const W = img.width;
            const H = img.height;
            const cvs = document.createElement("canvas");
            cvs.width = W;
            cvs.height = H;
            const ctx = cvs.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, W, H);
            const d = imgData.data;

            // 1. CloseInteriorHoles (src/alpha_bleed.h) + GTA 2 (1999) 3D Pre-Rendered Metallic Vehicle Remaster:
            // - Repairs interior palette-index-0 black holes inside car windshields, tires & grilles
            // - Upgrades flat 1997 8-bit car roofs/hoods with GTA 2's curved 3ds Max metallic clearcoat dome & contoured side fenders
            // - Transforms flat grey/black car windows into GTA 2 glossy sapphire-tinted windshields with diagonal sky reflections!
            // - Remasters pedestrian sprites (`isPed = true`) to GTA 2 (1999) 3D pre-rendered character quality (spherical head/shoulder dome + dark contour)!
            const closeBoxHoles = (rect, isVehicle = false, isPed = false) => {
                if (!Array.isArray(rect) || rect.length < 4) return;
                const [sx, sy, sw, sh] = rect;
                if (sw <= 3 || sh <= 3 || sx < 0 || sy < 0 || sx + sw > W || sy + sh > H) return;
                const size = sw * sh;
                const ext = new Uint8Array(size);
                const queue = new Int32Array(size);
                let head = 0;
                let tail = 0;

                const trySeed = (lx, ly) => {
                    const idx = ly * sw + lx;
                    if (ext[idx]) return;
                    const p = ((sy + ly) * W + (sx + lx)) * 4;
                    if (d[p + 3] < 16) {
                        ext[idx] = 1;
                        queue[tail++] = idx;
                    }
                };

                for (let lx = 0; lx < sw; lx++) {
                    trySeed(lx, 0);
                    trySeed(lx, sh - 1);
                }
                for (let ly = 1; ly < sh - 1; ly++) {
                    trySeed(0, ly);
                    trySeed(sw - 1, ly);
                }

                while (head < tail) {
                    const cur = queue[head++];
                    const lx = cur % sw;
                    const ly = (cur - lx) / sw;
                    if (lx > 0) trySeed(lx - 1, ly);
                    if (lx + 1 < sw) trySeed(lx + 1, ly);
                    if (ly > 0) trySeed(lx, ly - 1);
                    if (ly + 1 < sh) trySeed(lx, ly + 1);
                }

                for (let ly = 1; ly < sh - 1; ly++) {
                    const ny = ((ly + 0.5) / sh) * 2.0 - 1.0; // -1: rear, 0: cabin roof, +1: front hood
                    for (let lx = 1; lx < sw - 1; lx++) {
                        const idx = ly * sw + lx;
                        if (ext[idx]) continue;
                        const p = ((sy + ly) * W + (sx + lx)) * 4;
                        if (d[p + 3] < 16) {
                            // Restore interior palette-index-0 black pixel to opaque obsidian!
                            d[p] = 14;
                            d[p + 1] = 15;
                            d[p + 2] = 20;
                            d[p + 3] = 255;
                        }

                        if (!isPed) continue;

                        const nx = ((lx + 0.5) / sw) * 2.0 - 1.0;
                        const r = d[p];
                        const g = d[p + 1];
                        const b = d[p + 2];

                        // Check if this pixel is on the outer 1px silhouette perimeter (adjacent to exterior background)
                        const isPerimeter =
                            ext[idx - 1] === 1 ||
                            ext[idx + 1] === 1 ||
                            ext[idx - sw] === 1 ||
                            ext[idx + sw] === 1;

                        if (isPerimeter) {
                            // Crisp GTA 2 1px dark character silhouette outline so pedestrians pop against bright sidewalks & asphalt!
                            d[p] = (r * 0.73) | 0;
                            d[p + 1] = (g * 0.73) | 0;
                            d[p + 2] = (b * 0.77) | 0;
                        } else {
                            // GTA 2 3ds Max Spherical Head & Cylindrical Shoulder Volume Shading!
                            const radialDist = Math.hypot(nx * 0.90, (ny + 0.06) * 1.02);
                            const dome = Math.max(0.0, 1.0 - radialDist * 1.12);
                            const shadeMult = 0.88 + 0.24 * dome;
                            const crownHighlight = (dome * dome) * 14.0;
                            // Subtle 14% color vibrance boost on GTA 2 pedestrian outfits
                            const avg = (r + g + b) * 0.3333;
                            const vr = avg + (r - avg) * 1.14;
                            const vg = avg + (g - avg) * 1.14;
                            const vb = avg + (b - avg) * 1.14;
                            d[p] = Math.min(255, Math.max(0, Math.round(vr * shadeMult + crownHighlight)));
                            d[p + 1] = Math.min(255, Math.max(0, Math.round(vg * shadeMult + crownHighlight)));
                            d[p + 2] = Math.min(255, Math.max(0, Math.round(vb * shadeMult + crownHighlight)));
                        }
                    }
                }
            };

            if (Array.isArray(meta.sprites.vehicles)) {
                for (const ve of meta.sprites.vehicles) {
                    if (ve.base) closeBoxHoles(ve.base, true, false);
                    if (Array.isArray(ve.remaps)) {
                        for (const rm of ve.remaps) closeBoxHoles(rm, true, false);
                    }
                    if (Array.isArray(ve.doors)) {
                        for (const dr of ve.doors) closeBoxHoles(dr, true, false);
                    }
                    if (ve.damage) {
                        if (ve.damage.front) closeBoxHoles(ve.damage.front, true, false);
                        if (ve.damage.rear) closeBoxHoles(ve.damage.rear, true, false);
                        if (ve.damage.heavy) closeBoxHoles(ve.damage.heavy, true, false);
                    }
                }
            }
            if (meta.sprites.wrecked) {
                for (const k of Object.keys(meta.sprites.wrecked)) {
                    closeBoxHoles(meta.sprites.wrecked[k], false, false);
                }
            }
            if (meta.sprites.peds) {
                for (const roleKey of Object.keys(meta.sprites.peds)) {
                    const roleFrames = meta.sprites.peds[roleKey];
                    if (!roleFrames) continue;
                    for (const frameKey of Object.keys(roleFrames)) {
                        closeBoxHoles(roleFrames[frameKey], false, true);
                    }
                }
            }

            // 2. ConvertEffectToAlpha (dll/src/texture_store.cpp & tools/triage_textures.py):
            // Convert 8-bit cutout fire (234..241), explosions (242..249), smoke (200..210) & sparks (219..223)
            // so dark outer edges become smoothly translucent proportional to luminance instead of having a black 1-bit cutout rim!
            if (meta.sprites.objects) {
                const effectRanges = [
                    [200, 210, false], // Smoke puffs
                    [219, 223, true],  // Sparks & ricochets
                    [234, 241, true],  // Fire flames
                    [242, 249, true]   // Explosion fireballs
                ];
                for (const [idStart, idEnd, isEmissiveFire] of effectRanges) {
                    for (let id = idStart; id <= idEnd; id++) {
                        const rect = meta.sprites.objects[String(id)];
                        if (!Array.isArray(rect) || rect.length < 4) continue;
                        const [sx, sy, sw, sh] = rect;
                        for (let ly = 0; ly < sh; ly++) {
                            for (let lx = 0; lx < sw; lx++) {
                                const p = ((sy + ly) * W + (sx + lx)) * 4;
                                if (d[p + 3] === 0) continue;
                                const r = d[p];
                                const g = d[p + 1];
                                const b = d[p + 2];
                                const peak = Math.max(r, g, b);
                                if (isEmissiveFire) {
                                    // Smooth luminance-to-alpha ramp eliminating dark 8-bit charcoal fringe
                                    const softA = Math.min(255, Math.max(0, Math.round((peak - 14) * 2.15)));
                                    d[p + 3] = softA;
                                    if (softA > 0) {
                                        // Un-premultiply / lift warm flame colors on semi-transparent edges
                                        d[p] = Math.min(255, Math.round(r * 1.18 + 18));
                                        d[p + 1] = Math.min(255, Math.round(g * 1.10 + 6));
                                    }
                                } else {
                                    // Smoke puff soft edge alpha
                                    const softA = Math.min(220, Math.max(0, Math.round((peak - 10) * 1.85)));
                                    d[p + 3] = softA;
                                }
                            }
                        }
                    }
                }
            }

            // 3. BleedTransparentEdges (src/alpha_bleed.h):
            // 1-pass RGB color dilation into alpha=0 border texels (keeping alpha=0) to prevent dark fringe bleeding
            for (let y = 1; y < H - 1; y++) {
                const rowOff = y * W;
                for (let x = 1; x < W - 1; x++) {
                    const p = (rowOff + x) * 4;
                    if (d[p + 3] !== 0) continue;
                    let sr = 0, sg = 0, sb = 0, cnt = 0;
                    const n1 = p - 4, n2 = p + 4, n3 = p - W * 4, n4 = p + W * 4;
                    if (d[n1 + 3] > 32) { sr += d[n1]; sg += d[n1 + 1]; sb += d[n1 + 2]; cnt++; }
                    if (d[n2 + 3] > 32) { sr += d[n2]; sg += d[n2 + 1]; sb += d[n2 + 2]; cnt++; }
                    if (d[n3 + 3] > 32) { sr += d[n3]; sg += d[n3 + 1]; sb += d[n3 + 2]; cnt++; }
                    if (d[n4 + 3] > 32) { sr += d[n4]; sg += d[n4 + 1]; sb += d[n4 + 2]; cnt++; }
                    if (cnt > 0) {
                        d[p] = (sr / cnt) | 0;
                        d[p + 1] = (sg / cnt) | 0;
                        d[p + 2] = (sb / cnt) | 0;
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);
            return cvs;
        } catch (err) {
            console.warn("processGtaSpritesRtx fallback:", err);
            return img;
        }
    }

    loadAuthenticGta1Assets() {
        this.loadProgress = 0;
        this.loadTotal = 4;
        let viceTilesLoaded = false;
        let spritesLoaded = false;
        let mapBinBuffer = null;

        const checkReady = () => {
            this.loadProgress =
                (viceTilesLoaded ? 1 : 0) +
                (spritesLoaded ? 1 : 0) +
                (this.gta1Meta ? 1 : 0) +
                (mapBinBuffer ? 1 : 0);

            if (viceTilesLoaded && spritesLoaded && this.gta1Meta && mapBinBuffer && !this.gta1Ready) {
                this.vehicleBySprIdx = {};
                if (Array.isArray(this.gta1Meta.sprites.vehicles)) {
                    for (const ve of this.gta1Meta.sprites.vehicles) {
                        this.vehicleBySprIdx[String(ve.spr_idx)] = ve;
                    }
                }
                if (this.gl) {
                    this.tilesTexVice = this.createGLTexture(this.gta1TilesViceImg, false);
                    this.tilesTexNyc = this.tilesTexNyc || this.tilesTexVice;
                    this.tilesTex = this.mapStyle === "VICE" ? this.tilesTexVice : this.tilesTexNyc;
                    const enhancedSprites = this.processGtaSpritesRtx(this.gta1SpritesImg, this.gta1Meta);
                    this.spritesTex = this.createGLTexture(enhancedSprites, true);
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

                // Lazily load secondary NYC classic tile atlas after main Vice City world is already live
                loadImageWithRetry(this.gta1TilesImg, "assets/gta1/gta1_tiles.png?v=98_00", () => {
                    if (this.gl) {
                        this.tilesTexNyc = this.createGLTexture(this.gta1TilesImg, false);
                        if (this.mapStyle === "NYC") {
                            this.tilesTex = this.tilesTexNyc;
                        }
                    }
                });
            }
        };

        const loadImageWithRetry = (img, baseUrl, onSuccess, maxRetries = 5) => {
            let attempt = 0;
            img.onload = () => {
                onSuccess();
            };
            img.onerror = () => {
                attempt++;
                if (attempt <= maxRetries) {
                    const sep = baseUrl.includes("?") ? "&" : "?";
                    setTimeout(() => {
                        img.src = `${baseUrl}${sep}retry=${attempt}_${Date.now()}`;
                    }, 300 * attempt);
                } else {
                    console.error("Failed to load image after retries:", baseUrl);
                }
            };
            img.src = baseUrl;
        };

        const fetchWithRetry = (url, asArrayBuffer = false, maxRetries = 5) => {
            let attempt = 0;
            const run = () =>
                fetch(attempt === 0 ? url : `${url}&retry=${attempt}_${Date.now()}`)
                    .then((res) => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return asArrayBuffer ? res.arrayBuffer() : res.json();
                    })
                    .catch((err) => {
                        attempt++;
                        if (attempt <= maxRetries) {
                            return new Promise((resolve) => setTimeout(resolve, 300 * attempt)).then(run);
                        }
                        throw err;
                    });
            return run();
        };

        loadImageWithRetry(this.gta1TilesViceImg, "assets/gta1/gta1_tiles_vice.png?v=98_00", () => {
            viceTilesLoaded = true;
            checkReady();
        });

        loadImageWithRetry(this.gta1SpritesImg, "assets/gta1/gta1_sprites.png?v=98_00", () => {
            spritesLoaded = true;
            checkReady();
        });

        loadImageWithRetry(this.viceOverviewImg, "assets/gta1/vice_cmp_overview.png?v=98_00", () => {
            this.viceOverviewReady = true;
            this.bakeRadarBackground();
        });

        loadImageWithRetry(this.nycOverviewImg, "assets/gta1/nyc_cmp_overview.png?v=98_00", () => {
            this.nycOverviewReady = true;
            this.bakeRadarBackground();
        });

        fetchWithRetry("assets/gta1/gta1_meta.json?v=98_00", false)
            .then((meta) => {
                this.gta1Meta = meta;
                checkReady();
            })
            .catch((err) => console.error("Failed to load gta1_meta.json:", err));

        fetchWithRetry("assets/gta1/gta1_map.bin?v=98_00", true)
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
       Enhanced with gebdag/gta2-rtx-remix src/world_mesh.cpp:
       - AddRiverbed: 3D Sunken Sandy Seabed Floor (-0.42 blocks) + Translucent 3D Water Surface
       - AddDiagonalBlock (slopes 45..48), AddCornerRampBlock (slopes 49..52), AddPartialBlock (slopes 53..61)
       - SlopedWallUvs: Proportional top-edge UV cropping on sloped ramp walls (no vertical texture squashing)
       - kFlatFaceOffset: Outward normal offset on flat panels to eliminate 3D Z-fighting
       - 3D Cardinal Wall Normals (-1..-4) for live Solar Azimuth Directional Lighting & Ground-Contact AO
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
        const RIVERBED_DEPTH = 0.42; // kDefaultRiverbedDepth from world_mesh.cpp

        // Compute UV bounds for golden sandy seabed tile (lid 98 in 16x51 tile atlas)
        const tiles = this.gta1Meta.tiles;
        const bedAtlasIdx = (tiles.lid_start || 390) + (98 % (tiles.lid_count || 154));
        const bedCol = bedAtlasIdx % 16;
        const bedRow = Math.floor(bedAtlasIdx / 16);
        const padU = 0.5 / 1024.0;
        const padV = 0.5 / 3264.0;
        const bedU0 = bedCol / 16.0 + padU;
        const bedU1 = (bedCol + 1.0) / 16.0 - padU;
        const bedV0 = bedRow / 51.0 + padV;
        const bedV1 = (bedRow + 1.0) / 51.0 - padV;

        for (let cy = 0; cy < NUM_CHUNKS; cy++) {
            for (let cx = 0; cx < NUM_CHUNKS; cx++) {
                const opaqueVerts = [];
                const flatVerts = [];

                const x0 = cx * CHUNK_SIZE;
                const y0 = cy * CHUNK_SIZE;

                // 1. AddRiverbed (world_mesh.cpp lines 1016-1054):
                // Emit a 3D sunken sandy seabed quad (y_elev - 0.42) under every water cell and its 1-cell shore neighbors (kRiverbedPad = 1)
                for (let y = y0; y < y0 + CHUNK_SIZE; y++) {
                    for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
                        let waterFloor = null;
                        for (let dy = -1; dy <= 1 && waterFloor === null; dy++) {
                            const ny = y + dy;
                            if (ny < 0 || ny >= 256) continue;
                            for (let dx = -1; dx <= 1; dx++) {
                                const nx = x + dx;
                                if (nx < 0 || nx >= 256) continue;
                                for (let wz = 0; wz < 3; wz++) {
                                    const wBlkIdx = this.map.getBlockIndex(nx, ny, wz);
                                    if (wBlkIdx === 0) continue;
                                    const wb = this.map.getBlockInfo(wBlkIdx);
                                    if (wb && wb.faces[4] === 41) {
                                        waterFloor = wz + 1.0 - RIVERBED_DEPTH;
                                        break;
                                    }
                                }
                                if (waterFloor !== null) break;
                            }
                        }
                        if (waterFloor !== null) {
                            // Two triangles forming the sunken 3D seabed quad at (x..x+1, waterFloor, y..y+1) with animType = 3.0
                            opaqueVerts.push(
                                x,     waterFloor, y,     bedU0, bedV0, 3.0,
                                x,     waterFloor, y + 1, bedU0, bedV1, 3.0,
                                x + 1, waterFloor, y,     bedU1, bedV0, 3.0,
                                x + 1, waterFloor, y,     bedU1, bedV0, 3.0,
                                x,     waterFloor, y + 1, bedU0, bedV1, 3.0,
                                x + 1, waterFloor, y + 1, bedU1, bedV1, 3.0
                            );
                        }
                    }
                }

                // 2. Emit 3D Voxel Block Faces (routing animated water lids face===4 && tile===41 to flatVerts so they blend translucently over the 3D seabed!)
                for (let z = 0; z < MAP_LAYERS; z++) {
                    for (let y = y0; y < y0 + CHUNK_SIZE; y++) {
                        for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
                            const blkIdx = this.map.getBlockIndex(x, y, z);
                            if (blkIdx === 0) continue;
                            const b = this.map.getBlockInfo(blkIdx);
                            if (!b) continue;

                            for (let face = 0; face < 5; face++) {
                                if (b.faces[face] !== 0) {
                                    const isWaterLid = (face === 4 && b.faces[4] === 41);
                                    const targetArr = (b.isFlat || isWaterLid) ? flatVerts : opaqueVerts;
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

        const st = b.slopeType || 0;

        // 1. AddPartialBlock (world_mesh.cpp lines 776-855): Partial footprint slabs, pillars & corner posts (slopeType 53..61)
        let x0 = 0.0, x1 = 1.0, z0 = 0.0, z1 = 1.0;
        if (st >= 53 && st <= 61) {
            const lo = 0.25, hi = 0.75;
            switch (st) {
                case 53: x1 = lo; break;                       // West slab
                case 54: x0 = hi; break;                       // East slab
                case 55: z1 = lo; break;                       // North slab
                case 56: z0 = hi; break;                       // South slab
                case 57: x1 = lo; z1 = lo; break;              // NW corner post
                case 58: x0 = hi; z1 = lo; break;              // NE corner post
                case 59: x0 = hi; z0 = hi; break;              // SE corner post
                case 60: x1 = lo; z0 = hi; break;              // SW corner post
                default: x0 = lo; x1 = hi; z0 = lo; z1 = hi; break; // 61: Centered pillar
            }
        }

        const xW = x + x0;
        const xE = x + x1;
        const zN = z_south + z0;
        const zS = z_south + z1;

        // 8 corners of the voxel block in 3D block coordinates:
        // X: East [xW .. xE], Y: Elevation [y_elev .. y_elev+1], Z: South [zN .. zS]
        const p = [
            [xW, y_elev + 1.0, zN], // 0: Top-NW
            [xE, y_elev + 1.0, zN], // 1: Top-NE
            [xW, y_elev,       zN], // 2: Bot-NW
            [xE, y_elev,       zN], // 3: Bot-NE
            [xW, y_elev + 1.0, zS], // 4: Top-SW
            [xE, y_elev + 1.0, zS], // 5: Top-SE
            [xW, y_elev,       zS], // 6: Bot-SW
            [xE, y_elev,       zS]  // 7: Bot-SE
        ];

        // 2. Ramp & Corner-Ramp vertex adjustments (GameMapHelpers.cpp + world_mesh.cpp AddCornerRampBlock)
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
        } else if (st >= 49 && st <= 52) {
            // AddCornerRampBlock (world_mesh.cpp lines 659-767): Single-corner chamfer ramps
            if (st === 49) p[0][1] -= 1.0;      // NW corner drops
            else if (st === 50) p[1][1] -= 1.0; // NE corner drops
            else if (st === 51) p[4][1] -= 1.0; // SW corner drops
            else if (st === 52) p[5][1] -= 1.0; // SE corner drops
        }

        // 3. Select quad corner vertex indices + AddDiagonalBlock (slopes 45..48 from world_mesh.cpp lines 572-641)
        let qi;
        if (st >= 45 && st <= 48 && !b.isFlat) {
            if (st === 45) {
                // Solid E & S, diagonal cut faces NW (NE -> SW)
                if (face === 2) return;
                if (face === 0) qi = [4, 1, 6, 3];
                else if (face === 1) qi = [1, 5, 3, 7];
                else if (face === 3) qi = [5, 4, 7, 6];
                else qi = [1, 1, 4, 5]; // Triangular lid dropping NW
            } else if (st === 46) {
                // Solid W & S, diagonal cut faces NE (NW -> SE)
                if (face === 2) return;
                if (face === 0) qi = [4, 0, 6, 2];
                else if (face === 1) qi = [0, 5, 2, 7];
                else if (face === 3) qi = [5, 4, 7, 6];
                else qi = [0, 0, 4, 5]; // Triangular lid dropping NE
            } else if (st === 47) {
                // Solid E & N, diagonal cut faces SW (NW -> SE)
                if (face === 3) return;
                if (face === 0) qi = [5, 0, 7, 2];
                else if (face === 1) qi = [1, 5, 3, 7];
                else if (face === 2) qi = [0, 1, 2, 3];
                else qi = [0, 1, 5, 5]; // Triangular lid dropping SW
            } else {
                // st === 48: Solid W & N, diagonal cut faces SE (NE -> SW)
                if (face === 3) return;
                if (face === 0) qi = [4, 0, 6, 2];
                else if (face === 1) qi = [1, 4, 3, 6];
                else if (face === 2) qi = [0, 1, 2, 3];
                else qi = [0, 1, 4, 4]; // Triangular lid dropping SE
            }
        } else if (b.isFlat) {
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
            // Side face (0..194) — encode cardinal wall direction (-1:W, -2:E, -3:N, -4:S) for 3D solar shading & emissive windows!
            animType = -(face + 1.0);
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
        // Inset UV by 0.5 texels so gl.LINEAR bilinear filtering never bleeds across 64x64 tile boundaries!
        const padU = 0.5 / 1024.0;
        const padV = 0.5 / 3264.0;
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

        // 4. SlopedWallUvs (world_mesh.cpp lines 520-537):
        // A wall shortened by a ramp crops the top of its tile rather than squashing the whole tile into a shorter quad!
        const cornerUVs = [
            [baseUV[uvIdx[0]][0], baseUV[uvIdx[0]][1]],
            [baseUV[uvIdx[1]][0], baseUV[uvIdx[1]][1]],
            [baseUV[uvIdx[2]][0], baseUV[uvIdx[2]][1]],
            [baseUV[uvIdx[3]][0], baseUV[uvIdx[3]][1]]
        ];
        if (face < 4 && st > 0 && st <= 52) {
            const hTop0 = Math.max(0.0, Math.min(1.0, p[qi[0]][1] - y_elev));
            const hTop1 = Math.max(0.0, Math.min(1.0, p[qi[1]][1] - y_elev));
            if (hTop0 < 0.999) {
                cornerUVs[0][1] = cornerUVs[2][1] + (cornerUVs[0][1] - cornerUVs[2][1]) * hTop0;
            }
            if (hTop1 < 0.999) {
                cornerUVs[1][1] = cornerUVs[3][1] + (cornerUVs[1][1] - cornerUVs[3][1]) * hTop1;
            }
        }

        // 5. kFlatFaceOffset (world_mesh.cpp line 18):
        // Nudge flat decal faces slightly along their outward normal to prevent Z-fighting on coincident wall/floor planes!
        let nOffX = 0.0, nOffY = 0.0, nOffZ = 0.0;
        if (b.isFlat) {
            const kFlatFaceOffset = 0.003;
            if (face === 0) nOffX = -kFlatFaceOffset;
            else if (face === 1) nOffX = kFlatFaceOffset;
            else if (face === 2) nOffZ = -kFlatFaceOffset;
            else if (face === 3) nOffZ = kFlatFaceOffset;
            else nOffY = kFlatFaceOffset;
        }

        // Emit 2 triangles for quad: (0, 2, 1) and (1, 2, 3)
        const triOrder = [0, 2, 1, 1, 2, 3];
        for (let k = 0; k < 6; k++) {
            const c = triOrder[k];
            const pos = p[qi[c]];
            const uv = cornerUVs[c];
            verts.push(pos[0] + nOffX, pos[1] + nOffY, pos[2] + nOffZ, uv[0], uv[1], animType);
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
        drawOrder = 4,
        pitchZ = 0
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
            pitchZ,
            seq: this.spriteQueue.length
        });
    }

    pushAtlasSprite3D(rect, xPx, yPx, zBlocks, angleRad = 0, scale = 1.0, drawOrder = 4, r = 1, g = 1, b = 1, a = 1, pitchZ = 0) {
        if (!rect || !this.gta1SpritesImg.width) return;
        const [sx, sy, sw, sh] = rect;
        const texW = this.gta1SpritesImg.width;
        const texH = this.gta1SpritesImg.height;
        const u0 = (sx + 0.35) / texW;
        const v0 = (sy + 0.35) / texH;
        const u1 = (sx + sw - 0.35) / texW;
        const v1 = (sy + sh - 0.35) / texH;
        this.pushSpriteQuad3D(xPx, yPx, zBlocks, sw * scale, sh * scale, angleRad, u0, v0, u1, v1, r, g, b, a, drawOrder, pitchZ);
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

            const pZ = s.pitchZ || 0;
            for (let k = 0; k < 6; k++) {
                const idx = tri[k];
                const wx = cx + lx[idx] * cosA - lz[idx] * sinA;
                const wz = cz + lx[idx] * sinA + lz[idx] * cosA;
                const cornerPitch = pZ !== 0 ? (lz[idx] > 0 ? pZ : -pZ) : 0;
                verts[offset++] = wx;
                verts[offset++] = s.zBlocks + cornerPitch;
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

        // 2. Composite WebGL 3D scene onto 2D main canvas + draw dynamic Night Lighting, floating scores, HUD & Smartphone
        const ctx = this.ctx;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.glCanvas, 0, 0);

        if (!this.gta1Ready || !this.cmpReady) {
            const W = this.canvas.width;
            const H = this.canvas.height;
            const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
            bgGrad.addColorStop(0.0, "#0b0724");
            bgGrad.addColorStop(0.55, "#250b3b");
            bgGrad.addColorStop(1.0, "#082f49");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            const cx = W * 0.5;
            const cy = H * 0.5;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 28px Consolas, 'Courier New', monospace";
            ctx.fillStyle = "#ff2a85";
            ctx.fillText("GRAND THEFT AUTO: VICE CITY '97", cx + 2, cy - 42 + 2);
            ctx.fillStyle = "#00f0ff";
            ctx.fillText("GRAND THEFT AUTO: VICE CITY '97", cx, cy - 42);

            ctx.font = "bold 14px Consolas, 'Courier New', monospace";
            ctx.fillStyle = "#fde047";
            const pct = Math.min(99, Math.round(((this.loadProgress || 0) / (this.loadTotal || 4)) * 100));
            ctx.fillText(`LOADING 3D VICE CITY WORLD & GTA 2 ASSETS... ${pct}%`, cx, cy - 8);

            const bw = 340;
            const bh = 16;
            const bx = Math.round(cx - bw * 0.5);
            const by = Math.round(cy + 16);
            ctx.fillStyle = "rgba(8, 15, 30, 0.9)";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            const fillW = Math.max(24, Math.round((bw - 6) * Math.max(0.15, (this.loadProgress || 0) / (this.loadTotal || 4))));
            const barGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
            barGrad.addColorStop(0, "#ff2a85");
            barGrad.addColorStop(1, "#00f0ff");
            ctx.fillStyle = barGrad;
            ctx.fillRect(bx + 3, by + 3, fillW, bh - 6);
            ctx.restore();
            return;
        }

        // 2B. Real Dynamic Day/Sunset/Night Lighting (Darkness Mask + Conical Headlights + Taillights + Streetlamps + Neon + Sirens)
        if (((this.nightFactor || 0) > 0.02 || (this.sunsetFactor || 0) > 0.04 || this.nightMode) && !game.activeInterior) {
            this.renderNightLighting(ctx, game);
        }

        // Optional 1997 GTA 1 DebugRenderer Wireframe Overlay (Vehicle::DebugDraw / Pedestrian::DebugDraw)
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

        // 1997 Vice City Bitmap Font & Sprite HUD + Top-Right Live Vice City Minimap
        this.renderAuthenticGta1Hud(ctx, game);

        // Vice City Neon GPS Express Drawer (below HUD/Pager, toggle with [C])
        this.renderViceCityTourPanel(ctx, game);

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

        const nf = Math.max(0, Math.min(1, this.nightFactor !== undefined ? this.nightFactor : (this.nightMode ? 1.0 : 0.0)));
        const sf = Math.max(0, Math.min(1, this.sunsetFactor || 0.0));

        gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        if (this.mapStyle === "VICE") {
            // Smoothly interpolate Tropical Atlantic turquoise sea-level clear color from Day -> Sunset -> Midnight Navy
            const r = 0.03 * (1.0 - nf) + 0.012 * nf + sf * 0.06;
            const g = 0.44 * (1.0 - nf) + 0.045 * nf - sf * 0.04;
            const b = 0.56 * (1.0 - nf) + 0.11 * nf + sf * 0.04;
            gl.clearColor(r, g, b, 1.0);
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
        gl.uniform1f(this.cityLocs.uNightTint, nf);
        if (this.cityLocs.uSunsetTint) {
            gl.uniform1f(this.cityLocs.uSunsetTint, sf);
        }
        if (this.cityLocs.uTime) {
            gl.uniform1f(this.cityLocs.uTime, this.time);
        }
        if (this.cityLocs.uSunDir) {
            const clockHr = (game && typeof game.worldMinutes === "number")
                ? (((game.worldMinutes % 1440) + 1440) % 1440) / 60.0
                : 12.0;
            // Sun moves from East (+X) at 06:00 -> South (+Z) at 12:00 -> West (-X) at 18:00
            const sunAz = ((clockHr - 6.0) / 12.0) * Math.PI;
            gl.uniform2f(this.cityLocs.uSunDir, Math.cos(sunAz), Math.max(0.25, Math.sin(sunAz)));
        }
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

    batchPedSprite3D(pedType, frameIdx, x, y, zBlocks, angle, scale = 1.0, muzzleFlash = false, drawOrder = SPRITE_DRAW_ORDER.PEDESTRIAN, rTint = 1.0, gTint = 1.0, bTint = 1.0) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.peds[pedType]) return;
        const frames = this.gta1Meta.sprites.peds[pedType];
        const rect = frames[String(frameIdx)] || frames["98"] || frames["0"];
        if (!rect) return;
        // SPRITE_ZERO_ANGLE = 90.0f in GameDefs.h: .G24 sprites face South (+Y, Math.PI/2)
        const rot = angle - Math.PI * 0.5;
        this.pushAtlasSprite3D(rect, x, y, zBlocks, rot, scale, drawOrder, rTint, gTint, bTint, 1.0);

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
            this.batchPedSprite3D(pedType, 42, ped.x, ped.y, pz + 0.005, ped.angle, 1.30, false, SPRITE_DRAW_ORDER.CORPSE);
        }

        // Solar azimuth shadow vector for pedestrians, vehicles & street furniture (TimeOfDaySunAt from gta2-rtx-remix time_of_day.cpp!)
        const clockHour = (game && typeof game.worldMinutes === "number")
            ? (((game.worldMinutes % 1440) + 1440) % 1440) / 60.0
            : 12.0;
        const hourFromNoon = (clockHour - 12.0) / 6.5; // -1 at 05:30 sunrise, 0 at 12:00 noon, +1 at 18:30 sunset
        const sunShadowAngle = Math.atan2(0.55, Math.max(-1.2, Math.min(1.2, hourFromNoon)));
        const sunShadowLen = 11.0 + Math.min(14.0, Math.abs(hourFromNoon) * 13.0);
        const nfGlobal = Math.max(0, Math.min(1, this.nightFactor || 0));
        const sunShadowAlpha = 0.34 * (1.0 - nfGlobal * 0.70);
        const sunCos = Math.cos(sunShadowAngle);
        const sunSin = Math.sin(sunShadowAngle);

        // 4. Living Pedestrians, Monks, Cops, Jason Duval & Lucia Caminos (eSpriteDrawOrder_Pedestrian / JumpingPedestrian)
        // GTA 2 (1999) fuller top-down 3D pedestrian presence (pedScale = 1.34 so peds stay crisp & readable even when zoomed out!) + RemapPed outfit variety!
        const pedScale = 1.34;
        const pedRemapTints = [
            [1.00, 1.00, 1.00], // Classic Original
            [0.86, 1.04, 1.12], // Vice Pastel Cyan
            [1.10, 0.88, 0.96], // Flamingo Rose
            [1.08, 1.02, 0.82], // Sunburst Linen
            [0.88, 1.08, 0.92], // Ocean Mint
            [0.96, 0.90, 1.12], // Lavender Neon
            [1.10, 0.94, 0.84], // Coral Peach
            [0.90, 0.98, 1.10]  // Biscayne Blue
        ];
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

            // Solar-tracked pedestrian ground drop shadow (live_geometry.cpp + time_of_day.cpp)
            if (nfGlobal < 0.88) {
                this.pushSolidQuad3D(ped.x + sunCos * 3.4, ped.y + sunSin * 3.4, pz - 0.022, 10.5, 8.2, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
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
                const copWeapon = (game.wantedLevel || 0) > 0 ? "PISTOL" : "FIST";
                frameIdx = this.getPedFrameIndex(copWeapon, ped.speed > 0, (game.wantedLevel || 0) > 0, walkPhase);
            } else if (ped.kind === "HOSTILE") {
                const walkPhase = this.time * 2.2 + ped.animSeed;
                frameIdx = this.getPedFrameIndex("FIST", true, true, walkPhase);
            } else {
                const isRunning = (ped.panicTimer || 0) > 0 || (ped.burnTimer || 0) > 0;
                const walkPhase = this.time * (isRunning ? 2.4 : 1.5) + ped.animSeed;
                frameIdx = this.getPedFrameIndex("FIST", ped.speed > 0, isRunning, walkPhase);
            }

            let pr = 1.0, pg = 1.0, pb = 1.0;
            if (pedType.startsWith("civ")) {
                const remapIdx = Math.abs(Math.floor(ped.animSeed * 997)) % pedRemapTints.length;
                const rt = pedRemapTints[remapIdx];
                pr = rt[0];
                pg = rt[1];
                pb = rt[2];
            }

            this.batchPedSprite3D(pedType, frameIdx, ped.x, ped.y, pz, ped.angle, pedScale, false, pedDrawOrder, pr, pg, pb);

            // GTA 2 kSynthCigarette (synthetic_lights.cpp): ~25% of calm civilian pedestrians smoke a glowing cigarette ember after dusk!
            if (nfGlobal > 0.32 && (ped.panicTimer || 0) <= 0 && (Math.abs(Math.floor(ped.animSeed * 1000)) % 4 === 0)) {
                const cigX = ped.x + Math.cos(ped.angle + 0.55) * 5.6;
                const cigY = ped.y + Math.sin(ped.angle + 0.55) * 5.6;
                const dragGlow = 0.65 + 0.35 * Math.max(0, Math.sin(this.time * 2.2 + ped.animSeed * 30));
                this.pushSolidQuad3D(cigX, cigY, pz + 0.015, 1.9, 1.9, 0, 1.0, 0.26 * dragGlow, 0.06, 0.95 * nfGlobal, SPRITE_DRAW_ORDER.HUD_ARROW);
            }

            // 1997 GTA 1 Pedestrian::SetBurnEffectActive — attach .G24 fire sprite (234..241) on burning peds!
            if ((ped.burnTimer || 0) > 0) {
                const fireFrame = 234 + (Math.floor(this.time * 14 + ped.animSeed * 10) % 8);
                this.batchObjectSprite3D(String(fireFrame), ped.x, ped.y, pz + 0.025, 0, 0.78, SPRITE_DRAW_ORDER.EXPLOSION);
            }
        }

        const jason = game.jason;
        if (jason && !jason.inVehicle) {
            const jz = this.getEntityZ(jason, 0.045);
            if (nfGlobal < 0.88) {
                this.pushSolidQuad3D(jason.x + sunCos * 3.5, jason.y + sunSin * 3.5, jz - 0.022, 11.0, 8.6, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
            const jWeapon = jason.weaponKey || "FIST";
            const frameIdx = this.getPedFrameIndex(jWeapon, Boolean(jason.isMoving), Boolean(jason.isRunning), jason.walkPhase || 0);
            this.batchPedSprite3D(
                "jason",
                frameIdx,
                jason.x,
                jason.y,
                jz,
                jason.angle,
                pedScale * 1.10,
                (jason.muzzleTimer || 0) > 0,
                SPRITE_DRAW_ORDER.PEDESTRIAN
            );
        }

        const p = game.player;
        if (!p.inVehicle) {
            const baseZ = this.getEntityZ(p, 0.05);
            const jumpZ = p.jumpZOffset || 0;
            const isJumpingOrSliding = jumpZ > 0.02 || (p.slideCarTimer || 0) > 0;
            // Solar-tracked shadow under Lucia (separates further when jumping!)
            const pShOff = 3.6 + jumpZ * 16.0;
            this.pushSolidQuad3D(p.x + sunCos * pShOff, p.y + sunSin * pShOff, baseZ - 0.022, 11.8, 9.2, sunShadowAngle, 0.03, 0.04, 0.08, Math.max(0.22, sunShadowAlpha), SPRITE_DRAW_ORDER.TIRE_MARKS);

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
                // Only draw weapon on Lucia's sprite while actively firing or briefly after firing; otherwise keep holstered ("FIST")!
                const isAimingOrFiring = Boolean(
                    p.weapon &&
                    p.weapon !== "FIST" &&
                    (game.input.shoot || (p.weaponDrawnTimer || 0) > 0 || (p.muzzleTimer || 0) > 0)
                );
                const visualWeapon = isAimingOrFiring ? p.weapon : "FIST";
                frameIdx = this.getPedFrameIndex(
                    visualWeapon,
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
                pedScale * 1.15,
                (p.muzzleTimer || 0) > 0,
                isJumpingOrSliding ? SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN : SPRITE_DRAW_ORDER.PEDESTRIAN
            );
        }

        // 5. Authentic STYLE001.G24 Vehicles (1:1 1997 GTA 1 scale = 1.0 + Delta Doors & Crash Dents! — eSpriteDrawOrder_Car)
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
            const cosA = Math.cos(v.angle);
            const sinA = Math.sin(v.angle);

            // A. GTA 2 live_geometry.cpp: Dual-Layer Under-Chassis Contact Shadow + Solar-Tracked 3D Drop Shadow under EVERY vehicle!
            if (airZ < 0.05) {
                this.pushSolidQuad3D(
                    v.x,
                    v.y,
                    vz - 0.022,
                    (v.w || 48) * 0.94,
                    (v.h || 24) * 0.92,
                    v.angle,
                    0.02,
                    0.03,
                    0.06,
                    0.36,
                    SPRITE_DRAW_ORDER.TIRE_MARKS
                );
            }
            const shOff = 4.6 + airZ * 22.0;
            this.pushSolidQuad3D(
                v.x + sunCos * shOff,
                v.y + sunSin * shOff,
                vz - 0.026,
                (v.w || 48) * 0.90,
                (v.h || 24) * 0.88,
                v.angle,
                0.03,
                0.04,
                0.08,
                airZ > 0.05 ? 0.52 : Math.max(0.28, sunShadowAlpha * 1.18),
                SPRITE_DRAW_ORDER.TIRE_MARKS
            );

            // B. GTA 2 live_geometry.cpp SetSpriteConform (kSmoothing = 0.25f): 4-Corner Ground Slope Pitch + Wheelie/Stunt Pitch!
            const hFront = this.map.getHeightAtPixel(v.x + cosA * 20, v.y + sinA * 20, vz);
            const hRear = this.map.getHeightAtPixel(v.x - cosA * 20, v.y - sinA * 20, vz);
            const rawSlopePitch = Math.max(-0.22, Math.min(0.22, (hFront - hRear) * 0.45));
            v._conformPitch = (v._conformPitch || 0) * 0.75 + rawSlopePitch * 0.25;
            const wheeliePitch = (v.wheelieTimer || 0) > 0 ? 0.14 : 0;
            const stuntPitch = (v.stuntAirTimer || 0) > 0
                ? (((v.stuntAirTimer / (v.stuntMaxTime || 1.15)) - 0.5) * 0.24)
                : 0;
            const totalPitchZ = v._conformPitch + wheeliePitch + stuntPitch;

            // Car body sprite with GTA 2 live rotation-aware solar clearcoat specular sheen!
            const carSunSpec = v.destroyed ? 1.0 : (1.0 + 0.065 * Math.cos(v.angle - sunShadowAngle) * (1.0 - nfGlobal * 0.72));
            this.pushAtlasSprite3D(rect, v.x, v.y, vz + airZ, rot, vScale, vDrawOrder, carSunSpec, carSunSpec, carSunSpec, 1, totalPitchZ);

            // C. GTA 2 OwnCarLamps & kSynthBrake (live_geometry.cpp / synthetic_lights.cpp):
            // Physical Front Headlight Glass Lenses + Day/Night Rear Taillights, Brake Lamps & Reverse Lamps!
            if (!v.destroyed && !mapInfo.isTank) {
                const frontDist = (v.w || 48) * 0.45;
                const rearDist = -(v.w || 48) * 0.45;
                const latSpread = mapInfo.isMotorcycle ? 0 : ((v.h || 24) * 0.29);
                const lampOffsets = mapInfo.isMotorcycle ? [0] : [-latSpread, latSpread];
                const isDriven = Boolean(v.driver);
                const isBraking = isDriven && (
                    (v.driver === "PLAYER" && (game.input.down || game.input.handbrake)) ||
                    v.aiState === "STOPPED_LIGHT" ||
                    (v.driver !== "PLAYER" && Math.abs(v.speed || 0) < 18)
                );
                const isReversing = isDriven && (v.speed || 0) < -10;

                for (const lat of lampOffsets) {
                    // 1) Front Headlight Lenses (bright xenon-white when driven at dusk/night, crisp silver-blue glass housing by day)
                    const fx = v.x + cosA * frontDist - sinA * lat;
                    const fy = v.y + sinA * frontDist + cosA * lat;
                    if (isDriven && nfGlobal > 0.15) {
                        this.pushSolidQuad3D(fx, fy, vz + airZ + totalPitchZ + 0.012, 3.0, 2.5, v.angle, 1.0, 0.98, 0.88, 0.96, SPRITE_DRAW_ORDER.CAR_ROOF);
                    } else {
                        this.pushSolidQuad3D(fx, fy, vz + airZ + totalPitchZ + 0.012, 2.4, 2.1, v.angle, 0.82, 0.91, 0.98, 0.82, SPRITE_DRAW_ORDER.CAR_ROOF);
                    }

                    // 2) Rear Taillight / Brake / Reverse Lenses
                    const rx = v.x + cosA * rearDist - sinA * lat;
                    const ry = v.y + sinA * rearDist + cosA * lat;
                    if (isReversing) {
                        this.pushSolidQuad3D(rx, ry, vz + airZ - totalPitchZ + 0.012, 3.2, 2.4, v.angle, 0.95, 0.98, 1.0, 0.96, SPRITE_DRAW_ORDER.CAR_ROOF);
                    } else if (isBraking || (isDriven && nfGlobal > 0.15)) {
                        this.pushSolidQuad3D(rx, ry, vz + airZ - totalPitchZ + 0.012, 3.4, 2.6, v.angle, 1.0, 0.08, 0.14, 0.96, SPRITE_DRAW_ORDER.CAR_ROOF);
                    } else {
                        // Unlit dark ruby taillight housing by day / when parked
                        this.pushSolidQuad3D(rx, ry, vz + airZ - totalPitchZ + 0.012, 2.5, 2.1, v.angle, 0.58, 0.07, 0.11, 0.85, SPRITE_DRAW_ORDER.CAR_ROOF);
                    }
                }
            }

            // Authentic 1997 GTA 1 Motorcycle Riders (frame 84 = sitting_on_bike, 80..83 = enter_bike) & Convertible Drivers (frame 97 = sitting_in_car)
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

            // Siren Overlays (eSpriteDrawOrder_CarRoof) — only when driven & siren active
            if (!v.destroyed && v.driver && v.isEmergency && v.sirenActive && sirens.length > 0) {
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
                const isNightGlow = (this.nightFactor || 0) > 0.18;
                for (let pi = 0; pi < this.map.vicePalms.length; pi++) {
                    const pm = this.map.vicePalms[pi];
                    if (pm.x < minX || pm.x > maxX || pm.y < minY || pm.y > maxY) continue;
                    const baseZ = (pm.z !== undefined ? pm.z : 2.0);
                    // Ocean Drive & Star Island Neon Palm Trunk Uplight Ring at ground level!
                    if (isNightGlow && pm.x >= 165 * TILE_SIZE && pm.x <= 222 * TILE_SIZE) {
                        const isPink = (pi % 2) === 0;
                        this.pushSolidQuad3D(
                            pm.x,
                            pm.y,
                            baseZ + 0.025,
                            11,
                            11,
                            0,
                            isPink ? 1.0 : 0.05,
                            isPink ? 0.22 : 0.92,
                            isPink ? 0.68 : 1.0,
                            0.75 * (this.nightFactor || 1.0),
                            SPRITE_DRAW_ORDER.MAP_OBJECT
                        );
                    }
                    const pz = this.getEntityZ(pm, 0.15);
                    this.batchObjectSprite3D(palmSpr, pm.x, pm.y, pz, pm.angle || 0, pm.scale || 1.0, SPRITE_DRAW_ORDER.TREES);
                }
            }

            // 7B. Deep-Dive Vice City Architectural Streetscape Props (Ocean Drive Café Terraces, Lummus Serpentine Wall & Española Bistro Lights)
            if (Array.isArray(this.map.viceStreetDetails)) {
                for (const vd of this.map.viceStreetDetails) {
                    if (vd.x < minX || vd.x > maxX || vd.y < minY || vd.y > maxY) continue;
                    const vz = (vd.z !== undefined ? vd.z : 2.0);
                    if (vd.kind === "CAFE_TABLE") {
                        // White Art Deco table + twin chairs on the Ocean Drive sidewalk + 3D elevated pastel parasol
                        this.pushSolidQuad3D(vd.x - 6, vd.y, vz + 0.03, 4.5, 4.5, 0, 0.92, 0.95, 0.98, 0.95, SPRITE_DRAW_ORDER.MAP_OBJECT);
                        this.pushSolidQuad3D(vd.x + 6, vd.y, vz + 0.03, 4.5, 4.5, 0, 0.92, 0.95, 0.98, 0.95, SPRITE_DRAW_ORDER.MAP_OBJECT);
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.04, 8.5, 8.5, 0.78, 0.98, 0.98, 1.0, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                        const cr = vd.theme === "PINK" ? 1.0 : (vd.theme === "CYAN" ? 0.12 : 1.0);
                        const cg = vd.theme === "PINK" ? 0.32 : (vd.theme === "CYAN" ? 0.88 : 0.85);
                        const cb = vd.theme === "PINK" ? 0.68 : (vd.theme === "CYAN" ? 0.96 : 0.22);
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.15, 13, 13, 0.35, cr, cg, cb, 0.96, SPRITE_DRAW_ORDER.TREES);
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.16, 5, 5, 0.35, 1.0, 1.0, 1.0, 0.98, SPRITE_DRAW_ORDER.TREES);
                    } else if (vd.kind === "SERPENTINE_WALL") {
                        // Iconic Lummus Park / South Beach white-stucco & pastel-neon serpentine low beach wall
                        this.pushSolidQuad3D(vd.x + 2, vd.y + 2, vz + 0.02, 8, 52, 0, 0.05, 0.08, 0.14, 0.35, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.05, 7.5, 50, 0, 0.96, 0.94, 0.92, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                        const isPink = vd.theme === "PINK";
                        this.pushSolidQuad3D(
                            vd.x,
                            vd.y,
                            vz + 0.09,
                            4.2,
                            46,
                            0,
                            isPink ? 1.0 : 0.08,
                            isPink ? 0.28 : 0.92,
                            isPink ? 0.68 : 0.98,
                            0.95,
                            SPRITE_DRAW_ORDER.MAP_OBJECT
                        );
                    } else if (vd.kind === "BISTRO_STRING") {
                        // Española Way overhead Mediterranean festive light cable & glowing bulbs
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.50, 58, 1.8, 0, 0.18, 0.22, 0.28, 0.85, SPRITE_DRAW_ORDER.TREES);
                        for (let bi = -2; bi <= 2; bi++) {
                            const bx = vd.x + bi * 11;
                            const isPink = ((bi + 2) % 2 === 0) && vd.theme === "PINK";
                            this.pushSolidQuad3D(
                                bx,
                                vd.y,
                                vz + 0.51,
                                4.2,
                                4.2,
                                0,
                                1.0,
                                isPink ? 0.42 : 0.84,
                                isPink ? 0.76 : 0.42,
                                0.96,
                                SPRITE_DRAW_ORDER.TREES
                            );
                        }
                    }
                }
            }
        } else if (this.map.trees) {
            for (const tr of this.map.trees) {
                if (tr.x < minX || tr.x > maxX || tr.y < minY || tr.y > maxY) continue;
                this.batchObjectSprite3D("257", tr.x, tr.y, this.getEntityZ(tr, 0.12), 0, (tr.scale || 1.0), SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 7C. GTA 2 Style 3D Curb Streetlamps (Rising 3D Perspective Pole + Overhanging Cantilever Arm + Luminaire Head)
        if (this.map && Array.isArray(this.map.streetlights)) {
            const nf = nfGlobal;
            const lightsOn = nf > 0.12;
            for (const sl of this.map.streetlights) {
                if (sl.baseX < minX || sl.baseX > maxX || sl.baseY < minY || sl.baseY > maxY) continue;
                const sz = sl.z || 2.0;
                const midX = (sl.baseX + sl.headX) * 0.5;
                const midY = (sl.baseY + sl.headY) * 0.5;
                const armLen = Math.max(8, Math.hypot(sl.headX - sl.baseX, sl.headY - sl.baseY) + 3);

                // 1. Daytime solar-tracked ground shadow on the sidewalk (rotates & lengthens with the 24h sun!)
                if (nf < 0.85) {
                    const shX = sl.baseX + Math.cos(sunShadowAngle) * (sunShadowLen * 0.5);
                    const shY = sl.baseY + Math.sin(sunShadowAngle) * (sunShadowLen * 0.5);
                    this.pushSolidQuad3D(shX, shY, sz + 0.018, sunShadowLen, 2.5, sunShadowAngle, 0.04, 0.06, 0.10, 0.34 * (1.0 - nf * 0.8), SPRITE_DRAW_ORDER.TIRE_MARKS);
                }

                // 2. Curb Base Pedestal (z = sz + 0.03)
                const isDeco = sl.style === "ART_DECO_NEON" || sl.style === "PROMENADE_TWIN";
                const pr = isDeco ? 0.76 : 0.46;
                const pg = isDeco ? 0.82 : 0.52;
                const pb = isDeco ? 0.90 : 0.60;
                this.pushSolidQuad3D(sl.baseX, sl.baseY, sz + 0.03, 6.2, 6.2, 0, pr * 0.72, pg * 0.72, pb * 0.72, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);

                // 3. 3D Rising Vertical Pole Segments (true 3D perspective parallax from sz+0.14 to sz+0.50!)
                this.pushSolidQuad3D(sl.baseX, sl.baseY, sz + 0.15, 3.8, 3.8, 0, pr, pg, pb, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(sl.baseX, sl.baseY, sz + 0.28, 3.4, 3.4, 0, pr, pg, pb, 0.98, SPRITE_DRAW_ORDER.TREES);

                // Warm golden-yellow ring on upper pole shaft for boulevard lamps
                if (isDeco) {
                    this.pushSolidQuad3D(sl.baseX, sl.baseY, sz + 0.40, 4.2, 4.2, 0, 0.96, 0.80, 0.32, 0.98, SPRITE_DRAW_ORDER.TREES);
                } else {
                    this.pushSolidQuad3D(sl.baseX, sl.baseY, sz + 0.40, 3.1, 3.1, 0, pr, pg, pb, 0.98, SPRITE_DRAW_ORDER.TREES);
                }

                // 4. Overhanging Cantilever Arm reaching out over the road (z = sz + 0.53)
                this.pushSolidQuad3D(midX, midY, sz + 0.53, armLen, 2.8, sl.armAngle, pr, pg, pb, 0.98, SPRITE_DRAW_ORDER.TREES);

                // 5. Luminaire Cobra/Deco Hood & Warm Golden-Yellow Lamp Bulb at (headX, headY, sz + 0.55)
                this.pushSolidQuad3D(sl.headX, sl.headY, sz + 0.54, 7.8, 5.2, sl.armAngle, pr * 0.85, pg * 0.85, pb * 0.85, 0.98, SPRITE_DRAW_ORDER.TREES);
                if (lightsOn) {
                    this.pushSolidQuad3D(sl.headX, sl.headY, sz + 0.56, 5.5, 4.2, sl.armAngle, 1.0, 0.88, 0.38, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                } else {
                    this.pushSolidQuad3D(sl.headX, sl.headY, sz + 0.55, 4.5, 3.4, sl.armAngle, 0.95, 0.90, 0.72, 0.92, SPRITE_DRAW_ORDER.TREES);
                }
            }
        }

        // 7D. Authentic Miami / Vice City 3-Lens Traffic Signal Gantries ([ RED | AMBER | GREEN ] overhanging road lanes!)
        if (this.map && Array.isArray(this.map.trafficSignals)) {
            const ph = ((game ? game.trafficLightTimer : this.time) || 0) % 12.0;
            // N/S: 0..5.2 Green (#00FF44), 5.2..6.0 Amber (#FF9900), 6.0..12.0 Red (#FF1E38)
            // E/W: 6.0..11.2 Green (#00FF44), 11.2..12.0 Amber (#FF9900), 0..6.0 Red (#FF1E38)
            const nsState = ph < 5.2 ? "GREEN" : (ph < 6.0 ? "AMBER" : "RED");
            const ewState = (ph >= 6.0 && ph < 11.2) ? "GREEN" : (ph >= 11.2 ? "AMBER" : "RED");
            const nf = Math.max(0, Math.min(1, this.nightFactor || 0));

            for (const ts of this.map.trafficSignals) {
                if (ts.baseX < minX || ts.baseX > maxX || ts.baseY < minY || ts.baseY > maxY) continue;
                const sz = ts.z || 2.0;
                const midX = (ts.baseX + ts.headX) * 0.5;
                const midY = (ts.baseY + ts.headY) * 0.5;
                const armLen = Math.max(18, Math.hypot(ts.headX - ts.baseX, ts.headY - ts.baseY) + 4);
                const st = ts.axis === "NS" ? nsState : ewState;
                const dx = ts.dirX !== undefined ? ts.dirX : Math.cos(ts.armAngle);
                const dy = ts.dirY !== undefined ? ts.dirY : Math.sin(ts.armAngle);

                // 1. Daytime solar ground shadow of the gantry pole & arm
                if (nf < 0.85) {
                    const shX = ts.baseX + Math.cos(sunShadowAngle) * (sunShadowLen * 0.6);
                    const shY = ts.baseY + Math.sin(sunShadowAngle) * (sunShadowLen * 0.6);
                    this.pushSolidQuad3D(shX, shY, sz + 0.018, sunShadowLen * 1.2, 3.0, sunShadowAngle, 0.04, 0.06, 0.10, 0.34 * (1.0 - nf * 0.8), SPRITE_DRAW_ORDER.TIRE_MARKS);
                }

                // 2. Corner Mast Base Pedestal & Rising 3D Vertical Gantry Pole (with yellow pedestrian crosswalk call button!)
                this.pushSolidQuad3D(ts.baseX, ts.baseY, sz + 0.03, 7.6, 7.6, 0, 0.22, 0.25, 0.30, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(ts.baseX, ts.baseY, sz + 0.16, 4.4, 4.4, 0, 0.36, 0.40, 0.46, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ts.baseX, ts.baseY, sz + 0.24, 5.0, 5.0, 0, 0.94, 0.74, 0.14, 0.98, SPRITE_DRAW_ORDER.TREES); // Crosswalk button box
                this.pushSolidQuad3D(ts.baseX, ts.baseY, sz + 0.36, 4.0, 4.0, 0, 0.40, 0.44, 0.50, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ts.baseX, ts.baseY, sz + 0.50, 3.6, 3.6, 0, 0.44, 0.48, 0.55, 0.98, SPRITE_DRAW_ORDER.TREES);

                // 3. Overhanging Horizontal Cantilever Mast Arm reaching out over the road lane
                this.pushSolidQuad3D(midX, midY, sz + 0.57, armLen, 3.6, ts.armAngle, 0.38, 0.42, 0.49, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(midX, midY, sz + 0.58, armLen - 2.0, 1.5, ts.armAngle, 0.22, 0.25, 0.30, 0.98, SPRITE_DRAW_ORDER.TREES);

                // 4. Authentic 3-Lens Miami Traffic Signal Box ([ RED | AMBER | GREEN ])
                // Outer shadow & Florida Highway-Yellow reflective backplate border
                this.pushSolidQuad3D(ts.headX, ts.headY, sz + 0.585, 26.0, 12.2, ts.armAngle, 0.05, 0.06, 0.09, 0.96, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ts.headX, ts.headY, sz + 0.590, 24.4, 10.6, ts.armAngle, 0.96, 0.75, 0.12, 0.99, SPRITE_DRAW_ORDER.TREES);
                // Matte black 3-compartment interior housing + 2 bay divider bars
                this.pushSolidQuad3D(ts.headX, ts.headY, sz + 0.595, 21.4, 8.0, ts.armAngle, 0.08, 0.09, 0.12, 0.99, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ts.headX - dx * 3.4, ts.headY - dy * 3.4, sz + 0.598, 1.1, 7.8, ts.armAngle, 0.22, 0.25, 0.32, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ts.headX + dx * 3.4, ts.headY + dy * 3.4, sz + 0.598, 1.1, 7.8, ts.armAngle, 0.22, 0.25, 0.32, 0.98, SPRITE_DRAW_ORDER.TREES);

                // Positions of the 3 circular signal bays along the housing: Red (+6.8 tip), Amber (0.0 mid), Green (-6.8 inner)
                const redX = ts.headX + dx * 6.8, redY = ts.headY + dy * 6.8;
                const ambX = ts.headX,           ambY = ts.headY;
                const grnX = ts.headX - dx * 6.8, grnY = ts.headY - dy * 6.8;

                // Visor hoods for all 3 lenses
                this.pushSolidQuad3D(redX, redY, sz + 0.600, 5.8, 5.8, ts.armAngle, 0.04, 0.05, 0.07, 0.99, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ambX, ambY, sz + 0.600, 5.8, 5.8, ts.armAngle, 0.04, 0.05, 0.07, 0.99, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(grnX, grnY, sz + 0.600, 5.8, 5.8, ts.armAngle, 0.04, 0.05, 0.07, 0.99, SPRITE_DRAW_ORDER.TREES);

                // Unlit dark tinted glass for all 3 lenses (so all 3 Red / Yellow / Green circles are always visible!)
                this.pushSolidQuad3D(redX, redY, sz + 0.604, 4.4, 4.4, ts.armAngle, 0.32, 0.05, 0.07, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(ambX, ambY, sz + 0.604, 4.4, 4.4, ts.armAngle, 0.32, 0.20, 0.04, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(grnX, grnY, sz + 0.604, 4.4, 4.4, ts.armAngle, 0.04, 0.28, 0.13, 0.98, SPRITE_DRAW_ORDER.TREES);

                // Crisp Active Lens inside its bay (no oversized square halo covering the signal box!)
                if (st === "RED") {
                    this.pushSolidQuad3D(redX, redY, sz + 0.612, 5.2, 5.2, ts.armAngle, 1.0, 0.12, 0.16, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                    this.pushSolidQuad3D(redX, redY, sz + 0.616, 2.6, 2.6, ts.armAngle, 1.0, 0.78, 0.82, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                } else if (st === "AMBER") {
                    this.pushSolidQuad3D(ambX, ambY, sz + 0.612, 5.2, 5.2, ts.armAngle, 1.0, 0.74, 0.05, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                    this.pushSolidQuad3D(ambX, ambY, sz + 0.616, 2.6, 2.6, ts.armAngle, 1.0, 0.96, 0.72, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                } else {
                    this.pushSolidQuad3D(grnX, grnY, sz + 0.612, 5.2, 5.2, ts.armAngle, 0.06, 0.98, 0.38, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                    this.pushSolidQuad3D(grnX, grnY, sz + 0.616, 2.6, 2.6, ts.armAngle, 0.76, 1.0, 0.88, 1.0, SPRITE_DRAW_ORDER.HUD_ARROW);
                }
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
            if (pt.kind === "GIB_ARC") {
                // GTA 2 gibs.cpp (FUN_0048C9C0 / FUN_0048C270): 3D parabolic arc in flight, then settles on the pavement!
                const floorZ = this.map.getHeightAtPixel(pt.x, pt.y, this.camZBlocks);
                if (pt.isRestingGib) {
                    this.batchObjectSprite3D("229", pt.x, pt.y, floorZ + 0.012, pt.rot || 0, 0.78, SPRITE_DRAW_ORDER.CORPSE);
                } else {
                    const arcZ = Math.sin(prog * Math.PI) * (pt.peakZ || 0.35);
                    this.pushSolidQuad3D(pt.x, pt.y, floorZ + 0.01, 4.5, 4.5, 0, 0.04, 0.04, 0.08, 0.38, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    const frameId = 224 + Math.min(5, Math.floor(prog * 6));
                    this.batchObjectSprite3D(String(frameId), pt.x, pt.y, floorZ + 0.04 + arcZ, (pt.rot || 0) + prog * 4.5, 0.85, SPRITE_DRAW_ORDER.PROJECTILES);
                }
                continue;
            }
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
       5A0. DYNAMIC NIGHT LIGHTING ENGINE (Darkness Mask + Conical Headlights +
            Red Taillights + Flashing Police Sirens + Streetlamps & Neon Glows)
       ======================================================================== */
    renderNightLighting(ctx, game) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        if (W <= 0 || H <= 0) return;

        const scale = 0.5;
        const lw = Math.max(1, Math.floor(W * scale));
        const lh = Math.max(1, Math.floor(H * scale));
        if (!this.nightCanvas) {
            this.nightCanvas = document.createElement("canvas");
        }
        if (this.nightCanvas.width !== lw || this.nightCanvas.height !== lh) {
            this.nightCanvas.width = lw;
            this.nightCanvas.height = lh;
        }
        const lctx = this.nightCanvas.getContext("2d");

        const nf = Math.max(0, Math.min(1, this.nightFactor !== undefined ? this.nightFactor : (this.nightMode ? 1.0 : 0.0)));
        const sf = Math.max(0, Math.min(1, this.sunsetFactor || 0.0));
        // Artificial lights (streetlamps, neon signs, headlights) fade on smoothly as dusk deepens (nf > 0.12)
        const lightInt = Math.max(0, Math.min(1, (nf - 0.10) / 0.55));

        // 1. Fill offscreen lightmap with smooth Day (255,255,255) -> Golden-Pink Sunset -> Deep Midnight Darkness (34,44,76)
        const ambR = Math.round(Math.max(24, Math.min(255, 255 * (1.0 - nf) + 34 * nf - sf * 10 * (1.0 - nf))));
        const ambG = Math.round(Math.max(30, Math.min(255, 255 * (1.0 - nf) + 44 * nf - sf * 52 * (1.0 - nf * 0.5))));
        const ambB = Math.round(Math.max(52, Math.min(255, 255 * (1.0 - nf) + 76 * nf - sf * 24 * (1.0 - nf * 0.5))));

        lctx.save();
        lctx.globalCompositeOperation = "source-over";
        lctx.fillStyle = `rgb(${ambR}, ${ambG}, ${ambB})`;
        lctx.fillRect(0, 0, lw, lh);

        // Switch to additive light accumulation on the lightmap
        lctx.globalCompositeOperation = "lighter";
        lctx.globalAlpha = lightInt;

        const addLightPool = (sx, sy, radPx, innerCol, midCol) => {
            const x = sx * scale;
            const y = sy * scale;
            const r = Math.max(4, radPx * scale);
            if (x + r < 0 || x - r > lw || y + r < 0 || y - r > lh) return;
            const g = lctx.createRadialGradient(x, y, r * 0.05, x, y, r);
            g.addColorStop(0.0, innerCol);
            g.addColorStop(0.48, midCol);
            g.addColorStop(1.0, "rgba(0, 0, 0, 0)");
            lctx.fillStyle = g;
            lctx.beginPath();
            lctx.arc(x, y, r, 0, Math.PI * 2);
            lctx.fill();
        };

        const addHeadlightCone = (sx, sy, angle, lenPx, spreadRad, baseHalfWPx, innerCol, midCol) => {
            const x0 = sx * scale;
            const y0 = sy * scale;
            const len = Math.max(12, lenPx * scale);
            const bw = Math.max(1.5, (baseHalfWPx || 2.0) * scale);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const nx = -sinA;
            const ny = cosA;
            const x1 = x0 + cosA * len;
            const y1 = y0 + sinA * len;

            const g = lctx.createLinearGradient(x0, y0, x1, y1);
            g.addColorStop(0.0, innerCol);
            g.addColorStop(0.45, midCol);
            g.addColorStop(1.0, "rgba(0, 0, 0, 0)");
            lctx.fillStyle = g;

            // Draw 3 feathered wide-base trapezoidal fan layers so the beam starts wide across both headlights and has soft side edges
            const layers = [
                { sp: spreadRad * 1.14, wMult: 1.12, alpha: 0.34 },
                { sp: spreadRad * 0.90, wMult: 1.00, alpha: 0.44 },
                { sp: spreadRad * 0.60, wMult: 0.76, alpha: 0.38 }
            ];
            const prevAlpha = lctx.globalAlpha;
            for (const ly of layers) {
                const w = bw * ly.wMult;
                lctx.globalAlpha = prevAlpha * ly.alpha;
                lctx.beginPath();
                lctx.moveTo(x0 - nx * w, y0 - ny * w);
                lctx.arc(x0, y0, len, angle - ly.sp, angle + ly.sp);
                lctx.lineTo(x0 + nx * w, y0 + ny * w);
                lctx.closePath();
                lctx.fill();
            }
            lctx.globalAlpha = prevAlpha;
        };

        // Collect crisp flares (streetlamp bulbs, dual headlight bulbs, red taillights) for the high-res pass
        const highResFlares = [];
        const highResCones = [];

        // 2. GTA 2 Style 3D Curb Streetlamps, Ocean Drive Neon Palms & Española Bistro Lights!
        if (this.map && Array.isArray(this.map.streetlights)) {
            for (const sl of this.map.streetlights) {
                if (Math.abs(sl.headX - this.camX) > 920 || Math.abs(sl.headY - this.camY) > 680) continue;
                const sz = sl.z || 2.0;
                // Ground light pool projected on the street directly beneath the overhanging luminaire head
                const gSc = this.worldToScreen(sl.headX, sl.headY, sz + 0.04);
                if (gSc.x < -160 || gSc.x > W + 160 || gSc.y < -160 || gSc.y > H + 160) continue;
                const pxScale = (gSc.scale * H) / 128.0;

                // Elevated 3D lamp head position for the GTA 2 warm golden-yellow 4-point star corona flare
                const hSc = this.worldToScreen(sl.headX, sl.headY, sz + 0.56);

                if (sl.colorType === "SODIUM") {
                    addLightPool(gSc.x, gSc.y, 74 * pxScale, "rgba(255, 190, 75, 0.88)", "rgba(225, 130, 25, 0.36)");
                    highResFlares.push({ x: hSc.x, y: hSc.y, r: 9.5 * pxScale, col: "rgba(255, 205, 95, 0.84)", isStar: true });
                } else {
                    addLightPool(gSc.x, gSc.y, 76 * pxScale, "rgba(255, 212, 92, 0.90)", "rgba(235, 160, 40, 0.38)");
                    highResFlares.push({ x: hSc.x, y: hSc.y, r: 10.0 * pxScale, col: "rgba(255, 225, 118, 0.85)", isStar: true });
                }
            }
        }

        // 2B. Ocean Drive Serpentine Neon Wall & Española Way Bistro Light Strings
        if (this.map && Array.isArray(this.map.viceStreetDetails)) {
            for (const vd of this.map.viceStreetDetails) {
                if (vd.kind === "CAFE_TABLE") continue;
                if (Math.abs(vd.x - this.camX) > 860 || Math.abs(vd.y - this.camY) > 640) continue;
                const sc = this.worldToScreen(vd.x, vd.y, (vd.z || 2.0) + (vd.kind === "BISTRO_STRING" ? 0.50 : 0.08));
                if (sc.x < -120 || sc.x > W + 120 || sc.y < -120 || sc.y > H + 120) continue;
                const pxScale = (sc.scale * H) / 128.0;
                if (vd.kind === "BISTRO_STRING") {
                    addLightPool(sc.x, sc.y, 64 * pxScale, "rgba(255, 195, 120, 0.82)", "rgba(235, 110, 150, 0.32)");
                    highResFlares.push({ x: sc.x, y: sc.y, r: 9 * pxScale, col: "rgba(255, 215, 145, 0.78)", isStar: true });
                } else if (vd.kind === "SERPENTINE_WALL") {
                    const isPink = vd.theme === "PINK";
                    addLightPool(
                        sc.x,
                        sc.y,
                        42 * pxScale,
                        isPink ? "rgba(255, 65, 175, 0.62)" : "rgba(35, 230, 255, 0.60)",
                        isPink ? "rgba(195, 25, 120, 0.22)" : "rgba(10, 145, 210, 0.22)"
                    );
                }
            }
        }

        // 2C. GTA 2 Junction Traffic Lights: subtle local lens visibility in night darkness (NO streetlamp star flare or giant pool!)
        if (this.map && Array.isArray(this.map.trafficSignals)) {
            const ph = ((game ? game.trafficLightTimer : this.time) || 0) % 12.0;
            const nsState = ph < 5.2 ? "GREEN" : (ph < 6.0 ? "AMBER" : "RED");
            const ewState = (ph >= 6.0 && ph < 11.2) ? "GREEN" : (ph >= 11.2 ? "AMBER" : "RED");
            for (const ts of this.map.trafficSignals) {
                if (Math.abs(ts.headX - this.camX) > 880 || Math.abs(ts.headY - this.camY) > 640) continue;
                const sz = ts.z || 2.0;
                const st = ts.axis === "NS" ? nsState : ewState;
                const dx = ts.dirX !== undefined ? ts.dirX : Math.cos(ts.armAngle);
                const dy = ts.dirY !== undefined ? ts.dirY : Math.sin(ts.armAngle);
                const lensOff = st === "RED" ? 6.8 : (st === "AMBER" ? 0.0 : -6.8);
                const lx = ts.headX + dx * lensOff;
                const ly = ts.headY + dy * lensOff;
                const hSc = this.worldToScreen(lx, ly, sz + 0.61);
                if (hSc.x < -140 || hSc.x > W + 140 || hSc.y < -140 || hSc.y > H + 140) continue;
                const pxScale = (hSc.scale * H) / 128.0;
                // Small soft cutout right over the signal housing so the 3-lens box stays sharp at night without shining like a streetlamp
                if (st === "GREEN") {
                    addLightPool(hSc.x, hSc.y, 18 * pxScale, "rgba(40, 255, 115, 0.55)", "rgba(0, 180, 65, 0.14)");
                } else if (st === "AMBER") {
                    addLightPool(hSc.x, hSc.y, 18 * pxScale, "rgba(255, 190, 40, 0.55)", "rgba(215, 110, 0, 0.14)");
                } else {
                    addLightPool(hSc.x, hSc.y, 18 * pxScale, "rgba(255, 50, 75, 0.55)", "rgba(205, 10, 35, 0.14)");
                }
            }
        }

        // 3. Enterable Venue Neon Signs, Pay 'n' Sprays & Ringing Payphones (with GTA 2 LGHT blink/pulse jitter!)
        if (Array.isArray(this.map.interiors)) {
            for (const intr of this.map.interiors) {
                const dz = this.map.getHeightAtPixel(intr.doorX, intr.doorY, 2.0) + 0.12;
                const sc = this.worldToScreen(intr.doorX, intr.doorY, dz);
                if (sc.x < -180 || sc.x > W + 180 || sc.y < -180 || sc.y > H + 180) continue;
                const pxScale = (sc.scale * H) / 128.0;
                const pulse = 0.90 + Math.sin(this.time * 6.0 + intr.doorX * 0.05) * 0.10;
                addLightPool(sc.x, sc.y, 108 * pxScale * pulse, "rgba(255, 65, 185, 0.95)", "rgba(0, 220, 255, 0.42)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 22 * pxScale * pulse, col: "rgba(255, 80, 190, 0.62)", isStar: true });
            }
        }
        if (Array.isArray(this.map.payNSprays)) {
            for (const pns of this.map.payNSprays) {
                const cx = pns.x + pns.w * 0.5;
                const cy = pns.y + pns.h * 0.5;
                const sc = this.worldToScreen(cx, cy, 2.1);
                if (sc.x < -140 || sc.x > W + 140 || sc.y < -140 || sc.y > H + 140) continue;
                const pxScale = (sc.scale * H) / 128.0;
                addLightPool(sc.x, sc.y, 82 * pxScale, "rgba(57, 255, 20, 0.85)", "rgba(16, 185, 129, 0.34)");
            }
        }
        if (game.missions && Array.isArray(game.missions.payphones)) {
            for (const ph of game.missions.payphones) {
                if (ph.completed) continue;
                const sc = this.worldToScreen(ph.x, ph.y, this.getEntityZ(ph, 0.08));
                if (sc.x < -80 || sc.x > W + 80 || sc.y < -80 || sc.y > H + 80) continue;
                const pxScale = (sc.scale * H) / 128.0;
                addLightPool(sc.x, sc.y, 42 * pxScale, "rgba(80, 255, 120, 0.80)", "rgba(20, 180, 90, 0.28)");
            }
        }

        // 4. Lucia & Jason Subtle Visibility Halo (plus Muzzle Flash light when firing!)
        const p = game.player;
        if (p && !p.dead) {
            const pSc = this.worldToScreen(p.x, p.y, this.getEntityZ(p, 0.08));
            const pScale = (pSc.scale * H) / 128.0;
            addLightPool(pSc.x, pSc.y, 76 * pScale, "rgba(175, 198, 245, 0.65)", "rgba(95, 125, 190, 0.25)");
            if ((p.muzzleTimer || 0) > 0) {
                const mx = p.x + Math.cos(p.angle) * 14;
                const my = p.y + Math.sin(p.angle) * 14;
                const mSc = this.worldToScreen(mx, my, this.getEntityZ(p, 0.12));
                addLightPool(mSc.x, mSc.y, 115 * pScale, "rgba(255, 220, 110, 1.0)", "rgba(255, 130, 30, 0.55)");
                highResFlares.push({ x: mSc.x, y: mSc.y, r: 18 * pScale, col: "rgba(255, 230, 120, 0.90)" });
            }
        }
        if (game.jason && !game.jason.inVehicle) {
            const jSc = this.worldToScreen(game.jason.x, game.jason.y, this.getEntityZ(game.jason, 0.08));
            const jScale = (jSc.scale * H) / 128.0;
            addLightPool(jSc.x, jSc.y, 54 * jScale, "rgba(155, 185, 235, 0.48)", "rgba(80, 110, 175, 0.18)");
            if ((game.jason.muzzleTimer || 0) > 0) {
                addLightPool(jSc.x, jSc.y, 105 * jScale, "rgba(255, 215, 100, 0.95)", "rgba(255, 125, 25, 0.50)");
            }
        }

        // 5. Vehicle Conical Headlights, Red Taillights & Flashing Police/Emergency Sirens!
        for (const v of game.vehicles) {
            const vz = this.getEntityZ(v, 0.08) + (v.stuntZOffset || 0);
            const sc = this.worldToScreen(v.x, v.y, vz);
            if (sc.x < -260 || sc.x > W + 260 || sc.y < -260 || sc.y > H + 260) continue;
            const pxScale = (sc.scale * H) / 128.0;

            if (v.destroyed || (v.burnTimer || 0) > 0) {
                const flick = 0.88 + Math.sin(this.time * 22 + v.x) * 0.12;
                addLightPool(sc.x, sc.y, 110 * pxScale * flick, "rgba(255, 165, 50, 0.95)", "rgba(235, 65, 15, 0.45)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 26 * pxScale, col: "rgba(255, 140, 35, 0.65)" });
                continue;
            }

            // Parked vehicles (v.driver === null) never have their headlights or taillights turned on!
            const hasHeadlights = Boolean(v.driver);
            if (!hasHeadlights) continue;

            const cosA = Math.cos(v.angle);
            const sinA = Math.sin(v.angle);
            const frontDist = (v.w || 48) * 0.46;
            const rearDist = -(v.w || 48) * 0.46;
            const latSpread = v.isMotorcycle ? 0 : ((v.h || 24) * 0.32);
            const beamAng = v.angle + (v.steerAngleRad || 0) * 0.42;

            // Warm ambient glow around the vehicle chassis
            addLightPool(sc.x, sc.y, 38 * pxScale, "rgba(200, 215, 255, 0.42)", "rgba(100, 130, 190, 0.15)");

            // Front Bumper Center in Screen Space
            const fxWorld = v.x + cosA * frontDist;
            const fyWorld = v.y + sinA * frontDist;
            const fSc = this.worldToScreen(fxWorld, fyWorld, vz);

            // Long Wide-Base Headlight Beam (starts across the full width of both headlights for cars/trucks, narrow single bulb for motorcycles!)
            const beamLen = (v.isMotorcycle ? 140 : (v.driver === "PLAYER" ? 185 : 158)) * pxScale;
            const coneSpread = v.isMotorcycle ? 0.22 : 0.32;
            const baseHalfWPx = v.isMotorcycle ? (2.2 * pxScale) : ((latSpread + 3.2) * pxScale);

            addHeadlightCone(
                fSc.x,
                fSc.y,
                beamAng,
                beamLen,
                coneSpread,
                baseHalfWPx,
                "rgba(255, 250, 225, 0.98)",
                "rgba(215, 232, 255, 0.52)"
            );
            highResCones.push({
                x: fSc.x,
                y: fSc.y,
                angle: beamAng,
                len: beamLen * 0.92,
                spread: coneSpread * 0.88,
                baseHalfW: baseHalfWPx,
                col0: "rgba(255, 250, 220, 0.22)",
                col1: "rgba(180, 220, 255, 0.07)"
            });

            // Dual Front Headlight Bulbs (or Single Motorcycle Bulb) + Soft Bumper Halo
            const headOffsets = v.isMotorcycle ? [0] : [-latSpread, latSpread];
            for (const lat of headOffsets) {
                const hx = v.x + cosA * frontDist - sinA * lat;
                const hy = v.y + sinA * frontDist + cosA * lat;
                const hSc = this.worldToScreen(hx, hy, vz);
                addLightPool(hSc.x, hSc.y, (v.isMotorcycle ? 18 : 22) * pxScale, "rgba(255, 250, 225, 0.72)", "rgba(210, 230, 255, 0.24)");
                highResFlares.push({
                    x: hSc.x,
                    y: hSc.y,
                    r: (v.isMotorcycle ? 6.5 : 5.8) * pxScale,
                    col: "rgba(255, 252, 230, 0.95)"
                });
            }

            // Rear Red Taillights / Brake Lights
            const isBraking =
                (v.driver === "PLAYER" && (game.input.down || game.input.handbrake)) ||
                v.aiState === "STOPPED_LIGHT";
            const rxWorld = v.x + cosA * rearDist;
            const ryWorld = v.y + sinA * rearDist;
            const rSc = this.worldToScreen(rxWorld, ryWorld, vz);
            addLightPool(
                rSc.x,
                rSc.y,
                (isBraking ? 34 : 22) * pxScale,
                isBraking ? "rgba(255, 40, 65, 0.88)" : "rgba(235, 30, 55, 0.58)",
                "rgba(180, 15, 35, 0.22)"
            );
            for (const lat of headOffsets) {
                const tx = v.x + cosA * rearDist - sinA * lat;
                const ty = v.y + sinA * rearDist + cosA * lat;
                const tSc = this.worldToScreen(tx, ty, vz);
                highResFlares.push({
                    x: tSc.x,
                    y: tSc.y,
                    r: (isBraking ? 5.5 : 4.2) * pxScale,
                    col: isBraking ? "rgba(255, 45, 70, 0.96)" : "rgba(255, 30, 55, 0.78)"
                });
            }

            // Flashing VCPD Police / Ambulance / Fire Truck Roof Strobe Lights!
            if (v.isEmergency && v.sirenActive) {
                const sPhase = this.time * 15.0 + (v.sirenPhase || 0);
                const redOn = Math.sin(sPhase) >= 0;
                const lOff = -6.0;
                const rOff = 6.0;
                const lx = v.x - sinA * lOff;
                const ly = v.y + cosA * lOff;
                const rx = v.x - sinA * rOff;
                const ry = v.y + cosA * rOff;
                const lSc = this.worldToScreen(lx, ly, vz + 0.04);
                const rScSiren = this.worldToScreen(rx, ry, vz + 0.04);

                if (redOn) {
                    addLightPool(lSc.x, lSc.y, 128 * pxScale, "rgba(255, 35, 75, 0.96)", "rgba(220, 15, 50, 0.42)");
                    highResFlares.push({ x: lSc.x, y: lSc.y, r: 22 * pxScale, col: "rgba(255, 40, 80, 0.85)" });
                } else {
                    addLightPool(rScSiren.x, rScSiren.y, 128 * pxScale, "rgba(30, 165, 255, 0.96)", "rgba(10, 95, 235, 0.42)");
                    highResFlares.push({ x: rScSiren.x, y: rScSiren.y, r: 22 * pxScale, col: "rgba(45, 185, 255, 0.85)" });
                }
            }
        }

        // 6. Synthetic Gameplay Lights (inspired by gta2-rtx-remix synthetic_lights.cpp:
        //    kSynthBullet, kSynthSpark, kSynthFire with per-particle flicker phase, Rockets & Explosions!)
        if (Array.isArray(this.map.streetFires)) {
            for (const sf of this.map.streetFires) {
                const sc = this.worldToScreen(sf.x, sf.y, this.getEntityZ(sf, 0.08));
                if (sc.x < -120 || sc.x > W + 120 || sc.y < -120 || sc.y > H + 120) continue;
                const pxScale = (sc.scale * H) / 128.0;
                const flick = 0.88 + Math.sin(this.time * 18 + sf.x * 0.41 + sf.y * 0.67) * 0.12;
                addLightPool(sc.x, sc.y, 92 * pxScale * flick, "rgba(255, 170, 55, 0.95)", "rgba(235, 75, 20, 0.42)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 18 * pxScale * flick, col: "rgba(255, 150, 40, 0.65)" });
            }
        }
        for (const pr of game.projectiles) {
            const sc = this.worldToScreen(pr.x, pr.y, this.camZBlocks + 0.15);
            if (sc.x < -90 || sc.x > W + 90 || sc.y < -90 || sc.y > H + 90) continue;
            const pxScale = (sc.scale * H) / 128.0;
            if (pr.isFlame || pr.isRocket) {
                addLightPool(sc.x, sc.y, 68 * pxScale, "rgba(255, 185, 65, 0.92)", "rgba(240, 85, 20, 0.40)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 14 * pxScale, col: "rgba(255, 165, 45, 0.78)" });
            } else {
                // kSynthBullet: Fast bullet tracer illumination along its flight path!
                addLightPool(sc.x, sc.y, 26 * pxScale, "rgba(255, 235, 145, 0.75)", "rgba(255, 165, 45, 0.25)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 5.5 * pxScale, col: "rgba(255, 240, 150, 0.88)" });
            }
        }
        for (const pt of game.particles) {
            if (pt.kind !== "EXPLOSION" && pt.kind !== "FIRE" && pt.kind !== "SPARK") continue;
            const sc = this.worldToScreen(pt.x, pt.y, this.camZBlocks + 0.12);
            if (sc.x < -140 || sc.x > W + 140 || sc.y < -140 || sc.y > H + 140) continue;
            const pxScale = (sc.scale * H) / 128.0;
            if (pt.kind === "SPARK") {
                // kSynthSpark: Wall/vehicle scrape & ricochet spark burst light!
                addLightPool(sc.x, sc.y, 34 * pxScale, "rgba(255, 240, 150, 0.85)", "rgba(255, 155, 35, 0.30)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 6.5 * pxScale, col: "rgba(255, 235, 120, 0.90)" });
            } else {
                // kSynthFire: Per-particle phase flicker so clusters of flames never pulse in step!
                const flick = 0.86 + Math.sin(this.time * 24.0 + pt.x * 0.37 + pt.y * 0.73) * 0.14;
                const rad = (pt.kind === "EXPLOSION" ? 135 : 65) * pxScale * flick;
                addLightPool(sc.x, sc.y, rad, "rgba(255, 190, 75, 0.95)", "rgba(240, 80, 20, 0.42)");
            }
        }

        lctx.restore();

        // 7. Composite Pass 1: Multiply Darkness & Light Mask over WebGL 3D Scene
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(this.nightCanvas, 0, 0, W, H);

        // 8. Composite Pass 2: Soft Atmospheric Screen Bloom + High-Res Headlight Beams & Lens Flares
        if (lightInt > 0.02) {
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.28 * nf;
            ctx.drawImage(this.nightCanvas, 0, 0, W, H);

            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = lightInt;

            for (const c of highResCones) {
                const cosA = Math.cos(c.angle);
                const sinA = Math.sin(c.angle);
                const nx = -sinA;
                const ny = cosA;
                const x1 = c.x + cosA * c.len;
                const y1 = c.y + sinA * c.len;
                const bw = Math.max(1.5, c.baseHalfW || 2.0);
                const g = ctx.createLinearGradient(c.x, c.y, x1, y1);
                g.addColorStop(0.0, c.col0);
                g.addColorStop(0.55, c.col1);
                g.addColorStop(1.0, "rgba(0, 0, 0, 0)");
                ctx.fillStyle = g;

                const layers = [
                    { sp: c.spread * 1.12, wMult: 1.08, alpha: 0.35 },
                    { sp: c.spread * 0.86, wMult: 0.96, alpha: 0.42 },
                    { sp: c.spread * 0.56, wMult: 0.72, alpha: 0.35 }
                ];
                for (const ly of layers) {
                    const w = bw * ly.wMult;
                    ctx.globalAlpha = lightInt * ly.alpha;
                    ctx.beginPath();
                    ctx.moveTo(c.x - nx * w, c.y - ny * w);
                    ctx.arc(c.x, c.y, c.len, c.angle - ly.sp, c.angle + ly.sp);
                    ctx.lineTo(c.x + nx * w, c.y + ny * w);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            ctx.globalAlpha = lightInt;

            for (const f of highResFlares) {
                const r = Math.max(2, f.r);
                const g = ctx.createRadialGradient(f.x, f.y, r * 0.1, f.x, f.y, r);
                g.addColorStop(0.0, "#ffffff");
                g.addColorStop(0.35, f.col);
                g.addColorStop(1.0, "rgba(0, 0, 0, 0)");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
                ctx.fill();

                // GTA 2 Signature 4-Point Cross-Star Corona on elevated 3D Streetlamp Bulbs!
                if (f.isStar) {
                    const rayLen = r * 1.65;
                    const rayW = Math.max(1.1, r * 0.16);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
                    ctx.beginPath();
                    ctx.moveTo(f.x - rayLen, f.y);
                    ctx.lineTo(f.x, f.y - rayW);
                    ctx.lineTo(f.x + rayLen, f.y);
                    ctx.lineTo(f.x, f.y + rayW);
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(f.x, f.y - rayLen);
                    ctx.lineTo(f.x + rayW, f.y);
                    ctx.lineTo(f.x, f.y + rayLen);
                    ctx.lineTo(f.x - rayW, f.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        ctx.restore();
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
            "FIST",
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
       5B. 1997 GTA 1 PHYSICS & TIRE KINEMATICS DEBUG RENDERER (Vehicle::DebugDraw)
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
       6. ALL-IN-ONE VICE CITY SMARTPHONE (Live GPS Map + Vice FM Music + iMessage)
       ======================================================================== */
    renderViceCityTourPanel(ctx, game) {
        const px = 12;
        const py = 72;
        const pw = 224;
        const isPlacesApp = !this.cheatsCollapsed;
        const isMinimized = !this.showCheatsWindow;
        const ph = isMinimized ? 44 : 388;

        ctx.save();

        const rrect = (rx, ry, rw, rh, rad) => {
            ctx.beginPath();
            if (typeof ctx.roundRect === "function") {
                ctx.roundRect(rx, ry, rw, rh, rad);
            } else {
                ctx.rect(rx, ry, rw, rh);
            }
        };

        // 1. Physical Side Buttons (Left: Mute + Volume Up/Down, Right: Power Button)
        if (!isMinimized) {
            ctx.fillStyle = "#64748b";
            rrect(px - 2.5, py + 38, 3, 10, 1.5);
            ctx.fill();
            rrect(px - 2.5, py + 56, 3, 20, 1.5);
            ctx.fill();
            rrect(px - 2.5, py + 80, 3, 20, 1.5);
            ctx.fill();
            rrect(px + pw - 0.5, py + 64, 3, 26, 1.5);
            ctx.fill();
        }

        // 2. Outer Brushed Titanium Frame (Vertical Smartphone Chassis)
        rrect(px, py, pw, ph, 22);
        ctx.fillStyle = "#020617";
        ctx.fill();
        ctx.lineWidth = 2.5;
        const frameGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
        frameGrad.addColorStop(0, "#94a3b8");
        frameGrad.addColorStop(0.5, "#475569");
        frameGrad.addColorStop(1, "#64748b");
        ctx.strokeStyle = frameGrad;
        ctx.stroke();

        // 3. Inner OLED Screen Wallpaper
        const sx = px + 5;
        const sy = py + 5;
        const sw = pw - 10; // 214
        const sh = ph - 10; // 378
        rrect(sx, sy, sw, sh, 18);
        const wallGrad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
        wallGrad.addColorStop(0, "#0b1120");
        wallGrad.addColorStop(0.55, "#111329");
        wallGrad.addColorStop(1, "#1b0e28");
        ctx.fillStyle = wallGrad;
        ctx.fill();

        // Clip everything inside the rounded OLED screen
        ctx.save();
        rrect(sx, sy, sw, sh, 18);
        ctx.clip();

        // 4. Top Status Bar: "09:41" Clock + Dynamic Island Notch + Cellular Bars & Battery
        const notchW = 56;
        const notchH = 11;
        const notchX = sx + (sw - notchW) * 0.5;
        const notchY = sy + 4;
        rrect(notchX, notchY, notchW, notchH, 5.5);
        ctx.fillStyle = "#000000";
        ctx.fill();
        // Front camera lens inside Dynamic Island
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(notchX + notchW - 9, notchY + notchH * 0.5, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(notchX + notchW - 9.5, notchY + notchH * 0.5 - 0.5, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Live 24-Hour Clock & Time-of-Day Icon on left of Dynamic Island (Click to advance time phase [N])
        const timeInfo = (game && typeof game.getTimePhaseInfo === "function")
            ? game.getTimePhaseInfo()
            : { icon: "☀️", dockLabel: "☀️ DAY [N]", phase: "DAY" };
        const showColon = (Math.floor(this.time * 2.0) % 2) === 0;
        const liveClockStr = (game && typeof game.getClockString === "function")
            ? game.getClockString(showColon)
            : "16:30";
        const staticClockStr = (game && typeof game.getClockString === "function")
            ? game.getClockString(true)
            : "16:30";

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 9.5px Consolas, 'Courier New', monospace";
        ctx.textBaseline = "middle";
        ctx.fillText(`${timeInfo.icon} ${liveClockStr}`, sx + 8, sy + 10);
        this.cheatButtons.push({ id: "TOGGLE_NIGHT", x: sx + 4, y: sy + 2, w: 68, h: 15 });

        // Cellular Signal Bars + 5G + Battery on right of Dynamic Island
        const sigX = sx + sw - 50;
        const sigY = sy + 12.5;
        ctx.fillStyle = "#f8fafc";
        for (let b = 0; b < 4; b++) {
            const bh = 3 + b * 1.6;
            ctx.fillRect(sigX + b * 3.2, sigY - bh, 2.1, bh);
        }
        ctx.font = "bold 7.5px -apple-system, 'Segoe UI', sans-serif";
        ctx.fillText("5G", sigX + 15, sy + 10);

        // Battery Icon
        const batX = sx + sw - 22;
        const batY = sy + 6.5;
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        rrect(batX, batY, 13, 6.5, 1.5);
        ctx.stroke();
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(batX + 1.5, batY + 1.5, 9, 3.5);
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(batX + 13.5, batY + 2, 1.2, 2.5);

        if (isMinimized) {
            ctx.fillStyle = "#38bdf8";
            ctx.font = "bold 10px -apple-system, 'Segoe UI', sans-serif";
            ctx.fillText("🧭 GPS • 🎵 Music • 💬 SMS [C]", sx + 12, sy + 25);
            this.cheatButtons.push({ id: "UNMINIMIZE_PHONE", x: px, y: py, w: pw, h: ph });
            ctx.restore();
            ctx.restore();
            return;
        }

        // ====================================================================
        // WIDGET 1 (TOP OF PHONE): LIVE GPS MAP OR 16 FAST-TRAVEL PLACES GRID
        // ====================================================================
        const gpsTopY = sy + 18;
        if (!isPlacesApp) {
            this.renderPhoneGpsWidget(ctx, game, sx + 6, gpsTopY, sw - 12, 174, rrect);
        } else {
            // 16 Fast-Travel Landmarks Grid inside the Smartphone
            const hdrH = 19;
            rrect(sx + 6, gpsTopY, sw - 12, hdrH, 5);
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.fill();

            const visitedCount = Array.isArray(this.map.landmarks)
                ? this.map.landmarks.filter((lm) => lm.visited).length
                : 0;
            const totalLm = Array.isArray(this.map.landmarks) ? this.map.landmarks.length : 16;

            ctx.fillStyle = "#38bdf8";
            ctx.font = "bold 9.5px -apple-system, 'Segoe UI', sans-serif";
            ctx.fillText(`📍 Fast Travel • Places (${visitedCount}/${totalLm})`, sx + 12, gpsTopY + 10);

            const drawPhoneAppBtn = (id, label, bx, by, bw, bh = 17, highlight = false, extra = null) => {
                rrect(bx, by, bw, bh, 4);
                ctx.fillStyle = highlight ? "rgba(255, 42, 133, 0.24)" : "rgba(30, 41, 59, 0.92)";
                ctx.fill();
                ctx.strokeStyle = highlight ? "#ff2a85" : "rgba(56, 189, 248, 0.55)";
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = highlight ? "#fde047" : "#f8fafc";
                ctx.font = "bold 8.8px -apple-system, 'Segoe UI', Consolas, sans-serif";
                ctx.fillText(label, bx + 4, by + bh * 0.5 + 0.5);
                this.cheatButtons.push({ id, x: bx, y: by, w: bw, h: bh, ...(extra || {}) });
            };

            const tourPairs = [
                [
                    { id: "VICE_BEACH", label: "🏖️ Vice Beach", hi: true, car: false },
                    { id: "HOTEL_DIXON", label: "🏨 Hotel Dixon", hi: true, car: true }
                ],
                [
                    { id: "ESPANOLA_WAY", label: "🦩 Española", hi: false, car: false },
                    { id: "CLUB_NINE1NINE", label: "💃 Nine1Nine", hi: false, car: true }
                ],
                [
                    { id: "SERA_SPACE", label: "🚀 SERA Space", hi: true, car: false },
                    { id: "STAR_ISLAND", label: "🏛️ Star Island", hi: false, car: false }
                ],
                [
                    { id: "VICE_PORT", label: "🚢 Cruise Port", hi: false, car: false },
                    { id: "MAMBAS_STADIUM", label: "🏟️ Stadium", hi: true, car: false }
                ],
                [
                    { id: "DOWNTOWN_VC", label: "🏙️ Downtown", hi: false, car: false },
                    { id: "JACK_OF_HEARTS", label: "🎨 Wynwood", hi: false, car: true }
                ],
                [
                    { id: "LAKE_LEONIDA", label: "🌊 Lake Leonida", hi: false, car: false },
                    { id: "MOUNT_KALAGA", label: "⛰️ Mt Kalaga", hi: false, car: false }
                ],
                [
                    { id: "PENITENTIARY", label: "🚨 Prison", hi: true, car: false },
                    { id: "PORT_GELLHORN", label: "🏁 Speedway", hi: true, car: true }
                ],
                [
                    { id: "VCIA_AIRPORT", label: "✈️ VCIA Airport", hi: false, car: false },
                    { id: "GRASSRIVERS", label: "🐊 Mud/Keys", hi: false, car: false }
                ]
            ];

            let cy = gpsTopY + hdrH + 3;
            const colW = Math.floor((sw - 16) * 0.5);
            for (const [leftBtn, rightBtn] of tourPairs) {
                drawPhoneAppBtn("TP_LANDMARK", leftBtn.label, sx + 6, cy, colW, 17, leftBtn.hi, {
                    landmarkId: leftBtn.id,
                    enterCar: leftBtn.car
                });
                drawPhoneAppBtn("TP_LANDMARK", rightBtn.label, sx + 10 + colW, cy, colW, 17, rightBtn.hi, {
                    landmarkId: rightBtn.id,
                    enterCar: rightBtn.car
                });
                cy += 19;
            }
        }

        // ====================================================================
        // WIDGET 2 (MIDDLE OF PHONE): BUILT-IN VICE CITY FM MUSIC PLAYER
        // ====================================================================
        const musX = sx + 6;
        const musY = sy + 196;
        const musW = sw - 12;
        const musH = 44;

        rrect(musX, musY, musW, musH, 10);
        ctx.fillStyle = "rgba(19, 25, 46, 0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 42, 133, 0.65)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const isPlaying = game.ytMusicEnabled !== false;
        // Equalizer bars + Radio Station title
        ctx.fillStyle = isPlaying ? "#39ff14" : "#64748b";
        for (let b = 0; b < 4; b++) {
            const eqH = isPlaying
                ? (3 + Math.abs(Math.sin(this.time * 7 + b * 1.4)) * 9)
                : 3;
            ctx.fillRect(musX + 8 + b * 3.5, musY + 15 - eqH, 2.2, eqH);
        }

        ctx.fillStyle = "#00f0ff";
        ctx.font = "bold 9.5px -apple-system, 'Segoe UI', sans-serif";
        ctx.fillText("🎵 VICE CITY FM • RADIO OST", musX + 26, musY + 10.5);

        const volSlider = document.getElementById("yt-vol-slider");
        const curVol = volSlider ? (parseInt(volSlider.value, 10) || 28) : (game.ytVolume || 28);
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 8.5px Consolas, monospace";
        ctx.fillText(`${curVol}%`, musX + musW - 26, musY + 10.5);

        // Music Control Buttons Row inside the widget: [ON/OFF] [NEXT (R)] [VOL -] [VOL +]
        const drawMusBtn = (id, label, bx, by, bw, activeColor = null) => {
            rrect(bx, by, bw, 18, 5);
            ctx.fillStyle = activeColor || "rgba(30, 41, 59, 0.95)";
            ctx.fill();
            ctx.strokeStyle = activeColor ? "#39ff14" : "#38bdf8";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "#f8fafc";
            ctx.font = "bold 8.5px -apple-system, 'Segoe UI', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(label, bx + bw * 0.5, by + 9.5);
            ctx.textAlign = "left";
            this.cheatButtons.push({ id, x: bx, y: by, w: bw, h: 18 });
        };

        const btnY = musY + 21;
        drawMusBtn(
            "PHONE_MUSIC_TOGGLE",
            isPlaying ? "🔊 MUSIC: ON" : "🔇 MUSIC: OFF",
            musX + 6,
            btnY,
            78,
            isPlaying ? "rgba(21, 128, 61, 0.55)" : "rgba(153, 27, 27, 0.55)"
        );
        drawMusBtn("PHONE_MUSIC_SKIP", "⏭ NEXT [R]", musX + 88, btnY, 60);
        drawMusBtn("PHONE_VOL_DOWN", "🔉–", musX + 152, btnY, 22);
        drawMusBtn("PHONE_VOL_UP", "🔊+", musX + 176, btnY, 22);

        // ====================================================================
        // WIDGET 3 (BOTTOM OF PHONE): JASON DUVAL iMESSAGE / SMS CARD
        // ====================================================================
        const smsX = sx + 6;
        const smsY = sy + 244;
        const smsW = sw - 12;
        const smsH = 92;

        rrect(smsX, smsY, smsW, smsH, 10);
        ctx.fillStyle = "rgba(17, 24, 39, 0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Jason Pixel Avatar + Green Online Dot
        const avX = smsX + 6;
        const avY = smsY + 5;
        this.drawPixelPortraitRect(ctx, avX, avY, 20, 20, "JASON");
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(avX + 18, avY + 18, 2.8, 0, Math.PI * 2);
        ctx.fill();

        const senderEl = document.getElementById("pager-sender");
        let contactName = "Jason Duval";
        if (senderEl && senderEl.textContent) {
            const cleaned = senderEl.textContent
                .replace(/📱|📟|SMARTPHONE|PAGER|BIPEUR\s*'97|BIPEUR|\(PARTNER\)/gi, "")
                .replace(/^[\s/]+/, "")
                .trim();
            if (cleaned.toUpperCase().includes("LUCIA")) contactName = "Jason & Lucia";
            else if (cleaned.length > 0 && !cleaned.toUpperCase().includes("JASON")) contactName = cleaned;
        }

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 9.5px -apple-system, 'Segoe UI', sans-serif";
        ctx.fillText(contactName, avX + 25, smsY + 11);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "8px -apple-system, 'Segoe UI', sans-serif";
        ctx.fillText("Online • Messages", avX + 25, smsY + 20);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 8px -apple-system, 'Segoe UI', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${(game && game.lastSmsTimeStr) ? game.lastSmsTimeStr : staticClockStr} ✓✓`, smsX + smsW - 6, smsY + 12);
        ctx.textAlign = "left";

        // Word-wrapped English SMS message body
        const pagerEl = document.getElementById("pager-text");
        const rawMsg = pagerEl
            ? (pagerEl.textContent || "").trim()
            : "Welcome to Vice City! Use the GPS map above or press [M] to fast-travel anywhere.";

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "9.5px -apple-system, 'Segoe UI', sans-serif";
        const maxLineW = smsW - 14;
        const words = rawMsg.split(/\s+/);
        const lines = [];
        let curLine = "";
        for (const w of words) {
            const test = curLine ? `${curLine} ${w}` : w;
            if (ctx.measureText(test).width > maxLineW && curLine) {
                lines.push(curLine);
                curLine = w;
                if (lines.length >= 3) break;
            } else {
                curLine = test;
            }
        }
        if (curLine && lines.length < 4) {
            while (ctx.measureText(curLine).width > maxLineW && curLine.length > 6) {
                curLine = curLine.slice(0, -4) + "…";
            }
            lines.push(curLine);
        }

        let textY = smsY + 35;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], smsX + 7, textY);
            textY += 13.5;
        }

        // ====================================================================
        // 5. BOTTOM SMARTPHONE APP DOCK (🧭 GPS MAP | 📍 PLACES [C] | 🌙 NIGHT)
        // ====================================================================
        const dockY = sy + sh - 32;
        const dockH = 21;
        rrect(sx + 6, dockY, sw - 12, dockH, 7);
        ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
        ctx.fill();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const tabW = Math.floor((sw - 18) / 3);
        const drawDockTab = (id, label, tx, active) => {
            if (active) {
                rrect(tx, dockY + 2, tabW, dockH - 4, 5);
                ctx.fillStyle = "rgba(56, 189, 248, 0.24)";
                ctx.fill();
            }
            ctx.fillStyle = active ? "#38bdf8" : "#cbd5e1";
            ctx.font = "bold 8.5px -apple-system, 'Segoe UI', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(label, tx + tabW * 0.5, dockY + dockH * 0.5 + 0.5);
            ctx.textAlign = "left";
            this.cheatButtons.push({ id, x: tx, y: dockY, w: tabW, h: dockH });
        };

        drawDockTab("PHONE_TAB_MSG", "🧭 GPS MAP", sx + 7, !isPlacesApp);
        drawDockTab("TOGGLE_COLLAPSE", "📍 PLACES [C]", sx + 9 + tabW, isPlacesApp);
        drawDockTab("TOGGLE_NIGHT", timeInfo.dockLabel || "☀️ DAY [N]", sx + 11 + tabW * 2, timeInfo.phase !== "DAY");

        // 6. Bottom iOS White Home Indicator Bar
        rrect(sx + (sw - 58) * 0.5, sy + sh - 6.5, 58, 3.2, 2);
        ctx.fillStyle = "rgba(248, 250, 252, 0.65)";
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }

    renderPhoneGpsWidget(ctx, game, gx, gy, gw, gh, rrect) {
        const useVice = this.mapStyle === "VICE" && this.viceOverviewReady;
        const srcImg = useVice ? this.viceOverviewImg : (this.nycOverviewReady ? this.nycOverviewImg : null);
        if (!srcImg) return;

        const hdrH = 19;
        const ftrH = 19;
        const mx = gx;
        const my = gy + hdrH;
        const mw = gw;
        const mh = gh - hdrH - ftrH; // 136px

        const p = game.player;
        const worldW = this.map.width;
        const worldH = this.map.height;

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

        // 1. GPS Header Bar (District Name + [1x] + [M] Full Map)
        rrect(gx, gy, gw, gh, 8);
        ctx.fillStyle = "rgba(9, 13, 22, 0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = "bold 9px Consolas, 'Courier New', monospace";
        ctx.textBaseline = "middle";
        const distName = (game.currentDistrict || "VICE CITY").toUpperCase();
        ctx.fillStyle = "#00f0ff";
        ctx.fillText(`🧭 ${distName.slice(0, 14)}`, gx + 5, gy + 10);

        const zoomLabels = ["1x", "2x", "ALL"];
        const zBtnW = 28;
        const zBtnX = gx + gw - 62;
        rrect(zBtnX, gy + 2, zBtnW, 15, 3);
        ctx.fillStyle = "rgba(44, 78, 128, 0.95)";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(zoomLabels[zoomMode], zBtnX + 4, gy + 10);
        this.cheatButtons.push({ id: "MINIMAP_ZOOM", x: zBtnX, y: gy + 2, w: zBtnW, h: 15 });

        const mBtnW = 30;
        const mBtnX = gx + gw - 32;
        rrect(mBtnX, gy + 2, mBtnW, 15, 3);
        ctx.fillStyle = "rgba(180, 42, 118, 0.95)";
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("[M]", mBtnX + 5, gy + 10);
        this.cheatButtons.push({ id: "MINIMAP_FULLMAP", x: mBtnX, y: gy + 2, w: mBtnW, h: 15 });

        // 2. Live GPS Map Image inside Smartphone
        ctx.fillStyle = "#07101c";
        ctx.fillRect(mx, my, mw, mh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(srcImg, srcX, srcY, srcW, srcH, mx, my, mw, mh);

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

        ctx.save();
        ctx.beginPath();
        ctx.rect(mx, my, mw, mh);
        ctx.clip();

        const worldToMini = (wx, wy) => ({
            x: mx + ((wx - viewWorldX) / viewWorldW) * mw,
            y: my + ((wy - viewWorldY) / viewWorldH) * mh
        });

        // Pay 'n' Spray Shops
        if (Array.isArray(this.map.payNSprays)) {
            for (const pns of this.map.payNSprays) {
                const pt = worldToMini(pns.x + pns.w * 0.5, pns.y + pns.h * 0.5);
                if (pt.x < mx - 6 || pt.x > mx + mw + 6 || pt.y < my - 6 || pt.y > my + mh + 6) continue;
                ctx.fillStyle = "#14532d";
                ctx.fillRect(pt.x - 3.5, pt.y - 3.5, 7, 7);
                ctx.strokeStyle = "#39ff14";
                ctx.lineWidth = 1;
                ctx.strokeRect(pt.x - 3.5, pt.y - 3.5, 7, 7);
            }
        }

        // Ringing Payphones
        if (game.missions && Array.isArray(game.missions.payphones)) {
            for (const ph of game.missions.payphones) {
                if (ph.completed) continue;
                const pt = worldToMini(ph.x, ph.y);
                if (pt.x < mx - 6 || pt.x > mx + mw + 6 || pt.y < my - 6 || pt.y > my + mh + 6) continue;
                ctx.fillStyle = "#39ff14";
                ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
            }
        }

        // Nearby Vehicles & Cops
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

        // Official Landmarks
        let nearestLm = null;
        let nearestDist = Infinity;
        if (Array.isArray(this.map.landmarks)) {
            ctx.font = "bold 8px Consolas, 'Courier New', monospace";
            for (const lm of this.map.landmarks) {
                const d = Math.hypot(lm.x - p.x, lm.y - p.y);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestLm = lm;
                }
                const pt = worldToMini(lm.x, lm.y);
                const inside = pt.x >= mx + 6 && pt.x <= mx + mw - 6 && pt.y >= my + 6 && pt.y <= my + mh - 6;
                if (inside) {
                    ctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                    ctx.fillRect(pt.x - 3.5, pt.y - 3.5, 7, 7);
                    ctx.strokeStyle = "#050811";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(pt.x - 3.5, pt.y - 3.5, 7, 7);
                } else {
                    const cx = Math.max(mx + 5, Math.min(mx + mw - 5, pt.x));
                    const cy = Math.max(my + 5, Math.min(my + mh - 5, pt.y));
                    ctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                    ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
                }
            }
        }

        // Active Mission Target Blip
        const mTarget = game.missions ? game.missions.getTargetPosition() : null;
        if (mTarget) {
            const pt = worldToMini(mTarget.x, mTarget.y);
            const cx = Math.max(mx + 5, Math.min(mx + mw - 5, pt.x));
            const cy = Math.max(my + 5, Math.min(my + mh - 5, pt.y));
            const pulse = 4 + Math.sin(this.time * 9) * 2;
            ctx.strokeStyle = "#ff2a85";
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - pulse, cy - pulse, pulse * 2, pulse * 2);
        }

        // Jason Partner Blip
        if (game.jason) {
            const jp = worldToMini(game.jason.x, game.jason.y);
            ctx.fillStyle = "#00f0ff";
            ctx.fillRect(jp.x - 2.5, jp.y - 2.5, 5, 5);
        }

        // Player Directional Arrow
        const pp = worldToMini(p.x, p.y);
        const ang = (p.inVehicle ? p.inVehicle.angle : p.angle) || 0;
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(ang);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#ff2a85";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(6.5, 0);
        ctx.lineTo(-4.5, -4.5);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4.5, 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore(); // End GPS map clip

        // 3. Bottom GPS Landmark Navigation Bar
        const ftrY = my + mh;
        if (nearestLm) {
            const distMeters = Math.round(nearestDist / 16);
            const dx = nearestLm.x - p.x;
            const dy = nearestLm.y - p.y;
            const dirs = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
            const dirIdx = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
            const dirStr = dirs[dirIdx];

            let goTarget = nearestLm;
            if (distMeters < 45 && Array.isArray(this.map.landmarks)) {
                const unvisited = this.map.landmarks.find((l) => !l.visited && l.id !== nearestLm.id);
                const nextIdx = (this.map.landmarks.indexOf(nearestLm) + 1) % this.map.landmarks.length;
                goTarget = unvisited || this.map.landmarks[nextIdx];
            }

            const nearShort = nearestLm.short || nearestLm.shortName || "LANDMARK";
            ctx.font = "bold 9px Consolas, 'Courier New', monospace";
            ctx.fillStyle = "#ffd13b";
            const statusTxt = distMeters < 35
                ? `★ AT ${nearShort}`
                : `📍 ${nearShort} (${distMeters}m ${dirStr})`;
            ctx.fillText(statusTxt.slice(0, 21), gx + 5, ftrY + 10);

            const goW = 34;
            const goX = gx + gw - goW - 3;
            rrect(goX, ftrY + 2, goW, 14, 3);
            ctx.fillStyle = "rgba(25, 115, 72, 0.95)";
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.fillText("GO►", goX + 5, ftrY + 10);

            this.cheatButtons.push({
                id: "MINIMAP_NEXT_LM",
                x: gx,
                y: ftrY,
                w: gw,
                h: ftrH,
                landmarkId: goTarget ? goTarget.id : nearestLm.id
            });
        }

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
                if (btn.id === "TOGGLE_NIGHT") {
                    if (game && typeof game.advanceTimeOfDayPhase === "function") {
                        game.advanceTimeOfDayPhase();
                    } else {
                        this.nightMode = !this.nightMode;
                        this.nightFactor = this.nightMode ? 1.0 : 0.0;
                    }
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
                if (btn.id === "PHONE_MUSIC_TOGGLE" && typeof game.setYouTubeMusicEnabled === "function") {
                    game.setYouTubeMusicEnabled(!game.ytMusicEnabled);
                    return true;
                }
                if (btn.id === "PHONE_MUSIC_SKIP" && typeof game.skipYouTubeRadioTrack === "function") {
                    game.skipYouTubeRadioTrack();
                    return true;
                }
                if (btn.id === "PHONE_VOL_DOWN" && typeof game.adjustYouTubeVolume === "function") {
                    game.adjustYouTubeVolume(-15);
                    return true;
                }
                if (btn.id === "PHONE_VOL_UP" && typeof game.adjustYouTubeVolume === "function") {
                    game.adjustYouTubeVolume(15);
                    return true;
                }
                if (btn.id === "UNMINIMIZE_PHONE") {
                    this.showCheatsWindow = true;
                    return true;
                }
                if (btn.id === "PHONE_TAB_MSG") {
                    this.cheatsCollapsed = true;
                    return true;
                }
                if (!this.showCheatsWindow) continue;
                if (btn.id === "TOGGLE_COLLAPSE") {
                    this.cheatsCollapsed = !this.cheatsCollapsed;
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
       8. AUTHENTIC 1997 1997 GTA 1 BITMAP FONT & HUD RENDERER (HUD.cpp)
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

        // A. TOP-RIGHT: AUTHENTIC 1997 GTA 1 SCORE, MULTIPLIER & LIVES PANEL
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

        // B. LEFT PANEL (Top-Left): LUCIA MUGSHOT BADGE + WEAPON, ARMOR, KEY & PAGER POPUP
        const leftX = 12;
        const leftY = 12;
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
