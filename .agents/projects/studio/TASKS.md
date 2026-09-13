# studio — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Studio's own ledger: `packages/plugins/plugin-studio/TASKS.md`.

## Phase 1: plugin-higgsfield (image + video provider)

- [x] Skeleton (`package.json`, `moon.yml`, `dx.config.ts`, `meta`, `events`, `plugin.tsx`,
      `HiggsfieldPlugin.ts`, `index.ts`) modelled on plugin-heygen; icon `ph--scribble-loop--regular`, hue `lime`.
- [x] Connector (`source: higgsfield.ai`): key id + secret form → `AccessToken.token = "id:secret"`.
- [x] `HiggsfieldProvider`: `POST /<model>` → `request_id`; poll `GET /requests/{id}/status` with
      2s→10s backoff; `completed` → `images[].url` | `video.url`; `failed`/`nsfw`/`canceled` → error.
- [x] Two `GenerationService`s from one provider: `image` (default model
      `higgsfield-ai/soul/v2/standard`) and `video` (required `model` path, no default).
- [x] Unit tests (stubbed fetch) + env-gated live integration test (`HF_API_KEY_ID` / `HF_API_KEY_SECRET`).
- [x] Register in composer-app (`plugin-defs.tsx` dev defaults, `package.json`, `tsconfig.json`, `tsconfig.all.json`).
- [x] `docs/DESIGN.md`, `PLUGIN.mdl` (+ QA flow), README; build, lint, test, format.
- [x] Verified in the running app: registry card (scribble/lime), Connections → Higgsfield two-field form, Studio artifact provider = Higgsfield with the model default.
- [ ] PR.
- [ ] Live generation blocked: the provided account answers `403 not_enough_credits` (auth + proxy proven via the 404 status test).

## Phase 2: adjacent fixes (same PR)

- [x] Dev server brands as the `dev` channel: boot mark filter + favicon middleware (`channel-branding.ts`).
- [x] `TaskSet` hidden from the Database section (`HiddenAnnotation`, like `Milestone`).

## Phase 3: Project as the studio root (design: `agents/superpowers/specs/2026-09-13-studio-projects-design.md`)

- [ ] plugin-studio contributes a `ProjectCapabilities.Template` ("Studio") whose scaffold parents a `Lightbox` to the project and files it in `project.artifacts`.
- [ ] Remove the Studio navtree section, the virtual Artifacts node, `ArtifactsArticle`, and the `ARTIFACTS_*` paths/constants.
- [ ] Lightbox toolbar gains **Add artifact** (create dialog → `lightbox.items` + `project.artifacts`).
- [ ] `MediaArtifact` create entry `targetNodeId` falls back to the project's Artifacts branch.
- [x] `ObjectMasonryArticle` search input centred in its toolbar (`Toolbar.Root`).

## Follow-ups

- [ ] Generic mechanism for plugins to add **create menu items to an article's toolbar** (e.g. a
      `CreateObjectEntry`-style capability the Lightbox/Project article's `+` reads), replacing the
      hard-wired Lightbox "Add artifact" action.
- [ ] Verify a video model path against a real account and set it as the video default.
- [ ] Model picker (`fieldMap`) once Higgsfield exposes a model catalog endpoint.
