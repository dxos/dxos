//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Decision from 'effect/unstable/ai/Decision';

import { type Message } from '@dxos/types';

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

/** Confidence a classification or rating must reach before it is applied rather than dropped. */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

/**
 * The label answer meaning "none of the user's tags fit". A classification needs two options, and a
 * space with one tag would otherwise force every message into it.
 */
export const NO_LABEL = 'none';

/** What the model is told about a message: headers and a snippet, never the full body. */
export const MessageState = Schema.Struct({
  from: Schema.String,
  subject: Schema.String,
  snippet: Schema.String,
});

const needsReply = Decision.probability({
  instructions: 'Does this message ask the recipient for a reply, a decision, or an action?',
});

const urgency = Decision.rate({
  instructions: 'How soon does the recipient need to deal with this message?',
  criteria: URGENCY_SCALE,
});

/** The decisions asked when the space has no user tags to choose between. */
export const TriageDecisions = Decision.make({ input: MessageState, decisions: { needsReply, urgency } });

/**
 * The decisions asked per message: the two above plus a classification over the space's own tags,
 * whose criteria are the tag labels the user wrote. One call answers all three.
 */
export const labelDecisions = (criteria: Record<string, string>) =>
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

/** The {@link MessageState} for a message. */
export const messageState = (message: Message.Message): typeof MessageState.Type => ({
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

export type Answers = {
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
 * Turns answers into tags. A low-confidence answer applies nothing rather than a guess — the point
 * of asking a model that reports confidence is to be able to decline. A missing confidence counts as
 * none, for the same reason.
 */
export const toVerdict = (answers: Answers, minConfidence = DEFAULT_MIN_CONFIDENCE): Verdict => ({
  label:
    answers.label && answers.label.label !== NO_LABEL && (answers.label.confidence ?? 0) >= minConfidence
      ? answers.label.label
      : undefined,
  needsReply: answers.needsReply.probability >= NEEDS_REPLY_TRUTH,
  urgent: answers.urgency.rating >= URGENT_SCORE && (answers.urgency.confidence ?? 0) >= minConfidence,
});
