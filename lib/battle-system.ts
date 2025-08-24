import { fetchLeaderboard } from "@/lib/leaderboard"
import { generatePlayingCard, type PlayingCard, type NFTData } from "@/lib/card-generation"

export interface AIOpponent {
  username: string
  address: string
  cards: PlayingCard[]
}

export async function getRandomOpponent(): Promise<string> {
  try {
    const leaderboard = await fetchLeaderboard()
    if (leaderboard.length === 0) {
      // Fallback names if leaderboard fails
      const fallbackNames = ["CryptoWarrior", "NFTMaster", "ShapeChampion", "BlockchainHero", "DigitalLegend"]
      return fallbackNames[Math.floor(Math.random() * fallbackNames.length)]
    }

    const top50Players = leaderboard.slice(0, 50)
    const randomIndex = Math.floor(Math.random() * top50Players.length)
    return top50Players[randomIndex].username
  } catch (error) {
    console.error("Error getting random opponent:", error)
    return "Anonymous Challenger"
  }
}

export async function generateAIOpponentCards(opponentName: string, maxCards = 3): Promise<PlayingCard[]> {
  try {
    // Use Alchemy API to get random NFTs from our contracts
    const contractAddresses = [
      "0xdad1276ecd6d27116da400b33c81ce49d91d5831",
      "0xf2e4b2a15872a20d0ffb336a89b94ba782ce9ba5",
      "0xadede2a59b46ef9815e349464ea14d40195d4a2b",
      "0x72fe3c398c9a030b9b2be1fe1ff07701167571d4",
      "0xba86baef2396e39d880bb4b4b751b99956ab9351",
    ]

    const cards: PlayingCard[] = []

    // Generate exactly maxCards (3) cards using random NFTs from contracts
    for (let i = 0; i < maxCards; i++) {
      try {
        // Pick a random contract
        const randomContract = contractAddresses[Math.floor(Math.random() * contractAddresses.length)]

        // Generate random token ID (most NFT collections have tokens in 1-10000 range)
        const randomTokenId = Math.floor(Math.random() * 10000) + 1

        const nftData: NFTData = {
          tokenId: randomTokenId.toString(),
          contractAddress: randomContract,
          name: `${opponentName}'s NFT #${randomTokenId}`,
          // Use shapescan to get NFT image
          image: `https://shapescan.xyz/nft/${randomContract}/${randomTokenId}/image`,
        }

        // Generate card with random grade for AI opponent
        const grades = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"]
        const randomGrade = grades[Math.floor(Math.random() * grades.length)]

        const card = await generatePlayingCard(nftData, randomGrade, "ai-opponent")
        cards.push(card)
      } catch (error) {
        console.error(`Error generating AI card ${i}:`, error)
        // Fallback to mock card if NFT generation fails
        const mockCard = generateMockCard(opponentName, i)
        cards.push(mockCard)
      }
    }

    return cards
  } catch (error) {
    console.error("Error generating AI opponent cards:", error)
    return generateMockCards(opponentName, maxCards)
  }
}

function generateMockCard(opponentName: string, index: number): PlayingCard {
  return {
    id: `ai-${opponentName}-${index}`,
    nftData: {
      tokenId: `mock-${index}`,
      contractAddress: "0x0000000000000000000000000000000000000000",
      name: `${opponentName}'s Champion #${index + 1}`,
      image: `/placeholder.svg?height=300&width=300&query=fantasy warrior ${index + 1}`,
    },
    owner: "ai-opponent",
    power: Math.floor(Math.random() * 11), // 0-10 ATK range
    health: Math.floor(Math.random() * 30) + 1, // 1-30 HP range
    defense: Math.floor(Math.random() * 11), // 0-10 DEF range
    skill: `${opponentName}'s special ability that enhances combat effectiveness`,
    rarity: ["Common", "Rare", "Epic", "Legendary"][Math.floor(Math.random() * 4)] as any,
    isHolographic: Math.random() < 0.1,
    createdAt: new Date().toISOString(),
  }
}

function generateMockCards(opponentName: string, count: number): PlayingCard[] {
  const mockCards: PlayingCard[] = []
  for (let i = 0; i < count; i++) {
    mockCards.push(generateMockCard(opponentName, i))
  }
  return mockCards
}

