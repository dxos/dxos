//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Sheet, SheetOperation } from '#types';

/** One cell or a rectangle of cells in A1 notation; a chart of anything else draws nothing. */
const A1_RANGE = /^[A-Z]+[1-9]\d*(:[A-Z]+[1-9]\d*)?$/;

const handler: Operation.WithHandler<typeof SheetOperation.AddChart> = SheetOperation.AddChart.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sheet: sheetRef, ...props }) {
      if (!A1_RANGE.test(props.range)) {
        return yield* Effect.die(new Error(`Not a range in A1 notation: "${props.range}" (e.g. "A1:C6").`));
      }
      const sheet = yield* Database.load(sheetRef);
      const chart = Sheet.addChart(sheet, props);
      yield* Database.flush();
      return { id: Obj.getURI(chart).toString() };
    }),
  ),
);

export default handler;
