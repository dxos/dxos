//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { TranscriptionCapabilities } from './capabilities';

export default () => {
  const state = create<TranscriptionCapabilities.MeetingTranscriptionState>({
    enabled: false,
  });

  return contributes(TranscriptionCapabilities.MeetingTranscriptionState, state);
};
