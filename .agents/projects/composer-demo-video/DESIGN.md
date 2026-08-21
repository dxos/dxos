# Composer demo video — design

Status: approved 2026-08-21. Ledger: [TASKS.md](./TASKS.md). Running notes: [NOTES.md](./NOTES.md).

## 1. Goal

Produce a library of 20-30 screen-recorded clips of Composer (5-30s each), from which
four different videos are cut:

| Cut | Audience | Spine | Length |
| --- | --- | --- | --- |
| **CF** | Cloudflare (a dated presentation, 2-4 weeks out) | "The stack, top to bottom" | ~3 min |
| **Dev** | Developers | "Impossible demos" | ~90 s |
| **Pro** | Knowledge workers | "One space, all the way down" | ~90 s |
| **Inv** | Investors / partners | capability sweep | ~3-5 min |

The Cloudflare cut is the nearest hard deliverable and therefore drives Phase 1.

## 2. The argument

Three levels, deliberately different:

1. **Admission criterion — "impossible demos."** A clip earns its place only if it
   produces a *wait, what?*: an offline edit that reconverges, an agent running at
   the edge while data never leaves the device, a plugin written in two minutes,
   native and web mutating the same live object. This is what kills forty boring
   clips before anyone scripts them. It is a filter, not a structure.
2. **Hero-cut spine — narrative.** Follow Bramble Coffee Roasters through a working
   day. Every capability appears in service of a task; ECHO, the agent runtime and
   EDGE are revealed as the *explanation* of why it works, never as a feature tour.
3. **Cloudflare-cut spine — architectural.** Start at the surface and peel: plugins
   → ECHO → agent runtime → EDGE/Workers. The audience is the one room where the
   bottom of the stack is the interesting part.

## 3. Partners

Credits earn a *moment*, not a logo card. Each gets one clip where the technology is
the point:

| Partner | The moment |
| --- | --- |
| **Automerge** | A real concurrent merge — two windows, one offline, divergence and reconvergence, then version history. |
| **Effect** | The agent trace panel: tool calls, typed errors, streaming, all visibly an Effect runtime. |
| **Tauri** | The native desktop build mutating the same live object as the browser beside it. |
| **Cloudflare** | The sync followed into EDGE — the Durable Object the space lives in, then `deploy.mjs` shipping it. |

A logo montage may still close the video; it is not a substitute for these four.

## 4. Phase 1 — the five hybrid clips

Chosen so the five *are* the Cloudflare cut in miniature and simultaneously the
opening of every other cut.

| # | Clip | What it shows | Partner | Target |
| --- | --- | --- | --- | --- |
| 1 | **The space** | Open Bramble; deck with document + table + kanban side by side; companion panel. | — | local |
| 2 | **It's a database** | ECHO explorer graph over that same space; run a live query; click a node and the deck navigates to the object. | — | local |
| 3 | **It merges** | Two windows, one offline, concurrent edits, reconverge on reconnect; version history after. | Automerge | local |
| 4 | **The agent works for you** | Assistant builds a table/diagram from space data, trace panel open, tool calls streaming. | Effect | local |
| 5 | **…and it's all Workers** | Follow the sync to EDGE — the DO the space lives in, Hub admin + Grafana traffic, then `deploy.mjs`. | Cloudflare | preview + edge repo |

Phase 2 adds Tauri (native), plugin development, and the prosumer breadth.

## 5. Recording targets

| Target | Use | Why |
| --- | --- | --- |
| **Local dev** (this worktree, `pnpm dev`) | The bulk of clips | Full catalog, patchable for the camera, seedable on boot, dev artifacts suppressible. |
| **`preview.composer.space`** | Hero shots — space creation, invitation, EDGE sync, a real URL in frame | Full plugin catalog **and** `DX_EDGE_BASE_URL="https://dxos.network/"`, i.e. EDGE production on real Workers. |
| ~~`composer.space`~~ | **Not used** | `.github/workflows/env/production` sets `DX_PLUGIN_SET=production`, swapping in `plugin-defs.production.tsx`: seven plugins, `isExtensible: false`, no registry, no table/sheet/kanban/explorer/inbox/CRM/map/sketch. Half the clip list does not exist there. |

