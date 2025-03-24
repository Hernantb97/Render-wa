'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Only render children once mounted on client to avoid hydration mismatches
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <NextThemesProvider
      {...props}
      defaultTheme="light"
      enableSystem={false}
      enableColorScheme={false}
    >
      {mounted ? children : null}
    </NextThemesProvider>
  )
}
