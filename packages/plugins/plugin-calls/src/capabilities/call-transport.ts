//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { CallsCapabilities } from '#types';

const CLOUDFLARE_TRANSPORT_KIND = 'org.dxos.call.transport.cloudflare';

/** Built-in Cloudflare {@link CallsCapabilities.CallTransportProvider} over `CallManager`. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
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
