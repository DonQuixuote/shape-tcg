import type { PlayingCard } from "@/lib/card-generation"

const STORAGE_KEY = "shapetcg_cards"

export function saveCard(card: PlayingCard): void {
  try {
    const existingCards = getStoredCards()
    const updatedCards = [...existingCards, card]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCards))
  } catch (error) {
    console.error("Error saving card:", error)
  }
}

export function getStoredCards(): PlayingCard[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const cards = JSON.parse(stored)
    return cards.map((card: any) => ({
      ...card,
      createdAt: new Date(card.createdAt),
    }))
  } catch (error) {
    console.error("Error loading cards:", error)
    return []
  }
}

export function deleteCard(cardId: string): void {
  try {
    const existingCards = getStoredCards()
    const updatedCards = existingCards.filter((card) => card.id !== cardId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCards))
  } catch (error) {
    console.error("Error deleting card:", error)
  }
}

export function getCardsByOwner(ownerAddress: string): PlayingCard[] {
  const allCards = getStoredCards()
  return allCards.filter((card) => card.ownerAddress.toLowerCase() === ownerAddress.toLowerCase())
}

export function clearAllCards(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing cards:", error)
  }
}

export function getUsedNFTs(ownerAddress: string): Set<string> {
  const cards = getCardsByOwner(ownerAddress)
  const usedNFTs = new Set<string>()

  cards.forEach((card) => {
    const nftId = `${card.nftContractAddress}-${card.nftTokenId}`
    usedNFTs.add(nftId)
  })

  return usedNFTs
}

export function isNFTUsed(contractAddress: string, tokenId: string, ownerAddress: string): boolean {
  const usedNFTs = getUsedNFTs(ownerAddress)
  const nftId = `${contractAddress}-${tokenId}`
  return usedNFTs.has(nftId)
}
