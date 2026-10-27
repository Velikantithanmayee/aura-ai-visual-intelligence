import React, { useEffect, useRef } from 'react';
import { Camera, Sparkles, AlertCircle, X, ScanFace, Play, Square, RotateCcw } from 'lucide-react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type {
  StudioMode,
  VisionState,
  StudioSettings,
  VisualizationTheme
} from '../../types/studio';
import { THEMES } from '../../types/studio';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: NormalizedLandmark[][];
  mode: StudioMode;
  status: VisionState;
  error: string;
  cameraReady: boolean;
  settings: StudioSettings;
  activeDetectionLabel: string | null;
  activeDetectionConfidence: number;
  onStart: () => void;
  onStop: () => void;
  onErrorDismiss: () => void;
}

export const StudioCameraViewport: React.FC<Props> = ({
  videoRef,
  landmarks,
  mode,
  status,
  error,
  cameraReady,
  settings,
  activeDetectionLabel,
  activeDetectionConfidence,
  onStart,
  onStop,
  onErrorDismiss
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentTheme = THEMES[settings.theme];

  // Smooth animated corner frame states for faces and hands
  const smoothedFramesRef = useRef<Map<number, { x: number; y: number; w: number; h: number; opacity: number }>>(new Map());

  // Render Precision Overlay on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!cameraReady) {
      smoothedFramesRef.current.clear();
      return;
    }

    ctx.save();
    // Mirror horizontally to match mirrored user webcam
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    const strokeColor = currentTheme.primary;
    const isGesture = mode === 'gesture';
    const activeMap = smoothedFramesRef.current;

    // Avoid drawing multiple competing frames around the same face by tracking the primary face in face modes
    const activeSets = isGesture ? landmarks.slice(0, 2) : landmarks.slice(0, 1);

    // 1. Calculate actual bounding areas from real landmarks with clean proportional padding
    const currentTargets = activeSets.map((set, idx) => {
      const xs = set.map(p => p.x * width);
      const ys = set.map(p => p.y * height);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const boxW = maxX - minX;
      const boxH = maxY - minY;

      // Sensible padding: 18% width and 22% height so the corner brackets comfortably surround the head
      // rather than touching eyes, nose, or lips
      const padX = isGesture ? 16 : boxW * 0.18;
      const padY = isGesture ? 16 : boxH * 0.22;

      return {
        idx,
        x: Math.max(0, minX - padX),
        y: Math.max(0, minY - padY),
        w: Math.min(width, boxW + padX * 2),
        h: Math.min(height, boxH + padY * 2)
      };
    });

    // 2. Anti-jitter temporal smoothing (EMA alpha = 0.24 for smooth tracking without perceptible lag)
    currentTargets.forEach(target => {
      const existing = activeMap.get(target.idx);
      if (!existing) {
        // Entrance: start at target position with gentle initial opacity for smooth fade-in
        activeMap.set(target.idx, {
          x: target.x,
          y: target.y,
          w: target.w,
          h: target.h,
          opacity: 0.05
        });
      } else {
        existing.x += (target.x - existing.x) * 0.24;
        existing.y += (target.y - existing.y) * 0.24;
        existing.w += (target.w - existing.w) * 0.24;
        existing.h += (target.h - existing.h) * 0.24;
        existing.opacity = Math.min(1, existing.opacity + 0.18);
      }
    });

    // 3. Cleanly remove vanished faces (smooth fade-out)
    for (const [key, val] of activeMap.entries()) {
      if (key >= currentTargets.length) {
        val.opacity -= 0.18;
        if (val.opacity <= 0.02) {
          activeMap.delete(key);
        }
      }
    }

    // 4. Draw Hand Skeleton (only in gesture mode, preserving existing gesture tracking)
    if (isGesture) {
      landmarks.forEach(set => {
        if (settings.showMesh && set.length === 21) {
          const fingerChains = [
            [0, 1, 2, 3, 4],
            [0, 5, 6, 7, 8],
            [0, 9, 10, 11, 12],
            [0, 13, 14, 15, 16],
            [0, 17, 18, 19, 20]
          ];
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = currentTheme.border;
          fingerChains.forEach(chain => {
            ctx.beginPath();
            ctx.moveTo(set[chain[0]].x * width, set[chain[0]].y * height);
            for (let c = 1; c < chain.length; c++) {
              ctx.lineTo(set[chain[c]].x * width, set[chain[c]].y * height);
            }
            ctx.stroke();
          });

          ctx.fillStyle = strokeColor;
          for (let i = 0; i < set.length; i++) {
            ctx.beginPath();
            ctx.arc(set[i].x * width, set[i].y * height, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // 4b. Draw Subtle Face Landmark Mesh & Key Contours (in face and expression modes)
    if (!isGesture && settings.showMesh) {
      landmarks.forEach(set => {
        if (set.length >= 468) {
          ctx.save();
          ctx.lineWidth = 0.85;
          ctx.strokeStyle = currentTheme.border;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Key facial contours: subtle wireframe outline keeping human face clear
          const faceChains = [
            // Left eye
            [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
            // Right eye
            [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362],
            // Left eyebrow
            [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
            // Right eyebrow
            [336, 296, 334, 293, 300, 276, 283, 282, 295, 285],
            // Outer lips
            [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61],
            // Nose bridge & ridge
            [168, 6, 197, 195, 5, 4, 1],
            // Lower jawline contour
            [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]
          ];

          faceChains.forEach(chain => {
            ctx.beginPath();
            ctx.moveTo(set[chain[0]].x * width, set[chain[0]].y * height);
            for (let c = 1; c < chain.length; c++) {
              ctx.lineTo(set[chain[c]].x * width, set[chain[c]].y * height);
            }
            ctx.stroke();
          });

          // Subtle landmark constellation nodes
          const keyNodes = [1, 33, 133, 362, 263, 61, 291, 199, 10, 152, 4, 70, 107, 336, 300];
          ctx.fillStyle = strokeColor;
          ctx.globalAlpha = 0.5;
          keyNodes.forEach(ptIdx => {
            const pt = set[ptIdx];
            if (pt) {
              ctx.beginPath();
              ctx.arc(pt.x * width, pt.y * height, 1.4, 0, Math.PI * 2);
              ctx.fill();
            }
          });

          // Feature glow nodes if enabled
          if (settings.showParticles) {
            ctx.shadowColor = currentTheme.glow;
            ctx.shadowBlur = 8;
            ctx.fillStyle = strokeColor;
            ctx.globalAlpha = 0.85;
            const glowAnchors = [4, 33, 263, 61, 291];
            glowAnchors.forEach(gIdx => {
              const pt = set[gIdx];
              if (pt) {
                ctx.beginPath();
                ctx.arc(pt.x * width, pt.y * height, 2.2, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }

          ctx.restore();
        }
      });
    }

    // 5. Draw Precision Corner Frames (four crisp corner brackets with open middle edges)
    if (settings.showBoundingBox) {
      for (const [idx, frame] of activeMap.entries()) {
        const { x: bx, y: by, w: bw, h: bh, opacity } = frame;
        if (opacity <= 0.02) continue;

        // Bracket length: proportional to face size, cleanly bounded
        const cornerLen = Math.min(22, Math.max(14, bw * 0.14));
        const radius = 2.5;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Restrained, subtle glow
        ctx.shadowColor = currentTheme.glow;
        ctx.shadowBlur = 4;

        // Top-Left Bracket
        ctx.beginPath();
        ctx.moveTo(bx, by + cornerLen);
        ctx.lineTo(bx, by + radius);
        ctx.arcTo(bx, by, bx + radius, by, radius);
        ctx.lineTo(bx + cornerLen, by);
        ctx.stroke();

        // Top-Right Bracket
        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by);
        ctx.lineTo(bx + bw - radius, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + radius, radius);
        ctx.lineTo(bx + bw, by + cornerLen);
        ctx.stroke();

        // Bottom-Left Bracket
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - cornerLen);
        ctx.lineTo(bx, by + bh - radius);
        ctx.arcTo(bx, by + bh, bx + radius, by + bh, radius);
        ctx.lineTo(bx + cornerLen, by + bh);
        ctx.stroke();

        // Bottom-Right Bracket
        ctx.beginPath();
        ctx.moveTo(bx + bw - cornerLen, by + bh);
        ctx.lineTo(bx + bw - radius, by + bh);
        ctx.arcTo(bx + bw, by + bh, bx + bw, by + bh - radius, radius);
        ctx.lineTo(bx + bw, by + bh - cornerLen);
        ctx.stroke();

        ctx.restore();
      }
    }

    ctx.restore();
  }, [landmarks, cameraReady, mode, settings, currentTheme]);

  return (
    <main className="studio-viewport-panel">
      {/* Viewport Top Header */}
      <div className="viewport-hud-header">
        <div className="hud-title-wrap">
          <div className="hud-mode-pill" style={{ borderColor: currentTheme.border, color: currentTheme.primary }}>
            <span className="dot" style={{ background: currentTheme.primary }} />
            <span>{mode.toUpperCase()} MODE</span>
          </div>
          <span className="hud-sub">CAMERA VIEWPORT · CLIENT ACCELERATION</span>
        </div>

        <div className="hud-status-badge">
          <span
            className={`status-light ${cameraReady ? 'live' : status === 'loading' ? 'loading' : 'off'}`}
            style={cameraReady ? { background: currentTheme.primary, boxShadow: `0 0 10px ${currentTheme.glow}` } : {}}
          />
          <span>{cameraReady ? 'LIVE WEBRTC FEED' : status === 'loading' ? 'INITIALIZING AI...' : 'FEED STANDBY'}</span>
        </div>
      </div>

      {/* Main Camera Frame */}
      <div className="camera-viewport-frame" style={{ borderColor: currentTheme.border }}>
        {/* Subtle coordinate grid */}
        <div className="camera-grid-overlay" aria-hidden="true" />

        {/* Video feed */}
        <video
          ref={videoRef}
          className={`camera-video ${cameraReady ? 'visible' : ''}`}
          playsInline
          muted
        />

        {/* 1:1 Canvas Overlay */}
        <canvas ref={canvasRef} className="vision-overlay" aria-hidden="true" />

        {/* HUD Brackets */}
        <div className={`camera-corner tl ${cameraReady ? 'active' : ''}`} style={{ borderColor: currentTheme.primary }} />
        <div className={`camera-corner tr ${cameraReady ? 'active' : ''}`} style={{ borderColor: currentTheme.primary }} />
        <div className={`camera-corner bl ${cameraReady ? 'active' : ''}`} style={{ borderColor: currentTheme.primary }} />
        <div className={`camera-corner br ${cameraReady ? 'active' : ''}`} style={{ borderColor: currentTheme.primary }} />

        {/* Empty State before Camera Starts */}
        {!cameraReady && (
          <div className="camera-empty-state">
            <div className="empty-orbit" style={{ borderColor: currentTheme.border }}>
              <div className="empty-core" style={{ color: currentTheme.primary, boxShadow: `0 0 35px ${currentTheme.glow}` }}>
                <ScanFace size={36} />
              </div>
            </div>
            <h3>Your visual field awaits.</h3>
            <p>Start your camera to initialize browser-native MediaPipe inference.</p>
            <button
              type="button"
              className="button-primary camera-cta"
              onClick={onStart}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <span className="spinner" /> Loading Vision Models...
                </>
              ) : (
                <>
                  <Camera size={16} /> Start Live Camera
                </>
              )}
            </button>
          </div>
        )}

        {/* Unobtrusive tracking status indicator in the top-left corner, away from the face */}
        {cameraReady && (
          <div className="camera-corner-indicator">
            <span
              className={`corner-indicator-dot ${landmarks.length > 0 ? 'locked' : 'scanning'}`}
              style={landmarks.length > 0 ? { background: currentTheme.primary, boxShadow: `0 0 6px ${currentTheme.glow}` } : {}}
            />
            <span>
              {landmarks.length > 0
                ? mode === 'gesture'
                  ? `${landmarks.length} HAND${landmarks.length > 1 ? 'S' : ''} TRACKED`
                  : 'FACE LOCKED'
                : 'SCANNING...'}
            </span>
          </div>
        )}
      </div>

      {/* Error Banner & Actionable Troubleshooting */}
      {error && (
        <div className="error-banner-v2">
          <div className="error-header-row">
            <div className="error-lead">
              <AlertCircle size={16} className="error-icon" />
              <span className="error-text">{error}</span>
            </div>
            <button type="button" className="error-dismiss" onClick={onErrorDismiss} aria-label="Dismiss error">
              <X size={14} />
            </button>
          </div>
          <div className="error-troubleshoot-box">
            <div className="troubleshoot-item">
              <span className="step-num">01</span>
              <span><strong>Browser Permissions:</strong> Click the 🔒 lock or settings icon in your address bar and ensure Camera is set to <strong>Allow</strong>.</span>
            </div>
            <div className="troubleshoot-item">
              <span className="step-num">02</span>
              <span><strong>Device Lock:</strong> Ensure other applications (Teams, Zoom, FaceTime) are not holding an exclusive lock on your camera.</span>
            </div>
            <div className="troubleshoot-item">
              <span className="step-num">03</span>
              <span><strong>Security Origin:</strong> WebRTC requires a secure context (<code>localhost</code> or an HTTPS origin).</span>
            </div>
            <div className="troubleshoot-action">
              <button
                type="button"
                className="retry-cta"
                onClick={onStart}
                style={{ borderColor: currentTheme.border, color: currentTheme.primary }}
              >
                <RotateCcw size={12} /> Retry Camera Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Action Control Strip */}
      <div className="viewport-action-strip">
        {cameraReady ? (
          <button type="button" className="button-danger" onClick={onStop}>
            <Square size={13} fill="currentColor" /> Stop Camera Feed
          </button>
        ) : (
          <button
            type="button"
            className="button-primary small-cta"
            onClick={onStart}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <>
                <span className="spinner" /> Initializing...
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Start Camera Feed
              </>
            )}
          </button>
        )}
        <span className="action-hint">Permission is requested locally. No recordings are saved.</span>
      </div>
    </main>
  );
};
