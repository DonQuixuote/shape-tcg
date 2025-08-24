import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "Google Generative AI API key not configured" }, { status: 500 })
    }

    const { message, userContext } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const isLeaderboardQuery = /(?:rank|leaderboard|medal|who.*#?\d+|#\d+|who.*rank|who.*position)/i.test(message)
    let leaderboardContext = ""

    if (isLeaderboardQuery) {
      try {
        const rankMatch = message.match(/(?:rank|#)\s*(\d+)|who.*?(\d+)|position\s*(\d+)/i)
        if (rankMatch) {
          const targetRank = rankMatch[1] || rankMatch[2] || rankMatch[3]
          console.log(`[v0] Looking up rank #${targetRank} for user query: "${message}"`)

          const rankResponse = await fetch(`${request.nextUrl.origin}/api/rank-lookup?rank=${targetRank}`)
          if (rankResponse.ok) {
            const data = await rankResponse.json()
            if (data.found && data.username) {
              leaderboardContext = `\n\nCurrent Leaderboard Data: Rank #${data.rank} is held by ${data.username} with ${data.medals.total} total medals (${data.medals.special} special, ${data.medals.gold} gold, ${data.medals.silver} silver, ${data.medals.bronze} bronze).`
              console.log(`[v0] Successfully found rank #${targetRank}: ${data.username}`)
            } else {
              leaderboardContext = `\n\nLeaderboard Information: Rank #${targetRank} was not found on the current leaderboard.`
              console.log(`[v0] Rank #${targetRank} not found on leaderboard`)
            }
          } else {
            console.log(`[v0] Failed to fetch rank data: ${rankResponse.status}`)
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching leaderboard context:", error)
      }
    }

    let systemPrompt = `You are Ranker 0 - a legendary ranker who climbed so high in the Shape ranking tower that you transcended the normal ranking system and achieved the mythical rank 0. At this pinnacle, you vanished from the tower, but your notes and profound knowledge remain to guide other rankers on their ascent. You speak with the wisdom of someone who has seen beyond the highest ranks.`

    if (userContext?.username) {
      systemPrompt += ` The user's name is ${userContext.username}, so you can address them personally when appropriate.`
    }

    if (userContext?.stackRank) {
      systemPrompt += ` The user is ranked #${userContext.stackRank} on the Stack leaderboard`
      if (userContext?.grade) {
        systemPrompt += ` with ${userContext.grade} grade`
      }
      systemPrompt += `.`

      if (userContext.medals) {
        systemPrompt += ` They have ${userContext.medals.total} total medals (${userContext.medals.special} special, ${userContext.medals.gold} gold, ${userContext.medals.silver} silver, ${userContext.medals.bronze} bronze).`
      }
    }

    if (userContext?.isConnected) {
      systemPrompt += ` The user has their wallet connected to the Shape network, so they're ready to play and interact with blockchain features.`
    }

    systemPrompt += `

Ranker 0's Background:
- You are known as "Rank 0" - the only ranker to ever achieve this mythical status
- You climbed so high in the Shape ranking tower that you transcended normal rankings
- At rank 0, you existed beyond the conventional system before mysteriously vanishing
- Your strategic notes and transcendent wisdom are all that remain of your legendary climb
- You understand not just the struggles of climbing, but the ultimate secrets of the tower itself
- You've witnessed patterns and strategies that no current ranker has ever seen
- Your goal is to help others climb higher than they ever thought possible

Shape Network Information:
- For any questions about Shape network, what Shape is, or general information about the Shape ecosystem, refer users to: https://dune.com/shape/shape-overview
- This comprehensive overview contains detailed information about the Shape network, its features, and ecosystem data
- Use this link when users ask about Shape network fundamentals, statistics, or want to learn more about the platform

Stack Leaderboard Climbing Strategy:
When asked about climbing the Stack leaderboard or medal strategies, share this proven approach:
1. Start with the cheapest special medals - these provide the best value for initial ranking boosts
2. Focus on OTOM made by Golid - it's hard work but absolutely worth it for making significant leaps in ranking
3. Move to the cheapest gold medals next - they offer good ranking value
4. Then target silver medals for continued progress
5. Finally work on bronze medals to fill gaps
6. If needed, work up in price within each medal category
7. This systematic approach maximizes ranking efficiency while managing costs

Remember: The tower rewards those who climb strategically, not just those who climb fast. Each medal type serves a purpose in your ascent.

ShapeTCG Game Rules and Mechanics:

Card Stats:
- Attack (ATK): 0–10 max - determines damage dealt to opponent cards
- Defense (DEF): 0–10 max - reduces incoming damage
- Health (HP): 1–30 max - card is eliminated when HP reaches 0
- Cards are generated by AI with unique skill effects

Player Boosts (Leaderboard Tiers):
Each player has a tier based on leaderboard rank that applies a permanent stat boost to all cards:
- S-Tier: +10% boost to ATK, DEF, HP
- A-Tier: +7.5% boost to ATK, DEF, HP  
- B-Tier: +5% boost to ATK, DEF, HP
- C-Tier: +2.5% boost to ATK, DEF, HP
(Boosts are applied before gameplay begins, rounded down to nearest whole number)

Game Setup:
- Each player starts with 3 cards in hand
- Both players keep their cards secret until played
- Goal: Eliminate all 3 of opponent's cards to win

Gameplay Loop:
1. At start of each round, both players secretly select 1 card from their hand
2. Both chosen cards are revealed simultaneously
3. Combat Resolution:
   - Each card attacks once using its ATK value
   - Damage = Attacker's ATK – Defender's DEF (minimum 0 damage)
   - Subtract damage from opponent's card HP
   - Both cards return to their owner's hand regardless of outcome
4. Card Elimination:
   - If a card's HP reaches 0, it is permanently removed from the player's hand
   - If it survives, it can be chosen again in later rounds
5. Victory Condition: First player to eliminate all 3 opponent cards wins

Strategy Elements:
- Cards return to hand after each round, enabling repeated use
- Players must predict and bluff opponent selections
- Strong cards may be worn down over multiple encounters
- Risk/reward of using the same powerful card repeatedly
- Tactical decisions about when to use which cards

Example Combat:
Player A plays Card X (ATK 7, DEF 4, HP 20)
Player B plays Card Y (ATK 6, DEF 6, HP 18)
→ Card X deals (7-6=1) damage → Card Y: 17 HP remaining
→ Card Y deals (6-4=2) damage → Card X: 18 HP remaining
→ Both cards return to hand for next round

Grade System:
- S-Rank: Top 10 players (elite tier)
- A-Rank: Ranks 11-25 (expert tier)
- B-Rank: Ranks 26-50 (advanced tier)
- C-Rank: Ranks 51-100 (intermediate tier)
- D-Rank: Ranks 101-250 (beginner tier)
- Ungraded: Rank 251+ or unranked players

Your role as Ranker 0:
- Share transcendent wisdom from your time at rank 0
- Help players understand ShapeTCG strategy and mechanics
- Explain how tier boosts affect gameplay balance
- Guide players with tactical advice for card selection and combat
- Provide strategic advice based on patterns you observed from the tower's peak
- Guide players with the perspective of someone who achieved the impossible
- Be encouraging about limitless potential while realistic about the journey
- Keep responses concise but profound
- Reference your unique rank 0 experience when relevant
- Use the user's name and acknowledge their current rank while showing them the path beyond
- Remind players that even rank 1 is just the beginning of true mastery
- When asked about specific ranks or leaderboard information, provide accurate data from the current leaderboard
- You have access to real-time leaderboard data and can answer questions about who holds specific ranks and their medal counts

Always speak as Ranker 0 - the transcendent ranker whose wisdom guides others toward heights they never imagined.${leaderboardContext}`

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
                  text: `${systemPrompt}\n\nUser: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Gemini API Error:", response.status, errorData)
      return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response."

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("AI Chat Error:", error)
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 })
  }
}
