//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { asStringArray, generateText, parseJsonObject } from '../llm';
import { type ModelVariant } from '../models';

export type TagResult = {
  readonly tags: string[];
  readonly spam: boolean;
};

const PROMPT = trim`
  Classify the following email. Assign between 1 and 5 short, lowercase, single-word topic tags
  (e.g. "invoice", "newsletter", "security", "personal"). Decide whether the email is spam or a
  cold marketing blast; if so include the tag "spam".
  Respond with ONLY a JSON object of the form {"tags": string[], "spam": boolean}.
`;

/** Assigns topic tags (incl. "spam") to a message via the variant's model. */
export const classifyTags = (
  message: Message.Message,
  variant: ModelVariant,
): Effect.Effect<TagResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const subject = String(message.properties?.subject ?? '');
    const raw = yield* generateText(
      variant.model,
      variant.provider,
      `${PROMPT}\n\nSubject: ${subject}\n\n${Message.extractText(message)}`,
    );
    const parsed = parseJsonObject<{ tags?: unknown; spam?: unknown }>(raw, {});
    const tags = asStringArray(parsed.tags).map((tag) => tag.toLowerCase());
    const spam = parsed.spam === true || tags.includes('spam');
    return { tags: spam && !tags.includes('spam') ? [...tags, 'spam'] : tags, spam };
  });
