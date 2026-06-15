//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppNode, TimeTravelAnnotation } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';
import type { EchoViewRefPath } from '@dxos/schema';
import { ViewAnnotation } from '@dxos/schema';

import { meta } from '#meta';
import { SpaceCapabilities } from '#types';

//
// Extension Factory
//

/** Creates companion panel extensions: object settings and selected-objects. */
// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/plugin-graph types (TS2883).
export const createCompanionExtensions: () => Effect.Effect<
  GraphBuilder.BuilderExtension[][],
  never,
  Capability.Service
> = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;
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
            position: 'last',
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
            position: 'last',
          }),
        ]),
    }),

    // View selected objects companion.
    GraphBuilder.createExtension({
      id: 'selectedObjects',
      match: (node) => {
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
            id: linkedSegment('selected-objects'),
            label: ['companion-selected-objects.label', { ns: meta.id }],
            icon: 'ph--tree-view--regular',
            data: 'selected-objects',
          }),
        ]),
    }),

    // Branches plank companion: history scrubber + branch list (only for types that opt in via
    // TimeTravelAnnotation).
    GraphBuilder.createExtension({
      id: 'branches',
      match: (node) => {
        if (!Obj.isObject(node.data)) {
          return Option.none();
        }

        const type = Obj.getType(node.data);
        const supportsTimeTravel = type
          ? TimeTravelAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false))
          : false;

        return supportsTimeTravel ? Option.some(node) : Option.none();
      },
      connector: (node, get) => {
        // Gated by the space-plugin setting (enabled by default); reactive to toggling it.
        const settings = get(capabilities.get(SpaceCapabilities.Settings));
        if (settings.enableBranches === false) {
          return Effect.succeed([]);
        }

        return Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('branches'),
            label: ['branches-companion.label', { ns: meta.id }],
            icon: 'ph--git-branch--regular',
            data: 'branches',
            position: 'last',
          }),
        ]);
      },
    }),
  ]);
});
