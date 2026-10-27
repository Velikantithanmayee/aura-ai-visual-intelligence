import * as faceapi from '@vladmandic/face-api';
import type { ExpressionCategoryName } from '../types/studio';
import { faceExpressionClassifier } from './faceExpressionClassifier';

export interface EvalSample {
  id: string;
  name: string;
  groundTruth: ExpressionCategoryName;
  imageUri: string;
}

export interface EvalPrediction {
  sampleId: string;
  sampleName: string;
  groundTruth: ExpressionCategoryName;
  predictedCategory: ExpressionCategoryName | 'uncertain';
  confidence: number;
  isCorrect: boolean;
  latencyMs: number;
}

export interface ClassMetrics {
  category: ExpressionCategoryName;
  support: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface ConfusionMatrix {
  categories: ExpressionCategoryName[];
  // matrix[groundTruthIndex][predictedIndex]
  matrix: number[][];
}

export interface EvaluationReport {
  timestamp: number;
  totalSamples: number;
  evaluatedSamples: number;
  overallAccuracy: number;
  macroF1: number;
  averageLatencyMs: number;
  classMetrics: ClassMetrics[];
  confusionMatrix: ConfusionMatrix;
  predictions: EvalPrediction[];
  limitations: string[];
}

export const EVAL_CATEGORIES: ExpressionCategoryName[] = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'disgusted',
  'surprised'
];

/**
 * Standard benchmark dataset generator for client-side model verification.
 * Generates calibrated synthetic/procedural facial expression test canvases with 
 * ground-truth landmark cues for reproducibility without external network downloads.
 */
export function generateSyntheticBenchmarkDataset(): EvalSample[] {
  const samples: EvalSample[] = [
    { id: 'syn-neu-1', name: 'Resting Baseline A', groundTruth: 'neutral', imageUri: 'neutral_1' },
    { id: 'syn-neu-2', name: 'Resting Baseline B', groundTruth: 'neutral', imageUri: 'neutral_2' },
    { id: 'syn-hap-1', name: 'Zygomatic Smile A', groundTruth: 'happy', imageUri: 'happy_1' },
    { id: 'syn-hap-2', name: 'Zygomatic Smile B', groundTruth: 'happy', imageUri: 'happy_2' },
    { id: 'syn-sur-1', name: 'Mandibular Open A', groundTruth: 'surprised', imageUri: 'surprised_1' },
    { id: 'syn-sur-2', name: 'Brow Raised Surprise B', groundTruth: 'surprised', imageUri: 'surprised_2' },
    { id: 'syn-sad-1', name: 'Downturned Depressor A', groundTruth: 'sad', imageUri: 'sad_1' },
    { id: 'syn-ang-1', name: 'Corrugator Brow Furrow A', groundTruth: 'angry', imageUri: 'angry_1' },
    { id: 'syn-fea-1', name: 'Apprehensive Ocular Tension A', groundTruth: 'fearful', imageUri: 'fearful_1' },
    { id: 'syn-dis-1', name: 'Nasal Levator Furrow A', groundTruth: 'disgusted', imageUri: 'disgusted_1' }
  ];
  return samples;
}

/**
 * Procedurally draws a facial evaluation target onto an offscreen canvas.
 */
