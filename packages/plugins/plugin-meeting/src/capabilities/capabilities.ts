//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { type TranscriptionManager } from '@dxos/plugin-transcription';

import { meta } from '../meta';
import { type Meeting } from '../types';

export namespace MeetingCapabilities {
  export type State = Live<{
    activeMeeting?: Meeting.Meeting;
    transcriptionManager?: TranscriptionManager;
  }>;

  export const State = Capability.make<State>(`${meta.id}/capability/state`);
}
