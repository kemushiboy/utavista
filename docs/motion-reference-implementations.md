# Motion Typography Reference Implementations

`KineticSceneTemplate` 1.1の6系統は、次の公開実装で示された表現手法をPixiJS向けに独自実装したものです。外部リポジトリのソースコード、シェーダー、アセットはコピーしていません。

| 内蔵バリエーション | 参考実装 | UTAVISTAでの実装 | ライセンス確認 |
| --- | --- | --- | --- |
| Elastic Destruction | [tsl_elastic_vertex_destruction](https://github.com/armdz/tsl_elastic_vertex_destruction) | 単語テクスチャの水平スライス、決定論的飛散、弾性復元 | リポジトリ上で明示ライセンスを確認できないため手法参照のみ |
| Repetitive Typography | [codrops/RepetitiveTypography](https://github.com/codrops/RepetitiveTypography) | 複製レイヤー、奥行き減衰、時間差移動 | MIT |
| Type Shuffle / Data Decode | [codrops/TypeShuffleAnimation](https://github.com/codrops/TypeShuffleAnimation) | seed付き文字置換、単語開始時刻への収束 | MIT |
| Organic Distortion | [infinite-scrolling-text-distortion](https://github.com/JorgeCapillo/infinite-scrolling-text-distortion) | PixiJS FilterによるUV波形変形 | MIT |
| Glyph Object Emitters | [WebGL-typing-tutorial](https://github.com/uuuulala/WebGL-typing-tutorial) | 単語を発生源にした目・泡・粒子・ノイズ | MIT |
| Kinetic Type Surface | [codrops-kinetic-typo](https://github.com/marioecg/codrops-kinetic-typo) | UV反復フィルターと疑似3D曲面レイヤー | MIT |

## 実装上の差異

- Three.js、WebGPU、GSAPは追加せず、既存のPixiJS 7描画系へ統合しています。
- 操作入力やスクロール速度の代わりに、単語の開始・終了時刻、`motionSeed`、各パラメータを入力に使います。
- エフェクト状態はフレーム履歴を持たず、任意の時刻を直接評価できます。
- 6系統を個別にON/OFFできるため、内蔵バリエーション以外の組み合わせも作成できます。
- Kinetic Type Surfaceは完全な3Dメッシュではなく、UV変形と複製レイヤーによるPixiJS向けの疑似3D表現です。
