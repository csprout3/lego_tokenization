"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Info } from "lucide-react"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define tokenization schemes with their metrics and explanations
const tokenizationSchemes = [
  {
    id: "word",
    name: "Word-level",
    color: "bg-blue-200",
    description: "Splits text by spaces and punctuation",
    metrics: {
      tokensGenerated: "Low",
      averageTokenLength: "High",
      oovRate: "High",
      perplexity: "Medium",
      embeddingUtilization: "Efficient",
      inferenceSpeed: "Fast",
      compressionRatio: "High",
      semanticUnderstanding: "Limited for rare words",
    },
    explanation:
      "Word-level tokenization creates fewer tokens, making processing faster, but struggles with out-of-vocabulary words. This scheme works well for common language but performs poorly with rare words, technical terms, or multilingual content. Models using word-level tokenization typically have faster inference speeds but may have higher perplexity when encountering unfamiliar words.",
  },
  {
    id: "bpe",
    name: "Byte-Pair Encoding (BPE)",
    color: "bg-green-200",
    description: "Merges common character pairs iteratively",
    metrics: {
      tokensGenerated: "Medium",
      averageTokenLength: "Medium",
      oovRate: "Low",
      perplexity: "Low",
      embeddingUtilization: "Very efficient",
      inferenceSpeed: "Medium",
      compressionRatio: "Medium",
      semanticUnderstanding: "Strong",
    },
    explanation:
      "BPE strikes an excellent balance between efficiency and understanding. By merging common character pairs, it creates meaningful subword units that capture morphology while keeping the vocabulary manageable. Models using BPE (like GPT) show lower perplexity and better handling of rare words. The compression ratio is moderate, allowing for efficient processing while maintaining semantic understanding across languages and domains.",
  },
  {
    id: "wordpiece",
    name: "WordPiece",
    color: "bg-purple-200",
    description: "Splits words into common subwords with ## prefix",
    metrics: {
      tokensGenerated: "Medium",
      averageTokenLength: "Medium",
      oovRate: "Low",
      perplexity: "Low",
      embeddingUtilization: "Efficient",
      inferenceSpeed: "Medium",
      compressionRatio: "Medium",
      semanticUnderstanding: "Strong",
    },
    explanation:
      "WordPiece (used by BERT) creates subword tokens that maintain word boundaries with ## prefixes. This approach provides strong semantic understanding while keeping sequences manageable. The explicit marking of subword continuations helps the model understand morphology. WordPiece shows good performance across languages with regular morphological patterns and achieves a good balance between token count and semantic preservation.",
  },
  {
    id: "character",
    name: "Character-level",
    color: "bg-red-200",
    description: "Treats each character as a separate token",
    metrics: {
      tokensGenerated: "Very high",
      averageTokenLength: "Very low",
      oovRate: "None",
      perplexity: "Variable",
      embeddingUtilization: "Inefficient",
      inferenceSpeed: "Slow",
      compressionRatio: "Very low",
      semanticUnderstanding: "Requires deeper networks",
    },
    explanation:
      "Character-level tokenization eliminates the out-of-vocabulary problem completely but creates very long sequences. This dramatically increases computational requirements and context length. While it can theoretically handle any text, models need to be much deeper to learn meaningful patterns from characters. The extremely low compression ratio means slower inference and higher memory usage, making it impractical for many applications despite its flexibility.",
  },
  {
    id: "sentencepiece",
    name: "SentencePiece",
    color: "bg-yellow-200",
    description: "Language-agnostic subword tokenization",
    metrics: {
      tokensGenerated: "Medium",
      averageTokenLength: "Medium",
      oovRate: "Very low",
      perplexity: "Low",
      embeddingUtilization: "Very efficient",
      inferenceSpeed: "Medium",
      compressionRatio: "Medium",
      semanticUnderstanding: "Excellent for multilingual",
    },
    explanation:
      "SentencePiece excels in multilingual settings by treating spaces as regular characters. This language-agnostic approach works exceptionally well for languages without clear word boundaries (like Japanese or Chinese) while still performing well on space-delimited languages. Models using SentencePiece show consistent performance across diverse languages and achieve excellent semantic understanding with reasonable sequence lengths.",
  },
]

// Draggable tokenization scheme component
const DraggableScheme = ({ scheme }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "TOKENIZATION_SCHEME",
    item: { id: scheme.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      className={`${scheme.color} p-3 rounded-lg shadow-sm cursor-move transition-transform ${
        isDragging ? "opacity-50" : "opacity-100"
      } hover:shadow-md`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <p className="font-medium text-sm">{scheme.name}</p>
      <p className="text-xs mt-1 text-gray-700">{scheme.description}</p>
    </div>
  )
}

// Model representation with drop target
const ModelRepresentation = ({ onDrop, selectedScheme }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "TOKENIZATION_SCHEME",
    drop: (item) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))

  return (
    <div
      ref={drop}
      className={`border-2 ${
        isOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
      } rounded-lg p-4 h-48 flex flex-col items-center justify-center transition-colors`}
    >
      {selectedScheme ? (
        <div className="text-center">
          <div className={`inline-block ${selectedScheme.color} px-3 py-1 rounded-full mb-2`}>
            <span className="font-medium">{selectedScheme.name}</span>
          </div>
          <div className="flex justify-center">
            <Brain className="h-24 w-24 text-gray-400" />
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          <p className="mb-2 font-medium">Drag a tokenization scheme here</p>
          <p className="text-sm">See how it affects model performance</p>
        </div>
      )}
    </div>
  )
}

