//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';

import type * as GraphBuilder from '../GraphBuilder.ts';
import * as GraphEdge from '../GraphEdge.ts';
import * as GraphNode from '../GraphNode.ts';

/** Adapt a {@link GraphBuilder.Model} to the store port. */
export const modelStore = (
  model: GraphBuilder.Model,
  hooks: GraphBuilder.StoreHooks,
): GraphBuilder.Store<GraphBuilder.ModelNode, GraphBuilder.ModelNodeArg, GraphBuilder.Model> => {
  const nodes = Atom.family<string, Atom.Atom<Option.Option<GraphBuilder.ModelNode>>>((id) =>
    // Non-lazy: nothing subscribes to these, and only a recompute lets the model's node atom cut off.
    Atom.make((get) => Option.fromUndefinedOr(get(model.nodeAtom(id)))).pipe(Atom.setLazy(false)),
  );

  const addEdge = (edge: GraphBuilder.Edge): void => {
    const id = GraphEdge.createId({ source: edge.source, target: edge.target, relation: edge.relation });
    if (!model.findEdge(id)) {
      model.addEdge({ id, type: edge.relation, source: edge.source, target: edge.target, data: { order: 0 } });
    }
  };

  const addNode = (node: GraphBuilder.ModelNodeArg): void => {
    const { nodes: children, ...rest } = node;
    model.setNode(rest);
    children?.forEach((child) => {
      addNode(child);
      // Without this edge an inline descendant is materialized but unreachable through children().
      addEdge({ source: node.id, target: child.id, relation: 'child' });
    });
  };

  return {
    graph: model,
    node: (id) => nodes(id),
    addNodes: (args) => model.batch(() => args.forEach(addNode)),
    removeNodes: (ids, edges) =>
      model.batch(() => {
        model.removeNodes([...ids], { detachEdges: edges });
        ids.forEach((id) => hooks.onRemoveNode(id));
      }),
    addEdges: (edges) => model.batch(() => edges.forEach(addEdge)),
    removeEdges: (edges, removeOrphans) =>
      model.batch(() => {
        const present = edges.filter(
          (edge) =>
            model.findEdge(
              GraphEdge.createId({ source: edge.source, target: edge.target, relation: edge.relation }),
            ) !== undefined,
        );
        model.removeEdges(
          present.map((edge) =>
            GraphEdge.createId({ source: edge.source, target: edge.target, relation: edge.relation }),
          ),
        );
        if (removeOrphans) {
          // Mirrors the app store: a node a connector stopped producing leaves with its last edge.
          const orphans = [...new Set(present.flatMap(({ source, target }) => [source, target]))].filter(
            (id) => id !== GraphNode.RootId && model.findNode(id) !== undefined && !model.hasEdges(id),
          );
          if (orphans.length > 0) {
            model.removeNodes(orphans);
            orphans.forEach((id) => hooks.onRemoveNode(id));
          }
        }
      }),
    sortEdges: (id, relation, order) =>
      model.batch(() => {
        for (const edge of model.outgoing(id, relation)) {
          const index = order.indexOf(edge.target);
          if (index >= 0) {
            // The edge object is the one the model holds, so the write needs a touch to be observed.
            edge.data.order = index;
          }
        }
        model.touch();
      }),
    setNode: (id, node) =>
      Option.match(node, { onNone: () => model.removeNode(id), onSome: (value) => model.setNode(value) }),
    constructNode: ({ nodes: _, ...node }) => Option.some(node),
    batch: (fn) => model.batch(fn),
    release: (ids) => model.release(ids),
    outgoing: (id) =>
      model.outgoing(id).map((edge) => ({ source: edge.source, target: edge.target, relation: edge.type ?? 'child' })),
  };
};
