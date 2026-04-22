//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: ClientPlugin wires module activators through browser-only #capabilities exports
// (NavigationHandler, ReactContext, ReactSurface, AppGraphBuilder, Migrations). The node
// subpath of #capabilities does not export these, so instantiating ClientPlugin({}) fails
// the resolveModule invariant before any test can run (Category A + Category E).
describe.skip('ClientPlugin', () => {
  describe('modules', () => {
    test('placeholder', () => {});
  });
});
