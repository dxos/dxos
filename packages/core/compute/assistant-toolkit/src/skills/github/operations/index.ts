//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { FetchPrs } from './definitions';

export * as GithubOperations from './definitions';

export const GithubHandlers = OperationHandlerSet.keyed([[FetchPrs, () => import('./fetch-prs')]]);
