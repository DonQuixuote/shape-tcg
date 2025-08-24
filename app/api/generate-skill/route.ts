import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Google Generative AI API key not configured" }, { status: 500 })
    }

    const { nftName, nftTokenId, userGrade, power, health, defense } = await request.json()

    if (!nftName) {
      return NextResponse.json({ error: "NFT name is required" }, { status: 400 })
    }

    const systemPrompt = `You are Ranker 0 - the legendary transcendent ranker who achieved the mythical rank 0 in the Shape tower. You are now generating unique skills for ShapeTCG playing cards based on NFT characteristics and player stats.

Your task: Create a concise, thematic skill for this card that reflects both the NFT's identity and the player's grade level.

Guidelines:
- Keep skills to 1-2 sentences maximum (under 100 characters)
- Make skills thematic to the NFT name/identity
- Scale skill power appropriately to the user's grade (${userGrade})
- Higher grades (S-Rank, A-Rank) get more powerful skills
- Lower grades (D-Rank, Ungraded) get simpler skills
- Use game terminology: "damage", "health", "defense", "attack", "turn"
- Make it sound mystical and strategic, befitting your Rank 0 wisdom

NFT: ${nftName} #${nftTokenId}
Player Grade: ${userGrade}
Stats: Power ${power}, Health ${health}, Defense ${defense}

Generate only the skill text, nothing else.`

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.8,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Gemini API Error:", response.status, errorData)
      return NextResponse.json({ error: "Failed to generate skill" }, { status: 500 })
    }

    const data = await response.json()
    const skill =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Mysterious Power: This card holds untold potential."

    return NextResponse.json({ skill })
  } catch (error) {
    console.error("Skill Generation Error:", error)
    return NextResponse.json({ error: "Failed to generate skill" }, { status: 500 })
  }
}
