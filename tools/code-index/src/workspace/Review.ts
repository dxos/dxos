//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as FiberSet from 'effect/FiberSet';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { gzipSync } from 'node:zlib';

import * as Events from './Events.ts';
import * as Log from './Log.ts';
import type * as Models from './Models.ts';
import * as Telemetry from './Telemetry.ts';

/**
 * Reviews each finished turn in the background and reports the ones where the agent struggled —
 * a prompt that misled it, a sandbox function that broke, a model that could not form a call — so
 * the cases worth fixing surface on a dashboard instead of in someone's memory of a bad session.
 * Cheap signals read off the log pick the turns worth judging; a model judges those; a turn judged
 * troubled has its whole trajectory uploaded and a PostHog event points at it.
 */

/** Every reviewed turn, troubled or not: the denominator for a trouble rate. */
export const REVIEWED_EVENT = 'code_index_turn_reviewed';

/** A turn the review found troubled, with its summary and where its trajectory was stored. */
export const TROUBLE_EVENT = 'code_index_turn_trouble';

/** Where trajectories go inside the bucket, beside the feedback logs it already holds. */
export const KEY_PREFIX = 'code-index/trajectories';

/** The share of turns with no warning signal that are judged anyway, to catch trouble the signals miss. */
export const DEFAULT_SAMPLE_RATE = 0.1;

/** The judge reads one turn; past this a tool output is cut, since its start says what went wrong. */
const OUTPUT_LIMIT = 2_000;

/** The whole transcript the judge sees, so a 20-step turn of large outputs still fits a small model. */
const TRANSCRIPT_LIMIT = 60_000;

/** A review must not hold a fiber open long after its turn; a judge that has not answered by now is skipped. */
const JUDGE_TIMEOUT = Duration.seconds(90);

/** What the log alone says about a turn. */
export type Signals = {
  readonly outcome: 'ended' | 'failed';
  readonly failure?: string;
  /** Model round-trips, counting the ones whose reply had to be retried. */
  readonly steps: number;
  readonly toolCalls: number;
  readonly toolErrors: number;
  /** Replies with an unusable tool call that the agent went back to the model about. */
  readonly retries: number;
  /** Tool calls whose code repeated an earlier call's exactly: a model going round in circles. */
  readonly repeatedCalls: number;
  /** Panels published to the screen — the user sees nothing else. */
  readonly displayed: number;
};

/** One turn's events, from the message that opened it to the event that closed it. */
export type Turn = {
  readonly turnId: string;
  readonly start: number;
  readonly end: number;
  readonly entries: readonly Events.Entry[];
};

/**
 * The entries of `turnId`, or `undefined` while it has not closed. Results and panels carry no turn
 * id, so the turn is the run of entries between its opening message and its closing event.
 */
export const turnOf = (entries: readonly Events.Entry[], turnId: string): Turn | undefined => {
  const startIndex = entries.findIndex((entry) => entry.event._tag === 'UserMessage' && entry.event.turnId === turnId);
  if (startIndex < 0) {
    return undefined;
  }
  const endIndex = entries.findIndex(
    (entry, index) =>
      index > startIndex &&
      (entry.event._tag === 'TurnEnded' || entry.event._tag === 'TurnFailed') &&
      entry.event.turnId === turnId,
  );
  if (endIndex < 0) {
    return undefined;
  }
  const slice = entries.slice(startIndex, endIndex + 1);
  return { turnId, start: slice[0].seq, end: slice[slice.length - 1].seq, entries: slice };
};

/** Reads a closed turn's signals off its events. */
export const signals = (turn: Turn): Signals => {
  const events = turn.entries.map((entry) => entry.event);
  const last = events[events.length - 1];
  const codes = events.flatMap((event) => (event._tag === 'ToolCall' ? [event.code.trim()] : []));
  const retries = events.filter((event) => event._tag === 'StepRetried').length;
  return {
    outcome: last._tag === 'TurnFailed' ? 'failed' : 'ended',
    ...(last._tag === 'TurnFailed' ? { failure: last.message } : {}),
    steps: (last._tag === 'TurnEnded' ? last.steps : codes.length) + retries,
    toolCalls: codes.length,
    toolErrors: events.filter((event) => event._tag === 'ToolResult' && !event.ok).length,
    retries,
    repeatedCalls: codes.length - new Set(codes).size,
    displayed: events.filter((event) => event._tag === 'Presented').length,
  };
};

/**
 * Whether the signals alone make a turn worth judging. Each one is a symptom a smooth turn does not
 * show: one failed snippet is normal exploration, but most of them failing is not.
 */
export const suspicious = (signals: Signals): boolean =>
  signals.outcome === 'failed' ||
  signals.retries > 0 ||
  signals.repeatedCalls > 0 ||
  signals.toolErrors >= 3 ||
  (signals.toolCalls >= 2 && signals.toolErrors * 2 >= signals.toolCalls);

export const Category = Schema.Literals(['none', 'prompt', 'tool', 'model', 'environment', 'user']);