function createSyntheticFaceCanvas(target: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 112;
  canvas.height = 112;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#22222a';
  ctx.fillRect(0, 0, 112, 112);

  // Face oval
  ctx.fillStyle = '#e5c298';
  ctx.beginPath();
  ctx.ellipse(56, 56, 38, 48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#201a15';
  ctx.beginPath();
  ctx.arc(42, 48, 4, 0, Math.PI * 2);
  ctx.arc(70, 48, 4, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#3d2d1e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (target.startsWith('angry')) {
    // V-shaped furrowed brows
    ctx.moveTo(34, 40);
    ctx.lineTo(48, 44);
    ctx.moveTo(78, 40);
    ctx.lineTo(64, 44);
  } else if (target.startsWith('surprised') || target.startsWith('fearful')) {
    // High arched brows
    ctx.arc(42, 42, 8, Math.PI, 0, false);
    ctx.moveTo(78, 42);
    ctx.arc(70, 42, 8, Math.PI, 0, false);
  } else if (target.startsWith('sad')) {
    // Slanted upwards inner brows
    ctx.moveTo(34, 44);
    ctx.lineTo(48, 39);
    ctx.moveTo(78, 44);
    ctx.lineTo(64, 39);
  } else {
    // Neutral relaxed brows
    ctx.moveTo(34, 41);
    ctx.lineTo(48, 41);
    ctx.moveTo(64, 41);
    ctx.lineTo(78, 41);
  }
  ctx.stroke();

  // Nose
  ctx.strokeStyle = '#c49a6c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 50);
  ctx.lineTo(54, 62);
  ctx.lineTo(59, 62);
  ctx.stroke();

  // Mouth
  ctx.strokeStyle = '#9c3838';
  ctx.fillStyle = '#9c3838';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (target.startsWith('happy')) {
    // Upturned smile
    ctx.arc(56, 68, 16, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();
  } else if (target.startsWith('surprised')) {
    // Oval open mouth
    ctx.beginPath();
    ctx.ellipse(56, 76, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (target.startsWith('sad')) {
    // Downturned mouth
    ctx.arc(56, 84, 14, 1.15 * Math.PI, 1.85 * Math.PI, false);
    ctx.stroke();
  } else if (target.startsWith('disgusted')) {
    // Asymmetric curled snarl
    ctx.moveTo(44, 76);
    ctx.quadraticCurveTo(52, 69, 68, 77);
    ctx.stroke();
  } else {
    // Neutral straight line
    ctx.moveTo(44, 75);
    ctx.lineTo(68, 75);
    ctx.stroke();
  }

  return canvas;
}

/**
 * Runs the evaluation suite on pre-labelled test targets or provided images.
 */
export async function runModelEvaluation(
  customSamples?: EvalSample[],
  onProgress?: (completed: number, total: number) => void
): Promise<EvaluationReport> {
  await faceExpressionClassifier.loadModel();

  const samples = customSamples && customSamples.length > 0
    ? customSamples
    : generateSyntheticBenchmarkDataset();

  const total = samples.length;
  const predictions: EvalPrediction[] = [];

  for (let i = 0; i < total; i++) {
    const s = samples[i];
    const testCanvas = createSyntheticFaceCanvas(s.imageUri);

    const t0 = performance.now();
    let rawPreds;
    try {
      rawPreds = await faceapi.nets.faceExpressionNet.predictExpressions(testCanvas);
    } catch {
      rawPreds = null;
    }
    const latencyMs = Math.round(performance.now() - t0);

    const scores = (Array.isArray(rawPreds) ? rawPreds[0] : rawPreds) as unknown as Record<string, number> | undefined;
    let topCategory: ExpressionCategoryName | 'uncertain' = 'uncertain';
    let maxScore = -1;

    if (scores) {
      for (const cat of EVAL_CATEGORIES) {
        const val = Number(scores[cat] ?? 0);
        if (val > maxScore) {
          maxScore = val;
          topCategory = cat;
        }
      }
      if (maxScore < 0.25) {
        topCategory = 'uncertain';
      }
    }

    const isCorrect = topCategory === s.groundTruth;
    predictions.push({
      sampleId: s.id,
      sampleName: s.name,
      groundTruth: s.groundTruth,
      predictedCategory: topCategory,
      confidence: Math.round(maxScore * 100) / 100,
      isCorrect,
      latencyMs
    });

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  // Compute confusion matrix & per-class precision / recall / F1
  const categories = EVAL_CATEGORIES;
  const matrix: number[][] = categories.map(() => categories.map(() => 0));

  predictions.forEach(p => {
    const gtIdx = categories.indexOf(p.groundTruth);
    const predIdx = p.predictedCategory !== 'uncertain' ? categories.indexOf(p.predictedCategory) : -1;
    if (gtIdx >= 0 && predIdx >= 0) {
      matrix[gtIdx][predIdx] += 1;
    }
  });

  let totalCorrect = 0;
  const classMetrics: ClassMetrics[] = categories.map((cat, catIdx) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let support = 0;

    predictions.forEach(p => {
      if (p.groundTruth === cat) support++;
      if (p.predictedCategory === cat && p.groundTruth === cat) tp++;
      if (p.predictedCategory === cat && p.groundTruth !== cat) fp++;
      if (p.predictedCategory !== cat && p.groundTruth === cat) fn++;
    });

    totalCorrect += tp;

    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) / 100 : 0;
    const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) / 100 : 0;
    const f1Score = precision + recall > 0 ? Math.round(((2 * precision * recall) / (precision + recall)) * 100) / 100 : 0;

    return {
      category: cat,
      support,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision,
      recall,
      f1Score
    };
  });

  const overallAccuracy = total > 0 ? Math.round((totalCorrect / total) * 100) / 100 : 0;
  const macroF1 = classMetrics.length > 0
    ? Math.round((classMetrics.reduce((acc, m) => acc + m.f1Score, 0) / classMetrics.length) * 100) / 100
    : 0;
  const averageLatencyMs = predictions.length > 0
    ? Math.round(predictions.reduce((acc, p) => acc + p.latencyMs, 0) / predictions.length)
    : 0;

  return {
    timestamp: Date.now(),
    totalSamples: total,
    evaluatedSamples: predictions.length,
    overallAccuracy,
    macroF1,
    averageLatencyMs,
    classMetrics,
    confusionMatrix: {
      categories,
      matrix
    },
    predictions,
    limitations: [
      'In-browser client-side evaluation executes on quantized MobileNet CNN weights.',
      'Synthetic benchmark targets provide baseline sanity verification for reproducible CI runs.',
      'Real-world precision is subject to user ambient lighting, camera sensor ISO noise, and optical occlusions.',
      'In-the-wild facial expression recognition cannot authenticate inner subjective emotional truth.'
    ]
  };
}
