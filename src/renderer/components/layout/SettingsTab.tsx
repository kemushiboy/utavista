import React, { useEffect, useState } from 'react';
import { FontService } from '../../services/FontService';
import Engine from '../../engine/Engine';
import DebugTab from './DebugTab';
import '../../styles/SettingsTab.css';

type DebugTabProps = React.ComponentProps<typeof DebugTab>;

interface SettingsTabProps {
  engine?: Engine;
  debugInfo?: DebugTabProps['debugInfo'];
  timingDebugInfo?: DebugTabProps['timingDebugInfo'];
}

const SettingsTab: React.FC<SettingsTabProps> = ({ engine, debugInfo, timingDebugInfo }) => {
  const [fontCount, setFontCount] = useState(0);
  // デバッグ情報は開いている間だけ描画し、閉じているときは更新処理を走らせない。
  const [debugOpen, setDebugOpen] = useState(false);

  useEffect(() => {
    setFontCount(FontService.getFontFamiliesWithStyles().length);
  }, []);

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <h3>フォント設定</h3>
        <div className="font-display-setting">
          <p className="setting-description">
            PCにインストールされているフォントを自動的に認識します。
            フォントを手動で有効化する必要はありません。
          </p>
          <div className="current-settings">
            <div className="setting-item">
              <span className="setting-label">利用可能なフォント:</span>
              <span className="setting-value">{fontCount} ファミリー</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">読み込み方式:</span>
              <span className="setting-value">選択時に自動読み込み</span>
            </div>
          </div>
        </div>
      </div>

      <details
        className="settings-section settings-debug"
        open={debugOpen}
        onToggle={event => setDebugOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>開発者向け: デバッグ情報</summary>
        {debugOpen && (
          <DebugTab engine={engine} debugInfo={debugInfo} timingDebugInfo={timingDebugInfo} />
        )}
      </details>
    </div>
  );
};

export default SettingsTab;
