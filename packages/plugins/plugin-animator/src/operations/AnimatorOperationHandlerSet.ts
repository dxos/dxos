//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { AnimatorOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  AnimatorOperation.CreateAnimation.pipe(Operation.lazyHandler(() => import('./create-animation.ts'))),
  AnimatorOperation.SetKey.pipe(Operation.lazyHandler(() => import('./set-key.ts'))),
  AnimatorOperation.SetScript.pipe(Operation.lazyHandler(() => import('./set-script.ts'))),
]);
