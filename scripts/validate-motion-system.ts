import assert from 'node:assert/strict';
import {
  combineMotionStates,
  applyEasing,
  delay,
  deterministicNoise,
  parallel,
  repeat,
  sequence,
  tween
} from '../src/renderer/motion/Motion';
import { createEntrance, createExit, createSustain, normalizeMotionName, sceneCatalog } from '../src/renderer/motion/Scene';
import { createShuffledText, destructionEnvelope } from '../src/renderer/motion/TypographyEffects';
import { kineticSceneVariations } from '../src/renderer/data/kineticSceneVariations';
import { KineticSceneTemplate } from '../src/renderer/templates/KineticSceneTemplate';
import { ParameterManagerV2 } from '../src/renderer/engine/ParameterManagerV2';
import { DEFAULT_PARAMETERS } from '../src/types/StandardParameters';

const context = { seed: 2026, index: 3, total: 12, intensity: 1 };
const clip = parallel(
  delay(80, createEntrance('slam', 420)),
  repeat(createSustain('pulse'), 3)
);

const first = clip.sample(240, context);
clip.sample(900, context);
clip.sample(10, context);
const second = clip.sample(240, context);
assert.deepEqual(second, first, '同一時刻の評価結果が呼び出し順序で変化しています');

const composed = sequence(
  tween(100, { x: -100, alpha: 0 }, { x: 0, alpha: 1 }),
  tween(100, { scaleX: 1, scaleY: 1 }, { scaleX: 1.2, scaleY: 1.2 })
).sample(150, context);
assert.equal(composed.x, 0);
assert.equal(composed.alpha, 1);
assert.ok(composed.scaleX > 1);

assert.equal(deterministicNoise(42), deterministicNoise(42));
assert.deepEqual(combineMotionStates(first), first);

const easingNames = [
  'linear', 'easeInQuad', 'easeOutQuad', 'easeInCubic', 'easeOutCubic',
  'easeInOutCubic', 'easeInQuart', 'easeOutQuart', 'easeOutQuint',
  'easeInOutSine', 'easeOutExpo', 'easeInBack', 'easeOutBack'
] as const;
easingNames.forEach(easing => {
  assert.ok(Math.abs(applyEasing(easing, 0)) < 1e-10, `${easing}: 開始値が0ではありません`);
  assert.ok(Math.abs(applyEasing(easing, 1) - 1) < 1e-10, `${easing}: 終了値が1ではありません`);
});
assert.deepEqual(
  createEntrance('slide', 620, 'easeOutQuart').sample(310, context),
  createEntrance('slide', 620, 'easeOutQuart').sample(310, context)
);
assert.deepEqual(
  createExit('shatter', 680, 'easeInBack').sample(420, context),
  createExit('shatter', 680, 'easeInBack').sample(420, context)
);

const shuffled = createShuffledText('DATA', 0.25, 180, 45, '01#', 2026);
assert.equal(shuffled, createShuffledText('DATA', 0.25, 180, 45, '01#', 2026));
assert.equal(createShuffledText('DATA', 1, 180, 45, '01#', 2026), 'DATA');
assert.equal(destructionEnvelope(0, 900), 0);
assert.ok(destructionEnvelope(450, 900) > 0.99);
assert.ok(Math.abs(destructionEnvelope(900, 900)) < 1e-10);

