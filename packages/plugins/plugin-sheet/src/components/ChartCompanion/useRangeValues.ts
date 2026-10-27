//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { rangeFromA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { type PlotValue } from '@dxos/react-ui-plot';

import { type SheetModel } from '../../model/index.ts';

/**
 * Reads computed values for an A1 range from the model. The returned function changes identity whenever
 * the sheet or the engine updates, so consumers re-read their ranges.
 */
export const useRangeValues = (model: SheetModel): ((range: string) => PlotValue[][] | undefined) => {
  const [sheet] = useObject(model.sheet);
  const [version, setVersion] = useState(0);
  useEffect(() => model.update.on(() => setVersion((version) => version + 1)), [model]);

  return useCallback(
    (range: string) => {
      try {
        return model.getValues(rangeFromA1Notation(range.toUpperCase()));
      } catch {
        return undefined;
      }
    },
    [model, sheet, version],
  );
};
