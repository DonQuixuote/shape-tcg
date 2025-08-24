interface LeaderboardEntry {
  rank: string
  username: string
  address: string
}

const LEADERBOARD_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/leaderboard-3bNfd7BAMK1XF6D3bX1qJskJTlVMcV.csv"

const STACK_LEADERBOARD_URL = "https://stack.shape.network/leaderboard/1"

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(LEADERBOARD_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`)
    }

    const csvText = await response.text()
    const lines = csvText.trim().split("\n")

    // Skip header row and parse CSV
    const entries: LeaderboardEntry[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Simple CSV parsing - split by comma and handle quoted values
      const values = line.split(",").map((val) => val.replace(/^"|"$/g, "").trim())

      if (values.length >= 3) {
        entries.push({
          rank: values[0],
          username: values[1],
          address: values[2].toLowerCase(), // Normalize address to lowercase
        })
      }
    }

    return entries
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return []
  }
}

export async function getUsernameByAddress(address: string): Promise<string | null> {
  try {
    const leaderboard = await fetchLeaderboard()
    const normalizedAddress = address.toLowerCase()

    const entry = leaderboard.find((entry) => entry.address === normalizedAddress)

    return entry ? entry.username : null
  } catch (error) {
    console.error("Error looking up username:", error)
    return null
  }
}

export async function getStackRankByAddress(address: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/stack-rank?address=${encodeURIComponent(address)}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch Stack leaderboard: ${response.statusText}`)
    }

    const data = await response.json()
    return data.rank
  } catch (error) {
    console.error("Error fetching Stack leaderboard rank:", error)
    return null
  }
}

export async function getUserInfoByAddress(address: string): Promise<{
  username: string | null
  stackRank: number | null
}> {
  try {
    const [username, stackRank] = await Promise.all([getUsernameByAddress(address), getStackRankByAddress(address)])

    return { username, stackRank }
  } catch (error) {
    console.error("Error looking up user info:", error)
    return { username: null, stackRank: null }
  }
}

export async function getRandomOpponentFromLeaderboard(): Promise<string> {
  try {
    const leaderboard = await fetchLeaderboard()
    if (leaderboard.length === 0) {
      const fallbackNames = ["CryptoWarrior", "NFTMaster", "ShapeChampion", "BlockchainHero", "DigitalLegend"]
      return fallbackNames[Math.floor(Math.random() * fallbackNames.length)]
    }

    const randomIndex = Math.floor(Math.random() * leaderboard.length)
    return leaderboard[randomIndex].username
  } catch (error) {
    console.error("Error getting random opponent:", error)
    return "Anonymous Challenger"
  }
}
