//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Outline } from '../types';
import { CreateOutline } from './definitions';

const handler: Operation.WithHandler<typeof CreateOutline> = CreateOutline.pipe(
  Operation.withHandler(({ name }) =>
    Effect.succeed({
      object: Outline.make({ name }),
    }),
  ),
);

export default handler;
