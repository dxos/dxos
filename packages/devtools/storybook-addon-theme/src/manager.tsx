//
// Copyright 2025 DXOS.org
//

import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { THEME_EDITOR_ID, THEME_EDITOR_TOOL_ID } from './defs';
import { Tool } from './components';

addons.register(THEME_EDITOR_ID, (api) => {
  addons.add(THEME_EDITOR_TOOL_ID, {
    type: types.TOOL,
    title: 'Theme Editor',
    match: ({ tabId, viewMode }) => !tabId && viewMode === 'story',
    render: () => <Tool api={api} />,
  });

  // TODO(burdon): Eventually create storybook panel to edit theme.
  // addons.add(THEME_EDITOR_PANEL_ID, {
  //   type: types.PANEL,
  //   title: 'Theme Editor',
  //   match: ({ tabId, viewMode }) => tabId === THEME_EDITOR_PANEL_ID,
  //   render: () => <Panel />,
  // });
});
