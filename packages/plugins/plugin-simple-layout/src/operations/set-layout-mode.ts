// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

const handler: Operation.WithHandler<typeof LayoutOperation.SetLayoutMode> = LayoutOperation.SetLayoutMode.pipe(
  Operation.withHandler(Effect.fnUntraced(function* () {})),
);

export default handler;
