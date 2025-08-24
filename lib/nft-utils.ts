import { JsonRpcProvider, Contract } from "ethers"
import fetch from "node-fetch"

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

async function fetchNFTsWithoutEnumeration(
  contract: Contract,
  walletAddress: string,
  contractAddress: string,
): Promise<NFT[]> {
  const nfts: NFT[] = []

  try {
    // Try to get total supply to determine range to scan
    let maxTokenId = 50000 // Increased default fallback
    try {
      const totalSupply = await contract.totalSupply()
      maxTokenId = Math.min(Number(totalSupply.toString()), 50000)
    } catch (e) {
      console.log(`[v0] Could not get total supply for ${contractAddress}, using default range`)
    }

    // Use a more comprehensive scanning approach
    const batchSize = 50
    const maxBatches = Math.ceil(maxTokenId / batchSize)
    const targetBalance = await contract.balanceOf(walletAddress)
    const targetBalanceNumber = Number(targetBalance.toString())

    console.log(`[v0] Scanning for ${targetBalanceNumber} NFTs across ${maxTokenId} possible token IDs`)

    for (let batch = 0; batch < maxBatches && nfts.length < targetBalanceNumber; batch++) {
      const promises = []
      const startId = batch * batchSize + 1
      const endId = Math.min(startId + batchSize - 1, maxTokenId)

      for (let tokenId = startId; tokenId <= endId; tokenId++) {
        promises.push(
          contract
            .ownerOf(tokenId)
            .then((owner) => ({ tokenId, owner: owner.toLowerCase() }))
            .catch(() => null), // Token doesn't exist or error
        )
      }

      const results = await Promise.all(promises)

      for (const result of results) {
        if (result && result.owner === walletAddress.toLowerCase()) {
          try {
            const tokenURI = await contract.tokenURI(result.tokenId)
            const metadata = await fetchMetadata(tokenURI)

            nfts.push({
              tokenId: result.tokenId.toString(),
              name: metadata.name,
              image: metadata.image,
              contractAddress,
              description: metadata.description,
            })

            console.log(`[v0] Found NFT via scanning: ${metadata.name} (Token ID: ${result.tokenId})`)
          } catch (metadataError) {
            console.error(`[v0] Error fetching metadata for token ${result.tokenId}:`, metadataError)
          }
        }
      }

      // Progress logging
      if (batch % 20 === 0) {
        console.log(`[v0] Scanned ${endId} tokens, found ${nfts.length}/${targetBalanceNumber} NFTs`)
      }

      // Small delay between batches to avoid rate limiting
      if (batch < maxBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Early exit if we found all expected NFTs
      if (nfts.length >= targetBalanceNumber) {
        console.log(`[v0] Found all ${targetBalanceNumber} expected NFTs, stopping scan`)
        break
      }
    }

    if (nfts.length < targetBalanceNumber) {
      console.log(`[v0] Warning: Only found ${nfts.length} out of ${targetBalanceNumber} expected NFTs`)
    }
  } catch (error) {
    console.error(`[v0] Error in non-enumerable NFT fetching:`, error)
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
    console.error("Error fetching metadata:", error)
    return {
      name: "Unknown NFT",
      image: `/placeholder.svg?height=200&width=200&query=nft+placeholder`,
      description: "Metadata unavailable",
    }
  }
}

export async function fetchUserNFTs(walletAddress: string): Promise<NFT[]> {
  if (typeof window === "undefined") {
    console.log("[v0] Skipping NFT fetching on server side")
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
              console.error(`[v0] Error fetching token at index ${i}:`, tokenError)
            }
          }
        } else {
          console.log(`[v0] Contract ${contractAddress} doesn't support enumeration, using alternative method`)

          const nfts = await fetchNFTsWithoutEnumeration(contract, walletAddress, contractAddress)
          allNFTs.push(...nfts)
        }
      } catch (contractError) {
        console.error(`[v0] Error fetching NFTs from contract ${contractAddress}:`, contractError)
      }
    }

    console.log(`[v0] Total NFTs fetched: ${allNFTs.length}`)
    return allNFTs
  } catch (error) {
    console.error("[v0] Error fetching user NFTs:", error)
    return []
  }
}
