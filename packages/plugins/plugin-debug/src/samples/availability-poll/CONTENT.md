# Availability Poll

A reader has a finished spec for a When2meet-style poll that runs as a Cloudflare Worker, one Durable Object per poll, and nothing else: no milestones, no tasks, no code. The spec stages the work in three milestones (the core poll, time zones and daylight-saving time, and flight options from Duffel), the feature map holds one card per feature, and three design docs and two drawings explain the parts. The reader asks the agent to plan a milestone from the spec, delegates the tasks it files, watches the work on the Gantt chart and the cards turn operational, then changes a requirement and watches its card fail and recover. Flight options stay planned for the reader to build.

- `Code`: `spec.ts`, `features.ts`, `project.ts`, `docs.ts`, `diagrams.ts`, `SPEC.mdl`, `FLIGHTS.mdl`, `diagrams/*.dx` (compiled to `diagrams/compiled.json`); template `AvailabilityPollSpace.ts`.
- `Requires`: none.
- `Optional`: none.
- `Provides`: `spec.spec`, `spec.flights`, `features.features`, `features.flights`, `project.project`, `project.instructions`, `project.taskSet`, `docs.docs`, `docs.drawings`.
- `Clock`: unused (nothing is dated; the agent dates the tasks it files).
- `Used by`: Availability Poll (`org.dxos.plugin-debug.template.availability-poll`).

## Contents

### Spec (`spec.ts`, `SPEC.mdl`, `FLIGHTS.mdl`)

- 1 `Spec.Spec` "Availability Poll" (`@dxos/compute`) read from `SPEC.mdl`, fully written: types `Slot`, `Invitee`, `Poll`, `NewPoll`, `SlotPlan`, `LocalRange`; `feat` F-1 to F-6; a Milestones table with rows M-1 to M-3; `scenario` T-1 and T-2; decision D-1. Each `feat` block becomes an embed of its feature (below), in the block's place.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'availability-poll/SPEC.mdl' }`, the path the features cite.
- 1 `Spec.Spec` "Flight options" read from `FLIGHTS.mdl`: types `Trip`, `Limits`, `Traveler`, `Offer`; `feat` F-1 to F-4; `scenario` T-1; decision D-1. It declares `uses com.example.availability-poll` and cites the poll spec's items by id (`com.example.availability-poll#F-3`, `#F-4`, `#F-5`). Its `feat` blocks become embeds of the four subfeatures below.
- Foreign key `{ source: 'github.com/dxos/dxos', id: 'availability-poll/FLIGHTS.mdl' }`.

### Features (`features.ts`)

- The poll spec is the feature map: the project owns it (`Project.specs`), and it holds six features in its features annotation (`FeatureMap.FeaturesAnnotation`), all `planned`, each citing its block (`availability-poll/SPEC.mdl#F-n`) and carrying the block's `req` lines as requirements:
  - `create` "Create a poll" (F-1), 4 requirements.
  - `mark` "Mark availability" (F-2), 3 requirements.
  - `heatmap` "Heat map and best slot" (F-3), 4 requirements.
  - `zones` "Time zones" (F-4), 3 requirements.
  - `dst` "Daylight-saving time" (F-5), 4 requirements.
  - `flights` "Flight options" (F-6), 1 requirement, owning the "Flight options" spec (`spec`).
