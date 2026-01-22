//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type CompleteCellRange, inRange } from '@dxos/compute';
import {
  type ActionGraphProps,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { type SheetModel } from '../../model';
import { type AlignKey, type AlignValue, alignKey, rangeFromIndex, rangeToIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

import { type ToolbarState } from './useToolbarState';

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
    label: ['align label', { ns: meta.id }],
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value: `${alignKey}--${value}`,
  } as ToolbarMenuActionGroupProperties);

const createAlignActions = (model: SheetModel, state: ToolbarState, cursorFallbackRange?: CompleteCellRange) =>
  Object.entries(aligns).map(([alignValue, icon]) => {
    return createMenuAction<AlignAction>(
      `${alignKey}--${alignValue}`,
      () => {
        if (!cursorFallbackRange) {
          return;
        }
        const index =
          model.sheet.ranges?.findIndex(
            (range) =>
              range.key === alignKey && inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
          ) ?? -1;
        const nextRangeEntity = {
          range: rangeToIndex(model.sheet, cursorFallbackRange),
          key: alignKey,
          value: alignValue as AlignValue,
        };
        if (index < 0) {
          model.sheet.ranges?.push(nextRangeEntity);
          state[alignKey] = nextRangeEntity.value;
        } else if (model.sheet.ranges![index].value === nextRangeEntity.value) {
          model.sheet.ranges?.splice(index, 1);
          state[alignKey] = undefined;
        } else {
          model.sheet.ranges?.splice(index, 1, nextRangeEntity);
          state[alignKey] = nextRangeEntity.value;
        }
      },
      {
        key: alignKey,
        value: alignValue as AlignValue,
        checked: state[alignKey] === alignValue,
        label: [`range value ${alignValue} label`, { ns: meta.id }],
        icon,
        testId: `grid.toolbar.${alignKey}.${alignValue}`,
      },
    );
  });

export const createAlign = (
  model: SheetModel,
  state: ToolbarState,
  cursorFallbackRange?: CompleteCellRange,
): ActionGraphProps => {
  const alignGroup = createAlignGroupAction(state[alignKey]);
  const alignActions = createAlignActions(model, state, cursorFallbackRange);
  return {
    nodes: [alignGroup, ...alignActions],
    edges: [
      { source: 'root', target: 'align' },
      ...alignActions.map(({ id }) => ({ source: alignGroup.id, target: id })),
    ],
  };
};
