//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref } from '@dxos/echo';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as SandboxSkill from '@dxos/plugin-sandbox/SandboxSkill';
import { Text } from '@dxos/schema';
import { Outline, TaskSet } from '@dxos/types';

import { type DocsResult } from './docs.ts';
import { type SpecResult } from './spec.ts';

export type ProjectInput = { spec: SpecResult; docs: DocsResult };

export type ProjectResult = {
  project: Project.Project;
  instructions: Instructions.Instructions;
  taskSet: TaskSet.TaskSet;
};

/** plugin-code's feature map and spec review skills, which it exports no subpaths for. */
const FEATURE_MAP_SKILL = 'org.dxos.skill.code.featureMap';
const SPEC_REVIEW_SKILL = 'org.dxos.skill.code.specReview';

/** Bound to every chat the project delegates, so planning, building and setting feature status never wait on the agent enabling a skill. */
const SKILL_KEYS = [
  FEATURE_MAP_SKILL,
  MarkdownSkill.key,
  ProjectSkill.key,
  SandboxSkill.key,
  SPEC_REVIEW_SKILL,
] as const;

/** What the agent needs to plan from the spec, build, deploy, check and report; each line saves it a rediscovery. */
const INSTRUCTIONS = `This project builds the availability poll its spec (\`Availability Poll\`, in this space) describes: one \
Cloudflare Worker, one Durable Object per poll. The spec is written in full and stages the work in its Milestones table; \
the feature map holds one feature per \`feat\` block. There are no tasks until you plan them. Every step below is meant \
to take one or two calls; read the spec once, and print only what you need.

Planning. When I ask you to plan a milestone, plan it in two calls and stop. Never plan a milestone I did not name, \
and do not start the work until I delegate the tasks.
- First call: print the spec's Milestones table and the features, then read the milestone's row: \
\`const Project = yield* Database.resolve('dxn:org.dxos.type.project:0.8.0'); \
const [project] = yield* Database.query(Filter.type(Project, { name: 'Availability Poll' })).run; \
const text = (yield* Database.load((yield* Database.load(project.specs[0])).content)).content; \
yield* print(text.slice(text.indexOf('## Milestones'), text.indexOf('## Acceptance'))); \
const Feature = yield* Database.resolve('dxn:org.dxos.type.feature:0.4.0'); \
for (const feature of yield* Database.query(Filter.type(Feature)).run) yield* print(feature.id, feature.name);\`
- Second call, one program: create one milestone on the task set, named as its row names it (\`M-1: Core poll\`), \
with its "Done when" as the description; one task per feature the row names, titled by the feature \
(\`F-1: Create a poll\`) and linked to it; then \`Check M-n\`, linked to every one of those features too, one \
\`linkFeatureTask\` each, since the map reads a milestone's check from its links. Each task depends on the one \
before. The task set is \`(yield* Database.load(project.taskSet))\`; the operations are \
\`dxn:org.dxos.operation.tasks.createMilestone\` \`{ taskSet, name, description }\`, \
\`dxn:org.dxos.operation.tasks.create\` \`{ taskSet, title, milestone }\`, which returns \`{ task }\`, and \
\`dxn:org.dxos.operation.code.linkFeatureTask\` \`{ task, feature }\`, all taking refs (\`Ref.make(object)\`); load \
each feature with \`Database.query(Filter.id(id)).run\`, and set \
\`Obj.update(task, (task) => { task.dependsOn = [Ref.make(previous)]; })\`.

Building. Work the tasks you are given in order:
- Use one sandbox named \`availability-poll\`: find it before creating one, and keep the code in \`/workspace/poll\`. \
Keep it in git there; do not create or attach a repository.
- The image ships Node 22, git and wrangler 4. Install once, in the first task, as below, and never run \`tsc\`.
- The spec builds every page with DXOS UI, so the pages are a React app bundled by Vite into the Worker's static \
assets. \`package.json\` (\`"type": "module"\`) depends on \`@dxos/react-ui\` and \`@dxos/ui-theme\` \`^0.16.0\`, \
\`react\` and \`react-dom\` \`^19.2.9\`, \`@vitejs/plugin-react\` \`^6.1.2\` and \`vite\` \`^8.3.5\`. \
\`vite.config.js\`: \`plugins: [ThemePlugin({ content: ['node_modules/@dxos/react-ui/src/theme/*.css'] }), \
react()]\` (\`import { ThemePlugin } from '@dxos/ui-theme/plugin'\`; the \`content\` keeps the components' \
theme tokens), \`build: { outDir: 'dist' }\`. \`index.html\` (\`<html class="dark">\`) loads \`/src/main.jsx\`, \
which starts \`import '@dxos-theme'; import '@dxos/react-ui/theme.css';\` and renders \
\`<Theme.Provider tx={Theme.defaultTx} themeMode='dark'>\` around the page for \`location.pathname\` (\`/\` is \
F-1's form, the default export of \`src/Home.jsx\`; \`/p/:id\` the poll, the default export of \`src/Poll.jsx\`, \
given \`id\` as a prop and taking optional \`poll\` and \`name\` props as its first state, so a check can render it \
with data). Pages use \`Button.Root\` (\`label\`, \
\`variant: 'primary'\`, \`onClick\`), \`Input.Root\` (the \`<input>\` itself, with \`value\` and \`onChange\` and no children), \`Input.Textarea\` (a list, one item per line), \
\`Field.Root\`, \`Field.Label\` and \`Field.ErrorText\`, \`Card.Root\`, \`Card.Header\`, \`Card.Title\` and \
\`Card.Body\` (which lays out its own children, so put a \`<div>\` with your flex or grid classes inside it), \
\`Tag.Tag\` (\`hue\`: \`'neutral'\`, \`'sky'\` or \`'emerald'\`) and \`Tooltip.Trigger\` (\`asChild\`, \
\`content\`), all from \`@dxos/react-ui\`, whose \`Theme\`, \`Button\`, \`Input\`, \`Card\`, \`Tag\` and \`Tooltip\` \
are namespaces, not components. Tailwind classes work in \`className\`; cells take \`var(--color-accent-bg)\` when \
marked, \`var(--color-input-bg)\` when not, and \`var(--color-separator)\` for an edge. These names are checked against the published package in a browser: use them without \
reading \`node_modules\`. The spec's Interface section and each feature's \
requirements say what each page holds; a grid's cells are plain elements with an inline \`background\`. \
\`worker.js\` holds the \`/api\` routes and the \`Poll\` Durable Object, created with \`newUniqueId()\`; it keeps \
one storage key, \`poll\`: \`{ title, minutes, slots: [{ id, start }], marks: { [name]: [slotId] } }\`, whose key order is the respondents' order, \
and \`GET /api/polls/:id\` answers it with each slot's \`free\` names and, once F-3 adds it, \`best\`. \
\`wrangler.jsonc\` declares \`assets: { directory: './dist', not_found_handling: 'single-page-application', \
run_worker_first: ['/api/*'] }\`, binds \`Poll\`, and declares it in a migration with \`new_sqlite_classes\`, which \
a temporary account requires. \`.gitignore\` holds \`.wrangler\`, \`dist\`, \`node_modules\`, \`npm.*\` and \`ssr\`. M-3 adds \`zones.js\` for the \
time zone math, so its features add a file and touch the others only by small edits.
- Do each task in one call: one program that writes the task's files, restarts the server, checks the \
requirements the task adds, commits, and, when every check passed, sets the task's feature to \`prototype\` and the \
task to \`review\`. Print only what failed, plus one line saying what passed. Each call is a fresh program: \
nothing you assign in one is there in the next, so every program starts by finding its objects: \
\`const Sandbox = yield* Database.resolve('dxn:org.dxos.type.sandbox:0.1.0'); \
const [sandbox] = yield* Database.query(Filter.type(Sandbox, { name: 'availability-poll' })).run; \
const Exec = yield* Database.resolve('dxn:org.dxos.operation.sandbox.exec'); \
const sh = (command) => Operation.invoke(Exec, { sandbox: Ref.make(sandbox), command, cwd: '/workspace/poll', timeout: 120000 }); \
const write = (name, text) => sh('echo ' + Buffer.from(text).toString('base64') + ' | base64 -d > ' + name);\` \
The first task creates the sandbox instead, with \`dxn:org.dxos.operation.sandbox.create\` \
\`{ name: 'availability-poll', accountAccess: false }\`, which returns \`{ sandboxId }\` to load with \`Filter.id\`, \
and runs, once and without \`cwd\`, \`mkdir -p /workspace/poll/src && cd /workspace/poll && git init -q && git config \
user.email agent@poll.test && git config user.name Agent\`; in the same program it writes \`package.json\` and \
starts \`npm install --no-audit --no-fund > npm.log 2>&1; echo $? > npm.exit\` with \`background: true\`, so the \
install runs while you write the code. F-1's program waits for it with \`until [ -f npm.exit ]; do sleep 2; done\` \
before its first \`npx vite build\`. Find the task with \
\`Filter.type(Task, { title })\` (\`dxn:org.dxos.type.task:0.7.0\`) and the feature by its name; set statuses with \
\`dxn:org.dxos.operation.code.updateFeature\` \`{ feature, status }\` and \`dxn:org.dxos.operation.tasks.update\` \
\`{ task, status }\`.
- After the setup lines, a task's program is: \`yield* write('worker.js', ...)\` for each file it adds or changes; \
\`yield* sh('npx vite build')\` when the front end changed, printing its output only if it failed; ExposePort to \
restart the server; \`const checks = yield* sh('...')\`, one command of \`curl -sf\` and \`grep -q\` that exits \
non-zero when a requirement fails, checking the API's JSON and that \`/\` and \`/p/:id\` answer; \`curl\` cannot see a page that fails to \
render, so when the front end changed the same command ends with \`npx vite build --ssr src/Home.jsx --outDir ssr \
--logLevel error && npx vite build --ssr src/Poll.jsx --outDir ssr --emptyOutDir false --logLevel error && node \
render-check.mjs\`, where F-1 writes \`render-check.mjs\` as exactly: \`import React from 'react'; import { \
prerenderToNodeStream } from 'react-dom/static'; globalThis.location = new URL('http://localhost/p/x'); \
globalThis.localStorage = { getItem: () => null, setItem: () => {} }; const pages = { Home: (await \
import('./ssr/Home.js')).default, Poll: (await import('./ssr/Poll.js')).default }; globalThis.document = { \
getElementById: () => null, querySelector: () => null, body: null }; for (const [name, Page] of \
Object.entries(pages)) { const fail = (error) => { console.log(name, 'does not render:', error.message.slice(0, \
200)); process.exitCode = 1; }; try { const { prelude } = await prerenderToNodeStream(React.createElement(Page, { \
id: 'x' }), { onError: fail }); for await (const chunk of prelude); } catch (error) { fail(error); } }\`; then, only if \`checks.exitCode === 0\`, \`git add -A && git commit -qm \
'F-n: …'\`, the two status updates and one \`print\` saying what passed; otherwise \`print(checks.stdout, \
checks.stderr)\`. Do not split it into separate calls for writing, restarting, checking, committing and statuses, and \
do not read the feature's requirements again: they are in the spec.
- Write a new file whole with \`write\`. Change a file an earlier task wrote with \`edit\`, replacing exact strings \
you wrote there, so a change costs only the lines it touches: \`const edit = function* (name, pairs) { let text = \
(yield* sh('cat ' + name)).stdout; for (const [from, to] of pairs) { if (text.split(from).length !== 2) throw new \
Error(name + ': not exactly once: ' + from.slice(0, 60)); text = text.replace(from, () => to); } yield* write(name, \
text); };\` then \`yield* edit('src/Poll.jsx', [[before, after]])\`. Never print a file. The code has no comments, and \
the pages keep their CSS to a few lines.
- Time zone math uses \`Intl.DateTimeFormat\` with \`timeZone\`, which the Workers runtime ships in full. Compute every \
offset on the slot's own date and hour, never once per poll; the spec's F-7 and T-3 say exactly what that means.
- Check your work on the Worker running in the sandbox, never on the deployed one. In the first task, once \
\`wrangler.jsonc\` exists, serve it with ExposePort (\`dxn:org.dxos.operation.sandbox.exposePort\`) \`{ sandbox, port: 8787, command: 'wrangler dev --ip 0.0.0.0 \
--port 8787', cwd: '/workspace/poll' }\`; from the sandbox it answers at \`http://localhost:8787\`. A reload after an \
edit can leave it hanging, so after changing files call ExposePort again with the same input: it restarts the server. \
Give every \`curl\` \`-m 10 --retry 5 --retry-connrefused\`, so a hung request fails at once and a restarting server \
is waited for. A request that still times out is a build error, which only the newest wrangler log shows: \
\`grep -A8 ERROR "$(ls -t ~/.config/.wrangler/logs/*.log | head -1)"\`.
- Work the tasks in order and never write a later task's code early: F-1 serves only what F-1 requires.
- \`Check M-n\` is one call too: it writes the milestone's scenario as \`check.mjs\`, a Node script whose every \
\`fetch\` has \`signal: AbortSignal.timeout(10_000)\`, runs it on \`localhost:8787\`, and builds a table of expected \
against actual for every count, slot start and best slot the scenario states. When it all matches, the same program \
deploys, sets the milestone's features to \`operational\`, sets the task's description to the Worker URL and that \
table, records a spec review, and sets the task to \`review\`. The review is \
\`dxn:org.dxos.operation.code.createSpecReview\` \`{ spec: project.specs[0], content }\`, \`content\` a \`.review.mdl\`: \
front matter \`commit:\` (\`git rev-parse HEAD\` in \`/workspace/poll\`), \`date:\` (now, \`YYYY-MM-DDTHH:MMZ\` in UTC) \
and \`by: agent:claude\`; a \`# Review: Availability Poll\` title and one paragraph naming the milestone, its scenario \
and the result; then, in an \`mdl\` fence, one \`verdict <id>: <the item's text>\` block for each requirement of the \
milestone's features and one for its scenario, each with \`status:\` (\`done\` when the scenario or the render check \
covers it, \`untested\` when only the code does it), a \`note:\` naming the file and function that does it, \
\`evidence: []\` and \`tests: []\`. Make no showcase. \`Check M-2\` reads pages rather than the API: its \
\`check.mjs\` builds both pages for SSR as the render check does, creates T-1's poll and marks on \`localhost:8787\`, \
prerenders \`Home\` and \`Poll\` with \`{ id, poll, name: 'Ben' }\` under the render check's stubs, reads each \
page's text as \`html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ')\`, and checks each line of T-2 against it.

Deploying. \`cd /workspace/poll && wrangler deploy --temporary\` mints a temporary account and prints the Worker URL and \
a claim URL. The claim URL is a bearer credential for the account: give it to me directly and file it nowhere. \
Redeploy from the same sandbox to keep the account and the URL, which the redeploy prints again; the account expires \
after about an hour, and if it has, deploy again and use the new URL.

Changes. When I change a feature's requirements and ask you to revalidate, run the affected scenario on \
\`localhost:8787\` under the changed requirement before touching any code. If it fails, set the feature to \`failing\`, update every \
line of the spec's scenarios that the change moves (a count, a best slot), add a decision to the spec's Changelog saying \
what changed, and file one task for the fix under the milestone that shipped the feature, linked to it. Then stop. \
When I delegate the fix, change the code, rerun the scenario on \`localhost:8787\`, deploy, and set the feature back to \
\`operational\`.

M-4, flight options, is for me to build later. Do not plan or build it unless I ask. This project needs no Cloudflare \
login and no API keys; if a step seems to need either, it is the wrong step.`;

