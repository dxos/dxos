//
// Copyright 2025 DXOS.org
//

import { type RefObject, useEffect, useState } from 'react';

import { type CleanupFn } from '@dxos/async';
import { type EditorController, type EditorRootProps } from '@dxos/react-ui-canvas-editor';

import { type ComputeGraphController } from '../graph';
import { type ComputeShape } from '../shapes';

// TODO(burdon): Move to async/context?
const combine = (...cbs: CleanupFn[]) => {
  return () => {
    for (const cb of cbs) {
      cb();
    }
  };
};

export type UseComputeGraphControllerOptions = Pick<EditorRootProps<ComputeShape>, 'graph'> & {
  controller: ComputeGraphController | null;
  editorRef: RefObject<EditorController | null>;
};

export const useComputeGraphController = ({ controller, graph, editorRef }: UseComputeGraphControllerOptions) => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!controller || !graph) {
      return;
    }

    void controller.open();
    const off = combine(
      controller.update.on(() => {
        void editorRef.current?.update();
        forceUpdate({});
      }),

      // TODO(burdon): Every node is called on every update.
      controller.output.on(({ nodeId, property, value }) => {
        if (value.type === 'not-executed') {
          // If the node didn't execute, don't trigger.
          return;
        }

        const edge = graph.edges.find((edge) => {
          const source = graph.getNode(edge.source);
          return (source as ComputeShape).node === nodeId && edge.output === property;
        });

        if (edge) {
          void editorRef.current?.action?.({ type: 'trigger', edges: [edge] });
        }
      }),
    );

    return () => {
      void controller.close();
      off();
    };
  }, [graph, controller]);
};
