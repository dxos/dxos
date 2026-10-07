//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import * as SelectionModel from '@dxos/graph/SelectionModel';
import { omit } from '@dxos/util';

import type { CanvasBoard, CanvasGraphModel } from '../types/index.ts';

export const useSelection = (
  graph?: CanvasGraphModel,
): [SelectionModel.SelectionModel, CanvasBoard.Shape | undefined] => {
  const selection = useMemo(() => new SelectionModel.SelectionModel(), []);
  const [selected, setSelected] = useState<CanvasBoard.Shape | undefined>();
  useEffect(() => {
    if (!graph) {
      return;
    }

    return selection.subscribe((selected) => {
      if (selection.getSize()) {
        // Selection included nodes and edges.
        for (const id of Array.from(selected.values())) {
          const node = graph.findNode(id);
          if (node) {
            const data = omit(node.data as any, ['node']);
            setSelected(data as any);
            break;
          }
        }
      } else {
        setSelected(undefined);
      }
    });
  }, [graph, selection]);

  return [selection, selected];
};
