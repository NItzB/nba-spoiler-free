import { motion, type Variants } from 'framer-motion'

const easeOutQuint: [number, number, number, number] = [0.22, 1, 0.36, 1]

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutQuint },
  },
}

export default function SkeletonLoader() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          // Mirror the bento layout: first slot spans two cols on md+
          className={`relative rounded-2xl overflow-hidden glass-card border border-white/5 ${
            i === 0 ? 'md:col-span-2' : ''
          }`}
        >
          {/* Top accent bar */}
          <div className="h-0.5 card-shimmer" />

          <div className="p-5 pt-8 space-y-4">
            {/* Teams row */}
            <div className="flex items-center justify-between gap-4">
              {/* Away team */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full card-shimmer" style={{ width: 52, height: 52 }} />
                <div className="w-16 h-3 rounded card-shimmer" />
                <div className="w-12 h-4 rounded card-shimmer" />
              </div>

              {/* Center — score orb + tier pill */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-16 h-16 rounded-full card-shimmer" />
                <div className="w-24 h-5 rounded-full card-shimmer" />
                <div className="w-16 h-3 rounded card-shimmer" />
              </div>

              {/* Home team */}
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full card-shimmer" style={{ width: 52, height: 52 }} />
                <div className="w-16 h-3 rounded card-shimmer" />
                <div className="w-12 h-4 rounded card-shimmer" />
              </div>
            </div>

            <div className="border-t border-white/5" />

            {/* Tags */}
            <div className="flex gap-2">
              <div className="w-24 h-6 rounded-full card-shimmer" />
              <div className="w-20 h-6 rounded-full card-shimmer" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="w-16 h-8 rounded-lg card-shimmer" />
              <div className="flex gap-2">
                <div className="w-24 h-8 rounded-lg card-shimmer" />
                <div className="w-28 h-8 rounded-lg card-shimmer" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
