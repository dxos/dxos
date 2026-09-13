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
