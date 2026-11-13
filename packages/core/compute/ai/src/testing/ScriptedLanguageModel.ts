//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AiError from 'effect/ai/AiError';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Response from 'effect/ai/Response';
import * as Telemetry from 'effect/ai/Telemetry';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { DXN } from '@dxos/keys';

import * as AiModelResolver from '../AiModelResolver.ts';
import * as AiService from '../AiService.ts';
import * as AiTelemetry from '../AiTelemetry.ts';
import { AiModelNotAvailableError } from '../errors.ts';
import * as Provider from '../Provider.ts';

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
const ZERO_USAGE = { inputTokens: { total: 0 }, outputTokens: { total: 0 } } as const;

/**
 * A single fragment emitted within a scripted turn. Build with {@link text} / {@link reasoning} /
 * {@link toolCall}.
 */
export type ScriptedPart =
  | { readonly _tag: 'text'; readonly text: Deferred<string> }
  | { readonly _tag: 'reasoning'; readonly text: Deferred<string> }
  | { readonly _tag: 'toolCall'; readonly name: string; readonly input: unknown; readonly id?: string };

/**
 * A value worked out when the turn is emitted, from the request it answers: a script is fixed before the session
 * starts, so a value naming something the session creates (a ref, an id a tool returned) only exists by then.
 */
export type Deferred<T> = T | ((request: ScriptedRequest) => T);

/** A part with every deferred value worked out, as the encoders emit it. */
type ResolvedPart =
  | { readonly _tag: 'text'; readonly text: string }
  | { readonly _tag: 'reasoning'; readonly text: string }
  | { readonly _tag: 'toolCall'; readonly name: string; readonly input: unknown; readonly id?: string };

/**
 * One model call's worth of output: either a list of parts to emit, or a failure to simulate a
 * provider error (exercises the loop's error propagation).
 */
export type ScriptedTurn =
  | {
      readonly parts: readonly ScriptedPart[];
      readonly finishReason?: Response.FinishReason;
      /**
       * Emit every `tool-params-end` at the end of the turn instead of after the call it closes,
       * so a second call opens while the first is still open. The OpenAI dialect (DeepSeek, LM
       * Studio) carries no per-call terminator on the wire — an adapter has to synthesize one, and
       * one that synthesizes them all at `finish_reason` produces exactly this. Scripts it so a
       * consumer tracking a single open tool call is tested against the shape rather than only
       * against well-nested Anthropic output.
       */
      readonly deferToolEnds?: boolean;
      /**
       * Close each call with a complete `tool-call` part after its params, as the Anthropic adapter does on
       * `content_block_stop`. `LanguageModel` decodes that part against the toolkit, so a call naming a tool the
       * toolkit lacks, or with parameters it rejects, fails the whole batch of parts it arrived in.
       */
      readonly emitToolCalls?: boolean;
      /** Held before the turn's first part, so a UI driven by the script sees a turn in flight. */
      readonly delay?: Duration.Input;
      /** Held until it resolves, before the turn's first part, so a test can observe the state the turn changes. */
      readonly gate?: () => Promise<void>;
    }
  | { readonly fail: AiError.AiError };

/** Scripts a text fragment. */
export const text = (content: Deferred<string>): ScriptedPart => ({ _tag: 'text', text: content });

/** Scripts a reasoning (thinking) fragment, emitted as the provider-native reasoning parts. */
export const reasoning = (content: Deferred<string>): ScriptedPart => ({ _tag: 'reasoning', text: content });

/**
 * Scripts a tool call. `name` must match a tool registered on the toolkit under test; `input` is
 * serialized as the tool arguments. Supply `id` to assert against a specific tool-call id.
 *
 * `input` may be a function, called with the request when the turn is emitted (see {@link Deferred}).
 */
export const toolCall = (name: string, input: unknown, id?: string): ScriptedPart => ({
  _tag: 'toolCall',
  name,
  input,
  id,
});

const isFailure = (turn: ScriptedTurn): turn is { readonly fail: AiError.AiError } => 'fail' in turn;

const resolve = <T>(value: Deferred<T>, request: ScriptedRequest): T =>
  typeof value === 'function' ? (value as (request: ScriptedRequest) => T)(request) : value;

