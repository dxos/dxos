---
'@dxos/plugin-higgsfield': minor
---

New `@dxos/plugin-higgsfield`: a headless Composer plugin contributing a Higgsfield Cloud Connector (API key id + secret) and `plugin-studio` `GenerationService`s for `image` (default model `higgsfield-ai/soul/v2/standard`) and `video`, implemented over the asynchronous `POST /<model>` → `GET /requests/{id}/status` API through the edge CORS proxy.
