"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, X, Search } from "lucide-react"
import { LegoBlock } from "@/components/ui/lego-block"
import { 
  getStaticWordEmbeddings,
  initializeEmbeddings,
  findSimilarWords, 
  getWordEmbedding,
  computeSimilarity,
  useSimilarWords 
} from "@/lib/embeddings"
import { 
  initEmbeddingsWorker, 
  findSimilarWordsWithWorker, 
  projectEmbeddingsWithWorker 
} from "@/lib/workerUtils"

interface PersistentLegoVisualizationProps {
  sampleText: string
  currentSection: string
  className?: string
  basicMethod?: string
  subwordMethod?: string
  vocabulary?: Record<string, number>
  processedTokens?: string[]
}

// Function to project high dimensional vectors to 2D using PCA-like approach
const projectTo2D = (vector: number[]): [number, number] => {
  // This is a simple implementation - a real system would use proper dimensionality reduction
  // We'll use the first two dimensions as primary axes and add small contributions from other dimensions
  if (vector.length < 2) return [0, 0];
  
  // For simplicity we'll use a projection that preserves some meaningful structure
  const x = vector[0] * 100 + vector[2] * 30;
  const y = vector[1] * 100 + vector[3] * 30 + (vector[4] || 0) * 20;
  
  return [x, y];
}

