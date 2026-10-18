---
'@dxos/react-ui': patch
'@dxos/plugin-deck': patch
---

Composer UI polish: board and calendar controls show translated labels, board cards truncate their titles and draw a light border, card posters cap at 200px, person cards show a square headshot with initials in the header, and stacked plot bars are supported. The companion pane stays open when switching planks, a flat plank's breadcrumb title keeps its size and place, L0 space avatars get a stable colour from their id, the activity grid hides a month label clipped by its edge, and the calendar article gets the mailbox's filter box with saved views. `QueryEditor` takes `commandHint={false}` to drop its "Press '#' for commands" hint where a caller's own placeholder already covers it.
