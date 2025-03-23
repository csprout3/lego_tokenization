"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"

interface FallingLegoBlocksProps {
  density?: "low" | "medium" | "high"
  speed?: "slow" | "medium" | "fast"
}

interface LegoBlock {
  id: number
  color: string
  width: number
  height: number
  studs: number
  x: number
  initialDelay: number
  duration: number
  rotation: number
  key: string // Unique key to prevent React from reusing components
}

// Define different LEGO block colors
const blockColors = ["bg-yellow-200", "bg-blue-200", "bg-red-200", "bg-green-200", "bg-purple-200", "bg-orange-200"]

// Define different block sizes
const blockSizes = [
  { width: 40, height: 24, studs: 1 },
  { width: 70, height: 24, studs: 2 },
  { width: 120, height: 24, studs: 4 },
]

// Generate a random block
const generateBlock = (index: number): LegoBlock => {
  const color = blockColors[Math.floor(Math.random() * blockColors.length)]
  const size = blockSizes[Math.floor(Math.random() * blockSizes.length)]
  const xPosition = Math.random() * 100 // Random position across the screen (0-100%)
  const initialDelay = Math.random() * 5 // Random delay for animation start
  const duration = 7 + Math.random() * 10 // Random duration between 7-17 seconds
  const rotation = Math.random() * 360 // Random initial rotation

  return {
    id: index,
    color,
    width: size.width,
    height: size.height,
    studs: size.studs,
    x: xPosition,
    initialDelay,
    duration,
    rotation,
    key: `block-${index}-${Date.now()}`, // Ensure unique key
  }
}

export default function FallingLegoBlocks({ density = "medium", speed = "medium" }: FallingLegoBlocksProps) {
  const [blocks, setBlocks] = useState<LegoBlock[]>([])
  const blockIdCounter = useRef(0)

  // Determine number of blocks based on density
  const blockCount = density === "low" ? 15 : density === "medium" ? 30 : 45

  // Determine animation speed based on speed prop
  const getBaseDuration = () => {
    return speed === "slow" ? 12 : speed === "medium" ? 8 : 5
  }

  // Function to create a new block
  const createNewBlock = () => {
    const newId = blockIdCounter.current
    blockIdCounter.current += 1
    return generateBlock(newId)
  }

  useEffect(() => {
    // Generate initial blocks with staggered positions
    const initialBlocks: LegoBlock[] = []

    // Create blocks that are already in various positions on the screen
    for (let i = 0; i < blockCount; i++) {
      const block = createNewBlock()

      // Distribute blocks throughout the screen initially
      // Some will start from top, some will be already halfway down
      const verticalPosition = i % 3 === 0 ? -10 : i % 3 === 1 ? 30 : 60

      initialBlocks.push({
        ...block,
        initialDelay: (i % 5) * 0.5, // Staggered delays
      })
    }

    setBlocks(initialBlocks)

    // Set up interval to add new blocks and remove those that have fallen off screen
    const interval = setInterval(() => {
      setBlocks((prevBlocks) => {
        // Create new blocks to maintain density
        const newBlocks = Array.from({ length: Math.max(1, Math.floor(blockCount / 15)) }, () => createNewBlock())

        // Keep only the blocks that haven't been on screen too long
        // This is a rough estimate - we're removing oldest blocks by their ID
        const updatedBlocks = [...prevBlocks, ...newBlocks]
        if (updatedBlocks.length > blockCount * 1.5) {
          // Sort by ID and remove oldest blocks
          return updatedBlocks.sort((a, b) => a.id - b.id).slice(newBlocks.length)
        }

        return updatedBlocks
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [blockCount])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {blocks.map((block) => (
        <FallingBlock key={block.key} block={block} baseDuration={getBaseDuration()} />
      ))}
    </div>
  )
}

// Separate component for each falling block to maintain its properties
function FallingBlock({
  block,
  baseDuration,
}: {
  block: LegoBlock
  baseDuration: number
}) {
  // Calculate actual duration based on base speed and some randomness
  const duration = baseDuration + (block.duration % 3)

  return (
    <motion.div
      className="absolute"
      initial={{
        top: "-10vh",
        left: `${block.x}%`,
        rotate: block.rotation,
        opacity: 1,
      }}
      animate={{
        top: "120%",
        rotate: block.rotation + 360,
        opacity: [1, 0.8, 0.5, 0.2, 0], // Gradually fade out as it falls
      }}
      transition={{
        duration: duration,
        delay: block.initialDelay,
        ease: "linear",
        opacity: { duration: duration, times: [0, 0.3, 0.6, 0.8, 1] }, // Control the timing of opacity changes
      }}
    >
      <div className="relative">
        {/* LEGO studs */}
        <div className="absolute -top-3 left-0 right-0 flex justify-center">
          {Array.from({ length: block.studs }).map((_, i) => (
            <div key={i} className={`w-5 h-3 mx-[1px] rounded-t-sm ${block.color}`} />
          ))}
        </div>

        {/* LEGO block body */}
        <div
          className={`${block.color} px-3 py-2 rounded-none shadow-md flex items-center justify-center`}
          style={{ width: block.width, height: block.height }}
        ></div>
      </div>
    </motion.div>
  )
}

