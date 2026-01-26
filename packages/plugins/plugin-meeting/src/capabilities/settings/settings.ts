//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { Meeting, MeetingCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Meeting.Settings,
      defaultValue: () => ({
        entityExtraction: true,
      }),
    });

    return [
      Capability.contributes(MeetingCapabilities.Settings, settingsAtom),
      Capability.contributes(Common.Capability.Settings, {
        prefix: meta.id,
        schema: Meeting.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
