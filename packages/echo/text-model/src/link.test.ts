//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createTestInstance } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { TextModel } from './text-model';

// TODO(burdon): Replace with echo-testing.
const OBJECT_EDITOR = 'dxn://example/object/editor';
const TEXT_CONTENT = 'dxn://example/text/content';

test('directed links between ObjectModel and TextModel', async () => {
  const echo = await createTestInstance({ initialize: true });
  await echo.modelFactory.registerModel(TextModel);
  const { database } = await echo.createParty();

  const doc = await database.createItem({ model: ObjectModel, type: OBJECT_EDITOR, props: { title: 'doc1' } });

  const content = await database.createItem({ model: TextModel, type: TEXT_CONTENT, parent: doc.id });

  await database.createLink({ source: doc, target: content });

  expect(doc.children.length).toEqual(1);
  expect(content.parent?.id).toEqual(doc.id);

  expect(doc.links.length).toEqual(1);
  expect(content.refs.length).toEqual(1);

  await echo.close();
});
