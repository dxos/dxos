//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Migration } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { LegacySheet, Sheet } from '#types';

// `org.dxos.type.sheet` 0.1.0 -> 0.2.0: each inline chart becomes a `Chart` object owned by the sheet.
export const sheetCharts = Migration.define({
  from: LegacySheet.LegacySheet,
  to: Sheet.Sheet,
  transform: async ({ charts: _charts, ...sheet }) => sheet,
  onMigration: async ({ before, object }) => {
    for (const { id: _id, ...chart } of before.charts ?? []) {
      Sheet.addChart(object, chart);
    }
  },
});

const migrations = [sheetCharts];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, migrations);
  }),
);
