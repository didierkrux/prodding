import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import type { Speaker } from '@/data/speakers'

type RingCfg = {
  radius: number
  cardSizes: readonly number[]
  cornerRadius: number
  captionSize: number
  captionWidth: number
  parallax: number
}

const RING_CONFIG_DESKTOP: readonly RingCfg[] = [
  { radius: 0.32, cardSizes: [62, 66, 64, 68, 64, 66] as const, cornerRadius: 9, captionSize: 11, captionWidth: 110, parallax: 0.35 },
  { radius: 0.60, cardSizes: [72, 78, 70, 80, 74, 76, 72, 78, 74] as const, cornerRadius: 10, captionSize: 11, captionWidth: 132, parallax: 0.65 },
  { radius: 0.88, cardSizes: [84, 90, 82, 92, 86, 88, 84, 90] as const, cornerRadius: 12, captionSize: 12, captionWidth: 150, parallax: 1.0 },
]

const RING_CONFIG_COMPACT: readonly RingCfg[] = [
  { radius: 0.34, cardSizes: [44, 48, 46, 50, 46, 48] as const, cornerRadius: 7, captionSize: 9, captionWidth: 70, parallax: 0 },
  { radius: 0.66, cardSizes: [50, 54, 48, 56, 52, 54, 50, 54, 52] as const, cornerRadius: 8, captionSize: 10, captionWidth: 84, parallax: 0 },
  { radius: 0.96, cardSizes: [60, 66, 58, 68, 62, 64, 60, 66] as const, cornerRadius: 9, captionSize: 10, captionWidth: 96, parallax: 0 },
]

const COMPACT_WIDTH = 600
const RING_DISTRIBUTION = [6, 9] // inner, middle; outer takes the rest

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2)
}

interface LivingConstellationProps {
  speakers: Speaker[]
  className?: string
}

