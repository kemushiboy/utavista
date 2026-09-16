import React, { useEffect, useMemo, useState } from 'react';
import { TemplatePreset, TemplatePresetService } from '../../services/TemplatePresetService';
import type { ParamConfig } from '../ParamEditor/ParamEditor';
import './TemplatePresetPanel.css';

interface TemplatePresetPanelProps {
  templateId: string;
  params: Record<string, unknown>;
  paramConfig: ParamConfig[];
  onApply: (params: Record<string, unknown>) => void;
}

const TemplatePresetPanel: React.FC<TemplatePresetPanelProps> = ({
  templateId,
  params,
  paramConfig,
  onApply
}) => {
  const [presets, setPresets] = useState<TemplatePreset[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const selectedPreset = useMemo(
    () => presets.find(preset => preset.id === selectedId),
    [presets, selectedId]
  );

  const reload = () => setPresets(TemplatePresetService.list(templateId));

  useEffect(() => {
    reload();
    setSelectedId('');
    setName('');
    setMessage('');
  }, [templateId]);

  const createSnapshot = (): Record<string, unknown> => {
    const snapshot: Record<string, unknown> = {};
    paramConfig.forEach(config => {
      snapshot[config.name] = params[config.name] !== undefined
        ? params[config.name]
        : config.default;
    });
    return snapshot;
  };

  const savePreset = (overwrite: boolean) => {
    try {
      const saved = TemplatePresetService.save(
        templateId,
        name,
        createSnapshot(),
        overwrite ? selectedId : undefined
      );
      reload();
      setSelectedId(saved.id);
      setName(saved.name);
      setMessage(overwrite ? 'プリセットを上書きしました' : '新しいプリセットを保存しました');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const applyPreset = () => {
    if (!selectedPreset) return;
    onApply({ ...params, ...selectedPreset.params });
    setMessage(`「${selectedPreset.name}」を適用しました`);
  };

  const deletePreset = () => {
    if (!selectedPreset) return;
    if (!window.confirm(`プリセット「${selectedPreset.name}」を削除しますか？`)) return;
    TemplatePresetService.delete(selectedPreset.id);
    setSelectedId('');
    setName('');
    setMessage('プリセットを削除しました');
    reload();
  };

  return (
    <div className="template-preset-panel">
      <div className="template-preset-heading">
        <h4>シーン設定プリセット</h4>
        <span>{presets.length}件</span>
      </div>
      <p>現在の設定に名前を付けて保存し、別のプロジェクトやフレーズでも再利用できます。</p>

      <label className="template-preset-label">
        保存名
        <input
          type="text"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="例: サビ用・強いスラム"
        />
      </label>

      <label className="template-preset-label">
        保存済みプリセット
        <select
          value={selectedId}
          onChange={event => {
            const nextId = event.target.value;
            const preset = presets.find(item => item.id === nextId);
            setSelectedId(nextId);
            setName(preset?.name || '');
            setMessage('');
          }}
        >
          <option value="">選択してください</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>
      </label>

      <div className="template-preset-actions">
        <button type="button" onClick={() => savePreset(false)} disabled={!name.trim()}>
          新規保存
        </button>
        <button type="button" onClick={() => savePreset(true)} disabled={!selectedPreset || !name.trim()}>
          上書き
        </button>
        <button type="button" onClick={applyPreset} disabled={!selectedPreset}>
          適用
        </button>
        <button type="button" className="danger" onClick={deletePreset} disabled={!selectedPreset}>
          削除
        </button>
      </div>

      {message && <div className="template-preset-message">{message}</div>}
    </div>
  );
};

export default TemplatePresetPanel;

