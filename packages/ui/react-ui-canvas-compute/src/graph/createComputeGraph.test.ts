//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_INPUT } from '@dxos/conductor';

import { createComputeGraph } from '../hooks';
import {
  createArtifactCircuit,
  createAudioCircuit,
  createBasicCircuit,
  createControlCircuit,
  createGPTRealtimeCircuit,
  createGptCircuit,
  createLogicCircuit,
  createTemplateCircuit,
  createTransformCircuit,
} from '../testing';

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
