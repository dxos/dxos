//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CrmOperation } from '#types';

export const CrmOperationHandlerSet = OperationHandlerSet.lazy([
  CrmOperation.AttachImage.pipe(Operation.lazyHandler(() => import('./attach-image.ts'))),
  CrmOperation.EnrichImages.pipe(Operation.lazyHandler(() => import('./enrich-images.ts'))),
  CrmOperation.ProcessMailbox.pipe(Operation.lazyHandler(() => import('./process-mailbox.ts'))),
  CrmOperation.ResearchPerson.pipe(Operation.lazyHandler(() => import('./research-person.ts'))),
  CrmOperation.ResearchOrganization.pipe(Operation.lazyHandler(() => import('./research-organization.ts'))),
]);
