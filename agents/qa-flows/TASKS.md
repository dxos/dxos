# QA flows + demo videos — task tracker

Branch: `claude/qa-flows-video-subagents-dkwc2j`

Goal: every `packages/plugins/*/PLUGIN.mdl` carries a `## QA` section with at least one
`flow QA-n` block (per `packages/reflect/deus/lang/qa.mdl`); record demo videos of the
flows that are runnable against a live Composer and host them in the `agent-artifacts` R2
bucket, linked from the PR body.

## Phase 0 — environment

- [ ] proto/moon toolchain + `pnpm install` (`.config/claude-code-setup.sh`)
- [ ] `moon run composer-app:build`
- [ ] Chromium driver smoke test (`.agents/skills/recording-demos/scripts/driver.mjs`)

## Phase 1 — author QA flows (one subagent per batch, Sonnet)

Already had flows before this branch: plugin-chess, plugin-deepseek, plugin-markdown.

### Batch 00

- [ ] `plugin-assistant`
- [ ] `plugin-atproto`
- [ ] `plugin-blogger`
- [ ] `plugin-bluesky`
- [ ] `plugin-board`
- [ ] `plugin-bookmarks`
- [ ] `plugin-brain`
- [ ] `plugin-calls`

### Batch 01

- [ ] `plugin-chess-com`
- [ ] `plugin-claude-agents`
- [ ] `plugin-code`
- [ ] `plugin-commerce`
- [ ] `plugin-computer`
- [ ] `plugin-conductor`
- [ ] `plugin-connector`

### Batch 02

- [ ] `plugin-crm`
- [ ] `plugin-crx`
- [ ] `plugin-debug`
- [ ] `plugin-deck`
- [ ] `plugin-devtools`
- [ ] `plugin-discord`
- [ ] `plugin-doctor`
- [ ] `plugin-explorer`
- [ ] `plugin-file`

### Batch 03

- [ ] `plugin-file-system`
- [ ] `plugin-freeq`
- [ ] `plugin-game`
- [ ] `plugin-github`
- [ ] `plugin-heygen`
- [ ] `plugin-ibkr`
- [ ] `plugin-ideogram`
- [ ] `plugin-illustrator`

### Batch 04

- [ ] `plugin-inbox`
- [ ] `plugin-kanban`
- [ ] `plugin-lametric`
- [ ] `plugin-library`
- [ ] `plugin-linear`
- [ ] `plugin-lingo`
- [ ] `plugin-magazine`
- [ ] `plugin-map`

### Batch 05

- [ ] `plugin-map-solid`
- [ ] `plugin-meeting`
- [ ] `plugin-mermaid`
- [ ] `plugin-native`
- [ ] `plugin-navtree`
- [ ] `plugin-osrm`
- [ ] `plugin-pipeline`
- [ ] `plugin-presenter`

### Batch 06

- [ ] `plugin-review`
- [ ] `plugin-routine`
- [ ] `plugin-sample`
- [ ] `plugin-sandbox`
- [ ] `plugin-script`
- [ ] `plugin-search`
- [ ] `plugin-sequencer`
- [ ] `plugin-sheet`

### Batch 07

- [ ] `plugin-sidekick`
- [ ] `plugin-slack`
- [ ] `plugin-space`
- [ ] `plugin-spacetime`
- [ ] `plugin-spotlight`
- [ ] `plugin-stack`
- [ ] `plugin-stream-deck`

### Batch 08

- [ ] `plugin-studio`
- [ ] `plugin-support`
- [ ] `plugin-table`
- [ ] `plugin-tasks`
- [ ] `plugin-terra`
- [ ] `plugin-thread`
- [ ] `plugin-tldraw`
- [ ] `plugin-transcription`

### Batch 09

- [ ] `plugin-transformer`
- [ ] `plugin-trello`
- [ ] `plugin-trip`
- [ ] `plugin-typefully`
- [ ] `plugin-video`
- [ ] `plugin-voxel`
- [ ] `plugin-wnfs`
- [ ] `plugin-zen`

## Phase 2 — record + upload

- [ ] Pick the flows that are actually runnable (plugin enabled by default, ops registered)
- [ ] Record each as a captioned `.webm` via the `recording-demos` driver
- [ ] Upload to R2 under `demos/<date>-qa-flows/` (`hosting-artifacts`)
- [ ] List every video URL in the PR body
