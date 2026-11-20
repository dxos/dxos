# Cloudflare community

A small analysis project over a community's memory. Each task asks the space's facts one question and names the artifact its answer goes in. A reader imports the Cloudflare Developers Discord into the space's memory, hands the tasks to the agent, and gets each task back with its sheet, brief or deck attached.

- `Code`: `tasks.ts`, `project.ts`, `util.ts`; template `CommunitySpace.ts`.
- `Requires`: none.
- `Optional`: none.
- `Provides`: `tasks.taskSet`, `tasks.tasks`, `project.project`, `project.instructions`.
- `Clock`: `0d` (every task is filed at the reference date, the day the crawl ends).
- `Used by`: Cloudflare community (`org.dxos.plugin-debug.template.community`).

## Contents

### Tasks (`tasks.ts`)

- 1 `TaskSet.TaskSet` "Cloudflare community".
- 6 `Task.Task`, all `todo`, unassigned, with no artifacts, in order:
  - `PRODUCTS` "Chart the questions by product": a sheet of questions per product, with a `bar` chart.
  - `WEEKS` "Chart the question volume by week": a sheet of questions per ISO week, with an `xy` chart.
  - `STACK` "Chart what members build with": a sheet of the products members use, with a `bar` chart.
  - `PROBLEMS` "Chart the recurring problems": a sheet of problems by kind and product, with a `bar` chart.
  - `DOCS` "Write the docs-gap brief": a markdown document of the questions asked more than once, by product.
  - `DECK` "Present the findings": a presentation of the four charts and the largest docs gaps.
- `DECK` → every other task (`dependsOn`); the five analyses depend on nothing.

### Project (`project.ts`)

- 1 `Project.Project` "Cloudflare community", `active` → the task set (`taskSet`) and → its instructions (`instructions`).
- 1 `Instructions.Instructions` binding the Brain, Sheet, Presenter and Markdown skills and → the task set (`objects`). It says how every task is worked: query the memory until the counts are complete, make the artifact the task names, file it on the project and the task with Add project artifact, and set the task to review. It also says how a sheet is laid out for its chart, and to report in aggregate without naming people.
- No artifacts: they are what the agent makes.

## Not in the template

The memory. The facts come from the private `discord-db-cloudflare-60d` fixture (see `tools/fixtures/CATALOG.md`), exported as TriG with `moon run plugin-discord:facts -- trig`, and are imported through the Memory panel. A space without them is a project waiting for its data.

## Flows

1. Create a space from the Cloudflare community template; open the project › Tasks: six tasks, all To do.
2. Import the TriG through Memory › Import; tick every task and Delegate to agent.
3. When the tasks reach review, open each one: its detail lists the artifact the agent filed on it.

Recorded as `autocue/community-findings.mjs` (QA-11).
