//
// Copyright 2025 DXOS.org
//

import { LightningIcon } from '@storybook/icons';
import { useStorybookApi } from '@storybook/manager-api';
import React, { memo, useCallback, useEffect } from 'react';
import { IconButton } from 'storybook/internal/components';

import { ADDON_ID, THEME_EDITOR_EVENT_NAME, TOOL_ID } from './constants';

export const Tool = memo(() => {
  const api = useStorybookApi();

  const toggleThemeEditor = useCallback(() => api.getChannel()?.emit(THEME_EDITOR_EVENT_NAME), [api]);

  useEffect(() => {
    void api?.setAddonShortcut(ADDON_ID, {
      label: 'Toggle theme editor [8]',
      defaultShortcut: ['8'],
      actionName: 'toggleThemeEditor',
      action: toggleThemeEditor,
    });
  }, [api]);

  return (
    <IconButton key={TOOL_ID} title='Toggle theme editor' onClick={toggleThemeEditor}>
      <LightningIcon />
    </IconButton>
  );
});
