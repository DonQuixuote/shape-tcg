import { ethers } from "ethers"
import type { PlayingCard } from "./card-generation"

// Contract ABI (simplified for key functions)
const CARD_CONTRACT_ABI = [
  "function mintCard(address to, string tokenURI, uint8 power, uint8 health, uint8 defense, string skill, string rarity, string grade, address originalNFTContract, uint256 originalTokenId) returns (uint256)",
  "function isNFTUsed(address nftContract, uint256 tokenId) view returns (bool)",
  "function getCardStats(uint256 tokenId) view returns (tuple(uint8 power, uint8 health, uint8 defense, string skill, string rarity, string grade, address originalNFTContract, uint256 originalTokenId))",
  "event CardMinted(uint256 indexed tokenId, address indexed owner, address originalNFTContract, uint256 originalTokenId, string rarity)",
]

// Contract address (to be deployed)
const CARD_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000" // Replace with actual deployed address

export interface MintCardParams {
  card: PlayingCard
  originalNFTContract: string
  originalTokenId: string
  metadataURI: string
}

export async function mintCardOnChain(params: MintCardParams): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new Error("No wallet connected")
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contract = new ethers.Contract(CARD_CONTRACT_ADDRESS, CARD_CONTRACT_ABI, signer)

    console.log("[v0] Minting card on-chain...", params)

    // Check if NFT is already used
    const isUsed = await contract.isNFTUsed(params.originalNFTContract, params.originalTokenId)
    if (isUsed) {
      throw new Error("This NFT has already been used to mint a card")
    }

    // Mint the card
    const tx = await contract.mintCard(
      await signer.getAddress(),
      params.metadataURI,
      params.card.power,
      params.card.health,
      params.card.defense,
      params.card.skill || "",
      params.card.processedImage?.backgroundRarity || "common",
      params.card.grade,
      params.originalNFTContract,
      params.originalTokenId,
    )

    console.log("[v0] Transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Card minted successfully:", receipt)

    // Extract token ID from events
    const mintEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log)
        return parsed?.name === "CardMinted"
      } catch {
        return false
      }
    })

    if (mintEvent) {
      const parsed = contract.interface.parseLog(mintEvent)
      return parsed?.args.tokenId.toString()
    }

    return receipt.transactionHash
  } catch (error) {
    console.error("[v0] Error minting card:", error)
    throw error
  }
}

export async function checkNFTUsage(nftContract: string, tokenId: string): Promise<boolean> {
  try {
    if (!window.ethereum) {
      return false
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const contract = new ethers.Contract(CARD_CONTRACT_ADDRESS, CARD_CONTRACT_ABI, provider)

    return await contract.isNFTUsed(nftContract, tokenId)
  } catch (error) {
    console.error("[v0] Error checking NFT usage:", error)
    return false
  }
}

export async function uploadCardMetadata(card: PlayingCard): Promise<string> {
  // This would typically upload to IPFS or another decentralized storage
  // For now, we'll create a data URI with the card metadata
  const metadata = {
    name: card.name,
    description: `A ShapeTCG card generated from ${card.name}`,
    image: card.processedImage?.processedImageUrl || card.image,
    attributes: [
      { trait_type: "Power", value: card.power },
      { trait_type: "Health", value: card.health },
      { trait_type: "Defense", value: card.defense },
      { trait_type: "Grade", value: card.grade },
      { trait_type: "Rarity", value: card.processedImage?.backgroundRarity || "common" },
      { trait_type: "Skill", value: card.skill || "No skill assigned" },
    ],
  }

  // In production, upload to IPFS and return the IPFS URL
  // For demo purposes, return a data URI
  const dataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`
  return dataUri
}
