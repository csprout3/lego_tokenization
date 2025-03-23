/* workerUtils.ts */
// Utilities for working with Web Workers

import { WordEmbeddings } from './embeddings';

// Worker states
let embeddingsWorker: Worker | null = null;
let workerReady = false;
let pendingMessages: { resolve: Function; reject: Function; type: string }[] = [];

// Custom worker instantiation for Next.js compatibility
function createWorker(): Worker | null {
  if (typeof window === 'undefined') {
    console.warn("Attempted to create worker in non-browser environment");
    return null;
  }
  
  // Check if the browser supports Web Workers
  if (typeof Worker === 'undefined') {
    console.warn("Web Workers are not supported in this browser");
    return null;
  }
  
  // Check if Blob URL is supported
  if (typeof URL === 'undefined' || typeof URL.createObjectURL === 'undefined') {
    console.warn("Blob URLs are not supported in this browser");
    return null;
  }
  
  try {
    // Dynamic import for the worker
    const workerCode = `
      // Send a message to indicate the worker is handling the init request
      self.postMessage({ type: 'WORKER_INITIALIZING' });
      
      self.onmessage = function(e) {
        try {
          const { type, payload } = e.data;
          
          if (type === 'INIT') {
            self.postMessage({ type: 'WORKER_READY' });
            return;
          }
          
          if (type === 'FIND_SIMILAR_WORDS') {
            const { embeddings, wordEmbedding, word, limit, threshold } = payload;
            const similarWords = findSimilarWords(embeddings, wordEmbedding, word, limit, threshold);
            
            self.postMessage({
              type: 'SIMILAR_WORDS_RESULT',
              payload: {
                word,
                similarWords
              }
            });
          }
          
          if (type === 'BATCH_PROJECT_TO_2D') {
            const { embeddings } = payload;
            const points = batchProjectTo2D(embeddings);
            
            self.postMessage({
              type: 'PROJECTION_RESULT',
              payload: {
                points
              }
            });
          }
        } catch (error) {
          // Report any errors back to the main thread
          self.postMessage({ 
            type: 'WORKER_ERROR', 
            error: { message: error.message, stack: error.stack } 
          });
        }
      };
      
      // Error handling for the worker
      self.addEventListener('error', function(e) {
        self.postMessage({ 
          type: 'WORKER_ERROR', 
          error: { message: e.message, filename: e.filename, lineno: e.lineno } 
        });
      });
      
      // Rest of the functions
      function computeSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
        
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        
        if (mag1 === 0 || mag2 === 0) return 0;
        return dotProduct / (mag1 * mag2);
      }
      
      function projectTo2D(vector) {
        if (vector.length < 2) return [0, 0];
        
        const x = vector[0] * 100 + vector[2] * 30;
        const y = vector[1] * 100 + vector[3] * 30 + (vector[4] || 0) * 20;
        
        return [x, y];
      }
      
      function findSimilarWords(embeddings, wordEmbedding, word, limit = 10, threshold = 0.5) {
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
      
      function batchProjectTo2D(embeddings) {
        const points = {};
        
        Object.entries(embeddings).forEach(([word, vector]) => {
          const [x, y] = projectTo2D(vector);
          points[word] = { x, y };
        });
        
        return points;
      }
    `;
    
    // Create blob URL for the worker
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    // Create the worker
    const worker = new Worker(workerUrl);
    
    // Log when the worker is created
    console.info("Web Worker created successfully");
    
    // Clean up the URL when the worker is terminated
    worker.addEventListener('message', function cleanupListener(e) {
      if (e.data.type === 'WORKER_READY') {
        URL.revokeObjectURL(workerUrl);
        worker.removeEventListener('message', cleanupListener);
        console.info("Web Worker is ready and Blob URL was revoked");
      }
    });
    
    return worker;
  } catch (error) {
    console.error('Error creating worker:', error);
    return null;
  }
}

