# QA flows + demo videos — task tracker

Branch: `claude/qa-flows-video-subagents-dkwc2j`

Goal: every `packages/plugins/*/PLUGIN.mdl` carries a `## QA` section with at least one
`flow QA-n` block (per `packages/reflect/deus/lang/qa.mdl`); record demo videos of the
flows that are runnable against a live Composer and host them in the `agent-artifacts` R2
bucket, linked from the PR body.

## Phase 0 — environment

- [x] proto/moon toolchain + `pnpm install` (`.config/claude-code-setup.sh`)
- [~] `moon run composer-app:build` (running)
- [ ] Chromium driver smoke test (`.agents/skills/recording-demos/scripts/driver.mjs`)

## Phase 1 — author QA flows (one subagent per batch, Sonnet)

Already had flows before this branch: plugin-chess, plugin-deepseek, plugin-markdown.

### Batch 00

- [x] `plugin-assistant`
- [x] `plugin-atproto`
- [x] `plugin-blogger`
- [x] `plugin-bluesky`
- [x] `plugin-board`
- [x] `plugin-bookmarks`
- [x] `plugin-brain`
- [x] `plugin-calls`

### Batch 01

- [x] `plugin-chess-com`
- [x] `plugin-claude-agents`
- [x] `plugin-code`
- [x] `plugin-commerce`
- [x] `plugin-computer`
- [x] `plugin-conductor`
- [x] `plugin-connector`

### Batch 02

- [x] `plugin-crm`
- [x] `plugin-crx`
- [x] `plugin-debug`
- [x] `plugin-deck`
- [x] `plugin-devtools`
- [x] `plugin-discord`
- [x] `plugin-doctor`
- [x] `plugin-explorer`
- [x] `plugin-file`

### Batch 03

- [x] `plugin-file-system`
- [x] `plugin-freeq`
- [x] `plugin-game`
- [x] `plugin-github`
- [x] `plugin-heygen`
- [x] `plugin-ibkr`
- [x] `plugin-ideogram`
- [x] `plugin-illustrator`

### Batch 04

- [x] `plugin-inbox`
- [x] `plugin-kanban`
- [x] `plugin-lametric`
- [x] `plugin-library`
- [x] `plugin-linear`
- [x] `plugin-lingo`
- [x] `plugin-magazine`
- [x] `plugin-map`

### Batch 05

- [x] `plugin-map-solid`
- [x] `plugin-meeting`
- [x] `plugin-mermaid`
- [x] `plugin-native`
- [x] `plugin-navtree`
- [x] `plugin-osrm`
- [x] `plugin-pipeline`
- [x] `plugin-presenter`

### Batch 06

- [x] `plugin-review`
- [x] `plugin-routine`
- [x] `plugin-sample`
- [x] `plugin-sandbox`
- [x] `plugin-script`
- [x] `plugin-search`
- [x] `plugin-sequencer`
- [x] `plugin-sheet`

### Batch 07

- [x] `plugin-sidekick`
- [x] `plugin-slack`
- [x] `plugin-space`
- [x] `plugin-spacetime`
- [x] `plugin-spotlight`
- [x] `plugin-stack`
- [x] `plugin-stream-deck`

### Batch 08

- [x] `plugin-studio`
- [x] `plugin-support`
- [x] `plugin-table`
- [x] `plugin-tasks`
- [x] `plugin-terra`
- [x] `plugin-thread`
- [x] `plugin-tldraw`
- [x] `plugin-transcription`

### Batch 09

- [x] `plugin-transformer`
- [x] `plugin-trello`
- [x] `plugin-trip`
- [x] `plugin-typefully`
- [x] `plugin-video`
- [x] `plugin-voxel`
- [x] `plugin-wnfs`
- [x] `plugin-zen`

## Phase 2 — record + upload

- [ ] Pick the flows that are actually runnable (plugin enabled by default, ops registered)
- [ ] Record each as a captioned `.webm` via the `recording-demos` driver
- [ ] Upload to R2 under `demos/<date>-qa-flows/` (`hosting-artifacts`)
- [ ] List every video URL in the PR body

## Verification of the authoring pass

Automated sweep (`## QA` present, one heading per file, balanced fences, every step
carries `do:` + `expect:`, and every `org.dxos.operation.*` key referenced resolves to
a real `DXN.make(...)` in source):

- 82/82 files carry a `## QA` section with at least one `flow QA-n`.
- 213 distinct operation keys referenced; all resolve to source after the fixes below.
- Defects found and fixed: `plugin-code` (9 fabricated `org.dxos.function.code.*`
  keys), `plugin-space` / `plugin-spotlight` / `plugin-stream-deck` / `plugin-debug`
  (a step each missing the required `expect:`), `plugin-script` (notes narrating a
  correction rather than stating the key).
- Pre-existing on `main`, not introduced here: unbalanced code fences in
  `plugin-studio` and `plugin-devtools`.

## Phase 2 — recording (done)

Recorded against a real Composer dev server (`composer-app:serve`, fresh disposable
profile, 205 operations live in the registry) driven through the `recording-demos`
driver. One continuous session, captioned per step from each flow's `do:` text, trimmed
79% (9m21s → 1m57s, 23 chapters) and cut into per-plugin clips.

Bucket prefix: `demos/2026-08-27-qa-flows/` in `agent-artifacts`.

- [x] `plugin-markdown` QA-1 — create, place, open, fix a typo
- [x] `plugin-sheet` QA-1 — create, set A1:A3, read back
- [x] `plugin-thread` QA-1 — create a channel, send a message
- [x] `plugin-illustrator` QA-1 — create a drawing, read the scene DSL
- [x] `plugin-support` QA-1 — file a ticket, move it to in-progress
- [x] `plugin-search` QA-1 — open the search surface

### Findings from executing the flows

These are defects in the specs or in the operations, found by running them:

1. `markdown.update` takes `doc: Ref.Ref(...)`. Passing the live object (as the
   pre-existing QA-1 spec's `$created.object` implies) fails with
   `ref.tryLoad is not a function`; the invoker does not decode input through the
   operation schema, so the caller must pass a real `Ref`.
2. `sheet.create` returns `{ id: <DXN string> }` and places the sheet itself — it does
   not return `{ object }`, so the usual create → `space.addObject` pairing does not
   apply.
3. `sheet.setRange` takes `cells: Record<A1, value>`, not `range` + `values`.
4. `sheet.getRange` returns the stored formula (`=SUM(A1:A2)`), not the computed value,
   so an `assert` on the evaluated result has to read the UI rather than the op output.
5. `thread.appendChannelMessage` takes `{ channel, sender: Actor, text }` — a live
   object and an actor, not a `Ref` and a `message`.
6. `table.create` needs a schema-registry service the plain invoker path does not
   provide (`Cannot read properties of undefined (reading 'addType')`) — not runnable
   from the debug port as written.

### Not recorded, and why

Most plugins cannot yield a video from a default profile: they are off by default,
hardware-bound (LaMetric, Stream Deck, Tauri-only file-system), or gated behind real
third-party credentials (Slack, Linear, Trello, Discord, GitHub, Typefully, IBKR).
Their specs mark those steps `blocked:` per the language's Rule 9.
