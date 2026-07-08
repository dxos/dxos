//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type AiService } from '@dxos/ai';
import { type Database } from '@dxos/echo';
import { Pipeline } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { buildThreads } from './internal/threads';
import {
  EmailPipelineCtx,
  type FactIndexer,
  type Stats,
  type Summary,
  emptyStats,
  // extractContactsStage,
  extractFactsStage,
  statsStage,
  // summarizeStage,
} from './stages';
import { type Thread } from './types';

export type EmailPipelineOptions = {
  /** ECHO space database: extract-contacts persists Person/Organization, threads are added here. */
  readonly db: Database.Database;
  /** Persists one message's facts to the fact substrate (a closure over a `FactStore`). */
  readonly indexFacts: FactIndexer;
  /** The space owner's email, used to orient thread state (awaiting-mine / awaiting-theirs). */
  readonly ownerEmail: string;
  /** Wall clock used to derive thread staleness; injected so the assembly stays deterministic. */
  readonly now: string;
};

export type EmailPipelineResult = {
  readonly messages: Message.Message[];
  readonly stats: Stats;
  readonly summaries: ReadonlyArray<{ messageId: string; summary: Summary }>;
  readonly threads: Thread[];
};

/**
 * Default assembly of the email stages over a batch of messages: summarize → extract-contacts →
 * stats → extract-facts stream through with back pressure, then {@link buildThreads} groups the
 * collected messages into canonical threads. Contacts and threads are persisted to `db`; the fact
 * substrate is populated via `indexFacts`. Requires an `AiService` (summarize); the shared
 * {@link EmailPipelineCtx} is constructed and provided internally.
 */
export const EmailPipeline = {
  run: (
    messages: readonly Message.Message[],
    options: EmailPipelineOptions,
  ): Effect.Effect<EmailPipelineResult, never, AiService.AiService> =>
    Effect.gen(function* () {
      const stats = emptyStats();
      const summaries: Array<{ messageId: string; summary: Summary }> = [];
      const collected: Message.Message[] = [];
      yield* Stream.fromIterable(messages).pipe(
        // TODO(burdon): Do orgs also; reconcile with plugin-inbox EmailStage.extractContacts.
        // extractContactsStage,
        // TODO(burdon): Move to sync pipeline? If not, where does it write to?
        // summarizeStage,
        extractFactsStage(options.indexFacts),
        statsStage,
        Pipeline.run({ sink: (message) => Effect.sync(() => collected.push(message)) }),
        Effect.provideService(EmailPipelineCtx, {
          db: options.db,
          summaries,
          stats,
        }),
      );

      // TODO(burdon): Should be in a separate stage.
      const threads = buildThreads(collected, { ownerEmail: options.ownerEmail, now: options.now });
      for (const thread of threads) {
        options.db.add(thread);
      }

      return {
        messages: collected,
        stats,
        summaries,
        threads,
      };
    }),
};
