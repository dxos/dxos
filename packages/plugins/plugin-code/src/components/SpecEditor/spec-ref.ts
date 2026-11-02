//
// Copyright 2026 DXOS.org
//

import { duplicateSpecMessage, missingItemMessage, unknownSpecMessage } from '@dxos/deus/extension';
import { type SourceKey } from '@dxos/deus/review';
import { type SpecIndex } from '@dxos/deus/spec-index';

/** The repository the bundled index describes; another repository needs its own index. */
const INDEX_REPO = { owner: 'dxos', repo: 'dxos' } as const;

/**
 * Resolves a spec id (and optionally an item in it) to the `github:` key of the spec's file, with the item as the
 * fragment; an unresolvable reference yields the lint message that describes it.
 */
export const resolveSpecRef = (index: SpecIndex, id: string, item?: string): SourceKey | { error: string } => {
  if (id in index.duplicates) {
    return { error: duplicateSpecMessage(id) };
  }
  const entry = index.specs[id];
  if (!entry) {
    return { error: unknownSpecMessage(id) };
  }
  if (item && !entry.items.includes(item)) {
    return { error: missingItemMessage(id, item) };
  }
  return { ...INDEX_REPO, path: entry.path, ...(item && { fragment: item }) };
};
