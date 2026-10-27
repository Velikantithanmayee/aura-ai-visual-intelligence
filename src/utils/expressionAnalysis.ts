// Re-export dedicated faceExpressionClassifier
export * from './faceExpressionClassifier';
import { faceExpressionClassifier } from './faceExpressionClassifier';

// Backward compatibility alias
export const expressionEngine = faceExpressionClassifier;
