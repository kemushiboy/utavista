import * as PIXI from 'pixi.js';

export interface GlobalPostEffectConfig {
  enabled: boolean;
  masterIntensity: number;
  shake: number;
  zoom: number;
  tilt: number;
  glitch: number;
  hueShift: number;
  chromaticAberration: number;
  vignette: number;
  filmGrain: number;
  scanlines: number;
  saturation: number;
  contrast: number;
}

export const DEFAULT_POST_EFFECT_CONFIG: GlobalPostEffectConfig = {
  enabled: false,
  masterIntensity: 1,
  shake: 0,
  zoom: 0,
  tilt: 0,
  glitch: 0,
  hueShift: 0,
  chromaticAberration: 0,
  vignette: 0,
  filmGrain: 0,
  scanlines: 0,
  saturation: 1,
  contrast: 1
};

const fragmentShader = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uMaster;
uniform float uShake;
uniform float uZoom;
uniform float uTilt;
uniform float uGlitch;
uniform float uHue;
uniform float uChromatic;
uniform float uVignette;
uniform float uGrain;
uniform float uScanlines;
uniform float uSaturation;
uniform float uContrast;

float hash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 hueRotate(vec3 color, float angle) {
  const mat3 toYiq = mat3(
    0.299, 0.596, 0.211,
    0.587, -0.274, -0.523,
    0.114, -0.322, 0.312
  );
  const mat3 toRgb = mat3(
    1.0, 1.0, 1.0,
    0.956, -0.272, -1.106,
    0.621, -0.647, 1.703
  );
  vec3 yiq = toYiq * color;
  float hue = atan(yiq.z, yiq.y) + angle;
  float chroma = length(yiq.yz);
  return clamp(toRgb * vec3(yiq.x, chroma * cos(hue), chroma * sin(hue)), 0.0, 1.0);
}

void main(void) {
  vec2 uv = vTextureCoord;
  float master = uMaster;
  float angle = uTilt * master;
  float cosine = cos(angle);
  float sine = sin(angle);
  vec2 centered = uv - 0.5;
  centered = mat2(cosine, -sine, sine, cosine) * centered;
  centered /= max(0.6, 1.0 + uZoom * master);
  uv = centered + 0.5;

  vec2 shakeOffset = vec2(
    sin(uTime * 19.7) + sin(uTime * 43.1) * 0.45,
    cos(uTime * 23.3) + cos(uTime * 37.9) * 0.4
  ) * uShake * master * 0.004;
  uv += shakeOffset;

  float band = floor(uv.y * (28.0 + uGlitch * 70.0));
  float frame = floor(uTime * 18.0);
  float bandNoise = hash(vec2(band, frame));
  if (bandNoise > 1.0 - uGlitch * master * 0.42) {
    uv.x += (hash(vec2(band + 3.7, frame)) - 0.5) * uGlitch * master * 0.13;
  }

  float rgbOffset = (uChromatic + uGlitch * 0.35) * master * 0.012;
  float red = texture2D(uSampler, uv + vec2(rgbOffset, 0.0)).r;
  vec4 centerColor = texture2D(uSampler, uv);
  float blue = texture2D(uSampler, uv - vec2(rgbOffset, 0.0)).b;
  vec3 color = vec3(red, centerColor.g, blue);

  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, uSaturation);
  color = (color - 0.5) * uContrast + 0.5;
  color = hueRotate(color, uHue);

  float grain = hash(uv * vec2(1920.0, 1080.0) + frame * 13.17) - 0.5;
  color += grain * uGrain * master * 0.24;
  float scan = sin(uv.y * 1080.0 * 3.14159265);
  color *= 1.0 - (0.5 + 0.5 * scan) * uScanlines * master * 0.18;

  float edge = smoothstep(0.34, 0.82, length((vTextureCoord - 0.5) * vec2(1.0, 0.78)));
  color *= 1.0 - edge * uVignette * master * 0.86;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), centerColor.a * inside);
}
`;

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeConfig(value: Partial<GlobalPostEffectConfig>): GlobalPostEffectConfig {
  return {
    enabled: value.enabled === true,
    masterIntensity: numberValue(value.masterIntensity, 1),
    shake: numberValue(value.shake, 0),
    zoom: numberValue(value.zoom, 0),
    tilt: numberValue(value.tilt, 0),
    glitch: numberValue(value.glitch, 0),
    hueShift: numberValue(value.hueShift, 0),
    chromaticAberration: numberValue(value.chromaticAberration, 0),
    vignette: numberValue(value.vignette, 0),
    filmGrain: numberValue(value.filmGrain, 0),
    scanlines: numberValue(value.scanlines, 0),
    saturation: numberValue(value.saturation, 1),
    contrast: numberValue(value.contrast, 1)
  };
}

/** 全シーンの合成後に一度だけ適用する、決定論的な共通ポストエフェクト。 */
export class GlobalPostEffectManager {
  private readonly target: PIXI.Container;
  private readonly filter: PIXI.Filter;
  private config: GlobalPostEffectConfig;

  constructor(target: PIXI.Container) {
    this.target = target;
    this.config = { ...DEFAULT_POST_EFFECT_CONFIG };
    this.filter = new PIXI.Filter(undefined, fragmentShader, {
      uTime: 0,
      uMaster: 1,
      uShake: 0,
      uZoom: 0,
      uTilt: 0,
      uGlitch: 0,
      uHue: 0,
      uChromatic: 0,
      uVignette: 0,
      uGrain: 0,
      uScanlines: 0,
      uSaturation: 1,
      uContrast: 1
    });
    this.syncFilterAttachment();
    this.update(0);
  }

  getConfig(): GlobalPostEffectConfig {
    return { ...this.config };
  }

  setConfig(updates: Partial<GlobalPostEffectConfig>): void {
    this.config = normalizeConfig({ ...this.config, ...updates });
    this.syncFilterAttachment();
    this.update(Number(this.filter.uniforms.uTime || 0) * 1000);
  }

  update(timeMs: number): void {
    const uniforms = this.filter.uniforms;
    uniforms.uTime = Math.max(0, timeMs) / 1000;
    uniforms.uMaster = this.config.masterIntensity;
    uniforms.uShake = this.config.shake;
    uniforms.uZoom = this.config.zoom;
    uniforms.uTilt = this.config.tilt;
    uniforms.uGlitch = this.config.glitch;
    uniforms.uHue = this.config.hueShift * Math.PI / 180;
    uniforms.uChromatic = this.config.chromaticAberration;
    uniforms.uVignette = this.config.vignette;
    uniforms.uGrain = this.config.filmGrain;
    uniforms.uScanlines = this.config.scanlines;
    uniforms.uSaturation = this.config.saturation;
    uniforms.uContrast = this.config.contrast;
  }

  resize(filterArea: PIXI.Rectangle): void {
    this.target.filterArea = filterArea;
  }

  destroy(): void {
    this.target.filters = (this.target.filters || []).filter(filter => filter !== this.filter);
    this.filter.destroy();
  }

  private syncFilterAttachment(): void {
    const filters = this.target.filters || [];
    const containsFilter = filters.includes(this.filter);
    if (this.config.enabled && !containsFilter) this.target.filters = [...filters, this.filter];
    if (!this.config.enabled && containsFilter) this.target.filters = filters.filter(filter => filter !== this.filter);
  }

}
