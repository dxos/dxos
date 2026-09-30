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
- [x] Unit tests (stubbed fetch) + env-gated live integration test (`HIGGSFIELD_API_KEY` / `HIGGSFIELD_SECRET_API_KEY`).
- [x] Register in composer-app (`plugin-defs.tsx` dev defaults, `package.json`, `tsconfig.json`, `tsconfig.all.json`).
- [x] `docs/DESIGN.md`, `PLUGIN.mdl` (+ QA flow), README; build, lint, test, format.
- [x] Verified in the running app: registry card (scribble/lime), Connections → Higgsfield two-field form, Studio artifact provider = Higgsfield with the model default.
- [x] PR — #13078, #13087, #13095, #13110, #13111, #13112 merged.
- [x] Live generation: the account now answers the estimate endpoint; Kling/Hailuo/Wan paths verified 2026-09-15.

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
- [x] Video model paths verified against the account (DoP default; Kling 2.1/2.5, Hailuo 2.3, Wan 2.5 listed).
- [x] Shared `GenerationService.fieldOptions` → cached combobox (`ProviderOptionsField`); HeyGen migrated, Higgsfield static image list.
- [ ] Higgsfield model catalogue from the API once it exposes one.

### Observed 2026-09-15 (Composer, project/task session)

- [x] Task list (plugin-tasks): the inline task editor scrolls past eight lines (#13112); object
      links in it come through the host's `descriptionExtensions`.
- [x] Chat session: inline ECHO object links — already rendered: `[label](echo://…)` in a text block
      through `objectLinks()` in the feed Block extensions, and parsed `<object>` reference blocks
      through the `<reference>` → `ReferenceWidget` chip; both carry the preview hover card. Test
      against `plugins/plugin-assistant/components/Thread → Default` (its generator emits one link).
      Embedded cards (`![label](echo://…)`) now render too: `objectImage` threads from
      `ChatThread.Root` to the block's `objectLinks({ image })`, plugin-assistant supplies
      `ObjectCardWidget` (header + `CardContent` surface). A bare `echo://…` / `@echo://…` in prose
      is rewritten by the renderer (embed alone on a line, link in a sentence), and a
      `<surface role='card'>` shows the object's card too (#13134).
- [x] Task list toolbar: text filter (title/description, keeps a match's ancestors) on the standalone `TaskSetArticle`.

### Observed 2026-09-14 (Composer, studio session)

- [x] Frame companion **Generate** loses its spinning state when navigating away and back — busy now
      also reads the op's progress monitor (`<plugin>/<artifactId>`), and the resume effect waits
      while that op still runs instead of starting a second poll on the same job.
- [x] Chat tools accordion ("Ran 13 commands") has no border — frame uses `border-separator`; row hover (`--color-hover-surface-subtle`) lifted 0.02 → 0.035.
- [x] Chat tools accordion header row: the title is not vertically centred — label centred on the control-tall icon line.
- [x] The Help companion for a Project article showed the Inbox text — when several plugins register a schema, the one contributing a `CreateObjectEntry` for the typename owns it.
- [x] Frame companion `model` / `imageModel` comboboxes showed the raw path when closed — `ComboboxField` derives the label of a stored value from the loaded catalogue.
