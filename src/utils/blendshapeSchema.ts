/**
 * Canonical MediaPipe FaceLandmarker blendshape feature schema.
 * Defines the exact 52 blendshape coefficients, their indices, and anatomical descriptions.
 */

export const MEDIAPIPE_52_BLENDSHAPES = [
  '_neutral',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'cheekPuff',
  'cheekSquintLeft',
  'cheekSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeLookDownLeft',
  'eyeLookDownRight',
  'eyeLookInLeft',
  'eyeLookInRight',
  'eyeLookOutLeft',
  'eyeLookOutRight',
  'eyeLookUpLeft',
  'eyeLookUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'jawForward',
  'jawLeft',
  'jawOpen',
  'jawRight',
  'mouthClose',
  'mouthDimpleLeft',
  'mouthDimpleRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'mouthFunnel',
  'mouthLeft',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthPucker',
  'mouthRight',
  'mouthRollLower',
  'mouthRollUpper',
  'mouthShrugLower',
  'mouthShrugUpper',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthStretchLeft',
  'mouthStretchRight',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'noseSneerLeft',
  'noseSneerRight'
] as const;

export type BlendshapeName = typeof MEDIAPIPE_52_BLENDSHAPES[number];

export type BlendshapeCoefficients = Record<BlendshapeName, number>;

/**
 * Extracts a normalized 52-dimensional feature vector in strictly canonical order.
 */
export function extract52FeatureVector(
  categories?: Array<{ categoryName: string; score: number }>
): Float32Array {
  const vector = new Float32Array(52);
  if (!categories || categories.length === 0) return vector;

  const scoreMap: Record<string, number> = {};
  for (let i = 0; i < categories.length; i++) {
    scoreMap[categories[i].categoryName] = categories[i].score;
  }

  for (let i = 0; i < MEDIAPIPE_52_BLENDSHAPES.length; i++) {
    const name = MEDIAPIPE_52_BLENDSHAPES[i];
    vector[i] = scoreMap[name] ?? 0;
  }

  return vector;
}
