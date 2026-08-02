//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { Operation } from '@dxos/compute';

import { TasksOperationHandlerSet } from './index';

describe('operation serialization', () => {
  // Remote hosts (edge operation-service) build a `PersistentOperation` record for every
  // registered handler before invoking any of them, so an operation that cannot serialize breaks
  // the whole registry — not just its own verb.
  test('every handler serializes into a PersistentOperation record', async ({ expect }) => {
    const handlers = await TasksOperationHandlerSet.getHandlers();
    expect(handlers.length).toBeGreaterThan(0);
    const failures = handlers
      .filter((handler) => {
        try {
          Operation.serialize(handler);
          return false;
        } catch {
          return true;
        }
      })
      .map((handler) => String(handler.meta.key));

    expect(failures).toEqual([]);
  });
});
