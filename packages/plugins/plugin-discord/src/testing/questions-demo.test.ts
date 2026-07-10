//
// Copyright 2026 DXOS.org
//

// Replay demo (node): iterates the messages stored by crawl-demo (no token needed) through the
// question-extraction pipeline and prints the (user × channel × message × question) tuples, then
// the detected topic segments per target.
//   [DISCORD_CRAWL_DB=path]  moon run plugin-discord:questions-demo

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { StateStore } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import {
  ExtractedQuestionStore,
  type TopicSegment,
  buildTopicsForTarget,
  extractQuestionsStage,
  replayStream,
} from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');

describe('questions demo', () => {
  test.skipIf(!existsSync(dbPath))(
    'replays stored messages through question extraction and topic detection',
    async ({ expect }) => {
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath }).pipe(Layer.orDie)),
        deterministicAiService(),
      );
      const { questions, topics } = await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
          const questions = yield* (yield* ExtractedQuestionStore).list();

          const targets = yield* (yield* StateStore).listTargets();
          const topics: TopicSegment[] = [];
          for (const target of targets) {
            topics.push(...(yield* buildTopicsForTarget(target)));
          }
          return { questions, topics };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\ndb: ${dbPath}`);
      console.log(`questions: ${questions.length}\n`);
      for (const question of questions) {
        console.log(
          `  (${question.authorLabel ?? question.authorId} × ${question.targetId} × ${question.messageId})\n    ${question.question}`,
        );
      }

      console.log(`\ntopics: ${topics.length}\n`);
      for (const topic of topics) {
        console.log(
          `  ${topic.targetId}${topic.threadId ? ' (thread)' : ''}  [${topic.startMessageId} … ${topic.endMessageId}]` +
            `  ${topic.messageIds.length} msg\n    participants: ${topic.participantLabels.join(', ')}`,
        );
      }

      expect(Array.isArray(questions)).toBe(true);
      expect(Array.isArray(topics)).toBe(true);
    },
    120_000,
  );
});
