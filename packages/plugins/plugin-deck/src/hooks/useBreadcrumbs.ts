//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { useContext, useEffect, useState } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type Breadcrumb = { id: string; label: string };

/**
 * Resolves a trail of node ids to their (localized) labels for the flat-mode plank heading. Node atoms
 * are read in a commit-phase effect (not during render) to avoid cross-component update warnings,
 * matching {@link useCompanions}.
 */
export const useBreadcrumbs = (ids: string[]): Breadcrumb[] => {
  const { graph } = useAppGraph();
  const registry = useContext(RegistryContext);
  const { t } = useTranslation(meta.profile.key);
  const [crumbs, setCrumbs] = useState<Breadcrumb[]>([]);
  // A stable dependency for the id list; NUL cannot appear in a node id.
  const key = ids.join('\0');

  useEffect(() => {
    const idList = key.length > 0 ? key.split('\0') : [];
    if (idList.length === 0) {
      setCrumbs((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const atoms = idList.map((id) => graph.node(id));
    const update = () => {
      setCrumbs(
        idList.map((id, index) => {
          const node = Option.getOrUndefined(registry.get(atoms[index]));
          const label = toLocalizedString(node?.properties?.label ?? '', t) || id;
          return { id, label };
        }),
      );
    };

    update();
    const unsubscribers = atoms.map((atom) => registry.subscribe(atom, update));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [graph, registry, key, t]);

  return crumbs;
};
