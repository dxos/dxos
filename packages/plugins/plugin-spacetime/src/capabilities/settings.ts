//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings, SpacetimeCapabilities } from '#types';

import { SpacetimeNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: SpacetimeNamespace.key,
      schema: Settings.Settings,
      defaultValue: () => ({}),
    });

    return [
      Capability.contribute(SpacetimeCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: SpacetimeNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
