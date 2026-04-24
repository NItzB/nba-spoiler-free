import GameCard from './GameCard'
import { Game } from '../types/game'

interface GameGridProps {
  games: Game[]
  spoilersVisible: boolean
  timezone: string
}

export default function GameGrid({ games, spoilersVisible, timezone }: GameGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {games.map((game, index) => (
        <GameCard
          key={game.id}
          game={game}
          globalSpoilerVisible={spoilersVisible}
          rank={index + 1}
          timezone={timezone}
        />
      ))}
    </div>
  )
}
