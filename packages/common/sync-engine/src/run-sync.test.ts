//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { runSync } from './run-sync';

type Ext = { id: string; value: number };
type Stored = { key: string; value: number };

describe('runSync', () => {
  test('invokes effects in create → update → remove order', async ({ expect }) => {
    const calls: string[] = [];
    const summary = await runSync<Ext, Stored>({
      fetchExternal: async () => [
        { id: 'a', value: 1 },
        { id: 'b', value: 2 },
      ],
      loadStored: async () => [
        { key: 'b', value: 1 },
        { key: 'c', value: 1 },
      ],
      externalId: (it) => it.id,
      storedExternalId: (it) => it.key,
      effects: {
        create: async (ext) => {
          calls.push(`create:${ext.id}`);
          return { key: ext.id, value: ext.value };
        },
        update: async (ext) => {
          calls.push(`update:${ext.id}`);
        },
        remove: async (stored) => {
          calls.push(`remove:${stored.key}`);
        },
      },
    });

    expect(calls).toEqual(['create:a', 'update:b', 'remove:c']);
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.removed).toBe(1);
  });

  test('calls onSynced with a Date on success', async ({ expect }) => {
    const onSynced = vi.fn();
    await runSync<Ext, Stored>({
      fetchExternal: async () => [],
      loadStored: async () => [],
      externalId: (it) => it.id,
      storedExternalId: (it) => it.key,
      effects: {
        create: () => ({ key: '', value: 0 }),
        update: () => {},
        remove: () => {},
      },
      onSynced,
    });
    expect(onSynced).toHaveBeenCalledTimes(1);
    expect(onSynced.mock.calls[0]?.[0]).toBeInstanceOf(Date);
  });

  test('propagates errors from fetchExternal', async ({ expect }) => {
    await expect(
      runSync<Ext, Stored>({
        fetchExternal: async () => {
          throw new Error('upstream 500');
        },
        loadStored: async () => [],
        externalId: (it) => it.id,
        storedExternalId: (it) => it.key,
        effects: {
          create: () => ({ key: '', value: 0 }),
          update: () => {},
          remove: () => {},
        },
      }),
    ).rejects.toThrow(/upstream 500/);
  });

  test('equal() short-circuits updates', async ({ expect }) => {
    const update = vi.fn();
    const summary = await runSync<Ext, Stored>({
      fetchExternal: async () => [{ id: 'a', value: 1 }],
      loadStored: async () => [{ key: 'a', value: 1 }],
      externalId: (it) => it.id,
      storedExternalId: (it) => it.key,
      equal: (ext, sto) => ext.value === sto.value,
      effects: {
        create: () => ({ key: '', value: 0 }),
        update,
        remove: () => {},
      },
    });
    expect(update).not.toHaveBeenCalled();
    expect(summary.unchanged).toBe(1);
    expect(summary.updated).toBe(0);
  });
});
