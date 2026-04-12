//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { applyPreset as generatePreset } from '#presets';

import { ApplyPreset } from './definitions';

const handler: Operation.WithHandler<typeof ApplyPreset> = ApplyPreset.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ pattern, preset, colors }) {
      const cells = generatePreset(preset, pattern.gridType, pattern.gridWidth, pattern.gridHeight, [...colors]);
      Obj.change(pattern, (pattern) => {
        pattern.cells = cells;
      });
      return pattern;
    }),
  ),
);

export default handler;
