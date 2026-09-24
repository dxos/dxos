//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SandboxOperation } from '#types';

export const SandboxHandlers = OperationHandlerSet.lazy([
  SandboxOperation.CreateSandbox.pipe(Operation.lazyHandler(() => import('./create-sandbox.ts'))),
  SandboxOperation.Exec.pipe(Operation.lazyHandler(() => import('./exec.ts'))),
  SandboxOperation.UploadFile.pipe(Operation.lazyHandler(() => import('./upload-file.ts'))),
  SandboxOperation.DownloadFile.pipe(Operation.lazyHandler(() => import('./download-file.ts'))),
]);
