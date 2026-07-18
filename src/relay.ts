import { MAINNET_RELAY_API, createClient, getClient } from "@relayprotocol/relay-sdk";
import { parseUnits } from "viem";
import type { WalletClient } from "viem";
import type { AdminSettings, Chain, Token } from "./types";

/** Shape Relay's SDK passes into execute()'s onProgress — kept loose since the
 *  exact fields can grow between SDK versions; we only read what we display. */
export type RelayProgressEvent = {
  steps?: Array<{ id?: string; action?: string; description?: string; items?: Array<{ status?: string; txHashes?: Array<{ txHash?: string; chainId?: number }> }> }>;
  currentStep?: { id?: string; action?: string; description?: string } | null;
  currentStepItem?: { status?: string; txHashes?: Array<{ txHash?: string; chainId?: number }> } | null;
  txHashes?: Array<{ txHash?: string; chainId?: number }>;
  requestId?: string;
};

let initialized = false;
export function initRelay() {
  if (!initialized) {
    createClient({
      baseApiUrl: import.meta.env.VITE_RELAY_PROXY_URL || import.meta.env.VITE_RELAY_API_URL || MAINNET_RELAY_API,
      apiKey: import.meta.env.VITE_RELAY_API_KEY,
      source: import.meta.env.VITE_RELAY_SOURCE || window.location.hostname || "masbro-swap",
      pollingInterval: 5000,
      uiVersion: "masbro-swap-v1",
    });
    initialized = true;
  }
  return getClient();
}

export function sponsorshipConfigured() {
  return Boolean(import.meta.env.VITE_RELAY_PROXY_URL && import.meta.env.VITE_SPONSORSHIP_WALLET);
}

export async function fetchRelayQuote(input: {
  fromChain: Chain;
  toChain: Chain;
  fromToken: Token;
  toToken: Token;
  amount: string;
  user: string;
  recipient: string;
  sponsored: boolean;
  slippage: number;
  admin: AdminSettings;
}) {
  const appFees = input.admin.feeRecipient
    ? [{ recipient: input.admin.feeRecipient, fee: input.admin.feeBps.toString() }]
    : undefined;
  return getClient().actions.getQuote({
    chainId: input.fromChain.id,
    toChainId: input.toChain.id,
    currency: input.fromToken.address,
    toCurrency: input.toToken.address,
    amount: parseUnits(input.amount, input.fromToken.decimals).toString(),
    tradeType: "EXACT_INPUT",
    user: input.user,
    recipient: input.recipient,
    options: {
      slippageTolerance: input.slippage.toString(),
      ...(appFees ? { appFees } : {}),
      ...(input.sponsored ? {
        subsidizeFees: true,
        subsidizeRent: input.toChain.family === "svm",
        maxSubsidizationAmount: Math.round(input.admin.sponsorshipCap * 1_000_000).toString(),
      } : {}),
    },
  });
}

/**
 * Actually submits & fills a Relay quote on-chain: signs/sends every step
 * (approval, deposit, etc.) with the user's connected wallet, and streams
 * real-time status back through onProgress as Relay's solver network fills
 * each leg. This replaces any client-side simulation of the swap.
 */
export async function executeRelayQuote(
  quote: unknown,
  wallet: WalletClient | ReturnType<typeof import("@relayprotocol/relay-svm-wallet-adapter").adaptSolanaWallet>,
  onProgress: (event: RelayProgressEvent) => void,
) {
  return getClient().actions.execute({
    quote: quote as never,
    wallet: wallet as never,
    onProgress: (event: unknown) => onProgress(event as RelayProgressEvent),
  });
}

export function friendlyRelayError(error: unknown) {
  const message = error instanceof Error ? error.message : "Quote Relay tidak tersedia.";
  if (/reject|denied|user cancel/i.test(message)) return "Transaksi dibatalkan di wallet.";
  if (/insufficient/i.test(message)) return "Saldo tidak cukup untuk menyelesaikan swap ini (termasuk gas).";
  if (/route|no quotes|unsupported/i.test(message)) return "Rute ini belum tersedia. Coba token atau chain lain.";
  if (/rate|429/i.test(message)) return "Relay sedang sibuk. Quote akan dicoba kembali.";
  return message.length > 160 ? "Tidak dapat mengambil quote Relay saat ini. Periksa koneksi dan konfigurasi." : message;
}
