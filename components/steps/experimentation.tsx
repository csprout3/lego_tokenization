"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Beaker, BookOpen, Brain, ChevronDown, ChevronUp, 
  ArrowRight, ArrowDown, ArrowUpRight, X, Shuffle, 
  Sparkles, Lightbulb, CheckCircle, LineChart
} from "lucide-react"
import { TextInput } from "@/components/ui/text-input"
import { LegoBlock } from "@/components/ui/lego-block"
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import PersistentLegoVisualization from "@/components/shared/persistent-lego-visualization"
import { getStaticWordEmbeddings, findSimilarWords, getWordEmbedding } from "@/lib/embeddings"

// Tokenization methods
const tokenizationMethods = [
  { id: "whitespace", label: "Whitespace" },
  { id: "whitespace-punctuation", label: "Whitespace & Punctuation" },
  { id: "character", label: "Character-level" },
]

// Subword methods
const subwordMethods = [
  { id: "bpe", label: "BPE" },
  { id: "wordpiece", label: "WordPiece" },
  { id: "sentencepiece", label: "SentencePiece" },
]

// Sample texts to experiment with
const sampleTexts = [
  {
    id: "simple",
    label: "Simple English",
    text: "The quick brown fox jumps over the lazy dog."
  },
  {
    id: "long-words",
    label: "Uncommon Words",
    text: "Quixotic zealots juggle with esoteric lexicon while serendipity brings ephemeral joy."
  },
  {
    id: "multilingual",
    label: "Multilingual",
    text: "The runner was running faster than the fastest runners in the race. Sie spricht Deutsch und Français très bien."
  },
  {
    id: "repetition",
    label: "Repetitive Text",
    text: "The cat sat on the mat. The dog sat on the mat too. Both the cat and dog sat on the same mat."
  },
  {
    id: "technical",
    label: "Technical Content",
    text: "GPT-3.5 uses transformer architecture with attention mechanisms to generate text. The model has 175B parameters."
  },
  {
    id: "special-chars",
    label: "Special Characters",
    text: "Email me at user@example.com or call 555-123-4567 about the $99.99 offer."
  }
]

// Basic tokenization methods
const basicTokenize = (input: string, method: string) => {
  switch (method) {
    case "whitespace":
      return input.split(/\s+/).filter(Boolean)
    case "whitespace-punctuation":
      return input
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((word) => {
          const matches = word.match(/([A-Za-z0-9]+)|([^A-Za-z0-9]+)/g)
          return matches || []
        })
    case "character":
      return input.split("")
    default:
      return input.split(/\s+/).filter(Boolean)
  }
}

// Modified subword tokenization that accepts basic tokens
const subwordTokenize = (tokens: string[], method: string, basicMethod: string) => {
  // If basic tokenization is character-level, handle differently
  if (basicMethod === "character") {
    // For character-level tokenization, we'll just pass through the characters
    // and apply minimal subword grouping based on the selected method
    if (method === "bpe" || method === "wordpiece") {
      // Group consecutive letter characters for BPE and WordPiece
      let result: string[] = [];
      let currentGroup = "";
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // If it's a letter, add to current group
        if (token.match(/[A-Za-z]/)) {
          currentGroup += token;
          
          // If next token is not a letter or we're at the end, process the group
          if (i === tokens.length - 1 || !tokens[i+1].match(/[A-Za-z]/)) {
            if (currentGroup.length > 3) {
              // Split the group for subword tokenization
              const splitPoint = Math.ceil(currentGroup.length / 2);
              result.push(currentGroup.slice(0, splitPoint));
              result.push(`##${currentGroup.slice(splitPoint)}`);
            } else {
              result.push(currentGroup);
            }
            currentGroup = "";
          }
        } else {
          // For non-letters (spaces, numbers, punctuation), keep as is
          result.push(token);
        }
      }
      
      return result;
    } else if (method === "sentencepiece") {
      // For SentencePiece, group characters into chunks of 2-3
      let result: string[] = [];
      let i = 0;
      
      while (i < tokens.length) {
        // Check if we can take 3 characters
        if (i + 2 < tokens.length && 
            tokens[i].match(/[A-Za-z]/) && 
            tokens[i+1].match(/[A-Za-z]/) && 
            tokens[i+2].match(/[A-Za-z]/)) {
          result.push(tokens[i] + tokens[i+1] + tokens[i+2]);
          i += 3;
        } 
        // Check if we can take 2 characters
        else if (i + 1 < tokens.length && 
                 tokens[i].match(/[A-Za-z]/) && 
                 tokens[i+1].match(/[A-Za-z]/)) {
          result.push(tokens[i] + tokens[i+1]);
          i += 2;
        } 
        // Otherwise take 1 character
        else {
          result.push(tokens[i]);
          i += 1;
        }
      }
      
      return result;
    }
    
    // Default: just return the character tokens as is
    return tokens;
  }
  
  // Original handling for word-level tokenization
  return tokens.flatMap((token) => {
    if (token.length <= 3) return [token]

    switch (method) {
      case "bpe":
        if (token.endsWith("ing")) {
          return [token.slice(0, -3), "##ing"]
        } else if (token.endsWith("ed")) {
          return [token.slice(0, -2), "##ed"]
        } else if (token.endsWith("s") && token.length > 4) {
          return [token.slice(0, -1), "##s"]
        } else if (token.length > 6) {
          const splitPoint = Math.floor(token.length / 2)
          return [token.slice(0, splitPoint), `##${token.slice(splitPoint)}`]
        }
        return [token]

      case "wordpiece":
        if (token.endsWith("ing")) {
          return [token.slice(0, -3), "##ing"]
        } else if (token.endsWith("ed")) {
          return [token.slice(0, -2), "##ed"]
        } else if (token.endsWith("er")) {
          return [token.slice(0, -2), "##er"]
        } else if (token.endsWith("est")) {
          return [token.slice(0, -3), "##est"]
        } else if (token.length > 5) {
          const splitPoint = Math.ceil(token.length / 2)
          return [token.slice(0, splitPoint), `##${token.slice(splitPoint)}`]
        }
        return [token]

      case "sentencepiece":
        if (token.length > 5) {
          return [token.slice(0, 2), token.slice(2, 4), token.slice(4)]
        } else if (token.length > 3) {
          return [token.slice(0, 2), token.slice(2)]
        }
        return [token]

      default:
        return [token]
    }
  })
}

