import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'

interface SpoilerToggleProps {
  spoilersVisible: boolean
  onToggle: () => void
}

export default function SpoilerToggle({ spoilersVisible, onToggle }: SpoilerToggleProps) {
  // Each click bumps a counter; the ripple element is keyed on it so a brand-
  // new ring is mounted every time, regardless of which direction we toggle.
  const [pulseId, setPulseId] = useState(0)
  // Drives the post-tap shake on ON→OFF. We use animation controls instead of
  // a static `animate` prop so the shake plays cleanly on top of `whileTap`.
  const controls = useAnimationControls()
  const prevVisibleRef = useRef(spoilersVisible)

  useEffect(() => {
    if (prevVisibleRef.current && !spoilersVisible) {
      // ON → OFF: brief shimmy, like sealing a vault
      controls.start({
        x: [0, -4, 4, -3, 3, 0],
        transition: { duration: 0.34, ease: 'easeOut' },
      })
    }
    prevVisibleRef.current = spoilersVisible
  }, [spoilersVisible, controls])

  const handleClick = () => {
    setPulseId(p => p + 1)
    onToggle()
  }

  // Colors snap to the *new* state — the ripple expresses what we're
  // crossing into, not what we're leaving behind.
  const ringColor = spoilersVisible ? '#fb923c' : '#34d399'
  const glowColor = spoilersVisible ? 'rgba(251,146,60,0.45)' : 'rgba(52,211,153,0.35)'

  return (
    <motion.button
      id="global-spoiler-toggle"
      onClick={handleClick}
      whileTap={{ scale: 0.94 }}
      animate={controls}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`
        relative flex items-center gap-2.5 px-4 py-2 rounded-full
        font-semibold text-sm cursor-pointer
        border backdrop-blur-sm
        transition-colors duration-300
        ${spoilersVisible
          ? 'bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30'
          : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
        }
      `}
      title={spoilersVisible ? 'Hide all scores' : 'Show all scores'}
      aria-pressed={spoilersVisible}
    >
      {/* Concentric ripple bursts — fire on every click */}
      <AnimatePresence>
        {pulseId > 0 && (
          <>
            <motion.span
              key={`ring-a-${pulseId}`}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `2px solid ${ringColor}`, boxShadow: `0 0 22px ${glowColor}` }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              key={`ring-b-${pulseId}`}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `1.5px solid ${ringColor}` }}
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Eye emoji — a brief scale "blink" on each toggle */}
      <motion.span
        key={`emoji-${spoilersVisible}`}
        className="text-base relative"
        aria-hidden="true"
        initial={{ scale: 0.4, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 18 }}
      >
        {spoilersVisible ? '👁️' : '🙈'}
      </motion.span>

      <span className="hidden sm:inline relative">
        {spoilersVisible ? 'Spoilers ON' : 'Spoilers OFF'}
      </span>

      {/* Toggle pill — knob bounces to its new spot via spring physics */}
      <span
        className={`
          relative inline-flex w-10 h-5 rounded-full transition-colors duration-300
          ${spoilersVisible ? 'bg-red-400' : 'bg-emerald-400'}
        `}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md"
          animate={{ x: spoilersVisible ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 24 }}
        />
      </span>
    </motion.button>
  )
}
