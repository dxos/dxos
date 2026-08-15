//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import { SpaceOperationHandlerSet } from '#operations';

/**
 * Keys of the verbs a remote host projects as MCP tools. Everything else in this set drives the
 * app and is not required to survive serialization (`importSpace` carries a `Uint8Array`,
 * `snapshot` a `Blob`), so this asserts the projected subset rather than the whole registry.
 */
const PROJECTED_KEYS = [
  'org.dxos.plugin.space.operation.addObject',
  'org.dxos.plugin.space.operation.getObject',
  'org.dxos.plugin.space.operation.queryObjects',
  'org.dxos.plugin.space.operation.removeObjects',
  'org.dxos.plugin.space.operation.updateObject',
];

describe('operation serialization', () => {
  // A remote host builds a `PersistentOperation` for every registered handler before invoking any
  // of them, and drops (or trips over) the ones that cannot serialize — so a projected verb whose
  // schema stops rendering as JSON Schema silently leaves the tool surface.
  test('every projected verb serializes into a PersistentOperation record', async ({ expect }) => {
    const handlers = await SpaceOperationHandlerSet.getHandlers();
    const byKey = new Map(handlers.map((handler) => [DXN.getName(handler.meta.key), handler]));

    const failures: string[] = [];
    for (const key of PROJECTED_KEYS) {
      const handler = byKey.get(key);
      if (!handler) {
        failures.push(`${key}: not registered`);
        continue;
      }
      try {
        Operation.serialize(handler);
      } catch (error) {
        failures.push(`${key}: ${String(error)}`);
      }
    }

    expect(failures).toEqual([]);
  });

  test('projected verbs carry their mcpTool annotation through serialize', async ({ expect }) => {
    const handlers = await SpaceOperationHandlerSet.getHandlers();
    const projected = handlers
      .filter((handler) => PROJECTED_KEYS.includes(DXN.getName(handler.meta.key)))
      .map((handler) => Operation.getMcpTool(Operation.serialize(handler))?.name)
      .filter((name): name is string => name !== undefined)
      .sort();

    expect(projected).toEqual(['addObject', 'getObject', 'queryObjects', 'removeObjects', 'updateObject']);
  });
});
