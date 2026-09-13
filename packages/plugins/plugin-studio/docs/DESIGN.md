# plugin-studio — Design: Project as the studio root

Status: proposed 2026-09-13 (project `plugin-studio`, PR #13078).

## Goal

Studio content lives inside a `Project`, like every other project-based plugin, instead of under its
own top-level navtree section. A project is made a "studio project" by choosing the Studio template
in the Project create dialog; the template seeds a `Lightbox`. Nothing on the `Project` type marks
it as studio (decision 3).

## Current state

- `MediaArtifact` (`org.dxos.type.mediaArtifact`) is the unit of work; `Lightbox` is a board layout
  over artifact refs; `Collection<MediaArtifact>` renders as a gallery.
- plugin-studio contributes a **Studio** section under the space's `content` group with a virtual
  **Artifacts** node (`ArtifactsArticle`: every artifact in the space as cards + the only
  "Create artifact" button) and the artifacts as its children (`paths.ts`, `constants.ts`
  `ARTIFACTS_*`, `navigation-target-resolver.ts`).
- plugin-projects already has what the rest of this design needs:
  - `ProjectCapabilities.Template` `{ id, label, icon, appliesTo?, scaffold }`, listed by
    `CreateProjectPanel` (the Project create dialog) and run by `ProjectOperation.Create`, which
    persists the scaffolded graph with one `Database.add` cascade. plugin-crm and plugin-brain
    contribute templates today.
  - A per-project **Artifacts** branch in the navtree listing `project.artifacts` with a `+` that
    opens the generic create dialog and pushes the result into the ref array
    (`createProjectArtifactsActionExtension`).
- `Project.artifacts` is a plain `Ref<Unknown>[]` — no `SetParent` — so a scaffolded object is
  only persisted by the cascade if the template parents it explicitly.

## Design

### 1. Studio project template (plugin-studio → plugin-projects)

`src/templates/studio.ts` contributes one `ProjectCapabilities.Template`:

```ts
{
  id: 'org.dxos.project.studio',
  label: 'Studio',
  icon: 'ph--paint-brush--regular',
  scaffold: ({ name }) =>
    Effect.sync(() => {
      const project = scaffoldProject({ name });
      const lightbox = Lightbox.make({ name: 'Lightbox' });
      Obj.update(project, (project) => { project.artifacts.push(Ref.make(lightbox)); });
      // Ref before parent edge: the ref is what declares the edge.
      Obj.setParent(lightbox, project);
      return project;
    }),
}
```

- Parented (decision 1a): the Lightbox cascades on project delete and is persisted by the create
  op's single `Database.add`, exactly like `instructions` / `taskSet`. `Obj.setParent` requires the
  parent to hold a ref to the child — the `artifacts` push satisfies it.
- Only the Lightbox for now (decision 4): the default instructions brief and no extra skills.
- Wired as `Capability.lazyModule('ProjectTemplates', { provides: [ProjectCapabilities.Template],
activatesOn: ProjectsEvents.Start })` — a cross-plugin contribution rides the consuming plugin's
  start event. plugin-studio gains `dependsOn: ['org.dxos.plugin.projects']` and a
  `@dxos/plugin-projects` workspace dep (`/ProjectCapabilities`, `/templates`, `/ProjectsEvents`).

### 2. Remove the Studio section (decision 2, option 1)

Delete:

- `capabilities/app-graph-builder.ts` (`studioSection`, `studioArtifactsNode`) and its module
  registration in `plugin.tsx`.
- `capabilities/navigation-target-resolver.ts` (artifact URLs resolve via the generic type-section /
  project paths instead).
- `paths.ts`, `paths.test.ts`, and the `STUDIO_*` / `ARTIFACTS_*` constants.
- `containers/ArtifactsArticle` and its `artifactsArticle` surface.
- The `create-object.ts` `targetNodeId` fallback to `getArtifactsPath` — the project's `+` passes
  the branch node id; a bare create falls back to the database subtree, which is the generic
  behaviour.
- Translations for the section/hub (`studio.label`, `artifacts.label`, …).

Artifacts and lightboxes are then reached through a project's Artifacts branch (navtree) or the
Database section, and open via the unchanged `MediaArtifactArticle` / `LightboxArticle` /
`GalleryArticle` object surfaces.

### 3. Lightbox creates artifacts

`LightboxArticle` gets an **Add artifact** toolbar action (`ph--plus--regular`):

1. `Operation.invoke(SpaceOperation.OpenObjectForm, { target: db, typename:
Type.getTypename(MediaArtifact.MediaArtifact) })` — the existing create dialog with the
   Name + Type (image/video) form.
2. On a returned ref: `lightbox.items.push(ref)`, place it in `lightbox.layout` at the next free
   cell, and file it in the owning project (`Obj.getParent(lightbox)` is a `Project` when the
   lightbox came from the template) via `ProjectOperation.ArtifactAdd` (idempotent).

The toolbar is rebuilt with `MenuBuilder` + `useMenuActions` + `Menu.Root` (centre / zoom /
add), replacing the bare `Toolbar.IconButton`s, so the actions are addressable and the follow-up
below has a menu to extend.

### 4. Follow-up (tracked, not in scope)

A generic way for plugins to add create-menu items to an article's toolbar — e.g. a capability the
Project/Lightbox article's `+` menu reads, keyed by the host type — replacing the hard-wired
Lightbox action. Tracked in `.agents/projects/plugin-studio/TASKS.md`.

## Testing

- `templates/studio.test.ts`: scaffold yields a project whose `artifacts[0]` is a `Lightbox` with
  `Obj.getParent(lightbox) === project`; `ProjectOperation.Create` with `templateId:
'org.dxos.project.studio'` persists both (mirror `create-project.test.ts`).
- `LightboxArticle.stories.tsx`: story with the add action; a scripted story that invokes it and
  asserts the new item in `lightbox.items`.
- Remove `paths.test.ts` with `paths.ts`; `plugin-studio:build/lint/test` green.
- Manual (QA flow in `PLUGIN.mdl`): Create Project → Studio template → project shows Artifacts →
  Lightbox → Add artifact (video) → HeyGen/Higgsfield offered.

## Out of scope

- Migrating existing `org.dxos.type.artifact` objects (labs plugin, dev profiles only).
- A studio-specific project article tab (decision 3: none).
- Instructions / skills for the studio brief (decision 4: not yet).

## Provider-listed request fields (added 2026-09-13)

A provider that can enumerate a field's values declares
`fieldOptions: { <jsonPath>: (request: { apiKey?, signal? }) => Promise<FieldOption[]> }` on its
`GenerationService`. Studio turns each entry into a `fieldMap` renderer (`ProviderOptionsField`): a
`ComboboxField` with an `eager` `OptionsLookup` (every option listed on open, free text accepted),
the credential resolved from the active space's `AccessToken` for the provider's `source`, and the
list served from `loadProviderOptions` — a module cache keyed by provider/field/credential
fingerprint with a 5-minute TTL, shared across articles and remounts; a failed load is evicted so
the next read retries. A provider's own `fieldMap` still wins for a field it renders itself.
HeyGen's avatars/voices use it (its React picker is gone); Higgsfield lists its documented image
model statically because the public API has no catalogue endpoint.

## Storyboard (added 2026-09-13)

`Storyboard { name?, frames: Ref<Frame>[] (SetParent) }` / `Frame { name?, notes?, artifact?: Ref<MediaArtifact> }`
— the vertical shape a slide deck also takes. `StoryboardArticle` renders the frames as a reorderable
accordion (`useReorderList` from react-ui-list around `Accordion.Item`s, now in react-ui) whose bodies
host the artifact's own article through the `Article` surface with a `nodeId` under the storyboard
(a studio graph extension lists a storyboard's frame artifacts as children, and the nested article
expands that node's actions itself — the deck only does so for planks). **Append frame** opens the
artifact create dialog and parents the artifact to its frame. Retrofit to plugin-presenter and a
generic vertical container are tracked follow-ups.

## Studio skill and the experiment (added 2026-09-13)

**Goal.** The Studio project template carries one task — _Create a simple 3 frame storyboard that
explains how the Studio plugin works_ — and an agent can complete it through a plugin-studio skill.

**Operations** (`StudioOperation`, all agent-callable):

- `CreateStoryboard { name, project? }` → `{ storyboard }` — filed into the project's artifacts when
  given (the agent works in project context, so the storyboard shows up where the task lives).
- `AppendFrame { storyboard, name, kind, prompt, notes?, provider?, config? }` → `{ frame, artifact }`
  — makes the `MediaArtifact` (its `generator` set to `provider`), parents it to a new `Frame`, appends.
- `ListProviders { kind? }` → `{ providers: [{ id, kind, label, requestSchema (JSON schema), defaultRequest }] }`
  — so the agent can fill a provider's config (Higgsfield needs `model`, HeyGen `avatarId`/`voiceId`)
  without guessing.
- `Generate` (existing) — one call per frame with `{ artifact, provider, config: { prompt, ...} }`.

**Skill** `org.dxos.skill.studio`: instructions describe the narrative structure (establishing shot →
development → resolution), the loop (`list-providers` → `create-storyboard` → `append-frame` ×N →
`generate` ×N), and to report each frame's prompt. Contributed as `SkillDefinition` on the
assistant's start event.

**Template.** The Studio template's instructions enable the studio + project skills, and its task set
carries the single task; the Lightbox stays.

**Story** (`stories-assistant` `Studio.stories.tsx`): plugins Space/Projects/Tasks/Studio/Higgsfield/
Connector; the space is seeded with a Studio project from the template and the chat is bound to it;
the Higgsfield credential comes from `VITE_HIGGSFIELD_CREDENTIALS` (`id:secret`) through
`accessTokensFromEnv`. Two stories: `Default` (live model + Higgsfield, `!test`) and `Scripted` — a
`ScriptedLanguageModel` script that walks the loop against a mock `video` provider, so the flow is
asserted offline in the storybook runner: a Storyboard with 3 frames, each artifact holding a variant.

**Known limit.** The provided Higgsfield account answers `403 not_enough_credits`, so the live story
proves the tool path up to the provider's refusal; the scripted story proves the flow.

## Splicing frames into one video (design, added 2026-09-13)

The frames' variants are provider URLs to separate mp4 files. Three ways to present them as one:

1. **Sequential playback (view-time splice).** A `StoryboardPlayer` renders one `<video>` and advances
   `src` on `ended` over the frames' cover variants (optionally `MediaSource` for gapless play).
   No new data, works today, zero cost — the right first step; the storyboard toolbar gets **Play**.
2. **Client-side file splice with ffmpeg.wasm** (`@ffmpeg/ffmpeg` + `@ffmpeg/core`, ~30 MB wasm,
   loaded lazily from the CDN allowlist). An operation `StudioOperation.Splice { storyboard }` fetches
   each variant (through the edge CORS proxy — provider CDNs rarely allow browser CORS), runs the
   concat demuxer (`-f concat -safe 0 -i list.txt -c copy`) when codecs/resolutions match, else
   re-encodes with `-filter_complex concat`, and stores the result as a `File` object referenced by a
   new `MediaArtifact` (`kind: 'video'`) on the storyboard (`storyboard.spliced`). Heavy but fully
   local-first; needs `SharedArrayBuffer` (COOP/COEP headers) for the multi-threaded core.
3. **Provider-side.** Higgsfield's API has no concat; HeyGen has none either. An EDGE worker cannot
   run ffmpeg (no native binaries); a container/Media API would be a new service.

Recommendation: ship 1 now; implement 2 behind an operation once frames are reliably generated;
skip 3.
