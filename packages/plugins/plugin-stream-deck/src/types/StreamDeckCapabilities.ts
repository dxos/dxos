//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';
import type * as Protocol from '#protocol';

export type BridgeStatus = {
  /** `idle` covers "no device plugin installed", which is the normal case for most users. */
  state: 'idle' | 'connecting' | 'connected' | 'incompatible';
  device?: Protocol.DeviceProfile;
};

/**
 * Live connection state, published by the driver so surfaces can show it without opening a
 * connection of their own — the device accepts one client, so there is exactly one bridge.
 */
export const BridgeStatus = Capability.makeSingleton<Atom.Writable<BridgeStatus>>()(
  `${meta.profile.key}.capability.bridgeStatus`,
);
