import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminSettings, ChainKey, FavoriteRoute, HistoryItem } from "./types";

const defaultAdmin: AdminSettings = {
  feeBps: Number(import.meta.env.VITE_DEFAULT_APP_FEE_BPS ?? 35),
  feeRecipient: import.meta.env.VITE_DEFAULT_APP_FEE_RECIPIENT ?? "",
  sponsorshipCap: 2,
  threshold: 50,
  target: 200,
  autoTopUp: false,
};

type AppStore = {
  fromChain: ChainKey;
  toChain: ChainKey;
  fromToken: string;
  toToken: string;
  amount: string;
  customRecipient: boolean;
  recipient: string;
  sponsored: boolean;
  slippage: number;
  favorites: FavoriteRoute[];
  referralCode: string;
  history: HistoryItem[];
  admin: AdminSettings;
  setSwap: (patch: Partial<Pick<AppStore, "fromChain" | "toChain" | "fromToken" | "toToken" | "amount" | "customRecipient" | "recipient" | "sponsored" | "slippage">>) => void;
  flip: () => void;
  toggleFavorite: () => void;
  applyFavorite: (route: FavoriteRoute) => void;
  addHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  saveAdmin: (settings: AdminSettings) => void;
  resetAdmin: () => void;
};

export const useAppStore = create<AppStore>()(persist((set) => ({
  fromChain: "base",
  toChain: "arbitrum",
  fromToken: "USDC",
  toToken: "USDC",
  amount: "",
  customRecipient: false,
  recipient: "",
  sponsored: false,
  slippage: 0.5,
  favorites: [],
  referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
  history: [],
  admin: defaultAdmin,
  setSwap: (patch) => set(patch),
  flip: () => set((state) => ({
    fromChain: state.toChain,
    toChain: state.fromChain,
    fromToken: state.toToken,
    toToken: state.fromToken,
  })),
  toggleFavorite: () => set((state) => {
    const id = `${state.fromChain}:${state.fromToken}-${state.toChain}:${state.toToken}`;
    const exists = state.favorites.some((route) => route.id === id);
    return { favorites: exists ? state.favorites.filter((route) => route.id !== id) : [...state.favorites, { id, fromChain: state.fromChain, toChain: state.toChain, fromToken: state.fromToken, toToken: state.toToken }] };
  }),
  applyFavorite: (route) => set({ fromChain: route.fromChain, toChain: route.toChain, fromToken: route.fromToken, toToken: route.toToken }),
  addHistory: (item) => set((state) => ({ history: [item, ...state.history].slice(0, 100) })),
  clearHistory: () => set({ history: [] }),
  saveAdmin: (admin) => set({ admin }),
  resetAdmin: () => set({ admin: defaultAdmin }),
}), { name: "masbro-swap-v1", version: 2, merge: (persisted, current) => {
  const saved = persisted as Partial<AppStore>;
  return { ...current, ...saved, admin: { ...defaultAdmin, ...saved.admin }, favorites: saved.favorites ?? [] };
} }));
