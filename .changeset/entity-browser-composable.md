---
'@dxos/plugin-agent': patch
'@dxos/plugin-discord': patch
'@dxos/react-ui': patch
'@dxos/react-ui-components': patch
---

Hand-built agent panels follow the form's layout, and the entity browser slots into its host.

- `@dxos/react-ui-components`: `Section` is built like a form field — its label is the field's label row (`Field.Header`) and type, flush with the content edge rather than inset by a list row's padding — so a panel of sections reads as a form beside it.
- `@dxos/plugin-agent`: the Activity panel lays out its sections in the form's frame (`Form.Viewport`, fields' spacing). `AgentKnowledge.Browser` (`EntityBrowser`) is composable, its horizontal scroll frame the root, so a host's `Panel.Body asChild` slots onto it instead of nesting a second panel. The email channel's settings are a panel whose header toolbar reads "Email" with one connect/disconnect toggle, as Activity's, and the form scrolls beneath it.
- `@dxos/plugin-discord`: the Discord setup panel uses the same form frame.
- `@dxos/react-ui`: `Status.Empty` reads at the label's size (`text-sm` by default), so every empty state is the same secondary text.
