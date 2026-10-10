//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { meta } from '#meta';
import { CanvasCapabilities, Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: meta.profile.key,
      schema: Settings.Settings,
      // The overlays are how a new user finds the engine's tools, so they start shown.
      defaultValue: () => ({ showToolbar: true, showPalette: true, dockPanels: true }),
    });

    return [
      Capability.contribute(CanvasCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
