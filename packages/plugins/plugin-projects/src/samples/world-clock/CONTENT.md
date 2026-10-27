# World Clock

A reader hands an agent the World Clock plugin to build: the Composer Plugin project with its five tasks, the spec the plugin is built from, and the feature map filed against that spec. The agent builds the plugin in a sandbox and publishes it; the reader installs it and opens, from its page in Plugins → Registry, the spec it was built from.

- `Code`: `partial.ts`; template `WorldClockSpace.ts`; spec `../../templates/world-clock.mdl`.
- `Requires`: none.
- `Optional`: none.
- `Provides`: `worldClock.project`, `worldClock.spec`, `worldClock.features`.
- `Clock`: none (nothing is dated).
- `Used by`: World Clock (`org.dxos.plugin.projects.template.worldClock`), offered only where the Composer Plugin project template is.

## Contents

### Project

- 1 `Project.Project` "World Clock", scaffolded by the Composer Plugin project template for the app's variant (registry in a browser, desktop on Tauri).
- 1 `Instructions.Instructions` binding the Sandbox skill, carrying the variant's brief.
- 1 `TaskSet.TaskSet` holding the parent task "Build the World Clock plugin" over four subtasks, all `todo`, each depending on the one before it.

### Spec

- 1 `Spec.Spec` "World Clock", the project's only artifact, whose content is `world-clock.mdl`: types `Location`, `ClockEntry`, `Clock`, `feat` F-1 to F-5, scenarios T-1 and T-2, decision D-1.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'world-clock/PLUGIN.mdl' }`, the path the features cite.

### Features

- 5 `Feature.Feature`, all `planned`, → the project (`project`), one per `feat` block with its requirements, each citing it (`specs: ['world-clock/PLUGIN.mdl#F-n']`): "Clocks page" (F-1), "World map" (F-2), "Live clocks" (F-3), "Edit clocks" (F-4), "Bundled specification" (F-5).
- 4 `Feature.DependsOn`: F-2 to F-5 → "Clocks page".
- 5 `Feature.Implements`: the parent task → each feature.

## Flows

1. Create a space from the World Clock template; open its project › Tasks: the parent task over four subtasks.
2. Open the project › Features: the five features, all Planned, each opening the spec.
3. Assign the parent task to the agent: it builds World Clock with the spec bundled and publishes it (plugin-projects QA-6).
4. Install World Clock from Plugins → Registry, open its page and click Open Specification: the spec opens (needs plugin-code).

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 5 tasks, 1 spec and 5 features.
- Every persisted typename is declared by the partial.
- The project's only artifact is the spec, and the spec's foreign key is the path the features cite.
- Features are `planned`, belong to the project, and cite F-1 to F-5 in order.
- The "Write the plugin in TypeScript" task carries the spec's text verbatim, so the build bundles the spec the space holds.
