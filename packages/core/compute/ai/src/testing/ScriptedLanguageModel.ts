//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Prompt from '@effect/ai/Prompt';
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

/**
 * The request a routing predicate inspects: the flattened system prompt, the concatenated text
 * of all non-system messages (in order), and the raw prompt for advanced matching.
 */
export type ScriptedRequest = {
  readonly system: string;
  readonly text: string;
  readonly prompt: Prompt.Prompt;
};

/**
 * A per-session script for cooperating sessions (e.g. a supervisor and its sub-agents) that share
 * one `AiService`. Each model call is routed to the first route whose `match` accepts the request;
 * each route consumes its own turn cursor. An unmatched call fails loudly, like script exhaustion.
 */
export type ScriptedRoute = {
  /** Names the route in unmatched/exhausted errors. */
  readonly name?: string;
  readonly match: (request: ScriptedRequest) => boolean;
  readonly turns: readonly ScriptedTurn[];
};

/** A plain sequential script, or a routed script for cooperating sessions. */
export type Script = readonly ScriptedTurn[] | readonly ScriptedRoute[];

/** Route predicate matching a substring anywhere in the system prompt or message text. */
export const promptIncludes =
  (needle: string) =>
  (request: ScriptedRequest): boolean =>
    request.system.includes(needle) || request.text.includes(needle);

/** Flattens a prompt into the text a routing predicate matches against. */
const flattenRequest = (prompt: Prompt.Prompt): ScriptedRequest => {
  let system = '';
  let text = '';
  for (const message of prompt.content) {
    if (message.role === 'system') {
      system += message.content;
    } else {
      for (const part of message.content) {
        if (part.type === 'text') {
          text += part.text;
        }
      }
    }
  }
  return { system, text, prompt };
};

// A route script is distinguished structurally: every route has a `match` predicate, turns never do.
const isRouteScript = (script: Script): script is readonly ScriptedRoute[] =>
  script.length > 0 && 'match' in script[0];

const toRoutes = (script: Script): readonly ScriptedRoute[] =>
  isRouteScript(script) ? script : [{ match: () => true, turns: script }];

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

const exhausted = (index: number, length: number, route: string): AiError.AiError =>
  new AiError.UnknownError({
    module: 'ScriptedLanguageModel',
    method: 'generateText',
    description: `Scripted model exhausted: route ${route} requested turn ${index} but the script has only ${length}.`,
  });

const snippet = (raw: string): string => (raw.length > 160 ? `${raw.slice(0, 160)}…` : raw);

const unmatched = (request: ScriptedRequest): AiError.AiError =>
  new AiError.UnknownError({
    module: 'ScriptedLanguageModel',
    method: 'generateText',
    description: `No scripted route matched the request. system=${JSON.stringify(snippet(request.system))} text=${JSON.stringify(snippet(request.text))}`,
  });

/**
 * Constructs a {@link LanguageModel.Service} that replays a script: a plain turn list is consumed
 * sequentially; a routed script dispatches each call to the first matching {@link ScriptedRoute},
 * each with its own cursor. Prefer the layer helpers ({@link scriptedLanguageModelLayer} /
 * {@link scriptedAiService}) at call sites.
 */
export const makeScriptedLanguageModel = (script: Script): Effect.Effect<LanguageModel.Service> =>
  Effect.gen(function* () {
    const routes = toRoutes(script);
    // Per-route script position. The Request semaphore serializes turns within a session, and
    // cooperating sessions interleave deterministically in tests, so plain monotonic cursors are
    // race-free; Refs keep them explicit and inspectable rather than closure variables.
    const cursors = yield* Effect.forEach(routes, () => Ref.make(0));
    // Message/tool-call ids must stay unique across routes, so they derive from the global call
    // order, not the per-route cursor.
    const calls = yield* Ref.make(0);

    const nextTurn = (prompt: Prompt.Prompt) =>
      Effect.gen(function* () {
        const request = flattenRequest(prompt);
        const routeIndex = routes.findIndex((route) => route.match(request));
        if (routeIndex < 0) {
          return yield* Effect.fail(unmatched(request));
        }
        const route = routes[routeIndex];
        const turnIndex = yield* Ref.getAndUpdate(cursors[routeIndex], (value) => value + 1);
        const turn = route.turns[turnIndex];
        if (turn === undefined) {
          return yield* Effect.fail(exhausted(turnIndex, route.turns.length, route.name ?? `#${routeIndex}`));
        }
        const index = yield* Ref.getAndUpdate(calls, (value) => value + 1);
        return { index, turn };
      });

    return yield* LanguageModel.make({
      generateText: (options) =>
        Effect.gen(function* () {
          const { index, turn } = yield* nextTurn(options.prompt);
          if (isFailure(turn)) {
            return yield* Effect.fail(turn.fail);
          }
          return encodeTurn(turn.parts, index, turn.finishReason ?? finishReasonFor(turn.parts));
        }),
      streamText: (options) =>
        Stream.unwrap(
          Effect.gen(function* () {
            const { index, turn } = yield* nextTurn(options.prompt);
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
export const scriptedLanguageModelLayer = (script: Script): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(LanguageModel.LanguageModel, makeScriptedLanguageModel(script));

/**
 * An {@link AiService.AiService} layer whose model, regardless of the requested name, is the
 * scripted model. Pass to `AssistantTestLayer({ aiService })` to drive the agent loop deterministically.
 * With a routed script, every session resolved through the service shares the routes (and their
 * cursors) — the seam that lets one script drive a supervisor and its sub-agents.
 */
export const scriptedAiService = (script: Script): Layer.Layer<AiService.AiService> => {
  // A single shared model memo: sessions in separate processes each call `model()`, and separate
  // model instances would each start their script from turn zero.
  const model = Effect.runSync(Effect.cached(makeScriptedLanguageModel(script)));
  return Layer.succeed(AiService.AiService, {
    model: () => Layer.effect(LanguageModel.LanguageModel, model),
  });
};
