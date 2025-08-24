export const SHAPE_NETWORK = {
  chainId: 360,
  name: "Shape",
  currency: "ETH",
  rpcUrl: "https://mainnet.shape.network",
  blockExplorer: "https://shapescan.xyz",
} as const

export const SHAPE_NETWORK_CONFIG = {
  chainId: `0x${SHAPE_NETWORK.chainId.toString(16)}`, // 0x168
  chainName: SHAPE_NETWORK.name,
  nativeCurrency: {
    name: "Ethereum",
    symbol: SHAPE_NETWORK.currency,
    decimals: 18,
  },
  rpcUrls: [SHAPE_NETWORK.rpcUrl],
  blockExplorerUrls: [SHAPE_NETWORK.blockExplorer],
}
