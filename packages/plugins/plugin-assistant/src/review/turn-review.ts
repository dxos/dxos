//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AiSession } from '@dxos/assistant';
import { type Message } from '@dxos/types';
import { trim } from '@dxos/util';

/** PostHog event emitted when the reviewer finds a turn the agent struggled through. */
export const STRUGGLE_EVENT = 'agent_struggle';

/** Small enough to be cheap per turn, strong enough to judge an agentic transcript. */
export const REVIEW_MODEL = 'com.anthropic.model.claude-sonnet-5.default';

/** Bounds the transcript the reviewer reads; the uploaded trajectory is not cut. */
const MAX_TRANSCRIPT_CHARS = 120_000;
const MAX_BLOCK_CHARS = 4_000;

/**
 * Why the agent struggled. Only the first four are reported: they are the ones fixable on our side
 * (prompting or tooling); the model's own reasoning and an unclear user request are not.
 */
export const StruggleCause = Schema.Literals([
  'system_prompt_missing',
  'system_prompt_wrong',
  'tool_missing',
  'tool_faulty',
  'model',
  'user',
  'none',
]);
export type StruggleCause = Schema.Schema.Type<typeof StruggleCause>;

export const TurnVerdict = Schema.Struct({
  struggled: Schema.Boolean.annotate({
    description: 'Whether the agent visibly struggled in the latest turn.',
  }),
  cause: StruggleCause.annotate({
    description: 'The root cause of the struggle, or "none".',
  }),
  severity: Schema.Literals(['low', 'medium', 'high']).annotate({
    description: 'low: recovered quickly; medium: wasted several steps; high: failed the request.',
  }),
  summary: Schema.String.annotate({
    description: 'One sentence naming what went wrong and what instruction or tool change would fix it.',
  }),
  tools: Schema.Array(Schema.String).annotate({
    description: 'Names of the tools implicated, if any.',
  }),
});
export type TurnVerdict = Schema.Schema.Type<typeof TurnVerdict>;

export type CauseGroup = 'system_prompt' | 'tooling';

/** The dashboard's top-level split; `undefined` for a cause that is not reported. */
export const causeGroup = (cause: StruggleCause): CauseGroup | undefined => {
  switch (cause) {
    case 'system_prompt_missing':
    case 'system_prompt_wrong':
      return 'system_prompt';
    case 'tool_missing':
    case 'tool_faulty':
      return 'tooling';
    default:
      return undefined;
  }
};

export const isReportable = (verdict: TurnVerdict): boolean =>
  verdict.struggled && causeGroup(verdict.cause) !== undefined;

