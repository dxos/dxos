# plugin-deck mobile support — design

**Date:** 2026-08-19
**Branch:** `claude/plugin-deck-mobile-support-2ae1dd`
**Status:** approved in chat; one PR delivers both phases below.

## Goal

Retire `plugin-simple-layout` as the mobile alternative to `plugin-deck`. One layout plugin
(`plugin-deck`) owns layout state and operations on every platform; mobile is a projection of the
same deck state, not a second state machine. First proof point: a stripped-down Composer on iOS
showing a list of spaces, a list of Chat objects per space, and ChatThread via `plugin-assistant`,
with voice input.

## Decisions (from brainstorming)

- **Approach C** — one plugin, one state model, two root renderers. Rejected: renaming
  `plugin-simple-layout` → `plugin-mobile` and surfacing into deck (preserves the two-state-machine
  split), and a "minimal deck" feature subset (mobile needs the same state rendered differently,
  not fewer features).
- **Navigation model:** UIKit navigation stack (push/pop, interactive left-edge swipe-back), as
  evolved by PR #12644's `NavigationStack` — not a carousel. No forward swipe.
- **Drawer:** the mobile bottom drawer (Splitter) is the companion/complementary surface and the
  keyboard affordance. It stays.
- **Spotlight:** `SpotlightPlugin` (the `isPopover` case) stays a separate plugin, untouched.
- **Both phases land in the same PR.**

## Prerequisite: PR #12644

[PR #12644](https://github.com/dxos/dxos/pull/12644) ("Mobile tweaks", branch `daniel/testr`,
in-repo) ships `NavigationStack.tsx` and the `Main.tsx` stack wiring in `plugin-simple-layout`,
plus the native iOS microphone bridge (`src-tauri/.../MicrophoneBridge.m`, `audio_input.rs`,
`react-ui-transcription/src/capture/microphone-bridge.ts`) that voice input needs on device.

**Land #12644 first** (task chip created 2026-08-19). This PR then _moves_ `NavigationStack` into
`plugin-deck`. Fallback if it stalls: port `NavigationStack.tsx` + the `Main.tsx` stack wiring from
the fetched head (`pr-12644`, oid `81e39a2d45`) with attribution, and flag the conflict to Daniel.

## Phase 1 — baseline iOS boot (test before restructuring)

Run the existing pipeline unchanged (`packages/apps/composer-app/scripts/ios-build.sh` /
`ios-deploy.sh`, Tauri config in `src-tauri/`) on the current `SimpleLayoutPlugin` path, in the iOS
simulator. Establishes: does the app boot at all, do keyboard/safe-area behave, does
spaces → Chat → ChatThread work. This is the regression baseline for phase 2; findings feed the
plugin-set definition below.

## Phase 2 — unification

### A. Composer wiring

- `plugin-defs.core.tsx` layout selection becomes:
  `isPopover ? SpotlightPlugin.make() : DeckPlugin.make({ platform: isMobile ? 'mobile' : 'desktop' })`.
- New `plugin-defs.mobile.tsx` registry following the existing `DX_PLUGIN_SET=minimal` pattern
  (`vite.config.ts`): core plugins (already including Space, NavTree, Theme — Theme already takes
  `platform: 'mobile'`) + **Assistant, Markdown, Transcription**. iOS builds set
  `DX_PLUGIN_SET=mobile`.
- `isMobile` detection is unchanged (`main.tsx` — Tauri platform / `DX_MOBILE` / UA).

### B. plugin-deck structure

Moves from `plugin-simple-layout` into `plugin-deck`:

- `components/MobileLayout/` **as-is** (hard requirement): `MobileLayout.tsx` (iOS keyboard
  detection, safe-area insets, scroll lock, auto-scroll), context, stories.
- New `containers/MobileLayout/` (deck-side): `MobileDeckLayout` composing `MobileLayout.Root/Panel`
  - `Splitter` + `NavigationStack` (from #12644) + `AppBar` / `NavBar` / `Drawer` / `Main`.
- `Home` (spaces list) and `NavBranch` surfaces, registered only in mobile mode.
- `capabilities/react-root.tsx` branches on the platform option: `DeckLayout` (desktop) vs
  `MobileDeckLayout` (mobile). State, operations, url-handler, app-graph-builder stay single.
- `plugin-simple-layout` is **deleted** (composer-app is its only consumer). No compatibility
  re-exports.

### C. State mapping — one state machine, two projections

- **Stack = the active deck's `active` list.** Root (workspace/Home) at the bottom, visible panel =
  last entry. `Open` pushes, `Close` pops, edge-swipe invokes `LayoutOperation.Close` (same
  operation as the app-bar back chevron). `active` _is_ the history on mobile — no `history` field.
  Desktop renders the same list side-by-side; operations unchanged.
- **Drawer = complementary.** `complementarySidebarState` drives splitter mode
  (`closed→start`, `collapsed→split`, `expanded→end`); `complementarySidebarPanel` selects the
  companion variant. `UpdateComplementary` works unchanged. `SimpleLayoutState.drawerState` /
  `companionVariant` are retired.
- **Dialog / popover / toasts:** already shape-identical in `EphemeralDeckState`; unchanged.
- Desktop-only operations (adjust, plank sizing, expose, companion planks) are never invoked on
  mobile; they remain as-is.

### D. Testing

- Stories: `MobileDeckLayout` + the keyboard-simulation story move to `plugin-deck`;
  `NavigationStack` story ported.
- Unit: stack push/pop projection added to `plugin-deck/src/layout.test.ts`.
- iOS: simulator run of the mobile plugin set — spaces list → Chat → ChatThread, keyboard drawer,
  voice input; compared against the phase-1 baseline.
- Desktop regression: deck storybook + existing tests unchanged.

## Out of scope

- Folding Spotlight into deck.
- Any change to deck's desktop rendering or operations.
- Physical-device deployment (simulator only for this PR).
