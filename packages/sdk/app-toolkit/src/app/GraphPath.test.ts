//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { Graph } from '@dxos/app-graph';
import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import * as GraphPath from './GraphPath';

describe('GraphPath', () => {
  describe('getWorkspaceFromPath', () => {
    test('returns root for bare root', ({ expect }) => {
      expect(GraphPath.getWorkspaceFromPath('root')).toBe('root');
    });

    test('returns workspace path for workspace-level ID', ({ expect }) => {
      expect(GraphPath.getWorkspaceFromPath('root/myspace')).toBe('root/myspace');
    });

    test('extracts workspace from deep path', ({ expect }) => {
      expect(GraphPath.getWorkspaceFromPath('root/myspace/types/doc/obj1')).toBe('root/myspace');
    });

    test('extracts workspace from pinned path', ({ expect }) => {
      expect(GraphPath.getWorkspaceFromPath('root/!dxos:settings')).toBe('root/!dxos:settings');
    });
  });

  describe('isPinnedWorkspace', () => {
    test('detects pinned workspace', ({ expect }) => {
      expect(GraphPath.isPinnedWorkspace('root/!dxos:settings')).toBe(true);
    });

    test('rejects regular workspace', ({ expect }) => {
      expect(GraphPath.isPinnedWorkspace('root/myspace')).toBe(false);
    });

    test('rejects bare root', ({ expect }) => {
      expect(GraphPath.isPinnedWorkspace('root')).toBe(false);
    });

    test('rejects deep path with ! in later segment', ({ expect }) => {
      expect(GraphPath.isPinnedWorkspace('root/myspace/!something')).toBe(false);
    });

    test('rejects default workspace key', ({ expect }) => {
      expect(GraphPath.isPinnedWorkspace('default')).toBe(false);
    });
  });

  describe('tryGetEid', () => {
    const spaceId = Key.SpaceId.random();
    const objectId = Key.EntityId.random();
    // Seed via addNode: the GraphProps.nodes constructor option does not register nodes (latent upstream bug).
    const graph = Graph.make();
    Graph.addNode(graph, { id: `root/${spaceId}`, type: 'test.workspace', properties: {} });

    test('parses a canonical database path', ({ expect }) => {
      const path = `root/${spaceId}/system/database/test.document/${objectId}`;
      const eid = GraphPath.tryGetEid(graph, path);
      expect(Option.getOrThrow(eid)).toBe(EID.make({ spaceId, entityId: objectId }));
    });

    test('parses a collection path', ({ expect }) => {
      const path = `root/${spaceId}/content/collections/${Key.EntityId.random()}/${objectId}`;
      const eid = GraphPath.tryGetEid(graph, path);
      expect(Option.getOrThrow(eid)).toBe(EID.make({ spaceId, entityId: objectId }));
    });

    test('rejects a path with no known workspace node', ({ expect }) => {
      const path = `root/${Key.SpaceId.random()}/system/database/test.document/${objectId}`;
      expect(Option.isNone(GraphPath.tryGetEid(graph, path))).toBe(true);
    });

    test('rejects a path whose trailing segment is not a valid entity id', ({ expect }) => {
      const path = `root/${spaceId}/system/database/test.document/not-an-entity-id`;
      expect(Option.isNone(GraphPath.tryGetEid(graph, path))).toBe(true);
    });
  });

  describe('getIdentityKey', () => {
    const spaceId = Key.SpaceId.random();
    const objectId = Key.EntityId.random();

    test('paths reaching the same object through different subgraphs share a key', ({ expect }) => {
      const databasePath = GraphPath.getObjectPath(spaceId, 'test.document', objectId);
      const collectionPath = GraphPath.getCollectionsPath(spaceId, Key.EntityId.random(), objectId);
      expect(GraphPath.getIdentityKey(databasePath)).toBe(EID.make({ spaceId, entityId: objectId }));
      expect(GraphPath.getIdentityKey(collectionPath)).toBe(GraphPath.getIdentityKey(databasePath));
    });

    test('the same object id in another space does not', ({ expect }) => {
      const path = GraphPath.getObjectPath(spaceId, 'test.document', objectId);
      const other = GraphPath.getObjectPath(Key.SpaceId.random(), 'test.document', objectId);
      expect(GraphPath.getIdentityKey(path)).not.toBe(GraphPath.getIdentityKey(other));
    });

    test('a path naming no object is its own key', ({ expect }) => {
      expect(GraphPath.getIdentityKey(GraphPath.getSpacePath(spaceId))).toBe(`root/${spaceId}`);
      expect(GraphPath.getIdentityKey('root')).toBe('root');
      expect(GraphPath.getIdentityKey(GraphPath.getPinnedWorkspacePath('dxos:settings'))).toBe('root/!dxos:settings');
    });

    test('a linked segment keeps its own identity, not its subject’s', ({ expect }) => {
      // A companion (`…/<objectId>/~settings`) is a distinct plank from the object it hangs off, so it
      // must not collapse onto the object's key — else opening a companion would mark the object current.
      const objectPath = GraphPath.getObjectPath(spaceId, 'test.document', objectId);
      const companionPath = `${objectPath}/~settings`;
      expect(GraphPath.getIdentityKey(companionPath)).toBe(companionPath);
      expect(GraphPath.getIdentityKey(companionPath)).not.toBe(GraphPath.getIdentityKey(objectPath));
    });
  });
});
