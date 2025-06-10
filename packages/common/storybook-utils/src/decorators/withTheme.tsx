//
// Copyright 2023 DXOS.org
//

import { addons } from '@storybook/preview-api';
import { type Decorator } from '@storybook/react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';

import { DxThemeEditor as NaturalDxThemeEditor } from '@dxos/lit-theme-editor';
import '@dxos/lit-theme-editor/dx-theme-editor.pcss';
import { createComponent } from '@dxos/lit-ui/react';
import { type ThemeMode, ThemeProvider, Tooltip, Dialog, IconButton } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { PARAM_KEY } from '@dxos/theme-editor-addon';

const DxThemeEditor = createComponent({
  tagName: 'dx-theme-editor',
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
          <div
            role='none'
            className='dx-dialog__overlay bg-transparent pointer-events-none'
            style={{ placeContent: 'end' }}
          >
            <Dialog.Content
              classNames='relative box-content py-0 px-2 md:is-[35rem] md:max-is-none overflow-y-auto layout-contain'
              style={{ maxBlockSize: '50dvh' }}
            >
              <Dialog.Title srOnly>Theme Editor</Dialog.Title>
              {editorOpen && <DxThemeEditor />}
              <Dialog.Close asChild>
                <IconButton
                  iconOnly
                  icon='ph--x--regular'
                  label='Close'
                  classNames='absolute block-start-2 inline-end-2'
                />
              </Dialog.Close>
            </Dialog.Content>
          </div>
        </Dialog.Root>
      </Tooltip.Provider>
    </ThemeProvider>
  );
};
