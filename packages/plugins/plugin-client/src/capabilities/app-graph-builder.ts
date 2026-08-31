//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as CreateAtom from '@dxos/app-graph/CreateAtom';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ConnectionState } from '@dxos/client/mesh';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Identity } from '@dxos/halo';

import { meta } from '#meta';
import { ClientOperation } from '#operations';
import { Account, ClientCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read the client through its atom so the extension establishes a reactive dependency:
    // the connector may evaluate before the client module finishes activating (dependency
    // modules contribute individually, not batched per wave) and re-evaluates when it lands.
    const clientAtom = yield* Capability.atom(ClientCapabilities.Client);
    const identityServiceAtom = yield* Capability.atom(ClientCapabilities.IdentityService);
    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'root',
      match: GraphNodeMatcher.whenRoot,
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
          const [identityService] = get(identityServiceAtom);
          const identity = identityService ? Option.getOrUndefined(get(Identity.atom(identityService))) : undefined;
          const status = get(CreateAtom.fromObservable(client.mesh.networkStatus));
          // Account, invitations, and usage are all hub-service reads; without a hub URL there is
          // no `HubHttpClient` capability and those panels render empty shells forever.
          const hub = !!client.config.values?.runtime?.app?.env?.DX_HUB_URL;

          return [
            AppGraphNode.make({
              id: Account.id,
              type: meta.profile.key,
              properties: {
                label: ['account.label', { ns: meta.profile.key }],
                icon: 'ph--user--regular',
                disposition: 'user-account',
                testId: 'clientPlugin.account',
                // NOTE: This currently needs to be the identity key because the fallback is generated from hex.
                userId: identity?.identityKey,
                hue: identity?.data?.hue,
                emoji: identity?.data?.emoji,
                status: status.swarm === ConnectionState.OFFLINE ? 'error' : 'active',
              },
              nodes: [
                AppGraphNode.make({
                  id: Account.Profile,
                  data: Account.Profile,
                  type: meta.profile.key,
                  properties: {
                    label: ['profile.label', { ns: meta.profile.key }],
                    icon: 'ph--user--regular',
                  },
                }),
                ...(hub
                  ? [
                      AppGraphNode.make({
                        id: Account.Account,
                        data: Account.Account,
                        type: meta.profile.key,
                        properties: {
                          label: ['account-panel.label', { ns: meta.profile.key }],
                          icon: 'ph--identification-card--regular',
                        },
                      }),
                    ]
                  : []),
                AppGraphNode.make({
                  id: Account.Security,
                  data: Account.Security,
                  type: meta.profile.key,
                  properties: {
                    label: ['security.label', { ns: meta.profile.key }],
                    icon: 'ph--key--regular',
                  },
                }),
                AppGraphNode.make({
                  id: Account.Devices,
                  data: Account.Devices,
                  type: meta.profile.key,
                  properties: {
                    label: ['devices.label', { ns: meta.profile.key }],
                    icon: 'ph--devices--regular',
                    testId: 'clientPlugin.devices',
                  },
                }),
                ...(hub
                  ? [
                      AppGraphNode.make({
                        id: Account.Invitations,
                        data: Account.Invitations,
                        type: meta.profile.key,
                        properties: {
                          label: ['invitations-panel.label', { ns: meta.profile.key }],
                          icon: 'ph--ticket--regular',
                        },
                      }),
                      AppGraphNode.make({
                        id: Account.Usage,
                        data: Account.Usage,
                        type: meta.profile.key,
                        properties: {
                          label: ['usage-panel.label', { ns: meta.profile.key }],
                          icon: 'ph--chart-bar--regular',
                        },
                      }),
                    ]
                  : []),
              ],
            }),
          ];
        }).pipe(Effect.orDie),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
