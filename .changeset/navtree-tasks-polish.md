---
'@dxos/react-ui-list': minor
'@dxos/react-ui-task': minor
'@dxos/react-ui-trace': patch
'@dxos/react-ui': patch
'@dxos/react-ui-assistant': patch
'@dxos/react-ui-debug': patch
'@dxos/react-ui-feed': patch
'@dxos/plugin-deck': patch
'@dxos/plugin-navtree': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-debug': patch
'@dxos/plugin-space': patch
'@dxos/devtools': patch
---

Navigating to a collection in the navtree highlights the collection rather than the documents its deck
opened in its place (`@dxos/plugin-deck/DeckSeed.sourceOf`), and choosing one of those documents
selects it (`NavTreeCapabilities.State.pick`); a flattened deck opens the collection itself instead of
showing its documents as a breadcrumb trail. `Tree` leaves a dragged row in place at half opacity
(`hideDragSource` restores removal) and declares drags a move, so the cursor no longer flickers to a
copy "+". `Gantt.Chart` opens scrolled to its newest events.

Task list rows show a task's pull requests in their own column on the title line, left of the
assignee; the assignee picker offers the space's members, the owner included (`TaskProperties` takes
`members`); the assignee chip opens its session card on click rather than hover, which had left it
stuck open. `tasks.create` and `tasks.update` reject an assignee that names no one — it must carry a
contact, a member's `identityDid`, or an agent session. Copy-to-clipboard buttons use
`SystemIconButton.Clipboard`, so they share one icon and the "Copied" confirmation.
