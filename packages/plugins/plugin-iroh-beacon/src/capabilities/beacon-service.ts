//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Capabilities } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { meta } from '#meta';

import { BeaconService } from '../beacon-service';
import { BroadcastChannelTransport } from '../transport/broadcast-channel-transport';
import { type BeaconState } from '../types';

export namespace BeaconCapabilities {
  export const State = Capability.make<Atom.Atom<BeaconState>>(`${meta.id}.capability.state`);
}

const INITIAL_STATE: BeaconState = {
  transport: 'gossip',
  peers: [],
  localCounter: 0,
  status: 'connecting',
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    const stateAtom = Atom.make<BeaconState>(INITIAL_STATE).pipe(Atom.keepAlive);

    const identity = client.halo.identity.get();
    const deviceKey = client.halo.device?.deviceKey;

    if (identity && deviceKey) {
      const transport = new BroadcastChannelTransport();
      const service = new BeaconService({
        transport,
        peerId: deviceKey.toHex(),
        identityKey: identity.identityKey.toHex(),
        displayName: identity.profile?.displayName ?? undefined,
      });

      service.setOnStateChange(() => {
        registry.set(stateAtom, service.getState());
      });

      void service.open();
    }

    return Capability.contributes(BeaconCapabilities.State, stateAtom);
  }),
);
