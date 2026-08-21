//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Collection, DXN, Obj, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/schema/testing';

import { buildSearchFilter, buildSearchQuery, byRelevance, toSearchResults } from './search-query';

/** A type declaring no `IconAnnotation`, to exercise the fallback. */
const Unadorned = Type.makeObject(DXN.make('com.example.type.unadorned', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
);

describe('search-query', () => {
  test('buildSearchFilter emits a full-text text-search node', ({ expect }) => {
    const filter = buildSearchFilter('invoice');
    expect(filter.ast.type).toBe('text-search');
    expect(filter.ast).toMatchObject({ type: 'text-search', text: 'invoice', searchKind: 'full-text' });
  });

  test('buildSearchQuery is empty for blank input', ({ expect }) => {
    // `Filter.nothing()` is a negated match-all.
    expect(buildSearchQuery(undefined).ast).toBeDefined();
    expect(buildSearchQuery('  ').ast).toBeDefined();
  });

  test('buildSearchQuery scopes the text search to the given type URIs', ({ expect }) => {
    const typeUri = Type.getURI(Collection.Collection);
    const query = buildSearchQuery('invoice', [typeUri]);
    expect(query.ast).toMatchObject({
      type: 'select',
      filter: {
        type: 'and',
        filters: [
          { type: 'text-search', text: 'invoice', searchKind: 'full-text' },
          { type: 'or', filters: [{ type: 'object', typename: typeUri }] },
        ],
      },
    });
  });

  test('buildSearchQuery with an empty type scope matches nothing', ({ expect }) => {
    // An unresolved (empty) scope must not fall back to an unscoped search.
    const query = buildSearchQuery('invoice', []);
    expect(query.ast).toMatchObject({ type: 'select', filter: { type: 'not' } });
  });

  test('toSearchResults takes each row icon from the type annotation', ({ expect }) => {
    // Regression: the icon came from a property-sniffing heuristic returning names like
    // 'organization', which are not sprite ids — the row rendered an empty icon box.
    const org = Obj.make(TestSchema.Organization, { name: 'Bramble Coffee Roasters' });
    const [result] = toSearchResults([org], 'bramble');
    expect(result.icon).toBe('ph--building--regular');
  });

  test('toSearchResults falls back to a default icon so every row has one', ({ expect }) => {
    const object = Obj.make(Unadorned, { name: 'Roast locked' });
    const [result] = toSearchResults([object], 'roast');
    expect(result.icon).toBe('ph--circle-dashed--regular');
  });

  test('byRelevance ranks exact, then prefix, then substring, then length', ({ expect }) => {
    const items = [{ label: 'Alicia' }, { label: 'Al' }, { label: 'Sal' }, { label: 'al' }];
    const sorted = [...items].sort(byRelevance('al'));
    expect(sorted.map((i) => i.label)).toEqual(['al', 'Al', 'Alicia', 'Sal']);
  });
});
