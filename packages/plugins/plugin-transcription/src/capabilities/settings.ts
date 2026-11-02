//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings, TranscriptionCapabilities } from '#types';

import { TranscriptionNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: TranscriptionNamespace.key,
      schema: Settings.Settings,
      defaultValue: () => ({
        entityExtraction: true,
        recordMode: 'toggle' as const,
      }),
    });

    return [
      Capability.contribute(TranscriptionCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: TranscriptionNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
