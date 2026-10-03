//
// Copyright 2026 DXOS.org
//
// Scores the design pipeline against the hand-drawn diagrams in plugin-illustrator: their `%% ref`
// targets are what a person judged important for an area, so they are the ground truth for recall
// and precision, and the drawings themselves are the bar the generated diagram's judge scores meet.
// Live: calls System One (TYPESAFE_API_KEY) and, with `--llm`, Anthropic for the LLM explorer.
// Usage: node scripts/design-eval.ts [--out dir] [--llm] [--model claude-haiku-4-5-20251001]
//        [--runs 3] [--only name,name] [--store dir]
//

import * as Effect from 'effect/Effect';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { EffectEx } from '@dxos/effect';

import * as Crawler from '../src/Crawler.ts';
import * as Cache from '../src/design/Cache.ts';
import * as Compact from '../src/design/Compact.ts';
import * as Draw from '../src/design/Draw.ts';
import * as Explore from '../src/design/Explore.ts';
import type * as Graph from '../src/design/Graph.ts';
import * as LlmExplorer from '../src/design/LlmExplorer.ts';
import * as SystemOne from '../src/design/SystemOne.ts';
import * as Zoom from '../src/design/Zoom.ts';
import * as Store from '../src/Store.ts';
import * as Models from '../src/workspace/Models.ts';
import * as Workspace from '../src/workspace/Workspace.ts';

const DIAGRAMS = 'packages/plugins/plugin-illustrator/docs/diagrams';

/** One prompt per hand-drawn area, phrased as a developer would ask it rather than from the refs. */
const AREAS: readonly { name: string; file: string; prompt: string }[] = [
  {
    name: 'client-services',
    file: 'ideas/client-services.mmd',
    prompt: 'How do the client SDK proxies reach the client services, in-process and through a worker?',
  },
  {
    name: 'compute-invocation',
    file: 'ideas/compute.mmd',
    prompt: 'How does a trigger invocation flow through the compute runtime to a running process?',
  },
  {
    name: 'echo-paths',
    file: 'ideas/echo.mmd',
    prompt: 'What are the ECHO write and read paths from the client database down to storage?',
  },
  {
    name: 'process-management',
    file: 'ideas/process.mmd',
    prompt: 'How are compute processes managed, locally and on EDGE?',
  },
  {
    name: 'app-framework',
    file: 'app-framework.mmd',
    prompt: 'How does the app framework activate plugins and wire their capabilities into React surfaces?',
  },
  {
    name: 'assistant',
    file: 'assistant.mmd',
    prompt: 'How does an assistant prompt become agent turns, model calls, tool calls and ECHO writes?',
  },
  {
    name: 'compute-packages',
    file: 'compute.mmd',
    prompt: 'How do the compute packages depend on each other?',
  },
  {
    name: 'echo-tiers',
    file: 'echo.mmd',
    prompt: 'How is ECHO split between the client tier and the host tier?',
  },
  {
    name: 'pipeline',
    file: 'pipeline.mmd',
    prompt: 'How does the streaming pipeline move items from a source through stages to a sink?',
  },
];

const THRESHOLDS = [0.3, 0.5, 0.7];
const BUDGETS = [14, 30];

const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const options = {
  out: resolve(argument('--out') ?? 'design-eval'),
  llm: process.argv.includes('--llm'),
  model: argument('--model') ?? 'claude-haiku-4-5-20251001',
  runs: Math.max(1, Number(argument('--runs') ?? 3)),
  only: argument('--only')?.split(','),
  store: argument('--store'),
};

/** The repo paths a hand-drawn diagram's nodes point at; links outside this repository are skipped. */
const refsOf = (source: string): string[] => [
  ...new Set(
    source
      .split('\n')
      .map((line) => line.trim().match(/^%% ref \S+ (\S+)/)?.[1])
      .filter((target): target is string => target !== undefined && !target.startsWith('http'))
      .map((target) => target.replace(/\/$/, '')),
  ),
];

