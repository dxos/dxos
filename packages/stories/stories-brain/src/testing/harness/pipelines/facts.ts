//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Database, type Feed, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Cursor } from '@dxos/link';
import { EMAIL_EXTRACT_OPTIONS, type FactExtractor, messageToDocument, runFactPipeline } from '@dxos/pipeline-email';
import { FactStore, type RDF, extractDocFacts } from '@dxos/pipeline-rdf';
import { Expando } from '@dxos/schema';
import { type Message } from '@dxos/types';

import { type ModelVariant } from '../models';

export type MessageFactsResult = {
  readonly facts: number;
  /** Total characters of extractor input (`messageToDocument().text`) — the HTML-vs-text size signal. */
  readonly inputChars: number;
};

/**
 * Extracts facts from each message directly (no feed/store), under the variant's model, returning
 * total facts and total input characters. Used by the HTML-vs-text benchmark to compare extraction
 * over raw HTML bodies vs stripped prose for the same messages.
 */
export const extractDocFactsForMessages = (
  variant: ModelVariant,
  messages: readonly Message.Message[],
  onMessage?: () => void,
): Promise<MessageFactsResult> =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const noFacts: RDF.Fact[] = [];
      let facts = 0;
      let inputChars = 0;
      for (const message of messages) {
        const document = messageToDocument(message);
        inputChars += document.text.length;
        const extracted = yield* extractDocFacts(document, {
          ...EMAIL_EXTRACT_OPTIONS,
          model: variant.model,
          provider: variant.provider,
          strict: variant.strict,
        }).pipe(
          Effect.timeout('120 seconds'),
          Effect.orElse(() => Effect.succeed(noFacts)),
        );
        facts += extracted.length;
        onMessage?.();
      }
      return { facts, inputChars };
    }).pipe(Effect.provide(AiServiceTestingPreset(variant.preset))),
  );

export type FactsRunResult = {
  readonly processed: number;
  readonly facts: readonly RDF.Fact[];
};

/**
 * Runs the cursored email fact pipeline over `feed` under one model variant, returning the pipeline
 * counts plus the full extracted fact set (so callers can persist it as a fixture). The `extract`
 * closure injects the variant's model/provider/strict into pipeline-rdf's `extractDocFacts`, exactly
 * as the `AnalyzeMailbox` operation does.
 */
export const extractFactsForVariant = (
  variant: ModelVariant,
  feed: Feed.Feed,
  db: Database.Database,
  pageSize = 1,
  onMessage?: () => void,
  concurrency = 1,
): Promise<FactsRunResult> =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const aiService = yield* AiService.AiService;
      // A hung/very-slow model call must not stall the whole run (a single big page blocks on it);
      // time each message out and degrade to zero facts for that message.
      const noFacts: RDF.Fact[] = [];
      // The extract closure is invoked once per message the pipeline processes, so it's the natural
      // per-message progress hook without instrumenting runFactPipeline's internal stream.
      const extract: FactExtractor = (message) =>
        EffectEx.runPromise(
          extractDocFacts(messageToDocument(message), {
            ...EMAIL_EXTRACT_OPTIONS,
            model: variant.model,
            provider: variant.provider,
            strict: variant.strict,
          }).pipe(
            Effect.provideService(AiService.AiService, aiService),
            Effect.timeout('120 seconds'),
            Effect.orElse(() => Effect.succeed(noFacts)),
            Effect.tap(() => Effect.sync(() => onMessage?.())),
          ),
        );

      // A fresh cursor per run (this harness doesn't test resume behavior across calls, so there is no
      // need to find-or-create/persist across invocations — just a real db-backed target for it to point at).
      const target = yield* Database.add(Expando.make({ name: 'facts-benchmark-target' }));
      const cursor = yield* Database.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));
      const { processed } = yield* runFactPipeline({ feed, cursor, extract, pageSize, concurrency });
      const store = yield* FactStore;
      const facts = yield* store.query({});
      return { processed, facts } satisfies FactsRunResult;
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.provide(FactStore.layerMemory),
      Effect.provide(AiServiceTestingPreset(variant.preset)),
    ),
  );
