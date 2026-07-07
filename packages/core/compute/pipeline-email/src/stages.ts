//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { type Database } from '@dxos/echo';
import { extractContact } from '@dxos/extractor-lib';
import { Stage } from '@dxos/pipeline';
import { ContentBlock, Message } from '@dxos/types';
import { trim } from '@dxos/util';

const SUMMARIZE_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/** Summary produced by the summarize stage. */
export type Summary = { readonly summary: string; readonly isSpam: boolean; readonly keywords: readonly string[] };

/** Running tallies produced by the stats stage (mutable accumulator). */
export type Stats = { from: Map<string, number>; to: Map<string, number>; total: number; spam: number };

/** Per-message summary result keyed by messageId (for a summary view). */
export type SummaryResult = { readonly summaries: ReadonlyArray<{ messageId: string; summary: Summary }> };

export const emptyStats = (): Stats => ({ from: new Map(), to: new Map(), total: 0, spam: 0 });

/**
 * Shared context threaded through the email stages via Effect's Requirements channel. `db` is the
 * ECHO space database (browser-safe); `stats` and `summaries` are mutable accumulators read after
 * the run. Callers provide it once at the pipeline edge (`Effect.provide`).
 */
export class EmailPipelineCtx extends Context.Tag('@dxos/pipeline-email/EmailPipelineCtx')<
  EmailPipelineCtx,
  {
    readonly db: Database.Database;
    readonly stats: Stats;
    readonly summaries: Array<{ messageId: string; summary: Summary }>;
  }
>() {}

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
    const raw = yield* LanguageModel.generateText({ prompt: `${SUMMARIZE_PROMPT}\n\n${text}` }).pipe(
      Effect.provide(AiService.model(SUMMARIZE_MODEL).pipe(Layer.orDie)),
      Effect.map((response) => response.text),
      Effect.orElse(() => Effect.succeed('')),
    );
    const summary = parseSummary(raw);
    const messageId = String(message.properties?.messageId ?? message.id);
    ctx.summaries.push({ messageId, summary });
    const summaryBlock: ContentBlock.Text = { _tag: 'text', text: summary.summary };
    return Message.make({
      created: message.created,
      sender: message.sender,
      blocks: [...message.blocks, summaryBlock],
      properties: { ...message.properties, spam: summary.isSpam, keywords: summary.keywords },
    });
  }),
);

/** Extract a Person (+ Organization) from the sender and persist to the ECHO space; pass message through. */
export const extractContactsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'extract-contacts',
  (message) =>
    Effect.gen(function* () {
      const { db } = yield* EmailPipelineCtx;
      const result = yield* extractContact({ db, source: message });
      for (const object of result.created) {
        db.add(object);
      }
      return message;
    }),
);

/** Pure-JS running tallies (senders, recipients, spam); pass message through. */
export const statsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'stats',
  (message) =>
    Effect.gen(function* () {
      const { stats } = yield* EmailPipelineCtx;
      stats.total += 1;
      const sender = message.sender.email;
      if (sender) {
        stats.from.set(sender, (stats.from.get(sender) ?? 0) + 1);
      }
      const recipients = message.properties?.to;
      if (Array.isArray(recipients)) {
        for (const recipient of recipients) {
          const address = String(recipient);
          stats.to.set(address, (stats.to.get(address) ?? 0) + 1);
        }
      }
      if (message.properties?.spam) {
        stats.spam += 1;
      }
      return message;
    }),
);
