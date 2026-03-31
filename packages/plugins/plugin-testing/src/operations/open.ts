//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(Effect.fnUntraced(function* (input) {
    return input.subject;
  })),
);

export default handler;
