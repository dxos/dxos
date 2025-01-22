//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { inRange } from '@dxos/compute';
import { createMenuAction, createMenuItemGroup, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { SHEET_PLUGIN } from '../../meta';
import { rangeFromIndex, type StyleKey, type StyleValue } from '../../types';
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

const createStyleActions = (state: StyleState) =>
  Object.entries(styles).map(([styleValue, icon]) => {
    return createMenuAction<StyleAction>(`style--${styleValue}`, {
      key: 'style',
      value: styleValue as StyleValue,
      icon,
      label: [`range value ${styleValue} label`, { ns: SHEET_PLUGIN }],
      checked: !!state[styleValue as StyleValue],
    });
  });

export const createStyle = (state: StyleState) => {
  const styleGroupAction = createStyleGroup(state);
  const styleActions = createStyleActions(state);
  return {
    nodes: [styleGroupAction, ...styleActions],
    edges: [
      { source: 'root', target: 'style' },
      ...styleActions.map(({ id }) => ({ source: styleGroupAction.id, target: id })),
    ],
  };
};
