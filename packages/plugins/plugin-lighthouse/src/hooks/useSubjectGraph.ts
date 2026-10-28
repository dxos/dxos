//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';

import { type LighthouseClient, type SubjectGraph } from '#client';

export type UseSubjectGraphOptions = { depth?: number; limit?: number };

type Outcome = { graph: SubjectGraph } | { error: string };

/** A graph read, folded into a value a promise callback can switch on. */
const read = (effect: ReturnType<LighthouseClient['getGraph']>) =>
  EffectEx.runPromise(
    effect.pipe(
      Effect.match({
        onSuccess: (graph): Outcome => ({ graph }),
        onFailure: (error): Outcome => ({ error: error.message }),
      }),
    ),
  );

const edgeKey = (edge: SubjectGraph['edges'][number]) => `${edge.from} ${edge.predicate} ${edge.to}`;

/** Merges a fetched neighbourhood into what is shown: nodes and edges already there stay, new ones join. */
export const mergeGraphs = (base: SubjectGraph, extra: SubjectGraph, expanded?: string): SubjectGraph => {
  const nodes = new Map(base.nodes.map((node) => [node.id, node]));
  for (const node of extra.nodes) {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    }
  }
  const edges = new Map(base.edges.map((edge) => [edgeKey(edge), edge]));
  for (const edge of extra.edges) {
    edges.set(edgeKey(edge), edge);
  }
  const more = { ...base.more, ...extra.more };
  if (expanded && !extra.more[expanded]) {
    delete more[expanded];
  }
  return { roots: base.roots, nodes: [...nodes.values()], edges: [...edges.values()], more };
};

/**
 * The roots' neighbourhood in the graph, read once per roots and options; `expand` merges one node's neighbours in
 * ("+N more"). `graph` is undefined while it loads, or when there are no roots.
 */
export const useSubjectGraph = (
  client: LighthouseClient | undefined,
  roots: readonly string[] | undefined,
  { depth = 2, limit = 150 }: UseSubjectGraphOptions = {},
) => {
  const [graph, setGraph] = useState<SubjectGraph>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const key = roots?.join(',') ?? '';

  useEffect(() => {
    setGraph(undefined);
    setError(undefined);
    if (!client || !key) {
      return;
    }
    let live = true;
    setLoading(true);
    void read(client.getGraph(key.split(','), { depth, limit })).then((outcome) => {
      if (!live) {
        return;
      }
      setLoading(false);
      if ('graph' in outcome) {
        // The walk names its own roots; without them, the ones asked for are the ones the view centres.
        setGraph({ ...outcome.graph, roots: outcome.graph.roots.length ? outcome.graph.roots : key.split(',') });
      } else {
        setError(outcome.error);
      }
    });
    return () => {
      live = false;
    };
  }, [client, key, depth, limit]);

  const expand = useCallback(
    (iri: string) => {
      if (!client) {
        return;
      }
      setLoading(true);
      void read(client.getGraph([iri], { depth: 1, limit: 400 })).then((outcome) => {
        setLoading(false);
        if ('graph' in outcome) {
          setGraph((current) => (current ? mergeGraphs(current, outcome.graph, iri) : current));
        } else {
          setError(outcome.error);
        }
      });
    },
    [client],
  );

  return { graph, loading, error, expand };
};
