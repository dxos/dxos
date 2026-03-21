//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(() => Effect.void),
);

export default handler;
