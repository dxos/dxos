//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  createArtifactCircuit,
  createAudioCircuit,
  createBasicCircuit,
  createControlCircuit,
  createGptCircuit,
  createGPTRealtimeCircuit,
  createLogicCircuit,
  createTemplateCircuit,
  createTransformCircuit,
} from './circuits.ts';

/** A cell of the coarse grid the `position` helper lays these out on. */
const CELL = 32;

const circuits: [string, () => { nodes: { center: { x: number; y: number } }[] }, number][] = [
  ['basic', createBasicCircuit, CELL / 2],
  ['transform', createTransformCircuit, CELL / 2],
  ['logic', createLogicCircuit, CELL / 2],
  ['control', createControlCircuit, CELL / 2],
  ['template', createTemplateCircuit, CELL / 2],
  ['artifact', createArtifactCircuit, CELL / 2],
  ['audio', createAudioCircuit, CELL / 2],
  ['voice', createGPTRealtimeCircuit, CELL / 2],
  // The GPT circuit is assembled from optional blocks over a shared core, so no single set of literals
  // centres every variant exactly; a cell of drift is the price of one layout serving all of them.
  ['gpt', () => createGptCircuit({ history: true }), CELL],
  ['gpt (plugins)', () => createGptCircuit({ history: true, image: true, artifact: true }), CELL],
];

describe('circuit layout', () => {
  for (const [name, build, tolerance] of circuits) {
    test(`the ${name} circuit is laid out around the origin`, ({ expect }) => {
      const centers = build().nodes.map((node) => node.center);
      expect(centers.length).toBeGreaterThan(0);

      for (const axis of ['x', 'y'] as const) {
        const values = centers.map((center) => center[axis]);
        const midpoint = (Math.min(...values) + Math.max(...values)) / 2;
        expect(Math.abs(midpoint), `${name} ${axis} midpoint`).toBeLessThanOrEqual(tolerance);
      }
    });
  }
});
