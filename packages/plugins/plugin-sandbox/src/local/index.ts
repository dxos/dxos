//
// Copyright 2026 DXOS.org
//

import * as SandboxService from '../types/SandboxService.ts';
import { LocalSandboxBackend } from './LocalSandboxBackend.ts';

let backend: LocalSandboxBackend | undefined;

/**
 * The process's local sandbox backend. One per process: each sandbox's proxies and command lock
 * live on it, so a second instance would run the same sandbox twice. The environment is read here,
 * once, rather than inside the backend.
 */
export const getLocalSandboxBackend = (): SandboxService.Backend | undefined =>
  (backend ??= new LocalSandboxBackend({ root: process.env.DX_SANDBOX_ROOT, path: process.env.PATH }));
