# plugin-mobile split — design revision

**Date:** 2026-08-20 · **Revises:** `2026-08-19-plugin-deck-mobile-design.md` (Approach C)
**Branch/PR:** same branch, PR #12676 (draft; never merged, so the revision replaces the
mobile-inside-deck packaging without a compatibility story).

## Decision (user)

Mobile rendering moves OUT of `plugin-deck` into a new **`plugin-mobile`** package. The unification's
core insight stands: **one state machine** — plugin-mobile is a renderer over deck state, never a
second state owner (the rejected shape remains rejected).

## Ownership

**`plugin-deck` keeps (unchanged):** `DeckCapabilities` (State/EphemeralState/**Platform**),
all operations incl. the mobile semantics (`pushSubjectsToStack`, push-on-open, no auto-open on
SwitchWorkspace), url-handler, app-graph-builder, desktop containers, Dialog/Popover/Toaster,
`useCompanions`/`useSelectedCompanion`, the story harness (`src/testing/`). Platform stays in deck
for this cut (plugin-mobile depends on deck regardless; moving it to app-toolkit is a tracked
follow-up).

**`plugin-mobile` gets (moved from plugin-deck):**

- `components/`: MobileLayout (+AppBar/NavBar/context), NavigationStack, Home, NavBranch,
  `hooks.ts` (useExpandPath), DebugOverlay, Loading — none read deck state.
- `containers/MobileLayout/` → its root layout (MobileDeckLayout et al.), MobileMain, MobileDrawer.
- Mobile hooks: useMobileStack, useMobileAppBar, useMobileActions.
- Mobile surface registrations (home, navBranch) and the mobile translation keys + the
  `react-ui-search` translations spread.
- New package is `"private": true`, deps `workspace:*` (incl. `@dxos/plugin-deck`), peer `workspace:^`.

**Root arbitration:** on mobile, composer registers BOTH `DeckPlugin` (state/ops, no root, no
surfaces) and `MobilePlugin` (root + mobile surfaces). Deck's `platform: 'mobile'` option comes to
mean "headless": its react-root/react-surface modules contribute nothing (or are not registered —
whichever the framework supports cleanly; the implementer verifies how `ReactRoot` contributions
are consumed when a co-active plugin contributes none and records the mechanism). plugin-assistant's
`usePlatform` and all `Layout.mode === 'mobile'` consumers are unaffected.

## Plugin set (first cut is FIXED, not extensible)

`plugin-defs.mobile.tsx`: `getCorePlugins({ ...config, isExtensible: false })` (drops
`RegistryPlugin`, mirroring the production set) + **Assistant, Markdown, Projects, Transcription**.
`getDefaults` lists those four keys. `MobilePlugin` joins via the core layout selection
(`isMobile` → Deck(headless) + Mobile).

## Out of scope

Moving Platform to app-toolkit (follow-up); any state/operation changes; desktop rendering changes.
