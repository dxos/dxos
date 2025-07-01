//
// Copyright 2025 DXOS.org
//

import { ControlsIcon } from '@storybook/icons';
import React, { type FC, memo, useCallback, useEffect } from 'react';
import { IconButton } from 'storybook/internal/components';
import { type API, useGlobals } from 'storybook/manager-api';

import { THEME_EDITOR_ID, THEME_EDITOR_PARAM_KEY, THEME_EDITOR_TOOL_ID } from '../defs';

export const Tool: FC<{ api: API }> = memo(({ api }) => {
  const [globals, updateGlobals] = useGlobals();
  const isActive = !!globals[THEME_EDITOR_PARAM_KEY];
  const handleToggle = useCallback(() => {
    updateGlobals({
      [THEME_EDITOR_PARAM_KEY]: !isActive,
    });
  }, [isActive]);

  useEffect(() => {
    void api.setAddonShortcut(THEME_EDITOR_ID, {
      label: 'Toggle Theme Editor [ctrl+e]',
      defaultShortcut: ['Control+e'],
      actionName: 'theme-editor',
      action: handleToggle,
    });
  }, [api, handleToggle]);

  return (
    <IconButton key={THEME_EDITOR_TOOL_ID} title='Toggle theme editor' onClick={handleToggle}>
      <ControlsIcon />
    </IconButton>
  );
});
