//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';

import { meta } from '#meta';

import * as Meeting from './Meeting.ts';
import type * as Settings from './Settings.ts';

export const SettingsAtom = Capability.makeSingleton<Atom.Writable<Settings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
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

export const State = Capability.makeSingleton<MeetingStateStore>()(`${meta.profile.key}.capability.state`);
