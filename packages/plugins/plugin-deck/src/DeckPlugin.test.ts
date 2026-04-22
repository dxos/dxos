//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: DeckPlugin imports browser-only modules (@dxos/react-ui-dnd transitively through
// @dxos/react-ui-stack/StackItem) that cannot be loaded under vitest node environment.
describe.skip('DeckPlugin', () => {
  test('placeholder', () => {});
});
