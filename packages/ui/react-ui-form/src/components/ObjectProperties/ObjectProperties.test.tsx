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

const { CreateTagPlay, CreateRefArrayPlay, CreateHiddenFieldPlay } = composeStories(stories);

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

    // And `object.meta.tags` should contain a DXN that resolves to that tag.
    // Compare by the DXN's object-id tail since refs may be stored as relative
    // (`dxn:echo:@:<id>`) or absolute (`dxn:echo:<spaceId>:<id>`) forms.
    const meta = Obj.getMeta(object);
    const createdId = (created as any).id as string;
    const matched = (meta.tags ?? []).some((dxn) => dxn.endsWith(`:${createdId}`));
    expect(matched, "meta.tags should contain a DXN ending with the new tag's id").toBe(true);
  });

  test('non-Tag ref-array: Create + Save assigns the new ref to the array slot', { timeout: 30_000 }, async () => {
    await CreateRefArrayPlay.run();
    const { db, object } = getDebug();

    // The new Author should exist in the DB.
    const authors = (await db.query(Filter.typename('org.dxos.test.author' as any)).run()) as any[];
    const created = authors.find((author: any) => author.name === 'Ada Lovelace');
    expect(created, 'new Author with name "Ada Lovelace" should be in the database').toBeDefined();

    // And the article's authors array should contain a Ref to it. This is the
    // assertion that fails before the fix — handleCreate persists the object
    // but never wires the new ref into the array slot.
    const article = object as any;
    expect(article.authors ?? [], 'article.authors should contain a single Ref').toHaveLength(1);
    // Compare by DXN tail to be agnostic to relative vs absolute Ref form.
    const createdId = (created as any).id as string;
    expect(
      article.authors[0]?.dxn?.toString().endsWith(`:${createdId}`),
      'article.authors[0] should reference the newly-created Author',
    ).toBe(true);
  });

  test(
    'hidden required field via FactoryAnnotation: Create + Save closes form and assigns ref',
    { timeout: 30_000 },
    async () => {
      await CreateHiddenFieldPlay.run();
      const { db, object } = getDebug();

      // The new Note should exist in the DB with the synthesised signature.
      const notes = (await db.query(Filter.typename('org.dxos.test.note' as any)).run()) as any[];
      const created = notes.find((note: any) => note.title === 'Ideas');
      expect(created, 'new Note with title "Ideas" should be in the database').toBeDefined();
      expect((created as any).signature, 'FactoryAnnotation should have populated the hidden `signature` field').toBe(
        'auto-generated',
      );

      // The notebook's notes array should reference the new Note.
      const notebook = object as any;
      expect(notebook.notes ?? [], 'notebook.notes should contain a single Ref').toHaveLength(1);
      const createdId = (created as any).id as string;
      expect(
        notebook.notes[0]?.dxn?.toString().endsWith(`:${createdId}`),
        'notebook.notes[0] should reference the newly-created Note',
      ).toBe(true);

      // The picker's create form should be gone.
      expect(
        document.querySelector('[data-testid="create-referenced-object-form"]'),
        'create form should be dismissed after a successful save',
      ).toBeNull();
    },
  );
});
