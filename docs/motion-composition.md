# Motion Composition

`src/renderer/motion` は、完成形テンプレートを増やさずに小さなモーションを合成するための基盤です。

## 原則

- モーションは `sample(timeMs, context)` の純関数として評価する。
- フレーム間の内部状態や `Math.random()` に依存しない。
- ランダム表現は `seed`、要素番号、時刻から決定論的に生成する。
- レイアウト、出現、継続、消失、画面全体の動きを独立して選択する。
- プレビュー、シーク、動画出力で同じ時刻には同じ結果を返す。

## TypeScriptでのモーション合成

```ts
import { delay, parallel, repeat, sequence, tween } from '../motion';

const entrance = sequence(
  delay(80, tween(240, { alpha: 0 }, { alpha: 1 })),
  parallel(
    tween(320, { x: -240 }, { x: 0 }, 'easeOutCubic'),
    tween(320, { scaleX: 1.8, scaleY: 1.8 }, { scaleX: 1, scaleY: 1 }, 'easeOutBack')
  )
);

const breathing = repeat(
  sequence(
    tween(400, {}, { scaleX: 1.06, scaleY: 1.06 }),
    tween(400, { scaleX: 1.06, scaleY: 1.06 }, {})
  )
);
```

`parallel` は移動・回転を加算し、拡大率・不透明度を乗算します。`sequence` は完了した区間の結果を保持しながら次の区間を評価します。

## シーンテンプレート

`KineticSceneTemplate` は次の部品をパラメータから選び、場面を組み立てます。

- Layout: `center`, `random`, `circle`, `vertical`, `fill`
- Entrance: `slam`, `slide`, `scale`, `characterBreak`, `instant`
- Sustain: `still`, `shake`, `pulse`, `glitch`, `multiply`, `compress`
- Exit: `collapse`, `fall`, `shatter`, `noise`, `hardStop`
- Screen: `none`, `cameraShake`, `zoom`, `rgbDrift`, `afterimage`

新しい動きは `Scene.ts` の各ファクトリーへ `MotionClip` を追加し、カタログに名前を登録します。テンプレートクラスを新設する必要はありません。

