//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { NativeCapabilities, Settings } from '#types';

import { NativeNamespace } from '../namespace.ts';
import { settingsAtom } from '../settings-store.ts';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(NativeCapabilities.Settings, settingsAtom),
    Capability.contribute(AppCapabilities.Settings, {
      prefix: NativeNamespace.key,
      schema: Settings.Settings,
      atom: settingsAtom,
    }),
  ]),
);
