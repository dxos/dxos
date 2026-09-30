//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { EdgeRegistryPluginProvider } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { EdgeHttpClient } from '@dxos/edge-client';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/**
 * Adds the signed-in user's private plugins to the registry catalog. They are listed only to the
 * identity that published them, so the provider joins once an EDGE identity exists (on this boot,
 * or when one is created later) rather than with the public catalog at startup.
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

    const http = new EdgeHttpClient(edgeUrl);
    let added = false;
    const unsubscribe = identityService.subscribe(() => {
      const edgeIdentity = identityService.getEdgeIdentity();
      if (Option.isNone(edgeIdentity)) {
        return;
      }
      http.setIdentity(edgeIdentity.value);
      if (!added) {
        added = true;
        manager.pluginRegistry.addProvider(new EdgeRegistryPluginProvider(http, { catalog: 'private' }));
      }
    });

    yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
    return [];
  }),
);
