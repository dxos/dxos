//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { omit } from '@dxos/util';

import { SelectionModel } from '../hooks';
import type { CanvasGraphModel, Shape } from '../types';

export const useSelection = (graph?: CanvasGraphModel): [SelectionModel, Shape | undefined] => {
  const selection = useMemo(() => new SelectionModel(), []);
  const [selected, setSelected] = useState<Shape | undefined>();
  useEffect(() => {
    if (!graph) {
      return;
    }

    return selection.selected.subscribe((selected) => {
      if (selection.size) {
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
