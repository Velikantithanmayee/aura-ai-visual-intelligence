import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowDownRight, ArrowRight, AudioWaveform, Camera, Check, ChevronDown,
  CircleHelp, Command, Cpu, Github, Hand, ScanFace, ShieldCheck, Sparkles,
  X, Zap, Activity, Eye, MoveUpRight, RotateCcw
} from 'lucide-react';
import { StudioModal } from './components/studio/StudioModal';

function CustomCursor({ cursorLabel }: { cursorLabel?: string | null }) {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const currentPos = useRef({ x: -1000, y: -1000 });
  const [active, setActive] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseDown = () => setActive(true);
    const onMouseUp = () => setActive(false);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });

    let animId: number;
    const loop = () => {
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * 0.14;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * 0.14;

      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${currentPos.current.x}px, ${currentPos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <>
      <div ref={spotlightRef} className="cursor-spotlight" aria-hidden="true" />
      <div
        ref={reticleRef}
        className={`cursor-reticle ${active ? 'active' : ''} ${cursorLabel ? 'has-label' : ''}`}
        aria-hidden="true"
      >
        {cursorLabel && <span className="cursor-label-pill">{cursorLabel}</span>}
      </div>
    </>
  );
}

function SoundButton() {
  const [isPlaying, setIsPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const toggleSound = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (isPlaying) {
      if (gainRef.current) {
        const now = ctx.currentTime;
        gainRef.current.gain.setTargetAtTime(0.0001, now, 0.2);
        setTimeout(() => {
          try {
            osc1Ref.current?.stop();
            osc2Ref.current?.stop();
          } catch {}
          setIsPlaying(false);
        }, 300);
      }
    } else {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setTargetAtTime(0.05, now, 0.4);
      gain.connect(ctx.destination);
      gainRef.current = gain;

      // Atmospheric harmonic drone (108Hz + 162Hz) with gentle lowpass
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(108, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(162, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      osc1.start();
      osc2.start();
      osc1Ref.current = osc1;
      osc2Ref.current = osc2;
      setIsPlaying(true);
    }
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.08;
      const bars = 4;
      const w = 2.5;
      const gap = 2.5;
      const maxH = 12;

      for (let i = 0; i < bars; i++) {
        const x = i * (w + gap) + 2;
        let h = 3;
        if (isPlaying) {
          h = 4 + Math.sin(t * 2.2 + i * 1.3) * 3.5 + Math.cos(t * 1.1 + i * 0.8) * 3.5;
          h = Math.max(2.5, Math.min(maxH, h));
        }
        ctx.fillStyle = isPlaying ? '#c1ff00' : '#716e82';
        const y = (canvas.height - h) / 2;
        ctx.fillRect(x, y, w, h);
      }
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  return (
    <button
      type="button"
      className={`lusion-sound-btn ${isPlaying ? 'active' : ''}`}
      onClick={toggleSound}
      title={isPlaying ? 'Mute ambient sound' : 'Unmute ambient sound'}
      aria-label="Toggle ambient sound"
    >
      <canvas ref={canvasRef} width={22} height={16} className="sound-canvas" />
      <span className="sound-label">{isPlaying ? 'SOUND ON' : 'SOUND'}</span>
    </button>
  );
}

function InitialLoader({ onComplete }: { onComplete: () => void }) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 18) + 6;
      if (current >= 100) {
        current = 100;
        setPercent(100);
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 320);
      } else {
        setPercent(current);
      }
    }, 90);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="initial-loader"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
      }}
    >
      <div className="loader-content">
        <div className="loader-logo-ring">
          <AudioWaveform size={28} />
        </div>
        <div className="loader-counter">
          <span className="counter-number">{percent.toString().padStart(2, '0')}</span>
          <span className="counter-symbol">%</span>
        </div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" style={{ width: `${percent}%` }} />
        </div>
        <div className="loader-meta">
          <span>AURA / PERCEPTION ENGINE</span>
          <span>INITIALIZING CLIENT GL</span>
        </div>
      </div>
    </motion.div>
  );
}

