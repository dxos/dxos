//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as ReadOnly from '@dxos/app-toolkit/ReadOnly';
import { Obj, Type } from '@dxos/echo';
import type { EchoViewRefPath } from '@dxos/schema';
import { ViewAnnotation } from '@dxos/schema';
import * as Position from '@dxos/util/Position';

import { SpaceNamespace } from '../../../namespace.ts';

//
// Extension Factory
//

type Extensions = AppGraphBuilder.BuilderExtension[][];

/** Creates companion panel extensions: object settings, related, and selected-objects. */
// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/plugin-graph types (TS2883).
export const createCompanionExtensions: () => Effect.Effect<Extensions, never, Capability.Service> = Effect.fnUntraced(
  function* () {
    const readOnly = yield* ReadOnly.atom;
    return yield* Effect.all([
      // Object settings plank companion.
      AppGraphBuilder.createExtension({
        id: 'settings',
        relation: AppNode.companion,
        match: AppNodeMatcher.whenEchoObjectMatches,
        connector: (node) =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'settings',
              label: ['object-properties.label', { ns: SpaceNamespace.key }],
              icon: 'ph--sliders--regular',
              data: 'settings', // TODO(burdon): Change to 'object-properties'.
              position: Position.last,
            }),
          ]),
      }),

      // Related objects plank companion.
      AppGraphBuilder.createExtension({
        id: 'related',
        relation: AppNode.companion,
        match: AppNodeMatcher.whenEchoObjectMatches,
        connector: (node) =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'related',
              label: ['companion-related.label', { ns: SpaceNamespace.key }],
              icon: 'ph--graph--regular',
              data: 'related',
              position: Position.last,
            }),
          ]),
      }),

      // View selected objects companion; selection is off read-only, so there is nothing to show.
      AppGraphBuilder.createExtension({
        id: 'selectedObjects',
        relation: AppNode.companion,
        match: (node, get) => {
          if (get(readOnly)) {
            return Option.none();
          }

          // Type/schema node (e.g. a TypeArticle plank): the table's own row selection feeds this
          // companion directly, no view lookup needed.
          if (Type.isType(node.data)) {
            return Option.some(node);
          }

          if (!Obj.isObject(node.data)) {
            return Option.none();
          }

          const type = Obj.getType(node.data);
          const path = type
            ? ViewAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => [] as EchoViewRefPath))
            : [];
          const isEchoViewBacked = type && path.length > 0 ? ViewAnnotation.hasRefAlongPath(node.data, path) : false;

          if (!isEchoViewBacked) {
            return Option.none();
          }

          return Option.some(node);
        },
        connector: (node) =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'selected-objects',
              label: ['companion-selected-objects.label', { ns: SpaceNamespace.key }],
              icon: 'ph--tree-view--regular',
              data: 'selected-objects',
            }),
          ]),
      }),
    ]);
  },
);
