//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as AiError from 'effect/unstable/ai/AiError';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';
import { describe, test } from 'vitest';

import { RULES, contentOf, judge } from './architecture.ts';
import { parse } from './mermaid.ts';
import { evaluate, overall } from './score.ts';

const SOURCE = `
flowchart TB
  subgraph app [App]
    Ui[UI]
  end
  subgraph core [Core]
    Db[Database]
    Store[Storage]
  end
  Ui --> Db
  Db -->|writes| Store
`;

/** A model that answers every question with `probability`, counting the calls it receives. */
const stubModel = (probability: number, calls: { count: number; questions: string[] }) =>
  Layer.effect(
    DecisionModel.DecisionModel,
    DecisionModel.make({
      decide: ({ decisions }) =>
        Effect.sync(() => {
          calls.count += 1;
          calls.questions = Object.keys(decisions);
          return {
            answers: Object.fromEntries(
              Object.keys(decisions).map((key) => [key, { _tag: 'Probability' as const, probability }]),
            ),
            usage: { inputTokens: undefined, outputTokens: undefined },
          };
        }),
    }),
  );

describe('architecture', () => {
  test('content keeps groups, nodes and edges, and a layout only when given one', ({ expect }) => {
    const content = contentOf(parse(SOURCE), { title: 'Toy' });
    expect(content.title).toBe('Toy');
    expect(content.groups.map(({ id }) => id)).toEqual(['app', 'core']);
    expect(content.nodes.find(({ id }) => id === 'Db')?.group).toBe('core');
    expect(content.edges).toContainEqual({ from: 'Db', to: 'Store', label: 'writes' });
    expect(content.layout).toBeUndefined();
    expect(contentOf(parse('flowchart TB\n  B ..|> A\n  B --> C')).edges).toEqual([
      { from: 'B', to: 'A', kind: 'implements' },
      { from: 'B', to: 'C' },
    ]);
    expect(contentOf(parse(SOURCE), { layout: 'row 1 (top): "Db"' }).layout).toBe('row 1 (top): "Db"');
  });

  test('every rule is answered by one batched call', ({ expect }) => {
    const calls = { count: 0, questions: [] as string[] };
    const scores = Effect.runSync(
      evaluate([judge()], { content: contentOf(parse(SOURCE)) }).pipe(Effect.provide(stubModel(0.8, calls))),
    );
    expect(calls.count).toBe(1);
    expect(calls.questions).toEqual(RULES.map(({ key }) => key));
    expect(scores.map(({ id }) => id)).toEqual(RULES.map(({ id }) => id));
    expect(scores.every(({ kind, score }) => kind === 'architecture' && score === 0.8)).toBe(true);
    expect(overall(scores)).toBeCloseTo(0.8);
  });

  test('a failed call marks every rule as an error, not as a bad diagram', ({ expect }) => {
    const failing = Layer.effect(
      DecisionModel.DecisionModel,
      DecisionModel.make({
        decide: () =>
          Effect.fail(
            AiError.make({
              module: 'test',
              method: 'decide',
              reason: new AiError.InternalProviderError({ description: 'down' }),
            }),
          ),
      }),
    );
    const scores = Effect.runSync(
      evaluate([judge()], { content: contentOf(parse(SOURCE)) }).pipe(Effect.provide(failing)),
    );
    expect(scores.every(({ error }) => error !== undefined)).toBe(true);
    expect(overall([...scores, { kind: 'cost', score: 0.5 }])).toBe(0.5);
  });
});
