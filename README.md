# Bookify — Turn PDFs into Readable Books

<div align="center">

![Bookify — Turn PDFs into Readable Books](./public/og-image.jpg)

### **The tactile, high-craft editorial e-reader for digital minds.**

*Transform dry, rigid PDF documents into living, breathing hardcover books with realistic 3D page turns, crisp supersampled typography, and distraction-free offline reading.*

<br/>

[![Live Demo](https://img.shields.io/badge/Live_Demo-gobookify.onrender.com-111113?style=for-the-badge&logo=render&logoColor=white)](https://gobookify.onrender.com/)
<br/>

[![Deployment](https://img.shields.io/badge/Deployed_at-gobookify.onrender.com-success.svg?style=flat-square)](https://gobookify.onrender.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg?style=flat-square)](./LICENSE)
[![React 19](https://img.shields.io/badge/React-19-black.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-black.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-black.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare_R2-black.svg?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/r2/)

</div>

---

## ✦ Live Deployment

> 🚀 **Experience Bookify live in your browser**:  
> 👉 **[https://gobookify.onrender.com](https://gobookify.onrender.com)**

---

## ✦ Overview

Traditional PDF viewers treat books like flat spreadsheets or endless printer rolls — static, sterile, and fatiguing. **Bookify** restores the physical dignity of literature to digital reading.

Built on an **Editorial Modernism** design language, Bookify pairs warm alabaster parchment backgrounds (`#F8F7F4`), classic literary typography (*Instrument Serif* & *Plus Jakarta Sans*), realistic double-sided 3D page kinematics, and razor-sharp PDF supersampling.

Whether reading timeless classics or technical treatises, Bookify turns reading back into an experience.

---

## ✦ Visual Showcase

<div align="center">

### In-App Reading Experience
![Bookify Reader Mockup](./public/reader-mockup.jpg)
*Buttery smooth 3D page turning, text highlighting, and margin doodles on high-DPI canvas.*

<br/>

| Reading Sanctum | Editorial Flatlay |
| :---: | :---: |
| ![Reading Sanctum](./public/reading-sanctum.jpg) | ![Editorial Flatlay](./public/hero.jpg) |
| *Distraction-free ambient reading* | *Tactile paper and physical craftsmanship* |

<br/>

### Curated Editorial Book Editions
| The Architecture of Silence | The Botanical Codex | Chronicles of Solitude |
| :---: | :---: | :---: |
| ![Architecture of Silence](./public/covers/cover-architecture.jpg) | ![The Botanical Codex](./public/covers/cover-botanical.jpg) | ![Chronicles of Solitude](./public/covers/cover-solitude.jpg) |
| *Modernist geometric debossing* | *Foil-stamped linen press* | *Celestial vintage engraving* |

</div>

---

## ✦ Key Features

### 📖 Kinematic 3D Page Turn Engine
- True double-sided CSS 3D matrix transformations with realistic specular spine shadows and page-curl gradients.
- Hardware-accelerated transitions via GPU compositing (`will-change: transform`, `transform-style: preserve-3d`) — zero canvas stutter or frame drops.
- Supports interactive swipe gestures, keyboard arrow keys (`←` / `→`), and floating capsule dock controls.

### 🔍 High-DPI PDF Supersampling (Zero Blur)
- Dynamic canvas rendering that automatically multiplies internal canvas dimensions by the exact device pixel ratio and active zoom factor.
- Razor-sharp typography and vector charts from 100% to 200% scale without font raster fuzziness.

### 🖐️ Constrained 2-Finger Viewport Panning
- Natural multi-touch viewport panning designed specifically for touchscreens and mobile devices.
- **Strictly constrained**: Pan activates *only* when the document is zoomed in and overflows the viewport, and *strictly requires 2 fingers* so single-finger swipes remain dedicated to page turning.

### ✏️ Vector Doodle & Annotation Suite
- Draw notes directly on margins using a buttery smooth canvas vector doodle engine with configurable pen thickness and color swatches.
- Multi-color text highlighting with instant undo/redo capabilities.
- Persistent page bookmarks stored locally with one-tap navigation.

### ☁️ Cloudflare R2 & Offline-First IndexedDB
- Instant local reads powered by an asynchronous **IndexedDB** engine (`idb`), ensuring complete offline access to your library and bookmarks.
- Seamless sync with **Cloudflare R2** object storage via S3-compatible presigned endpoints for multi-device library access without third-party vendor lock-in.

### 🎨 Editorial Modernism Design System
- Warm cream canvas (`#F8F7F4`), charcoal ink surfaces (`#121214`), and soft ambient shadows.
- Curated typography: **Instrument Serif** for literary poise, **Plus Jakarta Sans** for UI legibility, and **JetBrains Mono** for metrics.
- Purposefully free of artificial glassmorphism or distracting neon gradients.

---

## ✦ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) | Component architecture, state transitions, hooks |
| **Build Tool** | [Vite 6](https://vitejs.dev/) | Lightning-fast HMR and optimized ESM bundling |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Custom Editorial Modernism design tokens & utilities |
| **PDF Engine** | [pdfjs-dist](https://mozilla.github.io/pdf.js/) | PDF parsing and high-fidelity canvas rasterization |
| **Cloud Storage** | [Cloudflare R2](https://developers.cloudflare.com/r2/) via `@aws-sdk/client-s3` | S3-compatible serverless object storage for book assets |
| **Client Storage** | [idb](https://github.com/jakearchibald/idb) (IndexedDB) | Offline book metadata, reading progress, and doodles |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, minimalist icon set matching hairline styling |
| **Hosting** | [Render](https://render.com/) | Global edge hosting at [gobookify.onrender.com](https://gobookify.onrender.com/) |

---

## ✦ Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** or **yarn**

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/bookify.git
cd bookify
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` to supply your Cloudflare R2 credentials (optional for offline testing; a bundled sample book is included out of the box):

```env
VITE_R2_ACCOUNT_ID=your_cloudflare_account_id
VITE_R2_ACCESS_KEY_ID=your_access_key_id
VITE_R2_SECRET_ACCESS_KEY=your_secret_access_key
VITE_R2_BUCKET_NAME=bookify
VITE_R2_PUBLIC_URL=https://your-custom-domain.com
```

> **Note**: `.env` is strictly ignored by `.gitignore` to prevent secret leaks.

### 4. Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build

Create an optimized, minified production bundle:

```bash
npm run build
npm run preview
```

---

## ✦ Project Structure

```
bookify/
├── public/
│   ├── covers/                   # Curated editorial book cover editions
│   │   ├── cover-architecture.jpg
│   │   ├── cover-botanical.jpg
│   │   └── cover-solitude.jpg
│   ├── hero.jpg                  # High-craft editorial flatlay photograph
│   ├── og-image.jpg              # Social Open Graph banner (1200x675)
│   ├── reader-mockup.jpg         # In-app reader showcase on tablet
│   ├── reading-sanctum.jpg       # Ambient reading room photography
│   ├── sample-book.pdf           # Default bundled classic (The Great Gatsby)
│   ├── favicon.svg               # Minimalist serif book favicon
│   └── icons.svg                 # SVG icon spritesheet
├── src/
│   ├── components/
│   │   └── reader/
│   │       ├── BookmarkPanel.jsx    # Slide-over bookmark catalog
│   │       ├── DoodleCanvas.jsx     # Vector pen drawing layer
│   │       ├── HighlightOverlay.jsx # Text highlights layer
│   │       ├── PageTurnContainer.jsx# 3D double-sided sheet flip engine
│   │       └── ReaderControls.jsx   # Floating capsule bottom dock
│   ├── constants/
│   │   └── colors.js             # Editorial color palette tokens
│   ├── pages/
│   │   ├── HomePage.jsx          # Library grid, PDF uploader, search
│   │   └── ReaderPage.jsx        # Dual-page/single-page reading canvas
│   ├── services/
│   │   ├── db.js                 # IndexedDB wrapper (books, progress, notes)
│   │   ├── pdf.js                # PDF.js worker setup & high-DPI renderer
│   │   └── storage.js            # Cloudflare R2 S3 client & presigned URLs
│   ├── App.jsx                   # Router & application layout
│   ├── index.css                 # Design tokens, typography & animations
│   └── main.jsx                  # React DOM initialization
├── .env.example                  # Template environment configuration
├── .gitignore                    # Robust protection against secret leaks
├── LICENSE                       # MIT License
├── README.md                     # Project documentation & live links
├── index.html                    # SEO meta tags, Open Graph & JSON-LD
└── package.json
```

---

## ✦ Contributing

Contributions are welcome! If you'd like to improve Bookify:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ✦ License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

---

<div align="center">
  <sub>Crafted with poise for book lovers everywhere. • <a href="https://gobookify.onrender.com">gobookify.onrender.com</a></sub>
</div>
