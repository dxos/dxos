//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { TRANSCRIPTION_PLUGIN } from '../meta';

export namespace TranscriptionCapabilities {
  // TODO(burdon): Currently this is just a marker; adapt useVoiceInput to use this.
  export const Transcription = defineCapability<null>(`${TRANSCRIPTION_PLUGIN}/capability/transcription`);
}
