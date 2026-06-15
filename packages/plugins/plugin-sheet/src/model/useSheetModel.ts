//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type ComputeGraph } from '@dxos/compute-hyperformula';

import { type Sheet } from '#types';

import { SheetModel } from '../model';

export type UseSheetModelOptions = {
  readonly?: boolean;
  /**
   * The viewed branch. Switching branches rebinds the sheet to a different document, so recreate the
   * model (fresh accessors + re-ingest into the compute graph) to reflect the new branch's cells.
   */
  branch?: string;
};

export const useSheetModel = (
  graph?: ComputeGraph,
  sheet?: Sheet.Sheet,
  { readonly, branch }: UseSheetModelOptions = {},
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
  }, [graph, sheet, readonly, branch]);

  return model;
};
