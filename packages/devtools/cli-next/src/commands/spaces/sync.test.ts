//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, it } from '@effect/vitest';

import { TestLogger } from '../../testing';

describe('spaces sync', () => {
  const testLogger = new TestLogger();

  beforeEach(() => {
    testLogger.clear();
  });

  // TODO(wittjosiah): Need to create a mock edge to sync with.
  it.todo('should sync a synced space');
  it.todo('should sync an unsynced space');
  it.todo('should sync a missing space');
});
