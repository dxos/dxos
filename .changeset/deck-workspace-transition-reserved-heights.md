---
'@dxos/react-ui': minor
'@dxos/plugin-deck': minor
---

Workspace switches crossfade between two live decks instead of running a view transition, and objects open without one, so both settle several times faster in WebKit. `Hooks.createHeightMemory` and `Hooks.useReservedHeight` let a component hold the height it last rendered at while its content reloads; plugin-stack keeps section heights in `StackCapabilities.SectionHeights`, `mermaid()` takes a `cache` of rendered diagrams, and plugin-deck's `ShownDeckState` provides the deck state a non-live deck renders. CodeMirror themes are built once instead of per editor.
