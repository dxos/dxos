//
// Copyright 2025 DXOS.org
//

import { createMenuAction, createMenuItemGroup } from '@dxos/react-ui-menu';

import { SCRIPT_PLUGIN } from '../../meta';

export type ViewType = 'editor' | 'split' | 'debug';

export type ViewState = { view: ViewType };

export type ViewActionProperties = { type: 'view'; value: ViewType };

const views: Record<ViewType, string> = {
  editor: 'ph--code--regular',
  split: 'ph--square-split-vertical--regular',
  debug: 'ph--bug--regular',
};

const createViewGroupItem = (state: ViewState) => {
  return createMenuItemGroup('view', {
    label: ['view group label', { ns: SCRIPT_PLUGIN }],
    variant: 'dropdownMenu',
    applyActive: true,
    value: state.view,
  });
};

const createViewActions = (state: ViewState) => {
  return Object.entries(views).map(([viewType, icon]) => {
    return createMenuAction<ViewActionProperties>(`view--${viewType}`, {
      type: 'view',
      value: viewType as ViewType,
      label: [`view ${viewType} label`, { ns: SCRIPT_PLUGIN }],
      icon,
      checked: state.view === viewType,
    });
  });
};

export const createView = (state: ViewState) => {
  const viewGroupItem = createViewGroupItem(state);
  const viewActions = createViewActions(state);
  return {
    nodes: [viewGroupItem, ...viewActions],
    edges: [
      { source: 'root', target: 'view' },
      ...viewActions.map((action) => ({ source: 'view', target: action.id })),
    ],
  };
};
