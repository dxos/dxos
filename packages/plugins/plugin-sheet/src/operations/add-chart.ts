//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Sheet, SheetOperation } from '#types';

const handler: Operation.WithHandler<typeof SheetOperation.AddChart> = SheetOperation.AddChart.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sheet: sheetRef, ...props }) {
      const sheet = yield* Database.load(sheetRef);
      const chart = Sheet.addChart(sheet, props);
      yield* Database.flush();
      return { id: Obj.getURI(chart).toString() };
    }),
  ),
);

export default handler;
