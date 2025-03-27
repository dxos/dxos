//
// Copyright 2025 DXOS.org
//

import { createMenuAction } from '@dxos/react-ui-menu';

import { SCRIPT_PLUGIN } from '../meta';

export type ViewType = /* 'editor' | 'split' | */ 'logs';

export type ViewState = { view: ViewType };

export type ViewActionProperties = { type: 'view'; value: ViewType };

const views: Record<ViewType, string> = {
  // editor: 'ph--code--regular',
  // split: 'ph--square-split-vertical--regular',
  logs: 'ph--clock-counter-clockwise--regular',
};

const createViewActions = (state: Partial<ViewState>) => {
  return Object.entries(views).map(([viewType, icon]) => {
    return createMenuAction<ViewActionProperties>(`view--${viewType}`, {
      type: 'view',
      value: viewType as ViewType,
      label: [`view ${viewType} label`, { ns: SCRIPT_PLUGIN }],
      icon,
    });
  });
};

export const createView = (state: Partial<ViewState>) => {
  const viewActions = createViewActions(state);
  return {
    nodes: viewActions,
    edges: viewActions.map((action) => ({ source: 'root', target: action.id })),
  };
};
