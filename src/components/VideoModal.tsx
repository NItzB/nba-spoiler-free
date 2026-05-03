import ModalShell from './ModalShell'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string | null
  title?: string
}

export default function VideoModal({ isOpen, onClose, videoId, title }: VideoModalProps) {
  // Only show when we actually have a video ID — there's nothing to play otherwise.
  const open = isOpen && !!videoId
  const embedSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`
    : ''

  return (
    <ModalShell isOpen={open} onClose={onClose} panelClassName="max-w-5xl" cinematic>
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
        {embedSrc && (
          <iframe
            src={embedSrc}
            title={title || 'Game Recap'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>
    </ModalShell>
  )
}
