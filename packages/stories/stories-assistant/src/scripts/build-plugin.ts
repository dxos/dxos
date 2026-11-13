//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as Operation from '@dxos/compute/Operation';
import * as ComposerPluginTemplate from '@dxos/plugin-dev-shell/ComposerPluginTemplate';
import * as DevShellOperation from '@dxos/plugin-dev-shell/DevShellOperation';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import * as MarkdownOperation from '@dxos/plugin-markdown/MarkdownOperation';

import DX_CONFIG from '../../fixtures/world-clock/dx.config.ts?raw';
import SPEC from '../../fixtures/world-clock/PLUGIN.mdl?raw';
import PLUGIN from '../../fixtures/world-clock/src/plugin.tsx?raw';
import RAW_TYPES from '../../fixtures/world-clock/src/raw.d.ts?raw';
import TSCONFIG from '../../fixtures/world-clock/tsconfig.json?raw';
import VITE_CONFIG from '../../fixtures/world-clock/vite.config.ts?raw';
import { composerAsides, threadPrompt } from '../testing/scripted.ts';

/** The key the fixture's `dx.config.ts` declares; the story's project is made with it, so the two agree. */
export const WORLD_CLOCK_KEY = 'org.example.plugin.worldClock';

/** What the reader sends: the project's tasks already say everything else. */
export const BUILD_PROMPT = 'Build.';

const UPDATE_TASKS = Operation.toolName(PlanningSkill.Operations.UpdateTasks);
const BASH = Operation.toolName(DevShellOperation.Bash);
const CREATE_DOCUMENT = Operation.toolName(MarkdownOperation.Create);
const CREATE_DRAWING = Operation.toolName(DrawingOperation.Create);
const DRAW = Operation.toolName(DrawingOperation.Draw);

/** The plugin's folder, relative to the Composer app directory every Dev Shell script starts in. */
const DIR = `temp/plugins/${ComposerPluginTemplate.FOLDER}`;

/** The plugin's entry, which its dev server compiles on request. */
const ENTRY_URL = ComposerPluginTemplate.MANIFEST_URL.replace('manifest.json', 'src/plugin.tsx');

/** The guide the template's first task names, from the Composer app directory. */
const GUIDE = '../../../docs/src/content/docs/docs/plex/publishing-plugins.md';

/** Writes a file with a quoted heredoc, so nothing in it is expanded: the template asks for exactly this. */
const write = (path: string, content: string) => `cat > ${DIR}/${path} <<'DXEOF'\n${content.trimEnd()}\nDXEOF`;

/** The template's task titles, keyed by the name each task's URI is captured under. */
const TASKS = {
  parent: 'Build the World Clock plugin',
  guide: 'Read the plugin guide',
  write: 'Write the plugin in TypeScript',
  check: 'Typecheck and check the dev server',
  offer: 'Offer the plugin to load',
} as const;

/** The checklist update-tasks echoes, with each task's URI captured under its key. */
const CHECKLIST = new RegExp(
  Object.entries(TASKS)
    .map(([key, title]) => String.raw`\] ${title}\s+\(?ref: \[[^\]]*\]\((?<${key}>echo://[^)\s]+)\)`)
    .join(String.raw`[\s\S]*?`),
);

const status = (changes: Partial<Record<keyof typeof TASKS, 'started' | 'done'>>) =>
  ScriptedScene.toolCall(UPDATE_TASKS, {
    changes: Object.entries(changes).map(([key, value]) => ({ task: ScriptedScene.capture(key), status: value })),
  });

const bash = (script: string, timeout?: number) =>
  ScriptedScene.toolCall(BASH, { script, ...(timeout ? { timeout } : {}) });

/** The three subagents, keyed by the name each thread's id is captured under. */
const SUBAGENTS = {
  plan: {
    purpose: 'Plan',
    task: 'Read the Composer plugin guide and write the plan for the World Clock plugin: its files, its type and its UI.',
  },
  diagram: {
    purpose: 'Diagram',
    task: 'Draw the architecture of the World Clock plugin from the plan: its config, its modules and what they use.',
  },
  code: {
    purpose: 'Code',
    task: `Write the World Clock plugin to ${DIR} from the plan, on this machine.`,
  },
} as const;

/** Sent while the subagents work, to show the agent keeps talking. */
export const PLUGIN_SIDE_QUESTION = 'While they work: will it show my local time?';

const PLAN_DOCUMENT = 'World Clock plan';
const DIAGRAM = 'World Clock architecture';
const CODE_DOCUMENT = 'world-clock/src/plugin.tsx';

const PLAN = [
  '# World Clock plan',
  '',
  '## Files',
  '',
  '- `dx.config.ts`: the plugin key, name and icon.',
  '- `src/plugin.tsx`: the type, the navtree, the surface.',
  '- `PLUGIN.mdl`: the spec, shipped as a plugin asset.',
  '',
  '## Type',
  '',
  'One `Clock` object per space, holding a list of timezones with a map position each.',
  '',
  '## UI',
  '',
  '- A WORLD CLOCK group in each space with a Clocks page.',
  '- The page: `MapSurface.World` with a pin per clock above a row of clock cards, west to east.',
  '- A dashed card adds a clock from a timezone form.',
].join('\n');

