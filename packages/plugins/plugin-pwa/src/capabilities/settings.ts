//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { Settings } from '#types';

import { PwaNamespace } from '../namespace.ts';
import { settingsAtom } from '../settings-store.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => [
    Capability.contribute(AppCapabilities.Settings, {
      prefix: PwaNamespace.key,
      schema: Settings.Settings,
      atom: settingsAtom,
    }),
  ]),
);
