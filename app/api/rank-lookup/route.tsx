import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rank = searchParams.get("rank")

    if (!rank) {
      return NextResponse.json({ error: "Rank parameter is required" }, { status: 400 })
    }

    console.log(`[v0] Looking up rank #${rank} on Stack leaderboard`)

    // Fetch the leaderboard page
    const response = await fetch("https://stack.shape.network/leaderboard/1", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`)
    }

    const html = await response.text()

    // Parse the HTML to find the specific rank
    // Look for table rows with rank information
    const rankPattern = new RegExp(`<tr[^>]*>.*?<td[^>]*>\\s*${rank}\\s*\$$[^)]*\$$.*?</tr>`, "is")
    const rankMatch = html.match(rankPattern)

    if (!rankMatch) {
      return NextResponse.json({ error: `Rank #${rank} not found on leaderboard` }, { status: 404 })
    }

    const rowHtml = rankMatch[0]

    // Extract username - look for the username pattern in the row
    const usernamePattern = /<td[^>]*>\s*<[^>]*>\s*([^<]+)\s*<\/[^>]*>\s*<\/td>/g
    const matches = [...rowHtml.matchAll(usernamePattern)]

    // The username is typically in the second column after rank
    let username = "Unknown"
    if (matches.length >= 2) {
      username = matches[1][1].trim()
    }

    // Extract medal counts - look for medal numbers
    const medalPattern = /(\d+)\s*(\d+)\s*(\d+)\s*(\d+)/
    const medalMatch = rowHtml.match(medalPattern)

    let medals = { special: 0, gold: 0, silver: 0, bronze: 0, total: 0 }
    if (medalMatch) {
      medals = {
        special: Number.parseInt(medalMatch[1]) || 0,
        gold: Number.parseInt(medalMatch[2]) || 0,
        silver: Number.parseInt(medalMatch[3]) || 0,
        bronze: Number.parseInt(medalMatch[4]) || 0,
        total:
          (Number.parseInt(medalMatch[1]) || 0) +
          (Number.parseInt(medalMatch[2]) || 0) +
          (Number.parseInt(medalMatch[3]) || 0) +
          (Number.parseInt(medalMatch[4]) || 0),
      }
    }

    console.log(`[v0] Found rank #${rank}: ${username} with ${medals.total} total medals`)

    return NextResponse.json({
      rank: Number.parseInt(rank),
      username,
      medals,
      found: true,
    })
  } catch (error) {
    console.error("[v0] Error in rank lookup:", error)
    return NextResponse.json(
      {
        error: "Failed to lookup rank information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
