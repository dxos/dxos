import type { Blueprint } from '@dxos/assistant';
import { ComputeGraphModel, NODE_INPUT, NODE_OUTPUT, type ComputeGraph, type ComputeNode } from '@dxos/conductor';

export const compileBlueprint = async (blueprint: Blueprint): Promise<ComputeGraph> => {
  const model = ComputeGraphModel.create();

  model.builder.createNode({ id: 'input', type: NODE_INPUT });

  for (let i = 0; i < blueprint.steps.length; i++) {
    model.builder.createNode({ id: stepNodeId(i), type: 'gpt' });

    if (i === 0) {
      // Link to input node.
      model.builder.createEdge({ node: 'input', property: 'input' }, { node: stepNodeId(i), property: 'prompt' });
    } else {
      // Link to previous step.
      model.builder.createEdge(
        { node: stepNodeId(i - 1), property: 'text' },
        { node: stepNodeId(i), property: 'prompt' },
      );
    }
  }

  // Link output.
  model.builder.createEdge(
    { node: stepNodeId(blueprint.steps.length - 1), property: 'text' },
    { node: 'output', property: 'text' },
  );

  model.builder.createNode({ id: 'output', type: NODE_OUTPUT });

  return model.root;
};

const stepNodeId = (id: number) => `step-${id}`;
