import {
  MotionClip,
  MotionContext,
  MotionState,
  EasingName,
  applyEasing,
  deterministicNoise,
  motion,
  parallel,
  repeat,
  tween
} from './Motion';

export type LayoutName = 'center' | 'random' | 'circle' | 'vertical' | 'fill';
export type EntranceName = 'slam' | 'slide' | 'scale' | 'characterBreak' | 'instant';
export type SustainName = 'still' | 'shake' | 'pulse' | 'glitch' | 'multiply' | 'compress';
export type ExitName = 'collapse' | 'fall' | 'shatter' | 'noise' | 'hardStop';
export type ScreenMotionName = 'none' | 'cameraShake' | 'zoom' | 'rgbDrift' | 'afterimage';
export type EasingSelection = EasingName | 'auto';

export interface SceneDefinition {
  layout: LayoutName;
  entrance: EntranceName;
  sustain: SustainName;
  exit: ExitName;
  screen: ScreenMotionName;
}

export interface LayoutContext extends MotionContext {
  width: number;
  height: number;
  fontSize: number;
  spacing: number;
}

export interface LayoutResult {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export const sceneCatalog = {
  layouts: ['center', 'random', 'circle', 'vertical', 'fill'] as LayoutName[],
  entrances: ['slam', 'slide', 'scale', 'characterBreak', 'instant'] as EntranceName[],
  sustains: ['still', 'shake', 'pulse', 'glitch', 'multiply', 'compress'] as SustainName[],
  exits: ['collapse', 'fall', 'shatter', 'noise', 'hardStop'] as ExitName[],
  screens: ['none', 'cameraShake', 'zoom', 'rgbDrift', 'afterimage'] as ScreenMotionName[],
  easings: [
    'auto', 'linear', 'easeInQuad', 'easeOutQuad', 'easeInCubic', 'easeOutCubic',
    'easeInOutCubic', 'easeInQuart', 'easeOutQuart', 'easeOutQuint',
    'easeInOutSine', 'easeOutExpo', 'easeInBack', 'easeOutBack'
  ] as EasingSelection[]
};

export function calculateLayout(name: LayoutName, context: LayoutContext): LayoutResult {
  const { index, total, fontSize, spacing, width, height, seed } = context;
  const centeredIndex = index - (total - 1) / 2;

  switch (name) {
    case 'random':
      return {
        x: deterministicNoise(seed + index * 17) * width * 0.34,
        y: deterministicNoise(seed + index * 31) * height * 0.28,
        rotation: deterministicNoise(seed + index * 47) * 0.12,
        scale: 0.82 + Math.abs(deterministicNoise(seed + index * 61)) * 0.5
      };
    case 'circle': {
      const angle = -Math.PI / 2 + (index / Math.max(1, total)) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.28;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, rotation: angle + Math.PI / 2, scale: 1 };
    }
    case 'vertical':
      return { x: 0, y: centeredIndex * fontSize * spacing, rotation: 0, scale: 1 };
    case 'fill': {
      const columns = Math.max(1, Math.ceil(Math.sqrt(total * (width / Math.max(height, 1)))));
      const rows = Math.max(1, Math.ceil(total / columns));
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: (column - (columns - 1) / 2) * Math.min(fontSize * spacing, width / columns),
        y: (row - (rows - 1) / 2) * Math.min(fontSize * 1.15, height / rows),
        rotation: 0,
        scale: Math.min(1.35, Math.max(0.65, width / columns / Math.max(fontSize, 1) * 0.72))
      };
    }
    case 'center':
    default:
      return { x: centeredIndex * fontSize * spacing, y: 0, rotation: 0, scale: 1 };
  }
}

export function createEntrance(
  name: EntranceName,
  duration: number,
  easing: EasingSelection = 'auto'
): MotionClip {
  const resolvedEasing: EasingName = easing === 'auto'
    ? (name === 'slam' || name === 'scale' ? 'easeOutBack' : 'easeOutCubic')
    : easing;
  switch (name) {
    case 'slam':
      return parallel(
        tween(duration, { scaleX: 3.2, scaleY: 3.2 }, { scaleX: 1, scaleY: 1 }, resolvedEasing),
        tween(duration * 0.5, { alpha: 0 }, { alpha: 1 }, 'easeOutCubic')
      );
    case 'slide':
      return tween(duration, { x: -280, alpha: 0, skewX: -0.18 }, { x: 0, alpha: 1, skewX: 0 }, resolvedEasing);
    case 'scale':
      return tween(duration, { scaleX: 0.08, scaleY: 0.08, alpha: 0 }, { scaleX: 1, scaleY: 1, alpha: 1 }, resolvedEasing);
    case 'characterBreak':
      return motion(duration, (timeMs, context) => {
        const progress = Math.min(1, timeMs / Math.max(1, duration));
        const eased = applyEasing(resolvedEasing, progress);
        return {
          x: deterministicNoise(context.seed + context.index * 71) * 360 * (1 - eased),
          y: deterministicNoise(context.seed + context.index * 97) * 240 * (1 - eased),
          rotation: deterministicNoise(context.seed + context.index * 113) * 1.4 * (1 - eased),
          alpha: eased
        };
      });
    case 'instant':
    default:
      return motion(1, () => ({}));
  }
}

