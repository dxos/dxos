//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Markdown } from '@dxos/plugin-markdown';
import { type ContentBlock, type Message } from '@dxos/types';

import { type MessageExtractor } from '../../capabilities';
import { InboxOperation } from '../../types';

/**
 * AI summarization extractor. Matches any message with a non-trivial plain-text body
 * (>{@link MIN_BODY_LENGTH} characters across all text blocks) and produces a
 * `Markdown.Document` whose content is an AI-generated 2-3 sentence summary. The dispatcher
 * (`ExtractMessage`) persists the document and attaches an `ExtractedFrom` relation back to
 * the source message — no tags are emitted.
 *
 * The heavy lifting lives in the `ExtractSummaryFromMessage` operation; the `extract` field
 * just delegates via `Operation.invoke` so the AI-service requirement stays scoped to that
 * operation (not the dispatcher's services list). If `AiService.AiService` is not available
 * in the runtime layer (e.g. minimal test or story contexts), the inner invocation fails;
 * we catch and surface as `ExtractError`. `match()` still returns matched so the toolbar
 * can offer the action regardless.
 */
export const SUMMARIZE_ID = 'org.dxos.plugin.inbox.extractor.summarize';

const SUMMARIZE_MODEL = '@anthropic/claude-haiku-4-5';

const MIN_BODY_LENGTH = 200;

const SUMMARIZE_PROMPT = 'Summarize the following email body in 2-3 sentences:';

const getBodyText = (message: Message.Message): string =>
  message.blocks
    .filter((block): block is ContentBlock.Text => block._tag === 'text')
    .map((block) => block.text)
    .join('\n');

const getSubject = (message: Message.Message): string => String(message.properties?.subject ?? '');

const matchMessage = (message: Message.Message): MessageExtractor.MatchResult => {
  const body = getBodyText(message).trim();
  if (body.length <= MIN_BODY_LENGTH) {
    return { matched: false };
  }
  // Low confidence so domain-specific extractors (e.g. travel) outrank summarize when both
  // match — summarize is a fallback "describe what this email is about" extractor.
  return { matched: true, confidence: 0.2, reason: 'long-text-body' };
};

/**
 * Inner operation handler — does the actual AI call. Returns ExtractResult without touching
 * the database; the dispatcher (`ExtractMessage`) persists. Provided as `default` so the
 * OperationHandlerSet registers it.
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractSummaryFromMessage> =
  InboxOperation.ExtractSummaryFromMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(
        function* ({ message }) {
          const body = getBodyText(message);
          const subject = getSubject(message);

          const response = yield* LanguageModel.generateText({
            prompt: `${SUMMARIZE_PROMPT}\n\n${body}`,
          });

          const doc = Markdown.make({
            name: subject ? `${subject} (summary)` : 'Summary',
            content: response.text,
          });

          return { created: [doc], updated: [], relations: [] };
        },
        Effect.provide(AiService.model(SUMMARIZE_MODEL).pipe(Layer.orDie)),
      ),
    ),
  );

export default handler;

/**
 * MessageExtractor's `extract` delegates to the operation so the AiService requirement stays
 * scoped to `ExtractSummaryFromMessage`. `Operation.invoke` requires `Operation.Service`,
 * which is always available in an operation handler context (and therefore in the dispatcher
 * when it yields this Effect). Any failure — including AiService being absent from the
 * runtime layer — is surfaced as `ExtractError`.
 */
const extract = (input: MessageExtractor.ExtractInput) =>
  Operation.invoke(InboxOperation.ExtractSummaryFromMessage, input).pipe(
    Effect.catchAllCause((cause) => Effect.fail(new MessageExtractor.ExtractError('Summarize failed', cause))),
  );

export const SummarizeMessageExtractor: MessageExtractor.MessageExtractor = {
  id: SUMMARIZE_ID,
  description: 'Summarize a long email body into a Markdown document via the AI service.',
  kinds: ['document', 'summary'],
  match: matchMessage,
  operation: InboxOperation.ExtractSummaryFromMessage,
  extract,
};
