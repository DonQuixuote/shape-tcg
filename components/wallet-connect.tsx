"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { useWeb3 } from "@/contexts/web3-context"

export function WalletConnect() {
  const { isConnected, isConnecting, connect, disconnect } = useWeb3()

  if (isConnected) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <Button variant="ghost" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <Button onClick={connect} disabled={isConnecting} size="sm">
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
