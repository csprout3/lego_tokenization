"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { alfaSlabOne } from "@/app/fonts"
import { LegoBlock } from "@/components/ui/lego-block"

interface LandingPageProps {
  onStart: () => void
}

// Section colors in order for the gradient effect
const sectionColors = [
  "bg-yellow-200",
  "bg-blue-200",
  "bg-red-200",
  "bg-green-200",
  "bg-purple-200",
  "bg-orange-200"
]

export default function LandingPage({ onStart }: LandingPageProps) {
  const [isReady, setIsReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Define the pyramid structures
  const titleStructure = [
    { word: "Visualizing", x: -122, y: -307},     // Bottom left
    { word: "text", x: -36, y: -256},           // Middle left
    { word: "Tokenization", x: 0, y: -205},     // Top
    { word: "with", x: 86, y: -155},            // Middle right
    { word: "LEGO", x: 122, y: -104},             // Bottom right
  ]

  const subtitleStructure = [
    { word: "An", x: -122, y: -40},              // Bottom left
    { word: "Interactive", x: -90, y: -40 },     // Middle left
    { word: "Learning", x: -126, y: 5},         // Top
    { word: "Experience", x: -18, y: 5},          // Top right
    { word: "by", x: -14, y: 50},                  // Middle
    { word: "Cole", x: -14, y: 95},                // Bottom left
    { word: "Sprout", x: 0, y: 140},            // Bottom right
  ]
  
  const { scrollY } = useScroll()
  
  // Create transform values for each word's position and opacity
  const createWordAnimations = (structure: typeof titleStructure, baseY: number) => {
    return structure.map(({ x, y }, index) => ({
      y: useTransform(
        scrollY,
        [0, 300],
        [y, y + Math.random() * 1000 - 500]
      ),
      x: useTransform(
        scrollY,
        [0, 300],
        [x, x + Math.random() * 1000 - 500]
      ),
      opacity: useTransform(
        scrollY,
        [0, 200],
        [1, 0]
      ),
      rotate: useTransform(
        scrollY,
        [0, 300],
        [0, Math.random() * 360 - 180]
      )
    }))
  }

  const titleAnimations = createWordAnimations(titleStructure, 200)
  const subtitleAnimations = createWordAnimations(subtitleStructure, 400)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Get color for a word based on its position in the sequence
  const getWordColor = (index: number, total: number) => {
    // Calculate position in the gradient (0 to 1)
    const position = index / (total - 1)
    // Get the corresponding color from the sections array
    const colorIndex = Math.floor(position * (sectionColors.length - 1))
    return sectionColors[colorIndex]
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Title pyramid */}
      <div className="relative mb-24">
        {titleStructure.map(({ word }, index) => (
          <motion.div
            key={`title-${index}`}
            style={{
              position: 'absolute',
              left: '50%',
              y: titleAnimations[index].y,
              x: titleAnimations[index].x,
              opacity: titleAnimations[index].opacity,
              rotate: titleAnimations[index].rotate,
              zIndex: Math.abs(Math.floor(titleStructure[index].y))
            }}
            initial={{ opacity: 0, y: -50 }}
            animate={isReady ? { opacity: 1, y: titleStructure[index].y } : {}}
            transition={{ duration: 0.8, delay: index * 0.1 }}
          >
            <LegoBlock
              text={word}
              color={getWordColor(index, titleStructure.length)}
              className={`transform-gpu ${alfaSlabOne.className}`}
            />
          </motion.div>
        ))}
      </div>

      {/* Subtitle pyramid */}
      <div className="relative">
        {subtitleStructure.map(({ word }, index) => (
          <motion.div
            key={`subtitle-${index}`}
            style={{
              position: 'absolute',
              left: '50%',
              y: subtitleAnimations[index].y,
              x: subtitleAnimations[index].x,
              opacity: subtitleAnimations[index].opacity,
              rotate: subtitleAnimations[index].rotate,
              zIndex: 1000 - Math.floor(subtitleStructure[index].y)
            }}
            initial={{ opacity: 0 }}
            animate={isReady ? { opacity: 1, y: subtitleStructure[index].y } : {}}
            transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
          >
            <LegoBlock
              text={word}
              color={getWordColor(index, subtitleStructure.length)}
              className={`transform-gpu scale-90 ${alfaSlabOne.className}`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

