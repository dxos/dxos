//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { Operation } from '@dxos/compute';

import { ProjectOperationHandlerSet } from './index';

describe('operation serialization', () => {
  // Remote hosts (edge operation-service) build a `PersistentOperation` record for every
  // registered handler before invoking any of them, so an operation that cannot serialize breaks
  // the whole registry — not just its own verb.
  test('every handler serializes into a PersistentOperation record', async ({ expect }) => {
    const handlers = await ProjectOperationHandlerSet.getHandlers();
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

  // The projection marker must survive serialization: the edge reads it off the operation
  // registry rather than a curated table (MILESTONE-5.md §7.4).
  test('MCP-projected verbs carry their annotation through serialize', async ({ expect }) => {
    const handlers = await ProjectOperationHandlerSet.getHandlers();
    const projected = handlers
      .map((handler) => Operation.getMcpTool(Operation.serialize(handler)))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined)
      .map((tool) => tool.name)
      .sort();

    expect(projected).toEqual(['projectGet', 'projectList', 'projectUpdate']);
  });
});
