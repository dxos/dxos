//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, it } from '@effect/vitest';

import { TestLogger } from '../../../testing';

describe('halo join', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  // TODO(wittjosiah): Need to be able to test prompts.
  it.todo('should accept an invitation code');
});
