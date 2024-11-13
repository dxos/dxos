//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { addressToA1Notation, isFormula, rangeToA1Notation } from '../../defs';
import { useSheetContext } from '../SheetContext';

export const FunctionEditor = () => {
  const { model, cursor, range } = useSheetContext();

  let value;
  let formula = false;
  if (cursor) {
    value = model.getCellValue(cursor);
    if (isFormula(value)) {
      value = model.graph.mapFunctionBindingFromId(model.mapFormulaIndicesToRefs(value));
      formula = true;
    } else if (value != null) {
      value = String(value);
    }
  }

  return (
    <div className={mx('flex shrink-0 justify-between items-center px-4 py-1 text-sm attention-surface')}>
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
