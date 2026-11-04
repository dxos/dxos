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
the feature map holds one feature per \`feat\` block. There are no tasks until you plan them.

Planning. When I ask you to plan a milestone, read its row of the Milestones table and the features it names, then:
- Create one milestone on this project's task set, named as its row names it (\`M-1: Core poll\`), with its \
"Done when" as the description. Never plan a milestone I did not name.
- File its tasks under that milestone, three to six of them, each a piece of work someone would review on its own, in \
the order they should be done, each depending on the one before it. Link each task to every feature it moves through \
the feature map skill. The last task is always "Deploy and check M-n": deploy, then run the milestone's scenarios \
against the live URL.
- Stop there. Do not start the work until I delegate the tasks.

Building. Work the tasks you are given in order, setting each task's status as you go:
- Write the code yourself in one sandbox, through the Sandbox skill. It keeps its filesystem between commands; a second \
sandbox pays for node and wrangler again. Do not delegate to the coding agent the sandbox image ships, which has none \
of this space's context.
- One TypeScript Worker serves the API and the page, an HTML string with its own script and no build step. Each poll is \
a \`Poll\` Durable Object created with \`newUniqueId()\`, its state one storage key. \`wrangler.jsonc\` binds it and \
declares it in a migration with \`new_sqlite_classes\`, which a temporary account requires.
- Time zone math uses \`Intl.DateTimeFormat\` with \`timeZone\`, which the Workers runtime ships in full. Compute every \
offset on the slot's own date and hour, never once per poll; the spec's F-5 and T-2 say exactly what that means.
- Commit the code to a git repository in the sandbox workspace when a task is done, so later work starts from it.

Deploying. Wrangler 4.102 or later needs Node 22, and the sandbox runs Node 20: install \`wrangler@latest\` and run it \
as \`npx --yes node@22 node_modules/wrangler/bin/wrangler.js deploy --temporary\`. That mints a temporary account and \
prints the Worker URL and a claim URL. The claim URL is a bearer credential for the account: give it to me directly \
and file it nowhere. Redeploy from the same sandbox to keep the account and the URL; the account expires after about \
an hour, and if it has, deploy again and use the new URL. File the Worker URL on this project as an artifact each time \
it changes.

Checking. A deploy that exited zero is not evidence. Check each scenario against the live URL with \`curl\`: create \
the scenario's poll through \`/api/polls\`, mark as it says, and compare every count, slot start and best slot it \
states. Report what you checked as a short table of expected against actual.

Feature status, through the feature map skill:
- \`prototype\` once the feature's code is deployed and answering on the live URL.
- \`operational\` once every scenario of its milestone passes on the live URL.
- \`failing\` when a check of the live Worker shows that one of its requirements no longer holds.

Changes. When I change a feature's requirements and ask you to revalidate, check the live Worker against the changed \
requirement before touching any code. If it fails, set the feature to \`failing\`, update every scenario in the spec \
that the change moves (a count, a best slot), add a decision to the spec's Changelog saying what changed, and file one \
task for the fix under the milestone that shipped the feature, linked to it. Work it when I delegate it, then redeploy, \
recheck and set the feature back to \`operational\`.

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
