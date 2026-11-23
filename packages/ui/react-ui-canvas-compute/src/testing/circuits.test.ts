//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MAJOR_GRID } from '@dxos/scene';

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

type Layout = { nodes: { center: { x: number; y: number }; size?: { width: number; height: number } }[] };

/** Every node's top-left sits on the major grid, so a layout can only be centred to within half a cell. */
const TOLERANCE = MAJOR_GRID / 2;

const circuits: [string, () => Layout][] = [
  ['basic', createBasicCircuit],
  ['transform', createTransformCircuit],
  ['logic', createLogicCircuit],
  ['control', createControlCircuit],
  ['template', createTemplateCircuit],
  ['artifact', createArtifactCircuit],
  ['audio', createAudioCircuit],
  ['voice', createGPTRealtimeCircuit],
  ['gpt', () => createGptCircuit({ history: true })],
  ['gpt (plugins)', () => createGptCircuit({ history: true, image: true, artifact: true })],
];

describe('circuit layout', () => {
  for (const [name, build] of circuits) {
    test(`the ${name} circuit is laid out around the origin`, ({ expect }) => {
      const centers = build().nodes.map((node) => node.center);
      expect(centers.length).toBeGreaterThan(0);

      for (const axis of ['x', 'y'] as const) {
        const values = centers.map((center) => center[axis]);
        const midpoint = (Math.min(...values) + Math.max(...values)) / 2;
        expect(Math.abs(midpoint), `${name} ${axis} midpoint`).toBeLessThanOrEqual(TOLERANCE);
      }
    });

    test(`every node of the ${name} circuit has its top-left on the major grid, where a move snaps it`, ({
      expect,
    }) => {
      for (const { center, size = { width: 0, height: 0 } } of build().nodes) {
        expect(Math.abs((center.x - size.width / 2) % MAJOR_GRID), `${name} left`).toBe(0);
        expect(Math.abs((center.y - size.height / 2) % MAJOR_GRID), `${name} top`).toBe(0);
      }
    });

    test(`no two nodes of the ${name} circuit come within a grid cell of each other`, ({ expect }) => {
      const bounds = build().nodes.map(({ center, size = { width: 0, height: 0 } }) => ({
        left: center.x - size.width / 2,
        right: center.x + size.width / 2,
        top: center.y - size.height / 2,
        bottom: center.y + size.height / 2,
      }));
      for (const [index, first] of bounds.entries()) {
        for (const second of bounds.slice(index + 1)) {
          const gap = Math.max(
            second.left - first.right,
            first.left - second.right,
            second.top - first.bottom,
            first.top - second.bottom,
          );
          expect(gap, `${name} gap`).toBeGreaterThanOrEqual(MAJOR_GRID);
        }
      }
    });
  }
});
