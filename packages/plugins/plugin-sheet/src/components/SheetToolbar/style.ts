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

export type StyleState = Partial<Record<SheetRange.StyleValue, boolean>>;

export type StyleAction = { key: SheetRange.StyleKey; value: SheetRange.StyleValue };

const styles: Record<SheetRange.StyleValue, string> = {
  highlight: 'ph--highlighter--regular',
  softwrap: 'ph--paragraph--regular',
};

export const useStyleState = (stateAtom: ToolbarStateAtom) => {
  const registry = useContext(RegistryContext);
  const { cursorFallbackRange, model } = useSheetContext();

  useEffect(() => {
    let highlight = false;
    let softwrap = false;
    if (cursorFallbackRange && model.sheet.ranges) {
      model.sheet.ranges
        .filter(
          ({ range, key }) =>
            key === 'style' && inRange(SheetUtil.rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
        )
        .forEach(({ value }) => {
          if (value === 'highlight') {
            highlight = true;
          }
          if (value === 'softwrap') {
            softwrap = true;
          }
        });
    }
    const prev = registry.get(stateAtom);
    registry.set(stateAtom, { ...prev, highlight, softwrap });
  }, [cursorFallbackRange, model.sheet, registry, stateAtom]);
};

const createStyleGroup = (state: StyleState) => {
  return createMenuItemGroup('style', {
    variant: 'toggleGroup',
    selectCardinality: 'multiple',
    value: Object.keys(styles)
      .filter((key) => !!state[key as SheetRange.StyleValue])
      .map((styleValue) => `style--${styleValue}`),
  } as ToolbarMenuActionGroupProperties);
};

type StyleActionsContext = {
  model: SheetModel;
  state: ToolbarState;
  stateAtom: ToolbarStateAtom;
  registry: Registry.AtomRegistry;
  cursorFallbackRange?: CompleteCellRange;
};

const createStyleActions = ({ model, state, stateAtom, registry, cursorFallbackRange }: StyleActionsContext) =>
  Object.entries(styles).map(([styleValue, icon]) => {
    return createMenuAction<StyleAction>(
      `style--${styleValue}`,
      () => {
        if (!cursorFallbackRange) {
          return;
        }
        const index =
          model.sheet.ranges?.findIndex(
            (range) =>
              range.key === 'style' &&
              inRange(SheetUtil.rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
          ) ?? -1;
        const nextRangeEntity = {
          range: SheetUtil.rangeToIndex(model.sheet, cursorFallbackRange),
          key: 'style',
          value: styleValue as SheetRange.StyleValue,
        };
        const currentState = registry.get(stateAtom);
        if (
          model.sheet.ranges
            .filter(
              ({ range, key: rangeKey }) =>
                rangeKey === 'style' && inRange(SheetUtil.rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
            )
            .some(({ value: rangeValue }) => rangeValue === styleValue)
        ) {
          // this value should be unset
          if (index >= 0) {
            Obj.update(model.sheet, (obj) => {
              obj.ranges?.splice(index, 1);
            });
          }
          registry.set(stateAtom, { ...currentState, [nextRangeEntity.value]: false });
        } else {
          Obj.update(model.sheet, (obj) => {
            obj.ranges?.push(nextRangeEntity);
          });
          registry.set(stateAtom, { ...currentState, [nextRangeEntity.value]: true });
        }
      },
      {
        key: 'style',
        value: styleValue as SheetRange.StyleValue,
        icon,
        label: [`range-value.${styleValue}.label`, { ns: meta.profile.key }],
        checked: !!state[styleValue as SheetRange.StyleValue],
      },
    );
  });

export const createStyle = (context: StyleActionsContext): ActionGraphProps => {
  const styleGroupAction = createStyleGroup(context.state);
  const styleActions = createStyleActions(context);
  return {
    nodes: [styleGroupAction, ...styleActions],
    edges: [
      { source: 'root', target: 'style', relation: 'child' },
      ...styleActions.map(({ id }) => ({ source: styleGroupAction.id, target: id, relation: 'child' })),
    ],
  };
};
