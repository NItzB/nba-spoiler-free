import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string | null
  title?: string
}

export default function VideoModal({ isOpen, onClose, videoId, title }: VideoModalProps) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen || !videoId) return null

  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-8">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <h2 className="text-sm sm:text-base font-bold text-white truncate">
            {title || 'Game Recap'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close video"
            className="ml-2 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-lg leading-none flex items-center justify-center transition"
          >
            ×
          </button>
        </div>

        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            src={embedSrc}
            title={title || 'Game Recap'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
