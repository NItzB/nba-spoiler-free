import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  /** Tailwind classes applied to the inner panel — e.g. "max-w-2xl". */
  panelClassName?: string
  /** Set true for media-heavy modals where the backdrop should feel
      cinematic (deeper blur, slightly darker). */
  cinematic?: boolean
  /** Optional so callers can render `<ModalShell isOpen={false} onClose={...} />`
      as a no-op when their content isn't ready (e.g. while data is loading). */
  children?: ReactNode
}

/**
 * Shared modal shell. Provides:
 *   - portal to <body>
 *   - backdrop fade + click-to-close
 *   - panel scale-in (0.96 → 1) with subtle y nudge
 *   - ESC handler + body scroll lock (released after exit anim, since the
 *     scroll-lock effect lives on the inner component which only mounts
 *     while the modal is visible)
 */
export default function ModalShell({
  isOpen,
  onClose,
  panelClassName = '',
  cinematic = false,
  children,
}: ModalShellProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <ModalContent onClose={onClose} panelClassName={panelClassName} cinematic={cinematic}>
          {children}
        </ModalContent>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ModalContent({
  onClose,
  panelClassName,
  cinematic,
  children,
}: {
  onClose: () => void
  panelClassName: string
  cinematic: boolean
  children?: ReactNode
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 backdrop-blur-xl ${cinematic ? 'bg-black/92' : 'bg-black/85'}`}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className={`relative w-full glass-modal border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl ring-1 ring-white/10 overflow-hidden ${panelClassName}`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
