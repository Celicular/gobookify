# Bookify Design System — Editorial Modernism

> Inspired by high-craft studio showcases and award-winning voice AI launches (Wispr Flow by ND Studio / Awwwards SOTD).  
> **Aesthetic Core**: High-contrast modern geometric sans paired with elegant editorial serifs, warm parchment surfaces, rich photographic backdrops, and refined hairline pill elements.

---

## 1. Design Principles & Aesthetic Rules

| Rule | Description |
| :--- | :--- |
| **Warm Canvas over Sterile White** | Use soft alabaster/warm cream backgrounds (`#F8F7F4`) rather than cold `#FFFFFF`. |
| **Editorial & Modern Contrast** | Pair confident geometric display sans with literary, high-fashion italic serifs for taglines and quotes. |
| **Tactile & Clean Surfaces** | Solid opaque surfaces with delicate hairline borders (`1px solid rgba(0,0,0,0.08)`) and soft ambient shadows. |
| **No Glassmorphism** | Avoid blurry translucent frosted-glass effects. Cards should have solid warm-cream or pure white fills. |
| **No Neon Gradients** | Rely on natural, warm, muted pastel accents (Lavender, Butter Honey, Soft Ochre). |
| **No Badge Section Headers** | Avoid floating pill badges as section titles; use clean, understated tracked small-caps text (`font-size: 13px; letter-spacing: 0.08em; font-weight: 600; text-transform: uppercase`). |
| **Lively & Engaging Layout** | Keep the viewport active with micro-interactions, pill filter bars, score tables, floating capsule docks, and layered media cards. |

---

## 2. Typography System

### Recommended Google Font Pairings

1. **Display & Interface (Sans-serif)**: `Plus Jakarta Sans`
   - *Why*: Geometric, contemporary, ultra-crisp at both hero scale and micro UI sizes.
   - Weights: `400` (Regular), `500` (Medium), `600` (Semi-Bold), `700` (Bold), `800` (Extra-Bold).
2. **Editorial Taglines & Accents (Serif)**: `Instrument Serif` (or `Newsreader`)
   - *Why*: Editorial poise and expressive italics, matching the Wispr Flow quote/feature headline styling (*"Accurate meeting notes for accurate follow-ups."*).
   - Styles: `400`, `400 Italic`.
3. **Metrics, Scores & Meta (Monospace)**: `JetBrains Mono`
   - *Why*: Clean tabular figures for jury scores, ratings, timestamps, and categories.
   - Weights: `400`, `500`.

### Google Fonts `<link>` (for `index.html`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Type Scale & Hierarchy

| Token | Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | Plus Jakarta Sans | `48px – 72px` | 800 | 1.05 | Main Showcase Headings (Uppercase, tight tracking: `-0.03em`) |
| **Editorial Serif** | Instrument Serif | `36px – 56px` | 400 (Italic) | 1.15 | In-card statements, editorial quotes, feature anchors |
| **Section Title** | Plus Jakarta Sans | `28px – 36px` | 700 | 1.2 | Section headers ("See the highlights of this website.") |
| **Subheading / Lead** | Plus Jakarta Sans | `18px – 22px` | 400 / 500 | 1.45 | Descriptive intros and sub-headlines |
| **Body Text** | Plus Jakarta Sans | `15px – 16px` | 400 | 1.6 | Paragraphs, descriptions, juror bios |
| **Overline / Label** | Plus Jakarta Sans | `12px – 13px` | 600 | 1.2 | Tracked uppercase metadata tags (`letter-spacing: 0.08em`) |
| **Scores & Data** | JetBrains Mono | `13px – 15px` | 500 | 1.0 | Score columns, tags, metrics (`font-feature-settings: "tnum"`) |

---

## 3. Color Palette & Semantic Tokens

### Canvas & Surfaces
- **Canvas Base**: `#F8F7F4` — Warm alabaster background for the entire page.
- **Card Surface**: `#FFFFFF` — Crisp pure white for primary focus cards.
- **Warm Surface**: `#F5F3EC` — Warm cream card backdrop for interior app mockups.
- **Subtle Surface**: `#EFECE5` — Muted cream for neutral controls and input fields.
- **Ink Dark Surface**: `#121214` — Deep charcoal black for floating docks, primary CTA buttons, and dark contrast cards.

### Text & Content
- **Text Primary**: `#111113` — Almost pure black for primary headings and high emphasis.
- **Text Secondary**: `#3F3F46` — Neutral graphite for lead paragraphs and body text.
- **Text Muted**: `#71717A` — Mid-tone gray for metadata, sub-labels, and author credits.
- **Text Subtle**: `#A1A1AA` — Hairline captions, table headers, and inactive tabs.
- **Text Inverse**: `#FFFFFF` — White text for dark buttons and floating docks.

### Accent & Mood Highlights (Warm / Organic Pastels)
- **Lavender / Lilac**:
  - Light fill: `#EDE9FE`
  - Border: `#DDD6FE`
  - Text/Icon: `#6D28D9`
- **Butter Honey / Warm Amber**:
  - Light fill: `#FEF9C3`
  - Border: `#FDE047`
  - Text/Icon: `#854D0E`
- **Soft Mint**:
  - Light fill: `#DCFCE7`
  - Border: `#BBF7D0`
  - Text/Icon: `#15803D`

