//
// Copyright 2026 DXOS.org
//

import { SCALE, createProjectsFixture, scaleLabel } from '../perf/fixture.ts';
import { defineScenario } from '../perf/scenario.ts';
import { soakStages } from './memory-soak.ts';

/** Spaces the fixture fills (`DX_PERF_SYNTHETIC_SPACES`), each a project like the one `SCALE` shapes. */
const SPACES = Math.max(1, Number.parseInt(process.env.DX_PERF_SYNTHETIC_SPACES ?? '', 10) || 1);

// The control for `memory-profile`: the same soak on the projects fixture, run connected and with
// `--offline`, so the cost of being offline is known before reading anything into the real profile.
defineScenario({
  flow: 'memory-synthetic',
  reproduces: 'Control for memory-profile: the same soak on generated data, connected and offline.',
  scale: SPACES > 1 ? `${scaleLabel(SCALE)},spaces=${SPACES}` : scaleLabel(SCALE),
  timeoutMs: SPACES * SCALE.tasks * 700 + 20 * 60_000,
  persistentProfile: true,
  navigates: true,
  fixture: async ({ page, runId }) => {
    for (let space = 0; space < SPACES; space++) {
      await createProjectsFixture(page, SCALE, SPACES > 1 ? `${runId}-${space}` : runId);
    }
  },
  stages: soakStages,
});
