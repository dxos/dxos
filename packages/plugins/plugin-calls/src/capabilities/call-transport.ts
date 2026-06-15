//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { Call, CallsCapabilities } from '#types';

/**
 * Built-in Cloudflare {@link CallsCapabilities.CallTransportProvider}. Wraps the
 * `CallManager` (the Cloudflare SFU runtime): `makeConfig` produces the persisted
 * room id and `join`/`leave` drive the live session keyed by that room id.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Resolve the manager lazily in callbacks so this module does not force the
    // manager's activation ordering.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(CallsCapabilities.CallTransportProvider, {
      kind: Call.CLOUDFLARE_TRANSPORT_KIND,
      label: 'Cloudflare',
      makeConfig: (roomId) => Obj.make(Call.CloudflareTransportConfig, { roomId }),
      join: async (call) => {
        const callManager = capabilities.get(CallsCapabilities.Manager);
        const config = await call.transport.config.load();
        // Fail fast on a missing/invalid config rather than joining, which would otherwise reuse the
        // manager's stale room id from a previous call.
        if (!Obj.instanceOf(Call.CloudflareTransportConfig, config)) {
          throw new Error('Cloudflare transport config is missing or invalid.');
        }
        callManager.setRoomId(config.roomId);
        await callManager.join();
      },
      leave: async () => {
        const callManager = capabilities.get(CallsCapabilities.Manager);
        await callManager.leave();
      },
    });
  }),
);
