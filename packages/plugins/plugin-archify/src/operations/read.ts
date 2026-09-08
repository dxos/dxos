//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Validate } from '#model';
import { DiagramOperation } from '#types';

const handler: Operation.WithHandler<typeof DiagramOperation.Read> = DiagramOperation.Read.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ diagram }) {
      const object = yield* Database.load(diagram);
      const { ok, diagnostics } = Validate.validate(object.source);
      return { source: object.source, ok, diagnostics };
    }),
  ),
);

export default handler;