// Helper to create vocabulary and IDs from tokens
const createVocabularyAndIds = (tokens: string[]) => {
  const uniqueTokens = Array.from(new Set(tokens))
  const vocab = uniqueTokens.reduce(
    (acc, token, index) => {
      acc[token] = index + 1 // Start IDs from 1
      return acc
    },
    {} as Record<string, number>,
  )

  const ids = tokens.map((token) => vocab[token])

  return { vocab, ids }
}

// Function to get token color based on token type
const getTokenColor = (token: string, tokenType: string, isSubword: boolean = false, tokenId?: number) => {
  if (tokenType === "basic") {
    if (token.match(/^[A-Za-z]+$/)) return "bg-blue-200"
    if (token.match(/^[0-9]+$/)) return "bg-green-200"
    if (token.match(/[.!?,;:]/)) return "bg-red-200"
    return "bg-yellow-200"
  }
  
  if (tokenType === "subword") {
    return isSubword ? "bg-blue-300" : "bg-blue-200"
  }
  
  if (tokenType === "token-id") {
    // If we have a token ID, use it to assign a unique color
    if (tokenId) {
      // Use a set of visually distinct colors
      const colors = [
        "bg-red-200", "bg-blue-200", "bg-green-200", "bg-yellow-200", 
        "bg-purple-200", "bg-pink-200", "bg-indigo-200", "bg-gray-200",
        "bg-orange-200", "bg-teal-200", "bg-lime-200", "bg-emerald-200",
        "bg-cyan-200", "bg-sky-200", "bg-violet-200"
      ]
      // Use modulo to cycle through colors if we have more IDs than colors
      return colors[(tokenId - 1) % colors.length]
    }
    return "bg-green-200"
  }
  
  if (tokenType === "embeddings") {
    return "bg-purple-200"
  }
  
  return "bg-gray-200"
}