/** Tool arguments are JSON, so a function can only be a deferred input. */
const resolvePart = (part: ScriptedPart, request: ScriptedRequest): ResolvedPart =>
  part._tag === 'toolCall'
    ? { ...part, input: typeof part.input === 'function' ? part.input(request) : part.input }
    : part._tag === 'text'
      ? { _tag: 'text', text: resolve(part.text, request) }
      : { _tag: 'reasoning', text: resolve(part.text, request) };

/**
 * The request a routing predicate inspects: the flattened system prompt, the concatenated text
 * of all non-system messages (in order), and the raw prompt for advanced matching.
 */
export type ScriptedRequest = {
  readonly system: string;
  readonly text: string;
  readonly prompt: Prompt.Prompt;
  /** Names of the tools the caller offered on this call. */
  readonly tools: readonly string[];
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

/**
 * Computes each turn from the request rather than reading it from a fixed list, for a script that
 * must serve any number of conversations (a long-lived app rather than one test). `index` is the
 * global call count.
 */
export type ScriptedTurnGenerator = (request: ScriptedRequest, index: number) => ScriptedTurn;

/** A plain sequential script, a routed script for cooperating sessions, or a turn generator. */
export type Script = readonly ScriptedTurn[] | readonly ScriptedRoute[] | ScriptedTurnGenerator;

/** Route predicate matching a substring anywhere in the system prompt or message text. */
export const promptIncludes =
  (needle: string) =>
  (request: ScriptedRequest): boolean =>
    request.system.includes(needle) || request.text.includes(needle);

/** Flattens a prompt into the text a routing predicate matches against. */
const flattenRequest = ({ prompt, tools }: LanguageModel.ProviderOptions): ScriptedRequest => {
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
  return { system, text, prompt, tools: tools.map((tool) => tool.name) };
};

// A route script is distinguished structurally: every route has a `match` predicate, turns never do.
const isRouteScript = (
  script: readonly ScriptedTurn[] | readonly ScriptedRoute[],
): script is readonly ScriptedRoute[] => script.length > 0 && 'match' in script[0];

const toRoutes = (script: readonly ScriptedTurn[] | readonly ScriptedRoute[]): readonly ScriptedRoute[] =>
  isRouteScript(script) ? script : [{ match: () => true, turns: script }];

/** A turn with no explicit reason finishes on `tool-calls` when it emits a tool call, else `stop`. */
const finishReasonFor = (parts: readonly { readonly _tag: string }[]): Response.FinishReason =>
  parts.some((part) => part._tag === 'toolCall') ? 'tool-calls' : 'stop';

const toolCallId = (part: Extract<ResolvedPart, { _tag: 'toolCall' }>, turnIndex: number, partIndex: number): string =>
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
  parts: readonly ResolvedPart[],
  turnIndex: number,
  reason: Response.FinishReason,
  { deferToolEnds = false, emitToolCalls = false }: { deferToolEnds?: boolean; emitToolCalls?: boolean } = {},
): Response.StreamPartEncoded[] => {
  const out: Response.StreamPartEncoded[] = [responseMetadata(turnIndex)];
  const deferred: Response.StreamPartEncoded[] = [];
  parts.forEach((part, partIndex) => {
    if (part._tag === 'text') {
      const id = `text_${turnIndex}_${partIndex}`;
      out.push({ type: 'text-start', id });
      out.push({ type: 'text-delta', id, delta: part.text });
      out.push({ type: 'text-end', id });
    } else if (part._tag === 'reasoning') {
      const id = `reasoning_${turnIndex}_${partIndex}`;
      out.push({ type: 'reasoning-start', id });
      out.push({ type: 'reasoning-delta', id, delta: part.text });
      out.push({ type: 'reasoning-end', id });
    } else {
      const id = toolCallId(part, turnIndex, partIndex);
      out.push({ type: 'tool-params-start', id, name: part.name });
      out.push({ type: 'tool-params-delta', id, delta: JSON.stringify(part.input) });
      (deferToolEnds ? deferred : out).push({ type: 'tool-params-end', id });
      if (emitToolCalls) {
        (deferToolEnds ? deferred : out).push({ type: 'tool-call', id, name: part.name, params: part.input });
      }
    }
  });
  out.push(...deferred);
  out.push(finishPart(reason));
  return out;
};

