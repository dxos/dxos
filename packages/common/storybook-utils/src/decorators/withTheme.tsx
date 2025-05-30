//
// Copyright 2023 DXOS.org
//

import { useStorybookApi } from '@storybook/manager-api';
import { addons } from '@storybook/preview-api';
import { type Decorator } from '@storybook/react';
import React, { memo, useEffect, useState } from 'react';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import '@dxos/lit-theme-editor/dx-theme-editor.pcss';
import { createComponent } from '@dxos/lit-ui';
import { type ThemeMode, ThemeProvider, Tooltip, Dialog, IconButton } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { THEME_EDITOR_EVENT_NAME } from '@dxos/theme-editor-addon';

const DxThemeEditor = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxThemeEditor,
  react: React,
});

const channel = addons.getChannel();

/**
 * Changes theme based on storybook toolbar toggle.
 */
export const withTheme: Decorator = (Story, context) => {
  // Prevent re-rendering of the story.
  const MemoizedStory = memo(Story);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const api = useStorybookApi();

  // https://www.npmjs.com/package/storybook-dark-mode
  // NOTE: The `useDarkMode` hook causes the story to continually re-render.
  // NOTE: Changing the theme will cause the story to remount.
  useEffect(() => {
    const handleDarkModeUpdate = (darkMode: boolean) => setThemeMode(darkMode ? 'dark' : 'light');
    channel.on(DARK_MODE_EVENT_NAME, handleDarkModeUpdate);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleDarkModeUpdate);
  }, [channel]);

  // Listen for theme editor toggle events
  useEffect(() => {
    // TODO(thure): Why doesn’t this work?
    const handleThemeEditorUpdate = (show: boolean) => {
      console.log('[theme editor update]', show);
      setShowThemeEditor(show);
    };
    api.getChannel()?.on(THEME_EDITOR_EVENT_NAME, handleThemeEditorUpdate);
    return () => api.getChannel()?.off(THEME_EDITOR_EVENT_NAME, handleThemeEditorUpdate);
  }, [api]);

  return (
    <ThemeProvider tx={defaultTx} themeMode={themeMode} resourceExtensions={context?.parameters?.translations} noCache>
      <Tooltip.Provider>
        <MemoizedStory />
        {showThemeEditor && (
          <Dialog.Root open={showThemeEditor} onOpenChange={setShowThemeEditor}>
            <Dialog.Overlay>
              <Dialog.Content style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}>
                <Dialog.Title srOnly>Theme Editor</Dialog.Title>
                <DxThemeEditor />
                <Dialog.Close asChild>
                  <IconButton icon='ph--x--regular' label='Close' />
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Overlay>
          </Dialog.Root>
        )}
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
