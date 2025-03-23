"use client"

import { useEffect, useRef } from "react"
import type Matter from "matter-js"

interface PhysicsLegoRendererProps {
  engine: Matter.Engine
  tokens: string[]
}

export function PhysicsLegoRenderer({ engine, tokens }: PhysicsLegoRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !engine) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Function to draw a LEGO block
    const drawLegoBlock = (body: Matter.Body) => {
      if (!ctx) return

      const { position, angle, vertices } = body
      const token = body.label || ""

      // Save the current state
      ctx.save()

      // Translate and rotate to the body's position and angle
      ctx.translate(position.x, position.y)
      ctx.rotate(angle)

      // Draw the main block
      ctx.beginPath()
      ctx.moveTo(vertices[0].x - position.x, vertices[0].y - position.y)
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x - position.x, vertices[i].y - position.y)
      }
      ctx.closePath()

      // Fill with the body's color
      ctx.fillStyle = body.render.fillStyle || "#FEF08A"
      ctx.fill()

      // Draw the outline
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw LEGO studs on top
      const width = Math.abs(vertices[0].x - vertices[2].x)
      const height = Math.abs(vertices[0].y - vertices[2].y)
      const studCount = Math.min(Math.max(Math.ceil(token.length / 2), 1), 4)
      const studSize = 5
      const studSpacing = 10

      ctx.fillStyle = body.render.fillStyle || "#FEF08A"
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 1

      for (let i = 0; i < studCount; i++) {
        const studX = -width / 2 + 15 + i * studSpacing
        const studY = -height / 2 - studSize

        // Draw stud (circle)
        ctx.beginPath()
        ctx.arc(studX, studY, studSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      // Draw the token text
      ctx.fillStyle = "#000000"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(token, 0, 0)

      // Restore the state
      ctx.restore()
    }

    // Animation loop
    const render = () => {
      if (!ctx || !engine) return

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw all bodies
      engine.world.bodies.forEach((body) => {
        // Skip walls and other non-block bodies
        if (body.label && tokens.includes(body.label)) {
          drawLegoBlock(body)
        }
      })

      requestAnimationFrame(render)
    }

    // Start the animation loop
    const animationId = requestAnimationFrame(render)

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth
        canvasRef.current.height = canvasRef.current.clientHeight
      }
    }

    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", handleResize)
    }
  }, [engine, tokens])

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
}

