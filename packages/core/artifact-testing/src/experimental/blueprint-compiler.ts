//
// Copyright 2025 DXOS.org
//

import type { Blueprint } from '@dxos/assistant';
import { ComputeGraphModel, NODE_INPUT, NODE_OUTPUT, type ComputeGraph, type ComputeNode } from '@dxos/conductor';

/**
 *
 */
export const compileBlueprint = async (blueprint: Blueprint): Promise<ComputeGraph> => {
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
    type: 'constant',
    value: '**conversation queue**',
  });

  const nodes: ComputeNode[] = [];
  for (let i = 0; i < blueprint.steps.length; i++) {
    const node = model.createNode({ id: stepNodeId(i), type: 'gpt' });
    nodes.push(node);
    model.builder.createEdge({ node: systemPrompt }, { node, property: 'systemPrompt' });

    const instructions = model.createNode({
      id: `step-instructions-${i}`,
      type: 'constant',
      value: blueprint.steps[i].instructions,
    });
    model.builder.createEdge({ node: instructions }, { node, property: 'prompt' });

    if (i === 0) {
      // Link to input node.
      model.builder.createEdge({ node: inputNode, property: 'input' }, { node, property: 'context' });
      model.builder.createEdge({ node: conversation }, { node, property: 'conversation' });
    } else {
      // Link to previous step.
      model.builder.createEdge({ node: nodes[i - 1], property: 'conversation' }, { node, property: 'conversation' });
    }
  }

  // Link output.
  const outputNode = model.createNode({ id: 'output', type: NODE_OUTPUT });
  model.builder.createEdge({ node: nodes.at(-1)!, property: 'text' }, { node: outputNode, property: 'text' });

  return model.root;
};

const stepNodeId = (id: number) => `step-${id}`;
