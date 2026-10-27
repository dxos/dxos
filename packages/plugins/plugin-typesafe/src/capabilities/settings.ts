//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { TypeSafeCapabilities, TypeSafeSettings } from '#types';

import { TypeSafeNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: TypeSafeNamespace.key,
      schema: TypeSafeSettings.Settings,
      defaultValue: TypeSafeSettings.defaults,
    });

    return [
      Capability.contribute(TypeSafeCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: TypeSafeNamespace.key,
        schema: TypeSafeSettings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
