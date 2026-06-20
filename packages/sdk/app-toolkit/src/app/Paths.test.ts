//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Paths from './Paths';

describe('URL routing helpers', () => {
  describe('toUrlPath', () => {
    test('strips root from workspace path', ({ expect }) => {
      expect(Paths.toUrlPath('root/myspace')).toBe('/myspace');
    });

    test('strips root from deep active path', ({ expect }) => {
      expect(Paths.toUrlPath('root/myspace/types/doc/obj1')).toBe('/myspace/types/doc/obj1');
    });

    test('converts bare root to /', ({ expect }) => {
      expect(Paths.toUrlPath('root')).toBe('/');
    });

    test('preserves segments containing !', ({ expect }) => {
      expect(Paths.toUrlPath('root/!dxos:settings')).toBe('/!dxos:settings');
    });

    test('preserves segments containing ~', ({ expect }) => {
      expect(Paths.toUrlPath('root/myspace/settings~abc')).toBe('/myspace/settings~abc');
    });

    test('handles non-root-prefixed IDs by prepending /', ({ expect }) => {
      expect(Paths.toUrlPath('default')).toBe('/default');
    });
  });

  describe('fromUrlPath', () => {
    test('restores root for workspace path', ({ expect }) => {
      expect(Paths.fromUrlPath('/myspace')).toBe('root/myspace');
    });

    test('restores root for deep active path', ({ expect }) => {
      expect(Paths.fromUrlPath('/myspace/types/doc/obj1')).toBe('root/myspace/types/doc/obj1');
    });

    test('converts / to root', ({ expect }) => {
      expect(Paths.fromUrlPath('/')).toBe('root');
    });

    test('preserves ! in segments', ({ expect }) => {
      expect(Paths.fromUrlPath('/!dxos:settings')).toBe('root/!dxos:settings');
    });

    test('preserves ~ in segments', ({ expect }) => {
      expect(Paths.fromUrlPath('/myspace/settings~abc')).toBe('root/myspace/settings~abc');
    });
  });

  describe('round-trip', () => {
    const roundTrips = [
      'root',
      'root/myspace',
      'root/myspace/types/doc/obj1',
      'root/!dxos:settings',
      'root/myspace/!dxos:settings',
      'root/myspace/settings~abc',
    ];

    for (const id of roundTrips) {
      test(`${id} round-trips through URL`, ({ expect }) => {
        expect(Paths.fromUrlPath(Paths.toUrlPath(id))).toBe(id);
      });
    }
  });

  describe('getWorkspaceFromPath', () => {
    test('returns root for bare root', ({ expect }) => {
      expect(Paths.getWorkspaceFromPath('root')).toBe('root');
    });

    test('returns workspace path for workspace-level ID', ({ expect }) => {
      expect(Paths.getWorkspaceFromPath('root/myspace')).toBe('root/myspace');
    });

    test('extracts workspace from deep path', ({ expect }) => {
      expect(Paths.getWorkspaceFromPath('root/myspace/types/doc/obj1')).toBe('root/myspace');
    });

    test('extracts workspace from pinned path', ({ expect }) => {
      expect(Paths.getWorkspaceFromPath('root/!dxos:settings')).toBe('root/!dxos:settings');
    });
  });

  describe('isPinnedWorkspace', () => {
    test('detects pinned workspace', ({ expect }) => {
      expect(Paths.isPinnedWorkspace('root/!dxos:settings')).toBe(true);
    });

    test('rejects regular workspace', ({ expect }) => {
      expect(Paths.isPinnedWorkspace('root/myspace')).toBe(false);
    });

    test('rejects bare root', ({ expect }) => {
      expect(Paths.isPinnedWorkspace('root')).toBe(false);
    });

    test('rejects deep path with ! in later segment', ({ expect }) => {
      expect(Paths.isPinnedWorkspace('root/myspace/!something')).toBe(false);
    });

    test('rejects default workspace key', ({ expect }) => {
      expect(Paths.isPinnedWorkspace('default')).toBe(false);
    });
  });
});
