---
'@dxos/plugin-deck': minor
'@dxos/app-toolkit': minor
---

Composer renders mobile natively, projecting the active deck as a navigation stack with a companion
drawer; plugin-simple-layout is retired and the layout mode it reported as `'simple'` is now
`'mobile'`. `Card` with `fullWidth` tracks its container instead of holding a minimum width.

The mobile renderer itself lives in the new (unpublished) `@dxos/plugin-mobile`, which reads deck
state and owns no state of its own. `plugin-deck` keeps every operation, the URL handler and the
layout state, and `DeckPlugin.make({ platform: 'mobile' })` now means headless: it contributes no
React root and no mobile surfaces, leaving those to the mobile plugin. Deck additionally exposes a
`./hooks` entrypoint, `./overlays` (the shared dialog/popover/toaster shell) and `./testing` (the
story harness) so a co-registered renderer can drive them.
