//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { Database, Ref } from '@dxos/echo';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { type TasksResult } from './tasks.ts';

export type ProjectInput = { tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

/** Bound to every chat the project delegates, so the diagram and spec edits never depend on the agent enabling them. */
const SKILL_KEYS = [MarkdownSkill.key, DrawingSkill.key] as const;

/** The recipe the build task follows; each line is a step an agent otherwise loses a turn rediscovering. */
const INSTRUCTIONS = `Build and deploy the page this project's spec (\`Ride Check\`, in this space) describes, one \
feature card per feature on the map. Work the task list in order and set each task's status as you finish it.

Draw first, through the Drawing skill (\`org.dxos.skill.drawing\`): state the boxes, arrows and groups in its \
semantic diagram language, let the layout engine place them, and file the drawing on this project.

Then build in one sandbox, through the Sandbox skill (\`org.dxos.skill.sandbox\`), with Node 22:
- One Worker serves both the page (static assets) and \`GET /api/forecast\`, which calls \
\`https://api.open-meteo.com/v1/forecast\` with \`timezone=auto\` and \`wind_speed_unit=kmh\`. Open-Meteo needs no key.
- The page is React built by Vite with \`@dxos/react-ui\` and \`@dxos/ui-theme\` from npm. Add \`ThemePlugin({})\` from \
\`@dxos/ui-theme/plugin\` to the Vite config; import \`@dxos-theme\` and \`@dxos/react-ui/theme.css\` first in the entry; \
wrap the app in \`<Theme.Provider tx={Theme.defaultTx} themeMode='dark'>\`. Each feature is a \`Card.Root\` with a \
\`Card.Header\`/\`Card.Title\`; use \`Tag\` and \`Icon\` for the rest. Import them from their subpaths, \
\`import * as Card from '@dxos/react-ui/Card'\`, \`import { Tag } from '@dxos/react-ui/Tag'\` and \
\`import { Icon } from '@dxos/react-ui/Icon'\`: from the package root \`Icon\` and \`Tag\` are namespaces, and \
rendering one is React error #130 and a blank page, which neither the HTML nor the API shows.
- Icons load at runtime from \`/phosphor/regular/<name>.svg\`: copy the ones the page uses from \
\`@phosphor-icons/core/assets/regular\` into \`public/phosphor/regular\`.
- Tailwind only sees class names written out in full: map a verdict to \`border-emerald-border\`, never build \
\`border-\${hue}-border\`.
- \`wrangler.jsonc\` sets \`assets.directory\` to the Vite output and \`run_worker_first: ['/api/*']\`.

Deploy with the space's Cloudflare connection when it has one: query \`org.dxos.type.accessToken\` for \
\`source: "cloudflare.com"\` and add its ref to the sandbox's \`credentials\` as \`CLOUDFLARE_API_TOKEN\`, so every \
command has it; never read the value. Then plain \`wrangler deploy\` publishes \`ride-check\` on the account's \
workers.dev subdomain, and later deploys update the same URL. Without a connection, \`wrangler deploy --temporary\` \
mints a temporary account (wrangler 4.102 or later); its claim URL is a bearer credential, so give it to me directly \
and file it nowhere, and redeploy from the same sandbox, which keeps that account for about an hour. A deploy that exited zero is not evidence: fetch \
the URL and \`/api/forecast\` and check the bodies.

Commit the code to a repository attached to the sandbox before you finish, so a later change starts from it rather \
than from nothing. A local sandbox cannot attach one: commit to a git repository in its workspace instead, and make \
later changes in the same sandbox. Work only the tasks you are given and stop when each is in review; the page needs \
no tests, no README and no extra artifacts.

When I change a feature's card or its spec block, I file a task for it: add the change to the spec's requirements, \
change the code in the same repository, redeploy to the same URL, check it, and set the feature and the subfeature \
back to operational. A subfeature is a feature on the spec its feature's \`spec\` refers to; set its status like any other feature's.`;

/**
 * The work-stream. It adopts the task set the tasks partial built (`Project.make` would otherwise create its own
 * empty one), and starts with no artifacts: the URL and the diagram are what the run produces.
 */
export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput> = SampleSpace.partial('project', {
  // `Project.make` builds an outline for the project, and the instructions' prose is stored as a Text, so both are
  // declared though neither is created here directly.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: ({ tasks }: ProjectInput) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(
        Instructions.make({
          name: 'Ride Check',
          text: INSTRUCTIONS,
          skills: SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
          objects: [Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Ride Check',
          description:
            'A Cloudflare Worker that tells a cyclist whether to ride now, from a live forecast, built with DXOS UI.',
          status: 'active',
          instructions: Ref.make(instructions),
          taskSet: Ref.make(tasks.taskSet),
        }),
      );

      return { project, instructions };
    }),
});
