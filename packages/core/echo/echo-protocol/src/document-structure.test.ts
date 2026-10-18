//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DatabaseDirectory } from './document-structure.ts';

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
