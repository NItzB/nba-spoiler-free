import { motion } from 'framer-motion'

export default function EmptyState({ date }: { date: string }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-20 sm:py-24 px-6 text-center"
    >
      {/* Glowing ball — soft pulsing aura, slow rise/fall */}
      <div className="relative mb-8">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(249,115,22,0.35) 0%, rgba(249,115,22,0) 70%)',
            filter: 'blur(18px)',
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.95, 0.6] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative text-7xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🏀
        </motion.div>
      </div>

      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
        No games here
      </h2>
      <p className="text-slate-300 text-base max-w-md leading-relaxed mb-2">
        Nothing to rate for <span className="text-white font-semibold">{displayDate}</span>.
      </p>
      <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
        Try a previous date with the chevrons above — ratings refresh automatically once a game wraps.
      </p>
    </motion.div>
  )
}
