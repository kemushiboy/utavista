export interface KineticSceneVariation {
  id: string;
  name: string;
  description: string;
  referenceUrl: string;
  params: Record<string, unknown>;
}

const disabledEffects = {
  shuffleEnabled: false,
  repetitionEnabled: false,
  organicEnabled: false,
  destructionEnabled: false,
  emittersEnabled: false,
  surfaceEnabled: false
};

/** 公開事例の手法を、外部コードを移植せずUTAVISTA用に再設計した設定済みバリエーション。 */
export const kineticSceneVariations: KineticSceneVariation[] = [
  {
    id: 'builtin-elastic-destruction',
    name: '01 Elastic Destruction',
    description: '弾性変形とスライス破裂を重ねた、ブレイクダウン向けの破壊表現',
    referenceUrl: 'https://github.com/armdz/tsl_elastic_vertex_destruction',
    params: {
      ...disabledEffects,
      destructionEnabled: true,
      organicEnabled: true,
      motionLayout: 'center',
      entranceMotion: 'slam',
      sustainMotion: 'compress',
      exitMotion: 'shatter',
      screenMotion: 'cameraShake',
      motionIntensity: 1.45,
      entranceDuration: 260,
      exitDuration: 760,
      organicAmplitude: 0.018,
      organicFrequency: 2.5,
      organicSpeed: 1.4,
      destructionStrength: 1.35,
      destructionSlices: 12,
      destructionDuration: 980,
      textColor: '#D9D9D9',
      activeTextColor: '#FFFFFF',
      completedTextColor: '#FF3D57'
    }
  },
  {
    id: 'builtin-repetitive-typography',
    name: '02 Repetitive Typography',
    description: '同じ語を遠近方向へ蓄積し、時間差と密度で反復を増幅する表現',
    referenceUrl: 'https://github.com/codrops/RepetitiveTypography',
    params: {
      ...disabledEffects,
      repetitionEnabled: true,
      motionLayout: 'vertical',
      entranceMotion: 'slide',
      sustainMotion: 'still',
      exitMotion: 'collapse',
      screenMotion: 'none',
      motionIntensity: 1.05,
      repetitionCount: 10,
      repetitionSpread: 15,
      repetitionDepth: 0.72,
      textColor: '#A5A5A5',
      activeTextColor: '#FFFFFF',
      completedTextColor: '#8CFFDA'
    }
  },
  {
    id: 'builtin-type-shuffle',
    name: '03 Type Shuffle / Data Decode',
    description: '記号・数字・カタカナを高速置換し、単語の開始時刻で正しい歌詞へ収束',
    referenceUrl: 'https://github.com/codrops/TypeShuffleAnimation',
    params: {
      ...disabledEffects,
      shuffleEnabled: true,
      motionLayout: 'fill',
      entranceMotion: 'instant',
      sustainMotion: 'glitch',
      exitMotion: 'noise',
      screenMotion: 'rgbDrift',
      motionIntensity: 1.15,
      shuffleCharset: '01#%&<>アイウエオカキクケコXYZ',
      shuffleRate: 42,
      shuffleDuration: 820,
      textColor: '#3CFF78',
      activeTextColor: '#E8FFF0',
      completedTextColor: '#5BBEFF'
    }
  },
  {
    id: 'builtin-organic-distortion',
    name: '04 Organic Distortion',
    description: '単語表面を連続波形で歪ませ、可読性を残したまま有機的に揺らす表現',
    referenceUrl: 'https://github.com/JorgeCapillo/infinite-scrolling-text-distortion',
    params: {
      ...disabledEffects,
      organicEnabled: true,
      motionLayout: 'vertical',
      entranceMotion: 'slide',
      sustainMotion: 'compress',
      exitMotion: 'fall',
      screenMotion: 'zoom',
      motionIntensity: 1.2,
      organicAmplitude: 0.055,
      organicFrequency: 4.2,
      organicSpeed: 1.1,
      textColor: '#E8D9FF',
      activeTextColor: '#FFFFFF',
      completedTextColor: '#C2FF70'
    }
  },
  {
    id: 'builtin-object-emitters',
    name: '05 Glyph Object Emitters',
    description: '発声中の単語を発生源として、目や粒子オブジェクトを決定論的に放出',
    referenceUrl: 'https://github.com/uuuulala/WebGL-typing-tutorial',
    params: {
      ...disabledEffects,
      emittersEnabled: true,
      motionLayout: 'random',
      entranceMotion: 'scale',
      sustainMotion: 'pulse',
      exitMotion: 'noise',
      screenMotion: 'cameraShake',
      motionIntensity: 1.1,
      emitterStyle: 'eyes',
      emitterCount: 22,
      emitterRadius: 150,
      textColor: '#C6C6C6',
      activeTextColor: '#FFFFFF',
      completedTextColor: '#FFEA70'
    }
  },
  {
    id: 'builtin-kinetic-surface',
    name: '06 Kinetic Type Surface',
    description: '反復した文字列を曲面へ巻き付け、UV反復と疑似3D奥行きを合成する表現',
    referenceUrl: 'https://github.com/marioecg/codrops-kinetic-typo',
    params: {
      ...disabledEffects,
      surfaceEnabled: true,
      motionLayout: 'circle',
      entranceMotion: 'scale',
      sustainMotion: 'compress',
      exitMotion: 'collapse',
      screenMotion: 'zoom',
      motionIntensity: 1,
      surfaceShape: 'torus',
      surfaceCurve: 0.18,
      surfaceRepeat: 3,
      textColor: '#9B8CFF',
      activeTextColor: '#FFFFFF',
      completedTextColor: '#42E8FF'
    }
  }
];
