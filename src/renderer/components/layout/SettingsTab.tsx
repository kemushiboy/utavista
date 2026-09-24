import React, { useEffect, useState } from 'react';
import { FontService } from '../../services/FontService';
import Engine from '../../engine/Engine';
import '../../styles/SettingsTab.css';

interface SettingsTabProps {
  engine?: Engine;
}

const SettingsTab: React.FC<SettingsTabProps> = () => {
  const [fontCount, setFontCount] = useState(0);

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
    </div>
  );
};

export default SettingsTab;
