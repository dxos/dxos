//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: ThemePlugin react-context module accesses window (matchMedia) at activation
// time (Category A — browser-only runtime) and cannot activate under vitest node.
describe.skip('ThemePlugin', () => {
  test('placeholder', () => {});
});
