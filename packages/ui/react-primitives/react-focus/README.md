# `@dxos/react-focus` — composite-widget focus primitives

Headless focus management for widgets the user reaches with one `Tab` and then
moves around inside with the arrow keys, plus the app's hotkey registry. No
theme, no tokens, no components — the runtime dependencies are React, the DOM,
`@zag-js/hotkeys` for the hotkey store, and `@dxos/util` for platform detection.

- **`useFocusGroup`** — arrow-key navigation across a container's items (`axis`)
  and a `Tab` boundary around them (`tabBehavior`). One hook takes both.
- **`findFirstFocusable` / `findLastFocusable`** — plain DOM queries, no hook.
- **`trackKeyboardModality`** — reflects keyboard-vs-pointer navigation onto the
  document body.

Replaces `@fluentui/react-tabster`, whose Mover/Groupper runtime cost 68 KB of
the eager boot graph for the four hooks this repo used.

Themed components built on this — `Focus.Group`, `Focus.Item` — live in
`@dxos/react-ui`, which is where the theme is.

**Design, alternatives and the test plan: [`docs/FOCUS.md`](./docs/FOCUS.md).**
