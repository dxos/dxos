//
// Copyright 2026 DXOS.org
//

import { afterAll } from 'vitest';

import { closeTestLogSink, ensureTestLogSink } from './sink';

ensureTestLogSink();

afterAll(() => {
  closeTestLogSink();
});