export function LivingConstellation({ speakers, className = '' }: LivingConstellationProps) {
  const [selected, setSelected] = useState<Speaker | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const reduceMotion = useReducedMotion()

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const sx = useSpring(mouseX, { stiffness: 90, damping: 22, mass: 0.6 })
  const sy = useSpring(mouseY, { stiffness: 90, damping: 22, mass: 0.6 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const el = containerRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const nx = (e.clientX - r.left - r.width / 2) / (r.width / 2)
      const ny = (e.clientY - r.top - r.height / 2) / (r.height / 2)
      mouseX.set(Math.max(-1, Math.min(1, nx)))
      mouseY.set(Math.max(-1, Math.min(1, ny)))
    }
    const onLeave = () => {
      mouseX.set(0)
      mouseY.set(0)
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [mouseX, mouseY, reduceMotion])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const ringGroups = useMemo(() => {
    const list = speakers.filter((s) => s.type !== 'logo')
    const groups: Speaker[][] = [[], [], []]
    const [inner, middle] = RING_DISTRIBUTION
    list.forEach((s, i) => {
      if (i < inner) groups[0].push(s)
      else if (i < inner + middle) groups[1].push(s)
      else groups[2].push(s)
    })
    return groups
  }, [speakers])

  const breathPhases = useMemo(
    () =>
      speakers.map(() => ({
        duration: 4.5 + Math.random() * 3,
        delay: Math.random() * 4,
        dx: (Math.random() - 0.5) * 5,
        dy: (Math.random() - 0.5) * 5,
      })),
    [speakers]
  )
  const phaseById = useMemo(() => {
    const m = new Map<string, (typeof breathPhases)[number]>()
    speakers.forEach((s, i) => m.set(s.id, breathPhases[i]))
    return m
  }, [speakers, breathPhases])

  const isCompact = size.w < COMPACT_WIDTH
  const ringConfig = isCompact ? RING_CONFIG_COMPACT : RING_CONFIG_DESKTOP

  // On desktop, base radius on min(w,h)/2 — captions may slightly clip near
  // the edges, but the bordered container has overflow-hidden and this gives
  // the constellation room to breathe. On compact, account for card halves
  // and caption room so nothing falls off the smaller canvas.
  // Two axes so the constellation stretches into an ellipse that fills the
  // canvas — taller containers use the vertical room, wider containers the
  // horizontal room, instead of being clamped to the smaller dimension.
  let usableRadiusX: number
  let usableRadiusY: number
  if (isCompact) {
    const outerCfg = ringConfig[ringConfig.length - 1]
    const maxOuterCard = Math.max(...outerCfg.cardSizes)
    const captionRoom = outerCfg.captionSize + 6 + CAPTION_GAP
    const hMargin = maxOuterCard / 2 + outerCfg.captionWidth / 4 + 6
    const vMargin = maxOuterCard / 2 + captionRoom + 8
    usableRadiusX = Math.max(80, size.w / 2 - hMargin)
    usableRadiusY = Math.max(80, size.h / 2 - vMargin)
  } else {
    usableRadiusX = size.w / 2
    usableRadiusY = size.h / 2
  }

  // Card / caption sizes scale with the SMALLER axis so they stay readable
  // and never collide on tighter rings. Calibrated to usableRadius ≈ 400.
  const REFERENCE_RADIUS = 400
  const minRadius = Math.min(usableRadiusX, usableRadiusY)
  const sizeScale = isCompact
    ? 1
    : Math.min(1.55, Math.max(1, minRadius / REFERENCE_RADIUS))

  const handleSelect = useCallback((s: Speaker) => setSelected(s), [])
  const handleDismiss = useCallback(() => setSelected(null), [])

  const hoveredSpeaker = hovered ? speakers.find((s) => s.id === hovered) : null

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
    >
      {/* Center hovered-event-logo watermark — keyed by logo so hovering
          two speakers from the same event doesn't flicker. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
        <AnimatePresence mode="wait">
          {hoveredSpeaker?.eventLogo && (
            <motion.img
              key={hoveredSpeaker.eventLogo}
              src={hoveredSpeaker.eventLogo}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              style={{ width: 140, height: 140, objectFit: 'contain' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Center title / hovered name (pill-backed so it reads above cards) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        <AnimatePresence mode="wait">
          {hoveredSpeaker ? (
            <motion.div
              key={`hov-${hoveredSpeaker.id}`}
              className="text-center rounded-2xl"
              initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(4px)', y: -4 }}
              transition={{ duration: 0.16 }}
              style={{
                padding: isCompact ? '8px 14px' : '12px 20px',
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 14px -6px rgba(34,17,68,0.18)',
              }}
            >
              <p
                className="text-text-primary tracking-tight whitespace-nowrap"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: isCompact ? 20 : 26 }}
              >
                {hoveredSpeaker.name}
              </p>
              <p
                className="mt-0.5 text-text-secondary whitespace-nowrap"
                style={{ fontSize: isCompact ? 11 : 13 }}
              >
                {hoveredSpeaker.title} · {hoveredSpeaker.company}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="title"
              className="rounded-2xl"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.16 }}
              style={{
                padding: isCompact ? '6px 14px' : '10px 20px',
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 14px -6px rgba(34,17,68,0.18)',
              }}
            >
              <h2
                className="text-text-primary tracking-tight whitespace-nowrap"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: isCompact ? 22 : 28 }}
              >
                Past speakers
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rings */}
      {ringGroups.map((group, i) => (
        <Ring
          key={i}
          ringIndex={i}
          group={group}
          cfg={ringConfig[i]}
          radiusX={usableRadiusX * ringConfig[i].radius}
          radiusY={usableRadiusY * ringConfig[i].radius}
          sizeScale={sizeScale}
          sx={sx}
          sy={sy}
          phaseById={phaseById}
          hovered={hovered}
          selectedId={selected?.id ?? null}
          onHover={setHovered}
          onSelect={handleSelect}
          reduceMotion={!!reduceMotion}
          frozen={!!selected}
        />
      ))}

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 z-30 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleDismiss}
              style={{
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.65) 100%)',
                backdropFilter: 'blur(2px)',
              }}
            />
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none p-4">
              <motion.div
                layoutId={`speaker-${selected.id}`}
                className="pointer-events-auto bg-white rounded-2xl overflow-hidden shadow-xl relative"
                transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                style={{
                  width: Math.min(340, Math.max(260, size.w - 32)),
                  boxShadow:
                    '0 18px 36px -12px rgba(34, 17, 68, 0.22), 0 6px 14px -8px rgba(34, 17, 68, 0.18)',
                  outline: '1px solid rgba(34, 17, 68, 0.08)',
                }}
              >
                <button
                  onClick={handleDismiss}
                  aria-label="Close speaker details"
                  className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#1a1a1a] flex items-center justify-center shadow-sm transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
                <div
                  className="relative flex items-center justify-center text-white font-bold overflow-hidden"
                  style={{
                    height: isCompact ? 220 : 260,
                    backgroundColor: selected.color,
                    fontSize: 56,
                  }}
                >
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="relative z-10">{getInitials(selected.name)}</span>
                </div>
                <motion.div
                  className="p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.22 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0 flex-1">
                      <h3 className="text-xl font-bold text-[#1a1a1a] tracking-tight leading-tight truncate">
                        {selected.name}
                      </h3>
                      <p className="text-sm text-[#3a3a3a] mt-1">{selected.title}</p>
                      <p className="text-sm text-[#6b6b6b]">{selected.company}</p>
                    </div>
                    {selected.eventLogo && (
                      <img
                        src={selected.eventLogo}
                        alt=""
                        className="object-contain shrink-0"
                        style={{ height: 56 }}
                      />
                    )}
                  </div>
                  <a
                    href={`https://archive.devcon.org/watch/?sort=eventId&order=desc&q=${encodeURIComponent(
                      selected.name.toLowerCase()
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-sm font-medium py-2.5 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 2.5 L13 8 L3 13.5 Z" fill="currentColor" />
                    </svg>
                    Watch talks on Devcon Archive
                  </a>
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface RingProps {
  ringIndex: number
  group: Speaker[]
  cfg: RingCfg
  radiusX: number
  radiusY: number
  sizeScale: number
  sx: MotionValue<number>
  sy: MotionValue<number>
  phaseById: Map<string, { duration: number; delay: number; dx: number; dy: number }>
  hovered: string | null
  selectedId: string | null
  onHover: (id: string | null) => void
  onSelect: (s: Speaker) => void
  reduceMotion: boolean
  frozen: boolean
}

function Ring({
  ringIndex,
  group,
  cfg,
  radiusX,
  radiusY,
  sizeScale,
  sx,
  sy,
  phaseById,
  hovered,
  selectedId,
  onHover,
  onSelect,
  reduceMotion,
  frozen,
}: RingProps) {
  const tx = useTransform(sx, (v) => v * 16 * cfg.parallax)
  const ty = useTransform(sy, (v) => v * 16 * cfg.parallax)

  return (
    <motion.div
      className="absolute"
      style={{
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        x: reduceMotion ? 0 : tx,
        y: reduceMotion ? 0 : ty,
      }}
    >
      {(() => {
        // Use the smaller axis to bound card size — that's the tightest
        // spacing along the ellipse perimeter and prevents overlap.
        const minR = Math.min(radiusX, radiusY)
        const arcLength = (2 * Math.PI * minR) / group.length
        const maxCardForArc = Math.max(40, arcLength * 0.7)

        return group.map((speaker, i) => {
          const angle = ((2 * Math.PI) / group.length) * i - Math.PI / 2
          const cx = radiusX * Math.cos(angle)
          const cy = radiusY * Math.sin(angle)
          const baseCard = cfg.cardSizes[i % cfg.cardSizes.length]
          const cardSize = Math.round(Math.min(baseCard * sizeScale, maxCardForArc))
          const captionWidth = Math.round(
            Math.min(cfg.captionWidth * sizeScale, arcLength * 0.95)
          )
          const isHovered = hovered === speaker.id
          const isSelected = selectedId === speaker.id
          const phase = phaseById.get(speaker.id) ?? { duration: 5, delay: 0, dx: 0, dy: 0 }

          return (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              x={cx}
              y={cy}
              cardSize={cardSize}
              cornerRadius={cfg.cornerRadius}
              captionSize={cfg.captionSize}
              captionWidth={captionWidth}
              captionAbove={cy < 0}
              isHovered={isHovered}
              isSelected={isSelected}
              anyHovered={!!hovered}
              phase={phase}
              onHover={onHover}
              onSelect={onSelect}
              reduceMotion={reduceMotion}
              frozen={frozen}
              tabOrder={ringIndex * 100 + i}
            />
          )
        })
      })()}
    </motion.div>
  )
}

interface CardProps {
  speaker: Speaker
  x: number
  y: number
  cardSize: number
  cornerRadius: number
  captionSize: number
  captionWidth: number
  captionAbove: boolean
  isHovered: boolean
  isSelected: boolean
  anyHovered: boolean
  phase: { duration: number; delay: number; dx: number; dy: number }
  onHover: (id: string | null) => void
  onSelect: (s: Speaker) => void
  reduceMotion: boolean
  frozen: boolean
  tabOrder: number
}

const CAPTION_GAP = 6

function SpeakerCard({
  speaker,
  x,
  y,
  cardSize,
  cornerRadius,
  captionSize,
  captionWidth,
  captionAbove,
  isHovered,
  isSelected,
  anyHovered,
  phase,
  onHover,
  onSelect,
  reduceMotion,
  frozen,
  tabOrder,
}: CardProps) {
  const [imgFailed, setImgFailed] = useState(false)

  const breathAnim =
    reduceMotion || frozen
      ? { x: 0, y: 0 }
      : {
          x: [0, phase.dx, 0, -phase.dx, 0],
          y: [0, -phase.dy, 0, phase.dy, 0],
        }

  const captionHeight = Math.round(captionSize * 1.4)
  const captionTop = captionAbove
    ? -cardSize / 2 - CAPTION_GAP - captionHeight
    : cardSize / 2 + CAPTION_GAP

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
        zIndex: isHovered || isSelected ? 25 : 1,
      }}
    >
      <motion.div
        animate={breathAnim}
        transition={{
          duration: phase.duration,
          delay: phase.delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {/* Card image — absolutely centered on (0,0) of the wrapper */}
        {isSelected ? (
          <div
            style={{
              position: 'absolute',
              left: -cardSize / 2,
              top: -cardSize / 2,
              width: cardSize,
              height: cardSize,
            }}
          />
        ) : (
          <motion.button
            type="button"
            layoutId={`speaker-${speaker.id}`}
            tabIndex={frozen ? -1 : 0}
            aria-label={`${speaker.name}, ${speaker.title} at ${speaker.company}`}
            onClick={() => onSelect(speaker)}
            onMouseEnter={() => onHover(speaker.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(speaker.id)}
            onBlur={() => onHover(null)}
            className="cursor-pointer"
            style={{
              position: 'absolute',
              left: -cardSize / 2,
              top: -cardSize / 2,
              width: cardSize,
              height: cardSize,
              padding: 0,
              border: 'none',
              background: 'transparent',
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.15, y: -3 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            data-tab-order={tabOrder}
          >
            <div
              className="w-full h-full overflow-hidden flex items-center justify-center text-white font-semibold relative"
              style={{
                backgroundColor: speaker.color,
                fontSize: cardSize * 0.32,
                borderRadius: cornerRadius,
                outline: '1px solid rgba(34, 17, 68, 0.08)',
                boxShadow: isHovered
                  ? '0 10px 24px -10px rgba(34,17,68,0.3), 0 4px 8px -4px rgba(34,17,68,0.2)'
                  : '0 2px 6px -2px rgba(34,17,68,0.12)',
                transition: 'box-shadow 180ms ease-out',
              }}
            >
              {!imgFailed ? (
                <img
                  src={speaker.image}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span>{getInitials(speaker.name)}</span>
              )}
            </div>
          </motion.button>
        )}

        {/* Caption — radiates outward (above for upper half, below for lower) */}
        {!isSelected && (
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: -captionWidth / 2,
              top: captionTop,
              width: captionWidth,
              height: captionHeight,
              textAlign: 'center',
              fontSize: captionSize,
              lineHeight: `${captionHeight}px`,
              color: anyHovered && !isHovered ? 'rgba(34,17,68,0.4)' : 'rgba(34,17,68,0.88)',
              fontWeight: isHovered ? 700 : 500,
              transition: 'color 160ms ease-out, font-weight 160ms ease-out',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow:
                '0 1px 2px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.6)',
            }}
          >
            {speaker.name}
          </div>
        )}
      </motion.div>
    </div>
  )
}
