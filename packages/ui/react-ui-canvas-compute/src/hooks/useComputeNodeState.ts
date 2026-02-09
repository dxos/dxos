//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useState } from 'react';

import type { ComputeNode, ComputeNodeMeta } from '@dxos/conductor';
import type { ComputeEventPayload } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { type RuntimeValue } from '../graph';
import { type ComputeShape } from '../shapes';

import { useComputeContext } from './compute-context';

export type ComputeNodeState = {
  node: ComputeNode;
  meta: ComputeNodeMeta;
  runtime: {
    inputs: Record<string, RuntimeValue>;
    outputs: Record<string, RuntimeValue>;
    setOutput: (property: string, value: any) => void;
    evalNode: () => void;
    subscribeToEventLog: (cb: (event: ComputeEventPayload) => void) => void;
  };
};

/**
 * Runtime state of a compute node.
 */
export const useComputeNodeState = (shape: ComputeShape): ComputeNodeState => {
  const { controller } = useComputeContext();
  invariant(controller);

  const [meta, setMeta] = useState<ComputeNodeMeta>();
  useEffect(() => {
    let disposed = false;
    queueMicrotask(async () => {
      invariant(shape.node, 'Node not specified');
      const node = controller.getComputeNode(shape.node);
      const meta = await controller.getMeta(node);
      if (disposed) {
        return;
      }

      setMeta(meta);
    });

    return () => {
      disposed = true;
    };
  }, [shape.node]);

  const evalNode = useCallback(() => {
    return controller.evalNode(shape.node!);
  }, [shape.node]);

  const subscribeToEventLog = useCallback(
    (cb: (event: ComputeEventPayload) => void) => {
      return controller.events.on((ev) => {
        if (ev.nodeId === shape.node) {
          cb(ev);
        }
      });
    },
    [shape.node],
  );

  return {
    node: controller.getComputeNode(shape.node!),
    meta: meta ?? {
      input: Schema.Struct({}),
      output: Schema.Struct({}),
    },
    runtime: {
      inputs: controller.getInputs(shape.node!),
      outputs: controller.getOutputs(shape.node!),
      setOutput: (property: string, value: any) => {
        controller.setOutput(shape.node!, property, value);
      },
      evalNode,
      subscribeToEventLog,
    },
  };
};