function DynamicCoordinates() {
  const [coords, setCoords] = useState({ x: '0.428', y: '0.761', z: '0.193' });

  useEffect(() => {
    const interval = setInterval(() => {
      const rx = (0.32 + Math.random() * 0.28).toFixed(3);
      const ry = (0.64 + Math.random() * 0.26).toFixed(3);
      const rz = (0.14 + Math.random() * 0.16).toFixed(3);
      setCoords({ x: rx, y: ry, z: rz });
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  return <b>{coords.x} : {coords.y} : {coords.z}</b>;
}

export type VisualMode = 'orbit' | 'expansion' | 'compression' | 'vortex';

function PerceptionSculpture({
  visualMode = 'orbit',
  isTabVisible = true,
  scrollProgress = 0,
  dragOffset = { x: 0, y: 0 }
}: {
  visualMode?: VisualMode;
  isTabVisible?: boolean;
  scrollProgress?: number;
  dragOffset?: { x: number; y: number };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const faceRef = useRef<any>(null);
  const synapticRef = useRef<any>(null);
  const nebulaRef = useRef<any>(null);
  const opticalRef = useRef<any>(null);
  const reducedMotion = useReducedMotion();

  // Dynamic physics states for smooth continuous exponential lerping
  const curScale = useRef(1.0);
  const curCoreScale = useRef(1.0);
  const curOuterScale = useRef(1.0);
  const curRotSpeed = useRef(0.035);
  const curVortexY = useRef(1.0);
  const curTwist = useRef(0.0);

  // 1. Biometric Perception Manifold (Organic 3D human face & visual perception topology)
  const facePositions = useMemo(() => {
    const count = 3000;
    const data = new Float32Array(count * 3);
    let idx = 0;

    while (idx < count) {
      const y = -1.4 + Math.random() * 2.8;
      let maxW = 1.25 * Math.sin(Math.acos(Math.max(-0.95, Math.min(0.95, (y - 0.1) / 1.7))));
      if (y < -0.4) {
        const chinFactor = (y + 1.4) / 1.0;
        maxW = 0.38 + 0.87 * Math.pow(Math.max(0, chinFactor), 0.7);
      }
      if (isNaN(maxW) || maxW <= 0) maxW = 0.5;

      const theta = (-0.42 + Math.random() * 0.84) * Math.PI;
      const x = maxW * Math.sin(theta);
      let z = maxW * Math.cos(theta) * 0.65;

      const absX = Math.abs(x);

      // Ocular cavities (eye sockets of perception)
      const eyeDist = Math.hypot(absX - 0.44, y - 0.22);
      if (eyeDist < 0.26) {
        z -= (0.26 - eyeDist) * 1.1;
      }

      // Brow ridge
      if (y > 0.35 && y < 0.52 && absX < 0.8) {
        z += Math.sin(((y - 0.35) / 0.17) * Math.PI) * 0.16;
      }

      // Nasal bridge & tip projection
      if (absX < 0.22 && y > -0.35 && y < 0.25) {
        const noseProgress = (y + 0.35) / 0.6;
        const noseH = Math.sin(noseProgress * Math.PI) * 0.36 + (y < -0.1 ? 0.15 : 0);
        const falloff = 1 - absX / 0.22;
        z += noseH * falloff * 1.25;
      }

      // Cheekbones
      const cheekDist = Math.hypot(absX - 0.78, y + 0.1);
      if (cheekDist < 0.35) {
        z += (0.35 - cheekDist) * 0.35;
      }

      // Lips
      if (absX < 0.45 && y > -0.7 && y < -0.42) {
        const lipY = (y + 0.7) / 0.28;
        const lipBulge = Math.sin(lipY * Math.PI) * 0.22 * (1 - absX / 0.45);
        z += lipBulge;
      }

      // Chin
      if (absX < 0.35 && y > -1.35 && y < -0.95) {
        z += (1 - absX / 0.35) * 0.24;
      }

      const jitter = 0.025;
      data[idx * 3] = x + (Math.random() - 0.5) * jitter;
      data[idx * 3 + 1] = y + (Math.random() - 0.5) * jitter;
      data[idx * 3 + 2] = z + (Math.random() - 0.5) * jitter;
      idx++;
    }
    return data;
  }, []);

  // 2. Synaptic Neural Lattice (Lusion Volt Green #c1ff00)
  const synapticPositions = useMemo(() => {
    const count = 1800;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 14;
      const y = -1.6 + (i / count) * 3.2;
      const r = 1.35 + Math.sin(t * 0.4) * 0.45;
      data[i * 3] = r * Math.sin(t) + (Math.random() - 0.5) * 0.04;
      data[i * 3 + 1] = y + (Math.random() - 0.5) * 0.04;
      data[i * 3 + 2] = r * Math.cos(t) * 0.8 + (Math.random() - 0.5) * 0.04;
    }
    return data;
  }, []);

  // 3. Volumetric Quantum Nebula (Lusion Ultraviolet #8832f7)
  const nebulaPositions = useMemo(() => {
    const count = 2200;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.random() * 1.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      data[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      data[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.9;
      data[i * 3 + 2] = radius * Math.cos(phi) * 1.1;
    }
    return data;
  }, []);

  // 4. Optical Sensor Nodes (Lusion Crisp White #ffffff)
  const opticalPositions = useMemo(() => {
    const count = 160;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const isLeft = i < count / 2;
      const cx = isLeft ? -0.44 : 0.44;
      const cy = 0.22;
      const cz = 0.12;
      const angle = Math.random() * Math.PI * 2;
      const r = 0.04 + Math.random() * 0.14;
      data[i * 3] = cx + r * Math.cos(angle);
      data[i * 3 + 1] = cy + r * Math.sin(angle);
      data[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.02;
    }
    return data;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current || reducedMotion || !isTabVisible) return;
    const t = state.clock.elapsedTime;

    // Mode-specific target physics parameters
    let targetScale = 1.0;
    let targetCoreScale = 1.0;
    let targetOuterScale = 1.0;
    let targetRotSpeed = 0.035;
    let targetVortexY = 1.0;
    let targetTwist = 0.0;

    if (visualMode === 'expansion') {
      targetScale = 1.62;
      targetCoreScale = 1.35;
      targetOuterScale = 1.85;
      targetRotSpeed = 0.085;
      targetVortexY = 1.08;
      targetTwist = 0.2;
    } else if (visualMode === 'compression') {
      targetScale = 0.48;
      targetCoreScale = 0.38;
      targetOuterScale = 0.58;
      targetRotSpeed = 0.12;
      targetVortexY = 0.85;
      targetTwist = -0.3;
    } else if (visualMode === 'vortex') {
      targetScale = 1.25;
      targetCoreScale = 0.85;
      targetOuterScale = 1.38;
      targetRotSpeed = 0.17;
      targetVortexY = 1.65;
      targetTwist = 0.85;
    }

    // Smooth exponential lerp
    const lerpRate = Math.min(1, delta * 4.5);
    curScale.current = THREE.MathUtils.lerp(curScale.current, targetScale, lerpRate);
    curCoreScale.current = THREE.MathUtils.lerp(curCoreScale.current, targetCoreScale, lerpRate);
    curOuterScale.current = THREE.MathUtils.lerp(curOuterScale.current, targetOuterScale, lerpRate);
    curRotSpeed.current = THREE.MathUtils.lerp(curRotSpeed.current, targetRotSpeed, lerpRate);
    curVortexY.current = THREE.MathUtils.lerp(curVortexY.current, targetVortexY, lerpRate);
    curTwist.current = THREE.MathUtils.lerp(curTwist.current, targetTwist, lerpRate);

    // Continuous subtle spatial rotation
    groupRef.current.rotation.y += delta * curRotSpeed.current;

    // Cursor-reactive parallax & scroll-driven spatial positioning
    const targetPosX = state.pointer.x * 0.35 + (dragOffset.y * 0.05);
    const targetPosY = state.pointer.y * -0.28 + (dragOffset.x * 0.05);
    const targetPosZ = -scrollProgress * 0.4;

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetPosX, 0.06);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPosY, 0.06);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetPosZ, 0.06);

    const targetRotX = Math.sin(t * 0.18) * 0.08 + state.pointer.y * -0.38 + scrollProgress * 0.2 + dragOffset.x * 0.5;
    const targetRotZ = Math.cos(t * 0.15) * 0.06 + state.pointer.x * 0.35 + (visualMode === 'vortex' ? Math.sin(t * 1.5) * 0.15 : 0);

    groupRef.current.rotation.y += delta * curRotSpeed.current + dragOffset.y * 0.02;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.05);
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.05);

    // Organic breathing harmonic pulse
    const pulse = 1 + Math.sin(t * 0.85) * 0.035;
    const finalBaseScale = curScale.current * pulse;
    groupRef.current.scale.set(
      finalBaseScale,
      finalBaseScale * curVortexY.current,
      finalBaseScale
    );

    if (faceRef.current) {
      faceRef.current.scale.setScalar(curCoreScale.current);
      faceRef.current.rotation.y = Math.sin(t * 0.25) * 0.04;
    }
    if (synapticRef.current) {
      synapticRef.current.rotation.y += delta * 0.1;
      synapticRef.current.rotation.z = Math.cos(t * 0.3) * 0.08 + curTwist.current;
      const synapticPulse = 1 + Math.sin(t * 1.8) * 0.04;
      synapticRef.current.scale.setScalar(synapticPulse);
    }
    if (nebulaRef.current) {
      nebulaRef.current.scale.setScalar(curOuterScale.current * (1 + Math.sin(t * 1.2) * 0.025));
      nebulaRef.current.rotation.y -= delta * 0.04;
    }
    if (opticalRef.current) {
      const opticalPulse = 1 + Math.sin(t * 2.5) * 0.15;
      opticalRef.current.scale.setScalar(opticalPulse);
    }
  });

  return (
    <Float speed={0.9} rotationIntensity={0.14} floatIntensity={0.25}>
      <group ref={groupRef}>
        {/* Layer 1: Biometric Perception Manifold (Lusion Cobalt Blue #1a2ffb) */}
        <Points ref={faceRef} positions={facePositions} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#1a2ffb" size={0.018} sizeAttenuation depthWrite={false} opacity={0.96} />
        </Points>

        {/* Layer 2: Synaptic Neural Lattice (Lusion Volt Green #c1ff00) */}
        <Points ref={synapticRef} positions={synapticPositions} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#c1ff00" size={0.022} sizeAttenuation depthWrite={false} opacity={0.88} />
        </Points>

        {/* Layer 3: Volumetric Quantum Nebula (Lusion Ultraviolet #8832f7) */}
        <Points ref={nebulaRef} positions={nebulaPositions} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#8832f7" size={0.024} sizeAttenuation depthWrite={false} opacity={0.55} />
        </Points>

        {/* Layer 4: Optical Sensor Nodes (Lusion Crisp White #ffffff) */}
        <Points ref={opticalRef} positions={opticalPositions} stride={3} frustumCulled={false}>
          <PointMaterial transparent color="#ffffff" size={0.034} sizeAttenuation depthWrite={false} opacity={1.0} />
        </Points>
      </group>
    </Float>
  );
}

