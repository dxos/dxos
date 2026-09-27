//
// Copyright 2026 DXOS.org
//

import type * as Capability from '@dxos/app-framework/Capability';

/** Outside the desktop app there is no helper to launch: Node and Bun run local sandboxes in-process. */
export const LocalLauncher: Capability.Module | undefined = undefined;
