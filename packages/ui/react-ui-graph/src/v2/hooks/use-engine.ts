//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type Graph } from '@dxos/graph';
import { Engine, type EngineOptions, ForceProjector, TypeRegistry } from '@dxos/graph-engine';

export type UseEngineOptions<N extends Graph.Node.Any, E extends Graph.Edge.Any> = Partial<EngineOptions<N, E>> &
  Pick<EngineOptions<N, E>, 'model'>;

/**
 * Construct (and memoize) an Engine for the given model. Tool attachment happens in <GraphSurface>.
 */
export const useEngine = <N extends Graph.Node.Any = Graph.Node.Any, E extends Graph.Edge.Any = Graph.Edge.Any>(
  opts: UseEngineOptions<N, E>,
): Engine<N, E> => {
  const engine = useMemo(() => {
    const registry = opts.registry ?? new TypeRegistry();
    const projector = opts.projector ?? new ForceProjector();
    return new Engine<N, E>({ model: opts.model, registry, projector });
  }, [opts.model, opts.registry, opts.projector]);

  // Detach any tools when the engine unmounts.
  useEffect(() => {
    return () => engine.detachTools();
  }, [engine]);

  return engine;
};
