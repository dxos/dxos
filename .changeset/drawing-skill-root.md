---
'@dxos/drawing': patch
---

The drawing skill now lives at the repository root, so `npx skills add dxos/dxos --skill drawing` installs it; it documents installing the `drawing` CLI and putting nodes in groups. A `.dx` group with no members is now dropped with a warning instead of crashing the layout.
