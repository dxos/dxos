//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { SpaceOperationHandlerSet } from '#operations';

/** Keys of the verbs a remote host projects as MCP tools; the rest are app-only and need not serialize. */
const PROJECTED_KEYS = [
  'org.dxos.operation.space.addObject',
  'org.dxos.operation.space.addRelation',
  'org.dxos.operation.space.addTag',
  'org.dxos.operation.space.addType',
  'org.dxos.operation.space.getObjects',
  'org.dxos.operation.space.queryObjects',
  'org.dxos.operation.space.queryTypes',
  'org.dxos.operation.space.removeObjects',
  'org.dxos.operation.space.removeTag',
  'org.dxos.operation.space.updateObject',
];

describe('operation serialization', () => {
  // A projected verb whose schema stops rendering as JSON Schema silently leaves the tool surface.
  test('every projected verb serializes into a PersistentOperation record', async ({ expect }) => {
    const handlers = await SpaceOperationHandlerSet.handlers.getHandlers();
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

  // The draft branch is a struct with an open rest signature; losing `additionalProperties` on the
  // wire made the round-trip rebuild it closed, so every field beyond `@type` was silently dropped
  // before the handler ran.
  test('the addObject draft keeps its open rest signature on the wire', async ({ expect }) => {
    const handlers = await SpaceOperationHandlerSet.handlers.getHandlers();
    const addObject = handlers.find(
      (handler) => DXN.getName(handler.meta.key) === 'org.dxos.operation.space.addObject',
    );
    invariant(addObject);
    const record = Operation.serialize(addObject);
    const branches = record.inputSchema?.properties?.object?.anyOf ?? [];
    const draft = branches.find((branch) => branch.properties?.['@type'] != null);
    expect(draft?.additionalProperties).toBe(true);
  });

  test('projected verbs carry their mutation class through serialize', async ({ expect }) => {
    const handlers = await SpaceOperationHandlerSet.handlers.getHandlers();
    const projected = handlers
      .filter((handler) => PROJECTED_KEYS.includes(DXN.getName(handler.meta.key)))
      .map((handler) => {
        const record = Operation.serialize(handler);
        return [DXN.getName(handler.meta.key).split('.').at(-1) ?? '', Operation.getMutation(record)] as const;
      })
      .sort(([a], [b]) => a.localeCompare(b));

    expect(projected).toEqual([
      ['addObject', 'write'],
      ['addRelation', 'write'],
      ['addTag', 'write'],
      ['addType', 'write'],
      ['getObjects', 'none'],
      ['queryObjects', 'none'],
      ['queryTypes', 'none'],
      ['removeObjects', 'destructive'],
      ['removeTag', 'write'],
      ['updateObject', 'write'],
    ]);
  });
});
