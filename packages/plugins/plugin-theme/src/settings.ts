//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings, ThemeCapabilities } from '#types';

import { ThemeNamespace } from './namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: ThemeNamespace.key,
      schema: Settings.Settings,
      defaultValue: () => ({ appearance: 'system' as const }),
    });

    return [
      Capability.contribute(ThemeCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: ThemeNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
