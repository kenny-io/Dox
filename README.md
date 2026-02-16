# Dox

A Mintlify-style documentation template built on Next.js, Tailwind CSS, Radix UI, and shadcn-inspired components. Clean-room, customizable, and free to commercialize.

## Features

- **MDX content** — write docs in Markdown with React components
- **Auto-generated API reference** — drop in an OpenAPI spec and get interactive docs
- **Sidebar & tabs** — configured from a single `docs.json` file
- **Search, TOC, dark mode** — built-in with zero config
- **Responsive** — persistent sidebar, mobile drawer, command palette
- **Syntax highlighting** — Shiki with CSS variables for theme-aware code blocks

## Quick Start

```bash
# 1. Clone or use as template
npx degit your-org/dox my-docs
cd my-docs

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
docs.json              # Navigation config — tabs, groups, page order, API reference
openapi.yaml           # Your OpenAPI spec (auto-generates the API Reference tab)
src/
  content/             # MDX documentation pages (flat folder)
    introduction.mdx
    quickstart.mdx
    ...
  app/                 # Next.js App Router
  components/          # Layout, navigation, MDX, and UI primitives
  data/
    docs.ts            # Reads docs.json + frontmatter to build navigation
    site.ts            # Site name, description, links, brand colors
  config/
    api-reference.ts   # Reads API config from docs.json
```

## Adding a Page

1. Create `src/content/my-page.mdx`:
   ```mdx
   ---
   title: My Page
   description: A short description for search and meta tags.
   ---

   Your content here. Use any MDX — headings, code blocks, callouts, etc.
   ```

2. Add `"my-page"` to a group in `docs.json`:
   ```json
   {
     "group": "Getting Started",
     "pages": ["introduction", "quickstart", "my-page"]
   }
   ```

3. Done. Sidebar, search, and navigation update automatically.

## Configuring Navigation (`docs.json`)

```json
{
  "tabs": [
    {
      "tab": "Overview",
      "groups": [
        { "group": "Getting Started", "pages": ["introduction", "quickstart"] },
        { "group": "Core Concepts", "pages": ["authentication", "pagination"] }
      ]
    },
    {
      "tab": "API Reference",
      "api": {
        "source": "openapi.yaml",
        "tagsOrder": ["Pets", "Store"],
        "defaultGroup": "General"
      }
    },
    {
      "tab": "Changelog",
      "href": "/changelog"
    }
  ]
}
```

- **`tab`** — label shown in the top navigation bar
- **`groups`** — sidebar sections, each with a title and ordered page list
- **`api`** — auto-generates API reference from an OpenAPI spec
- **`href`** — links to an internal route or external URL

## API Reference

Drop your OpenAPI 3.x spec as `openapi.yaml` in the project root and configure it in `docs.json`:

```json
{
  "tab": "API Reference",
  "api": {
    "source": "openapi.yaml",
    "tagsOrder": ["Pets", "Store"],
    "defaultGroup": "General",
    "overrides": {
      "GET /pets": { "title": "List pets", "badge": "Stable" }
    }
  }
}
```

The template includes an example Pet Store spec. Replace it with your own.

## Customization

### Brand Colors

Edit `src/data/site.ts` to change the site name, description, links, and brand palette. Two presets are included (`primary` green, `secondary` purple) — switch between them or define your own.

### Layout

Edit `src/config/layout.ts` for padding, column widths, and panel styles.

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production URL for OpenGraph metadata |

## Production

```bash
npm run build
npm start
```

Deploy anywhere that supports Next.js — Vercel, Netlify, Cloudflare, Docker, etc.

## Stack

- Next.js 16 / TypeScript / App Router
- Tailwind CSS 3.4 + `@tailwindcss/typography`
- Radix UI (dialog, scroll-area, accordion, slot)
- MDX via `next-mdx-remote` + Shiki syntax highlighting
- `next-themes` for dark mode, `nuqs` for URL state, `zustand` for sidebar state
- `gray-matter` for frontmatter parsing, `yaml` for OpenAPI spec loading

## License

MIT
