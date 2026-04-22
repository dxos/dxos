//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: PwaPlugin imports virtual:pwa-register which is a Vite build-time virtual module
// only available in browser builds with vite-plugin-pwa, so the test file cannot be loaded
// under vitest node environment.
describe.skip('PwaPlugin', () => {
  test('placeholder', () => {});
});
