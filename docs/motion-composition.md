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

`KineticSceneTemplate` は単語の `start` / `end` を描画タイミングとして使い、次の部品をパラメータから選んで場面を組み立てます。文字単位の調整は不要です。

- Layout: `center`, `random`, `circle`, `vertical`, `fill`
- Entrance: `slam`, `slide`, `scale`, `characterBreak`, `instant`
- Sustain: `still`, `shake`, `pulse`, `glitch`, `multiply`, `compress`
- Exit: `collapse`, `fall`, `shatter`, `noise`, `hardStop`
- Screen: `none`, `cameraShake`, `zoom`, `rgbDrift`, `afterimage`

新しい動きは `Scene.ts` の各ファクトリーへ `MotionClip` を追加し、カタログに名前を登録します。テンプレートクラスを新設する必要はありません。

## 設定プリセット

テンプレートタブで `KineticSceneTemplate` を選ぶと、現在のレイアウト、モーション、時間、色、フォント設定を名前付きプリセットとして保存できます。プリセットはアプリのローカルストレージへ保存され、別のプロジェクトや選択中のフレーズにも適用できます。保存済みプリセットは上書き・削除できます。

## タイポグラフィエフェクト

6系統のエフェクトはそれぞれ独立して有効化でき、同時に合成できます。すべて単語の時刻と `motionSeed` から直接評価するため、プレビュー、シーク、動画出力で同じ結果になります。

- 文字シャッフル: 記号列から元の単語へ収束
- 反復複製: 語の複製数、間隔、遠近減衰を制御
- 有機ディストーション: UV波形の振幅、周波数、速度を制御
- 弾性破壊: 水平スライスの数、飛散強度、復元時間を制御
- 文字オブジェクト放出: 粒子、泡、目、ノイズを単語から放出
- 文字曲面: リボン、円筒、トーラスへの反復・曲率を制御

プリセット欄には、公開事例の考え方をUTAVISTA用に独自実装した6つの内蔵バリエーションがあります。内蔵バリエーションは削除されず、適用後に設定を調整してユーザープリセットとして複製保存できます。外部リポジトリのコードは含みません。
