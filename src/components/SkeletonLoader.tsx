export default function SkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden bg-bg-card border border-white/5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {/* Top accent bar skeleton */}
          <div className="h-0.5 card-shimmer" />

          <div className="p-5 pt-8 space-y-4">
            {/* Teams row */}
            <div className="flex items-center justify-between gap-4">
              {/* Away team */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-13 h-13 rounded-full card-shimmer" style={{ width: 52, height: 52 }} />
                <div className="w-16 h-3 rounded card-shimmer" />
                <div className="w-12 h-4 rounded card-shimmer" />
              </div>

              {/* Center */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div className="w-16 h-16 rounded-full card-shimmer" />
                <div className="w-24 h-5 rounded-full card-shimmer" />
                <div className="w-16 h-3 rounded card-shimmer" />
              </div>

              {/* Home team */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-13 h-13 rounded-full card-shimmer" style={{ width: 52, height: 52 }} />
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
        </div>
      ))}
    </div>
  )
}
