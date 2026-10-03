//
// Copyright 2025 DXOS.org
//

import { NODE_INPUT, NODE_OUTPUT } from '../nodes/index.ts';
import { type ComputeGraph, ComputeGraphModel, type ComputeNode } from '../types/index.ts';
import type * as Sequence from './Sequence.ts';

/**
 * Compile a sequence into a compute graph.
 */
export const compileSequence = async (sequence: Sequence.Sequence): Promise<ComputeGraph> => {
  const model = ComputeGraphModel.create();

  const inputNode = model.createNode({
    id: 'input',
    type: NODE_INPUT,
  });

  const systemPrompt = model.createNode({
    id: 'system-prompt',
    type: 'constant',
    value: '**BP system prompt**',
  });

  const conversation = model.createNode({
    id: 'conversation-queue',
    type: 'make-queue',
  });

  const nodes: ComputeNode[] = [];
  for (let i = 0; i < sequence.steps.length; i++) {
    const node = model.createNode({ id: stepNodeId(i), type: 'gpt' });
    nodes.push(node);
    model.createEdge({ node: systemPrompt }, { node, property: 'systemPrompt' });

    const instructions = model.createNode({
      id: `step-instructions-${i}`,
      type: 'constant',
      value: sequence.steps[i].instructions,
    });
    model.createEdge({ node: instructions }, { node, property: 'prompt' });

    for (const tool of sequence.steps[i]?.tools ?? []) {
      const toolNode = model.createNode({ id: `tool-${i}-${tool}`, type: 'constant', value: tool });
      model.createEdge({ node: toolNode }, { node, property: 'tools' });
    }

    if (i === 0) {
      // Link to input node.
      model.createEdge({ node: inputNode, property: 'input' }, { node, property: 'context' });
      model.createEdge({ node: conversation }, { node, property: 'conversation' });
    } else {
      // Link to previous step.
      model.createEdge({ node: nodes[i - 1], property: 'conversation' }, { node, property: 'conversation' });
    }
  }

  // Link output.
  const outputNode = model.createNode({ id: 'output', type: NODE_OUTPUT });
  model.createEdge({ node: nodes.at(-1)!, property: 'text' }, { node: outputNode, property: 'text' });

  return model.root;
};

const stepNodeId = (id: number) => `step-${id}`;
