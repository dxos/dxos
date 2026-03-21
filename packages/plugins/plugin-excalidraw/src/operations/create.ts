//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';
import { Sketch } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_SCHEMA } from '../types';
import { Create } from './definitions';

export default Create.pipe(
  Operation.withHandler(({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) =>
    Effect.succeed({
      object: Sketch.make({ name, canvas: { schema, content } }),
    }),
  ),
);
