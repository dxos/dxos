//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FetchPrs } from './definitions';

export * as GithubOperations from './definitions';

export const GithubHandlers = OperationHandlerSet.lazy([
  FetchPrs.pipe(Operation.lazyHandler(() => import('./fetch-prs'))),
]);
