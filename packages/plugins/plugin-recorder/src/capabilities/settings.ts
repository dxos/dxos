//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { RecorderCapabilities, RecorderSettings } from '#types';

import { RecorderNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: RecorderNamespace.key,
      schema: RecorderSettings.Settings,
      defaultValue: RecorderSettings.defaults,
    });

    return [
      Capability.contribute(RecorderCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: RecorderNamespace.key,
        schema: RecorderSettings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
