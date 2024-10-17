//
// Copyright 2024 DXOS.org
//

import { useMemo } from 'react';

import { type SheetModel, FormattingModel } from '../model';

export const useFormattingModel = (model: SheetModel | undefined): FormattingModel | undefined => {
  return useMemo(() => model && new FormattingModel(model), [model]);
};
