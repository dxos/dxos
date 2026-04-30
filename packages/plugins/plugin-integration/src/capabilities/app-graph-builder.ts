//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '#meta';

import { Integration } from '../types';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      // Single "Integrations" branch directly under each Space, replacing the
      // earlier split between a settings-sub-panel entry and a separate
      // top-level branch. Always rendered (even when no Integration objects
      // exist) so the user has a stable place to add one. Sits in the
      // unpositioned middle band — General Settings hoists above, Database
      // falls back below.
      //
      // Integration objects are listed as direct children. Their `targets`
      // (e.g. Trello kanbans) are NOT surfaced under the Integration node —
      // those live in the database subgraph as regular objects of their
      // own type, accessed via the standard Type/All path.
      GraphBuilder.createExtension({
        id: 'integrations',
        match: whenSpace,
        connector: (space, get) => {
          const integrations = get(AtomQuery.make(space.db, Filter.type(Integration.Integration)));
          return Effect.succeed([
            Node.make({
              id: 'integrations',
              type: `${meta.id}.space-settings`,
              // Pure container node — clicking just expands the children
              // (each Integration object). The legacy "Manage integrations"
              // article was removed; per-Integration management lives on
              // each Integration's own article surface.
              data: null,
              properties: {
                label: ['space-panel.name', { ns: meta.id }],
                icon: 'ph--plugs--regular',
                role: 'branch',
                draggable: false,
                droppable: false,
                space,
              },
              nodes: integrations
                .map((integration) =>
                  createObjectNode({
                    db: space.db,
                    object: integration,
                    resolve,
                  }),
                )
                .filter((node): node is NonNullable<typeof node> => node !== null),
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
