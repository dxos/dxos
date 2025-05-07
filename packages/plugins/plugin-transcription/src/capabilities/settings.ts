//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionSettingsSchema } from '../types';

export default () => {
  // TODO(wittjosiah): `live` currently doesn't handle schema default values.
  const settings = live(TranscriptionSettingsSchema, { entityExtraction: true });

  return contributes(Capabilities.Settings, {
    schema: TranscriptionSettingsSchema,
    prefix: TRANSCRIPTION_PLUGIN,
    value: settings,
  });
};
