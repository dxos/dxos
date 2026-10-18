---
'@dxos/react-ui': patch
'@dxos/plugin-deck': patch
---

Composer UI polish: board and calendar controls show translated labels; board cards truncate their titles and draw a light border; card posters cap at 200px; person cards show a 120px headshot with initials in the header; kanbans gain an optional description, which their card shows under the title; and stacked plot bars are supported. A virtual stack re-measures its tiles when a smooth scroll stops, so mailbox tiles no longer overlap; the companion pane stays open when switching planks; a flat plank's breadcrumb title keeps its size and place; L0 space avatars get a stable colour from their id; canvas inspectors float by default; and the calendar article gets the mailbox's filter box with saved views (`QueryEditor` takes `commandHint={false}` to drop its "Press '#' for commands" hint). Agents can enable the Drawing skill themselves.
