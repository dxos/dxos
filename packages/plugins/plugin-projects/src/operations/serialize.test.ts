//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import * as Operation from '@dxos/compute/Operation';

import { ProjectOperationHandlerSet } from '#operations';

describe('operation serialization', () => {
  // Remote hosts (edge operation-service) build a `PersistentOperation` record for every
  // registered handler before invoking any of them, so an operation that cannot serialize breaks
  // the whole registry — not just its own verb.
  test('every handler serializes into a PersistentOperation record', async ({ expect }) => {
    const handlers = await ProjectOperationHandlerSet.handlers.getHandlers();
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

  // An unclassified operation reaches an MCP client badged as possibly destructive.
  test('every handler declares a mutation class, and it survives serialize', async ({ expect }) => {
    const handlers = await ProjectOperationHandlerSet.handlers.getHandlers();
    const classified = Object.fromEntries(
      handlers.map((handler) => [String(handler.meta.key), Operation.getMutation(Operation.serialize(handler))]),
    );

    expect(Object.entries(classified).filter(([, mutation]) => mutation === undefined)).toEqual([]);
    expect(classified['dxn:org.dxos.operation.projects.create']).toBe('write');
    expect(classified['dxn:org.dxos.operation.projects.get']).toBe('none');
    expect(classified['dxn:org.dxos.operation.projects.addArtifact']).toBe('write');
    expect(classified['dxn:org.dxos.operation.projects.listArtifact']).toBe('none');
  });
});
