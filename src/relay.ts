import { MAINNET_RELAY_API, createClient, getClient } from "@relayprotocol/relay-sdk";
import { parseUnits } from "viem";
import type { AdminSettings, Chain, Token } from "./types";

let initialized = false;
export function initRelay() {
  if (!initialized) {
    createClient({
      baseApiUrl: import.meta.env.VITE_RELAY_PROXY_URL || import.meta.env.VITE_RELAY_API_URL || MAINNET_RELAY_API,
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

export function friendlyRelayError(error: unknown) {
  const message = error instanceof Error ? error.message : "Quote Relay tidak tersedia.";
  if (/route|no quotes|unsupported/i.test(message)) return "Rute ini belum tersedia. Coba token atau chain lain.";
  if (/rate|429/i.test(message)) return "Relay sedang sibuk. Quote akan dicoba kembali.";
  return message.length > 160 ? "Tidak dapat mengambil quote Relay saat ini. Periksa koneksi dan konfigurasi." : message;
}
