---
'@dxos/plugin-assistant': patch
'@dxos/react-client': patch
---

Move the `useFlush` hook from `@dxos/plugin-assistant/hooks` to `@dxos/react-client/echo`. It operates on a `Space`, so it belongs with the other space hooks; import it from `@dxos/react-client/echo` instead of `@dxos/plugin-assistant/hooks`.
