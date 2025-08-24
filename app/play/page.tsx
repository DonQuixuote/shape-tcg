import { ChatInterface } from "@/components/chat-interface"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Settings, HelpCircle } from "lucide-react"
import Link from "next/link"
import { WalletConnect } from "@/components/wallet-connect"
import { NFTSelection } from "@/components/nft-selection"

export default function PlayPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <h1 className="font-playfair text-2xl font-bold text-foreground">
                Shape<span className="text-primary">TCG</span> Play
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="scale-x-110 scale-y-75 origin-right">
                <WalletConnect />
              </div>
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Play Area */}
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-80px)]">
        <div className="grid lg:grid-cols-3 gap-6 h-full">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 h-full bg-gradient-to-br from-card to-card/50 border-border/50">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair text-xl font-bold text-card-foreground">Game Arena</h2>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">Ready to Play</div>
                  </div>
                </div>

                <div className="flex-1 bg-muted/30 rounded-lg border border-border/30 p-6 overflow-hidden">
                  <NFTSelection />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Chat Interface */}
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  )
}
