//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '../../meta';
import { DailySummaryCapabilities, DailySummarySettingsSchema } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: DailySummarySettingsSchema,
      defaultValue: () => ({ summaryHour: 21, summaryMinute: 0 }),
    });

    return [
      Capability.contributes(DailySummaryCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: DailySummarySettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);
