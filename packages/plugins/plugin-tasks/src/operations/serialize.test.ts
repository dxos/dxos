//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import * as Operation from '@dxos/compute/Operation';

import { TasksOperationHandlerSet } from '#operations';

describe('operation serialization', () => {
  // Remote hosts (edge operation-service) build a `PersistentOperation` record for every
  // registered handler before invoking any of them, so an operation that cannot serialize breaks
  // the whole registry — not just its own verb.
  test('every handler serializes into a PersistentOperation record', async ({ expect }) => {
    const handlers = await TasksOperationHandlerSet.handlers.getHandlers();
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

  // A remote host derives the MCP hints (readOnly/destructive) from the registry record, so the
  // mutation marker must survive serialization.
  test('mutation annotations survive serialize', async ({ expect }) => {
    const handlers = await TasksOperationHandlerSet.handlers.getHandlers();
    const annotated = Object.fromEntries(
      handlers
        .map((handler): [string | undefined, Operation.Mutation | undefined] => [
          String(handler.meta.key).split('.').at(-1),
          Operation.getMutation(Operation.serialize(handler)),
        ])
        .filter(([, mutation]) => mutation !== undefined),
    );

    expect(annotated).toEqual({
      create: 'write',
      createMilestone: 'write',
      delete: 'destructive',
      deleteMilestone: 'destructive',
      getOutline: 'none',
      list: 'none',
      listMilestone: 'none',
      move: 'write',
      moveMilestone: 'write',
      update: 'write',
      updateOutline: 'write',
    });
  });
});
