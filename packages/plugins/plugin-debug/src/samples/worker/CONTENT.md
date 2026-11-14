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

- 1 `Spec.Spec` "Hello Worker" (`@dxos/compute`) whose content is `SPEC.mdl`, partly written: `type:Greeting`, `feat` F-1 in full, F-2 to F-4 named in prose only, `scenario` T-1, decisions D-1 and D-2. F-2 to F-4 have no block until the features seed writes them.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'hello-worker/SPEC.mdl' }`, the file the spec syncs with.

### Features (`features.ts`)

- The spec above is the feature map: the project owns it (`Project.specs`), and its text holds the four features below as `feat` blocks, all `status: planned`, each but the first `depends:` on the one before it:
  - F-1 "Greeting endpoint", whose `spec:` cites a `Spec.Spec` "Greeting endpoint" that breaks it down, with text of its own holding the `feat` blocks "JSON greeting" and "UTC time", both `planned`. The project owns that spec too.
  - F-2 "Deploy without an account", F-3 "Verified response" and F-4 "Claimed account", which the prose named and the seed writes as blocks with their descriptions.
- 1 `SpecItem.Implements`: `architecture` → the spec, naming F-1 (`item: F-1`). The agent links the implementation tasks it files.

## Flows

1. Create a space from the Hello Worker template; open its project › Tasks: the three planning tasks.
2. Open the "Hello Worker" spec from the sidebar (Board): the four features, all Planned.
3. Open "Greeting endpoint" › Specs: the spec opens rendered in Composer (needs plugin-code), F-1 written and F-2 to F-4 only named.
4. Assign "Complete the spec" to the assistant: it writes F-2 to F-4 into the spec, draws the diagram, adds the implementation tasks linked to the features, and works them until the Worker URL answers (plugin-debug QA-9).

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 3 tasks, 2 specs holding 6 `feat` blocks (4 and 2 subfeatures) and no documents.
- Every persisted typename is declared by a partial.
- Tasks are `todo`, in order, each depending on the one before it, and none is assigned.
- Features are `planned`, F-1 to F-4 in order, and each depends on the one before it.
- The only `Implements` is the diagram task → "Greeting endpoint".
- The spec is the map, and its foreign key is the file it syncs with.
- The map's text holds F-1 to F-4 in order, and no feature is an ECHO object.