export const REVIEW_SYSTEM_PROMPT = trim`
  You review transcripts of an AI agent working inside Composer, a collaborative workspace app.
  Decide whether the agent struggled in the LATEST TURN (messages after the <latest_turn> marker).
  Earlier messages are context only.

  Signs of struggling: repeated or looping tool calls, tool errors, calling tools with invalid
  arguments, guessing at tool names or object ids, apologizing and retrying, giving up, asking the
  user for information it should have been able to obtain, or ending the turn with an error.

  Classify the root cause:
  - system_prompt_missing: the agent lacked instructions or context it needed (e.g. how a feature
    works, which tool to use for a task, conventions of the app).
  - system_prompt_wrong: instructions were present but misleading, contradictory, or outdated.
  - tool_missing: no tool existed for an action the request clearly required.
  - tool_faulty: a tool errored, returned unusable output, had a confusing schema or description.
  - model: the tools and instructions were adequate; the model reasoned poorly.
  - user: the request was ambiguous or impossible.
  - none: the agent did not struggle.

  Be conservative: a single quickly-recovered tool error is not a struggle. When unsure, answer
  struggled=false with cause=none.
`;

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)}… [${text.length - max} chars truncated]`;

const stringify = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

/** One line per block, so the reviewer sees the shape of the turn without a tool result drowning it. */
const formatMessage = (message: Message.Message): string => {
  const lines = message.blocks.map((block) => {
    switch (block._tag) {
      case 'text':
        return clip(block.text, MAX_BLOCK_CHARS);
      case 'toolCall':
        return `[tool call ${block.name}] ${clip(stringify(block.input), MAX_BLOCK_CHARS)}`;
      case 'toolResult':
        return block.error
          ? `[tool error ${block.name}] ${clip(stringify(block.error), MAX_BLOCK_CHARS)}`
          : `[tool result ${block.name}] ${clip(stringify(block.result), MAX_BLOCK_CHARS)}`;
      default:
        return `[${block._tag}]`;
    }
  });
  return `${message.sender.role.toUpperCase()}:\n${lines.join('\n')}`;
};

export type ReviewInput = {
  history: readonly Message.Message[];
  /** ISO timestamp the turn was submitted at. */
  since: string;
  outcome: 'success' | 'error';
  error?: string;
};

/** Splits the history at the turn's start; ISO timestamps compare correctly as strings. */
export const splitTurn = (history: readonly Message.Message[], since: string) => {
  const index = history.findIndex((message) => message.created >= since);
  return index === -1
    ? { context: history, turn: [] as readonly Message.Message[] }
    : { context: history.slice(0, index), turn: history.slice(index) };
};

/** The reviewer's prompt; context is trimmed from the front when the transcript runs long. */
export const formatReviewPrompt = ({ history, since, outcome, error }: ReviewInput): string => {
  const { context, turn } = splitTurn(history, since);
  const turnText = turn.map(formatMessage).join('\n\n');
  const ending = outcome === 'error' ? `The turn ended with an error: ${error ?? 'unknown'}` : 'The turn completed.';
  const budget = Math.max(0, MAX_TRANSCRIPT_CHARS - turnText.length);
  const contextText = context.map(formatMessage).join('\n\n');
  const clippedContext =
    contextText.length > budget ? `…${contextText.slice(contextText.length - budget)}` : contextText;
  return [clippedContext, '<latest_turn>', clip(turnText, MAX_TRANSCRIPT_CHARS), '</latest_turn>', ending]
    .filter((part) => part.length > 0)
    .join('\n\n');
};

export const countToolCalls = (messages: readonly Message.Message[]) => {
  let calls = 0;
  let errors = 0;
  for (const message of messages) {
    for (const block of message.blocks) {
      if (block._tag === 'toolCall') {
        calls++;
      } else if (block._tag === 'toolResult' && block.error) {
        errors++;
      }
    }
  }
  return { calls, errors };
};

export type TrajectoryHeader = {
  sessionId: string;
  outcome: 'success' | 'error';
  error?: string;
  since: string;
  model?: string;
  codeMode: boolean;
  skills: readonly string[];
  verdict: TurnVerdict;
};

/** A header line then one line per message, in the span serialization the LLM analytics traces use. */
export const toTrajectoryNdjson = (header: TrajectoryHeader, history: readonly Message.Message[]): string =>
  [
    JSON.stringify({ type: 'header', ...header }),
    ...history.map((message) =>
      JSON.stringify({ type: 'message', created: message.created, ...(AiSession.serializeMessage(message) as object) }),
    ),
  ].join('\n');

export type StruggleEventInput = TrajectoryHeader & {
  history: readonly Message.Message[];
  trajectoryKey?: string;
};

/**
 * Flat properties so every one is a PostHog breakdown; lists are comma-joined for the same reason.
 * `$ai_session_id` joins the event to the conversation's LLM analytics traces.
 */
export const toStruggleEventProperties = ({
  sessionId,
  outcome,
  error,
  model,
  codeMode,
  skills,
  verdict,
  history,
  since,
  trajectoryKey,
}: StruggleEventInput): Record<string, unknown> => {
  const { turn } = splitTurn(history, since);
  const { calls, errors } = countToolCalls(turn);
  return {
    $ai_session_id: sessionId,
    outcome,
    error,
    model,
    code_mode: codeMode,
    skills: skills.join(','),
    cause: verdict.cause,
    cause_group: causeGroup(verdict.cause),
    severity: verdict.severity,
    summary: verdict.summary,
    tools: verdict.tools.join(','),
    turn_message_count: turn.length,
    turn_tool_call_count: calls,
    turn_tool_error_count: errors,
    review_model: REVIEW_MODEL,
    trajectory_key: trajectoryKey,
  };
};
