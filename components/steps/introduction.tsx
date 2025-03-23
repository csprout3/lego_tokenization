"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { TextInput } from "@/components/ui/text-input"
import { LegoBlock } from "@/components/ui/lego-block"

export default function Introduction({ 
  sampleText, 
  setSampleText,
  hideVisualization = true
}: { 
  sampleText: string;
  setSampleText: (text: string) => void;
  hideVisualization?: boolean;
}) {
  // Local state to track tokens
  const [tokens, setTokens] = useState<string[]>([])

  // Update tokens when sampleText changes
  useEffect(() => {
    setTokens(sampleText.split(/\s+/).filter(Boolean))
  }, [sampleText])

  // Animation variants with slower timing for a smoother transition from landing
  const pageTransition = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        when: "beforeChildren",
        staggerChildren: 0.2,
      },
    },
  }

  // Animation variants
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
    <div>
      <motion.div
        className="space-y-6"
        variants={pageTransition}
        initial="hidden"
        animate="show" // Changed from whileInView to animate to ensure it always renders
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-yellow-600"
        >
          Step 1: Introduction - What is Tokenization?
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }} // Changed from whileInView to animate
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            <p className="mb-4">
              Tokenization is the process of breaking text into smaller units called tokens. Think of it like taking apart
              a LEGO structure into individual bricks:
            </p>

            <motion.ul
              className="list-disc pl-5 space-y-2 mb-4"
              variants={container}
              initial="hidden"
              animate="show" // Changed from whileInView to animate
              viewport={{ once: true }}
            >
              <motion.li variants={item}>A complete LEGO structure represents a full sentence or paragraph</motion.li>
              <motion.li variants={item}>
                Individual LEGO bricks represent tokens (words, punctuation, or subwords)
              </motion.li>
              <motion.li variants={item}>
                Just as LEGO bricks come in different shapes and colors, tokens can be of different types
              </motion.li>
            </motion.ul>

            <p className="mb-4">
              Try typing a sentence below to see it broken down into tokens (represented as LEGO blocks):
            </p>

            <TextInput
              value={sampleText}
              onChange={(text) => {
                console.log("Introduction text changed:", text)
                setSampleText(text)
              }}
              label="Enter a sentence:"
            />
          </motion.div>

          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }} // Changed from whileInView to animate
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }} // Changed from whileInView to animate
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
            >

              {!hideVisualization && (
                <div className="border-2 border-yellow-300 p-4 rounded-lg bg-yellow-50/50">
                  <div className="flex flex-wrap justify-center">
                    {tokens.map((token: string, i: number) => (
                      <motion.div
                        key={`token-${i}-${token}`}
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        whileHover={{
                          scale: 1.1,
                          transition: { duration: 0.2 },
                        }}
                      >
                        <LegoBlock text={token} color={token.match(/[.!?,;:]/) ? "bg-red-200" : "bg-yellow-200"} />
                      </motion.div>
                    ))}
                  </div>
                  {tokens.length === 0 && (
                    <div className="text-center p-4 text-gray-500">Please enter some text to see the LEGO blocks</div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Transition to Basic Tokenization */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border-l-4 border-red-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <h3 className="text-lg font-medium text-red-700 mb-2">Next Step: From Words to Tokens</h3>
        <p className="mb-3">
          While we've seen how sentences can be represented as blocks, we need to <strong>establish formal rules for breaking down text</strong>. 
          Different models might have different ways of splitting text into tokens.
        </p>
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <div className="bg-yellow-100 p-3 rounded-lg mb-2 border border-yellow-200">
              <div className="font-medium">Raw Sentence</div>
              <div className="font-mono text-sm">"Hello, world!"</div>
            </div>
            <div className="text-xs text-gray-500">Unprocessed text</div>
          </div>
          <motion.div 
            className="flex items-center"
            initial={{ width: 0 }}
            animate={{ width: "auto" }}
            transition={{ delay: 1.4, duration: 0.5 }}
          >
            <svg width="60" height="40" viewBox="0 0 60 40">
              <motion.path 
                d="M0,20 L48,20" 
                stroke="#e05d44" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 1.5 }}
              />
              <motion.polygon 
                points="48,20 38,15 38,25" 
                fill="#e05d44"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 2.4 }}
              />
            </svg>
          </motion.div>
          <div className="text-center">
            <div className="bg-red-100 p-3 rounded-lg mb-2 border border-red-200">
              <div className="font-medium">Individual Tokens</div>
              <div className="font-mono text-xs">Hello | , | world | !</div>
            </div>
            <div className="text-xs text-gray-500">Words and punctuation split apart</div>
          </div>
        </div>
        <p>
          In the next step, we'll explore <strong>basic tokenization methods</strong> that determine how text should be 
          divided into meaningful units. This is the first formal step in preparing text for machine learning models, and 
          we'll see how different tokenization strategies affect the resulting tokens.
        </p>
      </motion.div>
    </div>
  )
}

