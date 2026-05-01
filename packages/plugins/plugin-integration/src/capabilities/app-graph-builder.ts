//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, createObjectNode } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '#meta';

import {
  IntegrationProvider,
  type IntegrationProvider as IntegrationProviderType,
} from './integration-provider';
import { Integration } from '../types';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      // Generic per-Integration actions:
      //  - "Sync now" — dispatched to the provider's `sync` op, runs across
      //    every target on the integration. Mirrors Trello's
      //    `trello-sync-integration` extension but works for any provider
      //    that contributes a `sync`.
      //  - "Delete integration" — the article doesn't host a Delete row,
      //    so this graph action is the only deletion affordance.
      GraphBuilder.createExtension({
        id: 'integration-actions',
        match: (node) =>
          Integration.instanceOf(node.data) ? Option.some(node.data as Integration.Integration) : Option.none(),
        actions: (integration) =>
          Effect.gen(function* () {
            const providers = (yield* Capability.Service).getAll(IntegrationProvider).flat() as IntegrationProviderType[];
            const provider = providers.find((p) => p.id === integration.providerId);
            const actions = [];
            if (provider?.sync) {
              actions.push(
                Node.makeAction({
                  id: `${meta.id}.sync-integration.${integration.id}`,
                  data: () =>
                    Operation.invoke(provider.sync as any, {
                      integration: Ref.make(integration),
                    }),
                  properties: {
                    label: ['sync-integration.label', { ns: meta.id }],
                    icon: 'ph--arrows-clockwise--regular',
                    disposition: 'list-item',
                  },
                }),
              );
            }
            actions.push(
              Node.makeAction({
                id: `${meta.id}.delete-integration.${integration.id}`,
                data: () =>
                  Operation.invoke(SpaceOperation.RemoveObjects, {
                    objects: [integration as unknown as Obj.Unknown],
                  }),
                properties: {
                  label: ['delete-integration.label', { ns: meta.id }],
                  icon: 'ph--trash--regular',
                  disposition: 'list-item',
                  testId: 'integrationPlugin.deleteIntegration',
                },
              }),
            );
            return actions;
          }),
      }),

      // Single "Integrations" branch directly under each Space. Hidden when
      // no Integration objects exist (mirrors the inbox plugin's
      // mailboxes-section pattern) so empty spaces don't carry a phantom
      // entry. Sits in the unpositioned middle band — General Settings
      // hoists above, Database falls back below.
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
          if (integrations.length === 0) {
            return Effect.succeed([]);
          }
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
                // Match the Integration type's hue so the section reads as
                // part of the same "integrations" colorway.
                iconHue: 'cyan',
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
