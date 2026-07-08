//
// Copyright 2026 DXOS.org
//

// Non-CI test over a REAL crawled SQLite database (a snapshot of the crawl-demo working set):
// replays the stored messages through the question-extraction pipeline and asserts the replay
// contract (extraction yields tuples, replay is idempotent, the crawl state is terminal).
//
// The fixture is `./fixtures/discord-crawl.db` (override with DISCORD_CRAWL_DB). Regenerate it
// by pointing the plugin-discord crawl demo at the fixture path:
//   DISCORD_TOKEN=… DISCORD_CRAWL_DB=$(pwd)/src/testing/fixtures/discord-crawl.db \
//     moon run plugin-discord:crawl-demo    (from packages/core/compute/pipeline-discord)
//
// The test copies the database to a temp file before opening it, so the fixture is never mutated.
// Skipped in CI and when no fixture is present:
//   moon run pipeline-discord:replay-fixture

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';

import { replayStream } from '../replay';
import { extractQuestionsStage } from '../stages';
import { ExtractedQuestionStore, MessageStore } from '../stores';
import { storesLayer } from './index';

const fixturePath =
  process.env.DISCORD_CRAWL_DB ?? fileURLToPath(new URL('./fixtures/discord-crawl.db', import.meta.url));
const enabled = existsSync(fixturePath) && !process.env.CI;

describe('replay over the crawled SQLite fixture', () => {
  test.skipIf(!enabled)(
    'extracts user-question tuples from the stored working set, idempotently',
    async ({ expect, onTestFinished }) => {
      // Work on a copy: the replay writes extracted_question rows and the fixture must stay pristine.
      const workingCopy = join(tmpdir(), `dxos-crawl-fixture-${process.pid}-${Date.now()}.db`);
      copyFileSync(fixturePath, workingCopy);
      onTestFinished(() => rmSync(workingCopy, { force: true }));

      const layer = storesLayer(SqliteClient.layer({ filename: workingCopy }).pipe(Layer.orDie));
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          // The fixture is a completed crawl: messages + terminal targets + agents are all present.
          const stored = yield* (yield* MessageStore).count();
          const targets = yield* (yield* StateStore).listTargets();
          const agents = yield* (yield* AgentRegistry).list();

          const replay = replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
          yield* replay;
          const questions = yield* (yield* ExtractedQuestionStore).list();

          // Idempotency: a second full replay adds nothing.
          yield* replay;
          const again = yield* (yield* ExtractedQuestionStore).list();

          return { stored, targets, agents, questions, again };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\nfixture:   ${fixturePath}`);
      console.log(`messages:  ${result.stored}`);
      console.log(`targets:   ${result.targets.map((target) => `${target.id}(${target.status})`).join(', ')}`);
      console.log(`agents:    ${result.agents.length}`);
      console.log(`questions: ${result.questions.length}\n`);
      for (const question of result.questions) {
        console.log(
          `  (${question.authorLabel ?? question.authorId} × ${question.targetId} × ${question.messageId})\n    ${question.question}`,
        );
      }

      expect(result.stored).toBeGreaterThan(0);
      expect(result.agents.length).toBeGreaterThan(0);
      // No target is left mid-crawl in a captured snapshot.
      expect(result.targets.every((target) => target.status === 'done' || target.status === 'error')).toBe(true);
      // Real chat always contains questions; every tuple is fully attributed.
      expect(result.questions.length).toBeGreaterThan(0);
      for (const question of result.questions) {
        expect(question.authorId.length).toBeGreaterThan(0);
        expect(question.targetId.length).toBeGreaterThan(0);
        expect(question.messageId.length).toBeGreaterThan(0);
        expect(question.question.endsWith('?')).toBe(true);
      }
      expect(result.again.length).toBe(result.questions.length);
    },
    120_000,
  );
});