const annotate = (span: LanguageModel.ProviderOptions['span']): void =>
  Telemetry.addGenAIAnnotations(span, {
    provider: { name: 'scripted' },
    operation: { name: 'chat' },
    request: { model: 'scripted' },
  });

/** Encodes a turn as the aggregated parts a non-streaming `generateText` would return. */
const encodeTurn = (
  parts: readonly ResolvedPart[],
  turnIndex: number,
  reason: Response.FinishReason,
): Response.PartEncoded[] => {
  const out: Response.PartEncoded[] = [responseMetadata(turnIndex)];
  parts.forEach((part, partIndex) => {
    if (part._tag === 'text') {
      out.push({ type: 'text', text: part.text });
    } else if (part._tag === 'reasoning') {
      out.push({ type: 'reasoning', text: part.text });
    } else {
      out.push({
        type: 'tool-call',
        id: toolCallId(part, turnIndex, partIndex),
        name: part.name,
        params: part.input,
      });
    }
  });
  out.push(finishPart(reason));
  return out;
};

const exhausted = (index: number, length: number, route: string): AiError.AiError =>
  new AiError.AiError({
    module: 'ScriptedLanguageModel',
    method: 'generateText',
    reason: new AiError.UnknownError({
      description: `Scripted model exhausted: route ${route} requested turn ${index} but the script has only ${length}.`,
    }),
  });

const snippet = (raw: string): string => (raw.length > 160 ? `${raw.slice(0, 160)}…` : raw);

const unmatched = (request: ScriptedRequest): AiError.AiError =>
  new AiError.AiError({
    module: 'ScriptedLanguageModel',
    method: 'generateText',
    reason: new AiError.UnknownError({
      description: `No scripted route matched the request. system=${JSON.stringify(snippet(request.system))} text=${JSON.stringify(snippet(request.text))}`,
    }),
  });

/**
 * Constructs a {@link LanguageModel.LanguageModel} that replays a script: a plain turn list is consumed
 * sequentially; a routed script dispatches each call to the first matching {@link ScriptedRoute},
 * each with its own cursor. Prefer the layer helpers ({@link layer} /
 * {@link scriptedAiService}) at call sites.
 */
export const makeScriptedLanguageModel = (script: Script): Effect.Effect<LanguageModel.LanguageModel> =>
  Effect.gen(function* () {
    const generator = typeof script === 'function' ? script : undefined;
    const routes = typeof script === 'function' ? [] : toRoutes(script);
    // Per-route script position. The Request semaphore serializes turns within a session, and
    // cooperating sessions interleave deterministically in tests, so plain monotonic cursors are
    // race-free; Refs keep them explicit and inspectable rather than closure variables.
    const cursors = yield* Effect.forEach(routes, () => Ref.make(0));
    // Message/tool-call ids must stay unique across routes, so they derive from the global call
    // order, not the per-route cursor.
    const calls = yield* Ref.make(0);

    const nextTurn = Effect.fnUntraced(function* (options: LanguageModel.ProviderOptions) {
      const request = flattenRequest(options);
      if (generator) {
        const index = yield* Ref.getAndUpdate(calls, (value) => value + 1);
        return { index, request, turn: generator(request, index) };
      }
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
      return { index, request, turn };
    });

    return yield* LanguageModel.make({
      generateText: (options) =>
        Effect.gen(function* () {
          annotate(options.span);
          const { index, request, turn } = yield* nextTurn(options);
          if (isFailure(turn)) {
            return yield* Effect.fail(turn.fail);
          }
          if (turn.delay !== undefined) {
            yield* Effect.sleep(turn.delay);
          }
          if (turn.gate) {
            yield* Effect.promise(turn.gate);
          }
          const parts = turn.parts.map((part) => resolvePart(part, request));
          return encodeTurn(parts, index, turn.finishReason ?? finishReasonFor(parts));
        }),
      streamText: (options) =>
        Stream.unwrap(
          Effect.gen(function* () {
            annotate(options.span);
            const { index, request, turn } = yield* nextTurn(options);
            if (isFailure(turn)) {
              return Stream.fail(turn.fail);
            }
            if (turn.delay !== undefined) {
              yield* Effect.sleep(turn.delay);
            }
            if (turn.gate) {
              yield* Effect.promise(turn.gate);
            }
            return Stream.fromIterable(
              encodeStreamTurn(
                turn.parts.map((part) => resolvePart(part, request)),
                index,
                turn.finishReason ?? finishReasonFor(turn.parts),
                {
                  deferToolEnds: turn.deferToolEnds,
                  emitToolCalls: turn.emitToolCalls,
                },
              ),
            );
          }),
        ),
    });
  });

