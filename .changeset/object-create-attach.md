---
'@dxos/assistant-toolkit': minor
'@dxos/plugin-client': patch
---

Add an optional `attach` flag to the `database.objectCreate` operation that files the created object in the space root collection (visible in the navigation tree). CLI: `dx profile create` templates now enable edge features (fixes device invitations hanging at "Connecting…" for CLI-created profiles), and `dx halo share` prints the joinable URL.
