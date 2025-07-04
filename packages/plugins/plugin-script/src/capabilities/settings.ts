//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { ScriptSettingsSchema } from '../types';

export default () => {
  const settings = live(ScriptSettingsSchema, {
    editorInputMode: 'vscode',
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: ScriptSettingsSchema,
    value: settings,
  });
};
