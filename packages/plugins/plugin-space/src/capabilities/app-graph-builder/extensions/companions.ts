//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AppNode } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';
import type { EchoViewRefPath } from '@dxos/schema';
import { ViewAnnotation } from '@dxos/schema';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { type SpaceCapabilities } from '#types';

//
// Extension Factory
//

export type CreateCompanionExtensionsOptions = {
  /** Resolves the history provider gating the history companion for a typename. */
  getHistoryProvider: (typename: string) => SpaceCapabilities.HistoryProvider | undefined;
};

/** Creates companion panel extensions: object settings, related, history, and selected-objects. */
// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/plugin-graph types (TS2883).
export const createCompanionExtensions: (
  options: CreateCompanionExtensionsOptions,
) => Effect.Effect<GraphBuilder.BuilderExtension[][]> = Effect.fnUntraced(function* ({
  getHistoryProvider,
}: CreateCompanionExtensionsOptions) {
  return yield* Effect.all([
    // Object settings plank companion.
    GraphBuilder.createExtension({
      id: 'settings',
      match: NodeMatcher.whenEchoObjectMatches,
      connector: (node) =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('settings'),
            label: ['object-properties.label', { ns: meta.profile.key }],
            icon: 'ph--sliders--regular',
            data: 'settings', // TODO(burdon): Change to 'object-properties'.
            position: Position.last,
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
            label: ['companion-related.label', { ns: meta.profile.key }],
            icon: 'ph--graph--regular',
            data: 'related',
            position: Position.last,
          }),
        ]),
    }),

    // Version history plank companion, gated per-type by a HistoryProvider contribution.
    GraphBuilder.createExtension({
      id: 'history',
      match: (node) => {
        if (!Obj.isObject(node.data)) {
          return Option.none();
        }
        const typename = Obj.getTypename(node.data);
        return typename && getHistoryProvider(typename) ? Option.some(node) : Option.none();
      },
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('history'),
            label: ['history-panel.title', { ns: meta.profile.key }],
            icon: 'ph--git-branch--regular',
            data: 'history',
          }),
        ]),
    }),

    // View selected objects companion.
    GraphBuilder.createExtension({
      id: 'selectedObjects',
      match: (node) => {
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
            id: linkedSegment('selected-objects'),
            label: ['companion-selected-objects.label', { ns: meta.profile.key }],
            icon: 'ph--tree-view--regular',
            data: 'selected-objects',
          }),
        ]),
    }),
  ]);
});
