import React, { useEffect, useState } from 'react';
import '../../styles/components.css';
import Engine from '../../engine/Engine';
import { Button } from '../common';

interface ZoomControlsProps {
  zoomLevel: number;
  viewStart: number;
  viewEnd: number;
  totalDuration: number;
  maxZoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomLevels: number[];
  engine?: Engine; // Undo/Redo機能のためにEngineインスタンスを受け取る
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  viewStart,
  viewEnd,
  totalDuration,
  maxZoomLevel,
  onZoomIn,
  onZoomOut,
  zoomLevels,
  engine
}) => {
  const [, refreshHistoryState] = useState(0);

  useEffect(() => {
    const handleHistoryChange = () => refreshHistoryState(value => value + 1);
    window.addEventListener('undo-redo-state-changed', handleHistoryChange);
    return () => window.removeEventListener('undo-redo-state-changed', handleHistoryChange);
  }, []);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Undo操作
  const handleUndo = () => {
    if (engine && engine.canUndo()) {
      const success = engine.undo();
      if (success) {
      } else {
        console.error('Undo操作に失敗しました');
      }
    }
  };
  
  // Redo操作
  const handleRedo = () => {
    if (engine && engine.canRedo()) {
      const success = engine.redo();
      if (success) {
      } else {
        console.error('Redo操作に失敗しました');
      }
    }
  };

  return (
    <div className="zoom-controls-container" style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '12px',
      padding: '8px',
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      minWidth: '280px'
    }}>
      <div style={{ 
        color: '#999', 
        fontSize: '10px',
        textAlign: 'left',
        minWidth: '80px'
      }}>
        <div>表示範囲</div>
        <div>{formatTime(viewStart)} - {formatTime(viewEnd)}</div>
        <div>/ {formatTime(totalDuration)}</div>
      </div>
      
      {/* Undo/Redoボタン（補助操作のため共通の灰色ボタン） */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <Button size="small" onClick={handleUndo} disabled={!engine || !engine.canUndo()} title="元に戻す (Undo)">
          ↶ 戻す
        </Button>
        <Button size="small" onClick={handleRedo} disabled={!engine || !engine.canRedo()} title="やり直し (Redo)">
          ↷ やり直し
        </Button>
      </div>

      {/* ズームコントロールボタン */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <Button size="small" onClick={onZoomIn} disabled={zoomLevel === 0} title="より詳細に表示">
          🔍+
        </Button>
        <Button
          size="small"
          onClick={onZoomOut}
          disabled={zoomLevel === maxZoomLevel || Math.min(zoomLevels[zoomLevel + 1] || Infinity, totalDuration) <= (viewEnd - viewStart)}
          title="より広く表示"
        >
          🔍−
        </Button>
      </div>

      <div style={{ 
        color: '#666', 
        fontSize: '9px',
        textAlign: 'center',
        minWidth: '60px'
      }}>
        {Math.floor((viewEnd - viewStart) / 1000)}秒表示
      </div>
    </div>
  );
};

export default ZoomControls;