export default function Experimentation() {
  // Text and tokenization methods state
  const [text, setText] = useState(sampleTexts[0].text)
  const [basicMethod, setBasicMethod] = useState("whitespace-punctuation")
  const [subwordMethod, setSubwordMethod] = useState("bpe")
  
  // UI states
  const [activeStep, setActiveStep] = useState<number>(0) // Track which step of the pipeline is highlighted
  const [showInfo, setShowInfo] = useState(false)
  
  // Pipeline results
  const [basicTokens, setBasicTokens] = useState<string[]>([])
  const [subwordTokens, setSubwordTokens] = useState<string[]>([])
  const [vocabulary, setVocabulary] = useState<Record<string, number>>({})
  const [tokenIds, setTokenIds] = useState<number[]>([])
  const [selectedToken, setSelectedToken] = useState("")
  const [similarTokens, setSimilarTokens] = useState<{word: string, similarity: number}[]>([])
  const [selectedTokenEmbedding, setSelectedTokenEmbedding] = useState<number[]>([])
  
  // Process text through the pipeline whenever text or methods change
  useEffect(() => {
    // Step 1: Basic tokenization
    const newBasicTokens = basicTokenize(text, basicMethod)
    setBasicTokens(newBasicTokens)
    
    // Step 2: Subword tokenization (using the basic tokens as input)
    const newSubwordTokens = subwordTokenize(newBasicTokens, subwordMethod, basicMethod)
    setSubwordTokens(newSubwordTokens)
    
    // Step 3: Token to ID mapping
    const { vocab, ids } = createVocabularyAndIds(newSubwordTokens)
    setVocabulary(vocab)
    setTokenIds(ids)
    
    // Reset selected token
    setSelectedToken("")
    setSimilarTokens([])
    
    // Broadcast method changes to other components via custom events
    if (typeof window !== 'undefined') {
      // Emit basic tokenization method change
      const basicEvent = new CustomEvent('tokenization-method-change', {
        detail: {
          section: 'basic',
          method: basicMethod
        }
      });
      window.dispatchEvent(basicEvent);
      console.log(`%c📣 Emitting basic tokenization method change from Experimentation: ${basicMethod}`, 
                  'background: #f44336; color: white; padding: 3px; border-radius: 3px;');
      
      // Emit subword tokenization method change
      const subwordEvent = new CustomEvent('tokenization-method-change', {
        detail: {
          section: 'subword',
          method: subwordMethod
        }
      });
      window.dispatchEvent(subwordEvent);
      console.log(`%c📣 Emitting subword tokenization method change from Experimentation: ${subwordMethod}`, 
                  'background: #2196f3; color: white; padding: 3px; border-radius: 3px;');
    }
  }, [text, basicMethod, subwordMethod])
  
  // Handle token selection for embeddings visualization
  const handleTokenSelect = useCallback(async (token: string) => {
    if (!token) return
    
    setSelectedToken(token)
    
    try {
      // Get embedding for the token
      const embedding = await getWordEmbedding(token.toLowerCase())
      if (!embedding) {
        console.warn(`No embedding found for token: ${token}`)
        setSelectedTokenEmbedding([])
        setSimilarTokens([])
        return
      }
      
      setSelectedTokenEmbedding(embedding)
      
      // Find similar tokens
      const similarities = await findSimilarWords(token.toLowerCase(), 6, 0.3)
      setSimilarTokens(similarities)
    } catch (error) {
      console.error(`Error getting embeddings for token "${token}":`, error)
    }
  }, [])
  
  // Determine if a token has an embedding
  const hasEmbedding = (token: string) => {
    const embeddings = getStaticWordEmbeddings()
    return !!embeddings[token.toLowerCase()]
  }
  
  // Load sample text
  const loadSampleText = (id: string) => {
    const sample = sampleTexts.find(s => s.id === id)
    if (sample) {
      setText(sample.text)
    }
  }
  
  // Helper to check if a token is a subword token
  const isSubwordToken = (token: string) => token.startsWith && token.startsWith("##")

  return (
    <div className="space-y-6">
      <motion.h2 
        className="text-2xl font-bold text-orange-600"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Step 6: Experimentation - Explore the Full Pipeline
      </motion.h2>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="mb-4">
          Now that we understand the complete tokenization pipeline, let's experiment with different 
          tokenization strategies and see how they affect each step of the process - from raw text to 
          embeddings. This sandbox allows you to see how changes in one part of the pipeline affect the 
          downstream steps.
        </p>
        
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              className="bg-orange-50 border-l-4 border-orange-400 p-4 my-4 rounded-r-md"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start">
                <Lightbulb className="h-5 w-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-800 mb-1">Learning Goals</h3>
                  <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                    <li>Observe how different tokenization methods handle various text types</li>
                    <li>See the relationship between tokenization choices and vocabulary size</li>
                    <li>Understand how token IDs are assigned and reused</li>
                    <li>Explore the semantic relationships between tokens in embedding space</li>
                  </ul>
                </div>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="text-orange-400 hover:text-orange-600 ml-2 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        {/* Input Section */}
        <div className="mb-4 border-b pb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium flex items-center text-gray-800">
              <Beaker className="h-5 w-5 text-orange-500 mr-2" />
              Experiment Setup
            </h3>
            <Button 
              variant="ghost" 
              onClick={() => setShowInfo(prev => !prev)}
              className="text-xs text-orange-600 hover:text-orange-700"
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              {showInfo ? "Hide" : "Show"} Learning Goals
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <TextInput 
              value={text} 
              onChange={setText} 
              label="Text to process:"
            />
            
            <div>
              <label className="block text-sm font-medium mb-1">Sample Texts:</label>
              <Select onValueChange={loadSampleText}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a sample text..." />
                </SelectTrigger>
                <SelectContent>
                  {sampleTexts.map(sample => (
                    <SelectItem key={sample.id} value={sample.id}>
                      {sample.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Unified Pipeline View */}
        <div className="space-y-6">
          {/* Step 1: Basic Tokenization */}
          <div className={`border rounded-md transition-all duration-300 ${activeStep === 0 ? 'ring-2 ring-red-300' : ''}`}>
            <div className="border-b px-4 py-3 bg-gradient-to-r from-red-50 to-red-100 flex justify-between items-center">
              <h3 className="font-medium text-red-700 flex items-center">
                <span className="flex items-center justify-center bg-red-600 text-white rounded-full h-6 w-6 mr-2 text-sm">1</span>
                Basic Tokenization
                <Badge variant="outline" className="ml-2 text-xs">
                  {basicTokens.length} tokens
                </Badge>
              </h3>
              <div className="flex items-center">
                <Select value={basicMethod} onValueChange={setBasicMethod}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokenizationMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {basicTokens.map((token, i) => (
                  <LegoBlock
                    key={`basic-${i}`}
                    text={token}
                    color={getTokenColor(token, "basic")}
                    onClick={() => setActiveStep(0)}
                  />
                ))}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-200 mr-1 rounded"></div>
                  <span>Words</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-200 mr-1 rounded"></div>
                  <span>Numbers</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-200 mr-1 rounded"></div>
                  <span>Punctuation</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-200 mr-1 rounded"></div>
                  <span>Other</span>
                </div>
              </div>
            </div>
            
            {/* Connection arrow to next step */}
            <div className="flex justify-center my-2">
              <ArrowDown className="text-blue-400 h-8 w-8 animate-bounce" />
            </div>
          </div>
          
          {/* Step 2: Subword Tokenization */}
          <div className={`border rounded-md transition-all duration-300 ${activeStep === 1 ? 'ring-2 ring-blue-300' : ''}`}>
            <div className="border-b px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 flex justify-between items-center">
              <h3 className="font-medium text-blue-800 flex items-center">
                <span className="flex items-center justify-center bg-blue-700 text-white rounded-full h-6 w-6 mr-2 text-sm">2</span>
                Subword Tokenization
                <Badge variant="outline" className="ml-2 text-xs">
                  {subwordTokens.length} tokens
                </Badge>
              </h3>
              <div className="flex items-center">
                <Select value={subwordMethod} onValueChange={setSubwordMethod}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {subwordMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {subwordTokens.map((token, i) => (
                  <LegoBlock
                    key={`subword-${i}`}
                    text={token}
                    color={getTokenColor(token, "subword", isSubwordToken(token))}
                    isSubword={isSubwordToken(token)}
                    onClick={() => setActiveStep(1)}
                  />
                ))}
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <div className="font-medium text-blue-700 mb-1">Effect of Basic Tokenization</div>
                <p className="text-blue-800 text-xs">
                  The basic tokenization method ({tokenizationMethods.find(m => m.id === basicMethod)?.label}) 
                  determines how the text is initially split, which directly affects what gets processed by 
                  subword tokenization.
                </p>
              </div>
            </div>
            
            {/* Connection arrow to next step */}
            <div className="flex justify-center my-2">
              <ArrowDown className="text-green-400 h-8 w-8 animate-bounce" />
            </div>
          </div>
          
          {/* Step 3: Token-to-ID Mapping */}
          <div className={`border rounded-md transition-all duration-300 ${activeStep === 2 ? 'ring-2 ring-green-300' : ''}`}>
            <div className="border-b px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 flex justify-between items-center">
              <h3 className="font-medium text-green-700 flex items-center">
                <span className="flex items-center justify-center bg-green-600 text-white rounded-full h-6 w-6 mr-2 text-sm">3</span>
                Token-to-ID Mapping
                <Badge variant="outline" className="ml-2 text-xs">
                  {Object.keys(vocabulary).length} unique tokens
                </Badge>
              </h3>
            </div>
            
            <div className="p-4">
              {/* Token with IDs visualization */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {subwordTokens.map((token, i) => (
                  <LegoBlock
                    key={`id-${i}`}
                    text={token}
                    color={getTokenColor(token, "token-id", isSubwordToken(token), vocabulary[token])}
                    id={vocabulary[token]}
                    isSubword={isSubwordToken(token)}
                    onClick={() => setActiveStep(2)}
                  />
                ))}
              </div>
              
              {/* Color legend for token IDs */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium mb-2">Color Legend: Token IDs</h4>
                <p className="text-xs text-gray-600 mb-2">Each unique token has its own color based on its ID. Same tokens share the same ID and color.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(vocabulary)
                    .slice(0, 8) // Show first 8 token-ID pairs at most
                    .map(([token, id]) => (
                      <div key={token} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${getTokenColor(token, "token-id", false, id)}`}></div>
                        <span className="text-xs">"{token}" = ID {id}</span>
                      </div>
                    ))}
                </div>
                {Object.keys(vocabulary).length > 8 && (
                  <p className="text-xs text-gray-500 mt-2">
                    +{Object.keys(vocabulary).length - 8} more token-ID pairs
                  </p>
                )}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <div className="font-medium text-blue-700 mb-1">Effect of Subword Tokenization</div>
                  <p className="text-blue-800 text-xs">
                    The {subwordMethods.find(m => m.id === subwordMethod)?.label} tokenization affects vocabulary size:
                    <br />
                    • Basic tokens: {basicTokens.length}
                    <br />
                    • After subword: {subwordTokens.length}
                    <br />
                    • Unique tokens: {Object.keys(vocabulary).length}
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg text-sm">
                  <div className="font-medium text-green-700 mb-1">Model Input</div>
                  <div className="text-xs font-mono overflow-x-auto bg-white p-2 rounded border border-green-100">
                    [{tokenIds.join(", ")}]
                  </div>
                </div>
              </div>
            </div>
            
            {/* Connection arrow to next step */}
            <div className="flex justify-center my-2">
              <ArrowDown className="text-purple-400 h-8 w-8 animate-bounce" />
            </div>
          </div>
          
          {/* Step 4: Embeddings */}
          <div className={`border rounded-md transition-all duration-300 ${activeStep === 3 ? 'ring-2 ring-purple-300' : ''}`}>
            <div className="border-b px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 flex justify-between items-center">
              <h3 className="font-medium text-purple-700 flex items-center">
                <span className="flex items-center justify-center bg-purple-600 text-white rounded-full h-6 w-6 mr-2 text-sm">4</span>
                Embeddings Visualization
              </h3>
            </div>
            
            <div className="p-4">
              <PersistentLegoVisualization
                key={`embeddings-${basicMethod}-${subwordMethod}`}
                sampleText={text}
                currentSection="embeddings"
                className="mb-4"
                basicMethod={basicMethod}
                subwordMethod={subwordMethod}
              />
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-purple-50 p-3 rounded-lg text-sm">
                  <div className="font-medium text-purple-700 mb-1">Effect of Token IDs</div>
                  <p className="text-purple-800 text-xs">
                    Each unique token ID gets its own embedding vector. The quality of tokenization 
                    directly impacts how well the model can represent the meaning of words and phrases.
                  </p>
                </div>
                
                <div className="bg-orange-50 p-3 rounded-lg text-sm">
                  <div className="font-medium text-orange-700 mb-1">Full Pipeline Impact</div>
                  <p className="text-orange-800 text-xs">
                    Observe how changing the tokenization methods at the beginning affects 
                    the final embeddings and the model's ability to understand relationships between words.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* What we've learned section */}
      <motion.div 
        className="mt-10 p-6 bg-gradient-to-r from-orange-50 to-indigo-50 rounded-lg border-l-4 border-indigo-400"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
      >
        <h3 className="text-lg font-medium text-indigo-700 mb-2">What We've Learned: The Full Tokenization Pipeline</h3>
        <p className="mb-3">
          We've explored the complete tokenization pipeline from raw text to embeddings, and seen how each step builds on the previous one:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="font-medium text-blue-700 mb-1">1. Basic Tokenization</div>
            <p className="text-sm">Breaking text into words, punctuation, or characters</p>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="font-medium text-blue-700 mb-1">2. Subword Tokenization</div>
            <p className="text-sm">Splitting words into meaningful units to handle unseen words</p>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
            <div className="font-medium text-green-700 mb-1">3. Token IDs</div>
            <p className="text-sm">Converting tokens to numbers the model can process</p>
          </div>
          
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <div className="font-medium text-purple-700 mb-1">4. Embeddings</div>
            <p className="text-sm">Representing tokens as vectors that capture meaning</p>
          </div>
        </div>
        
        <p>
          The choices we make at each step have significant impacts on model performance, vocabulary size, 
          computational efficiency, and the ability to handle diverse languages and domains. Effective tokenization 
          is fundamental to building robust language models.
        </p>
      </motion.div>
    </div>
  )
}

