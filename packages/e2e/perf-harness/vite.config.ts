//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  // Node only: the collectors are exercised against real CDP by the flows themselves, so the unit
  // tests here cover the pure report/metric logic.
  test: { node: true },
});