// Battle gameplay mechanics implementation
export interface BattleState {
  playerCards: PlayingCard[]
  opponentCards: PlayingCard[]
  currentRound: number
  playerSelectedCard: PlayingCard | null
  opponentSelectedCard: PlayingCard | null
  battleLog: string[]
  gamePhase: "selection" | "combat" | "ended"
  winner: "player" | "opponent" | null
}

export function initializeBattle(playerCards: PlayingCard[], opponentCards: PlayingCard[]): BattleState {
  return {
    playerCards: [...playerCards],
    opponentCards: [...opponentCards],
    currentRound: 1,
    playerSelectedCard: null,
    opponentSelectedCard: null,
    battleLog: [],
    gamePhase: "selection",
    winner: null,
  }
}

export function selectCard(battleState: BattleState, card: PlayingCard, isPlayer: boolean): BattleState {
  const newState = { ...battleState }

  if (isPlayer) {
    newState.playerSelectedCard = card
  } else {
    newState.opponentSelectedCard = card
  }

  // If both cards selected, move to combat phase
  if (newState.playerSelectedCard && newState.opponentSelectedCard) {
    newState.gamePhase = "combat"
  }

  return newState
}

export function resolveCombat(battleState: BattleState): BattleState {
  if (!battleState.playerSelectedCard || !battleState.opponentSelectedCard) {
    return battleState
  }

  const newState = { ...battleState }
  const playerCard = { ...battleState.playerSelectedCard }
  const opponentCard = { ...battleState.opponentSelectedCard }

  // Calculate damage: ATK - DEF (minimum 0)
  const playerDamage = Math.max(0, playerCard.power - opponentCard.defense)
  const opponentDamage = Math.max(0, opponentCard.power - playerCard.defense)

  // Apply damage
  playerCard.health -= opponentDamage
  opponentCard.health -= playerDamage

  // Update battle log
  newState.battleLog.push(
    `Round ${newState.currentRound}: ${playerCard.nftData.name} (ATK ${playerCard.power}) vs ${opponentCard.nftData.name} (ATK ${opponentCard.power})`,
  )
  newState.battleLog.push(
    `${playerCard.nftData.name} deals ${playerDamage} damage, ${opponentCard.nftData.name} deals ${opponentDamage} damage`,
  )

  // Remove eliminated cards
  if (playerCard.health <= 0) {
    newState.playerCards = newState.playerCards.filter((c) => c.id !== playerCard.id)
    newState.battleLog.push(`${playerCard.nftData.name} has been eliminated!`)
  } else {
    // Update card in player's hand
    const cardIndex = newState.playerCards.findIndex((c) => c.id === playerCard.id)
    if (cardIndex !== -1) {
      newState.playerCards[cardIndex] = playerCard
    }
  }

  if (opponentCard.health <= 0) {
    newState.opponentCards = newState.opponentCards.filter((c) => c.id !== opponentCard.id)
    newState.battleLog.push(`${opponentCard.nftData.name} has been eliminated!`)
  } else {
    // Update card in opponent's hand
    const cardIndex = newState.opponentCards.findIndex((c) => c.id === opponentCard.id)
    if (cardIndex !== -1) {
      newState.opponentCards[cardIndex] = opponentCard
    }
  }

  // Check win conditions
  if (newState.playerCards.length === 0) {
    newState.winner = "opponent"
    newState.gamePhase = "ended"
    newState.battleLog.push("Opponent wins! All your cards have been eliminated.")
  } else if (newState.opponentCards.length === 0) {
    newState.winner = "player"
    newState.gamePhase = "ended"
    newState.battleLog.push("Victory! You have eliminated all opponent cards!")
  } else {
    // Continue to next round
    newState.currentRound += 1
    newState.gamePhase = "selection"
    newState.playerSelectedCard = null
    newState.opponentSelectedCard = null
  }

  return newState
}

export function getAICardSelection(opponentCards: PlayingCard[]): PlayingCard {
  // Simple AI: randomly select from available cards
  const randomIndex = Math.floor(Math.random() * opponentCards.length)
  return opponentCards[randomIndex]
}
