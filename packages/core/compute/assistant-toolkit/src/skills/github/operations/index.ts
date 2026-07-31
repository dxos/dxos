//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as GithubOperations from './definitions';

export const GithubHandlers = OperationHandlerSet.lazy(() => import('./fetch-prs'));
