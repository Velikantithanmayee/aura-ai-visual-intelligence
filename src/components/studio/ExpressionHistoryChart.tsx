import React, { useMemo } from 'react';
import type { HistoryPoint, VisualizationTheme } from '../../types/studio';
import { THEMES } from '../../types/studio';

interface Props {
  history: HistoryPoint[];
  theme: VisualizationTheme;
}

export const ExpressionHistoryChart: React.FC<Props> = ({ history, theme }) => {
  const currentTheme = THEMES[theme] || THEMES.cyan;
  const width = 280;
  const height = 90;
  const paddingX = 14;
  const paddingY = 12;

  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  const pointsData = useMemo(() => {
    if (!history.length) return { path: '', area: '', lastPoint: null };

    const minPoints = 12;
    const effectiveHistory =
      history.length < minPoints
        ? Array.from({ length: minPoints - history.length }, () => ({
            timestamp: 0,
            score: 0,
            label: 'Idle'
          })).concat(history)
        : history;

    const len = effectiveHistory.length;
    const coords = effectiveHistory.map((pt, i) => {
      const x = paddingX + (i / (len - 1)) * innerW;
      const clampedScore = Math.max(0, Math.min(1, pt.score));
      const y = paddingY + innerH - clampedScore * innerH;
      return { x, y, score: pt.score, label: pt.label };
    });

    // Build SVG path with smooth bezier curves
    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      path += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const area = `${path} L ${last.x.toFixed(1)} ${(paddingY + innerH).toFixed(1)} L ${first.x.toFixed(1)} ${(paddingY + innerH).toFixed(1)} Z`;

    return { path, area, lastPoint: last };
  }, [history, innerW, innerH, paddingX, paddingY]);

  const latestScore = history.length ? Math.round(history[history.length - 1].score * 100) : 0;

  return (
    <div className="expression-chart-wrapper">
      <div className="chart-header">
        <span className="chart-title">SIGNAL DYNAMICS (LAST 40 FRAMES)</span>
        <span className="chart-score" style={{ color: currentTheme.primary }}>
          {latestScore}%
        </span>
      </div>

      <div className="chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="expression-svg-chart"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`chart-gradient-${theme}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentTheme.primary} stopOpacity="0.28" />
              <stop offset="90%" stopColor={currentTheme.primary} stopOpacity="0.0" />
            </linearGradient>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(0, 0, 0, 0.06)"
            strokeDasharray="2 3"
          />
          <line
            x1={paddingX}
            y1={paddingY + innerH * 0.5}
            x2={width - paddingX}
            y2={paddingY + innerH * 0.5}
            stroke="rgba(0, 0, 0, 0.06)"
            strokeDasharray="2 3"
          />
          <line
            x1={paddingX}
            y1={paddingY + innerH}
            x2={width - paddingX}
            y2={paddingY + innerH}
            stroke="rgba(0, 0, 0, 0.1)"
          />

          {/* Area fill */}
          {pointsData.area && (
            <path d={pointsData.area} fill={`url(#chart-gradient-${theme})`} />
          )}

          {/* Line curve */}
          {pointsData.path && (
            <path
              d={pointsData.path}
              fill="none"
              stroke={currentTheme.primary}
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#neon-glow)"
            />
          )}

          {/* Head tracking beacon */}
          {pointsData.lastPoint && (
            <g>
              <circle
                cx={pointsData.lastPoint.x}
                cy={pointsData.lastPoint.y}
                r="4.5"
                fill={currentTheme.primary}
                filter="url(#neon-glow)"
              />
              <circle
                cx={pointsData.lastPoint.x}
                cy={pointsData.lastPoint.y}
                r="7"
                fill="none"
                stroke={currentTheme.primary}
                strokeWidth="1"
                opacity="0.5"
              />
            </g>
          )}
        </svg>

        {!history.length && (
          <div className="chart-empty-hint">Awaiting face frames for timeline telemetry...</div>
        )}
      </div>

      <div className="chart-footer">
        <span>-40 FRAMES</span>
        <span>EQUILIBRIUM (0.0)</span>
        <span>CURRENT SIGNAL</span>
      </div>
    </div>
  );
};
