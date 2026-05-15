//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { Outline, OutlineOperation } from '../types';

const handler: Operation.WithHandler<typeof OutlineOperation.CreateOutline> = OutlineOperation.CreateOutline.pipe(
  Operation.withHandler(({ name }) =>
    Effect.succeed({
      object: Outline.make({ name }),
    }),
  ),
);

export default handler;
