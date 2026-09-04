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
import { Obj, Type } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Text } from '@dxos/schema';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { Vocabulary } from '#types';

import { getVocabulariesPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    /** An object is readable when its text is reachable — natively, or via a TextContent extractor. */
    const isReadable = (object: Obj.Unknown): boolean =>
      Obj.instanceOf(Markdown.Document, object) ||
      Obj.instanceOf(Text.Text, object) ||
      capabilities.getAll(AppCapabilities.TextContent).some(({ id }) => id === Obj.getTypename(object));

    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Vocabulary.Vocabulary, {
        urlKey: 'vocabulary',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.content),
        groupSegment: GraphPath.GroupSegments.content,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenObjectForm, {
            target: space.db,
            typename: Type.getTypename(Vocabulary.Vocabulary),
            targetNodeId: getVocabulariesPath(space.db.spaceId),
          }),
      }),

      // Drill companion on every deck.
      AppGraphBuilder.createExtension({
        id: 'flashcardsCompanion',
        match: (node) => (Vocabulary.instanceOf(node.data) ? Option.some(node) : Option.none()),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'flashcards',
              label: ['flashcards-companion.label', { ns: meta.profile.key }],
              icon: 'ph--cards-three--regular',
              data: 'flashcards',
              position: Position.first,
            }),
          ]),
      }),

      // Reading companion on anything whose text this plugin can reach.
      AppGraphBuilder.createExtension({
        id: 'readerCompanion',
        match: (node) => (Obj.isObject(node.data) && isReadable(node.data) ? Option.some(node) : Option.none()),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'reader',
              label: ['reader-companion.label', { ns: meta.profile.key }],
              icon: 'ph--translate--regular',
              data: 'reader',
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
