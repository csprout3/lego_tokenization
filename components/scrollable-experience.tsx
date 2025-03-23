"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Home } from "lucide-react"
import Introduction from "@/components/steps/introduction"
import BasicTokenization from "@/components/steps/basic-tokenization"
import SubwordTokenization from "@/components/steps/subword-tokenization"
import TokenToId from "@/components/steps/token-to-id"
import Embeddings from "@/components/steps/embeddings"
import Experimentation from "@/components/steps/experimentation"
import TokenizationImpact from "@/components/steps/tokenization-impact"
import Conclusion from "@/components/steps/conclusion"
import PersistentLegoVisualization from "@/components/shared/persistent-lego-visualization"

interface ScrollableExperienceProps {
  initialText?: string
  hasScrolledPastLanding: boolean
}

// Define all sections
const sections = [
  { id: "introduction", label: "Introduction", color: "bg-yellow-500", Component: Introduction },
  { id: "basic", label: "Basic Tokenization", color: "bg-red-500", Component: BasicTokenization },
  { id: "subword", label: "Subword Tokenization", color: "bg-blue-500", Component: SubwordTokenization },
  { id: "token-id", label: "Token IDs", color: "bg-green-500", Component: TokenToId },
  { id: "embeddings", label: "Embeddings", color: "bg-purple-500", Component: Embeddings },
  { id: "experiment", label: "Experiment", color: "bg-orange-500", Component: Experimentation },
  { id: "impact", label: "Impact on Models", color: "bg-indigo-500", Component: TokenizationImpact },
  { id: "conclusion", label: "Conclusion", color: "bg-teal-500", Component: Conclusion },
]

