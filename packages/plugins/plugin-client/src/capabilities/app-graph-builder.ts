//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { createIntent } from '@dxos/app-framework';
import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ROOT_ID, createExtension, rxFromObservable } from '@dxos/plugin-graph';
import { ConnectionState } from '@dxos/react-client/mesh';

import { CLIENT_PLUGIN } from '../meta';
import { Account, ClientAction } from '../types';

import { ClientCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: CLIENT_PLUGIN,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              return [
                {
                  id: `${CLIENT_PLUGIN}/open-user-account`,
                  data: async () => {
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    await dispatch(createIntent(ClientAction.ShareIdentity));
                  },
                  properties: {
                    label: ['open user account label', { ns: CLIENT_PLUGIN }],
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              const client = context.getCapability(ClientCapabilities.Client);
              const identity = get(rxFromObservable(client.halo.identity));
              const status = get(rxFromObservable(client.mesh.networkStatus));

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
                    status: status.swarm === ConnectionState.OFFLINE ? 'error' : 'active',
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
                        testId: 'clientPlugin.devices',
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
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
