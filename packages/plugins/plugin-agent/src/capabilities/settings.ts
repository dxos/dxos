//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { AgentCapabilities, AgentSettings } from '#types';

import { AgentNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: AgentNamespace.key,
      schema: AgentSettings.Settings,
      defaultValue: () => ({}),
    });

    return [
      Capability.contribute(AgentCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: AgentNamespace.key,
        schema: AgentSettings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
