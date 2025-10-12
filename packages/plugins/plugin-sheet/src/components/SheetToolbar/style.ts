//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type CompleteCellRange, inRange } from '@dxos/compute';
import { type ToolbarMenuActionGroupProperties, createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { type SheetModel } from '../../model';
import { type StyleKey, type StyleValue, rangeFromIndex, rangeToIndex } from '../../types';
import { useSheetContext } from '../SheetContext';

export type StyleState = Partial<Record<StyleValue, boolean>>;

export type StyleAction = { key: StyleKey; value: StyleValue };

const styles: Record<StyleValue, string> = {
  highlight: 'ph--highlighter--regular',
  softwrap: 'ph--paragraph--regular',
};

export const useStyleState = (state: StyleState) => {
  const { cursorFallbackRange, model } = useSheetContext();

  useEffect(() => {
    state.highlight = false;
    state.softwrap = false;
    if (cursorFallbackRange && model.sheet.ranges) {
      model.sheet.ranges
        .filter(
          ({ range, key }) => key === 'style' && inRange(rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
        )
        .forEach(({ value }) => {
          state[value as StyleValue] = true;
        });
    }
  }, [cursorFallbackRange, model.sheet]);
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

const createStyleActions = (model: SheetModel, state: StyleState, cursorFallbackRange?: CompleteCellRange) =>
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
            model.sheet.ranges?.splice(index, 1);
          }
          state[nextRangeEntity.value] = false;
        } else {
          model.sheet.ranges?.push(nextRangeEntity);
          state[nextRangeEntity.value] = true;
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

export const createStyle = (model: SheetModel, state: StyleState, cursorFallbackRange?: CompleteCellRange) => {
  const styleGroupAction = createStyleGroup(state);
  const styleActions = createStyleActions(model, state, cursorFallbackRange);
  return {
    nodes: [styleGroupAction, ...styleActions],
    edges: [
      { source: 'root', target: 'style' },
      ...styleActions.map(({ id }) => ({ source: styleGroupAction.id, target: id })),
    ],
  };
};
