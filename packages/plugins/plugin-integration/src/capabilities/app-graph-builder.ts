//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNodeMatcher, createObjectNode } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { Operation } from '@dxos/operation';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space/operations';

import { meta } from '#meta';
import { IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { Integration } from '../types';

/** Type for the per-space "Integrations" container node. */
const INTEGRATIONS_SECTION_TYPE = `${meta.id}.space-settings`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'integration-actions',
        match: (node) =>
          Integration.instanceOf(node.data) ? Option.some(node.data as Integration.Integration) : Option.none(),
        actions: (integration) =>
          Effect.gen(function* () {
            const providers = (yield* Capability.Service)
              .getAll(IntegrationProvider)
              .flat() as IntegrationProviderEntry[];
            const provider = providers.find((p) => p.id === integration.providerId);
            const actions = [];
            if (provider?.sync) {
              const sync = provider.sync;
              actions.push(
                Node.makeAction({
                  id: `${meta.id}.sync-integration.${integration.id}`,
                  data: () =>
                    Operation.invoke(sync, {
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

      // Per-space integrations folder; kept empty until an Integration exists.
      // Separate listing extension so graph reacts when targets are deleted.
      GraphBuilder.createExtension({
        id: 'integrations-section',
        match: AppNodeMatcher.whenSpace,
        connector: (space, get) => {
          const integrations = get(AtomQuery.make(space.db, Filter.type(Integration.Integration)));
          if (integrations.length === 0) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            Node.make({
              id: 'integrations',
              type: INTEGRATIONS_SECTION_TYPE,
              data: null,
              properties: {
                label: ['space-panel.name', { ns: meta.id }],
                icon: 'ph--plugs--regular',
                iconHue: 'cyan',
                role: 'branch',
                draggable: false,
                droppable: false,
                space,
              },
            }),
          ]);
        },
      }),

      // Integration objects listed under `integrations-section` (targets stay in the DB subgraph only).
      GraphBuilder.createExtension({
        id: 'integration-listing',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === INTEGRATIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const integrations = get(AtomQuery.make(space.db, Filter.type(Integration.Integration)));
          return Effect.succeed(
            integrations
              .map((integration) =>
                createObjectNode({
                  db: space.db,
                  object: integration,
                  resolve,
                }),
              )
              .filter((node): node is NonNullable<typeof node> => node !== null),
          );
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
