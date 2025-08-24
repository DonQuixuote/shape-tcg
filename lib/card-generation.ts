export interface PlayingCard {
  id: string
  nftTokenId: string
  nftContractAddress: string
  nftName: string
  nftImage: string
  processedImage?: ProcessedImage
  backgroundTheme?: string
  grade: string
  power: number
  health: number
  defense: number
  skill: string // Added skill property for AI-generated skills
  isHolographic: boolean // Added holographic property for special card effects
  createdAt: Date
  ownerAddress: string
}

export interface NFTData {
  tokenId: string
  contractAddress: string
  name: string
  image: string
}

import { processNFTImage, type ProcessedImage } from "./image-processing"

const GRADE_MULTIPLIERS = {
  "S-Rank": { power: 1.1, health: 1.1, defense: 1.1 }, // +10% boost
  "A-Rank": { power: 1.075, health: 1.075, defense: 1.075 }, // +7.5% boost
  "B-Rank": { power: 1.05, health: 1.05, defense: 1.05 }, // +5% boost
  "C-Rank": { power: 1.025, health: 1.025, defense: 1.025 }, // +2.5% boost
  "D-Rank": { power: 1.0, health: 1.0, defense: 1.0 }, // No boost
  Ungraded: { power: 1.0, health: 1.0, defense: 1.0 }, // No boost
}

function generateBaseStats(
  tokenId: string,
  contractAddress: string,
): { power: number; health: number; defense: number } {
  const seed1 = Number.parseInt(tokenId) || 1
  const seed2 = contractAddress
    .slice(-8)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)

  const power = (seed1 * 7) % 11 // Range: 0-10 ATK
  const health = 1 + ((seed2 * 11) % 30) // Range: 1-30 HP
  const defense = ((seed1 + seed2) * 13) % 11 // Range: 0-10 DEF

  return { power, health, defense }
}

async function generateCardSkill(
  nftData: NFTData,
  userGrade: string,
  stats: { power: number; health: number; defense: number },
): Promise<string> {
  try {
    const response = await fetch("/api/generate-skill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nftName: nftData.name,
        nftTokenId: nftData.tokenId,
        userGrade,
        power: stats.power,
        health: stats.health,
        defense: stats.defense,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate skill")
    }

    const data = await response.json()
    return data.skill || "Mysterious Power: This card holds untold potential."
  } catch (error) {
    console.error("Error generating skill:", error)
    // Fallback to a generic skill based on stats
    if (stats.power > stats.health && stats.power > stats.defense) {
      return "Overwhelming Force: Deal extra damage when attacking."
    } else if (stats.health > stats.power && stats.health > stats.defense) {
      return "Resilient Spirit: Recover health when taking damage."
    } else {
      return "Defensive Stance: Reduce incoming damage by 1."
    }
  }
}

export async function generatePlayingCard(
  nftData: NFTData,
  userGrade: string,
  ownerAddress: string,
): Promise<PlayingCard> {
  const baseStats = generateBaseStats(nftData.tokenId, nftData.contractAddress)

  const multiplier = GRADE_MULTIPLIERS[userGrade as keyof typeof GRADE_MULTIPLIERS] || GRADE_MULTIPLIERS["Ungraded"]

  const power = Math.floor(baseStats.power * multiplier.power)
  const health = Math.floor(baseStats.health * multiplier.health)
  const defense = Math.floor(baseStats.defense * multiplier.defense)

  // Process the NFT image with random background generation
  const processedImage = await processNFTImage(nftData.image)

  const skill = await generateCardSkill(nftData, userGrade, { power, health, defense })

  const isHolographic = Math.random() < 0.1

  return {
    id: `card_${nftData.contractAddress}_${nftData.tokenId}_${Date.now()}`,
    nftTokenId: nftData.tokenId,
    nftContractAddress: nftData.contractAddress,
    nftName: nftData.name,
    nftImage: nftData.image,
    processedImage,
    grade: userGrade,
    power,
    health,
    defense,
    skill,
    isHolographic, // Include holographic property
    createdAt: new Date(),
    ownerAddress,
  }
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "S-Rank":
      return "text-red-500"
    case "A-Rank":
      return "text-orange-500"
    case "B-Rank":
      return "text-yellow-500"
    case "C-Rank":
      return "text-green-500"
    case "D-Rank":
      return "text-blue-500"
    case "Ungraded":
      return "text-gray-500"
    default:
      return "text-gray-500"
  }
}
