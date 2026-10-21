---
'@dxos/assistant': minor
---

**Breaking:** the `Chat` type is renamed `Session`: import `@dxos/assistant/Session` (was `/Chat`) and use `Session.Session` (was `Chat.Chat`); the `Chat` namespace export of `@dxos/assistant` is now `Session`. The persisted typename (`org.dxos.type.assistant.chat`) is unchanged, so existing data is unaffected.
