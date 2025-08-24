"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useWeb3 } from "@/contexts/web3-context"
import { getCardsByOwner, deleteCard } from "@/lib/card-storage"
import type { PlayingCard } from "@/lib/card-generation"
import { PlayingCardComponent } from "@/components/playing-card"
import { CardMinting } from "@/components/card-minting"
import { Trash2, Filter, Grid, List, X, Coins, Eye, Send } from "lucide-react"

interface CardCollectionProps {
  onCardSelect?: (card: PlayingCard) => void
  selectedCard?: PlayingCard
  onCardDeleted?: () => void
}

function CardBack({
  card,
  onClose,
}: {
  card: PlayingCard
  onClose: () => void
}) {
  const [isFlipped, setIsFlipped] = useState(true)

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-10 right-0 text-white hover:text-gray-300"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-10 left-0 text-white hover:text-gray-300"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          Flip Card
        </Button>

        <div className="w-64 h-96 perspective-1000">
          <div
            className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
              isFlipped ? "rotate-y-180" : ""
            }`}
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ cursor: "pointer" }}
          >
            {/* Card Back */}
            <div className="absolute inset-0 w-full h-full backface-hidden rounded-lg overflow-hidden shadow-2xl">
              <div
                className="w-full h-full relative"
                style={{
                  background: `
                    linear-gradient(45deg, #374151 25%, transparent 25%),
                    linear-gradient(-45deg, #374151 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #4b5563 75%),
                    linear-gradient(-45deg, transparent 75%, #4b5563 75%)
                  `,
                  backgroundSize: "20px 20px",
                  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  backgroundColor: "#1f2937",
                }}
              >
                {/* Centered black circle overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-black rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Card Front - Now using actual PlayingCardComponent */}
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-lg overflow-hidden shadow-2xl">
              <PlayingCardComponent card={card} className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CardCollection({ onCardSelect, selectedCard, onCardDeleted }: CardCollectionProps) {
  const { account, isConnected } = useWeb3()
  const [cards, setCards] = useState<PlayingCard[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterRarity, setFilterRarity] = useState<string>("all")
  const [filterGrade, setFilterGrade] = useState<string>("all")
  const [inspectingCard, setInspectingCard] = useState<PlayingCard | null>(null)
  const [mintedCards, setMintedCards] = useState<Set<string>>(new Set())
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isConnected && account) {
      loadUserCards()
    } else {
      setCards([])
    }
  }, [isConnected, account])

  const loadUserCards = () => {
    if (!account) return
    const userCards = getCardsByOwner(account)
    setCards(userCards)
  }

  const handleDeleteCard = (cardId: string) => {
    deleteCard(cardId)
    loadUserCards()
    setMintedCards((prev) => {
      const newSet = new Set(prev)
      newSet.delete(cardId)
      return newSet
    })
    setSelectedCards((prev) => {
      const newSet = new Set(prev)
      newSet.delete(cardId)
      return newSet
    })
    onCardDeleted?.()
  }

  const handleCardInspect = (card: PlayingCard) => {
    setInspectingCard(card)
  }

  const handleCardSelect = (cardId: string) => {
    setSelectedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  const handleMintSuccess = (cardId: string, tokenId: string) => {
    setMintedCards((prev) => new Set(prev).add(cardId))
    console.log(`[v0] Card ${cardId} minted as token ${tokenId}`)
  }

  const filteredCards = cards.filter((card) => {
    if (filterRarity !== "all" && card.processedImage?.backgroundRarity !== filterRarity.toLowerCase()) return false
    if (filterGrade !== "all" && card.grade !== filterGrade) return false
    return true
  })

  const rarities = ["common", "uncommon", "rare", "epic", "legendary"]
  const grades = ["S-Rank", "A-Rank", "B-Rank", "C-Rank", "D-Rank", "Ungraded"]

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">Connect Your Wallet</div>
        <div className="text-gray-500 text-sm">Connect your wallet to view your card collection</div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No Cards Yet</div>
        <div className="text-gray-500 text-sm">
          Generate your first playing card from an NFT to start your collection
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-playfair">Your Card Collection</h2>
          <p className="text-muted-foreground text-sm">
            {filteredCards.length} of {cards.length} cards
            {mintedCards.size > 0 && ` • ${mintedCards.size} minted on-chain`}
            {selectedCards.size > 0 && ` • ${selectedCards.size} selected`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action buttons for selected cards */}
      {selectedCards.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedCards.size} card(s) selected</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedCard = cards.find((card) => selectedCards.has(card.id))
                if (selectedCard) handleCardInspect(selectedCard)
              }}
              disabled={selectedCards.size !== 1}
            >
              <Eye className="h-4 w-4 mr-1" />
              Inspect
            </Button>
            <div className="flex gap-1">
              {Array.from(selectedCards).map((cardId) => {
                const card = cards.find((c) => c.id === cardId)
                if (!card || mintedCards.has(cardId)) return null
                return (
                  <CardMinting
                    key={cardId}
                    card={card}
                    originalNFTContract={card.nftContractAddress}
                    originalTokenId={card.nftTokenId}
                    onMintSuccess={(tokenId) => handleMintSuccess(cardId, tokenId)}
                    compact={true}
                    buttonText="Mint"
                  />
                )
              })}
            </div>
            <Button variant="outline" size="sm" disabled={selectedCards.size !== 1}>
              <Send className="h-4 w-4 mr-1" />
              Transfer
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCards(new Set())}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="px-3 py-1 rounded border border-border bg-background text-sm"
        >
          <option value="all">All Rarities</option>
          {rarities.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="px-3 py-1 rounded border border-border bg-background text-sm"
        >
          <option value="all">All Grades</option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>

        {(filterRarity !== "all" || filterGrade !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterRarity("all")
              setFilterGrade("all")
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Cards Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCards.map((card) => (
            <div key={card.id} className="relative group">
              <PlayingCardComponent
                card={card}
                isSelected={selectedCards.has(card.id)}
                onClick={() => handleCardSelect(card.id)}
                className="scale-90 hover:scale-95 transition-transform cursor-pointer"
              />
              {mintedCards.has(card.id) && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-green-600 text-white">
                    <Coins className="h-3 w-3 mr-1" />
                    Minted
                  </Badge>
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCardInspect(card)
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCard(card.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedCards.has(card.id) ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleCardSelect(card.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-20 relative rounded overflow-hidden flex-shrink-0">
                  <img
                    src={card.nftImage || "/placeholder.svg"}
                    alt={card.nftName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{card.nftName}</h3>
                  <p className="text-sm text-muted-foreground">#{card.nftTokenId}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{card.grade}</Badge>
                    <Badge variant="outline">
                      {card.processedImage?.backgroundRarity
                        ? card.processedImage.backgroundRarity.charAt(0).toUpperCase() +
                          card.processedImage.backgroundRarity.slice(1)
                        : "Unknown"}
                    </Badge>
                    {mintedCards.has(card.id) && (
                      <Badge variant="secondary" className="bg-green-600 text-white">
                        <Coins className="h-3 w-3 mr-1" />
                        Minted
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <div className="text-center">
                    <div className="text-red-500 font-bold">{card.power}</div>
                    <div className="text-xs text-muted-foreground">PWR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-500 font-bold">{card.health}</div>
                    <div className="text-xs text-muted-foreground">HP</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-500 font-bold">{card.defense}</div>
                    <div className="text-xs text-muted-foreground">DEF</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCardInspect(card)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCard(card.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {inspectingCard && <CardBack card={inspectingCard} onClose={() => setInspectingCard(null)} />}
    </div>
  )
}
