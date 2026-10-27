//
// Copyright 2026 DXOS.org
//

import { statSync } from 'node:fs';

import { BASE_URL, defineScenario } from '../perf/scenario.ts';
import { importProfileArchive, soakStages } from './memory-soak.ts';

/** A `.dxprofile` export to load. It holds private keys: named by path and never copied. */
const ARCHIVE = process.env.DX_PERF_PROFILE_ARCHIVE;

// `DX_PERF_PROFILE_ARCHIVE=<file> pnpm perf run --scenario memory-profile --offline` runs it.
defineScenario({
  flow: 'memory-profile',
  reproduces:
    "The desktop app's content process holds about 2.4 GB on the reporter's own profile, more than any other process on the machine (2026-10-13).",
  scale: ARCHIVE ? `archive=${Math.round(statSync(ARCHIVE).size / 1e6)}MB` : 'no-archive',
  timeoutMs: 45 * 60_000,
  privateData: true,
  persistentProfile: true,
  navigates: true,
  prepare: async (page) => {
    if (!ARCHIVE) {
      throw new Error('set DX_PERF_PROFILE_ARCHIVE to the .dxprofile to load');
    }
    await importProfileArchive(page, BASE_URL, ARCHIVE);
  },
  fixture: async () => {},
  stages: soakStages,
});
