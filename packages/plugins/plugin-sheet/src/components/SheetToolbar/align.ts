//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { useContext, useEffect } from 'react';

import { type CompleteCellRange, inRange } from '@dxos/compute-hyperformula';
import { Obj } from '@dxos/echo';
import {
  type ActionGraphProps,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { SheetRange, SheetUtil } from '#types';

import { type SheetModel } from '../../model/index.ts';
import { useSheetContext } from '../SheetRoot/index.ts';
import { type ToolbarState, type ToolbarStateAtom } from './useToolbarState.ts';

export type AlignAction = { key: SheetRange.AlignKey; value: SheetRange.AlignValue };

export type AlignState = { [SheetRange.alignKey]: SheetRange.AlignValue | undefined };

const aligns: Record<SheetRange.AlignValue, string> = {
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
            ({ range, key }) =>
              key === SheetRange.alignKey && inRange(SheetUtil.rangeFromIndex(model.sheet, range), cursor),
          )?.value
        : undefined
    ) as SheetRange.AlignValue | undefined;
    const prev = registry.get(stateAtom);
    registry.set(stateAtom, { ...prev, [SheetRange.alignKey]: alignValue });
  }, [cursor, model.sheet, registry, stateAtom]);
};

const createAlignGroupAction = (value?: SheetRange.AlignValue) =>
  createMenuItemGroup('align', {
    label: ['align.label', { ns: meta.profile.key }],
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value: `${SheetRange.alignKey}--${value}`,
  } as ToolbarMenuActionGroupProperties);

type AlignActionsContext = {
  model: SheetModel;
  state: ToolbarState;
  stateAtom: ToolbarStateAtom;
  registry: Registry.AtomRegistry;
  cursorFallbackRange?: CompleteCellRange;
};

const createAlignActions = ({ model, state, stateAtom, registry, cursorFallbackRange }: AlignActionsContext) =>
  Object.entries(aligns).map(([alignValue, icon]) => {
    return createMenuAction<AlignAction>(
      `${SheetRange.alignKey}--${alignValue}`,
      () => {
        if (!cursorFallbackRange) {
          return;
        }
        const index =
          model.sheet.ranges?.findIndex(
            (range) =>
              range.key === SheetRange.alignKey &&
              inRange(SheetUtil.rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
          ) ?? -1;
        const nextRangeEntity = {
          range: SheetUtil.rangeToIndex(model.sheet, cursorFallbackRange),
          key: SheetRange.alignKey,
          value: alignValue as SheetRange.AlignValue,
        };
        const currentState = registry.get(stateAtom);
        if (index < 0) {
          Obj.update(model.sheet, (obj) => {
            obj.ranges?.push(nextRangeEntity);
          });
          registry.set(stateAtom, { ...currentState, [SheetRange.alignKey]: nextRangeEntity.value });
        } else if (model.sheet.ranges![index].value === nextRangeEntity.value) {
          Obj.update(model.sheet, (obj) => {
            obj.ranges?.splice(index, 1);
          });
          registry.set(stateAtom, { ...currentState, [SheetRange.alignKey]: undefined });
        } else {
          Obj.update(model.sheet, (obj) => {
            obj.ranges?.splice(index, 1, nextRangeEntity);
          });
          registry.set(stateAtom, { ...currentState, [SheetRange.alignKey]: nextRangeEntity.value });
        }
      },
      {
        key: SheetRange.alignKey,
        value: alignValue as SheetRange.AlignValue,
        checked: state[SheetRange.alignKey] === alignValue,
        label: [`range-value.${alignValue}.label`, { ns: meta.profile.key }],
        icon,
        testId: `grid.toolbar.${SheetRange.alignKey}.${alignValue}`,
      },
    );
  });

export const createAlign = (context: AlignActionsContext): ActionGraphProps => {
  const alignGroup = createAlignGroupAction(context.state[SheetRange.alignKey]);
  const alignActions = createAlignActions(context);
  return {
    nodes: [alignGroup, ...alignActions],
    edges: [
      { source: 'root', target: 'align', relation: 'child' },
      ...alignActions.map(({ id }) => ({ source: alignGroup.id, target: id, relation: 'child' })),
    ],
  };
};
