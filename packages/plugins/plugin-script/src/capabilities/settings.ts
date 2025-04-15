//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { SCRIPT_PLUGIN } from '../meta';
import { ScriptSettingsSchema } from '../types';

export default () => {
  const settings = create(ScriptSettingsSchema, { editorInputMode: 'vscode' });
  return contributes(Capabilities.Settings, { schema: ScriptSettingsSchema, prefix: SCRIPT_PLUGIN, value: settings });
};
