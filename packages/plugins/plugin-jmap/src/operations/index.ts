//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

export const JmapOperationHandlerSet = OperationHandlerSet.lazy([
  InboxOperation.MaterializeJmapTarget.pipe(Operation.lazyHandler(() => import('./mail/materialize/handler'))),
  InboxOperation.JmapSend.pipe(Operation.lazyHandler(() => import('./mail/send'))),
  InboxOperation.JmapSync.pipe(Operation.lazyHandler(() => import('./mail/sync'))),
]);
