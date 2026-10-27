//
// Copyright 2026 DXOS.org
//

import * as Decision from 'effect/ai/Decision';
import * as Schema from 'effect/Schema';

import { Model } from '@dxos/ai';
import { type DXN } from '@dxos/keys';
import { type Message } from '@dxos/types';

/** The decision model the questions are asked of: whichever the TypeSafe plugin settings select. */
export const DECISION_MODEL: DXN.DXN = Model.defaultDecisionModel;

/** Ordered urgency criteria; the model answers a position on this scale. */
export const URGENCY_SCALE = [
  'Routine — marketing, newsletters, promotions, receipts, FYIs, or anything that can wait',
  'Timely — a person asks the recipient for something soon',
  'Urgent — a person needs the recipient to act today',
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

// Both questions name automated mail outright: without it a promotion's "ends tonight" reads as a
// request with a deadline, and a sale lands at the top of the inbox.
const needsReply = Decision.probability({
  instructions:
    'Does a person ask the recipient, personally, for a reply, a decision, or an action? Marketing and automated mail never does.',
});

const urgency = Decision.rate({
  instructions:
    'How soon must the recipient act on what a person asks of them? A sale or promotion ending is never urgent.',
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

/** Priority bands, most pressing first. */
export type Priority = 'urgent' | 'high' | 'normal' | 'low';

/** Urgency rating at or above which a message is high priority on its own. */
export const HIGH_SCORE = 0.9;

/** Urgency rating at or above which a message needing a reply is high rather than normal priority. */
export const TIMELY_SCORE = 0.5;

/** The tags a set of answers earns: the label, each flag whose own threshold is met, and a priority. */
export type Verdict = {
  readonly label?: string;
  readonly needsReply: boolean;
  readonly urgent: boolean;
  readonly priority: Priority;
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
export const toVerdict = (decisions: Decisions, minConfidence = DEFAULT_MIN_CONFIDENCE): Verdict => {
  const needsReply = decisions.needsReply.probability >= NEEDS_REPLY_TRUTH;
  const urgent = decisions.urgency.rating >= URGENT_SCORE && confidenceOf(decisions.urgency) >= minConfidence;
  return {
    label:
      decisions.label && decisions.label.label !== NO_LABEL && confidenceOf(decisions.label) >= minConfidence
        ? decisions.label.label
        : undefined,
    needsReply,
    urgent,
    priority: toPriority(decisions.urgency.rating, needsReply, urgent),
  };
};

/**
 * Every message lands in exactly one band, so the list can group the whole inbox: urgency alone
 * decides the top two, and a request for a reply lifts an otherwise routine message out of `low`.
 */
export const toPriority = (rating: number, needsReply: boolean, urgent: boolean): Priority =>
  urgent
    ? 'urgent'
    : rating >= HIGH_SCORE || (needsReply && rating >= TIMELY_SCORE)
      ? 'high'
      : needsReply || rating >= TIMELY_SCORE
        ? 'normal'
        : 'low';
