//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type TranscriptionManager } from '@dxos/plugin-transcription';

import { meta } from '#meta';

import { Meeting } from './index';

export type MeetingState = {
  activeMeeting?: Meeting.Meeting;
  transcriptionManager?: TranscriptionManager;
};

export type MeetingStateStore = {
  stateAtom: Atom.Writable<MeetingState>;
  get state(): MeetingState;
  updateState: (updater: (current: MeetingState) => MeetingState) => void;
};

export const State = Capability.make<MeetingStateStore>(`${meta.id}.capability.state`);
