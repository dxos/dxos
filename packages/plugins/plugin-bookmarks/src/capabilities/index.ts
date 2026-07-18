//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation, OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import { CrxCapabilities, type PageAction } from '@dxos/plugin-crx/types';

export const CommentConfig = Capability.lazyModule(
  'CommentConfig',
  { provides: [AppCapabilities.CommentConfig] },
  () => import('./comment-config'),
);

export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);

export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction] },
  () => import('./page-action'),
);

export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
