//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { TranscriptionCapabilities } from './capabilities';

export default () => {
  const state = live<TranscriptionCapabilities.MeetingTranscriptionState>({
    enabled: false,
  });

  return contributes(TranscriptionCapabilities.MeetingTranscriptionState, state);
};