/** A candidate file stands for a ref when it is that file or lies inside that directory. */
const covers = (path: string, ref: string): boolean => path === ref || path.startsWith(`${ref}/`);

const recall = (paths: readonly string[], refs: readonly string[]): number =>
  refs.length === 0 ? 0 : refs.filter((ref) => paths.some((path) => covers(path, ref))).length / refs.length;

const precision = (paths: readonly string[], refs: readonly string[]): number =>
  paths.length === 0 ? 0 : paths.filter((path) => refs.some((ref) => covers(path, ref))).length / paths.length;

const percent = (value: number) => `${Math.round(value * 100)}%`;

type ExplorerRun = { candidates: Graph.Candidates; ms: number; error?: string };

type AreaResult = {
  name: string;
  prompt: string;
  refs: string[];
  explorers: Record<string, { recall: number; nodes: number; edges: number; ms: number; error?: string }>;
  zoom: Record<
    string,
    { threshold: number; budget: number; precision: number; recall: number; recallOfFound: number; kept: number }[]
  >;
  usage: Zoom.Usage & { zoomMs: number };
  grouping: string;
  diagram?: { variant: string; overall?: number; nodes: number; recall: number; scores: Draw.Row[] };
  handDrawn?: { overall?: number; scores: Draw.Row[] };
};

