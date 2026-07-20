//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Prompt from '@effect/ai/Prompt';
import type * as Response from '@effect/ai/Response';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import * as AiService from '../../AiService';
import { generateParts, streamParts, type SynthesizedToolCall, type SynthesizedTurn } from './parts';

/**
 * A statically-scripted mock {@link AiService.AiService}.
 *
 * Where {@link MemoizedLanguageModel} records real conversations to disk and replays them by matching
 * the entire serialized prompt, a scripted model has the test author specify the model's turn-by-turn
 * behaviour inline in TypeScript. Nothing serializes the prompt, so tool-description / input-schema /
 * system-prompt churn no longer invalidates the test — it evolves with the code.
 *
 * The real tools still execute; assertions stay on their side-effects (e.g. ECHO DB state).
 *
 * Requests are matched **sequentially within a bucket keyed by `(model, stream)`**. This alone
 * separates the streaming main loop from non-streaming side-calls (summarizer, plan-reminder) and
 * from a different-model side-call — no full-prompt matching. See {@link Script} for scripting
 * multiple buckets.
 */

/** Context passed to a turn's {@link ScriptedTurn.when} guard. Inspect only cheap, stable signals. */
export interface TurnContext {
  /** Model DXN as a string, e.g. `dxn:com.anthropic.model.claude-opus-4-8.default`. */
  readonly model: string;
  /** Whether this is a streaming (`streamText`) request. */
  readonly stream: boolean;
  /** Names of the tools available on this request, as the model sees them. */
  readonly toolNames: readonly string[];
  /** Best-effort text of the last prompt message. */
  readonly lastMessageText?: string;
  /** The full prompt (escape hatch for guards needing more than the fields above). */
  readonly prompt: Prompt.Prompt;
}

/**
 * A tool call the scripted model emits. `input` is the JSON value the model would produce, or a
 * function of the turn context — use the function form when the input depends on a value only known
 * at run time (e.g. an object id created by the test or returned by a prior tool call, which appears
 * in the prompt history).
 */
export interface ScriptedToolCall {
  readonly name: string;
  readonly input: unknown | ((ctx: TurnContext) => unknown);
}

/** A single scripted model turn: assistant text and/or tool calls. */
export interface ScriptedTurn {
  /** Assistant text emitted this turn. */
  readonly text?: string;
  /** Tool calls emitted this turn (streaming path only). */
  readonly tools?: readonly ScriptedToolCall[];
  /**
   * Optional assertion evaluated when this turn is consumed. When present and it returns false, the
   * request fails with a diagnostic — an escape hatch to pin a turn to an expected agent state.
   */
  readonly when?: (ctx: TurnContext) => boolean;
  /** Overrides the finish reason (defaults to `tool-calls` when tools are present, else `stop`). */
  readonly finishReason?: Response.FinishReason;
}

/** Per-model turn lists, split by request kind. */
export interface ModelScript {
  readonly stream?: readonly ScriptedTurn[];
  readonly generate?: readonly ScriptedTurn[];
}

/**
 * A full scripting spec.
 * - `turns` are consumed by streaming requests on any model not matched by a `models` entry (the
 *   common single-model case).
 * - `models` scripts additional buckets keyed by a case-insensitive substring of the model DXN (e.g.
 *   `'sonnet'` matches the plan-reminder side-call); use `generate`/`stream` to target the request kind.
 */
export interface ScriptSpec {
  readonly turns?: readonly ScriptedTurn[];
  readonly models?: Readonly<Record<string, ModelScript>>;
}

/** A scripting spec, or the shorthand array form (equivalent to `{ turns }`). */
export type Script = readonly ScriptedTurn[] | ScriptSpec;

//
// Builders.
//

/** Builds a text-only turn. */
export const text = (content: string, options?: Omit<ScriptedTurn, 'text' | 'tools'>): ScriptedTurn => ({
  ...options,
  text: content,
});

/** Builds a turn with a single tool call, referenced by its model-facing name. */
export const toolCall = (name: string, input: unknown, options?: Omit<ScriptedTurn, 'tools'>): ScriptedTurn => ({
  ...options,
  tools: [{ name, input }],
});

/** Identity helper for authoring a turn with both text and/or multiple tool calls. */
export const turn = (spec: ScriptedTurn): ScriptedTurn => spec;

//
// Service.
//

const normalizeSpec = (script: Script): ScriptSpec =>
  Array.isArray(script) ? { turns: script } : (script as ScriptSpec);

/** Per-build mutable state, allocated fresh each time the layer is constructed (i.e. per test). */
interface ScriptState {
  readonly spec: ScriptSpec;
  /** Cursor per `${model}|${stream}` bucket. */
  readonly cursors: Map<string, number>;
  toolCallCounter: number;
  responseCounter: number;
}

const resolveTurns = (state: ScriptState, model: string, stream: boolean): readonly ScriptedTurn[] | undefined => {
  const modelScripts = state.spec.models;
  if (modelScripts) {
    for (const key of Object.keys(modelScripts)) {
      if (model.toLowerCase().includes(key.toLowerCase())) {
        return stream ? modelScripts[key].stream : modelScripts[key].generate;
      }
    }
  }
  return stream ? state.spec.turns : undefined;
};

