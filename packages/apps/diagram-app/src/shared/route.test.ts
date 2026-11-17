//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Key } from '@dxos/echo';

import { parseRoute, routePath } from './route.ts';

describe('route', () => {
  const spaceId = Key.SpaceId.random();
  const drawingId = Key.EntityId.random();

  test('a path names a space and optionally a diagram, and round-trips', () => {
    expect(parseRoute(`/${spaceId}/${drawingId}`)).toEqual({ spaceId, drawingId });
    expect(parseRoute(`/${spaceId}`)).toEqual({ spaceId });
    expect(routePath({ spaceId, drawingId })).toBe(`/${spaceId}/${drawingId}`);
    expect(routePath({ spaceId })).toBe(`/${spaceId}`);
    expect(routePath({})).toBe('/');
  });

  test('segments that are not ids are ignored', () => {
    expect(parseRoute('/')).toEqual({});
    expect(parseRoute('/not-a-space/x')).toEqual({});
    expect(parseRoute(`/${spaceId}/not-an-object`)).toEqual({ spaceId });
  });
});
