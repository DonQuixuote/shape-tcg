"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface Web3ContextType {
  account: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  connect: () => Promise<void>
  disconnect: () => void
  switchToShape: () => Promise<void>
  isShapeNetwork: boolean
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [chainId, setChainId] = useState<number | null>(null)

  const isConnected = !!account
  const isShapeNetwork = chainId === 360

  useEffect(() => {
    checkConnection()

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum?.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  const checkConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          const chainId = await window.ethereum.request({ method: "eth_chainId" })
          setChainId(Number.parseInt(chainId, 16))
        }
      } catch (error) {
        console.error("Error checking connection:", error)
      }
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAccount(accounts[0])
    } else {
      setAccount(null)
    }
  }

  const handleChainChanged = (chainId: string) => {
    setChainId(Number.parseInt(chainId, 16))
  }

  const connect = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet")
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length > 0) {
        setAccount(accounts[0])
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        setChainId(Number.parseInt(chainId, 16))
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setAccount(null)
    setChainId(null)
  }

  const switchToShape = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      return
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x168" }], // 360 in hex
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x168",
                chainName: "Shape",
                nativeCurrency: {
                  name: "Ethereum",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://mainnet.shape.network"],
                blockExplorerUrls: ["https://shapescan.xyz"],
              },
            ],
          })
        } catch (addError) {
          console.error("Error adding Shape network:", addError)
        }
      } else {
        console.error("Error switching to Shape network:", switchError)
      }
    }
  }

  return (
    <Web3Context.Provider
      value={{
        account,
        isConnected,
        isConnecting,
        chainId,
        connect,
        disconnect,
        switchToShape,
        isShapeNetwork,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3() {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider")
  }
  return context
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}
