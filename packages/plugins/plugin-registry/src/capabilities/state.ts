//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { EdgeCommunityPluginProvider } from './community-plugin-provider';
import { RegistryCapabilities, type CommunityPluginsState } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const client = yield* Capability.get(ClientCapabilities.Client);

    const communityPluginsAtom = Atom.make<CommunityPluginsState>({ entries: [], loading: true, error: null }).pipe(
      Atom.keepAlive,
    );

    const provider = new EdgeCommunityPluginProvider(client.edge.http);

    yield* provider.listPlugins().pipe(
      Effect.match({
        onSuccess: (entries) => registry.set(communityPluginsAtom, { entries, loading: false, error: null }),
        onFailure: (error) => {
          log.catch(error);
          registry.set(communityPluginsAtom, { entries: [], loading: false, error });
        },
      }),
      Effect.forkDaemon,
    );

    return [
      Capability.contributes(RegistryCapabilities.State, communityPluginsAtom),
      Capability.contributes(RegistryCapabilities.Provider, provider),
    ];
  }),
);
