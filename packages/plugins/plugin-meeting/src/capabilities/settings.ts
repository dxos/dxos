//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { MEETING_PLUGIN } from '../meta';
import { MeetingSettingsSchema } from '../types';

export default () => {
  // TODO(wittjosiah): `live` currently doesn't handle schema default values.
  const settings = live(MeetingSettingsSchema, { entityExtraction: true });

  return contributes(Capabilities.Settings, {
    schema: MeetingSettingsSchema,
    prefix: MEETING_PLUGIN,
    value: settings,
  });
};
