//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import { type TranscriptionSettingsProps, TranscriptionSettingsSchema } from '../types';

export default () => {
  const settings = live<TranscriptionSettingsProps>({});

  return contributes(Capabilities.Settings, {
    schema: TranscriptionSettingsSchema,
    prefix: TRANSCRIPTION_PLUGIN,
    value: settings,
  });
};
