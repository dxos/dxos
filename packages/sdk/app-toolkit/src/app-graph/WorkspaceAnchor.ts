//
// Copyright 2026 DXOS.org
//

import { GraphBuilder } from '@dxos/app-graph';

import { Paths } from '../app';

/**
 * Declaration-only graph extension that registers the workspace tier as a URL {@link GraphBuilder.UrlBinding}
 * of `kind: 'anchor'`: a `w/<workspace>` pair sets the base every following pair resolves against and is
 * consumed rather than opened as a plank. This replaces the previously hard-coded `w` token so the
 * graph-builder → URL contract is uniform. It is workspace-generic (spaces and pinned workspaces alike)
 * and produces no nodes of its own — workspace nodes come from their own producers under the root.
 *
 * Contributed by the active layout plugin (deck / simple-layout) via {@link AppCapabilities.AppGraphBuilder}.
 */
export const createWorkspaceAnchorExtension = (): GraphBuilder.BuilderExtension[] =>
  GraphBuilder.createExtensionRaw({
    id: 'workspaceAnchor',
    url: { key: Paths.WORKSPACE_URL_KEY, kind: 'anchor', path: [] },
  });
