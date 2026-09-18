//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DecisionModel } from '@dxos/ai-typesafe';
import { type Message } from '@dxos/types';

/** Ordered urgency criteria; the model answers a position on this scale. */
export const URGENCY_SCALE = [
  'Routine — can wait or needs nothing',
  'Timely — wants attention soon',
  'Urgent',
] as const;

/** Score at or above which the message is tagged urgent (the top band of {@link URGENCY_SCALE}). */
export const URGENT_SCORE = 1.5;

/** Truth value at or above which the message is tagged as needing a reply. */
export const NEEDS_REPLY_TRUTH = 0.6;

/** Confidence a choice or score must reach before it is applied rather than dropped. */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

const needsReply = DecisionModel.Noul.annotate({
  description: 'Does this message ask the recipient for a reply, a decision, or an action?',
});

const urgency = DecisionModel.Score(...URGENCY_SCALE).annotate({
  description: 'How soon does the recipient need to deal with this message?',
});

/** The questions asked when the space has no user tags to choose between. */
export const TriageQuestions = Schema.Struct({ needsReply, urgency });

/**
 * The questions asked per message: the two above plus a choice over the space's own tags, whose
 * criteria are the tag labels the user wrote. One call answers all three.
 */
export const labelQuestions = (criteria: Record<string, string>) =>
  Schema.Struct({
    needsReply,
    urgency,
    label: DecisionModel.Choice(criteria).annotate({
      description: 'Which label best fits this message?',
    }),
  });

/** What the model was told about a message. Only headers and a snippet — never the full body. */
export const messageState = (message: Message.Message) => ({
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
  readonly needsReply: number;
  readonly urgency: { readonly score: number; readonly confidence: number };
  readonly label?: { readonly _tag: string; readonly confidence: number };
};

/** The tags a set of answers earns: the label, and each flag whose own threshold is met. */
export type Verdict = {
  readonly label?: string;
  readonly needsReply: boolean;
  readonly urgent: boolean;
};

/**
 * Turns answers into tags. A low-confidence answer applies nothing rather than a guess — the point
 * of asking a model that reports confidence is to be able to decline.
 */
export const toVerdict = (decisions: Decisions, minConfidence = DEFAULT_MIN_CONFIDENCE): Verdict => ({
  label: decisions.label && decisions.label.confidence >= minConfidence ? decisions.label._tag : undefined,
  needsReply: decisions.needsReply >= NEEDS_REPLY_TRUTH,
  urgent: decisions.urgency.score >= URGENT_SCORE && decisions.urgency.confidence >= minConfidence,
});
