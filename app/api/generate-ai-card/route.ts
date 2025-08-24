import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Google Generative AI API key not configured" }, { status: 500 })
    }

    const { userGrade, ownerAddress, cardName, cardTheme } = await request.json()

    if (!ownerAddress) {
      return NextResponse.json({ error: "Owner address is required" }, { status: 400 })
    }

    // Generate AI card with weaker stats than NFT cards
    const baseStats = generateWeakerAIStats()

    // Apply grade multipliers (same as NFT cards)
    const multiplier = getGradeMultiplier(userGrade)
    const power = Math.floor(baseStats.power * multiplier.power)
    const health = Math.floor(baseStats.health * multiplier.health)
    const defense = Math.floor(baseStats.defense * multiplier.defense)

    const aiImageUrl = await generateGeminiCardImage(cardName || "Mystical Creature", cardTheme || "fantasy")

    // Generate skill description
    const skill = await generateAICardSkill(cardName || "AI Generated Card", { power, health, defense })

    // Create the AI-generated card
    const aiCard = {
      id: `ai_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nftTokenId: "AI_GENERATED",
      nftContractAddress: "AI_GENERATED",
      nftName: cardName || `AI Creature ${Math.floor(Math.random() * 1000)}`,
      nftImage: aiImageUrl,
      grade: userGrade || "D-Rank",
      power,
      health,
      defense,
      skill,
      isHolographic: Math.random() < 0.05, // 5% chance for AI cards (lower than NFT cards)
      createdAt: new Date(),
      ownerAddress,
    }

    // Return the card data for client-side saving instead
    console.log(`[v0] Successfully generated AI card: ${aiCard.nftName}`)

    return NextResponse.json({
      success: true,
      card: aiCard,
      message: "AI card generated and ready to be added to your collection!",
    })
  } catch (error) {
    console.error("AI Card Generation Error:", error)
    return NextResponse.json({ error: "Failed to generate AI card" }, { status: 500 })
  }
}

function generateWeakerAIStats(): { power: number; health: number; defense: number } {
  // AI cards have 20% lower base stats than NFT cards
  const power = Math.floor(Math.random() * 8) // Range: 0-7 (vs 0-10 for NFT)
  const health = 1 + Math.floor(Math.random() * 20) // Range: 1-20 (vs 1-30 for NFT)
  const defense = Math.floor(Math.random() * 8) // Range: 0-7 (vs 0-10 for NFT)

  return { power, health, defense }
}

function getGradeMultiplier(grade: string) {
  const multipliers = {
    "S-Rank": { power: 1.1, health: 1.1, defense: 1.1 },
    "A-Rank": { power: 1.075, health: 1.075, defense: 1.075 },
    "B-Rank": { power: 1.05, health: 1.05, defense: 1.05 },
    "C-Rank": { power: 1.025, health: 1.025, defense: 1.025 },
    "D-Rank": { power: 1.0, health: 1.0, defense: 1.0 },
    Ungraded: { power: 1.0, health: 1.0, defense: 1.0 },
  }
  return multipliers[grade as keyof typeof multipliers] || multipliers["Ungraded"]
}

async function generateGeminiCardImage(cardName: string, theme: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const themes = {
      fantasy: "mystical fantasy creature with magical aura, glowing eyes, ethereal background",
      dragon: "powerful dragon with iridescent scales and wings, breathing elemental energy",
      warrior: "armored warrior with enchanted weapon and shield, battle-ready stance",
      mage: "magical spellcaster with flowing robes and glowing staff, arcane symbols",
      beast: "wild creature with natural powers, fierce expression, nature background",
      elemental: "elemental being of fire, water, earth or air, swirling energy effects",
    }

    const selectedTheme = themes[theme as keyof typeof themes] || themes.fantasy
    const prompt = `Create a detailed trading card game artwork of ${cardName}, ${selectedTheme}. Style: digital art, fantasy illustration, vibrant colors, card game aesthetic, centered composition, high quality, detailed shading`

    const response = await model.generateContent(
      `Generate a detailed visual description for a trading card artwork featuring: ${prompt}. Describe the creature's appearance, colors, pose, background, and artistic style in vivid detail.`,
    )

    const description = response.response.text()

    // For now, use enhanced placeholder with the AI-generated description
    // In production, this description could be sent to DALL-E, Midjourney, or Stable Diffusion
    const encodedDescription = encodeURIComponent(description.substring(0, 200))
    return `/placeholder.svg?height=400&width=300&query=${encodedDescription}`
  } catch (error) {
    console.error("Gemini image generation error:", error)
    // Fallback to original placeholder method
    return generateFallbackImage(cardName, theme)
  }
}

function generateFallbackImage(cardName: string, theme: string): string {
  const themes = {
    fantasy: "mystical fantasy creature with magical aura",
    dragon: "powerful dragon with scales and wings",
    warrior: "armored warrior with weapon and shield",
    mage: "magical spellcaster with robes and staff",
    beast: "wild creature with natural powers",
    elemental: "elemental being of fire, water, earth or air",
  }

  const selectedTheme = themes[theme as keyof typeof themes] || themes.fantasy
  const query = `${selectedTheme}, trading card game art style, detailed illustration`

  return `/placeholder.svg?height=400&width=300&query=${encodeURIComponent(query)}`
}

async function generateAICardSkill(
  cardName: string,
  stats: { power: number; health: number; defense: number },
): Promise<string> {
  const skillTemplates = [
    "Mystical Aura: Gains +1 defense when health is below 50%",
    "Swift Strike: Deal +1 damage when attacking first",
    "Regeneration: Recover 1 health at the start of each turn",
    "Shield Wall: Reduce all incoming damage by 1",
    "Berserker Rage: Gain +2 attack when health is below 25%",
    "Elemental Ward: Immune to the first damage each battle",
    "Battle Fury: Deal +1 damage for each defeated enemy card",
    "Defensive Stance: Take -1 damage from all sources",
    "Quick Reflexes: Cannot be targeted by skills on first turn",
    "Ancient Power: All stats +1 when facing higher grade opponents",
  ]

  return skillTemplates[Math.floor(Math.random() * skillTemplates.length)]
}
