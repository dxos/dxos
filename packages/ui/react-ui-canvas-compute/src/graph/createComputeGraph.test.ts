//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_INPUT } from '@dxos/conductor';

import { createComputeGraph } from '../hooks/index.ts';
import { computeKinds } from '../registry.ts';
import { boardLayout } from '../scene/index.ts';
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
} from '../testing/index.ts';

// Each canvas shape is mapped to a compute node and added to a single ECHO-backed `ComputeGraphModel`.
// Nodes carry nested records (e.g. a template's `inputSchema`); these must be owned independently per node,
// otherwise adding a second node that embeds a shared record reassigns ECHO ownership and throws.
const circuits: [string, () => any][] = [
  ['empty/basic', createBasicCircuit],
  ['transform', createTransformCircuit],
  ['logic', createLogicCircuit],
  ['control', createControlCircuit],
  ['template', createTemplateCircuit],
  ['gpt', () => createGptCircuit({ history: true })],
  ['gpt (plugins)', () => createGptCircuit({ history: true, image: true, artifact: true })],
  ['gpt (instructions)', () => createGptCircuit({ instructions: true })],
  ['artifact', createArtifactCircuit],
  ['audio', createAudioCircuit],
  ['voice', createGPTRealtimeCircuit],
];

describe('createComputeGraph', () => {
  for (const [name, build] of circuits) {
    test(`builds the ${name} circuit without ECHO ownership errors`, ({ expect }) => {
      const model = createComputeGraph(build());
      expect(model.nodes.length).toBeGreaterThanOrEqual(0);
    });
  }

  for (const [name, build] of circuits) {
    test(`the ${name} circuit reads as registered compute kinds carrying the nodes it made`, ({ expect }) => {
      const circuit = build();
      const model = createComputeGraph(circuit);
      const shapes = Object.values(boardLayout('circuit', circuit).elements).filter(({ type }) => type !== 'link');
      for (const shape of shapes) {
        expect(computeKinds.validate(shape), `${name} ${shape.type}`).toEqual({ ok: true });
        expect(computeKinds.has(shape.type ?? ''), `${name} ${shape.type}`).toBe(true);
      }
      const nodes = shapes.flatMap(({ node }) => (typeof node === 'string' ? [node] : []));
      expect(nodes.every((id) => model.findNode(id) !== undefined)).toBe(true);
      expect(nodes.length).toBe(model.nodes.length);
    });
  }

  test('wires Template + Chat into GPT and GPT into the output', ({ expect }) => {
    const model = createComputeGraph(createTemplateCircuit());

    const gpt = model.nodes.find((node) => node.type === 'gpt');
    expect(gpt).toBeDefined();

    const incoming = model.edges.filter((edge) => edge.target === gpt!.id);
    const outgoing = model.edges.filter((edge) => edge.source === gpt!.id);

    // Chat feeds the prompt; the template feeds the system prompt.
    expect(incoming.map((edge) => edge.input).sort()).toEqual(['prompt', 'systemPrompt']);
    // GPT output flows downstream (to the text node).
    expect(outgoing.some((edge) => edge.output === 'text')).toBe(true);
    expect(outgoing.every((edge) => edge.input === DEFAULT_INPUT)).toBe(true);
  });
});
