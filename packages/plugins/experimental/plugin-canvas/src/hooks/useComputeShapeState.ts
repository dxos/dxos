import type { GraphNode } from '@dxos/graph';
import type { ComputeShape } from '../compute/shapes/defs';
import type { ComputeMeta, Model } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { useComputeContext } from '../compute/graph/ComputeContext';

export type RuntimeValue =
  | {
      type: 'executed';
      value: any;
    }
  | {
      type: 'error';
      error: string;
    }
  | {
      type: 'pending';
    }
  | {
      type: 'not-executed';
    };

export type ComputeShapeState = {
  node: GraphNode<Model.ComputeGraphNode>;
  meta: ComputeMeta;
  runtime?: {
    inputs: Record<string, RuntimeValue>;
    outputs: Record<string, RuntimeValue>;

    setOutput: (nodeId: string, property: string, value: any) => void;
  };
};

export const useComputeShapeState = (shape: ComputeShape): ComputeShapeState => {
  const { stateMachine } = useComputeContext();
  // TODO(dmaretskyi): Get from context.
  return {
    node: {
      id: shape.id,
      type: shape.type,
      data: {},
    },
    meta: {
      input: S.Struct({}),
      output: S.Struct({}),
    },
    runtime: !stateMachine
      ? undefined
      : {
          inputs: {},
          outputs: {},
          setOutput(property, value) {
            stateMachine.setOutput(shape.node!, property, value);
          },
        },
  };
};
