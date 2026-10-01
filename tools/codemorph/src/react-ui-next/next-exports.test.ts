//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { readReactUiNext, readSiblingNext } from './extract.ts';
import { REACT_UI_FORM_NEXT, REACT_UI_LIST_NEXT, REACT_UI_NEXT } from './next-exports.ts';
import { IMPORT_TARGETS, hasNextExport, nextParts } from './targets.ts';
import { THEME_HOOKS } from './transforms/theme.ts';

const REPO_ROOT = join(import.meta.dirname, '../../../..');

describe('next exports', () => {
  test('the snapshot matches the Next sources', () => {
    expect(REACT_UI_NEXT).toEqual(readReactUiNext(REPO_ROOT));
    expect(REACT_UI_LIST_NEXT).toEqual(readSiblingNext(REPO_ROOT, 'react-ui-list'));
    expect(REACT_UI_FORM_NEXT).toEqual(readSiblingNext(REPO_ROOT, 'react-ui-form'));
  });

  test('every import target names a real Next export', () => {
    for (const targets of Object.values(IMPORT_TARGETS)) {
      for (const target of Object.values(targets)) {
        if (target.kind === 'next') {
          expect(
            hasNextExport(target.pkg, target.name) || hasNextExport(target.pkg, target.name, true),
            target.name,
          ).toBe(true);
        }
      }
    }
  });

  test('the theme hooks the theme transform emits exist', () => {
    for (const hook of Object.values(THEME_HOOKS)) {
      expect(hasNextExport('react-ui', hook), hook).toBe(true);
    }
  });

  test('parts resolve per package', () => {
    expect(nextParts('react-ui', 'Panel')).toEqual(['Root', 'Header', 'Body', 'Footer']);
    expect(nextParts('react-ui-list', 'OrderedList')).toContain('ItemText');
    expect(nextParts('react-ui', 'Button')).toBeUndefined();
  });
});
