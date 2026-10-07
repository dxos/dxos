//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Option from 'effect/Option';
import { useContext, useEffect, useState } from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Obj } from '@dxos/echo';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export type Breadcrumb = { id: string; label: string };

/**
 * Resolves a trail of node ids to their (localized) labels for the flat-mode plank heading. Node atoms
 * are read in a commit-phase effect (not during render) to avoid cross-component update warnings,
 * matching {@link useCompanions}.
 */
export const useBreadcrumbs = (ids: string[]): Breadcrumb[] => {
  const { graph } = ToolkitHooks.useAppGraph();
  const registry = useContext(RegistryContext);
  const { t } = Hooks.useTranslation(meta.profile.key);
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
          const label = Theme.toLocalizedString(node?.properties?.label ?? '', t) || id;
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

/** Every ancestor path of a qualified node id, outermost first (`root/a/b/c` → `root`, `root/a`, `root/a/b`). */
export const ancestorPaths = (id: string): string[] => {
  const segments = id.split('/');
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
};

/**
 * A node's place in the tree as breadcrumbs: its ancestors from the nearest object below the workspace (a project,
 * a collection's item) down to its parent, so a session reads `Project > Sessions`. The root, the workspace and the
 * navtree's section and type groups above that object are left out, since every node under them shares them.
 * A node with no object above it (a plugin in the registry) falls back to `history`, the planks opened before it.
 */
export const useAncestorBreadcrumbs = (id: string | undefined, history: readonly string[] = []): Breadcrumb[] => {
  const { graph } = ToolkitHooks.useAppGraph();
  const registry = useContext(RegistryContext);
  const [ids, setIds] = useState<string[]>([]);
  const historyKey = history.join('\0');

  useEffect(() => {
    const paths = id ? ancestorPaths(id) : [];
    const fallback = id && historyKey.length > 0 ? historyKey.split('\0') : [];
    const atoms = paths.map((path) => graph.node(path));
    const update = () => {
      const first = atoms.findIndex((atom) => Obj.isObject(Option.getOrUndefined(registry.get(atom))?.data));
      const next = first < 0 ? fallback : paths.slice(first);
      setIds((prev) => (prev.join('\0') === next.join('\0') ? prev : next));
    };

    update();
    const unsubscribers = atoms.map((atom) => registry.subscribe(atom, update));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [graph, registry, id, historyKey]);

  return useBreadcrumbs(ids);
};
