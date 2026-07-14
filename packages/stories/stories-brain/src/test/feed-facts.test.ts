//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AiService, Provider } from '@dxos/ai';
import { OllamaAiServiceLayer } from '@dxos/ai/testing';
import { Cursor } from '@dxos/cursor';
import { Database, Feed, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { EMAIL_EXTRACT_OPTIONS, type FactExtractor, messageToDocument, runFactPipeline } from '@dxos/pipeline-email';
import { FactStore, type RDF, extractDocFacts } from '@dxos/pipeline-rdf';
import { Expando } from '@dxos/schema';
import { Message } from '@dxos/types';

import { fixtureExists, loadFixtureMessages, seedFeed } from '../testing/harness';
import { OLLAMA_MODEL } from './defs';

// Local model served by Ollama; requires a running Ollama (`OLLAMA_ORIGINS="*" ollama serve`).
const MODEL = OLLAMA_MODEL;

describe.skipIf(!fixtureExists())('runFactPipeline over a mailbox feed fixture (Ollama gated)', () => {
  let builder: EchoTestBuilder;

  test('extracts facts from the fixture feed using a local model', async ({ expect }) => {
    builder = await new EchoTestBuilder().open();
    try {
      const messages = loadFixtureMessages();
      expect(messages.length).toBeGreaterThan(0);

      const { db } = await builder.createDatabase({
        types: [Feed.Feed, Message.Message, Cursor.Cursor, Expando.Expando],
      });
      const feed = await seedFeed(db, messages);
      const target = db.add(Expando.make({ name: 'fixture-target' }));
      const cursor = db.add(Cursor.makeFeed({ source: Ref.make(feed), target: Ref.make(target) }));

      // Extract options target the local Ollama model; `strict: false` because local models are
      // unreliable at structured output.
      const extractOptions: RDF.ExtractOptions = {
        ...EMAIL_EXTRACT_OPTIONS,
        model: MODEL,
        provider: Provider.ollama.id,
        strict: false,
      };

      const result = await Effect.gen(function* () {
        const aiService = yield* AiService.AiService;
        const extract: FactExtractor = (message) =>
          EffectEx.runPromise(
            extractDocFacts(messageToDocument(message), extractOptions).pipe(
              Effect.provideService(AiService.AiService, aiService),
            ),
          );

        const run = yield* runFactPipeline({ feed, cursor, extract, pageSize: 1 });
        const store = yield* FactStore;
        const facts = yield* store.query({});
        return { run, facts };
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.provide(FactStore.layerMemory),
        Effect.provide(OllamaAiServiceLayer),
        EffectEx.runAndForwardErrors,
      );

      log.info('fact pipeline', {
        model: MODEL,
        processed: result.run.processed,
        facts: result.run.facts,
        sample: result.facts.slice(0, 3).map((fact) => fact.assertion),
      });

      // Every message is processed; facts land in the store consistently with the reported count.
      expect(result.run.processed).toBe(messages.length);
      expect(result.facts.length).toBe(result.run.facts);
    } finally {
      await builder.close();
    }
  }, 300_000);
});
