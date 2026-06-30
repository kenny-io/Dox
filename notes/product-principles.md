# Dox Product Principles — "What Would Apple Do"

> Internal strategy note. Not published to the docs site (lives outside `src/content/`).
> Reference this when making product and architecture decisions.

## The wedge (the one thing we win)

**Dox is the documentation platform for the age of AI agents.**

Mintlify is a human docs tool that bolted on AI. We are agent-native. Crucially,
Mintlify cannot fully copy this without cannibalizing their hosted-tracking,
lock-in business model. That asymmetry is our defensible position.

Do **not** chase Mintlify feature-for-feature. Pick the agent wedge and make it
10x better, not 10% better across the board.

## The three Apple principles we hold ourselves to

1. **Pick one wedge and make it 10x better.** (iPod = "1,000 songs in your pocket".)
   Our wedge is agent-native docs. Everything ladders up to it.
2. **Obsess over the first 60 seconds.** The unboxing / first-run experience *is*
   the product. `npx create-dox` → live, agent-ready docs with zero config.
3. **Make the right thing the default.** You should never have to *configure*
   quality, privacy, performance, accessibility, or agent-readiness. It's just there.

Supporting tenets:
- **Cohesion is the product.** One mental model, one `dox` toolchain — not a pile of packages.
- **Privacy as a headline, not a footnote.** Self-hosted analytics: your traffic data
  never leaves your infra. ("What happens on your docs stays on your docs.")
- **The framework is an implementation detail.** Users author content + config; the
  platform owns rendering. Don't leak the runtime into their face.
- **Perceived performance and craft are non-negotiable.** Nothing janky ships.

## Next bets (priority order)

1. **Agent Readiness Score** — a single 0–100 score in the dashboard (like Battery
   Health / Privacy Report) showing how well the docs serve agents, with one-tap
   fixes. Makes the invisible agent layer visible, improvable, brag-worthy. Uniquely
   ours; builds on the analytics + classifier + lint already shipped.
2. **Zero-config OOBE + `dox deploy`** — fix the first 60 seconds so the wedge is
   actually reachable. No required env vars to get a working, agent-ready site.
3. **Performance & craft pass** — instant/prefetch navigation, real search,
   zero layout shift, Core Web Vitals budget enforced in CI.
4. **Privacy-first positioning** — "own your data + agent-native" as the headline promise.

## Decision rule

When choosing what to build or how to build it, ask in order:
1. Does it strengthen the **agent-native wedge** or just match Mintlify?
2. Does it improve the **first 60 seconds**?
3. Can we make it a **default** instead of a setting?
4. Does it add **cohesion** or fragmentation?

If a feature doesn't serve 1–3, it's probably not next.

## Architecture north star (see stack audit)

The product is **content + config as the surface, framework as hidden runtime.**
The structured representation of a doc is the **single source of truth**; HTML,
JSON, JSON-LD, Markdown, and embeddings are all *projections* of it. We never
parse content twice with different code paths.
