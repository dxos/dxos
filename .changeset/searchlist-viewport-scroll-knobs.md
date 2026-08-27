---
'@dxos/react-ui-search': patch
'@dxos/plugin-assistant': patch
---

`SearchList.Viewport` forwards the ScrollArea `thin`/`padding`/`centered` knobs instead of hard-coding them, mirroring `Listbox.Viewport`; the defaults are unchanged. The chat options Skills list opts out of the padding so its rows sit flush to the popover edge like the sibling View and Models panels.
