//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type Server, createServer } from 'node:http';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { CodeIndexClient } from '#client';
import { Iri } from '#graph';
import { CodeGraph } from '#types';

import { SAMPLE_GRAPH } from '../testing.ts';
import * as Command from './Command.ts';

type Rows = Record<string, string>[];

/** Answers every query with the next canned rows, and records the SPARQL it was sent. */
const fakeIndex = () => {
  const queries: string[] = [];
  let answers: Rows[] = [];
  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      queries.push(JSON.parse(body).args.sparql);
      const rows = answers.shift() ?? [];
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: { vars: Object.keys(rows[0] ?? {}), rows } }));
    });
  });
  return {
    queries,
    answer: (next: Rows[]) => {
      answers = next;
      queries.length = 0;
    },
    listen: () =>
      new Promise<string>((resolve) =>
        server.listen(0, '127.0.0.1', () => {
          const address = server.address();
          resolve(typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : '');
        }),
      ),
    close: () => server.close(),
  };
};

const step = (step: Command.Step) => ({ parts: [ScriptedLanguageModel.text(JSON.stringify(step))] });

const file = (index: number) => `${Iri.FILE}packages/core/echo/echo/src/file-${index}.ts`;

describe('Command', () => {
  const index = fakeIndex();
  let baseUrl: string;
  beforeAll(async () => {
    baseUrl = await index.listen();
  });
  afterAll(() => index.close());

  const run = (
    graph: CodeGraph.CodeGraph,
    turns: ReturnType<typeof step>[],
    options: Command.Options = {},
    command = 'test',
  ) =>
    EffectEx.runPromise(
      Command.run(graph, command, options).pipe(
        Effect.provide(
          Layer.mergeAll(ScriptedLanguageModel.layer(turns), Layer.succeed(CodeIndexClient.BaseUrl, baseUrl)),
        ),
      ),
    );

  test('clears the graph with one remove', async ({ expect }) => {
    const graph = CodeGraph.make({ nodes: SAMPLE_GRAPH.nodes, edges: SAMPLE_GRAPH.edges });
    const result = await run(graph, [step({ actions: [{ type: 'remove', filter: '*' }], message: 'Cleared.' })]);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(result).toMatchObject({ message: 'Cleared.', removedNodes: SAMPLE_GRAPH.nodes.length, stop: 'done' });
  });

  test('adds the first boxes of a large result and summarises the rest', async ({ expect }) => {
    const graph = CodeGraph.make();
    index.answer([Array.from({ length: 50 }, (_, position) => ({ node: file(position) }))]);
    const result = await run(
      graph,
      [step({ actions: [{ type: 'add', sparql: 'SELECT ?node {}' }], message: 'Files.' })],
      {
        maxNodes: 10,
      },
    );
    expect(graph.nodes).toHaveLength(10);
    expect(result.trailer?.count).toBe(40);
    expect(result.trailer?.text).toMatch(/^\+40 not shown: 40 files in packages\/core\/echo\/echo \(40\)/);
  });

  test('retries after an empty result without asking the judge', async ({ expect }) => {
    const graph = CodeGraph.make();
    index.answer([[], [{ node: file(1) }]]);
    let asked = 0;
    const result = await run(
      graph,
      [
        step({ actions: [{ type: 'add', sparql: 'SELECT ?node { wrong }' }], message: 'Trying.' }),
        step({ actions: [{ type: 'add', sparql: 'SELECT ?node { right }' }], message: 'Found it.' }),
      ],
      {
        judge: () =>
          Effect.sync(() => {
            asked++;
            return 1;
          }),
      },
    );
    expect(index.queries).toHaveLength(2);
    expect(asked).toBe(1);
    expect(graph.nodes).toHaveLength(1);
    expect(result).toMatchObject({ message: 'Found it.', stop: 'judge' });
  });

  test('a judge that says not done buys another turn', async ({ expect }) => {
    const graph = CodeGraph.make();
    index.answer([[{ node: file(1) }], [{ node: file(2) }]]);
    const verdicts = [0.1, 0.9];
    const result = await run(
      graph,
      [
        step({ actions: [{ type: 'add', sparql: 'SELECT ?node { one }' }], message: 'One.' }),
        step({ actions: [{ type: 'add', sparql: 'SELECT ?node { two }' }], message: 'Two.' }),
      ],
      { judge: () => Effect.succeed(verdicts.shift() ?? 1) },
    );
    expect(graph.nodes).toHaveLength(2);
    expect(result.turns.map(({ done }) => done)).toEqual([0.1, 0.9]);
    expect(result.stop).toBe('judge');
  });

  test('the model sees the graph it starts from', async ({ expect }) => {
    const graph = CodeGraph.make({ nodes: SAMPLE_GRAPH.nodes.slice(0, 2), edges: [] });
    expect(Command.describeGraph(graph)).toBe(
      [
        'The graph has 2 boxes (2 package) and 0 arrows:',
        '- pkg:@dxos/plugin-markdown (package)',
        '- pkg:@dxos/app-framework (package)',
      ].join('\n'),
    );
  });
});
