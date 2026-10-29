# Ride Check

A reader hands an agent a written spec of one page — should a cyclist ride now? — its feature map with one card per feature, and three tasks. The agent draws the plan, builds the page with DXOS UI on a live Open-Meteo forecast, deploys it as a Cloudflare Worker and checks it. The reader then edits a feature card and watches the same URL change after the redeploy.

- `Code`: `tasks.ts`, `project.ts`, `spec.ts`, `features.ts`, `SPEC.mdl`; template `RideCheckSpace.ts`.
- `Requires`: none.
- `Optional`: none.
- `Provides`: `tasks.taskSet`, `tasks.tasks`, `project.project`, `project.instructions`, `spec.spec`, `features.features`.
- `Clock`: `0d` (every task is filed at the reference date).
- `Used by`: Ride Check (`org.dxos.plugin-debug.template.ride-check`).

## Contents

### Tasks (`tasks.ts`)

- 1 `TaskSet.TaskSet` "Ride Check".
- 3 `Task.Task`, all `todo`, unassigned, in order: `architecture` "Draw the architecture", `build` "Build and deploy the Worker", `verify` "Check the live page against the spec".
- Each task → the one before it (`dependsOn`); `architecture` has none.

### Project (`project.ts`)

- 1 `Project.Project` "Ride Check", `active` → the task set (`taskSet`) and → its instructions (`instructions`).
- 1 `Instructions.Instructions` binding the Markdown and Drawing skills and → the task set (`objects`), carrying the build recipe: one Worker for the page and `/api/forecast`, Vite with `@dxos/react-ui` and the `@dxos/ui-theme` plugin, runtime Phosphor icons, literal Tailwind class names, the Cloudflare connection's token for repeatable deploys (or `--temporary`, its claim URL handed over directly), fetch before claiming success, and how to handle a changed feature card.
- No artifacts: the Worker URL and the diagram are what the run produces.

### Spec (`spec.ts`, `SPEC.mdl`)

- 1 `SpecDocument.SpecDocument` "Ride Check" whose content is `SPEC.mdl`: `type:Hour`, `type:Verdict`, `type:Forecast`, `feat` F-1 to F-4 written, `scenario` T-1 (the page answers) and T-2 (a change ships), decision D-1.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'ride-check/SPEC.mdl' }`, the path the features cite.

### Features (`features.ts`)

- 2 `Spec.Spec`: the "Ride Check" feature map, → the project (`project`) and the spec document (`document`), and the "Go / no-go" breakdown holding its subfeatures.
- 4 `Feature.Feature` on the feature map, all `planned`, each citing one spec block (`specs: ['ride-check/SPEC.mdl#F-n']`):
  - `verdict` "Go / no-go" (F-1), subfeatures "Rain rule" and "Wind rule" (features on the spec that breaks it down), both `planned`; each feature carries its spec block's `req` lines as requirements.
  - `hourly` "Hourly forecast" (F-2).
  - `window` "Best window" (F-3).
  - `daylight` "Daylight" (F-4).
- 3 `Feature.DependsOn`: `hourly`, `window` and `daylight` → `verdict`.
- 4 `Feature.Implements`: `build` → each feature.

## Flows

1. Create a space from the Ride Check template; open its project › Features: four cards, all Planned.
2. Open "Go / no-go" › Specs: the spec opens rendered in Composer (needs plugin-code), all four features written.
3. Assign "Draw the architecture" to the assistant: it draws the browser, the Worker and Open-Meteo on a canvas, then builds, deploys and checks the page, setting each feature to Operational as its card goes live.
4. Add a subfeature to "Go / no-go" — "Gust rule: warn above 30 km/h" — and ask the assistant to ship it: the spec gains the requirement, the Worker is redeployed to the same URL, and the verdict card lists the gusts.

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 3 tasks, 6 features (4 and 2 subfeatures), 2 specs, 1 spec document and no documents.
- Every persisted typename is declared by a partial.
- Tasks are `todo`, in order, each depending on the one before it, and none is assigned.
- Features are `planned`, sit on the project's feature map, cite F-1 to F-4 in order, and the last three depend on the first.
- The build task implements every feature, and nothing else implements one.
- The spec's foreign key is the path the features cite.
