"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Introduction from "@/components/steps/introduction"
import BasicTokenization from "@/components/steps/basic-tokenization"
import SubwordTokenization from "@/components/steps/subword-tokenization"
import TokenizationImpact from "@/components/steps/tokenization-impact"
import TokenToId from "@/components/steps/token-to-id"
import Embeddings from "@/components/steps/embeddings"
import Experimentation from "@/components/steps/experimentation"
import Conclusion from "@/components/steps/conclusion"
import { ChevronDown, ChevronUp, Home } from "lucide-react"

interface TokenizationExperienceProps {
  initialText?: string
}

// Update the steps array to move "Impact on Models" to be right before "Conclusion"
const steps = [
  { id: "introduction", label: "Introduction", color: "bg-yellow-500" },
  { id: "basic", label: "Basic Tokenization", color: "bg-red-500" },
  { id: "subword", label: "Subword Tokenization", color: "bg-blue-500" },
  { id: "token-id", label: "Token IDs", color: "bg-green-500" },
  { id: "embeddings", label: "Embeddings", color: "bg-purple-500" },
  { id: "experiment", label: "Experiment", color: "bg-orange-500" },
  { id: "impact", label: "Impact on Models", color: "bg-indigo-500" },
  { id: "conclusion", label: "Conclusion", color: "bg-teal-500" },
]

export default function TokenizationExperience({
  initialText = "The quick brown fox jumps over the lazy dog!",
}: TokenizationExperienceProps) {
  const [sampleText, setSampleText] = useState(initialText)
  const [currentStep, setCurrentStep] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [hasVisitedIntro, setHasVisitedIntro] = useState(false)

  useEffect(() => {
    // Mark that the user has visited the intro
    if (currentStep === 0) {
      setHasVisitedIntro(true)
    }
  }, [currentStep])

  const goToStep = (index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index)
      setIsScrolling(true)

      // Scroll to the top of the container with a smooth animation
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      }

      // Reset the scrolling state after animation completes
      setTimeout(() => {
        setIsScrolling(false)
      }, 500)
    }
  }

  const nextStep = () => goToStep(currentStep + 1)
  const prevStep = () => goToStep(currentStep - 1)

  // Get the current step component
  const renderCurrentStep = () => {
    switch (steps[currentStep].id) {
      case "introduction":
        return <Introduction sampleText={sampleText} setSampleText={setSampleText} />
      case "basic":
        return <BasicTokenization sampleText={sampleText} setSampleText={setSampleText} />
      case "subword":
        return <SubwordTokenization sampleText={sampleText} setSampleText={setSampleText} />
      case "impact":
        return <TokenizationImpact sampleText={sampleText} setSampleText={setSampleText} />
      case "token-id":
        return <TokenToId sampleText={sampleText} setSampleText={setSampleText} />
      case "embeddings":
        return <Embeddings sampleText={sampleText} setSampleText={setSampleText} />
      case "experiment":
        return <Experimentation />
      case "conclusion":
        return <Conclusion />
      default:
        return <Introduction sampleText={sampleText} setSampleText={setSampleText} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-yellow-100 flex flex-col">
      {/* Header with progress */}
      <header className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => window.location.reload()}
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Return to home"
            >
              <Home className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold hidden sm:block">Visualizing Text Tokenization with LEGO</h1>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 mt-2">
          <div
            className={`h-full ${steps[currentStep].color} transition-all duration-500 ease-in-out`}
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation sidebar */}
        <nav className="bg-white shadow-md md:w-64 p-4 md:min-h-[calc(100vh-64px)] md:sticky md:top-[64px]">
          <ul className="space-y-1">
            {steps.map((step, index) => (
              <li key={step.id}>
                <button
                  onClick={() => goToStep(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                    index === currentStep
                      ? `${step.color.replace("bg-", "bg-opacity-20 ")} border-l-4 ${step.color}`
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${step.color} flex items-center justify-center mr-3`}>
                    <span className="text-xs text-white font-medium">{index + 1}</span>
                  </div>
                  <span className={index === currentStep ? "font-medium" : ""}>{step.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content area */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-10">
            {/* Content container with animation */}
            <div ref={containerRef} className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={steps[currentStep].id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {renderCurrentStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`flex items-center px-4 py-2 rounded-md ${
                  currentStep === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <ChevronUp className="w-4 h-4 mr-2" />
                Previous
              </button>

              <button
                onClick={nextStep}
                disabled={currentStep === steps.length - 1}
                className={`flex items-center px-4 py-2 rounded-md ${
                  currentStep === steps.length - 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : `${steps[currentStep].color} text-white hover:opacity-90`
                }`}
              >
                Next
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

