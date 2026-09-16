import * as PIXI from 'pixi.js';
import { deterministicNoise } from './Motion';

const EFFECT_PREFIX = 'kinetic-effect-';
const TAU = Math.PI * 2;

export type EmitterStyle = 'particles' | 'bubbles' | 'eyes' | 'noise';
export type SurfaceShape = 'ribbon' | 'cylinder' | 'torus';

export interface TypographyEffectParams {
  shuffleEnabled: boolean;
  shuffleCharset: string;
  shuffleRate: number;
  shuffleDuration: number;
  repetitionEnabled: boolean;
  repetitionCount: number;
  repetitionSpread: number;
  repetitionDepth: number;
  organicEnabled: boolean;
  organicAmplitude: number;
  organicFrequency: number;
  organicSpeed: number;
  destructionEnabled: boolean;
  destructionStrength: number;
  destructionSlices: number;
  destructionDuration: number;
  emittersEnabled: boolean;
  emitterStyle: EmitterStyle;
  emitterCount: number;
  emitterRadius: number;
  surfaceEnabled: boolean;
  surfaceShape: SurfaceShape;
  surfaceCurve: number;
  surfaceRepeat: number;
}

export interface TypographyEffectContext {
  nowMs: number;
  startMs: number;
  seed: number;
  index: number;
  intensity: number;
}

const fragmentShader = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform float uOrganicAmplitude;
uniform float uOrganicFrequency;
uniform float uOrganicSpeed;
uniform float uSurfaceCurve;
uniform float uSurfaceMode;
uniform float uSurfaceRepeat;

