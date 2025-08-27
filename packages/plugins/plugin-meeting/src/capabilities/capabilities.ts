//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { type TranscriptionManager } from '@dxos/plugin-transcription';

import { not_meta } from '../meta';
import { type Meeting } from '../types';

export namespace MeetingCapabilities {
  export type State = Live<{
    activeMeeting?: Meeting.Meeting;
    transcriptionManager?: TranscriptionManager;
  }>;
  export const State = defineCapability<State>(`${not_meta.id}/capability/state`);
}
