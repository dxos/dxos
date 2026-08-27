---
'@dxos/react-ui-search': patch
'@dxos/plugin-assistant': patch
---

`SearchList.Viewport` forwards the ScrollArea `thin`/`padding`/`centered` knobs instead of hard-coding them, mirroring `Listbox.Viewport`; the defaults are unchanged. The chat options Skills and Objects lists opt out of the padding so their rows sit flush to the popover edge like the sibling View and Models panels, and the Objects list drops its chrome padding so the rows align with the toolbar and search input below it.
