//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key } from '@dxos/echo';

import { getAwaitedTarget } from './awaited-path.ts';

const spaceId = Key.SpaceId.random();
const objectId = Key.EntityId.random();

describe('getAwaitedTarget', () => {
  test('a space workspace awaits the space', ({ expect }) => {
    expect(getAwaitedTarget(GraphPath.getSpacePath(spaceId))).toEqual({ spaceId });
  });

  test('an object path awaits the object in its space', ({ expect }) => {
    expect(getAwaitedTarget(GraphPath.getObjectPath(spaceId, 'org.dxos.type.document', objectId))).toEqual({
      spaceId,
      objectId,
    });
    expect(getAwaitedTarget(GraphPath.getCollectionsPath(spaceId, objectId))).toEqual({ spaceId, objectId });
  });

  test('a section inside a space is not awaited', ({ expect }) => {
    expect(getAwaitedTarget(GraphPath.getSpacePath(spaceId, 'settings'))).toBeUndefined();
    expect(getAwaitedTarget(GraphPath.getDatabasePath(spaceId))).toBeUndefined();
  });

  test('a non-space workspace is not awaited', ({ expect }) => {
    expect(getAwaitedTarget(GraphPath.getSpacePath('dxos:settings'))).toBeUndefined();
    expect(getAwaitedTarget(`echo://${spaceId}/${objectId}`)).toBeUndefined();
    expect(getAwaitedTarget(spaceId)).toBeUndefined();
  });
});
