//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DiagramOperation } from '#types';

export const ArchifyOperationHandlerSet = OperationHandlerSet.lazy([
  DiagramOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  DiagramOperation.Read.pipe(Operation.lazyHandler(() => import('./read'))),
  DiagramOperation.Verify.pipe(Operation.lazyHandler(() => import('./verify'))),
  DiagramOperation.Write.pipe(Operation.lazyHandler(() => import('./write'))),
]);
