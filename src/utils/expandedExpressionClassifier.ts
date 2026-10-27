import type {
  BasicExpressionName,
  BasicExpressionScores,
  CompoundExpressionName,
  CompoundExpressionResult,
  ExpressionAnalysisResult,
  FaceQualityState,
  HistoryPoint
} from '../types/studio';
import { extract52FeatureVector, MEDIAPIPE_52_BLENDSHAPES } from './blendshapeSchema';
import { facialMovementDetector } from './facialMovementDetector';

export interface ExportedWeights {
  version: string;
  featureCount: number;
  groupA_categories: string[];
  groupB_compoundCategories: string[];
  compoundSupport: Record<
    string,
    { support: number; status: 'validated' | 'moderate' | 'low_support_experimental' }
  >;
  weights: {
    w1: number[][]; // [32, 52]
    b1: number[]; // [32]
    w2: number[][]; // [8, 32]
    b2: number[]; // [8]
  };
}

export const BASIC_METADATA: Record<
  BasicExpressionName | 'uncertain',
  { label: string; emoji: string; description: string }
> = {
  neutral: {
    label: 'Neutral Equilibrium',
    emoji: '😐',
    description: 'Facial musculature relaxed at baseline resting posture.'
  },
  happy: {
    label: 'Joy / Happiness',
    emoji: '😊',
    description: 'Zygomaticus major activation with genuine ocular dynamics.'
  },
  sad: {
    label: 'Sadness / Melancholy',
    emoji: '😢',
    description: 'Depressor anguli oris contraction and inner eyebrow elevation.'
  },
  angry: {
    label: 'Anger / Intensity',
    emoji: '😠',
    description: 'Corrugator supercilii contraction with lowered brow tension.'
  },
  fearful: {
    label: 'Fear / Apprehension',
    emoji: '😨',
    description: 'Frontalis elevation with horizontal lip corner elongation.'
  },
  disgusted: {
    label: 'Disgust / Aversion',
    emoji: '🤢',
    description: 'Levator labii superioris contraction with nasal furrowing.'
  },
  surprised: {
    label: 'Surprise / Wonder',
    emoji: '😲',
    description: 'Conjoint frontalis brow elevation and jaw aperture depression.'
  },
  contempt: {
    label: 'Contempt / Asymmetric Dismissal',
    emoji: '😏',
    description: 'Unilateral buccinator & zygomatic contraction creating asymmetric smirk.'
  },
  uncertain: {
    label: 'Subtle / Transitioning',
    emoji: '✨',
    description: 'Subtle micro-expressions below confident classification threshold.'
  }
};

export const COMPOUND_METADATA: Record<
  CompoundExpressionName,
  { label: string; components: [BasicExpressionName, BasicExpressionName]; description: string }
> = {
  happily_surprised: {
    label: 'Happily Surprised',
    components: ['happy', 'surprised'],
    description: 'Zygomatic elevation combined with jaw depression & wide eyes.'
  },
  happily_disgusted: {
    label: 'Happily Disgusted',
    components: ['happy', 'disgusted'],
    description: 'Amused aversion; smiling combined with nasal furrowing.'
  },
  sadly_fearful: {
    label: 'Sadly Fearful',
    components: ['sad', 'fearful'],
    description: 'Inner brow elevation with lip depressor and eye widening.'
  },
  sadly_angry: {
    label: 'Sadly Angry',
    components: ['sad', 'angry'],
    description: 'Inner brow elevation conflicted with corrugator furrowing.'
  },
  sadly_surprised: {
    label: 'Sadly Surprised',
    components: ['sad', 'surprised'],
    description: 'Mouth depression combined with high frontalis aperture.'
  },
  sadly_disgusted: {
    label: 'Sadly Disgusted',
    components: ['sad', 'disgusted'],
    description: 'Nasal wrinkling combined with depressor anguli contraction.'
  },
  fearfully_angry: {
    label: 'Fearfully Angry',
    components: ['fearful', 'angry'],
    description: 'Wide ocular aperture combined with intense corrugator furrowing.'
  },
  fearfully_surprised: {
    label: 'Fearfully Surprised',
    components: ['fearful', 'surprised'],
    description: 'High frontalis brow elevation, jaw drop, and ocular dilation.'
  },
  angrily_surprised: {
    label: 'Angrily Surprised',
    components: ['angry', 'surprised'],
    description: 'Outraged shock; lowered brows combined with wide jaw drop.'
  },
  angrily_disgusted: {
    label: 'Angrily Disgusted',
    components: ['angry', 'disgusted'],
    description: 'Intense displeasure; corrugator frown and nasal sneering.'
  },
  disgustedly_surprised: {
    label: 'Disgustedly Surprised',
    components: ['disgusted', 'surprised'],
    description: 'Shocked revulsion; nasal curling combined with open mouth aperture.'
  }
};

