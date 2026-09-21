//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { MeetingCapabilities, Settings } from '#types';
import { MeetingEvents } from '#types';

export const MeetingSettings = Capability.makeModule(
  'MeetingSettings',
  { provides: [MeetingCapabilities.SettingsAtom], activatesOn: MeetingEvents.Start },
  () =>
    Effect.sync(() => {
      const settingsAtom = createKvsStore({
        key: meta.profile.key,
        schema: Settings.Settings,
        defaultValue: () => ({}),
      });

      return Capability.contribute(MeetingCapabilities.SettingsAtom, settingsAtom);
    }),
);
