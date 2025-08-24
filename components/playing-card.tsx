"use client"

import Image from "next/image"
import { type PlayingCard, getGradeColor } from "@/lib/card-generation"
import { Card } from "@/components/ui/card"

interface PlayingCardProps {
  card: PlayingCard
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

function getRarityColor(rarity?: string): string {
  switch (rarity) {
    case "legendary":
      return "text-yellow-400"
    case "epic":
      return "text-purple-400"
    case "rare":
      return "text-blue-400"
    case "uncommon":
      return "text-cyan-400"
    case "common":
      return "text-white"
    default:
      return "text-gray-600"
  }
}

export function PlayingCardComponent({ card, isSelected = false, onClick, className = "" }: PlayingCardProps) {
  return (
    <Card
      className={`
        relative w-64 h-96 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl
        ${isSelected ? "ring-4 ring-primary shadow-2xl scale-105" : ""}
        ${card.isHolographic ? "holographic-card" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      {card.isHolographic && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 via-blue-500/20 to-cyan-500/20 rounded-lg animate-pulse" />
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700 rounded-lg" />

      <div className="absolute inset-1 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg" />
      <div className="absolute inset-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg" />

      <div className="relative h-full flex flex-col">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-2 rounded-t-lg border-b-2 border-gray-800">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h3
                className={`font-bold text-sm uppercase tracking-wide truncate ${card.isHolographic ? "text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text animate-pulse" : "text-white"}`}
              >
                {card.nftName}
              </h3>
              {card.processedImage?.backgroundRarity && (
                <div
                  className={`text-xs font-medium capitalize ${getRarityColor(card.processedImage.backgroundRarity)}`}
                >
                  {card.processedImage.backgroundRarity}
                </div>
              )}
            </div>
            <div className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${getGradeColor(card.grade)} bg-black/30`}>
              {card.grade}
            </div>
          </div>
        </div>

        <div className="flex-1 p-3">
          <div
            className={`relative w-full h-36 rounded-lg overflow-hidden border-4 shadow-inner ${card.isHolographic ? "border-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" : "border-gradient-to-r from-amber-400 to-amber-600"}`}
          >
            <div
              className={`absolute inset-0 border-2 rounded-md ${card.isHolographic ? "border-purple-300" : "border-amber-300"}`}
            />
            <div
              className={`absolute inset-1 border rounded-sm ${card.isHolographic ? "border-pink-400" : "border-amber-500"}`}
            />

            {card.processedImage?.backgroundUrl && (
              <div className="absolute inset-0">
                <Image
                  src={card.processedImage.backgroundUrl || "/placeholder.svg"}
                  alt="Card background"
                  fill
                  className="object-cover rounded-sm"
                />
              </div>
            )}

            <Image
              src={card.processedImage?.processedUrl || card.nftImage || "/placeholder.svg?height=176&width=224"}
              alt={card.nftName}
              fill
              className="object-cover rounded-sm relative z-10"
            />

            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10">
                <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="mt-3 p-2 bg-gray-700 border border-gray-600 rounded-md min-h-[40px]">
            <div className="text-xs text-gray-200 leading-relaxed">{card.skill}</div>
          </div>
        </div>

        <div className="p-4 rounded-b-lg">
          <div className="text-center space-y-1">
            <div className="text-gray-200 text-xs leading-relaxed">
              <span className="font-semibold text-red-400">Power:</span> {card.power} •{" "}
              <span className="font-semibold text-blue-300">Health:</span> {card.health} •{" "}
              <span className="font-semibold text-blue-400">Defense:</span> {card.defense}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Card Collection Display Component
interface CardCollectionProps {
  cards: PlayingCard[]
  selectedCard?: PlayingCard
  onCardSelect?: (card: PlayingCard) => void
  title?: string
}

export function CardCollection({ cards, selectedCard, onCardSelect, title = "Your Cards" }: CardCollectionProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">No cards generated yet</div>
        <div className="text-gray-500 text-sm">Select an NFT to generate your first playing card</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <PlayingCardComponent
            key={card.id}
            card={card}
            isSelected={selectedCard?.id === card.id}
            onClick={() => onCardSelect?.(card)}
          />
        ))}
      </div>
    </div>
  )
}

export { PlayingCardComponent as PlayingCard }
