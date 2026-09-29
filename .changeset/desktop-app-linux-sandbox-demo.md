---
'@dxos/plugin-assistant': patch
---

Desktop app fixes found by driving it end to end: a missing Ollama launcher no longer fails every model resolver
(the assistant answered nothing where Ollama is not bundled); plugin switches are no longer read-only for the whole
first session (settings sync now starts once the first identity exists, and identity setup keeps the settings object
it already named); the inline plugin load prompt no longer grows past the chat to fit a long URL. Local sandboxes
gain Publish Files, which serves a sandbox directory to the app so a plugin built there can be loaded by URL.
