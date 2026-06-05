//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';
import { type Channel } from '@dxos/types';

import { meta } from '#meta';

import { type CallManager as CallManagerImpl, type CallState, type MediaState } from '../calls';

export const Manager = Capability.make<CallManagerImpl>(`${meta.id}.capability.call-manager`);

// TODO(wittjosiah): These callbacks could be intents once we support broadcast.
export type CallProperties = {
  onJoin: (state: { channel?: Channel.Channel; roomId?: string }) => Promise<void>;
  onLeave: (roomId?: string) => Promise<void>;
  onCallStateUpdated: (callState: CallState) => Promise<void>;
  onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => Promise<void>;
};

export const EventHandler = Capability.make<CallProperties>(`${meta.id}.capability.call-extension`);
