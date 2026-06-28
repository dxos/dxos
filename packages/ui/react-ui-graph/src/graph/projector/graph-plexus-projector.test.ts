//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Graph } from '@dxos/graph';

import { SVGContext } from '../../hooks';
import { type GraphLayoutEdge } from '../types';
import {
  type PlexusRelation,
  PLEXUS_NODE_TYPE_FOCUS,
  PLEXUS_NODE_TYPE_OBJECT,
  PLEXUS_NODE_TYPE_RELATION,
  GraphPlexusProjector,
} from './graph-plexus-projector';

const makeContext = () => {
  const context = new SVGContext({});
  context.setSize({ width: 800, height: 600 });
  return context;
};

// Mirrors plugin-explorer's relationOf: each relation/ref gets separate nodes for the outgoing
// (focus is source, `→`) and incoming (focus is target, `←`) directions.
const relationOf = (edge: GraphLayoutEdge, focusId: string): PlexusRelation | undefined => {
  const outgoing = edge.source.id === focusId;
  const incoming = edge.target.id === focusId;
  if (!outgoing && !incoming) {
    return undefined;
  }
  const direction = outgoing ? 'out' : 'in';
  const arrow = outgoing ? '→' : '←';
  if (edge.type === 'relation') {
    return { key: `relation:${direction}:HasRelationship`, label: `HasRelationship ${arrow}` };
  }
  if (edge.type === 'ref') {
    const property = (edge.data as any)?.property ?? 'references';
    return { key: `ref:${direction}:${property}`, label: `${property} ${arrow}` };
  }
  return undefined;
};

const graph: Graph.Any = {
  nodes: [{ id: 'p1' }, { id: 'org' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'other' }] as any,
  edges: [
    // Outgoing ref from focus → grouped under "organization →".
    { id: 'e1', type: 'ref', source: 'p1', target: 'org', data: { property: 'organization' } },
    // Outgoing relations from focus → grouped under "HasRelationship →".
    { id: 'e2', type: 'relation', source: 'p1', target: 'p2', data: {} },
    { id: 'e3', type: 'relation', source: 'p1', target: 'p3', data: {} },
    // Incoming relation to focus → separate "HasRelationship ←" node.
    { id: 'e4', type: 'relation', source: 'p4', target: 'p1', data: {} },
    // Edge NOT incident to focus → ignored.
    { id: 'e5', type: 'ref', source: 'other', target: 'org', data: { property: 'organization' } },
  ] as any,
};

describe('GraphPlexusProjector', () => {
  test('fans the focus neighbourhood out by relation and direction', ({ expect }) => {
    const projector = new GraphPlexusProjector(makeContext(), { focus: 'p1', relationOf });
    projector.updateData(graph);

    const nodes = projector.layout.graph.nodes;
    const byType = (type: string) => nodes.filter((node) => node.type === type);

    // Exactly one focus node.
    const focus = byType(PLEXUS_NODE_TYPE_FOCUS);
    expect(focus).toHaveLength(1);
    expect(focus[0].id).toBe('p1');
    expect(focus[0].x).toBe(0);
    expect(focus[0].y).toBe(0);

    // Three relation nodes: outgoing relation, incoming relation, outgoing ref.
    const relations = byType(PLEXUS_NODE_TYPE_RELATION);
    expect(relations.map((node) => node.label).sort()).toEqual([
      'HasRelationship ←',
      'HasRelationship →',
      'organization →',
    ]);

    // Four object leaves (org, p2, p3 outgoing; p4 incoming); the non-incident edge is excluded.
    const objects = byType(PLEXUS_NODE_TYPE_OBJECT);
    expect(objects.map((node) => node.id).sort()).toEqual(['org', 'p2', 'p3', 'p4']);
    expect(nodes.find((node) => node.id === 'other')).toBeUndefined();

    // Hierarchy edges: focus→relation (3) + relation→object (4) = 7.
    const edges = projector.layout.graph.edges;
    expect(edges).toHaveLength(7);
    expect(edges.every((edge) => edge.type === 'hierarchy')).toBe(true);
  });

  test('degrades to a ring when the focus is absent', ({ expect }) => {
    const projector = new GraphPlexusProjector(makeContext(), { focus: 'missing', relationOf });
    projector.updateData(graph);

    // All nodes laid out, no relation structure.
    expect(projector.layout.graph.nodes).toHaveLength(graph.nodes.length);
    expect(projector.layout.graph.edges).toHaveLength(0);
  });
});