const program = Effect.gen(function* () {
  const root = yield* Crawler.gitRoot();
  const storeDir = options.store ? resolve(options.store) : Crawler.storeDir(root);
  const cache = yield* Cache.open(join(storeDir, 'design-cache.jsonl'));
  mkdirSync(options.out, { recursive: true });
  const areas = AREAS.filter((area) => !options.only || options.only.includes(area.name));
  const results: AreaResult[] = [];

  for (const area of areas) {
    const source = readFileSync(join(root, DIAGRAMS, area.file), 'utf8');
    const refs = refsOf(source);
    console.log(`\n# ${area.name}: ${refs.length} refs — ${area.prompt}`);

    const explorers: Record<string, ExplorerRun> = {};
    const timed = <E, R>(effect: Effect.Effect<Graph.Candidates, E, R>) =>
      Effect.gen(function* () {
        const started = Date.now();
        const candidates = yield* effect;
        return { candidates, ms: Date.now() - started };
      });

    explorers.bfs = yield* timed(
      Effect.flatMap(Store.Store, (store) => Explore.bfs({ prompt: area.prompt })(store)),
    ).pipe(Effect.provide(Store.layer(storeDir)));
    if (options.llm) {
      const selection = yield* Models.select({ provider: 'anthropic', model: options.model });
      explorers.llm = yield* timed(LlmExplorer.explore({ prompt: area.prompt })).pipe(
        Effect.provide(Workspace.layer({ storeDir, model: selection })),
        Effect.catch((error) =>
          Effect.succeed({
            candidates: { prompt: area.prompt, explorer: 'llm', seeds: [], nodes: [], edges: [] },
            ms: 0,
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
    }

    const explorerSummary = Object.fromEntries(
      Object.entries(explorers).map(([name, run]) => [
        name,
        {
          recall: recall(
            run.candidates.nodes.map((node) => node.path),
            refs,
          ),
          nodes: run.candidates.nodes.length,
          edges: run.candidates.edges.length,
          ms: run.ms,
          ...(run.error ? { error: run.error } : {}),
        },
      ]),
    );
    for (const [name, summary] of Object.entries(explorerSummary)) {
      console.log(
        `  explore ${name}: recall ${percent(summary.recall)} of ${summary.nodes} nodes in ${summary.ms}ms${summary.error ? ` (${summary.error})` : ''}`,
      );
    }

    // Zoom the deterministic explorer's candidates, so scorer comparisons share one input.
    const candidates = explorers.bfs.candidates;
    const found = refs.filter((ref) => candidates.nodes.some((node) => covers(node.path, ref)));
    const zoomed: Record<string, Zoom.ZoomResult> = {};
    let zoomMs = 0;
    for (const scorer of ['system-one', 'baseline'] as const) {
      const started = Date.now();
      zoomed[scorer] = yield* Zoom.zoom({
        prompt: area.prompt,
        candidates,
        scorer,
        model: SystemOne.MODEL.id.toString(),
        cache,
        threshold: 0.5,
        budget: 30,
      });
      if (scorer === 'system-one') {
        zoomMs = Date.now() - started;
      }
    }
    const zoom = Object.fromEntries(
      Object.entries(zoomed).map(([scorer, { scored }]) => [
        scorer,
        THRESHOLDS.flatMap((threshold) =>
          BUDGETS.map((budget) => {
            const ranked = [...scored.nodes]
              .filter((node) => node.score >= threshold)
              .sort((left, right) => right.score - left.score);
            const paths = ranked.slice(0, budget).map((node) => node.path);
            return {
              threshold,
              budget,
              precision: precision(paths, refs),
              recall: recall(paths, refs),
              recallOfFound: recall(paths, found),
              kept: paths.length,
            };
          }),
        ),
      ]),
    );
    for (const [scorer, rows] of Object.entries(zoom)) {
      console.log(
        `  zoom ${scorer}: ${rows.map((row) => `t${row.threshold}/k${row.budget} P${percent(row.precision)} R${percent(row.recall)}`).join('  ')}`,
      );
    }

    const scored = zoomed['system-one'].scored;
    const result: AreaResult = {
      name: area.name,
      prompt: area.prompt,
      refs,
      explorers: explorerSummary,
      zoom,
      usage: { ...zoomed['system-one'].usage, zoomMs },
      grouping: scored.grouping,
    };

    if (SystemOne.available()) {
      const variants = Compact.variants(scored.grouping).map((variant) => Compact.build(scored, variant));
      const [best] = yield* Draw.best(variants, { runs: options.runs });
      const handDrawn = yield* Draw.judge(
        area.name,
        source
          .split('\n')
          .filter((line) => !/^%%(?! ref)/.test(line.trim()))
          .join('\n'),
        {
          runs: options.runs,
        },
      );
      const chosen = variants.find((variant) => variant.variant.name === best.name);
      result.diagram = {
        variant: best.name,
        overall: best.overall,
        nodes: chosen?.nodes.length ?? 0,
        recall: recall(chosen?.nodes.map((node) => node.path) ?? [], refs),
        scores: [...best.scores],
      };
      result.handDrawn = { overall: handDrawn.overall, scores: [...handDrawn.scores] };
      writeFileSync(join(options.out, `${area.name}.mmd`), best.mermaid);
      writeFileSync(join(options.out, `${area.name}.svg`), best.svg);
      writeFileSync(join(options.out, `${area.name}.hand.svg`), handDrawn.svg);
      console.log(
        `  diagram ${best.name}: overall ${best.overall?.toFixed(2)} vs hand-drawn ${handDrawn.overall?.toFixed(2)}; covers ${percent(result.diagram.recall)} of refs`,
      );
    }
    console.log(
      `  usage: ${result.usage.calls} calls (${result.usage.cached} cached), $${result.usage.usd.toFixed(4)}, zoom ${result.usage.zoomMs}ms`,
    );
    results.push(result);
    writeFileSync(join(options.out, 'eval.json'), `${JSON.stringify(results, null, 2)}\n`);
  }

  writeFileSync(join(options.out, 'eval.md'), report(results));
  console.log(`\nwrote ${options.out}/eval.md`);
});

const mean = (values: readonly number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/** The markdown the PR carries: one table per question the evaluation answers. */
const report = (results: readonly AreaResult[]): string => {
  const lines: string[] = [];
  const explorerNames = [...new Set(results.flatMap((result) => Object.keys(result.explorers)))];
  lines.push('### (a) Explorer recall (hand-drawn refs ⊆ candidates)', '');
  lines.push(`| area | refs | ${explorerNames.map((name) => `${name} recall | ${name} nodes`).join(' | ')} |`);
  lines.push(`| --- | --- | ${explorerNames.map(() => '--- | ---').join(' | ')} |`);
  for (const result of results) {
    lines.push(
      `| ${result.name} | ${result.refs.length} | ${explorerNames
        .map((name) => {
          const entry = result.explorers[name];
          return entry ? `${percent(entry.recall)}${entry.error ? ' (failed)' : ''} | ${entry.nodes}` : '— | —';
        })
        .join(' | ')} |`,
    );
  }
  lines.push(
    `| **mean** | | ${explorerNames.map((name) => `${percent(mean(results.map((result) => result.explorers[name]?.recall ?? 0)))} | ${Math.round(mean(results.map((result) => result.explorers[name]?.nodes ?? 0)))}`).join(' | ')} |`,
    '',
  );

  lines.push('### (b) Zoom precision / recall after pruning (bfs candidates; mean over areas)', '');
  lines.push(
    '| scorer | threshold | budget | precision | recall | recall of found | kept |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const scorer of ['system-one', 'baseline']) {
    for (const threshold of THRESHOLDS) {
      for (const budget of BUDGETS) {
        const rows = results.flatMap(
          (result) => result.zoom[scorer]?.filter((row) => row.threshold === threshold && row.budget === budget) ?? [],
        );
        lines.push(
          `| ${scorer} | ${threshold} | ${budget} | ${percent(mean(rows.map((row) => row.precision)))} | ${percent(mean(rows.map((row) => row.recall)))} | ${percent(mean(rows.map((row) => row.recallOfFound)))} | ${mean(rows.map((row) => row.kept)).toFixed(1)} |`,
        );
      }
    }
  }
  lines.push('');

  lines.push('### (c) Judge scores: generated compact diagram vs hand-drawn (overall, mean of runs)', '');
  lines.push(
    '| area | variant | generated | hand-drawn | nodes | refs covered |',
    '| --- | --- | --- | --- | --- | --- |',
  );
  for (const result of results) {
    lines.push(
      `| ${result.name} | ${result.diagram?.variant ?? '—'} | ${result.diagram?.overall?.toFixed(2) ?? '—'} | ${result.handDrawn?.overall?.toFixed(2) ?? '—'} | ${result.diagram?.nodes ?? '—'} | ${result.diagram ? percent(result.diagram.recall) : '—'} |`,
    );
  }
  lines.push('');
  const ruleIds = [...new Set(results.flatMap((result) => result.diagram?.scores.map((score) => score.id) ?? []))];
  if (ruleIds.length > 0) {
    lines.push(
      'Per rule, mean over areas (generated / hand-drawn):',
      '',
      '| rule | kind | generated | hand-drawn |',
      '| --- | --- | --- | --- |',
    );
    for (const id of ruleIds) {
      const generated = results.flatMap(
        (result) => result.diagram?.scores.filter((score) => score.id === id && !score.error) ?? [],
      );
      const hand = results.flatMap(
        (result) => result.handDrawn?.scores.filter((score) => score.id === id && !score.error) ?? [],
      );
      lines.push(
        `| ${id} | ${generated[0]?.kind ?? hand[0]?.kind ?? ''} | ${mean(generated.map((score) => score.score)).toFixed(2)} | ${mean(hand.map((score) => score.score)).toFixed(2)} |`,
      );
    }
    lines.push('');
  }

  lines.push('### (d) Cost per prompt', '');
  lines.push(
    '| area | explore bfs | explore llm | zoom (System One) | calls | cached | input tokens | cost |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const result of results) {
    lines.push(
      `| ${result.name} | ${(result.explorers.bfs?.ms ?? 0) / 1000}s | ${result.explorers.llm ? `${result.explorers.llm.ms / 1000}s` : '—'} | ${result.usage.zoomMs / 1000}s | ${result.usage.calls} | ${result.usage.cached} | ${result.usage.inputTokens} | $${result.usage.usd.toFixed(4)} |`,
    );
  }
  return `${lines.join('\n')}\n`;
};

const decisionModel = SystemOne.available() ? SystemOne.layer : SystemOne.refusing;

void EffectEx.runPromise(program.pipe(Effect.provide(decisionModel), Effect.orDie)).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
