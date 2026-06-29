//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, type ModelName } from '@dxos/ai';
import { type ContentBlock } from '@dxos/types';

import { DEFAULT_STAGE_MODEL } from '../PipelineConfig';

const CorrectionPayload = Schema.Struct({
  blocks: Schema.Array(Schema.Struct({ index: Schema.Number, corrected: Schema.String })),
});

const PROMPT = `You repair raw speech-to-text fragments. For each numbered fragment, return a cleaned version: fix capitalization and terminal punctuation, join words split across fragment boundaries, and drop filler/garbage tokens — without changing the meaning. Return exactly one entry per input fragment, preserving its index.`;

/**
 * LLM-backed correction over a window of transcript blocks (the {@link makeCorrectionStage} seam).
 * Returns an Effect requiring the {@link AiService} — the consumer provides its model layer and adapts
 * the Effect to the stage's Promise-shaped `CorrectFn` (e.g. `EffectEx.runPromise(... .pipe(Effect.provide(layer)))`).
 */
export const correctWithLanguageModel = (
  blocks: readonly ContentBlock.Transcript[],
  model: ModelName = DEFAULT_STAGE_MODEL,
): Effect.Effect<ReadonlyArray<{ index: number; corrected: string }>, unknown, AiService.AiService> =>
  Effect.gen(function* () {
    const input = blocks.map((block, index) => `${index}: ${block.corrected ?? block.text}`).join('\n');
    const response = yield* LanguageModel.generateObject({
      schema: CorrectionPayload,
      prompt: `${PROMPT}\n\n${input}`,
    });
    return response.value.blocks.map((block) => ({ index: block.index, corrected: block.corrected }));
    // Model-layer construction failure is a fatal wiring fault (defect); transient LLM failures stay
    // recoverable so callers can retry.
  }).pipe(Effect.provide(AiService.model(model).pipe(Layer.orDie)));
