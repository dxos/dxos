//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';
import * as Sheet from '@dxos/plugin-sheet/Sheet';

import { type Sheets, makeSheets } from './sheets.ts';

export type Provides = {
  readonly sheets: Sheets;
};

export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('fieldstoneMetrics', {
  schemas: [Sheet.Sheet, Sheet.Chart],
  run: () =>
    Effect.gen(function* () {
      const sheets = yield* makeSheets();
      yield* SampleSpace.collection(
        'Metrics',
        Object.values(sheets).map((sheet) => Ref.make(sheet)),
      );
      return { sheets };
    }),
});
