//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { companionSegment } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
// TODO(wittjosiah): This is currently necessary for type portability.
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Node } from '@dxos/plugin-graph';
import { ViewAnnotation } from '@dxos/schema';

import { meta } from '../../../meta';

//
// Extension Factory
//

/** Creates companion panel extensions: object settings and selected-objects. */
export const createCompanionExtensions = Effect.fnUntraced(function* () {
  return yield* Effect.all([
    // Object settings plank companion.
    GraphBuilder.createExtension({
      id: `${meta.id}.settings`,
      match: NodeMatcher.whenEchoObjectMatches,
      connector: (node) =>
        Effect.succeed([
          {
            id: companionSegment('settings'),
            type: PLANK_COMPANION_TYPE,
            data: 'settings',
            properties: {
              label: ['object settings label', { ns: meta.id }],
              icon: 'ph--sliders--regular',
              disposition: 'hidden',
              position: 'fallback',
            },
          },
        ]),
    }),

    // View selected objects companion.
    GraphBuilder.createExtension({
      id: `${meta.id}.selected-objects`,
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
          {
            id: companionSegment('selected-objects'),
            type: PLANK_COMPANION_TYPE,
            data: 'selected-objects',
            properties: {
              label: ['companion selected objects label', { ns: meta.id }],
              icon: 'ph--tree-view--regular',
              disposition: 'hidden',
            },
          },
        ]),
    }),
  ]);
});
