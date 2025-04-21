//
// Copyright 2025 DXOS.org
//

import { createIntent } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, toSignal, type Node } from '@dxos/plugin-graph';
import { ConnectionState } from '@dxos/react-client/mesh';

import { ClientCapabilities } from './capabilities';
import { CLIENT_PLUGIN } from '../meta';
import { Account, ClientAction } from '../types';

export default (context: PluginsContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: CLIENT_PLUGIN,
      filter: (node): node is Node<null> => node.id === 'root',
      actions: () => [
        {
          id: `${CLIENT_PLUGIN}/open-user-account`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(ClientAction.ShareIdentity));
          },
          properties: {
            label: ['open user account label', { ns: CLIENT_PLUGIN }],
            icon: 'ph--user--regular',
            keyBinding: {
              macos: 'meta+shift+.',
              // TODO(wittjosiah): Test on windows to see if it behaves the same as linux.
              windows: 'alt+shift+.',
              linux: 'alt+shift+>',
            },
          },
        },
      ],
      connector: () => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const identity = client.halo.identity.get();
        const status = toSignal(
          (onChange) => client.mesh.networkStatus.subscribe(() => onChange()).unsubscribe,
          () => client.mesh.networkStatus.get(),
        );

        return [
          {
            id: Account.id,
            type: CLIENT_PLUGIN,
            properties: {
              label: ['account label', { ns: CLIENT_PLUGIN }],
              icon: 'ph--user--regular',
              disposition: 'user-account',
              // NOTE: This currently needs to be the identity key because the fallback is generated from hex.
              userId: identity?.identityKey.toHex(),
              hue: identity?.profile?.data?.hue,
              emoji: identity?.profile?.data?.emoji,
              status: status?.swarm === ConnectionState.OFFLINE ? 'error' : 'active',
            },
            nodes: [
              {
                id: Account.Profile,
                data: Account.Profile,
                type: CLIENT_PLUGIN,
                properties: {
                  label: ['profile label', { ns: CLIENT_PLUGIN }],
                  icon: 'ph--user--regular',
                },
              },
              {
                id: Account.Devices,
                data: Account.Devices,
                type: CLIENT_PLUGIN,
                properties: {
                  label: ['devices label', { ns: CLIENT_PLUGIN }],
                  icon: 'ph--devices--regular',
                },
              },
              {
                id: Account.Security,
                data: Account.Security,
                type: CLIENT_PLUGIN,
                properties: {
                  label: ['security label', { ns: CLIENT_PLUGIN }],
                  icon: 'ph--key--regular',
                },
              },
            ],
          },
        ];
      },
    }),
  );
