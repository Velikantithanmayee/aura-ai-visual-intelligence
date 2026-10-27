import { FilesetResolver, FaceLandmarker, GestureRecognizer } from '@mediapipe/tasks-vision';

const LOCAL_WASM = '/wasm';
const CDN_WASM_JSDELIVR = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const CDN_WASM_UNPKG = 'https://unpkg.com/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

let cachedVisionResolver: any = null;

export async function getVisionResolver(): Promise<any> {
  if (cachedVisionResolver) return cachedVisionResolver;

  // 1. Try local bundled WASM
  try {
    cachedVisionResolver = await FilesetResolver.forVisionTasks(LOCAL_WASM);
    return cachedVisionResolver;
  } catch (err) {
    console.warn('Local WASM fileset not available, falling back to jsDelivr CDN:', err);
  }

  // 2. Fallback to jsDelivr CDN
  try {
    cachedVisionResolver = await FilesetResolver.forVisionTasks(CDN_WASM_JSDELIVR);
    return cachedVisionResolver;
  } catch (err) {
    console.warn('jsDelivr WASM fileset failed, falling back to unpkg CDN:', err);
    cachedVisionResolver = await FilesetResolver.forVisionTasks(CDN_WASM_UNPKG);
    return cachedVisionResolver;
  }
}

export async function createFaceLandmarker(vision: any): Promise<FaceLandmarker> {
  try {
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 3,
      outputFaceBlendshapes: true
    });
  } catch (gpuErr) {
    console.warn('FaceLandmarker GPU delegate failed, falling back to CPU delegate:', gpuErr);
    return await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numFaces: 3,
      outputFaceBlendshapes: true
    });
  }
}

export async function createGestureRecognizer(vision: any): Promise<GestureRecognizer> {
  try {
    return await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2
    });
  } catch (gpuErr) {
    console.warn('GestureRecognizer GPU delegate failed, falling back to CPU delegate:', gpuErr);
    return await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numHands: 2
    });
  }
}
