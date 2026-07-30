//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type AppCapabilities } from '../app-framework';
import * as NavigationOperation from './NavigationOperation';

const target = (path: string, fallback?: boolean): AppCapabilities.NavigationTarget => ({
  path,
  label: path,
  type: 'example.com/type/Document',
  ...(fallback ? { fallback: true } : {}),
});

describe('NavigationOperation', () => {
  describe('orderTargets', () => {
    test('a canonical target outranks the database fallback', ({ expect }) => {
      const ordered = NavigationOperation.orderTargets([
        target('root/space/system/database/type/obj', true),
        target('root/space/content/collections/coll/obj'),
      ]);
      expect(ordered.map(({ path }) => path)).toEqual([
        'root/space/content/collections/coll/obj',
        'root/space/system/database/type/obj',
      ]);
    });

    test('contribution order is preserved within each group', ({ expect }) => {
      const ordered = NavigationOperation.orderTargets([
        target('a'),
        target('fallback-1', true),
        target('b'),
        target('fallback-2', true),
      ]);
      expect(ordered.map(({ path }) => path)).toEqual(['a', 'b', 'fallback-1', 'fallback-2']);
    });

    test('a fallback is still offered when it is all there is', ({ expect }) => {
      const ordered = NavigationOperation.orderTargets([target('root/space/system/database/type/obj', true)]);
      expect(ordered.map(({ path }) => path)).toEqual(['root/space/system/database/type/obj']);
    });

    test('no targets resolve to none', ({ expect }) => {
      expect(NavigationOperation.orderTargets([])).toEqual([]);
    });
  });
});
