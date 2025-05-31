//
// Copyright 2025 DXOS.org
//

import { addons, types } from '@storybook/manager-api';
import React from 'react';

import { Tool } from './Tool';
import { ADDON_ID, TOOL_ID } from './constants';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Register the tool
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'DXOS theme editor',
    match: ({ tabId, viewMode }) => !tabId && viewMode === 'story',
    render: () => <Tool api={api} />,
  });
});
