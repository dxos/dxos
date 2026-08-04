//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CreateSandbox, DownloadFile, Exec, UploadFile } from './definitions';

export * from './definitions';

export const SandboxHandlers = OperationHandlerSet.keyed([
  [CreateSandbox, () => import('./create-sandbox')],
  [Exec, () => import('./exec')],
  [UploadFile, () => import('./upload-file')],
  [DownloadFile, () => import('./download-file')],
]);
