//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import { Key } from '@dxos/echo';

import { findTypeSectionPath } from './type-section-path.ts';

const spaceId = Key.SpaceId.random();
const objectId = Key.EntityId.random();

describe('findTypeSectionPath', () => {
  test('finds a section by its objects extension, whatever its path is named', ({ expect }) => {
    const extensions = [
      extension('org.dxos.plugin.library.module.AppGraphBuilder.org.dxos.type.book/connector', ['content']),
      extension('org.dxos.plugin.library.module.AppGraphBuilder.org.dxos.type.book.sectionObjects/connector', [
        'content',
        'library',
      ]),
    ];
    expect(findTypeSectionPath(extensions, { spaceId, typename: 'org.dxos.type.book', objectId })).toBe(
      `root/${spaceId}/content/library/${objectId}`,
    );
  });

  test('matches an unqualified extension id', ({ expect }) => {
    const extensions = [extension('dxos.org.type.Project.sectionObjects', ['dxos.org.type.Project'])];
    expect(findTypeSectionPath(extensions, { spaceId, typename: 'dxos.org.type.Project', objectId })).toBe(
      `root/${spaceId}/dxos.org.type.Project/${objectId}`,
    );
  });

  test("ignores other types' sections and bindings whose path merely ends in the typename", ({ expect }) => {
    const extensions = [
      extension('module.dxos.org.type.Chat.sectionObjects/connector', ['ai', 'dxos.org.type.Chat']),
      extension('module.projectChats/connector', ['ai', 'dxos.org.type.Project']),
    ];
    expect(findTypeSectionPath(extensions, { spaceId, typename: 'dxos.org.type.Project', objectId })).toBeUndefined();
  });
});

/** A registered extension carrying an item binding. */
const extension = (id: string, path: string[]): Pick<AppGraphBuilder.BuilderExtension, 'id' | 'meta'> => ({
  id,
  meta: { key: 'key', kind: 'item', path },
});