/** The architecture as the illustrator's semantic DSL; the engine lays it out. */
const ARCHITECTURE = [
  'diagram flow=right',
  'node config "dx.config.ts"',
  'group plugin "src/plugin.tsx" {',
  '  node graph "Navtree group + Clocks page"',
  '  node article "Clocks article"',
  '  node clock "Clock type"',
  '  edge graph -> article "opens"',
  '  edge article -> clock "reads, writes"',
  '}',
  'node map "MapSurface.World"',
  'node space "Space"',
  'edge config -> graph "plugin key"',
  'edge article -> map "markers"',
  'edge clock -> space "stored in"',
].join('\n');

const delegate = (key: keyof typeof SUBAGENTS) =>
  ScriptedScene.toolCall('thread_delegate', { task: SUBAGENTS[key].task, purpose: SUBAGENTS[key].purpose });

const started = (key: keyof typeof SUBAGENTS) =>
  ScriptedScene.turn(
    'tool',
    `Started subagent thread ${ScriptedScene.threadId(`${key}Thread`)} ("${SUBAGENTS[key].purpose}")`,
  );

const wait = (key: keyof typeof SUBAGENTS) =>
  ScriptedScene.toolCall('thread_wait', { thread: ScriptedScene.threadId(`${key}Thread`) });

/**
 * The agent works the Composer Plugin template's tasks through three subagents: a plan first, then a diagram and the
 * code in parallel, each in a column of its own. It then typechecks the plugin and checks its dev server itself, and
 * offers it to load. Every command runs on the machine serving storybook; only the model's choices are scripted.
 */
const agent = ScriptedScene.conversation('agent', [
  ScriptedScene.turn('user', BUILD_PROMPT),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('The project hands me its tasks; the checklist says what to do and in what order.'),
      ScriptedScene.text('Reading my checklist first.'),
      ScriptedScene.toolCall(UPDATE_TASKS, { changes: [] }),
    ],
    { delay: '1 second' },
  ),
  ScriptedScene.turn('tool', CHECKLIST),

  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'The diagram and the code both follow from the plan, and neither needs the other: plan first, then both at once.',
      ),
      ScriptedScene.text('Three subagents: one plans, then one draws the architecture while another writes the code.'),
      status({ parent: 'started', guide: 'started' }),
      delegate('plan'),
    ],
    { delay: '1500 millis' },
  ),
  started('plan'),
  ScriptedScene.turn('assistant', [ScriptedScene.text('Waiting for the plan.'), wait('plan')], { delay: '800 millis' }),
  ScriptedScene.turn('tool', `${ScriptedScene.objectId('plan')}`),

  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('The plan is in. Drawing and coding in parallel.'),
      status({ guide: 'done', write: 'started' }),
      delegate('diagram'),
    ],
    { delay: '1200 millis' },
  ),
  started('diagram'),
  ScriptedScene.turn('assistant', [delegate('code')], { delay: '800 millis' }),
  started('code'),
  ScriptedScene.turn('assistant', [wait('diagram')]),
  ScriptedScene.turn('tool', `${ScriptedScene.objectId('diagram')}`),
  ScriptedScene.turn('assistant', [ScriptedScene.text('The diagram is done. Waiting for the code.'), wait('code')], {
    delay: '800 millis',
  }),
  ScriptedScene.turn('tool', `${ScriptedScene.objectId('code')}`),

  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('The code is written. Typechecking it myself.'),
      status({ write: 'done', check: 'started' }),
      bash(`../../../node_modules/.bin/tsc -p ${DIR}/tsconfig.json && echo 'typecheck: ok'`, 300_000),
    ],
    { delay: '1 second' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('Checking that the dev server serves the manifest and compiles the entry.'),
      bash(
        [
          `curl -sf ${ComposerPluginTemplate.MANIFEST_URL} || echo 'The dev server is not running: start node_modules/.bin/vite ${DIR} from the Composer app directory.'`,
          `echo; echo "entry: $(curl -s -o /dev/null -w '%{http_code}' ${ENTRY_URL})"`,
        ].join('\n'),
      ),
    ],
    { delay: '1 second' },
  ),
  ScriptedScene.turn('assistant', [status({ check: 'done', offer: 'done', parent: 'done' })], { delay: '1 second' }),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        [
          `**World Clock is ready.** It is in \`${DIR}\`, typechecks, and its dev server serves it at ${ComposerPluginTemplate.MANIFEST_URL}.`,
          '',
          'Load it in Composer from **Plugins → Dev Server**: the Manifest URL is already that address, so click **Enable**. Each space then gains a WORLD CLOCK group with a Clocks page.',
          '',
          `![${PLAN_DOCUMENT}](${ScriptedScene.objectId('plan')})`,
          '',
          `![${DIAGRAM}](${ScriptedScene.objectId('diagram')})`,
          '',
          `![${CODE_DOCUMENT}](${ScriptedScene.objectId('code')})`,
        ].join('\n'),
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

