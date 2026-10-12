---
'@dxos/plugin-deck': patch
'@dxos/plugin-agent': patch
---

- `@dxos/plugin-deck`: the companion comes back after leaving fullscreen (ending a presentation), instead of staying hidden until a reload.
- `@dxos/plugin-agent`: a relay only uses the agent's current channels, and a DM the backend refuses falls through to the Composer chat.
