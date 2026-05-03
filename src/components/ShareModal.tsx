import { useState } from 'react'
import ModalShell from './ModalShell'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  imageDataUrl: string | null
  shareText: string
  shareUrl: string
  fileName: string
}

export default function ShareModal({ isOpen, onClose, imageDataUrl, shareText, shareUrl, fileName }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const open = isOpen && !!imageDataUrl
  const fullText = `${shareText} ${shareUrl}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
  const blueskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(fullText)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <ModalShell isOpen={open} onClose={onClose} panelClassName="max-w-2xl">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <h2 className="font-display text-sm sm:text-base font-bold text-white">Share Game</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-2 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white text-lg leading-none flex items-center justify-center transition"
        >
          ×
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {imageDataUrl && (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open NBA Spoiler-Free site"
            className="block rounded-xl overflow-hidden border border-white/10 bg-black/20 group relative cursor-pointer"
          >
            <img src={imageDataUrl} alt="Share preview" className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.01]" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3 py-1.5 rounded-full bg-white/95 text-slate-900 text-xs font-bold tracking-wide shadow-lg">
                Open site ↗
              </span>
            </div>
          </a>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Tip: Twitter, Bluesky, and WhatsApp don't auto-attach images via web links. Download the
          image first, then attach it manually in the post.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <a
            href={imageDataUrl ?? '#'}
            download={fileName}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition"
          >
            <span className="text-lg">⬇️</span>
            <span>Download PNG</span>
          </a>
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition"
          >
            <span className="text-lg">{copied ? '✅' : '🔗'}</span>
            <span>{copied ? 'Copied!' : 'Copy text + link'}</span>
          </button>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 text-sky-200 hover:text-white text-xs font-semibold transition"
          >
            <span className="text-lg">🐦</span>
            <span>Twitter / X</span>
          </a>
          <a
            href={blueskyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 text-blue-200 hover:text-white text-xs font-semibold transition"
          >
            <span className="text-lg">🦋</span>
            <span>Bluesky</span>
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/20 text-emerald-200 hover:text-white text-xs font-semibold transition col-span-2 sm:col-span-4"
          >
            <span className="text-lg">💬</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </ModalShell>
  )
}
