//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as S from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../meta';

const Settings = S.Struct({});

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings,
      defaultValue: () => ({}),
    });

    return Capability.contributes(AppCapabilities.Settings, {
      prefix: meta.id,
      schema: Settings,
      atom: settingsAtom,
    });
  }),
);
