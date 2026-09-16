import React, { useEffect, useMemo, useState } from 'react';
import { FontService, FontFamily } from '../../services/FontService';
import './FontSelector.css';

interface FontSelectorProps {
  value: string;
  onChange: (fontFamily: string) => void;
  disabled?: boolean;
}

const FontSelector: React.FC<FontSelectorProps> = ({ value, onChange, disabled = false }) => {
  const [fontFamilies, setFontFamilies] = useState<FontFamily[]>([]);

  useEffect(() => {
    const loadFontFamilies = () => setFontFamilies(FontService.getFontFamiliesWithStyles());
    loadFontFamilies();
    window.addEventListener('fontSettingsChanged', loadFontFamilies);
    return () => window.removeEventListener('fontSettingsChanged', loadFontFamilies);
  }, []);

  const selectedFamily = useMemo(() => {
    if (fontFamilies.some(font => font.family === value)) return value;
    const normalizedValue = FontService.normalizeFontFamily(value);
    if (fontFamilies.some(font => font.family === normalizedValue)) return normalizedValue;
    const legacyMatch = fontFamilies.find(font => font.styles.some(style => style.fullName === value));
    return legacyMatch?.family || '';
  }, [fontFamilies, value]);

  const handleFamilyChange = async (familyName: string) => {
    if (!familyName) return;
    await FontService.ensureFontLoaded(familyName);
    onChange(familyName);
  };

  return (
    <div className="font-selector">
      <div className="font-family-selector">
        <label className="font-selector-label">フォントファミリー:</label>
        <select
          value={selectedFamily}
          onChange={event => void handleFamilyChange(event.target.value)}
          disabled={disabled}
          className="font-family-select"
        >
          <option value="">フォントを選択...</option>
          {fontFamilies.map(font => (
            <option key={font.family} value={font.family}>{font.family}</option>
          ))}
        </select>
      </div>

      {selectedFamily && (
        <div className="font-preview">
          <div className="font-preview-text" style={{ fontFamily: selectedFamily }}>
            {selectedFamily} — あいうえお ABC 123
          </div>
        </div>
      )}
    </div>
  );
};

export default FontSelector;