// 全出現モーションは完了時に基準状態へ戻り、評価順序に依存しない。
sceneCatalog.entrances.forEach(name => {
  const entrance = createEntrance(name, 600);
  const settled = entrance.sample(entrance.duration, { ...context, width: 320 });
  const near = (value: number, expected: number) => Math.abs(value - expected) < 1e-3;
  assert.ok(near(settled.x, 0) && near(settled.y, 0), `${name}: 出現完了時に位置が戻っていません`);
  assert.ok(near(settled.scaleX, 1) && near(settled.scaleY, 1), `${name}: 出現完了時に拡大率が戻っていません`);
  assert.ok(near(settled.alpha, 1) && near(settled.blur, 0), `${name}: 出現完了時に表示が戻っていません`);
  assert.ok(near(settled.clipTop, 0) && near(settled.clipBottom, 0), `${name}: 出現完了時にマスクが開いていません`);
  const exit = createExit(name, 600);
  assert.deepEqual(exit.sample(270, context), (exit.sample(500, context), exit.sample(270, context)), `${name}: 消失が評価順序に依存しています`);
});
assert.deepEqual(sceneCatalog.entrances, sceneCatalog.exits, '出現と消失のモーション一覧が一致していません');

// 統合済みの旧モーション名は新しい名前へ読み替える。
assert.equal(normalizeMotionName('characterBreak'), 'shatter');
assert.equal(normalizeMotionName('hardStop'), 'instant');
assert.equal(normalizeMotionName('multiply'), 'breathe');
assert.deepEqual(createEntrance('characterBreak' as never, 500).sample(200, context), createEntrance('shatter', 500).sample(200, context));

const variationIds = kineticSceneVariations.map(variation => variation.id);
assert.equal(new Set(variationIds).size, variationIds.length, '内蔵バリエーションのIDが重複しています');
const kineticParameterNames = new Set(new KineticSceneTemplate().getParameterConfig().map(parameter => parameter.name));
assert.equal(kineticParameterNames.has('tailTime'), false, '廃止済みのtailTimeがUI設定に残っています');
kineticSceneVariations.forEach(variation => {
  assert.equal('tailTime' in variation.params, false, `${variation.name}: 廃止済みのtailTimeが残っています`);
  Object.keys(variation.params).forEach(parameterName => {
    assert.ok(kineticParameterNames.has(parameterName), `${variation.name}: 未定義パラメータ ${parameterName}`);
  });
  (['entranceMotion', 'exitMotion'] as const).forEach(parameterName => {
    const value = variation.params[parameterName];
    if (value !== undefined) assert.ok(sceneCatalog.entrances.includes(value as never), `${variation.name}: 未登録の${parameterName} ${String(value)}`);
  });
  const sustain = variation.params.sustainMotion;
  if (sustain !== undefined) assert.ok(sceneCatalog.sustains.includes(sustain as never), `${variation.name}: 未登録のsustainMotion ${String(sustain)}`);
  const screen = variation.params.screenMotion;
  if (screen !== undefined) assert.ok(sceneCatalog.screens.includes(screen as never), `${variation.name}: 未登録のscreenMotion ${String(screen)}`);
});

const parameterManager = new ParameterManagerV2();
parameterManager.importCompressed({
  version: '2.0',
  globalDefaults: { ...DEFAULT_PARAMETERS, tailTime: 900 } as any,
  phrases: {
    phrase_legacy: {
      templateId: '',
      individualSettingEnabled: true,
      parameterDiff: { tailTime: 1200, exitDuration: 640, entranceMotion: 'characterBreak', exitMotion: 'hardStop', sustainMotion: 'multiply' } as any
    }
  }
});
assert.equal('tailTime' in parameterManager.getGlobalDefaults(), false, '旧globalDefaultsのtailTimeが残っています');
assert.equal('tailTime' in parameterManager.getParameters('phrase_legacy'), false, '旧個別設定のtailTimeが残っています');
assert.equal(parameterManager.getParameters('phrase_legacy').exitDuration, 640);
const legacyMotions = parameterManager.getParameters('phrase_legacy') as Record<string, unknown>;
assert.equal(legacyMotions.entranceMotion, 'shatter', '旧出現名が移行されていません');
assert.equal(legacyMotions.exitMotion, 'instant', '旧消失名が移行されていません');
assert.equal(legacyMotions.sustainMotion, 'breathe', '旧継続名が移行されていません');

console.log('Motion system validation passed.');
