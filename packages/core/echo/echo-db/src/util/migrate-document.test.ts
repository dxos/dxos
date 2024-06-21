//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as am } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import { migrateDocument } from './migrate-document';

describe('migrateDocument', () => {
  test('migrates strings', () => {
    const source = { text: 'Hello, world!', version: 1 };
    const target = { text: 'Hello, DXOS!', version: 2 };

    const migrated = migrateDocument(am.from(source), target);
    expect(migrated).to.deep.eq(target);
  });

  test('preserves text cursors', () => {
    const source = am.from({ content: { text: 'Hello, world!' }, version: 1 });
    const cursor = am.getCursor(source, ['content', 'text'], 7);
    expect(am.getCursorPosition(source, ['content', 'text'], cursor)).to.eq(7);

    const migrated = migrateDocument(source, { content: { text: 'Hello, world!' }, version: 2 });
    expect(am.getCursorPosition(migrated, ['content', 'text'], cursor)).to.eq(7);
  });

  // TODO(dmaretskyi): This requires using `am.updateText`.
  test('preserves text cursors in unchanged portions of strings');

  test('migrates nested objects', () => {
    const source = { content: { text: 'Hello, world!', done: false }, version: 1 };
    const target = { content: { text: 'Hello, world!', done: true }, version: 2 };

    const migrated = migrateDocument(am.from(source), target);
    expect(migrated).to.deep.eq(target);
  });

  test('migrates arrays', () => {
    const source = {
      content: [
        { text: 'Hello, world!', done: false },
        { text: 'Lorem ipsum', done: true },
      ],
      version: 1,
    };
    const target = {
      content: [
        { text: 'Hello, world!', done: true },
        { text: 'Lorem ipsum', done: false },
      ],
      version: 2,
    };

    const migrated = migrateDocument(am.from(source), target);
    expect(migrated).to.deep.eq(target);
    expect(migrated.content.length).to.eq(2);
  });

  test('creates new arrays on migration', () => {
    const source = {
      version: 1,
    };
    const target = {
      content: [
        { text: 'Hello, world!', done: true },
        { text: 'Lorem ipsum', done: false },
      ],
      version: 2,
    };

    const migrated = migrateDocument(am.from(source), target);
    expect(migrated).to.deep.eq(target);
    expect(migrated.content.length).to.eq(2);
  });
});