- The "Flight options" spec holds four subfeatures, all `planned`, each citing `availability-poll/FLIGHTS.mdl#F-n` with its requirements: `trip` "Trip" (2), `search` "Offer search" (4), `pick` "Pick a flight" (2), `overlay` "Arrival overlay" (2).
- 11 `Feature.DependsOn`:
  - On the poll spec: `mark` → `create`, `heatmap` → `mark`, `zones` → `create`, `dst` → `zones`, `flights` → `heatmap`, `flights` → `dst`.
  - On the flights spec: `search` → `trip`, `pick` → `search`, `overlay` → `pick`.
  - Across the two: `search` → `heatmap` (limits are set against the best slot), `overlay` → `zones` (markers are drawn in the reader's zone).
- No `Feature.Implements`: no task exists yet; the agent links the tasks it files.

### Project (`project.ts`)

- 1 `TaskSet.TaskSet` "Availability Poll", empty: no `Milestone.Milestone` and no `Task.Task`.
- 1 `Project.Project` "Availability Poll", `active` → the task set (`taskSet`), → its instructions (`instructions`), → the poll spec (`specs`), and → the 3 documents and 2 drawings below (`artifacts`), in that order.
- 1 `Instructions.Instructions` binding the Markdown and Drawing skills and → the task set (`objects`), carrying how to plan a milestone from the spec (one milestone per row of the Milestones table, one task per feature and a check task), the build recipe (one sandbox with its own git and no repository, the image's wrangler, `wrangler deploy --temporary` with a SQLite Durable Object migration), how to check a scenario against the live URL, and when a feature is `prototype`, `operational` or `failing`.

### Design (`docs.ts`, `diagrams.ts`)

- 3 `Markdown.Document`:
  - `zones` "Time zones and DST": why slots are stored as UTC instants, how a slot plan becomes instants with `Intl` on each slot's own date, the skipped and repeated local hour, and T-2 worked as a table.
  - `durable` "One Durable Object per poll": `newUniqueId` as the poll id, one storage key per poll, the page polling every few seconds, and what a temporary account's hour means for a demo; embeds the `poll` drawing.
  - `duffel` "Flight search with Duffel": offer requests, test mode, the token as a Worker secret, the limits as request parameters and filters, caching and offer expiry; embeds the `flights` drawing.
- 2 `Drawing.Drawing`, each a canvas built with `Architecture.addCanvasDrawing` from a `.dx` source compiled ahead of time:
  - `poll` "Poll architecture": the invitee's browser, the Worker's page and API, and one Durable Object per poll.
  - `flights` "Flight options architecture": the same, plus the Duffel API and the Worker secret.
- 1 collection "Design" at the root holding the 3 documents and the 2 drawings.

## Flows

1. Create a space from the Availability Poll template; open the project › Features: six cards, all Planned, and the Tasks tab is empty.
2. Open "Heat map and best slot" › Specs: the spec opens rendered in Composer (needs plugin-code), every feature written and M-1 to M-3 listed.
3. Open "Flight options": its card has four subfeatures, and its spec cites the poll spec's F-3 and F-4.
4. Ask the project's agent to plan M-1 from the spec: one milestone and its tasks appear, each linked to F-1, F-2 or F-3.
5. Delegate M-1's tasks: the Gantt chart shows the chat working them; each task's feature turns Prototype when that task deploys it, and F-1 to F-3 turn Operational once T-1 passes on the live URL (plugin-debug QA-11).
6. Plan and delegate M-2 the same way: F-4 and F-5 turn Operational once T-2 passes.
7. Change F-3.2's tie-break on its card and ask the agent to revalidate: F-3 turns Failing, the agent files and works a fix, and F-3 is Operational again with T-2's best slot moved to `s8`.

## Checks

- Exactly 1 project, 1 instructions, 1 task set, 0 milestones, 0 tasks, 10 features (6 and 4 subfeatures), 2 specs, 3 documents and 2 drawings.
- Every persisted typename is declared by a partial.
- The project owns the poll spec, which holds the six features in spec order, all `planned`, citing F-1 to F-6 of `availability-poll/SPEC.mdl`.
- "Flight options" owns the flights spec, which holds its four subfeatures citing F-1 to F-4 of `availability-poll/FLIGHTS.mdl`.
- The 11 dependencies are exactly the pairs above.
- Each spec's foreign key is the path its features cite, and its text embeds its features in order with no `feat` block left.
- The poll spec's text keeps the Milestones table's rows M-1 to M-3 and the scenarios T-1 and T-2.
- The project's artifacts are the 3 documents and the 2 drawings, and the "Design" collection holds the same 5.
