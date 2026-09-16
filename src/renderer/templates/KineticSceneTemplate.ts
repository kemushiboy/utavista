import * as PIXI from 'pixi.js';
import type {
  AnimationPhase,
  HierarchyType,
  IAnimationTemplate,
  ParameterConfig,
  TemplateMetadata
} from '../types/types';
import { FontService } from '../services/FontService';
import { TextStyleFactory } from '../utils/TextStyleFactory';
import { getLogicalStageSize } from '../utils/StageUtils';
import {
  EntranceName,
  ExitName,
  LayoutName,
  MotionContext,
  SceneDefinition,
  ScreenMotionName,
  SustainName,
  calculateLayout,
  combineMotionStates,
  createEntrance,
  createExit,
  createScreenMotion,
  createSustain,
  sampleClip,
  sceneCatalog,
  TypographyEffects,
  TypographyEffectParams
} from '../motion';

const TEXT_NAME = 'kinetic-scene-text';

function numberParam(params: Record<string, unknown>, name: string, fallback: number): number {
  const value = params[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringParam(params: Record<string, unknown>, name: string, fallback: string): string {
  const value = params[name];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * 小さなモーションをデータで組み合わせる、単語・場面ベースのキネティック・タイポグラフィ。
 * すべての状態は nowMs と seed から直接評価され、フレーム履歴を持たない。
 */
export class KineticSceneTemplate implements IAnimationTemplate {
  private readonly typographyEffects = new TypographyEffects();

  readonly metadata: TemplateMetadata = {
    name: 'KineticSceneTemplate',
    version: '1.1.0',
    description: 'レイアウト・基本モーション・6系統のタイポグラフィエフェクトを自由に合成するシーンテンプレート',
    license: 'GPL-3.0',
    originalAuthor: {
      name: 'UTAVISTA Development Team',
      contribution: '決定論的モーション合成基盤とシーンテンプレート',
      date: '2026-09-16'
    }
  };

  getParameterConfig(): ParameterConfig[] {
    return [
      { name: 'fontSize', type: 'number', default: 112, min: 20, max: 300, step: 1, label: '文字サイズ' },
      {
        name: 'fontFamily',
        type: 'font',
        default: 'Arial',
        get options() { return FontService.getFontFamilies(); },
        label: 'フォント'
      },
      { name: 'textColor', type: 'color', default: '#F3F0E8', label: '待機色' },
      { name: 'activeTextColor', type: 'color', default: '#FFFFFF', label: '発声中色' },
      { name: 'completedTextColor', type: 'color', default: '#A8FF60', label: '発声後色' },
      { name: 'headTime', type: 'number', default: 700, min: 0, max: 3000, step: 50, label: '先行表示時間' },
      { name: 'tailTime', type: 'number', default: 650, min: 0, max: 3000, step: 50, label: '残留時間' },
      { name: 'phraseOffsetX', type: 'number', default: 0, min: -900, max: 900, step: 5, label: '場面X位置' },
      { name: 'phraseOffsetY', type: 'number', default: 0, min: -500, max: 500, step: 5, label: '場面Y位置' },
      { name: 'charSpacing', type: 'number', default: 0.9, min: 0.35, max: 3, step: 0.05, label: '単語間隔' },
      { name: 'motionLayout', type: 'string', default: 'center', options: sceneCatalog.layouts, label: 'レイアウト' },
      { name: 'entranceMotion', type: 'string', default: 'slam', options: sceneCatalog.entrances, label: '出現' },
      { name: 'sustainMotion', type: 'string', default: 'pulse', options: sceneCatalog.sustains, label: '継続' },
      { name: 'exitMotion', type: 'string', default: 'collapse', options: sceneCatalog.exits, label: '消失' },
      { name: 'screenMotion', type: 'string', default: 'zoom', options: sceneCatalog.screens, label: '画面全体' },
      { name: 'motionIntensity', type: 'number', default: 1, min: 0, max: 3, step: 0.05, label: 'モーション強度' },
      { name: 'motionSeed', type: 'number', default: 2026, min: 0, max: 99999, step: 1, label: 'ランダムシード' },
      { name: 'entranceDuration', type: 'number', default: 520, min: 0, max: 2500, step: 20, label: '出現時間' },
      { name: 'exitDuration', type: 'number', default: 520, min: 1, max: 2500, step: 20, label: '消失時間' },
      { name: 'shuffleEnabled', type: 'boolean', default: false, label: '文字シャッフル' },
      { name: 'shuffleCharset', type: 'string', default: '01#%&<>アイウエオXYZ', label: '置換文字セット' },
      { name: 'shuffleRate', type: 'number', default: 50, min: 16, max: 400, step: 1, label: '置換間隔 (ms)' },
      { name: 'shuffleDuration', type: 'number', default: 720, min: 50, max: 3000, step: 10, label: '収束時間 (ms)' },
      { name: 'repetitionEnabled', type: 'boolean', default: false, label: '反復複製' },
      { name: 'repetitionCount', type: 'number', default: 8, min: 1, max: 24, step: 1, label: '複製数' },
      { name: 'repetitionSpread', type: 'number', default: 14, min: 0, max: 100, step: 1, label: '複製間隔' },
      { name: 'repetitionDepth', type: 'number', default: 0.65, min: 0, max: 1, step: 0.05, label: '遠近減衰' },
      { name: 'organicEnabled', type: 'boolean', default: false, label: '有機ディストーション' },
      { name: 'organicAmplitude', type: 'number', default: 0.04, min: 0, max: 0.2, step: 0.005, label: '波形振幅' },
      { name: 'organicFrequency', type: 'number', default: 3, min: 0.2, max: 12, step: 0.1, label: '波形周波数' },
      { name: 'organicSpeed', type: 'number', default: 1, min: -5, max: 5, step: 0.1, label: '波形速度' },
      { name: 'destructionEnabled', type: 'boolean', default: false, label: '弾性破壊' },
      { name: 'destructionStrength', type: 'number', default: 1, min: 0, max: 3, step: 0.05, label: '破壊強度' },
      { name: 'destructionSlices', type: 'number', default: 9, min: 2, max: 24, step: 1, label: '破壊スライス数' },
      { name: 'destructionDuration', type: 'number', default: 900, min: 100, max: 4000, step: 20, label: '破壊・復元時間 (ms)' },
      { name: 'emittersEnabled', type: 'boolean', default: false, label: '文字オブジェクト放出' },
      { name: 'emitterStyle', type: 'string', default: 'particles', options: ['particles', 'bubbles', 'eyes', 'noise'], label: '放出スタイル' },
      { name: 'emitterCount', type: 'number', default: 16, min: 1, max: 48, step: 1, label: '放出数' },
      { name: 'emitterRadius', type: 'number', default: 130, min: 10, max: 500, step: 5, label: '放出半径' },
      { name: 'surfaceEnabled', type: 'boolean', default: false, label: '文字曲面' },
      { name: 'surfaceShape', type: 'string', default: 'ribbon', options: ['ribbon', 'cylinder', 'torus'], label: '曲面形状' },
      { name: 'surfaceCurve', type: 'number', default: 0.14, min: -0.5, max: 0.5, step: 0.01, label: '曲率' },
      { name: 'surfaceRepeat', type: 'number', default: 2, min: 1, max: 6, step: 1, label: 'UV反復数' }
    ];
  }

  animateContainer(
    container: PIXI.Container,
    text: string | string[],
    params: Record<string, unknown>,
    nowMs: number,
    startMs: number,
    endMs: number,
    hierarchyType: HierarchyType,
    _phase: AnimationPhase
  ): boolean {
    const content = Array.isArray(text) ? text.join('') : text;
    container.visible = true;

    if (hierarchyType === 'phrase') {
      return this.renderPhrase(container, params, nowMs, startMs);
    }
    if (hierarchyType === 'word') {
      return this.renderWord(container, content, params, nowMs, startMs, endMs);
    }
    // このテンプレートは単語タイミングを描画単位とし、文字コンテナは重複表示しない。
    container.visible = false;
    return true;
  }

  removeVisualElements(container: PIXI.Container): void {
    this.typographyEffects.cleanup(container);
    container.position.set(0, 0);
    container.scale.set(1, 1);
    container.skew.set(0, 0);
    container.rotation = 0;
    container.alpha = 1;
  }

  private renderPhrase(
    container: PIXI.Container,
    params: Record<string, unknown>,
    nowMs: number,
    startMs: number
  ): boolean {
    const { width, height } = getLogicalStageSize();
    const intensity = numberParam(params, 'motionIntensity', 1);
    const context: MotionContext = {
      seed: numberParam(params, 'motionSeed', 2026),
      index: 0,
      total: 1,
      intensity
    };
    const scene = this.resolveScene(params);
    const screenState = sampleClip(createScreenMotion(scene.screen), nowMs - startMs, context);

    container.position.set(
      width / 2 + numberParam(params, 'phraseOffsetX', 0) + screenState.x,
      height / 2 + numberParam(params, 'phraseOffsetY', 0) + screenState.y
    );
    container.scale.set(screenState.scaleX, screenState.scaleY);
    container.skew.set(screenState.skewX, screenState.skewY);
    container.rotation = screenState.rotation;
    container.alpha = screenState.alpha;
    return true;
  }

  private renderWord(
    container: PIXI.Container,
    text: string,
    params: Record<string, unknown>,
    nowMs: number,
    startMs: number,
    endMs: number
  ): boolean {
    const { width, height } = getLogicalStageSize();
    const index = Math.max(0, numberParam(params, 'wordIndex', 0));
    const total = Math.max(1, numberParam(params, 'totalWords', 1));
    const fontSize = numberParam(params, 'fontSize', 112);
    const intensity = numberParam(params, 'motionIntensity', 1);
    const seed = numberParam(params, 'motionSeed', 2026);
    const phraseEndMs = numberParam(params, 'phraseEndMs', endMs);
    const context: MotionContext = { seed, index, total, intensity };
    const scene = this.resolveScene(params);

    const spacing = numberParam(params, 'charSpacing', 0.9);
    const layout = scene.layout === 'center'
      ? this.calculateCenteredWordLayout(params, index, fontSize, spacing)
      : calculateLayout(scene.layout, { ...context, width, height, fontSize, spacing: spacing * 2.2 });

    const entranceDuration = numberParam(params, 'entranceDuration', 520);
    const exitDuration = numberParam(params, 'exitDuration', 520);
    const entrance = createEntrance(
      scene.entrance,
      entranceDuration
    );
    const sustain = createSustain(scene.sustain);
    const exit = createExit(scene.exit, exitDuration);

    let motionState;
    if (nowMs < startMs) {
      motionState = sampleClip(entrance, nowMs - (startMs - entranceDuration), context);
    } else if (nowMs > phraseEndMs) {
      motionState = sampleClip(exit, nowMs - phraseEndMs, context);
    } else {
      const entranceState = sampleClip(entrance, entrance.duration, context);
      const sustainState = sampleClip(sustain, nowMs - startMs, context);
      motionState = combineMotionStates(entranceState, sustainState);
    }

    container.position.set(layout.x + motionState.x, layout.y + motionState.y);
    container.scale.set(layout.scale * motionState.scaleX, layout.scale * motionState.scaleY);
    container.skew.set(motionState.skewX, motionState.skewY);
    container.rotation = layout.rotation + motionState.rotation;
    container.alpha = Math.max(0, Math.min(1, motionState.alpha));

    const color = nowMs < startMs
      ? stringParam(params, 'textColor', '#F3F0E8')
      : nowMs <= endMs
        ? stringParam(params, 'activeTextColor', '#FFFFFF')
        : stringParam(params, 'completedTextColor', '#A8FF60');
    const textObject = this.ensureText(container, text, params, fontSize, color);
    this.typographyEffects.update(
      container,
      textObject,
      text,
      this.resolveTypographyEffects(params),
      { nowMs, startMs, seed, index, intensity }
    );
    this.updateEchoes(container, textObject, params, nowMs, intensity);
    return true;
  }

  private calculateCenteredWordLayout(
    params: Record<string, unknown>,
    index: number,
    fontSize: number,
    spacing: number
  ): { x: number; y: number; rotation: number; scale: number } {
    const words = Array.isArray(params.words) ? params.words as Array<{ word?: string }> : [];
    const widths = words.map(word => Math.max(fontSize * 0.7, (word.word?.length || 1) * fontSize * 0.62));
    if (widths.length === 0 || index >= widths.length) {
      return { x: (index - (Math.max(1, numberParam(params, 'totalWords', 1)) - 1) / 2) * fontSize * 2, y: 0, rotation: 0, scale: 1 };
    }

    const gap = fontSize * 0.32 * spacing;
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);
    const precedingWidth = widths.slice(0, index).reduce((sum, width) => sum + width, 0) + gap * index;
    return {
      x: -totalWidth / 2 + precedingWidth + widths[index] / 2,
      y: 0,
      rotation: 0,
      scale: 1
    };
  }

  private ensureText(
    container: PIXI.Container,
    text: string,
    params: Record<string, unknown>,
    fontSize: number,
    color: string
  ): PIXI.Text {
    let textObject = container.children.find(child => child.name === TEXT_NAME) as PIXI.Text | undefined;
    const fontFamily = stringParam(params, 'fontFamily', 'Arial');
    const signature = `${text}|${fontFamily}|${fontSize}|${color}`;

    if (!textObject) {
      textObject = TextStyleFactory.createHighDPIText(text, {
        fontFamily,
        fontSize,
        fill: color,
        align: 'center',
        fontWeight: '700'
      });
      textObject.name = TEXT_NAME;
      textObject.anchor.set(0.5);
      container.addChild(textObject);
    }

    if ((textObject as PIXI.Text & { __kineticSignature?: string }).__kineticSignature !== signature) {
      textObject.text = text;
      textObject.style = TextStyleFactory.createTextStyle({
        fontFamily,
        fontSize,
        fill: color,
        align: 'center',
        fontWeight: '700'
      });
      (textObject as PIXI.Text & { __kineticSignature?: string }).__kineticSignature = signature;
    }
    return textObject;
  }

  private updateEchoes(
    container: PIXI.Container,
    source: PIXI.Text,
    params: Record<string, unknown>,
    nowMs: number,
    intensity: number
  ): void {
    const { screen: screenMotion, sustain: sustainMotion } = this.resolveScene(params);
    const mode = screenMotion === 'rgbDrift'
      ? 'rgb'
      : screenMotion === 'afterimage' || sustainMotion === 'multiply'
        ? 'echo'
        : 'none';
    const echoNames = ['kinetic-echo-a', 'kinetic-echo-b'];

    if (mode === 'none') {
      echoNames.forEach(name => {
        const echo = container.children.find(child => child.name === name);
        if (echo) {
          container.removeChild(echo);
          echo.destroy();
        }
      });
      return;
    }

    echoNames.forEach((name, echoIndex) => {
      let echo = container.children.find(child => child.name === name) as PIXI.Text | undefined;
      if (!echo) {
        echo = new PIXI.Text(source.text, source.style);
        echo.name = name;
        echo.anchor.set(0.5);
        container.addChildAt(echo, 0);
      }

      echo.text = source.text;
      echo.style = source.style;
      const direction = echoIndex === 0 ? -1 : 1;
      const wave = Math.sin(nowMs * 0.025 + echoIndex * Math.PI);

      if (mode === 'rgb') {
        echo.tint = echoIndex === 0 ? 0xff245f : 0x20e3ff;
        echo.alpha = 0.42;
        echo.position.set(direction * (4 + Math.abs(wave) * 5) * intensity, wave * 2 * intensity);
        echo.scale.set(1, 1);
        echo.blendMode = PIXI.BLEND_MODES.ADD;
      } else {
        echo.tint = 0xffffff;
        echo.alpha = Math.max(0.08, 0.22 - echoIndex * 0.06);
        echo.position.set(direction * (8 + echoIndex * 7) * intensity, direction * 3 * intensity);
        const echoScale = 1 + (echoIndex + 1) * 0.045 * intensity;
        echo.scale.set(echoScale);
        echo.blendMode = PIXI.BLEND_MODES.SCREEN;
      }
    });
  }

  private resolveScene(params: Record<string, unknown>): SceneDefinition {
    return {
      layout: stringParam(params, 'motionLayout', 'center') as LayoutName,
      entrance: stringParam(params, 'entranceMotion', 'slam') as EntranceName,
      sustain: stringParam(params, 'sustainMotion', 'pulse') as SustainName,
      exit: stringParam(params, 'exitMotion', 'collapse') as ExitName,
      screen: stringParam(params, 'screenMotion', 'zoom') as ScreenMotionName
    };
  }

  private resolveTypographyEffects(params: Record<string, unknown>): TypographyEffectParams {
    return {
      shuffleEnabled: params.shuffleEnabled === true,
      shuffleCharset: stringParam(params, 'shuffleCharset', '01#%&<>アイウエオXYZ'),
      shuffleRate: numberParam(params, 'shuffleRate', 50),
      shuffleDuration: numberParam(params, 'shuffleDuration', 720),
      repetitionEnabled: params.repetitionEnabled === true,
      repetitionCount: numberParam(params, 'repetitionCount', 8),
      repetitionSpread: numberParam(params, 'repetitionSpread', 14),
      repetitionDepth: numberParam(params, 'repetitionDepth', 0.65),
      organicEnabled: params.organicEnabled === true,
      organicAmplitude: numberParam(params, 'organicAmplitude', 0.04),
      organicFrequency: numberParam(params, 'organicFrequency', 3),
      organicSpeed: numberParam(params, 'organicSpeed', 1),
      destructionEnabled: params.destructionEnabled === true,
      destructionStrength: numberParam(params, 'destructionStrength', 1),
      destructionSlices: numberParam(params, 'destructionSlices', 9),
      destructionDuration: numberParam(params, 'destructionDuration', 900),
      emittersEnabled: params.emittersEnabled === true,
      emitterStyle: stringParam(params, 'emitterStyle', 'particles') as TypographyEffectParams['emitterStyle'],
      emitterCount: numberParam(params, 'emitterCount', 16),
      emitterRadius: numberParam(params, 'emitterRadius', 130),
      surfaceEnabled: params.surfaceEnabled === true,
      surfaceShape: stringParam(params, 'surfaceShape', 'ribbon') as TypographyEffectParams['surfaceShape'],
      surfaceCurve: numberParam(params, 'surfaceCurve', 0.14),
      surfaceRepeat: numberParam(params, 'surfaceRepeat', 2)
    };
  }
}

export default KineticSceneTemplate;
