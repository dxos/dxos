//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { WnfsFile, WnfsOperation } from '../types';

const handler: Operation.WithHandler<typeof WnfsOperation.Create> = WnfsOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, type, cid }) {
      return {
        object: WnfsFile.make({ name, type, cid }),
      };
    }),
  ),
);

export default handler;
