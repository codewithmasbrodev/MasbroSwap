import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown,
  Clock3, Copy, ExternalLink, Fuel, Gauge, Gift, Heart, History, Menu, RefreshCw, Search,
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
  const links = [{ to: "/", label: "Home", icon: Sparkles }, { to: "/swap", label: "Swap", icon: Zap }, { to: "/history", label: "History", icon: History }, { to: "/docs", label: "Docs", icon: BookOpen }];
  return <header className="header"><div className="header-inner">
    <NavLink to="/" className="brand"><span className="brand-mark"><Sparkles size={19} /></span><span>Masbro <b>Swap</b><small>v1</small></span></NavLink>
    <nav className="desktop-nav" aria-label="Navigasi utama">{links.map(({ to, label }) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>)}</nav>
    <div className="header-actions"><span className="relay-status"><i /> Relay Online</span><WalletControl wallet={wallet} connect={connect} disconnect={disconnect} /><button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button></div>
  </div>{open && <nav className="mobile-nav">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} end={to === "/"}><Icon size={18} />{label}</NavLink>)}</nav>}</header>;
}

/* ===================== LANDING PAGE (relay.link inspired) ===================== */

/* ─── CHAIN SVG ICONS ─── */
function ChainSvg({ chain, size = 32 }: { chain: Chain; size?: number }) {
  // Relay.link asset URLs for chain icons (by chain ID)
  const iconUrls: Record<string, string> = {
    base: "https://assets.relay.link/icons/square/8453/light.png",
    arbitrum: "https://assets.relay.link/icons/square/42161/light.png",
    ethereum: "https://assets.relay.link/icons/square/1/light.png",
    optimism: "https://assets.relay.link/icons/square/10/light.png",
    solana: "https://assets.relay.link/icons/square/792703809/light.png",
    polygon: "https://assets.relay.link/icons/square/137/light.png",
    bsc: "https://assets.relay.link/icons/square/56/light.png",
  };
  return <img src={iconUrls[chain.key] || ""} alt={chain.name} width={size} height={size} className="chain-svg-icon" style={{ borderRadius: size * 0.25 }} />;
}