export const Verdict = Schema.Struct({
  trouble: Schema.Boolean.annotate({
    description: 'True when the agent struggled to serve the request, whether or not it got there in the end.',
  }),
  category: Category.annotate({
    description:
      'The main cause: prompt (the system prompt or API docs misled it), tool (a sandbox function or the ' +
      'exec tool misbehaved), model (malformed calls, ignored results, hallucinated APIs or facts), ' +
      'environment (index missing or stale, network, credentials), user (ambiguous or impossible ' +
      'request), none (no trouble).',
  }),
  severity: Schema.Literals(['low', 'medium', 'high']).annotate({
    description: 'high: the user got no useful answer; medium: an answer after real waste; low: minor friction.',
  }),
  summary: Schema.String.annotate({ description: 'One sentence a maintainer can act on.' }),
  evidence: Schema.String.annotate({
    description: 'The step numbers and quoted errors or outputs that show it, in at most three sentences.',
  }),
});

export type Verdict = typeof Verdict.Type;

const JUDGE_SYSTEM = [
  'You review transcripts of an agent that answers questions about a codebase. Its one tool, `exec`,',
  'runs TypeScript in a sandbox exposing a SPARQL-backed code index and `display.*` functions that put',
  "tables, markdown and diagrams on the user's screen; the user sees nothing else. Decide whether the",
  'agent had trouble performing the request, and why. Trouble is wasted or failed work: errors it had',
  'to work around, APIs it guessed wrong because the docs did not say, the same query repeated, a',
  'sandbox function returning wrong or empty results, malformed tool calls, running out of steps, or',
  'an answer the results do not support. A turn that explores a few times and then answers well is',
  'not trouble. Name the cause a maintainer would fix: the prompt, a tool, the model, the environment,',
  "or the user's request.",
].join(' ');

const clip = (text: string, limit: number): string =>
  text.length > limit ? `${text.slice(0, limit)}… [${text.length - limit} more characters]` : text;

/** The turn as the judge reads it: numbered steps, code in fences, outputs cut to their start. */
export const transcript = (turn: Turn): string => {
  const calls = new Map<string, number>();
  const lines = turn.entries.flatMap(({ event }): string[] => {
    switch (event._tag) {
      case 'UserMessage':
        return [`USER: ${event.text}`];
      case 'AssistantMessage':
        return [`ASSISTANT: ${event.text}`];
      case 'ToolCall': {
        calls.set(event.callId, calls.size + 1);
        return [`CALL ${calls.size}:\n\`\`\`ts\n${clip(event.code, OUTPUT_LIMIT)}\n\`\`\``];
      }
      case 'ToolResult':
        return [
          `RESULT ${calls.get(event.callId) ?? '?'} (${event.ok ? 'ok' : 'error'}): ${clip(event.output, OUTPUT_LIMIT)}`,
        ];
      case 'Presented':
        return [
          `DISPLAYED ${event.kind}${event.title ? ` "${event.title}"` : ''} (${event.content.length} characters)`,
        ];
      case 'StepRetried':
        return [`UNUSABLE REPLY, RETRIED: ${event.message}`];
      case 'TurnEnded':
        return [`TURN ENDED after ${event.steps} steps.`];
      case 'TurnFailed':
        return [`TURN FAILED: ${event.message}`];
      default:
        return [];
    }
  });
  return clip(lines.join('\n\n'), TRANSCRIPT_LIMIT);
};

