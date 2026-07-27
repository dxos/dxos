//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import { Graph } from '@dxos/app-graph';
import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import * as GraphPath from './GraphPath';

describe('URL routing helpers', () => {
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
});
