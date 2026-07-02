//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';
import { type Channel } from '@dxos/types';

import { meta } from '#meta';

import { type CallManager as CallManagerImpl, type CallState, type MediaState, type TranscriptEvent } from '../calls';

export const Manager = Capability.make<CallManagerImpl>(`${meta.profile.key}.capability.call-manager`);

// TODO(wittjosiah): These callbacks could be intents once we support broadcast.
export type CallProperties = {
  onJoin: (state: { channel?: Channel.Channel; roomId?: string }) => Promise<void>;
  onLeave: (roomId?: string) => Promise<void>;
  onCallStateUpdated: (callState: CallState) => Promise<void>;
  onMediaStateUpdated?: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;
  /** Native transcription segment for this client's own speech (RealtimeKit on-network ASR). */
  onTranscript?: (event: TranscriptEvent) => Promise<void> | void;
};

export const EventHandler = Capability.make<CallProperties>(`${meta.profile.key}.capability.call-extension`);

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

export const CallTransportProvider = Capability.make<CallTransportProvider>(
  `${meta.profile.key}.capability.call-transport-provider`,
);

export type Call = { roomId: string };
