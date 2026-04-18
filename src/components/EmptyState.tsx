export default function EmptyState({ date }: { date: string }) {
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
      <div className="text-7xl mb-6 animate-float">🌙</div>
      <h2 className="text-2xl font-bold text-white mb-3">No Games Found</h2>
      <p className="text-slate-400 text-base max-w-md leading-relaxed mb-2">
        No rated games available for <span className="text-slate-200 font-semibold">{displayDate}</span>.
      </p>
      <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
        Check back after the West Coast games finish — ratings usually arrive by morning Israel time. 🏀
      </p>
      <div className="mt-10 flex gap-2 text-2xl opacity-30">
        {'🏀🏀🏀'.split('').map((c, i) => (
          <span key={i} style={{ animationDelay: `${i * 400}ms` }} className="animate-float inline-block">
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}
