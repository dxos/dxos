//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import { DatabaseDirectory, directoryJson } from './document-structure.ts';
import { SpaceDocVersion } from './space-doc-version.ts';

describe('DatabaseDirectory.getRetiredDocuments', () => {
  test('reads entries and skips malformed ones', ({ expect }) => {
    // Parsed rather than literal: a peer's directory is untrusted and need not match the type.
    const directory: DatabaseDirectory = JSON.parse(
      JSON.stringify({
        retired: {
          a: { replacedBy: 'automerge:x', reason: 'history' },
          b: { replacedBy: 'automerge:y' },
          c: { replacedBy: 'automerge:z', reason: 'unknown' },
          d: null,
          e: {},
        },
      }),
    );
    expect(DatabaseDirectory.getRetiredDocuments(directory)).toEqual([
      { documentId: 'a', replacedBy: 'automerge:x', reason: 'history' },
      { documentId: 'b', replacedBy: 'automerge:y', reason: 'load-failed' },
      { documentId: 'c', replacedBy: 'automerge:z', reason: 'load-failed' },
    ]);
  });
});

describe('directoryJson', () => {
  test('carries every field but inline objects', ({ expect }) => {
    const directory: DatabaseDirectory = {
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      links: { a: 'automerge:a' },
      branches: { a: { draft: { members: { a: 'automerge:b' } } } },
    };
    expect(JSON.parse(directoryJson(directory)!)).toEqual(directory);
  });

  test('is undefined for a directory with inline objects', ({ expect }) => {
    expect(directoryJson({ links: {}, objects: { a: { system: {}, data: {}, meta: { keys: [] } } } })).toBeUndefined();
  });
});
