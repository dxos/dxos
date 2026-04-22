//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: SheetPlugin pulls in @dxos/vendor-hyperformula transitively (via @dxos/compute);
// that package has no valid node entrypoint so the test file cannot be loaded under vitest
// node environment.
describe.skip('SheetPlugin', () => {
  test('placeholder', () => {});
});
