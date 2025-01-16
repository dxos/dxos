//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ComputeNode, ComputeMeta, ComputeEvent } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import type { GraphNode } from '@dxos/graph';

import { useComputeContext } from './compute-context';
import { resolveComputeNode, type RuntimeValue } from '../graph';
import { type ComputeShape } from '../shapes';
import { useAsyncState, useFileDownload } from '@dxos/react-ui';

export type ComputeNodeState = {
  node: GraphNode<ComputeNode>;
  meta: ComputeMeta;
  runtime: {
    inputs: Record<string, RuntimeValue>;
    outputs: Record<string, RuntimeValue>;
    setOutput: (property: string, value: any) => void;
    subscribeToEventLog: (cb: (event: ComputeEvent) => void) => void;
  };
};

/**
 * Runtime state of a compute node.
 */
export const useComputeNodeState = (shape: ComputeShape): ComputeNodeState => {
  const { stateMachine } = useComputeContext();

  const [meta, setMeta] = useState<ComputeMeta>();
  useEffect(() => {
    let disposed = false;
    queueMicrotask(async () => {
      const node = stateMachine.getComputeNode(shape.node!);
      const meta = await stateMachine.getMeta(node.data);
      if (disposed) {
        return;
      }
      setMeta(meta);
    });
    return () => {
      disposed = true;
    };
  }, [shape.node]);

  const subscribeToEventLog = useCallback(
    (cb: (event: ComputeEvent) => void) => {
      return stateMachine.events.on((ev) => {
        if (ev.nodeId === shape.node) {
          cb(ev);
        }
      });
    },
    [shape.node],
  );

  return {
    node: stateMachine.getComputeNode(shape.node!),
    meta: meta ?? {
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
      subscribeToEventLog,
    },
  };
};
