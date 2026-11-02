# Hello Worker

A reader with no Cloudflare account hands an agent a plan to finish: a spec of one Worker that answers every request with a greeting and the time, whose document is partial and whose map has one feature per block the finished document will have, and three planning tasks. The agent completes the spec, draws it, files the implementation as tasks of its own and works them until the Worker answers.

- `Code`: `tasks.ts`, `project.ts`, `spec.ts`, `features.ts`, `SPEC.mdl`; template `WorkerSpace.ts`.
- `Requires`: none.
- `Optional`: none.
- `Provides`: `tasks.taskSet`, `tasks.tasks`, `project.project`, `project.instructions`, `spec.spec`, `features.map`, `features.features`.
- `Clock`: `0d` (every task is filed at the reference date).
- `Used by`: Hello Worker (`org.dxos.plugin-debug.template.worker`).

## Contents

### Tasks (`tasks.ts`)

- 1 `TaskSet.TaskSet` "Hello Worker".
- 3 `Task.Task`, all `todo`, unassigned, in order: `spec` "Complete the spec", `architecture` "Draw the proposed architecture", `plan` "Plan the implementation as tasks".
- Each task → the one before it (`dependsOn`); `spec` has none.
- No implementation task: the agent files them under `plan`, the reader's claim among them.

### Project (`project.ts`)

- 1 `Project.Project` "Hello Worker", `active` → the task set (`taskSet`) and → its instructions (`instructions`).
- 1 `Instructions.Instructions` binding the Markdown and Drawing skills and → the task set (`objects`), carrying what the plan must know: one sandbox, `wrangler deploy --temporary` under Node 22, fetch before claiming success, the claim URL is a bearer credential and the claim is the reader's, after the last deploy.
- No artifacts: the Worker URL and the response body are what the run produces.

### Spec (`spec.ts`, `SPEC.mdl`)

- 1 `SpecDocument.SpecDocument` "Hello Worker" whose content is `SPEC.mdl`, partly written: `type:Greeting`, `feat` F-1 in full, F-2 to F-4 named in prose only, `scenario` T-1, decisions D-1 and D-2.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'hello-worker/SPEC.mdl' }`, the path the features cite.

### Features (`features.ts`)

- 1 `Spec.Spec` "Hello Worker", owned by the project (`Project.spec`), owning the spec document (`document`), and listing the four features below (`features`).
- 4 `Feature.Feature`, all `planned`, each citing one spec block (`specs: ['hello-worker/SPEC.mdl#F-n']`):
  - `greeting` "Greeting endpoint" (F-1), owning a `Spec.Spec` "Greeting endpoint" (`spec`) that lists its subfeatures "JSON greeting" and "UTC time", both `planned`.
  - `deploy` "Deploy without an account" (F-2).
  - `verified` "Verified response" (F-3).
  - `claimed` "Claimed account" (F-4).
- 3 `Feature.DependsOn`: each feature → the one before it.
- 1 `Feature.Implements`: `architecture` → `greeting`. The agent links the implementation tasks it files.

## Flows

1. Create a space from the Hello Worker template; open its project › Tasks: the three planning tasks.
2. Open the "Hello Worker" spec from the sidebar (Canvas or Kanban): the four features, all Planned.
3. Open "Greeting endpoint" › Specs: the spec opens rendered in Composer (needs plugin-code), F-1 written and F-2 to F-4 only named.
4. Assign "Complete the spec" to the assistant: it writes F-2 to F-4 into the spec, draws the diagram, adds the implementation tasks linked to the features, and works them until the Worker URL answers (plugin-debug QA-9).

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 3 tasks, 6 features (4 and 2 subfeatures), 2 specs, 1 spec document and no documents.
- Every persisted typename is declared by a partial.
- Tasks are `todo`, in order, each depending on the one before it, and none is assigned.
- Features are `planned`, sit on the spec the project owns, cite F-1 to F-4 in order, and each depends on the one before it.
- The only `Implements` is the diagram task → "Greeting endpoint".
- The spec document is the map's `document`, and its foreign key is the path the features cite.
