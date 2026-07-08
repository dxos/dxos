//
// Copyright 2026 DXOS.org
//

// Replay demo (node): iterates the messages stored by crawl-demo (no token needed) through the
// question-extraction pipeline and prints the (user × channel × message × question) tuples.
//   [DISCORD_CRAWL_DB=path]  moon run plugin-discord:questions-demo

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { ExtractedQuestionStore, extractQuestionsStage, replayStream } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');

describe('questions demo', () => {
  test.skipIf(!existsSync(dbPath))(
    'replays stored messages through the question-extraction pipeline',
    async ({ expect }) => {
      const layer = storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie));
      const questions = await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
          return yield* (yield* ExtractedQuestionStore).list();
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\ndb: ${dbPath}`);
      console.log(`questions: ${questions.length}\n`);
      for (const question of questions) {
        console.log(
          `  (${question.authorLabel ?? question.authorId} × ${question.targetId} × ${question.messageId})\n    ${question.question}`,
        );
      }

      expect(Array.isArray(questions)).toBe(true);
    },
    120_000,
  );
});
