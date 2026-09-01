---
'@dxos/react-ui-components': minor
'@dxos/react-ui-assistant': minor
---

`TogglePanel` is rebuilt on `@ark-ui/react`'s Collapsible. The header is now a real `<button>` carrying the machine's disclosure ARIA (`aria-expanded`, `aria-controls`) instead of a click-handling `<div>`, and the body animates against the `--height` the machine measures rather than a `grid-template-rows` ramp. A `duration` of `0` still opts out of the animation entirely.

The compound's parts and props are unchanged, so existing consumers need no edits. `TogglePanel.Header` gains an optional `caret` prop (`'start' | 'end'`, default `'start'`) selecting which edge the disclosure indicator sits on, and now accepts the standard button attributes.

`ToolWidget` uses that: a tool run's summary renders as a bare text row with a trailing caret rather than a bordered panel header, so a collapsed run reads as a single line in the feed and the border belongs to the list it opens onto. The calls themselves are now an `Accordion` from `@dxos/react-ui-list`, which supplies the APG keymap the hand-rolled rows never had. A call carrying no payload stays a plain, non-expandable row.