function OrbScene({
  visualMode = 'orbit',
  isTabVisible = true,
  scrollProgress = 0
}: {
  visualMode?: VisualMode;
  isTabVisible?: boolean;
  scrollProgress?: number;
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - lastPointer.current.x) * 0.006;
    const dy = (e.clientY - lastPointer.current.y) * 0.006;
    setDragOffset(prev => ({ x: prev.x + dy, y: prev.y + dx }));
    lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      className={`orb-scene mode-${visualMode}`}
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <Canvas camera={{ position: [0, 0, 5.0], fov: 46 }} dpr={[1, 1.8]}>
        <ambientLight intensity={0.9} />
        <pointLight position={[3, 3, 4]} intensity={2.0} color="#1a2ffb" />
        <pointLight position={[-3, -2, 2]} intensity={1.8} color="#c1ff00" />
        <pointLight position={[0, -3, 3]} intensity={1.4} color="#8832f7" />
        <PerceptionSculpture
          visualMode={visualMode}
          isTabVisible={isTabVisible}
          scrollProgress={scrollProgress}
          dragOffset={dragOffset}
        />
      </Canvas>
      <div className={`orb-glow mode-${visualMode}`} />
      <div className="orb-ring ring-one" />
      <div className="orb-ring ring-two" />
    </div>
  );
}


