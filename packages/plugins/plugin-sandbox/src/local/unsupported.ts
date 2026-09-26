//
// Copyright 2026 DXOS.org
//

import { type SandboxBackend } from '../services/SandboxBackend.ts';

/** Browsers and webviews cannot spawn processes, so there is no local backend there. */
export const getLocalSandboxBackend = (): SandboxBackend | undefined => undefined;
