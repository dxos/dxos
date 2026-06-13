//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type TranscriptionManager } from '@dxos/plugin-transcription';
import { type Channel } from '@dxos/types';

import { meta } from '#meta';

import * as Call from './Call';
import * as SettingsType from './Settings';

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

export const Settings = Capability.make<Atom.Writable<SettingsType.Settings>>(`${meta.id}.capability.settings`);

export type CallRecordState = {
  activeCall?: Call.Call;
  transcriptionManager?: TranscriptionManager;
};

export type CallRecordStore = {
  stateAtom: Atom.Writable<CallRecordState>;
  get state(): CallRecordState;
  updateState: (updater: (current: CallRecordState) => CallRecordState) => void;
};

export const RecordState = Capability.make<CallRecordStore>(`${meta.id}.capability.record-state`);
