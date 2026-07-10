//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText } from '../llm';
import { type ModelVariant } from '../models';

export type SummaryResult = {
  readonly summary: string;
};

const PROMPT = trim`
  Summarize the email below as a terse markdown bullet list (1-3 bullets): who sent it and what they
  want or are telling the recipient.
  Rules:
  - Start each bullet with a verb or the sender's name — never with "The email", "This email", or "The sender".
  - No preamble, heading, labels, or quotes. Output ONLY the bullets.
  - Keep each bullet under ~15 words.
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
    return { summary };
  });
