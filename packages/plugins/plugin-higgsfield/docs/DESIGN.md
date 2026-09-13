# plugin-higgsfield — Design

## Goal

A headless Composer plugin that adds Higgsfield Cloud as a `plugin-studio` generation provider,
modelled on `plugin-heygen`: a Connector for the credential and `GenerationService` contributions
for the media kinds the API produces.

## The API

- Base `https://api.higgsfield.ai`; header `Authorization: Key <keyId>:<keySecret>`; server-side
  only (no browser CORS).
- Submit: `POST /<model path>` with a flat JSON body (`{ prompt, … }`). Returns
  `{ status: 'queued', request_id, status_url, cancel_url }`.
- Poll: `GET /requests/{request_id}/status`. Terminal states `completed | failed | nsfw | canceled`;
  a completed payload carries `images[].url`, `video.url` or `audio.url`/`audios[]` depending on the
  model's output type.
- The public OpenAPI spec lists only the status/cancel operations. Model endpoints are
  account-specific; the only path in the docs is `higgsfield-ai/soul/v2/standard` (text-to-image).

## Decisions

- **D1 — One provider, two services.** Every model shares the same lifecycle and the completed
  payload discriminates by shape, so one `HiggsfieldProvider` (`enqueue` / `awaitResult`) backs
  both the `image` and the `video` `GenerationService`. Both are contributed from one module via
  `Capability.contributeAll`.
- **D2 — Video is Soul → DoP.** Probing the cost-free `estimate` endpoint showed Higgsfield's video
  models (`higgsfield-ai/dop/{lite,turbo,standard}`) are image-to-video (`image_url` required) and
  text-to-image is `higgsfield-ai/soul/{v2/standard,standard}`. The video service therefore runs
  the still as a synchronous Soul job inside `enqueue` (the studio persists one job id) and returns
  the DoP animation's id; a config `imageUrl` skips the still. Both `model` fields are comboboxes
  over the verified paths, free text accepted.
- **D3 — Two-field credential, one token.** The connector form has `keyId` and `keySecret`;
  `onSubmit` joins them as `<id>:<secret>` into a single `AccessToken.token` so studio's
  `CredentialsService` lookup (one `apiKey` string) needs no change. The provider prefixes `Key `
  when building the header.
- **D4 — Edge CORS proxy.** `proxyFetchLegacy` remaps `Authorization` to
  `X-Cors-Proxy-Authorization` for the proxy to restore (the path plugin-typefully and plugin-duffel
  already use). Verified live: an unknown request id answers `404` (credential accepted), and a
  submit answered `403 not_enough_credits` — the request reached Higgsfield and was authenticated.
- **D5 — Poll per the docs.** The submit response's `status_url` is polled verbatim (the documented
  `/requests/{id}/status` only when a response omits it) and is what the studio persists as the job
  id, so a poll resumed after a remount hits the endpoint the submission named. 2 s initial
  interval, ×1.5 backoff to a 10 s ceiling, `5xx` retried, any other non-2xx stops. One 5 min
  operation deadline covers every poll and the sleeps between them, and each HTTP round trip has
  its own 60 s deadline, so a stalled socket cannot pend past either. The non-terminal status is
  reported through `onProgress({ status })` so the studio meter shows Queued / Generating.
- **D6 — Output mime follows the media produced**, not the service kind: `images[]` →
  `image/jpeg`, `video` → `video/mp4`, `audio(s)` → `audio/mpeg`. A video model entered in an image
  artifact still yields a playable variant.

## Out of scope (v1)

- Image-to-video / reference inputs (needs the file-upload flow: `POST /files/generate-upload-url`).
- A model picker — there is no catalog endpoint in the public API.
- Cancellation (`POST /requests/{id}/cancel`) — the studio meter's cancel aborts the poll; the
  queued job is left to Higgsfield.
- Webhooks.
