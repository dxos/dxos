//
// Copyright 2026 DXOS.org
//

import { type Path } from '../path.ts';
import { type NetworkKind, type NodeType, type PropValue } from './template.ts';

export type Vec2 = readonly [number, number];

/** Radius of each node type's footprint on the ground plane, in world units. */
export const NODE_RADIUS: Record<NodeType, number> = { phone: 210, laptop: 220, server: 110 };

export type GraphNode = {
  path: Path;
  id: string;
  type: NodeType;
  network: Path;
  props: Record<string, PropValue>;
  position: Vec2;
};

export type GraphNetwork = {
  path: Path;
  id: string;
  kind: NetworkKind;
  parent?: Path;
  depth: number;
  props: Record<string, PropValue>;
  nodes: Path[];
  networks: Path[];
  center: Vec2;
  radius: number;
  at?: Vec2;
  near?: string;
  gap?: number;
  padding?: number;
};

/** A link joins two networks; packets cross it from rim to rim. */
export type GraphLink = { from: Path; to: Path };

export type Graph = {
  roots: Path[];
  networks: Record<Path, GraphNetwork>;
  nodes: Record<Path, GraphNode>;
  links: GraphLink[];
};

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

export const emptyGraph = (): Graph => ({ roots: [], networks: {}, nodes: {}, links: [] });

export const getNetwork = (graph: Graph, path: Path): GraphNetwork => {
  const network = graph.networks[path];
  if (!network) {
    throw new TemplateError(`Unknown network "${path}"`);
  }
  return network;
};

export const getNode = (graph: Graph, path: Path): GraphNode => {
  const node = graph.nodes[path];
  if (!node) {
    throw new TemplateError(`Unknown node "${path}"`);
  }
  return node;
};

/** Every network and node below a network, depth first. */
export const descendants = (graph: Graph, path: Path): { networks: Path[]; nodes: Path[] } => {
  const network = getNetwork(graph, path);
  const out = { networks: [...network.networks], nodes: [...network.nodes] };
  for (const child of network.networks) {
    const below = descendants(graph, child);
    out.networks.push(...below.networks);
    out.nodes.push(...below.nodes);
  }
  return out;
};
