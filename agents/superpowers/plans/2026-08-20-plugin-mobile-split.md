# plugin-mobile Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extract mobile rendering from plugin-deck into a new `plugin-mobile` package (renderer over deck state) and make the mobile plugin set fixed (no registry) with Assistant, Markdown, Projects, Transcription.

**Spec:** `agents/superpowers/specs/2026-08-20-plugin-mobile-split-design.md`

## Global Constraints

Same as `2026-08-19-plugin-deck-mobile-support.md` (worktree/branch, no casts, workspace deps, no shims, why-once comments, zero-warning lint, `pnpm format` + explicit staging before every commit, moon builds, proto PATH prefix `$HOME/.proto/bin:$HOME/.proto/tools/node/24.11.1/bin`). Plus: the new package MUST set `"private": true`.

### Task 1: create plugin-mobile; move the renderer; headless deck

**Files:** Create `packages/plugins/plugin-mobile/` (package.json/tsconfig/moon.yml/dx config modeled on a small existing plugin, e.g. plugin-registry — copy its file set and adapt); `git mv` from plugin-deck per the spec's Ownership section; deck's `capabilities/react-root.tsx` and `react-surface.ts` lose their mobile branches (platform 'mobile' → contribute nothing / module skipped — investigate `AppCapabilities.ReactRoot` consumption first and record the mechanism); plugin-mobile gets its own `plugin.ts`/`MobilePlugin.ts` (lazy, options-free), capabilities (react-root rendering the mobile layout, react-surface for home/navBranch), translations (mobile keys + searchTranslations spread — REMOVE those keys/spread from deck's translations if deck no longer uses them; verify each), and hooks. Mobile hooks import `DeckCapabilities` via `@dxos/plugin-deck/DeckCapabilities` subpath; `useDeckState` — check whether it's publicly importable; if not, plugin-mobile re-derives it from the atoms (small local hook) rather than deck exporting internals it doesn't want public.
**Verify:** `moon run plugin-mobile:build plugin-mobile:lint plugin-deck:build plugin-deck:lint plugin-deck:test` green; `plugin-deck:test-storybook` (moved stories retitled `plugins/plugin-mobile/...` and passing under plugin-mobile's own test-storybook if it has one — set the moon tasks up like plugin-deck's); knip both invocations.
**Commit:** `plugin-mobile: extract mobile rendering from plugin-deck`.

### Task 2: composer wiring + fixed plugin set

**Files:** `plugin-defs.core.tsx` — mobile registers Deck(headless) + Mobile (layout selection becomes: isPopover → Spotlight; isMobile → [DeckPlugin.make({ platform:'mobile' }), MobilePlugin.make()]; else DeckPlugin.make({ platform:'desktop' }) — note the list shape change where layoutPlugin was singular); `plugin-defs.mobile.tsx` — `getCorePlugins({ ...config, isExtensible: false })` + AssistantPlugin, MarkdownPlugin, ProjectsPlugin, TranscriptionPlugin (verify each make() against plugin-defs.tsx); getDefaults = those four keys; composer-app package.json gains `@dxos/plugin-mobile: workspace:*`.
**Verify:** `moon run composer-app:build composer-app:check-plugin-set` green; `DX_PLUGIN_SET=mobile pnpm exec vite build` in composer-app succeeds and the set report shows no registry plugin; knip green.
**Commit:** `composer-app: mobile renders via plugin-mobile; fixed mobile plugin set`.

### Task 3: runtime verification + docs + changeset

Browser parity re-run (Playwright real Chromium, DX_MOBILE=1, 375×812): boot → Home → space → push/pop → drawer → chat send; registry ABSENT from mobile (no plugin catalog); desktop unchanged (no DX_MOBILE). Update `.changeset/deck-mobile-support.md` (plugin-mobile is private → not in front matter; body updated to name plugin-mobile as the mobile renderer), `docs/TESTING.md` setup/§A notes, PR body. Rebuild (`DX_PLUGIN_SET=mobile` vite build + `ios-build.sh --debug --sim --skip-clean`, clearing `gen/apple/build/{app_iOS.xcarchive,arm64-sim}` first; restore pbxproj/icon churn after) and relaunch on the iPhone 16 sim (udid 12B0FE65-2322-4582-8462-2F1C38B98D5D).
**Commit:** docs/changeset updates.
