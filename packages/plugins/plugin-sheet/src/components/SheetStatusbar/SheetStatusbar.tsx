//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { addressToA1Notation, isFormula, rangeToA1Notation } from '@dxos/compute-hyperformula';
import * as Icon from '@dxos/react-ui/Icon';
import * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { SheetUtil } from '#types';

import { useSheetContext } from '../SheetRoot/index.ts';

export type SheetStatusbarProps = {};

export const SheetStatusbar = Util.composable<HTMLDivElement, SheetStatusbarProps>((props, forwardedRef) => {
  const { className, ...rest } = Util.composableProps(props);
  const { model, cursor, range } = useSheetContext();

  let value;
  let formula = false;
  if (cursor) {
    value = model.getCellValue(cursor);
    if (isFormula(value)) {
      value = model.graph.mapFunctionBindingFromId(SheetUtil.mapFormulaIndicesToRefs(model.sheet, value));
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
        'flex shrink-0 justify-between items-center px-4 py-1 text-sm dx-toolbar-surface border-y !border-separator-subtle',
        className,
      )}
    >
      <div className='flex gap-4 items-center'>
        <div className='flex w-16 items-center font-mono'>
          {(range && rangeToA1Notation(range)) || (cursor && addressToA1Notation(cursor))}
        </div>
        <div className='flex gap-2 items-center'>
          <Icon.Icon icon='ph--function--regular' classNames={['text-green-text', formula ? 'visible' : 'invisible']} />
          <span className='font-mono'>{value}</span>
        </div>
      </div>
    </div>
  );
});
