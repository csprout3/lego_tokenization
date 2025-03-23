"use client"

import { motion } from "framer-motion"
import { TextInput } from "@/components/ui/text-input"
import { LegoBlock } from "@/components/ui/lego-block"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function TokenToId({ 
  sampleText, 
  setSampleText,
  hideVisualization = true
}: {
  sampleText: string;
  setSampleText: (text: string) => void;
  hideVisualization?: boolean;
}) {
  // Simple tokenization
  const tokens = sampleText
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word: string) => {
      // Split punctuation from words
      const matches = word.match(/([A-Za-z0-9]+)|([^A-Za-z0-9]+)/g)
      return matches || []
    })

  // Create a simple vocabulary
  const createVocabulary = (tokens: string[]) => {
    const uniqueTokens = Array.from(new Set(tokens))
    return uniqueTokens.reduce((acc: {[key: string]: number}, token: string, index: number) => {
      acc[token] = index + 1 // Start IDs from 1
      return acc
    }, {})
  }

  const vocabulary = createVocabulary(tokens)

  // Get token IDs
  const tokenIds = tokens.map((token: string) => vocabulary[token])

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

  // Table animation variants
  const tableContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
      },
    },
  }

  const tableRow = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  }

  return (
    <div className="space-y-6">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-green-600"
      >
        Step 4: Token-to-ID Mapping - Giving LEGO Bricks Serial Numbers
      </motion.h2>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <p className="mb-4">
            For a machine learning model to process text, tokens must be converted to numbers. Each unique token is
            assigned a unique ID in the model's vocabulary.
          </p>

          <TextInput value={sampleText} onChange={setSampleText} label="Try different text:" />

          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h4 className="font-medium mb-2">Vocabulary (Token → ID)</h4>
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              <Table className="border-separate border-spacing-y-10">
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <motion.tbody variants={tableContainer} initial="hidden" animate="show">
                  {Object.entries(vocabulary).map(([token, id]) => (
                    <motion.tr key={token} variants={tableRow}>
                      <TableCell>{token}</TableCell>
                      <TableCell>{id}</TableCell>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </Table>
            </div>
          </motion.div>
        </motion.div>

        {/* Only show visualization if hideVisualization is false */}
        {!hideVisualization && (
          <motion.div
            className="border-2 border-gray-300 p-4 rounded-lg"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-center mb-4 font-medium">LEGO Blocks with IDs</p>

            {/* Add more vertical spacing between rows by using grid instead of flex-wrap */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-6 justify-items-center mb-6"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {tokens.map((token: string, i: number) => (
                <motion.div
                  key={i}
                  variants={item}
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.2 },
                  }}
                >
                  <LegoBlock text={token} color="bg-green-200" id={vocabulary[token]} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="mt-10" // Increased top margin for better separation
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <h4 className="font-medium mb-2">Input to the Model</h4>
              <motion.div
                className="p-3 bg-gray-100 rounded-md overflow-x-auto"
                initial={{ opacity: 0, scaleY: 0.8 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: 0.9 }}
              >
                <code className="text-sm whitespace-nowrap">Input IDs: [{tokenIds.join(", ")}]</code>
              </motion.div>
              <motion.p
                className="mt-4 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                These numerical IDs are what the model actually processes. The model never "sees" the original text, only
                these numbers that represent tokens according to its vocabulary.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* New section that transitions to embeddings */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-green-50 to-purple-50 rounded-lg border-l-4 border-purple-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <h3 className="text-lg font-medium text-purple-700 mb-2">Next Step: From IDs to Embeddings</h3>
        <p className="mb-3">
          While token IDs are a good start, they have a significant limitation: 
          <strong> they don't capture any semantic relationship between tokens</strong>. 
          For example, the IDs for "dog" and "puppy" are just arbitrary numbers with no inherent relationship.
        </p>
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-lg mb-2 border border-green-200">
              <div className="font-medium">Token IDs</div>
              <div className="font-mono text-sm">dog → {vocabulary["dog"] || "3"}</div>
              <div className="font-mono text-sm">cat → {vocabulary["cat"] || "7"}</div>
            </div>
            <div className="text-xs text-gray-500">No relationship between similar words</div>
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
                stroke="#9333ea" 
                strokeWidth="2" 
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: 1.5 }}
              />
              <motion.polygon 
                points="48,20 38,15 38,25" 
                fill="#9333ea"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 2.4 }}
              />
            </svg>
          </motion.div>
          <div className="text-center">
            <div className="bg-purple-100 p-3 rounded-lg mb-2 border border-purple-200">
              <div className="font-medium">Word Embeddings</div>
              <div className="font-mono text-xs">dog → [0.7, 0.3, 0.2, ...]</div>
              <div className="font-mono text-xs">cat → [0.6, 0.3, 0.2, ...]</div>
            </div>
            <div className="text-xs text-gray-500">Similar words have similar vectors</div>
          </div>
        </div>
        <p>
          In the next step, we'll explore how token IDs are converted into <strong>word embeddings</strong> - 
          dense vector representations that capture semantic meaning. This allows the model to understand that 
          words like "dog" and "puppy" are related, while "dog" and "computer" are not.
        </p>
      </motion.div>
    </div>
  )
}

