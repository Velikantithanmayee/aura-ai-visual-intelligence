import React, { useState } from 'react';
import {
  ScanFace,
  Sparkles,
  Hand,
  RotateCcw,
  Info,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Play,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  Zap
} from 'lucide-react';
import type {
  StudioMode,
  ExpressionAnalysisResult,
  HistoryPoint,
  TrackingEvent,
  VisualizationTheme,
  BasicExpressionName
} from '../../types/studio';
import { THEMES } from '../../types/studio';
import { ExpressionHistoryChart } from './ExpressionHistoryChart';
import { runModelEvaluation, type EvaluationReport } from '../../utils/evaluationSuite';

interface Props {
  mode: StudioMode;
  expressionResult: ExpressionAnalysisResult;
  history: HistoryPoint[];
  events: TrackingEvent[];
  theme: VisualizationTheme;
  isStreaming: boolean;
  gestureDetection: { label: string; confidence: number } | null;
  faceCount: number;
  onResetSession: () => void;
}

export const StudioIntelligencePanel: React.FC<Props> = ({
  mode,
  expressionResult,
  history,
  events,
  theme,
  isStreaming,
  gestureDetection,
  faceCount,
  onResetSession
}) => {
  const currentTheme = THEMES[theme];
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalProgress, setEvalProgress] = useState({ completed: 0, total: 0 });
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [activeDiagTab, setActiveDiagTab] = useState<'blendshapes' | 'timeline' | 'benchmark'>('blendshapes');
  const [showAllBlendshapes, setShowAllBlendshapes] = useState(false);

  const handleRunEvaluation = async () => {
    setEvalLoading(true);
    setEvalProgress({ completed: 0, total: 10 });
    try {
      const report = await runModelEvaluation(undefined, (completed, total) => {
        setEvalProgress({ completed, total });
      });
      setEvalReport(report);
    } catch (err) {
      console.error('Benchmark error:', err);
    } finally {
      setEvalLoading(false);
    }
  };

  return (
    <aside className="studio-intel-v2">
      <div className="intel-header">
        <div className="intel-title">
          <span className="intel-tag">LIVE INTELLIGENCE</span>
          <h3>{mode === 'expression' ? 'Facial Expression Analysis' : mode === 'face' ? 'Geometric Mesh Telemetry' : 'Gesture Classification'}</h3>
        </div>
        <button
          type="button"
          className="reset-btn"
          onClick={onResetSession}
          title="Reset telemetry & history"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="intel-scroll-body">
        {/* =========================================
            MODE 1: EXPRESSION ANALYSIS
           ========================================= */}
        {mode === 'expression' && (
          <div className="intel-section-group">
            {/* Primary Hero Expression Card */}
            <div className="expression-hero-card" style={{ borderColor: currentTheme.border }}>
              <div className="hero-card-glow" style={{ background: currentTheme.bgGlow }} />

              <div className="hero-top-row">
                <span className="hero-emoji" role="img" aria-label="Expression Icon">
                  {isStreaming && expressionResult.faceDetected ? expressionResult.emoji : '👤'}
                </span>
                <div className="hero-status-tag">
                  {!isStreaming ? (
                    <span className="tag-pill standby">STANDBY</span>
                  ) : !expressionResult.faceDetected ? (
                    <span className="tag-pill warning">
                      <AlertTriangle size={11} /> NO FACE
                    </span>
                  ) : expressionResult.isUncertain ? (
                    <span className="tag-pill subtle">SUBTLE</span>
                  ) : (
                    <span className="tag-pill success" style={{ color: currentTheme.primary }}>
                      <CheckCircle2 size={11} /> CONFIDENT
                    </span>
                  )}
                </div>
              </div>

              <div className="hero-meta">
                <h4 className="expression-name">
                  {isStreaming
                    ? expressionResult.faceDetected
                      ? expressionResult.label
                      : 'Awaiting Face in View...'
                    : 'Camera Inactive'}
                </h4>
                <p className="expression-desc">
                  {isStreaming
                    ? expressionResult.faceDetected
                      ? expressionResult.description
                      : 'Position your face within the camera frame to initiate real-time blendshape analysis.'
                    : 'Start the live camera to begin analyzing 52 geometric expression blendshapes.'}
                </p>
              </div>

              {/* Primary Signal Strength Bar */}
              <div className="primary-signal-row">
                <div className="signal-header">
                  <span>SIGNAL INTENSITY</span>
                  <strong style={{ color: currentTheme.primary }}>
                    {isStreaming && expressionResult.faceDetected
                      ? Math.round(expressionResult.confidence * 100)
                      : 0}
                    %
                  </strong>
                </div>
                <div className="meter-track">
                  <div
                    className="meter-bar"
                    style={{
                      width: `${isStreaming && expressionResult.faceDetected ? Math.round(expressionResult.confidence * 100) : 0}%`,
                      background: currentTheme.primary,
                      boxShadow: `0 0 10px ${currentTheme.glow}`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Real-Time Face Alignment & Quality Guidance */}
            <div className="intel-subcard">
              <div className="subcard-title">
                <ScanFace size={12} style={{ color: currentTheme.primary }} />
                <span>FACE ROI & ALIGNMENT GUIDANCE</span>
              </div>
              <div className="quality-content">
                <div className="quality-row">
                  <span className="quality-label">ROI Bounding Box</span>
                  <span className="quality-val" style={{ color: currentTheme.primary }}>
                    {isStreaming && expressionResult.faceDetected && expressionResult.quality.faceWidth > 0
                      ? `${expressionResult.quality.faceWidth} × ${expressionResult.quality.faceHeight} px`
                      : 'Standby'}
                  </span>
                </div>
                <div className="quality-row">
                  <span className="quality-label">Crop Quality</span>
                  <span
                    className="quality-val"
                    style={{
                      color: !isStreaming || !expressionResult.faceDetected
                        ? '#888'
                        : expressionResult.quality.isTooSmall || expressionResult.quality.isOffCenter
                        ? '#ffb86c'
                        : currentTheme.primary
                    }}
                  >
                    {!isStreaming || !expressionResult.faceDetected
                      ? 'No Face in Frame'
                      : expressionResult.quality.isTooSmall
                      ? 'Too Small / Too Far'
                      : expressionResult.quality.isOffCenter
                      ? 'Off-Center'
                      : 'Optimal (112×112 ROI)'}
                  </span>
                </div>
                <p className="quality-guidance-text">
                  {isStreaming && expressionResult.faceDetected
                    ? expressionResult.quality.guidance
                    : 'Position your face within the camera frame for real-time neural classification.'}
                </p>
              </div>
            </div>

            {/* ========================================================
                SECTION A: GROUP A — 8 BASIC EXPRESSION CLASSIFIER
                ======================================================== */}
            <div className="intel-subcard">
              <div className="subcard-title">
                <Sparkles size={12} style={{ color: currentTheme.primary }} />
                <span>GROUP A — 8 BASIC EXPRESSIONS</span>
              </div>

              <div className="signal-meters-list">
                {[
                  { name: 'Happy', emoji: '😊', score: expressionResult.smoothedScores.happy, raw: expressionResult.rawScores.happy, key: 'happy' },
                  { name: 'Neutral', emoji: '😐', score: expressionResult.smoothedScores.neutral, raw: expressionResult.rawScores.neutral, key: 'neutral' },
                  { name: 'Surprised', emoji: '😲', score: expressionResult.smoothedScores.surprised, raw: expressionResult.rawScores.surprised, key: 'surprised' },
                  { name: 'Sad', emoji: '😢', score: expressionResult.smoothedScores.sad, raw: expressionResult.rawScores.sad, key: 'sad' },
                  { name: 'Angry', emoji: '😠', score: expressionResult.smoothedScores.angry, raw: expressionResult.rawScores.angry, key: 'angry' },
                  { name: 'Fearful', emoji: '😨', score: expressionResult.smoothedScores.fearful, raw: expressionResult.rawScores.fearful, key: 'fearful' },
                  { name: 'Disgusted', emoji: '🤢', score: expressionResult.smoothedScores.disgusted, raw: expressionResult.rawScores.disgusted, key: 'disgusted' },
                  { name: 'Contempt', emoji: '😏', score: expressionResult.smoothedScores.contempt, raw: expressionResult.rawScores.contempt, key: 'contempt' }
                ].map(item => {
                  const pct = isStreaming && expressionResult.faceDetected ? Math.round(item.score * 100) : 0;
                  const rawPct = isStreaming && expressionResult.faceDetected ? Math.round(item.raw * 100) : 0;
                  const isDominant = expressionResult.category === item.key;
                  return (
                    <div key={item.name} className="meter-row">
                      <div className="meter-info">
                        <span className="meter-name" style={{ color: isDominant ? '#fff' : undefined }}>
                          <span style={{ marginRight: '6px' }}>{item.emoji}</span>
                          {item.name}
                        </span>
                        <div className="meter-vals-dual">
                          <span className="meter-raw-val" title="Unsmoothed Raw Model Output">
                            raw:{rawPct}%
                          </span>
                          <span
                            className="meter-val"
                            style={{ color: isDominant ? currentTheme.primary : undefined }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="meter-track-mini">
                        <div
                          className="meter-bar-mini"
                          style={{
                            width: `${pct}%`,
                            background: isDominant
                              ? currentTheme.primary
                              : pct > 20
                              ? 'rgba(255, 255, 255, 0.45)'
                              : 'rgba(255, 255, 255, 0.15)',
                            boxShadow: isDominant ? `0 0 8px ${currentTheme.glow}` : 'none'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                SECTION B: GROUP B — COMPOUND EXPRESSION CLASSIFIER
                ======================================================== */}
            <div className="intel-subcard compound-subcard">
              <div className="subcard-title">
                <Layers size={12} style={{ color: currentTheme.primary }} />
                <span>GROUP B — COMPOUND EXPRESSION ANALYSIS</span>
              </div>
              <div className="compound-body">
                {expressionResult.compound && expressionResult.compound.category !== 'none' ? (
                  <div className="compound-card-active">
                    <div className="compound-header-row">
                      <strong className="compound-title" style={{ color: currentTheme.primary }}>
                        {expressionResult.compound.label}
                      </strong>
                      <span
                        className={`compound-status-tag ${expressionResult.compound.supportLevel}`}
                        title={
                          expressionResult.compound.isExperimental
                            ? 'Limited empirical training data (<50 samples). Experimental status.'
                            : 'Validated against empirical multi-annotator distributions.'
                        }
                      >
                        {expressionResult.compound.isExperimental ? 'EXPERIMENTAL' : 'VALIDATED'}
                      </span>
                    </div>
                    <p className="compound-desc">{expressionResult.compound.description}</p>
                    <div className="compound-metric-bar">
                      <div className="compound-meta-text">
                        <span>JOINT PROBABILITY: {Math.round(expressionResult.compound.confidence * 100)}%</span>
                        <span className="compound-components">
                          {expressionResult.compound.components.join(' + ')}
                        </span>
                      </div>
                      <div className="meter-track-mini">
                        <div
                          className="meter-bar-mini"
                          style={{
                            width: `${Math.round(expressionResult.compound.confidence * 100)}%`,
                            background: currentTheme.primary,
                            boxShadow: `0 0 10px ${currentTheme.glow}`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="compound-card-idle">
                    <span className="idle-label">No Compound State Active</span>
                    <p className="idle-desc">
                      {isStreaming && expressionResult.faceDetected
                        ? 'Facial activations reflect a single dominant basic expression or equilibrium.'
                        : 'Awaiting facial stream to evaluate co-occurring compound facial movements.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================
                SECTION C: GROUP C — 17 OBSERVABLE FACIAL MOVEMENTS
                ======================================================== */}
            <div className="intel-subcard movements-subcard">
              <div className="subcard-title">
                <Activity size={12} style={{ color: currentTheme.primary }} />
                <span>GROUP C — OBSERVABLE FACIAL MOVEMENTS ({expressionResult.activeMovementsCount} ACTIVE)</span>
              </div>
              <p className="movements-disclaimer-copy">
                FACS muscle displacements evaluated from 52 blendshapes. Completely decoupled from emotion classifications.
              </p>
              <div className="movement-tags-grid">
                {expressionResult.movements.map(m => {
                  const pct = Math.round(m.intensity * 100);
                  return (
                    <div
                      key={m.id}
                      className={`movement-chip ${m.isActive ? 'active' : ''}`}
                      style={
                        m.isActive
                          ? {
                              borderColor: currentTheme.border,
                              background: currentTheme.bgGlow,
                              color: '#fff'
                            }
                          : {}
                      }
                      title={`Active: ${m.isActive ? 'Yes' : 'No'} | Threshold: ${Math.round(m.threshold * 100)}% | Sources: ${m.sourceBlendshapes.join(', ')}`}
                    >
                      <div className="chip-header">
                        <span className="chip-name">{m.label}</span>
                        <span
                          className="chip-pct"
                          style={{ color: m.isActive ? currentTheme.primary : undefined }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="chip-mini-meter">
                        <div
                          className="chip-meter-fill"
                          style={{
                            width: `${pct}%`,
                            background: m.isActive ? currentTheme.primary : 'rgba(255, 255, 255, 0.2)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                SECTION D: EXPANDABLE ADVANCED DIAGNOSTICS & TELEMETRY
                ======================================================== */}
            <div className="intel-subcard diagnostics-accordion-card">
              <button
                type="button"
                className="drawer-toggle-btn diagnostics-head-btn"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
              >
                <div className="subcard-title">
                  <Zap size={12} style={{ color: currentTheme.primary }} />
                  <span>ADVANCED TELEMETRY & DIAGNOSTICS</span>
                </div>
                <div className="diagnostics-toggle-badge">
                  <span>{showDiagnostics ? 'COLLAPSE' : 'EXPAND'}</span>
                  {showDiagnostics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </button>

              {showDiagnostics && (
                <div className="diagnostics-drawer-body">
                  {/* Internal Subtabs */}
                  <div className="diag-tabs-strip">
                    <button
                      type="button"
                      className={`diag-tab-btn ${activeDiagTab === 'blendshapes' ? 'active' : ''}`}
                      onClick={() => setActiveDiagTab('blendshapes')}
                      style={activeDiagTab === 'blendshapes' ? { color: currentTheme.primary, borderColor: currentTheme.primary } : {}}
                    >
                      52 Blendshapes
                    </button>
                    <button
                      type="button"
                      className={`diag-tab-btn ${activeDiagTab === 'timeline' ? 'active' : ''}`}
                      onClick={() => setActiveDiagTab('timeline')}
                      style={activeDiagTab === 'timeline' ? { color: currentTheme.primary, borderColor: currentTheme.primary } : {}}
                    >
                      Signal Timeline
                    </button>
                    <button
                      type="button"
                      className={`diag-tab-btn ${activeDiagTab === 'benchmark' ? 'active' : ''}`}
                      onClick={() => setActiveDiagTab('benchmark')}
                      style={activeDiagTab === 'benchmark' ? { color: currentTheme.primary, borderColor: currentTheme.primary } : {}}
                    >
                      FER Benchmark
                    </button>
                  </div>

                  {/* Subtab 1: 52 Blendshapes */}
                  {activeDiagTab === 'blendshapes' && (
                    <div className="diag-tab-content">
                      <div className="diag-tab-hint">
                        <span>FACS COEFFICIENTS (0.00 – 1.00) FROM MEDIAPIPE FACE LANDMARKER</span>
                      </div>
                      <div className="blendshapes-52-grid">
                        {Object.entries(expressionResult.allBlendshapes || {}).map(([key, val]) => {
                          const pct = Math.round(val * 100);
                          return (
                            <div key={key} className="blendshape-52-item">
                              <span className="bs-name" title={key}>{key}</span>
                              <div className="bs-bar-wrap">
                                <div
                                  className="bs-bar-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background: pct > 25 ? currentTheme.primary : 'rgba(255, 255, 255, 0.25)'
                                  }}
                                />
                              </div>
                              <span className="bs-val">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Subtab 2: Timeline */}
                  {activeDiagTab === 'timeline' && (
                    <div className="diag-tab-content">
                      <ExpressionHistoryChart history={history} theme={theme} />
                    </div>
                  )}

                  {/* Subtab 3: Benchmark */}
                  {activeDiagTab === 'benchmark' && (
                    <div className="diag-tab-content">
                      <div className="scientific-disclaimer">
                        <ShieldAlert size={14} className="disclaimer-icon" />
                        <div className="disclaimer-text">
                          <strong>SCIENTIFIC TRANSPARENCY & ETHICS</strong>
                          <p>
                            AURA AI classifies observable outward facial patterns using an on-device MLP trained on FERPlus consensus labels. It estimates observable outward facial patterns and does not diagnose authentic internal emotional truth.
                          </p>
                        </div>
                      </div>

                      <div className="eval-controls-row">
                        <button
                          type="button"
                          className="button-primary eval-run-btn"
                          onClick={handleRunEvaluation}
                          disabled={evalLoading}
                          style={{
                            background: evalReport ? 'rgba(255,255,255,0.04)' : undefined,
                            borderColor: currentTheme.border,
                            color: '#fff'
                          }}
                        >
                          {evalLoading ? (
                            <>
                              <span className="spinner" style={{ width: 10, height: 10 }} /> Running Benchmark ({evalProgress.completed}/{evalProgress.total})...
                            </>
                          ) : (
                            <>
                              <Play size={10} style={{ color: currentTheme.primary }} /> {evalReport ? 'Re-Run Evaluation' : 'Run Empirical FER Evaluation'}
                            </>
                          )}
                        </button>
                      </div>

                      {evalReport && (
                        <div className="eval-report-card">
                          <div className="eval-metrics-row">
                            <div className="eval-stat">
                              <span className="eval-stat-label">ACCURACY</span>
                              <strong className="eval-stat-val" style={{ color: currentTheme.primary }}>
                                {Math.round(evalReport.overallAccuracy * 100)}%
                              </strong>
                            </div>
                            <div className="eval-stat">
                              <span className="eval-stat-label">MACRO F1</span>
                              <strong className="eval-stat-val">
                                {evalReport.macroF1.toFixed(2)}
                              </strong>
                            </div>
                            <div className="eval-stat">
                              <span className="eval-stat-label">AVG LATENCY</span>
                              <strong className="eval-stat-val">
                                {evalReport.averageLatencyMs}ms
                              </strong>
                            </div>
                          </div>

                          {/* Precision & Recall per class */}
                          <div className="eval-class-table">
                            <div className="eval-table-head">
                              <span>CLASS</span>
                              <span>PRECISION</span>
                              <span>RECALL</span>
                              <span>F1</span>
                            </div>
                            {evalReport.classMetrics.map(m => (
                              <div key={m.category} className="eval-table-row">
                                <span className="class-name">{m.category}</span>
                                <span>{Math.round(m.precision * 100)}%</span>
                                <span>{Math.round(m.recall * 100)}%</span>
                                <span style={{ color: currentTheme.primary }}>{m.f1Score.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Confusion Matrix Mini-Grid */}
                          <div className="confusion-matrix-wrapper">
                            <span className="matrix-title">CONFUSION MATRIX (TRUTH → PREDICTED)</span>
                            <div className="matrix-grid">
                              <div className="matrix-header-cell" />
                              {evalReport.confusionMatrix.categories.map(c => (
                                <div key={`col-${c}`} className="matrix-header-cell" title={c}>
                                  {c.slice(0, 3)}
                                </div>
                              ))}
                              {evalReport.confusionMatrix.categories.map((rowCat, rIdx) => (
                                <React.Fragment key={`row-${rowCat}`}>
                                  <div className="matrix-row-label" title={rowCat}>
                                    {rowCat.slice(0, 3)}
                                  </div>
                                  {evalReport.confusionMatrix.matrix[rIdx].map((cnt, cIdx) => (
                                    <div
                                      key={`cell-${rIdx}-${cIdx}`}
                                      className={`matrix-cell ${rIdx === cIdx && cnt > 0 ? 'diagonal' : cnt > 0 ? 'error-cell' : 'zero'}`}
                                      style={rIdx === cIdx && cnt > 0 ? { background: currentTheme.glow, color: currentTheme.primary } : {}}
                                    >
                                      {cnt}
                                    </div>
                                  ))}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>

                          <div className="eval-limitations">
                            <span className="limit-title">VALIDATION BOUNDS & LIMITATIONS:</span>
                            <ul>
                              {evalReport.limitations.map((lim, lIdx) => (
                                <li key={lIdx}>{lim}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            MODE 2: FACE LANDMARKS
           ========================================= */}
        {mode === 'face' && (
          <div className="intel-section-group">
            <div className="expression-hero-card" style={{ borderColor: currentTheme.border }}>
              <div className="hero-card-glow" style={{ background: currentTheme.bgGlow }} />
              <div className="hero-top-row">
                <ScanFace size={34} style={{ color: currentTheme.primary }} />
                <span className="tag-pill success" style={{ color: currentTheme.primary }}>
                  {faceCount} FACE{faceCount !== 1 ? 'S' : ''} DETECTED
                </span>
              </div>
              <div className="hero-meta">
                <h4 className="expression-name">{faceCount > 0 ? 'High-Density 3D Mesh' : 'Searching for Face...'}</h4>
                <p className="expression-desc">
                  {faceCount > 0
                    ? '468 normalized 3D vertices tracked in real-time, mapping facial contours, eye sockets, and lips.'
                    : 'Bring your face into view. Camera stream is actively evaluating WebAssembly frames.'}
                </p>
              </div>
            </div>

            <div className="intel-subcard">
              <div className="subcard-title">
                <Info size={12} style={{ color: currentTheme.primary }} />
                <span>GEOMETRIC MESH SPECIFICATIONS</span>
              </div>
              <div className="spec-grid">
                <div className="spec-item">
                  <span className="spec-label">VERTEX DENSITY</span>
                  <strong className="spec-val">468 PTS</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">COORDINATE SPACE</span>
                  <strong className="spec-val">NORMALIZED 3D</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">CANVAS OVERLAY</span>
                  <strong className="spec-val">1:1 ASPECT FIT</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">COLOR PALETTE</span>
                  <strong className="spec-val" style={{ color: currentTheme.primary }}>{currentTheme.name}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            MODE 3: HAND GESTURES
           ========================================= */}
        {mode === 'gesture' && (
          <div className="intel-section-group">
            <div className="expression-hero-card" style={{ borderColor: currentTheme.border }}>
              <div className="hero-card-glow" style={{ background: currentTheme.bgGlow }} />
              <div className="hero-top-row">
                <Hand size={34} style={{ color: currentTheme.primary }} />
                <span className="tag-pill success" style={{ color: currentTheme.primary }}>
                  {gestureDetection ? `${Math.round(gestureDetection.confidence * 100)}% MATCH` : 'SEARCHING'}
                </span>
              </div>
              <div className="hero-meta">
                <h4 className="expression-name">{gestureDetection?.label ?? 'Awaiting Hand in View...'}</h4>
                <p className="expression-desc">
                  {gestureDetection
                    ? 'Hand landmark skeletal graph with 21 articulation points successfully classified.'
                    : 'Show an open palm, thumbs up, victory sign, or closed fist to trigger classification.'}
                </p>
              </div>
            </div>

            <div className="intel-subcard">
              <div className="subcard-title">
                <Info size={12} style={{ color: currentTheme.primary }} />
                <span>SUPPORTED CLASSIFICATIONS</span>
              </div>
              <div className="gesture-capsule-list">
                {['Thumb Up', 'Thumb Down', 'Victory (V)', 'Open Palm', 'Closed Fist', 'Pointing Up', 'Love (ILU)'].map(g => (
                  <span
                    key={g}
                    className={`gesture-capsule ${gestureDetection?.label.toLowerCase().includes(g.split(' ')[0].toLowerCase()) ? 'active' : ''}`}
                    style={
                      gestureDetection?.label.toLowerCase().includes(g.split(' ')[0].toLowerCase())
                        ? { borderColor: currentTheme.primary, color: currentTheme.primary }
                        : {}
                    }
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Session Events */}
        <div className="intel-subcard">
          <div className="subcard-title">
            <span className="status-dot" style={{ background: currentTheme.primary }} />
            <span>SESSION TELEMETRY LOG</span>
          </div>
          <div className="events-stream">
            {events.length ? (
              events.map(ev => (
                <div key={ev.id} className="stream-event-item">
                  <div className="event-bullet" style={{ background: currentTheme.primary }} />
                  <div className="event-body">
                    <span className="event-msg">{ev.message}</span>
                    <span className="event-time">{ev.timestamp}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="stream-empty">Session events will stream here...</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
