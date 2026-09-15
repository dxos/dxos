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
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { meta } from '#meta';
import { Book } from '#types';

import { getBooksPath } from '../paths.ts';

/** The companion segment/variant for the notes editor — shared with its surface binding. */
export const NOTES_COMPANION_VARIANT = 'notes';

/** Matches a Book object node, so its notes companion appears alongside the book article. */
const whenBook: GraphNodeMatcher.NodeMatcher<Book.Book> = (node) =>
  Book.instanceOf(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Book type section in the content group.
      TypeSection.createTypeSectionExtension(Book.Book, {
        urlKey: 'book',
        sectionUrlKey: 'library',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.content),
        groupSegment: GraphPath.GroupSegments.content,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenObjectForm, {
            target: space.db,
            typename: Type.getTypename(Book.Book),
            targetNodeId: getBooksPath(space.db.spaceId),
          }),
      }),

      // Private notes companion (a markdown editor over the book's notes document).
      AppGraphBuilder.createExtension({
        id: 'bookNotesCompanion',
        match: whenBook,
        connector: (book) =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: NOTES_COMPANION_VARIANT,
              label: ['notes.label', { ns: meta.profile.key }],
              icon: 'ph--note--regular',
              data: book,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
