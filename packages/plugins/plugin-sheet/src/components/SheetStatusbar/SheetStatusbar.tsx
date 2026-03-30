//
// Copyright 2024 DXOS.org
//

import React, { forwardRef } from 'react';

import { addressToA1Notation, isFormula, rangeToA1Notation } from '@dxos/compute';
import { type ComposableProps, Icon } from '@dxos/react-ui';

import { composableProps, mx } from '@dxos/ui-theme';

import { mapFormulaIndicesToRefs } from '../../types';
import { useSheetContext } from '../SheetRoot';

export type SheetStatusbarProps = ComposableProps;

export const SheetStatusbar = forwardRef<HTMLDivElement, SheetStatusbarProps>((props, forwardedRef) => {
  const { className, ...rest } = composableProps(props);
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
    <div
      ref={forwardedRef}
      {...rest}
      className={mx(
        'flex shrink-0 justify-between items-center px-4 py-1 text-sm bg-toolbar-surface border-y !border-subdued-separator',
        className,
      )}
    >
      <div className='flex gap-4 items-center'>
        <div className='flex w-16 items-center font-mono'>
          {(range && rangeToA1Notation(range)) || (cursor && addressToA1Notation(cursor))}
        </div>
        <div className='flex gap-2 items-center'>
          <Icon icon='ph--function--regular' classNames={['text-green-text', formula ? 'visible' : 'invisible']} />
          <span className='font-mono'>{value}</span>
        </div>
      </div>
    </div>
  );
});
