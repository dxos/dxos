//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { GraphPath } from '@dxos/app-toolkit';
import { Key } from '@dxos/echo';
import { Node } from '@dxos/plugin-graph';
import { Attention } from '@dxos/react-ui-attention';
import { Path } from '@dxos/react-ui-list';

import { activeIdentities, isPathCurrent } from './active-planks';

const spaceId = Key.SpaceId.random();
const objectId = Key.EntityId.random();
const collectionId = Key.EntityId.random();

/** Tree path as the navtree registers it — the chain of ancestor node ids (see `expose.ts`). */
const treePath = (qualifiedId: string): string => Path.create(...Attention.expandAttendableId(qualifiedId));

describe('active planks', () => {
  test('a node is current when a plank addresses it by the same path', ({ expect }) => {
    const collectionPath = GraphPath.getCollectionsPath(spaceId, collectionId, objectId);
    const active = activeIdentities([collectionPath]);
    expect(isPathCurrent(active, treePath(collectionPath))).toBe(true);
  });

  test('a node is current when a plank addresses the same object by another path', ({ expect }) => {
    // Card navigation opens the hidden database path; the tree shows the object under its collection.
    const active = activeIdentities([GraphPath.getObjectPath(spaceId, 'example.com/type/Document', objectId)]);
    expect(isPathCurrent(active, treePath(GraphPath.getCollectionsPath(spaceId, collectionId, objectId)))).toBe(true);
  });

  test('a node for a different object is not current', ({ expect }) => {
    const active = activeIdentities([GraphPath.getObjectPath(spaceId, 'example.com/type/Document', objectId)]);
    const other = GraphPath.getCollectionsPath(spaceId, collectionId, Key.EntityId.random());
    expect(isPathCurrent(active, treePath(other))).toBe(false);
  });

  test('the same object in another space is not current', ({ expect }) => {
    const active = activeIdentities([GraphPath.getObjectPath(spaceId, 'example.com/type/Document', objectId)]);
    const other = GraphPath.getObjectPath(Key.SpaceId.random(), 'example.com/type/Document', objectId);
    expect(isPathCurrent(active, treePath(other))).toBe(false);
  });

  test('structural nodes match by path, not by identity', ({ expect }) => {
    const active = activeIdentities([GraphPath.getSpacePath(spaceId)]);
    expect(isPathCurrent(active, treePath(GraphPath.getSpacePath(spaceId)))).toBe(true);
    expect(isPathCurrent(active, treePath(GraphPath.getDatabasePath(spaceId)))).toBe(false);
    expect(isPathCurrent(active, Node.RootId)).toBe(false);
  });

  test('a companion plank does not make its subject current', ({ expect }) => {
    // A linked segment is not an entity id, so it keeps its own (path) identity.
    const objectPath = GraphPath.getCollectionsPath(spaceId, collectionId, objectId);
    const active = activeIdentities([`${objectPath}/~settings`]);
    expect(isPathCurrent(active, treePath(objectPath))).toBe(false);
  });
});
