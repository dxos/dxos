//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type PluginEntry } from '@dxos/protocols';

import { RegistryCapabilities, type CommunityPluginsState } from '#types';

/**
 * Fetches the community plugin catalog from the Edge registry service and
 * filters out unhealthy entries.
 */
export const loadCommunityPlugins = (client: EdgeHttpClient): Effect.Effect<readonly PluginEntry[], Error> =>
  Effect.tryPromise({
    try: () => client.getRegistryPlugins(Context.default()),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  }).pipe(Effect.map((body) => body.plugins.filter((entry) => entry.health === 'ok')));

const emptyAtom = Atom.make<CommunityPluginsState>({ entries: [], loading: true, error: null });

/**
 * Reads the community plugin catalog from the registry state capability. The
 * catalog is loaded once at plugin startup so this hook is purely reactive.
 * Returns the empty/loading state until the state capability activates.
 */
export const useCommunityPlugins = (): CommunityPluginsState => {
  const atoms = useCapabilities(RegistryCapabilities.State);
  return useAtomValue(atoms[0] ?? emptyAtom);
};
