"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  // Default to false on the server to avoid hydration mismatch
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query)
      // Set the initial value
      setMatches(media.matches)

      // Define a callback function to handle changes
      const updateMatches = (e: MediaQueryListEvent) => {
        setMatches(e.matches)
      }

      // Add event listener
      media.addEventListener("change", updateMatches)

      // Cleanup
      return () => {
        media.removeEventListener("change", updateMatches)
      }
    }
  }, [query])

  return matches
}

