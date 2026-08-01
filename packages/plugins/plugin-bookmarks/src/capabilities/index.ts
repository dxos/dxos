//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { CrxCapabilities, CrxEvents } from '@dxos/plugin-crx/types';

import { BookmarksEvents } from '#types';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'), {
  activatesOn: BookmarksEvents.Start,
});

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: BookmarksEvents.Start,
});

export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
  () => import('./page-action'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
});
