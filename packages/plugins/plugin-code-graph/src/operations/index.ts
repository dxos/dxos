//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CodeGraphOperation } from '#types';

export const CodeGraphOperationHandlerSet = OperationHandlerSet.lazy([
  CodeGraphOperation.Query.pipe(Operation.lazyHandler(() => import('./query.ts'))),
  CodeGraphOperation.Inspect.pipe(Operation.lazyHandler(() => import('./inspect.ts'))),
  CodeGraphOperation.Read.pipe(Operation.lazyHandler(() => import('./read.ts'))),
  CodeGraphOperation.AddNodes.pipe(Operation.lazyHandler(() => import('./add-nodes.ts'))),
  CodeGraphOperation.AddFromQuery.pipe(Operation.lazyHandler(() => import('./add-from-query.ts'))),
  CodeGraphOperation.AddNeighbors.pipe(Operation.lazyHandler(() => import('./add-neighbors.ts'))),
  CodeGraphOperation.Remove.pipe(Operation.lazyHandler(() => import('./remove.ts'))),
  CodeGraphOperation.RunCommand.pipe(Operation.lazyHandler(() => import('./run-command.ts'))),
  CodeGraphOperation.SetLayout.pipe(Operation.lazyHandler(() => import('./set-layout.ts'))),
]);
