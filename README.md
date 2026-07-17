# Masbro Swap v1

Aplikasi cross-chain swap & bridge modern berbasis React, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query, dan Relay Protocol SDK resmi. Target runtime adalah static assets; tidak ada database, server function, atau secret di bundle.

## Fitur final

- Quote Relay real-time untuk 7 chain EVM/Solana dengan search token dan recipient alternatif.
- Route comparison, price impact warning, slippage 0,1%–1%, minimum received, dan fee breakdown transparan.
- Masbro Fee default 0,35%, sponsorship cap, `subsidizeFees`, dan `subsidizeRent` untuk tujuan Solana.
- Favorite pairs, referral share link, progress stepper, confetti, hasil yang dapat dibagikan, serta riwayat detail lokal.
- Dashboard analytics lokal, accrued fee/claim handoff, pengaturan fee, sponsorship threshold, target, dan auto top-up policy.
- Mobile bottom sheet, glassmorphism, accessible focus states, loading/error states, toast, dan reduced-motion support.

## Menjalankan

```bash
npm install
cp .env.example .env.local
npm run dev
```

Pemeriksaan produksi:

```bash
npm run typecheck
npm run build
```

Output statis berada di `dist/` dan dapat diterbitkan ke Vercel, Cloudflare Pages, Netlify, atau static host lain. Atur SPA rewrite menuju `index.html` bila host digunakan untuk deep link.

## Konfigurasi Relay

Client dibuat sekali melalui `createClient`, lalu operasi menggunakan `getClient().actions.getQuote`. Tanpa proxy, aplikasi menggunakan `https://api.relay.link` dan sponsorship dinonaktifkan secara jujur.

- `VITE_RELAY_SOURCE`: domain/source yang terdaftar di Relay.
- `VITE_RELAY_API_URL`: endpoint API publik.
- `VITE_RELAY_PROXY_URL`: proxy eksternal yang menyimpan Relay API key dan kebijakan sponsorship.
- `VITE_DEFAULT_APP_FEE_RECIPIENT`: alamat EVM penerima app fee.
- `VITE_DEFAULT_APP_FEE_BPS`: 30–50 basis points.
- `VITE_SPONSORSHIP_WALLET`: alamat publik sponsorship.

Semua `VITE_*` bersifat **publik**. Jangan pernah menaruh Relay API key, private key, seed phrase, signer credential, atau token admin di variabel Vite.

## App fee dan sponsorship

Quote mengirim `options.appFees` ketika fee recipient valid. Default Masbro Fee adalah 35 bps (0,35%) dan dapat diatur 30–50 bps. Dashboard menyimpan setting operator di `localStorage` dan quote berikutnya menggunakan nilai tersebut. Sponsorship mengirim `subsidizeFees`, `subsidizeRent` untuk tujuan Solana, serta `maxSubsidizationAmount` dalam USDC 6 decimals, tetapi hanya aktif jika secure proxy dan sponsorship wallet dikonfigurasi.

"Destination fees sponsored" tidak selalu berarti origin-chain gas gratis. Approval token pertama, origin gas, dan Solana rent mungkin tetap berlaku.

## Auto top-up produksi

Aplikasi statis tidak dapat menjalankan scheduler atau menjaga signer. Implementasikan keeper/cron eksternal:

1. Baca sponsorship/app balance melalui Relay dengan credential server-side.
2. Bandingkan balance dengan threshold dan gunakan distributed lock untuk mencegah top-up ganda.
3. Terapkan nominal maksimum, cooldown, daily spend cap, dan allowlist alamat.
4. Gunakan managed signer atau hot wallet terbatas pada Base.
5. Transfer Base USDC menuju solver Relay menggunakan calldata credit resmi untuk sponsorship wallet.
6. Tunggu receipt, verifikasi balance kembali, simpan audit log, dan kirim alert saat gagal.
7. Jangan mengeksekusi jika data chain, token, solver, atau credited address tidak persis sesuai konfigurasi tervalidasi.

Manual top-up pada UI sengaja berupa review/informasi sampai solver address dan credit calldata resmi dikonfigurasi. Ini mencegah transfer ke alamat placeholder.

## Data dan keamanan

- Riwayat transaksi serta setting dashboard hanya disimpan di browser ini.
- Riwayat lokal bukan indeks lengkap aktivitas wallet.
- Tidak ada seed phrase/private key yang disimpan.
- Gunakan HTTPS, CSP, RPC yang andal, rate limiting pada proxy, dan validasi origin untuk produksi.
- Wallet Solana memerlukan adapter provider khusus sebelum signing; UI tidak mengklaim transaksi Solana live jika adapter belum tersedia.

## Struktur penting

- `src/App.tsx`: route, layout, swap, history, dashboard, docs, wallet UI.
- `src/relay.ts`: singleton Relay dan typed quote helper.
- `src/config.ts`: chain dan popular-token fallback.
- `src/store.ts`: Zustand persistent browser state.
- `src/styles.css`: dark cyber design system responsif.

## Rekomendasi v2

- Tambahkan secure Relay proxy/edge worker terpisah dengan authentication, origin allowlist, rate limit, dan secret API key.
- Integrasikan adapter signing Wagmi/RainbowKit dan Solana Wallet Standard secara penuh, lalu pantau request status Relay hingga final.
- Gunakan indexer eksternal untuk history lintas perangkat, attribution referral tervalidasi, analytics USD berbasis harga, dan claim fee on-chain.
- Jalankan keeper sponsorship terisolasi dengan managed signer, distributed lock, daily cap, alerting, serta audit log.
