import { type NextRequest, NextResponse } from "next/server"
import type { PlayingCard } from "@/lib/card-generation"

export async function POST(request: NextRequest) {
  try {
    const { cards, walletAddress } = await request.json()

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: "Cards array is required" }, { status: 400 })
    }

    const analysis = analyzeCardCollection(cards, walletAddress)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Card Analysis Error:", error)
    return NextResponse.json({ error: "Failed to analyze cards" }, { status: 500 })
  }
}

function analyzeCardCollection(cards: PlayingCard[], walletAddress?: string) {
  if (cards.length === 0) {
    return {
      summary: "No cards in collection",
      recommendations: ["Generate some cards from your NFTs to start building decks!"],
      stats: { total: 0, avgAttack: 0, avgDefense: 0, avgHealth: 0 },
    }
  }

  const stats = {
    total: cards.length,
    avgAttack: Math.round(cards.reduce((sum, card) => sum + card.attack, 0) / cards.length),
    avgDefense: Math.round(cards.reduce((sum, card) => sum + card.defense, 0) / cards.length),
    avgHealth: Math.round(cards.reduce((sum, card) => sum + card.health, 0) / cards.length),
    holographic: cards.filter((card) => card.holographic).length,
    grades: cards.reduce(
      (acc, card) => {
        acc[card.grade] = (acc[card.grade] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
  }

  const recommendations = generateRecommendations(cards, stats)

  const bestDecks = findOptimalDecks(cards)

  return {
    summary: `Collection of ${stats.total} cards with ${stats.holographic} holographic cards`,
    stats,
    recommendations,
    bestDecks,
    topCards: cards
      .sort((a, b) => b.attack + b.defense + b.health - (a.attack + a.defense + a.health))
      .slice(0, 5)
      .map((card) => ({
        name: card.nftName,
        attack: card.attack,
        defense: card.defense,
        health: card.health,
        grade: card.grade,
        holographic: card.holographic,
      })),
  }
}

function generateRecommendations(cards: PlayingCard[], stats: any): string[] {
  const recommendations = []

  if (stats.avgAttack < 5) {
    recommendations.push("Consider generating more cards to find higher attack options for aggressive strategies")
  }

  if (stats.avgDefense < 4) {
    recommendations.push("Look for cards with better defense to create tanky, sustainable decks")
  }

  if (stats.holographic === 0) {
    recommendations.push("Keep generating cards - holographic cards have enhanced stats and special effects!")
  }

  if (stats.total < 6) {
    recommendations.push("Build up your collection to have more deck building options - aim for at least 6-9 cards")
  }

  const highGradeCards = Object.entries(stats.grades)
    .filter(([grade]) => ["S", "A"].includes(grade))
    .reduce((sum, [, count]) => sum + count, 0)

  if (highGradeCards < 2) {
    recommendations.push("Focus on generating S and A grade cards for maximum competitive advantage")
  }

  return recommendations
}

function findOptimalDecks(cards: PlayingCard[]): Array<{ name: string; cards: string[]; strategy: string }> {
  if (cards.length < 3) {
    return [
      {
        name: "Starter Deck",
        cards: cards.map((c) => c.nftName),
        strategy: "Generate more cards to build complete 3-card decks",
      },
    ]
  }

  const decks = []

  const aggressiveCards = cards.sort((a, b) => b.attack - a.attack).slice(0, 3)

  decks.push({
    name: "Aggressive Rush",
    cards: aggressiveCards.map((c) => c.nftName),
    strategy: "High attack cards for quick eliminations. Focus on dealing maximum damage early.",
  })

  const defensiveCards = cards.sort((a, b) => b.defense + b.health - (a.defense + a.health)).slice(0, 3)

  decks.push({
    name: "Tank Defense",
    cards: defensiveCards.map((c) => c.nftName),
    strategy: "High defense and health for sustained battles. Outlast opponents through durability.",
  })

  const balancedCards = cards
    .sort((a, b) => b.attack + b.defense + b.health - (a.attack + a.defense + a.health))
    .slice(0, 3)

  decks.push({
    name: "Balanced Core",
    cards: balancedCards.map((c) => c.nftName),
    strategy: "Well-rounded stats for versatile gameplay. Adapts to different opponent strategies.",
  })

  return decks.slice(0, 3) // Return top 3 deck recommendations
}
