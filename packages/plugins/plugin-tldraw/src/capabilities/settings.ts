//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings, TldrawCapabilities } from '#types';

import { TldrawNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: TldrawNamespace.key,
      schema: Settings.Settings,
      defaultValue: () => ({}),
    });

    return [
      Capability.contribute(TldrawCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: TldrawNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
