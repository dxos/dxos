//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNodeMatcher, createObjectNode } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';

import { meta } from '#meta';
import { IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { INTEGRATIONS_SECTION_ID, INTEGRATIONS_SECTION_TYPE } from '../constants';
import { Integration } from '../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'integrationActions',
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
              const spaceId = Obj.getDatabase(integration)?.spaceId;
              actions.push(
                Node.makeAction({
                  id: `${meta.id}.sync-integration.${integration.id}`,
                  data: () =>
                    Operation.invoke(
                      sync,
                      {
                        integration: Ref.make(integration),
                      },
                      { spaceId },
                    ),
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

      // Per-space integrations section under the space Settings node.
      // Always visible so the user can discover and add integrations even when none exist yet.
      // Separate listing extension so the graph reacts when integrations are added or removed.
      GraphBuilder.createExtension({
        id: 'integrationsSection',
        match: AppNodeMatcher.whenSpaceSettings,
        connector: (space) =>
          Effect.succeed([
            Node.make({
              id: INTEGRATIONS_SECTION_ID,
              type: INTEGRATIONS_SECTION_TYPE,
              data: INTEGRATIONS_SECTION_TYPE,
              properties: {
                label: ['space-panel.name', { ns: meta.id }],
                icon: 'ph--plugs--regular',
                iconHue: 'indigo',
                draggable: false,
                droppable: false,
                space,
              },
            }),
          ]),
      }),

      // Integration objects listed under the integrations section node.
      GraphBuilder.createExtension({
        id: 'integrationListing',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === INTEGRATIONS_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space, get) => {
          const integrations = get(space.db.query(Filter.type(Integration.Integration)).atom);
          return Effect.succeed(
            integrations
              .map((integration) =>
                createObjectNode({
                  get,
                  db: space.db,
                  object: integration,
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