const lastMessageText = (prompt: Prompt.Prompt): string | undefined => {
  const messages = prompt.content;
  const last = messages[messages.length - 1];
  if (last === undefined) {
    return undefined;
  }
  const content: unknown = (last as { content: unknown }).content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        part && typeof part === 'object' && 'text' in part ? String((part as { text: unknown }).text) : '',
      )
      .join('');
  }
  return undefined;
};

const truncate = (value: string, max = 200): string => (value.length > max ? `${value.slice(0, max)}…` : value);

/**
 * Selects the next scripted turn for a request and advances its bucket cursor, or fails with a
 * diagnostic when the script is exhausted, no bucket is scripted, or a turn guard rejects.
 */
const nextTurn = (
  state: ScriptState,
  params: LanguageModel.ProviderOptions,
  model: string,
  stream: boolean,
): Effect.Effect<SynthesizedTurn> =>
  Effect.gen(function* () {
    const toolNames = params.tools.map((tool) => tool.name);
    const ctx: TurnContext = {
      model,
      stream,
      toolNames,
      lastMessageText: lastMessageText(params.prompt),
      prompt: params.prompt,
    };
    const fail = (reason: string) =>
      Effect.dieMessage(
        [
          `Scripted AI model: ${reason}`,
          `  model: ${model}`,
          `  kind: ${stream ? 'streamText' : 'generateText'}`,
          `  available tools: [${toolNames.join(', ')}]`,
          ctx.lastMessageText ? `  last message: ${truncate(ctx.lastMessageText)}` : undefined,
        ]
          .filter(Boolean)
          .join('\n'),
      );

    const turns = resolveTurns(state, model, stream);
    if (turns === undefined) {
      return yield* fail(`no ${stream ? 'streaming' : 'non-streaming'} turns scripted for this model`);
    }

    const bucket = `${model}|${stream}`;
    const cursor = state.cursors.get(bucket) ?? 0;
    if (cursor >= turns.length) {
      return yield* fail(`script exhausted (all ${turns.length} scripted turn(s) already consumed)`);
    }

    const scripted = turns[cursor];
    if (scripted.when && !scripted.when(ctx)) {
      return yield* fail(`turn ${cursor} guard rejected the request`);
    }
    state.cursors.set(bucket, cursor + 1);

    const tools: SynthesizedToolCall[] = (scripted.tools ?? []).map((tc) => {
      const input = typeof tc.input === 'function' ? (tc.input as (ctx: TurnContext) => unknown)(ctx) : tc.input;
      return {
        id: `scripted-tool-call-${state.toolCallCounter++}`,
        name: tc.name,
        inputJson: JSON.stringify(input ?? {}),
      };
    });
    return {
      text: scripted.text,
      tools,
      reason: scripted.finishReason ?? (tools.length > 0 ? 'tool-calls' : 'stop'),
    };
  });

const makeLanguageModel = (state: ScriptState, model: string): Effect.Effect<LanguageModel.Service> =>
  LanguageModel.make({
    generateText: Effect.fn('ScriptedLanguageModel.generateText')(function* (params) {
      const selected = yield* nextTurn(state, params, model, false);
      return generateParts(selected, {
        responseId: `msg_scripted_${state.responseCounter++}`,
        modelId: model,
      });
    }),
    streamText: (params) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const selected = yield* nextTurn(state, params, model, true);
          const parts = streamParts(selected, {
            responseId: `msg_scripted_${state.responseCounter++}`,
            modelId: model,
          });
          return Stream.fromIterable(parts);
        }),
      ),
  });

const makeService = (script: Script): AiService.Service => {
  const state: ScriptState = {
    spec: normalizeSpec(script),
    cursors: new Map(),
    toolCallCounter: 0,
    responseCounter: 0,
  };
  return {
    metadata: { name: 'scripted' },
    // `model` is a `DXN` — a branded string (e.g. `dxn:com.anthropic.model.claude-opus-4-8.default`).
    model: (model) => Layer.effect(LanguageModel.LanguageModel, makeLanguageModel(state, model)),
  };
};

/**
 * Builds a scripted {@link AiService.AiService} layer for use with `AssistantTestLayer`'s `aiService`
 * option. State (cursors, id counters) is allocated per layer build, so a module-level `TestLayer`
 * reused across `it.effect` cases starts each case with a fresh cursor.
 *
 * @example
 * ```ts
 * const TestLayer = AssistantTestLayer({
 *   aiService: ScriptedAiService.layer([
 *     ScriptedAiService.toolCall('object-create', { typename: 'example.com/Organization', props: { name: 'Cyberdyne' } }),
 *     ScriptedAiService.text('Created the organization.'),
 *   ]),
 *   operationHandlers: DatabaseHandlers,
 *   skills: [DatabaseSkill.make()],
 * });
 * ```
 */
export const layer = (script: Script): Layer.Layer<AiService.AiService> =>
  Layer.sync(AiService.AiService, () => makeService(script));