// Initialize the embeddings worker
export function initEmbeddingsWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      reject(new Error('Worker initialization timed out after 2 seconds'));
    }, 2000);
    
    try {
      if (typeof window === 'undefined') {
        // Not in browser environment
        clearTimeout(timeoutId);
        reject(new Error('Workers can only be initialized in browser environment'));
        return;
      }
      
      if (embeddingsWorker) {
        // Worker already exists
        if (workerReady) {
          clearTimeout(timeoutId);
          resolve();
        } else {
          // Wait for worker to be ready
          pendingMessages.push({ 
            resolve: () => {
              clearTimeout(timeoutId);
              resolve();
            }, 
            reject: (err: Error) => {
              clearTimeout(timeoutId);
              reject(err);
            }, 
            type: 'INIT' 
          });
        }
        return;
      }
      
      // Create new worker
      embeddingsWorker = createWorker();
      
      if (!embeddingsWorker) {
        clearTimeout(timeoutId);
        reject(new Error('Failed to create worker'));
        return;
      }
      
      // Set up message handler
      embeddingsWorker.onmessage = (event) => {
        const { type, payload } = event.data;
        
        if (type === 'WORKER_READY') {
          workerReady = true;
          clearTimeout(timeoutId);
          resolve();
          
          // Process any pending messages
          processPendingMessages();
          return;
        }
        
        // Handle other message types
        handleWorkerMessage(event);
      };
      
      // Handle errors
      embeddingsWorker.onerror = (error) => {
        console.error('Embeddings worker error:', error);
        clearTimeout(timeoutId);
        reject(error);
      };
      
      // Send initialization message
      embeddingsWorker.postMessage({ type: 'INIT' });
    } catch (error) {
      console.error('Failed to initialize embeddings worker:', error);
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Process any pending messages
function processPendingMessages() {
  if (!embeddingsWorker || !workerReady) return;
  
  // Process init messages first
  const initMessages = pendingMessages.filter(msg => msg.type === 'INIT');
  initMessages.forEach(({ resolve }) => resolve());
  
  // Remove init messages
  pendingMessages = pendingMessages.filter(msg => msg.type !== 'INIT');
  
  // Process other pending messages - would handle these in a real implementation
  // For now we'll just resolve them with null
  pendingMessages.forEach(({ resolve }) => resolve(null));
  pendingMessages = [];
}

// Handle messages received from the worker
function handleWorkerMessage(event: MessageEvent) {
  const { type, payload } = event.data;
  
  // Find matching pending message handler
  const messageIndex = pendingMessages.findIndex(msg => msg.type === type);
  
  if (messageIndex >= 0) {
    const { resolve } = pendingMessages[messageIndex];
    resolve(payload);
    
    // Remove the processed message
    pendingMessages.splice(messageIndex, 1);
  }
}

// Send a message to the worker and get a response
export function sendWorkerMessage<T>(
  type: string, 
  payload: any
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.warn(`Worker message timed out (${type}), using fallback`);
      // Based on message type, perform fallback operations
      if (type === 'FIND_SIMILAR_WORDS') {
        const { embeddings, wordEmbedding, word, limit, threshold } = payload;
        const result = findSimilarWordsFallback(embeddings, wordEmbedding, word, limit, threshold);
        resolve({ similarWords: result } as any);
      } else if (type === 'BATCH_PROJECT_TO_2D') {
        const { embeddings } = payload;
        const points = projectEmbeddingsFallback(embeddings);
        resolve({ points } as any);
      } else {
        reject(new Error(`Worker message timed out (${type})`));
      }
    }, 5000); // 5 second timeout
    
    try {
      // Disable workers in development mode
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        clearTimeout(timeoutId);
        throw new Error('Workers disabled in development mode');
      }
      
      // Initialize worker if needed
      if (!embeddingsWorker) {
        try {
          await initEmbeddingsWorker();
        } catch (initError) {
          clearTimeout(timeoutId);
          console.warn(`Worker initialization failed, using fallback: ${initError instanceof Error ? initError.message : String(initError)}`);
          throw new Error('Worker initialization failed');
        }
      }
      
      // If still no worker (failed to initialize), use fallback
      if (!embeddingsWorker) {
        clearTimeout(timeoutId);
        throw new Error('Worker is not available');
      }
      
      // Wait for worker to be ready
      if (!workerReady) {
        pendingMessages.push({ 
          resolve: () => {
            clearTimeout(timeoutId);
            sendWorkerMessage<T>(type, payload).then(resolve).catch(reject);
          }, 
          reject: (err: Error) => {
            clearTimeout(timeoutId);
            reject(err);
          }, 
          type 
        });
        return;
      }
      
      // Add response handler to pending messages
      const responseType = type.replace(/^(\w+)$/, '$1_RESULT');
      pendingMessages.push({ 
        resolve: (result: any) => {
          clearTimeout(timeoutId);
          resolve(result as T);
        }, 
        reject: (err: Error) => {
          clearTimeout(timeoutId);
          reject(err);
        }, 
        type: responseType 
      });
      
      // Send the message
      embeddingsWorker.postMessage({ type, payload });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Error sending worker message (${type}), using fallback:`, errorMessage);
      
      // Fallback based on message type
      if (type === 'FIND_SIMILAR_WORDS') {
        const { embeddings, wordEmbedding, word, limit, threshold } = payload;
        const result = findSimilarWordsFallback(embeddings, wordEmbedding, word, limit, threshold);
        resolve({ similarWords: result } as any);
      } else if (type === 'BATCH_PROJECT_TO_2D') {
        const { embeddings } = payload;
        const points = projectEmbeddingsFallback(embeddings);
        resolve({ points } as any);
      } else {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  });
}

// Find similar words using the worker
export async function findSimilarWordsWithWorker(
  embeddings: WordEmbeddings,
  wordEmbedding: number[],
  word: string,
  limit: number = 10,
  threshold: number = 0.5
): Promise<{ word: string; similarity: number }[]> {
  try {
    // Check if browser environment
    if (typeof window === 'undefined') {
      // Fallback to synchronous computation for SSR
      return findSimilarWordsFallback(embeddings, wordEmbedding, word, limit, threshold);
    }
    
    const result = await sendWorkerMessage<{ word: string; similarWords: { word: string; similarity: number }[] }>(
      'FIND_SIMILAR_WORDS',
      { embeddings, wordEmbedding, word, limit, threshold }
    );
    
    return result?.similarWords || [];
  } catch (error) {
    console.error('Error finding similar words with worker:', error);
    // Fallback to synchronous computation
    return findSimilarWordsFallback(embeddings, wordEmbedding, word, limit, threshold);
  }
}

// Batch project embeddings to 2D using the worker
export async function projectEmbeddingsWithWorker(
  embeddings: WordEmbeddings
): Promise<{ [word: string]: { x: number; y: number } }> {
  try {
    // Check if browser environment
    if (typeof window === 'undefined') {
      // Fallback to synchronous computation for SSR
      return projectEmbeddingsFallback(embeddings);
    }
    
    const result = await sendWorkerMessage<{ points: { [word: string]: { x: number; y: number } } }>(
      'BATCH_PROJECT_TO_2D',
      { embeddings }
    );
    
    return result?.points || {};
  } catch (error) {
    console.error('Error projecting embeddings with worker:', error);
    // Fallback to synchronous computation
    return projectEmbeddingsFallback(embeddings);
  }
}

// Synchronous fallback for similarity computation
function findSimilarWordsFallback(
  embeddings: WordEmbeddings,
  wordEmbedding: number[],
  word: string,
  limit: number = 10,
  threshold: number = 0.5
): { word: string; similarity: number }[] {
  // Simple cosine similarity
  const computeSimilarity = (vec1: number[], vec2: number[]): number => {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
    
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  };
  
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

// Synchronous fallback for 2D projection
function projectEmbeddingsFallback(
  embeddings: WordEmbeddings
): { [word: string]: { x: number; y: number } } {
  const points: { [word: string]: { x: number; y: number } } = {};
  
  // Function to project high dimensional vectors to 2D
  const projectTo2D = (vector: number[]): [number, number] => {
    if (vector.length < 2) return [0, 0];
    
    // Use a more sophisticated projection that better preserves relationships
    // First dimension: semantic similarity (combines first two dimensions)
    const x = vector[0] * 100 + vector[1] * 50;
    
    // Second dimension: emotional/descriptive content (combines last three dimensions)
    const y = vector[2] * 30 + vector[3] * 40 + vector[4] * 60;
    
    // Normalize to a reasonable range
    return [
      Math.max(-100, Math.min(100, x)),
      Math.max(-100, Math.min(100, y))
    ];
  };
  
  Object.entries(embeddings).forEach(([word, vector]) => {
    const [x, y] = projectTo2D(vector);
    points[word] = { x, y };
  });
  
  return points;
} 