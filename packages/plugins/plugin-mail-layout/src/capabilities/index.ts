//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { OperationHandlerSet } from '@dxos/compute';

export { MailLayoutState } from './layout-state';

export const ReactRoot = Capability.lazy('ReactRoot', () => import('./react-root'));
export const LayoutState = Capability.lazy('LayoutState', () => import('./layout-state'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
