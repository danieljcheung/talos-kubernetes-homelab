import { useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import { useMotionValueEvent } from "motion/react"
import * as THREE from "three"
import { buildWordPoints } from "./orb-masks"
import type { SoulNavigationRect, SoulNavigationView, SoulSceneState } from "./scene-types"

export const ESSENCE_COUNTS = { low: 1800, medium: 3000, high: 4800 } as const

export type SoulEssenceProps = { state: SoulSceneState }

type Destination = { view: SoulNavigationView; label: string; weight: number }
type ViewportSize = { width: number; height: number }
type WorldRect = { centerX: number; centerY: number; width: number; height: number }
type EssenceBuffers = { starts: Float32Array; targets: Float32Array; seeds: Float32Array; streams: Float32Array }

const DESTINATIONS: readonly Destination[] = [
  { view: "about", label: "ABOUT", weight: 20 },
  { view: "work", label: "WORK", weight: 17 },
  { view: "resume", label: "RESUME", weight: 24 },
]
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const VERTEX_SHADER = `
attribute vec3 aStart;
attribute vec3 aTarget;
attribute float aSeed;
attribute float aStream;
uniform float uProgress;
uniform float uContentProgress;
uniform float uTime;
uniform float uReducedMotion;
uniform vec2 uSoulCenter;
uniform float uSoulScale;
varying float vAlpha;

vec3 cubicBezier(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
  float inv = 1.0 - t;
  return inv * inv * inv * p0 + 3.0 * inv * inv * t * p1 + 3.0 * inv * t * t * p2 + t * t * t * p3;
}

void main() {
  float delay = aStream * 0.075;
  float reveal = clamp((uProgress - delay) / max(0.001, 1.0 - delay), 0.0, 1.0);
  float retract = 1.0 - smoothstep(0.0, 0.53, uContentProgress);
  float t = smoothstep(0.0, 1.0, reveal) * retract;
  vec3 start = vec3(aStart.xy * uSoulScale + uSoulCenter, aStart.z * uSoulScale);
  vec3 neck = start + vec3((aSeed - 0.5) * 0.035, -0.42 * uSoulScale, 0.0);
  vec3 approach = aTarget + vec3((aSeed - 0.5) * 0.05, 0.34, 0.0);
  vec3 world = cubicBezier(start, neck, approach, aTarget, t);
  float wobble = sin(uTime * 2.1 + aSeed * 37.0) * 0.06 * sin(3.14159265 * t) * (1.0 - uReducedMotion);
  world.x += wobble;
  vec4 mvPosition = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = mix(3.6, 2.2, t);
  vAlpha = step(0.001, reveal) * mix(0.42, 0.96, t);
}
`

const FRAGMENT_SHADER = `
precision highp float;
varying float vAlpha;
void main() {
  vec2 edge = abs(gl_PointCoord - 0.5);
  float square = 1.0 - smoothstep(0.46, 0.5, max(edge.x, edge.y));
  gl_FragColor = vec4(1.0, 0.70, 0.11, vAlpha * square);
}
`

function toWorldRect(rect: SoulNavigationRect, viewport: ViewportSize, screen: ViewportSize): WorldRect {
  return {
    centerX: ((rect.left + rect.width / 2) / Math.max(1, screen.width) - 0.5) * viewport.width,
    centerY: (0.5 - (rect.top + rect.height / 2) / Math.max(1, screen.height)) * viewport.height,
    width: rect.width / Math.max(1, screen.width) * viewport.width,
    height: rect.height / Math.max(1, screen.height) * viewport.height,
  }
}

function allocateCounts(total: number) {
  const weightTotal = DESTINATIONS.reduce((sum, destination) => sum + destination.weight, 0)
  const counts = DESTINATIONS.map((destination) => Math.floor(total * destination.weight / weightTotal))
  let remainder = total - counts.reduce((sum, count) => sum + count, 0)
  for (let index = 0; remainder > 0; index = (index + 1) % counts.length) {
    counts[index] += 1
    remainder -= 1
  }
  return counts
}

function buildEssenceBuffers(total: number, rects: readonly SoulNavigationRect[], viewport: ViewportSize, screen: ViewportSize): EssenceBuffers {
  const starts = new Float32Array(total * 3)
  const targets = new Float32Array(total * 3)
  const seeds = new Float32Array(total)
  const streams = new Float32Array(total)
  const counts = allocateCounts(total)
  let offset = 0

  DESTINATIONS.forEach((destination, stream) => {
    const count = counts[stream]
    const points = buildWordPoints(destination.label, count)
    const rect = rects.find((candidate) => candidate.view === destination.view)
    const targetRect = rect ? toWorldRect(rect, viewport, screen) : { centerX: 0, centerY: -2, width: 1, height: 0.3 }

    for (let index = 0; index < count; index += 1) {
      const sampleIndex = offset + index
      const seed = (sampleIndex * 0.7548776662466927) % 1
      const azimuth = sampleIndex * GOLDEN_ANGLE
      const vertical = -0.72 - 0.28 * ((sampleIndex * 0.3819660112501051) % 1)
      const ringRadius = Math.sqrt(Math.max(0, 1 - vertical * vertical))
      starts[sampleIndex * 3] = Math.cos(azimuth) * ringRadius * 1.35
      starts[sampleIndex * 3 + 1] = vertical * 1.35
      starts[sampleIndex * 3 + 2] = Math.sin(azimuth) * ringRadius * 1.35
      const point = points[index]
      targets[sampleIndex * 3] = targetRect.centerX + point.x * targetRect.width
      targets[sampleIndex * 3 + 1] = targetRect.centerY + point.y * targetRect.width
      targets[sampleIndex * 3 + 2] = 0
      seeds[sampleIndex] = seed
      streams[sampleIndex] = stream
    }
    offset += count
  })

  return { starts, targets, seeds, streams }
}

export function SoulEssence({ state }: SoulEssenceProps) {
  const { viewport, size, invalidate } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const soulRect = useRef(state.soulRect.get())
  const essenceProgress = useRef(state.essenceProgress.get())
  const contentProgress = useRef(state.contentProgress.get())
  const [navigationRects, setNavigationRects] = useState(state.navigationRects.get())

  useMotionValueEvent(state.navigationRects, "change", (rects) => {
    setNavigationRects(rects)
    invalidate()
  })
  useMotionValueEvent(state.soulRect, "change", (rect) => {
    soulRect.current = rect
    invalidate()
  })
  useMotionValueEvent(state.essenceProgress, "change", (value) => {
    essenceProgress.current = value
    invalidate()
  })
  useMotionValueEvent(state.contentProgress, "change", (value) => {
    contentProgress.current = value
    invalidate()
  })

  const buffers = useMemo(() => buildEssenceBuffers(
    ESSENCE_COUNTS[state.quality],
    navigationRects,
    { width: viewport.width, height: viewport.height },
    { width: size.width, height: size.height },
  ), [navigationRects, size.height, size.width, state.quality, viewport.height, viewport.width])

  const uniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uContentProgress: { value: 0 },
    uTime: { value: 0 },
    uReducedMotion: { value: state.reducedMotion ? 1 : 0 },
    uSoulCenter: { value: new THREE.Vector2() },
    uSoulScale: { value: 1 },
  }), [state.reducedMotion])

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    const rect = soulRect.current
    material.uniforms.uProgress.value = essenceProgress.current
    material.uniforms.uContentProgress.value = contentProgress.current
    material.uniforms.uTime.value += Math.min(delta, 1 / 30)
    material.uniforms.uSoulCenter.value.set(
      (rect.centerX / Math.max(1, size.width) - 0.5) * viewport.width,
      (0.5 - rect.centerY / Math.max(1, size.height)) * viewport.height,
    )
    material.uniforms.uSoulScale.value = rect.diameter / Math.max(1, size.height) * viewport.height / 2.7
    const movingEssence = essenceProgress.current > 0 && essenceProgress.current < 1
    const movingContent = contentProgress.current > 0 && contentProgress.current < 1
    if (movingEssence || movingContent) invalidate()
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(ESSENCE_COUNTS[state.quality] * 3), 3]} />
        <bufferAttribute attach="attributes-aStart" args={[buffers.starts, 3]} />
        <bufferAttribute attach="attributes-aTarget" args={[buffers.targets, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[buffers.seeds, 1]} />
        <bufferAttribute attach="attributes-aStream" args={[buffers.streams, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
