# plugin-studio — Tasks

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

- [x] plugin-studio contributes a `ProjectCapabilities.Template` ("Studio") whose scaffold parents a `Lightbox` to the project and files it in `project.artifacts`.
- [x] Remove the Studio navtree section, the virtual Artifacts node, `ArtifactsArticle`, and the `ARTIFACTS_*` paths/constants.
- [x] Lightbox toolbar gains **Add artifact** (create dialog → `lightbox.items` + `project.artifacts`).
- [x] `MediaArtifact` create entry `targetNodeId` falls back to the project's Artifacts branch.
- [x] `ObjectMasonryArticle` search input centred in its toolbar (`Toolbar.Root`).

- [x] Cold-load Connect: plugin-connector requests `ConnectorEvents.Start` from `connectorAuth`, and
      `connectorIds` resolvers read providers through `get` (studio, blogger).
- [x] Media artifact article hides the variants half until something is produced.
- [x] Lightbox board cell `+` opens the same create dialog (artifact lands in the clicked cell).

## Phase 4: Storyboard + Studio skill experiment (design in plugin docs/DESIGN.md)

- [x] Accordion → react-ui (ark primitives), `leading` slot + `ref` on Item.
- [x] `Storyboard` / `Frame` types, `StoryboardArticle` (accordion, dnd reorder, append frame), story.
- [x] Nested artifact article: `nodeId` prop, studio graph nodes for frame artifacts, self-expanding actions.
- [x] `StudioOperation.CreateStoryboard` / `AppendFrame` / `ListProviders` + handlers + tests.
- [x] `org.dxos.skill.studio` skill definition; Studio template task + skills.
- [x] `stories-assistant` `Studio.stories.tsx`: seeded Studio project, Higgsfield enabled, scripted + live play.
- [x] `StoryboardPlayer` (sequential playback) + splice design/task.

- [x] Higgsfield video = Soul still → DoP animation (image-to-video); live clip generated end to end.
- [ ] Live story flake: the first attempt in a fresh runner is starved (prompt never reaches the thread
      for ~200 s, the retry passes); `PersistentLifecycle Start failed: Edge connection closed` in two
      runs. Investigate the harness before relying on the live story.
- [ ] `tasks-update` from the live model fails with `Invalid EID: echo://…` (plugin-tasks input parsing).

## Follow-ups

- [ ] Retrofit the storyboard shape to plugin-presenter: a `Slide` surface for `Frame`, a pager over
      `storyboard.frames`; then a generic vertical container shared by storyboard and deck.
- [ ] Splice frames into one file with ffmpeg.wasm behind `StudioOperation.Splice` (DESIGN.md).

- [ ] Generic mechanism for plugins to add **create menu items to an article's toolbar** (e.g. a
      `CreateObjectEntry`-style capability the Lightbox/Project article's `+` reads), replacing the
      hard-wired Lightbox "Add artifact" action.
- [ ] Verify a video model path against a real account and set it as the video default.
- [x] Shared `GenerationService.fieldOptions` → cached combobox (`ProviderOptionsField`); HeyGen migrated, Higgsfield static image list.
- [ ] Higgsfield model catalogue from the API once it exposes one.
