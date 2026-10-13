---
'@dxos/react-ui': patch
---

Popover, tooltip, menu and hover-card arrows show whole on every side: a popup is now its own stacking context, so its arrow paints over the popup's surface and ring instead of beneath them. A hover preview (a reference chip's card) stays open while the pointer is over it, so its menu can be reached: `Popover.Content` marks itself as popover content again. The shell's HALO dialogs (joining a space or identity, profile, invitations) put their buttons on one line in `Dialog.Footer`, replacing the stacked `ActionBar`, which is removed. A space invitation card sits on its host card's columns, with a smaller avatar. `Syntax.Content` is unpadded, so the panel hosting it owns the frame. Canvas shortcut labels show a shifted digit as its key cap (`⇧0`, not `⇧)`).
