//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText } from './llm';
import { type ModelVariant } from './models';

export type SummaryResult = {
  readonly summary: string;
};

const PROMPT = trim`
  Summarize the following email in one or two sentences, capturing who sent it and what they want.
  Respond with ONLY the summary text — no preamble, labels, or quotes.
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
