# plugin-studio — Design

## Goal

Extend plugin-studio with more generation providers. First: **plugin-higgsfield**, a headless plugin
(Connector + `GenerationService`) for the Higgsfield Cloud API, modelled on plugin-heygen.

## Decisions

- **D1 — One provider, two kinds.** The Higgsfield API is model-path generic (`POST /<model>`, then
  `GET /requests/{id}/status`) and the completed payload discriminates by shape (`images[]` vs
  `video`), so a single `HiggsfieldProvider` backs both an `image` and a `video` `GenerationService`.
- **D2 — Only the documented model is defaulted.** `higgsfield-ai/soul/v2/standard` (text-to-image)
  is the only path in the public docs; video model paths are per-account, so the video service
  requires the user to enter one.
- **D3 — Credential is `id:secret` in one `AccessToken.token`.** The API takes
  `Authorization: Key <id>:<secret>`; the connector form has two fields and joins them, so the
  studio's `CredentialsService` lookup (one `apiKey` string) needs no change.
- **D4 — Edge CORS proxy.** `api.higgsfield.ai` is server-side only (no browser CORS); requests go
  through `proxyFetchLegacy`, which remaps `Authorization` to `X-Cors-Proxy-Authorization` for the
  proxy to restore — the same path plugin-typefully and plugin-duffel already rely on.
- **D5 — Poll per the docs.** 2 s start, ×1.5 up to 10 s, stop on `completed | failed | nsfw | canceled`,
  5 min application timeout; the `status_url` from the submit response is used verbatim.

## Per-package docs

- `packages/plugins/plugin-higgsfield/docs/DESIGN.md` — the plugin-level design.
