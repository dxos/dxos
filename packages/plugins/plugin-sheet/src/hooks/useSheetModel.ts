//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Space } from '@dxos/react-client/echo';

import { useComputeGraph } from './useComputeGraph';
import { SheetModel } from '../model';
import { type SheetType } from '../types';

export type UseSheetModelOptions = {
  readonly?: boolean;
};

export const useSheetModel = (
  space?: Space,
  sheet?: SheetType,
  { readonly }: UseSheetModelOptions = {},
): SheetModel | undefined => {
  const graph = useComputeGraph(space);
  const [model, setModel] = useState<SheetModel>();
  useEffect(() => {
    if (!space || !graph || !sheet) {
      return;
    }

    let model: SheetModel | undefined;
    const t = setTimeout(async () => {
      model = new SheetModel(graph, sheet, { readonly });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
  }, [space, sheet, graph, readonly]);

  return model;
};
