"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export interface LegoBlockProps {
  text: string
  color?: string
  id?: number
  isSubword?: boolean
  onClick?: () => void
  isHighlighted?: boolean
  className?: string
  customIdDisplay?: (id: number) => React.ReactNode
}

export function LegoBlock({
  text,
  color = "bg-yellow-500",
  id,
  isSubword = false,
  onClick,
  isHighlighted = false,
  className = "",
  customIdDisplay
}: LegoBlockProps) {
  const [isHovered, setIsHovered] = useState(false)
  // Calculate the number of studs based on text length
  const studCount = Math.min(Math.max(Math.ceil(text.length / 2), 1), 4)

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center m-2 cursor-pointer transition-all",
        // Add more bottom margin when ID is present
        id !== undefined && "mb-8",
        isHighlighted && "scale-110 z-10",
        className,
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Lego block body */}
      <div className="relative">
        {/* Lego studs on top */}
        <div className={`absolute -top-3 left-0 right-0 flex justify-center`}>
          {Array.from({ length: studCount }).map((_, i) => (
            <div key={i} className={cn("w-5 h-3 mx-[1px] rounded-t-sm", color)} />
          ))}
        </div>

        {/* Main block */}
        <div
          className={cn(
            "px-3 py-2 rounded-none text-center shadow-md",
            "min-w-[40px] h-12 flex items-center justify-center",
            studCount === 1 ? "w-[40px]" : studCount === 2 ? "w-[70px]" : "w-[120px]",
            color,
            isSubword && "border border-dashed border-gray-400",
          )}
        >
          <span className={cn("text-sm font-medium text-black", className)}>{text}</span>
        </div>

        {/* Token ID display - show only on hover */}
        {isHovered && id !== undefined && customIdDisplay ? (
          // Use the custom ID display component if provided
          customIdDisplay(id)
        ) : (
          // Fall back to the default hover behavior
          isHovered && id !== undefined && (
            <div 
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-2 py-1 rounded-md border border-gray-300 shadow-sm transition-opacity duration-200"
            >
              ID: {id}
            </div>
          )
        )}
      </div>
    </div>
  )
}

