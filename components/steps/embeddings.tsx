"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TextInput } from "@/components/ui/text-input"
import { LegoBlock } from "@/components/ui/lego-block"
import { Slider } from "@/components/ui/slider"
import { getStaticWordEmbeddings } from "@/lib/embeddings"

// Type for our word embeddings
type WordEmbeddings = {
  [word: string]: number[]
}

// Static embeddings for demonstration
const staticEmbeddings: WordEmbeddings = {
  dog: [0.2, 0.8, 0.1, 0.3, 0.5],
  puppy: [0.25, 0.85, 0.15, 0.35, 0.45],
  cat: [0.3, 0.7, 0.2, 0.4, 0.5],
  kitten: [0.35, 0.75, 0.25, 0.45, 0.45],
  animal: [0.4, 0.6, 0.3, 0.5, 0.4],
  pet: [0.3, 0.65, 0.2, 0.4, 0.45],
  fox: [0.3, 0.6, 0.4, 0.25, 0.55],
  quick: [0.7, 0.3, 0.6, 0.4, 0.2],
  brown: [0.4, 0.5, 0.3, 0.6, 0.5],
  jump: [0.75, 0.25, 0.8, 0.2, 0.1],
  lazy: [0.15, 0.8, 0.2, 0.7, 0.3],
  run: [0.8, 0.2, 0.7, 0.3, 0.1],
  the: [0.5, 0.5, 0.5, 0.5, 0.5],
  over: [0.6, 0.4, 0.5, 0.5, 0.4],
  token: [0.55, 0.45, 0.6, 0.4, 0.5],
  word: [0.53, 0.47, 0.58, 0.42, 0.52],
  text: [0.54, 0.46, 0.59, 0.41, 0.51],
  slow: [0.2, 0.7, 0.3, 0.6, 0.4],
  bear: [0.35, 0.65, 0.25, 0.45, 0.5],
  eats: [0.6, 0.3, 0.5, 0.4, 0.3],
  berries: [0.45, 0.55, 0.35, 0.5, 0.4],
  house: [0.5, 0.4, 0.6, 0.3, 0.4],
  car: [0.6, 0.3, 0.5, 0.4, 0.4],
  walk: [0.7, 0.2, 0.6, 0.3, 0.2],
  sprint: [0.85, 0.15, 0.75, 0.25, 0.1]
}

