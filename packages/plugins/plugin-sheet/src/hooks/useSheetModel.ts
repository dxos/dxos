//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Space } from '@dxos/react-client/echo';

import { useComputeGraph } from './useComputeGraph';
import { FunctionManager, SheetModel } from '../model';
import { type SheetType } from '../types';

export type UseSheetModelProps = {
  space: Space;
  sheet: SheetType;
  readonly?: boolean;
};

export const useSheetModel = ({ space, sheet, readonly }: UseSheetModelProps): SheetModel | undefined => {
  const graph = useComputeGraph(space);
  const [model, setModel] = useState<SheetModel>();
  useEffect(() => {
    if (!graph) {
      return;
    }

    let model: SheetModel | undefined;
    const t = setTimeout(async () => {
      model = new SheetModel(graph, sheet, new FunctionManager(graph, space), { readonly });
      await model.initialize();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.destroy();
    };
  }, [graph, readonly]);

  return model;
};
