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

        // Default camera centered on Hotel Dixon & Ocean Drive Spawn (mx256(213.5), my256(146.0), z=2.0)
        this.camX = mx256(213.5) * TILE_SIZE;
        this.camY = my256(146.0) * TILE_SIZE;
        this.camZBlocks = 2.0; // Smoothed player ground elevation in blocks (0..6)
        this.followHeightBlocks = 5.0; // 20.0m / 4.0m = 5.0 blocks above player ground
        this.zoomOffsetBlocks = 0.0; // Mouse wheel zoom delta in blocks (-2.2 .. +8.0)
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.nightMode = false;
        this.nightFactor = 0.0;
        this.sunsetFactor = 0.0;
        this.windowLitFactor = 0.0;
        this.time = 0;
        this.lastFrameDt = 0.0166;
        this.fpsSmoothed = 60.0;

        // Vice City Neon GPS Express Drawer ([C] key or click header toggles open/collapsed; auto-minimized on mobile)
        const isMobileInit = typeof window !== "undefined" && (
            window.innerWidth <= 960 ||
            window.innerHeight <= 560 ||
            (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
        );
        this.isMobileInit = isMobileInit;
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

        // Hardware-composited WebGL 3D Canvas mounted directly behind #game-canvas (eliminates full-screen GPU->2D copy on mobile daytime!)
        this.glCanvas = document.createElement("canvas");
        this.glCanvas.id = "webgl-canvas";
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.insertBefore(this.glCanvas, this.canvas);
        }
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
        const ctxOpts = {
            alpha: false,
            depth: true,
            antialias: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        };
        const gl =
            this.glCanvas.getContext("webgl", ctxOpts) ||
            this.glCanvas.getContext("experimental-webgl", ctxOpts);
        if (!gl) {
            console.error("WebGL not supported!");
            return;
        }
        this.gl = gl;
        this.glLost = false;

        if (!this._contextListenersAttached) {
            this._contextListenersAttached = true;
            this.glCanvas.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                this.glLost = true;
                console.warn("WebGL context lost — awaiting restore");
            }, false);
            this.glCanvas.addEventListener("webglcontextrestored", () => {
                console.info("WebGL context restored — rebuilding GPU resources");
                this.glLost = false;
                this.cityChunks = [];
                this.initWebGL();
                if (this.gta1Ready && this.gta1Meta) {
                    const enhancedViceTiles = this.processViceTilesRtx(this.gta1TilesViceImg);
                    this.tilesTexVice = this.createGLTexture(enhancedViceTiles, true);
                    this.tilesTexNyc = (this.gta1TilesImg && this.gta1TilesImg.width > 0)
                        ? this.createGLTexture(this.gta1TilesImg, true)
                        : this.tilesTexVice;
                    this.tilesTex = this.mapStyle === "VICE" ? this.tilesTexVice : this.tilesTexNyc;
                    const enhancedSprites = this.processGtaSpritesRtx(this.gta1SpritesImg, this.gta1Meta);
                    this.spritesTex = this.createGLTexture(enhancedSprites, true);
                    if (enhancedSprites && enhancedSprites !== this.gta1SpritesImg) {
                        enhancedSprites.width = 1;
                        enhancedSprites.height = 1;
                    }
                    if (this.map && this.map.objectEngine) {
                        this.map.objectEngine.meshProg = null;
                        this.map.objectEngine.meshVbo = null;
                        this.map.objectEngine.dynVbo = null;
                        this.map.objectEngine.interiorVbo = null;
                    }
                    this.buildCityMesh();
                }
            }, false);
        }

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
            uniform float uWinLit; // fraction (0..1) of building windows that are lit right now (evolves through the night)
            uniform float uTime;
            uniform vec2 uSunDir;
            uniform float uMobileFast;

            // Seamless world-space hash & noise (inputs wrapped to stay precise in mediump/highp)
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

            // Organic Rotated Domain-Warped Cellular Caustic Network & Liquid Wave Swell (delicate filaments, zero grid alignment!)
            float evalWaterCaustics(vec2 p, float t, out vec2 waveGrad, out float swellOut) {
                // Broad directional ocean swells (rotated off-axis for natural diagonal wave trains)
                vec2 sp = vec2(p.x * 0.82 + p.y * 0.57, -p.x * 0.57 + p.y * 0.82);
                float wSwell1 = sin(sp.x * 1.45 + t * 1.35 + sin(sp.y * 0.90 - t * 0.85) * 0.65);
                float wSwell2 = cos(sp.y * 2.10 - sp.x * 0.85 - t * 1.65);
                swellOut = wSwell1 * 0.62 + wSwell2 * 0.38;

                // Smooth organic domain warp
                vec2 warp = vec2(
                    sin(p.x * 1.75 + p.y * 1.25 + t * 1.20),
                    cos(p.x * 1.30 - p.y * 1.85 - t * 1.10)
                ) * 0.42;

                // Two counter-drifting octaves rotated by 37 deg and 53 deg so noise cells never align with X/Z axes
                vec2 pRot1 = vec2(p.x * 0.80 - p.y * 0.60, p.x * 0.60 + p.y * 0.80);
                vec2 pRot2 = vec2(p.x * 0.60 + p.y * 0.80, -p.x * 0.80 + p.y * 0.60);
                vec2 uv1 = pRot1 * 2.35 + vec2(t * 0.36, -t * 0.28) + warp;
                vec2 uv2 = pRot2 * 3.45 - vec2(t * 0.30, t * 0.34) - warp * 0.80;
                float n1 = aNoise(uv1);
                float n2 = aNoise(uv2);

                // Slender, razor-crisp caustic filaments along the curved zero-crossings (n == 0.5)
                float r1 = max(0.0, 1.0 - abs(n1 * 2.0 - 1.0) * 1.35);
                float r2 = max(0.0, 1.0 - abs(n2 * 2.0 - 1.0) * 1.35);
                float f1 = r1 * r1 * r1;
                float f2 = r2 * r2 * r2;

                // Delicate cellular web with bright focal nodes where filaments cross
                float web = clamp(f1 * 0.48 + f2 * 0.42 + (r1 * r2) * (r1 * r2) * 1.15, 0.0, 1.0);
                waveGrad = vec2(
                    (n1 - 0.5) * 0.65 + cos(sp.x * 1.45 + t * 1.35) * 0.35,
                    (n2 - 0.5) * 0.65 - sin(sp.y * 2.10 - t * 1.65) * 0.35
                );
                return web;
            }

            vec4 sampleOceanWater(float dayAmt) {
                vec2 p = vWorldPos.xz;
                vec2 waveGrad;
                float swell;
                float caust = evalWaterCaustics(p, uTime, waveGrad, swell);

                // Sample remastered water atlas at a broad world-space scale warped by wave slope so 1x1 block seams vanish
                float idx = 698.0 + 25.0 + uWaterStep;
                float col = mod(idx, 16.0);
                float row = floor(idx / 16.0);
                vec2 localUV = clamp(fract(p * 0.22 + waveGrad * 0.08), vec2(1.0 / 64.0), vec2(63.0 / 64.0));
                vec2 wUV = (vec2(col, row) + localUV) / vec2(16.0, 51.0);
                vec3 texW = texture2D(uTex, wUV).rgb;

                // Continuous world-space S-curve Vice Beach coastal bathymetry (zero per-tile jump across tile boundaries)
                float shoreCurveX = 481.5 + 4.2 * sin(p.y * 0.021) + 2.4 * cos(p.y * 0.047);
                float signedOffshore = p.x - shoreCurveX;
                float coastDist = abs(signedOffshore);
                float shallowFactor = clamp(1.0 - coastDist / 19.0, 0.0, 1.0);
                float deepAtlantic = clamp((signedOffshore - 10.0) / 28.0, 0.0, 1.0);

                // Beer-Lambert Tropical Bathymetry: Deep Gulf Stream Sapphire -> Biscayne Azure -> Bahamas Reef Aquamarine
                vec3 abyssSapphire = vec3(0.03, 0.30, 0.54);
                vec3 midAzure      = mix(vec3(0.04, 0.48, 0.68), vec3(0.12, 0.70, 0.84), clamp(0.5 + swell * 0.40, 0.0, 1.0));
                vec3 reefAqua      = vec3(0.14, 0.86, 0.82);
                vec3 waterBody     = mix(midAzure, abyssSapphire, deepAtlantic * 0.78);
                waterBody          = mix(waterBody, reefAqua, shallowFactor * 0.64);
                vec3 rgb           = mix(waterBody, texW, 0.08);

                // Wave-slope Fresnel sky/sunset reflection & directional wave shading
                vec2 sunDir = normalize(uSunDir + vec2(0.0001));
                float sunAlign = clamp(dot(normalize(waveGrad + vec2(0.0001)), sunDir) * 0.5 + 0.5, 0.0, 1.0);
                vec3 skyReflCol = mix(vec3(0.44, 0.80, 0.96), vec3(0.96, 0.62, 0.76), uSunsetTint);
                float fresnel = clamp(length(waveGrad) * 0.28, 0.0, 0.24);
                rgb = mix(rgb, skyReflCol, fresnel * (0.28 + 0.72 * dayAmt));

                // Delicate luminous cellular caustic web (subtle on surface so seabed parallax caustics shine through)
                float caustVis = (0.24 + 0.42 * shallowFactor) * (1.0 - deepAtlantic * 0.55) * (0.30 + 0.70 * dayAmt);
                vec3 caustTint = mix(vec3(0.36, 0.94, 0.92), vec3(0.96, 0.92, 0.74), caust);
                rgb = mix(rgb, min(vec3(1.0), rgb + caustTint * 0.34), caust * caustVis);

                // Organic curved shore-breaking surf rollers along the beach
                float rollerWarp = (aNoise(p * 0.65 + vec2(0.0, uTime * 0.25)) - 0.5) * 2.2;
                float rollerPhase = p.x * 2.85 + uTime * 2.35 + rollerWarp;
                float rollerCrest = pow(max(0.0, sin(rollerPhase)), 7.0) * shallowFactor;
                float foamCell = clamp(caust * 1.3 + (aNoise(p * 4.5 + uTime * 0.5) - 0.38), 0.0, 1.0);
                float whitecap = rollerCrest * (0.48 + 0.52 * foamCell) * 0.72;
                vec3 crestFoam = mix(vec3(0.92, 0.98, 1.00), vec3(1.0, 0.90, 0.86), uSunsetTint * 0.35);
                rgb = mix(rgb, crestFoam, clamp(whitecap * (1.0 - uNightTint * 0.60), 0.0, 0.78));

                // Silky Solar / Sunset Wave-Crest Glint along caustic focal nodes
                float filamentGlint = pow(caust, 2.4) * (0.40 + 0.60 * sunAlign) * dayAmt;
                vec3 specTint = mix(vec3(0.96, 0.94, 0.80), vec3(1.0, 0.70, 0.52), uSunsetTint);
                rgb = min(vec3(1.0), rgb + specTint * filamentGlint * 0.32);

                // Water is more translucent over shallow turquoise reefs so the 3D sandy seabed & caustics shine through!
                float waterAlpha = mix(0.84, 0.66, shallowFactor * 0.70);
                return vec4(rgb, waterAlpha);
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
                vec2 lp = fract(p);
                float mx = max(src.r, max(src.g, src.b));
                float mn = min(src.r, min(src.g, src.b));
                // Lane paint / curb stones are much brighter than tar: crisp mask from the blurry 64px texel
                float paint = smoothstep(0.40, 0.50, mx);
                bool yellow = (src.r - src.b) > 0.16;
                vec3 base = mix(vec3(0.255, 0.285, 0.310), vec3(0.200, 0.220, 0.255), darkFamily);

                if (uMobileFast > 0.5) {
                    float grainFast = aHash(floor(p * 32.0));
                    vec3 colFast = base * (0.95 + grainFast * 0.09);
                    vec3 paintFast = yellow ? vec3(0.95, 0.77, 0.20) : vec3(clamp(mx * 1.08, 0.0, 0.94));
                    if (!yellow && (mx - mn) > 0.06) paintFast = src * (clamp(mx * 1.08, 0.0, 0.94) / max(mx, 0.01));
                    float cwPaintFast = 0.0;
                    if (vAnim > 5.45 && vAnim < 9.45) {
                        float idx = floor((vAnim - 5.5) * 8.0 + 0.5);
                        float curbMax = mod(floor(idx / 2.0), 2.0);
                        float curbMin = mod(floor(idx / 4.0), 2.0);
                        float cwDir   = floor(idx / 8.0);
                        float along  = (cwDir < 0.5) ? lp.y : (cwDir < 1.5) ? (1.0 - lp.y) : (cwDir < 2.5) ? lp.x : (1.0 - lp.x);
                        float across = (cwDir < 1.5) ? lp.x : lp.y;
                        float acMin  = (curbMin > 0.5) ? 0.135 : 0.035;
                        float acMax  = (curbMax > 0.5) ? 0.865 : 0.965;
                        bool inCurbSide = (curbMin > 0.5 && across < 0.125) || (curbMax > 0.5 && across > 0.875);
                        if (along < 0.52 && !yellow && !inCurbSide) paint = 0.0;
                        if (!yellow && across > acMin && across < acMax) {
                            float cwAlong = smoothstep(0.035, 0.050, along) * (1.0 - smoothstep(0.285, 0.300, along));
                            float barPhase = fract(across * 4.0 + 0.12);
                            float cwBar = smoothstep(0.22, 0.26, barPhase) * (1.0 - smoothstep(0.74, 0.78, barPhase));
                            float edgePad = smoothstep(acMin, acMin + 0.025, across) * (1.0 - smoothstep(acMax - 0.025, acMax, across));
                            float stopAlong = smoothstep(0.375, 0.388, along) * (1.0 - smoothstep(0.428, 0.440, along));
                            float stopAcross = smoothstep(acMin + 0.02, acMin + 0.04, across) * (1.0 - smoothstep(acMax - 0.04, acMax - 0.02, across));
                            cwPaintFast = max(cwAlong * cwBar * edgePad, stopAlong * stopAcross) * 0.82;
                        }
                    }
                    vec3 outFast = mix(colFast, paintFast, paint);
                    outFast = mix(outFast, vec3(0.75, 0.76, 0.74), cwPaintFast);
                    if (vAnim > 9.5) {
                        float bits = floor(vAnim - 10.0 + 0.5);
                        if (mod(bits, 2.0) > 0.5)              outFast = junctionCurb(outFast, lp.y);
                        if (mod(floor(bits / 2.0), 2.0) > 0.5) outFast = junctionCurb(outFast, 1.0 - lp.y);
                        if (mod(floor(bits / 4.0), 2.0) > 0.5) outFast = junctionCurb(outFast, lp.x);
                        if (mod(floor(bits / 8.0), 2.0) > 0.5) outFast = junctionCurb(outFast, 1.0 - lp.x);
                    }
                    return outFast;
                }

                // Large faded patches, medium mottling, fine aggregate grain (all continuous across tiles)
                float big = aNoise(p * 0.45) * 0.6 + aNoise(p * 1.3 + 7.0) * 0.4;
                float mid = aNoise(p * 4.0 + 13.0);
                float grain = aHash(floor(p * 40.0));
                float fine = aHash(floor(p * 96.0) + 19.0);
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

                // Subtle dual tire-rut wear along all traffic lanes
                float laneRutX = exp(-pow((lp.x - 0.32) * 5.5, 2.0)) + exp(-pow((lp.x - 0.68) * 5.5, 2.0));
                float laneRutY = exp(-pow((lp.y - 0.32) * 5.5, 2.0)) + exp(-pow((lp.y - 0.68) * 5.5, 2.0));
                col *= 1.0 - max(laneRutX, laneRutY) * 0.038 * (0.65 + mid * 0.35);

                // FDOT Continental Crosswalk & Stop Bar on intersection approach tiles (vAnim in 5.50 .. 9.375)
                float cwPaint = 0.0;
                vec3 cwCol = vec3(0.76, 0.77, 0.75);
                if (vAnim > 5.45 && vAnim < 9.45) {
                    float idx = floor((vAnim - 5.5) * 8.0 + 0.5);
                    float curbMax = mod(floor(idx / 2.0), 2.0);
                    float curbMin = mod(floor(idx / 4.0), 2.0);
                    float cwDir   = floor(idx / 8.0); // 0=N, 1=S, 2=W, 3=E
                    float along  = (cwDir < 0.5) ? lp.y : (cwDir < 1.5) ? (1.0 - lp.y) : (cwDir < 2.5) ? lp.x : (1.0 - lp.x);
                    float across = (cwDir < 1.5) ? lp.x : lp.y;
                    float acMin  = (curbMin > 0.5) ? 0.135 : 0.035;
                    float acMax  = (curbMax > 0.5) ? 0.865 : 0.965;
                    bool inCurbSide = (curbMin > 0.5 && across < 0.125) || (curbMax > 0.5 && across > 0.875);

                    // Terminate dashed white lane divider cleanly behind the stop bar while preserving curb & yellow lines
                    if (along < 0.52 && !yellow && !inCurbSide) {
                        paint = 0.0;
                    }
                    if (!yellow && across > acMin && across < acMax) {
                        float tireRut = exp(-pow((across - 0.31) * 6.2, 2.0)) + exp(-pow((across - 0.69) * 6.2, 2.0));
                        float chip = aNoise(p * 16.0 + 41.0) * 0.65 + fine * 0.35;
                        float wearMask = clamp(1.0 - tireRut * (0.42 + (1.0 - chip) * 0.28), 0.28, 1.0);

                        // 4 longitudinal FDOT Continental Crosswalk zebra bars per lane tile
                        float cwAlong = smoothstep(0.035, 0.050, along) * (1.0 - smoothstep(0.285, 0.300, along));
                        float barPhase = fract(across * 4.0 + 0.12);
                        float cwBar = smoothstep(0.22, 0.26, barPhase) * (1.0 - smoothstep(0.74, 0.78, barPhase));
                        float edgePad = smoothstep(acMin, acMin + 0.025, across) * (1.0 - smoothstep(acMax - 0.025, acMax, across));

                        // Transverse FDOT White Stop Bar set back behind the crosswalk
                        float stopAlong = smoothstep(0.375, 0.388, along) * (1.0 - smoothstep(0.428, 0.440, along));
                        float stopAcross = smoothstep(acMin + 0.02, acMin + 0.04, across) * (1.0 - smoothstep(acMax - 0.04, acMax - 0.02, across));

                        cwPaint = max(cwAlong * cwBar * edgePad, stopAlong * stopAcross) * wearMask * (0.72 + chip * 0.14);
                        cwCol = vec3(0.75, 0.76, 0.74) * (0.88 + aNoise(p * 10.0 + 23.0) * 0.14);
                    }
                }

                vec3 outCol = mix(col, paintCol, paint);
                outCol = mix(outCol, cwCol, cwPaint);
                if (vAnim > 9.5) {
                    // Junction box side facing the pavement: continue curb + gutter + yellow edge line
                    float bits = floor(vAnim - 10.0 + 0.5);
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
            float cornerNorm(float u, float v, float p) {
                vec2 a = max(vec2(0.0), vec2(u, v));
                float m = max(a.x, a.y);
                return (m > 0.0001) ? (m * pow(pow(a.x / m, p) + pow(a.y / m, p), 1.0 / p)) : 0.0;
            }

            void main() {
                if (uNightTint < -0.5 && vAnim >= -0.5) discard;
                vec4 c = texture2D(uTex, vUV);
                vec3 rawTexRgb = c.rgb;
                float winGlassMask = 0.0;
                bool isShoreTile = (vAnim > 3.5 && vAnim < 4.5);
                bool isRoad = (vAnim > 4.9 && vAnim < 26.0);
                bool isFootpathSandEdge = (vAnim > 27.5 && vAnim < 28.5);
                bool isCurvedLawn = (vAnim > 29.5 && vAnim < 1999.5);
                bool isCurvedWater = (vAnim > 1999.5);
                float waterCoverage = (vAnim > 0.5 && vAnim < 1.5) ? 1.0 : 0.0;
                bool isDarkRoad = (vAnim > 5.1 && vAnim < 5.4) || (vAnim > 5.45 && vAnim < 9.45 && mod(floor((vAnim - 5.5) * 8.0 + 0.5), 2.0) > 0.5);
                if (isRoad) c.rgb = asphaltSurface(c.rgb, isDarkRoad ? 1.0 : 0.0);
                if (c.a < 0.03 && !isShoreTile) discard;

                float dayAmt = clamp(1.0 - uNightTint * 1.15, 0.0, 1.0);

                // 1. AddRiverbed (world_mesh.cpp): 3D Sunken Sandy Seabed Floor (vAnim == 3.0) & Translucent Water Surface (vAnim == 1.0)
                if (vAnim > 2.5 && vAnim < 3.5) {
                    // Sunken 3D sandy seabed floor 0.42 blocks beneath the water surface with world-space coral sand & refracted solar caustics!
                    vec2 bedGrad;
                    float bedSwell;
                    float bedCaust = evalWaterCaustics(vWorldPos.xz * 0.92 + vec2(0.37, 0.61), uTime * 0.95, bedGrad, bedSwell);
                    vec3 sandFloor = styleBeachSand(c.rgb);
                    float shoreCurveX = 481.5 + 4.2 * sin(vWorldPos.z * 0.021) + 2.4 * cos(vWorldPos.z * 0.047);
                    float shallowBed = clamp(1.0 - abs(vWorldPos.x - shoreCurveX) / 22.0, 0.0, 1.0);
                    vec3 absorbTint = mix(vec3(0.28, 0.62, 0.78), vec3(0.48, 0.82, 0.86), shallowBed);
                    vec3 caustLight = mix(vec3(0.18, 0.42, 0.40), vec3(0.42, 0.48, 0.32), bedCaust);
                    c.rgb = min(vec3(1.0), sandFloor * absorbTint + caustLight * bedCaust * (0.32 + 0.68 * dayAmt));
                } else if (vAnim > 0.5 && vAnim < 1.5) {
                    c = sampleOceanWater(dayAmt);
                    waterCoverage = 1.0;
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
                            if (uMobileFast < 0.5) c.rgb = mix(c.rgb, styleBeachSand(c.rgb), isSand);
                        } else if (isGrass > 0.01 && uMobileFast < 0.5) {
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
                            float w = 0.45 + 0.05 * sin(p.x * 0.62 + p.y * 0.58) + 0.03 * cos(p.y * 1.25 - p.x * 0.50);
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
                            float kOuter = isStair ? 1.50 : 1.90;
                            float dCard = (xDist < R && yDist < R)
                                ? (R - cornerNorm(R - xDist, R - yDist, kOuter))
                                : min(xDist, yDist);

                            float dCorner = 10.0;
                            if (iNW) dCorner = min(dCorner, cornerNorm(lp.x, lp.y, 1.50) - w);
                            if (iNE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, lp.y, 1.50) - w);
                            if (iSW) dCorner = min(dCorner, cornerNorm(lp.x, 1.0 - lp.y, 1.50) - w);
                            if (iSE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, 1.0 - lp.y, 1.50) - w);

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

                            bool isNarrow = (bW && bE) || (bN && bS);

                            // Single continuous 2D world-space shoreline offset w(p) so adjacent tiles join with 0.0000 seam error!
                            // For natural beaches (waterSurType > 2.5), wBase = 0.385 places the water edge (w + 0.115 = 0.50) at the exact tile midpoint so convex & concave curves have equal 0.50 radius!
                            float wBase = (waterSurType > 2.5) ? (isNarrow ? 0.22 : 0.385) : (isNarrow ? 0.18 : 0.28);
                            float w = wBase + 0.055 * sin(p.x * 0.52 + p.y * 0.48) + 0.035 * cos(p.y * 1.12 - p.x * 0.44);
                            float R = 1.0 - w;

                            float dW = bW ? (lp.x - w) : 10.0;
                            float dE = bE ? (1.0 - lp.x - w) : 10.0;
                            float dN = bN ? (lp.y - w) : 10.0;
                            float dS = bS ? (1.0 - lp.y - w) : 10.0;

                            float xDist = min(dW, dE);
                            float yDist = min(dN, dS);
                            bool isDiagPair = bW == bN;
                            bool isStair = !isNarrow && (isDiagPair ? (!bNE || !bSW) : (!bNW || !bSE));
                            float kOuter = isStair ? 1.50 : 1.90;
                            float dCard = (xDist < R && yDist < R)
                                ? (R - cornerNorm(R - xDist, R - yDist, kOuter))
                                : min(xDist, yDist);

                            float dCorner = 10.0;
                            if (iNW) dCorner = min(dCorner, cornerNorm(lp.x, lp.y, 1.50) - w);
                            if (iNE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, lp.y, 1.50) - w);
                            if (iSW) dCorner = min(dCorner, cornerNorm(lp.x, 1.0 - lp.y, 1.50) - w);
                            if (iSE) dCorner = min(dCorner, cornerNorm(1.0 - lp.x, 1.0 - lp.y, 1.50) - w);

                            float stoneGrain = (aNoise(p * 18.0 + 11.0) - 0.5) * 0.006;
                            dWater = min(dCard, dCorner) + stoneGrain;

                            if (waterSurType > 2.5) {
                                // Natural beach & coastal shoreline: NO stone border! Smooth transition from dry golden sand to warm wet sand
                                if (dWater < 0.24) {
                                    float wetMix = smoothstep(-0.04, 0.14, dWater);
                                    vec3 wetSand = c.rgb * vec3(0.84, 0.77, 0.65);
                                    c.rgb = mix(c.rgb, wetSand, wetMix);
                                }
                            } else {
                                // Enclosed urban park basin / lagoon: 3D sculpted limestone/granite coping rim (dWater in [-0.045, 0.145])
                                if (dWater < 0.155) {
                                    float outerAO = mix(0.76, 1.0, smoothstep(-0.002, -0.045, dWater));
                                    vec3 groundCol = c.rgb * outerAO;

                                    // Architectural stone coping rim (margelle en pierre de taille / bassin)
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
                    }

                    // Daytime 3D Building Cast Shadows, Building-Foot Ambient Occlusion & Warm Florida Sunlight vs. Cool Sky Shade
                    if (dayAmt > 0.01 && c.a > 0.02) {
                        vec4 lm = texture2D(uDayLightTex, vWorldPos.xz / 512.0);
                        float onGround = clamp(2.75 - vWorldPos.y, 0.0, 1.0);
                        float sandMask = clamp(isSand + step(0.82, min(c.r, min(c.g, c.b))), 0.0, 1.0);
                        float bldAO = lm.g * onGround * (1.0 - sandMask * 0.88);
                        float westSunWeight = clamp(0.76 - uSunDir.x * 0.35, 0.25, 0.92);
                        float bldShadow = max(lm.a * westSunWeight, lm.b * (1.0 - westSunWeight * 0.45)) * onGround * (1.0 - sandMask * 0.85);
                        float totalShade = clamp(max(bldShadow * 0.96, bldAO * 0.74), 0.0, 1.0);
                        if (isRoad) {
                            // True 3D building cast shadows project cleanly across asphalt streets while keeping curb AO subtle
                            bldAO *= 0.22;
                            totalShade = clamp(bldShadow * 0.82 + bldAO * 0.25, 0.0, 1.0);
                        }

                        vec3 sunlitTint = mix(vec3(1.19, 1.10, 0.90), vec3(1.06, 1.03, 0.96), sandMask);
                        vec3 shadowTint = mix(vec3(0.50, 0.62, 0.85), vec3(0.88, 0.85, 0.78), sandMask);
                        if (isRoad) {
                            sunlitTint = vec3(1.11, 1.07, 0.98);
                            shadowTint = vec3(0.58, 0.67, 0.85);
                        }
                        vec3 dayGrading = mix(sunlitTint, shadowTint, totalShade) * (1.0 - bldAO * 0.22);
                        float isElevatedRoof = step(2.85, vWorldPos.y);
                        if (isElevatedRoof > 0.5 && waterCoverage < 0.05) {
                            // Preserve turquoise rooftop swimming pools (lid 35), but replace all blurry 1997
                            // diamond-checkerboard / purple / yellow roof tiles with a crisp procedural GTA 6 architectural roof deck!
                            float isPoolRoof = step(0.18, c.b - c.r) * step(0.12, c.g - c.r);
                            if (isPoolRoof < 0.5) {
                                float roofLum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                                float tierSeed = fract(floor(vWorldPos.y + 0.1) * 0.37);
                                vec3 archDeckBase = mix(
                                    vec3(0.76, 0.74, 0.69), // Warm architectural travertine/concrete slab
                                    vec3(0.64, 0.66, 0.69), // Weathered precast slate-concrete membrane
                                    tierSeed
                                );
                                // Keep only 14% of underlying tile luminance so the blurry 1997 2x2 diamonds & pink/yellow tints vanish
                                vec3 cleanRoof = archDeckBase * (0.90 + 0.14 * (roofLum - 0.5));
                                vec2 rf = fract(vWorldPos.xz);
                                vec2 subRf = fract(vWorldPos.xz * 2.0);
                                float edgeD = min(min(rf.x, 1.0 - rf.x), min(rf.y, 1.0 - rf.y));
                                float subD  = min(min(subRf.x, 1.0 - subRf.x), min(subRf.y, 1.0 - subRf.y));
                                float outerGutter = smoothstep(0.025, 0.075, edgeD);
                                float paverJoint  = smoothstep(0.020, 0.052, subD);
                                float paverBevel  = smoothstep(0.052, 0.085, subD) - smoothstep(0.085, 0.12, subD);
                                float grainSum = 0.0;
                                if (uMobileFast < 0.5) {
                                    float fineGrain = (fract(sin(dot(floor(vWorldPos.xz * 64.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.042;
                                    float medGrain  = (fract(sin(dot(floor(vWorldPos.xz * 16.0), vec2(39.346, 11.135))) * 43758.5453) - 0.5) * 0.024;
                                    grainSum = fineGrain + medGrain;
                                }
                                // Directional solar rim highlight along sun-facing roof edges
                                float sunEdgeRim = (1.0 - smoothstep(0.0, 0.14, rf.y)) * 0.045;
                                c.rgb = (cleanRoof + grainSum + paverBevel * 0.025 + sunEdgeRim)
                                    * mix(0.84, 1.0, outerGutter)
                                    * mix(0.89, 1.0, paverJoint);
                            } else {
                                // Luxury Miami Art Deco Rooftop & Resort Swimming Pool (lid 35):
                                // Travertine perimeter coping rim, cobalt ceramic waterline trim, mosaic tile floor & animated solar caustics!
                                vec2 pf = fract(vWorldPos.xz);
                                float edgeD = min(min(pf.x, 1.0 - pf.x), min(pf.y, 1.0 - pf.y));
                                if (edgeD < 0.068) {
                                    // Chiselled warm ivory travertine pool coping stones
                                    float joint = smoothstep(0.012, 0.032, min(fract(pf.x * 4.0), fract(pf.y * 4.0)));
                                    float bevel = smoothstep(0.0, 0.022, edgeD) * (1.0 - 0.15 * smoothstep(0.048, 0.068, edgeD));
                                    c.rgb = vec3(0.90, 0.87, 0.80) * (0.88 + 0.12 * joint) * bevel;
                                } else if (edgeD < 0.086) {
                                    // Cobalt-blue glazed ceramic waterline tile trim
                                    c.rgb = vec3(0.08, 0.36, 0.68);
                                } else {
                                    vec2 poolGrad;
                                    float poolSwell;
                                    float pCaust = evalWaterCaustics(vWorldPos.xz * 2.1, uTime * 1.15, poolGrad, poolSwell);
                                    vec2 refrPF = pf + poolGrad * 0.018;
                                    vec2 mosaicUV = fract(refrPF * 16.0);
                                    float tileGrouting = smoothstep(0.06, 0.16, min(mosaicUV.x, mosaicUV.y));
                                    float wallDepth = smoothstep(0.086, 0.24, edgeD);
                                    vec3 poolAqua = mix(vec3(0.06, 0.68, 0.84), vec3(0.16, 0.90, 0.92), 0.45 + 0.35 * wallDepth);
                                    poolAqua *= (0.93 + 0.07 * tileGrouting) * (0.76 + 0.24 * wallDepth);
                                    vec3 poolCaustCol = vec3(0.55, 0.98, 1.0) * pCaust * 0.48 + vec3(0.98, 0.96, 0.82) * pow(pCaust, 3.0) * 0.55;
                                    c.rgb = min(vec3(1.0), poolAqua + poolCaustCol);
                                }
                            }
                        }
                        float roofSunBoost = clamp((vWorldPos.y - 2.0) * 0.024, 0.0, 0.065) * (1.0 - sandMask * 0.85);
                        vec3 sunlitRgb = clamp((c.rgb - 0.5) * (1.0 + 0.14 * (1.0 - totalShade) * (1.0 - sandMask * 0.65)) + 0.5, 0.0, 1.0);
                        sunlitRgb = min(vec3(1.0), sunlitRgb * dayGrading * (1.0 + roofSunBoost));
                        c.rgb = mix(c.rgb, clamp(sunlitRgb, 0.0, 1.0), dayAmt);
                    }

                    // For shoreline tiles (lid 99..101), composite the beach sand & white surf directly over the animated ocean water on the SAME quad!
                    if (isShoreTile && c.a < 0.999) {
                        float shoreAlpha = c.a;
                        vec4 waterCol = sampleOceanWater(dayAmt);
                        // Add organic cellular seafoam lace along the swash transition
                        float swashZone = shoreAlpha * (1.0 - shoreAlpha) * 4.0;
                        float lace = clamp(0.55 + 0.45 * sin(vWorldPos.x * 14.0 + vWorldPos.z * 11.0 + uTime * 2.8), 0.0, 1.0);
                        vec3 swashFoam = vec3(0.94, 0.99, 1.0);
                        vec3 blendedShore = mix(waterCol.rgb, c.rgb, shoreAlpha);
                        c.rgb = mix(blendedShore, swashFoam, swashZone * lace * 0.42 * (0.45 + 0.55 * dayAmt));
                        c.a = mix(waterCol.a, 1.0, shoreAlpha);
                        waterCoverage = 1.0 - shoreAlpha;
                    }
                    // For curved basins, ponds, canals & beaches (isCurvedWater), transition from shoreline into animated water!
                    if (isCurvedWater && dWater > 0.065) {
                        vec4 waterCol = sampleOceanWater(dayAmt);
                        if (waterSurType > 2.5) {
                            // Natural beach & coastline surf shoreline: warm wet sand -> animated lacy white ocean surf foam -> turquoise shallows -> ocean
                            float tide = 0.028 * sin(uTime * 2.1 + vWorldPos.x * 0.55 + vWorldPos.z * 0.45) + 0.014 * cos(uTime * 3.4 - vWorldPos.z * 1.1);
                            float dSurf = dWater + tide;
                            // Fade all edge shelf & foam terms smoothly to 0.0 before reaching the inner tile border (dSurf >= 0.44) so there is zero 1-tile seam!
                            float innerFade = 1.0 - smoothstep(0.28, 0.44, dSurf);
                            float shallowShelf = exp(-max(0.0, dSurf - 0.11) * 6.5) * innerFade;
                            float foamLace = 0.72 + 0.28 * sin(vWorldPos.x * 12.5 - vWorldPos.z * 10.5 + uTime * 2.9);
                            float foam1 = exp(-pow((dSurf - 0.118) / 0.028, 2.0)) * 0.88 * foamLace;
                            float foam2 = exp(-pow((dSurf - 0.205) / 0.024, 2.0)) * 0.44 * foamLace;
                            float foam3 = exp(-pow((dSurf - 0.295) / 0.020, 2.0)) * 0.22 * foamLace;
                            float foam = clamp(foam1 + foam2 + foam3, 0.0, 0.94) * (0.42 + 0.58 * dayAmt) * innerFade;
                            vec3 shallowCol = waterCol.rgb + vec3(0.07, 0.20, 0.19) * shallowShelf * (0.35 + 0.65 * dayAmt);
                            vec3 shoreWater = mix(min(vec3(1.0), shallowCol), vec3(0.95, 0.99, 1.0), foam);
                            float waterMix = smoothstep(0.090, 0.135, dSurf);
                            c.rgb = mix(c.rgb, shoreWater, waterMix);
                            c.a = mix(1.0, waterCol.a, smoothstep(0.11, 0.19, dSurf));
                            waterCoverage = waterMix * (1.0 - foam * 0.75);
                        } else if (dWater > 0.125) {
                            // Enclosed urban basin / Venetian canal: submerged vertical stone wall shadow + emerald-turquoise shelf + dual meniscus ripple
                            float innerFade = 1.0 - smoothstep(0.26, 0.42, dWater);
                            float wallShade = mix(1.0, mix(0.60, 1.0, smoothstep(0.135, 0.28, dWater)), innerFade);
                            float shallowShelf = exp(-max(0.0, dWater - 0.135) * 8.5) * innerFade;
                            float rippleWave = 0.5 + 0.5 * sin(dWater * 52.0 - uTime * 3.4 + sin(vWorldPos.x * 4.8 + vWorldPos.z * 4.8) * 1.5);
                            float meniscus1 = exp(-pow((dWater - 0.148) / 0.017, 2.0)) * (0.58 + 0.42 * rippleWave) * innerFade;
                            float meniscus2 = exp(-pow((dWater - 0.195) / 0.014, 2.0)) * 0.32 * rippleWave * innerFade;
                            vec3 basinWater = waterCol.rgb * wallShade
                                + vec3(0.05, 0.18, 0.20) * shallowShelf * (0.35 + 0.65 * dayAmt)
                                + vec3(0.76, 0.93, 0.98) * (meniscus1 + meniscus2) * 0.45;
                            float waterMix = smoothstep(0.126, 0.144, dWater);
                            c.rgb = mix(c.rgb, min(vec3(1.0), basinWater), waterMix);
                            c.a = mix(1.0, waterCol.a, waterMix);
                            waterCoverage = waterMix;
                        }
                    }
                }

                // 2. 3D Cardinal Wall Normals, GTA 6 Architectural Facade Relief, Parallax Window Depth & Ground-Contact AO
                if (vAnim < -0.5) {
                    vec2 wallNormal = vec2(0.0, 1.0);
                    if (vAnim > -1.5) wallNormal = vec2(-1.0, 0.0);      // West wall (-1.0)
                    else if (vAnim > -2.5) wallNormal = vec2(1.0, 0.0);  // East wall (-2.0)
                    else if (vAnim > -3.5) wallNormal = vec2(0.0, -1.0); // North wall (-3.0)
                    else wallNormal = vec2(0.0, 1.0);                    // South wall (-4.0)

                    float sunDot = dot(wallNormal, uSunDir);
                    float wallSunFactor = clamp(sunDot * 0.5 + 0.5, 0.0, 1.0);
                    vec3 wallDayTint = mix(vec3(0.68, 0.77, 0.91), vec3(1.18, 1.10, 0.93), wallSunFactor);
                    vec3 wallShade = mix(vec3(1.0 + sunDot * 0.06), wallDayTint, dayAmt);

                    // Eliminate any synthwave purple / magenta / hot-pink / neon-cyan hue on vertical building walls
                    float wallLum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
                    float isGlass = clamp((c.b - c.r - 0.04) * 4.5, 0.0, 1.0);
                    winGlassMask = isGlass;
                    float purpleTint = clamp((min(c.r, c.b) - c.g + 0.02) * 4.5, 0.0, 1.0) * (1.0 - isGlass);
                    vec3 stoneNeutral = vec3(wallLum * 1.04, wallLum * 0.99, wallLum * 0.92);
                    c.rgb = mix(c.rgb, stoneNeutral, purpleTint);
                    // Compress excessive masonry saturation so brick/stucco stays grounded and architectural
                    vec3 masonryClean = mix(stoneNeutral, c.rgb, 0.62);
                    c.rgb = mix(masonryClean, c.rgb, isGlass);
                    // Deepen window glass into realistic dark architectural tinted glass
                    vec3 archGlass = vec3(0.18, 0.27, 0.36) + vec3(0.18, 0.24, 0.30) * clamp(wallLum, 0.0, 0.85);
                    c.rgb = mix(c.rgb, archGlass, isGlass * 0.72);

                    // Storey Cornice Ledge Highlight, Under-Eyebrow Shadow, Vertical Pilaster Fluting, Micro-Stucco Grain & Plinth AO
                    float storeyY = fract(vWorldPos.y);
                    float wallHoriz = fract(vWorldPos.x + vWorldPos.z);
                    float pilaster = mix(0.91, 1.02, smoothstep(0.04, 0.12, min(wallHoriz, 1.0 - wallHoriz)));
                    float corniceLight = 1.0 + 0.08 * smoothstep(0.91, 0.97, storeyY) - 0.10 * (smoothstep(0.80, 0.86, storeyY) - smoothstep(0.86, 0.92, storeyY));
                    float baseAO = mix(0.82, 1.0, smoothstep(0.0, 0.30, storeyY)) * mix(0.80, 1.0, smoothstep(2.0, 2.55, vWorldPos.y));
                    if (uMobileFast < 0.5) {
                        float stuccoGrain = (fract(sin(dot(floor(vec2(wallHoriz, storeyY) * 64.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.032 * (1.0 - isGlass);

                        // Daytime GTA 6 Parallax-Style Window Interior Depth (Venetian blinds/curtains) & Miami Sky Fresnel Glint
                        vec3 roomId = floor(vWorldPos * vec3(2.0, 1.0, 2.0));
                        float rSeed = fract(sin(dot(roomId, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
                        float blindLevel = 0.45 + 0.40 * rSeed;
                        float inBlind = step(blindLevel, fract(storeyY * 2.0)) * step(0.35, rSeed);
                        float slatWave = 0.88 + 0.12 * sin(storeyY * 96.0);
                        vec3 blindCol = mix(vec3(0.76, 0.73, 0.67), vec3(0.54, 0.64, 0.72), step(0.68, rSeed)) * slatWave;
                        c.rgb = mix(c.rgb + stuccoGrain, blindCol, isGlass * inBlind * 0.30 * dayAmt);
                    }

                    vec3 skyGlint = vec3(0.11, 0.17, 0.24) * isGlass * dayAmt * clamp((vWorldPos.y - 2.0) * 0.32, 0.0, 1.0) * (0.35 + 0.65 * wallSunFactor);
                    vec3 sunGlassSpec = vec3(0.24, 0.20, 0.12) * isGlass * dayAmt * pow(wallSunFactor, 3.0);
                    c.rgb = min(vec3(1.0), c.rgb * wallShade * baseAO * pilaster * corniceLight + skyGlint + sunGlassSpec);
                }

                if (uSunsetTint > 0.01) {
                    // Warm Vice City Golden-Pink Sunset & Atlantic Sunrise glow
                    vec3 sunsetCol = c.rgb * vec3(1.16, 0.88, 0.96) + vec3(0.05, 0.01, 0.03);
                    c.rgb = mix(c.rgb, min(vec3(1.0), sunsetCol), uSunsetTint * 0.65);
                }
                if (abs(uNightTint) > 0.01) {
                    bool emissiveOnly = (uNightTint < -0.5);
                    float nfAmt = emissiveOnly ? 1.0 : clamp(uNightTint, 0.0, 1.0);
                    vec3 nightRgb = c.rgb;
                    if (vAnim < -0.5) {
                        // Deterministic wall-face room hash: even at peak night (uWinLit=0.92), at most ~35% of windows light up (~65% stay dark!)
                        float isEW = step(-2.5, vAnim); // 1.0 for West(-1)/East(-2), 0.0 for North(-3)/South(-4)
                        float wallAlong = mix(vWorldPos.x, vWorldPos.z, isEW);
                        float wallFixed = floor(mix(vWorldPos.z, vWorldPos.x, isEW) + 0.5);
                        float faceIdx = floor(-vAnim + 0.5);
                        vec3 roomCell = vec3(floor(wallAlong * 2.0), floor(vWorldPos.y * 2.0), wallFixed * 4.0 + faceIdx);
                        float roomHash = fract(sin(dot(roomCell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
                        float activeQuota = uWinLit * 0.38;
                        float roomLit = smoothstep(roomHash - 0.015, roomHash + 0.005, activeQuota) * step(roomHash, activeQuota);
                        float paneU = fract(wallAlong * 2.0);
                        float paneV = fract(vWorldPos.y * 2.0);
                        float paneFrame = step(0.07, paneU) * step(paneU, 0.93) * step(0.09, paneV) * step(paneV, 0.91);
                        float litMask = winGlassMask * roomLit * paneFrame;

                        if (emissiveOnly) {
                            if (litMask < 0.12) discard;
                        }

                        // Realistic warm interior room illumination (warm tungsten, soft cream lamp, cozy amber, or warm daylight — zero multicolored neon!)
                        vec3 roomTint = vec3(1.0, 0.88, 0.54);
                        if (roomHash > 0.28) roomTint = vec3(1.0, 0.94, 0.76);
                        else if (roomHash > 0.16) roomTint = vec3(0.98, 0.80, 0.44);
                        else if (roomHash < 0.06) roomTint = vec3(0.90, 0.94, 1.0);

                        // Real interior window texture detail: ceiling-to-sill gradient + Venetian blind slats + original facade texture relief
                        float sy = fract(vWorldPos.y);
                        float winGrad = 0.82 + 0.26 * fract(sy * 2.0);
                        float blindMask = step(0.55 + 0.30 * roomHash, fract(sy * 2.0)) * step(0.14, roomHash);
                        float blindSlats = 0.78 + 0.22 * sin(sy * 96.0);
                        float texRelief = 0.78 + 0.36 * dot(rawTexRgb, vec3(0.299, 0.587, 0.114));
                        vec3 windowGlow = min(vec3(1.0), roomTint * winGrad * texRelief * mix(1.0, blindSlats * 0.82, blindMask));

                        if (emissiveOnly) {
                            gl_FragColor = vec4(windowGlow * litMask, 1.0);
                            return;
                        }
                        vec3 wallDark = c.rgb * vec3(0.45, 0.53, 0.78);
                        nightRgb = mix(wallDark, windowGlow, litMask);
                    } else if (vAnim > 0.5 && vAnim < 1.5) {
                        // Ocean / Bay / Lake water at night: deep nocturnal sapphire-navy with soft moonlight wave sheen!
                        vec2 mGrad;
                        float mSwell;
                        float mCaust = evalWaterCaustics(vWorldPos.xz * 0.85, uTime * 0.8, mGrad, mSwell);
                        vec3 neonWash = mix(vec3(0.14, 0.58, 0.88), vec3(0.76, 0.32, 0.68), 0.5 + 0.5 * sin(vWorldPos.z * 0.06 + vWorldPos.x * 0.04));
                        nightRgb = c.rgb * vec3(0.42, 0.54, 0.82) + neonWash * pow(mCaust, 2.2) * 0.18;
                    } else if (vAnim > 2.5 && vAnim < 3.5) {
                        // Sunken seabed at night
                        nightRgb = c.rgb * vec3(0.35, 0.47, 0.72);
                    } else {
                        // Horizontal ground (roads, sidewalks, golden beach sand, grass, rooftops) & hybrid water-edge tiles:
                        // Cool nocturnal moonlight base (darkened & lit dynamically by renderNightLighting!) + underwater LED glow for rooftop pools!
                        float isPoolNight = step(2.85, vWorldPos.y) * step(0.18, rawTexRgb.b - rawTexRgb.r) * step(0.12, rawTexRgb.g - rawTexRgb.r);
                        vec3 nightScale = mix(vec3(0.68, 0.73, 0.90), vec3(0.42, 0.54, 0.82), waterCoverage);
                        vec3 baseNight = c.rgb * nightScale;
                        if (waterCoverage > 0.01) {
                            vec2 mGrad;
                            float mSwell;
                            float mCaust = evalWaterCaustics(vWorldPos.xz * 0.85, uTime * 0.8, mGrad, mSwell);
                            vec3 neonWash = mix(vec3(0.14, 0.58, 0.88), vec3(0.76, 0.32, 0.68), 0.5 + 0.5 * sin(vWorldPos.z * 0.06 + vWorldPos.x * 0.04));
                            baseNight += neonWash * pow(mCaust, 2.2) * 0.18 * waterCoverage;
                        }
                        nightRgb = mix(baseNight, c.rgb * vec3(0.78, 0.92, 1.05), isPoolNight * 0.85);
                    }
                    c.rgb = mix(c.rgb, nightRgb, nfAmt);
                }
                gl_FragColor = c;
            }
        `;

        // 1B. 3D SpriteBatch Shader: Renders .G24 vehicles, peds, props, shadows & world-space procedural asphalt bays/markings
        const spriteVS = `
            attribute vec3 aPos;
            attribute vec2 aUV;
            attribute vec4 aColor;
            uniform mat4 uViewProj;
            varying vec2 vUV;
            varying vec4 vColor;
            varying vec3 vWorldPos;
            void main() {
                vUV = aUV;
                vColor = aColor;
                vWorldPos = aPos;
                gl_Position = uViewProj * vec4(aPos, 1.0);
            }
        `;

        const spriteFS = `
            precision mediump float;
            varying vec2 vUV;
            varying vec4 vColor;
            varying vec3 vWorldPos;
            uniform sampler2D uTex;
            uniform sampler2D uDayLightTex;
            uniform float uNightTint;
            uniform float uSunsetTint;
            uniform vec2 uSunDir;
            uniform float uMobileFast;

            float sHash(vec2 p) {
                p = mod(p, 512.0);
                vec3 p3 = fract(vec3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return fract((p3.x + p3.y) * p3.z);
            }
            float sNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x),
                    mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x),
                    u.y
                );
            }
            vec3 applyRoadLighting(vec3 col) {
                float dayAmt = clamp(1.0 - uNightTint * 1.15, 0.0, 1.0);
                if (dayAmt > 0.01) {
                    vec4 lm = texture2D(uDayLightTex, vWorldPos.xz / 512.0);
                    float onGround = clamp(2.75 - vWorldPos.y, 0.0, 1.0);
                    float bldAO = lm.g * onGround * 0.22;
                    float westSunWeight = clamp(0.76 - uSunDir.x * 0.35, 0.25, 0.92);
                    float bldShadow = max(lm.a * westSunWeight, lm.b * (1.0 - westSunWeight * 0.45)) * onGround;
                    float totalShade = clamp(bldShadow * 0.82 + bldAO * 0.25, 0.0, 1.0);
                    vec3 sunlitTint = vec3(1.11, 1.07, 0.98);
                    vec3 shadowTint = vec3(0.58, 0.67, 0.85);
                    vec3 dayGrading = mix(sunlitTint, shadowTint, totalShade) * (1.0 - bldAO * 0.22);
                    vec3 sunlitRgb = clamp((col - 0.5) * (1.0 + 0.14 * (1.0 - totalShade)) + 0.5, 0.0, 1.0);
                    sunlitRgb = min(vec3(1.0), sunlitRgb * dayGrading);
                    col = mix(col, clamp(sunlitRgb, 0.0, 1.0), dayAmt);
                }
                if (uSunsetTint > 0.01) {
                    vec3 sunsetCol = col * vec3(1.16, 0.88, 0.96) + vec3(0.05, 0.01, 0.03);
                    col = mix(col, min(vec3(1.0), sunsetCol), uSunsetTint * 0.65);
                }
                if (uNightTint > 0.01) {
                    float nfAmt = clamp(uNightTint * 1.35, 0.0, 0.72);
                    col = mix(col, col * vec3(0.68, 0.73, 0.90), nfAmt);
                }
                return col;
            }

            void main() {
                if (vUV.x < 0.0) {
                    // Mode A: Procedural Weathered Asphalt Parking Bay / Lot Pad (vUV.x in [-2.6 .. -1.4])
                    // Uses 100% bit-for-bit identical asphaltSurface() formula as cityFS so road and parking bay merge with zero color jump!
                    if (vUV.x > -2.7 && vUV.x < -1.3) {
                        float uBay = clamp(vUV.x + 2.5, 0.0, 1.0);
                        float vBay = clamp(vUV.y, 0.0, 1.0);
                        float modeFlag = vColor.r;
                        float wPx = max(16.0, vColor.g);
                        float hPx = max(16.0, vColor.b);

                        float dSidePx = uBay * wPx;
                        float dRoadPx = (1.0 - uBay) * wPx;
                        float dEndPx  = min(vBay, 1.0 - vBay) * hPx;

                        // Smooth S-curve curb flare at the North/South entry and exit of curbside parallel bays:
                        // At dEndPx = 0, taperIn = wPx - 8.0 so dCurbPx = dSidePx - (wPx - 8.0) = 8.0 - dRoadPx,
                        // aligning the curb stone (0..2px), shadow (2..3px), gutter (3..4px), and yellow line (5..7px)
                        // to 0.000px with the street tile's own curb! In the bay middle (dEndPx >= 15.0), taperIn = 0
                        // so dCurbPx = dSidePx seamlessly erases the road's curb and yellow line across the 8px overlap.
                        float taperT = clamp(1.0 - dEndPx / 15.0, 0.0, 1.0);
                        float taperCurve = taperT * taperT * (3.0 - 2.0 * taperT);
                        float taperIn = (modeFlag > 0.5)
                            ? taperCurve * (wPx - 8.0)
                            : 0.0;
                        float dCurbPx = (modeFlag > 0.5)
                            ? (dSidePx - taperIn)
                            : min(min(dSidePx, dRoadPx), dEndPx);
                        if (dCurbPx < 0.0) discard;

                        vec2 p = vWorldPos.xz;
                        float darkFamily = step(1.25, modeFlag);
                        vec3 base = mix(vec3(0.255, 0.285, 0.310), vec3(0.200, 0.220, 0.255), darkFamily);
                        vec3 col;
                        if (uMobileFast > 0.5) {
                            float grainFast = sHash(floor(p * 32.0));
                            col = base * (0.95 + grainFast * 0.09);
                        } else {
                            float big   = sNoise(p * 0.45) * 0.6 + sNoise(p * 1.3 + 7.0) * 0.4;
                            float mid   = sNoise(p * 4.0 + 13.0);
                            float grain = sHash(floor(p * 40.0));
                            float fine  = sHash(floor(p * 96.0) + 19.0);
                            col = base * (0.88 + big * 0.18 + mid * 0.07);
                            col *= 0.94 + grain * 0.05 + fine * 0.08;
                            col += vec3(0.055, 0.058, 0.062) * step(0.982, fine);
                            float tar = smoothstep(0.66, 0.80, sNoise(p * 0.7 + 31.0));
                            col *= 1.0 - tar * 0.13;
                            float seam = 1.0 - smoothstep(0.0, 0.022, abs(sNoise(p * 1.1 + 57.0) - 0.5));
                            col *= 1.0 - seam * 0.12 * step(0.68, sNoise(p * 0.3 + 3.0));
                        }

                        // 3D Stone Curb + Curb Drop Shadow + Concrete Gutter + Continuous Worn Yellow Curb Line (matching cityFS)
                        if (dCurbPx < 2.0) {
                            col = mix(vec3(0.83, 0.80, 0.75), vec3(0.72, 0.69, 0.64), dCurbPx * 0.5);
                        } else if (dCurbPx < 3.0) {
                            col = vec3(0.47, 0.45, 0.42);
                        } else if (dCurbPx < 4.2) {
                            float gMix = (dCurbPx - 3.0) / 1.2;
                            col = mix(vec3(0.18, 0.21, 0.24), col, gMix);
                        } else if (modeFlag > 0.5 && dCurbPx >= 5.0 && dCurbPx < 7.0) {
                            if (uMobileFast > 0.5) {
                                col = vec3(0.88, 0.73, 0.25);
                            } else {
                                float yWear = clamp(0.68 + sNoise(p * 7.5 + 43.0) * 0.32 - step(0.72, sHash(floor(p * 36.0))) * 0.28, 0.22, 0.88);
                                vec3 yPaint = vec3(0.95, 0.77, 0.20) * (0.90 + sNoise(p * 9.0 + 71.0) * 0.12);
                                col = mix(col, yPaint, yWear);
                            }
                        }

                        col = applyRoadLighting(col);
                        gl_FragColor = vec4(col, vColor.a);
                        return;
                    }
                    // Mode B: Procedural Worn, Chipped & Shadowed Road Paint / Oil Stain (vUV.x <= -2.8)
                    if (vUV.x <= -2.8) {
                        vec2 wp = vWorldPos.xz;
                        float wear = 0.52 + 0.48 * sNoise(wp * 6.8 + 31.4);
                        float chip = step(0.68, sHash(floor(wp * 42.0))) * 0.36;
                        float alpha = vColor.a * clamp(wear - chip, 0.18, 1.0);
                        if (alpha < 0.03) discard;
                        vec3 col = vColor.rgb + (sHash(floor(wp * 32.0)) - 0.5) * 0.035;
                        col = applyRoadLighting(clamp(col, 0.0, 1.0));
                        gl_FragColor = vec4(col, alpha);
                        return;
                    }
                    // Standard solid color quad (drop shadows, skidmarks, laser sights, bullets)
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
            uWinLit: gl.getUniformLocation(this.cityProg, "uWinLit"),
            uSunsetTint: gl.getUniformLocation(this.cityProg, "uSunsetTint"),
            uViceStyle: gl.getUniformLocation(this.cityProg, "uViceStyle"),
            uTime: gl.getUniformLocation(this.cityProg, "uTime"),
            uSunDir: gl.getUniformLocation(this.cityProg, "uSunDir"),
            uMobileFast: gl.getUniformLocation(this.cityProg, "uMobileFast")
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
            uTex: gl.getUniformLocation(this.spriteProg, "uTex"),
            uDayLightTex: gl.getUniformLocation(this.spriteProg, "uDayLightTex"),
            uNightTint: gl.getUniformLocation(this.spriteProg, "uNightTint"),
            uSunsetTint: gl.getUniformLocation(this.spriteProg, "uSunsetTint"),
            uSunDir: gl.getUniformLocation(this.spriteProg, "uSunDir"),
            uMobileFast: gl.getUniformLocation(this.spriteProg, "uMobileFast")
        };

        // Dynamic vertex buffer for 3D SpriteBatch (9 floats per vertex: x, y_elev, z_south, u, v, r, g, b, a)
        this.spriteBuffer = gl.createBuffer();
        this.maxSprites = 12288;
        if (!this.spriteVerts) {
            this.spriteVerts = new Float32Array(this.maxSprites * 6 * 9);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.spriteVerts.byteLength, gl.DYNAMIC_DRAW);
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
            const W = img.width || 2048;
            // Fixed y=3307 band for beachArchetypes, py=3315, py2=3361, py3=3407 inside the 2048x4096 atlas
            // so the texture height H NEVER exceeds 4096 (mobile WebGL MAX_TEXTURE_SIZE & iOS Safari canvas limit)!
            const origH = 3307;
            const H = Math.min(4096, Math.max(3570, img.height || 4096));

            // Pre-compute the shelf-packed atlas layout of the GTA 2 (1999) remap pedestrian archetypes
            // (synthesized from the GTA 1 civilian base `civ0`) inside verified empty shelves of 2048x4096.
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
            // Verified 100% empty & meta-free 26px-tall shelves inside gta1_sprites.png (y < 3307, zero overlap with vehicles/props/ads)
            const g2Shelves = [
                [4, 20, 342], [346, 32, 358], [802, 32, 602], [1626, 258, 418],
                [926, 262, 700], [4, 363, 374], [1416, 365, 628], [4, 389, 374],
                [1416, 391, 628], [4, 818, 764], [768, 822, 840], [4, 844, 764],
                [768, 848, 840], [530, 944, 838], [530, 970, 838], [1400, 1194, 644],
                [560, 1202, 840], [1400, 1220, 644], [560, 1228, 840], [4, 1322, 524],
                [880, 1322, 866], [4, 1348, 524], [880, 1348, 866], [4, 1854, 604],
                [4, 1880, 746], [1330, 1894, 714], [4, 1906, 782], [1330, 1920, 714],
                [606, 1976, 428], [1034, 1984, 434], [1712, 1990, 270], [606, 2002, 428],
                [918, 2050, 452], [1272, 2098, 280], [892, 2100, 380], [1552, 2114, 492],
                [630, 2116, 262], [1722, 2164, 322], [668, 2232, 260], [1630, 2292, 312],
                [1630, 2318, 414], [4, 2322, 280], [470, 2326, 314], [1630, 2344, 414],
                [966, 2396, 322], [4, 2400, 374], [602, 2400, 364], [1288, 2400, 292],
                [966, 2422, 322], [4, 2426, 374], [446, 2426, 520], [1288, 2426, 292],
                [966, 2448, 322], [4, 2452, 962], [1288, 2452, 292], [966, 2474, 322],
                [1181, 2647, 863], [370, 2661, 811], [1181, 2673, 863], [4, 2757, 422],
                [1519, 2774, 260], [1220, 3311, 824], [1320, 3460, 724], [1320, 3486, 724],
                [1320, 3512, 724], [1320, 3538, 724], [1744, 3580, 300], [1744, 3606, 300],
                [1744, 3632, 300], [1744, 3658, 300], [1266, 4042, 778], [1266, 4068, 778]
            ];
            const g2Layout = [];
            if (g2SrcFrames) {
                let sIdx = 0;
                let cx = g2Shelves[0][0];
                let cy = g2Shelves[0][1];
                let maxX = g2Shelves[0][0] + g2Shelves[0][2];
                // Dedicated 60px-tall empty shelf [1266, 4008, 778] for the 36 tall corpse frames (fk === "53", 12x32)
                let tallCx = 1266;
                const tallCy = 4008;
                // +1 archetype slot for the GTA 2 electrocution X-ray skeleton ("g2_xray")
                for (let ai = 0; ai <= g2Archs.length; ai++) {
                    for (const fk of g2FrameKeys) {
                        const r = g2SrcFrames[fk];
                        if (!Array.isArray(r) || r.length < 4) continue;
                        if (r[3] > 24) {
                            if (tallCx + r[2] + 2 <= 2044) {
                                g2Layout.push({ ai, fk, dx: tallCx, dy: tallCy });
                                tallCx += r[2] + 2;
                            }
                            continue;
                        }
                        if (cx + r[2] + 2 > maxX) {
                            sIdx++;
                            if (sIdx >= g2Shelves.length) break;
                            cx = g2Shelves[sIdx][0];
                            cy = g2Shelves[sIdx][1];
                            maxX = g2Shelves[sIdx][0] + g2Shelves[sIdx][2];
                        }
                        g2Layout.push({ ai, fk, dx: cx, dy: cy });
                        cx += r[2] + 2;
                    }
                }
            }

            this.spritesTexW = W;
            this.spritesTexH = H;
            const cvs = document.createElement("canvas");
            cvs.width = W;
            cvs.height = H;
            const ctx = cvs.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, W, H);
            const d = imgData.data;

            // 1. CloseInteriorHoles (src/alpha_bleed.h) + GTA 2 (1999) 3D Pre-Rendered Metallic Vehicle Remaster:
            // - Repairs interior palette-index-0 black holes inside car windshields, tires & grilles
            // - Upgrades flat 1997 8-bit car roofs/hoods with GTA 2's curved 3ds Max metallic clearcoat dome & contoured side fenders
            // - Transforms flat grey/black car windows into GTA 2 glossy sapphire-tinted windshields with diagonal sky reflections!
            // - Remasters pedestrian sprites (`isPed = true`) to GTA 2 (1999) 3D pre-rendered character quality (spherical head/shoulder dome + dark contour)!
            let sharedBufCap = 128 * 128;
            let sharedExt = new Uint8Array(sharedBufCap);
            let sharedQueue = new Int32Array(sharedBufCap);
            const closeBoxHoles = (rect, isVehicle = false, isPed = false) => {
                if (!Array.isArray(rect) || rect.length < 4) return;
                const [sx, sy, sw, sh] = rect;
                if (sw <= 3 || sh <= 3 || sx < 0 || sy < 0 || sx + sw > W || sy + sh > H) return;
                const size = sw * sh;
                if (size > sharedBufCap) {
                    sharedBufCap = size * 2;
                    sharedExt = new Uint8Array(sharedBufCap);
                    sharedQueue = new Int32Array(sharedBufCap);
                } else {
                    sharedExt.fill(0, 0, size);
                }
                const ext = sharedExt;
                const queue = sharedQueue;
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

            // Helper: Procedural GTA 6 / GTA 2 3D Scorched & Crumpled Vehicle Wreck Reconstructor
            // Builds a model-exact destroyed hulk at `dstRect` ([wx, wy, bw, bh]) from `srcRect` (ve.damage.heavy || ve.base)
            const buildProceduralVehicleWreck = (srcRect, dstRect, vtype = 4, hasHeavyDmg = true) => {
                if (!Array.isArray(srcRect) || srcRect.length < 4 || !Array.isArray(dstRect) || dstRect.length < 4) return;
                const [sx, sy, bw, bh] = srcRect;
                const [wx, wy, dw, dh] = dstRect;
                if (bw !== dw || bh !== dh || bw <= 4 || bh <= 4) return;

                // Copy source pixels into a temporary buffer so in-place (srcRect === dstRect) or bent-fork sampling is 100% safe
                const tmp = new Uint8Array(bw * bh * 4);
                for (let ly = 0; ly < bh; ly++) {
                    for (let lx = 0; lx < bw; lx++) {
                        const sp = ((sy + ly) * W + (sx + lx)) * 4;
                        const tp = (ly * bw + lx) * 4;
                        tmp[tp] = d[sp];
                        tmp[tp + 1] = d[sp + 1];
                        tmp[tp + 2] = d[sp + 2];
                        tmp[tp + 3] = d[sp + 3];
                    }
                }

                const isMoto = (vtype === 3 || bw <= 20);
                const isLongRig = (bh >= 95);
                const engCenterY = isMoto ? 0.50 : 0.77;
                const engHalfY = isMoto ? 0.14 : 0.10;
                const engHalfX = isMoto ? 0.44 : 0.42;

                const sampleSrc = (lx, ly) => {
                    let qx = lx;
                    let qy = ly;
                    if (isMoto) {
                        // Bent front forks & crooked rear wheel on wrecked motorcycles
                        if (ly >= bh * 0.66) {
                            qx = lx - Math.round((ly - bh * 0.66) * 0.18);
                        } else if (ly <= bh * 0.24) {
                            qx = lx + Math.round((bh * 0.24 - ly) * 0.14);
                        }
                    } else if (!hasHeavyDmg) {
                        // Procedural front/rear impact crumple warp for vehicles without a dedicated .G24 heavy-damage frame
                        if (ly >= bh - 7) {
                            qy = Math.min(bh - 1, ly + (((lx * 3 + ly) % 3) === 0 ? 1 : 0));
                        } else if (ly <= 6) {
                            qy = Math.max(0, ly - (((lx * 5 + ly) % 3) === 0 ? 1 : 0));
                        }
                    }
                    if (qx < 0 || qx >= bw || qy < 0 || qy >= bh) return -1;
                    return (qy * bw + qx) * 4;
                };

                for (let ly = 0; ly < bh; ly++) {
                    const fy = (ly + 0.5) / bh;
                    const ny = fy * 2.0 - 1.0;
                    for (let lx = 0; lx < bw; lx++) {
                        const dp = ((wy + ly) * W + (wx + lx)) * 4;
                        const fx = (lx + 0.5) / bw;
                        const nx = fx * 2.0 - 1.0;
                        const absNx = Math.abs(nx);

                        const tp = sampleSrc(lx, ly);
                        if (tp < 0 || tmp[tp + 3] < 16) {
                            d[dp] = 0; d[dp + 1] = 0; d[dp + 2] = 0; d[dp + 3] = 0;
                            continue;
                        }

                        // Jagged inward blast-crumple notches on extreme front/rear bumper corners
                        if (!isMoto && (ly <= 1 || ly >= bh - 2) && absNx > 0.52 && ((lx * 7 + ly * 11) % 4 === 0)) {
                            d[dp] = 0; d[dp + 1] = 0; d[dp + 2] = 0; d[dp + 3] = 0;
                            continue;
                        }

                        const sr = tmp[tp];
                        const sg = tmp[tp + 1];
                        const sb = tmp[tp + 2];
                        const lum = (sr * 0.299 + sg * 0.587 + sb * 0.114);
                        const maxC = Math.max(sr, sg, sb);
                        const minC = Math.min(sr, sg, sb);
                        const sat = maxC - minC;

                        // Check 1px outer silhouette perimeter
                        const tL = sampleSrc(lx - 1, ly);
                        const tR = sampleSrc(lx + 1, ly);
                        const tU = sampleSrc(lx, ly - 1);
                        const tD = sampleSrc(lx, ly + 1);
                        const isPerim =
                            (tL < 0 || tmp[tL + 3] < 16) ||
                            (tR < 0 || tmp[tR + 3] < 16) ||
                            (tU < 0 || tmp[tU + 3] < 16) ||
                            (tD < 0 || tmp[tD + 3] < 16);

                        if (isPerim) {
                            // Crisp dark charred steel silhouette border + shredded tire wheel-arch treads
                            const inAxle = (fy >= 0.13 && fy <= 0.34) || (fy >= 0.65 && fy <= 0.86);
                            if (inAxle && absNx > 0.68 && ((ly + lx) % 3 === 0)) {
                                // Exposed bent steel wheel rim glint on blown tire
                                d[dp] = 68; d[dp + 1] = 74; d[dp + 2] = 84; d[dp + 3] = 255;
                            } else {
                                d[dp] = 12; d[dp + 1] = 14; d[dp + 2] = 19; d[dp + 3] = 255;
                            }
                            continue;
                        }

                        // 1. Ruptured Smoldering Engine Bay Cavity (Front Hood / Mid-Bike / Secondary Long-Rig Blast Vent)
                        const eDist1 = Math.hypot(nx / engHalfX, (fy - engCenterY) / engHalfY);
                        const eDist2 = isLongRig ? Math.hypot(nx / 0.38, (fy - 0.36) / 0.08) : 9.0;
                        const eDist = Math.min(eDist1, eDist2);
                        if (eDist < 0.96 && ((lx * 5 + ly * 9) % 7 !== 0)) {
                            if (eDist > 0.72) {
                                // Jagged peeled dark hood lip around the blast crater
                                d[dp] = 18; d[dp + 1] = 20; d[dp + 2] = 26; d[dp + 3] = 255;
                            } else if ((lx === Math.floor(bw * 0.42) || lx === Math.floor(bw * 0.58)) && (ly % 2 === 0)) {
                                // Exposed metallic scorched V8 cylinder block & radiator manifold pipes
                                d[dp] = 94; d[dp + 1] = 102; d[dp + 2] = 116; d[dp + 3] = 255;
                            } else if (eDist < 0.58 && ((lx * 3 + ly * 7) % 5 === 0)) {
                                // Smoldering hot orange-amber ember coals deep inside the ruptured engine bay
                                const isHotCore = ((lx + ly) % 2 === 0);
                                d[dp] = isHotCore ? 245 : 218;
                                d[dp + 1] = isHotCore ? 142 : 68;
                                d[dp + 2] = isHotCore ? 22 : 14;
                                d[dp + 3] = 255;
                            } else {
                                // Oil-blackened hollow engine bay cavity
                                d[dp] = 14; d[dp + 1] = 16; d[dp + 2] = 21; d[dp + 3] = 255;
                            }
                            continue;
                        }

                        // 2. Blown-Out Hollow Windshields, Side Windows & Open Cockpit with Shattered Safety-Glass Rim
                        const inCabinBand = !isMoto && (fy >= 0.16 && fy <= 0.76) && (absNx <= 0.82);
                        const isGlassOrCockpit = inCabinBand && (
                            (lum < 76 && sat < 42) ||
                            (sb >= sr + 6 && lum < 125)
                        );
                        if (isGlassOrCockpit) {
                            const nL = tL >= 0 ? (tmp[tL] * 0.299 + tmp[tL + 1] * 0.587 + tmp[tL + 2] * 0.114) : 0;
                            const nR = tR >= 0 ? (tmp[tR] * 0.299 + tmp[tR + 1] * 0.587 + tmp[tR + 2] * 0.114) : 0;
                            const nU = tU >= 0 ? (tmp[tU] * 0.299 + tmp[tU + 1] * 0.587 + tmp[tU + 2] * 0.114) : 0;
                            const nD = tD >= 0 ? (tmp[tD] * 0.299 + tmp[tD + 1] * 0.587 + tmp[tD + 2] * 0.114) : 0;
                            const onWindowEdge = (nL > 88 || nR > 88 || nU > 88 || nD > 88);
                            if (onWindowEdge && ((lx * 7 + ly * 13) % 3 === 0)) {
                                // Jagged frosted tempered-glass shards clinging to the window frame
                                d[dp] = 128; d[dp + 1] = 140; d[dp + 2] = 158; d[dp + 3] = 255;
                            } else if (((lx * 5 + ly * 3) % 11 === 0) && absNx < 0.55) {
                                // Charred interior headrest / steering wheel frame silhouette
                                d[dp] = 26; d[dp + 1] = 24; d[dp + 2] = 28; d[dp + 3] = 255;
                            } else {
                                // Deep blown-out hollow soot-blackened cabin cavity
                                d[dp] = 11; d[dp + 1] = 13; d[dp + 2] = 18; d[dp + 3] = 255;
                            }
                            continue;
                        }

                        // 3. 3D Volumetric Scorched Body Metal, Oxidized Heat-Rust Patina & Recognizable Charred Livery
                        const dome = Math.max(0.0, 1.0 - nx * nx * 0.82);
                        const lumNorm = lum / 255.0;
                        const isCrease = ((lx * 3 + ly * 5) % 11 === 0) || ((lx * 7 - ly * 3 + 128) % 14 === 0);
                        const isRust = ((lx * 11 + ly * 17) % 9 < 3);
                        const isAsh = (dome > 0.62) && ((lx * 5 + ly * 7) % 8 === 0);

                        // Base charcoal gunmetal + 24% original model livery/paint contrast so the vehicle remains 100% recognizable
                        let wr = Math.round(24 + 26 * dome + lumNorm * 26 + sr * 0.24);
                        let wg = Math.round(25 + 26 * dome + lumNorm * 25 + sg * 0.21);
                        let wb = Math.round(29 + 28 * dome + lumNorm * 26 + sb * 0.19);

                        if (isRust) {
                            wr += 20;
                            wg += 7;
                            wb -= 4;
                        }
                        if (isAsh) {
                            wr += 18;
                            wg += 18;
                            wb += 20;
                        }
                        if (isCrease) {
                            wr = Math.round(wr * 0.54);
                            wg = Math.round(wg * 0.54);
                            wb = Math.round(wb * 0.58);
                        }

                        d[dp] = Math.max(10, Math.min(255, wr));
                        d[dp + 1] = Math.max(10, Math.min(255, wg));
                        d[dp + 2] = Math.max(12, Math.min(255, wb));
                        d[dp + 3] = 255;
                    }
                }
            };

            if (Array.isArray(meta.sprites.vehicles)) {
                for (const ve of meta.sprites.vehicles) {
                    if (ve.base) closeBoxHoles(ve.base, true, false);
                    if (Array.isArray(ve.remaps)) {
                        for (const rm of ve.remaps) closeBoxHoles(rm, true, false);
                    }
                    if (Array.isArray(ve.sirens)) {
                        for (const sr of ve.sirens) closeBoxHoles(sr, true, false);
                    }
                    if (Array.isArray(ve.doors)) {
                        for (const dr of ve.doors) closeBoxHoles(dr, true, false);
                    }
                    if (ve.damage) {
                        if (ve.damage.front) closeBoxHoles(ve.damage.front, true, false);
                        if (ve.damage.rear) closeBoxHoles(ve.damage.rear, true, false);
                        if (ve.damage.heavy) closeBoxHoles(ve.damage.heavy, true, false);
                    }

                    // Synthesize a bespoke, model-exact procedural destroyed wreck sprite (`ve.wreck`) for EVERY vehicle
                    // into its 6th remap slot (`ve.remaps[5]`) BEFORE `toNeutralDeltaOverlay` converts `ve.damage.heavy` into a sparse delta!
                    if (ve.base && ve.base.length >= 4 && Array.isArray(ve.remaps) && ve.remaps.length >= 6) {
                        const [bx, by, bw, bh] = ve.base;
                        const wreckRect = ve.remaps[5];
                        const hasHeavy = Boolean(
                            ve.damage &&
                            Array.isArray(ve.damage.heavy) &&
                            ve.damage.heavy.length >= 4 &&
                            ve.damage.heavy[2] === bw &&
                            ve.damage.heavy[3] === bh
                        );
                        const srcWreckRect = hasHeavy ? ve.damage.heavy : ve.base;
                        buildProceduralVehicleWreck(srcWreckRect, wreckRect, ve.vtype, hasHeavy);
                        ve.wreck = wreckRect;
                        const wKey = `veh_${ve.spr_idx}_wreck`;
                        if (meta.sprites.objects) meta.sprites.objects[wKey] = wreckRect;
                        if (meta.sprites.wrecked) meta.sprites.wrecked[wKey] = wreckRect;
                        ve.remaps = ve.remaps.slice(0, 5);
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
                        if (Array.isArray(ve.sirens)) {
                            for (const sr of ve.sirens) {
                                if (!Array.isArray(sr) || sr.length < 4) continue;
                                const [sx, sy, sw, sh] = sr;
                                if (sw !== bw || sh !== bh) continue;
                                for (let ly = 0; ly < bh; ly++) {
                                    for (let lx = 0; lx < bw; lx++) {
                                        const bp = ((by + ly) * W + (bx + lx)) * 4;
                                        const sp = ((sy + ly) * W + (sx + lx)) * 4;
                                        if (
                                            d[sp] === d[bp] &&
                                            d[sp + 1] === d[bp + 1] &&
                                            d[sp + 2] === d[bp + 2] &&
                                            d[sp + 3] === d[bp + 3]
                                        ) {
                                            d[sp] = 0;
                                            d[sp + 1] = 0;
                                            d[sp + 2] = 0;
                                            d[sp + 3] = 0;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (meta.sprites.wrecked) {
                for (const k of ["979", "980", "981", "982", "983", "984"]) {
                    const wr = meta.sprites.wrecked[k];
                    if (Array.isArray(wr) && wr.length >= 4) {
                        closeBoxHoles(wr, false, false);
                        buildProceduralVehicleWreck(wr, wr, k === "984" ? 3 : 4, false);
                    }
                }
            }
            // Note: closeBoxHoles on meta.sprites.peds runs AFTER 2B (beachArchetypes) and 2C (g2Archs)
            // so that 2B and 2C read the clean, un-highlighted source pixels of `lucia` and `civ0`!

            // 2. ConvertEffectToAlpha (dll/src/texture_store.cpp & tools/triage_textures.py) +
            //    Procedural 8-Frame Volumetric Fire Plume Reconstruction (234..241):
            //    Rebuilds the 1997 8-bit black-bordered fire sprites into clean multi-tongued translucent flames
            //    with zero dark charcoal/brown rectangular halo!
            if (meta.sprites.objects) {
                // 2A. Procedural 8-Frame Animated Fire Plumes (234..241)
                for (let fi = 0; fi < 8; fi++) {
                    const idStr = String(234 + fi);
                    const rect = meta.sprites.objects[idStr];
                    if (!Array.isArray(rect) || rect.length < 4) continue;
                    const [sx, sy, sw, sh] = rect;
                    const phase = (fi / 8.0) * Math.PI * 2.0;
                    for (let ly = 0; ly < sh; ly++) {
                        const ny = (ly - sh * 0.5) / (sh * 0.44);
                        for (let lx = 0; lx < sw; lx++) {
                            const nx = (lx - sw * 0.5) / (sw * 0.44);
                            const p = ((sy + ly) * W + (sx + lx)) * 4;
                            const ang = Math.atan2(ny, nx);
                            const rad = Math.hypot(nx, ny * 0.90);
                            const wave1 = Math.sin(ang * 3.0 + phase) * 0.13;
                            const wave2 = Math.cos(ang * 5.0 - phase * 2.0) * 0.08;
                            const wave3 = Math.sin((nx + ny) * 4.2 + phase) * 0.06;
                            const effR = rad + wave1 + wave2 + wave3;
                            if (effR >= 0.88) {
                                d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
                                continue;
                            }
                            const heat = Math.max(0.0, Math.min(1.0, 1.0 - effR / 0.88));
                            let fr, fg, fb, fa;
                            if (heat > 0.70) {
                                // White-hot / lemon-gold roaring flame core
                                const t = (heat - 0.70) / 0.30;
                                fr = 255;
                                fg = Math.round(232 + 22 * t);
                                fb = Math.round(96 + 135 * t);
                                fa = Math.round(235 + 20 * t);
                            } else if (heat > 0.38) {
                                // Vibrant golden-amber to fiery orange flame tongue
                                const t = (heat - 0.38) / 0.32;
                                fr = 255;
                                fg = Math.round(118 + 114 * t);
                                fb = Math.round(18 + 78 * t);
                                fa = Math.round(170 + 65 * t);
                            } else {
                                // Glowing crimson-orange outer ember tongue (zero dark brown/black pixels!)
                                const t = heat / 0.38;
                                fr = Math.round(220 + 35 * t);
                                fg = Math.round(42 + 76 * t);
                                fb = 14;
                                fa = Math.round(t * t * 170);
                            }
                            if (fa < 24) {
                                d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
                            } else {
                                d[p] = fr; d[p + 1] = fg; d[p + 2] = fb; d[p + 3] = fa;
                            }
                        }
                    }
                }

                // 2A-2. Procedural 8-Frame Spinning Helicopter Main Rotor (540..547):
                //       Replaces the 1997 8-bit opaque pitch-black bow-tie wedges with a crisp, translucent
                //       4-blade spinning rotor disc (metallic blades, yellow safety tips, silver hub & soft motion blur).
                for (let ri = 0; ri < 8; ri++) {
                    const idStr = String(540 + ri);
                    const rect = meta.sprites.objects[idStr];
                    if (!Array.isArray(rect) || rect.length < 4) continue;
                    const [sx, sy, sw, sh] = rect;
                    const cx = sw * 0.5;
                    const cy = sh * 0.5;
                    const maxR = Math.min(sw, sh) * 0.47;
                    const rotPhase = (ri / 8.0) * (Math.PI * 0.5);
                    for (let ly = 0; ly < sh; ly++) {
                        const dy = (ly + 0.5 - cy) / maxR;
                        for (let lx = 0; lx < sw; lx++) {
                            const dx = (lx + 0.5 - cx) / maxR;
                            const p = ((sy + ly) * W + (sx + lx)) * 4;
                            const rad = Math.hypot(dx, dy);
                            if (rad > 0.98) {
                                d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
                                continue;
                            }
                            if (rad < 0.13) {
                                // Central titanium/chrome rotor mast hub dome
                                const dome = 1.0 - rad / 0.13;
                                d[p] = Math.round(165 + 75 * dome);
                                d[p + 1] = Math.round(175 + 72 * dome);
                                d[p + 2] = Math.round(190 + 62 * dome);
                                d[p + 3] = 245;
                                continue;
                            }
                            // 4-blade angular coordinates (modulo pi/2)
                            let relAng = (Math.atan2(dy, dx) - rotPhase) % (Math.PI * 0.5);
                            if (relAng < 0) relAng += Math.PI * 0.5;
                            const bladeDist = Math.min(relAng, Math.PI * 0.5 - relAng) * rad;
                            if (bladeDist < 0.048) {
                                // Crisp spinning rotor blade arm with yellow high-vis safety tips
                                if (rad > 0.83) {
                                    d[p] = 250; d[p + 1] = 204; d[p + 2] = 21; d[p + 3] = 215;
                                } else {
                                    const sheen = 1.0 - bladeDist / 0.048;
                                    d[p] = Math.round(188 + 48 * sheen);
                                    d[p + 1] = Math.round(198 + 46 * sheen);
                                    d[p + 2] = Math.round(212 + 38 * sheen);
                                    d[p + 3] = 192;
                                }
                            } else if (relAng < 0.34) {
                                // Soft translucent silver-blue motion-blur sweep trailing each blade (never black!)
                                const trail = (1.0 - relAng / 0.34) * (0.45 + 0.55 * rad);
                                const a = Math.round(26 + 44 * trail);
                                d[p] = 210; d[p + 1] = 224; d[p + 2] = 238; d[p + 3] = a;
                            } else if (rad > 0.91 && rad < 0.96) {
                                // Subtle outer blade-tip vortex ring
                                d[p] = 226; d[p + 1] = 236; d[p + 2] = 248; d[p + 3] = 38;
                            } else {
                                d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
                            }
                        }
                    }
                }

                // 2B. Smoke puffs (200..210), Sparks (219..223) & Explosion fireballs (242..249)
                const effectRanges = [
                    [200, 210, false], // Smoke puffs
                    [219, 223, true],  // Sparks & ricochets
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
                                    // Strip dark 8-bit brown/charcoal border pixels around explosion fireballs
                                    const softA = Math.min(255, Math.max(0, Math.round((peak - 72) * 1.65)));
                                    if (softA < 24) {
                                        d[p] = 0; d[p + 1] = 0; d[p + 2] = 0; d[p + 3] = 0;
                                    } else {
                                        d[p + 3] = softA;
                                        d[p] = Math.min(255, Math.round(r * 1.22 + 24));
                                        d[p + 1] = Math.min(255, Math.round(g * 1.14 + 10));
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

                        // Pass 1: find head/hair center (hx, hy) for this frame so clothing regions track walking/pose frames accurately!
                        let hxSum = 0, hySum = 0, hCnt = 0;
                        for (let ly = 0; ly < sh; ly++) {
                            for (let lx = 0; lx < sw; lx++) {
                                const sp = ((sy + ly) * W + (sx + lx)) * 4;
                                if (d[sp + 3] < 16) continue;
                                const r = d[sp], g = d[sp + 1], b = d[sp + 2];
                                if (r < 78 && g < 78 && b < 86) {
                                    hxSum += lx;
                                    hySum += ly;
                                    hCnt++;
                                }
                            }
                        }
                        const hx = hCnt > 0 ? hxSum / hCnt : (sw - 1) * 0.5;
                        const hy = hCnt > 0 ? hySum / hCnt : (sh - 1) * 0.5;

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

                                const isPinkTop = (r > 145 && r > g + 32 && b > 55);
                                const isBlueJeans = (b > r + 12 && b > 60);
                                const isDarkHair = (!isPerim && r < 76 && g < 76 && b < 84);
                                const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 182.0;
                                const shade = Math.max(0.78, Math.min(1.24, lum));
                                const dx = lx - hx;
                                const dy = ly - hy;
                                const dist = Math.hypot(dx, dy);

                                let nr = Math.round(arch.skin[0] * shade);
                                let ng = Math.round(arch.skin[1] * shade);
                                let nb = Math.round(arch.skin[2] * shade);

                                if (isDarkHair) {
                                    const dome = Math.max(0, 1.0 - Math.hypot(dx * 0.28, dy * 0.28));
                                    const hMult = 0.84 + 0.36 * dome;
                                    nr = Math.round(arch.hair[0] * hMult);
                                    ng = Math.round(arch.hair[1] * hMult);
                                    nb = Math.round(arch.hair[2] * hMult);
                                    if (fKey === "42" && ly === 7 && lx >= 10 && lx <= 13) {
                                        nr = lx === 11 ? 56 : 18;
                                        ng = lx === 11 ? 189 : 24;
                                        nb = lx === 11 ? 248 : 38;
                                    }
                                } else if (arch.isSurfer) {
                                    // Surfer / Miami Beach guy: open tropical unbuttoned shirt trim on outer torso + vibrant striped boardshorts!
                                    if (isPinkTop && Math.abs(dx) >= 2.2 && Math.abs(dx) <= 4.4) {
                                        nr = Math.round(arch.bik[0] * shade);
                                        ng = Math.round(arch.bik[1] * shade);
                                        nb = Math.round(arch.bik[2] * shade);
                                    } else if (isBlueJeans && dist <= 6.8) {
                                        const isStripe = (Math.abs(dx) >= 2.6);
                                        nr = Math.round((isStripe ? 252 : arch.bik[0]) * shade);
                                        ng = Math.round((isStripe ? 118 : arch.bik[1]) * shade);
                                        nb = Math.round((isStripe ? 34  : arch.bik[2]) * shade);
                                    }
                                } else if (fKey === "42") {
                                    const inBikiniTop = (ly >= 9 && ly <= 11 && lx >= 8 && lx <= 15 && (isPinkTop || isBlueJeans));
                                    const inBikiniBot = ((ly === 14 || ly === 15) && lx >= 8 && lx <= 15 && (isPinkTop || isBlueJeans));
                                    if (inBikiniTop || inBikiniBot) {
                                        const cupSpec = (inBikiniTop && (lx === 10 || lx === 13)) ? 1.14 : 1.0;
                                        nr = Math.round(arch.bik[0] * shade * cupSpec);
                                        ng = Math.round(arch.bik[1] * shade * cupSpec);
                                        nb = Math.round(arch.bik[2] * shade * cupSpec);
                                    }
                                } else {
                                    // Standing / Walking / Rollerblading Bikini & Beachwear Woman:
                                    // Clearly visible Two-Piece Bikini Top across torso (`Math.abs(dx) <= 4.0`) + Matching Bottom/Shorts (`dist <= 5.6`) + Bare Tanned Arms & Legs!
                                    const inTop = isPinkTop && Math.abs(dx) <= 4.0;
                                    const inBot = isBlueJeans && dist <= 5.6;
                                    if (inTop || inBot) {
                                        const cupBoost = inTop ? 1.12 : 1.02;
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
                            const dx = lx - hx;
                            const dy = ly - hy;
                            const dist = Math.hypot(dx, dy);
                            const swatHelmetDist = Math.hypot(dx * 0.94, (dy - 0.12) * 0.96);
                            const inSwatHelmetDome = (
                                !isXray &&
                                arch &&
                                arch.key === "g2_swat" &&
                                hCnt >= 3 &&
                                ent.fk !== "42" &&
                                ent.fk !== "53" &&
                                lx >= 1 && lx < sw - 1 &&
                                ly >= 1 && ly < sh - 1 &&
                                swatHelmetDist <= 3.15
                            );
                            const fireHelmetDist = Math.hypot(dx * 0.92, (dy < 0 ? (dy + 0.18) * 0.80 : (dy - 0.10) * 0.95));
                            const inFireHelmetDome = (
                                !isXray &&
                                arch &&
                                arch.key === "g2_fireman" &&
                                hCnt >= 3 &&
                                ent.fk !== "42" &&
                                ent.fk !== "53" &&
                                lx >= 1 && lx < sw - 1 &&
                                ly >= 1 && ly < sh - 1 &&
                                fireHelmetDist <= 3.30
                            );
                            const isDockworker = arch && (arch.key === "dockworker_yellow" || arch.key === "dockworker_orange");
                            const hardhatDist = Math.hypot(dx * 0.94, (dy - 0.14) * 0.92);
                            const inHardhatDome = (
                                !isXray &&
                                isDockworker &&
                                hCnt >= 3 &&
                                ent.fk !== "42" &&
                                ent.fk !== "53" &&
                                lx >= 1 && lx < sw - 1 &&
                                ly >= 1 && ly < sh - 1 &&
                                hardhatDist <= 3.08
                            );
                            if (a < 16 && !inSwatHelmetDome && !inFireHelmetDome && !inHardhatDome) {
                                d[dp] = 0; d[dp + 1] = 0; d[dp + 2] = 0; d[dp + 3] = 0;
                                continue;
                            }
                            const r = d[sp], g = d[sp + 1], b = d[sp + 2];
                            const isHair = hairMask[ly * sw + lx] === 1;
                            const isShirt = !isHair && g > r + 8 && g > b + 20;
                            const isPants = !isHair && !isShirt && b > r + 25 && b + 6 >= g;
                            const isSkin = !isHair && !isShirt && !isPants && r >= 120 && g >= 55 && r > g + 20 && g > b;

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

                            if (inSwatHelmetDome) {
                                // Pixel-art rounded SWAT PASGT/FAST ballistic helmet dome + curved front visor
                                const isOuterRim = swatHelmetDist > 2.58;
                                const isVisorBand = (dy >= 1.05 && dy <= 2.55 && Math.abs(dx) <= 2.05);
                                const isEarPod = (!isVisorBand && Math.abs(dx) >= 1.85 && Math.abs(dy) <= 0.95);
                                if (isVisorBand) {
                                    if (isOuterRim) {
                                        d[dp] = 16; d[dp + 1] = 28; d[dp + 2] = 46; d[dp + 3] = 255;
                                    } else if (dx >= -1.25 && dx <= -0.15 && dy >= 1.15 && dy <= 2.15) {
                                        // Crisp white-cyan visor specular reflection
                                        d[dp] = 218; d[dp + 1] = 246; d[dp + 2] = 255; d[dp + 3] = 255;
                                    } else if (dx > 0.85) {
                                        // Shaded right curve of ballistic visor
                                        d[dp] = 32; d[dp + 1] = 126; d[dp + 2] = 196; d[dp + 3] = 255;
                                    } else {
                                        // Sapphire-cyan ballistic visor glass
                                        d[dp] = 64; d[dp + 1] = 196; d[dp + 2] = 250; d[dp + 3] = 255;
                                    }
                                } else if (isOuterRim) {
                                    d[dp] = 18; d[dp + 1] = 24; d[dp + 2] = 36; d[dp + 3] = 255;
                                } else if (isEarPod) {
                                    d[dp] = 28; d[dp + 1] = 38; d[dp + 2] = 54; d[dp + 3] = 255;
                                } else {
                                    const domeSpec = Math.max(0, 1.0 - Math.hypot((dx + 0.45) * 0.44, (dy + 0.55) * 0.44));
                                    const railBoost = (Math.abs(dx) <= 0.45 && dy >= -1.6 && dy <= 0.6) ? 14 : 0;
                                    d[dp] = clamp8(40 + domeSpec * 64 + railBoost);
                                    d[dp + 1] = clamp8(56 + domeSpec * 78 + railBoost);
                                    d[dp + 2] = clamp8(82 + domeSpec * 96 + railBoost);
                                    d[dp + 3] = 255;
                                }
                                continue;
                            }

                            if (inFireHelmetDome) {
                                // Traditional American VCFD Firefighter Helmet (red/gold Cairns dome, rear beavertail brim, front gold shield crest & SCBA visor)
                                const isOuterRim = fireHelmetDist > 2.68;
                                const isFrontShield = (dy >= 0.85 && dy <= 2.15 && Math.abs(dx) <= 1.05);
                                const isVisorBand = (!isFrontShield && dy >= 1.15 && dy <= 2.55 && Math.abs(dx) <= 2.05);
                                const isCenterComb = (Math.abs(dx) <= 0.45 && dy >= -2.3 && dy <= 0.85);
                                if (isFrontShield) {
                                    // Gleaming brass/gold VCFD front leather shield badge
                                    d[dp] = 250; d[dp + 1] = 204; d[dp + 2] = 21; d[dp + 3] = 255;
                                } else if (isVisorBand) {
                                    // SCBA polycarbonate facepiece visor with cyan/white specular glint
                                    if (dx < 0) {
                                        d[dp] = 186; d[dp + 1] = 230; d[dp + 2] = 253; d[dp + 3] = 255;
                                    } else {
                                        d[dp] = 56; d[dp + 1] = 189; d[dp + 2] = 248; d[dp + 3] = 255;
                                    }
                                } else if (isOuterRim) {
                                    // Dark crimson brim edge with yellow reflective trim
                                    if (dy < -1.2 && Math.abs(dx) <= 1.65) {
                                        d[dp] = 250; d[dp + 1] = 204; d[dp + 2] = 21; d[dp + 3] = 255;
                                    } else {
                                        d[dp] = 127; d[dp + 1] = 29; d[dp + 2] = 29; d[dp + 3] = 255;
                                    }
                                } else {
                                    const domeSpec = Math.max(0, 1.0 - Math.hypot((dx + 0.40) * 0.42, (dy + 0.45) * 0.42));
                                    const combBoost = isCenterComb ? 34 : 0;
                                    d[dp] = clamp8(195 + domeSpec * 55 + combBoost);
                                    d[dp + 1] = clamp8(28 + domeSpec * 44 + (isCenterComb ? 110 : 0));
                                    d[dp + 2] = clamp8(24 + domeSpec * 26);
                                    d[dp + 3] = 255;
                                }
                                continue;
                            }

                            if (inHardhatDome) {
                                // OSHA Port Stevedore / Dockworker Industrial Safety Hardhat (molded center ridge, brim & front bill visor)
                                const isOrangeWorker = arch.key === "dockworker_orange";
                                const isOuterRim = hardhatDist > 2.58;
                                const isFrontBill = (dy >= 1.25 && dy <= 2.75 && Math.abs(dx) <= 1.85);
                                const isCenterRidge = (Math.abs(dx) <= 0.48 && dy >= -2.1 && dy <= 1.15);
                                const domeSpec = Math.max(0, 1.0 - Math.hypot((dx + 0.38) * 0.42, (dy + 0.42) * 0.42));
                                if (isOuterRim) {
                                    // Dark-rimmed hardhat gutter edge
                                    d[dp] = isOrangeWorker ? 180 : 161;
                                    d[dp + 1] = isOrangeWorker ? 83 : 98;
                                    d[dp + 2] = isOrangeWorker ? 9 : 7;
                                    d[dp + 3] = 255;
                                } else if (isFrontBill) {
                                    // Projecting front sun/impact bill visor
                                    d[dp] = isOrangeWorker ? 234 : 234;
                                    d[dp + 1] = isOrangeWorker ? 88 : 179;
                                    d[dp + 2] = isOrangeWorker ? 12 : 8;
                                    d[dp + 3] = 255;
                                } else if (isCenterRidge) {
                                    // Raised molded reinforcement crown rib (safety orange on white helmet, bright lemon-white on yellow helmet)
                                    d[dp] = isOrangeWorker ? 255 : 254;
                                    d[dp + 1] = isOrangeWorker ? 115 : 240;
                                    d[dp + 2] = isOrangeWorker ? 24 : 118;
                                    d[dp + 3] = 255;
                                } else if (isOrangeWorker) {
                                    // Crisp Port Foreman white polymer hardhat dome
                                    d[dp] = clamp8(226 + domeSpec * 28);
                                    d[dp + 1] = clamp8(232 + domeSpec * 22);
                                    d[dp + 2] = clamp8(240 + domeSpec * 15);
                                    d[dp + 3] = 255;
                                } else {
                                    // Classic OSHA high-visibility yellow stevedore hardhat dome
                                    d[dp] = clamp8(228 + domeSpec * 27);
                                    d[dp + 1] = clamp8(184 + domeSpec * 52);
                                    d[dp + 2] = clamp8(12 + domeSpec * 32);
                                    d[dp + 3] = 255;
                                }
                                continue;
                            }

                            let col = null;
                            let shade = 1.0;
                            if (isShirt) {
                                shade = Math.max(0.45, Math.min(1.32, g / 185));
                                const ax = Math.abs(dx);
                                const bareArm =
                                    arch.sleeves === "bare" ||
                                    (arch.sleeves === "tank" && ax >= 4.2) ||
                                    (arch.sleeves === "short" && ax >= 5.2);
                                if (bareArm) {
                                    col = arch.skin;
                                    shade = Math.max(0.68, Math.min(1.18, shade * 1.04));
                                } else if (arch.key === "g2_swat") {
                                    // Heavy Kevlar plate-carrier vest over navy tactical sleeves + crisp white back/chest SWAT stencil
                                    if (ax <= 2.6 && Math.abs(dy) <= 4.2) {
                                        if (ax <= 1.5 && dy >= -2.3 && dy <= -1.2) {
                                            col = [214, 228, 246]; // Crisp SWAT back/shoulder tactical stencil bar
                                            shade = 1.05;
                                        } else {
                                            col = [22, 30, 44]; // Matte black-navy Kevlar plate carrier
                                        }
                                    } else {
                                        col = [42, 58, 86]; // Navy-slate tactical uniform sleeves
                                    }
                                } else if (arch.key === "g2_fireman") {
                                    // Heavy charcoal-tan Nomex turnout coat + bright yellow SCBA oxygen cylinder on back + neon lime-silver triple reflective stripes!
                                    if (ax <= 1.25 && dy >= -3.2 && dy <= -0.5) {
                                        if (dy >= -1.1) {
                                            col = [226, 232, 240]; // Chrome SCBA regulator valve neck
                                            shade = 1.10;
                                        } else {
                                            col = [250, 204, 21]; // High-vis yellow SCBA oxygen tank cylinder
                                            shade = 1.06;
                                        }
                                    } else if ((ly + 1) % 4 === 0 || (ax >= 3.2 && ax <= 4.4)) {
                                        col = [234, 255, 56]; // Glowing lime-yellow NFPA triple-trim reflective band
                                        shade = 1.12;
                                    } else {
                                        col = [44, 40, 38]; // Charcoal/bunker Nomex turnout coat
                                    }
                                } else if (isDockworker) {
                                    // Port Stevedore / Dockworker: High-visibility fluorescent safety vest with silver/yellow X-stripes over rugged work sleeves
                                    const isOrangeWorker = arch.key === "dockworker_orange";
                                    if (ax >= 2.85) {
                                        // Rolled-up navy/chambray work shirt sleeves
                                        col = isOrangeWorker ? [58, 72, 94] : [30, 58, 128];
                                    } else if (Math.abs(ax - 1.35) <= 0.52 || (ly + 1) % 4 === 0) {
                                        // 3M Scotchlite silver-white / neon-yellow reflective safety harness stripes
                                        col = isOrangeWorker ? [253, 234, 78] : [241, 245, 249];
                                        shade = 1.14;
                                    } else {
                                        // Fluorescent lime-yellow or safety-orange stevedore vest
                                        col = isOrangeWorker ? [255, 102, 18] : [226, 252, 36];
                                        shade = 1.06;
                                    }
                                } else {
                                    col = arch.shirt;
                                    if (arch.pattern === "hawaiian") {
                                        if ((lx + ly * 2 + ent.ai) % 4 === 0) col = arch.shirt2;
                                        else if ((lx * 3 + ly + ent.ai) % 5 === 0) col = arch.shirt3 || arch.shirt2;
                                    } else if (arch.pattern === "stripes") {
                                        if (ly % 2 === 0) col = arch.shirt2;
                                    } else if (arch.pattern === "jacket") {
                                        // Front V-collar opening ONLY (dy >= 0.45 in front of head; back of jacket dy < 0.45 stays 100% solid suit color!)
                                        if (dy >= 0.45 && ax <= 1.45) col = arch.shirt2;
                                    } else if (arch.pattern === "hivis") {
                                        if ((ly + 1) % 4 === 0) col = arch.shirt2;
                                    } else if (arch.pattern === "plaid") {
                                        if (lx % 3 === 0 || ly % 3 === 0) col = arch.shirt2;
                                    }
                                }
                            } else if (isPants) {
                                shade = Math.max(0.48, Math.min(1.35, b / 102));
                                const ax = Math.abs(dx);
                                if (
                                    arch.pattern === "jacket" &&
                                    ent.fk !== "42" &&
                                    ent.fk !== "53" &&
                                    dy >= 0.45 &&
                                    dy <= 2.35 &&
                                    ax <= Math.max(0.55, 1.45 - (dy - 0.45) * 0.42)
                                ) {
                                    // Front chest V-lapel dress shirt opening in front of head (civ0 encodes front chest as blue)
                                    col = arch.shirt2;
                                    shade = Math.max(0.78, Math.min(1.18, shade * 1.05));
                                } else if (arch.legs === "shorts" && dist > 5.8) {
                                    col = arch.skin;
                                    shade = Math.max(0.70, Math.min(1.15, shade));
                                } else if (arch.key === "g2_fireman") {
                                    if (dist > 5.2 && dist < 6.7) {
                                        col = [234, 255, 56]; // High-vis reflective cuff band on bunker pants
                                        shade = 1.10;
                                    } else {
                                        col = [52, 46, 42]; // Heavy bunker turnout trousers
                                    }
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
                                    shade = 0.86 + Math.max(0, 1.0 - dist / 2.4) * 0.48;
                                } else {
                                    col = arch.hair;
                                }
                            } else if (isSkin) {
                                if (arch.key === "g2_swat") {
                                    // Tactical black-charcoal gloves on hands & balaclava on neck
                                    col = [28, 36, 48];
                                    shade = 0.95;
                                } else if (arch.key === "g2_fireman") {
                                    // Fireproof golden-tan Kevlar firefighter gauntlets & Nomex hood
                                    col = [217, 166, 46];
                                    shade = 0.98;
                                } else if (isDockworker && dist > 3.1) {
                                    // Heavy-duty leather stevedore rigging gloves on hands
                                    col = [196, 154, 94];
                                    shade = 0.96;
                                } else {
                                    shade = Math.max(0.6, Math.min(1.2, r / 175));
                                    col = arch.skin;
                                }
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

            // Apply GTA 2 3D spherical head/shoulder shading & 1px dark contour to all ped sprites after synthesis.
            // Many synthesized archetypes share the SAME atlas rects with their source (e.g. beach peds reuse Lucia's
            // weapon frames, GTA 2 remaps reuse civ0's), so shade each unique atlas rect only ONCE — shading the same
            // pixels repeatedly over-darkens/discolors them (Lucia changing color while shooting).
            if (meta.sprites.peds) {
                const shadedRects = new Set();
                for (const roleKey of Object.keys(meta.sprites.peds)) {
                    const roleFrames = meta.sprites.peds[roleKey];
                    if (!roleFrames) continue;
                    for (const frameKey of Object.keys(roleFrames)) {
                        const rc = roleFrames[frameKey];
                        if (!Array.isArray(rc) || rc.length < 4) continue;
                        const rk = rc[0] + "," + rc[1] + "," + rc[2] + "," + rc[3];
                        if (shadedRects.has(rk)) continue;
                        shadedRects.add(rk);
                        closeBoxHoles(rc, false, true);
                    }
                }
            }

            // 3. BleedTransparentEdges (src/alpha_bleed.h):
            // 1-pass RGB color dilation into alpha=0 border texels (keeping alpha=0) to prevent dark fringe bleeding
            // (Skipped on mobile to avoid an 8.4M-pixel synchronous main-thread stall during startup)
            if (!this.isMobileInit) {
                const maxBleedY = Math.min(H - 1, origH);
                for (let y = 1; y < maxBleedY; y++) {
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
                {
                    const lx = 900, ly = py;
                    // Ground shadow / perimeter
                    ctx.fillStyle = "#0b111e";
                    ctx.fillRect(lx, ly, 36, 20);
                    // Aluminum tubular frame
                    const frmGrad = ctx.createLinearGradient(lx, ly, lx, ly + 20);
                    frmGrad.addColorStop(0, "#cbd5e1");
                    frmGrad.addColorStop(0.5, "#f8fafc");
                    frmGrad.addColorStop(1, "#94a3b8");
                    ctx.fillStyle = frmGrad;
                    ctx.fillRect(lx + 1, ly + 1, 34, 18);
                    // Padded turquoise mattress with 3D cylindrical slats
                    const matGrad = ctx.createLinearGradient(lx, ly + 3, lx, ly + 17);
                    matGrad.addColorStop(0, "#0284c7");
                    matGrad.addColorStop(0.2, "#38bdf8");
                    matGrad.addColorStop(0.5, "#7dd3fc");
                    matGrad.addColorStop(0.85, "#0369a1");
                    matGrad.addColorStop(1, "#075985");
                    ctx.fillStyle = matGrad;
                    ctx.fillRect(lx + 3, ly + 3, 30, 14);
                    // Mattress stitched segment lines
                    ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
                    ctx.lineWidth = 1;
                    for (let sx = lx + 8; sx <= lx + 28; sx += 5) {
                        ctx.beginPath(); ctx.moveTo(sx, ly + 3); ctx.lineTo(sx, ly + 17); ctx.stroke();
                    }
                    // Sculpted headrest pillow with sun highlight
                    const pilGrad = ctx.createRadialGradient(lx + 7, ly + 10, 1, lx + 7, ly + 10, 7);
                    pilGrad.addColorStop(0, "#ffffff");
                    pilGrad.addColorStop(0.4, "#fef08a");
                    pilGrad.addColorStop(1, "#eab308");
                    ctx.fillStyle = pilGrad;
                    ctx.fillRect(lx + 4, ly + 4, 7, 12);
                    meta.sprites.objects["beach_lounger"] = [lx, ly, 36, 20];
                }

                // Octagonal Yellow/Orange Beach Umbrella ("umbrella_yellow")
                {
                    const ux = 964, uy = py + 20, ur = 18;
                    // Dark outer bevel
                    ctx.beginPath();
                    ctx.arc(ux, uy, ur + 1, 0, Math.PI * 2);
                    ctx.fillStyle = "#0b111e";
                    ctx.fill();
                    // 3ds Max 3D conical spherical dome shading
                    for (let w = 0; w < 8; w++) {
                        const a0 = (w / 8) * Math.PI * 2;
                        const a1 = ((w + 1) / 8) * Math.PI * 2;
                        const domeGrad = ctx.createRadialGradient(ux - 4, uy - 4, 2, ux, uy, ur);
                        if (w % 2 === 0) {
                            domeGrad.addColorStop(0, "#fef08a");
                            domeGrad.addColorStop(0.5, "#facc15");
                            domeGrad.addColorStop(1, "#ca8a04");
                        } else {
                            domeGrad.addColorStop(0, "#fdba74");
                            domeGrad.addColorStop(0.5, "#f97316");
                            domeGrad.addColorStop(1, "#c2410c");
                        }
                        ctx.beginPath();
                        ctx.moveTo(ux, uy);
                        ctx.arc(ux, uy, ur, a0, a1);
                        ctx.closePath();
                        ctx.fillStyle = domeGrad;
                        ctx.fill();
                        // Rib seam
                        ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                    // Center chrome cap / finial
                    const finGrad = ctx.createRadialGradient(ux - 1, uy - 1, 0.5, ux, uy, 3.5);
                    finGrad.addColorStop(0, "#ffffff");
                    finGrad.addColorStop(0.6, "#e2e8f0");
                    finGrad.addColorStop(1, "#475569");
                    ctx.fillStyle = finGrad;
                    ctx.beginPath(); ctx.arc(ux, uy, 3.5, 0, Math.PI * 2); ctx.fill();
                    meta.sprites.objects["umbrella_yellow"] = [944, py, 40, 40];
                }

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

                // =========================================================================
                // 5. GTA 6 LEONIDA & VICE CITY LIVING WORLD PROP SPRITES (Row py2 = origH + 54)
                // =========================================================================
                const py2 = origH + 54;

                // 5A. Leonida Everglades Alligator ("gator_3d", 48x20, facing East +X)
                const gx = 820, gy = py2;
                ctx.save();
                // 4 splayed reptile legs with claws
                ctx.fillStyle = "#1e2e16";
                ctx.fillRect(gx + 14, gy + 1, 5, 5);
                ctx.fillRect(gx + 14, gy + 14, 5, 5);
                ctx.fillRect(gx + 28, gy + 1, 5, 5);
                ctx.fillRect(gx + 28, gy + 14, 5, 5);
                // Sinuous armored tail (left) + muscular torso + broad U-shaped snout (right)
                ctx.beginPath();
                ctx.moveTo(gx + 1, gy + 10);
                ctx.quadraticCurveTo(gx + 10, gy + 6, gx + 22, gy + 4);
                ctx.lineTo(gx + 35, gy + 5);
                ctx.quadraticCurveTo(gx + 46, gy + 6, gx + 47, gy + 10);
                ctx.quadraticCurveTo(gx + 46, gy + 14, gx + 35, gy + 15);
                ctx.lineTo(gx + 22, gy + 16);
                ctx.quadraticCurveTo(gx + 10, gy + 14, gx + 1, gy + 10);
                ctx.closePath();
                ctx.fillStyle = "#2d4420";
                ctx.fill();
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = "#0f190b";
                ctx.stroke();
                // Osteoderm dorsal scale ridges along back & tail
                ctx.fillStyle = "#4d6b34";
                for (let sx = 6; sx <= 34; sx += 4) {
                    ctx.fillRect(gx + sx, gy + 7, 2.5, 2);
                    ctx.fillRect(gx + sx, gy + 11, 2.5, 2);
                }
                ctx.fillStyle = "#658544";
                ctx.fillRect(gx + 14, gy + 9, 18, 2);
                // Glowing amber reptile eyes & nostrils
                ctx.fillStyle = "#facc15";
                ctx.fillRect(gx + 36, gy + 6, 2.5, 2);
                ctx.fillRect(gx + 36, gy + 12, 2.5, 2);
                ctx.fillStyle = "#0f190b";
                ctx.fillRect(gx + 43, gy + 7.5, 1.8, 1.5);
                ctx.fillRect(gx + 43, gy + 11, 1.8, 1.5);
                ctx.restore();
                meta.sprites.objects["gator_3d"] = [gx, gy, 48, 20];

                // 5B. Leonida Pink Flamingo ("flamingo_pink", 18x18)
                const fx0 = 874, fy0 = py2;
                ctx.save();
                ctx.fillStyle = "#be185d";
                ctx.beginPath();
                ctx.ellipse(fx0 + 8, fy0 + 9, 5.5, 4.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#f43f5e";
                ctx.beginPath();
                ctx.ellipse(fx0 + 8, fy0 + 9, 4.5, 3.3, 0, 0, Math.PI * 2);
                ctx.fill();
                // Wing highlight
                ctx.fillStyle = "#fda4af";
                ctx.beginPath();
                ctx.ellipse(fx0 + 7, fy0 + 8.5, 3.0, 1.8, 0, 0, Math.PI * 2);
                ctx.fill();
                // S-curved neck & head extending East
                ctx.strokeStyle = "#fb7185";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(fx0 + 11, fy0 + 9);
                ctx.quadraticCurveTo(fx0 + 15, fy0 + 6, fx0 + 14, fy0 + 9);
                ctx.stroke();
                ctx.fillStyle = "#f43f5e";
                ctx.beginPath();
                ctx.arc(fx0 + 14.5, fy0 + 9, 2.2, 0, Math.PI * 2);
                ctx.fill();
                // Black-tipped hooked beak
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(fx0 + 15.5, fy0 + 8.2, 2.2, 1.8);
                ctx.restore();
                meta.sprites.objects["flamingo_pink"] = [fx0, fy0, 18, 18];

                // 5C. Inflatable Neon Pink Flamingo Pool Float ("flamingo_float", 26x26)
                const flx = 898, fly = py2;
                ctx.save();
                ctx.beginPath();
                ctx.arc(flx + 13, fly + 13, 10, 0, Math.PI * 2);
                ctx.arc(flx + 13, fly + 13, 4.2, 0, Math.PI * 2, true);
                ctx.fillStyle = "#ff2a85";
                ctx.fill("evenodd");
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = "#831843";
                ctx.stroke();
                // Glossy sun highlight arc on float tube
                ctx.strokeStyle = "#fbcfe8";
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(flx + 13, fly + 13, 7.5, -Math.PI * 0.75, -Math.PI * 0.15);
                ctx.stroke();
                // Flamingo head & black-tipped beak on East rim
                ctx.fillStyle = "#ff2a85";
                ctx.beginPath();
                ctx.arc(flx + 21, fly + 13, 3.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(flx + 22, fly + 12, 2, 2);
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(flx + 23.5, fly + 12, 2, 2);
                ctx.restore();
                meta.sprites.objects["flamingo_float"] = [flx, fly, 26, 26];

                // 5D & 5E. Pre-Rendered 3ds Max Superyacht & WaveRunner (baked directly into gta1_sprites.png)
                meta.sprites.objects["luxury_yacht"] = [930, 3361, 96, 38];
                meta.sprites.objects["jetski_neon"] = [1032, 3361, 32, 14];

                // 5F. Muscle Beach Weightlifting Bench & Heavy Barbell ("gym_bench", 30x22)
                const gbx = 1070, gby = py2;
                ctx.save();
                // Rubber gym floor mat
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(gbx + 1, gby + 1, 28, 20);
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 1;
                ctx.strokeRect(gbx + 1.5, gby + 1.5, 27, 19);
                // Black leather bench pad along X
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(gbx + 5, gby + 7, 20, 8);
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(gbx + 6, gby + 8, 18, 6);
                // Chrome Olympic barbell across Y at head of bench (x = gbx + 21) + cast-iron weight plates
                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(gbx + 20, gby + 1, 2, 20);
                ctx.fillStyle = "#090d16";
                ctx.fillRect(gbx + 18, gby + 1, 6, 4);
                ctx.fillRect(gbx + 18, gby + 17, 6, 4);
                ctx.restore();
                meta.sprites.objects["gym_bench"] = [gbx, gby, 30, 22];

                // 5G. Muscle Beach Fitness Mat & Kettlebells ("gym_mat_cyan", 28x16)
                const gmx = 1106, gmy = py2;
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(gmx + 1, gmy + 1, 26, 14);
                ctx.fillStyle = "#06b6d4";
                ctx.fillRect(gmx + 2, gmy + 2, 24, 12);
                ctx.fillStyle = "#22d3ee";
                ctx.fillRect(gmx + 4, gmy + 4, 20, 8);
                meta.sprites.objects["gym_mat_cyan"] = [gmx, gmy, 28, 16];

                // 5H. Wynwood Street-Art Graffiti & Breakdance Cypher Mat ("wynwood_mural_rug", 48x32)
                const wmx = 1140, wmy = py2;
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(wmx, wmy, 48, 32);
                ctx.fillStyle = "#ec4899";
                ctx.fillRect(wmx + 2, wmy + 2, 22, 14);
                ctx.fillStyle = "#06b6d4";
                ctx.fillRect(wmx + 24, wmy + 2, 22, 14);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(wmx + 2, wmy + 16, 22, 14);
                ctx.fillStyle = "#a855f7";
                ctx.fillRect(wmx + 24, wmy + 16, 22, 14);
                // Geometric spray-art star & circle in center
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(wmx + 24, wmy + 16, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#10b981";
                ctx.beginPath();
                ctx.arc(wmx + 24, wmy + 16, 5, 0, Math.PI * 2);
                ctx.fill();
                meta.sprites.objects["wynwood_mural_rug"] = [wmx, wmy, 48, 32];

                // 5I. Outdoor / Rooftop VIP DJ Turntable Deck ("dj_turntable_deck", 36x18)
                const djx = 1194, djy = py2;
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(djx + 1, djy + 1, 34, 16);
                ctx.fillStyle = "#334155";
                ctx.fillRect(djx + 2, djy + 2, 32, 14);
                // Twin black vinyl platters + silver tonearms + center mixer + neon front bar
                ctx.fillStyle = "#090d16";
                ctx.beginPath();
                ctx.arc(djx + 10, djy + 9, 5, 0, Math.PI * 2);
                ctx.arc(djx + 26, djy + 9, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ff2a85";
                ctx.beginPath();
                ctx.arc(djx + 10, djy + 9, 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#00f0ff";
                ctx.beginPath();
                ctx.arc(djx + 26, djy + 9, 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(djx + 16, djy + 4, 4, 10);
                ctx.fillStyle = "#00f0ff";
                ctx.fillRect(djx + 3, djy + 14, 30, 2);
                meta.sprites.objects["dj_turntable_deck"] = [djx, djy, 36, 18];

                // 5J. Mount Kalaga National Park 3D Dome Tents ("camp_tent_green", "camp_tent_orange", 32x26)
                const drawDomeTent = (tx0, ty0, mainCol, ridgeCol) => {
                    ctx.fillStyle = "#0f172a";
                    ctx.fillRect(tx0 + 2, ty0 + 2, 28, 22);
                    ctx.fillStyle = mainCol;
                    ctx.fillRect(tx0 + 3, ty0 + 3, 26, 20);
                    ctx.strokeStyle = ridgeCol;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(tx0 + 3, ty0 + 3);
                    ctx.lineTo(tx0 + 29, ty0 + 23);
                    ctx.moveTo(tx0 + 29, ty0 + 3);
                    ctx.lineTo(tx0 + 3, ty0 + 23);
                    ctx.stroke();
                    ctx.fillStyle = "#1e293b";
                    ctx.fillRect(tx0 + 12, ty0 + 19, 8, 4); // tent door flap
                };
                drawDomeTent(1236, py2, "#15803d", "#86efac");
                meta.sprites.objects["camp_tent_green"] = [1236, py2, 32, 26];

                drawDomeTent(1274, py2, "#ea580c", "#fde047");
                meta.sprites.objects["camp_tent_orange"] = [1274, py2, 32, 26];

                // 5K. Stone Ring Campfire ("campfire_ring", 24x24)
                const cfx = 1312, cfy = py2;
                ctx.save();
                // Circle of 8 grey river stones
                for (let s = 0; s < 8; s++) {
                    const a = (s / 8) * Math.PI * 2;
                    ctx.fillStyle = (s % 2 === 0) ? "#64748b" : "#94a3b8";
                    ctx.beginPath();
                    ctx.arc(cfx + 12 + Math.cos(a) * 8, cfy + 12 + Math.sin(a) * 8, 3.0, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Crossed brown firewood logs
                ctx.strokeStyle = "#78350f";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cfx + 6, cfy + 6);
                ctx.lineTo(cfx + 18, cfy + 18);
                ctx.moveTo(cfx + 18, cfy + 6);
                ctx.lineTo(cfx + 6, cfy + 18);
                ctx.stroke();
                // Glowing fire core
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.arc(cfx + 12, cfy + 12, 5.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#facc15";
                ctx.beginPath();
                ctx.arc(cfx + 12, cfy + 12, 3.0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                meta.sprites.objects["campfire_ring"] = [cfx, cfy, 24, 24];

                // 5L. Everglades Water Lilypad & Pink Lotus ("lilypad_green", 16x16)
                const lpx = 1342, lpy = py2;
                ctx.save();
                ctx.fillStyle = "#16a34a";
                ctx.beginPath();
                ctx.moveTo(lpx + 8, lpy + 8);
                ctx.arc(lpx + 8, lpy + 8, 6.5, 0.3, Math.PI * 2 - 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "#4ade80";
                ctx.beginPath();
                ctx.arc(lpx + 7, lpy + 7, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#f472b6";
                ctx.beginPath();
                ctx.arc(lpx + 8, lpy + 8, 2.0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                meta.sprites.objects["lilypad_green"] = [lpx, lpy, 16, 16];

                // 5M. Vice City Golf Club Putting Green & Flagstick ("golf_green_pin", 28x28)
                const ggx = 1364, ggy = py2;
                ctx.save();
                ctx.fillStyle = "#fde68a"; // sand bunker kidney edge
                ctx.beginPath();
                ctx.arc(ggx + 8, ggy + 20, 5.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#22c55e";
                ctx.beginPath();
                ctx.arc(ggx + 14, ggy + 14, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#4ade80";
                ctx.beginPath();
                ctx.arc(ggx + 14, ggy + 14, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#0f172a";
                ctx.beginPath();
                ctx.arc(ggx + 14, ggy + 14, 2.0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                meta.sprites.objects["golf_green_pin"] = [ggx, ggy, 28, 28];

                // 5N..5S. Pre-Rendered 3ds Max Aviation & Marine Sprites (baked directly into gta1_sprites.png)
                meta.sprites.objects["airliner_jet"] = [1408, 3361, 108, 96];
                meta.sprites.objects["private_learjet"] = [1520, 3361, 64, 58];
                meta.sprites.objects["heli_vice"] = [1588, 3361, 64, 30];
                meta.sprites.objects["helipad_mark"] = [1656, 3361, 56, 56];
                meta.sprites.objects["cargo_barge"] = [1716, 3361, 112, 38];
                meta.sprites.objects["container_stack"] = [1832, 3361, 40, 18];

                // =========================================================================
                // 6. GTA 6 LEONIDA & VICE CITY SPECIAL WORLD UPGRADE SPRITES (Row py3 = origH + 100)
                // =========================================================================
                const py3 = origH + 100;
                meta.sprites.objects["airboat_fan"] = [1588, 3407, 52, 28];
                meta.sprites.objects["dodo_seaplane"] = [1876, 3361, 64, 58];

                // 6C. Club Nine 1 Nine Trailing Aerial Banner ("sky_banner_919", 108x22, tow bridle on East +X)
                {
                    const sbx = 946, sby = py3;
                    ctx.save();
                    // High-tensile steel tow harness bridle lines
                    ctx.strokeStyle = "#cbd5e1";
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.moveTo(sbx + 107, sby + 11); ctx.lineTo(sbx + 90, sby + 3);
                    ctx.moveTo(sbx + 107, sby + 11); ctx.lineTo(sbx + 90, sby + 19);
                    ctx.stroke();

                    // Dark outer shadow border
                    ctx.fillStyle = "#0b111e";
                    ctx.fillRect(sbx + 1, sby + 1, 90, 20);

                    // Deep obsidian banner fabric with horizontal cloth wave gradient
                    const banGrad = ctx.createLinearGradient(sbx + 2, sby + 2, sbx + 90, sby + 2);
                    banGrad.addColorStop(0.0, "#090d16");
                    banGrad.addColorStop(0.25, "#1e293b");
                    banGrad.addColorStop(0.50, "#0f172a");
                    banGrad.addColorStop(0.75, "#1e293b");
                    banGrad.addColorStop(1.0, "#090d16");
                    ctx.fillStyle = banGrad;
                    ctx.fillRect(sbx + 2, sby + 2, 88, 18);

                    // Vibrant Neon Magenta Glowing Frame
                    ctx.strokeStyle = "#ff2a85";
                    ctx.lineWidth = 2.0;
                    ctx.strokeRect(sbx + 2, sby + 2, 88, 18);

                    // Electric Cyan Inner Trim Ribbons
                    ctx.fillStyle = "#00f0ff";
                    ctx.fillRect(sbx + 5, sby + 4.5, 82, 1.8);
                    ctx.fillRect(sbx + 5, sby + 15.7, 82, 1.8);

                    // Crisp Glowing "NINE 1 NINE" VIP Club Typography
                    ctx.font = "bold 9.5px 'Arial Black', Impact, sans-serif";
                    ctx.fillStyle = "#ff2a85";
                    ctx.fillText("NINE 1 NINE", sbx + 12, sby + 15);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillText("NINE 1 NINE", sbx + 11, sby + 14);
                    ctx.restore();
                    meta.sprites.objects["sky_banner_919"] = [sbx, sby, 108, 22];
                }

                // 6D. Street Takeover / Sideshow Tire Burnout Skid Ring ("donut_skid_ring", 62x62)
                {
                    const drx = 1060, dry = py3;
                    ctx.save();
                    // Multi-layer rubberized asphalt burn marks
                    ctx.strokeStyle = "rgba(11, 17, 30, 0.78)";
                    ctx.lineWidth = 3.6;
                    ctx.beginPath(); ctx.arc(drx + 31, dry + 31, 24, 0, Math.PI * 2); ctx.stroke();

                    ctx.strokeStyle = "rgba(30, 41, 59, 0.65)";
                    ctx.lineWidth = 2.8;
                    ctx.beginPath(); ctx.arc(drx + 31, dry + 31, 18, 0.35, Math.PI * 1.85); ctx.stroke();

                    ctx.strokeStyle = "rgba(15, 23, 42, 0.50)";
                    ctx.lineWidth = 2.0;
                    ctx.beginPath(); ctx.arc(drx + 31, dry + 31, 12, 0.8, Math.PI * 2.2); ctx.stroke();
                    ctx.restore();
                    meta.sprites.objects["donut_skid_ring"] = [drx, dry, 62, 62];
                }

                // 6E. Leonida Keys & Ocean Drive Thatched Tiki Bar Roof ("tiki_hut_roof", 52x36)
                {
                    const tkx = 1128, tky = py3;
                    ctx.save();
                    // Ground shadow
                    ctx.fillStyle = "#0b111e";
                    ctx.fillRect(tkx + 1, tky + 1, 50, 34);

                    // 3ds Max Woven Palm Thatch Roof with Dome Lighting
                    const tikiGrad = ctx.createLinearGradient(tkx + 2, tky + 2, tkx + 2, tky + 34);
                    tikiGrad.addColorStop(0.0, "#78350f");
                    tikiGrad.addColorStop(0.2, "#b45309");
                    tikiGrad.addColorStop(0.5, "#d97706");
                    tikiGrad.addColorStop(0.8, "#b45309");
                    tikiGrad.addColorStop(1.0, "#451a03");
                    ctx.fillStyle = tikiGrad;
                    ctx.fillRect(tkx + 2, tky + 2, 48, 32);

                    // Thatch Radial Leaf Ribs
                    ctx.strokeStyle = "rgba(69, 26, 3, 0.65)";
                    ctx.lineWidth = 1.0;
                    for (let tx = tkx + 5; tx <= tkx + 47; tx += 4.5) {
                        ctx.beginPath(); ctx.moveTo(tx, tky + 2); ctx.lineTo(tx, tky + 34); ctx.stroke();
                    }

                    // Sunlit Bamboo Ridge Pole
                    const bamGrad = ctx.createLinearGradient(tkx + 4, tky + 15, tkx + 4, tky + 21);
                    bamGrad.addColorStop(0, "#fde047"); bamGrad.addColorStop(0.5, "#ffffff"); bamGrad.addColorStop(1, "#ca8a04");
                    ctx.fillStyle = bamGrad;
                    ctx.fillRect(tkx + 4, tky + 16, 44, 4);

                    // Neon Pink Surfboard Sign on Eave
                    ctx.fillStyle = "#ff2a85";
                    ctx.fillRect(tkx + 16, tky + 27, 20, 4);
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(tkx + 18, tky + 28.5, 16, 1.2);
                    ctx.restore();
                    meta.sprites.objects["tiki_hut_roof"] = [tkx, tky, 52, 36];
                }

                // 6F. Little Cuba / Española Way Sidewalk Café Umbrella Table ("cafe_table_umb", 26x26)
                {
                    const ctx0 = 1186, cty0 = py3;
                    ctx.save();
                    // Dark rim
                    ctx.beginPath(); ctx.arc(ctx0 + 13, cty0 + 13, 12, 0, Math.PI * 2); ctx.fillStyle = "#0b111e"; ctx.fill();

                    // Conical Umbrella Shade
                    const umbGrad = ctx.createRadialGradient(ctx0 + 10, cty0 + 10, 2, ctx0 + 13, cty0 + 13, 12);
                    umbGrad.addColorStop(0, "#5eead4"); umbGrad.addColorStop(0.5, "#14b8a6"); umbGrad.addColorStop(1, "#0f766e");
                    ctx.beginPath(); ctx.arc(ctx0 + 13, cty0 + 13, 11, 0, Math.PI * 2); ctx.fillStyle = umbGrad; ctx.fill();

                    // Coral wedges
                    for (let w = 0; w < 4; w++) {
                        const a0 = w * Math.PI * 0.5;
                        const wGrad = ctx.createRadialGradient(ctx0 + 10, cty0 + 10, 2, ctx0 + 13, cty0 + 13, 11);
                        wGrad.addColorStop(0, "#fed7aa"); wGrad.addColorStop(0.5, "#f97316"); wGrad.addColorStop(1, "#c2410c");
                        ctx.beginPath();
                        ctx.moveTo(ctx0 + 13, cty0 + 13);
                        ctx.arc(ctx0 + 13, cty0 + 13, 10.5, a0, a0 + Math.PI * 0.25);
                        ctx.closePath();
                        ctx.fillStyle = wGrad;
                        ctx.fill();
                    }
                    // Center finial
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath(); ctx.arc(ctx0 + 13, cty0 + 13, 2.4, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                    meta.sprites.objects["cafe_table_umb"] = [ctx0, cty0, 26, 26];
                }

                // 6G..6J. Pre-Rendered 3ds Max Chopper, Kayak, Mini-Golf & Offshore Speedboat
                meta.sprites.objects["biker_chopper"] = [1832, 3407, 34, 15];
                meta.sprites.objects["kayak_orange"] = [1944, 3407, 38, 14];
                meta.sprites.objects["speedboat_v8"] = [1944, 3361, 58, 30];

                // 6I. Port Gellhorn Retro Mini-Golf Windmill Turret ("minigolf_windmill", 36x36)
                {
                    const mgx = 1300, mgy = py3;
                    ctx.save();
                    ctx.fillStyle = "#15803d";
                    ctx.fillRect(mgx + 2, mgy + 2, 32, 32);
                    ctx.strokeStyle = "#fef08a";
                    ctx.lineWidth = 2.0;
                    ctx.strokeRect(mgx + 2, mgy + 2, 32, 32);
                    const wmilGrad = ctx.createRadialGradient(mgx + 16, mgy + 16, 2, mgx + 18, mgy + 18, 11);
                    wmilGrad.addColorStop(0, "#f87171"); wmilGrad.addColorStop(0.5, "#dc2626"); wmilGrad.addColorStop(1, "#991b1b");
                    ctx.beginPath();
                    ctx.arc(mgx + 18, mgy + 18, 10, 0, Math.PI * 2);
                    ctx.fillStyle = wmilGrad;
                    ctx.fill();
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.6;
                    ctx.stroke();
                    ctx.fillStyle = "#fef08a";
                    ctx.beginPath();
                    ctx.arc(mgx + 18, mgy + 18, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    meta.sprites.objects["minigolf_windmill"] = [mgx, mgy, 36, 36];
                }

                // 6I-2. Soft Volumetric Helicopter & Watchtower Searchlight Ground Pool ("heli_searchlight", 64x64 at 1222, py3)
                // Smooth radial + conical xenon spotlight pool with zero square edges!
                {
                    const slx = 1222, sly = py3, slw = 64, slh = 64;
                    const slImg = ctx.createImageData(slw, slh);
                    const sld = slImg.data;
                    for (let y = 0; y < slh; y++) {
                        const ny = (y + 0.5 - slh * 0.5) / (slh * 0.46);
                        for (let x = 0; x < slw; x++) {
                            const nx = (x + 0.5 - slw * 0.5) / (slw * 0.46);
                            // Slightly elongated elliptical ground pool with soft conical taper toward source (-X)
                            const ex = nx < 0 ? nx * 0.88 : nx * 1.04;
                            const ey = ny * (nx < 0 ? (1.0 - nx * 0.18) : 1.0);
                            const dist = Math.hypot(ex, ey);
                            const idx = (y * slw + x) * 4;
                            if (dist >= 1.0) {
                                sld[idx] = 0; sld[idx + 1] = 0; sld[idx + 2] = 0; sld[idx + 3] = 0;
                            } else {
                                const falloff = Math.pow(1.0 - dist, 1.85);
                                const core = Math.max(0.0, 1.0 - dist * 1.85);
                                sld[idx] = Math.round(195 + 60 * core);
                                sld[idx + 1] = Math.round(236 + 19 * core);
                                sld[idx + 2] = 255;
                                // Smooth alpha above WebGL discard threshold (0.08 * 255 = 21) inside the circle
                                const a = Math.round(24 + 195 * falloff);
                                sld[idx + 3] = dist > 0.94 ? Math.round(a * ((1.0 - dist) / 0.06)) : a;
                            }
                        }
                    }
                    ctx.putImageData(slImg, slx, sly);
                    meta.sprites.objects["heli_searchlight"] = [slx, sly, slw, slh];
                }

                // 6J2. Crisp Pixel-Art 1997 GTA 1 / GTA 2 Electric Scooter ("veh_escooter", 18x34) & South Beach Cruiser Bicycle ("veh_bicycle", 20x42)
                // Drawn with exact integer pixel matrices (alpha = 255 / 0, zero Canvas2D sub-pixel blur) facing South (+Y = bottom = front wheel)
                {
                    ctx.clearRect(1340, py3, 108, 44);

                    const drawPixelMatrix = (ox, oy, rows, pal) => {
                        const h = rows.length;
                        const w = rows[0].length;
                        const id = ctx.createImageData(w, h);
                        const data = id.data;
                        for (let y = 0; y < h; y++) {
                            const row = rows[y];
                            for (let x = 0; x < w; x++) {
                                const ch = row[x];
                                const col = pal[ch];
                                const p = (y * w + x) * 4;
                                if (!col) {
                                    data[p] = 0;
                                    data[p + 1] = 0;
                                    data[p + 2] = 0;
                                    data[p + 3] = 0;
                                } else {
                                    data[p] = col[0];
                                    data[p + 1] = col[1];
                                    data[p + 2] = col[2];
                                    data[p + 3] = 255;
                                }
                            }
                        }
                        ctx.putImageData(id, ox, oy);
                    };

                    const bikePal = {
                        K: [11, 15, 25],    // Crisp 1px dark silhouette outline
                        T: [22, 28, 40],    // Dark vulcanized tire rubber
                        t: [51, 65, 85],    // Tire tread highlight
                        W: [203, 213, 225], // Silver wheel rim & spokes
                        w: [248, 250, 252], // Gleaming chrome & whitewall tire sidewall
                        C: [148, 163, 184], // Brushed chrome / aluminum rack & fork
                        F: [2, 132, 199],   // Frame paint shadow bevel (Miami Ocean Blue/Cyan)
                        f: [6, 182, 212],   // Frame paint mid-tone
                        H: [103, 232, 249], // Frame 3D cylinder top specular
                        S: [69, 26, 3],     // Dark espresso leather saddle border
                        s: [146, 64, 14],   // Warm saddle leather cushion
                        L: [217, 119, 6],   // Saddle crown / golden rattan basket highlight
                        B: [120, 72, 24],   // Woven wicker front beach basket shadow
                        b: [180, 118, 48],  // Woven wicker front beach basket mid-tone
                        P: [244, 114, 182], // Rolled pink South Beach towel inside front basket
                        G: [30, 41, 59],    // Ribbed dark rubber handgrip / pedal
                        A: [245, 158, 11],  // Amber pedal reflector / brass bell
                        R: [239, 68, 68],   // Ruby red rear brake/fender LED
                        r: [252, 165, 165], // Bright red LED core
                        E: [5, 150, 105],   // Emerald scooter anodized rail shadow
                        e: [57, 255, 20],   // Neon lime-emerald scooter LED rail highlight
                        D: [15, 23, 42],    // Dark charcoal grip-tape standing deck
                        d: [30, 41, 59],    // Grip-tape anti-slip groove
                        Q: [34, 211, 238],  // Cyan digital QR/speedometer screen on scooter stem
                        Y: [254, 240, 138]  // Front Xenon LED headlight
                    };

                    // 1) Modern Miami Neon Electric Kick-Scooter ("veh_escooter", 18x34 at 1342, py3, facing South +Y)
                    // Compact standing deck w/ glowing lime LED side-strips, rear foot-brake LED & digital QR stem display
                    const scx = 1342, scy = py3;
                    const scooterRows = [
                        ".......KKKK.......",
                        "......KTTTTK......",
                        "......KTttTK......",
                        ".....KKTRrTKK.....",
                        "....KEeRRRRrEK....",
                        "...KEeedddddeEK...",
                        "..KEedDDDDDDdeEK..",
                        "..KEeDDDDDDDDeeK..",
                        "..KEedddCCddddeK..",
                        "..KEeDDDeeDDDeeK..",
                        "..KEedDDDDDDdeEK..",
                        "..KEeDDDDDDDDeeK..",
                        "..KEedddCCddddeK..",
                        "..KEeDDDeeDDDeeK..",
                        "..KEedDDDDDDdeEK..",
                        "..KEeDDDDDDDDeeK..",
                        "..KEedddCCddddeK..",
                        "..KEeDDDeeDDDeeK..",
                        "..KEedDDDDDDdeEK..",
                        "...KEeedddddeEK...",
                        "....KKEewwweEKK...",
                        "......KCwwwCK.....",
                        "......KCeQeCK.....",
                        "..KKKKKKKKKKKKKK..",
                        ".KeGGGCCCCCCGGGeK.",
                        ".KeGGGCCQQCCGGGeK.",
                        "..KKKKKCYYCKKKKK..",
                        "......KTTTTK......",
                        "......KTWWtK......",
                        "......KTWWtK......",
                        "......KTttTK......",
                        "......KTTTTK......",
                        ".......KKKK.......",
                        ".................."
                    ];
                    drawPixelMatrix(scx, scy, scooterRows, bikePal);
                    meta.sprites.objects["veh_escooter"] = [scx, scy, 18, 34];

                    // 2) Authentic South Beach Cruiser Bicycle ("veh_bicycle", 20x42 at 1364, py3, facing South +Y)
                    // Features whitewall balloon tires, rear chrome pannier rack, wide quilted leather springer saddle,
                    // twin asymmetric pedals, swept-back "moon" cruiser handlebars w/ brass bell, and a woven wicker front beach basket!
                    const bkx = 1364, bky = py3;
                    const bicycleRows = [
                        "........KKKK........",
                        ".......KTTTTK.......",
                        "......KTwwwwTK......",
                        "......KTWwwWTK......",
                        "......KFRrrRFK......",
                        ".....KKFfHHfFKK.....",
                        ".....KFCwwwwCFK.....",
                        ".....KFCwWWwCFK.....",
                        ".....KFCwwwwCFK.....",
                        "......KFfHHfFK......",
                        ".....KSSSSSSSSK.....",
                        "....KSssssssssSK....",
                        "...KSssLLLLLLssSK...",
                        "...KSssLLLLLLssSK...",
                        "....KSssssssssSK....",
                        ".....KSSSssSSSK.....",
                        "......KSSssSSK......",
                        "...KKK.KFfHfK.......",
                        "..KGAKKKFfHfK.......",
                        "...KKK.KFfHfK.......",
                        "......KFfHHfFK......",
                        ".......KFfHfKKK.....",
                        ".......KFfHfKGAK....",
                        ".......KFfHfKKKK....",
                        ".KKKK..KFfHfK..KKKK.",
                        "KGGGKK.KFfHfK.KKGGGK",
                        "KGGCCKKKFfHfKKKCCGGK",
                        ".KKCCwwKFfHfKwwCCKK.",
                        "...KKCCwwHHwwCCKK...",
                        "....KBBBBBBBBBBK....",
                        "...KBbbLLLLLLbbBK...",
                        "...KBbLPPPPLLbLBK...",
                        "...KBbbLLLLLLbbBK...",
                        "....KBBBBBBBBBBK....",
                        ".....KKFfHHfFKK.....",
                        "......KTwwwwTK......",
                        "......KTWwwWTK......",
                        "......KTwwwwTK......",
                        ".......KTttTK.......",
                        ".......KTTTTK.......",
                        "........KKKK........",
                        "...................."
                    ];
                    drawPixelMatrix(bkx, bky, bicycleRows, bikePal);
                    meta.sprites.objects["veh_bicycle"] = [bkx, bky, 20, 42];

                    // 3) Wrecked / Broken E-Scooter ("veh_escooter_wreck", 18x34 at 1388, py3)
                    const scwx = 1388, scwy = py3;
                    const scooterWreckRows = [
                        ".....KKKK.........",
                        "....KTTTTK........",
                        "....KTttTK........",
                        "....KKTRrTKK......",
                        "....KEeRRRKK......",
                        "...KEeeddddeEK....",
                        "..KEedDDDDdEK.....",
                        "..KEedDDdDdEK.....",
                        "...KEedddddeK.....",
                        "...KEedDDdDdEK....",
                        "....KEedDDdEK.....",
                        "...KEeddddddeK....",
                        "..KEedDDDDdEK.....",
                        "..KEedDDdDdEK.....",
                        "...KEedddddeK.....",
                        "...KEedDDDDdEK....",
                        "....KEedDDdEK.....",
                        "...KEeddddddeK....",
                        "...KEedDDDDdEK....",
                        "....KEeeddddeEK...",
                        ".....KKEewwEKK....",
                        "......KCwwCK......",
                        "...KKKKCeHCK......",
                        "..KeGGGCCCCCCKKK..",
                        "..KeGGGCCwwCCGGGeK",
                        "...KKKKKCddCKGGGeK",
                        ".......KTTTTKKKKK.",
                        "......KTWWtK......",
                        "......KTWWtK......",
                        ".......KTttTK.....",
                        ".......KTTTTK.....",
                        "........KKKK......",
                        "..................",
                        ".................."
                    ];
                    drawPixelMatrix(scwx, scwy, scooterWreckRows, bikePal);
                    meta.sprites.objects["veh_escooter_wreck"] = [scwx, scwy, 18, 34];
                    if (meta.sprites.wrecked) meta.sprites.wrecked["veh_escooter_wreck"] = [scwx, scwy, 18, 34];

                    // 4) Bent / Crumpled Beach Cruiser Bicycle ("veh_bicycle_wreck", 20x42 at 1410, py3 — bent wheel, handlebars & basket, zero fire!)
                    const bkwx = 1410, bkwy = py3;
                    const bicycleWreckRows = [
                        "......KKKK..........",
                        ".....KTTTTK.........",
                        ".....KTwwwwTK.......",
                        "......KTWwwWTK......",
                        "......KFRrrRFK......",
                        ".....KKFfHHfFKK.....",
                        "......KFCwwwCFK.....",
                        "......KFCwWWCFK.....",
                        ".....KFCwwwwCFK.....",
                        "......KFfHHfFK......",
                        ".....KSSSSSSSSK.....",
                        "....KSssssssssSK....",
                        "...KSssLLLLLLssSK...",
                        "....KSssLLLLssSK....",
                        ".....KSssssssSK.....",
                        "......KSSssSSK......",
                        ".......KSssSK.......",
                        "...KKK..KFfK........",
                        "..KGAKKKFfHfK.......",
                        "...KKK.KFfHfK.......",
                        "......KFfHfKKK......",
                        "......KFfHfKGAK.....",
                        ".......KFfK.KKK.....",
                        ".......KFfHfK.......",
                        "..KKKK.KFfHfK.......",
                        ".KGGGKKKFfHfK..KKKK.",
                        ".KGGCCK.KFfHfKKCCGGK",
                        "..KCCwwKKFfHfKACCGGK",
                        "...KKCCwwwwwwCCKKK..",
                        ".....KBBBBBBBBK.....",
                        "....KBbbLLLLbbBK....",
                        ".....KBbLPPLbBK.....",
                        ".....KBBBBBBBBK.....",
                        "......KKFwwwFKK.....",
                        ".......KTwwwwTK.....",
                        "........KTWwwWTK....",
                        ".......KTwwwwTK.....",
                        "......KTWWTK........",
                        ".......KTttTK.......",
                        ".......KTTTTK.......",
                        "........KKKK........",
                        "...................."
                    ];
                    drawPixelMatrix(bkwx, bkwy, bicycleWreckRows, bikePal);
                    meta.sprites.objects["veh_bicycle_wreck"] = [bkwx, bkwy, 20, 42];
                    if (meta.sprites.wrecked) meta.sprites.wrecked["veh_bicycle_wreck"] = [bkwx, bkwy, 20, 42];
                }

                // =========================================================================
                // 6J3. MIAMI-DADE / VICE CITY POLICE DODGE CHARGER PURSUIT (spr_idx = 73, 52x64)
                //      & ALL MULTI-STATE SPRITE OVERLAYS:
                //      - Intact Factory Cruiser (base + remaps[0..4]):
                //        Dark Miami-Dade Emerald/Forest Green Hood & Trunk, Crisp White Roof & Doors,
                //        Gold VCPD Shield Crest & "911 / 1126A" Decals, Black Steel Wheels w/ Chrome Caps,
                //        Black Front PIT Push-Bar Bullbar, Charger Racetrack LED Taillight, Low-Profile Red/Blue LED Lightbar
                //      -Sirens (sirens[0..1]): Alternating Red/Blue Roof Lightbar + PIT Bullbar & Rear Deck Strobes
                //      -Doors (doors[0..3]): 4 Progressive Door-Swing States (White/Green Door + Gold Shield + Dark Cabin)
                //      -Damage (damage.front, damage.rear, damage.heavy): Buckled Green Hood/Trunk, Twisted Bullbar,
                //        Exposed Engine/Trunk Bay, Spiderweb-Cracked Windshields, Dented White Doors & Crooked Lightbar
                //      -Destroyed Wreck (veh_vcpd_wreck at [1604, 130, 52, 64]): Burnt/Scorched VCPD Charger Hulk
                // =========================================================================
                {
                    const buildVcpdChargerState = (mode) => {
                        const cw = 52, ch = 64;
                        const id = ctx.createImageData(cw, ch);
                        const px = id.data;
                        const setPx = (x, y, r, g, b, a = 255) => {
                            if (x < 0 || x >= cw || y < 0 || y >= ch) return;
                            const idx = (y * cw + x) * 4;
                            px[idx] = Math.max(0, Math.min(255, r | 0));
                            px[idx + 1] = Math.max(0, Math.min(255, g | 0));
                            px[idx + 2] = Math.max(0, Math.min(255, b | 0));
                            px[idx + 3] = Math.max(0, Math.min(255, a | 0));
                        };

                        const isWreck = mode === "WRECK";
                        const isSiren0 = mode === "SIREN_0";
                        const isSiren1 = mode === "SIREN_1";
                        const isDoor = mode.startsWith("DOOR_");
                        const isDmgFront = mode === "DMG_FRONT" || mode === "DMG_HEAVY";
                        const isDmgRear = mode === "DMG_REAR" || mode === "DMG_HEAVY";
                        const isDmgHeavy = mode === "DMG_HEAVY";

                        // 1) Pure Siren Delta Overlays (sirens[0] & sirens[1])
                        if (isSiren0 || isSiren1) {
                            // Roof Lightbar Active Flash (y = 24..30, x = 13..38)
                            for (let y = 24; y <= 30; y++) {
                                for (let x = 13; x <= 38; x++) {
                                    const inBar = y >= 25 && y <= 29 && x >= 14 && x <= 37;
                                    const leftSide = x <= 23;
                                    const rightSide = x >= 28;
                                    if (inBar) {
                                        if (x >= 24 && x <= 27) {
                                            // Center white/silver takedown strobe flash
                                            setPx(x, y, 248, 250, 252, 255);
                                        } else if (leftSide) {
                                            if (isSiren0) {
                                                const core = (y === 27 && x >= 17 && x <= 22);
                                                setPx(x, y, 255, core ? 215 : 38, core ? 225 : 68, 255);
                                            } else {
                                                setPx(x, y, 135, 18, 32, 255);
                                            }
                                        } else if (rightSide) {
                                            if (isSiren1) {
                                                const core = (y === 27 && x >= 29 && x <= 34);
                                                setPx(x, y, core ? 215 : 37, core ? 240 : 118, 255, 255);
                                            } else {
                                                setPx(x, y, 22, 52, 148, 255);
                                            }
                                        }
                                    } else {
                                        // Soft emissive halo spilled onto the white roof around the active side
                                        if (isSiren0 && x >= 13 && x <= 24) {
                                            setPx(x, y, 255, 64, 88, 165);
                                        } else if (isSiren1 && x >= 27 && x <= 38) {
                                            setPx(x, y, 56, 165, 255, 165);
                                        }
                                    }
                                }
                            }
                            // Front PIT Bullbar Strobe LEDs (y = 60..62) & Rear Charger Deck Strobes (y = 3..4)
                            if (isSiren0) {
                                for (let y = 60; y <= 62; y++) {
                                    for (let x = 21; x <= 24; x++) setPx(x, y, 255, 60, 80, 255);
                                }
                                for (let y = 3; y <= 4; y++) {
                                    for (let x = 31; x <= 35; x++) setPx(x, y, 56, 175, 255, 255);
                                }
                            } else {
                                for (let y = 60; y <= 62; y++) {
                                    for (let x = 27; x <= 30; x++) setPx(x, y, 56, 175, 255, 255);
                                }
                                for (let y = 3; y <= 4; y++) {
                                    for (let x = 16; x <= 20; x++) setPx(x, y, 255, 60, 80, 255);
                                }
                            }
                            return id;
                        }

                        // 2) Progressive Door-Swing Delta Overlays (doors[0..3])
                        if (isDoor) {
                            const stage = Number(mode.split("_")[1]) || 0; // 0..3
                            const swingOut = stage + 2; // 2..5 px outward swing from front hinge (y = 39)
                            // Dark open cabin recess on driver side (x = 10..14, y = 28..39)
                            for (let y = 28; y <= 39; y++) {
                                const t = (39 - y) / 11.0; // 0 at front hinge (y=39), 1 at rear latch (y=28)
                                const shift = Math.round(1 + t * swingOut);
                                // Dark exposed police cruiser interior & tactical seat
                                for (let x = 10; x <= 13; x++) {
                                    const isSeat = y >= 30 && y <= 36 && x >= 11;
                                    setPx(x, y, isSeat ? 28 : 12, isSeat ? 36 : 16, isSeat ? 52 : 26, 255);
                                }
                                // Swinging White & Miami-Dade Green VCPD Door Leaf + Gold Shield Badge
                                const doorOuterX = Math.max(3, 10 - shift);
                                const doorInnerX = doorOuterX + 2;
                                for (let dx = doorOuterX; dx <= doorInnerX; dx++) {
                                    if (dx === doorOuterX) {
                                        // Crisp dark outer edge of the open door
                                        setPx(dx, y, 15, 23, 42, 255);
                                    } else if (y >= 33 && y <= 36 && dx === doorOuterX + 1) {
                                        // Gold VCPD Shield Badge on the swinging white front door!
                                        setPx(dx, y, 234, 179, 8, 255);
                                    } else if (y === 29 || y === 30) {
                                        // Miami-Dade Dark Forest Green stripe accent on door
                                        setPx(dx, y, 11, 61, 44, 255);
                                    } else {
                                        // Crisp Miami-Dade White door skin
                                        setPx(dx, y, 241, 245, 249, 255);
                                    }
                                }
                            }
                            return id;
                        }

                        // 3) Localized Crash Damage Delta Overlays (DMG_FRONT, DMG_REAR, DMG_HEAVY)
                        if (mode === "DMG_FRONT" || mode === "DMG_REAR" || mode === "DMG_HEAVY") {
                            if (isDmgFront) {
                                // Crumpled Miami-Dade Dark Forest Green Hood, Exposed V8 Engine Bay & Twisted PIT Bullbar (y = 36..63)
                                for (let y = 36; y <= 62; y++) {
                                    for (let x = 10; x <= 41; x++) {
                                        // Spiderweb-cracked front windshield (y = 36..42, x = 14..37)
                                        if (y >= 36 && y <= 42 && x >= 14 && x <= 37) {
                                            const d1 = Math.hypot(x - 21, y - 39);
                                            const isRing = Math.abs(d1 - 2.2) < 0.65 || Math.abs(d1 - 4.6) < 0.65;
                                            const isRay = Math.abs((x - 21) - (y - 39)) <= 0.6 || Math.abs((x - 21) + (y - 39)) <= 0.6 || x === 21 || y === 39;
                                            if ((isRing || isRay) && d1 <= 6.2) {
                                                setPx(x, y, 226, 238, 248, 245);
                                            }
                                            continue;
                                        }
                                        // Crumpled Green Hood (y = 43..58)
                                        if (y >= 43 && y <= 58) {
                                            // Jagged inward crumple notches on front corners
                                            if (y >= 54 && (x <= 12 || x >= 39)) {
                                                setPx(x, y, 8, 12, 18, 220);
                                                continue;
                                            }
                                            // Torn hood gap exposing dark V8 engine block & silver radiator pipes
                                            const inEngineGap = (y >= 48 && y <= 55 && x >= 19 && x <= 32 && ((x + y) % 3 !== 0));
                                            if (inEngineGap) {
                                                const isPipe = (x === 22 || x === 28) && y >= 50 && y <= 54;
                                                setPx(x, y, isPipe ? 148 : 22, isPipe ? 163 : 27, isPipe ? 184 : 36, 255);
                                            } else {
                                                // Buckled dark forest-green hood creases
                                                const crease = ((x * 3 + y * 5) % 7 === 0) || y === 46 || y === 52;
                                                setPx(x, y, crease ? 5 : 14, crease ? 28 : 68, crease ? 20 : 49, 255);
                                            }
                                        }
                                        // Shattered Right Headlight & Bent/Twisted Front PIT Bullbar (y = 58..62)
                                        if (y >= 58 && y <= 62) {
                                            if (x >= 32 && x <= 39 && y <= 59) {
                                                // Broken dark headlight cavity with amber shards
                                                setPx(x, y, x === 38 ? 217 : 15, x === 38 ? 119 : 20, x === 38 ? 6 : 28, 255);
                                            } else if (x >= 17 && x <= 34) {
                                                // Twisted/askew black steel PIT push-bar bullbar
                                                const skewY = x < 26 ? 60 : 59;
                                                if (Math.abs(y - skewY) <= 1 || ((x === 20 || x === 31) && y >= 58 && y <= 61)) {
                                                    setPx(x, y, 24, 32, 46, 255);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (isDmgRear) {
                                // Crumpled Miami-Dade Dark Forest Green Trunk, Smashed Racetrack LED Taillight & Cracked Backlight (y = 1..17)
                                for (let y = 1; y <= 17; y++) {
                                    for (let x = 10; x <= 41; x++) {
                                        // Spiderweb-cracked rear backlight window (y = 11..16, x = 15..36)
                                        if (y >= 11 && y <= 16 && x >= 15 && x <= 36) {
                                            const d2 = Math.hypot(x - 29, y - 13.5);
                                            const isCrack = Math.abs(d2 - 2.5) < 0.65 || Math.abs((x - 29) - (y - 13)) <= 0.6 || x === 29;
                                            if (isCrack && d2 <= 5.5) {
                                                setPx(x, y, 226, 238, 248, 240);
                                            }
                                            continue;
                                        }
                                        // Crushed Rear Bumper & Half-Smashed Charger Racetrack LED Taillight (y = 1..4)
                                        if (y >= 1 && y <= 4 && x >= 12 && x <= 39) {
                                            if (x < 26) {
                                                // Smashed-out left taillight housing
                                                setPx(x, y, (x + y) % 2 === 0 ? 18 : 65, 16, 22, 255);
                                            } else if (y >= 2 && y <= 3) {
                                                // flickering surviving right LED bar
                                                setPx(x, y, 220, 38, 38, 255);
                                            }
                                            continue;
                                        }
                                        // Buckled Dark Forest Green Trunk Deck & Exposed Trunk Well (y = 4..10)
                                        if (y >= 4 && y <= 10) {
                                            const inTrunkGap = (y >= 5 && y <= 8 && x >= 20 && x <= 31 && ((x + y) % 2 === 0));
                                            if (inTrunkGap) {
                                                setPx(x, y, 18, 24, 34, 255);
                                            } else {
                                                const crease = ((x * 5 + y * 3) % 6 === 0) || y === 6;
                                                setPx(x, y, crease ? 5 : 13, crease ? 28 : 66, crease ? 20 : 47, 255);
                                            }
                                        }
                                    }
                                }
                            }

                            if (isDmgHeavy) {
                                // Heavy Side-Impact Dents on White Doors, Scuffed Gold Badge & Crooked/Cracked Roof Lightbar (y = 18..39)
                                for (let y = 18; y <= 39; y++) {
                                    // Left & Right White Door Scrapes & Crumple Creases
                                    for (const sideX of [10, 11, 12, 39, 40, 41]) {
                                        if ((y + sideX) % 4 === 0 || (y >= 26 && y <= 31 && (sideX === 11 || sideX === 40))) {
                                            setPx(sideX, y, 51, 65, 85, 245);
                                        } else if (y >= 22 && y <= 35 && (sideX === 12 || sideX === 39)) {
                                            setPx(sideX, y, 185, 195, 208, 240);
                                        }
                                    }
                                }
                                // Cracked / Askew Roof LED Lightbar (y = 25..29, x = 15..36)
                                for (let y = 25; y <= 29; y++) {
                                    for (let x = 15; x <= 36; x++) {
                                        if ((x + y) % 3 === 0) {
                                            setPx(x, y, 22, 28, 38, 250);
                                        }
                                    }
                                }
                            }
                            return id;
                        }

                        // 4) Base Intact Miami-Dade / Vice City Dodge Charger Pursuit (mode === "BASE")
                        //    OR Burnt-Out Destroyed VCPD Charger Hulk (mode === "WRECK")
                        for (let y = 1; y <= 62; y++) {
                            // Charger Coke-Bottle Muscular Body Half-Width Profile
                            let halfW = 15; // default x = 11..40 (width 30)
                            if (y <= 2) halfW = 13;        // tapered rear bumper (x = 13..38)
                            else if (y <= 5) halfW = 14;   // rear corner taper (x = 12..39)
                            else if (y >= 7 && y <= 17) halfW = 16; // muscular rear fender flare (x = 10..41)
                            else if (y >= 18 && y <= 41) halfW = 15; // center cabin & doors (x = 11..40)
                            else if (y >= 42 && y <= 55) halfW = 16; // muscular front Charger fender flare (x = 10..41)
                            else if (y >= 56 && y <= 58) halfW = 15; // front nose & headlights (x = 11..40)
                            else if (y === 59) halfW = 13; // front lower valence (x = 13..38)
                            else if (y >= 60) halfW = 8;   // protruding front steel PIT push-bar bullbar (x = 18..33)

                            const minX = Math.round(25.5 - halfW);
                            const maxX = Math.round(25.5 + halfW);

                            // Black Steel Interceptor Tire Protrusions at Rear Axle (y = 8..16) & Front Axle (y = 45..53)
                            const inRearWheel = (y >= 8 && y <= 16);
                            const inFrontWheel = (y >= 45 && y <= 53);
                            if (inRearWheel || inFrontWheel) {
                                const isHub = (y === 12 || y === 49);
                                for (const wx of [minX - 1, minX, maxX, maxX + 1]) {
                                    if (isWreck) {
                                        setPx(wx, y, 18, 20, 24, 255);
                                    } else if (isHub && (wx === minX || wx === maxX)) {
                                        // Gleaming chrome center hubcap on black police steelie wheel!
                                        setPx(wx, y, 226, 232, 240, 255);
                                    } else {
                                        setPx(wx, y, 15, 23, 38, 255);
                                    }
                                }
                            }

                            // Black Pursuit Side Mirrors with LED Spot-Lamps (y = 38..40)
                            if (y >= 38 && y <= 40 && !isWreck) {
                                const isSpot = (y === 39);
                                setPx(minX - 2, y, isSpot ? 226 : 15, isSpot ? 232 : 23, isSpot ? 240 : 38, 255);
                                setPx(minX - 1, y, 15, 23, 38, 255);
                                setPx(maxX + 1, y, 15, 23, 38, 255);
                                setPx(maxX + 2, y, isSpot ? 226 : 15, isSpot ? 232 : 23, isSpot ? 240 : 38, 255);
                            }

                            for (let x = minX; x <= maxX; x++) {
                                const nx = (x - 25.5) / 16.0; // -1..+1 lateral normalized coordinate
                                const absNx = Math.abs(nx);
                                const dome = Math.max(0, 1.0 - absNx * absNx * 0.92);
                                const isOuterEdge = (x === minX || x === maxX);

                                // A) Protruding Front Black Steel PIT Push-Bar / Bullbar (y = 59..62, x = 18..33)
                                if (y >= 59 && x >= 18 && x <= 33) {
                                    const isUpright = (x >= 19 && x <= 21) || (x >= 30 && x <= 32);
                                    const isCrossbar = (y === 60 || y === 61);
                                    if (!isUpright && !isCrossbar) continue;
                                    if (isWreck) {
                                        setPx(x, y, 24, 26, 30, 255);
                                    } else if (y === 61 && (x === 22 || x === 23)) {
                                        // Embedded Left Red PIT-Bar Strobe LED
                                        setPx(x, y, 239, 68, 68, 255);
                                    } else if (y === 61 && (x === 28 || x === 29)) {
                                        // Embedded Right Blue PIT-Bar Strobe LED
                                        setPx(x, y, 59, 130, 246, 255);
                                    } else if (isUpright && y === 59) {
                                        // Metallic steel top bevel on bullbar uprights
                                        setPx(x, y, 100, 116, 139, 255);
                                    } else {
                                        setPx(x, y, 17, 24, 39, 255);
                                    }
                                    continue;
                                }
                                if (y >= 60) continue;

                                // B) Rear Bumper & Full-Width Dodge Charger LED Racetrack Tail-Light Bar (y = 1..3)
                                if (y <= 3) {
                                    if (y === 1) {
                                        const isExhaust = (x === 15 || x === 16 || x === 35 || x === 36);
                                        setPx(x, y, isExhaust ? 148 : 12, isExhaust ? 163 : 18, isExhaust ? 184 : 24, 255);
                                    } else if (isWreck) {
                                        setPx(x, y, (x + y) % 2 === 0 ? 28 : 45, 20, 22, 255);
                                    } else {
                                        // Glowing Ruby-Red Dodge Charger Racetrack LED Tail-Light Bar!
                                        const isCenterBadge = (x >= 24 && x <= 27 && y === 2);
                                        const isBrightRing = (y === 2 || x <= 15 || x >= 36);
                                        if (isCenterBadge) {
                                            setPx(x, y, 30, 41, 59, 255);
                                        } else if (isBrightRing) {
                                            setPx(x, y, 248, 62, 62, 255);
                                        } else {
                                            setPx(x, y, 185, 24, 32, 255);
                                        }
                                    }
                                    continue;
                                }

                                // C) Slanted Dark-Tinted Rear Backlight Window (y = 11..16)
                                const rearWinHalfW = 10.5 + (y - 11) * 0.25;
                                if (y >= 11 && y <= 16 && Math.abs(x - 25.5) <= rearWinHalfW) {
                                    if (isWreck) {
                                        // Blown-out hollow charred rear window
                                        setPx(x, y, 12, 14, 18, 255);
                                    } else {
                                        const isSeal = (y === 11 || y === 16 || Math.abs(Math.abs(x - 25.5) - rearWinHalfW) < 0.9);
                                        const isSpec = Math.abs((x - 22) - (y - 11) * 1.4) < 1.1;
                                        if (isSeal) setPx(x, y, 10, 15, 26, 255);
                                        else if (isSpec) setPx(x, y, 71, 85, 105, 255);
                                        else setPx(x, y, 17, 26, 44, 255);
                                    }
                                    continue;
                                }

                                // D) Wrap-Around Tinted Front Windshield (y = 35..42)
                                const frontWinHalfW = 10.5 + (y - 35) * 0.28;
                                if (y >= 35 && y <= 42 && Math.abs(x - 25.5) <= frontWinHalfW) {
                                    if (isWreck) {
                                        // Blown-out hollow charred front windshield
                                        setPx(x, y, 11, 13, 17, 255);
                                    } else {
                                        const isSeal = (y === 35 || y === 42 || Math.abs(Math.abs(x - 25.5) - frontWinHalfW) < 0.9);
                                        const isSpec = Math.abs((x - 20) - (y - 35) * 1.3) < 1.25 || Math.abs((x - 31) - (y - 35) * 1.3) < 0.85;
                                        const isMdtGlow = (y === 40 && (x === 25 || x === 26));
                                        if (isSeal) setPx(x, y, 10, 15, 26, 255);
                                        else if (isMdtGlow) setPx(x, y, 16, 185, 129, 255);
                                        else if (isSpec) setPx(x, y, 82, 100, 124, 255);
                                        else setPx(x, y, 16, 25, 42, 255);
                                    }
                                    continue;
                                }

                                // E) Tinted Side Windows & Black B-Pillar (y = 18..34, x = 13..15 & x = 36..38)
                                if (y >= 18 && y <= 34 && ((x >= 13 && x <= 15) || (x >= 36 && x <= 38))) {
                                    if (isWreck) {
                                        setPx(x, y, 14, 16, 20, 255);
                                    } else if (y === 26 || y === 27) {
                                        // Black B-pillar between front & rear side windows
                                        setPx(x, y, 15, 23, 38, 255);
                                    } else {
                                        setPx(x, y, x === 14 || x === 37 ? 30 : 17, x === 14 || x === 37 ? 41 : 25, x === 14 || x === 37 ? 59 : 42, 255);
                                    }
                                    continue;
                                }

                                // F) Low-Profile Modern Aerodynamic Red/Blue LED Roof Lightbar (y = 25..29, x = 14..37)
                                if (y >= 25 && y <= 29 && x >= 14 && x <= 37) {
                                    if (isWreck) {
                                        // Melted/shattered roof lightbar frame
                                        if (y >= 26 && y <= 28 && (x + y) % 2 === 0) {
                                            setPx(x, y, 38, 42, 50, 255);
                                        } else {
                                            setPx(x, y, 22, 25, 30, 255);
                                        }
                                        continue;
                                    }
                                    const isMount = (x <= 15 || x >= 36);
                                    const isFrame = (y === 25 || y === 29);
                                    const isCenterPod = (x >= 24 && x <= 27);
                                    const isRedSide = (x >= 16 && x <= 23);
                                    if (isMount || isFrame) {
                                        setPx(x, y, 15, 23, 42, 255);
                                    } else if (isCenterPod) {
                                        setPx(x, y, y === 27 ? 248 : 203, y === 27 ? 250 : 213, y === 27 ? 252 : 225, 255);
                                    } else if (isRedSide) {
                                        const isCore = (y === 27 && x >= 17 && x <= 22);
                                        setPx(x, y, isCore ? 255 : 220, isCore ? 115 : 30, isCore ? 128 : 48, 255);
                                    } else {
                                        const isCore = (y === 27 && x >= 29 && x <= 34);
                                        setPx(x, y, isCore ? 115 : 30, isCore ? 185 : 92, 255, 255);
                                    }
                                    continue;
                                }

                                // G) Front Dodge Charger Angry Scowl Grille & Xenon LED Headlights (y = 57..59)
                                if (y >= 57 && y <= 59) {
                                    if (isWreck) {
                                        setPx(x, y, 16, 18, 22, 255);
                                        continue;
                                    }
                                    if (x >= 19 && x <= 32) {
                                        // Black recessed Charger crosshair grille + upright bullbar mounts
                                        const isUpright = (x >= 19 && x <= 21) || (x >= 30 && x <= 32);
                                        setPx(x, y, isUpright ? 30 : 11, isUpright ? 41 : 16, isUpright ? 59 : 25, 255);
                                    } else if ((x >= 12 && x <= 18) || (x >= 33 && x <= 39)) {
                                        // Bright Xenon-White LED Headlight DRLs
                                        const isCore = (y === 58);
                                        setPx(x, y, isCore ? 255 : 218, isCore ? 255 : 238, 255, 255);
                                    } else {
                                        // Amber corner marker reflectors
                                        setPx(x, y, 245, 158, 11, 255);
                                    }
                                    continue;
                                }

                                // H) Determine Two-Tone Livery Zone:
                                //    - WHITE CENTER CABIN & DOORS: y = 17..41 (with angled Miami-Dade door cutlines at y=16 & y=42)
                                //    - MIAMI-DADE DEEP FOREST GREEN FRONT HOOD (y = 42..56) & REAR TRUNK (y = 4..16)
                                const inWhiteCabin =
                                    (y >= 17 && y <= 40) ||
                                    (y === 16 && absNx < 0.72) ||
                                    (y === 41 && absNx > 0.58);

                                if (inWhiteCabin) {
                                    if (isOuterEdge) {
                                        setPx(x, y, 18, 26, 36, 255);
                                        continue;
                                    }
                                    if (isWreck) {
                                        // Soot-stained ash-grey burned doors & roof with faded bronze badge remnant
                                        const soot = ((x * 7 + y * 11) % 9 === 0) ? 0.65 : 1.0;
                                        const isFadedBadge = (y >= 32 && y <= 35 && (x === 11 || x === 12 || x === 39 || x === 40));
                                        if (isFadedBadge) {
                                            setPx(x, y, 120, 92, 34, 255);
                                        } else {
                                            const gVal = Math.round((52 + 28 * dome) * soot);
                                            setPx(x, y, gVal, gVal + 2, gVal + 5, 255);
                                        }
                                        continue;
                                    }

                                    // 1. Gold Miami-Dade / VCPD Shield Badge on Front White Doors (y = 32..36, x = 11..12 & x = 39..40)
                                    const onDoorSkin = (x === 11 || x === 12 || x === 39 || x === 40);
                                    if (onDoorSkin && y >= 32 && y <= 36) {
                                        const isStarCenter = (y === 34 && (x === 12 || x === 39));
                                        const isCrown = (y === 32);
                                        if (isStarCenter) {
                                            // Dark forest green star inside gold shield
                                            setPx(x, y, 11, 61, 44, 255);
                                        } else if (isCrown) {
                                            setPx(x, y, 254, 240, 138, 255);
                                        } else {
                                            setPx(x, y, 234, 179, 8, 255);
                                        }
                                        continue;
                                    }

                                    // 2. Miami-Dade Dark Forest Green "VCPD / POLICE" Door Lettering Band (y = 20..26 on door flanks)
                                    if (onDoorSkin && y >= 20 && y <= 26) {
                                        if (y % 2 === 0) {
                                            setPx(x, y, 11, 61, 44, 255);
                                        } else {
                                            setPx(x, y, 234, 179, 8, 255);
                                        }
                                        continue;
                                    }

                                    // 3. Aerial Helicopter Unit Number "26" on White Rear Roof (y = 19..23, x = 22..29)
                                    if (y >= 19 && y <= 23 && x >= 22 && x <= 29) {
                                        const ry = y - 19; // 0..4
                                        // Digit '2' at x = 22..24, Digit '6' at x = 27..29
                                        const d2 = (x >= 22 && x <= 24) && (
                                            ry === 0 || ry === 2 || ry === 4 ||
                                            (ry === 1 && x === 24) || (ry === 3 && x === 22)
                                        );
                                        const d6 = (x >= 27 && x <= 29) && (
                                            ry === 0 || ry === 2 || ry === 4 ||
                                            (ry === 1 && x === 27) || (ry === 3 && (x === 27 || x === 29))
                                        );
                                        if (d2 || d6) {
                                            setPx(x, y, 11, 61, 44, 255);
                                            continue;
                                        }
                                    }

                                    // 4. Door Shutlines (y = 17, y = 27, y = 40) & 3D Glossy White Roof/Door Clearcoat
                                    const isShutline = (y === 17 || y === 40 || (y === 27 && onDoorSkin));
                                    if (isShutline) {
                                        setPx(x, y, 186, 198, 212, 255);
                                    } else {
                                        const wR = Math.round(224 + 31 * dome);
                                        const wG = Math.round(230 + 25 * dome);
                                        const wB = Math.round(238 + 17 * dome);
                                        setPx(x, y, wR, wG, wB, 255);
                                    }
                                } else {
                                    // MIAMI-DADE DEEP EMERALD / FOREST GREEN FRONT HOOD & REAR TRUNK
                                    if (isOuterEdge) {
                                        setPx(x, y, 5, 24, 17, 255);
                                        continue;
                                    }
                                    if (isWreck) {
                                        // Charred dark forest-green & blackened steel hood/trunk
                                        const charNoise = ((x * 5 + y * 9) % 7 === 0) ? 0.55 : 1.0;
                                        setPx(
                                            x,
                                            y,
                                            Math.round((12 + 10 * dome) * charNoise),
                                            Math.round((24 + 18 * dome) * charNoise),
                                            Math.round((19 + 14 * dome) * charNoise),
                                            255
                                        );
                                        continue;
                                    }

                                    // 1. Black Trunk-Mounted ALPR / Police Radio Antenna Pod (y = 5..7, x = 17..20, matching photo!)
                                    if (y >= 5 && y <= 7 && x >= 17 && x <= 20) {
                                        const isPodTop = (y === 6 && (x === 18 || x === 19));
                                        setPx(x, y, isPodTop ? 51 : 15, isPodTop ? 65 : 23, isPodTop ? 85 : 38, 255);
                                        continue;
                                    }

                                    // 2. Gold "EMERGENCY 911" Rear Quarter Decal (y = 6..9) & Gold "1126A" Front Fender Unit Number (y = 43..46)
                                    const onFlankDecal = (x === 11 || x === 12 || x === 39 || x === 40);
                                    if (onFlankDecal && ((y >= 6 && y <= 9 && y % 2 === 0) || (y >= 43 && y <= 46 && (y + x) % 2 === 0))) {
                                        setPx(x, y, 250, 204, 21, 255);
                                        continue;
                                    }

                                    // 3.Amber Front Fender Side-Marker Light (y = 55..56)
                                    if ((y === 55 || y === 56) && (x === 11 || x === 40)) {
                                        setPx(x, y, 245, 158, 11, 255);
                                        continue;
                                    }

                                    // 4. Sculpted Dodge Charger Scat-Pack Hood Power-Bulge Ribs & Recessed Central Air Vent (y = 45..55)
                                    const isHoodVent = (y >= 47 && y <= 50 && x >= 23 && x <= 28);
                                    const isHoodRib = (y >= 44 && y <= 55 && (x === 19 || x === 20 || x === 31 || x === 32));
                                    if (isHoodVent) {
                                        setPx(x, y, 6, 30, 22, 255);
                                    } else if (isHoodRib) {
                                        // Bright emerald metallic specular ridge along the Charger hood bulge
                                        setPx(x, y, 28, 118, 86, 255);
                                    } else {
                                        // Rich Miami-Dade Emerald Forest Green metallic clearcoat (#0b3d2c -> #196b4e)
                                        const gR = Math.round(9 + 16 * dome);
                                        const gG = Math.round(52 + 54 * dome);
                                        const gB = Math.round(37 + 39 * dome);
                                        setPx(x, y, gR, gG, gB, 255);
                                    }
                                }
                            }
                        }
                        return id;
                    };

                    // Paint Base & Remaps[0..4] + Wrecked VCPD Charger at Remaps[5] ([1604, 130, 52, 64])
                    const baseImg = buildVcpdChargerState("BASE");
                    ctx.putImageData(baseImg, 1280, 130);
                    for (const rx of [1334, 1388, 1442, 1496, 1550]) {
                        ctx.putImageData(baseImg, rx, 130);
                    }
                    const wreckImg = buildVcpdChargerState("WRECK");
                    ctx.putImageData(wreckImg, 1604, 130);
                    meta.sprites.objects["veh_vcpd_wreck"] = [1604, 130, 52, 64];
                    if (meta.sprites.wrecked) {
                        meta.sprites.wrecked["veh_vcpd_wreck"] = [1604, 130, 52, 64];
                    }

                    // Paint Alternating Siren States (sirens[0..1])
                    ctx.putImageData(buildVcpdChargerState("SIREN_0"), 1658, 130);
                    ctx.putImageData(buildVcpdChargerState("SIREN_1"), 1712, 130);

                    // Paint 4 Progressive Door-Swing States (doors[0..3])
                    ctx.putImageData(buildVcpdChargerState("DOOR_0"), 1766, 130);
                    ctx.putImageData(buildVcpdChargerState("DOOR_1"), 1820, 130);
                    ctx.putImageData(buildVcpdChargerState("DOOR_2"), 1874, 130);
                    ctx.putImageData(buildVcpdChargerState("DOOR_3"), 1928, 130);

                    // Paint 3 Localized Crash Damage States (front, rear, heavy)
                    ctx.putImageData(buildVcpdChargerState("DMG_FRONT"), 1982, 130);
                    ctx.putImageData(buildVcpdChargerState("DMG_REAR"), 2, 196);
                    ctx.putImageData(buildVcpdChargerState("DMG_HEAVY"), 56, 196);
                }

                // 6J4. VCPD IMPOUND HEAVY WRECKER / TOW TRUCK (spr_idx = "veh_tow_truck" — 11 Multi-State 52x64 Sprites at y = 3470, x = 700..1312)
                //      Authentic American Heavy-Duty Recovery Wrecker (facing South +Y):
                //      - Rear Wheel-Lift Stinger Crossbar (y = 0..2) + Yellow/Black Hazard Chevron Rear Bumper (y = 3..5)
                //      - Open Gunmetal Diamond-Plate Wrecker Bed (y = 6..31) with Twin Dual Rear Tires & Safety-Amber Side Toolboxes
                //      - Heavy Hydraulic Winch Drum (y = 26..30) + Twin Angled Yellow/Steel A-Frame Crane Boom Arms converging to Rear Pulley Hook!
                //      - Steel Headache Rack + Full-Width Alternating Amber/White LED Strobe Lightbar (y = 32..35)
                //      - Two-Tone Safety-Amber & White Heavy Truck Cab (y = 35..45), Sapphire Windshield (y = 45..49), Long Power-Dome Hood (y = 49..59) & Chrome Push Bumper (y = 59..62)
                {
                    const buildTowTruckState = (mode) => {
                        const sw = 52, sh = 64;
                        const id = ctx.createImageData(sw, sh);
                        const b = id.data;
                        const isWreck = mode === "WRECK";
                        const dmgFront = mode === "DMG_FRONT" || mode === "DMG_HEAVY" || isWreck;
                        const dmgRear = mode === "DMG_REAR" || mode === "DMG_HEAVY" || isWreck;
                        const doorStage = mode.startsWith("DOOR_") ? parseInt(mode.slice(5), 10) : -1;

                        const setPx = (x, y, r, g, bl, a = 255) => {
                            if (x < 0 || x >= sw || y < 0 || y >= sh) return;
                            const i = (y * sw + x) * 4;
                            b[i] = r; b[i + 1] = g; b[i + 2] = bl; b[i + 3] = a;
                        };

                        for (let y = 0; y < sh; y++) {
                            let xL = 10, xR = 41;
                            if (y <= 2) {
                                // Protruding rear steel wheel-lift stinger crossbar & tow forks
                                xL = 16; xR = 35;
                            } else if (y <= 5) {
                                // Wide rear hazard chevron bumper
                                xL = 9; xR = 42;
                            } else if (y <= 31) {
                                // Open flatbed recovery deck + side utility toolboxes
                                xL = 10; xR = 41;
                            } else if (y <= 45) {
                                // Heavy truck cab
                                xL = 11; xR = 40;
                            } else if (y <= 59) {
                                // Tapered American heavy truck hood & front fenders
                                xL = 11; xR = 40;
                            } else if (y <= 62) {
                                // Heavy chrome front push bumper
                                xL = 12; xR = 39;
                            } else {
                                continue;
                            }

                            if (dmgFront && y >= 55) {
                                const crush = Math.round(((xL + y * 5) % 3) - 0.5);
                                if (y >= 61 && (xL + y) % 2 === 0) continue;
                                xL += Math.max(0, crush);
                                xR -= Math.max(0, (y * 3) % 2);
                            }
                            if (dmgRear && y <= 6) {
                                if (y <= 1 && (y + xL) % 2 === 0) continue;
                                xL += (y % 2);
                                xR -= ((y + 1) % 2);
                            }

                            // Dual Rear Dually Tires (y = 11..23) & Steerable Front Tires (y = 48..57)
                            const inRearTire = (y >= 11 && y <= 23);
                            const inFrontTire = (y >= 48 && y <= 57);
                            if (inRearTire || inFrontTire) {
                                const tOutL = inRearTire ? 7 : 8;
                                const tOutR = inRearTire ? 44 : 43;
                                for (let tx = tOutL; tx <= xL; tx++) {
                                    const tread = (y % 2 === 0) ? 16 : 30;
                                    setPx(tx, y, tread, tread + 2, tread + 5, 255);
                                }
                                for (let tx = xR; tx <= tOutR; tx++) {
                                    const tread = (y % 2 === 0) ? 16 : 30;
                                    setPx(tx, y, tread, tread + 2, tread + 5, 255);
                                }
                            }

                            // Chrome West-Coast Cab Side Mirrors (y = 44..46)
                            if (!isWreck && y >= 44 && y <= 46) {
                                setPx(8, y, 226, 232, 240, 255);
                                setPx(9, y, 148, 163, 184, 255);
                                setPx(42, y, 148, 163, 184, 255);
                                setPx(43, y, 226, 232, 240, 255);
                            }

                            for (let x = xL; x <= xR; x++) {
                                const nx = (x - 25.5) / 15.5;
                                const dome = Math.max(0.0, 1.0 - nx * nx * 0.72);
                                const isEdge = (x === xL || x === xR);

                                if (isEdge) {
                                    setPx(x, y, 15, 20, 28, 255);
                                    continue;
                                }

                                // 1. Rear Protruding Steel Wheel-Lift Stinger Crossbar & Twin Tire Forks (y = 0..2)
                                if (y <= 2) {
                                    const isFork = (x >= 17 && x <= 20) || (x >= 31 && x <= 34) || y === 1;
                                    if (!isFork) continue;
                                    if (isWreck) {
                                        setPx(x, y, 45, 42, 40, 255);
                                    } else {
                                        const isTip = (y === 0 && ((x >= 17 && x <= 20) || (x >= 31 && x <= 34)));
                                        setPx(x, y, isTip ? 245 : 148, isTip ? 158 : 163, isTip ? 11 : 184, 255);
                                    }
                                    continue;
                                }

                                // 2. Rear Hazard Chevron Bumper & Brake/Reverse Tail Lamps (y = 3..5)
                                if (y >= 3 && y <= 5) {
                                    if (!isWreck && y === 4 && (x >= 11 && x <= 14 || x >= 37 && x <= 40)) {
                                        // Ruby red brake lights
                                        setPx(x, y, 239, 36, 44, 255);
                                    } else if (!isWreck && y === 4 && (x === 15 || x === 36)) {
                                        // White reverse lamps
                                        setPx(x, y, 248, 250, 252, 255);
                                    } else {
                                        // Yellow & black diagonal hazard chevrons
                                        const chev = ((x + y * 2) % 6) < 3;
                                        if (isWreck) {
                                            setPx(x, y, chev ? 78 : 24, chev ? 56 : 22, 18, 255);
                                        } else {
                                            setPx(x, y, chev ? 250 : 20, chev ? 204 : 24, chev ? 21 : 32, 255);
                                        }
                                    }
                                    continue;
                                }

                                // 3. Open Wrecker Recovery Bed, Side Utility Toolboxes & Twin A-Frame Crane Boom (y = 6..31)
                                if (y >= 6 && y <= 31) {
                                    const onSideBox = (x <= 13 || x >= 38);
                                    // Twin angled A-frame crane boom arms converging from (x=17, y=28) & (x=34, y=28) to pulley head (x=24..27, y=5..9)
                                    const tBoom = Math.max(0, Math.min(1, (29 - y) / 22.0));
                                    const leftArmX = 17.5 + tBoom * 7.0;
                                    const rightArmX = 33.5 - tBoom * 7.0;
                                    const onBoomArm = (y >= 6 && y <= 29) && (Math.abs(x - leftArmX) <= 1.35 || Math.abs(x - rightArmX) <= 1.35);
                                    const onPulleyHead = (y >= 5 && y <= 9 && x >= 23 && x <= 28);
                                    const onCenterCable = (y >= 9 && y <= 26 && (x === 25 || x === 26));
                                    const onWinchDrum = (y >= 26 && y <= 30 && x >= 20 && x <= 31);
                                    const onCrossStrut = (y === 18 && x >= Math.round(leftArmX) && x <= Math.round(rightArmX));

                                    if (onPulleyHead) {
                                        // Heavy steel crane pulley sheave & bright yellow hook block
                                        const isHook = (y <= 6 && (x === 25 || x === 26));
                                        setPx(x, y, isWreck ? 60 : (isHook ? 250 : 203), isWreck ? 55 : (isHook ? 204 : 213), isWreck ? 52 : (isHook ? 21 : 225), 255);
                                    } else if (onBoomArm || onCrossStrut) {
                                        // Safety-Caterpillar Yellow & Chrome hydraulic A-frame crane boom
                                        const isBoomEdge = Math.abs(x - leftArmX) > 0.85 || Math.abs(x - rightArmX) > 0.85;
                                        if (isWreck) {
                                            setPx(x, y, 68, 52, 28, 255);
                                        } else if (isBoomEdge) {
                                            setPx(x, y, 180, 83, 9, 255);
                                        } else {
                                            setPx(x, y, 250, 204, 21, 255);
                                        }
                                    } else if (onWinchDrum) {
                                        // Coiled steel cable winch drum behind headache rack
                                        const coil = (x % 2 === 0) ? 168 : 112;
                                        setPx(x, y, coil, coil + 6, coil + 14, 255);
                                    } else if (onCenterCable) {
                                        // High-tensile braided steel winch cable down center of bed
                                        const braid = (y % 2 === 0) ? 210 : 148;
                                        setPx(x, y, braid, braid + 8, braid + 16, 255);
                                    } else if (onSideBox) {
                                        // Safety-Amber side utility toolboxes with chrome latches & white hazard stripe
                                        const isLatch = (!isWreck && (y === 11 || y === 19 || y === 26) && (x === 12 || x === 39));
                                        const isBoxDiv = (y === 15 || y === 23);
                                        if (isLatch) {
                                            setPx(x, y, 241, 245, 249, 255);
                                        } else if (isBoxDiv) {
                                            setPx(x, y, 28, 34, 44, 255);
                                        } else if (isWreck) {
                                            setPx(x, y, 58, 42, 24, 255);
                                        } else {
                                            setPx(x, y, Math.round(217 + 32 * dome), Math.round(119 + 36 * dome), Math.round(6 + 14 * dome), 255);
                                        }
                                    } else {
                                        // Dark gunmetal diamond-plate steel flatbed deck with recessed tie-down rails
                                        const isTieRail = (x === 16 || x === 35);
                                        const tread = ((x + y) % 3 === 0) ? 14 : 0;
                                        if (isTieRail) {
                                            setPx(x, y, 24, 30, 40, 255);
                                        } else {
                                            const baseDeck = isWreck ? 26 : 44;
                                            setPx(x, y, baseDeck + tread, baseDeck + 4 + tread, baseDeck + 11 + tread, 255);
                                        }
                                    }
                                    continue;
                                }

                                // 4. Heavy Steel Headache Rack & Full-Width Amber Strobe Lightbar (y = 32..35)
                                if (y >= 32 && y <= 35) {
                                    if (x >= 12 && x <= 39 && y >= 33 && y <= 35) {
                                        const isLeftPod = x >= 13 && x <= 23;
                                        const isRightPod = x >= 28 && x <= 38;
                                        if (isWreck) {
                                            setPx(x, y, 42, 38, 36, 255);
                                        } else if (isLeftPod) {
                                            if (mode === "SIREN_0") {
                                                // Intense golden-white strobe flash on left side
                                                setPx(x, y, 255, 248, 196, 255);
                                            } else {
                                                setPx(x, y, 245, 158, 11, 255);
                                            }
                                        } else if (isRightPod) {
                                            if (mode === "SIREN_1") {
                                                // Intense golden-white strobe flash on right side
                                                setPx(x, y, 255, 248, 196, 255);
                                            } else {
                                                setPx(x, y, 234, 88, 12, 255);
                                            }
                                        } else {
                                            // Chrome center speaker housing
                                            setPx(x, y, 226, 232, 240, 255);
                                        }
                                    } else {
                                        setPx(x, y, 30, 41, 59, 255);
                                    }
                                    continue;
                                }

                                // 5. Heavy Truck Cab Roof (y = 36..44) with White Center Stripe & Dual Chrome Air Horns
                                if (y >= 36 && y <= 44) {
                                    const onAirHorn = (!isWreck && y >= 38 && y <= 43 && (x === 14 || x === 37));
                                    const onWhiteCabStripe = (!isWreck && x >= 21 && x <= 30 && y >= 37 && y <= 43);
                                    if (onAirHorn) {
                                        setPx(x, y, 226, 232, 240, 255);
                                    } else if (onWhiteCabStripe) {
                                        const wShade = Math.round(232 + 22 * dome);
                                        setPx(x, y, wShade, wShade, Math.min(255, wShade + 4), 255);
                                    } else if (isWreck) {
                                        setPx(x, y, 52, 38, 22, 255);
                                    } else {
                                        setPx(x, y, Math.round(234 + 20 * dome), Math.round(138 + 38 * dome), Math.round(12 + 16 * dome), 255);
                                    }
                                    continue;
                                }

                                // 6. Sapphire-Tinted Wrap-Around Truck Windshield (y = 45..49)
                                if (y >= 45 && y <= 49 && x >= 13 && x <= 38) {
                                    if (isWreck) {
                                        setPx(x, y, 18, 20, 24, 255);
                                    } else if (dmgFront && ((x * 5 + y * 3) % 7 === 0)) {
                                        setPx(x, y, 203, 213, 225, 255);
                                    } else {
                                        const glare = (x + y === 69 || x + y === 70);
                                        setPx(x, y, glare ? 148 : 30, glare ? 212 : 58, glare ? 248 : 96, 255);
                                    }
                                    continue;
                                }

                                // 7. Long Sculpted American Wrecker Hood (y = 50..59) with Raised Power Dome & White Rally Stripe
                                if (y >= 50 && y <= 59) {
                                    if (dmgFront && y >= 54 && ((x * 7 + y * 11) % 5 === 0)) {
                                        setPx(x, y, 28, 32, 38, 255);
                                        continue;
                                    }
                                    const onHoodBlower = (!isWreck && y >= 51 && y <= 54 && x >= 23 && x <= 28);
                                    const onHoodStripe = (!isWreck && x >= 21 && x <= 30);
                                    const onFenderMarker = (!isWreck && (y === 56 || y === 57) && (x === 12 || x === 39));
                                    if (onHoodBlower) {
                                        // Chrome engine air intake scoop on hood
                                        setPx(x, y, 203, 213, 225, 255);
                                    } else if (onFenderMarker) {
                                        setPx(x, y, 254, 240, 138, 255);
                                    } else if (onHoodStripe) {
                                        const wShade = Math.round(228 + 24 * dome);
                                        setPx(x, y, wShade, wShade, Math.min(255, wShade + 4), 255);
                                    } else if (isWreck) {
                                        setPx(x, y, 48, 34, 20, 255);
                                    } else {
                                        setPx(x, y, Math.round(228 + 26 * dome), Math.round(128 + 42 * dome), Math.round(10 + 16 * dome), 255);
                                    }
                                    continue;
                                }

                                // 8. Heavy Chrome Grille & Front Push Bumper (y = 60..62)
                                if (y >= 60 && y <= 62) {
                                    const isHeadlamp = (!isWreck && y === 60 && ((x >= 13 && x <= 17) || (x >= 34 && x <= 38)));
                                    const isPushGuard = (x === 19 || x === 20 || x === 31 || x === 32);
                                    if (isHeadlamp) {
                                        setPx(x, y, 254, 249, 195, 255);
                                    } else if (isPushGuard) {
                                        setPx(x, y, 15, 23, 42, 255);
                                    } else {
                                        const ch = isWreck ? 64 : ((x % 2 === 0) ? 226 : 168);
                                        setPx(x, y, ch, ch + 4, ch + 10, 255);
                                    }
                                }
                            }
                        }

                        // Siren Bloom Halo in SIREN_0 / SIREN_1
                        if (mode === "SIREN_0" || mode === "SIREN_1") {
                            const cx = mode === "SIREN_0" ? 18 : 33;
                            const cy = 34;
                            for (let py = cy - 4; py <= cy + 4; py++) {
                                for (let px = cx - 6; px <= cx + 6; px++) {
                                    const d2 = (px - cx) * (px - cx) * 0.6 + (py - cy) * (py - cy);
                                    if (d2 <= 14) {
                                        setPx(px, py, 255, 215, 40, 255);
                                    }
                                }
                            }
                        }

                        // Open Driver Door Swing (DOOR_0..3) at Cab (y = 37..47, left side x = 3..11)
                        if (doorStage >= 0) {
                            const reach = 3 + doorStage * 2;
                            for (let dy = 0; dy <= 9; dy++) {
                                const py = 46 - dy;
                                const px = Math.round(11 - (dy / 9) * reach);
                                setPx(px, py, 245, 158, 11, 255);
                                setPx(px + 1, py, 217, 119, 6, 255);
                                setPx(px - 1, py, 15, 23, 42, 255);
                            }
                        }

                        return id;
                    };

                    const towY = 3470;
                    const baseTowImg = buildTowTruckState("BASE");
                    const toDeltaAgainstBase = (stateImg, isDoor = false) => {
                        const sb = stateImg.data;
                        const bb = baseTowImg.data;
                        for (let i = 0; i < sb.length; i += 4) {
                            if (sb[i] === bb[i] && sb[i + 1] === bb[i + 1] && sb[i + 2] === bb[i + 2] && sb[i + 3] === bb[i + 3]) {
                                sb[i] = 0; sb[i + 1] = 0; sb[i + 2] = 0; sb[i + 3] = 0;
                            } else if (sb[i + 3] < 16 && bb[i + 3] >= 16 && !isDoor) {
                                sb[i] = 14; sb[i + 1] = 16; sb[i + 2] = 22; sb[i + 3] = 220;
                            }
                        }
                        return stateImg;
                    };

                    ctx.putImageData(baseTowImg, 700, towY);
                    const wreckTowImg = buildTowTruckState("WRECK");
                    ctx.putImageData(wreckTowImg, 756, towY);
                    ctx.putImageData(buildTowTruckState("SIREN_0"), 812, towY);
                    ctx.putImageData(buildTowTruckState("SIREN_1"), 868, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DOOR_0"), true), 924, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DOOR_1"), true), 980, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DOOR_2"), true), 1036, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DOOR_3"), true), 1092, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DMG_FRONT"), false), 1148, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DMG_REAR"), false), 1204, towY);
                    ctx.putImageData(toDeltaAgainstBase(buildTowTruckState("DMG_HEAVY"), false), 1260, towY);

                    const towBaseRect = [700, towY, 52, 64];
                    const towWreckRect = [756, towY, 52, 64];
                    meta.sprites.objects["veh_tow_truck"] = towBaseRect;
                    meta.sprites.objects["veh_tow_truck_wreck"] = towWreckRect;
                    if (meta.sprites.wrecked) {
                        meta.sprites.wrecked["veh_tow_truck_wreck"] = towWreckRect;
                    }
                    const towVehEntry = {
                        spr_idx: "veh_tow_truck",
                        base: towBaseRect,
                        wreck: towWreckRect,
                        remaps: [towBaseRect],
                        sirens: [[812, towY, 52, 64], [868, towY, 52, 64]],
                        doors: [
                            [924, towY, 52, 64],
                            [980, towY, 52, 64],
                            [1036, towY, 52, 64],
                            [1092, towY, 52, 64]
                        ],
                        damage: {
                            front: [1148, towY, 52, 64],
                            rear: [1204, towY, 52, 64],
                            heavy: [1260, towY, 52, 64]
                        },
                        convertible: false
                    };
                    if (Array.isArray(meta.sprites.vehicles)) {
                        meta.sprites.vehicles.push(towVehEntry);
                    }
                    if (this.vehicleBySprIdx) {
                        this.vehicleBySprIdx["veh_tow_truck"] = towVehEntry;
                    }
                }

                // =========================================================================
                // 6K. GTA 6 LEONIDA DIVERSE FLORA & ARBORETUM SPRITES
                // True 3ds Max / Raytraced 1999 DMA Design baked flora (y = 3480 in gta1_sprites.png)
                // (10 distinct plant/tree species: palm_tree, fan_palm, swamp_cypress,
                //  mangrove, banyan_tree, live_oak, bougainvillea_bush, sea_grape,
                //  tropical_shrub, sawgrass_clump)
                // =========================================================================
                meta.sprites.objects["palm_tree"] = meta.sprites.objects["palm_tree"] || meta.sprites.objects["257"];
                meta.sprites.objects["banyan_tree"] = meta.sprites.objects["banyan_tree"] || [12, 3470, 84, 84];
                meta.sprites.objects["live_oak"] = meta.sprites.objects["live_oak"] || [104, 3470, 76, 76];
                meta.sprites.objects["swamp_cypress"] = meta.sprites.objects["swamp_cypress"] || [188, 3470, 68, 68];
                meta.sprites.objects["slash_pine"] = meta.sprites.objects["slash_pine"] || [264, 3470, 68, 68];
                meta.sprites.objects["mangrove"] = meta.sprites.objects["mangrove"] || [340, 3470, 64, 64];
                meta.sprites.objects["fan_palm"] = meta.sprites.objects["fan_palm"] || [412, 3470, 56, 56];
                meta.sprites.objects["bougainvillea_bush"] = meta.sprites.objects["bougainvillea_bush"] || [476, 3470, 48, 48];
                meta.sprites.objects["sea_grape"] = meta.sprites.objects["sea_grape"] || [532, 3470, 48, 48];
                meta.sprites.objects["tropical_shrub"] = meta.sprites.objects["tropical_shrub"] || [588, 3470, 42, 42];
                meta.sprites.objects["sawgrass_clump"] = meta.sprites.objects["sawgrass_clump"] || [638, 3470, 42, 42];

                // =========================================================================
                // 6L. GTA 6 LEONIDA 3D MULTI-STORY RESIDENTIAL ESTATES & 3D FACADE WALLS
                // Raytraced 3ds Max full-bleed roofs & 1:1 scale 3D vertical walls (y = 3580..4070 in gta1_sprites.png)
                // =========================================================================
                meta.sprites.objects["mansion_star_island"]       = [10,   3580, 300, 184];
                meta.sprites.objects["mansion_modern_luxury"]     = [326,  3580, 256, 168];
                meta.sprites.objects["house_canal_villa"]         = [598,  3580, 240, 160];
                meta.sprites.objects["house_florida_bungalow"]    = [854,  3580, 212, 148];
                meta.sprites.objects["house_keys_stilt"]          = [1082, 3580, 204, 152];
                meta.sprites.objects["roof_artdeco_terrazzo"]     = [1302, 3580, 220, 156];
                meta.sprites.objects["roof_rusted_tin"]           = [1538, 3580, 200, 148];

                meta.sprites.objects["mansion_star_island_top"]    = [10,  3780, 176, 118];
                meta.sprites.objects["mansion_modern_luxury_top"]  = [202, 3780, 152, 104];
                meta.sprites.objects["house_canal_villa_top"]      = [370, 3780, 132, 92];
                meta.sprites.objects["house_florida_bungalow_top"] = [518, 3780, 124, 80];
                meta.sprites.objects["house_keys_stilt_top"]       = [658, 3780, 112, 80];

                meta.sprites.objects["wall_star_front"]           = [10,   3915, 280, 64];
                meta.sprites.objects["wall_star_upper"]           = [300,  3915, 164, 56];
                meta.sprites.objects["wall_modern_front"]         = [474,  3915, 240, 64];
                meta.sprites.objects["wall_modern_upper"]         = [724,  3915, 140, 56];
                meta.sprites.objects["wall_canal_front"]          = [874,  3915, 224, 60];
                meta.sprites.objects["wall_bungalow_front"]       = [1108, 3915, 198, 56];
                meta.sprites.objects["wall_keys_front"]           = [1316, 3915, 188, 72];
                meta.sprites.objects["wall_artdeco_front"]        = [1516, 3915, 220, 64];
                meta.sprites.objects["wall_shack_front"]          = [1748, 3915, 180, 64];

                meta.sprites.objects["wall_star_side"]            = [10,   3995, 168, 64];
                meta.sprites.objects["wall_modern_side"]          = [190,  3995, 152, 64];
                meta.sprites.objects["wall_canal_side"]           = [354,  3995, 148, 60];
                meta.sprites.objects["wall_canal_upper"]          = [514,  3995, 120, 52];
                meta.sprites.objects["wall_bungalow_side"]        = [646,  3995, 136, 56];
                meta.sprites.objects["wall_keys_side"]            = [794,  3995, 140, 72];
                meta.sprites.objects["wall_artdeco_side"]         = [946,  3995, 156, 64];
                meta.sprites.objects["wall_shack_side"]           = [1114, 3995, 148, 64];

                // 6M. Satirical GTA 6 & GTA Universe High-Resolution 128x64 Advertising Billboards
                //     Procedurally painted with crisp studio vector typography, brand emblems & spotlight gradients
                //     at y = 3780 (row 1) and y = 3846 (row 2), x = 800..1920 in gta1_sprites.png
                {
                    const adSpecs = [
                        {
                            key: "ad_pisswasser", x: 800, y: 3780,
                            bg0: "#0c2340", bg1: "#1d4ed8", accent: "#facc15", trim: "#fef08a",
                            tag: "BAVARIAN EXPORT LAGER • 11% ALC",
                            title: "PISSWASSER",
                            sub: "THIS IS BEER! DRIVE DRUNK",
                            cta: "OFFICIAL SPONSOR OF BAD DECISIONS",
                            icon: "BEER"
                        },
                        {
                            key: "ad_ecola", x: 940, y: 3780,
                            bg0: "#7f1d1d", bg1: "#dc2626", accent: "#ffffff", trim: "#fecaca",
                            tag: "ICE COLD • 200MG CAFFEINE",
                            title: "eCola",
                            sub: "DELICIOUSLY INFECTIOUS!",
                            cta: "SWALLOW THE RED WAVE TODAY",
                            icon: "CAN_RED"
                        },
                        {
                            key: "ad_sprunk", x: 1080, y: 3780,
                            bg0: "#064e3b", bg1: "#16a34a", accent: "#fde047", trim: "#bbf7d0",
                            tag: "EXTREME LEMON-LIME BLAST",
                            title: "SPRUNK",
                            sub: "THE ESSENCE OF LIFE!",
                            cta: "OBEY YOUR ADRENALINE GLAND",
                            icon: "CAN_GREEN"
                        },
                        {
                            key: "ad_angstipan", x: 1220, y: 3780,
                            bg0: "#0f172a", bg1: "#0284c7", accent: "#38bdf8", trim: "#e0f2fe",
                            tag: "BETTA PHARMACEUTICALS Rx",
                            title: "ANGSTIPAN",
                            sub: "CURE EXISTENTIAL DREAD",
                            cta: "SIDE EFFECTS MAY INCLUDE RAMPAGES",
                            icon: "PILL"
                        },
                        {
                            key: "ad_patriot_beer", x: 1360, y: 3780,
                            bg0: "#172554", bg1: "#b91c1c", accent: "#facc15", trim: "#f8fafc",
                            tag: "PROUDLY BREWED IN LEONIDA",
                            title: "PATRIOT BEER",
                            sub: "REAL AMERICAN FREEDOM",
                            cta: "TASTES LIKE VICTORY & FIREWORKS",
                            icon: "STAR"
                        },
                        {
                            key: "ad_burgershot", x: 1500, y: 3780,
                            bg0: "#7c2d12", bg1: "#ea580c", accent: "#facc15", trim: "#fed7aa",
                            tag: "HOME OF THE 6LB HEART STOPPER",
                            title: "BURGER SHOT",
                            sub: "DIE WITH A SMILE! $1.99",
                            cta: "NOW WITH 40% REAL BEEF PRODUCT",
                            icon: "BURGER"
                        },
                        {
                            key: "ad_ammunation", x: 1640, y: 3780,
                            bg0: "#18181b", bg1: "#991b1b", accent: "#facc15", trim: "#fca5a5",
                            tag: "2ND AMENDMENT SUPERSTORE",
                            title: "AMMU-NATION",
                            sub: "PROTECT YOUR FAMILY!",
                            cta: "NO BACKGROUND CHECK • FREE GRENADE",
                            icon: "TARGET"
                        },
                        {
                            key: "ad_call_morgan", x: 1780, y: 3780,
                            bg0: "#0f172a", bg1: "#1e3a8a", accent: "#facc15", trim: "#fde047",
                            tag: "HIT BY A SPEEDING SUPERCAR?",
                            title: "CALL MORGAN!",
                            sub: "1-800-LAW-VICE • WE SUE ALL",
                            cta: "NO RECOVERY? WE ROB THEM FOR YOU!",
                            icon: "GAVEL"
                        },
                        {
                            key: "ad_vice26", x: 800, y: 3846,
                            bg0: "#3b0764", bg1: "#db2777", accent: "#22d3ee", trim: "#f472b6",
                            tag: "WELCOME TO THE SUNSHINE STATE",
                            title: "VICE CITY 26",
                            sub: "LEONIDA TOURISM BOARD",
                            cta: "SUNSET BEACHES • NEON NIGHTS",
                            icon: "PALM"
                        },
                        {
                            key: "ad_hotel_dixon", x: 940, y: 3846,
                            bg0: "#0f3d3e", bg1: "#0d9488", accent: "#f472b6", trim: "#99f6e4",
                            tag: "OCEAN DRIVE HISTORIC ART DECO",
                            title: "HOTEL DIXON",
                            sub: "LUXURY ROOFTOP SUITES",
                            cta: "COCKTAILS • POOL PARTY • VALET",
                            icon: "PALM"
                        },
                        {
                            key: "ad_vice_neon", x: 1080, y: 3846,
                            bg0: "#1e1b4b", bg1: "#701a75", accent: "#38bdf8", trim: "#f0abfc",
                            tag: "VICE BEACH NIGHTLIFE VIP",
                            title: "CLUB MALIBU",
                            sub: "LIVE DJS • OPEN ALL NIGHT",
                            cta: "WASHINGTON AVE • DRESS TO IMPRESS",
                            icon: "STAR"
                        },
                        {
                            key: "ad_ocean_drive", x: 1220, y: 3846,
                            bg0: "#155e75", bg1: "#0891b2", accent: "#fde047", trim: "#fed7aa",
                            tag: "SOUTH BEACH PARADISE STRIP",
                            title: "OCEAN DRIVE",
                            sub: "LUMMUS PARK & PIER",
                            cta: "CRUISE THE NEON STRIP TONIGHT",
                            icon: "PALM"
                        },
                        {
                            key: "ad_mambos_latin", x: 1360, y: 3846,
                            bg0: "#042f2e", bg1: "#0f766e", accent: "#f97316", trim: "#fde047",
                            tag: "VICE CITY STADIUM PRO FOOTBALL",
                            title: "VC MAMBAS",
                            sub: "SEASON TICKETS ON SALE",
                            cta: "FEEL THE VENOM IN DOWNTOWN VICE",
                            icon: "STAR"
                        },
                        {
                            key: "ad_pi_beer", x: 1500, y: 3846,
                            bg0: "#1e293b", bg1: "#ca8a04", accent: "#fef08a", trim: "#facc15",
                            tag: "IMPORTED PILSNER • ICE COLD",
                            title: "PISSWASSER GOLD",
                            sub: "KING OF HAPPY HOUR",
                            cta: "AVAILABLE AT UNCLE JACK'S LIQUOR",
                            icon: "BEER"
                        },
                        {
                            key: "ad_hanks_waffles", x: 1640, y: 3846,
                            bg0: "#7c2d12", bg1: "#ea580c", accent: "#fde047", trim: "#fef08a",
                            tag: "PORT GELLHORN ROADSIDE DINER",
                            title: "HANK'S WAFFLES",
                            sub: "OPEN 24 HOURS • HOT COFFEE",
                            cta: "WAFFLES • BACON • HOLDUP CASH!",
                            icon: "BURGER"
                        },
                        {
                            key: "ad_uncle_jacks", x: 1780, y: 3846,
                            bg0: "#450a0a", bg1: "#991b1b", accent: "#39ff14", trim: "#facc15",
                            tag: "PORT GELLHORN PAWN & ORDNANCE",
                            title: "UNCLE JACK'S",
                            sub: "PAWN • LIQUOR • AMMO",
                            cta: "WE BUY GOLD • NO QUESTIONS ASKED",
                            icon: "TARGET"
                        }
                    ];

                    ctx.save();
                    for (const ad of adSpecs) {
                        const ax = ad.x;
                        const ay = ad.y;
                        const aw = 128;
                        const ah = 64;

                        // 1. Rich angled studio background gradient
                        const bgGrad = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah);
                        bgGrad.addColorStop(0.0, ad.bg0);
                        bgGrad.addColorStop(0.65, ad.bg1);
                        bgGrad.addColorStop(1.0, ad.bg0);
                        ctx.fillStyle = bgGrad;
                        ctx.fillRect(ax, ay, aw, ah);

                        // Subtle diagonal graphic speed-stripe accent on right side
                        ctx.fillStyle = "rgba(255,255,255,0.08)";
                        ctx.beginPath();
                        ctx.moveTo(ax + 78, ay);
                        ctx.lineTo(ax + 104, ay);
                        ctx.lineTo(ax + 84, ay + ah);
                        ctx.lineTo(ax + 58, ay + ah);
                        ctx.closePath();
                        ctx.fill();

                        // 2. Bottom dark high-contrast CTA banner strip
                        ctx.fillStyle = "rgba(6, 10, 18, 0.86)";
                        ctx.fillRect(ax + 2, ay + ah - 13, aw - 4, 11);
                        ctx.fillStyle = ad.accent;
                        ctx.fillRect(ax + 2, ay + ah - 14, aw - 4, 1.5);

                        // 3. Left-side illustrative brand icon emblem (cx = ax + 21, cy = ay + 26)
                        const icx = ax + 20;
                        const icy = ay + 26;
                        // Glowing circular emblem badge
                        ctx.fillStyle = "rgba(10, 14, 24, 0.55)";
                        ctx.beginPath();
                        ctx.arc(icx, icy, 15.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = ad.accent;
                        ctx.lineWidth = 1.6;
                        ctx.beginPath();
                        ctx.arc(icx, icy, 14.5, 0, Math.PI * 2);
                        ctx.stroke();

                        if (ad.icon === "BEER") {
                            // Golden foaming beer mug + bottle
                            ctx.fillStyle = "#f59e0b";
                            ctx.fillRect(icx - 7, icy - 4, 12, 13);
                            ctx.strokeStyle = "#fef08a";
                            ctx.lineWidth = 2.0;
                            ctx.strokeRect(icx + 4, icy - 2, 4, 8);
                            ctx.fillStyle = "#ffffff";
                            ctx.beginPath();
                            ctx.arc(icx - 4, icy - 5, 4.2, 0, Math.PI * 2);
                            ctx.arc(icx + 1, icy - 6, 4.8, 0, Math.PI * 2);
                            ctx.arc(icx + 4, icy - 4, 3.6, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (ad.icon === "CAN_RED" || ad.icon === "CAN_GREEN") {
                            // Frosted soda can with metallic lids & dynamic ribbon
                            ctx.fillStyle = ad.icon === "CAN_RED" ? "#ef4444" : "#22c55e";
                            ctx.fillRect(icx - 6, icy - 9, 12, 18);
                            ctx.fillStyle = "#e2e8f0";
                            ctx.fillRect(icx - 5, icy - 10, 10, 2);
                            ctx.fillRect(icx - 5, icy + 8, 10, 2);
                            ctx.strokeStyle = "#ffffff";
                            ctx.lineWidth = 2.2;
                            ctx.beginPath();
                            ctx.moveTo(icx - 6, icy + 3);
                            ctx.quadraticCurveTo(icx, icy - 5, icx + 6, icy - 2);
                            ctx.stroke();
                        } else if (ad.icon === "PILL") {
                            // Red & white pharmaceutical capsule
                            ctx.save();
                            ctx.translate(icx, icy);
                            ctx.rotate(-0.55);
                            ctx.fillStyle = "#ef4444";
                            ctx.fillRect(-9, -4.5, 9, 9);
                            ctx.fillStyle = "#f8fafc";
                            ctx.fillRect(0, -4.5, 9, 9);
                            ctx.restore();
                        } else if (ad.icon === "BURGER") {
                            // Triple-decker cheeseburger
                            ctx.fillStyle = "#f59e0b";
                            ctx.beginPath();
                            ctx.arc(icx, icy - 3, 9.5, Math.PI, 0);
                            ctx.fill();
                            ctx.fillStyle = "#22c55e";
                            ctx.fillRect(icx - 10, icy - 3, 20, 2.5);
                            ctx.fillStyle = "#facc15";
                            ctx.fillRect(icx - 9, icy - 0.5, 18, 2.5);
                            ctx.fillStyle = "#78350f";
                            ctx.fillRect(icx - 9.5, icy + 1.5, 19, 4);
                            ctx.fillStyle = "#f59e0b";
                            ctx.fillRect(icx - 9, icy + 5.5, 18, 3.5);
                        } else if (ad.icon === "TARGET") {
                            // Tactical red/gold crosshair reticle
                            ctx.strokeStyle = "#ef4444";
                            ctx.lineWidth = 2.0;
                            ctx.beginPath();
                            ctx.arc(icx, icy, 9.5, 0, Math.PI * 2);
                            ctx.stroke();
                            ctx.fillStyle = "#facc15";
                            ctx.fillRect(icx - 12, icy - 1, 24, 2);
                            ctx.fillRect(icx - 1, icy - 12, 2, 24);
                        } else if (ad.icon === "GAVEL") {
                            // Golden lawyer scales / gavel emblem
                            ctx.fillStyle = "#facc15";
                            ctx.fillRect(icx - 8, icy - 7, 16, 6);
                            ctx.fillRect(icx - 1.5, icy - 1, 3, 11);
                            ctx.fillStyle = "#fef08a";
                            ctx.fillRect(icx - 9, icy - 8, 2, 8);
                            ctx.fillRect(icx + 7, icy - 8, 2, 8);
                        } else if (ad.icon === "PALM") {
                            // Neon sunset disc + palm silhouette
                            ctx.fillStyle = "#fbbf24";
                            ctx.beginPath();
                            ctx.arc(icx, icy + 1, 9.5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.strokeStyle = "#0f172a";
                            ctx.lineWidth = 2.2;
                            ctx.beginPath();
                            ctx.moveTo(icx - 2, icy + 10);
                            ctx.quadraticCurveTo(icx + 1, icy, icx + 3, icy - 6);
                            ctx.stroke();
                            for (const fa of [-2.4, -1.7, -0.8, -0.2, 0.5]) {
                                ctx.beginPath();
                                ctx.moveTo(icx + 3, icy - 6);
                                ctx.lineTo(icx + 3 + Math.cos(fa) * 9, icy - 6 + Math.sin(fa) * 7);
                                ctx.stroke();
                            }
                        } else {
                            // Golden 5-point star crest
                            ctx.fillStyle = "#facc15";
                            ctx.beginPath();
                            for (let si = 0; si < 10; si++) {
                                const r = (si % 2 === 0) ? 10.5 : 4.5;
                                const a = -Math.PI * 0.5 + (si * Math.PI) / 5;
                                const sx = icx + Math.cos(a) * r;
                                const sy = icy + Math.sin(a) * r;
                                if (si === 0) ctx.moveTo(sx, sy);
                                else ctx.lineTo(sx, sy);
                            }
                            ctx.closePath();
                            ctx.fill();
                        }

                        // 4. Crisp Studio Typography (Top Tagline, Giant Brand Headline, Sub-Headline, Bottom CTA)
                        ctx.textAlign = "left";
                        ctx.textBaseline = "middle";

                        // Top small pill tag
                        ctx.font = "bold 6.5px Impact, 'Arial Black', sans-serif";
                        ctx.fillStyle = ad.trim;
                        ctx.fillText(ad.tag, ax + 39, ay + 9.5, 84);

                        // Giant Brand Title with heavy 3D drop shadow
                        ctx.font = "900 15.5px Impact, 'Arial Black', sans-serif";
                        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
                        ctx.fillText(ad.title, ax + 40.5, ay + 24.5, 84);
                        ctx.fillStyle = "#ffffff";
                        ctx.fillText(ad.title, ax + 39, ay + 23, 84);

                        // Sub-headline in bright brand accent color
                        ctx.font = "bold 8.5px Impact, 'Arial Black', sans-serif";
                        ctx.fillStyle = "rgba(0, 0, 0, 0.80)";
                        ctx.fillText(ad.sub, ax + 40, ay + 39, 84);
                        ctx.fillStyle = ad.accent;
                        ctx.fillText(ad.sub, ax + 39, ay + 38, 84);

                        // Bottom centered CTA ribbon text
                        ctx.textAlign = "center";
                        ctx.font = "bold 6.8px 'Arial Black', Impact, sans-serif";
                        ctx.fillStyle = "#f8fafc";
                        ctx.fillText(ad.cta, ax + aw * 0.5, ay + ah - 7, aw - 10);

                        // 5. Outer Metallic Billboard Bezel Frame & Inner Pinstripe
                        ctx.strokeStyle = "#1e293b";
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(ax + 1.25, ay + 1.25, aw - 2.5, ah - 2.5);
                        ctx.strokeStyle = ad.accent;
                        ctx.lineWidth = 1.0;
                        ctx.strokeRect(ax + 3.0, ay + 3.0, aw - 6.0, ah - 6.0);

                        meta.sprites.objects[ad.key] = [ax, ay, aw, ah];
                    }
                    ctx.restore();
                }

                // 7. Post-Render Anti-Fringe Bleed for Custom Sprites (origH <= y < origH + 240)
                // Ensures all custom props & procedural vehicles have seamless 3D edge filtering without dark alpha halos
                {
                    const customBandH = Math.min(240, H - origH);
                    const postData = ctx.getImageData(0, origH, W, customBandH);
                    const pd = postData.data;
                    const pW = W;
                    const pH = customBandH;
                    for (let py = 1; py < pH - 1; py++) {
                        const rowOff = py * pW;
                        for (let px = 1; px < pW - 1; px++) {
                            const p = (rowOff + px) * 4;
                            if (pd[p + 3] !== 0) continue;
                            let sr = 0, sg = 0, sb = 0, cnt = 0;
                            const n1 = p - 4, n2 = p + 4, n3 = p - pW * 4, n4 = p + pW * 4;
                            if (pd[n1 + 3] > 32) { sr += pd[n1]; sg += pd[n1 + 1]; sb += pd[n1 + 2]; cnt++; }
                            if (pd[n2 + 3] > 32) { sr += pd[n2]; sg += pd[n2 + 1]; sb += pd[n2 + 2]; cnt++; }
                            if (pd[n3 + 3] > 32) { sr += pd[n3]; sg += pd[n3 + 1]; sb += pd[n3 + 2]; cnt++; }
                            if (pd[n4 + 3] > 32) { sr += pd[n4]; sg += pd[n4 + 1]; sb += pd[n4 + 2]; cnt++; }
                            if (cnt > 0) {
                                pd[p] = (sr / cnt) | 0;
                                pd[p + 1] = (sg / cnt) | 0;
                                pd[p + 2] = (sb / cnt) | 0;
                            }
                        }
                    }
                    ctx.putImageData(postData, 0, origH);
                }
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

            // 1. Make animated ocean water & seabed tiles (lid 41 at 431/585, lid 98 at 488, & aux 25..35 at 723..733) 100% seamlessly tileable across 64x64 borders
            //    and enrich water tiles with 2*PI-periodic tropical aquamarine cellular caustics (zero 8-bit 1997 blotches!)
            const waterIndices = [431, 488, 585, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733];
            const BAND = 14;
            const TAU = Math.PI * 2.0;
            for (const idx of waterIndices) {
                const col = idx % 16;
                const row = Math.floor(idx / 16);
                const x0 = col * 64;
                const y0 = row * 64;
                if (y0 + 64 > h) continue;

                const tileImg = ctx.getImageData(x0, y0, 64, 64);
                const tileBuf = tileImg.data;
                const isWaterFrame = (idx !== 488);
                const framePhase = (idx >= 723 ? (idx - 723) / 11.0 : 0.0) * TAU;

                if (isWaterFrame) {
                    for (let ty = 0; ty < 64; ty++) {
                        const v = (ty / 64.0) * TAU;
                        for (let tx = 0; tx < 64; tx++) {
                            const u = (tx / 64.0) * TAU;
                            const p = (ty * 64 + tx) * 4;
                            const swell = 0.5 + 0.5 * Math.sin(u + Math.sin(v) * 0.8 + framePhase) * Math.cos(v - Math.cos(u) * 0.8 - framePhase);
                            const synthR = 14 + swell * 22;
                            const synthG = 142 + swell * 42;
                            const synthB = 184 + swell * 34;
                            tileBuf[p]     = Math.min(255, Math.round(tileBuf[p]     * 0.22 + synthR * 0.78));
                            tileBuf[p + 1] = Math.min(255, Math.round(tileBuf[p + 1] * 0.22 + synthG * 0.78));
                            tileBuf[p + 2] = Math.min(255, Math.round(tileBuf[p + 2] * 0.22 + synthB * 0.78));
                        }
                    }
                }

                // Toroidal edge cross-fade over 14-pixel border band so adjacent 64x64 water/sand tiles have zero seam
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

                ctx.putImageData(tileImg, x0, y0);
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

                const tileImg = ctx.getImageData(x0, y0, 64, 64);
                const td = tileImg.data;

                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const p = (ty * 64 + tx) * 4;
                        isSandMask[ty * 64 + tx] = (td[p] > td[p + 2] + 12) ? 1 : 0;
                    }
                }

                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const p = (ty * 64 + tx) * 4;
                        const r = td[p];
                        const g = td[p + 1];
                        const b = td[p + 2];

                        if (isSandMask[ty * 64 + tx]) {
                            // Opaque beach sand: normalize dry sand near tile edges so adjacent sand tiles blend without seams
                            if (r - b > 65) {
                                const edgeDist = Math.min(tx, 63 - tx, ty, 63 - ty);
                                if (edgeDist < 6) {
                                    const blend = (6 - edgeDist) / 6.0 * 0.65;
                                    td[p]     = Math.round(r * (1.0 - blend) + 242 * blend);
                                    td[p + 1] = Math.round(g * (1.0 - blend) + 213 * blend);
                                    td[p + 2] = Math.round(b * (1.0 - blend) + 156 * blend);
                                }
                            }
                            td[p + 3] = 255;
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
                            td[p]     = 230;
                            td[p + 1] = 212;
                            td[p + 2] = 172;
                            td[p + 3] = 242;
                        } else if (minSandDistSq <= 5) {
                            // 2px contact zone: creamy white surf washing directly onto the wet sand
                            td[p]     = 244;
                            td[p + 1] = 248;
                            td[p + 2] = 242;
                            td[p + 3] = 210;
                        } else {
                            // Seaward surf foam & water zone: pure white surf crest where r > 165, 100% transparent (alpha = 0) across all flat cyan!
                            const foamStrength = Math.max(0.0, Math.min(1.0, (r - 165.0) / (255.0 - 165.0)));
                            td[p]     = 246;
                            td[p + 1] = 253;
                            td[p + 2] = 255;
                            td[p + 3] = Math.round(foamStrength * foamStrength * 195.0);
                        }
                    }
                }

                ctx.putImageData(tileImg, x0, y0);
            }

            // 3. GTA 6 Building Rooftop Deck Remaster (all building roof lids across 390+lid, 544+lid, and remap_lids 735..748):
            //    Completely replaces 1997 blotchy/cyan/diamond roof textures with crisp procedural GTA 6 architectural
            //    precast concrete & warm travertine roof-deck slabs, recessed perimeter drainage gutters, 16px expansion joints, and aggregate grain!
            const roofLids = [
                14, 15, 16, 17, 18,
                29, 30, 31, 32, 33, 34,
                36, 37, 38, 39, 40,
                42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
                70, 71, 72, 73, 76, 78, 79,
                83, 84, 85, 86, 87
            ];
            const roofAtlasIndices = [];
            for (const lid of roofLids) {
                roofAtlasIndices.push({ idx: 390 + lid, seed: lid });
                roofAtlasIndices.push({ idx: 544 + lid, seed: lid + 100 });
            }
            // Include all remapped building roof lid slots in gta1_meta.json (735..748, excluding 738 which is pool water 35_2)
            for (const rIdx of [735, 736, 737, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748]) {
                roofAtlasIndices.push({ idx: rIdx, seed: rIdx });
            }

            // Pre-synthesize the 3 procedural 64x64 rooftop deck styles once in CPU memory (zero GPU readbacks!)
            const roofStyleTiles = [0, 1, 2].map((roofStyle) => {
                const tileImg = ctx.createImageData(64, 64);
                const td = tileImg.data;
                // 0: Cool architectural precast concrete, 1: Warm Miami limestone/travertine deck, 2: Weathered slate-grey membrane
                const baseR = roofStyle === 1 ? 194 : (roofStyle === 2 ? 156 : 176);
                const baseG = roofStyle === 1 ? 188 : (roofStyle === 2 ? 160 : 179);
                const baseB = roofStyle === 1 ? 176 : (roofStyle === 2 ? 166 : 183);
                const seed = roofStyle + 17;
                for (let ty = 0; ty < 64; ty++) {
                    for (let tx = 0; tx < 64; tx++) {
                        const p = (ty * 64 + tx) * 4;
                        const sx = tx >> 4;
                        const sy = ty >> 4;
                        const slabTone = (((sx * 19 + sy * 37 + seed * 13) & 7) - 3.5) * 1.6;
                        const r = baseR + slabTone;
                        const g = baseG + slabTone;
                        const b = baseB + slabTone;
                        const edgeDist = Math.min(tx, 63 - tx, ty, 63 - ty);
                        const isGutter = (edgeDist === 1 || edgeDist === 2);
                        const isSubSeam = ((tx & 15) === 0 || (ty & 15) === 0) && edgeDist > 2;
                        const isHighlight = ((tx & 15) === 1 || (ty & 15) === 1) && edgeDist > 2;
                        const hash = (((tx * 73856093) ^ (ty * 19349663) ^ (seed * 83492791)) >>> 0) % 11 - 5;
                        let mul = 1.0;
                        if (edgeDist === 0) mul = 0.80;
                        else if (isGutter) mul = 0.88;
                        else if (isSubSeam) mul = 0.89;
                        else if (isHighlight) mul = 1.03;
                        td[p]     = Math.max(0, Math.min(255, Math.round(r * mul + hash)));
                        td[p + 1] = Math.max(0, Math.min(255, Math.round(g * mul + hash)));
                        td[p + 2] = Math.max(0, Math.min(255, Math.round(b * mul + hash)));
                        td[p + 3] = 255;
                    }
                }
                return tileImg;
            });

            for (const { idx, seed } of roofAtlasIndices) {
                const col = idx % 16;
                const row = Math.floor(idx / 16);
                const x0 = col * 64;
                const y0 = row * 64;
                if (y0 + 64 > h) continue;
                ctx.putImageData(roofStyleTiles[seed % 3], x0, y0);
            }

            // 4. GTA 6 3D Building Facade Wall Tile Remaster (side tiles 0..389 in rows 0..24):
            //    Eliminates synthwave purple/magenta/pink/cyan "Polly Pocket" hues on building walls,
            //    converts windows into realistic dark architectural tinted glass with 3D recessed frames,
            //    and adds crisp limestone/travertine/brick masonry course relief!
            const sideBandH = Math.min(h, 25 * 64);
            const sideImg = ctx.getImageData(0, 0, w, sideBandH);
            const sd = sideImg.data;
            const glassMask = new Uint8Array(64 * 64);

            for (let idx = 0; idx < 390; idx++) {
                const col = idx % 16;
                const row = Math.floor(idx / 16);
                const x0 = col * 64;
                const y0 = row * 64;
                if (y0 + 64 > sideBandH) continue;

                // Skip any alpha-cutout tile (fences, ladders, steel trusses, railings)
                let hasAlphaCutout = false;
                for (let ty = 0; ty < 64 && !hasAlphaCutout; ty += 2) {
                    const rowBase = ((y0 + ty) * w + x0) * 4;
                    for (let tx = 0; tx < 64; tx += 2) {
                        if (sd[rowBase + tx * 4 + 3] < 245) {
                            hasAlphaCutout = true;
                            break;
                        }
                    }
                }
                if (hasAlphaCutout) continue;

                for (let ty = 0; ty < 64; ty++) {
                    const rowBase = ((y0 + ty) * w + x0) * 4;
                    for (let tx = 0; tx < 64; tx++) {
                        const p = rowBase + tx * 4;
                        const r = sd[p], g = sd[p + 1], b = sd[p + 2];
                        glassMask[ty * 64 + tx] = (b > r + 14 && b > 70) ? 1 : 0;
                    }
                }

                for (let ty = 0; ty < 64; ty++) {
                    const rowBase = ((y0 + ty) * w + x0) * 4;
                    for (let tx = 0; tx < 64; tx++) {
                        const p = rowBase + tx * 4;
                        let r = sd[p], g = sd[p + 1], b = sd[p + 2];
                        const lum = r * 0.299 + g * 0.587 + b * 0.114;
                        const isG = glassMask[ty * 64 + tx] === 1;

                        if (isG) {
                            // Remap bright cyan / purple 1997 window pixels to deep GTA 6 architectural tinted glass
                            const gLum = Math.min(180, Math.max(36, lum * 0.65));
                            r = Math.round(36 + gLum * 0.26);
                            g = Math.round(54 + gLum * 0.38);
                            b = Math.round(74 + gLum * 0.48);

                            const topFrame  = (ty > 0  && glassMask[(ty - 1) * 64 + tx] === 0);
                            const leftFrame = (tx > 0  && glassMask[ty * 64 + (tx - 1)] === 0);
                            const botSill   = (ty < 63 && glassMask[(ty + 1) * 64 + tx] === 0);
                            if (topFrame || leftFrame) {
                                // Deep 3D recessed window casing shadow
                                r = Math.round(r * 0.68);
                                g = Math.round(g * 0.70);
                                b = Math.round(b * 0.74);
                            } else if (botSill) {
                                // Sunlit bottom window sill reflection
                                r = Math.min(255, r + 24);
                                g = Math.min(255, g + 26);
                                b = Math.min(255, b + 28);
                            } else {
                                // Subtle diagonal architectural glass reflection
                                const diagStreak = (((tx + ty) & 15) === 3 || ((tx + ty) & 15) === 4) ? 10 : 0;
                                const skyBoost = Math.round((1.0 - (ty & 15) / 15.0) * 8) + diagStreak;
                                r = Math.min(255, r + Math.round(skyBoost * 0.60));
                                g = Math.min(255, g + Math.round(skyBoost * 0.82));
                                b = Math.min(255, b + skyBoost);
                            }
                        } else {
                            // Neutralize purple / magenta / pink / violet hue shifts into natural warm limestone & concrete
                            if (b > g + 6 || (r > g + 20 && b > g - 6)) {
                                r = Math.round(lum * 1.05);
                                g = Math.round(lum * 1.00);
                                b = Math.round(lum * 0.92);
                            } else {
                                // Desaturate overly bright orange/yellow masonry toward grounded architectural sandstone/brick
                                r = Math.round(lum * 0.42 + r * 0.58);
                                g = Math.round(lum * 0.42 + g * 0.58);
                                b = Math.round(lum * 0.42 + b * 0.58);
                            }
                            const aboveIsGlass = (ty > 0 && glassMask[(ty - 1) * 64 + tx] === 1);
                            const courseLine = ((ty & 7) === 0);
                            const grain = (((tx * 73856093) ^ (ty * 19349663) ^ (idx * 83492791)) >>> 0) % 9 - 4;
                            let mul = 1.0;
                            if (aboveIsGlass) mul = 1.08; // Projecting stone window sill cap below glass
                            else if (ty === 0) mul = 0.86;
                            else if (ty === 63) mul = 0.89;
                            else if (courseLine) mul = 0.95;
                            r = Math.min(255, Math.max(0, Math.round(r * mul + grain)));
                            g = Math.min(255, Math.max(0, Math.round(g * mul + grain)));
                            b = Math.min(255, Math.max(0, Math.round(b * mul + grain)));
                        }

                        sd[p]     = r;
                        sd[p + 1] = g;
                        sd[p + 2] = b;
                    }
                }
            }
            ctx.putImageData(sideImg, 0, 0);

            return cvs;
        } catch (err) {
            console.warn("processViceTilesRtx fallback:", err);
            return img;
        }
    }

    loadAuthenticGta1Assets() {
        this.loadProgress = 0;
        this.loadTotal = 8;
        this.loadStageLabel = "DOWNLOADING ASSETS...";
        let viceTilesLoaded = false;
        let spritesLoaded = false;
        let mapBinBuffer = null;
        let buildingPipeline = false;

        const updateStartModalButton = (ready = false) => {
            if (typeof document === "undefined") return;
            const btn = document.getElementById("btn-start-game");
            if (!btn) return;
            if (ready) {
                btn.textContent = "[ ENTER VICE CITY 26 — PLAY NOW (ENTER) ]";
                btn.style.opacity = "1";
                return;
            }
            const pct = Math.min(99, Math.max(5, Math.round(((this.loadProgress || 0) / (this.loadTotal || 8)) * 100)));
            const pendingClick = Boolean(window.game && window.game._pendingStartGame);
            btn.textContent = pendingClick
                ? `⏳ ENTERING VICE CITY 26 (${pct}%) — ${this.loadStageLabel}`
                : `⏳ LOADING VICE CITY 26 (${pct}%) — CLICK OR PRESS ENTER`;
        };

        const checkReady = () => {
            if (!buildingPipeline) {
                this.loadProgress =
                    (viceTilesLoaded ? 1 : 0) +
                    (spritesLoaded ? 1 : 0) +
                    (this.gta1Meta ? 1 : 0) +
                    (mapBinBuffer ? 1 : 0);
                updateStartModalButton(false);
            }

            if (viceTilesLoaded && spritesLoaded && this.gta1Meta && mapBinBuffer && !this.gta1Ready && !buildingPipeline) {
                buildingPipeline = true;
                this.loadStageLabel = "BUILDING 3D TEXTURES...";
                updateStartModalButton(false);

                try {
                    this.vehicleBySprIdx = {};
                    if (this.gta1Meta && this.gta1Meta.sprites && Array.isArray(this.gta1Meta.sprites.vehicles)) {
                        for (const ve of this.gta1Meta.sprites.vehicles) {
                            this.vehicleBySprIdx[String(ve.spr_idx)] = ve;
                        }
                    }
                    if (this.gl) {
                        const enhancedViceTiles = this.processViceTilesRtx(this.gta1TilesViceImg);
                        this.tilesTexVice = this.createGLTexture(enhancedViceTiles, true);
                        if (enhancedViceTiles && enhancedViceTiles !== this.gta1TilesViceImg) {
                            enhancedViceTiles.width = 1;
                            enhancedViceTiles.height = 1;
                        }
                        this.tilesTexNyc = this.tilesTexNyc || this.tilesTexVice;
                        this.tilesTex = this.mapStyle === "VICE" ? this.tilesTexVice : this.tilesTexNyc;
                    }
                } catch (err) {
                    console.error("Stage 1 (Vice tiles texture) error:", err);
                }

                // Use un-throttled setTimeout micro-slices (instead of nested requestAnimationFrame)
                // so startup compilation never stalls in background tabs or throttled webviews,
                // and never blocks the main thread for 1+ second in a single frame!
                setTimeout(() => {
                    try {
                        this.loadProgress = 5;
                        this.loadStageLabel = "PROCESSING SPRITE ATLAS...";
                        updateStartModalButton(false);
                        if (this.gl) {
                            const enhancedSprites = this.processGtaSpritesRtx(this.gta1SpritesImg, this.gta1Meta);
                            this.spritesTex = this.createGLTexture(enhancedSprites, true);
                            if (enhancedSprites && enhancedSprites !== this.gta1SpritesImg) {
                                enhancedSprites.width = 1;
                                enhancedSprites.height = 1;
                            }
                        }
                    } catch (err) {
                        console.error("Stage 2 (Sprites atlas) error:", err);
                    }

                    setTimeout(() => {
                        try {
                            this.loadProgress = 6;
                            this.loadStageLabel = "DECODING LEONIDA 3D MAP...";
                            updateStartModalButton(false);
                            this.map.mapStyle = this.mapStyle;
                            this.map.loadCmpBinary(mapBinBuffer, this.gta1Meta ? this.gta1Meta.districts : null);
                            mapBinBuffer = null;
                        } catch (err) {
                            console.error("Stage 3 (loadCmpBinary) error:", err);
                        }

                        setTimeout(() => {
                            try {
                                this.loadProgress = 7;
                                this.loadStageLabel = "BUILDING 3D CITY MESH...";
                                updateStartModalButton(false);
                                this.buildCityMesh(true);
                            } catch (err) {
                                console.error("Stage 4 (buildCityMesh) error:", err);
                            }

                            setTimeout(() => {
                                try {
                                    this.loadStageLabel = "BUILDING 3D PROPS & LANDMARKS...";
                                    if (this.gl && this.map && this.map.objectEngine) {
                                        this.map.objectEngine.buildStatic3DMesh(this.gl, this);
                                    }
                                } catch (err) {
                                    console.error("Stage 5A (Static3DMesh) error:", err);
                                }

                                setTimeout(() => {
                                    try {
                                        this.loadStageLabel = "BAKING SOLAR SHADOWS...";
                                        this.buildDayLightTexture();
                                    } catch (err) {
                                        console.error("Stage 5B (DayLightTex) error:", err);
                                    }

                                    setTimeout(() => {
                                        try {
                                            this.loadStageLabel = "BAKING RADAR & SPAWNING TRAFFIC...";
                                            this.bakeRadarBackground();
                                        } catch (err) {
                                            console.error("Stage 5C (bakeRadarBackground) error:", err);
                                        }

                                        this.loadProgress = 8;
                                        this.gta1Ready = true;
                                        this.cmpReady = true;
                                        updateStartModalButton(true);

                                        setTimeout(() => {
                                            if (window.game && typeof window.game.onCmpLoaded === "function") {
                                                try {
                                                    window.game.onCmpLoaded(this.gta1Meta);
                                                } catch (err) {
                                                    console.error("Stage 5D (onCmpLoaded) error:", err);
                                                }
                                            }

                                            // Only preload secondary NYC classic tile atlas on desktop; on mobile, lazy-load only if user switches to NYC
                                            if (!this.isMobileInit) {
                                                loadImageWithRetry(this.gta1TilesImg, "assets/gta1/gta1_tiles.png?v=98_11", () => {
                                                    if (this.gl) {
                                                        this.tilesTexNyc = this.createGLTexture(this.gta1TilesImg, true);
                                                        if (this.mapStyle === "NYC") {
                                                            this.tilesTex = this.tilesTexNyc;
                                                        }
                                                    }
                                                });
                                            }
                                        }, 24);
                                    }, 24);
                                }, 24);
                            }, 24);
                        }, 16);
                    }, 16);
                }, 16);
            }
        };

        const loadImageWithRetry = (img, baseUrl, onSuccess, maxRetries = 5, allowFallback = false) => {
            let attempt = 0;
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                onSuccess();
            };
            img.onload = () => {
                finish();
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
                    if (allowFallback) {
                        finish();
                    }
                }
            };
            img.src = baseUrl;
        };
        this._loadImageWithRetry = loadImageWithRetry;

        const fetchWithRetry = (url, asArrayBuffer = false, maxRetries = 5) => {
            let attempt = 0;
            const sep = url.includes("?") ? "&" : "?";
            const run = () =>
                fetch(
                    attempt === 0 ? url : `${url}${sep}retry=${attempt}_${Date.now()}`,
                    attempt === 0 ? undefined : { cache: "no-store" }
                )
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
        }, 5, true);

        loadImageWithRetry(this.gta1TilesViceImg, "assets/gta1/gta1_tiles_vice.png?v=98_11", () => {
            viceTilesLoaded = true;
            checkReady();
        }, 5, true);

        loadImageWithRetry(this.gta1SpritesImg, "assets/gta1/gta1_sprites.png?v=99_72", () => {
            spritesLoaded = true;
            checkReady();
        }, 5, true);

        loadImageWithRetry(this.viceOverviewImg, "assets/gta1/vice_cmp_overview.png?v=100_71", () => {
            this.viceOverviewReady = true;
            this.bakeRadarBackground();
        }, 5, true);

        if (!this.isMobileInit) {
            loadImageWithRetry(this.nycOverviewImg, "assets/gta1/nyc_cmp_overview.png?v=98_11", () => {
                this.nycOverviewReady = true;
                this.bakeRadarBackground();
            }, 5, true);
        }

        fetchWithRetry("assets/gta1/gta1_meta.json?v=99_72", false)
            .then((meta) => {
                this.gta1Meta = meta;
                checkReady();
            })
            .catch((err) => console.error("Failed to load gta1_meta.json:", err));

        fetchWithRetry("assets/gta1/gta1_map.bin?v=99_41", true)
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
        if (this.mapStyle === "NYC" && this._loadImageWithRetry) {
            if (!this.gta1TilesImg.src) {
                this._loadImageWithRetry(this.gta1TilesImg, "assets/gta1/gta1_tiles.png?v=98_11", () => {
                    if (this.gl) {
                        this.tilesTexNyc = this.createGLTexture(this.gta1TilesImg, true);
                        if (this.mapStyle === "NYC") {
                            this.tilesTex = this.tilesTexNyc;
                        }
                    }
                });
            }
            if (!this.nycOverviewImg.src) {
                this._loadImageWithRetry(this.nycOverviewImg, "assets/gta1/nyc_cmp_overview.png?v=98_11", () => {
                    this.nycOverviewReady = true;
                    this.bakeRadarBackground();
                });
            }
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
        let w = Math.max(1, Math.min(2560, window.innerWidth || 800));
        let h = Math.max(1, Math.min(1600, window.innerHeight || 600));
        if (this.isMobileInit) {
            const maxDim = Math.max(w, h);
            if (maxDim > 780) {
                const scale = 780 / maxDim;
                w = Math.max(320, Math.round(w * scale));
                h = Math.max(240, Math.round(h * scale));
            }
        }
        this.canvas.width = w;
        this.canvas.height = h;
        if (this.glCanvas) {
            this.glCanvas.width = w;
            this.glCanvas.height = h;
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
    buildCityMesh(skipAux = false) {
        const gl = this.gl;
        if (!gl || !this.map.cmpLoaded || !this.gta1Meta) return;

        // Clean up any previous buffers
        for (const ch of this.cityChunks) {
            if (ch.vbo) gl.deleteBuffer(ch.vbo);
        }
        this.cityChunks = [];

        const CHUNK_SIZE = 16;
        const NUM_CHUNKS = Math.ceil(MAP_COLS / CHUNK_SIZE); // 32 * 16 = 512
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

        // Precompute per-cell water floor elevation once across 512x512 (eliminates 7M redundant getBlockIndex/getBlockInfo calls!)
        const rawWaterFloor = new Float32Array(MAP_COLS * MAP_ROWS);
        rawWaterFloor.fill(-999.0);
        for (let wy = 0; wy < MAP_ROWS; wy++) {
            const rowOff = wy * MAP_COLS;
            for (let wx = 0; wx < MAP_COLS; wx++) {
                for (let wz = 0; wz < 3; wz++) {
                    const wBlkIdx = this.map.getBlockIndex(wx, wy, wz);
                    if (wBlkIdx === 0) continue;
                    const wb = this.map.getBlockInfo(wBlkIdx);
                    if (wb && (wb.faces[4] === 41 || (wb.faces[4] >= 99 && wb.faces[4] <= 101))) {
                        rawWaterFloor[rowOff + wx] = wz + 1.0 - RIVERBED_DEPTH;
                        break;
                    }
                }
            }
        }

        if (!this._cityOpaqueBuf) this._cityOpaqueBuf = new Float32Array(131072);
        if (!this._cityFlatBuf) this._cityFlatBuf = new Float32Array(65536);
        if (!this._p24Scratch) this._p24Scratch = new Float32Array(24);
        this._cityOpaqueLen = 0;
        this._cityFlatLen = 0;

        for (let cy = 0; cy < NUM_CHUNKS; cy++) {
            for (let cx = 0; cx < NUM_CHUNKS; cx++) {
                this._cityOpaqueLen = 0;
                this._cityFlatLen = 0;

                const x0 = cx * CHUNK_SIZE;
                const y0 = cy * CHUNK_SIZE;

                // 1. AddRiverbed (world_mesh.cpp lines 1016-1054):
                // Emit a 3D sunken sandy seabed quad (y_elev - 0.42) under every water/shoreline cell and its 1-cell shore neighbors (kRiverbedPad = 1)
                for (let y = y0; y < y0 + CHUNK_SIZE; y++) {
                    const nyMin = y > 0 ? y - 1 : 0;
                    const nyMax = y + 1 < MAP_ROWS ? y + 1 : MAP_ROWS - 1;
                    for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
                        const nxMin = x > 0 ? x - 1 : 0;
                        const nxMax = x + 1 < MAP_COLS ? x + 1 : MAP_COLS - 1;
                        let waterFloor = -999.0;
                        for (let ny = nyMin; ny <= nyMax && waterFloor < -900.0; ny++) {
                            const rOff = ny * MAP_COLS;
                            for (let nx = nxMin; nx <= nxMax; nx++) {
                                const wf = rawWaterFloor[rOff + nx];
                                if (wf > -900.0) {
                                    waterFloor = wf;
                                    break;
                                }
                            }
                        }
                        if (waterFloor > -900.0) {
                            if (this._cityOpaqueLen + 36 > this._cityOpaqueBuf.length) {
                                const grown = new Float32Array(this._cityOpaqueBuf.length * 2);
                                grown.set(this._cityOpaqueBuf);
                                this._cityOpaqueBuf = grown;
                            }
                            const ob = this._cityOpaqueBuf;
                            let o = this._cityOpaqueLen;
                            ob[o] = x;     ob[o + 1] = waterFloor; ob[o + 2] = y;     ob[o + 3] = bedU0; ob[o + 4] = bedV0; ob[o + 5] = 3.0;
                            ob[o + 6] = x; ob[o + 7] = waterFloor; ob[o + 8] = y + 1; ob[o + 9] = bedU0; ob[o + 10] = bedV1; ob[o + 11] = 3.0;
                            ob[o + 12] = x + 1; ob[o + 13] = waterFloor; ob[o + 14] = y; ob[o + 15] = bedU1; ob[o + 16] = bedV0; ob[o + 17] = 3.0;
                            ob[o + 18] = x + 1; ob[o + 19] = waterFloor; ob[o + 20] = y; ob[o + 21] = bedU1; ob[o + 22] = bedV0; ob[o + 23] = 3.0;
                            ob[o + 24] = x;     ob[o + 25] = waterFloor; ob[o + 26] = y + 1; ob[o + 27] = bedU0; ob[o + 28] = bedV1; ob[o + 29] = 3.0;
                            ob[o + 30] = x + 1; ob[o + 31] = waterFloor; ob[o + 32] = y + 1; ob[o + 33] = bedU1; ob[o + 34] = bedV1; ob[o + 35] = 3.0;
                            this._cityOpaqueLen = o + 36;
                        }
                    }
                }

                // 2. Emit 3D Voxel Block Faces (routing animated water lids face===4 && tile===41 and shoreline lids 99..101 to flatBuf!)
                const underBridgeWaterBlk = {
                    faces: [0, 0, 0, 0, 41],
                    groundType: 1,
                    slopeType: 0,
                    isFlat: true,
                    flipTopBottomFaces: false,
                    remap: 0,
                    rot: 0
                };
                for (let z = 0; z < MAP_LAYERS; z++) {
                    for (let y = y0; y < y0 + CHUNK_SIZE; y++) {
                        for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
                            // Emit continuous animated water channel at z=1 (py=2.00) underneath every elevated bridge tile (py=2.36)!
                            if (z === 1 && this.map.bridgeMask && this.map.bridgeMask[y * MAP_COLS + x] > 0) {
                                this.putBlockFace(1, x, 1, y, 4, underBridgeWaterBlk, 0.0);
                            }

                            const blkIdx = this.map.getBlockIndex(x, y, z);
                            if (blkIdx === 0) continue;
                            const b = this.map.getBlockInfo(blkIdx);
                            if (!b) continue;

                            for (let face = 0; face < 5; face++) {
                                if (b.faces[face] !== 0) {
                                    const lid = b.faces[4];
                                    const isWaterOrShoreLid = (face === 4 && (lid === 41 || (lid >= 99 && lid <= 101)));
                                    const useFlat = (b.isFlat || isWaterOrShoreLid);
                                    this.putBlockFace(useFlat ? 1 : 0, x, z, y, face, b, 0.0);
                                }
                            }
                        }
                    }
                }

                const opaqueLen = this._cityOpaqueLen;
                const flatLen = this._cityFlatLen;
                const totalFloats = opaqueLen + flatLen;
                if (totalFloats === 0) continue;

                if (totalFloats > this._cityOpaqueBuf.length) {
                    const grown = new Float32Array(Math.max(totalFloats, this._cityOpaqueBuf.length * 2));
                    grown.set(this._cityOpaqueBuf.subarray(0, opaqueLen), 0);
                    this._cityOpaqueBuf = grown;
                }
                if (flatLen > 0) {
                    this._cityOpaqueBuf.set(this._cityFlatBuf.subarray(0, flatLen), opaqueLen);
                }

                const vbo = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
                gl.bufferData(gl.ARRAY_BUFFER, this._cityOpaqueBuf.subarray(0, totalFloats), gl.STATIC_DRAW);

                this.cityChunks.push({
                    cx,
                    cy,
                    minX: x0,
                    maxX: x0 + CHUNK_SIZE,
                    minY: y0,
                    maxY: y0 + CHUNK_SIZE,
                    vbo,
                    opaqueCount: opaqueLen / 6,
                    flatOffset: opaqueLen / 6,
                    flatCount: flatLen / 6
                });
            }
        }
        this._cityOpaqueBuf = null;
        this._cityFlatBuf = null;

        if (!skipAux) {
            // 2B. Build True 3D Volumetric Architectural Prefab Mesh (WorldObjectEngine)
            if (this.map && this.map.objectEngine) {
                try {
                    this.map.objectEngine.buildStatic3DMesh(gl, this);
                } catch (err) {
                    console.error("WorldObjectEngine.buildStatic3DMesh error:", err);
                }
            }

            // 3. Build 512x512 Ray-Marched 3D Building Solar Cast Shadow & Ambient Occlusion Lightmap (this.dayLightTex)
            this.buildDayLightTexture();
        }
    }

    buildDayLightTexture() {
        const gl = this.gl;
        if (!gl || !this.map || !this.map.cmpLoaded) return;

        // 1) Compute true visible top elevation (1.0..6.0) for every 512x512 map column
        const M = MAP_COLS;
        const colTopElev = new Float32Array(M * M);
        for (let r = 0; r < M; r++) {
            for (let c = 0; c < M; c++) {
                let topY = 2.0;
                for (let z = 5; z >= 2; z--) {
                    const bIdx = this.map.getBlockIndex(c, r, z);
                    if (bIdx === 0) continue;
                    const b = this.map.getBlockInfo(bIdx);
                    if (!b || b.groundType !== GROUND_TYPE.BUILDING || b.slopeType !== 0) continue;
                    if (b.faces[4] !== 0 || b.faces[0] !== 0 || b.faces[1] !== 0 || b.faces[2] !== 0 || b.faces[3] !== 0) {
                        topY = z + 1.0;
                        break;
                    }
                }
                colTopElev[r * M + c] = topY;
            }
        }
        if (this.map && this.map.objectEngine) {
            this.map.objectEngine.applyToElevationMap(colTopElev);
        }

        // 2) Ray-march 512x512 tile lightmap (1 sample per 64px tile across 512x512 world) for:
        //    - G: 3D Building-Foot & Urban Canyon Ambient Occlusion
        //    - B: 3D Cast Shadow from South-East Sun (morning/forenoon)
        //    - A: 3D Cast Shadow from West-Southwest Sun (midday/afternoon — casts Hotel Dixon & Ocean Drive shadows onto the promenade!)
        const LRES = 512;
        const rawElev = new Float32Array(LRES * LRES);
        const rawAO = new Float32Array(LRES * LRES);
        const rawShadE = new Float32Array(LRES * LRES);
        const rawShadW = new Float32Array(LRES * LRES);
        const aoOffsets = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [1, -1], [-1, 1], [1, 1]
        ];

        for (let ty = 0; ty < LRES; ty++) {
            const wy = ty + 0.5;
            const cy = Math.min(M - 1, Math.max(0, ty));
            for (let tx = 0; tx < LRES; tx++) {
                const wx = tx + 0.5;
                const cx = Math.min(M - 1, Math.max(0, tx));
                const idx = ty * LRES + tx;
                const baseElev = colTopElev[cy * M + cx];
                rawElev[idx] = baseElev;

                // Building-foot contact Ambient Occlusion
                let aoSum = 0.0;
                for (let k = 0; k < 8; k++) {
                    const nx = Math.min(M - 1, Math.max(0, cx + aoOffsets[k][0]));
                    const ny = Math.min(M - 1, Math.max(0, cy + aoOffsets[k][1]));
                    const hDiff = colTopElev[ny * M + nx] - baseElev;
                    if (hDiff > 0.2) {
                        aoSum += Math.min(1.0, hDiff * 0.38);
                    }
                }
                rawAO[idx] = Math.min(1.0, aoSum / 3.0);

                // Ray-march 3D solar cast shadows (9 steps up to ~3.6 blocks from 3D buildings so shadows reach across streets!)
                let shE = 0.0;
                let shW = 0.0;
                for (let s = 1; s <= 9; s++) {
                    const dist = s * 0.40;
                    const reqH = dist * 0.68;
                    const falloff = Math.max(0.26, 1.0 - dist * 0.11);

                    // Caster to the North-East (+X, -Y) -> casts shadow South-West
                    const ex = Math.min(M - 1, Math.max(0, Math.floor(wx + 0.35 * s)));
                    const ey = Math.min(M - 1, Math.max(0, Math.floor(wy - 0.32 * s)));
                    const diffE = colTopElev[ey * M + ex] - baseElev;
                    if (diffE > reqH) {
                        shE = Math.max(shE, Math.min(1.0, falloff * Math.min(1.0, diffE * 0.56)));
                    }

                    // Caster to the North-West (-X, -Y) -> casts shadow South-East (matching palm & ped shadows!)
                    const wxCaster = Math.min(M - 1, Math.max(0, Math.floor(wx - 0.36 * s)));
                    const wyCaster = Math.min(M - 1, Math.max(0, Math.floor(wy - 0.32 * s)));
                    const diffW = colTopElev[wyCaster * M + wxCaster] - baseElev;
                    if (diffW > reqH) {
                        shW = Math.max(shW, Math.min(1.0, falloff * Math.min(1.0, diffW * 0.56)));
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
        const tx = Math.min(511, Math.max(0, Math.floor(xPx / TILE_SIZE)));
        const ty = Math.min(511, Math.max(0, Math.floor(yPx / TILE_SIZE)));
        const off = (ty * 512 + tx) * 4;
        const ao = this.dayShadowMap[off + 1] / 255.0;
        const shE = this.dayShadowMap[off + 2] / 255.0;
        const shW = this.dayShadowMap[off + 3] / 255.0;
        return Math.min(1.0, Math.max(ao * 0.55, shW * 0.68 + shE * 0.32));
    }

    _meshIsRoadLid(lid) {
        return lid === 1 || lid === 2 || lid === 24 || lid === 25 || lid === 74 || lid === 75 || lid === 80 || lid === 81 || lid === 82;
    }

    _meshWLid(cx, cy, y_elev) {
        if (cx < 0 || cx >= MAP_COLS || cy < 0 || cy >= MAP_ROWS) return 41;
        const bi = this.map.getBlockIndex(cx, cy, y_elev);
        if (!bi) return 41;
        const nb = this.map.getBlockInfo(bi);
        if (!nb) return 41;
        const lid = nb.lid;
        if (lid === 0 || lid === 41 || lid === 77 || (lid >= 99 && lid <= 101)) return 41;
        if (this._meshIsRoadLid(lid)) return 41;
        if (nb.w > 0 || nb.e > 0 || nb.n > 0 || nb.s > 0) return 41;
        return lid;
    }

    _meshIsJuncBox(cx, cy, y_elev) {
        const bi = this.map.getBlockIndex(cx, cy, y_elev);
        if (!bi) return false;
        const nb = this.map.getBlockInfo(bi);
        return Boolean(nb && nb.lid === 25);
    }

    _meshNonRoad(cx, cy, y_elev) {
        const bi = this.map.getBlockIndex(cx, cy, y_elev);
        if (!bi) return false;
        const nb = this.map.getBlockInfo(bi);
        return Boolean(nb && nb.lid && !this._meshIsRoadLid(nb.lid));
    }

    _meshNLid(cx, cy, y_elev) {
        const bi = this.map.getBlockIndex(cx, cy, y_elev);
        if (!bi) return 10;
        const nb = this.map.getBlockInfo(bi);
        if (!nb) return 10;
        const lid = nb.lid;
        if (lid === 8 || lid === 9 || lid === 69 || (lid >= 98 && lid <= 101)) return lid;
        return 10;
    }

    _emitParapetStripScalar(verts, sideTile, tiles, padU, yCop,
        x0, z0, u0f, v0f,
        x1, z1, u1f, v1f,
        x2, z2, u2f, v2f,
        x3, z3, u3f, v3f) {
        const sAtlasIdx = (tiles.side_start || 0) + (sideTile % tiles.side_count);
        const sCol = sAtlasIdx % 16;
        const sRow = Math.floor(sAtlasIdx / 16);
        const su0 = sCol / 16.0 + padU;
        const su1 = (sCol + 1.0) / 16.0 - padU;
        const svOuter = (sRow + 0.6 / 64.0) / 51.0;
        const svInner = (sRow + 7.2 / 64.0) / 51.0;

        const qu0 = u0f ? su1 : su0, qv0 = v0f ? svInner : svOuter;
        const qu1 = u1f ? su1 : su0, qv1 = v1f ? svInner : svOuter;
        const qu2 = u2f ? su1 : su0, qv2 = v2f ? svInner : svOuter;
        const qu3 = u3f ? su1 : su0, qv3 = v3f ? svInner : svOuter;

        if (typeof verts === "number") {
            let buf = verts === 1 ? this._cityFlatBuf : this._cityOpaqueBuf;
            let len = verts === 1 ? this._cityFlatLen : this._cityOpaqueLen;
            if (len + 36 > buf.length) {
                const grown = new Float32Array(buf.length * 2);
                grown.set(buf);
                if (verts === 1) this._cityFlatBuf = grown;
                else this._cityOpaqueBuf = grown;
                buf = grown;
            }
            buf[len]      = x0; buf[len + 1]  = yCop; buf[len + 2]  = z0; buf[len + 3]  = qu0; buf[len + 4]  = qv0; buf[len + 5]  = 0.0;
            buf[len + 6]  = x2; buf[len + 7]  = yCop; buf[len + 8]  = z2; buf[len + 9]  = qu2; buf[len + 10] = qv2; buf[len + 11] = 0.0;
            buf[len + 12] = x1; buf[len + 13] = yCop; buf[len + 14] = z1; buf[len + 15] = qu1; buf[len + 16] = qv1; buf[len + 17] = 0.0;
            buf[len + 18] = x1; buf[len + 19] = yCop; buf[len + 20] = z1; buf[len + 21] = qu1; buf[len + 22] = qv1; buf[len + 23] = 0.0;
            buf[len + 24] = x2; buf[len + 25] = yCop; buf[len + 26] = z2; buf[len + 27] = qu2; buf[len + 28] = qv2; buf[len + 29] = 0.0;
            buf[len + 30] = x3; buf[len + 31] = yCop; buf[len + 32] = z3; buf[len + 33] = qu3; buf[len + 34] = qv3; buf[len + 35] = 0.0;
            if (verts === 1) this._cityFlatLen = len + 36;
            else this._cityOpaqueLen = len + 36;
        } else {
            verts.push(
                x0, yCop, z0, qu0, qv0, 0.0,
                x2, yCop, z2, qu2, qv2, 0.0,
                x1, yCop, z1, qu1, qv1, 0.0,
                x1, yCop, z1, qu1, qv1, 0.0,
                x2, yCop, z2, qu2, qv2, 0.0,
                x3, yCop, z3, qu3, qv3, 0.0
            );
        }
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
                case 53: x1 = lo; break;
                case 54: x0 = hi; break;
                case 55: z1 = lo; break;
                case 56: z0 = hi; break;
                case 57: x1 = lo; z1 = lo; break;
                case 58: x0 = hi; z1 = lo; break;
                case 59: x0 = hi; z0 = hi; break;
                case 60: x1 = lo; z0 = hi; break;
                default: x0 = lo; x1 = hi; z0 = lo; z1 = hi; break;
            }
        }

        const xW = x + x0;
        const xE = x + x1;
        const zN = z_south + z0;
        const zS = z_south + z1;

        let py0 = y_elev + 1.0;
        let py1 = y_elev + 1.0;
        let py4 = y_elev + 1.0;
        let py5 = y_elev + 1.0;

        // Apply 3D bridge deck elevation (+0.36) and sloped approach ramp corner heights to road/sidewalk surface tiles (y_elev === 1, non-water)
        if (y_elev === 1 && b.faces[4] !== 41 && this.map && this.map.bridgeCornerNW) {
            const cellIdx = z_south * MAP_COLS + x;
            py0 += this.map.bridgeCornerNW[cellIdx];
            py1 += this.map.bridgeCornerNE[cellIdx];
            py4 += this.map.bridgeCornerSW[cellIdx];
            py5 += this.map.bridgeCornerSE[cellIdx];
        }

        if (st > 0 && st < 45) {
            switch (st) {
                case 1: py0 -= 0.5; py1 -= 0.5; py4 -= 1.0; py5 -= 1.0; break;
                case 2: py4 -= 0.5; py5 -= 0.5; break;
                case 3: py0 -= 1.0; py1 -= 1.0; py4 -= 0.5; py5 -= 0.5; break;
                case 4: py0 -= 0.5; py1 -= 0.5; break;
                case 5: py0 -= 0.5; py4 -= 0.5; py1 -= 1.0; py5 -= 1.0; break;
                case 6: py1 -= 0.5; py5 -= 0.5; break;
                case 7: py0 -= 1.0; py4 -= 1.0; py1 -= 0.5; py5 -= 0.5; break;
                case 8: py0 -= 0.5; py4 -= 0.5; break;
                case 9: case 10: case 11: case 12: case 13: case 14: case 15: case 16: {
                    const s = st - 9;
                    const d01 = 1.0 - (s + 1) * 0.125;
                    const d45 = 1.0 - s * 0.125;
                    py0 -= d01; py1 -= d01; py4 -= d45; py5 -= d45;
                    break;
                }
                case 17: case 18: case 19: case 20: case 21: case 22: case 23: case 24: {
                    const s = st - 17;
                    const d45 = 1.0 - (s + 1) * 0.125;
                    const d01 = 1.0 - s * 0.125;
                    py4 -= d45; py5 -= d45; py0 -= d01; py1 -= d01;
                    break;
                }
                case 25: case 26: case 27: case 28: case 29: case 30: case 31: case 32: {
                    const s = st - 25;
                    const d04 = 1.0 - (s + 1) * 0.125;
                    const d15 = 1.0 - s * 0.125;
                    py0 -= d04; py4 -= d04; py1 -= d15; py5 -= d15;
                    break;
                }
                case 33: case 34: case 35: case 36: case 37: case 38: case 39: case 40: {
                    const s = st - 33;
                    const d15 = 1.0 - (s + 1) * 0.125;
                    const d04 = 1.0 - s * 0.125;
                    py1 -= d15; py5 -= d15; py0 -= d04; py4 -= d04;
                    break;
                }
                case 41: py4 -= 1.0; py5 -= 1.0; break;
                case 42: py0 -= 1.0; py1 -= 1.0; break;
                case 43: py1 -= 1.0; py5 -= 1.0; break;
                case 44: py0 -= 1.0; py4 -= 1.0; break;
            }
        } else if (st >= 49 && st <= 52) {
            if (st === 49) py0 -= 1.0;
            else if (st === 50) py1 -= 1.0;
            else if (st === 51) py4 -= 1.0;
            else if (st === 52) py5 -= 1.0;
        }

        let q0 = 0, q1 = 1, q2 = 4, q3 = 5;
        if (st >= 45 && st <= 48 && !b.isFlat) {
            if (st === 45) {
                if (face === 2) return;
                if (face === 0) { q0 = 4; q1 = 1; q2 = 6; q3 = 3; }
                else if (face === 1) { q0 = 1; q1 = 5; q2 = 3; q3 = 7; }
                else if (face === 3) { q0 = 5; q1 = 4; q2 = 7; q3 = 6; }
                else { q0 = 1; q1 = 1; q2 = 4; q3 = 5; }
            } else if (st === 46) {
                if (face === 2) return;
                if (face === 0) { q0 = 4; q1 = 0; q2 = 6; q3 = 2; }
                else if (face === 1) { q0 = 0; q1 = 5; q2 = 2; q3 = 7; }
                else if (face === 3) { q0 = 5; q1 = 4; q2 = 7; q3 = 6; }
                else { q0 = 0; q1 = 0; q2 = 4; q3 = 5; }
            } else if (st === 47) {
                if (face === 3) return;
                if (face === 0) { q0 = 5; q1 = 0; q2 = 7; q3 = 2; }
                else if (face === 1) { q0 = 1; q1 = 5; q2 = 3; q3 = 7; }
                else if (face === 2) { q0 = 0; q1 = 1; q2 = 2; q3 = 3; }
                else { q0 = 0; q1 = 1; q2 = 5; q3 = 5; }
            } else {
                if (face === 3) return;
                if (face === 0) { q0 = 4; q1 = 0; q2 = 6; q3 = 2; }
                else if (face === 1) { q0 = 1; q1 = 4; q2 = 3; q3 = 6; }
                else if (face === 2) { q0 = 0; q1 = 1; q2 = 2; q3 = 3; }
                else { q0 = 0; q1 = 1; q2 = 4; q3 = 4; }
            }
        } else if (b.isFlat) {
            if (face === 0) { q0 = 4; q1 = 0; q2 = 6; q3 = 2; }
            else if (face === 1) { q0 = 0; q1 = 4; q2 = 2; q3 = 6; }
            else if (face === 2 || face === 3) { q0 = 0; q1 = 1; q2 = 2; q3 = 3; }
            else { q0 = 0; q1 = 1; q2 = 4; q3 = 5; }
        } else {
            if (face === 0) { q0 = 4; q1 = 0; q2 = 6; q3 = 2; }
            else if (face === 1) { q0 = 1; q1 = 5; q2 = 3; q3 = 7; }
            else if (face === 2) { q0 = 0; q1 = 1; q2 = 2; q3 = 3; }
            else if (face === 3) { q0 = 5; q1 = 4; q2 = 7; q3 = 6; }
            else { q0 = 0; q1 = 1; q2 = 4; q3 = 5; }
        }

        const p24 = this._p24Scratch || (this._p24Scratch = new Float32Array(24));
        p24[0]  = xW; p24[1]  = py0;    p24[2]  = zN;
        p24[3]  = xE; p24[4]  = py1;    p24[5]  = zN;
        p24[6]  = xW; p24[7]  = y_elev; p24[8]  = zN;
        p24[9]  = xE; p24[10] = y_elev; p24[11] = zN;
        p24[12] = xW; p24[13] = py4;    p24[14] = zS;
        p24[15] = xE; p24[16] = py5;    p24[17] = zS;
        p24[18] = xW; p24[19] = y_elev; p24[20] = zS;
        p24[21] = xE; p24[22] = y_elev; p24[23] = zS;

        let uvi0 = 0, uvi1 = 1, uvi2 = 2, uvi3 = 3;
        if (face === 4 && b.lidRotation > 0) {
            const rot = b.lidRotation & 3;
            for (let r = 0; r < rot; r++) {
                const t0 = uvi2, t1 = uvi0, t2 = uvi3, t3 = uvi1;
                uvi0 = t0; uvi1 = t1; uvi2 = t2; uvi3 = t3;
            }
        }
        if (b.flipLR) {
            const t0 = uvi1; uvi1 = uvi0; uvi0 = t0;
            const t2 = uvi3; uvi3 = uvi2; uvi2 = t2;
        }
        if (b.flipTB) {
            const t0 = uvi2, t1 = uvi3;
            uvi2 = uvi0; uvi3 = uvi1;
            uvi0 = t0; uvi1 = t1;
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
                animType = 1.0;
                if (y_elev === 1 && this.map) {
                    const lN  = this._meshWLid(x, z_south - 1, y_elev);
                    const lS  = this._meshWLid(x, z_south + 1, y_elev);
                    const lW  = this._meshWLid(x - 1, z_south, y_elev);
                    const lE  = this._meshWLid(x + 1, z_south, y_elev);
                    const lNW = this._meshWLid(x - 1, z_south - 1, y_elev);
                    const lNE = this._meshWLid(x + 1, z_south - 1, y_elev);
                    const lSW = this._meshWLid(x - 1, z_south + 1, y_elev);
                    const lSE = this._meshWLid(x + 1, z_south + 1, y_elev);
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
                        const hasRoadNeighbor =
                            this._meshIsRoadLid(lN) || this._meshIsRoadLid(lS) || this._meshIsRoadLid(lW) || this._meshIsRoadLid(lE) ||
                            this._meshIsRoadLid(lNW) || this._meshIsRoadLid(lNE) || this._meshIsRoadLid(lSW) || this._meshIsRoadLid(lSE);
                        const hasPaveNeighbor =
                            lN === 8 || lN === 9 || lN === 69 || lS === 8 || lS === 9 || lS === 69 ||
                            lW === 8 || lW === 9 || lW === 69 || lE === 8 || lE === 9 || lE === 69 ||
                            lNW === 8 || lNW === 9 || lNW === 69 || lNE === 8 || lNE === 9 || lNE === 69 ||
                            lSW === 8 || lSW === 9 || lSW === 69 || lSE === 8 || lSE === 9 || lSE === 69;
                        const hasLawnNeighbor = (lN === 10 || lS === 10 || lW === 10 || lE === 10 || lNW === 10 || lNE === 10 || lSW === 10 || lSE === 10);
                        const isOuterOceanCoast = (x >= 458 && z_south <= 370);

                        let surType = 0;
                        if (isOuterOceanCoast && !hasRoadNeighbor && !hasPaveNeighbor) surType = 3;
                        else if (hasLawnNeighbor && !hasRoadNeighbor && !hasPaveNeighbor) surType = 2;
                        else if (hasPaveNeighbor) surType = 1;

                        let paveBits = 0;
                        if (surType === 2) {
                            if (lN === 8 || lN === 9 || lN === 69 || this._meshIsRoadLid(lN))   paveBits += 1;
                            if (lS === 8 || lS === 9 || lS === 69 || this._meshIsRoadLid(lS))   paveBits += 2;
                            if (lW === 8 || lW === 9 || lW === 69 || this._meshIsRoadLid(lW))   paveBits += 4;
                            if (lE === 8 || lE === 9 || lE === 69 || this._meshIsRoadLid(lE))   paveBits += 8;
                            if (lNW === 8 || lNW === 9 || lNW === 69 || this._meshIsRoadLid(lNW)) paveBits += 16;
                            if (lNE === 8 || lNE === 9 || lNE === 69 || this._meshIsRoadLid(lNE)) paveBits += 32;
                            if (lSW === 8 || lSW === 9 || lSW === 69 || this._meshIsRoadLid(lSW)) paveBits += 64;
                            if (lSE === 8 || lSE === 9 || lSE === 69 || this._meshIsRoadLid(lSE)) paveBits += 128;
                        }
                        animType = 2000.0 + paveBits * 1024.0 + surType * 256.0 + bits;
                    }
                }
            }
            else if (effTileIdx === 22) animType = 2.0;
            else if (effTileIdx >= 99 && effTileIdx <= 101) animType = 4.0;
            else if (!b.isFlat && effRemap === 0) {
                const isLightRoad = (effTileIdx === 1 || effTileIdx === 24 || effTileIdx === 25 || effTileIdx === 74 || effTileIdx === 80);
                const isDarkRoad  = (effTileIdx === 2 || effTileIdx === 75 || effTileIdx === 81 || effTileIdx === 82);
                if (isLightRoad) animType = 5.0;
                else if (isDarkRoad) animType = 5.25;

                if ((isLightRoad || isDarkRoad) && effTileIdx !== 25 && y_elev === 1 && this.map && this.map.stopLineMask && this.map.stopLineMask[z_south * MAP_COLS + x] === 1) {
                    let cwDir = -1;
                    if (this._meshIsJuncBox(x, z_south - 1, y_elev)) cwDir = 0;
                    else if (this._meshIsJuncBox(x, z_south + 1, y_elev)) cwDir = 1;
                    else if (this._meshIsJuncBox(x - 1, z_south, y_elev)) cwDir = 2;
                    else if (this._meshIsJuncBox(x + 1, z_south, y_elev)) cwDir = 3;
                    if (cwDir >= 0) {
                        const curbMin = (cwDir < 2) ? (this._meshNonRoad(x - 1, z_south, y_elev) ? 1 : 0) : (this._meshNonRoad(x, z_south - 1, y_elev) ? 1 : 0);
                        const curbMax = (cwDir < 2) ? (this._meshNonRoad(x + 1, z_south, y_elev) ? 1 : 0) : (this._meshNonRoad(x, z_south + 1, y_elev) ? 1 : 0);
                        const darkBit = isDarkRoad ? 1 : 0;
                        const cwIdx = cwDir * 8 + curbMin * 4 + curbMax * 2 + darkBit;
                        animType = 5.5 + cwIdx * 0.125;
                    }
                }

                if (effTileIdx === 25 && this.map) {
                    let bits = 0;
                    if (this._meshNonRoad(x, z_south - 1, y_elev)) bits += 1;
                    if (this._meshNonRoad(x, z_south + 1, y_elev)) bits += 2;
                    if (this._meshNonRoad(x - 1, z_south, y_elev)) bits += 4;
                    if (this._meshNonRoad(x + 1, z_south, y_elev)) bits += 8;
                    if (bits > 0) animType = 10.0 + bits;
                }

                if (effTileIdx === 9 && this.map) {
                    const eBi = this.map.getBlockIndex(x + 1, z_south, y_elev);
                    const eBlk = eBi ? this.map.getBlockInfo(eBi) : null;
                    if (eBlk && eBlk.lid >= 98 && eBlk.lid <= 101) {
                        animType = 28.0;
                    }
                }

                if (effTileIdx === 10 && y_elev === 1 && this.map) {
                    const lN  = this._meshNLid(x, z_south - 1, y_elev);
                    const lS  = this._meshNLid(x, z_south + 1, y_elev);
                    const lW  = this._meshNLid(x - 1, z_south, y_elev);
                    const lE  = this._meshNLid(x + 1, z_south, y_elev);
                    const lNW = this._meshNLid(x - 1, z_south - 1, y_elev);
                    const lNE = this._meshNLid(x + 1, z_south - 1, y_elev);
                    const lSW = this._meshNLid(x - 1, z_south + 1, y_elev);
                    const lSE = this._meshNLid(x + 1, z_south + 1, y_elev);

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
                        let surType = 2;
                        if ((lE >= 98 && lE <= 101) || (lNE >= 98 && lNE <= 101) || (lSE >= 98 && lSE <= 101)) {
                            surType = 1;
                        } else if (
                            lN === 9 || lN === 69 || lS === 9 || lS === 69 ||
                            lW === 9 || lW === 69 || lE === 9 || lE === 69 ||
                            lNW === 9 || lNW === 69 || lNE === 9 || lNE === 69 ||
                            lSW === 9 || lSW === 69 || lSE === 9 || lSE === 69 || x >= 215
                        ) {
                            surType = 0;
                        }
                        animType = 30.0 + surType * 256.0 + bits;
                    }
                }
            }

            // Guarantee all BUILDING roof lids (except pools 35/22) use a remastered GTA 6 roof deck tile
            if (b.groundType === 4 && effTileIdx !== 35 && effTileIdx !== 22) {
                const isKnownCleanRoof = (
                    (effTileIdx >= 14 && effTileIdx <= 18) ||
                    (effTileIdx >= 29 && effTileIdx <= 34) ||
                    (effTileIdx >= 36 && effTileIdx <= 40) ||
                    (effTileIdx >= 42 && effTileIdx <= 68) ||
                    (effTileIdx >= 70 && effTileIdx <= 73) ||
                    effTileIdx === 76 || effTileIdx === 78 || effTileIdx === 79 ||
                    (effTileIdx >= 83 && effTileIdx <= 87)
                );
                if (!isKnownCleanRoof) {
                    effTileIdx = ((x + z_south) % 2 === 0) ? 46 : 48;
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

        const cu0 = (uvi0 & 1) ? u1 : u0;
        const cu1 = (uvi1 & 1) ? u1 : u0;
        const cu2 = (uvi2 & 1) ? u1 : u0;
        const cu3 = (uvi3 & 1) ? u1 : u0;
        let cv0 = (uvi0 & 2) ? v1 : v0;
        let cv1 = (uvi1 & 2) ? v1 : v0;
        const cv2 = (uvi2 & 2) ? v1 : v0;
        const cv3 = (uvi3 & 2) ? v1 : v0;

        if (face < 4 && st > 0 && st <= 52) {
            const hTop0 = Math.max(0.0, Math.min(1.0, p24[q0 * 3 + 1] - y_elev));
            const hTop1 = Math.max(0.0, Math.min(1.0, p24[q1 * 3 + 1] - y_elev));
            if (hTop0 < 0.999) cv0 = cv2 + (cv0 - cv2) * hTop0;
            if (hTop1 < 0.999) cv1 = cv3 + (cv1 - cv3) * hTop1;
        }

        let nOffX = 0.0, nOffY = extraYOffset || 0.0, nOffZ = 0.0;
        if (b.isFlat) {
            const kFlatFaceOffset = 0.003;
            if (face === 0) nOffX = -kFlatFaceOffset;
            else if (face === 1) nOffX = kFlatFaceOffset;
            else if (face === 2) nOffZ = -kFlatFaceOffset;
            else if (face === 3) nOffZ = kFlatFaceOffset;
            else nOffY += kFlatFaceOffset;
        }

        const o0 = q0 * 3, o1 = q1 * 3, o2 = q2 * 3, o3 = q3 * 3;
        const vx0 = p24[o0] + nOffX, vy0 = p24[o0 + 1] + nOffY, vz0 = p24[o0 + 2] + nOffZ;
        const vx1 = p24[o1] + nOffX, vy1 = p24[o1 + 1] + nOffY, vz1 = p24[o1 + 2] + nOffZ;
        const vx2 = p24[o2] + nOffX, vy2 = p24[o2 + 1] + nOffY, vz2 = p24[o2 + 2] + nOffZ;
        const vx3 = p24[o3] + nOffX, vy3 = p24[o3 + 1] + nOffY, vz3 = p24[o3 + 2] + nOffZ;

        if (typeof verts === "number") {
            let buf = verts === 1 ? this._cityFlatBuf : this._cityOpaqueBuf;
            let len = verts === 1 ? this._cityFlatLen : this._cityOpaqueLen;
            if (len + 36 > buf.length) {
                const grown = new Float32Array(buf.length * 2);
                grown.set(buf);
                if (verts === 1) this._cityFlatBuf = grown;
                else this._cityOpaqueBuf = grown;
                buf = grown;
            }
            buf[len]      = vx0; buf[len + 1]  = vy0; buf[len + 2]  = vz0; buf[len + 3]  = cu0; buf[len + 4]  = cv0; buf[len + 5]  = animType;
            buf[len + 6]  = vx2; buf[len + 7]  = vy2; buf[len + 8]  = vz2; buf[len + 9]  = cu2; buf[len + 10] = cv2; buf[len + 11] = animType;
            buf[len + 12] = vx1; buf[len + 13] = vy1; buf[len + 14] = vz1; buf[len + 15] = cu1; buf[len + 16] = cv1; buf[len + 17] = animType;
            buf[len + 18] = vx1; buf[len + 19] = vy1; buf[len + 20] = vz1; buf[len + 21] = cu1; buf[len + 22] = cv1; buf[len + 23] = animType;
            buf[len + 24] = vx2; buf[len + 25] = vy2; buf[len + 26] = vz2; buf[len + 27] = cu2; buf[len + 28] = cv2; buf[len + 29] = animType;
            buf[len + 30] = vx3; buf[len + 31] = vy3; buf[len + 32] = vz3; buf[len + 33] = cu3; buf[len + 34] = cv3; buf[len + 35] = animType;
            if (verts === 1) this._cityFlatLen = len + 36;
            else this._cityOpaqueLen = len + 36;
        } else {
            verts.push(
                vx0, vy0, vz0, cu0, cv0, animType,
                vx2, vy2, vz2, cu2, cv2, animType,
                vx1, vy1, vz1, cu1, cv1, animType,
                vx1, vy1, vz1, cu1, cv1, animType,
                vx2, vy2, vz2, cu2, cv2, animType,
                vx3, vy3, vz3, cu3, cv3, animType
            );
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
                if (hasN) {
                    this._emitParapetStripScalar(
                        verts, b.faces[2], tiles, padU, yCop,
                        xW, zN, 0, 0,
                        xE, zN, 1, 0,
                        xW + (hasW ? wPar : 0.0), zN + wPar, 0, 1,
                        xE - (hasE ? wPar : 0.0), zN + wPar, 1, 1
                    );
                }
                if (hasS) {
                    this._emitParapetStripScalar(
                        verts, b.faces[3], tiles, padU, yCop,
                        xW + (hasW ? wPar : 0.0), zS - wPar, 0, 1,
                        xE - (hasE ? wPar : 0.0), zS - wPar, 1, 1,
                        xW, zS, 0, 0,
                        xE, zS, 1, 0
                    );
                }
                if (hasW) {
                    this._emitParapetStripScalar(
                        verts, b.faces[0], tiles, padU, yCop,
                        xW, zN, 0, 0,
                        xW + wPar, zN + (hasN ? wPar : 0.0), 0, 1,
                        xW, zS, 1, 0,
                        xW + wPar, zS - (hasS ? wPar : 0.0), 1, 1
                    );
                }
                if (hasE) {
                    this._emitParapetStripScalar(
                        verts, b.faces[1], tiles, padU, yCop,
                        xE - wPar, zN + (hasN ? wPar : 0.0), 0, 1,
                        xE, zN, 0, 0,
                        xE - wPar, zS - (hasS ? wPar : 0.0), 1, 1,
                        xE, zS, 1, 0
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
        if (!this.spritePool) {
            this.spritePool = [];
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
        if (!this.spritePool) this.spritePool = [];
        const seq = this.spriteQueue.length;
        if (seq >= this.maxSprites) return;
        let slot = this.spritePool[seq];
        if (!slot) {
            slot = {
                xPx, yPx, zBlocks, wPx, hPx, angleRad,
                u0, v0, u1, v1, r, g, b, a, drawOrder, pitchZ, seq
            };
            this.spritePool[seq] = slot;
        } else {
            slot.xPx = xPx;
            slot.yPx = yPx;
            slot.zBlocks = zBlocks;
            slot.wPx = wPx;
            slot.hPx = hPx;
            slot.angleRad = angleRad;
            slot.u0 = u0;
            slot.v0 = v0;
            slot.u1 = u1;
            slot.v1 = v1;
            slot.r = r;
            slot.g = g;
            slot.b = b;
            slot.a = a;
            slot.drawOrder = drawOrder;
            slot.pitchZ = pitchZ;
            slot.seq = seq;
        }
        this.spriteQueue.push(slot);
    }

    pushAtlasSprite3D(rect, xPx, yPx, zBlocks, angleRad = 0, scale = 1.0, drawOrder = 4, r = 1, g = 1, b = 1, a = 1, pitchZ = 0) {
        if (!rect || !this.gta1SpritesImg.width) return;
        const arr = Array.isArray(rect)
            ? rect
            : (Array.isArray(rect.remaps) && rect.remaps.length > 0 ? rect.remaps[0] : rect.base);
        if (!Array.isArray(arr) || arr.length < 4) return;
        const [sx, sy, sw, sh] = arr;
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

    pushAsphaltBayQuad3D(xPx, yPx, zBlocks, wPx, hPx, isCurbBay = true, dc = 1, drawOrder = 1, darkAsphalt = false) {
        const u0 = (isCurbBay && dc < 0) ? -1.5 : -2.5;
        const u1 = (isCurbBay && dc < 0) ? -2.5 : -1.5;
        const modeFlag = isCurbBay ? (darkAsphalt ? 1.5 : 1.0) : 0.25;
        this.pushSpriteQuad3D(xPx, yPx, zBlocks, wPx, hPx, 0, u0, 0.0, u1, 1.0, modeFlag, wPx, hPx, 1.0, drawOrder);
    }

    pushWornPaintQuad3D(xPx, yPx, zBlocks, wPx, hPx, angleRad, r, g, b, a, drawOrder = 1) {
        this.pushSpriteQuad3D(xPx, yPx, zBlocks, wPx, hPx, angleRad, -3.0, -3.0, -3.0, -3.0, r, g, b, a, drawOrder);
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

        const verts = this.spriteVerts;
        let offset = 0;
        const count = Math.min(this.maxSprites, this.spriteQueue.length);
        const invTile = 1.0 / TILE_SIZE;

        for (let i = 0; i < count; i++) {
            const s = this.spriteQueue[i];
            const cx = s.xPx * invTile;
            const cz = s.yPx * invTile;
            const hw = s.wPx * invTile * 0.5;
            const hh = s.hPx * invTile * 0.5;
            const cosA = Math.cos(s.angleRad);
            const sinA = Math.sin(s.angleRad);
            const hwCos = hw * cosA, hwSin = hw * sinA;
            const hhCos = hh * cosA, hhSin = hh * sinA;

            // 4 rotated corners without allocating arrays: 0=(-hw,-hh), 1=(hw,-hh), 2=(-hw,hh), 3=(hw,hh)
            const wx0 = cx - hwCos + hhSin, wz0 = cz - hwSin - hhCos;
            const wx1 = cx + hwCos + hhSin, wz1 = cz + hwSin - hhCos;
            const wx2 = cx - hwCos - hhSin, wz2 = cz - hwSin + hhCos;
            const wx3 = cx + hwCos - hhSin, wz3 = cz + hwSin + hhCos;

            const pZ = s.pitchZ || 0;
            const yTop = s.zBlocks - pZ;
            const yBot = s.zBlocks + pZ;
            const u0 = s.u0, v0 = s.v0, u1 = s.u1, v1 = s.v1;
            const r = s.r, g = s.g, b = s.b, a = s.a;

            // Triangle 1: (0, 2, 1)
            verts[offset]     = wx0; verts[offset + 1] = yTop; verts[offset + 2] = wz0; verts[offset + 3] = u0; verts[offset + 4] = v0; verts[offset + 5] = r; verts[offset + 6] = g; verts[offset + 7] = b; verts[offset + 8] = a;
            verts[offset + 9] = wx2; verts[offset + 10] = yBot; verts[offset + 11] = wz2; verts[offset + 12] = u0; verts[offset + 13] = v1; verts[offset + 14] = r; verts[offset + 15] = g; verts[offset + 16] = b; verts[offset + 17] = a;
            verts[offset + 18] = wx1; verts[offset + 19] = yTop; verts[offset + 20] = wz1; verts[offset + 21] = u1; verts[offset + 22] = v0; verts[offset + 23] = r; verts[offset + 24] = g; verts[offset + 25] = b; verts[offset + 26] = a;
            // Triangle 2: (1, 2, 3)
            verts[offset + 27] = wx1; verts[offset + 28] = yTop; verts[offset + 29] = wz1; verts[offset + 30] = u1; verts[offset + 31] = v0; verts[offset + 32] = r; verts[offset + 33] = g; verts[offset + 34] = b; verts[offset + 35] = a;
            verts[offset + 36] = wx2; verts[offset + 37] = yBot; verts[offset + 38] = wz2; verts[offset + 39] = u0; verts[offset + 40] = v1; verts[offset + 41] = r; verts[offset + 42] = g; verts[offset + 43] = b; verts[offset + 44] = a;
            verts[offset + 45] = wx3; verts[offset + 46] = yBot; verts[offset + 47] = wz3; verts[offset + 48] = u1; verts[offset + 49] = v1; verts[offset + 50] = r; verts[offset + 51] = g; verts[offset + 52] = b; verts[offset + 53] = a;
            offset += 54;
        }
        this.spriteCount = count;
    }

    flushSpriteBatch(viewProj, nf = 0.0, sf = 0.0, sunDirX = 0.0, sunDirY = 1.0) {
        const gl = this.gl;
        this.sortAndBuildSpriteBatch();
        if (!gl || this.spriteCount === 0 || !this.spritesTex) return;

        gl.useProgram(this.spriteProg);
        gl.uniformMatrix4fv(this.spriteLocs.uViewProj, false, viewProj);
        if (this.spriteLocs.uNightTint !== null && this.spriteLocs.uNightTint !== undefined) {
            gl.uniform1f(this.spriteLocs.uNightTint, nf);
        }
        if (this.spriteLocs.uSunsetTint !== null && this.spriteLocs.uSunsetTint !== undefined) {
            gl.uniform1f(this.spriteLocs.uSunsetTint, sf);
        }
        if (this.spriteLocs.uSunDir !== null && this.spriteLocs.uSunDir !== undefined) {
            gl.uniform2f(this.spriteLocs.uSunDir, sunDirX, sunDirY);
        }
        if (this.spriteLocs.uMobileFast !== null && this.spriteLocs.uMobileFast !== undefined) {
            gl.uniform1f(this.spriteLocs.uMobileFast, this.isMobileInit ? 1.0 : 0.0);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.spritesTex);
        gl.uniform1i(this.spriteLocs.uTex, 0);

        if (this.dayLightTex && this.spriteLocs.uDayLightTex !== null && this.spriteLocs.uDayLightTex !== undefined) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.dayLightTex);
            gl.uniform1i(this.spriteLocs.uDayLightTex, 1);
            gl.activeTexture(gl.TEXTURE0);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
        gl.bufferSubData(
            gl.ARRAY_BUFFER,
            0,
            this.spriteVerts.subarray(0, this.spriteCount * 54)
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

        // FollowCameraController.cpp: Smoothly track player X, Y and ground elevation Z (or 3D Interior Room camera!)
        let effectiveViewProj;
        if (game.activeInterior) {
            const intr = game.activeInterior;
            const rw = intr.w || 780;
            const rh = intr.h || 530;
            const px = game.interiorX || rw * 0.5;
            const py = game.interiorY || rh - 78;
            // Track player smoothly at exterior GTA camera scale, softly clamped to the building footprint so adjacent rooms & exterior street remain framed
            const marginX = Math.min(185, rw * 0.24);
            const marginY = Math.min(145, rh * 0.25);
            const targetCamX = Math.max(marginX, Math.min(rw - marginX, px));
            const targetCamY = Math.max(marginY + 18, Math.min(rh - marginY + 12, py));
            if (!this._wasInInterior) {
                this.camX = targetCamX;
                this.camY = targetCamY;
                this.camZBlocks = 2.0;
                this._wasInInterior = true;
            } else {
                this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8.5);
                this.camY += (targetCamY - this.camY) * Math.min(1, dt * 8.5);
                this.camZBlocks = 2.0;
            }
            effectiveViewProj = this.computeInteriorViewProjMatrix(intr);
        } else {
            const target = game.player.inVehicle || game.player;
            if (this._wasInInterior) {
                this.camX = target.x;
                this.camY = target.y;
                this._wasInInterior = false;
            }
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
            effectiveViewProj = this.computeViewProjMatrixWithSpeed(speedZoomBlocks);
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.imageSmoothingEnabled = true;

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
            const pct = Math.min(99, Math.round(((this.loadProgress || 0) / (this.loadTotal || 8)) * 100));
            const stageTxt = this.loadStageLabel || "LOADING 3D VICE CITY 26 WORLD...";
            ctx.fillText(`${stageTxt} (${pct}%)`, cx, cy - 8);

            const bw = 340;
            const bh = 16;
            const bx = Math.round(cx - bw * 0.5);
            const by = Math.round(cy + 16);
            ctx.fillStyle = "rgba(8, 15, 30, 0.9)";
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);

            const fillW = Math.max(24, Math.round((bw - 6) * Math.max(0.15, (this.loadProgress || 0) / (this.loadTotal || 8))));
            const barGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
            barGrad.addColorStop(0, "#ff2a85");
            barGrad.addColorStop(1, "#00f0ff");
            ctx.fillStyle = barGrad;
            ctx.fillRect(bx + 3, by + 3, fillW, bh - 6);
            ctx.restore();
            return;
        }

        // 1. Render 3D WebGL CityMesh (or 3D WebGL Interior Room!) + 3D SpriteBatch into this.glCanvas
        const needDaylightAtmo = !this.isMobileInit && (this.nightFactor || 0) < 0.72 && !this.nightMode && !game.activeInterior;
        const needNightLight = ((this.nightFactor || 0) > 0.02 || (this.sunsetFactor || 0) > 0.04 || this.nightMode) && !game.activeInterior;
        const glMountedBehind = Boolean(this.glCanvas && this.glCanvas.parentNode);

        if (!this.glLost) {
            this.renderWebGLScene(game, effectiveViewProj);
            if (!glMountedBehind || needDaylightAtmo || needNightLight) {
                ctx.drawImage(this.glCanvas, 0, 0);
            } else {
                // Zero-copy hardware compositing: #webgl-canvas renders directly behind transparent #game-canvas!
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        // 2A. Daytime Ambient Florida Sunlight, Volumetric Sunbeams & Tropical Sky-Shadow Atmosphere
        // (On mobile, WebGL shaders already compute full directional sunlight & shadow maps in hardware, avoiding software 2D canvas full-screen blends)
        if (needDaylightAtmo) {
            this.renderDaylightAtmosphere(ctx, game);
        }

        // 2B. Real Dynamic Day/Sunset/Night Lighting (Darkness Mask + Conical Headlights + Taillights + Streetlamps + Neon + Sirens)
        if (needNightLight) {
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

    computeInteriorViewProjMatrix(intr) {
        const W = Math.max(1, this.canvas.width);
        const H = Math.max(1, this.canvas.height);
        const aspect = W / H;
        const fovyRad = (55.0 * Math.PI) / 180.0;
        const f = 1.0 / Math.tan(fovyRad * 0.5);

        // Match exterior GTA street camera scale (distBlocks ~ 6.85) so interior characters, weapons, furniture & tiles match the outdoor world 1:1!
        const baseScale = W < 900 ? 7.35 : 6.85;
        const distBlocks = Math.max(5.8, Math.min(9.2, baseScale + (this.zoomOffsetBlocks || 0) * 0.5));

        const camXBlocks = this.camX / TILE_SIZE;
        const camYBlocks = this.camY / TILE_SIZE;
        const camElev = 2.0 + distBlocks;
        this.currentCamElev = camElev;
        this.currentCamDist = distBlocks;

        const near = 0.25;
        const far = 64.0;
        const A = (far + near) / (far - near);
        const B = (-2.0 * far * near) / (far - near);
        const sx = f / aspect;
        const sy = -f;

        return new Float32Array([
            sx,  0,   0,  0,
            0,   0,  -A, -1,
            0,   sy,  0,  0,
            -camXBlocks * sx, -camYBlocks * sy, A * camElev + B, camElev
        ]);
    }

    getWindowLitFactor(game) {
        if (typeof this.windowLitFactor === "number" && this.windowLitFactor > 0.001) {
            return this.windowLitFactor;
        }
        if (game && typeof game.worldMinutes === "number") {
            const hour = (((game.worldMinutes % 1440) + 1440) % 1440) / 60.0;
            const sm = (t) => {
                const c = Math.max(0, Math.min(1, t));
                return c * c * (3 - 2 * c);
            };
            if (hour >= 22.5 || hour < 2.0) return 0.92;
            if (hour >= 17.5 && hour < 19.5) return sm((hour - 17.5) / 2.0) * 0.34;
            if (hour >= 19.5 && hour < 22.5) return 0.34 + sm((hour - 19.5) / 3.0) * 0.58;
            if (hour >= 2.0 && hour < 5.25) return 0.92 - sm((hour - 2.0) / 3.25) * 0.50;
            if (hour >= 5.25 && hour < 7.15) return 0.42 * (1.0 - sm((hour - 5.25) / 1.9));
            return 0.0;
        }
        return (this.nightFactor || 0) > 0.05 ? Math.min(0.92, (this.nightFactor || 0) * 0.88) : (this.nightMode ? 0.88 : 0.0);
    }

    renderWebGLScene(game, viewProj) {
        const gl = this.gl;
        if (!gl) return;

        const nf = Math.max(0, Math.min(1, this.nightFactor !== undefined ? this.nightFactor : (this.nightMode ? 1.0 : 0.0)));
        const sf = Math.max(0, Math.min(1, this.sunsetFactor || 0.0));

        gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);

        // Dedicated True 3D Hardware Z-Buffered Interior Pass when inside any of the 14 building themes!
        if (game && game.activeInterior) {
            gl.clearColor(0.32, 0.38, 0.34, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            if (!this.gta1Ready || !this.cmpReady) return;
            if (this.map && this.map.objectEngine) {
                this.map.objectEngine.renderInterior3DMesh(gl, this, game, viewProj);
                this.beginSpriteBatch();
                this.map.objectEngine.batchInteriorSprites3D(this, game);
                this.flushSpriteBatch(viewProj);
            }
            return;
        }

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

        // Visible ground frustum in block units (tightened to aspect ratio on portrait mobile screens to avoid drawing off-screen chunks)
        const camXBlocks = this.camX / TILE_SIZE;
        const camYBlocks = this.camY / TILE_SIZE;
        const aspect = this.glCanvas.width / Math.max(1, this.glCanvas.height);
        const marginX = this.isMobileInit ? Math.max(8.5, Math.min(13.0, 9.5 * aspect + 3.5)) : 14.0;
        const marginY = this.isMobileInit ? 9.5 : 11.0;
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
        if (this.cityLocs.uMobileFast !== null && this.cityLocs.uMobileFast !== undefined) {
            gl.uniform1f(this.cityLocs.uMobileFast, this.isMobileInit ? 1.0 : 0.0);
        }
        if (this.cityLocs.uWinLit) {
            gl.uniform1f(this.cityLocs.uWinLit, this.getWindowLitFactor(game));
        }
        if (this.cityLocs.uSunsetTint) {
            gl.uniform1f(this.cityLocs.uSunsetTint, sf);
        }
        if (this.cityLocs.uTime) {
            gl.uniform1f(this.cityLocs.uTime, this.time);
        }
        const clockHr = (game && typeof game.worldMinutes === "number")
            ? (((game.worldMinutes % 1440) + 1440) % 1440) / 60.0
            : 12.0;
        // Sun moves from East (+X) at 06:00 -> South (+Z) at 12:00 -> West (-X) at 18:00
        const sunAz = ((clockHr - 6.0) / 12.0) * Math.PI;
        const sunDirX = Math.cos(sunAz);
        const sunDirY = Math.max(0.25, Math.sin(sunAz));
        if (this.cityLocs.uSunDir) {
            gl.uniform2f(this.cityLocs.uSunDir, sunDirX, sunDirY);
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

        // A3. Render Hardware Z-Buffered 3D Volumetric Architectural Prefabs (WorldObjectEngine)
        if (this.map && this.map.objectEngine) {
            this.map.objectEngine.renderStatic3DMesh(gl, this, viewProj, nf, sf);
        }

        // B. Populate & Flush 3D Depth-Tested SpriteBatch
        const minPxX = minBX * TILE_SIZE;
        const maxPxX = maxBX * TILE_SIZE;
        const minPxY = minBY * TILE_SIZE;
        const maxPxY = maxBY * TILE_SIZE;

        this.beginSpriteBatch();
        this.batchWorldSprites3D(game, minPxX, minPxY, maxPxX, maxPxY);
        this.flushSpriteBatch(viewProj, nf, sf, sunDirX, sunDirY);
        this._lastViewProj = viewProj;
    }

    renderEmissiveWindowsWebGL(game, viewProj) {
        const gl = this.gl;
        if (!gl || !viewProj || (game && game.activeInterior)) return false;
        const winLit = this.getWindowLitFactor(game);
        if (winLit <= 0.03) return false;
        const activeTilesTex = this.mapStyle === "VICE"
            ? (this.tilesTexVice || this.tilesTex)
            : (this.tilesTexNyc || this.tilesTex);
        if (!this.gta1Ready || !this.cmpReady || !activeTilesTex) return false;

        // Clear ONLY the color buffer to black (0,0,0,1) while preserving the hardware 3D depth buffer
        // from renderWebGLScene so roofs, overhangs, trees, and vehicles occlude lit windows with 100% 3D accuracy!
        gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
        gl.disable(gl.BLEND);

        const camXBlocks = this.camX / TILE_SIZE;
        const camYBlocks = this.camY / TILE_SIZE;
        const minBX = camXBlocks - 14.0;
        const maxBX = camXBlocks + 14.0;
        const minBY = camYBlocks - 11.0;
        const maxBY = camYBlocks + 11.0;

        // 1) Draw Crisp 3D Emissive Window Textures on City Buildings (uNightTint = -1.0 discards non-window pixels)
        gl.useProgram(this.cityProg);
        gl.uniformMatrix4fv(this.cityLocs.uViewProj, false, viewProj);
        gl.uniform1f(this.cityLocs.uNightTint, -1.0);
        if (this.cityLocs.uWinLit) gl.uniform1f(this.cityLocs.uWinLit, winLit);
        if (this.cityLocs.uSunsetTint) gl.uniform1f(this.cityLocs.uSunsetTint, 0.0);
        gl.uniform1f(this.cityLocs.uViceStyle, this.mapStyle === "VICE" ? 1.0 : 0.0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, activeTilesTex);
        gl.uniform1i(this.cityLocs.uTex, 0);

        const stride = 6 * 4;
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

        // 2) Draw Crisp 3D Emissive Window Textures on 3D Houses, Villas & Custom Buildings (uNightTint = -1.0)
        if (this.map && this.map.objectEngine) {
            this.map.objectEngine.renderStatic3DMesh(gl, this, viewProj, -1.0, 0.0, true);
        }
        gl.depthMask(true);
        return true;
    }

    getEntityZ(ent, offset = 0.03) {
        const isWaterEnt = Boolean(
            ent && (
                ent.waterOnly ||
                ent.specKey === "AIRBOAT" ||
                (this.map && typeof this.map.isWaterAtPixel === "function" && this.map.isWaterAtPixel(ent.x, ent.y))
            )
        );
        if (ent && typeof ent.z === "number" && !Number.isNaN(ent.z)) {
            const baseZ = isWaterEnt ? Math.max(2.0, ent.z) : ent.z;
            return baseZ + offset;
        }
        const rawH = this.map.getHeightAtPixel(ent.x, ent.y, this.camZBlocks, !isWaterEnt);
        const h = isWaterEnt ? Math.max(2.0, rawH) : rawH;
        if (ent) ent.z = h;
        return h + offset;
    }

    batchObjectSprite3D(objIdStr, x, y, zBlocks, angle = 0, scale = 1.0, drawOrder = SPRITE_DRAW_ORDER.MAP_OBJECT, r = 1.0, g = 1.0, b = 1.0, a = 1.0) {
        if (!this.gta1Ready || !this.gta1Meta.sprites.objects[objIdStr]) return;
        const rect = this.gta1Meta.sprites.objects[objIdStr];
        this.pushAtlasSprite3D(rect, x, y, zBlocks, angle, scale, drawOrder, r, g, b, a);
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

        // 1. Solar-Tracked Dappled Feathery Ground Shadow on Sidewalk / Lawn / Beach Sand (taller palms cast longer shadows)
        const nf = Math.max(0.0, Math.min(1.0, this.nightFactor || 0.0));
        const daySun = Math.max(0.0, 1.0 - nf * 1.15);
        const shadowAlpha = 0.33 * (1.0 - nf * 0.55);
        const shCos = this._curSunCos !== undefined ? this._curSunCos : 0.72;
        const shSin = this._curSunSin !== undefined ? this._curSunSin : 0.69;
        const shDist = (12.5 + daySun * 3.5) * sc * hm;
        this.pushAtlasSprite3D(
            palmRect,
            x + shCos * shDist,
            y + shSin * shDist,
            baseZ + 0.018,
            baseAngle + breeze * 0.5,
            sc * 0.96,
            SPRITE_DRAW_ORDER.TIRE_MARKS,
            0.02,
            0.05,
            0.14,
            shadowAlpha
        );

        // 2. 3D Curved Ringed Coconut / Royal Palm Trunk rising from planter to crown (single trunk quad on mobile to halve palm quad count)
        const segs = this.isMobileInit ? 1 : Math.max(3, Math.round(4 * hm));
        for (let s = 0; s < segs; s++) {
            const t = segs > 1 ? (s / (segs - 1)) : 0.5;
            const tx = x + leanX * t;
            const ty = y + leanY * t;
            const tz = baseZ + 0.045 + t * 0.27 * hm;
            const sz = (3.0 - t * 0.8) * sc;
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
            0.62,
            0.82,
            0.68,
            0.95
        );

        // 4. Upper Sunlit Feathery Palm Crown + Central Coconut Cluster (warm golden-lime Florida sun highlight by day!)
        this.pushAtlasSprite3D(
            palmRect,
            x + leanX,
            y + leanY,
            baseZ + 0.42 * hm,
            baseAngle + breeze,
            sc * 1.04,
            SPRITE_DRAW_ORDER.TREES,
            1.0 + 0.08 * daySun,
            1.0 + 0.05 * daySun,
            1.0 - 0.06 * daySun,
            1.0
        );
    }

    renderLeonidaFlora3D(pm, pi, sunShadowAngle, sunShadowAlpha, nfGlobal) {
        if (!this.gta1Ready || !this.gta1Meta || !this.gta1Meta.sprites || !this.gta1Meta.sprites.objects) return;
        const kind = pm.kind || "palm_tree";
        const sc = pm.scale || 1.0;
        const hm = Math.max(0.5, Math.min(1.8, pm.height || 1.0));
        const baseZ = (pm.z !== undefined ? pm.z : 2.0);
        const groundZ = this.getEntityZ(pm, 0.0);

        if (kind === "palm_tree") {
            const isNightGlow = (this.nightFactor || 0) > 0.18;
            if (isNightGlow && pm.x >= mx256(165) * TILE_SIZE && pm.x <= mx256(222) * TILE_SIZE) {
                const isPink = (pi % 2) === 0;
                this.pushSolidQuad3D(
                    pm.x, pm.y, baseZ + 0.025, 11, 11, 0,
                    isPink ? 1.0 : 0.05, isPink ? 0.22 : 0.92, isPink ? 0.68 : 1.0,
                    0.75 * (this.nightFactor || 1.0), SPRITE_DRAW_ORDER.MAP_OBJECT
                );
            }
            this.renderMiamiPalmTree3D(pm.x, pm.y, groundZ, pm.angle || 0, sc, pi + 100, hm);
            return;
        }

        const shadowAlpha = 0.28 * (1.0 - (nfGlobal || 0.0) * 0.55);
        const shAngle = sunShadowAngle || 0.785;
        const shDist = 6.0 * sc * hm;

        if (kind === "fan_palm") {
            const spr = this.gta1Meta.sprites.objects["fan_palm"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 1.5 + pm.x * 0.015 + pm.y * 0.018) * 0.035;
            this.pushAtlasSprite3D(spr, pm.x + Math.cos(shAngle) * shDist * 0.9, pm.y + Math.sin(shAngle) * shDist * 0.9, groundZ + 0.016, (pm.angle || 0) + breeze * 0.5, sc * 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.22 * hm, (pm.angle || 0) + breeze, sc * 1.0, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "swamp_cypress") {
            const spr = this.gta1Meta.sprites.objects["swamp_cypress"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 1.25 + pm.x * 0.012 + pm.y * 0.015) * 0.03;
            this.pushAtlasSprite3D(spr, pm.x + Math.cos(shAngle) * shDist * 1.1, pm.y + Math.sin(shAngle) * shDist * 1.1, groundZ + 0.016, (pm.angle || 0) + breeze * 0.5, sc * 0.95, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.35 * hm, (pm.angle || 0) + breeze, sc * 1.05, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "mangrove") {
            const spr = this.gta1Meta.sprites.objects["mangrove"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 1.35 + pm.x * 0.018) * 0.025;
            this.pushAtlasSprite3D(spr, pm.x + Math.cos(shAngle) * shDist * 0.8, pm.y + Math.sin(shAngle) * shDist * 0.8, groundZ + 0.016, pm.angle || 0, sc * 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.18 * hm, (pm.angle || 0) + breeze, sc * 1.02, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "banyan_tree") {
            const spr = this.gta1Meta.sprites.objects["banyan_tree"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 1.1 + pm.x * 0.01) * 0.02;
            this.pushAtlasSprite3D(spr, pm.x + Math.cos(shAngle) * shDist * 1.25, pm.y + Math.sin(shAngle) * shDist * 1.25, groundZ + 0.016, pm.angle || 0, sc * 1.05, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha * 1.1);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.38 * hm, (pm.angle || 0) + breeze, sc * 1.08, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "live_oak") {
            const spr = this.gta1Meta.sprites.objects["live_oak"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 1.2 + pm.y * 0.016) * 0.028;
            this.pushAtlasSprite3D(spr, pm.x + Math.cos(shAngle) * shDist * 1.15, pm.y + Math.sin(shAngle) * shDist * 1.15, groundZ + 0.016, pm.angle || 0, sc * 0.98, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.32 * hm, (pm.angle || 0) + breeze, sc * 1.05, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "bougainvillea_bush") {
            const spr = this.gta1Meta.sprites.objects["bougainvillea_bush"];
            if (!spr) return;
            this.pushAtlasSprite3D(spr, pm.x + 3 * sc, pm.y + 3 * sc, groundZ + 0.015, 0, sc * 0.95, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha * 0.9);
            const isNightGlow = (this.nightFactor || 0) > 0.18 && pm.x >= mx256(165) * TILE_SIZE && pm.x <= mx256(222) * TILE_SIZE;
            const cr = isNightGlow ? 1.15 : 1.0;
            const cg = isNightGlow ? 0.92 : 1.0;
            const cb = isNightGlow ? 1.15 : 1.0;
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.06, pm.angle || 0, sc * 1.05, SPRITE_DRAW_ORDER.TREES, cr, cg, cb, 1);
        } else if (kind === "sea_grape") {
            const spr = this.gta1Meta.sprites.objects["sea_grape"];
            if (!spr) return;
            this.pushAtlasSprite3D(spr, pm.x + 3 * sc, pm.y + 3 * sc, groundZ + 0.015, 0, sc * 0.95, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha * 0.85);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.05, pm.angle || 0, sc * 1.02, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "tropical_shrub") {
            const spr = this.gta1Meta.sprites.objects["tropical_shrub"];
            if (!spr) return;
            this.pushAtlasSprite3D(spr, pm.x + 2.5 * sc, pm.y + 2.5 * sc, groundZ + 0.015, 0, sc * 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha * 0.85);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.06, pm.angle || 0, sc * 1.02, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "sawgrass_clump") {
            const spr = this.gta1Meta.sprites.objects["sawgrass_clump"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 2.2 + pm.x * 0.025 + pm.y * 0.02) * 0.05;
            this.pushAtlasSprite3D(spr, pm.x + 2 * sc, pm.y + 2 * sc, groundZ + 0.015, breeze * 0.5, sc * 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha * 0.7);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.045, (pm.angle || 0) + breeze, sc * 1.02, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        } else if (kind === "slash_pine") {
            const spr = this.gta1Meta.sprites.objects["slash_pine"];
            if (!spr) return;
            const breeze = Math.sin(this.time * 1.4 + pm.x * 0.015) * 0.035;
            this.pushAtlasSprite3D(spr, pm.x + Math.cos(shAngle) * shDist * 1.25, pm.y + Math.sin(shAngle) * shDist * 1.25, groundZ + 0.016, (pm.angle || 0) + breeze * 0.5, sc * 1.05, SPRITE_DRAW_ORDER.TIRE_MARKS, 0, 0, 0, shadowAlpha);
            this.pushAtlasSprite3D(spr, pm.x, pm.y, groundZ + 0.35 * hm, (pm.angle || 0) + breeze, sc * 1.08, SPRITE_DRAW_ORDER.TREES, 1, 1, 1, 1);
        }
    }

    renderSmashedParasol3D(umbSpr, ux, uy, bz, knockAng = 0, scale = 0.95) {
        const objs = this.gta1Meta && this.gta1Meta.sprites && this.gta1Meta.sprites.objects;
        const umbRect = objs && (objs[umbSpr] || objs["umbrella_pink"]);
        const ca = Math.cos(knockAng);
        const sa = Math.sin(knockAng);
        // Snapped base stub & bent aluminum pole lying flat on the sand/pavement
        this.pushSolidQuad3D(ux, uy, bz + 0.016, 3.2, 3.2, 0, 0.45, 0.47, 0.50, 0.92, SPRITE_DRAW_ORDER.GROUND_DECALS);
        this.pushSolidQuad3D(ux + ca * 8, uy + sa * 8, bz + 0.018, 16, 2.2, knockAng, 0.78, 0.80, 0.84, 0.95, SPRITE_DRAW_ORDER.GROUND_DECALS);
        // Toppled, crumpled parasol canopy knocked forward on the ground
        if (umbRect) {
            this.pushAtlasSprite3D(
                umbRect,
                ux + ca * 15,
                uy + sa * 15,
                bz + 0.020,
                knockAng + 0.45,
                scale * 0.82,
                SPRITE_DRAW_ORDER.GROUND_DECALS,
                0.76, 0.74, 0.72,
                0.92
            );
        }
        // Bent wireframe spoke ribs protruding from torn canopy
        this.pushSolidQuad3D(ux + ca * 18, uy + sa * 18, bz + 0.022, 12, 1.3, knockAng + 0.38, 0.88, 0.90, 0.94, 0.88, SPRITE_DRAW_ORDER.GROUND_DECALS);
        this.pushSolidQuad3D(ux + ca * 16, uy + sa * 16, bz + 0.022, 11, 1.3, knockAng - 0.42, 0.88, 0.90, 0.94, 0.88, SPRITE_DRAW_ORDER.GROUND_DECALS);
    }

    _queryStaticChunkGrid(arr, xProp, yProp, minX, minY, maxX, maxY, indexProp = null) {
        const out = this._spatialQueryOut || (this._spatialQueryOut = []);
        out.length = 0;
        if (!Array.isArray(arr) || arr.length === 0) return out;
        if (!this._staticChunkGridMap) this._staticChunkGridMap = new WeakMap();
        let grid = this._staticChunkGridMap.get(arr);
        if (!grid) {
            grid = new Array(1024);
            for (let i = 0; i < arr.length; i++) {
                const it = arr[i];
                if (!it) continue;
                if (indexProp && it[indexProp] === undefined) it[indexProp] = i;
                const px = it[xProp] !== undefined ? it[xProp] : it.x;
                const py = it[yProp] !== undefined ? it[yProp] : it.y;
                if (typeof px !== "number" || typeof py !== "number") continue;
                const cx = Math.max(0, Math.min(31, px >> 10));
                const cy = Math.max(0, Math.min(31, py >> 10));
                const k = (cy << 5) | cx;
                let bucket = grid[k];
                if (!bucket) {
                    bucket = [];
                    grid[k] = bucket;
                }
                bucket.push(it);
            }
            this._staticChunkGridMap.set(arr, grid);
        }
        const x0 = Math.max(0, minX >> 10);
        const x1 = Math.min(31, maxX >> 10);
        const y0 = Math.max(0, minY >> 10);
        const y1 = Math.min(31, maxY >> 10);
        for (let cy = y0; cy <= y1; cy++) {
            const rowOff = cy << 5;
            for (let cx = x0; cx <= x1; cx++) {
                const bucket = grid[rowOff | cx];
                if (!bucket) continue;
                for (let j = 0; j < bucket.length; j++) {
                    out.push(bucket[j]);
                }
            }
        }
        return out;
    }

    renderViceBeachActivities3D(game, minX, minY, maxX, maxY, sunCos, sunSin, sunShadowAngle, sunShadowAlpha, nfGlobal) {
        if (!this.gta1Ready || !this.map) return;
        const objs = this.gta1Meta && this.gta1Meta.sprites && this.gta1Meta.sprites.objects;
        if (!objs) return;

        // 1. Sunbathing Bikini Women on Beach Towels & Resort Sun Loungers under 3D Striped Beach Umbrellas
        if (Array.isArray(this.map.beachSunbathers)) {
            const sbVis = this._queryStaticChunkGrid(this.map.beachSunbathers, "x", "y", minX - 64, minY - 64, maxX + 64, maxY + 64, "_sbIdx");
            for (let vi = 0; vi < sbVis.length; vi++) {
                const sb = sbVis[vi];
                const i = sb._sbIdx !== undefined ? sb._sbIdx : vi;
                if (sb.x < minX - 48 || sb.x > maxX + 48 || sb.y < minY - 48 || sb.y > maxY + 48) continue;
                const bz = sb.z || 2.0;
                const ang = sb.angle || 0;
                const isWipedOut = (sb.wipeoutTimer || 0) > 0;

                // Main Beach Towel or White Sun Lounger flat on the sand (GROUND_DECALS = 1 so sunbathers/corpses always render on top!)
                this.batchObjectSprite3D(sb.towelSpr || "beach_towel_pink", sb.x, sb.y, bz + 0.015, ang, 1.15, SPRITE_DRAW_ORDER.GROUND_DECALS);

                // Sunbathing Bikini Woman lying lengthwise on the towel (when wiped out, spawned as a real Pedestrian corpse/runner!)
                const tanSway = Math.sin(this.time * 1.5 + i * 1.3) * 0.04;
                if (!isWipedOut) {
                    this.batchPedSprite3D(sb.pedType || "bikini_pink", 42, sb.x, sb.y, bz + 0.035, ang + tanSway, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }

                // Optional Companion Bikini Friend on adjacent towel (sunbathing in pairs!)
                if (sb.friendPedType) {
                    const perpX = -Math.sin(ang) * 25;
                    const perpY = Math.cos(ang) * 25;
                    const fx = sb.x + perpX;
                    const fy = sb.y + perpY;
                    this.batchObjectSprite3D(sb.friendTowelSpr || "beach_towel_yellow", fx, fy, bz + 0.015, ang, 1.15, SPRITE_DRAW_ORDER.GROUND_DECALS);
                    if (!isWipedOut) {
                        this.batchPedSprite3D(sb.friendPedType, 42, fx, fy, bz + 0.035, ang - tanSway, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }
                if (sb.standingFriendType && !isWipedOut) {
                    const stAng = ang + Math.PI * 0.75 + Math.sin(this.time * 1.3 + i) * 0.12;
                    this.batchPedSprite3D(sb.standingFriendType, 98, sb.x + 16, sb.y - 14, bz + 0.039, stAng, 1.05, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }

                // Side Beach Activity Props (Surfboard, Beach Ball, Sandcastle, Cooler) + Playful Beach Kids!
                if (sb.propSpr) {
                    const px = sb.x + (sb.propDx !== undefined ? sb.propDx : 24);
                    const py = sb.y + (sb.propDy !== undefined ? sb.propDy : -8);
                    this.batchObjectSprite3D(sb.propSpr, px, py, bz + 0.026, sb.propAngle || 0.35, sb.propScale || 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    if (sb.propSpr === "sandcastle_prop" && !isWipedOut) {
                        const kidType = (i % 2 === 0) ? "kid_beach" : "kid_girl_pink";
                        this.batchPedSprite3D(kidType, 98, px + 12, py + 4, bz + 0.036, Math.PI + Math.sin(this.time * 1.8 + i) * 0.12, 0.78, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }
                if (sb.extraPropSpr) {
                    const ex = sb.x + (sb.extraPropDx !== undefined ? sb.extraPropDx : 22);
                    const ey = sb.y + (sb.extraPropDy !== undefined ? sb.extraPropDy : 18);
                    this.batchObjectSprite3D(sb.extraPropSpr, ex, ey, bz + 0.026, 0, 0.90, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    if (sb.extraPropSpr === "sandcastle_prop" && !isWipedOut) {
                        this.batchPedSprite3D("kid_boy_cap", 98, ex + 11, ey - 5, bz + 0.036, Math.PI * 0.75 + Math.sin(this.time * 1.6 + i) * 0.12, 0.78, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }

                // 3D Striped Beach Umbrella (with solar ground shadow + 3D rising pole + elevated canopy, or smashed flat on sand!)
                if (sb.umbSpr) {
                    const ux = sb.x + (sb.umbDx !== undefined ? sb.umbDx : -22);
                    const uy = sb.y + (sb.umbDy !== undefined ? sb.umbDy : -14);
                    if ((sb.umbWipeoutTimer || 0) > 0) {
                        this.renderSmashedParasol3D(sb.umbSpr, ux, uy, bz, sb.umbKnockAng || 0, 0.95);
                    } else {
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

                if (!((vc.wipeoutTimer || 0) > 0)) {
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

                        this.batchPedSprite3D(pl.ped, fr, px, py, bz + 0.040 + jumpZ, pl.face, 1.06 + jumpZ * 0.4, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }

                    // 3D Flying Volleyball arcing over the net + ground shadow on the sand!
                    const ballX = northTargetX + (southTargetX - northTargetX) * flight;
                    const ballY = (vc.y - 20) + flight * 40;
                    const ballArcZ = Math.sin(flight * Math.PI) * 0.34;
                    this.pushSolidQuad3D(ballX + sunCos * 8, ballY + sunSin * 8, bz + 0.020, 6.5, 6.5, 0, 0.03, 0.04, 0.08, 0.36 * (1.0 - nfGlobal * 0.5), SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchObjectSprite3D("beach_ball", ballX, ballY, bz + 0.08 + ballArcZ, this.time * 5.0 + ci, 0.82 + ballArcZ * 0.35, SPRITE_DRAW_ORDER.TREES);

                    // 4 Cheering Beach Spectators along the East/West sidelines watching the rally!
                    const specSway = Math.sin(this.time * 2.2 + ci) * 0.12;
                    this.batchPedSprite3D("bikini_red", 98, vc.x - 28, vc.y - 9, bz + 0.038, specSway, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("surfer_guy", 98, vc.x - 28, vc.y + 10, bz + 0.038, -specSway, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("bikini_white", 98, vc.x + 28, vc.y - 9, bz + 0.038, Math.PI - specSway, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("vc_bodybuilder", 98, vc.x + 28, vc.y + 10, bz + 0.038, Math.PI + specSway, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                } else {
                    // Volleyball resting on sand when players have been wiped out
                    this.batchObjectSprite3D("beach_ball", vc.x + 8, vc.y + 12, bz + 0.028, ci, 0.78, SPRITE_DRAW_ORDER.MAP_OBJECT);
                }
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

                if (!((bp.wipeoutTimer || 0) > 0)) {
                    // Bikini Aerobics Instructor facing East toward dancers
                    const instSway = Math.sin(this.time * 3.8) * 2.2;
                    const instFr = Math.floor(this.time * 4.8) % 8;
                    this.batchPedSprite3D("bikini_red", instFr, bp.x - 4, bp.y + instSway, bz + 0.040, 0, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);

                    // Synchronized Bikini & Surfer Dancers in a clean 2x3 formation
                    const dancerPeds = ["bikini_pink", "bikini_cyan", "bikini_yellow", "surfer_guy", "bikini_white", "vc_jogger"];
                    for (let di = 0; di < 6; di++) {
                        const row = ((di % 3) - 1.0) * 14;
                        const col = di < 3 ? 13 : 27;
                        const stepX = Math.cos(this.time * 4.2 + di * 0.8) * 1.8;
                        const stepY = Math.sin(this.time * 4.2 + di * 0.4) * 2.2;
                        const dx = bp.x + col + stepX;
                        const dy = bp.y + row + stepY;
                        const dFr = Math.floor(this.time * 5.0 + di * 2) % 8;
                        const dAng = Math.PI + Math.sin(this.time * 2.4 + di) * 0.22;
                        this.batchPedSprite3D(dancerPeds[(di + pi) % dancerPeds.length], dFr, dx, dy, bz + 0.040, dAng, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
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
                    if (sw.hasFloatRing) {
                        this.batchObjectSprite3D("flamingo_float", wx, wy, bz + 0.020, this.time * 0.35 + si, 0.84, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    }
                    const swimFr = 50 + (Math.floor(this.time * 4.2 + si) % 4);
                    this.batchPedSprite3D(sw.pedType || "bikini_cyan", swimFr, wx, wy, bz + 0.028, (sw.angle || 0) + Math.sin(waveT) * 0.25, 1.00, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    if (sw.friendWaderType) {
                        const fwx = wx + 8;
                        const fwy = wy + 13;
                        const fwFr = 50 + (Math.floor(this.time * 3.9 + si + 2) % 4);
                        this.pushSolidQuad3D(fwx, fwy, bz + 0.014, rippleSize * 0.9, rippleSize * 0.65, 0, 0.85, 0.97, 1.0, 0.38, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.batchPedSprite3D(sw.friendWaderType, fwFr, fwx, fwy, bz + 0.028, (sw.angle || 0) + Math.PI - Math.sin(waveT) * 0.2, 1.00, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }
            }
        }

        // =========================================================================
        // 4B. SAND CATCH GAMES / METAL-DETECTOR COMBERS
        // =========================================================================
        if (Array.isArray(this.map.beachCatchGames)) {
            for (let bi = 0; bi < this.map.beachCatchGames.length; bi++) {
                const bg = this.map.beachCatchGames[bi];
                if (bg.x < minX - 64 || bg.x > maxX + 64 || bg.y < minY - 64 || bg.y > maxY + 64) continue;
                const bz = bg.z || 2.0;
                if (bg.kind === "METAL_DETECTOR") {
                    // Eccentric Florida Beachcomber sweeping a 3D metal detector along the golden sand!
                    const walkT = this.time * 0.95 + bg.seed;
                    const cx = bg.x + Math.cos(walkT) * 7.0;
                    const cy = bg.y + Math.sin(walkT) * 18.0;
                    const cAng = Math.atan2(Math.cos(walkT) * 18.0, -Math.sin(walkT) * 7.0);
                    const sweepAng = cAng + Math.sin(this.time * 4.8 + bi) * 0.55;
                    const walkFr = Math.floor(this.time * 6.0 + bi) % 8;
                    this.batchPedSprite3D("vc_tourist", walkFr, cx, cy, bz + 0.036, cAng, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    // Metal detector shaft + circular search coil hovering above sand
                    const coilX = cx + Math.cos(sweepAng) * 11.5;
                    const coilY = cy + Math.sin(sweepAng) * 11.5;
                    this.pushSolidQuad3D((cx + coilX) * 0.5, (cy + coilY) * 0.5, bz + 0.028, 11.0, 1.8, sweepAng, 0.82, 0.88, 0.94, 0.95, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.pushSolidQuad3D(coilX, coilY, bz + 0.016, 6.2, 6.2, sweepAng, 0.16, 0.20, 0.26, 0.95, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    if (Math.sin(this.time * 3.2 + bi) > 0.75) {
                        this.pushSolidQuad3D(coilX, coilY, bz + 0.022, 4.0, 4.0, this.time * 3.0, 0.98, 0.86, 0.20, 0.85, SPRITE_DRAW_ORDER.HUD_ARROW);
                    }
                } else {
                    // Beach Football / Neon Frisbee Catch Game between two beachgoers on the sand!
                    const p1y = bg.y - 18.0;
                    const p2y = bg.y + 18.0;
                    const cyc = (this.time * 1.35 + bg.seed) % 2.0;
                    const u = cyc < 1.0 ? cyc : (2.0 - cyc);
                    const arcZ = Math.sin(u * Math.PI) * 0.24;
                    const ballY = p1y + (p2y - p1y) * u;
                    const p1Jump = (u < 0.18) ? Math.sin((u / 0.18) * Math.PI) * 0.05 : 0;
                    const p2Jump = (u > 0.82) ? Math.sin(((u - 0.82) / 0.18) * Math.PI) * 0.05 : 0;
                    this.batchPedSprite3D("surfer_guy", p1Jump > 0.01 ? 0 : 98, bg.x, p1y, bz + 0.036 + p1Jump, Math.PI * 0.5, 1.05, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("bikini_cyan", p2Jump > 0.01 ? 0 : 98, bg.x, p2y, bz + 0.036 + p2Jump, -Math.PI * 0.5, 1.05, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    // Shadow on sand + 3D arcing football or neon pink frisbee
                    this.pushSolidQuad3D(bg.x + sunCos * 3.0, ballY + sunSin * 3.0, bz + 0.014, 4.8, 4.8, 0, 0.02, 0.03, 0.06, 0.30, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    if (bg.kind === "FOOTBALL_TOSS") {
                        this.pushSolidQuad3D(bg.x, ballY, bz + 0.05 + arcZ, 6.2, 3.8, Math.PI * 0.5, 0.58, 0.28, 0.12, 0.98, SPRITE_DRAW_ORDER.HUD_ARROW);
                    } else {
                        this.pushSolidQuad3D(bg.x, ballY, bz + 0.05 + arcZ, 6.5, 6.5, this.time * 6.0, 0.98, 0.28, 0.78, 0.96, SPRITE_DRAW_ORDER.HUD_ARROW);
                    }
                }
            }
        }

        // =========================================================================
        // 5. MUSCLE BEACH OUTDOOR FITNESS PARK (Weightlifting Benches, Pull-Up Racks & Bodybuilders)
        // =========================================================================
        if (Array.isArray(this.map.muscleBeachGyms)) {
            for (let gi = 0; gi < this.map.muscleBeachGyms.length; gi++) {
                const gm = this.map.muscleBeachGyms[gi];
                if (gm.x < minX - 64 || gm.x > maxX + 64 || gm.y < minY - 64 || gm.y > maxY + 64) continue;
                const bz = gm.z || 2.0;

                const gymWiped = (gm.wipeoutTimer || 0) > 0;
                // Two Olympic Weightlifting Benches ("gym_bench") with animated Bodybuilders pumping 3D iron!
                for (let bi = -1; bi <= 1; bi += 2) {
                    const bx = gm.x - 8;
                    const by = gm.y + bi * 14;
                    this.batchObjectSprite3D("gym_bench", bx, by, bz + 0.018, 0, 1.02, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    if (!gymWiped) {
                        // Bodybuilder lying on bench pressing heavy barbell up & down in 3D z!
                        const liftT = 0.5 + 0.5 * Math.sin(this.time * 4.2 + gi + bi);
                        const lifterPed = bi < 0 ? "vc_bodybuilder" : "surfer_guy";
                        this.batchPedSprite3D(lifterPed, 42, bx + 2, by, bz + 0.032, 0, 1.02, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        // Animated 3D chrome barbell + cast-iron plates rising above chest (z + 0.05..0.14)
                        const barZ = bz + 0.055 + liftT * 0.085;
                        this.pushSolidQuad3D(bx + 6, by, barZ, 2.2, 19.0, 0, 0.88, 0.92, 0.96, 0.98, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.pushSolidQuad3D(bx + 6, by - 8.2, barZ + 0.004, 5.5, 3.6, 0, 0.08, 0.10, 0.15, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.pushSolidQuad3D(bx + 6, by + 8.2, barZ + 0.004, 5.5, 3.6, 0, 0.08, 0.10, 0.15, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }

                // Cyan Fitness Mats ("gym_mat_cyan") + Spotters / Calisthenics Athletes
                this.batchObjectSprite3D("gym_mat_cyan", gm.x + 16, gm.y - 11, bz + 0.016, 0, 0.98, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("gym_mat_cyan", gm.x + 16, gm.y + 11, bz + 0.016, 0, 0.98, SPRITE_DRAW_ORDER.TIRE_MARKS);
                if (!gymWiped) {
                    this.batchPedSprite3D("vc_jogger", 98, gm.x + 16, gm.y - 11, bz + 0.036, Math.PI, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("bikini_red", 98, gm.x + 16, gm.y + 11, bz + 0.036, Math.PI, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }

                // 3D Steel Pull-Up Bar Frame on North side of gym station + athlete doing pull-ups!
                const px = gm.x + 2, py = gm.y;
                for (let step = 0; step < 5; step++) {
                    const pz = bz + 0.03 + step * 0.045;
                    this.pushSolidQuad3D(px, py - 5.5, pz, 2.4, 2.4, 0, 0.78, 0.84, 0.92, 0.98, SPRITE_DRAW_ORDER.TREES);
                    this.pushSolidQuad3D(px, py + 5.5, pz, 2.4, 2.4, 0, 0.78, 0.84, 0.92, 0.98, SPRITE_DRAW_ORDER.TREES);
                }
                this.pushSolidQuad3D(px, py, bz + 0.25, 2.2, 13.0, 0, 0.94, 0.72, 0.12, 0.98, SPRITE_DRAW_ORDER.TREES);
                if (!gymWiped) {
                    const pullZ = Math.max(0, Math.sin(this.time * 3.8 + gi)) * 0.09;
                    this.batchPedSprite3D("vc_bodybuilder", 98, px, py, bz + 0.04 + pullZ, 0, 1.06, false, SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN);
                }
            }
        }

        // =========================================================================
        // 6. LEONIDA EVERGLADES & LAKE LEONIDA ALLIGATORS ("gator_3d")
        // =========================================================================
        if (Array.isArray(this.map.leonidaGators)) {
            for (let gi = 0; gi < this.map.leonidaGators.length; gi++) {
                const gt = this.map.leonidaGators[gi];
                if (gt.x < minX - 64 || gt.x > maxX + 64 || gt.y < minY - 64 || gt.y > maxY + 64) continue;
                const bz = gt.z || 2.0;
                const t = this.time * 0.85 + gt.seed;
                let gx = gt.x;
                let gy = gt.y;
                let gAng = gt.angle || 0;

                if (gt.inWater) {
                    // Slow predatory figure-8 patrol in the water with sinuous tail-sway heading
                    const rMove = 14.0;
                    const dx = Math.cos(t) * rMove;
                    const dy = Math.sin(t * 2.0) * (rMove * 0.45);
                    gx += dx;
                    gy += dy;
                    const vx = -Math.sin(t) * rMove;
                    const vy = Math.cos(t * 2.0) * (rMove * 0.9);
                    gAng = Math.atan2(vy, vx) + Math.sin(this.time * 4.5 + gi) * 0.09;
                    // Water ripple wake around swimming alligator
                    const wakeW = 36.0 + Math.sin(this.time * 3.5 + gi) * 4.0;
                    this.pushSolidQuad3D(gx, gy, bz + 0.012, wakeW, 14.0, gAng, 0.78, 0.95, 0.88, 0.34, SPRITE_DRAW_ORDER.TIRE_MARKS);
                } else {
                    // Basking alligator on bank / Port Gellhorn sidewalk (slowly turns head)
                    gAng += Math.sin(this.time * 1.4 + gi) * 0.14;
                    this.batchObjectSprite3D("gator_3d", gx + sunCos * 3.5, gy + sunSin * 3.5, bz + 0.012, gAng, 1.04, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.34);
                }
                this.batchObjectSprite3D("gator_3d", gx, gy, bz + 0.026, gAng, 1.04, SPRITE_DRAW_ORDER.PEDESTRIAN);
            }
        }

        // =========================================================================
        // 7. LEONIDA PINK FLAMINGO FLOCKS & EMERALD LILYPADS ("flamingo_pink", "lilypad_green")
        // =========================================================================
        if (Array.isArray(this.map.flamingoFlocks)) {
            for (let fi = 0; fi < this.map.flamingoFlocks.length; fi++) {
                const fl = this.map.flamingoFlocks[fi];
                if (fl.x < minX - 64 || fl.x > maxX + 64 || fl.y < minY - 64 || fl.y > maxY + 64) continue;
                const bz = fl.z || 2.0;

                // Floating emerald lotus lilypads ("lilypad_green")
                for (let li = 0; li < 4; li++) {
                    const la = li * 1.57 + fl.seed;
                    const lr = 10.0 + (li % 2) * 8.0;
                    const lx = fl.x + Math.cos(la) * lr;
                    const ly = fl.y + Math.sin(la) * lr;
                    this.batchObjectSprite3D("lilypad_green", lx, ly, bz + 0.014, la + Math.sin(this.time + li) * 0.15, 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }

                // Wading Pink Flamingos ("flamingo_pink") with water ripples & gentle head rotation
                const count = fl.count || 5;
                for (let bi = 0; bi < count; bi++) {
                    const a0 = (bi / count) * Math.PI * 2 + fl.seed;
                    const rad = (bi === 0) ? 3.0 : (11.0 + (bi % 2) * 6.5);
                    const wadeT = this.time * 1.3 + bi * 1.1 + fl.seed;
                    const fx = fl.x + Math.cos(a0) * rad + Math.sin(wadeT) * 2.2;
                    const fy = fl.y + Math.sin(a0) * rad + Math.cos(wadeT * 0.8) * 2.2;
                    const fAng = a0 + Math.sin(wadeT * 1.5) * 0.45;
                    this.pushSolidQuad3D(fx, fy, bz + 0.015, 9.5, 9.5, 0, 0.85, 0.97, 1.0, 0.28, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchObjectSprite3D("flamingo_pink", fx, fy, bz + 0.032, fAng, 1.05, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }

        // =========================================================================
        // 8. BISCAYNE BAY & ATLANTIC LUXURY SUPERYACHT PARTIES ("luxury_yacht") & JET-SKIERS ("jetski_neon")
        // =========================================================================
        if (Array.isArray(this.map.yachtParties)) {
            const yachtDancers = ["bikini_pink", "bikini_cyan", "vc_tommy", "bikini_yellow", "surfer_guy", "bikini_red"];
            for (let yi = 0; yi < this.map.yachtParties.length; yi++) {
                const yp = this.map.yachtParties[yi];
                if (yp.x < minX - 96 || yp.x > maxX + 96 || yp.y < minY - 96 || yp.y > maxY + 96) continue;
                const bz = yp.z || 2.0;
                const ang = yp.angle || 0;
                const cosA = Math.cos(ang);
                const sinA = Math.sin(ang);
                const bob = Math.sin(this.time * 1.8 + yp.seed) * 1.2;
                const yx = yp.x + cosA * bob;
                const yy = yp.y + sinA * bob;

                // Contact shadow + crisp 100% opaque base hull deck above water (3D hull & decks rendered by WorldObjectEngine)
                this.batchObjectSprite3D("luxury_yacht", yx + sunCos * 4, yy + sunSin * 4, bz + 0.014, ang, 1.0, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.34);
                this.batchObjectSprite3D("luxury_yacht", yx, yy, bz + 0.045, ang, 1.0, SPRITE_DRAW_ORDER.CAR);

                // Live DJ Turntable Booth ("dj_turntable_deck") elevated on the 3D flybridge / foredeck
                const djX = yp.x + cosA * 18.0;
                const djY = yp.y + sinA * 18.0;
                this.batchObjectSprite3D("dj_turntable_deck", djX, djY, bz + 0.44, ang, 0.82, SPRITE_DRAW_ORDER.PEDESTRIAN);

                // 6 VIP Bikini & Vice Dancers elevated on the 3D bow sun-pads (bz+0.23), 3D flybridge (bz+0.45), and 3D aft teak deck (bz+0.23)!
                const deckOffsets = [
                    { fwd: 28.0, lat: -8.5, dz: 0.23 },
                    { fwd: 28.0, lat:  8.5, dz: 0.23 },
                    { fwd:  4.0, lat: -7.5, dz: 0.45 },
                    { fwd:  4.0, lat:  7.5, dz: 0.45 },
                    { fwd: -28.0, lat: -8.5, dz: 0.23 },
                    { fwd: -28.0, lat:  8.5, dz: 0.23 }
                ];
                for (let di = 0; di < deckOffsets.length; di++) {
                    const doff = deckOffsets[di];
                    const dx = yp.x + cosA * doff.fwd - sinA * doff.lat;
                    const dy = yp.y + sinA * doff.fwd + cosA * doff.lat;
                    const dPed = yachtDancers[(yi * 3 + di) % yachtDancers.length];
                    this.batchPedSprite3D(dPed, 98, dx, dy, bz + doff.dz, ang + Math.sin(this.time * 1.8 + di) * 0.25, 1.02, false, SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN);
                }

                // 2 Floating Inflatable Neon Pink Flamingo Pool Rings ("flamingo_float") drifting beside the yacht!
                for (let fi = -1; fi <= 1; fi += 2) {
                    const fx = yx - cosA * 26.0 - sinA * (fi * 27.0) + Math.sin(this.time * 2.0 + fi + yi) * 2.5;
                    const fy = yy - sinA * 26.0 + cosA * (fi * 27.0) + Math.cos(this.time * 1.7 + fi) * 2.5;
                    this.pushSolidQuad3D(fx, fy, bz + 0.014, 22.0, 22.0, 0, 0.85, 0.98, 1.0, 0.35, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchObjectSprite3D("flamingo_float", fx, fy, bz + 0.028, this.time * 0.4 * fi + yi, 0.92, SPRITE_DRAW_ORDER.MAP_OBJECT);
                }
            }
        }

        if (Array.isArray(this.map.jetSkiers)) {
            for (let ji = 0; ji < this.map.jetSkiers.length; ji++) {
                const js = this.map.jetSkiers[ji];
                if (js._boardedVehicle && !js._boardedVehicle.destroyed) continue;
                const bz = js.z || 2.0;
                const t = this.time * (js.speed || 1.35) + js.seed;
                const jx = js.x + Math.cos(t) * js.rx;
                const jy = js.y + Math.sin(t) * js.ry;
                const vx = -Math.sin(t) * js.rx;
                const vy = Math.cos(t) * js.ry;
                const jAng = Math.atan2(vy, vx);
                js._liveX = jx;
                js._liveY = jy;
                js._liveAng = jAng;
                if (jx < minX - 96 || jx > maxX + 96 || jy < minY - 96 || jy > maxY + 96) continue;
                const cosA = Math.cos(jAng);
                const sinA = Math.sin(jAng);

                // High-speed white V-spray water wake behind jet-ski or canal speedboat
                const isBoat = Boolean(js.isSpeedboat);
                const wakeSteps = isBoat ? 4 : 3;
                for (let wk = 1; wk <= wakeSteps; wk++) {
                    const wx = jx - cosA * ((isBoat ? 18 : 10) + wk * (isBoat ? 9 : 7));
                    const wy = jy - sinA * ((isBoat ? 18 : 10) + wk * (isBoat ? 9 : 7));
                    this.pushSolidQuad3D(
                        wx,
                        wy,
                        bz + 0.014,
                        (isBoat ? 14 : 10) + wk * (isBoat ? 4 : 3),
                        (isBoat ? 10 : 6) + wk * (isBoat ? 3.2 : 2.5),
                        jAng,
                        0.90,
                        0.98,
                        1.0,
                        0.52 - wk * 0.11,
                        SPRITE_DRAW_ORDER.TIRE_MARKS
                    );
                }
                if (isBoat) {
                    this.batchObjectSprite3D("boat_speedboat", jx, jy, bz + 0.026, jAng, 0.94, SPRITE_DRAW_ORDER.CAR);
                    this.batchPedSprite3D(js.ped || "surfer_guy", 84, jx - cosA * 4.0, jy - sinA * 4.0, bz + 0.040, jAng, 0.96, false, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
                } else {
                    // Neon Vice WaveRunner ("jetski_neon") + Rider seated astride saddle (frame 84)
                    this.batchObjectSprite3D("jetski_neon", jx, jy, bz + 0.026, jAng, 1.02, SPRITE_DRAW_ORDER.CAR);
                    this.batchPedSprite3D(js.ped || "surfer_guy", 84, jx - cosA * 2.0, jy - sinA * 2.0, bz + 0.040, jAng, 1.02, false, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
                }
            }
        }

        // =========================================================================
        // 8B. OFFSHORE ATLANTIC & KEYS PARASAILING SPEEDBOATS ("parasailBoats")
        // =========================================================================
        if (Array.isArray(this.map.parasailBoats)) {
            for (let pi = 0; pi < this.map.parasailBoats.length; pi++) {
                const pb = this.map.parasailBoats[pi];
                const bz = pb.z || 2.0;
                const t = this.time * (pb.speed || 0.50) + pb.seed;
                const bx = pb.x + Math.cos(t) * pb.rx;
                const by = pb.y + Math.sin(t) * pb.ry;
                const vx = -Math.sin(t) * pb.rx;
                const vy = Math.cos(t) * pb.ry;
                const bAng = Math.atan2(vy, vx);
                if (bx < minX - 140 || bx > maxX + 140 || by < minY - 140 || by > maxY + 140) continue;
                const cosA = Math.cos(bAng);
                const sinA = Math.sin(bAng);

                // White V-spray ocean wake behind tow speedboat
                for (let wk = 1; wk <= 3; wk++) {
                    const wx = bx - cosA * (14 + wk * 9);
                    const wy = by - sinA * (14 + wk * 9);
                    this.pushSolidQuad3D(wx, wy, bz + 0.014, 14 + wk * 4, 8 + wk * 3, bAng, 0.90, 0.98, 1.0, 0.50 - wk * 0.12, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
                // Tow Speedboat ("jetski_neon" scaled up as twin-engine offshore tow craft) + Driver
                this.batchObjectSprite3D("jetski_neon", bx, by, bz + 0.028, bAng, 1.32, SPRITE_DRAW_ORDER.CAR);
                this.batchPedSprite3D("vc_crockett", 84, bx - cosA * 2.5, by - sinA * 2.5, bz + 0.042, bAng, 1.04, false, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);

                // Elevated 3D Parasail Canopy & Suspended Rider trailing 44px astern at z = 3.25!
                const sway = Math.sin(this.time * 1.6 + pi) * 6.5;
                const paraX = bx - cosA * 44.0 - sinA * sway;
                const paraY = by - sinA * 44.0 + cosA * sway;
                const paraZ = bz + 1.22 + Math.sin(this.time * 2.1 + pi) * 0.08;
                // 3D Diagonal Tow-Line Cable segments rising from boat stern to parasail harness
                for (let seg = 1; seg <= 5; seg++) {
                    const u = seg / 6;
                    const lx = bx - cosA * 8.0 + (paraX - (bx - cosA * 8.0)) * u;
                    const ly = by - sinA * 8.0 + (paraY - (by - sinA * 8.0)) * u;
                    const lz = bz + 0.05 + (paraZ - 0.12 - (bz + 0.05)) * u;
                    this.pushSolidQuad3D(lx, ly, lz, 7.5, 1.4, bAng, 0.92, 0.96, 1.0, 0.78, SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN);
                }
                // Solar shadow of parasail canopy on the water surface below
                this.pushSolidQuad3D(paraX + sunCos * 14.0, paraY + sunSin * 14.0, bz + 0.015, 22.0, 32.0, bAng, 0.02, 0.04, 0.08, 0.28, SPRITE_DRAW_ORDER.TIRE_MARKS);
                // Suspended Parasailer Ped hanging in harness below canopy
                this.batchPedSprite3D(pb.ped || "bikini_pink", 84, paraX, paraY, paraZ - 0.10, bAng, 1.04, false, SPRITE_DRAW_ORDER.HUD_ARROW);
                // Multi-panel 3D Neon Parasail Wing Canopy overhead
                const col = pb.color || [0.98, 0.28, 0.72];
                this.pushSolidQuad3D(paraX, paraY, paraZ, 18.0, 30.0, bAng, col[0], col[1], col[2], 0.96, SPRITE_DRAW_ORDER.HUD_ARROW);
                this.pushSolidQuad3D(paraX, paraY, paraZ + 0.012, 16.0, 12.0, bAng, 0.98, 0.98, 1.00, 0.96, SPRITE_DRAW_ORDER.HUD_ARROW);
                this.pushSolidQuad3D(paraX + cosA * 2.0, paraY + sinA * 2.0, paraZ + 0.020, 6.0, 26.0, bAng, 0.18, 0.92, 0.98, 0.92, SPRITE_DRAW_ORDER.HUD_ARROW);
            }
        }

        // =========================================================================
        // 9. HIGH-RISE ROOFTOP POOL PARTIES (Hotel Dixon, Ocean Drive & Penthouses at 3D Roof Elevation!)
        // =========================================================================
        if (Array.isArray(this.map.rooftopParties)) {
            const roofPeds = ["bikini_pink", "bikini_cyan", "bikini_yellow", "bikini_red", "surfer_guy"];
            for (let ri = 0; ri < this.map.rooftopParties.length; ri++) {
                const rp = this.map.rooftopParties[ri];
                if (rp.x < minX - 64 || rp.x > maxX + 64 || rp.y < minY - 64 || rp.y > maxY + 64) continue;
                const rz = rp.z || 4.0;
                const floatX = rp.x + Math.sin(this.time * 1.9 + rp.seed) * 4.5;
                const floatY = rp.y + Math.cos(this.time * 1.5 + rp.seed) * 4.5;

                // Glowing Turquoise Rooftop Pool Water Caustics & 3D Cyan Glass Balcony Guardrails (Official GTA 6 Rooftop Screenshot!)
                const shimmer = 0.28 + 0.12 * Math.sin(this.time * 3.2 + ri);
                this.pushSolidQuad3D(rp.x, rp.y, rz + 0.010, 26.0, 26.0, 0, 0.14, 0.92, 0.98, shimmer, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(rp.x + 22.0, rp.y, rz + 0.045, 2.2, 42.0, 0, 0.35, 0.92, 1.00, 0.68, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(rp.x, rp.y - 22.0, rz + 0.045, 42.0, 2.2, 0, 0.35, 0.92, 1.00, 0.68, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(rp.x, rp.y + 22.0, rz + 0.045, 42.0, 2.2, 0, 0.35, 0.92, 1.00, 0.68, SPRITE_DRAW_ORDER.MAP_OBJECT);

                // Floating Neon Pink Flamingo Ring ("flamingo_float") bobbing inside the 3D turquoise rooftop pool!
                this.batchObjectSprite3D("flamingo_float", floatX, floatY, rz + 0.022, this.time * 0.35 + ri, 0.86, SPRITE_DRAW_ORDER.MAP_OBJECT);

                // Sun loungers on the rooftop pool coping + Striped Rooftop Parasol + Penthouse DJ Booth
                this.batchObjectSprite3D("beach_lounger", rp.x - 16, rp.y - 14, rz + 0.018, 0, 0.82, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("beach_lounger", rp.x - 16, rp.y + 12, rz + 0.018, 0, 0.82, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("dj_turntable_deck", rp.x - 18, rp.y, rz + 0.032, 0, 0.78, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.batchObjectSprite3D("parasol_pink", rp.x + 14 + sunCos * 3.5, rp.y - 14 + sunSin * 3.5, rz + 0.014, 0, 0.78, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.32);
                this.batchObjectSprite3D("parasol_pink", rp.x + 14, rp.y - 14, rz + 0.095, this.time * 0.08 + ri, 0.78, SPRITE_DRAW_ORDER.TREES);

                // VIP rooftop lounger sunbather + Skyline Balcony Couple overlooking Ocean Drive / Vice City!
                const rPed = roofPeds[ri % roofPeds.length];
                this.batchPedSprite3D(rPed, 42, rp.x - 16, rp.y - 14, rz + 0.035, 0, 0.98, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                this.batchPedSprite3D("vc_tommy", 98, rp.x + 18, rp.y - 6, rz + 0.035, 0, 1.00, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                this.batchPedSprite3D("bikini_cyan", 98, rp.x + 18, rp.y + 6, rz + 0.035, 0, 1.00, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
            }
        }

        // =========================================================================
        // 10. WYNWOOD CYPHERS, OCEAN DRIVE BISTRO PATIOS, PROMENADE BENCHES & LITTLE CUBA DOMINO TABLES
        // =========================================================================
        if (Array.isArray(this.map.streetEvents)) {
            for (let ei = 0; ei < this.map.streetEvents.length; ei++) {
                const ev = this.map.streetEvents[ei];
                if (ev.x < minX - 64 || ev.x > maxX + 64 || ev.y < minY - 64 || ev.y > maxY + 64) continue;
                const bz = ev.z || 2.0;

                const evWiped = (ev.wipeoutTimer || 0) > 0;
                if (ev.kind === "WYNWOOD_CYPHER") {
                    // Vibrant Wynwood Graffiti Floor Mural ("wynwood_mural_rug") + DJ Booth ("dj_turntable_deck")
                    this.batchObjectSprite3D("wynwood_mural_rug", ev.x, ev.y, bz + 0.014, 0, 1.04, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchObjectSprite3D("dj_turntable_deck", ev.x, ev.y - 18, bz + 0.032, 0, 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    if (!evWiped) {
                        const sway = Math.sin(this.time * 2.2 + ei) * 0.14;
                        // DJ behind turntables
                        this.batchPedSprite3D("vc_haitian", 98, ev.x, ev.y - 28, bz + 0.040, Math.PI * 0.5 + sway, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        // Breakdancer grooving in center of graffiti mat
                        const spinAng = this.time * 4.2 + ei;
                        this.batchPedSprite3D("vc_cuban", Math.floor(this.time * 6.0 + ei) % 8, ev.x, ev.y + 2, bz + 0.038, spinAng, 1.26, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        // Well-spaced upright spectators on left & right
                        this.batchPedSprite3D("g2_civ_aqua", 98, ev.x - 26, ev.y + 6, bz + 0.038, sway, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("bikini_pink", 98, ev.x + 26, ev.y + 6, bz + 0.038, Math.PI - sway, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                } else if (ev.kind === "OCEAN_DRIVE_CROWD") {
                    // Ocean Drive Art Deco Sidewalk Bistro Table & Seated Patrons on 3D Chairs (table & chairs stay permanently on map!)
                    const northPeds = ["bikini_pink", "vc_crockett", "bikini_cyan", "vc_tommy"];
                    const southPeds = ["vc_tourist", "bikini_cyan", "vc_crockett", "bikini_pink"];
                    let pNorth = evWiped ? null : northPeds[ei % northPeds.length];
                    let pSouth = evWiped ? null : southPeds[ei % southPeds.length];
                    if (game && game.player && game.player.isSitting && game.player.sittingProp === ev) {
                        if (game.player.sittingSeat === 0) pNorth = null;
                        else pSouth = null;
                    }
                    this.renderBistroTableScene3D(
                        ev.x,
                        ev.y,
                        bz,
                        pNorth,
                        pSouth,
                        (ei % 2 === 0) ? "PINK" : "CYAN",
                        false
                    );
                } else if (ev.kind === "CLUB_VIP_LINE") {
                    // Velvet-rope VIP stanchions + Bouncer + Nightclub VIPs waiting in a clean single-file queue along building facade
                    this.pushSolidQuad3D(ev.x - 10, ev.y + 6, bz + 0.045, 2.4, 34.0, 0, 0.85, 0.12, 0.28, 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    for (const syOff of [-11, 6, 23]) {
                        this.pushSolidQuad3D(ev.x - 10, ev.y + syOff, bz + 0.06, 3.8, 3.8, 0, 0.96, 0.80, 0.22, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    }
                    if (!evWiped) {
                        const qSway = Math.sin(this.time * 1.4 + ei) * 0.08;
                        this.batchPedSprite3D("vc_bodybuilder", 98, ev.x, ev.y - 22, bz + 0.040, Math.PI * 0.5, 1.30, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("bikini_red", 98, ev.x - 2, ev.y - 4, bz + 0.038, -Math.PI * 0.5 + qSway, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("vc_tubbs", 98, ev.x + 2, ev.y + 13, bz + 0.038, -Math.PI * 0.5 - qSway, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("bikini_pink", 98, ev.x - 1, ev.y + 30, bz + 0.038, -Math.PI * 0.5 + qSway, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                } else if (ev.kind === "LITTLE_CUBA_CROWD") {
                    // Little Cuba Calle Ocho Sidewalk 1:1 Domino Table & Seated Guayabera Players on 3D Wooden Stools!
                    this.renderDominoTableScene3D(ev.x, ev.y, bz, evWiped);
                } else if (ev.kind === "BEACH_SOCIAL_CIRCLE") {
                    // Beach Lounge Chairs & Cooler Social Spot on Golden Sand (1:1 scale)
                    this.batchObjectSprite3D("beach_cooler", ev.x, ev.y + 2, bz + 0.026, 0.25, 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    this.batchObjectSprite3D("beach_ball", ev.x + 17, ev.y + 9, bz + 0.026, this.time * 0.3 + ei, 0.82, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    if (!evWiped) {
                        this.renderSeatedPed3D("bikini_pink", ev.x - 18.0, ev.y - 2.0, bz + 0.036, 0.15, "BISTRO_PINK", 1.0);
                        this.renderSeatedPed3D("surfer_guy", ev.x + 18.0, ev.y - 2.0, bz + 0.036, Math.PI - 0.15, "BISTRO_CYAN", 1.0);
                        this.batchPedSprite3D("bikini_cyan", 98, ev.x, ev.y - 19.0, bz + 0.038, Math.PI * 0.5 + Math.sin(this.time * 1.4 + ei) * 0.10, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                } else if (ev.kind === "BOARDWALK_IGUANA_ACT") {
                    // Official GTA 6 Vice Beach Boardwalk Screenshot: Shirtless Florida Local with Green Iguana on Shoulder + Tourists Snapping Photos!
                    if (!evWiped) {
                        const handlerAng = Math.sin(this.time * 1.2 + ei) * 0.28;
                        this.batchPedSprite3D("surfer_guy", 98, ev.x, ev.y, bz + 0.038, handlerAng, 1.28, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        // Bright Emerald-Green Leonida Iguana perched on shoulder
                        const igX = ev.x + Math.cos(handlerAng + 1.2) * 5.0;
                        const igY = ev.y + Math.sin(handlerAng + 1.2) * 5.0;
                        this.batchObjectSprite3D("gator_3d", igX, igY, bz + 0.062, handlerAng + Math.sin(this.time * 2.4 + ei) * 0.15, 0.44, SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN, 0.25, 0.96, 0.38, 0.98);
                        // Two Boardwalk Tourists standing at a natural distance admiring & snapping photos
                        this.batchPedSprite3D("vc_tourist", 98, ev.x - 18, ev.y - 11, bz + 0.038, 0.5, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("bikini_pink", 98, ev.x + 18, ev.y + 11, bz + 0.038, -2.6, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                } else if (ev.kind === "BOARDWALK_ROLLERBLADERS") {
                    // Official GTA 6 Vice Beach Boardwalk Screenshot: Neon 90s/2026 Rollerblade Duo weaving along the palm promenade!
                    if (!evWiped) {
                        const skateT = this.time * 2.1 + ei * 1.3;
                        for (let si = -1; si <= 1; si += 2) {
                            const phase = skateT + (si > 0 ? 0.65 : 0.0);
                            const sy = ev.y + Math.sin(phase) * 24.0;
                            const sx = ev.x + si * 8.5 + Math.cos(phase * 2.0) * 4.5;
                            const vy = Math.cos(phase) * 24.0;
                            const vx = -Math.sin(phase * 2.0) * 9.0;
                            const sAng = Math.atan2(vy, vx);
                            const sFr = Math.floor(this.time * 8.0 + si + ei) % 8;
                            // Neon pink/cyan rollerblade wheel glow under feet + skater ped
                            this.pushSolidQuad3D(sx, sy, bz + 0.018, 9.5, 6.0, sAng, si < 0 ? 0.98 : 0.18, si < 0 ? 0.28 : 0.92, 0.96, 0.72, SPRITE_DRAW_ORDER.TIRE_MARKS);
                            this.batchPedSprite3D(si < 0 ? "bikini_pink" : "vc_jogger", sFr, sx, sy, bz + 0.040, sAng, 1.26, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        }
                    }
                } else if (ev.kind === "BOARDWALK_BUSKER") {
                    // Vice Beach Boardwalk Street Musician / Busker tucked along the West grass edge with Open Guitar Case, Boombox & Listeners
                    this.batchObjectSprite3D("beach_boombox", ev.x - 10, ev.y - 9, bz + 0.026, 0.3, 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    // Open velvet-lined guitar case with green dollar bills on the pavement
                    this.pushSolidQuad3D(ev.x + 6, ev.y - 5, bz + 0.018, 9.5, 6.0, 0.2, 0.14, 0.16, 0.22, 0.96, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(ev.x + 6, ev.y - 5, bz + 0.022, 7.0, 4.0, 0.2, 0.22, 0.88, 0.44, 0.96, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    if (!evWiped) {
                        const buskSway = Math.sin(this.time * 2.8 + ei) * 0.16;
                        this.batchPedSprite3D("vc_hawaiian_red", 98, ev.x - 2, ev.y - 16, bz + 0.038, Math.PI * 0.5 + buskSway, 1.26, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("bikini_cyan", 98, ev.x + 12, ev.y + 10, bz + 0.038, -Math.PI * 0.65 - buskSway * 0.4, 1.24, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                } else {
                    // Lummus Park & Oceanfront Boardwalk 1:1 Scale 3D Wooden-Slat Promenade Bench (permanent map furniture — never disappears!)
                    const benchPairs = [
                        ["bikini_pink", "vc_crockett"],
                        ["vc_tourist", "bikini_cyan"],
                        ["vc_tommy", null],
                        ["g2_civ_aqua", "bikini_red"],
                        [null, "bikini_yellow"]
                    ];
                    const pair = benchPairs[ei % benchPairs.length];
                    const benchAng = ev.ang !== undefined ? ev.ang : ((ev.x < 450 * TILE_SIZE) ? Math.PI : 0);
                    let pA = evWiped ? null : pair[0];
                    let pB = evWiped ? null : pair[1];
                    if (game && game.player && game.player.isSitting && game.player.sittingProp === ev) {
                        if (game.player.sittingSeat === 0) pA = null;
                        else pB = null;
                    }
                    this.renderParkBenchScene3D(ev.x, ev.y, bz, benchAng, pA, pB);
                }
            }
        }

        // =========================================================================
        // 11. MOUNT KALAGA WILDERNESS CAMPSITES, GOLF GREENS & MAMBAS STADIUM SCRIMMAGE
        // =========================================================================
        if (Array.isArray(this.map.wildernessCamps)) {
            for (let ci = 0; ci < this.map.wildernessCamps.length; ci++) {
                const cp = this.map.wildernessCamps[ci];
                if (cp.x < minX - 64 || cp.x > maxX + 64 || cp.y < minY - 64 || cp.y > maxY + 64) continue;
                const bz = cp.z || 2.0;

                // Dome Tents ("camp_tent_green", "camp_tent_orange") + Stone Campfire Ring ("campfire_ring") + Cooler
                this.batchObjectSprite3D(ci % 2 === 0 ? "camp_tent_green" : "camp_tent_orange", cp.x - 18, cp.y - 10, bz + 0.025, 0.3, 1.05, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.batchObjectSprite3D(ci % 2 === 0 ? "camp_tent_orange" : "camp_tent_green", cp.x + 18, cp.y - 8, bz + 0.025, -0.35, 1.02, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.batchObjectSprite3D("campfire_ring", cp.x, cp.y + 8, bz + 0.020, 0, 1.0, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("beach_cooler", cp.x - 16, cp.y + 12, bz + 0.028, 0.2, 0.92, SPRITE_DRAW_ORDER.MAP_OBJECT);

                // Live flickering 3D campfire flame (sprites 234..241) inside the stone ring!
                const fireFr = 234 + (Math.floor(this.time * 12 + ci * 3) % 8);
                this.batchObjectSprite3D(String(fireFr), cp.x, cp.y + 8, bz + 0.045, 0, 0.68, SPRITE_DRAW_ORDER.EXPLOSION);

                if (!((cp.wipeoutTimer || 0) > 0)) {
                    // Campers seated on wooden camp stools warming by the campfire
                    this.renderSeatedPed3D("g2_redneck_blond", cp.x + 18, cp.y + 9, bz + 0.036, Math.PI, "STOOL_WOOD", 1.0);
                    this.renderSeatedPed3D("vc_tourist", cp.x - 1, cp.y + 26, bz + 0.036, -Math.PI * 0.5, "STOOL_WOOD", 1.0);
                }
            }
        }

        if (Array.isArray(this.map.golfGreens)) {
            for (let gi = 0; gi < this.map.golfGreens.length; gi++) {
                const gg = this.map.golfGreens[gi];
                if (gg.x < minX - 64 || gg.x > maxX + 64 || gg.y < minY - 64 || gg.y > maxY + 64) continue;
                const bz = gg.z || 2.0;

                // Manicured Putting Green & Sand Bunker ("golf_green_pin")
                this.batchObjectSprite3D("golf_green_pin", gg.x, gg.y, bz + 0.015, 0, 1.15, SPRITE_DRAW_ORDER.TIRE_MARKS);
                // 3D Vertical White Flagstick & Fluttering Red Pennant in z!
                for (let s = 0; s < 5; s++) {
                    this.pushSolidQuad3D(gg.x, gg.y, bz + 0.025 + s * 0.045, 1.8, 1.8, 0, 0.96, 0.98, 1.0, 0.98, SPRITE_DRAW_ORDER.TREES);
                }
                const flagWave = Math.sin(this.time * 5.0 + gi) * 0.25;
                this.pushSolidQuad3D(gg.x + 4.5, gg.y + flagWave, bz + 0.24, 8.5, 4.5, flagWave * 0.4, 0.96, 0.18, 0.24, 0.98, SPRITE_DRAW_ORDER.HUD_ARROW);

                if (!((gg.wipeoutTimer || 0) > 0)) {
                    // Golfer putting + rolling white golf ball toward the cup!
                    const puttProg = (this.time * 0.65 + gi * 0.4) % 1.0;
                    const ballX = gg.x - 14.0 * (1.0 - puttProg);
                    const ballY = gg.y + 6.0 * (1.0 - puttProg);
                    this.pushSolidQuad3D(ballX, ballY, bz + 0.024, 2.6, 2.6, 0, 1.0, 1.0, 1.0, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    this.batchPedSprite3D("vc_crockett", puttProg < 0.22 ? 0 : 98, gg.x - 18, gg.y + 8, bz + 0.038, -0.35, 1.05, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }

        // Mambas Stadium Live Pitch Scrimmage (inside the emerald stadium bowl at c=112..119, r=99..105)
        if (this.map.stadiumScrimmage) {
            const sc = this.map.stadiumScrimmage;
            if (sc.x >= minX - 240 && sc.x <= maxX + 240 && sc.y >= minY - 240 && sc.y <= maxY + 240) {
                const bz = sc.z || 2.0;
                const matchT = this.time * 1.4;
                const playCycle = (matchT % (Math.PI * 2));
                const ballFlight = (this.time * 0.9) % 1.0;

                // 2 Teams of 4 Athletes sprinting across the Mambas Stadium emerald pitch!
                for (let ti = 0; ti < 8; ti++) {
                    const isHome = ti < 4;
                    const idx = ti % 4;
                    const baseX = sc.x + (isHome ? -55 : 55) + (idx % 2) * 24 + Math.sin(matchT + ti) * 28;
                    const baseY = sc.y + (idx - 1.5) * 34 + Math.cos(matchT * 0.8 + ti) * 18;
                    const pAng = (isHome ? 0 : Math.PI) + Math.sin(matchT + ti) * 0.35;
                    const runFr = Math.floor(this.time * 8.5 + ti * 2) % 8;
                    this.batchPedSprite3D(isHome ? "vc_jogger" : "g2_civ_aqua", runFr, baseX, baseY, bz + 0.038, pAng, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
                // Arcing 3D Football / Soccer Ball + Ground Shadow
                const bx0 = sc.x - 65 + Math.sin(playCycle) * 40;
                const bx1 = sc.x + 65 + Math.cos(playCycle) * 40;
                const by0 = sc.y - 35 * Math.cos(playCycle);
                const by1 = sc.y + 35 * Math.sin(playCycle);
                const ballX = bx0 + (bx1 - bx0) * ballFlight;
                const ballY = by0 + (by1 - by0) * ballFlight;
                const ballZ = Math.sin(ballFlight * Math.PI) * 0.38;
                this.pushSolidQuad3D(ballX + sunCos * 7, ballY + sunSin * 7, bz + 0.018, 6.0, 6.0, 0, 0.02, 0.03, 0.06, 0.35, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("beach_ball", ballX, ballY, bz + 0.06 + ballZ, this.time * 6.0, 0.80 + ballZ * 0.3, SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 9) VCIA Airport, SERA Spaceport, Star Island & Vice Port Aviation Props (Airliners, Learjets & Spinning-Rotor Helicopters)
        const airProps = this.map.airportProps;
        if (airProps && airProps.length > 0) {
            for (let i = 0; i < airProps.length; i++) {
                const ap = airProps[i];
                if (ap.x < minX - 180 || ap.x > maxX + 180 || ap.y < minY - 180 || ap.y > maxY + 180) continue;
                const bz = ap.z || 2.0;
                const cs = Math.cos(ap.ang);
                const sn = Math.sin(ap.ang);
                if (ap.kind === "AIRLINER") {
                    this.batchObjectSprite3D("airliner_jet", ap.x + sunCos * 7, ap.y + sunSin * 7, bz + 0.015, ap.ang, ap.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.36);
                    this.batchObjectSprite3D("airliner_jet", ap.x, ap.y, bz + 0.075, ap.ang, ap.scale, SPRITE_DRAW_ORDER.CAR);
                    // Blinking FAA wingtip & tail anti-collision strobe lights
                    const strobeOn = Math.sin(this.time * 5.5 + ap.seed) > 0.35;
                    if (strobeOn) {
                        const wxL = ap.x - cs * 18 + sn * 56, wyL = ap.y - sn * 18 - cs * 56;
                        const wxR = ap.x - cs * 18 - sn * 56, wyR = ap.y - sn * 18 + cs * 56;
                        this.pushSolidQuad3D(wxL, wyL, bz + 0.09, 6, 6, 0, 1.0, 0.18, 0.18, 0.85, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                        this.pushSolidQuad3D(wxR, wyR, bz + 0.09, 6, 6, 0, 0.15, 0.95, 0.38, 0.85, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                    }
                    this.batchPedSprite3D("g2_fireman", Math.floor(this.time * 3 + i) % 8, ap.x + cs * 76 - sn * 28, ap.y + sn * 76 + cs * 28, bz + 0.038, ap.ang + Math.PI, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                } else if (ap.kind === "LEARJET") {
                    this.batchObjectSprite3D("private_learjet", ap.x + sunCos * 6, ap.y + sunSin * 6, bz + 0.015, ap.ang, ap.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.35);
                    this.batchObjectSprite3D("private_learjet", ap.x, ap.y, bz + 0.065, ap.ang, ap.scale, SPRITE_DRAW_ORDER.CAR);
                    this.batchPedSprite3D("g2_zaibatsu", 0, ap.x + cs * 38 + sn * 24, ap.y + sn * 38 - cs * 24, bz + 0.038, ap.ang - 0.5, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                } else if (ap.kind === "HELIPAD") {
                    if (!ap.isRooftop) {
                        this.batchObjectSprite3D("helipad_mark", ap.x, ap.y, bz + 0.016, 0, 1.18, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                    this.batchObjectSprite3D("heli_vice", ap.x + sunCos * 5, ap.y + sunSin * 5, bz + 0.022, ap.ang, ap.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.35);
                    this.batchObjectSprite3D("heli_vice", ap.x, ap.y, bz + 0.065, ap.ang, ap.scale, SPRITE_DRAW_ORDER.CAR);
                    // Authentic 1997 GTA 1 3ds Max 8-frame motion-blurred spinning main rotor (#540..#547)
                    const rotSpr = String(540 + (Math.floor(this.time * 24.0 + i * 3) % 8));
                    this.batchObjectSprite3D(rotSpr, ap.x + cs * 6 * ap.scale, ap.y + sn * 6 * ap.scale, bz + 0.125, ap.ang, ap.scale * 0.72, SPRITE_DRAW_ORDER.TREES);
                }
            }
        }

        // 10) Leonida State Penitentiary & VCIA International Airport 3D Chain-Link Security Fences, Razor Wire, Checkpoints & Searchlights
        const drawSecurityFenceSpan = (xA, yA, xB, yB, bz = 2.0, isPrison = false) => {
            if (Math.max(xA, xB) < minX - 60 || Math.min(xA, xB) > maxX + 60 || Math.max(yA, yB) < minY - 60 || Math.min(yA, yB) > maxY + 60) return;
            const dx = xB - xA, dy = yB - yA;
            const len = Math.hypot(dx, dy);
            const ang = Math.atan2(dy, dx);
            const cx = (xA + xB) * 0.5, cy = (yA + yB) * 0.5;
            // Ground shadow + dark concrete security curb + galvanized chain-link mesh + upper concertina razor-wire coil
            this.pushSolidQuad3D(cx + sunCos * 5, cy + sunSin * 5, bz + 0.015, len, isPrison ? 6.0 : 4.2, ang, 0.02, 0.03, 0.05, 0.42, SPRITE_DRAW_ORDER.TIRE_MARKS);
            this.pushSolidQuad3D(cx, cy, bz + 0.035, len, isPrison ? 6.8 : 4.6, ang, 0.18, 0.21, 0.26, 0.96, SPRITE_DRAW_ORDER.MAP_OBJECT);
            this.pushSolidQuad3D(cx, cy, bz + 0.11,  len, isPrison ? 4.2 : 3.2, ang, 0.42, 0.46, 0.52, 0.94, SPRITE_DRAW_ORDER.CAR);
            this.pushSolidQuad3D(cx, cy, bz + 0.20,  len, isPrison ? 3.4 : 2.6, ang, 0.68, 0.72, 0.78, 0.96, SPRITE_DRAW_ORDER.TREES);
            this.pushSolidQuad3D(cx, cy, bz + 0.28,  len, isPrison ? 5.2 : 4.2, ang, 0.88, 0.91, 0.96, 0.92, SPRITE_DRAW_ORDER.TREES);
            const stepDist = isPrison ? 28 : 36;
            const steps = Math.max(2, Math.floor(len / stepDist));
            for (let s = 0; s <= steps; s++) {
                const px = xA + (dx * s) / steps;
                const py = yA + (dy * s) / steps;
                if (px < minX - 32 || px > maxX + 32 || py < minY - 32 || py > maxY + 32) continue;
                this.pushSolidQuad3D(px, py, bz + 0.18, isPrison ? 6.4 : 5.2, isPrison ? 6.4 : 5.2, 0, 0.22, 0.26, 0.32, 0.99, SPRITE_DRAW_ORDER.TREES);
                if (isPrison && s % 2 === 0) {
                    this.pushSolidQuad3D(px, py, bz + 0.30, 3.6, 3.6, 0.785, 0.95, 0.75, 0.15, 0.95, SPRITE_DRAW_ORDER.TREES);
                }
            }
        };

        const pris = this.map.prisonCompound;
        if (pris && pris.x1 >= minX - 140 && pris.x0 <= maxX + 140 && pris.y1 >= minY - 140 && pris.y0 <= maxY + 140) {
            const bz = pris.z || 2.0;
            const pScale = 1.34;

            // 10.1 Dark Gunmetal No-Man's-Land Security Strip between the Inner & Outer Perimeter Fences (West, East & South)
            const stripW = pris.x1 - pris.inX1;
            const totalH = pris.y1 - pris.y0;
            const midStripY = (pris.y0 + pris.y1) * 0.5;
            this.pushSolidQuad3D((pris.inX1 + pris.x1) * 0.5, midStripY, bz + 0.012, stripW, totalH, 0, 0.16, 0.19, 0.24, 0.88, SPRITE_DRAW_ORDER.TIRE_MARKS);
            this.pushSolidQuad3D((pris.x0 + pris.inX0) * 0.5, midStripY, bz + 0.012, stripW, totalH, 0, 0.16, 0.19, 0.24, 0.88, SPRITE_DRAW_ORDER.TIRE_MARKS);
            this.pushSolidQuad3D((pris.x0 + pris.x1) * 0.5, (pris.inY1 + pris.y1) * 0.5, bz + 0.012, pris.x1 - pris.x0, pris.y1 - pris.inY1, 0, 0.16, 0.19, 0.24, 0.88, SPRITE_DRAW_ORDER.TIRE_MARKS);

            // 10.2 Double-Row 3D Chain-Link & Concertina Razor-Wire Perimeter Fences
            if (Array.isArray(pris.spans)) {
                for (let si = 0; si < pris.spans.length; si++) {
                    const sp = pris.spans[si];
                    drawSecurityFenceSpan(sp.xA, sp.yA, sp.xB, sp.yB, bz, true);
                }
            }

            // 10.3 3D Sally-Port Gatehouses & Heavy Steel-Bar Vehicle Barriers (North Main Gate & Internal Yard Checkpoint)
            if (Array.isArray(pris.gates)) {
                for (let gi = 0; gi < pris.gates.length; gi++) {
                    const gt = pris.gates[gi];
                    if (gt.x < minX - 180 || gt.x > maxX + 180 || gt.y < minY - 180 || gt.y > maxY + 180) continue;
                    // Yellow & Black Hazard Security Stripes across the gate threshold
                    this.pushSolidQuad3D(gt.x, gt.y, bz + 0.018, gt.w, 16, 0, 0.14, 0.16, 0.20, 0.96, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    const nStripes = Math.floor(gt.w / 18);
                    for (let st = 0; st < nStripes; st++) {
                        const sx = gt.x - gt.w * 0.5 + 9 + st * 18;
                        this.pushSolidQuad3D(sx, gt.y, bz + 0.022, 9, 12, 0.35, 0.96, 0.76, 0.12, 0.94, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                    // Vertical Steel Bars blocking vehicles across gate threshold (3D overhead portal & booth rendered in WorldObjectEngine)
                    const nBars = Math.floor(gt.w / 14);
                    for (let bi = 0; bi <= nBars; bi++) {
                        const bx = gt.x - gt.w * 0.5 + (gt.w * bi) / nBars;
                        this.pushSolidQuad3D(bx, gt.y, bz + 0.16, 4.2, 6.5, 0, 0.30, 0.35, 0.42, 0.98, SPRITE_DRAW_ORDER.CAR);
                    }
                    // Flashing red/blue strobe & armed SWAT/police gate sentries beside 3D sally-port guardhouse
                    if (gt.boothX && gt.boothY) {
                        const beaconOn = Math.sin(this.time * 9.0 + gi * 1.7) >= 0;
                        this.pushSolidQuad3D(gt.boothX, gt.boothY, bz + 0.50, 7, 7, 0, beaconOn ? 1.0 : 0.2, beaconOn ? 0.15 : 0.65, beaconOn ? 0.15 : 1.0, 0.98, SPRITE_DRAW_ORDER.HUD_ARROW);
                        this.batchPedSprite3D("g2_swat", 0, gt.boothX + 24, gt.boothY + 12, bz + 0.04, Math.PI * 0.5, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        this.batchPedSprite3D("police", 0, gt.x + gt.w * 0.5 + 16, gt.y + 14, bz + 0.04, -Math.PI * 0.5, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }
            }

            // 10.4 Armed Tower Snipers & Rotating Searchlight Cones atop 8 3D Concrete Guard Watchtowers (3D towers rendered in WorldObjectEngine)
            for (let ti = 0; ti < pris.towers.length; ti++) {
                const tw = pris.towers[ti];
                if (tw.x >= minX - 180 && tw.x <= maxX + 180 && tw.y >= minY - 180 && tw.y <= maxY + 180) {
                    const sAng = tw.baseAng + Math.sin(this.time * 1.15 + ti * 1.4) * 0.65;
                    this.batchPedSprite3D("g2_swat", 0, tw.x, tw.y, bz + 0.86, sAng, 1.18, false, SPRITE_DRAW_ORDER.HUD_ARROW);
                }
            }

            // 10.5 Outdoor Prison Weightlifting Benches ("gym_bench") & Lifters in Central Plaza (r=97..101) & Upper Exercise Lawn (r=108..114)
            const prisonGymBenches = [
                { x: 58.6 * TILE_SIZE, y: 99.2 * TILE_SIZE,  ang: 0 },
                { x: 65.4 * TILE_SIZE, y: 99.2 * TILE_SIZE,  ang: Math.PI },
                { x: 59.2 * TILE_SIZE, y: 109.5 * TILE_SIZE, ang: 0 },
                { x: 62.0 * TILE_SIZE, y: 109.5 * TILE_SIZE, ang: 0 },
                { x: 64.8 * TILE_SIZE, y: 109.5 * TILE_SIZE, ang: 0 },
                { x: 60.5 * TILE_SIZE, y: 113.5 * TILE_SIZE, ang: Math.PI },
                { x: 63.5 * TILE_SIZE, y: 113.5 * TILE_SIZE, ang: Math.PI }
            ];
            for (let bi = 0; bi < prisonGymBenches.length; bi++) {
                const gb = prisonGymBenches[bi];
                if (gb.x < minX - 64 || gb.x > maxX + 64 || gb.y < minY - 64 || gb.y > maxY + 64) continue;
                this.batchObjectSprite3D("gym_bench", gb.x, gb.y, bz + 0.022, gb.ang, 1.15, SPRITE_DRAW_ORDER.MAP_OBJECT);
                // Prisoner lying on bench pressing barbell + upright spotter in bright orange jumpsuit!
                this.batchPedSprite3D("g2_prisoner", 42, gb.x, gb.y, bz + 0.036, gb.ang, pScale * 0.95, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                this.batchPedSprite3D("g2_prisoner", 98, gb.x + Math.cos(gb.ang) * 20, gb.y + Math.sin(gb.ang) * 20, bz + 0.038, gb.ang + Math.PI, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
            }

            // 10.6 Orange-Jumpsuit Prisoners ("g2_prisoner") across North Cellblock Walkways (r=80..95), Central Roll-Call Plaza (r=96..102) & Upper Exercise Lawn (r=105..115)
            const yardGroups = [
                // North Reception & Cellblock Walkways (r = 79..94)
                { x: 58.5 * TILE_SIZE, y: 81.0 * TILE_SIZE, rx: 18, ry: 36, spd: 1.1, seed: 0.4 },
                { x: 65.5 * TILE_SIZE, y: 81.0 * TILE_SIZE, rx: 18, ry: 36, spd: 1.2, seed: 1.7 },
                { x: 58.3 * TILE_SIZE, y: 89.5 * TILE_SIZE, rx: 14, ry: 48, spd: 1.0, seed: 2.9 },
                { x: 65.7 * TILE_SIZE, y: 89.5 * TILE_SIZE, rx: 14, ry: 48, spd: 1.1, seed: 4.1 },
                // Central Roll-Call Plaza (r = 96.5..102.0 — directly visible in upper yard!)
                { x: 60.2 * TILE_SIZE, y: 97.5 * TILE_SIZE, rx: 32, ry: 14, spd: 1.3, seed: 0.8 },
                { x: 63.8 * TILE_SIZE, y: 97.5 * TILE_SIZE, rx: 32, ry: 14, spd: 1.2, seed: 2.2 },
                { x: 61.0 * TILE_SIZE, y: 101.2 * TILE_SIZE, rx: 36, ry: 12, spd: 1.1, seed: 3.5 },
                { x: 64.2 * TILE_SIZE, y: 101.2 * TILE_SIZE, rx: 36, ry: 12, spd: 1.4, seed: 5.0 },
                // Upper-Middle Grass Exercise Lawn (r = 105.5..115.0 — directly visible in middle yard!)
                { x: 58.8 * TILE_SIZE, y: 106.5 * TILE_SIZE, rx: 28, ry: 22, spd: 1.2, seed: 1.1 },
                { x: 65.8 * TILE_SIZE, y: 106.5 * TILE_SIZE, rx: 28, ry: 22, spd: 1.3, seed: 2.6 },
                { x: 58.6 * TILE_SIZE, y: 112.0 * TILE_SIZE, rx: 24, ry: 34, spd: 1.1, seed: 3.9 },
                { x: 66.0 * TILE_SIZE, y: 112.0 * TILE_SIZE, rx: 24, ry: 34, spd: 1.2, seed: 5.4 }
            ];
            for (let yi = 0; yi < yardGroups.length; yi++) {
                const yg = yardGroups[yi];
                const t = this.time * yg.spd + yg.seed;
                const px = yg.x + Math.cos(t) * yg.rx;
                const py = yg.y + Math.sin(t) * yg.ry;
                if (px < minX - 48 || px > maxX + 48 || py < minY - 48 || py > maxY + 48) continue;
                const vx = -Math.sin(t) * yg.rx;
                const vy = Math.cos(t) * yg.ry;
                const pAng = Math.atan2(vy, vx);
                const fr = Math.floor(this.time * 6.5 + yi * 3) % 8;
                this.batchPedSprite3D("g2_prisoner", fr, px, py, bz + 0.038, pAng, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
            }

            // 10.7 Central Concrete Basketball Court (c=59..64, r=117..130): Painted Court Lines, 3D Hoops, Arcing Basketball & 8 Orange-Jumpsuit Players
            const cx = pris.courtX, cy = pris.courtY;
            if (cx >= minX - 240 && cx <= maxX + 240 && cy >= minY - 280 && cy <= maxY + 280) {
                // Crisp painted white court boundary lines, center line & orange key paint
                this.pushSolidQuad3D(cx, cy, bz + 0.012, 168, 256, 0, 0.22, 0.26, 0.32, 0.85, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(cx, cy, bz + 0.015, 156, 244, 0, 0.34, 0.38, 0.44, 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(cx, cy - 92, bz + 0.018, 56, 52, 0, 0.88, 0.38, 0.12, 0.82, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(cx, cy + 92, bz + 0.018, 56, 52, 0, 0.88, 0.38, 0.12, 0.82, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(cx, cy, bz + 0.018, 156, 3, 0, 0.95, 0.96, 0.98, 0.90, SPRITE_DRAW_ORDER.TIRE_MARKS);
                // North & South 3D Basketball Backboards + Orange Hoops
                this.pushSolidQuad3D(cx, cy - 116, bz + 0.18, 26, 4.5, 0, 0.96, 0.97, 0.99, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(cx, cy - 110, bz + 0.15, 9, 9, 0, 0.98, 0.42, 0.08, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(cx, cy + 116, bz + 0.18, 26, 4.5, 0, 0.96, 0.97, 0.99, 0.98, SPRITE_DRAW_ORDER.TREES);
                this.pushSolidQuad3D(cx, cy + 110, bz + 0.15, 9, 9, 0, 0.98, 0.42, 0.08, 0.98, SPRITE_DRAW_ORDER.TREES);
                // Animated 3D Orange Basketball arcing toward the hoops!
                const ballPh = (this.time * 0.95) % 2.0;
                const ballT = ballPh < 1.0 ? ballPh : (2.0 - ballPh);
                const ballX = cx + Math.sin(this.time * 1.9) * 18;
                const ballY = (cy - 106) + ballT * 212;
                const ballZ = bz + 0.06 + Math.sin(ballT * Math.PI) * 0.24;
                this.pushSolidQuad3D(ballX, ballY, bz + 0.02, 6, 6, 0, 0.02, 0.03, 0.06, 0.38, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(ballX, ballY, ballZ, 7.5, 7.5, this.time * 4.0, 0.98, 0.45, 0.08, 0.99, SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN);

                for (let pi = 0; pi < 8; pi++) {
                    const isCourt = pi < 6;
                    const px = isCourt
                        ? cx + ((pi % 2 === 0) ? -32 : 32) + Math.sin(this.time * 2.3 + pi) * 20
                        : cx + ((pi % 2 === 0) ? -102 : 102);
                    const py = isCourt
                        ? cy + (pi - 2.5) * 34 + Math.cos(this.time * 2.0 + pi) * 22
                        : cy + (pi - 6.5) * 48;
                    const pAng = Math.atan2(ballY - py, ballX - px);
                    const fr = isCourt ? (Math.floor(this.time * 7.0 + pi * 2) % 8) : 98;
                    this.batchPedSprite3D("g2_prisoner", fr, px, py, bz + 0.038, pAng, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }

            // 10.8 South Yard Fight Ring (c=61.5, r=141.5): 2 Prisoners Brawling surrounded by Cheering Orange-Jumpsuit Inmates
            const fightX = 62.0 * TILE_SIZE, fightY = 141.5 * TILE_SIZE;
            if (fightX >= minX - 160 && fightX <= maxX + 160 && fightY >= minY - 160 && fightY <= maxY + 160) {
                const fAng = this.time * 2.4;
                const fFr = 50 + (Math.floor(this.time * 8.0) % 4);
                this.batchPedSprite3D("g2_prisoner", fFr, fightX + Math.cos(fAng) * 11, fightY + Math.sin(fAng) * 11, bz + 0.038, fAng + Math.PI, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                this.batchPedSprite3D("g2_prisoner", fFr, fightX - Math.cos(fAng) * 11, fightY - Math.sin(fAng) * 11, bz + 0.038, fAng, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                for (let ci = 0; ci < 6; ci++) {
                    const ca = (ci / 6) * Math.PI * 2 + 0.2;
                    this.batchPedSprite3D("g2_prisoner", 98, fightX + Math.cos(ca) * 36, fightY + Math.sin(ca) * 36, bz + 0.038, ca + Math.PI, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }

            // 10.9 Armed Correctional Officers ("police" & "g2_swat") patrolling inside the prison yard
            const guardPatrols = [
                { x: 66.8 * TILE_SIZE, y: 96.5 * TILE_SIZE,  dx: 0,  dy: 45, seed: 0.3 },
                { x: 57.6 * TILE_SIZE, y: 103.5 * TILE_SIZE, dx: 35, dy: 0,  seed: 1.6 },
                { x: 66.8 * TILE_SIZE, y: 112.0 * TILE_SIZE, dx: 0,  dy: 55, seed: 2.9 },
                { x: 57.8 * TILE_SIZE, y: 124.0 * TILE_SIZE, dx: 0,  dy: 55, seed: 4.2 },
                { x: 66.5 * TILE_SIZE, y: 138.0 * TILE_SIZE, dx: 0,  dy: 45, seed: 5.5 }
            ];
            for (let gi = 0; gi < guardPatrols.length; gi++) {
                const gp = guardPatrols[gi];
                const ph = Math.sin(this.time * 0.95 + gp.seed);
                const gx = gp.x + gp.dx * ph;
                const gy = gp.y + gp.dy * ph;
                if (gx < minX - 48 || gx > maxX + 48 || gy < minY - 48 || gy > maxY + 48) continue;
                const dirSign = Math.cos(this.time * 0.95 + gp.seed) >= 0 ? 1 : -1;
                const gAng = Math.atan2(gp.dy * dirSign, gp.dx * dirSign);
                this.batchPedSprite3D((gi % 2 === 0) ? "police" : "g2_swat", Math.floor(this.time * 4.8 + gi) % 8, gx, gy, bz + 0.038, gAng, pScale, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
            }
        }

        // 10B) VCIA International Airport 3D Perimeter Security Fence, Guardhouse Booths, Boom Barriers & Armed Airport Police
        const airComp = this.map.airportCompound;
        if (airComp && airComp.x1 >= minX - 120 && airComp.x0 <= maxX + 120 && airComp.y1 >= minY - 120 && airComp.y0 <= maxY + 120) {
            const bz = airComp.z || 2.0;
            if (Array.isArray(airComp.spans)) {
                for (let si = 0; si < airComp.spans.length; si++) {
                    const sp = airComp.spans[si];
                    drawSecurityFenceSpan(sp.xA, sp.yA, sp.xB, sp.yB, bz);
                }
            }
            if (Array.isArray(airComp.gates)) {
                for (let gi = 0; gi < airComp.gates.length; gi++) {
                    const gt = airComp.gates[gi];
                    if (gt.x < minX - 220 || gt.x > maxX + 220 || gt.y < minY - 220 || gt.y > maxY + 220) continue;
                    const halfW = gt.w * 0.5;
                    // Yellow & black hazard stop stripe across the road checkpoint
                    this.pushSolidQuad3D(gt.x, gt.y, bz + 0.016, gt.w - 8, 6.0, 0, 0.98, 0.80, 0.12, 0.88, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    // Left & Right 3D Security Gate Pillars with flashing amber/red warning beacons
                    for (const side of [-1, 1]) {
                        const px = gt.x + side * (halfW - 4);
                        const py = gt.y;
                        this.pushSolidQuad3D(px + sunCos * 4, py + sunSin * 4, bz + 0.015, 11, 11, 0, 0.02, 0.03, 0.05, 0.38, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushSolidQuad3D(px, py, bz + 0.10, 9.5, 9.5, 0, 0.22, 0.26, 0.32, 0.98, SPRITE_DRAW_ORDER.CAR);
                        this.pushSolidQuad3D(px, py, bz + 0.22, 7.5, 7.5, 0, 0.92, 0.72, 0.14, 0.98, SPRITE_DRAW_ORDER.TREES);
                        const beaconOn = Math.sin(this.time * 6.5 + gi * 1.7 + side) > 0.0;
                        if (beaconOn) {
                            this.pushSolidQuad3D(px, py, bz + 0.26, 5.5, 5.5, 0, 1.0, 0.22, 0.16, 0.92, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                        }
                        // Red & white striped security boom barrier arm extending from each pillar
                        const armLen = halfW * 0.44;
                        const armCx = px - side * (armLen * 0.5 + 3);
                        this.pushSolidQuad3D(armCx, py, bz + 0.14, armLen, 3.4, 0, 0.95, 0.18, 0.18, 0.96, SPRITE_DRAW_ORDER.TREES);
                        this.pushSolidQuad3D(armCx, py, bz + 0.145, armLen * 0.45, 3.4, 0, 0.98, 0.98, 1.0, 0.96, SPRITE_DRAW_ORDER.TREES);
                    }
                    // 3D Airport Security Guardhouse Booth shadow (true 3D mesh rendered by WorldObjectEngine)
                    const bx = gt.boothX, by = gt.boothY;
                    this.pushSolidQuad3D(bx + sunCos * 6, by + sunSin * 6, bz + 0.015, 28, 22, 0, 0.02, 0.03, 0.06, 0.38, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }
            if (Array.isArray(airComp.patrolGuards)) {
                for (let pi = 0; pi < airComp.patrolGuards.length; pi++) {
                    const pg = airComp.patrolGuards[pi];
                    const osc = Math.sin(this.time * 1.1 + pg.seed);
                    const gx = pg.x + pg.dx * osc;
                    const gy = pg.y + pg.dy * osc;
                    if (gx < minX - 80 || gx > maxX + 80 || gy < minY - 80 || gy > maxY + 80) continue;
                    const gAng = Math.atan2(pg.dy * Math.cos(this.time * 1.1 + pg.seed), pg.dx * Math.cos(this.time * 1.1 + pg.seed) || 0.01);
                    const fr = Math.floor(this.time * 5.0 + pi * 2) % 8;
                    this.batchPedSprite3D(pi % 2 === 0 ? "police" : "g2_swat", fr, gx, gy, bz + 0.038, gAng, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }

        // 10C) SERA Space Center (Cape Canaveral) Fenced Federal Launch Complex, West Checkpoint Boom Barrier, Searchlights & Armed SWAT Sentries
        const seraComp = this.map.seraCompound;
        if (seraComp && seraComp.x1 >= minX - 140 && seraComp.x0 <= maxX + 140 && seraComp.y1 >= minY - 140 && seraComp.y0 <= maxY + 140) {
            const bz = seraComp.z || 2.0;
            if (Array.isArray(seraComp.spans)) {
                for (let si = 0; si < seraComp.spans.length; si++) {
                    const sp = seraComp.spans[si];
                    drawSecurityFenceSpan(sp.xA, sp.yA, sp.xB, sp.yB, bz, Boolean(sp.isPrison));
                }
            }
            if (Array.isArray(seraComp.gates)) {
                for (let gi = 0; gi < seraComp.gates.length; gi++) {
                    const gt = seraComp.gates[gi];
                    if (gt.x < minX - 220 || gt.x > maxX + 220 || gt.y < minY - 220 || gt.y > maxY + 220) continue;
                    const halfW = gt.w * 0.5;
                    // Yellow & black hazard stop stripe across the West Security Checkpoint lane
                    this.pushSolidQuad3D(gt.x, gt.y, bz + 0.016, 7.0, gt.w - 8, 0, 0.98, 0.80, 0.12, 0.90, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    // North & South 3D Security Gate Pillars with flashing red/blue federal warning beacons & boom barrier arms
                    for (const side of [-1, 1]) {
                        const px = gt.x;
                        const py = gt.y + side * (halfW - 4);
                        this.pushSolidQuad3D(px + sunCos * 4, py + sunSin * 4, bz + 0.015, 11, 11, 0, 0.02, 0.03, 0.05, 0.38, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushSolidQuad3D(px, py, bz + 0.10, 9.5, 9.5, 0, 0.22, 0.26, 0.32, 0.98, SPRITE_DRAW_ORDER.CAR);
                        this.pushSolidQuad3D(px, py, bz + 0.22, 7.5, 7.5, 0, 0.16, 0.52, 0.94, 0.98, SPRITE_DRAW_ORDER.TREES);
                        const beaconOn = Math.sin(this.time * 7.0 + gi * 1.7 + side) > 0.0;
                        if (beaconOn) {
                            this.pushSolidQuad3D(px, py, bz + 0.26, 5.8, 5.8, 0, side < 0 ? 1.0 : 0.18, side < 0 ? 0.20 : 0.65, side < 0 ? 0.16 : 1.0, 0.94, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                        }
                        const armLen = halfW * 0.44;
                        const armCy = py - side * (armLen * 0.5 + 3);
                        this.pushSolidQuad3D(px, armCy, bz + 0.14, 3.6, armLen, 0, 0.95, 0.18, 0.18, 0.96, SPRITE_DRAW_ORDER.TREES);
                        this.pushSolidQuad3D(px, armCy, bz + 0.145, 3.6, armLen * 0.45, 0, 0.98, 0.98, 1.0, 0.96, SPRITE_DRAW_ORDER.TREES);
                    }
                }
            }
            if (Array.isArray(seraComp.patrolGuards)) {
                for (let pi = 0; pi < seraComp.patrolGuards.length; pi++) {
                    const pg = seraComp.patrolGuards[pi];
                    const osc = Math.sin(this.time * 1.15 + pg.seed);
                    const gx = pg.x + pg.dx * osc;
                    const gy = pg.y + pg.dy * osc;
                    if (gx < minX - 80 || gx > maxX + 80 || gy < minY - 80 || gy > maxY + 80) continue;
                    const gAng = Math.atan2(pg.dy * Math.cos(this.time * 1.15 + pg.seed), pg.dx * Math.cos(this.time * 1.15 + pg.seed) || 0.01);
                    const fr = Math.floor(this.time * 5.0 + pi * 2) % 8;
                    this.batchPedSprite3D(pi % 2 === 0 ? "g2_swat" : "police", fr, gx, gy, bz + 0.038, gAng, 1.08, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }

        // 11) Vice Port, Port Gellhorn, Ambrosia Docks & Island Marinas (Cargo Barges, Container Stacks & Boats)
        const portTerms = this.map.portTerminals;
        if (portTerms && portTerms.length > 0) {
            for (let i = 0; i < portTerms.length; i++) {
                const pt = portTerms[i];
                if (pt._boardedVehicle && !pt._boardedVehicle.destroyed) continue;
                if (pt.x < minX - 160 || pt.x > maxX + 160 || pt.y < minY - 160 || pt.y > maxY + 160) continue;
                const bz = pt.z || 2.0;
                const bob = Math.sin(this.time * 1.8 + pt.seed) * 0.008;
                if (pt.kind === "BARGE") {
                    // Crisp dark water shadow + 100% opaque hull deck above water beneath the 3D Volumetric Panamax Container Ship
                    this.batchObjectSprite3D("cargo_barge", pt.x + sunCos * 5, pt.y + sunSin * 5, bz + 0.014, pt.ang, pt.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.36);
                    this.batchObjectSprite3D("cargo_barge", pt.x, pt.y, bz + 0.045, pt.ang, pt.scale, SPRITE_DRAW_ORDER.CAR);
                } else if (pt.kind === "CONTAINERS") {
                    // Ground shadow (true 3D multi-tiered shipping container stacks rendered by WorldObjectEngine)
                    this.batchObjectSprite3D("container_stack", pt.x + sunCos * 5, pt.y + sunSin * 5, bz + 0.016, pt.ang, pt.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.36);
                } else if (pt.kind === "YACHT") {
                    // Crisp dark water shadow + 100% opaque hull deck above water beneath the 3D Volumetric Luxury Superyacht
                    this.batchObjectSprite3D("luxury_yacht", pt.x + sunCos * 4, pt.y + sunSin * 4, bz + 0.014, pt.ang, pt.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.34);
                    this.batchObjectSprite3D("luxury_yacht", pt.x, pt.y, bz + 0.045 + bob, pt.ang, pt.scale, SPRITE_DRAW_ORDER.CAR);
                } else if (pt.kind === "SPEEDBOAT") {
                    this.batchObjectSprite3D("speedboat_v8", pt.x, pt.y, bz + 0.012, pt.ang, pt.scale * 1.08, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.72, 0.94, 1.0, 0.28);
                    this.batchObjectSprite3D("speedboat_v8", pt.x + sunCos * 4, pt.y + sunSin * 4, bz + 0.016, pt.ang, pt.scale, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.30);
                    this.batchObjectSprite3D("speedboat_v8", pt.x, pt.y, bz + 0.048 + bob, pt.ang, pt.scale, SPRITE_DRAW_ORDER.CAR);
                }
            }
        }

        // 12) GTA 6 Grassrivers Everglades & Lake Leonida High-Speed Swamp Airboats ("airboat_fan")
        const airboats = this.map.evergladesAirboats;
        if (airboats && airboats.length > 0) {
            for (let i = 0; i < airboats.length; i++) {
                const ab = airboats[i];
                if (ab._boardedVehicle && !ab._boardedVehicle.destroyed) continue;
                const t = this.time * ab.speed + ab.seed;
                const ax = ab.x + Math.cos(t) * ab.rx;
                const ay = ab.y + Math.sin(t * 2.0) * (ab.ry * 0.55);
                const vx = -Math.sin(t) * ab.rx;
                const vy = Math.cos(t * 2.0) * (ab.ry * 1.1);
                const ang = Math.atan2(vy, vx);
                ab._liveX = ax;
                ab._liveY = ay;
                ab._liveAng = ang;
                if (ax < minX - 110 || ax > maxX + 110 || ay < minY - 110 || ay > maxY + 110) continue;
                const cs = Math.cos(ang), sn = Math.sin(ang);
                const bz = ab.z || 2.0;

                // Wide white marsh foam V-spray behind the flat-bottom airboat
                for (let w = 1; w <= 3; w++) {
                    const wx = ax - cs * (18 + w * 11);
                    const wy = ay - sn * (18 + w * 11);
                    this.pushSolidQuad3D(wx, wy, bz + 0.014, 16 + w * 5, 14 + w * 4.5, ang, 0.86, 0.98, 0.94, 0.48 - w * 0.11, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
                this.batchObjectSprite3D("airboat_fan", ax, ay, bz + 0.036, ang, 1.15, SPRITE_DRAW_ORDER.CAR);
                // Elevated swamp captain + spinning 3D twin-blade rear aero-propeller inside cage
                this.batchPedSprite3D((i % 2 === 0) ? "g2_redneck_blond" : "g2_redneck_red", 84, ax - cs * 2, ay - sn * 2, bz + 0.055, ang, 1.04, false, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
                const fanX = ax - cs * 21, fanY = ay - sn * 21;
                const bladeSpan = 16.0 * Math.abs(Math.sin(this.time * 24.0 + i));
                this.pushSolidQuad3D(fanX, fanY, bz + 0.085, 2.6, 3.0 + bladeSpan, ang, 0.92, 0.95, 0.98, 0.88, SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 13) GTA 6 Trailer 1 "NINE 1 NINE" Sky-Banner Tow Planes ("dodo_seaplane" + "sky_banner_919") & Moored Seaplanes
        const bPlanes = this.map.bannerPlanes;
        if (bPlanes && bPlanes.length > 0) {
            for (let i = 0; i < bPlanes.length; i++) {
                const bp = bPlanes[i];
                const cyc = (this.time * bp.speed + bp.seed) % 2.0;
                const u = cyc < 1.0 ? cyc : (2.0 - cyc);
                const px = bp.x0 + (bp.x1 - bp.x0) * u;
                const py = bp.y0 + (bp.y1 - bp.y0) * u;
                if (px < minX - 240 || px > maxX + 240 || py < minY - 240 || py > maxY + 240) continue;
                const ang = Math.atan2(bp.y1 - bp.y0, bp.x1 - bp.x0) + (cyc >= 1.0 ? Math.PI : 0);
                const cs = Math.cos(ang), sn = Math.sin(ang);
                const pz = bp.z || 4.65;

                // Ground shadow cast on the beach/water below (z = 2.02)
                this.batchObjectSprite3D("dodo_seaplane", px + sunCos * 42, py + sunSin * 42, 2.02, ang, 1.24, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.26);
                // High-altitude Dodo Tow Plane + spinning nose propeller
                this.batchObjectSprite3D("dodo_seaplane", px, py, pz, ang, 1.24, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                const propSpan = 16.0 * Math.abs(Math.cos(this.time * 28.0 + i));
                this.pushSolidQuad3D(px + cs * 36, py + sn * 36, pz + 0.01, 2.6, 3.0 + propSpan, ang, 0.92, 0.96, 1.0, 0.85, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                // Trailing GTA Satirical Aerial Banner ("NINE 1 NINE", "Pißwasser", "Sprunk", "eCola") fluttering behind the tail!
                const flutter = Math.sin(this.time * 7.5 + i) * 0.06;
                const banX = px - cs * 96, banY = py - sn * 96;
                const skyAds = ["sky_banner_919", "ad_pisswasser", "ad_sprunk", "ad_ecola"];
                const skyAdKey = skyAds[i % skyAds.length];
                const skyAdScale = skyAdKey === "sky_banner_919" ? 1.18 : 0.72;
                this.batchObjectSprite3D(skyAdKey, banX, banY, pz - 0.02, ang + flutter, skyAdScale, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
            }
        }
        const mPlanes = this.map.mooredSeaplanes;
        if (mPlanes && mPlanes.length > 0) {
            for (let i = 0; i < mPlanes.length; i++) {
                const mp = mPlanes[i];
                if (mp.x < minX - 120 || mp.x > maxX + 120 || mp.y < minY - 120 || mp.y > maxY + 120) continue;
                const bob = Math.sin(this.time * 2.1 + mp.seed) * 0.008;
                this.batchObjectSprite3D("dodo_seaplane", mp.x + sunCos * 4, mp.y + sunSin * 4, 2.015, mp.ang, 1.18, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.30);
                this.batchObjectSprite3D("dodo_seaplane", mp.x, mp.y, 2.048 + bob, mp.ang, 1.18, SPRITE_DRAW_ORDER.CAR);
            }
        }

        // 13B) GTA 6 Trailer 1 (0:44) VCPD & News Aerial Searchlight Helicopters ("aerialSearchHelis") & Coastal Seagull Flocks ("seagullFlocks")
        if (Array.isArray(this.map.aerialSearchHelis)) {
            for (let hi = 0; hi < this.map.aerialSearchHelis.length; hi++) {
                const ah = this.map.aerialSearchHelis[hi];
                const t = this.time * (ah.speed || 0.24) + ah.seed;
                const hx = ah.cx + Math.cos(t) * ah.rx;
                const hy = ah.cy + Math.sin(t) * ah.ry;
                if (hx < minX - 280 || hx > maxX + 280 || hy < minY - 280 || hy > maxY + 280) continue;
                const vx = -Math.sin(t) * ah.rx;
                const vy = Math.cos(t) * ah.ry;
                const hAng = Math.atan2(vy, vx);
                const cs = Math.cos(hAng), sn = Math.sin(hAng);
                const hz = ah.z || 4.55;

                // Helicopter ground shadow (volumetric sweeping searchlight cone & pool rendered in renderNightLighting!)
                this.batchObjectSprite3D("heli_vice", hx + sunCos * 38, hy + sunSin * 38, 2.02, hAng, 1.18, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.26);

                // Airborne Helicopter + Translucent Spinning Rotor (#540..#547) + Flashing Red/Blue Aviation Strobes
                this.batchObjectSprite3D("heli_vice", hx, hy, hz, hAng, 1.18, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                const rotSpr = String(540 + (Math.floor(this.time * 24.0 + hi * 3) % 8));
                this.batchObjectSprite3D(rotSpr, hx + cs * 7.0, hy + sn * 7.0, hz + 0.05, hAng, 0.86, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                const strobeRed = Math.sin(this.time * 9.0 + hi) >= 0;
                this.pushSolidQuad3D(hx - cs * 14, hy - sn * 14, hz + 0.03, 4.2, 4.2, 0, strobeRed ? 1.0 : 0.18, strobeRed ? 0.16 : 0.65, strobeRed ? 0.20 : 1.0, 0.92, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
            }
        }
        if (Array.isArray(this.map.seagullFlocks)) {
            const pRef = game && game.player;
            for (let fi = 0; fi < this.map.seagullFlocks.length; fi++) {
                const sf = this.map.seagullFlocks[fi];
                if (sf.x < minX - 180 || sf.x > maxX + 180 || sf.y < minY - 180 || sf.y > maxY + 180) continue;
                const dPlayer = pRef ? Math.hypot(pRef.x - sf.x, pRef.y - sf.y) : 999;
                const startled = dPlayer < 130 ? Math.min(1.0, (130 - dPlayer) / 90) : 0.0;
                const count = sf.count || 6;
                for (let bi = 0; bi < count; bi++) {
                    const orbitT = this.time * (1.25 + startled * 1.4) + sf.seed + (bi * Math.PI * 2) / count;
                    const rad = 22.0 + (bi % 3) * 11.0 + startled * 28.0;
                    const bx = sf.x + Math.cos(orbitT) * rad;
                    const by = sf.y + Math.sin(orbitT * 0.85) * rad;
                    const bAng = Math.atan2(Math.cos(orbitT * 0.85) * 0.85, -Math.sin(orbitT));
                    const bz = 2.65 + (bi % 3) * 0.18 + Math.sin(this.time * 3.0 + bi) * 0.08 + startled * 0.55;
                    const flap = Math.sin(this.time * (11.0 + startled * 6.0) + bi * 1.7) * 0.38;
                    const wCos = Math.cos(bAng), wSin = Math.sin(bAng);
                    // Ground shadow + 3D Seagull left/right flapping white wings with dark wingtips
                    this.pushSolidQuad3D(bx + sunCos * 14, by + sunSin * 14, 2.015, 4.5, 8.5, bAng, 0.02, 0.03, 0.06, 0.22, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(bx, by, bz, 5.5, 2.2, bAng, 0.96, 0.98, 1.00, 0.96, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                    this.pushSolidQuad3D(bx - wSin * 3.2, by + wCos * 3.2, bz + flap * 0.02, 3.0, 6.8, bAng + flap, 0.94, 0.96, 0.99, 0.95, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                    this.pushSolidQuad3D(bx + wSin * 3.2, by - wCos * 3.2, bz + flap * 0.02, 3.0, 6.8, bAng - flap, 0.94, 0.96, 0.99, 0.95, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                }
            }
        }

        // 14) GTA 6 Street Cypher / Plaza Game Circles (NO cars inside pedestrian circles!)
        const takeovers = this.map.streetTakeovers;
        const vehSprites = this.gta1Meta && this.gta1Meta.sprites && this.gta1Meta.sprites.vehicles;
        const getVehRect = (idxOrSpr, remapIdx = 0) => {
            if (!vehSprites) return null;
            const ve = (this.vehicleBySprIdx && this.vehicleBySprIdx[String(idxOrSpr)]) || vehSprites[Number(idxOrSpr)] || vehSprites[0];
            if (!ve) return null;
            if (Array.isArray(ve)) return ve;
            if (Array.isArray(ve.remaps) && ve.remaps.length > 0) {
                return ve.remaps[Math.abs(remapIdx) % ve.remaps.length] || ve.base;
            }
            return ve.base || null;
        };
        if (takeovers && takeovers.length > 0) {
            const crowdPeds = ["vc_haitian", "vc_cuban", "bikini_pink", "g2_civ_aqua", "vc_tourist", "g2_mugger"];
            for (let i = 0; i < takeovers.length; i++) {
                const st = takeovers[i];
                if (st.x < minX - 120 || st.x > maxX + 120 || st.y < minY - 120 || st.y > maxY + 120) continue;
                const bz = st.z || 2.0;
                this.batchObjectSprite3D("donut_skid_ring", st.x, st.y, bz + 0.014, st.seed, 1.32, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.batchObjectSprite3D("beach_boombox", st.x, st.y - 26, bz + 0.028, 0, 1.05, SPRITE_DRAW_ORDER.MAP_OBJECT);

                if (!((st.wipeoutTimer || 0) > 0)) {
                    // 2 Street Dancers / Challengers inside the circle (zero vehicles inside the circle!)
                    const dAng = this.time * 2.2 + st.seed;
                    const dFr1 = Math.floor(this.time * 6.0 + i) % 8;
                    const dFr2 = Math.floor(this.time * 6.0 + i + 4) % 8;
                    this.batchPedSprite3D("vc_cuban", dFr1, st.x + Math.cos(dAng) * 14, st.y + Math.sin(dAng) * 14, bz + 0.038, dAng + Math.PI, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("vc_haitian", dFr2, st.x - Math.cos(dAng) * 14, st.y - Math.sin(dAng) * 14, bz + 0.038, dAng, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);

                    // Ring of 6 cheering spectators standing upright around the circle
                    for (let ci = 0; ci < 6; ci++) {
                        const ca = (ci / 6) * Math.PI * 2 + 0.3;
                        const cx = st.x + Math.cos(ca) * 42;
                        const cy = st.y + Math.sin(ca) * 42;
                        this.batchPedSprite3D(crowdPeds[(ci + i) % crowdPeds.length], 98, cx, cy, bz + 0.038, ca + Math.PI, 1.05, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    }
                }
            }
        }

        // 15) Port Gellhorn Super-Speedway Stock-Car Race & Thrillbilly Mud Park Figure-8 Monster Mudders
        const tr = this.map.trackRacers;
        if (tr && vehSprites) {
            const sp = tr.speedway;
            const cullRx = (sp && sp.rx ? sp.rx : 1600) + 280;
            const cullRy = (sp && sp.ry ? sp.ry : 1150) + 280;
            if (sp && sp.cx >= minX - cullRx && sp.cx <= maxX + cullRx && sp.cy >= minY - cullRy && sp.cy <= maxY + cullRy) {
                const bz = sp.z || 2.04;
                const nCars = sp.cars.length;
                for (let ci = 0; ci < nCars; ci++) {
                    const t = -this.time * (0.68 + (ci % 2) * 0.04) - ci * (Math.PI * 2 / nCars);
                    const laneR = 1.0 + ((ci % 3) - 1) * 0.038;
                    const cx = sp.cx + Math.cos(t) * (sp.rx * laneR);
                    const cy = sp.cy + Math.sin(t) * (sp.ry * laneR);
                    const vx = -Math.sin(t) * sp.rx;
                    const vy = Math.cos(t) * sp.ry;
                    const cAng = Math.atan2(vy, vx) - 0.12;
                    const vRect = getVehRect(sp.cars[ci], ci + 1);
                    if (vRect) {
                        this.pushSolidQuad3D(cx + sunCos * 4, cy + sunSin * 4, bz + 0.018, 36, 18, cAng, 0.02, 0.03, 0.06, 0.35, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushAtlasSprite3D(vRect, cx, cy, bz + 0.048, cAng - Math.PI * 0.5, 1.0, SPRITE_DRAW_ORDER.CAR, 1, 1, 1, 1);
                    }
                    // Tire smoke puff behind stock car
                    const dustSpr = String(200 + ((Math.floor(this.time * 12) + ci) % 6));
                    this.batchObjectSprite3D(dustSpr, cx - Math.cos(cAng) * 20, cy - Math.sin(cAng) * 20, bz + 0.045, this.time * 3, 0.58, SPRITE_DRAW_ORDER.EXPLOSION);
                }
            }
            const mp = tr.mudPark;
            if (mp && mp.cxE >= minX - 950 && mp.cxW <= maxX + 950 && mp.cy >= minY - 720 && mp.cy <= maxY + 720) {
                const bz = mp.z || 2.0;
                for (let ti = 0; ti < mp.trucks.length; ti++) {
                    const t = this.time * 1.05 + ti * (Math.PI * 0.5);
                    const onEastLoop = (Math.floor((t / (Math.PI * 2)) * 2) % 2) === 1;
                    const loopCx = onEastLoop ? mp.cxE : mp.cxW;
                    const dir = onEastLoop ? -1 : 1;
                    const angT = t * dir;
                    const tx = loopCx + Math.cos(angT) * mp.rx;
                    const ty = mp.cy + Math.sin(angT) * mp.ry;
                    const vx = -Math.sin(angT) * mp.rx * dir;
                    const vy = Math.cos(angT) * mp.ry * dir;
                    const tAng = Math.atan2(vy, vx);
                    const vRect = getVehRect(mp.trucks[ti], ti + 2);
                    if (vRect) {
                        this.pushSolidQuad3D(tx + sunCos * 5, ty + sunSin * 5, bz + 0.018, 42, 22, tAng, 0.02, 0.03, 0.06, 0.36, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushAtlasSprite3D(vRect, tx, ty, bz + 0.056, tAng - Math.PI * 0.5, 1.08, SPRITE_DRAW_ORDER.CAR, 1, 1, 1, 1);
                    }
                    // Mud splash spray behind monster mudder tires
                    const bx = tx - Math.cos(tAng) * 22, by = ty - Math.sin(tAng) * 22;
                    this.pushSolidQuad3D(bx, by, bz + 0.032, 14, 12, tAng, 0.55, 0.38, 0.22, 0.72, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
                // Cheering Thrillbilly Mud Park spectators along the track berm
                for (let si = 0; si < 6; si++) {
                    const sx = mp.cxW - 180 + si * 210;
                    const sy = mp.cy + ((si % 2 === 0) ? -650 : 650);
                    this.batchPedSprite3D((si % 3 === 0) ? "bikini_red" : ((si % 2 === 0) ? "g2_redneck_blond" : "g2_redneck_red"), 98, sx, sy, bz + 0.038, (si % 2 === 0) ? Math.PI * 0.5 : -Math.PI * 0.5, 1.06, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
        }

        // 16) Leonida Keys, Ocean Drive & Little Cuba Thatched Tiki Bars & String-Light Café Terraces ("tiki_hut_roof", "cafe_table_umb")
        const tikis = this.map.tikiBars;
        if (tikis && tikis.length > 0) {
            for (let i = 0; i < tikis.length; i++) {
                const tb = tikis[i];
                if (tb.x < minX - 96 || tb.x > maxX + 96 || tb.y < minY - 96 || tb.y > maxY + 96) continue;
                const bz = tb.z || 2.0;
                // Solar ground shadow (true 3D bamboo posts, mahogany bar & 3D pitched thatch roof rendered by WorldObjectEngine)
                this.batchObjectSprite3D("tiki_hut_roof", tb.x + sunCos * 8, tb.y + sunSin * 8, bz + 0.015, tb.ang, 1.08, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.32);
                // 2 Sidewalk Café Umbrella Tables beside the Tiki Bar + Bartender & Seated Barstool Patrons
                const cs = Math.cos(tb.ang), sn = Math.sin(tb.ang);
                this.batchObjectSprite3D("cafe_table_umb", tb.x + cs * 38 - sn * 12, tb.y + sn * 38 + cs * 12, bz + 0.12, this.time * 0.2 + i, 1.0, SPRITE_DRAW_ORDER.TREES);
                this.batchObjectSprite3D("cafe_table_umb", tb.x - cs * 38 - sn * 12, tb.y - sn * 38 + cs * 12, bz + 0.12, -this.time * 0.2 + i, 1.0, SPRITE_DRAW_ORDER.TREES);
                this.batchPedSprite3D("vc_cuban", 98, tb.x, tb.y, bz + 0.038, tb.ang + Math.PI * 0.5, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                this.renderSeatedPed3D("bikini_pink", tb.x + sn * 22, tb.y - cs * 22, bz + 0.036, tb.ang - Math.PI * 0.5, "STOOL_WOOD", 1.04);
                this.renderSeatedPed3D("vc_tommy", tb.x - cs * 18 + sn * 22, tb.y - sn * 18 - cs * 22, bz + 0.036, tb.ang - Math.PI * 0.5, "STOOL_WOOD", 1.04);
            }
        }

        // =========================================================================
        // 16B) GTA 6 LEONIDA 3D VOLUMETRIC ARCHITECTURAL PREFABS & CHILD SOCKETS (WorldObjectEngine)
        // True 3D sloped roofs & walls are rendered in hardware Z-buffered 3D mesh pass;
        // dynamic child sockets (pools, loungers, sunbathers, umbrellas, boats) batched here.
        // =========================================================================
        if (this.map && this.map.objectEngine) {
            this.map.objectEngine.batchDynamicSockets3D(this, game, minX, minY, maxX, maxY, sunCos, sunSin);
        }

        // 17) Ambrosia "Allied Crystal" 3D Refinery Smokestacks, Outlaw Biker Chopper Rally, Port Gellhorn Mini-Golf & Mount Kalaga Kayakers
        const ind = this.map.industrialAndParkDetails;
        if (ind) {
            // 17A. Ambrosia 3D Tall Refinery Smokestacks + Billowing Industrial Steam Plumes
            if (ind.smokestacks) {
                for (let i = 0; i < ind.smokestacks.length; i++) {
                    const st = ind.smokestacks[i];
                    if (st.x < minX - 140 || st.x > maxX + 140 || st.y < minY - 140 || st.y > maxY + 140) continue;
                    const rz = st.z || 3.0;
                    // True 3D red-and-white striped refinery smokestack tower rendered in WorldObjectEngine.buildStatic3DMesh
                    // Rising 3D steam/smoke puffs drifting from stack top
                    for (let p = 0; p < 3; p++) {
                        const age = ((this.time * 0.9 + st.seed + p * 0.33) % 1.0);
                        const px = st.x + age * 26.0;
                        const py = st.y - age * 14.0;
                        const smSpr = String(200 + ((p + i) % 6));
                        this.batchObjectSprite3D(smSpr, px, py, rz + 0.42 + age * 0.22, this.time + p, 0.75 + age * 0.55, SPRITE_DRAW_ORDER.ROOF_LIGHTS);
                    }
                }
            }
            // 17B. Outlaw Biker Gang Custom Chopper Lineup & Bikers ("biker_chopper")
            if (ind.bikerRallies) {
                for (let ri = 0; ri < ind.bikerRallies.length; ri++) {
                    const br = ind.bikerRallies[ri];
                    if (br.x < minX - 120 || br.x > maxX + 120 || br.y < minY - 120 || br.y > maxY + 120) continue;
                    const bz = br.z || 2.0;
                    for (let bi = 0; bi < br.count; bi++) {
                        const bx = br.x + (bi - (br.count - 1) * 0.5) * 20;
                        const by = br.y;
                        this.batchObjectSprite3D("biker_chopper", bx + sunCos * 3, by + sunSin * 3, bz + 0.015, 0.65, 1.15, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.35);
                        this.batchObjectSprite3D("biker_chopper", bx, by, bz + 0.038, 0.65, 1.15, SPRITE_DRAW_ORDER.CAR);
                        if (bi % 2 === 0 && !((br.wipeoutTimer || 0) > 0)) {
                            this.batchPedSprite3D((bi === 0) ? "g2_russian" : "g2_redneck_blond", 98, bx + 4, by + 18, bz + 0.038, -Math.PI * 0.5, 1.05, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                        }
                    }
                }
            }
            // 17C. Port Gellhorn Retro Mini-Golf Course & Live Spinning 3D Windmill ("minigolf_windmill")
            if (ind.miniGolf) {
                const mg = ind.miniGolf;
                if (mg.x >= minX - 120 && mg.x <= maxX + 120 && mg.y >= minY - 120 && mg.y <= maxY + 120) {
                    const bz = mg.z || 2.0;
                    // True 3D Windmill tower & vertically-rotating 3D sails rendered by WorldObjectEngine
                    this.batchPedSprite3D("vc_tourist", 98, mg.x - 24, mg.y + 24, bz + 0.038, 0, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.batchPedSprite3D("bikini_cyan", 98, mg.x + 24, mg.y + 24, bz + 0.038, Math.PI, 1.04, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
            }
            // 17D. Mount Kalaga National Park Whitewater Kayakers ("kayak_orange")
            if (ind.kayakers) {
                for (let ki = 0; ki < ind.kayakers.length; ki++) {
                    const kk = ind.kayakers[ki];
                    const t = this.time * kk.speed + kk.seed;
                    const kx = kk.x + Math.cos(t) * kk.rx;
                    const ky = kk.y + Math.sin(t) * kk.ry;
                    if (kx < minX - 96 || kx > maxX + 96 || ky < minY - 96 || ky > maxY + 96) continue;
                    const vx = -Math.sin(t) * kk.rx;
                    const vy = Math.cos(t) * kk.ry;
                    const kAng = Math.atan2(vy, vx);
                    const bz = kk.z || 2.0;
                    this.pushSolidQuad3D(kx, ky, bz + 0.012, 44, 16, kAng, 0.82, 0.97, 1.0, 0.34, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.batchObjectSprite3D("kayak_orange", kx, ky, bz + 0.028, kAng, 1.12, SPRITE_DRAW_ORDER.CAR);
                    // Double-bladed kayak paddle rocking left/right in 3D + paddler seated in cockpit
                    const padSwing = Math.sin(this.time * 6.5 + ki) * 0.45;
                    this.pushSolidQuad3D(kx, ky, bz + 0.048, 3.0, 26.0, kAng + padSwing, 0.98, 0.82, 0.18, 0.95, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
                    this.batchPedSprite3D((ki % 2 === 0) ? "vc_jogger" : "surfer_guy", 84, kx, ky, bz + 0.042, kAng, 1.0, false, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
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
            { key: "g2_swat",         shirt: [30, 41, 59],    pants: [24, 34, 50],    sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [62, 84, 116], skin: SK.light, pattern: "jacket", shirt2: [82, 106, 142] },
            { key: "g2_army",         shirt: [92, 104, 52],   pants: [80, 90, 46],    sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [70, 82, 40], skin: SK.tan, pattern: "plaid", shirt2: [66, 74, 36] },
            { key: "g2_scientist",    shirt: [240, 244, 246], pants: [112, 114, 124], sleeves: "long",  legs: "pants",  hair: H.grey, skin: SK.light, pattern: "jacket", shirt2: [120, 170, 200] },
            { key: "g2_zaibatsu",     shirt: [26, 28, 34],    pants: [26, 28, 34],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light, pattern: "jacket", shirt2: [236, 238, 242] },
            { key: "g2_yakuza",       shirt: [24, 34, 68],    pants: [22, 30, 60],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light, pattern: "jacket", shirt2: [240, 242, 246] },
            { key: "g2_loony",        shirt: [84, 206, 96],   pants: [238, 238, 230], sleeves: "short", legs: "pants",  hair: H.red, skin: SK.light },
            { key: "g2_russian",      shirt: [98, 62, 36],    pants: [44, 44, 52],    sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.light },
            { key: "g2_redneck_red",  shirt: [238, 236, 226], pants: JEANS,           sleeves: "tank",  legs: "pants",  hair: H.red, skin: SK.light },
            { key: "g2_redneck_blond",shirt: [200, 40, 40],   pants: JEANS,           sleeves: "short", legs: "pants",  hair: H.blond, skin: SK.light, pattern: "plaid", shirt2: [40, 30, 34] },
            { key: "g2_prisoner",     shirt: [255, 102, 8],   pants: [255, 102, 8],   sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.tan, pattern: "jacket", shirt2: [248, 250, 252] },
            { key: "g2_mugger",       shirt: [36, 36, 42],    pants: [62, 66, 80],    sleeves: "long",  legs: "pants",  hairMode: "hood", skin: SK.tan },
            { key: "g2_hulk",         shirt: [96, 204, 64],   pants: [118, 44, 158],  sleeves: "bare",  legs: "shorts", hair: H.black, skin: [96, 204, 64] },
            // --- Vice City & Miami Tropical Street & Promenade Outfits (26..52) ---
            { key: "g2_civ_redtee",   shirt: [252, 72, 118],  pants: [244, 242, 234], sleeves: "short", legs: "shorts", hair: H.brown,  skin: SK.light, pattern: "hawaiian", shirt2: [255, 232, 92],  shirt3: [44, 212, 198] },
            { key: "g2_civ_blueshorts",shirt: [28, 214, 236], pants: [242, 240, 232], sleeves: "short", legs: "shorts", hair: H.blond,  skin: SK.tan,   pattern: "stripes",  shirt2: [250, 250, 252] },
            { key: "g2_civ_yellowtee",shirt: [252, 212, 42],  pants: [52, 118, 212],  sleeves: "short", legs: "shorts", hair: H.black,  skin: SK.dark,  pattern: "hawaiian", shirt2: [255, 82, 146],  shirt3: [250, 250, 250] },
            { key: "g2_civ_lilac",    shirt: [204, 128, 252], pants: [244, 244, 248], sleeves: "long",  legs: "pants",  hair: H.auburn, skin: SK.light, pattern: "jacket",   shirt2: [48, 228, 238] },
            { key: "g2_civ_burgundy", shirt: [255, 108, 52],  pants: [242, 238, 224], sleeves: "short", legs: "pants",  hair: H.black,  skin: SK.brown, pattern: "stripes",  shirt2: [18, 196, 188] },
            { key: "g2_civ_aqua",     shirt: [24, 228, 218],  pants: [246, 246, 248], sleeves: "short", legs: "pants",  hair: H.brown,  skin: SK.tan,   pattern: "jacket",   shirt2: [255, 92, 172] },
            { key: "g2_civ_greysuit", shirt: [246, 246, 248], pants: [242, 242, 246], sleeves: "long",  legs: "pants",  hair: H.blond,  skin: SK.tan,   pattern: "jacket",   shirt2: [38, 220, 236] },
            { key: "g2_civ_pink",     shirt: [255, 84, 176],  pants: JEANS,           sleeves: "short", legs: "shorts", hair: H.blond,  skin: SK.light, pattern: "stripes",  shirt2: [250, 250, 252] },
            { key: "g2_civ_darkgreen",shirt: [44, 218, 146],  pants: [242, 238, 226], sleeves: "short", legs: "pants",  hair: H.black,  skin: SK.dark,  pattern: "hawaiian", shirt2: [254, 218, 68],  shirt3: [255, 94, 154] },
            { key: "g2_civ_granny",   shirt: [250, 148, 212], pants: [244, 244, 248], sleeves: "short", legs: "pants",  hair: H.blond,  skin: SK.light, pattern: "jacket",   shirt2: [250, 250, 252] },
            // --- Vice City '86 & Miami Beach Icons ---
            { key: "vc_hawaiian_red", shirt: [242, 48, 68],   shirt2: [255, 228, 72],  shirt3: [36, 214, 168], pants: [244, 240, 228], sleeves: "short", legs: "pants",  hair: H.brown, skin: SK.tan,   pattern: "hawaiian" },
            { key: "vc_tourist",      shirt: [42, 186, 248],  shirt2: [255, 234, 84],  shirt3: [255, 96, 176], pants: KHAKI,           sleeves: "short", legs: "shorts", hair: H.blond, skin: SK.light, pattern: "hawaiian" },
            { key: "vc_tommy",        shirt: [28, 192, 232],  shirt2: [24, 138, 82],   shirt3: [248, 248, 240], pants: JEANS,          sleeves: "short", legs: "pants",  hair: H.black, skin: SK.tan,   pattern: "hawaiian" },
            { key: "vc_crockett",     shirt: [246, 244, 240], shirt2: [255, 112, 182], pants: [246, 244, 240], sleeves: "long",  legs: "pants",  hair: H.blond, skin: SK.tan,   pattern: "jacket" },
            { key: "vc_tubbs",        shirt: [88, 148, 196],  shirt2: [48, 232, 242],  pants: [88, 148, 196],  sleeves: "long",  legs: "pants",  hair: H.black, skin: SK.dark,  pattern: "jacket" },
            { key: "vc_jogger",       shirt: [255, 52, 164],  shirt2: [36, 232, 248],  pants: [36, 220, 242],  sleeves: "tank",  legs: "shorts", hair: H.blond, skin: SK.tan,   pattern: "stripes" },
            { key: "vc_sailor",       shirt: [248, 248, 252], shirt2: [32, 188, 224],  pants: [242, 62, 82],   sleeves: "short", legs: "shorts", hair: H.auburn,skin: SK.light, pattern: "stripes" },
            { key: "vc_cuban",        shirt: [246, 244, 232], shirt2: [52, 198, 168],  shirt3: [252, 204, 56], pants: [42, 48, 62],    sleeves: "short", legs: "pants",  hair: H.black, skin: SK.brown, pattern: "jacket" },
            { key: "vc_haitian",      shirt: [238, 48, 72],   shirt2: [38, 128, 236],  pants: JEANS,           sleeves: "short", legs: "pants",  hair: H.black, skin: SK.dark,  pattern: "jacket" },
            { key: "vc_bodybuilder",  shirt: [252, 214, 38],  shirt2: [255, 68, 148],  pants: [232, 48, 68],   sleeves: "tank",  legs: "shorts", hair: H.blond, skin: SK.brown, pattern: "stripes" },
            // --- Miami Kids & Teenagers (rendered at 0.74x child scale) ---
            { key: "kid_boy_cap",     shirt: [254, 218, 42],  shirt2: [28, 212, 242],  pants: [48, 112, 224],  sleeves: "short", legs: "shorts", hairMode: "helmet", helmet: [242, 44, 64],  skin: SK.light, pattern: "stripes" },
            { key: "kid_girl_pink",   shirt: [255, 78, 174],  shirt2: [250, 250, 252], pants: [44, 224, 218],  sleeves: "short", legs: "shorts", hair: H.blond,  skin: SK.light, pattern: "stripes" },
            { key: "kid_skater",      shirt: [56, 238, 132],  shirt2: [168, 85, 247],  pants: KHAKI,           sleeves: "short", legs: "shorts", hairMode: "helmet", helmet: [24, 214, 242], skin: SK.tan,   pattern: "hawaiian", shirt3: [254, 224, 68] },
            { key: "kid_beach",       shirt: [36, 218, 238],  shirt2: [255, 114, 62],  pants: [255, 92, 74],   sleeves: "tank",  legs: "shorts", hair: H.brown,  skin: SK.tan,   pattern: "stripes" },
            // --- Port of Vice City & Port Gellhorn Hard-Hatted Stevedores / Dockworkers ---
            { key: "dockworker_yellow", shirt: [226, 252, 36], shirt2: [241, 245, 249], pants: [38, 68, 126],  sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [250, 204, 21], skin: SK.tan,   pattern: "hivis" },
            { key: "dockworker_orange", shirt: [255, 102, 18], shirt2: [253, 234, 78],  pants: [44, 54, 72],   sleeves: "long",  legs: "pants",  hairMode: "helmet", helmet: [248, 250, 252], skin: SK.light, pattern: "hivis" }
        ];
        return this._g2Archs;
    }

    // Weighted spawn pools for the Vice City & Miami Beach pedestrian archetypes
    pickGta2PedType(ped, isGang) {
        const gangPool = [
            "vc_cuban", "vc_haitian", "g2_zaibatsu", "g2_yakuza",
            "g2_loony", "g2_russian", "g2_redneck_red", "g2_redneck_blond", "g2_mugger"
        ];
        const civPool = [
            "vc_tommy", "vc_crockett", "vc_tubbs", "vc_hawaiian_red", "vc_tourist",
            "vc_jogger", "vc_sailor", "vc_cuban", "vc_bodybuilder",
            "g2_civ_aqua", "g2_civ_pink", "g2_civ_redtee", "g2_civ_blueshorts",
            "g2_civ_yellowtee", "g2_civ_lilac", "g2_civ_burgundy", "g2_civ_greysuit",
            "g2_civ_darkgreen", "g2_civ_granny",
            "vc_tommy", "vc_crockett", "vc_hawaiian_red", "vc_tourist", "vc_jogger",
            "g2_civ_aqua", "g2_civ_pink", "g2_civ_redtee", "g2_civ_blueshorts",
            "bikini_pink", "bikini_cyan", "bikini_yellow",
            "kid_boy_cap", "kid_girl_pink", "kid_skater", "kid_beach"
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
        const nf = Math.max(0, Math.min(1, this.nightFactor || 0));
        if (
            nf < 0.88 &&
            drawOrder !== SPRITE_DRAW_ORDER.CORPSE &&
            drawOrder !== SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER &&
            frameIdx !== 42
        ) {
            const shCos = this._curSunCos !== undefined ? this._curSunCos : 0.78;
            const shSin = this._curSunSin !== undefined ? this._curSunSin : 0.62;
            const shAlpha = (this._curSunShadowAlpha !== undefined ? this._curSunShadowAlpha : 0.28) * 1.05;
            this.pushAtlasSprite3D(
                rect,
                x + shCos * 3.4,
                y + shSin * 3.4,
                zBlocks - 0.022,
                rot,
                scale * 0.96,
                SPRITE_DRAW_ORDER.TIRE_MARKS,
                0.02,
                0.03,
                0.06,
                shAlpha,
                0
            );
        }
        this.pushAtlasSprite3D(rect, x, y, zBlocks, rot, scale, drawOrder, rTint, gTint, bTint, 1.0);

        if (muzzleFlash && this.gta1Meta.sprites.objects["234"]) {
            const fl = this.gta1Meta.sprites.objects["234"];
            const fx = x + Math.cos(angle) * 10;
            const fy = y + Math.sin(angle) * 10;
            this.pushAtlasSprite3D(fl, fx, fy, zBlocks + 0.02, rot, 0.55, SPRITE_DRAW_ORDER.PROJECTILES);
        }
    }

    renderSeatedPed3D(pedType, x, y, zBlocks, angle, seatStyle = "BISTRO_CYAN", scale = 1.0) {
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const sunCos = this._curSunCos !== undefined ? this._curSunCos : 0.78;
        const sunSin = this._curSunSin !== undefined ? this._curSunSin : 0.62;
        const shAlpha = (this._curSunShadowAlpha !== undefined ? this._curSunShadowAlpha : 0.28) * 0.95;

        // 1. 1:1 Scale 3D Chair / Stool Base & Elevated Backrest (sized for 22px-wide pedestrians at TILE_SIZE = 64)
        if (seatStyle !== "BENCH_SLOT") {
            const seatX = x - ca * 1.5;
            const seatY = y - sa * 1.5;
            this.pushSolidQuad3D(seatX + sunCos * 3.6, seatY + sunSin * 3.6, zBlocks - 0.022, 13.0, 14.5, angle, 0.02, 0.03, 0.06, shAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
            if (seatStyle === "STOOL_WOOD") {
                this.pushSolidQuad3D(seatX, seatY, zBlocks - 0.008, 11.4, 11.4, angle, 0.44, 0.24, 0.12, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(seatX, seatY, zBlocks - 0.004, 9.0, 9.0, angle, 0.66, 0.40, 0.20, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
            } else {
                const isPink = seatStyle === "BISTRO_PINK";
                const cR = isPink ? 0.96 : 0.22;
                const cG = isPink ? 0.44 : 0.86;
                const cB = isPink ? 0.72 : 0.92;
                // White Art Deco chair frame + pastel seat cushion
                this.pushSolidQuad3D(seatX, seatY, zBlocks - 0.009, 12.4, 14.6, angle, 0.95, 0.94, 0.90, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(seatX, seatY, zBlocks - 0.005, 10.0, 12.2, angle, cR, cG, cB, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                // Left & right chair armrests outside shoulders
                for (const side of [-1, 1]) {
                    const ax = x + ca * 0.5 - sa * (side * 6.8);
                    const ay = y + sa * 0.5 + ca * (side * 6.8);
                    this.pushSolidQuad3D(ax, ay, zBlocks + 0.014, 7.8, 2.0, angle, 0.94, 0.92, 0.88, 0.98, SPRITE_DRAW_ORDER.PEDESTRIAN);
                }
                // Elevated 3D Chair Backrest behind the seated NPC's shoulders
                const backX = x - ca * 6.4;
                const backY = y - sa * 6.4;
                this.pushSolidQuad3D(backX, backY, zBlocks + 0.026, 3.2, 15.0, angle, 0.96, 0.95, 0.92, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
                this.pushSolidQuad3D(backX, backY, zBlocks + 0.030, 2.2, 12.4, angle, cR, cG, cB, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
            }
        }

        // 2. Seated Bent Thighs/Knees & Shoes extending forward (+ca, +sa) at 1:1 pedestrian scale
        const isDarkPants = (pedType.includes("crockett") || pedType.includes("tubbs") || pedType.includes("cuban") || pedType.includes("tommy"));
        const legR = isDarkPants ? 0.22 : 0.78;
        const legG = isDarkPants ? 0.28 : 0.56;
        const legB = isDarkPants ? 0.42 : 0.44;
        for (const side of [-1, 1]) {
            const kx = x + ca * 5.0 - sa * (side * 2.8);
            const ky = y + sa * 5.0 + ca * (side * 2.8);
            this.pushSolidQuad3D(kx, ky, zBlocks - 0.003, 6.0, 3.2, angle, legR, legG, legB, 0.98, SPRITE_DRAW_ORDER.PEDESTRIAN);
            const fx = x + ca * 8.0 - sa * (side * 2.8);
            const fy = y + sa * 8.0 + ca * (side * 2.8);
            this.pushSolidQuad3D(fx, fy, zBlocks - 0.004, 2.8, 2.8, angle, 0.94, 0.95, 0.98, 0.96, SPRITE_DRAW_ORDER.PEDESTRIAN);
        }

        // 3. Calm Upright Seated Torso & Head (frame 98) at 1:1 pedestrian scale (1.26 matches walking peds at 1.34)
        const headSway = Math.sin(this.time * 1.35 + x * 0.07 + y * 0.05) * 0.07;
        this.batchPedSprite3D(pedType, 98, x, y, zBlocks + 0.006, angle + headSway, scale * 1.26, false, SPRITE_DRAW_ORDER.PEDESTRIAN);
    }

    renderBistroTableScene3D(x, y, zBlocks, pedNorth, pedSouth, theme = "CYAN", withUmbrella = false) {
        const sunCos = this._curSunCos !== undefined ? this._curSunCos : 0.78;
        const sunSin = this._curSunSin !== undefined ? this._curSunSin : 0.62;
        const shAlpha = (this._curSunShadowAlpha !== undefined ? this._curSunShadowAlpha : 0.28) * 1.05;
        const isPink = theme === "PINK";
        const cR = isPink ? 0.96 : 0.24;
        const cG = isPink ? 0.46 : 0.88;
        const cB = isPink ? 0.74 : 0.94;

        // 1. North & South 3D Bistro Chairs (aligned parallel to the building facade so sidewalks stay wide open!)
        if (pedNorth) {
            this.renderSeatedPed3D(pedNorth, x, y - 18.0, zBlocks + 0.036, Math.PI * 0.5, isPink ? "BISTRO_PINK" : "BISTRO_CYAN", 1.0);
        } else {
            const ny = y - 16.2;
            this.pushSolidQuad3D(x + sunCos * 3.2, ny + sunSin * 3.2, zBlocks + 0.014, 14.2, 12.0, 0, 0.02, 0.03, 0.06, shAlpha * 0.85, SPRITE_DRAW_ORDER.TIRE_MARKS);
            this.pushSolidQuad3D(x, ny, zBlocks + 0.027, 14.0, 11.8, 0, 0.95, 0.94, 0.90, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
            this.pushSolidQuad3D(x, ny, zBlocks + 0.031, 11.6, 9.4, 0, cR, cG, cB, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
            this.pushSolidQuad3D(x, ny - 5.2, zBlocks + 0.052, 14.4, 3.0, 0, 0.96, 0.95, 0.92, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        }
        if (pedSouth) {
            this.renderSeatedPed3D(pedSouth, x, y + 18.0, zBlocks + 0.036, -Math.PI * 0.5, isPink ? "BISTRO_CYAN" : "BISTRO_PINK", 1.0);
        } else {
            const sy = y + 16.2;
            this.pushSolidQuad3D(x + sunCos * 3.2, sy + sunSin * 3.2, zBlocks + 0.014, 14.2, 12.0, 0, 0.02, 0.03, 0.06, shAlpha * 0.85, SPRITE_DRAW_ORDER.TIRE_MARKS);
            this.pushSolidQuad3D(x, sy, zBlocks + 0.027, 14.0, 11.8, 0, 0.95, 0.94, 0.90, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
            this.pushSolidQuad3D(x, sy, zBlocks + 0.031, 11.6, 9.4, 0, cR, cG, cB, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
            this.pushSolidQuad3D(x, sy + 5.2, zBlocks + 0.052, 14.4, 3.0, 0, 0.96, 0.95, 0.92, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        }

        // 2. 1:1 Scale 20px Round 3D Art Deco Bistro Table (octagonal dual-quad silhouette + pedestal + cocktails)
        for (const rAng of [0, 0.7854]) {
            this.pushSolidQuad3D(x + sunCos * 4.8, y + sunSin * 4.8, zBlocks + 0.014, 18.2, 18.2, rAng, 0.02, 0.03, 0.06, shAlpha * 0.75, SPRITE_DRAW_ORDER.TIRE_MARKS);
        }
        this.pushSolidQuad3D(x, y, zBlocks + 0.026, 6.4, 6.4, 0, 0.24, 0.27, 0.33, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
        for (const rAng of [0, 0.7854]) {
            this.pushSolidQuad3D(x, y, zBlocks + 0.048, 17.6, 17.6, rAng, 0.97, 0.96, 0.93, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
            this.pushSolidQuad3D(x, y, zBlocks + 0.051, 14.6, 14.6, rAng, cR, cG, cB, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
            this.pushSolidQuad3D(x, y, zBlocks + 0.054, 11.4, 11.4, rAng, 0.99, 0.98, 0.96, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        }
        // Coasters & tropical cocktail glasses on the tabletop
        this.pushSolidQuad3D(x - 2.4, y - 3.6, zBlocks + 0.056, 3.8, 3.8, 0, 0.92, 0.90, 0.86, 0.98, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x - 2.4, y - 3.6, zBlocks + 0.059, 2.5, 2.5, 0, 0.98, 0.26, 0.66, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x + 2.4, y + 3.6, zBlocks + 0.056, 3.8, 3.8, 0, 0.92, 0.90, 0.86, 0.98, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x + 2.4, y + 3.6, zBlocks + 0.059, 2.5, 2.5, 0, 0.16, 0.94, 0.88, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);

        if (withUmbrella) {
            const umbSpr = isPink ? "umbrella_pink" : "umbrella_cyan";
            // Offset umbrella slightly toward the West building side so the tabletop & patrons remain clearly visible!
            this.batchObjectSprite3D(umbSpr, x - 7.5, y, zBlocks + 0.095, (y * 0.03) % 6.28, 0.84, SPRITE_DRAW_ORDER.TREES);
        }
    }

    renderParkBenchScene3D(x, y, zBlocks, angle, pedA, pedB) {
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const sunCos = this._curSunCos !== undefined ? this._curSunCos : 0.78;
        const sunSin = this._curSunSin !== undefined ? this._curSunSin : 0.62;
        const shAlpha = (this._curSunShadowAlpha !== undefined ? this._curSunShadowAlpha : 0.28) * 1.05;

        // 1. 1:1 Scale (14px deep x 42px long) 3D Teak-Slat & Cast-Iron Promenade Park Bench (oriented facing `angle`)
        this.pushSolidQuad3D(x + sunCos * 4.5, y + sunSin * 4.5, zBlocks + 0.014, 15.0, 44.0, angle, 0.02, 0.03, 0.06, shAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
        // Dark cast-iron bench base frame
        this.pushSolidQuad3D(x - ca * 0.6, y - sa * 0.6, zBlocks + 0.025, 13.4, 42.0, angle, 0.16, 0.19, 0.24, 0.99, SPRITE_DRAW_ORDER.MAP_OBJECT);
        // 3 distinct horizontal warm teak wooden seat planks
        for (const slatOff of [-3.8, -0.2, 3.4]) {
            const sx = x + ca * slatOff;
            const sy = y + sa * slatOff;
            const isMid = Math.abs(slatOff) < 1.0;
            this.pushSolidQuad3D(sx, sy, zBlocks + 0.029, 3.1, 40.2, angle, isMid ? 0.76 : 0.70, isMid ? 0.49 : 0.44, isMid ? 0.24 : 0.20, 0.99, SPRITE_DRAW_ORDER.MAP_OBJECT);
        }
        // Dark cast-iron armrests at both ends (-19.8, +19.8) & center divider (0)
        for (const latOff of [-19.8, 0, 19.8]) {
            const ax = x - sa * latOff;
            const ay = y + ca * latOff;
            this.pushSolidQuad3D(ax, ay, zBlocks + 0.038, 13.8, 2.6, angle, 0.15, 0.18, 0.23, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        }
        // Elevated 3D Wooden Backrest Beam behind the seated pedestrians' shoulders
        const backX = x - ca * 6.8;
        const backY = y - sa * 6.8;
        this.pushSolidQuad3D(backX, backY, zBlocks + 0.058, 3.8, 42.4, angle, 0.46, 0.27, 0.12, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(backX, backY, zBlocks + 0.062, 2.4, 40.6, angle, 0.72, 0.45, 0.21, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);

        // 2. One or Two Full-Scale Pedestrians calmly seated side-by-side on the 42px bench (spaced 21.2px apart!)
        if (pedA) {
            const pAx = x - sa * (-10.6);
            const pAy = y + ca * (-10.6);
            this.renderSeatedPed3D(pedA, pAx, pAy, zBlocks + 0.036, angle + 0.06, "BENCH_SLOT", 1.0);
        }
        if (pedB) {
            const pBx = x - sa * 10.6;
            const pBy = y + ca * 10.6;
            this.renderSeatedPed3D(pedB, pBx, pBy, zBlocks + 0.036, angle - 0.06, "BENCH_SLOT", 1.0);
        }
    }

    renderDominoTableScene3D(x, y, zBlocks, wiped = false) {
        const sunCos = this._curSunCos !== undefined ? this._curSunCos : 0.78;
        const sunSin = this._curSunSin !== undefined ? this._curSunSin : 0.62;
        const shAlpha = (this._curSunShadowAlpha !== undefined ? this._curSunShadowAlpha : 0.28) * 1.05;

        this.pushSolidQuad3D(x + sunCos * 5.0, y + sunSin * 5.0, zBlocks + 0.014, 21.5, 21.5, 0, 0.02, 0.03, 0.06, shAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
        if (!wiped) {
            this.renderSeatedPed3D("vc_cuban", x - 17.5, y, zBlocks + 0.036, 0, "STOOL_WOOD", 1.0);
            this.renderSeatedPed3D("vc_hawaiian_red", x + 17.5, y, zBlocks + 0.036, Math.PI, "STOOL_WOOD", 1.0);
            this.renderSeatedPed3D("g2_civ_granny", x, y - 17.5, zBlocks + 0.036, Math.PI * 0.5, "STOOL_WOOD", 1.0);
        } else {
            for (const [sx, sy] of [[x - 16.0, y], [x + 16.0, y], [x, y - 16.0]]) {
                this.pushSolidQuad3D(sx, sy, zBlocks + 0.028, 11.2, 11.2, 0, 0.44, 0.24, 0.12, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
                this.pushSolidQuad3D(sx, sy, zBlocks + 0.032, 8.8, 8.8, 0, 0.66, 0.40, 0.20, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }
        // Empty South wooden stool
        this.pushSolidQuad3D(x, y + 16.0, zBlocks + 0.028, 11.2, 11.2, 0, 0.44, 0.24, 0.12, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);
        this.pushSolidQuad3D(x, y + 16.0, zBlocks + 0.032, 8.8, 8.8, 0, 0.66, 0.40, 0.20, 0.98, SPRITE_DRAW_ORDER.MAP_OBJECT);

        // 1:1 Scale 20x20px Mahogany Domino Table + Recessed Emerald-Green Felt Top + Ivory Domino Tiles
        this.pushSolidQuad3D(x, y, zBlocks + 0.048, 20.0, 20.0, 0, 0.46, 0.24, 0.11, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x, y, zBlocks + 0.052, 15.6, 15.6, 0, 0.12, 0.54, 0.28, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x - 2.6, y - 1.4, zBlocks + 0.056, 3.4, 1.9, 0.35, 0.97, 0.96, 0.90, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x + 0.4, y + 0.2, zBlocks + 0.056, 3.4, 1.9, -0.20, 0.97, 0.96, 0.90, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
        this.pushSolidQuad3D(x + 3.0, y + 2.0, zBlocks + 0.056, 3.4, 1.9, 0.55, 0.97, 0.96, 0.90, 0.99, SPRITE_DRAW_ORDER.PEDESTRIAN);
    }

    batchWorldSprites3D(game, minX, minY, maxX, maxY) {
        // 1. Tire Skidmarks & Off-Road Surface Wheel Ruts (Grass, Sand, Mud, Road) with Progressive Fade-Out (eSpriteDrawOrder_TireMarks)
        for (const s of game.skidmarks) {
            if (s.x < minX || s.x > maxX || s.y < minY || s.y > maxY) continue;
            const lifeRatio = (typeof s.life === "number" && typeof s.maxLife === "number" && s.maxLife > 0)
                ? Math.max(0, Math.min(1, s.life / s.maxLife))
                : 1.0;
            if (lifeRatio <= 0.01) continue;
            // Smooth ease-out fade so tracks remain crisp initially and dissolve naturally into the terrain
            const fade = Math.pow(lifeRatio, 0.85);
            const alpha = (typeof s.alpha === "number" ? s.alpha : 0.45) * fade;
            const sz = this.getEntityZ(s, 0.015);
            const sw = typeof s.w === "number" ? s.w : 3.5;
            const sh = typeof s.h === "number" ? s.h : 2.8;
            const sang = typeof s.angle === "number" ? s.angle : 0;
            const sr = typeof s.r === "number" ? s.r : 0.08;
            const sg = typeof s.g === "number" ? s.g : 0.08;
            const sb = typeof s.b === "number" ? s.b : 0.10;
            this.pushSolidQuad3D(s.x, s.y, sz, sw, sh, sang, sr, sg, sb, alpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
        }

        // 1B. Persistent spray-paint graffiti tags on walls (press [P] on foot next to a building)
        if (Array.isArray(game.graffitiTags)) {
            const glyphs = [
                ["X.X.XXX", "X.X.X..", "X.X.X..", ".X..X..", ".X..XXX"],
                ["X.X.X", "XXXXX", "XXXXX", "XXXXX", "....."],
                ["X...X", ".X.X.", "..X..", ".X.X.", "X...X"],
                [".XXX.", "X.X.X", "X...X", ".X.X.", ".XXX."],
                ["..X..", "...X.", "XXXXX", "...X.", "..X.."],
                [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."],
                ["..XX.", ".XX..", "XXXXX", "..XX.", ".XX.."]
            ];
            const drawTag = (tg, progress) => {
                const rows = glyphs[(tg.style || 0) % glyphs.length];
                const cell = 2.0;
                const gw = rows[0].length * cell;
                const gh = rows.length * cell;
                const ca = Math.cos(tg.angle || 0), sa = Math.sin(tg.angle || 0);
                const tz = this.getEntityZ(tg, 0.02);
                // Pale chalky backing halo so the black paint stays readable on dark asphalt / night scenes
                this.pushSolidQuad3D(tg.x, tg.y, tz, gw + 2.6, gh + 2.6, tg.angle || 0, 0.78, 0.80, 0.84, 0.30 * progress, SPRITE_DRAW_ORDER.TIRE_MARKS);
                const maxRow = Math.max(1, Math.ceil(rows.length * progress));
                for (let ry = 0; ry < Math.min(rows.length, maxRow); ry++) {
                    for (let rx = 0; rx < rows[ry].length; rx++) {
                        if (rows[ry][rx] !== "X") continue;
                        const lx = (rx - (rows[ry].length - 1) * 0.5) * cell;
                        const ly = (ry - (rows.length - 1) * 0.5) * cell;
                        const wx = tg.x + lx * ca - ly * sa;
                        const wy = tg.y + lx * sa + ly * ca;
                        this.pushSolidQuad3D(wx, wy, tz + 0.001, cell * 0.92, cell * 0.92, tg.angle || 0, tg.r, tg.g, tg.b, 0.92 * progress, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                }
                // Paint drips running down under the tag
                if (progress >= 1) {
                    for (let dc = 0; dc < rows[0].length; dc++) {
                        if (((tg.seed || 0) + dc * 7) % 4 !== 0) continue;
                        const lx = (dc - (rows[0].length - 1) * 0.5) * cell;
                        const ly = gh * 0.5 + cell * 0.9;
                        this.pushSolidQuad3D(tg.x + lx * ca - ly * sa, tg.y + lx * sa + ly * ca, tz + 0.001, cell * 0.5, cell * 1.6, tg.angle || 0, tg.r, tg.g, tg.b, 0.7, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                }
            };
            let drawn = 0;
            for (const tg of game.graffitiTags) {
                if (tg.x < minX || tg.x > maxX || tg.y < minY || tg.y > maxY) continue;
                if (++drawn > 30) break;
                drawTag(tg, 1);
            }
            if (game.tagSprayTarget && game.tagSprayTimer > 0) {
                drawTag(game.tagSprayTarget, Math.max(0.05, Math.min(1, 1 - game.tagSprayTimer / 1.25)));
            }
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
            // Static silent payphone booth prop (or toppled/smashed flat on the sidewalk!)
            const pz = this.getEntityZ(ph, 0.06);
            if ((ph.wipeoutTimer || 0) > 0) {
                const ka = ph.knockAng || 0;
                const ca = Math.cos(ka);
                const sa = Math.sin(ka);
                // Torn metal pedestal base & shattered blue glass fragments on the sidewalk
                this.pushSolidQuad3D(ph.x, ph.y, pz - 0.042, 7.0, 7.0, 0, 0.34, 0.38, 0.44, 0.94, SPRITE_DRAW_ORDER.GROUND_DECALS);
                this.pushSolidQuad3D(ph.x + ca * 7, ph.y + sa * 7, pz - 0.040, 14.0, 4.5, ka + 0.25, 0.22, 0.64, 0.88, 0.78, SPRITE_DRAW_ORDER.GROUND_DECALS);
                const phRect = this.gta1Meta && this.gta1Meta.sprites && this.gta1Meta.sprites.objects && this.gta1Meta.sprites.objects["274"];
                if (phRect) {
                    this.pushAtlasSprite3D(
                        phRect,
                        ph.x + ca * 13,
                        ph.y + sa * 13,
                        pz - 0.036,
                        ka + 0.38,
                        0.96,
                        SPRITE_DRAW_ORDER.GROUND_DECALS,
                        0.68, 0.72, 0.78,
                        0.94
                    );
                }
            } else {
                this.batchObjectSprite3D("274", ph.x, ph.y, pz, 0, 1.05, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        const m = game.missions.activeMission;
        if (m && m.crates) {
            for (const c of m.crates) {
                this.batchObjectSprite3D("503", c.x, c.y, this.getEntityZ(c, 0.05), 0, 1.05, SPRITE_DRAW_ORDER.MAP_OBJECT);
            }
        }

        // 2B. Enterable Venue Interior Doors & Unique Stunt Jump Ramps in 3D
        if (Array.isArray(this.map.interiors)) {
            for (const intr of this.map.interiors) {
                if (intr.doorX < minX || intr.doorX > maxX || intr.doorY < minY || intr.doorY > maxY) continue;
                const dz = this.map.getHeightAtPixel(intr.doorX, intr.doorY, 2.0) + 0.03;
                const mrgb = intr.matRGB || [0.96, 0.25, 0.65];
                if (intr.facing) {
                    // Real door: vertical quads standing against the facade the door belongs to (any of 4 sides)
                    const fnv = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[intr.facing] || [0, 1];
                    const tcx = intr.isEstatePortico ? intr.doorX : (Math.floor(intr.doorX / TILE_SIZE) * TILE_SIZE + TILE_SIZE * 0.5);
                    const tcy = intr.isEstatePortico ? intr.doorY : (Math.floor(intr.doorY / TILE_SIZE) * TILE_SIZE + TILE_SIZE * 0.5);
                    const dAng = fnv[0] !== 0 ? Math.PI * 0.5 : 0;
                    if (!intr.isEstatePortico) {
                        const wx0 = tcx - fnv[0] * TILE_SIZE * 0.5 + fnv[0] * 1.6;
                        const wy0 = tcy - fnv[1] * TILE_SIZE * 0.5 + fnv[1] * 1.6;
                        const gz = dz - 0.03;
                        const vq = (w, zc, halfH, rr, gg, bb, aa, off = 0) =>
                            this.pushSpriteQuad3D(wx0 + fnv[0] * off, wy0 + fnv[1] * off, gz + zc, w, 0.4, dAng, -1, -1, -1, -1, rr, gg, bb, aa, SPRITE_DRAW_ORDER.MAP_OBJECT, halfH);
                        vq(48, 1.02, 0.11, mrgb[0], mrgb[1], mrgb[2], 1.0, 0.00); // sign band
                        vq(38, 0.48, 0.50, 0.20, 0.15, 0.12, 1.0, 0.02);           // door frame
                        vq(31, 0.46, 0.46, 0.0, 0.0, 0.0, 1.0, 0.05);              // black doorway
                        vq(3, 0.42, 0.04, 0.95, 0.80, 0.25, 1.0, 0.08);           // brass handle
                        // Subtle dark stone threshold step flush against the doorway
                        this.pushSolidQuad3D(tcx - fnv[0] * 24, tcy - fnv[1] * 24, dz, 36, 8, dAng, 0.12, 0.10, 0.09, 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
                    }
                }
            }
        }
        if (Array.isArray(this.map.stuntRamps)) {
            for (const ramp of this.map.stuntRamps) {
                if (ramp.x < minX || ramp.x > maxX || ramp.y < minY || ramp.y > maxY) continue;
                const rz = this.map.getHeightAtPixel(ramp.x, ramp.y, 2.0) + 0.022;
                const rAng = ramp.angle || 0;
                const ex = ramp.x - Math.cos(rAng) * 28.0;
                const ey = ramp.y - Math.sin(rAng) * 28.0;
                const pulse = 0.45 + 0.25 * Math.sin(this.time * 6.0);
                // Glowing neon entry marker ahead of the true 3D sloped wedge ramp (rendered by WorldObjectEngine)
                this.pushSolidQuad3D(ex, ey, rz, 14, 22, rAng, 0.99, 0.86, 0.16, pulse, SPRITE_DRAW_ORDER.TIRE_MARKS);
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
            else if (ped.kind === "COP") pedType = ped.g24Type || "police";
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
        this._curSunCos = sunCos;
        this._curSunSin = sunSin;
        this._curSunShadowAlpha = sunShadowAlpha;

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
            const isPrisonZone =
                ped.missionTag === "PRISONER" ||
                (pbx >= 56 && pbx <= 68 && pby >= 76 && pby <= 146);
            const isBeachZone =
                ped.missionTag === "BEACH" ||
                ped.x >= 452.0 * TILE_SIZE ||
                (this.map && this.map.coastalSandMask && this.map.coastalSandMask[pby * MAP_COLS + pbx] === 1) ||
                (pbx >= MAP_X_256[182] && pbx <= MAP_X_256[195] && pby >= MAP_Y_256[98] && pby <= MAP_Y_256[128]);

            if (isPrisonZone && ped.kind !== "COP" && ped.kind !== "FIREMAN" && ped.kind !== "MEDIC") {
                pedType = "g2_prisoner";
                ped.g24Type = "g2_prisoner";
                ped.g2Remapped = true;
            } else if (ped.kind === "FIREMAN") {
                pedType = "g2_fireman";
                ped.g24Type = "g2_fireman";
            } else if (ped.kind === "MEDIC") {
                pedType = "g2_medic";
                ped.g24Type = "g2_medic";
            } else if (ped.kind === "CIVILIAN" && isBeachZone && (!pedType || pedType.startsWith("civ") || pedType === "gang")) {
                const beachPool = [
                    "bikini_pink", "bikini_cyan", "bikini_yellow",
                    "bikini_red", "bikini_white", "surfer_guy",
                    "vc_tommy", "vc_hawaiian_red", "vc_jogger", "vc_tourist"
                ];
                const bh = Math.abs(Math.floor((ped.turnSeed || 1) * 17 + ped.animSeed * 313)) % beachPool.length;
                pedType = beachPool[bh];
                ped.g24Type = pedType;
            } else if ((ped.kind === "CIVILIAN" || ped.kind === "HOSTILE" || ped.kind === "CRIMINAL") && !ped.g2Remapped && (!pedType || pedType.startsWith("civ") || pedType === "gang")) {
                // GTA 2 (1999) remap variety: re-dress generic GTA 1 civilians & gang members once
                ped.g2Remapped = true;
                const isGang = ped.kind === "HOSTILE" || ped.kind === "CRIMINAL" || pedType === "gang";
                const g2Type = this.pickGta2PedType(ped, isGang);
                if (g2Type) {
                    pedType = g2Type;
                    ped.g24Type = pedType;
                }
            }
            if (!pedType) {
                if (ped.kind === "MONK") pedType = "monk";
                else if (ped.kind === "COP") pedType = "police";
                else if (ped.kind === "FIREMAN") pedType = "g2_fireman";
                else if (ped.kind === "MEDIC") pedType = "g2_medic";
                else if (ped.kind === "HOSTILE" || ped.kind === "CRIMINAL" || ped.archetype === "PAULY" || ped.archetype === "DELL") pedType = "gang";
                else {
                    const civTypes = ["gang", "civ0", "civ1", "civ2", "civ3"];
                    const h = Math.abs(Math.floor(ped.x * 0.13 + ped.y * 0.07)) % civTypes.length;
                    pedType = civTypes[h];
                    ped.g24Type = pedType;
                }
            }

            if (ped.kind === "GATOR") {
                const sway = Math.sin(this.time * 5.0 + (ped.animSeed || 0)) * 0.08;
                this.batchObjectSprite3D("gator_3d", ped.x, ped.y, pz, (ped.angle || 0) + sway + Math.PI * 0.5, 1.02, SPRITE_DRAW_ORDER.PEDESTRIAN);
                continue;
            }

            const pedDrawOrder = typeof ped.getDrawOrder === "function"
                ? ped.getDrawOrder()
                : SPRITE_DRAW_ORDER.PEDESTRIAN;

            const isChildPed = Boolean(ped.isChild || (pedType && pedType.startsWith("kid_")));
            const thisPedScale = isChildPed ? (pedScale * 0.74) : pedScale;

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
                const walkPhase = this.time * 1.25 + (ped.monkIndex || 0) * 0.25;
                frameIdx = this.getPedFrameIndex("FIST", true, false, walkPhase);
            } else if (ped.kind === "COP") {
                const copActive = (game.wantedLevel || 0) > 0 || Boolean(ped.inCombat);
                const walkPhase = this.time * (copActive ? 1.85 : 1.18) + ped.animSeed;
                const copWeapon = copActive ? (ped.copWeapon || "PISTOL") : "FIST";
                frameIdx = this.getPedFrameIndex(copWeapon, ped.speed > 0, copActive, walkPhase);
            } else if (ped.kind === "FIREMAN") {
                const walkPhase = this.time * 1.7 + ped.animSeed;
                const spraying = Boolean(ped.sprayingHose);
                // Use the two-handed aiming frames (136..143 / 152) — they are baked into the recolored g2 atlas,
                // unlike the flamethrower frames (118..134) which would fall back to the raw green/blue civilian base
                frameIdx = this.getPedFrameIndex(spraying ? "UZI" : "FIST", ped.speed > 0 && !spraying, spraying, walkPhase);
            } else if (ped.kind === "CRIMINAL" || ped.isAlertedGuard) {
                const walkPhase = this.time * 1.85 + ped.animSeed;
                frameIdx = this.getPedFrameIndex(ped.copWeapon || (ped.isAlertedGuard ? "PISTOL" : "UZI"), ped.speed > 0, true, walkPhase);
            } else if (ped.kind === "HOSTILE") {
                const walkPhase = this.time * 1.95 + ped.animSeed;
                frameIdx = this.getPedFrameIndex("FIST", true, true, walkPhase);
            } else {
                const isRunning = (ped.panicTimer || 0) > 0 || (ped.burnTimer || 0) > 0 || (ped.dodgeTimer || 0) > 0;
                const isJoggerOrSkate = ped.isRollerblader || pedType === "vc_jogger";
                const stepMult = isChildPed ? 1.22 : (isJoggerOrSkate ? 1.38 : 1.0);
                const walkPhase = this.time * (isRunning ? 2.1 : 1.12) * stepMult + ped.animSeed;
                frameIdx = this.getPedFrameIndex("FIST", ped.speed > 0.5, isRunning, walkPhase);
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

            const skateSwayX = ped.isRollerblader ? Math.cos(ped.angle + Math.PI * 0.5) * Math.sin(this.time * 5.2 + (ped.animSeed || 0) * 10) * 3.2 : 0;
            const skateSwayY = ped.isRollerblader ? Math.sin(ped.angle + Math.PI * 0.5) * Math.sin(this.time * 5.2 + (ped.animSeed || 0) * 10) * 3.2 : 0;
            if (ped.isRollerblader && !ped.dead) {
                const skCos = Math.cos(ped.angle);
                const skSin = Math.sin(ped.angle);
                const isPinkSkate = (Math.abs(Math.floor((ped.animSeed || 0) * 100)) % 2) === 0;
                const sr = isPinkSkate ? 1.0 : 0.12;
                const sg = isPinkSkate ? 0.25 : 0.94;
                const sb = isPinkSkate ? 0.78 : 0.98;
                this.pushSolidQuad3D(ped.x + skateSwayX - skSin * 3.2, ped.y + skateSwayY + skCos * 3.2, pz - 0.012, 5.2, 2.2, ped.angle, sr, sg, sb, 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(ped.x + skateSwayX + skSin * 3.2, ped.y + skateSwayY - skCos * 3.2, pz - 0.012, 5.2, 2.2, ped.angle, sr, sg, sb, 0.92, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }

            this.batchPedSprite3D(pedType, frameIdx, ped.x + skateSwayX, ped.y + skateSwayY, pz, ped.angle, thisPedScale, (ped.muzzleTimer || 0) > 0, pedDrawOrder, pr, pg, pb);

            // VCFD On-Foot Firefighter brass hose nozzle + coupled yellow canvas supply line to his Fire Engine!
            if (ped.kind === "FIREMAN") {
                const ft = ped.homeFireTruck;
                if (ft && !ft.destroyed) {
                    const dFt = Math.hypot(ft.x - ped.x, ft.y - ped.y);
                    if (dFt > 18 && dFt < 240) {
                        const midX = (ped.x + ft.x) * 0.5;
                        const midY = (ped.y + ft.y) * 0.5;
                        const hAng = Math.atan2(ped.y - ft.y, ped.x - ft.x);
                        this.pushSolidQuad3D(midX, midY, pz - 0.015, dFt, 2.4, hAng, 0.92, 0.78, 0.16, 0.88, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                }
                if (ped.sprayingHose) {
                    const nozX = ped.x + Math.cos(ped.angle) * 9.5;
                    const nozY = ped.y + Math.sin(ped.angle) * 9.5;
                    this.pushSolidQuad3D(nozX, nozY, pz + 0.018, 5.5, 2.6, ped.angle, 0.96, 0.80, 0.18, 0.98, pedDrawOrder);
                }
            }

            // GTA 2 kSynthCigarette (synthetic_lights.cpp): ~25% of calm adult civilian pedestrians smoke a glowing cigarette ember after dusk!
            if (!isChildPed && nfGlobal > 0.32 && (ped.panicTimer || 0) <= 0 && (Math.abs(Math.floor(ped.animSeed * 1000)) % 4 === 0)) {
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
            const jInPool = Boolean(this.map && this.map.isSwimmingPoolAt && this.map.isSwimmingPoolAt(jason.x, jason.y));
            const jInWater = jInPool || Boolean(this.map && this.map.isWaterAtPixel && this.map.isWaterAtPixel(jason.x, jason.y));
            if (jInWater) {
                const jWaterZ = jInPool ? Math.max(2.038, (jason.z || 2.0) + 0.038) : 2.000;
                const jSwimZ = jWaterZ + 0.018 + Math.sin(this.time * 3.8 + jason.x * 0.03) * 0.006;
                const jRingProg = (this.time * (jason.isMoving ? 1.45 : 0.85)) % 1.0;
                const jRingSize = 13 + jRingProg * 16;
                this.pushSolidQuad3D(jason.x, jason.y, jWaterZ + 0.008, jRingSize, jRingSize, jason.angle || 0, 0.72, 0.96, 1.0, (1.0 - jRingProg) * 0.35, SPRITE_DRAW_ORDER.TIRE_MARKS);
                const jStrokeFr = 50 + (Math.floor(this.time * (jason.isMoving ? 5.2 : 2.5)) % (jason.isMoving ? 6 : 2));
                this.batchPedSprite3D(
                    jason.pedType || "jason",
                    jStrokeFr,
                    jason.x,
                    jason.y,
                    jSwimZ,
                    jason.angle,
                    pedScale * 1.04,
                    false,
                    SPRITE_DRAW_ORDER.PEDESTRIAN,
                    0.86,
                    0.97,
                    1.0
                );
            } else {
                const jz = this.getEntityZ(jason, 0.045);
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
                        const rRot = (rp.angle || 0) - Math.PI * 0.5;
                        const shAlpha = Math.max(0.28, sunShadowAlpha * 1.15);
                        if (rv.isMoto || mapInfo.isMotorcycle) {
                            this.pushAtlasSprite3D(rect, rp.x + sunCos * 3.4, rp.y + sunSin * 3.4, rz - 0.025, rRot, 1.0, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, shAlpha, 0);
                            const rFrames = this.gta1Meta.sprites.peds[rp.pedType || "gang"];
                            const rRect = rFrames && (rFrames["84"] || rFrames["98"]);
                            if (rRect) {
                                this.pushAtlasSprite3D(rRect, rp.x + sunCos * 3.8, rp.y + sunSin * 3.8, rz - 0.024, rRot, 1.10, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, shAlpha * 0.9, 0);
                            }
                        } else {
                            this.pushAtlasSprite3D(rect, rp.x, rp.y, rz - 0.022, rRot, 0.98, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.02, 0.03, 0.06, 0.34, 0);
                            this.pushAtlasSprite3D(rect, rp.x + sunCos * 4.6, rp.y + sunSin * 4.6, rz - 0.026, rRot, 0.96, SPRITE_DRAW_ORDER.TIRE_MARKS, 0.03, 0.04, 0.08, shAlpha, 0);
                        }
                        this.pushAtlasSprite3D(rect, rp.x, rp.y, rz + 0.01, rRot, 1.0, SPRITE_DRAW_ORDER.CAR, 1, 1, 1, 1, 0);
                        if (rv.isMoto) {
                            this.batchPedSprite3D(rp.pedType || "gang", 84, rp.x, rp.y, rz + 0.035, rp.angle, 1.14, (rp.muzzleTimer || 0) > 0, SPRITE_DRAW_ORDER.CONVERTIBLE_PASSENGER);
                        }
                    }
                } else {
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

            if (p.dead && p.deathType !== "POLICE") {
                const corpseZ = this.getEntityZ(p, 0.025);
                const pCharScale = p.pedType === "bigsmoke" ? 1.36 : 1.30;
                this.batchObjectSprite3D("444", p.x, p.y, corpseZ, p.angle || 0, 1.0, SPRITE_DRAW_ORDER.CORPSE);
                this.batchPedSprite3D(
                    p.pedType || "lucia",
                    42,
                    p.x,
                    p.y,
                    corpseZ + 0.005,
                    p.angle || 0,
                    pCharScale,
                    false,
                    SPRITE_DRAW_ORDER.CORPSE
                );
            } else if (p.isSwimming && !isJumpingOrSliding) {
                const waterBaseZ = p.inPool ? Math.max(2.038, (p.z || 2.0) + 0.038) : 2.000;
                const swimZ = waterBaseZ + 0.018 + Math.sin(this.time * 3.8 + p.x * 0.03) * 0.007;
                const swPhase = p.swimPhase || (this.time * 4.2);
                const cAng = Math.cos(p.angle);
                const sAng = Math.sin(p.angle);
                const pAng = p.angle + Math.PI * 0.5;
                const cpAng = Math.cos(pAng);
                const spAng = Math.sin(pAng);

                // Concentric turquoise & white foam swimming ripples around Lucia
                for (let rk = 0; rk < 2; rk++) {
                    const ringProg = (this.time * (p.isMoving ? 1.55 : 0.85) + rk * 0.5) % 1.0;
                    const ringSize = (p.isMoving ? 15 : 12) + ringProg * (p.isMoving ? 20 : 12);
                    const ringAlpha = (1.0 - ringProg) * (p.isMoving ? 0.42 : 0.26);
                    this.pushSolidQuad3D(p.x - cAng * ringProg * 6, p.y - sAng * ringProg * 6, waterBaseZ + 0.008, ringSize, ringSize, p.angle, 0.72, 0.96, 1.0, ringAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(p.x - cAng * ringProg * 6, p.y - sAng * ringProg * 6, waterBaseZ + 0.009, ringSize * 0.86, ringSize * 0.86, p.angle + 0.785, 0.92, 0.99, 1.0, ringAlpha * 0.85, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }

                // Alternating left/right arm-stroke & flutter-kick whitewater splashes when swimming
                if (p.isMoving) {
                    const armSide = Math.sin(swPhase) >= 0 ? 1 : -1;
                    const strokeReach = 7.0 + Math.abs(Math.sin(swPhase)) * 5.5;
                    const spX = p.x + cAng * strokeReach + cpAng * armSide * 6.5;
                    const spY = p.y + sAng * strokeReach + spAng * armSide * 6.5;
                    this.pushSolidQuad3D(spX, spY, waterBaseZ + 0.012, 7.5, 4.8, p.angle + armSide * 0.35, 0.94, 0.99, 1.0, 0.68, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    // Trailing flutter-kick foam wake behind feet
                    const kickSide = Math.cos(swPhase * 2.0) * 3.8;
                    const kx = p.x - cAng * 10.5 + cpAng * kickSide;
                    const ky = p.y - sAng * 10.5 + spAng * kickSide;
                    this.pushSolidQuad3D(kx, ky, waterBaseZ + 0.011, 8.5, 5.2, p.angle, 0.88, 0.98, 1.0, 0.56, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }

                // 3D Stalking Tiger/Bull Shark Dorsal Fin & Wake when in Deep Ocean Warning / Danger Zone!
                if ((p.deepSeaDanger || 0) >= 1) {
                    const isAttack = (p.deepSeaDanger || 0) >= 2;
                    const orbitSpd = isAttack ? 3.4 : 1.75;
                    const sharkOrbAng = this.time * orbitSpd;
                    const lunge = (p.sharkLungeTimer || 0) > 0 ? (1.0 - (p.sharkLungeTimer / 0.55)) : 1.0;
                    const orbitRad = isAttack
                        ? ((p.sharkLungeTimer || 0) > 0 ? (8.0 + Math.sin(lunge * Math.PI) * 20.0) : (26.0 + Math.sin(this.time * 4.5) * 8.0))
                        : 48.0;
                    const shX = p.x + Math.cos(sharkOrbAng) * orbitRad;
                    const shY = p.y + Math.sin(sharkOrbAng) * orbitRad;
                    const shHeading = sharkOrbAng + Math.PI * 0.5 + (isAttack ? -0.28 : 0);
                    const shCos = Math.cos(shHeading);
                    const shSin = Math.sin(shHeading);

                    // Submerged dark grey-blue shark body shadow + white V-wake + vertical 3D dorsal fin!
                    this.pushSolidQuad3D(shX, shY, 2.006, 26.0, 9.5, shHeading, 0.08, 0.16, 0.24, 0.62, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(shX - shCos * 11, shY - shSin * 11, 2.007, 12.0, 3.6, shHeading + Math.sin(this.time * 12.0) * 0.35, 0.10, 0.19, 0.28, 0.58, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(shX - shCos * 4, shY - shSin * 4, 2.012, 16.0, 11.0, shHeading + 0.42, 0.90, 0.98, 1.0, 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(shX, shY, 2.025, 11.0, 3.2, shHeading, 0.18, 0.24, 0.32, 0.96, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    if ((p.sharkLungeTimer || 0) > 0) {
                        this.pushSolidQuad3D(p.x, p.y, 2.014, 22.0, 22.0, this.time * 3.0, 0.92, 0.12, 0.18, 0.52, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                }

                // Breaststroke / freestyle arm-stroke frame cycle (50..55) with rhythmic body sway
                const strokeFrame = p.isMoving
                    ? (50 + (Math.floor(swPhase * 1.6) % 6))
                    : (50 + (Math.floor(this.time * 2.5) % 2));
                const swimSway = p.isMoving ? Math.sin(swPhase) * 0.15 : Math.sin(this.time * 2.5) * 0.05;
                const pCharScale = p.pedType === "bigsmoke" ? 1.12 : 1.06;
                this.batchPedSprite3D(
                    p.pedType || "lucia",
                    strokeFrame,
                    p.x,
                    p.y,
                    swimZ,
                    p.angle + swimSway,
                    pedScale * pCharScale,
                    false,
                    SPRITE_DRAW_ORDER.PEDESTRIAN,
                    0.86,
                    0.97,
                    1.0
                );
            } else if (p.isSitting && !isJumpingOrSliding) {
                const pCharScale = p.pedType === "bigsmoke" ? 1.08 : 1.02;
                this.renderSeatedPed3D(
                    p.pedType || "lucia",
                    p.x,
                    p.y,
                    baseZ - 0.014,
                    p.angle,
                    "BENCH_SLOT",
                    pCharScale
                );
            } else {
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
        }

        // 5. Authentic STYLE001.G24 Vehicles (1:1 1997 GTA 1 scale = 1.0 + Delta Doors & Crash Dents! — eSpriteDrawOrder_Car)
        const carScale = 1.0;
        for (const v of game.vehicles) {
            if (v.x < minX || v.x > maxX || v.y < minY || v.y > maxY) continue;
            const isWaterCraft = Boolean(v.waterOnly || v.specKey === "AIRBOAT");
            const waveBob = isWaterCraft ? (0.012 + Math.sin(this.time * 2.6 + v.x * 0.02 + v.y * 0.015) * 0.008) : 0;
            const vz = (isWaterCraft ? Math.max(2.065, this.getEntityZ(v, 0.065)) : this.getEntityZ(v, 0.06)) + waveBob;
            const mapInfo = this.getVehicleG24Mapping(v);
            let rect = null;
            let dmgRect = null;
            let doorRect = null;
            let sirens = [];

            const vehEntry = this.vehicleBySprIdx ? this.vehicleBySprIdx[mapInfo.sprId] : null;
            if (v.destroyed) {
                const wreckKey = `veh_${mapInfo.sprId}_wreck`;
                if (v.specKey === "BMX_BIKE") {
                    rect = (this.gta1Meta.sprites.wrecked && this.gta1Meta.sprites.wrecked["veh_bicycle_wreck"]) ||
                        this.gta1Meta.sprites.objects["veh_bicycle_wreck"] ||
                        this.gta1Meta.sprites.objects["veh_bicycle"];
                } else if (v.specKey === "E_SCOOTER") {
                    rect = (this.gta1Meta.sprites.wrecked && this.gta1Meta.sprites.wrecked["veh_escooter_wreck"]) ||
                        this.gta1Meta.sprites.objects["veh_escooter_wreck"] ||
                        this.gta1Meta.sprites.objects["veh_escooter"];
                } else if (v.specKey === "VCPD_CRUISER" || mapInfo.sprId === "73") {
                    rect = (this.gta1Meta.sprites.wrecked && this.gta1Meta.sprites.wrecked["veh_vcpd_wreck"]) ||
                        this.gta1Meta.sprites.objects["veh_vcpd_wreck"] ||
                        (vehEntry && vehEntry.wreck);
                } else if (v.specKey === "TOW_TRUCK" || mapInfo.sprId === "veh_tow_truck") {
                    rect = (this.gta1Meta.sprites.wrecked && this.gta1Meta.sprites.wrecked["veh_tow_truck_wreck"]) ||
                        this.gta1Meta.sprites.objects["veh_tow_truck_wreck"] ||
                        (vehEntry && vehEntry.wreck);
                } else if (vehEntry && vehEntry.wreck) {
                    rect = vehEntry.wreck;
                } else if (this.gta1Meta.sprites.wrecked && this.gta1Meta.sprites.wrecked[wreckKey]) {
                    rect = this.gta1Meta.sprites.wrecked[wreckKey];
                } else if (this.gta1Meta.sprites.objects && this.gta1Meta.sprites.objects[wreckKey]) {
                    rect = this.gta1Meta.sprites.objects[wreckKey];
                } else {
                    let wId = "979";
                    if (mapInfo.isTank) wId = "983";
                    else if (mapInfo.isMotorcycle) wId = "984";
                    else if (v.specKey === "MICRO_KART") wId = "981";
                    else if ((v.w || 48) >= 75) wId = "982";
                    rect = (this.gta1Meta.sprites.wrecked && this.gta1Meta.sprites.wrecked[wId]) ||
                        (vehEntry && vehEntry.base);
                }
            } else {
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
            // Boat sprites (jet-ski, speedboat) are drawn bow-east (horizontal) instead of the GTA1 south-facing car layout
            const rot = mapInfo.horizontalSprite ? v.angle : (v.angle - Math.PI * 0.5);
            const airZ = v.stuntZOffset || 0;
            const isMicroTwoWheeler = (v.specKey === "BMX_BIKE" || v.specKey === "E_SCOOTER");
            const baseVehScale = isMicroTwoWheeler ? (carScale * 1.12) : carScale;
            const vScale = baseVehScale * (1.0 + airZ * 0.22);
            const vDrawOrder = airZ > 0.05 ? SPRITE_DRAW_ORDER.JUMPING_PEDESTRIAN : SPRITE_DRAW_ORDER.CAR;
            const cosA = Math.cos(v.angle);
            const sinA = Math.sin(v.angle);

            // A. GTA 2 live_geometry.cpp: True Sprite-Silhouette Under-Chassis & Solar-Tracked 3D Drop Shadow!
            // (Uses exact per-pixel sprite alpha via pushAtlasSprite3D instead of a rectangular box so narrow motorcycles,
            //  handlebars, rounded fenders & boats never show a wide rectangular slab underneath!)
            const shAlpha = airZ > 0.05 ? 0.52 : Math.max(0.28, sunShadowAlpha * 1.18);
            if (mapInfo.isMotorcycle) {
                const motoShOff = 3.4 + airZ * 20.0;
                this.pushAtlasSprite3D(
                    rect,
                    v.x + sunCos * motoShOff,
                    v.y + sunSin * motoShOff,
                    vz - 0.025,
                    rot,
                    baseVehScale,
                    SPRITE_DRAW_ORDER.TIRE_MARKS,
                    0.02,
                    0.03,
                    0.06,
                    shAlpha,
                    0
                );
                if (!v.destroyed && v.driver) {
                    const rFrames = this.gta1Meta.sprites.peds.gang || this.gta1Meta.sprites.peds.civ0;
                    const rRect = rFrames && (rFrames["84"] || rFrames["98"]);
                    if (rRect) {
                        this.pushAtlasSprite3D(
                            rRect,
                            v.x + cosA * 1.5 + sunCos * (motoShOff + 0.6),
                            v.y + sinA * 1.5 + sunSin * (motoShOff + 0.6),
                            vz - 0.024,
                            rot,
                            carScale * 1.02,
                            SPRITE_DRAW_ORDER.TIRE_MARKS,
                            0.02,
                            0.03,
                            0.06,
                            shAlpha * 0.9,
                            0
                        );
                    }
                }
            } else {
                if (airZ < 0.05) {
                    this.pushAtlasSprite3D(
                        rect,
                        v.x,
                        v.y,
                        vz - 0.022,
                        rot,
                        carScale * 0.98,
                        SPRITE_DRAW_ORDER.TIRE_MARKS,
                        0.02,
                        0.03,
                        0.06,
                        0.36,
                        0
                    );
                }
                const shOff = 4.6 + airZ * 22.0;
                this.pushAtlasSprite3D(
                    rect,
                    v.x + sunCos * shOff,
                    v.y + sunSin * shOff,
                    vz - 0.026,
                    rot,
                    carScale * 0.96,
                    SPRITE_DRAW_ORDER.TIRE_MARKS,
                    0.03,
                    0.04,
                    0.08,
                    shAlpha,
                    0
                );
            }

            // A2. Miami / Vice City Custom Neon Underglow for Sports Cars, Convertibles, Muscle Cars & Neon E-Scooters!
            // A1b. High-Fidelity 3D V-Shaped Diverging Wake, Prop Wash & Hydro-Roostertail Plume behind Boats on Water (including under bridges!)
            if (!v.destroyed && (v.waterOnly || v.specKey === "AIRBOAT") &&
                this.map && (this.map.isBoatNavigableWater ? this.map.isBoatNavigableWater(v.x, v.y) : (this.map.isWaterAtPixel && this.map.isWaterAtPixel(v.x, v.y)))) {
                const rawSpd = Math.hypot(v.vx || 0, v.vy || 0);
                if (rawSpd > 22) {
                    const wSpd = Math.min(1, rawSpd / 360);
                    const halfL = (v.w || 40) * 0.48;
                    for (let wk = 1; wk <= 5; wk++) {
                        const distBack = halfL + wk * (v.specKey === "JETSKI" ? 6.5 : 8.5);
                        const spread = wk * (v.specKey === "JETSKI" ? 3.2 : 5.0) * (0.45 + wSpd * 0.55);
                        const cx = v.x - cosA * distBack;
                        const cy = v.y - sinA * distBack;
                        const alpha = (0.58 - wk * 0.095) * (0.38 + wSpd * 0.62);
                        // Center turbulent white prop wash
                        this.pushSolidQuad3D(cx, cy, vz - 0.018, 7 + wk * 2.5, (v.h || 16) * 0.45 + wk * 2.4 * wSpd, v.angle, 0.90, 0.98, 1.0, alpha * 0.85, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        // Diverging Port & Starboard V-Wake arms
                        for (const side of [-1, 1]) {
                            const armX = cx - sinA * (spread * side);
                            const armY = cy + cosA * (spread * side);
                            this.pushSolidQuad3D(armX, armY, vz - 0.017, 9 + wk * 2.8, 3.2 + wk * 1.1, v.angle - side * 0.34, 0.95, 0.99, 1.0, alpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        }
                    }
                    // High-pressure vertical Hydro-Roostertail plume when boosting with [SPACE]
                    if (v.roostertailActive) {
                        for (let rt = 1; rt <= 4; rt++) {
                            const rx = v.x - cosA * (halfL + rt * 5.5);
                            const ry = v.y - sinA * (halfL + rt * 5.5);
                            const rz = vz + 0.02 + Math.sin((rt / 4) * Math.PI) * 0.095;
                            this.pushSolidQuad3D(rx, ry, rz, 8 + rt * 2.2, 4.5 + rt * 1.6, v.angle, 0.86, 0.98, 1.0, 0.78 - rt * 0.14, SPRITE_DRAW_ORDER.CAR_ROOF);
                        }
                    }
                }
                // Marine Port (Red) / Starboard (Green) Bow Navigation Lights & White Stern Mast Light on Speedboats
                if (v.specKey === "SPEEDBOAT") {
                    const bowDist = (v.w || 58) * 0.30;
                    const beamHalf = (v.h || 30) * 0.36;
                    const navAlpha = Math.max(0.72, 0.65 + nfGlobal * 0.35);
                    // Port (left, -sinA/+cosA wait: in screen/world coords, port is -lat, starboard is +lat)
                    this.pushSolidQuad3D(v.x + cosA * bowDist + sinA * beamHalf, v.y + sinA * bowDist - cosA * beamHalf, vz + airZ + 0.015, 2.8, 2.4, v.angle, 1.0, 0.12, 0.18, navAlpha, SPRITE_DRAW_ORDER.CAR_ROOF);
                    this.pushSolidQuad3D(v.x + cosA * bowDist - sinA * beamHalf, v.y + sinA * bowDist + cosA * beamHalf, vz + airZ + 0.015, 2.8, 2.4, v.angle, 0.12, 1.0, 0.38, navAlpha, SPRITE_DRAW_ORDER.CAR_ROOF);
                    this.pushSolidQuad3D(v.x - cosA * ((v.w || 58) * 0.44), v.y - sinA * ((v.w || 58) * 0.44), vz + airZ + 0.018, 2.6, 2.6, v.angle, 0.96, 0.98, 1.0, navAlpha, SPRITE_DRAW_ORDER.CAR_ROOF);
                }
            }
            // Spinning 3D Aero-Propeller Blade inside the rear fan cage of drivable AIRBOAT vehicles
            if (!v.destroyed && v.specKey === "AIRBOAT") {
                const fanX = v.x - cosA * 19.5;
                const fanY = v.y - sinA * 19.5;
                const fanSpeed = v.driver ? 26.0 : 4.5;
                const bladeSpan = 15.0 * Math.abs(Math.sin(this.time * fanSpeed + (v.x * 0.01)));
                this.pushSolidQuad3D(fanX, fanY, vz + airZ + 0.045, 2.6, 3.0 + bladeSpan, v.angle, 0.92, 0.95, 0.98, 0.90, SPRITE_DRAW_ORDER.CAR_ROOF);
            }
            if (!v.destroyed && airZ < 0.08) {
                const sk = v.specKey || "";
                const hasUnderglow = (
                    sk === "BANSHEE_GT" || sk === "STINGER_CABRIO" || sk === "TURISMO_CABRIO" ||
                    sk === "PENETRATOR_GT" || sk === "CHALLENGER_RT" || sk === "TULIP_MUSCLE" ||
                    sk === "VICE_CHEETAH" || sk === "PORKA_TURBO" || sk === "SUPERBIKE" ||
                    sk === "E_SCOOTER"
                );
                if (hasUnderglow) {
                    const ugAlpha = Math.max(0.18, Math.min(0.68, 0.22 + nfGlobal * 0.46));
                    let ugR = 0.08, ugG = 0.94, ugB = 1.00; // South Beach Cyan
                    if (sk === "STINGER_CABRIO" || sk === "TULIP_MUSCLE") {
                        ugR = 1.00; ugG = 0.18; ugB = 0.76; // Flamingo Magenta
                    } else if (sk === "CHALLENGER_RT" || sk === "PENETRATOR_GT") {
                        ugR = 0.68; ugG = 0.24; ugB = 1.00; // Ultra-Violet Purple
                    } else if (sk === "TURISMO_CABRIO" || sk === "SUPERBIKE" || sk === "E_SCOOTER") {
                        ugR = 0.22; ugG = 1.00; ugB = 0.56; // Neon Mint-Lime
                    }
                    const ugW = (v.w || 46) * (sk === "E_SCOOTER" ? 0.58 : (mapInfo.isMotorcycle ? 0.68 : 0.92));
                    const ugH = (v.h || 22) * (sk === "E_SCOOTER" ? 0.56 : (mapInfo.isMotorcycle ? 0.62 : 0.96));
                    this.pushSolidQuad3D(v.x, v.y, vz - 0.020, ugW * 1.16, ugH * 1.24, v.angle, ugR, ugG, ugB, ugAlpha * 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushSolidQuad3D(v.x, v.y, vz - 0.019, ugW * 0.88, ugH * 0.92, v.angle, ugR, ugG, ugB, ugAlpha * 0.82, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }

            // B. GTA 2 live_geometry.cpp SetSpriteConform (kSmoothing = 0.25f): 4-Corner Ground Slope Pitch + Wheelie/Stunt Pitch!
            // (Disabled on watercraft so getHeightAtPixel on water/shore transitions never pitches the hull below the Y=2.0 water surface!)
            const isStationaryParked = !v.driver && Math.abs(v.speed || 0) < 0.1;
            const posUnchanged = isStationaryParked && v._cacheShadeX !== undefined && Math.abs(v.x - v._cacheShadeX) < 2 && Math.abs(v.y - v._cacheShadeY) < 2;
            let rawSlopePitch = 0;
            if (!isWaterCraft) {
                if (posUnchanged && v._cachedRawSlopePitch !== undefined) {
                    rawSlopePitch = v._cachedRawSlopePitch;
                } else {
                    const hFront = this.map.getHeightAtPixel(v.x + cosA * 20, v.y + sinA * 20, vz);
                    const hRear = this.map.getHeightAtPixel(v.x - cosA * 20, v.y - sinA * 20, vz);
                    rawSlopePitch = Math.max(-0.22, Math.min(0.22, (hFront - hRear) * 0.45));
                    v._cachedRawSlopePitch = rawSlopePitch;
                }
            }
            v._conformPitch = isWaterCraft ? 0 : ((v._conformPitch || 0) * 0.75 + rawSlopePitch * 0.25);
            const wheeliePitch = (v.wheelieTimer || 0) > 0 ? 0.14 : 0;
            const stuntPitch = (v.stuntAirTimer || 0) > 0
                ? (((v.stuntAirTimer / (v.stuntMaxTime || 1.15)) - 0.5) * 0.24)
                : 0;
            const totalPitchZ = isWaterCraft ? 0 : (v._conformPitch + wheeliePitch + stuntPitch);

            // Car body sprite with GTA 2 live rotation-aware solar clearcoat specular sheen + 3D building cast shadow response!
            let rawDayShade = 0;
            if (!isWaterCraft) {
                if (posUnchanged && v._cachedDayShade !== undefined) {
                    rawDayShade = v._cachedDayShade;
                } else {
                    rawDayShade = this.getDayShadeAtPixel(v.x, v.y);
                    v._cachedDayShade = rawDayShade;
                    v._cacheShadeX = v.x;
                    v._cacheShadeY = v.y;
                }
            }
            const vehShade = isWaterCraft ? 0 : ((1.0 - nfGlobal) * rawDayShade);
            const sunAlign = Math.cos(v.angle - sunShadowAngle);
            const carSunSpec = v.destroyed ? 1.0 : (isWaterCraft ? 1.12 : (1.0 + 0.12 * sunAlign * (1.0 - nfGlobal * 0.72) * (1.0 - vehShade * 0.75)));
            const vTintR = carSunSpec * (1.04 - vehShade * 0.22);
            const vTintG = carSunSpec * (1.01 - vehShade * 0.15);
            const vTintB = carSunSpec * (0.97 - vehShade * 0.04);
            this.pushAtlasSprite3D(rect, v.x, v.y, vz + airZ, rot, vScale, vDrawOrder, vTintR, vTintG, vTintB, 1, totalPitchZ);
            if (dmgRect) {
                this.pushAtlasSprite3D(dmgRect, v.x, v.y, vz + airZ + 0.0015, rot, vScale, vDrawOrder, vTintR, vTintG, vTintB, 1, totalPitchZ);
            }
            if (doorRect) {
                this.pushAtlasSprite3D(doorRect, v.x, v.y, vz + airZ + 0.0025, rot, vScale, vDrawOrder, vTintR, vTintG, vTintB, 1, totalPitchZ);
            }
            // Solar clearcoat / windshield sun-glint on sunlit cars by day
            if (!v.destroyed && !mapInfo.isMotorcycle && !isMicroTwoWheeler && nfGlobal < 0.45 && vehShade < 0.35) {
                const glintPulse = 0.55 + 0.45 * Math.max(0, Math.sin(v.angle * 2.0 - sunShadowAngle + 0.8));
                const glintAlpha = 0.22 * glintPulse * (1.0 - nfGlobal * 2.0) * (1.0 - vehShade * 2.2);
                if (glintAlpha > 0.02) {
                    const gx = v.x + cosA * 3.5 - sunCos * 2.2;
                    const gy = v.y + sinA * 3.5 - sunSin * 2.2;
                    this.pushSolidQuad3D(gx, gy, vz + airZ + 0.011, 6.5, (v.h || 22) * 0.52, v.angle, 1.0, 0.97, 0.84, glintAlpha, SPRITE_DRAW_ORDER.CAR_ROOF);
                }
            }

            // C. GTA 2 OwnCarLamps & kSynthBrake (live_geometry.cpp / synthetic_lights.cpp):
            // Physical Front Headlight Glass Lenses + Day/Night Rear Taillights, Brake Lamps & Reverse Lamps!
            // (Skipped on bicycles & e-scooters so car headlight/taillight quads don't cover thin bicycle wheels!)
            if (!v.destroyed && !mapInfo.isTank && !v.waterOnly && v.specKey !== "BMX_BIKE" && v.specKey !== "E_SCOOTER") {
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

                const isVcpdCharger = (v.specKey === "VCPD_CRUISER" || mapInfo.sprId === "73");
                const turnSig = isDriven
                    ? (v.driver === "PLAYER"
                        ? (Math.abs(v.steerAngleRad || 0) > 0.16 ? (v.steerAngleRad > 0 ? 1 : -1) : 0)
                        : (v.aiTurnSignal || 0))
                    : 0;
                const blinkOn = turnSig !== 0 && Math.sin(this.time * 11.5 + (v.sirenPhase || 0)) > 0;
                const highBeamFlash = isDriven && (v.aiFlashHeadlightsTimer || 0) > 0 && Math.sin(this.time * 24.0) > -0.15;

                for (const lat of lampOffsets) {
                    const isBlinkSide = blinkOn && lat !== 0 && (
                        turnSig === 2 ||
                        (turnSig < 0 && lat < 0) ||
                        (turnSig > 0 && lat > 0)
                    );
                    // 1) Front Headlight Lenses (bright xenon-white when driven at dusk/night or flashing high-beams, crisp silver-blue glass housing by day)
                    //    If front-dented on VCPD Charger, right headlight (lat > 0) is shattered out!
                    const rightLampBroken = isVcpdCharger && (v.frontDented || v.heavyDented) && lat > 0;
                    if (!rightLampBroken) {
                        const fx = v.x + cosA * frontDist - sinA * lat;
                        const fy = v.y + sinA * frontDist + cosA * lat;
                        if (highBeamFlash) {
                            this.pushSolidQuad3D(fx, fy, vz + airZ + totalPitchZ + 0.014, 3.8, 3.0, v.angle, 1.0, 0.99, 0.92, 0.99, SPRITE_DRAW_ORDER.CAR_ROOF);
                        } else if (isDriven && nfGlobal > 0.15) {
                            this.pushSolidQuad3D(fx, fy, vz + airZ + totalPitchZ + 0.012, 3.0, 2.5, v.angle, 1.0, 0.98, 0.88, 0.96, SPRITE_DRAW_ORDER.CAR_ROOF);
                        } else {
                            this.pushSolidQuad3D(fx, fy, vz + airZ + totalPitchZ + 0.012, 2.4, 2.1, v.angle, 0.82, 0.91, 0.98, 0.82, SPRITE_DRAW_ORDER.CAR_ROOF);
                        }
                        if (isBlinkSide) {
                            const bLat = lat + (lat > 0 ? 1.15 : -1.15);
                            const bfx = v.x + cosA * (frontDist - 0.4) - sinA * bLat;
                            const bfy = v.y + sinA * (frontDist - 0.4) + cosA * bLat;
                            this.pushSolidQuad3D(bfx, bfy, vz + airZ + totalPitchZ + 0.015, 2.8, 2.2, v.angle, 1.0, 0.68, 0.06, 0.98, SPRITE_DRAW_ORDER.CAR_ROOF);
                        }
                    }

                    // 2) Rear Taillight / Brake / Reverse Lenses
                    const leftTailBroken = isVcpdCharger && (v.rearDented || v.heavyDented) && lat < 0;
                    if (!leftTailBroken) {
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
                        if (isBlinkSide) {
                            const bLat = lat + (lat > 0 ? 1.15 : -1.15);
                            const brx = v.x + cosA * (rearDist + 0.4) - sinA * bLat;
                            const bry = v.y + sinA * (rearDist + 0.4) + cosA * bLat;
                            this.pushSolidQuad3D(brx, bry, vz + airZ - totalPitchZ + 0.015, 2.9, 2.3, v.angle, 1.0, 0.65, 0.05, 0.98, SPRITE_DRAW_ORDER.CAR_ROOF);
                        }
                    }
                }

                // 3) Full-Width Dodge Charger LED Racetrack Tail-Light Bar on VCPD Cruiser!
                if (isVcpdCharger && (isBraking || (isDriven && nfGlobal > 0.12))) {
                    const rearBroken = Boolean(v.rearDented || v.heavyDented);
                    const barLatOff = rearBroken ? (latSpread * 0.45) : 0;
                    const barSpan = rearBroken ? (latSpread * 1.05) : (latSpread * 2.10);
                    const bx = v.x + cosA * (rearDist - 0.6) - sinA * barLatOff;
                    const by = v.y + sinA * (rearDist - 0.6) + cosA * barLatOff;
                    this.pushSolidQuad3D(
                        bx,
                        by,
                        vz + airZ - totalPitchZ + 0.013,
                        isBraking ? 2.4 : 1.8,
                        barSpan,
                        v.angle,
                        1.0,
                        isBraking ? 0.16 : 0.08,
                        0.18,
                        isBraking ? 0.96 : 0.86,
                        SPRITE_DRAW_ORDER.CAR_ROOF
                    );
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
                    const isScooter = v.specKey === "E_SCOOTER";
                    const isBicycle = v.specKey === "BMX_BIKE";
                    const bikerTypes = (isScooter || isBicycle)
                        ? ["vc_jogger", "vc_tourist", "bikini_cyan", "g2_civ_pink", "vc_tommy", "kid_skater"]
                        : ["vc_tommy", "vc_crockett", "vc_hawaiian_red", "g2_civ_aqua", "gang", "civ0"];

                    // Animated 3D Pedaling Feet on South Beach Cruiser Bike vs. Planted Deck Stance + Stem Display on E-Scooter!
                    const absSpd = Math.abs(v.speed || 0);
                    if (isBicycle) {
                        const pedalPhase = (absSpd > 6 ? (this.time * (7.5 + absSpd * 0.032)) : 0) + idHash;
                        for (const side of [-1, 1]) {
                            const pLong = -1.5 + Math.sin(pedalPhase + (side > 0 ? Math.PI : 0)) * (absSpd > 6 ? 3.4 : 1.8);
                            const pLat = side * 5.2;
                            const pxW = v.x + cosA * pLong - sinA * pLat;
                            const pyW = v.y + sinA * pLong + cosA * pLat;
                            // Dark pedal + amber reflector + rider sneaker pumping on each crank arm
                            this.pushSolidQuad3D(pxW, pyW, vz + airZ + 0.008, 3.6, 2.4, v.angle, 0.14, 0.18, 0.26, 0.96, vDrawOrder);
                            this.pushSolidQuad3D(pxW, pyW, vz + airZ + 0.011, 2.8, 1.8, v.angle, 0.96, 0.96, 0.98, 0.95, vDrawOrder);
                        }
                    } else if (isScooter) {
                        //Glowing cyan-green digital speedometer display on the handlebar stem + bright red rear fender brake LED
                        const stemX = v.x + cosA * 7.2;
                        const stemY = v.y + sinA * 7.2;
                        this.pushSolidQuad3D(stemX, stemY, vz + airZ + 0.016, 2.2, 3.0, v.angle, 0.14, 0.96, 0.88, 0.96, SPRITE_DRAW_ORDER.CAR_ROOF);
                        const fenderX = v.x - cosA * 11.2;
                        const fenderY = v.y - sinA * 11.2;
                        this.pushSolidQuad3D(fenderX, fenderY, vz + airZ + 0.012, 2.2, 3.2, v.angle, 1.0, 0.16, 0.22, 0.94, vDrawOrder);
                    }

                    // For E-Scooter, use frame 97 (compact standing/upright rider without wide straddling knees);
                    // For Bicycle & Motorcycles, use frame 84 (sitting_on_bike straddling saddle & gripping wide cruiser handlebars)!
                    const riderFrame = (v.doorOpenTimer || 0) > 0
                        ? (80 + Math.min(3, Math.floor((1.0 - v.doorOpenTimer / 0.48) * 4)))
                        : (isScooter ? 97 : 84);
                    const pedalSway = (isBicycle && absSpd > 10)
                        ? Math.sin(this.time * 11.5 + idHash) * 0.075
                        : 0;
                    // Keep bicycle rider seated on the leather saddle (-5.2) so the swept cruiser handlebars & front wicker basket stay 100% visible!
                    const seatLongOff = isBicycle ? -5.2 : (isScooter ? -1.8 : 1.5);

                    if (occSeats.length > 0) {
                        for (const occ of occSeats) {
                            const sPos = (occ.seat === 0 && (isBicycle || isScooter))
                                ? { x: v.x + cosA * seatLongOff, y: v.y + sinA * seatLongOff }
                                : (typeof v.getSeatWorldPos === "function"
                                    ? v.getSeatWorldPos(occ.seat)
                                    : { x: v.x + cosA * (occ.seat === 0 ? 1.5 : -7.5), y: v.y + sinA * (occ.seat === 0 ? 1.5 : -7.5) });
                            const isCustom24 = !((occ.pedType || "").startsWith("civ") || occ.pedType === "gang" || occ.pedType === "police" || occ.pedType === "monk");
                            const baseRScale = carScale * (1.0 + airZ * 0.22) * (isCustom24 ? 0.94 : 1.04);
                            const rScale = isScooter ? (baseRScale * 0.78) : (isBicycle ? (baseRScale * 0.80) : baseRScale);
                            this.batchPedSprite3D(
                                occ.pedType || "gang",
                                occ.seat === 0 ? riderFrame : 84,
                                sPos.x,
                                sPos.y,
                                vz + airZ + 0.014 + occ.seat * 0.002,
                                v.angle + (occ.seat === 0 ? pedalSway : 0),
                                rScale,
                                (occ.muzzleTimer || 0) > 0,
                                riderDrawOrder
                            );
                        }
                    } else {
                        const aiPedType = v.driver === "AI_COP" ? "police" : bikerTypes[idHash % bikerTypes.length];
                        const aiScale = aiPedType.startsWith("kid_")
                            ? (carScale * 0.70)
                            : (carScale * (isScooter ? 0.78 : (isBicycle ? 0.80 : 1.02)));
                        this.batchPedSprite3D(
                            aiPedType,
                            riderFrame,
                            v.x + cosA * seatLongOff,
                            v.y + sinA * seatLongOff,
                            vz + airZ + 0.014,
                            v.angle + pedalSway,
                            aiScale,
                            false,
                            riderDrawOrder
                        );
                    }
                } else if (
                    mapInfo.isConvertible ||
                    v.specKey === "MICRO_KART" ||
                    v.specKey === "AIRBOAT" ||
                    v.waterOnly
                ) {
                    const civTypes = ["civ0", "civ1", "civ2", "civ3", "gang"];
                    const seatFrame = v.specKey === "JETSKI" ? 84 : 97;
                    if (occSeats.length > 0) {
                        for (const occ of occSeats) {
                            const sPos = typeof v.getSeatWorldPos === "function"
                                ? v.getSeatWorldPos(occ.seat)
                                : { x: v.x, y: v.y };
                            const isCustom24 = !((occ.pedType || "").startsWith("civ") || occ.pedType === "gang" || occ.pedType === "police" || occ.pedType === "monk");
                            const dScale = vScale * (isCustom24 ? 0.88 : 0.98);
                            this.batchPedSprite3D(
                                occ.pedType || "gang",
                                seatFrame,
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
                        const isCenterSeat = v.specKey === "MICRO_KART" || v.specKey === "AIRBOAT" || v.specKey === "JETSKI";
                        const latOff = isCenterSeat ? 0 : -4.5;
                        const longOff = -2.0;
                        const dx = v.x + cosA * longOff - sinA * latOff;
                        const dy = v.y + sinA * longOff + cosA * latOff;
                        this.batchPedSprite3D(
                            aiPedType,
                            seatFrame,
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

            // Siren Overlays (eSpriteDrawOrder_CarRoof) — when driven or parked at an active scene with siren active
            if (!v.destroyed && (v.driver || v.sirenActive) && v.isEmergency && v.sirenActive && sirens.length > 0) {
                const sIdx = Math.floor(this.time * 10) % sirens.length;
                const sRect = sirens[sIdx];
                if (sRect) this.pushAtlasSprite3D(sRect, v.x, v.y, vz + airZ + 0.015, rot, vScale, SPRITE_DRAW_ORDER.CAR_ROOF, 1, 1, 1, 1, totalPitchZ);
            }

            // Tow Truck 3D Hydraulic Wheel-Lift Stinger Cradle, Twin Safety Chains & Taut Braided Winch Cable
            if (!v.destroyed && (v.driver === "AI_TOW" || v.specKey === "TOW_TRUCK")) {
                const cosA = Math.cos(v.angle);
                const sinA = Math.sin(v.angle);
                if (v.towingVehicle) {
                    const tv = v.towingVehicle;
                    const hitchX = v.x - cosA * ((v.w || 62) * 0.45);
                    const hitchY = v.y - sinA * ((v.w || 62) * 0.45);
                    const noseX = tv.x + Math.cos(tv.angle) * ((tv.w || 46) * 0.40);
                    const noseY = tv.y + Math.sin(tv.angle) * ((tv.w || 46) * 0.40);
                    const bdx = noseX - hitchX;
                    const bdy = noseY - hitchY;
                    const bLen = Math.hypot(bdx, bdy) || 1;
                    const bAng = Math.atan2(bdy, bdx);
                    const midX = (hitchX + noseX) * 0.5;
                    const midY = (hitchY + noseY) * 0.5;

                    // 1) Heavy Hydraulic Steel Wheel-Lift Stinger Arm under the towed car's front axle
                    this.pushSolidQuad3D(midX, midY, vz + 0.006, bLen + 6.0, 4.2, bAng, 0.22, 0.26, 0.34, 0.96, SPRITE_DRAW_ORDER.CAR);
                    this.pushSolidQuad3D(midX, midY, vz + 0.008, bLen + 4.0, 2.2, bAng, 0.96, 0.68, 0.10, 0.98, SPRITE_DRAW_ORDER.CAR);

                    // 2) Transverse Steel Tire-Cradle Crossbar gripping the towed vehicle's front wheels
                    this.pushSolidQuad3D(noseX, noseY, vz + 0.007, 4.0, 18.0, tv.angle, 0.96, 0.68, 0.10, 0.96, SPRITE_DRAW_ORDER.CAR);

                    // 3) Elevated Taut Braided Steel Crane Boom Cable from Wrecker Pulley Head to Towed Bumper
                    const boomTipX = v.x - cosA * ((v.w || 62) * 0.34);
                    const boomTipY = v.y - sinA * ((v.w || 62) * 0.34);
                    const cDx = noseX - boomTipX;
                    const cDy = noseY - boomTipY;
                    const cLen = Math.hypot(cDx, cDy) || 1;
                    const cAng = Math.atan2(cDy, cDx);
                    this.pushSolidQuad3D(
                        (boomTipX + noseX) * 0.5,
                        (boomTipY + noseY) * 0.5,
                        vz + 0.018,
                        cLen,
                        1.6,
                        cAng,
                        0.78,
                        0.84,
                        0.92,
                        0.95,
                        SPRITE_DRAW_ORDER.CAR_ROOF
                    );
                }
            }

            // Tank Turret & Barrel (Sprite 267 — eSpriteDrawOrder_CarRoof)
            if (mapInfo.isTank) {
                const turretRect = this.gta1Meta.sprites.objects["267"];
                if (turretRect) {
                    const tRot = (v.turretAngle || v.angle) - Math.PI * 0.5 + (v.destroyed ? 0.28 : 0);
                    const tTint = v.destroyed ? 0.42 : 1.0;
                    this.pushAtlasSprite3D(
                        turretRect,
                        v.x,
                        v.y,
                        vz + 0.02,
                        tRot,
                        carScale,
                        SPRITE_DRAW_ORDER.CAR_ROOF,
                        tTint,
                        tTint * 0.94,
                        tTint * 0.88,
                        1
                    );
                }
            }

            if (v.destroyed && !v.fireExtinguished && v.specKey !== "BMX_BIKE" && v.specKey !== "E_SCOOTER") {
                const frameId = 234 + (Math.floor(this.time * 11 + Math.abs(v.x * 0.1)) % 8);
                const isMotoOrKart = Boolean(mapInfo.isMotorcycle || v.specKey === "MICRO_KART");
                const isHeavyLong = (v.w || 48) >= 75;
                const engOff = isMotoOrKart ? 0 : ((v.w || 48) * 0.22);
                const fireScale = isMotoOrKart ? 0.46 : (isHeavyLong ? 0.72 : 0.60);
                this.batchObjectSprite3D(
                    String(frameId),
                    v.x + cosA * engOff,
                    v.y + sinA * engOff,
                    vz + 0.03,
                    0,
                    fireScale,
                    SPRITE_DRAW_ORDER.EXPLOSION
                );
                if (isHeavyLong) {
                    const rearFrameId = 234 + (Math.floor(this.time * 9 + Math.abs(v.y * 0.1) + 3) % 8);
                    this.batchObjectSprite3D(
                        String(rearFrameId),
                        v.x - cosA * ((v.w || 88) * 0.18),
                        v.y - sinA * ((v.w || 88) * 0.18),
                        vz + 0.028,
                        0,
                        0.54,
                        SPRITE_DRAW_ORDER.EXPLOSION
                    );
                }
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
                this.batchObjectSprite3D("260", baseX - 16, baseY, cz + 0.15, swing, 1.15, SPRITE_DRAW_ORDER.TREES);
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
                const bpVis = this._queryStaticChunkGrid(this.map.beachProps, "x", "y", minX, minY, maxX, maxY);
                for (let vi = 0; vi < bpVis.length; vi++) {
                    const bp = bpVis[vi];
                    if (bp.spr && bp.spr.startsWith("lifeguard_")) continue;
                    if (bp.x < minX || bp.x > maxX || bp.y < minY || bp.y > maxY) continue;
                    const bz = this.getEntityZ(bp, 0.04) + (bp.zOff || 0.03);
                    this.batchObjectSprite3D(bp.spr, bp.x, bp.y, bz, bp.angle || 0, bp.scale || 1.0, SPRITE_DRAW_ORDER.MAP_OBJECT);
                }
            }
            if (this.map.beachUmbrellas) {
                const umbVis = this._queryStaticChunkGrid(this.map.beachUmbrellas, "x", "y", minX, minY, maxX, maxY);
                for (let vi = 0; vi < umbVis.length; vi++) {
                    const umb = umbVis[vi];
                    if (umb.x < minX || umb.x > maxX || umb.y < minY || umb.y > maxY) continue;
                    const uz = this.getEntityZ(umb, 0.04);
                    if ((umb.wipeoutTimer || 0) > 0) {
                        this.renderSmashedParasol3D(umb.spr || "umbrella_pink", umb.x, umb.y, uz, umb.knockAng || 0, 0.92);
                    } else {
                        this.batchObjectSprite3D(umb.spr || "umbrella_pink", umb.x, umb.y, uz + 0.08, umb.angle || 0, 0.92, SPRITE_DRAW_ORDER.TREES);
                    }
                }
            }
            this.renderViceBeachActivities3D(game, minX, minY, maxX, maxY, sunCos, sunSin, sunShadowAngle, sunShadowAlpha, nfGlobal);
            if (this.map.vicePalms) {
                const palmVis = this._queryStaticChunkGrid(this.map.vicePalms, "x", "y", minX, minY, maxX, maxY, "_palmIdx");
                for (let vi = 0; vi < palmVis.length; vi++) {
                    const pm = palmVis[vi];
                    if (pm.x < minX || pm.x > maxX || pm.y < minY || pm.y > maxY) continue;
                    this.renderLeonidaFlora3D(pm, pm._palmIdx !== undefined ? pm._palmIdx : vi, sunShadowAngle, sunShadowAlpha, nfGlobal);
                }
            }

            // 7B. Deep-Dive Vice City Architectural Streetscape Props (Ocean Drive Café Parasol Sprites & Española Bistro Lights)
            if (Array.isArray(this.map.viceStreetDetails)) {
                const vdVis = this._queryStaticChunkGrid(this.map.viceStreetDetails, "x", "y", minX, minY, maxX, maxY);
                for (let vi = 0; vi < vdVis.length; vi++) {
                    const vd = vdVis[vi];
                    if (vd.x < minX || vd.x > maxX || vd.y < minY || vd.y > maxY) continue;
                    const vz = (vd.z !== undefined ? vd.z : 2.0);
                    if (vd.kind === "CAFE_TABLE") {
                        const umbSpr = vd.theme === "PINK" ? "umbrella_pink" : "umbrella_cyan";
                        const vdWiped = (vd.wipeoutTimer || 0) > 0;
                        const tblHash = Math.abs(Math.round(vd.y / 64));
                        const northPeds = ["bikini_pink", "vc_crockett", "vc_tourist", "bikini_cyan"];
                        const southPeds = ["vc_tommy", "bikini_cyan", "bikini_pink", "g2_civ_aqua"];
                        const hasUmb = (tblHash % 2) === 0;
                        const seatMode = tblHash % 3;
                        let pNorth = (!vdWiped && seatMode <= 1) ? northPeds[tblHash % northPeds.length] : null;
                        let pSouth = (!vdWiped && seatMode === 0) ? southPeds[tblHash % southPeds.length] : null;
                        if (game && game.player && game.player.isSitting && game.player.sittingProp === vd) {
                            if (game.player.sittingSeat === 0) pNorth = null;
                            else pSouth = null;
                        }
                        this.renderBistroTableScene3D(
                            vd.x,
                            vd.y,
                            vz,
                            pNorth,
                            pSouth,
                            vd.theme || "CYAN",
                            false
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
                    } else if (vd.kind === "SERPENTINE_WALL") {
                        // Iconic Lummus Park 3D Undulating Art Deco Low Serpentine Wall (Ocean Drive & Vice Beach border)
                        const wAng = vd.angle || 0;
                        const wLen = vd.len || 66;
                        const isPink = vd.theme === "PINK";
                        // Cast shadow on coral pavers/sand
                        this.pushSolidQuad3D(
                            vd.x + sunCos * 5.0,
                            vd.y + sunSin * 5.0,
                            vz + 0.003,
                            5.5,
                            wLen,
                            wAng,
                            0.04,
                            0.06,
                            0.10,
                            sunShadowAlpha * 0.45,
                            SPRITE_DRAW_ORDER.SKIDMARKS
                        );
                        // Cream-white Art Deco stucco low ribbon wall base
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.055, 6.2, wLen, wAng, 0.96, 0.93, 0.87, 0.98, SPRITE_DRAW_ORDER.PEDESTRIANS);
                        // Pastel coral-pink or tropical turquoise Art Deco top coping cap
                        this.pushSolidQuad3D(
                            vd.x,
                            vd.y,
                            vz + 0.085,
                            4.4,
                            wLen - 1.5,
                            wAng,
                            isPink ? 0.96 : 0.28,
                            isPink ? 0.54 : 0.86,
                            isPink ? 0.72 : 0.88,
                            0.98,
                            SPRITE_DRAW_ORDER.PEDESTRIANS
                        );
                        // Subtle recessed neon tube accent strip
                        if (nfGlobal > 0.05) {
                            this.pushSolidQuad3D(
                                vd.x - 1.8,
                                vd.y,
                                vz + 0.070,
                                1.4,
                                wLen - 4.0,
                                wAng,
                                isPink ? 1.0 : 0.20,
                                isPink ? 0.32 : 0.95,
                                isPink ? 0.78 : 1.0,
                                Math.min(0.95, 0.35 + nfGlobal * 0.60),
                                SPRITE_DRAW_ORDER.PEDESTRIANS
                            );
                        }
                    } else if (vd.kind === "VALET_PODIUM") {
                        // Ocean Drive Art Deco Hotel Valet Stand & Neon Podium
                        const isPink = vd.theme === "PINK";
                        this.pushSolidQuad3D(vd.x + sunCos * 4.5, vd.y + sunSin * 4.5, vz + 0.003, 9, 9, 0, 0.04, 0.06, 0.10, sunShadowAlpha * 0.45, SPRITE_DRAW_ORDER.SKIDMARKS);
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.06, 7.5, 9.5, 0, 0.94, 0.91, 0.86, 0.98, SPRITE_DRAW_ORDER.PEDESTRIANS);
                        this.pushSolidQuad3D(vd.x, vd.y, vz + 0.11, 5.5, 7.5, 0, isPink ? 0.96 : 0.22, isPink ? 0.36 : 0.86, isPink ? 0.68 : 0.94, 0.98, SPRITE_DRAW_ORDER.PEDESTRIANS);
                    } else if (vd.kind === "CUBA_DOMINO_TABLE") {
                        // Little Cuba (Calle Ocho / Maximo Gomez Domino Park) 1:1 Scale Sidewalk Domino Table & Seated Guayabera Players
                        this.renderDominoTableScene3D(vd.x, vd.y, vz, (vd.wipeoutTimer || 0) > 0);
                    }
                }
            }
        }
        if (this.map && Array.isArray(this.map.trees)) {
            const trVis = this._queryStaticChunkGrid(this.map.trees, "x", "y", minX, minY, maxX, maxY);
            for (let vi = 0; vi < trVis.length; vi++) {
                const tr = trVis[vi];
                if (tr.x < minX || tr.x > maxX || tr.y < minY || tr.y > maxY) continue;
                this.batchObjectSprite3D("257", tr.x, tr.y, this.getEntityZ(tr, 0.12), 0, (tr.scale || 1.0), SPRITE_DRAW_ORDER.TREES);
            }
        }

        // 7C. Daytime Solar Ground Shadows for 3D Curb Streetlamps (3D volumetric pole, arm & luminaire rendered by WorldObjectEngine!)
        if (this.map && Array.isArray(this.map.streetlights)) {
            const nf = nfGlobal;
            if (nf < 0.85) {
                const slVis = this._queryStaticChunkGrid(this.map.streetlights, "baseX", "baseY", minX, minY, maxX, maxY);
                for (let vi = 0; vi < slVis.length; vi++) {
                    const sl = slVis[vi];
                    if (sl.state === 2) continue;
                    if (sl.baseX < minX || sl.baseX > maxX || sl.baseY < minY || sl.baseY > maxY) continue;
                    const sz = sl.z || 2.0;
                    const shX = sl.baseX + Math.cos(sunShadowAngle) * (sunShadowLen * 0.5);
                    const shY = sl.baseY + Math.sin(sunShadowAngle) * (sunShadowLen * 0.5);
                    this.pushSolidQuad3D(shX, shY, sz + 0.018, sunShadowLen, 2.5, sunShadowAngle, 0.04, 0.06, 0.10, 0.34 * (1.0 - nf * 0.8), SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }
        }

        // 7C-bis. Short Daytime Solar Ground Shadows for 3D Low Park & Promenade Bollard Lights
        if (this.map && Array.isArray(this.map.parkBollardLights)) {
            const nf = nfGlobal;
            if (nf < 0.85) {
                const bollardShadowLen = sunShadowLen * 0.32;
                const blVis = this._queryStaticChunkGrid(this.map.parkBollardLights, "x", "y", minX, minY, maxX, maxY);
                for (let vi = 0; vi < blVis.length; vi++) {
                    const bl = blVis[vi];
                    if (bl.state === 2) continue;
                    if (bl.x < minX || bl.x > maxX || bl.y < minY || bl.y > maxY) continue;
                    const sz = bl.z || 2.0;
                    const shX = bl.x + Math.cos(sunShadowAngle) * (bollardShadowLen * 0.5);
                    const shY = bl.y + Math.sin(sunShadowAngle) * (bollardShadowLen * 0.5);
                    this.pushSolidQuad3D(shX, shY, sz + 0.018, bollardShadowLen, 3.2, sunShadowAngle, 0.04, 0.06, 0.10, 0.30 * (1.0 - nf * 0.8), SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }
        }

        // 7C-ter. Off-Street Asphalt Surface Parking Lots & Recessed Boulevard Curbside Parking Bays (World-Space Procedural Asphalt + Worn Paint)
        if (this.map && Array.isArray(this.map.surfaceParkingLots)) {
            for (let li = 0; li < this.map.surfaceParkingLots.length; li++) {
                const lot = this.map.surfaceParkingLots[li];
                const cx = ((lot.asphaltMinX + lot.asphaltMaxX + 1) * 0.5) * TILE_SIZE;
                const cy = ((lot.asphaltMinY + lot.asphaltMaxY + 1) * 0.5) * TILE_SIZE;
                if (cx < minX - 220 || cx > maxX + 220 || cy < minY - 220 || cy > maxY + 220) continue;
                const lotW = (lot.asphaltMaxX - lot.asphaltMinX + 1) * TILE_SIZE - 4.0;
                const lotH = (lot.asphaltMaxY - lot.asphaltMinY + 1) * TILE_SIZE - 4.0;
                // Procedural world-space asphalt pad with 3D stone curb border & building cast shadows (uDayLightTex)
                this.pushAsphaltBayQuad3D(cx, cy, 2.012, lotW + 6.0, lotH + 6.0, false, 1, SPRITE_DRAW_ORDER.TIRE_MARKS);
                // Subtle worn drive-aisle directional lane dashes
                if (lot.orientation === "H" && lot.aisleRow !== undefined) {
                    const ay = (lot.aisleRow + 0.5) * TILE_SIZE;
                    this.pushWornPaintQuad3D(cx - 48.0, ay, 2.015, 22.0, 1.5, 0, 0.78, 0.76, 0.72, 0.34, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushWornPaintQuad3D(cx + 48.0, ay, 2.015, 22.0, 1.5, 0, 0.78, 0.76, 0.72, 0.34, SPRITE_DRAW_ORDER.TIRE_MARKS);
                } else if (lot.aisleCol !== undefined) {
                    const ax = (lot.aisleCol + 0.5) * TILE_SIZE;
                    this.pushWornPaintQuad3D(ax, cy - 48.0, 2.015, 1.5, 22.0, 0, 0.78, 0.76, 0.72, 0.34, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushWornPaintQuad3D(ax, cy + 48.0, 2.015, 1.5, 22.0, 0, 0.78, 0.76, 0.72, 0.34, SPRITE_DRAW_ORDER.TIRE_MARKS);
                }
            }
        }
        if (this.map && Array.isArray(this.map.curbParkingStrips)) {
            for (let si = 0; si < this.map.curbParkingStrips.length; si++) {
                const st = this.map.curbParkingStrips[si];
                const stripCy = (st.yMin + st.yMax) * 0.5;
                const stripH = st.yMax - st.yMin;
                // Extend 8px across roadEdgeX so the recessed asphalt bay covers the road's yellow curb line and merges 100% seamlessly into the street
                const padW = st.bayDepth + 8.0;
                const padCx = st.roadEdgeX - st.dc * ((st.bayDepth - 8.0) * 0.5);
                if (padCx < minX - 120 || padCx > maxX + 120 || st.yMax < minY - 60 || st.yMin > maxY + 60) continue;
                const sz = st.z || 2.0;
                this.pushAsphaltBayQuad3D(
                    padCx,
                    stripCy,
                    sz + 0.012,
                    padW,
                    stripH + 4.0,
                    true,
                    st.dc,
                    SPRITE_DRAW_ORDER.TIRE_MARKS,
                    Boolean(st.darkAsphalt)
                );
            }
        }
        if (this.map && this.map.objectEngine && Array.isArray(this.map.objectEngine.estateDriveways)) {
            for (let di = 0; di < this.map.objectEngine.estateDriveways.length; di++) {
                const dw = this.map.objectEngine.estateDriveways[di];
                if (dw.x < minX - 64 || dw.x > maxX + 64 || dw.y < minY - 64 || dw.y > maxY + 64) continue;
                const dz = dw.z || 2.0;
                const ca = Math.cos(dw.angle || 0);
                const sa = Math.sin(dw.angle || 0);
                // Architectural private villa parking pad (paved dark slate border + worn corner L-brackets + concrete wheel stop)
                this.pushSolidQuad3D(dw.x, dw.y, dz + 0.011, 66.0, 36.0, dw.angle || 0, 0.22, 0.24, 0.27, 0.72, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(dw.x, dw.y, dz + 0.012, 62.0, 32.0, dw.angle || 0, 0.27, 0.30, 0.33, 0.82, SPRITE_DRAW_ORDER.TIRE_MARKS);
                for (const sgnX of [-1, 1]) {
                    for (const sgnY of [-1, 1]) {
                        const lx = dw.x + ca * (sgnX * 29.0) - sa * (sgnY * 14.5);
                        const ly = dw.y + sa * (sgnX * 29.0) + ca * (sgnY * 14.5);
                        this.pushWornPaintQuad3D(lx - ca * (sgnX * 4.5), ly - sa * (sgnX * 4.5), dz + 0.014, 9.0, 1.5, dw.angle || 0, 0.85, 0.82, 0.74, 0.52, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushWornPaintQuad3D(lx - (-sa * (sgnY * 4.0)), ly - (ca * (sgnY * 4.0)), dz + 0.014, 1.5, 8.0, dw.angle || 0, 0.85, 0.82, 0.74, 0.52, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                }
                const stopX = dw.x + ca * 24.5;
                const stopY = dw.y + sa * 24.5;
                this.pushSolidQuad3D(stopX + 1.0, stopY + 1.0, dz + 0.015, 3.2, 22.0, dw.angle || 0, 0.06, 0.08, 0.11, 0.42, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushSolidQuad3D(stopX, stopY, dz + 0.018, 2.6, 21.0, dw.angle || 0, 0.78, 0.76, 0.70, 0.88, SPRITE_DRAW_ORDER.TIRE_MARKS);
            }
        }
        if (this.map && Array.isArray(this.map.curbParkingBays)) {
            const nf = nfGlobal;
            const meterShadowLen = sunShadowLen * 0.25;
            const bayVis = this._queryStaticChunkGrid(this.map.curbParkingBays, "x", "y", minX - 80, minY - 80, maxX + 80, maxY + 80, "_bayIdx");
            for (let vi = 0; vi < bayVis.length; vi++) {
                const bay = bayVis[vi];
                const bi = bay._bayIdx !== undefined ? bay._bayIdx : vi;
                const scx = bay.stallCenterX !== undefined ? bay.stallCenterX : bay.x;
                const scy = bay.stallCenterY !== undefined ? bay.stallCenterY : bay.y;
                if (scx < minX - 56 || scx > maxX + 56 || scy < minY - 56 || scy > maxY + 56) continue;
                const sz = bay.z || 2.0;
                const stallAng = bay.dc ? (bay.dc > 0 ? Math.PI * 0.5 : -Math.PI * 0.5) : (bay.angle || 0);
                const ca = Math.cos(stallAng);
                const sa = Math.sin(stallAng);
                const crossAng = stallAng + Math.PI * 0.5;
                // Sun-faded, weathered road paint color + per-stall wear variance (shaded dynamically by applyRoadLighting in spriteFS)
                const pw = 0.78;
                const pg = 0.77;
                const pb = 0.72;
                const wearAlpha = 0.34 + ((bi * 17) % 5) * 0.028;

                // Subtle dark engine-oil / tire-drip stain in the middle of each stall
                const oilOff = (((bi * 13) % 5) - 2) * 1.6;
                this.pushWornPaintQuad3D(
                    scx + ca * oilOff,
                    scy + sa * oilOff,
                    sz + 0.015,
                    15.0,
                    7.5,
                    stallAng,
                    0.15,
                    0.17,
                    0.20,
                    0.16,
                    SPRITE_DRAW_ORDER.TIRE_MARKS
                );

                if (bay.isLotParked) {
                    // Off-Street Asphalt Parking Lot 90° Perpendicular Stall Lines (wide 74px spacing, thin 1.4px worn lines) + Concrete Wheel Stop
                    const nx = -sa;
                    const ny = ca;
                    const halfW = bay.stallWidth ? (bay.stallWidth * 0.5) : 37.0;
                    this.pushWornPaintQuad3D(scx + nx * halfW, scy + ny * halfW, sz + 0.016, 48.0, 1.4, stallAng, pw, pg, pb, wearAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    this.pushWornPaintQuad3D(scx - nx * halfW, scy - ny * halfW, sz + 0.016, 48.0, 1.4, stallAng, pw, pg, pb, wearAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    if (bay.wheelStopX !== undefined && bay.wheelStopY !== undefined) {
                        this.pushWornPaintQuad3D(bay.wheelStopX, bay.wheelStopY, sz + 0.018, 34.0, 4.2, crossAng, 0.12, 0.14, 0.17, 0.48, SPRITE_DRAW_ORDER.TIRE_MARKS);
                        this.pushWornPaintQuad3D(bay.wheelStopX, bay.wheelStopY, sz + 0.022, 32.0, 3.0, crossAng, 0.72, 0.67, 0.48, 0.85, SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                    continue;
                }

                // Spacious Miami curbside parallel parking T-ticks / L-corner marks (82..86px long x 42px wide bay, thin 1.4px worn paint)
                const halfL = bay.stallLen ? (bay.stallLen * 0.5) : 41.0;
                const tickCenterX = scx + (bay.dc || 0) * 11.5;
                const tickCenterY = scy + (bay.dr || 0) * 11.5;
                this.pushWornPaintQuad3D(tickCenterX + ca * halfL, tickCenterY + sa * halfL, sz + 0.016, 13.0, 1.4, crossAng, pw, pg, pb, wearAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushWornPaintQuad3D(tickCenterX - ca * halfL, tickCenterY - sa * halfL, sz + 0.016, 13.0, 1.4, crossAng, pw, pg, pb, wearAlpha, SPRITE_DRAW_ORDER.TIRE_MARKS);

                // Short longitudinal L-corner ticks along the lane edge
                const edgeX = scx + (bay.dc || 0) * 17.5;
                const edgeY = scy + (bay.dr || 0) * 17.5;
                this.pushWornPaintQuad3D(edgeX + ca * (halfL - 5.0), edgeY + sa * (halfL - 5.0), sz + 0.016, 10.0, 1.4, stallAng, pw, pg, pb, wearAlpha * 0.90, SPRITE_DRAW_ORDER.TIRE_MARKS);
                this.pushWornPaintQuad3D(edgeX - ca * (halfL - 5.0), edgeY - sa * (halfL - 5.0), sz + 0.016, 10.0, 1.4, stallAng, pw, pg, pb, wearAlpha * 0.90, SPRITE_DRAW_ORDER.TIRE_MARKS);

                // 3D Sidewalk Parking Meter Post & Digital Dual-Head Housing (only 1 dual-head meter per 2 stalls!)
                const mx = bay.meterX;
                const my = bay.meterY;
                if (bay.hasMeter !== false && mx !== undefined && my !== undefined) {
                    if (nf < 0.85) {
                        const shX = mx + Math.cos(sunShadowAngle) * (meterShadowLen * 0.5);
                        const shY = my + Math.sin(sunShadowAngle) * (meterShadowLen * 0.5);
                        this.pushSolidQuad3D(shX, shY, sz + 0.016, meterShadowLen, 2.0, sunShadowAngle, 0.04, 0.06, 0.10, 0.25 * (1.0 - nf * 0.8), SPRITE_DRAW_ORDER.TIRE_MARKS);
                    }
                    this.pushSolidQuad3D(mx, my, sz + 0.015, 3.4, 3.4, 0, 0.15, 0.20, 0.28, 0.92, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.pushSolidQuad3D(mx, my, sz + 0.075, 2.1, 2.1, 0, 0.42, 0.49, 0.58, 0.95, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    this.pushSolidQuad3D(mx, my, sz + 0.140, 4.2, 2.8, stallAng, 0.22, 0.28, 0.36, 0.95, SPRITE_DRAW_ORDER.PEDESTRIAN);
                    const isGreenLed = !bay.emptyStall ? (((bi * 7) % 5) !== 0) : true;
                    this.pushSolidQuad3D(
                        mx,
                        my,
                        sz + 0.156,
                        2.0,
                        1.3,
                        stallAng,
                        isGreenLed ? 0.16 : 0.88,
                        isGreenLed ? 0.84 : 0.24,
                        isGreenLed ? 0.48 : 0.28,
                        0.90,
                        SPRITE_DRAW_ORDER.PEDESTRIAN
                    );
                }
            }
        }

        // 7D. Daytime Solar Ground Shadows for 3D Traffic Signal Gantries (3D volumetric gantry, mast arm & 3-lens box rendered by WorldObjectEngine!)
        this.lastGameRef = game;
        if (this.map && Array.isArray(this.map.trafficSignals)) {
            const nf = Math.max(0, Math.min(1, this.nightFactor || 0));
            if (nf < 0.85) {
                const tsVis = this._queryStaticChunkGrid(this.map.trafficSignals, "baseX", "baseY", minX, minY, maxX, maxY);
                for (let vi = 0; vi < tsVis.length; vi++) {
                    const ts = tsVis[vi];
                    if (ts.state === 2) continue;
                    if (ts.baseX < minX || ts.baseX > maxX || ts.baseY < minY || ts.baseY > maxY) continue;
                    const sz = ts.z || 2.0;
                    const shX = ts.baseX + Math.cos(sunShadowAngle) * (sunShadowLen * 0.6);
                    const shY = ts.baseY + Math.sin(sunShadowAngle) * (sunShadowLen * 0.6);
                    this.pushSolidQuad3D(shX, shY, sz + 0.018, sunShadowLen * 1.2, 3.0, sunShadowAngle, 0.04, 0.06, 0.10, 0.34 * (1.0 - nf * 0.8), SPRITE_DRAW_ORDER.TIRE_MARKS);
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
            } else if (pt.kind === "SPRAY") {
                // Black spray-paint aerosol mist from the graffiti can (expands & fades)
                const sz = (pt.size || 3) * (1.0 + prog * 1.4);
                this.pushSolidQuad3D(pt.x, pt.y, pz, sz, sz, 0, 0.04, 0.04, 0.05, 0.85 * (1.0 - prog), SPRITE_DRAW_ORDER.PROJECTILES);
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
            // Active Mission 3D Ground Beacon Corona (pulsing gold & cyan objective marker on the street!)
            if (game.missions && game.missions.activeMission && dist < 900) {
                const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
                const tz = game.map.getHeightAtPx(target.x, target.y) + 0.03;
                const ringSz = 38 + pulse * 14;
                this.pushSolidQuad3D(target.x, target.y, tz, ringSz, ringSz, performance.now() * 0.002, 1.0, 0.85, 0.15, 0.28 + pulse * 0.22, SPRITE_DRAW_ORDER.DECALS);
                this.pushSolidQuad3D(target.x, target.y, tz + 0.01, ringSz * 0.58, ringSz * 0.58, -performance.now() * 0.003, 0.0, 0.94, 1.0, 0.35 + pulse * 0.25, SPRITE_DRAW_ORDER.DECALS);
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
        // Sun positioned above top-left / top-right horizon depending on time of day (06:00 East -> 12:00 South -> 18:00 West)
        const dayProgress = Math.max(0, Math.min(1, (clockHr - 6.0) / 12.0));
        const sunX = W * (0.82 - dayProgress * 0.64);
        const sunY = -H * 0.10;
        const maxDim = Math.hypot(W, H);

        ctx.save();

        // 1. Directional Soft-Light Solar Grading (boosts golden warmth in sunlit areas & cool tropical azure in shadows without greying out dark asphalt!)
        ctx.globalCompositeOperation = "soft-light";
        const toneGrad = ctx.createLinearGradient(sunX, 0, W - sunX, H);
        toneGrad.addColorStop(0.0, `rgba(255, 224, 132, ${(0.22 * dayInt).toFixed(3)})`);
        toneGrad.addColorStop(0.55, `rgba(255, 236, 178, ${(0.10 * dayInt).toFixed(3)})`);
        toneGrad.addColorStop(1.0, `rgba(56, 148, 225, ${(0.08 * dayInt).toFixed(3)})`);
        ctx.fillStyle = toneGrad;
        ctx.fillRect(0, 0, W, H);

        // 2. Crisp Golden Florida Solar Corona & Corner Rim Glow (tighter radius near the sun horizon so roads in the center stay deep & contrasty)
        ctx.globalCompositeOperation = "screen";
        const sunGrad = ctx.createRadialGradient(sunX, sunY, maxDim * 0.02, sunX, sunY, maxDim * 0.68);
        sunGrad.addColorStop(0.0, `rgba(255, 246, 200, ${(0.20 * dayInt).toFixed(3)})`);
        sunGrad.addColorStop(0.28, `rgba(255, 222, 142, ${(0.09 * dayInt).toFixed(3)})`);
        sunGrad.addColorStop(0.62, `rgba(255, 198, 112, ${(0.025 * dayInt).toFixed(3)})`);
        sunGrad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, W, H);

        // 3. Feathered Elliptical Volumetric Sunbeams (100% radial-gradient feathered edges — zero hard polygon lines!)
        ctx.globalCompositeOperation = "lighter";
        const baseRayAngle = Math.atan2(H * 0.85, W * 0.50 - sunX);
        const camPhase = (this.camX * 0.0020 + this.camY * 0.0015);
        for (let i = 0; i < 4; i++) {
            const rayWave = 0.72 + 0.28 * Math.sin(this.time * 0.80 + camPhase + i * 1.57);
            const ang = baseRayAngle + (i - 1.5) * 0.14;
            const lenR = maxDim * 0.62;
            const widR = W * (0.08 + (i % 2) * 0.022);

            ctx.save();
            ctx.translate(sunX, sunY);
            ctx.rotate(ang);
            ctx.scale(lenR, widR);

            const rg = ctx.createRadialGradient(0.48, 0.0, 0.02, 0.48, 0.0, 0.62);
            const a0 = (0.016 * dayInt * rayWave).toFixed(4);
            const a1 = (0.006 * dayInt * rayWave).toFixed(4);
            rg.addColorStop(0.0, `rgba(255, 244, 198, ${a0})`);
            rg.addColorStop(0.50, `rgba(255, 224, 154, ${a1})`);
            rg.addColorStop(1.0, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(0.48, 0.0, 0.62, 0, Math.PI * 2);
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

        const scale = this.isMobileInit ? 0.35 : 0.5;
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

        if (!this._lightStampCache) {
            this._lightStampCache = new Map();
        }
        const getLightStamp = (key, stops) => {
            let stamp = this._lightStampCache.get(key);
            if (!stamp) {
                stamp = document.createElement("canvas");
                stamp.width = 64;
                stamp.height = 64;
                const sctx = stamp.getContext("2d");
                const g = sctx.createRadialGradient(32, 32, stops[0][0] * 32, 32, 32, 32);
                for (let i = 0; i < stops.length; i++) {
                    g.addColorStop(stops[i][1], stops[i][2]);
                }
                sctx.fillStyle = g;
                sctx.fillRect(0, 0, 64, 64);
                this._lightStampCache.set(key, stamp);
            }
            return stamp;
        };

        const addLightPool = (sx, sy, radPx, innerCol, midCol) => {
            const x = sx * scale;
            const y = sy * scale;
            const r = Math.max(4, radPx * scale);
            if (x + r < 0 || x - r > lw || y + r < 0 || y - r > lh) return;
            const stamp = getLightStamp(`pool|${innerCol}|${midCol}`, [
                [0.05, 0.0, innerCol],
                [0.05, 0.48, midCol],
                [0.05, 1.0, "rgba(0, 0, 0, 0)"]
            ]);
            lctx.drawImage(stamp, x - r, y - r, r * 2, r * 2);
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

            // Draw smooth feathered wide-base trapezoidal fan layers so the beam starts across both headlights with soft, band-free side edges
            const layers = [
                { sp: spreadRad * 1.15, wMult: 1.10, alpha: 0.14 },
                { sp: spreadRad * 1.00, wMult: 1.02, alpha: 0.18 },
                { sp: spreadRad * 0.85, wMult: 0.94, alpha: 0.22 },
                { sp: spreadRad * 0.70, wMult: 0.84, alpha: 0.24 },
                { sp: spreadRad * 0.52, wMult: 0.72, alpha: 0.24 },
                { sp: spreadRad * 0.34, wMult: 0.56, alpha: 0.20 }
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
            const slNightVis = this._queryStaticChunkGrid(this.map.streetlights, "baseX", "baseY", this.camX - 960, this.camY - 720, this.camX + 960, this.camY + 720);
            for (let vi = 0; vi < slNightVis.length; vi++) {
                const sl = slNightVis[vi];
                // Knocked-down streetlamps (state === 2) have their bulb smashed and emit no light!
                if (sl.state === 2) continue;
                // Damaged/bent streetlamps (state === 1) flicker intermittently!
                if (sl.state === 1 && Math.sin(this.time * 28.0 + sl.baseX) <= -0.25) continue;

                const effHX = sl.headX + (sl.state === 1 ? (sl.tiltDx || 0) : 0);
                const effHY = sl.headY + (sl.state === 1 ? (sl.tiltDy || 0) : 0);
                if (Math.abs(effHX - this.camX) > 920 || Math.abs(effHY - this.camY) > 680) continue;
                const sz = sl.z || 2.0;
                const zDrop = sl.state === 1 ? 0.06 : 0.0;
                // Ground light pool projected out onto the asphalt street & curb directly beneath the overhanging luminaire head
                const poolX = effHX + Math.cos(sl.armAngle) * 10.0;
                const poolY = effHY + Math.sin(sl.armAngle) * 10.0;
                const gSc = this.worldToScreen(poolX, poolY, sz + 0.03);
                if (gSc.x < -180 || gSc.x > W + 180 || gSc.y < -180 || gSc.y > H + 180) continue;
                const pxScale = (gSc.scale * H) / 128.0;

                // Elevated 3D lamp head position for the soft, translucent golden-yellow radial halo
                const hSc = this.worldToScreen(effHX, effHY, sz + 0.54 - zDrop);

                if (sl.colorType === "SODIUM") {
                    addLightPool(gSc.x, gSc.y, 92 * pxScale, "rgba(255, 202, 88, 0.78)", "rgba(230, 142, 32, 0.28)");
                    highResFlares.push({
                        x: hSc.x,
                        y: hSc.y,
                        r: 32 * pxScale,
                        isLampHalo: true,
                        warmSodium: true
                    });
                } else {
                    addLightPool(gSc.x, gSc.y, 95 * pxScale, "rgba(255, 218, 104, 0.80)", "rgba(240, 165, 42, 0.30)");
                    highResFlares.push({
                        x: hSc.x,
                        y: hSc.y,
                        r: 34 * pxScale,
                        isLampHalo: true,
                        warmSodium: false
                    });
                }
            }
        }

        // 2A-bis. Low Park, Promenade & Villa Walkway Bollard Lights (this.map.parkBollardLights)
        //         Casts a compact, downward-directed warm landscape light pool right onto the adjacent grass & path
        if (this.map && Array.isArray(this.map.parkBollardLights)) {
            const blNightVis = this._queryStaticChunkGrid(this.map.parkBollardLights, "x", "y", this.camX - 980, this.camY - 760, this.camX + 980, this.camY + 760);
            for (let vi = 0; vi < blNightVis.length; vi++) {
                const bl = blNightVis[vi];
                if (bl.state === 2) continue;
                if (Math.abs(bl.x - this.camX) > 960 || Math.abs(bl.y - this.camY) > 740) continue;
                const sz = bl.z || 2.0;
                // Slightly offset the ground light pool (+3px) toward the walkway/park edge
                const poolX = bl.x + (bl.dirX || 0) * 3.0;
                const poolY = bl.y + (bl.dirY || 0) * 3.0;
                const gSc = this.worldToScreen(poolX, poolY, sz + 0.02);
                if (gSc.x < -120 || gSc.x > W + 120 || gSc.y < -120 || gSc.y > H + 120) continue;
                const pxScale = (gSc.scale * H) / 128.0;

                // Low-mounted warm landscape ground pool (reveals grass & pavement texture at night)
                if (bl.style === "VILLA_PATH") {
                    addLightPool(gSc.x, gSc.y, 44 * pxScale, "rgba(255, 224, 138, 0.78)", "rgba(235, 165, 58, 0.28)");
                } else {
                    addLightPool(gSc.x, gSc.y, 52 * pxScale, "rgba(255, 228, 142, 0.80)", "rgba(232, 170, 62, 0.28)");
                }

                // Subtle low-level lantern glow at the bollard diffuser height (sz + 0.165)
                const hSc = this.worldToScreen(bl.x, bl.y, sz + 0.165);
                highResFlares.push({
                    x: hSc.x,
                    y: hSc.y,
                    r: 14 * pxScale,
                    isLampHalo: true,
                    warmSodium: bl.style !== "DECO_PARK"
                });
            }
        }

        // 2B. Ocean Drive Serpentine Neon Wall & Española Way Bistro Light Strings
        if (this.map && Array.isArray(this.map.viceStreetDetails)) {
            const vdNightVis = this._queryStaticChunkGrid(this.map.viceStreetDetails, "x", "y", this.camX - 880, this.camY - 660, this.camX + 880, this.camY + 660);
            for (let vi = 0; vi < vdNightVis.length; vi++) {
                const vd = vdNightVis[vi];
                if (vd.kind === "CAFE_TABLE") continue;
                if (Math.abs(vd.x - this.camX) > 860 || Math.abs(vd.y - this.camY) > 640) continue;
                const sc = this.worldToScreen(vd.x, vd.y, (vd.z || 2.0) + (vd.kind === "BISTRO_STRING" ? 0.50 : 0.08));
                if (sc.x < -120 || sc.x > W + 120 || sc.y < -120 || sc.y > H + 120) continue;
                const pxScale = (sc.scale * H) / 128.0;
                if (vd.kind === "BISTRO_STRING") {
                    addLightPool(sc.x, sc.y, 54 * pxScale, "rgba(255, 200, 118, 0.55)", "rgba(235, 140, 55, 0.20)");
                    highResFlares.push({ x: sc.x, y: sc.y, r: 18 * pxScale, isLampHalo: true, warmSodium: false });
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

        // 2B-2. Illuminated 3D eCola & Sprunk Sidewalk Vending Machine Neon Glow
        if (this.map && this.map.objectEngine && Array.isArray(this.map.objectEngine.sodaMachines)) {
            for (const sm of this.map.objectEngine.sodaMachines) {
                if (Math.abs(sm.x - this.camX) > 840 || Math.abs(sm.y - this.camY) > 620) continue;
                const sc = this.worldToScreen(sm.x, sm.y, (sm.z || 2.0) + 0.22);
                if (sc.x < -100 || sc.x > W + 100 || sc.y < -100 || sc.y > H + 100) continue;
                const pxScale = (sc.scale * H) / 128.0;
                const isSprunk = sm.brand === "SPRUNK";
                addLightPool(
                    sc.x,
                    sc.y,
                    36 * pxScale,
                    isSprunk ? "rgba(65, 255, 125, 0.64)" : "rgba(255, 65, 85, 0.64)",
                    isSprunk ? "rgba(15, 175, 65, 0.22)" : "rgba(185, 20, 40, 0.22)"
                );
            }
        }

        // 2C. GTA 2 Junction Traffic Lights: subtle local lens visibility in night darkness (NO streetlamp star flare or giant pool!)
        if (this.map && Array.isArray(this.map.trafficSignals)) {
            const ph = ((game ? game.trafficLightTimer : this.time) || 0) % 12.0;
            const nsState = ph < 5.2 ? "GREEN" : (ph < 6.0 ? "AMBER" : "RED");
            const ewState = (ph >= 6.0 && ph < 11.2) ? "GREEN" : (ph >= 11.2 ? "AMBER" : "RED");
            const tsNightVis = this._queryStaticChunkGrid(this.map.trafficSignals, "baseX", "baseY", this.camX - 920, this.camY - 680, this.camX + 920, this.camY + 680);
            for (let vi = 0; vi < tsNightVis.length; vi++) {
                const ts = tsNightVis[vi];
                if (ts.state === 2) continue;
                if (ts.state === 1 && Math.sin(this.time * 28.0 + ts.baseX) <= -0.25) continue;
                const effHX = ts.headX + (ts.state === 1 ? (ts.tiltDx || 0) : 0);
                const effHY = ts.headY + (ts.state === 1 ? (ts.tiltDy || 0) : 0);
                if (Math.abs(effHX - this.camX) > 880 || Math.abs(effHY - this.camY) > 640) continue;
                const sz = ts.z || 2.0;
                const zDrop = ts.state === 1 ? 0.065 : 0.0;
                const st = ts.axis === "NS" ? nsState : ewState;
                const dx = ts.dirX !== undefined ? ts.dirX : Math.cos(ts.armAngle);
                const dy = ts.dirY !== undefined ? ts.dirY : Math.sin(ts.armAngle);
                const lensOff = st === "RED" ? 6.8 : (st === "AMBER" ? 0.0 : -6.8);
                const lx = effHX + dx * lensOff;
                const ly = effHY + dy * lensOff;
                const hSc = this.worldToScreen(lx, ly, sz + 0.61 - zDrop);
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
                if (Math.abs(intr.doorX - this.camX) > 960 || Math.abs(intr.doorY - this.camY) > 760) continue;
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
            const isBurning = (v.destroyed && !v.fireExtinguished) || (v.burnTimer || 0) > 0;
            // Parked unlit vehicles (v.driver === null && !isBurning) never emit light — skip BEFORE getEntityZ & worldToScreen!
            if (!v.driver && !isBurning) continue;
            if (Math.abs(v.x - this.camX) > 960 || Math.abs(v.y - this.camY) > 720) continue;

            const vz = this.getEntityZ(v, 0.08) + (v.stuntZOffset || 0);
            const sc = this.worldToScreen(v.x, v.y, vz);
            if (sc.x < -260 || sc.x > W + 260 || sc.y < -260 || sc.y > H + 260) continue;
            const pxScale = (sc.scale * H) / 128.0;

            if (isBurning) {
                if (v.specKey === "BMX_BIKE" || (v.specKey === "E_SCOOTER" && v.destroyed)) continue;
                const flick = 0.88 + Math.sin(this.time * 22 + v.x) * 0.12;
                addLightPool(sc.x, sc.y, 110 * pxScale * flick, "rgba(255, 165, 50, 0.95)", "rgba(235, 65, 15, 0.45)");
                highResFlares.push({ x: sc.x, y: sc.y, r: 26 * pxScale, col: "rgba(255, 140, 35, 0.65)" });
                continue;
            }

            const cosA = Math.cos(v.angle);
            const sinA = Math.sin(v.angle);
            const isWaterCraft = Boolean(v.waterOnly || v.specKey === "AIRBOAT");
            const frontDist = (v.w || 48) * 0.46;
            const rearDist = -(v.w || 48) * 0.46;
            const latSpread = (v.isMotorcycle || isWaterCraft) ? 0 : ((v.h || 24) * 0.32);
            // Headlights are rigidly mounted to the front bumper: always aligned straight with the vehicle chassis (v.angle)
            const beamAng = v.angle;

            // Warm ambient glow around the vehicle chassis (or bright marine deck halo for boats!)
            if (isWaterCraft) {
                addLightPool(sc.x, sc.y, 58 * pxScale, "rgba(220, 248, 255, 0.74)", "rgba(56, 189, 248, 0.28)");
            } else if (v.specKey === "E_SCOOTER") {
                addLightPool(sc.x, sc.y, 34 * pxScale, "rgba(80, 255, 160, 0.56)", "rgba(34, 211, 238, 0.18)");
            } else {
                addLightPool(sc.x, sc.y, (v.specKey === "BMX_BIKE" ? 28 : 38) * pxScale, "rgba(200, 215, 255, 0.42)", "rgba(100, 130, 190, 0.15)");
            }

            // Front Bumper / Bow Center in Screen Space
            const fxWorld = v.x + cosA * frontDist;
            const fyWorld = v.y + sinA * frontDist;
            const fSc = this.worldToScreen(fxWorld, fyWorld, vz);

            // Long Wide-Base Headlight Beam (cars/trucks = wide dual beam, motorcycles/boats = single central searchlight)
            const isBike = v.specKey === "BMX_BIKE";
            const isScoot = v.specKey === "E_SCOOTER";
            const beamLen = (isBike ? 52 : (isScoot ? 86 : (v.isMotorcycle ? 140 : (v.driver === "PLAYER" ? 185 : 158)))) * pxScale;
            const coneSpread = isBike ? 0.28 : (isScoot ? 0.20 : ((v.isMotorcycle || isWaterCraft) ? 0.22 : 0.32));
            const baseHalfWPx = (v.isMotorcycle || isWaterCraft) ? (2.2 * pxScale) : ((latSpread + 3.2) * pxScale);

            addHeadlightCone(
                fSc.x,
                fSc.y,
                beamAng,
                beamLen,
                coneSpread,
                baseHalfWPx,
                isScoot ? "rgba(220, 255, 245, 0.96)" : "rgba(255, 250, 225, 0.98)",
                isScoot ? "rgba(110, 240, 220, 0.48)" : "rgba(215, 232, 255, 0.52)"
            );
            highResCones.push({
                x: fSc.x,
                y: fSc.y,
                angle: beamAng,
                len: beamLen * 0.92,
                spread: coneSpread * 0.88,
                baseHalfW: baseHalfWPx,
                col0: isScoot ? "rgba(180, 255, 240, 0.20)" : "rgba(255, 250, 220, 0.22)",
                col1: "rgba(180, 220, 255, 0.07)"
            });

            // Front Headlight Bulbs (Dual for cars, Single central bow searchlight for motorcycles & boats)
            const headOffsets = (v.isMotorcycle || isWaterCraft) ? [0] : [-latSpread, latSpread];
            for (const lat of headOffsets) {
                const hx = v.x + cosA * frontDist - sinA * lat;
                const hy = v.y + sinA * frontDist + cosA * lat;
                const hSc = this.worldToScreen(hx, hy, vz);
                addLightPool(hSc.x, hSc.y, ((v.isMotorcycle || isWaterCraft) ? 18 : 22) * pxScale, "rgba(255, 250, 225, 0.72)", "rgba(210, 230, 255, 0.24)");
                highResFlares.push({
                    x: hSc.x,
                    y: hSc.y,
                    r: ((v.isMotorcycle || isWaterCraft) ? 6.2 : 5.8) * pxScale,
                    col: "rgba(255, 252, 230, 0.95)"
                });
            }

            // Rear Red Taillights / Brake Lights (Land vehicles only — boats do not have red automotive brake lamps!)
            if (!isWaterCraft) {
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

                const isTowWrecker = (v.specKey === "TOW_TRUCK" || v.driver === "AI_TOW");
                if (isTowWrecker) {
                    const activeSc = redOn ? lSc : rScSiren;
                    addLightPool(activeSc.x, activeSc.y, 118 * pxScale, "rgba(255, 190, 35, 0.94)", "rgba(235, 120, 10, 0.40)");
                    highResFlares.push({ x: activeSc.x, y: activeSc.y, r: 21 * pxScale, col: "rgba(255, 210, 50, 0.88)" });
                } else if (redOn) {
                    addLightPool(lSc.x, lSc.y, 128 * pxScale, "rgba(255, 35, 75, 0.96)", "rgba(220, 15, 50, 0.42)");
                    highResFlares.push({ x: lSc.x, y: lSc.y, r: 22 * pxScale, col: "rgba(255, 40, 80, 0.85)" });
                } else {
                    addLightPool(rScSiren.x, rScSiren.y, 128 * pxScale, "rgba(30, 165, 255, 0.96)", "rgba(10, 95, 235, 0.42)");
                    highResFlares.push({ x: rScSiren.x, y: rScSiren.y, r: 22 * pxScale, col: "rgba(45, 185, 255, 0.85)" });
                }
            }
        }

        // 5B. Aerial Searchlight Helicopters ("aerialSearchHelis") & Watchtower Volumetric Searchlight Cones!
        if (this.map && Array.isArray(this.map.aerialSearchHelis)) {
            for (let hi = 0; hi < this.map.aerialSearchHelis.length; hi++) {
                const ah = this.map.aerialSearchHelis[hi];
                const t = this.time * (ah.speed || 0.24) + ah.seed;
                const hx = ah.cx + Math.cos(t) * ah.rx;
                const hy = ah.cy + Math.sin(t) * ah.ry;
                if (Math.abs(hx - this.camX) > 1080 || Math.abs(hy - this.camY) > 840) continue;
                const vx = -Math.sin(t) * ah.rx;
                const vy = Math.cos(t) * ah.ry;
                const hAng = Math.atan2(vy, vx);
                const cs = Math.cos(hAng), sn = Math.sin(hAng);
                const hz = ah.z || 4.55;

                const sSweep = hAng + Math.sin(this.time * 1.45 + hi) * 0.55;
                const beamX = hx + Math.cos(sSweep) * 78.0;
                const beamY = hy + Math.sin(sSweep) * 78.0;
                const gz = this.map.getHeightAtPixel ? this.map.getHeightAtPixel(beamX, beamY, 2.0) : 2.0;

                const nSc = this.worldToScreen(hx + cs * 16.0, hy + sn * 16.0, hz - 0.04);
                const bSc = this.worldToScreen(beamX, beamY, gz + 0.04);
                const tSc = this.worldToScreen(hx - cs * 14.0, hy - sn * 14.0, hz + 0.03);
                if (bSc.x < -320 || bSc.x > W + 320 || bSc.y < -320 || bSc.y > H + 320) continue;

                const hScale = (nSc.scale * H) / 128.0;
                const bScale = (bSc.scale * H) / 128.0;

                // Soft circular ground searchlight pool + helicopter fuselage visibility halo
                addLightPool(bSc.x, bSc.y, 138 * bScale, "rgba(235, 248, 255, 0.96)", "rgba(130, 200, 255, 0.44)");
                addLightPool(nSc.x, nSc.y, 46 * hScale, "rgba(195, 225, 255, 0.62)", "rgba(95, 145, 215, 0.22)");

                // Volumetric xenon searchlight cone connecting helicopter nose turret down to the sweeping ground spot
                const coneDx = bSc.x - nSc.x;
                const coneDy = bSc.y - nSc.y;
                const coneAng = Math.atan2(coneDy, coneDx);
                const coneLen = Math.hypot(coneDx, coneDy) + 46 * bScale;
                addHeadlightCone(
                    nSc.x,
                    nSc.y,
                    coneAng,
                    coneLen,
                    0.28,
                    3.2 * hScale,
                    "rgba(235, 248, 255, 0.92)",
                    "rgba(145, 210, 255, 0.42)"
                );
                highResCones.push({
                    x: nSc.x,
                    y: nSc.y,
                    angle: coneAng,
                    len: coneLen * 0.96,
                    spread: 0.25,
                    baseHalfW: 3.0 * hScale,
                    col0: "rgba(220, 245, 255, 0.22)",
                    col1: "rgba(135, 205, 255, 0.07)"
                });

                // Soft ground spot bloom + nose xenon gimbal flare + flashing red/blue tail aviation strobe
                highResFlares.push({ x: bSc.x, y: bSc.y, r: 44 * bScale, col: "rgba(205, 240, 255, 0.30)" });
                highResFlares.push({ x: nSc.x, y: nSc.y, r: 8.5 * hScale, col: "rgba(245, 252, 255, 0.95)" });
                const strobeRed = Math.sin(this.time * 9.0 + hi) >= 0;
                highResFlares.push({
                    x: tSc.x,
                    y: tSc.y,
                    r: 14 * hScale,
                    col: strobeRed ? "rgba(255, 45, 80, 0.85)" : "rgba(45, 185, 255, 0.85)"
                });
            }
        }
        if (this.map && this.map.prisonCompound && Array.isArray(this.map.prisonCompound.towers)) {
            const bz = this.map.prisonCompound.z || 2.0;
            for (let ti = 0; ti < this.map.prisonCompound.towers.length; ti++) {
                const tw = this.map.prisonCompound.towers[ti];
                if (Math.abs(tw.x - this.camX) > 980 || Math.abs(tw.y - this.camY) > 760) continue;
                const sAng = tw.baseAng + Math.sin(this.time * 1.15 + ti * 1.4) * 0.65;
                const beamX = tw.x + Math.cos(sAng) * 95;
                const beamY = tw.y + Math.sin(sAng) * 95;
                const tSc = this.worldToScreen(tw.x, tw.y, bz + 0.86);
                const bSc = this.worldToScreen(beamX, beamY, bz + 0.02);
                const bScale = (bSc.scale * H) / 128.0;
                const coneAng = Math.atan2(bSc.y - tSc.y, bSc.x - tSc.x);
                const coneLen = Math.hypot(bSc.x - tSc.x, bSc.y - tSc.y) + 34 * bScale;
                addLightPool(bSc.x, bSc.y, 96 * bScale, "rgba(255, 244, 195, 0.90)", "rgba(235, 185, 85, 0.36)");
                addHeadlightCone(tSc.x, tSc.y, coneAng, coneLen, 0.24, 2.5 * bScale, "rgba(255, 245, 200, 0.88)", "rgba(235, 190, 95, 0.36)");
                highResCones.push({
                    x: tSc.x,
                    y: tSc.y,
                    angle: coneAng,
                    len: coneLen * 0.95,
                    spread: 0.22,
                    baseHalfW: 2.4 * bScale,
                    col0: "rgba(255, 244, 195, 0.18)",
                    col1: "rgba(235, 190, 95, 0.06)"
                });
            }
        }
        if (this.map && this.map.seraCompound && Array.isArray(this.map.seraCompound.towers)) {
            const bz = this.map.seraCompound.z || 2.0;
            for (let ti = 0; ti < this.map.seraCompound.towers.length; ti++) {
                const tw = this.map.seraCompound.towers[ti];
                if (Math.abs(tw.x - this.camX) > 980 || Math.abs(tw.y - this.camY) > 760) continue;
                const sAng = tw.baseAng + Math.sin(this.time * 0.85 + ti * 1.6) * 0.65;
                const beamX = tw.x + Math.cos(sAng) * 68;
                const beamY = tw.y + Math.sin(sAng) * 68;
                const tSc = this.worldToScreen(tw.x, tw.y, bz + 0.62);
                const bSc = this.worldToScreen(beamX, beamY, bz + 0.02);
                const bScale = (bSc.scale * H) / 128.0;
                const coneAng = Math.atan2(bSc.y - tSc.y, bSc.x - tSc.x);
                const coneLen = Math.hypot(bSc.x - tSc.x, bSc.y - tSc.y) + 32 * bScale;
                addLightPool(bSc.x, bSc.y, 92 * bScale, "rgba(220, 245, 255, 0.90)", "rgba(120, 195, 255, 0.36)");
                addHeadlightCone(tSc.x, tSc.y, coneAng, coneLen, 0.24, 2.5 * bScale, "rgba(225, 248, 255, 0.88)", "rgba(130, 200, 255, 0.36)");
                highResCones.push({
                    x: tSc.x,
                    y: tSc.y,
                    angle: coneAng,
                    len: coneLen * 0.95,
                    spread: 0.22,
                    baseHalfW: 2.4 * bScale,
                    col0: "rgba(220, 245, 255, 0.18)",
                    col1: "rgba(130, 200, 255, 0.06)"
                });
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

        // 7B. Stamp True 3D Depth-Tested Emissive Window Textures (Buildings & Houses) onto the darkened scene using "screen"
        // (black glCanvas pixels are a 100% no-op so roads/roofs/cars are untouched, while lit 3D windows stay razor-sharp!)
        // Skip the second full-city WebGL pass on mobile so mobile GPUs only draw the 3D city mesh once per frame.
        if (!this.isMobileInit && !this.glLost && this._lastViewProj && this.renderEmissiveWindowsWebGL(game, this._lastViewProj)) {
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = Math.min(0.92, nf * 1.08);
            ctx.drawImage(this.glCanvas, 0, 0, W, H);
            ctx.globalAlpha = 1.0;
        }

        // 8. Composite Pass 2: Soft Atmospheric Screen Bloom + High-Res Headlight Beams & Lens Flares
        if (lightInt > 0.02) {
            if (!this.isMobileInit) {
                ctx.globalCompositeOperation = "screen";
                ctx.globalAlpha = 0.28 * nf;
                ctx.drawImage(this.nightCanvas, 0, 0, W, H);
            }

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

                const layers = this.isMobileInit
                    ? [
                        { sp: c.spread * 1.04, wMult: 1.02, alpha: 0.36 },
                        { sp: c.spread * 0.56, wMult: 0.72, alpha: 0.42 }
                    ]
                    : [
                        { sp: c.spread * 1.14, wMult: 1.08, alpha: 0.14 },
                        { sp: c.spread * 0.98, wMult: 1.00, alpha: 0.18 },
                        { sp: c.spread * 0.82, wMult: 0.92, alpha: 0.20 },
                        { sp: c.spread * 0.66, wMult: 0.82, alpha: 0.22 },
                        { sp: c.spread * 0.48, wMult: 0.70, alpha: 0.20 },
                        { sp: c.spread * 0.30, wMult: 0.54, alpha: 0.16 }
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
                if (f.isLampHalo) {
                    const stamp = f.warmSodium
                        ? getLightStamp("halo|sodium", [
                            [0.0, 0.00, "rgba(255, 238, 155, 0.44)"],
                            [0.0, 0.20, "rgba(255, 208, 86, 0.25)"],
                            [0.0, 0.46, "rgba(248, 176, 46, 0.11)"],
                            [0.0, 0.75, "rgba(238, 148, 26, 0.04)"],
                            [0.0, 1.00, "rgba(238, 148, 26, 0.0)"]
                        ])
                        : getLightStamp("halo|mercury", [
                            [0.0, 0.00, "rgba(255, 245, 175, 0.46)"],
                            [0.0, 0.20, "rgba(255, 218, 96, 0.26)"],
                            [0.0, 0.46, "rgba(252, 188, 54, 0.12)"],
                            [0.0, 0.75, "rgba(245, 162, 30, 0.04)"],
                            [0.0, 1.00, "rgba(245, 162, 30, 0.0)"]
                        ]);
                    ctx.drawImage(stamp, f.x - r, f.y - r, r * 2, r * 2);
                    continue;
                }

                const stamp = getLightStamp(`flare|${f.col}`, [
                    [0.08, 0.0, "rgba(255, 252, 235, 0.92)"],
                    [0.08, 0.32, f.col],
                    [0.08, 0.68, f.col.replace(/[\d.]+\)$/, "0.18)")],
                    [0.08, 1.0, "rgba(0, 0, 0, 0)"]
                ]);
                ctx.drawImage(stamp, f.x - r, f.y - r, r * 2, r * 2);
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
        if (!this._promptWidthCache) this._promptWidthCache = new Map();
        const measurePromptW = (str) => {
            let w = this._promptWidthCache.get(str);
            if (w === undefined) {
                if (this._promptWidthCache.size > 512) this._promptWidthCache.clear();
                w = ctx.measureText(str).width;
                this._promptWidthCache.set(str, w);
            }
            return w;
        };

        // 0. 3D Villa Heist Prompts (Laser Keypads, 3D Armored Cartel Vaults, Pier Speedboat Getaways & Escape Banner)
        if (this.map && this.map.objectEngine && typeof this.map.objectEngine.renderHeistPrompts === "function") {
            this.map.objectEngine.renderHeistPrompts(ctx, this, game);
        }

        // 1. Glowing Enterable Venue Interior Door Badges (anchored at the physical door threshold)
        if (Array.isArray(this.map.interiors)) {
            for (let ii = 0; ii < this.map.interiors.length; ii++) {
                const intr = this.map.interiors[ii];
                if (Math.abs(p.x - intr.doorX) > 365 || Math.abs(p.y - intr.doorY) > 365) continue;
                const fCode = intr.facing;
                const fnvX = fCode === "E" ? 1 : (fCode === "W" ? -1 : 0);
                const fnvY = fCode === "N" ? -1 : ((fCode === "E" || fCode === "W") ? 0 : 1);
                const isPortico = !!intr.isEstatePortico;
                const tcx = (fCode && !isPortico) ? (Math.floor(intr.doorX / TILE_SIZE) * TILE_SIZE + TILE_SIZE * 0.5) : intr.doorX;
                const tcy = (fCode && !isPortico) ? (Math.floor(intr.doorY / TILE_SIZE) * TILE_SIZE + TILE_SIZE * 0.5) : intr.doorY;
                const threshX = (fCode && !isPortico) ? (tcx - fnvX * 18) : intr.doorX;
                const threshY = (fCode && !isPortico) ? (tcy - fnvY * 18) : intr.doorY;

                const dist = Math.hypot(p.x - threshX, p.y - threshY);
                if (dist > 340) continue;
                // Never draw a door badge when the player is on the opposite/back side of the 3D building facade
                if (!isPortico && ((p.x - tcx) * fnvX + (p.y - tcy) * fnvY) < -TILE_SIZE * 0.52) continue;
                if (!isPortico && dist > 64 && this.map.traceSegment2D && this.map.traceSegment2D(p.x, p.y, threshX, threshY, 2.0).hit) continue;

                const labelX = (fCode && !isPortico) ? (tcx - fnvX * 12) : intr.doorX;
                const labelY = (fCode && !isPortico) ? (tcy - fnvY * 12) : intr.doorY;
                const dz = this.map.getHeightAtPixel(intr.doorX, intr.doorY, 2.0) + 0.04;
                const sc = this.worldToScreen(labelX, labelY, dz);
                const isClose = dist < 38;
                const label = isClose ? `🚪 [E] ${intr.name}` : `🚪 ${intr.name}`;
                const bw = Math.max(130, measurePromptW(label) + 18);
                const bh = 22;
                const bx = Math.round(sc.x - bw * 0.5);
                const by = Math.round(sc.y - bh * 0.5 + 2);

                ctx.fillStyle = isClose ? "rgba(180, 24, 112, 0.94)" : "rgba(12, 18, 32, 0.86)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = intr.accent || "#f472b6";
                ctx.lineWidth = isClose ? 2 : 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = "#ffffff";
                ctx.fillText(label, sc.x, by + bh * 0.5);
            }
        }

        // 2. Stunt Jump Ramp Labels when nearby
        if (Array.isArray(this.map.stuntRamps)) {
            for (let ri = 0; ri < this.map.stuntRamps.length; ri++) {
                const ramp = this.map.stuntRamps[ri];
                if (Math.abs(p.x - ramp.x) > 195 || Math.abs(p.y - ramp.y) > 195) continue;
                const dist = Math.hypot(p.x - ramp.x, p.y - ramp.y);
                if (dist > 190) continue;
                if (dist > 64 && this.map.traceSegment2D && this.map.traceSegment2D(p.x, p.y, ramp.x, ramp.y, 2.0).hit) continue;
                const rz = this.map.getHeightAtPixel(ramp.x, ramp.y, 2.0) + 0.08;
                const sc = this.worldToScreen(ramp.x, ramp.y, rz);
                const label = `🔥 STUNT RAMP: ${ramp.name}`;
                const bw = measurePromptW(label) + 14;
                const bx = Math.round(sc.x - bw * 0.5);
                const by = Math.round(sc.y - 9);
                ctx.fillStyle = "rgba(24, 16, 6, 0.85)";
                ctx.fillRect(bx, by, bw, 18);
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 17);
                ctx.fillStyle = "#fde047";
                ctx.fillText(label, sc.x, by + 9);
            }
        }

        // 2B. Interactive Watercraft Boarding Prompt ([E] 🚤 BOARD SPEEDBOAT / JET-SKI / AIRBOAT) when near shore, piers or marinas!
        if (!p.inVehicle) {
            let bestBoat = null;
            let bestBoatDist = 235;
            if (Array.isArray(game.vehicles)) {
                const gHead = game._vehGridHead;
                const gNext = game._vehGridNext;
                if (gHead && gNext) {
                    const gx0 = Math.max(0, (p.x >> 8) - 1);
                    const gx1 = Math.min(127, (p.x >> 8) + 1);
                    const gy0 = Math.max(0, (p.y >> 8) - 1);
                    const gy1 = Math.min(127, (p.y >> 8) + 1);
                    for (let gy = gy0; gy <= gy1; gy++) {
                        const rowOff = gy << 7;
                        for (let gx = gx0; gx <= gx1; gx++) {
                            for (let vi = gHead[rowOff | gx]; vi !== -1; vi = gNext[vi]) {
                                const v = game.vehicles[vi];
                                if (!v || v.destroyed || !(v.waterOnly || v.specKey === "AIRBOAT" || v.amphibious)) continue;
                                const d = Math.hypot(v.x - p.x, v.y - p.y);
                                if (d < bestBoatDist) {
                                    bestBoatDist = d;
                                    const bName = v.specKey === "JETSKI" ? "JET-SKI" : (v.specKey === "AIRBOAT" ? "AIRBOAT" : "SPEEDBOAT");
                                    bestBoat = { x: v.x, y: v.y, z: Math.max(2.0, v.z || 2.0) + 0.14, name: bName, dist: d };
                                }
                            }
                        }
                    }
                } else {
                    for (const v of game.vehicles) {
                        if (v.destroyed || !(v.waterOnly || v.specKey === "AIRBOAT" || v.amphibious)) continue;
                        if (Math.abs(v.x - p.x) > 235 || Math.abs(v.y - p.y) > 235) continue;
                        const d = Math.hypot(v.x - p.x, v.y - p.y);
                        if (d < bestBoatDist) {
                            bestBoatDist = d;
                            const bName = v.specKey === "JETSKI" ? "JET-SKI" : (v.specKey === "AIRBOAT" ? "AIRBOAT" : "SPEEDBOAT");
                            bestBoat = { x: v.x, y: v.y, z: Math.max(2.0, v.z || 2.0) + 0.14, name: bName, dist: d };
                        }
                    }
                }
            }
            const oe = this.map && this.map.objectEngine;
            if (oe && Array.isArray(oe.instances)) {
                if (!oe._dockBoatInsts || oe._dockBoatInstsSrcLen !== oe.instances.length) {
                    oe._dockBoatInsts = oe.instances.filter((inst) => inst && inst.dockBoat);
                    oe._dockBoatInstsSrcLen = oe.instances.length;
                }
                for (let di = 0; di < oe._dockBoatInsts.length; di++) {
                    const db = oe._dockBoatInsts[di].dockBoat;
                    if (Math.abs(db.worldX - p.x) > 300 || Math.abs(db.worldY - p.y) > 300) continue;
                    if (db._liveBoat && !db._liveBoat.destroyed) continue;
                    const d = Math.min(Math.hypot(db.worldX - p.x, db.worldY - p.y), Math.hypot(db.pierMidX - p.x, db.pierMidY - p.y));
                    if (d < bestBoatDist) {
                        bestBoatDist = d;
                        const bName = (db.spr && String(db.spr).includes("jetski")) ? "PIER JET-SKI" : "PIER SPEEDBOAT";
                        bestBoat = { x: db.worldX, y: db.worldY, z: 2.14, name: bName, dist: d };
                    }
                }
            }
            if (this.map && Array.isArray(this.map.jetSkiers)) {
                for (let ji = 0; ji < this.map.jetSkiers.length; ji++) {
                    const js = this.map.jetSkiers[ji];
                    const jx = js._liveX !== undefined ? js._liveX : js.x;
                    const jy = js._liveY !== undefined ? js._liveY : js.y;
                    if (Math.abs(jx - p.x) > 235 || Math.abs(jy - p.y) > 235) continue;
                    if (js._boardedVehicle && !js._boardedVehicle.destroyed) continue;
                    const d = Math.hypot(jx - p.x, jy - p.y);
                    if (d < bestBoatDist) {
                        bestBoatDist = d;
                        bestBoat = { x: jx, y: jy, z: 2.14, name: "NEON JET-SKI", dist: d };
                    }
                }
            }
            if (this.map && Array.isArray(this.map.evergladesAirboats)) {
                for (let ai = 0; ai < this.map.evergladesAirboats.length; ai++) {
                    const ab = this.map.evergladesAirboats[ai];
                    const ax = ab._liveX !== undefined ? ab._liveX : ab.x;
                    const ay = ab._liveY !== undefined ? ab._liveY : ab.y;
                    if (Math.abs(ax - p.x) > 235 || Math.abs(ay - p.y) > 235) continue;
                    if (ab._boardedVehicle && !ab._boardedVehicle.destroyed) continue;
                    const d = Math.hypot(ax - p.x, ay - p.y);
                    if (d < bestBoatDist) {
                        bestBoatDist = d;
                        bestBoat = { x: ax, y: ay, z: 2.14, name: "SWAMP AIRBOAT", dist: d };
                    }
                }
            }
            if (this.map && Array.isArray(this.map.portTerminals)) {
                for (let pi = 0; pi < this.map.portTerminals.length; pi++) {
                    const pt = this.map.portTerminals[pi];
                    if (Math.abs(pt.x - p.x) > 235 || Math.abs(pt.y - p.y) > 235) continue;
                    if ((pt.kind !== "SPEEDBOAT" && pt.kind !== "YACHT") || (pt._boardedVehicle && !pt._boardedVehicle.destroyed)) continue;
                    const d = Math.hypot(pt.x - p.x, pt.y - p.y);
                    if (d < bestBoatDist) {
                        bestBoatDist = d;
                        bestBoat = { x: pt.x, y: pt.y, z: 2.14, name: "HARBOR SPEEDBOAT", dist: d };
                    }
                }
            }
            if (bestBoat) {
                const sc = this.worldToScreen(bestBoat.x, bestBoat.y, bestBoat.z);
                const canBoardNow = bestBoat.dist <= 195;
                const label = canBoardNow ? `🚤 [E] / [F] BOARD ${bestBoat.name}` : `🚤 ${bestBoat.name}`;
                const bw = Math.max(142, measurePromptW(label) + 18);
                const bh = 22;
                const bx = Math.round(sc.x - bw * 0.5);
                const by = Math.round(sc.y - 26);
                ctx.fillStyle = canBoardNow ? "rgba(6, 78, 115, 0.94)" : "rgba(8, 15, 30, 0.86)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = canBoardNow ? "#00f0ff" : "#38bdf8";
                ctx.lineWidth = canBoardNow ? 2.0 : 1.2;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = canBoardNow ? "#fde047" : "#e0f2fe";
                ctx.fillText(label, sc.x, by + bh * 0.5);
                if (canBoardNow && Array.isArray(this.cheatButtons)) {
                    this.cheatButtons.push({ id: "BOARD_BOAT", x: bx, y: by, w: bw, h: bh });
                }
            }
        }

        // 2B-Swim. Swimming Stamina & Deep-Ocean ("Haute Mer") Shark/Riptide Warning Pill
        if (!p.inVehicle && ((p.deepSeaDanger || 0) > 0 || (p.swimStamina !== undefined && p.swimStamina < 95))) {
            const sc = this.worldToScreen(p.x, p.y, (p.z || 2.0) + 0.18);
            const stamPct = Math.max(0, Math.min(100, Math.round(p.swimStamina !== undefined ? p.swimStamina : 100)));
            const dangerLvl = p.deepSeaDanger || 0;
            const pulse = 0.5 + 0.5 * Math.sin(this.time * (dangerLvl >= 2 ? 12.0 : 6.5));
            let sLabel = `🏊 SWIMMING — STAMINA ${stamPct}%`;
            let borderCol = "#00f0ff";
            let barCol = "#38bdf8";
            let bgCol = "rgba(6, 42, 68, 0.90)";
            if (dangerLvl >= 2) {
                sLabel = `🦈 HIGH SEAS DANGER — SHARK ATTACK! SWIM TO SHORE!`;
                borderCol = pulse > 0.5 ? "#ff1e38" : "#fde047";
                barCol = "#ff1e38";
                bgCol = "rgba(88, 10, 24, 0.94)";
            } else if (dangerLvl === 1) {
                sLabel = `⚠️ DEEP OCEAN RIPTIDE — TURN BACK! (${stamPct}%)`;
                borderCol = pulse > 0.5 ? "#f97316" : "#fde047";
                barCol = "#f97316";
                bgCol = "rgba(68, 28, 8, 0.92)";
            }
            const bw = Math.max(168, measurePromptW(sLabel) + 20);
            const bh = 26;
            const bx = Math.round(sc.x - bw * 0.5);
            const by = Math.round(sc.y + 24);
            ctx.fillStyle = bgCol;
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = borderCol;
            ctx.lineWidth = dangerLvl > 0 ? 2.0 : 1.4;
            ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
            ctx.fillStyle = dangerLvl >= 2 ? "#fecdd3" : (dangerLvl === 1 ? "#fde047" : "#e0f2fe");
            ctx.fillText(sLabel, sc.x, by + 9);
            const innerW = bw - 14;
            ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
            ctx.fillRect(bx + 7, by + 18, innerW, 4);
            ctx.fillStyle = barCol;
            ctx.fillRect(bx + 7, by + 18, Math.round(innerW * (stamPct / 100)), 4);
        }

        // 2C. Street Interactive Props Prompt ([E] ATM, Retro Arcade Cabinet, Sprunk Soda Machine)
        if (!p.inVehicle && this.map && this.map.objectEngine && Array.isArray(this.map.objectEngine.interactiveProps)) {
            const oe = this.map.objectEngine;
            if (!oe._usableInteractProps || oe._usableInteractSrcLen !== oe.interactiveProps.length) {
                oe._usableInteractProps = oe.interactiveProps.filter((pr) => {
                    const s = String((pr && pr.spr) || "");
                    return s.includes("atm") || s.includes("arcade") || s.includes("vending") || s.includes("soda");
                });
                oe._usableInteractSrcLen = oe.interactiveProps.length;
            }
            let bestProp = null;
            let bestPropDist = 92;
            for (let i = 0; i < oe._usableInteractProps.length; i++) {
                const pr = oe._usableInteractProps[i];
                if (pr.broken || (pr.cooldown || 0) > 0) continue;
                if (Math.abs(pr.x - p.x) > 92 || Math.abs(pr.y - p.y) > 92) continue;
                const d = Math.hypot(pr.x - p.x, pr.y - p.y);
                if (d < bestPropDist) {
                    bestPropDist = d;
                    bestProp = pr;
                }
            }
            if (bestProp) {
                const sc = this.worldToScreen(bestProp.x, bestProp.y, (bestProp.z || 2.0) + 0.14);
                const s = String(bestProp.spr || "");
                const pTitle = s.includes("atm")
                    ? "🏧 [E] SKIM ATM (+$350)"
                    : (s.includes("arcade") ? "🕹️ [E] PLAY ARCADE (+500 PTS)" : "🥤 [E] DRINK SODA (+25 HP)");
                const bw = Math.max(138, measurePromptW(pTitle) + 16);
                const bh = 20;
                const bx = Math.round(sc.x - bw * 0.5);
                const by = Math.round(sc.y - 22);
                ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.strokeStyle = "#39ff14";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                ctx.fillStyle = "#fde047";
                ctx.fillText(pTitle, sc.x, by + bh * 0.5);
                if (Array.isArray(this.cheatButtons)) {
                    this.cheatButtons.push({ id: "BOARD_BOAT", x: bx, y: by, w: bw, h: bh });
                }
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
       5A2. PLAYABLE WALKABLE 2.5D MULTI-ROOM INTERIOR & SHOP RENDERER
       Pre-bakes 128x128 pixel-art procedural floor textures (hardwood planks,
       beveled ceramic tiles, veined Carrara marble, South Beach terrazzo,
       industrial diamond-plate, woven velvet carpet) and renders multi-room
       2.5D architectural layouts with thick partition walls, north elevations,
       ambient occlusion shadows, and richly detailed top-down furniture.
       ======================================================================== */
    getInteriorTextures(ctx) {
        if (this._interiorTextures) return this._interiorTextures;
        const tex = {};
        const hash = (x, y, s = 0) => {
            let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) >>> 0;
            h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
            return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
        };
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
        const makePat = (sz, fn) => {
            const c = document.createElement("canvas");
            c.width = sz;
            c.height = sz;
            const g = c.getContext("2d");
            const img = g.createImageData(sz, sz);
            const d = img.data;
            for (let y = 0; y < sz; y++) {
                for (let x = 0; x < sz; x++) {
                    const [r, gr, b] = fn(x, y, sz);
                    const idx = (y * sz + x) * 4;
                    d[idx] = clamp(r);
                    d[idx + 1] = clamp(gr);
                    d[idx + 2] = clamp(b);
                    d[idx + 3] = 255;
                }
            }
            g.putImageData(img, 0, 0);
            return ctx.createPattern(c, "repeat");
        };

        // 1. Warm Golden-Teak & Mahogany Planks (Tavern / Dive Bar / Mansion Office)
        tex.wood_mahogany = makePat(64, (x, y) => {
            const plankRow = Math.floor(y / 12);
            const ly = y % 12;
            const stagger = (plankRow % 2) * 32;
            const lx = (x + stagger) % 64;
            if (ly === 0 || lx === 0) return [58, 32, 18]; // Warm plank bevel joint
            const pTone = (hash(plankRow, 1, 11) - 0.5) * 16;
            const grain = Math.sin(x * 0.35 + Math.sin(y * 0.7 + plankRow) * 2.2) * 8 + (hash(x, y, 2) - 0.5) * 9;
            const highlight = ly === 1 ? 12 : (ly === 11 ? -8 : 0);
            return [142 + pTone + grain + highlight, 84 + (pTone + grain) * 0.65 + highlight * 0.5, 48 + (pTone + grain) * 0.42];
        });

        // 2. Warm Sunlit Honey-Oak Parquet Planks (Hotel Suites / Fitting Rooms / Stage)
        tex.wood_oak = makePat(64, (x, y) => {
            const plankRow = Math.floor(y / 10);
            const ly = y % 10;
            const lx = (x + (plankRow % 2) * 28) % 56;
            if (ly === 0 || lx === 0) return [92, 62, 34];
            const pTone = (hash(plankRow, 3, 7) - 0.5) * 16;
            const grain = Math.sin(x * 0.4 + Math.cos(y * 0.8) * 1.8) * 9 + (hash(x, y, 4) - 0.5) * 10;
            const bevel = ly === 1 ? 12 : (ly === 9 ? -9 : 0);
            return [184 + pTone + grain + bevel, 134 + (pTone + grain) * 0.72 + bevel * 0.6, 82 + (pTone + grain) * 0.45];
        });

        // 3. Retro 1980s Vice City Diner Beveled Checkerboard Tile (Terracotta / Cream)
        tex.diner_checker = makePat(64, (x, y) => {
            const tx = Math.floor(x / 32);
            const ty = Math.floor(y / 32);
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [96, 82, 72]; // Warm grout line
            const isRed = (tx + ty) % 2 === 0;
            const n = (hash(x, y, 9) - 0.5) * 10;
            const bev = (lx === 1 || ly === 1) ? 14 : ((lx === 31 || ly === 31) ? -12 : 0);
            const spec = (lx > 4 && lx < 12 && ly > 4 && ly < 10) ? 8 : 0;
            if (isRed) {
                return [188 + n + bev + spec, 76 + n * 0.5 + bev * 0.5 + spec, 56 + n * 0.4 + bev * 0.4];
            }
            return [238 + n + bev + spec, 224 + n + bev + spec, 192 + n + bev * 0.7];
        });

        // 4. Commercial Stainless / Ceramic Kitchen Grid Tile (16x16)
        tex.kitchen_tile = makePat(64, (x, y) => {
            const lx = x % 16;
            const ly = y % 16;
            if (lx === 0 || ly === 0) return [118, 128, 138]; // Clean grout
            const n = (hash(x, y, 14) - 0.5) * 10;
            const bev = (lx === 1 || ly === 1) ? 12 : ((lx === 15 || ly === 15) ? -10 : 0);
            return [214 + n + bev, 222 + n + bev, 228 + n + bev];
        });

        // 5. Veined White Carrara Marble (Boutique / Star Island Mansion Foyer)
        tex.marble_carrara = makePat(64, (x, y) => {
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [156, 164, 174]; // Silver-gray marble grout
            const veinWave = Math.sin((x + y * 1.3) * 0.14 + Math.sin(x * 0.09 - y * 0.11) * 2.6);
            const vein = Math.pow(Math.max(0, 1 - Math.abs(veinWave) * 3.8), 2.2);
            const n = (hash(x, y, 21) - 0.5) * 8;
            const bev = (lx === 1 || ly === 1) ? 10 : ((lx === 31 || ly === 31) ? -9 : 0);
            const base = 232 + n + bev - vein * 46;
            return [base, base + 2, base + 6];
        });

        // 6. Polished Vice City Lounge Slate & Terrazzo (Nightclubs / VIP Lounges)
        tex.marble_dark = makePat(64, (x, y) => {
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [64, 58, 78];
            const veinWave = Math.sin((x - y * 1.2) * 0.15 + Math.cos(x * 0.1 + y * 0.08) * 2.4);
            const vein = Math.pow(Math.max(0, 1 - Math.abs(veinWave) * 4.2), 2.0);
            const n = (hash(x, y, 33) - 0.5) * 8;
            const bev = (lx === 1 || ly === 1) ? 10 : ((lx === 31 || ly === 31) ? -8 : 0);
            return [
                92 + n + bev + vein * 46,
                84 + n + bev + vein * 34,
                114 + n + bev + vein * 52
            ];
        });

        // 7. South Beach Sunlit Pastel Art Deco Terrazzo with Brass Inlay & Coral/Turquoise Chips (Hotels)
        tex.terrazzo_deco = makePat(64, (x, y) => {
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [196, 158, 78]; // Polished brass inlay strip!
            const h = hash(Math.floor(x / 2), Math.floor(y / 2), 45);
            const n = (hash(x, y, 46) - 0.5) * 8;
            const bev = (lx === 1 || ly === 1) ? 10 : ((lx === 31 || ly === 31) ? -9 : 0);
            if (h > 0.90) return [242, 118, 146]; // Flamingo coral chip
            if (h > 0.81) return [56, 204, 214];  // Ocean turquoise chip
            if (h > 0.72) return [246, 208, 116]; // Warm gold quartz chip
            return [222 + n + bev, 210 + n + bev, 196 + n + bev];
        });

        // 8. Warm Vice City Sandstone / Travertine Showroom Tile (Ammu-Nation / Tactical Showroom)
        tex.gunmetal_plate = makePat(64, (x, y) => {
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [112, 104, 92]; // Warm travertine grout joint
            const cx = (x % 8) - 4;
            const cy = (y % 8) - 4;
            const tread = (Math.abs(cx - cy) <= 1 && Math.abs(cx + cy) <= 3);
            const n = (hash(x, y, 55) - 0.5) * 9;
            const bev = (lx === 1 || ly === 1) ? 12 : ((lx === 31 || ly === 31) ? -10 : 0);
            const tBoost = tread ? 8 : 0;
            return [186 + n + bev + tBoost, 176 + n + bev + tBoost, 158 + n + bev + tBoost];
        });

        // 9. Supermarket Speckled Vinyl Composition Tile (24/7 Convenience Store)
        tex.linoleum_mart = makePat(64, (x, y) => {
            const tx = Math.floor(x / 32);
            const ty = Math.floor(y / 32);
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [146, 156, 164];
            const alt = (tx + ty) % 2 === 0 ? 0 : -10;
            const sp = hash(x, y, 67) > 0.82 ? -14 : (hash(x, y, 68) > 0.85 ? 12 : 0);
            const bev = (lx === 1 || ly === 1) ? 10 : ((lx === 31 || ly === 31) ? -9 : 0);
            return [218 + alt + sp + bev, 224 + alt + sp + bev, 226 + alt + sp + bev];
        });

        // 10. Woven Royal Crimson Velvet Carpet (Mansion / Hotel Runner / Showroom Rug)
        tex.carpet_royal = makePat(32, (x, y) => {
            const weave = ((x + y) % 2 === 0 ? 6 : -6) + Math.sin(x * 0.78) * 5 + Math.cos(y * 0.78) * 5;
            const motif = (Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8) === 5) ? 32 : 0;
            const n = (hash(x, y, 77) - 0.5) * 8;
            return [162 + weave + motif + n, 38 + weave * 0.4 + motif * 0.75 + n, 48 + weave * 0.5 + motif * 0.25 + n];
        });

        // 11. Warm Light Architectural Concrete / Limestone Slab (Vaults / Firing Range / Cellblock)
        tex.concrete_prison = makePat(64, (x, y) => {
            const lx = x % 32;
            const ly = y % 32;
            if (lx === 0 || ly === 0) return [104, 100, 94];
            const n = (hash(x, y, 88) - 0.5) * 12 + Math.sin(x * 0.21 + y * 0.17) * 5;
            const bev = (lx === 1 || ly === 1) ? 10 : ((lx === 31 || ly === 31) ? -9 : 0);
            return [166 + n + bev, 162 + n + bev, 152 + n + bev];
        });

        this._interiorTextures = tex;
        return tex;
    }

    getOrBakeInteriorFloorTex(gl, intr) {
        if (!gl || !intr) return null;
        if (!this._interiorFloorTexCache) {
            this._interiorFloorTexCache = {};
        }
        const rw = intr.w || 820;
        const rh = intr.h || 560;
        const t = intr.theme || "SHOP_CONVENIENCE";
        const facing = intr.facing || "S";
        const key = `v6_${t}_${facing}_${rw}_${rh}`;
        if (this._interiorFloorTexCache[key]) {
            return this._interiorFloorTexCache[key];
        }

        const c = document.createElement("canvas");
        c.width = rw * 2;
        c.height = rh * 2;
        const g = c.getContext("2d");
        const tex = this.getInteriorTextures(g);

        g.save();
        g.scale(2, 2);

        const trR = (x, y, w, h) => {
            if (window.ShopInteriors && typeof window.ShopInteriors.transformRect === "function") {
                return window.ShopInteriors.transformRect(x, y, w, h, intr);
            }
            return { x, y, w, h };
        };
        const fillR = (x, y, w, h, fill, stroke = null, lw = 1.5) => {
            const r = trR(x, y, w, h);
            g.fillStyle = fill;
            g.fillRect(r.x, r.y, r.w, r.h);
            if (stroke) {
                g.strokeStyle = stroke;
                g.lineWidth = lw;
                g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
            }
        };
        const labelR = (x, y, w, h, text, col = "#fde047", font = "bold 9px Consolas, monospace") => {
            const r = trR(x, y, w, h);
            g.save();
            g.font = font;
            g.fillStyle = col;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(text, r.x + r.w * 0.5, r.y + r.h * 0.5);
            g.restore();
        };

        // 1. Primary multi-zone procedural pixel-art floor pattern across the entire room
        let mainPat = tex.marble_dark;
        if (t === "SHOP_GUN_SHOP" || t === "SPACE_BUNKER") mainPat = tex.gunmetal_plate;
        else if (t === "SHOP_RESTAURANT" || t === "DINER_PAWN") mainPat = tex.diner_checker;
        else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL" || t === "MALIBU_CLUB") mainPat = tex.terrazzo_deco;
        else if (t === "SHOP_CLOTHES" || t === "MANSION") mainPat = tex.marble_carrara;
        else if (t === "SHOP_CONVENIENCE") mainPat = tex.linoleum_mart;
        else if (t === "SHOP_BAR") mainPat = tex.wood_mahogany;
        else if (t === "PRISON_BLOCK") mainPat = tex.concrete_prison;

        g.fillStyle = mainPat;
        g.fillRect(0, 0, rw, rh);

        // 2. Oriented Multi-Room Architectural Sub-Zones, Carpets, Rugs & High-Detail Top-Down Furniture Surfaces (mapped onto 3D furniture tops via MAT 14!)
        if (t === "SHOP_GUN_SHOP") {
            // West Gunsmith & Kevlar Vault warm honey-oak plank floor
            fillR(18, 56, 206, 358, tex.wood_oak, "#78350f", 1.5);
            // Center Showroom royal crimson tactical rug runner
            fillR(266, 174, 224, 96, tex.carpet_royal, "#f59e0b", 2.0);
            labelR(266, 206, 224, 32, "★ AMMU-NATION ORDNANCE ★", "rgba(253, 224, 71, 0.55)", "bold 11px Consolas, monospace");

            // Gunsmith Vault Safe (36, 68, 52, 32) & Hardwood Workbench (92, 68, 108, 28)
            fillR(36, 68, 52, 32, "#334155", "#0f172a", 2.0);
            fillR(42, 73, 40, 22, "#475569", "#fbbf24", 1.2);
            labelR(36, 68, 52, 32, "SAFE", "#fde047", "bold 8px Consolas, monospace");
            fillR(92, 68, 108, 28, tex.wood_mahogany, "#451a03", 2.0);
            fillR(98, 72, 42, 18, "#1e40af", "#60a5fa", 1.0); // Blueprint mat on workbench
            fillR(146, 74, 38, 6, "#94a3b8", "#0f172a", 1.0); // Disassembled rifle barrel
            fillR(152, 82, 22, 6, "#f59e0b", "#78350f", 1.0); // Brass calipers

            // South-West Tactical Kevlar Body Armor Rack (36, 352, 164, 28) — Detailed Police/SWAT Vests with Straps & Trauma Plates!
            fillR(36, 352, 164, 28, "#334155", "#0f172a", 2.0);
            for (let v = 0; v < 3; v++) {
                const vx = 44 + v * 52;
                fillR(vx, 354, 40, 24, "#0284c7", "#0f172a", 1.5); // Kevlar carrier body
                fillR(vx + 10, 354, 20, 6, "#0f172a"); // Neck cutout collar
                fillR(vx + 6, 361, 28, 13, "#1e293b", "#38bdf8", 1.0); // Ceramic trauma plate pouch
                fillR(vx + 4, 355, 5, 22, "#facc15"); // High-vis shoulder strap L
                fillR(vx + 31, 355, 5, 22, "#facc15"); // High-vis shoulder strap R
            }

            // Center Showroom Illuminated Glass Weapon Showcase Counter (262, 128, 232, 28)
            fillR(262, 128, 232, 28, "#1e293b", "#0f172a", 2.0);
            for (let b = 0; b < 3; b++) {
                const bx = 294 + b * 64;
                fillR(bx, 131, 58, 22, "#7f1d1d", "#38bdf8", 1.5); // Velvet display bay under glass
                fillR(bx + 8, 136, 26, 5, "#e2e8f0", "#0f172a", 1.0); // Displayed firearm barrel/receiver
                fillR(bx + 6, 141, 10, 6, "#92400e"); // Wood grip/stock
                fillR(bx + 38, 135, 14, 12, "#eab308", "#713f12", 1.0); // Brass ammo box
            }
            fillR(266, 131, 24, 22, "#ca8a04", "#0f172a", 1.5); // Brass POS cash register

            // Center Military Surplus Stenciled Wood Slat Crates (258, 288, 86, 28 & 412, 288, 86, 28)
            for (const rx of [258, 412]) {
                fillR(rx, 288, 86, 28, "#4d7c0f", "#1a2e05", 2.0);
                fillR(rx + 4, 292, 78, 6, "#3f6212", "#1a2e05", 1.0);
                fillR(rx + 4, 300, 78, 6, "#3f6212", "#1a2e05", 1.0);
                fillR(rx + 4, 308, 78, 6, "#3f6212", "#1a2e05", 1.0);
                labelR(rx, 288, 86, 28, rx < 350 ? "SHOTGUN 12GA" : "MICRO-UZI 9MM", "#fef08a", "bold 8px Consolas, monospace");
            }

            // East 4-Lane Live Firing Range: Warm Concrete Floor + Hazard Firing Line + Distance Markers + Numbered Stalls
            fillR(532, 56, rw - 550, 358, tex.concrete_prison, "#78350f", 2.0);
            fillR(540, 304, 250, 8, "#facc15", "#0f172a", 1.0);
            for (let hx = 544; hx < 784; hx += 18) {
                fillR(hx, 304, 9, 8, "#0f172a");
            }
            fillR(548, 312, 236, 22, tex.wood_oak, "#451a03", 2.0); // Shooting booth wooden counter
            fillR(544, 218, 242, 3, "rgba(234, 88, 12, 0.55)");
            fillR(544, 138, 242, 3, "rgba(220, 38, 38, 0.55)");
            fillR(544, 62, 242, 22, "#92400e", "#451a03", 2.0); // Sandbag bullet-trap berm
            for (let lane = 0; lane < 4; lane++) {
                const lx = 550 + lane * 58;
                if (lane > 0) {
                    fillR(lx - 2, 64, 3, 240, "rgba(15, 23, 42, 0.35)");
                }
                fillR(lx + 6, 266, 42, 30, "rgba(254, 240, 138, 0.35)", "#b45309", 1.2);
                labelR(lx + 6, 266, 42, 30, `L${lane + 1}`, "#78350f", "bold 10px Consolas, monospace");
                fillR(lx + 8, 315, 16, 14, "#eab308", "#713f12", 1.0); // Ammo box on stall bench
                fillR(lx + 30, 315, 14, 14, "#dc2626", "#0f172a", 1.0); // Ear defenders on stall bench
            }
            for (let s = 0; s < 24; s++) {
                const bx = 556 + ((s * 37) % 216);
                const by = 338 + ((s * 19) % 34);
                fillR(bx, by, 4, 2.5, "#f59e0b");
            }

            // South Security Vestibule travertine floor + Guard Desk (54, 468, 96, 30) & Ordnance Pallet (664, 468, 96, 30)
            fillR(18, 430, rw - 36, rh - 448, tex.gunmetal_plate, "#78716c", 1.5);
            fillR(348, 410, 124, 22, tex.wood_oak, "#0f172a", 2.0);
            fillR(54, 468, 96, 30, tex.wood_mahogany, "#0f172a", 2.0);
            fillR(62, 472, 32, 18, "#0284c7", "#e0f2fe", 1.2); // CCTV monitor screen
            fillR(102, 474, 36, 14, "#e2e8f0", "#0f172a", 1.0); // Guard logbook
            fillR(664, 468, 96, 30, "#4d7c0f", "#1a2e05", 2.0);
            labelR(664, 468, 96, 30, "US ORDNANCE", "#fef08a", "bold 8px Consolas, monospace");
        } else if (t === "SHOP_RESTAURANT" || t === "DINER_PAWN") {
            fillR(18, 56, rw - 36, 136, tex.kitchen_tile, "#64748b", 1.5);
            const cookW = t === "DINER_PAWN" ? 384 : 480;
            fillR(48, 62, cookW, 28, "#cbd5e1", "#0f172a", 2.0); // Stainless kitchen line
            fillR(56, 66, 140, 20, "#334155", "#0f172a", 1.5); // Flattop griddle
            fillR(212, 66, 110, 20, "#f59e0b", "#78350f", 1.5); // Golden deep-fryer vats
            if (t === "DINER_PAWN") {
                fillR(56, 132, 376, 26, "#dc2626", "#0f172a", 2.0); // Diner counter
                fillR(62, 136, 364, 18, "#f8fafc", "#94a3b8", 1.0);
                for (const by of [256, 344]) {
                    fillR(38, by, 118, 36, "#dc2626", "#7f1d1d", 2.0);
                    fillR(54, by + 6, 86, 24, "#fef3c7", "#d97706", 1.2);
                }
                fillR(500, 56, rw - 518, rh - 74, tex.wood_mahogany, "#f97316", 1.5);
                fillR(536, 254, 196, 72, tex.carpet_royal, "#fde047", 1.5);
                fillR(536, 124, 210, 28, tex.wood_oak, "#0f172a", 2.0);
                fillR(546, 346, 196, 32, "#334155", "#fbbf24", 2.0);
            } else {
                fillR(220, 124, 180, 24, "#e2e8f0", "#475569", 2.0);
                fillR(18, 208, 138, 216, tex.wood_oak, "#78350f", 1.5);
                for (const by of [238, 338]) {
                    fillR(36, by, 96, 42, "#dc2626", "#7f1d1d", 2.0);
                    fillR(50, by + 8, 68, 26, "#fef3c7", "#d97706", 1.2);
                }
                for (const tx of [254, 402]) {
                    for (const ty of [252, 354]) {
                        fillR(tx, ty, 62, 46, "#fffbeb", "#b45309", 2.0);
                        fillR(tx + 8, ty + 8, 46, 30, "#dc2626", "#fde047", 1.0);
                    }
                }
                fillR(568, 208, rw - 586, 216, tex.wood_mahogany, "#fde047", 1.5);
                fillR(354, 214, 112, 298, tex.carpet_royal, "#fbbf24", 1.5);
            }
        } else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL") {
            fillR(18, 56, 230, rh - 74, tex.wood_oak, "#92400e", 1.5);
            fillR(38, 86, 174, 176, tex.carpet_royal, "#fde047", 2.0);
            // King Bed (28, 96, 118, 86) with quilted coverlet, gold runner & twin white pillows
            fillR(28, 96, 118, 86, "#f8fafc", "#451a03", 2.0);
            fillR(44, 104, 22, 30, "#ffffff", "#cbd5e1", 1.2);
            fillR(44, 144, 22, 30, "#ffffff", "#cbd5e1", 1.2);
            fillR(70, 100, 72, 78, "#db2777", "#831843", 1.5);
            fillR(116, 100, 24, 78, "#fbbf24", "#92400e", 1.2);
            fillR(38, 306, 174, 188, tex.carpet_royal, "#f472b6", 1.5);
            fillR(316, 178, 188, 30, tex.wood_mahogany, "#fbbf24", 2.0); // Concierge Desk
            labelR(316, 178, 188, 30, "CONCIERGE DESK", "#fde047", "bold 9px Consolas, monospace");
            fillR(356, 208, 108, rh - 228, tex.carpet_royal, "#fbbf24", 2.0);
            fillR(564, 56, rw - 582, rh - 74, tex.marble_carrara, "#38bdf8", 1.5);
            fillR(584, 112, 176, 28, tex.wood_mahogany, "#22d3ee", 2.0);
            fillR(588, 344, 176, 112, "#e0f2fe", "#0284c7", 2.5);
            fillR(600, 356, 152, 88, "#06b6d4", "#67e8f9", 1.5);
        } else if (t === "SHOP_CLOTHES") {
            fillR(18, 56, 224, rh - 74, tex.wood_oak, "#92400e", 1.5);
            fillR(42, 122, 124, 28, tex.wood_mahogany, "#0f172a", 2.0);
            fillR(42, 316, 124, 26, "#fbbf24", "#78350f", 2.0);
            fillR(338, 168, 144, 252, tex.carpet_royal, "#fde047", 2.0);
            fillR(578, 56, rw - 596, rh - 74, tex.wood_mahogany, "#f472b6", 1.5);
            fillR(602, 118, 164, 28, "#38bdf8", "#0f172a", 2.0);
        } else if (t === "SHOP_CONVENIENCE") {
            fillR(18, 56, rw - 36, 130, tex.concrete_prison, "#475569", 1.5);
            fillR(18, 202, 210, 110, tex.gunmetal_plate, "#38bdf8", 1.5);
            fillR(38, 232, 168, 28, "#0d9488", "#0f172a", 2.0); // Cashier counter
            for (let ai = 0; ai < 3; ai++) {
                const gx = 286 + ai * 112;
                fillR(gx, 248, 42, 164, "#e2e8f0", "#0f172a", 2.0);
                fillR(gx + 4, 254, 15, 152, ai === 0 ? "#ef4444" : (ai === 1 ? "#22c55e" : "#eab308"));
                fillR(gx + 23, 254, 15, 152, ai === 0 ? "#3b82f6" : (ai === 1 ? "#f97316" : "#ec4899"));
            }
            fillR(624, 186, rw - 642, rh - 204, tex.kitchen_tile, "#22d3ee", 1.5);
        } else if (t === "SHOP_BAR" || t === "NEON_CLUB" || t === "STRIP_CLUB" || t === "MALIBU_CLUB") {
            fillR(18, 56, 230, rh - 74, tex.carpet_royal, "#f472b6", 1.5);
            fillR(578, 56, rw - 596, rh - 74, tex.gunmetal_plate, "#fde047", 1.5);
            if (t === "SHOP_BAR") {
                fillR(18, 262, 230, rh - 280, "#064e3b", "#fbbf24", 2.0);
                fillR(58, 342, 132, 74, "#15803d", "#78350f", 4.0); // 8-Ball Pool Table felt
            } else {
                fillR(288, 198, 244, 196, tex.wood_oak, "#e879f9", 2.0);
            }
        } else if (t === "MANSION") {
            fillR(18, 56, 240, rh - 74, tex.wood_mahogany, "#f97316", 1.5);
            fillR(62, 122, 148, 34, tex.wood_oak, "#fbbf24", 2.0); // Scarface executive desk
            fillR(348, 148, 124, rh - 168, tex.carpet_royal, "#fde047", 2.5);
            fillR(572, 56, rw - 590, rh - 74, tex.terrazzo_deco, "#22d3ee", 1.5);
            fillR(604, 338, 156, 108, "#06b6d4", "#e0f2fe", 2.5);
        } else if (t === "SPACE_BUNKER") {
            fillR(18, 56, 234, rh - 74, tex.concrete_prison, "#38bdf8", 1.5);
            fillR(580, 56, rw - 598, rh - 74, tex.kitchen_tile, "#39ff14", 1.5);
            fillR(296, 168, 228, 236, "#1e293b", "#38bdf8", 2.0);
        } else if (t === "PRISON_BLOCK") {
            fillR(18, 56, 260, 152, tex.concrete_prison, "#f87171", 1.5);
            fillR(294, 56, 222, 152, tex.wood_mahogany, "#fde047", 1.5);
            fillR(532, 56, rw - 550, 152, tex.gunmetal_plate, "#38bdf8", 1.5);
            fillR(312, 336, 196, 36, "#94a3b8", "#0f172a", 2.0);
        }

        // 3. Soft Perimeter Wall Ambient Occlusion Vignette on Floor (with clean doorway gap on active entrance wall)
        const nGrad = g.createLinearGradient(0, 56, 0, 92);
        nGrad.addColorStop(0, "rgba(0, 0, 0, 0.55)");
        nGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        g.fillStyle = nGrad;
        if (facing === "N") {
            g.fillRect(18, 56, 326, 36);
            g.fillRect(476, 56, rw - 494, 36);
        } else {
            g.fillRect(18, 56, rw - 36, 36);
        }

        const sGrad = g.createLinearGradient(0, rh - 18, 0, rh - 52);
        sGrad.addColorStop(0, "rgba(0, 0, 0, 0.50)");
        sGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        g.fillStyle = sGrad;
        if (facing === "S") {
            g.fillRect(18, rh - 52, 326, 34);
            g.fillRect(476, rh - 52, rw - 494, 34);
        } else {
            g.fillRect(18, rh - 52, rw - 36, 34);
        }

        const wGrad = g.createLinearGradient(18, 0, 52, 0);
        wGrad.addColorStop(0, "rgba(0, 0, 0, 0.50)");
        wGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        g.fillStyle = wGrad;
        if (facing === "W") {
            g.fillRect(18, 56, 34, 176);
            g.fillRect(18, 364, 34, rh - 382);
        } else {
            g.fillRect(18, 56, 34, rh - 74);
        }

        const eGrad = g.createLinearGradient(rw - 18, 0, rw - 52, 0);
        eGrad.addColorStop(0, "rgba(0, 0, 0, 0.50)");
        eGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        g.fillStyle = eGrad;
        if (facing === "E") {
            g.fillRect(rw - 52, 56, 34, 176);
            g.fillRect(rw - 52, 364, 34, rh - 382);
        } else {
            g.fillRect(rw - 52, 56, 34, rh - 74);
        }

        // 4. Subtle Contact Ambient Occlusion around Interior Partition Walls & Counters (no dark black smudges!)
        if (window.ShopInteriors && typeof window.ShopInteriors.getObstacles === "function") {
            const obs = window.ShopInteriors.getObstacles(intr);
            for (let i = 0; i < obs.length; i++) {
                const ob = obs[i];
                const pad = ob.isWall ? 6 : 4;
                g.fillStyle = ob.isWall ? "rgba(0, 0, 0, 0.14)" : "rgba(0, 0, 0, 0.10)";
                g.fillRect(ob.x - pad, ob.y - pad, ob.w + pad * 2, ob.h + pad * 2);
            }
        }

        g.restore();

        const glTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);

        this._interiorFloorTexCache[key] = glTex;
        return glTex;
    }

    drawInteriorArchitectureAndDecor(ctx, intr, ox, oy, rw, rh) {
        const tex = this.getInteriorTextures(ctx);
        const acc = intr.accent || "#38bdf8";
        const t = intr.theme;

        // Helper primitives relative to (ox, oy)
        const R = (x, y, w, h, fill, stroke, lw = 1.5) => {
            ctx.fillStyle = fill;
            ctx.fillRect(ox + x, oy + y, w, h);
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = lw;
                ctx.strokeRect(ox + x + 0.5, oy + y + 0.5, w - 1, h - 1);
            }
        };
        const C = (x, y, rad, fill, stroke, lw = 1.5) => {
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.arc(ox + x, oy + y, rad, 0, Math.PI * 2);
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = lw;
                ctx.stroke();
            }
        };
        const txt = (str, x, y, col = "#cbd5e1", font = "bold 9px Consolas, monospace", align = "center") => {
            ctx.save();
            ctx.font = font;
            ctx.fillStyle = col;
            ctx.textAlign = align;
            ctx.textBaseline = "middle";
            ctx.fillText(str, ox + x, oy + y);
            ctx.restore();
        };

        // 2.5D Object Box with floor drop shadow, south-facing vertical side face, and beveled top cap
        const Box3D = (x, y, w, h, topFill, faceFill, strokeCol, depth = 8) => {
            // Soft drop shadow on floor
            ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
            ctx.fillRect(ox + x + 4, oy + y + 5, w, h + depth);
            // South-facing vertical elevation face
            ctx.fillStyle = faceFill || "#0f172a";
            ctx.fillRect(ox + x, oy + y + h, w, depth);
            ctx.strokeStyle = "rgba(0,0,0,0.65)";
            ctx.lineWidth = 1;
            ctx.strokeRect(ox + x + 0.5, oy + y + h + 0.5, w - 1, depth - 1);
            // Top surface
            R(x, y, w, h, topFill, strokeCol || "#475569", 1.5);
            // Specular top bevel highlight
            ctx.fillStyle = "rgba(255,255,255,0.14)";
            ctx.fillRect(ox + x + 2, oy + y + 2, w - 4, 2);
        };

        // 2.5D Partition Wall Segment (top wall cap + south-facing wall elevation + baseboard + floor shadow)
        const Wall3D = (x, y, w, h, topCol = "#1e293b", faceCol = "#334155", trimCol = acc) => {
            const faceH = 12;
            ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
            ctx.fillRect(ox + x + 5, oy + y + 6, w, h + faceH);
            // South vertical face
            ctx.fillStyle = faceCol;
            ctx.fillRect(ox + x, oy + y + h, w, faceH);
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(ox + x, oy + y + h + faceH - 3, w, 3); // Baseboard trim
            // Top cap of wall
            R(x, y, w, h, topCol, trimCol, 1.5);
            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.fillRect(ox + x + 2, oy + y + 2, w - 4, 2);
        };

        // Potted tropical palm plant helper
        const PalmPot = (x, y, r = 14) => {
            C(x + 3, y + 4, r + 2, "rgba(0,0,0,0.42)");
            C(x, y, r * 0.72, "#7c2d12", "#fbbf24", 1.5);
            C(x, y, r * 0.52, "#451a03");
            for (let a = 0; a < 7; a++) {
                const ang = a * (Math.PI * 2 / 7) + 0.3;
                ctx.save();
                ctx.translate(ox + x, oy + y);
                ctx.rotate(ang);
                ctx.fillStyle = a % 2 === 0 ? "#16a34a" : "#15803d";
                ctx.beginPath();
                ctx.ellipse(r * 0.55, 0, r * 0.62, r * 0.24, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            C(x, y, 3, "#22c55e");
        };

        // ====================================================================
        // 1. MULTI-ZONE PROCEDURAL PIXEL-ART FLOORING BY VENUE THEME
        // ====================================================================
        let mainPat = tex.marble_dark;
        if (t === "SHOP_GUN_SHOP" || t === "SPACE_BUNKER") mainPat = tex.gunmetal_plate;
        else if (t === "SHOP_RESTAURANT" || t === "DINER_PAWN") mainPat = tex.diner_checker;
        else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL" || t === "MALIBU_CLUB") mainPat = tex.terrazzo_deco;
        else if (t === "SHOP_CLOTHES" || t === "MANSION") mainPat = tex.marble_carrara;
        else if (t === "SHOP_CONVENIENCE") mainPat = tex.linoleum_mart;
        else if (t === "SHOP_BAR") mainPat = tex.wood_mahogany;
        else if (t === "PRISON_BLOCK") mainPat = tex.concrete_prison;

        // Fill primary floor across the entire room
        R(16, 68, rw - 32, rh - 84, mainPat);

        // Room-specific floor sub-zones, rugs, dancefloors, and room thresholds
        if (t === "SHOP_GUN_SHOP") {
            // North-East Heavy Ordnance Vault concrete floor
            R(502, 74, 240, 198, tex.concrete_prison, "#475569", 1);
            // South-East Live Firing Range floor + yellow/black hazard boundary
            R(502, 280, 240, 224, "#18181b", "#facc15", 1.5);
            // Showroom crimson tactical rug under center aisle
            R(90, 210, 340, 95, tex.carpet_royal, "#b45309", 1.5);
        } else if (t === "SHOP_RESTAURANT") {
            // North Commercial Kitchen ceramic grease-proof tile floor
            R(18, 72, rw - 36, 76, tex.kitchen_tile, "#64748b", 1);
            // Warm oak flooring strips under West & East diner booth rows
            R(20, 220, 150, 250, tex.wood_oak, "#78350f", 1);
            R(rw - 170, 220, 150, 250, tex.wood_oak, "#78350f", 1);
        } else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL") {
            // West Private Bedroom Suite warm honey-oak floor + Persian bedside rug
            R(18, 72, 228, 405, tex.wood_oak, "#92400e", 1);
            R(45, 215, 165, 120, tex.carpet_royal, "#fde047", 1.5);
            // East VIP Lounge & Spa marble floor
            R(514, 72, 228, 405, tex.marble_carrara, "#64748b", 1);
            // Central Concierge Lobby Royal Red Carpet Runner from door to desk
            R(332, 144, 96, rh - 168, tex.carpet_royal, "#fbbf24", 1.5);
        } else if (t === "SHOP_CLOTHES") {
            // East Fitting Room Wing warm honey-oak floor
            R(560, 72, 182, 405, tex.wood_oak, "#92400e", 1);
            // Central VIP Velvet Runway Carpet
            R(275, 165, 210, 275, tex.carpet_royal, "#fde047", 2);
        } else if (t === "SHOP_CONVENIENCE") {
            // Behind-counter employee anti-fatigue rubber floor
            R(18, 92, 118, 126, tex.gunmetal_plate);
            // North cooler stainless drip strip
            R(190, 72, 548, 38, tex.kitchen_tile);
        } else if (t === "SHOP_BAR") {
            // East Billiards & Arcade Parlor emerald-green tournament carpet
            R(492, 72, 250, 405, "#064e3b", "#fbbf24", 1.5);
            R(504, 84, 226, 381, "rgba(16, 185, 129, 0.14)", "#047857", 1);
            // South-West Live Band Wooden Stage & Rug
            R(24, 408, 185, 76, tex.wood_oak, "#fbbf24", 2);
            R(42, 420, 145, 52, tex.carpet_royal, "#f59e0b", 1);
        } else if (t === "NEON_CLUB") {
            // West VIP Lounge velvet carpet & East Manager Vault concrete floor
            R(20, 76, 195, 390, tex.carpet_royal, "#f472b6", 1.5);
            R(564, 76, 216, 390, tex.gunmetal_plate, "#fde047", 1);
            // Animated Pulsing LED Club Dancefloor with individual glass bevel cells
            for (let y = 185; y < 375; y += 38) {
                for (let x = 240; x < 544; x += 38) {
                    const gx = Math.floor(x / 38);
                    const gy = Math.floor(y / 38);
                    const pIdx = Math.floor(this.time * 5 + gx * 1.3 + gy * 1.7) % 4;
                    const c = ["#db2777", "#0284c7", "#7c3aed", "#eab308"][pIdx];
                    R(x, y, 36, 36, c, "#ffffff", 1);
                    R(x + 4, y + 4, 28, 28, "rgba(255,255,255,0.18)");
                }
            }
        } else if (t === "STRIP_CLUB") {
            R(20, 76, 200, 390, tex.carpet_royal, "#e879f9", 1.5);
            R(564, 76, 216, 390, tex.gunmetal_plate, "#fde047", 1);
            // Center illuminated runway stage
            R(305, 120, 190, 235, tex.wood_mahogany, "#e879f9", 2.5);
            R(325, 136, 150, 200, "rgba(232, 121, 249, 0.22)", "#f0abfc", 1.5);
        } else if (t === "MALIBU_CLUB") {
            R(22, 76, 205, 160, tex.gunmetal_plate, "#f97316", 1.5);
            R(255, 175, 250, 200, tex.wood_oak, "#fb7185", 2);
        } else if (t === "MANSION") {
            // West Armory gunmetal floor, Center Royal Foyer Carpet, East Marble Spa Wing
            R(20, 76, 260, 390, tex.gunmetal_plate, "#f97316", 1);
            R(348, 120, 124, rh - 144, tex.carpet_royal, "#fde047", 2);
            R(536, 76, 264, 390, tex.terrazzo_deco, "#22d3ee", 1.5);
        } else if (t === "DINER_PAWN") {
            // West/Center Hank's Diner checker floor + North kitchen tile + East Uncle Jack's Pawn oak floor
            R(20, 72, 466, 48, tex.kitchen_tile);
            R(492, 72, 250, 405, tex.wood_mahogany, "#f97316", 1);
        }

        // ====================================================================
        // 2. 2.5D PERIMETER WALL ELEVATIONS, WAINSCOTING & AMBIENT OCCLUSION
        // ====================================================================
        // North 2.5D Wall Vertical Facade (y = 44..76) + Floor Ambient Occlusion Shadow
        R(14, 44, rw - 28, 32, "#1e293b", "#0f172a", 1);
        // Decorative upper wallpaper / paneling band
        R(16, 46, rw - 32, 18, "#334155");
        // Lower wood/steel wainscoting & baseboard along north wall
        R(16, 64, rw - 32, 12, "#0f172a", acc, 1);
        for (let wx = 24; wx < rw - 32; wx += 48) {
            R(wx, 48, 40, 14, "rgba(15, 23, 42, 0.45)", "rgba(255,255,255,0.08)", 1);
        }
        // Soft floor drop-shadow cast by the North, West, and East walls
        const nGrad = ctx.createLinearGradient(0, oy + 76, 0, oy + 108);
        nGrad.addColorStop(0, "rgba(0, 0, 0, 0.62)");
        nGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        ctx.fillStyle = nGrad;
        ctx.fillRect(ox + 16, oy + 76, rw - 32, 32);

        const wGrad = ctx.createLinearGradient(ox + 16, 0, ox + 44, 0);
        wGrad.addColorStop(0, "rgba(0, 0, 0, 0.52)");
        wGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        ctx.fillStyle = wGrad;
        ctx.fillRect(ox + 16, oy + 76, 28, rh - 92);

        const eGrad = ctx.createLinearGradient(ox + rw - 16, 0, ox + rw - 44, 0);
        eGrad.addColorStop(0, "rgba(0, 0, 0, 0.52)");
        eGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        ctx.fillStyle = eGrad;
        ctx.fillRect(ox + rw - 44, oy + 76, 28, rh - 92);

        // ====================================================================
        // 3. DETAILED MULTI-ROOM ARCHITECTURE & FURNITURE BY THEME
        // ====================================================================
        if (t === "SHOP_GUN_SHOP") {
            // --- NORTH WALL RIFLE & SMG PEGBOARD RACK (Showroom x=30..475) ---
            R(34, 47, 444, 24, "#0f172a", "#f97316", 1.5);
            for (let i = 0; i < 9; i++) {
                const gx = 46 + i * 48;
                // Pegboard rifle silhouette (stock + receiver + barrel + magazine)
                R(gx, 53, 10, 6, "#78350f");
                R(gx + 10, 52, 16, 5, "#64748b");
                R(gx + 26, 53, 12, 3, "#94a3b8");
                R(gx + 15, 57, 4, 6, "#334155");
            }
            // --- SHOWROOM ARMORED GLASS WEAPON COUNTER (x=56..460, y=118..146) ---
            Box3D(56, 118, 404, 28, "#0f172a", "#1e293b", "#38bdf8", 10);
            // Three illuminated glass display bays (Pistols / SMGs / Shotguns)
            for (let b = 0; b < 3; b++) {
                const bx = 66 + b * 132;
                R(bx, 121, 120, 22, "rgba(56, 189, 248, 0.16)", "#38bdf8", 1);
                // Red velvet display liner inside glass case
                R(bx + 4, 124, 112, 16, "rgba(127, 29, 29, 0.65)");
                if (b === 0) {
                    // Pistols & ammo boxes
                    for (let p = 0; p < 3; p++) {
                        R(bx + 12 + p * 34, 128, 16, 5, "#e2e8f0");
                        R(bx + 12 + p * 34, 133, 6, 5, "#475569");
                    }
                } else if (b === 1) {
                    // Micro-SMGs & extended mags
                    for (let p = 0; p < 2; p++) {
                        R(bx + 14 + p * 50, 127, 28, 6, "#94a3b8");
                        R(bx + 24 + p * 50, 133, 5, 6, "#fde047");
                    }
                } else {
                    // Pump-action shotguns & shell boxes
                    R(bx + 12, 127, 42, 5, "#78350f");
                    R(bx + 54, 128, 36, 4, "#cbd5e1");
                    R(bx + 16, 134, 72, 4, "#ef4444");
                }
                // Glass specular reflection streak
                ctx.fillStyle = "rgba(255,255,255,0.25)";
                ctx.fillRect(ox + bx + 8, oy + 122, 24, 2);
            }
            // Cash register & ammo crates on left end of counter
            Box3D(60, 114, 26, 18, "#334155", "#0f172a", "#fde047", 4);

            // --- PARTITION WALLS: HEAVY ORDNANCE VAULT (North-East) & FIRING RANGE (South-East) ---
            Wall3D(490, 68, 16, 98, "#1e293b", "#334155", "#f97316");
            Wall3D(490, 236, 16, 64, "#1e293b", "#334155", "#f97316");
            // Vault doorway steel threshold (y=166..236)
            R(490, 166, 16, 70, "#334155", "#facc15", 1);
            txt("ORDNANCE VAULT", 620, 88, "#f97316", "bold 10px Consolas, monospace");
            // Military olive-drab RPG & Flamethrower crates along NE vault wall
            Box3D(668, 110, 62, 48, "#365314", "#1a2e05", "#84cc16", 8);
            R(676, 124, 46, 6, "#4d7c0f");
            R(680, 134, 38, 8, "#f97316"); // RPG warhead inside open crate
            Box3D(668, 190, 62, 48, "#7c2d12", "#431407", "#fb923c", 8);
            C(690, 212, 10, "#ef4444", "#fde047", 1.5); // Napalm tank

            // Horizontal partition between Vault & Firing Range (doorway at x=534..610)
            Wall3D(506, 272, 28, 16, "#1e293b", "#334155", "#f97316");
            Wall3D(610, 272, 132, 16, "#1e293b", "#334155", "#f97316");

            // --- SOUTH-EAST 3-LANE LIVE INDOOR FIRING RANGE (x=502..740, y=288..496) ---
            // Bulletproof observation window wall on west side of range (y=300..475)
            Box3D(492, 300, 12, 175, "rgba(56,189,248,0.45)", "#0284c7", "#38bdf8", 8);
            // Yellow hazard line at firing line (x=562)
            R(558, 290, 6, 198, "#facc15");
            for (let hy = 292; hy < 484; hy += 16) R(558, hy, 6, 8, "#000000");
            // 3 Shooting Lanes with divider walls, distance lines, shell casings & paper bullseye targets!
            for (let lane = 0; lane < 3; lane++) {
                const ly = 292 + lane * 62;
                // Lane divider wall
                Box3D(564, ly, 172, 6, "#334155", "#0f172a", "#64748b", 5);
                // Shooting booth bench + red earmuffs
                Box3D(542, ly + 14, 16, 36, "#475569", "#1e293b", "#94a3b8", 6);
                C(550, ly + 24, 4, "#ef4444", "#000");
                // Downrange distance lines
                ctx.strokeStyle = "rgba(250, 204, 21, 0.22)";
                ctx.beginPath();
                ctx.moveTo(ox + 620, oy + ly + 8);
                ctx.lineTo(ox + 620, oy + ly + 58);
                ctx.moveTo(ox + 675, oy + ly + 8);
                ctx.lineTo(ox + 675, oy + ly + 58);
                ctx.stroke();
                // Paper silhouette bullseye target at East sandtrap berm (x=718)
                R(724, ly + 10, 12, 44, "#78350f", "#451a03", 1); // Sand berm
                R(712, ly + 16, 10, 32, "#f8fafc", "#334155", 1); // Target sheet
                C(717, ly + 32, 8, "#ef4444");
                C(717, ly + 32, 4, "#facc15");
                C(717, ly + 32, 1.5, "#000000");
                // Spent brass shell casings on floor
                for (let s = 0; s < 5; s++) {
                    R(528 + ((s * 7 + lane * 3) % 24), ly + 18 + s * 7, 3, 2, "#fde047");
                }
            }
            txt("LIVE FIRING RANGE — 25M", 645, 492, "#facc15", "bold 9px Consolas, monospace");

            // --- SOUTH-WEST TACTICAL BODY ARMOR & GEAR ALCOVE ---
            Box3D(42, 270, 195, 28, "#1e293b", "#0f172a", "#38bdf8", 9);
            for (let v = 0; v < 3; v++) {
                // Kevlar vests on tactical rack
                const vx = 58 + v * 58;
                R(vx, 273, 34, 22, "#0284c7", "#38bdf8", 1.5);
                R(vx + 6, 277, 22, 14, "#0f172a"); // Trauma plate
            }
            PalmPot(455, 465, 14);
        } else if (t === "SHOP_RESTAURANT") {
            // --- NORTH COMMERCIAL KITCHEN (y=72..140) ---
            // Stainless steel exhaust hood & kitchen equipment along north wall
            Box3D(36, 52, 220, 36, "#475569", "#334155", "#94a3b8", 6);
            // Sizzling Flattop Griddle with burger patties & bacon strips
            R(44, 56, 120, 28, "#1e293b", "#cbd5e1", 1.5);
            for (let p = 0; p < 6; p++) {
                C(60 + (p % 3) * 34, 64 + Math.floor(p / 3) * 11, 6, "#7c2d12", "#451a03", 1);
            }
            // Twin golden deep-fryer vats with wire baskets
            R(172, 56, 36, 28, "#ca8a04", "#fef08a", 1.5);
            R(214, 56, 36, 28, "#ca8a04", "#fef08a", 1.5);
            R(178, 60, 24, 18, "rgba(254, 240, 138, 0.55)", "#e2e8f0", 1);
            R(220, 60, 24, 18, "rgba(254, 240, 138, 0.55)", "#e2e8f0", 1);
            // Stainless prep island & backlit menu boards
            Box3D(280, 52, 190, 28, "#e2e8f0", "#64748b", "#94a3b8", 6);
            for (let m = 0; m < 3; m++) {
                R(290 + m * 60, 55, 52, 18, "#0f172a", "#facc15", 1);
            }
            // Espresso machine & walk-in refrigerator on North-East kitchen wall
            Box3D(490, 52, 220, 34, "#cbd5e1", "#475569", "#38bdf8", 6);
            Box3D(575, 56, 48, 24, "#b91c1c", "#7f1d1d", "#fde047", 4); // Italian Espresso Machine

            // --- TILED PASS-THROUGH SERVICE COUNTER WALL (x=24..648, y=138..160) ---
            Box3D(24, 138, 624, 22, "#78350f", "#451a03", "#fbbf24", 10);
            // Chrome tray slide & warm heat lamps with plated food on counter
            R(28, 155, 616, 4, "#cbd5e1");
            for (const px of [110, 165, 220, 340, 380, 425, 555, 605]) {
                C(px, 148, 8, "#ffffff", "#cbd5e1", 1);
                C(px, 148, 4, "#ea580c");
            }
            // Chrome counter stools along service counter
            for (let s = 0; s < 8; s++) {
                C(72 + s * 74, 174, 7, "#dc2626", "#f8fafc", 1.5);
            }

            // --- WEST & EAST CHROME-&-RED-VINYL DINER BOOTHS ---
            const drawBooth = (bx, by) => {
                // Red tufted vinyl bench seats (top & bottom of booth)
                Box3D(bx, by - 22, 126, 18, "#b91c1c", "#7f1d1d", "#fca5a5", 6);
                Box3D(bx, by + 28, 126, 18, "#b91c1c", "#7f1d1d", "#fca5a5", 6);
                // Formica / checkered table in middle
                Box3D(bx + 10, by - 2, 106, 26, "#fef3c7", "#78350f", "#d97706", 7);
                // Red checkered runner + plates, burger, coffee & ketchup/mustard
                R(bx + 44, by, 38, 22, "rgba(220, 38, 38, 0.35)");
                C(bx + 32, by + 11, 7, "#ffffff", "#94a3b8", 1);
                C(bx + 32, by + 11, 4, "#b45309");
                C(bx + 92, by + 11, 7, "#ffffff", "#94a3b8", 1);
                C(bx + 92, by + 11, 4, "#16a34a");
                C(bx + 56, by + 7, 3, "#dc2626"); // Ketchup
                C(bx + 66, by + 7, 3, "#facc15"); // Mustard
            };
            for (const by of [248, 328, 408]) {
                drawBooth(28, by);
                drawBooth(rw - 154, by);
            }

            // --- SOUTH-WEST GLOWING WURLITZER NEON JUKEBOX & PALMS ---
            Box3D(195, 438, 44, 34, "#451a03", "#270e02", "#fbbf24", 8);
            C(217, 448, 16, "#ec4899", "#fde047", 2);
            C(217, 448, 9, "#38bdf8");
            txt("JUKEBOX", 217, 484, "#facc15", "bold 8px Consolas, monospace");
            PalmPot(535, 458, 15);
        } else if (t === "SHOP_HOTEL" || t === "ART_DECO_HOTEL") {
            const isDeco = t === "ART_DECO_HOTEL";
            // --- NORTH CONCIERGE KEY RACK & GRAND LOBBY DESK ---
            R(268, 46, 224, 24, "#27121b", "#fbbf24", 1.5);
            for (let k = 0; k < 12; k++) {
                R(278 + k * 17, 50, 12, 16, "#451a03", "#d97706", 1);
                C(284 + k * 17, 58, 2, k % 3 === 0 ? "#fde047" : "#f472b6");
            }
            const deskY = isDeco ? 92 : 116;
            Box3D(295, deskY, 170, 28, "#78350f", "#451a03", "#fbbf24", 10);
            R(302, deskY + 4, 156, 20, "#92400e");
            R(330, deskY + 7, 26, 14, "#fef3c7", "#78350f", 1); // Open guest registry ledger
            C(375, deskY + 14, 4, "#fde047", "#b45309", 1);     // Brass service bell
            R(410, deskY + 6, 28, 14, "#0f172a", "#38bdf8", 1); // Terminal monitor

            // --- WEST PARTITIONED MASTER BEDROOM SUITE ---
            const wWallX = isDeco ? 256 : 240;
            Wall3D(wWallX, 68, 16, 162, "#2e1065", "#4c1d95", "#f472b6");
            Wall3D(wWallX, 315, 16, 160, "#2e1065", "#4c1d95", "#f472b6");
            R(wWallX, 230, 16, 85, "#451a03", "#fbbf24", 1); // Suite threshold
            // Luxury King Bed with carved mahogany headboard, 4 pillows & quilted coverlet
            Box3D(24, 108, 14, 92, "#451a03", "#270e02", "#fbbf24", 8); // Headboard
            Box3D(38, 110, 116, 88, "#f8fafc", "#cbd5e1", "#94a3b8", 8); // Mattress
            R(42, 116, 18, 36, "#ffffff", "#cbd5e1", 1); // Top pillow
            R(42, 156, 18, 36, "#ffffff", "#cbd5e1", 1); // Bottom pillow
            R(68, 112, 82, 84, "#be185d", "#f472b6", 1.5); // Silk quilted duvet
            R(118, 112, 26, 84, "#f43f5e", "#fde047", 1);  // Gold brocade bed runner
            // Twin nightstands with glowing warm table lamps
            Box3D(26, 82, 24, 22, "#78350f", "#451a03", "#fbbf24", 6);
            C(38, 93, 6, "#fef08a", "#f59e0b", 1.5);
            Box3D(26, 204, 24, 22, "#78350f", "#451a03", "#fbbf24", 6);
            C(38, 215, 6, "#fef08a", "#f59e0b", 1.5);
            // Mahogany Wardrobe & En-suite Bathroom vanity in SW corner
            Box3D(28, 368, 86, 28, "#78350f", "#451a03", "#fbbf24", 8);
            Box3D(135, 368, 82, 26, "#e2e8f0", "#94a3b8", "#38bdf8", 8);
            C(176, 381, 8, "#bae6fd", "#0284c7", 1.5); // Porcelain sink basin
            txt("MASTER SUITE", 125, 422, "#f472b6", "bold 9px Consolas, monospace");

            // --- EAST PARTITIONED VIP COCKTAIL LOUNGE & HEATED SPA ---
            const eWallX = isDeco ? 492 : 504;
            Wall3D(eWallX, 68, 16, 155, "#2e1065", "#4c1d95", "#38bdf8");
            Wall3D(eWallX, 315, 16, 160, "#2e1065", "#4c1d95", "#38bdf8");
            R(eWallX, 223, 16, 92, "#451a03", "#fbbf24", 1);
            // Backlit Cocktail Minibar Counter
            Box3D(545, 106, 168, 26, "#78350f", "#451a03", "#38bdf8", 9);
            for (let b = 0; b < 8; b++) {
                R(555 + b * 19, 52, 10, 18, ["#ec4899", "#38bdf8", "#a855f7", "#fde047"][b % 4], "#fff", 0.8);
                C(562 + b * 19, 138, 6, "#be185d", "#fbcfe8", 1); // Barstools
            }
            // Sunken Animated Mosaic Jacuzzi Spa Pool (SE Suite)
            Box3D(550, 336, 166, 122, "#e2e8f0", "#64748b", "#38bdf8", 6);
            R(560, 346, 146, 102, "#0891b2", "#22d3ee", 2);
            R(566, 352, 134, 90, "#06b6d4");
            // Submerged mosaic steps
            R(566, 352, 22, 90, "rgba(103, 232, 249, 0.45)", "#cffafe", 1);
            // Animated jacuzzi bubbles & water ripples
            for (let b = 0; b < 10; b++) {
                const bx = 595 + ((b * 29 + Math.floor(this.time * 18)) % 95);
                const by = 362 + ((b * 19 + Math.floor(this.time * 12)) % 70);
                C(bx, by, 2.5 + (b % 3), "rgba(255, 255, 255, 0.65)");
            }
            txt("VIP SPA JACUZZI", 633, 398, "#cffafe", "bold 9px Consolas, monospace");
            // Tropical lobby palms & brass luggage cart
            PalmPot(285, 445, 15);
            PalmPot(475, 445, 15);
            Box3D(272, 330, 38, 24, "#d97706", "#78350f", "#fde047", 5);
        } else if (t === "SHOP_CLOTHES") {
            // --- NORTH BACKLIT SNEAKER & HANDBAG DISPLAY WALL ---
            R(40, 46, 495, 24, "#0f172a", "#38bdf8", 1.5);
            for (let s = 0; s < 10; s++) {
                R(52 + s * 48, 51, 34, 14, "rgba(56, 189, 248, 0.2)", "#38bdf8", 1);
                R(58 + s * 48, 55, 22, 7, ["#f43f5e", "#facc15", "#38bdf8", "#a855f7", "#22c55e"][s % 5]);
            }
            // --- NORTH-WEST GLASS JEWELRY & CHECKOUT COUNTER ---
            Box3D(56, 112, 210, 26, "#1e293b", "#0f172a", "#38bdf8", 9);
            R(62, 115, 145, 20, "rgba(186, 230, 253, 0.35)", "#7dd3fc", 1);
            // Gold chains & watches inside glass case
            for (let j = 0; j < 5; j++) {
                C(80 + j * 26, 125, 6, "rgba(250, 204, 21, 0.35)", "#fde047", 1.5);
            }
            Box3D(216, 114, 42, 20, "#334155", "#0f172a", "#f472b6", 5); // Boutique POS Register

            // --- CENTRAL VELVET MANNEQUIN PODIUM (x=334..426, y=252..320) ---
            Box3D(334, 252, 92, 68, "#881337", "#4c0519", "#fde047", 8);
            R(340, 258, 80, 56, "#be123c", "#f472b6", 1);
            for (const mx of [356, 380, 404]) {
                C(mx, 286, 10, "#f8fafc", "#fde047", 1.5);
                C(mx, 286, 5, mx === 380 ? "#facc15" : "#38bdf8");
            }
            txt("VICE COUTURE", 380, 334, "#fde047", "bold 9px Consolas, monospace");

            // --- DESIGNER MULTI-GARMENT CLOTHING RACKS (West Wing) ---
            const rackCols = ["#ef4444", "#38bdf8", "#facc15", "#a855f7", "#ec4899", "#22c55e"];
            for (const ry of [256, 356]) {
                Box3D(72, ry, 160, 22, "#475569", "#1e293b", "#cbd5e1", 7);
                R(76, ry + 9, 152, 4, "#e2e8f0"); // Chrome hanger bar
                for (let g = 0; g < 11; g++) {
                    R(80 + g * 13, ry + 2, 9, 18, rackCols[(g + ry) % rackCols.length], "rgba(0,0,0,0.45)", 0.8);
                }
            }

            // --- EAST PARTITIONED FITTING ROOMS WING (x=552..742) ---
            Wall3D(552, 68, 16, 147, "#1e293b", "#334155", "#38bdf8");
            Wall3D(552, 305, 16, 165, "#1e293b", "#334155", "#38bdf8");
            R(552, 215, 16, 90, "#78350f", "#fde047", 1);
            // 3 Private Fitting Cubicles with velvet curtains, mirrors & stools
            for (let c = 0; c < 3; c++) {
                const cy = 84 + c * 132;
                if (c > 0) Wall3D(645, cy - 10, 92, 10, "#334155", "#1e293b", "#94a3b8");
                // Full-length illuminated vanity mirror on east wall
                R(726, cy + 12, 8, 68, "#bae6fd", "#fde047", 1.5);
                // Velvet privacy curtain & brass rod
                R(655, cy + 4, 10, 32, "#be185d", "#f472b6", 1);
                // Plush changing ottoman stool & rug
                C(695, cy + 46, 14, "rgba(244, 114, 182, 0.25)", "#f472b6", 1);
                C(695, cy + 46, 8, "#a855f7", "#fde047", 1.5);
            }
            txt("FITTING SUITES", 650, 482, "#38bdf8", "bold 9px Consolas, monospace");
            PalmPot(518, 110, 14);
            PalmPot(518, 435, 14);
        } else if (t === "SHOP_CONVENIENCE") {
            // --- NORTH ILLUMINATED 7-DOOR WALK-IN BEVERAGE COOLERS ---
            Box3D(195, 50, 535, 34, "#0f172a", "#1e293b", "#22d3ee", 6);
            for (let d = 0; d < 7; d++) {
                const dx = 203 + d * 75;
                R(dx, 54, 68, 26, "rgba(34, 211, 238, 0.24)", "#67e8f9", 1.5);
                // Rows of cold soda/beer/energy cans visible through glass door
                for (let c = 0; c < 5; c++) {
                    R(dx + 6 + c * 12, 58, 9, 8, ["#ef4444", "#22c55e", "#facc15", "#3b82f6", "#a855f7"][(d + c) % 5]);
                    R(dx + 6 + c * 12, 68, 9, 8, ["#38bdf8", "#f97316", "#ec4899", "#84cc16", "#eab308"][(d + c) % 5]);
                }
                R(dx + 60, 62, 3, 10, "#e2e8f0"); // Chrome door handle
            }

            // --- WEST L-SHAPED CASHIER COUNTER, LOTTO, CIGARETTE RACK & CCTV ---
            Box3D(118, 102, 28, 118, "#334155", "#1e293b", "#39ff14", 8);
            Box3D(28, 204, 118, 24, "#334155", "#1e293b", "#39ff14", 8);
            // Dual cash registers, barcode scanner & lotto display
            Box3D(120, 128, 22, 24, "#0f172a", "#020617", "#fde047", 5);
            R(124, 132, 14, 10, "#22c55e");
            Box3D(120, 168, 22, 24, "#0f172a", "#020617", "#38bdf8", 5);
            // Behind-counter cigarette rack & CRT CCTV security monitor on west wall
            Box3D(24, 96, 22, 88, "#451a03", "#270e02", "#f97316", 6);
            for (let r = 0; r < 6; r++) R(28, 102 + r * 13, 14, 9, ["#ef4444", "#facc15", "#38bdf8"][r % 3]);

            // --- 4 DOUBLE-SIDED 3D SUPERMARKET GONDOLA AISLES ---
            const drawGondola = (gx, gy, gw) => {
                Box3D(gx, gy, gw, 28, "#334155", "#0f172a", "#94a3b8", 9);
                R(gx + 4, gy + 12, gw - 8, 4, "#cbd5e1"); // Center shelf divider spine
                const pCols = ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#f97316", "#a855f7", "#ec4899"];
                for (let p = 0; p < Math.floor((gw - 12) / 16); p++) {
                    R(gx + 8 + p * 16, gy + 2, 12, 9, pCols[p % pCols.length], "rgba(0,0,0,0.4)", 0.8);
                    R(gx + 8 + p * 16, gy + 17, 12, 9, pCols[(p + 3) % pCols.length], "rgba(0,0,0,0.4)", 0.8);
                }
            };
            drawGondola(248, 210, 185);
            drawGondola(495, 210, 195);
            drawGondola(248, 338, 185);
            drawGondola(495, 338, 195);

            // --- EAST WALL SLUSHIE / HOT-DOG COUNTER & SOUTH-WEST ATM KIOSK ---
            Box3D(702, 120, 34, 90, "#1e293b", "#0f172a", "#f43f5e", 7);
            C(719, 138, 9, "#ef4444", "#fff", 1.5); // Cherry Slushie dome
            C(719, 162, 9, "#06b6d4", "#fff", 1.5); // Blue Raspberry Slushie dome
            Box3D(28, 355, 42, 58, "#0284c7", "#0369a1", "#38bdf8", 8);
            R(34, 365, 28, 18, "#0f172a", "#39ff14", 1.5);
            txt("ATM 24H", 49, 398, "#fde047", "bold 8px Consolas, monospace");
        } else if (t === "SHOP_BAR") {
            // --- NORTH-WEST BACKLIT LIQUOR MIRROR & MAHOGANY DIVE BAR ---
            R(44, 48, 392, 24, "#1e1b4b", "#c084fc", 1.5);
            for (let b = 0; b < 18; b++) {
                R(54 + b * 21, 52, 9, 16, ["#22c55e", "#ef4444", "#eab308", "#38bdf8", "#a855f7"][b % 5], "#fff", 0.6);
            }
            Box3D(44, 120, 392, 28, "#451a03", "#270e02", "#d97706", 10);
            R(48, 124, 384, 20, "#78350f");
            // Brass foot-rail, black rubber bar mats & draft beer towers
            R(46, 158, 388, 3, "#fbbf24");
            for (const tx of [135, 250, 365]) {
                R(tx - 24, 128, 48, 12, "#0f172a", "#475569", 1);
                C(tx, 124, 5, "#fbbf24", "#fff", 1);
            }
            // 7 Red leather round barstools along bar
            for (let s = 0; s < 7; s++) {
                C(74 + s * 54, 168, 9, "#991b1b", "#fca5a5", 1.5);
            }

            // --- EAST PARTITIONED BILLIARDS & RETRO ARCADE PARLOR (x=482..742) ---
            Wall3D(482, 68, 16, 127, "#27121b", "#451a03", "#c084fc");
            Wall3D(482, 335, 16, 135, "#27121b", "#451a03", "#c084fc");
            R(482, 195, 16, 140, "#451a03", "#fbbf24", 1);
            // 3 Glowing 1997 Retro Arcade Cabinets along North-East wall
            for (let a = 0; a < 3; a++) {
                const ax = 524 + a * 66;
                Box3D(ax, 76, 48, 36, "#1e1b4b", "#0f172a", ["#39ff14", "#00f0ff", "#f472b6"][a], 8);
                R(ax + 6, 82, 36, 18, ["#052e16", "#082f49", "#4a044e"][a], ["#39ff14", "#38bdf8", "#f472b6"][a], 1.5);
                C(ax + 16, 105, 2.5, "#ef4444");
                C(ax + 28, 105, 2.5, "#facc15");
            }
            // Tournament Emerald-Felt Pool Table (x=545..699, y=252..334)
            Box3D(545, 252, 154, 82, "#451a03", "#270e02", "#fbbf24", 10); // Mahogany rails
            R(555, 262, 134, 62, "#059669", "#047857", 1.5); // Emerald baize felt
            // 6 Brass & leather pockets
            for (const px of [555, 622, 689]) {
                for (const py of [262, 324]) C(px, py, 5.5, "#090d16", "#fbbf24", 1.2);
            }
            // Racked billiard balls + white cue ball + 2 wooden cue sticks
            C(582, 293, 3.2, "#ffffff", "#000", 0.6);
            const ballCols = ["#facc15", "#2563eb", "#ef4444", "#7c3aed", "#f97316", "#16a34a", "#000000"];
            for (let b = 0; b < 7; b++) {
                C(646 + (b % 3) * 6, 286 + Math.floor(b / 2) * 5, 3, ballCols[b]);
            }
            ctx.strokeStyle = "#fde68a";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ox + 560, oy + 272);
            ctx.lineTo(ox + 608, oy + 286);
            ctx.moveTo(ox + 625, oy + 318);
            ctx.lineTo(ox + 680, oy + 312);
            ctx.stroke();

            // --- SOUTH-WEST LEATHER BOOTHS & LIVE BAND CORNER STAGE ---
            for (const by of [270, 365]) {
                Box3D(34, by, 125, 26, "#451a03", "#270e02", "#c084fc", 7);
                C(96, by + 13, 8, "#fef3c7", "#d97706", 1);
            }
            // Stage mic stand & twin speaker stacks in SW corner
            Box3D(28, 415, 26, 26, "#0f172a", "#020617", "#c084fc", 6);
            C(115, 445, 7, "#94a3b8", "#f472b6", 1.5);
        } else if (t === "NEON_CLUB" || t === "STRIP_CLUB") {
            // --- NORTH RAISED DJ BOOTH, TURNTABLES & CONCERT SPEAKER WALL ---
            Box3D(250, 74, 300, 52, "#0f172a", "#020617", acc, 9);
            // Left & Right giant subwoofer speaker stacks
            for (const sx of [258, 506]) {
                Box3D(sx, 78, 36, 42, "#1e293b", "#090d16", "#94a3b8", 6);
                C(sx + 18, 90, 9, "#090d16", acc, 1.5);
                C(sx + 18, 108, 11, "#090d16", acc, 1.5);
            }
            // Twin Technics vinyl turntables & mixer console
            Box3D(350, 92, 100, 28, "#1e293b", "#0f172a", "#00f0ff", 5);
            C(368, 106, 10, "#090d16", "#e2e8f0", 1.5);
            C(368, 106, 3, "#ef4444");
            C(432, 106, 10, "#090d16", "#e2e8f0", 1.5);
            C(432, 106, 3, "#00f0ff");
            R(390, 96, 20, 20, "#0f172a", "#fde047", 1);

            // --- WEST VIP BOTTLE SERVICE BAR & VELVET BOOTHS ---
            Box3D(36, 120, 68, 220, "#3b0764", "#1e1b4b", "#f472b6", 9);
            for (let s = 0; s < 5; s++) C(116, 140 + s * 42, 8, "#be185d", "#fbcfe8", 1.5);
            for (const by of [375, 435]) {
                Box3D(36, by, 135, 34, "#500724", "#270e02", "#f472b6", 7);
            }

            // --- EAST PARTITIONED MANAGER'S COUNTING VAULT ROOM (x=556..780) ---
            Wall3D(556, 68, 16, 117, "#1e1b4b", "#311024", "#fde047");
            Wall3D(556, 265, 16, 195, "#1e1b4b", "#311024", "#fde047");
            R(556, 185, 16, 80, "#334155", "#fde047", 1);
            // Armored cash safe, counting table & gold/cash stacks
            Box3D(695, 84, 68, 54, "#334155", "#0f172a", "#fde047", 10);
            C(729, 111, 11, "#94a3b8", "#fde047", 2);
            Box3D(615, 290, 125, 65, "#451a03", "#270e02", "#fde047", 8);
            for (let m = 0; m < 6; m++) {
                R(630 + (m % 3) * 32, 304 + Math.floor(m / 3) * 20, 22, 12, "#22c55e", "#bbf7d0", 1);
            }
        } else if (t === "MALIBU_CLUB") {
            // North-West Smuggler Crate Room, North-East Retro Arcade Wall & SE Mojito Bar
            Box3D(42, 88, 72, 48, "#78350f", "#451a03", "#f97316", 9);
            Box3D(124, 88, 64, 42, "#365314", "#1a2e05", "#84cc16", 8);
            for (let a = 0; a < 4; a++) {
                Box3D(515 + a * 52, 82, 42, 34, "#1e1b4b", "#0f172a", "#39ff14", 7);
            }
            Box3D(520, 392, 195, 32, "#78350f", "#451a03", "#fb7185", 9);
            PalmPot(245, 435, 16);
            PalmPot(490, 435, 16);
        } else if (t === "MANSION") {
            // --- STAR ISLAND MANSION ("THE WORLD IS YOURS" PALAZZO) ---
            Wall3D(276, 68, 18, 115, "#334155", "#1e293b", "#fde047");
            Wall3D(276, 275, 18, 185, "#334155", "#1e293b", "#fde047");
            Wall3D(526, 68, 18, 115, "#334155", "#1e293b", "#fde047");
            Wall3D(526, 275, 18, 185, "#334155", "#1e293b", "#fde047");
            // Tony Montana Executive Mahogany Desk & CCTV Wall in North Center
            Box3D(335, 88, 150, 34, "#451a03", "#270e02", "#fde047", 9);
            // Golden "THE WORLD IS YOURS" Foyer Fountain Statue at (410, 330)
            C(410, 330, 38, "#1e293b", "#fde047", 2.5);
            C(410, 330, 28, "#0891b2", "#67e8f9", 1.5);
            C(410, 330, 12, "#fde047", "#b45309", 2);
            txt("THE WORLD IS YOURS", 410, 378, "#fde047", "bold 9px Consolas, monospace");
            // West Golden Heavy Armory Racks
            Box3D(42, 92, 190, 30, "#1e293b", "#0f172a", "#f97316", 8);
            // East Indoor Marble Jacuzzi Pool
            Box3D(562, 225, 215, 175, "#f8fafc", "#cbd5e1", "#fde047", 7);
            R(574, 237, 191, 151, "#0891b2", "#22d3ee", 2);
            for (let b = 0; b < 12; b++) {
                C(595 + ((b * 31 + Math.floor(this.time * 16)) % 145), 255 + ((b * 23 + Math.floor(this.time * 12)) % 115), 3, "rgba(255,255,255,0.65)");
            }
            PalmPot(315, 445, 16);
            PalmPot(505, 445, 16);
        } else if (t === "SPACE_BUNKER") {
            // --- SERA SPACE CENTER MISSION CONTROL ---
            // Giant Orbital Telemetry Screen Wall along North Elevation
            R(60, 46, rw - 120, 28, "#020617", "#38bdf8", 2);
            // World map sine-wave orbital trajectory on screen
            ctx.strokeStyle = "#39ff14";
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let sx = 80; sx < rw - 80; sx += 12) {
                const sy = 60 + Math.sin(sx * 0.03 + this.time * 3) * 8;
                if (sx === 80) ctx.moveTo(ox + sx, oy + sy);
                else ctx.lineTo(ox + sx, oy + sy);
            }
            ctx.stroke();
            // Tiered Mission Control Telemetry Desks
            Box3D(310, 102, 200, 28, "#0f172a", "#020617", "#ef4444", 8);
            Box3D(190, 195, 140, 24, "#0f172a", "#020617", "#38bdf8", 7);
            Box3D(490, 195, 140, 24, "#0f172a", "#020617", "#38bdf8", 7);
            // West Orbital Ordnance Locker & East glowing Bio-Medpod Cylinder
            Box3D(48, 175, 76, 130, "#1e293b", "#0f172a", "#38bdf8", 9);
            C(725, 250, 34, "rgba(57, 255, 20, 0.22)", "#39ff14", 2.5);
            C(725, 250, 20, "#052e16", "#4ade80", 1.5);
        } else if (t === "PRISON_BLOCK") {
            // --- LEONIDA STATE PENITENTIARY CELLBLOCK B ---
            Wall3D(278, 68, 16, 145, "#27272a", "#18181b", "#f87171");
            Wall3D(516, 68, 16, 145, "#27272a", "#18181b", "#38bdf8");
            // Steel prison bars across Cell #06 (West), Warden Office (Center) & Armory (East)
            for (let bx = 32; bx < 760; bx += 16) {
                if ((bx > 145 && bx < 205) || (bx > 370 && bx < 430) || (bx > 605 && bx < 665)) continue;
                R(bx, 208, 4, 14, "#94a3b8", "#18181b", 0.8);
            }
            // Cell #06 bunk bed & stainless prison toilet
            Box3D(36, 82, 84, 42, "#334155", "#1e293b", "#f87171", 7);
            C(245, 96, 10, "#cbd5e1", "#475569", 1.5);
            // Warden's desk & safe (Center) + SWAT Riot Armory Racks (East)
            Box3D(330, 96, 140, 28, "#451a03", "#270e02", "#fde047", 8);
            Box3D(555, 88, 195, 28, "#0f172a", "#020617", "#38bdf8", 8);
            // South Cellblock Steel Mess Tables
            Box3D(110, 345, 140, 32, "#475569", "#1e293b", "#94a3b8", 7);
            Box3D(550, 345, 140, 32, "#475569", "#1e293b", "#94a3b8", 7);
        } else if (t === "DINER_PAWN") {
            // --- HANK'S WAFFLES (West/Center) & UNCLE JACK'S PAWN SHOP (East) ---
            Wall3D(484, 68, 16, 150, "#334155", "#1e293b", "#fb923c");
            Wall3D(484, 305, 16, 165, "#334155", "#1e293b", "#fb923c");
            R(484, 218, 16, 87, "#451a03", "#fde047", 1);
            // Hank's Diner counter, waffle irons & register
            Box3D(60, 106, 390, 24, "#78350f", "#451a03", "#fbbf24", 9);
            for (let s = 0; s < 6; s++) C(90 + s * 58, 144, 7, "#dc2626", "#fff", 1.2);
            // Diner booths in SW
            for (const by of [255, 395]) {
                Box3D(42, by, 125, 28, "#b91c1c", "#7f1d1d", "#fde047", 7);
            }
            // Uncle Jack's Caged Pawn Counter & Gun Wall in East Wing
            Box3D(525, 106, 185, 26, "#1e293b", "#0f172a", "#f97316", 9);
            for (let g = 0; g < 6; g++) {
                R(535 + g * 28, 52, 20, 6, "#94a3b8");
            }
        }

        // ====================================================================
        // 4. OUTER 3D PERIMETER WALL CAPS, MOLDING TRIM & SOUTH ENTRYWAY ARCH
        // ====================================================================
        const doorGap = 156;
        const doorLeft = Math.round((rw - doorGap) * 0.5);
        const doorRight = doorLeft + doorGap;
        // Top, Left, Right, and split Bottom 3D perimeter wall caps
        R(0, 0, rw, 44, "#090d16", acc, 1.5);
        R(0, 44, 16, rh - 44, "#0f172a", acc, 1.5);
        R(rw - 16, 44, 16, rh - 44, "#0f172a", acc, 1.5);
        R(0, rh - 16, doorLeft, 16, "#0f172a", acc, 1.5);
        R(doorRight, rh - 16, rw - doorRight, 16, "#0f172a", acc, 1.5);
        // Brass / Neon Door Jamb Pillars flanking the South Exit
        Box3D(doorLeft - 10, rh - 24, 14, 22, "#334155", "#0f172a", "#fde047", 4);
        Box3D(doorRight - 4, rh - 24, 14, 22, "#334155", "#0f172a", "#fde047", 4);
    }

    renderActiveInterior(ctx, game) {
        const intr = game.activeInterior;
        if (!intr) return;

        const W = this.canvas.width;
        const H = this.canvas.height;
        const rw = intr.w || 780;
        const rh = intr.h || 530;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 1. Multi-Room Volumetric Ceiling Chandelier / Neon / Caustic Light Pools & Player Spotlight
        const trPtL = (lx, ly) => {
            if (window.ShopInteriors && typeof window.ShopInteriors.transformPoint === "function") {
                return window.ShopInteriors.transformPoint(lx, ly, 0, intr);
            }
            return { x: lx, y: ly };
        };
        const tTheme = intr.theme || "SHOP_CONVENIENCE";
        const isClubTheme = tTheme === "NEON_CLUB" || tTheme === "STRIP_CLUB" || tTheme === "MALIBU_CLUB" || tTheme === "SHOP_BAR";
        const isPoolTheme = tTheme === "SHOP_HOTEL" || tTheme === "ART_DECO_HOTEL" || tTheme === "MANSION";
        const roomLights = [
            { x: 410, y: 270, r: 135, col: isClubTheme ? "rgba(236, 72, 153, 0.12)" : "rgba(255, 240, 195, 0.11)" },
            { x: 125, y: 240, r: 105, col: isClubTheme ? "rgba(56, 189, 248, 0.10)" : "rgba(255, 236, 190, 0.09)" },
            { x: 675, y: 360, r: 115, col: isPoolTheme ? "rgba(34, 211, 238, 0.15)" : (tTheme === "SHOP_GUN_SHOP" ? "rgba(250, 204, 21, 0.10)" : "rgba(255, 236, 190, 0.09)") }
        ];
        for (let li = 0; li < roomLights.length; li++) {
            const rl = roomLights[li];
            const lp = trPtL(rl.x, rl.y);
            const lScr = this.worldToScreen(lp.x, lp.y, 2.02);
            const lg = ctx.createRadialGradient(lScr.x, lScr.y, 8, lScr.x, lScr.y, rl.r);
            lg.addColorStop(0, rl.col);
            lg.addColorStop(1, "rgba(0, 0, 0, 0.0)");
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.arc(lScr.x, lScr.y, rl.r, 0, Math.PI * 2);
            ctx.fill();
        }

        const p = game.player;
        const px = game.interiorX || rw * 0.5;
        const py = game.interiorY || rh - 78;
        const pScr = this.worldToScreen(px, py, 2.05);
        const spotGrad = ctx.createRadialGradient(pScr.x, pScr.y, 12, pScr.x, pScr.y, 92);
        spotGrad.addColorStop(0, "rgba(255, 240, 200, 0.14)");
        spotGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(pScr.x, pScr.y, 92, 0, Math.PI * 2);
        ctx.fill();

        // 2. Top-Center GTA Arcade Venue Header Banner (pinned cleanly at top center of viewport)
        const banW = Math.max(360, Math.min(540, W - 360));
        const banH = 44;
        const banX = Math.round(W * 0.5 - banW * 0.5);
        const banY = 12;

        ctx.fillStyle = "rgba(10, 15, 28, 0.92)";
        ctx.fillRect(banX, banY, banW, banH);
        ctx.strokeStyle = intr.accent || "#facc15";
        ctx.lineWidth = 2.0;
        ctx.strokeRect(banX + 0.5, banY + 0.5, banW - 1, banH - 1);

        ctx.font = "bold 16px Consolas, 'Courier New', monospace";
        ctx.fillStyle = "#fde047";
        ctx.fillText(intr.name, banX + banW * 0.5, banY + 16);
        ctx.font = "bold 11px Consolas, 'Courier New', monospace";
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(intr.subtitle, banX + banW * 0.5, banY + 33);

        // 3. 3D-Projected Interactive Station Badges (Clean, legible GTA pills when visible, expanded [E] card when near!)
        const placedRects = [];
        const resolveLabelOverlap = (x, y, w, h) => {
            let cy = y;
            for (let pass = 0; pass < 4; pass++) {
                let hit = false;
                for (let i = 0; i < placedRects.length; i++) {
                    const r = placedRects[i];
                    if (x < r.x + r.w + 6 && x + w + 6 > r.x && cy < r.y + r.h + 4 && cy + h + 4 > r.y) {
                        cy = (cy <= r.y) ? (r.y - h - 5) : (r.y + r.h + 5);
                        hit = true;
                    }
                }
                if (!hit) break;
            }
            placedRects.push({ x, y: cy, w, h });
            return cy;
        };

        if (Array.isArray(intr.stations)) {
            for (const st of intr.stations) {
                const stTop = this.worldToScreen(st.x, st.y, 2.26);
                if (stTop.x < -80 || stTop.x > W + 80 || stTop.y < 50 || stTop.y > H + 40) continue;
                const ready = (st.cooldown || 0) <= 0;
                const distToPlayer = Math.hypot(px - st.x, py - st.y);
                const isNear = distToPlayer < 88;
                const stCol = ready ? (st.color || "#39ff14") : "#94a3b8";

                const cleanSub = String(st.sub || "").replace(/^\[E\]\s*/i, "");
                ctx.font = isNear ? "bold 13px Consolas, 'Courier New', monospace" : "bold 11px Consolas, 'Courier New', monospace";
                const lblW = ctx.measureText(st.label).width;
                const subTxt = ready ? `[E] BUY / USE • ${cleanSub}` : `RECHARGING (${Math.ceil(st.cooldown)}S)`;
                ctx.font = "bold 10.5px Consolas, 'Courier New', monospace";
                const subW = (isNear || !ready) ? ctx.measureText(subTxt).width : 0;
                const bw = isNear ? Math.max(210, Math.round(Math.max(lblW, subW) + 26)) : Math.max(132, Math.round(lblW + 18));
                const bh = (isNear || !ready) ? 36 : 22;
                const bx = Math.round(stTop.x - bw * 0.5);
                const rawBy = Math.round(stTop.y - bh - (isNear ? 14 : 6));
                const by = resolveLabelOverlap(bx, rawBy, bw, bh);

                ctx.fillStyle = isNear ? "rgba(8, 13, 26, 0.96)" : "rgba(10, 16, 30, 0.88)";
                ctx.fillRect(bx, by, bw, bh);
                ctx.fillStyle = stCol;
                ctx.fillRect(bx, by, 4, bh);
                ctx.strokeStyle = isNear && ready ? "#fde047" : stCol;
                ctx.lineWidth = isNear ? 2.2 : 1.4;
                ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

                ctx.font = isNear ? "bold 13px Consolas, 'Courier New', monospace" : "bold 11px Consolas, 'Courier New', monospace";
                ctx.fillStyle = ready ? "#ffffff" : "#cbd5e1";
                ctx.fillText(st.label, bx + bw * 0.5 + 2, by + ((isNear || !ready) ? 11.5 : 11));
                if (isNear || !ready) {
                    ctx.font = "bold 10.5px Consolas, 'Courier New', monospace";
                    ctx.fillStyle = isNear && ready ? "#fde047" : stCol;
                    ctx.fillText(subTxt, bx + bw * 0.5 + 2, by + 26);
                    if (isNear && ready && Array.isArray(this.cheatButtons)) {
                        this.cheatButtons.push({ id: "TRIGGER_STATION", x: bx, y: by, w: bw, h: bh, station: st });
                    }
                }
            }
        }

        // 3B. Indoor Bullet Tracers & Target Bullseye Floating Popups
        if (Array.isArray(game.interiorTracers)) {
            for (const tr of game.interiorTracers) {
                const s1 = this.worldToScreen(tr.x1, tr.y1, 2.15);
                const s2 = this.worldToScreen(tr.x2, tr.y2, 2.15);
                ctx.save();
                ctx.strokeStyle = tr.color || "#fde047";
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(s1.x, s1.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.stroke();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(s2.x, s2.y, 4.0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        if (Array.isArray(game.interiorPopups)) {
            for (const pop of game.interiorPopups) {
                const pPos = this.worldToScreen(pop.x, pop.y, 2.38);
                ctx.font = "bold 11px Consolas, 'Courier New', monospace";
                const pw = ctx.measureText(pop.text).width + 14;
                ctx.fillStyle = "rgba(7, 11, 22, 0.92)";
                ctx.fillRect(pPos.x - pw * 0.5, pPos.y - 11, pw, 20);
                ctx.strokeStyle = pop.color || "#fde047";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(pPos.x - pw * 0.5, pPos.y - 11, pw, 20);
                ctx.fillStyle = pop.color || "#fde047";
                ctx.fillText(pop.text, pPos.x, pPos.y - 1);
            }
        }

        // 4. 3D-Projected Venue NPC Role Labels & Speech Bubbles (shown when near player or during hold-up so distant rooms stay clean!)
        if (Array.isArray(intr.npcs)) {
            for (let i = 0; i < intr.npcs.length; i++) {
                const npc = intr.npcs[i];
                if (!npc.label) continue;
                const isDancing = !!(npc.dancing || npc.label === "DANCER" || npc.label === "CLUBBER");
                const nx = npc.x + (isDancing ? Math.sin(this.time * 4.0 + i) * 7.5 : Math.sin(this.time * 1.4 + i * 2.1) * 1.4);
                const ny = npc.y + (isDancing ? Math.cos(this.time * 4.0 + i) * 5.5 : Math.cos(this.time * 1.1 + i * 1.7) * 1.0);
                const distNpc = Math.hypot(px - nx, py - ny);
                const robbedLine = (npc._robbedTimer || 0) > 0 ? "🙌 DON'T SHOOT! TAKE WHATEVER YOU WANT!" : null;
                if (distNpc > 165 && !robbedLine) continue;

                const npcZ = (npc.z || 2.055) + 0.175;
                const nScr = this.worldToScreen(nx, ny, npcZ);

                ctx.font = "bold 10.5px Consolas, monospace";
                const tw = ctx.measureText(npc.label).width + 14;
                const tx = Math.round(nScr.x - tw * 0.5);
                const ty = resolveLabelOverlap(tx, Math.round(nScr.y - 22), tw, 17);
                ctx.fillStyle = "rgba(8, 12, 24, 0.90)";
                ctx.fillRect(tx, ty, tw, 17);
                ctx.strokeStyle = "#fde047";
                ctx.lineWidth = 1.2;
                ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, 16);
                ctx.fillStyle = "#fde047";
                ctx.fillText(npc.label, tx + tw * 0.5, ty + 8.5);

                // Proximity 1997 Arcade Speech Bubble when player approaches NPC or during an armed hold-up!
                const speech = robbedLine || (distNpc < 110 ? npc.dialog : null);
                if (speech) {
                    ctx.font = "bold 11px Consolas, 'Courier New', monospace";
                    const sw = Math.min(380, ctx.measureText(speech).width + 18);
                    const sx = Math.max(14, Math.min(W - sw - 14, Math.round(nScr.x - sw * 0.5)));
                    const sy = resolveLabelOverlap(sx, ty - 23, sw, 20);
                    ctx.fillStyle = robbedLine ? "rgba(69, 10, 10, 0.96)" : "rgba(15, 23, 42, 0.95)";
                    ctx.fillRect(sx, sy, sw, 20);
                    ctx.strokeStyle = robbedLine ? "#ef4444" : (intr.accent || "#38bdf8");
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, 19);
                    ctx.fillStyle = robbedLine ? "#fecaca" : "#ffffff";
                    ctx.fillText(speech, sx + sw * 0.5, sy + 10);
                }
            }
        }

        // Companion Tag (Jason or Lucia standing watch near the entrance — only when recruited!)
        const pose = (window.ShopInteriors && window.ShopInteriors.getEntrancePose)
            ? window.ShopInteriors.getEntrancePose(intr)
            : { partnerX: rw * 0.5 - 64, partnerY: rh - 62, exitX: rw * 0.5, exitY: rh - 8 };
        if (game.jason && game.jason.recruited) {
            const isJasonPlayer = p && (p.pedType === "jason" || String(p.charId).toUpperCase() === "JASON");
            const partnerName = isJasonPlayer ? "LUCIA [PARTNER]" : "JASON [PARTNER]";
            const jScr = this.worldToScreen(pose.partnerX, pose.partnerY, 2.22);
            ctx.font = "bold 9px Consolas, monospace";
            const jTw = ctx.measureText(partnerName).width + 10;
            const jx = Math.round(jScr.x - jTw * 0.5);
            const jy = resolveLabelOverlap(jx, Math.round(jScr.y - 18), jTw, 13);
            ctx.fillStyle = "rgba(8, 12, 24, 0.86)";
            ctx.fillRect(jx, jy, jTw, 13);
            ctx.fillStyle = "#38bdf8";
            ctx.fillText(partnerName, jx + jTw * 0.5, jy + 6.5);
        }

        // 5. 3D-Projected Active Player Tag
        const pTopScr = this.worldToScreen(px, py, 2.24);
        const pLabel = (p && p.charId ? p.charId : "lucia").toUpperCase();
        ctx.font = "bold 10px Consolas, monospace";
        const pTw = ctx.measureText(pLabel).width + 10;
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.fillRect(pTopScr.x - pTw * 0.5, pTopScr.y - 18, pTw, 14);
        ctx.strokeStyle = "#f472b6";
        ctx.lineWidth = 1;
        ctx.strokeRect(pTopScr.x - pTw * 0.5, pTopScr.y - 18, pTw, 14);
        ctx.fillStyle = "#f472b6";
        ctx.fillText(pLabel, pTopScr.x, pTopScr.y - 11);

        // 6. 3D-Projected Threshold [🚪 EXIT TO STREET] Button (anchored on actual building entrance wall)
        const exScr = this.worldToScreen(pose.exitX, pose.exitY, 2.08);
        const nearExit = Math.hypot(px - pose.exitX, py - pose.exitY) < 88;
        const exitTxt = nearExit ? "🚪 [ESC / WALK] EXIT TO STREET" : "🚪 EXIT TO STREET [ESC]";
        const exitW = nearExit ? 196 : 166;
        const exitH = 24;
        const exitX = Math.max(12, Math.min(W - exitW - 12, Math.round(exScr.x - exitW * 0.5)));
        const exitY = Math.max(48, Math.min(H - 36, Math.round(exScr.y - exitH * 0.5)));

        ctx.fillStyle = nearExit ? "rgba(180, 24, 112, 0.96)" : "rgba(15, 23, 42, 0.94)";
        ctx.fillRect(exitX, exitY, exitW, exitH);
        ctx.strokeStyle = nearExit ? "#fde047" : (intr.accent || "#38bdf8");
        ctx.lineWidth = nearExit ? 2.0 : 1.6;
        ctx.strokeRect(exitX + 0.5, exitY + 0.5, exitW - 1, exitH - 1);
        ctx.font = "bold 10px Consolas, 'Courier New', monospace";
        ctx.fillStyle = nearExit ? "#fde047" : "#f8fafc";
        ctx.fillText(exitTxt, exitX + exitW * 0.5, exitY + exitH * 0.5);

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

        const rrectOn = (c, rx, ry, rw, rh, rad) => {
            c.beginPath();
            if (typeof c.roundRect === "function") {
                c.roundRect(rx, ry, rw, rh, rad);
            } else {
                c.rect(rx, ry, rw, rh);
            }
        };
        const rrect = (rx, ry, rw, rh, rad) => rrectOn(ctx, rx, ry, rw, rh, rad);

        const timeInfo = (game && typeof game.getTimePhaseInfo === "function")
            ? game.getTimePhaseInfo()
            : { icon: "☀️", dockLabel: "☀️ DAY [N]", phase: "DAY" };
        const showColon = (Math.floor(this.time * 2.0) % 2) === 0;
        const liveClockStr = (game && typeof game.getClockString === "function")
            ? game.getClockString(showColon)
            : "16:30";

        // Fast cached offscreen pill path for mobile minimized Smartphone (~2 redraws/sec instead of 60 Hz gradients + clips!)
        if (isMinimized && isMobile) {
            const pillKey = `${pw}x${ph}:${timeInfo.icon}:${liveClockStr}`;
            const cw = pw + 6;
            const ch = ph + 6;
            if (!this._minPhonePillCanvas || this._minPhonePillCanvas.width !== cw || this._minPhonePillCanvas.height !== ch) {
                this._minPhonePillCanvas = document.createElement("canvas");
                this._minPhonePillCanvas.width = cw;
                this._minPhonePillCanvas.height = ch;
                this._minPhonePillCtx = this._minPhonePillCanvas.getContext("2d");
                this._minPhonePillKey = "";
            }
            if (this._minPhonePillKey !== pillKey && this._minPhonePillCtx) {
                this._minPhonePillKey = pillKey;
                const pc = this._minPhonePillCtx;
                const ox = 3;
                const oy = 3;
                pc.clearRect(0, 0, cw, ch);
                rrectOn(pc, ox, oy, pw, ph, 22);
                pc.fillStyle = "#020617";
                pc.fill();
                pc.lineWidth = 2.5;
                const fGrad = pc.createLinearGradient(ox, oy, ox + pw, oy + ph);
                fGrad.addColorStop(0, "#94a3b8");
                fGrad.addColorStop(0.5, "#475569");
                fGrad.addColorStop(1, "#64748b");
                pc.strokeStyle = fGrad;
                pc.stroke();

                const osx = ox + 5;
                const osy = oy + 5;
                const osw = pw - 10;
                const osh = ph - 10;
                rrectOn(pc, osx, osy, osw, osh, 18);
                const wGrad = pc.createLinearGradient(osx, osy, osx, osy + osh);
                wGrad.addColorStop(0, "#0b1120");
                wGrad.addColorStop(0.55, "#111329");
                wGrad.addColorStop(1, "#1b0e28");
                pc.fillStyle = wGrad;
                pc.fill();

                pc.save();
                rrectOn(pc, osx, osy, osw, osh, 18);
                pc.clip();
                pc.fillStyle = "#f8fafc";
                pc.font = "bold 9.5px Consolas, 'Courier New', monospace";
                pc.textBaseline = "middle";
                pc.fillText(`${timeInfo.icon} ${liveClockStr}`, osx + 8, osy + 10);

                const sigX = osx + osw - 50;
                const sigY = osy + 12.5;
                for (let b = 0; b < 4; b++) {
                    const bh = 3 + b * 1.6;
                    pc.fillRect(sigX + b * 3.2, sigY - bh, 2.1, bh);
                }
                pc.font = "bold 7.5px -apple-system, 'Segoe UI', sans-serif";
                pc.fillText("5G", sigX + 15, osy + 10);

                const batX = osx + osw - 22;
                const batY = osy + 6.5;
                pc.strokeStyle = "#cbd5e1";
                pc.lineWidth = 1;
                rrectOn(pc, batX, batY, 13, 6.5, 1.5);
                pc.stroke();
                pc.fillStyle = "#4ade80";
                pc.fillRect(batX + 1.5, batY + 1.5, 9, 3.5);
                pc.fillStyle = "#cbd5e1";
                pc.fillRect(batX + 13.5, batY + 2, 1.2, 2.5);

                pc.fillStyle = "#38bdf8";
                pc.font = "bold 10px -apple-system, 'Segoe UI', sans-serif";
                pc.fillText("📱 • 🎵 • 📍", osx + 7, osy + 20);
                pc.restore();
            }
            ctx.drawImage(this._minPhonePillCanvas, px - 3, py - 3);
            this.cheatButtons.push({ id: "TOGGLE_NIGHT", x: px + 9, y: py + 7, w: 68, h: 15 });
            this.cheatButtons.push({ id: "UNMINIMIZE_PHONE", x: px, y: py, w: pw, h: ph });
            this.renderPhoneGpsWidget(ctx, game, px, py + ph + 4, pw, 114, rrect);
            applyPhoneScaleToButtons();
            ctx.restore();
            return;
        }

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

        if (!this._phoneDomEls) {
            this._phoneDomEls = {
                volSlider: document.getElementById("yt-vol-slider"),
                senderEl: document.getElementById("pager-sender"),
                pagerEl: document.getElementById("pager-text")
            };
        }
        const volSlider = this._phoneDomEls.volSlider;
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

        const senderEl = this._phoneDomEls.senderEl;
        let contactName = "Jason Duval";
        if (senderEl && senderEl.textContent) {
            const rawSender = senderEl.textContent;
            if (this._lastSenderRaw === rawSender && this._lastContactName) {
                contactName = this._lastContactName;
            } else {
                const cleaned = rawSender
                    .replace(/📱|📟|SMARTPHONE|PAGER|BIPEUR\s*'97|BIPEUR|\(PARTNER\)/gi, "")
                    .replace(/^[\s/]+/, "")
                    .trim();
                if (cleaned.toUpperCase().includes("LUCIA")) contactName = "Jason & Lucia";
                else if (cleaned.length > 0 && !cleaned.toUpperCase().includes("JASON")) contactName = cleaned;
                this._lastSenderRaw = rawSender;
                this._lastContactName = contactName;
            }
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

        // Word-wrapped English SMS message body (cached until message or width changes!)
        const pagerEl = this._phoneDomEls.pagerEl;
        const rawMsg = pagerEl
            ? (pagerEl.textContent || "").trim()
            : "Welcome to Vice City! Use the GPS map above or press [M] to fast-travel anywhere.";

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "9.5px -apple-system, 'Segoe UI', sans-serif";
        const maxLineW = smsW - 14;
        const smsCacheKey = `${maxLineW}:${rawMsg}`;
        let lines = this._smsLinesCache;
        if (!lines || this._smsCacheKey !== smsCacheKey) {
            const words = rawMsg.split(/\s+/);
            lines = [];
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
            this._smsCacheKey = smsCacheKey;
            this._smsLinesCache = lines;
        }

        let textY = smsY + 33;
        const maxLines = Math.min(2, lines.length);
        for (let i = 0; i < maxLines; i++) {
            ctx.fillText(lines[i], smsX + 7, textY);
            textY += 12.5;
        }

        // Interactive Smartphone Mission Launcher Bar inside Messages Card
        const mBarY = smsY + smsH - 24;
        const mBarH = 19;
        const activeM = game && game.missions ? game.missions.activeMission : null;
        const selPhone = (game && game.missions && typeof game.missions.getSelectedPhone === "function")
            ? game.missions.getSelectedPhone()
            : null;

        if (activeM) {
            const abortW = 54;
            const statW = smsW - abortW - 14;
            rrect(smsX + 6, mBarY, statW, mBarH, 5);
            ctx.fillStyle = "rgba(190, 24, 93, 0.28)";
            ctx.fill();
            ctx.strokeStyle = "#ff2a85";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "#fde047";
            ctx.font = "bold 8.2px -apple-system, 'Segoe UI', sans-serif";
            const objShort = String(activeM.objectiveLabel || activeM.title || "ACTIVE MISSION").slice(0, 21);
            ctx.fillText(`🎯 ${objShort}`, smsX + 11, mBarY + mBarH * 0.5 + 0.5);

            const abX = smsX + 8 + statW;
            rrect(abX, mBarY, abortW, mBarH, 5);
            ctx.fillStyle = "rgba(153, 27, 27, 0.85)";
            ctx.fill();
            ctx.strokeStyle = "#f87171";
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText("✖ ABORT", abX + abortW * 0.5, mBarY + mBarH * 0.5 + 0.5);
            ctx.textAlign = "left";
            this.cheatButtons.push({ id: "PHONE_MISSION_ABORT", x: abX, y: mBarY, w: abortW, h: mBarH });
        } else if (selPhone) {
            const nextW = 24;
            const startW = smsW - nextW - 14;
            rrect(smsX + 6, mBarY, startW, mBarH, 5);
            ctx.fillStyle = selPhone.completed ? "rgba(30, 58, 138, 0.72)" : "rgba(21, 128, 61, 0.78)";
            ctx.fill();
            ctx.strokeStyle = selPhone.completed ? "#38bdf8" : "#4ade80";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = "#f8fafc";
            ctx.font = "bold 8.4px -apple-system, 'Segoe UI', sans-serif";
            const btnTitle = selPhone.shortTitle || "MISSION";
            const prefix = selPhone.completed ? "🔄 REPLAY " : "📲 START ";
            ctx.fillText(`${prefix}${btnTitle}`, smsX + 11, mBarY + mBarH * 0.5 + 0.5);
            this.cheatButtons.push({ id: "PHONE_MISSION_START", x: smsX + 6, y: mBarY, w: startW, h: mBarH });

            const nxX = smsX + 8 + startW;
            rrect(nxX, mBarY, nextW, mBarH, 5);
            ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
            ctx.fill();
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = "#38bdf8";
            ctx.textAlign = "center";
            ctx.fillText("⏭", nxX + nextW * 0.5, mBarY + mBarH * 0.5 + 0.5);
            ctx.textAlign = "left";
            this.cheatButtons.push({ id: "PHONE_MISSION_NEXT", x: nxX, y: mBarY, w: nextW, h: mBarH });
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
        const spanBlocks = zoomMode === 0 ? 68 : (zoomMode === 1 ? 160 : MAP_COLS);
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

        // 2. Live GPS Map Image inside Smartphone (cached at 10 Hz on mobile to eliminate 60 Hz 1024px resampling + 700-blip overdraw)
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

        let nearestLm = null;
        let nearestDist = Infinity;
        if (Array.isArray(this.map.landmarks)) {
            for (let li = 0; li < this.map.landmarks.length; li++) {
                const lm = this.map.landmarks[li];
                const d = Math.hypot(lm.x - p.x, lm.y - p.y);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestLm = lm;
                }
            }
        }

        const useMobileMiniCache = Boolean(this.isMobileInit && mw > 0 && mh > 0);
        let drawTargetCtx = ctx;
        let ox = mx;
        let oy = my;
        let skipRedraw = false;

        if (useMobileMiniCache) {
            if (!this._gpsMiniCacheCanvas) {
                this._gpsMiniCacheCanvas = document.createElement("canvas");
            }
            if (this._gpsMiniCacheCanvas.width !== mw || this._gpsMiniCacheCanvas.height !== mh) {
                this._gpsMiniCacheCanvas.width = mw;
                this._gpsMiniCacheCanvas.height = mh;
                this._gpsMiniCacheTick = 0;
            }
            this._gpsMiniCacheTick = ((this._gpsMiniCacheTick || 0) + 1) % 6;
            if (this._gpsMiniCacheTick !== 1 && this._gpsMiniLastZoom === zoomMode && this._gpsMiniCacheReady) {
                skipRedraw = true;
            } else {
                this._gpsMiniLastZoom = zoomMode;
                this._gpsMiniCacheReady = true;
                drawTargetCtx = this._gpsMiniCacheCanvas.getContext("2d");
                ox = 0;
                oy = 0;
            }
        }

        if (!skipRedraw) {
            const mctx = drawTargetCtx;
            mctx.save();
            if (!useMobileMiniCache) {
                mctx.beginPath();
                mctx.rect(ox, oy, mw, mh);
                mctx.clip();
            }
            mctx.fillStyle = "#07101c";
            mctx.fillRect(ox, oy, mw, mh);
            mctx.imageSmoothingEnabled = false;
            mctx.drawImage(srcImg, srcX, srcY, srcW, srcH, ox, oy, mw, mh);

            const invW = mw / viewWorldW;
            const invH = mh / viewWorldH;

            // Pay 'n' Spray Shops
            if (Array.isArray(this.map.payNSprays)) {
                for (let i = 0; i < this.map.payNSprays.length; i++) {
                    const pns = this.map.payNSprays[i];
                    const px = ox + (pns.x + pns.w * 0.5 - viewWorldX) * invW;
                    const py = oy + (pns.y + pns.h * 0.5 - viewWorldY) * invH;
                    if (px < ox - 6 || px > ox + mw + 6 || py < oy - 6 || py > oy + mh + 6) continue;
                    mctx.fillStyle = "#14532d";
                    mctx.fillRect(px - 3.5, py - 3.5, 7, 7);
                    mctx.strokeStyle = "#39ff14";
                    mctx.lineWidth = 1;
                    mctx.strokeRect(px - 3.5, py - 3.5, 7, 7);
                }
            }

            // Enterable Venue Doors when zoomed in
            if (!this.isMobileInit && Array.isArray(this.map.interiors) && zoomMode < 2) {
                for (let i = 0; i < this.map.interiors.length; i++) {
                    const intr = this.map.interiors[i];
                    const px = ox + (intr.doorX - viewWorldX) * invW;
                    const py = oy + (intr.doorY - viewWorldY) * invH;
                    if (px < ox - 4 || px > ox + mw + 4 || py < oy - 4 || py > oy + mh + 4) continue;
                    mctx.fillStyle = intr.accent || "#f472b6";
                    mctx.fillRect(px - 2, py - 2, 4, 4);
                    mctx.strokeStyle = "#090d16";
                    mctx.lineWidth = 0.8;
                    mctx.strokeRect(px - 2, py - 2, 4, 4);
                }
            }

            // Single-pass Cops, Criminals, Landmark Cars & Watercraft Blips (filters type BEFORE math!)
            const copFlash = Math.floor(this.time * 8) % 2 === 0;
            if (Array.isArray(game.vehicles)) {
                for (let i = 0; i < game.vehicles.length; i++) {
                    const v = game.vehicles[i];
                    if (v.destroyed || v === p.inVehicle) continue;
                    const isBoat = Boolean(v.waterOnly || v.specKey === "AIRBOAT");
                    const isCop = Boolean(v.driver === "AI_COP" || v.isPolice);
                    const isCrim = v.driver === "AI_CRIMINAL";
                    const isLmVeh = v.missionTag === "LANDMARK";
                    if (!isBoat && (zoomMode >= 2 || (!isCop && !isCrim && !isLmVeh))) continue;

                    const px = ox + (v.x - viewWorldX) * invW;
                    const py = oy + (v.y - viewWorldY) * invH;
                    if (px < ox || px > ox + mw || py < oy || py > oy + mh) continue;

                    if (isBoat) {
                        if (px >= ox + 4 && px <= ox + mw - 4 && py >= oy + 4 && py <= oy + mh - 4) {
                            mctx.fillStyle = "#00f0ff";
                            mctx.fillRect(px - 2.5, py - 2.5, 5, 5);
                        }
                    } else if (isCop) {
                        mctx.fillStyle = copFlash ? "#ef4444" : "#3b82f6";
                        mctx.fillRect(px - 2.5, py - 2.5, 5, 5);
                    } else if (isCrim) {
                        mctx.fillStyle = "#f97316";
                        mctx.fillRect(px - 2.5, py - 2.5, 5, 5);
                    } else if (isLmVeh) {
                        mctx.fillStyle = "#ffd13b";
                        mctx.fillRect(px - 2, py - 2, 4, 4);
                    }
                }
            }

            if (zoomMode < 2 && Array.isArray(game.peds)) {
                for (let i = 0; i < game.peds.length; i++) {
                    const ped = game.peds[i];
                    if (ped.dead) continue;
                    if (ped.kind !== "CRIMINAL" && !(ped.kind === "COP" && ped.inCombat)) continue;
                    const px = ox + (ped.x - viewWorldX) * invW;
                    const py = oy + (ped.y - viewWorldY) * invH;
                    if (px < ox || px > ox + mw || py < oy || py > oy + mh) continue;
                    mctx.fillStyle = ped.kind === "CRIMINAL" ? "#f97316" : (copFlash ? "#ef4444" : "#3b82f6");
                    mctx.fillRect(px - 2, py - 2, 4, 4);
                }
            }

            // Official Landmarks
            if (Array.isArray(this.map.landmarks)) {
                for (let i = 0; i < this.map.landmarks.length; i++) {
                    const lm = this.map.landmarks[i];
                    const px = ox + (lm.x - viewWorldX) * invW;
                    const py = oy + (lm.y - viewWorldY) * invH;
                    const inside = px >= ox + 6 && px <= ox + mw - 6 && py >= oy + 6 && py <= oy + mh - 6;
                    if (inside) {
                        mctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                        mctx.fillRect(px - 3.5, py - 3.5, 7, 7);
                        mctx.strokeStyle = "#050811";
                        mctx.lineWidth = 1;
                        mctx.strokeRect(px - 3.5, py - 3.5, 7, 7);
                    } else {
                        const cx = Math.max(ox + 5, Math.min(ox + mw - 5, px));
                        const cy = Math.max(oy + 5, Math.min(oy + mh - 5, py));
                        mctx.fillStyle = lm.visited ? "#39ff14" : (lm.color || "#ff2a85");
                        mctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
                    }
                }
            }

            // Active Mission Target Blip
            const mTarget = game.missions ? game.missions.getTargetPosition() : null;
            if (mTarget) {
                const px = ox + (mTarget.x - viewWorldX) * invW;
                const py = oy + (mTarget.y - viewWorldY) * invH;
                const cx = Math.max(ox + 5, Math.min(ox + mw - 5, px));
                const cy = Math.max(oy + 5, Math.min(oy + mh - 5, py));
                const pulse = 4 + Math.sin(this.time * 9) * 2;
                mctx.strokeStyle = "#ff2a85";
                mctx.lineWidth = 2;
                mctx.strokeRect(cx - pulse, cy - pulse, pulse * 2, pulse * 2);
            }

            // Jason Partner Blip
            if (game.jason) {
                const jx = ox + (game.jason.x - viewWorldX) * invW;
                const jy = oy + (game.jason.y - viewWorldY) * invH;
                mctx.fillStyle = "#00f0ff";
                mctx.fillRect(jx - 2.5, jy - 2.5, 5, 5);
            }

            // Online Multiplayer Remote Player Blips on Smartphone GPS
            if (game.net && game.net.remotePlayers && game.net.remotePlayers.size > 0) {
                for (const rp of game.net.remotePlayers.values()) {
                    const rpx = ox + (rp.x - viewWorldX) * invW;
                    const rpy = oy + (rp.y - viewWorldY) * invH;
                    const rx = Math.max(ox + 4, Math.min(ox + mw - 4, rpx));
                    const ry = Math.max(oy + 4, Math.min(oy + mh - 4, rpy));
                    mctx.fillStyle = rp.color || "#00f0ff";
                    mctx.beginPath();
                    mctx.arc(rx, ry, 3.8, 0, Math.PI * 2);
                    mctx.fill();
                    mctx.strokeStyle = "#ffffff";
                    mctx.lineWidth = 1;
                    mctx.stroke();
                }
            }

            // Player Pulsing Round Radar Blip
            const ppx = ox + (p.x - viewWorldX) * invW;
            const ppy = oy + (p.y - viewWorldY) * invH;
            const beepPhase = (((this.time || 0) * 1.35) % 1.0 + 1.0) % 1.0;
            const beepRad = Math.max(1.0, 4.5 + beepPhase * 9.5);
            mctx.beginPath();
            mctx.arc(ppx, ppy, beepRad, 0, Math.PI * 2);
            mctx.strokeStyle = `rgba(0, 240, 255, ${(1.0 - beepPhase) * 0.78})`;
            mctx.lineWidth = 1.6;
            mctx.stroke();
            mctx.beginPath();
            mctx.arc(ppx, ppy, Math.max(1.5, 4.4 + Math.sin((this.time || 0) * 6.5) * 0.6), 0, Math.PI * 2);
            mctx.fillStyle = "#ffffff";
            mctx.fill();
            mctx.strokeStyle = "#ff2a85";
            mctx.lineWidth = 2.0;
            mctx.stroke();

            mctx.restore();
        }

        if (useMobileMiniCache && this._gpsMiniCacheCanvas) {
            ctx.drawImage(this._gpsMiniCacheCanvas, mx, my);
        }

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
                if (btn.id === "BOARD_BOAT" && typeof game.tryEnterExitVehicle === "function") {
                    game.tryEnterExitVehicle();
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
                if (btn.id === "PHONE_MISSION_START" && game && game.missions && typeof game.missions.startMobileMission === "function") {
                    game.missions.startMobileMission();
                    if (typeof game.updateHud === "function") game.updateHud();
                    return true;
                }
                if (btn.id === "PHONE_MISSION_NEXT" && game && game.missions && typeof game.missions.cycleSelectedMission === "function") {
                    game.missions.cycleSelectedMission(1);
                    if (typeof game.updateHud === "function") game.updateHud();
                    return true;
                }
                if (btn.id === "PHONE_MISSION_ABORT" && game && game.missions && typeof game.missions.abortMission === "function") {
                    game.missions.abortMission();
                    if (typeof game.updateHud === "function") game.updateHud();
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
        // The sprite atlas metadata (original GTA1 car info) is the source of truth for open-top cars:
        // a driver/passenger may only be drawn if the sprite really has an open cockpit.
        // Visually verified whitelist: only sprite 62 (open jeep) and 70 (cabrio with visible seats) are truly open.
        // Sprites 74 & 75 are flagged "convertible" in GTA1 metadata but are drawn as closed hardtops,
        // so drawing a driver on them puts a person on top of the roof.
        const OPEN_TOP_SPRITES = { "62": true, "70": true };
        const spriteMeta = this.vehicleBySprIdx && this.vehicleBySprIdx[sprId];
        const isConvertible = spriteMeta
            ? Boolean(spriteMeta.convertible && OPEN_TOP_SPRITES[sprId])
            : Boolean(v.isConvertible || specObj.isConvertible);
        const isMotorcycle = Boolean(v.isMotorcycle || specObj.isMotorcycle);

        if (v.specKey === "VCPD_CRUISER" || sprId === "73") {
            return { sprId: "73", useBaseObject: true, remapIdx: 0, isConvertible: false, isTank: false };
        }
        if (v.specKey === "TOW_TRUCK" || sprId === "veh_tow_truck") {
            return { sprId: "veh_tow_truck", useBaseObject: true, remapIdx: 0, isConvertible: false, isTank: false };
        }
        if (v.specKey === "SWAT_ENFORCER" || (v.isPolice && sprId === "76")) {
            return { sprId: "76", useBaseObject: true, remapIdx: 0, isConvertible: false, isTank: false };
        }

        const hasRemap = typeof v.remapIdx === "number" && v.remapIdx >= 0 && !v.useBaseOnly && !specObj.useBaseOnly;
        return {
            sprId,
            useBaseObject: !hasRemap,
            remapIdx: hasRemap ? v.remapIdx : 0,
            isConvertible,
            isMotorcycle,
            isTank,
            horizontalSprite: Boolean(specObj.horizontalSprite)
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
        const spanBlocks = zoomMode === 0 ? 68 : (zoomMode === 1 ? 160 : MAP_COLS);
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

        // 9. Player Pulsing Round Radar Blip & Vision Cone
        const pp = worldToMini(p.x, p.y);
        const ang = (p.inVehicle ? p.inVehicle.angle : p.angle) || 0;
        ctx.save();
        ctx.translate(pp.x, pp.y);
        ctx.rotate(ang);
        // Subtle heading cone
        ctx.fillStyle = "rgba(0, 240, 255, 0.14)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24, -12);
        ctx.lineTo(24, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const beepPhase = (((this.time || 0) * 1.35) % 1.0 + 1.0) % 1.0;
        const beepRad = Math.max(1.0, 5.0 + beepPhase * 10.5);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, beepRad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${(1.0 - beepPhase) * 0.80})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, Math.max(1.5, 4.8 + Math.sin((this.time || 0) * 6.5) * 0.65), 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#ff2a85";
        ctx.lineWidth = 2.2;
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
        if (useVice && this.map && this.map.objectEngine) {
            const ovSz = this.isMobileInit ? 512 : 1024;
            if (!this.liveOverviewCanvas || this.liveOverviewCanvas.width !== ovSz) {
                this.liveOverviewCanvas = document.createElement("canvas");
                this.liveOverviewCanvas.width = ovSz;
                this.liveOverviewCanvas.height = ovSz;
            }
            const octx = this.liveOverviewCanvas.getContext("2d");
            octx.imageSmoothingEnabled = false;
            octx.clearRect(0, 0, ovSz, ovSz);
            octx.drawImage(rawImg, 0, 0, ovSz, ovSz);
            this.map.objectEngine.paintOnOverviewCanvas(octx, ovSz, ovSz);
            srcImg = this.liveOverviewCanvas;
        } else {
            this.liveOverviewCanvas = null;
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

        // Enterable Shops, Bars, Hotels, Ammu-Nation & 3D Luxury Villa Interiors on the [M] Full Map
        if (Array.isArray(this.map.interiors)) {
            for (const intr of this.map.interiors) {
                const ix = Math.round(intr.doorX * sx);
                const iy = Math.round(intr.doorY * sy);
                fctx.fillStyle = intr.accent || "#f472b6";
                fctx.fillRect(ix - 2, iy - 2, 4, 4);
                fctx.strokeStyle = "#090d16";
                fctx.lineWidth = 1;
                fctx.strokeRect(ix - 2.5, iy - 2.5, 5, 5);
            }
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
        const ly = Math.round(game.player.y * sy);
        const beepPhase = (((this.time || 0) * 1.35) % 1.0 + 1.0) % 1.0;
        const beepRad = Math.max(1.0, 6.0 + beepPhase * 13.0);
        fctx.save();
        // Expanding radar ping ring ("bip léger")
        fctx.beginPath();
        fctx.arc(lx, ly, beepRad, 0, Math.PI * 2);
        fctx.strokeStyle = `rgba(0, 240, 255, ${(1.0 - beepPhase) * 0.85})`;
        fctx.lineWidth = 2.2;
        fctx.stroke();
        // High-contrast outer dark halo + round pulsing player core
        const coreRad = 5.6 + Math.sin(this.time * 6.5) * 0.8;
        fctx.beginPath();
        fctx.arc(lx, ly, coreRad + 1.8, 0, Math.PI * 2);
        fctx.fillStyle = "rgba(5, 8, 17, 0.88)";
        fctx.fill();
        fctx.beginPath();
        fctx.arc(lx, ly, coreRad, 0, Math.PI * 2);
        fctx.fillStyle = "#ffffff";
        fctx.fill();
        fctx.strokeStyle = "#ff2a85";
        fctx.lineWidth = 2.6;
        fctx.stroke();
        fctx.restore();
    }
}

window.RetroRenderer = RetroRenderer;
