//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { MeetingRecorderCapabilities, Settings } from '#types';

import { MeetingRecorderNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: MeetingRecorderNamespace.key,
      schema: Settings.Settings,
      defaultValue: Settings.defaultSettings,
    });

    return [
      Capability.contribute(MeetingRecorderCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: MeetingRecorderNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
