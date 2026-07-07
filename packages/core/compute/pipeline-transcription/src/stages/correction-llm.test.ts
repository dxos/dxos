//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { EffectEx } from '@dxos/effect';

import { correctWithLanguageModel } from './correction-llm';

/** Minimal `AiService` whose `generateObject` returns a fixed payload (no network). */
const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: () => Effect.succeed({ value: object, content: [] }),
        streamText: () => Stream.empty,
      } as any),
  } as any);

describe('correctWithLanguageModel', () => {
  test('maps the model output to per-block corrections', async ({ expect }) => {
    const blocks = [
      { _tag: 'transcript' as const, started: 's', text: 'years,' },
      { _tag: 'transcript' as const, started: 's', text: 'maybe a bit longer' },
    ];
    const layer = mockAiService({
      blocks: [
        { index: 0, corrected: 'Years.' },
        { index: 1, corrected: 'Maybe a bit longer.' },
      ],
    });

    const result = await EffectEx.runPromise(correctWithLanguageModel(blocks).pipe(Effect.provide(layer)));
    expect(result).toEqual([
      { index: 0, corrected: 'Years.' },
      { index: 1, corrected: 'Maybe a bit longer.' },
    ]);
  });
});
