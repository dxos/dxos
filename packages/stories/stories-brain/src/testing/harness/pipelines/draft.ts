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

export type DraftResult = {
  readonly messageId: string;
  readonly subject: string;
  readonly draft: string;
  /** True when the message was skipped as not worth replying to (bulk/automated). */
  readonly skipped: boolean;
};

const PROMPT = trim`
  Draft a reply to the email below, written as the recipient replying to the sender.
  Rules:
  - Answer every question and acknowledge every request the sender made; if something can't be
    answered, say so briefly.
  - Concise and professional: 2-5 sentences, no filler. A short greeting and sign-off are fine.
  - Do not invent facts, commitments, dates, or attachments not supported by the email.
  - Output ONLY the reply body — no subject line, no quoted original, no commentary.
`;

/**
 * Drafts a reply to a single message as the recipient, via the variant's model. Bulk/automated mail
 * (a no-reply sender or an unsubscribe affordance) is skipped without an LLM call — see
 * `Mailbox.isReplyable`.
 */
export const draftReply = (
  message: Message.Message,
  variant: ModelVariant,
): Effect.Effect<DraftResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const messageId = String(message.properties?.messageId ?? message.id);
    const subject = String(message.properties?.subject ?? '');
    if (!Mailbox.isReplyable(message)) {
      return { messageId, subject, draft: '', skipped: true };
    }
    const draft = (yield* generateText(
      variant.model,
      variant.provider,
      `${PROMPT}\n\n${Message.extractText(message)}`,
    )).trim();
    return { messageId, subject, draft, skipped: false };
  });