/** Asks the model for a verdict on a turn; fails if it cannot give one in time. */
export const judge = (turn: Turn, signals: Signals) =>
  LanguageModel.generateObject({
    objectName: 'verdict',
    schema: Verdict,
    prompt: Prompt.make([
      { role: 'system', content: JUDGE_SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Signals read from the log: ${JSON.stringify(signals)}\n\n<transcript>\n${transcript(turn)}\n</transcript>`,
          },
        ],
      },
    ]),
  }).pipe(
    Effect.timeout(JUDGE_TIMEOUT),
    Effect.map((response) => response.value),
  );

export type Header = {
  readonly kind: 'code-index/trajectory';
  readonly version: 1;
  readonly projectId: string;
  readonly turnId: string;
  /** The first and last `seq` of the reviewed turn; the entries before it are the conversation it continued. */
  readonly turn: { readonly start: number; readonly end: number };
  readonly provider: string;
  readonly model: string;
  readonly system: string;
  readonly signals: Signals;
  readonly verdict?: Verdict;
  readonly createdAt: string;
};

/**
 * The trajectory as gzipped NDJSON: a header line saying which turn was reviewed and why, then every
 * log entry up to the turn's end, so the conversation that led into the turn travels with it.
 */
export const trajectory = (header: Header, entries: readonly Events.Entry[]) =>
  Effect.gen(function* () {
    const lines = [JSON.stringify(header)];
    for (const entry of entries) {
      if (entry.seq > header.turn.end) {
        break;
      }
      lines.push(JSON.stringify({ seq: entry.seq, event: yield* Events.encode(entry.event) }));
    }
    // Copied out of node's pooled buffer, which `fetch` cannot take as a body.
    return new Uint8Array(gzipSync(`${lines.join('\n')}\n`));
  });

/** The object key of a turn's trajectory: dated, so a bucket listing reads as a timeline. */
export const keyOf = (turnId: string, now: Date = new Date()): string =>
  `${KEY_PREFIX}/${now.toISOString().slice(0, 10)}/${turnId}.ndjson.gz`;

export type ReviewOptions = {
  readonly projectId: string;
  readonly turnId: string;
  /** The system prompt the turn ran with, recorded in the trajectory. */
  readonly system: string;
};

export interface Api {
  /** Reviews a closed turn in the background; returns at once and never fails. */
  readonly schedule: (options: ReviewOptions) => Effect.Effect<void>;
}

export class Reviewer extends Context.Service<Reviewer, Api>()('code-index/Reviewer') {}

/** One review, run to completion: judge if warranted, report, and upload a troubled turn. */
export const review = (
  options: ReviewOptions & { readonly selection: Models.Selection; readonly sampleRate: number },
) =>
  Effect.gen(function* () {
    const log = yield* Log.Log;
    const telemetry = yield* Telemetry.Telemetry;
    const entries = yield* log.read(options.projectId);
    const turn = turnOf(entries, options.turnId);
    if (turn === undefined) {
      return;
    }
    const found = signals(turn);
    const judged = suspicious(found) || Math.random() < options.sampleRate;
    const verdict = judged
      ? yield* judge(turn, found).pipe(
          Effect.tapError((cause) => Effect.logWarning('code-index: turn review could not be judged', cause)),
          Effect.option,
          Effect.map(Option.getOrUndefined),
        )
      : undefined;
    // Without a verdict a failed turn still counts: the log already says the user got no answer.
    const trouble = verdict ? verdict.trouble : found.outcome === 'failed';
    const common = {
      project_id: options.projectId,
      turn_id: options.turnId,
      provider: options.selection.provider,
      model: options.selection.model,
      outcome: found.outcome,
      steps: found.steps,
      tool_calls: found.toolCalls,
      tool_errors: found.toolErrors,
      retries: found.retries,
      repeated_calls: found.repeatedCalls,
      displayed: found.displayed,
      suspicious: suspicious(found),
      judged: verdict !== undefined,
      trouble,
      category: verdict?.category ?? (trouble ? 'unknown' : 'none'),
    };
    yield* telemetry.capture(REVIEWED_EVENT, common);
    if (!trouble) {
      return;
    }
    const header: Header = {
      kind: 'code-index/trajectory',
      version: 1,
      projectId: options.projectId,
      turnId: options.turnId,
      turn: { start: turn.start, end: turn.end },
      provider: options.selection.provider,
      model: options.selection.model,
      system: options.system,
      signals: found,
      ...(verdict ? { verdict } : {}),
      createdAt: new Date().toISOString(),
    };
    const key = keyOf(options.turnId);
    const stored = yield* telemetry.upload({
      key,
      body: yield* trajectory(header, entries),
      contentType: 'application/x-ndjson',
      contentEncoding: 'gzip',
    });
    yield* telemetry.capture(TROUBLE_EVENT, {
      ...common,
      severity: verdict?.severity ?? 'high',
      summary: verdict?.summary ?? `The turn failed: ${found.failure ?? 'no reason recorded'}`,
      evidence: verdict?.evidence ?? '',
      failure: found.failure,
      r2_bucket: stored.bucket,
      r2_key: key,
      r2_url: stored.url,
    });
  });

/** How long shutdown waits for reviews in flight: a one-shot `chat --prompt` exits the moment its turn ends. */
const SHUTDOWN_GRACE = Duration.seconds(15);

/**
 * Reviews in fibers of the layer's scope. Closing it waits briefly for reviews in flight, then
 * interrupts them, so they never write to a closed log. `selection` is the agent's model, recorded
 * with each report; the layer's `LanguageModel` is the judge, which the caller picks to be cheap.
 */
export const layer = (options: {
  readonly selection: Models.Selection;
  readonly sampleRate?: number;
}): Layer.Layer<Reviewer, never, Log.Log | Telemetry.Telemetry | LanguageModel.LanguageModel> =>
  Layer.effect(
    Reviewer,
    Effect.gen(function* () {
      const context = yield* Effect.context<Log.Log | Telemetry.Telemetry | LanguageModel.LanguageModel>();
      const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
      const reviews = yield* FiberSet.make();
      // Added after the set, so it runs before the set's own finalizer interrupts what is left.
      yield* Effect.addFinalizer(() =>
        FiberSet.awaitEmpty(reviews).pipe(Effect.timeout(SHUTDOWN_GRACE), Effect.ignore),
      );
      return {
        schedule: (request) =>
          FiberSet.run(
            reviews,
            review({ ...request, selection: options.selection, sampleRate }).pipe(
              Effect.provideContext(context),
              Effect.catchCause((cause) => Effect.logWarning('code-index: turn review failed', cause)),
            ),
          ).pipe(Effect.asVoid),
      } satisfies Api;
    }),
  );
