//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { addressToA1Notation, isFormula, rangeToA1Notation } from '@dxos/compute-hyperformula';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Util from '@dxos/react-ui/Util';

import { SheetUtil } from '#types';

import { useSheetContext } from '../SheetRoot/index.ts';

export type SheetStatusbarProps = {};

export const SheetStatusbar = Util.composable<HTMLDivElement, SheetStatusbarProps>((props, forwardedRef) => {
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
    <Layout.Flex
      justify='between'
      align='center'
      {...Util.composableProps(props, {
        classNames: 'shrink-0 px-4 py-1 text-sm dx-toolbar-surface border-y !border-separator-subtle',
      })}
      ref={forwardedRef}
    >
      <Layout.Flex gap='lg' align='center'>
        <Layout.Flex align='center' classNames='w-16 font-mono'>
          {(range && rangeToA1Notation(range)) || (cursor && addressToA1Notation(cursor))}
        </Layout.Flex>
        <Layout.Flex gap='sm' align='center'>
          <Icon.Icon icon='ph--function--regular' classNames={['text-green-text', formula ? 'visible' : 'invisible']} />
          <span className='font-mono'>{value}</span>
        </Layout.Flex>
      </Layout.Flex>
    </Layout.Flex>
  );
});
