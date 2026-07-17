import type { Chain, Token } from "./types";

export const CHAINS: Chain[] = [
  { key: "base", id: 8453, name: "Base", short: "B", color: "#246BFD", native: "ETH", explorer: "https://basescan.org", family: "evm" },
  { key: "arbitrum", id: 42161, name: "Arbitrum", short: "A", color: "#28A0F0", native: "ETH", explorer: "https://arbiscan.io", family: "evm" },
  { key: "ethereum", id: 1, name: "Ethereum", short: "E", color: "#627EEA", native: "ETH", explorer: "https://etherscan.io", family: "evm" },
  { key: "optimism", id: 10, name: "Optimism", short: "O", color: "#FF0420", native: "ETH", explorer: "https://optimistic.etherscan.io", family: "evm" },
  { key: "solana", id: 792703809, name: "Solana", short: "S", color: "#14F195", native: "SOL", explorer: "https://solscan.io", family: "svm" },
  { key: "polygon", id: 137, name: "Polygon", short: "P", color: "#8247E5", native: "POL", explorer: "https://polygonscan.com", family: "evm" },
  { key: "bsc", id: 56, name: "BNB Chain", short: "BNB", color: "#F3BA2F", native: "BNB", explorer: "https://bscscan.com", family: "evm" },
];

const allEvm = CHAINS.filter((chain) => chain.family === "evm").map((chain) => chain.key);
export const TOKENS: Token[] = [
  { symbol: "USDC", name: "USD Coin", address: "0x0000000000000000000000000000000000000000", decimals: 6, color: "#2775CA", chains: CHAINS.map((c) => c.key) },
  { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000", decimals: 18, color: "#627EEA", chains: ["ethereum", "base", "arbitrum", "optimism"] },
  { symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, color: "#26A17B", chains: CHAINS.map((c) => c.key) },
  { symbol: "SOL", name: "Solana", address: "11111111111111111111111111111111", decimals: 9, color: "#14F195", chains: ["solana"] },
  { symbol: "WBTC", name: "Wrapped Bitcoin", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8, color: "#F7931A", chains: allEvm },
  { symbol: "DAI", name: "Dai", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, color: "#F5AC37", chains: allEvm },
];

export const getChain = (key: string) => CHAINS.find((chain) => chain.key === key) ?? CHAINS[0];
export const getToken = (symbol: string) => TOKENS.find((token) => token.symbol === symbol) ?? TOKENS[0];
