---
'@dxos/plugin-native': patch
---

Spawn Ollama as a scoped shell command (`ollama` at `$RESOURCE/ollama`) instead of a Tauri sidecar, so the launcher is no longer signed with the app's restricted entitlements and killed by macOS at launch. Hosts must grant `shell:allow-spawn` for `{ "name": "ollama", "cmd": "$RESOURCE/ollama", "args": ["serve"] }` and bundle the launcher at `Contents/Resources/ollama`. Connection failures and unexpected process exits are now logged.
