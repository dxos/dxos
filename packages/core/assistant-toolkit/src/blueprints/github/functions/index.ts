//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const GithubHandlers = OperationHandlerSet.lazy(() => import('./fetch-prs'));
