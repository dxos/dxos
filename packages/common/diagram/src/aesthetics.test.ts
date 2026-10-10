//
// Copyright 2026 DXOS.org
//

import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { IMAGE_RULES, RULES, judge } from './aesthetics.ts';
import { contentOf } from './architecture.ts';
import { parse } from './mermaid.ts';
import { evaluate } from './score.ts';

const GRAPH = parse('flowchart TB\n  A --> B');

/** A model that answers every question with 0.7, recording the encoded input and questions it was asked. */
type Calls = { count: number; questions: string[]; state?: unknown; images?: readonly DecisionModel.Image[] };

const stubModel = (calls: Calls, supportsImages = false) =>
  Layer.effect(
    DecisionModel.DecisionModel,
    DecisionModel.make({
      supportsImages,
      decide: ({ decisions, state, images }) =>
        Effect.sync(() => {
          calls.count += 1;
          calls.questions = Object.keys(decisions);
          calls.state = state;
          calls.images = images;
          return {
            answers: Object.fromEntries(
              Object.keys(decisions).map((key) => [key, { _tag: 'Probability' as const, probability: 0.7 }]),
            ),
            usage: { inputTokens: undefined, outputTokens: undefined },
          };
        }),
    }),
  );

describe('aesthetics', () => {
  test('rules are judged from the layout in one batched call', ({ expect }) => {
    const calls: Calls = { count: 0, questions: [] };
    const scores = Effect.runSync(
      evaluate([judge()], { content: contentOf(GRAPH, { layout: 'row 1 (top): "A"' }) }).pipe(
        Effect.provide(stubModel(calls)),
      ),
    );
    expect(calls.count).toBe(1);
    expect(calls.state).toMatchObject({ layout: 'row 1 (top): "A"' });
    expect(calls.questions).toEqual(RULES.map(({ key }) => key));
    expect(scores.every(({ kind, score }) => kind === 'aesthetics' && score === 0.7)).toBe(true);
  });

  test('without a layout nothing is asked and every rule is an error', ({ expect }) => {
    const calls: Calls = { count: 0, questions: [] };
    const scores = Effect.runSync(
      evaluate([judge()], { content: contentOf(GRAPH) }).pipe(Effect.provide(stubModel(calls))),
    );
    expect(calls.count).toBe(0);
    expect(scores.every(({ error }) => error === 'No layout to judge.')).toBe(true);
  });

  test('an image of the page is judged in place of a layout, by a model that reads images', ({ expect }) => {
    const calls: Calls = { count: 0, questions: [] };
    const images = [{ mediaType: 'image/png', data: 'iVBORw==' }];
    const scores = Effect.runSync(
      evaluate([judge(IMAGE_RULES)], { content: contentOf(GRAPH), images }).pipe(
        Effect.provide(stubModel(calls, true)),
      ),
    );
    expect(calls.count).toBe(1);
    expect(calls.images).toEqual(images);
    expect(IMAGE_RULES.every(({ instructions }) => instructions.includes('the attached image is the page'))).toBe(true);
    expect(scores.every(({ score, error }) => !error && score === 0.7)).toBe(true);
  });

  test('a model that reads no images scores every rule as an error rather than judging blind', ({ expect }) => {
    const calls: Calls = { count: 0, questions: [] };
    const scores = Effect.runSync(
      evaluate([judge(IMAGE_RULES)], {
        content: contentOf(GRAPH),
        images: [{ mediaType: 'image/png', data: 'iVBORw==' }],
      }).pipe(Effect.provide(stubModel(calls))),
    );
    expect(calls.count).toBe(0);
    expect(scores.every(({ error }) => error !== undefined)).toBe(true);
  });
});
