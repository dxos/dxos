//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type Space } from '@dxos/react-client/echo';

import { useComputeGraph } from './useComputeGraph';
import { mapFunctionBindingFromId, mapFunctionBindingToId, SheetModel, FormattingModel } from '../model';
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
      model = new SheetModel(graph, sheet, space, {
        readonly,
        mapFormulaBindingToId: mapFunctionBindingToId,
        mapFormulaBindingFromId: mapFunctionBindingFromId,
      });
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

export const useFormattingModel = (model: SheetModel | undefined): FormattingModel | undefined => {
  return useMemo(() => model && new FormattingModel(model), [model]);
};
