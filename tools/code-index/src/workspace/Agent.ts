//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as AiError from 'effect/ai/AiError';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import type * as Response from 'effect/ai/Response';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import * as Docs from './Docs.ts';
import * as Events from './Events.ts';
import * as Fold from './Fold.ts';
import * as Log from './Log.ts';
import * as Models from './Models.ts';
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

/** How many model round-trips one turn may take before it is cut off; a large diagram takes several rounds of queries. */
export const MAX_STEPS = 20;

/**
 * How many steps from the end the model is warned. An agent that explores until it is cut off
 * leaves the user with nothing, and it cannot ration a budget it was never told about — the first
 * turn this loop ever ran spent all twelve steps discovering predicate names and displayed nothing.
 */
export const WARN_AT_REMAINING = 3;

/** How many unusable replies in a row the model gets before the turn fails. */
export const MAX_MALFORMED = 3;

/** Long enough to identify the fault; the raw arguments that follow are the model's own code. */
const SUMMARY_LENGTH = 240;

/**
 * Describes a reply whose tool call could not be used — arguments that are not JSON, a tool that
 * does not exist, parameters that do not fit — or returns `undefined` for any other failure. Local
 * models produce these often enough that failing the turn on one leaves them unusable, and the
 * model can correct the call once told what was wrong.
 */
export const malformedToolCall = (cause: unknown): string | undefined => {
  if (!AiError.isAiError(cause)) {
    return undefined;
  }
  const reason = cause.reason;
  switch (reason._tag) {
    case 'ToolNotFoundError':
      return `The model called a tool named \`${reason.toolName}\`, which does not exist.`;
    case 'ToolParameterValidationError':
      return `The model's \`${reason.toolName}\` call had invalid parameters: ${summarize(reason.description)}`;
    case 'InvalidOutputError':
      // A response that fails to decode against the toolkit names every union member it missed,
      // which tells the reader nothing; the one thing it can mean here is a call that is not `exec`.
      return reason.description.startsWith('Expected {')
        ? "The model's reply held a tool call that is not a valid `exec` call (another tool's name, or the wrong parameters)."
        : `The model's reply could not be read: ${summarize(reason.description)}`;
    default:
      return undefined;
  }
};

const summarize = (text: string): string => {
  const line = text.split('\n')[0];
  return line.length > SUMMARY_LENGTH ? `${line.slice(0, SUMMARY_LENGTH)}…` : line;
};

/** What the model is told after an unusable reply, so the retry is a correction and not a reroll. */
const correction = (problem: string): string =>
  `[Your last reply could not be used] ${problem} The only tool is \`exec\`, and its arguments must be ` +
  'a JSON object with a single string field `code` — for example {"code": "return 1;"}. Strings in ' +
  'JSON use double quotes with escaped newlines; a JavaScript object literal or a template string is ' +
  'not JSON. Try again.';

export type TurnOptions = {
  readonly projectId: string;
  readonly text: string;
  /** Replaces the chat system prompt, for a turn with a dedicated job (e.g. the design explorer). */
  readonly system?: string;
  /** The id the turn's events carry; the sender passes its own so it can recognise the echo. */
  readonly turnId?: string;
};

export interface Api {
  /** Runs one user turn to completion, appending everything it produces to the project's log. */
  readonly turn: (options: TurnOptions) => Effect.Effect<void, AgentError>;
}

export class Agent extends Context.Service<Agent, Api>()('code-index/Agent') {}

/** The prompt is the log, folded: the transcript lives nowhere else. */
const promptOf = (state: Fold.State, system: string = Docs.systemPrompt()): Prompt.Prompt =>
  Prompt.make([
    { role: 'system', content: system },
    ...state.turns.map((turn) =>
      turn.role === 'user'
        ? ({ role: 'user', content: [{ type: 'text', text: turn.text }] } as const)
        : ({ role: 'assistant', content: [{ type: 'text', text: turn.text }] } as const),
    ),
  ]);

const fail = (message: string) => (cause: unknown) => new AgentError({ message, cause });

