//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Decision from 'effect/unstable/ai/Decision';

import { type Message } from '@dxos/types';

/** The decision model the questions are asked of: TypeSafe System One, via the space's AiService. */
export const DECISION_MODEL = 'ai.typesafe.model.jev.latest' as const;

/** Ordered urgency criteria; the model answers a position on this scale. */
export const URGENCY_SCALE = [
  'Routine — can wait or needs nothing',
  'Timely — wants attention soon',
  'Urgent',
] as const;

/** Rating at or above which the message is tagged urgent (the top band of {@link URGENCY_SCALE}). */
export const URGENT_SCORE = 1.5;

/** Probability at or above which the message is tagged as needing a reply. */
export const NEEDS_REPLY_TRUTH = 0.6;

/** Confidence a label or urgency answer must reach before it is applied rather than dropped. */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

/**
 * The label choice meaning none of the space's tags fit. A classification needs at least two options,
 * and without this one a space with a single tag would force every message into it. Never a tag URI.
 */
export const NO_LABEL = 'none';

/** What the model is told about a message. Only headers and a snippet — never the full body. */
export const MessageState = Schema.Struct({
  from: Schema.String,
  subject: Schema.String,
  snippet: Schema.String,
});

export interface MessageState extends Schema.Schema.Type<typeof MessageState> {}

const needsReply = Decision.probability({
  instructions: 'Does this message ask the recipient for a reply, a decision, or an action?',
});

const urgency = Decision.rate({
  instructions: 'How soon does the recipient need to deal with this message?',
  criteria: URGENCY_SCALE,
});

/** The questions asked when the space has no user tags to choose between. */
export const TriageQuestions = Decision.make({ input: MessageState, decisions: { needsReply, urgency } });

/**
 * The questions asked per message: the two above plus a choice over the space's own tags, whose
 * criteria are the tag labels the user wrote. One call answers all three.
 */
export const labelQuestions = (criteria: Record<string, string>) =>
  Decision.make({
    input: MessageState,
    decisions: {
      needsReply,
      urgency,
      label: Decision.classify({
        instructions: 'Which label best fits this message?',
        criteria: { ...criteria, [NO_LABEL]: 'None of these labels fit' },
      }),
    },
  });

export const messageState = (message: Message.Message): MessageState => ({
  from: message.sender?.name ?? message.sender?.email ?? 'unknown',
  subject: message.properties?.subject ?? '(no subject)',
  snippet: messageSnippet(message),
});

const messageSnippet = (message: Message.Message): string => {
  const snippet = message.properties?.snippet;
  if (typeof snippet === 'string' && snippet.length > 0) {
    return snippet.slice(0, 480);
  }
  return (message.blocks.find((block) => block._tag === 'text')?.text ?? '').slice(0, 480);
};

export type Decisions = {
  readonly needsReply: Decision.ProbabilityAnswer;
  readonly urgency: Decision.RateAnswer<string>;
  readonly label?: Decision.ClassifyAnswer<string>;
};

/** The tags a set of answers earns: the label, and each flag whose own threshold is met. */
export type Verdict = {
  readonly label?: string;
  readonly needsReply: boolean;
  readonly urgent: boolean;
};

/**
 * Confidence in an answer: the model's own when it reports one (optional for a provider), else the
 * probability it gave the option it committed to.
 */
const confidenceOf = (answer: Decision.ClassifyAnswer<string> | Decision.RateAnswer<string>): number =>
  answer.confidence ?? answer.probabilities[answer.label] ?? 0;

/**
 * Turns answers into tags. A low-confidence answer applies nothing rather than a guess — the point
 * of asking a model that reports confidence is to be able to decline.
 */
export const toVerdict = (decisions: Decisions, minConfidence = DEFAULT_MIN_CONFIDENCE): Verdict => ({
  label:
    decisions.label && decisions.label.label !== NO_LABEL && confidenceOf(decisions.label) >= minConfidence
      ? decisions.label.label
      : undefined,
  needsReply: decisions.needsReply.probability >= NEEDS_REPLY_TRUTH,
  urgent: decisions.urgency.rating >= URGENT_SCORE && confidenceOf(decisions.urgency) >= minConfidence,
});
