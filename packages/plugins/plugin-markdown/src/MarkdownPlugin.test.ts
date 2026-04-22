//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: MarkdownPlugin wires modules through browser-only #capabilities that the node
// subpath does not export, so instantiation fails the resolveModule invariant (Category A).
describe.skip('MarkdownPlugin', () => {
  test('placeholder', () => {});
});
