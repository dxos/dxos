---
'@dxos/react-ui-form': minor
'@dxos/plugin-space': patch
---

The rename popover for an object now holds its edits until Save, and shows Cancel and Save beneath the form. `ObjectProperties` takes an optional `onClose` that makes it a transient editor rather than a live pane: Save writes every edit at once and calls it, Cancel discards them and calls it. Without `onClose` the component is unchanged, so every properties pane that hosts it still writes each change as it is made. `Form.Viewport` takes a `footer` alongside `scroll`, which pins the actions below the scrolling fields so a form longer than its pane keeps Save in reach.
