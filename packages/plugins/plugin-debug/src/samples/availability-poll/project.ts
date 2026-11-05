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

/** plugin-code's feature map skill, which it exports no subpath for. */
const FEATURE_MAP_SKILL = 'org.dxos.skill.code.featureMap';

/** Bound to every chat the project delegates, so planning, building and setting feature status never wait on the agent enabling a skill. */
const SKILL_KEYS = [FEATURE_MAP_SKILL, MarkdownSkill.key, ProjectSkill.key, SandboxSkill.key] as const;

/** What the agent needs to plan from the spec, build, deploy, check and report; each line saves it a rediscovery. */
const INSTRUCTIONS = `This project builds the availability poll its spec (\`Availability Poll\`, in this space) describes: one \
Cloudflare Worker, one Durable Object per poll. The spec is written in full and stages the work in its Milestones table; \
the feature map holds one feature per \`feat\` block. There are no tasks until you plan them. Every step below is meant \
to take one or two calls; read the spec once, and print only what you need.

Planning. When I ask you to plan a milestone, read its row of the Milestones table, then:
- Create one milestone on this project's task set, named as its row names it (\`M-1: Core poll\`), with its \
"Done when" as the description. Never plan a milestone I did not name.
- File one task per feature the row names, titled by the feature (\`F-1: Create a poll\`), linked to that feature, then \
one task \`Check M-n\` linked to all of them. Each depends on the one before.
- Stop there. Do not start the work until I delegate the tasks.

Building. Work the tasks you are given in order:
- Use one sandbox named \`availability-poll\`: find it before creating one, and keep the code in \`/workspace/poll\`. \
Keep it in git there; do not create or attach a repository.
- The image ships Node 22, git and wrangler 4. Do not run \`npm install\` or \`tsc\`.
- The code is plain JavaScript modules: \`worker.js\` (the fetch handler and the \`Poll\` Durable Object, created with \
\`newUniqueId()\`, its state one storage key) and \`page.js\` (the pages as HTML strings with their own script). \
The page's script builds strings by concatenation, never template literals: a \`\${}\` nested in the page's template \
string breaks the build. \
\`wrangler.jsonc\` binds \`Poll\` and declares it in a migration with \`new_sqlite_classes\`, which a temporary account \
requires. M-2 adds \`zones.js\` for the time zone math, so its features add a file and touch the others only by \
small edits.
- Write a new file whole, as base64 decoded in the sandbox: \
\`echo \${Buffer.from(text).toString('base64')} | base64 -d > worker.js\`. Change a file you already wrote with a short \
\`node -e\` script in the sandbox that replaces exact strings in it, found with \`grep -n\`, so a change costs only the \
lines it touches. Never print or rewrite a whole file you already wrote. Each call is a fresh program: nothing you \
assign in one is there in the next.
- Time zone math uses \`Intl.DateTimeFormat\` with \`timeZone\`, which the Workers runtime ships in full. Compute every \
offset on the slot's own date and hour, never once per poll; the spec's F-5 and T-2 say exactly what that means.
- Check your work on the Worker running in the sandbox, never on the deployed one. In the first task, once \
\`wrangler.jsonc\` exists, serve it with ExposePort \`{ sandbox, port: 8787, command: 'wrangler dev --ip 0.0.0.0 \
--port 8787', cwd: '/workspace/poll' }\`; from the sandbox it answers at \`http://localhost:8787\`. A reload after an \
edit can leave it hanging, so after changing files call ExposePort again with the same input: it restarts the server. \
Give every \`curl\` \`-m 10 --retry 5 --retry-connrefused\`, so a hung request fails at once and a restarting server \
is waited for. A request that still times out is a build error, which only the newest wrangler log shows: \
\`grep -A8 ERROR "$(ls -t ~/.config/.wrangler/logs/*.log | head -1)"\`.
- Work one task at a time: write that feature's code, restart the server, then in one command \`curl\` the \
requirements it adds on \`localhost:8787\` and commit. Then set its feature to \`prototype\` and the task to \
\`review\` before starting the next. Never write a later task's code early: F-1 serves only what F-1 requires.
- \`Check M-n\` runs the milestone's scenario on \`localhost:8787\` in one command, a Node script whose every \
\`fetch\` has \`signal: AbortSignal.timeout(10_000)\`, and prints a table of expected against actual for every count, \
slot start and best slot the scenario states. When it all matches, deploy, set the milestone's features to \
\`operational\`, and set the task's description to the Worker URL and that table. Make no showcase.

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

M-3, flight options, is for me to build later. Do not plan or build it unless I ask. This project needs no Cloudflare \
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
