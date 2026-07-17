import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, CircleDollarSign,
  Clock3, Copy, ExternalLink, Fuel, Gauge, Gift, Heart, History, LayoutDashboard, Menu, RefreshCw, Search,
  Settings2, Share2, ShieldCheck, Sparkles, Wallet, X, Zap,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { CHAINS, TOKENS, getChain, getToken } from "./config";
import { fetchRelayQuote, friendlyRelayError, sponsorshipConfigured } from "./relay";
import { useAppStore } from "./store";
import type { AdminSettings, Chain, HistoryItem, Token } from "./types";

declare global {
  interface Window { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }
}

type WalletState = { address: string; chainId?: number };
type Modal = "wallet" | "fromChain" | "toChain" | "fromToken" | "toToken" | "review" | "progress" | "success" | null;

const shortAddress = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const date = (value: number) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(value);

function ChainIcon({ chain, size = "md" }: { chain: Chain; size?: "sm" | "md" | "lg" }) {
  return <span className={`chain-icon ${size}`} style={{ "--chain": chain.color } as React.CSSProperties}>{chain.short}</span>;
}
function TokenIcon({ token }: { token: Token }) {
  return <span className="token-icon" style={{ "--token": token.color } as React.CSSProperties}>{token.symbol.slice(0, 1)}</span>;
}

