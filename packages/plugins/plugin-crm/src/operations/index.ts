//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as CrmOperation from '../types/CrmOperation';

export const CrmOperationHandlerSet = OperationHandlerSet.lazy([
  CrmOperation.AttachImage.pipe(Operation.lazyHandler(() => import('./attach-image'))),
  CrmOperation.EnrichImages.pipe(Operation.lazyHandler(() => import('./enrich-images'))),
  CrmOperation.ProcessMailbox.pipe(Operation.lazyHandler(() => import('./process-mailbox'))),
  CrmOperation.ResearchPerson.pipe(Operation.lazyHandler(() => import('./research-person'))),
  CrmOperation.ResearchOrganization.pipe(Operation.lazyHandler(() => import('./research-organization'))),
]);
