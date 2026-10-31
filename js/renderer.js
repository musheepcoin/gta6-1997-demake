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

        // Vice City Neon GPS Express Drawer ([C] key or click header toggles open/collapsed; auto-minimized on mobile)
        const isMobileInit = typeof window !== "undefined" && (
            window.innerWidth <= 960 ||
            window.innerHeight <= 560 ||
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
        );
        this.showCheatsWindow = !isMobileInit;
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
        this.charPortraitsImg = new Image();
        this.charPortraitsReady = false;
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
            precision highp float;
            attribute vec3 aPos;
            attribute vec2 aUV;
            attribute float aAnim;
            uniform mat4 uViewProj;
            uniform float uWaterStep;
            uniform float uFanStep;
            varying vec2 vUV;
            varying highp float vAnim;
            varying highp vec3 vWorldPos;
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
            precision highp float;
            varying vec2 vUV;
            varying highp float vAnim;
            varying highp vec3 vWorldPos;
            uniform sampler2D uTex;
            uniform sampler2D uDayLightTex;
            uniform highp float uWaterStep;
            uniform float uNightTint;
            uniform float uSunsetTint;
            uniform float uViceStyle;
            uniform float uTime;
            uniform vec2 uSunDir;

            vec4 sampleOceanWater(float dayAmt) {
                float idx = 698.0 + 25.0 + uWaterStep;
                float col = mod(idx, 16.0);
                float row = floor(idx / 16.0);
                vec2 localUV = clamp(fract(vWorldPos.xz), vec2(0.5 / 64.0), vec2(63.5 / 64.0));
                vec2 wUV = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                vec3 texW = texture2D(uTex, wUV).rgb;
                float swell = sin(vWorldPos.x * 1.35 + vWorldPos.z * 0.95 + uTime * 1.4) * 0.5
                            + cos(vWorldPos.x * 2.70 - vWorldPos.z * 2.15 - uTime * 1.9) * 0.5;
                float w1 = sin(vWorldPos.x * 5.4 + uTime * 2.3 + swell * 0.8) * cos(vWorldPos.z * 5.4 - uTime * 1.8);
                float w2 = sin((vWorldPos.x + vWorldPos.z) * 3.9 - uTime * 2.7);
                float caust = max(0.0, w1 * 0.65 + w2 * 0.35);
                vec3 lagunaBase = mix(vec3(0.11, 0.57, 0.69), vec3(0.24, 0.76, 0.84), clamp(0.5 + swell * 0.38, 0.0, 1.0));
                vec3 rgb = mix(texW, lagunaBase, 0.72);
                vec3 crestFoam = vec3(0.88, 0.97, 0.99);
                rgb = mix(rgb, crestFoam, caust * 0.18 * (1.0 - uNightTint * 0.65));
                float sunGlint = pow(caust, 3.0) * dayAmt;
                rgb = min(vec3(1.0), rgb + vec3(0.36, 0.34, 0.24) * sunGlint);
                return vec4(rgb, 0.78);
            }

            // Seamless world-space asphalt (hash without sin; inputs wrapped to stay precise in mediump)
            float aHash(vec2 p) {
                p = mod(p, 512.0);
                vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }
            float aNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), u.x),
                           mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            // Same curb profile as the lane edge tiles (lid 1/74 texels 0..7): curb stone, shade, gutter, yellow line
            vec3 junctionCurb(vec3 col, float d) {
                float px = d * 64.0;
                if (px < 2.0) return mix(vec3(0.83, 0.80, 0.75), vec3(0.72, 0.69, 0.64), px * 0.5);
                if (px < 3.0) return vec3(0.47, 0.45, 0.42);
                if (px < 4.0) return vec3(0.15, 0.18, 0.20);
                if (px >= 5.0 && px < 7.0) return vec3(0.88, 0.73, 0.25);
                return col;
            }
            vec3 asphaltSurface(vec3 src, float darkFamily) {
                vec2 p = vWorldPos.xz;
                float mx = max(src.r, max(src.g, src.b));
                float mn = min(src.r, min(src.g, src.b));
                // Lane paint / curb stones are much brighter than tar: crisp mask from the blurry 64px texel
                float paint = smoothstep(0.40, 0.50, mx);
                bool yellow = (src.r - src.b) > 0.16;

                // Large faded patches, medium mottling, fine aggregate grain (all continuous across tiles)
                float big = aNoise(p * 0.45) * 0.6 + aNoise(p * 1.3 + 7.0) * 0.4;
                float mid = aNoise(p * 4.0 + 13.0);
                float grain = aHash(floor(p * 40.0));
                float fine = aHash(floor(p * 96.0) + 19.0);
                vec3 base = mix(vec3(0.255, 0.285, 0.310), vec3(0.200, 0.220, 0.255), darkFamily);
                vec3 col = base * (0.88 + big * 0.18 + mid * 0.07);
                col *= 0.94 + grain * 0.05 + fine * 0.08;
                col += vec3(0.055, 0.058, 0.062) * step(0.982, fine);           // light aggregate stones
                float tar = smoothstep(0.66, 0.80, aNoise(p * 0.7 + 31.0));
                col *= 1.0 - tar * 0.13;                                         // dark resealed tar patches
                float seam = 1.0 - smoothstep(0.0, 0.022, abs(aNoise(p * 1.1 + 57.0) - 0.5));
                col *= 1.0 - seam * 0.12 * step(0.68, aNoise(p * 0.3 + 3.0));    // sparse thin repaired cracks

                // Crisp, slightly worn paint keeping the original lane colours
                vec3 paintCol = yellow ? vec3(0.95, 0.77, 0.20) : vec3(clamp(mx * 1.08, 0.0, 0.94));
                if (!yellow && (mx - mn) > 0.06) paintCol = src * (clamp(mx * 1.08, 0.0, 0.94) / max(mx, 0.01));
                paintCol *= 0.90 + aNoise(p * 9.0 + 71.0) * 0.12;
                vec3 outCol = mix(col, paintCol, paint);
                if (vAnim > 9.5) {
                    // Junction box side facing the pavement: continue curb + gutter + yellow edge line
                    float bits = floor(vAnim - 10.0 + 0.5);
                    vec2 lp = fract(p);
                    if (mod(bits, 2.0) > 0.5)              outCol = junctionCurb(outCol, lp.y);
                    if (mod(floor(bits / 2.0), 2.0) > 0.5) outCol = junctionCurb(outCol, 1.0 - lp.y);
                    if (mod(floor(bits / 4.0), 2.0) > 0.5) outCol = junctionCurb(outCol, lp.x);
                    if (mod(floor(bits / 8.0), 2.0) > 0.5) outCol = junctionCurb(outCol, 1.0 - lp.x);
                }
                return outCol;
            }

            vec3 sampleLidTile(float lidIdx) {
                float idx = 390.0 + lidIdx;
                float col = mod(idx, 16.0);
                float row = floor(idx / 16.0);
                vec2 localUV = clamp(fract(vWorldPos.xz), vec2(0.5 / 64.0), vec2(63.5 / 64.0));
                vec2 uv = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                return texture2D(uTex, uv).rgb;
            }
            vec3 styleBeachSand(vec3 baseSand) {
                float warp = sin(vWorldPos.z * 1.73 + vWorldPos.x * 0.89) * 0.85;
                float r1 = sin(vWorldPos.x * 5.83 + vWorldPos.z * 2.91 + warp);
                float r2 = cos(vWorldPos.x * 14.37 - vWorldPos.z * 8.19 + sin(vWorldPos.x * 3.17) * 0.7);
                float r3 = sin(vWorldPos.x * 29.3 + vWorldPos.z * 17.9);
                float duneWave = r1 * 0.52 + r2 * 0.33 + r3 * 0.15;
                vec3 sandCrest = vec3(0.99, 0.91, 0.71);
                vec3 sandTrough = vec3(0.91, 0.78, 0.55);
                vec3 targetSand = mix(sandTrough, sandCrest, clamp(0.54 + duneWave * 0.24, 0.0, 1.0));
                return mix(baseSand, targetSand, 0.48);
            }
            float coastalSandDrift(vec2 p) {
                float w = sin(p.y * 0.72 + 0.4) * 0.50 + cos(p.y * 1.65 - 0.9) * 0.32 + (aNoise(vec2(p.y * 2.3, 5.0)) - 0.5) * 0.36;
                return clamp(0.28 + w * 0.16, 0.14, 0.44);
            }
            float cornerNorm(float u, float v, float k) {
                return mix(u + v, length(vec2(u, v)), k);
            }

            void main() {
                vec4 c = texture2D(uTex, vUV);
                bool isShoreTile = (vAnim > 3.5 && vAnim < 4.5);
                bool isRoad = (vAnim > 4.9 && vAnim < 26.0);
                bool isFootpathSandEdge = (vAnim > 27.5 && vAnim < 28.5);
                bool isCurvedLawn = (vAnim > 29.5 && vAnim < 1999.5);
                bool isCurvedWater = (vAnim > 1999.5);
                float waterCoverage = (vAnim > 0.5 && vAnim < 1.5) ? 1.0 : 0.0;
                if (isRoad) c.rgb = asphaltSurface(c.rgb, (vAnim > 5.1 && vAnim < 5.4) ? 1.0 : 0.0);
                if (c.a < 0.03 && !isShoreTile) discard;

                float dayAmt = clamp(1.0 - uNightTint * 1.15, 0.0, 1.0);

                // 1. AddRiverbed (world_mesh.cpp): 3D Sunken Sandy Seabed Floor (vAnim == 3.0) & Translucent Water Surface (vAnim == 1.0)
                if (vAnim > 2.5 && vAnim < 3.5) {
                    // Sunken 3D sandy seabed floor 0.42 blocks beneath the water surface with refracted underwater caustics!
                    float w1 = sin(vWorldPos.x * 4.2 + uTime * 2.3) * cos(vWorldPos.z * 4.2 - uTime * 1.8);
                    float w2 = sin((vWorldPos.x + vWorldPos.z) * 3.1 - uTime * 2.7);
                    float caust = max(0.0, w1 * 0.65 + w2 * 0.35);
                    vec3 submergedSand = c.rgb * vec3(0.45, 0.78, 0.86) + vec3(0.28, 0.34, 0.22) * caust * (1.0 - uNightTint * 0.7);
                    c.rgb = submergedSand;
                } else if (vAnim > 0.5 && vAnim < 1.5) {
                    c = sampleOceanWater(dayAmt);
                } else if ((vAnim > -0.5 && vAnim < 0.5) || isShoreTile || isRoad || isFootpathSandEdge || isCurvedLawn || isCurvedWater) {
                    float dWater = 10.0;
                    float waterBits = 0.0;
                    float waterSurType = 0.0;
                    float waterPaveBits = 0.0;
                    if (isCurvedWater) {
                        float rawW = floor(vAnim - 2000.0 + 0.5);
                        waterPaveBits = floor(rawW / 1024.0);
                        float remW = mod(rawW, 1024.0);
                        waterSurType = floor(remW / 256.0);
                        waterBits = mod(remW, 256.0);
                        float groundLid = 8.0;
                        if (waterSurType > 2.5) groundLid = 98.0;
                        else if (waterSurType > 1.5) groundLid = 10.0;
                        else if (waterSurType > 0.5) groundLid = 9.0;
                        c = vec4(sampleLidTile(groundLid), 1.0);
                    }
                    float isSand = 0.0;
                    if (vWorldPos.y < 2.2 && c.a > 0.02) {
                        // World-space multi-block Miami beach sand wind-ripples & tropical St. Augustine park lawn undulation!
                        isSand = clamp((c.r - c.b - 0.14) * 6.5, 0.0, 1.0) * smoothstep(0.54, 0.76, c.r);
                        float isGrass = clamp((c.g - c.r - 0.14) * 7.5, 0.0, 1.0) * clamp((c.g - c.b - 0.12) * 7.5, 0.0, 1.0);
                        if (isSand > 0.01) {
                            c.rgb = mix(c.rgb, styleBeachSand(c.rgb), isSand);
                        } else if (isGrass > 0.01) {
                            float gWarp = sin(vWorldPos.z * 1.61 - vWorldPos.x * 0.97) * 0.75;
                            float g1 = sin(vWorldPos.x * 5.17 + vWorldPos.z * 3.43 + gWarp);
                            float g2 = cos(vWorldPos.x * 13.89 - vWorldPos.z * 9.23 + sin(vWorldPos.z * 2.71) * 0.6);
                            float g3 = sin(vWorldPos.x * 27.7 + vWorldPos.z * 19.3);
                            float turfWave = (g1 * 0.50 + g2 * 0.34 + g3 * 0.16) * isGrass;
                            vec3 turfShadow = vec3(0.09, 0.42, 0.18);
                            vec3 turfSunlit = vec3(0.42, 0.81, 0.36);
                            vec3 targetTurf = mix(turfShadow, turfSunlit, clamp(0.52 + turfWave * 0.26, 0.0, 1.0));
                            c.rgb = mix(c.rgb, targetTurf, isGrass * 0.34);
                        }

                        // Coral promenade footpath meeting beach sand on the East: organic wind-blown sand drift over pavers
                        if (isFootpathSandEdge) {
                            vec2 p = vWorldPos.xz;
                            vec2 lp = fract(p);
                            float drift = coastalSandDrift(p) + (aNoise(p * 9.0 + 17.0) - 0.5) * 0.06;
                            float sandMix = smoothstep(1.0 - drift - 0.06, 1.0 - drift + 0.04, lp.x);
                            if (sandMix > 0.005) {
                                vec3 sandCol = styleBeachSand(sampleLidTile(98.0));
                                c.rgb = mix(c.rgb, sandCol, sandMix);
                                isSand = max(isSand, sandMix);
                            }
                        }

                        // Non-orthogonal organic rounded & wavy park lawns (8-neighbor seam-free SDF fillet)
                        if (isCurvedLawn || (isCurvedWater && waterPaveBits > 0.5)) {
                            vec2 p = vWorldPos.xz;
                            vec2 lp = fract(p);
                            float surType = 2.0;
                            float bits = waterPaveBits;
                            if (isCurvedLawn) {
                                float raw = floor(vAnim - 30.0 + 0.5);
                                surType = floor(raw / 256.0);
                                bits = mod(raw, 256.0);
                            }

                            bool bN  = mod(bits, 2.0) > 0.5;
                            bool bS  = mod(floor(bits / 2.0), 2.0) > 0.5;
                            bool bW  = mod(floor(bits / 4.0), 2.0) > 0.5;
                            bool bE  = mod(floor(bits / 8.0), 2.0) > 0.5;
                            bool bNW = mod(floor(bits / 16.0), 2.0) > 0.5;
                            bool bNE = mod(floor(bits / 32.0), 2.0) > 0.5;
                            bool bSW = mod(floor(bits / 64.0), 2.0) > 0.5;
                            bool bSE = mod(floor(bits / 128.0), 2.0) > 0.5;

                            bool iNW = bNW && !bN && !bW;
                            bool iNE = bNE && !bN && !bE;
                            bool iSW = bSW && !bS && !bW;
                            bool iSE = bSE && !bS && !bE;

                            // Single continuous 2D world-space wave offset w(p) so neighboring tiles match with 0.0000 seam error!
                            float w = 0.33 + 0.05 * sin(p.x * 0.62 + p.y * 0.58) + 0.03 * cos(p.y * 1.25 - p.x * 0.50);
                            float R = 1.0 - w;

                            float dW = bW ? (lp.x - w) : 10.0;
                            float dE = bE ? (1.0 - lp.x - w) : 10.0;
                            float dN = bN ? (lp.y - w) : 10.0;
                            float dS = bS ? (1.0 - lp.y - w) : 10.0;

                            float xDist = min(dW, dE);
                            float yDist = min(dN, dS);
                            bool isNarrow = (bW && bE) || (bN && bS);
                            bool isDiagPair = bW == bN;
                            bool isStair = !isNarrow && (isDiagPair ? (!bNE || !bSW) : (!bNW || !bSE));
                            float kOuter = isStair ? 0.18 : 0.62;
                            float dCard = (xDist < R && yDist < R)
                                ? (R - cornerNorm(R - xDist, R - yDist, kOuter))
                                : min(xDist, yDist);

                            float dCorner = 10.0;
                            if (iNW) dCorner = min(dCorner, cornerNorm(lp.x, lp.y, 0.18) - w);
                            if (iNE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, lp.y, 0.18) - w);
                            if (iSW) dCorner = min(dCorner, cornerNorm(lp.x, 1.0 - lp.y, 0.18) - w);
                            if (iSE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, 1.0 - lp.y, 0.18) - w);

                            float tuft = (aNoise(p * 16.0 + 3.0) - 0.5) * 0.026 + (aHash(floor(p * 44.0)) - 0.5) * 0.012;
                            float dLawn = min(dCard, dCorner) + tuft;

                            if (dLawn < 0.08) {
                                vec3 paveCol = sampleLidTile(surType > 1.5 ? 8.0 : 9.0);
                                vec3 outsideCol = paveCol;
                                float outSandMask = 0.0;
                                if (surType > 0.5 && surType < 1.5) {
                                    // East side borders beach sand (lid 98), N/S/W border coral promenade (lid 9)
                                    float drift = coastalSandDrift(p) + (aNoise(p * 9.0 + 17.0) - 0.5) * 0.06;
                                    float eastSand = smoothstep(1.0 - drift - 0.10, 1.0 - drift + 0.03, lp.x);
                                    if (dE < min(dN, dS) + 0.06) eastSand = 1.0;
                                    vec3 sandCol = styleBeachSand(sampleLidTile(98.0));
                                    outsideCol = mix(paveCol, sandCol, eastSand);
                                    outSandMask = eastSand;
                                }
                                // Soft grass-edge contact shadow / soil border on stone pavers & lush edge ring on turf
                                float edgeShade = mix(0.84, 1.0, smoothstep(-0.004, -0.038, dLawn));
                                outsideCol *= mix(edgeShade, 1.0, outSandMask * 0.65);
                                vec3 lushEdge = c.rgb * mix(0.86, 1.0, smoothstep(0.0, 0.075, dLawn));
                                if (outSandMask > 0.2) {
                                    // Dappled coastal dune sand grains drifting slightly into the eastern turf margin
                                    float duneGrains = smoothstep(0.055, -0.01, dLawn + (aNoise(p * 11.0 + 13.0) - 0.5) * 0.05) * outSandMask;
                                    lushEdge = mix(lushEdge, outsideCol, duneGrains * 0.55);
                                }
                                float grassAlpha = smoothstep(-0.012, 0.016, dLawn);
                                c.rgb = mix(outsideCol, lushEdge, grassAlpha);
                                isSand = max(isSand, outSandMask * (1.0 - grassAlpha));
                            }
                        }

                        // Non-orthogonal organic rounded & sculpted stone-coping water basins, ponds, canals & lagoons (8-neighbor seam-free SDF)
                        if (isCurvedWater) {
                            vec2 p = vWorldPos.xz;
                            vec2 lp = fract(p);

                            bool bN  = mod(waterBits, 2.0) > 0.5;
                            bool bS  = mod(floor(waterBits / 2.0), 2.0) > 0.5;
                            bool bW  = mod(floor(waterBits / 4.0), 2.0) > 0.5;
                            bool bE  = mod(floor(waterBits / 8.0), 2.0) > 0.5;
                            bool bNW = mod(floor(waterBits / 16.0), 2.0) > 0.5;
                            bool bNE = mod(floor(waterBits / 32.0), 2.0) > 0.5;
                            bool bSW = mod(floor(waterBits / 64.0), 2.0) > 0.5;
                            bool bSE = mod(floor(waterBits / 128.0), 2.0) > 0.5;

                            bool iNW = bNW && !bN && !bW;
                            bool iNE = bNE && !bN && !bE;
                            bool iSW = bSW && !bS && !bW;
                            bool iSE = bSE && !bS && !bE;

                            // Single continuous 2D world-space shoreline offset w(p) so adjacent tiles join with 0.0000 seam error!
                            float w = 0.28 + 0.05 * sin(p.x * 0.62 + p.y * 0.58) + 0.03 * cos(p.y * 1.25 - p.x * 0.50);
                            float R = 1.0 - w;

                            float dW = bW ? (lp.x - w) : 10.0;
                            float dE = bE ? (1.0 - lp.x - w) : 10.0;
                            float dN = bN ? (lp.y - w) : 10.0;
                            float dS = bS ? (1.0 - lp.y - w) : 10.0;

                            float xDist = min(dW, dE);
                            float yDist = min(dN, dS);
                            bool isNarrow = (bW && bE) || (bN && bS);
                            bool isDiagPair = bW == bN;
                            bool isStair = !isNarrow && (isDiagPair ? (!bNE || !bSW) : (!bNW || !bSE));
                            float kOuter = isStair ? 0.18 : 0.62;
                            float dCard = (xDist < R && yDist < R)
                                ? (R - cornerNorm(R - xDist, R - yDist, kOuter))
                                : min(xDist, yDist);

                            float dCorner = 10.0;
                            if (iNW) dCorner = min(dCorner, cornerNorm(lp.x, lp.y, 0.18) - w);
                            if (iNE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, lp.y, 0.18) - w);
                            if (iSW) dCorner = min(dCorner, cornerNorm(lp.x, 1.0 - lp.y, 0.18) - w);
                            if (iSE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, 1.0 - lp.y, 0.18) - w);

                            float stoneGrain = (aNoise(p * 18.0 + 11.0) - 0.5) * 0.006;
                            dWater = min(dCard, dCorner) + stoneGrain;

                            // Outer contact shadow on surrounding ground & 3D sculpted limestone/granite coping rim (dWater in [-0.045, 0.145])
                            if (dWater < 0.155) {
                                float outerAO = mix(0.76, 1.0, smoothstep(-0.002, -0.045, dWater));
                                vec3 groundCol = c.rgb * outerAO;

                                // Architectural stone coping rim (margelle en pierre de taille / quai)
                                float copingNorm = clamp(dWater / 0.14, 0.0, 1.0);
                                vec3 stoneBase = (waterSurType > 0.5 && waterSurType < 2.5)
                                    ? vec3(0.86, 0.81, 0.72) // Warm Florida coquina / travertine limestone for park & promenade lagoons
                                    : vec3(0.76, 0.77, 0.80); // Chiselled light urban granite for city plazas & canals
                                float blockNoise = (aNoise(p * 26.0 + 5.0) - 0.5) * 0.06 + (aHash(floor(p * 52.0)) - 0.5) * 0.03;
                                float jointGrid = abs(sin((p.x + p.y) * 9.42477)) * abs(cos((p.x - p.y) * 9.42477));
                                float mortarJoint = 1.0 - 0.22 * smoothstep(0.035, 0.0, jointGrid);
                                float outerChamfer = smoothstep(0.0, 0.22, copingNorm);
                                float crownTop = sin(copingNorm * 3.14159) * 0.14;
                                float innerDropWall = 1.0 - 0.42 * smoothstep(0.68, 0.98, copingNorm);
                                vec3 copingCol = (stoneBase + blockNoise + crownTop) * (0.88 + 0.16 * outerChamfer) * innerDropWall * mortarJoint;

                                float rimMask = smoothstep(-0.008, 0.012, dWater);
                                c.rgb = mix(groundCol, copingCol, rimMask);
                                isSand *= (1.0 - rimMask);
                            }
                        }
                    }

                    // Daytime 3D Building Cast Shadows, Building-Foot Ambient Occlusion & Warm Florida Sunlight vs. Cool Sky Shade
                    if (dayAmt > 0.01 && c.a > 0.02) {
                        vec4 lm = texture2D(uDayLightTex, vWorldPos.xz / 256.0);
                        float onGround = clamp(2.75 - vWorldPos.y, 0.0, 1.0);
                        float sandMask = clamp(isSand + step(0.82, min(c.r, min(c.g, c.b))), 0.0, 1.0);
                        float bldAO = lm.g * onGround * (1.0 - sandMask * 0.88);
                        float westSunWeight = clamp(0.76 - uSunDir.x * 0.35, 0.25, 0.92);
                        float bldShadow = max(lm.a * westSunWeight, lm.b * (1.0 - westSunWeight * 0.45)) * onGround * (1.0 - sandMask * 0.88);
                        float totalShade = clamp(max(bldShadow * 0.94, bldAO * 0.72), 0.0, 1.0);
                        if (isRoad) {
                            // The 2-texel-per-tile lightmap paints blurry light/dark squares on wide asphalt
                            // (bright junction box vs. shaded lanes): keep only a faint, neutral hint of it on roads.
                            bldAO *= 0.12;
                            totalShade *= 0.30;
                        }

                        vec3 sunlitTint = mix(vec3(1.13, 1.06, 0.92), vec3(1.03, 1.01, 0.97), sandMask);
                        vec3 shadowTint = mix(vec3(0.56, 0.65, 0.84), vec3(0.92, 0.88, 0.80), sandMask);
                        if (isRoad) {
                            sunlitTint = vec3(1.06, 1.05, 1.02);
                            shadowTint = vec3(0.72, 0.76, 0.86);
                        }
                        vec3 dayGrading = mix(sunlitTint, shadowTint, totalShade) * (1.0 - bldAO * 0.22);
                        float roofSunBoost = clamp((vWorldPos.y - 2.0) * 0.035, 0.0, 0.10);
                        vec3 sunlitRgb = clamp((c.rgb - 0.5) * (1.0 + 0.10 * (1.0 - totalShade) * (1.0 - sandMask * 0.7)) + 0.5, 0.0, 1.0);
                        sunlitRgb = min(vec3(1.0), sunlitRgb * dayGrading * (1.0 + roofSunBoost));
                        c.rgb = mix(c.rgb, sunlitRgb, dayAmt);
                    }

                    // For shoreline tiles (lid 99..101), composite the beach sand & white surf directly over the animated ocean water on the SAME quad!
                    if (isShoreTile && c.a < 0.999) {
                        float shoreAlpha = c.a;
                        vec4 waterCol = sampleOceanWater(dayAmt);
                        c.rgb = mix(waterCol.rgb, c.rgb, shoreAlpha);
                        c.a = mix(waterCol.a, 1.0, shoreAlpha);
                        waterCoverage = 1.0 - shoreAlpha;
                    }
                    // For curved basins, ponds, canals & lakes (isCurvedWater), transition from the 3D stone coping rim into animated water!
                    if (isCurvedWater && dWater > 0.125) {
                        vec4 waterCol = sampleOceanWater(dayAmt);
                        // Submerged vertical basin wall shadow + turquoise shallow shelf + animated white water-line ripple (meniscus)
                        float wallShade = mix(0.62, 1.0, smoothstep(0.135, 0.27, dWater));
                        float shallowShelf = exp(-max(0.0, dWater - 0.135) * 8.5);
                        float rippleWave = 0.5 + 0.5 * sin(dWater * 48.0 - uTime * 3.2 + sin(vWorldPos.x * 5.0 + vWorldPos.z * 5.0) * 1.4);
                        float meniscus = exp(-pow((dWater - 0.148) / 0.018, 2.0)) * (0.55 + 0.45 * rippleWave);
                        vec3 basinWater = waterCol.rgb * wallShade + vec3(0.04, 0.16, 0.18) * shallowShelf * (0.35 + 0.65 * dayAmt) + vec3(0.70, 0.88, 0.95) * meniscus * 0.42;
                        float waterMix = smoothstep(0.126, 0.144, dWater);
                        c.rgb = mix(c.rgb, min(vec3(1.0), basinWater), waterMix);
                        c.a = mix(1.0, waterCol.a, waterMix);
                        waterCoverage = waterMix;
                    }
                }

                // 2. 3D Cardinal Wall Normals, Solar Directional Shading & Ground-Contact Ambient Occlusion (world_mesh.cpp)
                if (vAnim < -0.5) {
                    vec2 wallNormal = vec2(0.0, 1.0);
                    if (vAnim > -1.5) wallNormal = vec2(-1.0, 0.0);      // West wall (-1.0)
                    else if (vAnim > -2.5) wallNormal = vec2(1.0, 0.0);  // East wall (-2.0)
                    else if (vAnim > -3.5) wallNormal = vec2(0.0, -1.0); // North wall (-3.0)
                    else wallNormal = vec2(0.0, 1.0);                    // South wall (-4.0)

                    float sunDot = dot(wallNormal, uSunDir);
                    float wallSunFactor = clamp(sunDot * 0.5 + 0.5, 0.0, 1.0);
                    vec3 wallDayTint = mix(vec3(0.75, 0.83, 0.96), vec3(1.14, 1.06, 0.94), wallSunFactor);
                    vec3 wallShade = mix(vec3(1.0 + sunDot * 0.06), wallDayTint, dayAmt);

                    // Subtle Ground-Contact Ambient Occlusion at each storey ledge + street-level facade base
                    float storeyY = fract(vWorldPos.y);
                    float baseAO = mix(0.84, 1.0, smoothstep(0.0, 0.32, storeyY)) * mix(0.82, 1.0, smoothstep(2.0, 2.55, vWorldPos.y));

                    // Daytime solar sky-reflection glint on upper-floor glass windows
                    float isGlass = clamp((c.b - c.r - 0.06) * 3.2, 0.0, 1.0) * dayAmt;
                    vec3 skyGlint = vec3(0.10, 0.15, 0.20) * isGlass * clamp((vWorldPos.y - 2.0) * 0.30, 0.0, 1.0) * (0.4 + 0.6 * wallSunFactor);
                    c.rgb = min(vec3(1.0), c.rgb * wallShade * baseAO + skyGlint);
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
                        // Horizontal ground (roads, sidewalks, golden beach sand, grass, rooftops) & hybrid water-edge tiles:
                        // Cool nocturnal moonlight base (darkened & lit dynamically by renderNightLighting!)
                        vec3 nightScale = mix(vec3(0.68, 0.73, 0.90), vec3(0.42, 0.52, 0.78), waterCoverage);
                        nightRgb = c.rgb * nightScale;
                        if (uViceStyle > 0.5 && vWorldPos.y > 1.5 && waterCoverage < 0.05) {
                            // Illuminated Vice City rooftop swimming pools, glass skylight atriums & neon parapet trims at night!
                            float rSat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
                            float rLum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                            float poolOrNeon = clamp((rSat - 0.32) * 2.6 + (rLum - 0.62) * 1.8, 0.0, 1.0);
                            nightRgb = mix(nightRgb, min(vec3(1.0), c.rgb * 1.18 + vec3(0.04, 0.08, 0.12)), poolOrNeon * 0.75);
                        }
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
            uDayLightTex: gl.getUniformLocation(this.cityProg, "uDayLightTex"),
            uNightTint: gl.getUniformLocation(this.cityProg, "uNightTint"),
            uSunsetTint: gl.getUniformLocation(this.cityProg, "uSunsetTint"),
            uViceStyle: gl.getUniformLocation(this.cityProg, "uViceStyle"),
            uTime: gl.getUniformLocation(this.cityProg, "uTime"),
            uSunDir: gl.getUniformLocation(this.cityProg, "uSunDir")
        };

        // Default 1x1 neutral daylight AO/shadow texture (replaced by 512x512 ray-marched lightmap in buildCityMesh)
        this.dayLightTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.dayLightTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([85, 0, 0, 0]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

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
            const origH = img.height;

            // Pre-compute the shelf-packed atlas layout of the GTA 2 (1999) remap pedestrian archetypes
            // (synthesized from the GTA 1 civilian base `civ0`) so the in-memory atlas can grow to fit them.
            const g2Archs = this.getGta2PedArchetypes();
            const g2SrcFrames = (meta.sprites.peds && meta.sprites.peds.civ0) || null;
            const g2FrameKeys = [
                "0", "1", "2", "3", "4", "5", "6", "7",
                "16", "17", "18", "19", "20", "21", "22", "23",
                "38", "39", "40", "41", "42",
                "50", "51", "52", "53", "54", "55",
                "84", "85", "86", "87", "88", "89",
                "97", "98", "99", "100", "101", "102", "103", "104", "105", "106",
                "136", "137", "138", "139", "140", "141", "142", "143", "152"
            ];
            const g2Layout = [];
            let g2PackEndY = origH + 220;
            if (g2SrcFrames) {
                let cx = 2;
                let cy = origH + 172;
                let shelfH = 0;
                // +1 archetype slot for the GTA 2 electrocution X-ray skeleton ("g2_xray")
                for (let ai = 0; ai <= g2Archs.length; ai++) {
                    for (const fk of g2FrameKeys) {
                        const r = g2SrcFrames[fk];
                        if (!Array.isArray(r) || r.length < 4) continue;
                        if (cx + r[2] + 2 > W) {
                            cx = 2;
                            cy += shelfH + 2;
                            shelfH = 0;
                        }
                        g2Layout.push({ ai, fk, dx: cx, dy: cy });
                        cx += r[2] + 2;
                        shelfH = Math.max(shelfH, r[3]);
                    }
                }
                g2PackEndY = Math.max(g2PackEndY, cy + shelfH + 4);
            }

            const H = g2PackEndY;
            this.spritesTexW = W;
            this.spritesTexH = H;
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

                    // Convert .G24 damage & door sprites (which are baked only in `ve.base` color in the atlas)
                    // into pure color-neutral delta overlays so remapped cars NEVER change paint color on crash/bullet impact!
                    if (ve.base && ve.base.length >= 4) {
                        const [bx, by, bw, bh] = ve.base;
                        const toNeutralDeltaOverlay = (deltaRect, isDoor = false) => {
                            if (!Array.isArray(deltaRect) || deltaRect.length < 4) return;
                            const [dx, dy, dw, dh] = deltaRect;
                            if (dw !== bw || dh !== bh) return;
                            for (let ly = 0; ly < bh; ly++) {
                                for (let lx = 0; lx < bw; lx++) {
                                    const bp = ((by + ly) * W + (bx + lx)) * 4;
                                    const dp = ((dy + ly) * W + (dx + lx)) * 4;
                                    const br = d[bp], bg = d[bp + 1], bb = d[bp + 2], ba = d[bp + 3];
                                    const dr = d[dp], dg = d[dp + 1], db = d[dp + 2], da = d[dp + 3];
                                    if (dr === br && dg === bg && db === bb && da === ba) {
                                        // Unchanged body pixel -> make transparent so the vehicle's true remap paint shows through!
                                        d[dp] = 0;
                                        d[dp + 1] = 0;
                                        d[dp + 2] = 0;
                                        d[dp + 3] = 0;
                                    } else if (da < 16) {
                                        // Crumpled inward notch where base bumper was opaque -> dark shadow notch
                                        d[dp] = 14;
                                        d[dp + 1] = 16;
                                        d[dp + 2] = 22;
                                        d[dp + 3] = isDoor ? 0 : 220;
                                    } else {
                                        // Changed dent / crumpled metal / cracked glass / open door trim pixel:
                                        // Desaturate any `ve.base` paint hue into neutral dark crumpled steel/charcoal
                                        const lum = dr * 0.299 + dg * 0.587 + db * 0.114;
                                        const gray = Math.min(240, Math.max(12, lum * (isDoor ? 0.68 : 0.76)));
                                        d[dp] = Math.round(gray * 0.96);
                                        d[dp + 1] = Math.round(gray * 0.98);
                                        d[dp + 2] = Math.round(Math.min(255, gray * 1.04));
                                        d[dp + 3] = isDoor ? 245 : 230;
                                    }
                                }
                            }
                        };
                        if (ve.damage) {
                            if (ve.damage.front) toNeutralDeltaOverlay(ve.damage.front, false);
                            if (ve.damage.rear) toNeutralDeltaOverlay(ve.damage.rear, false);
                            if (ve.damage.heavy) toNeutralDeltaOverlay(ve.damage.heavy, false);
                        }
                        if (Array.isArray(ve.doors)) {
                            for (const dr of ve.doors) toNeutralDeltaOverlay(dr, true);
                        }
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

            // 2B. Synthesize 6 Top-Down Vice Beach Pedestrian Archetypes (5 Bikini Women + 1 Shirtless Surfer)
            //     into the dedicated atlas band (y = origH + 4 .. origH + 165) and register in meta.sprites.peds!
            if (meta.sprites.peds && meta.sprites.peds.lucia) {
                const srcLucia = meta.sprites.peds.lucia;
                const beachArchetypes = [
                    { key: "bikini_pink",   bik: [255, 42, 138],  hair: [252, 211, 38],  skin: [232, 162, 114], isSurfer: false },
                    { key: "bikini_cyan",   bik: [6, 218, 246],   hair: [118, 56, 22],   skin: [222, 148, 100], isSurfer: false },
                    { key: "bikini_yellow", bik: [250, 204, 21],  hair: [204, 42, 36],   skin: [238, 168, 122], isSurfer: false },
                    { key: "bikini_red",    bik: [239, 52, 52],   hair: [28, 26, 36],    skin: [216, 140, 92],  isSurfer: false },
                    { key: "bikini_white",  bik: [248, 250, 252], hair: [234, 179, 14],  skin: [206, 132, 84],  isSurfer: false },
                    { key: "surfer_guy",    bik: [6, 192, 224],   hair: [218, 168, 72],  skin: [218, 142, 94],  isSurfer: true  }
                ];
                const coreFrames = [
                    "0", "1", "2", "3", "4", "5", "6", "7",
                    "16", "17", "18", "19", "20", "21", "22", "23",
                    "38", "39", "40", "41", "42",
                    "50", "51", "52", "53", "54", "55",
                    "84", "97", "98"
                ];

                for (let ai = 0; ai < beachArchetypes.length; ai++) {
                    const arch = beachArchetypes[ai];
                    const dstFrames = { ...srcLucia };
                    const rowY = origH + 4 + ai * 26;

                    for (let fi = 0; fi < coreFrames.length; fi++) {
                        const fKey = coreFrames[fi];
                        const srcRect = srcLucia[fKey] || srcLucia["98"];
                        if (!Array.isArray(srcRect) || srcRect.length < 4) continue;
                        const [sx, sy, sw, sh] = srcRect;
                        const dx0 = 4 + fi * 26;
                        const dy0 = rowY;
                        if (dx0 + sw >= W || dy0 + sh >= H) continue;

                        for (let ly = 0; ly < sh; ly++) {
                            for (let lx = 0; lx < sw; lx++) {
                                const sp = ((sy + ly) * W + (sx + lx)) * 4;
                                const dp = ((dy0 + ly) * W + (dx0 + lx)) * 4;
                                const a = d[sp + 3];
                                if (a < 16) {
                                    d[dp] = 0; d[dp + 1] = 0; d[dp + 2] = 0; d[dp + 3] = 0;
                                    continue;
                                }
                                const r = d[sp];
                                const g = d[sp + 1];
                                const b = d[sp + 2];

                                const isPerim =
                                    lx === 0 || lx === sw - 1 || ly === 0 || ly === sh - 1 ||
                                    d[sp - 4 + 3] < 16 || d[sp + 4 + 3] < 16 ||
                                    d[sp - W * 4 + 3] < 16 || d[sp + W * 4 + 3] < 16;

                                if (isPerim && r < 95 && g < 95 && b < 105) {
                                    d[dp] = (r * 0.78) | 0;
                                    d[dp + 1] = (g * 0.78) | 0;
                                    d[dp + 2] = (b * 0.82) | 0;
                                    d[dp + 3] = 255;
                                    continue;
                                }

                                const isPinkTop = (r > 165 && r > g + 42 && b > 65);
                                const isBlueJeans = (b > r + 14 && b > 65);
                                const isDarkHair = (!isPerim && r < 72 && g < 72 && b < 80);
                                const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 182.0;
                                const shade = Math.max(0.76, Math.min(1.22, lum));

                                let nr = Math.round(arch.skin[0] * shade);
                                let ng = Math.round(arch.skin[1] * shade);
                                let nb = Math.round(arch.skin[2] * shade);

                                if (isDarkHair) {
                                    const dome = Math.max(0, 1.0 - Math.hypot((lx - 11.5) * 0.22, (ly - 13.0) * 0.22));
                                    const hMult = 0.82 + 0.36 * dome;
                                    nr = Math.round(arch.hair[0] * hMult);
                                    ng = Math.round(arch.hair[1] * hMult);
                                    nb = Math.round(arch.hair[2] * hMult);
                                    // Sunglasses on lying sunbather frame 42
                                    if (fKey === "42" && ly === 7 && lx >= 10 && lx <= 13) {
                                        nr = lx === 11 ? 56 : 18;
                                        ng = lx === 11 ? 189 : 24;
                                        nb = lx === 11 ? 248 : 38;
                                    }
                                } else if (arch.isSurfer) {
                                    // Shirtless bronzed surfer guy: bare muscular upper torso/arms, neon boardshorts at hips/thighs, bare lower calves
                                    if (isBlueJeans && ly >= 10 && ly <= 17) {
                                        const isStripe = (lx <= 8 || lx >= 15);
                                        nr = Math.round((isStripe ? 249 : arch.bik[0]) * shade);
                                        ng = Math.round((isStripe ? 115 : arch.bik[1]) * shade);
                                        nb = Math.round((isStripe ? 22 : arch.bik[2]) * shade);
                                    }
                                } else if (fKey === "42") {
                                    // Lying down Sunbather on towel: distinct two-piece bikini top (ly 9..11) + bare tanned stomach (ly 12..13) + bikini bottom (ly 14..15) + bare tanned legs (ly >= 16)
                                    const inBikiniTop = (ly >= 9 && ly <= 11 && lx >= 8 && lx <= 15 && (isPinkTop || isBlueJeans));
                                    const inBikiniBot = ((ly === 14 || ly === 15) && lx >= 8 && lx <= 15 && (isPinkTop || isBlueJeans));
                                    if (inBikiniTop || inBikiniBot) {
                                        const cupSpec = (inBikiniTop && (lx === 10 || lx === 13)) ? 1.14 : 1.0;
                                        nr = Math.round(arch.bik[0] * shade * cupSpec);
                                        ng = Math.round(arch.bik[1] * shade * cupSpec);
                                        nb = Math.round(arch.bik[2] * shade * cupSpec);
                                    }
                                } else {
                                    // Standing / Walking / Jumping Bikini Woman:
                                    // Bare tanned shoulders/arms (lx <= 8 || lx >= 15), bare midriff (ly === 13), bare tanned legs (ly <= 9 || ly >= 16),
                                    // vibrant Two-Piece Bikini Top (ly 10..12, lx 9..14) & Bikini Bottom (ly 14..15, lx 9..14)!
                                    const inTop = isPinkTop && lx >= 9 && lx <= 14 && ly >= 10 && ly <= 12;
                                    const inBot = (isBlueJeans || isPinkTop) && lx >= 9 && lx <= 14 && (ly === 14 || ly === 15);
                                    if (inTop || inBot) {
                                        const cupBoost = (inTop && (lx === 10 || lx === 13)) ? 1.12 : 1.0;
                                        nr = Math.round(arch.bik[0] * shade * cupBoost);
                                        ng = Math.round(arch.bik[1] * shade * cupBoost);
                                        nb = Math.round(arch.bik[2] * shade * cupBoost);
                                    }
                                }

                                d[dp] = Math.min(255, Math.max(0, nr));
                                d[dp + 1] = Math.min(255, Math.max(0, ng));
                                d[dp + 2] = Math.min(255, Math.max(0, nb));
                                d[dp + 3] = 255;
                            }
                        }
                        dstFrames[fKey] = [dx0, dy0, sw, sh];
                    }
                    meta.sprites.peds[arch.key] = dstFrames;
                }
            }

            // 2C. GTA 2 (1999) Remap Pedestrian Variety (remaps 0..52 of the GTA 2 .sty files + Vice City extras):
            //     Re-dress the GTA 1 civilian base (`civ0`: green long-sleeve top, blue trousers, auburn hair)
            //     region by region into ~35 distinct archetypes — short sleeves / tank tops (bare forearms),
            //     shorts (bare calves), Hawaiian prints, stripes, open jackets, helmets, hoods, bald heads,
            //     4 skin tones — plus the GTA 2 electrocution X-ray skeleton ("g2_xray").
            if (g2SrcFrames && g2Layout.length) {
                const clamp8 = (v) => (v < 0 ? 0 : (v > 255 ? 255 : v | 0));
                const newFrames = g2Archs.map(() => ({}));
                const xrayFrames = {};
                const hairMask = new Uint8Array(40 * 40);

                for (const ent of g2Layout) {
                    const src = g2SrcFrames[ent.fk];
                    const [sx, sy, sw, sh] = src;
                    if (sw > 40 || sh > 40 || ent.dx + sw > W || ent.dy + sh > H) continue;
                    const isXray = ent.ai === g2Archs.length;
                    const arch = isXray ? null : g2Archs[ent.ai];

                    // Pass 1: hair centroid = head centre (all frames share the same facing, so arms lie
                    // left/right of the head and legs extend fore/aft of it).
                    let hxSum = 0, hySum = 0, hCnt = 0;
                    for (let ly = 0; ly < sh; ly++) {
                        for (let lx = 0; lx < sw; lx++) {
                            const sp = ((sy + ly) * W + (sx + lx)) * 4;
                            const r = d[sp], g = d[sp + 1], b = d[sp + 2];
                            const isHair = d[sp + 3] >= 16 && r > 28 && r < 104 && r > g * 2 && g < 34 && b < 30;
                            hairMask[ly * sw + lx] = isHair ? 1 : 0;
                            if (isHair) { hxSum += lx; hySum += ly; hCnt++; }
                        }
                    }
                    const hx = hCnt > 0 ? hxSum / hCnt : (sw - 1) * 0.5;
                    const hy = hCnt > 0 ? hySum / hCnt : (sh - 1) * 0.5;
                    // Pass 1b: relaxed hair test near the head centre (the GTA 2 crown highlight lifts
                    // the centre hair pixels above the strict thresholds)
                    if (hCnt > 0) {
                        for (let ly = 0; ly < sh; ly++) {
                            for (let lx = 0; lx < sw; lx++) {
                                if (hairMask[ly * sw + lx]) continue;
                                if (Math.hypot(lx - hx, ly - hy) > 3.4) continue;
                                const sp = ((sy + ly) * W + (sx + lx)) * 4;
                                const r = d[sp], g = d[sp + 1], b = d[sp + 2];
                                if (d[sp + 3] >= 16 && r > 30 && r < 135 && r > g * 1.5 && r - g > 22 && g < 56 && b < 48) {
                                    hairMask[ly * sw + lx] = 1;
                                }
                            }
                        }
                    }

                    for (let ly = 0; ly < sh; ly++) {
                        for (let lx = 0; lx < sw; lx++) {
                            const sp = ((sy + ly) * W + (sx + lx)) * 4;
                            const dp = ((ent.dy + ly) * W + (ent.dx + lx)) * 4;
                            const a = d[sp + 3];
                            if (a < 16) {
                                d[dp] = 0; d[dp + 1] = 0; d[dp + 2] = 0; d[dp + 3] = 0;
                                continue;
                            }
                            const r = d[sp], g = d[sp + 1], b = d[sp + 2];
                            const isHair = hairMask[ly * sw + lx] === 1;
                            const isShirt = !isHair && g > r + 8 && g > b + 20;
                            const isPants = !isHair && !isShirt && b > r + 25 && b + 6 >= g;
                            const isSkin = !isHair && !isShirt && !isPants && r >= 120 && g >= 55 && r > g + 20 && g > b;
                            const dx = lx - hx;
                            const dy = ly - hy;
                            const dist = Math.hypot(dx, dy);

                            if (isXray) {
                                // GTA 2 electrocution: glowing blue body outline + white bones + skull
                                const opaqueAt = (ox, oy) => {
                                    if (ox < 0 || oy < 0 || ox >= sw || oy >= sh) return false;
                                    return d[((sy + oy) * W + (sx + ox)) * 4 + 3] >= 16;
                                };
                                const isCore = opaqueAt(lx - 1, ly) && opaqueAt(lx + 1, ly) && opaqueAt(lx, ly - 1) && opaqueAt(lx, ly + 1);
                                if ((isHair || isSkin) && dist <= 2.7) {
                                    const eye = (Math.abs(dy + 0.6) < 0.7 && Math.abs(Math.abs(dx) - 1.0) < 0.6);
                                    d[dp] = eye ? 20 : 238; d[dp + 1] = eye ? 30 : 244; d[dp + 2] = eye ? 70 : 255; d[dp + 3] = 255;
                                } else if (isCore) {
                                    d[dp] = 196; d[dp + 1] = 222; d[dp + 2] = 255; d[dp + 3] = 255;
                                } else {
                                    d[dp] = 34; d[dp + 1] = 120; d[dp + 2] = 255; d[dp + 3] = 190;
                                }
                                continue;
                            }

                            let col = null;
                            let shade = 1.0;
                            if (isShirt) {
                                shade = Math.max(0.35, Math.min(1.3, g / 190));
                                const ax = Math.abs(dx);
                                const bareArm =
                                    arch.sleeves === "bare" ||
                                    (arch.sleeves === "tank" && ax >= 3.5) ||
                                    (arch.sleeves === "short" && ax >= 4.5);
                                if (bareArm) {
                                    col = arch.skin;
                                    shade = Math.max(0.6, Math.min(1.2, shade * 1.05));
                                } else {
                                    col = arch.shirt;
                                    if (arch.pattern === "hawaiian") {
                                        if ((lx + ly * 2 + ent.ai) % 5 === 0) col = arch.shirt2;
                                        else if ((lx * 3 + ly + ent.ai) % 7 === 0) col = arch.shirt3 || arch.shirt2;
                                    } else if (arch.pattern === "stripes") {
                                        if (ly % 2 === 0) col = arch.shirt2;
                                    } else if (arch.pattern === "jacket") {
                                        if (ax <= 1.2) col = arch.shirt2;
                                    } else if (arch.pattern === "hivis") {
                                        if ((ly + 1) % 4 === 0) col = arch.shirt2;
                                    } else if (arch.pattern === "plaid") {
                                        if (lx % 3 === 0 || ly % 3 === 0) col = arch.shirt2;
                                    }
                                }
                            } else if (isPants) {
                                shade = Math.max(0.4, Math.min(1.35, b / 105));
                                if (arch.legs === "shorts" && dist > 4.2) {
                                    col = arch.skin;
                                    shade = Math.max(0.65, Math.min(1.15, shade));
                                } else {
                                    col = arch.pants;
                                }
                            } else if (isHair) {
                                shade = Math.max(0.55, Math.min(1.35, r / 72));
                                if (arch.hairMode === "bald") {
                                    col = arch.skin;
                                    shade = 0.9 + Math.max(0, 1.0 - dist / 2.2) * 0.3;
                                } else if (arch.hairMode === "hood") {
                                    col = arch.shirt;
                                    shade *= 0.78;
                                } else if (arch.hairMode === "helmet") {
                                    col = arch.helmet;
                                    shade = 0.82 + Math.max(0, 1.0 - dist / 2.4) * 0.42;
                                } else {
                                    col = arch.hair;
                                }
                            } else if (isSkin) {
                                shade = Math.max(0.6, Math.min(1.2, r / 175));
                                col = arch.skin;
                            }

                            if (col) {
                                d[dp] = clamp8(col[0] * shade);
                                d[dp + 1] = clamp8(col[1] * shade);
                                d[dp + 2] = clamp8(col[2] * shade);
                            } else {
                                // Shoes, belts & dark contour keep their original GTA 1 pixels
                                d[dp] = r; d[dp + 1] = g; d[dp + 2] = b;
                            }
                            d[dp + 3] = 255;
                        }
                    }

                    const rect = [ent.dx, ent.dy, sw, sh];
                    if (isXray) xrayFrames[ent.fk] = rect;
                    else newFrames[ent.ai][ent.fk] = rect;
                }

                for (let ai = 0; ai < g2Archs.length; ai++) {
                    meta.sprites.peds[g2Archs[ai].key] = { ...g2SrcFrames, ...newFrames[ai] };
                }
                meta.sprites.peds["g2_xray"] = { ...g2SrcFrames, ...xrayFrames };
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

            // 4. Draw Custom Top-Down Vice Beach Activity Prop Sprites (Towels, Loungers, Surfboards, Beach Ball, Sandcastle, Cooler)
            if (meta.sprites.objects) {
                const py = origH + 8;
                const drawStripedTowel = (ox, oy, c1, c2) => {
                    ctx.fillStyle = "#0f172a";
                    ctx.fillRect(ox + 1, oy + 1, 30, 18);
                    for (let s = 0; s < 6; s++) {
                        ctx.fillStyle = (s % 2 === 0) ? c1 : c2;
                        ctx.fillRect(ox + 2 + s * 4.5, oy + 2, 4.6, 16);
                    }
                    ctx.fillStyle = "#f8fafc";
                    for (let t = 0; t < 5; t++) {
                        ctx.fillRect(ox, oy + 3 + t * 3, 2, 1.5);
                        ctx.fillRect(ox + 30, oy + 3 + t * 3, 2, 1.5);
                    }
                };
                drawStripedTowel(820, py, "#facc15", "#fef9c3");
                meta.sprites.objects["beach_towel_yellow"] = [820, py, 32, 20];

                drawStripedTowel(860, py, "#fb7185", "#2dd4bf");
                meta.sprites.objects["beach_towel_coral"] = [860, py, 32, 20];

                // Miami Art Deco Sun Lounger ("beach_lounger")
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(900, py + 1, 34, 18);
                ctx.fillStyle = "#f8fafc";
                ctx.fillRect(901, py + 2, 32, 16);
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(903, py + 4, 28, 12);
                ctx.fillStyle = "#fef08a";
                ctx.fillRect(904, py + 4, 6, 12); // pillow headrest
                meta.sprites.objects["beach_lounger"] = [900, py, 34, 20];

                // Octagonal Yellow/Orange Beach Umbrella ("umbrella_yellow")
                const ux = 962, uy = py + 20, ur = 18;
                for (let w = 0; w < 8; w++) {
                    const a0 = (w / 8) * Math.PI * 2;
                    const a1 = ((w + 1) / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(ux, uy);
                    ctx.arc(ux, uy, ur, a0, a1);
                    ctx.closePath();
                    ctx.fillStyle = (w % 2 === 0) ? "#facc15" : "#f97316";
                    ctx.fill();
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "#78350f";
                    ctx.stroke();
                }
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(ux, uy, 2.5, 0, Math.PI * 2);
                ctx.fill();
                meta.sprites.objects["umbrella_yellow"] = [942, py, 40, 40];

                // Pointed Malibu Surfboards ("surfboard_pink", "surfboard_cyan", "surfboard_yellow")
                const drawSurfboard = (sx, sy, bodyCol, stripeCol) => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(sx + 38, sy + 7);
                    ctx.quadraticCurveTo(sx + 24, sy + 1, sx + 3, sy + 3);
                    ctx.lineTo(sx + 5, sy + 7);
                    ctx.lineTo(sx + 3, sy + 11);
                    ctx.quadraticCurveTo(sx + 24, sy + 13, sx + 38, sy + 7);
                    ctx.closePath();
                    ctx.fillStyle = bodyCol;
                    ctx.fill();
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = "#0f172a";
                    ctx.stroke();
                    ctx.fillStyle = stripeCol;
                    ctx.fillRect(sx + 10, sy + 6, 22, 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(sx + 16, sy + 4, 4, 6);
                    ctx.restore();
                };
                drawSurfboard(990, py, "#ff2a85", "#00f0ff");
                meta.sprites.objects["surfboard_pink"] = [990, py, 40, 14];

                drawSurfboard(1038, py, "#00f0ff", "#fde047");
                meta.sprites.objects["surfboard_cyan"] = [1038, py, 40, 14];

                drawSurfboard(1086, py, "#facc15", "#ef4444");
                meta.sprites.objects["surfboard_yellow"] = [1086, py, 40, 14];

                // 6-Panel Inflatable Beach Ball / Volleyball ("beach_ball")
                const bx = 1142, by = py + 8, br = 7;
                const ballCols = ["#ff2a85", "#ffffff", "#00f0ff", "#facc15", "#ffffff", "#fb7185"];
                for (let s = 0; s < 6; s++) {
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.arc(bx, by, br, (s / 6) * Math.PI * 2, ((s + 1) / 6) * Math.PI * 2);
                    ctx.closePath();
                    ctx.fillStyle = ballCols[s];
                    ctx.fill();
                }
                ctx.lineWidth = 1.1;
                ctx.strokeStyle = "#0f172a";
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(bx - 2, by - 2, 1.8, 0, Math.PI * 2);
                ctx.fill();
                meta.sprites.objects["beach_ball"] = [1134, py, 16, 16];

                // Sculpted Golden Sandcastle ("sandcastle")
                const scx = 1158, scy = py + 2;
                ctx.fillStyle = "#b45309";
                ctx.fillRect(scx + 3, scy + 3, 14, 14);
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(scx + 4, scy + 4, 12, 12);
                ctx.fillStyle = "#fde68a";
                ctx.fillRect(scx + 2, scy + 2, 5, 5);
                ctx.fillRect(scx + 13, scy + 2, 5, 5);
                ctx.fillRect(scx + 2, scy + 13, 5, 5);
                ctx.fillRect(scx + 13, scy + 13, 5, 5);
                ctx.fillRect(scx + 7, scy + 7, 6, 6);
                ctx.fillStyle = "#ff2a85";
                ctx.fillRect(scx + 9, scy + 5, 5, 3); // tiny pink flag
                meta.sprites.objects["sandcastle"] = [scx, scy, 20, 20];

                // Miami Beach Ice Cooler ("beach_cooler")
                const clx = 1194, cly = py;
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(clx + 1, cly + 1, 18, 14);
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(clx + 2, cly + 2, 16, 12);
                ctx.fillStyle = "#f8fafc";
                ctx.fillRect(clx + 3, cly + 3, 14, 5);
                meta.sprites.objects["beach_cooler"] = [clx, cly, 20, 16];
            }

            return cvs;
        } catch (err) {
            console.warn("processGtaSpritesRtx fallback:", err);
            return img;
        }
    }

    processViceTilesRtx(img) {
        try {
            const w = img.width || 1024;
            const h = img.height || 3264;
            const cvs = document.createElement("canvas");
            cvs.width = w;
            cvs.height = h;
            const ctx = cvs.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, w, h);
            const d = imgData.data;

            // 1. Make animated ocean water & seabed tiles (lid 41 at 431/585, lid 98 at 488, & aux 25..35 at 723..733) 100% seamlessly tileable across 64x64 borders
            const waterIndices = [431, 488, 585, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733];
            const tileBuf = new Uint8ClampedArray(64 * 64 * 4);
            for (const idx of waterIndices) {
                const col = idx % 16;
                const row = Math.floor(idx / 16);
                const x0 = col * 64;
                const y0 = row * 64;
                if (y0 + 64 > h) continue;

                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const sp = ((y0 + ty) * w + (x0 + tx)) * 4;
                        const dp = (ty * 64 + tx) * 4;
                        tileBuf[dp]     = d[sp];
                        tileBuf[dp + 1] = d[sp + 1];
                        tileBuf[dp + 2] = d[sp + 2];
                        tileBuf[dp + 3] = d[sp + 3];
                    }
                }

                // Toroidal edge cross-fade over 14-pixel border band so adjacent 64x64 water tiles have zero seam
                const BAND = 14;
                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < BAND; tx++) {
                        const t = (BAND - tx) / (BAND * 2.0);
                        const pL = (ty * 64 + tx) * 4;
                        const pR = (ty * 64 + (63 - tx)) * 4;
                        for (let c = 0; c < 3; c++) {
                            const vL = tileBuf[pL + c];
                            const vR = tileBuf[pR + c];
                            tileBuf[pL + c] = Math.round(vL * (1.0 - t) + vR * t);
                            tileBuf[pR + c] = Math.round(vR * (1.0 - t) + vL * t);
                        }
                    }
                }
                for (let tx = 0; tx < 64; tx++) {
                    for (let ty = 0; ty < BAND; ty++) {
                        const t = (BAND - ty) / (BAND * 2.0);
                        const pT = (ty * 64 + tx) * 4;
                        const pB = ((63 - ty) * 64 + tx) * 4;
                        for (let c = 0; c < 3; c++) {
                            const vT = tileBuf[pT + c];
                            const vB = tileBuf[pB + c];
                            tileBuf[pT + c] = Math.round(vT * (1.0 - t) + vB * t);
                            tileBuf[pB + c] = Math.round(vB * (1.0 - t) + vT * t);
                        }
                    }
                }

                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const sp = (ty * 64 + tx) * 4;
                        const dp = ((y0 + ty) * w + (x0 + tx)) * 4;
                        d[dp]     = tileBuf[sp];
                        d[dp + 1] = tileBuf[sp + 1];
                        d[dp + 2] = tileBuf[sp + 2];
                    }
                }
            }

            // 2. Beach Shoreline Tiles (lid 99 straight, lid 100 convex corner, lid 101 concave corner):
            //    Remove all flat solid cyan (#0f94b2) water fill (alpha -> 0) and bridge the 2px gap between wet sand
            //    and surf foam so the real animated ocean water (lid 41) is in direct contact with the beach!
            const shoreIndices = [390 + 99, 390 + 100, 390 + 101, 544 + 99, 544 + 100, 544 + 101];
            const isSandMask = new Uint8Array(64 * 64);
            for (const idx of shoreIndices) {
                const col = idx % 16;
                const row = Math.floor(idx / 16);
                const x0 = col * 64;
                const y0 = row * 64;
                if (y0 + 64 > h) continue;

                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const p = ((y0 + ty) * w + (x0 + tx)) * 4;
                        isSandMask[ty * 64 + tx] = (d[p] > d[p + 2] + 12) ? 1 : 0;
                    }
                }

                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const p = ((y0 + ty) * w + (x0 + tx)) * 4;
                        const r = d[p];
                        const g = d[p + 1];
                        const b = d[p + 2];

                        if (isSandMask[ty * 64 + tx]) {
                            // Opaque beach sand: normalize dry sand near tile edges so adjacent sand tiles blend without seams
                            if (r - b > 65) {
                                const edgeDist = Math.min(tx, 63 - tx, ty, 63 - ty);
                                if (edgeDist < 6) {
                                    const blend = (6 - edgeDist) / 6.0 * 0.65;
                                    d[p]     = Math.round(r * (1.0 - blend) + 242 * blend);
                                    d[p + 1] = Math.round(g * (1.0 - blend) + 213 * blend);
                                    d[p + 2] = Math.round(b * (1.0 - blend) + 156 * blend);
                                }
                            }
                            d[p + 3] = 255;
                            continue;
                        }

                        // Find distance to nearest sand pixel (within 3px neighborhood)
                        let minSandDistSq = 99;
                        for (let dy = -3; dy <= 3; dy++) {
                            const ny = ty + dy;
                            if (ny < 0 || ny >= 64) continue;
                            for (let dx = -3; dx <= 3; dx++) {
                                const nx = tx + dx;
                                if (nx < 0 || nx >= 64) continue;
                                if (isSandMask[ny * 64 + nx]) {
                                    const dSq = dx * dx + dy * dy;
                                    if (dSq < minSandDistSq) minSandDistSq = dSq;
                                }
                            }
                        }

                        if (minSandDistSq <= 2) {
                            // 1px contact line right against the wet sand: warm wet-sand-to-surf transition (eliminates cyan trench!)
                            d[p]     = 230;
                            d[p + 1] = 212;
                            d[p + 2] = 172;
                            d[p + 3] = 242;
                        } else if (minSandDistSq <= 5) {
                            // 2px contact zone: creamy white surf washing directly onto the wet sand
                            d[p]     = 244;
                            d[p + 1] = 248;
                            d[p + 2] = 242;
                            d[p + 3] = 210;
                        } else {
                            // Seaward surf foam & water zone: pure white surf crest where r > 165, 100% transparent (alpha = 0) across all flat cyan!
                            const foamStrength = Math.max(0.0, Math.min(1.0, (r - 165.0) / (255.0 - 165.0)));
                            d[p]     = 246;
                            d[p + 1] = 253;
                            d[p + 2] = 255;
                            d[p + 3] = Math.round(foamStrength * foamStrength * 195.0);
                        }
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);
            return cvs;
        } catch (err) {
            console.warn("processViceTilesRtx fallback:", err);
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
                    const enhancedViceTiles = this.processViceTilesRtx(this.gta1TilesViceImg);
                    this.tilesTexVice = this.createGLTexture(enhancedViceTiles, true);
                    this.tilesTexNyc = this.tilesTexNyc || this.tilesTexVice;
                    this.tilesTex = this.mapStyle === "VICE" ? this.tilesTexVice : this.tilesTexNyc;
                    const enhancedSprites = this.processGtaSpritesRtx(this.gta1SpritesImg, this.gta1Meta);
                    this.enhancedSpritesCanvas = enhancedSprites;
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
                loadImageWithRetry(this.gta1TilesImg, "assets/gta1/gta1_tiles.png?v=98_11", () => {
                    if (this.gl) {
                        this.tilesTexNyc = this.createGLTexture(this.gta1TilesImg, true);
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

        // Load character portraits FIRST so start-modal portraits appear immediately
        loadImageWithRetry(this.charPortraitsImg, "assets/gta1/gta1_char_portraits.png?v=98_51", () => {
            this.charPortraitsReady = true;
            if (window.game && typeof window.game.renderPortraits === "function") {
                window.game.renderPortraits();
            }
        });

        loadImageWithRetry(this.gta1TilesViceImg, "assets/gta1/gta1_tiles_vice.png?v=98_11", () => {
            viceTilesLoaded = true;
            checkReady();
        });

        loadImageWithRetry(this.gta1SpritesImg, "assets/gta1/gta1_sprites.png?v=98_52", () => {
            spritesLoaded = true;
            checkReady();
        });

        loadImageWithRetry(this.viceOverviewImg, "assets/gta1/vice_cmp_overview.png?v=98_11", () => {
            this.viceOverviewReady = true;
            this.bakeRadarBackground();
        });

        loadImageWithRetry(this.nycOverviewImg, "assets/gta1/nyc_cmp_overview.png?v=98_11", () => {
            this.nycOverviewReady = true;
            this.bakeRadarBackground();
        });

        fetchWithRetry("assets/gta1/gta1_meta.json?v=98_52", false)
            .then((meta) => {
                this.gta1Meta = meta;
                checkReady();
            })
            .catch((err) => console.error("Failed to load gta1_meta.json:", err));

        fetchWithRetry("assets/gta1/gta1_map.bin?v=98_11", true)
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

        // Compute UV bounds for continuous animated ocean water (lid 41) emitted beneath shoreline blocks (lid 99..101)
        const waterAtlasIdx = (tiles.lid_start || 390) + (41 % (tiles.lid_count || 154));
        const waterCol = waterAtlasIdx % 16;
        const waterRow = Math.floor(waterAtlasIdx / 16);
        const waterU0 = waterCol / 16.0 + padU;
        const waterU1 = (waterCol + 1.0) / 16.0 - padU;
        const waterV0 = waterRow / 51.0 + padV;
        const waterV1 = (waterRow + 1.0) / 51.0 - padV;

        for (let cy = 0; cy < NUM_CHUNKS; cy++) {
            for (let cx = 0; cx < NUM_CHUNKS; cx++) {
                const opaqueVerts = [];
                const flatVerts = [];

                const x0 = cx * CHUNK_SIZE;
                const y0 = cy * CHUNK_SIZE;

                // 1. AddRiverbed (world_mesh.cpp lines 1016-1054):
                // Emit a 3D sunken sandy seabed quad (y_elev - 0.42) under every water/shoreline cell and its 1-cell shore neighbors (kRiverbedPad = 1)
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
                                    if (wb && (wb.faces[4] === 41 || (wb.faces[4] >= 99 && wb.faces[4] <= 101))) {
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

                // 2. Emit 3D Voxel Block Faces (routing animated water lids face===4 && tile===41 and shoreline lids 99..101 to flatVerts!)
                for (let z = 0; z < MAP_LAYERS; z++) {
                    for (let y = y0; y < y0 + CHUNK_SIZE; y++) {
                        for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
                            const blkIdx = this.map.getBlockIndex(x, y, z);
                            if (blkIdx === 0) continue;
                            const b = this.map.getBlockInfo(blkIdx);
                            if (!b) continue;

                            for (let face = 0; face < 5; face++) {
                                if (b.faces[face] !== 0) {
                                    const lid = b.faces[4];
                                    const isWaterOrShoreLid = (face === 4 && (lid === 41 || (lid >= 99 && lid <= 101)));
                                    const targetArr = (b.isFlat || isWaterOrShoreLid) ? flatVerts : opaqueVerts;
                                    this.putBlockFace(targetArr, x, z, y, face, b, 0.0);
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

        // 3. Build 512x512 Ray-Marched 3D Building Solar Cast Shadow & Ambient Occlusion Lightmap (this.dayLightTex)
        this.buildDayLightTexture();
    }

    buildDayLightTexture() {
        const gl = this.gl;
        if (!gl || !this.map || !this.map.cmpLoaded) return;

        // 1) Compute true visible top elevation (1.0..6.0) for every 256x256 map column
        const colTopElev = new Float32Array(256 * 256);
        for (let r = 0; r < 256; r++) {
            for (let c = 0; c < 256; c++) {
                let topY = 2.0;
                for (let z = 5; z >= 0; z--) {
                    const bIdx = this.map.getBlockIndex(c, r, z);
                    if (bIdx === 0) continue;
                    const b = this.map.getBlockInfo(bIdx);
                    if (b && (b.faces[4] !== 0 || b.faces[0] !== 0 || b.faces[1] !== 0 || b.faces[2] !== 0 || b.faces[3] !== 0)) {
                        topY = z + 1.0;
                        break;
                    }
                }
                colTopElev[r * 256 + c] = topY;
            }
        }

        // 2) Ray-march 512x512 sub-tile lightmap (2x2 samples per 64px tile) for:
        //    - G: 3D Building-Foot & Urban Canyon Ambient Occlusion
        //    - B: 3D Cast Shadow from South-East Sun (morning/forenoon)
        //    - A: 3D Cast Shadow from West-Southwest Sun (midday/afternoon — casts Hotel Dixon & Ocean Drive shadows onto the promenade!)
        const LRES = 512;
        const rawElev = new Float32Array(LRES * LRES);
        const rawAO = new Float32Array(LRES * LRES);
        const rawShadE = new Float32Array(LRES * LRES);
        const rawShadW = new Float32Array(LRES * LRES);
        const aoOffsets = [
            [-0.55, 0], [0.55, 0], [0, -0.55], [0, 0.55],
            [-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]
        ];

        for (let ty = 0; ty < LRES; ty++) {
            const wy = (ty + 0.5) * 0.5;
            const cy = Math.min(255, Math.max(0, ty >> 1));
            for (let tx = 0; tx < LRES; tx++) {
                const wx = (tx + 0.5) * 0.5;
                const cx = Math.min(255, Math.max(0, tx >> 1));
                const idx = ty * LRES + tx;
                const baseElev = colTopElev[cy * 256 + cx];
                rawElev[idx] = baseElev;

                // Building-foot contact Ambient Occlusion
                let aoSum = 0.0;
                for (let k = 0; k < 8; k++) {
                    const nx = Math.min(255, Math.max(0, Math.floor(wx + aoOffsets[k][0])));
                    const ny = Math.min(255, Math.max(0, Math.floor(wy + aoOffsets[k][1])));
                    const hDiff = colTopElev[ny * 256 + nx] - baseElev;
                    if (hDiff > 0.2) {
                        aoSum += Math.min(1.0, hDiff * 0.38);
                    }
                }
                rawAO[idx] = Math.min(1.0, aoSum / 3.0);

                // Ray-march 3D solar cast shadows (7 steps up to ~2.8 blocks from 3D buildings)
                let shE = 0.0;
                let shW = 0.0;
                for (let s = 1; s <= 7; s++) {
                    const dist = s * 0.40;
                    const reqH = dist * 0.78;
                    const falloff = Math.max(0.28, 1.0 - dist * 0.13);

                    // Caster to the North-East (+X, -Y) -> casts shadow South-West
                    const ex = Math.min(255, Math.max(0, Math.floor(wx + 0.35 * s)));
                    const ey = Math.min(255, Math.max(0, Math.floor(wy - 0.32 * s)));
                    const diffE = colTopElev[ey * 256 + ex] - baseElev;
                    if (diffE > reqH) {
                        shE = Math.max(shE, Math.min(1.0, falloff * Math.min(1.0, diffE * 0.52)));
                    }

                    // Caster to the North-West (-X, -Y) -> casts shadow South-East (matching palm & ped shadows!)
                    const wxCaster = Math.min(255, Math.max(0, Math.floor(wx - 0.36 * s)));
                    const wyCaster = Math.min(255, Math.max(0, Math.floor(wy - 0.32 * s)));
                    const diffW = colTopElev[wyCaster * 256 + wxCaster] - baseElev;
                    if (diffW > reqH) {
                        shW = Math.max(shW, Math.min(1.0, falloff * Math.min(1.0, diffW * 0.52)));
                    }
                }
                rawShadE[idx] = shE;
                rawShadW[idx] = shW;
            }
        }

        // 3) Elevation-aware 3x3 penumbra smoothing (only averages samples sharing the same elevation plane)
        const lightBytes = new Uint8Array(LRES * LRES * 4);
        for (let ty = 0; ty < LRES; ty++) {
            for (let tx = 0; tx < LRES; tx++) {
                const idx = ty * LRES + tx;
                const bElev = rawElev[idx];
                let sumAO = 0.0, sumE = 0.0, sumW = 0.0, wTotal = 0.0;
                for (let dy = -1; dy <= 1; dy++) {
                    const ny = Math.min(LRES - 1, Math.max(0, ty + dy));
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = Math.min(LRES - 1, Math.max(0, tx + dx));
                        const nIdx = ny * LRES + nx;
                        if (Math.abs(rawElev[nIdx] - bElev) < 0.25) {
                            const w = (dx === 0 && dy === 0) ? 2.0 : 1.0;
                            sumAO += rawAO[nIdx] * w;
                            sumE += rawShadE[nIdx] * w;
                            sumW += rawShadW[nIdx] * w;
                            wTotal += w;
                        }
                    }
                }
                const invW = wTotal > 0 ? (1.0 / wTotal) : 1.0;
                const pOff = idx * 4;
                lightBytes[pOff]     = Math.min(255, Math.round((bElev / 6.0) * 255.0));
                lightBytes[pOff + 1] = Math.min(255, Math.round(sumAO * invW * 255.0));
                lightBytes[pOff + 2] = Math.min(255, Math.round(sumE * invW * 255.0));
                lightBytes[pOff + 3] = Math.min(255, Math.round(sumW * invW * 255.0));
            }
        }

        this.dayShadowMap = lightBytes;
        if (!this.dayLightTex) {
            this.dayLightTex = gl.createTexture();
        }
        gl.bindTexture(gl.TEXTURE_2D, this.dayLightTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LRES, LRES, 0, gl.RGBA, gl.UNSIGNED_BYTE, lightBytes);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    getDayShadeAtPixel(xPx, yPx) {
        if (!this.dayShadowMap) return 0.0;
        const tx = Math.min(511, Math.max(0, Math.floor((xPx / TILE_SIZE) * 2.0)));
        const ty = Math.min(511, Math.max(0, Math.floor((yPx / TILE_SIZE) * 2.0)));
        const off = (ty * 512 + tx) * 4;
        const ao = this.dayShadowMap[off + 1] / 255.0;
        const shE = this.dayShadowMap[off + 2] / 255.0;
        const shW = this.dayShadowMap[off + 3] / 255.0;
        return Math.min(1.0, Math.max(ao * 0.55, shW * 0.68 + shE * 0.32));
    }

    putBlockFace(verts, x, y_elev, z_south, face, b, extraYOffset = 0.0) {
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

            if (effTileIdx === 41) {
                animType = 1.0; // Animated water
                // Non-orthogonal organic curved water basins, park lagoons & canals with 3D stone coping border:
                // Encode 8-neighbor non-water mask (N1|S2|W4|E8|NW16|NE32|SW64|SE128) + surrounding ground type.
                if (y_elev === 1 && this.map) {
                    const wLid = (cx, cy) => {
                        if (cx < 0 || cx >= 256 || cy < 0 || cy >= 256) return 41;
                        const bi = this.map.getBlockIndex(cx, cy, y_elev);
                        if (!bi) return 41;
                        const nb = this.map.getBlockInfo(bi);
                        if (!nb) return 41;
                        if (nb.lid === 0 || nb.lid === 41 || nb.lid === 77 || (nb.lid >= 99 && nb.lid <= 101)) return 41;
                        return nb.lid;
                    };
                    const lN  = wLid(x, z_south - 1);
                    const lS  = wLid(x, z_south + 1);
                    const lW  = wLid(x - 1, z_south);
                    const lE  = wLid(x + 1, z_south);
                    const lNW = wLid(x - 1, z_south - 1);
                    const lNE = wLid(x + 1, z_south - 1);
                    const lSW = wLid(x - 1, z_south + 1);
                    const lSE = wLid(x + 1, z_south + 1);
                    let bits = 0;
                    if (lN  !== 41) bits += 1;
                    if (lS  !== 41) bits += 2;
                    if (lW  !== 41) bits += 4;
                    if (lE  !== 41) bits += 8;
                    if (lNW !== 41) bits += 16;
                    if (lNE !== 41) bits += 32;
                    if (lSW !== 41) bits += 64;
                    if (lSE !== 41) bits += 128;
                    if (bits > 0) {
                        const nbs = [lN, lS, lW, lE, lNW, lNE, lSW, lSE];
                        let surType = 0; // 0: city sidewalk (lid 8), 1: coral promenade (lid 9), 2: park lawn (lid 10), 3: golden sand (lid 98)
                        if (nbs.indexOf(98) >= 0) surType = 3;
                        else if (nbs.indexOf(10) >= 0) surType = 2;
                        else if (nbs.indexOf(9) >= 0 || nbs.indexOf(69) >= 0) surType = 1;
                        let paveBits = 0;
                        if (surType === 2) {
                            const isPave = (l) => (l === 8 || l === 9 || l === 69);
                            if (isPave(lN))  paveBits += 1;
                            if (isPave(lS))  paveBits += 2;
                            if (isPave(lW))  paveBits += 4;
                            if (isPave(lE))  paveBits += 8;
                            if (isPave(lNW)) paveBits += 16;
                            if (isPave(lNE)) paveBits += 32;
                            if (isPave(lSW)) paveBits += 64;
                            if (isPave(lSE)) paveBits += 128;
                        }
                        animType = 2000.0 + paveBits * 1024.0 + surType * 256.0 + bits;
                    }
                }
            }
            else if (effTileIdx === 22) animType = 2.0;                 // Animated rooftop fan
            else if (effTileIdx >= 99 && effTileIdx <= 101) animType = 4.0; // Beach shoreline (composites sand + surf over animated water on single quad)
            else if (!b.isFlat && effRemap === 0) {
                // Asphalt road lids: shader replaces the 64px texel base with one seamless world-space
                // asphalt surface (no visible tile squares at intersections) & keeps crisp lane paint.
                if (effTileIdx === 1 || effTileIdx === 24 || effTileIdx === 25 || effTileIdx === 74 || effTileIdx === 80) animType = 5.0;
                else if (effTileIdx === 2 || effTileIdx === 75 || effTileIdx === 81 || effTileIdx === 82) animType = 5.25;
                // Junction box tiles (lid 25) have no curb at all, so where a box side faces the pavement
                // (T-junctions, box wider than the crossing road) bare asphalt bulged into the sidewalk like a
                // pasted rectangle. Encode sides facing non-road blocks (10 + N1|S2|W4|E8) so the shader
                // continues the curb, gutter & yellow edge line straight through the junction.
                if (effTileIdx === 25 && this.map) {
                    const ROAD_LIDS = [1, 2, 24, 25, 74, 75, 80, 81, 82];
                    const nonRoad = (cx, cy) => {
                        const bi = this.map.getBlockIndex(cx, cy, y_elev);
                        if (!bi) return false;
                        const nb = this.map.getBlockInfo(bi);
                        return !!(nb && nb.lid && ROAD_LIDS.indexOf(nb.lid) < 0);
                    };
                    let bits = 0;
                    if (nonRoad(x, z_south - 1)) bits += 1;
                    if (nonRoad(x, z_south + 1)) bits += 2;
                    if (nonRoad(x - 1, z_south)) bits += 4;
                    if (nonRoad(x + 1, z_south)) bits += 8;
                    if (bits > 0) animType = 10.0 + bits;
                }
                // Coral promenade footpath (lid 9) meeting beach sand (lid 98..101) to the East:
                // feather the eastern end of the stone footpath into the sand so it doesn't end in a hard vertical line.
                if (effTileIdx === 9 && this.map) {
                    const eBi = this.map.getBlockIndex(x + 1, z_south, y_elev);
                    const eBlk = eBi ? this.map.getBlockInfo(eBi) : null;
                    if (eBlk && eBlk.lid >= 98 && eBlk.lid <= 101) {
                        animType = 28.0;
                    }
                }
                // Park & Lummus Park grass lawns (lid 10): encode 8-neighbor non-grass ground mask + surrounding
                // surface family (0: coral promenade lid 9, 1: beach sand on East + promenade on N/S/W, 2: city sidewalk lid 8)
                // so the shader rounds all 90° corners and curves straight lawn edges organically without tile seams.
                if (effTileIdx === 10 && y_elev === 1 && this.map) {
                    const nLid = (cx, cy) => {
                        const bi = this.map.getBlockIndex(cx, cy, y_elev);
                        if (!bi) return 10;
                        const nb = this.map.getBlockInfo(bi);
                        if (!nb) return 10;
                        // Only treat open walkable ground (sidewalk lid 8, coral promenade lid 9/69, beach sand lid 98..101)
                        // as surrounding non-grass terrain so walls, palms or 3D props never create false notches.
                        if (nb.lid === 8 || nb.lid === 9 || nb.lid === 69 || (nb.lid >= 98 && nb.lid <= 101)) {
                            return nb.lid;
                        }
                        return 10;
                    };
                    const lN  = nLid(x, z_south - 1);
                    const lS  = nLid(x, z_south + 1);
                    const lW  = nLid(x - 1, z_south);
                    const lE  = nLid(x + 1, z_south);
                    const lNW = nLid(x - 1, z_south - 1);
                    const lNE = nLid(x + 1, z_south - 1);
                    const lSW = nLid(x - 1, z_south + 1);
                    const lSE = nLid(x + 1, z_south + 1);

                    let bits = 0;
                    if (lN  !== 10) bits += 1;
                    if (lS  !== 10) bits += 2;
                    if (lW  !== 10) bits += 4;
                    if (lE  !== 10) bits += 8;
                    if (lNW !== 10) bits += 16;
                    if (lNE !== 10) bits += 32;
                    if (lSW !== 10) bits += 64;
                    if (lSE !== 10) bits += 128;

                    if (bits > 0) {
                        const isSandLid = (l) => (l >= 98 && l <= 101);
                        const isCoralLid = (l) => (l === 9 || l === 69);
                        let surType = 2; // city sidewalk (lid 8)
                        if (isSandLid(lE) || isSandLid(lNE) || isSandLid(lSE)) {
                            surType = 1; // beach sand on East, coral promenade on N/S/W
                        } else if (isCoralLid(lN) || isCoralLid(lS) || isCoralLid(lW) || isCoralLid(lE) ||
                                   isCoralLid(lNW) || isCoralLid(lNE) || isCoralLid(lSW) || isCoralLid(lSE) || x >= 215) {
                            surType = 0; // coral promenade (lid 9)
                        }
                        animType = 30.0 + surType * 256.0 + bits;
                    }
                }
            }

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
        let nOffX = 0.0, nOffY = extraYOffset || 0.0, nOffZ = 0.0;
        if (b.isFlat) {
            const kFlatFaceOffset = 0.003;
            if (face === 0) nOffX = -kFlatFaceOffset;
            else if (face === 1) nOffX = kFlatFaceOffset;
            else if (face === 2) nOffZ = -kFlatFaceOffset;
            else if (face === 3) nOffZ = kFlatFaceOffset;
            else nOffY += kFlatFaceOffset;
        }

        // Emit 2 triangles for quad: (0, 2, 1) and (1, 2, 3)
        const triOrder = [0, 2, 1, 1, 2, 3];
        for (let k = 0; k < 6; k++) {
            const c = triOrder[k];
            const pos = p[qi[c]];
            const uv = cornerUVs[c];
            verts.push(pos[0] + nOffX, pos[1] + nOffY, pos[2] + nOffZ, uv[0], uv[1], animType);
        }

        // 6. 3D Mitered Outer Parapet Coping (bridges & piers only; building roofs use 100% 3ds Max roof textures without stretched neon bands!)
        if (face === 4 && st === 0 && !b.isFlat && y_elev >= 2 && b.groundType === 4 && tileIdx !== 41 && tileIdx !== 22) {
            const hasW = b.faces[0] > 0;
            const hasE = b.faces[1] > 0;
            const hasN = b.faces[2] > 0;
            const hasS = b.faces[3] > 0;
            if (hasW || hasE || hasN || hasS) {
                const wPar = 0.095;
                const yCop = y_elev + 1.003;
                const emitParapetStrip = (sideTile, q0, q1, q2, q3) => {
                    const sAtlasIdx = (tiles.side_start || 0) + (sideTile % tiles.side_count);
                    const sCol = sAtlasIdx % 16;
                    const sRow = Math.floor(sAtlasIdx / 16);
                    const su0 = sCol / 16.0 + padU;
                    const su1 = (sCol + 1.0) / 16.0 - padU;
                    // Sample top sunlit Art Deco cornice (py=0.6) -> neon/frieze accent -> inner parapet shadow (py=7.2)
                    const svOuter = (sRow + 0.6 / 64.0) / 51.0;
                    const svInner = (sRow + 7.2 / 64.0) / 51.0;
                    const qPos = [q0, q1, q2, q3];
                    for (let k = 0; k < 6; k++) {
                        const c = triOrder[k];
                        const qp = qPos[c];
                        const qu = qp[3] ? su1 : su0;
                        const qv = qp[4] ? svInner : svOuter;
                        verts.push(qp[0], qp[1], qp[2], qu, qv, 0.0);
                    }
                };
                if (hasN) {
                    emitParapetStrip(
                        b.faces[2],
                        [xW, yCop, zN, 0, 0],
                        [xE, yCop, zN, 1, 0],
                        [xW + (hasW ? wPar : 0.0), yCop, zN + wPar, 0, 1],
                        [xE - (hasE ? wPar : 0.0), yCop, zN + wPar, 1, 1]
                    );
                }
                if (hasS) {
                    emitParapetStrip(
                        b.faces[3],
                        [xW + (hasW ? wPar : 0.0), yCop, zS - wPar, 0, 1],
                        [xE - (hasE ? wPar : 0.0), yCop, zS - wPar, 1, 1],
                        [xW, yCop, zS, 0, 0],
                        [xE, yCop, zS, 1, 0]
                    );
                }
                if (hasW) {
                    emitParapetStrip(
                        b.faces[0],
                        [xW, yCop, zN, 0, 0],
                        [xW + wPar, yCop, zN + (hasN ? wPar : 0.0), 0, 1],
                        [xW, yCop, zS, 1, 0],
                        [xW + wPar, yCop, zS - (hasS ? wPar : 0.0), 1, 1]
                    );
                }
                if (hasE) {
                    emitParapetStrip(
                        b.faces[1],
                        [xE - wPar, yCop, zN + (hasN ? wPar : 0.0), 0, 1],
                        [xE, yCop, zN, 0, 0],
                        [xE - wPar, yCop, zS - (hasS ? wPar : 0.0), 1, 1],
                        [xE, yCop, zS, 1, 0]
                    );
                }
            }
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
        const portraitPullback = aspect < 0.85 ? (0.85 - aspect) * 4.5 : 0.0;
        const distBlocks = Math.max(2.2, this.followHeightBlocks + this.zoomOffsetBlocks + portraitPullback);
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
        const texW = this.spritesTexW || this.gta1SpritesImg.width;
        const texH = this.spritesTexH || this.gta1SpritesImg.height;
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
            ctx.font = "bold 32px Consolas, 'Courier New', monospace";
            ctx.fillStyle = "#ff2a85";
            ctx.fillText("VICE CITY 26", cx + 2, cy - 42 + 2);
            ctx.fillStyle = "#00f0ff";
            ctx.fillText("VICE CITY 26", cx, cy - 42);

            ctx.font = "bold 14px Consolas, 'Courier New', monospace";
            ctx.fillStyle = "#fde047";
            const pct = Math.min(99, Math.round(((this.loadProgress || 0) / (this.loadTotal || 4)) * 100));
            ctx.fillText(`LOADING 3D VICE CITY 26 WORLD... ${pct}%`, cx, cy - 8);

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

        // 2A. Daytime Ambient Florida Sunlight, Volumetric Sunbeams & Tropical Sky-Shadow Atmosphere
        if ((this.nightFactor || 0) < 0.72 && !this.nightMode && !game.activeInterior) {
            this.renderDaylightAtmosphere(ctx, game);
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

        // Door transition fade (enter / exit interiors)
        if (game.fadeAlpha > 0.01) {
            ctx.save();
            ctx.fillStyle = `rgba(0,0,0,${Math.min(1, game.fadeAlpha)})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
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

        if (this.dayLightTex && this.cityLocs.uDayLightTex !== null && this.cityLocs.uDayLightTex !== undefined) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.dayLightTex);
            gl.uniform1i(this.cityLocs.uDayLightTex, 1);
            gl.activeTexture(gl.TEXTURE0);
        }

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

    renderMiamiPalmTree3D(x, y, baseZ, baseAngle = 0, scale = 1.0, seedIdx = 0, heightMul = 1.0) {
        if (!this.gta1Ready || !this.gta1Meta || !this.gta1Meta.sprites || !this.gta1Meta.sprites.objects) return;
        const palmRect = this.gta1Meta.sprites.objects["palm_tree"] || this.gta1Meta.sprites.objects["257"];
        if (!palmRect) return;

        const sc = scale || 1.0;
        const hm = Math.max(0.5, Math.min(1.8, heightMul || 1.0));
        const breeze = Math.sin(this.time * 1.65 + x * 0.013 + y * 0.019) * 0.055 * (0.8 + hm * 0.25);
        const leanAng = (seedIdx * 2.39996 + x * 0.01 + y * 0.02) % 6.28318;
        const leanX = Math.cos(leanAng) * 3.0 * sc * hm + Math.cos(this.time * 1.65 + y * 0.02) * 0.9 * hm;
        const leanY = Math.sin(leanAng) * 3.0 * sc * hm + Math.sin(this.time * 1.65 + x * 0.02) * 0.9 * hm;

        // 1. Soft Dappled Feathery Ground Shadow on Sidewalk / Lawn / Beach Sand (taller palms cast longer shadows)
        const nf = Math.max(0.0, Math.min(1.0, this.nightFactor || 0.0));
        const shadowAlpha = 0.27 * (1.0 - nf * 0.55);
        this.pushAtlasSprite3D(
            palmRect,
            x + 9.5 * sc * hm,
            y + 7.5 * sc * hm,
            baseZ + 0.018,
            baseAngle + breeze * 0.5,
            sc * 0.92,
            SPRITE_DRAW_ORDER.TIRE_MARKS,
            0.0,
            0.0,
            0.0,
            shadowAlpha
        );

        // 2. 3D Curved Ringed Coconut / Royal Palm Trunk rising from planter to crown (more rings on taller palms)
        const segs = Math.max(3, Math.round(4 * hm));
        for (let s = 0; s < segs; s++) {
            const t = s / (segs - 1);
            const tx = x + leanX * t;
            const ty = y + leanY * t;
            const tz = baseZ + 0.045 + t * 0.27 * hm;
            const sz = (7.2 - t * 2.0) * sc;
            const isRing = (s % 2) === 1;
            this.pushSolidQuad3D(
                tx,
                ty,
                tz,
                sz,
                sz,
                leanAng + s * 0.4,
                isRing ? 0.44 : 0.60,
                isRing ? 0.35 : 0.50,
                isRing ? 0.26 : 0.39,
                0.98,
                SPRITE_DRAW_ORDER.MAP_OBJECT
            );
        }

        // 3. Lower Shaded Under-Canopy Frond Tier (adds 3D parallax depth & lushness)
        this.pushAtlasSprite3D(
            palmRect,
            x + leanX * 0.86,
            y + leanY * 0.86,
            baseZ + 0.33 * hm,
            baseAngle + 0.45 - breeze * 0.6,
            sc * 0.94,
            SPRITE_DRAW_ORDER.TREES,
            0.68,
            0.84,
            0.70,
            0.95
        );

        // 4. Upper Sunlit Feathery Palm Crown + Central Coconut Cluster
        this.pushAtlasSprite3D(
            palmRect,
            x + leanX,
            y + leanY,
            baseZ + 0.42 * hm,
            baseAngle + breeze,
            sc * 1.04,
            SPRITE_DRAW_ORDER.TREES,
            1.0,
            1.0,
            1.0,
            1.0
        );
    }

    renderViceBeachActivities3D(game, minX, minY, maxX, maxY, sunCos, sunSin, sunShadowAngle, sunShadowAlpha, nfGlobal) {
        if (!this.gta1Ready || !this.map) return;
        const objs = this.gta1Meta && this.gta1Meta.sprites && this.gta1Meta.sprites.objects;
        if (!objs) return;

        // 1. Sunbathing Bikini Women on Beach Towels & Resort Sun Loungers under 3D Striped Beach Umbrellas
        if (Array.isArray(this.map.beachSunbathers)) {
            for (let i = 0; i < this.map.beachSunbathers.length; i++) {
                const sb = this.map.beachSunbathers[i];
                if (sb.x < minX - 48 || sb.x > maxX + 48 || sb.y < minY - 48 || sb.y > maxY + 48) continue;
                const bz = sb.z || 2.0;
                const ang = sb.angle || 0;

                // Main Beach Towel or White Sun Lounger flat on the sand (GROUND_DECALS = 1 so sunbathers always render on top!)
                this.batchObjectSprite3D(sb.towelSpr || "beach_towel_pink", sb.x, sb.y, bz + 0.015, ang, 1.15, SPRITE_DRAW_ORDER.GROUND_DECALS);

                // Sunbathing Bikini Woman lying lengthwise on the towel (frame 42 = custom top-down lying sunbather with sunglasses & two-piece bikini!)
                const tanSway = Math.sin(this.time * 1.5 + i * 1.3) * 0.04;
                if (sb.pose === "WAVE") {
                    const waveFr = 50 + (Math.floor(this.time * 4.2 + i) % 4);
                    this.pushSolidQuad3D(sb.x + sunCos * 4.5, sb.y + sunSin * 4.5, bz + 0.020, 10, 7, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchPedSprite3D(sb.pedType || "bikini_pink", waveFr, sb.x, sb.y, bz + 0.038, ang + tanSway, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                } else {
                    this.batchPedSprite3D(sb.pedType || "bikini_pink", 42, sb.x, sb.y, bz + 0.035, ang + tanSway, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }

                // Optional Companion Bikini Friend on adjacent towel (chatting or sunbathing in pairs!)
                if (sb.friendPedType) {
                    const perpX = -Math.sin(ang) * 25;
                    const perpY = Math.cos(ang) * 25;
                    const fx = sb.x + perpX;
                    const fy = sb.y + perpY;
                    this.batchObjectSprite3D(sb.friendTowelSpr || "beach_towel_yellow", fx, fy, bz + 0.015, ang, 1.15, SPRITE_DRAW_ORDER.GROUND_DECALS);
                    if ((i % 2) === 0) {
                        this.batchPedSprite3D(sb.friendPedType, 42, fx, fy, bz + 0.035, ang - tanSway, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    } else {
                        const chatFr = 50 + (Math.floor(this.time * 3.8 + i * 2) % 4);
                        this.pushSolidQuad3D(fx + sunCos * 4.5, fy + sunSin * 4.5, bz + 0.020, 10, 7, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.batchPedSprite3D(sb.friendPedType, chatFr, fx, fy, bz + 0.038, ang - Math.PI * 0.5, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }

                // Side Beach Activity Props (Surfboard, Beach Ball, Sandcastle, Cooler)
                if (sb.propSpr) {
                    const px = sb.x + (sb.propDx !== undefined ? sb.propDx : 24);
                    const py = sb.y + (sb.propDy !== undefined ? sb.propDy : -8);
                    this.batchObjectSprite3D(sb.propSpr, px, py, bz + 0.026, sb.propAngle || 0.35, sb.propScale || 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
                }
                if (sb.extraPropSpr) {
                    const ex = sb.x + (sb.extraPropDx !== undefined ? sb.extraPropDx : 22);
                    const ey = sb.y + (sb.extraPropDy !== undefined ? sb.extraPropDy : 18);
                    this.batchObjectSprite3D(sb.extraPropSpr, ex, ey, bz + 0.026, 0, 0.90, SPRITE_DRAW_ORDER.MAP_OBJECT);
                }

                // 3D Striped Beach Umbrella (with solar ground shadow + 3D rising pole + elevated canopy at head corner of towel!)
                if (sb.umbSpr) {
                    const ux = sb.x + (sb.umbDx !== undefined ? sb.umbDx : -22);
                    const uy = sb.y + (sb.umbDy !== undefined ? sb.umbDy : -14);
                    const umbRect = objs[sb.umbSpr] || objs["umbrella_pink"];
                    const umbRot = (i * 0.85) + Math.sin(this.time * 1.3 + i) * 0.04;
                    if (umbRect) {
                        this.pushAtlasSprite3D(
                            umbRect,
                            ux + sunCos * 10,
                            uy + sunSin * 10,
                            bz + 0.014,
                            umbRot,
                            0.92,
                            SPRITE_DRAW_ORDER.GROUND_DECALS,
                            0.0, 0.0, 0.0,
                            0.26 * (1.0 - nfGlobal * 0.6)
                        );
                    }
                    this.pushSolidQuad3D(ux, uy, bz + 0.05, 2.8, 2.8, 0, 0.92, 0.90, 0.84, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    this.pushSolidQuad3D(ux, uy, bz + 0.11, 2.4, 2.4, 0, 0.96, 0.94, 0.88, 0.98, SPRITE_DRAW_ORDER.TREES);
                    this.batchObjectSprite3D(sb.umbSpr, ux, uy, bz + 0.16, umbRot, 0.95, SPRITE_DRAW_ORDER.TREES);
                }
            }
        }

        // 2. Live Animated 3D Beach Volleyball Matches (2v2 Bikini Women & Surfers + 3D Raised Net + Parabolic Flying Volleyball!)
        if (Array.isArray(this.map.beachVolleyballCourts)) {
            for (let ci = 0; ci < this.map.beachVolleyballCourts.length; ci++) {
                const vc = this.map.beachVolleyballCourts[ci];
                if (vc.x < minX - 64 || vc.x > maxX + 64 || vc.y < minY - 64 || vc.y > maxY + 64) continue;
                const bz = vc.z || 2.0;

                // Court boundary lines in the golden sand (rotated Math.PI * 0.5 so North/South court halves match the 3D horizontal net!)
                this.batchObjectSprite3D("volleyball_court", vc.x, vc.y, bz + 0.014, Math.PI * 0.5, 1.34, SPRITE_DRAW_ORDER.GROUND_DECALS);

                // 3D Raised Volleyball Net & Posts across the center line (y = vc.y)
                this.pushSolidQuad3D(vc.x + sunCos * 7, vc.y + sunSin * 7, bz + 0.017, 46, 3.5, 0, 0.03, 0.04, 0.08, 0.30 * (1.0 - nfGlobal * 0.6), SPRITE_DRAW_ORDER.TIRE_MARKS);
                for (const postSide of [-22, 22]) {
                    const px = vc.x + postSide;
                    this.pushSolidQuad3D(px, vc.y, bz + 0.05, 3.6, 3.6, 0, 0.88, 0.72, 0.22, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    this.pushSolidQuad3D(px, vc.y, bz + 0.14, 3.2, 3.2, 0, 0.94, 0.80, 0.26, 0.98, SPRITE_DRAW_ORDER.TREES);
                    this.pushSolidQuad3D(px, vc.y, bz + 0.22, 3.0, 3.0, 0, 0.98, 0.86, 0.32, 0.98, SPRITE_DRAW_ORDER.TREES);
                }
                // Net mesh bands & crisp white top tape
                this.pushSolidQuad3D(vc.x, vc.y, bz + 0.12, 44, 1.8, 0, 0.18, 0.22, 0.28, 0.78, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(vc.x, vc.y, bz + 0.17, 44, 1.8, 0, 0.22, 0.26, 0.32, 0.82, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(vc.x, vc.y, bz + 0.22, 45, 2.4, 0, 0.98, 0.98, 1.00, 0.98, SPRITE_DRAW_ORDER.TREES);

                // Rally animation timing (ball flies North <-> South over the net)
                const rallyPhase = (this.time * 1.45 + ci * 0.73) % 2.0;
                const goingSouth = rallyPhase < 1.0;
                const flight = goingSouth ? rallyPhase : (2.0 - rallyPhase);
                const rallyCycle = Math.floor(this.time * 1.45 + ci * 0.73);
                const northLeftActive = (rallyCycle % 2) === 0;
                const southRightActive = ((rallyCycle + 1) % 2) === 0;

                const players = [
                    { ped: vc.p0 || "bikini_pink",   bx: vc.x - 11, by: vc.y - 21, face: Math.PI * 0.5,  isNorth: true,  active: northLeftActive },
                    { ped: vc.p1 || "bikini_yellow", bx: vc.x + 11, by: vc.y - 19, face: Math.PI * 0.5,  isNorth: true,  active: !northLeftActive },
                    { ped: vc.p2 || "bikini_cyan",   bx: vc.x - 11, by: vc.y + 20, face: -Math.PI * 0.5, isNorth: false, active: !southRightActive },
                    { ped: vc.p3 || "surfer_guy",    bx: vc.x + 11, by: vc.y + 22, face: -Math.PI * 0.5, isNorth: false, active: southRightActive }
                ];

                let northTargetX = vc.x;
                let southTargetX = vc.x;

                for (let pi = 0; pi < 4; pi++) {
                    const pl = players[pi];
                    const moveX = Math.sin(this.time * 3.2 + pi * 1.7 + ci) * 4.5;
                    const moveY = Math.cos(this.time * 2.8 + pi * 1.3 + ci) * 3.2;
                    const px = pl.bx + moveX;
                    const py = pl.by + moveY;
                    if (pl.isNorth && pl.active) northTargetX = px;
                    if (!pl.isNorth && pl.active) southTargetX = px;

                    // Player jumps in 3D when spiking/receiving the volleyball!
                    const distToHit = pl.isNorth ? flight : (1.0 - flight);
                    const jumpZ = (pl.active && distToHit < 0.24)
                        ? Math.sin((1.0 - distToHit / 0.24) * Math.PI) * 0.14
                        : 0.0;
                    const fr = (jumpZ > 0.03)
                        ? (50 + (Math.floor(this.time * 8 + pi) % 4))
                        : (Math.floor(this.time * 6 + pi * 2) % 8);

                    this.pushSolidQuad3D(px + sunCos * 5, py + sunSin * 5, bz + 0.020, 10, 7, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchPedSprite3D(pl.ped, fr, px, py, bz + 0.040 + jumpZ, pl.face, 1.06 + jumpZ * 0.4, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }

                // 3D Flying Volleyball arcing over the net + ground shadow on the sand!
                const ballX = northTargetX + (southTargetX - northTargetX) * flight;
                const ballY = (vc.y - 20) + flight * 40;
                const ballArcZ = Math.sin(flight * Math.PI) * 0.34;
                this.pushSolidQuad3D(ballX + sunCos * 8, ballY + sunSin * 8, bz + 0.020, 6.5, 6.5, 0, 0.03, 0.04, 0.08, 0.36 * (1.0 - nfGlobal * 0.5), SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("beach_ball", ballX, ballY, bz + 0.08 + ballArcZ, this.time * 5.0 + ci, 0.82 + ballArcZ * 0.35, SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 3. Beach Aerobics & Retro Boombox Dance Parties on the Sand
        if (Array.isArray(this.map.beachParties)) {
            for (let pi = 0; pi < this.map.beachParties.length; pi++) {
                const bp = this.map.beachParties[pi];
                if (bp.x < minX - 56 || bp.x > maxX + 56 || bp.y < minY - 56 || bp.y > maxY + 56) continue;
                const bz = bp.z || 2.0;

                // Retro 80s/90s Miami Boombox on a coral mat + cooler + pulsing neon sound rings
                const boomX = bp.x - 14;
                const boomY = bp.y;
                this.batchObjectSprite3D("beach_towel_coral", boomX, boomY, bz + 0.015, 0, 0.95, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(boomX, boomY, bz + 0.045, 11.0, 6.0, Math.PI * 0.5, 0.16, 0.18, 0.22, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(boomX, boomY - 3.2, bz + 0.055, 3.6, 3.6, 0, 0.06, 0.07, 0.09, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(boomX, boomY + 3.2, bz + 0.055, 3.6, 3.6, 0, 0.06, 0.07, 0.09, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                const beatPulse = 0.5 + 0.5 * Math.sin(this.time * 8.5 + pi);
                this.pushSolidQuad3D(boomX, boomY, bz + 0.062, 2.4, 4.2, 0, 1.0, 0.20 + beatPulse * 0.6, 0.75, 0.98, SPRITE_DRAW_ORDER.HUD_ARROW);
                this.batchObjectSprite3D("beach_cooler", boomX - 4, boomY + 14, bz + 0.030, 0.2, 0.92, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.batchObjectSprite3D("sandcastle", boomX - 4, boomY - 15, bz + 0.028, 0, 0.95, SPRITE_DRAW_ORDER.MAP_OBJECT);

                // Bikini Aerobics Instructor facing East toward dancers
                const instSway = Math.sin(this.time * 5.5) * 3.0;
                const instFr = 50 + (Math.floor(this.time * 6.5) % 4);
                this.pushSolidQuad3D(bp.x - 4 + sunCos * 4.5, bp.y + instSway + sunSin * 4.5, bz + 0.020, 10, 7, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchPedSprite3D("bikini_red", instFr, bp.x - 4, bp.y + instSway, bz + 0.040, 0, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);

                // Synchronized Bikini & Surfer Dancers in a 2x2 formation
                const dancerPeds = ["bikini_pink", "bikini_cyan", "bikini_yellow", "surfer_guy", "bikini_white"];
                for (let di = 0; di < 4; di++) {
                    const row = (di % 2) === 0 ? -11 : 11;
                    const col = di < 2 ? 12 : 24;
                    const stepX = Math.cos(this.time * 5.5 + di * 0.8) * 2.5;
                    const stepY = Math.sin(this.time * 5.5 + di * 0.4) * 3.5;
                    const dx = bp.x + col + stepX;
                    const dy = bp.y + row + stepY;
                    const dFr = ((di + Math.floor(this.time * 3.0)) % 2 === 0)
                        ? (50 + (Math.floor(this.time * 6.5 + di) % 4))
                        : (Math.floor(this.time * 7.0 + di * 2) % 8);
                    const dAng = Math.PI + Math.sin(this.time * 2.8 + di) * 0.35;
                    this.pushSolidQuad3D(dx + sunCos * 4.5, dy + sunSin * 4.5, bz + 0.020, 10, 7, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchPedSprite3D(dancerPeds[(di + pi) % dancerPeds.length], dFr, dx, dy, bz + 0.040, dAng, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }

        // 4. Atlantic & Bay Wave Surfers & Shallow-Water Bikini Swimmers
        if (Array.isArray(this.map.beachSwimmers)) {
            for (let si = 0; si < this.map.beachSwimmers.length; si++) {
                const sw = this.map.beachSwimmers[si];
                if (sw.x < minX - 48 || sw.x > maxX + 48 || sw.y < minY - 48 || sw.y > maxY + 48) continue;
                const bz = sw.z || 2.0;
                const waveT = this.time * 2.1 + si * 1.37;
                const bobX = Math.sin(waveT) * 5.5;
                const bobY = Math.cos(waveT * 0.8) * 2.8;
                const wx = sw.x + bobX;
                const wy = sw.y + bobY;

                // Animated white ocean foam / water ripple ring around swimmer or surfboard
                const rippleSize = 14.0 + Math.sin(waveT * 1.6) * 3.5;
                this.pushSolidQuad3D(wx, wy, bz + 0.014, rippleSize, rippleSize * 0.72, sw.angle || 0, 0.85, 0.97, 1.0, 0.42, SPRITE_DRAW_ORDER.TIRE_MARKS);

                if (sw.isSurfer) {
                    const surfAng = (sw.angle || Math.PI) + Math.sin(waveT) * 0.12;
                    this.batchObjectSprite3D(sw.boardSpr || "surfboard_pink", wx, wy, bz + 0.022, surfAng + Math.PI * 0.5, 1.08, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    const surfFr = (si % 2 === 0) ? (50 + (Math.floor(this.time * 4.5 + si) % 4)) : 42;
                    this.batchPedSprite3D(sw.pedType || "surfer_guy", surfFr, wx, wy, bz + 0.036, surfAng, 1.02, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                } else {
                    const swimFr = 50 + (Math.floor(this.time * 4.2 + si) % 4);
                    this.batchPedSprite3D(sw.pedType || "bikini_cyan", swimFr, wx, wy, bz + 0.026, (sw.angle || 0) + Math.sin(waveT) * 0.25, 1.00, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }
    }

    /* GTA 2 (1999) remap pedestrian archetypes (remaps 0..52 from the GTA 2 .sty files + Vice City '86 extras).
       sleeves: long | short | tank | bare     legs: pants | shorts
       hairMode: (hair colour) | bald | hood | helmet     pattern: hawaiian | stripes | jacket | hivis | plaid */
    getGta2PedArchetypes() {
        if (this._g2Archs) return this._g2Archs;
        const SK = {
            light: [238, 190, 152],
            tan: [214, 152, 106],
            brown: [164, 104, 66],
            dark: [106, 64, 40]
        };
        const H = {
            black: [24, 22, 28],
            brown: [96, 58, 30],
            auburn: [150, 60, 28],
            red: [196, 70, 30],
            blond: [236, 196, 92],
            grey: [176, 176, 184],
            white: [236, 236, 242]
        };
        const JEANS = [52, 84, 150];
        const KHAKI = [196, 166, 114];
        this._g2Archs = [
            // --- GTA 2 special remaps (0..25): gangs, emergency services & street icons ---
            { key: "g2_elvis",        shirt: [242, 242, 236], pants: [242, 242, 236], sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light, pattern: "jacket", shirt2: [232, 180, 40] },
            { key: "g2_krishna",      shirt: [255, 142, 22],  pants: [255, 142, 22],  sleeves: "short", legs: "pants",  hairMode: "bald", skin: SK.tan },
            { key: "g2_medic",        shirt: [244, 246, 250], pants: [244, 246, 250], sleeves: "short", legs: "pants",  hair: H.brown, skin: SK.light, pattern: "hivis", shirt2: [226, 34, 44] },
            { key: "g2_fireman",      shirt: [150, 112, 52],  pants: [96, 74, 40],    sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [250, 204, 24], skin: SK.light, pattern: "hivis", shirt2: [236, 238, 120] },
            { key: "g2_swat",         shirt: [34, 38, 50],    pants: [34, 38, 50],    sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [26, 28, 36], skin: SK.light },
            { key: "g2_army",         shirt: [92, 104, 52],   pants: [80, 90, 46],    sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [70, 82, 40], skin: SK.tan, pattern: "plaid", shirt2: [66, 74, 36] },
            { key: "g2_scientist",    shirt: [240, 244, 246], pants: [112, 114, 124], sleeves: "long",  legs: "pants",  hair: H.grey, skin: SK.light, pattern: "jacket", shirt2: [120, 170, 200] },
            { key: "g2_zaibatsu",     shirt: [30, 30, 36],    pants: [76, 78, 88],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light, pattern: "jacket", shirt2: [210, 210, 214] },
            { key: "g2_yakuza",       shirt: [30, 44, 96],    pants: [24, 30, 64],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light, pattern: "jacket", shirt2: [236, 236, 236] },
            { key: "g2_loony",        shirt: [84, 206, 96],   pants: [238, 238, 230], sleeves: "short", legs: "pants",  hair: H.red, skin: SK.light },
            { key: "g2_russian",      shirt: [98, 62, 36],    pants: [44, 44, 52],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light },
            { key: "g2_redneck_red",  shirt: [238, 236, 226], pants: JEANS,           sleeves: "tank",  legs: "pants",  hair: H.red, skin: SK.light },
            { key: "g2_redneck_blond",shirt: [200, 40, 40],   pants: JEANS,           sleeves: "short", legs: "pants",  hair: H.blond, skin: SK.light, pattern: "plaid", shirt2: [40, 30, 34] },
            { key: "g2_prisoner",     shirt: [255, 116, 24],  pants: [255, 116, 24],  sleeves: "short", legs: "pants",  hairMode: "bald", skin: SK.brown },
            { key: "g2_mugger",       shirt: [36, 36, 42],    pants: [62, 66, 80],    sleeves: "long",  legs: "pants",  hairMode: "hood", skin: SK.tan },
            { key: "g2_hulk",         shirt: [96, 204, 64],   pants: [118, 44, 158],  sleeves: "bare",  legs: "shorts", hair: H.black, skin: [96, 204, 64] },
            // --- GTA 2 civilian dummy remaps (26..52) ---
            { key: "g2_civ_redtee",   shirt: [232, 96, 96],   pants: KHAKI,           sleeves: "short", legs: "shorts", hair: H.brown, skin: SK.light },
            { key: "g2_civ_blueshorts",shirt: [64, 120, 220], pants: [54, 92, 190],   sleeves: "short", legs: "shorts", hair: H.blond, skin: SK.tan },
            { key: "g2_civ_yellowtee",shirt: [246, 214, 60],  pants: KHAKI,           sleeves: "short", legs: "shorts", hair: H.black, skin: SK.dark },
            { key: "g2_civ_lilac",    shirt: [190, 150, 222], pants: JEANS,           sleeves: "long",  legs: "pants",  hair: H.auburn, skin: SK.light },
            { key: "g2_civ_burgundy", shirt: [128, 30, 50],   pants: [176, 144, 100], sleeves: "short", legs: "pants",  hair: H.black, skin: SK.brown },
            { key: "g2_civ_aqua",     shirt: [60, 210, 210],  pants: JEANS,           sleeves: "long",  legs: "pants",  hair: H.brown, skin: SK.tan },
            { key: "g2_civ_greysuit", shirt: [124, 128, 140], pants: [80, 82, 92],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light, pattern: "jacket", shirt2: [236, 236, 240] },
            { key: "g2_civ_pink",     shirt: [246, 132, 186], pants: JEANS,           sleeves: "long",  legs: "pants",  hair: H.blond, skin: SK.light },
            { key: "g2_civ_darkgreen",shirt: [36, 96, 52],    pants: [190, 160, 210], sleeves: "short", legs: "pants",  hair: H.black, skin: SK.dark },
            { key: "g2_civ_granny",   shirt: [196, 168, 220], pants: [230, 230, 236], sleeves: "long",  legs: "pants",  hair: H.white, skin: SK.light },
            // --- Vice City '86 street extras ---
            { key: "vc_hawaiian_red", shirt: [222, 44, 52],   shirt2: [255, 226, 80], shirt3: [40, 160, 80], pants: [236, 232, 220], sleeves: "short", legs: "pants",  hair: H.brown, skin: SK.tan, pattern: "hawaiian" },
            { key: "vc_tourist",      shirt: [70, 150, 230],  shirt2: [250, 250, 250], shirt3: [255, 120, 180], pants: KHAKI, sleeves: "short", legs: "shorts", hairMode: "bald", skin: [246, 176, 150], pattern: "hawaiian" },
            { key: "vc_tommy",        shirt: [40, 170, 210],  shirt2: [30, 110, 60], shirt3: [240, 240, 230], pants: JEANS, sleeves: "short", legs: "pants", hair: H.black, skin: SK.tan, pattern: "hawaiian" },
            { key: "vc_crockett",     shirt: [242, 240, 234], shirt2: [250, 150, 190], pants: [242, 240, 234], sleeves: "long", legs: "pants", hair: H.blond, skin: SK.tan, pattern: "jacket" },
            { key: "vc_tubbs",        shirt: [70, 72, 86],    shirt2: [60, 200, 220], pants: [70, 72, 86], sleeves: "long", legs: "pants", hair: H.black, skin: SK.dark, pattern: "jacket" },
            { key: "vc_jogger",       shirt: [255, 60, 160],  pants: [30, 30, 36],    sleeves: "tank",  legs: "shorts", hair: H.blond, skin: SK.tan },
            { key: "vc_sailor",       shirt: [244, 244, 248], shirt2: [34, 54, 120], pants: [214, 40, 50], sleeves: "short", legs: "shorts", hair: H.auburn, skin: SK.light, pattern: "stripes" },
            { key: "vc_cuban",        shirt: [40, 150, 70],   shirt2: [250, 250, 240], shirt3: [250, 200, 60], pants: [30, 30, 34], sleeves: "short", legs: "pants", hair: H.black, skin: SK.brown, pattern: "hawaiian" },
            { key: "vc_haitian",      shirt: [26, 82, 40],    pants: [38, 44, 40],    sleeves: "tank",  legs: "pants",  hair: H.black, skin: SK.dark },
            { key: "vc_bodybuilder",  shirt: [250, 220, 40],  pants: [214, 40, 50],   sleeves: "bare",  legs: "shorts", hairMode: "bald", skin: SK.brown }
        ];
        return this._g2Archs;
    }

    // Weighted spawn pools for the GTA 2 remap archetypes
    pickGta2PedType(ped, isGang) {
        const gangPool = [
            "g2_zaibatsu", "g2_yakuza", "g2_loony", "g2_russian",
            "g2_redneck_red", "g2_redneck_blond", "vc_cuban", "vc_haitian", "g2_mugger"
        ];
        const civPool = [
            "g2_civ_redtee", "g2_civ_blueshorts", "g2_civ_yellowtee", "g2_civ_lilac", "g2_civ_burgundy",
            "g2_civ_aqua", "g2_civ_greysuit", "g2_civ_pink", "g2_civ_darkgreen", "g2_civ_granny",
            "vc_hawaiian_red", "vc_tourist", "vc_tommy", "vc_crockett", "vc_tubbs", "vc_jogger",
            "vc_sailor", "vc_bodybuilder",
            "g2_civ_redtee", "g2_civ_greysuit", "vc_hawaiian_red", "vc_tourist", "g2_civ_aqua", "g2_civ_pink",
            // rarer street icons & off-duty services
            "g2_elvis", "g2_krishna", "g2_medic", "g2_fireman", "g2_scientist", "g2_prisoner",
            "g2_swat", "g2_army", "g2_hulk",
            // keep a few original GTA 1 civilians in the mix
            "civ0", "civ1", "civ2", "civ3"
        ];
        const pool = isGang ? gangPool : civPool;
        const seed = Math.abs(Math.floor((ped.animSeed || 0) * 7919 + (ped.turnSeed || 0) * 131 + (ped.x || 0) * 0.37));
        const key = pool[seed % pool.length];
        return (this.gta1Meta && this.gta1Meta.sprites && this.gta1Meta.sprites.peds && this.gta1Meta.sprites.peds[key]) ? key : null;
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
                const mrgb = intr.matRGB || [0.96, 0.25, 0.65];
                if (intr.isShop) {
                    // Real storefront door: vertical quads standing against the building's south wall
                    const wallY = Math.floor(intr.doorY / TILE_SIZE) * TILE_SIZE + 1.6;
                    const variants = [[0, 0, 0]];
                    for (const [zAdj, yAdj, xAdj] of variants) {
                    const gz = dz - 0.03 + zAdj;
                    const vq = (w, zc, halfH, rr, gg, bb, aa, yOff = 0) =>
                        this.pushSpriteQuad3D(intr.doorX + xAdj, wallY + yOff + yAdj, gz + zc, w, 0.4, 0, -1, -1, -1, -1, rr, gg, bb, aa, SPRITE_DRAW_ORDER.MAP_OBJECT, halfH);
                    vq(48, 1.02, 0.11, mrgb[0], mrgb[1], mrgb[2], 1.0, 0.00); // shop sign band
                    vq(38, 0.48, 0.50, 0.20, 0.15, 0.12, 1.0, 0.02);           // door frame
                    vq(31, 0.46, 0.46, 0.0, 0.0, 0.0, 1.0, 0.05);              // black doorway
                    vq(3, 0.42, 0.04, 0.95, 0.80, 0.25, 1.0, 0.08);           // brass handle
                    }
                    // Lit threshold step on the sidewalk
                    this.pushSolidQuad3D(intr.doorX, intr.doorY - 24, dz, 36, 8, 0, 0.12, 0.10, 0.09, 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    continue;
                }
                this.pushSolidQuad3D(intr.doorX, intr.doorY, dz, 26, 26, this.time * 1.2, mrgb[0], mrgb[1], mrgb[2], pulse, SPRITE_DRAW_ORDER.MAP_OBJECT);
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
            if (ped.deathKind === "DROWNED") continue; // sank below the surface
            if (ped.deathRenderT === undefined) ped.deathRenderT = this.time;
            const pz = this.getEntityZ(ped, 0.025);
            let pedType = ped.g24Type || "civ2";
            if (ped.kind === "MONK") pedType = "monk";
            else if (ped.kind === "COP") pedType = "police";
            if (ped.deathKind === "BURNT" || ped.deathKind === "ELECTRO") {
                // GTA 2 charred corpse: scorched ash mark, blackened body & rising smoke wisps
                const age = this.time - ped.deathRenderT;
                this.pushSolidQuad3D(ped.x, ped.y, pz, 15, 15, ped.angle, 0.07, 0.06, 0.06, 0.26, SPRITE_DRAW_ORDER.CORPSE);
                this.pushSolidQuad3D(ped.x, ped.y, pz, 15, 15, ped.angle + 0.785, 0.07, 0.06, 0.06, 0.26, SPRITE_DRAW_ORDER.CORPSE);
                this.batchPedSprite3D(pedType, 42, ped.x, ped.y, pz + 0.005, ped.angle, 1.30, false, SPRITE_DRAW_ORDER.CORPSE, 0.2, 0.17, 0.15);
                if (age < 9.0) {
                    const smokeFr = 200 + (Math.floor(age * 6 + (ped.animSeed || 0) * 10) % 11);
                    const rise = (age * 0.7) % 1.0;
                    this.batchObjectSprite3D(String(smokeFr), ped.x + Math.sin(age * 2.0) * 3, ped.y - rise * 10, pz + 0.05 + rise * 0.12, 0, 0.55 + rise * 0.4, SPRITE_DRAW_ORDER.EXPLOSION);
                    if (ped.deathKind === "BURNT" && age < 2.5) {
                        const fireFrame = 234 + (Math.floor(this.time * 14 + (ped.animSeed || 0) * 10) % 8);
                        this.batchObjectSprite3D(String(fireFrame), ped.x, ped.y, pz + 0.02, 0, 0.62 * (1.0 - age / 2.5) + 0.2, SPRITE_DRAW_ORDER.EXPLOSION);
                    }
                }
                continue;
            }
            this.batchObjectSprite3D("444", ped.x, ped.y, pz, ped.angle, 1.0, SPRITE_DRAW_ORDER.CORPSE);
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
            const pbx = Math.floor(ped.x / TILE_SIZE);
            const pby = Math.floor(ped.y / TILE_SIZE);
            const isBeachZone =
                ped.missionTag === "BEACH" ||
                ped.x >= 218.2 * TILE_SIZE ||
                (this.map && this.map.coastalSandMask && this.map.coastalSandMask[pby * MAP_COLS + pbx] === 1) ||
                (pbx >= 182 && pbx <= 195 && pby >= 98 && pby <= 128);

            if (ped.kind === "CIVILIAN" && isBeachZone && (!pedType || pedType.startsWith("civ") || pedType === "gang")) {
                const beachPool = [
                    "bikini_pink", "bikini_cyan", "bikini_yellow",
                    "bikini_red", "bikini_white", "bikini_pink", "surfer_guy"
                ];
                const bh = Math.abs(Math.floor((ped.turnSeed || 1) * 17 + ped.animSeed * 313)) % beachPool.length;
                pedType = beachPool[bh];
                ped.g24Type = pedType;
            } else if ((ped.kind === "CIVILIAN" || ped.kind === "HOSTILE") && !ped.g2Remapped && (!pedType || pedType.startsWith("civ") || pedType === "gang")) {
                // GTA 2 (1999) remap variety: re-dress generic GTA 1 civilians & gang members once
                ped.g2Remapped = true;
                const isGang = ped.kind === "HOSTILE" || pedType === "gang";
                const g2Type = this.pickGta2PedType(ped, isGang);
                if (g2Type) {
                    pedType = g2Type;
                    ped.g24Type = pedType;
                }
            }
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

            // GTA 2 ePedestrianState_Electrocuted: frozen, shaking, flashing between body & X-ray skeleton
            if ((ped.electroTimer || 0) > 0) {
                const jx = (Math.random() - 0.5) * 2.4;
                const jy = (Math.random() - 0.5) * 2.4;
                const showSkeleton = (Math.floor(this.time * 16) % 2) === 0;
                const glowA = 0.16 + Math.random() * 0.12;
                this.pushSolidQuad3D(ped.x, ped.y, pz + 0.004, 18, 18, 0, 0.25, 0.65, 1.0, glowA, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(ped.x, ped.y, pz + 0.004, 18, 18, 0.785, 0.25, 0.65, 1.0, glowA, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchPedSprite3D(showSkeleton ? "g2_xray" : pedType, 98, ped.x + jx, ped.y + jy, pz, ped.angle, pedScale, false, SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN, showSkeleton ? 1.0 : 0.7, showSkeleton ? 1.0 : 0.85, 1.0);
                for (let k = 0; k < 3; k++) {
                    const a = Math.random() * Math.PI * 2;
                    const rr = 6 + Math.random() * 7;
                    this.pushSolidQuad3D(ped.x + Math.cos(a) * rr, ped.y + Math.sin(a) * rr, pz + 0.03, 7 + Math.random() * 6, 1.3, a + Math.PI * 0.5, 0.75, 0.92, 1.0, 0.95, SPRITE_DRAW_ORDER.HUD_ARROW);
                }
                continue;
            }

            // GTA 2 ePedestrianState_Drowning: arms flailing, splash rings, slowly sinking & fading to blue
            if ((ped.drownTimer || 0) > 0) {
                const prog = Math.max(0, Math.min(1, 1.0 - ped.drownTimer / 2.6));
                const flail = 50 + (Math.floor(this.time * 9 + ped.animSeed * 10) % 4);
                const bob = Math.sin(this.time * 9.0 + ped.animSeed) * 1.6;
                for (let k = 0; k < 2; k++) {
                    const ringT = (this.time * 1.4 + k * 0.5 + ped.animSeed) % 1.0;
                    const rs = 10 + ringT * 18;
                    this.pushSolidQuad3D(ped.x, ped.y, pz - 0.018, rs, rs, 0.785, 0.88, 0.97, 1.0, 0.3 * (1.0 - ringT), SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(ped.x, ped.y, pz - 0.018, rs, rs, 0, 0.88, 0.97, 1.0, 0.3 * (1.0 - ringT), SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
                this.batchPedSprite3D(pedType, flail, ped.x, ped.y + bob, pz - prog * 0.03, ped.angle, pedScale * (1.0 - prog * 0.45), false, pedDrawOrder, 1.0 - prog * 0.6, 1.0 - prog * 0.25, 1.0);
                continue;
            }

            // GTA 2 human torch: the burning body chars progressively darker while running in panic
            if ((ped.burnTimer || 0) > 0) {
                const charFrac = Math.max(0, Math.min(1, 1.0 - ped.burnTimer / 3.2));
                const k = 1.0 - charFrac * 0.72;
                pr *= k * 1.04;
                pg *= k * 0.9;
                pb *= k * 0.82;
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
                const fireFrame = 234 + (Math.floor(this.time * 14 + (ped.animSeed || 0) * 10) % 8);
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
                jason.pedType || "jason",
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

        // 4B. Online Multiplayer Remote Players & Rival Bots (On-Foot & In-Vehicle 3D Sync)
        if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
            for (const rp of game.net.remotePlayers.values()) {
                if (rp.x < minX || rp.x > maxX || rp.y < minY || rp.y > maxY) continue;
                const rz = this.getEntityZ(rp, 0.05);
                if (rp.dead) {
                    this.batchObjectSprite3D("444", rp.x, rp.y, rz - 0.02, rp.angle || 0, 1.0, SPRITE_DRAW_ORDER.CORPSE);
                    this.batchPedSprite3D(rp.pedType || "gang", 42, rp.x, rp.y, rz - 0.015, rp.angle || 0, 1.30, false, SPRITE_DRAW_ORDER.CORPSE);
                    continue;
                }
                if (rp.veh) {
                    if (rp._linkedWorldVeh) continue;
                    const rv = rp.veh;
                    const mapInfo = this.getVehicleG24Mapping(rv);
                    const vehEntry = this.vehicleBySprIdx ? this.vehicleBySprIdx[mapInfo.sprId] : null;
                    let rect = null;
                    if (vehEntry) {
                        rect = (vehEntry.remaps && vehEntry.remaps[(mapInfo.remapIdx || 0) % vehEntry.remaps.length]) || vehEntry.base;
                    } else if (this.gta1Meta.sprites.objects[mapInfo.sprId]) {
                        rect = this.gta1Meta.sprites.objects[mapInfo.sprId];
                    }
                    if (rect) {
                        const vw = rv.w || 48;
                        const vh = rv.h || 24;
                        this.pushSolidQuad3D(rp.x, rp.y, rz - 0.022, vw * 0.94, vh * 0.92, rp.angle, 0.02, 0.03, 0.06, 0.36, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushSolidQuad3D(rp.x + sunCos * 4.6, rp.y + sunSin * 4.6, rz - 0.026, vw * 0.90, vh * 0.88, rp.angle, 0.03, 0.04, 0.08, Math.max(0.28, sunShadowAlpha * 1.18), SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushAtlasSprite3D(rect, rp.x, rp.y, rz + 0.01, rp.angle - Math.PI * 0.5, 1.0, SPRITE_DRAW_ORDER.CAR, 1, 1, 1, 1, 0);
                        if (rv.isMoto) {
                            this.batchPedSprite3D(rp.pedType || "gang", 84, rp.x, rp.y, rz + 0.035, rp.angle, 1.14, (rp.muzzleTimer || 0) > 0, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
                        }
                    }
                } else {
                    if (nfGlobal < 0.88) {
                        this.pushSolidQuad3D(rp.x + sunCos * 3.5, rp.y + sunSin * 3.5, rz - 0.022, 11.4, 8.8, sunShadowAngle, 0.03, 0.04, 0.08, sunShadowAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                    const rWep = (rp.muzzleTimer || 0) > 0 ? (rp.weapon || "PISTOL") : "FIST";
                    const rFrame = this.getPedFrameIndex(rWep, Boolean(rp.isMoving), Boolean(rp.isRunning), rp.walkPhase || 0);
                    this.batchPedSprite3D(
                        rp.pedType || "gang",
                        rFrame,
                        rp.x,
                        rp.y,
                        rz,
                        rp.angle || 0,
                        pedScale * 1.14,
                        (rp.muzzleTimer || 0) > 0,
                        SPRITE_DRAW_ORDER.PEDESTRIAN
                    );
                }
            }
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

            const pCharScale = p.pedType === "bigsmoke" ? 1.22 : 1.15;
            this.batchPedSprite3D(
                p.pedType || "lucia",
                frameIdx,
                p.x,
                p.y,
                baseZ + jumpZ,
                p.angle,
                pedScale * pCharScale,
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
            let dmgRect = null;
            let doorRect = null;
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

                // 1) Permanent Factory Paint Sprite (NEVER replaced by base-colored damage/door sprites!)
                if (mapInfo.useBaseObject) {
                    rect = (vehEntry && vehEntry.base) || this.gta1Meta.sprites.objects[mapInfo.sprId];
                } else if (vehEntry) {
                    rect = (vehEntry.remaps && vehEntry.remaps[(mapInfo.remapIdx || 0) % vehEntry.remaps.length]) || vehEntry.base;
                } else if (this.gta1Meta.sprites.objects[mapInfo.sprId]) {
                    rect = this.gta1Meta.sprites.objects[mapInfo.sprId];
                }

                // 2) Localized .G24 Crash Damage Delta Overlay (Front Dent, Rear Dent, Heavy Front+Rear!)
                if (vehEntry && vehEntry.damage) {
                    if (v.heavyDented && vehEntry.damage.heavy) {
                        dmgRect = vehEntry.damage.heavy;
                    } else if (v.frontDented && v.rearDented && vehEntry.damage.heavy) {
                        dmgRect = vehEntry.damage.heavy;
                    } else if (v.frontDented && vehEntry.damage.front) {
                        dmgRect = vehEntry.damage.front;
                    } else if (v.rearDented && vehEntry.damage.rear) {
                        dmgRect = vehEntry.damage.rear;
                    }
                }

                // 3) Animated .G24 Car Door Swing Delta Overlay (CAR_DOOR1_SPRITE_DELTA_0..3) when entering/exiting!
                if ((v.doorOpenTimer || 0) > 0 && vehEntry && Array.isArray(vehEntry.doors) && vehEntry.doors.length > 0) {
                    const norm = 1.0 - Math.max(0, Math.min(1, v.doorOpenTimer / 0.48));
                    const tri = norm < 0.5 ? (norm * 2.0) : ((1.0 - norm) * 2.0);
                    const dIdx = Math.min(vehEntry.doors.length - 1, Math.floor(tri * vehEntry.doors.length));
                    doorRect = vehEntry.doors[dIdx];
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

            // Car body sprite with GTA 2 live rotation-aware solar clearcoat specular sheen + 3D building cast shadow response!
            const vehShade = (1.0 - nfGlobal) * this.getDayShadeAtPixel(v.x, v.y);
            const carSunSpec = v.destroyed ? 1.0 : (1.0 + 0.08 * Math.cos(v.angle - sunShadowAngle) * (1.0 - nfGlobal * 0.72) * (1.0 - vehShade * 0.7));
            const vTintR = carSunSpec * (1.0 - vehShade * 0.16);
            const vTintG = carSunSpec * (1.0 - vehShade * 0.11);
            const vTintB = carSunSpec * (1.0 - vehShade * 0.03);
            this.pushAtlasSprite3D(rect, v.x, v.y, vz + airZ, rot, vScale, vDrawOrder, vTintR, vTintG, vTintB, 1, totalPitchZ);
            if (dmgRect) {
                this.pushAtlasSprite3D(dmgRect, v.x, v.y, vz + airZ + 0.0015, rot, vScale, vDrawOrder, vTintR, vTintG, vTintB, 1, totalPitchZ);
            }
            if (doorRect) {
                this.pushAtlasSprite3D(doorRect, v.x, v.y, vz + airZ + 0.0025, rot, vScale, vDrawOrder, vTintR, vTintG, vTintB, 1, totalPitchZ);
            }

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

                const occSeats = typeof v.getOccupiedSeats === "function" ? v.getOccupiedSeats(game) : [];

                if (mapInfo.isMotorcycle) {
                    const bikerTypes = ["gang", "gang", "civ0", "civ1", "civ2", "civ3"];
                    const riderFrame = (v.doorOpenTimer || 0) > 0
                        ? (80 + Math.min(3, Math.floor((1.0 - v.doorOpenTimer / 0.48) * 4)))
                        : 84; // Frame 84 = sitting_on_bike in ped_animations.json

                    if (occSeats.length > 0) {
                        for (const occ of occSeats) {
                            const sPos = typeof v.getSeatWorldPos === "function"
                                ? v.getSeatWorldPos(occ.seat)
                                : { x: v.x + cosA * (occ.seat === 0 ? 1.5 : -7.5), y: v.y + sinA * (occ.seat === 0 ? 1.5 : -7.5) };
                            const isCustom24 = !((occ.pedType || "").startsWith("civ") || occ.pedType === "gang" || occ.pedType === "police" || occ.pedType === "monk");
                            const rScale = vScale * (isCustom24 ? 0.94 : 1.04);
                            this.batchPedSprite3D(
                                occ.pedType || "gang",
                                occ.seat === 0 ? riderFrame : 84,
                                sPos.x,
                                sPos.y,
                                vz + airZ + 0.014 + occ.seat * 0.002,
                                v.angle,
                                rScale,
                                (occ.muzzleTimer || 0) > 0,
                                riderDrawOrder
                            );
                        }
                    } else {
                        const aiPedType = v.driver === "AI_COP" ? "police" : bikerTypes[idHash % bikerTypes.length];
                        this.batchPedSprite3D(
                            aiPedType,
                            riderFrame,
                            v.x + cosA * 1.5,
                            v.y + sinA * 1.5,
                            vz + airZ + 0.014,
                            v.angle,
                            vScale * 1.05,
                            false,
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
                    if (occSeats.length > 0) {
                        for (const occ of occSeats) {
                            const sPos = typeof v.getSeatWorldPos === "function"
                                ? v.getSeatWorldPos(occ.seat)
                                : { x: v.x, y: v.y };
                            const isCustom24 = !((occ.pedType || "").startsWith("civ") || occ.pedType === "gang" || occ.pedType === "police" || occ.pedType === "monk");
                            const dScale = vScale * (isCustom24 ? 0.88 : 0.98);
                            this.batchPedSprite3D(
                                occ.pedType || "gang",
                                97,
                                sPos.x,
                                sPos.y,
                                vz + airZ + 0.014 + occ.seat * 0.001,
                                v.angle,
                                dScale,
                                (occ.muzzleTimer || 0) > 0,
                                riderDrawOrder
                            );
                        }
                    } else {
                        const aiPedType = v.driver === "AI_COP" ? "police" : civTypes[idHash % civTypes.length];
                        const isCenterSeat = v.specKey === "MICRO_KART" || v.specKey === "AIRBOAT";
                        const latOff = isCenterSeat ? 0 : -4.5;
                        const longOff = -2.0;
                        const dx = v.x + cosA * longOff - sinA * latOff;
                        const dy = v.y + sinA * longOff + cosA * latOff;
                        this.batchPedSprite3D(
                            aiPedType,
                            97,
                            dx,
                            dy,
                            vz + airZ + 0.014,
                            v.angle,
                            vScale,
                            false,
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
            this.renderViceBeachActivities3D(game, minX, minY, maxX, maxY, sunCos, sunSin, sunShadowAngle, sunShadowAlpha, nfGlobal);
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
                    const groundZ = this.getEntityZ(pm, 0.0);
                    this.renderMiamiPalmTree3D(pm.x, pm.y, groundZ, pm.angle || 0, pm.scale || 1.0, pi + 100, pm.height || 1.0);
                }
            }

            // 7B. Deep-Dive Vice City Architectural Streetscape Props (Ocean Drive Café Parasol Sprites & Española Bistro Lights)
            if (Array.isArray(this.map.viceStreetDetails)) {
                for (const vd of this.map.viceStreetDetails) {
                    if (vd.x < minX || vd.x > maxX || vd.y < minY || vd.y > maxY) continue;
                    const vz = (vd.z !== undefined ? vd.z : 2.0);
                    if (vd.kind === "CAFE_TABLE") {
                        const umbSpr = vd.theme === "PINK" ? "umbrella_pink" : "umbrella_cyan";
                        this.batchObjectSprite3D(umbSpr, vd.x, vd.y, vz + 0.08, (vd.y * 0.03) % 6.28, 0.78, SPRITE_DRAW_ORDER.TREES);
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
            if (pr.isElectro) {
                // GTA 2 ElectroGun bolt: jagged crackling cyan-white lightning segments
                const ang = Math.atan2(pr.vy || 0, pr.vx || 1);
                for (let k = 0; k < 3; k++) {
                    const off = (Math.random() - 0.5) * 5;
                    const bx = pr.x - Math.cos(ang) * k * 7 - Math.sin(ang) * off;
                    const by = pr.y - Math.sin(ang) * k * 7 + Math.cos(ang) * off;
                    this.pushSolidQuad3D(bx, by, pz, 9, 2.0, ang + (Math.random() - 0.5) * 0.9, 0.55, 0.85, 1.0, 0.95, SPRITE_DRAW_ORDER.PROJECTILES);
                }
                this.pushSolidQuad3D(pr.x, pr.y, pz + 0.002, 4.2, 4.2, 0.785, 0.92, 0.97, 1.0, 1.0, SPRITE_DRAW_ORDER.PROJECTILES);
            } else if (pr.isFlame) {
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
       5A-DAY. DAYTIME AMBIENT FLORIDA SUNLIGHT, VOLUMETRIC SUNBEAMS & SKY GLOW
       ======================================================================== */
    renderDaylightAtmosphere(ctx, game) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        if (W <= 0 || H <= 0) return;

        const nf = Math.max(0, Math.min(1, this.nightFactor || 0));
        const dayInt = Math.max(0, Math.min(1, (0.72 - nf) / 0.65));
        if (dayInt <= 0.01) return;

        const clockHr = (game && typeof game.worldMinutes === "number")
            ? (((game.worldMinutes % 1440) + 1440) % 1440) / 60.0
            : 12.0;
        // Sun positioned above top-left / top-center horizon (matching South-East cast shadows of buildings, palms & peds!)
        const dayProgress = Math.max(0, Math.min(1, (clockHr - 6.0) / 12.0));
        const sunX = W * (0.18 + dayProgress * 0.16);
        const sunY = -H * 0.16;
        const maxDim = Math.hypot(W, H);

        ctx.save();

        // 1. Warm Golden-Ivory Florida Solar Radiance Field (lifts flat textures with natural sun warmth)
        ctx.globalCompositeOperation = "screen";
        const sunGrad = ctx.createRadialGradient(sunX, sunY, maxDim * 0.04, sunX, sunY, maxDim * 1.05);
        // (kept faint: a strong full-screen "screen" lift washed dark asphalt into milky grey blotches)
        sunGrad.addColorStop(0.0, `rgba(255, 238, 184, ${(0.08 * dayInt).toFixed(3)})`);
        sunGrad.addColorStop(0.42, `rgba(255, 218, 148, ${(0.04 * dayInt).toFixed(3)})`);
        sunGrad.addColorStop(0.78, `rgba(255, 200, 128, ${(0.015 * dayInt).toFixed(3)})`);
        sunGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. Feathered Elliptical Volumetric Sunbeams (100% radial-gradient feathered edges — zero hard polygon lines!)
        ctx.globalCompositeOperation = "lighter";
        const baseRayAngle = Math.atan2(H * 0.85, W * 0.58 - sunX);
        const camPhase = (this.camX * 0.0020 + this.camY * 0.0015);
        for (let i = 0; i < 4; i++) {
            const rayWave = 0.72 + 0.28 * Math.sin(this.time * 0.80 + camPhase + i * 1.57);
            const ang = baseRayAngle + (i - 1.5) * 0.14;
            const lenR = maxDim * 0.68;
            const widR = W * (0.09 + (i % 2) * 0.025);

            ctx.save();
            ctx.translate(sunX, sunY);
            ctx.rotate(ang);
            ctx.scale(lenR, widR);

            const rg = ctx.createRadialGradient(0.55, 0.0, 0.02, 0.55, 0.0, 0.65);
            // Very faint: brighter beams read as moving light smudges/squares on the top-down asphalt
            const a0 = (0.010 * dayInt * rayWave).toFixed(4);
            const a1 = (0.004 * dayInt * rayWave).toFixed(4);
            rg.addColorStop(0.0, `rgba(255, 244, 198, ${a0})`);
            rg.addColorStop(0.50, `rgba(255, 224, 154, ${a1})`);
            rg.addColorStop(1.0, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(0.55, 0.0, 0.65, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
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

        // 3. Online Multiplayer Floating 3D Player Nametags & Health Bars
        if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
            const W = this.canvas.width;
            const H = this.canvas.height;
            for (const rp of game.net.remotePlayers.values()) {
                const rz = this.getEntityZ(rp, 0.22);
                const sc = this.worldToScreen(rp.x, rp.y, rz);
                const col = rp.color || "#00f0ff";
                if (sc.x >= -60 && sc.x <= W + 60 && sc.y >= -60 && sc.y <= H + 60) {
                    const rSeat = (rp.veh && typeof rp.veh.seat === "number") ? rp.veh.seat : 0;
                    const seatIcon = rp.veh ? (rSeat === 0 ? "🚗" : "🔫") : "🌐";
                    const tag = rp.dead ? `💀 ${rp.name} (WASTED)` : `${seatIcon} ${rp.name}`;
                    const bw = Math.max(92, ctx.measureText(tag).width + 16);
                    const bh = 22;
                    const bx = Math.round(sc.x - bw * 0.5);
                    const by = Math.round(sc.y - (rp.veh ? (38 + rSeat * 24) : 30));

                    ctx.fillStyle = "rgba(8, 12, 24, 0.88)";
                    ctx.fillRect(bx, by, bw, bh);
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

                    ctx.fillStyle = "#ffffff";
                    ctx.fillText(tag, sc.x, by + 8);

                    // Mini Health Bar inside the nametag pill
                    const hpPct = Math.max(0, Math.min(1, (rp.hp !== undefined ? rp.hp : 100) / 100));
                    const barW = bw - 12;
                    ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
                    ctx.fillRect(bx + 6, by + 15, barW, 4);
                    ctx.fillStyle = hpPct > 0.4 ? "#39ff14" : "#ff1e38";
                    ctx.fillRect(bx + 6, by + 15, Math.round(barW * hpPct), 4);

                    // Floating 3D Speech Bubble above remote player nametag when they chat!
                    if ((rp.chatTimer || 0) > 0 && rp.chatText) {
                        const bubbleTxt = `💬 ${rp.chatText.slice(0, 56)}`;
                        const bbw = Math.max(80, ctx.measureText(bubbleTxt).width + 18);
                        const bbh = 20;
                        const bbx = Math.round(sc.x - bbw * 0.5);
                        const bby = by - 25;
                        ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
                        ctx.fillRect(bbx, bby, bbw, bbh);
                        ctx.strokeStyle = col;
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(bbx + 0.5, bby + 0.5, bbw - 1, bbh - 1);
                        ctx.fillStyle = "#fde047";
                        ctx.fillText(bubbleTxt, sc.x, bby + bbh * 0.5);
                    }
                }
            }
        }

        // 4. Local Player 3D Speech Bubble when Lucia sends a chat message [T]
        if ((p.chatTimer || 0) > 0 && p.chatText) {
            const pObj = p.inVehicle || p;
            const pz = this.getEntityZ(pObj, 0.24);
            const pSc = this.worldToScreen(pObj.x, pObj.y, pz);
            const bubbleTxt = `💬 ${p.chatText.slice(0, 56)}`;
            const bbw = Math.max(80, ctx.measureText(bubbleTxt).width + 18);
            const bbh = 21;
            const bbx = Math.round(pSc.x - bbw * 0.5);
            const bby = Math.round(pSc.y - (p.inVehicle ? 44 : 36));
            ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
            ctx.fillRect(bbx, bby, bbw, bbh);
            ctx.strokeStyle = "#ff2a85";
            ctx.lineWidth = 1.6;
            ctx.strokeRect(bbx + 0.5, bby + 0.5, bbw - 1, bbh - 1);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(bubbleTxt, pSc.x, bby + bbh * 0.5);
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
    /* Shop furniture: purely decorative, drawn under the stations/NPCs */
    drawShopDecor(ctx, intr, ox, oy, rw, rh) {
        const R = (x, y, w, h, fill, stroke) => {
            ctx.fillStyle = fill;
            ctx.fillRect(ox + x, oy + y, w, h);
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(ox + x + 0.5, oy + y + 0.5, w - 1, h - 1);
            }
        };
        const C = (x, y, rad, fill, stroke) => {
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.arc(ox + x, oy + y, rad, 0, Math.PI * 2);
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        };
        const acc = intr.accent || "#38bdf8";
        const t = intr.theme;

        // Back wall strip under the header
        R(8, 64, rw - 16, 26, "rgba(15,23,42,0.85)", acc);

        if (t === "SHOP_GUN_SHOP") {
            // Wall rack of guns
            const gunCols = ["#475569", "#64748b", "#78350f", "#334155"];
            for (let i = 0; i < 12; i++) {
                R(30 + i * 60, 70, 40, 7, gunCols[i % 4]);
                R(30 + i * 60 + 28, 77, 8, 9, "#1e293b");
            }
            // Glass counters in front of each gun station
            for (const cx of [150, 380, 610]) R(cx - 100, 196, 200, 18, "rgba(56,189,248,0.18)", "#38bdf8");
            R(165, 365, 200, 18, "rgba(56,189,248,0.18)", "#38bdf8");
            R(395, 365, 200, 18, "rgba(56,189,248,0.18)", "#38bdf8");
        } else if (t === "SHOP_RESTAURANT") {
            // Kitchen pass-through + bottles
            R(40, 94, rw - 80, 18, "#78350f", "#fbbf24");
            for (let i = 0; i < 10; i++) R(60 + i * 68, 70, 12, 16, ["#16a34a", "#dc2626", "#facc15", "#2563eb"][i % 4]);
            // Dining tables with chairs
            for (const tx of [130, 280, 480, 630]) {
                C(tx, 430, 30, "#92400e", "#451a03");
                C(tx - 40, 430, 10, "#7c2d12");
                C(tx + 40, 430, 10, "#7c2d12");
                R(tx - 8, 424, 16, 12, "#ffffff");
            }
        } else if (t === "SHOP_HOTEL") {
            // Reception desk + key rack
            R(260, 100, 240, 28, "#92400e", "#fbbf24");
            for (let i = 0; i < 14; i++) R(40 + i * 50, 70, 8, 14, i % 2 ? "#facc15" : "#fb7185");
            // Beds in side alcoves + plants
            for (const bx of [50, 640]) {
                R(bx, 400, 80, 90, "#e2e8f0", "#94a3b8");
                R(bx, 400, 80, 24, "#f472b6");
            }
            C(240, 450, 16, "#15803d", "#14532d");
            C(520, 450, 16, "#15803d", "#14532d");
        } else if (t === "SHOP_CLOTHES") {
            // Clothing racks
            const cc = ["#ef4444", "#3b82f6", "#facc15", "#22c55e", "#a855f7", "#f97316"];
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 9; i++) {
                    R(40 + i * 76, 230 + row * 150, 6, 36, "#64748b");
                    R(34 + i * 76, 232 + row * 150, 18, 30, cc[(i + row * 2) % cc.length]);
                }
            }
            // Fitting rooms
            for (let i = 0; i < 3; i++) R(540 + i * 70, 70, 56, 20, "#7c3aed", "#c4b5fd");
        } else if (t === "SHOP_CONVENIENCE") {
            // Aisles of shelves with colourful goods
            const g = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#f97316", "#a855f7"];
            for (let row = 0; row < 2; row++) {
                R(60, 235 + row * 135, rw - 120, 14, "#475569", "#94a3b8");
                for (let i = 0; i < 20; i++) R(66 + i * 33, 224 + row * 135, 22, 12, g[(i + row) % g.length]);
            }
            // Fridge wall
            R(30, 70, rw - 60, 20, "rgba(103,232,249,0.35)", "#22d3ee");
        } else if (t === "SHOP_BAR") {
            // Long bar counter, stools, bottle shelf, neon sign
            R(80, 100, rw - 160, 24, "#78350f", "#fbbf24");
            for (let i = 0; i < 16; i++) R(70 + i * 40, 70, 10, 16, ["#16a34a", "#b91c1c", "#ca8a04", "#1d4ed8"][i % 4]);
            for (let i = 0; i < 8; i++) C(120 + i * 72, 140, 9, "#7f1d1d", "#fca5a5");
            for (const tx of [150, 380, 610]) C(tx, 440, 26, "#451a03", "#fbbf24");
            ctx.save();
            ctx.shadowColor = acc;
            ctx.shadowBlur = 14;
            R(rw / 2 - 70, 420, 140, 4, acc);
            ctx.restore();
        }
    }

    renderActiveInterior(ctx, game) {
        const intr = game.activeInterior;
        if (!intr) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const rw = intr.w || 780;
        const rh = intr.h || 530;
        const iScale = Math.min(1.0, (W - 16) / rw, (H - 80) / rh);
        const baseOx = Math.round((W - rw * iScale) * 0.5);
        const baseOy = Math.round((H - rh * iScale) * (iScale < 0.95 ? 0.36 : 0.5)) + (iScale < 0.95 ? 0 : 12);
        const ox = iScale < 0.999 ? 0 : baseOx;
        const oy = iScale < 0.999 ? 0 : baseOy;
        const btnStartIdx = this.cheatButtons.length;

        ctx.save();

        // Dark backdrop dim over the exterior city view
        ctx.fillStyle = "rgba(6, 9, 18, 0.84)";
        ctx.fillRect(0, 0, W, H);
        if (iScale < 0.999) {
            ctx.translate(baseOx, baseOy);
            ctx.scale(iScale, iScale);
        }

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
                } else if (intr.theme === "SHOP_GUN_SHOP") {
                    col = checker ? "#2a2a2e" : "#1b1b1f";
                } else if (intr.theme === "SHOP_RESTAURANT") {
                    col = checker ? "#7c2d12" : "#fde68a";
                    if (!checker) col = "#e7d8a8";
                } else if (intr.theme === "SHOP_HOTEL") {
                    col = (x >= 340 && x < 420) ? "#7f1d1d" : (checker ? "#3a2442" : "#2a1a33");
                } else if (intr.theme === "SHOP_CLOTHES") {
                    col = checker ? "#e2e8f0" : "#cbd5e1";
                } else if (intr.theme === "SHOP_CONVENIENCE") {
                    col = checker ? "#e5e7eb" : "#9ca3af";
                } else if (intr.theme === "SHOP_BAR") {
                    col = checker ? "#2b1810" : "#3b2214";
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

        // 2b. Template shop furniture (counters, shelves, tables, beds, racks...)
        if (intr.isShop) {
            this.drawShopDecor(ctx, intr, ox, oy, rw, rh);
        }

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

        if (iScale < 0.999) {
            for (let bi = btnStartIdx; bi < this.cheatButtons.length; bi++) {
                const b = this.cheatButtons[bi];
                b.x = baseOx + b.x * iScale;
                b.y = baseOy + b.y * iScale;
                b.w *= iScale;
                b.h *= iScale;
            }
        }

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
        const W = this.canvas.width;
        const H = this.canvas.height;
        const isMobile = W <= 960 || H <= 560;
        const px = isMobile ? 8 : 12;
        const py = W < 480 ? 54 : (isMobile ? 60 : 72);
        const isPlacesApp = !this.cheatsCollapsed;
        const isMinimized = !this.showCheatsWindow;
        const pw = (isMobile && isMinimized) ? 142 : 224;
        const ph = isMinimized ? (isMobile ? 36 : 44) : 388;
        const pScale = isMinimized
            ? Math.min(1.0, (W - 16) / 224)
            : Math.min(1.0, (W - 16) / 228, Math.max(0.56, (H - py - (isMobile ? 140 : 16)) / 392));
        const btnStartIdx = this.cheatButtons.length;
        const applyPhoneScaleToButtons = () => {
            if (pScale >= 0.999) return;
            for (let bi = btnStartIdx; bi < this.cheatButtons.length; bi++) {
                const b = this.cheatButtons[bi];
                b.x = px + (b.x - px) * pScale;
                b.y = py + (b.y - py) * pScale;
                b.w *= pScale;
                b.h *= pScale;
            }
        };

        ctx.save();
        if (pScale < 0.999) {
            ctx.translate(px, py);
            ctx.scale(pScale, pScale);
            ctx.translate(-px, -py);
        }

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
        if (!(isMobile && isMinimized)) {
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
        }

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
            ctx.font = isMobile ? "bold 10px -apple-system, 'Segoe UI', sans-serif" : "bold 10px -apple-system, 'Segoe UI', sans-serif";
            ctx.fillText(isMobile ? "📱 • 🎵 • 📍" : "🧭 GPS • 🎵 FM • 📍 PLACES [TAP]", sx + 7, sy + (isMobile ? 20 : 25));
            this.cheatButtons.push({ id: "UNMINIMIZE_PHONE", x: px, y: py, w: pw, h: ph });
            ctx.restore();
            // On mobile/minimized mode, render a compact live GPS mini-radar directly below the pill so the player always has a live radar!
            const miniRadarH = isMobile ? 114 : 0;
            if (miniRadarH > 0) {
                this.renderPhoneGpsWidget(ctx, game, px, py + ph + 4, pw, miniRadarH, rrect);
            }
            applyPhoneScaleToButtons();
            ctx.restore();
            return;
        }

        // Tap top-right of status bar or Dynamic Island to minimize the Smartphone on mobile/desktop
        this.cheatButtons.push({ id: "MINIMIZE_PHONE", x: notchX, y: sy + 1, w: sx + sw - notchX, h: 16 });

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
        ctx.font = "bold 9px -apple-system, 'Segoe UI', sans-serif";
        const curSt = (game.audio && typeof game.audio.getCurrentStation === "function") ? game.audio.getCurrentStation() : null;
        const stLabel = (curSt && curSt.name) ? curSt.name : "VICE CITY FM • RADIO OST";
        ctx.fillText(`🎵 ${stLabel}`, musX + 26, musY + 10.5);

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

        // Interactive Online P2P Multiplayer Pill Button [O]
        const mpCount = (game && game.net && typeof game.net.getPlayerCount === "function")
            ? game.net.getPlayerCount()
            : 1;
        const mpLabel = `🌐 ${mpCount}P ONLINE [O]`;
        const mpBtnW = 68;
        const mpBtnH = 15;
        const mpBtnX = smsX + smsW - mpBtnW - 4;
        const mpBtnY = smsY + 5;
        rrect(mpBtnX, mpBtnY, mpBtnW, mpBtnH, 4);
        ctx.fillStyle = mpCount > 1 ? "rgba(6, 182, 212, 0.32)" : "rgba(30, 41, 59, 0.92)";
        ctx.fill();
        ctx.strokeStyle = mpCount > 1 ? "#00f0ff" : "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = mpCount > 1 ? "#00f0ff" : "#e2e8f0";
        ctx.font = "bold 7.5px -apple-system, 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(mpLabel, mpBtnX + mpBtnW * 0.5, mpBtnY + mpBtnH * 0.5 + 0.5);
        ctx.textAlign = "left";
        this.cheatButtons.push({ id: "PHONE_ONLINE_BTN", x: mpBtnX, y: mpBtnY, w: mpBtnW, h: mpBtnH });

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

        // 6. Bottom iOS White Home Indicator Bar (Tap to minimize phone)
        rrect(sx + (sw - 58) * 0.5, sy + sh - 6.5, 58, 3.2, 2);
        ctx.fillStyle = "rgba(248, 250, 252, 0.65)";
        ctx.fill();
        this.cheatButtons.push({ id: "MINIMIZE_PHONE", x: sx + (sw - 90) * 0.5, y: sy + sh - 11, w: 90, h: 11 });

        applyPhoneScaleToButtons();
        ctx.restore();
        ctx.restore();
    }

    renderPhoneGpsWidget(ctx, game, gx, gy, gw, gh, rrect) {
        const useVice = this.mapStyle === "VICE" && this.viceOverviewReady;
        const rawImg = useVice ? this.viceOverviewImg : (this.nycOverviewReady ? this.nycOverviewImg : null);
        const srcImg = this.liveOverviewCanvas || rawImg;
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

        // Online Multiplayer Remote Player Blips on Smartphone GPS
        if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
            for (const rp of game.net.remotePlayers.values()) {
                const rpt = worldToMini(rp.x, rp.y);
                const rx = Math.max(mx + 4, Math.min(mx + mw - 4, rpt.x));
                const ry = Math.max(my + 4, Math.min(my + mh - 4, rpt.y));
                ctx.fillStyle = rp.color || "#00f0ff";
                ctx.beginPath();
                ctx.arc(rx, ry, 3.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
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
                if (btn.id === "PHONE_ONLINE_BTN" && game && game.net && typeof game.net.triggerOnlineAction === "function") {
                    game.net.triggerOnlineAction();
                    return true;
                }
                if (btn.id === "OPEN_CHAR_SELECT") {
                    const modal = document.getElementById("start-modal");
                    if (modal) modal.classList.remove("hidden");
                    return true;
                }
                if (btn.id === "UNMINIMIZE_PHONE") {
                    this.showCheatsWindow = true;
                    return true;
                }
                if (btn.id === "MINIMIZE_PHONE") {
                    this.showCheatsWindow = false;
                    return true;
                }
                if (btn.id === "CYCLE_WEAPON" && game && typeof game.cycleWeapon === "function") {
                    game.cycleWeapon(1);
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
        if (weaponKey === "PISTOL" || weaponKey === "ELECTRO") {
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
        const isCompact = W < 768;
        const isPhonePortrait = W < 480;
        const s = isPhonePortrait ? 0.90 : (isCompact ? 1.12 : 1.45);

        // A. TOP-RIGHT: AUTHENTIC 1997 GTA 1 SCORE, MULTIPLIER & LIVES PANEL
        const scoreStr = String(Math.max(0, Math.floor(game.cash || 0))).padStart(8, "0");
        const scoreW = this.measureGta1FontString("SCORE2", scoreStr, s);
        const scoreX = W - scoreW - (isPhonePortrait ? 8 : 14);
        const scoreY = isPhonePortrait ? 8 : 10;
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

        // A2. TOP-RIGHT ALL-TIME BEST SCORES MINI-TABLE (Below Score Counter)
        if (!isPhonePortrait && typeof game.getAllTimeHighScores === "function") {
            const topScores = game.getAllTimeHighScores().slice(0, 3);
            if (topScores.length > 0) {
                const lbW = isCompact ? 176 : 196;
                const rowH = isCompact ? 13 : 14;
                const lbH = 18 + topScores.length * rowH + 4;
                const lbX = W - lbW - 14;
                const lbY = Math.round(scoreY + 26 * s + 4);
                const myName = String((game.net && game.net.playerName) || (game.player && game.player.nickname) || "").trim().toUpperCase();

                ctx.save();
                ctx.fillStyle = "rgba(9, 13, 22, 0.82)";
                ctx.strokeStyle = "rgba(250, 204, 21, 0.55)";
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                if (typeof ctx.roundRect === "function") {
                    ctx.roundRect(lbX, lbY, lbW, lbH, 5);
                } else {
                    ctx.rect(lbX, lbY, lbW, lbH);
                }
                ctx.fill();
                ctx.stroke();

                ctx.font = "bold 9.5px Consolas, 'Courier New', monospace";
                ctx.textBaseline = "middle";
                ctx.textAlign = "left";
                ctx.fillStyle = "#facc15";
                ctx.fillText("🏆 ALL-TIME BEST SCORES", lbX + 7, lbY + 10);

                const medals = ["#1", "#2", "#3"];
                for (let i = 0; i < topScores.length; i++) {
                    const item = topScores[i];
                    const ry = lbY + 20 + i * rowH + 3;
                    const isSelf = myName && String(item.name).toUpperCase() === myName;
                    ctx.font = "bold 10px Consolas, 'Courier New', monospace";
                    ctx.textAlign = "left";
                    ctx.fillStyle = i === 0 ? "#fde047" : (i === 1 ? "#cbd5e1" : "#f59e0b");
                    ctx.fillText(medals[i], lbX + 7, ry);

                    ctx.fillStyle = isSelf ? "#ff2a85" : (item.color || "#f8fafc");
                    ctx.fillText(String(item.name || "PLAYER").slice(0, 11), lbX + 26, ry);

                    ctx.textAlign = "right";
                    ctx.fillStyle = "#39ff14";
                    ctx.fillText(`$${Number(item.score || 0).toLocaleString()}`, lbX + lbW - 7, ry);
                }
                ctx.restore();
            }
        }

        // B. LEFT PANEL (Top-Left): LUCIA MUGSHOT BADGE + WEAPON, ARMOR, KEY & PAGER POPUP
        const leftX = isPhonePortrait ? 8 : 12;
        const leftY = isPhonePortrait ? 8 : 12;
        const iconScale = isPhonePortrait ? 0.88 : (isCompact ? 1.06 : 1.35);

        let iconX = leftX;
        const p = game.player;

        // Draw Player 1997 Pixel-Art Portrait Badge + Health Bar (Click to change Character/Nickname [H]!)
        const mugW = isPhonePortrait ? 34 : (isCompact ? 40 : 48);
        const mugH = mugW;
        this.drawPixelPortraitRect(ctx, iconX, leftY, mugW, mugH, p.charId || "LUCIA", {
            bandana: Boolean(p.bandana),
            alert: (game.wantedLevel || 0) > 0
        });
        this.cheatButtons.push({ id: "OPEN_CHAR_SELECT", x: iconX, y: leftY, w: mugW, h: mugH + 10 });
        // Health Bar right below Player's Mugshot
        ctx.fillStyle = "rgba(10, 12, 20, 0.88)";
        ctx.fillRect(iconX, leftY + mugH + 2, mugW, 6);
        const hpRatio = Math.max(0, Math.min(1, (p.hp || 0) / (p.maxHp || 100)));
        ctx.fillStyle = hpRatio > 0.35 ? "#39ff14" : "#ff1e38";
        ctx.fillRect(iconX + 1, leftY + mugH + 3, Math.round((mugW - 2) * hpRatio), 4);
        iconX += mugW + (isPhonePortrait ? 5 : 8);

        if (p.weapon && p.weapon !== "FIST") {
            let weapSpr = "30";
            if (p.weapon === "UZI" || p.weapon === "SHOTGUN") weapSpr = "31";
            else if (p.weapon === "ROCKET") weapSpr = "32";
            else if (p.weapon === "FLAMETHROWER") weapSpr = "33";

            const wDim = this.drawHudSprite(ctx, weapSpr, iconX, leftY, iconScale);
            this.cheatButtons.push({ id: "CYCLE_WEAPON", x: iconX, y: leftY, w: wDim.w, h: wDim.h });
            if (p.weapon === "ELECTRO") {
                // GTA 2 ElectroGun HUD tint: crackling cyan glow over the pistol icon
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = `rgba(60, 170, 255, ${0.35 + 0.25 * Math.sin(this.time * 18)})`;
                ctx.fillRect(iconX, leftY, wDim.w, wDim.h);
                ctx.restore();
            }
            const ammoVal = p.ammo ? p.ammo[p.weapon] : 99;
            if (ammoVal !== undefined && Number.isFinite(ammoVal)) {
                const ammoStr = String(Math.min(999, Math.max(0, ammoVal))).padStart(2, "0");
                this.drawGta1FontString(ctx, "SUB1", ammoStr, iconX + wDim.w * 0.5, leftY + wDim.h - 10 * iconScale, iconScale, "center");
            }
            iconX += wDim.w + (isPhonePortrait ? 4 : 6);
        } else {
            this.cheatButtons.push({ id: "CYCLE_WEAPON", x: iconX, y: leftY, w: 36, h: mugH });
        }

        if ((p.armor || 0) > 0) {
            const aDim = this.drawHudSprite(ctx, "43", iconX, leftY, iconScale);
            const armStr = String(Math.min(99, Math.ceil(p.armor))).padStart(2, "0");
            this.drawGta1FontString(ctx, "SUB1_RED", armStr, iconX + aDim.w * 0.5, leftY + aDim.h * 0.58, iconScale, "center");
            iconX += aDim.w + (isPhonePortrait ? 4 : 6);
        }

        if ((game.jailFreeCards || 0) > 0 && (!isPhonePortrait || iconX + 20 < badgeX)) {
            this.drawHudSprite(ctx, "45", iconX, leftY, iconScale);
        }

        // C. TOP-CENTER: WANTED POLICE HEADS (41/42 — UP TO 6 HEADS), DISTRICT BANNER (25/26) & CAR NAME (27)
        if ((game.wantedLevel || 0) > 0) {
            const headSp = this.gta1Meta.sprites.hud["41"];
            const headScale = isPhonePortrait ? s * 0.85 : s;
            const headW = headSp ? headSp[2] * headScale : 24;
            const maxHeads = 6;
            const stripW = maxHeads * (headW + 3);
            let hx = Math.round((W - stripW) * 0.5);
            const hy = W < 640 ? (leftY + mugH + 10) : 10;
            const flashActive = Math.floor(this.time * 6) % 2 === 0;

            for (let i = 0; i < maxHeads; i++) {
                const isLit = i < game.wantedLevel;
                const sprId = isLit ? (flashActive ? "41" : "42") : "42";
                ctx.save();
                if (!isLit) ctx.globalAlpha = 0.32;
                this.drawHudSprite(ctx, sprId, hx, hy, headScale);
                ctx.restore();
                hx += headW + 3;
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
        const rawImg = useVice ? this.viceOverviewImg : (this.nycOverviewReady ? this.nycOverviewImg : null);
        const srcImg = this.liveOverviewCanvas || rawImg;
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

        // 8. Jason Duval Partner Blip & Online Remote Players
        if (game.jason) {
            const jp = worldToMini(game.jason.x, game.jason.y);
            ctx.fillStyle = "#00f0ff";
            ctx.fillRect(jp.x - 3, jp.y - 3, 6, 6);
        }
        if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
            for (const rp of game.net.remotePlayers.values()) {
                const rpt = worldToMini(rp.x, rp.y);
                const rx = Math.max(mx + 5, Math.min(mx + mw - 5, rpt.x));
                const ry = Math.max(my + 5, Math.min(my + mh - 5, rpt.y));
                ctx.fillStyle = rp.color || "#00f0ff";
                ctx.beginPath();
                ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
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

        // 1. Authentic 1997 GTA 1 UK PlayStation Cover-Art Gouache Portrait Atlas (3x3 Grid)
        const charGridIndex = {
            LUCIA: 0,
            JASON: 1,
            TOMMY: 2,
            TREVOR: 3,
            CJ: 4,
            NIKO: 5,
            CLAUDE: 6,
            BIGSMOKE: 7,
            CROCKETT: 8,
            DETECTIVE: 8
        };
        const upperChar = String(character || "LUCIA").toUpperCase();
        if (this.charPortraitsReady && this.charPortraitsImg && this.charPortraitsImg.width > 0 && charGridIndex[upperChar] !== undefined) {
            const idx = charGridIndex[upperChar];
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const cellW = this.charPortraitsImg.width / 3;
            const cellH = this.charPortraitsImg.height / 3;
            const padX = cellW * 0.018;
            const padY = cellH * 0.018;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(
                this.charPortraitsImg,
                col * cellW + padX,
                row * cellH + padY,
                cellW - padX * 2,
                cellH - padY * 2,
                rx,
                ry,
                rw,
                rh
            );

            if (opts.bandana && upperChar === "LUCIA") {
                // Red Heist Bandana overlay ([B] key)
                ctx.fillStyle = "rgba(185, 28, 28, 0.85)";
                ctx.fillRect(rx + rw * 0.28, ry + rh * 0.56, rw * 0.44, rh * 0.22);
            }

            // Vice City Neon Double Frame (hot pink outer + cyan inner)
            ctx.strokeStyle = opts.alert ? "#ff1e38" : "#ff2a85";
            ctx.lineWidth = Math.max(2, rw * 0.035);
            ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
            ctx.strokeStyle = "rgba(0, 240, 255, 0.65)";
            ctx.lineWidth = 1;
            ctx.strokeRect(rx + 3, ry + 3, rw - 6, rh - 6);
            ctx.restore();
            return;
        }

        // Clean dark frame while portrait sheet loads
        ctx.fillStyle = "#0b0f19";
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = opts.alert ? "#ff1e38" : "#ff2a85";
        ctx.lineWidth = Math.max(2, rw * 0.035);
        ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
        ctx.restore();
    }

    drawCharacterPortrait(canvasEl, character = "LUCIA", opts = {}) {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        this.drawPixelPortraitRect(ctx, 0, 0, canvasEl.width, canvasEl.height, character, opts);
    }

    bakeRadarBackground() {
        const useVice = this.mapStyle === "VICE" && this.viceOverviewReady;
        const rawImg = useVice ? this.viceOverviewImg : (this.nycOverviewReady ? this.nycOverviewImg : null);
        if (!rawImg) return;
        let srcImg = rawImg;
        if (this.map && this.map.cmpLoaded) {
            if (!this.liveOverviewCanvas) {
                this.liveOverviewCanvas = document.createElement("canvas");
                this.liveOverviewCanvas.width = 1024;
                this.liveOverviewCanvas.height = 1024;
            }
            const octx = this.liveOverviewCanvas.getContext("2d");
            octx.imageSmoothingEnabled = false;
            octx.drawImage(rawImg, 0, 0, 1024, 1024);
            // Mirror restored Mambas Stadium south bowl & emerald football pitch (cx=106..125, ry=106..115) from north bowl (210 - ry)
            for (let ry = 106; ry <= 115; ry++) {
                const srcRy = 210 - ry;
                octx.drawImage(rawImg, 106 * 4, srcRy * 4, 20 * 4, 4, 106 * 4, ry * 4, 20 * 4, 4);
            }
            // Sync reshaped urban basins, park lagoons & Lummus Park greenbelt onto the live GPS overview
            for (let ry = 1; ry < 255; ry++) {
                for (let cx = 1; cx < 255; cx++) {
                    let has3D = false;
                    for (let tz = 2; tz < 6; tz++) {
                        const b = this.map.getBlockInfo(this.map.getBlockIndex(cx, ry, tz));
                        if (b && (b.lid !== 0 || b.w !== 0 || b.e !== 0 || b.n !== 0 || b.s !== 0)) {
                            has3D = true;
                            break;
                        }
                    }
                    if (has3D) continue;
                    const b1 = this.map.getBlockInfo(this.map.getBlockIndex(cx, ry, 1));
                    if (!b1) continue;
                    if (b1.lid === 41) {
                        octx.fillStyle = useVice ? "#2898b8" : "#225577";
                        octx.fillRect(cx * 4, ry * 4, 4, 4);
                    } else if (b1.lid === 8) {
                        octx.fillStyle = useVice ? "#dfd3c3" : "#9c9a96";
                        octx.fillRect(cx * 4, ry * 4, 4, 4);
                    } else if (b1.lid === 9) {
                        octx.fillStyle = useVice ? "#efe2cf" : "#b2aba0";
                        octx.fillRect(cx * 4, ry * 4, 4, 4);
                    } else if (b1.lid === 10) {
                        octx.fillStyle = useVice ? "#2ea844" : "#3a7d34";
                        octx.fillRect(cx * 4, ry * 4, 4, 4);
                    }
                }
            }
            srcImg = this.liveOverviewCanvas;
        }
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

        if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
            for (const rp of game.net.remotePlayers.values()) {
                const rx = Math.round(rp.x * sx);
                const ry = Math.round(rp.y * sy);
                fctx.fillStyle = rp.color || "#00f0ff";
                fctx.fillRect(rx - 5, ry - 5, 10, 10);
                fctx.strokeStyle = "#ffffff";
                fctx.lineWidth = 1.8;
                fctx.strokeRect(rx - 5, ry - 5, 10, 10);
            }
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
