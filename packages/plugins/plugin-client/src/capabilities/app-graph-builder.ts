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
import { type Client } from '@dxos/client';
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
    // Panels backed by hub services render an empty shell without one, so they contribute no node.
    const hasHub = (clients: readonly Client[]): boolean =>
      !!clients[0]?.config.values?.runtime?.app?.env?.DX_HUB_URL;
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
          const hub = hasHub([client]);

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
            }),
          ];
        }).pipe(Effect.orDie),
    });

    const accountProfile = yield* AppGraphBuilder.createExtension({
      id: 'accountProfile',
      url: { key: Account.Profile, kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenId(Account.workspacePath),
      connector: (_node, get) =>
        Effect.gen(function* () {
          return [
            AppGraphNode.make({
              id: Account.Profile,
              data: Account.path(Account.Profile),
              type: meta.profile.key,
              properties: {
                label: ['profile.label', { ns: meta.profile.key }],
                icon: 'ph--user--regular',
              },
            }),
          ];
        }).pipe(Effect.orDie),
    });

    const accountAccount = yield* AppGraphBuilder.createExtension({
      id: 'accountAccount',
      url: { key: Account.Account, kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenId(Account.workspacePath),
      connector: (_node, get) =>
        Effect.gen(function* () {
          if (!hasHub(get(clientAtom))) {
            return [];
          }
          return [
            AppGraphNode.make({
              id: Account.Account,
              data: Account.path(Account.Account),
              type: meta.profile.key,
              properties: {
                label: ['account-panel.label', { ns: meta.profile.key }],
                icon: 'ph--identification-card--regular',
              },
            }),
          ];
        }).pipe(Effect.orDie),
    });

    const accountSecurity = yield* AppGraphBuilder.createExtension({
      id: 'accountSecurity',
      url: { key: Account.Security, kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenId(Account.workspacePath),
      connector: (_node, get) =>
        Effect.gen(function* () {
          return [
            AppGraphNode.make({
              id: Account.Security,
              data: Account.path(Account.Security),
              type: meta.profile.key,
              properties: {
                label: ['security.label', { ns: meta.profile.key }],
                icon: 'ph--key--regular',
              },
            }),
          ];
        }).pipe(Effect.orDie),
    });

    const accountDevices = yield* AppGraphBuilder.createExtension({
      id: 'accountDevices',
      url: { key: Account.Devices, kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenId(Account.workspacePath),
      connector: (_node, get) =>
        Effect.gen(function* () {
          return [
            AppGraphNode.make({
              id: Account.Devices,
              data: Account.path(Account.Devices),
              type: meta.profile.key,
              properties: {
                label: ['devices.label', { ns: meta.profile.key }],
                icon: 'ph--devices--regular',
                testId: 'clientPlugin.devices',
              },
            }),
          ];
        }).pipe(Effect.orDie),
    });

    const accountInvitations = yield* AppGraphBuilder.createExtension({
      id: 'accountInvitations',
      url: { key: Account.Invitations, kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenId(Account.workspacePath),
      connector: (_node, get) =>
        Effect.gen(function* () {
          if (!hasHub(get(clientAtom))) {
            return [];
          }
          return [
            AppGraphNode.make({
              id: Account.Invitations,
              data: Account.path(Account.Invitations),
              type: meta.profile.key,
              properties: {
                label: ['invitations-panel.label', { ns: meta.profile.key }],
                icon: 'ph--ticket--regular',
              },
            }),
          ];
        }).pipe(Effect.orDie),
    });

    const accountUsage = yield* AppGraphBuilder.createExtension({
      id: 'accountUsage',
      url: { key: Account.Usage, kind: 'singleton', path: [] },
      match: GraphNodeMatcher.whenId(Account.workspacePath),
      connector: (_node, get) =>
        Effect.gen(function* () {
          if (!hasHub(get(clientAtom))) {
            return [];
          }
          return [
            AppGraphNode.make({
              id: Account.Usage,
              data: Account.path(Account.Usage),
              type: meta.profile.key,
              properties: {
                label: ['usage-panel.label', { ns: meta.profile.key }],
                icon: 'ph--chart-bar--regular',
              },
            }),
          ];
        }).pipe(Effect.orDie),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...extensions,
      ...accountProfile,
      ...accountAccount,
      ...accountSecurity,
      ...accountDevices,
      ...accountInvitations,
      ...accountUsage,
    ]);
  }),
);
