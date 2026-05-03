import { useEffect, useMemo, useRef, useState } from 'react'
import ModalShell from './ModalShell'
import { RecapSource } from '../types/game'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  /** Single video id (legacy entry point — preferred form is `sources`). */
  videoId?: string | null
  /** Ordered candidate list from the scraper. Tried in region-aware order. */
  sources?: RecapSource[] | null
  /** IANA timezone — used to pick the source priority for this user. */
  timezone?: string
  title?: string
  /** Optional fallback link to ESPN highlights when every embed fails. */
  espnHighlightsUrl?: string | null
  /** Optional readable game label used in the YouTube-search fallback. */
  searchQuery?: string
}

/**
 * Region-aware ordering. The geo problem is real: Motion Station videos work
 * for our Israel users but get blocked in some US markets, and NBA-official's
 * embedability varies the other way. So we put each region's reliable source
 * first and let cycling handle the rest.
 */
function orderForRegion(
  sources: RecapSource[],
  timezone: string | undefined,
): RecapSource[] {
  if (!sources.length) return sources

  const tz = (timezone || '').toLowerCase()
  // Israel users → Motion Station first (proven working). US users →
  // NBA Official first (less geo-restricted within the US). Everyone else →
  // NBA Official first by default — it's the league's own content and tends
  // to be the more globally available of the two.
  const wantNbaFirst = !tz.includes('jerusalem') && !tz.includes('tel_aviv')

  const score = (s: RecapSource) => {
    if (wantNbaFirst) return s.source === 'nba-official' ? 0 : 1
    return s.source === 'motion-station' ? 0 : 1
  }

  return [...sources].sort((a, b) => score(a) - score(b))
}

export default function VideoModal({
  isOpen,
  onClose,
  videoId,
  sources,
  timezone,
  title,
  espnHighlightsUrl,
  searchQuery,
}: VideoModalProps) {
  // Build the candidate list: prefer the explicit `sources` array, fall back
  // to the legacy single `videoId` for older callers / older DB rows.
  const ordered = useMemo<RecapSource[]>(() => {
    const list: RecapSource[] = []
    if (sources && sources.length) list.push(...sources)
    if (videoId && !list.find(s => s.video_id === videoId)) {
      list.push({ source: 'unknown', video_id: videoId })
    }
    return orderForRegion(list, timezone)
  }, [sources, videoId, timezone])

  const [activeIdx, setActiveIdx] = useState(0)
  const [allFailed, setAllFailed] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Reset cycling state every time the modal opens or the candidate list
  // changes (e.g. user opens a different game's modal).
  useEffect(() => {
    if (!isOpen) return
    setActiveIdx(0)
    setAllFailed(false)
  }, [isOpen, ordered])

  // The YouTube IFrame API posts JSON messages from the embed origin.
  // onError event codes: 100 (not found / private), 101 + 150 (embed not
  // allowed in your country / by uploader). Any of those = swap to next.
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MessageEvent) => {
      const ok =
        e.origin === 'https://www.youtube-nocookie.com' ||
        e.origin === 'https://www.youtube.com'
      if (!ok) return
      let payload: any = e.data
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload) } catch { return }
      }
      if (!payload || typeof payload !== 'object') return
      // YouTube emits {event: 'onError', info: <errorCode>}
      if (payload.event === 'onError' || payload.info?.errorCode != null) {
        const code = typeof payload.info === 'number' ? payload.info : payload.info?.errorCode
        // Codes that mean "video can't be played here" — try next source.
        if (code === 100 || code === 101 || code === 150 || code === 153) {
          setActiveIdx(idx => {
            const next = idx + 1
            if (next >= ordered.length) {
              setAllFailed(true)
              return idx
            }
            return next
          })
        }
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [isOpen, ordered])

  const active = ordered[activeIdx]
  const open = isOpen && ordered.length > 0
  // enablejsapi=1 is required for the IFrame API postMessage events.
  // origin pin reduces noise from unrelated postMessage senders.
  const embedSrc = active
    ? `https://www.youtube-nocookie.com/embed/${active.video_id}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : ''

  const ytWatchUrl = active ? `https://www.youtube.com/watch?v=${active.video_id}` : ''
  const ytSearchUrl = searchQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery + ' NBA highlights')}`
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
        {!allFailed && embedSrc && (
          <iframe
            // Re-key on activeIdx so a fresh iframe mounts when we swap sources.
            key={`${active?.source}-${active?.video_id}`}
            ref={iframeRef}
            src={embedSrc}
            title={title || 'Game Recap'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}

        {allFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 px-6">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-3" aria-hidden>📺</div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                Recap unavailable here
              </h3>
              <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                YouTube blocks every recap source we have for your region. Try one of these instead:
              </p>
              <div className="flex flex-col gap-2">
                {ytSearchUrl && (
                  <a
                    href={ytSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-100 text-sm font-bold transition"
                  >
                    🔍 Search YouTube for this game
                  </a>
                )}
                {ytWatchUrl && (
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-bold transition"
                  >
                    ↗ Open on YouTube directly
                  </a>
                )}
                {espnHighlightsUrl && (
                  <a
                    href={espnHighlightsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-bold transition"
                  >
                    🏀 ESPN highlights
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
