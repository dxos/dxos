//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { SpaceCapabilities, SpaceSettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: SpaceSettingsSchema,
      defaultValue: () => ({
        showHidden: false,
      }),
    });

    return [
      Capability.contributes(SpaceCapabilities.Settings, settingsAtom),
      Capability.contributes(Common.Capability.Settings, {
        prefix: meta.id,
        schema: SpaceSettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);