void main(void) {
  vec2 uv = vTextureCoord;
  float wave = sin((uv.y * uOrganicFrequency + uTime * uOrganicSpeed) * 6.28318530718);
  uv.x += wave * uOrganicAmplitude * sin(uv.y * 3.14159265359);

  float centeredX = uv.x - 0.5;
  if (uSurfaceMode > 0.5 && uSurfaceMode < 1.5) {
    uv.y += centeredX * centeredX * uSurfaceCurve;
  } else if (uSurfaceMode >= 1.5 && uSurfaceMode < 2.5) {
    uv.x = 0.5 + sin(centeredX * 3.14159265359) * 0.5;
    uv.y += abs(centeredX) * uSurfaceCurve;
  } else if (uSurfaceMode >= 2.5) {
    float angle = centeredX * 6.28318530718;
    uv.x = 0.5 + sin(angle) * 0.48;
    uv.y += (1.0 - cos(angle)) * uSurfaceCurve * 0.5;
  }

  if (uSurfaceRepeat > 1.0) {
    uv.x = fract(uv.x * uSurfaceRepeat);
  }

  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  gl_FragColor = texture2D(uSampler, clamp(uv, 0.0, 1.0)) * inside;
}
`;

interface EffectText extends PIXI.Text {
  __kineticEffectFilter?: PIXI.Filter;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function destroyDisplayObject(displayObject: PIXI.DisplayObject): void {
  if (displayObject.parent) displayObject.parent.removeChild(displayObject);
  displayObject.destroy({ children: true });
}

function clearByPrefix(container: PIXI.Container, prefix: string): void {
  container.children
    .filter(child => child.name?.startsWith(`${EFFECT_PREFIX}${prefix}`))
    .forEach(destroyDisplayObject);
}

function ensureClone(container: PIXI.Container, source: PIXI.Text, name: string): PIXI.Text {
  let clone = container.children.find(child => child.name === name) as PIXI.Text | undefined;
  if (!clone) {
    clone = new PIXI.Text(source.text, source.style);
    clone.name = name;
    clone.anchor.set(0.5);
    container.addChildAt(clone, Math.max(0, container.getChildIndex(source)));
  }
  clone.text = source.text;
  clone.style = source.style;
  clone.tint = source.tint;
  return clone;
}

/** 指定時刻・seed・文字位置だけで置換結果を決める。 */
export function createShuffledText(
  text: string,
  progress: number,
  timeMs: number,
  rateMs: number,
  charset: string,
  seed: number
): string {
  const source = [...text];
  const symbols = [...charset];
  if (symbols.length === 0 || progress >= 1) return text;
  const frame = Math.floor(Math.max(0, timeMs) / Math.max(16, rateMs));
  const revealed = Math.floor(clamp01(progress) * source.length);
  return source.map((character, characterIndex) => {
    if (/\s/u.test(character) || characterIndex < revealed) return character;
    const noise = deterministicNoise(seed + frame * 131 + characterIndex * 47);
    return symbols[Math.floor(((noise + 1) * 0.5) * symbols.length) % symbols.length];
  }).join('');
}

/** 0→1→0 の衝撃波。シーク順序に依存しない。 */
export function destructionEnvelope(timeMs: number, duration: number): number {
  if (timeMs < 0 || timeMs > duration || duration <= 0) return 0;
  return Math.sin(clamp01(timeMs / duration) * Math.PI);
}

export class TypographyEffects {
  update(
    container: PIXI.Container,
    source: PIXI.Text,
    originalText: string,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    this.updateShuffle(source, originalText, params, context);
    this.updateWarpFilter(source, params, context);
    this.updateRepetition(container, source, params, context);
    this.updateDestruction(container, source, params, context);
    this.updateEmitters(container, source, params, context);
    this.updateSurfaceCopies(container, source, params, context);
  }

  cleanup(container: PIXI.Container): void {
    clearByPrefix(container, '');
    const source = container.children.find(child => child.name === 'kinetic-scene-text') as EffectText | undefined;
    if (source?.__kineticEffectFilter) {
      source.filters = (source.filters || []).filter(filter => filter !== source.__kineticEffectFilter);
      source.__kineticEffectFilter.destroy();
      delete source.__kineticEffectFilter;
    }
    if (source) source.alpha = 1;
  }

  private updateShuffle(
    source: PIXI.Text,
    originalText: string,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    if (!params.shuffleEnabled) {
      source.text = originalText;
      return;
    }
    const elapsed = context.nowMs - (context.startMs - params.shuffleDuration);
    // 確定文字数を開始・終了で滑らかにし、最後の文字が唐突に切り替わる印象を抑える。
    const progress = smoothstep(elapsed / Math.max(1, params.shuffleDuration));
    source.text = createShuffledText(
      originalText,
      progress,
      elapsed,
      params.shuffleRate,
      params.shuffleCharset,
      context.seed + context.index * 1009
    );
  }

  private updateWarpFilter(
    source: EffectText,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    const enabled = params.organicEnabled || params.surfaceEnabled;
    if (!enabled) {
      if (source.__kineticEffectFilter) {
        source.filters = (source.filters || []).filter(filter => filter !== source.__kineticEffectFilter);
        source.__kineticEffectFilter.destroy();
        delete source.__kineticEffectFilter;
      }
      return;
    }

    if (!source.__kineticEffectFilter) {
      source.__kineticEffectFilter = new PIXI.Filter(undefined, fragmentShader, {
        uTime: 0,
        uOrganicAmplitude: 0,
        uOrganicFrequency: 1,
        uOrganicSpeed: 1,
        uSurfaceCurve: 0,
        uSurfaceMode: 0,
        uSurfaceRepeat: 1
      });
      source.__kineticEffectFilter.padding = Math.max(40, source.height * 0.4);
      source.filters = [...(source.filters || []), source.__kineticEffectFilter];
    }

    const filter = source.__kineticEffectFilter;
    filter.uniforms.uTime = context.nowMs / 1000;
    filter.uniforms.uOrganicAmplitude = params.organicEnabled
      ? params.organicAmplitude * context.intensity
      : 0;
    filter.uniforms.uOrganicFrequency = params.organicFrequency;
    filter.uniforms.uOrganicSpeed = params.organicSpeed;
    filter.uniforms.uSurfaceCurve = params.surfaceEnabled
      ? params.surfaceCurve * context.intensity
      : 0;
    filter.uniforms.uSurfaceMode = params.surfaceEnabled
      ? ({ ribbon: 1, cylinder: 2, torus: 3 } as const)[params.surfaceShape]
      : 0;
    filter.uniforms.uSurfaceRepeat = params.surfaceEnabled ? params.surfaceRepeat : 1;
  }

  private updateRepetition(
    container: PIXI.Container,
    source: PIXI.Text,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    if (!params.repetitionEnabled) {
      clearByPrefix(container, 'repeat-');
      return;
    }
    const count = Math.max(1, Math.round(params.repetitionCount));
    for (let copyIndex = 0; copyIndex < count; copyIndex += 1) {
      const clone = ensureClone(container, source, `${EFFECT_PREFIX}repeat-${copyIndex}`);
      const depth = (copyIndex + 1) / count;
      const phase = context.nowMs * 0.0018 + copyIndex * 0.38 + context.index;
      const direction = copyIndex % 2 === 0 ? 1 : -1;
      clone.position.set(
        direction * params.repetitionSpread * (copyIndex + 1) + Math.sin(phase) * 5 * context.intensity,
        -params.repetitionSpread * 0.32 * (copyIndex + 1)
      );
      const scale = Math.max(0.18, 1 - depth * params.repetitionDepth);
      clone.scale.set(scale);
      clone.alpha = Math.max(0.04, 0.52 * (1 - depth * 0.82));
      clone.blendMode = PIXI.BLEND_MODES.SCREEN;
    }
    container.children
      .filter(child => child.name?.startsWith(`${EFFECT_PREFIX}repeat-`))
      .slice(count)
      .forEach(destroyDisplayObject);
  }

  private updateDestruction(
    container: PIXI.Container,
    source: PIXI.Text,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    const amount = params.destructionEnabled
      ? destructionEnvelope(context.nowMs - context.startMs, params.destructionDuration) * params.destructionStrength * context.intensity
      : 0;
    if (amount <= 0.001) {
      clearByPrefix(container, 'destroy-');
      source.alpha = 1;
      return;
    }

    const count = Math.max(2, Math.round(params.destructionSlices));
    source.alpha = Math.max(0.05, 1 - amount * 0.92);
    for (let sliceIndex = 0; sliceIndex < count; sliceIndex += 1) {
      const name = `${EFFECT_PREFIX}destroy-${sliceIndex}`;
      let fragment = container.children.find(child => child.name === name) as PIXI.Container | undefined;
      let fragmentText: PIXI.Text;
      let mask: PIXI.Graphics;
      if (!fragment) {
        fragment = new PIXI.Container();
        fragment.name = name;
        fragmentText = new PIXI.Text(source.text, source.style);
        fragmentText.anchor.set(0.5);
        mask = new PIXI.Graphics();
        fragment.addChild(fragmentText, mask);
        fragmentText.mask = mask;
        container.addChild(fragment);
      } else {
        fragmentText = fragment.children[0] as PIXI.Text;
        mask = fragment.children[1] as PIXI.Graphics;
      }
      fragmentText.text = source.text;
      fragmentText.style = source.style;
      fragmentText.tint = source.tint;
      const sliceHeight = Math.max(1, source.height / count);
      mask.clear();
      mask.beginFill(0xffffff);
      mask.drawRect(-source.width / 2 - 4, -source.height / 2 + sliceHeight * sliceIndex, source.width + 8, sliceHeight + 1);
      mask.endFill();
      const noiseX = deterministicNoise(context.seed + context.index * 211 + sliceIndex * 43);
      const noiseY = deterministicNoise(context.seed + context.index * 223 + sliceIndex * 59);
      fragment.position.set(noiseX * 52 * amount, noiseY * 24 * amount + Math.abs(noiseX) * 20 * amount);
      fragment.rotation = noiseX * 0.16 * amount;
      fragment.alpha = Math.max(0, 1 - amount * 0.35);
    }
    container.children
      .filter(child => child.name?.startsWith(`${EFFECT_PREFIX}destroy-`))
      .slice(count)
      .forEach(destroyDisplayObject);
  }

  private updateEmitters(
    container: PIXI.Container,
    source: PIXI.Text,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    if (!params.emittersEnabled || context.nowMs < context.startMs) {
      clearByPrefix(container, 'emitter-');
      return;
    }
    const count = Math.max(1, Math.round(params.emitterCount));
    const elapsed = Math.max(0, context.nowMs - context.startMs);
    for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
      const name = `${EFFECT_PREFIX}emitter-${particleIndex}`;
      let graphic = container.children.find(child => child.name === name) as PIXI.Graphics | undefined;
      if (!graphic) {
        graphic = new PIXI.Graphics();
        graphic.name = name;
        container.addChild(graphic);
      }
      const base = context.seed + context.index * 997 + particleIndex * 73;
      const cycle = (elapsed / (900 + Math.abs(deterministicNoise(base)) * 1100) + particleIndex / count) % 1;
      const angle = deterministicNoise(base + 17) * Math.PI + cycle * TAU * 0.16;
      const radius = params.emitterRadius * (0.18 + cycle * 0.82) * context.intensity;
      const x = Math.cos(angle) * radius + deterministicNoise(base + 29) * source.width * 0.36;
      const y = Math.sin(angle) * radius + deterministicNoise(base + 37) * source.height * 0.45;
      const size = 2 + Math.abs(deterministicNoise(base + 41)) * 8;
      graphic.clear();
      this.drawEmitter(graphic, params.emitterStyle, size, base);
      graphic.position.set(x, y);
      graphic.alpha = Math.sin(cycle * Math.PI) * 0.82;
      graphic.rotation = angle + cycle * TAU;
    }
    container.children
      .filter(child => child.name?.startsWith(`${EFFECT_PREFIX}emitter-`))
      .slice(count)
      .forEach(destroyDisplayObject);
  }

  private drawEmitter(graphic: PIXI.Graphics, style: EmitterStyle, size: number, seed: number): void {
    if (style === 'eyes') {
      graphic.beginFill(0xf3f0e8, 0.95);
      graphic.drawEllipse(0, 0, size * 1.6, size);
      graphic.endFill();
      graphic.beginFill(0x151515, 1);
      graphic.drawCircle(deterministicNoise(seed + 7) * size * 0.35, 0, size * 0.42);
      graphic.endFill();
      return;
    }
    if (style === 'bubbles') {
      graphic.lineStyle(1.5, 0xffffff, 0.82);
      graphic.drawCircle(0, 0, size);
      return;
    }
    if (style === 'noise') {
      graphic.beginFill(deterministicNoise(seed + 3) > 0 ? 0xff245f : 0x20e3ff, 0.9);
      graphic.drawRect(-size, -size * 0.35, size * 2, size * 0.7);
      graphic.endFill();
      return;
    }
    graphic.beginFill(0xffffff, 0.9);
    graphic.drawPolygon([0, -size, size * 0.7, size, 0, size * 0.45, -size * 0.7, size]);
    graphic.endFill();
  }

  private updateSurfaceCopies(
    container: PIXI.Container,
    source: PIXI.Text,
    params: TypographyEffectParams,
    context: TypographyEffectContext
  ): void {
    if (!params.surfaceEnabled) {
      clearByPrefix(container, 'surface-');
      return;
    }
    const count = Math.max(2, Math.min(12, Math.round(params.surfaceRepeat * 2)));
    for (let copyIndex = 0; copyIndex < count; copyIndex += 1) {
      const clone = ensureClone(container, source, `${EFFECT_PREFIX}surface-${copyIndex}`);
      const unit = copyIndex / Math.max(1, count - 1);
      const angle = unit * TAU + context.nowMs * 0.00035;
      if (params.surfaceShape === 'torus') {
        clone.position.set(Math.sin(angle) * source.width * 0.42, Math.cos(angle) * source.height * 0.72);
        clone.scale.set(0.28 + (Math.cos(angle) + 1) * 0.18);
        clone.rotation = Math.sin(angle) * 0.22;
      } else if (params.surfaceShape === 'cylinder') {
        clone.position.set(Math.sin(angle) * source.width * 0.38, (unit - 0.5) * source.height * 1.2);
        clone.scale.set(0.25 + Math.abs(Math.cos(angle)) * 0.38, 0.5);
        clone.rotation = 0;
      } else {
        clone.position.set((unit - 0.5) * source.width * 1.4, Math.sin(angle) * source.height * 0.5);
        clone.scale.set(0.34);
        clone.rotation = Math.cos(angle) * 0.12;
      }
      clone.alpha = 0.08 + Math.max(0, Math.cos(angle)) * 0.24;
      clone.blendMode = PIXI.BLEND_MODES.SCREEN;
    }
    container.children
      .filter(child => child.name?.startsWith(`${EFFECT_PREFIX}surface-`))
      .slice(count)
      .forEach(destroyDisplayObject);
  }
}
