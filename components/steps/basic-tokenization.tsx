"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { TextInput } from "@/components/ui/text-input"
import { LegoBlock } from "@/components/ui/lego-block"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function BasicTokenization({ 
  sampleText,
  setSampleText,
  hideVisualization = true
}: { 
  sampleText: string;
  setSampleText: (text: string) => void;
  hideVisualization?: boolean;
}) {
  const [tokenizationMethod, setTokenizationMethod] = useState("whitespace")
  const [localTokens, setLocalTokens] = useState<string[]>([])

  // Emit custom event when tokenization method changes
  useEffect(() => {
    // Dispatch custom event with the section and method
    if (typeof window !== 'undefined') {
      try {
        const event = new CustomEvent('tokenization-method-change', {
          detail: {
            section: 'basic',
            method: tokenizationMethod
          }
        });
        console.log(`%c📣 Emitting basic tokenization method change: ${tokenizationMethod}`, 'background: #f44336; color: white; padding: 3px; border-radius: 3px;');
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

  // Different tokenization methods
  const tokenize = (text: string, method: string) => {
    switch (method) {
      case "whitespace":
        return text.split(/\s+/).filter(Boolean)
      case "whitespace-punctuation":
        return text
          .split(/\s+/)
          .filter(Boolean)
          .flatMap((word) => {
            // Split punctuation from words
            const matches = word.match(/([A-Za-z0-9]+)|([^A-Za-z0-9]+)/g)
            return matches || []
          })
      case "character":
        return text.split("")
      default:
        return text.split(/\s+/).filter(Boolean)
    }
  }

  // Update tokens when text or method changes
  useEffect(() => {
    setLocalTokens(tokenize(sampleText, tokenizationMethod))
  }, [sampleText, tokenizationMethod])

  const getTokenColor = (token: string) => {
    if (token.match(/^[A-Za-z]+$/)) return "bg-blue-200"
    if (token.match(/^[0-9]+$/)) return "bg-green-200"
    if (token.match(/[.!?,;:]/)) return "bg-red-200"
    return "bg-yellow-200"
  }

  // Animation variants for staggered animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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
        className="text-2xl font-bold text-red-600"
      >
        Step 2: Basic Tokenization - Breaking LEGO Blocks Apart
      </motion.h2>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="mb-4">
            Basic tokenization is the process of breaking text into smaller, meaningful units. There are several ways to
            do this:
          </p>

          <RadioGroup value={tokenizationMethod} onValueChange={setTokenizationMethod} className="mb-4">
            <motion.div
              className="flex items-center space-x-2 mb-2"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              <RadioGroupItem value="whitespace" id="whitespace" />
              <Label htmlFor="whitespace">Whitespace Tokenization</Label>
            </motion.div>
            <motion.div
              className="flex items-center space-x-2 mb-2"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <RadioGroupItem value="whitespace-punctuation" id="whitespace-punctuation" />
              <Label htmlFor="whitespace-punctuation">Whitespace + Punctuation</Label>
            </motion.div>
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
            >
              <RadioGroupItem value="character" id="character" />
              <Label htmlFor="character">Character-level</Label>
            </motion.div>
          </RadioGroup>

          <TextInput
            value={sampleText}
            onChange={(text) => {
              console.log("Basic tokenization text changed:", text)
              setSampleText(text)
            }}
            label="Try different sentences:"
          />

          <motion.div
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-gray-500 mb-1">Token count: {localTokens.length}</p>
            <div className="flex flex-wrap items-center border p-3 rounded-md bg-gray-50">
              {localTokens.map((token, i) => (
                <motion.span
                  key={i}
                  className="mx-1 my-0.5 px-1.5 py-0.5 bg-gray-200 rounded text-sm"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * Math.min(i, 10), duration: 0.3 }}
                  viewport={{ once: true }}
                >
                  {token}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {!hideVisualization && (
          <motion.div
            className="border-2 border-gray-300 p-4 rounded-lg"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
          >
            <p className="text-center mb-4 font-medium">LEGO Block Visualization</p>

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
                  custom={i}
                  whileHover={{
                    scale: 1.1,
                    transition: { duration: 0.2 },
                  }}
                >
                  <LegoBlock text={token} color={getTokenColor(token)} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-6 grid grid-cols-2 gap-2 text-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-200 mr-2 rounded"></div>
                <span>Words</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-200 mr-2 rounded"></div>
                <span>Numbers</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-200 mr-2 rounded"></div>
                <span>Punctuation</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-200 mr-2 rounded"></div>
                <span>Other</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Transition to Subword Tokenization */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-red-50 to-blue-50 rounded-lg border-l-4 border-blue-400"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-lg font-medium text-blue-700 mb-2">Next Step: Breaking Words Into Smaller Pieces</h3>
        <p className="mb-3">
          Basic tokenization works well for many cases, but it has <strong>limitations when dealing with rare or unknown words</strong>. 
          What if we could break words down even further into meaningful subunits?
        </p>
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <div className="bg-red-100 p-3 rounded-lg mb-2 border border-red-200">
              <div className="font-medium">Basic Tokens</div>
              <div className="font-mono text-sm">playing</div>
            </div>
            <div className="text-xs text-gray-500">Whole words as tokens</div>
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
                d="M0,20 L40,20" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 1.1 }}
              />
              <motion.path 
                d="M40,20 L40,10 L40,30" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1.9 }}
              />
              <motion.path 
                d="M40,10 L70,10" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 2.4 }}
              />
              <motion.path 
                d="M40,30 L70,30" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 2.4 }}
              />
            </svg>
          </motion.div>
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-lg mb-2 border border-blue-200">
              <div className="font-medium">Subword Tokens</div>
              <div className="font-mono text-xs">play + ##ing</div>
            </div>
            <div className="text-xs text-gray-500">Words split into meaningful units</div>
          </div>
        </div>
        <p>
          In the next step, we'll explore how <strong>subword tokenization</strong> breaks words down into smaller, 
          meaningful units. This approach helps models better understand rare words, word variations, and even entirely 
          new words by recognizing familiar parts (like prefixes and suffixes).
        </p>
      </motion.div>
    </div>
  )
}

