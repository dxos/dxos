//
// Copyright 2026 DXOS.org
//

import { composeStories } from '@storybook/react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Tag } from '@dxos/echo';

import { OBJECT_PROPERTIES_DEBUG_SYMBOL } from '../testing';
import * as stories from './ObjectProperties.stories';
import { type ObjectPropertiesDebug } from './ObjectProperties.stories';

const { CreateTagPlay, CreateRefArrayPlay } = composeStories(stories);

const getDebug = (): ObjectPropertiesDebug => {
  const debug = (window as any)[OBJECT_PROPERTIES_DEBUG_SYMBOL] as ObjectPropertiesDebug | undefined;
  expect(debug).toBeDefined();
  return debug!;
};

describe('ObjectProperties — inline create flow', () => {
  afterEach(() => {
    cleanup();
    delete (window as any)[OBJECT_PROPERTIES_DEBUG_SYMBOL];
  });

  test('Tag.Tag: Create + Save persists tag and assigns it to the object', { timeout: 30_000 }, async () => {
    await CreateTagPlay.run();
    const { db, object } = getDebug();

    // The new Tag should exist in the DB.
    const tags = (await db.query(Filter.type(Tag.Tag)).run()) as Tag.Tag[];
    const created = tags.find((tag) => tag.label === 'PinnedTag');
    expect(created, 'new Tag.Tag with label "PinnedTag" should be in the database').toBeDefined();

    // And its DXN should be on `object.meta.tags`.
    const meta = Obj.getMeta(object);
    expect(meta.tags ?? []).toContain(Obj.getDXN(created!).toString());
  });

  test(
    'non-Tag ref-array: Create + Save assigns the new ref to the array slot',
    { timeout: 30_000 },
    async () => {
      await CreateRefArrayPlay.run();
      const { db, object } = getDebug();

      // The new Author should exist in the DB.
      const authors = (await db.query(Filter.typename('org.dxos.test.author' as any)).run()) as any[];
      const created = authors.find((author: any) => author.name === 'Ada Lovelace');
      expect(created, 'new Author with name "Ada Lovelace" should be in the database').toBeDefined();

      // And the article's authors array should contain a Ref to it. This is the
      // assertion that fails today — handleCreate persists the object but never
      // wires the new ref into the array slot.
      const article = object as any;
      expect(article.authors ?? [], 'article.authors should contain a single Ref').toHaveLength(1);
      expect(
        article.authors[0]?.dxn?.toString(),
        'article.authors[0] should reference the newly-created Author',
      ).toBe(Obj.getDXN(created!).toString());
    },
  );
});
