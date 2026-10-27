import React from 'react';
import {
  ScanFace,
  Sparkles,
  Hand,
  ShieldCheck,
  Eye,
  Box,
  Zap,
  Palette
} from 'lucide-react';
import type {
  StudioMode,
  VisionState,
  StudioSettings,
  VisualizationTheme
} from '../../types/studio';
import { THEMES } from '../../types/studio';

interface Props {
  mode: StudioMode;
  onModeChange: (next: StudioMode) => void;
  status: VisionState;
  settings: StudioSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<StudioSettings>>;
}

export const StudioSidebar: React.FC<Props> = ({
  mode,
  onModeChange,
  status,
  settings,
  onSettingsChange
}) => {
  const currentTheme = THEMES[settings.theme];

  const handleToggle = (key: keyof Omit<StudioSettings, 'theme'>) => {
    onSettingsChange(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleThemeChange = (theme: VisualizationTheme) => {
    onSettingsChange(prev => ({ ...prev, theme }));
  };

  return (
    <aside className="studio-sidebar-v2">
      {/* Modes Navigation */}
      <div className="sidebar-section">
        <div className="section-eyebrow">
          <span>01 / VISION MODEL</span>
          <span className="eyebrow-accent" style={{ color: currentTheme.primary }}>
            {mode.toUpperCase()}
          </span>
        </div>

        <div className="mode-options-group">
          <button
            type="button"
            className={`mode-card-v2 ${mode === 'face' ? 'active' : ''}`}
            onClick={() => onModeChange('face')}
            style={
              mode === 'face'
                ? {
                    borderColor: currentTheme.primary,
                    boxShadow: `0 0 20px ${currentTheme.glow}`
                  }
                : {}
            }
          >
            <div className="mode-icon-wrap" style={{ color: mode === 'face' ? currentTheme.primary : undefined }}>
              <ScanFace size={18} />
            </div>
            <div className="mode-text">
              <span className="mode-name">Face Landmarks</span>
              <span className="mode-sub">468-point 3D geometric mesh</span>
            </div>
            <div className="mode-indicator" />
          </button>

          <button
            type="button"
            className={`mode-card-v2 ${mode === 'expression' ? 'active' : ''}`}
            onClick={() => onModeChange('expression')}
            style={
              mode === 'expression'
                ? {
                    borderColor: currentTheme.primary,
                    boxShadow: `0 0 20px ${currentTheme.glow}`
                  }
                : {}
            }
          >
            <div className="mode-icon-wrap" style={{ color: mode === 'expression' ? currentTheme.primary : undefined }}>
              <Sparkles size={18} />
            </div>
            <div className="mode-text">
              <span className="mode-name">Expression Analysis</span>
              <span className="mode-sub">Real-time facial blendshape cues</span>
            </div>
            <div className="mode-indicator" />
          </button>

          <button
            type="button"
            className={`mode-card-v2 ${mode === 'gesture' ? 'active' : ''}`}
            onClick={() => onModeChange('gesture')}
            style={
              mode === 'gesture'
                ? {
                    borderColor: currentTheme.primary,
                    boxShadow: `0 0 20px ${currentTheme.glow}`
                  }
                : {}
            }
          >
            <div className="mode-icon-wrap" style={{ color: mode === 'gesture' ? currentTheme.primary : undefined }}>
              <Hand size={18} />
            </div>
            <div className="mode-text">
              <span className="mode-name">Hand Gestures</span>
              <span className="mode-sub">21-keypoint skeletal tracking</span>
            </div>
            <div className="mode-indicator" />
          </button>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Overlays & Visualization Controls */}
      <div className="sidebar-section">
        <div className="section-eyebrow">
          <span>02 / OVERLAY CONTROLS</span>
        </div>

        <div className="toggle-list">
          <button
            type="button"
            className="hud-toggle-row"
            onClick={() => handleToggle('showMesh')}
          >
            <div className="toggle-label">
              <Eye size={14} />
              <span>Landmark Mesh</span>
            </div>
            <div className={`hud-switch ${settings.showMesh ? 'on' : ''}`} style={settings.showMesh ? { background: currentTheme.primary } : {}}>
              <div className="switch-thumb" />
            </div>
          </button>

          <button
            type="button"
            className="hud-toggle-row"
            onClick={() => handleToggle('showBoundingBox')}
          >
            <div className="toggle-label">
              <Box size={14} />
              <span>Bounding Frame</span>
            </div>
            <div className={`hud-switch ${settings.showBoundingBox ? 'on' : ''}`} style={settings.showBoundingBox ? { background: currentTheme.primary } : {}}>
              <div className="switch-thumb" />
            </div>
          </button>

          <button
            type="button"
            className="hud-toggle-row"
            onClick={() => handleToggle('showParticles')}
          >
            <div className="toggle-label">
              <Zap size={14} />
              <span>Feature Glow Nodes</span>
            </div>
            <div className={`hud-switch ${settings.showParticles ? 'on' : ''}`} style={settings.showParticles ? { background: currentTheme.primary } : {}}>
              <div className="switch-thumb" />
            </div>
          </button>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Theme Picker */}
      <div className="sidebar-section">
        <div className="section-eyebrow">
          <Palette size={11} />
          <span>HUD CHROMATIC THEME</span>
        </div>

        <div className="theme-swatch-row">
          {(Object.keys(THEMES) as VisualizationTheme[]).map(key => {
            const t = THEMES[key];
            const isSelected = settings.theme === key;
            return (
              <button
                key={key}
                type="button"
                className={`theme-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => handleThemeChange(key)}
                title={t.name}
              >
                <span className="chip-dot" style={{ background: t.primary, boxShadow: isSelected ? `0 0 10px ${t.primary}` : 'none' }} />
                <span className="chip-label">{t.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy Footer */}
      <div className="sidebar-privacy-foot">
        <div className="privacy-badge">
          <ShieldCheck size={16} className="privacy-icon" />
          <div className="privacy-copy">
            <strong>CLIENT-SIDE ISOLATION</strong>
            <p>Frames stream directly to your WebAssembly runtime. No network transmission occurs.</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
