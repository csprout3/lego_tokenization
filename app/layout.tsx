import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { alfaSlabOne } from "./fonts"

export const metadata: Metadata = {
  title: "Text Tokenization with LEGO",
  description: "An interactive learning experience about text tokenization",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={alfaSlabOne.variable}>
      <body>{children}</body>
    </html>
  )
}



import './globals.css'