//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { migrateDocument } from './migrate-document';

describe('migrateDocument', () => {
  test('migrates strings', () => {
    const source = { text: 'Hello, world!', version: 1 };
    const target = { text: 'Hello, DXOS!', version: 2 };

    const migrated = migrateDocument(A.from(source), target);
    expect(migrated).to.deep.eq(target);
  });

  test('preserves text cursors', () => {
    const source = A.from({ content: { text: 'Hello, world!' }, version: 1 });
    const cursor = A.getCursor(source, ['content', 'text'], 7);
    expect(A.getCursorPosition(source, ['content', 'text'], cursor)).to.eq(7);

    const migrated = migrateDocument(source, { content: { text: 'Hello, world!' }, version: 2 });
    expect(A.getCursorPosition(migrated, ['content', 'text'], cursor)).to.eq(7);
  });

  // TODO(dmaretskyi): This requires using `am.updateText`.
  test('preserves text cursors in unchanged portions of strings');

  test('migrates nested objects', () => {
    const source = { content: { text: 'Hello, world!', done: false }, version: 1 };
    const target = { content: { text: 'Hello, world!', done: true }, version: 2 };

    const migrated = migrateDocument(A.from(source), target);
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

    const migrated = migrateDocument(A.from(source), target);
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

    const migrated = migrateDocument(A.from(source), target);
    expect(migrated).to.deep.eq(target);
    expect(migrated.content.length).to.eq(2);
  });
});
