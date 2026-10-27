export type StudioMode = 'face' | 'expression' | 'gesture';

export type VisionState = 'idle' | 'loading' | 'running' | 'error';

export type VisualizationTheme = 'cyan' | 'violet' | 'emerald' | 'amber';

export interface ThemeColors {
  primary: string;
  glow: string;
  border: string;
  bgGlow: string;
  name: string;
}

export const THEMES: Record<VisualizationTheme, ThemeColors> = {
  cyan: {
    primary: '#1a2ffb',
    glow: 'rgba(26, 47, 251, 0.55)',
    border: 'rgba(26, 47, 251, 0.45)',
    bgGlow: 'rgba(26, 47, 251, 0.12)',
    name: 'Lusion Cobalt'
  },
  emerald: {
    primary: '#c1ff00',
    glow: 'rgba(193, 255, 0, 0.55)',
    border: 'rgba(193, 255, 0, 0.45)',
    bgGlow: 'rgba(193, 255, 0, 0.12)',
    name: 'Volt Green'
  },
  violet: {
    primary: '#8832f7',
    glow: 'rgba(136, 50, 247, 0.55)',
    border: 'rgba(136, 50, 247, 0.45)',
    bgGlow: 'rgba(136, 50, 247, 0.12)',
    name: 'Ultraviolet'
  },
  amber: {
    primary: '#ff4c41',
    glow: 'rgba(255, 76, 65, 0.55)',
    border: 'rgba(255, 76, 65, 0.45)',
    bgGlow: 'rgba(255, 76, 65, 0.12)',
    name: 'Neon Coral'
  }
};

// ==========================================
// GROUP A: 8 BASIC EXPRESSIONS
// ==========================================
export type BasicExpressionName =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'surprised'
  | 'contempt';

export type ExpressionCategoryName = BasicExpressionName;

export type BasicExpressionScores = Record<BasicExpressionName, number>;


// ==========================================
// GROUP B: 11 COMPOUND EXPRESSIONS
// ==========================================
export type CompoundExpressionName =
  | 'happily_surprised'
  | 'happily_disgusted'
  | 'sadly_fearful'
  | 'sadly_angry'
  | 'sadly_surprised'
  | 'sadly_disgusted'
  | 'fearfully_angry'
  | 'fearfully_surprised'
  | 'angrily_surprised'
  | 'angrily_disgusted'
  | 'disgustedly_surprised';

export interface CompoundExpressionResult {
  category: CompoundExpressionName | 'none';
  label: string;
  confidence: number;
  rawScore: number;
  isExperimental: boolean;
  supportLevel: 'validated' | 'moderate' | 'low_support';
  components: [BasicExpressionName, BasicExpressionName];
  description: string;
}

// ==========================================
// GROUP C: 17 FACIAL MOVEMENT INDICATORS
// ==========================================
export type FacialMovementName =
  | 'smile'
  | 'smirk'
  | 'frown'
  | 'raised_eyebrows'
  | 'furrowed_eyebrows'
  | 'widened_eyes'
  | 'squinting'
  | 'blinking'
  | 'eyes_closed'
  | 'mouth_open'
  | 'jaw_drop'
  | 'lip_pressing'
  | 'lip_puckering'
  | 'cheek_puffing'
  | 'nose_wrinkling'
  | 'mouth_stretching'
  | 'asymmetric_movement';

export interface FacialMovementState {
  id: FacialMovementName;
  label: string;
  intensity: number; // 0.0 to 1.0
  isActive: boolean;
  threshold: number;
  sourceBlendshapes: string[];
}

export interface FaceQualityState {
  isTooSmall: boolean;
  isOffCenter: boolean;
  faceWidth: number;
  faceHeight: number;
  guidance: string;
}

export interface ExpressionAnalysisResult {
  // Group A: Basic Expression
  label: string;
  category: BasicExpressionName | 'uncertain';
  confidence: number;
  rawScores: BasicExpressionScores;
  smoothedScores: BasicExpressionScores;
  description: string;
  emoji: string;
  isNeutral: boolean;
  isUncertain: boolean;

  // Group B: Compound Expression
  compound: CompoundExpressionResult;

  // Group C: Observable Facial Movements
  movements: FacialMovementState[];
  activeMovementsCount: number;

  // 52 Raw Blendshapes telemetry
  allBlendshapes: Record<string, number>;

  // Telemetry & Quality
  faceDetected: boolean;
  quality: FaceQualityState;
}

export interface HistoryPoint {
  timestamp: number;
  score: number;
  label: string;
}

export interface StudioSettings {
  showMesh: boolean;
  showBoundingBox: boolean;
  showParticles: boolean;
  theme: VisualizationTheme;
}

export interface TelemetryState {
  fps: number;
  latency: number;
  detectedCount: number;
  sessionDuration: number;
  streamResolution: string;
}

export interface TrackingEvent {
  id: string;
  message: string;
  timestamp: string;
  category: 'system' | 'detection' | 'mode';
}
