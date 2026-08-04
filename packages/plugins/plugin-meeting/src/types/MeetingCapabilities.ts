//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';

import { meta } from '#meta';

import * as Meeting from './Meeting';
import type * as SettingsType from './Settings';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsType.Settings>>()(
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
