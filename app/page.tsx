"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import LandingPage from "@/components/landing-page"
import FallingLegoBlocks from "@/components/falling-lego-blocks"
import ScrollableExperience from "@/components/scrollable-experience"
import { alfaSlabOne } from "@/app/fonts"

export default function Home() {
  const [hasScrolled, setHasScrolled] = useState(false)
  const initialTextRef = useRef("The quick brown fox jumps over the lazy dog!")

  // Track scroll position to adjust animation opacity and show/hide navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      // Check if we've scrolled past the landing page (viewport height)
      if (scrollPosition > window.innerHeight * 0.7 && !hasScrolled) {
        setHasScrolled(true)
      } else if (scrollPosition <= window.innerHeight * 0.3 && hasScrolled) {
        setHasScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [hasScrolled])

  return (
    <main className="min-h-screen w-full overflow-x-hidden relative bg-gradient-to-b from-yellow-50 to-yellow-100">
      {/* Persistent falling LEGO blocks background */}
      <div
        className={`fixed inset-0 z-0 transition-opacity duration-1000 ${hasScrolled ? "opacity-10" : "opacity-100"}`}
      >
        <FallingLegoBlocks />
      </div>

      {/* Landing section */}
      <section className="h-screen relative z-10 flex items-center justify-center">
        <LandingPage
          onStart={() => {
            // Smooth scroll to the content section when the user clicks "Begin the Journey"
            document.getElementById("content-section")?.scrollIntoView({ behavior: "smooth" })
          }}
        />

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
        >
          <p className={`text-yellow-800 mb-2 ${alfaSlabOne.className}`}>Scroll down to begin</p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-yellow-600"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.div>
      </section>

      {/* Content section */}
      <section id="content-section" className="relative z-10">
        <ScrollableExperience initialText={initialTextRef.current} hasScrolledPastLanding={hasScrolled} />
      </section>
    </main>
  )
}

