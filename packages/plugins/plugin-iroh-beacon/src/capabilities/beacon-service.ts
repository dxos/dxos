//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { meta } from '#meta';

import { BeaconService } from '../beacon-service';
import { BroadcastChannelTransport } from '../transport/broadcast-channel-transport';
import { type BeaconState } from '../types';

export namespace BeaconCapabilities {
  export const State = Capability.make<Atom.Atom<BeaconState>>(`${meta.profile.key}.capability.state`);
}

const INITIAL_STATE: BeaconState = {
  transport: 'gossip',
  peers: [],
  localCounter: 0,
  status: 'connecting',
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const haloIdentity = yield* Capability.get(ClientCapabilities.IdentityService);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    const stateAtom = Atom.make<BeaconState>(INITIAL_STATE).pipe(Atom.keepAlive);

    const identity = Option.getOrUndefined(haloIdentity.getSnapshot());
    const currentDevice = haloIdentity.getDevicesSnapshot().find((device) => device.current);

    if (identity?.identityKey && currentDevice) {
      const transport = new BroadcastChannelTransport();
      const service = new BeaconService({
        transport,
        peerId: currentDevice.key,
        identityKey: identity.identityKey,
        displayName: identity.displayName ?? undefined,
      });

      service.setOnStateChange(() => {
        registry.set(stateAtom, service.getState());
      });

      // BeaconService extends Resource, which manages its own lifecycle via _ctx.
      // The service's internal context handles cleanup of timers and transport.
      void service.open();
    }

    return Capability.contributes(BeaconCapabilities.State, stateAtom);
  }),
);
