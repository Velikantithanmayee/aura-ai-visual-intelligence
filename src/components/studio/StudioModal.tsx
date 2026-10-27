import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AudioWaveform, X } from 'lucide-react';
import type { FaceLandmarker, GestureRecognizer, NormalizedLandmark } from '@mediapipe/tasks-vision';

import type {
  StudioMode,
  VisionState,
  StudioSettings,
  ExpressionAnalysisResult,
  HistoryPoint,
  TelemetryState,
  TrackingEvent
} from '../../types/studio';
import { THEMES } from '../../types/studio';
import { faceExpressionClassifier } from '../../utils/faceExpressionClassifier';
import {
  getVisionResolver,
  createFaceLandmarker,
  createGestureRecognizer
} from '../../utils/visionResolver';

import { StudioSidebar } from './StudioSidebar';
import { StudioCameraViewport } from './StudioCameraViewport';
import { StudioIntelligencePanel } from './StudioIntelligencePanel';
import { StudioTelemetry } from './StudioTelemetry';

interface Props {
  onClose: () => void;
  onGestureChange?: (mode: 'orbit' | 'expansion' | 'compression' | 'vortex') => void;
}

export const StudioModal: React.FC<Props> = ({ onClose, onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const gestureRef = useRef<GestureRecognizer | null>(null);
  const loopRef = useRef<number | null>(null);
  const lastVideoTime = useRef(-1);
  const frameCount = useRef(0);
  const fpsStart = useRef(performance.now());
  const isSwitchingModel = useRef(false);
  const isClassifyingRef = useRef(false);

  const [mode, setMode] = useState<StudioMode>('expression');
  const modeRef = useRef<StudioMode>('expression');
  modeRef.current = mode;

  const [status, setStatus] = useState<VisionState>('idle');
  const statusRef = useRef<VisionState>('idle');
  statusRef.current = status;

  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][]>([]);

  const [expressionResult, setExpressionResult] = useState<ExpressionAnalysisResult>(
    faceExpressionClassifier.getEmptyResult(false)
  );
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [gestureDetection, setGestureDetection] = useState<{ label: string; confidence: number } | null>(null);

  const [settings, setSettings] = useState<StudioSettings>({
    showMesh: false, // Clean camera view by default
    showBoundingBox: true, // Minimal precision corner frame enabled
    showParticles: false, // No decorative facial points by default
    theme: 'cyan'
  });

  const [telemetry, setTelemetry] = useState<TelemetryState>({
    fps: 0,
    latency: 0,
    detectedCount: 0,
    sessionDuration: 0,
    streamResolution: '1280 × 720'
  });

  const [events, setEvents] = useState<TrackingEvent[]>([
    {
      id: 'init-1',
      message: 'AURA AI Studio initialized in Expression Analysis mode',
      timestamp: 'Ready',
      category: 'system'
    }
  ]);

  const addEvent = useCallback((message: string, category: TrackingEvent['category'] = 'system') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEvents(prev => [{ id: `${Date.now()}-${Math.random()}`, message, timestamp: timeStr, category }, ...prev].slice(0, 8));
  }, []);

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (loopRef.current !== null) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setLandmarks([]);
    setGestureDetection(null);
    faceExpressionClassifier.reset();
    setExpressionResult(faceExpressionClassifier.getEmptyResult(false));
    setHistory([]);
    setTelemetry(prev => ({ ...prev, fps: 0, latency: 0, detectedCount: 0, sessionDuration: 0 }));
  }, []);

  // Stop session
  const stop = useCallback(() => {
    cleanup();
    setStatus('idle');
    statusRef.current = 'idle';
    addEvent('Camera session ended by operator', 'system');
  }, [cleanup, addEvent]);

  // Start camera and inference loop
  const start = useCallback(async () => {
    setError('');
    setStatus('loading');
    statusRef.current = 'loading';
    addEvent('Requesting camera permissions & initializing vision resolver...', 'system');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is unavailable. Please run on localhost or a secure HTTPS environment.');
      }

      const vision = await getVisionResolver();
      const currentMode = modeRef.current;

      // Initialize appropriate model based on mode
      if ((currentMode === 'face' || currentMode === 'expression') && !faceRef.current) {
        faceRef.current = await createFaceLandmarker(vision);
      } else if (currentMode === 'gesture' && !gestureRef.current) {
        gestureRef.current = await createGestureRecognizer(vision);
      }
      if (currentMode === 'expression') {
        faceExpressionClassifier.loadModel().catch(err => {
          console.warn('FaceExpressionNet background preload error:', err);
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Video viewport element was not mounted.');

      video.srcObject = stream;

      if (video.readyState < 2) {
        await new Promise<void>(resolve => {
          video.onloadeddata = () => resolve();
        });
      }
      await video.play();

      const track = stream.getVideoTracks()[0];
      const settingsTrack = track?.getSettings();
      const resolutionStr = settingsTrack?.width && settingsTrack?.height
        ? `${settingsTrack.width} × ${settingsTrack.height}`
        : '1280 × 720';

      setCameraReady(true);
      setStatus('running');
      statusRef.current = 'running';
      setTelemetry(prev => ({ ...prev, streamResolution: resolutionStr }));
      addEvent(`Live WebRTC stream attached (${resolutionStr})`, 'system');

      lastVideoTime.current = -1;
      fpsStart.current = performance.now();
      frameCount.current = 0;

      // Inference render loop
      const render = () => {
        if (statusRef.current !== 'running') return;
        const currentVideo = videoRef.current;

        if (!currentVideo || currentVideo.readyState < 2) {
          loopRef.current = requestAnimationFrame(render);
          return;
        }

        if (currentVideo.currentTime !== lastVideoTime.current && !isSwitchingModel.current) {
          lastVideoTime.current = currentVideo.currentTime;
          const t0 = performance.now();
          const activeMode = modeRef.current;

          try {
            if ((activeMode === 'face' || activeMode === 'expression') && faceRef.current) {
              const result = faceRef.current.detectForVideo(currentVideo, t0);
              const faces = result.faceLandmarks ?? [];
              setLandmarks(faces);

              if (activeMode === 'expression') {
                if (faces.length > 0 && faces[0]) {
                  const blendshapes = result.faceBlendshapes?.[0]?.categories;
                  if (!isClassifyingRef.current) {
                    isClassifyingRef.current = true;
                    faceExpressionClassifier
                      .classifyFace(currentVideo, faces[0], blendshapes)
                      .then(({ result: expRes, history: expHist }) => {
                        setExpressionResult(expRes);
                        setHistory(expHist);
                      })
                      .catch(err => {
                        console.warn('Face expression classification error:', err);
                      })
                      .finally(() => {
                        isClassifyingRef.current = false;
                      });
                  }
                } else {
                  setExpressionResult(faceExpressionClassifier.getEmptyResult(false));
                }
              }

              setTelemetry(prev => ({
                ...prev,
                detectedCount: faces.length
              }));
            } else if (activeMode === 'gesture' && gestureRef.current) {
              const result = gestureRef.current.recognizeForVideo(currentVideo, t0);
              const hands = result.landmarks ?? [];
              setLandmarks(hands);

              const top = result.gestures?.map(g => g[0]).filter(Boolean).sort((a, b) => b.score - a.score)[0];
              if (top && top.categoryName && top.categoryName.toLowerCase() !== 'none') {
                const cleanLabel = top.categoryName.replaceAll('_', ' ');
                setGestureDetection({ label: cleanLabel, confidence: top.score });
                if (onGestureChange) {
                  const cat = top.categoryName.toLowerCase();
                  if (cat.includes('open_palm') || cat.includes('palm')) {
                    onGestureChange('expansion');
                  } else if (cat.includes('closed_fist') || cat.includes('fist')) {
                    onGestureChange('compression');
                  } else if (cat.includes('victory')) {
                    onGestureChange('vortex');
                  }
                }
              } else if (hands.length) {
                setGestureDetection({ label: `${hands.length} Hand${hands.length > 1 ? 's' : ''} Tracked`, confidence: top?.score ?? 0 });
              } else {
                setGestureDetection(null);
              }

              setTelemetry(prev => ({
                ...prev,
                detectedCount: hands.length
              }));
            }

            const frameLatency = Math.round(performance.now() - t0);
            frameCount.current += 1;
            const elapsed = performance.now() - fpsStart.current;

            if (elapsed >= 1000) {
              const currentFps = Math.round((frameCount.current * 1000) / elapsed);
              setTelemetry(prev => ({
                ...prev,
                fps: currentFps,
                latency: frameLatency
              }));
              frameCount.current = 0;
              fpsStart.current = performance.now();
            }
          } catch (inferErr) {
            console.error('Inference pipeline error:', inferErr);
          }
        }

        loopRef.current = requestAnimationFrame(render);
      };

      if (loopRef.current !== null) cancelAnimationFrame(loopRef.current);
      loopRef.current = requestAnimationFrame(render);
    } catch (e: any) {
      cleanup();
      setStatus('error');
      statusRef.current = 'error';
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera permissions in your browser address bar.');
      } else if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
        setError('No video capture hardware was detected on your machine.');
      } else {
        setError(e instanceof Error ? e.message : 'Could not initialize camera feed or MediaPipe model.');
      }
      addEvent('Failed to initialize camera session', 'system');
    }
  }, [cleanup, addEvent]);

  // Session timer tick
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (cameraReady && status === 'running') {
      timer = setInterval(() => {
        setTelemetry(prev => ({ ...prev, sessionDuration: prev.sessionDuration + 1 }));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cameraReady, status]);

  // Mode switching
  const handleModeChange = async (next: StudioMode) => {
    if (next === mode) return;
    const prevMode = mode;
    setMode(next);
    modeRef.current = next;
    setLandmarks([]);
    setGestureDetection(null);

    // If switching between face & expression, no new model is required!
    if ((prevMode === 'face' && next === 'expression') || (prevMode === 'expression' && next === 'face')) {
      addEvent(`Switched mode to ${next === 'face' ? 'Face Landmarks' : 'Expression Analysis'} (Zero-latency model reuse)`, 'mode');
      return;
    }

    addEvent(`Transitioning vision pipeline to ${next.toUpperCase()} mode...`, 'mode');

    if (statusRef.current === 'running') {
      isSwitchingModel.current = true;
      try {
        const vision = await getVisionResolver();
        if ((next === 'face' || next === 'expression') && !faceRef.current) {
          faceRef.current = await createFaceLandmarker(vision);
        } else if (next === 'gesture' && !gestureRef.current) {
          gestureRef.current = await createGestureRecognizer(vision);
        }
        addEvent(`Vision pipeline ready for ${next.toUpperCase()} mode`, 'mode');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch vision model.');
      } finally {
        isSwitchingModel.current = false;
      }
    }
  };

  // Preload neural expression model weights on mount
  useEffect(() => {
    faceExpressionClassifier.loadModel().catch(err => {
      console.warn('FaceExpressionNet background preload warning:', err);
    });
  }, []);

  // Keyboard navigation (ESC to close)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Unmount cleanup
  useEffect(() => () => {
    cleanup();
    try { faceRef.current?.close(); } catch {}
    try { gestureRef.current?.close(); } catch {}
  }, [cleanup]);

  const currentTheme = THEMES[settings.theme];

  // Active detection banner for camera viewport
  const activeDetectionLabel =
    mode === 'expression'
      ? expressionResult.faceDetected
        ? `${expressionResult.emoji} ${expressionResult.label}`
        : null
      : mode === 'face'
      ? landmarks.length
        ? `${landmarks.length} Face${landmarks.length > 1 ? 's' : ''} Tracked`
        : null
      : gestureDetection?.label ?? null;

  const activeDetectionConfidence =
    mode === 'expression'
      ? expressionResult.confidence
      : mode === 'gesture'
      ? gestureDetection?.confidence ?? 0
      : 1;

  return (
    <motion.div
      className="studio-backdrop-v2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="studio-panel-v2"
        initial={{ y: 32, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          boxShadow: `0 30px 90px rgba(0, 0, 0, 0.18), 0 0 40px ${currentTheme.bgGlow}`
        }}
      >
        {/* Studio Top Control Header */}
        <header className="studio-top-header">
          <div className="brand-lockup">
            <span className="brand-mark small-mark" style={{ borderColor: currentTheme.border, color: currentTheme.primary }}>
              <AudioWaveform size={16} />
            </span>
            <span className="brand-title">
              AURA <b style={{ color: currentTheme.primary }}>STUDIO</b>
              <span className="studio-version-tag">PRO V2.0</span>
            </span>
          </div>

          <div className="top-header-center">
            <span className="spatial-label">SPATIAL COMPUTER VISION WORKSPACE</span>
          </div>

          <div className="top-header-right">
            <div className={`live-pulse-badge ${cameraReady ? 'is-live' : ''}`}>
              <i style={cameraReady ? { background: currentTheme.primary, boxShadow: `0 0 10px ${currentTheme.primary}` } : {}} />
              <span>{cameraReady ? 'LIVE INFERENCE' : status === 'loading' ? 'INITIALIZING' : 'STANDBY'}</span>
            </div>

            <button
              type="button"
              className="studio-close-btn"
              onClick={onClose}
              aria-label="Close Launch Studio"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 3-Column Spatial Workspace Grid */}
        <div className="studio-workspace-grid">
          {/* Left Column: Controls Sidebar */}
          <StudioSidebar
            mode={mode}
            onModeChange={handleModeChange}
            status={status}
            settings={settings}
            onSettingsChange={setSettings}
          />

          {/* Center Column: Live Camera Viewport */}
          <StudioCameraViewport
            videoRef={videoRef}
            landmarks={landmarks}
            mode={mode}
            status={status}
            error={error}
            cameraReady={cameraReady}
            settings={settings}
            activeDetectionLabel={activeDetectionLabel}
            activeDetectionConfidence={activeDetectionConfidence}
            onStart={start}
            onStop={stop}
            onErrorDismiss={() => setError('')}
          />

          {/* Right Column: Live Intelligence Analytics */}
          <StudioIntelligencePanel
            mode={mode}
            expressionResult={expressionResult}
            history={history}
            events={events}
            theme={settings.theme}
            isStreaming={cameraReady}
            gestureDetection={gestureDetection}
            faceCount={landmarks.length}
            onResetSession={() => {
              faceExpressionClassifier.reset();
              setExpressionResult(faceExpressionClassifier.getEmptyResult(false));
              setHistory([]);
              setEvents([]);
              addEvent('Operator reset telemetry history', 'system');
            }}
          />
        </div>

        {/* Bottom Telemetry Strip */}
        <StudioTelemetry
          telemetry={telemetry}
          mode={mode}
          theme={settings.theme}
          isStreaming={cameraReady}
        />
      </motion.div>
    </motion.div>
  );
};
