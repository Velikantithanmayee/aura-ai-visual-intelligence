import type { FacialMovementName, FacialMovementState } from '../types/studio';

export interface MovementRule {
  id: FacialMovementName;
  label: string;
  threshold: number;
  sources: string[];
  compute: (b: Record<string, number>) => number;
}

/**
 * 17 Observable Facial Movements directly evaluated from MediaPipe 52 coefficients.
 * Strictly decoupled from internal emotion classification.
 */
export const FACIAL_MOVEMENT_RULES: MovementRule[] = [
  {
    id: 'smile',
    label: 'Smile Activation',
    threshold: 0.32,
    sources: ['mouthSmileLeft', 'mouthSmileRight'],
    compute: b => ((b['mouthSmileLeft'] ?? 0) + (b['mouthSmileRight'] ?? 0)) / 2
  },
  {
    id: 'smirk',
    label: 'Smirk / Asymmetric Smile',
    threshold: 0.28,
    sources: ['mouthSmileLeft', 'mouthSmileRight'],
    compute: b => {
      const left = b['mouthSmileLeft'] ?? 0;
      const right = b['mouthSmileRight'] ?? 0;
      return Math.abs(left - right) * (Math.max(left, right) > 0.3 ? 1.5 : 0.8);
    }
  },
  {
    id: 'frown',
    label: 'Frown / Depressor Contraction',
    threshold: 0.25,
    sources: ['mouthFrownLeft', 'mouthFrownRight'],
    compute: b => ((b['mouthFrownLeft'] ?? 0) + (b['mouthFrownRight'] ?? 0)) / 2
  },
  {
    id: 'raised_eyebrows',
    label: 'Raised Eyebrows',
    threshold: 0.30,
    sources: ['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'],
    compute: b =>
      (b['browInnerUp'] ?? 0) * 0.5 +
      (((b['browOuterUpLeft'] ?? 0) + (b['browOuterUpRight'] ?? 0)) / 2) * 0.5
  },
  {
    id: 'furrowed_eyebrows',
    label: 'Furrowed Eyebrows',
    threshold: 0.28,
    sources: ['browDownLeft', 'browDownRight'],
    compute: b => ((b['browDownLeft'] ?? 0) + (b['browDownRight'] ?? 0)) / 2
  },
  {
    id: 'widened_eyes',
    label: 'Widened Eyes',
    threshold: 0.30,
    sources: ['eyeWideLeft', 'eyeWideRight'],
    compute: b => ((b['eyeWideLeft'] ?? 0) + (b['eyeWideRight'] ?? 0)) / 2
  },
  {
    id: 'squinting',
    label: 'Squinting / Ocular Tension',
    threshold: 0.32,
    sources: ['eyeSquintLeft', 'eyeSquintRight', 'cheekSquintLeft', 'cheekSquintRight'],
    compute: b =>
      ((b['eyeSquintLeft'] ?? 0) +
        (b['eyeSquintRight'] ?? 0) +
        (b['cheekSquintLeft'] ?? 0) +
        (b['cheekSquintRight'] ?? 0)) /
      4
  },
  {
    id: 'blinking',
    label: 'Blinking / Eyelid Flurry',
    threshold: 0.45,
    sources: ['eyeBlinkLeft', 'eyeBlinkRight'],
    compute: b => Math.max(b['eyeBlinkLeft'] ?? 0, b['eyeBlinkRight'] ?? 0)
  },
  {
    id: 'eyes_closed',
    label: 'Eyes Closed',
    threshold: 0.70,
    sources: ['eyeBlinkLeft', 'eyeBlinkRight'],
    compute: b => ((b['eyeBlinkLeft'] ?? 0) + (b['eyeBlinkRight'] ?? 0)) / 2
  },
  {
    id: 'mouth_open',
    label: 'Mouth Open',
    threshold: 0.26,
    sources: ['jawOpen', 'mouthClose'],
    compute: b => Math.max(0, (b['jawOpen'] ?? 0) - (b['mouthClose'] ?? 0) * 0.5)
  },
  {
    id: 'jaw_drop',
    label: 'Jaw Drop / Deep Aperture',
    threshold: 0.48,
    sources: ['jawOpen'],
    compute: b => b['jawOpen'] ?? 0
  },
  {
    id: 'lip_pressing',
    label: 'Lip Pressing',
    threshold: 0.25,
    sources: ['mouthPressLeft', 'mouthPressRight', 'mouthClose'],
    compute: b =>
      ((b['mouthPressLeft'] ?? 0) +
        (b['mouthPressRight'] ?? 0) +
        (b['mouthClose'] ?? 0)) /
      3
  },
  {
    id: 'lip_puckering',
    label: 'Lip Puckering',
    threshold: 0.30,
    sources: ['mouthPucker', 'mouthFunnel'],
    compute: b => Math.max(b['mouthPucker'] ?? 0, b['mouthFunnel'] ?? 0)
  },
  {
    id: 'cheek_puffing',
    label: 'Cheek Puffing',
    threshold: 0.30,
    sources: ['cheekPuff'],
    compute: b => b['cheekPuff'] ?? 0
  },
  {
    id: 'nose_wrinkling',
    label: 'Nose Wrinkling',
    threshold: 0.28,
    sources: ['noseSneerLeft', 'noseSneerRight'],
    compute: b => ((b['noseSneerLeft'] ?? 0) + (b['noseSneerRight'] ?? 0)) / 2
  },
  {
    id: 'mouth_stretching',
    label: 'Mouth Stretching (Lateral)',
    threshold: 0.30,
    sources: ['mouthStretchLeft', 'mouthStretchRight'],
    compute: b => ((b['mouthStretchLeft'] ?? 0) + (b['mouthStretchRight'] ?? 0)) / 2
  },
  {
    id: 'asymmetric_movement',
    label: 'Asymmetric Facial Motion',
    threshold: 0.22,
    sources: ['mouthLeft', 'mouthRight', 'jawLeft', 'jawRight', 'mouthDimpleLeft', 'mouthDimpleRight'],
    compute: b => {
      const mouthAsym = Math.abs((b['mouthLeft'] ?? 0) - (b['mouthRight'] ?? 0));
      const jawAsym = Math.abs((b['jawLeft'] ?? 0) - (b['jawRight'] ?? 0));
      const dimpleAsym = Math.abs((b['mouthDimpleLeft'] ?? 0) - (b['mouthDimpleRight'] ?? 0));
      return Math.min(1, mouthAsym * 1.2 + jawAsym * 1.5 + dimpleAsym);
    }
  }
];

export class FacialMovementDetector {
  /**
   * Detects all simultaneous facial movements from raw blendshape dictionary.
   */
  public detectMovements(blendshapes: Record<string, number>): FacialMovementState[] {
    return FACIAL_MOVEMENT_RULES.map(rule => {
      const rawIntensity = rule.compute(blendshapes);
      const intensity = Math.min(1, Math.max(0, Math.round(rawIntensity * 100) / 100));
      const isActive = intensity >= rule.threshold;

      return {
        id: rule.id,
        label: rule.label,
        intensity,
        isActive,
        threshold: rule.threshold,
        sourceBlendshapes: rule.sources
      };
    });
  }
}

export const facialMovementDetector = new FacialMovementDetector();
