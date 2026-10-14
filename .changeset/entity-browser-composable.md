---
'@dxos/plugin-agent': patch
'@dxos/plugin-discord': patch
'@dxos/react-ui': minor
'@dxos/react-ui-components': minor
---

Hand-built agent panels follow the form's layout, and the entity browser slots into its host.

- `@dxos/react-ui-components`: **Breaking:** `Section` is removed; build a labelled group with react-ui's `Fieldset.Root` and `Fieldset.Legend` (the form's label row) instead.
- `@dxos/plugin-agent`: the Activity panel lays out its groups in the form's frame (`Form.Viewport`, `Fieldset`). `AgentKnowledge.Browser` (`EntityBrowser`) is composable, its horizontal scroll frame the root, so a host's `Panel.Body asChild` slots onto it instead of nesting a second panel. The email channel's settings are a panel whose header toolbar reads "Email" with one connect/disconnect toggle, as Activity's, and the form scrolls beneath it.
- `@dxos/plugin-discord`: the Discord setup panel uses the same form frame and `Fieldset` groups.
- `@dxos/react-ui`: `Layout.Columns` lays out a horizontal run of columns sized to whole shares of the space (as many as fit at a minimum width, each an exact fraction), scrolling a column at a time and following the newest. `Status.Empty` reads at the label's size (`text-sm` by default), so every empty state is the same secondary text. Overlay scroll thumbs sit flush with the ends of their track, as they already did with its side.
