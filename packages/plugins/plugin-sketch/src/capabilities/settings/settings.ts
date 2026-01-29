//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { SketchCapabilities, SketchSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: SketchSettingsSchema,
      defaultValue: () => ({}),
    });

    return [
      Capability.contributes(SketchCapabilities.Settings, settingsAtom),
      Capability.contributes(Common.Capability.Settings, {
        prefix: meta.id,
        schema: SketchSettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);
