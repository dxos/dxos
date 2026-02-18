//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { ScriptCapabilities, ScriptSettings } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: ScriptSettings,
      defaultValue: () => ({
        editorInputMode: 'vscode' as const,
      }),
    });

    return [
      Capability.contributes(ScriptCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: ScriptSettings,
        atom: settingsAtom,
      }),
    ];
  }),
);
