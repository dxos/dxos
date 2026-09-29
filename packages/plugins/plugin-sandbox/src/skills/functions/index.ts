//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RepositoryOperation, SandboxOperation } from '#types';

export const SandboxHandlers = OperationHandlerSet.lazy([
  SandboxOperation.CreateSandbox.pipe(Operation.lazyHandler(() => import('./create-sandbox.ts'))),
  SandboxOperation.Exec.pipe(Operation.lazyHandler(() => import('./exec.ts'))),
  SandboxOperation.UploadFile.pipe(Operation.lazyHandler(() => import('./upload-file.ts'))),
  SandboxOperation.DownloadFile.pipe(Operation.lazyHandler(() => import('./download-file.ts'))),
  SandboxOperation.PublishFiles.pipe(Operation.lazyHandler(() => import('./publish-files.ts'))),
  RepositoryOperation.CreateRepository.pipe(Operation.lazyHandler(() => import('./repository/create-repository.ts'))),
  RepositoryOperation.Push.pipe(
    Operation.lazyHandler(() => import('./repository/sync.ts').then(({ push }) => ({ default: push }))),
  ),
  RepositoryOperation.Pull.pipe(
    Operation.lazyHandler(() => import('./repository/sync.ts').then(({ pull }) => ({ default: pull }))),
  ),
  RepositoryOperation.GetBranches.pipe(
    Operation.lazyHandler(() => import('./repository/read.ts').then(({ branches }) => ({ default: branches }))),
  ),
  RepositoryOperation.GetLog.pipe(
    Operation.lazyHandler(() => import('./repository/read.ts').then(({ log }) => ({ default: log }))),
  ),
  RepositoryOperation.GetTree.pipe(
    Operation.lazyHandler(() => import('./repository/read.ts').then(({ tree }) => ({ default: tree }))),
  ),
  RepositoryOperation.ReadFile.pipe(
    Operation.lazyHandler(() => import('./repository/read.ts').then(({ readFile }) => ({ default: readFile }))),
  ),
]);
