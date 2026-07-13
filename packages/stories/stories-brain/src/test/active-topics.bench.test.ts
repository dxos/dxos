//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, test } from 'vitest';

import { RESULTS_DIR } from '../testing/harness/config';
import { fixtureExists, loadFixtureMessages } from '../testing/harness/fixture';
import { runActiveTopics, writeActiveTopicsReports } from '../testing/harness/internal';
import { makeActiveTopicsDeps } from '../testing/harness/pipelines/active-topics';

// The Active Topics experiment (spec 2026-07-13): over the private fixture, cluster + score topics,
// split active/suggested, fully populate the active ones, and write morning-review reports. Guarded by
// `fixtureExists()` so CI (which has no private fixture) skips it; run via `stories-brain:active-topics`.

const OUT = join(RESULTS_DIR, 'active-topics');
const num = (name: string, fallback: number): number => Number(process.env[name]) || fallback;

describe('active-topics', () => {
  test.skipIf(!fixtureExists())(
    'builds active topics + suggestions from the fixture',
    async () => {
      const messages = loadFixtureMessages();
      const result = await runActiveTopics(
        {
          messages,
          nowMs: Date.now(),
          ownerEmail: process.env.OWNER_EMAIL ?? '',
          candidateLimit: num('ACTIVE_N', 20),
          split: { threshold: num('ACTIVE_THRESHOLD', 0.6), top: num('ACTIVE_TOP', 5) },
        },
        makeActiveTopicsDeps(),
      );
      writeActiveTopicsReports(OUT, result);
      // eslint-disable-next-line no-console
      console.log(`active-topics → ${OUT}  (active ${result.active.length}, suggested ${result.suggested.length})`);
    },
    30 * 60_000,
  );
});
