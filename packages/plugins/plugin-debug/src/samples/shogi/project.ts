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
import * as Templates from '@dxos/plugin-projects/Templates';
import { Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { type TasksResult } from './tasks.ts';

/** What the build of Composer this space is created in was built from, and the EDGE it publishes to. */
export type Toolchain = { toolchain: Templates.PluginToolchain; edgeUrl: string };

export type ProjectInput = Toolchain & { tasks: TasksResult };

export type ProjectResult = { project: Project.Project; instructions: Instructions.Instructions };

/** Plain key rather than an import, so this plugin does not depend on plugin-sandbox (the `SkillsAnnotation` idiom). */
const SANDBOX_SKILL_KEY = 'org.dxos.skill.sandbox';

/** Bound to every chat the project delegates, so no task depends on the agent enabling a skill. */
const SKILL_KEYS = [MarkdownSkill.key, DrawingSkill.key, SANDBOX_SKILL_KEY] as const;

/** The sandbox the run builds in, named so the reader can find it in the navtree. */
const SANDBOX = 'Shogi';

/** The install downloads about a thousand packages; the publish builds nothing but uploads the bundle. */
const INSTALL_TIMEOUT_MS = 15 * 60_000;
const PUBLISH_TIMEOUT_MS = 10 * 60_000;

/** The `@dxos/*` packages a plugin with a navtree group and a page imports; everything else comes from npm. */
const DXOS_PACKAGES = [
  'app-framework',
  'app-graph',
  'app-toolkit',
  'echo',
  'echo-react',
  'react-ui',
  'react-ui-attention',
];

/** The agent's brief: the facts its plan must account for, since it writes the implementation tasks itself. */
export const instructions = ({ toolchain, edgeUrl }: Toolchain): string => `Build the Composer plugin this \
project's spec describes and publish it to my private plugin registry, which this app lists. The task list is how I \
follow this run: work it in order, setting each task's status as you finish it.

The spec (\`Shogi\`, in this space) states the pieces and the board and only names the rest; the feature map lists \
every feature. Complete the spec first, editing it in place through the Markdown skill (\`${MarkdownSkill.key}\`). \
Then draw the plan as a diagram on the canvas through the Drawing skill (\`${DrawingSkill.key}\`): state the boxes, \
arrows and groups in its semantic diagram language and let the layout engine place them, then file the drawing on \
this project. Then add the implementation tasks yourself, one per step, each linked to the feature it moves, and \
work them. If a step starts to look like architecture, it is the wrong step.

What the plan must account for:
- Build in one sandbox named "${SANDBOX}", through the Sandbox skill (\`${SANDBOX_SKILL_KEY}\`); create it before \
the first build step and run every command in it. It is a container on EDGE, every command starts in its workspace, \
and it holds \`node\`, \`npm\`, \`bun\` and \`bunx\`: everything else comes from GitHub, pkg.pr.new and npm. Run \
commands in the workspace without \`cd\`, and write files with a quoted bash heredoc. The sandbox image ships a \
coding agent of its own; do not delegate to it — it has none of this space's context.
- The plugin guide for the build of Composer this app is: \`curl -fsSL \
https://raw.githubusercontent.com/dxos/dxos/${toolchain.commit}/${Templates.GUIDE} -o guide.md\`. Its "Example: a \
plugin with its own navtree group" section holds every file a plugin with a navtree group and a page needs; the rules \
list after it is where a first build goes wrong.
- The plugin is \`dx.config.ts\`, \`vite.config.ts\`, \`tsconfig.json\` and \`src/plugin.tsx\` in the workspace, \
named "Shogi" in \`dx.config.ts\` and built to \`outDir: 'dist'\`. Beside them goes this \`package.json\`, which pins \
every package to the build of this app, and an \`.npmrc\` holding \`${Templates.NPMRC.trim()}\`:

\`\`\`json
${Templates.packageJson(toolchain, { name: 'shogi', packages: DXOS_PACKAGES })}
\`\`\`
- Install with \`bunx @pnpm/exe@10 install\` and a \`timeout\` of ${INSTALL_TIMEOUT_MS} (it downloads a thousand packages), \
typecheck with \`bun run --bun tsc -p tsconfig.json\` (vite does not typecheck), build with \`bun run --bun vite \
build\`, then \`cat dist/manifest.json\`: a build that exited zero is not evidence that it wrote the manifest.
- ${Templates.IDS}
- The game is an ECHO type, one per space, stored on the first move; until then the board shows the starting position.
- Publishing acts as my account. Run \`printenv DX_API_TOKEN | wc -c\`, which prints the token's length and never \
the token. If it prints 0, stop and ask me to grant the sandbox account access with its "Grant account access" \
action, then wait for my reply. Then run \`npx --yes --package=${Templates.cliSpec(toolchain)} dx registry publish \
--private --no-build --edge-url ${edgeUrl}\` with a \`timeout\` of ${PUBLISH_TIMEOUT_MS}, and check that it printed an \
\`Uploaded:\` line. Then tell me Shogi is in Plugins → Registry. Do not emit a \`plugin-url-prompt\` and do not load \
the plugin: the registry lists it, and installing it is my click there.

This project needs no login and no API key beyond the sandbox's \`DX_API_TOKEN\`; if a step seems to need one, that is \
the wrong step.`;

/**
 * The work-stream. It adopts the task set the tasks partial built (`Project.make` would otherwise
 * create its own empty one), and starts with no artifacts: the diagram and the published plugin are what the
 * run produces.
 */
export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput> = SampleSpace.partial('project', {
  // Neither `Outline.Outline` nor `Text.Text` is created here directly: `Project.make` builds an
  // outline for the project, and the instructions' prose is stored as a Text. A partial has to declare
  // every type it persists or the space cannot register it.
  schemas: [Project.Project, Instructions.Instructions, Outline.Outline, Text.Text],
  run: ({ tasks, ...toolchain }: ProjectInput) =>
    Effect.gen(function* () {
      const projectInstructions = yield* Database.add(
        Instructions.make({
          name: 'Shogi',
          text: instructions(toolchain),
          skills: SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
          objects: [Ref.make(tasks.taskSet)],
        }),
      );

      const project = yield* Database.add(
        Project.make({
          name: 'Shogi',
          description:
            'A Composer plugin that puts a shogi board in every space, built in a sandbox on EDGE and published to the private plugin registry.',
          status: 'active',
          instructions: Ref.make(projectInstructions),
          taskSet: Ref.make(tasks.taskSet),
        }),
      );

      return { project, instructions: projectInstructions };
    }),
});
