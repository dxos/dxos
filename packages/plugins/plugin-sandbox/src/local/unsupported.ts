//
// Copyright 2026 DXOS.org
//

import * as SandboxService from '../types/SandboxService.ts';

/** Browsers and webviews cannot spawn processes, so there is no local backend there. */
export const getLocalSandboxBackend = (): SandboxService.Backend | undefined => undefined;
