//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useState } from 'react';

import type { ComputeNode, ComputeNodeMeta } from '@dxos/conductor';
import { invariant } from '@dxos/invariant';

import { type ComputeEvent, type RuntimeValue } from '../graph/index.ts';
import { type ComputeShape } from '../shapes/index.ts';
import { useComputeContext } from './compute-context.ts';

export type ComputeNodeState = {
  node: ComputeNode;
  meta: ComputeNodeMeta;
  runtime: {
    inputs: Record<string, RuntimeValue>;
    outputs: Record<string, RuntimeValue>;
    setOutput: (property: string, value: any) => void;
    evalNode: () => void;
    subscribeToEventLog: (cb: (event: ComputeEvent) => void) => () => void;
  };
};

/**
 * Runtime state of a compute node.
 */
export const useComputeNodeState = (shape: ComputeShape): ComputeNodeState => {
  const { controller } = useComputeContext();
  invariant(controller);
  const nodeId = shape.data?.node;
  invariant(nodeId, 'Node not specified');

  const [meta, setMeta] = useState<ComputeNodeMeta>();
  useEffect(() => {
    let disposed = false;
    queueMicrotask(async () => {
      const node = controller.getComputeNode(nodeId);
      const meta = await controller.getMeta(node);
      if (disposed) {
        return;
      }

      setMeta(meta);
    });

    return () => {
      disposed = true;
    };
  }, [nodeId]);

  const evalNode = useCallback(() => {
    return controller.evalNode(nodeId);
  }, [nodeId]);

  const subscribeToEventLog = useCallback(
    (cb: (event: ComputeEvent) => void): (() => void) => {
      return controller.events.on((ev) => {
        if (ev.nodeId === nodeId) {
          cb(ev);
        }
      });
    },
    [nodeId],
  );

  return {
    node: controller.getComputeNode(nodeId),
    meta: meta ?? {
      input: Schema.Struct({}),
      output: Schema.Struct({}),
    },
    runtime: {
      inputs: controller.getInputs(nodeId),
      outputs: controller.getOutputs(nodeId),
      setOutput: (property: string, value: any) => {
        controller.setOutput(nodeId, property, value);
      },
      evalNode,
      subscribeToEventLog,
    },
  };
};