export default function ScrollableExperience({
  initialText = "The quick brown fox jumps over the lazy dog!",
  hasScrolledPastLanding = false,
}: ScrollableExperienceProps) {
  const [sampleText, setSampleText] = useState(initialText)
  const [activeSection, setActiveSection] = useState("introduction")
  const [discoveredSections, setDiscoveredSections] = useState<string[]>(["introduction"])
  const [textContentWidth, setTextContentWidth] = useState(0)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const contentRef = useRef<HTMLDivElement>(null)
  const textContentRef = useRef<HTMLDivElement>(null)

  // Initialize section refs
  useEffect(() => {
    sections.forEach((section) => {
      sectionRefs.current[section.id] = document.getElementById(section.id) as HTMLDivElement
    })
  }, [])

  // Track text content width for visualization positioning
  useEffect(() => {
    const updateContentWidth = () => {
      if (textContentRef.current) {
        setTextContentWidth(textContentRef.current.offsetWidth);
      }
    };

    // Initial update
    updateContentWidth();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateContentWidth);
    if (textContentRef.current) {
      resizeObserver.observe(textContentRef.current);
    }

    // Update on window resize too
    window.addEventListener('resize', updateContentWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContentWidth);
    };
  }, []);

  // Track scroll position to determine active section and discovered sections
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const headerHeight = 72 // Height of the fixed header
      const windowHeight = window.innerHeight
      
      // Find which section is currently in view and which sections should be discovered
      let currentActiveSection = activeSection
      const newDiscoveredSections = [...discoveredSections]

      // Iterate through sections to find the active one
      for (const section of sections) {
        const element = sectionRefs.current[section.id]
        if (!element) continue

        const { top, bottom } = element.getBoundingClientRect()
        const sectionTop = top + scrollPosition
        const sectionBottom = bottom + scrollPosition
        
        // A section is considered active when:
        // 1. Its top is above the viewport's middle (accounting for header)
        // 2. Its bottom hasn't scrolled past the viewport's middle
        const viewportMiddle = scrollPosition + (windowHeight / 2)
        
        if (sectionTop <= viewportMiddle && sectionBottom >= viewportMiddle) {
          currentActiveSection = section.id
          
          if (!newDiscoveredSections.includes(section.id)) {
            newDiscoveredSections.push(section.id)
          }
          break // Exit after finding the first matching section
        }
      }

      // Update states if changed
      if (currentActiveSection !== activeSection) {
        setActiveSection(currentActiveSection)
      }

      // Only update discovered sections if there are new ones
      if (newDiscoveredSections.length > discoveredSections.length) {
        setDiscoveredSections(newDiscoveredSections)
      }
    }

    window.addEventListener("scroll", handleScroll)
    // Trigger once to initialize
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [activeSection, discoveredSections])

  // Scroll to a specific section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const headerHeight = 72 // Height of the fixed header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      })
    }
  }

  // Get the index of the active section
  const activeSectionIndex = sections.findIndex((s) => s.id === activeSection)
  
  // Check if the current section should show the persistent visualization
  const shouldShowVisualization = ["introduction", "basic", "subword", "token-id", "embeddings"].includes(activeSection)

  // Calculate dynamic positioning for the visualization
  const getVisualizationStyle = () => {
    // For mobile, we don't need to calculate position
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return {};
    }

    const minMargin = 20; // Minimum margin between content and visualization
    const maxWidth = 320; // Max width of the visualization component
    const minWidth = 260; // Min width of the visualization component

    // Available space to the right of the text content
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const contentLeft = textContentRef.current ? textContentRef.current.getBoundingClientRect().left : 0;
    const contentRight = contentLeft + textContentWidth;
    const availableSpace = windowWidth - contentRight - minMargin - minMargin;

    // Determine the best width for the visualization
    const visualizationWidth = Math.max(minWidth, Math.min(maxWidth, availableSpace));

    // Position the visualization next to content with appropriate spacing
    return {
      width: `${visualizationWidth}px`,
      left: `${contentRight + minMargin}px`,
    };
  };

  // Get the style for the visualization component
  const visualizationStyle = getVisualizationStyle();

  return (
    <div className="min-h-screen">
      {/* Fixed header - only visible after scrolling past landing */}
      <AnimatePresence>
        {hasScrolledPastLanding && (
          <motion.header
            className="fixed top-0 left-0 right-0 bg-slate-50/80 backdrop-blur-sm p-4 z-20 border-b border-yellow-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="mr-4 p-2 rounded-full hover:bg-yellow-200/50"
                  aria-label="Return to top"
                >
                  <Home className="h-5 w-5 text-yellow-800" />
                </button>
                <h1 className="text-xl font-bold hidden sm:block text-yellow-800">
                  Visualizing Text Tokenization with LEGO
                </h1>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-yellow-800">
                  {activeSectionIndex + 1} of {sections.length}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-100 mt-2">
              <div
                className={`h-full ${sections[activeSectionIndex]?.color || "bg-yellow-400"} transition-all duration-500 ease-in-out`}
                style={{
                  width: `${((activeSectionIndex + 1) / sections.length) * 100}%`,
                }}
              />
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main content with fixed sidebar */}
      <div className="flex relative">
        {/* Fixed navigation sidebar - only visible after scrolling past landing */}
        <AnimatePresence>
          {hasScrolledPastLanding && (
            <motion.nav
              className="fixed top-[72px] left-0 bottom-0 w-64 p-4 z-10 bg-slate-50/80 backdrop-blur-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ul className="space-y-1">
                {sections.map((section, index) => {
                  const isDiscovered = discoveredSections.includes(section.id)
                  const isActive = activeSection === section.id

                  return (
                    <AnimatePresence key={section.id} mode="wait">
                      {isDiscovered && (
                        <motion.li
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <button
                            onClick={() => scrollToSection(section.id)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center ${
                              isActive
                                ? `${section.color.replace("bg-", "bg-opacity-20 ")} border-l-4 ${section.color}`
                                : "hover:bg-slate-100/50"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full ${section.color} flex items-center justify-center mr-3`}
                            >
                              <span className="text-xs text-white font-medium">{index + 1}</span>
                            </div>
                            <span className={isActive ? "font-medium text-yellow-900" : "text-yellow-800"}>
                              {section.label}
                            </span>
                          </button>
                        </motion.li>
                      )}
                    </AnimatePresence>
                  )
                })}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>

        {/* Content area - centered and not shifting */}
        <main
          className="w-full p-4 md:p-8 transition-all duration-300 bg-slate-50"
          ref={contentRef}
          style={{
            paddingTop: hasScrolledPastLanding ? "72px" : "0", // Add padding when header is fixed
          }}
        >
          {/* Single persistent visualization - desktop view */}
          <AnimatePresence mode="wait">
            {hasScrolledPastLanding && shouldShowVisualization && (
              <motion.div
                key="desktop-visualization"
                className="fixed top-[88px] hidden lg:block z-10 transition-all duration-300"
                style={visualizationStyle}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PersistentLegoVisualization 
                  key={activeSection} // Add key to ensure proper rerendering
                  sampleText={sampleText}
                  currentSection={activeSection}
                  className="shadow-md max-h-[80vh] overflow-y-auto"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile visualization - bottom fixed on smaller screens */}
          <AnimatePresence mode="wait">
            {hasScrolledPastLanding && shouldShowVisualization && (
              <motion.div
                key="mobile-visualization"
                className="fixed bottom-0 left-0 right-0 lg:hidden z-10 bg-white/95 backdrop-blur-sm border-t border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 max-w-lg mx-auto">
                  <PersistentLegoVisualization 
                    key={activeSection} // Add key to ensure proper rerendering
                    sampleText={sampleText}
                    currentSection={activeSection}
                    className="shadow-md"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-4xl mx-auto">
            {sections.map((section) => {
              const SectionComponent = section.Component
              const isVisualizationSection = ["introduction", "basic", "subword", "token-id", "embeddings"].includes(section.id)

              return (
                <div
                  key={section.id}
                  id={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] = el
                  }}
                  className="p-6 mb-16 min-h-[80vh] scroll-mt-20"
                >
                  {/* Content with responsive width constraints */}
                  <div 
                    className={isVisualizationSection 
                      ? "lg:max-w-[650px] md:max-w-[600px]" 
                      : ""}
                    ref={textContentRef}
                  >
                    <SectionComponent
                      sampleText={sampleText}
                      setSampleText={(text: string) => {
                        console.log("Setting sample text:", text)
                        setSampleText(text)
                      }}
                      hideVisualization={isVisualizationSection}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}

