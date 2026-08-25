//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';

import { meta } from '#meta';

/**
 * Role token for the transient-stats panel — renders the {@link AppCapabilities.StatsPanel} store
 * (arbitrary reactive telemetry keyed by owner id). A layout targets this role (role-only dispatch);
 * the surface reads the store directly, so it needs no subject.
 */
export const Stats = Role.make<Record<string, unknown>>(`${meta.profile.key}.surface.stats`);
