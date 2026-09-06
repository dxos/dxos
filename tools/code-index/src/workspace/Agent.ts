//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Prompt from 'effect/unstable/ai/Prompt';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import * as Docs from './Docs.ts';
import * as Events from './Events.ts';
import * as Fold from './Fold.ts';
import * as Log from './Log.ts';
import * as Sandbox from './Sandbox.ts';

/**
 * The agentic loop. One turn: append the user's message, replay the project's log as the prompt,
 * and let the model run code until it stops calling tools. Every step it takes — its prose, each
 * snippet, each result, everything the snippet displayed — is appended to the log as it happens,
 * so a client that is only tailing the log watches the turn unfold and a reload replays it exactly.
 *
 * There is deliberately one tool. Anything the agent might need is a function inside the sandbox
 * instead, which keeps the tool surface constant as the capabilities grow — a local model handles
 * one well-documented tool far better than eight competing ones.
 */

export class AgentError extends Data.TaggedError('code-index/AgentError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** The one tool. Its description is the sandbox API, so the model can write code from it alone. */
export const ExecTool = Tool.make('exec', {
  description: Docs.toolDescription(),
  parameters: Schema.Struct({
    code: Schema.String.annotate({
      description:
        'TypeScript to run. Top-level `await` is available. Report a value with `return` or ' +
        '`print`; the code is a function body, so a bare trailing expression is not a result.',
    }),
  }),
  success: Schema.Struct({
    ok: Schema.Boolean,
    output: Schema.String,
    displayed: Schema.Number.annotate({ description: 'How many panels this run published to the screen.' }),
  }),
});

export class ExecToolkit extends Toolkit.make(ExecTool) {}

/** How many model round-trips one turn may take before it is cut off. */
export const MAX_STEPS = 12;

export type TurnOptions = {
  readonly projectId: string;
  readonly text: string;
};

export interface Api {
  /** Runs one user turn to completion, appending everything it produces to the project's log. */
  readonly turn: (options: TurnOptions) => Effect.Effect<void, AgentError>;
}

export class Agent extends Context.Service<Agent, Api>()('code-index/Agent') {}

/** The prompt is the log, folded: the transcript lives nowhere else. */
const promptOf = (state: Fold.State): Prompt.Prompt =>
  Prompt.make([
    { role: 'system', content: Docs.systemPrompt() },
    ...state.turns.map((turn) =>
      turn.role === 'user'
        ? ({ role: 'user', content: [{ type: 'text', text: turn.text }] } as const)
        : ({ role: 'assistant', content: [{ type: 'text', text: turn.text }] } as const),
    ),
  ]);

const fail = (message: string) => (cause: unknown) => new AgentError({ message, cause });

const describe = (cause: unknown): string =>
  cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : JSON.stringify(cause);

const make = Effect.gen(function* () {
  const log = yield* Log.Log;
  const sandbox = yield* Sandbox.Sandbox;
  // The model is captured from the layer's own context rather than left in `turn`'s requirements:
  // a turn is driven by an RPC handler that has no idea which provider was selected at startup.
  const models = yield* Effect.context<LanguageModel.LanguageModel>();

  /**
   * The tool handler is where the log is written from: the call is appended before the run and the
   * result after it, so the transcript records the attempt even when the run dies.
   */
  const handlerLayer = (projectId: string) =>
    ExecToolkit.toLayer({
      exec: Effect.fn(function* ({ code }) {
        // The call's sequence number is its identity in the log. The provider's own id never
        // reaches storage, so a replay does not depend on the provider being consistent about it.
        const call = yield* log.append(projectId, new Events.ToolCall({ callId: 'pending', code })).pipe(Effect.orDie);
        const callId = String(call.seq);
        const result = yield* sandbox
          .run({ projectId, code })
          .pipe(Effect.catch((cause) => Effect.succeed({ ok: false, output: cause.message, presented: [] as const })));
        for (const presented of result.presented) {
          yield* log.append(projectId, new Events.Presented({ ...presented, callId })).pipe(Effect.orDie);
        }
        yield* log
          .append(projectId, new Events.ToolResult({ callId, ok: result.ok, output: result.output }))
          .pipe(Effect.orDie);
        return { ok: result.ok, output: result.output, displayed: result.presented.length };
      }),
    });

  const turn: Api['turn'] = ({ projectId, text }) =>
    Effect.gen(function* () {
      yield* log.append(projectId, new Events.UserMessage({ text })).pipe(Effect.mapError(fail('Cannot record turn')));
      const entries = yield* log.read(projectId).pipe(Effect.mapError(fail('Cannot read project log')));
      const handlers = handlerLayer(projectId);

      let prompt = promptOf(Fold.fold(entries));
      // The loop is explicit: `generateText` resolves the calls of one round-trip but does not go
      // back to the model with their results, and going back is what makes this agentic.
      for (let step = 0; step < MAX_STEPS; step++) {
        const response = yield* LanguageModel.generateText({ prompt, toolkit: ExecToolkit }).pipe(
          Effect.provide(handlers),
          Effect.provideContext(models),
          Effect.mapError((cause) => new AgentError({ message: describe(cause), cause })),
        );

        const prose = response.text.trim();
        if (prose.length > 0) {
          yield* log
            .append(projectId, new Events.AssistantMessage({ text: prose }))
            .pipe(Effect.mapError(fail('Cannot record reply')));
        }
        if (response.toolCalls.length === 0) {
          return yield* log
            .append(projectId, new Events.TurnEnded({ steps: step + 1 }))
            .pipe(Effect.asVoid, Effect.mapError(fail('Cannot close turn')));
        }
        // The calls and their results go back verbatim; the tool events are already in the log.
        prompt = Prompt.concat(prompt, Prompt.fromResponseParts(response.content));
      }

      return yield* Effect.fail(
        new AgentError({ message: `Gave up after ${MAX_STEPS} steps without a final answer.` }),
      );
    }).pipe(
      // A failed turn is a recorded fact, not a lost one: the transcript says what went wrong and
      // the next turn starts from a consistent log.
      Effect.tapError((error) =>
        log.append(projectId, new Events.TurnFailed({ message: error.message })).pipe(Effect.ignore),
      ),
    );

  return { turn } satisfies Api;
});

export const layer: Layer.Layer<Agent, never, Log.Log | Sandbox.Sandbox | LanguageModel.LanguageModel> = Layer.effect(
  Agent,
  make,
);
