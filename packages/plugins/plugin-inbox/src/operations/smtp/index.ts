//
// Copyright 2026 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import Send from './send';

export const SmtpFunctions: {
  Send: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Send,
};

export const SmtpHandlers = OperationHandlerSet.lazy(() => import('./send'));
