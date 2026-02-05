//
// Copyright 2025 DXOS.org
//

import { type Registry, RegistryContext } from '@effect-atom/atom-react';
import { useContext, useEffect } from 'react';

import { type CompleteCellRange, inRange } from '@dxos/compute';
import { Obj } from '@dxos/echo';
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

import { type ToolbarState, type ToolbarStateAtom } from './useToolbarState';

export type AlignAction = { key: AlignKey; value: AlignValue };

export type AlignState = { [alignKey]: AlignValue | undefined };

const aligns: Record<AlignValue, string> = {
  start: 'ph--text-align-left--regular',
  center: 'ph--text-align-center--regular',
  end: 'ph--text-align-right--regular',
};

export const useAlignState = (stateAtom: ToolbarStateAtom) => {
  const registry = useContext(RegistryContext);
  const { cursor, model } = useSheetContext();
  useEffect(() => {
    // TODO(thure): Can this O(n) call be memoized?
    const alignValue = (
      cursor
        ? model.sheet.ranges?.findLast(
            ({ range, key }) => key === alignKey && inRange(rangeFromIndex(model.sheet, range), cursor),
          )?.value
        : undefined
    ) as AlignValue | undefined;
    const prev = registry.get(stateAtom);
    registry.set(stateAtom, { ...prev, [alignKey]: alignValue });
  }, [cursor, model.sheet, registry, stateAtom]);
};

const createAlignGroupAction = (value?: AlignValue) =>
  createMenuItemGroup('align', {
    label: ['align label', { ns: meta.id }],
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value: `${alignKey}--${value}`,
  } as ToolbarMenuActionGroupProperties);

type AlignActionsContext = {
  model: SheetModel;
  state: ToolbarState;
  stateAtom: ToolbarStateAtom;
  registry: Registry.Registry;
  cursorFallbackRange?: CompleteCellRange;
};

const createAlignActions = ({ model, state, stateAtom, registry, cursorFallbackRange }: AlignActionsContext) =>
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
        const currentState = registry.get(stateAtom);
        if (index < 0) {
          Obj.change(model.sheet, (s) => {
            s.ranges?.push(nextRangeEntity);
          });
          registry.set(stateAtom, { ...currentState, [alignKey]: nextRangeEntity.value });
        } else if (model.sheet.ranges![index].value === nextRangeEntity.value) {
          Obj.change(model.sheet, (s) => {
            s.ranges?.splice(index, 1);
          });
          registry.set(stateAtom, { ...currentState, [alignKey]: undefined });
        } else {
          Obj.change(model.sheet, (s) => {
            s.ranges?.splice(index, 1, nextRangeEntity);
          });
          registry.set(stateAtom, { ...currentState, [alignKey]: nextRangeEntity.value });
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

export const createAlign = (context: AlignActionsContext): ActionGraphProps => {
  const alignGroup = createAlignGroupAction(context.state[alignKey]);
  const alignActions = createAlignActions(context);
  return {
    nodes: [alignGroup, ...alignActions],
    edges: [
      { source: 'root', target: 'align' },
      ...alignActions.map(({ id }) => ({ source: alignGroup.id, target: id })),
    ],
  };
};
