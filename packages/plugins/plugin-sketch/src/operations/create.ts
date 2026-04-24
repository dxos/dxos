//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Sketch } from '../types';
import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(({ name, schema = Sketch.TLDRAW_SCHEMA, content = {} }) =>
    Effect.succeed({
      object: Sketch.make({ name, canvas: { schema, content } }),
    }),
  ),
);

export default handler;
