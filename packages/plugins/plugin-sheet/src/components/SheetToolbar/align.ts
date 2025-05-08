//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { inRange } from '@dxos/compute';
import { createMenuAction, createMenuItemGroup, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { SHEET_PLUGIN } from '../../meta';
import { type AlignKey, alignKey, type AlignValue, rangeFromIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

export type AlignAction = { key: AlignKey; value: AlignValue };

export type AlignState = { [alignKey]: AlignValue | undefined };

const aligns: Record<AlignValue, string> = {
  start: 'ph--text-align-left--regular',
  center: 'ph--text-align-center--regular',
  end: 'ph--text-align-right--regular',
};

export const useAlignState = (state: Partial<AlignState>) => {
  const { cursor, model } = useSheetContext();
  useEffect(() => {
    // TODO(thure): Can this O(n) call be memoized?
    state[alignKey] = (
      cursor
        ? model.sheet.ranges?.findLast(
            ({ range, key }) => key === alignKey && inRange(rangeFromIndex(model.sheet, range), cursor),
          )?.value
        : undefined
    ) as AlignValue | undefined;
  }, [cursor, model.sheet]);
};

const createAlignGroupAction = (value?: AlignValue) =>
  createMenuItemGroup('align', {
    label: ['align label', { ns: SHEET_PLUGIN }],
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value: `${alignKey}--${value}`,
  } as ToolbarMenuActionGroupProperties);

const createAlignActions = (value?: AlignValue) =>
  Object.entries(aligns).map(([alignValue, icon]) => {
    return createMenuAction<AlignAction>(`${alignKey}--${alignValue}`, {
      key: alignKey,
      value: alignValue as AlignValue,
      checked: value === alignValue,
      label: [`range value ${alignValue} label`, { ns: SHEET_PLUGIN }],
      icon,
      testId: `grid.toolbar.${alignKey}.${alignValue}`,
    });
  });

export const createAlign = ({ [alignKey]: alignValue }: Partial<AlignState>) => {
  const alignGroup = createAlignGroupAction(alignValue);
  const alignActions = createAlignActions(alignValue);
  return {
    nodes: [alignGroup, ...alignActions],
    edges: [
      { source: 'root', target: 'align' },
      ...alignActions.map(({ id }) => ({ source: alignGroup.id, target: id })),
    ],
  };
};
