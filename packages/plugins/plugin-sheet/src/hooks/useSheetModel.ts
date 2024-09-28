//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { type Space } from '@dxos/react-client/echo';

import { useComputeGraph } from './useComputeGraph';
import { type FunctionContextOptions } from '../graph';
import { mapFormulaBindingFromId, mapFormulaBindingToId, SheetModel, FormattingModel } from '../model';
import { type SheetType } from '../types';

export type UseSheetModelProps = {
  sheet: SheetType;
  space: Space;
  options?: Partial<FunctionContextOptions>;
  readonly?: boolean;
};

export const useSheetModel = ({ space, sheet, options, readonly }: UseSheetModelProps): SheetModel | undefined => {
  const graph = useComputeGraph(space, options);

  const [model, setModel] = useState<SheetModel>();
  useEffect(() => {
    if (!graph) {
      return;
    }

    let model: SheetModel | undefined;
    const t = setTimeout(async () => {
      model = new SheetModel(graph, sheet, space, { readonly, mapFormulaBindingToId, mapFormulaBindingFromId });
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
