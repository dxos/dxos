//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { CallsCapabilities } from '#types';

const CLOUDFLARE_TRANSPORT_KIND = 'org.dxos.call.transport.cloudflare';

/** Built-in Cloudflare {@link CallsCapabilities.CallTransportProvider} over `CallManager`. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Presence of a transport provider is what the UI offers a call on, so an unconfigured calls
    // service must contribute nothing rather than let `join()` fail behind an enabled control.
    const client = yield* ClientCapabilities.Client;
    if (!getEdgeServiceEndpoint(client.config, EdgeServiceName.Calls)) {
      log('cloudflare call transport disabled: calls service is not configured');
      return [];
    }

    // Resolve the manager lazily in callbacks so this module does not force the
    // manager's activation ordering.
    const capabilities = yield* Capability.Service;

    return Capability.contribute(CallsCapabilities.CallTransportProvider, {
      kind: CLOUDFLARE_TRANSPORT_KIND,
      label: 'Cloudflare',
      join: async (roomId) => {
        const callManager = capabilities.get(CallsCapabilities.Manager);
        // Joining is exclusive — the swarm rejects a second join (and `setRoomId` is ignored while
        // joined), so leave any in-progress call before switching rooms.
        if (callManager.joined) {
          await callManager.leave();
        }
        callManager.setRoomId(roomId);
        await callManager.join();
      },
      leave: async () => {
        const callManager = capabilities.get(CallsCapabilities.Manager);
        await callManager.leave();
      },
    });
  }),
);
