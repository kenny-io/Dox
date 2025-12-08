## Dox — Mintlify-Class Docs Without Licensing Headaches

Dox is a fresh implementation of the TailwindUI documentation UX built entirely from scratch on Next.js 16, Tailwind CSS, Radix primitives, and shadcn-inspired UI atoms. The goal is to ship a Mintlify-style developer portal template that is clean-room, customizable, and safe to commercialize.

### Highlights

- App Router + React Server Components with minimal client boundaries
- MDX-driven docs stored in `src/content/docs`
- Automatic navigation, instant search, and table-of-contents generation
- Responsive shell with persistent sidebar, mobile drawer, theme toggle, and command palette
- URL-synced search state via `nuqs`

### Stack

- Next.js 16 / TypeScript
- Tailwind CSS 3.4 + `@tailwindcss/typography`
- Radix UI (`dialog`, `scroll-area`, `slot`) and shadcn-flavored atoms
- Lightweight client-side search scoring, `next-themes` for dark mode, `nuqs` for query state

### Project Structure

```
src/
  app/
    (docs)/[[...slug]]  # MDX-driven routes
    layout.tsx          # global shell
  components/           # layout, navigation, mdx, ui primitives
  content/docs/         # MDX pages
  data/docs.ts          # manifest + navigation
  lib/utils.ts          # helpers
```

### UI Customization

- Edit `src/config/layout.ts` to tweak shared padding, column widths, and panel styles.
- Use `PageContainer`, `SectionStack`, `ContentStack`, `Panel`, and `MutedPanel` from `src/components/layout/sections.tsx` when building new pages to inherit those tokens automatically.
- Typography styles for headings/meta text live in `typography` exports in the same config.

### Local Development

```bash
npm install
npm run dev
# The dev script runs `next dev --webpack` so MDX plugins with Shiki work.
# visit http://localhost:3000
```

### Adding Content

1. Drop a new `.mdx` file into `src/content/docs`.
2. Register it in `src/data/docs.ts` with title, description, group, and metadata.
3. Navigation, search, and table of contents update automatically.

### Production

Build and run the optimized bundle:

```bash
npm run build
npm start
```

Deploy anywhere that supports Next.js (Vercel, Netlify, Cloudflare, containers). No proprietary dependencies or licensing from Tailwind Labs remain.
