//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { CrxCapabilities } from '@dxos/plugin-crx/types';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: ActivationEvents.DeferredStartup,
});

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});

export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./page-action'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
});
