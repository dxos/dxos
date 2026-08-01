//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import ListGroups from './list-groups';
import Sync from './sync';

export const ContactsFunctions: {
  ListGroups: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  ListGroups,
  Sync,
};

export const ContactsHandlers = OperationHandlerSet.lazy(
  () => import('./list-groups'),
  () => import('./sync'),
);
