export type ChainKey = "base" | "arbitrum" | "ethereum" | "optimism" | "solana" | "polygon" | "bsc";

export type Chain = {
  key: ChainKey;
  id: number;
  name: string;
  short: string;
  color: string;
  native: string;
  explorer: string;
  family: "evm" | "svm";
};

export type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  color: string;
  chains: ChainKey[];
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  status: "pending" | "completed" | "failed";
  fromChain: ChainKey;
  toChain: ChainKey;
  fromToken: string;
  toToken: string;
  amount: string;
  output: string;
  fee: string;
  relayFee?: string;
  priceImpact?: number;
  sponsored: boolean;
  recipient: string;
  hash?: string;
  requestId?: string;
};

export type FavoriteRoute = {
  id: string;
  fromChain: ChainKey;
  toChain: ChainKey;
  fromToken: string;
  toToken: string;
};

export type AdminSettings = {
  feeBps: number;
  feeRecipient: string;
  sponsorshipCap: number;
  threshold: number;
  target: number;
  autoTopUp: boolean;
};