## 6. Capture model

**Playwright cannot drive a Screen Studio recording.** Playwright dispatches CDP input
events and never moves the macOS cursor; Screen Studio captures the OS cursor and keys
its auto-zoom and click-highlight off real cursor events. A Playwright-driven clip
records as a UI mutating itself with no pointer — unusable as marketing footage.

Capture therefore splits in two:

- **Stage** — agent-owned, deterministic. Playwright or the debug port lands the app in
  exact pre-roll state: seeded space, deck layout, panels open, sidebar scrolled,
  window sized, theme locked, clock frozen, dev artifacts suppressed.
- **Perform** — the recorded 5-30 s, driven by a human from a numbered beat sheet.

Robot-cursor mode (`cliclick` moving the real OS cursor) is **deferred**; revisit if the
mechanical-clip count grows past roughly eight.

## 7. Demo data

A **separate seed**, not a mutation of the shipped fixture.
`packages/plugins/plugin-onboarding/src/content/exemplar-space.dx.json` is imported by
plugin-onboarding for every new identity — editing it is a product change.

New script beside `build-exemplar-space.ts` emitting a loadable space archive: a Bramble
superset with a deeper inbox, CRM pipeline stages with history, kanban with movement,
seeded comment threads and document revisions, a second identity's edits, and a
**synthetic Gmail mailbox** (no real OAuth, no real account — so the connect/OAuth flow
is deliberately *not* shown). Grounded in `about-bramble.md`, which stays canonical for
every world-fact.

Anything that looks great may be backported to the shipped exemplar later, as its own PR.

## 8. Post-production

- **Editor: undecided.** Half-day bake-off of Descript / Kapwing / Veed against a real
  Screen Studio export, written up in `agents/demo-video/EDITOR-BAKEOFF.md` with a
  recommendation. Blocking for the edit, not for capture.
- **Voice:** HeyGen avatar for intro/outro bookends; user VO for the body. Every script
  gets a **synthetic scratch track immediately** so the edit can be cut and timed before
  any real recording — the real VO is recorded once against a locked edit.
- **Stills / brand:** Ideogram for any generated imagery.

## 9. Workstreams

1. **Creative** — candidate list → user marks → shot list → three competing scripts →
   beat sheets.
2. **Data** — demo seed script + synthetic mailbox.
3. **Harness** — Playwright staging module, one named stage per clip, plus camera-mode
   suppression of dev artifacts.
4. **Post** — editor bake-off, Screen Studio conventions, HeyGen avatar, brand assets.
5. **Cloudflare** — EDGE architecture visual, deploy clip, DO-per-space explanation,
   Grafana walk. Depends on the sibling `edge` repo at `/Users/burdon/Code/dxos/edge`,
   which is **not** this worktree.

## 10. Artifacts

| Path | Contents |
| --- | --- |
| `.agents/projects/composer-demo-video/` | `DESIGN.md`, `TASKS.md`, `NOTES.md` — the work-stream ledger. |
| `agents/demo-video/CANDIDATES.md` | Every candidate clip, for the user to mark. |
| `agents/demo-video/SHOTLIST.md` | The cut-down list that gets made. |
| `agents/demo-video/SCRIPTS/` | Three competing scripts, then the chosen one per cut. |
| `agents/demo-video/BEATSHEETS/` | Per-clip numbered performance beats. |
| `agents/demo-video/CAPTURE.md` | Recording conventions — window size, theme, Screen Studio settings, export. |
| `agents/demo-video/EDITOR-BAKEOFF.md` | Editor comparison + recommendation. |
| `temp/` (gitignored) | All recordings and exports. Never git. |

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| A scripted feature turns out not to work | User marks the candidate list before anything is scripted. |
| Cloudflare date moves in | Phase 1's five clips are themselves a shippable ~90 s CF cut. |
| Editor choice churns | Bake-off is half a day and blocks only the edit, not capture. |
| `edge` repo access/deploy needed on the day | Clip 5 identified early; deploy rehearsed against a non-production env first. |
| Recording sessions are the human bottleneck | Staging is deterministic, so retakes cost minutes; clips batched into ~3 sessions. |
