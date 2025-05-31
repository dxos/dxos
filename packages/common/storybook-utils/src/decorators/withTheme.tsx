//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/preview-api';
import { type Decorator } from '@storybook/react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import '@dxos/lit-theme-editor/dx-theme-editor.pcss';
import { createComponent } from '@dxos/lit-ui';
import { type ThemeMode, ThemeProvider, Tooltip, Dialog, IconButton } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { PARAM_KEY } from '@dxos/theme-editor-addon';

const DxThemeEditor = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxThemeEditor,
  react: React,
});

/**
 * Changes theme based on storybook toolbar toggle.
 */
export const withTheme: Decorator = (Story, context) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [editorOpen, setEditorOpen] = useState(false);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    console.log('[editor open change]', nextOpen);
    setEditorOpen(nextOpen);
  }, []);

  // https://www.npmjs.com/package/storybook-dark-mode
  // NOTE: The `useDarkMode` hook causes the story to continually re-render.
  // NOTE: Changing the theme will cause the story to remount.
  useEffect(() => {
    const handleDarkModeUpdate = (darkMode: boolean) => setThemeMode(darkMode ? 'dark' : 'light');
    addons.getChannel().on(DARK_MODE_EVENT_NAME, handleDarkModeUpdate);
    return () => addons.getChannel().off(DARK_MODE_EVENT_NAME, handleDarkModeUpdate);
  }, []);

  useEffect(() => {
    const openEditor = () => {
      console.log(`[received ${PARAM_KEY}]`);
      handleOpenChange(true);
    };
    addons.getChannel().on(PARAM_KEY, openEditor);
    return () => addons.getChannel().off(PARAM_KEY, openEditor);
  }, []);

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={context?.parameters?.translations} noCache>
      <Tooltip.Provider>
        <MemoizedStory />
        <Dialog.Root open={editorOpen} onOpenChange={handleOpenChange}>
          <Dialog.Overlay>
            <Dialog.Content>
              <Dialog.Title srOnly>Theme Editor</Dialog.Title>
              {editorOpen && <DxThemeEditor />}
              <Dialog.Close asChild>
                <IconButton icon='ph--x--regular' label='Close' />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Root>
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
