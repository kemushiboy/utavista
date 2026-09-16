import assert from 'node:assert/strict';
import {
  combineMotionStates,
  delay,
  deterministicNoise,
  parallel,
  repeat,
  sequence,
  tween
} from '../src/renderer/motion/Motion';
import { createEntrance, createSustain } from '../src/renderer/motion/Scene';

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

console.log('Motion system validation passed.');

