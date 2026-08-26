//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { useContext, useEffect, useState } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { DeckSchema } from '#types';

/**
 * Companion (child) nodes for a plank.
 *
 * The node's child-connections atom is read in a commit-phase effect rather than during render.
 * Subscribing to it during render (via `useConnections`/`useAtomValue`) recomputes the shared atom and
 * synchronously notifies its other subscribers — notably navtree items rendering the same node — which
 * surfaces as a React "cannot update a component while rendering a different component" warning. Reading
 * it from an effect defers that notification to the commit phase where cross-component updates are allowed.
 */
export const useCompanions = (id?: string): AppGraphNode.Node[] => {
  const { graph } = useAppGraph();
  const registry = useContext(RegistryContext);
  const [companions, setCompanions] = useState<AppGraphNode.Node[]>([]);

  useEffect(() => {
    if (!id) {
      setCompanions([]);
      return;
    }

    const atom = graph.connections(id, 'child');
    const update = () => {
      const next = registry
        .get(atom)
        .filter((node) => node.type === DeckSchema.PLANK_COMPANION_TYPE)
        .toSorted((a, b) => Position.compare(a.properties, b.properties));
      setCompanions((prev) =>
        prev.length === next.length && prev.every((node, index) => node === next[index]) ? prev : next,
      );
    };

    update();
    return registry.subscribe(atom, update);
  }, [graph, registry, id]);

  return companions;
};
