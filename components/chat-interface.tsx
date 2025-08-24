"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User } from "lucide-react"
import { useWeb3 } from "@/contexts/web3-context"
import { getUserInfoByAddress } from "@/lib/leaderboard"
import { getGradeByRank } from "@/lib/grade-system"
import { saveCard, getStoredCards } from "@/lib/card-storage"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
}

interface MedalData {
  special: number
  gold: number
  silver: number
  bronze: number
  total: number
}

export function ChatInterface() {
  const { account, isConnected } = useWeb3()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [stackRank, setStackRank] = useState<number | null>(null)
  const [grade, setGrade] = useState<string>("Ungraded")
  const [medals, setMedals] = useState<MedalData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initializeChat = async () => {
      if (isConnected && account) {
        const { username: foundUsername, stackRank: foundStackRank } = await getUserInfoByAddress(account)
        setUsername(foundUsername)
        setStackRank(foundStackRank)
        const userGrade = getGradeByRank(foundStackRank)
        setGrade(userGrade)

        let medalData: MedalData | null = null
        try {
          const response = await fetch(`/api/stack-rank?address=${encodeURIComponent(account)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.medals) {
              medalData = data.medals
              setMedals(medalData)
            }
          }
        } catch (error) {
          console.error("Error fetching medal data:", error)
        }

        let welcomeMessage = foundUsername ? `Welcome, ${foundUsername}!` : `Welcome to ShapeTCG!`

        if (foundStackRank) {
          welcomeMessage += ` You're currently ranked #${foundStackRank} on the Stack leaderboard with ${userGrade} grade.`
        }

        if (medalData && medalData.total > 0) {
          welcomeMessage += ` You have ${medalData.total} total medals (${medalData.special} special, ${medalData.gold} gold, ${medalData.silver} silver, ${medalData.bronze} bronze).`
        }

        welcomeMessage += foundUsername
          ? ` I'm Ranker 0, your game assistant for ShapeTCG. I can help you learn the rules, suggest strategies, or guide you through gameplay. What would you like to know?`
          : ` I'm Ranker 0, your game assistant. I can help you learn the rules, suggest strategies, or guide you through gameplay. What would you like to know?`

        setMessages([
          {
            id: "1",
            content: welcomeMessage,
            sender: "ai",
            timestamp: new Date(),
          },
        ])
      } else {
        setMessages([
          {
            id: "1",
            content:
              "Welcome to ShapeTCG! I'm Ranker 0, your game assistant. Connect your wallet to get a personalized experience, or ask me anything about the game rules and strategies!",
            sender: "ai",
            timestamp: new Date(),
          },
        ])
        setUsername(null)
        setStackRank(null)
        setGrade("Ungraded")
        setMedals(null)
      }
    }

    initializeChat()
  }, [isConnected, account])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          userContext: {
            address: account,
            username: username,
            stackRank: stackRank,
            grade: grade,
            isConnected: isConnected,
            medals: medals,
            cards: account
              ? getStoredCards().filter((card) => card.ownerAddress.toLowerCase() === account.toLowerCase())
              : [],
            walletAddress: account,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const data = await response.json()

      if (data.generatedCard && account) {
        console.log("[v0] Saving AI-generated card to collection:", data.generatedCard.nftName)
        saveCard(data.generatedCard)

        window.dispatchEvent(new CustomEvent("cardCollectionUpdated"))
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: "ai",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiResponse])
    } catch (error) {
      console.error("Chat error:", error)
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="h-[600px] flex flex-col bg-card border-border/50">
      <CardHeader className="pb-4 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 font-playfair text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Ranker 0
          {username && (
            <span className="text-sm font-normal text-muted-foreground">
              • {username}
              {stackRank && ` (Rank #${stackRank} • ${grade})`}
              {medals && medals.total > 0 && ` • ${medals.total} medals`}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 h-full overflow-hidden">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.sender === "ai" && (
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {message.sender === "user" && (
                  <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-secondary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/50 p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about ShapeTCG..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} size="sm" className="px-3">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Ranker 0 ready to help with rules, strategies, and gameplay
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
