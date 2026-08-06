//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CreateSandbox, DownloadFile, Exec, UploadFile } from './definitions';

export * from './definitions';

export const SandboxHandlers = OperationHandlerSet.lazy([
  CreateSandbox.pipe(Operation.lazyHandler(() => import('./create-sandbox'))),
  Exec.pipe(Operation.lazyHandler(() => import('./exec'))),
  UploadFile.pipe(Operation.lazyHandler(() => import('./upload-file'))),
  DownloadFile.pipe(Operation.lazyHandler(() => import('./download-file'))),
]);