function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({});
  const reducedMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    setTransformStyle({
      transform: `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`,
      '--mouse-x': `${x}px`,
      '--mouse-y': `${y}px`,
    } as React.CSSProperties);
  };

  const handleMouseLeave = () => {
    setTransformStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)',
      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    });
  };

  return (
    <div
      ref={cardRef}
      className={`feature-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={transformStyle}
    >
      <div className="card-spotlight" />
      {children}
    </div>
  );
}

const features = [
  {
    n: '01',
    kicker: 'CONCEPT • VISION • REALTIME',
    icon: ScanFace,
    title: 'Biometric Perception',
    desc: '468 high-precision facial landmarks tracked natively in real time. Ultra-low latency edge inference without remote cloud processing.'
  },
  {
    n: '02',
    kicker: 'EMOTION • FACS • DYNAMICS',
    icon: Sparkles,
    title: 'Expression AI',
    desc: 'Real-time FERPlus emotion detection and Facial Action Coding (FACS), interpreting subtle affective states directly in your browser.'
  },
  {
    n: '03',
    kicker: 'GESTURE • 3D • INTERACTION',
    icon: Hand,
    title: 'Gesture Engine',
    desc: 'Continuous 21-point hand skeleton tracking mapped directly to dynamic WebGL particle states and interactive visual physics.'
  }
];

export default function App() {
  const [studioOpen, setStudioOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visualMode, setVisualMode] = useState<VisualMode>('orbit');
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [cursorLabel, setCursorLabel] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setStudioOpen(false); setMenuOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <CustomCursor cursorLabel={cursorLabel} />
      <div className="lusion-film-grain" aria-hidden="true" />
      <AnimatePresence>
        {loading && <InitialLoader onComplete={() => setLoading(false)} />}
      </AnimatePresence>
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress})` }}/>
      <motion.header
        className="site-nav"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <a className="brand-lockup" href="#home" aria-label="AURA AI home"><span className="brand-mark"><AudioWaveform size={18}/></span><span>AURA<span className="brand-light">/AI</span></span></a>
        <nav className={`nav-links ${menuOpen ? 'menu-open' : ''}`}>
          <a href="#experience" onClick={() => setMenuOpen(false)}>Experience</a>
          <a href="#gestures" onClick={() => setMenuOpen(false)}>Gestures</a>
          <a href="#technology" onClick={() => setMenuOpen(false)}>Technology</a>
          <a href="#privacy" onClick={() => setMenuOpen(false)}>Privacy</a>
        </nav>
        <div className="nav-right">
          <SoundButton />
          <span className="nav-status"><i/> BROWSER-NATIVE AI</span>
          <button
            className="nav-cta"
            onClick={() => setStudioOpen(true)}
            onMouseEnter={() => setCursorLabel('STUDIO')}
            onMouseLeave={() => setCursorLabel(null)}
          >
            ENTER STUDIO <span className="nav-cta-dot" />
          </button>
          <button
            className="nav-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle navigation menu"
          >
            MENU <span className="menu-dots"><span /><span /></span>
          </button>
        </div>
      </motion.header>

      <main>
        <section
          className="hero-section"
          id="home"
          onMouseEnter={() => setCursorLabel('DRAG')}
          onMouseLeave={() => setCursorLabel(null)}
        >
          {/* Lusion Hero Header Row (Screenshot 2) */}
          <div className="hero-header-row">
            <div className="hero-headline-wrap">
              <motion.div
                className="eyebrow"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="status-dot animate-pulse-dot" /> REAL-TIME VISUAL INTELLIGENCE · V.01
              </motion.div>
              <h1 className="hero-headline">
                <span className="hero-line-mask">
                  <motion.span
                    className="hero-line-inner"
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  >
                    Bold Perception,
                  </motion.span>
                </span>
                <span className="hero-line-mask">
                  <motion.span
                    className="hero-line-inner"
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.9, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    Brought to Life.
                  </motion.span>
                </span>
              </h1>
            </div>
            <motion.div
              className="hero-aside"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <p>
                A new dimension of computer vision running entirely in your browser.
                Transforming live biometric signals and spatial hand gestures into an immersive,
                interactive visual intelligence experience.
              </p>
              <div className="hero-aside-actions">
                <motion.button
                  type="button"
                  className="pill-btn-dark"
                  onClick={() => setStudioOpen(true)}
                  onMouseEnter={() => setCursorLabel('STUDIO')}
                  onMouseLeave={() => setCursorLabel(null)}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                >
                  <span className="pill-dot animate-dot-pulse" /> ENTER STUDIO
                </motion.button>
                <motion.a
                  href="#technology"
                  className="pill-btn-light"
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                >
                  <span className="pill-dot" /> EXPLORE SYSTEM
                </motion.a>
              </div>
            </motion.div>
          </div>

          {/* Lusion Hero 3D Stage Card (Screenshot 2) */}
          <motion.div
            className="hero-stage-card"
            initial={{ opacity: 0, y: 35, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Cinematic Real Media Background Layer */}
            <div className="hero-stage-media">
              <video
                className="hero-stage-video"
                autoPlay
                loop
                muted
                playsInline
                poster="/media/posters/hero-eye-poster.jpg"
                src="/media/video/hero-eye.mp4"
              />
              <div className="hero-video-gradient" />
            </div>

            <OrbScene visualMode={visualMode} isTabVisible={isTabVisible} scrollProgress={scrollProgress} />
            <div className="stage-hud-tag stage-hud-tl">
              <span className="stage-hud-dot" /> AURA // 001 · PERCEPTION ENGINE
            </div>
            <div className="stage-hud-tag stage-hud-tr">
              <span className="beacon-dot" /> CLIENT-SIDE · 60 FPS
            </div>
            <div className="stage-hud-tag stage-hud-bl">
              <span>DYNAMIC COORDINATES</span>
              <DynamicCoordinates />
            </div>

            {/* Interactive 3D Visual Playground Mode Switcher Dock */}
            <div className="hero-playground-hud">
              <div className="playground-pill-row">
                <button
                  type="button"
                  className={`pg-btn ${visualMode === 'orbit' ? 'active' : ''}`}
                  onClick={() => setVisualMode('orbit')}
                  title="Neutral harmonic floating nebula"
                >
                  <span className="pg-dot" /> ORBIT
                </button>
                <button
                  type="button"
                  className={`pg-btn ${visualMode === 'expansion' ? 'active' : ''}`}
                  onClick={() => setVisualMode('expansion')}
                  title="Expansion dynamic (Open Palm gesture)"
                >
                  <span className="pg-dot" /> EXPAND · PALM
                </button>
                <button
                  type="button"
                  className={`pg-btn ${visualMode === 'compression' ? 'active' : ''}`}
                  onClick={() => setVisualMode('compression')}
                  title="Singularity contraction (Closed Fist gesture)"
                >
                  <span className="pg-dot" /> CORE · FIST
                </button>
                <button
                  type="button"
                  className={`pg-btn ${visualMode === 'vortex' ? 'active' : ''}`}
                  onClick={() => setVisualMode('vortex')}
                  title="Helical twin orbital vortex (Victory gesture)"
                >
                  <span className="pg-dot" /> VORTEX · V
                </button>
              </div>
            </div>
          </motion.div>

          {/* Lusion Hero Explore Indicator Bar (Screenshot 2) */}
          <div className="hero-explore-bar">
            <span className="explore-plus explore-plus-1">+</span>
            <span className="explore-plus explore-plus-2">+</span>
            <a href="#experience" className="explore-link">
              <span>SCROLL TO EXPLORE</span>
              <ArrowDownRight size={14} className="explore-arrow" />
            </a>
            <span className="explore-plus explore-plus-3">+</span>
            <span className="explore-plus explore-plus-4">+</span>
          </div>
        </section>

        {/* Lusion Infinite Running Marquee Ribbon */}
        <div className="lusion-marquee-wrap" aria-hidden="true">
          <div className="lusion-marquee-track">
            <div className="lusion-marquee-content">
              <span>REAL-TIME COMPUTER VISION</span>
              <span className="marquee-dot">•</span>
              <span>468 3D FACIAL LANDMARKS</span>
              <span className="marquee-dot">•</span>
              <span>60 FPS BROWSER INFERENCE</span>
              <span className="marquee-dot">•</span>
              <span>FACIAL ACTION CODING (FACS)</span>
              <span className="marquee-dot">•</span>
              <span>CONTINUOUS HAND GESTURES</span>
              <span className="marquee-dot">•</span>
              <span>ZERO CLOUD UPLOADS</span>
              <span className="marquee-dot">•</span>
              <span>HARDWARE ACCELERATED WEBGL</span>
              <span className="marquee-dot">•</span>
            </div>
            <div className="lusion-marquee-content" aria-hidden="true">
              <span>REAL-TIME COMPUTER VISION</span>
              <span className="marquee-dot">•</span>
              <span>468 3D FACIAL LANDMARKS</span>
              <span className="marquee-dot">•</span>
              <span>60 FPS BROWSER INFERENCE</span>
              <span className="marquee-dot">•</span>
              <span>FACIAL ACTION CODING (FACS)</span>
              <span className="marquee-dot">•</span>
              <span>CONTINUOUS HAND GESTURES</span>
              <span className="marquee-dot">•</span>
              <span>ZERO CLOUD UPLOADS</span>
              <span className="marquee-dot">•</span>
              <span>HARDWARE ACCELERATED WEBGL</span>
              <span className="marquee-dot">•</span>
            </div>
          </div>
        </div>

        {/* ========================================================
           01 — HUMAN BIOMETRICS & PERCEPTION SHOWCASE
           ======================================================== */}
        <motion.section
          className="manifesto-section"
          id="experience"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-kicker">
            <span>01 — HUMAN BIOMETRICS</span>
            <span>468 SUB-MILLIMETER LANDMARKS</span>
          </div>

          <div className="manifesto-layout">
            <h2>
              Biometrics overlaid.<br />
              <span className="muted-heading">Decoded at 60 FPS.</span>
            </h2>
            <div className="manifesto-aside">
              <p>
                AURA tracks 468 facial coordinates and 17 micro-expression action units natively in browser memory.
                Biological eye saccades and nuanced emotional valences are translated into actionable intelligence instantly.
              </p>
              <button
                className="round-link"
                onClick={() => setStudioOpen(true)}
                aria-label="Open the studio"
                onMouseEnter={() => setCursorLabel('STUDIO')}
                onMouseLeave={() => setCursorLabel(null)}
              >
                <ArrowRight size={21} />
              </button>
            </div>
          </div>

          {/* Editorial Split Media Showcase: Real Portrait & Macro Iris Saccades Video */}
          <div className="perception-media-grid">
            {/* Left: Editorial Portrait with Precision Corner Biometrics & FACS Telemetry */}
            <div className="perception-portrait-card">
              <div className="editorial-media-wrap">
                <img
                  src="/media/images/portrait-perception.jpg"
                  alt="Biometric facial landmark analysis on human portrait"
                  className="editorial-media-img"
                  loading="lazy"
                />
                <div className="editorial-media-vignette" />

                {/* Minimal Precision Corner Frame Overlay */}
                <div className="biometric-corner-box">
                  <div className="corner-bracket corner-top-left" />
                  <div className="corner-bracket corner-top-right" />
                  <div className="corner-bracket corner-bottom-left" />
                  <div className="corner-bracket corner-bottom-right" />
                  <div className="biometric-reticle-center">
                    <span className="reticle-crosshair-h" />
                    <span className="reticle-crosshair-v" />
                    <span className="reticle-ring" />
                  </div>
                </div>

                {/* Saccadic Focal Tracker on Iris */}
                <div className="iris-focal-target left-eye-target">
                  <span className="focal-dot" />
                  <span className="focal-ring" />
                  <span className="focal-coord">GZ_L: 0.442 / -0.18</span>
                </div>
                <div className="iris-focal-target right-eye-target">
                  <span className="focal-dot" />
                  <span className="focal-ring" />
                  <span className="focal-coord">GZ_R: 0.439 / -0.19</span>
                </div>

                {/* Telemetry Pills */}
                <div className="portrait-hud-badge top-badge">
                  <span className="status-dot animate-pulse-dot" />
                  <span>FERPLUS // 468 PTS · LATENCY 11.2ms</span>
                </div>
                <div className="portrait-hud-badge bottom-badge">
                  <span>CONFIDENCE 99.4% · LOCAL RUNTIME</span>
                </div>
              </div>

              <div className="perception-facs-dock">
                <div className="facs-header">
                  <span className="facs-title">FACIAL ACTION CODING SYSTEM (FACS)</span>
                  <span className="facs-rate">LIVE 60Hz</span>
                </div>
                <div className="facs-bars-grid">
                  <div className="facs-bar-item">
                    <div className="facs-bar-label">
                      <span>AU01 INNER BROW RAISER</span>
                      <b>84%</b>
                    </div>
                    <div className="facs-track"><div className="facs-fill" style={{ width: '84%' }} /></div>
                  </div>
                  <div className="facs-bar-item">
                    <div className="facs-bar-label">
                      <span>AU04 BROW LOWERER</span>
                      <b>14%</b>
                    </div>
                    <div className="facs-track"><div className="facs-fill" style={{ width: '14%' }} /></div>
                  </div>
                  <div className="facs-bar-item">
                    <div className="facs-bar-label">
                      <span>AU12 LIP CORNER PULL</span>
                      <b>92%</b>
                    </div>
                    <div className="facs-track"><div className="facs-fill" style={{ width: '92%' }} /></div>
                  </div>
                  <div className="facs-bar-item">
                    <div className="facs-bar-label">
                      <span>AU25 LIPS PART</span>
                      <b>38%</b>
                    </div>
                    <div className="facs-track"><div className="facs-fill" style={{ width: '38%' }} /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Macro Iris Video Footage + Gaze Telemetry */}
            <div className="perception-iris-card">
              <div className="editorial-media-wrap video-wrap">
                <video
                  className="editorial-media-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/media/posters/perception-iris-poster.jpg"
                  src="/media/video/perception-iris.mp4"
                />
                <div className="editorial-media-vignette" />

                <div className="iris-telemetry-overlay">
                  <div className="iris-aperture-reticle">
                    <span className="aperture-crosshair" />
                    <span className="aperture-ring-outer" />
                    <span className="aperture-ring-inner" />
                  </div>
                  <div className="iris-stats-dock">
                    <div className="iris-stat-row">
                      <span>PUPIL APERTURE</span>
                      <b>3.42 mm</b>
                    </div>
                    <div className="iris-stat-row">
                      <span>SACCADE VELOCITY</span>
                      <b>280 deg/s</b>
                    </div>
                    <div className="iris-stat-row">
                      <span>FIXATION ACCURACY</span>
                      <b>98.8%</b>
                    </div>
                  </div>
                </div>

                <div className="portrait-hud-badge top-badge">
                  <span className="beacon-dot" />
                  <span>OCULAR DYNAMICS // SACCADES</span>
                </div>
              </div>

              <div className="iris-card-caption">
                <h4>Continuous Affective Signal Detection</h4>
                <p>
                  By measuring minute pupillary changes and ocular fixation patterns,
                  AURA reconstructs user engagement and attention states with cryptographic privacy.
                </p>
                <button
                  type="button"
                  className="pill-btn-dark"
                  onClick={() => setStudioOpen(true)}
                  onMouseEnter={() => setCursorLabel('STUDIO')}
                  onMouseLeave={() => setCursorLabel(null)}
                >
                  <span className="pill-dot animate-dot-pulse" /> TEST WEBCAM IN STUDIO
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ========================================================
           02 — SPATIAL KINEMATICS & HAND GESTURE DYNAMICS
           ======================================================== */}
        <motion.section
          className="gestures-section"
          id="gestures"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-kicker">
            <span>02 — SPATIAL KINEMATICS</span>
            <span>21-POINT HAND SKELETON TRACKING</span>
          </div>

          <div className="gestures-layout">
            <div className="gestures-copy">
              <h2>
                Touchless control.<br />
                <span className="muted-heading">Sculpted in light.</span>
              </h2>
              <p>
                Real-time 21-point hand skeleton tracking mapped directly to dynamic WebGL particle physics.
                Wave, pinch, or gesture in front of your camera to manipulate 3D perception forms seamlessly in space.
              </p>

              {/* Interactive Gesture Simulator Pill Buttons */}
              <div className="gesture-interactive-dock">
                <span className="dock-label">TRIGGER GESTURE STATES IN BROWSER:</span>
                <div className="gesture-pill-group">
                  <button
                    type="button"
                    className={`gesture-trigger-pill ${visualMode === 'expansion' ? 'active' : ''}`}
                    onClick={() => setVisualMode('expansion')}
                  >
                    <span className="gt-dot" /> OPEN PALM (EXPAND)
                  </button>
                  <button
                    type="button"
                    className={`gesture-trigger-pill ${visualMode === 'compression' ? 'active' : ''}`}
                    onClick={() => setVisualMode('compression')}
                  >
                    <span className="gt-dot" /> CLOSED FIST (CORE)
                  </button>
                  <button
                    type="button"
                    className={`gesture-trigger-pill ${visualMode === 'vortex' ? 'active' : ''}`}
                    onClick={() => setVisualMode('vortex')}
                  >
                    <span className="gt-dot" /> VICTORY (VORTEX)
                  </button>
                  <button
                    type="button"
                    className={`gesture-trigger-pill ${visualMode === 'orbit' ? 'active' : ''}`}
                    onClick={() => setVisualMode('orbit')}
                  >
                    <span className="gt-dot" /> RESET (ORBIT)
                  </button>
                </div>
              </div>

              <div className="gesture-telemetry-strip">
                <div className="gt-stat">
                  <span>KINEMATIC JOINTS</span>
                  <b>21 POINTS / HAND</b>
                </div>
                <div className="gt-stat">
                  <span>INFERENCE LATENCY</span>
                  <b>&lt; 8.4 MS</b>
                </div>
                <div className="gt-stat">
                  <span>GESTURE RECOGNITION</span>
                  <b>100% CLIENT-SIDE</b>
                </div>
              </div>
            </div>

            {/* Real Hand Footage Video Container with Spatial Kinematic HUD */}
            <div className="gestures-media-card">
              <div className="editorial-media-wrap video-wrap">
                <video
                  className="editorial-media-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/media/posters/gesture-hands-poster.jpg"
                  src="/media/video/gesture-hands.mp4"
                />
                <div className="editorial-media-vignette" />

                {/* Spatial Skeleton Overlay Simulation */}
                <div className="hand-skeleton-overlay">
                  <div className="hand-joint wrist" />
                  <div className="hand-joint thumb-1" />
                  <div className="hand-joint thumb-2" />
                  <div className="hand-joint index-1" />
                  <div className="hand-joint index-2" />
                  <div className="hand-joint middle-1" />
                  <div className="hand-joint middle-2" />
                  <div className="hand-joint ring-1" />
                  <div className="hand-joint pinky-1" />
                  <svg className="hand-bones-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="50" y1="80" x2="35" y2="60" stroke="#c1ff00" strokeWidth="1.2" strokeDasharray="3 3" />
                    <line x1="50" y1="80" x2="45" y2="45" stroke="#c1ff00" strokeWidth="1.2" strokeDasharray="3 3" />
                    <line x1="50" y1="80" x2="55" y2="42" stroke="#c1ff00" strokeWidth="1.2" strokeDasharray="3 3" />
                    <line x1="50" y1="80" x2="65" y2="48" stroke="#c1ff00" strokeWidth="1.2" strokeDasharray="3 3" />
                    <line x1="50" y1="80" x2="72" y2="58" stroke="#c1ff00" strokeWidth="1.2" strokeDasharray="3 3" />
                  </svg>
                  <div className="hand-status-tag">
                    <span className="beacon-dot" /> ACTIVE GESTURE: {visualMode.toUpperCase()}
                  </div>
                </div>

                <div className="portrait-hud-badge top-badge">
                  <span className="status-dot animate-pulse-dot" />
                  <span>SPATIAL COMPUTING // KINEMATICS</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ========================================================
           03 — HARDWARE & RUNTIME (ASYMMETRIC EDITORIAL)
           ======================================================== */}
        <motion.section
          className="technology-section"
          id="technology"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-kicker">
            <span>03 — HARDWARE & RUNTIME</span>
            <span>ASYMMETRIC ZERO-COPY PIPELINE</span>
          </div>

          <div className="technology-heading">
            <h2>
              Perception, in<br />
              <span className="gradient-text">real time.</span>
            </h2>
            <p>
              Lightweight vision models running at hardware-accelerated speeds.
              Immediate feedback without server roundtrips.
            </p>
          </div>

          {/* Asymmetric Editorial Media Grid */}
          <div className="tech-editorial-grid">
            {/* Panel A: Wide Camera Sensor & Optics Photography */}
            <div className="tech-panel wide-panel">
              <div className="tech-panel-media">
                <img
                  src="/media/images/camera-optic.jpg"
                  alt="High-precision camera sensor and optics"
                  className="tech-panel-img"
                  loading="lazy"
                />
                <div className="tech-panel-vignette" />
                <div className="tech-tag">OPTICS // ZERO-COPY INGESTION</div>
              </div>
              <div className="tech-panel-body">
                <div className="tech-kicker-row">
                  <span>INPUT LAYER</span>
                  <Camera size={16} />
                </div>
                <h3>Sub-Millimeter Optical Extraction</h3>
                <p>
                  Zero-copy WebCodecs buffers ingest raw camera frames directly into GPU memory,
                  bypassing the CPU serialization bottleneck for ultra-low latency processing.
                </p>
                <div className="tech-metrics-row">
                  <span className="metric-chip">1080P @ 60 FPS</span>
                  <span className="metric-chip">ZERO LATENCY INGEST</span>
                  <span className="metric-chip">RGBA HARDWARE SHADER</span>
                </div>
              </div>
            </div>

            {/* Panel B: Neural Silicon Video Loop */}
            <div className="tech-panel vertical-panel">
              <div className="tech-panel-media video-panel-media">
                <video
                  className="tech-panel-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="/media/posters/neural-chip-poster.jpg"
                  src="/media/video/neural-chip.mp4"
                />
                <div className="tech-panel-vignette" />
                <div className="tech-tag">SILICON // WASM SIMD</div>
              </div>
              <div className="tech-panel-body">
                <div className="tech-kicker-row">
                  <span>CORE INFERENCE</span>
                  <Cpu size={16} />
                </div>
                <h3>Browser-Native Tensor Core</h3>
                <p>
                  Quantized neural weights executed via WebAssembly SIMD and WebGPU compute shaders,
                  delivering desktop workstation inference speeds in any modern browser.
                </p>
                <div className="tech-metrics-row">
                  <span className="metric-chip">SIMD VECTORIZED</span>
                  <span className="metric-chip">12ms TICK TIME</span>
                </div>
              </div>
            </div>

            {/* Panel C: Tactile Hands Interaction Photography */}
            <div className="tech-panel standard-panel">
              <div className="tech-panel-media">
                <img
                  src="/media/images/hands-interaction.jpg"
                  alt="Spatial hand interaction and dynamic interface"
                  className="tech-panel-img"
                  loading="lazy"
                />
                <div className="tech-panel-vignette" />
                <div className="tech-tag">SPATIAL // 3D CANVAS</div>
              </div>
              <div className="tech-panel-body">
                <div className="tech-kicker-row">
                  <span>OUTPUT MANIFOLD</span>
                  <Sparkles size={16} />
                </div>
                <h3>Hardware Accelerated WebGL</h3>
                <p>
                  Biometric coordinates drive real-time procedural particle meshes and fluid shader surfaces
                  in Three.js with zero drop in browser framerates.
                </p>
                <div className="tech-metrics-row">
                  <span className="metric-chip">THREE.JS / R3F</span>
                  <span className="metric-chip">FLOAT PARTICLE SYSTEM</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ========================================================
           04 — PRIVACY BY ARCHITECTURE (PHYSICAL SILICON WAFER)
           ======================================================== */}
        <motion.section
          className="privacy-section"
          id="privacy"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="privacy-symbol">
            <ShieldCheck size={28} />
            <div className="privacy-pulse" />
          </div>
          <div className="privacy-copy">
            <span className="eyebrow">04 — VERIFIED PRIVACY ARCHITECTURE</span>
            <h2>
              Private by<br />
              <span className="muted-heading">architecture.</span>
            </h2>
            <p>
              AURA operates under strict zero-trust edge principles. Your video stream is processed entirely within
              your browser's local sandbox memory. No frames, landmark coordinates, or telemetry are ever transmitted
              to external cloud servers or recorded to persistent storage.
            </p>
            <div className="privacy-points">
              <span><Check size={15} /> 100% In-Browser Execution</span>
              <span><Check size={15} /> Zero Cloud Transmissions (Air-Gapped)</span>
              <span><Check size={15} /> Instant Permission Revocation</span>
              <span><Check size={15} /> No Persistent Facial Datasets</span>
            </div>
          </div>
          {/* Real Silicon Wafer Photography + Hardware Sandbox HUD */}
          <div className="privacy-edge-card">
            <div className="editorial-media-wrap">
              <img
                src="/media/images/privacy-edge.jpg"
                alt="Physical silicon wafer and edge hardware architecture"
                className="editorial-media-img"
                loading="lazy"
              />
              <div className="editorial-media-vignette" />
              <div className="privacy-overlay-hud">
                <div className="privacy-lock-badge">
                  <ShieldCheck size={32} />
                  <span>LOCAL ENCLAVE VERIFIED</span>
                </div>
                <div className="privacy-telemetry-tag">
                  <span>OUTBOUND TRAFFIC: 0.00 KB</span>
                  <span>ENCLAVE STATUS: SECURE</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ========================================================
           05 — CLOSING / CTA (FULL BLEED EDITORIAL PORTRAIT)
           ======================================================== */}
        <motion.section
          className="closing-section"
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="closing-media-backdrop">
            <img
              src="/media/images/closing-portrait.jpg"
              alt="Direct-gaze cinematic portrait"
              className="closing-backdrop-img"
              loading="lazy"
            />
            <div className="closing-backdrop-gradient" />
          </div>

          <div className="closing-content-layer">
            <div className="closing-overline">
              <span>READY WHEN YOU ARE</span>
              <span>END OF TRANSMISSION / 005</span>
            </div>
            <h2>
              Give the frame<br />
              a <span className="gradient-text">new dimension.</span>
            </h2>
            <p className="closing-subtext">
              Step into the studio to experience real-time 468-point facial tracking,
              affective expression analysis, and touchless spatial hand interaction.
            </p>
            <button
              className="button-primary closing-button"
              onClick={() => setStudioOpen(true)}
              onMouseEnter={() => setCursorLabel('LAUNCH')}
              onMouseLeave={() => setCursorLabel(null)}
            >
              Launch AURA studio <ArrowRight size={17} />
            </button>
          </div>
        </motion.section>
      </main>
      <footer className="site-footer">
        <a className="brand-lockup" href="#home"><span className="brand-mark"><AudioWaveform size={17}/></span><span>AURA<span className="brand-light">/AI</span></span></a>
        <span className="footer-center">AN EXPERIMENT IN BROWSER-BASED PERCEPTION.</span>
        <a className="footer-link" href="https://github.com/" target="_blank" rel="noreferrer">GITHUB <Github size={14}/></a>
        <span className="footer-year">© 2026</span>
      </footer>
      <AnimatePresence>
        {studioOpen && (
          <StudioModal
            onClose={() => setStudioOpen(false)}
            onGestureChange={(gMode) => setVisualMode(gMode)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
