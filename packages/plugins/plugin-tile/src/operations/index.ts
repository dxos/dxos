//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./apply-preset'),
);

export { Create, ApplyPreset } from './definitions';

export const TileHandlers = Handlers;
