//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN, JsonSchema, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import type { PluginProtocol } from '@dxos/protocols';

import * as TypeSource from './TypeSource.ts';

const PERSON = Type.getTypename(TestSchema.Person);

/** A registry that holds one type, counts what it is asked, and fails while `failing` is set. */
const makeRegistry = () => {
  const requests: string[] = [];
  const state = { failing: false };
  const registry: PluginProtocol.TypeRegistry = {
    resolveType: async (typename) => {
      requests.push(typename);
      if (state.failing) {
        throw new Error('The registry is unavailable.');
      }
      return typename === PERSON
        ? { typename, version: '0.1.0', jsonSchema: JsonSchema.toJsonSchema(TestSchema.Person) }
        : undefined;
    },
  };
  return { registry, requests, state };
};

// Each invocation builds its own type source; the isolate's cache outlives it (EDGE-PLUGINS F-3.8).
describe('TypeSource', () => {
  test.fails('two invocations resolving one type ask the registry once', async ({ expect }) => {
    const { registry, requests } = makeRegistry();
    const cache = TypeSource.makeCache();
    for (let invocation = 0; invocation < 2; invocation++) {
      const type = await TypeSource.fromRegistry(registry, cache)(DXN.make(PERSON));
      expect(type).toBeDefined();
    }
    expect(requests).toEqual([PERSON]);
  });

  test('neither an unknown type nor a failure is cached', async ({ expect }) => {
    const { registry, requests, state } = makeRegistry();
    const cache = TypeSource.makeCache();
    const source = TypeSource.fromRegistry(registry, cache);
    expect(await source(DXN.make('org.example.type.unknown'))).toBeUndefined();
    expect(await source(DXN.make('org.example.type.unknown'))).toBeUndefined();
    state.failing = true;
    await expect(source(DXN.make(PERSON))).rejects.toThrow('unavailable');
    state.failing = false;
    expect(await source(DXN.make(PERSON))).toBeDefined();
    expect(requests).toEqual(['org.example.type.unknown', 'org.example.type.unknown', PERSON, PERSON]);
  });

  test.fails('holds a bounded number of types, dropping the least recently used', async ({ expect }) => {
    const cache = TypeSource.makeCache({ capacity: 2 });
    const record = (typename: string): PluginProtocol.TypeRecord => ({ typename, version: '0.1.0', jsonSchema: {} });
    cache.set('a', record('a'));
    cache.set('b', record('b'));
    expect(cache.get('a')).toBeDefined();
    cache.set('c', record('c'));
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBeDefined();
    expect(cache.get('c')).toBeDefined();
  });
});
