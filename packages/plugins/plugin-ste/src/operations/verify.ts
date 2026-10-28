//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import * as SteCheck from '../check/SteCheck.ts';
import * as SteOperation from './SteOperation.ts';

export default SteOperation.Verify.pipe(
  Operation.withHandler(({ text, mode, vocabulary }) =>
    Effect.sync(() => {
      const report = SteCheck.check(text, { mode, vocabulary });
      return { passed: report.errors.length === 0, ...report };
    }),
  ),
);
