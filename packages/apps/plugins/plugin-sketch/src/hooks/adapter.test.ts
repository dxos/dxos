//
// Copyright 2024 DXOS.org
//

// import { createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

describe.skip('storage adapter', () => {
  test('migration', async () => {
    // TODO(burdon): Browser-only tests?
    const { createTLStore, defaultShapeUtils } = await import('@tldraw/tldraw');
    const store = createTLStore({ shapeUtils: defaultShapeUtils });
    expect(store.schema.currentStoreVersion).to.eq(4);
    expect(true).to.be.true;
  });
});
