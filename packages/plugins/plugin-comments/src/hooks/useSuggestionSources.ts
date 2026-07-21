//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { type SuggestionSource } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { buildSuggestionSources } from './suggestion-sources';

/** A versioned document — carries the branch registry the suggestion branches live in. */
type VersionedObject = Parameters<typeof Branch.bind>[0];

/**
 * Resolve the active `kind:'suggestion'` branches of a document into overlay {@link SuggestionSource}s
 * — one per author, keyed by `Branch.creator` and coloured deterministically. Each branch is bound
 * (`Branch.bind`) to read its current content; bindings are disposed on change/unmount. Re-resolves
 * when the set of suggestion branches changes.
 */
export const useSuggestionSources = (document?: VersionedObject): SuggestionSource[] => {
  // Re-run when branches are added/removed/archived.
  useObject(document, 'history');
  const branches = (document?.history?.branches ?? []).filter(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion',
  );
  const branchesKey = branches.map((branch) => branch.id).join(',');
  const [sources, setSources] = useState<SuggestionSource[]>([]);

  useEffect(() => {
    if (!document || branches.length === 0) {
      setSources([]);
      return;
    }

    let disposed = false;
    const bindings: Awaited<ReturnType<typeof Branch.bind>>[] = [];
    Promise.all(
      branches.map(async (branch) => {
        const binding = await Branch.bind(document, branch);
        bindings.push(binding);
        return { author: branch.creator ?? branch.id, content: binding.object.content };
      }),
    )
      .then((resolved) => {
        if (!disposed) {
          setSources(buildSuggestionSources(resolved));
        }
      })
      .catch((error) => log.catch(error));

    return () => {
      disposed = true;
      bindings.forEach((binding) => binding.dispose());
    };
    // `branchesKey` captures the branch set; `document` identity is stable per surface.
  }, [document, branchesKey]);

  return sources;
};
