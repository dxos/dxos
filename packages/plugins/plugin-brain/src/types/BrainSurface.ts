//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';

import { BrainNamespace } from '../namespace.ts';

/**
 * Role token for the standalone per-space facts panel. A layout targets this role (role-only
 * dispatch) and the surface resolves the active space via `useActiveSpace()` - no container coupling.
 */
export const Facts = Role.make<Record<string, any>>(`${BrainNamespace.key}.surface.facts`);
