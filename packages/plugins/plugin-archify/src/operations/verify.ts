//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { Validate } from '#model';
import { DiagramOperation } from '#types';

const handler: Operation.WithHandler<typeof DiagramOperation.Verify> = DiagramOperation.Verify.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ source }) {
      const { ok, diagnostics } = Validate.validate(source);
      return { ok, diagnostics };
    }),
  ),
);

export default handler;
