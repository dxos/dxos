# Mobile (plugin-deck) manual testing plan

Branch `claude/plugin-deck-mobile-support-2ae1dd` — PR [#12676](https://github.com/dxos/dxos/pull/12676).
Everything below either cannot be verified by automation in this environment or was machine-verified
only in the iOS **simulator** / desktop Chromium and deserves a human pass. Each item states the
expected result; check it off or note the deviation.

## Setup

Fresh simulator/device build (frontend must be built with the mobile set first):

```bash
cd packages/apps/composer-app && DX_PLUGIN_SET=mobile pnpm exec vite build --configLoader native
```

```bash
cd packages/apps/composer-app && ./scripts/ios-build.sh --debug --sim
```

Install/launch: the built app is `src-tauri/gen/apple/build/arm64-sim/Composer.app`
(`xcrun simctl install booted <path>` / `xcrun simctl launch booted org.dxos.composer`).
Browser-mobile equivalent (faster iteration): `DX_MOBILE=1 moon run composer-app:serve -- --port 5199`
at a 375×812 viewport. Note: a first load after a cold Vite start can fail with a lazy-plugin
resolve error — reload once.

Mobile rendering itself now lives in `@dxos/plugin-mobile` (a renderer over deck state, owning
none of its own); `plugin-deck` stays headless on mobile — no React root, no mobile surfaces. The
`mobile` plugin set (`DX_PLUGIN_SET=mobile`) is fixed — core (`externalPlugins: false`) plus
Assistant/Markdown/Projects/Transcription. Its registry lists those and nothing else: no public
catalog, no load-by-URL, and no Registry entry in Settings. The full dev registry
(`plugin-defs.tsx`) used by the plain `moon run composer-app:serve` dev server is unaffected and
still extensible; `DX_MOBILE=1` there only swaps the _layout_, not the plugin set, so the catalog is
still reachable in dev — the fixed-set assertion below only holds when built/served with
`DX_PLUGIN_SET=mobile`.

## A. Fixed on the branch — verify on device

| #   | Steps                                                                           | Expected                                                                                                                            |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Space Home → "Get started" cards                                                | Cards fit the viewport; ~16pt side margins; NO horizontal page scroll.                                                              |
| A2  | Any list panel (MY SPACE) → search field at bottom                              | Placeholder reads "Search…", not `search.placeholder`.                                                                              |
| A3  | Tap the app-bar back chevron repeatedly from nested panels                      | Every tap pops exactly one panel; target feels comfortably tappable (44pt); no mis-taps into neighbors.                             |
| A4  | Item → ⋮ menu → Rename                                                          | Popover opens anchored to the menu button (was broken).                                                                             |
| A5  | Space Home → tap a "Get started" card once                                      | Card fires reliably on first tap (was unresponsive on iOS); a new chat opens with the prompt running.                               |
| A6  | Space list: ⋮ → Add to space → Session                                          | Creates and opens a chat (alternate chat path).                                                                                     |
| A7  | Categories: MY SPACE → Settings / Communications / Content / Assistant / System | Each shows a list panel of its children; each category row has a real icon (chats/files/sparkle/gear), not a letter avatar.         |
| A8  | Chat prompt                                                                     | A Send button is visible and submits the drafted message; disabled while empty or while a request is active (never a silent no-op). |
| A9  | Chat prompt on mobile                                                           | No offline switch (still present on desktop, any width).                                                                            |
| A10 | Open a chat on mobile                                                           | No outline rail on the left, no status pill; turn navigation (toolbar arrows) still works.                                          |
| A11 | Settings → Profile                                                              | DID field shrinks; copy button stays inside the panel.                                                                              |
| A12 | Registry → open a plugin (e.g. Markdown) — **dev-server only, see note**        | No horizontal scroll; text column uses most of the width.                                                                           |
| A13 | Registry plugin list — **dev-server only, see note**                            | Cards visibly distinct from the panel background.                                                                                   |
| A14 | Any list panel on touch                                                         | First row is not highlighted at rest (keyboard selection unaffected on desktop).                                                    |

**Note (A12/A13):** the `mobile` plugin set built for device/simulator carries `RegistryPlugin` but
lists only the four plugins it ships (see Setup above), so the catalog rows these exercise exist
only on the dev server (`DX_MOBILE=1 moon run composer-app:serve`), not in the on-device build.

## B. Simulator-verified, needs a human/device pass

| #   | Steps                                                                                                                              | Expected                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Left-edge swipe from ~8pt into the screen on a pushed panel                                                                        | Interactive pop with parallax; release past halfway completes, else snaps back. Feel should match UIKit.                                                                                                             |
| B2  | Open a chat, focus the prompt (real device or sim with software keyboard: I/O → Keyboard → toggle "Connect Hardware Keyboard" OFF) | Layout shrinks smoothly with the keyboard; no jump/flicker; app bar shows Done state; nav bar hides. Keyboard close restores layout.                                                                                 |
| B3  | Drawer: in a panel with companions, tap a companion icon in the navbar                                                             | Bottom drawer opens at half height; expand → full; close → hidden. With keyboard open, drawer behavior stays sane.                                                                                                   |
| B4  | Voice: mic button in the chat prompt                                                                                               | Permission prompt on first use; recording starts; transcript text appears. **Known open defect: transcript accept/reject buttons were unresponsive in the sim walkthrough (Med-2, not yet fixed) — please confirm.** |
| B5  | Rotate the device                                                                                                                  | Portrait lock holds (from #12644).                                                                                                                                                                                   |
| B6  | Safe areas on a notched device                                                                                                     | App bar under the notch is padded (env(safe-area-inset-top)); bottom drawer clears the home indicator.                                                                                                               |

## C. Cannot be machine-tested here — human only

| #   | Steps                                                                             | Expected                                                                                                                 |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| C1  | Real iPhone (not simulator) install & boot                                        | App boots; single-client mode (no SharedWorker crash); identity provisioning works.                                      |
| C2  | Voice quality end-to-end on hardware mic                                          | Speech transcribed with usable accuracy; #12644's native mic bridge routes audio (check speaker/bluetooth switching).    |
| C3  | Device invitation: pair the mobile app with a desktop Composer (space invitation) | Space syncs both ways; edits on desktop appear on mobile and vice versa.                                                 |
| C4  | Scroll feel on long lists (NavBranch with many items)                             | 60fps-ish, momentum + edge bounce; no rubber-band fights with the pull gestures.                                         |
| C5  | Backgrounding/foregrounding the app mid-chat                                      | State survives; no white flash or reload loop.                                                                           |
| C6  | Low-connectivity behavior                                                         | Assistant errors surface as messages/toasts, not blank screens (EDGE `createAgent` 500s were observed in dev).           |
| C7  | Long session battery/thermals                                                     | No obvious runaway (the deck logs `startup timeout` warnings in constrained environments — should not appear on device). |

## D. Known open items (tracked, not blockers for the morning pass)

- Transcript accept/reject unresponsive on iOS (Task-14 Med-2) — B4 above.
- Sub-44pt touch targets exist outside the app bar (systemic; app bar fixed, rest follows the
  coarse-pointer scaling documented-but-unimplemented in `spacing.css`).
- `check-plugin-set` CI task guards only the `production` set; the `mobile` set has no CI guard.
- Unknown `DX_PLUGIN_SET` values fall through silently to the full registry.
- General tap-target flakiness in the simulator persists vs the old baseline (likely coordinate
  scaling in the harness, not the app — worth one human sanity pass, hence A3).
- App-bar "Done" button is a no-op while the keyboard is open (pre-existing, carried over from
  plugin-simple-layout).
- `Card fullWidth` semantics changed repo-wide (tracks the container instead of holding a minimum
  width) — worth eyeballing 2-3 desktop fullWidth cards during the manual pass.
- `DeckCapabilities.Platform` stays in `plugin-deck` for this cut, though `plugin-mobile` is its only
  consumer besides deck itself — moving it to `app-toolkit` is a tracked follow-up (design doc,
  "Out of scope").
- `plugin-deck`'s own `PLUGIN.mdl` still describes the mobile rendering that moved out to
  `plugin-mobile`; its mobile prose needs a refresh to point at the new package instead of
  re-describing behaviour deck no longer owns.
- A `DX_PLUGIN_SET=mobile` build still emits a handful of tiny inert chunks referencing the registry
  (e.g. `open-plugin-registry-*.js`, an "open registry" Settings operation-handler) even though
  `RegistryPlugin` itself is not part of the set and nothing in the UI can trigger loading them —
  confirmed via `vite build` + `vite preview` that no Registry entry or catalog is reachable. Worth
  chasing to full parity with the `production` set, which presumably has the same characteristic.
