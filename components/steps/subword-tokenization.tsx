"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { LegoBlock } from "@/components/ui/lego-block"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextInput } from "@/components/ui/text-input"

export default function SubwordTokenization({ 
  sampleText,
  setSampleText,
  hideVisualization = true
}: { 
  sampleText: string;
  setSampleText: (text: string) => void;
  hideVisualization?: boolean;
}) {
  const [tokenizationMethod, setTokenizationMethod] = useState("bpe")
  const [localTokens, setLocalTokens] = useState<string[]>([])

  // Emit custom event when tokenization method changes
  useEffect(() => {
    // Dispatch custom event with the section and method
    if (typeof window !== 'undefined') {
      try {
        const event = new CustomEvent('tokenization-method-change', {
          detail: {
            section: 'subword',
            method: tokenizationMethod
          }
        });
        console.log(`%c📣 Emitting subword tokenization method change: ${tokenizationMethod}`, 'background: #2196f3; color: white; padding: 3px; border-radius: 3px;');
        window.dispatchEvent(event);
        
        // Force a re-render on the parent components
        setTimeout(() => {
          const refreshEvent = new CustomEvent('force-lego-refresh', {
            detail: { timestamp: Date.now() }
          });
          window.dispatchEvent(refreshEvent);
        }, 100);
      } catch (error) {
        console.error('Error dispatching tokenization method change event:', error);
      }
    }
  }, [tokenizationMethod]);

  // Simplified subword tokenization simulation
  const simulateSubwordTokenization = (text: string, method: string) => {
    // This is a simplified simulation of subword tokenization
    const words = text.split(/\s+/).filter(Boolean)

    return words.flatMap((word) => {
      // For demonstration purposes, we'll use some simple rules
      if (word.length <= 3) return [word]

      switch (method) {
        case "bpe":
          // Simulate BPE by splitting longer words
          if (word.endsWith("ing")) {
            return [word.slice(0, -3), "##ing"]
          } else if (word.endsWith("ed")) {
            return [word.slice(0, -2), "##ed"]
          } else if (word.endsWith("s") && word.length > 4) {
            return [word.slice(0, -1), "##s"]
          } else if (word.length > 6) {
            const splitPoint = Math.floor(word.length / 2)
            return [word.slice(0, splitPoint), `##${word.slice(splitPoint)}`]
          }
          return [word]

        case "wordpiece":
          // Simulate WordPiece
          if (word.endsWith("ing")) {
            return [word.slice(0, -3), "##ing"]
          } else if (word.endsWith("ed")) {
            return [word.slice(0, -2), "##ed"]
          } else if (word.length > 5) {
            const splitPoint = Math.ceil(word.length / 2)
            return [word.slice(0, splitPoint), `##${word.slice(splitPoint)}`]
          }
          return [word]

        case "sentencepiece":
          // Simulate SentencePiece (character-based for simplicity)
          if (word.length > 5) {
            return [word.slice(0, 2), word.slice(2, 4), word.slice(4)]
          } else if (word.length > 3) {
            return [word.slice(0, 2), word.slice(2)]
          }
          return [word]

        default:
          return [word]
      }
    })
  }

  // Update tokens when text or method changes
  useEffect(() => {
    setLocalTokens(simulateSubwordTokenization(sampleText, tokenizationMethod))
  }, [sampleText, tokenizationMethod])

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  }

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-bold text-blue-600"
      >
        Step 3: Subword Tokenization - The Shape of LEGO Bricks
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        viewport={{ once: true }}
        className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100"
      >
        <p className="text-sm mb-3">
          <strong>Why do we need subword tokenization?</strong> It allows language models to handle rare words, neologisms, and different word forms efficiently while keeping the vocabulary size manageable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-white rounded shadow-sm border-l-4 border-blue-400">
            <strong>BPE (Byte Pair Encoding)</strong>: Starts with individual characters and iteratively merges the most frequent pairs. Used by GPT models, it's excellent for handling complex words by breaking them into meaningful subunits.
          </div>
          <div className="p-3 bg-white rounded shadow-sm border-l-4 border-blue-400">
            <strong>WordPiece</strong>: Used by BERT, this method starts with whole words and breaks them down based on likelihood. It's optimized for balancing vocabulary size with linguistic meaning, especially good for morphologically rich languages.
          </div>
          <div className="p-3 bg-white rounded shadow-sm border-l-4 border-blue-400">
            <strong>SentencePiece</strong>: Treats spaces as regular characters without pre-tokenization. Designed to be language-agnostic, it works well with languages that have different writing systems and word boundaries (like Japanese or Thai).
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="mb-4">Subword tokenization breaks words into smaller units, which helps models handle:</p>

          <motion.ul
            className="list-disc pl-5 space-y-2 mb-4"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <motion.li variants={item}>Rare words and out-of-vocabulary words</motion.li>
            <motion.li variants={item}>Morphologically rich languages</motion.li>
            <motion.li variants={item}>Words with common prefixes and suffixes</motion.li>
          </motion.ul>

          <p className="mb-4">Try different tokenization methods to see how they break down words:</p>

          <Tabs value={tokenizationMethod} onValueChange={setTokenizationMethod} className="mb-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="bpe">BPE</TabsTrigger>
              <TabsTrigger value="wordpiece">WordPiece</TabsTrigger>
              <TabsTrigger value="sentencepiece">SentencePiece</TabsTrigger>
            </TabsList>
          </Tabs>

          <TextInput
            value={sampleText}
            onChange={(text) => {
              console.log("Subword tokenization text changed:", text)
              setSampleText(text)
            }}
            label="Try words with prefixes and suffixes:"
            placeholder="Try words like 'running', 'jumped', 'unhappiness'"
          />
        </motion.div>

        {!hideVisualization && (
          <motion.div
            className="border-2 border-gray-300 p-4 rounded-lg"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
          >
            <p className="text-center mb-4 font-medium">Subword Tokenization</p>

            <motion.div
              className="flex flex-wrap justify-center"
              variants={container}
              initial="hidden"
              animate="show"
              viewport={{ once: true }}
            >
              {localTokens.map((token, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  whileHover={{
                    scale: 1.1,
                    transition: { duration: 0.2 },
                  }}
                >
                  <LegoBlock
                    text={token}
                    color={token.startsWith("##") ? "bg-blue-300" : "bg-blue-200"}
                    isSubword={token.startsWith("##")}
                  />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              viewport={{ once: true }}
            >
              <h4 className="font-medium mb-2">About {tokenizationMethod.toUpperCase()}</h4>
              {tokenizationMethod === "bpe" && (
                <motion.p
                  className="text-sm"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <strong>Byte Pair Encoding (BPE)</strong> starts with characters and iteratively merges the most frequent pairs to form
                  new tokens. It works by first splitting text into individual characters, then repeatedly combining the most 
                  common adjacent pairs until reaching a desired vocabulary size.
                  <br /><br />
                  <strong>Inspiration:</strong> Originally developed for data compression in the 1990s, BPE was adapted for NLP by OpenAI for 
                  their GPT models. It's inspired by how humans naturally recognize common word parts (like "-ing" and "un-") 
                  and is particularly effective for handling rare words by breaking them into meaningful subunits.
                </motion.p>
              )}
              {tokenizationMethod === "wordpiece" && (
                <motion.p
                  className="text-sm"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <strong>WordPiece</strong> uses a greedy algorithm that starts with whole words and iteratively breaks them down into smaller units
                  based on likelihood scores. It marks subwords with ## prefix to indicate they are continuations rather than beginnings of words.
                  <br /><br />
                  <strong>Inspiration:</strong> Developed by Google for machine translation, WordPiece is inspired by language morphology - how words 
                  are constructed from smaller meaningful units. The approach helps models understand relationships between words with 
                  similar roots (like "play" and "playing"). It's used by BERT and other models to balance vocabulary size with linguistic meaning.
                </motion.p>
              )}
              {tokenizationMethod === "sentencepiece" && (
                <motion.p
                  className="text-sm"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <strong>SentencePiece</strong> treats spaces as regular characters and tokenizes the raw text without any pre-tokenization steps.
                  It implements both BPE and a unigram language model variant, but its key innovation is handling the text as a raw character stream.
                  <br /><br />
                  <strong>Inspiration:</strong> Developed to address challenges in multilingual models, SentencePiece is inspired by the need for a 
                  language-agnostic approach to tokenization. It works equally well across languages with different writing systems and 
                  word boundaries (like Japanese or Thai), making it ideal for cross-lingual models like XLM-R and mT5.
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Transition to Token IDs */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-l-4 border-green-400"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-lg font-medium text-green-700 mb-2">Next Step: Turning Words Into Numbers</h3>
        <p className="mb-3">
          Now that we have our tokens broken down appropriately, we need to <strong>convert them into a format that machines can understand</strong>.
          Computers don't process text directly - they work with numbers.
        </p>
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-lg mb-2 border border-blue-200">
              <div className="font-medium">Subword Tokens</div>
              <div className="font-mono text-sm">play</div>
              <div className="font-mono text-sm">##ing</div>
            </div>
            <div className="text-xs text-gray-500">Text tokens</div>
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
                stroke="#22c55e" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1.1 }}
              />
              <motion.polygon 
                points="48,20 38,15 38,25" 
                fill="#22c55e"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 2 }}
              />
            </svg>
          </motion.div>
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-lg mb-2 border border-green-200">
              <div className="font-medium">Token IDs</div>
              <div className="font-mono text-sm">42</div>
              <div className="font-mono text-sm">18</div>
            </div>
            <div className="text-xs text-gray-500">Numerical representation</div>
          </div>
        </div>
        <p>
          In the next step, we'll explore how tokens are <strong>mapped to unique numerical IDs</strong> in a vocabulary. 
          This mapping is essential for machine learning models, as they can only process numerical inputs. Each token gets 
          assigned a unique ID that the model will use for all its operations.
        </p>
      </motion.div>
    </div>
  )
}

