//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type ComputeGraph } from '@dxos/compute';

import { SheetModel } from '../model';
import { type Sheet } from '../types';

export type UseSheetModelOptions = {
  readonly?: boolean;
};

export const useSheetModel = (
  graph?: ComputeGraph,
  sheet?: Sheet.Sheet,
  { readonly }: UseSheetModelOptions = {},
): SheetModel | undefined => {
  const [model, setModel] = useState<SheetModel>();
  useEffect(() => {
    if (!graph || !sheet) {
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
  }, [graph, sheet, readonly]);

  return model;
};
