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

  // The safety marker must survive serialization: a remote host derives the MCP hints
  // (readOnly/destructive) from the registry record rather than a curated table
  // (MILESTONE-5.md §7.4). Inclusion itself is skill-driven and not tested here.
  test('mutation annotations survive serialize', async ({ expect }) => {
    const handlers = await ProjectOperationHandlerSet.handlers.getHandlers();
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
      projectGet: 'none',
      projectList: 'none',
      projectUpdate: 'write',
    });
  });

  // `create` is the one verb whose key segment is too generic for a tool name, so its
  // `mcpTool({ name })` override is load-bearing and must reach the remote registry.
  test('the projectCreate name override survives serialize', async ({ expect }) => {
    const handlers = await ProjectOperationHandlerSet.handlers.getHandlers();
    const create = handlers.find((handler) => String(handler.meta.key).endsWith('.operation.create'));
    expect(create).toBeDefined();
    const tool = create && Operation.getMcpTool(Operation.serialize(create));
    expect(tool?.name).toEqual('projectCreate');
  });
});