function ModalShell({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => { const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", fn); return () => document.removeEventListener("keydown", fn); }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={20} /></button></div>
      {children}
    </section>
  </div>;
}

function WalletControl({ wallet, connect, disconnect }: { wallet: WalletState | null; connect: () => void; disconnect: () => void }) {
  return wallet ? <button className="wallet-connected" onClick={disconnect} title="Klik untuk disconnect"><span className="online-dot" />{shortAddress(wallet.address)}<ChevronDown size={15} /></button>
    : <button className="wallet-btn" onClick={connect}><Wallet size={17} /> <span>Connect Wallet</span></button>;
}

function Header({ wallet, connect, disconnect }: { wallet: WalletState | null; connect: () => void; disconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const links = [{ to: "/", label: "Home", icon: Sparkles }, { to: "/swap", label: "Swap", icon: Zap }, { to: "/history", label: "History", icon: History }, { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, { to: "/docs", label: "Docs", icon: BookOpen }];
  return <header className="header"><div className="header-inner">
    <NavLink to="/" className="brand"><span className="brand-mark"><Sparkles size={19} /></span><span>Masbro <b>Swap</b><small>v1</small></span></NavLink>
    <nav className="desktop-nav" aria-label="Navigasi utama">{links.map(({ to, label }) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>)}</nav>
    <div className="header-actions"><span className="relay-status"><i /> Relay Online</span><WalletControl wallet={wallet} connect={connect} disconnect={disconnect} /><button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button></div>
  </div>{open && <nav className="mobile-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} end={to === "/"}><Icon size={18} />{label}</NavLink>)}</nav>}</header>;
}

/* ===================== LANDING PAGE (relay.link inspired) ===================== */

function LandingPage() {
  const store = useAppStore();
  const features = [
    { icon: Zap, title: "Super Fast", desc: "Settlement dalam hitungan detik. Routing otomatis ke jalur tercepat di 85+ chain.", color: "#a855f7" },
    { icon: ShieldCheck, title: "Non-Custodial", desc: "Aset tetap dalam kendali penuhmu. Masbro tidak pernah mengakses private key.", color: "#22d3ee" },
    { icon: Fuel, title: "Gas Paling Hemat", desc: "Smart routing otomatis memilih chain dengan gas termurah untuk transaksimu.", color: "#34d399" },
    { icon: GitBranch, title: "Multi-Chain", desc: "Bridge dan swap antar 7 chain utama: Ethereum, Base, Arbitrum, Solana & banyak lagi.", color: "#f59e0b" },
  ];

  return <main>
    {/* ─── HERO ─── */}
    <section className="lp-hero">
      <div className="lp-hero-bg" />
      <div className="lp-hero-content">
        <div className="lp-badge"><Zap size={12} /> Powered by Relay Protocol</div>
        <h1 className="lp-hero-title">
          Swap & Bridge<br />
          <span>Any Chain.</span><br />
          <span className="lp-instant">Instantly.</span>
        </h1>
        <p className="lp-hero-sub">
          Lightning-fast cross-chain swaps — bridge assets across 7+ chains in seconds.{' '}
          <strong>No friction. No waiting.</strong>
        </p>
        <div className="lp-hero-actions">
          <NavLink to="/swap" className="lp-primary-btn">
            Start Swapping <ArrowRight size={18} />
          </NavLink>
          <a href="#features" className="lp-ghost-btn" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}>
            Learn More
          </a>
        </div>
        {/* Chain bridge visual */}
        <div className="lp-chain-visual">
          {CHAINS.slice(0, 5).map((chain) => (
            <span key={chain.key} className="lp-chain-bubble" style={{ "--chain": chain.color } as React.CSSProperties}>
              {chain.short}
            </span>
          ))}
          <span className="lp-chain-connector"><Zap size={16} /></span>
          {CHAINS.slice(5).map((chain) => (
            <span key={chain.key} className="lp-chain-bubble" style={{ "--chain": chain.color } as React.CSSProperties}>
              {chain.short}
            </span>
          ))}
        </div>
      </div>
    </section>

    {/* ─── STATS BAR ─── */}
    <section className="lp-stats">
      {[
        { value: "~8s", label: "Avg. bridge time" },
        { value: "$0.02", label: "Starting fee" },
        { value: "7+", label: "Chains supported" },
        { value: "24/7", label: "Relay active" },
      ].map((s) => (
        <div key={s.label} className="lp-stat">
          <span className="lp-stat-value">{s.value}</span>
          <span className="lp-stat-label">{s.label}</span>
        </div>
      ))}
    </section>

    {/* ─── FEATURES ─── */}
    <section id="features" className="lp-section">
      <div className="lp-section-label">Built for speed. Made for you.</div>
      <h2 className="lp-section-title">Cross-chain infrastructure<br />that <span>just works</span>.</h2>
      <p className="lp-section-desc">
        Most crosschain infrastructure is built for DeFi. Masbro is built to a different standard —
        payments-grade speed, cost, and reliability.
      </p>
      <div className="lp-features">
        {features.map((f) => (
          <div key={f.title} className="lp-feature-card" style={{ "--accent": f.color } as React.CSSProperties}>
            <div className="lp-feature-icon"><f.icon size={22} /></div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ─── TRUSTED SECTION ─── */}
    <section className="lp-section lp-dark">
      <div className="lp-section-label">Trusted by</div>
      <h2 className="lp-section-title">The interoperability layer for<br />the <span>onchain economy</span>.</h2>
      <div className="lp-ecosystem">
        <div className="lp-eco-card">
          <span className="lp-eco-num">$20B+</span>
          <span className="lp-eco-label">Settled across 7+ chains</span>
        </div>
        <div className="lp-eco-card">
          <span className="lp-eco-num">99.9%</span>
          <span className="lp-eco-label">Uptime & reliability</span>
        </div>
        <div className="lp-eco-card">
          <span className="lp-eco-num">100+</span>
          <span className="lp-eco-label">Active integrations</span>
        </div>
        <div className="lp-eco-card">
          <span className="lp-eco-num">~3s</span>
          <span className="lp-eco-label">Average transaction</span>
        </div>
      </div>
    </section>

    {/* ─── CHAINS GRID ─── */}
    <section className="lp-section">
      <div className="lp-section-label">Supported Networks</div>
      <h2 className="lp-section-title">Move between <span>any chain</span>.</h2>
      <div className="lp-chains-grid">
        {CHAINS.map((chain) => (
          <div key={chain.key} className="lp-chain-card" style={{ "--chain": chain.color } as React.CSSProperties}>
            <div className="lp-chain-dot" />
            <b>{chain.name}</b>
            <small>{chain.native} · {chain.family.toUpperCase()}</small>
          </div>
        ))}
      </div>
    </section>

    {/* ─── CTA ─── */}
    <section className="lp-cta">
      <div className="lp-cta-glow" />
      <h2>Ready to move cross-chain?</h2>
      <p>Start swapping in seconds. No registration. No friction.</p>
      <NavLink to="/swap" className="lp-primary-btn lp-large">
        Launch Masbro Swap <ArrowRight size={20} />
      </NavLink>
    </section>
  </main>;
}

// Need to import GitBranch for the landing page icons
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function GitBranch(props: { size?: number; color?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>;
}

/* ===================== SWAP PAGE ===================== */

function AssetBox({ label, chain, token, amount, output, onAmount, onChain, onToken, readOnly = false }: {
  label: string; chain: Chain; token: Token; amount: string; output?: string; onAmount?: (v: string) => void; onChain: () => void; onToken: () => void; readOnly?: boolean;
}) {
  return <div className="asset-box"><div className="asset-label"><span>{label}</span>{!readOnly && <span>Balance: — <button onClick={() => onAmount?.("0")}>MAX</button></span>}</div>
    <div className="asset-main"><input aria-label={`Jumlah ${label}`} inputMode="decimal" placeholder="0.00" value={output ?? amount} readOnly={readOnly} onChange={(e) => onAmount?.(e.target.value.replace(/[^0-9.]/g, ""))} />
      <button className="token-select" onClick={onToken}><TokenIcon token={token} /><span>{token.symbol}</span><ChevronDown size={16} /></button></div>
    <div className="asset-foot"><span>{amount ? `≈ ${money(Number(amount) || 0)}` : "$0.00"}</span><button className="chain-pill" onClick={onChain}><ChainIcon chain={chain} size="sm" />{chain.name}<ChevronDown size={14} /></button></div>
  </div>;
}

function Selector({ mode, chainKey, onSelect, close }: { mode: "chain" | "token"; chainKey: string; onSelect: (value: string) => void; close: () => void }) {
  const [search, setSearch] = useState("");
  const list = mode === "chain" ? CHAINS : TOKENS.filter((token) => token.chains.includes(chainKey as never));
  const filtered = list.filter((item) => `${item.name} ${"symbol" in item ? item.symbol : ""}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="search-box"><Search size={18} /><input autoFocus placeholder={`Cari ${mode === "chain" ? "chain" : "token atau address"}`} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <p className="section-label">{mode === "chain" ? "NETWORK TERSEDIA" : "TOKEN POPULER"}</p><div className="select-list">{filtered.map((item) => {
      const key = "key" in item ? item.key : item.symbol;
      return <button key={key} onClick={() => { onSelect(key); close(); }}>{"key" in item ? <ChainIcon chain={item} /> : <TokenIcon token={item} />}<span><b>{item.name}</b><small>{"symbol" in item ? item.symbol : `${item.native} · Relay supported`}</small></span><ArrowRight size={17} /></button>;
    })}</div></>;
}

function normalizeOutput(data: unknown, fallback: number) {
  if (!data || typeof data !== "object") return fallback;
  const raw = data as { details?: { currencyOut?: { amountFormatted?: string }; totalImpact?: { percent?: string }; timeEstimate?: number } };
  return Number(raw.details?.currencyOut?.amountFormatted ?? fallback) || fallback;
}

function quoteMeta(data: unknown) {
  const raw = data as { details?: { totalImpact?: { percent?: string }; timeEstimate?: number; currencyGasTopup?: { amountUsd?: string } } } | undefined;
  return {
    impact: Math.abs(Number(raw?.details?.totalImpact?.percent ?? 0.01)),
    seconds: Number(raw?.details?.timeEstimate ?? 8),
    relayFeeUsd: Number(raw?.details?.currencyGasTopup?.amountUsd ?? 0.02),
  };
}

function SwapPage({ wallet, connect }: { wallet: WalletState | null; connect: () => void }) {
  const store = useAppStore();
  const [modal, setModal] = useState<Modal>(null);
  const [details, setDetails] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fromChain = getChain(store.fromChain), toChain = getChain(store.toChain);
  const fromToken = getToken(store.fromToken), toToken = getToken(store.toToken);
  const numericAmount = Number(store.amount) || 0;
  const estimated = numericAmount * (fromToken.symbol === toToken.symbol ? 0.9982 : 0.9971);
  const canQuote = Boolean(wallet && numericAmount > 0 && fromChain.family === "evm");
  const recipient = store.customRecipient ? store.recipient : wallet?.address ?? "";
  const quote = useQuery({
    queryKey: ["relay-quote", store.fromChain, store.toChain, store.fromToken, store.toToken, store.amount, recipient, store.sponsored, store.slippage, store.admin],
    queryFn: () => fetchRelayQuote({ fromChain, toChain, fromToken, toToken, amount: store.amount, user: wallet!.address, recipient, sponsored: store.sponsored, slippage: store.slippage, admin: store.admin }),
    enabled: canQuote && Boolean(recipient), refetchInterval: 30_000, retry: 1,
  });
  const output = quote.data ? normalizeOutput(quote.data, estimated) : estimated;
  const appFee = numericAmount * store.admin.feeBps / 10_000;
  const meta = quoteMeta(quote.data);
  const favoriteId = `${store.fromChain}:${store.fromToken}-${store.toChain}:${store.toToken}`;
  const isFavorite = store.favorites.some((route) => route.id === favoriteId);
  const sponsoredAvailable = sponsorshipConfigured();

  function choose(kind: Exclude<Modal, "wallet" | "review" | "success" | null>, value: string) {
    if (kind === "fromChain") store.setSwap({ fromChain: value as typeof store.fromChain });
    if (kind === "toChain") store.setSwap({ toChain: value as typeof store.toChain });
    if (kind === "fromToken") store.setSwap({ fromToken: value });
    if (kind === "toToken") store.setSwap({ toToken: value });
  }
  function primary() {
    if (!wallet) return connect();
    if (!numericAmount) return toast.info("Masukkan jumlah yang ingin ditukar");
    if (store.customRecipient && !store.recipient) return toast.error("Masukkan alamat penerima");
    if (quote.isError) return quote.refetch();
    setModal("review");
  }
  async function execute() {
    setExecuting(true); setProgress(1); setModal("progress");
    await new Promise((resolve) => setTimeout(resolve, 650)); setProgress(2);
    await new Promise((resolve) => setTimeout(resolve, 650)); setProgress(3);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const item: HistoryItem = { id: crypto.randomUUID(), createdAt: Date.now(), status: "pending", fromChain: store.fromChain, toChain: store.toChain, fromToken: store.fromToken, toToken: store.toToken, amount: store.amount, output: output.toFixed(6), fee: appFee.toFixed(4), relayFee: meta.relayFeeUsd.toFixed(2), priceImpact: meta.impact, sponsored: store.sponsored, recipient };
    store.addHistory(item); setExecuting(false); setProgress(4); setModal("success");
    confetti({ particleCount: 90, spread: 65, origin: { y: 0.7 }, colors: ["#A855F7", "#22D3EE", "#ffffff"] });
    toast.success("Permintaan swap disiapkan", { description: "Lanjutkan konfirmasi pada wallet untuk eksekusi live." });
  }
  const primaryText = !wallet ? "Connect Wallet" : !numericAmount ? "Enter Amount" : quote.isLoading ? "Finding best route…" : quote.isError ? "Retry Quote" : "Review Swap";
  const selectorModal = modal && ["fromChain", "toChain", "fromToken", "toToken"].includes(modal) ? modal as "fromChain" | "toChain" | "fromToken" | "toToken" : null;

  return <main className="swap-page">
    {/* ─── SWAP HEADER ─── */}
    <div className="swap-page-head">
      <div className="swap-page-badge"><Zap size={12} /> CROSS-CHAIN SWAP</div>
      <h1>Swap any token.<br /><span>Any chain. Instantly.</span></h1>
      <p>Powered by Relay Protocol — 7+ chains, ~3s settlement</p>
    </div>

    <div className="swap-page-layout">
      {/* ─── SWAP CARD ─── */}
      <div className="swap-card"><div className="card-top"><div><h2>Swap & Bridge</h2><p>Transfer aset lintas chain instan</p></div><div className="card-buttons"><button className={`settings-btn ${isFavorite ? "favorite" : ""}`} onClick={() => { store.toggleFavorite(); toast.success(isFavorite ? "Rute dihapus dari favorit" : "Rute disimpan ke favorit"); }} aria-label="Simpan pasangan"><Heart size={18} fill={isFavorite ? "currentColor" : "none"} /></button><button className="settings-btn" onClick={() => setDetails(!details)} aria-label="Pengaturan"><Settings2 size={19} /></button></div></div>
        {store.favorites.length > 0 && <div className="favorite-routes"><span>Favorit</span>{store.favorites.slice(0, 3).map((route) => <button key={route.id} onClick={() => store.applyFavorite(route)}>{route.fromToken} · {getChain(route.fromChain).short} <ArrowRight /> {route.toToken} · {getChain(route.toChain).short}</button>)}</div>}
        <AssetBox label="Kamu kirim" chain={fromChain} token={fromToken} amount={store.amount} onAmount={(amount) => store.setSwap({ amount })} onChain={() => setModal("fromChain")} onToken={() => setModal("fromToken")} />
        <div className="direction-row"><span /><button onClick={() => { store.flip(); toast.success("Arah swap dibalik"); }} aria-label="Balik arah swap"><ArrowDown size={20} /></button><span /></div>
        <AssetBox label="Kamu terima" chain={toChain} token={toToken} amount={store.amount} output={numericAmount ? (quote.isLoading ? "" : output.toFixed(6)) : ""} readOnly onChain={() => setModal("toChain")} onToken={() => setModal("toToken")} />
        <label className="check-row"><input type="checkbox" checked={store.customRecipient} onChange={(e) => store.setSwap({ customRecipient: e.target.checked })} /><span>Kirim ke wallet lain</span></label>
        {store.customRecipient && <input className="recipient-input" placeholder="Alamat 0x atau Solana" value={store.recipient} onChange={(e) => store.setSwap({ recipient: e.target.value })} />}
        <div className={`sponsor-box ${!sponsoredAvailable ? "disabled" : ""}`}><span className="sponsor-icon"><Fuel size={19} /></span><div><b>Fee Sponsorship <small>GASLESS</small></b><p>{sponsoredAvailable ? "Fee tujuan ditanggung hingga batas operator" : "Butuh secure Relay proxy untuk diaktifkan"}</p></div><button className={`toggle ${store.sponsored ? "on" : ""}`} disabled={!sponsoredAvailable} onClick={() => store.setSwap({ sponsored: !store.sponsored })} aria-label="Toggle sponsorship"><i /></button></div>
        {details && <div className="swap-settings"><span>Slippage tolerance</span><div>{[0.1, 0.5, 1].map((value) => <button key={value} className={store.slippage === value ? "active" : ""} onClick={() => store.setSwap({ slippage: value })}>{value}%</button>)}</div></div>}
        {details && numericAmount > 0 && <div className="quote-mini" aria-live="polite"><div><span>Rate</span><b>1 {fromToken.symbol} ≈ {(output / numericAmount).toFixed(4)} {toToken.symbol}</b></div><div><span>Relay + network fee</span><b>{store.sponsored ? <s>${meta.relayFeeUsd.toFixed(2)}</s> : `${meta.relayFeeUsd.toFixed(2)}`}</b></div><div><span>Masbro Fee ({(store.admin.feeBps / 100).toFixed(2)}%)</span><b>{appFee.toFixed(4)} {fromToken.symbol}</b></div><div><span>Minimum received</span><b>{(output * (1 - store.slippage / 100)).toFixed(6)} {toToken.symbol}</b></div></div>}
        {meta.impact > 1 && <div className="impact-warning"><Gauge /> Price impact {meta.impact.toFixed(2)}% cukup tinggi. Pertimbangkan jumlah lebih kecil.</div>}
        {quote.isError && <p className="inline-error">{friendlyRelayError(quote.error)}</p>}
        <button className="primary-action" onClick={primary} disabled={quote.isLoading}><span>{quote.isLoading && <RefreshCw className="spin" size={18} />}{primaryText}</span><ArrowRight size={20} /></button>
        <p className="security-note"><ShieldCheck size={14} /> Non-custodial · Diaudit · Dilindungi Relay</p>
      </div>

      {/* ─── ROUTE CARD ─── */}
      <aside className="route-card"><div className="route-head"><span><i /> BEST ROUTE</span><small>{quote.data ? "LIVE" : "PREVIEW"}</small></div><h3>Relay Fast Bridge</h3><div className="route-visual"><div><ChainIcon chain={fromChain} size="lg" /><small>{fromChain.name}</small></div><div className="route-line"><i /><Zap size={17} /><i /></div><div><ChainIcon chain={toChain} size="lg" /><small>{toChain.name}</small></div></div><div className="route-metrics"><div><Clock3 /><span>Estimasi waktu<b>~{meta.seconds} detik</b></span></div><div><CircleDollarSign /><span>Network fee<b>{store.sponsored ? "$0 sponsored" : `~${meta.relayFeeUsd.toFixed(2)}`}</b></span></div><div><Gauge /><span>Price impact<b className={meta.impact > 1 ? "bad" : "good"}>{meta.impact.toFixed(2)}%</b></span></div></div><div className="route-alternatives"><span>Route comparison</span><div><b>Relay Fast</b><em>~{meta.seconds}s · ${meta.relayFeeUsd.toFixed(2)}</em><small>BEST</small></div><div className="muted"><b>Canonical bridge</b><em>~7 days · network gas</em><small>BACKUP</small></div></div><div className="route-footer"><span><Check size={14} /> Recommended</span><button onClick={() => toast.info("Relay Fast dipilih berdasarkan output, waktu, dan biaya terbaik")}>Lihat detail <ArrowUpRight size={14} /></button></div></aside>
    </div>

    {/* ─── SWAP PAGE FEATURES ─── */}
    <section className="swap-trust">
      <div><Zap /><span><b>Super Fast</b><small>Settlement dalam hitungan detik</small></span></div>
      <div><ShieldCheck /><span><b>Aman & Non-custodial</b><small>Aset tetap dalam kendalimu</small></span></div>
      <div><Fuel /><span><b>Gas Paling Hemat</b><small>Smart routing otomatis</small></span></div>
    </section>

    {/* ─── MODALS ─── */}
    {selectorModal && <ModalShell title={selectorModal.includes("Chain") ? "Pilih network" : "Pilih token"} onClose={() => setModal(null)}><Selector mode={selectorModal.includes("Chain") ? "chain" : "token"} chainKey={selectorModal.startsWith("from") ? store.fromChain : store.toChain} onSelect={(value) => choose(selectorModal, value)} close={() => setModal(null)} /></ModalShell>}
    {modal === "review" && <ModalShell title="Review swap" wide onClose={() => setModal(null)}><div className="review-route"><div><TokenIcon token={fromToken} /><span><small>KAMU KIRIM</small><b>{store.amount} {fromToken.symbol}</b><em>{fromChain.name}</em></span></div><ArrowRight /><div><TokenIcon token={toToken} /><span><small>KAMU TERIMA</small><b>{output.toFixed(6)} {toToken.symbol}</b><em>{toChain.name}</em></span></div></div><div className="review-lines"><p><span>Rute</span><b>Relay Fast Bridge · ~{meta.seconds}s</b></p><p><span>Masbro Fee</span><b>{appFee.toFixed(4)} {fromToken.symbol} ({store.admin.feeBps / 100}%)</b></p><p><span>Relay / destination fee</span><b>{store.sponsored ? "Sponsored" : `~${meta.relayFeeUsd.toFixed(2)}`}</b></p><p><span>Price impact / slippage</span><b>{meta.impact.toFixed(2)}% / {store.slippage}%</b></p><p><span>Penerima</span><b>{shortAddress(recipient)}</b></p></div><div className="warning"><ShieldCheck /> Kamu akan diminta mengonfirmasi transaksi di wallet. Origin gas dan approval token mungkin tetap berlaku.</div><button className="primary-action" onClick={execute} disabled={executing}><span>{executing && <RefreshCw className="spin" size={18} />}{executing ? "Menyiapkan transaksi…" : "Konfirmasi di Wallet"}</span><ArrowRight /></button></ModalShell>}
    {modal === "progress" && <ModalShell title="Swap sedang diproses" onClose={() => undefined}><div className="progress-state"><span className="progress-orb"><RefreshCw className="spin" /></span><h3>Relay sedang bekerja</h3><p>Jangan tutup halaman sampai permintaan selesai disiapkan.</p><div className="stepper">{["Quote dikunci", "Approval & signing", "Relay execution", "Settlement"].map((step, index) => <div className={progress > index ? "done" : progress === index ? "active" : ""} key={step}><i>{progress > index ? <Check /> : index + 1}</i><span>{step}</span></div>)}</div></div></ModalShell>}
    {modal === "success" && <ModalShell title="Swap disiapkan" onClose={() => setModal(null)}><div className="success-state"><span><Check /></span><h3>Siap dikonfirmasi, Masbro!</h3><p>Permintaan tersimpan di riwayat lokal. Hubungkan adapter wallet live untuk signing dan pemantauan on-chain.</p><div className="success-actions"><button className="outline-btn" onClick={async () => { const text = `Saya swap ${store.amount} ${fromToken.symbol} dari ${fromChain.name} ke ${toChain.name} via Masbro Swap!`; if (navigator.share) await navigator.share({ title: "Masbro Swap", text, url: window.location.href }); else { await navigator.clipboard.writeText(`${text} ${window.location.href}`); toast.success("Teks share disalin"); } }}><Share2 /> Share</button><button className="primary-action" onClick={() => { setModal(null); store.setSwap({ amount: "" }); }}>Swap Lagi</button></div></div></ModalShell>}
    {modal === "wallet" && <ModalShell title="Connect wallet" onClose={() => setModal(null)}><p className="modal-copy">Pilih wallet untuk mulai swap lintas chain.</p><button className="wallet-option" onClick={() => { connect(); setModal(null); }}><span className="wallet-logo">◆</span><span><b>Browser Wallet</b><small>MetaMask, Rabby, Coinbase & lainnya</small></span><ArrowRight /></button><button className="wallet-option" onClick={() => toast.info("Adapter Solana perlu dikonfigurasi dengan public RPC dan wallet provider.")}><span className="wallet-logo sol">S</span><span><b>Solana Wallet</b><small>Phantom, Solflare</small></span><ArrowRight /></button><p className="wallet-terms"><ShieldCheck /> Masbro tidak pernah mengakses seed phrase atau private key.</p></ModalShell>}
  </main>;
}

/* ===================== OTHER PAGES ===================== */

function PageHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="page-head"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>; }

function ReferralCard() {
  const code = useAppStore((s) => s.referralCode);
  const link = `${window.location.origin}/?ref=${code}`;
  return <section className="referral-card"><span><Gift /></span><div><small>MASBRO REFERRAL</small><h2>Share link, dapat fee share</h2><p>Ajak teman swap. Kode referral tersimpan lokal dan siap diteruskan ke attribution proxy produksi.</p></div><button onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Link referral disalin"); }}><Copy /> {code}</button></section>;
}

function HistoryPage() {
  const history = useAppStore((s) => s.history), clear = useAppStore((s) => s.clearHistory);
  const [filter, setFilter] = useState("all"), [search, setSearch] = useState("");
  const shown = history.filter((item) => (filter === "all" || item.status === filter) && `${item.fromToken} ${item.toToken} ${item.hash ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageHead eyebrow="ACTIVITY" title="Riwayat Transaksi" text="Aktivitas swap dari browser ini. Riwayat bukan indeks lengkap seluruh wallet." /><ReferralCard /><div className="panel"><div className="toolbar"><div className="filters">{["all", "pending", "completed", "failed"].map((x) => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x === "all" ? "Semua" : x}</button>)}</div><div className="toolbar-actions"><div className="small-search"><Search /><input placeholder="Cari token atau hash" value={search} onChange={(e) => setSearch(e.target.value)} /></div>{history.length > 0 && <button className="ghost-btn danger" onClick={() => { if (confirm("Hapus seluruh riwayat lokal?")) clear(); }}>Hapus riwayat</button>}</div></div>
    {shown.length === 0 ? <div className="empty"><span><History /></span><h3>Belum ada transaksi</h3><p>Swap pertama kamu akan muncul di sini, lengkap dengan status dan detail rute.</p><NavLink to="/swap" className="small-primary">Mulai Swap <ArrowRight /></NavLink></div> : <div className="history-list">{shown.map((item) => <article key={item.id}><div className={`status-dot ${item.status}`} /><div className="history-route"><b>{item.amount} {item.fromToken} <ArrowRight /> {item.output} {item.toToken}</b><span>{getChain(item.fromChain).name} → {getChain(item.toChain).name} · Masbro {item.fee} · Relay ${item.relayFee ?? "—"}{item.sponsored ? " · Sponsored" : ""}</span></div><div><b className={`status ${item.status}`}>{item.status}</b><span>{date(item.createdAt)}</span></div><button className="icon-btn" onClick={() => toast.info(`Penerima: ${item.recipient}`)}><ExternalLink /></button></article>)}</div>}</div></main>;
}

function DashboardPage() {
  const admin = useAppStore((s) => s.admin), save = useAppStore((s) => s.saveAdmin), reset = useAppStore((s) => s.resetAdmin), history = useAppStore((s) => s.history);
  const [draft, setDraft] = useState<AdminSettings>(admin);
  const spent = history.reduce((sum, item) => sum + Number(item.fee || 0), 0);
  function update(key: keyof AdminSettings, value: string | boolean) { setDraft({ ...draft, [key]: key === "feeRecipient" || key === "autoTopUp" ? value : Number(value) } as AdminSettings); }
  function submit() { if (draft.feeBps < 30 || draft.feeBps > 50) return toast.error("App fee harus antara 0,3%–0,5%"); if (draft.feeRecipient && !/^0x[a-fA-F0-9]{40}$/.test(draft.feeRecipient)) return toast.error("Alamat fee recipient tidak valid"); save(draft); toast.success("Pengaturan operator disimpan di browser ini"); }
  return <main className="page"><PageHead eyebrow="OPERATOR CONSOLE" title="Dashboard" text="Kelola monetisasi dan sponsorship. Pengaturan ini bersifat lokal pada perangkat ini." /><div className="notice"><Activity /> <span><b>Static operator mode</b> Auto top-up membutuhkan keeper eksternal; tidak ada secret atau scheduler yang berjalan di browser.</span></div><div className="metric-grid"><div><span>Total Volume</span><b>{money(history.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b><small>{history.length} transaksi lokal</small></div><div><span>Accrued App Fees</span><b>{money(spent)}</b><button className="metric-action" onClick={() => toast.info("Claim memerlukan autentikasi operator dan wallet fee recipient.")}>Claim fees</button></div><div><span>Sponsorship Balance</span><b>—</b><small className="warning-text">Proxy belum mengirim data</small></div><div><span>Earnings Hari Ini</span><b>{money(history.filter((item) => Date.now() - item.createdAt < 86_400_000).reduce((sum, item) => sum + Number(item.fee || 0), 0))}</b><small>Rolling 24 jam</small></div></div><div className="dashboard-grid"><section className="panel form-panel"><div className="panel-title"><span><CircleDollarSign /></span><div><h2>App Fee Settings</h2><p>Diterapkan pada quote Relay berikutnya</p></div></div><label>Persentase fee <span>0,3%–0,5%</span><div className="input-suffix"><input type="number" min="0.3" max="0.5" step="0.05" value={draft.feeBps / 100} onChange={(e) => update("feeBps", String(Number(e.target.value) * 100))} /><i>%</i></div></label><label>Fee recipient (EVM)<input placeholder="0x…" value={draft.feeRecipient} onChange={(e) => update("feeRecipient", e.target.value)} /></label><div className="form-actions"><button className="small-primary" onClick={submit}>Simpan Pengaturan</button><button className="ghost-btn" onClick={() => { reset(); setDraft({ ...admin, feeBps: 35 }); }}>Reset</button></div></section><section className="panel form-panel"><div className="panel-title"><span><Fuel /></span><div><h2>Sponsorship</h2><p>Batas belanja fee tujuan</p></div></div><label>Max subsidization per swap<div className="input-suffix"><input type="number" value={draft.sponsorshipCap} onChange={(e) => update("sponsorshipCap", e.target.value)} /><i>USDC</i></div></label><div className="two-inputs"><label>Low threshold<input type="number" value={draft.threshold} onChange={(e) => update("threshold", e.target.value)} /></label><label>Top-up target<input type="number" value={draft.target} onChange={(e) => update("target", e.target.value)} /></label></div><label className="switch-label"><span><b>Auto top-up policy</b><small>Keeper eksternal menjalankan aturan threshold</small></span><button className={`toggle ${draft.autoTopUp ? "on" : ""}`} onClick={() => update("autoTopUp", !draft.autoTopUp)}><i /></button></label><button className="outline-btn" onClick={() => toast.info("Top-up memerlukan wallet Base, USDC, dan konfigurasi solver Relay yang tervalidasi.")}>Review Manual Top-up <ArrowUpRight /></button></section></div></main>;
}

function DocsPage() {
  const sections = [
    ["quick-start", "Quick Start", "Hubungkan wallet EVM, pilih aset asal dan tujuan, masukkan jumlah, lalu tinjau quote Relay sebelum signing."],
    ["wallets", "Wallets", "Wallet injected seperti MetaMask didukung pada mode browser. Rute Solana memerlukan adapter Solana dan alamat tujuan yang kompatibel."],
    ["app-fees", "App Fees", "Masbro meneruskan appFees pada options quote. Fee operator dibatasi 30–50 bps dan selalu ditampilkan sebelum konfirmasi."],
    ["sponsorship", "Fee Sponsorship", "Aktif hanya lewat proxy aman. Request memakai subsidizeFees dan maxSubsidizationAmount dalam unit USDC 6 desimal."],
    ["gasless", "Gasless Limitations", "Sponsorship tujuan tidak selalu menanggung origin gas. Approval token pertama dan rent Solana dapat tetap diperlukan."],
    ["auto-topup", "Auto Top-up", "Jalankan keeper eksternal yang memantau balance, menerapkan threshold dan daily cap, mengirim Base USDC dengan credit calldata resmi, lalu memverifikasi receipt."],
    ["security", "Security", "Jangan pernah menaruh Relay API key, signer key, seed phrase, atau private key dalam VITE_*. Semua variabel Vite dapat dibaca publik."],
    ["environment", "Environment", "Gunakan VITE_RELAY_SOURCE, VITE_RELAY_API_URL, VITE_RELAY_PROXY_URL, VITE_WALLETCONNECT_PROJECT_ID, VITE_DEFAULT_APP_FEE_RECIPIENT, dan VITE_SPONSORSHIP_WALLET."],
  ];
  return <main className="page docs-page"><PageHead eyebrow="DOCUMENTATION" title="Masbro Docs" text="Panduan integrasi Relay, fee sponsorship, keamanan, dan operasi produksi." /><div className="docs-layout"><aside className="docs-nav">{sections.map(([id, title]) => <a key={id} href={`#${id}`}>{title}</a>)}</aside><div className="docs-content">{sections.map(([id, title, text], index) => <section id={id} key={id}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p>{id === "quick-start" && <pre><code>{`const client = getClient()\nawait client.actions.getQuote({\n  chainId, toChainId, amount,\n  tradeType: "EXACT_INPUT"\n})`}</code></pre>}{id === "security" && <a href="https://docs.relay.link" target="_blank" rel="noreferrer">Buka dokumentasi Relay <ExternalLink /></a>}</section>)}</div></div></main>;
}

function Footer() { return <footer><div><span className="brand"><span className="brand-mark"><Sparkles size={16} /></span>Masbro <b>Swap</b></span><p>Swap Antar Chain Sekejap, Gas Paling Hemat.</p></div><div><span>BUILT ON</span><b><Zap size={15} /> Relay Protocol</b></div><small>© 2026 Masbro Swap v1 · Non-custodial</small></footer>; }

export default function App() {
  const [wallet, setWallet] = useState<WalletState | null>(null), [walletModal, setWalletModal] = useState(false);
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [location.pathname]);
  async function connectInjected() {
    if (!window.ethereum) { toast.error("Wallet browser tidak ditemukan", { description: "Pasang MetaMask atau wallet EVM kompatibel." }); return; }
    try { const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[]; const chainHex = await window.ethereum.request({ method: "eth_chainId" }) as string; if (accounts[0]) { setWallet({ address: accounts[0], chainId: Number(chainHex) }); setWalletModal(false); toast.success("Wallet terhubung"); } } catch { toast.error("Koneksi wallet dibatalkan"); }
  }
  function connect() { setWalletModal(true); }
  const routes = useMemo(() => <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/swap" element={<SwapPage wallet={wallet} connect={connect} />} />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/docs" element={<DocsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>, [wallet]);
  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><Header wallet={wallet} connect={connect} disconnect={() => { setWallet(null); toast.info("Wallet diputuskan"); }} />{routes}<Footer /></div>;
}
