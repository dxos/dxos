// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import * as Operation from '@dxos/compute/Operation';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateSidebar> = LayoutOperation.UpdateSidebar.pipe(
  Operation.withHandler(() => Effect.void),
);

export default handler;
