# studio — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Studio's own ledger: `packages/plugins/plugin-studio/TASKS.md`.

## Phase 1: plugin-higgsfield (image + video provider)

- [ ] Skeleton (`package.json`, `moon.yml`, `dx.config.ts`, `meta`, `events`, `plugin.tsx`,
      `HiggsfieldPlugin.ts`, `index.ts`) modelled on plugin-heygen; icon `ph--scribble-loop--regular`, hue `lime`.
- [ ] Connector (`source: higgsfield.ai`): key id + secret form → `AccessToken.token = "id:secret"`.
- [ ] `HiggsfieldProvider`: `POST /<model>` → `request_id`; poll `GET /requests/{id}/status` with
      2s→10s backoff; `completed` → `images[].url` | `video.url`; `failed`/`nsfw`/`canceled` → error.
- [ ] Two `GenerationService`s from one provider: `image` (default model
      `higgsfield-ai/soul/v2/standard`) and `video` (required `model` path, no default).
- [ ] Unit tests (stubbed fetch) + env-gated live integration test (`HF_API_KEY_ID` / `HF_API_KEY_SECRET`).
- [ ] Register in composer-app (`plugin-defs.tsx` dev defaults, `package.json`, `tsconfig.json`, `tsconfig.all.json`).
- [ ] `docs/DESIGN.md`, `PLUGIN.mdl` (+ QA flow), README; build, lint, test, format.
- [ ] PR.

## Follow-ups

- [ ] Verify a video model path against a real account and set it as the video default.
- [ ] Model picker (`fieldMap`) once Higgsfield exposes a model catalog endpoint.
