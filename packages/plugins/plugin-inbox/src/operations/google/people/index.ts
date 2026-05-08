//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import Sync from './sync';

export const ContactsFunctions: {
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Sync,
};

export const ContactsHandlers = OperationHandlerSet.lazy(() => import('./sync'));
