# Composer demo video — tasks

Design: [DESIGN.md](./DESIGN.md) · Notes: [NOTES.md](./NOTES.md) · Candidates: [../../../agents/demo-video/CANDIDATES.md](../../../agents/demo-video/CANDIDATES.md)

Anchor: Cloudflare presentation, 2-4 weeks from 2026-08-21 (≈ 2026-09-04 → 2026-09-18).

## Phase 0 — scaffold (day 1)

- [x] Record decisions and grounding in `NOTES.md`
- [x] Write `DESIGN.md`
- [x] Write `agents/demo-video/CANDIDATES.md` — 73 candidates across 13 categories
- [ ] **BLOCKING ON USER:** mark `CANDIDATES.md`
- [ ] Registry entry in `.agents/projects/registry.yml`
- [ ] Editor bake-off — Descript / Kapwing / Veed against a real Screen Studio export → `agents/demo-video/EDITOR-BAKEOFF.md`
- [ ] `agents/demo-video/CAPTURE.md` — window size, theme lock, Screen Studio settings, export presets, file naming

## Spike — animatic pipeline (2026-08-21) — DONE

Proof of mechanism in `temp/demo-video-spike/` (gitignored, throwaway). Report:
`temp/demo-video-spike/REPORT.md`. Output: 47s narrated 1080p animatic from a JSON script,
live Composer captures and TTS, produced unattended.

- [x] Boot dev server, seed Bramble via `composer.invoke(importExemplarSpace)` (388ms)
- [x] Stage + capture beats with Playwright
- [x] Composite 1920x1080 artboards in the browser (ffmpeg here has no freetype)
- [x] Narrate with `say`, animate + mux with ffmpeg, emit storyboard
- [ ] **Harness gap: multi-plank deck.** `layout.open` `disposition:'add'` fills the deck
      (URL proves it) but only one plank renders; `deck.adjust 'expand'` does not give the
      side-by-side view. Needs a staging primitive — try `updatePlankSizes`. This is the
      signature Composer visual.
- [ ] Harness gap: open the assistant panel (`layout.updateComplementary` did not work)
- [ ] Swap `say` for real HeyGen via `plugin-heygen` — needs the HeyGen API key in `.secrets/`
- [ ] Fold the pipeline into the real harness (script-as-data -> beat sheets -> animatic)

### Plan changes this forces

- Staging harness is cheaper than budgeted: build on `composer.invoke` (202 typed operations)
  rather than scripted UI clicking. Reallocate the saving to the deck-layout primitive.
- Every script now ships as a narrated animatic before any real recording, so "three competing
  scripts" becomes a comparison of three videos. Strongest available slip insurance for the
  Cloudflare date.
- `K7` (one dataset, four renderings) CONFIRMED real — Organizations render as cards, Table
  and Kanban over the same objects.

## Phase 1 — the five hybrid clips (days 2-7)

### Creative
- [ ] `SHOTLIST.md` — cut marked candidates to ~28, tagged by cut (C/D/P/I)
- [ ] Three competing scripts in `SCRIPTS/` — narrative, architectural, impossible-demos
- [ ] Pick one; beat sheets for clips 1-5 in `BEATSHEETS/`

### Data
- [ ] `build-demo-space.ts` beside `build-exemplar-space.ts` — Bramble superset archive
- [ ] Deeper inbox + synthetic Gmail mailbox (no OAuth)
- [ ] CRM pipeline stages with history; kanban with movement
- [ ] Seeded comment threads, document revisions, a second identity's edits
- [ ] Verify every fact against `about-bramble.md`

### Harness
- [ ] Playwright staging module — one named `stage()` per clip
- [ ] Camera mode: suppress HMR overlay + devtools badge, fixed window size, locked theme, frozen clock
- [ ] Deterministic deck layout helper
- [ ] Two-window helper for L1/L2 (offline merge)

### Capture + post
- [ ] Recording session 1 — clips 1-5
- [ ] HeyGen avatar set up; synthetic scratch VO for timing
- [ ] Rough cut (**this is the blog-post pilot and the slip-insurance backup**)
- [ ] Review checkpoint with user

## Phase 2 — the library (week 2)

- [ ] Beat sheets for the remaining ~20 clips
- [ ] Staging for each
- [ ] Recording session 2 — prosumer breadth (core plugins, companions, mail/CRM, scenarios)
- [ ] Recording session 3 — developer + partners (plugin dev, MCP/CLI, Tauri native, ECHO depth)
- [ ] Decide whether robot-cursor mode (`cliclick`) earns its build cost

## Phase 3 — Cloudflare cut (week 3)

- [ ] W-series clips against the `edge` repo (`/Users/burdon/Code/dxos/edge`)
- [ ] Architecture animation (W1) built as a live object in Composer
- [ ] Rehearse `deploy.mjs` against a non-production env before filming W4
- [ ] Assemble CF cut; lock edit
- [ ] Record user VO against locked edit; HeyGen bookends
- [ ] Polish, export, deliver

## Phase 4 — the other three cuts

- [ ] Developer hero (~90 s)
- [ ] Prosumer hero (~90 s)
- [ ] Investor tour (~3-5 min)
- [ ] Blog post around the Phase 1 pilot

## Open questions

- [ ] Does the `edge` repo deploy need credentials the agent cannot hold? (Likely — user drives W4.)
- [ ] Is there a Tauri build available on this machine for T1, or does it need building first?
- [ ] Music licensing — needed, or VO only?
