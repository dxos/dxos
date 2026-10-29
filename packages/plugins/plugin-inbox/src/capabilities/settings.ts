//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { InboxCapabilities, Settings } from '#types';

import { InboxNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: InboxNamespace.key,
      schema: Settings.Settings,
      defaultValue: () => ({
        conversations: true,
        loadRemoteImages: false,
      }),
    });

    return [
      Capability.contribute(InboxCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: InboxNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