/**
 * Internal encoders exposed for unit-testing the wire format. Not part of the public API.
 */
const EMPTY_REQUEST: ScriptedRequest = { system: '', text: '', prompt: Prompt.empty, tools: [] };

export const __testing = {
  encodeStreamTurn: (parts: readonly ScriptedPart[], ...rest: Tail<Parameters<typeof encodeStreamTurn>>) =>
    encodeStreamTurn(
      parts.map((part) => resolvePart(part, EMPTY_REQUEST)),
      ...rest,
    ),
  encodeTurn: (parts: readonly ScriptedPart[], ...rest: Tail<Parameters<typeof encodeTurn>>) =>
    encodeTurn(
      parts.map((part) => resolvePart(part, EMPTY_REQUEST)),
      ...rest,
    ),
  finishReasonFor,
};

type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest] ? Rest : never;

/** A {@link LanguageModel.LanguageModel} layer backed by the scripted model. */
export const layer = (script: Script): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(LanguageModel.LanguageModel, Effect.map(makeScriptedLanguageModel(script), AiTelemetry.markRequests));

// A single shared model memo per script: sessions in separate processes each call `languageModel()`,
// and separate model instances would each start their script from turn zero.
const sharedModel = (script: Script): AiService.LanguageModelResolver => {
  const model = Effect.runSync(Effect.cached(Effect.map(makeScriptedLanguageModel(script), AiTelemetry.markRequests)));
  return () => Layer.effect(LanguageModel.LanguageModel, model);
};

/**
 * An {@link AiService.AiService} layer whose model, regardless of the requested name, is the
 * scripted model. Pass to `AssistantTestLayer({ aiService })` to drive the agent loop deterministically.
 * With a routed script, every session resolved through the service shares the routes (and their
 * cursors) — the seam that lets one script drive a supervisor and its sub-agents.
 */
export const scriptedAiService = (script: Script): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, AiService.make({ languageModel: sharedModel(script) }));

/**
 * Middleware form of {@link scriptedAiService} for `AssistantPlugin({ aiServiceMiddleware })`:
 * replaces the language models the plugin would resolve with the scripted model, so full plugin-stack
 * tests and storybooks run offline; decision models still resolve upstream. Shares one script cursor
 * across `languageModel()` calls, like {@link scriptedAiService}.
 */
export const scriptedAiServiceMiddleware = (script: Script): ((upstream: AiService.Service) => AiService.Service) => {
  const languageModel = sharedModel(script);
  return (upstream) => ({ ...upstream, languageModel });
};

/** The provider scripted models are offered under in a model picker; {@link resolver} serves them whatever is asked. */
export const provider = Provider.make('org.dxos.provider.scripted', { label: 'Scripted' });

/** The model a script is played as when it is registered with {@link resolver}; `name` is camelCase, as a DXN needs. */
export const modelId = (name: string): DXN.DXN => DXN.make(`org.dxos.model.scripted.${name}`);

/**
 * A model resolver that serves each script as a model of its own ({@link modelId}), whatever provider is asked; every
 * other model goes to the resolvers below it. Contribute it as `AppCapabilities.AiModelResolver` and pick the model on
 * a chat to play the script there, beside the real models.
 */
export const resolver = (scripts: Readonly<Record<string, Script>>): Layer.Layer<AiModelResolver.AiModelResolver> =>
  AiModelResolver.resolver(
    { name: 'Scripted' },
    Effect.sync(() => {
      const models = new Map(Object.entries(scripts).map(([name, script]) => [modelId(name), sharedModel(script)]));
      return (model: DXN.DXN, options?: AiService.ResolveOptions) =>
        models.get(model)?.(model, options) ?? Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model)));
    }),
  );