// Typing effect component
const TypingEffect = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!text) {
      setDisplayedText("")
      setCurrentIndex(0)
      return
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex(currentIndex + 1)
      }, 15) // Adjust speed as needed

      return () => clearTimeout(timer)
    }
  }, [text, currentIndex])

  // Reset when text changes
  useEffect(() => {
    setDisplayedText("")
    setCurrentIndex(0)
  }, [text])

  return (
    <div className="font-mono text-sm">
      {displayedText}
      {currentIndex < (text?.length || 0) && <span className="animate-pulse">|</span>}
    </div>
  )
}

// Metrics display component
const MetricsDisplay = ({ metrics }) => {
  if (!metrics) return null

  const getColorClass = (value) => {
    switch (value) {
      case "Very high":
      case "Very low":
        return "text-red-600"
      case "High":
      case "Low":
        return "text-orange-600"
      case "Medium":
        return "text-blue-600"
      case "Efficient":
      case "Very efficient":
      case "Strong":
      case "Excellent for multilingual":
        return "text-green-600"
      case "Inefficient":
      case "Slow":
      case "Limited for rare words":
        return "text-red-600"
      case "Requires deeper networks":
        return "text-red-600"
      case "Fast":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  // Metric definitions and examples
  const metricInfo = {
    tokensGenerated: {
      definition: "The number of tokens created when processing text",
      role: "Affects processing time, memory usage, and context length",
      example:
        "The sentence 'I don't understand' becomes:\n• Word-level: 3 tokens ['I', 'don't', 'understand']\n• Character-level: 17 tokens (one per character)",
    },
    averageTokenLength: {
      definition: "Average number of characters per token",
      role: "Indicates how much information is packed into each token",
      example: "Word-level tokens are longer (avg ~5 chars), while character tokens are always 1 char long",
    },
    oovRate: {
      definition: "Percentage of words not in the vocabulary (Out-of-Vocabulary)",
      role: "Measures how well the tokenizer handles unseen words",
      example:
        "The word 'antidisestablishmentarianism' might be OOV in word-level tokenization but handled by subword methods",
    },
    perplexity: {
      definition: "Measure of how well the model predicts the next token",
      role: "Lower values indicate better predictions and understanding",
      example: "A model with perplexity of 10 is more confident in its predictions than one with perplexity of 50",
    },
    embeddingUtilization: {
      definition: "How efficiently token embeddings represent meaning",
      role: "Affects model size and semantic understanding",
      example: "Word-level: fewer embeddings but may miss nuance\nSubword: more embeddings that capture morphology",
    },
    inferenceSpeed: {
      definition: "How quickly the model processes input",
      role: "Determines real-time performance and computational cost",
      example: "Processing 'internationalization' as 1 token is faster than as 20 character tokens",
    },
    compressionRatio: {
      definition: "Ratio of raw text length to tokenized representation",
      role: "Affects sequence length and memory requirements",
      example: "Higher compression: 'I'm learning' → 2 tokens\nLower compression: 'I'm learning' → 12 character tokens",
    },
    semanticUnderstanding: {
      definition: "How well tokenization preserves meaning",
      role: "Determines the model's ability to understand language nuances",
      example:
        "Subword methods can understand that 'unhappy' relates to 'happy', while character-level might miss this connection",
    },
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="col-span-2 font-medium text-gray-700">Tokenization-Specific Metrics:</div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Number of Tokens Generated</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.tokensGenerated.definition}</p>
                <p className="mt-1">Role: {metricInfo.tokensGenerated.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.tokensGenerated.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.tokensGenerated)}`}>{metrics.tokensGenerated}</p>
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Average Token Length</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.averageTokenLength.definition}</p>
                <p className="mt-1">Role: {metricInfo.averageTokenLength.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.averageTokenLength.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.averageTokenLength)}`}>{metrics.averageTokenLength}</p>
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Out-of-Vocabulary Rate</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.oovRate.definition}</p>
                <p className="mt-1">Role: {metricInfo.oovRate.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">{metricInfo.oovRate.example}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.oovRate)}`}>{metrics.oovRate}</p>
        </div>

        <div className="col-span-2 font-medium text-gray-700 mt-2">Model Performance Metrics:</div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Perplexity</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.perplexity.definition}</p>
                <p className="mt-1">Role: {metricInfo.perplexity.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.perplexity.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.perplexity)}`}>{metrics.perplexity}</p>
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Embedding Utilization</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.embeddingUtilization.definition}</p>
                <p className="mt-1">Role: {metricInfo.embeddingUtilization.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.embeddingUtilization.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.embeddingUtilization)}`}>{metrics.embeddingUtilization}</p>
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Inference Speed</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.inferenceSpeed.definition}</p>
                <p className="mt-1">Role: {metricInfo.inferenceSpeed.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.inferenceSpeed.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.inferenceSpeed)}`}>{metrics.inferenceSpeed}</p>
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Compression Ratio</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.compressionRatio.definition}</p>
                <p className="mt-1">Role: {metricInfo.compressionRatio.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.compressionRatio.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.compressionRatio)}`}>{metrics.compressionRatio}</p>
        </div>

        <div className="col-span-2 bg-gray-50 p-2 rounded">
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <p className="text-xs font-medium">Semantic Understanding</p>
                  <Info className="h-3.5 w-3.5 ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium">Definition: {metricInfo.semanticUnderstanding.definition}</p>
                <p className="mt-1">Role: {metricInfo.semanticUnderstanding.role}</p>
                <p className="mt-1 text-xs bg-gray-100 p-1 rounded whitespace-pre-line">
                  {metricInfo.semanticUnderstanding.example}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className={`text-sm ${getColorClass(metrics.semanticUnderstanding)}`}>{metrics.semanticUnderstanding}</p>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default function TokenizationImpact({ sampleText, setSampleText }) {
  const [selectedSchemeId, setSelectedSchemeId] = useState(null)
  const selectedScheme = tokenizationSchemes.find((scheme) => scheme.id === selectedSchemeId)

  const handleDrop = (schemeId) => {
    setSelectedSchemeId(schemeId)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-indigo-600">Step 7: Impact of Tokenization on Model Performance</h2>

      <p className="mb-4">
        Different tokenization schemes significantly affect how language models learn patterns between words and
        sentences. Good tokenization leads to better model performance, while poor tokenization can degrade results.
        Drag a tokenization scheme to the model to see how it affects performance.
      </p>

      <DndProvider backend={HTML5Backend}>
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium mb-3">Available Tokenization Schemes</h4>
            <div className="space-y-3">
              {tokenizationSchemes.map((scheme) => (
                <DraggableScheme key={scheme.id} scheme={scheme} />
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Language Model</h4>
            <ModelRepresentation onDrop={handleDrop} selectedScheme={selectedScheme} />

            <AnimatePresence>
              {selectedScheme && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200"
                >
                  <h4 className="font-medium mb-2">Performance Analysis</h4>
                  <div className="bg-white p-3 rounded border">
                    <TypingEffect text={selectedScheme.explanation} />
                  </div>

                  <MetricsDisplay metrics={selectedScheme.metrics} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DndProvider>

      <div className="bg-indigo-50 p-4 rounded-lg">
        <h3 className="font-medium text-indigo-700 mb-2">Why Tokenization Choice Matters</h3>
        <p className="text-sm">
          The tokenization scheme you choose directly impacts model performance across multiple dimensions. It affects
          not only how well the model understands language, but also its computational efficiency, memory usage, and
          ability to handle diverse languages and domains. The right tokenization scheme depends on your specific use
          case, language requirements, and computational constraints.
        </p>
      </div>

      {/* Transition to Conclusion */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-indigo-50 to-teal-50 rounded-lg border-l-4 border-teal-400"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-lg font-medium text-teal-700 mb-2">Next Step: Bringing It All Together</h3>
        <p className="mb-3">
          After examining tokenization's broad impacts, it's time to <strong>synthesize everything we've learned</strong> and 
          consider how tokenization fits into the broader landscape of language model development.
        </p>
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <div className="bg-indigo-100 p-3 rounded-lg mb-2 border border-indigo-200">
              <div className="font-medium">Impact Analysis</div>
              <div className="font-mono text-xs">Specific Effects</div>
            </div>
            <div className="text-xs text-gray-500">What we've examined</div>
          </div>
          <motion.div 
            className="flex items-center"
            initial={{ width: 0 }}
            whileInView={{ width: "auto" }}
            viewport={{ once: true }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <svg width="60" height="40" viewBox="0 0 60 40">
              <motion.path 
                d="M0,20 L48,20" 
                stroke="#14b8a6" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1.1 }}
              />
              <motion.polygon 
                points="48,20 38,15 38,25" 
                fill="#14b8a6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 2 }}
              />
            </svg>
          </motion.div>
          <div className="text-center">
            <div className="bg-teal-100 p-3 rounded-lg mb-2 border border-teal-200">
              <div className="font-medium">Conclusion</div>
              <div className="font-mono text-xs">Complete Picture</div>
            </div>
            <div className="text-xs text-gray-500">What comes next</div>
          </div>
        </div>
        <p>
          In the final step, we'll <strong>summarize the key insights</strong> from our journey through tokenization and 
          discuss how these concepts apply to modern NLP systems. We'll reflect on the trade-offs involved in 
          tokenization approaches and consider future directions for this essential component of language models.
        </p>
      </motion.div>
    </div>
  )
}

