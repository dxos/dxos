//
// Copyright 2026 DXOS.org
//

import { joinPath } from '../path.ts';
import { createRandom } from '../random.ts';
import { type Graph, type GraphNetwork, TemplateError, emptyGraph } from './graph.ts';
import { type NetworkSpec, type NetworkTemplate, type NodeType, type Props } from './template.ts';

/** Expands a template into a graph; the same template and seed always yield the same graph. */
export const expand = (template: NetworkTemplate, seed: number): Graph => {
  const graph = emptyGraph();
  const random = createRandom(seed).fork('expand');
  const templates = template.templates ?? {};

  const addNetwork = (spec: NetworkSpec, parent: GraphNetwork | undefined, id: string): void => {
    const path = joinPath(parent?.path ?? '', id);
    if (graph.networks[path]) {
      throw new TemplateError(`Duplicate network "${path}"`);
    }
    const network: GraphNetwork = {
      path,
      id,
      kind: spec.kind,
      parent: parent?.path,
      depth: parent ? parent.depth + 1 : 0,
      props: { ...spec.props },
      nodes: [],
      networks: [],
      center: [0, 0],
      radius: spec.layout?.radius ?? 0,
      at: spec.layout?.at,
      near: spec.layout?.near,
    };
    graph.networks[path] = network;
    if (parent) {
      parent.networks.push(path);
    } else {
      graph.roots.push(path);
    }

    const counts: Partial<Record<NodeType, number>> = {};
    const addNode = (nodeId: string, type: NodeType, props: Props | undefined): void => {
      const nodePath = joinPath(path, nodeId);
      if (graph.nodes[nodePath]) {
        throw new TemplateError(`Duplicate node "${nodePath}"`);
      }
      graph.nodes[nodePath] = {
        path: nodePath,
        id: nodeId,
        type,
        network: path,
        props: { ...props },
        position: [0, 0],
      };
      network.nodes.push(nodePath);
      counts[type] = (counts[type] ?? 0) + 1;
    };

    for (const node of spec.nodes ?? []) {
      addNode(node.id, node.type, node.props);
    }
    const local = random.fork(path);
    const nodes = spec.generate?.nodes;
    if (nodes) {
      const count = local.int(nodes.count[0], nodes.count[1]);
      for (let index = 0; index < count; index++) {
        addNode(`${nodes.type}-${(counts[nodes.type] ?? 0) + 1}`, nodes.type, undefined);
      }
    }
    for (const child of spec.networks ?? []) {
      addNetwork(child, network, child.id);
    }
    const networks = spec.generate?.networks;
    if (networks) {
      const child = templates[networks.template];
      if (!child) {
        throw new TemplateError(`Unknown template "${networks.template}" in "${path}"`);
      }
      const count = local.int(networks.count[0], networks.count[1]);
      for (let index = 0; index < count; index++) {
        const nested: NetworkSpec =
          networks.depth > 1
            ? { ...child, generate: { ...child.generate, networks: { ...networks, depth: networks.depth - 1 } } }
            : child;
        addNetwork(nested, network, `${networks.template}-${index + 1}`);
      }
    }
  };

  for (const spec of template.networks) {
    addNetwork(spec, undefined, spec.id);
  }
  return graph;
};
