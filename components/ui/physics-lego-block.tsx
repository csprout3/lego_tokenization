"use client"

import { useEffect, useRef } from "react"
import Matter from "matter-js"

interface PhysicsLegoBlocksProps {
  tokens: string[]
  onConnect?: (token1: string, token2: string) => void
}

export function PhysicsLegoBlocks({ tokens, onConnect }: PhysicsLegoBlocksProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const renderRef = useRef<Matter.Render | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const isInitializedRef = useRef(false)
  const blockMapRef = useRef(new Map<Matter.Body, string>())

  // Initialize the physics engine
  useEffect(() => {
    // If already initialized or no tokens, don't reinitialize
    if (isInitializedRef.current || !sceneRef.current || tokens.length === 0) return

    // Mark as initialized to prevent multiple initializations
    isInitializedRef.current = true

    // Matter.js modules
    const { Engine, Render, Runner, Bodies, Composite, Body, Events, Mouse, MouseConstraint, Vector } = Matter

    // Create engine
    const engine = Engine.create({
      gravity: { x: 0, y: 0.5 }, // Reduced gravity for slower falling
    })
    engineRef.current = engine

    // Create renderer
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: sceneRef.current.clientWidth,
        height: 400,
        wireframes: false,
        background: "transparent",
      },
    })
    renderRef.current = render

    // Create walls to keep blocks inside
    const wallOptions = {
      isStatic: true,
      render: {
        fillStyle: "transparent",
        strokeStyle: "transparent",
        lineWidth: 0,
      },
    }

    const ground = Bodies.rectangle(
      render.options.width / 2,
      render.options.height + 5,
      render.options.width,
      10,
      wallOptions,
    )

    const leftWall = Bodies.rectangle(-5, render.options.height / 2, 10, render.options.height, wallOptions)

    const rightWall = Bodies.rectangle(
      render.options.width + 5,
      render.options.height / 2,
      10,
      render.options.height,
      wallOptions,
    )

    // Add walls to the world
    Composite.add(engine.world, [ground, leftWall, rightWall])

    // Create blocks with staggered timing
    const blockWidth = 80
    const blockHeight = 40
    const blockBodies: Matter.Body[] = []

    // Function to get color based on token type
    const getTokenColor = (token: string) => {
      if (token.match(/^[A-Za-z]+$/)) return "#BFDBFE" // bg-blue-200
      if (token.match(/^[0-9]+$/)) return "#A7F3D0" // bg-green-200
      if (token.match(/[.!?,;:]/)) return "#FECACA" // bg-red-200
      return "#FEF08A" // bg-yellow-200
    }

    // Create blocks
    tokens.forEach((token, index) => {
      setTimeout(() => {
        if (!engineRef.current) return

        // Calculate position - distribute blocks across the width
        const x = 50 + (index % 4) * (blockWidth + 20)
        const y = -50 - Math.floor(index / 4) * 60 // Start above the canvas

        // Create the block body
        const block = Bodies.rectangle(x, y, blockWidth, blockHeight, {
          restitution: 0.5, // Bounciness
          friction: 0.8,
          frictionAir: 0.02,
          density: 0.001, // Lighter blocks
          chamfer: { radius: 5 }, // Rounded corners
          render: {
            fillStyle: getTokenColor(token),
            strokeStyle: "#000",
            lineWidth: 2,
          },
        })

        // Store the token text with the body
        blockMapRef.current.set(block, token)
        blockBodies.push(block)

        // Add the block to the world
        Composite.add(engineRef.current.world, block)
      }, index * 200) // Stagger the drops by 200ms per block
    })

    // Add mouse control
    const mouse = Mouse.create(render.canvas)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false,
        },
      },
    })

    Composite.add(engine.world, mouseConstraint)

    // Keep the mouse in sync with rendering
    render.mouse = mouse

    // Handle collision events for connecting blocks
    Events.on(engine, "collisionStart", (event: Matter.IEventCollision<Matter.Engine>) => {
      const pairs = event.pairs

      pairs.forEach((pair) => {
        const bodyA = pair.bodyA
        const bodyB = pair.bodyB

        // Skip collisions with walls
        if (
          bodyA === ground ||
          bodyA === leftWall ||
          bodyA === rightWall ||
          bodyB === ground ||
          bodyB === leftWall ||
          bodyB === rightWall
        ) {
          return
        }

        // Check if blocks are close enough to connect
        const distance = Vector.magnitude(Vector.sub(bodyA.position, bodyB.position))

        if (distance < blockWidth * 0.8) {
          // Visual feedback - change color briefly
          const originalColorA = bodyA.render.fillStyle
          const originalColorB = bodyB.render.fillStyle

          bodyA.render.fillStyle = "#FCD34D" // Yellow highlight
          bodyB.render.fillStyle = "#FCD34D"

          // Reset color after a short delay
          setTimeout(() => {
            if (bodyA.render) bodyA.render.fillStyle = originalColorA
            if (bodyB.render) bodyB.render.fillStyle = originalColorB
          }, 300)

          // Notify parent component about connection
          if (onConnect && blockMapRef.current.has(bodyA) && blockMapRef.current.has(bodyB)) {
            onConnect(blockMapRef.current.get(bodyA)!, blockMapRef.current.get(bodyB)!)
          }
        }
      })
    })

    // Add text rendering
    Events.on(render, "afterRender", (event: Matter.IEventTimestamped<Matter.Render>) => {
      const context = render.context

      blockBodies.forEach((body) => {
        if (blockMapRef.current.has(body)) {
          const token = blockMapRef.current.get(body)!

          // Draw text on the block
          context.font = "12px Arial"
          context.fillStyle = "#000"
          context.textAlign = "center"
          context.textBaseline = "middle"
          context.fillText(token, body.position.x, body.position.y)
        }
      })
    })

    // Run the engine and renderer
    const runner = Runner.create()
    Runner.run(runner, engine)
    Render.run(render)
    runnerRef.current = runner

    // Handle window resize
    const handleResize = () => {
      if (sceneRef.current && renderRef.current) {
        renderRef.current.options.width = sceneRef.current.clientWidth
        renderRef.current.canvas.width = sceneRef.current.clientWidth

        // Update wall positions
        Body.setPosition(ground, {
          x: (renderRef.current.options.width || 800) / 2,
          y: (renderRef.current.options.height || 600) + 5,
        })

        Body.setPosition(rightWall, {
          x: (renderRef.current.options.width || 800) + 5,
          y: (renderRef.current.options.height || 600) / 2,
        })

        Render.setPixelRatio(renderRef.current, window.devicePixelRatio)
      }
    }

    window.addEventListener("resize", handleResize)

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize)

      // Stop the engine and renderer
      if (renderRef.current) {
        Render.stop(renderRef.current)
        renderRef.current.canvas.remove()
        renderRef.current = null
      }

      if (runnerRef.current) {
        Runner.stop(runnerRef.current)
        runnerRef.current = null
      }

      if (engineRef.current) {
        Engine.clear(engineRef.current)
        engineRef.current = null
      }

      // Reset state for potential reinitialization
      isInitializedRef.current = false
      blockMapRef.current.clear()
    }
  }, [tokens, onConnect])

  return (
    <div className="relative w-full h-[400px] overflow-hidden">
      <div ref={sceneRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-70 p-1 rounded text-xs">
        Drag blocks to move them • Connect blocks by bringing them close together
      </div>
    </div>
  )
}

