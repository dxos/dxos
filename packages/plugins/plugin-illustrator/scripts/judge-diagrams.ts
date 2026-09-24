//
// Copyright 2026 DXOS.org
//

//
// Grades `.mmd` diagrams on one 0–1 scale: the layout objective's constraints and cost terms, plus the
// architecture rules (`Architecture.RULES`) judged by System One in one batched decision call per
// diagram. Needs `TYPESAFE_API_KEY`; without it the architecture rows report an error and the rest
// still print.
// Run: `moon run plugin-illustrator:judge-diagrams -- /abs/path/x.mmd …` (vite-node; bun cannot load elkjs).
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { AiModelResolver, AiService } from '@dxos/ai';
import { TypeSafeResolver } from '@dxos/ai/resolvers';
import { Architecture, Diagnostics, Mermaid, MermaidEngine, Objective, type Scene, Score } from '@dxos/diagram';
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

const SOURCES = [...Score.fromObjective(Objective.DEFAULT), Architecture.judge()];

const judgeFile = (path: string) =>
  Effect.gen(function* () {
    const source = readFileSync(path, 'utf8');
    const graph = Mermaid.parse(source);
    const objects = objectsOf(yield* Effect.promise(() => MermaidEngine.compile(source)));
    const subject = {
      objects,
      report: Diagnostics.analyze(objects),
      content: Architecture.contentOf(graph, titleOf(source)),
    };
    const scores = yield* Score.evaluate(SOURCES, subject);
    return { name: basename(path, '.mmd'), graph, scores };
  });

const program = Effect.gen(function* () {
  const paths = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
  const results = yield* Effect.forEach(paths, (path) => judgeFile(resolve(path)), { concurrency: 4 });
  for (const { name, graph, scores } of results) {
    console.log(
      `\n${name}: ${graph.nodes.length} nodes, ${graph.groups.length} groups, ${graph.edges.length} edges — overall ${Score.overall(scores)?.toFixed(2) ?? '—'}`,
    );
    for (const { kind, id, score, error, detail } of scores) {
      const value = error ? `error: ${error}` : score.toFixed(2);
      console.log(`  ${kind.padEnd(12)} ${id.padEnd(26)} ${value}${detail && !error ? `   (${detail})` : ''}`);
    }
  }
});

void EffectEx.runPromise(program.pipe(Effect.provide(decisionModel)));