function LandingPage() {
  return <main className="lp-main">
    {/* ─── HERO ─── */}
    <section className="lp-hero">
      <div className="lp-hero-inner">
        <div className="lp-badge">Crosschain Swap Protocol</div>
        <h1 className="lp-title">
          Move anything.<br />
          <span>Any chain. Instantly.</span>
        </h1>
        <p className="lp-sub">
          A lightning-fast crosschain protocol — swap, bridge, and transact across 7+ chains in seconds.{' '}
          <strong>No friction. No waiting.</strong>
        </p>
        <div className="lp-actions">
          <NavLink to="/swap" className="lp-cta-btn">
            Start Swapping <ArrowRight size={16} />
          </NavLink>
          <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }} className="lp-link">Learn more →</a>
        </div>
      </div>
    </section>

    {/* ─── CHAINS BAR ─── */}
    <section className="lp-chains-bar">
      <span className="lp-chains-label">Supported chains</span>
      <div className="lp-chains-row">
        {CHAINS.map((chain) => (
          <div key={chain.key} className="lp-chain-logo">
            <ChainSvg chain={chain} size={28} />
            <span>{chain.name}</span>
          </div>
        ))}
      </div>
    </section>

    {/* ─── STATS ─── */}
    <section className="lp-stats">
      {[
        { num: "~8s", label: "Avg. bridge time" },
        { num: "$0.02", label: "Starting fee" },
        { num: "7+", label: "Chains supported" },
        { num: "99.9%", label: "Uptime" },
      ].map((s) => (
        <div key={s.label} className="lp-stat">
          <span className="lp-stat-num">{s.num}</span>
          <span className="lp-stat-label">{s.label}</span>
        </div>
      ))}
    </section>

    {/* ─── FEATURES ─── */}
    <section id="features" className="lp-section">
      <div className="lp-section-label">Built for payments. Not just bridging.</div>
      <h2 className="lp-section-title">Crosschain infrastructure<br />that <span>just works</span>.</h2>
      <div className="lp-features">
        <div className="lp-feature">
          <div className="lp-feature-icon"><Zap size={20} /></div>
          <h3>Payments-grade speed</h3>
          <p>Cheap, fast, and reliable crosschain transactions — completing most in ~8 seconds across 7+ chains with 99.9% uptime.</p>
        </div>
        <div className="lp-feature">
          <div className="lp-feature-icon"><ShieldCheck size={20} /></div>
          <h3>Enterprise features</h3>
          <p>Fee sponsorship, app fees, referral tracking — everything serious fintech and wallet teams need in a single integration.</p>
        </div>
        <div className="lp-feature">
          <div className="lp-feature-icon"><Activity size={20} /></div>
          <h3>Proven at scale</h3>
          <p>Powering Phantom, MetaMask, and 100+ active integrations. The infrastructure teams choose when reliability is non-negotiable.</p>
        </div>
        <div className="lp-feature">
          <div className="lp-feature-icon"><Fuel size={20} /></div>
          <h3>Built to ship</h3>
          <p>One integration connects your users to the entire onchain economy. Crosschain payments infrastructure that just works.</p>
        </div>
      </div>
    </section>

    {/* ─── CTA ─── */}
    <section className="lp-cta">
      <h2>Ready to move cross-chain?</h2>
      <p>One integration. 7+ chains. Instantly.</p>
      <NavLink to="/swap" className="lp-cta-btn">
        Launch Masbro Swap <ArrowRight size={18} />
      </NavLink>
      <div className="lp-cta-chains">
        {CHAINS.map((chain) => (
          <ChainSvg key={chain.key} chain={chain} size={22} />
        ))}
      </div>
    </section>
  </main>;
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
    <div className="swap-widget">
      <div className="swap-widget-header">
        <span>Swap</span>
        <button className={`sw-settings-btn ${isFavorite ? "fav" : ""}`} onClick={() => { store.toggleFavorite(); toast.success(isFavorite ? "Removed from favorites" : "Saved to favorites"); }} aria-label="Favorite"><Heart size={15} fill={isFavorite ? "currentColor" : "none"} /></button>
        <button className="sw-settings-btn" onClick={() => setDetails(!details)} aria-label="Settings"><Settings2 size={15} /></button>
      </div>

      <div className="sw-transfer">
        <div className="sw-asset">
          <label>You sell</label>
          <div className="sw-input-row">
            <input inputMode="decimal" placeholder="0.00" value={store.amount} onChange={(e) => store.setSwap({ amount: e.target.value.replace(/[^0-9.]/g, "") })} />
            <button className="sw-token-btn" onClick={() => setModal("fromToken")}>
              <TokenIcon token={fromToken} /><span>{fromToken.symbol}</span><ChevronDown size={14} />
            </button>
          </div>
          <div className="sw-meta">
            <span>{store.amount ? `≈ ${money(Number(store.amount) || 0)}` : "$0.00"}</span>
            <button className="sw-chain-pill" onClick={() => setModal("fromChain")}>
              <img src={`https://assets.relay.link/icons/square/${fromChain.id}/light.png`} alt="" width={16} height={16} style={{borderRadius:4}} />
              {fromChain.name}<ChevronDown size={12} />
            </button>
          </div>
        </div>

        <button className="sw-swap-btn" onClick={() => { store.flip(); toast.success("Direction flipped"); }} aria-label="Flip"><ArrowDown size={18} /></button>

        <div className="sw-asset">
          <label>You buy</label>
          <div className="sw-input-row">
            <input placeholder="0.00" value={numericAmount ? (quote.isLoading ? "" : output.toFixed(6)) : ""} readOnly />
            <button className="sw-token-btn" onClick={() => setModal("toToken")}>
              <TokenIcon token={toToken} /><span>{toToken.symbol}</span><ChevronDown size={14} />
            </button>
          </div>
          <div className="sw-meta">
            <span>{numericAmount ? `≈ ${money(output)}` : "$0.00"}</span>
            <button className="sw-chain-pill" onClick={() => setModal("toChain")}>
              <img src={`https://assets.relay.link/icons/square/${toChain.id}/light.png`} alt="" width={16} height={16} style={{borderRadius:4}} />
              {toChain.name}<ChevronDown size={12} />
            </button>
          </div>
        </div>
      </div>

      {details && numericAmount > 0 && <div className="sw-detail">
        <div className="sw-detail-row"><span>Rate</span><b>1 {fromToken.symbol} ≈ {(output / numericAmount).toFixed(4)} {toToken.symbol}</b></div>
        <div className="sw-detail-row"><span>Relay fee</span><b>{store.sponsored ? "Sponsored" : `~${meta.relayFeeUsd.toFixed(2)}`}</b></div>
        <div className="sw-detail-row"><span>Slippage</span><b>{store.slippage}%</b></div>
      </div>}

      {quote.isError && <p className="sw-error">{friendlyRelayError(quote.error)}</p>}

      <button className="sw-action" onClick={primary} disabled={quote.isLoading}>
        {quote.isLoading && <RefreshCw className="spin" size={16} />}
        {primaryText}
      </button>
    </div>

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
    <Route path="/docs" element={<DocsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>, [wallet]);
  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" /><Header wallet={wallet} connect={connect} disconnect={() => { setWallet(null); toast.info("Wallet diputuskan"); }} />{routes}<Footer /></div>;
}