export class ExpandedExpressionClassifier {
  private weights: ExportedWeights | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  // Smoothing & hysteresis
  private prevSmoothed: BasicExpressionScores = {
    neutral: 1,
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    disgusted: 0,
    surprised: 0,
    contempt: 0
  };
  private smoothingAlpha = 0.35;
  private currentCategory: BasicExpressionName | 'uncertain' = 'neutral';
  private pendingCategory: BasicExpressionName | 'uncertain' = 'neutral';
  private consecutiveFrames = 0;

  // Rolling history
  private history: HistoryPoint[] = [];
  private readonly maxHistorySize = 40;

  public async loadModel(modelPath = '/models/aura_expression_weights.json'): Promise<void> {
    if (this.isLoaded && this.weights) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const resp = await fetch(modelPath);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${modelPath}`);
        this.weights = (await resp.json()) as ExportedWeights;
        this.isLoaded = true;
      } catch (err) {
        console.error('Failed to load neural expression weights from', modelPath, err);
        throw err;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  public get isModelLoaded(): boolean {
    return this.isLoaded && this.weights !== null;
  }

  /**
   * Runs client-side neural forward pass on 52 MediaPipe blendshape coefficients.
   */
  private runInference(input52: Float32Array): number[] {
    if (!this.weights) {
      return [1, 0, 0, 0, 0, 0, 0, 0];
    }

    const { w1, b1, w2, b2 } = this.weights.weights;
    const hidden = new Float32Array(32);

    // Layer 1: ReLU(w1 * input + b1)
    for (let j = 0; j < 32; j++) {
      let sum = b1[j];
      const w1_row = w1[j];
      for (let i = 0; i < 52; i++) {
        sum += w1_row[i] * input52[i];
      }
      hidden[j] = Math.max(0, sum); // ReLU
    }

    // Layer 2: w2 * hidden + b2
    const logits = new Float32Array(8);
    for (let k = 0; k < 8; k++) {
      let sum = b2[k];
      const w2_row = w2[k];
      for (let j = 0; j < 32; j++) {
        sum += w2_row[j] * hidden[j];
      }
      logits[k] = sum;
    }

    // Softmax
    let maxLogit = -Infinity;
    for (let k = 0; k < 8; k++) {
      if (logits[k] > maxLogit) maxLogit = logits[k];
    }

    let sumExp = 0;
    const probs = new Array<number>(8);
    for (let k = 0; k < 8; k++) {
      probs[k] = Math.exp(logits[k] - maxLogit);
      sumExp += probs[k];
    }
    for (let k = 0; k < 8; k++) {
      probs[k] = probs[k] / sumExp;
    }

    return probs;
  }

  /**
   * Main classifier entry point receiving MediaPipe categories and face landmarks.
   */
  public async classifyFace(
    video: HTMLVideoElement,
    landmarks?: Array<{ x: number; y: number; z?: number }>,
    blendshapeCategories?: Array<{ categoryName: string; score: number }>
  ): Promise<{ result: ExpressionAnalysisResult; history: HistoryPoint[] }> {
    if (!landmarks || landmarks.length === 0 || !video || video.readyState < 2) {
      return {
        result: this.getEmptyResult(false),
        history: this.history
      };
    }

    if (!this.isModelLoaded) {
      await this.loadModel();
    }

    // 1. Build dictionary of all 52 blendshape values
    const allBlendshapes: Record<string, number> = {};
    if (blendshapeCategories) {
      for (let i = 0; i < blendshapeCategories.length; i++) {
        allBlendshapes[blendshapeCategories[i].categoryName] = blendshapeCategories[i].score;
      }
    }

    // 2. Extract 52-dimensional canonical feature vector
    const featureVector = extract52FeatureVector(blendshapeCategories);

    // 3. Compute face geometry quality metrics
    const videoW = video.videoWidth || 1280;
    const videoH = video.videoHeight || 720;

    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const rawFaceW = (maxX - minX) * videoW;
    const rawFaceH = (maxY - minY) * videoH;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const isTooSmall = rawFaceW < 70 || rawFaceH < 70;
    const isOffCenter = centerX < 0.12 || centerX > 0.88 || centerY < 0.12 || centerY > 0.88;

    let guidance = 'Face alignment optimal. Real-time multi-group classification active.';
    if (isTooSmall && isOffCenter) {
      guidance = 'Move closer and center your face in view.';
    } else if (isTooSmall) {
      guidance = 'Move closer to the camera for optimal feature extraction.';
    } else if (isOffCenter) {
      guidance = 'Position your face toward the center of the frame.';
    }

    const quality: FaceQualityState = {
      isTooSmall,
      isOffCenter,
      faceWidth: Math.round(rawFaceW),
      faceHeight: Math.round(rawFaceH),
      guidance
    };

    // 4. Run Group A 8-Class Neural Inference
    const rawProbs = this.runInference(featureVector);
    const basicCategories: BasicExpressionName[] = [
      'neutral',
      'happy',
      'sad',
      'angry',
      'fearful',
      'disgusted',
      'surprised',
      'contempt'
    ];

    const rawScores: BasicExpressionScores = {
      neutral: rawProbs[0],
      happy: rawProbs[1],
      sad: rawProbs[2],
      angry: rawProbs[3],
      fearful: rawProbs[4],
      disgusted: rawProbs[5],
      surprised: rawProbs[6],
      contempt: rawProbs[7]
    };

    // EMA Temporal Smoothing
    const a = this.smoothingAlpha;
    const smoothedScores: BasicExpressionScores = {
      neutral: this.prevSmoothed.neutral * (1 - a) + rawScores.neutral * a,
      happy: this.prevSmoothed.happy * (1 - a) + rawScores.happy * a,
      sad: this.prevSmoothed.sad * (1 - a) + rawScores.sad * a,
      angry: this.prevSmoothed.angry * (1 - a) + rawScores.angry * a,
      fearful: this.prevSmoothed.fearful * (1 - a) + rawScores.fearful * a,
      disgusted: this.prevSmoothed.disgusted * (1 - a) + rawScores.disgusted * a,
      surprised: this.prevSmoothed.surprised * (1 - a) + rawScores.surprised * a,
      contempt: this.prevSmoothed.contempt * (1 - a) + rawScores.contempt * a
    };
    this.prevSmoothed = smoothedScores;

    // Sort to find top candidate and runner-up margin
    const sorted = [...basicCategories].sort((a, b) => smoothedScores[b] - smoothedScores[a]);
    const topCat = sorted[0];
    const topVal = smoothedScores[topCat];
    const runnerUpVal = smoothedScores[sorted[1]];
    const margin = topVal - runnerUpVal;

    const isUncertain = isTooSmall || topVal < 0.25 || (topVal < 0.36 && margin < 0.04);
    const isNeutral = !isUncertain && topCat === 'neutral';

    const candidateCategory: BasicExpressionName | 'uncertain' = isUncertain
      ? 'uncertain'
      : topCat;

    // 2-frame hysteresis
    if (candidateCategory === this.pendingCategory) {
      this.consecutiveFrames++;
      if (this.consecutiveFrames >= 2) {
        this.currentCategory = candidateCategory;
      }
    } else {
      this.pendingCategory = candidateCategory;
      this.consecutiveFrames = 1;
    }

    const basicMeta = BASIC_METADATA[this.currentCategory];
    const displayConfidence = isUncertain ? topVal : smoothedScores[topCat];

    // 5. Evaluate Group B: 11 Compound Expressions
    const compoundResult = this.evaluateCompoundExpression(smoothedScores, sorted);

    // 6. Evaluate Group C: 17 Observable Facial Movements
    const movements = facialMovementDetector.detectMovements(allBlendshapes);
    const activeMovementsCount = movements.filter(m => m.isActive).length;

    // 7. Update Rolling History
    this.history.push({
      timestamp: Date.now(),
      score: Math.round(displayConfidence * 100) / 100,
      label: basicMeta.label
    });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    const finalResult: ExpressionAnalysisResult = {
      label: basicMeta.label,
      category: this.currentCategory,
      confidence: Math.round(displayConfidence * 100) / 100,
      rawScores: {
        neutral: Math.round(rawScores.neutral * 100) / 100,
        happy: Math.round(rawScores.happy * 100) / 100,
        sad: Math.round(rawScores.sad * 100) / 100,
        angry: Math.round(rawScores.angry * 100) / 100,
        fearful: Math.round(rawScores.fearful * 100) / 100,
        disgusted: Math.round(rawScores.disgusted * 100) / 100,
        surprised: Math.round(rawScores.surprised * 100) / 100,
        contempt: Math.round(rawScores.contempt * 100) / 100
      },
      smoothedScores: {
        neutral: Math.round(smoothedScores.neutral * 100) / 100,
        happy: Math.round(smoothedScores.happy * 100) / 100,
        sad: Math.round(smoothedScores.sad * 100) / 100,
        angry: Math.round(smoothedScores.angry * 100) / 100,
        fearful: Math.round(smoothedScores.fearful * 100) / 100,
        disgusted: Math.round(smoothedScores.disgusted * 100) / 100,
        surprised: Math.round(smoothedScores.surprised * 100) / 100,
        contempt: Math.round(smoothedScores.contempt * 100) / 100
      },
      description: basicMeta.description,
      emoji: basicMeta.emoji,
      isNeutral,
      isUncertain,
      compound: compoundResult,
      movements,
      activeMovementsCount,
      allBlendshapes,
      faceDetected: true,
      quality
    };

    return {
      result: finalResult,
      history: [...this.history]
    };
  }

  /**
   * Evaluates compound expressions based on dual high-scoring components.
   */
  private evaluateCompoundExpression(
    scores: BasicExpressionScores,
    sorted: BasicExpressionName[]
  ): CompoundExpressionResult {
    const top1 = sorted[0];
    const top2 = sorted[1];
    const val1 = scores[top1];
    const val2 = scores[top2];

    // Compound pairs mapping
    const pairKey = [top1, top2].sort().join('+');
    const compoundLookup: Record<string, CompoundExpressionName> = {
      'happy+surprised': 'happily_surprised',
      'disgusted+happy': 'happily_disgusted',
      'fearful+sad': 'sadly_fearful',
      'angry+sad': 'sadly_angry',
      'sad+surprised': 'sadly_surprised',
      'disgusted+sad': 'sadly_disgusted',
      'angry+fearful': 'fearfully_angry',
      'fearful+surprised': 'fearfully_surprised',
      'angry+surprised': 'angrily_surprised',
      'angry+disgusted': 'angrily_disgusted',
      'disgusted+surprised': 'disgustedly_surprised'
    };

    const matchedCompound = compoundLookup[pairKey];

    // A compound expression is active if neither top is neutral and secondary component is substantial (val2 >= 0.22)
    if (matchedCompound && top1 !== 'neutral' && top2 !== 'neutral' && val2 >= 0.22) {
      const meta = COMPOUND_METADATA[matchedCompound];
      const supportInfo = this.weights?.compoundSupport?.[matchedCompound];
      const isExperimental =
        supportInfo?.status === 'low_support_experimental' ||
        matchedCompound === 'happily_disgusted' ||
        matchedCompound === 'disgustedly_surprised';

      const supportLevel = isExperimental
        ? 'low_support'
        : supportInfo?.status === 'moderate'
        ? 'moderate'
        : 'validated';

      const jointConfidence = Math.min(1, (val1 + val2) / 1.7);

      return {
        category: matchedCompound,
        label: meta.label,
        confidence: Math.round(jointConfidence * 100) / 100,
        rawScore: Math.round(val2 * 100) / 100,
        isExperimental,
        supportLevel,
        components: meta.components,
        description: meta.description
      };
    }

    return {
      category: 'none',
      label: 'No Compound Detected',
      confidence: 0,
      rawScore: 0,
      isExperimental: false,
      supportLevel: 'validated',
      components: ['neutral', 'neutral'],
      description: 'Single dominant basic expression or equilibrium state active.'
    };
  }

  public reset(): void {
    this.prevSmoothed = {
      neutral: 1,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
      contempt: 0
    };
    this.currentCategory = 'neutral';
    this.pendingCategory = 'neutral';
    this.consecutiveFrames = 0;
    this.history = [];
  }

  public getEmptyResult(faceDetected = false, guidance?: string): ExpressionAnalysisResult {
    const defaultQuality: FaceQualityState = {
      isTooSmall: false,
      isOffCenter: false,
      faceWidth: 0,
      faceHeight: 0,
      guidance:
        guidance ||
        (faceDetected
          ? 'Calibrating neural landmarks...'
          : 'Position your face within the camera viewport.')
    };

    const emptyScores: BasicExpressionScores = {
      neutral: 0,
      happy: 0,
      sad: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      surprised: 0,
      contempt: 0
    };

    const emptyAllBlendshapes: Record<string, number> = {};
    for (let i = 0; i < MEDIAPIPE_52_BLENDSHAPES.length; i++) {
      emptyAllBlendshapes[MEDIAPIPE_52_BLENDSHAPES[i]] = 0;
    }

    return {
      label: faceDetected ? 'Calibrating Neural Net...' : 'No Face in View',
      category: 'uncertain',
      confidence: 0,
      rawScores: { ...emptyScores },
      smoothedScores: { ...emptyScores },
      description: faceDetected
        ? 'Extracting 52 facial blendshapes for calibrated expression inference...'
        : 'Bring your face into the viewport to begin real-time expression tracking.',
      emoji: faceDetected ? '🔍' : '👤',
      isNeutral: false,
      isUncertain: true,
      compound: {
        category: 'none',
        label: 'Standby',
        confidence: 0,
        rawScore: 0,
        isExperimental: false,
        supportLevel: 'validated',
        components: ['neutral', 'neutral'],
        description: 'Awaiting facial landmark telemetry.'
      },
      movements: facialMovementDetector.detectMovements(emptyAllBlendshapes),
      activeMovementsCount: 0,
      allBlendshapes: emptyAllBlendshapes,
      faceDetected,
      quality: defaultQuality
    };
  }
}

export const expandedExpressionClassifier = new ExpandedExpressionClassifier();
