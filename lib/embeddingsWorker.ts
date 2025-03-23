/* embeddingsWorker.ts */
// This is a Web Worker for handling intensive embedding calculations

// Interface for embeddings
type WordEmbeddings = {
  [word: string]: number[];
};

// Message types for communication with the worker
type WorkerMessageIn = {
  type: 'FIND_SIMILAR_WORDS';
  payload: {
    embeddings: WordEmbeddings;
    wordEmbedding: number[];
    word: string;
    limit: number;
    threshold: number;
  };
} | {
  type: 'BATCH_PROJECT_TO_2D';
  payload: {
    embeddings: WordEmbeddings;
  };
};

type WorkerMessageOut = {
  type: 'SIMILAR_WORDS_RESULT';
  payload: {
    word: string;
    similarWords: { word: string; similarity: number }[];
  };
} | {
  type: 'PROJECTION_RESULT';
  payload: {
    points: { [word: string]: { x: number; y: number } };
  };
};

// Setup the worker context
const ctx: Worker = self as any;

// Function to compute cosine similarity between two embedding vectors
function computeSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

// Function to project high dimensional vectors to 2D
function projectTo2D(vector: number[]): [number, number] {
  // This is a simple implementation - a real system would use proper dimensionality reduction
  if (vector.length < 2) return [0, 0];
  
  // For simplicity we'll use a projection that preserves some meaningful structure
  const x = vector[0] * 100 + vector[2] * 30;
  const y = vector[1] * 100 + vector[3] * 30 + (vector[4] || 0) * 20;
  
  return [x, y];
}

// Find similar words to a given query
function findSimilarWords(
  embeddings: WordEmbeddings,
  wordEmbedding: number[],
  word: string,
  limit: number = 10,
  threshold: number = 0.5
): { word: string; similarity: number }[] {
  return Object.entries(embeddings)
    .filter(([key]) => key !== word)
    .map(([key, vector]) => ({
      word: key,
      similarity: computeSimilarity(wordEmbedding, vector)
    }))
    .filter(item => item.similarity >= threshold && Number.isFinite(item.similarity))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// Batch project all embeddings to 2D points
function batchProjectTo2D(
  embeddings: WordEmbeddings
): { [word: string]: { x: number; y: number } } {
  const points: { [word: string]: { x: number; y: number } } = {};
  
  Object.entries(embeddings).forEach(([word, vector]) => {
    const [x, y] = projectTo2D(vector);
    points[word] = { x, y };
  });
  
  return points;
}

// Handle messages from the main thread
ctx.addEventListener('message', (event: MessageEvent<WorkerMessageIn>) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'FIND_SIMILAR_WORDS': {
      const { embeddings, wordEmbedding, word, limit, threshold } = payload;
      const similarWords = findSimilarWords(embeddings, wordEmbedding, word, limit, threshold);
      
      ctx.postMessage({
        type: 'SIMILAR_WORDS_RESULT',
        payload: {
          word,
          similarWords
        }
      } as WorkerMessageOut);
      break;
    }
    
    case 'BATCH_PROJECT_TO_2D': {
      const { embeddings } = payload;
      const points = batchProjectTo2D(embeddings);
      
      ctx.postMessage({
        type: 'PROJECTION_RESULT',
        payload: {
          points
        }
      } as WorkerMessageOut);
      break;
    }
  }
});

// Notify that the worker is ready
ctx.postMessage({ type: 'WORKER_READY' });

export {}; // Required for TypeScript modules 