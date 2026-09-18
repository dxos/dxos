//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';
import type { AppSurface } from '@dxos/app-toolkit/ui';

import { meta } from '#meta';

/**
 * Role token for the transient-stats panel — renders the {@link AppCapabilities.StatsPanel} store
 * (arbitrary reactive telemetry keyed by owner id). A layout targets this role (role-only dispatch);
 * the surface reads the store directly, so it needs no subject.
 */
export const Stats = Role.make<Record<string, unknown>>(`${meta.profile.key}.surface.stats`);

/** Article data for a page of the debug panel, whose nodes have no URL for `LayoutOperation.Open`. */
export type PageData = AppSurface.ArticleData<unknown, { onNavigate: (nodeId: string) => void }>;

/**
 * The role every debug-panel page registers its surface on: the article role, typed with
 * {@link PageData}. Spelled out rather than read from `AppSurface.Article`, which would pull the UI
 * barrel into this types module.
 *
 * TODO(wittjosiah): Should the drawer render its pages through a surface role of its own rather than
 *   the article role?
 */
export const Page = Role.make<PageData>('org.dxos.role.article');
