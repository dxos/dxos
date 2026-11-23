//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type { Obj } from '@dxos/echo';

import { DebugNamespace } from '../namespace.ts';

/**
 * Role token for the transient-stats panel — renders the {@link AppCapabilities.StatsPanel} store
 * (arbitrary reactive telemetry keyed by owner id). A layout targets this role (role-only dispatch);
 * the surface reads the store directly, so it needs no subject.
 */
export const Stats = Role.make<Record<string, unknown>>(`${DebugNamespace.key}.surface.stats`);

/** Article data for a page of the debug panel, whose nodes have no URL for `LayoutOperation.Open`. */
export type PageData = AppSurface.ArticleData<unknown, { onNavigate: (nodeId: string) => void }>;

/** Role token for a page of the debug panel; every node under `root/debug` registers its surface on it. */
export const Page = Role.make<PageData>(`${DebugNamespace.key}.surface.page`);

/**
 * Role token for a panel in the Debug companion about the selected object, stacked above its JSON. Any plugin can
 * contribute one, filtering on the object's type (e.g. a token's KMS standing, a trigger's live state).
 */
export const ObjectPanel = Role.make<{ readonly object: Obj.Unknown }>(`${DebugNamespace.key}.surface.objectPanel`);
