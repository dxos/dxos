//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';

import { SemanticIndexError } from '../errors.ts';

export * from './corpus.ts';
export * from './harness/serialize.ts';
export * from './harness/generate-facts.ts';

/** Minimal `AiService` whose `generateObject` returns a fixed object (no network). */
export const mockAiService = (object: unknown): Layer.Layer<AiService.AiService> =>
  Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: () =>
        Layer.succeed(LanguageModel.LanguageModel, {
          generateText: () => Effect.succeed({ text: '', content: [] }),
          generateObject: () => Effect.succeed({ value: object, content: [] }),
          streamText: () => Stream.empty,
        } as any),
    }),
  );

/** `AiService` whose `generateObject` fails, exercising the recoverable extraction error path. */
export const failingAiService = (): Layer.Layer<AiService.AiService> =>
  Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: () =>
        Layer.succeed(LanguageModel.LanguageModel, {
          generateText: () => Effect.fail(new SemanticIndexError({ message: 'boom' })),
          generateObject: () => Effect.fail(new SemanticIndexError({ message: 'boom' })),
          streamText: () => Stream.fail(new Error('boom')),
        } as any),
    }),
  );

/** What {@link queuedAiService} saw beyond the prompt text: the raw prompts and the options each model resolved with. */
export type RequestCapture = {
  readonly requests: unknown[];
  readonly resolved: Array<AiService.ResolveOptions | undefined>;
};

/** Stub `AiService` that returns a different `generateObject` payload per call (FIFO),
 *  simulating per-message LLM extraction over a sequence of documents; each prompt is appended to `prompts`. */
export const queuedAiService = (
  payloads: readonly unknown[],
  prompts: unknown[] = [],
  capture?: RequestCapture,
): Layer.Layer<AiService.AiService> => {
  let index = 0;
  return Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: (_model, options) => {
        capture?.resolved.push(options);
        return Layer.succeed(LanguageModel.LanguageModel, {
          generateText: () => Effect.succeed({ text: '', content: [] }),
          generateObject: ({ prompt }: { prompt: unknown }) => {
            capture?.requests.push(prompt);
            prompts.push(promptText(prompt));
            return index < payloads.length
              ? Effect.succeed({ value: payloads[index++], content: [] })
              : Effect.die(new Error(`queuedAiService exhausted after ${index} generateObject calls`));
          },
          streamText: () => Stream.empty,
        } as any);
      },
    }),
  );
};

/** A prompt as one string: a message list's contents joined in order, so assertions read system and user text alike. */
export const promptText = (prompt: unknown): string =>
  Array.isArray(prompt)
    ? prompt
        .map((message: { content?: unknown }) => (typeof message.content === 'string' ? message.content : ''))
        .join('\n\n')
    : String(prompt);

/** Mock `AiService` that counts `generateObject` invocations (for incrementality tests). */
export const countingAiService = (
  object: unknown,
): { layer: Layer.Layer<AiService.AiService>; calls: () => number } => {
  let calls = 0;
  const layer = Layer.succeed(
    AiService.AiService,
    AiService.make({
      languageModel: () =>
        Layer.succeed(LanguageModel.LanguageModel, {
          generateText: () => Effect.succeed({ text: '', content: [] }),
          generateObject: () => {
            calls += 1;
            return Effect.succeed({ value: object, content: [] });
          },
          streamText: () => Stream.empty,
        } as any),
    }),
  );
  return { layer, calls: () => calls };
};
