
interface SpoilerToggleProps {
  spoilersVisible: boolean
  onToggle: () => void
}

export default function SpoilerToggle({ spoilersVisible, onToggle }: SpoilerToggleProps) {
  return (
    <button
      id="global-spoiler-toggle"
      onClick={onToggle}
      className={`
        relative flex items-center gap-2.5 px-4 py-2 rounded-full
        font-semibold text-sm transition-all duration-300 cursor-pointer
        border backdrop-blur-sm
        ${spoilersVisible
          ? 'bg-red-500/20 border-red-400/40 text-red-300 hover:bg-red-500/30'
          : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
        }
      `}
      title={spoilersVisible ? 'Hide all scores' : 'Show all scores'}
    >
      <span className="text-base" aria-hidden="true">
        {spoilersVisible ? '👁️' : '🙈'}
      </span>
      <span className="hidden sm:inline">
        {spoilersVisible ? 'Spoilers ON' : 'Spoilers OFF'}
      </span>

      {/* Toggle pill */}
      <span className={`
        relative inline-flex w-10 h-5 rounded-full transition-colors duration-300
        ${spoilersVisible ? 'bg-red-400' : 'bg-emerald-400'}
      `}>
        <span className={`
          absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md
          transition-transform duration-300
          ${spoilersVisible ? 'translate-x-5' : 'translate-x-0'}
        `} />
      </span>
    </button>
  )
}
