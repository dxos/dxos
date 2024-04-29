//
// Copyright 2024 DXOS.org
//

import { createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import { expect } from 'chai';
import { describe, test } from 'vitest';

// TODO(burdon): Named export 'EventEmitter' not found. (running vitest).
// TODO(burdon): TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" (running p test).
// TODO(burdon): Storybook broken: Cannot read properties of undefined (reading 'getDocAccessor')

describe('storage adapter', () => {
  test('migration', async () => {
    const store = createTLStore({ shapeUtils: defaultShapeUtils });
    expect(store.schema.currentStoreVersion).to.eq(4);
    expect(true).to.be.true;
  });
});
