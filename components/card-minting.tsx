"use client"

import type React from "react"
import { useState } from "react"
import type { PlayingCard } from "../lib/card-generation"
import { mintCardOnChain, uploadCardMetadata } from "../lib/card-minting"
import { Button } from "./ui/button"
import { Coins, Loader2 } from "lucide-react"

interface CardMintingProps {
  card: PlayingCard
  originalNFTContract: string
  originalTokenId: string
  onMintSuccess?: (tokenId: string) => void
  compact?: boolean
}

export function CardMinting({
  card,
  originalNFTContract,
  originalTokenId,
  onMintSuccess,
  compact = false,
}: CardMintingProps) {
  const [isMinting, setIsMinting] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)

  const handleMint = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card inspection when clicking mint button

    try {
      setIsMinting(true)
      setMintError(null)

      // Upload metadata
      const metadataURI = await uploadCardMetadata(card)

      // Mint the card
      const tokenId = await mintCardOnChain({
        card,
        originalNFTContract,
        originalTokenId,
        metadataURI,
      })

      onMintSuccess?.(tokenId)
    } catch (error) {
      console.error("[v0] Minting failed:", error)
      setMintError(error instanceof Error ? error.message : "Failed to mint card")
    } finally {
      setIsMinting(false)
    }
  }

  if (compact) {
    return (
      <Button
        size="sm"
        onClick={handleMint}
        disabled={isMinting}
        className="bg-blue-600 hover:bg-blue-700 text-white"
        title={mintError || "Mint this card as an NFT on the blockchain"}
      >
        {isMinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleMint} disabled={isMinting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
        {isMinting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Coins className="h-4 w-4" />
            Mint Card On-Chain
          </>
        )}
      </Button>

      {mintError && <p className="text-red-400 text-sm">{mintError}</p>}

      <p className="text-gray-400 text-xs">
        Mint this card as an NFT on the blockchain. This will permanently record your card's stats and prevent the
        original NFT from being used again.
      </p>
    </div>
  )
}
