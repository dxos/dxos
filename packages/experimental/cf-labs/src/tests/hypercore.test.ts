//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';
import { HypercoreFactory } from '@dxos/hypercore';

test('hypercore', () => {
  const factory = new HypercoreFactory();
  const feed = factory.createFeed(Buffer.from('123'));
});
