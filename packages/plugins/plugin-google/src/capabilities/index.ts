//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const Connector = Capability.lazy('GoogleConnector', () => import('./connector'));
export const MailSend = Capability.lazy('GoogleMailSend', () => import('./mail-send'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
