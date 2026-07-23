//
// Copyright 2026 DXOS.org
//

import { GraphBuilder } from '@dxos/app-graph';

import { UrlPath } from '../app';

/**
 * Declaration-only graph extension that registers the companion tier as a URL {@link GraphBuilder.UrlBinding}
 * of `kind: 'linked'`: a `companion/<variant>` pair resolves against the *immediately preceding* plank
 * (not the workspace base), matched by the plank's `~<variant>` linked-segment child. This replaces the
 * previously hard-coded `companion` special-case so the graph-builder → URL contract is uniform — the
 * graph builder stamps and reverse-maps `~<variant>` nodes from this one declaration. It produces no
 * nodes of its own; companion nodes come from their plugins (via {@link AppNode.makeCompanion}).
 *
 * Contributed by the deck (companions are a deck feature) via {@link AppCapabilities.AppGraphBuilder}.
 */
export const createCompanionExtension = (): GraphBuilder.BuilderExtension[] =>
  GraphBuilder.createExtensionRaw({
    id: 'companion',
    url: { key: UrlPath.COMPANION_KEY, kind: 'linked' },
  });