export default function PersistentLegoVisualization({
  sampleText,
  currentSection,
  className = "",
  basicMethod: propBasicMethod,
  subwordMethod: propSubwordMethod,
  vocabulary: propVocabulary,
  processedTokens: propProcessedTokens,
  isExperimentPage = false,
}: PersistentLegoVisualizationProps & { isExperimentPage?: boolean }) {
  // Initialize basic state
  const [selectedWord, setSelectedWord] = useState("")
  const [userInputText, setUserInputText] = useState("")
  const [userWords, setUserWords] = useState<string[]>([])
  const [similarWords, setSimilarWords] = useState<{ word: string; similarity: number }[]>([])
  const [embeddingPoints, setEmbeddingPoints] = useState<{[key: string]: {x: number, y: number}}>({})
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    tokens: true,
    visualization: true,
    similar: true,
    input: true
  })
  
  // Add state for tokenization methods - with explicit types and default values
  // Using prop values as initial values if provided
  const [basicMethod, setBasicMethod] = useState<string>(propBasicMethod || "whitespace")
  const [subwordMethod, setSubwordMethod] = useState<string>(propSubwordMethod || "bpe")
  
  // Update state when props change
  useEffect(() => {
    if (propBasicMethod && propBasicMethod !== basicMethod) {
      setBasicMethod(propBasicMethod);
      setForceRender(prev => prev + 1);
    }
    if (propSubwordMethod && propSubwordMethod !== subwordMethod) {
      setSubwordMethod(propSubwordMethod);
      setForceRender(prev => prev + 1);
    }
  }, [propBasicMethod, propSubwordMethod]);
  
  // Viewbox state for auto-focus
  const [viewBox, setViewBox] = useState("-110 -110 220 220")
  // State for the relationship popup
  const [showRelationshipPopup, setShowRelationshipPopup] = useState(false)
  // Loading states
  const [isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(false)
  
  // Define refs
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
  
  // Add a force render counter to trigger re-renders when tokenization methods change
  const [forceRender, setForceRender] = useState(0);
  
  // Add state for token section animation
  const [highlightTokenSection, setHighlightTokenSection] = useState(false);
  
  // Add state for direct token display
  const [tokenDisplay, setTokenDisplay] = useState<string[]>([]);
  
  // Add state for missing embedding message
  const [missingEmbeddingInfo, setMissingEmbeddingInfo] = useState<{
    word: string;
    visible: boolean;
  }>({ word: "", visible: false })
  
  // Helper function to expand the visualization section
  const expandVisualizationSection = () => {
    setExpandedSections(prev => ({...prev, visualization: true}));
  }
  
  // Function to find similar tokens and update visualization
  const findSimilarTokens = async (word: string) => {
    if (!word || currentSection !== "embeddings") return;
    
    try {
      // Get embedding for selected word
      const embedding = await getWordEmbedding(word);
      if (!embedding) {
        console.warn(`No embedding found for word: ${word}`);
        return;
      }
      
      // Find similar words - try with worker first, fall back to main thread
      let similarities: { word: string; similarity: number }[] = [];
      
      try {
        // Get all available embeddings for worker to use
        const allEmbeddings = getStaticWordEmbeddings();
        // Use an even lower threshold (0.05) for "the" and "The" to ensure they have related words
        const threshold = word.toLowerCase() === "the" ? 0.05 : 0.3;
        similarities = await findSimilarWordsWithWorker(allEmbeddings, embedding, word, 6, threshold);
      } catch (error) {
        console.warn("Worker similarity calculation failed, using main thread:", error);
        // Use an even lower threshold (0.05) for "the" and "The" to ensure they have related words
        const threshold = word.toLowerCase() === "the" ? 0.05 : 0.3;
        similarities = await findSimilarWords(word, 6, threshold);
      }
      
      setSimilarWords(similarities);
      
      // Add any new words to the embedding points
      const newPoints = {...embeddingPoints};
      let hasNewPoints = false;
      
      for (const {word: similarWord} of similarities) {
        if (!newPoints[similarWord]) {
          const embedding = await getWordEmbedding(similarWord);
          if (embedding) {
            const [x, y] = projectTo2D(embedding);
            newPoints[similarWord] = { x, y };
            hasNewPoints = true;
          }
        }
      }
      
      if (hasNewPoints) {
        setEmbeddingPoints(newPoints);
      }
      
      // Set focus on the selected word and similar words
      const newViewBox = calculateFocusViewBox(word, similarities);
      setTimeout(() => {
        setViewBox(newViewBox);
      }, 50); // Small delay to ensure the SVG is rendered
      
      // Close relationship popup if open
      setShowRelationshipPopup(false);
    } catch (error) {
      console.error(`Error in findSimilarTokens for word "${word}":`, error);
    }
  }
  
  // Process tokens based on current section and selected methods
  const processTokens = useCallback(() => {
    if (!sampleText) {
      return { 
        baseTokens: [], 
        simpleTokens: [], 
        subwordTokens: [], 
        vocabulary: {} as { [key: string]: number } 
      };
    }
    
    // Basic tokenization based on selected method
    let baseTokens: string[] = [];
    
    if (basicMethod === "whitespace") {
      // Simple whitespace tokenization
      baseTokens = sampleText
        .split(/\s+/)
        .filter(Boolean);
    } else if (basicMethod === "whitespace-punctuation") {
      // Whitespace + punctuation tokenization
      baseTokens = sampleText
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((word) => {
          const matches = word.match(/([A-Za-z0-9]+)|([^A-Za-z0-9]+)/g);
          return matches || [];
        });
    } else if (basicMethod === "character") {
      // Character-level tokenization (include whitespace)
      baseTokens = Array.from(sampleText);
    }
    
    // Simple tokenization (always split punctuation for subsequent steps)
    const simpleTokens = sampleText
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((word) => {
        const matches = word.match(/([A-Za-z0-9]+)|([^A-Za-z0-9]+)/g);
        return matches || [];
      });
    
    // Subword tokenization based on selected method
    let subwordTokens: string[] = [];
    
    if (subwordMethod === "bpe") {
      // Byte-pair encoding simulation
      subwordTokens = simpleTokens.flatMap((word) => {
        if (word.length > 4 && word.endsWith("ing")) {
          return [word.slice(0, -3), "##ing"];
        }
        if (word.length > 3 && word.endsWith("ed")) {
          return [word.slice(0, -2), "##ed"];
        }
        if (word.length > 3 && word.endsWith("s")) {
          return [word.slice(0, -1), "##s"];
        }
        return [word];
      });
    } else if (subwordMethod === "wordpiece") {
      // WordPiece simulation
      subwordTokens = simpleTokens.flatMap((word) => {
        if (word.length > 4 && word.startsWith("un")) {
          return ["un", "##" + word.slice(2)];
        }
        if (word.length > 5) {
          // Split longer words
          return [word.slice(0, Math.ceil(word.length/2)), "##" + word.slice(Math.ceil(word.length/2))];
        }
        return [word];
      });
    } else if (subwordMethod === "sentencepiece" || subwordMethod === "unigram") {
      // SentencePiece simulation - match implementation in subword-tokenization.tsx
      subwordTokens = simpleTokens.flatMap((word) => {
        if (word.length > 5) {
          // Split into chunks of 2 characters as in subword-tokenization.tsx
          return [
            word.slice(0, 2), 
            word.slice(2, 4), 
            word.slice(4)
          ];
        } else if (word.length > 3) {
          // Split into two parts
          return [word.slice(0, 2), word.slice(2)];
        }
        return [word];
      });
    }

    // Create vocabulary mapping (for token IDs)
    // For token-id section, use the simpleTokens to create the vocabulary
    const uniqueTokens = Array.from(new Set(simpleTokens));
    const vocabulary = uniqueTokens.reduce(
      (acc, token, index) => {
        acc[token] = index + 1; // Start IDs from 1
        return acc;
      },
      {} as { [key: string]: number }
    );
    
    console.log(`Processed tokens with basic: ${basicMethod}, subword: ${subwordMethod}`);
    console.log(`Token counts - base: ${baseTokens.length}, simple: ${simpleTokens.length}, subword: ${subwordTokens.length}`);
    console.log('Vocabulary created with', Object.keys(vocabulary).length, 'unique tokens');
    
    return { baseTokens, simpleTokens, subwordTokens, vocabulary };
  }, [sampleText, basicMethod, subwordMethod]);
  
  // Initialize processed tokens state with a safe default value first
  const [processedTokens, setProcessedTokens] = useState<{
    baseTokens: string[];
    simpleTokens: string[];
    subwordTokens: string[];
    vocabulary: { [key: string]: number };
  }>({
    baseTokens: [],
    simpleTokens: [],
    subwordTokens: [],
    vocabulary: {}
  });
  
  // Then update the processed tokens when dependencies change
  useEffect(() => {
    try {
      const newProcessedTokens = processTokens();
      setProcessedTokens(newProcessedTokens);
      
      // Initialize token display
      const tokens = getDisplayTokens();
      setTokenDisplay(tokens);
      console.log("%c🧩 Initial tokens processed and displayed", 'background: #e1f5fe; color: #0277bd; padding: 2px; border-radius: 3px;', tokens);
    } catch (error) {
      console.error("Error processing tokens:", error);
    }
  }, [processTokens, sampleText, basicMethod, subwordMethod]);
  
  // Destructure processed tokens
  const { baseTokens, simpleTokens, subwordTokens, vocabulary } = processedTokens;

  // Initialize embeddings on component mount
  useEffect(() => {
    const setupEmbeddings = async () => {
      setIsLoadingEmbeddings(true);
      try {
        await initializeEmbeddings();
        
        // Try to initialize worker
        try {
          await initEmbeddingsWorker();
        } catch (error) {
          console.warn("Worker initialization failed, falling back to main thread:", error);
        }
        
        // After initialization, set up the embedding points
        const embeddings = getStaticWordEmbeddings();
        let points: {[key: string]: {x: number, y: number}} = {};
        
        try {
          // Try to use worker for projection
          points = await projectEmbeddingsWithWorker(embeddings);
        } catch (error) {
          console.warn("Worker projection failed, using main thread:", error);
          // Fallback to main thread projection
          Object.entries(embeddings).forEach(([word, vector]) => {
            const [x, y] = projectTo2D(vector);
            points[word] = { x, y };
          });
        }
        
        setEmbeddingPoints(points);
      } catch (error) {
        console.error("Failed to initialize embeddings:", error);
      } finally {
        setIsLoadingEmbeddings(false);
      }
    };
    
    setupEmbeddings();
  }, []);

  // Calculate the bounding box for selected word and its similar words
  const calculateFocusViewBox = useCallback((selected: string, similar: { word: string; similarity: number }[]) => {
    const DEFAULT_VIEWBOX = "-110 -110 220 220";
    
    try {
      // Safety checks
      if (!selected || !embeddingPoints || !embeddingPoints[selected]) {
        return DEFAULT_VIEWBOX;
      }
      
      // Get the points to include in the focus
      const pointsToInclude = [selected, ...similar.map(s => s.word)]
        .filter(word => word && embeddingPoints[word])
        .map(word => embeddingPoints[word]);
      
      if (pointsToInclude.length === 0) {
        return DEFAULT_VIEWBOX;
      }
      
      // Find the bounding box
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      
      pointsToInclude.forEach(point => {
        if (!point) return;
        
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
      
      // Invalid bounds check
      if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
        return DEFAULT_VIEWBOX;
      }
      
      // Add padding (20%)
      const width = maxX - minX;
      const height = maxY - minY;
      const padding = Math.max(width, height) * 0.3;
      
      minX -= padding;
      maxX += padding;
      minY -= padding;
      maxY += padding;
      
      // Calculate center and dimensions for viewBox
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const viewBoxWidth = maxX - minX;
      const viewBoxHeight = maxY - minY;
      
      // Ensure minimum size and aspect ratio
      const minSize = 50;
      const finalWidth = Math.max(viewBoxWidth, minSize);
      const finalHeight = Math.max(viewBoxHeight, minSize);
      
      // Adjust for aspect ratio if SVG ref is available
      if (svgRef.current) {
        const svgWidth = svgRef.current.clientWidth;
        const svgHeight = svgRef.current.clientHeight;
        
        // Safety check for valid dimensions
        if (svgWidth > 0 && svgHeight > 0) {
          const svgRatio = svgWidth / svgHeight;
          const contentRatio = finalWidth / finalHeight;
          
          if (contentRatio > svgRatio) {
            // Content is wider than container
            const adjustedHeight = finalWidth / svgRatio;
            return `${centerX - finalWidth / 2} ${centerY - adjustedHeight / 2} ${finalWidth} ${adjustedHeight}`;
          } else {
            // Content is taller than container
            const adjustedWidth = finalHeight * svgRatio;
            return `${centerX - adjustedWidth / 2} ${centerY - finalHeight / 2} ${adjustedWidth} ${finalHeight}`;
          }
        }
      }
      
      // Default fallback if SVG ref isn't valid
      return `${centerX - finalWidth / 2} ${centerY - finalHeight / 2} ${finalWidth} ${finalHeight}`;
    } catch (error) {
      console.error("Error calculating focus viewbox:", error);
      return DEFAULT_VIEWBOX;
    }
  }, [embeddingPoints]);

  // Reset view to show all points
  const resetView = () => {
    setViewBox("-110 -110 220 220");
  };

  // Show relationship popup
  const showRelationships = () => {
    if (selectedWord && similarWords.length > 0) {
      setShowRelationshipPopup(true);
    }
  };

  // Close relationship popup
  const closeRelationships = () => {
    setShowRelationshipPopup(false);
  };

  // Handle word selection for embedding visualization
  const handleWordSelect = (word: string) => {
    // Clear previous selection
    setSelectedWord("")
    setSimilarWords([])
    
    // Check if word has an embedding
    if (!hasEmbedding(word)) {
      // Show missing embedding message
      setMissingEmbeddingInfo({
        word,
        visible: true
      })
      // Expand visualization section to show the message
      setExpandedSections(prev => ({...prev, visualization: true}))
      return
    }
    
    // Reset missing embedding message if it was showing
    setMissingEmbeddingInfo({word: "", visible: false})
    
    // Continue with normal word selection
    setSelectedWord(word)
    expandVisualizationSection()
    
    // Get similar words and update embeddings visualization
    findSimilarTokens(word)
  }

  // Close the missing embedding info message
  const closeMissingEmbeddingInfo = () => {
    setMissingEmbeddingInfo({word: "", visible: false})
  }

  // Handle user text input for real-time embedding visualization
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInputText(e.target.value);
  };

  // Process user text input
  const handleUserInputSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!userInputText.trim()) return;
    
    // Very simple tokenization for demo purposes
    const words = userInputText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    if (words.length === 0) return;
    
    setUserWords(words);
    
    // Process each word to ensure we have its embedding
    const newPoints = {...embeddingPoints};
    let hasNewPoints = false;
    
    for (const word of words) {
      if (!newPoints[word]) {
        const embedding = await getWordEmbedding(word);
        if (embedding) {
          const [x, y] = projectTo2D(embedding);
          newPoints[word] = { x, y };
          hasNewPoints = true;
        }
      }
    }
    
    if (hasNewPoints) {
      setEmbeddingPoints(newPoints);
    }
    
    // If we have at least one valid word, select the first one
    for (const word of words) {
      if (newPoints[word]) {
        handleWordSelect(word);
        break;
      }
    }
    
    // Clear the input field
    setUserInputText("");
  }, [userInputText, embeddingPoints, handleWordSelect]);

  // Allow pressing enter in the input field
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        handleUserInputSubmit();
      }
    };
    
    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [handleUserInputSubmit]);

  // Reset sections when section changes
  useEffect(() => {
    setExpandedSections({
      tokens: true,
      visualization: true,
      similar: true,
      input: true
    });
    setSelectedWord("");
    resetView(); // Reset view
    setShowRelationshipPopup(false); // Close popup
  }, [currentSection]);

  // Check if a word has an embedding
  const hasEmbedding = (word: string) => {
    const embeddings = getStaticWordEmbeddings()
    return !!embeddings[word]
  }
  
  // Get token color based on type and section
  const getTokenColor = (token: string, section: string) => {
    let color = "bg-gray-200"; // Default color
    
    // Section-specific colors
    if (section === "introduction") color = "bg-yellow-200";
    else if (section === "basic") {
      if (token.match(/^[A-Za-z]+$/)) color = "bg-blue-200";
      else if (token.match(/^[0-9]+$/)) color = "bg-green-200";
      else if (token.match(/[.!?,;:]/)) color = "bg-red-200";
      else color = "bg-yellow-200";
    }
    else if (section === "subword") {
      // For SentencePiece, we don't add the ## prefix but still want to differentiate parts
      if (subwordMethod === "sentencepiece") {
        // Each part of a word gets a slightly different shade
        if (token.length <= 2) color = "bg-blue-300"; // Likely a subword part
        else color = "bg-blue-200"; // Likely a full word or first part
      }
      // For other methods (BPE, WordPiece)
      else color = token.startsWith("##") ? "bg-blue-300" : "bg-blue-200";
    }
    else if (section === "token-id" || section === "embeddings") {
      // Use provided vocabulary if available for consistent coloring
      if (propVocabulary && token in propVocabulary) {
        const tokenId = propVocabulary[token] || 0;
        
        // Array of visually distinct colors
        const idColors = [
          "bg-green-200",     // Default for token-id section
          "bg-blue-200",      // ID: 1
          "bg-red-200",       // ID: 2
          "bg-yellow-200",    // ID: 3
          "bg-purple-200",    // ID: 4
          "bg-pink-200",      // ID: 5
          "bg-indigo-200",    // ID: 6
          "bg-emerald-200",   // ID: 7
          "bg-orange-200",    // ID: 8
          "bg-cyan-200",      // ID: 9
          "bg-amber-200",     // ID: 10
          "bg-rose-200",      // ID: 11
          "bg-teal-200",      // ID: 12
          "bg-lime-200",      // ID: 13
          "bg-fuchsia-200",   // ID: 14
          "bg-sky-200",       // ID: 15
        ];
        
        // If id is larger than our color array, cycle through colors
        color = tokenId === 0 ? "bg-gray-200" : idColors[tokenId % idColors.length];
      }
      else {
        // Fall back to vocabulary from internal state if props not available
        const tokenId = vocabulary[token] || 0;
        
        // Array of visually distinct colors
        const idColors = [
          "bg-green-200",     // Default for token-id section
          "bg-blue-200",      // ID: 1
          "bg-red-200",       // ID: 2
          "bg-yellow-200",    // ID: 3
          "bg-purple-200",    // ID: 4
          "bg-pink-200",      // ID: 5
          "bg-indigo-200",    // ID: 6
          "bg-emerald-200",   // ID: 7
          "bg-orange-200",    // ID: 8
          "bg-cyan-200",      // ID: 9
          "bg-amber-200",     // ID: 10
          "bg-rose-200",      // ID: 11
          "bg-teal-200",      // ID: 12
          "bg-lime-200",      // ID: 13
          "bg-fuchsia-200",   // ID: 14
          "bg-sky-200",       // ID: 15
        ];
        
        // If id is larger than our color array, cycle through colors
        color = tokenId === 0 ? "bg-gray-200" : idColors[tokenId % idColors.length];
      }
    }
    
    console.log(`Token: "${token}" → Color: "${color}"`);
    return color;
  }
  
  // Get a darker version of the background color for selected items
  const getDarkerColor = (bgColor: string) => {
    // Debug the input value
    console.log('getDarkerColor input:', bgColor);
    
    // Map background colors directly to their darker versions
    const colorMap: Record<string, string> = {
      'bg-yellow-200': 'bg-yellow-400',
      'bg-blue-200': 'bg-blue-400',
      'bg-green-200': 'bg-green-400',
      'bg-red-200': 'bg-red-400',
      'bg-purple-200': 'bg-purple-400',
      'bg-pink-200': 'bg-pink-400',
      'bg-indigo-200': 'bg-indigo-400',
      'bg-gray-200': 'bg-gray-400',
      'bg-orange-200': 'bg-orange-400',
      'bg-cyan-200': 'bg-cyan-400',
      'bg-amber-200': 'bg-amber-400',
      'bg-rose-200': 'bg-rose-400',
      'bg-teal-200': 'bg-teal-400',
      'bg-lime-200': 'bg-lime-400',
      'bg-emerald-200': 'bg-emerald-400',
      'bg-fuchsia-200': 'bg-fuchsia-400',
      'bg-sky-200': 'bg-sky-400',
      'bg-blue-300': 'bg-blue-500',
      'bg-white': 'bg-gray-300',
      'bg-black': 'bg-black',
    };
    
    // Check if we have a direct mapping
    if (colorMap[bgColor]) {
      console.log(`Found direct mapping for ${bgColor}: ${colorMap[bgColor]}`);
      return colorMap[bgColor];
    }
    
    // Handle colors with shades (bg-{color}-{shade})
    const colorMatch = bgColor.match(/bg-([a-z]+)-(\d+)/);
    if (colorMatch && colorMatch[1] && colorMatch[2]) {
      const colorName = colorMatch[1];
      const currentShade = parseInt(colorMatch[2]);
      
      // Make the shade darker by adding 200 (e.g., 200 -> 400)
      const darkerShade = Math.min(currentShade + 200, 900);
      const result = `bg-${colorName}-${darkerShade}`;
      console.log('Returning darker shade:', result);
      return result;
    }
    
    // Handle basic colors without shades (bg-{color})
    const basicColorMatch = bgColor.match(/bg-([a-z]+)$/);
    if (basicColorMatch && basicColorMatch[1]) {
      const colorName = basicColorMatch[1];
      
      // Special cases for basic colors
      if (colorName === 'white') return 'bg-gray-300';
      if (colorName === 'gray') return 'bg-gray-700';
      if (colorName === 'black') return 'bg-black';
      
      // Default for other basic colors
      const result = `bg-${colorName}-700`;
      console.log('Returning base color with shade:', result);
      return result;
    }
    
    // For any other format or empty values, provide a visible fallback
    console.warn('Could not parse color:', bgColor);
    if (!bgColor || bgColor.trim() === '') {
      return 'bg-purple-500'; // Clearly visible fallback for empty values
    }
    
    // If we've reached here, there's something wrong with the color pattern
    // Return the original color to maintain some formatting, but log the issue
    return bgColor;
  }
  
  // Convert background color class to actual color value for SVG
  const getBgToFillColor = (bgColor: string) => {
    // Map of tailwind color names to their hex values for the 500 shade
    const colorMap: { [key: string]: string } = {
      'red': '#ef4444',
      'blue': '#3b82f6',
      'green': '#22c55e',
      'yellow': '#eab308',
      'purple': '#8b5cf6',
      'pink': '#ec4899',
      'indigo': '#6366f1',
      'gray': '#6b7280',
      'orange': '#f97316',
      'teal': '#14b8a6',
      'cyan': '#06b6d4',
      'lime': '#84cc16',
      'emerald': '#10b981',
      'sky': '#0ea5e9',
      'amber': '#f59e0b',
      'rose': '#f43f5e',
      'fuchsia': '#d946ef',
    };
    
    // Extract the color name from bg class
    const colorMatch = bgColor.match(/bg-([a-z]+)-\d+/);
    if (colorMatch && colorMatch[1] && colorMap[colorMatch[1]]) {
      return colorMap[colorMatch[1]];
    }
    
    // Handle case where there's no shade
    const basicColorMatch = bgColor.match(/bg-([a-z]+)$/);
    if (basicColorMatch && basicColorMatch[1] && colorMap[basicColorMatch[1]]) {
      return colorMap[basicColorMatch[1]];
    }
    
    return '#3b82f6'; // Default blue
  }
  
  // Get section-specific title
  const getSectionTitle = () => {
    try {
      switch (currentSection) {
        case "introduction": return "Your sentence as LEGO bricks";
        case "basic": {
          const methodName = formatMethodName(basicMethod);
          console.log(`Displaying basic section with method: ${methodName}`);
          return `Basic Tokenization (${methodName})`;
        }
        case "subword": {
          const methodName = formatMethodName(subwordMethod);
          console.log(`Displaying subword section with method: ${methodName}`);
          return `Subword Tokenization (${methodName})`;
        }
        case "token-id": return "LEGO Blocks with IDs";
        case "embeddings": return "Word Embedding Visualization";
        default: return "LEGO Visualization";
      }
    } catch (error) {
      console.error("Error in getSectionTitle:", error);
      return "LEGO Visualization";
    }
  }
  
  // Format method name for display
  const formatMethodName = (method: string): string => {
    switch (method) {
      case "whitespace": return "Whitespace";
      case "whitespace-punctuation": return "Whitespace & Punctuation";
      case "character": return "Characters";
      case "bpe": return "BPE";
      case "wordpiece": return "WordPiece";
      case "sentencepiece": return "SentencePiece";
      case "unigram": return "Unigram";
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  }
  
  // Get the tokens to display based on current section
  const getDisplayTokens = () => {
    try {
      // Always use the latest processed tokens based on the current tokenization methods
      if (currentSection === "embeddings" && userWords.length > 0) {
        // If we have user input in the embeddings section, use that
        return userWords;
      }
      
      // If we have processed tokens provided as props, use those for the embeddings section
      if (currentSection === "embeddings" && propProcessedTokens && propProcessedTokens.length > 0) {
        console.log(`%c🔍 Using provided processedTokens for embeddings display: ${propProcessedTokens.length} tokens`, 'color: #9c27b0; font-weight: bold;');
        return propProcessedTokens;
      }
      
      // For basic and subword sections, log what method is being used
      if (currentSection === "basic") {
        console.log(`%c🔍 Using basic method: ${basicMethod} for display tokens`, 'color: #1976d2; font-weight: bold;');
        
        // For basic section, use baseTokens which are generated specifically based on the current basicMethod
        return baseTokens;
      } else if (currentSection === "subword") {
        console.log(`%c🔍 Using subword method: ${subwordMethod} for display tokens`, 'color: #1976d2; font-weight: bold;');
        return subwordTokens; // These are generated based on subwordMethod
      }
      
      // Use the already processed tokens that were calculated based on current tokenization methods
      switch (currentSection) {
        case "introduction": return baseTokens;
        case "token-id": return simpleTokens;
        case "embeddings": return simpleTokens;
        default: return baseTokens;
      }
    } catch (error) {
      console.error("Error in getDisplayTokens:", error);
      return [];
    }
  }
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Determine if we should show IDs
  const showIds = currentSection === "token-id"
  
  // Determine if we should handle subwords
  const isSubwordSection = currentSection === "subword"
  
  // Determine if we should show token-to-embeddings transition
  const showTokenIdToEmbedding = currentSection === "embeddings"
  
  // Get displays tokens safely
  const getDisplayTokensSafe = () => {
    try {
      return getDisplayTokens();
    } catch (error) {
      console.error("Error getting display tokens:", error);
      return [];
    }
  };
  
  // Get tokens safely and store them for display
  const displayTokens = getDisplayTokensSafe();
  
  // Create a type for our custom event
  type TokenizationMethodChangeEvent = CustomEvent<{
    section: string;
    method: string;
  }>;

  // Listen for tokenization method changes with improved debugging and re-rendering
  useEffect(() => {
    // Define the event listener with proper TypeScript typing
    function handleTokenizationMethodChange(event: Event) {
      try {
        // Make sure the event exists and has the right structure
        if (!event) return;
        
        // Type guard to verify this is our custom event
        const customEvent = event as TokenizationMethodChangeEvent;
        if (!customEvent.detail) return;
        
        const { section, method } = customEvent.detail;
        if (!section || !method) return;
        
        console.log(`%c📣 PersistentLegoVisualization received tokenization method change: ${section} -> ${method}`, 'background: #ffd700; color: #000; padding: 3px; border-radius: 3px;');
        
        // Update state based on section - only if props aren't provided
        if (section === 'basic' && !propBasicMethod) {
          console.log(`Updating basic method from ${basicMethod} to ${method}`);
          setBasicMethod(method);
        } else if (section === 'subword' && !propSubwordMethod) {
          console.log(`Updating subword method from ${subwordMethod} to ${method}`);
          setSubwordMethod(method);
        }
        
        // Force an immediate re-render by incrementing counter
        setForceRender(prev => prev + 1);
        
        // Highlight the token section to draw attention to changes
        setHighlightTokenSection(true);
        setTimeout(() => setHighlightTokenSection(false), 1500);
        
        // Force recalculation of tokens
        try {
          const newProcessedTokens = processTokens();
          setProcessedTokens(newProcessedTokens);
          
          // Always expand the tokens section when tokenization method changes
          setExpandedSections(prev => ({...prev, tokens: true}));
        } catch (error) {
          console.error("Error recalculating tokens after method change:", error);
        }
      } catch (error) {
        console.error("Error handling tokenization method change:", error);
      }
    }
    
    // Add the event listener
    window.addEventListener('tokenization-method-change', handleTokenizationMethodChange);
    console.log("%c🔄 Added tokenization-method-change event listener", 'background: #e6f7ff; color: #0066cc; padding: 2px; border-radius: 3px;');
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('tokenization-method-change', handleTokenizationMethodChange);
      console.log("%c🔄 Removed tokenization-method-change event listener", 'background: #e6f7ff; color: #0066cc; padding: 2px; border-radius: 3px;');
    };
  }, [basicMethod, subwordMethod, currentSection, processTokens]);

  // Force re-render when tokenization methods change
  useEffect(() => {
    // This ensures the component re-renders when tokenization methods change
    console.log(`%c🔄 Tokenization methods updated - basic: ${basicMethod}, subword: ${subwordMethod}, forceRender: ${forceRender}, section: ${currentSection}`, 'background: #e8f5e9; color: #2e7d32; padding: 3px; border-radius: 3px;');
    
    // For embeddings section, log what methods are used
    if (currentSection === "embeddings") {
      console.log(`%c📍 Embeddings section using methods - basic: ${basicMethod}, subword: ${subwordMethod}`, 'background: #ede7f6; color: #7b1fa2; padding: 3px; border-radius: 3px;');
    }

    // Recalculate tokens based on current methods
    try {
      const newProcessedTokens = processTokens();
      console.log("%c🧩 Re-processed tokens after method change", 'background: #fff8e1; color: #ff6f00; padding: 2px; border-radius: 3px;', newProcessedTokens);
      setProcessedTokens(newProcessedTokens);
      
      // Immediately update token display
      const newTokenDisplay = getDisplayTokens();
      console.log("%c🧩 Updated token display:", 'background: #fff8e1; color: #ff6f00; padding: 2px; border-radius: 3px;', newTokenDisplay);
      setTokenDisplay(newTokenDisplay);
      
      // If we're on the relevant section, make sure tokens are visible
      if (currentSection === "basic" || currentSection === "subword") {
        setExpandedSections(prev => ({...prev, tokens: true}));
      }
    } catch (error) {
      console.error("Error processing tokens after method change:", error);
    }
  }, [basicMethod, subwordMethod, forceRender, processTokens, currentSection]);

  // Update token display whenever processed tokens change
  useEffect(() => {
    setTokenDisplay(getDisplayTokens());
  }, [processedTokens, currentSection, userWords]);

  // Listen for force refresh events
  useEffect(() => {
    function handleForceRefresh(event: Event) {
      try {
        console.log("%c🔄 Received force-lego-refresh event", 'background: #e8eaf6; color: #3949ab; padding: 2px; border-radius: 3px;');
        
        // Force recalculation of tokens
        const newProcessedTokens = processTokens();
        setProcessedTokens(newProcessedTokens);
        
        // Update token display directly
        const newTokens = getDisplayTokens();
        setTokenDisplay(newTokens);
        
        // Trigger re-render
        setForceRender(prev => prev + 1);
      } catch (error) {
        console.error("Error handling force refresh:", error);
      }
    }
    
    window.addEventListener('force-lego-refresh', handleForceRefresh);
    
    return () => {
      window.removeEventListener('force-lego-refresh', handleForceRefresh);
    };
  }, [processTokens]);

  // Custom token ID display that positions above the block instead of below
  const renderCustomTokenId = (id: number) => (
    <div 
      className="absolute z-50 bg-white border border-gray-300 shadow-md rounded px-2 py-1 text-xs" 
      style={{ 
        top: '-20px',  // Position above the token instead of directly on it
        left: '50%', 
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap'
      }}
    >
      Token ID: {id}
    </div>
  );

  return (
    <div 
      className={`border border-gray-300 rounded-lg bg-white shadow-md ${className}`}
    >
      <div className="p-4">
        <h3 
          className={`text-center mb-2 font-medium text-lg transition-all duration-300 ${
            highlightTokenSection ? 'bg-yellow-100 text-yellow-700 rounded-md p-1 shadow-sm' : ''
          }`}
        >
          {getSectionTitle()}
          {highlightTokenSection && (
            <div className="text-xs font-normal text-yellow-600 mt-1 animate-pulse">
              Tokenization method updated!
            </div>
          )}
        </h3>

        {/* Token-to-embedding transition section */}
        {/* {currentSection === "token-id" && (
          <motion.div 
            className="mb-4 text-center text-sm text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p>IDs are converted to vectors in the next step</p>
            <div className="flex justify-center mt-2">
              <svg width="100" height="30" viewBox="0 0 100 30">
                <motion.path 
                  d="M10,15 L90,15" 
                  stroke="#6b46c1" 
                  strokeWidth="2" 
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                <motion.polygon 
                  points="90,15 80,10 80,20" 
                  fill="#6b46c1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 1.3 }}
                />
              </svg>
            </div>
          </motion.div>
        )} */}

        {/* User Input Section for Embeddings - Collapsible */}
        {currentSection === "embeddings" && (
          <>
            <div className="mb-3 border-b border-gray-100 pb-1">
              <button 
                className="w-full flex justify-between items-center py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                onClick={() => toggleSection('input')}
              >
                <span>Try Your Own Words</span>
                {expandedSections.input ? 
                  <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                }
              </button>
            </div>
            
            <AnimatePresence>
              {expandedSections.input && (
                <motion.div
                  key="user-input"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <form onSubmit={handleUserInputSubmit} className="flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={userInputText}
                      onChange={handleUserInputChange}
                      placeholder="Type words to see embeddings..."
                      className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={isLoadingEmbeddings}
                    />
                    <button
                      type="submit"
                      className="p-2 bg-purple-500 text-white rounded-r-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-700"
                      disabled={isLoadingEmbeddings || !userInputText.trim()}
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </form>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter any words to explore their embedding relationships. 
                    Try different categories like animals, colors, or actions.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Tokens Section - Collapsible */}
        <div 
          className={`mb-3 border-b pb-1 transition-all duration-300 ${
            highlightTokenSection 
              ? 'bg-yellow-100 border-yellow-300 rounded-md p-1' 
              : 'border-gray-100'
          }`}
        >
          <button 
            className="w-full flex justify-between items-center py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            onClick={() => toggleSection('tokens')}
          >
            <span className={highlightTokenSection ? 'text-yellow-700 font-bold animate-pulse' : ''}>
              {highlightTokenSection ? '✨ Updated Tokens' : 'Tokens'}
            </span>
            {expandedSections.tokens ? 
              <ChevronUp className="h-4 w-4 text-gray-500" /> : 
              <ChevronDown className="h-4 w-4 text-gray-500" />
            }
          </button>
        </div>

        <AnimatePresence>
          {expandedSections.tokens && (
            <motion.div
              key={`tokens-${currentSection}-${basicMethod}-${subwordMethod}-${forceRender}`}
              className="flex flex-wrap justify-center gap-1.5 mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ 
                duration: 0.3,
                when: "beforeChildren",
                staggerChildren: 0.05
              }}
            >
              {tokenDisplay.map((token, i) => {
                // Check if this token has an embedding
                const hasEmbedding = currentSection !== "embeddings" || embeddingPoints[token.toLowerCase()];
                
                return (
                  <motion.div
                    key={`token-${i}-${forceRender}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      duration: 0.2,
                      delay: i * 0.02
                    }}
                    whileHover={{
                      scale: 1.05,
                      transition: { duration: 0.2 },
                    }}
                  >
                    <LegoBlock
                      text={token}
                      color={token === selectedWord && !isExperimentPage
                        ? getTokenColor(token, currentSection).replace("-200", "-400").replace("-300", "-500")
                        : getTokenColor(token, currentSection)}
                      id={currentSection === "token-id" ? vocabulary[token] : undefined}
                      className={`m-1 ${
                        !hasEmbedding && currentSection === "embeddings"
                          ? "opacity-60 cursor-help border-dotted border-gray-400"
                          : ""
                      }`}
                      isHighlighted={token === selectedWord && !isExperimentPage}
                      onClick={() => {
                        if (!hasEmbedding && currentSection === "embeddings") {
                          // Show information about missing embedding
                          setMissingEmbeddingInfo({
                            word: token,
                            visible: true
                          });
                        } else {
                          // Handle token selection
                          handleWordSelect(token);
                        }
                      }}
                      // Use custom hover component for token IDs to prevent overlap issues
                      customIdDisplay={currentSection === "token-id" ? renderCustomTokenId : undefined}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color legend for basic tokenization */}
        <AnimatePresence>
          {currentSection === "basic" && expandedSections.tokens && (
            <motion.div
              className="mt-2 grid grid-cols-2 gap-2 text-xs"
              key="basic-legend"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Color legend for token-id section */}
        <AnimatePresence>
          {currentSection === "token-id" && expandedSections.tokens && (
            <motion.div
              className="mt-2 text-xs"
              key="token-id-legend"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-center mb-2 text-sm font-medium">Color Legend: Same colors = Same Token IDs</p>
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(vocabulary)
                  .slice(0, 8) // Show only first 8 entries to avoid overcrowding
                  .map(([token, id]) => (
                    <div key={token} className="flex items-center bg-white px-2 py-1 rounded-md shadow-sm">
                      <div className={`w-3 h-3 mr-1 rounded ${getTokenColor(token, "token-id")}`}></div>
                      <span>"{token}": {id}</span>
                    </div>
                  ))}
                {Object.keys(vocabulary).length > 8 && (
                  <div className="flex items-center bg-white px-2 py-1 rounded-md shadow-sm text-gray-500">
                    <span>+ {Object.keys(vocabulary).length - 8} more</span>
                  </div>
                )}
              </div>
              <p className="text-center mt-2 text-gray-600 text-xs">
                Hover over blocks to see token IDs • Same colors indicate same token IDs
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visualization Section - Collapsible */}
        {currentSection === "embeddings" && (
          <>
            <div className="my-3 border-b border-gray-100 pb-1">
              <button 
                className="w-full flex justify-between items-center py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                onClick={() => toggleSection('visualization')}
              >
                <span>{selectedWord ? `"${selectedWord}" in embedding space` : "Embedding Space"}</span>
                {expandedSections.visualization ? 
                  <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                }
              </button>
            </div>

            <AnimatePresence>
              {expandedSections.visualization && (
                <motion.div
                  className="mb-4"
                  key="embeddings-space"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    {/* Missing Embedding Info Alert */}
                    <AnimatePresence>
                      {missingEmbeddingInfo.visible && (
                        <motion.div 
                          className="m-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <div className="flex justify-between">
                            <div className="flex-grow">
                              <h4 className="font-medium text-amber-800 mb-2">No embedding found for "{missingEmbeddingInfo.word}"</h4>
                              <p className="text-sm text-amber-700 mb-2">
                                This token doesn't exist in our embedding space, which means it's not in the model's vocabulary.
                              </p>
                              <div className="text-sm text-amber-800 bg-amber-100 p-3 rounded-md">
                                <p className="font-medium mb-1">Tokenization Tips:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Try a different tokenization method that might break this into known subwords</li>
                                  <li>For uncommon words, subword tokenization methods like BPE or WordPiece often work better</li>
                                  <li>Character-level tokenization ensures every character has a representation but loses semantic meaning</li>
                                  <li>Common words and subwords are more likely to have embeddings</li>
                                </ul>
                              </div>
                            </div>
                            <button 
                              className="text-amber-500 hover:text-amber-700 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeMissingEmbeddingInfo();
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* View focus notification */}
                    {selectedWord && !missingEmbeddingInfo.visible && (
                      <div className="p-1 bg-purple-50 text-center border-b border-gray-200">
                        <span className="text-xs text-purple-700">
                          Viewing <strong>{selectedWord}</strong> and related words
                        </span>
                        <button 
                          onClick={showRelationships}
                          className="text-xs text-purple-600 hover:text-purple-800 ml-2 underline"
                        >
                          View all relationships
                        </button>
                      </div>
                    )}
                    
                    {/* SVG Visualization with auto-focus */}
                    <div 
                      ref={containerRef}
                      className="relative" 
                    >
                      <svg 
                        ref={svgRef}
                        width="100%" 
                        height="180" 
                        viewBox={viewBox}
                        className="mx-auto"
                        style={{ display: 'block' }}
                      >
                        {/* Grid background */}
                        <defs>
                          <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="0.5"/>
                          </pattern>
                          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                            <rect width="50" height="50" fill="url(#smallGrid)"/>
                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
                          </pattern>
                        </defs>
                        <rect width="200" height="200" fill="url(#grid)" x="-100" y="-100" />
                        
                        {/* Coordinate system */}
                        <line x1="-100" y1="0" x2="100" y2="0" stroke="#aaa" strokeWidth="1" />
                        <line x1="0" y1="-100" x2="0" y2="100" stroke="#aaa" strokeWidth="1" />
                        
                        {/* Points for all available embeddings */}
                        {Object.entries(embeddingPoints).map(([word, point]) => {
                          const displayInViz = simpleTokens.includes(word.toLowerCase());
                          const isSelected = word === selectedWord;
                          const isSimilar = selectedWord && similarWords.some(w => w.word === word);
                          
                          return (
                            <g key={word} opacity={displayInViz ? 1 : 0.3}>
                              {/* Draw connection lines from selected word to similar words */}
                              {selectedWord && isSimilar && (
                                <motion.line 
                                  x1={embeddingPoints[selectedWord]?.x || 0} 
                                  y1={embeddingPoints[selectedWord]?.y || 0}
                                  x2={point.x} 
                                  y2={point.y} 
                                  stroke="#a855f7" 
                                  strokeWidth="1.5"
                                  strokeDasharray="2,2"
                                  initial={{ pathLength: 0, opacity: 0 }}
                                  animate={{ pathLength: 1, opacity: 0.6 }}
                                  transition={{ duration: 0.6 }}
                                />
                              )}
                              
                              {/* Draw the point */}
                              <motion.circle 
                                cx={point.x} 
                                cy={point.y} 
                                r={
                                  // Check if we're zoomed in (viewBox is not the default)
                                  viewBox !== "-110 -110 220 220" 
                                    ? (isSelected ? 4 : isSimilar ? 3 : 2) // Smaller points when zoomed in
                                    : (isSelected ? 6 : isSimilar ? 4 : 3)  // Original sizes when zoomed out
                                }
                                fill={isSelected 
                                  ? (getTokenColor(word, currentSection).includes("purple") 
                                    ? "#9333ea" // Keep purple if the token is already purple
                                    : getBgToFillColor(getTokenColor(word, currentSection))) // Use our new conversion function
                                  : isSimilar 
                                    ? "#c084fc" 
                                    : "#ddd"}
                                stroke={displayInViz 
                                  ? (getTokenColor(word, currentSection).includes("purple")
                                    ? "#6b46c1" // Keep purple if the token is already purple
                                    : getBgToFillColor(getTokenColor(word, currentSection)).replace("#", "#")) // Use same color for stroke
                                  : "transparent"}
                                strokeWidth={viewBox !== "-110 -110 220 220" ? "1" : "1.5"} // Thinner stroke when zoomed in
                                whileHover={{ r: viewBox !== "-110 -110 220 220" ? 5 : 7, fill: "#6b46c1" }}
                                animate={{ 
                                  r: viewBox !== "-110 -110 220 220"
                                    ? (isSelected ? 4 : isSimilar ? 3 : 2) // Smaller when zoomed in
                                    : (isSelected ? 6 : isSimilar ? 4 : 3), // Original size when zoomed out
                                  fill: isSelected 
                                    ? (getTokenColor(word, currentSection).includes("purple") 
                                      ? "#9333ea" // Keep purple if the token is already purple
                                      : getBgToFillColor(getTokenColor(word, currentSection))) // Use our new conversion function
                                    : isSimilar 
                                      ? "#c084fc" 
                                      : displayInViz ? "#ddd" : "#eee"
                                }}
                                transition={{ duration: 0.3 }}
                                onClick={() => {
                                  if (displayInViz || isSimilar) {
                                    handleWordSelect(word);
                                  }
                                }}
                                style={{ cursor: (displayInViz || isSimilar) ? "pointer" : "default" }}
                              />
                              
                              {/* Labels with improved positioning */}
                              {(isSelected || isSimilar || (displayInViz && !selectedWord)) && (
                                <g>
                                  {/* Label positioning logic */}
                                  {(() => {
                                    // Calculate position to avoid overlaps
                                    const positionLabels = () => {
                                      // Default position is above the point
                                      let xOffset = 0;
                                      let yOffset = viewBox !== "-110 -110 220 220" ? -6 : -8;
                                      
                                      // For selected word, always place it on top
                                      if (isSelected) {
                                        return { 
                                          x: point.x, 
                                          y: point.y + yOffset, 
                                          textAnchor: "middle",
                                          opacity: 1.0 
                                        };
                                      }
                                      
                                      // For similar words, try to avoid overlap with selected word
                                      if (isSimilar && selectedWord && embeddingPoints[selectedWord]) {
                                        const selectedPoint = embeddingPoints[selectedWord];
                                        const dx = point.x - selectedPoint.x;
                                        const dy = point.y - selectedPoint.y;
                                        
                                        // Position label away from selected word
                                        if (Math.abs(dx) > Math.abs(dy)) {
                                          // Horizontal positioning
                                          xOffset = dx > 0 ? 10 : -10;
                                          const textAnchor = dx > 0 ? "start" : "end";
                                          return { 
                                            x: point.x + xOffset, 
                                            y: point.y, 
                                            textAnchor,
                                            opacity: 0.9 
                                          };
                                        } else {
                                          // Vertical positioning
                                          yOffset = dy > 0 ? 12 : -12;
                                          return { 
                                            x: point.x, 
                                            y: point.y + yOffset, 
                                            textAnchor: "middle",
                                            opacity: 0.9 
                                          };
                                        }
                                      }
                                      
                                      // For regular words, add some randomness to spread labels
                                      if (!selectedWord) {
                                        // Random offset to spread labels in all directions
                                        const directions = ['top', 'right', 'bottom', 'left'];
                                        const direction = directions[Math.floor(Math.random() * directions.length)];
                                        
                                        switch (direction) {
                                          case 'top':
                                            return { 
                                              x: point.x, 
                                              y: point.y - 8, 
                                              textAnchor: "middle",
                                              opacity: 0.8 
                                            };
                                          case 'right':
                                            return { 
                                              x: point.x + 10, 
                                              y: point.y, 
                                              textAnchor: "start",
                                              opacity: 0.8 
                                            };
                                          case 'bottom':
                                            return { 
                                              x: point.x, 
                                              y: point.y + 12, 
                                              textAnchor: "middle",
                                              opacity: 0.8 
                                            };
                                          case 'left':
                                            return { 
                                              x: point.x - 10, 
                                              y: point.y, 
                                              textAnchor: "end",
                                              opacity: 0.8 
                                            };
                                          default:
                                            return { 
                                              x: point.x, 
                                              y: point.y - 8, 
                                              textAnchor: "middle",
                                              opacity: 0.8 
                                            };
                                        }
                                      }
                                      
                                      // Default positioning
                                      return { 
                                        x: point.x, 
                                        y: point.y - 8, 
                                        textAnchor: "middle",
                                        opacity: 0.7 
                                      };
                                    };
                                    
                                    // Get optimized position
                                    const labelPos = positionLabels();
                                    
                                    return (
                                      <>
                                        {/* Background for text */}
                                        <motion.rect
                                          x={labelPos.x - (word.length * (viewBox !== "-110 -110 220 220" ? 1.6 : 2.2) / 2)}
                                          y={labelPos.y - (viewBox !== "-110 -110 220 220" ? 5 : 7)}
                                          width={word.length * (viewBox !== "-110 -110 220 220" ? 1.6 : 2.2)}
                                          height={viewBox !== "-110 -110 220 220" ? 7 : 9}
                                          rx={1}
                                          ry={1}
                                          fill="white"
                                          fillOpacity={0.7}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: labelPos.opacity }}
                                          transition={{ duration: 0.3, delay: 0.05 }}
                                        />
                                        <motion.text
                                          x={labelPos.x}
                                          y={labelPos.y}
                                          textAnchor={labelPos.textAnchor}
                                          fontSize={viewBox !== "-110 -110 220 220" ? "6" : "8"}
                                          fontWeight={isSelected ? "bold" : "normal"}
                                          fill={isSelected ? "#4c1d95" : "#6b46c1"}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 0.3, delay: 0.1 }}
                                        >
                                          {word}
                                        </motion.text>
                                      </>
                                    );
                                  })()}
                                </g>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    
                    <div className="p-2 text-xs text-center text-gray-500">
                      This 2D visualization represents the high-dimensional embedding space.
                      <br />
                      <span className="text-purple-600 font-medium">
                        Click on a word to see it and its related words in focus.
                      </span>
                      {viewBox !== "-110 -110 220 220" && (
                        <motion.div 
                          className="mt-1 text-xs text-gray-400"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <button 
                            onClick={resetView} 
                            className="text-purple-500 hover:text-purple-700 underline"
                          >
                            Click here
                          </button> to reset view and see all points
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Similar words section - Collapsible */}
        {currentSection === "embeddings" && selectedWord && similarWords.length > 0 && (
          <>
            <AnimatePresence>
              {expandedSections.similar && (
                <motion.div
                  className="mb-2"
                  key="embeddings-similar"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-3 justify-items-center">
                    {similarWords.map((item, i) => (
                      <LegoBlock
                        key={i}
                        text={item.word}
                        color="bg-purple-300"
                        className={`opacity-${Math.floor(item.similarity * 100)}`}
                        onClick={() => handleWordSelect(item.word)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Relationship Popup */}
        <AnimatePresence>
          {showRelationshipPopup && selectedWord && similarWords.length > 0 && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRelationships}
            >
              <motion.div 
                className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-[90vh] overflow-hidden"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 bg-purple-100 flex justify-between items-center border-b border-purple-200">
                  <h3 className="text-lg font-medium text-purple-900">
                    Word Relationships: <span className="font-bold">{selectedWord}</span>
                  </h3>
                  <button 
                    onClick={closeRelationships}
                    className="text-purple-500 hover:text-purple-700 focus:outline-none"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-4">
                      This view shows the semantic relationships between "{selectedWord}" and its most similar words in the embedding space.
                    </p>
                    
                    <div className="flex items-start relative">
                      {/* Selected word on the left */}
                      <div className="flex-shrink-0 w-1/4 flex flex-col items-center">
                        <div 
                          className="bg-purple-400 p-2 rounded-lg shadow-md font-medium text-center text-white"
                          style={{ position: 'relative', zIndex: 2 }}
                        >
                          {selectedWord}
                        </div>
                      </div>
                      
                      <div className="flex-grow relative min-h-[200px]">
                        {/* Connection lines and similar words - Using SVG for proper connections */}
                        <svg 
                          className="absolute inset-0 w-full" 
                          style={{ 
                            top: '0px', 
                            left: '-50px', 
                            zIndex: 1, 
                            height: `${Math.max(300, similarWords.length * 60 + 50)}px` 
                          }}
                          preserveAspectRatio="xMidYMin meet"
                        >
                          {similarWords.map((item, index) => {
                            // Calculate vertical position for this item based on index
                            const yPos = 30 + index * 60;
                            return (
                              <motion.path
                                key={`line-${index}`}
                                d={`M 0,20 L 100,${yPos}`}
                                stroke={`url(#gradient-${index})`}
                                strokeWidth="2"
                                fill="none"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ 
                                  pathLength: 1, 
                                  opacity: Math.max(0.5, item.similarity)
                                }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                              />
                            );
                          })}
                          
                          {/* Gradients for each line */}
                          <defs>
                            {similarWords.map((_, index) => (
                              <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#9333ea" />
                                <stop offset="100%" stopColor="#c084fc" />
                              </linearGradient>
                            ))}
                          </defs>
                        </svg>
                        
                        {/* Similar words positioned on right side */}
                        <div 
                          className="space-y-8 relative" 
                          style={{ 
                            zIndex: 2, 
                            marginLeft: '50px', 
                            marginTop: '10px',
                            paddingBottom: '20px' // Add padding at the bottom for the last word
                          }}
                        >
                          {similarWords.map((item, index) => (
                            <div 
                              key={index} 
                              className="flex items-center" 
                              style={{ 
                                opacity: Math.max(0.5, item.similarity)
                              }}
                            >
                              <div 
                                className="bg-purple-300 px-3 py-1.5 rounded font-medium text-purple-900 text-sm cursor-pointer hover:bg-purple-400 transition-colors"
                                onClick={() => {
                                  handleWordSelect(item.word);
                                  closeRelationships();
                                }}
                                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                              >
                                {item.word}
                                <span className="ml-2 bg-white bg-opacity-50 px-1.5 py-0.5 rounded-full text-xs">
                                  {(item.similarity * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* <div className="mt-6 text-center">
                    <button
                      onClick={closeRelationships}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Close
                    </button>
                  </div> */}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help text for embeddings */}
        <AnimatePresence>
          {currentSection === "embeddings" && (
            <motion.p
              className="text-xs text-gray-500 mt-2 text-center"
              key="embeddings-help"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isLoadingEmbeddings 
                ? "Loading embeddings..." 
                : !selectedWord
                  ? "Enter your own words or click on a purple block to see semantically similar words." 
                  : "Gray blocks don't have embeddings in our demo model."}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoadingEmbeddings && currentSection === "embeddings" && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
              <div className="loader mb-4 w-12 h-12 border-4 border-t-purple-500 border-r-transparent border-b-purple-300 border-l-transparent rounded-full animate-spin"></div>
              <p className="text-gray-700">Loading embedding space...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 