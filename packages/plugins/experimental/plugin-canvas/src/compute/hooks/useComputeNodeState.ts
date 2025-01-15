//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import type { ComputeNode, ComputeMeta } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import type { GraphNode } from '@dxos/graph';

import { useComputeContext } from './compute-context';
import { resolveComputeNode, type RuntimeValue } from '../graph';
import { type ComputeShape } from '../shapes';

export type ComputeNodeState = {
  node: GraphNode<ComputeNode>;
  meta: ComputeMeta;
  runtime: {
    inputs: Record<string, RuntimeValue>;
    outputs: Record<string, RuntimeValue>;
    setOutput: (property: string, value: any) => void;
  };
};

/**
 * Runtime state of a compute node.
 */
export const useComputeNodeState = (shape: ComputeShape): ComputeNodeState => {
  const { stateMachine } = useComputeContext();

  const [meta, setMeta] = useState();
  useEffect(() => {
    queueMicrotask(async () => {
      const meta = stateMachine.getMeta()


    })
  }, [shape.node])

  return {
    // TODO(burdon): ???
    node: {
      id: shape.id,
      type: shape.type,
      data: {},
    },
    // TODO(burdon): ???
    meta: {
      input: S.Struct({}),
      output: S.Struct({}),
    },
    // TODO(burdon): Rename proxy?
    runtime: {
      inputs: stateMachine.getInputs(shape.node!),
      outputs: stateMachine.getOutputs(shape.node!),
      setOutput: (property: string, value: any) => {
        stateMachine.setOutput(shape.node!, property, value);
      },
    },
  };
};
