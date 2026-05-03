import { motion } from 'framer-motion'
import GameCard from './GameCard'
import { Game } from '../types/game'

interface GameGridProps {
  games: Game[]
  spoilersVisible: boolean
  timezone: string
}

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function GameGrid({ games, spoilersVisible, timezone }: GameGridProps) {
  // Bento: the top-ranked completed game gets a 2-col hero spot. Live and
  // scheduled games never qualify (the badge is hidden anyway, so the extra
  // real-estate would just look empty). If no game qualifies, we fall back
  // to a uniform grid.
  const heroIdx = games.findIndex(g => g.status === 'completed')

  return (
    <motion.div
      key={games.map(g => g.id).join('|')}     // re-stagger when day changes
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr"
    >
      {games.map((game, index) => {
        const isHero = index === heroIdx
        return (
          <motion.div
            key={game.id}
            variants={itemVariants}
            className={isHero ? 'md:col-span-2' : ''}
          >
            <GameCard
              game={game}
              globalSpoilerVisible={spoilersVisible}
              rank={index + 1}
              timezone={timezone}
              featured={isHero}
            />
          </motion.div>
        )
      })}
    </motion.div>
  )
}
