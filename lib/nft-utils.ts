import { JsonRpcProvider, Contract } from "ethers"
import { fetch } from "cross-fetch"

export interface NFT {
  tokenId: string
  name: string
  image: string
  contractAddress: string
  description?: string
}

const NFT_CONTRACT_ADDRESSES = [
  "0xdad1276ecd6d27116da400b33c81ce49d91d5831",
  "0xf2e4b2a15872a20d0ffb336a89b94ba782ce9ba5",
  "0xadede2a59b46ef9815e349464ea14d40195d4a2b",
]

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "EUcDd77cHlUHCqZedbKpI"
const provider = new JsonRpcProvider(`https://shape-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`)

const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
]

async function supportsEnumeration(contract: Contract): Promise<boolean> {
  try {
    // Try to call tokenOfOwnerByIndex with a test call
    await contract.tokenOfOwnerByIndex.staticCall("0x0000000000000000000000000000000000000000", 0)
    return true
  } catch (error) {
    // If it fails, the contract doesn't support enumeration
    return false
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchNFTsWithoutEnumeration(
  contract: Contract,
  walletAddress: string,
  contractAddress: string,
): Promise<NFT[]> {
  const nfts: NFT[] = []

  try {
    const targetBalance = await contract.balanceOf(walletAddress)
    const targetBalanceNumber = Number(targetBalance.toString())

    if (targetBalanceNumber === 0) {
      return nfts
    }

    console.log(`[v0] Looking for ${targetBalanceNumber} NFTs using Transfer event logs`)

    const currentBlock = await provider.getBlockNumber()
    const fromBlock = Math.max(0, currentBlock - 50000) // Reduced block range for better performance

    try {
      // Query Transfer events where 'to' is the wallet address
      const transferFilter = {
        address: contractAddress,
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event signature
          null, // from (any address)
          "0x000000000000000000000000" + walletAddress.slice(2).toLowerCase(), // to (user's wallet)
        ],
      }

      const events = await provider.getLogs({
        ...transferFilter,
        fromBlock,
        toBlock: currentBlock,
      })

      console.log(`[v0] Found ${events.length} Transfer events to analyze`)

      const ownedTokenIds = new Set<string>()

      // Process events to find currently owned tokens
      for (const event of events) {
        if (event.topics && event.topics.length >= 4) {
          // Token ID is in the 4th topic (index 3) for Transfer events
          const tokenIdHex = event.topics[3]
          const tokenId = Number.parseInt(tokenIdHex, 16).toString()

          // Verify the wallet still owns this token
          try {
            const currentOwner = await contract.ownerOf(tokenId)
            if (currentOwner.toLowerCase() === walletAddress.toLowerCase()) {
              ownedTokenIds.add(tokenId)
              console.log(`[v0] Confirmed ownership of token ${tokenId}`)
            }
          } catch (e) {
            // Token might not exist anymore, skip
          }

          if (ownedTokenIds.size >= targetBalanceNumber) {
            break
          }
        }
      }

      console.log(`[v0] Found ${ownedTokenIds.size} owned tokens from events`)

      // Fetch metadata for owned tokens
      for (const tokenId of ownedTokenIds) {
        try {
          const tokenURI = await contract.tokenURI(tokenId)
          await delay(100)
          const metadata = await fetchMetadata(tokenURI)

          nfts.push({
            tokenId: tokenId,
            name: metadata.name,
            image: metadata.image,
            contractAddress,
            description: metadata.description,
          })

          console.log(`[v0] Found NFT via events: ${metadata.name} (Token ID: ${tokenId})`)
        } catch (metadataError) {
          console.log(`[v0] Failed to fetch metadata for token ${tokenId}`)
        }
      }
    } catch (eventError) {
      console.log(`[v0] Event query failed: ${eventError}, falling back to limited scanning`)

      const maxScan = Math.min(1000, targetBalanceNumber * 100) // Much smaller scan range

      for (let tokenId = 1; tokenId <= maxScan && nfts.length < targetBalanceNumber; tokenId++) {
        try {
          const owner = await contract.ownerOf(tokenId)
          if (owner.toLowerCase() === walletAddress.toLowerCase()) {
            const tokenURI = await contract.tokenURI(tokenId)
            await delay(100)
            const metadata = await fetchMetadata(tokenURI)

            nfts.push({
              tokenId: tokenId.toString(),
              name: metadata.name,
              image: metadata.image,
              contractAddress,
              description: metadata.description,
            })

            console.log(`[v0] Found NFT via scanning: ${metadata.name} (Token ID: ${tokenId})`)
          }
        } catch (e) {
          // Skip non-existent tokens
        }

        if (tokenId % 50 === 0) {
          await delay(200) // Rate limiting
        }
      }
    }
  } catch (error) {
    console.log(`[v0] Error in fetchNFTsWithoutEnumeration: ${error}`)
  }

  return nfts
}

async function fetchMetadata(tokenURI: string): Promise<{ name: string; image: string; description?: string }> {
  try {
    // Handle IPFS URLs
    let metadataUrl = tokenURI
    if (tokenURI.startsWith("ipfs://")) {
      metadataUrl = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/")
    }

    const response = await fetch(metadataUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`)
    }

    const metadata = await response.json()

    // Handle IPFS image URLs
    let imageUrl = metadata.image || ""
    if (imageUrl.startsWith("ipfs://")) {
      imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
    }

    return {
      name: metadata.name || "Unknown NFT",
      image: imageUrl || `/placeholder.svg?height=200&width=200&query=nft+placeholder`,
      description: metadata.description,
    }
  } catch (error) {
    return {
      name: "Unknown NFT",
      image: `/placeholder.svg?height=200&width=200&query=nft+placeholder`,
      description: "Metadata unavailable",
    }
  }
}

export async function fetchUserNFTs(walletAddress: string): Promise<NFT[]> {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const allNFTs: NFT[] = []

    for (const contractAddress of NFT_CONTRACT_ADDRESSES) {
      try {
        console.log(`[v0] Fetching NFTs from contract ${contractAddress} for wallet ${walletAddress}`)

        // Create contract instance
        const contract = new Contract(contractAddress, ERC721_ABI, provider)

        // Get user's NFT balance for this contract
        const balance = await contract.balanceOf(walletAddress)
        const balanceNumber = Number(balance.toString())

        console.log(`[v0] User has ${balanceNumber} NFTs in contract ${contractAddress}`)

        if (balanceNumber === 0) {
          continue
        }

        const hasEnumeration = await supportsEnumeration(contract)

        if (hasEnumeration) {
          console.log(`[v0] Contract ${contractAddress} supports enumeration, using tokenOfOwnerByIndex`)

          // Fetch each NFT owned by the user using enumeration
          for (let i = 0; i < balanceNumber; i++) {
            try {
              // Get token ID at index
              const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i)
              const tokenIdString = tokenId.toString()

              // Get token URI for metadata
              const tokenURI = await contract.tokenURI(tokenId)
              console.log(`[v0] Fetching metadata for token ${tokenIdString} from URI: ${tokenURI}`)

              await delay(150)
              // Fetch and parse metadata
              const metadata = await fetchMetadata(tokenURI)

              const nft: NFT = {
                tokenId: tokenIdString,
                name: metadata.name,
                image: metadata.image,
                contractAddress,
                description: metadata.description,
              }

              allNFTs.push(nft)
              console.log(`[v0] Successfully fetched NFT: ${metadata.name}`)
            } catch (tokenError) {
              // Skip logging token errors to reduce console spam
            }
          }
        } else {
          console.log(`[v0] Contract ${contractAddress} doesn't support enumeration, using alternative method`)

          const nfts = await fetchNFTsWithoutEnumeration(contract, walletAddress, contractAddress)
          allNFTs.push(...nfts)
        }

        await delay(300)
      } catch (contractError) {
        // Skip logging contract errors to reduce console spam
      }
    }

    console.log(`[v0] Total NFTs fetched: ${allNFTs.length}`)
    return allNFTs
  } catch (error) {
    return []
  }
}