/**
 * The work-stream. Its task set starts empty — no milestone, no task — because planning from the spec is what the
 * reader watches the agent do. It owns the poll spec as its feature map and files the design docs and drawings as
 * artifacts, in the order the reader opens them.
 */
export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput> = SampleSpace.partial('project', {
  // `Project.make` builds an outline for the project, and the instructions' prose is stored as a Text, so both are
  // declared though neither is created here directly.
  schemas: [Project.Project, Instructions.Instructions, TaskSet.TaskSet, Outline.Outline, Text.Text],
  run: ({ spec, docs }: ProjectInput) =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({ name: 'Availability Poll', description: 'Planned from the spec, one milestone at a time.' }),
      );

      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Availability Poll',
          text: INSTRUCTIONS,
          skills: SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
          objects: [Ref.make(taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Availability Poll',
          description:
            'A When2meet-style poll on Cloudflare Workers, one Durable Object per poll, right across time zones and clock changes.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(taskSet),
          specs: [Ref.make(spec.spec)],
          artifacts: [
            Ref.make(docs.docs.zones),
            Ref.make(docs.docs.durable),
            Ref.make(docs.docs.duffel),
            Ref.make(docs.drawings.poll),
            Ref.make(docs.drawings.flights),
          ],
        }),
      );

      return { project, instructions, taskSet };
    }),
});
