//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Key } from '@dxos/echo';
import { type GraphBuilder } from '@dxos/plugin-graph';

import { findTypeSectionPath } from './type-section-path';

const spaceId = Key.SpaceId.random();
const objectId = Key.EntityId.random();

const staticBinding = (path: string[], kind: 'item' | 'singleton' = 'item') => ({
  url: { key: path.at(-1) ?? 'key', kind, path },
});

describe('findTypeSectionPath', () => {
  test('matches a grouped section by its trailing typename segment', ({ expect }) => {
    const extensions = [staticBinding(['system', 'database']), staticBinding(['ai', 'dxos.org.type.Chat'])];
    expect(findTypeSectionPath(extensions, { spaceId, typename: 'dxos.org.type.Chat', objectId })).toBe(
      `root/${spaceId}/ai/dxos.org.type.Chat/${objectId}`,
    );
  });

  test('matches a space-direct section', ({ expect }) => {
    const extensions = [staticBinding(['dxos.org.type.Project'])];
    expect(findTypeSectionPath(extensions, { spaceId, typename: 'dxos.org.type.Project', objectId })).toBe(
      `root/${spaceId}/dxos.org.type.Project/${objectId}`,
    );
  });

  test('ignores dynamic resolvers, singletons, and unrelated static paths', ({ expect }) => {
    const extensions: Array<Pick<GraphBuilder.BuilderExtension, 'url'>> = [
      // Dynamic path (nested collections) — locates by runtime data, not a fixed section.
      { url: { key: 'object', kind: 'item', path: () => Effect.succeed(null) } },
      // Singleton (settings page) — the trailing segment is the node itself, not a typename.
      staticBinding(['dxos.org.type.Chat'], 'singleton'),
      // Static but not this type's section.
      staticBinding(['system', 'database']),
      { url: undefined },
    ];
    expect(findTypeSectionPath(extensions, { spaceId, typename: 'dxos.org.type.Chat', objectId })).toBeUndefined();
  });
});
