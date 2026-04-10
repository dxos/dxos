//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AppNode } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
// TODO(wittjosiah): This is currently necessary for type portability.
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Node } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';
import { ViewAnnotation } from '@dxos/schema';

import { meta } from '#meta';

//
// Extension Factory
//

/** Creates companion panel extensions: object settings and selected-objects. */
export const createCompanionExtensions = Effect.fnUntraced(function* () {
  return yield* Effect.all([
    // Object settings plank companion.
    GraphBuilder.createExtension({
      id: 'settings',
      match: NodeMatcher.whenEchoObjectMatches,
      connector: (node) =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('settings'),
            label: ['object-properties.label', { ns: meta.id }],
            icon: 'ph--sliders--regular',
            data: 'settings', // TODO(burdon): Change to 'object-properties'.
            position: 'fallback',
          }),
        ]),
    }),

    // Related objects plank companion.
    GraphBuilder.createExtension({
      id: 'related',
      match: NodeMatcher.whenEchoObjectMatches,
      connector: (node) =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('related'),
            label: ['companion-related.label', { ns: meta.id }],
            icon: 'ph--graph--regular',
            data: 'related',
            position: 'fallback',
          }),
        ]),
    }),

    // View selected objects companion.
    GraphBuilder.createExtension({
      id: 'selected-objects',
      match: (node) => {
        if (!Obj.isObject(node.data)) {
          return Option.none();
        }

        const schema = Obj.getSchema(node.data);
        const isView = Option.fromNullable(schema).pipe(
          Option.flatMap((candidate) => ViewAnnotation.get(candidate)),
          Option.getOrElse(() => false),
        );
        if (!isView) {
          return Option.none();
        }

        return Option.some(node);
      },
      connector: (node) =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('selected-objects'),
            label: ['companion-selected-objects.label', { ns: meta.id }],
            icon: 'ph--tree-view--regular',
            data: 'selected-objects',
          }),
        ]),
    }),
  ]);
});
