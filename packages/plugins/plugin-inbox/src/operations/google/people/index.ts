//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import List from './list';
import Sync from './sync';

export const ContactsFunctions: {
  List: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  List,
  Sync,
};

export const ContactsHandlers = OperationHandlerSet.lazy(
  () => import('./list'),
  () => import('./sync'),
);
