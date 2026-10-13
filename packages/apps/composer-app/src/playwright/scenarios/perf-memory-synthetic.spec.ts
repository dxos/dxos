//
// Copyright 2026 DXOS.org
//

import { SCALE, createProjectsFixture, scaleLabel } from '../perf/fixture.ts';
import { defineScenario } from '../perf/scenario.ts';
import { soakStages } from './memory-soak.ts';

// The control for `memory-profile`: the same soak on the projects fixture, run connected and with
// `--offline`, so the cost of being offline is known before reading anything into the real profile.
defineScenario({
  flow: 'memory-synthetic',
  reproduces: 'Control for memory-profile: the same soak on generated data, connected and offline.',
  scale: scaleLabel(SCALE),
  timeoutMs: SCALE.tasks * 700 + 20 * 60_000,
  persistentProfile: true,
  navigates: true,
  fixture: async ({ page, runId }) => {
    await createProjectsFixture(page, SCALE, runId);
  },
  stages: soakStages,
});
