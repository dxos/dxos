//
// Copyright 2025 DXOS.org
//

import { createIntent } from '@dxos/app-framework';
import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { ConnectionState } from '@dxos/react-client/mesh';

import { meta } from '../meta';
import { Account, ClientAction, ClientCapabilities } from '../types';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    GraphBuilder.createExtension({
      id: meta.id,
      match: NodeMatcher.whenRoot,
      actions: () => [
        {
          id: `${meta.id}/open-user-account`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(ClientAction.ShareIdentity));
          },
          properties: {
            label: ['open user account label', { ns: meta.id }],
            icon: 'ph--user--regular',
            disposition: 'menu',
            keyBinding: {
              macos: 'meta+shift+.',
              // TODO(wittjosiah): Test on windows to see if it behaves the same as linux.
              windows: 'alt+shift+.',
              linux: 'alt+shift+>',
            },
          },
        },
      ],
      connector: (node, get) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const identity = get(CreateAtom.fromObservable(client.halo.identity));
        const status = get(CreateAtom.fromObservable(client.mesh.networkStatus));

        return [
          {
            id: Account.id,
            type: meta.id,
            properties: {
              label: ['account label', { ns: meta.id }],
              icon: 'ph--user--regular',
              disposition: 'user-account',
              testId: 'clientPlugin.account',
              // NOTE: This currently needs to be the identity key because the fallback is generated from hex.
              userId: identity?.identityKey.toHex(),
              hue: identity?.profile?.data?.hue,
              emoji: identity?.profile?.data?.emoji,
              status: status.swarm === ConnectionState.OFFLINE ? 'error' : 'active',
            },
            nodes: [
              {
                id: Account.Profile,
                data: Account.Profile,
                type: meta.id,
                properties: {
                  label: ['profile label', { ns: meta.id }],
                  icon: 'ph--user--regular',
                },
              },
              {
                id: Account.Devices,
                data: Account.Devices,
                type: meta.id,
                properties: {
                  label: ['devices label', { ns: meta.id }],
                  icon: 'ph--devices--regular',
                  testId: 'clientPlugin.devices',
                },
              },
              {
                id: Account.Security,
                data: Account.Security,
                type: meta.id,
                properties: {
                  label: ['security label', { ns: meta.id }],
                  icon: 'ph--key--regular',
                },
              },
            ],
          },
        ];
      },
    }),
  ),
);
