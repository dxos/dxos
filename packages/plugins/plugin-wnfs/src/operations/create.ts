//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { WnfsFile } from '../types';

import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, type, cid }) {
      return {
        object: WnfsFile.make({ name, type, cid }),
      };
    }),
  ),
);

export default handler;
