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
- Entrance / Exit（共通）: `slam`, `slide`, `scale`, `collapse`, `fall`, `shatter`, `noise`, `instant`, `soft`, `anticipate`, `spring`, `bounce`, `turnstile`, `mask`, `genie`
- Sustain: `still`, `shake`, `pulse`, `breathe`, `glitch`, `compress`
- Screen: `none`, `cameraShake`, `zoom`, `rgbDrift`, `afterimage`, `whipPan`, `zoomDive`

出現と消失は同じ名前の一覧から選び、それぞれ入る向き・抜ける向きの動きになります。

| 名前 | 動き |
| --- | --- |
| `soft` | 下から24px持ち上がりながら、ぼかし7px→0pxで輪郭が澄む（消失は逆） |
| `anticipate` | 逆方向へ約28%の時間で溜めてから本動作、減衰正弦で揺り戻す |
| `spring` | 減衰比0.42のばね応答。数回行き過ぎて定着する |
| `bounce` | 反発係数0.62で弾む落下。速度方向へ伸び、接地の瞬間だけ潰れる（面積一定） |
| `turnstile` | 入りは左端、出は右端を軸に80°以内で回る回転ドア |
| `mask` | マスクが下から開き、中身は別速度で1.35→1倍に縮む（消失は下から閉じる） |
| `genie` | 横幅を先に絞って下の受け口へ吸い込まれる（出現は逆に展開） |

`whipPan` と `zoomDive` はフレーズ冒頭だけに効く場面転換で、それぞれ横へ流れ込む・3.2倍から引いて着地する動きです。動き側が `blur`（ぼかし）や `clipTop` / `clipBottom`（マスクの開閉）を返すと、テンプレートがBlurFilterと矩形マスクに反映します。

### 統合・廃止した名前

保存済みプロジェクトやプリセットの旧名は、読み込み時と描画時に自動で読み替えます。

| 旧名 | 新名 | 理由 |
| --- | --- | --- |
| `characterBreak`（出現） | `shatter` | 消失の `shatter` と同じ飛散の往復だったため |
| `hardStop`（消失） | `instant` | 出現の `instant` と同じ即時切替だったため |
| `multiply`（継続） | `breathe` | `pulse` とほぼ同じ拡大縮小だったため。以前付随していた残像は `screenMotion: afterimage` で付けられます |

新しい動きは `Scene.ts` の各ファクトリーへ `MotionClip` を追加し、カタログに名前を登録します。テンプレートクラスを新設する必要はありません。

## 設定プリセット

テンプレートタブで `KineticSceneTemplate` を選ぶと、現在のレイアウト、モーション、時間、色、フォント設定を名前付きプリセットとして保存できます。プリセットはアプリのローカルストレージへ保存され、別のプロジェクトや選択中のフレーズにも適用できます。保存済みプリセットは上書き・削除できます。

## タイポグラフィエフェクト

11系統のエフェクトはそれぞれ独立して有効化でき、同時に合成できます。すべて単語の時刻と `motionSeed` から直接評価するため、プレビュー、シーク、動画出力で同じ結果になります。

- 文字シャッフル: 記号列から元の単語へ収束
- 反復複製: 語の複製数、間隔、遠近減衰を制御
- 有機ディストーション: UV波形の振幅、周波数、速度を制御
- 弾性破壊: 水平スライスの数、飛散強度、復元時間を制御
- 文字オブジェクト放出: 粒子、泡、目、ノイズ、集中線（12fps更新）を単語から放出
- 文字曲面: リボン、円筒、トーラスへの反復・曲率を制御
- 可変ウェイトパルス: ウェイトの脈動と字間補正
- キネティックカーニング: 広い字間から中央へ収束
- ベースラインウェーブ: 読字順に基線へ着地（負のオフセットで上から落とす DROP WORD 表現）
- カラオケ塗り: 発声中の文字を発声後色で左→右に塗り進める
- 二重輪郭インパクト: 歌唱開始の瞬間に本体色の輪郭を外側へ拡散させる

プリセット欄には、公開事例の考え方をUTAVISTA用に独自実装した内蔵バリエーションがあります。内蔵バリエーションは削除されず、適用後に設定を調整してユーザープリセットとして複製保存できます。外部リポジトリのコードは含みません。
