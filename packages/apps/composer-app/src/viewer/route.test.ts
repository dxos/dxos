//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseRoute } from './route.ts';

const OBJECT_PATH = 'db/org.dxos.type.document+01ABC';

describe('parseRoute', () => {
  test('a shared link carries the public id in the workspace segment', ({ expect }) => {
    expect(parseRoute({ pathname: `/pub-1/${OBJECT_PATH}`, search: '' })).toEqual({
      publicId: 'pub-1',
      objectPath: OBJECT_PATH,
    });
    expect(parseRoute({ pathname: '/pub-1', search: '' })).toEqual({ publicId: 'pub-1', objectPath: undefined });
  });

  test('after import the public id is read from ?p and the path from the workspace URL', ({ expect }) => {
    expect(parseRoute({ pathname: `/w/SPACE/${OBJECT_PATH}`, search: '?p=pub-1' })).toEqual({
      publicId: 'pub-1',
      objectPath: OBJECT_PATH,
    });
  });

  test('the bare viewer origin names no publication', ({ expect }) => {
    expect(parseRoute({ pathname: '/', search: '' })).toBeUndefined();
  });
});
