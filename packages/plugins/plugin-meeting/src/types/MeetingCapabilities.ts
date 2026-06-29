//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription/types';

import { meta } from '#meta';

import { Meeting, type Settings as SettingsType } from './index';

export const Settings = Capability.make<Atom.Writable<SettingsType.Settings>>(
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

export const State = Capability.make<MeetingStateStore>(`${meta.profile.key}.capability.state`);
