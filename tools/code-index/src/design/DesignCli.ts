//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import type * as DecisionModel from 'effect/ai/DecisionModel';
import * as Argument from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Crawler from '../Crawler.ts';
import * as Store from '../Store.ts';
import * as Models from '../workspace/Models.ts';
import * as Workspace from '../workspace/Workspace.ts';
import * as Cache from './Cache.ts';
import * as Design from './Design.ts';
import * as Explore from './Explore.ts';
import * as LlmExplorer from './LlmExplorer.ts';
import * as SystemOne from './SystemOne.ts';
import type * as Zoom from './Zoom.ts';

/**
 * `code-index design "<prompt>"`: explore, zoom and draw, writing every stage's JSON to `--out`.
 * Exploring and scoring run here under Bun; the layout half runs in a Node child (`draw-main.ts`),
 * because ELK cannot load under Bun.
 */

const DRAW_MAIN = fileURLToPath(new URL('./draw-main.ts', import.meta.url));

/** Node from `PATH`; `undefined` skips the drawing step with a message rather than failing the run. */
const nodeBinary = (): string | undefined =>
  (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .map((entry) => join(entry, 'node'))
    .find((candidate) => existsSync(candidate));

const slug = (prompt: string): string =>
  prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'design';

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const command = Command.make(
  'design',
  {
    prompt: Argument.String('prompt'),
    root: Flag.String('root').pipe(Flag.withDescription('Repository root (default: the git root).'), Flag.optional),
    store: Flag.String('store').pipe(
      Flag.withDescription('Store directory (default: <root>/node_modules/.code-index).'),
      Flag.optional,
    ),
    out: Flag.String('out').pipe(
      Flag.withDescription('Output directory (default: <store>/design/<prompt slug>).'),
      Flag.optional,
    ),
    budget: Flag.Int('budget').pipe(Flag.withDefault(30), Flag.withDescription('Nodes the pruned graph keeps.')),
    threshold: Flag.Finite('threshold').pipe(
      Flag.withDefault(0.5),
      Flag.withDescription('Relevance a node needs to survive.'),
    ),
    maxNodes: Flag.Int('max-nodes').pipe(
      Flag.withDefault(300),
      Flag.withDescription('Upper bound on explored candidates.'),
    ),
    explorer: Flag.Literals('explorer', ['bfs', 'llm']).pipe(
      Flag.withDefault('bfs'),
      Flag.withDescription(
        'bfs: text-matched seeds and a fixed walk (no model). llm: a workspace-agent turn picks seeds and relations.',
      ),
    ),
    scorer: Flag.Literals('scorer', ['system-one', 'baseline']).pipe(
      Flag.withDescription('Relevance scorer (default: system-one when TYPESAFE_API_KEY is set, else baseline).'),
      Flag.optional,
    ),
    provider: Flag.String('provider').pipe(
      Flag.withDescription('LLM explorer provider: ollama | anthropic.'),
      Flag.optional,
    ),
    model: Flag.String('model').pipe(
      Flag.withDescription('LLM explorer model, e.g. claude-haiku-4-5-20251001.'),
      Flag.optional,
    ),
    runs: Flag.Int('runs').pipe(
      Flag.withDefault(1),
      Flag.withDescription('Judge runs to average per diagram variant.'),
    ),
    noDraw: Flag.Boolean('no-draw').pipe(Flag.withDefault(false), Flag.withDescription('Stop before layout.')),
  },
  ({ prompt, root, store, out, budget, threshold, maxNodes, explorer, scorer, provider, model, runs, noDraw }) =>
    Effect.gen(function* () {
      const repo = yield* Option.match(root, {
        onNone: () => Crawler.gitRoot(),
        onSome: (value) => Effect.succeed(resolve(value)),
      });
      const storeDir = Option.match(store, { onNone: () => Crawler.storeDir(repo), onSome: resolve });
      const dir = Option.match(out, { onNone: () => join(storeDir, 'design', slug(prompt)), onSome: resolve });
      const chosenScorer: Zoom.Scorer = Option.getOrElse(scorer, () =>
        SystemOne.available() ? 'system-one' : 'baseline',
      );
      if (chosenScorer === 'system-one' && !SystemOne.available()) {
        yield* Console.error('TYPESAFE_API_KEY is not set: unscored nodes fall back to the baseline score.');
      }
      const cache = yield* Cache.open(join(storeDir, 'design-cache.jsonl'));
      const options = { prompt, scorer: chosenScorer, model: SystemOne.MODEL.id.toString(), cache, budget, threshold };
      const decisionModel: Layer.Layer<DecisionModel.DecisionModel, unknown> =
        chosenScorer === 'system-one' && SystemOne.available() ? SystemOne.layer : SystemOne.refusing;

      const result =
        explorer === 'llm'
          ? yield* Effect.gen(function* () {
              const selection = yield* Models.select({
                provider: Option.getOrUndefined(provider),
                model: Option.getOrUndefined(model),
              });
              return yield* Design.run(LlmExplorer.explore({ prompt, maxNodes }), options).pipe(
                Effect.provide(Layer.merge(Workspace.layer({ storeDir, model: selection }), decisionModel)),
              );
            })
          : yield* Design.run(
              Effect.flatMap(Store.Store, (api) => Explore.bfs({ prompt, maxNodes })(api)),
              options,
            ).pipe(Effect.provide(Layer.merge(Store.layer(storeDir), decisionModel)));

      yield* Design.write(dir, result);
      const kept = result.scored.nodes.filter((node) => node.kept).length;
      yield* Console.log(
        [
          `${result.candidates.nodes.length} candidates (${result.candidates.edges.length} edges) from ${result.candidates.seeds.length} seeds → ${kept} kept, grouped by ${result.scored.grouping}`,
          `explore ${seconds(result.timings.exploreMs)} · zoom ${seconds(result.timings.zoomMs)} · ${result.usage.calls} decision calls (${result.usage.cached} cached), $${result.usage.usd.toFixed(4)}`,
          `wrote ${dir}`,
        ].join('\n'),
      );

      if (noDraw) {
        return;
      }
      const node = nodeBinary();
      if (node === undefined) {
        return yield* Console.error(
          'No `node` on PATH: skipped layout. Run `node src/design/draw-main.ts <out>` yourself.',
        );
      }
      const child = spawnSync(node, [DRAW_MAIN, dir, '--runs', String(runs)], { stdio: 'inherit' });
      if (child.status !== 0) {
        yield* Console.error(`Layout failed (exit ${child.status ?? child.signal}).`);
      } else {
        yield* Console.log(`diagram: ${join(dir, 'diagram.svg')}`);
      }
    }),
).pipe(Command.withDescription('Answer a design question with a scored subgraph and a compact, judged diagram.'));
