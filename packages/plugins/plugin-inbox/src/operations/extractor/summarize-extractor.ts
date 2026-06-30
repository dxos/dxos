//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { type Obj, Type } from '@dxos/echo';
import {
  ExtractError,
  type ExtractInput,
  type ExtractResult,
  type MatchResult,
  type ObjectExtractor,
} from '@dxos/extractor';
import { DXN } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown/types';
import { type ContentBlock, Message } from '@dxos/types';

import { InboxOperation } from '../../types';

/**
 * AI summarization extractor. Matches any message with a non-trivial plain-text body
 * (>{@link MIN_BODY_LENGTH} characters across all text blocks) and produces a
 * `Markdown.Document` whose content is an AI-generated 2-3 sentence summary. The dispatcher
 * (`ExtractMessage`) persists the document and attaches a provenance relation back to the
 * source message — no tags are emitted.
 *
 * The AI-service requirement (`AiService.AiService`) is part of the `ObjectExtractor.extract`
 * signature and is provided by the dispatcher's operation (which declares `AiService` in its
 * services). If unavailable in a minimal runtime, the inner call fails and is surfaced as
 * `ExtractError`. `match()` still returns matched so the toolbar can offer the action.
 */
export const SUMMARIZE_ID = 'org.dxos.plugin.inbox.extractor.summarize';

const SUMMARIZE_MODEL = DXN.make('com.anthropic.model.claudeHaiku45');

const MIN_BODY_LENGTH = 200;

const SUMMARIZE_PROMPT = 'Summarize the following email body in 2-3 sentences:';

const getBodyText = (message: Message.Message): string =>
  message.blocks
    .filter((block): block is ContentBlock.Text => block._tag === 'text')
    .map((block) => block.text)
    .join('\n');

const getSubject = (message: Message.Message): string => String(message.properties?.subject ?? '');

const matchMessage = (source: Obj.Any): MatchResult => {
  const body = getBodyText(source as Message.Message).trim();
  if (body.length <= MIN_BODY_LENGTH) {
    return { matched: false };
  }
  // Low confidence so domain-specific extractors (e.g. travel) outrank summarize when both
  // match — summarize is a fallback "describe what this email is about" extractor.
  return { matched: true, confidence: 0.2, reason: 'long-text-body' };
};

/**
 * Core summarization logic. Returns an `ExtractResult` containing a `Markdown.Document` with
 * the AI-generated summary. Provides the LanguageModel layer internally so the residual `R` is
 * just `AiService.AiService` — exported (rather than inlined) so unit tests can invoke it
 * directly with a mocked `AiService` layer.
 */
export const summarizeMessage = ({
  source,
}: ExtractInput): Effect.Effect<ExtractResult, ExtractError, AiService.AiService> =>
  Effect.gen(function* () {
    const message = source as Message.Message;
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
  }).pipe(
    Effect.provide(AiService.model(SUMMARIZE_MODEL).pipe(Layer.orDie)),
    // Wrap genuine failures + defects as ExtractError, but leave fiber interruption untouched so
    // cancellation propagates (neither catchAll nor catchAllDefect catches interruption).
    Effect.catchAll((error) => Effect.fail(new ExtractError('Summarize failed', error))),
    Effect.catchAllDefect((defect) => Effect.fail(new ExtractError('Summarize failed', defect))),
  );

/**
 * Operation handler — wraps the inline `summarizeMessage` so the extractor is also a
 * first-class registered operation. Does NOT write to the database; the dispatcher persists.
 */
const handler: Operation.WithHandler<typeof InboxOperation.ExtractSummaryFromMessage> =
  InboxOperation.ExtractSummaryFromMessage.pipe(Operation.withHandler(summarizeMessage));

export default handler;

export const SummarizeMessageExtractor: ObjectExtractor = {
  id: SUMMARIZE_ID,
  title: 'Summary',
  description: 'Summarize a long email body into a Markdown document via the AI service.',
  kinds: ['document', 'summary'],
  sourceTypes: [Type.getTypename(Message.Message)!],
  match: matchMessage,
  operation: InboxOperation.ExtractSummaryFromMessage,
  extract: summarizeMessage,
};
