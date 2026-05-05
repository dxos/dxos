//
// Copyright 2026 DXOS.org
//

import { Operation } from '@dxos/compute';

export const Open = Operation.make({
  meta: {
    key: 'com.example.fixture.open',
    name: 'Open Fixture',
    description: 'Opens a fixture document.',
  },
});

export const Close = Operation.make({
  meta: {
    key: 'com.example.fixture.close',
    name: 'Close Fixture',
  },
});
