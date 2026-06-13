//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { type Channel } from '@dxos/types';

import { meta } from '#meta';

import { type CallManager as CallManagerImpl, type CallState, type MediaState } from '../calls';
import * as Call from './Call';

export const Manager = Capability.make<CallManagerImpl>(`${meta.id}.capability.call-manager`);

// TODO(wittjosiah): These callbacks could be intents once we support broadcast.
export type CallProperties = {
  onJoin: (state: { channel?: Channel.Channel; roomId?: string }) => Promise<void>;
  onLeave: (roomId?: string) => Promise<void>;
  onCallStateUpdated: (callState: CallState) => Promise<void>;
  onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;
};

export const EventHandler = Capability.make<CallProperties>(`${meta.id}.capability.call-extension`);

/**
 * Pluggable live-transport for a {@link Call.Call}, keyed by `kind`. A
 * `Call.transport.kind` selects the provider; `makeConfig` produces the
 * persisted reconnection config. The built-in Cloudflare provider wraps
 * `CallManager` + `CallsService`.
 */
export type CallTransportProvider = {
  /** Stable provider id, e.g. `org.dxos.call.transport.cloudflare`. */
  kind: string;
  /** Human-readable label. */
  label: string;
  /** Produces the config persisted into `Call.transport.config`. */
  makeConfig: (roomId: string) => Obj.Unknown;
  /** Establish a live session for the call. */
  join: (call: Call.Call) => Promise<void>;
  /** Tear down the live session for the call. */
  leave: (call: Call.Call) => Promise<void>;
};

export const CallTransportProvider = Capability.make<CallTransportProvider>(
  `${meta.id}.capability.call-transport-provider`,
);
