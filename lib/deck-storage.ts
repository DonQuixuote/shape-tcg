import type { PlayingCard } from "@/lib/card-generation"

export interface Deck {
  id: string
  name: string
  cards: PlayingCard[]
  ownerAddress: string
  isActive: boolean
  createdAt: Date
}

const DECK_STORAGE_KEY = "shapetcg_decks"

export function saveDeck(deck: Deck): void {
  try {
    const existingDecks = getStoredDecks()
    const updatedDecks = [...existingDecks.filter((d) => d.id !== deck.id), deck]
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updatedDecks))
  } catch (error) {
    console.error("Error saving deck:", error)
  }
}

export function getStoredDecks(): Deck[] {
  try {
    const stored = localStorage.getItem(DECK_STORAGE_KEY)
    if (!stored) return []

    const decks = JSON.parse(stored)
    return decks.map((deck: any) => ({
      ...deck,
      createdAt: new Date(deck.createdAt),
    }))
  } catch (error) {
    console.error("Error loading decks:", error)
    return []
  }
}

export function getDecksByOwner(ownerAddress: string): Deck[] {
  const allDecks = getStoredDecks()
  return allDecks.filter((deck) => deck.ownerAddress.toLowerCase() === ownerAddress.toLowerCase())
}

export function getActiveDeck(ownerAddress: string): Deck | null {
  const userDecks = getDecksByOwner(ownerAddress)
  return userDecks.find((deck) => deck.isActive) || null
}

export function setActiveDeck(deckId: string, ownerAddress: string): void {
  try {
    const allDecks = getStoredDecks()
    const updatedDecks = allDecks.map((deck) => {
      if (deck.ownerAddress.toLowerCase() === ownerAddress.toLowerCase()) {
        return { ...deck, isActive: deck.id === deckId }
      }
      return deck
    })
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updatedDecks))
  } catch (error) {
    console.error("Error setting active deck:", error)
  }
}

export function deleteDeck(deckId: string): void {
  try {
    const existingDecks = getStoredDecks()
    const updatedDecks = existingDecks.filter((deck) => deck.id !== deckId)
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updatedDecks))
  } catch (error) {
    console.error("Error deleting deck:", error)
  }
}

export function createDeck(name: string, cards: PlayingCard[], ownerAddress: string): Deck {
  const deck: Deck = {
    id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    cards: cards.slice(0, 3), // Limit to 3 cards per deck
    ownerAddress,
    isActive: false,
    createdAt: new Date(),
  }

  saveDeck(deck)
  return deck
}
