//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { addressToA1Notation, isFormula, rangeToA1Notation } from '@dxos/compute';
import { Icon } from '@dxos/react-ui';

import { mapFormulaIndicesToRefs } from '../../types';
import { useSheetContext } from '../SheetContext';

export const FunctionEditor = () => {
  const { model, cursor, range } = useSheetContext();

  let value;
  let formula = false;
  if (cursor) {
    value = model.getCellValue(cursor);
    if (isFormula(value)) {
      value = model.graph.mapFunctionBindingFromId(mapFormulaIndicesToRefs(model.sheet, value));
      formula = true;
    } else if (value != null) {
      value = String(value);
    }
  }

  return (
    <div className='flex shrink-0 justify-between items-center pli-4 plb-1 text-sm bg-toolbarSurface border-bs !border-subduedSeparator'>
      <div className='flex gap-4 items-center'>
        <div className='flex w-16 items-center font-mono'>
          {(range && rangeToA1Notation(range)) || (cursor && addressToA1Notation(cursor))}
        </div>
        <div className='flex gap-2 items-center'>
          <Icon icon='ph--function--regular' classNames={['text-greenText', formula ? 'visible' : 'invisible']} />
          <span className='font-mono'>{value}</span>
        </div>
      </div>
    </div>
  );
};
