//
// Copyright 2026 DXOS.org
//

//
// A canvas-editor circuit as a scene: shapes become nodes with a z key (a note becomes the engine's
// note node), connections become curves pinned to the ports the properties name. The circuit factories
// and `createComputeGraph` stay as they are; this is the seam the M4 store migration builds on.
//

import * as Schema from 'effect/Schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { type Link, type Node, type Scene, initialKeys } from '@dxos/react-ui-canvas/scene';

import { ComputeShape, createAnchorId } from '../shapes/index.ts';
import { type CanvasGraphModel } from '../types/index.ts';

export const sceneFromCircuit = (model: CanvasGraphModel<ComputeShape>, id = 'circuit', name?: string): Scene => {
  const shapes = model.nodes.filter(Schema.is(ComputeShape));
  const keys = initialKeys(shapes.length + model.edges.length);
  const nodes: Record<string, Node> = {};
  shapes.forEach((shape, index) => {
    const z = keys[index];
    nodes[shape.id] =
      shape.type === 'note'
        ? { type: 'note', id: shape.id, z, center: shape.center, size: shape.size, text: shape.text ?? '' }
        : { ...shape, z };
  });
  const links: Record<string, Link> = {};
  model.edges.forEach((edge, index) => {
    links[edge.id] = {
      type: 'curve',
      id: edge.id,
      z: keys[shapes.length + index],
      source: { node: edge.source, port: createAnchorId('output', edge.output ?? DEFAULT_OUTPUT) },
      target: { node: edge.target, port: createAnchorId('input', edge.input ?? DEFAULT_INPUT) },
      ends: { end: 'arrow' },
    };
  });
  return { id, ...(name ? { name } : {}), nodes, links };
};
