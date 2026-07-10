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

export type DraftOptions = {
  /**
   * User-authored instructions that steer the reply (tone, standing facts, sign-off, policies). A
   * proxy for the per-mailbox `Instructions` object (`@dxos/compute`) the product wires in; appended
   * after the base rules so it can refine or override them.
   */
  readonly instructions?: string;
};

/**
 * Drafts a reply to a single message as the recipient, via the variant's model. Bulk/automated mail
 * (a no-reply sender or an unsubscribe affordance) is skipped without an LLM call — see
 * `Mailbox.isReplyable`. Optional user `instructions` steer the reply.
 */
export const draftReply = (
  message: Message.Message,
  variant: ModelVariant,
  options: DraftOptions = {},
): Effect.Effect<DraftResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const messageId = String(message.properties?.messageId ?? message.id);
    const subject = String(message.properties?.subject ?? '');
    if (!Mailbox.isReplyable(message)) {
      return { messageId, subject, draft: '', skipped: true };
    }
    const instructions = options.instructions?.trim();
    const prompt = instructions
      ? `${PROMPT}\n\nAdditional instructions from the user (follow these):\n${instructions}`
      : PROMPT;
    const draft = (yield* generateText(
      variant.model,
      variant.provider,
      `${prompt}\n\n${Message.extractText(message)}`,
    )).trim();
    return { messageId, subject, draft, skipped: false };
  });