/** Reads the guide on this machine and writes the plan as a document. */
const planner = ScriptedScene.conversation('plan', [
  ScriptedScene.turn('user', SUBAGENTS.plan.task),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('The guide lists every file a plugin needs; its headings are the outline.'),
      ScriptedScene.text('Reading the guide.'),
      bash(`grep -n '^### ' ${GUIDE} && sed -n '/^Things to know:/,/^### Example: data/p' ${GUIDE}`),
    ],
    { delay: '2 seconds' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'The two examples cover it: a navtree group and page, then an ECHO type with a form. The map is one surface.',
      ),
      ScriptedScene.text('Writing the plan: files, type, UI.'),
      ScriptedScene.toolCall(CREATE_DOCUMENT, { name: PLAN_DOCUMENT, content: PLAN }),
    ],
    { delay: '3 seconds' },
  ),
  ScriptedScene.turn('tool', `"id":"${ScriptedScene.objectId('plan')}"`),
  ScriptedScene.turn(
    'assistant',
    [ScriptedScene.text(`The plan is written.\n\n![${PLAN_DOCUMENT}](${ScriptedScene.objectId('plan')})`)],
    { delay: '1 second' },
  ),
]);

/** The drawing's URI in the space, from the id its creation returned. */
const DRAWING_URI = `echo:///${ScriptedScene.capture('drawingId')}`;

/** Draws the plugin's architecture with the illustrator. */
const drawer = ScriptedScene.conversation('diagram', [
  ScriptedScene.turn('user', SUBAGENTS.diagram.task),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('Boxes and arrows: the config, the three parts of plugin.tsx, the map and the space.'),
      ScriptedScene.text('Making a drawing.'),
      ScriptedScene.toolCall(CREATE_DRAWING, { name: DIAGRAM }),
    ],
    { delay: '3 seconds' },
  ),
  // A created drawing comes back whole, with its bare id; the URI that addresses it in the space is built from it.
  ScriptedScene.turn('tool', `"object":{"id":"${ScriptedScene.capture('drawingId', /[0-9A-Z]{26}/)}"`),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('Left to right, in the order a request flows: config, navtree, article, type, space.'),
      ScriptedScene.text('Drawing the architecture.'),
      ScriptedScene.toolCall(DRAW, { drawing: DRAWING_URI, source: ARCHITECTURE }),
    ],
    { delay: '4 seconds' },
  ),
  ScriptedScene.turn('assistant', [ScriptedScene.text(`The architecture is drawn.\n\n![${DIAGRAM}](${DRAWING_URI})`)], {
    delay: '2 seconds',
  }),
]);

/** Writes the plugin's files on this machine with Dev Shell. */
const coder = ScriptedScene.conversation('code', [
  ScriptedScene.turn('user', SUBAGENTS.code.task),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('Config and spec first, so the plugin file has its key and its asset to import.'),
      ScriptedScene.text('Writing the config and the spec.'),
      bash(
        [
          `rm -rf ${DIR}/src && mkdir -p ${DIR}/src`,
          write('dx.config.ts', DX_CONFIG),
          write('vite.config.ts', VITE_CONFIG),
          write('tsconfig.json', TSCONFIG),
          write('PLUGIN.mdl', SPEC),
          write('src/raw.d.ts', RAW_TYPES),
          `ls -la ${DIR}`,
        ].join('\n'),
      ),
    ],
    { delay: '3 seconds' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning('One file holds it all: the type, the navtree group and page, and the article.'),
      ScriptedScene.text('Now the plugin: the World Clock group and its Clocks page, the Clock type, and the article.'),
      bash([write('src/plugin.tsx', PLUGIN), `wc -l ${DIR}/src/plugin.tsx`].join('\n')),
    ],
    { delay: '5 seconds' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'The files are on disk; a copy of the plugin in the space lets the reader review it here.',
      ),
      ScriptedScene.text('Publishing the plugin source for review.'),
      ScriptedScene.toolCall(CREATE_DOCUMENT, {
        name: CODE_DOCUMENT,
        content: `\`\`\`tsx\n${PLUGIN.trimEnd()}\n\`\`\``,
      }),
    ],
    { delay: '2 seconds' },
  ),
  ScriptedScene.turn('tool', `"id":"${ScriptedScene.objectId('code')}"`),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        `Wrote the plugin to \`${DIR}\`: config, spec and \`src/plugin.tsx\`.\n\n![${CODE_DOCUMENT}](${ScriptedScene.objectId('code')})`,
      ),
    ],
    { delay: '1 second' },
  ),
]);

/** A question the reader sends mid-run, answered at once in a light thread. */
const sideQuestion = ScriptedScene.conversation('side question', [
  ScriptedScene.turn('user', 'will it show my local time'),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text(
        'Yes: until you add a clock, the page shows one for your own timezone, read from the browser, with a pin on the map.',
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

/** Builds the World Clock plugin for real on this machine through three subagents, with the model's turns scripted. */
export const buildPlugin = ScriptedScene.make([agent, planner, drawer, coder, sideQuestion], {
  asides: composerAsides,
  promptOf: threadPrompt,
});
