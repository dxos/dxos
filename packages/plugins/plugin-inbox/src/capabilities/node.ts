//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));

export const MailServices = Capability.lazy('MailServices', () => import('./mail-services'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
