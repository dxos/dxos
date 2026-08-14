---
'@dxos/plugin-assistant': patch
---

Fix chat requests failing with `AiModelNotAvailableError` because the edge and local model resolvers activated after the AI service had already snapshotted its resolver list.
