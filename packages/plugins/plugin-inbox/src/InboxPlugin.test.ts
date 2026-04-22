//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: InboxPlugin wires modules through browser-only #capabilities (AppGraphBuilder,
// ReactSurface, etc.) — the node subpath of #capabilities does not export these so
// instantiation fails the resolveModule invariant (Category A).
describe.skip('InboxPlugin', () => {
  test('placeholder', () => {});
});
