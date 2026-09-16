import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Engine from '../../engine/Engine';
import { KineticSceneTemplate } from '../../templates/KineticSceneTemplate';
import ParamEditor from '../ParamEditor/ParamEditor';
import TemplatePresetPanel from '../TemplatePanel/TemplatePresetPanel';
import PostEffectPanel from '../SceneSettings/PostEffectPanel';
import '../../styles/SceneSettingsTab.css';

type EditorMode = 'global' | 'selection';

interface SceneSettingsTabProps {
  engine?: Engine;
}

const FIXED_TEMPLATE_ID = 'kineticscenetemplate';
const fixedTemplate = new KineticSceneTemplate();

function normalizeTargetId(objectId: string, objectType: string): string {
  if (objectType !== 'char') return objectId;
  return objectId.replace(/_char_(?:\d+|.+)$/, '');
}

const SceneSettingsTab: React.FC<SceneSettingsTabProps> = ({ engine }) => {
  const paramConfig = useMemo(() => fixedTemplate.getParameterConfig(), []);
  const defaults = useMemo(() => Object.fromEntries(paramConfig.map(param => [param.name, param.default])), [paramConfig]);
  const [mode, setMode] = useState<EditorMode>('global');
  const [globalParams, setGlobalParams] = useState<Record<string, unknown>>(defaults);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedObjectType, setSelectedObjectType] = useState('');
  const [objectParams, setObjectParams] = useState<Record<string, unknown>>(defaults);

  const targetIds = useMemo(
    () => Array.from(new Set(selectedObjectIds.map(id => normalizeTargetId(id, selectedObjectType)))),
    [selectedObjectIds, selectedObjectType]
  );

  const syncGlobalParams = useCallback(() => {
    if (!engine) return;
    setGlobalParams({ ...defaults, ...engine.parameterManager.getGlobalDefaults() });
  }, [engine, defaults]);

  const syncObjectParams = useCallback((ids: string[]) => {
    if (!engine || ids.length === 0) return;
    setObjectParams({ ...defaults, ...engine.parameterManager.getParameters(ids[0]) });
  }, [engine, defaults]);

  useEffect(() => {
    syncGlobalParams();
  }, [syncGlobalParams]);

  useEffect(() => {
    const handleSingleSelection = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const ids = detail.objectId ? [detail.objectId] : [];
      const type = detail.objectType || '';
      const normalized = ids.map(id => normalizeTargetId(id, type));
      setSelectedObjectIds(ids);
      setSelectedObjectType(type);
      syncObjectParams(normalized);
      if (ids.length > 0) setMode('selection');
    };
    const handleMultipleSelection = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const ids = Array.isArray(detail.objectIds) ? detail.objectIds : [];
      const type = detail.objectType || '';
      const normalized = Array.from(new Set(ids.map((id: string) => normalizeTargetId(id, type))));
      setSelectedObjectIds(ids);
      setSelectedObjectType(type);
      syncObjectParams(normalized);
      if (ids.length > 0) setMode('selection');
    };
    window.addEventListener('object-selected', handleSingleSelection);
    window.addEventListener('objects-selected', handleMultipleSelection);
    return () => {
      window.removeEventListener('object-selected', handleSingleSelection);
      window.removeEventListener('objects-selected', handleMultipleSelection);
    };
  }, [syncObjectParams]);

  const applyGlobalParams = (next: Record<string, unknown>) => {
    setGlobalParams(next);
    engine?.updateGlobalParameters(next);
  };

  const applyObjectParams = (next: Record<string, unknown>) => {
    if (!engine || targetIds.length === 0) return;
    targetIds.forEach(id => engine.updateObjectParameters(id, next));
    setObjectParams(next);
  };

  const clearObjectSettings = () => {
    if (!engine || targetIds.length === 0) return;
    engine.parameterManager.clearMultipleObjectParams(targetIds);
    engine.instanceManager.updateExistingInstances(targetIds);
    engine.instanceManager.update(engine.currentTime);
    syncObjectParams(targetIds);
  };

  const selectedLabel = selectedObjectType === 'phrase'
    ? 'フレーズ'
    : selectedObjectType === 'word'
      ? '単語'
      : selectedObjectType === 'char'
        ? '文字の親単語'
        : 'オブジェクト';

  return (
    <div className="template-tab scene-settings-tab">
      <h2>シーン設定</h2>
      <p>描画方式はキネティック・シーン・コンポーザーに固定されています。</p>

      <div className="editor-mode-switch">
        <div className="switch-container">
          <button className={`mode-button ${mode === 'global' ? 'active' : ''}`} onClick={() => setMode('global')}>
            基本シーン設定
          </button>
          <button
            className={`mode-button ${mode === 'selection' ? 'active' : ''}`}
            onClick={() => setMode('selection')}
            disabled={targetIds.length === 0}
          >
            選択オブジェクト
          </button>
        </div>
      </div>

      {mode === 'global' && (
        <>
          <section className="params-section">
            <h3>基本シーン設定</h3>
            <p>個別プリセットがないオブジェクトへ継承されます。</p>
            <ParamEditor params={globalParams} paramConfig={paramConfig} onChange={applyGlobalParams} />
            <TemplatePresetPanel
              templateId={FIXED_TEMPLATE_ID}
              params={globalParams}
              paramConfig={paramConfig}
              onApply={applyGlobalParams}
            />
          </section>
          <PostEffectPanel engine={engine} />
        </>
      )}

      {mode === 'selection' && targetIds.length > 0 && (
        <section className="params-section selection-mode-background">
          <h3>{selectedLabel}のシーン設定</h3>
          <p>{targetIds.length}個へ設定を割り当てます。</p>
          {selectedObjectType === 'char' && <p>文字単位ではなく、選択文字を含む単語へ適用します。</p>}
          <button type="button" className="clear-params-button" onClick={clearObjectSettings}>
            個別設定を解除して親設定を継承
          </button>
          <ParamEditor params={objectParams} paramConfig={paramConfig} onChange={applyObjectParams} />
          <TemplatePresetPanel
            templateId={FIXED_TEMPLATE_ID}
            params={objectParams}
            paramConfig={paramConfig}
            onApply={applyObjectParams}
          />
        </section>
      )}

      {mode === 'selection' && targetIds.length === 0 && (
        <div className="no-selection-message"><p>タイムラインからフレーズまたは単語を選択してください。</p></div>
      )}
    </div>
  );
};

export default SceneSettingsTab;
