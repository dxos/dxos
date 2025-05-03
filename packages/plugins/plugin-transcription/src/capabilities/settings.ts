//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { live } from '@dxos/live-object';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionSettingsSchema } from '../types';

export default () => {
  const settings = live(S.decodeSync(TranscriptionSettingsSchema)({}));

  return contributes(Capabilities.Settings, {
    schema: TranscriptionSettingsSchema,
    prefix: TRANSCRIPTION_PLUGIN,
    value: settings,
  });
};
