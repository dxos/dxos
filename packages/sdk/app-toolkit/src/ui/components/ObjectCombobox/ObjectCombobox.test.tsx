//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, test, vi } from 'vitest';

import { Collection, Database, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

import * as ObjectCombobox from './ObjectCombobox.tsx';

// React's act() warns unless the environment says it is a test.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('search query', () => {
  test('searchFilter emits a full-text text-search node', ({ expect }) => {
    expect(ObjectCombobox.searchFilter('invoice').ast).toMatchObject({
      type: 'text-search',
      text: 'invoice',
      searchKind: 'full-text',
    });
  });

  test('searchQuery is empty for blank input', ({ expect }) => {
    // `Filter.nothing()` is a negated match-all.
    expect(ObjectCombobox.searchQuery(undefined).ast).toMatchObject({ type: 'select', filter: { type: 'not' } });
    expect(ObjectCombobox.searchQuery('  ').ast).toMatchObject({ type: 'select', filter: { type: 'not' } });
  });

  test('searchQuery scopes the text search to the given type URIs', ({ expect }) => {
    const typeUri = Type.getURI(Collection.Collection);
    expect(ObjectCombobox.searchQuery('invoice', [typeUri]).ast).toMatchObject({
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

  test('searchQuery with an empty type scope matches nothing', ({ expect }) => {
    // An unresolved (empty) scope must not fall back to an unscoped search.
    expect(ObjectCombobox.searchQuery('invoice', []).ast).toMatchObject({ type: 'select', filter: { type: 'not' } });
  });

  test('byRelevance ranks exact, then prefix, then substring, then length', ({ expect }) => {
    const items = [{ label: 'Alicia' }, { label: 'Al' }, { label: 'Sal' }, { label: 'al' }];
    expect([...items].sort(ObjectCombobox.byRelevance('al')).map((item) => item.label)).toEqual([
      'al',
      'Al',
      'Alicia',
      'Sal',
    ]);
  });
});

describe('objectLabel', () => {
  const t: ObjectCombobox.OptionsProps['t'] = (key, { ns }) => `${key}:${ns}`;

  test('labels an object by its name', ({ expect }) => {
    expect(ObjectCombobox.objectLabel(Collection.make({ name: 'Reading' }), t)).toBe('Reading');
  });

  test('labels an unnamed object by the placeholder of its type', ({ expect }) => {
    const collection = Collection.make();
    expect(ObjectCombobox.objectLabel(collection, t)).toBe(
      `object-name.placeholder:${Type.getTypename(Collection.Collection)}`,
    );
  });
});

describe('useSearch', () => {
  const mountSearch = async (db: Database.Database) => {
    let search: ((text: string) => Promise<ObjectCombobox.SearchOption[] | undefined>) | undefined;
    const Probe = () => {
      search = ObjectCombobox.useSearch(db, { delay: 20 });
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => root.render(<Probe />));
    return { search: (text: string) => search!(text), unmount: () => act(async () => root.unmount()) };
  };

  test('a term is searched once typing pauses, and a superseded keystroke reports nothing', async ({ expect }) => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const query = vi.spyOn(db, 'query');
      const { search, unmount } = yield* Effect.promise(() => mountSearch(db));
      query.mockClear();

      const [first, second] = yield* Effect.promise(() => Promise.all([search('roa'), search('road')]));
      expect(first).toBeUndefined();
      expect(second).toEqual([]);
      expect(query).toHaveBeenCalledTimes(1);
      yield* Effect.promise(() => unmount());
    })
      .pipe(Effect.provide(TestDatabaseLayer()))
      .pipe(Effect.runPromise);
  });

  test('an empty term lists the space at once', async ({ expect }) => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const query = vi.spyOn(db, 'query');
      const { search, unmount } = yield* Effect.promise(() => mountSearch(db));
      query.mockClear();

      expect(yield* Effect.promise(() => search(''))).toEqual([]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toMatchObject({ ast: { type: 'select', filter: { type: 'object' } } });
      yield* Effect.promise(() => unmount());
    })
      .pipe(Effect.provide(TestDatabaseLayer()))
      .pipe(Effect.runPromise);
  });

  test('the index is drained once as the menu opens, before a term is searched', async ({ expect }) => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const calls: string[] = [];
      vi.spyOn(db, 'flush').mockImplementation(async () => {
        calls.push('flush');
      });
      const query = db.query.bind(db);
      vi.spyOn(db, 'query').mockImplementation(((...args: Parameters<typeof db.query>) => {
        calls.push('query');
        return query(...args);
      }) as typeof db.query);
      const { search, unmount } = yield* Effect.promise(() => mountSearch(db));
      calls.length = 0;

      yield* Effect.promise(() => search(''));
      yield* Effect.promise(() => search('roa'));
      yield* Effect.promise(() => search('road'));
      expect(calls).toEqual(['flush', 'query', 'query', 'query']);
      expect(db.flush).toHaveBeenCalledWith({ secondaryIndexes: true });
      yield* Effect.promise(() => unmount());
    })
      .pipe(Effect.provide(TestDatabaseLayer()))
      .pipe(Effect.runPromise);
  });

  test('a term search does not wait on a drain that does not finish', async ({ expect }) => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      vi.spyOn(db, 'flush').mockImplementation(() => new Promise(() => {}));
      const { search, unmount } = yield* Effect.promise(() => mountSearch(db));

      yield* Effect.promise(() => search(''));
      const result = yield* Effect.promise(() =>
        Promise.race([search('road'), new Promise((resolve) => setTimeout(() => resolve('timed out'), 2_000))]),
      );
      expect(result).toEqual([]);
      yield* Effect.promise(() => unmount());
    })
      .pipe(Effect.provide(TestDatabaseLayer()))
      .pipe(Effect.runPromise);
  });
});

describe('useDrainedSearchIndex', () => {
  test('drains the index once as a search view opens', async ({ expect }) => {
    await Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const flush = vi.spyOn(db, 'flush');
      const Probe = () => {
        ObjectCombobox.useDrainedSearchIndex(db);
        return null;
      };
      const root = createRoot(document.createElement('div'));
      yield* Effect.promise(() => act(async () => root.render(<Probe />)));
      yield* Effect.promise(() => act(async () => root.render(<Probe />)));
      expect(flush.mock.calls).toEqual([[{ secondaryIndexes: true }]]);
      yield* Effect.promise(() => act(async () => root.unmount()));
    })
      .pipe(Effect.provide(TestDatabaseLayer()))
      .pipe(Effect.runPromise);
  });
});
