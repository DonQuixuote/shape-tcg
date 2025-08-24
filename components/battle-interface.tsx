"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sword, X, Clock } from "lucide-react"
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
  const [timeLeft, setTimeLeft] = useState(30)
  const [isAttacking, setIsAttacking] = useState(false)
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
  const [battleTimeLeft, setBattleTimeLeft] = useState(180) // 3 minutes in seconds
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (battleState.phase === "card-selection" && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (battleState.phase === "card-selection" && timeLeft === 0) {
      const availableCards = battleState.playerBattleCards.filter((c) => c.currentHP > 0)
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)]
        selectPlayerCard(randomCard)
      }
    }
    return () => clearTimeout(timer)
  }, [timeLeft, battleState.phase])

  useEffect(() => {
    if (battleState.phase === "card-selection") {
      setTimeLeft(30)
    }
  }, [battleState.turn, battleState.phase])

  useEffect(() => {
    let battleTimer: NodeJS.Timeout
    if (battleStarted && battleState.phase !== "result" && battleTimeLeft > 0) {
      battleTimer = setTimeout(() => setBattleTimeLeft(battleTimeLeft - 1), 1000)
    } else if (battleStarted && battleTimeLeft === 0 && battleState.phase !== "result") {
      // Time's up - determine winner by total health
      endBattleByTime()
    }
    return () => clearTimeout(battleTimer)
  }, [battleTimeLeft, battleStarted, battleState.phase])

  useEffect(() => {
    if (battleStarted && audioRef.current) {
      audioRef.current.play().catch(console.error)
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [battleStarted])

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

    const availableAICards = battleState.aiBattleCards.filter((c) => c.currentHP > 0)
    const aiCard = availableAICards[Math.floor(Math.random() * availableAICards.length)]

    setBattleState((prev) => ({
      ...prev,
      playerSelectedCard: card,
      aiSelectedCard: aiCard,
      phase: "combat",
    }))

    setIsAttacking(true)
    setTimeout(() => {
      setIsAttacking(false)
      resolveCombat(card, aiCard)
    }, 2500)
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
      `Turn ${battleState.turn}: ${playerCard.name || "Your Card"} attacks ${aiCard.name || "Enemy Card"} for ${playerDamage} damage!`,
      `${aiCard.name || "Enemy Card"} counter-attacks ${playerCard.name || "Your Card"} for ${aiDamage} damage!`,
    ]

    if (newPlayerHP <= 0) combatLog.push(`💀 ${playerCard.name || "Your Card"} is defeated!`)
    if (newAIHP <= 0) combatLog.push(`💀 ${aiCard.name || "Enemy Card"} is defeated!`)

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
    } else if (battleTimeLeft <= 0) {
      // Check time-based win condition
      const playerTotalHealth = updatedPlayerCards.reduce((sum, card) => sum + card.currentHP, 0)
      const aiTotalHealth = updatedAICards.reduce((sum, card) => sum + card.currentHP, 0)

      if (playerTotalHealth >= aiTotalHealth) {
        winner = "player"
        combatLog.push("Time's up! You win with higher total health!")
      } else {
        winner = "ai"
        combatLog.push(`Time's up! ${opponent?.username} wins with higher total health!`)
      }
      phase = "result"
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

  const endBattleByTime = () => {
    const playerTotalHealth = battleState.playerBattleCards.reduce((sum, card) => sum + card.currentHP, 0)
    const aiTotalHealth = battleState.aiBattleCards.reduce((sum, card) => sum + card.currentHP, 0)

    let winner: "player" | "ai"
    let winMessage: string

    if (playerTotalHealth > aiTotalHealth) {
      winner = "player"
      winMessage = "Time's up! You win with higher total health!"
    } else if (aiTotalHealth > playerTotalHealth) {
      winner = "ai"
      winMessage = `Time's up! ${opponent?.username} wins with higher total health!`
    } else {
      winner = "player" // Tie goes to player
      winMessage = "Time's up! It's a tie - you both survive!"
    }

    setBattleState((prev) => ({
      ...prev,
      phase: "result",
      winner,
      combatLog: [...prev.combatLog, winMessage],
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
      <audio ref={audioRef} loop>
        <source
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Faceless%20Beast%20%20Epic%2C%20Intense%2C%20Horror%20Music-JiAKJx2TSDrfYEYU6EUUvSF2MSovWB.mp3"
          type="audio/mpeg"
        />
      </audio>

      <Card className="w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-playfair font-semibold">Battle Arena - Turn {battleState.turn}</h2>
            <div className="flex items-center gap-4">
              {battleStarted && battleState.phase !== "result" && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  <span className={battleTimeLeft <= 30 ? "text-red-500" : "text-gray-700"}>
                    Battle: {Math.floor(battleTimeLeft / 60)}:{(battleTimeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              )}
              {battleState.phase === "card-selection" && (
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  <span className={timeLeft <= 10 ? "text-red-500" : "text-gray-700"}>
                    Select a card... {timeLeft}s
                  </span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative min-h-[800px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg p-12 overflow-hidden">
            <div className="absolute top-4 left-4 z-20">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <h3 className="text-white font-semibold text-lg">{opponent.username}</h3>
              </div>
            </div>

            <div className="absolute inset-x-0 top-1/2 h-px bg-white/20 transform -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-black rounded-full border-2 border-white/30 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <Sword className={`h-10 w-10 text-white ${isAttacking ? "animate-pulse" : ""}`} />
            </div>

            {isAttacking && (
              <>
                <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-red-500/20 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
                <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-orange-500/10 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
              </>
            )}

            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
              <div className="flex justify-center gap-2">
                {battleState.aiBattleCards.map((card, index) => (
                  <div
                    key={card.id}
                    className={`relative transition-all duration-500 ${
                      battleState.aiSelectedCard?.id === card.id ? "transform translate-y-6 scale-110" : ""
                    } ${card.currentHP <= 0 ? "opacity-30 grayscale" : ""} ${
                      isAttacking && battleState.aiSelectedCard?.id === card.id ? "animate-bounce" : ""
                    }`}
                    style={{
                      transform:
                        battleState.aiSelectedCard?.id === card.id
                          ? "translateY(6rem) scale(1.1)"
                          : "translateY(-8rem)",
                      zIndex: battleState.aiSelectedCard?.id === card.id ? 10 : 1,
                    }}
                  >
                    <div className="scale-65 origin-center rotate-180">
                      <PlayingCard card={card} />
                      {card.currentHP < card.health && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full border border-white rotate-180">
                          {card.currentHP}/{card.health} HP
                        </div>
                      )}
                      {card.currentHP <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <span className="text-red-400 font-bold text-lg rotate-180">DEFEATED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
              <div className="flex justify-center gap-2">
                {battleState.playerBattleCards.map((card, index) => (
                  <button
                    key={card.id}
                    onClick={() => selectPlayerCard(card)}
                    disabled={battleState.phase !== "card-selection" || card.currentHP <= 0}
                    className={`relative transition-all duration-500 ${
                      battleState.playerSelectedCard?.id === card.id ? "transform -translate-y-6 scale-110" : ""
                    } ${card.currentHP <= 0 ? "opacity-30 grayscale cursor-not-allowed" : "hover:scale-105 cursor-pointer"} ${
                      isAttacking && battleState.playerSelectedCard?.id === card.id ? "animate-bounce" : ""
                    }`}
                    style={{
                      transform:
                        battleState.playerSelectedCard?.id === card.id
                          ? "translateY(-6rem) scale(1.1)"
                          : "translateY(10rem)",
                      zIndex: battleState.playerSelectedCard?.id === card.id ? 10 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (card.currentHP > 0 && battleState.phase === "card-selection") {
                        e.currentTarget.style.transform = "translateY(2rem) scale(1.05)"
                        e.currentTarget.style.zIndex = "5"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (battleState.playerSelectedCard?.id !== card.id) {
                        e.currentTarget.style.transform = "translateY(10rem)"
                        e.currentTarget.style.zIndex = "1"
                      }
                    }}
                  >
                    <div className="scale-65 origin-center">
                      <PlayingCard card={card} />
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

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-16 text-center">
              {battleState.phase === "card-selection" && (
                <Badge variant="outline" className="text-white border-white text-base px-4 py-2">
                  Choose your card to battle!
                </Badge>
              )}
              {battleState.phase === "combat" && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-base px-4 py-2">
                  ⚔️ Cards are attacking! ⚔️
                </Badge>
              )}
              {battleState.phase === "result" && (
                <Badge
                  variant="outline"
                  className={`text-base px-4 py-2 ${
                    battleState.winner === "player" ? "text-green-400 border-green-400" : "text-red-400 border-red-400"
                  }`}
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
