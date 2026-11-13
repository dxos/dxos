//
// Copyright 2026 DXOS.org
//

// Re-extraction demo (node): replays the messages crawl-demo cached (no Discord token needed) through question and
// fact extraction into DISCORD_FACTS_DB, so a fresh fact store can be rebuilt after the extractors change. Point it at
// an empty or missing facts file to start over; an existing one is extended. Needs DX_ANTHROPIC_API_KEY.
//   [DISCORD_CRAWL_DB=path] [DISCORD_FACTS_DB=path]  moon run plugin-discord:reextract

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { DirectAiServiceLayer } from '@dxos/ai/testing';
import { StateStore, extractFactsStage } from '@dxos/crawler';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Pipeline } from '@dxos/pipeline';
import { MessageStore, extractQuestionsStage, replayStream } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';
import { FactStore, FactStoreLive } from '@dxos/pipeline-rdf';

const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');
const factsPath = process.env.DISCORD_FACTS_DB ?? join(tmpdir(), 'dxos-discord-facts.db');
const hasKey = Boolean(process.env.DX_ANTHROPIC_API_KEY);

describe('re-extract', () => {
  test.skipIf(!existsSync(dbPath) || !hasKey)(
    'replays cached messages through question and fact extraction',
    async ({ expect }) => {
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie), FactStoreLive.layerFile(factsPath)),
        DirectAiServiceLayer,
      );
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          // Earlier extraction errors are cleared first, so any left afterwards came from this replay, same text or not.
          for (const target of yield* StateStore.listTargets()) {
            if (target.lastError?.startsWith('extract-facts:')) {
              yield* StateStore.setStatus(target.id, target.status, '');
            }
          }
          // Agent profiles are left alone: the crawl already counted each message once.
          yield* replayStream().pipe(
            extractQuestionsStage(),
            extractFactsStage(),
            Pipeline.run({ sink: () => Effect.void }),
          );
          // A failed batch is only recorded on its targets.
          const failures = (yield* StateStore.listTargets()).filter((target) =>
            target.lastError?.startsWith('extract-facts:'),
          );
          const store = yield* FactStore;
          return {
            failures,
            messages: yield* MessageStore.count(),
            facts: yield* store.query({}),
            predicates: yield* store.predicates(),
          };
        }).pipe(Effect.provide(layer)),
      );

      const questions = result.facts.filter((fact) => fact.extractor.id === 'extract-questions');
      const minted = result.predicates.filter((predicate) => predicate.created !== undefined);
      console.log(`\ncrawl db: ${dbPath}`);
      console.log(`facts db: ${factsPath}`);
      console.log(`messages: ${result.messages}`);
      console.log(`facts:    ${result.facts.length} (${questions.length / 3} questions as ${questions.length} facts)`);
      console.log(`predicates: ${result.predicates.length} (${minted.length} minted)`);
      for (const predicate of minted) {
        console.log(`  ${predicate.label}  <${predicate.iri}>`);
      }

      for (const target of result.failures) {
        console.error(`  ${target.id}: ${target.lastError}`);
      }
      expect(result.failures, 'fact extraction failed on these targets').toEqual([]);
      expect(result.facts.length).toBeGreaterThan(0);
    },
    900_000,
  );
});
