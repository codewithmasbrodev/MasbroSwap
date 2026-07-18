import { adaptSolanaWallet } from "@relayprotocol/relay-solana-wallet-adapter";
import { Connection, VersionedTransaction, Transaction, type SendOptions } from "@solana/web3.js";

/** Relay's internal chain id for Solana (not the same as Solana's own concept of chain). */
export const RELAY_SOLANA_CHAIN_ID = 792703809;

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (
    transaction: Transaction | VersionedTransaction,
    options?: SendOptions,
  ) => Promise<{ signature: string }>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window { solana?: PhantomProvider }
}

export function phantomAvailable() {
  return Boolean(window.solana?.isPhantom);
}

export async function connectPhantom(): Promise<string> {
  if (!window.solana?.isPhantom) throw new Error("Phantom tidak terdeteksi. Pasang ekstensi Phantom dulu.");
  const res = await window.solana.connect();
  return res.publicKey.toString();
}

export function solanaConnection() {
  const rpc = import.meta.env.VITE_RPC_SOLANA || "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

/**
 * Wraps Phantom's injected provider into the (transaction, connection, options) => signature
 * shape Relay's adapter expects — same shape as @solana/wallet-adapter's sendTransaction.
 */
export function buildRelaySolanaWallet(address: string) {
  const connection = solanaConnection();
  const sendTransaction = async (
    transaction: Transaction | VersionedTransaction,
    _connection: Connection,
    options?: SendOptions,
  ) => {
    if (!window.solana) throw new Error("Phantom tidak terdeteksi.");
    const { signature } = await window.solana.signAndSendTransaction(transaction, options);
    return signature;
  };
  return adaptSolanaWallet(address, RELAY_SOLANA_CHAIN_ID, connection, sendTransaction);
}
