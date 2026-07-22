//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { CreateAtom, GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { ConnectionState } from '@dxos/react-client/mesh';

import { meta } from '#meta';
import { ClientOperation } from '#operations';
import { Account, ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read the client through its atom so the extension establishes a reactive dependency:
    // the connector may evaluate before the client module finishes activating (dependency
    // modules contribute individually, not batched per wave) and re-evaluates when it lands.
    const clientAtom = yield* Capability.atom(ClientCapabilities.Client);
    const extensions = yield* GraphBuilder.createExtension({
      id: 'root',
      match: NodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          {
            id: 'openUserAccount',
            data: () => Operation.invoke(ClientOperation.ShareIdentity),
            properties: {
              label: ['open-user-account.label', { ns: meta.profile.key }],
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
        ]),
      connector: (node, get) =>
        Effect.gen(function* () {
          const [client] = get(clientAtom);
          if (!client) {
            return [];
          }
          const identity = get(CreateAtom.fromObservable(client.halo.identity));
          const status = get(CreateAtom.fromObservable(client.mesh.networkStatus));

          return [
            Node.make({
              id: Account.id,
              type: meta.profile.key,
              properties: {
                label: ['account.label', { ns: meta.profile.key }],
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
                Node.make({
                  id: Account.Profile,
                  data: Account.Profile,
                  type: meta.profile.key,
                  properties: {
                    label: ['profile.label', { ns: meta.profile.key }],
                    icon: 'ph--user--regular',
                  },
                }),
                Node.make({
                  id: Account.Account,
                  data: Account.Account,
                  type: meta.profile.key,
                  properties: {
                    label: ['account-panel.label', { ns: meta.profile.key }],
                    icon: 'ph--identification-card--regular',
                  },
                }),
                Node.make({
                  id: Account.Devices,
                  data: Account.Devices,
                  type: meta.profile.key,
                  properties: {
                    label: ['devices.label', { ns: meta.profile.key }],
                    icon: 'ph--devices--regular',
                    testId: 'clientPlugin.devices',
                  },
                }),
                Node.make({
                  id: Account.Security,
                  data: Account.Security,
                  type: meta.profile.key,
                  properties: {
                    label: ['security.label', { ns: meta.profile.key }],
                    icon: 'ph--key--regular',
                  },
                }),
                Node.make({
                  id: Account.Invitations,
                  data: Account.Invitations,
                  type: meta.profile.key,
                  properties: {
                    label: ['invitations-panel.label', { ns: meta.profile.key }],
                    icon: 'ph--ticket--regular',
                  },
                }),
                Node.make({
                  id: Account.Usage,
                  data: Account.Usage,
                  type: meta.profile.key,
                  properties: {
                    label: ['usage-panel.label', { ns: meta.profile.key }],
                    icon: 'ph--chart-bar--regular',
                  },
                }),
              ],
            }),
          ];
        }).pipe(Effect.orDie),
    });

    return Capability.provide(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
