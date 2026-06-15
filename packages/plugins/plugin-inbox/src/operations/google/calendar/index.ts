//
// Copyright 2025 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import Create from './create';
import List from './list';
import Sync from './sync';

export const CalendarFunctions: {
  Create: Operation.WithHandler<Operation.Definition.Any>;
  List: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Create,
  List,
  Sync,
};

export const CalendarHandlers = OperationHandlerSet.lazy(
  () => import('./create'),
  () => import('./list'),
  () => import('./sync'),
);
