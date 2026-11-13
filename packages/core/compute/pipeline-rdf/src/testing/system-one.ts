//
// Copyright 2026 DXOS.org
//

import type * as Decision from 'effect/ai/Decision';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';

import { AiService, ExtractionModel } from '@dxos/ai';

import { queuedAiService } from './index.ts';

/** An answer to one decision: a probability, a label (chosen with certainty), or a label with its confidence. */
export type ScriptedAnswer = number | string | { readonly label: string; readonly confidence: number };

export type SystemOneScript = {
  /** Clairic's values by field name for a state; a field left out answers null. */
  readonly extract: (state: string) => Readonly<Record<string, unknown>>;
  /** The answers for a decision request's state, by decision name. */
  readonly decide: (state: Schema.Json) => Readonly<Record<string, ScriptedAnswer>>;
  /** Payloads the LLM fallback answers with, in order. */
  readonly fallback?: readonly unknown[];
  /** Each fallback prompt is appended here. */
  readonly prompts?: unknown[];
};

const toProviderAnswer = (decision: Decision.Any, answer: ScriptedAnswer): DecisionModel.ProviderAnswer => {
  if (typeof answer === 'number') {
    return { _tag: 'Probability', probability: answer };
  }
  const { label, confidence } = typeof answer === 'string' ? { label: answer, confidence: 1 } : answer;
  const labels = decision._tag === 'Rate' ? decision.criteria : Object.keys(decision.criteria ?? {});
  const rest = labels.length > 1 ? (1 - confidence) / (labels.length - 1) : 0;
  return {
    _tag: 'Classify',
    label,
    confidence,
    probabilities: Object.fromEntries(labels.map((candidate) => [candidate, candidate === label ? confidence : rest])),
  };
};

/**
 * `AiService` serving scripted System One models (Clairic's wire as values, decisions as answers) and a queued LLM for
 * the fallback, so routing runs end to end without a network.
 */
export const systemOneAiService = ({
  extract,
  decide,
  fallback = [],
  prompts,
}: SystemOneScript): Layer.Layer<AiService.AiService> =>
  Layer.effect(
    AiService.AiService,
    Effect.gen(function* () {
      const llm = yield* AiService.tag.pipe(Effect.provide(queuedAiService(fallback, prompts)));
      const decisionModel = yield* DecisionModel.make({
        decide: ({ state, decisions }) =>
          Effect.sync(() => {
            const answers = decide(state);
            return {
              answers: Object.fromEntries(
                Object.entries(decisions).flatMap(([name, decision]) => {
                  const answer = answers[name];
                  return answer === undefined ? [] : [[name, toProviderAnswer(decision, answer)]];
                }),
              ),
              usage: { inputTokens: 100, outputTokens: 0 },
            };
          }),
      });
      return AiService.make({
        languageModel: llm.languageModel,
        decisionModel: () => Layer.succeed(DecisionModel.DecisionModel, decisionModel),
        extractionModel: () =>
          Layer.succeed(
            ExtractionModel.ExtractionModel,
            ExtractionModel.make(({ state, fields }) =>
              Effect.sync(() => {
                const values = extract(state);
                return {
                  answers: Object.fromEntries(
                    Object.keys(fields).map((name) => [name, { value: values[name] ?? null, confidence: 0.9 }]),
                  ),
                  usage: { inputTokens: 10, outputTokens: 0 },
                };
              }),
            ),
          ),
      });
    }),
  );
