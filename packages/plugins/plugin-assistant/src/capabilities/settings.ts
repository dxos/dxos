//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { Assistant, AssistantCapabilities } from '#types';

import { AssistantNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: AssistantNamespace.key,
      schema: Assistant.Settings,
      defaultValue: () => ({}),
    });

    return [
      Capability.contribute(AssistantCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: AssistantNamespace.key,
        schema: Assistant.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
