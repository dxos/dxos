---
'@dxos/plugin-assistant': minor
'@dxos/react-ui-dashboard': patch
---

The `Chat` schema is no longer re-exported from the `@dxos/plugin-assistant/Assistant` namespace; import it from `@dxos/assistant-toolkit` instead. Plugin and UI packages also widen their `@dxos/react-ui` and `@dxos/ui-theme` peer-dependency ranges from an exact workspace pin to `workspace:^`, so consumers are no longer forced onto a single matching version.
