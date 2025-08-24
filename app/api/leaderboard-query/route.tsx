import { type NextRequest, NextResponse } from "next/server"

interface StackLeaderboardEntry {
  rank: number
  address: string
  username?: string
  medals: {
    special: number
    gold: number
    silver: number
    bronze: number
    total: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")
    const rank = searchParams.get("rank")
    const address = searchParams.get("address")

    if (!query && !rank && !address) {
      return NextResponse.json({ error: "Query, rank, or address parameter required" }, { status: 400 })
    }

    // Fetch the full Stack leaderboard
    const response = await fetch("https://stack.shape.network/leaderboard/1")
    if (!response.ok) {
      throw new Error(`Failed to fetch Stack leaderboard: ${response.statusText}`)
    }

    const html = await response.text()

    // Parse the leaderboard HTML to extract user data
    const entries: StackLeaderboardEntry[] = []
    const tableRowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi
    const rows = html.match(tableRowRegex) || []

    for (let i = 1; i < rows.length; i++) {
      // Skip header row
      const row = rows[i]

      // Extract rank
      const rankMatch = row.match(/>(\d+)</)
      if (!rankMatch) continue
      const currentRank = Number.parseInt(rankMatch[1])

      // Extract address
      const addressMatch = row.match(/0x[a-fA-F0-9]{40}/)
      if (!addressMatch) continue
      const userAddress = addressMatch[0].toLowerCase()

      // Extract username if available
      const usernameMatch = row.match(/<div[^>]*class="[^"]*font-medium[^"]*"[^>]*>([^<]+)</)
      const username = usernameMatch ? usernameMatch[1].trim() : undefined

      // Extract medal counts
      const medalMatches = row.match(/(\d+)(?=\s*<[^>]*medal)/gi) || []
      const medals = {
        special: medalMatches[0] ? Number.parseInt(medalMatches[0]) : 0,
        gold: medalMatches[1] ? Number.parseInt(medalMatches[1]) : 0,
        silver: medalMatches[2] ? Number.parseInt(medalMatches[2]) : 0,
        bronze: medalMatches[3] ? Number.parseInt(medalMatches[3]) : 0,
        total: 0,
      }
      medals.total = medals.special + medals.gold + medals.silver + medals.bronze

      entries.push({
        rank: currentRank,
        address: userAddress,
        username,
        medals,
      })
    }

    // Handle specific queries
    if (rank) {
      const targetRank = Number.parseInt(rank)
      const entry = entries.find((e) => e.rank === targetRank)
      if (entry) {
        return NextResponse.json({
          rank: entry.rank,
          username: entry.username || "Unknown",
          address: entry.address,
          medals: entry.medals,
        })
      } else {
        return NextResponse.json({ error: `No user found at rank ${targetRank}` }, { status: 404 })
      }
    }

    if (address) {
      const normalizedAddress = address.toLowerCase()
      const entry = entries.find((e) => e.address === normalizedAddress)
      if (entry) {
        return NextResponse.json({
          rank: entry.rank,
          username: entry.username || "Unknown",
          address: entry.address,
          medals: entry.medals,
        })
      } else {
        return NextResponse.json({ error: `No user found with address ${address}` }, { status: 404 })
      }
    }

    // For general queries, return top 50 entries
    return NextResponse.json({
      entries: entries.slice(0, 50),
      total: entries.length,
    })
  } catch (error) {
    console.error("Leaderboard Query Error:", error)
    return NextResponse.json({ error: "Failed to query leaderboard" }, { status: 500 })
  }
}
