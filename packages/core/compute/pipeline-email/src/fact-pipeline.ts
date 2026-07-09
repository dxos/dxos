//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Database } from '@dxos/echo';
import { Pipeline } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { EmailPipelineCtx, type FactIndexer, type Stats, emptyStats, extractFactsStage, statsStage } from './stages';

export type EmailFactPipelineOptions = {
  /** ECHO space database, required by `EmailPipelineCtx` even though this assembly never writes to it. */
  readonly db: Database.Database;
  /** Persists one message's facts to the fact substrate (a closure over a `FactStore`). */
  readonly indexFacts: FactIndexer;
};

export type EmailFactPipelineResult = {
  readonly messages: Message.Message[];
  readonly stats: Stats;
};

export const EmailFactPipeline = {
  /**
   * Facts-only assembly of the email stages over a batch of messages: stats → extract-facts. Omits
   * summarize, extract-contacts, and {@link buildThreads} from {@link EmailPipeline}, so it needs no
   * `AiService` and never writes to `db`. The cursored `EnrichMailbox` operation (in plugin-inbox)
   * covers the same fact-extraction concern incrementally, via a sibling facts-returning stage
   * (`extractFactsUnitStage`) that commits pages atomically with a cursor advance instead of indexing
   * in-stage; this batch variant is for one-shot runs over an already-collected set of messages.
   */
  run: (
    messages: readonly Message.Message[],
    options: EmailFactPipelineOptions,
  ): Effect.Effect<EmailFactPipelineResult> =>
    Effect.gen(function* () {
      const stats = emptyStats();
      const collected: Message.Message[] = [];
      yield* Stream.fromIterable(messages).pipe(
        statsStage,
        extractFactsStage(options.indexFacts),
        Pipeline.run({ sink: (message) => Effect.sync(() => collected.push(message)) }),
        Effect.provideService(EmailPipelineCtx, { db: options.db, stats, summaries: [] }),
      );

      return { messages: collected, stats };
    }),
};
