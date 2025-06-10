//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { type TranscriptionManager } from '@dxos/plugin-transcription';

import { MEETING_PLUGIN } from '../meta';
import { type MeetingType } from '../types';

export namespace MeetingCapabilities {
  export type State = Live<{
    activeMeeting?: MeetingType;
    transcriptionManager?: TranscriptionManager;
  }>;
  export const State = defineCapability<State>(`${MEETING_PLUGIN}/capability/state`);
}
