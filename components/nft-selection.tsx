"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWeb3 } from "@/contexts/web3-context"
import { fetchUserNFTs, type NFT } from "@/lib/nft-utils"
import { Loader2, CheckCircle, Sparkles, CopyleftIcon as Collection, Sword } from "lucide-react"
import Image from "next/image"
import { generatePlayingCard, type PlayingCard, type NFTData } from "@/lib/card-generation"
import { getUserInfoByAddress } from "@/lib/leaderboard"
import { getGradeByRank } from "@/lib/grade-system"
import { saveCard, getCardsByOwner, getUsedNFTs } from "@/lib/card-storage"
import { CardCollection as CardCollectionComponent } from "@/components/card-collection"
import { BattleInterface } from "@/components/battle-interface"

export function NFTSelection() {
  const { account, isConnected } = useWeb3()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedCards, setGeneratedCards] = useState<PlayingCard[]>([])
  const [userGrade, setUserGrade] = useState<string>("Ungraded")
  const [isGeneratingCard, setIsGeneratingCard] = useState(false)
  const [viewMode, setViewMode] = useState<"nfts" | "cards">("nfts")
  const [showBattle, setShowBattle] = useState(false)

  useEffect(() => {
    if (isConnected && account) {
      loadUserNFTs()
      loadUserGrade()
      loadStoredCards()
    }
  }, [isConnected, account])

  const loadStoredCards = () => {
    if (!account) return
    const storedCards = getCardsByOwner(account)
    setGeneratedCards(storedCards)
    // Reload NFTs to update availability after card changes
    if (isConnected && account) {
      loadUserNFTs()
    }
  }

  const loadUserGrade = async () => {
    if (!account) return

    try {
      const { stackRank } = await getUserInfoByAddress(account)
      const grade = getGradeByRank(stackRank)
      setUserGrade(grade)
    } catch (error) {
      console.error("Error loading user grade:", error)
      setUserGrade("Ungraded")
    }
  }

  const loadUserNFTs = async () => {
    if (!account) return

    setLoading(true)
    setError(null)

    try {
      const userNFTs = await fetchUserNFTs(account)

      const usedNFTs = getUsedNFTs(account)
      const availableNFTs = userNFTs.filter((nft) => {
        const nftId = `${nft.contractAddress}-${nft.tokenId}`
        return !usedNFTs.has(nftId)
      })

      setNfts(availableNFTs)

      if (availableNFTs.length === 0 && userNFTs.length > 0) {
        setError("All your NFTs have already been used to generate cards. Delete cards to make NFTs available again.")
      } else if (availableNFTs.length === 0) {
        setError("No NFTs found from the specified collections in your wallet.")
      }
    } catch (err) {
      setError("Failed to load your NFTs. Please try again.")
      console.error("Error loading NFTs:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectNFT = (nft: NFT) => {
    setSelectedNFT(selectedNFT?.tokenId === nft.tokenId ? null : nft)
  }

  const handleGenerateCard = async () => {
    if (!selectedNFT || !account) return

    setIsGeneratingCard(true)

    try {
      const nftData: NFTData = {
        tokenId: selectedNFT.tokenId,
        contractAddress: selectedNFT.contractAddress,
        name: selectedNFT.name,
        image: selectedNFT.image,
      }

      const newCard = await generatePlayingCard(nftData, userGrade, account)
      saveCard(newCard)
      setGeneratedCards((prev) => [...prev, newCard])
      setSelectedNFT(null)
      setViewMode("cards")
    } catch (error) {
      console.error("Error generating card:", error)
    } finally {
      setIsGeneratingCard(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 bg-primary/20 rounded-full"></div>
        </div>
        <div>
          <h3 className="font-playfair text-lg font-semibold text-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground text-sm">Connect your wallet to view and select your NFTs for the game</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div>
          <h3 className="font-playfair text-lg font-semibold text-foreground mb-2">Loading Your NFTs</h3>
          <p className="text-muted-foreground text-sm">Fetching your NFTs from the Shape collections...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        {generatedCards.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewMode("nfts")}>
                Generate Cards
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode("cards")}>
                <Collection className="h-4 w-4 mr-2" />
                View Collection ({generatedCards.length})
              </Button>
            </div>
          </div>
        )}

        {viewMode === "cards" && generatedCards.length > 0 ? (
          <CardCollectionComponent onCardDeleted={loadStoredCards} />
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <div className="w-8 h-8 bg-destructive/20 rounded-full"></div>
            </div>
            <div>
              <h3 className="font-playfair text-lg font-semibold text-foreground mb-2">
                {generatedCards.length > 0 ? "All NFTs Used" : "Error Loading NFTs"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">{error}</p>
              {generatedCards.length > 0 && (
                <p className="text-muted-foreground text-sm mb-4">
                  You can still view and manage your {generatedCards.length} generated cards.
                </p>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={loadUserNFTs} variant="outline" size="sm">
                  Try Again
                </Button>
                {generatedCards.length > 0 && (
                  <Button onClick={() => setViewMode("cards")} variant="default" size="sm">
                    <Collection className="h-4 w-4 mr-2" />
                    View Collection
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (viewMode === "cards" || (generatedCards.length > 0 && viewMode !== "nfts")) {
    return (
      <div className="space-y-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "nfts" ? "outline" : "ghost"} size="sm" onClick={() => setViewMode("nfts")}>
              Generate Cards
            </Button>
            <Button variant={viewMode === "cards" ? "outline" : "ghost"} size="sm" onClick={() => setViewMode("cards")}>
              <Collection className="h-4 w-4 mr-2" />
              View Collection ({generatedCards.length})
            </Button>
          </div>
          {generatedCards.length > 0 && (
            <Button
              onClick={() => setShowBattle(true)}
              size="sm"
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <Sword className="h-4 w-4 mr-2" />
              Battle
            </Button>
          )}
        </div>

        <CardCollectionComponent onCardDeleted={loadStoredCards} />

        {showBattle && <BattleInterface playerCards={generatedCards} onClose={() => setShowBattle(false)} />}
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 bg-muted/50 rounded-full"></div>
        </div>
        <div>
          <h3 className="font-playfair text-lg font-semibold text-foreground mb-2">No NFTs Found</h3>
          <p className="text-muted-foreground text-sm">
            You don't have any NFTs from the Shape collections in your wallet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-playfair text-lg font-semibold text-foreground">Select Your NFT</h3>
        <div className="flex items-center gap-2">
          {generatedCards.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setViewMode("cards")}>
              <Collection className="h-4 w-4 mr-2" />
              View Collection ({generatedCards.length})
            </Button>
          )}
          {selectedNFT && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              Selected: {selectedNFT.name}
            </div>
          )}
        </div>
      </div>

      <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/30">
        <p className="text-sm text-muted-foreground">
          Your Grade: <span className="font-semibold text-foreground">{userGrade}</span>
          <span className="text-xs block mt-1">Cards generated will have {userGrade} grade bonuses</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {nfts.map((nft) => (
          <Card
            key={`${nft.contractAddress}-${nft.tokenId}`}
            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
              selectedNFT?.tokenId === nft.tokenId ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
            }`}
            onClick={() => handleSelectNFT(nft)}
          >
            <div className="p-3 space-y-2">
              <div className="aspect-square relative rounded-md overflow-hidden bg-muted">
                <Image src={nft.image || "/placeholder.svg"} alt={nft.name} fill className="object-cover" />
                {selectedNFT?.tokenId === nft.tokenId && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-primary bg-background rounded-full" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-sm text-foreground truncate">{nft.name}</h4>
                <p className="text-xs text-muted-foreground">#{nft.tokenId}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedNFT && (
        <div className="pt-4 border-t border-border/50 space-y-4">
          <Button className="w-full gap-2" size="sm" onClick={handleGenerateCard} disabled={isGeneratingCard}>
            {isGeneratingCard ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing & Generating Card...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Playing Card from {selectedNFT.name}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
