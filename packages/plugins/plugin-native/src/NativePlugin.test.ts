//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// Skipped: NativePlugin imports from @dxos/plugin-assistant, which pulls in browser-only
// CSS (atlaskit pragmatic-drag-and-drop) that cannot be loaded under vitest node environment.
describe.skip('NativePlugin', () => {
  test('placeholder', () => {});
});
