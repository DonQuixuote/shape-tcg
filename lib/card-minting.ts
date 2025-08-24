import { ethers } from "ethers"
import type { PlayingCard } from "./card-generation"

const CARD_CONTRACT_ABI = [
  "function mint(address to, string name, string grade, uint8 power, uint8 health, uint8 defense, string skill, bool isHolographic) returns (uint256)",
  "function isNFTUsed(address nftContract, uint256 tokenId) view returns (bool)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]

const CARD_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000" // Replace with actual ShapeTCG contract address

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

    const tx = await contract.mint(
      await signer.getAddress(),
      params.card.name,
      params.card.grade,
      params.card.power,
      params.card.health,
      params.card.defense,
      params.card.skill || "",
      params.card.holographic || false,
    )

    console.log("[v0] Transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Card minted successfully:", receipt)

    const transferEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log)
        return parsed?.name === "Transfer"
      } catch {
        return false
      }
    })

    if (transferEvent) {
      const parsed = contract.interface.parseLog(transferEvent)
      return parsed?.args.tokenId.toString()
    }

    return receipt.transactionHash
  } catch (error) {
    console.error("[v0] Error minting card:", error)
    throw error
  }
}

export async function uploadCardMetadata(card: PlayingCard): Promise<string> {
  const metadata = {
    name: card.name,
    description: `A ShapeTCG card: ${card.name}`,
    image: card.processedImage?.processedImageUrl || card.image,
    attributes: [
      { trait_type: "Rank", value: card.grade },
      { trait_type: "Rarity", value: card.processedImage?.backgroundRarity || "common" },
      { trait_type: "Power", value: card.power },
      { trait_type: "Health", value: card.health },
      { trait_type: "Defense", value: card.defense },
      { trait_type: "Holographic", value: card.holographic ? "Yes" : "No" },
      { trait_type: "Skill", value: card.skill || "No skill assigned" },
    ],
  }

  // In production, upload to IPFS and return the IPFS URL
  // For demo purposes, return a data URI
  const dataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`
  return dataUri
}
