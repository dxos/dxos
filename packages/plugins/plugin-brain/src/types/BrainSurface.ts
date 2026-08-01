//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Role } from '@dxos/app-framework';

import { meta } from '#meta';

/**
 * Role token for the standalone per-space facts panel. A layout targets this role (role-only
 * dispatch) and the surface resolves the active space via `useActiveSpace()` — no container coupling.
 */
export const Facts = Role.make<Record<string, any>>(`${meta.profile.key}.surface.facts`);
