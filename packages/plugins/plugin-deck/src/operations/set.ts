//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { applyActive } from './apply';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const toAttend = yield* applyActive(input.subject as string[]);

      if (toAttend) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: toAttend });
      }
    }),
  ),
);

export default handler;
