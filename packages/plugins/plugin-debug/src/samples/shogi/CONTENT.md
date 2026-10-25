# Shogi Plugin

A reader hands an agent a plan to finish: a partial spec of a Composer plugin that puts a shogi board in every space, the project's feature map with one feature per block the finished spec will have, and three planning tasks. The agent completes the spec, draws it, files the implementation as tasks of its own and works them in a sandbox on EDGE until the plugin is in the reader's private plugin registry. Installing it from Plugins › Registry is the reader's click.

- `Code`: `SPEC.mdl` and the config in `ShogiSpace.ts`; the partials are `samples/plugin/` (`tasks.ts`, `project.ts`, `spec.ts`, `features.ts`), shared with World Clock Plugin; offered by `capabilities/plugin-templates.ts`.
- `Requires`: a toolchain — the commit composer-app's build stamped (`VITE_DX_PLUGIN_TOOLCHAIN`) and the client's EDGE URL. The template is offered only when both exist.
- `Optional`: none.
- `Provides`: `tasks.taskSet`, `tasks.tasks`, `project.project`, `project.instructions`, `spec.spec`, `features.features`.
- `Clock`: `0d` (every task is filed at the reference date).
- `Used by`: Shogi Plugin (`org.dxos.plugin-debug.template.shogi`).

## Contents

### Tasks (`plugin/tasks.ts`)

- 1 `TaskSet.TaskSet` "Shogi".
- 3 `Task.Task`, all `todo`, unassigned, in order: `spec` "Complete the spec", `architecture` "Draw the proposed architecture", `plan` "Plan the implementation as tasks".
- Each task → the one before it (`dependsOn`); `spec` has none.
- No implementation task: the agent files them under `plan`, the reader's install among them.

### Project (`plugin/project.ts`)

- 1 `Project.Project` "Shogi", `active` → the task set (`taskSet`) and → its instructions (`instructions`).
- 1 `Instructions.Instructions` binding the Markdown, Drawing and Sandbox skills and → the task set (`objects`), carrying what the plan must know: one sandbox named "Shogi" on EDGE, the plugin guide at the toolchain's commit, the files a plugin needs, a `package.json` pinned to the toolchain, install/typecheck/build and check the manifest, camelCase ids, the game as one ECHO object per space, and `dx registry publish --private` with the sandbox's `DX_API_TOKEN` against the client's EDGE.
- No artifacts: the diagram and the published plugin are what the run produces.

### Spec (`plugin/spec.ts`, `SPEC.mdl`)

- 1 `Spec.Spec` "Shogi" whose content is `SPEC.mdl`, partly written: `type:Side`, `type:PieceKind`, `type:Piece`, `feat` F-1 in full (with the `shogi.square` / `shogi.piece` test ids), F-2 to F-4 named in prose only, drops out of scope, `scenario` T-1, decisions D-1 and D-2.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'shogi/SPEC.mdl' }`, the path the features cite.

### Features (`plugin/features.ts`)

- 4 `Feature.Feature`, all `planned`, → the project (`project`), each citing one spec block (`specs: ['shogi/SPEC.mdl#F-n']`):
  - `board` "Board" (F-1), subfeatures "Navtree group" and "Starting position", both `planned`.
  - `moves` "Moves" (F-2).
  - `captures` "Captures and promotion" (F-3).
  - `published` "Published to the registry" (F-4).
- 3 `Feature.DependsOn`: each feature → the one before it.
- 1 `Feature.Implements`: `architecture` → `board`. The agent links the implementation tasks it files.

## Flows

1. Create a space from the Shogi Plugin template; open its project › Tasks: the three planning tasks.
2. Open the project › Features (Kanban): the four features, all Planned.
3. Open "Board" › Specs: the spec opens rendered in Composer (needs plugin-code), F-1 written and F-2 to F-4 only named.
4. Assign the three tasks to the assistant: it writes F-2 to F-4 into the spec, draws the diagram, adds the implementation tasks linked to the features, and works them until `dx registry publish --private` uploads the plugin. The reader installs Shogi from Plugins › Registry, opens Board and plays 7g-7f (plugin-debug QA-10).

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 3 tasks, 4 features, 1 spec and no documents.
- Every persisted typename is declared by a partial.
- Tasks are `todo`, in order, each depending on the one before it, and none is assigned.
- Features are `planned`, belong to the project, cite F-1 to F-4 in order, and each depends on the one before it.
- The only `Implements` is the diagram task → "Board".
- The spec's foreign key is the path the features cite.
- The instructions pin the guide, every `@dxos/*` package and the `dx` CLI to the toolchain's commit, and publish to the given EDGE.
