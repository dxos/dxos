//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Mailbox } from '@dxos/plugin-inbox';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText } from '../llm';
import { type ModelVariant } from '../models';

/** A full multi-bullet summary vs a one-line category label (cheap, for org / bulk mail). */
export type SummaryKind = 'summary' | 'label';

export type SummaryResult = {
  readonly summary: string;
  readonly kind: SummaryKind;
};

const PROMPT = trim`
  Summarize the email below as a terse markdown bullet list (1-3 bullets): who sent it and what they
  want or are telling the recipient.
  Rules:
  - Start each bullet with a verb or the sender's name — never with "The email", "This email", or "The sender".
  - No preamble, heading, labels, or quotes. Output ONLY the bullets.
  - Keep each bullet under ~15 words.
`;

const LABEL_PROMPT = trim`
  Classify the automated / organizational email below in ONE short line: what kind it is and who it is
  from (e.g. "Invoice from Acme", "Newsletter: Stripe changelog", "Shipping update from Amazon",
  "Payment receipt from GitHub", "Security alert from Google").
  Rules:
  - Output ONLY the single line — no preamble, bullets, or quotes.
  - Under ~10 words.
`;

/** Produces a one-to-two sentence summary of a single message via the variant's model. */
export const summarizeMessage = (
  message: Message.Message,
  variant: ModelVariant,
): Effect.Effect<SummaryResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const summary = (yield* generateText(
      variant.model,
      variant.provider,
      `${PROMPT}\n\n${Message.extractText(message)}`,
    )).trim();
    return { summary, kind: 'summary' };
  });

/** Produces a one-line category label for an automated / organizational message (cheaper than a summary). */
export const labelMessage = (
  message: Message.Message,
  variant: ModelVariant,
): Effect.Effect<SummaryResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const label = (yield* generateText(
      variant.model,
      variant.provider,
      `${LABEL_PROMPT}\n\n${Message.extractText(message)}`,
    )).trim();
    return { summary: label, kind: 'label' };
  });

export type SummarizeOptions = {
  /** Classified sender type (from the classify-sender stage); when omitted the heuristic decides. */
  readonly senderClass?: 'person' | 'org';
};

/**
 * Decides whether a message earns a full summary or just a one-line label (REPORT §5): reserve
 * summarization budget for people, and give org / bulk mail a cheap label. Pure — reuses the same
 * person-only gate as reply drafting (`Mailbox.isReplyable`), so summarization and replying agree on
 * what counts as person mail.
 */
export const summaryKindFor = (message: Message.Message, options: SummarizeOptions = {}): SummaryKind =>
  Mailbox.isReplyable(message, options.senderClass ? { senderClass: options.senderClass } : {}) ? 'summary' : 'label';

/** Summarizes person mail in full and labels org / bulk mail in one line, per {@link summaryKindFor}. */
export const summarizeTriaged = (
  message: Message.Message,
  variant: ModelVariant,
  options: SummarizeOptions = {},
): Effect.Effect<SummaryResult, never, AiService.AiService> =>
  summaryKindFor(message, options) === 'summary' ? summarizeMessage(message, variant) : labelMessage(message, variant);
