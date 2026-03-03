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
import { type StyleKey, type StyleValue, rangeFromIndex, rangeToIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

import { type ToolbarState, type ToolbarStateAtom } from './useToolbarState';

export type StyleState = Partial<Record<StyleValue, boolean>>;

export type StyleAction = { key: StyleKey; value: StyleValue };

const styles: Record<StyleValue, string> = {
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
          ({ range, key }) => key === 'style' && inRange(rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
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
      .filter((key) => !!state[key as StyleValue])
      .map((styleValue) => `style--${styleValue}`),
  } as ToolbarMenuActionGroupProperties);
};

type StyleActionsContext = {
  model: SheetModel;
  state: ToolbarState;
  stateAtom: ToolbarStateAtom;
  registry: Registry.Registry;
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
              range.key === 'style' && inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
          ) ?? -1;
        const nextRangeEntity = {
          range: rangeToIndex(model.sheet, cursorFallbackRange),
          key: 'style',
          value: styleValue as StyleValue,
        };
        const currentState = registry.get(stateAtom);
        if (
          model.sheet.ranges
            .filter(
              ({ range, key: rangeKey }) =>
                rangeKey === 'style' && inRange(rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
            )
            .some(({ value: rangeValue }) => rangeValue === styleValue)
        ) {
          // this value should be unset
          if (index >= 0) {
            Obj.change(model.sheet, (obj) => {
              obj.ranges?.splice(index, 1);
            });
          }
          registry.set(stateAtom, { ...currentState, [nextRangeEntity.value]: false });
        } else {
          Obj.change(model.sheet, (obj) => {
            obj.ranges?.push(nextRangeEntity);
          });
          registry.set(stateAtom, { ...currentState, [nextRangeEntity.value]: true });
        }
      },
      {
        key: 'style',
        value: styleValue as StyleValue,
        icon,
        label: [`range value ${styleValue} label`, { ns: meta.id }],
        checked: !!state[styleValue as StyleValue],
      },
    );
  });

export const createStyle = (context: StyleActionsContext): ActionGraphProps => {
  const styleGroupAction = createStyleGroup(context.state);
  const styleActions = createStyleActions(context);
  return {
    nodes: [styleGroupAction, ...styleActions],
    edges: [
      { source: 'root', target: 'style' },
      ...styleActions.map(({ id }) => ({ source: styleGroupAction.id, target: id })),
    ],
  };
};
