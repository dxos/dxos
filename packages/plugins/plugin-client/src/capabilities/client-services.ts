//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ClientCapabilities } from '#types';

/**
 * Exposes the pieces of the client that plugins read directly — config, the EDGE HTTP client and
 * the ECHO graph — as capabilities, so those plugins need not depend on `@dxos/client`.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const edgeUrl = client.config.get('runtime.services.edge.url');
    return [
      Capability.contribute(ClientCapabilities.Config, client.config),
      Capability.contribute(ClientCapabilities.Hypergraph, client.graph),
      ...(edgeUrl ? [Capability.contribute(ClientCapabilities.EdgeHttpClient, client.edge.http)] : []),
    ];
  }),
);
