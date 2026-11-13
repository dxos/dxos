//
// Copyright 2026 DXOS.org
//

import { ScriptedScene } from '@dxos/ai/testing';
import * as PlanningSkill from '@dxos/assistant-toolkit/PlanningSkill';
import * as Operation from '@dxos/compute/Operation';
import * as ComposerPluginTemplate from '@dxos/plugin-dev-shell/ComposerPluginTemplate';
import * as DevShellOperation from '@dxos/plugin-dev-shell/DevShellOperation';

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

/** The plugin's folder, relative to the Composer app directory every Dev Shell script starts in. */
const DIR = `temp/plugins/${ComposerPluginTemplate.FOLDER}`;

/** The plugin's entry, which its dev server compiles on request. */
const ENTRY_URL = ComposerPluginTemplate.MANIFEST_URL.replace('manifest.json', 'src/plugin.tsx');

/** The guide the template's first task names, from the Composer app directory. */
const GUIDE = '../../../docs/src/content/docs/docs/composer/publishing-plugins.md';

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

/**
 * The agent works the Composer Plugin template's tasks with the real Dev Shell harness: it reads the guide, writes the
 * World Clock plugin to `temp/plugins/world-clock` under the Composer app, typechecks it and checks its dev server, and
 * offers it to load. Every command runs on the machine serving storybook; only the model's choices are scripted.
 */
const builder = ScriptedScene.conversation('builder', [
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
      ScriptedScene.text('Five tasks. Starting with the plugin guide.'),
      status({ parent: 'started', guide: 'started' }),
      bash(`grep -n '^### ' ${GUIDE} && sed -n '/^Things to know:/,/^### Example: data/p' ${GUIDE}`),
    ],
    { delay: '1500 millis' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.reasoning(
        'The two examples hold every file: the navtree group and page, then the ECHO type, the form and the map.',
      ),
      ScriptedScene.text('The guide covers every file. Writing the config and the spec first.'),
      status({ guide: 'done', write: 'started' }),
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
    { delay: '2 seconds' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('Now the plugin: the World Clock group and its Clocks page, the Clock type, and the article.'),
      bash([write('src/plugin.tsx', PLUGIN), `wc -l ${DIR}/src/plugin.tsx`].join('\n')),
    ],
    { delay: '2 seconds' },
  ),
  ScriptedScene.turn(
    'assistant',
    [
      ScriptedScene.text('Typechecking it.'),
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
        ].join('\n'),
      ),
    ],
    { delay: '1200 millis' },
  ),
]);

/** Builds the World Clock plugin for real on this machine, with the model's turns scripted. */
export const buildPlugin = ScriptedScene.make([builder], { asides: composerAsides, promptOf: threadPrompt });
