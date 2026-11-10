//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Filter } from '@dxos/echo';

import { BookmarksNamespace } from '../namespace.ts';
import { Bookmark } from '../types/Bookmark.ts';
import { RecordVisit } from '../types/BookmarkOperation.ts';

const SECTION_TYPE = 'bookmarks-section';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // #region section
      // A "Bookmarks" section under each space that has at least one bookmark.
      AppGraphBuilder.createExtension({
        id: 'section',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const bookmarks = get(space.db.query(Filter.type(Bookmark)).atom);
          if (bookmarks.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            AppNode.makeSection({
              id: 'bookmarksSection',
              type: SECTION_TYPE,
              label: ['plugin.name', { ns: BookmarksNamespace.key }],
              icon: 'ph--bookmark-simple--regular',
              space,
            }),
          ]);
        },
      }),
      // #endregion
      // #region items
      // One node per bookmark, under the section.
      AppGraphBuilder.createExtension({
        id: 'sectionItems',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const bookmarks = get(space.db.query(Filter.type(Bookmark)).atom);
          return Effect.succeed(
            bookmarks
              .map((bookmark) => AppNode.makeObject({ get, db: space.db, object: bookmark }))
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),
      // #endregion
      // #region actions
      // A toolbar action on every bookmark node that runs the operation.
      AppGraphBuilder.createTypeExtension({
        id: 'bookmarkActions',
        type: Bookmark,
        actions: (bookmark) =>
          Effect.succeed([
            AppNode.makeToolbarAction({
              id: 'recordVisit',
              data: () => Operation.invoke(RecordVisit, { bookmark }),
              label: ['record-visit.label', { ns: BookmarksNamespace.key }],
              icon: 'ph--cursor-click--regular',
            }),
          ]),
      }),
      // #endregion
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
