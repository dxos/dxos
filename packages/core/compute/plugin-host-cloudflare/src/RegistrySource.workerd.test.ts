//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter, JsonSchema, Query, type Registry, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import type { PluginProtocol } from '@dxos/protocols';

import * as RegistrySource from './RegistrySource.ts';

const PERSON = Type.getTypename(TestSchema.Person);

/** EDGE's registry listing `types`, with no skills or operation records. */
const makeRegistry = (types: PluginProtocol.TypeRecord[]): PluginProtocol.Registry => ({
  resolveType: async (typename) => types.find((type) => type.typename === typename),
  listTypes: async () => types,
  listSkills: async () => ({ skills: [], operations: [] }),
});

const own: RegistrySource.Own = { skills: new Set(), operations: new Set() };

/** What `source` enumerates for `query`; a source that cannot enumerate answers nothing. */
const enumerate = (source: Registry.Source, query: Query.Any) => source.query?.(query) ?? Promise.resolve([]);

describe('RegistrySource', () => {
  test('a query for every type lists the types EDGE publishes', async ({ expect }) => {
    const source = RegistrySource.fromRegistry(
      makeRegistry([{ typename: PERSON, version: '0.1.0', jsonSchema: JsonSchema.toJsonSchema(TestSchema.Person) }]),
      own,
    );
    const types = await enumerate(source, Query.select(Filter.type(Type.Type)));
    expect(types.flatMap((type) => (Type.isType(type) ? [Type.getTypename(type)] : []))).toEqual([PERSON]);
  });

  test('a type whose schema cannot be rebuilt costs only that type, not the listing', async ({ expect }) => {
    const source = RegistrySource.fromRegistry(
      makeRegistry([
        { typename: 'com.example.type.broken', version: '0.1.0', jsonSchema: { type: 42 } },
        { typename: PERSON, version: '0.1.0', jsonSchema: JsonSchema.toJsonSchema(TestSchema.Person) },
      ]),
      own,
    );
    const types = await enumerate(source, Query.select(Filter.type(Type.Type)));
    expect(types.flatMap((type) => (Type.isType(type) ? [Type.getTypename(type)] : []))).toEqual([PERSON]);
  });

  test('a query for something it does not enumerate answers nothing', async ({ expect }) => {
    const source = RegistrySource.fromRegistry(
      makeRegistry([{ typename: PERSON, version: '0.1.0', jsonSchema: JsonSchema.toJsonSchema(TestSchema.Person) }]),
      own,
    );
    expect(await enumerate(source, Query.select(Filter.type(TestSchema.Person)))).toEqual([]);
  });
});
