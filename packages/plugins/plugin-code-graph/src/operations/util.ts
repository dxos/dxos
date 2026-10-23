//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';

import { CodeIndexClient } from '#client';
import { Iri, Model } from '#graph';
import { CodeGraph } from '#types';

/** Predicates drawn as arrows when boxes are connected; the ones that read as "depends on". */
export const CONNECT_PREDICATES = ['imports', 'usesPackage'];

const values = (iris: readonly string[]) => iris.map((iri) => `<${iri}>`).join(' ');

/** The `deus:` arrows between any two of the given resources, as one query. */
export const connecting = (iris: readonly string[], predicates: readonly string[] = CONNECT_PREDICATES) =>
  iris.length < 2
    ? Effect.succeed<Model.Patch>({ nodes: [], edges: [] })
    : CodeIndexClient.query(
        `PREFIX deus: <${Iri.DEUS}>
         SELECT ?from ?to ?predicate WHERE {
           VALUES ?from { ${values(iris)} }
           VALUES ?to { ${values(iris)} }
           VALUES ?predicate { ${predicates.map((predicate) => `deus:${predicate}`).join(' ')} }
           ?from ?predicate ?to .
         }`,
        2000,
      ).pipe(Effect.map(({ rows }) => Model.fromRows(rows)));

/** The neighbours of one resource along one predicate, as arrows pointing the way the triples do. */
export const neighbours = (iri: string, predicate: string, direction: 'out' | 'in', limit: number) =>
  CodeIndexClient.query(
    direction === 'out'
      ? `PREFIX deus: <${Iri.DEUS}> SELECT ?from ?to WHERE { VALUES ?from { <${iri}> } ?from deus:${predicate} ?to . FILTER(isIRI(?to)) }`
      : `PREFIX deus: <${Iri.DEUS}> SELECT ?from ?to WHERE { VALUES ?to { <${iri}> } ?from deus:${predicate} ?to . }`,
    limit,
  ).pipe(Effect.map(({ rows }) => Model.fromRows(rows, predicate)));

const sizeOf = (graph: CodeGraph.CodeGraph) => ({ nodes: graph.nodes.length, edges: graph.edges.length });

/** Adds what the patch has that the graph lacks, and reports it; refused whole if the graph would pass its cap. */
export const addPatch = Effect.fn('CodeGraph.addPatch')(function* (graph: CodeGraph.CodeGraph, patch: Model.Patch) {
  const added = Model.missing({ nodes: [...graph.nodes], edges: [...graph.edges] }, patch);
  if (graph.nodes.length + added.nodes.length > CodeGraph.MAX_NODES) {
    return yield* Effect.fail(
      new CodeGraph.LimitError({
        context: { nodes: graph.nodes.length, adding: added.nodes.length, max: CodeGraph.MAX_NODES },
      }),
    );
  }
  if (added.nodes.length > 0 || added.edges.length > 0) {
    Obj.update(graph, (graph) => {
      graph.nodes.push(...added.nodes);
      graph.edges.push(...added.edges);
    });
  }
  return { addedNodes: added.nodes.length, addedEdges: added.edges.length, removedNodes: 0, ...sizeOf(graph) };
});

/** Removes the boxes (all of them when `ids` is absent) and every arrow touching them. */
export const removeNodes = Effect.fn('CodeGraph.removeNodes')(function* (
  graph: CodeGraph.CodeGraph,
  ids: readonly string[] | undefined,
) {
  const next = ids
    ? Model.without({ nodes: [...graph.nodes], edges: [...graph.edges] }, ids)
    : { nodes: [], edges: [] };
  const removedNodes = graph.nodes.length - next.nodes.length;
  if (removedNodes > 0 || next.edges.length !== graph.edges.length) {
    const keepNodes = new Set(next.nodes.map(({ id }) => id));
    const keepEdges = new Set(next.edges.map(Model.edgeId));
    Obj.update(graph, (graph) => {
      // Spliced in place, back to front, so a concurrent push from another peer is not overwritten.
      for (let index = graph.edges.length - 1; index >= 0; index--) {
        if (!keepEdges.has(Model.edgeId(graph.edges[index]))) {
          graph.edges.splice(index, 1);
        }
      }
      for (let index = graph.nodes.length - 1; index >= 0; index--) {
        if (!keepNodes.has(graph.nodes[index].id)) {
          graph.nodes.splice(index, 1);
        }
      }
    });
  }
  return { addedNodes: 0, addedEdges: 0, removedNodes, ...sizeOf(graph) };
});
