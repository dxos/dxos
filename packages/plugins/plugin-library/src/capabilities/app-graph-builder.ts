//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, type NodeMatcher } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Book } from '#types';

import { getBooksPath } from '../paths';

/** The companion segment/variant for the notes editor — shared with its surface binding. */
export const NOTES_COMPANION_VARIANT = 'notes';

/** Matches a Book object node, so its notes companion appears alongside the book article. */
const whenBook: NodeMatcher.NodeMatcher<Book.Book> = (node) =>
  Book.instanceOf(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Book type section in the content group.
      TypeSection.createTypeSectionExtension(Book.Book, {
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.content),
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: Type.getTypename(Book.Book),
            targetNodeId: getBooksPath(space.db.spaceId),
          }),
      }),

      // Private notes companion (a markdown editor over the book's notes document).
      GraphBuilder.createExtension({
        id: 'bookNotesCompanion',
        match: whenBook,
        connector: (book) =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment(NOTES_COMPANION_VARIANT),
              label: ['notes.label', { ns: meta.profile.key }],
              icon: 'ph--note--regular',
              data: book,
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