export default function Embeddings({ 
  sampleText, 
  setSampleText,
  hideVisualization = true
}: { 
  sampleText: string, 
  setSampleText: (text: string) => void,
  hideVisualization?: boolean
}) {
  const [selectedWord, setSelectedWord] = useState("")
  const [similarWords, setSimilarWords] = useState<{word: string, similarity: number}[]>([])
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85)
  const [maxResults, setMaxResults] = useState(5)

  // Memoize expensive computations
  const tokens = useMemo(() => 
    sampleText
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.toLowerCase().replace(/[^a-z]/g, ""))
      .filter((word) => word.length > 0),
    [sampleText]
  );

  const allTokens = useMemo(() => 
    Array.from(new Set(tokens)).filter((token) => token.length > 0),
    [tokens]
  );

  // Create a simple token-to-ID mapping (just like in the previous step)
  const vocabulary = useMemo(() => {
    const uniqueTokens = Array.from(new Set(tokens.flatMap(token => {
      const matches = token.match(/([A-Za-z0-9]+)|([^A-Za-z0-9]+)/g);
      return matches || [];
    })));
    
    return uniqueTokens.reduce((acc: {[key: string]: number}, token: string, index: number) => {
      acc[token] = index + 1; // Start IDs from 1
      return acc;
    }, {});
  }, [tokens]);

  // Embeddings, accessed once
  const embeddings = useMemo(() => getStaticWordEmbeddings(), []);

  // Memoize the hasEmbedding check
  const hasEmbedding = useCallback((token: string) => 
    embeddings[token] !== undefined,
    [embeddings]
  );

  // Memoize the similarity calculation function
  const cosineSimilarity = useCallback((vec1: number[], vec2: number[]) => {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0)
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0))
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (mag1 * mag2)
  }, []);

  // Memoize the word form check function
  const isWordForm = useCallback((w1: string, w2: string) => {
    if (w1 === w2) return false
    
    const shorter = w1.length <= w2.length ? w1 : w2
    const longer = w1.length > w2.length ? w1 : w2
    
    return (
      longer.startsWith(shorter) ||
      (shorter.length > 3 && longer.startsWith(shorter.substring(0, shorter.length - 1))) ||
      (shorter.length > 4 && levenshteinDistance(w1, w2) <= 2)
    )
  }, []);

  // Find similar words based on word2vec embeddings
  const findSimilarWords = useCallback((word: string, threshold = 0.85, maxResults = 5) => {
    if (!embeddings[word]) return []

    const wordEmbedding = embeddings[word]
    const exactMatches: {word: string, similarity: number}[] = []
    const wordFormMatches: {word: string, similarity: number}[] = []
    
    Object.entries(embeddings)
      .filter(([w]) => w !== word)
      .forEach(([w, embedding]) => {
        const similarity = cosineSimilarity(wordEmbedding, embedding)
        const potentialWordForm = isWordForm(word, w)
        const wordFormThreshold = potentialWordForm ? 0.7 : threshold
        
        if (similarity > threshold) {
          exactMatches.push({ word: w, similarity })
        } else if (potentialWordForm && similarity > wordFormThreshold) {
          wordFormMatches.push({ word: w, similarity })
        }
      })
    
    return [
      ...exactMatches.sort((a, b) => b.similarity - a.similarity),
      ...wordFormMatches.sort((a, b) => b.similarity - a.similarity)
    ].slice(0, maxResults)
  }, [cosineSimilarity, isWordForm, embeddings]);

  // Handle word selection with memoization
  const handleWordSelect = useCallback((word: string) => {
    setSelectedWord(word)
    setSimilarWords(findSimilarWords(word, similarityThreshold, maxResults))
  }, [similarityThreshold, maxResults, findSimilarWords]);

  // Update similar words only when necessary
  useEffect(() => {
    if (selectedWord) {
      setSimilarWords(findSimilarWords(selectedWord, similarityThreshold, maxResults))
    }
  }, [selectedWord, similarityThreshold, maxResults, findSimilarWords]);

  // Handle text input changes
  const handleTextChange = useCallback((text: string) => {
    setSampleText(text);
    setSelectedWord(""); // Clear selection when text changes
  }, [setSampleText]);

  // Simple Levenshtein distance calculation for basic fuzzy matching
  const levenshteinDistance = (str1: string, str2: string) => {
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        )
      }
    }
    
    return track[str2.length][str1.length]
  }

  return (
    <>
      <div className="space-y-6">
        <motion.h2 
          className="text-2xl font-bold text-purple-600"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Step 5: Embeddings - How LEGO Blocks Relate to Each Other
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }}
          >
            <p className="mb-4">
              In the previous step, we assigned unique IDs to each token. Now, we'll transform those IDs into 
              <strong> word embeddings</strong> - vectors in a high-dimensional space where similar words are positioned closer together.
            </p>

            <motion.div 
              className="mb-6 p-4 bg-purple-50 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-medium mb-2 text-purple-700">From IDs to Vectors</h3>
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="text-center">
                  <div className="p-2 border border-purple-200 rounded-md bg-white">
                    <div className="font-mono text-sm">Token: "dog"</div>
                    <div className="font-mono text-sm">ID: {vocabulary["dog"] || 42}</div>
                  </div>
                </div>
                <motion.div 
                  className="flex items-center"
                  initial={{ width: 0 }}
                  animate={{ width: "auto" }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <svg width="40" height="20" viewBox="0 0 40 20">
                    <motion.path 
                      d="M0,10 L32,10" 
                      stroke="#6b46c1" 
                      strokeWidth="2" 
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                    />
                    <motion.polygon 
                      points="32,10 25,6 25,14" 
                      fill="#6b46c1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 1 }}
                    />
                  </svg>
                </motion.div>
                <motion.div 
                  className="p-2 border border-purple-300 rounded-md bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <div className="font-mono text-sm">Embedding Vector:</div>
                  <div className="font-mono text-xs">[{embeddings["dog"]?.map(v => v.toFixed(1)).join(", ") || "0.7, 0.3, 0.2, 0.5, 0.4"}]</div>
                </motion.div>
              </div>
              <p className="text-sm text-purple-700">
                Each token ID is mapped to a unique vector with multiple dimensions. These vectors encode semantic meaning, 
                with similar words having similar vectors.
              </p>
            </motion.div>

            <TextInput
              value={sampleText}
              onChange={handleTextChange}
              label="Try text with related words:"
              placeholder="Try words like 'dog', 'cat', 'run', 'jump', etc."
              debounceMs={50}
            />

            {selectedWord && (
              <motion.div 
                className="mt-6 p-4 bg-purple-50 rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="font-medium mb-2">Similar words to "{selectedWord}" (Word2Vec)</h4>

                <div className="mb-4">
                  <label className="block text-sm text-gray-500 mb-1">
                    Similarity threshold: {similarityThreshold.toFixed(2)}
                  </label>
                  <Slider
                    value={[similarityThreshold]}
                    min={0.5}
                    max={0.95}
                    step={0.01}
                    onValueChange={(value) => setSimilarityThreshold(value[0])}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-500 mb-1">Max results: {maxResults}</label>
                  <Slider
                    value={[maxResults]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(value) => setMaxResults(value[0])}
                  />
                </div>

                <AnimatePresence>
                  {similarWords.length > 0 ? (
                    <motion.ul 
                      className="space-y-2 mt-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ staggerChildren: 0.05 }}
                    >
                      {similarWords.map((item, i) => (
                        <motion.li 
                          key={i} 
                          className="flex justify-between items-center"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <span className="font-medium">{item.word}</span>
                          <div className="flex items-center">
                            <div
                              className="h-2 bg-purple-400 rounded-full mr-2"
                              style={{ width: `${item.similarity * 100}px` }}
                            />
                            <span className="text-xs">{(item.similarity * 100).toFixed(0)}%</span>
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  ) : (
                    <motion.p className="text-sm text-gray-500 mt-4">
                      No similar words found with current threshold.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>

          {!hideVisualization && (
            <motion.div
              className="border-2 border-purple-300 p-4 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-center mb-4 font-medium">Word Embedding Visualization</p>

              <div className="flex flex-wrap gap-3 justify-center mb-8">
                {tokens.map((token, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{
                      scale: 1.05,
                      transition: { duration: 0.2 },
                    }}
                    onClick={() => hasEmbedding(token) ? handleWordSelect(token) : null}
                  >
                    <LegoBlock
                      text={token}
                      color={
                        token === selectedWord
                          ? "bg-purple-400"
                          : hasEmbedding(token)
                            ? "bg-purple-200"
                            : "bg-gray-200"
                      }
                      className={!hasEmbedding(token) ? "opacity-70" : ""}
                    />
                  </motion.div>
                ))}
              </div>

              {selectedWord && hasEmbedding(selectedWord) && (
                <motion.div
                  className="mt-6 border border-purple-100 rounded-lg p-4 bg-purple-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <h4 className="font-medium mb-2 text-center">Vector for "{selectedWord}"</h4>
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1 overflow-x-auto p-2 max-w-full">
                      {embeddings[selectedWord]?.map((value, i) => (
                        <motion.div
                          key={i}
                          className="flex flex-col items-center"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <div 
                            className="w-8 bg-purple-300 rounded-sm mx-1" 
                            style={{ 
                              height: `${Math.abs(value) * 60}px`,
                              backgroundColor: value > 0 ? '#c084fc' : '#f0abfc'
                            }}
                          />
                          <span className="text-xs mt-1">{value.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">dim {i+1}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-center mt-4 text-gray-600">
                    Each dimension contributes to the word's position in the embedding space.
                    <br />
                    Similar words have similar patterns in their vectors.
                  </p>
                </motion.div>
              )}

              <motion.p
                className="text-xs text-gray-500 mt-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {!selectedWord 
                  ? "Click on a purple LEGO block above to explore its embedding vector." 
                  : !hasEmbedding(selectedWord)
                    ? "This word doesn't have an embedding in our demo model."
                    : ""}
              </motion.p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Transition to Experimentation */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-purple-50 to-orange-50 rounded-lg border-l-4 border-orange-400"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-lg font-medium text-orange-700 mb-2">Next Step: Experimenting with Tokenization</h3>
        <p className="mb-3">
          Now that we understand the full pipeline from <strong>text to embeddings</strong>, it's time to experiment and see the 
          effects of different tokenization choices in real-world scenarios.
        </p>
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <div className="bg-purple-100 p-3 rounded-lg mb-2 border border-purple-200">
              <div className="font-medium">Word Embeddings</div>
              <div className="font-mono text-xs">Theoretical Understanding</div>
            </div>
            <div className="text-xs text-gray-500">What we've learned</div>
          </div>
          <motion.div 
            className="flex items-center"
            initial={{ width: 0 }}
            whileInView={{ width: "auto" }}
            viewport={{ once: true }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <svg width="80" height="40" viewBox="0 0 80 40">
              <motion.path 
                d="M0,20 C20,15 40,25 60,20" 
                stroke="#f97316" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 1.1 }}
              />
              <motion.polygon 
                points="60,20 50,16 52,24" 
                fill="#f97316"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 2.3 }}
              />
              <motion.circle 
                cx="20" cy="15" r="3" 
                fill="#f97316"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2, delay: 1.6 }}
              />
              <motion.circle 
                cx="40" cy="25" r="3" 
                fill="#f97316"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2, delay: 1.8 }}
              />
            </svg>
          </motion.div>
          <div className="text-center">
            <div className="bg-orange-100 p-3 rounded-lg mb-2 border border-orange-200">
              <div className="font-medium">Experimentation</div>
              <div className="font-mono text-xs">Practical Applications</div>
            </div>
            <div className="text-xs text-gray-500">What comes next</div>
          </div>
        </div>
        <p>
          In the next step, we'll <strong>experiment with different tokenization strategies</strong> and see their real impact on 
          model performance. We'll explore how the choices we've learned about affect model accuracy, efficiency, and even 
          fairness across different languages and domains.
        </p>
      </motion.div>
    </>
  );
}