export function createSustain(name: SustainName): MotionClip {
  switch (name) {
    case 'shake':
      return motion(Number.POSITIVE_INFINITY, (timeMs, context) => ({
        x: Math.sin(timeMs * 0.045 + context.index * 1.7) * 3 * context.intensity,
        y: Math.cos(timeMs * 0.057 + context.index * 2.1) * 2 * context.intensity,
        rotation: Math.sin(timeMs * 0.031 + context.index) * 0.012 * context.intensity
      }));
    case 'pulse':
      return motion(Number.POSITIVE_INFINITY, (timeMs, context) => {
        const scale = 1 + Math.sin(timeMs * Math.PI * 2 / 700) * 0.055 * context.intensity;
        return { scaleX: scale, scaleY: scale };
      });
    case 'glitch':
      return motion(Number.POSITIVE_INFINITY, (timeMs, context) => {
        const frame = Math.floor(timeMs / 55);
        const active = deterministicNoise(context.seed + frame * 19 + context.index * 7) > 0.58;
        return active ? {
          x: deterministicNoise(context.seed + frame * 23) * 14 * context.intensity,
          skewX: deterministicNoise(context.seed + frame * 29) * 0.16 * context.intensity,
          alpha: 0.72 + Math.abs(deterministicNoise(context.seed + frame * 31)) * 0.28
        } : {};
      });
    case 'multiply':
      return motion(Number.POSITIVE_INFINITY, (timeMs, context) => {
        const wave = Math.max(0, Math.sin(timeMs * Math.PI * 2 / 900));
        const scale = 1 + wave * 0.12 * context.intensity;
        return { scaleX: scale, scaleY: scale, alpha: 1 - wave * 0.08 };
      });
    case 'compress':
      return motion(Number.POSITIVE_INFINITY, (timeMs, context) => {
        const wave = Math.sin(timeMs * Math.PI * 2 / 1100) * 0.1 * context.intensity;
        return { scaleX: 1 + wave, scaleY: 1 - wave };
      });
    case 'still':
    default:
      return repeat(motion(1000, () => ({})));
  }
}

export function createExit(
  name: ExitName,
  duration: number,
  easing: EasingSelection = 'auto'
): MotionClip {
  const resolvedEasing: EasingName = easing === 'auto'
    ? (name === 'fall' ? 'easeInQuad' : 'easeInCubic')
    : easing;
  switch (name) {
    case 'collapse':
      return tween(duration, {}, { scaleY: 0.02, scaleX: 1.3, alpha: 0 }, resolvedEasing);
    case 'fall':
      return tween(duration, {}, { y: 360, rotation: 0.35, alpha: 0 }, resolvedEasing);
    case 'shatter':
      return motion(duration, (timeMs, context) => {
        const progress = Math.min(1, timeMs / Math.max(1, duration));
        const eased = applyEasing(resolvedEasing, progress);
        return {
          x: deterministicNoise(context.seed + context.index * 131) * 420 * eased,
          y: (80 + Math.abs(deterministicNoise(context.seed + context.index * 149)) * 380) * eased,
          rotation: deterministicNoise(context.seed + context.index * 167) * 2.4 * eased,
          alpha: Math.max(0, 1 - applyEasing('easeInQuad', progress))
        };
      });
    case 'noise':
      return motion(duration, (timeMs, context) => {
        const progress = Math.min(1, timeMs / Math.max(1, duration));
        const eased = applyEasing(resolvedEasing, progress);
        const frame = Math.floor(timeMs / 35);
        return {
          x: deterministicNoise(context.seed + frame * 173) * 24 * context.intensity * eased,
          skewX: deterministicNoise(context.seed + frame * 181) * 0.28 * eased,
          alpha: Math.max(0, 1 - applyEasing('easeInQuad', progress))
        };
      });
    case 'hardStop':
    default:
      return tween(Math.min(45, duration), { alpha: 1 }, { alpha: 0 }, 'linear');
  }
}

export function createScreenMotion(name: ScreenMotionName): MotionClip {
  switch (name) {
    case 'cameraShake':
      return motion(Number.POSITIVE_INFINITY, (timeMs, context) => {
        // 衝撃直後を強くし、約450msで微振動へ収束させる。
        const impact = Math.exp(-Math.max(0, timeMs) / 170);
        const amplitude = (0.22 + impact * 1.9) * context.intensity;
        return {
          x: (Math.sin(timeMs * 0.071) + Math.sin(timeMs * 0.113) * 0.45) * 4 * amplitude,
          y: (Math.cos(timeMs * 0.083) + Math.sin(timeMs * 0.137) * 0.35) * 3 * amplitude,
          rotation: Math.sin(timeMs * 0.047) * 0.005 * amplitude
        };
      });
    case 'zoom':
      return motion(Number.POSITIVE_INFINITY, timeMs => {
        const scale = 1 + (1 - Math.cos(timeMs * Math.PI * 2 / 2400)) * 0.025;
        return { scaleX: scale, scaleY: scale };
      });
    case 'rgbDrift':
      return motion(Number.POSITIVE_INFINITY, timeMs => ({
        skewX: Math.sin(timeMs * Math.PI * 2 / 1500) * 0.018,
        x: Math.sin(timeMs * Math.PI * 2 / 900) * 2
      }));
    case 'afterimage':
      return motion(Number.POSITIVE_INFINITY, timeMs => ({
        rotation: Math.sin(timeMs * Math.PI * 2 / 3200) * 0.008,
        scaleX: 1 + Math.sin(timeMs * Math.PI * 2 / 1800) * 0.012,
        scaleY: 1 + Math.sin(timeMs * Math.PI * 2 / 1800) * 0.012
      }));
    case 'none':
    default:
      return motion(Number.POSITIVE_INFINITY, () => ({}));
  }
}

export function sampleClip(clip: MotionClip, timeMs: number, context: MotionContext): MotionState {
  return clip.sample(Math.max(0, timeMs), context);
}
