//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';

import { MeetingNamespace } from '../namespace.ts';
import * as Meeting from './Meeting.ts';
import type * as Settings from './Settings.ts';

export const SettingsAtom = Capability.makeSingleton<Atom.Writable<Settings.Settings>>()(
  `${MeetingNamespace.key}.capability.settings`,
);

export type MeetingState = {
  activeMeeting?: Meeting.Meeting;
  transcriptionManager?: TranscriptionCapabilities.TranscriptionManager;
};

export type MeetingStateStore = {
  stateAtom: Atom.Writable<MeetingState>;
  get state(): MeetingState;
  updateState: (updater: (current: MeetingState) => MeetingState) => void;
};

export const State = Capability.makeSingleton<MeetingStateStore>()(`${MeetingNamespace.key}.capability.state`);
