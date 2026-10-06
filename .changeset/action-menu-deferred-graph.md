---
'@dxos/react-ui-menu': patch
---

A deferred `ActionMenu` (`deferUntilOpen`) no longer builds its action graph until it is first opened, so a list that renders one per row mounts each row without creating a graph per menu.
