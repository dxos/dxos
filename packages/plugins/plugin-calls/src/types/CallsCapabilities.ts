//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';

import { type CallManager as CallManagerImpl } from '../calls/index.ts';
import { CallsNamespace } from '../namespace.ts';

/** The call manager; plugins that react to a call subscribe to its events (`roomJoined`, `left`, `transcript`, …). */
export const Manager = Capability.makeSingleton<CallManagerImpl>()(`${CallsNamespace.key}.capability.callManager`);

/**
 * Pluggable live-transport for a call, keyed by `kind`. A call is identified by
 * its room id (the anchor object's URI), so join/leave need no persisted state.
 * The built-in Cloudflare provider wraps `CallManager` + `CallsService`.
 */
export type CallTransportProvider = {
  /** Stable provider id, e.g. `org.dxos.call.transport.cloudflare`. */
  kind: string;
  /** Human-readable label. */
  label: string;
  /** Establish a live session for the given room id. */
  join: (roomId: string) => Promise<void>;
  /** Tear down the current live session. */
  leave: () => Promise<void>;
};

// Multi: consumers (`plugin-thread`, `plugin-meeting`) read the full registry via
// `useCapabilities`/`getAll` to check availability and pick a provider.
export const CallTransportProvider = Capability.make<CallTransportProvider>()(
  `${CallsNamespace.key}.capability.callTransportProvider`,
);

export type Call = { roomId: string };
