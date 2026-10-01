//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { readReactUiNext, readSiblingNext } from './extract.ts';
import { REACT_UI_LIST_NEXT, REACT_UI_NEXT } from './next-exports.ts';
import { IMPORT_TARGETS, nextParts } from './targets.ts';

const REPO_ROOT = join(import.meta.dirname, '../../../..');

describe('next exports', () => {
  test('the snapshot matches the Next sources', () => {
    expect(REACT_UI_NEXT).toEqual(readReactUiNext(REPO_ROOT));
    expect(REACT_UI_LIST_NEXT).toEqual(readSiblingNext(REPO_ROOT, 'react-ui-list'));
  });

  test('every import target names a real Next export', () => {
    for (const targets of Object.values(IMPORT_TARGETS)) {
      for (const target of Object.values(targets)) {
        if (target.kind === 'next') {
          const entry = target.pkg === 'react-ui' ? REACT_UI_NEXT : REACT_UI_LIST_NEXT;
          expect([...entry.values, ...entry.types]).toContain(target.name);
        }
      }
    }
  });

  test('parts resolve per package', () => {
    expect(nextParts('react-ui', 'Panel')).toEqual(['Root', 'Header', 'Body', 'Footer']);
    expect(nextParts('react-ui-list', 'OrderedList')).toContain('ItemText');
    expect(nextParts('react-ui', 'Button')).toBeUndefined();
  });
});