const describe = (cause: unknown): string =>
  Models.explainFailure(cause) ??
  (cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : JSON.stringify(cause));

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
  const handlerLayer = (projectId: string, turnId: string) =>
    ExecToolkit.toLayer({
      exec: Effect.fn(function* ({ code }) {
        // The id is minted here, before the call is appended, because it has to travel *on* the
        // `ToolCall` as well as on everything that answers it: `Fold.apply` joins a result to its
        // call by this field, so a placeholder on one side leaves a replayed trace showing the code
        // with no output forever. It is ours rather than the provider's so a replay does not depend
        // on the provider being consistent about its own ids.
        const callId = Events.newCallId();
        yield* log.append(projectId, new Events.ToolCall({ callId, code, turnId })).pipe(Effect.orDie);
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

  /**
   * One model round-trip, streamed. Each text delta is appended as it arrives so a tailing client
   * renders the answer while it is generated; the deltas are settled into one `AssistantMessage` at
   * the end of each text block, which is also where a tool call starts — so prose and the runs it
   * introduces land in the log in the order the model produced them. Returns every part, which is
   * what the next round-trip's prompt is built from.
   */
  const streamStep = ({ projectId, turnId, prompt }: { projectId: string; turnId: string; prompt: Prompt.Prompt }) =>
    Effect.gen(function* () {
      const parts: Response.StreamPart<typeof ExecToolkit.tools, 'opaque'>[] = [];
      let open: { messageId: string; text: string } | undefined;

      const settle = Effect.suspend(() => {
        const message = open;
        open = undefined;
        if (message === undefined) {
          return Effect.void;
        }
        const { messageId } = message;
        return log
          .append(projectId, new Events.AssistantMessage({ text: message.text.trim(), messageId, turnId }))
          .pipe(Effect.andThen(log.compact(projectId, messageId)), Effect.mapError(fail('Cannot record reply')));
      });

      yield* LanguageModel.streamText({ prompt, toolkit: ExecToolkit }).pipe(
        Stream.runForEach((part) =>
          Effect.gen(function* () {
            parts.push(part);
            switch (part.type) {
              case 'text-delta': {
                // Leading whitespace opens no message: a block that is only whitespace has nothing to show.
                if (open === undefined && part.delta.trim().length === 0) {
                  return;
                }
                open ??= { messageId: Events.newMessageId(), text: '' };
                open.text += part.delta;
                yield* log
                  .append(
                    projectId,
                    new Events.AssistantDelta({ messageId: open.messageId, delta: part.delta, turnId }),
                  )
                  .pipe(Effect.mapError(fail('Cannot record reply')));
                return;
              }
              case 'text-end':
              case 'tool-params-start':
              case 'tool-call':
                return yield* settle;
            }
          }),
        ),
        // A step that fails mid-message still settles what streamed, so the partial prose stays one row.
        Effect.ensuring(settle.pipe(Effect.ignore)),
      );
      return parts;
    });

  const turn: Api['turn'] = ({ projectId, text, system, turnId = Events.newTurnId() }) =>
    Effect.gen(function* () {
      yield* log
        .append(projectId, new Events.UserMessage({ text, turnId }))
        .pipe(Effect.mapError(fail('Cannot record turn')));
      const entries = yield* log.read(projectId).pipe(Effect.mapError(fail('Cannot read project log')));
      const handlers = handlerLayer(projectId, turnId);

      let prompt = promptOf(Fold.fold(entries), system);
      let malformed = 0;
      // The loop is explicit: `streamText` resolves the calls of one round-trip but does not go
      // back to the model with their results, and going back is what makes this agentic.
      for (let step = 0; step < MAX_STEPS; step++) {
        const attempt = yield* streamStep({ projectId, turnId, prompt }).pipe(
          Effect.provide(handlers),
          Effect.provideContext(models),
          Effect.map((parts) => ({ parts, problem: undefined })),
          Effect.catch((cause) => {
            const problem = malformedToolCall(cause);
            return problem !== undefined && malformed < MAX_MALFORMED
              ? Effect.succeed({ parts: undefined, problem })
              : Effect.fail(new AgentError({ message: problem ?? describe(cause), cause }));
          }),
        );
        if (attempt.parts === undefined) {
          malformed++;
          yield* log
            .append(projectId, new Events.StepRetried({ message: attempt.problem, turnId }))
            .pipe(Effect.mapError(fail('Cannot record retry')));
          prompt = Prompt.concat(
            prompt,
            Prompt.make([{ role: 'user', content: [{ type: 'text', text: correction(attempt.problem) }] }]),
          );
          continue;
        }
        malformed = 0;
        const parts = attempt.parts;

        if (!parts.some((part) => part.type === 'tool-call')) {
          return yield* log
            .append(projectId, new Events.TurnEnded({ steps: step + 1, turnId }))
            .pipe(Effect.asVoid, Effect.mapError(fail('Cannot close turn')));
        }
        // The calls and their results go back verbatim; the tool events are already in the log.
        prompt = Prompt.concat(prompt, Prompt.fromResponseParts(parts));

        const remaining = MAX_STEPS - step - 1;
        if (remaining <= WARN_AT_REMAINING) {
          prompt = Prompt.concat(
            prompt,
            Prompt.make([
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text:
                      `[${remaining} tool call${remaining === 1 ? '' : 's'} left in this turn] Stop exploring and ` +
                      'display what you already have — a partial answer on the screen beats a complete one the ' +
                      'user never sees.',
                  },
                ],
              },
            ]),
          );
        }
      }

      return yield* Effect.fail(
        new AgentError({ message: `Gave up after ${MAX_STEPS} steps without a final answer.` }),
      );
    }).pipe(
      // A failed turn is a recorded fact, not a lost one: the transcript says what went wrong and
      // the next turn starts from a consistent log.
      Effect.tapError((error) =>
        log.append(projectId, new Events.TurnFailed({ message: error.message, turnId })).pipe(Effect.ignore),
      ),
      // An interrupted turn (the server shutting down) is closed too: only a `TurnFailed` or
      // `TurnEnded` clears `running`, so a reload would otherwise show it working forever.
      Effect.onInterrupt(() =>
        log
          .append(projectId, new Events.TurnFailed({ message: 'Interrupted before the turn finished.', turnId }))
          .pipe(Effect.ignore),
      ),
    );

  return { turn } satisfies Api;
});

export const layer: Layer.Layer<Agent, never, Log.Log | Sandbox.Sandbox | LanguageModel.LanguageModel> = Layer.effect(
  Agent,
  make,
);
