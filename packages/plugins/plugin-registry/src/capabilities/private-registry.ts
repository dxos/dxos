//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Registry from '@dxos/app-framework/Registry';
import { EdgeHttpClient } from '@dxos/edge-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/**
 * Adds the signed-in user's private plugins to the registry catalog. They are listed only to the
 * identity that published them, so the provider joins once an EDGE identity exists (on this boot,
 * or when one is created later) rather than with the public catalog at startup, and is replaced
 * when that identity changes.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Capabilities.PluginManager;
    const client = yield* ClientCapabilities.Client;
    const identityService = yield* ClientCapabilities.IdentityService;

    const edgeUrl = client.config.values.runtime?.services?.edge?.url;
    if (!edgeUrl) {
      return [];
    }

    // One provider per identity, so another identity's listings and caches never outlive a switch.
    let current: { did: string; http: EdgeHttpClient; provider: Registry.EdgePluginProvider } | undefined;
    const unsubscribe = identityService.subscribe(() => {
      const edgeIdentity = identityService.getEdgeIdentity();
      const did = Option.isSome(edgeIdentity) ? edgeIdentity.value.identityDid : undefined;
      if (current && current.did !== did) {
        manager.pluginRegistry.removeProvider(current.provider);
        current = undefined;
      }
      if (!did || Option.isNone(edgeIdentity)) {
        return;
      }
      if (current) {
        current.http.setIdentity(edgeIdentity.value);
        return;
      }
      const http = new EdgeHttpClient(edgeUrl);
      http.setIdentity(edgeIdentity.value);
      current = { did, http, provider: new Registry.EdgePluginProvider(http, { catalog: 'private' }) };
      manager.pluginRegistry.addProvider(current.provider);
    });

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        if (current) {
          manager.pluginRegistry.removeProvider(current.provider);
        }
      }),
    );
    return [];
  }),
);
