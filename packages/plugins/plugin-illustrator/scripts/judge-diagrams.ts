//
// Copyright 2026 DXOS.org
//

//
// Grades `.mmd` diagrams on one 0–1 scale: the layout objective's constraints and cost terms, plus the
// architecture rules (`Architecture.RULES`) judged by System One in one batched decision call per
// diagram. Needs `TYPESAFE_API_KEY`; without it the architecture rows report an error and the rest
// still print.
// Flags: `--layout` adds the drawn page (`View.ascii` + `View.rows`) to the judge's input and grades the
// `Aesthetics` rules from it, `--no-title` drops
// the caption so only the diagram is judged, `--runs N` averages the architecture scores over N calls, and
// `--json out.json` writes the scores, and `--layering down` restricts the layerings the engine chooses among.
// Run: `moon run plugin-illustrator:judge-diagrams -- /abs/path/x.mmd …` (vite-node; bun cannot load elkjs).
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { AiModelResolver, AiService } from '@dxos/ai';
import { TypeSafeResolver } from '@dxos/ai/resolvers';
import {
  Aesthetics,
  Architecture,
  Diagnostics,
  Mermaid,
  MermaidEngine,
  Objective,
  type Scene,
  Score,
  View,
} from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

const MODEL = 'ai.typesafe.model.jev.latest';

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** The first `%%` comment line, which the corpus uses as the diagram's caption. */
const titleOf = (source: string) =>
  source
    .split('\n')
    .find((line) => line.trim().startsWith('%%') && !line.includes('%% ref '))
    ?.replace(/^\s*%%\s*/, '');

const decisionModel = AiService.decisionModel(MODEL).pipe(
  Layer.provide(AiModelResolver.buildAiService),
  Layer.provide(
    TypeSafeResolver.make({
      apiKey: Effect.sync(() => Redacted.make(process.env.TYPESAFE_API_KEY ?? '')),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const OPTIONS = {
  layout: process.argv.includes('--layout'),
  title: !process.argv.includes('--no-title'),
  runs: Math.max(1, Number(argument('--runs') ?? 1)),
  json: argument('--json'),
  layering: argument('--layering')
    ?.split(',')
    .filter((value): value is MermaidEngine.Layering => ['down', 'up', 'free'].includes(value)),
};

type Row = Score.Scored & { spread?: number };

/** Mean of repeated scores for one scorer, keeping the first error if every run failed. */
const average = (runs: readonly Score.Scored[]): Row => {
  const judged = runs.filter(({ error }) => !error);
  if (!judged.length) {
    return runs[0];
  }
  const values = judged.map(({ score }) => score);
  const score = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { ...judged[0], score, spread: Math.max(...values) - Math.min(...values) };
};

const judgeFile = (path: string) =>
  Effect.gen(function* () {
    const source = readFileSync(path, 'utf8');
    const graph = Mermaid.parse(source);
    const objects = objectsOf(
      yield* Effect.promise(() =>
        MermaidEngine.compile(source, OPTIONS.layering ? { layering: OPTIONS.layering } : {}),
      ),
    );
    const layout = OPTIONS.layout ? `${View.ascii(objects)}\n\n${View.rows(objects)}` : undefined;
    const subject = {
      objects,
      report: Diagnostics.analyze(objects),
      content: Architecture.contentOf(graph, { title: OPTIONS.title ? titleOf(source) : undefined, layout }),
    };
    const [layoutScores, ...architectureRuns] = yield* Effect.all(
      [
        Score.evaluate(Score.fromObjective(Objective.DEFAULT), subject),
        ...Array.from({ length: OPTIONS.runs }, () =>
          Score.evaluate(OPTIONS.layout ? [Architecture.judge(), Aesthetics.judge()] : [Architecture.judge()], subject),
        ),
      ],
      { concurrency: 'unbounded' },
    );
    const architecture = architectureRuns[0].map((_, index) => average(architectureRuns.map((run) => run[index])));
    const scores: Row[] = [...layoutScores, ...architecture];
    return { name: basename(path, '.mmd'), graph, scores };
  });

const program = Effect.gen(function* () {
  const paths = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
  const results = yield* Effect.forEach(paths, (path) => judgeFile(resolve(path)), { concurrency: 4 });
  for (const { name, graph, scores } of results) {
    console.log(
      `\n${name}: ${graph.nodes.length} nodes, ${graph.groups.length} groups, ${graph.edges.length} edges — overall ${Score.overall(scores)?.toFixed(2) ?? '—'}`,
    );
    for (const { kind, id, score, error, detail, spread } of scores) {
      const value = error
        ? `error: ${error}`
        : `${score.toFixed(2)}${spread !== undefined ? ` ±${(spread / 2).toFixed(2)}` : ''}`;
      console.log(`  ${kind.padEnd(12)} ${id.padEnd(26)} ${value}${detail && !error ? `   (${detail})` : ''}`);
    }
  }
  if (OPTIONS.json) {
    writeFileSync(
      OPTIONS.json,
      JSON.stringify(
        results.map(({ name, scores }) => ({ name, overall: Score.overall(scores), scores })),
        null,
        2,
      ),
    );
  }
});

void EffectEx.runPromise(program.pipe(Effect.provide(decisionModel)));
