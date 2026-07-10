//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText, parseJsonArray } from './llm';
import { type ModelVariant } from './models';

export type QuestionResult = {
  readonly messageId: string;
  readonly subject: string;
  readonly questions: string[];
};

const PROMPT = trim`
  Extract every explicit question or actionable request the sender is making of the recipient in the
  following email. Rephrase each as a short standalone sentence. Ignore rhetorical questions and
  automated/marketing calls-to-action. If there are none, return an empty array.
  Respond with ONLY a JSON array of strings.
`;

/** Extracts questions/requests from a single message via the variant's model, grouped by message. */
export const extractQuestions = (
  message: Message.Message,
  variant: ModelVariant,
): Effect.Effect<QuestionResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const raw = yield* generateText(variant.model, variant.provider, `${PROMPT}\n\n${Message.extractText(message)}`);
    const questions = parseJsonArray<unknown>(raw)
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return {
      messageId: String(message.properties?.messageId ?? message.id),
      subject: String(message.properties?.subject ?? ''),
      questions,
    };
  });
