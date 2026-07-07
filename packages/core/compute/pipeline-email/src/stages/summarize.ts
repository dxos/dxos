//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';
import { ContentBlock, Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { EmailPipelineCtx, type Summary } from './context';

const SUMMARIZE_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const SUMMARIZE_PROMPT = trim`
  Summarize the following email in one sentence, decide whether it is spam, and list up to five keywords.
  Respond with ONLY a JSON object of the form {"summary": string, "isSpam": boolean, "keywords": string[]}.
`;

// Local models often wrap JSON in prose; extract the first object and coerce leniently.
const parseSummary = (raw: string): Summary => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return { summary: '', isSpam: false, keywords: [] };
  }
  try {
    const parsed = JSON.parse(match[0]);
    const keywords = parsed.keywords;
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      isSpam: parsed.isSpam === true || parsed.spam === true || parsed.is_spam === true,
      keywords: Array.isArray(keywords) ? keywords.map((keyword: unknown) => String(keyword)) : [],
    };
  } catch {
    return { summary: '', isSpam: false, keywords: [] };
  }
};

/** Summarize via AiService/LanguageModel; append a summary block and record spam/keywords + result. */
export const summarizeStage: Stage.Stage<
  Message.Message,
  Message.Message,
  never,
  EmailPipelineCtx | AiService.AiService
> = Stage.map('summarize', (message) =>
  Effect.gen(function* () {
    const ctx = yield* EmailPipelineCtx;
    const text = Message.extractText(message);
    // Resolve the LanguageModel layer locally from AiService so `LanguageModel` is discharged and the
    // stage's requirement correctly reduces to `EmailPipelineCtx | AiService.AiService`.
    // Bound the LLM call: `orElse` only recovers failures, so without a timeout a hung/slow provider
    // would block the stage indefinitely. On timeout the effect fails, then `orElse` degrades to ''.
    const raw = yield* LanguageModel.generateText({ prompt: `${SUMMARIZE_PROMPT}\n\n${text}` }).pipe(
      Effect.provide(AiService.model(SUMMARIZE_MODEL).pipe(Layer.orDie)),
      Effect.timeout('30 seconds'),
      Effect.map((response) => response.text),
      Effect.orElse(() => Effect.succeed('')),
    );
    const summary = parseSummary(raw);
    const messageId = String(message.properties?.messageId ?? message.id);
    ctx.summaries.push({ messageId, summary });
    const summaryBlock: ContentBlock.Text = { _tag: 'text', text: summary.summary };
    // Preserve the original id: `Message.make` mints a fresh one when omitted, which would break the
    // `message.id` fallback used for `messageId` downstream.
    return Message.make({
      id: message.id,
      created: message.created,
      sender: message.sender,
      blocks: [...message.blocks, summaryBlock],
      properties: { ...message.properties, spam: summary.isSpam, keywords: summary.keywords },
    });
  }),
);
