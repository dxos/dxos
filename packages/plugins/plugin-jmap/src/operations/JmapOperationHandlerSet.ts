//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { JmapOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  JmapOperation.MaterializeJmapTarget.pipe(Operation.lazyHandler(() => import('./mail/materialize/handler'))),
  JmapOperation.JmapSend.pipe(Operation.lazyHandler(() => import('./mail/send'))),
  JmapOperation.JmapSync.pipe(Operation.lazyHandler(() => import('./mail/sync'))),
]);
