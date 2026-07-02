//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { useContext, useEffect, useState } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type Node } from '@dxos/plugin-graph';
import { Position } from '@dxos/util';

import { PLANK_COMPANION_TYPE } from '#types';

/**
 * Companion (child) nodes for a plank.
 *
 * The node's child-connections atom is read in a commit-phase effect rather than during render.
 * Subscribing to it during render (via `useConnections`/`useAtomValue`) recomputes the shared atom and
 * synchronously notifies its other subscribers — notably navtree items rendering the same node — which
 * surfaces as a React "cannot update a component while rendering a different component" warning. Reading
 * it from an effect defers that notification to the commit phase where cross-component updates are allowed.
 */
export const useCompanions = (id?: string): Node.Node[] => {
  const { graph } = useAppGraph();
  const registry = useContext(RegistryContext);
  const [companions, setCompanions] = useState<Node.Node[]>([]);

  useEffect(() => {
    if (!id) {
      setCompanions([]);
      return;
    }

    const atom = graph.connections(id, 'child');
    const update = () => {
      const next = registry
        .get(atom)
        .filter((node) => node.type === PLANK_COMPANION_TYPE)
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
