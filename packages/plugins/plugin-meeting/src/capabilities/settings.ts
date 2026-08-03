//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';

import * as MeetingCapabilities from '../types/MeetingCapabilities';
import * as Settings from '../types/Settings';

// Meeting has no user-configurable settings, so it does NOT contribute
// `AppCapabilities.Settings` (an empty schema renders a blank settings article).
// The store is retained only to fire the settings activation event that gates
// `CallExtension`.
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings.Settings,
      defaultValue: () => ({}),
    });

    return Capability.contribute(MeetingCapabilities.Settings, settingsAtom);
  }),
);
