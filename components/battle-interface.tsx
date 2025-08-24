"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sword, X } from "lucide-react"
import { getRandomOpponent, generateAIOpponentCards, type AIOpponent } from "@/lib/battle-system"
import { PlayingCard } from "@/components/playing-card"
import type { PlayingCard as CardType } from "@/lib/card-generation"

interface BattleInterfaceProps {
  playerCards: CardType[]
  onClose: () => void
}

type BattlePhase = "setup" | "card-selection" | "combat" | "result"
type BattleCard = CardType & { currentHP: number }

interface BattleState {
  phase: BattlePhase
  playerSelectedCard: BattleCard | null
  aiSelectedCard: BattleCard | null
  playerBattleCards: BattleCard[]
  aiBattleCards: BattleCard[]
  turn: number
  winner: "player" | "ai" | null
  combatLog: string[]
}

export function BattleInterface({ playerCards, onClose }: BattleInterfaceProps) {
  const [opponent, setOpponent] = useState<AIOpponent | null>(null)
  const [loading, setLoading] = useState(false)
  const [battleStarted, setBattleStarted] = useState(false)
  const [battleState, setBattleState] = useState<BattleState>({
    phase: "setup",
    playerSelectedCard: null,
    aiSelectedCard: null,
    playerBattleCards: [],
    aiBattleCards: [],
    turn: 1,
    winner: null,
    combatLog: [],
  })

  const startBattle = async () => {
    setLoading(true)
    try {
      const opponentName = await getRandomOpponent()
      const opponentCards = await generateAIOpponentCards(opponentName, 3)

      setOpponent({
        username: opponentName,
        address: "ai-opponent",
        cards: opponentCards,
      })

      const playerBattleCards = playerCards.slice(0, 3).map((card) => ({
        ...card,
        currentHP: card.health,
      }))
      const aiBattleCards = opponentCards.map((card) => ({
        ...card,
        currentHP: card.health,
      }))

      setBattleState((prev) => ({
        ...prev,
        phase: "card-selection",
        playerBattleCards,
        aiBattleCards,
        combatLog: [`Battle started! Turn ${prev.turn}`],
      }))
      setBattleStarted(true)
    } catch (error) {
      console.error("Error starting battle:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectPlayerCard = (card: BattleCard) => {
    if (battleState.phase !== "card-selection" || card.currentHP <= 0) return

    // AI selects random available card
    const availableAICards = battleState.aiBattleCards.filter((c) => c.currentHP > 0)
    const aiCard = availableAICards[Math.floor(Math.random() * availableAICards.length)]

    setBattleState((prev) => ({
      ...prev,
      playerSelectedCard: card,
      aiSelectedCard: aiCard,
      phase: "combat",
    }))

    // Auto-resolve combat after selection
    setTimeout(() => resolveCombat(card, aiCard), 1000)
  }

  const resolveCombat = (playerCard: BattleCard, aiCard: BattleCard) => {
    const playerDamage = Math.max(1, playerCard.power - aiCard.defense)
    const aiDamage = Math.max(1, aiCard.power - playerCard.defense)

    const newPlayerHP = Math.max(0, playerCard.currentHP - aiDamage)
    const newAIHP = Math.max(0, aiCard.currentHP - playerDamage)

    const updatedPlayerCards = battleState.playerBattleCards.map((c) =>
      c.id === playerCard.id ? { ...c, currentHP: newPlayerHP } : c,
    )
    const updatedAICards = battleState.aiBattleCards.map((c) => (c.id === aiCard.id ? { ...c, currentHP: newAIHP } : c))

    const combatLog = [
      ...battleState.combatLog,
      `${playerCard.name} attacks ${aiCard.name} for ${playerDamage} damage!`,
      `${aiCard.name} attacks ${playerCard.name} for ${aiDamage} damage!`,
    ]

    if (newPlayerHP <= 0) combatLog.push(`${playerCard.name} is defeated!`)
    if (newAIHP <= 0) combatLog.push(`${aiCard.name} is defeated!`)

    // Check win condition
    const playerAlive = updatedPlayerCards.some((c) => c.currentHP > 0)
    const aiAlive = updatedAICards.some((c) => c.currentHP > 0)

    let winner = null
    let phase: BattlePhase = "card-selection"

    if (!playerAlive) {
      winner = "ai"
      phase = "result"
      combatLog.push(`${opponent?.username} wins the battle!`)
    } else if (!aiAlive) {
      winner = "player"
      phase = "result"
      combatLog.push("You win the battle!")
    }

    setBattleState((prev) => ({
      ...prev,
      playerBattleCards: updatedPlayerCards,
      aiBattleCards: updatedAICards,
      playerSelectedCard: null,
      aiSelectedCard: null,
      phase,
      winner,
      turn: prev.turn + 1,
      combatLog,
    }))
  }

  if (!battleStarted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-playfair font-semibold">Battle Arena</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Sword className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Ready for Battle?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You'll face a random opponent from the leaderboard with their own collection of cards.
              </p>
              <p className="text-xs text-muted-foreground">Your cards: {playerCards.length} available</p>
            </div>
            <Button onClick={startBattle} disabled={loading} className="w-full">
              {loading ? "Finding Opponent..." : "Start Battle"}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!opponent) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-playfair font-semibold">Battle Arena - Turn {battleState.turn}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative min-h-[700px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-6">
            {/* Center horizontal dividing line and circle */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/20 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-black rounded-full border-2 border-white/30 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <Sword className="h-8 w-8 text-white" />
            </div>

            {/* AI Side (Top) */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
              <h3 className="text-white font-semibold mb-4 text-center">{opponent.username}</h3>
              <div className="flex justify-center gap-3">
                {battleState.aiBattleCards.map((card, index) => (
                  <div
                    key={card.id}
                    className={`relative transition-all duration-300 ${
                      battleState.aiSelectedCard?.id === card.id ? "transform translate-y-4 scale-110" : ""
                    } ${card.currentHP <= 0 ? "opacity-30 grayscale" : ""}`}
                  >
                    <div className="scale-75 origin-center">
                      <PlayingCard card={card} />
                      {/* Health overlay */}
                      {card.currentHP < card.health && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full border border-white">
                          {card.currentHP}/{card.health} HP
                        </div>
                      )}
                      {card.currentHP <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <span className="text-red-400 font-bold text-lg">DEFEATED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Player Side (Bottom) */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-2xl">
              <h3 className="text-white font-semibold mb-4 text-center">Your Cards</h3>
              <div className="flex justify-center gap-3">
                {battleState.playerBattleCards.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => selectPlayerCard(card)}
                    disabled={battleState.phase !== "card-selection" || card.currentHP <= 0}
                    className={`relative transition-all duration-300 ${
                      battleState.playerSelectedCard?.id === card.id ? "transform -translate-y-4 scale-110" : ""
                    } ${card.currentHP <= 0 ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-105 cursor-pointer"} ${
                      battleState.phase === "card-selection" && card.currentHP > 0
                        ? "ring-2 ring-blue-400 rounded-lg"
                        : ""
                    }`}
                  >
                    <div className="scale-75 origin-center">
                      <PlayingCard card={card} />
                      {/* Health overlay */}
                      {card.currentHP < card.health && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full border border-white">
                          {card.currentHP}/{card.health} HP
                        </div>
                      )}
                      {card.currentHP <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <span className="text-red-400 font-bold text-lg">DEFEATED</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Battle Status - moved to center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-12 text-center">
              {battleState.phase === "card-selection" && (
                <Badge variant="outline" className="text-white border-white">
                  Select a card to battle!
                </Badge>
              )}
              {battleState.phase === "combat" && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  Combat in progress...
                </Badge>
              )}
              {battleState.phase === "result" && (
                <Badge
                  variant="outline"
                  className={
                    battleState.winner === "player" ? "text-green-400 border-green-400" : "text-red-400 border-red-400"
                  }
                >
                  {battleState.winner === "player" ? "Victory!" : "Defeat!"}
                </Badge>
              )}
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4 max-h-32 overflow-y-auto">
            <h4 className="font-semibold mb-2">Battle Log</h4>
            <div className="space-y-1 text-sm">
              {battleState.combatLog.slice(-5).map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Battle Actions */}
          <div className="flex justify-center gap-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Exit Battle
            </Button>
            {battleState.phase === "result" && <Button onClick={() => window.location.reload()}>New Battle</Button>}
          </div>
        </div>
      </Card>
    </div>
  )
}
