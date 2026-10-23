# World Clock Plugin

The plugin the Composer Plugin project template builds, handed to an agent as a plan to finish instead: a partial spec of a Composer plugin that adds a world clock page — a map with a row of clocks — to every space, the project's feature map with one feature per block the finished spec will have, and three planning tasks. The agent completes the spec, draws it, files the implementation as tasks of its own and works them in a sandbox on EDGE until the plugin is in the reader's private plugin registry. Installing it from Plugins › Registry is the reader's click.

- `Code`: `SPEC.mdl` and the config in `WorldClockSpace.ts`; the partials are `samples/plugin/` (`tasks.ts`, `project.ts`, `spec.ts`, `features.ts`), shared with Shogi Plugin; offered by `capabilities/plugin-templates.ts`.
- `Requires`: a toolchain — the commit composer-app's build stamped (`VITE_DX_PLUGIN_TOOLCHAIN`) and the client's EDGE URL. The template is offered only when both exist.
- `Optional`: none.
- `Provides`: `tasks.taskSet`, `tasks.tasks`, `project.project`, `project.instructions`, `spec.spec`, `features.features`.
- `Clock`: `0d` (every task is filed at the reference date).
- `Used by`: World Clock Plugin (`org.dxos.plugin-debug.template.worldClock`).

## Contents

### Tasks (`plugin/tasks.ts`)

- 1 `TaskSet.TaskSet` "World Clock".
- 3 `Task.Task`, all `todo`, unassigned, in order: `spec` "Complete the spec", `architecture` "Draw the proposed architecture", `plan` "Plan the implementation as tasks".
- Each task → the one before it (`dependsOn`); `spec` has none.
- No implementation task: the agent files them under `plan`, the reader's install among them.

### Project (`plugin/project.ts`)

- 1 `Project.Project` "World Clock", `active` → the task set (`taskSet`) and → its instructions (`instructions`).
- 1 `Instructions.Instructions` binding the Markdown, Drawing and Sandbox skills and → the task set (`objects`), carrying what the plan must know: one sandbox named "World Clock" on EDGE, the plugin guide at the toolchain's commit and its two examples, the files a plugin needs, a `package.json` pinned to the toolchain, install/typecheck/build and check the manifest, camelCase ids, the `Clock` ECHO type with timezones from `@dxos/react-ui-geo/data`, the dependency on `org.dxos.plugin.map` and the `labs` tag, and `dx registry publish --private` with the sandbox's `DX_API_TOKEN` against the client's EDGE.
- No artifacts: the diagram and the published plugin are what the run produces.

### Spec (`plugin/spec.ts`, `SPEC.mdl`)

- 1 `Spec.Spec` "World Clock" whose content is `SPEC.mdl`, partly written: `type:City`, `type:Clock`, `feat` F-1 in full (with the `worldClock.*` test ids), F-2 to F-4 named in prose only, `scenario` T-1, decisions D-1 and D-2.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'world-clock/SPEC.mdl' }`, the path the features cite.

### Features (`plugin/features.ts`)

- 4 `Feature.Feature`, all `planned`, → the project (`project`), each citing one spec block (`specs: ['world-clock/SPEC.mdl#F-n']`):
  - `clocks` "Clocks page" (F-1), subfeatures "Navtree group" and "Ticking clocks", both `planned`.
  - `map` "Map" (F-2).
  - `edit` "Add and remove clocks" (F-3).
  - `published` "Published to the registry" (F-4).
- 3 `Feature.DependsOn`: each feature → the one before it.
- 1 `Feature.Implements`: `architecture` → `clocks`. The agent links the implementation tasks it files.

## Flows

1. Create a space from the World Clock Plugin template; open its project › Tasks: the three planning tasks.
2. Open the project › Features (Kanban): the four features, all Planned.
3. Open "Clocks page" › Specs: the spec opens rendered in Composer (needs plugin-code), F-1 written and F-2 to F-4 only named.
4. Assign the three tasks to the assistant: it writes F-2 to F-4 into the spec, draws the diagram, adds the implementation tasks linked to the features, and works them until `dx registry publish --private` uploads the plugin. The reader installs World Clock from Plugins › Registry, opens Clocks and adds Asia/Tokyo and Europe/London (plugin-debug QA-11).

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 3 tasks, 4 features, 1 spec and no documents.
- Every persisted typename is declared by a partial.
- Tasks are `todo`, in order, each depending on the one before it, and none is assigned.
- Features are `planned`, belong to the project, cite F-1 to F-4 in order, and each depends on the one before it.
- The only `Implements` is the diagram task → "Clocks page".
- The spec's foreign key is the path the features cite.
- The instructions pin the guide, every `@dxos/*` package and the `dx` CLI to the toolchain's commit, and publish to the given EDGE.
