//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { ScriptSettings } from '../types';

export default Capability.makeModule(() => {
  const settings = live<ScriptSettings>({
    editorInputMode: 'vscode',
  });

  return Capability.contributes(Common.Capability.Settings, {
    prefix: meta.id,
    schema: ScriptSettings,
    value: settings,
  });
});