### Borders & Shadows
- **Hairline Border (Light)**: `rgba(0, 0, 0, 0.08)` or `#E7E5E4`
- **Hairline Border (Dark)**: `rgba(255, 255, 255, 0.12)`
- **Card Shadow (Soft Depth)**: `0 12px 32px -4px rgba(0, 0, 0, 0.06), 0 4px 12px -2px rgba(0, 0, 0, 0.03)`
- **Elevated Float Shadow**: `0 20px 48px -8px rgba(0, 0, 0, 0.14)`

---

## 4. Key UI Components & Anatomy

### A. Pill Buttons & Filter Chips
- **Geometry**: `border-radius: 9999px` (fully rounded capsule).
- **Primary Action Button**:
  - Background: `#121214`
  - Color: `#FFFFFF`
  - Padding: `12px 24px`
  - Typography: Plus Jakarta Sans, `14px`, 600 weight.
  - Hover: Subtle scale `transform: translateY(-1px)`, background `#27272A`.
- **Filter Chip / Tag Pill**:
  - Background: `#FFFFFF`
  - Border: `1px solid rgba(0, 0, 0, 0.1)`
  - Padding: `8px 18px`
  - Typography: Plus Jakarta Sans, `13px`, 500 weight.
  - Active State: Background `#121214`, Color `#FFFFFF`, Border `#121214`.

### B. Showcase Cards (Visual Hero & Highlights)
- **Geometry**: `border-radius: 24px` (outer showcase container), `overflow: hidden`.
- **Inner Padding**: `24px` to `48px`.
- **Hero Image Container**:
  - Cinematic, warm ambient photography background.
  - Floats an inner application mockup card with warm cream surface (`#F5F3EC`), rounded at `16px`, containing editorial serif typography and soft lilac/amber accent widgets.
- **Card Highlights Grid**:
  - 3-column responsive grid with `gap: 20px`.
  - Rounded `18px`, warm border, subtle hover elevation.

### C. Floating Bottom Dock / Navigation Capsule
- **Position**: Fixed bottom centered (`bottom: 24px; left: 50%; transform: translateX(-50%)`).
- **Surface**: Solid `#121214`, `border-radius: 9999px`, padding `6px`.
- **Inner Controls**:
  - Segmented pill tabs (`W.`, `Info`, `Review`, `Vote`).
  - Active tab: Highlighted in butter yellow (`#FDE047`) or white with high-contrast dark text.
  - Floating auxiliary close button (`[X]`) beside the capsule dock.

### D. Jury Score & Metrics Table
- **Layout**: Clean horizontal rows with subtle divider borders (`1px solid #E7E5E4`).
- **Cells**:
  - Juror avatar (circular `36px`), Juror Name & Country.
  - Score columns (Design, Usability, Creativity, Content, Overall) aligned with tabular monospace font (`JetBrains Mono`).
  - Subtle highlight box on overall score badge (`#F4F4F5`, rounded `6px`).

---

## 5. Tailwind CSS v4 Integration & Utility Class Mapping

The design system is implemented via `@tailwindcss/vite` and `@theme` in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', Consolas, monospace;

  --color-canvas: #F8F7F4;
  --color-surface-white: #FFFFFF;
  --color-surface-cream: #F5F3EC;
  --color-surface-subtle: #EFECE5;
  --color-surface-dark: #121214;

  --color-text-primary: #111113;
  --color-text-secondary: #3F3F46;
  --color-text-muted: #71717A;
  --color-text-subtle: #A1A1AA;
  --color-text-inverse: #FFFFFF;

  --color-lavender-surface: #EDE9FE;
  --color-lavender-border: #DDD6FE;
  --color-lavender-text: #6D28D9;

  --color-honey-surface: #FEF9C3;
  --color-honey-border: #FDE047;
  --color-honey-text: #854D0E;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 9999px;

  --shadow-soft: 0 12px 32px -4px rgba(0, 0, 0, 0.06), 0 4px 12px -2px rgba(0, 0, 0, 0.03);
  --shadow-float: 0 20px 48px -8px rgba(0, 0, 0, 0.14);
}
```

### Ready-to-Use Tailwind Classes:
- **Fonts**: `font-sans`, `font-serif`, `font-mono`
- **Backgrounds**: `bg-canvas`, `bg-surface-white`, `bg-surface-cream`, `bg-surface-subtle`, `bg-surface-dark`, `bg-lavender-surface`, `bg-honey-surface`
- **Text**: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-subtle`, `text-text-inverse`, `text-lavender-text`, `text-honey-text`
- **Borders**: `border-surface-subtle`, `border-lavender-border`, `border-honey-border`, `border-black/10`
- **Pills & Radii**: `rounded-pill` (`rounded-full`), `rounded-lg`, `rounded-xl`
- **Shadows**: `shadow-soft`, `shadow-float`

---

## 6. Do's and Don'ts Checklist

- ✅ **DO** mix bold geometric sans headings with delicate italic serif taglines.
- ✅ **DO** use pill-shaped containers (`border-radius: 9999px`) for interactive filters, buttons, and floating docks.
- ✅ **DO** use warm cream (`#F5F3EC`) for card insets to create visual depth and physical realism.
- ❌ **DON'T** use frosted glass or heavy CSS `backdrop-filter: blur()`.
- ❌ **DON'T** use vivid neon blue/purple gradients. Keep color fields solid, soft, and balanced.
- ❌ **DON'T** use pill badges as section titles; let clean typography do the work.
