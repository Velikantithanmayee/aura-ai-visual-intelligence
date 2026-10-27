import React from 'react';
import { Activity, Clock, Cpu, Eye, Radio } from 'lucide-react';
import type { TelemetryState, StudioMode, VisualizationTheme } from '../../types/studio';
import { THEMES } from '../../types/studio';

interface Props {
  telemetry: TelemetryState;
  mode: StudioMode;
  theme: VisualizationTheme;
  isStreaming: boolean;
}

export const StudioTelemetry: React.FC<Props> = ({
  telemetry,
  mode,
  theme,
  isStreaming
}) => {
  const currentTheme = THEMES[theme];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const modelLabel =
    mode === 'gesture'
      ? 'MediaPipe GestureRecognizer'
      : mode === 'expression'
      ? 'Hybrid: MediaPipe 3D Mesh + Face-API MobileNet CNN'
      : 'MediaPipe FaceLandmarker (468 3D Mesh)';

  return (
    <footer className="studio-telemetry-strip">
      <div className="telemetry-group">
        <div className="telemetry-pill">
          <Activity size={12} style={{ color: currentTheme.primary }} />
          <span className="telemetry-label">RATE</span>
          <strong className="telemetry-val">
            {isStreaming ? telemetry.fps : 0} <small>FPS</small>
          </strong>
        </div>

        <div className="telemetry-pill">
          <Cpu size={12} style={{ color: currentTheme.primary }} />
          <span className="telemetry-label">LATENCY</span>
          <strong className="telemetry-val">
            {isStreaming ? telemetry.latency : 0} <small>MS</small>
          </strong>
        </div>

        <div className="telemetry-pill">
          <Eye size={12} style={{ color: currentTheme.primary }} />
          <span className="telemetry-label">DETECTED</span>
          <strong className="telemetry-val">
            {isStreaming ? (telemetry.detectedCount < 10 ? `0${telemetry.detectedCount}` : telemetry.detectedCount) : '00'}
            <small> {mode === 'gesture' ? 'HANDS' : 'FACES'}</small>
          </strong>
        </div>
      </div>

      <div className="telemetry-group middle-group">
        <div className="telemetry-model-info">
          <Radio size={11} className={isStreaming ? 'pulse-icon' : ''} style={{ color: currentTheme.primary }} />
          <span className="model-name">{modelLabel}</span>
          <span className="stream-res">{isStreaming ? telemetry.streamResolution : 'STANDBY'}</span>
        </div>
      </div>

      <div className="telemetry-group right-group">
        <div className="telemetry-pill timer-pill">
          <Clock size={12} style={{ color: currentTheme.primary }} />
          <span className="telemetry-label">SESSION</span>
          <strong className="telemetry-val font-mono">{formatDuration(telemetry.sessionDuration)}</strong>
        </div>

        <div className="telemetry-security-tag">
          <span className="sec-dot" style={{ background: currentTheme.primary, boxShadow: `0 0 8px ${currentTheme.primary}` }} />
          <span>ON-DEVICE ACCELERATION</span>
        </div>
      </div>
    </footer>
  );
};
