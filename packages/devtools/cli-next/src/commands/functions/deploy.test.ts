//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, it } from '@effect/vitest';

import { TestLogger } from '../../testing';

describe('functions deploy', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  // TODO(wittjosiah): Need to create a mock edge to accept the function request.
  it.todo('should deploy a function');
});
