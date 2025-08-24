export interface ProcessedImage {
  originalUrl: string
  processedUrl: string
  backgroundUrl?: string
  hasTransparentBackground: boolean
  backgroundRarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

function getRandomBackgroundRarity(): "common" | "uncommon" | "rare" | "epic" | "legendary" {
  const rarities = ["common", "uncommon", "rare", "epic", "legendary"] as const
  const weights = [40, 30, 20, 8, 2] // Same probability distribution but no visual theming
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < rarities.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return rarities[i]
    }
  }

  return "common"
}

export function generateCardBackground(): {
  backgroundUrl: string
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
} {
  const rarity = getRandomBackgroundRarity()

  // Return empty background URL since we don't want visual background effects
  return { backgroundUrl: "", rarity }
}

export async function processNFTImage(imageUrl: string, backgroundTheme?: string): Promise<ProcessedImage> {
  try {
    console.log("[v0] Processing NFT image:", imageUrl)

    const processedUrl = imageUrl
    const { rarity } = generateCardBackground()

    console.log("[v0] Successfully processed NFT image")

    return {
      originalUrl: imageUrl,
      processedUrl,
      backgroundUrl: "", // No background URL since we're not generating themed backgrounds
      hasTransparentBackground: false,
      backgroundRarity: rarity,
    }
  } catch (error) {
    console.error("[v0] Error processing NFT image:", error)
    // Return original image if processing fails
    return {
      originalUrl: imageUrl,
      processedUrl: imageUrl,
      hasTransparentBackground: false,
    }
  }
}
