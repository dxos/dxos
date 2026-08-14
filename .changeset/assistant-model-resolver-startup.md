---
'@dxos/plugin-assistant': patch
---

Fix chat requests failing with `AiModelNotAvailableError` because the edge and local model resolvers activated after the AI service had already snapshotted its resolver list. A model the configured provider does not serve is now named in the chat's failure toast instead of reported as an unexpected error, and `@dxos/react-ui`'s own translations are registered at startup so its primitives no longer render raw keys (e.g. `toolbar-close.label` on a toast's close button).
