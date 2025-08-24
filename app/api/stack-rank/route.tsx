import { NextResponse } from "next/server"

async function getUsernameByAddress(address: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/leaderboard-3bNfd7BAMK1XF6D3bX1qJskJTlVMcV.csv",
    )
    if (!response.ok) return null

    const csvText = await response.text()
    const lines = csvText.trim().split("\n")
    const normalizedAddress = address.toLowerCase()

    // Skip header row and parse CSV
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(",").map((val) => val.replace(/^"|"$/g, "").trim())
      if (values.length >= 3) {
        const csvAddress = values[2].toLowerCase()
        if (csvAddress === normalizedAddress) {
          return values[1] // Return username
        }
      }
    }
    return null
  } catch (error) {
    console.error("Error fetching username from CSV:", error)
    return null
  }
}

function parseLeaderboardHTML(html: string, username: string) {
  try {
    // Look for the user's row in the table more accurately
    // The structure shows: Rank | Username | Joined | Special | Gold | Silver | Bronze | Last Medal

    // First, try to find the username in the HTML
    const usernameIndex = html.toLowerCase().indexOf(username.toLowerCase())
    if (usernameIndex === -1) {
      console.log(`Username ${username} not found in HTML`)
      return null
    }

    // Look for the table row containing this username
    // Find the start of the row (look backwards for <tr)
    const rowStart = html.lastIndexOf("<tr", usernameIndex)
    if (rowStart === -1) {
      console.log("Could not find table row start")
      return null
    }

    // Find the end of the row (look forwards for </tr>)
    const rowEnd = html.indexOf("</tr>", usernameIndex)
    if (rowEnd === -1) {
      console.log("Could not find table row end")
      return null
    }

    const rowHTML = html.substring(rowStart, rowEnd + 5)
    console.log("Row HTML:", rowHTML.substring(0, 200) + "...")

    // Extract all numbers from the row (after the username)
    const numberPattern = />\s*(\d+)\s*</g
    const numbers = []
    let match

    while ((match = numberPattern.exec(rowHTML)) !== null) {
      numbers.push(Number.parseInt(match[1]))
    }

    console.log("Extracted numbers:", numbers)

    // The medal columns should be the last 4 numbers before "Last Medal"
    // Based on the structure: Rank, Username, Joined Date, Special, Gold, Silver, Bronze, Last Medal
    if (numbers.length >= 5) {
      // First number is rank, last 4 are medals (Special, Gold, Silver, Bronze)
      const rank = numbers[0]
      const medalNumbers = numbers.slice(-4)
      const [special, gold, silver, bronze] = medalNumbers
      const total = special + gold + silver + bronze

      console.log("Parsed medals:", { rank, special, gold, silver, bronze, total })

      return {
        rank,
        total,
        special,
        gold,
        silver,
        bronze,
      }
    }

    console.log("Not enough numbers found for medal parsing")
    return null
  } catch (error) {
    console.error("Error parsing leaderboard HTML:", error)
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter required" }, { status: 400 })
    }

    const username = await getUsernameByAddress(address)
    if (!username) {
      return NextResponse.json({ rank: null, username: null, medals: null })
    }

    console.log(`Fetching live leaderboard data for ${username}`)

    const leaderboardUrl = "https://stack.shape.network/leaderboard/1"

    try {
      const response = await fetch(leaderboardUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const html = await response.text()

      const userMedals = parseLeaderboardHTML(html, username)

      if (userMedals) {
        return NextResponse.json({
          rank: userMedals.rank,
          username: username,
          medals: {
            special: userMedals.special,
            gold: userMedals.gold,
            silver: userMedals.silver,
            bronze: userMedals.bronze,
            total: userMedals.total,
          },
        })
      } else {
        return NextResponse.json({
          rank: null,
          username: username,
          medals: null,
        })
      }
    } catch (fetchError) {
      console.error("Failed to fetch live leaderboard:", fetchError)
      return NextResponse.json(
        {
          error: "Unable to fetch live leaderboard data",
          rank: null,
          username: username,
          medals: null,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error fetching Stack leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch Stack leaderboard" }, { status: 500 })
  }
}
