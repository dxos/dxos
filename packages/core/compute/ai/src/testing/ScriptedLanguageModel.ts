//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Response from '@effect/ai/Response';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import * as AiService from '../AiService';

//
// A deterministic, offline `LanguageModel` whose output is scripted rather than generated.
//
// This is the scripted-model primitive extracted from the memoized layer's cache-hit path
// (see `packages/core/compute/ai/TESTING.md`): "given this call, return these parts" — with no
// prompt-matching, no file I/O, and no live provider. It exists to test the deterministic parts
// of an agent turn (dimension D — the harness/loop) by driving `AiRequest`/`AiSession` with a
// fixed sequence of responses and asserting over the observable effects.
//
// Turns are consumed sequentially: the Nth model call returns the Nth turn. Calling past the end
// of the script fails loudly — a script is exhausted only if the loop iterated more than expected,
// which is itself a test failure worth surfacing.
//

/** Identifier reported in the `response-metadata` part of every scripted turn. */
export const SCRIPTED_MODEL_ID = 'scripted-model';

const EPOCH = '1970-01-01T00:00:00.000Z';

/** Zero-valued token usage; scripted turns carry no real accounting. */
const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 } as const;

/**
 * A single fragment emitted within a scripted turn. Build with {@link text} / {@link toolCall}.
 */
export type ScriptedPart =
  | { readonly _tag: 'text'; readonly text: string }
  | { readonly _tag: 'toolCall'; readonly name: string; readonly input: unknown; readonly id?: string };

/**
 * One model call's worth of output: either a list of parts to emit, or a failure to simulate a
 * provider error (exercises the loop's error propagation).
 */
export type ScriptedTurn =
  | { readonly parts: readonly ScriptedPart[]; readonly finishReason?: Response.FinishReason }
  | { readonly fail: AiError.AiError };

/** Scripts a text fragment. */
export const text = (content: string): ScriptedPart => ({ _tag: 'text', text: content });

/**
 * Scripts a tool call. `name` must match a tool registered on the toolkit under test; `input` is
 * serialized as the tool arguments. Supply `id` to assert against a specific tool-call id.
 */
export const toolCall = (name: string, input: unknown, id?: string): ScriptedPart => ({
  _tag: 'toolCall',
  name,
  input,
  id,
});

const isFailure = (turn: ScriptedTurn): turn is { readonly fail: AiError.AiError } => 'fail' in turn;

/** A turn with no explicit reason finishes on `tool-calls` when it emits a tool call, else `stop`. */
const finishReasonFor = (parts: readonly ScriptedPart[]): Response.FinishReason =>
  parts.some((part) => part._tag === 'toolCall') ? 'tool-calls' : 'stop';

const toolCallId = (part: Extract<ScriptedPart, { _tag: 'toolCall' }>, turnIndex: number, partIndex: number): string =>
  part.id ?? `toolu_${turnIndex}_${partIndex}`;

const responseMetadata = (turnIndex: number): Response.ResponseMetadataPartEncoded => ({
  type: 'response-metadata',
  id: `msg_${turnIndex}`,
  modelId: SCRIPTED_MODEL_ID,
  timestamp: EPOCH,
});

const finishPart = (reason: Response.FinishReason): Response.FinishPartEncoded => ({
  type: 'finish',
  reason,
  usage: ZERO_USAGE,
});

/** Encodes a turn as the streamed parts a real provider would emit (deltas). */
const encodeStreamTurn = (
  parts: readonly ScriptedPart[],
  turnIndex: number,
  reason: Response.FinishReason,
): Response.StreamPartEncoded[] => {
  const out: Response.StreamPartEncoded[] = [responseMetadata(turnIndex)];
  parts.forEach((part, partIndex) => {
    if (part._tag === 'text') {
      const id = `text_${turnIndex}_${partIndex}`;
      out.push({ type: 'text-start', id });
      out.push({ type: 'text-delta', id, delta: part.text });
      out.push({ type: 'text-end', id });
    } else {
      const id = toolCallId(part, turnIndex, partIndex);
      out.push({ type: 'tool-params-start', id, name: part.name });
      out.push({ type: 'tool-params-delta', id, delta: JSON.stringify(part.input) });
      out.push({ type: 'tool-params-end', id });
    }
  });
  out.push(finishPart(reason));
  return out;
};

/** Encodes a turn as the aggregated parts a non-streaming `generateText` would return. */
const encodeTurn = (
  parts: readonly ScriptedPart[],
  turnIndex: number,
  reason: Response.FinishReason,
): Response.PartEncoded[] => {
  const out: Response.PartEncoded[] = [responseMetadata(turnIndex)];
  parts.forEach((part, partIndex) => {
    if (part._tag === 'text') {
      out.push({ type: 'text', text: part.text });
    } else {
      out.push({ type: 'tool-call', id: toolCallId(part, turnIndex, partIndex), name: part.name, params: part.input });
    }
  });
  out.push(finishPart(reason));
  return out;
};

const exhausted = (index: number, length: number): AiError.AiError =>
  new AiError.UnknownError({
    module: 'ScriptedLanguageModel',
    method: 'generateText',
    description: `Scripted model exhausted: requested turn ${index} but the script has only ${length}.`,
  });

/**
 * Constructs a {@link LanguageModel.Service} that replays `turns` in order. Prefer the layer
 * helpers ({@link scriptedLanguageModelLayer} / {@link scriptedAiService}) at call sites.
 */
export const makeScriptedLanguageModel = (turns: readonly ScriptedTurn[]): Effect.Effect<LanguageModel.Service> =>
  Effect.gen(function* () {
    const cursor = yield* Ref.make(0);

    // The Request semaphore serializes turns, so a single monotonic cursor is race-free; a Ref keeps
    // it explicit and inspectable rather than a closure variable.
    const nextTurn = Effect.gen(function* () {
      const index = yield* Ref.getAndUpdate(cursor, (value) => value + 1);
      const turn = turns[index];
      if (turn === undefined) {
        return yield* Effect.fail(exhausted(index, turns.length));
      }
      return { index, turn };
    });

    return yield* LanguageModel.make({
      generateText: () =>
        Effect.gen(function* () {
          const { index, turn } = yield* nextTurn;
          if (isFailure(turn)) {
            return yield* Effect.fail(turn.fail);
          }
          return encodeTurn(turn.parts, index, turn.finishReason ?? finishReasonFor(turn.parts));
        }),
      streamText: () =>
        Stream.unwrap(
          Effect.gen(function* () {
            const { index, turn } = yield* nextTurn;
            if (isFailure(turn)) {
              return Stream.fail(turn.fail);
            }
            return Stream.fromIterable(
              encodeStreamTurn(turn.parts, index, turn.finishReason ?? finishReasonFor(turn.parts)),
            );
          }),
        ),
    });
  });

/**
 * Internal encoders exposed for unit-testing the wire format. Not part of the public API.
 */
export const __testing = {
  encodeStreamTurn,
  encodeTurn,
  finishReasonFor,
};

/** A {@link LanguageModel.LanguageModel} layer backed by the scripted model. */
export const scriptedLanguageModelLayer = (turns: readonly ScriptedTurn[]): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(LanguageModel.LanguageModel, makeScriptedLanguageModel(turns));

/**
 * An {@link AiService.AiService} layer whose model, regardless of the requested name, is the
 * scripted model. Pass to `AssistantTestLayer({ aiService })` to drive the agent loop deterministically.
 */
export const scriptedAiService = (turns: readonly ScriptedTurn[]): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    model: () => scriptedLanguageModelLayer(turns),
  });
